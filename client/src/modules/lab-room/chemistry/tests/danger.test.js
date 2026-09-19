import { test } from "node:test";
import assert from "node:assert/strict";
import { bench, near, reactions, saw, warnings } from "./harness.js";

// № 39
test("39 · sugar and concentrated sulfuric acid darken, then push up a carbon column", () => {
  const b = bench("beaker");
  b.powder("sugar", 10).pour("water", 1).pour("h2so4", 10);
  const start = b.m.tempC;
  const waiting = b.run(12);
  assert.ok(b.peak.char > 0.5, `the heap darkens first: ${b.peak.char}`);
  assert.equal(b.solid("C"), 0, "no carbon column yet");
  assert.ok(!saw(waiting, "reaction", "sugar-h2so4"));

  const events = b.run(16);
  assert.ok(saw(events, "reaction", "sugar-h2so4"), reactions(events).join());
  assert.equal(b.peak.char, 1, "black");
  assert.ok(b.peak.column > 0.6, `the column rises: ${b.peak.column.toFixed(2)}`);
  assert.ok(near(b.solid("C"), 350, 0.3), `carbon ${b.solid("C").toFixed(0)} mmol`);
  assert.ok(b.gasOf("SO2") + 0 > 0, "choking sulfur dioxide");
  assert.equal(b.peak.smoke?.toxic, true);
  assert.ok(warnings(events).includes("toxic-outside-hood"), warnings(events).join());
  // Doc 14 № 39 says about 110 °C; the engine caps the mixture at the boiling point of the water it releases.
  assert.ok(b.m.tempC > 90 && b.m.tempC - start > 40, `heated to ${b.m.tempC.toFixed(0)} °C from ${start.toFixed(0)}`);
});

// № 40
test("40 · water poured onto concentrated acid spits and warns", () => {
  const b = bench("test-tube");
  b.pour("h2so4", 5);
  const start = b.m.tempC;
  b.pour("water", 1);
  const events = b.run(2);
  assert.ok(saw(events, "reaction", "water-into-acid"), reactions(events).join());
  assert.ok(warnings(events).includes("water-into-acid"), warnings(events).join());
  const spatter = events.find((e) => e.type === "spatter");
  assert.ok(spatter && spatter.acid === true, "acid droplets fly out");
  assert.ok(b.peak.spatter > 0.5 && b.peak.steam > 0.5, "spatter and steam");
  // Doc 14 № 40: +60…+80 °C in the bulk.
  assert.ok(near(b.m.tempC - start, 70, 0.5), `warmed by ${(b.m.tempC - start).toFixed(0)} °C`);
});

// № 40 branch
test("40 · alkali poured onto concentrated acid is even worse", () => {
  const plain = bench("test-tube");
  plain.pour("h2so4", 5).pour("water", 1);
  plain.run(2);
  const alkali = bench("test-tube");
  alkali.pour("h2so4", 5).pour("naoh", 1);
  const events = alkali.run(2);
  assert.ok(warnings(events).includes("water-into-acid"), warnings(events).join());
  assert.ok(alkali.m.tempC > plain.m.tempC, `${alkali.m.tempC.toFixed(0)} vs ${plain.m.tempC.toFixed(0)} °C`);
});

// № 41
test("41 · acid poured into water warms it evenly and never spatters", () => {
  const b = bench("beaker");
  b.pour("water", 9);
  const start = b.m.tempC;
  const events = b.pour("h2so4", 1).run(3);
  assert.ok(saw(events, "reaction", "acid-into-water"), reactions(events).join());
  assert.ok(!warnings(events).includes("water-into-acid"), "the right way round: no warning");
  assert.ok(!saw(events, "spatter"), "no droplets");
  assert.ok(b.peak.schlieren > 0.5, "wavy streaks while it sinks");
  assert.ok(near(b.m.tempC - start, 30, 0.5), `warmed by ${(b.m.tempC - start).toFixed(0)} °C`);
  b.run(60);
  assert.ok(b.m.tempC < 30, "and cools back down within a minute");

  // Doc 14 № 41: diluting 10 % caustic soda hardly warms at all.
  const base = bench("beaker");
  base.pour("water", 9).pour("naoh", 1);
  base.run(3);
  assert.ok(Math.abs(base.m.tempC - 22) < 1, `alkali: ${(base.m.tempC - 22).toFixed(2)} °C`);
});

// § 5 Q8
test("Q8 · the mixtures doc 14 keeps out of the classroom raise a warning", () => {
  const permanganate = bench("beaker");
  permanganate.pour("h2so4", 5).powder("kmno4", 1);
  const one = permanganate.run(2);
  assert.ok(warnings(one).includes("dangerous-mix"), warnings(one).join());
  assert.ok(permanganate.peak.smoke?.toxic, "heat and smoke, no detailed chemistry");
  assert.ok(permanganate.m.tempC > 22);

  const nitric = bench("beaker");
  nitric.pour("hno3", 5).pour("ethanol", 2);
  assert.ok(warnings(nitric.run(2)).includes("dangerous-mix"));

  const peroxide = bench("beaker");
  peroxide.pour("h2so4", 5).pour("h2o2", 3);
  assert.ok(warnings(peroxide.run(2)).includes("dangerous-mix"));

  const sodium = bench("beaker");
  sodium.pour("hcl", 30).piece("sodium");
  const violent = sodium.run(4);
  assert.ok(warnings(violent).includes("dangerous-mix"), warnings(violent).join());
  assert.ok(sodium.solid("Na") < 4, "it runs away much faster than in water");
});

// § 4.5 and § 5 Q8
test("4.5 · hydrogen and oxygen sit quietly until a spark reaches them", () => {
  const b = bench("gas-jar");
  b.gas("hydrogen", 330).gas("oxygen", 170);
  const quiet = b.run(5, { covered: true });
  assert.ok(!saw(quiet, "bang"), "nothing to see without ignition");
  assert.ok(b.gasOf("H2") > 10, "the mixture is still there");

  const chlorine = bench("gas-jar");
  chlorine.gas("hydrogen", 250).gas("chlorine", 250);
  const warned = chlorine.run(2, { covered: true });
  assert.ok(warnings(warned).includes("dangerous-mix"), warnings(warned).join());
  const lit = chlorine.run(0.2, { flame: "lamp", covered: true });
  assert.ok(saw(lit, "bang"), "a flame sets it off");
  assert.ok(chlorine.aq("H+") > 0 || chlorine.gasOf("H2") < 1, "hydrogen chloride is left");
});

// Hot glass and heated concentrated acid
test("safety · hot glass and heated concentrated acid warn before anyone grabs them", () => {
  const b = bench("test-tube");
  b.pour("h2so4", 3);
  const events = b.run(60, { heatW: 60, inFumeHood: true });
  assert.ok(warnings(events).includes("concentrated-acid-heat"), warnings(events).join());
  assert.ok(warnings(events).includes("hot-glass"), "the tube itself is dangerous now");
  assert.ok(b.m.tempC > 120, `${b.m.tempC.toFixed(0)} °C`);
});
