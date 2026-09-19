import { EPS, aq } from "./mixture";

// Weak acids (incl. hydrated metal ions) that set the pH when no strong acid or base is left.
const WEAK_ACIDS = [
  ["Fe3+", 2.2],
  ["SO2(aq)", 1.9],
  ["Cl2(aq)", 3.3],
  ["CO2(aq)", 6.35],
  ["Cu2+", 7.5],
  ["Zn2+", 9.0],
  ["NH4+", 9.25],
  ["Fe2+", 9.5],
  ["Mn2+", 10.6],
  ["Mg2+", 11.4],
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Approximate pH from the dominant acid/base pair; null when there is no liquid.
export const phOf = (m) => {
  if (m.volumeMl <= EPS || aq(m, "H2O") <= EPS) return null;
  const litres = m.volumeMl / 1000;
  const M = (id) => aq(m, id) / 1000 / litres;
  const h = M("H+");
  const oh = M("OH-");
  if (h > 1e-5) return clamp(-Math.log10(h), -1.5, 7);
  if (oh > 1e-5) return clamp(14 + Math.log10(oh), 7, 14.5);

  const nh3 = M("NH3");
  const nh4 = M("NH4+");
  if (nh3 > 1e-5 && nh4 > 1e-5) return clamp(9.25 + Math.log10(nh3 / nh4), 7, 12);
  if (nh3 > 1e-5) return clamp(14 - 0.5 * (4.75 - Math.log10(nh3)), 7, 12.5);
  const co3 = M("CO3 2-");
  const hco3 = M("HCO3-");
  if (co3 > 1e-5 && hco3 > 1e-5) return clamp(10.33 + Math.log10(co3 / hco3), 8.3, 12);
  if (co3 > 1e-5) return clamp(14 - 0.5 * (3.67 - Math.log10(co3)), 8.3, 12.5);
  if (hco3 > 1e-5) return 8.3;

  let ph = 7;
  for (const [id, pKa] of WEAK_ACIDS) {
    const c = M(id);
    if (c > 1e-6) ph = Math.min(ph, 0.5 * (pKa - Math.log10(c)));
  }
  return clamp(ph, 0, 7);
};

// Universal indicator paper scale printed on the box (doc 14, № 3).
const PAPER = [
  [2, "#d7191c"],
  [4, "#f07c21"],
  [6, "#f2c81e"],
  [7.5, "#5fae3e"],
  [9.5, "#2e9b8f"],
  [12, "#2f6db5"],
  [Infinity, "#3b2c8f"],
];

export const phPaperColor = (ph) => PAPER.find(([limit]) => ph < limit)[1];

export const phWord = (ph) => {
  if (ph < 3) return "kuchli kislotali";
  if (ph < 6.5) return "kislotali";
  if (ph <= 7.5) return "neytral";
  if (ph < 11) return "ishqoriy";
  return "kuchli ishqoriy";
};
