import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAS_COLORS, GEOM, gasStateInto, pistonCrownY } from "../../engineMath";

const RADIUS = GEOM.boreRadius - 0.015;
const SEGMENTS = 48;
const TAN_TILT = Math.tan(GEOM.valveTilt);
// Just under the closed valve faces so the gas never z-fights them.
const FACE_GAP = 0.003;
// Pent roof through the closed (tilted) valve faces: ridge along z, lowest at the bore wall.
const roofY = (x) => TAN_TILT * (GEOM.valveOffsetX - Math.abs(x)) - FACE_GAP;
const RIDGE = roofY(0);
const SKIRT = roofY(RADIUS);
// Crown is domed; start the column a touch lower so no sliver shows at the edge.
const CROWN_DROP = 0.02;
const KIND_COLORS = [GAS_COLORS.mixture, GAS_COLORS.flame, GAS_COLORS.exhaust].map((c) => new THREE.Color(c));
const noRaycast = () => null;

const buildRoof = () => {
  const pos = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const a0 = (i / SEGMENTS) * Math.PI * 2;
    const a1 = ((i + 1) / SEGMENTS) * Math.PI * 2;
    const x0 = RADIUS * Math.sin(a0);
    const z0 = RADIUS * Math.cos(a0);
    const x1 = RADIUS * Math.sin(a1);
    const z1 = RADIUS * Math.cos(a1);
    pos.push(x0, SKIRT, z0, x1, SKIRT, z1, x1, roofY(x1), z1);
    pos.push(x0, SKIRT, z0, x1, roofY(x1), z1, x0, roofY(x0), z0);
    pos.push(0, RIDGE, 0, x0, roofY(x0), z0, x1, roofY(x1), z1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
};

// Always mounted so the scene's light count (and every lit shader) stays the same across modes.
const CombustionGas = ({ simRef, active = true }) => {
  const columnRef = useRef(null);
  const floorRef = useRef(null);
  const lightRef = useRef(null);
  const smooth = useRef({ heat: 0, init: false });
  const gas = useRef({ fill: 0, kind: 0, heat: 0 });

  const assets = useMemo(() => {
    const column = new THREE.CylinderGeometry(RADIUS, RADIUS, 1, SEGMENTS, 1, true).translate(0, 0.5, 0);
    const floor = new THREE.CircleGeometry(RADIUS, SEGMENTS).rotateX(-Math.PI / 2);
    const roof = buildRoof();
    const material = new THREE.MeshStandardMaterial({
      color: GAS_COLORS.mixture,
      emissive: GAS_COLORS.flame,
      emissiveIntensity: 0,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      roughness: 0.9,
      metalness: 0,
    });
    return { column, floor, roof, material };
  }, []);
  useEffect(() => () => Object.values(assets).forEach((o) => o.dispose()), [assets]);

  useFrame((_, delta) => {
    const light = lightRef.current;
    const column = columnRef.current;
    const floor = floorRef.current;
    if (!light || !column || !floor) return;
    const st = smooth.current;
    if (!active) {
      light.intensity = 0;
      st.init = false;
      return;
    }
    const theta = simRef.current.theta;
    const g = gasStateInto(theta, gas.current);
    const bottom = pistonCrownY(theta) - CROWN_DROP;
    const top = GEOM.deckY + SKIRT;
    const height = Math.max(0.001, top - bottom);
    column.position.y = bottom;
    column.scale.y = height;
    floor.position.y = bottom;

    const mat = column.material;
    const k = st.init ? 1 - Math.exp(-Math.min(delta, 0.1) * 10) : 1;
    st.init = true;
    mat.color.lerp(KIND_COLORS[g.kind], k);
    const targetHeat = g.kind === 1 ? g.heat : g.kind === 2 ? g.heat * 0.25 : 0;
    st.heat += (targetHeat - st.heat) * k;
    mat.opacity += (0.18 + 0.45 * g.fill - mat.opacity) * k;
    mat.emissiveIntensity = st.heat * 2.4;

    light.position.y = bottom + height * 0.5;
    light.intensity = g.kind === 1 ? st.heat * 10 : 0;
  });

  return (
    <>
      <group visible={active}>
        <mesh ref={columnRef} geometry={assets.column} material={assets.material} raycast={noRaycast} renderOrder={2} />
        <mesh ref={floorRef} geometry={assets.floor} material={assets.material} raycast={noRaycast} renderOrder={2} />
        <mesh geometry={assets.roof} material={assets.material} position={[0, GEOM.deckY, 0]} raycast={noRaycast} renderOrder={2} />
      </group>
      <pointLight ref={lightRef} position={[0, GEOM.deckY - 0.2, 0]} color="#ff8a3d" intensity={0} distance={2.6} decay={2} />
    </>
  );
};

export default CombustionGas;
