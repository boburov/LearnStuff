import { CanvasTexture, SRGBColorSpace } from "three";
import { drawGhsPictogram } from "./ghs";

const FONT = "'Inter Variable', Inter, 'Segoe UI', Arial, sans-serif";
const PAPER = "#f7f5ee";
const MANILA = "#eadcb4";
const INK = "#17191d";
const MUTED = "#555a62";
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
const DANGER = ["flammable", "oxidizer", "corrosive", "toxic", "health"];

// Storage colour code used on reagent shelves: red flammable, yellow oxidizer, blue toxic, striped corrosive.
const BANDS = [
  ["flammable", { color: "#c62a2f", text: "#ffffff" }],
  ["oxidizer", { color: "#f0b400", text: "#1b1b1b" }],
  ["toxic", { color: "#1f5aa6", text: "#ffffff" }],
  ["corrosive", { color: "#ffffff", stripes: "#202226", text: "#1b1b1b" }],
  ["health", { color: "#1f5aa6", text: "#ffffff" }],
  ["irritant", { color: "#e2821c", text: "#ffffff" }],
  ["environment", { color: "#e2821c", text: "#ffffff" }],
];
const GENERAL_BAND = { color: "#3d8a58", text: "#ffffff" };

const bandFor = (hazards) => BANDS.find(([key]) => hazards.includes(key))?.[1] ?? GENERAL_BAND;

const signalWord = (hazards) => {
  if (hazards.some((key) => DANGER.includes(key))) return "XAVFLI";
  return hazards.length ? "EHTIYOT BO'LING" : "";
};

const font = (weight, size) => `${weight} ${size}px ${FONT}`;

// Unicode subscript digits are drawn as smaller, lowered digits so every font renders them.
const formulaRuns = (formula) => {
  const runs = [];
  for (const char of formula) {
    const index = SUBSCRIPT_DIGITS.indexOf(char);
    const sub = index >= 0;
    const text = sub ? String(index) : char;
    const last = runs[runs.length - 1];
    if (last && last.sub === sub) last.text += text;
    else runs.push({ text, sub });
  }
  return runs;
};

const measureFormula = (ctx, formula, size, weight) =>
  formulaRuns(formula).reduce((width, run) => {
    ctx.font = font(weight, run.sub ? size * 0.62 : size);
    return width + ctx.measureText(run.text).width;
  }, 0);

const drawFormula = (ctx, formula, cx, baseline, size, weight, maxWidth) => {
  const scale = Math.min(1, maxWidth / measureFormula(ctx, formula, size, weight));
  const s = size * scale;
  let x = cx - measureFormula(ctx, formula, s, weight) / 2;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const run of formulaRuns(formula)) {
    ctx.font = font(weight, run.sub ? s * 0.62 : s);
    ctx.fillText(run.text, x, run.sub ? baseline + s * 0.2 : baseline);
    x += ctx.measureText(run.text).width;
  }
};

const fitText = (ctx, text, weight, size, maxWidth) => {
  ctx.font = font(weight, size);
  const width = ctx.measureText(text).width;
  const fitted = width > maxWidth ? (size * maxWidth) / width : size;
  ctx.font = font(weight, fitted);
  return fitted;
};

const spacedText = (ctx, text, cx, baseline, spacing) => {
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = "center";
  ctx.fillText(text, cx, baseline);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
};

const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const paperGrain = (ctx, w, h, seed) => {
  const count = Math.round((w * h) / 900);
  for (let i = 0; i < count; i += 1) {
    const light = hash(seed + i * 3.1) > 0.5;
    ctx.fillStyle = light ? "rgba(255,255,255,0.35)" : "rgba(90,80,60,0.05)";
    ctx.fillRect(hash(seed + i * 1.7) * w, hash(seed + i * 2.3) * h, 1.5, 1.5);
  }
};

const drawBand = (ctx, band, w, h) => {
  ctx.fillStyle = band.color;
  ctx.fillRect(0, 0, w, h);
  if (!band.stripes) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = band.stripes;
  const step = h * 1.1;
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + h, 0);
    ctx.lineTo(x + h + step * 0.45, 0);
    ctx.lineTo(x + step * 0.45, h);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(247,245,238,0.86)";
  ctx.fillRect(w * 0.08, h * 0.16, w * 0.28, h * 0.68);
  ctx.fillRect(w * 0.64, h * 0.16, w * 0.28, h * 0.68);
};

const labelSeed = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100000, 7);

const drawPictogramRow = (ctx, hazards, cx, cy, diamond) => {
  const step = diamond * 0.92;
  const width = hazards.length ? (hazards.length - 1) * step + diamond : 0;
  hazards.forEach((key, i) => drawGhsPictogram(ctx, key, cx - width / 2 + diamond / 2 + i * step, cy, diamond));
  return width;
};

const drawTitleBlock = (ctx, substance, cx, top, bottom, width, H) => {
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK;
  const nameSize = fitText(ctx, substance.name, 800, H * 0.125, width);
  const nameBase = top + nameSize * 0.78;
  ctx.fillText(substance.name, cx, nameBase);
  let formulaTop = nameBase + H * 0.05;
  if (substance.detail) {
    ctx.fillStyle = MUTED;
    const detailSize = fitText(ctx, substance.detail, 500, H * 0.068, width);
    const detailBase = nameBase + detailSize * 1.3;
    ctx.fillText(substance.detail, cx, detailBase);
    formulaTop = detailBase + H * 0.04;
  }
  const formulaSize = Math.min(H * 0.21, (bottom - formulaTop) / 0.8);
  const baseline = (formulaTop + bottom) / 2 + formulaSize * 0.36;
  ctx.fillStyle = INK;
  drawFormula(ctx, substance.formula, cx, baseline, formulaSize, 700, width * 0.8);
};

// Landscape reagent label in millimetres; the centre of the canvas faces the viewer when wrapped.
const drawReagentLabel = (ctx, px, substance, W, H, amount) => {
  const hazards = substance.hazards ?? [];
  const band = bandFor(hazards);
  const signal = signalWord(hazards);
  const wide = W / H > 1.9;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(1 / px, 1 / px);
  paperGrain(ctx, W * px, H * px, labelSeed(substance.id));
  ctx.restore();

  const bandH = H * (wide ? 0.15 : 0.13);
  drawBand(ctx, band, W, bandH);
  ctx.fillStyle = band.text;
  ctx.textBaseline = "middle";
  fitText(ctx, "SMART LAB", 800, bandH * 0.5, W * 0.26);
  spacedText(ctx, "SMART LAB", W * 0.22, bandH * 0.54, bandH * 0.06);
  if (signal) {
    fitText(ctx, signal, 800, bandH * 0.5, W * 0.26);
    spacedText(ctx, signal, W * 0.78, bandH * 0.54, bandH * 0.05);
  }

  const rule = (x, y, w, h) => {
    ctx.fillStyle = "rgba(23,25,29,0.3)";
    ctx.fillRect(x, y, w, h);
  };

  if (wide) {
    const split = W * 0.64;
    drawTitleBlock(ctx, substance, W * 0.35, bandH + H * 0.06, H * 0.94, W * 0.52, H);
    rule(split, bandH + H * 0.1, Math.max(0.12, H * 0.004), H * 0.74);
    const diamond = Math.min(H * 0.34, (W * 0.3) / Math.max(1, hazards.length * 0.92 + 0.08));
    const right = (split + W) / 2;
    ctx.font = font(700, H * 0.1);
    if (hazards.length) {
      drawPictogramRow(ctx, hazards, right, bandH + H * 0.1 + diamond / 2, diamond);
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(amount, right, H * 0.84);
    } else {
      ctx.fillStyle = INK;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(amount, right, (bandH + H) / 2);
    }
  } else {
    const rowTop = H * 0.7;
    drawTitleBlock(ctx, substance, W / 2, bandH + H * 0.045, rowTop - H * 0.03, W * 0.8, H);
    rule(W * 0.14, rowTop - H * 0.012, W * 0.72, Math.max(0.12, H * 0.004));
    const diamond = H * 0.245;
    const rowY = rowTop + H * 0.02 + diamond / 2;
    ctx.font = font(700, H * 0.085);
    const amountW = ctx.measureText(amount).width;
    const iconsW = hazards.length ? (hazards.length - 1) * diamond * 0.92 + diamond : 0;
    const gap = hazards.length ? W * 0.05 : 0;
    const x = W / 2 - (iconsW + gap + amountW) / 2;
    drawPictogramRow(ctx, hazards, x + iconsW / 2, rowY, diamond);
    ctx.fillStyle = INK;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(amount, x + iconsW + gap, rowY);
  }

  ctx.strokeStyle = "rgba(60,50,30,0.16)";
  ctx.lineWidth = 0.25;
  ctx.strokeRect(0.12, 0.12, W - 0.24, H - 0.24);
};

// Manila valve tag with a reinforced string hole (transparent, cut by alphaTest).
const drawGasTag = (ctx, px, substance, W, H) => {
  const hazards = substance.hazards ?? [];
  ctx.fillStyle = MANILA;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.scale(1 / px, 1 / px);
  paperGrain(ctx, W * px, H * px, labelSeed(substance.id) + 5);
  ctx.restore();

  const hole = [W / 2, 5.5];
  ctx.fillStyle = "#d9c38c";
  ctx.beginPath();
  ctx.arc(...hole, 4.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(90,70,30,0.35)";
  ctx.lineWidth = 0.2;
  ctx.stroke();

  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const nameSize = fitText(ctx, substance.name.toUpperCase(), 800, 4.6, W * 0.86);
  ctx.fillText(substance.name.toUpperCase(), W / 2, 12 + nameSize * 0.78);
  drawFormula(ctx, substance.formula, W / 2, 26.5, 9, 700, W * 0.8);

  ctx.fillStyle = "rgba(23,25,29,0.4)";
  ctx.fillRect(W * 0.1, 29.5, W * 0.8, 0.25);

  const d = hazards.length > 2 ? 11.5 : 13;
  const positions =
    hazards.length > 2
      ? hazards.map((_, i) => [W / 2 + (i % 2 ? 0.5 : -0.5) * d * 0.98, 36.5 + Math.floor(i / 2) * d * 0.9])
      : hazards.map((_, i) => [W / 2 + (i - (hazards.length - 1) / 2) * d * 0.98, 38]);
  hazards.forEach((key, i) => drawGhsPictogram(ctx, key, ...positions[i], d));

  const statusY = H - 4.2;
  ctx.font = font(700, 2.6);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  [["TO'LA", true], ["BO'SH", false]].forEach(([text, checked], i) => {
    const bx = W * 0.14 + i * W * 0.42;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.3;
    ctx.strokeRect(bx, statusY - 1.3, 2.6, 2.6);
    if (checked) {
      ctx.beginPath();
      ctx.moveTo(bx + 0.5, statusY);
      ctx.lineTo(bx + 1.1, statusY + 0.8);
      ctx.lineTo(bx + 2.3, statusY - 1);
      ctx.lineWidth = 0.45;
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.fillText(text, bx + 3.6, statusY + 0.1);
  });

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(...hole, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
};

const createTexture = (widthMm, heightMm, pxPerMm, draw) => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthMm * pxPerMm);
  canvas.height = Math.round(heightMm * pxPerMm);
  const ctx = canvas.getContext("2d");
  const paint = () => {
    ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
    ctx.clearRect(0, 0, widthMm, heightMm);
    draw(ctx, pxPerMm, widthMm, heightMm);
  };
  paint();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  // Labels made before the web font arrives are repainted once it loads.
  if (document.fonts && !document.fonts.check(font(800, 20))) {
    document.fonts.load(font(800, 20)).then(() => {
      paint();
      texture.needsUpdate = true;
    });
  }
  return texture;
};

export const createSubstanceLabelTexture = (substance, { widthMm, heightMm, amount, scale = 1 }) =>
  createTexture(widthMm, heightMm, Math.max(12, 1024 / widthMm) * scale, (ctx, px, W, H) =>
    drawReagentLabel(ctx, px, substance, W, H, amount),
  );

export const createGasTagTexture = (substance, { widthMm, heightMm, scale = 1 }) =>
  createTexture(widthMm, heightMm, 20 * scale, (ctx, px, W, H) => drawGasTag(ctx, px, substance, W, H));
