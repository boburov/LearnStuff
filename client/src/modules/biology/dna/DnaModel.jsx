// Rotating DNA double helix: two phosphate backbones + colored base-pair rungs.
import { useMemo, useRef } from "react";
import { usePausableFrame } from "@/shared/lab/usePausableFrame";

const RUNGS = 22;
const RADIUS = 1.1;
const HEIGHT = 6;
const TURNS = 2.4;
const BASE_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"];

const DnaModel = () => {
  const group = useRef();
  usePausableFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.5;
  });

  const rungs = useMemo(() => {
    const arr = [];
    for (let i = 0; i < RUNGS; i++) {
      const t = i / (RUNGS - 1);
      const angle = t * Math.PI * 2 * TURNS;
      const y = (t - 0.5) * HEIGHT;
      const x = Math.cos(angle) * RADIUS;
      const z = Math.sin(angle) * RADIUS;
      arr.push({ y, a: [x, y, z], b: [-x, y, -z], color: BASE_COLORS[i % 4] });
    }
    return arr;
  }, []);

  return (
    <group ref={group}>
      {rungs.map((r, i) => (
        <group key={i}>
          {/* backbone nodes */}
          <mesh position={r.a}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#64748b" roughness={0.4} />
          </mesh>
          <mesh position={r.b}>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#64748b" roughness={0.4} />
          </mesh>
          {/* base-pair rung */}
          <mesh position={[0, r.y, 0]} rotation={[0, -Math.atan2(r.a[2], r.a[0]), Math.PI / 2]}>
            <cylinderGeometry args={[0.07, 0.07, RADIUS * 2, 10]} />
            <meshStandardMaterial
              color={r.color}
              emissive={r.color}
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

export default DnaModel;
