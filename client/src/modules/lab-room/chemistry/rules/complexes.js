// Ammonia first knocks the copper down as a basic salt (doc 14, № 9): little ammonia, pale blue turbidity.
export const copperAmmoniaPrecipitate = {
  id: "copper-ammonia-precipitate",
  info: "cuso4-nh3",
  notice: 0.01,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "Cu2+"), k.aq(m, "NH3")), dt, 0.3);
    if (n <= k.EPS) return 0;
    const sulfate = k.aq(m, "SO4 2-") >= n / 2;
    k.takeAq(m, "Cu2+", n);
    k.takeAq(m, "NH3", n);
    k.addAq(m, "NH4+", n);
    if (sulfate) {
      k.takeAq(m, "SO4 2-", n / 2);
      k.addSolid(m, "CuBasicSulfate", "ppt", n / 2);
    } else {
      k.addSolid(m, "Cu(OH)2", "ppt", n);
    }
    return n;
  },
};

// Excess ammonia takes it all back into solution as the ink-blue tetrammine (doc 14, № 9).
export const copperAmmoniaComplex = {
  id: "copper-ammonia-complex",
  info: "cuso4-nh3-excess",
  notice: 0.01,
  step(m, dt, ctx, k) {
    if (k.aq(m, "NH3") <= k.EPS) return 0;
    let total = 0;
    const direct = k.fast(Math.min(k.aq(m, "Cu2+"), k.aq(m, "NH3") / 4), dt, 0.5);
    if (direct > k.EPS) {
      k.takeAq(m, "Cu2+", direct);
      k.takeAq(m, "NH3", 4 * direct);
      k.addAq(m, "Cu(NH3)4 2+", direct);
      total += direct;
    }
    for (const s of [...m.solids]) {
      const perFormula = s.species === "CuBasicSulfate" ? 2 : s.species === "Cu(OH)2" ? 1 : 0;
      if (!perFormula || s.form === "coat") continue;
      const n = k.fast(Math.min(s.mmol, k.aq(m, "NH3") / (4 * perFormula)), dt, 1);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "NH3", 4 * perFormula * n);
      k.addAq(m, "Cu(NH3)4 2+", perFormula * n);
      k.addAq(m, "OH-", 2 * n);
      if (s.species === "CuBasicSulfate") k.addAq(m, "SO4 2-", n);
      total += perFormula * n;
    }
    // Only announce once the blue solution has really won over the precipitate (doc 14, № 9).
    const solidCopper = 2 * k.solidMmol(m, "CuBasicSulfate") + k.solidMmol(m, "Cu(OH)2");
    return k.aq(m, "Cu(NH3)4 2+") > solidCopper ? total : 0;
  },
};

// AgCl + 2NH₃ ⇌ [Ag(NH₃)₂]⁺ + Cl⁻ (doc 14, § 5 Q9): the equilibrium runs both ways, so acid brings the curd back.
const AGCL_K = 2.9e-3;

export const silverAmmonia = {
  id: "silver-ammonia",
  info: "agcl-nh3",
  notice: 0.005,
  step(m, dt, ctx, k) {
    if (m.volumeMl <= k.EPS) return 0;
    let total = 0;
    const free = k.fast(Math.min(k.aq(m, "Ag+"), k.aq(m, "NH3") / 2), dt, 0.3);
    if (free > k.EPS) {
      k.takeAq(m, "Ag+", free);
      k.takeAq(m, "NH3", 2 * free);
      k.addAq(m, "Ag(NH3)2+", free);
      total += free;
    }
    for (const s of [...m.solids]) {
      if (s.species !== "Ag2O" || k.aq(m, "NH3") <= k.EPS) continue;
      const n = k.fast(Math.min(s.mmol, k.aq(m, "NH3") / 2), dt, 2);
      if (n <= k.EPS) continue;
      k.takeSolid(m, s, n);
      k.takeAq(m, "NH3", 2 * n);
      k.addAq(m, "Ag(NH3)2+", n);
      k.addAq(m, "OH-", n);
      total += n;
    }
    const solid = k.findSolid(m, "AgCl", "ppt");
    const complex = k.aq(m, "Ag(NH3)2+");
    const nh3 = k.conc(m, "NH3");
    const q = nh3 > 1e-6 ? (k.conc(m, "Ag(NH3)2+") * k.conc(m, "Cl-")) / (nh3 * nh3) : Infinity;
    if (solid && q < AGCL_K) {
      const drive = Math.min(1, 1 - q / AGCL_K);
      const n = k.fast(Math.min(solid.mmol, k.aq(m, "NH3") / 2), dt, 1.5) * drive;
      if (n > k.EPS) {
        k.takeSolid(m, solid, n);
        k.takeAq(m, "NH3", 2 * n);
        k.addAq(m, "Ag(NH3)2+", n);
        k.addAq(m, "Cl-", n);
        total += n;
      }
    } else if (complex > k.EPS && q > AGCL_K && k.aq(m, "Cl-") > k.EPS) {
      const n = k.fast(Math.min(complex, k.aq(m, "Cl-")), dt, 1);
      if (n > k.EPS) {
        k.takeAq(m, "Ag(NH3)2+", n);
        k.takeAq(m, "Cl-", n);
        k.addAq(m, "NH3", 2 * n);
        k.addSolid(m, "AgCl", "ppt", n);
        total += n;
      }
    }
    return total;
  },
};

// Acid strips the ammonia off a complex: the deep blue fades back to pale blue, silver falls out again.
const COMPLEX_ACID = { "Cu(NH3)4 2+": { nh3: 4, ion: "Cu2+" }, "Ag(NH3)2+": { nh3: 2, ion: "Ag+" } };

export const complexAcid = {
  id: "complex-acid",
  info: null,
  step(m, dt, ctx, k) {
    if (k.aq(m, "H+") <= k.EPS) return 0;
    let total = 0;
    for (const [id, recipe] of Object.entries(COMPLEX_ACID)) {
      const n = k.fast(Math.min(k.aq(m, id), k.aq(m, "H+") / recipe.nh3), dt, 0.4);
      if (n <= k.EPS) continue;
      k.takeAq(m, id, n);
      k.takeAq(m, "H+", recipe.nh3 * n);
      k.addAq(m, recipe.ion, n);
      k.addAq(m, "NH4+", recipe.nh3 * n);
      k.heat(m, 52.2 * recipe.nh3, n);
      total += n;
    }
    return total;
  },
};

// Cu(OH)₂ + 2 polyol → deep blue copper glycerate (doc 14, № 26); ethanol has only one OH and cannot do it.
export const copperGlycerate = {
  id: "copper-glycerate",
  info: "glycerol-cuoh2",
  notice: 0.005,
  step(m, dt, ctx, k) {
    const polyol = k.aq(m, "C3H8O3") + k.aq(m, "Sucrose");
    if (polyol <= k.EPS || k.conc(m, "OH-") < 0.01) return 0;
    let total = 0;
    for (const s of [...m.solids]) {
      const perFormula = s.species === "CuBasicSulfate" ? 2 : s.species === "Cu(OH)2" ? 1 : 0;
      if (!perFormula || s.form === "coat") continue;
      const n = k.fast(Math.min(s.mmol, polyol / (2 * perFormula)), dt, 1);
      if (n <= k.EPS) continue;
      const glycerol = Math.min(k.aq(m, "C3H8O3"), 2 * perFormula * n);
      k.takeSolid(m, s, n);
      k.takeAq(m, "C3H8O3", glycerol);
      k.takeAq(m, "Sucrose", 2 * perFormula * n - glycerol);
      k.addAq(m, "CuGlycerate", perFormula * n);
      k.addAq(m, "H2O", 2 * perFormula * n);
      if (s.species === "CuBasicSulfate") k.addAq(m, "SO4 2-", n);
      total += perFormula * n;
    }
    return total;
  },
};

// Acid breaks the glycerate up again: the blue collapses back to the pale copper(II) colour.
export const glycerateAcid = {
  id: "glycerate-acid",
  info: null,
  step(m, dt, ctx, k) {
    const n = k.fast(Math.min(k.aq(m, "CuGlycerate"), k.aq(m, "H+") / 2), dt, 0.4);
    if (n <= k.EPS) return 0;
    k.takeAq(m, "CuGlycerate", n);
    k.takeAq(m, "H+", 2 * n);
    k.addAq(m, "Cu2+", n);
    k.addAq(m, "C3H8O3", 2 * n);
    return n;
  },
};

export const COMPLEX_RULES = [
  copperAmmoniaPrecipitate,
  copperAmmoniaComplex,
  silverAmmonia,
  complexAcid,
  copperGlycerate,
  glycerateAcid,
];
