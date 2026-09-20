import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM, pistonPinY } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.rod.shell;
const L = GEOM.rodLength;
const THICK = 0.14;
const BIG_BORE = 0.115;
const SMALL_BORE = 0.095;
const BOLT_X = 0.235;

const lathe = (pts, segments = 48) =>
  new THREE.LatheGeometry(
    pts.flatMap(([x, y, hard]) =>
      hard ? [new THREE.Vector2(x, y), new THREE.Vector2(x, y)] : [new THREE.Vector2(x, y)],
    ),
    segments,
  );

// Hash precision in toCreasedNormals is 0.01, so run it at 100x scale.
const creased = (g, angle = Math.PI / 6) => {
  g.scale(100, 100, 100);
  const out = toCreasedNormals(g, angle);
  out.scale(0.01, 0.01, 0.01);
  return out;
};

const extrude = (shape, thickness, bevel) => {
  const depth = thickness - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: 32,
  });
  g.translate(0, 0, -depth / 2);
  return creased(g);
};

const nonIndexed = (g) => {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  return out;
};

const flat = (g) => {
  const out = nonIndexed(g);
  out.computeVertexNormals();
  return out;
};

const windowShape = (grow) => {
  const s = new THREE.Shape();
  s.moveTo(0.048 + grow, 0.4);
  s.lineTo(0.03 + grow, 1.0);
  s.absarc(0, 1.0, 0.03 + grow, 0, Math.PI, false);
  s.lineTo(-0.048 - grow, 0.4);
  s.absarc(0, 0.4, 0.048 + grow, Math.PI, Math.PI * 2, false);
  return s;
};

const buildBody = () => {
  const a = -30 * (Math.PI / 180);
  const ex = 0.13 * Math.cos(a);
  const ey = L + 0.13 * Math.sin(a);
  const s = new THREE.Shape();
  s.moveTo(0.27, 0);
  s.lineTo(0.27, 0.08);
  s.lineTo(0.2, 0.08);
  s.bezierCurveTo(0.16, 0.08, 0.089, 0.16, 0.085, 0.3);
  s.lineTo(0.064, L - 0.23);
  s.bezierCurveTo(0.061, L - 0.16, ex - 0.03, ey - 0.052, ex, ey);
  s.absarc(0, L, 0.13, a, Math.PI - a, false);
  s.bezierCurveTo(-ex + 0.03, ey - 0.052, -0.061, L - 0.16, -0.064, L - 0.23);
  s.lineTo(-0.085, 0.3);
  s.bezierCurveTo(-0.089, 0.16, -0.16, 0.08, -0.2, 0.08);
  s.lineTo(-0.27, 0.08);
  s.lineTo(-0.27, 0);
  s.lineTo(-BIG_BORE, 0);
  s.absarc(0, 0, BIG_BORE, Math.PI, 0, true);
  s.lineTo(0.27, 0);
  const eye = new THREE.Path();
  eye.absarc(0, L, SMALL_BORE, 0, Math.PI * 2, true);
  s.holes.push(eye, windowShape(0));
  return extrude(s, THICK, 0.01);
};

const buildWeb = () => {
  const g = new THREE.ExtrudeGeometry(windowShape(0.004), {
    depth: 0.05,
    bevelEnabled: false,
    curveSegments: 16,
  });
  g.translate(0, 0, -0.025);
  return creased(g);
};

const buildCap = () => {
  const ya = 0.075;
  const a = Math.asin(ya / 0.21);
  const xa = 0.21 * Math.cos(a);
  const s = new THREE.Shape();
  s.moveTo(-0.27, 0);
  s.lineTo(-0.27, -ya);
  s.lineTo(-xa, -ya);
  s.absarc(0, 0, 0.21, Math.PI + a, Math.PI * 2 - a, false);
  s.lineTo(0.27, -ya);
  s.lineTo(0.27, 0);
  s.lineTo(BIG_BORE, 0);
  s.absarc(0, 0, BIG_BORE, 0, Math.PI, true);
  s.lineTo(-0.27, 0);
  return extrude(s, THICK, 0.01);
};

const bearingShell = (inner, outer) =>
  lathe([
    [inner, 0.068],
    [inner, -0.068, true],
    [outer, -0.068, true],
    [outer, 0.068, true],
    [inner, 0.068],
  ]).rotateX(Math.PI / 2);

const buildShells = () =>
  mergeGeometries(
    [bearingShell(0.1, BIG_BORE + 0.002), bearingShell(0.08, SMALL_BORE + 0.002).translate(0, L, 0)].map(
      nonIndexed,
    ),
  );

const buildBolts = () => {
  const parts = [];
  for (const s of [1, -1]) {
    const x = s * BOLT_X;
    parts.push(
      flat(new THREE.CylinderGeometry(0.04, 0.04, 0.036, 6).translate(x, -0.075 - 0.018, 0)),
      flat(new THREE.CylinderGeometry(0.038, 0.038, 0.04, 6).rotateY(Math.PI / 6).translate(x, 0.1, 0)),
      nonIndexed(new THREE.CylinderGeometry(0.019, 0.021, 0.2, 16).translate(x, 0.03, 0)),
      nonIndexed(new THREE.CylinderGeometry(0.014, 0.02, 0.012, 16).translate(x, 0.126, 0)),
    );
  }
  return mergeGeometries(parts);
};

const ConnectingRod = ({ simRef, mode, selected }) => {
  const groupRef = useRef(null);
  const bodyMat = usePartMaterial("steel", { mode, shell: SHELL, selected });
  const boltMat = usePartMaterial("darkSteel", { mode, shell: SHELL, selected });
  const shellMat = usePartMaterial("brass", { mode, shell: SHELL, selected });

  const geos = useMemo(
    () => ({
      body: buildBody(),
      web: buildWeb(),
      cap: buildCap(),
      shells: buildShells(),
      bolts: buildBolts(),
    }),
    [],
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const theta = simRef.current.theta;
    // Inlined crankPin/rodAngle: those return fresh objects every call.
    const px = GEOM.crankRadius * Math.sin(theta);
    const py = GEOM.crankRadius * Math.cos(theta);
    g.position.set(px, py, GEOM.rodZ);
    g.rotation.z = Math.atan2(px, pistonPinY(theta) - py);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geos.body} material={bodyMat} castShadow />
      <mesh geometry={geos.web} material={bodyMat} />
      <mesh geometry={geos.cap} material={bodyMat} castShadow />
      <mesh geometry={geos.shells} material={shellMat} />
      <mesh geometry={geos.bolts} material={boltMat} />
    </group>
  );
};

export default ConnectingRod;
