import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { approach, budgetRoom, clamp, createColorTracker, frameBudget, rand, useFxSystem } from "./fxCore";
import { createDroplets } from "./fxDroplets";

const createSpatter = ({ quality }) => {
  const low = quality === "low";
  const droplets = createDroplets({ capacity: low ? 55 : 150, quality, color: "#0d2230", opacity: 0.3 });
  const tint = createColorTracker("#0d2230");
  const hsl = { h: 0, s: 0, l: 0 };
  const env = { gravity: 9.81, drag: 0.35, floor: 0, stretch: 0.008, maxDraw: 0 };
  let level = 0;
  let carry = 0;

  const update = (frame, params, radius, floor) => {
    const { state, dt, reduceMotion } = frame;
    level = approach(level, params ? clamp(params.intensity ?? 1, 0, 1) : 0, dt, 0.12);
    const color = tint.update(params?.color, dt, 0.3);
    droplets.material.color.copy(color);
    // Coloured liquids read stronger than clear ones, so tinted droplets get a little more body.
    color.getHSL(hsl);
    droplets.material.opacity = 0.16 + 0.3 * hsl.s;
    const budget = frameBudget(state, quality);
    if (level > 0.02) {
      carry += (low ? 70 : 190) * level * (reduceMotion ? 0.7 : 1) * dt;
      const room = budgetRoom(budget);
      while (carry >= 1) {
        carry -= 1;
        if (droplets.count() >= room) break;
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * radius * 0.8;
        const out = rand(0.15, 0.85) * (0.4 + level);
        droplets.emit(
          Math.cos(a) * d,
          radius * 0.2,
          Math.sin(a) * d,
          Math.cos(a) * out,
          rand(0.45, 1.35) * (0.5 + 0.5 * level),
          Math.sin(a) * out,
          rand(0.00025, 0.0009),
          rand(0.4, 1.1),
        );
      }
    } else {
      carry = 0;
    }
    env.floor = floor;
    env.maxDraw = Math.max(0, budgetRoom(budget));
    budget.used += droplets.update(dt, env);
  };

  return { object: droplets.object, update, dispose: droplets.dispose };
};

// Droplets thrown out of a mouth that arc down under gravity.
// Props: origin, radius, floor (local y where they land), get() → { intensity, color } | null.
const Spatter = ({ origin, radius = 0.02, floor = -0.18, get }) => {
  const { quality } = useKit();
  const create = useCallback(() => createSpatter({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null, radius, floor));
  return <group ref={groupRef} position={origin} />;
};

export default Spatter;
