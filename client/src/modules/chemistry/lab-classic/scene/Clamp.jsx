// Zaxvat - a horizontal arm from the rod ending in a ring that grips the test
// tube's neck. The ring's inner radius sits just at the tube wall so the tube
// visibly rests IN the clamp. Rubber pads (dark) cushion the grip.
import * as THREE from "three";
import { CLAMP_Y, ROD_X, TUBE_OUTER_R } from "./labGeometry";

const STEEL = { color: "#aeb6bf", metalness: 0.9, roughness: 0.35 };
const RUBBER = { color: "#2b2f36", metalness: 0.1, roughness: 0.9 };

const Clamp = () => {
  const armCenter = (ROD_X + 0) / 2; // between the rod and the tube
  const armLength = Math.abs(ROD_X) - 0.02;

  return (
    <group position={[0, CLAMP_Y, 0]}>
      {/* Knuckle clamped onto the rod */}
      <mesh position={[ROD_X, 0, 0]}>
        <boxGeometry args={[0.17, 0.2, 0.17]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {/* Thumb screw on the knuckle */}
      <mesh position={[ROD_X, 0, 0.13]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.12, 16]} />
        <meshStandardMaterial color="#6b7077" metalness={0.8} roughness={0.4} />
      </mesh>

      {/* Horizontal arm */}
      <mesh position={[armCenter, 0, 0]}>
        <boxGeometry args={[armLength, 0.07, 0.08]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>

      {/* Ring that grips the tube neck (lies flat in the XZ plane) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TUBE_OUTER_R + 0.05, 0.035, 16, 48]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {/* Two rubber grip pads pressing onto the tube */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (TUBE_OUTER_R + 0.02), 0, 0]}>
          <boxGeometry args={[0.05, 0.06, 0.12]} />
          <meshStandardMaterial {...RUBBER} />
        </mesh>
      ))}
    </group>
  );
};

export default Clamp;
