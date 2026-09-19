import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { useFxSystem } from "./fxCore";
import { createStream } from "./fxStream";

// Liquid stream in world space from a pour lip to the target surface, with a splash where it lands.
// Props: get() → { from: Vector3, to: Vector3, rate 0..1, color, opacity } | null.
const PourStream = ({ get }) => {
  const { quality } = useKit();
  const create = useCallback(() => createStream({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null));
  return <group ref={groupRef} />;
};

export default PourStream;
