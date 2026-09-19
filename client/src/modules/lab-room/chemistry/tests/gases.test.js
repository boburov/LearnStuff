import { test } from "node:test";
import assert from "node:assert/strict";
import { bench, near, reactions, saw, warnings } from "./harness.js";
import { sulfuricFraction } from "../mixture.js";

// № 10a
test("10 · soda in hydrochloric acid foams, gives carbon dioxide and cools the beaker", () => {
  const b = bench("beaker");
  b.pour("hcl", 5);
  const start = b.m.tempC;
  b.powder("nahco3", 0.5);
  const events = b.run(10);
  assert.ok(saw(events, "reaction", "nahco3-hcl"), reactions(events).join());
  assert.ok(b.solid("NaHCO3") < 0.05, "all of the powder went");
  assert.ok(near(b.gasOf("CO2") + 0, 5.95, 0.4), `CO2 ${b.gasOf("CO2").toFixed(2)} mmol`);
  assert.ok(b.peak.foam > 0.2, `foam ${b.peak.foam}`);
  // Doc 14 № 10a: the beaker cools by about 3 °C.
  assert.ok(near(b.m.tempC - start, -3), `cooled by ${(b.m.tempC - start).toFixed(1)} °C`);
});

// № 10b
test("10 · marble fizzes steadily for about twenty seconds and shrinks", () => {
  const b = bench("beaker");
  b.pour("hcl", 5).piece("marble");
  const start = b.m.tempC;
  b.run(2);
  assert.ok(b.peak.bubbles?.site === "pieces", "bubbles come off the chip");
  b.run(25);
  assert.ok(b.aq("H+") < 0.5, `the acid is used up: ${b.aq("H+").toFixed(2)} mmol left`);
  assert.ok(near(b.solid("CaCO3"), 2.8, 0.4), `chip left: ${b.solid("CaCO3").toFixed(2)} mmol`);
  assert.ok(b.aq("Ca2+") > 6, "calcium chloride in solution");
  assert.ok(Math.abs(b.m.tempC - start) < 4, `almost no temperature change: ${(b.m.tempC - start).toFixed(1)}`);
});

// § 4.8
test("4.8 · marble in dilute sulfuric acid stops fizzing as calcium sulfate seals it", () => {
  const beaker = bench("beaker");
  beaker.pour("water", 18).pour("h2so4", 2).run(2, { stirring: true });
  const b = bench("test-tube");
  beaker.into(b, 5);
  b.piece("marble");
  b.run(4);
  const early = b.solid("CaCO3");
  b.run(25);
  const chip = b.pieceOf("CaCO3");
  assert.ok(early - b.solid("CaCO3") < 0.3, "it practically stops");
  assert.ok(b.solid("CaSO4") > 0.05, "a calcium sulfate crust forms");
  assert.ok(chip.coat && chip.coat.amount > 0.5, `coat ${chip.coat?.amount}`);
  assert.ok(b.aq("H+") > 1, "most of the acid is left over");
});

// № 11
test("11 · magnesium, zinc and iron in hydrochloric acid", () => {
  const mg = bench("test-tube");
  mg.pour("hcl", 3).piece("magnesium");
  const start = mg.m.tempC;
  const events = mg.run(20);
  assert.ok(saw(events, "reaction", "metal-hcl-hydrogen"), reactions(events).join());
  assert.equal(mg.piecesLeft(), 0, "the ribbon is gone within about 15 s");
  assert.ok(near(mg.aq("Mg2+"), 1.23, 0.1), `Mg²⁺ ${mg.aq("Mg2+").toFixed(2)} mmol`);
  assert.equal(mg.peak.bubbles?.gas, "H2");
  assert.ok(near(mg.m.tempC - start, 18), `Mg warmed the tube by ${(mg.m.tempC - start).toFixed(1)} °C`);

  const zn = bench("test-tube");
  zn.pour("hcl", 3).piece("zinc");
  const znStart = zn.m.tempC;
  zn.run(25);
  assert.ok(zn.aq("Zn2+") > 3, `Zn²⁺ ${zn.aq("Zn2+").toFixed(2)} mmol`);
  assert.ok(zn.pieceOf("Zn"), "a granule is left over: the acid ran out first");
  assert.ok(near(zn.m.tempC - znStart, 3), `Zn warmed the tube by ${(zn.m.tempC - znStart).toFixed(1)} °C`);

  const fe = bench("test-tube");
  fe.pour("hcl", 3).powder("iron-filings", 0.5);
  const feStart = fe.m.tempC;
  fe.run(25);
  assert.ok(fe.aq("Fe2+") > 3, "iron(II), never iron(III)");
  assert.equal(fe.aq("Fe3+"), 0);
  assert.ok(fe.look().liquid.color !== "#0d2230", "pale green solution");
  assert.ok(near(fe.m.tempC - feStart, 2), `Fe warmed the tube by ${(fe.m.tempC - feStart).toFixed(1)} °C`);
});

// № 11 note
test("11 · a drop of copper sulfate speeds the zinc up", () => {
  const plain = bench("test-tube");
  plain.pour("hcl", 3).piece("zinc").run(4);
  const primed = bench("test-tube");
  primed.pour("hcl", 3).piece("zinc").pour("cuso4", 0.05).run(4);
  assert.ok(primed.aq("Zn2+") > plain.aq("Zn2+") * 1.5, `${primed.aq("Zn2+").toFixed(2)} vs ${plain.aq("Zn2+").toFixed(2)} mmol`);
});

// № 12 and № 41
test("12 · student-diluted sulfuric acid gives hydrogen with zinc", () => {
  const beaker = bench("beaker");
  beaker.pour("water", 9);
  const events = beaker.pour("h2so4", 1).run(3, { stirring: true });
  assert.ok(saw(events, "reaction", "acid-into-water"), reactions(events).join());
  assert.ok(near(sulfuricFraction(beaker.m), 0.16, 0.3), `${(sulfuricFraction(beaker.m) * 100).toFixed(0)} %`);
  assert.ok(near(beaker.m.tempC - 22, 30), `warmed to ${beaker.m.tempC.toFixed(0)} °C`);
  beaker.run(60);

  const tube = bench("test-tube");
  beaker.into(tube, 3);
  tube.piece("zinc");
  const zinc = tube.run(25);
  assert.ok(saw(zinc, "reaction", "metal-h2so4-hydrogen"), reactions(zinc).join());
  assert.ok(tube.gasOf("H2") + 0 > 0.5 || tube.aq("Zn2+") > 1, "hydrogen and zinc sulfate");
  assert.equal(tube.gasOf("SO2"), 0, "dilute acid never gives sulfur dioxide");
});

// № 13
test("13 · zinc in concentrated sulfuric acid gives sulfur dioxide, not hydrogen", () => {
  const b = bench("test-tube");
  b.pour("h2so4", 2).piece("zinc");
  const cold = b.run(10);
  const coldSO2 = b.gasOf("SO2");
  assert.ok(saw(cold, "reaction", "zn-h2so4-conc"), reactions(cold).join());
  assert.ok(coldSO2 < 0.05, `barely anything in the cold: ${coldSO2.toFixed(3)}`);
  assert.ok(!saw(cold, "warning", "toxic-outside-hood"), "a trickle does not raise the alarm");

  const hot = b.run(25, { heatW: 40 });
  assert.ok(b.gasOf("SO2") > coldSO2 * 10, `SO₂ ${b.gasOf("SO2").toFixed(2)} mmol vs ${coldSO2.toFixed(3)} cold`);
  assert.equal(b.gasOf("H2"), 0, "no hydrogen from concentrated acid");
  assert.ok(b.solid("S") > 0, "a trace of sulfur clouds it");
  assert.ok(warnings(hot).includes("toxic-outside-hood"), warnings(hot).join());
  assert.ok(saw(hot, "gas", undefined), "toxic gas leaves the tube");
});

// № 14
test("14 · copper and iron need a hot concentrated acid", () => {
  const cu = bench("test-tube");
  cu.pour("h2so4", 2).piece("copper");
  const cold = cu.run(10);
  assert.ok(saw(cold, "reaction", "cu-acid-none"), reactions(cold).join());
  assert.equal(cu.gasOf("SO2"), 0, "nothing in the cold");
  const hot = cu.run(30, { heatW: 60 });
  assert.ok(saw(hot, "reaction", "cu-h2so4-conc"), reactions(hot).join());
  assert.ok(cu.gasOf("SO2") > 0.2, `SO₂ ${cu.gasOf("SO2").toFixed(2)}`);
  assert.ok(cu.solid("CuSO4Anhydrous") > 0.1, "white-grey sediment");
  assert.ok(cu.solid("CuS") > 0, "dark sulfide haze");

  const fe = bench("test-tube");
  fe.pour("h2so4", 2).powder("iron-filings", 0.5);
  const passive = fe.run(10);
  assert.ok(saw(passive, "reaction", "fe-passivation"), reactions(passive).join());
  assert.equal(fe.gasOf("SO2"), 0, "passivated while cold");
  fe.run(30, { heatW: 60 });
  assert.ok(fe.gasOf("SO2") > 0.2, "sulfur dioxide once hot");
  assert.ok(fe.solid("Fe2(SO4)3") > 0.05, "pale iron(III) sulfate");
});

// № 15
test("15 · hydrogen peroxide over manganese dioxide boils with oxygen", () => {
  const b = bench("conical-flask");
  b.pour("h2o2", 1).pour("water", 9).run(1);
  const start = b.m.tempC;
  b.powder("mno2", 0.1);
  const events = b.run(16);
  assert.ok(saw(events, "reaction", "h2o2-mno2"), reactions(events).join());
  assert.ok(b.aq("H2O2") < 0.5, "the peroxide is gone in about 15 s");
  assert.ok(near(b.gasOf("O2") + 0, 4.9, 0.6), `O₂ ${b.gasOf("O2").toFixed(2)} mmol`);
  assert.ok(near(b.solid("MnO2"), 1.15, 0.05), "the catalyst is not used up");
  assert.ok(b.peak.foam > 0.2, `foam ${b.peak.foam}`);
  assert.ok(near(b.m.tempC - start, 10), `warmed by ${(b.m.tempC - start).toFixed(1)} °C`);
});

// № 15 branch
test("15 · undiluted 30 % peroxide boils and spatters", () => {
  const b = bench("conical-flask");
  b.pour("h2o2", 10).powder("mno2", 0.1);
  b.run(10);
  assert.ok(b.m.tempC > 80, `hot: ${b.m.tempC.toFixed(0)} °C`);
  assert.ok(b.peak.spatter > 0.2, `spatter ${b.peak.spatter}`);
  assert.ok(b.peak.steam > 0.2, "steam");
});

// № 16
test("16 · potassium iodide also decomposes peroxide and stains it brown", () => {
  const stock = bench("conical-flask");
  stock.pour("h2o2", 1).pour("water", 9).run(1);
  const b = bench("test-tube");
  stock.into(b, 5);
  const start = b.m.tempC;
  b.pour("ki", 1);
  const events = b.run(25);
  assert.ok(saw(events, "reaction", "h2o2-ki"), reactions(events).join());
  assert.ok(b.aq("H2O2") < 0.5, "gone in about 20 s");
  assert.equal(b.peak.bubbles?.gas, "O2", "oxygen bubbles");
  assert.ok(b.aq("I2") > 0.01, "a little iodine colours it");
  assert.ok(b.look().liquid.opacity > 0.25, `brown: ${b.look().liquid.opacity.toFixed(2)}`);
  assert.ok(near(b.m.tempC - start, 5), `warmed by ${(b.m.tempC - start).toFixed(1)} °C`);
});

// № 17a
test("17 · copper in concentrated nitric acid gives brown nitrogen dioxide", () => {
  const b = bench("test-tube");
  b.pour("hno3", 1).piece("copper");
  const events = b.run(15);
  assert.ok(saw(events, "reaction", "cu-hno3"), reactions(events).join());
  assert.ok(b.gasOf("NO2") > 0.5, `NO₂ ${b.gasOf("NO2").toFixed(2)}`);
  assert.ok(b.look().headspace.opacity > 0.3, "brown haze over the liquid");
  assert.ok(b.aq("Cu2+") > 1.5, "a green-blue copper nitrate solution");
  assert.ok(warnings(events).includes("toxic-outside-hood"), warnings(events).join());
});

// № 17b
test("17 · copper in dilute nitric acid gives colourless NO that browns in air", () => {
  const b = bench("test-tube");
  b.pour("hno3", 1).pour("water", 2).run(1);
  b.piece("copper");
  const events = b.run(25);
  assert.ok(saw(events, "reaction", "cu-hno3"), reactions(events).join());
  assert.ok(b.aq("Cu2+") > 1, "copper dissolves");
  const brown = b.gasOf("NO2");
  assert.ok(brown > 0, "some of it turns brown where the air is");
  assert.ok(b.m.tempC - 22 < 12, `mild warming: ${(b.m.tempC - 22).toFixed(1)} °C`);
});

// № 18
test("18 · dry potassium permanganate crackles and gives oxygen when heated", () => {
  const b = bench("test-tube");
  b.powder("kmno4", 1.5);
  const cold = b.run(5);
  assert.equal(b.gasOf("O2"), 0, "nothing at room temperature");
  assert.ok(!saw(cold, "reaction", "kmno4-heat"));
  const hot = b.run(45, { heatW: 100 });
  assert.ok(saw(hot, "reaction", "kmno4-heat"), reactions(hot).join());
  assert.ok(b.solid("KMnO4") < 1, "the crystals decompose");
  assert.ok(b.gasOf("O2") + 0 > 0.5, `O₂ left in the tube: ${b.gasOf("O2").toFixed(2)} mmol`);
  assert.ok(b.solid("PermanganateResidue") > 1, "dark green-black residue");
  assert.ok(b.peak.crackle > 0, "crackling");
  assert.equal(b.peak.smoke?.color, "#3d1f4a");
});

// § 4.12
test("4.12 · manganese dioxide and 10 % hydrochloric acid stay put", () => {
  const b = bench("test-tube");
  b.pour("hcl", 5).powder("mno2", 0.5);
  b.run(30);
  assert.equal(b.gasOf("Cl2"), 0, "no chlorine without concentrated acid and heat");
  assert.ok(near(b.solid("MnO2"), 5.75, 0.05), "the powder is untouched");
});
