import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { INTAKE_PATH, INTAKE_PIPE_RADIUS } from "../../engineMath";
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
const FILTER_X = -2.04;
const FILTER_Y = INTAKE_PATH[0][1];

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

// Local frame on the pipe: shape x -> world z, extrusion z -> `dir`.
const frameMatrix = (origin, dir) => {
  const yAxis = new THREE.Vector3().crossVectors(dir, Z);
  return new THREE.Matrix4().makeBasis(Z, yAxis, dir).setPosition(origin);
};

const alongAxis = (g, origin, dir) => {
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir);
  g.applyMatrix4(new THREE.Matrix4().compose(origin, q, ONE));
  return g;
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

const portFlange = (curve, side) => {
  const u = uAtX(curve, side * PORT_X, 1);
  const q = curve.getPointAt(u);
  const out = curve.getTangentAt(u).normalize().multiplyScalar(side);
  const T = 0.045;
  const plate = extrude(
    rrect(0.8, 0.4, 0.2),
    [circle(INTAKE_PIPE_RADIUS - 0.005, 0, 0, 32), circle(0.03, 0.29, 0, 12), circle(0.03, -0.29, 0, 12)],
    T,
    0.008,
  );
  plate.applyMatrix4(frameMatrix(q, out));
  const face = q.clone().addScaledVector(out, T);
  const nuts = [1, -1].map((s) => alongAxis(nutGeo(), face.clone().addScaledVector(Z, s * 0.29), out));
  return { plate, nuts };
};

const band = (curve, x, length, radius, ridges = 0) => {
  const u = uAtX(curve, x, 1);
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u).normalize();
  const pts = [[radius - 0.03, 0], [radius - 0.012, 0], [radius, 0.012, true]];
  for (let i = 1; i <= ridges; i++) {
    const y = (length * i) / (ridges + 1);
    pts.push([radius, y - 0.02, true], [radius + 0.014, y, true], [radius, y + 0.02, true]);
  }
  pts.push([radius, length - 0.012, true], [radius - 0.012, length], [radius - 0.03, length], [radius - 0.03, 0]);
  return alongAxis(lathe(pts, 36), p.clone().addScaledVector(t, -length / 2), t);
};

const clamp = (curve, x, radius) => {
  const u = uAtX(curve, x, 1);
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u).normalize();
  const g = merge([
    new THREE.TorusGeometry(radius, 0.014, 8, 48),
    (() => {
      const lug = extrude(rrect(0.06, 0.05, 0.012), null, 0.07, 0.008);
      lug.translate(0, -radius - 0.02, -0.035);
      return lug;
    })(),
  ]);
  g.applyMatrix4(frameMatrix(p, t));
  return g;
};

const buildIntake = () => {
  const curve = curveOf(INTAKE_PATH);
  const tube = new THREE.TubeGeometry(curve, 120, INTAKE_PIPE_RADIUS, 28, false);
  const flange = portFlange(curve, -1);

  // Carburettor sits on the straight run between the head and the filter.
  const uc = uAtX(curve, -1.6, 1);
  const pc = curve.getPointAt(uc);
  const tc = curve.getTangentAt(uc).normalize();
  const down = new THREE.Vector3().crossVectors(tc, Z).normalize();
  const up = down.clone().negate();

  const carbBody = extrude(rrect(0.32, 0.3, 0.06), null, 0.34, 0.02);
  carbBody.applyMatrix4(frameMatrix(pc.clone().addScaledVector(tc, -0.17), tc));

  const carbEnds = [-1, 1].map((s) =>
    alongAxis(
      lathe([
        [0.13, 0],
        [0.2, 0],
        [0.2, 0.025],
        [0.13, 0.025],
        [0.13, 0],
      ], 36),
      pc.clone().addScaledVector(tc, s * 0.17 - 0.0125),
      tc,
    ),
  );

  const bowl = alongAxis(
    lathe([
      [0, 0],
      [0.14, 0],
      [0.14, 0.12],
      [0.125, 0.155, true],
      [0.06, 0.17],
      [0, 0.17],
    ], 36),
    pc.clone().addScaledVector(down, 0.1),
    down,
  );

  const chokeKnob = alongAxis(
    lathe([
      [0, 0],
      [0.03, 0],
      [0.03, 0.06],
      [0.055, 0.07],
      [0.055, 0.1, true],
      [0.03, 0.115, true],
      [0, 0.118],
    ], 24),
    pc.clone().addScaledVector(up, 0.14),
    up,
  );

  const fuelNipple = alongAxis(
    lathe([
      [0, 0],
      [0.04, 0],
      [0.04, 0.05],
      [0.022, 0.05],
      [0.022, 0.12],
      [0.032, 0.13],
      [0.02, 0.16],
      [0, 0.16],
    ], 20),
    pc.clone().addScaledVector(down, 0.04).addScaledVector(Z, 0.15),
    Z,
  );
  const drainScrew = alongAxis(
    lathe([
      [0, 0],
      [0.03, 0],
      [0.03, 0.035],
      [0, 0.035],
    ], 16),
    pc.clone().addScaledVector(down, 0.265),
    down,
  );

  const leverRoot = pc.clone().addScaledVector(down, 0.06).addScaledVector(Z, -0.16);
  const leverShaft = alongAxis(
    lathe([
      [0, 0],
      [0.025, 0],
      [0.025, 0.07],
      [0, 0.07],
    ], 16),
    leverRoot,
    Z.clone().negate(),
  );
  const leverArm = extrude(rrect(0.05, 0.24, 0.025, 0, 0.09), [circle(0.012, 0, 0.18, 10)], 0.02, 0.005);
  leverArm.rotateZ(-0.35);
  leverArm.translate(leverRoot.x, leverRoot.y, leverRoot.z - 0.09);

  const filterHousing = merge([
    lathe([
      [0.14, 0],
      [0.36, 0],
      [0.38, 0.02, true],
      [0.38, 0.05],
      [0.14, 0.05],
      [0.14, 0],
    ], 64),
    lathe([
      [0, 0.19],
      [0.37, 0.19],
      [0.39, 0.21, true],
      [0.39, 0.24, true],
      [0.34, 0.28, true],
      [0.18, 0.3, true],
      [0, 0.305],
    ], 64),
  ]);
  filterHousing.rotateZ(Math.PI / 2);
  filterHousing.translate(FILTER_X, FILTER_Y, 0);

  const pleats = [];
  for (let i = 0; i < 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const r = i % 2 ? 0.335 : 0.312;
    pleats.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  const element = extrude(pleats, [circle(0.27, 0, 0, 48)], 0.14, 0);
  element.rotateY(-Math.PI / 2);
  element.translate(FILTER_X - 0.05, FILTER_Y, 0);

  const wing = merge([
    lathe([
      [0, 0],
      [0.022, 0],
      [0.022, 0.03],
      [0, 0.03],
    ], 12),
    lathe([
      [0, 0.03],
      [0.05, 0.03],
      [0.05, 0.075],
      [0.035, 0.085],
      [0, 0.085],
    ], 24),
    (() => {
      const w = extrude(rrect(0.22, 0.05, 0.02), null, 0.022, 0.006);
      w.translate(0, 0.08, -0.011);
      return w;
    })(),
  ]);
  wing.rotateZ(Math.PI / 2);
  wing.translate(FILTER_X - 0.3, FILTER_Y, 0);

  return {
    tube,
    carb: merge([carbBody, ...carbEnds, bowl]),
    flange: flange.plate,
    rubber: merge([band(curve, -1.3, 0.16, 0.158), band(curve, -1.88, 0.2, 0.162, 3), element]),
    steel: merge([
      ...flange.nuts,
      clamp(curve, -1.3, 0.165),
      clamp(curve, -1.93, 0.17),
      leverShaft,
      leverArm,
      wing,
    ]),
    brass: merge([fuelNipple, drainScrew]),
    dark: merge([filterHousing, chokeKnob]),
  };
};

const IntakeManifold = ({ mode, selected }) => {
  const shell = PART_BY_ID.intake.shell;
  const aluminum = usePartMaterial("aluminum", { mode, shell, selected });
  const cast = usePartMaterial("castAluminum", { mode, shell, selected });
  const rubber = usePartMaterial("rubber", { mode, shell, selected });
  const steel = usePartMaterial("steel", { mode, shell, selected });
  const brass = usePartMaterial("brass", { mode, shell, selected });
  const dark = usePartMaterial("darkSteel", { mode, shell, selected });

  const geo = useMemo(() => buildIntake(), []);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <group>
      <mesh geometry={geo.tube} material={aluminum} />
      <mesh geometry={geo.flange} material={aluminum} />
      <mesh geometry={geo.carb} material={cast} />
      <mesh geometry={geo.rubber} material={rubber} />
      <mesh geometry={geo.steel} material={steel} />
      <mesh geometry={geo.brass} material={brass} />
      <mesh geometry={geo.dark} material={dark} />
    </group>
  );
};

export default IntakeManifold;
