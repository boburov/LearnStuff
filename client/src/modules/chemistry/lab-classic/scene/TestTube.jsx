// Probirka - a borosilicate test tube: a single LatheGeometry shell (rounded
// bottom, straight wall, slight rim) rendered as real glass via transmission,
// with a separate liquid whose colour and level follow app state.
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  TUBE_X,
  TUBE_BASE_Y,
  TUBE_HEIGHT,
  TUBE_OUTER_R,
  TUBE_INNER_R,
  TUBE_LIQUID_MAX,
} from "./labGeometry";

// Glass outline: revolve a 2D profile around Y - rounded hemispherical bottom,
// straight wall, slightly flared rim.
const buildGlassProfile = (radius, height) => {
  const pts = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push(new THREE.Vector2(radius * Math.cos(a), radius + radius * Math.sin(a)));
  }
  pts.push(new THREE.Vector2(radius, height - 0.06));
  pts.push(new THREE.Vector2(radius + 0.025, height - 0.01));
  pts.push(new THREE.Vector2(radius + 0.025, height));
  return pts;
};

// Build the liquid as a CLOSED volume sized to the current level: a true rounded
// bottom (radius ≤ inner radius, so it always fits inside the glass), a straight
// column, and a flat top surface. We rebuild this instead of Y-scaling a fixed
// mesh - scaling squashed the rounded bottom and pushed its wide part out
// through the narrow glass tip.
const buildLiquidGeometry = (level) => {
  const R = TUBE_INNER_R;
  const H = Math.max(0.012, level * TUBE_LIQUID_MAX);
  const arcTop = Math.min(H, R);
  const pts = [new THREE.Vector2(0, 0)];
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const y = (i / steps) * arcTop;
    pts.push(new THREE.Vector2(Math.sqrt(Math.max(0, R * R - (R - y) * (R - y))), y));
  }
  if (H > R) pts.push(new THREE.Vector2(R, H));
  pts.push(new THREE.Vector2(0, H)); // flat top surface back to the axis
  return new THREE.LatheGeometry(pts, 48);
};

const Liquid = ({ color, fill }) => {
  const meshRef = useRef(null);
  const matRef = useRef(null);
  const level = useRef(0);
  const built = useRef(-1);
  const tint = useMemo(() => new THREE.Color(color), [color]);

  // Dispose the last imperatively-built geometry on unmount.
  useEffect(
    () => () => {
      if (meshRef.current?.geometry) meshRef.current.geometry.dispose();
    },
    [],
  );

  useFrame((_, delta) => {
    level.current += (fill - level.current) * Math.min(1, delta * 3.4);
    const lv = level.current;
    const m = meshRef.current;
    if (m) {
      m.visible = lv > 0.004;
      if (m.visible && Math.abs(lv - built.current) > 0.006) {
        const geo = buildLiquidGeometry(lv);
        if (m.geometry) m.geometry.dispose();
        m.geometry = geo;
        built.current = lv;
      }
    }
    if (matRef.current) matRef.current.color.lerp(tint, Math.min(1, delta * 4));
  });

  return (
    <mesh ref={meshRef} visible={false}>
      {/* tiny placeholder; replaced by the level-sized geometry on the first frame */}
      <sphereGeometry args={[0.01, 3, 2]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        roughness={0.22}
        metalness={0}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const TestTube = ({ liquidColor, fill }) => {
  const profile = useMemo(
    () => buildGlassProfile(TUBE_OUTER_R, TUBE_HEIGHT),
    [],
  );

  return (
    <group position={[TUBE_X, TUBE_BASE_Y, 0]}>
      <Liquid color={liquidColor} fill={fill} />

      {/* Real glass: high transmission + ior 1.45 gives refraction and soft
          reflections (needs the scene Environment to look right). */}
      <mesh>
        <latheGeometry args={[profile, 64]} />
        <meshPhysicalMaterial
          color="#f4f9ff"
          transmission={1}
          thickness={0.18}
          ior={1.45}
          roughness={0.04}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.8}
          specularIntensity={1}
          attenuationColor="#ffffff"
          attenuationDistance={4}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

export default TestTube;
