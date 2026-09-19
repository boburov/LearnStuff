import { useCallback } from "react";
import { useKit } from "../equipment/kit/kitContext";
import { budgetRoom, frameBudget, rand, useFxSystem } from "./fxCore";
import { createPuffs } from "./fxPuffs";

// Carbon dioxide leaves the horn at speed, expands into a cold white cone and then sinks to the floor.
const SPEED = 7;
const SPREAD = 0.55;

const createJet = ({ quality }) => {
  const low = quality === "low";
  const puffs = createPuffs({
    capacity: low ? 40 : 110,
    color: "#f2f6f8",
    noiseScale: 0.7,
    softness: 0.35,
    evolve: 0.9,
    bulge: 0.5,
    sort: true,
  });
  const seed = { life: 0, size: 0, grow: 0, alpha: 0, lift: 0, spin: 1.2, stretch: 1.1 };
  const env = { time: 0, drag: 2.2, turbulence: 0.5, swirl: 3, sink: 0.9, fadeIn: 0.08, maxDraw: 0 };
  let carry = 0;
  let time = 0;

  const update = (frame, spray) => {
    const { state, dt } = frame;
    time += dt;
    const budget = frameBudget(state, quality);
    if (spray) {
      const [ox, oy, oz] = spray.origin;
      const [dx, dy, dz] = spray.direction;
      // Two perpendicular axes so the cone widens evenly around the aim.
      // Helper axis: world up, or world x when the jet points nearly straight up or down.
      const hx = Math.abs(dy) < 0.9 ? 0 : 1;
      const hy = Math.abs(dy) < 0.9 ? 1 : 0;
      let px = -dz * hy;
      let py = dz * hx;
      let pz = dx * hy - dy * hx;
      const plen = Math.hypot(px, py, pz) || 1;
      px /= plen;
      py /= plen;
      pz /= plen;
      const qx = dy * pz - dz * py;
      const qy = dz * px - dx * pz;
      const qz = dx * py - dy * px;
      carry += (low ? 26 : 60) * dt;
      const room = budgetRoom(budget);
      while (carry >= 1) {
        carry -= 1;
        if (puffs.count() >= room) break;
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * SPREAD;
        const sx = (px * Math.cos(a) + qx * Math.sin(a)) * r;
        const sy = (py * Math.cos(a) + qy * Math.sin(a)) * r;
        const sz = (pz * Math.cos(a) + qz * Math.sin(a)) * r;
        const speed = SPEED * rand(0.55, 1);
        seed.life = rand(0.35, 0.75);
        seed.size = rand(0.04, 0.09);
        seed.grow = rand(0.5, 0.95);
        seed.alpha = rand(0.3, 0.55);
        puffs.spawn(ox, oy, oz, dx * speed + sx * speed * 0.45, dy * speed + sy * speed * 0.45, dz * speed + sz * speed * 0.45, seed);
      }
    } else {
      carry = 0;
    }
    env.time = time;
    env.maxDraw = Math.max(0, budgetRoom(budget));
    budget.used += puffs.update(dt, env, state.camera);
  };

  return { object: puffs.object, update, dispose: puffs.dispose };
};

// The extinguisher's jet while the player holds the trigger.
const Co2Jet = ({ lab }) => {
  const { quality } = useKit();
  const create = useCallback(() => createJet({ quality }), [quality]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, lab.activity.spray ?? null));
  return <group ref={groupRef} />;
};

export default Co2Jet;
