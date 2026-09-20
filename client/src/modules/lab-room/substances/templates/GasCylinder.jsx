import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { useKit } from "../../equipment/kit/kitContext";
import BlobShadow from "../../equipment/kit/BlobShadow";
import { createGasTagTexture } from "../labels/substanceLabel";
import { MM, SEAM, arc, buildWrapLabel, dedupe, ellipse, faceted, lathe, merge, random, seedOf } from "./shapeUtils";
import { createBrass, disposeMaterial } from "./containerMaterials";
import { DEVICE_PRIORITY, useDevice } from "../../equipment/kit/deviceState";

// Steel lecture bottle Ø51 × 380 mm with elliptical heads, standing in a black foot ring; brass valve with a side outlet.
const R = 25.5 * MM;
const BOTTOM = 8 * MM;
const HEAD = 16 * MM;
const LENGTH = 380 * MM;
const CYL_BOTTOM = BOTTOM + HEAD;
const CYL_TOP = BOTTOM + LENGTH - HEAD;
const COLLAR = { radius: 11 * MM, y0: 384 * MM, y1: 393 * MM };
const VALVE = { y0: 393 * MM, body0: 397 * MM, body1: 421 * MM, outletY: 408 * MM, nut1: 428 * MM, wheelY: 437.5 * MM };
const OUTLET_END = 24.5 * MM;
const WHEEL_RADIUS = 16 * MM;
const STENCIL = { y0: 58 * MM, y1: 262 * MM, halfAngle: (26 * Math.PI) / 180 };
const BAND = { y0: 270 * MM, y1: 292 * MM };
const TAG = { width: 34 * MM, height: 60 * MM, y0: 300 * MM };
const SEGMENTS = 48;

const bodyProfile = () =>
  dedupe([
    ...ellipse(0, CYL_BOTTOM, R, HEAD, -Math.PI / 2, 0, 12),
    ...ellipse(0, CYL_TOP, R, HEAD, 0, Math.PI / 2, 12),
  ]);

// Arc length along the body profile at height y (texture v runs along the profile).
const profileV = (points) => {
  const lengths = [0];
  for (let i = 1; i < points.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  }
  const total = lengths[lengths.length - 1];
  return (y) => {
    for (let i = 1; i < points.length; i += 1) {
      if (y <= points[i][1]) {
        const t = (y - points[i - 1][1]) / (points[i][1] - points[i - 1][1] || 1);
        return (lengths[i - 1] + t * (lengths[i] - lengths[i - 1])) / total;
      }
    }
    return 1;
  };
};

const footRing = () =>
  lathe(
    dedupe([
      [18 * MM, 3.6 * MM],
      [18 * MM, 0.6 * MM],
      [18.6 * MM, 0],
      [32 * MM, 0],
      ...arc(32 * MM, 1.2 * MM, 1.2 * MM, -Math.PI / 2, Math.PI / 2, 5).slice(1),
      [30 * MM, 2.9 * MM],
      [28 * MM, 4.2 * MM],
      [27.4 * MM, 5.2 * MM],
      [27.4 * MM, 31 * MM],
      ...arc(26.6 * MM, 31 * MM, 0.8 * MM, 0, Math.PI, 5).slice(1),
      [25.8 * MM, 6 * MM],
      [18 * MM, 3.6 * MM],
    ]),
    SEGMENTS,
  );

const collar = () =>
  lathe(
    [
      [0, COLLAR.y1],
      [COLLAR.radius - 0.8 * MM, COLLAR.y1],
      ...arc(COLLAR.radius - 0.8 * MM, COLLAR.y1 - 0.8 * MM, 0.8 * MM, Math.PI / 2, 0, 3).slice(1),
      [COLLAR.radius, COLLAR.y0],
    ].reverse(),
    32,
  );

const hexNut = (radius, y0, y1) =>
  faceted(
    lathe(
      [
        [0, y0],
        [radius * 0.86, y0],
        [radius, y0 + 0.8 * MM],
        [radius, y1 - 0.8 * MM],
        [radius * 0.86, y1],
        [0, y1],
      ],
      6,
      { phiStart: SEAM + Math.PI / 6 },
    ),
  );

const valveParts = () => {
  const { y0, body0, body1, outletY, nut1, wheelY } = VALVE;
  const body = lathe(
    [
      [0, y0],
      [7 * MM, y0],
      [7 * MM, body0],
      [9.6 * MM, body0],
      [10.5 * MM, body0 + 1 * MM],
      [10.5 * MM, body1 - 1.2 * MM],
      [9.4 * MM, body1],
      [0, body1],
    ],
    32,
  );
  // Outlet nipple modelled upright, then laid along +X.
  const outlet = merge([
    lathe([[0, 8 * MM], [5 * MM, 8 * MM], [5 * MM, 17 * MM], [0, 17 * MM]], 20),
    hexNut(7.4 * MM, 17 * MM, 23 * MM),
    lathe([[0, 23 * MM], [4.4 * MM, 23 * MM], [4 * MM, OUTLET_END], [0, OUTLET_END]], 20),
  ]);
  outlet.rotateZ(-Math.PI / 2);
  outlet.translate(0, outletY, 0);
  const plug = hexNut(5 * MM, 8 * MM, 13.5 * MM);
  plug.rotateZ(Math.PI / 2);
  plug.translate(0, outletY - 3 * MM, 0);
  return {
    brass: merge([body, outlet, plug, hexNut(8.6 * MM, body1, nut1)]),
    spindle: lathe([[0, nut1], [3 * MM, nut1], [3 * MM, wheelY + 4.5 * MM], [0, wheelY + 4.5 * MM]], 16),
    wheel: (() => {
      const rim = new TorusGeometry(WHEEL_RADIUS - 2.2 * MM, 2.2 * MM, 8, 40);
      rim.rotateX(Math.PI / 2);
      const spokes = [0, 1, 2].map((k) => {
        const spoke = new CylinderGeometry(1.7 * MM, 1.9 * MM, WHEEL_RADIUS - 5 * MM, 8);
        spoke.translate(0, (WHEEL_RADIUS - 5 * MM) / 2 + 4 * MM, 0);
        spoke.rotateX(Math.PI / 2);
        spoke.rotateY((k * Math.PI * 2) / 3 + Math.PI / 6);
        return spoke;
      });
      const hub = lathe([[0, -3.5 * MM], [5.2 * MM, -3.5 * MM], [5.6 * MM, -2.5 * MM], [5.6 * MM, 2.5 * MM], [5 * MM, 3.5 * MM], [0, 3.5 * MM]], 20);
      const wheel = merge([rim, ...spokes, hub]);
      wheel.translate(0, wheelY, 0);
      return wheel;
    })(),
  };
};

// Cotton string: a loop round the valve collar and a length running down the head to the tag hole.
const tagString = () => {
  const r = 0.45 * MM;
  const loop = new TorusGeometry(COLLAR.radius + r, r, 4, 40);
  loop.rotateX(Math.PI / 2);
  loop.translate(0, 389 * MM, 0);
  const dome = (y, lift) => R * Math.sqrt(Math.max(0, 1 - ((y - CYL_TOP) / HEAD) ** 2)) + lift;
  const holeY = TAG.y0 + TAG.height - 5.5 * MM;
  const points = [
    [COLLAR.radius + r, 389 * MM],
    [13.5 * MM, 387.2 * MM],
    [dome(385 * MM, 0.7 * MM), 385 * MM],
    [dome(380 * MM, 0.7 * MM), 380 * MM],
    [dome(374 * MM, 0.8 * MM), 374 * MM],
    [R + 0.9 * MM, 366 * MM],
    [R + 1.1 * MM, holeY + 1.5 * MM],
    [R + 0.4 * MM, holeY],
  ].map(([z, y]) => new Vector3(0, y, z));
  const hang = new TubeGeometry(new CatmullRomCurve3(points, false, "centripetal"), 40, r, 4, false);
  return merge([loop, hang]);
};

// Partial cylinder just above the paint for the stencilled name; u runs round the body, v up it.
const stencilSurface = () => {
  const { y0, y1, halfAngle } = STENCIL;
  const rows = 12;
  const cols = 16;
  const rho = R + 0.12 * MM;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let j = 0; j <= rows; j += 1) {
    for (let i = 0; i <= cols; i += 1) {
      const a = -halfAngle + (2 * halfAngle * i) / cols;
      positions.push(Math.sin(a) * rho, y0 + ((y1 - y0) * j) / rows, Math.cos(a) * rho);
      normals.push(Math.sin(a), 0, Math.cos(a));
      uvs.push(i / cols, j / rows);
    }
  }
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const a = j * (cols + 1) + i;
      indices.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const profile = bodyProfile();
  assets = {
    body: lathe(profile, SEGMENTS, { arcLengthV: true }),
    v: profileV(profile),
    foot: footRing(),
    collar: collar(),
    ...valveParts(),
    string: tagString(),
    stencil: stencilSurface(),
    tag: buildWrapLabel({ radius: R + 0.7 * MM, width: TAG.width, height: TAG.height, y0: TAG.y0, corner: 3 * MM, thickness: 0.25 * MM, cols: 14, back: false }),
  };
  return assets;
};

const paintCanvas = (width, height, options) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext("2d", options)];
};

// Glossy enamel over steel: colour map plus a packed surface map (R clearcoat, G roughness, B metalness).
const createPaintMaterial = ({ body, band }, seed, v) => {
  const [W, H] = [256, 1024];
  const [colorCanvas, color] = paintCanvas(W, H);
  const [surfaceCanvas, surface] = paintCanvas(W, H);
  const rng = random(seed);
  const Y = (y) => (1 - v(y)) * H;

  color.fillStyle = body;
  color.fillRect(0, 0, W, H);
  surface.fillStyle = "rgb(255, 82, 0)";
  surface.fillRect(0, 0, W, H);
  if (band) {
    color.fillStyle = band;
    color.fillRect(0, Y(BAND.y1), W, Y(BAND.y0) - Y(BAND.y1));
  }
  for (let i = 0; i < 900; i += 1) {
    color.fillStyle = `rgba(${rng() > 0.5 ? "255,255,255" : "0,0,0"},${0.012 + rng() * 0.018})`;
    color.fillRect(rng() * W, rng() * H, 3 + rng() * 8, 3 + rng() * 8);
  }
  const grime = color.createLinearGradient(0, Y(CYL_BOTTOM + 30 * MM), 0, H);
  grime.addColorStop(0, "rgba(40,34,28,0)");
  grime.addColorStop(1, "rgba(40,34,28,0.35)");
  color.fillStyle = grime;
  color.fillRect(0, 0, W, H);

  const chip = (x, y, size) => {
    const points = Array.from({ length: 7 }, (_, k) => {
      const a = (k / 7) * Math.PI * 2;
      const r = size * (0.5 + rng() * 0.6);
      return [x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r];
    });
    for (const [ctx, style] of [[color, rng() > 0.4 ? "#74777b" : "#9a8f80"], [surface, "rgb(0, 130, 190)"]]) {
      ctx.beginPath();
      points.forEach(([px, py], k) => (k ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
    }
  };
  for (let i = 0; i < 34; i += 1) chip(rng() * W, Y(CYL_BOTTOM + 8 * MM + rng() * 14 * MM), 0.5 + rng() * 1.8);
  for (let i = 0; i < 18; i += 1) chip(rng() * W, Y(CYL_TOP + 4 * MM + rng() * 11 * MM), 0.4 + rng() * 1.4);
  for (let i = 0; i < 8; i += 1) chip(rng() * W, Y(CYL_BOTTOM + rng() * (CYL_TOP - CYL_BOTTOM)), 0.4 + rng() * 0.9);
  for (let i = 0; i < 16; i += 1) {
    const [x, y] = [rng() * W, Y(CYL_BOTTOM + rng() * (CYL_TOP - CYL_BOTTOM))];
    const [dx, dy] = [(rng() - 0.5) * 30, (rng() - 0.5) * 60];
    for (const [ctx, style] of [[color, "rgba(170,165,155,0.55)"], [surface, "rgba(90,120,120,0.9)"]]) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + dx * 0.6 + rng() * 4, y + dy * 0.4, x + dx, y + dy);
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = style;
      ctx.stroke();
    }
  }

  const map = new CanvasTexture(colorCanvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  const surfaceMap = new CanvasTexture(surfaceCanvas);
  return new MeshPhysicalMaterial({
    map,
    roughnessMap: surfaceMap,
    metalnessMap: surfaceMap,
    clearcoatMap: surfaceMap,
    roughness: 1,
    metalness: 1,
    clearcoat: 0.55,
    clearcoatRoughness: 0.14,
  });
};

const STENCIL_FONT = `700 120px "Inter Variable", Inter, "Arial Narrow", Arial, sans-serif`;

const paintStencil = (ctx, W, H, { stencil, stencilColor }, seed) => {
  const letter = 120;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = STENCIL_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${letter * 0.08}px`;
  ctx.fillStyle = stencilColor;
  ctx.scale(0.82, 1);
  ctx.fillText(stencil, 0, letter * 0.05, (H * 0.94) / 0.82);
  ctx.restore();
  const image = ctx.getImageData(0, 0, W, H);
  const rng = random(seed + 3);
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] > 0) image.data[i] = Math.max(0, Math.min(255, image.data[i] * (0.8 + rng() * 0.4)));
  }
  for (let k = 0; k < 40; k += 1) {
    const [cx, cy, r] = [rng() * W, rng() * H, 1 + rng() * 2.5];
    for (let y = Math.floor(cy - r); y <= cy + r; y += 1) {
      for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
        if (x >= 0 && y >= 0 && x < W && y < H && Math.hypot(x - cx, y - cy) <= r) image.data[(y * W + x) * 4 + 3] *= 0.35;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
};

// Stencilled name reading bottom-to-top (8 px/mm); blended rather than alpha-tested so thin strokes survive mipmapping.
const createStencilMaterial = (container, seed) => {
  const { y0, y1, halfAngle } = STENCIL;
  const W = Math.round(2 * halfAngle * R * 8000);
  const H = Math.round((y1 - y0) * 8000);
  const [canvas, ctx] = paintCanvas(W, H, { willReadFrequently: true });
  paintStencil(ctx, W, H, container, seed);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 8;
  if (document.fonts && !document.fonts.check(STENCIL_FONT)) {
    document.fonts.load(STENCIL_FONT).then(() => {
      paintStencil(ctx, W, H, container, seed);
      map.needsUpdate = true;
    });
  }
  return new MeshStandardMaterial({
    map,
    transparent: true,
    depthWrite: false,
    roughness: 0.4,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
};

// Two and a half turns from shut to fully open, the way a lecture-bottle valve behaves.
const turnWheel = (wheel, flow, dt, state) => {
  state.angle += ((flow ?? 0) * 2.5 * Math.PI * 2 - state.angle) * (1 - Math.exp(-Math.min(dt, 0.1) / 0.5));
  if (wheel) wheel.rotation.y = state.angle;
};

// remaining has no visible effect (the gas cannot be seen); the valve wheel shows the flow instead.
const GasCylinder = ({ simId, substance, remaining: _remaining = 1, flow = 0, ...props }) => {
  const kit = useKit();
  const parts = getAssets();
  const { container } = substance;
  const seed = seedOf(substance.id);
  const paint = useMemo(() => createPaintMaterial(container, seed, parts.v), [container, seed, parts]);
  useEffect(() => () => disposeMaterial(paint), [paint]);
  const stencil = useMemo(() => createStencilMaterial(container, seed), [container, seed]);
  useEffect(() => () => disposeMaterial(stencil), [stencil]);
  const brass = useMemo(() => createBrass(), []);
  useEffect(() => () => disposeMaterial(brass), [brass]);
  const tag = kit.print(`gas-tag-${substance.id}`, () =>
    createGasTagTexture(substance, { widthMm: TAG.width / MM, heightMm: TAG.height / MM, scale: kit.printScale }),
  );
  const { device } = useDevice(simId);
  const wheelRef = useRef(null);
  const spin = useMemo(() => ({ angle: 0 }), []);
  useFrame((_, delta) => turnWheel(wheelRef.current, device ? device.flow : flow, delta, spin), DEVICE_PRIORITY);

  return (
    <group {...props}>
      <mesh geometry={parts.body} material={paint} castShadow />
      <mesh geometry={parts.stencil} material={stencil} />
      <mesh geometry={parts.foot} material={kit.castIron} castShadow />
      <mesh geometry={parts.collar} material={kit.steel} castShadow />
      <mesh geometry={parts.brass} material={brass} castShadow />
      <mesh geometry={parts.spindle} material={kit.chrome} castShadow />
      <mesh ref={wheelRef} geometry={parts.wheel} material={kit.plasticDark} castShadow />
      <mesh geometry={parts.string} material={kit.cotton} castShadow />
      <mesh geometry={parts.tag.front} material={tag} castShadow />
      <mesh geometry={parts.tag.paper} material={kit.paper} />
      <BlobShadow radius={33 * MM * 1.45} opacity={0.32} />
    </group>
  );
};

export default GasCylinder;
