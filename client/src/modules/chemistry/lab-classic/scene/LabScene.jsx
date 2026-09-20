// The full 3D laboratory: a test tube clamped to a retort stand with a burner
// beneath it. Uses a dedicated Canvas so it can have studio image-based
// lighting (Lightformer Environment - offline-safe, no HDRI download) for real
// glass reflections, plus soft contact shadows for grounding. Camera/animation
// pause + reset are wired to the workspace toolbar via SceneControl.
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import { XR, XROrigin, IfInSessionMode } from "@react-three/xr";
import { useSceneControlOptional } from "@/shared/lab/sceneControl";
import CardboardView from "@/shared/lab/CardboardView";
import Locomotion from "@/shared/lab/Locomotion";
import XRLocomotion from "@/shared/lab/XRLocomotion";
import ReactionBurst from "./ReactionBurst";
import LabControls3D from "./LabControls3D";
import RetortStand from "./RetortStand";
import Clamp from "./Clamp";
import TestTube from "./TestTube";
import Burner from "./Burner";
import Flame from "./Flame";
import Bubbles from "./Bubbles";
import Steam from "./Steam";
import PourDrop from "./PourDrop";
import Fog from "./Fog";
import VrHand from "./VrHand";
import GazeReticleHit from "./GazeReticleHit";
import VrTeleport from "./VrTeleport";
import VrControllerGrab from "./VrControllerGrab";
import VrPanel3D from "./VrPanel3D";
import { useGazeGrab } from "./useGazeGrab";
import {
  CAMERA_POSITION,
  CAMERA_TARGET,
  FLAME_Y,
  TUBE_X,
  TUBE_MOUTH_Y,
} from "./labGeometry";

// Gaze-grab tizimini <Canvas> ichida ishga tushiradi (hook R3F kontekstini talab
// qiladi). Probirkani "quy" nishoni sifatida ro'yxatga oladi va VrHand + reticle
// hit-feedback'ni chizadi. Faqat VR/cardboard faol bo'lganda (enabled) ishlaydi.
const GazeGrabLayer = ({ enabled, onPour, onReady }) => {
  const gaze = useGazeGrab({ enabled, onPour });

  // Probirka og'zi - "bu yerga quy" nishoni. Radiusni kengroq olamiz (qarash oson).
  useEffect(() => {
    if (!enabled) return;
    return gaze.registerTarget("tube", {
      kind: "tube",
      position: new THREE.Vector3(TUBE_X, TUBE_MOUTH_Y - 0.3, 0),
      radius: 0.7,
    });
  }, [enabled, gaze]);

  // Ota-komponentga gaze api'sini uzatamiz (shishalarni highlight qilish uchun).
  useEffect(() => {
    onReady?.(enabled ? gaze : null);
  }, [enabled, gaze, onReady]);

  if (!enabled) return null;
  const pouring = !!gaze.held && gaze.hoverId === "tube";
  return (
    <>
      <VrHand enabled={enabled} held={gaze.held} pouring={pouring} />
      <GazeReticleHit
        active={!!gaze.hoverId}
        pouring={pouring}
        holding={!!gaze.held}
        dwell={gaze.dwellProgress}
      />
    </>
  );
};

const Loader = () => (
  <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
    Yuklanmoqda...
  </div>
);

// In-memory studio environment: three soft area lights give the glass clean
// reflections and a sense of depth without fetching any external HDRI.
const StudioEnv = () => (
  <Environment resolution={256}>
    <Lightformer form="rect" intensity={3} position={[0, 5, 3]} scale={[8, 3, 1]} color="#ffffff" />
    <Lightformer form="rect" intensity={2} position={[-5, 2, 1]} scale={[5, 6, 1]} color="#dbe6ff" />
    <Lightformer form="rect" intensity={2} position={[5, 2, 2]} scale={[4, 5, 1]} color="#fff0dc" />
    {/* Bright panel BEHIND the apparatus so the glass refracts light, not a black void */}
    <Lightformer form="rect" intensity={2.6} position={[0, 3, -5]} scale={[9, 7, 1]} color="#cfe0ff" />
  </Environment>
);

const Apparatus = ({
  liquidColor,
  fill,
  heating,
  temperature,
  reactionSeq,
  reactionKind,
  pourSeq,
  pourColor,
  fogging,
  paused,
}) => (
  <group>
    <RetortStand />
    <Clamp />
    <TestTube liquidColor={liquidColor} fill={fill} />
    <Burner />
    {heating && <Flame position={[TUBE_X, FLAME_Y, 0]} temperature={temperature} paused={paused} />}
    <Bubbles active={heating && fill > 0.02} fill={fill} temperature={temperature} paused={paused} />
    {/* Steam only once there's enough liquid AND it's genuinely hot - so a fresh
        pour doesn't puff vapour out of a near-empty tube. */}
    <Steam active={heating && fill > 0.12 && temperature > 0.5} temperature={temperature} paused={paused} />
    <Fog active={fogging} paused={paused} />
    <PourDrop pourSeq={pourSeq} pourColor={pourColor} fill={fill} paused={paused} />
    <ReactionBurst reactionSeq={reactionSeq} kind={reactionKind} />
  </group>
);

// reagents/onPour/onToggleHeat/onClear drive the in-scene 3D controls (VR + mouse);
// the rest of the props are display state passed through to the apparatus.
const LabScene = ({ reagents, onPour, onToggleHeat, onClear, ...display }) => {
  const { paused, controlsRef, xrStore, inVR, cardboard, vrBox, walk } =
    useSceneControlOptional();
  const originRef = useRef(null);
  // VR gaze-grab tizimi shu holatda ekan (LabControls3D shishalarni gaze bilan
  // yoritishi uchun kerak). GazeGrabLayer <Canvas> ichida onReady bilan beradi.
  const [gazeApi, setGazeApi] = useState(null);
  // Haqiqiy shlem (Quest) rejimida controller bilan ushlangan shisha - {reagent}|null.
  // Cardboard gaze grab'i o'zining held'ini gazeApi ichida saqlaydi (bu alohida).
  const [ctrlHeld, setCtrlHeld] = useState(null);

  // Cardboard/VR box: gaze + tap. Haqiqiy shlem (inVR): controller + teleport +
  // 3D panel. Desktop/oddiy rejimda click-to-pour saqlanadi.
  const gazeEnabled = cardboard || vrBox; // gaze faqat telefon-VR uchun
  const handsEnabled = inVR; // 6DoF controller faqat haqiqiy shlemda

  // Shishani controller bilan olish (Quest): grab -> ctrlHeld; qo'yish/quyish
  // VrControllerGrab trigger'idan keladi. onPour reaksiyani, onDrop tashlashni beradi.
  const grabBottle = (reagent) => setCtrlHeld({ reagent });
  const dropBottle = () => setCtrlHeld(null);
  const pourHeld = (reagent) => {
    onPour?.(reagent);
    setCtrlHeld(null);
  };

  // OrbitControls only in plain mode; VR/cardboard/walk drive the camera themselves.
  const freeControl = inVR || cardboard || vrBox || walk;

  const content = (
    <>
      <color attach="background" args={["#0e1626"]} />
      <StudioEnv />
      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 7, 4]} intensity={1.1} />
      <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#bcd2ff" />

      <Apparatus {...display} paused={paused} />

      <LabControls3D
        reagents={reagents}
        onPour={onPour}
        heating={display.heating}
        onToggleHeat={onToggleHeat}
        onClear={onClear}
        gazeApi={gazeApi}
        // Quest'da shishani bosish = olish (quyish emas); ushlangan bo'lsa yashiramiz.
        onGrab={handsEnabled ? grabBottle : undefined}
        heldReagentId={ctrlHeld?.reagent?.id}
      />

      {/* Telefon-VR (cardboard/vrBox): gaze + tap bilan olish-quyish qatlami. */}
      <GazeGrabLayer
        enabled={gazeEnabled}
        onPour={onPour}
        onReady={setGazeApi}
      />

      {/* Haqiqiy shlem (Quest): 6DoF controller bilan olib egib quyish,
          teleport bilan yurish, va havoda suzuvchi 3D boshqaruv paneli. */}
      <VrControllerGrab
        enabled={handsEnabled}
        held={ctrlHeld}
        onPour={pourHeld}
        onDrop={dropBottle}
      />
      <VrTeleport enabled={handsEnabled} originRef={originRef} />
      <VrPanel3D
        enabled={handsEnabled}
        heating={display.heating}
        onToggleHeat={onToggleHeat}
        onClear={onClear}
      />

      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.55}
        blur={2.6}
        far={6}
        scale={11}
        resolution={1024}
        color="#0a1018"
      />

      {/* Desktop/phone walk (XR stik bilan harakat alohida <XRLocomotion> da). */}
      <Locomotion />

      {/* Turish nuqtasi HAR DOIM mavjud: sessiya boshlanishi bilan WebXR kamerasi
          shu guruhga ulanadi. inVR holatini kutsak, kamera (0,0,0) da qolib,
          probiraga emas, bo'shliqqa qarab ekran bo'sh ko'rinardi (asosiy bug). */}
      <XROrigin ref={originRef} position={[0, 0, 4.8]} />

      {/* Immersiv sessiyada kamera WebXR ixtiyorida bo'ladi - OrbitControls va
          cardboard stereo unga qarshi ishlab ekranni "buzmasligi" uchun ularni
          sessiya tashqarisiga qulflaymiz (react-three/xr rasmiy tavsiyasi). */}
      <IfInSessionMode deny={["immersive-vr", "immersive-ar"]}>
        <CardboardView enabled={!!cardboard && !inVR} />
        {!freeControl && (
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            target={CAMERA_TARGET}
            minDistance={3}
            maxDistance={13}
            maxPolarAngle={Math.PI * 0.52}
          />
        )}
      </IfInSessionMode>
    </>
  );

  return (
    <div className="relative h-full w-full">
      <Suspense fallback={<Loader />}>
        <Canvas dpr={[1, 2]} gl={{ antialias: true }} camera={{ position: CAMERA_POSITION, fov: 42 }}>
          {/* Wrap in <XR> so the lab can run a WebXR immersive-vr session;
              XRLocomotion (thumbstick) must live inside <XR>. */}
          {xrStore ? (
            <XR store={xrStore}>
              {content}
              <XRLocomotion originRef={originRef} />
            </XR>
          ) : (
            content
          )}
        </Canvas>
      </Suspense>
    </div>
  );
};

export default LabScene;
