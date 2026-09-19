import { useEffect, useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { captureRoomEnvironment, showBackdrop } from "./environmentCapture";

export const RoomBackdrop = ({ url }) => {
  const scene = useThree((s) => s.scene);
  const exterior = useTexture(url);
  useLayoutEffect(() => showBackdrop(scene, exterior), [scene, exterior]);
  return null;
};

const RoomEnvironment = ({ size }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const dispose = captureRoomEnvironment(gl, scene, size);
    invalidate();
    return dispose;
  }, [gl, scene, size, invalidate]);

  return null;
};

export default RoomEnvironment;
