import { test } from "node:test";
import assert from "node:assert/strict";
import { bench, near, reactions, saw } from "./harness.js";
import { phPaperColor } from "../acidity.js";

// № 1
test("1 · NaOH + phenolphthalein goes pink and one drop of acid clears it", () => {
  const b = bench("conical-flask");
  b.pour("water", 10).pour("naoh", 1).pour("phenolphthalein", 0.1);
  const start = b.m.tempC;
  const events = b.run(1);
  assert.ok(b.ph() > 12, `alkaline: ${b.ph()}`);
  assert.ok(b.look().liquid.opacity > 0.3, "pink");
  assert.ok(saw(events, "reaction", "naoh-phenolphthalein"), reactions(events).join());

  b.pour("hcl", 0.9);
  const titration = b.run(1);
  assert.ok(b.ph() > 8.2, "still pink just before the equivalence point");
  assert.ok(saw(titration, "reaction", "naoh-phenolphthalein-hcl"));
  b.pour("hcl", 0.1);
  b.run(1);
  assert.ok(b.ph() < 7, `acid after the last drop: ${b.ph()}`);
  assert.ok(b.look().liquid.opacity < 0.15, "colourless again");
  // Doc 14 № 1: about +3 °C for the diluted solutions.
  assert.ok(near(b.m.tempC - start, 3), `warmed by ${(b.m.tempC - start).toFixed(1)} °C`);
});

// № 1 note
test("1 · undiluted 10 % NaOH fades the pink away within a couple of minutes", () => {
  const b = bench("test-tube");
  b.pour("naoh", 5).pour("phenolphthalein", 0.1);
  b.run(1);
  const fresh = b.look().liquid.opacity;
  b.run(150);
  assert.ok(b.look().liquid.opacity < fresh * 0.4, `pink ${b.look().liquid.opacity.toFixed(2)} vs ${fresh.toFixed(2)}`);
  assert.ok(b.aq("PhenolphthaleinFaded") > 0, "the dye is in its colourless form");
});

// № 2
test("2 · ammonia turns phenolphthalein pink and loses it when heated", () => {
  const b = bench("test-tube");
  b.pour("nh3", 2).pour("water", 2).pour("phenolphthalein", 0.1);
  const cold = b.run(1);
  assert.ok(b.ph() > 11 && b.ph() < 12.5, `weak base: ${b.ph()}`);
  assert.ok(b.look().liquid.opacity > 0.3, "pink");
  assert.ok(saw(cold, "reaction", "nh3-phenolphthalein"));

  const hot = b.run(45, { heatW: 100 });
  assert.ok(saw(hot, "reaction", "nh3-heated"), reactions(hot).join());
  assert.ok(b.aq("NH3") < 0.01, "the ammonia has left");
  assert.ok(b.look().liquid.opacity < 0.1, "colourless again");
  assert.ok(saw(hot, "warning", "toxic-outside-hood"), "ammonia outside the fume hood");
  b.run(20);
  assert.ok(b.look().liquid.opacity < 0.1, "cooling does not bring the colour back");
});

// № 3
test("3 · indicator paper reads the catalogue solutions", () => {
  const cases = [
    ["hcl", 5, -1, 1, "#d7191c"],
    ["fecl3", 5, 1, 2, "#d7191c"],
    ["cuso4", 5, 3.4, 4.6, "#f07c21"],
    ["water", 5, 6.5, 7.2, "#5fae3e"],
    ["ki", 5, 6.5, 7.2, "#5fae3e"],
    // pH 11.85 sits on the boundary of the printed scale: blue or blue-violet both read "ishqoriy".
    ["nh3", 5, 11, 12.5, ["#2f6db5", "#3b2c8f"]],
    ["limewater", 5, 12, 13, "#3b2c8f"],
    ["naoh", 5, 13.5, 14.5, "#3b2c8f"],
  ];
  for (const [source, ml, low, high, color] of cases) {
    const b = bench("test-tube");
    b.pour(source, ml);
    b.run(0.5);
    const ph = b.ph();
    assert.ok(ph >= low && ph <= high, `${source}: pH ${ph?.toFixed(2)} outside ${low}…${high}`);
    const expected = Array.isArray(color) ? color : [color];
    assert.ok(expected.includes(phPaperColor(ph)), `${source} paper colour ${phPaperColor(ph)}`);
  }
});

// № 3 · soda solution
test("3 · sodium hydrogen carbonate dissolves to a weakly alkaline solution", () => {
  const b = bench("test-tube");
  b.pour("water", 5).powder("nahco3", 0.5);
  b.run(20, { stirring: true });
  assert.ok(b.solid("NaHCO3") < 0.6, "nearly all of it dissolved (0.5 g is close to saturation)");
  assert.ok(b.aq("HCO3-") > 5, "soda in solution");
  assert.ok(near(b.ph(), 8.3, 0.1), `pH ${b.ph()?.toFixed(2)}`);
  assert.equal(phPaperColor(b.ph()), "#2e9b8f");
});

// § 4.15
test("4.15 · phenolphthalein stays colourless in water, acid and soda solution", () => {
  for (const source of ["water", "hcl"]) {
    const b = bench("test-tube");
    b.pour(source, 5).pour("phenolphthalein", 0.1);
    b.run(1);
    assert.ok(b.look().liquid.opacity < 0.12, `${source} stays colourless`);
  }
  const soda = bench("test-tube");
  soda.pour("water", 5).powder("nahco3", 0.5).run(20, { stirring: true });
  soda.pour("phenolphthalein", 0.1);
  soda.run(1);
  assert.ok(soda.look().liquid.opacity < 0.25, "soda gives at most a hint of pink");
});

// § 4.6 and § 4.7
test("4.6 · carbon dioxide reacts with caustic soda invisibly and only acidifies water", () => {
  const base = bench("test-tube");
  base.pour("naoh", 1).pour("water", 5);
  const events = base.gas("co2", 40, 0.9).run(3);
  assert.ok(saw(events, "reaction", "co2-naoh"), reactions(events).join());
  assert.ok(base.look().liquid.turbidity < 0.05, "nothing to see: sodium carbonate is soluble");
  assert.ok(base.aq("CO3 2-") + base.aq("HCO3-") > 0.5, "the gas was absorbed");

  const water = bench("test-tube");
  water.pour("water", 5).gas("co2", 20, 0.9);
  water.run(2);
  const ph = water.ph();
  assert.ok(ph > 3.5 && ph < 5.5, `carbonic acid: pH ${ph?.toFixed(2)}`);
  assert.ok(water.look().liquid.turbidity < 0.05, "stays clear");
});
