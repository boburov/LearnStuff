import { solidsOf } from "./helpers";

// Cu(OH)₂ →(t) CuO + H₂O (doc 14, № 6): the pale blue gel turns black powder in about 10 s of boiling.
export const copperHydroxideHeat = {
  id: "copper-hydroxide-heat",
  info: "cuso4-naoh-heat",
  notice: 0.01,
  step(m, dt, ctx, k) {
    if (m.tempC < 80) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      if (s.species !== "Cu(OH)2") continue;
      const n = k.fast(s.mmol, dt, 3.5 / k.warmth(m, 30));
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.addSolid(m, "CuO", "ppt", n);
      k.addAq(m, "H2O", n);
      k.heat(m, -84, n);
      total += n;
    }
    if (total > k.EPS) k.fx(m, "steam", Math.min(0.6, total / Math.max(dt, 1e-3)));
    return total;
  },
};

// 2KMnO₄ →(t) K₂MnO₄ + MnO₂ + O₂↑ (doc 14, № 18): dry crystals crackle above 200 °C.
export const permanganateHeat = {
  id: "permanganate-heat",
  info: "kmno4-heat",
  notice: 0.05,
  step(m, dt, ctx, k) {
    if (m.tempC < 200 || m.volumeMl > 0.1) return 0;
    let total = 0;
    for (const s of solidsOf(m, "KMnO4")) {
      const n = k.shrink(s, dt, 15, k.warmth(m, 120));
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.addSolid(m, "PermanganateResidue", "residue", n / 2);
      k.addGas(m, "O2", n / 2);
      k.heat(m, -13, n);
      total += n;
    }
    if (total > k.EPS) {
      const rate = total / Math.max(dt, 1e-3);
      k.fx(m, "crackle", Math.min(1, rate * 3));
      k.fx(m, "smoke", { rate: Math.min(0.5, rate * 2), color: "#3d1f4a", toxic: false });
    }
    return total;
  },
};

// Ca(HCO₃)₂ →(t) CaCO₃↓ + CO₂↑ + H₂O (doc 14, № 8 stage 3): the clear solution turns milky again when heated.
export const calciumBicarbonateHeat = {
  id: "calcium-bicarbonate-heat",
  info: "limewater-co2-heat",
  notice: 0.004,
  step(m, dt, ctx, k) {
    if (m.tempC < 70 || k.aq(m, "Ca2+") <= k.EPS) return 0;
    const n = Math.min(k.fast(k.aq(m, "Ca2+"), dt, 4 / k.warmth(m, 30)), k.aq(m, "HCO3-") / 2);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Ca2+", n);
    k.takeAq(m, "HCO3-", 2 * n);
    k.addSolid(m, "CaCO3", "ppt", n);
    k.addAq(m, "H2O", n);
    k.evolveGas(m, "CO2", n, dt, { site: "bottom" });
    k.heat(m, -30, n);
    return n;
  },
};

// 2NaHCO₃ →(t) Na₂CO₃ + CO₂↑ + H₂O (doc 14, § 5 Q9): baking soda gives off gas when it is heated dry or in water.
export const bicarbonateHeat = {
  id: "bicarbonate-heat",
  info: "nahco3-heat",
  notice: 0.05,
  step(m, dt, ctx, k) {
    if (m.tempC < 80) return 0;
    let total = 0;
    for (const s of solidsOf(m, "NaHCO3")) {
      const n = k.shrink(s, dt, 20, k.warmth(m, 30));
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.addAq(m, "Na+", n);
      k.addAq(m, "CO3 2-", n / 2);
      k.addAq(m, "H2O", n / 2);
      k.evolveGas(m, "CO2", n / 2, dt, { site: "bottom" });
      k.heat(m, -65, n);
      total += n;
    }
    const aqueous = k.fast(k.aq(m, "HCO3-"), dt, 8 / k.warmth(m, 25));
    if (aqueous > k.EPS) {
      k.takeAq(m, "HCO3-", aqueous);
      k.addAq(m, "CO3 2-", aqueous / 2);
      k.addAq(m, "H2O", aqueous / 2);
      k.evolveGas(m, "CO2", aqueous / 2, dt, { site: "bottom" });
      k.heat(m, -65, aqueous);
      total += aqueous;
    }
    return total;
  },
};

export const HEATING_RULES = [copperHydroxideHeat, permanganateHeat, calciumBicarbonateHeat, bicarbonateHeat];
