import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CYCLE, GEOM, TAU, VALVES } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.timing.shell;
const THICK = 0.035;
const WIDTH = 0.12;
const TICKS = 28;
const TICK_COLOR = "#50565f";
const _m = new THREE.Matrix4();
const _p = { x: 0, y: 0, a: 0 };

const CIRCLES = (() => {
  const list = [
    { x: 0, y: 0, r: GEOM.crankPulleyRadius },
    { x: VALVES.exhaust.camCenter.x, y: VALVES.exhaust.camCenter.y, r: GEOM.camPulleyRadius },
    { x: VALVES.intake.camCenter.x, y: VALVES.intake.camCenter.y, r: GEOM.camPulleyRadius },
  ];
  const [a, b, c] = list;
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return cross > 0 ? list : [a, c, b];
})();

// Outer tangent normals between consecutive circles, walking the hull counter-clockwise.
const EDGE_NORMALS = CIRCLES.map((a, i) => {
  const b = CIRCLES[(i + 1) % CIRCLES.length];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const k = (a.r - b.r) / len;
  const h = Math.sqrt(1 - k * k);
  const ux = dx / len;
  const uy = dy / len;
  return Math.atan2(k * uy - h * ux, k * ux + h * uy);
});

const buildLoop = (offset) => {
  const segs = [];
  const n = CIRCLES.length;
  for (let i = 0; i < n; i++) {
    const c = CIRCLES[i];
    const r = c.r + offset;
    const a0 = EDGE_NORMALS[(i + n - 1) % n];
    const a1 = EDGE_NORMALS[i];
    const da = (((a1 - a0) % TAU) + TAU) % TAU;
    segs.push({ arc: true, cx: c.x, cy: c.y, r, a0, da, len: r * da });
    const next = CIRCLES[(i + 1) % n];
    const x0 = c.x + r * Math.cos(a1);
    const y0 = c.y + r * Math.sin(a1);
    const x1 = next.x + (next.r + offset) * Math.cos(a1);
    const y1 = next.y + (next.r + offset) * Math.sin(a1);
    segs.push({ arc: false, x0, y0, x1, y1, a: Math.atan2(y1 - y0, x1 - x0), len: Math.hypot(x1 - x0, y1 - y0) });
  }
  return { segs, length: segs.reduce((s, g) => s + g.len, 0) };
};

const loopPath = (path, offset) => {
  const { segs } = buildLoop(offset);
  segs.forEach((g, i) => {
    if (!g.arc) return;
    if (i === 0) path.moveTo(g.cx + g.r * Math.cos(g.a0), g.cy + g.r * Math.sin(g.a0));
    path.absarc(g.cx, g.cy, g.r, g.a0, g.a0 + g.da, false);
  });
  return path;
};

const MID = buildLoop(THICK / 2);

const evalLoop = (s, out) => {
  let d = ((s % MID.length) + MID.length) % MID.length;
  for (const g of MID.segs) {
    if (d <= g.len || g === MID.segs[MID.segs.length - 1]) {
      const t = g.len > 0 ? Math.min(1, d / g.len) : 0;
      if (g.arc) {
        const ang = g.a0 + t * g.da;
        out.x = g.cx + g.r * Math.cos(ang);
        out.y = g.cy + g.r * Math.sin(ang);
        out.a = ang + Math.PI / 2;
      } else {
        out.x = g.x0 + t * (g.x1 - g.x0);
        out.y = g.y0 + t * (g.y1 - g.y0);
        out.a = g.a;
      }
      return out;
    }
    d -= g.len;
  }
  return out;
};

// Hash precision in toCreasedNormals is 0.01, so run it at 100x scale.
const creased = (g, angle = Math.PI / 6) => {
  g.scale(100, 100, 100);
  const out = toCreasedNormals(g, angle);
  out.scale(0.01, 0.01, 0.01);
  return out;
};

const buildBelt = () => {
  const shape = loopPath(new THREE.Shape(), THICK);
  shape.holes.push(loopPath(new THREE.Path(), 0));
  const bevel = 0.006;
  const depth = WIDTH - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: 40,
  });
  g.translate(0, 0, GEOM.beltZ - depth / 2);
  return creased(g);
};

// Local x runs along the belt, local -y points out of the loop.
const buildTick = () =>
  mergeGeometries(
    [
      new THREE.BoxGeometry(0.022, THICK + 0.004, 0.006).translate(0, 0, WIDTH / 2 + 0.001),
      new THREE.BoxGeometry(0.022, THICK + 0.004, 0.006).translate(0, 0, -WIDTH / 2 - 0.001),
      new THREE.BoxGeometry(0.022, 0.006, WIDTH + 0.004).translate(0, -THICK / 2 - 0.001, 0),
    ].map((b) => {
      const out = b.toNonIndexed();
      b.dispose();
      return out;
    }),
  );

const TimingBelt = ({ simRef, mode, selected }) => {
  const ticksRef = useRef(null);
  const state = useRef({ last: null, travel: 0 });
  const beltMat = usePartMaterial("rubber", { mode, shell: SHELL, selected });
  const tickMat = usePartMaterial("rubber", { mode, shell: SHELL, selected });

  useEffect(() => {
    tickMat.color.set(TICK_COLOR);
  }, [tickMat]);

  const geos = useMemo(() => ({ belt: buildBelt(), tick: buildTick() }), []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame(() => {
    const mesh = ticksRef.current;
    if (!mesh) return;
    const st = state.current;
    const theta = simRef.current.theta;
    let d = st.last == null ? 0 : theta - st.last;
    if (d > CYCLE / 2) d -= CYCLE;
    else if (d < -CYCLE / 2) d += CYCLE;
    const first = st.last == null;
    st.last = theta;
    if (!first && d === 0) return;
    // Crank turns clockwise, the hull is walked counter-clockwise.
    st.travel = (st.travel - d * GEOM.crankPulleyRadius) % MID.length;
    const spacing = MID.length / TICKS;
    for (let i = 0; i < TICKS; i++) {
      evalLoop(st.travel + i * spacing, _p);
      _m.makeRotationZ(_p.a).setPosition(_p.x, _p.y, GEOM.beltZ);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <mesh geometry={geos.belt} material={beltMat} castShadow receiveShadow />
      <instancedMesh ref={ticksRef} args={[geos.tick, tickMat, TICKS]} frustumCulled={false} />
    </group>
  );
};

export default TimingBelt;
