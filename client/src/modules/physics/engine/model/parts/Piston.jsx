import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM, pistonPinY } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.piston.shell;
const R = GEOM.boreRadius - 0.01;
const TOP = GEOM.pinToCrown;
const BOTTOM = TOP - GEOM.pistonHeight;
const DOME = 0.02;

// [radius, y, hard]; a hard point is doubled so the lathe keeps a crisp edge.
const lathe = (pts, segments = 72) =>
  new THREE.LatheGeometry(
    pts.flatMap(([x, y, hard]) =>
      hard ? [new THREE.Vector2(x, y), new THREE.Vector2(x, y)] : [new THREE.Vector2(x, y)],
    ),
    segments,
  );

const nonIndexed = (g) => {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  return out;
};

const GROOVES = [
  [0.012, 0.04, 0.426],
  [0.067, 0.085, 0.428],
  [0.112, 0.13, 0.428],
];

const buildBody = () => {
  const pts = [
    [0, 0.125],
    [0.3, 0.125],
    [0.35, 0.115],
    [0.378, 0.09],
    [0.385, 0.06],
    [0.385, 0.0],
    [0.405, -0.035],
    [0.405, BOTTOM, true],
    [0.43, BOTTOM, true],
    [R, BOTTOM + 0.01, true],
  ];
  for (const [y0, y1, depth] of GROOVES) {
    pts.push([R, y0, true], [depth, y0, true], [depth, y1, true], [R, y1, true]);
  }
  pts.push([R, TOP - 0.03, true], [R - 0.012, TOP - DOME, true]);
  for (let i = 5; i >= 0; i--) {
    const r = ((R - 0.012) * i) / 6;
    pts.push([r, TOP - DOME * (r / (R - 0.012)) ** 2]);
  }
  return lathe(pts, 96);
};

const buildRings = () => {
  const pts = [];
  GROOVES.forEach(([y0, y1, depth], i) => {
    const ri = depth + 0.002;
    const ro = R - 0.0008;
    const g = 0.0015;
    const first = i === 0;
    const last = i === GROOVES.length - 1;
    pts.push([ri, y0 + g, !first], [ro, y0 + g, true], [ro, y1 - g, true], [ri, y1 - g, !last]);
  });
  return lathe(pts, 96);
};

const buildBosses = () => {
  const boss = [
    [0.08, 0.41],
    [0.08, 0.09, true],
    [0.118, 0.09, true],
    [0.118, 0.41],
  ];
  const front = lathe(boss, 40).rotateX(Math.PI / 2);
  const back = lathe(boss, 40).rotateX(-Math.PI / 2);
  const ribs = [1, -1].map((s) =>
    new THREE.BoxGeometry(0.08, 0.06, 0.29).translate(0, 0.1, s * 0.255),
  );
  return mergeGeometries([front, back, ...ribs].map(nonIndexed));
};

const Piston = ({ simRef, mode, selected }) => {
  const groupRef = useRef(null);
  const bodyMat = usePartMaterial("aluminum", { mode, shell: SHELL, selected });
  const ringMat = usePartMaterial("darkSteel", { mode, shell: SHELL, selected });

  const geos = useMemo(
    () => ({ body: buildBody(), rings: buildRings(), bosses: buildBosses() }),
    [],
  );
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.y = pistonPinY(simRef.current.theta);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geos.body} material={bodyMat} castShadow receiveShadow />
      <mesh geometry={geos.bosses} material={bodyMat} />
      <mesh geometry={geos.rings} material={ringMat} />
    </group>
  );
};

export default Piston;
