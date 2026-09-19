import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { useFxSystem } from "./fxCore";
import { createSmoke } from "./fxVapour";

// Coloured smoke column from a mouth of `radius`. Props: origin, radius, get() → { rate, color, toxic } | null.
const Smoke = ({ origin, radius = 0.02, get }) => {
  const { quality } = useKit();
  const create = useCallback(() => createSmoke({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null, radius));
  return <group ref={groupRef} position={origin} />;
};

export default Smoke;
