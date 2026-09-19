import { LatheGeometry } from "three";
import GlassVessel from "../kit/GlassVessel";
import Contents from "../kit/Contents";
import BlobShadow from "../kit/BlobShadow";
import { arc, toVectors } from "../kit/vessel";

// 18 × 180 mm borosilicate test tube, 0.8 mm wall, rolled bead at the mouth; origin = lowest point of the bottom.
const RADIUS = 0.009;
const WALL = 0.0008;
const LENGTH = 0.18;
const BEAD = 0.001;
const BEAD_FILLET = 0.0015;
const SEGMENTS = 40;
const SEAM = Math.PI;

const dedupe = (points) =>
  points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-7);

// three weights lathe normals by segment length; even weights keep short fillets shaded correctly.
const lathe = (points, segments) => {
  const geometry = new LatheGeometry(toVectors(points), segments, SEAM, Math.PI * 2);
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
  const normals = geometry.attributes.normal;
  for (let i = 0; i <= segments; i += 1) {
    const phi = SEAM + (i / segments) * Math.PI * 2;
    profile.forEach(([nr, ny], j) => normals.setXYZ(i * points.length + j, nr * Math.sin(phi), ny, nr * Math.cos(phi)));
  }
  return geometry;
};

// Outer wall at radius r flows through a concave fillet into a round bead, then rolls over into the bore.
const beadProfile = (r, wall, top, rho, fillet) => {
  const cy = top - rho;
  const dy = Math.sqrt((rho + fillet) ** 2 - fillet ** 2);
  return [
    ...arc(r + fillet, cy - dy, fillet, Math.PI, Math.atan2(dy, -fillet), 4),
    ...arc(r, cy, rho, Math.atan2(-dy, fillet), Math.PI / 2, 8),
    ...arc(r, top - wall, wall, Math.PI / 2, Math.PI, 4),
  ];
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const inner = RADIUS - WALL;
  const outerPoints = dedupe([
    ...arc(0, RADIUS, RADIUS, -Math.PI / 2, 0, 12),
    ...beadProfile(RADIUS, WALL, LENGTH, BEAD, BEAD_FILLET),
  ]);
  const innerPoints = dedupe([[inner, LENGTH - WALL], ...arc(0, RADIUS, inner, 0, -Math.PI / 2, 12)]);
  const innerProfile = [...innerPoints].reverse();
  assets = {
    vessel: {
      outer: lathe(outerPoints, SEGMENTS),
      inner: lathe(innerPoints, SEGMENTS),
      innerProfile,
      rimY: LENGTH,
    },
    mouth: { innerProfile, capacityMl: 30, mouthY: LENGTH - WALL, mouthR: inner, meniscus: 0.0019 },
  };
  return assets;
};

const TestTube = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, ...props }) => {
  const { vessel, mouth } = getAssets();

  return (
    <group {...props}>
      <GlassVessel vessel={vessel}>
        <Contents simId={simId} vessel={mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      </GlassVessel>
      <BlobShadow radius={RADIUS * 1.5} opacity={0.2} />
    </group>
  );
};

export default TestTube;
