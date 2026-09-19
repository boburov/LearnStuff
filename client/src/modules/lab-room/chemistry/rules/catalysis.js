import { foamFrom } from "./helpers";

// 2H₂O₂ → 2H₂O + O₂↑ (doc 14, № 15–16): the catalyst is never used up, it only sets the pace.
// heatScale is the share of the heat still in the flask at simulation speed (doc 14, № 16 runs for minutes in reality).
const peroxideRule = (id, info, { factor, heatScale, applies, extra }) => ({
  id,
  info,
  notice: 0.05,
  step(m, dt, ctx, k) {
    if (k.aq(m, "H2O2") <= k.EPS || !applies(m, k)) return 0;
    const tau = 6 / (factor(m, k) * k.warmth(m, 15));
    const n = k.fast(k.aq(m, "H2O2"), dt, Math.max(0.4, tau));
    if (n <= k.EPS) return 0;
    k.takeAq(m, "H2O2", n);
    k.addAq(m, "H2O", n);
    k.evolveGas(m, "O2", n / 2, dt, { site: "bottom" });
    k.heat(m, 98 * heatScale, n);
    const rate = n / Math.max(dt, 1e-3);
    foamFrom(k, m, rate / 2);
    // Concentrated peroxide boils over and throws droplets out (doc 14, № 15).
    if (rate > 3) k.fx(m, "spatter", Math.min(1, rate / 8));
    extra?.(m, dt, k, n);
    return n;
  },
});

export const peroxideManganese = peroxideRule("peroxide-manganese", "h2o2-mno2", {
  applies: (m, k) => k.solidMmol(m, "MnO2") > k.EPS,
  factor: (m, k) => Math.min(1.2, 0.3 + 1.2 * k.solidMmol(m, "MnO2")),
  heatScale: 1,
});

export const peroxideIodide = peroxideRule("peroxide-iodide", "h2o2-ki", {
  applies: (m, k) => k.solidMmol(m, "MnO2") <= k.EPS && k.aq(m, "I-") > k.EPS,
  factor: (m, k) => Math.min(0.9, 0.2 + 14 * k.conc(m, "I-")),
  heatScale: 0.35,
  // Part of the iodide is oxidised on the way and stains the solution yellow-brown.
  extra: (m, dt, k, n) => {
    const iodine = k.aq(m, "I2");
    const cap = 0.12 * (k.aq(m, "I-") + 2 * iodine);
    if (iodine >= cap) return;
    const made = Math.min(k.fast(n, dt, 1) / 4, k.aq(m, "I-") / 2, cap - iodine);
    if (made <= k.EPS) return;
    k.takeAq(m, "I-", 2 * made);
    k.addAq(m, "I2", made);
    k.addAq(m, "OH-", 2 * made);
  },
});

export const peroxideIron = peroxideRule("peroxide-iron", "fecl3-h2o2", {
  applies: (m, k) => k.solidMmol(m, "MnO2") <= k.EPS && k.aq(m, "I-") <= k.EPS && k.aq(m, "Fe3+") > k.EPS,
  factor: (m, k) => Math.min(0.8, 0.2 + 2 * k.conc(m, "Fe3+")),
  heatScale: 0.5,
});

export const CATALYSIS_RULES = [peroxideManganese, peroxideIodide, peroxideIron];
