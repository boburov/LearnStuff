// VR gaze reticle: ekran markazida turadigan halqa - foydalanuvchi nimaga
// "qarayotganini" bildiradi. Har kadr kamera oldiga qayta joylashtiriladi
// (StereoEffect ikkala ko'zga chizadi). Holatga qarab rang: bo'sh=oq, nishonda=ko'k,
// probirkaga quyishga tayyor=yashil. Ichki dwell halqasi qarab turish progressini
// ko'rsatadi (0->to'liq aylana). depthTest o'chirilgan - model ustida turadi.
import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const IDLE = "#93c5fd";
const HIT = "#22d3ee";
const POUR = "#4ade80";

const GazeReticleHit = ({ active, pouring, holding, dwell = 0 }) => {
  const ref = useRef();
  const dwellRef = useRef();
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.position.copy(camera.position);
    ref.current.quaternion.copy(camera.quaternion);
    ref.current.translateZ(-2);
  });

  const color = pouring ? POUR : active ? HIT : IDLE;
  // Dwell progress halqasi: 0..1 -> yoy burchagi. Kichik bir siljish bilan
  // to'liq aylanani ko'rsatadi (thetaLength = 2π·dwell).
  const dwellGeom = useMemo(() => [0.045, 0.06, 24, 1, 0, Math.PI * 2 * dwell], [dwell]);

  return (
    <group ref={ref} renderOrder={999}>
      {/* asosiy halqa */}
      <mesh>
        <ringGeometry args={[0.02, 0.033, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={active ? 0.95 : 0.7}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      {/* markaziy nuqta */}
      <mesh>
        <circleGeometry args={[0.008, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} depthTest={false} depthWrite={false} />
      </mesh>
      {/* dwell progressi (qarab turish) - tashqi yoy */}
      {dwell > 0.02 && (
        <mesh ref={dwellRef} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={dwellGeom} />
          <meshBasicMaterial
            color={holding ? POUR : HIT}
            transparent
            opacity={0.95}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

export default GazeReticleHit;
