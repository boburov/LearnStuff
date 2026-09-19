import { SUBSTANCE_BY_ID } from "../substances/catalog";
import { SPECIES } from "../chemistry/species";
import { SOURCES, SPATULA_G } from "../chemistry/sources";
import {
  EPS,
  addGasMl,
  addPiece,
  addPowder,
  aq,
  clearMixture,
  createMixture,
  mixIn,
  nitricFraction,
  reagentPortion,
  sulfuricFraction,
  takePortion,
} from "../chemistry/mixture";
import { phOf, phPaperColor, phWord } from "../chemistry/acidity";
import { CONTAINERS } from "../sim/containers";
import { spillPortion } from "../sim/spills";
import { pushFeed } from "../sim/feed";
import { pushSound } from "../sound/queue";
import { SUBSTANCE_PREFIX } from "../world/objectTypes";

const DROP_ML = 0.05;
const DROP_EVERY_S = 0.22;
const GAS_ML_PER_S = 25;
const JAR_GRAMS = { powder: 100, ribbon: 25, chunks: 50, wire: 100, granules: 250 };
const HOT_PLATE_STEPS = ["O'chiq", "50 °C", "100 °C", "200 °C", "300 °C"];

const substanceOf = (typeId) =>
  typeId?.startsWith(SUBSTANCE_PREFIX) ? SUBSTANCE_BY_ID[typeId.slice(SUBSTANCE_PREFIX.length)] ?? null : null;
export const isVessel = (typeId) => Boolean(CONTAINERS[typeId]) && typeId !== "crucible-tongs";

const liquidMl = (lab, object) => {
  const substance = substanceOf(object.typeId);
  if (substance?.state === "liquid") {
    const { fillMl } = substance.container;
    return fillMl * (lab.device(object.id)?.remaining ?? 1);
  }
  return isVessel(object.typeId) ? lab.mixture(object.id)?.volumeMl ?? 0 : 0;
};

const streamLook = (lab, object) => {
  const substance = substanceOf(object.typeId);
  if (substance) return { color: substance.container.color ?? "#0d2230", opacity: substance.container.opacity ?? 0.08 };
  const liquid = lab.visual(object.id)?.liquid;
  return liquid
    ? { color: liquid.turbidity > 0.3 ? liquid.turbidColor : liquid.color, opacity: Math.max(liquid.opacity, liquid.turbidity) }
    : { color: "#0d2230", opacity: 0.08 };
};

// Part of a device under the crosshair, from the hit point in the object's local space.
export const partAt = (typeId, local) => {
  if (!local) return null;
  const [x, y, z] = local;
  if (typeId === "hot-plate") {
    // The plate sits at the back (z < 0.01); everything in front of it is the sloped control panel.
    if (z > 0.02) return x < 0 ? "heat-knob" : "stir-knob";
    return "plate";
  }
  if (typeId === "gas-jar") return y > 0.19 ? "cover" : "body";
  if (typeId === "digital-scale") return z > 0.02 ? "panel" : "pan";
  if (typeId === "spirit-lamp") return "lamp";
  return null;
};

const click = (id, label, targetId, extra = {}) => ({ id, label, mode: "click", targetId, valid: true, ...extra });
const hold = (id, label, targetId, extra = {}) => ({ id, label, mode: "hold", targetId, valid: true, ...extra });
const blocked = (id, reason, targetId) => ({ id, label: reason, mode: "click", targetId, valid: false });

// Reaching for the lamp with something in hand should still light it; without this the flame actions
// are a dead end ("light the lamp first" with no way to light it).
const lampToggle = (lab, lamp) => click("lamp-toggle", lab.device(lamp.id)?.lit ? "O'chirish" : "Yoqish", lamp.id);

const deviceAction = (lab, target, part) => {
  const device = lab.device(target.id);
  if (!device) return null;
  if (target.typeId === "spirit-lamp") return click("lamp-toggle", device.lit ? "O'chirish" : "Yoqish", target.id);
  if (target.typeId === "hot-plate" && part === "heat-knob") {
    return click("hotplate-heat", `Harorat: ${HOT_PLATE_STEPS[(device.level + 1) % HOT_PLATE_STEPS.length]}`, target.id);
  }
  if (target.typeId === "hot-plate" && part === "stir-knob") {
    return click("hotplate-stir", device.stir ? "Aralashtirgichni o'chirish" : "Aralashtirgichni yoqish", target.id);
  }
  if (target.typeId === "gas-jar" && part === "cover") {
    return click("cover-toggle", device.coverOn ? "Qopqoqni ochish" : "Qopqoqni yopish", target.id);
  }
  if (target.typeId === "digital-scale" && part === "panel") return click("scale-tare", "Nolga keltirish", target.id);
  return null;
};

// What left click does right now for the held item and the object under the crosshair (null = take / put down).
export const resolveAction = ({ lab, world, held, focus }) => {
  // The extinguisher sprays wherever the player aims, so it needs no target under the crosshair.
  if (held?.typeId === "extinguisher") {
    const charge = lab.device(held.id)?.chargeS ?? 0;
    return charge > 0.05 ? hold("spray", "Purkash", null) : blocked("spray", "O't o'chirgich bo'shadi", null);
  }
  const target = focus?.objectId ? world.get(focus.objectId) : null;
  if (!target) return null;
  if (!held) return deviceAction(lab, target, focus.part);

  const heldSubstance = substanceOf(held.typeId);
  const targetSubstance = substanceOf(target.typeId);
  const lamp = target.typeId === "spirit-lamp" ? lab.device(target.id) : null;
  const targetVessel = isVessel(target.typeId);

  if (held.typeId === "dropper") {
    const dropper = lab.device(held.id);
    const loaded = (dropper?.mixture?.volumeMl ?? 0) > DROP_ML * 0.5;
    if (!loaded && liquidMl(lab, target) > 0.3) return click("dropper-draw", "Tortib olish", target.id);
    if (loaded && targetVessel) return hold("dropper-drop", "Tomizish", target.id);
    return null;
  }
  if (held.typeId === "spatula") {
    const load = lab.device(held.id)?.load;
    if (!load && targetSubstance?.state === "powder") return click("spatula-scoop", `Kukun olish (${SPATULA_G} g)`, target.id);
    if (load && targetVessel) return click("spatula-tip", "Solish", target.id);
    if (load && targetSubstance?.state === "powder") return click("spatula-return", "Qaytarish", target.id);
    return null;
  }
  if (held.typeId === "crucible-tongs") {
    const piece = lab.device(held.id)?.piece;
    if (!piece && targetSubstance?.state === "solid") return click("tongs-pick", "Bo'lak olish", target.id);
    if (piece && targetVessel && target.typeId !== "gas-jar") return click("tongs-release", "Tushirish", target.id);
    if (piece && lamp) return lamp.lit ? hold("heat-in-flame", "Alangada qizdirish", target.id) : lampToggle(lab, target);
    if (piece && target.typeId === "gas-jar") {
      const hot = piece.state?.burning || piece.state?.molten;
      return hot ? hold("immerse", "Silindrga tushirish", target.id) : click("tongs-release", "Tushirish", target.id);
    }
    return null;
  }
  if (heldSubstance?.state === "gas") {
    if (targetVessel) return hold("gas-flow", "Gaz o'tkazish", target.id);
    if (lamp?.lit) return hold("gas-at-flame", "Alangaga yo'naltirish", target.id);
    return null;
  }
  if (held.typeId === "stirring-rod") return targetVessel && liquidMl(lab, target) > 0.5 ? hold("stir", "Aralashtirish", target.id) : null;
  if (held.typeId === "thermometer") return targetVessel ? hold("measure", "Haroratni o'lchash", target.id) : null;
  if (held.typeId === "ph-paper") return targetVessel && liquidMl(lab, target) > 0.05 ? click("ph-test", "pH ni aniqlash", target.id) : null;
  if (held.typeId === "spirit-lamp") {
    if (!lab.device(held.id)?.lit) return null;
    return targetVessel ? click("ignite", "Alanga yaqinlashtirish", target.id) : null;
  }

  const heldLiquid = liquidMl(lab, held);
  if ((held.typeId === "test-tube" || held.typeId === "crucible") && lamp) {
    return lamp.lit ? hold("heat-in-flame", "Alangada qizdirish", target.id) : lampToggle(lab, target);
  }
  if (held.typeId === "crucible" && target.typeId === "gas-jar") return hold("immerse", "Silindrga tushirish", target.id);
  if (heldLiquid > 0.05 && (heldSubstance?.state === "liquid" || isVessel(held.typeId))) {
    if (targetSubstance) return blocked("pour", "Reaktiv shishasiga quyib bo'lmaydi", target.id);
    if (target.typeId === "funnel") {
      const below = target.supportId ? world.get(target.supportId) : null;
      return below && isVessel(below.typeId)
        ? hold("pour", "Filtrlab quyish", target.id, { intoId: below.id, filter: true })
        : blocked("pour", "Voronkani idish ustiga qo'ying", target.id);
    }
    if (targetVessel) return hold("pour", "Quyish", target.id, { intoId: target.id });
  }
  // Nothing else fits: a lamp under the crosshair can always be lit or put out.
  if (lamp) return lampToggle(lab, target);
  return null;
};

const flash = (world, text) => world.flash(text);

// Absorbed share of bubbled gas: reactive solutions soak most of it up, plain water very little.
const absorption = (m, species) => {
  if (m.volumeMl <= EPS) return 0;
  const alkaline = aq(m, "OH-") > EPS || aq(m, "NH3") > EPS;
  if (species === "CO2") return alkaline ? 0.8 : 0.05;
  if (species === "Cl2") return alkaline || aq(m, "I-") > EPS ? 0.9 : 0.3;
  return 0;
};

const moveTongsPiece = (lab, tongsId, targetId) => {
  const from = lab.mixture(tongsId);
  const to = lab.mixture(targetId);
  if (!from || !to) return;
  for (const solid of from.solids) {
    const existing = to.solids.find((s) => s.species === solid.species && s.form === solid.form);
    if (existing) {
      existing.mmol += solid.mmol;
      existing.count += solid.count;
      existing.startMmol = (existing.startMmol ?? 0) + (solid.startMmol ?? solid.mmol);
      existing.state = { ...existing.state, ...solid.state };
    } else {
      to.solids.push({ ...solid, state: solid.state ? { ...solid.state } : null });
    }
  }
  for (const entry of from.history) to.history.push({ ...entry });
  to.tempC = (to.tempC * 4 + from.tempC) / 5;
  clearMixture(from);
  lab.setDevice(tongsId, { piece: null });
};

// One-shot actions (left click).
export const runClick = (action, { lab, world, held }) => {
  const target = world.get(action.targetId);
  if (!target) return;
  const device = lab.device(target.id);
  const targetSubstance = substanceOf(target.typeId);

  switch (action.id) {
    case "lamp-toggle":
      lab.setDevice(target.id, { lit: !device.lit, capOn: device.lit, dousing: 0, boost: 0 });
      pushSound(lab, { type: device.lit ? "click" : "whoosh", position: target.position });
      return;
    case "hotplate-heat":
      lab.setDevice(target.id, { level: (device.level + 1) % HOT_PLATE_STEPS.length });
      pushSound(lab, { type: "click" });
      return;
    case "hotplate-stir":
      lab.setDevice(target.id, { stir: !device.stir });
      pushSound(lab, { type: "click" });
      return;
    case "cover-toggle":
      lab.setDevice(target.id, { coverOn: !device.coverOn });
      pushSound(lab, { type: "click", soft: true });
      return;
    case "scale-tare":
      lab.setDevice(target.id, { tareG: device.grossG ?? 0 });
      pushSound(lab, { type: "click", soft: true });
      return;
    case "dropper-draw": {
      const dropper = lab.device(held.id);
      const mixture = createMixture({ capacityMl: 2, vesselHeatJK: 1 });
      const ml = Math.min(2, liquidMl(lab, target));
      if (targetSubstance) {
        mixIn(mixture, reagentPortion(targetSubstance.id, ml, { label: targetSubstance.formula }));
        lab.setDevice(target.id, { remaining: Math.max(0, device.remaining - ml / targetSubstance.container.fillMl), capOn: false });
      } else {
        mixIn(mixture, takePortion(lab.mixture(target.id), ml));
      }
      lab.setDevice(held.id, { ...dropper, mixture, fillMl: mixture.volumeMl, ...streamLook(lab, target) });
      return;
    }
    case "dropper-drop":
      dropOnce(lab, held.id, target.id);
      return;
    case "spatula-scoop":
      lab.setDevice(held.id, {
        load: { sourceId: targetSubstance.id, grams: SPATULA_G, color: targetSubstance.container.color, grain: targetSubstance.container.grain ?? "fine" },
      });
      lab.setDevice(target.id, { remaining: Math.max(0, device.remaining - SPATULA_G / JAR_GRAMS.powder), capOn: false });
      return;
    case "spatula-tip": {
      const load = lab.device(held.id).load;
      addPowder(lab.mixture(target.id), load.sourceId, load.grams, { label: SUBSTANCE_BY_ID[load.sourceId].formula });
      lab.setDevice(held.id, { load: null });
      return;
    }
    case "spatula-return": {
      const load = lab.device(held.id).load;
      lab.setDevice(target.id, { remaining: Math.min(1, device.remaining + load.grams / JAR_GRAMS.powder) });
      lab.setDevice(held.id, { load: null });
      return;
    }
    case "tongs-pick": {
      const source = SOURCES[targetSubstance.id];
      const entry = lab.ensureContainer(held.id, "crucible-tongs");
      clearMixture(entry.mixture);
      addPiece(entry.mixture, targetSubstance.id, { label: targetSubstance.formula });
      const jarGrams = JAR_GRAMS[targetSubstance.container.pieces] ?? 100;
      lab.setDevice(target.id, { remaining: Math.max(0, device.remaining - source.pieceG / jarGrams), capOn: false });
      lab.setDevice(held.id, {
        piece: { species: source.species, shape: source.form, grams: source.pieceG, color: SPECIES[source.species].color, state: {} },
      });
      return;
    }
    case "tongs-release":
      moveTongsPiece(lab, held.id, target.id);
      return;
    case "ph-test": {
      const mixture = lab.mixture(target.id);
      const ph = phOf(mixture) ?? 7;
      let color = phPaperColor(ph);
      if (sulfuricFraction(mixture) > 0.8) color = "#1a1a1a";
      else if (nitricFraction(mixture) > 0.5) color = "#d9c24a";
      lab.setDevice(held.id, { strip: { color, ph } });
      pushFeed(lab, { kind: "ph", ph, word: phWord(ph), color, simId: target.id });
      return;
    }
    case "ignite":
      lab.activity.ignite = { simId: target.id, kind: "lamp", until: lab.now() + 0.6 };
      return;
    default:
      if (!action.valid) flash(world, action.label);
  }
};

const dropOnce = (lab, dropperId, targetId) => {
  const dropper = lab.device(dropperId);
  const target = lab.mixture(targetId);
  if (!dropper?.mixture || !target || dropper.mixture.volumeMl <= EPS) return false;
  lab.queueMix(targetId, mixIn(target, takePortion(dropper.mixture, DROP_ML)));
  lab.setDevice(dropperId, { fillMl: dropper.mixture.volumeMl });
  return true;
};

const pourRate = (holdS, sourceTypeId) => {
  if (holdS < 0.3) return 0;
  const t = holdS - 0.3;
  const max = sourceTypeId === "test-tube" || sourceTypeId === "crucible" ? 4 : 18;
  return Math.min(max, 1.2 + t * t * 7);
};

const SPRAY_NOSE = 0.42;
const SPRAY_DROP = 0.12;

// CO2 jet from the horn: puts out puddle fires and floods whatever it covers with cold carbon dioxide.
const spray = (lab, held, dt) => {
  const device = lab.device(held.id);
  const from = lab.activity.cameraPosition;
  const dir = lab.activity.cameraDirection;
  if (!device || !from || !dir || device.chargeS <= 0) return;
  device.chargeS = Math.max(0, device.chargeS - dt);
  const origin = [from[0] + dir[0] * SPRAY_NOSE, from[1] + dir[1] * SPRAY_NOSE - SPRAY_DROP, from[2] + dir[2] * SPRAY_NOSE];
  lab.hazards.sprayAt(origin, dir);
  lab.activity.spray = { sourceId: held.id, origin, direction: [...dir], chargeS: device.chargeS };
  if (device.chargeS <= 0) pushFeed(lab, { kind: "note", text: "O't o'chirgich bo'shadi" });
};

// Continuous actions while the left button is held; `state` persists for this press.
export const runHold = (action, { lab, world, held }, dt, state) => {
  if (action.id === "spray") {
    spray(lab, held, dt);
    return;
  }
  const target = world.get(action.targetId);
  if (!target) return;
  const activity = lab.activity;
  state.holdS = (state.holdS ?? 0) + dt;

  switch (action.id) {
    case "pour": {
      const into = lab.mixture(action.intoId);
      const heldSubstance = substanceOf(held.typeId);
      const rate = pourRate(state.holdS, held.typeId);
      const available = liquidMl(lab, held);
      const free = into ? into.capacityMl - into.volumeMl - 0.3 : 0;
      const ml = Math.max(0, Math.min(rate * dt, available, free));
      activity.pour = {
        sourceId: held.id,
        targetId: target.id,
        intoId: action.intoId,
        rate: rate / 18,
        addedMl: (activity.pour?.addedMl ?? 0) + ml,
        ...streamLook(lab, held),
      };
      if (heldSubstance) lab.device(held.id).capOn = false;
      if (ml <= EPS) {
        // A full target means the rest of the pour runs down the outside of the glass.
        if (rate > 0 && free <= 0.05) {
          if (!state.fullNoted) {
            state.fullNoted = true;
            world.flash("Idish to'ldi");
          }
          const overflow = Math.min(rate * dt, available);
          if (overflow > EPS) {
            const spilled = heldSubstance
              ? reagentPortion(heldSubstance.id, overflow, { label: heldSubstance.formula })
              : takePortion(lab.mixture(held.id), overflow);
            if (heldSubstance) {
              const device = lab.device(held.id);
              device.remaining = Math.max(0, device.remaining - overflow / heldSubstance.container.fillMl);
            }
            spillPortion(lab, spilled, target.position);
          }
        }
        return;
      }
      let portion;
      if (heldSubstance) {
        portion = reagentPortion(heldSubstance.id, ml, { label: heldSubstance.formula });
        const device = lab.device(held.id);
        device.remaining = Math.max(0, device.remaining - ml / heldSubstance.container.fillMl);
      } else {
        portion = takePortion(lab.mixture(held.id), ml);
      }
      if (action.filter) filterInto(lab, target.id, portion);
      lab.queueMix(action.intoId, mixIn(into, portion));
      return;
    }
    case "dropper-drop":
      state.nextDropS = state.nextDropS ?? DROP_EVERY_S;
      if (state.holdS >= state.nextDropS) {
        state.nextDropS += DROP_EVERY_S;
        dropOnce(lab, held.id, target.id);
      }
      activity.drop = { dropperId: held.id, targetId: target.id };
      return;
    case "gas-flow": {
      const substance = substanceOf(held.typeId);
      const mixture = lab.mixture(target.id);
      const species = SOURCES[substance.id].species;
      addGasMl(mixture, substance.id, GAS_ML_PER_S * dt, { label: substance.formula, dissolveFraction: absorption(mixture, species) });
      activity.gas = { sourceId: held.id, targetId: target.id, species, bubbling: mixture.volumeMl > 0.5 };
      return;
    }
    case "gas-at-flame": {
      const substance = substanceOf(held.typeId);
      const species = SOURCES[substance.id].species;
      const lamp = lab.device(target.id);
      activity.gas = { sourceId: held.id, targetId: target.id, species, atLamp: true, bubbling: false };
      if (species === "CO2") {
        lamp.dousing = Math.min(1, lamp.dousing + dt * 1.8);
        if (lamp.dousing >= 1 && lamp.lit) {
          lab.setDevice(target.id, { lit: false, dousing: 0 });
          pushFeed(lab, { kind: "note", text: "CO₂ oqimida alanga o'chdi" });
        }
      } else if (species === "O2") {
        lamp.boost = 1.5;
      } else if (species === "H2") {
        activity.gas.burning = true;
      }
      return;
    }
    case "stir":
      activity.stir = target.id;
      return;
    case "measure":
      lab.device(held.id).targetId = target.id;
      activity.measure = { thermometerId: held.id, targetId: target.id };
      return;
    case "heat-in-flame":
      activity.heat = { simId: held.id, lampId: target.id };
      return;
    case "immerse":
      activity.immerse = { simId: held.id, jarId: target.id };
      return;
    default:
  }
};

// Solids stay on the filter paper; the clear filtrate continues into the vessel below.
const filterInto = (lab, funnelId, portion) => {
  if (!portion.solids.length) return;
  const funnel = lab.device(funnelId);
  let ml = 0;
  let color = funnel.solidsColor;
  for (const solid of portion.solids) {
    const sp = SPECIES[solid.species];
    const add = sp.bedMl ? solid.mmol * sp.bedMl : (solid.mmol * sp.mw) / 1000 / 1.2;
    ml += add;
    color = sp.color;
  }
  portion.solids = [];
  lab.setDevice(funnelId, { solidsMl: funnel.solidsMl + ml, solidsColor: color, wet: 1 });
};

export const endHold = (action, { lab, held }) => {
  const activity = lab.activity;
  if (action.id === "pour") {
    activity.pour = null;
    if (held && substanceOf(held.typeId)) lab.setDevice(held.id, { capOn: true });
  }
  if (action.id === "dropper-drop") activity.drop = null;
  if (action.id === "gas-flow" || action.id === "gas-at-flame") activity.gas = null;
  if (action.id === "stir") activity.stir = null;
  if (action.id === "measure") {
    if (held) lab.device(held.id).targetId = null;
    activity.measure = null;
  }
  if (action.id === "spray") activity.spray = null;
  if (action.id === "heat-in-flame") activity.heat = null;
  if (action.id === "immerse") activity.immerse = null;
};

// Publishes this frame's aim and running action for the hand poses, effects and runtime.
export const noteActivity = (lab, running, aim, eye, direction) => {
  const activity = lab.activity;
  activity.action = running;
  activity.aim = aim;
  activity.cameraPosition = [eye.x, eye.y, eye.z];
  activity.cameraDirection = [direction.x, direction.y, direction.z];
  if (activity.ignite && lab.now() > activity.ignite.until) activity.ignite = null;
};

const HOT_TOUCH_C = 60;

// Picking up hot glassware still works, but the student is told to use a holder next time.
export const warnIfHot = (lab, objectId) => {
  const mixture = lab.mixture(objectId);
  if (!mixture || mixture.tempC < HOT_TOUCH_C) return;
  pushFeed(lab, { kind: "warning", id: "hot-glass", simId: objectId });
};
