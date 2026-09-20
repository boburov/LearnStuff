// Isitkich - an alcohol burner (spirtovka) directly under the tube: a brass
// reservoir, a tapered shoulder, a steel collar and a wick. The flame itself is
// a separate <Flame/> composed above it in the scene.
import { BURNER_Y, TUBE_X } from "./labGeometry";

const BRASS = { color: "#c9a24a", metalness: 0.85, roughness: 0.4 };
const STEEL = { color: "#9aa1a9", metalness: 0.9, roughness: 0.35 };

const Burner = () => (
  <group position={[TUBE_X, BURNER_Y, 0]}>
    {/* Reservoir body */}
    <mesh position={[0, 0.17, 0]}>
      <cylinderGeometry args={[0.27, 0.29, 0.34, 40]} />
      <meshStandardMaterial {...BRASS} />
    </mesh>
    {/* Tapered shoulder */}
    <mesh position={[0, 0.4, 0]}>
      <cylinderGeometry args={[0.12, 0.27, 0.12, 40]} />
      <meshStandardMaterial {...BRASS} />
    </mesh>
    {/* Steel collar */}
    <mesh position={[0, 0.49, 0]}>
      <cylinderGeometry args={[0.1, 0.1, 0.08, 32]} />
      <meshStandardMaterial {...STEEL} />
    </mesh>
    {/* Wick */}
    <mesh position={[0, 0.55, 0]}>
      <cylinderGeometry args={[0.03, 0.035, 0.07, 16]} />
      <meshStandardMaterial color="#3a2a1f" roughness={0.9} />
    </mesh>
  </group>
);

export default Burner;
