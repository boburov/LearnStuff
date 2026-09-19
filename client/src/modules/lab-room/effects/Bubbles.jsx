import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { budgetRoom, frameBudget, useFxSystem } from "./fxCore";
import { createBubbles } from "./fxBubbles";

// Rising bubbles inside a liquid column, drawn between the glass skins (renderOrder 2).
// Props: innerProfile ([r, y] pairs or Vector2), get() → { level, rate, site, sources, size, color } | null.
const Bubbles = ({ innerProfile, get }) => {
  const { quality } = useKit();
  const create = useCallback(() => createBubbles({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => {
    const params = get?.() ?? null;
    const budget = frameBudget(frame.state, quality);
    budget.used += system.update(frame.dt, params, innerProfile, frame, budgetRoom(budget));
  });
  return <group ref={groupRef} />;
};

export default Bubbles;
