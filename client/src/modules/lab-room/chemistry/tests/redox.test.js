import { test } from "node:test";
import assert from "node:assert/strict";
import { bench, near, reactions, saw } from "./harness.js";

// № 19
test("19 · iron filings pull the copper out of copper sulfate", () => {
  const b = bench("test-tube");
  b.pour("cuso4", 3);
  const start = b.m.tempC;
  b.powder("iron-filings", 0.5);
  const events = b.run(4);
  assert.ok(saw(events, "reaction", "metal-displacement"), reactions(events).join());
  assert.ok(b.solid("Cu") > 0.5, "a copper coating within a few seconds");
  b.run(20);
  assert.ok(b.aq("Cu2+") < 0.1, "the blue is used up");
  assert.ok(near(b.aq("Fe2+"), 1.5, 0.15), `Fe²⁺ ${b.aq("Fe2+").toFixed(2)} mmol`);
  assert.ok(near(b.m.tempC - start, 5), `warmed by ${(b.m.tempC - start).toFixed(1)} °C`);
});

// № 20
test("20 · zinc granules take a dark spongy copper coat and clear the solution", () => {
  const b = bench("test-tube");
  b.pour("cuso4", 3);
  const start = b.m.tempC;
  b.piece("zinc");
  b.run(25);
  const granule = b.pieceOf("Zn");
  assert.ok(granule.coat && granule.coat.amount > 0.8, `coat ${granule.coat?.amount}`);
  assert.equal(granule.coat.color, "#3b2418", "dark, not shiny red");
  assert.ok(b.aq("Cu2+") < 0.1, "colourless zinc sulfate is left");
  assert.ok(b.look().liquid.opacity < 0.15, "the blue has gone");
  assert.ok(b.gasOf("H2") > 0, "a few hydrogen bubbles come with it");
  assert.ok(near(b.m.tempC - start, 6), `warmed by ${(b.m.tempC - start).toFixed(1)} °C`);
});

// № 21
test("21 · copper wire grows a silver tree in silver nitrate", () => {
  const b = bench("test-tube");
  b.pour("agno3", 3);
  const start = b.m.tempC;
  b.piece("copper");
  b.run(4);
  const wire = b.pieceOf("Cu");
  assert.ok(wire.coat && wire.coat.amount > 0.5, "grey coat in about 3 s");
  b.run(20);
  assert.ok(b.look().crystals.mmol > 0.05, `crystals ${b.look().crystals.mmol.toFixed(3)} mmol`);
  assert.ok(b.aq("Ag+") < 0.02, "the silver came out of solution");
  assert.ok(near(b.aq("Cu2+"), 0.15, 0.2), `Cu²⁺ ${b.aq("Cu2+").toFixed(3)} mmol`);
  const look = b.look().liquid;
  assert.ok(look.opacity > 0.02 && look.opacity < 0.25, `pale blue: ${look.opacity.toFixed(2)}`);
  assert.ok(Math.abs(b.m.tempC - start) < 2, "barely any warming");
});

// § 4.1 and § 4.2
test("4.1 · copper does nothing in hydrochloric or dilute sulfuric acid", () => {
  const hcl = bench("test-tube");
  hcl.pour("hcl", 3).piece("copper");
  const events = hcl.run(20);
  assert.ok(saw(events, "reaction", "cu-acid-none"), reactions(events).join());
  assert.equal(hcl.gasOf("H2"), 0, "copper is below hydrogen in the series");
  assert.equal(hcl.aq("Cu2+"), 0);

  const dilute = bench("beaker");
  dilute.pour("water", 9).pour("h2so4", 1).run(3, { stirring: true });
  dilute.piece("copper");
  dilute.run(20);
  assert.equal(dilute.gasOf("H2"), 0, "the same in dilute sulfuric acid");
});

// № 22
test("22 · iron(III) chloride oxidises iodide to iodine", () => {
  const b = bench("test-tube");
  b.pour("ki", 2).pour("fecl3", 1);
  const events = b.run(4);
  assert.ok(saw(events, "reaction", "ki-fecl3"), reactions(events).join());
  assert.ok(near(b.aq("I2"), 0.25, 0.2), `I₂ ${b.aq("I2").toFixed(3)} mmol`);
  assert.ok(b.aq("Fe2+") > 0.4, "iron(II) now");
  assert.ok(b.look().liquid.opacity > 0.8, "dark brown");
  assert.ok(b.look().liquid.turbidity < 0.05, "no precipitate");
});

// № 23
test("23 · chlorine turns iodide brown and decolourises it again when there is too much", () => {
  const b = bench("test-tube");
  b.pour("ki", 3);
  b.gas("chlorine", 20, 0.9);
  const events = b.run(4);
  assert.ok(saw(events, "reaction", "cl2-ki"), reactions(events).join());
  assert.ok(b.aq("I2") > 0.3, `I₂ ${b.aq("I2").toFixed(2)} mmol`);
  assert.ok(b.look().liquid.opacity > 0.7, "brown");
  assert.ok(saw(events, "warning", "toxic-outside-hood"), "chlorine outside the hood");

  for (let i = 0; i < 8; i += 1) {
    b.gas("chlorine", 20, 0.9);
    b.run(3);
  }
  const late = b.run(20);
  assert.ok(saw(late, "reaction", "cl2-ki-excess") || b.aq("IO3-") > 0, "iodine goes on to iodate");
  assert.ok(b.aq("I2") < 0.1, `iodine left: ${b.aq("I2").toFixed(3)} mmol`);
});

// № 24a
test("24 · permanganate with peroxide in acid goes colourless", () => {
  const b = bench("beaker");
  b.pour("water", 10).powder("kmno4", 0.05);
  b.run(20, { stirring: true });
  assert.ok(b.look().liquid.opacity > 0.9, "deep violet");
  const acid = bench("beaker");
  acid.pour("water", 9).pour("h2so4", 1).run(2, { stirring: true });
  acid.into(b, 1);
  const stock = bench("conical-flask");
  stock.pour("h2o2", 1).pour("water", 9).run(1);
  stock.into(b, 1);
  const events = b.run(6, { stirring: true });
  assert.ok(saw(events, "reaction", "kmno4-h2o2-acid"), reactions(events).join());
  assert.ok(b.aq("MnO4-") < 0.02, "the violet is gone");
  assert.ok(b.aq("Mn2+") > 0.2, "manganese(II) in solution");
  assert.ok(b.look().liquid.opacity < 0.2, `almost colourless: ${b.look().liquid.opacity.toFixed(2)}`);
  assert.equal(b.peak.bubbles?.gas, "O2");
});

// № 24b
test("24 · without acid the same mixture gives brown manganese dioxide", () => {
  const b = bench("beaker");
  b.pour("water", 10).powder("kmno4", 0.05);
  b.run(20, { stirring: true });
  const stock = bench("conical-flask");
  stock.pour("h2o2", 1).pour("water", 9).run(1);
  stock.into(b, 2);
  const events = b.run(20, { stirring: true });
  assert.ok(saw(events, "reaction", "kmno4-h2o2-neutral"), reactions(events).join());
  assert.ok(b.solid("MnO2") > 0.1, `MnO₂ ${b.solid("MnO2").toFixed(2)} mmol`);
  assert.ok(b.look().liquid.turbidity > 0.3, "brown turbidity");
  // Doc 14 № 24b: the manganese dioxide then decomposes the rest of the peroxide (№ 15).
  const after = b.run(10);
  assert.ok(saw(after, "reaction", "h2o2-mno2") || b.aq("H2O2") < 0.1, "the bubbling does not stop");
});

// № 25
test("25 · copper sulfate with potassium iodide gives copper(I) iodide and iodine", () => {
  const b = bench("test-tube");
  b.pour("cuso4", 1).pour("ki", 2);
  const events = b.run(4);
  assert.ok(saw(events, "reaction", "cuso4-ki"), reactions(events).join());
  assert.ok(near(b.solid("CuI"), 0.5, 0.15), `CuI ${b.solid("CuI").toFixed(2)} mmol`);
  assert.ok(near(b.aq("I2"), 0.25, 0.2), `I₂ ${b.aq("I2").toFixed(3)} mmol`);
  assert.ok(b.aq("Cu2+") < 0.05, "no copper(II) left");
  assert.ok(b.look().liquid.turbidity > 0.3, "turbid brown");
  b.run(20);
  assert.ok(b.look().bed.ml > 0, "a tan bed settles");
});

// № 26 and § 4.13
test("26 · glycerin dissolves copper hydroxide to a deep blue, ethanol does not", () => {
  const b = bench("test-tube");
  b.pour("cuso4", 1).pour("naoh", 2).run(2);
  assert.ok(b.solid("Cu(OH)2") > 0.4, "pale blue precipitate first");
  const events = b.pour("glycerin", 1).run(5, { stirring: true });
  assert.ok(saw(events, "reaction", "glycerol-cuoh2"), reactions(events).join());
  assert.ok(b.solid("Cu(OH)2") < 0.02, "the precipitate dissolves");
  assert.ok(near(b.aq("CuGlycerate"), 0.5, 0.15), `glycerate ${b.aq("CuGlycerate").toFixed(2)} mmol`);
  assert.ok(b.look().liquid.opacity > 0.5, "deep blue");
  assert.ok(b.look().liquid.turbidity < 0.1, "clear");

  const sugar = bench("test-tube");
  sugar.pour("cuso4", 1).pour("naoh", 2).run(2);
  sugar.pour("water", 2).powder("sugar", 0.5);
  sugar.run(25, { stirring: true });
  assert.ok(sugar.aq("CuGlycerate") > 0.1, "sugar does the same");

  const ethanol = bench("test-tube");
  ethanol.pour("cuso4", 1).pour("naoh", 2).run(2);
  ethanol.pour("ethanol", 1);
  ethanol.run(10, { stirring: true });
  assert.ok(ethanol.solid("Cu(OH)2") > 0.4, "ethanol has only one OH group: nothing happens");
  assert.equal(ethanol.aq("CuGlycerate"), 0);
});

// § 5 Q9
test("Q9 · permanganate with iodide, iron(III) with copper and with peroxide", () => {
  const iodide = bench("test-tube");
  iodide.pour("water", 5).powder("kmno4", 0.05).run(20, { stirring: true });
  const events = iodide.pour("ki", 1).run(5);
  assert.ok(saw(events, "reaction", "kmno4-ki"), reactions(events).join());
  assert.ok(iodide.aq("I2") > 0.05, "brown iodine");

  const copper = bench("test-tube");
  copper.pour("fecl3", 5).piece("copper");
  copper.run(30);
  assert.ok(copper.aq("Cu2+") > 0.1, "iron(III) dissolves copper slowly");
  assert.ok(copper.aq("Fe2+") > 0.2, "and is reduced to iron(II)");

  const peroxide = bench("test-tube");
  peroxide.pour("fecl3", 1).pour("water", 5).pour("h2o2", 0.5);
  const fizz = peroxide.run(20);
  assert.ok(saw(fizz, "reaction", "fecl3-h2o2"), reactions(fizz).join());
  assert.equal(peroxide.peak.bubbles?.gas, "O2", "oxygen bubbles");
});

// № 17 generalised
test("17 · nitric acid oxidises other metals too, and never gives hydrogen", () => {
  const zinc = bench("test-tube");
  zinc.pour("hno3", 1).piece("zinc");
  const events = zinc.run(15, { inFumeHood: true });
  assert.ok(saw(events, "reaction", "cu-hno3"), reactions(events).join());
  assert.ok(zinc.gasOf("NO2") > 0.3, `NO₂ ${zinc.gasOf("NO2").toFixed(2)} mmol`);
  assert.equal(zinc.gasOf("H2"), 0, "no hydrogen from nitric acid");
  assert.ok(zinc.aq("Zn2+") > 0.5, "zinc nitrate in solution");
});

// № 21 with a more active metal
test("21 · magnesium also grows silver out of silver nitrate", () => {
  const b = bench("test-tube");
  b.pour("agno3", 3).piece("magnesium");
  b.run(20);
  assert.ok(b.look().crystals.mmol > 0.02, `silver crystals ${b.look().crystals.mmol.toFixed(3)} mmol`);
  assert.ok(b.aq("Ag+") < 0.02, "the silver came out of solution");
  assert.ok(b.aq("Mg2+") > 0.1, "magnesium went into it");
});
