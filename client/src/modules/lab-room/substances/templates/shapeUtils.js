import { BufferAttribute, BufferGeometry, CylinderGeometry, LatheGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const MM = 0.001;
export const SEAM = Math.PI;

export const arc = (cr, cy, radius, from, to, steps = 6) => {
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = from + ((to - from) * i) / steps;
    out.push([cr + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return out;
};

export const ellipse = (cr, cy, a, b, from, to, steps) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / steps;
    return [cr + a * Math.cos(t), cy + b * Math.sin(t)];
  });

// Cubic Bezier samples between [r, y] points (both ends included).
export const bezier = (p0, p1, p2, p3, steps = 12) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
  });

export const dedupe = (points) =>
  points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-7);

const unit = (x, y) => {
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};

// Rounds each corner of a polyline with the given radius (0 keeps the corner sharp); steps may be per corner.
export const fillet = (corners, radii, steps = 6) => {
  const out = [corners[0]];
  for (let i = 1; i < corners.length - 1; i += 1) {
    const [px, py] = corners[i];
    const radius = radii[i];
    if (!radius) {
      out.push(corners[i]);
      continue;
    }
    const u = unit(corners[i - 1][0] - px, corners[i - 1][1] - py);
    const v = unit(corners[i + 1][0] - px, corners[i + 1][1] - py);
    const angle = Math.acos(Math.min(1, Math.max(-1, u[0] * v[0] + u[1] * v[1])));
    const reach = radius / Math.tan(angle / 2);
    const bisector = unit(u[0] + v[0], u[1] + v[1]);
    const cx = px + (bisector[0] * radius) / Math.sin(angle / 2);
    const cy = py + (bisector[1] * radius) / Math.sin(angle / 2);
    const from = Math.atan2(py + u[1] * reach - cy, px + u[0] * reach - cx);
    const to = Math.atan2(py + v[1] * reach - cy, px + v[0] * reach - cx);
    const count = Array.isArray(steps) ? steps[i] : steps;
    out.push(...arc(cx, cy, radius, from, from + Math.atan2(Math.sin(to - from), Math.cos(to - from)), count));
  }
  out.push(corners[corners.length - 1]);
  return dedupe(out);
};

// Lathe with evenly weighted profile normals (three weights by segment length, which breaks short fillets).
export const lathe = (points, segments, { phiStart = SEAM, phiLength = Math.PI * 2, arcLengthV = false } = {}) => {
  const geometry = new LatheGeometry(
    points.map(([r, y]) => new Vector2(Math.max(0, r), y)),
    segments,
    phiStart,
    phiLength,
  );
  const profile = points.map((_, j) => {
    let nr = 0;
    let ny = 0;
    for (const k of [j - 1, j]) {
      const a = points[k];
      const b = points[k + 1];
      const len = a && b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0;
      if (len < 1e-9) continue;
      nr += (b[1] - a[1]) / len;
      ny -= (b[0] - a[0]) / len;
    }
    const len = Math.hypot(nr, ny) || 1;
    return [nr / len, ny / len];
  });
  const lengths = [0];
  for (let j = 1; j < points.length; j += 1) {
    lengths.push(lengths[j - 1] + Math.hypot(points[j][0] - points[j - 1][0], points[j][1] - points[j - 1][1]));
  }
  const total = lengths[lengths.length - 1] || 1;
  const normals = geometry.attributes.normal;
  const uv = geometry.attributes.uv;
  for (let i = 0; i <= segments; i += 1) {
    const phi = phiStart + (i / segments) * phiLength;
    profile.forEach(([nr, ny], j) => {
      const index = i * points.length + j;
      normals.setXYZ(index, nr * Math.sin(phi), ny, nr * Math.cos(phi));
      if (arcLengthV) uv.setY(index, lengths[j] / total);
    });
  }
  return geometry;
};

// Faceted look (octagonal stopper heads, hex nuts): every face gets its own normal.
export const faceted = (geometry) => {
  const flat = geometry.toNonIndexed();
  geometry.dispose();
  flat.computeVertexNormals();
  return flat;
};

// Same surface facing the other way: drawn before the front of solid glass so its far side shows through.
export const inverted = (geometry) => {
  const flipped = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const pos = flipped.attributes.position;
  const normal = flipped.attributes.normal;
  const uv = flipped.attributes.uv;
  for (let i = 0; i < pos.count; i += 3) {
    for (const attribute of [pos, normal, uv].filter(Boolean)) {
      const size = attribute.itemSize;
      for (let k = 0; k < size; k += 1) {
        const a = attribute.array[(i + 1) * size + k];
        attribute.array[(i + 1) * size + k] = attribute.array[(i + 2) * size + k];
        attribute.array[(i + 2) * size + k] = a;
      }
    }
  }
  for (let i = 0; i < normal.array.length; i += 1) normal.array[i] = -normal.array[i];
  return flipped;
};

// Screw-cap grip ribs; an integer rib count keeps the seam continuous.
const knurl = (radius, y0, y1, ribs, depth = 0.0005) => {
  const geometry = new CylinderGeometry(radius, radius, y1 - y0, ribs * 4, 1, true, SEAM);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const k = Math.max(0, Math.cos(Math.atan2(x, z) * ribs));
    const scale = (radius - depth + depth * Math.sqrt(k)) / radius;
    pos.setXYZ(i, x * scale, pos.getY(i), z * scale);
  }
  geometry.translate(0, (y0 + y1) / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
};

// Screw caps rise this much above their nominal height in the middle of the top.
export const CAP_DOME = 0.15 * MM;

// Moulded screw cap standing on y0: rounded skirt with grip ribs, flat top and a hollow inside.
export const buildScrewCap = ({ radius, height, y0 = 0, innerRadius, topThickness = 1.8 * MM, edge = 1.5 * MM, ribs = 48, segments = 48 }) => {
  const skirt = radius - 0.55 * MM;
  const top = y0 + height;
  const outer = dedupe([
    [innerRadius, y0 + 0.6 * MM],
    ...arc(innerRadius + 0.6 * MM, y0 + 0.6 * MM, 0.6 * MM, Math.PI, Math.PI * 1.5, 3).slice(1),
    [skirt - 0.7 * MM, y0],
    ...arc(skirt - 0.7 * MM, y0 + 0.7 * MM, 0.7 * MM, -Math.PI / 2, 0, 3).slice(1),
    ...arc(skirt - edge, top - edge, edge, 0, Math.PI / 2, 6),
    [0, top + CAP_DOME],
  ]);
  const inner = [
    [0, top - topThickness],
    [innerRadius - 0.8 * MM, top - topThickness],
    ...arc(innerRadius - 0.8 * MM, top - topThickness - 0.8 * MM, 0.8 * MM, Math.PI / 2, 0, 3).slice(1),
    [innerRadius, y0 + 0.6 * MM],
  ];
  return merge([
    lathe(outer, segments),
    lathe(inner, segments),
    knurl(radius + 0.1 * MM, y0 + 1.4 * MM, top - edge - 0.3 * MM, ribs, 0.6 * MM),
  ]);
};

// Merges parts that share one material; missing uvs are zero-filled and non-indexed parts get an index.
export const merge = (geometries) => {
  const prepared = geometries.map((g) => {
    const out = new BufferGeometry();
    out.setAttribute("position", g.attributes.position);
    out.setAttribute("normal", g.attributes.normal);
    out.setAttribute("uv", g.attributes.uv ?? new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    out.setIndex(g.index ?? [...Array(g.attributes.position.count).keys()]);
    return out;
  });
  const merged = mergeGeometries(prepared);
  geometries.forEach((g) => g.dispose());
  return merged;
};

export const seedOf = (text) => {
  let h = 2166136261;
  for (const char of text) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// Deterministic PRNG (mulberry32) so a substance always gets the same pile of pieces.
export const random = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const lattice = (x, y, z, seed) => {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const smooth = (t) => t * t * (3 - 2 * t);

export const noise3 = (x, y, z, seed = 0) => {
  const [ix, iy, iz] = [Math.floor(x), Math.floor(y), Math.floor(z)];
  const [fx, fy, fz] = [smooth(x - ix), smooth(y - iy), smooth(z - iz)];
  const mix = (a, b, t) => a + (b - a) * t;
  const plane = (zz) =>
    mix(
      mix(lattice(ix, iy, zz, seed), lattice(ix + 1, iy, zz, seed), fx),
      mix(lattice(ix, iy + 1, zz, seed), lattice(ix + 1, iy + 1, zz, seed), fx),
      fy,
    );
  return mix(plane(iz), plane(iz + 1), fz);
};

export const fbm3 = (x, y, z, seed = 0, octaves = 3) => {
  let sum = 0;
  let amplitude = 0.5;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    const f = 2 ** o;
    sum += noise3(x * f, y * f, z * f, seed + o * 101) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
  }
  return sum / norm;
};

const addGrid = (rows, flip, out) => {
  const base = out.positions.length / 3;
  const cols = rows[0].length;
  rows.forEach((row) =>
    row.forEach(({ p, n, uv }) => {
      out.positions.push(...p);
      out.normals.push(...n);
      out.uvs.push(...uv);
    }),
  );
  for (let j = 0; j < rows.length - 1; j += 1) {
    for (let i = 0; i < cols - 1; i += 1) {
      const a = base + j * cols + i;
      const b = a + 1;
      const d = a + cols;
      const c = d + 1;
      if (flip) out.indices.push(a, d, b, b, d, c);
      else out.indices.push(a, b, d, b, c, d);
    }
  }
};

const toGeometry = ({ positions, normals, uvs, indices }) => {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
};

// Paper label wrapped around a cylinder, centred on +Z: a printed face, a plain back and a thin cut edge.
export const buildWrapLabel = ({ radius, width, height, y0, corner = 2.5 * MM, thickness = 0.12 * MM, cols = 26, back = true }) => {
  const rowDefs = [];
  const steps = 3;
  for (let k = 0; k <= steps; k += 1) {
    const phi = (k / steps) * (Math.PI / 2);
    rowDefs.push([corner * (1 - Math.cos(phi)), width / 2 - corner + corner * Math.sin(phi)]);
  }
  const middle = Math.max(1, Math.round((height - corner * 2) / (12 * MM)));
  for (let k = 1; k < middle; k += 1) rowDefs.push([corner + ((height - corner * 2) * k) / middle, width / 2]);
  for (let k = steps; k >= 0; k -= 1) {
    const phi = (k / steps) * (Math.PI / 2);
    rowDefs.push([height - corner * (1 - Math.cos(phi)), width / 2 - corner + corner * Math.sin(phi)]);
  }

  const surface = (rho, inward) =>
    rowDefs.map(([t, half]) =>
      Array.from({ length: cols + 1 }, (_, i) => {
        const s = -half + (2 * half * i) / cols;
        const a = s / radius;
        const [sin, cos] = [Math.sin(a), Math.cos(a)];
        return {
          p: [rho * sin, y0 + t, rho * cos],
          n: inward ? [-sin, 0, -cos] : [sin, 0, cos],
          uv: [s / width + 0.5, t / height],
        };
      }),
    );

  const front = { positions: [], normals: [], uvs: [], indices: [] };
  addGrid(surface(radius + thickness, false), false, front);

  const paper = { positions: [], normals: [], uvs: [], indices: [] };
  const outer = surface(radius + thickness, false);
  const inner = surface(radius, true);
  if (back) addGrid(inner, true, paper);
  const loop = [
    ...outer[0].map((_, i) => [0, i]),
    ...rowDefs.slice(1).map((_, j) => [j + 1, cols]),
    ...outer[0].map((_, i) => [rowDefs.length - 1, cols - i]).slice(1),
    ...rowDefs.slice(1, -1).map((_, j) => [rowDefs.length - 2 - j, 0]),
  ];
  loop.forEach(([j, i], k) => {
    const [nj, ni] = loop[(k + 1) % loop.length];
    const base = paper.positions.length / 3;
    for (const v of [inner[j][i], inner[nj][ni], outer[nj][ni], outer[j][i]]) {
      paper.positions.push(...v.p);
      paper.uvs.push(...v.uv);
    }
    const [ax, ay, az] = inner[j][i].p;
    const [bx, by, bz] = inner[nj][ni].p;
    const [ox, , oz] = outer[j][i].n;
    const ex = bx - ax;
    const ey = by - ay;
    const ez = bz - az;
    let nx = ey * oz;
    let ny = ez * ox - ex * oz;
    let nz = -ey * ox;
    const len = Math.hypot(nx, ny, nz) || 1;
    [nx, ny, nz] = [nx / len, ny / len, nz / len];
    for (let q = 0; q < 4; q += 1) paper.normals.push(nx, ny, nz);
    paper.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return { front: toGeometry(front), paper: toGeometry(paper) };
};
