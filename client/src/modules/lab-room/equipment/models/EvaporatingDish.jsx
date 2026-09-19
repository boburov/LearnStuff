import { LatheGeometry } from "three";
import { useKit } from "../kit/kitContext";
import Contents from "../kit/Contents";
import { profileTable } from "../kit/profileTable";
import BlobShadow from "../kit/BlobShadow";
import { arc, toVectors } from "../kit/vessel";

// Porcelain evaporating basin with spout, half-deep form: Ø100 × 45 mm, ~170 ml, glazed except the foot ring.
const RIM_Y = 0.0435;
const RIM_INNER_RADIUS = 0.0466;
const WALL = 0.0032;
const FLOOR = 0.0045;
const BOWL_EXPONENT = 2.6;
const BOWL_LEAN = 0.04;
const RECESS_Y = 0.0014;
const RING_INNER = 0.0129;
const RING_OUTER = 0.017;
const FOOT_JOIN_RADIUS = 0.0195;
const SEGMENTS = 64;
const SEAM = Math.PI;
const SPOUT = { depth: 0.017, reach: 0.0056, halfAngle: 0.46 };

const dedupe = (points) =>
  points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-7);

const profileNormals = (points) =>
  points.map((_, j) => {
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

const lathe = (points, normals2d, segments) => {
  const geometry = new LatheGeometry(toVectors(points), segments, SEAM, Math.PI * 2);
  const normals = geometry.attributes.normal;
  for (let i = 0; i <= segments; i += 1) {
    const phi = SEAM + (i / segments) * Math.PI * 2;
    normals2d.forEach(([nr, ny], j) =>
      normals.setXYZ(i * points.length + j, nr * Math.sin(phi), ny, nr * Math.cos(phi)),
    );
  }
  return geometry;
};

// Outer and inner skins share one lathe here, so the spout keeps the wall thickness.
const addSpout = (geometry, { top, depth, reach, halfAngle }) => {
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-6) continue;
    let w = Math.max(0, 1 - Math.abs(Math.atan2(z, x)) / halfAngle);
    w = w * w * (3 - 2 * w);
    const t = Math.min(1, Math.max(0, (pos.getY(i) - (top - depth)) / depth)) ** 2;
    const k = w * t * reach;
    pos.setXYZ(i, (x * (r + k)) / r, pos.getY(i) - k * 0.3, (z * (r + k)) / r);
  }
  geometry.computeVertexNormals();
  const { points, segments } = geometry.parameters;
  const normals = geometry.attributes.normal;
  for (let j = 0; j < points.length; j += 1) {
    const b = segments * points.length + j;
    const x = normals.getX(j) + normals.getX(b);
    const y = normals.getY(j) + normals.getY(b);
    const z = normals.getZ(j) + normals.getZ(b);
    const len = Math.hypot(x, y, z) || 1;
    normals.setXYZ(j, x / len, y / len, z / len);
    normals.setXYZ(b, x / len, y / len, z / len);
  }
  return geometry;
};

// Superellipse bowl from the floor centre to the rim; the wall still leans outward a little at the rim.
const bowlCurve = (steps) => {
  const n = BOWL_EXPONENT;
  const yc = RIM_Y + BOWL_LEAN;
  const b = yc - FLOOR;
  const a = RIM_INNER_RADIUS / (1 - (BOWL_LEAN / b) ** n) ** (1 / n);
  const end = Math.acos((BOWL_LEAN / b) ** (n / 2));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = (end * i) / steps;
    return [a * Math.sin(t) ** (2 / n), yc - b * Math.cos(t) ** (2 / n)];
  });
};

const buildProfile = () => {
  const inner = bowlCurve(23);
  const outer = inner.map((p, i) => {
    const a = inner[Math.max(0, i - 1)];
    const b = inner[Math.min(inner.length - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return [p[0] + ((b[1] - a[1]) / len) * WALL, p[1] - ((b[0] - a[0]) / len) * WALL];
  });

  const join = outer.findIndex((p) => p[0] >= FOOT_JOIN_RADIUS);
  const [jr, jy] = outer[join];
  const slope = (outer[join + 1][1] - outer[join - 1][1]) / (outer[join + 1][0] - outer[join - 1][0]);
  const controlY = jy - (jr - RING_OUTER) * slope;
  const wallTop = controlY - 0.0011;
  const blend = Array.from({ length: 5 }, (_, i) => {
    const t = (i + 1) / 6;
    const m = 1 - t;
    return [(m * m + 2 * m * t) * RING_OUTER + t * t * jr, m * m * wallTop + 2 * m * t * controlY + t * t * jy];
  });

  const foot = [
    [0, RECESS_Y],
    ...arc(RING_INNER - 0.0006, RECESS_Y - 0.0006, 0.0006, Math.PI / 2, 0, 3),
    ...arc(RING_INNER + 0.0005, 0.0005, 0.0005, Math.PI, Math.PI * 1.5, 3),
    ...arc(RING_OUTER - 0.0007, 0.0007, 0.0007, Math.PI * 1.5, Math.PI * 2, 3),
    [RING_OUTER, wallTop],
  ];

  const rimOuter = outer[outer.length - 1];
  const rimInner = inner[inner.length - 1];
  const rimCenter = [(rimOuter[0] + rimInner[0]) / 2, (rimOuter[1] + rimInner[1]) / 2];
  const rimFrom = Math.atan2(rimOuter[1] - rimCenter[1], rimOuter[0] - rimCenter[0]);
  const rimRadius = Math.hypot(rimOuter[0] - rimInner[0], rimOuter[1] - rimInner[1]) / 2;

  const points = dedupe([
    ...foot,
    ...blend,
    ...outer.slice(join),
    ...arc(rimCenter[0], rimCenter[1], rimRadius, rimFrom, rimFrom + Math.PI, 7),
    ...[...inner].reverse(),
  ]);
  const normals = profileNormals(points);
  const split = foot.length - 1;
  return {
    foot: lathe(points.slice(0, split + 1), normals.slice(0, split + 1), SEGMENTS),
    body: addSpout(lathe(points.slice(split), normals.slice(split), SEGMENTS), { top: RIM_Y, ...SPOUT }),
    innerProfile: inner,
  };
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const built = buildProfile();
  const { innerProfile } = built;
  assets = {
    ...built,
    mouth: { innerProfile, mouthY: RIM_Y, mouthR: RIM_INNER_RADIUS, capacityMl: profileTable(innerProfile, RIM_Y).capacityMl },
  };
  return assets;
};

const EvaporatingDish = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, ...props }) => {
  const kit = useKit();
  const { foot, body, mouth } = getAssets();

  return (
    <group {...props}>
      <mesh geometry={body} material={kit.porcelainGlazed} castShadow receiveShadow />
      <mesh geometry={foot} material={kit.porcelainMatte} castShadow receiveShadow />
      <Contents simId={simId} vessel={mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      <BlobShadow radius={0.056} opacity={0.32} />
    </group>
  );
};

export default EvaporatingDish;
