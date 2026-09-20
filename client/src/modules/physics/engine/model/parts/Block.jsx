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

const FIN_YS = Array.from({ length: 9 }, (_, i) => 0.79 + i * 0.12);
const STUDS = [
  [0.78, 0.42],
  [-0.78, 0.42],
  [0.78, -0.42],
  [-0.78, -0.42],
];
const FLANGE_TOP = 0.68;
const NUT_MATRICES = STUDS.map(([x, z]) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, FLANGE_TOP, z), new THREE.Quaternion(), ONE),
);

const buildBlock = () => {
  const { boreRadius: rb, cylinderOuterRadius: ro, linerBottomY: yb, deckY: yd } = GEOM;
  const fins = FIN_YS.map((y) =>
    slab(rrect(1.8, 1.4, 0.2), [circle(0.6)], y - 0.018, y + 0.018, 0.008),
  );
  const cast = merge([
    lathe([
      [rb + 0.02, yb],
      [ro - 0.02, yb],
      [ro, yb + 0.02],
      [ro, yd - 0.02],
      [ro - 0.02, yd],
      [rb + 0.02, yd],
      [rb + 0.02, yb],
    ], 64),
    ...fins,
    slab(rrect(1.72, 1.2, 0.14), [circle(rb + 0.01)], 0.6, FLANGE_TOP, 0.012),
    slab(rrect(1.72, 1.36, 0.16), [circle(rb + 0.01)], yd - 0.055, yd, 0.01),
    slab(rrect(0.07, 0.12, 0.025, 0, -0.64), null, FLANGE_TOP, yd - 0.05, 0.008),
    slab(rrect(0.07, 0.12, 0.025, 0, 0.64), null, FLANGE_TOP, yd - 0.05, 0.008),
  ]);

  // Honed liner: slightly proud below the block like a real spigot.
  const liner = lathe([
    [rb, yb - 0.06],
    [rb + 0.022, yb - 0.06],
    [rb + 0.022, yd],
    [rb, yd],
    [rb, yb - 0.06],
  ], 64);

  const studs = merge(
    STUDS.map(([x, z]) => {
      const g = new THREE.CylinderGeometry(0.024, 0.024, 2.1, 12);
      g.translate(x, 0.6 + 1.05, z);
      return g;
    }),
  );

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

  return { cast, liner, studs, nut };
};

const Block = ({ mode, selected }) => {
  const shell = PART_BY_ID.block.shell;
  const cast = usePartMaterial("castAluminum", { mode, shell, selected });
  const liner = usePartMaterial("darkSteel", { mode, shell, selected });
  const steel = usePartMaterial("steel", { mode, shell, selected });

  const geo = useMemo(() => buildBlock(), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <group>
      <mesh geometry={geo.cast} material={cast} />
      <mesh geometry={geo.liner} material={liner} />
      <mesh geometry={geo.studs} material={steel} />
      <Instances geometry={geo.nut} material={steel} matrices={NUT_MATRICES} />
    </group>
  );
};

export default Block;
