import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { GEOM, TAU, VALVES, camProfileRadius, camRotationZ } from "../../engineMath";
import { PART_BY_ID } from "../../engineParts";
import { usePartMaterial } from "../materials";

const SHELL = PART_BY_ID.camshafts.shell;
const WHICH = ["intake", "exhaust"];
const LOBE_SAMPLES = 192;
const LOBE_DEPTH = 0.16;
// Must match the roller follower radius in Valve.jsx.
const ROLLER_R = 0.035;
const PULLEY_TEETH = 40;
const MARK_COLOR = "#fde047";

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

// Roller-follower cam: offset the pitch curve (profile + roller radius) inward by the roller radius.
const lobeShape = (which) => {
  const e = 1e-4;
  const s = new THREE.Shape();
  for (let i = 0; i < LOBE_SAMPLES; i++) {
    const a = (i / LOBE_SAMPLES) * TAU;
    const p = camProfileRadius(a, which) + ROLLER_R;
    const dp = (camProfileRadius(a + e, which) - camProfileRadius(a - e, which)) / (2 * e);
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const tx = dp * ux - p * uy;
    const ty = dp * uy + p * ux;
    const tl = Math.hypot(tx, ty);
    const x = p * ux - (ROLLER_R * ty) / tl;
    const y = p * uy + (ROLLER_R * tx) / tl;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
};

const buildShaft = (which) => {
  const lobe = extrude(lobeShape(which), LOBE_DEPTH, 0.008);
  const shaft = lathe([
    [0, -0.55],
    [0.05, -0.55, true],
    [0.06, -0.54, true],
    [0.06, -0.45, true],
    [0.08, -0.45, true],
    [0.085, -0.445, true],
    [0.085, -0.365, true],
    [0.08, -0.36, true],
    [0.06, -0.36, true],
    [0.06, 0.36, true],
    [0.08, 0.36, true],
    [0.085, 0.365, true],
    [0.085, 0.445, true],
    [0.08, 0.45, true],
    [0.06, 0.45, true],
    [0.06, 1.03, true],
    [0.075, 1.03, true],
    [0.075, 1.042, true],
    [0, 1.042],
  ]).rotateX(Math.PI / 2);
  const bolt = nonIndexed(
    new THREE.CylinderGeometry(0.048, 0.048, 0.04, 6).rotateX(Math.PI / 2).translate(0, 0, 1.062),
  );
  bolt.computeVertexNormals();
  return mergeGeometries([lobe, nonIndexed(shaft), bolt]);
};

const buildPulley = () => {
  const r = GEOM.camPulleyRadius;
  const z = GEOM.beltZ;
  const hw = 0.066;
  const rim = lathe([
    [r - 0.06, z - hw],
    [r - 0.017, z - hw, true],
    [r - 0.017, z + hw, true],
    [r - 0.06, z + hw, true],
    [r - 0.06, z - hw],
  ], 96).rotateX(Math.PI / 2);
  const flange = (zc) =>
    lathe([
      [r - 0.06, zc - 0.007],
      [r + 0.03, zc - 0.007, true],
      [r + 0.037, zc, true],
      [r + 0.03, zc + 0.007, true],
      [r - 0.06, zc + 0.007],
    ], 96).rotateX(Math.PI / 2);
  const hub = lathe([
    [0.06, z - 0.075],
    [0.11, z - 0.075, true],
    [0.11, z + 0.075, true],
    [0.06, z + 0.075],
  ], 48).rotateX(Math.PI / 2);

  const disc = new THREE.Shape();
  disc.absarc(0, 0, r - 0.05, 0, TAU, false);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 0.1, 0, TAU, true);
  disc.holes.push(bore);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + Math.PI / 5;
    const h = new THREE.Path();
    h.absarc(0.2 * Math.cos(a), 0.2 * Math.sin(a), 0.062, 0, TAU, true);
    disc.holes.push(h);
  }
  const web = extrude(disc, 0.045, 0.007, 40).translate(0, 0, z);

  const tooth = new THREE.Shape();
  tooth.moveTo(-0.018, r - 0.022);
  tooth.lineTo(0.018, r - 0.022);
  tooth.lineTo(0.01, r);
  tooth.lineTo(-0.01, r);
  const teeth = [];
  for (let i = 0; i < PULLEY_TEETH; i++) {
    const g = new THREE.ExtrudeGeometry(tooth, { depth: hw * 2, bevelEnabled: false });
    g.translate(0, 0, z - hw).rotateZ((i / PULLEY_TEETH) * TAU);
    teeth.push(creased(g));
  }
  return mergeGeometries([
    nonIndexed(rim),
    nonIndexed(flange(z - hw - 0.007)),
    nonIndexed(flange(z + hw + 0.007)),
    nonIndexed(hub),
    web,
    ...teeth,
  ]);
};

// Mark points along the lobe nose so the cam phase reads at a glance.
const buildMark = (which) => {
  const a = VALVES[which].lobeAngle;
  const r = GEOM.camPulleyRadius;
  const z = GEOM.beltZ + 0.066 + 0.0145;
  const tri = new THREE.Shape();
  tri.moveTo(r - 0.05, -0.022);
  tri.lineTo(r - 0.05, 0.022);
  tri.lineTo(r + 0.028, 0);
  const g = new THREE.ExtrudeGeometry(tri, { depth: 0.004, bevelEnabled: false });
  return g.translate(0, 0, z - 0.002).rotateZ(a);
};

const Camshaft = ({ which, simRef, shaftMat, pulleyMat, markMat, pulleyGeo }) => {
  const groupRef = useRef(null);
  const c = VALVES[which].camCenter;
  const geos = useMemo(() => ({ shaft: buildShaft(which), mark: buildMark(which) }), [which]);
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos]);

  useFrame(() => {
    if (groupRef.current) groupRef.current.rotation.z = camRotationZ(simRef.current.theta);
  });

  return (
    <group ref={groupRef} position={[c.x, c.y, 0]}>
      <mesh geometry={geos.shaft} material={shaftMat} castShadow />
      <mesh geometry={pulleyGeo} material={pulleyMat} castShadow />
      <mesh geometry={geos.mark} material={markMat} />
    </group>
  );
};

const Camshafts = ({ simRef, mode, selected }) => {
  const shaftMat = usePartMaterial("steel", { mode, shell: SHELL, selected });
  const pulleyMat = usePartMaterial("castAluminum", { mode, shell: SHELL, selected });
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
  const pulleyGeo = useMemo(() => buildPulley(), []);
  useEffect(
    () => () => {
      pulleyGeo.dispose();
      markMat.dispose();
    },
    [pulleyGeo, markMat],
  );

  return (
    <group>
      {WHICH.map((which) => (
        <Camshaft
          key={which}
          which={which}
          simRef={simRef}
          shaftMat={shaftMat}
          pulleyMat={pulleyMat}
          markMat={markMat}
          pulleyGeo={pulleyGeo}
        />
      ))}
    </group>
  );
};

export default Camshafts;
