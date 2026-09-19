import { test } from "node:test";
import assert from "node:assert/strict";
import { createMixture } from "../mixture.js";
import { appearance } from "../appearance.js";
import { stepMixture } from "../engine.js";
import { REACTION_INFO } from "../reactionInfo.js";
import { WARNING_INFO } from "../warningInfo.js";
import { SCENARIOS } from "../../sim/scenarios.js";
import { CONTAINERS } from "../../sim/containers.js";

const DT = 1 / 30;
const SECONDS = 40;

const ctxAt = (scenario, t) =>
  Object.assign({}, ...(scenario.ctx ?? []).filter(([from, to]) => t >= from && t < to).map(([, , ctx]) => ctx));

// Runs a review scene exactly the way the dev bench does, and reports what came out of it.
const play = (scenario) => {
  const params = CONTAINERS[scenario.container];
  const m = createMixture(params);
  const done = new Set();
  const events = [];
  let now = 0;
  let mixes = [];
  for (let step = 0; step < SECONDS / DT; step += 1) {
    scenario.timeline.forEach(([at, action], i) => {
      if (at > now || done.has(i)) return;
      done.add(i);
      const result = action(m);
      if (result && typeof result === "object" && "addedMl" in result) mixes.push(result);
    });
    const ctx = { container: scenario.container, coolWK: params.coolWK, now, mixes, ...ctxAt(scenario, now) };
    mixes = [];
    events.push(...stepMixture(m, DT, ctx));
    now += DT;
  }
  return { m, events, visual: appearance(m) };
};

test("every review scenario runs without breaking the engine", () => {
  const scenes = Object.entries(SCENARIOS).filter(([name, s]) => s.container && !name.startsWith("fx:"));
  assert.ok(scenes.length > 70, `only ${scenes.length} chemistry scenarios`);
  for (const [name, scenario] of scenes) {
    const { m, events, visual } = play(scenario);
    assert.ok(Number.isFinite(m.tempC), `${name}: temperature is ${m.tempC}`);
    assert.ok(m.tempC > -50 && m.tempC < 3000, `${name}: temperature ${m.tempC.toFixed(0)} °C`);
    assert.ok(m.volumeMl >= 0 && Number.isFinite(m.volumeMl), `${name}: volume ${m.volumeMl}`);
    for (const [id, mmol] of Object.entries(m.aq)) assert.ok(mmol > 0, `${name}: negative ${id}`);
    for (const solid of m.solids) assert.ok(solid.mmol > 0, `${name}: negative ${solid.species}`);
    for (const [id, mmol] of Object.entries(m.gas)) assert.ok(mmol > 0, `${name}: negative gas ${id}`);
    assert.ok(visual.liquid.opacity >= 0 && visual.liquid.opacity <= 1, `${name}: opacity`);
    assert.ok(visual.liquid.turbidity >= 0 && visual.liquid.turbidity <= 1, `${name}: turbidity`);
    for (const event of events) {
      if (event.type === "reaction") assert.ok(REACTION_INFO[event.id], `${name}: unknown reaction ${event.id}`);
      if (event.type === "warning") assert.ok(WARNING_INFO[event.id], `${name}: unknown warning ${event.id}`);
    }
  }
});

test("the review scenarios named after a reaction really show it", () => {
  const expected = {
    "agno3-hcl": "agno3-hcl",
    "agno3-ki": "agno3-ki",
    "agno3-naoh": "agno3-naoh",
    "agcl-nh3": "agcl-nh3",
    "cuso4-naoh-heat": "cuso4-naoh",
    "fecl3-naoh": "fecl3-naoh",
    "limewater-co2": "limewater-co2",
    "cuso4-nh3": "cuso4-nh3-excess",
    "nahco3-hcl": "nahco3-hcl",
    "marble-hcl": "nahco3-hcl",
    "mg-hcl": "metal-hcl-hydrogen",
    "zn-h2so4-dilute": "metal-h2so4-hydrogen",
    "cu-hno3": "cu-hno3",
    "kmno4-heat": "kmno4-heat",
    "fe-cuso4": "metal-displacement",
    "cu-agno3": "metal-displacement",
    "ki-fecl3": "ki-fecl3",
    "cl2-ki": "cl2-ki",
    "kmno4-h2o2-acid": "kmno4-h2o2-acid",
    "kmno4-h2o2-neutral": "kmno4-h2o2-neutral",
    "cuso4-ki": "cuso4-ki",
    "glycerol-cuoh2": "glycerol-cuoh2",
    "mg-burning": "mg-burning",
    "mg-co2-jar": "mg-burning",
    "ethanol-fire": "ethanol-burning",
    "sulfur-oxygen": "sulfur-burning",
    "h2-test-pop": "h2-test",
    "h2-o2-bang": "h2-o2-explosion",
    "na-cl2": "na-cl2",
    "na-water": "na-water",
    "na-ethanol": "na-ethanol",
    "sugar-h2so4": "sugar-h2so4",
    "water-into-acid": "water-into-acid",
    "acid-into-water": "acid-into-water",
    "kmno4-plume": "kmno4-water",
    "sugar-dissolve": "sugar-water",
    "ethanol-water": "ethanol-water",
    "cuso4-dilution": "cuso4-dilution",
    "cu-hcl-none": "cu-acid-none",
    "fe-h2so4-cold": "fe-passivation",
    "zn-naoh-hot": "zn-naoh-hydrogen",
    "mg-hot-water": "mg-hot-water",
    "nahco3-heat": "nahco3-heat",
    "nahco3-cuso4": "metal-nahco3",
    "kmno4-ki": "kmno4-ki",
    "fecl3-h2o2": "fecl3-h2o2",
    "cl2-naoh": "cl2-naoh",
  };
  for (const [name, info] of Object.entries(expected)) {
    const scenario = SCENARIOS[name];
    assert.ok(scenario, `missing scenario ${name}`);
    const { events } = play(scenario);
    const seen = events.filter((e) => e.type === "reaction").map((e) => e.id);
    assert.ok(seen.includes(info), `${name}: expected ${info}, saw ${[...new Set(seen)].join(", ") || "nothing"}`);
  }
});

test("scenarios that should stay quiet do", () => {
  for (const name of ["water", "cuso4", "fecl3", "fe-s-cold", "sulfur-floats", "iron-water"]) {
    const { events } = play(SCENARIOS[name]);
    const loud = events.filter((e) => ["bang", "shatter", "pop", "spatter"].includes(e.type));
    assert.equal(loud.length, 0, `${name}: ${loud.map((e) => e.type).join(", ")}`);
  }
});
