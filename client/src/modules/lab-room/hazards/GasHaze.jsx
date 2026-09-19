import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { COLS, ROWS, ROOM, cellCenter } from "./hazardStore";
import { budgetRoom, createColorTracker, frameBudget, rand, useFxSystem } from "../effects/fxCore";
import { createPuffs } from "../effects/fxPuffs";

// Room air is drawn as a few slow, wide puffs per gassy cell rather than a volume the school PCs can't afford.
const VISIBLE = 0.02;
const PUFF_S = 9;
const NEAR_M = 1.3;

const createHaze = ({ quality }) => {
  const low = quality === "low";
  const puffs = createPuffs({
    capacity: low ? 22 : 64,
    color: "#ffffff",
    noiseScale: 0.22,
    softness: 0.42,
    evolve: 0.06,
    bulge: 0.25,
    sort: true,
  });
  const tint = createColorTracker("#ffffff");
  const env = { time: 0, drag: 0.8, turbulence: 0.03, swirl: 0.35, sink: 0.01, fadeIn: 0.3, maxDraw: 0 };
  let carry = 0;

  const update = (frame, hazards, eye) => {
    const { state, dt } = frame;
    const budget = frameBudget(state, quality);
    env.time = state.clock.elapsedTime;
    env.maxDraw = Math.max(0, budgetRoom(budget));

    let strongest = { alpha: 0, color: "#ffffff", heavy: 1 };
    let total = 0;
    const cells = [];
    for (let i = 0; i < COLS * ROWS; i += 1) {
      const haze = hazards.hazeOfCell(i);
      if (haze.alpha < VISIBLE) continue;
      const [x, , z] = cellCenter(i);
      total += haze.alpha;
      if (haze.alpha > strongest.alpha) strongest = haze;
      // A puff right in front of the eyes reads as a wall; the screen overlay carries the close-up instead.
      if (eye && Math.hypot(x - eye[0], z - eye[2]) < NEAR_M) continue;
      cells.push({ i, haze });
    }
    puffs.material.color.copy(tint.update(strongest.color, dt, 1.2));

    // Each cell keeps roughly one puff per second of its own density alive.
    carry += Math.min(14, 3 + total * 4) * dt;
    while (carry >= 1 && cells.length) {
      carry -= 1;
      const pick = cells[Math.floor(Math.random() * cells.length)];
      const [x, , z] = cellCenter(pick.i);
      const heavy = pick.haze.heavy;
      const y = heavy > 0.5 ? rand(0.35, 1.5) : rand(1.1, 2.2);
      puffs.spawn(x + rand(-0.5, 0.5) * ROOM.cell, y, z + rand(-0.5, 0.5) * ROOM.cell, rand(-0.05, 0.05), 0, rand(-0.05, 0.05), {
        life: PUFF_S,
        size: rand(1, 1.6),
        grow: 0.06,
        alpha: Math.min(0.55, 0.06 + pick.haze.alpha * 3),
        lift: heavy > 0.5 ? -0.01 : 0.02,
        spin: 0.12,
      });
    }
    budget.used += puffs.update(dt, env, state.camera);
  };

  return { object: puffs.object, update, dispose: puffs.dispose };
};

// The gas that escaped into the room, hanging where the grid says it is.
const GasHaze = ({ lab }) => {
  const { quality } = useKit();
  const create = useCallback(() => createHaze({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, lab.hazards, lab.activity.cameraPosition));
  return <group ref={groupRef} />;
};

export default GasHaze;
