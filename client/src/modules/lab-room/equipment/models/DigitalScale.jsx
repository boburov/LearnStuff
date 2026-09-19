import { useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Shape,
  SphereGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";
import { toVectors } from "../kit/vessel";
import { DEVICE_PRIORITY, useDevice } from "../kit/deviceState";

// Compact precision balance 200 g × 0.01 g: 130 × 190 × 45 mm body, Ø100 mm pan, sloped front panel with LCD.
const MM = 0.001;
const BODY = { halfWidth: 65, halfDepth: 95, top: 45, feet: 3, split: 14 };
const SLOPE = { from: [25, 45], to: [95, 29] };
const PAN = { z: -35, radius: 50, base: 50 };
const LEVEL = { x: 50, z: 6 };
const FONT = "Inter, 'Segoe UI', Arial, sans-serif";

const slopeLength = Math.hypot(SLOPE.to[0] - SLOPE.from[0], SLOPE.to[1] - SLOPE.from[1]);
const DIR = [(SLOPE.to[0] - SLOPE.from[0]) / slopeLength, (SLOPE.to[1] - SLOPE.from[1]) / slopeLength];
const NORMAL = [-DIR[1], DIR[0]];
const SLOPE_ANGLE = Math.atan2(-DIR[1], DIR[0]);
const PANEL_START = [SLOPE.from[0] + DIR[0] * 11.7, SLOPE.from[1] + DIR[1] * 11.7];

// Point on the sloped front panel: d mm down the slope from where the crease ends, h mm above it.
const onPanel = (x, d, h = 0) => [
  x * MM,
  (PANEL_START[1] + DIR[1] * d + NORMAL[1] * h) * MM,
  (PANEL_START[0] + DIR[0] * d + NORMAL[0] * h) * MM,
];

const buildCover = () => {
  const s = new Shape();
  const [z0, z1] = [-BODY.halfDepth, BODY.halfDepth];
  s.moveTo(z0, 9);
  s.lineTo(z0, BODY.top - 8);
  s.quadraticCurveTo(z0, BODY.top, z0 + 8, BODY.top);
  s.lineTo(SLOPE.from[0] - 12, BODY.top);
  s.quadraticCurveTo(SLOPE.from[0], BODY.top, PANEL_START[0], PANEL_START[1]);
  s.lineTo(SLOPE.to[0] - DIR[0] * 6, SLOPE.to[1] - DIR[1] * 6);
  s.quadraticCurveTo(z1, SLOPE.to[1], z1, SLOPE.to[1] - 6);
  s.lineTo(z1, 9);
  s.lineTo(z0, 9);
  const bevel = 5;
  const geometry = new ExtrudeGeometry(s, {
    depth: BODY.halfWidth * 2 - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 5,
    curveSegments: 10,
  });
  geometry.translate(0, 0, -(BODY.halfWidth - bevel));
  geometry.rotateY(-Math.PI / 2);
  geometry.scale(MM, MM, MM);
  geometry.deleteAttribute("uv");
  return toCreasedNormals(geometry, Math.PI / 5);
};

const buildPan = () => {
  const { radius: r, base: y } = PAN;
  const profile = [
    [0, y], [r - 3.5, y], [r - 1.6, y + 0.35], [r - 0.55, y + 1.2], [r - 0.05, y + 2.4], [r, y + 2.95],
    [r - 0.25, y + 3.2], [r - 0.65, y + 3.1], [r - 0.9, y + 2.7], [r - 1.4, y + 1.6], [r - 2.4, y + 1.0],
    [r - 4, y + 0.8], [0, y + 0.8],
  ];
  const geometry = new LatheGeometry(toVectors(profile.map(([pr, py]) => [pr * MM, py * MM])), 72);
  geometry.translate(0, 0, PAN.z * MM);
  return geometry;
};

const buildCollar = () => {
  const top = BODY.top;
  const profile = [[16.2, top - 0.5], [16.1, top + 1.0], [15.5, top + 1.5], [7.5, top + 1.5], [7, top + 1.0], [7, top - 0.5]];
  const geometry = new LatheGeometry(toVectors(profile.map(([r, y]) => [r * MM, y * MM])), 40);
  geometry.translate(0, 0, PAN.z * MM);
  return geometry;
};

const buildLevel = () => {
  const top = BODY.top;
  const ring = new LatheGeometry(
    toVectors([[6.8, top - 0.3], [6.6, top + 0.7], [6.2, top + 1.1], [4.6, top + 1.1]].map(([r, y]) => [r * MM, y * MM])),
    32,
  );
  const dome = new SphereGeometry(11.5 * MM, 28, 5, 0, Math.PI * 2, 0, 0.42);
  dome.translate(0, (top + 1.1 - 11.5 * Math.cos(0.42)) * MM, 0);
  const vial = new CylinderGeometry(4.7 * MM, 4.7 * MM, 0.2 * MM, 28);
  vial.translate(0, (top + 0.6) * MM, 0);
  const bubble = new SphereGeometry(1.35 * MM, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  bubble.scale(1, 0.45, 1);
  bubble.translate(0.6 * MM, (top + 0.95) * MM, -0.4 * MM);
  [ring, dome, vial, bubble].forEach((g) => g.translate(LEVEL.x * MM, 0, LEVEL.z * MM));
  return { ring, dome, vial, bubble };
};

const panelPlane = (width, height, center, lift) => {
  const geometry = new PlaneGeometry(width * MM, height * MM);
  geometry.rotateX(-(Math.PI / 2 - SLOPE_ANGLE));
  geometry.translate(...onPanel(0, center, lift));
  return geometry;
};

const createPanelTexture = () => {
  const [w, h, k] = [116, 50, 10];
  const canvas = document.createElement("canvas");
  canvas.width = w * k;
  canvas.height = h * k;
  const ctx = canvas.getContext("2d");
  const box = (x, y, bw, bh, r) => {
    ctx.beginPath();
    ctx.roundRect(x * k, y * k, bw * k, bh * k, r * k);
  };
  const text = (value, x, y, size, weight = 700) => {
    ctx.font = `${weight} ${size * k}px ${FONT}`;
    ctx.fillText(value, x * k, y * k);
  };
  box(0, 0, w, h, 4);
  ctx.fillStyle = "#2c3036";
  ctx.fill();
  box(0.6, 0.6, w - 1.2, h - 1.2, 3.5);
  ctx.strokeStyle = "#474d55";
  ctx.lineWidth = 3;
  ctx.stroke();
  box(24.5, 1.8, 67, 25.4, 2.2);
  ctx.fillStyle = "#1b1e22";
  ctx.fill();
  ctx.fillStyle = "#e9ecef";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  [["YOQISH", -26], ["TARA", 0], ["REJIM", 26]].forEach(([label, x]) => text(label, x + w / 2, 45.4, 3.1));
  text("Maks. 200 g", 12.2, 11, 2.5, 600);
  text("d = 0,01 g", 12.2, 16, 2.5, 600);
  text("g  ct  oz", 103.8, 13.5, 2.5, 600);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const SEGMENTS = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g", " ": "" };

const segmentPaths = (w, h, t) => {
  const bar = (x0, y0, x1, y1) => {
    const horizontal = y0 === y1;
    const g = t * 0.12;
    return horizontal
      ? [[x0 + g, y0], [x0 + t / 2 + g, y0 - t / 2], [x1 - t / 2 - g, y1 - t / 2], [x1 - g, y1], [x1 - t / 2 - g, y1 + t / 2], [x0 + t / 2 + g, y0 + t / 2]]
      : [[x0, y0 + g], [x0 + t / 2, y0 + t / 2 + g], [x1 + t / 2, y1 - t / 2 - g], [x1, y1 - g], [x1 - t / 2, y1 - t / 2 - g], [x0 - t / 2, y0 + t / 2 + g]];
  };
  const [l, r, top, mid, bottom] = [t / 2, w - t / 2, t / 2, h / 2, h - t / 2];
  return {
    a: bar(l, top, r, top),
    b: bar(r, top, r, mid),
    c: bar(r, mid, r, bottom),
    d: bar(l, bottom, r, bottom),
    e: bar(l, mid, l, bottom),
    f: bar(l, top, l, mid),
    g: bar(l, mid, r, mid),
  };
};

const formatReading = (grams) => {
  const value = Math.max(-99.99, Math.min(210, Number(grams) || 0));
  const text = Math.abs(value).toFixed(2).replace(".", "");
  const cells = text.padStart(5, " ").split("");
  const firstDigit = cells.findIndex((c) => c !== " ");
  if (value < 0 && Math.abs(value) >= 0.005 && firstDigit > 0) cells[firstDigit - 1] = "-";
  return cells;
};

const LCD = { w: 60, h: 20, k: 20 };

const paintLcd = (display, grams) => {
  const [w, h, k] = [LCD.w, LCD.h, LCD.k];
  const ctx = display.ctx;
  const bg = ctx.createLinearGradient(0, 0, 0, h * k);
  bg.addColorStop(0, "#7f8b7a");
  bg.addColorStop(0.18, "#a3ae9b");
  bg.addColorStop(1, "#98a491");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w * k, h * k);

  const [cw, ch, thick, gap] = [7.4 * k, 12.6 * k, 1.55 * k, 2.2 * k];
  const paths = segmentPaths(cw, ch, thick);
  const cells = formatReading(grams);
  const left = 4.2 * k;
  const top = 4.1 * k;
  const drawPoly = (points, x, y) => {
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, x + px - py * 0.08, y + py));
    ctx.closePath();
    ctx.fill();
  };
  cells.forEach((cell, i) => {
    const x = left + i * (cw + gap) + 0.1 * ch;
    const lit = SEGMENTS[cell] ?? "";
    Object.entries(paths).forEach(([name, points]) => {
      ctx.fillStyle = lit.includes(name) ? "#1a211c" : "rgba(40, 52, 42, 0.045)";
      drawPoly(points, x, top);
    });
  });
  ctx.fillStyle = "#1a211c";
  const dotX = left + 3 * (cw + gap) - gap / 2 - 0.02 * ch;
  ctx.beginPath();
  ctx.arc(dotX, top + ch - thick / 2, thick * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 ${7.2 * k}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("g", left + 5 * (cw + gap) + 2.6 * k, top + ch - 0.4 * k);
  ctx.beginPath();
  ctx.arc(1.8 * k, 3.2 * k, 0.75 * k, 0, Math.PI * 2);
  ctx.lineWidth = 0.32 * k;
  ctx.strokeStyle = "#1a211c";
  ctx.stroke();

  const shade = ctx.createLinearGradient(0, 0, 0, 2.2 * k);
  shade.addColorStop(0, "rgba(0, 0, 0, 0.35)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w * k, 2.2 * k);
  display.texture.needsUpdate = true;
};

// One canvas for the whole session; the digits are repainted only when the reading moves a step.
const createLcdDisplay = (grams) => {
  const canvas = document.createElement("canvas");
  canvas.width = LCD.w * LCD.k;
  canvas.height = LCD.h * LCD.k;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  const display = {
    canvas,
    ctx: canvas.getContext("2d"),
    texture,
    material: new MeshStandardMaterial({ map: texture, roughness: 0.16, metalness: 0 }),
    shown: grams,
  };
  paintLcd(display, grams);
  return display;
};

// A real balance takes a moment to settle on a new mass.
const settleReading = (display, target, dt) => {
  const next = display.shown + (target - display.shown) * (1 - Math.exp(-Math.min(dt, 0.1) / 0.18));
  const value = Math.abs(next - target) < 0.004 ? target : next;
  if (Math.abs(value - display.shown) < 0.004 && value !== target) return;
  display.shown = value;
  paintLcd(display, value);
};

const createLevelTexture = () => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#c9d8b4";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#1d1f1d";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const base = new RoundedBoxGeometry(
    (BODY.halfWidth * 2 + 1.2) * MM,
    (BODY.split - BODY.feet) * MM,
    (BODY.halfDepth * 2 + 1.2) * MM,
    3,
    3 * MM,
  );
  base.translate(0, ((BODY.split + BODY.feet) / 2) * MM, 0);
  const foot = new CylinderGeometry(6 * MM, 6.5 * MM, BODY.feet * MM, 20);
  foot.translate(0, (BODY.feet / 2) * MM, 0);
  const spindle = new CylinderGeometry(4 * MM, 4 * MM, (PAN.base - BODY.top) * MM, 20, 1, true);
  spindle.translate(0, ((PAN.base + BODY.top) / 2) * MM, PAN.z * MM);
  const button = new RoundedBoxGeometry(17 * MM, 1.8 * MM, 8.5 * MM, 3, 0.85 * MM);
  assets = {
    cover: buildCover(),
    base,
    foot,
    pan: buildPan(),
    collar: buildCollar(),
    spindle,
    level: buildLevel(),
    button,
    panel: panelPlane(116, 50, 27, 0.12),
    lcd: panelPlane(60, 20, 15, 0.3),
    buttons: [-26, 0, 26].map((x) => onPanel(x, 36, 0.6)),
    feet: [[-50, -78], [50, -78], [-50, 78], [50, 78]].map(([x, z]) => [x * MM, 0, z * MM]),
    panTop: [0, (PAN.base + 0.8) * MM, PAN.z * MM],
  };
  return assets;
};

const DigitalScale = ({ simId, readingG = 0, ...props }) => {
  const kit = useKit();
  const { cover, base, foot, pan, collar, spindle, level, button, panel, lcd, buttons, feet } = getAssets();
  const panelMaterial = kit.print("digital-scale-panel", createPanelTexture);
  const levelMaterial = kit.print("digital-scale-level", createLevelTexture);
  const [display] = useState(() => createLcdDisplay(readingG));
  const { device } = useDevice(simId);
  useEffect(() => paintLcd(display, readingG), [display, readingG]);
  useFrame((_, delta) => {
    if (device) settleReading(display, device.readingG ?? 0, delta);
  }, DEVICE_PRIORITY);
  useEffect(
    () => () => {
      display.texture.dispose();
      display.material.dispose();
    },
    [display],
  );

  return (
    <group {...props}>
      <mesh geometry={cover} material={kit.plasticWhite} castShadow receiveShadow />
      <mesh geometry={base} material={kit.plasticGray} castShadow />
      {feet.map((position) => (
        <mesh key={position.join()} geometry={foot} material={kit.rubberBlack} position={position} />
      ))}
      <mesh geometry={collar} material={kit.plasticGray} castShadow receiveShadow />
      <mesh geometry={spindle} material={kit.steel} />
      <mesh geometry={pan} material={kit.steel} castShadow receiveShadow />
      <mesh geometry={panel} material={panelMaterial} receiveShadow />
      <mesh geometry={lcd} material={display.material} />
      {buttons.map((position) => (
        <mesh
          key={position.join()}
          geometry={button}
          material={kit.plasticGray}
          position={position}
          rotation-x={SLOPE_ANGLE}
          castShadow
        />
      ))}
      <mesh geometry={level.ring} material={kit.plasticDark} />
      <mesh geometry={level.vial} material={levelMaterial} />
      <mesh geometry={level.bubble} material={kit.plasticWhite} />
      <mesh geometry={level.dome} material={kit.glass} renderOrder={3} />
      <group scale={[0.75, 1, 1.02]}>
        <BlobShadow radius={0.1} opacity={0.42} />
      </group>
    </group>
  );
};

export default DigitalScale;
