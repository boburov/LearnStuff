// Gaze'ga ergashadigan BITTA virtual qo'l (Cardboard'da qo'l tracking yo'q, shuning
// uchun ikkita qo'l o'rniga bittasi gaze nuriga yopishib yuradi). Bo'sh bo'lsa
// ochiq kaft; shisha ushlaganda shishani ko'taradi; probirkaga quyayotganda bilak
// egilib shisha og'zi pastga qaraydi. Primitivlardan yasalgan - mobil GPU uchun yengil.
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
const SKIN = "#e8b48c";

// Ushlangan shishaning kichraytirilgan nusxasi - qo'l ichida ko'rinadi.
const MiniBottle = ({ color }) => (
  <group>
    <mesh>
      <cylinderGeometry args={[0.12, 0.12, 0.34, 20]} />
      <meshPhysicalMaterial
        color="#ffffff"
        transparent
        opacity={0.2}
        roughness={0.1}
        transmission={0.6}
      />
    </mesh>
    <mesh position={[0, -0.05, 0]}>
      <cylinderGeometry args={[0.09, 0.09, 0.2, 20]} />
      <meshStandardMaterial color={color} roughness={0.35} emissive={color} emissiveIntensity={0.2} />
    </mesh>
    <mesh position={[0, 0.21, 0]}>
      <cylinderGeometry args={[0.075, 0.075, 0.07, 20]} />
      <meshStandardMaterial color="#3b4252" roughness={0.6} />
    </mesh>
  </group>
);

// Soddalashtirilgan kaft + 4 barmoq + bosh barmoq.
const Palm = ({ closed }) => (
  <group>
    {/* kaft */}
    <mesh>
      <boxGeometry args={[0.26, 0.08, 0.3]} />
      <meshStandardMaterial color={SKIN} roughness={0.8} />
    </mesh>
    {/* barmoqlar - ushlaganda ichkariga bukiladi */}
    {[-0.09, -0.03, 0.03, 0.09].map((x, i) => (
      <mesh
        key={i}
        position={[x, closed ? 0.02 : 0.0, closed ? 0.12 : 0.2]}
        rotation={[closed ? -1.1 : -0.2, 0, 0]}
      >
        <boxGeometry args={[0.045, 0.045, 0.16]} />
        <meshStandardMaterial color={SKIN} roughness={0.8} />
      </mesh>
    ))}
    {/* bosh barmoq */}
    <mesh position={[-0.15, 0.0, 0.02]} rotation={[0, 0, closed ? 0.9 : 0.4]}>
      <boxGeometry args={[0.05, 0.05, 0.14]} />
      <meshStandardMaterial color={SKIN} roughness={0.8} />
    </mesh>
  </group>
);

// held: {reagent} yoki null. pouring: quyish animatsiyasi faol (bilak egiladi).
const VrHand = ({ enabled, held, pouring = false }) => {
  const camera = useThree((s) => s.camera);
  const root = useRef(null);
  const wrist = useRef(null);
  const tilt = useRef(0); // quyish burchagi (0..1)

  useFrame((_, delta) => {
    if (!enabled || !root.current) return;
    const k = Math.min(1, delta * 10);

    // Qo'l gaze oldida, ko'rish maydonining pastki qismida turadi (o'z qo'lingizdek
    // pastdan ko'tarilib turgandek). Kamera-space'da joylashtiramiz: oldinga,
    // pastga va biroz o'ngga - so'ng kamera yo'nalishiga qaratamiz.
    root.current.quaternion.copy(camera.quaternion);
    root.current.position.copy(camera.position);
    root.current.translateX(0.34); // biroz o'ngda
    root.current.translateY(-0.5); // ko'rish maydoni pastida
    root.current.translateZ(-1.7); // oldinda (juda yaqin bo'lmasin)

    // Quyish: bilakni probirka og'ziga qaratib egamiz (tilt 0->1).
    const wantTilt = pouring ? 1 : 0;
    tilt.current = THREE.MathUtils.lerp(tilt.current, wantTilt, k);
    if (wrist.current) {
      wrist.current.rotation.z = tilt.current * -2.0; // shisha og'zi pastga
    }
  });

  if (!enabled) return null;

  return (
    <group ref={root} renderOrder={998} scale={0.8}>
      {/* kaft biroz yuqoriga qaraydi (kameraga ochilgan holda) */}
      <group ref={wrist} rotation={[-0.5, 0, 0]}>
        {/* bilak */}
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.24, 16]} />
          <meshStandardMaterial color={SKIN} roughness={0.8} />
        </mesh>
        <Palm closed={!!held} />
        {held && (
          <group position={[0, 0.16, 0.06]} rotation={[0.3, 0, 0]}>
            <MiniBottle color={held.reagent.color} />
          </group>
        )}
      </group>
    </group>
  );
};

export default VrHand;
