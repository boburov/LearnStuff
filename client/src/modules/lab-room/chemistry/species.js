// Every chemical species the lab simulates. Amounts are always mmol.
// phase: liq = bulk liquid (carries volume), aq = dissolved, s = solid, g = gas.
// tint.k: absorbance per mol/L (alpha = 1 - exp(-k·c)); bedMl: settled visual volume per mmol;
// scatter: turbidity per mmol/ml while suspended; settleS: time to settle; gas.k: colour strength per mole fraction.

export const ROOM_C = 22;

export const SPECIES = {
  // Bulk liquids
  H2O: { formula: "H₂O", name: "suv", phase: "liq", mw: 18.02, density: 1, cp: 4.18, bp: 100 },
  C2H5OH: { formula: "C₂H₅OH", name: "etanol", phase: "liq", mw: 46.07, density: 0.789, cp: 2.44, bp: 78, flammable: true },
  C3H8O3: { formula: "C₃H₅(OH)₃", name: "glitserin", phase: "liq", mw: 92.09, density: 1.261, cp: 2.43, bp: 290 },

  // Ions and dissolved molecules
  "H+": { formula: "H⁺", name: "vodorod ioni", phase: "aq", mw: 1.01 },
  "OH-": { formula: "OH⁻", name: "gidroksid ioni", phase: "aq", mw: 17.01 },
  "Na+": { formula: "Na⁺", name: "natriy ioni", phase: "aq", mw: 22.99 },
  "K+": { formula: "K⁺", name: "kaliy ioni", phase: "aq", mw: 39.1 },
  "Ca2+": { formula: "Ca²⁺", name: "kalsiy ioni", phase: "aq", mw: 40.08 },
  "Mg2+": { formula: "Mg²⁺", name: "magniy ioni", phase: "aq", mw: 24.31 },
  "Zn2+": { formula: "Zn²⁺", name: "rux ioni", phase: "aq", mw: 65.38 },
  "Cu2+": { formula: "Cu²⁺", name: "mis(II) ioni", phase: "aq", mw: 63.55, tint: { color: "#1f6fd1", k: 1.4 } },
  "Fe3+": { formula: "Fe³⁺", name: "temir(III) ioni", phase: "aq", mw: 55.85, tint: { color: "#b0620f", k: 1.6 } },
  "Fe2+": { formula: "Fe²⁺", name: "temir(II) ioni", phase: "aq", mw: 55.85, tint: { color: "#9fd29a", k: 0.35 } },
  "Ag+": { formula: "Ag⁺", name: "kumush ioni", phase: "aq", mw: 107.87 },
  "Mn2+": { formula: "Mn²⁺", name: "marganes(II) ioni", phase: "aq", mw: 54.94, tint: { color: "#f3d6dc", k: 0.05 } },
  "NH4+": { formula: "NH₄⁺", name: "ammoniy ioni", phase: "aq", mw: 18.04 },
  "Cl-": { formula: "Cl⁻", name: "xlorid ioni", phase: "aq", mw: 35.45 },
  "SO4 2-": { formula: "SO₄²⁻", name: "sulfat ioni", phase: "aq", mw: 96.06 },
  "NO3-": { formula: "NO₃⁻", name: "nitrat ioni", phase: "aq", mw: 62.0 },
  "I-": { formula: "I⁻", name: "yodid ioni", phase: "aq", mw: 126.9 },
  "IO3-": { formula: "IO₃⁻", name: "yodat ioni", phase: "aq", mw: 174.9 },
  "ClO-": { formula: "ClO⁻", name: "gipoxlorit ioni", phase: "aq", mw: 51.45 },
  "HCO3-": { formula: "HCO₃⁻", name: "gidrokarbonat ioni", phase: "aq", mw: 61.02 },
  "CO3 2-": { formula: "CO₃²⁻", name: "karbonat ioni", phase: "aq", mw: 60.01 },
  "MnO4-": { formula: "MnO₄⁻", name: "permanganat ioni", phase: "aq", mw: 118.94, tint: { color: "#6a0dad", k: 2200 } },
  "Cu(NH3)4 2+": { formula: "[Cu(NH₃)₄]²⁺", name: "mis ammiakati", phase: "aq", mw: 131.7, tint: { color: "#2a2f9e", k: 9 } },
  CuGlycerate: { formula: "[Cu(C₃H₇O₃)₂]", name: "mis(II) glitserati", phase: "aq", mw: 245.7, tint: { color: "#2346c8", k: 10 } },
  I2: { formula: "I₂", name: "yod", phase: "aq", mw: 253.8, tint: { color: "#6b3410", k: 60 } },
  NH3: { formula: "NH₃", name: "ammiak", phase: "aq", mw: 17.03 },
  H2O2: { formula: "H₂O₂", name: "vodorod peroksid", phase: "aq", mw: 34.01 },
  "CO2(aq)": { formula: "CO₂", name: "erigan uglerod(IV) oksid", phase: "aq", mw: 44.01 },
  "SO2(aq)": { formula: "SO₂", name: "erigan oltingugurt(IV) oksid", phase: "aq", mw: 64.07 },
  "Cl2(aq)": { formula: "Cl₂", name: "erigan xlor", phase: "aq", mw: 70.9, tint: { color: "#d8e070", k: 2.5 } },
  Sucrose: { formula: "C₁₂H₂₂O₁₁", name: "shakar", phase: "aq", mw: 342.3 },
  // Pink only above pH 8.2; the colour itself comes from appearance.js.
  Phenolphthalein: { formula: "C₂₀H₁₄O₄", name: "fenolftalein", phase: "aq", mw: 318.3, indicator: { color: "#e0218a", k: 30000, pH: 8.2 } },

  // Solids
  AgCl: { formula: "AgCl", name: "kumush xlorid", phase: "s", mw: 143.32, color: "#f5f5f0", bedMl: 0.25, scatter: 60, settleS: 10 },
  AgI: { formula: "AgI", name: "kumush yodid", phase: "s", mw: 234.77, color: "#f0dc82", bedMl: 0.15, scatter: 55, settleS: 15 },
  Ag2O: { formula: "Ag₂O", name: "kumush(I) oksid", phase: "s", mw: 231.74, color: "#5a4632", bedMl: 0.12, scatter: 45, settleS: 12 },
  Ag: { formula: "Ag", name: "kumush", phase: "s", mw: 107.87, color: "#d9d9d9", metallic: 1 },
  "Cu(OH)2": { formula: "Cu(OH)₂", name: "mis(II) gidroksid", phase: "s", mw: 97.56, color: "#6fb4e8", bedMl: 0.6, scatter: 40, settleS: 12 },
  CuBasicSulfate: { formula: "(CuOH)₂SO₄", name: "asosli mis sulfat", phase: "s", mw: 257.2, color: "#8cc6d9", bedMl: 0.5, scatter: 45, settleS: 12 },
  CuO: { formula: "CuO", name: "mis(II) oksid", phase: "s", mw: 79.55, color: "#1a1a1a", bedMl: 0.08, scatter: 50, settleS: 8 },
  Cu: { formula: "Cu", name: "mis", phase: "s", mw: 63.55, color: "#b8703f", metallic: 1 },
  CuI: { formula: "CuI", name: "mis(I) yodid", phase: "s", mw: 190.45, color: "#e8d8b8", bedMl: 0.2, scatter: 50, settleS: 15 },
  "Fe(OH)3": { formula: "Fe(OH)₃", name: "temir(III) gidroksid", phase: "s", mw: 106.87, color: "#8a3b12", bedMl: 0.7, scatter: 40, settleS: 14 },
  Fe: { formula: "Fe", name: "temir", phase: "s", mw: 55.85, color: "#4a4a4c", metallic: 0.8 },
  FeS: { formula: "FeS", name: "temir(II) sulfid", phase: "s", mw: 87.91, color: "#2b2b2b" },
  CaCO3: { formula: "CaCO₃", name: "kalsiy karbonat", phase: "s", mw: 100.09, color: "#f4f4f4", bedMl: 0.08, scatter: 90, settleS: 25 },
  CaSO4: { formula: "CaSO₄", name: "kalsiy sulfat", phase: "s", mw: 136.14, color: "#f2f0ea", bedMl: 0.08, scatter: 40, settleS: 20 },
  MnO2: { formula: "MnO₂", name: "marganes(IV) oksid", phase: "s", mw: 86.94, color: "#1d1b1a", bedMl: 0.05, scatter: 70, settleS: 20 },
  KMnO4: { formula: "KMnO₄", name: "kaliy permanganat", phase: "s", mw: 158.03, color: "#2a0f35", oxidizer: true },
  PermanganateResidue: { formula: "K₂MnO₄ + MnO₂", name: "qoramtir qoldiq", phase: "s", mw: 197.13, color: "#1f2418" },
  NaHCO3: { formula: "NaHCO₃", name: "natriy gidrokarbonat", phase: "s", mw: 84.01, color: "#f2f2ef" },
  S: { formula: "S", name: "oltingugurt", phase: "s", mw: 32.06, color: "#e8d23a", floats: true },
  SucroseCrystals: { formula: "C₁₂H₂₂O₁₁", name: "shakar", phase: "s", mw: 342.3, color: "#f7f6f2" },
  Na: { formula: "Na", name: "natriy", phase: "s", mw: 22.99, color: "#d9dde2", metallic: 0.9 },
  Mg: { formula: "Mg", name: "magniy", phase: "s", mw: 24.31, color: "#c8cacd", metallic: 0.9 },
  MgO: { formula: "MgO", name: "magniy oksid", phase: "s", mw: 40.3, color: "#f2f2f2", bedMl: 0.05, scatter: 30, settleS: 10 },
  Zn: { formula: "Zn", name: "rux", phase: "s", mw: 65.38, color: "#9a9ea3", metallic: 0.8 },
  ZnSO4: { formula: "ZnSO₄", name: "rux sulfat", phase: "s", mw: 161.47, color: "#f0f0f0", bedMl: 0.05, scatter: 20, settleS: 8 },
  C: { formula: "C", name: "ko'mir", phase: "s", mw: 12.01, color: "#111111", bedMl: 0.1, scatter: 80, settleS: 30 },
  NaCl: { formula: "NaCl", name: "natriy xlorid", phase: "s", mw: 58.44, color: "#f5f5f5" },
  Ash: { formula: "", name: "qoramtir kul", phase: "s", mw: 150, color: "#3b2a1f" },

  // Gases (density relative to air decides how fast they leave an open container)
  H2: { formula: "H₂", name: "vodorod", phase: "g", mw: 2.02, rel: 0.07, flammable: true },
  O2: { formula: "O₂", name: "kislorod", phase: "g", mw: 32.0, rel: 1.1, oxidizer: true },
  CO2: { formula: "CO₂", name: "uglerod(IV) oksid", phase: "g", mw: 44.01, rel: 1.52, extinguishes: true },
  Cl2: { formula: "Cl₂", name: "xlor", phase: "g", mw: 70.9, rel: 2.45, toxic: true, gas: { color: "#c9d94a", k: 1.6 } },
  NO2: { formula: "NO₂", name: "azot(IV) oksid", phase: "g", mw: 46.01, rel: 1.59, toxic: true, gas: { color: "#a0461e", k: 4 } },
  NO: { formula: "NO", name: "azot(II) oksid", phase: "g", mw: 30.01, rel: 1.04, toxic: true },
  SO2: { formula: "SO₂", name: "oltingugurt(IV) oksid", phase: "g", mw: 64.07, rel: 2.21, toxic: true },
  NH3g: { formula: "NH₃", name: "ammiak", phase: "g", mw: 17.03, rel: 0.59, toxic: true },
  H2S: { formula: "H₂S", name: "vodorod sulfid", phase: "g", mw: 34.08, rel: 1.18, toxic: true },

  // Added for the reaction rules (doc 14 § 3-5).
  PhenolphthaleinFaded: { formula: "C₂₀H₁₄O₄", name: "fenolftalein (rangsiz shakl)", phase: "aq", mw: 318.3 },
  "Ag(NH3)2+": { formula: "[Ag(NH₃)₂]⁺", name: "kumush ammiakati", phase: "aq", mw: 141.9 },
  "Zn(OH)4 2-": { formula: "[Zn(OH)₄]²⁻", name: "tetragidroksosinkat ioni", phase: "aq", mw: 133.4 },
  "C2H5O-": { formula: "C₂H₅O⁻", name: "etilat ioni", phase: "aq", mw: 45.06 },
  "Mg(OH)2": { formula: "Mg(OH)₂", name: "magniy gidroksid", phase: "s", mw: 58.32, color: "#f4f7f7", bedMl: 0.25, scatter: 50, settleS: 20 },
  "Zn(OH)2": { formula: "Zn(OH)₂", name: "rux gidroksid", phase: "s", mw: 99.42, color: "#f2f4f2", bedMl: 0.3, scatter: 45, settleS: 15 },
  CuCarbonateBasic: { formula: "(CuOH)₂CO₃", name: "asosli mis karbonat", phase: "s", mw: 221.12, color: "#4fa48e", bedMl: 0.4, scatter: 45, settleS: 14 },
  CuS: { formula: "CuS", name: "mis(II) sulfid", phase: "s", mw: 95.61, color: "#141414", bedMl: 0.1, scatter: 70, settleS: 18 },
  CuSO4Anhydrous: { formula: "CuSO₄", name: "suvsiz mis sulfat", phase: "s", mw: 159.6, color: "#d9d9d9", bedMl: 0.12, scatter: 40, settleS: 10 },
  SMolten: { formula: "S", name: "erigan oltingugurt", phase: "s", mw: 32.06, color: "#c9a227" },
  SDark: { formula: "S", name: "qizigan oltingugurt", phase: "s", mw: 32.06, color: "#7a3a12" },
  "Fe2(SO4)3": { formula: "Fe₂(SO₄)₃", name: "temir(III) sulfat", phase: "s", mw: 399.88, color: "#eee4c0", bedMl: 0.15, scatter: 45, settleS: 12 },
};

export const species = (id) => {
  const entry = SPECIES[id];
  if (!entry) throw new Error(`Unknown species: ${id}`);
  return entry;
};

// ml of gas per mmol at lab temperature and pressure.
export const GAS_ML_PER_MMOL = 24.0;
