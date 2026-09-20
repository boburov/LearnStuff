// Pufakchalar - bubbles rising through the liquid while heating. A single
// InstancedMesh (one draw call) holds every bubble; each rises on its own phase
// from the liquid floor to the surface, growing then shrinking. Inactive or
// paused → all instances collapse to zero scale (invisible, no extra cost).
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TUBE_BASE_Y, TUBE_INNER_R, TUBE_LIQUID_MAX } from "./labGeometry";

const COUNT = 16;

const Bubbles = ({ active, fill, temperature = 0, paused = false }) => {
  const ref = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: Math.cos(i * 2.39) * TUBE_INNER_R * 0.55,
        z: Math.sin(i * 1.71) * TUBE_INNER_R * 0.55,
        phase: i / COUNT,
        speed: 0.35 + 0.06 * (i % 4),
        r: 0.013 + 0.009 * (i % 3),
      })),
    [],
  );

  // Start collapsed so nothing flashes before the first frame runs.
  useLayoutEffect(() => {
    if (!ref.current) return;
    for (let i = 0; i < COUNT; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.setScalar(0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useFrame((state) => {
    if (paused || !ref.current) return;
    const top = Math.max(0.05, fill * TUBE_LIQUID_MAX);
    const t = state.clock.elapsedTime;
    const rate = 0.5 + temperature * 1.9;
    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      const prog = (t * s.speed * rate + s.phase) % 1;
      const grow = Math.sin(prog * Math.PI); // 0 at floor/surface, 1 mid-rise
      dummy.position.set(s.x, prog * top, s.z);
      dummy.scale.setScalar(active ? s.r * (0.4 + 0.6 * grow) : 0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, TUBE_BASE_Y, 0]}>
      <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={0.15} />
      </instancedMesh>
    </group>
  );
};

export default Bubbles;
