import { addGasMl, addPiece, addPowder, mixIn, reagentPortion } from "../chemistry/mixture";
import { SUBSTANCE_BY_ID } from "../substances/catalog";

// Dev review scenes for ?fxlab=name,name&t=seconds. Timelines drive the real engine; `fx` forces visuals for effect work.
const label = (sourceId) => SUBSTANCE_BY_ID[sourceId]?.formula ?? sourceId;
const pour = (sourceId, ml) => (m) => mixIn(m, reagentPortion(sourceId, ml, { label: label(sourceId) }));
const powder = (sourceId, grams) => (m) => addPowder(m, sourceId, grams, { label: label(sourceId) });
const piece = (sourceId, state) => (m) => addPiece(m, sourceId, { label: label(sourceId), state });
const gas = (sourceId, ml, dissolveFraction = 0.6) => (m) =>
  addGasMl(m, sourceId, ml, { label: label(sourceId), dissolveFraction });
// A solid that enters the container already burning, the way a lit spoon is lowered into a gas jar.
const burning = (action) => (m) => {
  const entry = action(m);
  entry.state = { ...entry.state, burning: true };
  return entry;
};
const gasFlow = (sourceId, from, to, mlPerStep = 1.5) =>
  Array.from({ length: Math.round((to - from) / 0.1) }, (_, i) => [from + i * 0.1, gas(sourceId, mlPerStep)]);

export const SCENARIOS = {
  water: { container: "beaker", timeline: [[0, pour("water", 150)]] },
  cuso4: { container: "beaker", timeline: [[0, pour("cuso4", 120)]] },
  fecl3: { container: "test-tube", timeline: [[0, pour("fecl3", 8)]] },
  "cuso4-dilution": { container: "beaker", timeline: [[0, pour("cuso4", 20)], [2, pour("water", 80)]], ctx: [[2, 5, { stirring: true }]] },

  "naoh-phenolphthalein": {
    container: "conical-flask",
    timeline: [[0, pour("water", 40)], [0.5, pour("naoh", 2)], [1.5, pour("phenolphthalein", 0.2)], [6, pour("hcl", 1.9)]],
    ctx: [[6, 8, { stirring: true }]],
  },
  "agno3-hcl": { container: "test-tube", timeline: [[0, pour("agno3", 6)], [1.5, pour("hcl", 0.6)]] },
  "agno3-ki": { container: "test-tube", timeline: [[0, pour("agno3", 6)], [1.5, pour("ki", 1.5)]] },
  "cuso4-naoh-heat": {
    container: "test-tube",
    timeline: [[0, pour("cuso4", 4)], [1, pour("naoh", 3)]],
    ctx: [[6, 40, { heatW: 250 }]],
  },
  "fecl3-naoh": { container: "test-tube", timeline: [[0, pour("fecl3", 4)], [1, pour("naoh", 4)]] },
  "limewater-co2": { container: "test-tube", timeline: [[0, pour("limewater", 10)], ...gasFlow("co2", 1, 25)] },
  "cuso4-nh3": { container: "test-tube", timeline: [[0, pour("cuso4", 4)], [1, pour("nh3", 0.3)], [5, pour("nh3", 4)]] },

  "nahco3-hcl": { container: "beaker", timeline: [[0, pour("hcl", 25)], [1, powder("nahco3", 1)]] },
  "marble-hcl": { container: "beaker", timeline: [[0, pour("hcl", 25)], [1, piece("marble")]] },
  "mg-hcl": { container: "test-tube", timeline: [[0, pour("hcl", 6)], [1, piece("magnesium")]] },
  "zn-hcl": { container: "test-tube", timeline: [[0, pour("hcl", 6)], [1, piece("zinc")]] },
  "fe-hcl": { container: "test-tube", timeline: [[0, pour("hcl", 6)], [1, powder("iron-filings", 0.5)]] },
  "h2o2-mno2": { container: "conical-flask", timeline: [[0, pour("water", 30)], [0.5, pour("h2o2", 4)], [2, powder("mno2", 1)]] },
  "h2o2-ki": { container: "conical-flask", timeline: [[0, pour("water", 30)], [0.5, pour("h2o2", 4)], [2, pour("ki", 5)]] },
  "cu-hno3": { container: "test-tube", timeline: [[0, pour("hno3", 3)], [1, piece("copper")]] },
  "fe-cuso4": { container: "beaker", timeline: [[0, pour("cuso4", 40)], [1, powder("iron-filings", 2)]] },
  "zn-cuso4": { container: "beaker", timeline: [[0, pour("cuso4", 40)], [1, piece("zinc")], [1.2, piece("zinc")]] },
  "cu-agno3": { container: "test-tube", timeline: [[0, pour("agno3", 10)], [1, piece("copper")]] },
  "ki-fecl3": { container: "test-tube", timeline: [[0, pour("ki", 4)], [1.5, pour("fecl3", 2)]] },
  "cl2-ki": { container: "test-tube", timeline: [[0, pour("ki", 6)], ...gasFlow("chlorine", 1, 4, 1)] },
  "kmno4-h2o2-acid": {
    container: "beaker",
    timeline: [[0, pour("water", 60)], [0.5, powder("kmno4", 0.05)], [0.6, pour("water", 10)], [4, pour("h2so4", 1)], [6, pour("h2o2", 1)]],
    ctx: [[0.5, 3, { stirring: true }]],
  },
  "cuso4-ki": { container: "test-tube", timeline: [[0, pour("cuso4", 2)], [1, pour("ki", 4)]] },
  "glycerol-cuoh2": { container: "test-tube", timeline: [[0, pour("cuso4", 2)], [0.5, pour("naoh", 4)], [4, pour("glycerin", 2)]], ctx: [[4, 7, { stirring: true }]] },

  "mg-burning": { container: "evaporating-dish", timeline: [[0, piece("magnesium", { burning: true })]] },
  "ethanol-fire": { container: "evaporating-dish", timeline: [[0, pour("ethanol", 2)]], ctx: [[1, 1.2, { flame: "lamp" }]] },
  "sulfur-burning": { container: "crucible", timeline: [[0, powder("sulfur", 0.3)]], ctx: [[0, 90, { heatW: 150 }]] },
  "kmno4-glycerin": { container: "evaporating-dish", timeline: [[0, powder("kmno4", 2)], [1, pour("glycerin", 0.5)]] },
  "fe-s-heated": { container: "test-tube", timeline: [[0, powder("iron-filings", 1.75)], [0.2, powder("sulfur", 1)]], ctx: [[1, 30, { heatW: 150 }]] },
  "na-water": { container: "crystallizing-dish", timeline: [[0, pour("water", 300)], [0.5, pour("phenolphthalein", 0.3)], [2, piece("sodium")]] },
  "sugar-h2so4": { container: "beaker", timeline: [[0, powder("sugar", 10)], [0.5, pour("water", 1)], [1, pour("h2so4", 10)]] },
  "water-into-acid": { container: "test-tube", timeline: [[0, pour("h2so4", 5)], [2, pour("water", 1)]] },
  "acid-into-water": { container: "beaker", timeline: [[0, pour("water", 45)], [2, pour("h2so4", 5)]] },
  "kmno4-plume": { container: "beaker", timeline: [[0, pour("water", 180)], [1, powder("kmno4", 0.03)]] },
  "sugar-dissolve": { container: "beaker", timeline: [[0, pour("water", 40)], [1, powder("sugar", 2)]], ctx: [[3, 8, { stirring: true }]] },
  "sulfur-floats": { container: "beaker", timeline: [[0, pour("water", 40)], [1, powder("sulfur", 0.5)]] },
  "mno2-settles": { container: "beaker", timeline: [[0, pour("water", 40)], [1, powder("mno2", 0.5)]], ctx: [[1, 3, { stirring: true }]] },
  "ethanol-water": { container: "measuring-cylinder", timeline: [[0, pour("water", 50)], [1, pour("ethanol", 50)]] },
  "h2-gas-jar": { container: "gas-jar", timeline: gasFlow("hydrogen", 0, 8, 30) },
  "no2-gas-jar": { container: "gas-jar", timeline: [[0, (m) => { m.gas.NO2 = 12; }]] },
  "cl2-gas-jar": { container: "gas-jar", timeline: gasFlow("chlorine", 0, 5, 40) },

  // Added for M4 reaction review (doc 14 numbers in the comments).
  "nh3-phenolphthalein": {
    container: "test-tube",
    timeline: [[0, pour("nh3", 2)], [0.2, pour("water", 2)], [1, pour("phenolphthalein", 0.1)]],
    ctx: [[4, 60, { heatW: 100 }]],
  },
  "nahco3-dissolve": { container: "test-tube", timeline: [[0, pour("water", 5)], [1, powder("nahco3", 0.5)]], ctx: [[1, 20, { stirring: true }]] },
  "agno3-naoh": { container: "test-tube", timeline: [[0, pour("agno3", 6)], [1.5, pour("naoh", 0.5)]] },
  "agcl-nh3": {
    container: "test-tube",
    timeline: [[0, pour("agno3", 3)], [1, pour("hcl", 0.3)], [4, pour("nh3", 2)], [12, pour("hno3", 1)]],
  },
  "cuso4-naoh-hcl": { container: "test-tube", timeline: [[0, pour("cuso4", 4)], [1, pour("naoh", 3)], [5, pour("hcl", 4)]] },
  "limewater-co2-heat": {
    container: "test-tube",
    timeline: [[0, pour("limewater", 10)], ...gasFlow("co2", 1, 12, 3)],
    ctx: [[16, 60, { heatW: 100 }]],
  },
  "co2-naoh": { container: "test-tube", timeline: [[0, pour("naoh", 1)], [0.2, pour("water", 5)], ...gasFlow("co2", 1, 6, 4)] },
  "nahco3-cuso4": {
    container: "test-tube",
    timeline: [[0, pour("water", 5)], [0.5, powder("nahco3", 0.4)], [6, pour("cuso4", 2)]],
    ctx: [[0.5, 6, { stirring: true }]],
  },
  "marble-h2so4": { container: "test-tube", timeline: [[0, pour("water", 4)], [0.3, pour("h2so4", 0.5)], [2, piece("marble")]] },
  "zn-h2so4-dilute": {
    container: "test-tube",
    timeline: [[0, pour("water", 9)], [0.5, pour("h2so4", 1)], [4, piece("zinc")]],
    ctx: [[0.5, 4, { stirring: true }]],
  },
  "zn-h2so4-conc": {
    container: "test-tube",
    timeline: [[0, pour("h2so4", 2)], [1, piece("zinc")]],
    ctx: [[6, 45, { heatW: 40, inFumeHood: true }]],
  },
  "cu-h2so4-conc": {
    container: "test-tube",
    timeline: [[0, pour("h2so4", 2)], [1, piece("copper")]],
    ctx: [[5, 50, { heatW: 60, inFumeHood: true }]],
  },
  "cu-hno3-dilute": {
    container: "test-tube",
    timeline: [[0, pour("hno3", 1)], [0.3, pour("water", 2)], [2, piece("copper")]],
    ctx: [[0, 40, { inFumeHood: true }]],
  },
  "kmno4-heat": { container: "test-tube", timeline: [[0, powder("kmno4", 1.5)]], ctx: [[1, 60, { heatW: 100 }]] },
  "kmno4-h2o2-neutral": {
    container: "beaker",
    timeline: [[0, pour("water", 60)], [0.5, powder("kmno4", 0.05)], [6, pour("water", 10)], [6.2, pour("h2o2", 1)]],
    ctx: [[0.5, 5, { stirring: true }]],
  },
  "kmno4-ki": {
    container: "test-tube",
    timeline: [[0, pour("water", 5)], [0.3, powder("kmno4", 0.05)], [6, pour("ki", 1)]],
    ctx: [[0.3, 6, { stirring: true }]],
  },
  "fecl3-h2o2": { container: "test-tube", timeline: [[0, pour("fecl3", 1)], [0.3, pour("water", 5)], [2, pour("h2o2", 0.5)]] },
  "cl2-naoh": { container: "test-tube", timeline: [[0, pour("naoh", 5)], ...gasFlow("chlorine", 1, 5, 2)] },
  "mg-co2-jar": {
    container: "gas-jar",
    timeline: [[0, gas("co2", 500, 0)], [1, piece("magnesium", { burning: true })]],
    ctx: [[0, 30, { covered: true }]],
  },
  "sulfur-oxygen": {
    container: "gas-jar",
    timeline: [[0, pour("water", 20)], [0.2, gas("oxygen", 470, 0)], [1, burning(powder("sulfur", 0.1))]],
    ctx: [[0, 30, { covered: true, inFumeHood: true }]],
  },
  "h2-test-pop": { container: "test-tube", timeline: [[0, gas("hydrogen", 30, 0)]], ctx: [[1, 1.2, { flame: "lamp" }]] },
  "h2-o2-bang": {
    container: "gas-jar",
    timeline: [[0, gas("hydrogen", 330, 0)], [0.2, gas("oxygen", 170, 0)]],
    ctx: [[1.5, 1.7, { flame: "lamp", covered: true }]],
  },
  "na-cl2": {
    container: "gas-jar",
    timeline: [[0, gas("chlorine", 500, 0)], [1, piece("sodium", { molten: true })]],
    ctx: [[0, 30, { covered: true, inFumeHood: true }]],
  },
  "na-water-tube": { container: "test-tube", timeline: [[0, pour("water", 10)], [1, piece("sodium")]] },
  "na-ethanol": { container: "test-tube", timeline: [[0, pour("ethanol", 10)], [1, piece("sodium")]] },
  "zn-naoh-hot": { container: "test-tube", timeline: [[0, pour("naoh", 5)], [1, piece("zinc")]], ctx: [[2, 60, { heatW: 100 }]] },
  "mg-hot-water": {
    container: "test-tube",
    timeline: [[0, pour("water", 10)], [0.3, pour("phenolphthalein", 0.1)], [1, piece("magnesium")]],
    ctx: [[1, 90, { heatW: 100 }]],
  },
  "cu-hcl-none": { container: "test-tube", timeline: [[0, pour("hcl", 5)], [1, piece("copper")]] },
  "fe-h2so4-cold": { container: "test-tube", timeline: [[0, pour("h2so4", 2)], [1, powder("iron-filings", 0.5)]] },
  "fe-s-cold": { container: "test-tube", timeline: [[0, powder("iron-filings", 1.6)], [0.2, powder("sulfur", 0.9)]] },
  "glycerin-water": { container: "test-tube", timeline: [[0, pour("water", 5)], [1, pour("glycerin", 2)]], ctx: [[8, 14, { stirring: true }]] },
  "kmno4-h2so4-danger": { container: "beaker", timeline: [[0, pour("h2so4", 5)], [1, powder("kmno4", 1)]], ctx: [[0, 30, { inFumeHood: true }]] },
  "nahco3-heat": { container: "test-tube", timeline: [[0, powder("nahco3", 1)]], ctx: [[1, 40, { heatW: 60 }]] },
  "iron-water": { container: "beaker", timeline: [[0, pour("water", 40)], [1, powder("iron-filings", 0.5)]] },

  // Device states for live model work (no chemistry): `state` at start, `stateAt` changes over time.
  "dev:lamp-lit": { device: "spirit-lamp", state: { lit: true, capOn: false, fuelMl: 60, boost: 0, dousing: 0 } },
  "dev:lamp-boost": { device: "spirit-lamp", state: { lit: true, capOn: false, fuelMl: 60, boost: 1.5, dousing: 0 } },
  "dev:hot-plate-hot": { device: "hot-plate", state: { level: 4, setC: 300, plateC: 300, stir: true } },
  "dev:tongs-molten": {
    device: "crucible-tongs",
    state: { piece: { species: "Na", shape: "chunk", grams: 0.1, color: "#d9dde2", state: { molten: true, hot: true } } },
  },
  "dev:hot-plate": {
    device: "hot-plate",
    state: { level: 0, setC: 22, plateC: 22, stir: false },
    stateAt: [[1, { level: 3, setC: 200, plateC: 60 }], [3, { plateC: 140, stir: true }], [6, { plateC: 200 }]],
  },
  "dev:thermometer": { device: "thermometer", state: { readingC: 22 }, stateAt: [[1, { readingC: 45 }], [3, { readingC: 86 }]] },
  "dev:scale": { device: "digital-scale", state: { readingG: 0 }, stateAt: [[1, { readingG: 104.6 }]] },
  "dev:dropper-full": { device: "dropper", state: { fillMl: 1.6, capacityMl: 2, color: "#1f6fd1", opacity: 0.5 } },
  "dev:spatula-load": { device: "spatula", state: { load: { grams: 1, color: "#1d1b1a", grain: "fine" } } },
  "dev:tongs-mg": { device: "crucible-tongs", state: { piece: { species: "Mg", shape: "ribbon", grams: 0.03, color: "#c8cacd", state: {} } } },
  "dev:tongs-mg-burning": {
    device: "crucible-tongs",
    state: { piece: { species: "Mg", shape: "ribbon", grams: 0.03, color: "#c8cacd", state: { burning: true } } },
  },
  "dev:ph-strip": { device: "ph-paper", state: { strip: { color: "#3b2c8f", ph: 13 } } },
  "dev:funnel-solids": { device: "funnel", state: { solidsMl: 0.6, solidsColor: "#1d1b1a", wet: 0.8 } },
  "dev:gas-jar-open": { device: "gas-jar", state: { coverOn: false } },
  "dev:bottle-open": { device: "sub:hcl", state: { remaining: 0.45, capOn: false } },
  "dev:jar-open": { device: "sub:zinc", state: { remaining: 0.3, capOn: false } },
  "dev:powder-low": { device: "sub:mno2", state: { remaining: 0.25, capOn: false } },

  // Forced visuals for effect development: the engine runs, then these fx values replace its output.
  "fx:bubbles-fine": { container: "beaker", timeline: [[0, pour("water", 150)]], fx: { bubbles: { rate: 2, site: "bottom", gas: "O2" } } },
  "fx:bubbles-pieces": { container: "test-tube", timeline: [[0, pour("water", 15)], [0, piece("zinc")]], fx: { bubbles: { rate: 0.6, site: "pieces", gas: "H2" } } },
  "fx:foam": { container: "beaker", timeline: [[0, pour("water", 80)]], fx: { foam: 0.8, bubbles: { rate: 4, site: "bottom", gas: "CO2" } } },
  "fx:steam": { container: "beaker", timeline: [[0, pour("water", 120)]], fx: { steam: 1, boiling: 1 } },
  "fx:smoke-toxic": { container: "crucible", timeline: [], fx: { smoke: { rate: 1, color: "#e6e6e6", toxic: true } } },
  "fx:flame-lamp": { container: "evaporating-dish", timeline: [], fx: { flame: { kind: "lamp", intensity: 1 } } },
  "fx:flame-ethanol": { container: "evaporating-dish", timeline: [[0, pour("ethanol", 2)]], fx: { flame: { kind: "ethanol", intensity: 1 } } },
  "fx:flame-mg": { container: "evaporating-dish", timeline: [], fx: { flame: { kind: "magnesium", intensity: 1 }, smoke: { rate: 1, color: "#f5f5f5", toxic: false } } },
  "fx:flame-sulfur": { container: "crucible", timeline: [[0, powder("sulfur", 0.3)]], fx: { flame: { kind: "sulfur", intensity: 1 } } },
  "fx:flame-sulfur-o2": { container: "crucible", timeline: [[0, powder("sulfur", 0.3)]], fx: { flame: { kind: "sulfur-oxygen", intensity: 1 } } },
  "fx:flame-kmno4": { container: "evaporating-dish", timeline: [[0, powder("kmno4", 2)]], fx: { flame: { kind: "permanganate", intensity: 1 }, smoke: { rate: 1, color: "#cfcfcf", toxic: false } } },
  "fx:flame-sodium": { container: "gas-jar", timeline: [], fx: { flame: { kind: "sodium", intensity: 1 }, smoke: { rate: 1, color: "#f5f5f5", toxic: false } } },
  "fx:glow": { container: "test-tube", timeline: [[0, powder("iron-filings", 2)]], fx: { glow: { color: "#ff5a1f", amount: 0.7 } } },
  "fx:spatter": { container: "test-tube", timeline: [[0, pour("h2so4", 5)]], fx: { spatter: 1, steam: 1 } },
  "fx:column": { container: "beaker", timeline: [[0, powder("sugar", 10)]], fx: { column: 0.7, steam: 0.8 } },
  "fx:plume": {
    container: "beaker",
    timeline: [[0, pour("water", 180)], [0.2, powder("kmno4", 0.04)]],
    fx: { plume: 0.6 },
  },
  "fx:schlieren": {
    container: "beaker",
    timeline: [[0, pour("water", 45)], [0.2, pour("cuso4", 5)]],
    fx: { schlieren: 1 },
  },
  "fx:char": { container: "beaker", timeline: [[0, powder("sugar", 8)], [0.2, pour("h2so4", 2)]], fx: { char: 0.75, steam: 0.6 } },
  "fx:crystals": { container: "test-tube", timeline: [[0, pour("agno3", 12)], [0.2, piece("copper")]], ctx: [[0, 60, {}]] },
  "fx:coat": { container: "beaker", timeline: [[0, pour("cuso4", 60)], [0.2, piece("zinc")], [0.4, piece("zinc")]] },
  "fx:headspace-open": { container: "gas-jar", timeline: [[0, (m) => { m.gas.NO2 = 9; }]] },
  "fx:sodium-ball": { container: "crystallizing-dish", timeline: [[0, pour("water", 300)]], fx: { sodiumBall: { size: 1, burning: false } } },
};
