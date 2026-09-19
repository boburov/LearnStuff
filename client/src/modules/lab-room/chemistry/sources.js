import { GAS_ML_PER_MMOL } from "./species";

// What one unit of each cabinet reagent adds to a mixture, from the catalog concentrations.
// Liquids: mmol per ml. Powders: solid per g. Solid pieces: one piece per pick with tongs. Gases: per ml.
const water = (mlPerMl) => mlPerMl * 55.49;

export const SOURCES = {
  water: { kind: "liquid", aq: { H2O: water(1) } },
  // 10% w/w, density 1.048
  hcl: { kind: "liquid", aq: { "H+": 2.874, "Cl-": 2.874, H2O: 52.34 } },
  // 96% w/w, density 1.835
  h2so4: { kind: "liquid", aq: { "H+": 35.92, "SO4 2-": 17.96, H2O: 4.07 } },
  // 65% w/w, density 1.391
  hno3: { kind: "liquid", aq: { "H+": 14.35, "NO3-": 14.35, H2O: 27.03 } },
  // 10% w/w, density 1.109
  naoh: { kind: "liquid", aq: { "Na+": 2.773, "OH-": 2.773, H2O: 55.4 } },
  // 10% w/w NH3, density 0.958
  nh3: { kind: "liquid", aq: { NH3: 5.625, H2O: 47.85 } },
  // saturated Ca(OH)2, 1.6 g/L
  limewater: { kind: "liquid", aq: { "Ca2+": 0.0216, "OH-": 0.0432, H2O: water(1) } },
  // 30% w/w, density 1.11
  h2o2: { kind: "liquid", aq: { H2O2: 9.79, H2O: 43.1 } },
  // 96% v/v, density 0.807
  ethanol: { kind: "liquid", aq: { C2H5OH: 16.43, H2O: 2.78 } },
  glycerin: { kind: "liquid", aq: { C3H8O3: 13.6, H2O: 0.5 } },
  // 1% in ~70% ethanol, density 0.85
  phenolphthalein: { kind: "liquid", aq: { Phenolphthalein: 0.0267, C2H5OH: 13.0, H2O: 13.3 } },
  cuso4: { kind: "liquid", aq: { "Cu2+": 0.5, "SO4 2-": 0.5, H2O: 54.2 } },
  agno3: { kind: "liquid", aq: { "Ag+": 0.1, "NO3-": 0.1, H2O: 55.2 } },
  fecl3: { kind: "liquid", aq: { "Fe3+": 0.5, "Cl-": 1.5, H2O: 53.0 } },
  ki: { kind: "liquid", aq: { "K+": 0.5, "I-": 0.5, H2O: 54.2 } },

  nahco3: { kind: "powder", species: "NaHCO3" },
  mno2: { kind: "powder", species: "MnO2" },
  kmno4: { kind: "powder", species: "KMnO4" },
  sulfur: { kind: "powder", species: "S" },
  "iron-filings": { kind: "powder", species: "Fe" },
  sugar: { kind: "powder", species: "SucroseCrystals" },

  // One piece picked with tongs: rice-grain sodium, 3 cm ribbon, one granule, 3 cm wire, one chip.
  sodium: { kind: "piece", species: "Na", pieceG: 0.1, form: "chunk" },
  magnesium: { kind: "piece", species: "Mg", pieceG: 0.03, form: "ribbon" },
  zinc: { kind: "piece", species: "Zn", pieceG: 1.0, form: "granule" },
  copper: { kind: "piece", species: "Cu", pieceG: 0.21, form: "wire" },
  marble: { kind: "piece", species: "CaCO3", pieceG: 1.0, form: "chip" },

  oxygen: { kind: "gas", species: "O2" },
  hydrogen: { kind: "gas", species: "H2" },
  co2: { kind: "gas", species: "CO2" },
  chlorine: { kind: "gas", species: "Cl2" },
};

export const SPATULA_G = 1;

export const gasMmol = (ml) => ml / GAS_ML_PER_MMOL;
