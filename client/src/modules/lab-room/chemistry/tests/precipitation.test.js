import { test } from "node:test";
import assert from "node:assert/strict";
import { bench, near, reactions, saw } from "./harness.js";

// № 4
test("4 · silver nitrate and hydrochloric acid give a curdy white precipitate", () => {
  const b = bench("test-tube");
  b.pour("agno3", 1).pour("hcl", 0.1);
  const events = b.run(1.2);
  assert.ok(saw(events, "reaction", "agno3-hcl"), reactions(events).join());
  assert.ok(b.look().liquid.turbidity > 0.8, "milky at once");
  assert.ok(near(b.solid("AgCl"), 0.1, 0.05), `AgCl ${b.solid("AgCl").toFixed(3)} mmol`);
  b.run(20);
  assert.ok(b.look().bed.ml > 0.01, "settles in about ten seconds");
  assert.equal(b.look().bed.color, "#f5f5f0");
});

// № 5
test("5 · silver nitrate and potassium iodide give a pale yellow precipitate", () => {
  const b = bench("test-tube");
  b.pour("agno3", 1).pour("ki", 0.2);
  const events = b.run(1.2);
  assert.ok(saw(events, "reaction", "agno3-ki"), reactions(events).join());
  assert.ok(near(b.solid("AgI"), 0.1, 0.05), `AgI ${b.solid("AgI").toFixed(3)}`);
  b.run(20);
  assert.equal(b.look().bed.color, "#f0dc82");
  // Doc 14 № 5: unlike the chloride it does not dissolve in ammonia.
  b.pour("nh3", 1);
  b.run(5);
  assert.ok(b.solid("AgI") > 0.09, "still there");
});

// § 5 Q9
test("Q9 · silver chloride dissolves in excess ammonia and comes back with acid", () => {
  const b = bench("test-tube");
  b.pour("agno3", 1).pour("hcl", 0.1).run(1);
  assert.ok(b.solid("AgCl") > 0.09);
  const events = b.pour("nh3", 1).run(6);
  assert.ok(saw(events, "reaction", "agcl-nh3"), reactions(events).join());
  assert.ok(b.solid("AgCl") < 0.01, "the curd dissolved");
  assert.ok(b.aq("Ag(NH3)2+") > 0.09, "as the diammine complex");
  b.pour("hno3", 0.5);
  b.run(4);
  assert.ok(b.solid("AgCl") > 0.08, "acid destroys the complex and the precipitate returns");
});

// § 5 Q9
test("Q9 · silver nitrate with caustic soda gives brown silver oxide", () => {
  const b = bench("test-tube");
  b.pour("agno3", 2).pour("naoh", 0.2);
  const events = b.run(2);
  assert.ok(saw(events, "reaction", "agno3-naoh"), reactions(events).join());
  assert.ok(b.solid("Ag2O") > 0.15, `Ag2O ${b.solid("Ag2O").toFixed(3)}`);
  assert.ok(b.look().liquid.turbidity > 0.3, "brown turbidity");
});

// № 6
test("6 · copper sulfate with caustic soda, then heat, then acid", () => {
  const b = bench("test-tube");
  b.pour("cuso4", 2).pour("naoh", 1);
  const start = b.m.tempC;
  const events = b.run(1.5);
  assert.ok(saw(events, "reaction", "cuso4-naoh"), reactions(events).join());
  assert.ok(near(b.solid("Cu(OH)2"), 1, 0.1), `Cu(OH)2 ${b.solid("Cu(OH)2").toFixed(2)}`);
  assert.ok(b.aq("Cu2+") < 0.02, "the blue leaves the solution");
  assert.ok(near(b.m.tempC - start, 2), `warmed by ${(b.m.tempC - start).toFixed(1)} °C`);

  const hot = b.run(30, { heatW: 100 });
  assert.ok(saw(hot, "reaction", "cuso4-naoh-heat"), reactions(hot).join());
  assert.ok(b.solid("CuO") > 0.8, `black CuO ${b.solid("CuO").toFixed(2)}`);
  assert.equal(b.look().bed.color, "#1a1a1a");

  b.pour("hcl", 2);
  const acid = b.run(40);
  assert.ok(saw(acid, "reaction", "hydroxide-acid"), reactions(acid).join());
  assert.ok(b.solid("CuO") < 0.2, "the oxide dissolves");
  assert.ok(b.aq("Cu2+") > 0.7, "a blue copper(II) solution again");
});

// № 7
test("7 · iron(III) chloride with alkali or ammonia gives rust-brown iron(III) hydroxide", () => {
  for (const base of ["naoh", "nh3"]) {
    const b = bench("test-tube");
    b.pour("fecl3", 2).pour(base, 2);
    const events = b.run(2);
    assert.ok(saw(events, "reaction", "fecl3-naoh"), `${base}: ${reactions(events).join()}`);
    assert.ok(near(b.solid("Fe(OH)3"), 1, 0.15), `${base}: Fe(OH)3 ${b.solid("Fe(OH)3").toFixed(2)}`);
    assert.ok(b.aq("Fe3+") < 0.02, `${base}: supernatant almost colourless`);
    // Doc 14 № 7: excess base does not dissolve it.
    b.pour(base, 2);
    b.run(3);
    assert.ok(b.solid("Fe(OH)3") > 0.8, `${base}: still a precipitate`);
  }
  const b = bench("test-tube");
  b.pour("fecl3", 2).pour("naoh", 2).run(2);
  b.pour("hcl", 3);
  b.run(15);
  assert.ok(b.solid("Fe(OH)3") < 0.1, "acid dissolves it");
  assert.ok(b.aq("Fe3+") > 0.8, "the yellow-brown solution is back");
});

// № 8
test("8 · limewater goes milky with carbon dioxide, clears with more, and clouds again when heated", () => {
  const b = bench("test-tube");
  b.pour("limewater", 5);
  b.gas("co2", 3, 0.95);
  const events = b.run(5);
  assert.ok(saw(events, "reaction", "limewater-co2"), reactions(events).join());
  assert.ok(b.look().liquid.turbidity > 0.5, `milky: ${b.look().liquid.turbidity.toFixed(2)}`);
  assert.ok(near(b.solid("CaCO3"), 0.108, 0.3), `CaCO3 ${b.solid("CaCO3").toFixed(3)}`);

  for (let i = 0; i < 4; i += 1) {
    b.gas("co2", 2, 0.95);
    b.run(4);
  }
  assert.ok(b.solid("CaCO3") < 0.02, "excess gas dissolves it as the hydrogen carbonate");
  assert.ok(b.look().liquid.turbidity < 0.1, "clear again");
  assert.ok(b.aq("HCO3-") > 0.15, "calcium hydrogen carbonate in solution");

  const hot = b.run(25, { heatW: 100 });
  assert.ok(saw(hot, "reaction", "limewater-co2-heat"), reactions(hot).join());
  assert.ok(b.solid("CaCO3") > 0.05, "heating brings the chalk back");
});

// № 9
test("9 · copper sulfate with a little ammonia clouds, with plenty it goes ink blue", () => {
  const b = bench("test-tube");
  b.pour("cuso4", 2).pour("nh3", 0.2);
  const first = b.run(2);
  assert.ok(saw(first, "reaction", "cuso4-nh3"), reactions(first).join());
  assert.ok(b.look().liquid.turbidity > 0.3, `turbid: ${b.look().liquid.turbidity.toFixed(2)}`);
  assert.ok(b.solid("CuBasicSulfate") > 0.3, "pale blue basic salt");

  const second = b.pour("nh3", 2).run(4);
  assert.ok(saw(second, "reaction", "cuso4-nh3-excess"), reactions(second).join());
  assert.ok(b.solid("CuBasicSulfate") < 0.02, "the precipitate dissolves");
  assert.ok(near(b.aq("Cu(NH3)4 2+"), 1, 0.1), `complex ${b.aq("Cu(NH3)4 2+").toFixed(2)}`);
  assert.ok(b.look().liquid.turbidity < 0.1, "clear");
  assert.ok(b.look().liquid.opacity > 0.6, "deep colour");
});

// § 5 Q9
test("Q9 · soda solution with copper and iron salts", () => {
  const copper = bench("test-tube");
  copper.pour("water", 5).powder("nahco3", 0.4).run(20, { stirring: true });
  const events = copper.pour("cuso4", 2).run(3);
  assert.ok(saw(events, "reaction", "metal-nahco3"), reactions(events).join());
  assert.ok(copper.solid("CuCarbonateBasic") > 0.3, "bluish green precipitate");
  assert.ok(copper.gasOf("CO2") > 0.5, "and carbon dioxide");

  const iron = bench("test-tube");
  iron.pour("water", 5).powder("nahco3", 0.4).run(20, { stirring: true });
  iron.pour("fecl3", 1).run(3);
  assert.ok(iron.solid("Fe(OH)3") > 0.3, "brown precipitate");
});

// § 5 Q9
test("Q9 · limewater with soda solution gives chalk", () => {
  const b = bench("beaker");
  b.pour("water", 20).powder("nahco3", 0.4).run(20, { stirring: true });
  b.pour("limewater", 50);
  b.run(5);
  assert.ok(b.solid("CaCO3") > 0.5, `CaCO3 ${b.solid("CaCO3").toFixed(2)}`);
  assert.ok(b.look().liquid.turbidity > 0.5, "white turbidity");
});

// № 27 follow-up
test("27 · burnt magnesium ash makes water faintly alkaline", () => {
  const b = bench("beaker");
  b.pour("water", 50).pour("phenolphthalein", 0.2);
  b.m.solids.push({ species: "MgO", form: "residue", mmol: 1.2, count: 0, suspended: 0, startMmol: 1.2, glow: 0, state: null });
  const events = b.run(40, { stirring: true });
  assert.ok(saw(events, "reaction", "mgo-water"), reactions(events).join());
  const ph = b.ph();
  assert.ok(ph > 9.5 && ph < 11.5, `pH ${ph?.toFixed(2)}`);
  assert.ok(b.look().liquid.opacity > 0.2, "faint pink");
});
