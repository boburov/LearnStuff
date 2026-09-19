import { useEffect, useMemo } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LatheGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  ShapeUtils,
  TorusGeometry,
  Vector2,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";
import { arc, toVectors } from "../kit/vessel";

// School retort stand: 130 × 200 × 14 mm cast-iron base, Ø12 × 600 mm rod, ring with gauze, 3-finger clamp.
const BASE_W = 0.13;
const BASE_D = 0.2;
const BASE_H = 0.014;
const BASE_CORNER = 0.012;
const ROD_R = 0.006;
const ROD_Z = -0.068;
const ROD_TOP = 0.61;
const ARM_X = 0.013;
const RING_Z = 0.03;
const RING_R = 0.0425;
const RING_TUBE = 0.0025;
const ARM_R = 0.003;
const SHANK_R = 0.0045;
const GAUZE = 0.125;
const GAUZE_Y = RING_TUBE + 0.0004;
const DISK_R = 0.0395;
const SEAM = Math.PI;

const createBuilder = () => {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const vertex = (p, n, uv = [0, 0]) => {
    positions.push(p[0], p[1], p[2]);
    normals.push(n[0], n[1], n[2]);
    uvs.push(uv[0], uv[1]);
    return positions.length / 3 - 1;
  };
  // Emits the triangle facing its vertex normals; slivers are dropped.
  const triangle = (i0, i1, i2) => {
    a.fromArray(positions, i0 * 3);
    b.fromArray(positions, i1 * 3).sub(a);
    c.fromArray(positions, i2 * 3).sub(a);
    b.cross(c);
    if (b.lengthSq() < 1e-18) return;
    const nx = normals[i0 * 3] + normals[i1 * 3] + normals[i2 * 3];
    const ny = normals[i0 * 3 + 1] + normals[i1 * 3 + 1] + normals[i2 * 3 + 1];
    const nz = normals[i0 * 3 + 2] + normals[i1 * 3 + 2] + normals[i2 * 3 + 2];
    if (b.x * nx + b.y * ny + b.z * nz >= 0) indices.push(i0, i1, i2);
    else indices.push(i0, i2, i1);
  };
  const build = () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    return geometry;
  };
  return { vertex, triangle, build };
};

// Rounded rectangle outline (x, z) with outward normals.
const roundedRectLoop = (w, d, r, steps = 5) => {
  const loop = [];
  [
    [w / 2 - r, d / 2 - r, 0],
    [-(w / 2 - r), d / 2 - r, Math.PI / 2],
    [-(w / 2 - r), -(d / 2 - r), Math.PI],
    [w / 2 - r, -(d / 2 - r), Math.PI * 1.5],
  ].forEach(([cx, cz, start]) => {
    for (let i = 0; i <= steps; i += 1) {
      const a = start + (i / steps) * (Math.PI / 2);
      loop.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, nx: Math.cos(a), nz: Math.sin(a) });
    }
  });
  return loop;
};

// Base plate: the plan outline swept along an [inset, y] edge profile, flat top and bottom.
const buildBase = () => {
  const loop = roundedRectLoop(BASE_W, BASE_D, BASE_CORNER);
  const profile = [
    [0.0012, 0],
    [0, 0.0012],
    [0, 0.0082],
    [0.0012, 0.0094],
    [0.0052, 0.0134],
    [0.0064, BASE_H],
  ];
  const { vertex, triangle, build } = createBuilder();
  const at = (p, inset, y) => [p.x - p.nx * inset, y, p.z - p.nz * inset];
  const uvAt = (p, inset, y, wall) =>
    wall ? [p.x * -p.nz + p.z * p.nx, y] : [p.x - p.nx * inset, p.z - p.nz * inset];
  for (let s = 0; s < profile.length - 1; s += 1) {
    const [i0, y0] = profile[s];
    const [i1, y1] = profile[s + 1];
    const len = Math.hypot(i1 - i0, y1 - y0);
    const out = (y1 - y0) / len;
    const up = (i1 - i0) / len;
    const wall = Math.abs(up) < 0.5;
    const rows = loop.map((p) => [
      vertex(at(p, i0, y0), [p.nx * out, up, p.nz * out], uvAt(p, i0, y0, wall)),
      vertex(at(p, i1, y1), [p.nx * out, up, p.nz * out], uvAt(p, i1, y1, wall)),
    ]);
    rows.forEach(([a0, a1], i) => {
      const [b0, b1] = rows[(i + 1) % rows.length];
      triangle(a0, b0, b1);
      triangle(a0, b1, a1);
    });
  }
  [
    [profile[profile.length - 1], 1],
    [profile[0], -1],
  ].forEach(([[inset, y], side]) => {
    const contour = loop.map((p) => new Vector2(p.x - p.nx * inset, p.z - p.nz * inset));
    const ids = contour.map((p) => vertex([p.x, y, p.y], [0, side, 0], [p.x, p.y]));
    ShapeUtils.triangulateShape(contour, []).forEach(([i0, i1, i2]) => triangle(ids[i0], ids[i1], ids[i2]));
  });
  return build();
};

const flat = (geometry) => (geometry.index ? geometry.toNonIndexed() : geometry);
const merge = (parts) => mergeGeometries(parts.map(flat));

const alongX = (geometry) => geometry.rotateZ(-Math.PI / 2);
const alongZ = (geometry) => geometry.rotateX(Math.PI / 2);

// Knurled thumb-screw head along the X axis, with chamfered faces.
const buildKnurledHead = (radius, length, ribs) => {
  const geometry = new CylinderGeometry(radius, radius, length, ribs * 4, 2, false, SEAM);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const rib = 1 - 0.07 * (0.5 + 0.5 * Math.cos(Math.atan2(x, z) * ribs));
    const chamfer = Math.abs(Math.abs(y) - length / 2) < 1e-6 ? 0.88 : 1;
    pos.setXYZ(i, x * rib * chamfer, y, z * rib * chamfer);
  }
  geometry.computeVertexNormals();
  return alongX(geometry);
};

// Boss head in arm-level coordinates: body parts (dark) and screw parts (steel).
const buildBossHead = () => {
  const body = new RoundedBoxGeometry(0.034, 0.044, 0.024, 3, 0.0035);
  body.translate(0.004, 0.009, ROD_Z);
  const bossA = alongX(new CylinderGeometry(0.0065, 0.007, 0.004, 24));
  bossA.translate(-0.0145, 0.02, ROD_Z);
  const bossB = alongX(new CylinderGeometry(0.0065, 0.007, 0.004, 24));
  bossB.rotateY(Math.PI);
  bossB.translate(0.0225, 0, ROD_Z);
  const shankA = alongX(new CylinderGeometry(0.0033, 0.0033, 0.008, 14));
  shankA.translate(-0.019, 0.02, ROD_Z);
  const headA = buildKnurledHead(0.0105, 0.008, 15);
  headA.translate(-0.027, 0.02, ROD_Z);
  const shankB = alongX(new CylinderGeometry(0.0033, 0.0033, 0.008, 14));
  shankB.translate(0.027, 0, ROD_Z);
  const headB = buildKnurledHead(0.0105, 0.008, 15);
  headB.translate(0.035, 0, ROD_Z);
  return { body: merge([body, bossA, bossB]), screws: merge([shankA, headA, shankB, headB]) };
};

const buildRod = () =>
  new LatheGeometry(
    toVectors([
      [0, 0.002],
      [ROD_R, 0.002],
      [ROD_R, ROD_TOP - ROD_R],
      ...arc(0, ROD_TOP - ROD_R, ROD_R, 0, Math.PI / 2, 6).slice(1),
    ]),
    28,
    SEAM,
    Math.PI * 2,
  );

const buildRodBoss = () => {
  const boss = new LatheGeometry(
    toVectors([
      [0.0142, BASE_H - 0.001],
      [0.0139, BASE_H + 0.0012],
      [0.0124, BASE_H + 0.0038],
      [0.0112, BASE_H + 0.0046],
      [ROD_R + 0.0002, BASE_H + 0.0046],
    ]),
    32,
    SEAM,
    Math.PI * 2,
  );
  boss.translate(0, 0, ROD_Z);
  const pos = boss.attributes.position;
  for (let i = 0; i < pos.count; i += 1) boss.attributes.uv.setXY(i, pos.getX(i), pos.getZ(i));
  return boss;
};

const buildRingAndArm = () => {
  const ring = new TorusGeometry(RING_R, RING_TUBE, 10, 72);
  ring.rotateX(Math.PI / 2);
  ring.translate(ARM_X, 0, RING_Z);
  const start = ROD_Z - 0.024;
  const end = RING_Z - RING_R + 0.0008;
  const arm = alongZ(new CylinderGeometry(ARM_R, ARM_R, end - start, 16));
  arm.translate(ARM_X, -0.0005, (start + end) / 2);
  return merge([ring, arm]);
};

const buildGauze = () => {
  const mesh = new PlaneGeometry(GAUZE - 0.004, GAUZE - 0.004);
  mesh.rotateX(-Math.PI / 2);
  mesh.translate(ARM_X, GAUZE_Y, RING_Z);
  const strips = [
    [GAUZE, 0.0031, 0, GAUZE / 2 - 0.0015],
    [GAUZE, 0.0031, 0, -(GAUZE / 2 - 0.0015)],
    [0.0031, GAUZE - 0.0062, GAUZE / 2 - 0.0015, 0],
    [0.0031, GAUZE - 0.0062, -(GAUZE / 2 - 0.0015), 0],
  ].map(([w, d, x, z]) => {
    const strip = new BoxGeometry(w, 0.0009, d);
    strip.translate(ARM_X + x, GAUZE_Y, RING_Z + z);
    return strip;
  });
  const disk = new LatheGeometry(
    toVectors([
      [0, GAUZE_Y - 0.0007],
      [DISK_R - 0.001, GAUZE_Y - 0.0007],
      ...arc(DISK_R - 0.001, GAUZE_Y + 0.0003, 0.001, -Math.PI / 2, Math.PI / 2, 4).slice(1),
      [DISK_R - 0.004, GAUZE_Y + 0.0015],
      [0, GAUZE_Y + 0.0017],
    ]),
    48,
    SEAM,
    Math.PI * 2,
  );
  const pos = disk.attributes.position;
  const uv = disk.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const wobble = r > DISK_R - 0.0025 ? 1 + 0.012 * Math.sin(Math.atan2(x, z) * 7 + 1.3) * Math.sin(Math.atan2(x, z) * 3) : 1;
    pos.setXYZ(i, x * wobble, pos.getY(i), z * wobble);
    uv.setXY(i, 0.5 + x / (2 * DISK_R), 0.5 - z / (2 * DISK_R));
  }
  disk.computeVertexNormals();
  disk.translate(ARM_X, 0, RING_Z);
  return { mesh, frame: mergeGeometries(strips), disk };
};

const up = new Vector3(0, 1, 0);

// Rounded-rectangle section (thickness across the path, height along Y) swept along part of a horizontal curve.
const sweep = (curve, t0, t1, thickness, height, radius, steps) => {
  const section = [];
  [
    [thickness / 2 - radius, height / 2 - radius, 0],
    [-(thickness / 2 - radius), height / 2 - radius, Math.PI / 2],
    [-(thickness / 2 - radius), -(height / 2 - radius), Math.PI],
    [thickness / 2 - radius, -(height / 2 - radius), Math.PI * 1.5],
  ].forEach(([s, u, start]) => {
    for (let i = 0; i <= 2; i += 1) {
      const a = start + (i / 2) * (Math.PI / 2);
      section.push([s + Math.cos(a) * radius, u + Math.sin(a) * radius, Math.cos(a), Math.sin(a)]);
    }
  });
  const { vertex, triangle, build } = createBuilder();
  const rings = [];
  const ends = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = t0 + ((t1 - t0) * i) / steps;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const side = new Vector3().crossVectors(tangent, up).normalize();
    rings.push(
      section.map(([s, u, ns, nu]) =>
        vertex([p.x + side.x * s, p.y + u, p.z + side.z * s], [side.x * ns, nu, side.z * ns]),
      ),
    );
    if (i === 0 || i === steps) ends.push({ p, n: i === 0 ? tangent.clone().negate() : tangent, side });
  }
  for (let i = 0; i < steps; i += 1) {
    for (let k = 0; k < section.length; k += 1) {
      const k1 = (k + 1) % section.length;
      triangle(rings[i][k], rings[i + 1][k], rings[i + 1][k1]);
      triangle(rings[i][k], rings[i + 1][k1], rings[i][k1]);
    }
  }
  ends.forEach(({ p, n, side }) => {
    const ids = section.map(([s, u]) => vertex([p.x + side.x * s, p.y + u, p.z + side.z * s], [n.x, n.y, n.z]));
    for (let k = 1; k < ids.length - 1; k += 1) triangle(ids[0], ids[k], ids[k + 1]);
  });
  return build();
};

const JAW = [
  [0.0062, -0.036],
  [0.0118, -0.028],
  [0.0172, -0.014],
  [0.0186, 0],
  [0.0162, 0.0125],
  [0.0106, 0.0204],
  [0.005, 0.0238],
];

const jawCurve = (sign, y) =>
  new CatmullRomCurve3(
    JAW.map(([x, z]) => new Vector3(ARM_X + sign * x, y, RING_Z + z)),
    false,
    "centripetal",
  );

// Three-finger clamp in model space, centred on the ring axis at arm level.
const buildClamp = () => {
  const steel = [
    sweep(jawCurve(1, 0), 0, 0.3, 0.0026, 0.011, 0.0007, 6),
    sweep(jawCurve(-1, 0), 0, 0.3, 0.0026, 0.0245, 0.0007, 6),
  ];
  const cork = [];
  [
    { sign: 1, y: 0, h: 0.0078 },
    { sign: -1, y: 0.0086, h: 0.0068 },
    { sign: -1, y: -0.0086, h: 0.0068 },
  ].forEach(({ sign, y, h }) => {
    const curve = jawCurve(sign, y);
    steel.push(sweep(curve, 0.22, 1, 0.0022, h, 0.0006, 18));
    const pad = [];
    for (let i = 0; i <= 10; i += 1) {
      const t = 0.36 + (i / 10) * 0.62;
      const p = curve.getPointAt(t);
      const side = new Vector3().crossVectors(curve.getTangentAt(t), up).normalize();
      pad.push(p.addScaledVector(side, sign * 0.0026));
    }
    cork.push(sweep(new CatmullRomCurve3(pad, false, "centripetal"), 0, 1, 0.003, h - 0.0006, 0.001, 12));
  });
  const yoke = new RoundedBoxGeometry(0.02, 0.028, 0.013, 2, 0.0035);
  yoke.translate(ARM_X, 0, RING_Z - 0.039);
  const shankStart = ROD_Z - 0.024;
  const shankEnd = RING_Z - 0.042;
  const shank = alongZ(new CylinderGeometry(SHANK_R, SHANK_R, shankEnd - shankStart, 18));
  shank.translate(ARM_X, 0, (shankStart + shankEnd) / 2);
  const boltZ = RING_Z - 0.0235;
  const bolt = alongX(new CylinderGeometry(0.0021, 0.0021, 0.044, 10));
  bolt.translate(ARM_X + 0.002, 0, boltZ);
  const boltHead = alongX(new CylinderGeometry(0.0042, 0.0042, 0.0028, 6));
  boltHead.translate(ARM_X - 0.0196, 0, boltZ);
  const nut = alongX(new CylinderGeometry(0.0034, 0.0044, 0.0055, 16));
  nut.translate(ARM_X + 0.0186, 0, boltZ);
  const wings = [1, -1].map((s) => {
    const wing = new RoundedBoxGeometry(0.0032, 0.0105, 0.0022, 2, 0.001);
    wing.rotateZ(-s * 0.3);
    wing.translate(ARM_X + 0.0202, s * 0.0078, boltZ);
    return wing;
  });
  return {
    steel: merge([...steel, yoke, shank, bolt, boltHead, nut, ...wings]),
    cork: merge(cork),
  };
};

const createCeramicTexture = () => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d3d1ca";
  ctx.fillRect(0, 0, size, size);
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 4200; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const a = rand() * Math.PI;
    const l = 3 + rand() * 9;
    const light = rand() > 0.5;
    ctx.strokeStyle = light ? `rgba(255,255,250,${0.25 + rand() * 0.3})` : `rgba(120,114,104,${0.1 + rand() * 0.18})`;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size / 2);
  edge.addColorStop(0, "rgba(90,86,80,0)");
  edge.addColorStop(1, "rgba(90,86,80,0.28)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const createGauzeTexture = () => {
  const size = 1024;
  const wires = 96;
  const pitch = size / wires;
  const thick = pitch * 0.34;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const wire = (x, y, w, h, horizontal) => {
    const g = horizontal ? ctx.createLinearGradient(0, y, 0, y + h) : ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#4f5459");
    g.addColorStop(0.45, "#d2d6da");
    g.addColorStop(1, "#5a5f64");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  for (let i = 0; i < wires; i += 1) wire(0, (i + 0.5) * pitch - thick / 2, size, thick, true);
  for (let i = 0; i < wires; i += 1) wire((i + 0.5) * pitch - thick / 2, 0, thick, size, false);
  for (let i = 0; i < wires; i += 1) {
    for (let j = i % 2; j < wires; j += 2) {
      wire(j * pitch + pitch * 0.2, (i + 0.5) * pitch - thick / 2, pitch * 0.6, thick, true);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

// Hammertone paint: soft dimples as a bump map on top of the kit's cast-iron look.
const createCastIronMaterial = (base) => {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, size, size);
  let seed = 3;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 1100; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2.5 + rand() * 4.5;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tone = rand() > 0.5 ? "255,255,255" : "0,0,0";
    g.addColorStop(0, `rgba(${tone},${0.06 + rand() * 0.1})`);
    g.addColorStop(1, `rgba(${tone},0)`);
    ctx.fillStyle = g;
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.fillRect(x - r + dx, y - r + dy, r * 2, r * 2);
      }
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(9, 9);
  const material = base.clone();
  material.bumpMap = texture;
  material.bumpScale = 5;
  material.roughness = 0.66;
  return material;
};

const createCeramicMaterial = () => new MeshStandardMaterial({ map: createCeramicTexture(), roughness: 0.95 });

const disposeMaterial = (material) => {
  material.map?.dispose();
  material.bumpMap?.dispose();
  material.dispose();
};

const createGauzeMaterial = () =>
  new MeshStandardMaterial({
    map: createGauzeTexture(),
    metalness: 0.55,
    roughness: 0.45,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const boss = buildBossHead();
  const gauze = buildGauze();
  const clamp = buildClamp();
  assets = {
    base: merge([buildBase(), buildRodBoss()]),
    rod: buildRod(),
    bossBody: boss.body,
    bossScrews: boss.screws,
    ringAndArm: buildRingAndArm(),
    gauzeMesh: gauze.mesh,
    gauzeFrame: gauze.frame,
    gauzeDisk: gauze.disk,
    clampSteel: clamp.steel,
    clampCork: clamp.cork,
  };
  return assets;
};

const BossHead = ({ kit, assets, y }) => (
  <group position-y={y}>
    <mesh geometry={assets.bossBody} material={kit.castIron} castShadow receiveShadow />
    <mesh geometry={assets.bossScrews} material={kit.steel} castShadow />
  </group>
);

const RetortStand = ({ ringY = 0.2, clampY = 0.38, ...props }) => {
  const kit = useKit();
  const a = getAssets();
  const gauzeMaterial = useMemo(() => createGauzeMaterial(), []);
  const ceramicMaterial = useMemo(() => createCeramicMaterial(), []);
  const baseMaterial = useMemo(() => createCastIronMaterial(kit.castIron), [kit]);
  useEffect(() => () => disposeMaterial(baseMaterial), [baseMaterial]);
  useEffect(() => () => disposeMaterial(gauzeMaterial), [gauzeMaterial]);
  useEffect(() => () => disposeMaterial(ceramicMaterial), [ceramicMaterial]);
  const ringLevel = BASE_H + ringY;
  const clampLevel = BASE_H + clampY;

  return (
    <group {...props}>
      <mesh geometry={a.base} material={baseMaterial} castShadow receiveShadow />
      <mesh geometry={a.rod} material={kit.steel} position-z={ROD_Z} castShadow />
      <BossHead kit={kit} assets={a} y={ringLevel} />
      <group position-y={ringLevel}>
        <mesh geometry={a.ringAndArm} material={kit.castIron} castShadow />
        <mesh geometry={a.gauzeMesh} material={gauzeMaterial} />
        <mesh geometry={a.gauzeFrame} material={kit.steel} castShadow receiveShadow />
        <mesh geometry={a.gauzeDisk} material={ceramicMaterial} castShadow receiveShadow />
      </group>
      <BossHead kit={kit} assets={a} y={clampLevel} />
      <group position-y={clampLevel}>
        <mesh geometry={a.clampSteel} material={kit.steel} castShadow />
        <mesh geometry={a.clampCork} material={kit.woodLight} castShadow />
      </group>
      <group scale={[0.66, 1, 1.02]}>
        <BlobShadow radius={0.125} opacity={0.3} />
      </group>
    </group>
  );
};

export default RetortStand;
