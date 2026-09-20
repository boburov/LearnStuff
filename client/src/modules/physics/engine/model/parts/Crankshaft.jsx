import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM, crankRotationZ } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.crankshaft.shell;
const DEG = Math.PI / 180;
const WEB_Z = 0.17;
const WEB_T = 0.1;
const PIN_R = 0.1;
const JOURNAL_R = 0.12;
const PULLEY_TEETH = 20;
const MARK_COLOR = "#fde047";

const lathe = (pts, segments = 56) =>
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

const extrude = (shape, thickness, bevel, curveSegments = 32) => {
  const depth = thickness - 2 * bevel;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments,
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

const webShape = () => {
  const r = GEOM.crankRadius;
  const boss = 0.2;
  const cw = 0.55;
  const s = new THREE.Shape();
  const tip = -15 * DEG;
  s.moveTo(cw * Math.cos(tip), cw * Math.sin(tip));
  const nr = -10 * DEG;
  s.bezierCurveTo(0.36, -0.02, 0.23, 0.12, boss * Math.cos(nr), r + boss * Math.sin(nr));
  s.absarc(0, r, boss, nr, Math.PI - nr, false);
  s.bezierCurveTo(-0.23, 0.12, -0.36, -0.02, -cw * Math.cos(tip), cw * Math.sin(tip));
  s.absarc(0, 0, cw, Math.PI - tip, Math.PI * 2 + tip, false);
  return s;
};

const buildWebs = () => {
  const webs = [WEB_Z, -WEB_Z].map((z) => extrude(webShape(), WEB_T, 0.014, 40).translate(0, 0, z));
  const nose = [
    flat(new THREE.CylinderGeometry(0.062, 0.062, 0.045, 6).rotateX(Math.PI / 2).translate(0, 0, 1.064)),
    nonIndexed(lathe([[0.035, 1.03], [0.085, 1.03, true], [0.085, 1.042, true], [0.035, 1.042]], 40).rotateX(Math.PI / 2)),
  ];
  return mergeGeometries([...webs, ...nose]);
};

const buildPinAndJournals = () => {
  const pin = lathe([
    [0, -WEB_Z],
    [PIN_R, -WEB_Z + 0.01],
    [PIN_R, WEB_Z - 0.01],
    [0, WEB_Z],
  ])
    .rotateX(Math.PI / 2)
    .translate(0, GEOM.crankRadius, 0);

  const fz = GEOM.flywheelZ + 0.06;
  const back = lathe([
    [0, fz],
    [0.19, fz, true],
    [0.2, fz + 0.01],
    [0.2, fz + 0.06, true],
    [0.13, fz + 0.06, true],
    [JOURNAL_R, fz + 0.07],
    [JOURNAL_R, -0.31],
    [0.13, -0.29],
    [0.15, -0.28, true],
    [0.15, -WEB_Z, true],
    [0, -WEB_Z],
  ]).rotateX(Math.PI / 2);

  const front = lathe([
    [0, WEB_Z],
    [0.15, WEB_Z, true],
    [0.15, 0.28, true],
    [0.13, 0.29],
    [JOURNAL_R, 0.31],
    [JOURNAL_R, 0.7, true],
    [0.1, 0.72, true],
    [0.1, 1.02, true],
    [0.09, 1.03, true],
    [0, 1.03],
  ]).rotateX(Math.PI / 2);

  return mergeGeometries([pin, back, front].map(nonIndexed));
};

const buildPulley = () => {
  const r = GEOM.crankPulleyRadius;
  const z = GEOM.beltZ;
  const hw = 0.066;
  const body = lathe([
    [0.1, z - hw],
    [r - 0.017, z - hw, true],
    [r - 0.017, z + hw, true],
    [0.1, z + hw],
  ], 48).rotateX(Math.PI / 2);
  const flange = (zc) =>
    lathe([
      [0.1, zc - 0.007],
      [r + 0.035, zc - 0.007, true],
      [r + 0.042, zc, true],
      [r + 0.035, zc + 0.007, true],
      [0.1, zc + 0.007],
    ], 56).rotateX(Math.PI / 2);
  const tooth = new THREE.Shape();
  tooth.moveTo(-0.016, r - 0.022);
  tooth.lineTo(0.016, r - 0.022);
  tooth.lineTo(0.009, r);
  tooth.lineTo(-0.009, r);
  const teeth = [];
  for (let i = 0; i < PULLEY_TEETH; i++) {
    const g = new THREE.ExtrudeGeometry(tooth, { depth: hw * 2, bevelEnabled: false });
    g.translate(0, 0, z - hw).rotateZ((i / PULLEY_TEETH) * Math.PI * 2);
    teeth.push(creased(g));
  }
  return mergeGeometries([body, flange(z - hw - 0.007), flange(z + hw + 0.007), ...teeth].map(nonIndexed));
};

const buildMark = () => {
  const z = GEOM.beltZ + 0.066 + 0.0145;
  const r = GEOM.crankPulleyRadius;
  const notch = new THREE.BoxGeometry(0.016, 0.07, 0.004).translate(0, r - 0.005, z);
  const webDot = new THREE.CylinderGeometry(0.03, 0.03, 0.004, 20)
    .rotateX(Math.PI / 2)
    .translate(0, GEOM.crankRadius + 0.12, WEB_Z + WEB_T / 2 + 0.002);
  return mergeGeometries([notch, webDot].map(nonIndexed));
};

const Crankshaft = ({ simRef, mode, selected }) => {
  const groupRef = useRef(null);
  const webMat = usePartMaterial("darkSteel", { mode, shell: SHELL, selected });
  const shaftMat = usePartMaterial("steel", { mode, shell: SHELL, selected });

  const markMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: MARK_COLOR,
        emissive: MARK_COLOR,
        emissiveIntensity: 0.6,
        roughness: 0.4,
      }),
    [],
  );
  const geos = useMemo(
    () => ({
      webs: buildWebs(),
      shaft: buildPinAndJournals(),
      pulley: buildPulley(),
      mark: buildMark(),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
      markMat.dispose();
    },
    [geos, markMat],
  );

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z = crankRotationZ(simRef.current.theta);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geos.webs} material={webMat} castShadow />
      <mesh geometry={geos.shaft} material={shaftMat} castShadow />
      <mesh geometry={geos.pulley} material={shaftMat} />
      <mesh geometry={geos.mark} material={markMat} />
    </group>
  );
};

export default Crankshaft;
