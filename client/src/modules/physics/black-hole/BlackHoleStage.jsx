import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ScreenQuad } from "@react-three/drei";
import * as THREE from "three";
import { useSceneControlOptional } from "@/shared/lab/sceneControl";
import { FRAGMENT, VERTEX } from "./blackHoleShader";

// The whole image is one shader pass, so the scene holds a single full-screen
// triangle. The orbit camera only feeds it a position and a basis.
const BlackHoleStage = ({ live, onCamera }) => {
  const material = useRef(null);
  const simTime = useRef(0);
  const appliedView = useRef(null);
  const basis = useRef(new THREE.Matrix4());
  const { camera, size, viewport } = useThree();
  const { paused, controlsRef } = useSceneControlOptional();

  const uniforms = useMemo(
    () => ({
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCamPos: { value: new THREE.Vector3() },
      uCamBasis: { value: new THREE.Matrix3() },
      uTanHalfFov: { value: 0.5 },
      uTime: { value: 0 },
      uDiskInner: { value: 6 },
      uDiskOuter: { value: 18 },
      uDiskBrightness: { value: 0.85 },
      uDiskOpacity: { value: 0.9 },
      uTurbulence: { value: 0.6 },
      uDiskSpeed: { value: 1 },
      uExposure: { value: 1.1 },
      uStarBrightness: { value: 1 },
      uLensing: { value: 1 },
      uDoppler: { value: 1 },
      uMarkers: { value: 0 },
      uSteps: { value: 220 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const u = material.current?.uniforms;
    if (!u) return;
    const { settings, viewPosition } = live.current;

    // A camera preset moves the orbit camera itself, so dragging carries on
    // from the new spot instead of snapping back.
    if (viewPosition && appliedView.current !== viewPosition) {
      appliedView.current = viewPosition;
      camera.position.set(...viewPosition);
      camera.lookAt(0, 0, 0);
      controlsRef?.current?.update?.();
    }

    if (!paused && settings.spinning) simTime.current += delta * settings.speed;

    basis.current.makeRotationFromQuaternion(camera.quaternion);
    u.uCamBasis.value.setFromMatrix4(basis.current);
    u.uCamPos.value.copy(camera.position);
    u.uResolution.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    u.uTanHalfFov.value = Math.tan(((camera.fov ?? 50) * Math.PI) / 360);
    u.uTime.value = simTime.current;
    u.uDiskInner.value = settings.inner;
    u.uDiskOuter.value = Math.max(settings.outer, settings.inner + 1);
    u.uDiskBrightness.value = settings.brightness;
    u.uDiskOpacity.value = settings.opacity;
    u.uTurbulence.value = settings.turbulence;
    u.uDiskSpeed.value = settings.speed;
    u.uExposure.value = settings.exposure;
    u.uLensing.value = settings.lensing ? 1 : 0;
    u.uDoppler.value = settings.doppler ? 1 : 0;
    u.uMarkers.value = settings.markers ? 1 : 0;
    u.uSteps.value = settings.steps;

    onCamera?.(camera.position.length());
  });

  return (
    <ScreenQuad>
      <shaderMaterial
        ref={material}
        args={[{ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT }]}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
};

export default BlackHoleStage;
