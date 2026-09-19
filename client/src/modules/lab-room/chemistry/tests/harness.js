import { addGasMl, addPiece, addPowder, createMixture, mixIn, reagentPortion, takePortion } from "../mixture.js";
import { appearance } from "../appearance.js";
import { phOf } from "../acidity.js";
import { stepMixture } from "../engine.js";
import { CONTAINERS } from "../../sim/containers.js";

const DT = 0.05;

// fx is rewritten every step, so tests look at the strongest value seen while the run lasted.
const keepPeak = (peak, fx) => {
  for (const [key, value] of Object.entries(fx)) {
    if (typeof value === "number") peak[key] = Math.max(peak[key] ?? 0, value);
    else if (value && typeof value === "object") {
      const rate = value.rate ?? value.intensity ?? value.amount ?? 1;
      const best = peak[key]?.rate ?? peak[key]?.intensity ?? peak[key]?.amount ?? -1;
      if (rate >= best) peak[key] = value;
    }
  }
};

// One container on the bench: add reagents, run seconds of simulation, then look at what happened.
export const bench = (typeId, base = {}) => {
  const params = CONTAINERS[typeId];
  const m = createMixture(params);
  const peak = {};
  let now = 0;
  let mixes = [];
  const ctx = { container: typeId, coolWK: params.coolWK, ...base };

  const api = {
    m,
    peak,
    now: () => now,
    pour(sourceId, ml) {
      mixes.push(mixIn(m, reagentPortion(sourceId, ml, { label: sourceId })));
      return api;
    },
    // Pouring from one vessel into another, the way a student prepares a dilute acid.
    into(other, ml) {
      other.accept(takePortion(m, ml));
      return api;
    },
    accept(portion) {
      mixes.push(mixIn(m, portion));
      return api;
    },
    powder(sourceId, grams, state) {
      const entry = addPowder(m, sourceId, grams, { label: sourceId });
      if (state) entry.state = { ...entry.state, ...state };
      return api;
    },
    piece(sourceId, options) {
      addPiece(m, sourceId, { label: sourceId, ...options });
      return api;
    },
    gas(sourceId, ml, dissolveFraction = 0) {
      addGasMl(m, sourceId, ml, { label: sourceId, dissolveFraction });
      return api;
    },
    set(patch) {
      Object.assign(ctx, patch);
      return api;
    },
    run(seconds, extra = {}) {
      const events = [];
      for (let t = 0; t < seconds - 1e-9; t += DT) {
        const stepCtx = { ...ctx, ...extra, now, mixes };
        mixes = [];
        events.push(...stepMixture(m, DT, stepCtx));
        keepPeak(peak, m.fx);
        now += DT;
      }
      return events;
    },
    look: () => appearance(m),
    ph: () => phOf(m),
    aq: (id) => m.aq[id] ?? 0,
    gasOf: (id) => m.gas[id] ?? 0,
    solid: (id) => m.solids.filter((s) => s.species === id).reduce((sum, s) => sum + s.mmol, 0),
    pieceOf: (id) => m.solids.find((s) => s.species === id && s.form === "piece") ?? null,
    piecesLeft: () => m.solids.filter((s) => s.form === "piece").length,
  };
  return api;
};

export const reactions = (events) => events.filter((e) => e.type === "reaction").map((e) => e.id);

export const warnings = (events) => events.filter((e) => e.type === "warning").map((e) => e.id);

export const saw = (events, type, id) =>
  events.some((e) => e.type === type && (id === undefined || e.id === id));

export const near = (value, expected, tolerance = 0.5) =>
  Math.abs(value - expected) <= Math.abs(expected) * tolerance;
