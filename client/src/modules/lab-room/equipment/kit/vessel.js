import { CylinderGeometry, LatheGeometry, Vector2 } from "three";

// Profiles are [radius, y] in meters with y = 0 at the base; lathe seams sit at the back (-Z).
const SEAM_START = Math.PI;

export const toVectors = (points) => points.map(([r, y]) => new Vector2(Math.max(0, r), y));

// Quarter/half circle helper; angles in radians, measured from +r toward +y.
export const arc = (cr, cy, radius, from, to, steps = 6) => {
  const out = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = from + ((to - from) * i) / steps;
    out.push([cr + Math.cos(a) * radius, cy + Math.sin(a) * radius]);
  }
  return out;
};

// Outward 2D normal of a polyline at point i (Lathe convention: normal = (dy, -dx)).
const normalAt = (points, i) => {
  const prev = points[Math.max(0, i - 1)];
  const next = points[Math.min(points.length - 1, i + 1)];
  const dx = next[0] - prev[0];
  const dy = next[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dy / len, -dx / len];
};

// Offsets an outer silhouette inward: sides by `wall`, downward-facing parts (the base) by `bottom`.
export const offsetInward = (outline, wall, bottom) =>
  outline.map((p, i) => {
    const [nr, ny] = normalAt(outline, i);
    const distance = ny < -0.7 ? bottom : wall;
    return [Math.max(0, p[0] - nr * distance), p[1] - ny * distance];
  });

export const radiusAt = (profile, y) => {
  for (let i = 1; i < profile.length; i += 1) {
    const [r0, y0] = profile[i - 1];
    const [r1, y1] = profile[i];
    if ((y >= y0 && y <= y1) || (y >= y1 && y <= y0)) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      return r0 + (r1 - r0) * t;
    }
  }
  return profile[profile.length - 1][0];
};

// Inner volume (m³) between the floor and height y, by integrating π r² dy.
export const volumeBelow = (profile, y, steps = 200) => {
  const floor = profile[0][1];
  if (y <= floor) return 0;
  const dy = (y - floor) / steps;
  let v = 0;
  for (let i = 0; i < steps; i += 1) {
    const r = radiusAt(profile, floor + (i + 0.5) * dy);
    v += Math.PI * r * r * dy;
  }
  return v;
};

export const heightForVolume = (profile, ml) => {
  const target = ml * 1e-6;
  let lo = profile[0][1];
  let hi = profile[profile.length - 1][1];
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (volumeBelow(profile, mid, 120) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

// Average the duplicated seam column so reflections show no line down the back.
const smoothSeam = (geometry, rows, segments) => {
  const normals = geometry.attributes.normal;
  for (let j = 0; j < rows; j += 1) {
    const a = j;
    const b = segments * rows + j;
    const x = normals.getX(a) + normals.getX(b);
    const y = normals.getY(a) + normals.getY(b);
    const z = normals.getZ(a) + normals.getZ(b);
    const len = Math.hypot(x, y, z) || 1;
    normals.setXYZ(a, x / len, y / len, z / len);
    normals.setXYZ(b, x / len, y / len, z / len);
  }
  normals.needsUpdate = true;
};

// Pulls the rim outward and slightly down around +X to form a pouring spout.
const deformSpout = (geometry, spout) => {
  const pos = geometry.attributes.position;
  const { top, depth, reach, halfAngle } = spout;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    const angle = Math.abs(Math.atan2(z, x));
    let w = Math.max(0, 1 - angle / halfAngle);
    w = w * w * (3 - 2 * w);
    let t = Math.min(1, Math.max(0, (y - (top - depth)) / depth));
    t = t * t;
    const k = w * t * reach;
    const scale = (r + k) / r;
    pos.setXYZ(i, x * scale, y - k * 0.25, z * scale);
  }
  pos.needsUpdate = true;
};

const lathe = (points, segments, spout) => {
  const geometry = new LatheGeometry(toVectors(points), segments, SEAM_START, Math.PI * 2);
  if (spout) {
    deformSpout(geometry, spout);
    geometry.computeVertexNormals();
    smoothSeam(geometry, points.length, segments);
  }
  return geometry;
};

// outline runs from the base center [0, 0] up to the rim's outer top point.
export const buildVessel = ({ outline, wall, bottom = wall, segments = 64, spout = null }) => {
  const innerRaw = offsetInward(outline, wall, bottom);
  const top = outline[outline.length - 1];
  const innerTop = innerRaw[innerRaw.length - 1];
  const rimRadius = (top[0] - innerTop[0]) / 2;
  const rimCenter = [(top[0] + innerTop[0]) / 2, Math.max(top[1], innerTop[1])];

  const rim = arc(rimCenter[0], rimCenter[1], rimRadius, 0, Math.PI, 6).slice(1);
  const outerPoints = [...outline, ...rim];
  const innerPoints = [[innerTop[0], rimCenter[1]], ...innerRaw.slice(0, -1).reverse()];
  if (innerPoints[innerPoints.length - 1][0] > 0) innerPoints.push([0, innerPoints[innerPoints.length - 1][1]]);

  const spoutSpec = spout ? { top: rimCenter[1], ...spout } : null;
  return {
    outer: lathe(outerPoints, segments, spoutSpec),
    inner: lathe(innerPoints, segments, spoutSpec),
    innerProfile: [...innerPoints].reverse(),
    rimY: rimCenter[1],
  };
};

// Inset slightly from the glass so the two never z-fight; the meniscus climbs the wall.
export const buildLiquid = (innerProfile, level, { inset = 0.0004, meniscus = 0.0015, segments = 48 } = {}) => {
  const points = [];
  for (const [r, y] of innerProfile) {
    if (y >= level) break;
    points.push([Math.max(0, r - inset), y + inset]);
  }
  const edge = Math.max(0, radiusAt(innerProfile, level) - inset);
  points.push([edge, level + meniscus]);
  points.push([Math.max(0, edge - meniscus * 2), level + meniscus * 0.3]);
  points.push([Math.max(0, edge - meniscus * 5), level]);
  points.push([0, level]);
  return new LatheGeometry(toVectors(points), segments, SEAM_START, Math.PI * 2);
};

// Open cylinder for printed graduations; u = 0.5 faces +Z (the front of the vessel).
export const buildPrintBand = (radius, y0, y1, segments = 64) => {
  const geometry = new CylinderGeometry(radius, radius, y1 - y0, segments, 1, true, -Math.PI, Math.PI * 2);
  geometry.translate(0, (y0 + y1) / 2, 0);
  return geometry;
};

export const disposeAll = (...geometries) => geometries.forEach((g) => g?.dispose());
