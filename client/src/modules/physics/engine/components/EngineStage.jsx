import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSceneControlOptional } from "@/shared/lab/sceneControl";
import { ENGINE_CENTER_Y } from "../engineMath";
import EngineDriver from "../EngineDriver";
import EngineModel from "../model/EngineModel";
import EngineEnvironment from "../model/EngineEnvironment";
import EngineVrPanel from "../model/EngineVrPanel";

const DESKTOP_POSITION = [0, -ENGINE_CENTER_Y, 0];
const VR_POSITION = [0, -0.23, 2.9];
const VR_SCALE = 0.3;
// Assembled engine's projected half-width from the default camera azimuth, plus depth toward the camera.
const MODEL_HALF_WIDTH = 2.2;
const MODEL_HALF_DEPTH = 1.0;
const ORIGIN = new THREE.Vector3();
const _offset = new THREE.Vector3();

// Narrow canvases (projector with both side panels, phones) clip the pipes, so dolly out until the model fits.
const CameraFit = ({ maxDistance }) => {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const { controlsRef } = useSceneControlOptional();

  useEffect(() => {
    if (!width || !height) return;
    const controls = controlsRef?.current;
    const target = controls?.target ?? ORIGIN;
    const tanHalfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (width / height);
    const need = Math.min(maxDistance, MODEL_HALF_WIDTH / tanHalfH + MODEL_HALF_DEPTH);
    if (camera.position.distanceTo(target) >= need) return;
    _offset.copy(camera.position).sub(target).setLength(need);
    camera.position.copy(target).add(_offset);
    if (controls) {
      controls.update();
      controls.saveState?.();
    }
  }, [camera, width, height, controlsRef, maxDistance]);

  return null;
};

const FirstFrame = ({ onReady }) => {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onReady?.();
  });
  return null;
};

const EngineStage = ({
  simRef,
  soundRef,
  mode,
  selectedId,
  running,
  maxDistance,
  onSelectPart,
  onTick,
  onStepDone,
  onReady,
  onToggleRun,
  onMode,
}) => {
  const { inVR, cardboard, vrBox, walk } = useSceneControlOptional();
  const phoneVR = !inVR && (cardboard || vrBox);

  // Context updates re-render this stage; keep the heavy model subtree stable.
  const environment = useMemo(() => <EngineEnvironment />, []);
  const model = useMemo(
    () => (
      <EngineModel
        simRef={simRef}
        mode={mode}
        selectedId={selectedId}
        onSelectPart={onSelectPart}
        inVR={inVR}
      />
    ),
    [simRef, mode, selectedId, onSelectPart, inVR],
  );

  return (
    <>
      {environment}
      <FirstFrame onReady={onReady} />
      <EngineDriver
        simRef={simRef}
        soundRef={soundRef}
        onTick={onTick}
        onStepDone={onStepDone}
      />
      {!inVR && !cardboard && !vrBox && !walk && <CameraFit maxDistance={maxDistance} />}
      <group
        position={inVR ? VR_POSITION : DESKTOP_POSITION}
        scale={inVR ? VR_SCALE : 1}
      >
        {model}
      </group>
      {/* Side panels are hidden in every immersive mode, so the 3D panel is the only control surface there. */}
      <EngineVrPanel
        enabled={inVR || cardboard || vrBox || walk}
        placement={inVR ? "xr" : "free"}
        gaze={phoneVR}
        running={running}
        mode={mode}
        onToggleRun={onToggleRun}
        onMode={onMode}
      />
    </>
  );
};

export default EngineStage;
