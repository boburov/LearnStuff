import { GAS_ML_PER_MMOL, ROOM_C, SPECIES, species } from "./species";
import { SOURCES, gasMmol } from "./sources";

export const EPS = 1e-7;

// Heat capacity per mmol for solutes that dominate concentrated acids (J/K); other ions are negligible.
const SOLUTE_CP = { "SO4 2-": 0.14, "NO3-": 0.11, "H+": 0.005, H2O2: 0.05, NH3: 0.04, Sucrose: 0.4 };
const SOLID_CP_PER_G = 0.8;

// A container's contents. Everything is plain data so it can be copied, tested in Node and inspected in dev tools.
export const createMixture = ({ capacityMl = 250, vesselHeatJK = 10, narrow = false } = {}) => ({
  volumeMl: 0,
  aq: {},
  solids: [],
  gas: {},
  tempC: ROOM_C,
  history: [],
  fx: {},
  rules: {},
  capacityMl,
  vesselHeatJK,
  narrow,
});

export const aq = (m, id) => m.aq[id] ?? 0;
export const conc = (m, id) => (m.volumeMl > EPS ? (aq(m, id) / m.volumeMl) : 0);

export const addAq = (m, id, mmol) => {
  const next = aq(m, id) + mmol;
  if (next <= EPS) delete m.aq[id];
  else m.aq[id] = next;
};

// Takes up to `mmol` and returns what was actually available.
export const takeAq = (m, id, mmol) => {
  const taken = Math.min(aq(m, id), Math.max(0, mmol));
  addAq(m, id, -taken);
  return taken;
};

export const findSolid = (m, id, form) => m.solids.find((s) => s.species === id && (!form || s.form === form)) ?? null;

export const solidMmol = (m, id, form) =>
  m.solids.reduce((sum, s) => (s.species === id && (!form || s.form === form) ? sum + s.mmol : sum), 0);

// form: powder | piece | ppt | coat | crystals | residue. Precipitates start suspended and settle.
export const addSolid = (m, id, form, mmol, extra = {}) => {
  species(id);
  if (mmol <= EPS) return null;
  let entry = findSolid(m, id, form);
  if (!entry) {
    entry = { species: id, form, mmol: 0, count: 0, suspended: form === "ppt" ? 1 : 0, host: null, glow: 0, state: null };
    m.solids.push(entry);
  }
  const before = entry.mmol;
  entry.mmol += mmol;
  if (form === "ppt") entry.suspended = (entry.suspended * before + mmol) / entry.mmol;
  // Reference size for surface-limited dissolving of pieces and heaps.
  if (form === "piece" || form === "powder") entry.startMmol = (entry.startMmol ?? 0) + mmol;
  Object.assign(entry, extra);
  return entry;
};

export const takeSolid = (m, entry, mmol) => {
  const taken = Math.min(entry.mmol, Math.max(0, mmol));
  entry.mmol -= taken;
  if (entry.count > 0 && entry.mmol <= EPS) entry.count = 0;
  if (entry.mmol <= EPS) m.solids.splice(m.solids.indexOf(entry), 1);
  return taken;
};

export const gasMl = (m) => Object.values(m.gas).reduce((sum, mmol) => sum + mmol * GAS_ML_PER_MMOL, 0);

export const headspaceMl = (m) => Math.max(0, m.capacityMl - m.volumeMl);

// Mole fraction of a gas in the headspace; the rest is air.
export const gasFraction = (m, id) => {
  const space = headspaceMl(m);
  return space > EPS ? Math.min(1, ((m.gas[id] ?? 0) * GAS_ML_PER_MMOL) / space) : 0;
};

export const addGas = (m, id, mmol) => {
  const next = (m.gas[id] ?? 0) + mmol;
  if (next <= EPS) delete m.gas[id];
  else m.gas[id] = next;
};

export const massG = (m) => {
  let grams = 0;
  for (const [id, mmol] of Object.entries(m.aq)) grams += (mmol * SPECIES[id].mw) / 1000;
  for (const s of m.solids) grams += (s.mmol * SPECIES[s.species].mw) / 1000;
  return grams;
};

export const heatCapacity = (m) => {
  let jk = m.vesselHeatJK;
  for (const [id, mmol] of Object.entries(m.aq)) {
    const sp = SPECIES[id];
    jk += sp.cp ? ((mmol * sp.mw) / 1000) * sp.cp : mmol * (SOLUTE_CP[id] ?? 0.02);
  }
  for (const s of m.solids) jk += ((s.mmol * SPECIES[s.species].mw) / 1000) * SOLID_CP_PER_G;
  return jk;
};

export const addHeat = (m, joules) => {
  m.tempC += joules / heatCapacity(m);
};

// Integral heats of dilution (kJ per mol acid) as a function of water molecules per acid molecule.
const acidEnthalpyKJ = (m) => {
  const water = aq(m, "H2O");
  const sulfuric = Math.min(aq(m, "H+") / 2, aq(m, "SO4 2-"));
  const nitric = Math.min(aq(m, "H+"), aq(m, "NO3-"));
  let kj = 0;
  if (sulfuric > EPS) {
    const r = water / sulfuric;
    kj += (sulfuric / 1000) * (-75 * r) / (r + 1.5);
  }
  if (nitric > EPS) {
    const r = water / nitric;
    kj += (nitric / 1000) * (-33 * r) / (r + 2);
  }
  return kj;
};

// Sulfuric acid mass fraction of the liquid, used for "concentrated" rules (0 when there is none).
export const sulfuricFraction = (m) => {
  const acid = Math.min(aq(m, "H+") / 2, aq(m, "SO4 2-"));
  if (acid <= EPS) return 0;
  const acidG = acid * 0.09808;
  return acidG / (acidG + aq(m, "H2O") * 0.01802);
};

export const nitricFraction = (m) => {
  const acid = Math.min(aq(m, "H+"), aq(m, "NO3-"));
  if (acid <= EPS) return 0;
  const acidG = acid * 0.06301;
  return acidG / (acidG + aq(m, "H2O") * 0.01802);
};

const HISTORY_LIMIT = 8;

const recordHistory = (m, entry) => {
  const same = m.history.find((h) => h.key === entry.key && h.unit === entry.unit);
  if (same) same.amount += entry.amount;
  else m.history.push({ ...entry });
  if (m.history.length > HISTORY_LIMIT) m.history.splice(0, m.history.length - HISTORY_LIMIT);
};

const emptyPortion = () => ({ volumeMl: 0, aq: {}, solids: [], tempC: ROOM_C, history: [] });

// A liquid portion of a cabinet reagent, ready to be mixed into a container.
export const reagentPortion = (sourceId, ml, { label, tempC = ROOM_C } = {}) => {
  const source = SOURCES[sourceId];
  if (source?.kind !== "liquid") throw new Error(`Not a liquid reagent: ${sourceId}`);
  const portion = emptyPortion();
  portion.volumeMl = ml;
  portion.tempC = tempC;
  for (const [id, perMl] of Object.entries(source.aq)) portion.aq[id] = perMl * ml;
  portion.history.push({ key: sourceId, label: label ?? sourceId, amount: ml, unit: "ml" });
  return portion;
};

// Pours `ml` out of a mixture. Suspended solids travel with the liquid; almost emptying also carries the sediment.
export const takePortion = (m, ml) => {
  const portion = emptyPortion();
  if (m.volumeMl <= EPS || ml <= EPS) return portion;
  const fraction = Math.min(1, ml / m.volumeMl);
  const draining = fraction > 0.97;
  portion.volumeMl = m.volumeMl * fraction;
  portion.tempC = m.tempC;
  m.volumeMl -= portion.volumeMl;
  for (const id of Object.keys(m.aq)) {
    const amount = m.aq[id] * fraction;
    portion.aq[id] = amount;
    addAq(m, id, -amount);
  }
  for (const s of [...m.solids]) {
    if (s.form === "piece" || s.form === "coat" || s.form === "crystals" || s.form === "residue") continue;
    const moving = draining ? s.mmol : s.mmol * s.suspended * fraction;
    if (moving <= EPS) continue;
    const suspendedBefore = s.mmol * s.suspended;
    portion.solids.push({ ...s, mmol: moving, suspended: draining ? s.suspended : 1 });
    takeSolid(m, s, moving);
    if (s.mmol > EPS) s.suspended = Math.max(0, (suspendedBefore - Math.min(moving, suspendedBefore)) / s.mmol);
  }
  for (const h of m.history) {
    if (h.unit === "piece") continue;
    const part = h.amount * fraction;
    portion.history.push({ ...h, amount: part });
    h.amount -= part;
  }
  if (m.volumeMl <= 0.01) {
    m.volumeMl = 0;
    m.history = m.history.filter((h) => h.unit !== "ml");
  }
  return portion;
};

// Mixes a portion in. Returns what happened at the moment of mixing so rules can react (e.g. water onto acid).
export const mixIn = (m, portion) => {
  if (portion.volumeMl <= EPS && !portion.solids.length) return null;
  const before = {
    volumeMl: m.volumeMl,
    sulfuric: sulfuricFraction(m),
    portionSulfuric: sulfuricFraction({ aq: portion.aq }),
    portionWater: portion.aq.H2O ?? 0,
  };
  const enthalpyBefore = acidEnthalpyKJ(m) + acidEnthalpyKJ({ aq: portion.aq });
  const capacityTarget = heatCapacity(m);
  const capacityPortion = heatCapacity({ ...emptyPortion(), aq: portion.aq, solids: portion.solids, vesselHeatJK: 0 });
  const mixedTemp =
    capacityTarget + capacityPortion > EPS
      ? (capacityTarget * m.tempC + capacityPortion * portion.tempC) / (capacityTarget + capacityPortion)
      : portion.tempC;

  m.volumeMl += portion.volumeMl;
  for (const [id, mmol] of Object.entries(portion.aq)) addAq(m, id, mmol);
  for (const s of portion.solids) {
    let entry = findSolid(m, s.species, s.form);
    if (!entry) {
      entry = { ...s, mmol: 0, count: 0, suspended: 0 };
      m.solids.push(entry);
    }
    const suspendedMmol = entry.mmol * entry.suspended + s.mmol * s.suspended;
    entry.mmol += s.mmol;
    entry.count += s.count ?? 0;
    entry.suspended = entry.mmol > EPS ? suspendedMmol / entry.mmol : 0;
  }
  for (const h of portion.history) recordHistory(m, h);
  m.tempC = mixedTemp;

  const released = (enthalpyBefore - acidEnthalpyKJ(m)) * 1000;
  if (released > 0) addHeat(m, released);
  return { ...before, heatJ: Math.max(0, released), addedMl: portion.volumeMl };
};

export const addPowder = (m, sourceId, grams, { label, state = null } = {}) => {
  const source = SOURCES[sourceId];
  const sp = species(source.species);
  const entry = addSolid(m, source.species, "powder", (grams * 1000) / sp.mw);
  entry.suspended = m.volumeMl > EPS && !sp.floats ? 0.6 : 0;
  if (state) entry.state = { ...entry.state, ...state };
  recordHistory(m, { key: sourceId, label: label ?? sourceId, amount: grams, unit: "g" });
  return entry;
};

export const addPiece = (m, sourceId, { label, grams, state = null } = {}) => {
  const source = SOURCES[sourceId];
  const g = grams ?? source.pieceG;
  const entry = addSolid(m, source.species, "piece", (g * 1000) / species(source.species).mw);
  entry.count += 1;
  entry.shape = source.form;
  if (state) entry.state = { ...entry.state, ...state };
  recordHistory(m, { key: sourceId, label: label ?? sourceId, amount: 1, unit: "piece" });
  return entry;
};

// Dissolved form of gases that go into solution when bubbled through a liquid.
const DISSOLVED = { CO2: "CO2(aq)", Cl2: "Cl2(aq)", SO2: "SO2(aq)", NH3g: "NH3" };

// Gas led in through a tube. With liquid present it bubbles through first; `absorbed` is what dissolved.
export const addGasMl = (m, sourceId, ml, { label, dissolveFraction = 0 } = {}) => {
  const source = SOURCES[sourceId];
  const mmol = gasMmol(ml);
  const dissolved = DISSOLVED[source.species];
  const absorbed = m.volumeMl > EPS && dissolved ? mmol * dissolveFraction : 0;
  if (absorbed > 0) addAq(m, dissolved, absorbed);
  addGas(m, source.species, mmol - absorbed);
  recordHistory(m, { key: sourceId, label: label ?? sourceId, amount: ml, unit: "gas" });
  return { mmol, absorbed };
};

// Gas beyond the headspace (or leaving an open mouth) goes to the room; returns mmol per species that escaped.
export const ventGas = (m, dt, { covered = false } = {}) => {
  const escaped = {};
  const space = headspaceMl(m);
  const total = gasMl(m);
  const overflow = total > space ? (total - space) / Math.max(total, EPS) : 0;
  for (const id of Object.keys(m.gas)) {
    const sp = SPECIES[id];
    // Light gases rise out of an open container quickly; heavy ones pour out slowly.
    const rate = covered ? 0 : sp.rel < 1 ? 0.35 : 0.04 / sp.rel;
    const leaving = m.gas[id] * Math.min(1, overflow + rate * dt);
    if (leaving <= EPS) continue;
    addGas(m, id, -leaving);
    escaped[id] = leaving;
  }
  return escaped;
};

export const isEmpty = (m) => m.volumeMl <= 0.01 && !m.solids.length && !Object.keys(m.gas).length;

export const clearMixture = (m) => {
  Object.assign(m, createMixture({ capacityMl: m.capacityMl, vesselHeatJK: m.vesselHeatJK, narrow: m.narrow }));
};
