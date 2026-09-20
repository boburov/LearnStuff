import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RoundedBox, Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import useVrController from "@/shared/lab/useVrController";
import { ENGINE_FONT } from "./engineFont";

const IDLE = new THREE.Color("#1e293b");
const ACTIVE = new THREE.Color("#7c3aed");
const RUN = new THREE.Color("#15803d");
const STOP = new THREE.Color("#b91c1c");

const BUTTON_W = 0.72;
const BUTTON_H = 0.2;

const XR_POSITION = [-1.1, 0.25, 2.9];
const XR_ROTATION = [0, 0.5, 0];
// Headset-free modes: float the panel beside the line of sight toward the engine.
const FREE_DISTANCE = 3.4;
const FREE_YAW = 0.24;
const FREE_DROP = 0.35;
const UP = new THREE.Vector3(0, 1, 0);
const CENTER = new THREE.Vector2(0, 0);
const _dir = new THREE.Vector3();

const PLAY_SHAPE = new THREE.Shape([
  new THREE.Vector2(-0.03, -0.04),
  new THREE.Vector2(0.045, 0),
  new THREE.Vector2(-0.03, 0.04),
]);

const MODES = [
  { id: "solid", label: "Butun" },
  { id: "xray", label: "Rentgen" },
  { id: "explode", label: "Ajratish" },
];

// Own Suspense per label so a slow font never hides the buttons themselves.
const PanelText = (props) => (
  <Suspense fallback={null}>
    <Text font={ENGINE_FONT} {...props} />
  </Suspense>
);

const RunIcon = ({ running }) =>
  running ? (
    <group>
      {[-0.022, 0.022].map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <planeGeometry args={[0.024, 0.08]} />
          <meshBasicMaterial color="#e6eefc" toneMapped={false} />
        </mesh>
      ))}
    </group>
  ) : (
    <mesh>
      <shapeGeometry args={[PLAY_SHAPE]} />
      <meshBasicMaterial color="#e6eefc" toneMapped={false} />
    </mesh>
  );

// One 3D key: pops toward the ray on hover, colour eases to its state.
const PanelButton = ({ id, y, label, color, active, gazed = false, clickable = true, onClick, icon }) => {
  const [hover, setHover] = useState(false);
  const cap = useRef(null);
  const mat = useRef(null);
  const lit = (clickable && hover) || gazed;

  useFrame((_, delta) => {
    const k = Math.min(1, delta * 14);
    if (cap.current) {
      cap.current.position.z = THREE.MathUtils.lerp(cap.current.position.z, lit ? 0.025 : 0, k);
    }
    if (mat.current) {
      mat.current.color.lerp(color, k);
      mat.current.emissive.lerp(color, k);
      const glow = (active ? 0.45 : 0.12) + (lit ? 0.2 : 0);
      mat.current.emissiveIntensity = THREE.MathUtils.lerp(mat.current.emissiveIntensity, glow, k);
    }
  });

  // Phone VR taps land on the stereo split, so there the gaze picker triggers buttons instead.
  const handlers = clickable
    ? {
        onPointerOver: (e) => {
          e.stopPropagation();
          setHover(true);
        },
        onPointerOut: () => setHover(false),
        onClick: (e) => {
          e.stopPropagation();
          onClick?.();
        },
      }
    : {};

  return (
    <group position={[0, y, 0]} userData={{ panelId: id }} {...handlers}>
      <group ref={cap}>
        <RoundedBox args={[BUTTON_W, BUTTON_H, 0.07]} radius={0.04} smoothness={4}>
          <meshStandardMaterial
            ref={mat}
            color="#1e293b"
            emissive="#1e293b"
            emissiveIntensity={0.12}
            roughness={0.4}
            metalness={0.1}
          />
        </RoundedBox>
        {icon && <group position={[-BUTTON_W / 2 + 0.08, 0, 0.037]}>{icon}</group>}
        <PanelText
          position={[icon ? 0.04 : 0, 0, 0.037]}
          fontSize={0.07}
          color="#e6eefc"
          anchorX="center"
          anchorY="middle"
          maxWidth={BUTTON_W - 0.14}
          outlineWidth={0.003}
          outlineColor="#0b1220"
        >
          {label}
        </PanelText>
      </group>
    </group>
  );
};

const PanelBody = ({ placement, gaze, running, mode, onToggleRun, onMode }) => {
  const rootRef = useRef(null);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const hits = useRef([]);
  const gazeRef = useRef(null);
  const [gazeId, setGazeId] = useState(null);
  const actions = useRef({});
  const { on, poll } = useVrController({ enabled: gaze });

  useEffect(() => {
    actions.current = {
      run: onToggleRun,
      ...Object.fromEntries(MODES.map((m) => [m.id, () => onMode?.(m.id)])),
    };
  });

  // Placed once on entry so the panel stays put in the world while the head/gyro looks around.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || placement !== "free") return;
    _dir.copy(camera.position).negate();
    _dir.y = 0;
    if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, -1);
    _dir.normalize().applyAxisAngle(UP, FREE_YAW);
    root.position.copy(camera.position).addScaledVector(_dir, FREE_DISTANCE);
    root.position.y -= FREE_DROP;
    root.lookAt(camera.position);
  }, [placement, camera]);

  useEffect(() => {
    if (!gaze) return;
    const fire = () => {
      const id = gazeRef.current;
      if (id) actions.current[id]?.();
    };
    const off = on("select", fire);
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", fire);
    return () => {
      off();
      canvas.removeEventListener("pointerdown", fire);
    };
  }, [gaze, on, gl]);

  useFrame(() => {
    if (!gaze || !rootRef.current) return;
    poll();
    raycaster.setFromCamera(CENTER, camera);
    const list = hits.current;
    list.length = 0;
    raycaster.intersectObject(rootRef.current, true, list);
    let id = null;
    for (let i = 0; i < list.length && id == null; i++) {
      let o = list[i].object;
      while (o && o.userData.panelId == null) o = o.parent;
      if (o) id = o.userData.panelId;
    }
    if (id !== gazeRef.current) {
      gazeRef.current = id;
      setGazeId(id);
    }
  });

  const xr = placement === "xr";

  return (
    <group
      ref={rootRef}
      position={xr ? XR_POSITION : undefined}
      rotation={xr ? XR_ROTATION : undefined}
    >
      <RoundedBox args={[0.9, 1.34, 0.05]} radius={0.06} smoothness={4} position={[0, 0, -0.06]}>
        <meshStandardMaterial color="#0f1424" roughness={0.7} metalness={0.2} transparent opacity={0.92} />
      </RoundedBox>
      <PanelText position={[0, 0.56, 0]} fontSize={0.075} color="#c4b5fd" anchorX="center" anchorY="middle">
        Dvigatel
      </PanelText>
      <PanelButton
        id="run"
        y={0.36}
        label={running ? "To'xtatish" : "Ishga tushirish"}
        color={running ? STOP : RUN}
        active={running}
        gazed={gazeId === "run"}
        clickable={!gaze}
        icon={<RunIcon running={running} />}
        onClick={onToggleRun}
      />
      <PanelText position={[0, 0.16, 0]} fontSize={0.05} color="#94a3b8" anchorX="center" anchorY="middle">
        Ko'rinish
      </PanelText>
      {MODES.map((m, i) => (
        <PanelButton
          key={m.id}
          id={m.id}
          y={-0.04 - i * 0.24}
          label={m.label}
          color={mode === m.id ? ACTIVE : IDLE}
          active={mode === m.id}
          gazed={gazeId === m.id}
          clickable={!gaze}
          onClick={() => onMode?.(m.id)}
        />
      ))}
    </group>
  );
};

// placement "xr": fixed beside the headset origin; "free": beside the current view (phone VR, walk).
const EngineVrPanel = ({ enabled, placement = "xr", gaze = false, ...props }) =>
  enabled ? <PanelBody key={placement} placement={placement} gaze={gaze} {...props} /> : null;

export default EngineVrPanel;
