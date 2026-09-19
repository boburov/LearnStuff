import { peek } from "./helpers";

// Strong acid + strong base: diffusion-limited, so it completes within the step and keeps pH exact during titration.
export const neutralization = {
  id: "neutralization",
  info: "naoh-phenolphthalein-hcl",
  notice: 0.05,
  step(m, dt, ctx, k) {
    const n = Math.min(k.aq(m, "H+"), k.aq(m, "OH-"));
    if (n <= k.EPS) return 0;
    k.takeAq(m, "H+", n);
    k.takeAq(m, "OH-", n);
    k.addAq(m, "H2O", n);
    k.heat(m, 57.1, n);
    return n;
  },
};

// H⁺ + NH₃ → NH₄⁺: a strong acid protonates ammonia completely.
export const ammoniaProtonation = {
  id: "ammonia-protonation",
  info: null,
  step(m, dt, ctx, k) {
    const n = Math.min(k.aq(m, "H+"), k.aq(m, "NH3"));
    if (n <= k.EPS) return 0;
    k.takeAq(m, "H+", n);
    k.takeAq(m, "NH3", n);
    k.addAq(m, "NH4+", n);
    k.heat(m, 52.2, n);
    return n;
  },
};

// NH₄⁺ + OH⁻ → NH₃ + H₂O: strong base drives ammonia back out of its salt.
export const ammoniumRelease = {
  id: "ammonium-release",
  info: null,
  step(m, dt, ctx, k) {
    const n = Math.min(k.aq(m, "OH-"), k.aq(m, "NH4+"));
    if (n <= k.EPS) return 0;
    k.takeAq(m, "OH-", n);
    k.takeAq(m, "NH4+", n);
    k.addAq(m, "NH3", n);
    k.addAq(m, "H2O", n);
    return n;
  },
};

// CO₃²⁻ + H⁺ → HCO₃⁻, the first (invisible) step before any gas comes off.
export const carbonateProtonation = {
  id: "carbonate-protonation",
  info: null,
  step(m, dt, ctx, k) {
    const n = Math.min(k.aq(m, "H+"), k.aq(m, "CO3 2-"));
    if (n <= k.EPS) return 0;
    k.takeAq(m, "H+", n);
    k.takeAq(m, "CO3 2-", n);
    k.addAq(m, "HCO3-", n);
    return n;
  },
};

// HCO₃⁻ + OH⁻ → CO₃²⁻ + H₂O: soda solution plus alkali, and the second step of CO₂ absorption.
export const bicarbonateBase = {
  id: "bicarbonate-base",
  info: null,
  step(m, dt, ctx, k) {
    const n = Math.min(k.aq(m, "OH-"), k.aq(m, "HCO3-"));
    if (n <= k.EPS) return 0;
    k.takeAq(m, "OH-", n);
    k.takeAq(m, "HCO3-", n);
    k.addAq(m, "CO3 2-", n);
    k.addAq(m, "H2O", n);
    return n;
  },
};

// CO₂ + OH⁻ → HCO₃⁻ (doc 14, § 4.6): real but invisible in NaOH; with Ca²⁺ the carbonate rule shows the milkiness.
export const carbonDioxideBase = {
  id: "co2-hydroxide",
  info: "co2-naoh",
  notice: 0.4,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "CO2(aq)"), k.aq(m, "OH-")), dt, 0.3);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "CO2(aq)", n);
    k.takeAq(m, "OH-", n);
    k.addAq(m, "HCO3-", n);
    k.heat(m, 89, n);
    // Limewater tells the same story through its precipitate, so only a clear solution announces this one.
    return k.aq(m, "Ca2+") > k.EPS ? 0 : n;
  },
};

// Phenolphthalein slowly loses its colour in strong alkali (doc 14, № 1 note); it comes back as the pH drops.
export const phenolphthaleinFade = {
  id: "phenolphthalein-fade",
  info: null,
  step(m, dt, ctx, k) {
    const pink = k.aq(m, "Phenolphthalein");
    const faded = k.aq(m, "PhenolphthaleinFaded");
    const oh = k.conc(m, "OH-");
    if (oh > 0.05 && pink > k.EPS) {
      const n = pink * (1 - Math.exp(-0.01 * oh * dt));
      k.takeAq(m, "Phenolphthalein", n);
      k.addAq(m, "PhenolphthaleinFaded", n);
      return n;
    }
    if (oh < 1e-3 && faded > k.EPS) {
      const n = k.fast(faded, dt, 4);
      k.takeAq(m, "PhenolphthaleinFaded", n);
      k.addAq(m, "Phenolphthalein", n);
      return n;
    }
    return 0;
  },
};

// The pink itself comes from appearance.js; these rules only decide which explanation the monitor shows.
const indicatorRule = (id, info, matches) => ({
  id,
  info,
  notice: 0.0005,
  step(m, dt, ctx, k) {
    const dye = k.aq(m, "Phenolphthalein");
    if (dye <= k.EPS || m.volumeMl <= k.EPS) return 0;
    const ph = k.ph(m);
    if (ph == null || ph < 8.2) return 0;
    return matches(m, k) ? dye : 0;
  },
});

export const phenolphthaleinSodium = indicatorRule("phenolphthalein-sodium", "sodium-water-phenolphthalein", (m) =>
  Boolean(peek(m, "sodium-water")));

export const phenolphthaleinAmmonia = indicatorRule("phenolphthalein-ammonia", "nh3-phenolphthalein", (m, k) =>
  !peek(m, "sodium-water") && k.aq(m, "NH3") > k.aq(m, "OH-"));

export const phenolphthaleinAlkali = indicatorRule("phenolphthalein-alkali", "naoh-phenolphthalein", (m, k) =>
  !peek(m, "sodium-water") && k.aq(m, "NH3") <= k.aq(m, "OH-"));

export const ACID_BASE_RULES = [
  neutralization,
  ammoniaProtonation,
  ammoniumRelease,
  carbonateProtonation,
  bicarbonateBase,
  carbonDioxideBase,
  phenolphthaleinFade,
  phenolphthaleinSodium,
  phenolphthaleinAmmonia,
  phenolphthaleinAlkali,
];
