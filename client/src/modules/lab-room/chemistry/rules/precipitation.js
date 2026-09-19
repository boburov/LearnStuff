import { solidsOf } from "./helpers";

// Ag⁺ + I⁻ → AgI↓ (doc 14, № 5): pale yellow and even less soluble than the chloride, so iodide goes first.
export const silverIodide = {
  id: "silver-iodide",
  info: "agno3-ki",
  notice: 0.005,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Ag+"), k.aq(m, "I-")), dt, 0.3);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Ag+", n);
    k.takeAq(m, "I-", n);
    k.addSolid(m, "AgI", "ppt", n);
    return n;
  },
};

// Ag⁺ + Cl⁻ → AgCl↓ (doc 14, № 4): curdy white precipitate within about a second.
export const silverChloride = {
  id: "silver-chloride",
  info: "agno3-hcl",
  notice: 0.005,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Ag+"), k.aq(m, "Cl-")), dt, 0.3);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Ag+", n);
    k.takeAq(m, "Cl-", n);
    k.addSolid(m, "AgCl", "ppt", n);
    return n;
  },
};

// AgCl + I⁻ → AgI + Cl⁻: iodide takes the silver off the chloride it meets.
export const silverHalideExchange = {
  id: "silver-halide-exchange",
  info: null,
  step(m, dt, ctx, k) {
    const solid = k.findSolid(m, "AgCl", "ppt");
    if (!solid) return 0;
    const n = k.fast(Math.min(solid.mmol, k.aq(m, "I-")), dt, 2);
    if (n <= k.EPS) return 0;
    k.takeSolid(m, solid, n);
    k.takeAq(m, "I-", n);
    k.addAq(m, "Cl-", n);
    k.addSolid(m, "AgI", "ppt", n);
    return n;
  },
};

// 2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O (doc 14, § 5 Q9): silver hydroxide is not stable, the brown oxide falls out.
export const silverOxide = {
  id: "silver-oxide",
  info: "agno3-naoh",
  notice: 0.005,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Ag+"), k.aq(m, "OH-")) / 2, dt, 0.4);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Ag+", 2 * n);
    k.takeAq(m, "OH-", 2 * n);
    k.addAq(m, "H2O", n);
    k.addSolid(m, "Ag2O", "ppt", 2 * n);
    return n;
  },
};

// Cu²⁺ + 2OH⁻ → Cu(OH)₂↓ (doc 14, № 6): pale blue gel, from caustic soda or limewater alike.
export const copperHydroxide = {
  id: "copper-hydroxide",
  info: "cuso4-naoh",
  notice: 0.01,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Cu2+"), k.aq(m, "OH-") / 2), dt, 0.3);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Cu2+", n);
    k.takeAq(m, "OH-", 2 * n);
    k.addSolid(m, "Cu(OH)2", "ppt", n);
    k.heat(m, 30, n);
    return n;
  },
};

// Fe³⁺ + 3OH⁻ → Fe(OH)₃↓ (doc 14, № 7); ammonia works just as well and leaves NH₄⁺ behind.
export const ironHydroxide = {
  id: "iron-hydroxide",
  info: "fecl3-naoh",
  notice: 0.01,
  step(m, dt, ctx, k) {
    let total = 0;
    const strong = k.fast(Math.min(k.aq(m, "Fe3+"), k.aq(m, "OH-") / 3), dt, 0.3);
    if (strong > k.EPS) {
      k.takeAq(m, "Fe3+", strong);
      k.takeAq(m, "OH-", 3 * strong);
      k.addSolid(m, "Fe(OH)3", "ppt", strong);
      k.heat(m, 40, strong);
      total += strong;
    }
    const weak = k.fast(Math.min(k.aq(m, "Fe3+"), k.aq(m, "NH3") / 3), dt, 0.4);
    if (weak > k.EPS) {
      k.takeAq(m, "Fe3+", weak);
      k.takeAq(m, "NH3", 3 * weak);
      k.addAq(m, "NH4+", 3 * weak);
      k.addSolid(m, "Fe(OH)3", "ppt", weak);
      total += weak;
    }
    return total;
  },
};

// Zn²⁺ + 2OH⁻ → Zn(OH)₂↓, which dissolves again in excess alkali as the zincate (doc 14, § 4.11).
export const zincHydroxide = {
  id: "zinc-hydroxide",
  info: "zn-naoh-amphoteric",
  notice: 0.01,
  step(m, dt, ctx, k) {
    let total = 0;
    const n = k.fast(Math.min(k.aq(m, "Zn2+"), k.aq(m, "OH-") / 2), dt, 0.3);
    if (n > k.EPS) {
      k.takeAq(m, "Zn2+", n);
      k.takeAq(m, "OH-", 2 * n);
      k.addSolid(m, "Zn(OH)2", "ppt", n);
      total += n;
    }
    const solid = k.findSolid(m, "Zn(OH)2", "ppt");
    // Excess alkali only: the hydroxide needs free OH⁻ beyond the two it already holds.
    if (solid && k.conc(m, "OH-") > 0.05) {
      const d = k.fast(Math.min(solid.mmol, k.aq(m, "OH-") / 2), dt, 1.5);
      if (d > k.EPS) {
        k.takeSolid(m, solid, d);
        k.takeAq(m, "OH-", 2 * d);
        k.addAq(m, "Zn(OH)4 2-", d);
        total += d;
      }
    }
    return total;
  },
};

// Magnesium hydroxide is barely soluble: it falls out of alkaline solutions and redissolves up to saturation.
const MG_KSP = 5.6e-12;
const MG_SAT = 1.12e-4;

export const magnesiumHydroxide = {
  id: "magnesium-hydroxide",
  info: null,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS) return 0;
    const mg = k.conc(m, "Mg2+");
    const oh = k.conc(m, "OH-");
    const q = mg * oh * oh;
    if (q > MG_KSP * 2) {
      const n = k.fast(Math.min(k.aq(m, "Mg2+"), k.aq(m, "OH-") / 2), dt, 0.5);
      if (n <= k.EPS) return 0;
      k.takeAq(m, "Mg2+", n);
      k.takeAq(m, "OH-", 2 * n);
      k.addSolid(m, "Mg(OH)2", "ppt", n);
      return n;
    }
    const solid = k.findSolid(m, "Mg(OH)2", "ppt");
    if (!solid || mg >= MG_SAT || q > MG_KSP * 0.5) return 0;
    const n = k.fast(Math.min(solid.mmol, (MG_SAT - mg) * m.volumeMl), dt, 3);
    if (n <= k.EPS) return 0;
    k.takeSolid(m, solid, n);
    k.addAq(m, "Mg2+", n);
    k.addAq(m, "OH-", 2 * n);
    return n;
  },
};

// MgO + H₂O → Mg(OH)₂ (doc 14, № 27 follow-up): the ash of burnt magnesium makes the water faintly alkaline.
export const magnesiaHydration = {
  id: "magnesia-hydration",
  info: "mgo-water",
  notice: 0.02,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS || k.aq(m, "H2O") <= k.EPS) return 0;
    let total = 0;
    for (const s of solidsOf(m, "MgO")) {
      const n = k.shrink(s, dt, 20, k.warmth(m, 25));
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.addSolid(m, "Mg(OH)2", "ppt", n);
      k.heat(m, 37, n);
      total += n;
    }
    return total;
  },
};

// Ca²⁺ + CO₃²⁻ → CaCO₃↓ (doc 14, № 8): the milkiness that proves carbon dioxide.
export const calciumCarbonate = {
  id: "calcium-carbonate",
  info: "limewater-co2",
  notice: 0.004,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Ca2+"), k.aq(m, "CO3 2-")), dt, 0.5);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Ca2+", n);
    k.takeAq(m, "CO3 2-", n);
    k.addSolid(m, "CaCO3", "ppt", n);
    return n;
  },
};

// CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂ (doc 14, № 8 stage 2): more gas clears the milkiness again over ~15 s.
export const calciumBicarbonate = {
  id: "calcium-bicarbonate",
  info: "limewater-co2-excess",
  notice: 0.004,
  step(m, dt, ctx, k) {
    let total = 0;
    for (const s of m.solids) {
      if (s.species !== "CaCO3" || s.form === "piece") continue;
      const n = Math.min(k.shrink(s, dt, 15), k.aq(m, "CO2(aq)"));
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "CO2(aq)", n);
      k.addAq(m, "Ca2+", n);
      k.addAq(m, "HCO3-", 2 * n);
      total += n;
    }
    return total;
  },
};

// Ca²⁺ + SO₄²⁻ → CaSO₄↓: sparingly soluble, and it is what coats marble in sulfuric acid (doc 14, § 4.8).
export const calciumSulfate = {
  id: "calcium-sulfate",
  info: null,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS) return 0;
    if (k.conc(m, "Ca2+") * k.conc(m, "SO4 2-") <= 4.9e-5) return 0;
    const n = k.fast(Math.min(k.aq(m, "Ca2+"), k.aq(m, "SO4 2-")), dt, 1);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Ca2+", n);
    k.takeAq(m, "SO4 2-", n);
    k.addSolid(m, "CaSO4", "ppt", n);
    return n;
  },
};

// Soda solution with copper or iron salts (doc 14, § 5 Q9): a basic precipitate and a stream of carbon dioxide.
export const metalBicarbonate = {
  id: "metal-bicarbonate",
  info: "metal-nahco3",
  notice: 0.01,
  step(m, dt, ctx, k) {
    if (k.aq(m, "HCO3-") <= k.EPS) return 0;
    let total = 0;
    const copper = k.fast(Math.min(k.aq(m, "Cu2+"), k.aq(m, "HCO3-") / 2), dt, 0.5);
    if (copper > k.EPS) {
      k.takeAq(m, "Cu2+", copper);
      k.takeAq(m, "HCO3-", 2 * copper);
      k.addSolid(m, "CuCarbonateBasic", "ppt", copper / 2);
      k.addAq(m, "H2O", copper / 2);
      k.evolveGas(m, "CO2", 1.5 * copper, dt, { site: "bottom" });
      total += copper;
    }
    const iron = k.fast(Math.min(k.aq(m, "Fe3+"), k.aq(m, "HCO3-") / 3), dt, 0.5);
    if (iron > k.EPS) {
      k.takeAq(m, "Fe3+", iron);
      k.takeAq(m, "HCO3-", 3 * iron);
      k.addSolid(m, "Fe(OH)3", "ppt", iron);
      k.evolveGas(m, "CO2", 3 * iron, dt, { site: "bottom" });
      total += iron;
    }
    return total;
  },
};

// Basic solids dissolve in acid again (doc 14, № 6 and № 7 follow-ups): H⁺ per formula unit and the ions released.
const ACID_SOLUBLE = {
  "Cu(OH)2": { h: 2, ions: { "Cu2+": 1 }, kj: 66, seconds: 2 },
  CuBasicSulfate: { h: 2, ions: { "Cu2+": 2, "SO4 2-": 1 }, kj: 100, seconds: 3 },
  "Fe(OH)3": { h: 3, ions: { "Fe3+": 1 }, kj: 100, seconds: 2 },
  "Zn(OH)2": { h: 2, ions: { "Zn2+": 1 }, kj: 87, seconds: 2 },
  "Mg(OH)2": { h: 2, ions: { "Mg2+": 1 }, kj: 111, seconds: 2 },
  MgO: { h: 2, ions: { "Mg2+": 1 }, kj: 146, seconds: 6 },
  CuO: { h: 2, ions: { "Cu2+": 1 }, kj: 72, seconds: 15 },
  Ag2O: { h: 2, ions: { "Ag+": 2 }, kj: 60, seconds: 4 },
  CuCarbonateBasic: { h: 4, ions: { "Cu2+": 2 }, kj: 60, seconds: 4, co2: 1 },
};

export const hydroxideAcid = {
  id: "hydroxide-acid",
  info: "hydroxide-acid",
  notice: 0.01,
  step(m, dt, ctx, k) {
    if (k.aq(m, "H+") <= k.EPS) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      const recipe = ACID_SOLUBLE[s.species];
      if (!recipe || s.form === "coat") continue;
      const n = Math.min(k.shrink(s, dt, recipe.seconds, k.warmth(m, 20)), k.aq(m, "H+") / recipe.h);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "H+", recipe.h * n);
      for (const [id, per] of Object.entries(recipe.ions)) k.addAq(m, id, per * n);
      k.addAq(m, "H2O", n);
      if (recipe.co2) k.evolveGas(m, "CO2", recipe.co2 * n, dt, { site: "bottom" });
      k.heat(m, recipe.kj, n);
      total += n;
    }
    return total;
  },
};

export const PRECIPITATION_RULES = [
  silverIodide,
  silverChloride,
  silverHalideExchange,
  silverOxide,
  copperHydroxide,
  ironHydroxide,
  zincHydroxide,
  magnesiumHydroxide,
  magnesiaHydration,
  calciumCarbonate,
  calciumBicarbonate,
  calciumSulfate,
  metalBicarbonate,
  hydroxideAcid,
];
