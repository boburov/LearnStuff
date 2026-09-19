import { ExtrudeGeometry, Shape } from "three";

// Deterministic randomness per burst id (keeps render pure and lets a reset replay identically).
export const seededRandom = (seedText) => {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i += 1) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A thin, slightly curved irregular plate: reads as a piece of a broken vessel wall.
const buildShard = (random, size, thickness, curvature) => {
  const corners = 4 + Math.floor(random() * 3);
  const angles = Array.from({ length: corners }, () => random() * Math.PI * 2).sort((a, b) => a - b);
  const shape = new Shape();
  angles.forEach((angle, i) => {
    const r = size * (0.45 + random() * 0.55);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r * (0.5 + random() * 0.5);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
  geometry.center();
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    pos.setZ(i, pos.getZ(i) + x * x * curvature);
  }
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
};

const pools = new Map();
const bases = new Map();

// The thick bottom usually survives as one recognizable piece.
export const shardBase = (kind) => {
  if (!bases.has(kind)) {
    const random = seededRandom(`${kind}-base`);
    bases.set(kind, buildShard(random, 0.03, kind === "porcelain" ? 0.004 : 0.0028, 0));
  }
  return bases.get(kind);
};

// Shared geometry pools per material so repeated breaks never allocate new buffers.
export const shardPool = (kind) => {
  if (pools.has(kind)) return pools.get(kind);
  const random = seededRandom(kind);
  const porcelain = kind === "porcelain";
  const pool = Array.from({ length: 12 }, (_, i) =>
    buildShard(random, 0.012 + (i % 6) * 0.005, porcelain ? 0.003 : 0.0018, porcelain ? 5 : 9),
  );
  pools.set(kind, pool);
  return pool;
};
