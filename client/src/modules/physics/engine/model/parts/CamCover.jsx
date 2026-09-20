import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { VALVES } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const TAU = Math.PI * 2;
const ONE = new THREE.Vector3(1, 1, 1);

const arcPts = (cx, cy, r, a0, a1, n) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return pts;
};

const dedupe = (pts) => pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]) > 1e-6);

const rrect = (w, h, r, cx = 0, cy = 0, n = 6) => {
  const x = w / 2 - r;
  const y = h / 2 - r;
  const q = Math.PI / 2;
  return dedupe([
    ...arcPts(cx + x, cy - y, r, -q, 0, n),
    ...arcPts(cx + x, cy + y, r, 0, q, n),
    ...arcPts(cx - x, cy + y, r, q, 2 * q, n),
    ...arcPts(cx - x, cy - y, r, 2 * q, 3 * q, n),
  ]);
};

const circle = (r, cx = 0, cy = 0, n = 40) => arcPts(cx, cy, r, 0, TAU, n).slice(0, n);

const smoothSides = (g, crease = 0.75) => {
  const side = g.groups.find((gr) => gr.materialIndex === 1);
  if (!side) return;
  const pos = g.attributes.position;
  const nor = g.attributes.normal;
  const cos = Math.cos(crease);
  const faces = side.count / 3;
  const fn = new Float32Array(faces * 3);
  const buckets = new Map();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const key = (i) =>
    `${Math.round(pos.getX(i) * 1e4)}|${Math.round(pos.getY(i) * 1e4)}|${Math.round(pos.getZ(i) * 1e4)}`;
  for (let f = 0; f < faces; f++) {
    const i = side.start + f * 3;
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    c.sub(b);
    a.sub(b);
    c.cross(a);
    const len = c.length();
    if (len > 1e-12) c.divideScalar(len);
    fn[f * 3] = c.x;
    fn[f * 3 + 1] = c.y;
    fn[f * 3 + 2] = c.z;
    for (let k = 0; k < 3; k++) {
      const kk = key(i + k);
      let list = buckets.get(kk);
      if (!list) buckets.set(kk, (list = []));
      list.push(f);
    }
  }
  for (let f = 0; f < faces; f++) {
    const i = side.start + f * 3;
    for (let k = 0; k < 3; k++) {
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (const o of buckets.get(key(i + k))) {
        const d = fn[f * 3] * fn[o * 3] + fn[f * 3 + 1] * fn[o * 3 + 1] + fn[f * 3 + 2] * fn[o * 3 + 2];
        if (d >= cos) {
          sx += fn[o * 3];
          sy += fn[o * 3 + 1];
          sz += fn[o * 3 + 2];
        }
      }
      const l = Math.hypot(sx, sy, sz);
      if (l > 1e-9) nor.setXYZ(i + k, sx / l, sy / l, sz / l);
    }
  }
};

const extrude = (outline, holes, thickness, bevel = 0) => {
  const shape = new THREE.Shape(outline);
  if (holes) shape.holes = holes.map((h) => new THREE.Path(h));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-3, thickness - 2 * bevel),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 3,
    curveSegments: 1,
  });
  smoothSides(g);
  g.translate(0, 0, bevel);
  return g;
};

const slab = (outline, holes, y0, y1, bevel = 0.01) => {
  const g = extrude(outline, holes, y1 - y0, bevel);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
};

// Sharp points are doubled so lathe edges stay crisp.
const lathe = (pts, segments = 48) => {
  const v = [];
  for (const [r, y, smooth] of pts) {
    v.push(new THREE.Vector2(r, y));
    if (!smooth) v.push(new THREE.Vector2(r, y));
  }
  return new THREE.LatheGeometry(v, segments);
};

const hexPrism = (r, h) => {
  const c = new THREE.CylinderGeometry(r, r, h, 6);
  const g = c.toNonIndexed();
  c.dispose();
  g.computeVertexNormals();
  g.translate(0, h / 2, 0);
  return g;
};

const merge = (geos) => {
  const flat = geos.map((g) => {
    if (!g.index) return g;
    const n = g.toNonIndexed();
    g.dispose();
    return n;
  });
  const out = mergeGeometries(flat, false);
  flat.forEach((g) => g.dispose());
  return out;
};

const Instances = ({ geometry, material, matrices }) => {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geometry, material, matrices]);
  return <instancedMesh ref={ref} args={[geometry, material, matrices.length]} />;
};

const BASE_Y = 2.62;
const FLANGE_TOP = 2.69;
const Z_BACK = -0.49;
const Z_FRONT = 0.56;
const WALL = 0.06;

// Side walls clear the swept cam-lobe noses (|x| up to ~0.85) with the inner face at 0.87.
const HUMP_X = 0.93;

// Twin-cam humps with a spark-plug valley in the middle (xy profile).
const humpProfile = () => {
  const p = new THREE.Path();
  p.moveTo(-HUMP_X, 2.67);
  p.lineTo(-HUMP_X, 3.08);
  p.quadraticCurveTo(-HUMP_X, 3.32, -HUMP_X + 0.24, 3.32);
  p.lineTo(-0.4, 3.32);
  p.bezierCurveTo(-0.26, 3.32, -0.26, 3.2, -0.12, 3.2);
  p.lineTo(0.12, 3.2);
  p.bezierCurveTo(0.26, 3.2, 0.26, 3.32, 0.4, 3.32);
  p.lineTo(HUMP_X - 0.24, 3.32);
  p.quadraticCurveTo(HUMP_X, 3.32, HUMP_X, 3.08);
  p.lineTo(HUMP_X, 2.67);
  return dedupe(p.getPoints(8));
};

// Inward offset of an open polyline (traversed clockwise over the top).
const offsetInward = (pts, d) =>
  pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    return new THREE.Vector2(p.x + (ty / l) * d, p.y - (tx / l) * d);
  });

const TOP_BOLTS = [
  [-0.5, 3.32, -0.28],
  [-0.5, 3.32, 0.36],
  [0.5, 3.32, -0.28],
  [0.5, 3.32, 0.36],
];
const SIDE_BOLTS = [-0.4, 0.035, 0.47].flatMap((z) => [
  [-0.99, FLANGE_TOP, z],
  [0.99, FLANGE_TOP, z],
]);
const BOLT_MATRICES = [...SIDE_BOLTS, ...TOP_BOLTS].map(([x, y, z]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), ONE),
);

const buildCover = () => {
  const outer = humpProfile();
  const inner = offsetInward(outer, WALL);
  const tunnel = extrude([...outer, ...inner.reverse()], null, Z_FRONT - Z_BACK, 0.02);
  tunnel.translate(0, 0, Z_BACK);

  // End caps sit just inside the tunnel so their rims never z-fight with it.
  const capOutline = offsetInward(outer, 0.012);
  const capT = 0.06;
  const backCap = extrude(capOutline, null, capT, 0.02);
  backCap.translate(0, 0, Z_BACK + 0.003);
  const frontCap = extrude(capOutline, null, capT, 0.02);
  frontCap.translate(0, 0, Z_FRONT - capT - 0.003);

  const zc = (Z_BACK + Z_FRONT) / 2;
  const flangeOuter = rrect(2.1, 1.17, 0.14, 0, -0.035);
  const flangeHole = rrect(1.76, Z_FRONT - Z_BACK - 0.1, 0.1, 0, -zc);
  const flange = slab(flangeOuter, [flangeHole], BASE_Y + 0.012, FLANGE_TOP, 0.01);

  const plugTube = lathe([
    [0.095, 2.78],
    [0.15, 2.78],
    [0.15, 3.3],
    [0.168, 3.32],
    [0.168, 3.36],
    [0.15, 3.38],
    [0.095, 3.38],
    [0.095, 2.78],
  ], 40);

  const seals = ["intake", "exhaust"].map((which) => {
    const { x, y } = VALVES[which].camCenter;
    const g = lathe([
      [0.075, 0],
      [0.13, 0],
      [0.13, 0.035],
      [0.11, 0.055],
      [0.075, 0.055],
      [0.075, 0],
    ], 32);
    g.rotateX(Math.PI / 2);
    g.translate(x, y, Z_FRONT - 0.01);
    return g;
  });

  const paint = merge([tunnel, backCap, frontCap, flange, plugTube, ...seals]);

  const gasket = slab(flangeOuter, [flangeHole], BASE_Y, BASE_Y + 0.012, 0.003);

  const grommet = lathe([
    [0.095, 3.375],
    [0.135, 3.375],
    [0.135, 3.4, true],
    [0.115, 3.41],
    [0.095, 3.41],
    [0.095, 3.375],
  ], 32);

  const cap = merge([
    lathe([
      [0, 0],
      [0.1, 0],
      [0.1, 0.045],
      [0.09, 0.06],
      [0, 0.06],
    ], 32),
    slab(rrect(0.17, 0.035, 0.015), null, 0.055, 0.1, 0.008),
  ]);
  cap.translate(-0.5, 3.315, 0.04);

  const bolt = merge([
    lathe([
      [0, 0],
      [0.05, 0],
      [0.05, 0.01],
      [0, 0.01],
    ], 24),
    (() => {
      const h = hexPrism(0.036, 0.032);
      h.translate(0, 0.01, 0);
      return h;
    })(),
  ]);

  return { paint, gasket, grommet, cap, bolt };
};

const CamCover = ({ mode, selected }) => {
  const shell = PART_BY_ID.camCover.shell;
  const paint = usePartMaterial("paint", { mode, shell, selected });
  const rubber = usePartMaterial("rubber", { mode, shell, selected });
  const dark = usePartMaterial("darkSteel", { mode, shell, selected });
  const steel = usePartMaterial("steel", { mode, shell, selected });

  const geo = useMemo(() => buildCover(), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <group>
      <mesh geometry={geo.paint} material={paint} />
      <mesh geometry={geo.gasket} material={rubber} />
      <mesh geometry={geo.grommet} material={rubber} />
      <mesh geometry={geo.cap} material={dark} />
      <Instances geometry={geo.bolt} material={steel} matrices={BOLT_MATRICES} />
    </group>
  );
};

export default CamCover;
