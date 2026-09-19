// Center gaze reticle for VR box mode: a small ring locked to the middle of the
// view so the user knows what the controller's "select" will pick. It lives in
// the scene (so StereoEffect draws it in both eyes) and is re-pinned in front of
// the camera every frame. depthTest off keeps it on top of the model.
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const GazeReticle = ({ enabled }) => {
  const ref = useRef();
  const camera = useThree((s) => s.camera);

  useFrame(() => {
    if (!enabled || !ref.current) return;
    ref.current.position.copy(camera.position);
    ref.current.quaternion.copy(camera.quaternion);
    ref.current.translateZ(-2);
  });

  if (!enabled) return null;

  return (
    <mesh ref={ref} renderOrder={999}>
      <ringGeometry args={[0.02, 0.035, 24]} />
      <meshBasicMaterial
        color="#22d3ee"
        transparent
        opacity={0.9}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

export default GazeReticle;
