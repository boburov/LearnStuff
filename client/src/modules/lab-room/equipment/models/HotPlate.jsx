import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  MeshPhysicalMaterial,
  PlaneGeometry,
  RingGeometry,
  SRGBColorSpace,
  ShapeUtils,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";
import { arc, toVectors } from "../kit/vessel";
import { DEVICE_PRIORITY, useDevice } from "../kit/deviceState";

// Magnetic stirrer hot plate: 160 × 280 × 110 mm housing, Ø135 mm ceramic-glass plate, sloped control panel.
const W = 0.16;
const D = 0.28;
const FOOT_H = 0.005;
const TOP_Y = 0.107;
const FRONT_TOP_Y = 0.058;
const CREASE_Z = 0.028;
const EDGE_R = 0.006;
const PLATE_R = 0.0675;
const PLATE_Z = -0.056;
const PLATE_TOP = 0.11;
const RING_IN = PLATE_R + 0.0003;
const RING_OUT = 0.0702;
const SLOPE = Math.atan2(TOP_Y - FRONT_TOP_Y, D / 2 - CREASE_Z);
const PANEL_W = 0.146;
const PANEL_H = 0.102;
const PANEL_S = 0.0614;
const PANEL_ORIGIN = [0, TOP_Y - Math.sin(SLOPE) * PANEL_S, CREASE_Z + Math.cos(SLOPE) * PANEL_S];
const KNOBS = { heat: [-0.042, -0.019], stir: [0.042, -0.019] };
const LEDS = { heat: [-0.047, 0.026], stir: [0.047, 0.026] };
const DISPLAY = { x: 0, y: 0.026, w: 0.054, h: 0.022 };
const DIAL_START = (225 * Math.PI) / 180;
const DIAL_STEP = Math.PI / 4;
const SEAM = Math.PI;

// Side profile corners [z, y, radius], counter-clockwise with +z to the right.
const PROFILE = [
  [-D / 2, FOOT_H, 0.007],
  [D / 2, FOOT_H, 0.007],
  [D / 2, FRONT_TOP_Y, 0.012],
  [CREASE_Z, TOP_Y, 0.04],
  [-D / 2, TOP_Y, 0.01],
];

const normalize2 = (x, y) => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

// Samples the rounded side profile; `core` is the profile shrunk by the side-edge radius.
const sampleProfile = (corners, edge) => {
  const samples = [];
  corners.forEach(([cz, cy, radius], i) => {
    const [pz, py] = corners[(i - 1 + corners.length) % corners.length];
    const [qz, qy] = corners[(i + 1) % corners.length];
    const dIn = normalize2(cz - pz, cy - py);
    const dOut = normalize2(qz - cz, qy - cy);
    const nIn = [dIn[1], -dIn[0]];
    const nOut = [dOut[1], -dOut[0]];
    const r = Math.max(radius, edge);
    const p1 = [cz - nIn[0] * r, cy - nIn[1] * r];
    const p2 = [cz - nOut[0] * r, cy - nOut[1] * r];
    const s = ((p2[0] - p1[0]) * dOut[1] - (p2[1] - p1[1]) * dOut[0]) / (dIn[0] * dOut[1] - dIn[1] * dOut[0]);
    const center = [p1[0] + dIn[0] * s, p1[1] + dIn[1] * s];
    const a0 = Math.atan2(nIn[1], nIn[0]);
    let a1 = Math.atan2(nOut[1], nOut[0]);
    if (a1 < a0) a1 += Math.PI * 2;
    const steps = Math.max(2, Math.ceil((a1 - a0) / (Math.PI / 16)));
    for (let k = 0; k <= steps; k += 1) {
      const a = a0 + ((a1 - a0) * k) / steps;
      const n = [Math.cos(a), Math.sin(a)];
      samples.push({ n, core: [center[0] + n[0] * (r - edge), center[1] + n[1] * (r - edge)] });
    }
  });
  return samples;
};

const createBuilder = () => {
  const positions = [];
  const normals = [];
  const indices = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const vertex = (p, n) => {
    positions.push(...p);
    normals.push(...n);
    return positions.length / 3 - 1;
  };
  // Emits the triangle facing its vertex normals; slivers are dropped.
  const triangle = (i0, i1, i2) => {
    a.fromArray(positions, i0 * 3);
    b.fromArray(positions, i1 * 3).sub(a);
    c.fromArray(positions, i2 * 3).sub(a);
    const cross = b.clone().cross(c);
    if (cross.lengthSq() < 1e-16) return;
    const nx = normals[i0 * 3] + normals[i1 * 3] + normals[i2 * 3];
    const ny = normals[i0 * 3 + 1] + normals[i1 * 3 + 1] + normals[i2 * 3 + 1];
    const nz = normals[i0 * 3 + 2] + normals[i1 * 3 + 2] + normals[i2 * 3 + 2];
    if (cross.x * nx + cross.y * ny + cross.z * nz >= 0) indices.push(i0, i1, i2);
    else indices.push(i0, i2, i1);
  };
  const build = () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(new Array((positions.length / 3) * 2).fill(0), 2));
    geometry.setIndex(indices);
    return geometry;
  };
  return { vertex, triangle, build };
};

// Side profile extruded across the width with every edge between the sides and the profile rounded.
const buildHousing = () => {
  const samples = sampleProfile(PROFILE, EDGE_R);
  const { vertex, triangle, build } = createBuilder();
  const K = 5;
  const rows = 2 * (K + 1);
  const hx = W / 2 - EDGE_R;
  samples.forEach(({ n: [nz, ny], core: [cz, cy] }) => {
    for (let k = 0; k < rows; k += 1) {
      const side = k <= K ? 1 : -1;
      const angle = ((k <= K ? k : rows - 1 - k) / K) * (Math.PI / 2);
      const co = Math.cos(angle);
      const si = Math.sin(angle);
      vertex([side * (hx + EDGE_R * co), cy + EDGE_R * si * ny, cz + EDGE_R * si * nz], [side * co, si * ny, si * nz]);
    }
  });
  for (let i = 0; i < samples.length; i += 1) {
    const j = (i + 1) % samples.length;
    for (let k = 0; k < rows - 1; k += 1) {
      triangle(i * rows + k, j * rows + k, j * rows + k + 1);
      triangle(i * rows + k, j * rows + k + 1, i * rows + k + 1);
    }
  }
  const contour = [];
  samples.forEach(({ core }) => {
    const last = contour[contour.length - 1];
    if (!last || Math.hypot(last.x - core[0], last.y - core[1]) > 1e-7) contour.push(new Vector2(core[0], core[1]));
  });
  if (contour[0].distanceTo(contour[contour.length - 1]) < 1e-7) contour.pop();
  const faces = ShapeUtils.triangulateShape(contour, []);
  [1, -1].forEach((side) => {
    const ids = contour.map((p) => vertex([side * (W / 2), p.y, p.x], [side, 0, 0]));
    faces.forEach(([i0, i1, i2]) => triangle(ids[i0], ids[i1], ids[i2]));
  });
  return build();
};

const PLATE_PROFILE = [
  [PLATE_R - 0.004, TOP_Y - 0.001],
  [PLATE_R, TOP_Y - 0.001],
  [PLATE_R, PLATE_TOP - 0.0013],
  ...arc(PLATE_R - 0.0013, PLATE_TOP - 0.0013, 0.0013, 0, Math.PI / 2, 4).slice(1),
  [0, PLATE_TOP],
];

const RING_PROFILE = [
  [RING_OUT, TOP_Y - 0.001],
  [RING_OUT, PLATE_TOP - 0.0015],
  ...arc(RING_OUT - 0.0007, PLATE_TOP - 0.0015, 0.0007, 0, Math.PI / 2, 3).slice(1),
  [RING_IN + 0.0005, PLATE_TOP - 0.0008],
  [RING_IN, PLATE_TOP - 0.0013],
  [RING_IN, TOP_Y - 0.001],
];

const KNOB_PROFILE = [
  [0.0138, 0],
  [0.015, 0.0007],
  [0.015, 0.0021],
  [0.0144, 0.0029],
  [0.0127, 0.0031],
  [0.0124, 0.0042],
  [0.0115, 0.0158],
  ...arc(0.0103, 0.0161, 0.0013, -0.25, Math.PI / 2, 4).slice(1),
  [0, 0.0174],
];

const onPanel = (geometry, x, y, z = 0) => geometry.translate(x, y, z);

// RoundedBoxGeometry is non-indexed, so everything is flattened before merging.
const merge = (parts) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)));

const buildKnob = () => {
  const knob = new LatheGeometry(toVectors(KNOB_PROFILE), 40, SEAM, Math.PI * 2);
  knob.rotateX(Math.PI / 2);
  return knob;
};

const buildDarkParts = () => {
  const parts = [];
  const bezel = new RoundedBoxGeometry(DISPLAY.w + 0.006, DISPLAY.h + 0.006, 0.0016, 2, 0.0012);
  parts.push(onPanel(bezel, DISPLAY.x, DISPLAY.y, 0.0006));
  const lens = new RoundedBoxGeometry(DISPLAY.w, DISPLAY.h, 0.0012, 2, 0.0008);
  parts.push(onPanel(lens, DISPLAY.x, DISPLAY.y, 0.0016));
  Object.values(LEDS).forEach(([x, y]) => {
    const ring = new CylinderGeometry(0.0031, 0.0033, 0.0009, 20);
    ring.rotateX(Math.PI / 2);
    parts.push(onPanel(ring, x, y, 0.0004));
  });
  return merge(parts);
};

const buildSideParts = () => {
  const parts = [];
  [1, -1].forEach((side) => {
    for (let i = 0; i < 6; i += 1) {
      const slot = new RoundedBoxGeometry(0.0012, 0.024, 0.0028, 1, 0.0013);
      slot.translate(side * (W / 2 - 0.0004), 0.058, -0.118 + i * 0.0068);
      parts.push(slot);
    }
  });
  const bezel = new RoundedBoxGeometry(0.004, 0.017, 0.026, 2, 0.0012);
  bezel.translate(W / 2 + 0.0006, 0.031, 0.1);
  const rocker = new RoundedBoxGeometry(0.004, 0.012, 0.021, 2, 0.0014);
  rocker.rotateY(0.11);
  rocker.translate(W / 2 + 0.0022, 0.031, 0.1);
  parts.push(bezel, rocker, buildSeam(0.021));
  return merge(parts);
};

// Parting line between the top cover and the base tray.
const buildSeam = (y) => {
  const { vertex, triangle, build } = createBuilder();
  const r = EDGE_R;
  const loop = [];
  [
    [W / 2 - r, D / 2 - r, 0],
    [-(W / 2 - r), D / 2 - r, Math.PI / 2],
    [-(W / 2 - r), -(D / 2 - r), Math.PI],
    [W / 2 - r, -(D / 2 - r), Math.PI * 1.5],
  ].forEach(([cx, cz, start]) => {
    for (let i = 0; i <= 4; i += 1) {
      const a = start + (i / 4) * (Math.PI / 2);
      loop.push([cx + Math.cos(a) * (r + 0.00012), cz + Math.sin(a) * (r + 0.00012), Math.cos(a), Math.sin(a)]);
    }
  });
  const rows = loop.map(([x, z, nx, nz]) => [vertex([x, y - 0.0004, z], [nx, 0, nz]), vertex([x, y + 0.0004, z], [nx, 0, nz])]);
  rows.forEach(([a0, a1], i) => {
    const [b0, b1] = rows[(i + 1) % rows.length];
    triangle(a0, b0, b1);
    triangle(a0, b1, a1);
  });
  return build();
};

const buildSwitchMarks = () => {
  const tilt = 0.11;
  const onFace = (geometry, z) => {
    geometry.rotateY(tilt);
    geometry.translate(W / 2 + 0.0022 + 0.00205 * Math.cos(tilt) + z * Math.sin(tilt), 0.031, 0.1 - 0.00205 * Math.sin(tilt) + z * Math.cos(tilt));
    return geometry;
  };
  const on = onFace(new BoxGeometry(0.0004, 0.0045, 0.0007), 0.0062);
  const off = new TorusGeometry(0.0016, 0.00033, 6, 20);
  off.rotateY(Math.PI / 2);
  return merge([on, onFace(off, -0.0062)]);
};

const buildFeet = () =>
  mergeGeometries(
    [
      [-0.058, -0.112],
      [0.058, -0.112],
      [-0.058, 0.112],
      [0.058, 0.112],
    ].map(([x, z]) => {
      const foot = new CylinderGeometry(0.0085, 0.0095, FOOT_H + 0.002, 20);
      foot.translate(x, (FOOT_H + 0.002) / 2, z);
      return foot;
    }),
  );

const buildLed = () => {
  const dome = new SphereGeometry(0.0022, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  dome.scale(1, 0.55, 1);
  dome.rotateX(Math.PI / 2);
  return dome;
};

const FONT = "Inter, 'Segoe UI', Arial, sans-serif";
const PX = 9000;

const dialAngle = (level) => DIAL_START - level * DIAL_STEP;

const drawDial = (ctx, X, Y, [cx, cy], color, label) => {
  const at = (r, a) => [X(cx + Math.cos(a) * r), Y(cy + Math.sin(a) * r)];
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i <= 48; i += 1) {
    const a = dialAngle((6 * i) / 48);
    ctx.lineTo(...at(0.0161 + 0.0003 + (0.0019 * i) / 48, a));
  }
  for (let i = 48; i >= 0; i -= 1) ctx.lineTo(...at(0.0161, dialAngle((6 * i) / 48)));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#2c3136";
  ctx.fillStyle = "#2c3136";
  for (let i = 0; i <= 12; i += 1) {
    const a = dialAngle(i / 2);
    const major = i % 2 === 0;
    ctx.lineWidth = major ? 0.0005 * PX : 0.00032 * PX;
    ctx.beginPath();
    ctx.moveTo(...at(0.0188, a));
    ctx.lineTo(...at(major ? 0.0212 : 0.0201, a));
    ctx.stroke();
    if (major) {
      ctx.font = `600 ${Math.round(0.0031 * PX)}px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i / 2), ...at(0.0238, a));
    }
  }
  ctx.font = `700 ${Math.round(0.0026 * PX)}px ${FONT}`;
  ctx.fillText(label, X(cx), Y(cy - 0.0235));
};

const createPanelTexture = () => {
  const w = Math.round(PANEL_W * PX);
  const h = Math.round(PANEL_H * PX);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const X = (m) => w / 2 + m * PX;
  const Y = (m) => h / 2 - m * PX;
  ctx.fillStyle = "#cdd2d7";
  ctx.beginPath();
  ctx.roundRect(X(-0.0695), Y(0.0495), 0.139 * PX, 0.099 * PX, 0.004 * PX);
  ctx.fill();
  ctx.strokeStyle = "#a9b0b7";
  ctx.lineWidth = 0.0005 * PX;
  ctx.stroke();
  drawDial(ctx, X, Y, KNOBS.heat, "#e2571c", "ISITISH");
  drawDial(ctx, X, Y, KNOBS.stir, "#1d6fc6", "ARALASHTIRISH");
  ctx.fillStyle = "#2c3136";
  ctx.font = `700 ${Math.round(0.0024 * PX)}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("°C", X(LEDS.heat[0]), Y(LEDS.heat[1] - 0.0062));
  ctx.fillText("rpm", X(LEDS.stir[0]), Y(LEDS.stir[1] - 0.0062));
  ctx.font = `600 ${Math.round(0.0022 * PX)}px ${FONT}`;
  ctx.fillText("MAGNIT ARALASHTIRGICH  ·  ISITGICH", X(0), Y(0.0435));
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const createIndexTexture = (color) => {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(58, 6, 12, 50, 6);
  ctx.fill();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const SEGMENTS = {
  0: "abcdef",
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
  6: "afgedc",
  7: "abc",
  8: "abcdefg",
  9: "abcdfg",
  "-": "g",
};

const drawDigit = (ctx, x, y, dw, dh, t, lit) => {
  const g = t * 0.18;
  const hSeg = (sx, sy) => [
    [sx + g, sy],
    [sx + t / 2 + g, sy - t / 2],
    [sx + dw - t / 2 - g, sy - t / 2],
    [sx + dw - g, sy],
    [sx + dw - t / 2 - g, sy + t / 2],
    [sx + t / 2 + g, sy + t / 2],
  ];
  const vSeg = (sx, sy) => [
    [sx, sy + g],
    [sx + t / 2, sy + t / 2 + g],
    [sx + t / 2, sy + dh / 2 - t / 2 - g],
    [sx, sy + dh / 2 - g],
    [sx - t / 2, sy + dh / 2 - t / 2 - g],
    [sx - t / 2, sy + t / 2 + g],
  ];
  const shapes = {
    a: hSeg(x, y),
    b: vSeg(x + dw, y),
    c: vSeg(x + dw, y + dh / 2),
    d: hSeg(x, y + dh),
    e: vSeg(x, y + dh / 2),
    f: vSeg(x, y),
    g: hSeg(x, y + dh / 2),
  };
  Object.entries(shapes).forEach(([name, points]) => {
    ctx.fillStyle = lit.includes(name) ? "#ff2a14" : "#2b0805";
    ctx.beginPath();
    points.forEach(([px, py]) => ctx.lineTo(px, py));
    ctx.closePath();
    ctx.fill();
  });
};

const drawDisplay = (display, value) => {
  const { canvas, texture } = display;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, w, h);
  const text = String(Math.max(-99, Math.min(999, Math.round(value)))).padStart(3, " ");
  const dw = w * 0.13;
  const dh = h * 0.56;
  const t = w * 0.026;
  ctx.setTransform(1, 0, -0.08, 1, 0, 0);
  [...text].forEach((ch, i) => {
    drawDigit(ctx, w * 0.14 + i * (dw + w * 0.07), h * 0.2, dw, dh, t, SEGMENTS[ch] ?? "");
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#ff2a14";
  ctx.font = `700 ${Math.round(h * 0.3)}px ${FONT}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("°C", w * 0.76, h * 0.17);
  texture.needsUpdate = true;
};

// Repaints the seven-segment display only when the shown whole degree changes.
const showDegrees = (display, celsius) => {
  const value = Math.max(-99, Math.min(999, Math.round(celsius)));
  if (value === display.shown) return;
  display.shown = value;
  drawDisplay(display, value);
};

const createDisplay = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 208;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  // Anti-glare window: low specular so the ceiling lights don't wash out the digits.
  const material = new MeshPhysicalMaterial({
    color: "#050404",
    roughness: 0.16,
    specularIntensity: 0.3,
    envMapIntensity: 0.6,
    emissive: "#ffffff",
    emissiveMap: texture,
    emissiveIntensity: 1.35,
  });
  return { canvas, texture, material, shown: null };
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const displayFace = new PlaneGeometry(DISPLAY.w - 0.0024, DISPLAY.h - 0.0024);
  displayFace.translate(DISPLAY.x, DISPLAY.y, 0.00225);
  const indexDisk = new CircleGeometry(0.0098, 24);
  indexDisk.translate(0, 0, 0.01745);
  const panelPrint = new PlaneGeometry(PANEL_W, PANEL_H);
  panelPrint.translate(0, 0, 0.00025);
  const gap = new RingGeometry(PLATE_R - 0.003, RING_IN + 0.0004, 64);
  gap.rotateX(-Math.PI / 2);
  gap.translate(0, TOP_Y + 0.0002, 0);
  assets = {
    housing: buildHousing(),
    plate: new LatheGeometry(toVectors(PLATE_PROFILE), 72, SEAM, Math.PI * 2),
    ring: new LatheGeometry(toVectors(RING_PROFILE), 72, SEAM, Math.PI * 2),
    gap,
    knob: buildKnob(),
    indexDisk,
    led: buildLed(),
    darkParts: buildDarkParts(),
    sideParts: buildSideParts(),
    switchMarks: buildSwitchMarks(),
    feet: buildFeet(),
    displayFace,
    panelPrint,
  };
  return assets;
};

// Ceramic plate with the heating spiral glowing faintly through it once the surface is hot.
const createPlateMaterial = () => {
  const material = new MeshPhysicalMaterial({ color: "#c4c8cb", roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.06 });
  const uniforms = { uHeat: { value: 0 } };
  material.userData.heat = uniforms.uHeat;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPlateLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPlateLocal = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uHeat;\nvarying vec3 vPlateLocal;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        if ( uHeat > 0.001 ) {
          float ring = 0.5 + 0.5 * cos( length( vPlateLocal.xz ) * 420.0 );
          float disc = 1.0 - smoothstep( 0.03, 0.062, length( vPlateLocal.xz ) );
          totalEmissiveRadiance += vec3( 1.0, 0.22, 0.04 ) * uHeat * disc * ( 0.2 + 0.5 * ring ) * 0.35;
        }`,
      );
  };
  material.customProgramCacheKey = () => "hot-plate-plate";
  return material;
};

// Knob angles, indicator lamps and plate glow, driven once per frame from the device.
const createPlateState = (heatLevel, stirLevel) => {
  const state = { heat: heatLevel, stir: stirLevel, glow: 0, blink: 0 };
  return {
    update: (device, dt, refs) => {
      const step = 1 - Math.exp(-Math.min(dt, 0.1) / 0.12);
      const level = device ? device.level ?? 0 : heatLevel;
      const stir = device ? (device.stir ? 3 : 0) : stirLevel;
      state.heat += (level - state.heat) * step;
      state.stir += (stir - state.stir) * step;
      if (refs.heatKnob) refs.heatKnob.rotation.z = dialAngle(state.heat) - Math.PI / 2;
      if (refs.stirKnob) refs.stirKnob.rotation.z = dialAngle(state.stir) - Math.PI / 2;
      if (!device) return;
      const plateC = device.plateC ?? 22;
      showDegrees(refs.display, plateC);
      state.glow += (Math.max(0, Math.min(1, (plateC - 170) / 160)) - state.glow) * (1 - Math.exp(-Math.min(dt, 0.1) / 0.8));
      if (refs.plateHeat) refs.plateHeat.value = state.glow;
      // The thermostat cycles once the plate is at its set point, so the lamp blinks instead of staying lit.
      state.blink += dt;
      const heating = level > 0 && (plateC < (device.setC ?? 0) - 2 || state.blink % 1.6 < 0.9);
      if (refs.heatLed) refs.heatLed.material.emissiveIntensity = heating ? LED_COLORS.heat.glow : 0;
      if (refs.stirLed) refs.stirLed.material.emissiveIntensity = device.stir ? LED_COLORS.stir.glow : 0;
    },
  };
};

const LED_COLORS = {
  heat: { off: "#4a2410", on: "#ff5a0a", glow: 1.8 },
  stir: { off: "#15361c", on: "#22ff4a", glow: 1.4 },
};

const Led = ({ ref, geometry, position, colors, on }) => (
  <mesh ref={ref} geometry={geometry} position={position}>
    <meshStandardMaterial
      color={on ? colors.on : colors.off}
      emissive={on ? colors.on : "#000000"}
      emissiveIntensity={on ? colors.glow : 0}
      roughness={0.2}
    />
  </mesh>
);

const Knob = ({ ref, kit, geometry, indexDisk, indexMaterial, position, level }) => (
  <group ref={ref} position={position} rotation-z={dialAngle(level) - Math.PI / 2}>
    <mesh geometry={geometry} material={kit.plasticDark} castShadow />
    <mesh geometry={indexDisk} material={indexMaterial} />
  </group>
);

const HotPlate = ({ simId, displayC = 25, heating = false, stirring = false, heatLevel, stirLevel, ...props }) => {
  const kit = useKit();
  const a = getAssets();
  const display = useMemo(() => createDisplay(), []);
  useEffect(() => showDegrees(display, displayC), [display, displayC]);
  useEffect(
    () => () => {
      display.texture.dispose();
      display.material.dispose();
    },
    [display],
  );
  const plateMaterial = useMemo(() => createPlateMaterial(), []);
  useEffect(() => () => plateMaterial.dispose(), [plateMaterial]);
  const panelMaterial = kit.print("hot-plate-panel", createPanelTexture);
  const heatIndex = kit.print("hot-plate-index-heat", () => createIndexTexture("#ff6a1f"));
  const stirIndex = kit.print("hot-plate-index-stir", () => createIndexTexture("#2f8cff"));
  const { device } = useDevice(simId);
  const refs = useRef({});
  const live = useMemo(
    () => createPlateState(heatLevel ?? (heating ? 4 : 0), stirLevel ?? (stirring ? 3 : 0)),
    [heatLevel, heating, stirLevel, stirring],
  );
  useFrame((_, delta) => {
    const r = refs.current;
    r.display = display;
    r.plateHeat = plateMaterial.userData.heat;
    live.update(device, delta, r);
  }, DEVICE_PRIORITY);

  return (
    <group {...props}>
      <mesh geometry={a.housing} material={kit.plasticWhite} castShadow receiveShadow />
      <mesh geometry={a.feet} material={kit.rubberBlack} />
      <mesh geometry={a.sideParts} material={kit.plasticDark} castShadow />
      <mesh geometry={a.switchMarks} material={kit.plasticWhite} />
      <group position-z={PLATE_Z}>
        <mesh geometry={a.plate} material={plateMaterial} castShadow receiveShadow />
        <mesh geometry={a.ring} material={kit.steel} castShadow receiveShadow />
        <mesh geometry={a.gap} material={kit.plasticDark} />
      </group>
      <group position={PANEL_ORIGIN} rotation-x={SLOPE - Math.PI / 2}>
        <mesh geometry={a.panelPrint} material={panelMaterial} receiveShadow />
        <mesh geometry={a.darkParts} material={kit.plasticDark} />
        <mesh geometry={a.displayFace} material={display.material} />
        <Led ref={(led) => { refs.current.heatLed = led; }} geometry={a.led} position={[...LEDS.heat, 0.0009]} colors={LED_COLORS.heat} on={heating} />
        <Led ref={(led) => { refs.current.stirLed = led; }} geometry={a.led} position={[...LEDS.stir, 0.0009]} colors={LED_COLORS.stir} on={stirring} />
        <Knob
          ref={(knob) => { refs.current.heatKnob = knob; }}
          kit={kit}
          geometry={a.knob}
          indexDisk={a.indexDisk}
          indexMaterial={heatIndex}
          position={[...KNOBS.heat, 0]}
          level={heatLevel ?? (heating ? 4 : 0)}
        />
        <Knob
          ref={(knob) => { refs.current.stirKnob = knob; }}
          kit={kit}
          geometry={a.knob}
          indexDisk={a.indexDisk}
          indexMaterial={stirIndex}
          position={[...KNOBS.stir, 0]}
          level={stirLevel ?? (stirring ? 3 : 0)}
        />
      </group>
      <group scale={[0.64, 1, 1.08]}>
        <BlobShadow radius={0.15} opacity={0.34} />
      </group>
    </group>
  );
};

export default HotPlate;
