import { LatheGeometry } from "three";
import { useKit } from "../kit/kitContext";
import Contents from "../kit/Contents";
import { profileTable } from "../kit/profileTable";
import BlobShadow from "../kit/BlobShadow";
import { arc, toVectors } from "../kit/vessel";

// Porcelain crucible, medium form: Ø40 × 38 mm, glazed except the base; domed Ø45 mm lid with a knob.
const TOP_RADIUS = 0.02;
const BASE_RADIUS = 0.014;
const HEIGHT = 0.038;
const WALL = 0.0022;
const BOTTOM = 0.003;
const BASE_FILLET = 0.0035;
const FLOOR_FILLET = 0.0045;
const GLAZE_LINE = 0.0055;
const LID_RADIUS = 0.0225;
const LID_THICKNESS = 0.0021;
const LID_RISE = 0.0028;
const KNOB_RADIUS = 0.0036;
const KNOB_HEIGHT = 0.0052;
const SEGMENTS = 48;
const SEAM = Math.PI;

const dedupe = (points) =>
  points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-7);

const unit = (x, y) => {
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};

const fillet = (corners, radii, steps = 6) => {
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
    out.push(...arc(cx, cy, radius, from, from + Math.atan2(Math.sin(to - from), Math.cos(to - from)), steps));
  }
  out.push(corners[corners.length - 1]);
  return dedupe(out);
};

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

// One profile, several lathes (one per material) sharing normals so the glaze line shows no shading seam.
const splitLathe = (points, split, segments) => {
  const normals2d = profileNormals(points);
  return [
    [0, split],
    [split, points.length - 1],
  ].map(([from, to]) => {
    const part = points.slice(from, to + 1);
    const geometry = new LatheGeometry(toVectors(part), segments, SEAM, Math.PI * 2);
    const normals = geometry.attributes.normal;
    for (let s = 0; s <= segments; s += 1) {
      const phi = SEAM + (s / segments) * Math.PI * 2;
      for (let j = 0; j < part.length; j += 1) {
        const [nr, ny] = normals2d[from + j];
        normals.setXYZ(s * part.length + j, nr * Math.sin(phi), ny, nr * Math.cos(phi));
      }
    }
    return geometry;
  });
};

const buildCrucible = () => {
  const taper = (TOP_RADIUS - BASE_RADIUS) / HEIGHT;
  const rimRadius = (WALL * Math.hypot(1, taper)) / 2;
  const rimY = HEIGHT - rimRadius;
  const outerAt = (y) => BASE_RADIUS + y * taper;
  const innerAt = (y) => outerAt(y) - rimRadius * 2;

  const base = fillet([[0, 0], [BASE_RADIUS, 0], [outerAt(GLAZE_LINE), GLAZE_LINE]], [0, BASE_FILLET, 0]);
  const rim = arc(outerAt(rimY) - rimRadius, rimY, rimRadius, 0, Math.PI, 8);
  const inner = fillet([[innerAt(rimY), rimY], [innerAt(BOTTOM), BOTTOM], [0, BOTTOM]], [0, FLOOR_FILLET, 0]);
  const points = dedupe([...base, ...rim, ...inner]);
  const [foot, body] = splitLathe(points, base.length - 1, SEGMENTS);
  return { foot, body, rim, innerProfile: [...inner].reverse() };
};

const buildLid = () => {
  const edge = LID_RADIUS - LID_THICKNESS / 2;
  const under = (edge * edge + LID_RISE * LID_RISE) / (2 * LID_RISE);
  const top = under + LID_THICKNESS;
  const cy = LID_RISE - under;
  const phi = Math.asin(edge / under);
  const knobBase = KNOB_RADIUS + 0.0012;
  const topY = (r) => cy + Math.sqrt(top * top - r * r);
  const knobTop = topY(0) + KNOB_HEIGHT;
  const sphere = (radius, from, to, steps) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = from + ((to - from) * i) / steps;
      return [Math.sin(a) * radius, cy + Math.cos(a) * radius];
    });
  const mid = under + LID_THICKNESS / 2;
  const edgeFrom = Math.atan2(-Math.cos(phi), -Math.sin(phi));

  const points = dedupe([
    ...sphere(under, 0, phi, 8),
    ...arc(Math.sin(phi) * mid, cy + Math.cos(phi) * mid, LID_THICKNESS / 2, edgeFrom, edgeFrom + Math.PI, 10),
    ...sphere(top, phi, Math.asin(knobBase / top), 7),
    ...arc(knobBase, topY(knobBase) + 0.0012, 0.0012, -Math.PI / 2, -Math.PI, 6),
    ...arc(KNOB_RADIUS - 0.0014, knobTop - 0.0014, 0.0014, 0, Math.PI / 2, 6),
    [(KNOB_RADIUS - 0.0014) / 2, knobTop + 0.00015],
    [0, knobTop + 0.0002],
  ]);
  const outermost = points.reduce((best, p, i) => (p[0] > points[best][0] ? i : best), 0);
  const [underside, upper] = splitLathe(points, outermost, 64);
  const undersideY = (r) => cy + Math.sqrt(under * under - r * r);
  return { underside, upper, undersideY, minY: Math.min(...points.map((p) => p[1])) };
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const crucible = buildCrucible();
  const { innerProfile } = crucible;
  const mouthY = innerProfile[innerProfile.length - 1][1];
  crucible.mouth = {
    innerProfile,
    mouthY,
    mouthR: innerProfile[innerProfile.length - 1][0],
    capacityMl: profileTable(innerProfile, mouthY).capacityMl,
  };
  const lid = buildLid();
  // Lowest lid height at which its concave underside clears every point of the rounded rim.
  const seat = Math.max(...crucible.rim.map(([r, y]) => y - lid.undersideY(r)));
  assets = { crucible, lid, seat };
  return assets;
};

const Crucible = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, lidOpen = false, ...props }) => {
  const kit = useKit();
  const { crucible, lid, seat } = getAssets();
  const lidPosition = lidOpen ? [TOP_RADIUS + LID_RADIUS + 0.007, -lid.minY, 0.003] : [0, seat, 0];

  return (
    <group {...props}>
      <mesh geometry={crucible.body} material={kit.porcelainGlazed} castShadow receiveShadow />
      <mesh geometry={crucible.foot} material={kit.porcelainMatte} castShadow receiveShadow />
      <Contents simId={simId} vessel={crucible.mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      <group position={lidPosition}>
        <mesh geometry={lid.upper} material={kit.porcelainGlazed} castShadow receiveShadow />
        <mesh geometry={lid.underside} material={kit.porcelainMatte} castShadow receiveShadow />
      </group>
      <BlobShadow radius={0.026} opacity={0.34} />
      {lidOpen && (
        <group position={[lidPosition[0], 0, lidPosition[2]]}>
          <BlobShadow radius={0.03} opacity={0.22} />
        </group>
      )}
    </group>
  );
};

export default Crucible;
