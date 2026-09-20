// Havoda suzuvchi 3D boshqaruv paneli (faqat haqiqiy shlem - Quest). Isitish va
// Tozalash tugmalari foydalanuvchining chap tomonida, ko'krak balandligida turadi.
// Controller nuri (yoki gaze) bilan bosiladi - R3F onClick @react-three/xr default
// ray pointer bilan ishlaydi. Davriy jadval DOM modal bo'lgani uchun VR ichida
// ko'rsatilmaydi; uning o'rniga panelda faqat sahna ichidan boshqarib bo'ladigan
// amallar (isitish/tozalash) beriladi.
import { useRef, useState } from "react";
import { Text, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const HEAT_ON = new THREE.Color("#f97316");
const HEAT_IDLE = new THREE.Color("#1e293b");

// Bitta 3D tugma: bosilganda bir oz botadi, hover'da yorishadi.
const PanelButton = ({ y, label, color, activeColor, active, onClick, icon }) => {
  const [hover, setHover] = useState(false);
  const cap = useRef(null);
  const mat = useRef(null);

  useFrame((_, delta) => {
    const k = Math.min(1, delta * 14);
    if (cap.current)
      cap.current.position.z = THREE.MathUtils.lerp(cap.current.position.z, hover ? 0.02 : 0, k);
    if (mat.current && activeColor) {
      mat.current.color.lerp(active ? HEAT_ON : HEAT_IDLE, k);
      mat.current.emissive.lerp(active ? HEAT_ON : new THREE.Color("#0b1220"), k);
      mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, active ? 0.5 : 0.12, k);
    }
  });

  return (
    <group
      position={[0, y, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <group ref={cap}>
        <RoundedBox args={[0.7, 0.28, 0.09]} radius={0.05} smoothness={4}>
          <meshStandardMaterial
            ref={mat}
            color={color}
            roughness={0.4}
            metalness={0.1}
            emissive="#0b1220"
            emissiveIntensity={hover ? 0.35 : 0.12}
          />
        </RoundedBox>
        <Text
          position={[0, 0, 0.055]}
          fontSize={0.11}
          color="#e6eefc"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.62}
          textAlign="center"
          outlineWidth={0.004}
          outlineColor="#0b1220"
        >
          {icon ? `${icon} ${label}` : label}
        </Text>
      </group>
    </group>
  );
};

const VrPanel3D = ({ enabled, heating, onToggleHeat, onClear }) => {
  if (!enabled) return null;
  // Panel foydalanuvchining chap-oldida, ko'krak balandligida, biroz ichkariga
  // burilgan (o'ng tomonga qaragan) - qo'l bilan qulay yetadigan joyda.
  return (
    <group position={[-1.6, 1.35, 3.4]} rotation={[0, 0.5, 0]}>
      {/* orqa taxta */}
      <RoundedBox args={[0.9, 0.86, 0.05]} radius={0.06} smoothness={4} position={[0, 0, -0.06]}>
        <meshStandardMaterial color="#0f1a2e" roughness={0.7} metalness={0.2} transparent opacity={0.92} />
      </RoundedBox>
      <Text position={[0, 0.32, 0.0]} fontSize={0.09} color="#93c5fd" anchorX="center" anchorY="middle">
        Boshqaruv
      </Text>
      <PanelButton
        y={0.09}
        label={heating ? "O'chirish" : "Isitish"}
        icon="🔥"
        color="#1e293b"
        activeColor
        active={heating}
        onClick={onToggleHeat}
      />
      <PanelButton
        y={-0.24}
        label="Tozalash"
        icon="🧹"
        color="#0d9488"
        onClick={onClear}
      />
    </group>
  );
};

export default VrPanel3D;
