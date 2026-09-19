import { test } from "node:test";
import assert from "node:assert/strict";
import { addPiece, createMixture, mixIn, reagentPortion } from "../mixture.js";
import { appearance } from "../appearance.js";
import { phOf } from "../acidity.js";
import { stepMixture } from "../engine.js";

const run = (m, seconds, ctx = {}) => {
  const events = [];
  const dt = 0.05;
  for (let t = 0; t < seconds; t += dt) events.push(...stepMixture(m, dt, { ...ctx, now: t }));
  return events;
};

const pour = (m, source, ml) => mixIn(m, reagentPortion(source, ml, { label: source }));

test("phenolphthalein turns pink in base and clears at the equivalence point", () => {
  const m = createMixture({ capacityMl: 250, vesselHeatJK: 30 });
  pour(m, "water", 10);
  pour(m, "naoh", 1);
  pour(m, "phenolphthalein", 0.1);
  run(m, 0.5);
  assert.ok(phOf(m) > 12);
  assert.ok(appearance(m).liquid.opacity > 0.3, "pink");
  pour(m, "hcl", 0.9);
  run(m, 0.5);
  assert.ok(phOf(m) > 8.2, "still basic just before equivalence");
  const events = [];
  pour(m, "hcl", 0.1);
  events.push(...run(m, 0.5, { now: 10 }));
  assert.ok(phOf(m) < 7, "acidic after the last drops");
  assert.ok(appearance(m).liquid.opacity < 0.2, "colourless again");
});

test("silver nitrate and hydrochloric acid give a white precipitate that settles", () => {
  const m = createMixture({ capacityMl: 30, vesselHeatJK: 8, narrow: true });
  pour(m, "agno3", 1);
  pour(m, "hcl", 0.1);
  const events = run(m, 1.2);
  assert.ok(events.some((e) => e.type === "reaction" && e.id === "agno3-hcl"));
  assert.ok(appearance(m).liquid.turbidity > 0.8, "milky right away");
  run(m, 20);
  assert.ok(appearance(m).bed.ml > 0, "settled");
});

test("magnesium ribbon fizzes in hydrochloric acid and warms the tube", () => {
  const m = createMixture({ capacityMl: 30, vesselHeatJK: 12, narrow: true });
  pour(m, "hcl", 3);
  addPiece(m, "magnesium");
  const events = run(m, 3, { coolWK: 0.25 });
  assert.ok(events.some((e) => e.type === "reaction" && e.id === "metal-hcl-hydrogen"));
  assert.ok(m.tempC > 30, `warm: ${m.tempC.toFixed(1)} °C`);
  run(m, 20, { coolWK: 0.25 });
  assert.equal(m.solids.length, 0, "ribbon dissolved");
});
