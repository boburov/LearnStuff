import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { pistonPinY } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.pin.shell;
const OUTER = 0.08;
const INNER = 0.05;
const HALF = 0.35;

const lathe = (pts, segments = 48) =>
  new THREE.LatheGeometry(
    pts.flatMap(([x, y, hard]) =>
      hard ? [new THREE.Vector2(x, y), new THREE.Vector2(x, y)] : [new THREE.Vector2(x, y)],
    ),
    segments,
  );

const buildPin = () =>
  lathe([
    [INNER, HALF - 0.004],
    [INNER, -HALF + 0.004, true],
    [INNER + 0.006, -HALF, true],
    [OUTER - 0.008, -HALF, true],
    [OUTER, -HALF + 0.008, true],
    [OUTER, HALF - 0.008, true],
    [OUTER - 0.008, HALF, true],
    [INNER + 0.006, HALF, true],
    [INNER, HALF - 0.004],
  ]).rotateX(Math.PI / 2);

const buildClips = () => {
  const clips = [1, -1].map((s) =>
    new THREE.TorusGeometry(0.068, 0.0065, 8, 40, Math.PI * 1.8)
      .rotateZ(Math.PI * 0.6)
      .translate(0, 0, s * (HALF + 0.012)),
  );
  const merged = mergeGeometries(clips);
  clips.forEach((g) => g.dispose());
  return merged;
};

const PistonPin = ({ simRef, mode, selected }) => {
  const groupRef = useRef(null);
  const pinMat = usePartMaterial("steel", { mode, shell: SHELL, selected });
  const clipMat = usePartMaterial("darkSteel", { mode, shell: SHELL, selected });

  const geos = useMemo(() => ({ pin: buildPin(), clips: buildClips() }), []);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.y = pistonPinY(simRef.current.theta);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geos.pin} material={pinMat} castShadow />
      <mesh geometry={geos.clips} material={clipMat} />
    </group>
  );
};

export default PistonPin;
