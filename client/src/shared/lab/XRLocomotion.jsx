// WebXR (Quest) harakatlanish: chap stik bilan yurish (qaragan tomonga),
// o'ng stik bilan burilish. XROrigin guruhini (originRef) suradi/buradi.
// Faqat <XR> ichida render qilinadi (useXRInputSourceState shart).
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useXRInputSourceState } from "@react-three/xr";
import * as THREE from "three";

const MOVE_SPEED = 2.4;
const TURN_SPEED = 1.8;
const DEAD = 0.15;
const BOUND = 14;

const XRLocomotion = ({ originRef }) => {
  const camera = useThree((s) => s.camera);
  const left = useXRInputSourceState("controller", "left");
  const right = useXRInputSourceState("controller", "right");

  const fwd = useRef(new THREE.Vector3()).current;
  const side = useRef(new THREE.Vector3()).current;

  useFrame((_, delta) => {
    const origin = originRef.current;
    if (!origin) return;
    const dt = Math.min(delta, 0.05);

    const ls = left?.gamepad?.["xr-standard-thumbstick"];
    const rs = right?.gamepad?.["xr-standard-thumbstick"];

    const lx = ls?.xAxis ?? 0;
    const ly = ls?.yAxis ?? 0;
    if (Math.abs(lx) > DEAD || Math.abs(ly) > DEAD) {
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      if (fwd.lengthSq() > 1e-6) {
        fwd.normalize();
        side.crossVectors(fwd, camera.up).normalize();
        // yAxis: oldinga - manfiy
        origin.position.addScaledVector(fwd, -ly * MOVE_SPEED * dt);
        origin.position.addScaledVector(side, lx * MOVE_SPEED * dt);
        origin.position.x = Math.max(-BOUND, Math.min(BOUND, origin.position.x));
        origin.position.z = Math.max(-BOUND, Math.min(BOUND, origin.position.z));
      }
    }

    const rx = rs?.xAxis ?? 0;
    if (Math.abs(rx) > DEAD) origin.rotation.y -= rx * TURN_SPEED * dt;
  });

  return null;
};

export default XRLocomotion;
