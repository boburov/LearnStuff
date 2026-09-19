const RED = "#e3000f";
const INK = "#0b0b0b";
const WHITE = "#ffffff";
const DEG = Math.PI / 180;
const OUTER = 977;
const INNER = 828;

// Catmull-Rom in thousandths of the diamond's half-diagonal (y down); a third value of 1 marks a sharp corner.
const spline = (path, points) => {
  const n = points.length;
  const at = (i) => points[(i + n) % n];
  path.moveTo(points[0][0], points[0][1]);
  for (let i = 0; i < n; i += 1) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1 = p1[2] ? p1 : [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = p2[2] ? p2 : [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    path.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  path.closePath();
  return path;
};

const shape = (points) => spline(new Path2D(), points);

const fill = (ctx, path, color = INK) => {
  ctx.fillStyle = color;
  ctx.fill(path);
};

const outline = (ctx, path, width) => {
  ctx.fillStyle = WHITE;
  ctx.fill(path);
  ctx.lineWidth = width;
  ctx.strokeStyle = INK;
  ctx.stroke(path);
};

const polyline = (ctx, points, width) => {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.lineWidth = width;
  ctx.strokeStyle = INK;
  ctx.stroke();
};

const FLAME = [
  [-4, 304, 1], [-130, 288], [-248, 214], [-318, 90], [-362, -72, 1],
  [-300, -22], [-252, 4], [-218, 10, 1], [-252, -80], [-274, -170], [-272, -262, 1],
  [-232, -226], [-196, -182], [-164, -150, 1], [-182, -240], [-178, -330], [-164, -394, 1],
  [-126, -368], [-100, -306], [-76, -238], [-62, -222, 1], [-38, -306], [-22, -430], [-10, -524], [0, -584, 1],
  [44, -470], [92, -356], [112, -270], [104, -210, 1], [150, -260], [168, -310], [180, -384, 1],
  [222, -296], [232, -222], [210, -122, 1], [262, -168], [316, -218, 1], [336, -140], [318, -44], [270, 40, 1],
  [326, 8], [364, -28, 1], [354, 96], [298, 218], [190, 288], [90, 304, 1],
];

const FLAME_CORE = [
  [-4, 312, 1], [-110, 262], [-190, 130, 1], [-130, 152], [-70, 170, 1], [-110, 90], [-124, 24, 1],
  [-80, -4], [-48, -70], [0, -160, 1], [36, -96], [74, -20], [90, 88, 1], [130, 58], [170, 30, 1],
  [162, 100], [120, 170, 1], [224, 144, 1], [180, 244], [90, 312, 1],
];

const flame = (ctx) => {
  fill(ctx, shape(FLAME));
  fill(ctx, shape(FLAME_CORE), WHITE);
};

const bar = (ctx, x0, x1, y0, y1) => {
  ctx.fillStyle = INK;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
};

const circle = (ctx, x, y, r, color = INK) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

const gasCylinder = (ctx) => {
  ctx.save();
  ctx.translate(-412, 62);
  ctx.rotate(-14.6 * DEG);
  const p = new Path2D();
  p.moveTo(8, -100);
  p.lineTo(640, -100);
  p.quadraticCurveTo(676, -100, 686, -66);
  p.bezierCurveTo(696, -40, 712, -32, 744, -32);
  p.lineTo(868, -32);
  p.arc(868, 0, 32, -Math.PI / 2, Math.PI / 2);
  p.lineTo(744, 32);
  p.bezierCurveTo(712, 32, 696, 40, 686, 66);
  p.quadraticCurveTo(676, 100, 640, 100);
  p.lineTo(8, 100);
  p.ellipse(8, 0, 52, 100, 0, Math.PI / 2, Math.PI * 1.5);
  p.closePath();
  fill(ctx, p);
  ctx.restore();
};

// Test tube in its own frame: open mouth at the origin, closed end at +length, lip bent toward +y.
const testTube = (ctx, x, y, angle, length, mirror) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(mirror ? -1 : 1, 1);
  ctx.rotate(angle);
  const r = 30;
  const tube = new Path2D();
  tube.moveTo(0, -r);
  tube.lineTo(length, -r);
  tube.arc(length, 0, r, -Math.PI / 2, Math.PI / 2);
  tube.lineTo(22, r);
  tube.quadraticCurveTo(4, r + 6, 4, r + 34);
  tube.lineTo(-8, r + 34);
  tube.quadraticCurveTo(-10, 0, -22, -r - 14);
  tube.closePath();
  outline(ctx, tube, 20);
  ctx.restore();
};

const drop = (ctx, x, y, r) => {
  const p = new Path2D();
  p.moveTo(x, y - r * 2.3);
  p.quadraticCurveTo(x + r * 0.95, y - r * 0.9, x + r, y);
  p.arc(x, y, r, 0, Math.PI);
  p.quadraticCurveTo(x - r * 0.95, y - r * 0.9, x, y - r * 2.3);
  fill(ctx, p);
};

const fume = (ctx, x, y, lean) => {
  const points = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    points.push([x + lean * t + Math.sin(t * Math.PI * 3) * 14, y - t * 120]);
  }
  ctx.lineCap = "round";
  polyline(ctx, points, 15);
};

const HAND = [
  [530, -14, 1], [430, -20], [352, -38], [334, -26, 1], [318, -52, 1], [298, -24, 1], [280, -50, 1], [262, -28, 1],
  [220, -18], [150, -6], [112, 10, 1], [132, 32], [214, 30, 1], [140, 44], [106, 60, 1], [132, 76], [222, 72, 1],
  [128, 88], [102, 104, 1], [130, 120], [226, 114, 1], [150, 130], [132, 146, 1], [160, 158], [262, 156], [360, 150],
  [530, 124, 1],
];

const corrosion = (ctx) => {
  ctx.lineJoin = "round";
  testTube(ctx, -348, -300, -8 * DEG, 300, false);
  testTube(ctx, 348, -300, -8 * DEG, 300, true);
  drop(ctx, -350, -196, 20);
  drop(ctx, -356, -50, 26);
  drop(ctx, 350, -196, 20);
  drop(ctx, 354, -76, 26);
  fume(ctx, -470, 0, 26);
  fume(ctx, -430, 10, 30);
  fume(ctx, -290, -10, 36);
  fume(ctx, -250, 0, 30);
  fume(ctx, 230, -110, -26);
  fume(ctx, 270, -104, -22);
  fume(ctx, 440, -110, 30);
  fume(ctx, 480, -116, 34);

  const plate = new Path2D();
  plate.moveTo(-640, 16);
  plate.lineTo(-422, 16);
  plate.bezierCurveTo(-400, 62, -300, 62, -278, 16);
  plate.lineTo(-100, 16);
  plate.lineTo(-100, 116);
  plate.lineTo(-640, 116);
  plate.closePath();
  fill(ctx, plate);

  const hand = shape(HAND);
  ctx.fillStyle = WHITE;
  ctx.fill(hand);
  ctx.lineWidth = 18;
  ctx.strokeStyle = INK;
  ctx.stroke(hand);
  ctx.fillStyle = WHITE;
  ctx.fillRect(532, -40, 120, 190);
};

// Bone from a to b: dilated in ink first, then filled white, so the outline stays even.
const bone = (ctx, a, b, grow, color) => {
  const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = 56 + grow * 2;
  ctx.beginPath();
  ctx.moveTo(a[0] + ux * 44, a[1] + uy * 44);
  ctx.lineTo(b[0] - ux * 44, b[1] - uy * 44);
  ctx.stroke();
  for (const [p, dir] of [[a, 1], [b, -1]]) {
    for (const side of [-1, 1]) {
      const cx = p[0] + ux * dir * 34 + nx * side * 36;
      const cy = p[1] + uy * dir * 34 + ny * side * 36;
      circle(ctx, cx, cy, 42 + grow, color);
    }
  }
};

const SKULL = [
  [0, -552], [146, -530], [244, -446], [292, -340], [272, -246], [236, -164], [176, -106, 1], [160, -40],
  [162, 36], [86, 110], [0, 140], [-86, 110], [-162, 36], [-160, -40], [-176, -106, 1], [-236, -164],
  [-272, -246], [-292, -340], [-244, -446], [-146, -530],
];

const skull = (ctx) => {
  const bones = [
    [[-440, -122], [462, 182]],
    [[468, -150], [-440, 162]],
  ];
  bones.forEach(([a, b]) => bone(ctx, a, b, 22, INK));
  bones.forEach(([a, b]) => bone(ctx, a, b, 0, WHITE));

  ctx.lineJoin = "round";
  outline(ctx, shape(SKULL), 24);
  for (const side of [-1, 1]) {
    const eye = new Path2D();
    eye.moveTo(side * 60, -222);
    eye.lineTo(side * 180, -222);
    eye.bezierCurveTo(side * 184, -170, side * 150, -140, side * 112, -142);
    eye.bezierCurveTo(side * 76, -144, side * 58, -176, side * 60, -222);
    fill(ctx, eye);
  }
  const nose = new Path2D();
  nose.moveTo(0, -124);
  nose.bezierCurveTo(22, -110, 58, -44, 50, -20);
  nose.quadraticCurveTo(0, -4, -50, -20);
  nose.bezierCurveTo(-58, -44, -22, -110, 0, -124);
  fill(ctx, nose);
  ctx.beginPath();
  ctx.moveTo(-158, -6);
  ctx.quadraticCurveTo(0, 96, 158, -6);
  ctx.lineWidth = 22;
  ctx.strokeStyle = INK;
  ctx.stroke();
};

const exclamation = (ctx) => {
  const p = new Path2D();
  p.moveTo(-140, -424);
  p.bezierCurveTo(-150, -520, 150, -520, 140, -424);
  p.lineTo(74, 70);
  p.quadraticCurveTo(0, 158, -74, 70);
  p.closePath();
  fill(ctx, p);
  circle(ctx, 0, 300, 108);
};

const BUST = [
  [0, -636], [140, -604], [206, -474], [192, -332], [130, -214], [120, -140], [122, -68, 1], [292, -12, 1],
  [300, 6, 1], [420, 36], [458, 96], [462, 192, 1], [8, 642, 1], [-452, 192, 1], [-448, 96], [-410, 36],
  [-290, 6, 1], [-282, -12, 1], [-118, -68, 1], [-116, -140], [-128, -214], [-190, -332], [-204, -474], [-138, -604],
];

const RAYS = [
  [4, -200], [300, 4], [338, 338], [8, 652], [-302, 356], [-292, 4],
];

const healthHazard = (ctx) => {
  fill(ctx, shape(BUST));
  const [cx, cy] = [0, 164];
  const star = new Path2D();
  const bubbles = [];
  RAYS.forEach(([x, y], i) => {
    const angle = Math.atan2(y - cy, x - cx);
    const [nx, ny] = [x, y];
    const [px, py] = RAYS[(i + 1) % RAYS.length];
    const next = Math.atan2(py - cy, px - cx);
    const mid = angle + Math.atan2(Math.sin(next - angle), Math.cos(next - angle)) / 2;
    if (i === 0) star.moveTo(nx, ny);
    else star.lineTo(nx, ny);
    star.lineTo(cx + Math.cos(mid) * 92, cy + Math.sin(mid) * 92);
    const length = Math.hypot(x - cx, y - cy);
    for (let k = 1; k < 7; k += 1) {
      const t = k / 7;
      const along = 60 + t * (length - 90);
      const half = 34 * (1 - t) + 6;
      for (const side of [-1, 1]) {
        const jitter = ((i * 7 + k * 3 + (side + 1)) % 5) / 5;
        const r = 12 + jitter * 12;
        const offset = half + (k % 2 ? r * 0.4 : -r * 0.6);
        bubbles.push([
          cx + Math.cos(angle) * along - Math.sin(angle) * side * offset,
          cy + Math.sin(angle) * along + Math.cos(angle) * side * offset,
          r,
          k % 2 ? INK : WHITE,
        ]);
      }
    }
  });
  star.closePath();
  fill(ctx, star, WHITE);
  bubbles.forEach(([x, y, r, color]) => circle(ctx, x, y, r, color));
};

const polygon = (points) => {
  const path = new Path2D();
  points.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  path.closePath();
  return path;
};

const TREE = [
  [-199, 141], [-195, -87], [-313, -150], [-333, -155], [-367, -147], [-372, -155], [-300, -205], [-290, -203],
  [-208, -165], [-220, -213], [-239, -233], [-343, -319], [-343, -345], [-228, -275], [-230, -320], [-245, -367],
  [-289, -450], [-275, -461], [-220, -378], [-202, -431], [-181, -437], [-190, -340], [-185, -321], [-167, -267],
  [-140, -160], [-90, -232], [-90, -287], [-99, -423], [-79, -423], [-62, -313], [31, -420], [31, -395],
  [-55, -257], [-51, -220], [-77, -149], [-21, -187], [13, -188], [50, -203], [113, -275], [121, -267],
  [42, -147], [17, -145], [-7, -132], [-80, -47], [-82, 107], [29, 164], [-106, 183], [-138, 229],
  [-180, 193], [-288, 203], [-290, 193],
];

const GROUND = [
  [-391, 332], [-239, 303], [-234, 308], [-67, 234], [58, 276], [100, 215], [129, 207], [266, 146], [357, 203],
  [286, 239], [386, 249], [357, 288], [415, 288], [417, 344], [-391, 338],
];

const FISH = [
  [-92, 214, 1], [-20, 196], [40, 150], [90, 90], [140, 30], [196, -22], [262, -50], [332, -58, 1], [288, 12, 1],
  [396, -32, 1], [386, 30], [346, 90], [270, 140], [170, 180], [60, 214], [-40, 228], [-88, 232, 1],
];

const environment = (ctx) => {
  fill(ctx, polygon(TREE));
  ctx.fillStyle = INK;
  ctx.fillRect(-390, -9, 570, 11);
  fill(ctx, polygon(GROUND));
  const fish = shape(FISH);
  ctx.fillStyle = WHITE;
  ctx.fill(fish);
  ctx.lineJoin = "miter";
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.stroke(fish);
  circle(ctx, 317, 50, 16);
};

const SYMBOLS = {
  flammable: (ctx) => {
    flame(ctx);
    bar(ctx, -296, 296, 364, 424);
  },
  oxidizer: (ctx) => {
    ctx.save();
    ctx.translate(0, -212);
    ctx.scale(0.9, 0.85);
    flame(ctx);
    ctx.restore();
    circle(ctx, 0, 84, 252);
    circle(ctx, 0, 84, 186, WHITE);
    bar(ctx, -266, 266, 336, 420);
  },
  gas: gasCylinder,
  corrosive: corrosion,
  toxic: skull,
  irritant: exclamation,
  health: healthHazard,
  environment,
};

const diamond = (ctx, r) => {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
};

// GHS diamond centred at (cx, cy); size is the full corner-to-corner width in canvas pixels.
export const drawGhsPictogram = (ctx, key, cx, cy, size) => {
  const symbol = SYMBOLS[key];
  if (!symbol) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / (OUTER * 2), size / (OUTER * 2));
  ctx.lineJoin = "miter";
  diamond(ctx, OUTER);
  ctx.fillStyle = RED;
  ctx.fill();
  diamond(ctx, INNER);
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.clip();
  symbol(ctx);
  ctx.restore();
};

const urls = new Map();

export const ghsDataUrl = (key, size = 96) => {
  const id = `${key}:${size}`;
  if (!urls.has(id)) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    drawGhsPictogram(canvas.getContext("2d"), key, size / 2, size / 2, size);
    urls.set(id, canvas.toDataURL("image/png"));
  }
  return urls.get(id);
};
