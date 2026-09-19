import { consume, foamFrom, toxicWarn } from "./helpers";

// Solid carbonates in acid (doc 14, № 10): H⁺ per formula unit, sim seconds for one heap or chip, ΔH in kJ/mol.
const CARBONATES = {
  NaHCO3: { h: 1, ions: { "Na+": 1 }, seconds: 8, kj: -30 },
  CaCO3: { h: 2, ions: { "Ca2+": 1 }, seconds: 20, kj: 14.5 },
};

// A marble chip stops fizzing in sulfuric acid once calcium sulfate seals it (doc 14, § 4.8).
const sulfateCoat = (k, m, solid) => {
  const scale = k.solidMmol(m, "CaSO4") / 0.15;
  const coat = Math.min(1, scale);
  if (coat > 0.01) solid.coat = { color: "#f2f0ea", amount: coat };
  return 1 - 0.995 * coat;
};

export const carbonateAcid = {
  id: "carbonate-acid",
  info: "nahco3-hcl",
  notice: 0.05,
  step(m, dt, ctx, k) {
    if (k.aq(m, "H+") <= k.EPS) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      const recipe = CARBONATES[s.species];
      if (!recipe || s.form === "coat") continue;
      const fine = s.form === "piece" ? 1 : 3;
      const factor = s.species === "CaCO3" ? sulfateCoat(k, m, s) : 1;
      const n = consume(k, m, s, dt, recipe.seconds, fine * factor, k.aq(m, "H+") / recipe.h);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "H+", recipe.h * n);
      for (const [id, per] of Object.entries(recipe.ions)) k.addAq(m, id, per * n);
      k.addAq(m, "H2O", n);
      k.evolveGas(m, "CO2", n, dt, { site: s.form === "piece" ? "pieces" : "bottom" });
      k.heat(m, recipe.kj, n);
      total += n;
    }
    // Dissolved bicarbonate (soda solution, limewater that went clear) fizzes the moment acid reaches it.
    const aqueous = Math.min(k.aq(m, "HCO3-"), k.aq(m, "H+"));
    const n = k.fast(aqueous, dt, 0.4);
    if (n > k.EPS) {
      k.takeAq(m, "HCO3-", n);
      k.takeAq(m, "H+", n);
      k.addAq(m, "H2O", n);
      k.evolveGas(m, "CO2", n, dt, { site: "bottom" });
      k.heat(m, -12.7, n);
      total += n;
    }
    if (total > k.EPS) foamFrom(k, m, total / Math.max(dt, 1e-3));
    return total;
  },
};

// Warm ammonia solution drives the gas off and the pink fades for good (doc 14, № 2).
export const ammoniaEscape = {
  id: "ammonia-escape",
  info: "nh3-heated",
  notice: 0.3,
  step(m, dt, ctx, k, events) {
    const nh3 = k.aq(m, "NH3");
    if (nh3 <= k.EPS || m.tempC < 40) return 0;
    const tau = Math.max(1, 5 * 2 ** ((70 - m.tempC) / 10));
    const n = k.fast(nh3, dt, tau);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "NH3", n);
    k.addGas(m, "NH3g", n);
    if (n / Math.max(dt, 1e-3) > 0.05) toxicWarn(k, m, events, ctx);
    return n;
  },
};

// Cl₂ + 2OH⁻ → Cl⁻ + ClO⁻ + H₂O: how leftover chlorine is caught in alkali (doc 14, № 23 safety).
export const chlorineAlkali = {
  id: "chlorine-alkali",
  info: "cl2-naoh",
  notice: 0.05,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Cl2(aq)"), k.aq(m, "OH-") / 2), dt, 0.3);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "Cl2(aq)", n);
    k.takeAq(m, "OH-", 2 * n);
    k.addAq(m, "Cl-", n);
    k.addAq(m, "ClO-", n);
    k.addAq(m, "H2O", n);
    k.heat(m, 103, n);
    return n;
  },
};

// Gas standing over a liquid keeps dissolving into it (the water in a gas jar takes up SO₂, doc 14, № 31).
const SOLUBLE_GASES = {
  SO2: { aq: "SO2(aq)", tau: 8, cap: 1.2 },
  CO2: { aq: "CO2(aq)", tau: 40, cap: 0.034 },
  Cl2: { aq: "Cl2(aq)", tau: 25, cap: 0.09 },
};

export const gasDissolution = {
  id: "gas-dissolution",
  info: null,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS || k.aq(m, "H2O") <= k.EPS) return 0;
    let total = 0;
    for (const [id, recipe] of Object.entries(SOLUBLE_GASES)) {
      const held = m.gas[id] ?? 0;
      const room = (recipe.cap - k.conc(m, recipe.aq)) * m.volumeMl;
      if (held <= k.EPS || room <= k.EPS) continue;
      const n = k.fast(Math.min(held, room), dt, recipe.tau);
      if (n <= k.EPS) continue;
      k.addGas(m, id, -n);
      k.addAq(m, recipe.aq, n);
      total += n;
    }
    return total;
  },
};

export const GAS_RULES = [carbonateAcid, ammoniaEscape, chlorineAlkali, gasDissolution];
