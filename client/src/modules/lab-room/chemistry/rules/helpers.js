import { gasFraction } from "../mixture";

export const AIR_O2 = 0.21;

const ownGasTotal = (m) => Object.keys(m.gas).reduce((sum, id) => sum + gasFraction(m, id), 0);

// The gas the contents actually sit in: the runtime's atmosphere, else the container's own headspace over displaced air.
export const atm = (m, ctx, id) => {
  const own = gasFraction(m, id);
  const given = ctx.atmosphere?.[id];
  if (given != null) return Math.max(given, own);
  if (id !== "O2") return own;
  // A covered vessel, or a deep gas jar, keeps its own atmosphere; anywhere else fresh air reaches the mouth.
  const sealed = ctx.covered || m.capacityMl >= 400;
  if (!sealed) return Math.max(own, AIR_O2);
  return Math.max(own, AIR_O2 * Math.max(0, 1 - ownGasTotal(m)));
};

// Safety pop-ups repeat only after a cooldown, so a long reaction warns once.
export const warnOnce = (k, m, events, ctx, id, cooldown = 30) => {
  const seen = k.state(m, `warn:${id}`, { at: -Infinity });
  const now = ctx.now ?? 0;
  if (now - seen.at < cooldown) return false;
  seen.at = now;
  k.emit(events, "warning", { id });
  return true;
};

// Toxic gas leaving an open container in the room.
export const toxicWarn = (k, m, events, ctx) => {
  if (ctx.inFumeHood || ctx.covered) return;
  warnOnce(k, m, events, ctx, "toxic-outside-hood", 45);
};

export const solidsOf = (m, id) => m.solids.filter((s) => s.species === id && s.form !== "coat" && s.form !== "crystals");

export const piecesOf = (m, id) => m.solids.filter((s) => s.species === id && s.form === "piece");

// A rule's own saved state without creating it, to let one rule notice what another one is doing.
export const peek = (m, ruleId) => m.rules[ruleId] ?? null;

// Surface-limited shrinking, but never faster than using up the limiting reactant in `seconds`.
export const consume = (k, m, s, dt, seconds, factor, pool) => {
  const limit = Math.min(s.mmol, pool);
  if (limit <= k.EPS || factor <= 0) return 0;
  const surface = k.shrink(s, dt, seconds, factor);
  // With the reagent in excess the surface sets the pace; when it runs short, the reagent does.
  const paced = pool >= s.mmol ? surface : Math.min(surface, k.fast(limit, dt, seconds / 3) * factor);
  // The last specks of a piece go at once instead of trailing off for ever.
  const trace = s.mmol < 0.01 * (s.startMmol ?? s.mmol) ? s.mmol : 0;
  return Math.min(limit, Math.max(paced, trace));
};

// Bubbles that pile up as foam in a narrow or nearly full container.
export const foamFrom = (k, m, mmolPerS) => {
  if (m.volumeMl <= k.EPS) return;
  const headroom = Math.max(2, m.capacityMl - m.volumeMl);
  k.fx(m, "foam", Math.min(1, (mmolPerS * 96) / headroom));
};
