import { SPECIES } from "../chemistry/species";

// Room-scale hazards: spilled liquid, fires on those spills, gas spreading through the room, and the alarm.
// The grid covers the floor in 1 m cells; each cell holds mmol of a gas in the 2.5 m of air above it.
export const ROOM = { minX: -5, maxX: 5, minZ: -4, maxZ: 4, cell: 1, height: 2.5 };
export const COLS = Math.round((ROOM.maxX - ROOM.minX) / ROOM.cell);
export const ROWS = Math.round((ROOM.maxZ - ROOM.minZ) / ROOM.cell);
const CELL_M3 = ROOM.cell * ROOM.cell * ROOM.height;

export const GAS_SPECIES = ["Cl2", "NO2", "SO2", "NH3g", "H2S"];
// Concentration (mmol/m³) where a student starts coughing; 0.042 mmol/m³ ≈ 1 ppm.
const IRRITANT_LIMIT = { Cl2: 0.2, NO2: 0.2, SO2: 0.25, NH3g: 1, H2S: 0.4 };
// How strongly each gas colours the air.
const HAZE = {
  Cl2: { color: "#c9d94a", k: 0.5 },
  NO2: { color: "#a0461e", k: 0.8 },
  SO2: { color: "#e8e8e8", k: 0.12 },
  NH3g: { color: "#eaeaea", k: 0.1 },
  H2S: { color: "#e2e2d8", k: 0.1 },
};

const DIFFUSION = 0.06;
const LEAK_PER_S = 0.015;
const VENT_PER_S = 0.12;
const HOOD_PER_S = 0.7;
// Spilled liquid: how wide a millilitre spreads, how fast it dries, how long a millilitre of ethanol burns.
const SPREAD_M2_PER_ML = 0.0022;
const DRY_PER_S = 0.004;
const BURN_S_PER_ML = 22;
const SPREAD_REACH = 0.45;
const IGNITE_REACH = 0.4;
const ALARM_FIRE_S = 4;

export const FUME_HOOD = { minX: -4.93, maxX: -4.15, minZ: -1.48, maxZ: -0.22 };

export const inFumeHood = (position) =>
  position[0] >= FUME_HOOD.minX && position[0] <= FUME_HOOD.maxX && position[2] >= FUME_HOOD.minZ && position[2] <= FUME_HOOD.maxZ;

const JET_REACH = 2.2;
const JET_DOT = 0.72;

const inJet = (spray, position) => {
  const dx = position[0] - spray.origin[0];
  const dy = position[1] - spray.origin[1];
  const dz = position[2] - spray.origin[2];
  const distance = Math.hypot(dx, dy, dz);
  if (distance > JET_REACH) return false;
  const dot = (dx * spray.direction[0] + dy * spray.direction[1] + dz * spray.direction[2]) / Math.max(distance, 1e-3);
  return dot >= JET_DOT;
};

const cellIndex = (x, z) => {
  const col = Math.min(COLS - 1, Math.max(0, Math.floor((x - ROOM.minX) / ROOM.cell)));
  const row = Math.min(ROWS - 1, Math.max(0, Math.floor((z - ROOM.minZ) / ROOM.cell)));
  return row * COLS + col;
};

export const cellCenter = (index) => [
  ROOM.minX + (index % COLS) * ROOM.cell + ROOM.cell / 2,
  0,
  ROOM.minZ + Math.floor(index / COLS) * ROOM.cell + ROOM.cell / 2,
];

const hazeOf = (concentrations) => {
  let alpha = 0;
  let weight = 0;
  let heavy = 0;
  const rgb = [0, 0, 0];
  for (const id of GAS_SPECIES) {
    const c = concentrations[id] ?? 0;
    if (c <= 0) continue;
    const { color, k } = HAZE[id];
    const a = 1 - Math.exp(-k * c);
    const parts = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
    for (let i = 0; i < 3; i += 1) rgb[i] += parts[i] * a;
    weight += a;
    if (SPECIES[id].rel > 1.2) heavy += a;
    alpha = 1 - (1 - alpha) * (1 - a);
  }
  if (weight <= 0) return { color: "#ffffff", alpha: 0, heavy: 1 };
  const hex = rgb.map((v) => Math.round(Math.min(1, v / weight) * 255).toString(16).padStart(2, "0")).join("");
  // `heavy` (0..1) tells a renderer how low in the room this mixture hangs.
  return { color: `#${hex}`, alpha, heavy: heavy / weight };
};

export const createHazards = () => {
  const gas = Object.fromEntries(GAS_SPECIES.map((id) => [id, new Float32Array(COLS * ROWS)]));
  const scratch = new Float32Array(COLS * ROWS);
  const state = {
    puddles: [],
    gas,
    devices: { hoodFan: false, ventilation: false },
    alarm: { active: false, since: 0, reason: null, fireSince: 0 },
    // What the player is feeling right now, for the screen effects.
    exposure: { irritant: 0, heat: 0, flash: 0, ringing: 0, species: null },
    spray: null,
    now: 0,
    nextId: 1,
    generation: 0,
  };

  const spread = (dt) => {
    for (const id of GAS_SPECIES) {
      const field = gas[id];
      const heavy = SPECIES[id].rel > 1.2 ? 0.7 : 1;
      scratch.set(field);
      for (let row = 0; row < ROWS; row += 1) {
        for (let col = 0; col < COLS; col += 1) {
          const i = row * COLS + col;
          let sum = 0;
          let n = 0;
          if (col > 0) { sum += scratch[i - 1]; n += 1; }
          if (col < COLS - 1) { sum += scratch[i + 1]; n += 1; }
          if (row > 0) { sum += scratch[i - COLS]; n += 1; }
          if (row < ROWS - 1) { sum += scratch[i + COLS]; n += 1; }
          const mixed = (sum - n * scratch[i]) * DIFFUSION * heavy * dt;
          const center = cellCenter(i);
          const hood = inFumeHood(center) ? (state.devices.hoodFan ? HOOD_PER_S : HOOD_PER_S * 0.15) : 0;
          const vent = LEAK_PER_S + (state.devices.ventilation ? VENT_PER_S : 0) + hood;
          field[i] = Math.max(0, (scratch[i] + mixed) * Math.exp(-vent * dt));
        }
      }
    }
  };

  const burn = (dt, events) => {
    for (const puddle of state.puddles) {
      if (puddle.burning) {
        const burned = Math.min(puddle.ml, (puddle.flammableMl / BURN_S_PER_ML) * dt);
        puddle.ml -= burned;
        puddle.flammableMl = Math.max(0, puddle.flammableMl - burned);
        if (puddle.flammableMl <= 0.01 || puddle.ml <= 0.02) {
          puddle.burning = false;
          puddle.scorch = Math.min(1, (puddle.scorch ?? 0) + 0.6);
          events.push({ type: "extinguish", position: puddle.position });
        }
      } else {
        puddle.ml = Math.max(0, puddle.ml - DRY_PER_S * dt * (1 + puddle.warm));
      }
      puddle.radius = Math.sqrt((puddle.ml * SPREAD_M2_PER_ML) / Math.PI);
    }
    // Kept in place: renderers hold this array.
    for (let i = state.puddles.length - 1; i >= 0; i -= 1) {
      const p = state.puddles[i];
      if (p.ml <= 0.01 && p.scorch <= 0.05) {
        state.puddles.splice(i, 1);
        state.generation += 1;
      }
    }
  };

  const spreadFire = (dt, events) => {
    for (const source of state.puddles) {
      if (!source.burning) continue;
      for (const target of state.puddles) {
        if (target.burning || !target.flammableMl) continue;
        const d = Math.hypot(target.position[0] - source.position[0], target.position[2] - source.position[2]);
        if (d > SPREAD_REACH + source.radius + target.radius) continue;
        target.heat = (target.heat ?? 0) + dt;
        if (target.heat > 1.2) {
          target.burning = true;
          events.push({ type: "ignite", position: target.position, spread: true });
        }
      }
    }
  };

  const hazards = {
    state,
    puddles: state.puddles,
    devices: state.devices,
    alarm: state.alarm,
    exposure: state.exposure,
    now: () => state.now,
    generation: () => state.generation,

    // A spilled portion of a mixture; `look` and flammability come from the chemistry.
    spill: (position, { ml, color, opacity, flammableMl = 0, acidic = false, surface = "bench", hot = false }) => {
      if (ml <= 0.05) return null;
      const near = state.puddles.find(
        (p) => Math.hypot(p.position[0] - position[0], p.position[2] - position[2]) < 0.12 && Math.abs(p.position[1] - position[1]) < 0.2,
      );
      if (near) {
        near.ml += ml;
        near.flammableMl += flammableMl;
        near.acidic = near.acidic || acidic;
        near.warm = hot ? 1 : near.warm;
        return near;
      }
      const puddle = {
        id: `p${state.nextId++}`,
        position: [...position],
        surface,
        ml,
        flammableMl,
        acidic,
        color,
        opacity,
        burning: false,
        heat: 0,
        warm: hot ? 1 : 0,
        scorch: 0,
        radius: 0,
        bornAt: state.now,
      };
      state.puddles.push(puddle);
      state.generation += 1;
      return puddle;
    },

    igniteNear: (position, reach = IGNITE_REACH) => {
      let lit = false;
      for (const puddle of state.puddles) {
        if (puddle.burning || puddle.flammableMl <= 0.02) continue;
        const d = Math.hypot(puddle.position[0] - position[0], puddle.position[2] - position[2]);
        if (d > reach + puddle.radius || Math.abs(puddle.position[1] - position[1]) > 0.6) continue;
        puddle.burning = true;
        lit = true;
      }
      return lit;
    },

    // Gas that escaped a container; inside a running fume hood almost nothing reaches the room.
    addGas: (id, position, mmol) => {
      if (!gas[id] || mmol <= 0) return;
      const captured = inFumeHood(position) ? (state.devices.hoodFan ? 0.95 : 0.45) : 0;
      gas[id][cellIndex(position[0], position[2])] += mmol * (1 - captured);
    },

    concentrations: (position) => {
      const i = cellIndex(position[0], position[2]);
      const out = {};
      for (const id of GAS_SPECIES) out[id] = gas[id][i] / CELL_M3;
      return out;
    },

    haze: (position) => hazeOf(hazards.concentrations(position)),
    hazeOfCell: (index) => {
      const out = {};
      for (const id of GAS_SPECIES) out[id] = gas[id][index] / CELL_M3;
      return hazeOf(out);
    },

    fires: () => state.puddles.filter((p) => p.burning),

    setDevice: (key, value) => {
      state.devices[key] = value;
      state.generation += 1;
    },

    // The extinguisher jet: a cone that puts out puddle fires and cools what it hits.
    sprayAt: (origin, direction) => {
      state.spray = { origin: [...origin], direction: [...direction], at: state.now };
      let hit = 0;
      for (const puddle of state.puddles) {
        if (!inJet(state.spray, puddle.position)) continue;
        puddle.burning = false;
        puddle.heat = 0;
        puddle.warm = 0;
        hit += 1;
      }
      return hit;
    },

    // True while the jet is washing over this point, so the runtime can flood that container with CO2.
    sprayCovers: (position) => Boolean(state.spray) && inJet(state.spray, position),

    step: (dt, { playerPosition, containerFires = [], heatSources = [] } = {}) => {
      const events = [];
      state.now += dt;
      spread(dt);
      burn(dt, events);
      spreadFire(dt, events);

      const fires = state.puddles.filter((p) => p.burning).map((p) => ({ position: p.position, power: Math.min(1, p.flammableMl / 3) }));
      for (const fire of containerFires) fires.push(fire);
      for (const source of heatSources) {
        if (source.hot) hazards.igniteNear(source.position, 0.3);
      }

      // Alarm: a fire that keeps burning, or air that is clearly dangerous.
      const worst = playerPosition ? hazards.irritantAt(playerPosition) : 0;
      const burningS = fires.length ? (state.alarm.fireSince ? state.now - state.alarm.fireSince : 0) : 0;
      if (fires.length && !state.alarm.fireSince) state.alarm.fireSince = state.now;
      if (!fires.length) state.alarm.fireSince = 0;
      const shouldAlarm = burningS > ALARM_FIRE_S || worst > 1.2;
      if (shouldAlarm && !state.alarm.active) {
        Object.assign(state.alarm, { active: true, since: state.now, reason: fires.length ? "fire" : "gas" });
        state.generation += 1;
        events.push({ type: "alarm", reason: state.alarm.reason });
      } else if (!shouldAlarm && state.alarm.active && state.now - state.alarm.since > 6) {
        Object.assign(state.alarm, { active: false, reason: null });
        state.generation += 1;
      }

      if (playerPosition) {
        const irritant = hazards.irritantAt(playerPosition);
        let heat = 0;
        for (const fire of fires) {
          const d = Math.hypot(fire.position[0] - playerPosition[0], fire.position[2] - playerPosition[2]);
          heat = Math.max(heat, Math.min(1, (fire.power * 1.6) / Math.max(0.6, d * d)));
        }
        const ease = 1 - Math.exp(-dt / 1.2);
        state.exposure.irritant += (Math.min(1.5, irritant) - state.exposure.irritant) * ease;
        state.exposure.heat += (heat - state.exposure.heat) * ease;
        state.exposure.flash = Math.max(0, state.exposure.flash - dt * 2.2);
        state.exposure.ringing = Math.max(0, state.exposure.ringing - dt * 0.35);
        state.exposure.species = hazards.worstGasAt(playerPosition);
      }
      if (state.spray && state.now - state.spray.at > 0.2) state.spray = null;
      return events;
    },

    irritantAt: (position) => {
      const c = hazards.concentrations(position);
      let worst = 0;
      for (const id of GAS_SPECIES) worst = Math.max(worst, c[id] / IRRITANT_LIMIT[id]);
      return worst;
    },

    worstGasAt: (position) => {
      const c = hazards.concentrations(position);
      let worst = null;
      let value = 0;
      for (const id of GAS_SPECIES) {
        const ratio = c[id] / IRRITANT_LIMIT[id];
        if (ratio > value) {
          value = ratio;
          worst = id;
        }
      }
      return value > 0.25 ? worst : null;
    },

    blast: (strength) => {
      state.exposure.flash = Math.min(1, state.exposure.flash + strength);
      state.exposure.ringing = Math.min(1, state.exposure.ringing + strength * 0.9);
    },

    reset: () => {
      state.puddles.length = 0;
      for (const id of GAS_SPECIES) gas[id].fill(0);
      Object.assign(state.alarm, { active: false, since: 0, reason: null, fireSince: 0 });
      Object.assign(state.exposure, { irritant: 0, heat: 0, flash: 0, ringing: 0, species: null });
      Object.assign(state.devices, { hoodFan: false, ventilation: false });
      state.spray = null;
      state.now = 0;
      state.generation += 1;
    },
  };
  return hazards;
};
