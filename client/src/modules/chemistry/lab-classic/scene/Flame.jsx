// Olov - a compact, upright burner flame that sits in the gap BELOW the tube,
// its tip just reaching the glass bottom (tegib-tegmay). Stacked translucent
// cones (orange → yellow → blue core) with additive blending read as fire, and
// a flickering point light sells the heat. Each layer is anchored at its base
// so flicker stretches the tip, not the root - and it stays vertical (no
// outward splay), so it heats the tube from directly underneath.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FLAME_HEIGHT } from "./labGeometry";

// A touch taller than the gap so the tip kisses the rounded glass bottom.
const H = FLAME_HEIGHT * 1.08;

const Layer = ({ refObj, height, radius, color, opacity }) => (
  <group ref={refObj}>
    <mesh position={[0, height / 2, 0]}>
      <coneGeometry args={[radius, height, 20, 1, true]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  </group>
);

const Flame = ({ temperature = 1, paused = false, position = [0, 0, 0] }) => {
  const outer = useRef(null);
  const inner = useRef(null);
  const core = useRef(null);
  const glow = useRef(null);
  const light = useRef(null);

  useFrame((state) => {
    if (paused) return;
    const t = state.clock.elapsedTime;
    const grow = 0.8 + temperature * 0.25; // shorter when first lit, full when hot
    const flick = 1 + 0.1 * Math.sin(t * 18) + 0.05 * Math.sin(t * 31 + 1.1);
    const sway = 0.025 * Math.sin(t * 6); // tiny, stays upright
    if (outer.current) {
      outer.current.scale.set(1, grow * flick, 1);
      outer.current.rotation.z = sway;
    }
    if (inner.current) inner.current.scale.set(1, grow * (0.95 + 0.1 * Math.sin(t * 24)), 1);
    if (core.current) core.current.scale.set(1, grow, 1);
    if (glow.current) glow.current.scale.setScalar(0.9 + 0.1 * Math.sin(t * 20));
    if (light.current)
      light.current.intensity = (1.6 + temperature * 2.4) * (0.9 + 0.12 * Math.sin(t * 28));
  });

  return (
    <group position={position}>
      <pointLight ref={light} color="#ff9b45" distance={3.2} decay={2} position={[0, H * 0.5, 0]} />

      {/* Hot glowing root sitting on the wick */}
      <mesh ref={glow} position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.12, 16, 14]} />
        <meshBasicMaterial
          color="#ffd66a"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Layer refObj={outer} height={H} radius={0.15} color="#ff5a14" opacity={0.45} />
      <Layer refObj={inner} height={H * 0.78} radius={0.095} color="#ffc24a" opacity={0.78} />
      <Layer refObj={core} height={H * 0.5} radius={0.05} color="#bfe0ff" opacity={0.7} />
    </group>
  );
};

export default Flame;
