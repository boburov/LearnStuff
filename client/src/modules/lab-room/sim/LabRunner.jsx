import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler, Quaternion } from "three";
import { SUBSTANCE_BY_ID } from "../substances/catalog";
import { SUBSTANCE_PREFIX } from "../world/objectTypes";
import { SPECIES } from "../chemistry/species";
import { addAq, addGas, addSolid, massG } from "../chemistry/mixture";
import { CONTAINERS, EMPTY_MASS_G } from "./containers";
import { spillMixture } from "./spills";
import { inFumeHood } from "../hazards/hazardStore";
import { pushFeed, warnOnce } from "./feed";
import { pushSound } from "../sound/queue";
import { seedHazards } from "../hazards/hazardScenarios";

const STEP = 1 / 30;
const MAX_STEPS = 4;
const ROOM_C = 22;
const TOXIC_NOTICE_S = 15;
const LAMP_UNDER_RING_W = 120;
const FLAME_W = 150;
const HOT_PLATE_LEVELS = [22, 50, 100, 200, 300];
// A 5 kg CO₂ extinguisher empties in about a quarter of a minute.
const EXTINGUISHER_S = 14;
const SPILL_NOTICE_ML = 3;

const DEVICE_DEFAULTS = {
  "spirit-lamp": () => ({ lit: false, capOn: true, fuelMl: 60, boost: 0, dousing: 0 }),
  "hot-plate": () => ({ level: 0, setC: ROOM_C, plateC: ROOM_C, stir: false }),
  "gas-jar": () => ({ coverOn: true }),
  "digital-scale": () => ({ readingG: 0, tareG: 0 }),
  thermometer: () => ({ readingC: ROOM_C, targetId: null }),
  dropper: () => ({ fillMl: 0, capacityMl: 2, color: "#0d2230", opacity: 0.08 }),
  spatula: () => ({ load: null }),
  "crucible-tongs": () => ({ piece: null }),
  "ph-paper": () => ({ strip: null }),
  funnel: () => ({ solidsMl: 0, solidsColor: "#f5f5f0", wet: 0 }),
  extinguisher: () => ({ chargeS: EXTINGUISHER_S }),
};

const sourceDefaults = (substance) =>
  substance.state === "gas" ? { flow: 0 } : { remaining: 1, capOn: true };

// Layout props like { volumeMl: 120, liquidColor } become real water in the simulation.
const initialContents = (object) => (mixture) => {
  const ml = object.props?.volumeMl ?? 0;
  if (ml <= 0) return;
  mixture.volumeMl = ml;
  addAq(mixture, "H2O", ml * 55.49);
  mixture.history.push({ key: "water", label: "H₂O", amount: ml, unit: "ml" });
};

const syncEntities = (world, lab, known) => {
  const objects = world.store.get().objects;
  const alive = new Set();
  for (const object of objects) {
    alive.add(object.id);
    if (known.has(object.id)) continue;
    known.add(object.id);
    const { typeId } = object;
    if (CONTAINERS[typeId] && typeId !== "crucible-tongs") lab.ensureContainer(object.id, typeId, initialContents(object));
    if (DEVICE_DEFAULTS[typeId]) lab.ensureDevice(object.id, DEVICE_DEFAULTS[typeId]());
    if (typeId.startsWith(SUBSTANCE_PREFIX)) {
      const substance = SUBSTANCE_BY_ID[typeId.slice(SUBSTANCE_PREFIX.length)];
      if (substance) lab.ensureDevice(object.id, sourceDefaults(substance));
    }
  }
  for (const id of known) {
    if (alive.has(id)) continue;
    known.delete(id);
    lab.removeContainer(id);
    lab.removeDevice(id);
  }
};

// Heat a container takes from nearby fires on the bench.
const fireHeatAt = (lab, position) => {
  if (!position) return 0;
  let watts = 0;
  for (const fire of lab.hazards.fires()) {
    const d = Math.hypot(fire.position[0] - position[0], fire.position[2] - position[2]);
    watts += Math.min(90, (40 * Math.min(1, fire.flammableMl / 3)) / Math.max(0.09, d * d));
  }
  return Math.min(160, watts);
};

// Magnesium and sodium keep burning in carbon dioxide, so the jet cannot put them out.
const BURNS_IN_CO2 = new Set(["Mg", "Na"]);

const burningMetal = (mixture) =>
  Boolean(mixture?.solids.some((s) => BURNS_IN_CO2.has(s.species) && (s.state?.burning || s.state?.molten)));

const inBox = (position, anchor) => {
  if (!anchor || !position) return false;
  const [x, , z] = anchor.position;
  const [sx, sz] = anchor.size;
  return Math.abs(position[0] - x) <= sx / 2 + 0.05 && Math.abs(position[2] - z) <= sz / 2 + 0.05;
};

const tmpQuat = new Quaternion();

// World position of an object: placed objects from the store, held ones at the camera-side pose the hand system wrote.
const positionOf = (world, lab, id) => {
  const object = world.get(id);
  if (!object) return null;
  if (object.state === "held") return lab.activity.heldPositions?.[id] ?? lab.activity.cameraPosition ?? object.position;
  return object.position;
};

// The piece in the tongs is its own tiny mixture; mirror its size and state for the tongs model.
const syncTongs = (lab, object, device) => {
  const mixture = lab.mixture(object.id);
  const piece = mixture?.solids[0];
  if (!device.piece) return;
  if (!piece) {
    lab.setDevice(object.id, { piece: null });
    return;
  }
  const state = piece.state ?? {};
  const changed = Boolean(state.burning) !== Boolean(device.piece.state?.burning) || Boolean(state.molten) !== Boolean(device.piece.state?.molten);
  device.piece.grams = (piece.mmol * SPECIES[piece.species].mw) / 1000;
  device.piece.species = piece.species;
  device.piece.color = SPECIES[piece.species].color;
  if (changed) lab.setDevice(object.id, { piece: { ...device.piece, state: { ...state } } });
};

// Burning or molten matter lowered into a gas jar uses up the jar's gas and leaves its products inside.
const IMMERSION = {
  Mg: { O2: 0.5, CO2: 0.5, product: [["MgO", 1], ["C", 0.5]] },
  Na: { Cl2: 0.5, product: [["NaCl", 1]] },
  S: { O2: 1, gas: "SO2" },
};

const consumeJarGas = (lab, dt) => {
  const immerse = lab.activity.immerse;
  const source = immerse ? lab.mixture(immerse.simId) : null;
  const jar = immerse ? lab.mixture(immerse.jarId) : null;
  if (!source || !jar) return;
  for (const solid of source.solids) {
    const recipe = IMMERSION[solid.species];
    if (!recipe || !(solid.state?.burning || solid.state?.molten)) continue;
    const rate = Math.min(solid.mmol, 0.6 * dt);
    for (const gas of ["O2", "CO2", "Cl2"]) {
      if (!recipe[gas] || !jar.gas[gas]) continue;
      addGas(jar, gas, -Math.min(jar.gas[gas], rate * recipe[gas]));
    }
    if (recipe.gas) addGas(jar, recipe.gas, rate);
    for (const [product, ratio] of recipe.product ?? []) {
      if (product === "C" && !jar.gas.CO2) continue;
      addSolid(jar, product, "residue", rate * ratio);
    }
  }
};

// Gas led through a tube into a liquid shows as bubbles at the tube end.
const tubeBubbles = (lab) => {
  const gas = lab.activity.gas;
  const mixture = gas?.bubbling ? lab.mixture(gas.targetId) : null;
  if (!mixture) return;
  const bubbles = mixture.fx.bubbles ?? { rate: 0, top: 0 };
  mixture.fx.bubbles = { ...bubbles, rate: bubbles.rate + 1.1, site: "tube", gas: gas.species, top: Math.max(bubbles.top ?? 0, 1.1) };
};

const updateDevices = (world, lab, dt) => {
  for (const object of world.store.get().objects) {
    const device = lab.device(object.id);
    if (!device) continue;
    if (object.typeId === "crucible-tongs") syncTongs(lab, object, device);
    if (object.typeId === "hot-plate") {
      const target = HOT_PLATE_LEVELS[device.level] ?? ROOM_C;
      const rate = target > device.plateC ? 6 : 2;
      device.plateC += Math.sign(target - device.plateC) * Math.min(Math.abs(target - device.plateC), rate * dt);
      device.setC = target;
    } else if (object.typeId === "spirit-lamp") {
      if (device.dousing > 0 && !lab.activity.gas?.atLamp) device.dousing = Math.max(0, device.dousing - dt * 2);
      if (!lab.activity.gas?.atLamp) device.boost = Math.max(0, device.boost - dt * 3);
    } else if (object.typeId === "thermometer") {
      const target = device.targetId ? lab.mixture(device.targetId)?.tempC ?? ROOM_C : ROOM_C;
      device.readingC += (target - device.readingC) * (1 - Math.exp(-dt / 1.2));
    } else if (object.typeId === "digital-scale") {
      let grams = 0;
      for (const other of world.store.get().objects) {
        if (other.supportId !== object.id) continue;
        grams += EMPTY_MASS_G[other.typeId] ?? 150;
        const mixture = lab.mixture(other.id);
        if (mixture) grams += massG(mixture);
      }
      device.readingG = Math.max(0, grams - device.tareG);
      device.grossG = grams;
    }
  }
};

// Heat, stirring, cover and surroundings for one container, from what it stands on and what the player is doing.
const contextFor = (world, lab, meta) => (entry) => {
  const object = world.get(entry.simId);
  const activity = lab.activity;
  const ctx = { mixes: lab.takeMixes(entry.simId) };
  const position = positionOf(world, lab, entry.simId);
  ctx.inFumeHood = inBox(position, meta?.anchors?.fumehood_work_surface);

  if (object?.supportId) {
    const support = world.get(object.supportId);
    const supportDevice = lab.device(object.supportId);
    if (support?.typeId === "hot-plate" && supportDevice) {
      ctx.plateC = supportDevice.plateC;
      ctx.stirring = supportDevice.stir;
    }
    if (support?.typeId === "retort-stand" && object.position[1] - support.position[1] > 0.15) {
      for (const other of world.store.get().objects) {
        const lamp = other.typeId === "spirit-lamp" && other.supportId === support.id ? lab.device(other.id) : null;
        if (lamp?.lit) ctx.heatW = (ctx.heatW ?? 0) + LAMP_UNDER_RING_W * (1 + lamp.boost);
      }
    }
  }
  if (entry.typeId === "gas-jar") ctx.covered = Boolean(lab.device(entry.simId)?.coverOn);
  if (activity.stir === entry.simId) ctx.stirring = true;
  if (activity.heat?.simId === entry.simId) {
    const lamp = lab.device(activity.heat.lampId);
    if (lamp?.lit) {
      ctx.heatW = (ctx.heatW ?? 0) + FLAME_W * (1 + lamp.boost);
      ctx.flame = "lamp";
    }
  }
  if (activity.ignite?.simId === entry.simId) ctx.flame = activity.ignite.kind ?? "lamp";
  const fireW = fireHeatAt(lab, position);
  if (fireW > 0) {
    ctx.heatW = (ctx.heatW ?? 0) + fireW;
    if (fireW > 40) ctx.flame = ctx.flame ?? "burning";
  }
  if (lab.hazards.sprayCovers(position)) {
    ctx.sprayed = true;
    ctx.flame = null;
    ctx.heatW = 0;
    if (burningMetal(lab.mixture(entry.simId))) warnOnce(lab, "metal-fire", 60, { simId: entry.simId });
  }
  const immerse = activity.immerse?.simId === entry.simId ? lab.mixture(activity.immerse.jarId) : null;
  if (immerse) {
    const space = Math.max(1, immerse.capacityMl - immerse.volumeMl);
    const fraction = (id) => Math.min(1, ((immerse.gas[id] ?? 0) * 24) / space);
    const other = fraction("O2") + fraction("CO2") + fraction("Cl2") + fraction("H2");
    ctx.atmosphere = {
      O2: fraction("O2") + Math.max(0, 1 - other) * 0.21,
      CO2: fraction("CO2"),
      Cl2: fraction("Cl2"),
      H2: fraction("H2"),
    };
  } else if (ctx.sprayed) {
    ctx.atmosphere = { O2: 0.02, CO2: 0.95, Cl2: 0, H2: 0 };
  } else {
    ctx.atmosphere = { O2: 0.21, CO2: 0, Cl2: 0, H2: 0 };
  }
  return ctx;
};

// Engine events that make a noise, and which cue plays for them.
const LOUD = { pop: "pop", bang: "bang", ignite: "whoosh", shatter: "shatter" };

const handleEvents = (world, lab, events, meta, notices) => {
  for (const event of events) {
    const position = positionOf(world, lab, event.simId);
    if (event.type === "reaction") pushFeed(lab, { kind: "reaction", id: event.id, simId: event.simId });
    else if (event.type === "warning") pushFeed(lab, { kind: "warning", id: event.id, simId: event.simId });
    else if (event.type === "gas") {
      if (position) lab.hazards.addGas(event.species, position, event.mmol);
      if (position && inFumeHood(position) && lab.hazards.devices.hoodFan) continue;
      const last = notices.get(event.species) ?? -Infinity;
      if (lab.now() - last < TOXIC_NOTICE_S) continue;
      notices.set(event.species, lab.now());
      pushFeed(lab, { kind: "warning", id: "toxic-outside-hood", species: event.species, simId: event.simId });
    } else if (event.type === "pop" || event.type === "bang" || event.type === "flash" || event.type === "ignite") {
      if (position) {
        lab.flashes.push({
          position: [position[0], position[1] + 0.12, position[2]],
          color: event.color ?? (event.type === "ignite" ? "#ffb35a" : "#ffffff"),
          strength: event.strength ?? (event.type === "bang" ? 1 : 0.4),
          at: lab.now(),
        });
      }
      if (position && LOUD[event.type]) pushSound(lab, { type: LOUD[event.type], position, strength: event.strength });
      if (event.type === "bang" && position) {
        world.knock(position, event.radius ?? 1.5, event.strength ?? 1, event.simId);
        lab.hazards.blast(Math.min(1, event.strength ?? 1));
      }
      if (event.type === "ignite" && position) lab.hazards.igniteNear(position);
    } else if (event.type === "spatter") {
      if (position) spillMixture(lab, event.simId, position, { fraction: Math.min(0.3, 0.08 * (event.radius ?? 1)) });
    } else if (event.type === "shatter") {
      const object = world.get(event.simId);
      if (!object || object.state === "held") continue;
      spillMixture(lab, event.simId, object.position);
      tmpQuat.setFromEuler(new Euler(...object.rotation));
      world.shatter(event.simId, object.position, [tmpQuat.x, tmpQuat.y, tmpQuat.z, tmpQuat.w], [0, 0.6, 0]);
    }
  }
  const cutoff = lab.now() - 1.5;
  while (lab.flashes.length && lab.flashes[0].at < cutoff) lab.flashes.shift();
};

// Open flames in containers can set a nearby spill alight and feed the room's fire state.
const stepHazards = (world, lab, dt) => {
  const fires = [];
  const heatSources = [];
  for (const object of world.store.get().objects) {
    const visual = lab.visual(object.id);
    const flame = visual?.fx?.flame;
    const position = positionOf(world, lab, object.id);
    if (flame && position) {
      fires.push({ position, power: flame.intensity ?? 1, flammableMl: 2 });
      heatSources.push({ position, hot: true });
    }
    if (object.typeId === "spirit-lamp" && lab.device(object.id)?.lit && position) {
      heatSources.push({ position: [position[0], position[1] + 0.1, position[2]], hot: true });
    }
  }
  const events = lab.hazards.step(dt, { playerPosition: lab.activity.cameraPosition, containerFires: fires, heatSources });
  if (lab.hazards.puddles.some((p) => p.ml > SPILL_NOTICE_ML)) warnOnce(lab, "spill", 60);
  for (const event of events) {
    if (event.type === "alarm") pushFeed(lab, { kind: "warning", id: event.reason === "fire" ? "fire-alarm" : "gas-alarm" });
  }
};

// Runs the fixed-step loop for one rendered frame; `runner` is the component's mutable loop state.
const advanceFrame = (world, lab, meta, runner, delta) => {
  if (runner.generation !== lab.generation()) {
    runner.generation = lab.generation();
    runner.known = new Set();
    runner.notices.clear();
  }
  runner.acc = Math.min(runner.acc + delta, STEP * MAX_STEPS);
  while (runner.acc >= STEP) {
    runner.acc -= STEP;
    syncEntities(world, lab, runner.known);
    updateDevices(world, lab, STEP);
    const events = lab.step(STEP, contextFor(world, lab, meta));
    consumeJarGas(lab, STEP);
    tubeBubbles(lab);
    handleEvents(world, lab, events, meta, runner.notices);
    stepHazards(world, lab, STEP);
  }
};

// Advances every mixture and device at a fixed 30 Hz and turns engine events into HUD, lights and world changes.
const LabRunner = ({ world, lab, meta, hazardSeed = null }) => {
  const runner = useRef({ acc: 0, known: new Set(), generation: -1, notices: new Map() });

  useEffect(() => {
    if (hazardSeed) seedHazards(lab, hazardSeed);
  }, [lab, hazardSeed]);

  useFrame((_, delta) => advanceFrame(world, lab, meta, runner.current, delta), 0.55);

  return null;
};

export default LabRunner;
