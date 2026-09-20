// VR teleport: laboratoriya polini teleport nishoniga aylantiradi. Foydalanuvchi
// controller nurini polga qaratib bosganda (yoki Cardboard'da gaze + tap) shu
// nuqtaga "sakraydi" - XROrigin guruhi (originRef) o'sha joyga suriladi.
// TeleportTarget @react-three/xr default ray pointer bilan ishlaydi.
import { useCallback } from "react";
import { TeleportTarget } from "@react-three/xr";
import * as THREE from "three";

const BOUND = 12; // laboratoriyadan chiqib ketmaslik uchun chegara

const VrTeleport = ({ enabled, originRef }) => {
  const onTeleport = useCallback(
    (point) => {
      const origin = originRef.current;
      if (!origin) return;
      // Foydalanuvchining oyog'i teleport nuqtasiga tushadi. XROrigin pozitsiyasini
      // to'g'ridan-to'g'ri nuqtaga qo'yamiz (Y=0 polda), chegara ichida ushlaymiz.
      const x = THREE.MathUtils.clamp(point.x, -BOUND, BOUND);
      const z = THREE.MathUtils.clamp(point.z, -BOUND, BOUND);
      origin.position.set(x, 0, z);
    },
    [originRef],
  );

  if (!enabled) return null;

  return (
    <TeleportTarget onTeleport={onTeleport}>
      {/* Ko'rinmas keng pol - nur shunga tegib teleport bo'ladi. Biroz sezilarli
          qilib qo'yamiz (juda past opacity) - foydalanuvchi qayerga sakrashini biladi. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 2]}>
        <planeGeometry args={[24, 24]} />
        <meshStandardMaterial
          color="#0e1626"
          transparent
          opacity={0.35}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </TeleportTarget>
  );
};

export default VrTeleport;
