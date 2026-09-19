import { createPuffs } from "./fxPuffs";
import { approach, budgetRoom, clamp, createColorTracker, frameBudget, rand } from "./fxCore";

// Steam: thin white wisps that only become visible a little above the mouth, then curl and dissipate.
export const createSteam = ({ quality }) => {
  const low = quality === "low";
  const puffs = createPuffs({
    capacity: low ? 22 : 56,
    color: "#ffffff",
    noiseScale: 0.42,
    softness: 0.5,
    evolve: 0.22,
    bulge: 0.3,
    sort: true,
  });
  const seed = { life: 0, size: 0, grow: 0, alpha: 0, lift: 0.16, spin: 0.3, stretch: 1.35 };
  const env = { time: 0, drag: 1.2, turbulence: 0, swirl: 26, spread: 0.004, fadeIn: 0.3, maxDraw: 0 };
  let level = 0;
  let carry = 0;
  let time = 0;

  const update = (frame, params, radius) => {
    const { state, dt } = frame;
    time += dt;
    level = approach(level, params ? clamp(params.intensity ?? 1, 0, 1) : 0, dt, 0.4);
    const budget = frameBudget(state, quality);
    if (level > 0.01) {
      carry += (low ? 9 : 20) * level * dt;
      const room = budgetRoom(budget);
      while (carry >= 1) {
        carry -= 1;
        if (puffs.count() >= room) break;
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * radius * 0.85;
        seed.life = rand(1.1, 2);
        seed.size = radius * 0.45 + 0.004;
        seed.grow = rand(0.018, 0.032);
        seed.alpha = (low ? 0.24 : 0.17) * (0.5 + 0.5 * level);
        puffs.spawn(Math.cos(a) * d, radius * 0.25 + rand(0, 0.01), Math.sin(a) * d, rand(-0.01, 0.01), 0.1 + 0.12 * level, rand(-0.01, 0.01), seed);
      }
    } else {
      carry = 0;
    }
    env.time = time;
    env.turbulence = 0.028 + 0.02 * level;
    env.maxDraw = Math.max(0, budgetRoom(budget));
    budget.used += puffs.update(dt, env, state.camera);
  };

  return { object: puffs.object, update, dispose: puffs.dispose };
};

// Smoke: a denser coloured column; toxic smoke is heavier, so it lifts less and spreads wider.
export const createSmoke = ({ quality }) => {
  const low = quality === "low";
  const puffs = createPuffs({
    capacity: low ? 34 : 96,
    color: "#d0d0d0",
    noiseScale: 0.5,
    softness: 0.45,
    evolve: 0.26,
    bulge: 0.45,
    sort: true,
  });
  const tint = createColorTracker("#d0d0d0");
  const seed = { life: 0, size: 0, grow: 0, alpha: 0, lift: 0, spin: 0.5, stretch: 1.15 };
  const env = { time: 0, drag: 1.1, turbulence: 0, swirl: 20, spread: 0, sink: 0, fadeIn: 0.18, maxDraw: 0 };
  let level = 0;
  let toxic = 0;
  let carry = 0;
  let time = 0;

  const update = (frame, params, radius) => {
    const { state, dt } = frame;
    time += dt;
    level = approach(level, params ? clamp(params.rate ?? 1, 0, 1) : 0, dt, 0.45);
    toxic = approach(toxic, params?.toxic ? 1 : 0, dt, 0.6);
    puffs.material.color.copy(tint.update(params?.color, dt, 0.4));
    const budget = frameBudget(state, quality);
    if (level > 0.01) {
      carry += (low ? 18 : 46) * level * dt;
      const room = budgetRoom(budget);
      while (carry >= 1) {
        carry -= 1;
        if (puffs.count() >= room) break;
        const a = Math.random() * Math.PI * 2;
        const d = Math.sqrt(Math.random()) * radius * 0.7;
        seed.life = rand(2, 3.4) * (1 + toxic * 0.5);
        seed.size = radius * 0.3 + 0.0035;
        seed.grow = rand(0.022, 0.045) * (1 + toxic * 0.4);
        seed.alpha = (low ? 0.28 : 0.19) * (0.55 + 0.45 * level);
        seed.lift = 0.2 * (1 - 0.8 * toxic);
        puffs.spawn(Math.cos(a) * d, radius * 0.2 + rand(0, 0.008), Math.sin(a) * d, rand(-0.012, 0.012), (0.09 + 0.1 * level) * (1 - 0.65 * toxic), rand(-0.012, 0.012), seed);
      }
    } else {
      carry = 0;
    }
    env.time = time;
    env.turbulence = 0.05 + 0.04 * level;
    env.spread = 0.006 + 0.016 * toxic;
    env.sink = 0.055 * toxic;
    env.maxDraw = Math.max(0, budgetRoom(budget));
    budget.used += puffs.update(dt, env, state.camera);
  };

  return { object: puffs.object, update, dispose: puffs.dispose };
};
