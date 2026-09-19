import { useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { useKit } from "../equipment/kit/kitContext";
import { useFxSystem } from "./fxCore";
import { createFireEffect } from "./fxFireEffect";

// Reaction flame by kind (see fxFlame FLAME_KINDS). Props: origin, radius, get() → { kind, intensity } | null.
// extras=false skips the built-in sparks and smoke when the caller draws them separately.
const Flame = ({ origin, radius = 0.02, get, extras = true }) => {
  const { quality } = useKit();
  const scene = useThree((s) => s.scene);
  const create = useCallback(() => createFireEffect({ quality, scene, extras }), [quality, scene, extras]);
  const groupRef = useFxSystem(create, (system, frame) => {
    const params = get?.() ?? null;
    system.update(frame, params?.kind ?? null, params?.intensity ?? 1, radius);
  });
  return <group ref={groupRef} position={origin} />;
};

export default Flame;
