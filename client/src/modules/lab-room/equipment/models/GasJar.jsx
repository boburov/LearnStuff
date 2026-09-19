import { useEffect, useMemo } from "react";
import { DoubleSide, ExtrudeGeometry, LatheGeometry, MeshPhysicalMaterial, Shape } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import GlassVessel from "../kit/GlassVessel";
import Contents from "../kit/Contents";
import { profileTable } from "../kit/profileTable";
import BlobShadow from "../kit/BlobShadow";
import { applySpecularAlpha } from "../kit/glassShading";
import { useDevice } from "../kit/deviceState";
import { arc, toVectors } from "../kit/vessel";

// Soda-glass gas jar Ø60 × 200 mm with a ground Ø75 mm flange, plus an 80 × 80 × 4 mm ground cover plate.
const RADIUS = 0.03;
const HEIGHT = 0.2;
const WALL = 0.0025;
const BOTTOM = 0.004;
const BASE_FILLET = 0.0045;
const FLOOR_FILLET = 0.005;
const FLANGE_RADIUS = 0.0375;
const FLANGE_THICKNESS = 0.004;
const FLANGE_FILLET = 0.003;
const PLATE_SIZE = 0.08;
const PLATE_THICKNESS = 0.004;
const PLATE_CORNER = 0.006;
const PLATE_BEVEL = 0.0008;
const SEGMENTS = 64;
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

const buildJar = () => {
  const underside = HEIGHT - FLANGE_THICKNESS;
  const bore = RADIUS - WALL;
  const outer = dedupe([
    ...fillet(
      [[0, 0], [RADIUS, 0], [RADIUS, underside], [FLANGE_RADIUS - 0.0012, underside]],
      [0, BASE_FILLET, FLANGE_FILLET, 0],
      10,
    ),
    ...arc(FLANGE_RADIUS - 0.0012, underside + 0.0012, 0.0012, -Math.PI / 2, 0, 4),
    ...arc(FLANGE_RADIUS - 0.0005, HEIGHT - 0.0005, 0.0005, 0, Math.PI / 2, 3),
  ]);
  const inner = dedupe([
    ...arc(bore + 0.0004, HEIGHT - 0.0004, 0.0004, Math.PI / 2, Math.PI, 3),
    ...fillet([[bore, HEIGHT - 0.0004], [bore, BOTTOM], [0, BOTTOM]], [0, FLOOR_FILLET, 0]),
  ]);
  const groundTop = [outer[outer.length - 1], inner[0]];
  return {
    vessel: {
      outer: lathe(outer, SEGMENTS),
      inner: lathe(inner, SEGMENTS),
      innerProfile: [...inner].reverse(),
      rimY: HEIGHT,
    },
    groundTop: lathe(groundTop, SEGMENTS),
  };
};

// Clear faces (material 0) with ground, frosted edges (material 1); origin at the centre of the bottom face.
const buildPlate = () => {
  const h = PLATE_SIZE / 2;
  const c = PLATE_CORNER;
  const shape = new Shape();
  shape.moveTo(-h + c, -h);
  shape.lineTo(h - c, -h);
  shape.quadraticCurveTo(h, -h, h, -h + c);
  shape.lineTo(h, h - c);
  shape.quadraticCurveTo(h, h, h - c, h);
  shape.lineTo(-h + c, h);
  shape.quadraticCurveTo(-h, h, -h, h - c);
  shape.lineTo(-h, -h + c);
  shape.quadraticCurveTo(-h, -h, -h + c, -h);
  const extruded = new ExtrudeGeometry(shape, {
    depth: PLATE_THICKNESS - PLATE_BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: PLATE_BEVEL,
    bevelSize: PLATE_BEVEL,
    bevelOffset: -PLATE_BEVEL,
    bevelSegments: 2,
    curveSegments: 5,
  });
  extruded.translate(0, 0, PLATE_BEVEL);
  extruded.rotateX(-Math.PI / 2);
  extruded.deleteAttribute("normal");
  extruded.deleteAttribute("uv");
  const plate = mergeVertices(extruded, 1e-7);
  extruded.dispose();
  plate.computeVertexNormals();
  return plate;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const jar = buildJar();
  const innerProfile = jar.vessel.innerProfile;
  const mouthY = innerProfile[innerProfile.length - 1][1];
  assets = {
    ...jar,
    plate: buildPlate(),
    mouth: { innerProfile, mouthY, mouthR: innerProfile[innerProfile.length - 1][0], capacityMl: profileTable(innerProfile, mouthY).capacityMl },
  };
  return assets;
};

// Ground glass scatters light: pale, rough and semi-opaque, on the kit glass shading.
const createGroundGlass = () =>
  applySpecularAlpha(
    new MeshPhysicalMaterial({
      color: "#cdd6d3",
      roughness: 0.5,
      metalness: 0,
      ior: 1.5,
      opacity: 0.22,
      envMapIntensity: 1,
      side: DoubleSide,
    }),
    0.2,
  );

const GasJar = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, coverOn = true, ...props }) => {
  const kit = useKit();
  const { vessel, mouth, groundTop, plate } = getAssets();
  const ground = useMemo(() => createGroundGlass(), []);
  useEffect(() => () => ground.dispose(), [ground]);
  const { device } = useDevice(simId);
  const covered = device ? device.coverOn !== false : coverOn;

  return (
    <group {...props}>
      <GlassVessel vessel={vessel}>
        <Contents simId={simId} vessel={mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      </GlassVessel>
      <mesh geometry={groundTop} material={ground} renderOrder={3} />
      <mesh
        geometry={plate}
        material={[kit.glass, ground]}
        renderOrder={4}
        position={covered ? [0, HEIGHT, 0] : [RADIUS + PLATE_SIZE / 2 + 0.014, 0, 0.012]}
        rotation-y={covered ? 0 : 0.22}
      />
      <BlobShadow radius={RADIUS * 1.45} opacity={0.3} />
    </group>
  );
};

export default GasJar;
