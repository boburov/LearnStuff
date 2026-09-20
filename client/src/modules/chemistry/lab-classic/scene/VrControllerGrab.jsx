// Haqiqiy 6DoF qo'l (Quest kabi shlemlar) bilan shishani olib egib quyish.
// Cardboard'da qo'l tracking yo'q - u yerda gaze tizimi (useGazeGrab) ishlaydi;
// bu komponent faqat haqiqiy immersiv sessiyada (inVR) render qilinadi.
//
// Ishlashi: shishani controller nuri bilan bosib (bottle onClick -> onGrab)
// olamiz -> shisha o'ng controller'ga "yopishadi" va u bilan harakatlanadi ->
// controller'ni probirka ustiga olib borib trigger'ni bossangiz (yoki bottle
// ustidan boshqa joyni bossangiz) quyiladi. Quyish: shisha probirka og'ziga
// yaqin bo'lsa egiladi va onPour ishga tushadi.
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";
import { TUBE_X, TUBE_MOUTH_Y } from "./labGeometry";

const POUR_DIST = 1.1; // shisha probirka og'ziga shu masofada bo'lsa quyiladi
const _handPos = new THREE.Vector3();
const _tubeMouth = new THREE.Vector3(TUBE_X, TUBE_MOUTH_Y, 0);

// Ushlangan shishaning ko'rinishi (LabControls3D dagi bilan bir xil uslub).
const HeldBottle = ({ color, pouring }) => {
  const grp = useRef(null);
  const tilt = useRef(0);
  useFrame((_, delta) => {
    if (!grp.current) return;
    tilt.current = THREE.MathUtils.lerp(tilt.current, pouring ? 1 : 0, Math.min(1, delta * 10));
    grp.current.rotation.z = tilt.current * -2.1; // og'zi pastga
  });
  return (
    <group ref={grp}>
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.42, 24]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.2} roughness={0.1} transmission={0.6} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.24, 24]} />
        <meshStandardMaterial color={color} roughness={0.35} emissive={color} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
        <meshStandardMaterial color="#3b4252" roughness={0.6} />
      </mesh>
    </group>
  );
};

// held: {reagent} | null (LabScene'dan). onPour(reagent), onDrop() - grab holatini
// LabScene boshqaradi; bu komponent controller pozitsiyasi + trigger'ni o'qiydi.
const VrControllerGrab = ({ enabled, held, onPour, onDrop }) => {
  // O'ng qo'l birlamchi; bo'lmasa chapga tushamiz.
  const right = useXRInputSourceState("controller", "right");
  const left = useXRInputSourceState("controller", "left");
  const controller = right ?? left;
  const attach = useRef(null);
  const [pouring, setPouring] = useState(false);
  const prevSelect = useRef(false);

  useFrame(() => {
    if (!enabled || !controller?.object || !attach.current) return;

    // Shishani controller pozitsiyasi/burchagiga bog'laymiz.
    controller.object.getWorldPosition(_handPos);
    attach.current.position.copy(_handPos);
    attach.current.quaternion.copy(controller.object.quaternion);

    // Probirka og'ziga yaqinlashsa - quyish holati.
    const near = held && _handPos.distanceTo(_tubeMouth) < POUR_DIST;
    setPouring(!!near);

    // Trigger (select) qirrasi: bosilganda, agar probirka ustida bo'lsa quyamiz,
    // aks holda shishani qo'yib yuboramiz (javonga qaytaradi). Trigger holati:
    // { state: 'default'|'touched'|'pressed', button: 0..1 }.
    const trig = controller.gamepad?.["xr-standard-trigger"];
    const select = trig?.state === "pressed" || (trig?.button ?? 0) > 0.6;
    if (held && select && !prevSelect.current) {
      if (near) onPour?.(held.reagent);
      else onDrop?.();
    }
    prevSelect.current = select;
  });

  if (!enabled || !held) return null;

  return (
    <group ref={attach}>
      <HeldBottle color={held.reagent.color} pouring={pouring} />
    </group>
  );
};

export default VrControllerGrab;
