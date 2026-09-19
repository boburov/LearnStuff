import { atm, toxicWarn, warnOnce } from "./helpers";

// Only a fraction of the combustion heat stays in the dish or jar; the rest goes up with the flame.
const FLAME_TO_VESSEL = 0.08;

// Pure oxygen makes everything burn two to three times faster (doc 14, № 31).
const oxygenBoost = (o2) => 1 + 2 * Math.min(1, Math.max(0, (o2 - 0.21) / 0.59));

const burnable = (s) => s.form === "piece" || s.form === "powder" || s.form === "residue";

// Takes the oxidiser out of the container's own headspace when it has one.
const consumeGas = (m, k, id, mmol) => {
  const held = m.gas[id] ?? 0;
  if (held > k.EPS) k.addGas(m, id, -Math.min(held, mmol));
};

// Magnesium burns with a blinding white flame (doc 14, № 27) and keeps burning in CO₂, leaving soot (№ 28).
export const magnesiumBurn = {
  id: "magnesium-burn",
  info: "mg-burning",
  notice: 0.05,
  step(m, dt, ctx, k, events) {
    let total = 0;
    for (const s of [...m.solids]) {
      if (s.species !== "Mg" || !burnable(s)) continue;
      const state = { ...s.state };
      const o2 = atm(m, ctx, "O2");
      const co2 = atm(m, ctx, "CO2");
      if (!state.burning) {
        // Two to five seconds in the lamp flame before the ribbon catches (doc 14, № 27).
        state.heatedS = ctx.flame && (o2 > 0.05 || co2 > 0.05) ? (state.heatedS ?? 0) + dt : 0;
        if (state.heatedS >= 3) {
          state.burning = true;
          k.emit(events, "ignite");
        }
        s.state = state;
        if (!state.burning) continue;
      }
      if (o2 < 0.03 && co2 < 0.05) {
        s.state = { ...state, burning: false };
        k.emit(events, "extinguish");
        continue;
      }
      const inCarbonDioxide = o2 < 0.05;
      // One centimetre of ribbon per second, faster in pure oxygen (doc 14, № 27, № 31).
      const rate = (0.01 * oxygenBoost(o2) * 1000) / 24.31;
      const n = Math.min(s.mmol, rate * dt);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.addSolid(m, "MgO", "residue", n);
      if (inCarbonDioxide) {
        consumeGas(m, k, "CO2", n / 2);
        k.addSolid(m, "C", "residue", n / 2);
      } else {
        consumeGas(m, k, "O2", n / 2);
      }
      k.heat(m, 601 * FLAME_TO_VESSEL, n);
      k.fx(m, "flame", { kind: "magnesium", intensity: 1 });
      k.fx(m, "smoke", { rate: 0.8, color: inCarbonDioxide ? "#9a9a9a" : "#f5f5f5", toxic: false });
      if (inCarbonDioxide) k.fx(m, "sparks", 0.8);
      k.fx(m, "flash", 0.5);
      total += n;
    }
    return total;
  },
};

// Ethanol burns with an almost invisible pale blue flame (doc 14, № 29).
export const ethanolBurn = {
  id: "ethanol-burn",
  info: "ethanol-burning",
  notice: 0.2,
  step(m, dt, ctx, k, events) {
    const state = k.state(m, "ethanol-burn", { burning: false });
    const ethanol = k.aq(m, "C2H5OH");
    if (ethanol <= k.EPS) {
      if (state.burning) {
        state.burning = false;
        k.emit(events, "extinguish");
      }
      return 0;
    }
    const o2 = atm(m, ctx, "O2");
    const fraction = ethanol / (ethanol + k.aq(m, "H2O"));
    if (!state.burning) {
      if (!ctx.flame || fraction < 0.2 || o2 < 0.12) return 0;
      state.burning = true;
      k.emit(events, "ignite");
      warnOnce(k, m, events, ctx, "open-flame", 60);
    }
    if (o2 < 0.12 || (atm(m, ctx, "CO2") > 0.3 && o2 < 0.18)) {
      state.burning = false;
      k.emit(events, "extinguish");
      return 0;
    }
    // One millilitre lasts about 25 s (doc 14, № 29).
    const n = Math.min(ethanol, 0.66 * oxygenBoost(o2) * dt);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "C2H5OH", n);
    m.volumeMl = Math.max(0, m.volumeMl - n * 0.0584);
    consumeGas(m, k, "O2", 3 * n);
    k.addGas(m, "CO2", 2 * n);
    // The dish sits right in its own flame, so it keeps a bigger share than a jar would (doc 14, № 29: ~80 °C).
    k.heat(m, 1367 * 0.18, n);
    k.fx(m, "flame", { kind: "ethanol", intensity: Math.min(1, 0.4 + m.volumeMl / 3) });
    k.fx(m, "steam", 0.15);
    return n;
  },
};

// Sulfur melts to a yellow then dark red liquid before it catches fire (doc 14, № 30).
export const sulfurMelt = {
  id: "sulfur-melt",
  info: null,
  step(m, dt, ctx, k) {
    const stages = [
      ["S", "SMolten", 115],
      ["SMolten", "SDark", 160],
    ];
    let total = 0;
    for (const [cold, hot, point] of stages) {
      const forward = m.tempC >= point;
      const fromId = forward ? cold : hot;
      const toId = forward ? hot : cold;
      if (!forward && m.tempC > point - 15) continue;
      for (const s of [...m.solids]) {
        if (s.species !== fromId || !burnable(s)) continue;
        const n = k.fast(s.mmol, dt, 2);
        if (n <= k.EPS) continue;
        k.takeSolid(m, s, n);
        k.addSolid(m, toId, s.form, n, { state: s.state });
        total += n;
      }
    }
    return total;
  },
};

const SULFUR_FORMS = ["S", "SMolten", "SDark"];

// S + O₂ → SO₂ (doc 14, № 30–31): a dim blue flame in air, a bright violet-blue one in oxygen.
export const sulfurBurn = {
  id: "sulfur-burn",
  info: "sulfur-burning",
  notice: 0.05,
  step(m, dt, ctx, k, events) {
    const o2 = atm(m, ctx, "O2");
    // Sulfur ground together with iron reacts with it instead of burning away (doc 14, № 36).
    if (k.solidMmol(m, "Fe") > k.EPS) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      if (!SULFUR_FORMS.includes(s.species) || !burnable(s)) continue;
      const state = { ...s.state };
      if (!state.burning) {
        if (m.tempC < 250 && !(ctx.flame && m.tempC > 150)) continue;
        if (o2 < 0.1) continue;
        state.burning = true;
        s.state = state;
        k.emit(events, "ignite");
      }
      if (o2 < 0.06) {
        s.state = { ...state, burning: false };
        k.emit(events, "extinguish");
        continue;
      }
      const rich = o2 > 0.4;
      // 0.2 g of sulfur burns for about 20 s in air and three times faster in oxygen (doc 14, № 30–31).
      const rate = (0.01 * oxygenBoost(o2) * 1000) / 32.06;
      const n = Math.min(s.mmol, rate * dt);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      consumeGas(m, k, "O2", n);
      k.addGas(m, "SO2", n);
      k.heat(m, 297 * FLAME_TO_VESSEL, n);
      k.fx(m, "flame", { kind: rich ? "sulfur-oxygen" : "sulfur", intensity: rich ? 1 : 0.4 });
      k.fx(m, "smoke", { rate: 0.25, color: "#e6e6e6", toxic: true });
      total += n;
    }
    if (total > k.EPS) toxicWarn(k, m, events, ctx);
    return total;
  },
};

// How much hydrogen can burn in the container right now, and the energy it would release.
const hydrogenCharge = (m, ctx, k) => {
  const h2 = m.gas.H2 ?? 0;
  if (h2 <= k.EPS) return null;
  const space = k.headspaceMl(m);
  const fraction = k.gasFraction(m, "H2");
  const own = m.gas.O2 ?? 0;
  const airO2 = (0.21 * Math.max(0, space - k.gasMl(m))) / 24;
  // Air also reaches in at an open mouth, which is what makes a test tube of pure hydrogen pop at all.
  const mouth = ctx.covered ? 0 : 0.85;
  const oxygen = own + airO2 + mouth;
  const burned = Math.min(h2, 2 * oxygen);
  return { h2, fraction, oxygen, burned, kj: burned * 0.286, own };
};

const burnHydrogen = (m, k, charge) => {
  k.addGas(m, "H2", -charge.burned);
  if (charge.own > k.EPS) k.addGas(m, "O2", -Math.min(charge.own, charge.burned / 2));
  k.fx(m, "steam", 0.6);
};

// Testing hydrogen for purity (doc 14, № 32): a quiet pop when it is clean, a squeaky bark when air got in.
export const hydrogenPop = {
  id: "hydrogen-pop",
  info: "h2-test",
  notice: 0.005,
  step(m, dt, ctx, k, events) {
    if (!ctx.flame) return 0;
    const charge = hydrogenCharge(m, ctx, k);
    if (!charge || charge.fraction < 0.04 || charge.burned <= k.EPS || charge.kj > 1.5) return 0;
    burnHydrogen(m, k, charge);
    const pure = charge.fraction > 0.75;
    k.emit(events, "pop", { strength: pure ? 0.3 : 0.9 });
    k.emit(events, "flash", { color: "#bcd4ff", strength: 0.4 });
    if (!pure) warnOnce(k, m, events, ctx, "hydrogen-impure", 20);
    return charge.burned;
  },
};

// 2H₂ + O₂ → 2H₂O in a gas jar (doc 14, № 33): a bang that shatters the glass.
export const hydrogenBang = {
  id: "hydrogen-bang",
  info: "h2-o2-explosion",
  notice: 0.005,
  step(m, dt, ctx, k, events) {
    if (!ctx.flame) return 0;
    const charge = hydrogenCharge(m, ctx, k);
    if (!charge || charge.fraction < 0.04 || charge.kj <= 1.5) return 0;
    burnHydrogen(m, k, charge);
    const strength = Math.min(1, charge.kj / 4);
    k.emit(events, "bang", { strength, radius: 0.5 + 1.5 * strength });
    k.emit(events, "flash", { color: "#ffffff", strength: 1 });
    warnOnce(k, m, events, ctx, "hydrogen-impure", 20);
    if (charge.kj > 3) k.emit(events, "shatter");
    return charge.burned;
  },
};

// KMnO₄ + glycerin (doc 14, № 34): nothing for a while, then smoke, then a lilac-white flame.
export const permanganateGlycerin = {
  id: "permanganate-glycerin",
  info: "kmno4-glycerin",
  notice: 0.05,
  step(m, dt, ctx, k, events) {
    const solid = m.solids.find((s) => s.species === "KMnO4" && burnable(s));
    const glycerin = k.aq(m, "C3H8O3");
    if (!solid || glycerin <= k.EPS || k.aq(m, "H2O") > 3 * glycerin) return 0;
    const state = k.state(m, "permanganate-glycerin", { waited: 0, burning: false });
    if (!state.burning) {
      state.waited += dt;
      // 10–30 s of induction, shorter in a warm room (doc 14, № 34).
      const delay = Math.max(8, 28 - (m.tempC - 22));
      if (state.waited > delay * 0.6) {
        k.fx(m, "smoke", { rate: 0.3, color: "#cfcfcf", toxic: false });
        k.fx(m, "steam", 0.3);
        k.addHeat(m, 20 * dt);
      }
      if (state.waited < delay) return 0;
      state.burning = true;
      k.emit(events, "ignite");
      warnOnce(k, m, events, ctx, "open-flame", 60);
    }
    // 2 g of permanganate burns out in about 8 s.
    const n = Math.min(solid.mmol, (solid.startMmol ?? solid.mmol) * (dt / 8), glycerin / 0.286);
    if (n <= k.EPS) return 0;
    k.takeSolid(m, solid, n);
    k.takeAq(m, "C3H8O3", 0.286 * n);
    k.addSolid(m, "Ash", "residue", 0.7 * n);
    k.addGas(m, "CO2", 0.357 * n);
    k.heat(m, 250 * 0.6, n);
    k.fx(m, "flame", { kind: "permanganate", intensity: 1 });
    k.fx(m, "smoke", { rate: 1, color: "#cfcfcf", toxic: false });
    k.fx(m, "sparks", 0.9);
    return n;
  },
};

// 2Na + Cl₂ → 2NaCl (doc 14, № 35): molten sodium burns in chlorine with a yellow flame and white smoke.
export const sodiumChlorine = {
  id: "sodium-chlorine",
  info: "na-cl2",
  notice: 0.05,
  step(m, dt, ctx, k, events) {
    const chlorine = atm(m, ctx, "Cl2");
    let total = 0;
    for (const s of [...m.solids]) {
      if (s.species !== "Na" || !burnable(s)) continue;
      if (chlorine < 0.15 || !(s.state?.molten || s.state?.burning || m.tempC > 98)) continue;
      // A rice grain of sodium is gone in about 6 s.
      const n = Math.min(s.mmol, (4.35 / 6) * dt, 2 * (m.gas.Cl2 ?? Infinity));
      if (n <= k.EPS) continue;
      s.state = { ...s.state, burning: true, molten: true };
      k.takeSolid(m, s, n);
      consumeGas(m, k, "Cl2", n / 2);
      k.addSolid(m, "NaCl", "residue", n);
      k.heat(m, 411 * FLAME_TO_VESSEL, n);
      k.fx(m, "flame", { kind: "sodium", intensity: 1 });
      k.fx(m, "smoke", { rate: 1, color: "#f5f5f5", toxic: false });
      total += n;
    }
    if (total > k.EPS) toxicWarn(k, m, events, ctx);
    return total;
  },
};

// Fe + S →(t) FeS (doc 14, № 36): after half a minute of heating the glow spreads on its own.
export const ironSulfur = {
  id: "iron-sulfur",
  info: "fe-s",
  notice: 0.1,
  step(m, dt, ctx, k, events) {
    const iron = m.solids.find((s) => s.species === "Fe" && burnable(s));
    const sulfur = m.solids.find((s) => SULFUR_FORMS.includes(s.species) && burnable(s));
    const state = k.state(m, "iron-sulfur", { heatedS: 0, glow: 0 });
    if (!iron || !sulfur || m.volumeMl > 0.1) {
      state.glow = 0;
      return 0;
    }
    if (!state.glow) {
      if (m.tempC > 150) state.heatedS += dt;
      if (state.heatedS < 30) return 0;
      state.glow = 0.15;
      k.emit(events, "ignite");
    }
    // The glowing front keeps spreading through the mixture for 10–20 s after the lamp is taken away.
    state.glow = Math.min(1, state.glow + dt / 12);
    const n = Math.min(iron.mmol, sulfur.mmol, (iron.startMmol ?? iron.mmol) * state.glow * (dt / 12));
    if (n <= k.EPS) {
      state.glow = 0;
      return 0;
    }
    k.takeSolid(m, iron, n);
    k.takeSolid(m, sulfur, n);
    k.addSolid(m, "FeS", "residue", n);
    k.heat(m, 100 * 0.5, n);
    k.fx(m, "glow", { color: "#ff5a1f", amount: state.glow });
    // A little of the spare sulfur burns off in the air above the mixture.
    const extra = Math.min(sulfur.mmol, 0.05 * n);
    if (extra > k.EPS) {
      k.takeSolid(m, sulfur, extra);
      k.addGas(m, "SO2", extra);
      k.fx(m, "smoke", { rate: 0.3, color: "#e8e2c0", toxic: true });
      toxicWarn(k, m, events, ctx);
    }
    return n;
  },
};

export const COMBUSTION_RULES = [
  magnesiumBurn,
  ethanolBurn,
  sulfurMelt,
  sulfurBurn,
  hydrogenPop,
  hydrogenBang,
  permanganateGlycerin,
  sodiumChlorine,
  ironSulfur,
];
