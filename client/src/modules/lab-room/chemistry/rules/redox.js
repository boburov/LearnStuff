import { toxicWarn } from "./helpers";

// 2Fe³⁺ + 2I⁻ → 2Fe²⁺ + I₂ (doc 14, № 22): the solution goes darker brown than either reagent.
export const ironIodide = {
  id: "iron-iodide",
  info: "ki-fecl3",
  notice: 0.01,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Fe3+"), k.aq(m, "I-")), dt, 1) / 2;
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Fe3+", 2 * n);
    k.takeAq(m, "I-", 2 * n);
    k.addAq(m, "Fe2+", 2 * n);
    k.addAq(m, "I2", n);
    k.heat(m, 50, n);
    return n;
  },
};

// Cl₂ + 2I⁻ → 2Cl⁻ + I₂ (doc 14, № 23): the stronger halogen drives the weaker one out.
export const chlorineIodide = {
  id: "chlorine-iodide",
  info: "cl2-ki",
  notice: 0.01,
  step(m, dt, ctx, k, events) {
    const n = k.fast(Math.min(k.aq(m, "Cl2(aq)"), k.aq(m, "I-") / 2), dt, 0.6);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Cl2(aq)", n);
    k.takeAq(m, "I-", 2 * n);
    k.addAq(m, "Cl-", 2 * n);
    k.addAq(m, "I2", n);
    k.heat(m, 60, n);
    toxicWarn(k, m, events, ctx);
    return n;
  },
};

// I₂ + 5Cl₂ + 6H₂O → 2IO₃⁻ + 12H⁺ + 10Cl⁻ (doc 14, № 23): keep bubbling and the brown disappears again.
export const iodineOveroxidation = {
  id: "iodine-overoxidation",
  info: "cl2-ki-excess",
  notice: 0.005,
  step(m, dt, ctx, k) {
    if (k.aq(m, "I-") > 0.05) return 0;
    const n = k.fast(Math.min(k.aq(m, "I2"), k.aq(m, "Cl2(aq)") / 5), dt, 5);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "I2", n);
    k.takeAq(m, "Cl2(aq)", 5 * n);
    k.takeAq(m, "H2O", 6 * n);
    k.addAq(m, "IO3-", 2 * n);
    k.addAq(m, "H+", 12 * n);
    k.addAq(m, "Cl-", 10 * n);
    return n;
  },
};

// 2MnO₄⁻ + 5H₂O₂ + 6H⁺ → 2Mn²⁺ + 5O₂↑ + 8H₂O (doc 14, № 24a): in acid the violet goes clear.
export const permanganatePeroxideAcid = {
  id: "permanganate-peroxide-acid",
  info: "kmno4-h2o2-acid",
  notice: 0.002,
  step(m, dt, ctx, k) {
    if (k.conc(m, "H+") < 0.01) return 0;
    const n = Math.min(k.fast(k.aq(m, "MnO4-"), dt, 0.5), k.aq(m, "H2O2") / 2.5, k.aq(m, "H+") / 3);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "MnO4-", n);
    k.takeAq(m, "H2O2", 2.5 * n);
    k.takeAq(m, "H+", 3 * n);
    k.addAq(m, "Mn2+", n);
    k.addAq(m, "H2O", 4 * n);
    k.evolveGas(m, "O2", 2.5 * n, dt, { site: "bottom" });
    k.heat(m, 400, n);
    return n;
  },
};

// 2MnO₄⁻ + 3H₂O₂ → 2MnO₂↓ + 2OH⁻ + 3O₂↑ + 2H₂O (doc 14, № 24b): without acid a brown sludge falls out.
export const permanganatePeroxideNeutral = {
  id: "permanganate-peroxide-neutral",
  info: "kmno4-h2o2-neutral",
  notice: 0.002,
  step(m, dt, ctx, k) {
    if (k.conc(m, "H+") >= 0.01) return 0;
    const n = Math.min(k.fast(k.aq(m, "MnO4-"), dt, 2), k.aq(m, "H2O2") / 1.5);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "MnO4-", n);
    k.takeAq(m, "H2O2", 1.5 * n);
    k.addSolid(m, "MnO2", "ppt", n);
    k.addAq(m, "OH-", n);
    k.addAq(m, "H2O", n);
    k.evolveGas(m, "O2", 1.5 * n, dt, { site: "bottom" });
    k.heat(m, 300, n);
    return n;
  },
};

// 2MnO₄⁻ + 10I⁻ + 16H⁺ → 2Mn²⁺ + 5I₂ + 8H₂O, or manganese dioxide when there is no acid (doc 14, § 5 Q9).
export const permanganateIodide = {
  id: "permanganate-iodide",
  info: "kmno4-ki",
  notice: 0.002,
  step(m, dt, ctx, k) {
    const acidic = k.conc(m, "H+") > 0.01;
    const n = Math.min(k.fast(k.aq(m, "MnO4-"), dt, 1), k.aq(m, "I-") / (acidic ? 5 : 3));
    if (n <= k.EPS) return 0;
    k.takeAq(m, "MnO4-", n);
    if (acidic) {
      k.takeAq(m, "I-", 5 * n);
      k.takeAq(m, "H+", 8 * n);
      k.addAq(m, "Mn2+", n);
      k.addAq(m, "I2", 2.5 * n);
      k.addAq(m, "H2O", 4 * n);
    } else {
      k.takeAq(m, "I-", 3 * n);
      k.takeAq(m, "H2O", 2 * n);
      k.addSolid(m, "MnO2", "ppt", n);
      k.addAq(m, "I2", 1.5 * n);
      k.addAq(m, "OH-", 4 * n);
    }
    k.heat(m, 200, n);
    return n;
  },
};

// 2Cu²⁺ + 4I⁻ → 2CuI↓ + I₂ (doc 14, № 25): brown iodine over a tan copper(I) iodide bed.
export const copperIodide = {
  id: "copper-iodide",
  info: "cuso4-ki",
  notice: 0.01,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Cu2+"), k.aq(m, "I-") / 2), dt, 0.7);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Cu2+", n);
    k.takeAq(m, "I-", 2 * n);
    k.addSolid(m, "CuI", "ppt", n);
    k.addAq(m, "I2", n / 2);
    k.heat(m, 100, n);
    return n;
  },
};

export const REDOX_RULES = [
  ironIodide,
  chlorineIodide,
  iodineOveroxidation,
  permanganatePeroxideAcid,
  permanganatePeroxideNeutral,
  permanganateIodide,
  copperIodide,
];
