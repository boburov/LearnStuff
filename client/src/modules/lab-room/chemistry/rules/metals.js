import { atm, consume, toxicWarn } from "./helpers";

// Sim seconds to use up the limiting reactant, reaction heat (kJ/mol) and the ion formed (doc 14, № 11–12).
// heatScale is the share of that heat still in the tube at simulation speed: the real reaction takes minutes and cools as it goes.
const ACTIVE_METALS = {
  Mg: { seconds: 15, heatKJ: 467, heatScale: 1, ion: "Mg2+" },
  Zn: { seconds: 20, heatKJ: 153, heatScale: 0.12, ion: "Zn2+" },
  Fe: { seconds: 20, heatKJ: 88, heatScale: 0.13, ion: "Fe2+" },
};

const reactive = (s) => s.form !== "coat" && s.form !== "crystals" && !s.state?.burning;

// Mg, Zn, Fe + non-oxidising acid → salt + H₂↑. Concentrated H₂SO₄ and any HNO₃ take other paths.
const hydrogenRule = (id, info, sulfateMedium) => ({
  id,
  info,
  notice: 0.02,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS || k.sulfuricFraction(m) > 0.4) return 0;
    if (k.aq(m, "NO3-") > k.aq(m, "H+") * 0.2) return 0;
    if (k.aq(m, "SO4 2-") > k.aq(m, "Cl-") !== sulfateMedium) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      const metal = ACTIVE_METALS[s.species];
      if (!metal || !reactive(s)) continue;
      const acid = k.aq(m, "H+");
      if (acid <= k.EPS) break;
      // Rate follows acid strength relative to the 10 % HCl the timings were set for; copper on zinc speeds it up.
      const strength = Math.min(2, k.conc(m, "H+") / 2.87);
      const galvanic = s.species === "Zn" && k.solidMmol(m, "Cu") > k.EPS ? 3 : 1;
      const n = consume(k, m, s, dt, metal.seconds, strength * galvanic, acid / 2);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "H+", 2 * n);
      k.addAq(m, metal.ion, n);
      k.evolveGas(m, "H2", n, dt, { site: s.form === "piece" ? "pieces" : "bottom" });
      k.heat(m, metal.heatKJ * metal.heatScale, n);
      total += n;
    }
    return total;
  },
});

export const metalAcidHydrogen = hydrogenRule("metal-acid-hydrogen", "metal-hcl-hydrogen", false);
export const metalSulfuricHydrogen = hydrogenRule("metal-sulfuric-hydrogen", "metal-h2so4-hydrogen", true);

// Zn, Mg + conc. H₂SO₄ (doc 14, № 13): sulfur(VI) is the oxidiser, so SO₂ comes off and never hydrogen.
export const activeMetalConcSulfuric = {
  id: "active-metal-conc-sulfuric",
  info: "zn-h2so4-conc",
  notice: 0.03,
  step(m, dt, ctx, k, events) {
    if (k.sulfuricFraction(m) < 0.7) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      if ((s.species !== "Zn" && s.species !== "Mg") || !reactive(s)) continue;
      // Barely anything cold, minutes of gentle heating in the doc, 15 s here.
      const factor = m.tempC > 45 ? k.warmth(m, 22) : 0.005;
      const pool = Math.min(k.aq(m, "H+") / 4, k.aq(m, "SO4 2-"));
      const n = consume(k, m, s, dt, 15, factor, pool);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "H+", 4 * n);
      k.takeAq(m, "SO4 2-", n);
      k.addAq(m, s.species === "Zn" ? "Zn2+" : "Mg2+", n);
      k.addAq(m, "H2O", 2 * n);
      k.evolveGas(m, "SO2", n, dt, { site: "pieces" });
      // Side products the doc mentions: a yellow haze of sulfur and a whiff of H₂S.
      k.addSolid(m, "S", "ppt", 0.08 * n);
      k.evolveGas(m, "H2S", 0.04 * n, dt, { site: "pieces" });
      k.heat(m, 150 * 0.25, n);
      total += n;
    }
    if (total / Math.max(dt, 1e-3) > 0.05) toxicWarn(k, m, events, ctx);
    return total;
  },
};

// Fe and Cu + conc. H₂SO₄ (doc 14, № 14): nothing in the cold, SO₂ once the tube passes 80 °C.
export const nobleMetalConcSulfuric = {
  id: "noble-metal-conc-sulfuric",
  info: "cu-h2so4-conc",
  notice: 0.03,
  step(m, dt, ctx, k, events) {
    if (k.sulfuricFraction(m) < 0.7 || m.tempC < 80) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      if ((s.species !== "Cu" && s.species !== "Fe") || !reactive(s)) continue;
      const pool = Math.min(k.aq(m, "H+") / 6, k.aq(m, "SO4 2-") / 2);
      const n = consume(k, m, s, dt, 20, k.warmth(m, 40), pool);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      if (s.species === "Cu") {
        k.takeAq(m, "H+", 4 * n);
        k.takeAq(m, "SO4 2-", n);
        k.addAq(m, "H2O", 2 * n);
        k.evolveGas(m, "SO2", n, dt, { site: "pieces" });
        // Water is scarce in the hot acid: the sulfate settles out white-grey with a little dark sulfide.
        k.addSolid(m, "CuSO4Anhydrous", "ppt", 0.9 * n);
        k.addSolid(m, "CuS", "ppt", 0.1 * n);
      } else {
        k.takeAq(m, "H+", 6 * n);
        k.takeAq(m, "SO4 2-", 1.5 * n);
        k.addAq(m, "H2O", 3 * n);
        k.evolveGas(m, "SO2", 1.5 * n, dt, { site: "pieces" });
        k.addSolid(m, "Fe2(SO4)3", "ppt", 0.5 * n);
      }
      k.heat(m, 40, n);
      total += n;
    }
    if (total > k.EPS) toxicWarn(k, m, events, ctx);
    return total;
  },
};

// Heats of formation (kJ/mol) so every pair gets its own reaction enthalpy.
const ION_HF = { "Mg2+": -466.9, "Zn2+": -153.9, "Fe2+": -89.1, "Fe3+": -48.5, "Cu2+": 64.8, "Ag+": 105.6 };

// Metal + HNO₃ (doc 14, № 17): nitric acid never gives hydrogen — concentrated acid gives brown NO₂, dilute acid colourless NO.
const NITRIC_METALS = {
  Cu: { charge: 2, ion: "Cu2+", speed: 1 },
  Zn: { charge: 2, ion: "Zn2+", speed: 1.5 },
  Mg: { charge: 2, ion: "Mg2+", speed: 2 },
  Fe: { charge: 3, ion: "Fe3+", speed: 1 },
};

export const copperNitric = {
  id: "copper-nitric",
  info: "cu-hno3",
  notice: 0.02,
  step(m, dt, ctx, k, events) {
    const strength = k.nitricFraction(m);
    if (strength <= 0.05 || k.aq(m, "NO3-") <= k.EPS) return 0;
    // Above ~50 % the product is NO₂, below ~35 % NO, in between a mixture (doc 14, § 5 Q5).
    const brown = Math.min(1, Math.max(0, (strength - 0.35) / 0.15));
    let total = 0;
    for (const s of [...m.solids]) {
      const metal = NITRIC_METALS[s.species];
      if (!metal || !reactive(s)) continue;
      // Cold concentrated acid passivates iron (doc 14, § 4.3).
      if (s.species === "Fe" && strength > 0.5 && m.tempC < 80) continue;
      const n = metal.charge;
      const acid = brown * 2 * n + (1 - brown) * ((4 * n) / 3);
      const toGas = brown * n + ((1 - brown) * n) / 3;
      const seconds = (10 + 10 * (1 - brown)) / metal.speed;
      const pool = Math.min(k.aq(m, "H+") / acid, k.aq(m, "NO3-") / toGas);
      const used = consume(k, m, s, dt, seconds, k.warmth(m, 30), pool);
      if (used <= k.EPS) continue;
      k.takeSolid(m, s, used);
      k.takeAq(m, "H+", acid * used);
      k.takeAq(m, "NO3-", toGas * used);
      k.addAq(m, metal.ion, used);
      k.addAq(m, "NO3-", n * used);
      k.addAq(m, "H2O", (brown * n + ((1 - brown) * 2 * n) / 3) * used);
      k.evolveGas(m, "NO2", brown * n * used, dt, { site: "pieces" });
      k.evolveGas(m, "NO", ((1 - brown) * n * used) / 3, dt, { site: "pieces" });
      const enthalpy = ION_HF[metal.ion] + n * (brown * -45.2 + (1 - brown) * -91.1);
      k.heat(m, -enthalpy * 0.3, used);
      total += used;
    }
    if (total > k.EPS) toxicWarn(k, m, events, ctx);
    return total;
  },
};

// 2NO + O₂ → 2NO₂: colourless in the tube, brown where it meets air (doc 14, № 17b).
export const nitricOxideAir = {
  id: "nitric-oxide-air",
  info: null,
  step(m, dt, ctx, k) {
    const no = m.gas.NO ?? 0;
    if (no <= k.EPS) return 0;
    const oxygen = atm(m, ctx, "O2");
    if (oxygen <= 0.01) return 0;
    const n = k.fast(no, dt, 4 / Math.max(0.05, oxygen / 0.21));
    if (n <= k.EPS) return 0;
    k.addGas(m, "NO", -n);
    k.addGas(m, "NO2", n);
    return n;
  },
};

// A more active metal pushes a less active one out of its salt (doc 14, № 19–21 and § 5 Q9).
const METAL_E = { Mg: -2.37, Zn: -0.76, Fe: -0.44, Cu: 0.34, Ag: 0.8 };

const OXIDANTS = {
  "Cu2+": { e: 0.34, charge: 2, deposit: "Cu", heatScale: 0.5, traceH2: true },
  "Ag+": { e: 0.8, charge: 1, deposit: "Ag", heatScale: 1 },
  "Fe3+": { e: 0.77, charge: 1, product: "Fe2+", heatScale: 0.5 },
};

// Deposit look per metal pair: reddish copper on iron, dark spongy copper on zinc, silver needles on copper.
const DEPOSIT_LOOK = {
  "Fe>Cu": { color: "#b5552b", loose: 0.15 },
  "Zn>Cu": { color: "#3b2418", loose: 0.35 },
  "Mg>Cu": { color: "#b5552b", loose: 0.4 },
  "Mg>Ag": { color: "#9a9a9a", loose: 0.3, crystals: true },
  "Cu>Ag": { color: "#9a9a9a", loose: 0, crystals: true },
  "Zn>Ag": { color: "#9a9a9a", loose: 0.2, crystals: true },
  "Fe>Ag": { color: "#9a9a9a", loose: 0.2, crystals: true },
};

export const metalDisplacement = {
  id: "metal-displacement",
  info: "metal-displacement",
  notice: 0.01,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      const metal = ACTIVE_METALS[s.species] ?? (s.species === "Cu" ? { ion: "Cu2+" } : null);
      if (!metal || !reactive(s) || METAL_E[s.species] == null) continue;
      for (const [ionId, ox] of Object.entries(OXIDANTS)) {
        if (ox.e <= METAL_E[s.species] + 0.05) continue;
        const ion = k.aq(m, ionId);
        if (ion <= k.EPS) continue;
        const charge = 2;
        const n = Math.min(k.fast(s.mmol, dt, 7), (k.fast(ion, dt, 7) * ox.charge) / charge);
        if (n <= k.EPS) continue;
        const moved = (n * charge) / ox.charge;
        k.takeSolid(m, s, n);
        k.takeAq(m, ionId, moved);
        k.addAq(m, metal.ion, n);
        if (ox.product) k.addAq(m, ox.product, moved);
        const look = DEPOSIT_LOOK[`${s.species}>${ox.deposit}`];
        if (ox.deposit && look) {
          k.addSolid(m, ox.deposit, "coat", moved * (1 - look.loose), { host: s.species });
          if (look.loose > 0) k.addSolid(m, ox.deposit, "ppt", moved * look.loose);
          if (look.crystals) k.addSolid(m, ox.deposit, "crystals", moved * 0.5, { host: s.species });
          const grown = k.solidMmol(m, ox.deposit, "coat") + k.solidMmol(m, ox.deposit, "crystals");
          s.coat = { color: look.color, amount: Math.min(1, grown / 0.2) };
        }
        // Copper sulfate is faintly acidic, so a few hydrogen bubbles come with the coating (doc 14, № 20).
        if (ox.traceH2 && s.species !== "Cu") k.evolveGas(m, "H2", 0.05 * n, dt, { site: "pieces" });
        const per = charge / ox.charge;
        const enthalpy = ION_HF[metal.ion] + per * (ox.product ? ION_HF[ox.product] : 0) - per * ION_HF[ionId];
        k.heat(m, -enthalpy * ox.heatScale, n);
        total += n;
      }
    }
    return total;
  },
};

// Zn + 2NaOH + 2H₂O → Na₂[Zn(OH)₄] + H₂↑ (doc 14, § 4.11): very slow cold, clear hydrogen once heated.
export const zincAlkali = {
  id: "zinc-alkali",
  info: "zn-naoh-hydrogen",
  notice: 0.05,
  step(m, dt, ctx, k) {
    if (k.conc(m, "OH-") < 0.5) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      if (s.species !== "Zn" || !reactive(s)) continue;
      const factor = m.tempC > 60 ? k.warmth(m, 20) : 0.02;
      const n = Math.min(k.shrink(s, dt, 60, factor), k.aq(m, "OH-") / 2);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "OH-", 2 * n);
      k.takeAq(m, "H2O", 2 * n);
      k.addAq(m, "Zn(OH)4 2-", n);
      k.evolveGas(m, "H2", n, dt, { site: "pieces" });
      k.heat(m, 100, n);
      total += n;
    }
    return total;
  },
};

// Mg + 2H₂O →(t) Mg(OH)₂ + H₂↑ (doc 14, § 4.10): the oxide film holds it back until the water is hot.
export const magnesiumHotWater = {
  id: "magnesium-hot-water",
  info: "mg-hot-water",
  notice: 0.02,
  step(m, dt, ctx, k) {
    if (m.tempC < 80 || k.aq(m, "H2O") <= k.EPS || k.aq(m, "H+") > 1e-3) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      if (s.species !== "Mg" || !reactive(s)) continue;
      const n = Math.min(k.shrink(s, dt, 120, k.warmth(m, 15)), k.aq(m, "H2O"));
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "H2O", 2 * n);
      k.addSolid(m, "Mg(OH)2", "ppt", n);
      k.evolveGas(m, "H2", n, dt, { site: "pieces" });
      k.heat(m, 350, n);
      total += n;
    }
    return total;
  },
};

// Copper below hydrogen, iron passivated in cold concentrated acid (doc 14, § 4.1–4.3): nothing happens, and the monitor says why.
const inertRule = (id, info, matches) => ({
  id,
  info,
  notice: 0.04,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS) return 0;
    return matches(m, k) ? dt * 0.02 : 0;
  },
});

export const copperInertAcid = inertRule("copper-inert-acid", "cu-acid-none", (m, k) => {
  if (k.solidMmol(m, "Cu") <= k.EPS || k.conc(m, "H+") < 0.5) return false;
  // Cold concentrated sulfuric acid leaves copper alone too, until the lamp is lit (doc 14, № 14).
  if (k.sulfuricFraction(m) > 0.7) return m.tempC < 80;
  return k.nitricFraction(m) < 0.05;
});

export const ironPassivation = inertRule("iron-passivation", "fe-passivation", (m, k) =>
  k.solidMmol(m, "Fe") > k.EPS &&
  m.tempC < 80 &&
  (k.sulfuricFraction(m) > 0.7 || k.nitricFraction(m) > 0.5));

export const METAL_RULES = [
  metalAcidHydrogen,
  metalSulfuricHydrogen,
  activeMetalConcSulfuric,
  nobleMetalConcSulfuric,
  copperNitric,
  nitricOxideAir,
  metalDisplacement,
  zincAlkali,
  magnesiumHotWater,
  copperInertAcid,
  ironPassivation,
];
