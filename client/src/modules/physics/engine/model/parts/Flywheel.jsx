import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM, crankRotationZ } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.flywheel.shell;
const TEETH = 64;
const HOLES = 6;
const BOLTS = 6;
const MARK_COLOR = "#f8fafc";
const _m = new THREE.Matrix4();

const lathe = (pts, segments = 96) =>
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

const nonIndexed = (g) => {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  return out;
};

const buildRim = () => {
  const rim = lathe([
    [0.6, 0.06],
    [0.6, -0.06, true],
    [0.725, -0.06, true],
    [0.74, -0.045, true],
    [0.74, 0.045, true],
    [0.725, 0.06, true],
    [0.6, 0.06],
  ]).rotateX(Math.PI / 2);
  const hub = lathe([
    [0, -0.07],
    [0.06, -0.07, true],
    [0.06, -0.09, true],
    [0.2, -0.09, true],
    [0.21, -0.08, true],
    [0.21, 0.05, true],
    [0.2, 0.06, true],
    [0, 0.06],
  ], 64).rotateX(Math.PI / 2);

  const disc = new THREE.Shape();
  disc.absarc(0, 0, 0.615, 0, Math.PI * 2, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.19, 0, Math.PI * 2, true);
  disc.holes.push(bore);
  for (let i = 0; i < HOLES; i++) {
    const a = (i / HOLES) * Math.PI * 2 + Math.PI / HOLES;
    const h = new THREE.Path();
    h.absarc(0.41 * Math.cos(a), 0.41 * Math.sin(a), 0.085, 0, Math.PI * 2, true);
    disc.holes.push(h);
  }
  const bevel = 0.008;
  const web = new THREE.ExtrudeGeometry(disc, {
    depth: 0.05 - 2 * bevel,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: 48,
  });
  web.translate(0, 0, -(0.05 - 2 * bevel) / 2);
  return mergeGeometries([nonIndexed(rim), nonIndexed(hub), creased(web)]);
};

const buildSteel = () => {
  const band = lathe([
    [0.736, 0.015],
    [0.736, -0.055, true],
    [0.75, -0.055, true],
    [0.75, 0.015, true],
    [0.736, 0.015],
  ]).rotateX(Math.PI / 2);
  const parts = [nonIndexed(band)];
  for (let i = 0; i < BOLTS; i++) {
    const a = (i / BOLTS) * Math.PI * 2;
    const head = new THREE.CylinderGeometry(0.03, 0.03, 0.026, 6)
      .rotateX(Math.PI / 2)
      .rotateZ(a)
      .translate(0.14 * Math.cos(a), 0.14 * Math.sin(a), -0.103);
    const flatHead = nonIndexed(head);
    flatHead.computeVertexNormals();
    parts.push(flatHead);
  }
  return mergeGeometries(parts);
};

const buildTooth = () => {
  const s = new THREE.Shape();
  s.moveTo(-0.022, 0.745);
  s.lineTo(0.022, 0.745);
  s.lineTo(0.01, 0.786);
  s.lineTo(-0.01, 0.786);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
  g.translate(0, 0, -0.055);
  return creased(g);
};

const buildMark = () => {
  const parts = [0.0625, -0.0625].map((z) =>
    nonIndexed(new THREE.BoxGeometry(0.028, 0.12, 0.004).translate(0, 0.665, z)),
  );
  return mergeGeometries(parts);
};

const Flywheel = ({ simRef, mode, selected }) => {
  const groupRef = useRef(null);
  const teethRef = useRef(null);
  const castMat = usePartMaterial("darkSteel", { mode, shell: SHELL, selected });
  const steelMat = usePartMaterial("steel", { mode, shell: SHELL, selected });

  const markMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: MARK_COLOR,
        emissive: MARK_COLOR,
        emissiveIntensity: 0.35,
        roughness: 0.5,
      }),
    [],
  );
  const geos = useMemo(
    () => ({ rim: buildRim(), steel: buildSteel(), tooth: buildTooth(), mark: buildMark() }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
      markMat.dispose();
    },
    [geos, markMat],
  );

  useLayoutEffect(() => {
    const mesh = teethRef.current;
    if (!mesh) return;
    for (let i = 0; i < TEETH; i++) {
      _m.makeRotationZ((i / TEETH) * Math.PI * 2);
      mesh.setMatrixAt(i, _m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [geos, steelMat]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z = crankRotationZ(simRef.current.theta);
  });

  return (
    <group ref={groupRef} position={[0, 0, GEOM.flywheelZ]}>
      <mesh geometry={geos.rim} material={castMat} castShadow receiveShadow />
      <mesh geometry={geos.steel} material={steelMat} />
      <instancedMesh ref={teethRef} args={[geos.tooth, steelMat, TEETH]} />
      <mesh geometry={geos.mark} material={markMat} />
    </group>
  );
};

export default Flywheel;
