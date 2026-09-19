import { CanvasTexture, LatheGeometry, SRGBColorSpace } from "three";
import { useKit } from "../kit/kitContext";
import GlassVessel from "../kit/GlassVessel";
import Contents from "../kit/Contents";
import { profileTable } from "../kit/profileTable";
import BlobShadow from "../kit/BlobShadow";
import { arc, heightForVolume, radiusAt, toVectors } from "../kit/vessel";

// 250 ml narrow-neck Erlenmeyer flask (ISO 1773): Ø85 × 145 mm, neck Ø34 mm, 1.5 mm wall, 2.2 mm bottom.
const BASE_RADIUS = 0.0425;
const HEIGHT = 0.145;
const NECK_RADIUS = 0.017;
const SHOULDER_Y = 0.109;
const WALL = 0.0015;
const BOTTOM = 0.0022;
const BASE_FILLET = 0.008;
const SHOULDER_FILLET = 0.028;
const BEAD = 0.0016;
const BEAD_FILLET = 0.002;
const SEGMENTS = 64;
const SEAM = Math.PI;
const PRINT_HALF_ANGLE = 1.1;
const PRINT_Y = [0.006, 0.082];
const PRINT_PX_PER_M = 18000;
const FONT = "Inter, 'Segoe UI', Arial, sans-serif";

const dedupe = (points) =>
  points.filter((p, i) => i === 0 || Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1e-7);

const unit = (x, y) => {
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
};

const fillet = (corners, radii, steps = 8) => {
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

const beadProfile = (r, wall, top, rho, filletRadius) => {
  const cy = top - rho;
  const dy = Math.sqrt((rho + filletRadius) ** 2 - filletRadius ** 2);
  return [
    ...arc(r + filletRadius, cy - dy, filletRadius, Math.PI, Math.atan2(dy, -filletRadius), 4),
    ...arc(r, cy, rho, Math.atan2(-dy, filletRadius), Math.PI / 2, 8),
    ...arc(r, top - wall, wall, Math.PI / 2, Math.PI, 4),
  ];
};

// Virtual base corner chosen so the rounded base edge still measures Ø85 mm.
const coneBaseRadius = () => {
  let rx = BASE_RADIUS;
  for (let i = 0; i < 24; i += 1) {
    const alpha = Math.atan2(rx - NECK_RADIUS, SHOULDER_Y);
    rx = BASE_RADIUS + BASE_FILLET * ((1 + Math.sin(alpha)) / Math.cos(alpha) - 1);
  }
  return rx;
};

const buildProfiles = () => {
  const rx = coneBaseRadius();
  const bead = beadProfile(NECK_RADIUS, WALL, HEIGHT, BEAD, BEAD_FILLET);
  const outer = dedupe([
    ...fillet(
      [[0, 0], [rx, 0], [NECK_RADIUS, SHOULDER_Y], bead[0]],
      [0, BASE_FILLET, SHOULDER_FILLET, 0],
    ),
    ...bead,
  ]);

  const [dr, dy] = unit(NECK_RADIUS - rx, SHOULDER_Y);
  const origin = [rx - dy * WALL, dr * WALL];
  const coneAtY = (y) => origin[0] + ((y - origin[1]) / dy) * dr;
  const coneAtR = (r) => origin[1] + ((r - origin[0]) / dr) * dy;
  const neck = NECK_RADIUS - WALL;
  const inner = fillet(
    [[neck, HEIGHT - WALL], [neck, coneAtR(neck)], [coneAtY(BOTTOM), BOTTOM], [0, BOTTOM]],
    [0, SHOULDER_FILLET + WALL, BASE_FILLET - 0.001, 0],
  );
  return { outer, inner };
};

// Partial lathe hugging the outer wall; v runs linearly with height so marks land at exact levels.
const buildPrintSurface = (outer) => {
  const rows = 22;
  const points = [];
  for (let j = 0; j < rows; j += 1) {
    const y = PRINT_Y[0] + ((PRINT_Y[1] - PRINT_Y[0]) * j) / (rows - 1);
    const slope = (radiusAt(outer, y + 0.0005) - radiusAt(outer, y - 0.0005)) / 0.001;
    const [nr, ny] = unit(1, -slope);
    points.push([radiusAt(outer, y) + nr * 0.00012, y + ny * 0.00012]);
  }
  return {
    geometry: new LatheGeometry(toVectors(points), 44, -PRINT_HALF_ANGLE, PRINT_HALF_ANGLE * 2),
    radiusAtY: (y) => radiusAt(points, y),
  };
};

const createPrintTexture = (level, radiusAtY) => {
  const [y0, y1] = PRINT_Y;
  const width = Math.round(2 * PRINT_HALF_ANGLE * radiusAtY(y0) * PRINT_PX_PER_M);
  const height = Math.round((y1 - y0) * PRINT_PX_PER_M);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const pxPerM = (y) => width / (2 * PRINT_HALF_ANGLE * radiusAtY(y));
  const toCanvas = (x, y) => [width / 2 + x * pxPerM(y), height - (y - y0) * PRINT_PX_PER_M];
  // Local drawing units of 0.1 mm at (x, y); the cone's circumference shrinks with height.
  const place = (x, y) => {
    const [cx, cy] = toCanvas(x, y);
    ctx.setTransform(pxPerM(y) * 1e-4, 0, 0, PRINT_PX_PER_M * 1e-4, cx, cy);
  };

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  for (let ml = 50; ml <= 200; ml += 25) {
    const major = ml % 50 === 0;
    place(-0.013, level(ml));
    ctx.fillRect(0, major ? -3 : -2.5, major ? 112 : 64, major ? 6 : 5);
    if (major) {
      ctx.font = `600 36px ${FONT}`;
      ctx.fillText(String(ml), 132, 1);
    }
  }
  place(-0.013, level(250) + 0.0045);
  ctx.font = `800 58px ${FONT}`;
  ctx.fillText("250 ml", 0, 0);

  const [px, py, pw, ph, pr] = [0.017, level(90), 0.019, 0.013, 0.0014];
  const corners = [
    [px + pw - pr, py + pr, -Math.PI / 2],
    [px + pw - pr, py + ph - pr, 0],
    [px + pr, py + ph - pr, Math.PI / 2],
    [px + pr, py + pr, Math.PI],
  ];
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.beginPath();
  corners.forEach(([cx, cy, start]) => {
    for (let k = 0; k <= 4; k += 1) {
      const a = start + (k / 4) * (Math.PI / 2);
      ctx.lineTo(...toCanvas(cx + Math.cos(a) * pr, cy + Math.sin(a) * pr));
    }
  });
  ctx.closePath();
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

// Mouth plane where pours and tools aim: the top of the neck bore.
const MOUTH = { y: HEIGHT - WALL, r: NECK_RADIUS - WALL };

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const { outer, inner } = buildProfiles();
  const innerProfile = [...inner].reverse();
  const level = (ml) => heightForVolume(innerProfile, ml);
  const print = buildPrintSurface(outer);
  assets = {
    vessel: { outer: lathe(outer, SEGMENTS), inner: lathe(inner, SEGMENTS), innerProfile, rimY: HEIGHT },
    mouth: { innerProfile, mouthY: MOUTH.y, mouthR: MOUTH.r, capacityMl: profileTable(innerProfile, MOUTH.y).capacityMl },
    printGeometry: print.geometry,
    createTexture: () => createPrintTexture(level, print.radiusAtY),
  };
  return assets;
};

const ConicalFlask = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, ...props }) => {
  const kit = useKit();
  const { vessel, mouth, printGeometry, createTexture } = getAssets();
  const print = { geometry: printGeometry, material: kit.print("conical-flask-250", createTexture) };

  return (
    <group {...props}>
      <GlassVessel vessel={vessel} print={print}>
        <Contents simId={simId} vessel={mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      </GlassVessel>
      <BlobShadow radius={BASE_RADIUS * 1.4} opacity={0.3} />
    </group>
  );
};

export default ConicalFlask;
