// Voxel lab desk: a retro monitor cycling subject icons, with voxel props around it.
import { useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CanvasTexture, NearestFilter, SRGBColorSpace } from "three";
import { SPRITES, SUBJECT_SPRITES, getSpriteRuns } from "@/shared/components/ui/pixel";
import { SUBJECTS } from "@/modules/subjects/subjects";
import usePointerRef from "./usePointerRef";
import useSubjectCycle from "./useSubjectCycle";
import VoxelSprite from "./VoxelSprite";

const INK = "#1d1330";
const WOOD = "#e8b07a";
const CREAM = "#f6efe3";
const VIOLET = "#8b5cf6";
const COIN = "#facc15";

const SCREEN_W = 200;
const SCREEN_H = 150;

const drawScreen = (ctx, subject) => {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  const data = getSpriteRuns(SUBJECT_SPRITES[subject.slug]);
  const palette = SPRITES[SUBJECT_SPRITES[subject.slug]].colors;
  const px = 6;
  const ox = Math.round((SCREEN_W - data.width * px) / 2);
  const oy = 22;
  data.runs.forEach(({ x, y, w, key }) => {
    // Ink outline would vanish on the dark screen - draw it light instead.
    ctx.fillStyle = palette[key] === INK ? "#ede9fe" : palette[key];
    ctx.fillRect(ox + x * px, oy + y * px, w * px, px);
  });

  ctx.fillStyle = "#ede9fe";
  ctx.font = "600 18px 'Pixelify Sans', monospace";
  ctx.textAlign = "center";
  ctx.fillText(subject.title.toUpperCase(), SCREEN_W / 2, 124);

  // CRT scanlines
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < SCREEN_H; y += 3) ctx.fillRect(0, y, SCREEN_W, 1);
};

const createScreen = () => {
  const canvas = document.createElement("canvas");
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.colorSpace = SRGBColorSpace;
  return { canvas, texture };
};

const Screen = ({ index }) => {
  const material = useRef(null);
  const screen = useRef(null);

  // Texture is attached imperatively: it's GPU state, not render data.
  useEffect(() => {
    const created = createScreen();
    screen.current = created;
    material.current.map = created.texture;
    material.current.needsUpdate = true;
    return () => created.texture.dispose();
  }, []);

  useEffect(() => {
    const { canvas, texture } = screen.current;
    const ctx = canvas.getContext("2d");
    const paint = () => {
      drawScreen(ctx, SUBJECTS[index]);
      texture.needsUpdate = true;
    };
    paint();
    // Repaint once the pixel font arrives, otherwise the first title uses the fallback.
    document.fonts?.load("600 18px 'Pixelify Sans'").then(paint).catch(() => {});
  }, [index]);

  return (
    <mesh position={[-0.4, 1.75, 1.23]}>
      <planeGeometry args={[3, 2.25]} />
      <meshBasicMaterial ref={material} color="#ffffff" toneMapped={false} />
    </mesh>
  );
};

const Box = ({ args, color, ...props }) => (
  <mesh {...props}>
    <boxGeometry args={args} />
    <meshStandardMaterial color={color} roughness={0.7} flatShading />
  </mesh>
);

const Monitor = ({ index }) => (
  <group position={[0, 0, 0.2]}>
    <Box args={[1.6, 0.3, 1.4]} color={INK} position={[0, 0.15, 0]} />
    <Box args={[4.6, 3.2, 2.4]} color={VIOLET} position={[0, 1.9, 0]} />
    {/* chest-style gold corner caps */}
    {[-2.2, 2.2].map((x) =>
      [0.4, 3.4].map((y) => (
        <Box key={`${x}${y}`} args={[0.36, 0.36, 2.5]} color={COIN} position={[x, y, 0]} />
      )),
    )}
    <Box args={[1.4, 0.24, 0.3]} color={COIN} position={[0, 3.6, 0]} />
    <Box args={[3.4, 2.65, 0.1]} color="#ede9fe" position={[-0.4, 1.75, 1.18]} />
    <Screen index={index} />
    <mesh position={[1.65, 2.35, 1.22]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.28, 0.28, 0.12, 16]} />
      <meshStandardMaterial color="#ef4444" roughness={0.5} />
    </mesh>
    <Box args={[0.46, 0.2, 0.1]} color="#22c55e" position={[1.65, 1.6, 1.22]} />
    <Box args={[0.46, 0.2, 0.1]} color="#3b82f6" position={[1.65, 1.2, 1.22]} />
  </group>
);

const Desk = () => (
  <group>
    <Box args={[13, 0.45, 3.6]} color={WOOD} position={[0, -0.225, 0]} />
    <Box args={[12.4, 3, 3.2]} color={CREAM} position={[0, -1.95, -0.1]} />
    {[-4.1, 0, 4.1].map((x) => (
      <group key={x}>
        <Box args={[3.9, 2.5, 0.06]} color="#efe4d2" position={[x, -1.95, 1.52]} />
        <Box args={[0.9, 0.14, 0.12]} color="#c9b89c" position={[x, -1.2, 1.58]} />
      </group>
    ))}
  </group>
);

// Props stand on the desk; each bobs and sways a little on its own phase.
const PROPS = [
  { name: "flask", x: -4.6, z: 0.4, phase: 0 },
  { name: "dna", x: -3.0, z: -0.3, phase: 1.3, lift: 0.5 },
  { name: "robot", x: 3.2, z: 0.5, phase: 2.2 },
  { name: "dome", x: 4.9, z: -0.2, phase: 0.7 },
  { name: "atom", x: -5.4, z: -0.8, phase: 3.1, lift: 2.3, voxel: 0.1 },
  { name: "planet", x: 5.3, z: -0.6, phase: 4.2, lift: 2.6, voxel: 0.1 },
];

const Prop = ({ name, x, z, phase, lift = 0, voxel = 0.13 }) => {
  const g = useRef(null);
  const height = getSpriteRuns(name).height * voxel;

  useFrame((state) => {
    if (!g.current) return;
    const t = state.clock.elapsedTime + phase;
    g.current.position.y = height / 2 + lift + (lift ? Math.sin(t * 1.4) * 0.15 : 0);
    g.current.rotation.y = Math.sin(t * 0.7) * 0.45;
  });

  return (
    <group ref={g} position={[x, height / 2 + lift, z]}>
      <VoxelSprite name={name} voxel={voxel} />
    </group>
  );
};

const Rig = ({ pointer, children }) => {
  const g = useRef(null);
  const { camera } = useThree();

  useEffect(() => {
    camera.lookAt(0, 0.9, 0);
  }, [camera]);

  useFrame(() => {
    if (!g.current) return;
    const { x, y } = pointer.current;
    g.current.rotation.y += (x * 0.14 - g.current.rotation.y) * 0.05;
    g.current.rotation.x += (y * 0.04 - g.current.rotation.x) * 0.05;
  });

  return <group ref={g}>{children}</group>;
};

const HeroMachineScene = ({ active = true }) => {
  const pointer = usePointerRef(true);
  const index = useSubjectCycle(active);

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.5]}
      camera={{ position: [0, 3.2, 15], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#ffffff", "#c4b5fd", 0.6]} />
      <directionalLight position={[5, 8, 9]} intensity={1.6} />
      <directionalLight position={[-6, 2, 4]} intensity={0.4} color="#c4b5fd" />

      <Rig pointer={pointer}>
        <Desk />
        <Monitor index={index} />
        {PROPS.map((p) => (
          <Prop key={p.name} {...p} />
        ))}
      </Rig>
    </Canvas>
  );
};

export default HeroMachineScene;
