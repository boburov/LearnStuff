// Bug' - a few faint puffs drifting up from the tube mouth while heating, each
// growing and fading as it rises. Soft transparent spheres (additive-free so
// they read as pale vapour, not glow). Each keeps its own material so they can
// fade independently.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { TUBE_MOUTH_Y, TUBE_X } from "./labGeometry";

const COUNT = 6;
const RISE = 1.3;

const Steam = ({ active, temperature = 0, paused = false }) => {
  const meshes = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: (Math.cos(i * 1.9) * 0.08),
        z: (Math.sin(i * 1.3) * 0.08),
        phase: i / COUNT,
        speed: 0.18 + 0.03 * (i % 3),
      })),
    [],
  );

  useFrame((state) => {
    if (paused) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      const m = meshes.current[i];
      if (!m) continue;
      const s = seeds[i];
      const prog = (t * s.speed + s.phase) % 1;
      m.position.set(s.x, prog * RISE, s.z);
      const scale = 0.12 + prog * 0.4;
      m.scale.setScalar(scale);
      const op = active ? 0.22 * (1 - prog) * Math.min(1, temperature * 1.4) : 0;
      m.material.opacity = op;
      m.visible = op > 0.01;
    }
  });

  return (
    <group position={[TUBE_X, TUBE_MOUTH_Y, 0]}>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(m) => (meshes.current[i] = m)}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshStandardMaterial color="#eef3f8" transparent opacity={0} depthWrite={false} roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

export default Steam;
