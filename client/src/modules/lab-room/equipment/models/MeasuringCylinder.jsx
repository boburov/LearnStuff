import { CanvasTexture, CylinderGeometry, ExtrudeGeometry, LatheGeometry, SRGBColorSpace, Shape } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import GlassVessel from "../kit/GlassVessel";
import Contents from "../kit/Contents";
import { profileTable } from "../kit/profileTable";
import BlobShadow from "../kit/BlobShadow";
import { arc, heightForVolume, toVectors } from "../kit/vessel";

// 100 ml tall-form graduated cylinder (ISO 4788): Ø29.4 mm tube, 250 mm overall, hexagonal glass foot.
const TUBE_RADIUS = 0.0147;
const WALL = 0.0015;
const HEIGHT = 0.25;
const FLOOR = 0.0125;
const FLOOR_FILLET = 0.002;
const JOINT_FILLET = 0.003;
const FOOT_FLATS = 0.075;
const FOOT_HEIGHT = 0.01;
const FOOT_CORNER = 0.008;
const FOOT_BEVEL = 0.0022;
const SEGMENTS = 48;
const SEAM = Math.PI;
const SPOUT = { depth: 0.011, reach: 0.0042, halfAngle: 0.55 };
const PRINT_RADIUS = TUBE_RADIUS + 0.00012;
const PRINT_HALF_ANGLE = 0.8;
const PRINT_PX_PER_M = 20000;
const FONT = "Inter, 'Segoe UI', Arial, sans-serif";

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

// Same rim shaping as the kit's beaker spout: pull outward and slightly down around +X.
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
    pos.setXYZ(i, (x * (r + k)) / r, pos.getY(i) - k * 0.25, (z * (r + k)) / r);
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

const beadProfile = (r, wall, top, rho, filletRadius) => {
  const cy = top - rho;
  const dy = Math.sqrt((rho + filletRadius) ** 2 - filletRadius ** 2);
  return [
    ...arc(r + filletRadius, cy - dy, filletRadius, Math.PI, Math.atan2(dy, -filletRadius), 4),
    ...arc(r, cy, rho, Math.atan2(-dy, filletRadius), Math.PI / 2, 8),
    ...arc(r, top - wall, wall, Math.PI / 2, Math.PI, 4),
  ];
};

const buildTube = () => {
  const bore = TUBE_RADIUS - WALL;
  const lip = [0.012, 0.008, 0.005];
  const outer = dedupe([
    ...arc(TUBE_RADIUS + JOINT_FILLET, FOOT_HEIGHT + JOINT_FILLET, JOINT_FILLET, -Math.PI / 2, -Math.PI, 5),
    ...lip.map((d) => [TUBE_RADIUS, HEIGHT - d]),
    ...beadProfile(TUBE_RADIUS, WALL, HEIGHT, 0.0009, 0.0014),
  ]);
  const inner = dedupe([
    [bore, HEIGHT - WALL],
    ...[...lip].reverse().map((d) => [bore, HEIGHT - d]),
    ...arc(bore - FLOOR_FILLET, FLOOR + FLOOR_FILLET, FLOOR_FILLET, 0, -Math.PI / 2, 5),
    [0, FLOOR],
  ]);
  const spout = { top: HEIGHT, ...SPOUT };
  return {
    outer: addSpout(lathe(outer, SEGMENTS), spout),
    inner: addSpout(lathe(inner, SEGMENTS), spout),
    innerProfile: [...inner].reverse(),
    rimY: HEIGHT,
  };
};

// Solid moulded hexagon, flat faces toward ±Z, softened corners and edges.
const buildFoot = () => {
  const circumradius = FOOT_FLATS / Math.sqrt(3);
  const corners = Array.from({ length: 6 }, (_, i) => [
    Math.cos((i * Math.PI) / 3) * circumradius,
    Math.sin((i * Math.PI) / 3) * circumradius,
  ]);
  const reach = (FOOT_CORNER * Math.tan(Math.PI / 6)) / circumradius;
  const shape = new Shape();
  corners.forEach(([x, y], i) => {
    const [px, py] = corners[(i + 5) % 6];
    const [nx, ny] = corners[(i + 1) % 6];
    const start = [x + (px - x) * reach, y + (py - y) * reach];
    if (i === 0) shape.moveTo(...start);
    else shape.lineTo(...start);
    shape.quadraticCurveTo(x, y, x + (nx - x) * reach, y + (ny - y) * reach);
  });
  shape.closePath();
  const extruded = new ExtrudeGeometry(shape, {
    depth: FOOT_HEIGHT - FOOT_BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: FOOT_BEVEL,
    bevelSize: FOOT_BEVEL,
    bevelOffset: -FOOT_BEVEL,
    bevelSegments: 4,
    curveSegments: 6,
  });
  extruded.translate(0, 0, FOOT_BEVEL);
  extruded.rotateX(-Math.PI / 2);
  extruded.deleteAttribute("normal");
  extruded.deleteAttribute("uv");
  const foot = mergeVertices(extruded, 1e-6);
  extruded.dispose();
  foot.computeVertexNormals();
  return foot;
};

const createPrintTexture = (level, y0, y1) => {
  const width = Math.round(2 * PRINT_HALF_ANGLE * PRINT_RADIUS * PRINT_PX_PER_M);
  const height = Math.round((y1 - y0) * PRINT_PX_PER_M);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const kx = width / (2 * PRINT_HALF_ANGLE * PRINT_RADIUS);
  const ky = height / (y1 - y0);
  // Local drawing units of 0.1 mm at (x, y) on the tube surface.
  const place = (x, y) => ctx.setTransform(kx * 1e-4, 0, 0, ky * 1e-4, width / 2 + x * kx, height - (y - y0) * ky);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  for (let ml = 10; ml <= 100; ml += 1) {
    const [length, thickness] = ml % 10 === 0 ? [92, 4.4] : ml % 5 === 0 ? [62, 3.8] : [38, 3.3];
    place(-0.0062, level(ml));
    ctx.fillRect(0, -thickness / 2, length, thickness);
    if (ml % 10 === 0) {
      ctx.font = `600 31px ${FONT}`;
      ctx.fillText(String(ml), 106, 1);
    }
  }
  ctx.textAlign = "center";
  place(0.0008, level(100) + 0.0128);
  ctx.font = `800 46px ${FONT}`;
  ctx.fillText("100 ml", 0, 0);
  place(0.0008, level(100) + 0.0072);
  ctx.font = `600 25px ${FONT}`;
  ctx.fillText("In 20°C   ±1 ml", 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

// Mouth plane where pours and tools aim: the top of the tube bore.
const MOUTH = { y: HEIGHT - WALL, r: TUBE_RADIUS - WALL };

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const vessel = buildTube();
  const level = (ml) => heightForVolume(vessel.innerProfile, ml);
  const y0 = level(10) - 0.004;
  const y1 = level(100) + 0.0165;
  const printGeometry = new CylinderGeometry(
    PRINT_RADIUS,
    PRINT_RADIUS,
    y1 - y0,
    20,
    1,
    true,
    -PRINT_HALF_ANGLE,
    PRINT_HALF_ANGLE * 2,
  );
  printGeometry.translate(0, (y0 + y1) / 2, 0);
  assets = {
    vessel,
    mouth: { innerProfile: vessel.innerProfile, mouthY: MOUTH.y, mouthR: MOUTH.r, capacityMl: profileTable(vessel.innerProfile, MOUTH.y).capacityMl, meniscus: 0.0017 },
    foot: buildFoot(),
    printGeometry,
    createTexture: () => createPrintTexture(level, y0, y1),
  };
  return assets;
};

const MeasuringCylinder = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, ...props }) => {
  const kit = useKit();
  const { vessel, mouth, foot, printGeometry, createTexture } = getAssets();
  const print = { geometry: printGeometry, material: kit.print("measuring-cylinder-100", createTexture) };

  return (
    <group {...props}>
      <GlassVessel vessel={vessel} print={print}>
        <Contents simId={simId} vessel={mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      </GlassVessel>
      <mesh geometry={foot} material={kit.glass} renderOrder={3} />
      <BlobShadow radius={FOOT_FLATS * 0.68} opacity={0.3} />
    </group>
  );
};

export default MeasuringCylinder;
