import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EXHAUST_PATH, EXHAUST_PIPE_RADIUS, GEOM } from "../../engineMath";
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

const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const PORT_X = 0.97;
const TUBE_SEGMENTS = 140;
const TUBE_RADIAL = 28;
const MUFFLER_X = EXHAUST_PATH[EXHAUST_PATH.length - 1][0];

const curveOf = (path) => new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));

const uAtX = (curve, x, uMax = 1) => {
  const rising = curve.getPointAt(uMax).x > curve.getPointAt(0).x;
  let lo = 0;
  let hi = uMax;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (curve.getPointAt(mid).x < x === rising) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const frameMatrix = (origin, dir) => {
  const yAxis = new THREE.Vector3().crossVectors(dir, Z);
  return new THREE.Matrix4().makeBasis(Z, yAxis, dir).setPosition(origin);
};

const alongAxis = (g, origin, dir) => {
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
  g.applyMatrix4(new THREE.Matrix4().compose(origin, q, ONE));
  return g;
};

// Heat tint: blue near the port, straw further out.
const HEAT_STOPS = [
  [0.0, [0.7, 0.6, 1.3]],
  [0.17, [0.85, 0.62, 1.55]],
  [0.25, [0.55, 0.85, 1.9]],
  [0.34, [1.6, 1.15, 0.5]],
  [0.44, [1.25, 0.95, 0.72]],
  [0.56, [1, 1, 1]],
];

const heatColor = (u) => {
  for (let i = 1; i < HEAT_STOPS.length; i++) {
    const [u1, c1] = HEAT_STOPS[i];
    if (u <= u1) {
      const [u0, c0] = HEAT_STOPS[i - 1];
      const k = (u - u0) / (u1 - u0);
      return c0.map((v, j) => v + (c1[j] - v) * k);
    }
  }
  return [1, 1, 1];
};

const nutGeo = () =>
  merge([
    lathe([
      [0, 0],
      [0.05, 0],
      [0.05, 0.01],
      [0, 0.01],
    ], 20),
    (() => {
      const h = hexPrism(0.038, 0.036);
      h.translate(0, 0.01, 0);
      return h;
    })(),
    lathe([
      [0, 0.04],
      [0.02, 0.04],
      [0.02, 0.07],
      [0.012, 0.078],
      [0, 0.078],
    ], 12),
  ]);

const buildExhaust = () => {
  const curve = curveOf(EXHAUST_PATH);
  const tube = new THREE.TubeGeometry(curve, TUBE_SEGMENTS, EXHAUST_PIPE_RADIUS, TUBE_RADIAL, false);
  const colors = new Float32Array(tube.attributes.position.count * 3);
  for (let i = 0; i <= TUBE_SEGMENTS; i++) {
    const c = heatColor(i / TUBE_SEGMENTS);
    for (let j = 0; j <= TUBE_RADIAL; j++) colors.set(c, (i * (TUBE_RADIAL + 1) + j) * 3);
  }
  tube.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const u = uAtX(curve, PORT_X, 0.5);
  const q = curve.getPointAt(u);
  const out = curve.getTangentAt(u).normalize();
  const T = 0.045;
  const flange = extrude(
    rrect(0.8, 0.4, 0.2),
    [circle(EXHAUST_PIPE_RADIUS - 0.005, 0, 0, 32), circle(0.03, 0.29, 0, 12), circle(0.03, -0.29, 0, 12)],
    T,
    0.008,
  );
  flange.applyMatrix4(frameMatrix(q, out));
  const face = q.clone().addScaledVector(out, T);
  const nuts = [1, -1].map((s) => alongAxis(nutGeo(), face.clone().addScaledVector(Z, s * 0.29), out));

  const x = MUFFLER_X;
  const canister = lathe([
    [0, -0.68],
    [0.12, -0.68],
    [0.185, -0.64, true],
    [0.2, -0.58],
    [0.2, 0.0],
    [0.185, 0.05, true],
    [0.14, 0.12],
    [0.14, 0.15],
    [0, 0.15],
  ], 56);
  canister.translate(x, 0, 0);

  const bands = [-0.54, -0.3, -0.04].map((y) => {
    const g = new THREE.TorusGeometry(0.203, 0.014, 8, 56);
    g.rotateX(Math.PI / 2);
    g.translate(x, y, 0);
    return g;
  });

  const tipX = x + 0.26;
  const tipY = GEOM.floorY + 0.1;
  const tailCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x, -0.6, 0),
    new THREE.Vector3(x, tipY, 0),
    new THREE.Vector3(tipX, tipY, 0),
  );
  const tail = new THREE.TubeGeometry(tailCurve, 24, 0.045, 16, false);
  const tipLip = lathe([
    [0.035, -0.03],
    [0.056, -0.03],
    [0.056, 0.0],
    [0.035, 0.0],
    [0.035, -0.03],
  ], 20);
  tipLip.rotateZ(-Math.PI / 2);
  tipLip.translate(tipX, tipY, 0);
  const soot = new THREE.CircleGeometry(0.04, 20);
  soot.rotateY(Math.PI / 2);
  soot.translate(tipX - 0.02, tipY, 0);

  // Strap tying the silencer back to the crankcase.
  const bracket = extrude(rrect(1.1, 0.09, 0.03, (0.78 + x - 0.18) / 2, -0.3), null, 0.03, 0.006);
  bracket.translate(0, 0, -0.015);

  return {
    tube,
    dark: merge([flange, canister]),
    steel: merge([...nuts, ...bands, tail, tipLip, bracket]),
    soot,
  };
};

const ExhaustPipe = ({ mode, selected }) => {
  const shell = PART_BY_ID.exhaust.shell;
  const heat = usePartMaterial("heatSteel", { mode, shell, selected });
  const dark = usePartMaterial("darkSteel", { mode, shell, selected });
  const steel = usePartMaterial("steel", { mode, shell, selected });
  const soot = usePartMaterial("rubber", { mode, shell, selected });

  const geo = useMemo(() => buildExhaust(), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <group>
      <mesh geometry={geo.tube}>
        <primitive object={heat} attach="material" vertexColors />
      </mesh>
      <mesh geometry={geo.dark} material={dark} />
      <mesh geometry={geo.steel} material={steel} />
      <mesh geometry={geo.soot} material={soot} />
    </group>
  );
};

export default ExhaustPipe;
