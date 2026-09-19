import { BufferAttribute, BufferGeometry, CatmullRomCurve3, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { radiusAt } from "../../equipment/kit/vessel";
import { MM, faceted, lathe, merge, noise3, random } from "./shapeUtils";

const TILE = 0.02;

// Irregular stone: a displaced icosphere, optionally sliced by planes (knife-cut or broken faces).
const rockShape = (rng, { cuts, detail }) => {
  const base = mergeVertices(new IcosahedronGeometry(1, detail).deleteAttribute("normal").deleteAttribute("uv"));
  const pos = base.attributes.position;
  const seed = Math.floor(rng() * 1e6);
  const planes = Array.from({ length: cuts }, () => {
    const n = new Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    return { n, d: 0.5 + rng() * 0.32 };
  });
  const v = new Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(0.82 + noise3(v.x * 1.7, v.y * 1.7, v.z * 1.7, seed) * 0.36);
    for (const { n, d } of planes) {
      const k = v.dot(n);
      if (k > d) v.addScaledVector(n, d - k);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return base;
};

// Places a copy of the shape; pieces that would cross the jar floor or wall are nudged back inside.
const appendTransformed = (parts, geometry, matrix, uvOffset, bounds) => {
  const g = geometry.clone();
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    uv[i * 2] = pos.getX(i) * 0.5 + pos.getZ(i) * 0.3 + uvOffset[0];
    uv[i * 2 + 1] = pos.getY(i) * 0.5 + uvOffset[1];
  }
  g.setAttribute("uv", new BufferAttribute(uv, 2));
  g.applyMatrix4(matrix);
  if (bounds) {
    let [minY, maxR, cx, cz] = [Infinity, 0, 0, 0];
    for (let i = 0; i < pos.count; i += 1) {
      minY = Math.min(minY, pos.getY(i));
      cx += pos.getX(i) / pos.count;
      cz += pos.getZ(i) / pos.count;
    }
    for (let i = 0; i < pos.count; i += 1) maxR = Math.max(maxR, Math.hypot(pos.getX(i), pos.getZ(i)));
    const lift = Math.max(0, bounds.floor - minY);
    const over = Math.max(0, maxR - bounds.wall);
    const len = Math.hypot(cx, cz) || 1;
    g.translate((-cx / len) * over, lift, (-cz / len) * over);
  }
  parts.push(g);
  return g;
};

// Pieces dropped one at a time onto a height field, each into the lowest of several spots, until the pile reaches the level.
export const buildChunkPile = ({ innerProfile, level, seed, size, cuts = 2, detail = 1, facetedLook = false, maxPieces = 70 }) => {
  const rng = random(seed);
  const floor = innerProfile[0][1];
  const wall = radiusAt(innerProfile, floor + 12 * MM) - 0.6 * MM;
  if (level - floor < size * 0.3) return null;
  const G = 32;
  const cell = (wall * 2) / G;
  const heights = new Float32Array(G * G).fill(floor);
  const shapes = Array.from({ length: 6 }, () => rockShape(rng, { cuts, detail }));
  const parts = [];
  const matrix = new Matrix4();
  const quaternion = new Quaternion();

  const footprint = (x, z, r, fn) => {
    const [i0, i1] = [Math.max(0, Math.floor((x - r + wall) / cell)), Math.min(G - 1, Math.floor((x + r + wall) / cell))];
    const [j0, j1] = [Math.max(0, Math.floor((z - r + wall) / cell)), Math.min(G - 1, Math.floor((z + r + wall) / cell))];
    for (let j = j0; j <= j1; j += 1) {
      for (let i = i0; i <= i1; i += 1) {
        const cx = -wall + (i + 0.5) * cell;
        const cz = -wall + (j + 0.5) * cell;
        const d = Math.hypot(cx - x, cz - z) / r;
        if (d <= 1) fn(j * G + i, d);
      }
    }
  };

  for (let n = 0; n < maxPieces; n += 1) {
    const scale = size * (0.65 + rng() * 0.7);
    const [sx, sy, sz] = [0.85 + rng() * 0.4, 0.55 + rng() * 0.35, 0.85 + rng() * 0.4];
    const reach = scale * Math.max(sx, sz);
    let best = null;
    for (let k = 0; k < 10; k += 1) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * Math.max(0, wall - reach * 0.95);
      const [x, z] = [Math.sin(a) * r, Math.cos(a) * r];
      let rest = floor;
      footprint(x, z, reach * 0.7, (index) => {
        rest = Math.max(rest, heights[index]);
      });
      const y = rest + scale * sy * 0.55;
      if (!best || y < best.y) best = { x, y, z };
    }
    if (best.y - scale * sy * 0.3 > level) break;
    const yaw = rng() * Math.PI * 2;
    quaternion.setFromAxisAngle(new Vector3(Math.cos(yaw), 0, Math.sin(yaw)), (rng() - 0.5) * 0.7);
    matrix.compose(new Vector3(best.x, best.y, best.z), quaternion, new Vector3(scale * sx, scale * sy, scale * sz));
    const rotated = new Matrix4().makeRotationY(yaw);
    const piece = appendTransformed(parts, shapes[n % shapes.length], matrix.multiply(rotated), [rng() * 4, rng() * 4], {
      floor: floor + 0.2 * MM,
      wall: wall - 0.2 * MM,
    });
    piece.computeBoundingBox();
    const top = piece.boundingBox.max.y;
    footprint(best.x, best.z, reach, (index, d) => {
      heights[index] = Math.max(heights[index], best.y + (top - best.y) * Math.sqrt(1 - d * d) * 0.8);
    });
  }
  shapes.forEach((s) => s.dispose());
  if (!parts.length) return null;
  const pile = merge(parts.map((p) => {
    p.computeVertexNormals();
    return facetedLook ? faceted(p) : p;
  }));
  return pile;
};

// Small lumpy granules strewn over the top of a heap so its surface has real relief.
export const buildGranuleLayer = ({ heap, innerProfile, seed, size, count }) => {
  if (!heap) return null;
  const floor = innerProfile[0][1];
  const bounds = { floor: floor + 0.2 * MM, wall: radiusAt(innerProfile, floor + 12 * MM) - 0.3 * MM };
  const rng = random(seed + 17);
  const pos = heap.attributes.position;
  const normal = heap.attributes.normal;
  const shapes = Array.from({ length: 5 }, () => rockShape(rng, { cuts: 1, detail: 0 }));
  const parts = [];
  const matrix = new Matrix4();
  const up = new Vector3();
  for (let n = 0; n < count; n += 1) {
    const i = Math.floor(rng() * pos.count);
    up.fromBufferAttribute(normal, i);
    if (up.y < 0.6) continue;
    const scale = size * (0.7 + rng() * 0.6);
    const q = new Quaternion().setFromAxisAngle(new Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), rng() * Math.PI);
    matrix.compose(new Vector3(pos.getX(i), pos.getY(i) + scale * 0.15, pos.getZ(i)), q, new Vector3(scale, scale * 0.8, scale));
    appendTransformed(parts, shapes[n % shapes.length], matrix, [rng() * 4, rng() * 4], bounds);
  }
  shapes.forEach((s) => s.dispose());
  if (!parts.length) return null;
  return merge(parts.map((p) => {
    p.computeVertexNormals();
    return p;
  }));
};

// Ribbon roll standing on edge against the jar wall (layers come from the ring texture), loose end curling off.
export const buildRibbonRoll = ({ innerProfile, amount, seed, width = 3 * MM, thickness = 0.2 * MM }) => {
  if (amount <= 0) return null;
  const rng = random(seed);
  const floor = innerProfile[0][1];
  const wall = radiusAt(innerProfile, floor + 20 * MM);
  const core = 7 * MM;
  const outer = core + 2 * MM + 13 * MM * Math.sqrt(amount);
  const e = 0.25 * MM;
  const half = width / 2;
  const roll = lathe(
    [
      [core, half - e],
      [core, -half + e],
      [core + e, -half],
      [outer - e, -half],
      [outer, -half + e],
      [outer, half - e],
      [outer - e, half],
      [core + e, half],
      [core, half - e],
    ],
    72,
  );
  const uv = roll.attributes.uv;
  const p = roll.attributes.position;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, Math.hypot(p.getX(i), p.getZ(i)) / thickness / 2.2, p.getY(i) / TILE);

  const sweep = 2.2 + rng() * 0.8;
  const steps = 48;
  const start = Math.PI * (0.35 + rng() * 0.2);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = start + t * sweep;
    const r = outer + 0.1 * MM + t * t * 7 * MM;
    const lift = t * t * 2.5 * MM;
    const [sin, cos] = [Math.sin(a), Math.cos(a)];
    for (const side of [-1, 1]) {
      positions.push(sin * r, side * half + lift, cos * r);
      normals.push(sin, 0, cos);
      uvs.push(side * 0.5 + 0.5, t * 4);
    }
    if (i < steps) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const strip = new BufferGeometry();
  strip.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  strip.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  strip.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  strip.setIndex(indices);

  const lean = 0.2 + rng() * 0.1;
  const yaw = -0.75 + rng() * 0.3;
  const reach = wall - 1.5 * MM - outer * Math.cos(lean);
  const matrix = new Matrix4()
    .makeTranslation(-Math.sin(yaw) * reach * 0.35, floor + outer * Math.cos(lean) + half * Math.sin(lean), -Math.cos(yaw) * reach * 0.35)
    .multiply(new Matrix4().makeRotationY(yaw))
    .multiply(new Matrix4().makeRotationZ(lean))
    .multiply(new Matrix4().makeRotationX(Math.PI / 2));
  roll.applyMatrix4(matrix);
  strip.applyMatrix4(matrix);
  return { roll, strip };
};

// Hank of wire: jittered loops stacked on the floor, with both ends sticking out.
export const buildWireHank = ({ innerProfile, amount, seed, wire = 0.8 * MM, maxLoops = 11 }) => {
  const loops = Math.round(amount * maxLoops);
  if (loops < 1) return null;
  const rng = random(seed);
  const floor = innerProfile[0][1];
  const wall = radiusAt(innerProfile, floor + 10 * MM) - wire - 0.6 * MM;
  const parts = [];
  const radial = 4;
  const along = 36;
  const tube = (curve, closed, count = along) => {
    const frames = curve.computeFrenetFrames(count, closed);
    const positions = [];
    const normals = [];
    const indices = [];
    for (let i = 0; i <= count; i += 1) {
      const c = curve.getPointAt(i / count);
      const k = closed ? i % count : i;
      for (let j = 0; j <= radial; j += 1) {
        const a = (j / radial) * Math.PI * 2;
        const n = frames.normals[k].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[k], Math.sin(a));
        positions.push(c.x + n.x * wire, c.y + n.y * wire, c.z + n.z * wire);
        normals.push(n.x, n.y, n.z);
      }
    }
    for (let i = 0; i < count; i += 1) {
      for (let j = 0; j < radial; j += 1) {
        const a = i * (radial + 1) + j;
        const b = a + radial + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    g.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
    g.setIndex(indices);
    return g;
  };

  const loopRadius = Math.min(24 * MM, wall - 1 * MM);
  const center = new Vector3((rng() - 0.5) * 3 * MM, 0, (rng() - 0.5) * 3 * MM);
  for (let l = 0; l < loops; l += 1) {
    const r = loopRadius * (0.9 + rng() * 0.12);
    const tiltA = rng() * Math.PI * 2;
    const tilt = 0.05 + rng() * 0.12;
    const base = floor + wire + l * wire * 1.1 + rng() * 0.6 * MM;
    const phase = rng() * Math.PI * 2;
    const points = [];
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2;
      const rr = Math.min(wall - center.length(), r * (1 + Math.sin(a * 2 + phase) * 0.035));
      const y = base + Math.max(0, Math.sin(a - tiltA) * tilt * rr + tilt * rr) * 0.5;
      points.push(new Vector3(center.x + Math.sin(a) * rr, y, center.z + Math.cos(a) * rr));
    }
    parts.push(tube(new CatmullRomCurve3(points, true, "centripetal"), true));
  }
  const top = floor + wire + loops * wire * 1.1;
  for (const [angle, reach] of [[rng() * Math.PI * 2, 30 * MM], [rng() * Math.PI * 2, 18 * MM]]) {
    const r = loopRadius * 0.98;
    const points = [0, 0.2, 0.45, 0.75, 1].map((t) => {
      const a = angle + t * 0.9;
      const rr = r - t * 6 * MM;
      return new Vector3(center.x + Math.sin(a) * rr, top + t * reach, center.z + Math.cos(a) * rr);
    });
    parts.push(tube(new CatmullRomCurve3(points), false, 16));
  }
  return merge(parts);
};

// Planar projection so the jar-template piece materials tile over a single piece too.
const planarUv = (geometry) => {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    uv[i * 2] = pos.getX(i) * 0.5 + pos.getZ(i) * 0.3;
    uv[i * 2 + 1] = pos.getY(i) * 0.5;
  }
  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
};

// Swept tube along a curve, used for wire coils and their offcuts.
const sweep = (curve, radius, { closed = false, steps = 48, radial = 6 } = {}) => {
  const frames = curve.computeFrenetFrames(steps, closed);
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= steps; i += 1) {
    const c = curve.getPointAt(Math.min(1, i / steps));
    const k = closed ? i % steps : i;
    for (let j = 0; j <= radial; j += 1) {
      const a = (j / radial) * Math.PI * 2;
      const n = frames.normals[k].clone().multiplyScalar(Math.cos(a)).addScaledVector(frames.binormals[k], Math.sin(a));
      positions.push(c.x + n.x * radius, c.y + n.y * radius, c.z + n.z * radius);
      normals.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(indices);
  return geometry;
};

// Rolled magnesium ribbon: a slightly curled, dented strip one unit long, 0.1 wide and 0.007 thick.
const ribbonPiece = (rng) => {
  const along = 26;
  const across = 3;
  const positions = [];
  const indices = [];
  const twist = (rng() - 0.5) * 0.9;
  const curl = 0.06 + rng() * 0.09;
  for (let i = 0; i <= along; i += 1) {
    const t = i / along;
    const x = t - 0.5;
    const bend = curl * (t - 0.5) * (t - 0.5) * 4 - curl * 0.35 + Math.sin(t * 9 + twist) * 0.008;
    for (let j = 0; j <= across; j += 1) {
      const w = (j / across - 0.5) * 0.1;
      const dent = Math.sin(t * 17 + j * 2.1 + twist) * 0.0016;
      for (const side of [1, -1]) positions.push(x, bend + dent + side * 0.0035 + w * twist * 0.12, w);
    }
  }
  const row = (across + 1) * 2;
  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < across; j += 1) {
      const a = i * row + j * 2;
      for (const side of [0, 1]) {
        const o = a + side;
        const flip = side === 0;
        const quad = [o, o + 2, o + row, o + row + 2];
        indices.push(...(flip ? [quad[0], quad[1], quad[2], quad[1], quad[3], quad[2]] : [quad[0], quad[2], quad[1], quad[1], quad[2], quad[3]]));
      }
    }
  }
  // Cap the four sides so the strip reads as sheet metal rather than a plane.
  for (let i = 0; i < along; i += 1) {
    for (const j of [0, across]) {
      const a = i * row + j * 2;
      const b = a + row;
      indices.push(...(j === 0 ? [a, b, a + 1, a + 1, b, b + 1] : [a, a + 1, b, a + 1, b + 1, b]));
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  return planarUv(geometry);
};

const coilCurve = (rng) => {
  const turns = 1.6 + rng() * 0.5;
  const points = [];
  const steps = 40;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = t * turns * Math.PI * 2;
    const lead = t < 0.06 ? (0.06 - t) * 6 : 0;
    const r = 0.3 + lead * 0.5 + Math.sin(a * 1.7) * 0.012;
    points.push(new Vector3(Math.sin(a) * r, -0.32 + t * 0.62, Math.cos(a) * r));
  }
  return new CatmullRomCurve3(points, false, "centripetal");
};

// One piece as picked up with tongs, in unit size; instances scale it by mass.
export const pieceGeometry = (shape, seed = 3) => {
  const rng = random(seed);
  if (shape === "ribbon") return ribbonPiece(rng);
  if (shape === "wire") return planarUv(sweep(coilCurve(rng), 0.05, { steps: 56, radial: 7 }));
  const spec = shape === "granule" ? { cuts: 1, detail: 2 } : shape === "chip" ? { cuts: 4, detail: 1 } : { cuts: 5, detail: 2 };
  const rock = rockShape(rng, spec);
  const pos = rock.attributes.position;
  for (let i = 0; i < pos.count; i += 1) pos.setY(i, pos.getY(i) * (shape === "granule" ? 0.78 : 0.88));
  return planarUv(shape === "chip" ? faceted(rock) : rock);
};

// Points on the copper coil where silver crystals take hold, with the outward direction of the wire surface.
export const coilRoots = (count = 90, seed = 3) => {
  const rng = random(seed + 101);
  const curve = coilCurve(random(seed));
  const axis = new Vector3();
  const roots = [];
  for (let i = 0; i < count; i += 1) {
    const t = rng();
    const point = curve.getPointAt(Math.min(1, t));
    const tangent = curve.getTangentAt(Math.min(1, t));
    const a = rng() * Math.PI * 2;
    axis.set(0, 1, 0);
    const side = new Vector3().crossVectors(tangent, axis).normalize();
    const other = new Vector3().crossVectors(tangent, side).normalize();
    const normal = side.multiplyScalar(Math.cos(a)).addScaledVector(other, Math.sin(a)).normalize();
    roots.push({ point: point.clone().addScaledVector(normal, 0.05), normal });
  }
  return roots;
};
