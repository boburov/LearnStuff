// The catalog of pickable laboratory substances (the chest contents).
//   1. Elementlar - single elements in their true CPK colour (build molecules
//      atom-by-atom: 2 Vodorod + 1 Kislorod -> suv).
//   2. Reaktivlar - common ready-made reagents in a representative colour.
// `composition` is the element multiset poured into the vessel.

import { ELEMENTS, parseFormula } from "./molecules";

// Uzbek state per element (chest grouping only).
const ELEMENT_STATE = {
  H: "gaz",
  O: "gaz",
  N: "gaz",
  Cl: "gaz",
  C: "qattiq",
  Na: "qattiq",
  Mg: "qattiq",
  S: "qattiq",
  K: "qattiq",
  Ca: "qattiq",
  Mn: "qattiq",
  Fe: "qattiq",
  Cu: "qattiq",
  Zn: "qattiq",
};

// Element symbols offered in the chest, in display order.
const ELEMENT_SYMBOLS = [
  "H",
  "O",
  "N",
  "C",
  "Na",
  "Cl",
  "S",
  "K",
  "Ca",
  "Mg",
  "Mn",
  "Fe",
  "Cu",
  "Zn",
];

const elementSubstance = (symbol) => {
  const el = ELEMENTS[symbol];
  return {
    id: `el-${symbol}`,
    kind: "element",
    name: el.name,
    formula: symbol,
    color: el.color,
    composition: { [symbol]: 1 },
    state: ELEMENT_STATE[symbol] ?? "qattiq",
  };
};

const compound = (id, name, formula, color, state) => ({
  id: `cmp-${id}`,
  kind: "compound",
  name,
  formula,
  color,
  composition: parseFormula(formula),
  state,
});

export const ELEMENT_SUBSTANCES = ELEMENT_SYMBOLS.map(elementSubstance);

export const COMPOUND_SUBSTANCES = [
  compound("h2o", "Suv", "H2O", "#cfeefb", "suyuq"),
  compound("nacl", "Osh tuzi", "NaCl", "#eef2f8", "qattiq"),
  compound("cuso4", "Mis(II) sulfat", "CuSO4", "#1f6fd0", "suyuq"),
  compound("kmno4", "Kaliy permanganat", "KMnO4", "#6d1b7b", "suyuq"),
  compound("fecl3", "Temir(III) xlorid", "FeCl3", "#a85a23", "suyuq"),
  compound("c2h6o", "Etanol", "C2H6O", "#eaf6ff", "suyuq"),
  compound("c2h4o2", "Sirka kislotasi", "C2H4O2", "#f2f6e8", "suyuq"),
  compound("h2o2", "Vodorod peroksid", "H2O2", "#e9f6ff", "suyuq"),
  compound("nh3", "Ammiak eritmasi", "NH3", "#eef7f0", "suyuq"),
  compound("h2so4", "Sulfat kislota", "H2SO4", "#f6f1d6", "suyuq"),
  compound("dryice", "Quruq muz", "CO2", "#eaf3fb", "qattiq"),
];

// Grouped for the chest UI.
export const SUBSTANCE_GROUPS = [
  { key: "elements", label: "Elementlar", items: ELEMENT_SUBSTANCES },
  { key: "compounds", label: "Reaktivlar", items: COMPOUND_SUBSTANCES },
];

export const SUBSTANCES = [...ELEMENT_SUBSTANCES, ...COMPOUND_SUBSTANCES];
