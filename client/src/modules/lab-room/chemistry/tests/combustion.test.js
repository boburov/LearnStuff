import { test } from "node:test";
import assert from "node:assert/strict";
import { bench, near, reactions, saw, warnings } from "./harness.js";

// № 27
test("27 · magnesium ribbon catches after three seconds and burns white", () => {
  const b = bench("evaporating-dish");
  b.piece("magnesium");
  const waiting = b.run(2.5, { flame: "lamp" });
  assert.ok(!saw(waiting, "ignite"), "it has to warm up first");
  assert.equal(b.solid("MgO"), 0);

  const events = b.run(6, { flame: "lamp" });
  assert.ok(saw(events, "ignite"), "it catches fire");
  assert.ok(saw(events, "reaction", "mg-burning"), reactions(events).join());
  assert.equal(b.peak.flame?.kind, "magnesium");
  assert.equal(b.peak.smoke?.color, "#f5f5f5");
  assert.ok(near(b.solid("MgO"), 1.23, 0.15), `MgO ${b.solid("MgO").toFixed(2)} mmol`);
  assert.equal(b.solid("Mg"), 0, "the ribbon is gone");
  assert.equal(b.look().bed.color, "#f2f2f2", "white ash");
});

// № 28
test("28 · burning magnesium carries on in carbon dioxide and leaves soot", () => {
  const b = bench("gas-jar");
  b.gas("co2", 500);
  b.piece("magnesium", { state: { burning: true } });
  const events = b.run(5, { covered: true });
  assert.ok(saw(events, "reaction", "mg-burning"), reactions(events).join());
  assert.ok(b.solid("MgO") > 0.5, "white magnesia");
  assert.ok(b.solid("C") > 0.2, `soot ${b.solid("C").toFixed(2)} mmol`);
  assert.ok(b.peak.sparks > 0, "sparkier than in air");
  assert.ok(b.gasOf("CO2") < 500 / 24, "it eats the carbon dioxide");
});

// № 28 first half
test("28 · an ordinary flame goes out in carbon dioxide", () => {
  const b = bench("gas-jar");
  b.pour("ethanol", 1);
  const lit = b.run(2, { flame: "lamp" });
  assert.ok(saw(lit, "ignite"), "ethanol lights in air");
  b.gas("co2", 500);
  const doused = b.run(2, { covered: true });
  assert.ok(saw(doused, "extinguish"), "and goes out as soon as the jar fills with CO₂");
});

// № 29
test("29 · one millilitre of ethanol burns for about twenty-five seconds", () => {
  const b = bench("evaporating-dish");
  b.pour("ethanol", 1);
  const events = b.run(20, { flame: "lamp" });
  assert.ok(saw(events, "ignite"), "a flame lights it");
  assert.ok(saw(events, "reaction", "ethanol-burning"), reactions(events).join());
  assert.equal(b.peak.flame?.kind, "ethanol");
  assert.ok(b.aq("C2H5OH") > 0, "still burning at twenty seconds");
  const end = b.run(15);
  assert.ok(saw(end, "extinguish"), "it goes out by itself when the dish is dry");
  assert.ok(b.m.tempC > 55, `the dish is hot: ${b.m.tempC.toFixed(0)} °C`);
  assert.ok(b.gasOf("CO2") + 0 > 0, "carbon dioxide and water vapour");
});

// № 30
test("30 · sulfur melts, darkens and burns with a dim blue flame", () => {
  const b = bench("crucible");
  b.powder("sulfur", 0.2);
  b.run(12, { heatW: 150, inFumeHood: true });
  assert.ok(b.solid("SMolten") + b.solid("SDark") > 3, "it melts before it burns");
  const events = b.run(30, { heatW: 150, inFumeHood: true });
  assert.ok(saw(events, "ignite"), "it catches at about 250 °C");
  assert.ok(saw(events, "reaction", "sulfur-burning"), reactions(events).join());
  assert.equal(b.peak.flame?.kind, "sulfur");
  assert.ok(b.gasOf("SO2") + 0 > 0.5, `SO₂ ${b.gasOf("SO2").toFixed(2)} mmol`);
  assert.ok(!warnings(events).includes("toxic-outside-hood"), "no alarm inside the fume hood");
  const outside = bench("crucible");
  outside.powder("sulfur", 0.2, { burning: true });
  const loose = outside.run(2);
  assert.ok(warnings(loose).includes("toxic-outside-hood"), "but one outside it");
});

// № 31
test("31 · sulfur in a jar of oxygen burns brighter and faster", () => {
  const rich = bench("gas-jar");
  rich.pour("water", 20).gas("oxygen", 480);
  rich.powder("sulfur", 0.1, { burning: true });
  const events = rich.run(4, { inFumeHood: true, covered: true });
  assert.equal(rich.peak.flame?.kind, "sulfur-oxygen");
  assert.ok(rich.peak.flame.intensity > 0.9, "much brighter");
  assert.ok(saw(events, "reaction", "sulfur-burning"));

  const air = bench("gas-jar");
  air.powder("sulfur", 0.1, { burning: true });
  air.run(4, { inFumeHood: true });
  assert.ok(rich.solid("S") < air.solid("S"), "three times faster in oxygen");
  assert.ok(rich.aq("SO2(aq)") > 0, "the water at the bottom takes some of the gas up");
  assert.ok(rich.ph() < 5, `and turns acidic: pH ${rich.ph()?.toFixed(1)}`);
});

// № 32
test("32 · pure hydrogen pops quietly, hydrogen with air barks", () => {
  const pure = bench("test-tube");
  pure.gas("hydrogen", 30);
  const quiet = pure.run(0.2, { flame: "lamp" });
  assert.ok(saw(quiet, "reaction", "h2-test"), reactions(quiet).join());
  const pop = quiet.find((e) => e.type === "pop");
  assert.ok(pop && pop.strength < 0.5, `quiet pop: ${pop?.strength}`);
  assert.ok(!saw(quiet, "bang"), "no bang at test-tube scale");
  assert.ok(pure.gasOf("H2") < 0.1, "the hydrogen burned");

  const mixed = bench("test-tube");
  mixed.gas("hydrogen", 12);
  const bark = mixed.run(0.2, { flame: "lamp" });
  const loud = bark.find((e) => e.type === "pop");
  assert.ok(loud && loud.strength > 0.7, `squeaky bark: ${loud?.strength}`);
  assert.ok(warnings(bark).includes("hydrogen-impure"), warnings(bark).join());
});

// № 33
test("33 · two volumes of hydrogen to one of oxygen shatter the gas jar", () => {
  const b = bench("gas-jar");
  b.gas("hydrogen", 330).gas("oxygen", 170);
  const events = b.run(0.2, { flame: "lamp" });
  assert.ok(saw(events, "reaction", "h2-o2-explosion"), reactions(events).join());
  const bang = events.find((e) => e.type === "bang");
  assert.ok(bang && bang.strength > 0.8, `bang ${bang?.strength}`);
  assert.ok(saw(events, "shatter"), "the jar breaks");
  assert.ok(saw(events, "flash"), "and flashes");
  assert.ok(b.peak.steam > 0, "a puff of steam");

  // Doc 14 № 33: hydrogen and air in the same jar bang without breaking the glass.
  const air = bench("gas-jar");
  air.gas("hydrogen", 250);
  const softer = air.run(0.2, { flame: "lamp" });
  assert.ok(saw(softer, "bang") || saw(softer, "pop"), "still loud");
  assert.ok(!saw(softer, "shatter"), "but the jar survives");
});

// № 34
test("34 · permanganate and glycerin catch fire after a delay", () => {
  const b = bench("evaporating-dish");
  b.powder("kmno4", 2).pour("glycerin", 0.5);
  const quiet = b.run(9);
  assert.ok(!saw(quiet, "ignite"), "nothing happens at first");
  assert.equal(b.solid("Ash"), 0);
  b.run(8);
  assert.ok(b.peak.smoke?.color === "#cfcfcf", "smoke and steam come first");
  const fire = b.run(20);
  assert.ok(saw(fire, "ignite"), "then it bursts into flame");
  assert.ok(saw(fire, "reaction", "kmno4-glycerin"), reactions(fire).join());
  assert.equal(b.peak.flame?.kind, "permanganate");
  assert.ok(b.peak.sparks > 0.5, "sparks");
  assert.ok(b.solid("KMnO4") < 6, "the heap burns down");
  assert.ok(b.solid("Ash") > 1, "dark residue");
});

// № 35
test("35 · molten sodium burns in chlorine with a yellow flame and white smoke", () => {
  const b = bench("gas-jar");
  b.gas("chlorine", 500);
  b.piece("sodium", { state: { molten: true } });
  const events = b.run(8, { covered: true });
  assert.ok(saw(events, "reaction", "na-cl2"), reactions(events).join());
  assert.equal(b.peak.flame?.kind, "sodium");
  assert.equal(b.peak.smoke?.color, "#f5f5f5");
  assert.ok(b.solid("NaCl") > 3, `table salt ${b.solid("NaCl").toFixed(2)} mmol`);
  assert.ok(b.gasOf("Cl2") < 500 / 24, "the chlorine colour fades as it is used up");
  assert.ok(b.solid("Na") < 0.5, "the sodium is gone");
});

// № 36
test("36 · iron and sulfur glow through on their own once they are started", () => {
  const b = bench("test-tube");
  b.powder("iron-filings", 1.59).powder("sulfur", 0.91);
  const warmup = b.run(25, { heatW: 100, inFumeHood: true });
  assert.ok(!saw(warmup, "ignite"), "half a minute of heating is needed");
  assert.equal(b.solid("FeS"), 0);
  const start = b.run(28, { heatW: 100, inFumeHood: true });
  assert.ok(saw(start, "ignite"), "a red glow appears");
  assert.ok(saw(start, "reaction", "fe-s"), reactions(start).join());
  assert.equal(b.peak.glow?.color, "#ff5a1f");
  const made = b.solid("FeS");
  // Doc 14 № 36: the lamp is taken away as soon as the glow appears and it carries on by itself.
  const spreading = b.run(20);
  assert.ok(b.solid("FeS") > made * 1.5, `the glow spreads without the lamp: ${made.toFixed(1)} → ${b.solid("FeS").toFixed(1)} mmol`);
  assert.ok(b.solid("FeS") > 15, "a black mass of iron sulfide");
  assert.ok(b.gasOf("SO2") + 0 > 0, "a little sulfur dioxide");
  assert.ok(spreading.some((e) => e.type === "reaction" || e.type === "gas"), "still going");
});

// § 4.4
test("4.4 · a cold iron and sulfur mixture is only a mixture", () => {
  const b = bench("test-tube");
  b.powder("iron-filings", 1.59).powder("sulfur", 0.91);
  b.run(30);
  assert.equal(b.solid("FeS"), 0, "no reaction without heating");
  assert.ok(b.solid("Fe") > 25 && b.solid("S") > 25, "both powders are untouched");
});

// № 37 and № 38
test("37 · sodium skates over water, pops at the end and leaves an alkali", () => {
  const b = bench("crystallizing-dish");
  b.pour("water", 300).pour("phenolphthalein", 0.3);
  b.piece("sodium");
  const events = b.run(8);
  assert.ok(saw(events, "reaction", "na-water"), reactions(events).join());
  assert.ok(b.peak.sodiumBall, "a molten ball");
  assert.equal(b.peak.sodiumBall.burning, false, "a rice grain does not catch fire");
  assert.ok(b.peak.steam > 0, "white wisps");
  assert.ok(saw(events, "reaction", "sodium-water-phenolphthalein"), "pink trails follow it");

  const rest = b.run(14);
  assert.ok(saw(rest, "pop"), "a small pop at the end");
  assert.ok(saw(rest, "spatter"), "and a splash");
  assert.equal(b.solid("Na"), 0, "about fifteen seconds and it is gone");
  assert.ok(near(b.aq("OH-"), 4.35, 0.15), `caustic soda ${b.aq("OH-").toFixed(2)} mmol`);
  assert.ok(b.ph() > 10.5, `alkaline: pH ${b.ph()?.toFixed(1)}`);
  assert.ok(b.look().liquid.opacity > 0.3, "the whole dish is pink");
  assert.ok(b.m.tempC - 22 < 3, "the big dish barely warms");
});

// № 37 branches
test("37 · a bigger piece burns and a narrow vessel is dangerous", () => {
  const big = bench("crystallizing-dish");
  big.pour("water", 300).piece("sodium", { grams: 0.4 });
  big.run(10);
  assert.ok(big.peak.sodiumBall.burning, "over 0.3 g it lights up");
  assert.equal(big.peak.flame?.kind, "sodium-water");

  const tube = bench("test-tube");
  tube.pour("water", 10).piece("sodium");
  const events = tube.run(8);
  assert.ok(warnings(events).includes("sodium-narrow"), warnings(events).join());
  assert.ok(tube.peak.sodiumBall.burning, "it ignites in a narrow tube");
  assert.ok(tube.solid("Na") < 4, "and runs away much faster");
});

// § 4.9
test("4.9 · sodium in ethanol is the same reaction, only calm", () => {
  const b = bench("test-tube");
  b.pour("ethanol", 10).piece("sodium");
  const events = b.run(20);
  assert.ok(saw(events, "reaction", "na-ethanol"), reactions(events).join());
  assert.ok(b.aq("C2H5O-") > 0.5, "sodium ethoxide");
  assert.equal(b.peak.sodiumBall, undefined, "no skating ball");
  assert.equal(b.peak.flame, undefined, "and no flame");
  assert.ok(b.gasOf("H2") > 0, "steady hydrogen bubbles");
});

// § 4.10
test("4.10 · magnesium ignores cold water and slowly reacts with hot water", () => {
  const cold = bench("test-tube");
  cold.pour("water", 10).piece("magnesium");
  cold.run(30);
  assert.equal(cold.gasOf("H2"), 0, "the oxide film protects it");

  const hot = bench("test-tube");
  hot.pour("water", 10).pour("phenolphthalein", 0.1).piece("magnesium");
  const events = hot.run(60, { heatW: 100 });
  assert.ok(saw(events, "reaction", "mg-hot-water"), reactions(events).join());
  assert.equal(hot.peak.bubbles?.gas, "H2", "slow hydrogen");
  assert.ok(hot.ph() > 8.2, `faintly alkaline: pH ${hot.ph()?.toFixed(1)}`);
});

// § 4.11
test("4.11 · zinc needs hot caustic soda before it gives hydrogen", () => {
  const cold = bench("test-tube");
  cold.pour("naoh", 5).piece("zinc");
  cold.run(30);
  assert.ok(cold.aq("Zn(OH)4 2-") < 0.5, `almost nothing in the cold: ${cold.aq("Zn(OH)4 2-").toFixed(2)} mmol zincate`);

  const hot = bench("test-tube");
  hot.pour("naoh", 5).piece("zinc");
  const events = hot.run(60, { heatW: 100 });
  assert.ok(saw(events, "reaction", "zn-naoh-hydrogen"), reactions(events).join());
  assert.equal(hot.peak.bubbles?.gas, "H2", "hydrogen bubbles");
  assert.ok(hot.aq("Zn(OH)4 2-") > 0.2, "the zincate goes into solution");
});
