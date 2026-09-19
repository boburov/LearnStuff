import { ROOM_C, SPECIES } from "./species";
import * as mixture from "./mixture";
import { phOf } from "./acidity";
import { RULES } from "./rules";

const { EPS } = mixture;
const LATENT_J_PER_G = 2260;
const ANNOUNCE_IDLE_S = 8;
const FINISH_MMOL = 0.002;

// Boiling point of the liquid as a whole: ethanol-rich mixtures boil early, concentrated acids and glycerin never do here.
const boilingPoint = (m) => {
  const water = mixture.aq(m, "H2O") * 0.018;
  const ethanol = mixture.aq(m, "C2H5OH") * 0.046;
  const glycerol = mixture.aq(m, "C3H8O3") * 0.092;
  const liquidG = water + ethanol + glycerol;
  if (liquidG <= EPS) return Infinity;
  if (mixture.sulfuricFraction(m) > 0.8 || glycerol / liquidG > 0.8) return Infinity;
  return ethanol / liquidG > 0.5 ? 78 : 100;
};

const writeFx = (m, key, value) => {
  const current = m.fx[key];
  if (typeof value === "number") m.fx[key] = Math.max(current ?? 0, value);
  else m.fx[key] = value;
};

// Helpers handed to every rule: the mixture API plus rate shapes, heat, gas and effect writers.
export const kit = {
  ...mixture,
  ph: phOf,
  // Amount reacting this step for a process with time constant `tau` (s); ~95 % is done after 3·tau, traces finish at once.
  fast: (available, dt, tau = 0.25) => {
    if (available <= EPS) return 0;
    const left = available * Math.exp(-dt / tau);
    return left < FINISH_MMOL ? available : available - left;
  },
  // Shrinking solid (surface-limited): a lone piece or heap in excess reagent is gone after `seconds` × `factor`⁻¹.
  shrink: (s, dt, seconds, factor = 1) => {
    if (s.mmol <= EPS || factor <= 0) return 0;
    const start = Math.max(s.startMmol ?? s.mmol, s.mmol);
    const n = ((3 * Math.cbrt(start) * Math.cbrt(s.mmol) ** 2) / seconds) * factor * dt;
    return s.mmol - n < FINISH_MMOL ? s.mmol : n;
  },
  // Rate multiplier for temperature: doubles every `per` degrees above room temperature.
  warmth: (m, per = 10) => 2 ** ((m.tempC - ROOM_C) / per),
  // kJ per mol × mmol = J. Positive = heat released (exothermic).
  heat: (m, kjPerMol, mmol) => mixture.addHeat(m, kjPerMol * mmol),
  // Gas made inside the liquid rises as bubbles, then joins the headspace.
  evolveGas: (m, id, mmol, dt, { site = "bottom" } = {}) => {
    if (mmol <= EPS) return;
    mixture.addGas(m, id, mmol);
    if (m.volumeMl <= EPS) return;
    const rate = mmol / Math.max(dt, 1e-3);
    const bubbles = m.fx.bubbles ?? { rate: 0, site, gas: id, top: 0 };
    bubbles.rate += rate;
    // The strongest source this step decides where bubbles start.
    if (rate > bubbles.top) Object.assign(bubbles, { site, gas: id, top: rate });
    m.fx.bubbles = bubbles;
  },
  fx: writeFx,
  emit: (events, type, payload = {}) => events.push({ type, ...payload }),
  // Per-rule persistent state (delays, phases) that survives between steps.
  state: (m, ruleId, init) => {
    if (!m.rules[ruleId]) m.rules[ruleId] = { ...init };
    return m.rules[ruleId];
  },
};

const heatAndCool = (m, dt, ctx) => {
  if (ctx.heatW) mixture.addHeat(m, ctx.heatW * dt);
  if (ctx.plateC != null) mixture.addHeat(m, (ctx.plateWK ?? 3) * (ctx.plateC - m.tempC) * dt);
  const coolWK = ctx.coolWK ?? 0.6;
  const tau = mixture.heatCapacity(m) / coolWK;
  m.tempC = ROOM_C + (m.tempC - ROOM_C) * Math.exp(-dt / tau);
};

const boil = (m, dt, events) => {
  const bp = boilingPoint(m);
  if (m.tempC <= bp) return;
  const grams = ((m.tempC - bp) * mixture.heatCapacity(m)) / LATENT_J_PER_G;
  const water = mixture.aq(m, "H2O") * 0.018;
  const ethanol = mixture.aq(m, "C2H5OH") * 0.046;
  const liquidG = water + ethanol;
  if (liquidG > EPS) {
    const share = Math.min(1, grams / liquidG);
    mixture.takeAq(m, "H2O", mixture.aq(m, "H2O") * share);
    mixture.takeAq(m, "C2H5OH", mixture.aq(m, "C2H5OH") * share);
    m.volumeMl = Math.max(0, m.volumeMl - grams);
  }
  m.tempC = bp;
  writeFx(m, "boiling", Math.min(1, grams / dt / 0.04));
  writeFx(m, "steam", Math.min(1, grams / dt / 0.03));
  if (m.volumeMl <= 0.05 && liquidG > EPS) events.push({ type: "dry" });
};

const settle = (m, dt, ctx) => {
  for (const s of m.solids) {
    if (s.form !== "ppt" && s.form !== "powder") continue;
    const sp = SPECIES[s.species];
    if (m.volumeMl <= EPS || sp.floats) {
      s.suspended = 0;
      continue;
    }
    if (ctx.stirring) s.suspended += (0.85 - s.suspended) * (1 - Math.exp(-dt / 0.6));
    else if (s.suspended > 0) s.suspended *= Math.exp(-dt / ((sp.settleS ?? 6) / 3));
  }
};

const GAS_REPORT_S = 1;

// Escaping toxic gas is summed and reported about once a second, not on every step.
const vent = (m, dt, ctx, events) => {
  const escaped = mixture.ventGas(m, dt, { covered: ctx.covered });
  const pending = m.rules["@gas"] ?? (m.rules["@gas"] = { since: 0, mmol: {} });
  for (const [id, mmol] of Object.entries(escaped)) {
    if (!SPECIES[id].toxic) continue;
    pending.mmol[id] = (pending.mmol[id] ?? 0) + mmol;
  }
  pending.since += dt;
  if (pending.since < GAS_REPORT_S) return;
  for (const [id, mmol] of Object.entries(pending.mmol)) {
    if (mmol > 1e-5) events.push({ type: "gas", species: id, mmol, perSecond: mmol / pending.since });
  }
  pending.since = 0;
  pending.mmol = {};
};

// Reports a reaction to the player once it has made a visible amount, again after it went quiet for a while.
const track = (m, rule, progress, now, events) => {
  if (!rule.info) return;
  const entry = m.rules[`@${rule.id}`] ?? (m.rules[`@${rule.id}`] = { total: 0, last: -Infinity, announced: false });
  if (progress > EPS) {
    if (now - entry.last > ANNOUNCE_IDLE_S) {
      entry.total = 0;
      entry.announced = false;
    }
    entry.total += progress;
    entry.last = now;
    if (!entry.announced && entry.total >= (rule.notice ?? 0.01)) {
      entry.announced = true;
      events.push({ type: "reaction", id: rule.info });
    }
  }
};

// Advances one container by dt seconds; see docs/product-blueprint/15 for ctx fields and event types.
export const stepMixture = (m, dt, ctx = {}) => {
  const events = [];
  const now = ctx.now ?? 0;
  m.fx = {};
  heatAndCool(m, dt, ctx);
  for (const rule of RULES) {
    const progress = rule.step(m, dt, ctx, kit, events) ?? 0;
    track(m, rule, progress, now, events);
  }
  boil(m, dt, events);
  settle(m, dt, ctx);
  vent(m, dt, ctx, events);
  return events;
};

export { RULES };
