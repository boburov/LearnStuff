import { EquirectangularReflectionMapping, PMREMGenerator, SRGBColorSpace, Vector3 } from "three";
import { EXPOSURE } from "./roomMaterials";

const CAPTURE_POINT = new Vector3(0.3, 1.5, 0.1);

// The outdoor photo seen through the windows. Returns cleanup.
export const showBackdrop = (scene, texture) => {
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  scene.background = texture;
  scene.backgroundIntensity = EXPOSURE;
  return () => {
    if (scene.background === texture) scene.background = null;
  };
};

// Captures the finished room once, so glass and glossy surfaces reflect the lab itself. Returns cleanup.
export const captureRoomEnvironment = (gl, scene, size) => {
  const pmrem = new PMREMGenerator(gl);
  scene.environment = null;
  const target = pmrem.fromScene(scene, 0, 0.05, 40, { size, position: CAPTURE_POINT });
  scene.environment = target.texture;
  return () => {
    if (scene.environment === target.texture) scene.environment = null;
    target.dispose();
    pmrem.dispose();
  };
};
