import { CanvasTexture, SRGBColorSpace } from "three";

const MARKER_FONT = "'Marker Felt', 'Chalkboard SE', 'Comic Sans MS', 'Segoe Print', cursive";
const UI_FONT = "Inter, 'Segoe UI', Arial, sans-serif";

const makeCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
};

// glTF UVs expect flipY = false.
const toTexture = (canvas, anisotropy = 8) => {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.anisotropy = anisotropy;
  return texture;
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

// ---------- Whiteboard ----------

export const createWhiteboardTexture = () => {
  const { canvas, ctx } = makeCanvas(2048, 1024);
  ctx.fillStyle = "#fbfbf9";
  ctx.fillRect(0, 0, 2048, 1024);

  // Faint leftovers of wiped marker.
  for (const [x, y, r] of [[520, 760, 260], [1500, 300, 320], [1180, 860, 200]]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(120,130,150,0.06)");
    g.addColorStop(1, "rgba(120,130,150,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1c3c96";
  ctx.font = `600 78px ${MARKER_FONT}`;
  ctx.fillText("Mavzu: Kimyoviy reaksiyalar", 110, 150);
  ctx.strokeStyle = "#1c3c96";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(110, 178);
  ctx.quadraticCurveTo(620, 168, 1080, 184);
  ctx.stroke();

  ctx.font = `500 66px ${MARKER_FONT}`;
  ctx.fillText("1)  NaOH + HCl  →  NaCl + H₂O", 140, 330);
  ctx.fillText("2)  2H₂ + O₂  →  2H₂O", 140, 450);
  ctx.fillText("3)  CaCO₃ + 2HCl  →  CaCl₂ + H₂O + CO₂↑", 140, 570);

  ctx.fillStyle = "#b3261e";
  ctx.font = `600 62px ${MARKER_FONT}`;
  ctx.fillText("Diqqat! Kislotani suvga quying,", 140, 760);
  ctx.fillText("suvni kislotaga emas!", 140, 850);

  // A quick sketch of a conical flask.
  ctx.strokeStyle = "#1f7a4a";
  ctx.lineWidth = 7;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(1640, 560);
  ctx.lineTo(1640, 680);
  ctx.lineTo(1520, 900);
  ctx.lineTo(1860, 900);
  ctx.lineTo(1740, 680);
  ctx.lineTo(1740, 560);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1560, 830);
  ctx.quadraticCurveTo(1690, 800, 1820, 830);
  ctx.stroke();

  return toTexture(canvas);
};

// ---------- Periodic table poster ----------

const SYMBOLS =
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(
    " ",
  );

const CATEGORIES = [
  { id: "alkali", label: "Ishqoriy metallar", color: "#f6a38d" },
  { id: "alkaline", label: "Ishqoriy-yer metallari", color: "#f7d08a" },
  { id: "transition", label: "O'tish metallari", color: "#f3b8c8" },
  { id: "post", label: "Boshqa metallar", color: "#b8d4e8" },
  { id: "metalloid", label: "Yarim metallar", color: "#c7e3a6" },
  { id: "nonmetal", label: "Nometallar", color: "#a5e0c0" },
  { id: "halogen", label: "Galogenlar", color: "#fff09a" },
  { id: "noble", label: "Inert gazlar", color: "#c9b8f0" },
  { id: "lanthanide", label: "Lantanoidlar", color: "#9fd9e0" },
  { id: "actinide", label: "Aktinoidlar", color: "#e4b4dc" },
];
const CATEGORY_COLOR = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color]));

const categoryOf = (z) => {
  if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return "nonmetal";
  if ([9, 17, 35, 53, 85, 117].includes(z)) return "halogen";
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return "noble";
  if ([3, 11, 19, 37, 55, 87].includes(z)) return "alkali";
  if ([4, 12, 20, 38, 56, 88].includes(z)) return "alkaline";
  if ([5, 14, 32, 33, 51, 52].includes(z)) return "metalloid";
  if (z >= 57 && z <= 71) return "lanthanide";
  if (z >= 89 && z <= 103) return "actinide";
  const transition =
    (z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112);
  return transition ? "transition" : "post";
};

// [row, column]; rows 9-10 are the separated lanthanide/actinide rows.
const cellOf = (z) => {
  if (z === 1) return [1, 1];
  if (z === 2) return [1, 18];
  if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8];
  if (z <= 18) return [3, z <= 12 ? z - 10 : z];
  if (z <= 36) return [4, z - 18];
  if (z <= 54) return [5, z - 36];
  if (z >= 57 && z <= 71) return [9, z - 54];
  if (z >= 89 && z <= 103) return [10, z - 86];
  if (z <= 86) return [6, z <= 56 ? z - 54 : z - 68];
  return [7, z <= 88 ? z - 86 : z - 100];
};

export const createPeriodicTableTexture = () => {
  const W = 2048;
  const H = 1316;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#fdfcf8";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#1d2433";
  ctx.textAlign = "center";
  ctx.font = `800 64px ${UI_FONT}`;
  ctx.fillText("KIMYOVIY ELEMENTLAR DAVRIY JADVALI", W / 2, 96);

  const pitch = 104;
  const size = 98;
  const x0 = (W - pitch * 18) / 2;
  const y0 = 140;
  const rowY = (row) => y0 + (row <= 7 ? row - 1 : row - 1.6) * pitch;

  const drawCell = (x, y, fill, number, symbol) => {
    roundRect(ctx, x, y, size, size, 10);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(29,36,51,0.35)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1d2433";
    ctx.textAlign = "left";
    ctx.font = `600 20px ${UI_FONT}`;
    ctx.fillText(number, x + 9, y + 25);
    ctx.textAlign = "center";
    ctx.font = `800 46px ${UI_FONT}`;
    ctx.fillText(symbol, x + size / 2, y + 74);
  };

  SYMBOLS.forEach((symbol, i) => {
    const z = i + 1;
    const [row, col] = cellOf(z);
    drawCell(x0 + (col - 1) * pitch, rowY(row), CATEGORY_COLOR[categoryOf(z)], String(z), symbol);
  });
  drawCell(x0 + 2 * pitch, rowY(6), CATEGORY_COLOR.lanthanide, "", "*");
  drawCell(x0 + 2 * pitch, rowY(7), CATEGORY_COLOR.actinide, "", "**");

  const legendY = rowY(10) + pitch + 20;
  const columns = 5;
  const legendW = (W - x0 * 2) / columns;
  CATEGORIES.forEach((c, i) => {
    const x = x0 + (i % columns) * legendW;
    const y = legendY + Math.floor(i / columns) * 46;
    roundRect(ctx, x, y, 34, 34, 6);
    ctx.fillStyle = c.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(29,36,51,0.35)";
    ctx.stroke();
    ctx.fillStyle = "#1d2433";
    ctx.textAlign = "left";
    ctx.font = `600 26px ${UI_FONT}`;
    ctx.fillText(c.label, x + 46, y + 26);
  });

  return toTexture(canvas);
};

// ---------- Lab computer screen ----------

export const drawMonitor = (ctx, width, height, time) => {
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#0f1b3d");
  g.addColorStop(1, "#33296e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 76px ${UI_FONT}`;
  ctx.fillText("LearnStuff", width / 2, height / 2 - 40);
  ctx.fillStyle = "#c9c3ff";
  ctx.font = `600 38px ${UI_FONT}`;
  ctx.fillText("Kimyo laboratoriyasi", width / 2, height / 2 + 20);
  ctx.fillStyle = "#9aa3c7";
  ctx.font = `500 26px ${UI_FONT}`;
  ctx.fillText("Tajriba natijalari shu ekranda ko'rsatiladi", width / 2, height / 2 + 70);

  ctx.fillStyle = "rgba(5,8,20,0.85)";
  ctx.fillRect(0, height - 44, width, 44);
  ctx.fillStyle = "#e6e8f0";
  ctx.textAlign = "right";
  ctx.font = `600 24px ${UI_FONT}`;
  ctx.fillText(time, width - 24, height - 14);
};

// ---------- Wall clock ----------

export const drawClock = (ctx, size, date) => {
  const c = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fbfbfb";
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#1b1b1f";
  for (let i = 0; i < 60; i += 1) {
    const major = i % 5 === 0;
    const a = (i / 60) * Math.PI * 2;
    const r1 = c * (major ? 0.8 : 0.86);
    ctx.lineWidth = major ? size * 0.018 : size * 0.006;
    ctx.beginPath();
    ctx.moveTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
    ctx.lineTo(c + Math.sin(a) * c * 0.92, c - Math.cos(a) * c * 0.92);
    ctx.stroke();
  }

  ctx.fillStyle = "#1b1b1f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(size * 0.09)}px ${UI_FONT}`;
  for (let h = 1; h <= 12; h += 1) {
    const a = (h / 12) * Math.PI * 2;
    ctx.fillText(String(h), c + Math.sin(a) * c * 0.66, c - Math.cos(a) * c * 0.66);
  }

  const hours = (date.getHours() % 12) + date.getMinutes() / 60;
  const minutes = date.getMinutes() + date.getSeconds() / 60;
  const hand = (angle, length, width, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(c - Math.sin(angle) * c * 0.12, c + Math.cos(angle) * c * 0.12);
    ctx.lineTo(c + Math.sin(angle) * length, c - Math.cos(angle) * length);
    ctx.stroke();
  };
  hand((hours / 12) * Math.PI * 2, c * 0.45, size * 0.035, "#1b1b1f");
  hand((minutes / 60) * Math.PI * 2, c * 0.68, size * 0.022, "#1b1b1f");
  ctx.fillStyle = "#c62828";
  ctx.beginPath();
  ctx.arc(c, c, size * 0.025, 0, Math.PI * 2);
  ctx.fill();
  ctx.textBaseline = "alphabetic";
};

// ---------- Exit sign ----------

export const createExitSignTexture = () => {
  const { canvas, ctx } = makeCanvas(1024, 512);
  ctx.fillStyle = "#0b8a3e";
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Door
  ctx.lineWidth = 16;
  ctx.strokeRect(96, 96, 190, 320);

  // Running figure
  ctx.beginPath();
  ctx.arc(420, 150, 38, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(400, 210);
  ctx.lineTo(370, 320);
  ctx.moveTo(390, 240);
  ctx.lineTo(320, 280);
  ctx.moveTo(400, 230);
  ctx.lineTo(470, 280);
  ctx.moveTo(370, 320);
  ctx.lineTo(310, 400);
  ctx.moveTo(370, 320);
  ctx.lineTo(450, 380);
  ctx.lineTo(470, 430);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `800 118px ${UI_FONT}`;
  ctx.fillText("CHIQISH", 530, 256);
  return toTexture(canvas);
};

export const createDynamicTexture = (width, height, draw) => {
  const { canvas, ctx } = makeCanvas(width, height);
  const texture = toTexture(canvas, 4);
  const redraw = (...args) => {
    draw(ctx, ...args);
    texture.needsUpdate = true;
  };
  return { texture, redraw };
};
