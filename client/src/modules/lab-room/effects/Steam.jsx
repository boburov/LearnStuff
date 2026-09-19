import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { useFxSystem } from "./fxCore";
import { createSteam } from "./fxVapour";

// Soft white wisps rising from a mouth of `radius`. Props: origin, radius, get() → { intensity } | null.
const Steam = ({ origin, radius = 0.02, get }) => {
  const { quality } = useKit();
  const create = useCallback(() => createSteam({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null, radius));
  return <group ref={groupRef} position={origin} />;
};

export default Steam;
