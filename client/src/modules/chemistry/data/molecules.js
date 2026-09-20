// Molecule datasets + chemistry helpers for the 3D viewer and the lab bench.
// Coordinates are in Ångström-like units; bonds are [i, j, order].
// Colors follow the Jmol/CPK scheme. Formulas stay ASCII so parseFormula works;
// pretty subscripts are rendered by <FormulaText>. UI text in Uzbek.

// Per-element render data, keyed by chemical symbol.
const EL = {
  H: { color: "#eef2f7", radius: 0.3, name: "Vodorod" },
  C: { color: "#3b3f46", radius: 0.42, name: "Uglerod" },
  N: { color: "#3050f8", radius: 0.4, name: "Azot" },
  O: { color: "#ef4444", radius: 0.4, name: "Kislorod" },
  S: { color: "#e0c000", radius: 0.5, name: "Oltingugurt" },
  Cl: { color: "#1fd01f", radius: 0.48, name: "Xlor" },
  Na: { color: "#ab5cf2", radius: 0.55, name: "Natriy" },
  K: { color: "#8f40d4", radius: 0.62, name: "Kaliy" },
  Ca: { color: "#3dff00", radius: 0.58, name: "Kalsiy" },
  Mg: { color: "#8aff00", radius: 0.5, name: "Magniy" },
  Mn: { color: "#9c7ac7", radius: 0.5, name: "Marganets" },
  Fe: { color: "#e06633", radius: 0.5, name: "Temir" },
  Cu: { color: "#c88033", radius: 0.5, name: "Mis" },
  Zn: { color: "#7d80b0", radius: 0.5, name: "Rux" },
  P: { color: "#ff8000", radius: 0.47, name: "Fosfor" },
  Br: { color: "#a62929", radius: 0.5, name: "Brom" },
  I: { color: "#940094", radius: 0.55, name: "Yod" },
  B: { color: "#ffb5b5", radius: 0.42, name: "Bor" },
  F: { color: "#90e050", radius: 0.34, name: "Ftor" },
  Si: { color: "#f0c8a0", radius: 0.5, name: "Kremniy" },
  Co: { color: "#f090a0", radius: 0.5, name: "Kobalt" },
};

export const ELEMENTS = EL;

export const getElementMeta = (symbol) =>
  EL[symbol] ?? { color: "#ff1493", radius: 0.45, name: symbol };

// Curated dataset. Where available, atom coordinates come from PubChem 3D
// conformers; the rest are built from standard geometries.
export const MOLECULES = [
  {
    id: "water",
    name: "Suv",
    formula: "H2O",
    weight: 18.02,
    category: "Anorganik",
    state: "suyuq",
    about:
      "Eng muhim birikma. Bir kislorod va ikki vodoroddan iborat, burchakli (104.5°) shaklga ega.",
    atoms: [
      { el: "O", pos: [-0.2947, -0.2182, 0.1542] },
      { el: "H", pos: [-0.0173, 0.6747, 0.4086] },
      { el: "H", pos: [0.3121, -0.4565, -0.5627] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
    ],
  },
  {
    id: "co2",
    name: "Karbonat angidrid",
    formula: "CO2",
    weight: 44.01,
    category: "Gazlar",
    state: "gaz",
    about: "Chiziqli molekula. Markazda uglerod, ikki tomonida ikki kislorod.",
    atoms: [
      { el: "C", pos: [0, 0, 0] },
      { el: "O", pos: [1.197, 0, 0] },
      { el: "O", pos: [-1.197, 0, 0] },
    ],
    bonds: [
      [0, 1, 2],
      [0, 2, 2],
    ],
  },
  {
    id: "methane",
    name: "Metan",
    formula: "CH4",
    weight: 16.04,
    category: "Uglevodorod",
    state: "gaz",
    about:
      "Tabiiy gazning asosiy qismi. Uglerod atrofida to'rt vodorod tetraedr shaklida.",
    atoms: [
      { el: "C", pos: [0, 0, 0] },
      { el: "H", pos: [0.5541, 0.7996, 0.4965] },
      { el: "H", pos: [0.6833, -0.8134, -0.2536] },
      { el: "H", pos: [-0.7782, -0.3735, 0.6692] },
      { el: "H", pos: [-0.4593, 0.3874, -0.9121] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [0, 4, 1],
    ],
  },
  {
    id: "ammonia",
    name: "Ammiak",
    formula: "NH3",
    weight: 17.03,
    category: "Gazlar",
    state: "gaz",
    about: "Azot va uch vodoroddan iborat piramidasimon, o'tkir hidli gaz.",
    atoms: [
      { el: "N", pos: [-0.1929, -0.0275, -0.2223] },
      { el: "H", pos: [-0.6345, 0.2631, 0.6488] },
      { el: "H", pos: [0.5328, 0.6621, -0.413] },
      { el: "H", pos: [0.2946, -0.8976, -0.0134] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
    ],
  },
  {
    id: "hydrogen",
    name: "Vodorod",
    formula: "H2",
    weight: 2.02,
    category: "Gazlar",
    state: "gaz",
    about: "Eng yengil gaz. Ikki vodorod atomi bitta bog' bilan bog'langan.",
    atoms: [
      { el: "H", pos: [-0.37, 0, 0] },
      { el: "H", pos: [0.37, 0, 0] },
    ],
    bonds: [[0, 1, 1]],
  },
  {
    id: "oxygen",
    name: "Kislorod",
    formula: "O2",
    weight: 32.0,
    category: "Gazlar",
    state: "gaz",
    about: "Nafas olish uchun zarur gaz. Ikki kislorod qo'sh bog' bilan bog'langan.",
    atoms: [
      { el: "O", pos: [-0.6, 0, 0] },
      { el: "O", pos: [0.6, 0, 0] },
    ],
    bonds: [[0, 1, 2]],
  },
  {
    id: "nitrogen",
    name: "Azot",
    formula: "N2",
    weight: 28.01,
    category: "Gazlar",
    state: "gaz",
    about:
      "Atmosferaning 78% qismi. Uch bog' bilan bog'langan juda barqaror molekula.",
    atoms: [
      { el: "N", pos: [-0.55, 0, 0] },
      { el: "N", pos: [0.55, 0, 0] },
    ],
    bonds: [[0, 1, 3]],
  },
  {
    id: "hcl",
    name: "Vodorod xlorid",
    formula: "HCl",
    weight: 36.46,
    category: "Kislota",
    state: "gaz",
    about: "Suvda eriganda xlorid kislota hosil qiladi. O'tkir hidli gaz.",
    atoms: [
      { el: "Cl", pos: [-0.3029, 0.1027, 0.5692] },
      { el: "H", pos: [0.3029, -0.1026, -0.5692] },
    ],
    bonds: [[0, 1, 1]],
  },
  {
    id: "nacl",
    name: "Osh tuzi",
    formula: "NaCl",
    weight: 58.44,
    category: "Tuz",
    state: "qattiq",
    about: "Natriy va xlordan iborat ionli birikma. Kundalik osh tuzi.",
    atoms: [
      { el: "Na", pos: [-1.18, 0, 0] },
      { el: "Cl", pos: [1.0, 0, 0] },
    ],
    bonds: [[0, 1, 1]],
  },
  {
    id: "h2o2",
    name: "Vodorod peroksid",
    formula: "H2O2",
    weight: 34.01,
    category: "Anorganik",
    state: "suyuq",
    about:
      "Oksidlovchi va dezinfeksiyalovchi suyuqlik. Ikki kislorod O–O bog'i bilan.",
    atoms: [
      { el: "O", pos: [-0.73, 0.0, 0.05] },
      { el: "O", pos: [0.73, 0.0, 0.05] },
      { el: "H", pos: [-1.0, 0.78, -0.45] },
      { el: "H", pos: [1.0, -0.78, -0.45] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 2, 1],
      [1, 3, 1],
    ],
  },
  {
    id: "ozone",
    name: "Ozon",
    formula: "O3",
    weight: 48.0,
    category: "Gazlar",
    state: "gaz",
    about:
      "Uch kisloroddan iborat. Atmosferada ultrabinafsha nurlardan himoya qiladi.",
    atoms: [
      { el: "O", pos: [0, 0, 0] },
      { el: "O", pos: [1.108, 0.64, 0] },
      { el: "O", pos: [-1.108, 0.64, 0] },
    ],
    bonds: [
      [0, 1, 2],
      [0, 2, 1],
    ],
  },
  {
    id: "so2",
    name: "Oltingugurt dioksid",
    formula: "SO2",
    weight: 64.07,
    category: "Gazlar",
    state: "gaz",
    about:
      "O'tkir hidli gaz. Oltingugurt yonganda hosil bo'ladi, burchakli shakl.",
    atoms: [
      { el: "S", pos: [0, 0, 0] },
      { el: "O", pos: [1.25, 0.7, 0] },
      { el: "O", pos: [-1.25, 0.7, 0] },
    ],
    bonds: [
      [0, 1, 2],
      [0, 2, 2],
    ],
  },
  {
    id: "co",
    name: "Uglerod oksid",
    formula: "CO",
    weight: 28.01,
    category: "Gazlar",
    state: "gaz",
    about: "Rangsiz, hidsiz, zaharli gaz. To'liq yonmaslikdan hosil bo'ladi.",
    atoms: [
      { el: "C", pos: [-0.56, 0, 0] },
      { el: "O", pos: [0.56, 0, 0] },
    ],
    bonds: [[0, 1, 3]],
  },
  {
    id: "ethanol",
    name: "Etanol",
    formula: "C2H6O",
    weight: 46.07,
    category: "Spirt",
    state: "suyuq",
    about: "Oddiy spirt. Ikki uglerodli zanjir va gidroksil (–OH) guruhi.",
    atoms: [
      { el: "O", pos: [-1.5367, 0.3114, -0.0886] },
      { el: "C", pos: [-0.4118, -0.5548, -0.0886] },
      { el: "C", pos: [0.852, 0.2785, -0.0886] },
      { el: "H", pos: [-0.4613, -1.2003, 0.7933] },
      { el: "H", pos: [-0.4607, -1.1821, -0.9832] },
      { el: "H", pos: [1.7395, -0.3603, -0.1063] },
      { el: "H", pos: [0.8771, 0.9424, -0.959] },
      { el: "H", pos: [0.8961, 0.9169, 0.8] },
      { el: "H", pos: [-1.4946, 0.8481, 0.7213] },
    ],
    bonds: [
      [0, 1, 1],
      [0, 8, 1],
      [1, 2, 1],
      [1, 3, 1],
      [1, 4, 1],
      [2, 5, 1],
      [2, 6, 1],
      [2, 7, 1],
    ],
  },
  {
    id: "acetic-acid",
    name: "Sirka kislotasi",
    formula: "C2H4O2",
    weight: 60.05,
    category: "Kislota",
    state: "suyuq",
    about: "Sirkaning asosi. Karboksil (–COOH) guruhiga ega kuchsiz kislota.",
    atoms: [
      { el: "C", pos: [-1.25, 0.2, 0] },
      { el: "C", pos: [0.0, -0.45, 0] },
      { el: "O", pos: [0.1, -1.66, 0] },
      { el: "O", pos: [1.05, 0.4, 0] },
      { el: "H", pos: [1.9, -0.05, 0] },
      { el: "H", pos: [-1.15, 1.3, 0] },
      { el: "H", pos: [-1.8, -0.1, 0.88] },
      { el: "H", pos: [-1.8, -0.1, -0.88] },
    ],
    bonds: [
      [0, 1, 1],
      [1, 2, 2],
      [1, 3, 1],
      [3, 4, 1],
      [0, 5, 1],
      [0, 6, 1],
      [0, 7, 1],
    ],
  },
  {
    id: "benzene",
    name: "Benzol",
    formula: "C6H6",
    weight: 78.11,
    category: "Aromatik",
    state: "suyuq",
    about:
      "Aromatik halqa. Olti uglerod almashinuvchi qo'sh bog'lar bilan halqa hosil qiladi.",
    atoms: [
      { el: "C", pos: [-1.2131, -0.6884, 0] },
      { el: "C", pos: [-1.2028, 0.7064, 0.0001] },
      { el: "C", pos: [-0.0103, -1.3948, 0] },
      { el: "C", pos: [0.0104, 1.3948, -0.0001] },
      { el: "C", pos: [1.2028, -0.7063, 0] },
      { el: "C", pos: [1.2131, 0.6884, 0] },
      { el: "H", pos: [-2.1577, -1.2244, 0] },
      { el: "H", pos: [-2.1393, 1.2564, 0.0001] },
      { el: "H", pos: [-0.0184, -2.4809, -0.0001] },
      { el: "H", pos: [0.0184, 2.4808, 0] },
      { el: "H", pos: [2.1394, -1.2563, 0.0001] },
      { el: "H", pos: [2.1577, 1.2245, 0] },
    ],
    bonds: [
      [0, 1, 2],
      [0, 2, 1],
      [0, 6, 1],
      [1, 3, 1],
      [1, 7, 1],
      [2, 4, 2],
      [2, 8, 1],
      [3, 5, 2],
      [3, 9, 1],
      [4, 5, 1],
      [4, 10, 1],
      [5, 11, 1],
    ],
  },
];

export const getMolecule = (id) => MOLECULES.find((m) => m.id === id) || null;

// Erish (mp) va qaynash (bp) haroratlari, °C - moddaning xona haroratidagi
// holatini (qattiq/suyuq/gaz) tushuntirish uchun. `sub: true` - sublimatsiya.
export const PHASE_POINTS = {
  water: { mp: 0, bp: 100 },
  co2: { mp: -78, bp: -78, sub: true },
  methane: { mp: -182, bp: -162 },
  ammonia: { mp: -78, bp: -33 },
  hydrogen: { mp: -259, bp: -253 },
  oxygen: { mp: -219, bp: -183 },
  nitrogen: { mp: -210, bp: -196 },
  hcl: { mp: -114, bp: -85 },
  nacl: { mp: 801, bp: 1465 },
  h2o2: { mp: 0, bp: 150 },
  ozone: { mp: -193, bp: -112 },
  so2: { mp: -72, bp: -10 },
  co: { mp: -205, bp: -191 },
  ethanol: { mp: -114, bp: 78 },
  "acetic-acid": { mp: 17, bp: 118 },
  benzene: { mp: 6, bp: 80 },
};

export const getPhasePoints = (id) => PHASE_POINTS[id] ?? null;

// Xona haroratidagi (~20°C) holat: mp dan past bo'lsa qattiq, bp dan baland gaz.
export const stateAtRoom = (id) => {
  const p = PHASE_POINTS[id];
  if (!p) return null;
  if (20 < p.mp) return "qattiq";
  if (20 >= p.bp) return "gaz";
  return "suyuq";
};

// --- Formula / composition helpers (element multiset math) ---

// Parse "C2H6O", "H2O" or "Ca(OH)2" into a { symbol: count } multiset.
export const parseFormula = (formula) => {
  const root = {};
  const stack = [root];
  let i = 0;
  const readNumber = () => {
    let d = "";
    while (i < formula.length && /\d/.test(formula[i])) d += formula[i++];
    return d ? parseInt(d, 10) : 1;
  };
  while (i < formula.length) {
    const ch = formula[i];
    if (ch === "(" || ch === "[") {
      stack.push({});
      i += 1;
    } else if (ch === ")" || ch === "]") {
      i += 1;
      const mult = readNumber();
      const group = stack.pop();
      const parent = stack[stack.length - 1];
      for (const [sym, count] of Object.entries(group))
        parent[sym] = (parent[sym] ?? 0) + count * mult;
    } else if (/[A-Z]/.test(ch)) {
      let symbol = ch;
      i += 1;
      while (i < formula.length && /[a-z]/.test(formula[i])) symbol += formula[i++];
      const mult = readNumber();
      const top = stack[stack.length - 1];
      top[symbol] = (top[symbol] ?? 0) + mult;
    } else {
      i += 1;
    }
  }
  return root;
};

// Merge `add` into `base` (mutating and returning `base`).
export const addComposition = (base, add) => {
  for (const [sym, count] of Object.entries(add))
    base[sym] = (base[sym] ?? 0) + count;
  return base;
};

// Order-independent canonical key, e.g. { H: 2, O: 1 } -> "H2O1".
export const compositionKey = (comp) =>
  Object.keys(comp)
    .filter((sym) => comp[sym] > 0)
    .sort()
    .map((sym) => `${sym}${comp[sym]}`)
    .join("");

// Index molecules by composition key so a poured mixture reveals its product.
let productIndex = null;
const getProductIndex = () => {
  if (productIndex) return productIndex;
  productIndex = new Map();
  for (const mol of MOLECULES) {
    const key = compositionKey(parseFormula(mol.formula));
    if (key && !productIndex.has(key)) productIndex.set(key, mol);
  }
  return productIndex;
};

// The molecule a composition adds up to exactly, or null.
export const findProduct = (composition) => {
  if (!composition || Object.keys(composition).length === 0) return null;
  return getProductIndex().get(compositionKey(composition)) ?? null;
};
