// A coloured droplet that falls from the tube mouth down onto the liquid
// surface each time a reagent is added (keyed on pourSeq). It accelerates under
// "gravity" and vanishes on contact, so adding a substance reads as pouring it
// IN rather than the liquid silently jumping up.
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  TUBE_X,
  TUBE_BASE_Y,
  TUBE_MOUTH_Y,
  TUBE_LIQUID_MAX,
} from "./labGeometry";

const PourDrop = ({ pourSeq, pourColor, fill, paused }) => {
  const ref = useRef(null);
  const matRef = useRef(null);
  const last = useRef(pourSeq);
  const progress = useRef(1); // 1 = finished/idle
  const color = useRef(new THREE.Color(pourColor));

  useFrame((_, delta) => {
    // A new pour (seq incremented) launches a fresh drop. Clearing resets seq
    // to 0 (a decrease) and must NOT launch one.
    if (pourSeq !== last.current) {
      if (pourSeq > last.current) {
        progress.current = 0;
        color.current.set(pourColor);
      }
      last.current = pourSeq;
    }
    if (progress.current >= 1) {
      if (ref.current) ref.current.visible = false;
      return;
    }
    if (!paused) progress.current = Math.min(1, progress.current + delta * 1.7);

    const p = progress.current;
    const top = TUBE_MOUTH_Y - 0.2;
    const surface = TUBE_BASE_Y + Math.max(0.08, fill * TUBE_LIQUID_MAX);
    const y = top + (surface - top) * (p * p); // ease-in (accelerating fall)

    if (ref.current) {
      ref.current.visible = true;
      ref.current.position.set(TUBE_X, y, 0);
      const s = 0.07 * (1 - p * 0.3);
      ref.current.scale.set(s * 0.85, s * 1.25, s * 0.85); // teardrop
    }
    if (matRef.current) matRef.current.color.copy(color.current);
  });

  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[1, 14, 14]} />
      <meshStandardMaterial ref={matRef} color={pourColor} roughness={0.2} metalness={0.05} />
    </mesh>
  );
};

export default PourDrop;
