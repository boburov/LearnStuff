import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  LatheGeometry,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
} from "three";
import { useKit } from "../kit/kitContext";
import { arc, toVectors } from "../kit/vessel";
import { DEVICE_PRIORITY, useDevice } from "../kit/deviceState";
import { createGrainMaterial, disposeMaterial } from "../../substances/templates/containerMaterials";

// Ø75 mm 60° glass funnel, 1.5 mm wall with a beaded rim, Ø8 × 75 mm stem cut at 45°; Ø110 mm quarter-folded filter.
const MM = 0.001;
const SLOPE = Math.tan(Math.PI / 6);
const STEM = { r: 4, bore: 2.6, top: 75, cutZone: 10 };
const WALL = 1.5 / Math.cos(Math.PI / 6);
const FILLET = { r: 12, y: 72.86, radius: 8 };
const BEAD = { r: 36.4, y: 132.3, radius: 1.1 };
const SEGMENTS = 56;
const PAPER = { slant: 55, gap: 0.14, layer: 0.19, rows: 11, segments: 64 };

const outerR = (y) => STEM.r + (y - STEM.top) * SLOPE;
const innerR = (y) => outerR(y) - WALL;
const lip = [(STEM.r + STEM.bore) / 2, (STEM.r - STEM.bore) / 2];

const outerProfile = () => [
  ...arc(lip[0], lip[1], lip[1], -Math.PI / 2, 0, 4),
  [STEM.r, STEM.cutZone],
  ...arc(FILLET.r, FILLET.y, FILLET.radius, Math.PI, (Math.PI * 5) / 6, 7),
  [outerR(104), 104],
  [outerR(129.6), 129.6],
  ...arc(BEAD.r, BEAD.y, BEAD.radius, (-75 * Math.PI) / 180, Math.PI / 2, 9),
];

const innerProfile = () => [
  ...arc(BEAD.r, BEAD.y, BEAD.radius, Math.PI / 2, Math.PI, 4),
  [innerR(129), 129],
  [innerR(104), 104],
  ...arc(FILLET.r, FILLET.y, FILLET.radius + 1.4, (Math.PI * 5) / 6, Math.PI, 7),
  [STEM.bore, STEM.cutZone],
  ...arc(lip[0], lip[1], lip[1], Math.PI, Math.PI * 1.5, 4),
];

// Duplicated lathe seam columns get their normals averaged so the recomputed shading has no line.
const smoothSeam = (geometry, rows) => {
  const normals = geometry.attributes.normal;
  for (let j = 0; j < rows; j += 1) {
    const b = SEGMENTS * rows + j;
    const x = normals.getX(j) + normals.getX(b);
    const y = normals.getY(j) + normals.getY(b);
    const z = normals.getZ(j) + normals.getZ(b);
    const len = Math.hypot(x, y, z) || 1;
    normals.setXYZ(j, x / len, y / len, z / len);
    normals.setXYZ(b, x / len, y / len, z / len);
  }
};

// Shears the bottom of the stem onto a 45° plane whose lowest point (x = -r) is y = 0.
const lathe = (profile) => {
  const geometry = new LatheGeometry(toVectors(profile), SEGMENTS, Math.PI, Math.PI * 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    if (y >= STEM.cutZone) continue;
    const cut = STEM.r + pos.getX(i);
    pos.setY(i, cut + (y * (STEM.cutZone - cut)) / STEM.cutZone);
  }
  geometry.computeVertexNormals();
  smoothSeam(geometry, profile.length);
  geometry.scale(MM, MM, MM);
  return geometry;
};

const crinkle = (theta, t) =>
  t * t * t * (0.5 + 0.28 * Math.sin(5 * theta + 1.3) + 0.14 * Math.sin(11 * theta + 0.4) + 0.08 * Math.sin(23 * theta + 2.2));

const paperPatch = ({ from, to, layer, inside, step = () => 1, shade = () => 1 }) => {
  const apexY = STEM.top - (STEM.r - WALL) / SLOPE;
  const { slant, rows, segments } = PAPER;
  const cols = Math.max(2, Math.round((segments * (to - from)) / (Math.PI * 2)));
  const positions = [];
  const colors = [];
  const uvs = [];
  const sin = Math.sin(Math.PI / 6);
  const cos = Math.cos(Math.PI / 6);
  for (let i = 0; i <= cols; i += 1) {
    const theta = from + ((to - from) * i) / cols;
    const edge = slant - 0.3 * layer - 0.6 * (0.5 + 0.5 * Math.sin(3 * theta + 0.7));
    for (let j = 0; j <= rows; j += 1) {
      const t = Math.pow(j / rows, 0.75);
      const s = 1.2 + (edge - 1.2) * t;
      const splay = layer * (PAPER.layer + 0.45 * t * t * t) * step(theta);
      const inward = PAPER.gap + splay + 1.3 * crinkle(theta, t);
      const r = s * sin - inward * cos;
      const y = apexY + s * cos + inward * sin;
      positions.push(Math.sin(theta) * r * MM, y * MM, Math.cos(theta) * r * MM);
      // Inside the cone the walls hide the ceiling, so light falls off steeply toward the tip.
      const ao = (inside ? 0.1 + 0.9 * t * t : 0.72 + 0.28 * t) * shade(theta, t);
      colors.push(ao, ao, ao * 0.985);
      uvs.push((theta * 27.5) / 24, s / 24);
    }
  }
  const index = [];
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const a = i * (rows + 1) + j;
      const b = a + rows + 1;
      if (inside) index.push(a, a + 1, b, b, a + 1, b + 1);
      else index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { positions, colors, uvs, index };
};

const mergePatches = (patches) => {
  const positions = [];
  const colors = [];
  const uvs = [];
  const index = [];
  for (const patch of patches) {
    const base = positions.length / 3;
    positions.push(...patch.positions);
    colors.push(...patch.colors);
    uvs.push(...patch.uvs);
    index.push(...patch.index.map((i) => i + base));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
};

// Quarter fold: front half single, back half three layers; the inner flap steps out to the glass at one fold.
const buildPaper = () => {
  const [from, to] = [Math.PI * 0.5, Math.PI * 1.5];
  const crease = (center, width, depth) => (theta) => 1 - depth * Math.max(0, 1 - Math.abs(theta - center) / width);
  const flapShadow = (theta) => crease(to + 0.03, 0.08, 0.35)(theta) * crease(from - 0.07, 0.06, 0.2)(theta);
  const innerFlap = { from: from - 0.05, to, layer: 2, step: (theta) => Math.min(1, Math.max(0, (theta - from + 0.05) / 0.07)) };
  return mergePatches([
    paperPatch({ from: 0, to: Math.PI * 2, layer: 0, inside: false }),
    paperPatch({ from: 0, to: Math.PI * 2, layer: 0, inside: true, shade: flapShadow }),
    paperPatch({ from, to, layer: 1, inside: true }),
    paperPatch({ ...innerFlap, inside: true, shade: crease(to - 0.02, 0.05, 0.25) }),
  ]);
};

const random = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Faint cellulose fibres so the sheet does not read as flat plastic up close.
const createFiberTexture = () => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f3f1eb";
  ctx.fillRect(0, 0, size, size);
  const rand = random(7);
  for (let i = 0; i < 900; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const a = rand() * Math.PI;
    const len = 3 + rand() * 9;
    const tone = rand() < 0.5 ? 222 + rand() * 14 : 250;
    ctx.strokeStyle = `rgba(${tone}, ${tone - 2}, ${tone - 8}, 0.55)`;
    ctx.lineWidth = 0.6 + rand() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
};

// Filter paper darkens and turns glossy where the filtrate has soaked it.
const createPaperMaterial = () => {
  const material = new MeshStandardMaterial({
    color: "#f4f2ec",
    map: createFiberTexture(),
    roughness: 0.93,
    vertexColors: true,
    emissive: new Color("#141311"),
  });
  const uniforms = { uWetY: { value: -1 }, uCakeY: { value: -1 }, uCakeColor: { value: new Color("#1d1b1a") } };
  material.userData.wet = uniforms.uWetY;
  material.userData.cake = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vPaperY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPaperY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uWetY;\nuniform float uCakeY;\nuniform vec3 uCakeColor;\nvarying float vPaperY;")
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        float soaked = 1.0 - smoothstep( uWetY - 0.004, uWetY + 0.004, vPaperY );
        diffuseColor.rgb *= 1.0 - 0.32 * soaked;
        roughnessFactor = mix( roughnessFactor, 0.35, soaked );
        // Solids caught by the paper stain the cone as far up as they were washed.
        float caked = 1.0 - smoothstep( uCakeY - 0.0025, uCakeY + 0.0025, vPaperY );
        diffuseColor.rgb = mix( diffuseColor.rgb, uCakeColor, caked * 0.88 );
        roughnessFactor = mix( roughnessFactor, 0.85, caked );`,
      );
  };
  material.customProgramCacheKey = () => "funnel-paper";
  return material;
};

// Cake of solids caught in the cone; the shader clips it at the level the filtrate left it.
const buildCake = () => {
  const rows = 14;
  const points = [[0, 0]];
  for (let i = 1; i <= rows; i += 1) {
    const t = i / rows;
    points.push([t * Math.tan(Math.PI / 6) * 1.0, t]);
  }
  points.push([Math.tan(Math.PI / 6) * 1.02, 1.0], [Math.tan(Math.PI / 6) * 0.99, 1.02], [0, 1.04]);
  return new LatheGeometry(toVectors(points), 40, Math.PI, Math.PI * 2);
};

// Solids line the 30° cone as a ~0.8 mm layer, so the cake climbs with the square root of its volume.
const CAKE_LAYER = 0.0008;
const cakeHeight = (ml) => Math.min(0.05, Math.sqrt((Math.max(0, ml) * 1e-6) / (2.094 * CAKE_LAYER)));

const soakPaper = (material, wetY, cakeY, color) => {
  material.userData.wet.value = wetY;
  material.userData.cake.uCakeY.value = cakeY;
  material.userData.cake.uCakeColor.value.set(color);
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const outer = lathe(outerProfile());
  const inner = lathe(innerProfile());
  const paper = buildPaper();
  outer.computeBoundingBox();
  const drop = outer.boundingBox.min.y;
  [outer, inner, paper].forEach((g) => g.translate(0, -drop, 0));
  const seatY = (radius) => (STEM.top + (radius / MM - STEM.r) / SLOPE) * MM - drop;
  assets = {
    outer,
    inner,
    paper,
    cake: buildCake(),
    apexY: (STEM.top - (STEM.r - WALL) / SLOPE) * MM - drop,
    rimTopY: (BEAD.y + BEAD.radius) * MM - drop,
    paperTopY: (STEM.top - (STEM.r - WALL) / SLOPE + PAPER.slant * Math.cos(Math.PI / 6)) * MM - drop,
    seatRing30: seatY(0.03),
    seatNeck11: seatY(0.011),
  };
  return assets;
};

const Funnel = ({ simId, withPaper = true, solidsMl = 0, solidsColor = "#d8d4cc", wet = 0, ...props }) => {
  const kit = useKit();
  const { outer, inner, paper, cake, apexY } = getAssets();
  const paperMaterial = useMemo(() => createPaperMaterial(), []);
  useEffect(
    () => () => {
      paperMaterial.map.dispose();
      paperMaterial.dispose();
    },
    [paperMaterial],
  );
  const { device } = useDevice(simId);
  const [cakeMl, setCakeMl] = useState(solidsMl);
  const color = device ? (device.solidsColor ?? solidsColor) : solidsColor;
  const cakeMaterial = useMemo(() => createGrainMaterial({ color, grain: "fine", seed: 9 }), [color]);
  useEffect(() => () => disposeMaterial(cakeMaterial), [cakeMaterial]);
  const height = cakeHeight(cakeMl);
  useFrame(() => {
    const target = device ? (device.solidsMl ?? 0) : solidsMl;
    const soak = device ? (device.wet ?? 0) : wet;
    soakPaper(paperMaterial, apexY + soak * PAPER.slant * Math.cos(Math.PI / 6) * MM, apexY + height, color);
    const stepped = Math.round(target * 20) / 20;
    if (stepped !== cakeMl) setCakeMl(stepped);
  }, DEVICE_PRIORITY);

  return (
    <group {...props}>
      <mesh geometry={inner} material={kit.glass} renderOrder={1} />
      {withPaper && <mesh geometry={paper} material={paperMaterial} castShadow />}
      {height > 0.0004 && (
        <mesh geometry={cake} material={cakeMaterial} position={[0, apexY + 0.0004, 0]} scale={height * 0.55} />
      )}
      <mesh geometry={outer} material={kit.glass} renderOrder={3} />
    </group>
  );
};

export default Funnel;
