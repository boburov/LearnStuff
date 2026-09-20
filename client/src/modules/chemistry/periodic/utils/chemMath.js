// Pure chemistry math ported from Zperiod (chemistryTools.js), stripped of DOM/i18n.
// Error messages are in Uzbek; element symbols and formulas stay in English.

export const atomicMasses = {
  H: 1.008, He: 4.003,
  Li: 6.941, Be: 9.012, B: 10.81, C: 12.01, N: 14.01, O: 16.0, F: 19.0, Ne: 20.18,
  Na: 22.99, Mg: 24.31, Al: 26.98, Si: 28.09, P: 30.97, S: 32.07, Cl: 35.45, Ar: 39.95,
  K: 39.1, Ca: 40.08, Sc: 44.96, Ti: 47.87, V: 50.94, Cr: 52.0, Mn: 54.94, Fe: 55.85,
  Co: 58.93, Ni: 58.69, Cu: 63.55, Zn: 65.38, Ga: 69.72, Ge: 72.63, As: 74.92, Se: 78.97,
  Br: 79.9, Kr: 83.8,
  Rb: 85.47, Sr: 87.62, Y: 88.91, Zr: 91.22, Nb: 92.91, Mo: 95.95, Tc: 98.0, Ru: 101.1,
  Rh: 102.9, Pd: 106.4, Ag: 107.9, Cd: 112.4, In: 114.8, Sn: 118.7, Sb: 121.8, Te: 127.6,
  I: 126.9, Xe: 131.3,
  Cs: 132.9, Ba: 137.3, La: 138.9, Ce: 140.1, Pr: 140.9, Nd: 144.2, Pm: 145.0, Sm: 150.4,
  Eu: 152.0, Gd: 157.3, Tb: 158.9, Dy: 162.5, Ho: 164.9, Er: 167.3, Tm: 168.9, Yb: 173.0,
  Lu: 175.0, Hf: 178.5, Ta: 180.9, W: 183.8, Re: 186.2, Os: 190.2, Ir: 192.2, Pt: 195.1,
  Au: 197.0, Hg: 200.6, Tl: 204.4, Pb: 207.2, Bi: 209.0, Po: 209.0, At: 210.0, Rn: 222.0,
  Fr: 223.0, Ra: 226.0, Ac: 227.0, Th: 232.0, Pa: 231.0, U: 238.0, Np: 237.0, Pu: 244.0,
  Am: 243.0, Cm: 247.0, Bk: 247.0, Cf: 251.0, Es: 252.0, Fm: 257.0, Md: 258.0, No: 259.0,
  Lr: 262.0, Rf: 267.0, Db: 270.0, Sg: 271.0, Bh: 270.0, Hs: 277.0, Mt: 276.0, Ds: 281.0,
  Rg: 282.0, Cn: 285.0, Nh: 286.0, Fl: 289.0, Mc: 290.0, Lv: 293.0, Ts: 294.0, Og: 294.0,
};

const METALS = new Set([
  "Li","Be","Na","Mg","Al","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn",
  "Ga","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn",
  "Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu",
  "Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po",
  "Fr","Ra","Ac","Th","Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr",
  "Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og",
]);

const SUB = { 0:"₀",1:"₁",2:"₂",3:"₃",4:"₄",5:"₅",6:"₆",7:"₇",8:"₈",9:"₉" };
export const subscript = (num) =>
  String(num).split("").map((d) => SUB[d] ?? d).join("");

// Parse a chemical formula into { element: count }. Handles (), [], {}, hydrates (•), coefficients.
export function parseFormula(formula) {
  if (!formula) return {};
  formula = String(formula).replace(/\s*\((aq|s|l|g)\)\s*$/i, "").trim();

  const subMap = { "₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9" };
  formula = formula.replace(/[₀-₉]/g, (c) => subMap[c]);
  formula = formula.replace(/[.*·]/g, "•");

  if (formula.includes("•")) {
    const finalCounts = {};
    formula.split("•").forEach((part) => {
      const partCounts = parseFormula(part.trim());
      for (const [el, num] of Object.entries(partCounts)) {
        finalCounts[el] = (finalCounts[el] || 0) + num;
      }
    });
    return finalCounts;
  }

  formula = formula.trim();
  if (!formula) return {};

  let globalMultiplier = 1;
  const coeffMatch = formula.match(/^(\d+)/);
  if (coeffMatch) {
    globalMultiplier = parseInt(coeffMatch[1]);
    formula = formula.substring(coeffMatch[1].length);
  }

  const stack = [{}];
  let i = 0;
  const len = formula.length;

  while (i < len) {
    const char = formula[i];
    if (char === "(" || char === "[" || char === "{") {
      stack.push({});
      i++;
    } else if (char === ")" || char === "]" || char === "}") {
      if (stack.length < 2) throw new Error("Qavslar mos kelmadi");
      i++;
      let count = 1;
      const numMatch = formula.slice(i).match(/^(\d+)/);
      if (numMatch) { count = parseInt(numMatch[1]); i += numMatch[1].length; }
      const popped = stack.pop();
      const current = stack[stack.length - 1];
      for (const [el, num] of Object.entries(popped)) {
        current[el] = (current[el] || 0) + num * count;
      }
    } else if (/[A-Z]/.test(char)) {
      let element = char;
      i++;
      if (i < len && /[a-z]/.test(formula[i])) { element += formula[i]; i++; }
      let count = 1;
      const numMatch = formula.slice(i).match(/^(\d+)/);
      if (numMatch) { count = parseInt(numMatch[1]); i += numMatch[1].length; }
      const current = stack[stack.length - 1];
      current[element] = (current[element] || 0) + count;
    } else if (/\s/.test(char)) {
      i++;
    } else {
      throw new Error(`Noto'g'ri belgi: ${char}`);
    }
  }

  if (stack.length > 1) throw new Error("Qavs yopilmagan");
  const result = stack[0];
  if (globalMultiplier !== 1) for (const k in result) result[k] *= globalMultiplier;
  return result;
}

// Molar mass with per-element breakdown.
export function molarMass(formula, exact = true) {
  const elements = parseFormula(formula);
  if (Object.keys(elements).length === 0) throw new Error("Formula bo'sh");
  let total = 0;
  const breakdown = [];
  Object.keys(elements).forEach((element) => {
    const count = elements[element];
    const mass = atomicMasses[element];
    if (!mass) throw new Error(`Noma'lum element: ${element}`);
    const subtotal = mass * count;
    total += subtotal;
    breakdown.push({
      element,
      atomicMass: exact ? mass.toFixed(3) : Math.round(mass),
      count,
      subtotal: exact ? subtotal.toFixed(3) : Math.round(subtotal),
    });
  });
  return { total: exact ? Number(total.toFixed(3)) : Math.round(total), breakdown, exact };
}

function gcdTwo(a, b) {
  a = Math.round(Math.abs(a)); b = Math.round(Math.abs(b));
  while (b) { [a, b] = [b, a % b]; }
  return a;
}
const gcdArr = (arr) => arr.reduce((g, v) => gcdTwo(g, v));

function simplifyRatios(ratios) {
  const TOL = 0.08;
  for (let mult = 1; mult <= 8; mult++) {
    const scaled = ratios.map((r) => r.ratio * mult);
    if (scaled.every((v) => Math.abs(v - Math.round(v)) < TOL)) {
      let counts = scaled.map((v) => Math.round(v) || 1);
      const g = gcdArr(counts);
      counts = counts.map((c) => c / g);
      return ratios.map((r, i) => ({ symbol: r.symbol, count: counts[i] }));
    }
  }
  return null;
}

function orderElements(elements) {
  const hasMetal = elements.some((e) => METALS.has(e.symbol));
  const hasNonMetal = elements.some((e) => !METALS.has(e.symbol));
  if (hasMetal && hasNonMetal) {
    const metals = elements.filter((e) => METALS.has(e.symbol)).sort((a, b) => a.symbol.localeCompare(b.symbol));
    const nonmetals = elements.filter((e) => !METALS.has(e.symbol)).sort((a, b) => a.symbol.localeCompare(b.symbol));
    return [...metals, ...nonmetals];
  }
  return [...elements].sort((a, b) => {
    if (a.symbol === "C") return -1;
    if (b.symbol === "C") return 1;
    if (a.symbol === "H") return -1;
    if (b.symbol === "H") return 1;
    return a.symbol.localeCompare(b.symbol);
  });
}

// Empirical + optional molecular formula from element percentages.
// data: { elements: [{ symbol, percent }], molecularMass?: number }
export function calculateEmpirical(data) {
  const { elements, molecularMass } = data;
  if (!elements || elements.length < 2) {
    throw new Error("Kamida 2 ta element kiriting");
  }
  for (const e of elements) {
    if (!atomicMasses[e.symbol]) throw new Error(`Noma'lum element: ${e.symbol}`);
    if (!(e.percent > 0)) throw new Error(`${e.symbol} uchun foiz musbat bo'lishi kerak`);
  }

  const rawSum = elements.reduce((s, e) => s + e.percent, 0);
  const normalised = Math.abs(rawSum - 100) > 0.01;
  const scaleFactor = 100 / rawSum;

  const moles = elements.map((elem) => {
    const aw = atomicMasses[elem.symbol];
    const grams = elem.percent * scaleFactor;
    return { symbol: elem.symbol, grams, atomicWeight: aw, moles: grams / aw };
  });

  const minMoles = Math.min(...moles.map((m) => m.moles));
  const ratios = moles.map((m) => ({ symbol: m.symbol, moles: m.moles, ratio: m.moles / minMoles }));

  const simplified = simplifyRatios(ratios);
  if (!simplified) {
    throw new Error("Empirik formulani aniqlab bo'lmadi — nisbatlar butun songa yaqin emas. Ma'lumotni tekshiring.");
  }

  const ordered = orderElements(simplified);
  const empiricalFormula = ordered.map((r) => r.symbol + (r.count > 1 ? subscript(r.count) : "")).join("");
  const empiricalMass = ordered.reduce((s, e) => s + atomicMasses[e.symbol] * e.count, 0);

  let molecularFormula = null;
  let multiplier = 1;
  let molMassError = null;

  if (molecularMass !== null && molecularMass !== undefined && Number(molecularMass) > 0) {
    const mm = Number(molecularMass);
    const rawN = mm / empiricalMass;
    const n = Math.round(rawN);
    if (n < 1 || Math.abs(rawN - n) > 0.1) {
      molMassError = `Molyar massa ${mm} g/mol empirik formula massasiga (${empiricalMass.toFixed(2)} g/mol) mos kelmadi (nisbat = ${rawN.toFixed(2)}).`;
    } else {
      multiplier = n;
      molecularFormula = ordered.map((r) => r.symbol + (r.count * n > 1 ? subscript(r.count * n) : "")).join("");
    }
  }

  return {
    empiricalFormula,
    empiricalMass: Number(empiricalMass.toFixed(2)),
    molecularFormula,
    multiplier,
    molMassError,
    normalised,
    rawSum: Number(rawSum.toFixed(2)),
    steps: { moles, minMoles, ratios, ordered },
  };
}

export const EMPIRICAL_PRESETS = [
  { name: "Glyukoza", formula: "C₆H₁₂O₆", elements: [ { symbol: "C", percent: 40.0 }, { symbol: "H", percent: 6.7 }, { symbol: "O", percent: 53.3 } ], molecularMass: 180 },
  { name: "Suv", formula: "H₂O", elements: [ { symbol: "H", percent: 11.2 }, { symbol: "O", percent: 88.8 } ], molecularMass: 18 },
  { name: "Karbonat angidrid", formula: "CO₂", elements: [ { symbol: "C", percent: 27.3 }, { symbol: "O", percent: 72.7 } ], molecularMass: 44 },
  { name: "Ammiak", formula: "NH₃", elements: [ { symbol: "N", percent: 82.4 }, { symbol: "H", percent: 17.6 } ], molecularMass: 17 },
  { name: "Benzol", formula: "C₆H₆", elements: [ { symbol: "C", percent: 92.3 }, { symbol: "H", percent: 7.7 } ], molecularMass: 78 },
];
