import { BufferAttribute, BufferGeometry, CircleGeometry, LatheGeometry, Sphere, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { radiusAt, toVectors } from "./vessel";

const FLUID_INSET = 0.0004;
const cache = new WeakMap();

const cached = (profile, key, build) => {
  let entry = cache.get(profile);
  if (!entry) {
    entry = new Map();
    cache.set(profile, entry);
  }
  if (!entry.has(key)) entry.set(key, build());
  return entry.get(key);
};

const filled = (count, value) => new BufferAttribute(new Float32Array(count).fill(value), 1);

const withPart = (geometry, part) => {
  const count = geometry.attributes.position.count;
  geometry.setAttribute("aPart", filled(count, part));
  return geometry;
};

const maxRadius = (profile) => profile.reduce((max, [r]) => Math.max(max, r), 0);

// Vertex shaders move these meshes, so bounds cover the whole vessel instead of the rest pose.
const vesselBounds = (geometry, profile, top, above = 0) => {
  const height = top - profile[0][1] + above;
  geometry.boundingSphere = new Sphere(new Vector3(0, profile[0][1] + height / 2, 0), Math.hypot(maxRadius(profile) * 1.2, height / 2));
  return geometry;
};

// The vessel interior offset from the glass, floor to mouth; `lift` also raises the floor so layers never z-fight.
export const insetProfile = (profile, top, inset, lift = inset) => {
  const points = [];
  for (const [r, y] of profile) {
    if (y >= top) break;
    points.push([Math.max(0, r - inset), y + lift]);
  }
  points.push([Math.max(0, radiusAt(profile, top) - inset), top]);
  return points;
};

const segmentsFor = (profile) => (maxRadius(profile) > 0.04 ? 72 : 48);

const wallLathe = (profile, top, inset, segments) =>
  withPart(new LatheGeometry(toVectors(insetProfile(profile, top, inset)), segments, Math.PI, Math.PI * 2), 0);

// Closed interior shell (wall + mouth disc): every view ray into the vessel enters through one front face.
export const fluidGeometry = (profile, top) =>
  cached(profile, `fluid:${top}`, () => {
    const segments = segmentsFor(profile);
    const wall = wallLathe(profile, top, FLUID_INSET, segments);
    const cap = new CircleGeometry(Math.max(0.0005, radiusAt(profile, top) - FLUID_INSET), segments, Math.PI / 2);
    cap.rotateX(-Math.PI / 2);
    cap.translate(0, top, 0);
    const merged = mergeGeometries([wall, withPart(cap, 1)]);
    wall.dispose();
    cap.dispose();
    return merged;
  });

// Unit disc whose rings the vertex shader places at a live radius: dense rings hug the wall (meniscus, heaps), the rest spread inward.
const ringDisc = (profile, segments) => {
  const edges = [0, 0.00015, 0.0004, 0.0008, 0.0014, 0.0022, 0.0033, 0.0048, 0.0068];
  const inner = Math.max(6, Math.min(18, Math.round(maxRadius(profile) / 0.0035)));
  const rings = [
    ...edges.map((edge) => [edge, 1]),
    ...Array.from({ length: inner }, (_, i) => [edges[edges.length - 1], 1 - (i + 1) / (inner + 1)]),
  ];
  const cols = segments + 1;
  const count = rings.length * cols + 1;
  const position = new Float32Array(count * 3);
  const normal = new Float32Array(count * 3);
  const edge = new Float32Array(count);
  const frac = new Float32Array(count);
  rings.forEach(([e, f], j) => {
    for (let i = 0; i < cols; i += 1) {
      const a = Math.PI + (i / segments) * Math.PI * 2;
      const k = j * cols + i;
      position.set([Math.sin(a), 0, Math.cos(a)], k * 3);
      normal.set([0, 1, 0], k * 3);
      edge[k] = e;
      frac[k] = f;
    }
  });
  const center = count - 1;
  normal.set([0, 1, 0], center * 3);
  const index = [];
  for (let j = 0; j < rings.length - 1; j += 1) {
    for (let i = 0; i < segments; i += 1) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      index.push(a, b, c, b, d, c);
    }
  }
  const last = (rings.length - 1) * cols;
  for (let i = 0; i < segments; i += 1) index.push(last + i, last + i + 1, center);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(position, 3));
  geometry.setAttribute("normal", new BufferAttribute(normal, 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(count * 2), 2));
  geometry.setAttribute("aEdge", new BufferAttribute(edge, 1));
  geometry.setAttribute("aFrac", new BufferAttribute(frac, 1));
  geometry.setIndex(index);
  return geometry;
};

const withRingAttributes = (geometry) => {
  const count = geometry.attributes.position.count;
  geometry.setAttribute("aEdge", filled(count, 0));
  geometry.setAttribute("aFrac", filled(count, 1));
  return geometry;
};

// Wall shell clipped in the shader plus a displaced top disc: settled beds and foam heads.
export const layerGeometry = (profile, top, inset) =>
  cached(profile, `layer:${top}:${inset}`, () => {
    const segments = segmentsFor(profile);
    const wall = withRingAttributes(wallLathe(profile, top, inset, segments));
    const disc = withPart(ringDisc(profile, segments), 1);
    const merged = mergeGeometries([wall, disc]);
    wall.dispose();
    disc.dispose();
    return vesselBounds(merged, profile, top, maxRadius(profile) * 0.5);
  });

// A lone top disc for powder floating on the liquid.
export const discGeometry = (profile, top) =>
  cached(profile, `disc:${top}`, () => vesselBounds(withPart(ringDisc(profile, segmentsFor(profile)), 1), profile, top));

// Unit column (v along the height, angle around) with a crumbly domed top; the shader sizes it to the vessel.
export const columnGeometry = (profile, top) =>
  cached(profile, `column:${top}`, () => {
    const segments = 40;
    const rows = 48;
    const capRows = 8;
    const cols = segments + 1;
    const count = (rows + 1 + capRows) * cols + 1;
    const position = new Float32Array(count * 3);
    const v = new Float32Array(count);
    const angle = new Float32Array(count);
    const cap = new Float32Array(count);
    const put = (k, vv, a, c) => {
      v[k] = vv;
      angle[k] = a;
      cap[k] = c;
    };
    for (let j = 0; j <= rows; j += 1) {
      for (let i = 0; i < cols; i += 1) put(j * cols + i, j / rows, Math.PI + (i / segments) * Math.PI * 2, 0);
    }
    for (let j = 1; j <= capRows; j += 1) {
      for (let i = 0; i < cols; i += 1) put((rows + j) * cols + i, 1, Math.PI + (i / segments) * Math.PI * 2, j / (capRows + 1));
    }
    const apex = count - 1;
    put(apex, 1, 0, 1);
    const index = [];
    for (let j = 0; j < rows + capRows; j += 1) {
      for (let i = 0; i < segments; i += 1) {
        const a = j * cols + i;
        index.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
      }
    }
    const lastRing = (rows + capRows) * cols;
    for (let i = 0; i < segments; i += 1) index.push(lastRing + i, lastRing + i + 1, apex);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(position, 3));
    geometry.setAttribute("normal", new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("uv", new BufferAttribute(new Float32Array(count * 2), 2));
    geometry.setAttribute("aV", new BufferAttribute(v, 1));
    geometry.setAttribute("aAngle", new BufferAttribute(angle, 1));
    geometry.setAttribute("aCap", new BufferAttribute(cap, 1));
    geometry.setIndex(index);
    return vesselBounds(geometry, profile, top, (top - profile[0][1]) * 1.2);
  });

const random = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Silver tree: sprays of thin bipyramid needles rooted on given points, each with a birth time so the tree grows.
export const crystalGeometry = (roots, seed = 7) => {
  const rng = random(seed);
  const positions = [];
  const normals = [];
  const rootAttr = [];
  const birth = [];
  const up = new Vector3();
  const side = new Vector3();
  const other = new Vector3();
  const dir = new Vector3();
  const tip = new Vector3();
  const base = new Vector3();
  const push = (p, n, root, b) => {
    positions.push(p.x, p.y, p.z);
    normals.push(n.x, n.y, n.z);
    rootAttr.push(root.x, root.y, root.z);
    birth.push(b);
  };
  const face = (a, b, c, root, born) => {
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize();
    push(a, n, root, born);
    push(b, n, root, born);
    push(c, n, root, born);
  };
  for (const { point, normal } of roots) {
    const sprayBirth = rng() * 0.55;
    const needles = 3 + Math.floor(rng() * 4);
    for (let n = 0; n < needles; n += 1) {
      dir.copy(normal).add(new Vector3(rng() - 0.5, rng() - 0.3, rng() - 0.5).multiplyScalar(1.3)).normalize();
      // Unit space: the copper coil is about 0.3 units wide, so a needle of 0.2 units is a few millimetres.
      const length = 0.06 + rng() * rng() * 0.22;
      const width = 0.006 + rng() * 0.009;
      const born = Math.min(0.85, sprayBirth + rng() * 0.3);
      base.copy(point).addScaledVector(normal, -0.02);
      tip.copy(base).addScaledVector(dir, length);
      up.set(0, 1, 0);
      if (Math.abs(dir.y) > 0.9) up.set(1, 0, 0);
      side.crossVectors(dir, up).normalize().multiplyScalar(width);
      other.crossVectors(dir, side).normalize().multiplyScalar(width);
      const mid = base.clone().addScaledVector(dir, length * 0.25);
      const ring = [side, other, side.clone().negate(), other.clone().negate()].map((o) => mid.clone().add(o));
      for (let k = 0; k < 4; k += 1) {
        const a = ring[k];
        const b = ring[(k + 1) % 4];
        face(a, b, tip, base, born);
        face(b, a, base, base, born);
      }
      // Side branches make the sprays feathery rather than spiky.
      if (length > 0.16) {
        const branchBase = base.clone().addScaledVector(dir, length * (0.4 + rng() * 0.3));
        const branchDir = dir.clone().add(new Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).multiplyScalar(2)).normalize();
        const branchTip = branchBase.clone().addScaledVector(branchDir, length * 0.35);
        const s2 = new Vector3().crossVectors(branchDir, up).normalize().multiplyScalar(width * 0.7);
        face(branchBase.clone().add(s2), branchBase.clone().sub(s2), branchTip, base, Math.min(0.95, born + 0.1));
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("aRoot", new BufferAttribute(new Float32Array(rootAttr), 3));
  geometry.setAttribute("aBirth", new BufferAttribute(new Float32Array(birth), 1));
  geometry.computeBoundingSphere();
  return geometry;
};
