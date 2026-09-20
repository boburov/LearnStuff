// Bohr-style atom: glowing nucleus + electrons orbiting on tilted shells.
import { useRef } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { usePausableFrame } from "@/shared/lab/usePausableFrame";

const ORBIT_GAP = 1.1;
const BASE_RADIUS = 1.2;

const orbitPoints = (radius, segments = 64) => {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return pts;
};

const Electron = ({ radius, speed, offset }) => {
  const ref = useRef();
  usePausableFrame((state) => {
    const t = state.clock.elapsedTime * speed + offset;
    if (ref.current) {
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        color="#38bdf8"
        emissive="#0ea5e9"
        emissiveIntensity={0.8}
      />
    </mesh>
  );
};

const Shell = ({ index, count }) => {
  const radius = BASE_RADIUS + index * ORBIT_GAP;
  const tilt = (index * Math.PI) / 5;
  const speed = 1.4 - index * 0.25;
  return (
    <group rotation={[tilt, 0, tilt / 2]}>
      <Line points={orbitPoints(radius)} color="#64748b" lineWidth={1} />
      {Array.from({ length: count }).map((_, i) => (
        <Electron
          key={i}
          radius={radius}
          speed={speed}
          offset={(i / count) * Math.PI * 2}
        />
      ))}
    </group>
  );
};

const AtomModel = ({ atom }) => (
  <group>
    <mesh>
      <sphereGeometry args={[0.7, 32, 32]} />
      <meshStandardMaterial
        color={atom.color}
        emissive={atom.color}
        emissiveIntensity={0.45}
        roughness={0.4}
      />
    </mesh>
    {atom.shells.map((count, i) => (
      <Shell key={i} index={i} count={count} />
    ))}
  </group>
);

export default AtomModel;
