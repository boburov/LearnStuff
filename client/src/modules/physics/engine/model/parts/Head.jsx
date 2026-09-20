import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { EXHAUST_PATH, GEOM, INTAKE_PATH, VALVES } from "../../engineMath";
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

const Y = new THREE.Vector3(0, 1, 0);
const TOP_Y = 2.62;
const DECK_TOP = 2.05;
const CORE_TOP = 2.56;
const HEAD_FIN_YS = [2.12, 2.23, 2.34, 2.45];
const STUDS = [
  [0.78, 0.42],
  [-0.78, 0.42],
  [0.78, -0.42],
  [-0.78, -0.42],
];
// Where the manifold flanges meet the head bosses (shared with the pipe parts).
const PORT_X = 0.97;
const NUT_MATRICES = STUDS.map(([x, z]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, TOP_Y, z), new THREE.Quaternion(), ONE),
);

const curveOf = (path) => new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));

const uAtX = (curve, x, uMax) => {
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

// Side notches let the fins clear the port bosses.
const notchedRect = (hw, hd, r, notchX, notchHalf, n = 6) => {
  const q = Math.PI / 2;
  const V = (x, y) => new THREE.Vector2(x, y);
  return dedupe([
    ...arcPts(hw - r, -hd + r, r, -q, 0, n),
    V(hw, -notchHalf),
    V(notchX, -notchHalf),
    V(notchX, notchHalf),
    V(hw, notchHalf),
    ...arcPts(hw - r, hd - r, r, 0, q, n),
    ...arcPts(-hw + r, hd - r, r, q, 2 * q, n),
    V(-hw, notchHalf),
    V(-notchX, notchHalf),
    V(-notchX, -notchHalf),
    V(-hw, -notchHalf),
    ...arcPts(-hw + r, -hd + r, r, 2 * q, 3 * q, n),
  ]);
};

const portBoss = (path, side) => {
  const curve = curveOf(path);
  const u = uAtX(curve, side * PORT_X, side < 0 ? 1 : 0.5);
  const end = curve.getPointAt(u);
  const out = curve.getTangentAt(u).normalize().multiplyScalar(side);
  const L = 0.4;
  const g = lathe([
    [0.135, 0],
    [0.19, 0],
    [0.19, L - 0.03],
    [0.16, L],
    [0.135, L],
    [0.135, 0],
  ], 36);
  const q = new THREE.Quaternion().setFromUnitVectors(Y, out);
  g.applyMatrix4(new THREE.Matrix4().compose(end.clone().addScaledVector(out, -L), q, ONE));
  return g;
};

const ellipse = (rx, ry, cx = 0, cy = 0, n = 32) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    return new THREE.Vector2(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  });

// Point on a closed valve's axis, `s` along the stem from the head face.
const valveAxisPoint = (which, s) => {
  const v = VALVES[which];
  return new THREE.Vector3(v.headClosed.x + v.dir.x * s, v.headClosed.y + v.dir.y * s, 0);
};

// Pocket in the top plate so the spring, retainer and follower clear it at full lift.
const springPocket = (which) => {
  const v = VALVES[which];
  const s = ((CORE_TOP + TOP_Y) / 2 - v.headClosed.y) / v.dir.y;
  return ellipse(0.16, 0.13, valveAxisPoint(which, s).x, 0, 32);
};

// Seat boss under the valve spring, carried by a rib cast between the core's front and back walls.
const SEAT_BOSS_S0 = 0.31;
const SEAT_BOSS_S1 = 0.43;
const seatBoss = (which) => {
  const v = VALVES[which];
  const dir = new THREE.Vector3(v.dir.x, v.dir.y, 0).normalize();
  const boss = lathe([
    [0.035, 0],
    [0.105, 0],
    [0.105, SEAT_BOSS_S1 - SEAT_BOSS_S0 - 0.012],
    [0.093, SEAT_BOSS_S1 - SEAT_BOSS_S0],
    [0.035, SEAT_BOSS_S1 - SEAT_BOSS_S0],
    [0.035, 0],
  ], 28);
  boss.applyMatrix4(
    new THREE.Matrix4().compose(
      valveAxisPoint(which, SEAT_BOSS_S0),
      new THREE.Quaternion().setFromUnitVectors(Y, dir),
      ONE,
    ),
  );
  const ribX = valveAxisPoint(which, SEAT_BOSS_S0 + 0.02).x;
  const rib = new THREE.BoxGeometry(0.16, 0.06, 0.84).translate(ribX, 2.23, 0);
  return [boss, rib];
};

const buildHead = () => {
  const { deckY } = GEOM;
  const outer = rrect(1.9, 1.4, 0.2);
  const coreHole = rrect(1.08, 0.76, 0.08);

  const cast = merge([
    slab(outer, null, deckY + 0.015, DECK_TOP, 0.012),
    slab(rrect(1.24, 0.92, 0.14), [coreHole], DECK_TOP - 0.01, CORE_TOP, 0.01),
    ...HEAD_FIN_YS.map((y) =>
      slab(notchedRect(0.95, 0.7, 0.2, 0.6, 0.25), [coreHole], y - 0.018, y + 0.018, 0.008),
    ),
    slab(
      outer,
      [springPocket("intake"), springPocket("exhaust"), circle(0.08, 0, 0, 24)],
      CORE_TOP - 0.005,
      TOP_Y,
      0.012,
    ),
    portBoss(INTAKE_PATH, -1),
    portBoss(EXHAUST_PATH, 1),
    ...seatBoss("intake"),
    ...seatBoss("exhaust"),
    lathe([
      [0.08, TOP_Y - 0.01],
      [0.15, TOP_Y - 0.01],
      [0.15, TOP_Y + 0.04],
      [0.13, TOP_Y + 0.06],
      [0.08, TOP_Y + 0.06],
      [0.08, TOP_Y - 0.01],
    ], 32),
  ]);

  const gasket = slab(
    rrect(1.86, 1.38, 0.19),
    [circle(0.47, 0, 0, 48), ...STUDS.map(([x, z]) => circle(0.035, x, -z, 12))],
    deckY,
    deckY + 0.015,
    0.004,
  );

  const fireRing = lathe([
    [0.45, deckY - 0.004],
    [0.485, deckY - 0.004],
    [0.485, deckY + 0.02],
    [0.45, deckY + 0.02],
    [0.45, deckY - 0.004],
  ], 64);

  const nut = merge([
    lathe([
      [0, 0],
      [0.058, 0],
      [0.058, 0.012],
      [0, 0.012],
    ], 24),
    (() => {
      const h = hexPrism(0.045, 0.045);
      h.translate(0, 0.012, 0);
      return h;
    })(),
  ]);

  return { cast, gasket, fireRing, nut };
};

const Head = ({ mode, selected }) => {
  const shell = PART_BY_ID.head.shell;
  const cast = usePartMaterial("castAluminum", { mode, shell, selected });
  const gasketMat = usePartMaterial("darkSteel", { mode, shell, selected });
  const copper = usePartMaterial("copper", { mode, shell, selected });
  const steel = usePartMaterial("steel", { mode, shell, selected });

  const geo = useMemo(() => buildHead(), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <group>
      <mesh geometry={geo.cast} material={cast} />
      <mesh geometry={geo.gasket} material={gasketMat} />
      <mesh geometry={geo.fireRing} material={copper} />
      <Instances geometry={geo.nut} material={steel} matrices={NUT_MATRICES} />
    </group>
  );
};

export default Head;
