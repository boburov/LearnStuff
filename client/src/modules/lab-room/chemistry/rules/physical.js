import { solidsOf } from "./helpers";

// Dissolving (doc 14, № 42–43): sim seconds unstirred, saturation in mol/L, and the ions or molecules released.
const SOLUBLE = {
  SucroseCrystals: { seconds: 20, cap: 6, aq: { Sucrose: 1 }, info: "sugar-water" },
  NaHCO3: { seconds: 25, cap: 1.14, aq: { "Na+": 1, "HCO3-": 1 }, info: "nahco3-water", kj: -17.2 },
  KMnO4: { seconds: 20, cap: 0.4, aq: { "K+": 1, "MnO4-": 1 }, info: "kmno4-water", plume: true },
};

const dissolveRule = (species, recipe) => ({
  id: `dissolve-${species.toLowerCase()}`,
  info: recipe.info,
  notice: 0.05,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS || k.aq(m, "H2O") <= k.EPS) return 0;
    // In acid the carbonate fizzes away instead of dissolving quietly, and nothing dissolves in oily conc. acid.
    if (species === "NaHCO3" && k.aq(m, "H+") > k.EPS) return 0;
    if (k.sulfuricFraction(m) > 0.5) return 0;
    let total = 0;
    for (const s of solidsOf(m, species)) {
      const room = (recipe.cap - k.conc(m, Object.keys(recipe.aq)[0])) * m.volumeMl;
      if (room <= k.EPS) continue;
      const factor = (ctx.stirring ? 4 : 1) * k.warmth(m, 25);
      const n = Math.min(k.shrink(s, dt, recipe.seconds, factor), room);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      for (const [id, per] of Object.entries(recipe.aq)) k.addAq(m, id, per * n);
      if (recipe.kj) k.heat(m, recipe.kj, n);
      total += n;
    }
    // Colour streaming out of the crystal until the liquid is even (doc 14, № 42).
    if (recipe.plume && total > k.EPS) k.fx(m, "plume", ctx.stirring ? 0.3 : 1);
    return total;
  },
});

export const dissolveSugar = dissolveRule("SucroseCrystals", SOLUBLE.SucroseCrystals);
export const dissolveBicarbonate = dissolveRule("NaHCO3", SOLUBLE.NaHCO3);
export const dissolvePermanganate = dissolveRule("KMnO4", SOLUBLE.KMnO4);

const ML_PER_MMOL = { C2H5OH: 0.0584, H2O: 0.018, C3H8O3: 0.073 };

// Ethanol and water shrink when they mix and the tube warms a little (doc 14, № 45a).
export const ethanolWaterMixing = {
  id: "ethanol-water-mixing",
  info: "ethanol-water",
  notice: 0.05,
  step(m, dt, ctx, k) {
    const ethanol = k.aq(m, "C2H5OH") * ML_PER_MMOL.C2H5OH;
    const water = k.aq(m, "H2O") * ML_PER_MMOL.H2O;
    if (ethanol < 0.5 || water < 0.5) return 0;
    const state = k.state(m, "ethanol-water-mixing", { applied: 0, heated: 0 });
    const x = ethanol / (ethanol + water);
    const shape = 4 * x * (1 - x);
    const ideal = m.volumeMl + state.applied;
    const target = 0.03 * shape * (ethanol + water);
    const moles = k.aq(m, "C2H5OH") + k.aq(m, "H2O");
    const heatTarget = 0.6 * shape * moles;
    const step = 1 - Math.exp(-dt / 1.5);
    const shrinkBy = (target - state.applied) * step;
    const warmBy = (heatTarget - state.heated) * step;
    if (Math.abs(shrinkBy) < 1e-4 && Math.abs(warmBy) < 1e-3) return 0;
    state.applied += shrinkBy;
    state.heated += warmBy;
    m.volumeMl = Math.max(0, Math.min(ideal, ideal - state.applied));
    k.addHeat(m, warmBy);
    return Math.abs(shrinkBy);
  },
};

// A heavy liquid sinking through a lighter one leaves wavy streaks until it is stirred (doc 14, № 41 and № 45b).
const DENSE = { C3H8O3: 5, "SO4 2-": 2 };

export const schlieren = {
  id: "schlieren",
  info: null,
  step(m, dt, ctx, k) {
    const state = k.state(m, "schlieren", { until: -Infinity });
    const now = ctx.now ?? 0;
    for (const mix of ctx.mixes ?? []) {
      if (!mix || mix.addedMl <= 0.2 || mix.volumeMl <= 0.2) continue;
      const dense = Object.keys(DENSE).some((id) => k.conc(m, id) > 0.2);
      if (dense) state.until = now + (mix.portionSulfuric > 0.5 ? 2 : 5);
    }
    if (now >= state.until) return 0;
    const left = state.until - now;
    k.fx(m, "schlieren", ctx.stirring ? Math.min(0.3, left) : Math.min(1, left));
    return 0;
  },
};

// Adding water to a coloured solution only opens the colour up (doc 14, № 44).
export const dilution = {
  id: "dilution",
  info: "cuso4-dilution",
  notice: 0.5,
  step(m, dt, ctx, k) {
    let total = 0;
    for (const mix of ctx.mixes ?? []) {
      if (!mix || mix.addedMl <= 0.2) continue;
      const watery = mix.portionWater * 0.018 > 0.9 * mix.addedMl;
      const coloured = ["Cu2+", "Fe3+", "MnO4-", "I2", "Cu(NH3)4 2+"].some((id) => k.conc(m, id) > 1e-4);
      if (watery && coloured && mix.volumeMl > 0.2) total += mix.addedMl;
    }
    return total;
  },
};

// Sulfur, manganese dioxide and iron filings simply do not dissolve (doc 14, № 43b).
const INSOLUBLE = ["S", "MnO2", "Fe"];

export const insolubleSolids = {
  id: "insoluble-solids",
  info: "solids-water",
  notice: 0.04,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS) return 0;
    const plainWater = Object.keys(m.aq).every((id) => id === "H2O");
    if (!plainWater) return 0;
    const sitting = m.solids.some((s) => INSOLUBLE.includes(s.species) && s.form !== "coat");
    return sitting ? dt * 0.02 : 0;
  },
};

export const PHYSICAL_RULES = [
  dissolveSugar,
  dissolveBicarbonate,
  dissolvePermanganate,
  ethanolWaterMixing,
  schlieren,
  dilution,
  insolubleSolids,
];
