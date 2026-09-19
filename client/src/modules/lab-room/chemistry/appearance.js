import { SPECIES } from "./species";
import { EPS, conc, gasFraction, nitricFraction, sulfuricFraction } from "./mixture";
import { phOf } from "./acidity";

const WATER_TINT = { color: "#0d2230", alpha: 0.08 };

// How a settled solid reads: gels slump, curds clump, powders dust, crystals glint, metal flakes shine.
const BED_LOOK = {
  "Cu(OH)2": "gel",
  "Fe(OH)3": "gel",
  "Mg(OH)2": "gel",
  "Zn(OH)2": "gel",
  CuBasicSulfate: "gel",
  AgCl: "curdy",
  AgI: "curdy",
  CuI: "curdy",
  Ag2O: "fine",
  CaCO3: "fine",
  CaSO4: "fine",
  MnO2: "fine",
  CuO: "fine",
  MgO: "fine",
  C: "fine",
  NaHCO3: "powder",
  S: "powder",
  Ash: "powder",
  PermanganateResidue: "powder",
  KMnO4: "crystal",
  SucroseCrystals: "crystal",
  NaCl: "crystal",
  ZnSO4: "crystal",
  Cu: "metal",
  Ag: "metal",
  Fe: "metal",
  FeS: "metal",
};

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const rgbToHex = (rgb) =>
  `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("")}`;

// Weighted colour blend; weights are each layer's own alpha so strong tints dominate weak ones.
const blend = (layers) => {
  let total = 0;
  const rgb = [0, 0, 0];
  let clear = 1;
  for (const { color, alpha } of layers) {
    if (alpha <= 0) continue;
    const c = hexToRgb(color);
    for (let i = 0; i < 3; i += 1) rgb[i] += c[i] * alpha;
    total += alpha;
    clear *= 1 - alpha;
  }
  if (total <= EPS) return { color: WATER_TINT.color, alpha: 0 };
  return { color: rgbToHex(rgb.map((v) => v / total)), alpha: 1 - clear };
};

const tintLayers = (m, ph) => {
  const layers = [WATER_TINT];
  for (const id of Object.keys(m.aq)) {
    const sp = SPECIES[id];
    if (sp.tint) layers.push({ color: sp.tint.color, alpha: 1 - Math.exp(-sp.tint.k * conc(m, id)) });
    if (sp.indicator && ph != null && ph > sp.indicator.pH) {
      const strength = Math.min(1, (ph - sp.indicator.pH) / 1.2);
      layers.push({ color: sp.indicator.color, alpha: (1 - Math.exp(-sp.indicator.k * conc(m, id))) * strength });
    }
  }
  // Concentrated nitric acid carries dissolved NO2 (yellowish); concentrated sulfuric acid is oily and dark.
  const nitric = nitricFraction(m);
  if (nitric > 0.4) layers.push({ color: "#caa94a", alpha: 0.12 * (nitric - 0.4) * 4 });
  if (sulfuricFraction(m) > 0.7) layers.push({ color: "#141a1c", alpha: 0.05 });
  return layers;
};

// Everything a renderer needs to draw a container's contents, in plain numbers and hex colours.
export const appearance = (m) => {
  const ph = phOf(m);
  const tint = blend(tintLayers(m, ph));

  let scatter = 0;
  const cloud = [];
  const bed = [];
  const floating = [];
  const pieces = [];
  let bedTop = { ml: 0, look: "fine" };
  for (const s of m.solids) {
    const sp = SPECIES[s.species];
    if (s.form === "piece") {
      pieces.push({
        species: s.species,
        shape: s.shape ?? "chunk",
        count: s.count,
        grams: (s.mmol * sp.mw) / 1000,
        color: sp.color,
        metallic: sp.metallic ?? 0,
        coat: s.coat ?? null,
        glow: s.glow ?? 0,
        state: s.state ?? null,
      });
      continue;
    }
    if (s.form === "coat" || s.form === "crystals") continue;
    const grams = (s.mmol * sp.mw) / 1000;
    const suspended = s.suspended ?? 0;
    if (m.volumeMl > EPS && suspended > 0 && sp.scatter) {
      const amount = ((s.mmol * suspended) / m.volumeMl) * sp.scatter;
      scatter += amount;
      cloud.push({ color: sp.color, alpha: amount });
    }
    const settled = 1 - suspended;
    const ml = sp.bedMl ? s.mmol * settled * sp.bedMl : (grams * settled) / 1.2;
    if (ml <= EPS) continue;
    if (!sp.floats || m.volumeMl <= EPS) {
      bed.push({ color: sp.color, alpha: ml, ml });
      // The biggest settled solid decides how the whole bed is drawn.
      if (ml > bedTop.ml) bedTop = { ml, look: BED_LOOK[s.species] ?? (sp.metallic ? "metal" : "fine") };
    } else {
      floating.push({ color: sp.color, alpha: ml, ml });
    }
  }

  const turbid = blend(cloud);
  const bedLayer = blend(bed);
  const floatLayer = blend(floating);

  const gasLayers = [];
  for (const id of Object.keys(m.gas)) {
    const sp = SPECIES[id];
    if (sp.gas) gasLayers.push({ color: sp.gas.color, alpha: 1 - Math.exp(-sp.gas.k * gasFraction(m, id)) });
  }
  const headspace = blend(gasLayers);

  return {
    volumeMl: m.volumeMl,
    tempC: m.tempC,
    ph,
    liquid: {
      color: tint.color,
      opacity: tint.alpha,
      turbidity: 1 - Math.exp(-scatter),
      turbidColor: turbid.color,
      viscous: sulfuricFraction(m) > 0.7 || conc(m, "C3H8O3") > 3,
    },
    bed: { ml: bed.reduce((sum, b) => sum + b.ml, 0), color: bedLayer.color, look: bedTop.look },
    floating: { ml: floating.reduce((sum, f) => sum + f.ml, 0), color: floatLayer.color },
    pieces,
    crystals: m.solids
      .filter((s) => s.form === "crystals")
      .reduce((out, s) => ({ mmol: out.mmol + s.mmol, host: s.host ?? out.host }), { mmol: 0, host: null }),
    headspace: { color: headspace.color, opacity: headspace.alpha },
    fx: m.fx,
  };
};
