import { useCallback } from "react";
import { Color, Group } from "three";
import { useThree } from "@react-three/fiber";
import { useKit } from "../equipment/kit/kitContext";
import { approach, clamp, useFxSystem } from "./fxCore";
import { createFireEffect } from "./fxFireEffect";
import { createGlow } from "./fxGlow";

const WICK_GLOW = new Color("#ff7a2a");

const createLamp = ({ quality, scene }) => {
  const object = new Group();
  const fire = createFireEffect({ quality, scene, extras: false });
  const ember = createGlow({ core: 70, pull: 0.3 });
  ember.object.position.set(0, -0.001, 0);
  object.add(fire.object, ember.object);
  const mods = { heightScale: 1, radiusScale: 1, brightness: 1, turbulence: 0, lean: [0, 0], rise: 1 };
  let boost = 0;
  let dousing = 0;

  const update = (frame, params, leanAxis) => {
    const { dt } = frame;
    boost = approach(boost, clamp(params?.boost ?? 0, 0, 2), dt, 0.3);
    dousing = approach(dousing, clamp(params?.dousing ?? 0, 0, 1), dt, 0.25);
    // CO₂ smothers the flame: it leans away, shrinks and finally goes out.
    const alive = clamp(1 - dousing * 1.08, 0, 1);
    const intensity = (params ? clamp(params.intensity ?? 1, 0, 1) : 0) * alive;
    mods.heightScale = (1 + 0.55 * boost) * (1 - 0.65 * dousing);
    mods.radiusScale = 1 + 0.1 * boost + 0.3 * dousing;
    mods.brightness = (1 + 1.1 * boost) * (1 - 0.45 * dousing);
    mods.turbulence = 0.12 * boost + 0.4 * dousing;
    mods.lean[0] = leanAxis[0] * dousing * 0.8;
    mods.lean[1] = leanAxis[1] * dousing * 0.8;
    mods.rise = 1 + 0.9 * boost + 0.4 * dousing;
    const level = fire.update(frame, params ? "lamp" : null, intensity, 0.0024, mods);
    ember.set(WICK_GLOW, level * 0.5 + (1 - level) * 0.15 * Math.max(0, 1 - dousing), level > 0.01 ? 0.0045 : 0);
  };

  return {
    object,
    update,
    dispose: () => {
      fire.dispose();
      ember.dispose();
    },
  };
};

// Spirit lamp wick flame; origin is the wick tip. Props: origin, leanAxis (dousing direction),
// get() → { intensity, boost 0..2, dousing 0..1 } | null.
const LampFlame = ({ origin, leanAxis = [1, 0], get }) => {
  const { quality } = useKit();
  const scene = useThree((s) => s.scene);
  const create = useCallback(() => createLamp({ quality, scene }), [quality, scene]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null, leanAxis));
  return <group ref={groupRef} position={origin} />;
};

export default LampFlame;
