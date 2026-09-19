// Like useFrame, but skips the callback while the scene is paused (toolbar).
import { useFrame } from "@react-three/fiber";
import { useSceneControlOptional } from "./sceneControl";

export const usePausableFrame = (callback) => {
  const { paused } = useSceneControlOptional();
  useFrame((state, delta) => {
    if (paused) return;
    callback(state, delta);
  });
};
