import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { approach, budgetRoom, clamp, frameBudget, useFxSystem } from "./fxCore";
import { createSparks, pixelScale } from "./fxSparks";

const createBurst = ({ quality }) => {
  const low = quality === "low";
  const sparks = createSparks({ capacity: low ? 40 : 130 });
  const seed = { speed: [0, 0], spread: 0.55, life: [0, 0], width: [0.0006, 0.0013] };
  const env = { pixel: 0, drag: 2.4, forks: 0.2, maxDraw: 0 };
  let level = 0;
  let carry = 0;

  const update = (frame, params) => {
    const { state, dt, reduceMotion } = frame;
    level = approach(level, params ? clamp(params.intensity ?? 1, 0, 1) : 0, dt, 0.15);
    if (params?.color) {
      sparks.uniforms.uHot.value.set(params.color).multiplyScalar(9);
      sparks.uniforms.uWarm.value.set(params.color).multiplyScalar(3.5);
    }
    const budget = frameBudget(state, quality);
    if (level > 0.02) {
      carry += (low ? 40 : 110) * level * (reduceMotion ? 0.6 : 1) * dt;
      const room = budgetRoom(budget);
      while (carry >= 1) {
        carry -= 1;
        if (sparks.count() >= room) break;
        seed.speed[0] = 0.35 + level * 0.4;
        seed.speed[1] = 0.9 + level * 1.4;
        seed.life[0] = 0.18;
        seed.life[1] = 0.45 + level * 0.25;
        sparks.emit(0, 0, 0, seed);
      }
    } else {
      carry = 0;
    }
    env.pixel = pixelScale(state);
    env.maxDraw = Math.max(0, budgetRoom(budget));
    budget.used += sparks.update(dt, env);
  };

  return { object: sparks.object, update, dispose: sparks.dispose };
};

// Short-lived bright streaks with gravity. Props: origin, get() → { intensity, color? } | null.
const Sparks = ({ origin, get }) => {
  const { quality } = useKit();
  const create = useCallback(() => createBurst({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null));
  return <group ref={groupRef} position={origin} />;
};

export default Sparks;
