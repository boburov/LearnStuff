import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { useFxSystem } from "./fxCore";
import { createHose } from "./fxHose";

// Sagging silicone gas hose in world space. Props: radius, get() → { from, to, bubbling } | null.
const GasTube = ({ radius = 0.005, get }) => {
  const { quality } = useKit();
  const create = useCallback(() => createHose({ quality, radius }), [quality, radius]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null));
  return <group ref={groupRef} />;
};

export default GasTube;
