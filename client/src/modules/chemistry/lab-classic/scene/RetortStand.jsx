// Shtativ - a heavy flat metal base with a single vertical steel rod. Brushed
// metal: high metalness, mid roughness so it reads as steel, not chrome.
import { RoundedBox } from "@react-three/drei";
import { ROD_X } from "./labGeometry";

const STEEL = { color: "#aeb6bf", metalness: 0.9, roughness: 0.35 };

const RetortStand = () => (
  <group>
    {/* Heavy base */}
    <RoundedBox args={[1.95, 0.13, 1.25]} radius={0.05} smoothness={4} position={[-0.35, 0.065, 0]}>
      <meshStandardMaterial {...STEEL} color="#9aa2ab" />
    </RoundedBox>

    {/* Vertical rod */}
    <mesh position={[ROD_X, 1.9, 0]}>
      <cylinderGeometry args={[0.045, 0.05, 3.6, 24]} />
      <meshStandardMaterial {...STEEL} />
    </mesh>
    {/* Rod cap */}
    <mesh position={[ROD_X, 3.7, 0]}>
      <sphereGeometry args={[0.055, 20, 20]} />
      <meshStandardMaterial {...STEEL} />
    </mesh>
  </group>
);

export default RetortStand;
