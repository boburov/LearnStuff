import { test } from "node:test";
import assert from "node:assert/strict";
import { bench, near, reactions, saw } from "./harness.js";

// № 42
test("42 · a permanganate crystal sends violet streams through the water", () => {
  const still = bench("beaker");
  still.pour("water", 200).powder("kmno4", 0.02);
  const events = still.run(10);
  assert.ok(saw(events, "reaction", "kmno4-water"), reactions(events).join());
  assert.ok(still.peak.plume > 0.9, `plume ${still.peak.plume}`);
  assert.ok(still.solid("KMnO4") > 0, "a crystal is still sitting there after ten seconds");
  still.run(25);
  assert.ok(still.solid("KMnO4") < 0.005, "gone in about twenty seconds");
  assert.ok(still.look().liquid.opacity > 0.5, "the water is violet");
  assert.ok(Math.abs(still.m.tempC - 22) < 0.5, "no temperature change");

  const stirred = bench("beaker");
  stirred.pour("water", 200).powder("kmno4", 0.02);
  stirred.run(5, { stirring: true });
  assert.ok(stirred.solid("KMnO4") < 0.005, "stirring dissolves it in a few seconds");
  assert.ok(stirred.peak.plume < 0.5, "and leaves no streams");
});

// № 42 dilution series
test("42 · each dilution makes the colour much paler", () => {
  const stock = bench("beaker");
  stock.pour("water", 200).powder("kmno4", 0.02).run(30, { stirring: true });
  const strong = stock.look().liquid.opacity;
  const cup = bench("test-tube");
  stock.into(cup, 1);
  cup.pour("water", 10);
  cup.run(2, { stirring: true });
  assert.ok(cup.look().liquid.opacity < strong * 0.5, `${cup.look().liquid.opacity.toFixed(2)} vs ${strong.toFixed(2)}`);
  assert.ok(cup.look().liquid.opacity > 0.02, "but still visible: a trace of it colours the water");
});

// № 43a
test("43 · sugar dissolves faster when it is stirred", () => {
  const stirred = bench("beaker");
  stirred.pour("water", 20).powder("sugar", 2);
  const events = stirred.run(6, { stirring: true });
  assert.ok(saw(events, "reaction", "sugar-water"), reactions(events).join());
  assert.ok(stirred.solid("SucroseCrystals") < 0.1, "gone in about five seconds");
  assert.ok(stirred.look().liquid.opacity < 0.12, "the solution stays clear and colourless");
  assert.ok(stirred.look().liquid.turbidity < 0.02);

  const still = bench("beaker");
  still.pour("water", 20).powder("sugar", 2);
  still.run(6);
  assert.ok(still.solid("SucroseCrystals") > 1, "much slower without stirring");
  still.run(30);
  assert.ok(still.solid("SucroseCrystals") < 0.2, "but it gets there");
});

// № 43b
test("43 · sulfur floats, manganese dioxide clouds the water, iron sinks", () => {
  const sulfur = bench("beaker");
  sulfur.pour("water", 20).powder("sulfur", 0.2);
  const events = sulfur.run(10);
  assert.ok(saw(events, "reaction", "solids-water"), reactions(events).join());
  assert.ok(sulfur.look().floating.ml > 0, "an unwetted layer on the surface");
  assert.equal(sulfur.look().floating.color, "#e8d23a");
  assert.equal(sulfur.look().bed.ml, 0, "nothing sinks");

  const mno2 = bench("beaker");
  mno2.pour("water", 20).powder("mno2", 0.2);
  mno2.run(2, { stirring: true });
  assert.ok(mno2.look().liquid.turbidity > 0.3, "black suspension first");
  mno2.run(40);
  assert.ok(mno2.look().liquid.turbidity < 0.1, `then it settles: ${mno2.look().liquid.turbidity.toFixed(2)}`);
  assert.ok(mno2.look().bed.ml > 0, "as a black bed");

  const iron = bench("beaker");
  iron.pour("water", 20).powder("iron-filings", 0.2);
  iron.run(3);
  assert.ok(iron.look().bed.ml > 0, "iron goes straight to the bottom");
  assert.equal(iron.aq("Fe2+"), 0, "and does not dissolve");
});

// № 44
test("44 · diluting copper sulfate only opens the colour up", () => {
  const b = bench("beaker");
  b.pour("cuso4", 2);
  b.run(1);
  const strong = b.look().liquid;
  const events = b.pour("water", 8).run(3, { stirring: true });
  assert.ok(saw(events, "reaction", "cuso4-dilution"), reactions(events).join());
  const weak = b.look().liquid;
  assert.ok(weak.opacity < strong.opacity * 0.45, `${weak.opacity.toFixed(2)} from ${strong.opacity.toFixed(2)}`);
  assert.equal(b.solid("Cu(OH)2"), 0, "no precipitate");
  assert.ok(Math.abs(b.m.tempC - 22) < 1, "no heat");
  assert.ok(b.look().liquid.turbidity < 0.02, "and no turbidity");

  const again = bench("beaker");
  b.into(again, 1);
  again.pour("water", 9);
  again.run(3, { stirring: true });
  assert.ok(again.look().liquid.opacity < 0.12, `a second dilution is almost colourless: ${again.look().liquid.opacity.toFixed(3)}`);
});

// № 45a
test("45 · ethanol and water shrink when they mix and warm a little", () => {
  const b = bench("measuring-cylinder");
  b.pour("water", 50).pour("ethanol", 50);
  const start = b.m.tempC;
  const events = b.run(8, { stirring: true });
  assert.ok(saw(events, "reaction", "ethanol-water"), reactions(events).join());
  assert.ok(b.m.volumeMl > 94 && b.m.volumeMl < 98.5, `volume ${b.m.volumeMl.toFixed(1)} ml instead of 100`);
  assert.ok(near(b.m.tempC - start, 4, 0.6), `warmed by ${(b.m.tempC - start).toFixed(1)} °C`);
  assert.ok(b.look().liquid.opacity < 0.12, "clear");
});

// № 45b
test("45 · glycerin sinks through water and leaves schlieren until it is stirred", () => {
  const b = bench("test-tube");
  b.pour("water", 5);
  b.pour("glycerin", 2);
  b.run(2);
  assert.ok(b.peak.schlieren > 0.5, `schlieren ${b.peak.schlieren}`);
  b.run(8, { stirring: true });
  assert.ok(b.m.fx.schlieren === undefined || b.m.fx.schlieren < 0.4, "stirring mixes it to one clear liquid");
  assert.ok(near(b.m.volumeMl, 7, 0.05), `volume ${b.m.volumeMl.toFixed(1)} ml`);
  assert.ok(b.look().liquid.turbidity < 0.02, "one clear liquid, no precipitate and no gas");
  assert.equal(b.gasOf("H2"), 0);
});

// § 4.14
test("4.14 · dilute ammonia and dilute hydrochloric acid just neutralise each other", () => {
  const b = bench("beaker");
  b.pour("nh3", 5).pour("hcl", 5);
  const events = b.run(3);
  assert.ok(!saw(events, "reaction", "nh3-heated"), "no white smoke from 10 % solutions");
  assert.ok(b.aq("NH4+") > 10, "ammonium chloride in solution");
  assert.ok(b.look().liquid.turbidity < 0.02, "nothing to see");
  assert.ok(b.ph() > 4 && b.ph() < 10, `close to neutral: pH ${b.ph()?.toFixed(1)}`);
});
