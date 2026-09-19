import { useCallback } from "react";
import { Color, Vector3 } from "three";
import { useThree } from "@react-three/fiber";
import { useKit } from "../equipment/kit/kitContext";
import { approach, clamp, useFxSystem } from "./fxCore";
import { createGlow } from "./fxGlow";
import { acquireLight } from "./fxLight";

// Photosensitivity guard: at most three flashes a second across the whole room.
const MIN_GAP = 1 / 3;
const gates = new WeakMap();

const _world = new Vector3();

const createFlash = ({ quality, scene }) => {
  const low = quality === "low";
  const glow = createGlow({ core: 10, pull: 0.6 });
  const light = low ? null : acquireLight(scene);
  const color = new Color("#ffffff");
  const target = new Color("#ffffff");
  let hex = "#ffffff";
  let value = 0;
  let holding = false;

  const update = (frame, params) => {
    const { state, dt, reduceMotion } = frame;
    let gate = gates.get(scene);
    if (!gate) {
      gate = { last: -10 };
      gates.set(scene, gate);
    }
    const now = state.clock.elapsedTime;
    const want = params ? clamp(params.strength ?? 1, 0, 1) * (reduceMotion ? 0.35 : 1) : 0;
    if (params?.color && params.color !== hex) {
      hex = params.color;
      target.set(hex);
    }
    color.lerp(target, 1 - Math.exp(-dt / 0.05));

    if (want > value) {
      const gap = reduceMotion ? 0.5 : MIN_GAP;
      if (value < 0.02 && !holding) {
        if (now - gate.last >= gap) {
          gate.last = now;
          holding = true;
        }
      }
      if (holding) value = approach(value, want, dt, 0.02);
    } else {
      holding = false;
      value = approach(value, want, dt, 0.13);
    }

    const size = 0.035 + 0.1 * value;
    glow.set(color, value * (low ? 2.2 : 3.2), value > 0.004 ? size : 0);
    if (light) {
      glow.object.getWorldPosition(_world);
      light.offer(now, _world, color, value * 0.35, 4);
    }
  };

  return {
    object: glow.object,
    update,
    dispose: () => {
      glow.dispose();
      light?.release();
    },
  };
};

// Brief light pulse for pops and bangs. Props: origin, get() → { color, strength } | null.
const FlashLight = ({ origin, get }) => {
  const { quality } = useKit();
  const scene = useThree((s) => s.scene);
  const create = useCallback(() => createFlash({ quality, scene }), [quality, scene]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null));
  return <group ref={groupRef} position={origin} />;
};

export default FlashLight;
