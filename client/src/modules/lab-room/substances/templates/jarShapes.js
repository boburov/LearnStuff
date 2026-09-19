import { BufferAttribute, BufferGeometry } from "three";
import { radiusAt } from "../../equipment/kit/vessel";
import { MM, arc, dedupe, fbm3, fillet, lathe } from "./shapeUtils";

// Wide-mouth screw-cap jar: cylinder, short rounded shoulder, threaded neck (hidden by the cap), rounded lip.
export const buildWideJar = ({ radius: R, bodyTop, shoulder, neckRadius: N, neckTop, wall, floor, bore, baseFillet, segments = 48 }) => {
  const shoulderTop = bodyTop + shoulder;
  const outer = dedupe([
    ...fillet(
      [[0, 0.9 * MM], [R - 7 * MM, 0.6 * MM], [R - 4 * MM, 0], [R, 0], [R, bodyTop], [N, shoulderTop], [N, neckTop - 1 * MM]],
      [0, 2 * MM, 1.5 * MM, baseFillet, shoulder * 0.9, 1.2 * MM, 0],
      [0, 2, 2, 5, 5, 3, 0],
    ),
    ...arc(N - 1 * MM, neckTop - 1 * MM, 1 * MM, 0, Math.PI / 2, 3).slice(1),
    [bore + 0.6 * MM, neckTop],
  ]);
  const inner = dedupe([
    [bore + 0.6 * MM, neckTop],
    [bore, neckTop - 0.7 * MM],
    ...fillet(
      [[bore, neckTop - 0.7 * MM], [bore, shoulderTop - wall * 0.5], [R - wall, bodyTop - wall * 0.3], [R - wall, floor], [0, floor]],
      [0, 1.2 * MM, Math.max(1 * MM, shoulder * 0.9 - wall), 3.5 * MM, 0],
      [0, 3, 5, 4, 0],
    ).slice(1),
  ]);
  return {
    outer: lathe(outer, segments),
    inner: lathe(inner, segments),
    innerProfile: [...inner].reverse(),
  };
};

// Levels are measured on the inner profile: floor, and the top of the cylindrical body.
export const jarLevel = (innerProfile, bodyTop, fraction) => {
  const floor = innerProfile[0][1];
  return floor + (bodyTop - floor) * Math.max(0, Math.min(1, fraction));
};

const TILE = 0.024;

// Loose powder resting in a jar: uneven heaped top with a spatula scoop, sides following the glass.
export const buildHeap = ({ innerProfile, level, seed, mound = 2.5 * MM, roughness = 0.8 * MM, scoop = true, segments = 48, rings = 8 }) => {
  const floor = innerProfile[0][1];
  const inset = 0.35 * MM;
  const depth = level - floor;
  if (depth <= 0.2 * MM) return null;
  const heap = Math.min(mound, depth * 0.45);
  const bumps = Math.min(roughness, depth * 0.3);
  const rng = (k) => fbm3(k * 7.1, seed * 0.001, 3.3, seed);
  const scoopAngle = rng(1) * Math.PI * 2;
  const scoopR = radiusAt(innerProfile, level) * 0.45;
  const [sx, sz] = [Math.sin(scoopAngle) * scoopR, Math.cos(scoopAngle) * scoopR];

  const height = (x, z, t) => {
    let h = level + heap * (1 - t * t) - heap * 0.35;
    h += (fbm3(x / (9 * MM), z / (9 * MM), 0.5, seed) - 0.5) * bumps * 2.2;
    h += (fbm3(x / (2.5 * MM), z / (2.5 * MM), 1.5, seed + 9) - 0.5) * bumps * 0.6;
    if (scoop) h -= heap * 1.1 * Math.exp(-((x - sx) ** 2 + (z - sz) ** 2) / (7 * MM) ** 2);
    return Math.max(floor + 0.3 * MM, h);
  };

  const positions = [];
  const uvs = [];
  const indices = [];
  const edge = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = Math.PI + (i / segments) * Math.PI * 2;
    const r0 = radiusAt(innerProfile, level) - inset;
    const y = height(Math.sin(a) * r0, Math.cos(a) * r0, 1);
    edge.push({ a, y, r: radiusAt(innerProfile, Math.max(y, floor + 0.2 * MM)) - inset });
  }

  const center = positions.length / 3;
  positions.push(0, height(0, 0, 0), 0);
  uvs.push(0.5, 0.5);
  for (let k = 1; k <= rings; k += 1) {
    const t = k / rings;
    for (let i = 0; i <= segments; i += 1) {
      const { a, r, y } = edge[i];
      const [x, z] = [Math.sin(a) * r * t, Math.cos(a) * r * t];
      positions.push(x, k === rings ? y : height(x, z, t), z);
      uvs.push(x / TILE + 0.5, z / TILE + 0.5);
    }
  }
  const ringStart = (k) => center + 1 + (k - 1) * (segments + 1);
  for (let i = 0; i < segments; i += 1) indices.push(center, ringStart(1) + i, ringStart(1) + i + 1);
  for (let k = 1; k < rings; k += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = ringStart(k) + i;
      const b = ringStart(k + 1) + i;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const side = positions.length / 3;
  const rows = [0, 0.05, 0.14, 0.32, 0.62, 1];
  for (let i = 0; i <= segments; i += 1) {
    const { a, y: top } = edge[i];
    for (const f of rows) {
      const y = floor + 0.15 * MM + (top - floor - 0.15 * MM) * f;
      const r = Math.max(0.5 * MM, radiusAt(innerProfile, Math.max(y, floor + 0.15 * MM)) - inset);
      positions.push(Math.sin(a) * r, y, Math.cos(a) * r);
      uvs.push((a * r) / TILE, y / TILE);
    }
  }
  const n = rows.length;
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < n - 1; j += 1) {
      const a = side + i * n + j;
      const b = a + n;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};
