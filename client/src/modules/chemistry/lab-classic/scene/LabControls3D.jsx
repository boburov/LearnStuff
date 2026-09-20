// Sahna ichidagi 3D boshqaruv paneli - VR kontrolleri nuri bilan (yoki desktopda
// sichqoncha bilan) bosib ishlatiladi. Reaktiv shishalarini idishga quyish,
// isitish (tortma richag) va tozalash (yuqoriga qaragan cho'tkali tugma) shu
// yerdan boshqariladi. Har shishaning nomi yuzasiga oq qog'oz yorliqqa yozilgan.
// Pointer (onClick) hodisalari @react-three/xr da kontroller "select" bilan ishlaydi.
import { useEffect, useRef, useState } from "react";
import { Text, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SHELF_Z = 2.2;
const ROW_Y = 1.0;
const STEP = 0.5;
const BOTTLE_R = 0.24; // gaze nishoni radiusi (ko'rish oson bo'lsin uchun kengroq)

// Lerp maqsadlari - har kadrda yangi Color yaratmaslik uchun modul darajasida.
const HEAT_ON = new THREE.Color("#f97316");
const HEAT_OFF = new THREE.Color("#475569");
const GLOW_OFF = new THREE.Color("#0b1220");

const Label = ({ children, y = -0.36, size = 0.1, color = "#e6eefc" }) => (
  <Text
    position={[0, y, 0.02]}
    fontSize={size}
    color={color}
    anchorX="center"
    anchorY="top"
    maxWidth={0.62}
    textAlign="center"
    outlineWidth={0.004}
    outlineColor="#0b1220"
  >
    {children}
  </Text>
);

// Shisha yuzasiga yopishtirilgan oq qog'oz yorliq - ustida reaktiv nomi qora
// siyohda yozilgan. Uzun nomlar bir necha qatorga bo'linib joylashadi.
const PaperLabel = ({ name }) => (
  <group position={[0, -0.02, 0.156]}>
    {/* oq qog'oz */}
    <mesh>
      <boxGeometry args={[0.28, 0.26, 0.006]} />
      <meshStandardMaterial color="#f7f5ee" roughness={0.92} metalness={0} />
    </mesh>
    {/* nom */}
    <Text
      position={[0, 0, 0.007]}
      fontSize={0.046}
      color="#1f2937"
      anchorX="center"
      anchorY="middle"
      maxWidth={0.25}
      textAlign="center"
      lineHeight={1.05}
      overflowWrap="break-word"
    >
      {name}
    </Text>
  </group>
);

// Bitta reaktiv shishasi. Uch xil rejim, bittasi bosilganda:
//  - Desktop: idishga quyiladi (onPour).
//  - Cardboard/vrBox: gaze bilan olinadi (gazeApi orqali, onClick emas).
//  - Haqiqiy shlem (Quest): controller nuri bilan bosish = olish (onGrab), keyin
//    controller bilan probirkaga olib borib quyiladi.
// gazeHover/gazeHidden gaze tizimidan; grabbed = Quest'da ushlangan (yashiriladi).
const Bottle = ({ reagent, x, onPour, onGrab, grabbed, gazeApi, gazeHover, gazeHidden }) => {
  const [hover, setHover] = useState(false);

  // Gaze target'i sifatida ro'yxatdan o'tish (dunyo koordinatalari statik).
  useEffect(() => {
    if (!gazeApi) return;
    return gazeApi.registerTarget(`bottle:${reagent.id}`, {
      kind: "bottle",
      reagent,
      position: new THREE.Vector3(x, ROW_Y, SHELF_Z),
      radius: BOTTLE_R,
    });
  }, [gazeApi, reagent, x]);

  if (gazeHidden || grabbed) return null; // ko'tarilgan - javonda ko'rinmaydi

  const lit = hover || gazeHover;
  return (
    <group
      position={[x, ROW_Y, SHELF_Z]}
      scale={lit ? 1.12 : 1}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        // Quest'da bosish = olish; aks holda to'g'ridan-to'g'ri quyish.
        if (onGrab) onGrab(reagent);
        else onPour?.(reagent);
      }}
    >
      {/* shisha */}
      <mesh>
        <cylinderGeometry args={[0.16, 0.16, 0.42, 24]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.18}
          roughness={0.1}
          transmission={0.6}
        />
      </mesh>
      {/* suyuqlik */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.24, 24]} />
        <meshStandardMaterial
          color={reagent.color}
          roughness={0.35}
          emissive={reagent.color}
          emissiveIntensity={lit ? 0.4 : 0.12}
        />
      </mesh>
      {/* tiqin */}
      <mesh position={[0, 0.26, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
        <meshStandardMaterial color="#3b4252" roughness={0.6} />
      </mesh>
      <PaperLabel name={reagent.name} />
    </group>
  );
};

// Isitishni yoqib/o'chiradigan tortma richag: tutqichidan tortib ko'tarilganda
// yoniq holatga (oldinga, to'q sariq) o'tadi, pastga surilganda o'chadi; asos
// plitasi kulrangdan to'q sariqqa o'zgarib yonib turadi.
const HeatSwitch = ({ x, on, onToggle }) => {
  const [hover, setHover] = useState(false);
  const lever = useRef(null);
  const base = useRef(null);

  useFrame((_, delta) => {
    const k = Math.min(1, delta * 12);
    // Richag yoqilganda oldinga (kuzatuvchi tomon) tortiladi, o'chiqda orqaga.
    if (lever.current)
      lever.current.rotation.x = THREE.MathUtils.lerp(
        lever.current.rotation.x,
        on ? 0.7 : -0.55,
        k,
      );
    if (base.current) {
      base.current.color.lerp(on ? HEAT_ON : HEAT_OFF, k);
      base.current.emissive.lerp(on ? HEAT_ON : GLOW_OFF, k);
      base.current.emissiveIntensity = THREE.MathUtils.lerp(
        base.current.emissiveIntensity,
        on ? 0.6 : 0.05,
        k,
      );
    }
  });

  return (
    <group
      position={[x, ROW_Y, SHELF_Z]}
      scale={hover ? 1.08 : 1}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
    >
      {/* asos plitasi (kalit korpusi) */}
      <RoundedBox args={[0.34, 0.12, 0.42]} radius={0.05} smoothness={4} position={[0, -0.17, 0]}>
        <meshStandardMaterial ref={base} color="#475569" roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {/* sharnir bolti - richag shu o'q atrofida aylanadi */}
      <mesh position={[0, -0.12, 0.13]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.18, 16]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.7} />
      </mesh>
      {/* richag: dasta + tutqich */}
      <group ref={lever} position={[0, -0.12, 0.13]} rotation={[on ? 0.7 : -0.55, 0, 0]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.035, 0.045, 0.36, 16]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <sphereGeometry args={[0.078, 24, 24]} />
          <meshStandardMaterial
            color={on ? "#f97316" : "#ef4444"}
            roughness={0.25}
            metalness={0.1}
            emissive={on ? "#f97316" : "#7f1d1d"}
            emissiveIntensity={on ? 0.5 : 0.15}
          />
        </mesh>
      </group>
      <Label y={-0.36}>Isitish</Label>
    </group>
  );
};

// Cho'tka (supurgi) iconi - primitivlardan: qiya dasta + pastga yoyilgan tola.
const Broom = (props) => (
  <group rotation={[0, 0, 0.5]} {...props}>
    {/* dasta */}
    <mesh position={[0, 0.075, 0]}>
      <cylinderGeometry args={[0.012, 0.012, 0.2, 12]} />
      <meshStandardMaterial color="#c98a3c" roughness={0.6} />
    </mesh>
    {/* bog'lam */}
    <mesh position={[0, -0.03, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 0.03, 12]} />
      <meshStandardMaterial color="#8a5a2b" roughness={0.7} />
    </mesh>
    {/* tola (bristles) */}
    <mesh position={[0, -0.1, 0]} scale={[1, 1, 0.6]}>
      <coneGeometry args={[0.075, 0.12, 16, 1, true]} />
      <meshStandardMaterial color="#f0c869" roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// Tozalash tugmasi: yuqoriga qaragan, bosilganda pastga botadigan 3D tugma,
// ustida supurgi. Korpus + qopqoq X o'qi bo'ylab ag'darilib tepaga qaratilgan.
const CleanButton = ({ x, onClick }) => {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const cap = useRef(null);

  useFrame((_, delta) => {
    if (!cap.current) return;
    const target = pressed ? -0.06 : 0;
    cap.current.position.z = THREE.MathUtils.lerp(cap.current.position.z, target, Math.min(1, delta * 18));
  });

  return (
    <group
      position={[x, ROW_Y, SHELF_Z]}
      scale={hover ? 1.08 : 1}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => {
        setHover(false);
        setPressed(false);
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        setPressed(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        setPressed(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* tepaga qaratish uchun korpus+qopqoq -90° X o'qi bo'ylab ag'dariladi:
          mahalliy +Z dunyo +Y ga (yuqoriga) aylanadi, bosish esa pastga ketadi. */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        {/* uy (housing) */}
        <RoundedBox args={[0.42, 0.42, 0.14]} radius={0.07} smoothness={4} position={[0, 0, -0.05]}>
          <meshStandardMaterial color="#16202f" roughness={0.7} metalness={0.2} />
        </RoundedBox>
        {/* bosiladigan qopqoq + supurgi */}
        <group ref={cap} position={[0, 0, 0.08]}>
          <RoundedBox args={[0.34, 0.34, 0.12]} radius={0.06} smoothness={4}>
            <meshStandardMaterial
              color={hover ? "#14b8a6" : "#0d9488"}
              roughness={0.4}
              metalness={0.1}
              emissive="#0f766e"
              emissiveIntensity={hover ? 0.4 : 0.15}
            />
          </RoundedBox>
          <Broom position={[0, 0, 0.09]} scale={0.85} />
        </group>
      </group>
      <Label y={-0.36}>Tozalash</Label>
    </group>
  );
};

const LabControls3D = ({
  reagents = [],
  onPour,
  heating,
  onToggleHeat,
  onClear,
  gazeApi, // VR gaze tizimi (ixtiyoriy); yo'q bo'lsa desktop click ishlaydi
  onGrab, // Quest'da shishani olish (berilsa onClick=grab, aks holda pour)
  heldReagentId, // Quest'da ushlangan shisha id'si (javondan yashiriladi)
}) => {
  const n = reagents.length;
  // Bottles are centred. With many of them, tighten the gap so the row stays
  // within ±1.7 and never collides with the heat switch (-2.0) / clean (+2.0).
  const step = n > 1 ? Math.min(STEP, 3.4 / (n - 1)) : STEP;
  return (
    <group>
      {/* javon taxtasi */}
      <mesh position={[0, ROW_Y - 0.26, SHELF_Z]}>
        <boxGeometry args={[4.4, 0.08, 0.6]} />
        <meshStandardMaterial color="#1b2436" roughness={0.7} metalness={0.2} />
      </mesh>

      {reagents.map((r, i) => (
        <Bottle
          key={r.id}
          reagent={r}
          x={(i - (n - 1) / 2) * step}
          onPour={onPour}
          onGrab={onGrab}
          grabbed={heldReagentId === r.id}
          gazeApi={gazeApi}
          gazeHover={gazeApi?.hoverId === `bottle:${r.id}`}
          gazeHidden={gazeApi?.held?.id === `bottle:${r.id}`}
        />
      ))}

      <HeatSwitch x={-2.0} on={heating} onToggle={onToggleHeat} />
      <CleanButton x={2.0} onClick={onClear} />
    </group>
  );
};

export default LabControls3D;
