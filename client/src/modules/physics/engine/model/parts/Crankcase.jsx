import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM } from "../../engineMath";
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

const TOP_Y = 0.6;
const SHELL_TOP = 0.53;
const HALF_W = 0.85;
const BOTTOM_R = 0.78;
const THICK = 0.06;
const HALF_Z = 0.7;
const BOSS_R = 0.22;
// Clears the r=0.12 main journals of the crankshaft.
const BORE_R = 0.125;
// Seal lips ride on the shaft: r=0.1 nose at the front, r=0.12 journal at the back.
const SEAL_INNER = { 1: 0.105, [-1]: 0.125 };
const SEAL_OUTER = 0.15;

// U-shaped wall: flat sides, elliptical sump; `inset` shrinks it for the inner face.
const bowl = (inset) => {
  const rx = HALF_W - inset;
  const ry = BOTTOM_R - inset;
  return [
    new THREE.Vector2(-rx, SHELL_TOP),
    ...arcPts(0, 0, 1, Math.PI, 2 * Math.PI, 36).map((p) => new THREE.Vector2(p.x * rx, p.y * ry)),
    new THREE.Vector2(rx, SHELL_TOP),
  ];
};

const RIB_ANGLES = [0, Math.PI, -Math.PI / 2, -Math.PI / 4, (-3 * Math.PI) / 4];
const RIB_LEN = 0.36;
const RIB_MATRICES = [1, -1].flatMap((side) =>
  RIB_ANGLES.map((a) => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(side < 0 ? Math.PI : 0, 0, side < 0 ? -a : a));
    const p = new THREE.Vector3(Math.cos(a) * BOSS_R, Math.sin(a) * BOSS_R, side * (HALF_Z - 0.004));
    return new THREE.Matrix4().compose(p, q, ONE);
  }),
);

const BOLT_POS = [
  ...[-0.5, 0, 0.5].flatMap((z) => [
    [-0.905, z],
    [0.905, z],
  ]),
  [-0.45, 0.655],
  [0.45, 0.655],
  [-0.45, -0.655],
  [0.45, -0.655],
];
const BOLT_MATRICES = BOLT_POS.map(([x, z]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, TOP_Y, z), new THREE.Quaternion(), ONE),
);

const bearingBoss = (side) => {
  const g = lathe([
    [BORE_R, 0],
    [BOSS_R, 0],
    [BOSS_R, 0.07],
    [BOSS_R - 0.03, 0.1],
    [BORE_R, 0.1],
    [BORE_R, 0],
  ], 48);
  g.rotateX(side * (Math.PI / 2));
  g.translate(0, 0, side * (HALF_Z - 0.01));
  return g;
};

const foot = (z) => {
  const V = (x, y) => new THREE.Vector2(x, y);
  const { floorY } = GEOM;
  const y = floorY + 0.005;
  // Web top runs inside the sump wall so the foot reads as cast into it.
  const g = extrude(
    [
      V(-0.72, y),
      V(0.72, y),
      V(0.72, y + 0.06),
      V(0.58, y + 0.09),
      V(0.5, -0.6),
      V(0.25, -0.71),
      V(0, -0.74),
      V(-0.25, -0.71),
      V(-0.5, -0.6),
      V(-0.58, y + 0.09),
      V(-0.72, y + 0.06),
    ],
    null,
    0.09,
    0.012,
  );
  g.translate(0, 0, z - 0.045);
  return g;
};

const buildCrankcase = () => {
  const outer = bowl(0);
  const inner = bowl(THICK).reverse();
  const wall = extrude([...outer, ...inner], null, HALF_Z * 2, 0.02);
  wall.translate(0, 0, -HALF_Z);

  const endPlate = (side) => {
    const g = extrude(bowl(0.01), [arcPts(0, 0, BORE_R, 0, 2 * Math.PI, 32).slice(0, 32)], 0.05, 0.01);
    g.translate(0, 0, side > 0 ? HALF_Z - 0.053 : -HALF_Z + 0.003);
    return g;
  };

  const drainBoss = lathe([
    [0, -0.82],
    [0.09, -0.82],
    [0.11, -0.8],
    [0.11, -0.7],
    [0, -0.7],
  ], 32);

  const filler = lathe([
    [0.07, 0],
    [0.1, 0],
    [0.1, 0.1],
    [0.085, 0.12],
    [0.07, 0.12],
    [0.07, 0],
  ], 32);
  filler.rotateZ(-Math.PI / 2);
  filler.translate(0.78, 0.22, -0.3);

  const cast = merge([
    wall,
    endPlate(1),
    endPlate(-1),
    slab(rrect(1.9, 1.4, 0.12), [circle(0.5, 0, 0, 48)], SHELL_TOP - 0.01, TOP_Y, 0.012),
    bearingBoss(1),
    bearingBoss(-1),
    drainBoss,
    filler,
    foot(0.45),
    foot(-0.45),
  ]);

  const seals = merge(
    [1, -1].map((side) => {
      const g = lathe([
        [SEAL_INNER[side], 0],
        [SEAL_OUTER, 0],
        [SEAL_OUTER, 0.015],
        [SEAL_INNER[side], 0.015],
        [SEAL_INNER[side], 0],
      ], 32);
      g.rotateX(side * (Math.PI / 2));
      g.translate(0, 0, side * (HALF_Z + 0.085));
      return g;
    }),
  );

  const fillerCap = lathe([
    [0, 0],
    [0.095, 0],
    [0.095, 0.05],
    [0.08, 0.065],
    [0, 0.065],
  ], 16);
  fillerCap.rotateZ(-Math.PI / 2);
  fillerCap.translate(0.895, 0.22, -0.3);

  const drainPlug = merge([
    lathe([
      [0, 0],
      [0.06, 0],
      [0.06, 0.012],
      [0, 0.012],
    ], 24),
    (() => {
      const h = hexPrism(0.045, 0.035);
      h.translate(0, 0.012, 0);
      return h;
    })(),
  ]);
  drainPlug.rotateX(Math.PI);
  drainPlug.translate(0, -0.815, 0);

  const rib = extrude(rrect(RIB_LEN, 0.05, 0.02, RIB_LEN / 2, 0), null, 0.04, 0.01);

  const bolt = merge([
    lathe([
      [0, 0],
      [0.044, 0],
      [0.044, 0.01],
      [0, 0.01],
    ], 24),
    (() => {
      const h = hexPrism(0.032, 0.032);
      h.translate(0, 0.01, 0);
      return h;
    })(),
  ]);

  return { cast, seals, fillerCap, drainPlug, rib, bolt };
};

const Crankcase = ({ mode, selected }) => {
  const shell = PART_BY_ID.crankcase.shell;
  const cast = usePartMaterial("castAluminum", { mode, shell, selected });
  const rubber = usePartMaterial("rubber", { mode, shell, selected });
  const dark = usePartMaterial("darkSteel", { mode, shell, selected });
  const steel = usePartMaterial("steel", { mode, shell, selected });

  const geo = useMemo(() => buildCrankcase(), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <group>
      <mesh geometry={geo.cast} material={cast} />
      <mesh geometry={geo.seals} material={rubber} />
      <mesh geometry={geo.fillerCap} material={dark} />
      <mesh geometry={geo.drainPlug} material={steel} />
      <Instances geometry={geo.rib} material={cast} matrices={RIB_MATRICES} />
      <Instances geometry={geo.bolt} material={steel} matrices={BOLT_MATRICES} />
    </group>
  );
};

export default Crankcase;
