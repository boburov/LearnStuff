import { atm, toxicWarn, warnOnce } from "./helpers";

// Water poured onto concentrated sulfuric acid (doc 14, № 40): it boils at the surface and throws acid out.
export const waterIntoAcid = {
  id: "water-into-acid",
  info: "water-into-acid",
  notice: 0.05,
  step(m, dt, ctx, k, events) {
    const state = k.state(m, "water-into-acid", { until: -Infinity });
    const now = ctx.now ?? 0;
    let total = 0;
    for (const mix of ctx.mixes ?? []) {
      if (!mix || mix.sulfuric < 0.8 || mix.volumeMl <= 0.2 || mix.addedMl <= 0.05) continue;
      // Any watery liquid does it: water, alkali or ammonia solution (doc 14, № 40).
      if (mix.portionSulfuric > 0.5 || mix.portionWater * 0.018 < 0.3 * mix.addedMl) continue;
      warnOnce(k, m, events, ctx, "water-into-acid", 15);
      k.emit(events, "spatter", { radius: 0.4, acid: true });
      // A thin test tube sometimes cracks from the shock (doc 14, № 40).
      if (m.narrow && Math.random() < 0.2) k.emit(events, "shatter");
      state.until = now + 2;
      total += mix.addedMl;
    }
    if (now < state.until) {
      k.fx(m, "spatter", 1);
      k.fx(m, "steam", 1);
      k.fx(m, "boiling", 0.8);
    }
    return total;
  },
};

// Acid poured into plenty of water (doc 14, № 41): the right way round — hot, but nothing splashes.
export const acidIntoWater = {
  id: "acid-into-water",
  info: "acid-into-water",
  notice: 0.05,
  step(m, dt, ctx, _k) {
    let total = 0;
    for (const mix of ctx.mixes ?? []) {
      if (!mix || mix.portionSulfuric < 0.8 || mix.addedMl <= 0.05) continue;
      if (mix.volumeMl < 3 * mix.addedMl || mix.sulfuric > 0.3) continue;
      total += mix.addedMl;
    }
    return total;
  },
};

// Sugar + conc. H₂SO₄ (doc 14, № 39): 15 s of darkening, then a black porous column climbs out of the beaker.
export const sugarSulfuric = {
  id: "sugar-sulfuric",
  info: "sugar-h2so4",
  notice: 0.02,
  step(m, dt, ctx, k, events) {
    const state = k.state(m, "sugar-sulfuric", { waited: 0, started: false, carbon: 0, target: 0 });
    if (!state.started && k.sulfuricFraction(m) < 0.7) return 0;
    const solid = m.solids.find((s) => s.species === "SucroseCrystals" && s.form !== "coat");
    const sucrose = k.aq(m, "Sucrose") + (solid?.mmol ?? 0);
    // The column stands after the sugar is gone, so keep drawing it while the carbon is there.
    if (sucrose <= k.EPS) {
      if (state.carbon > k.EPS) {
        k.fx(m, "char", 1);
        k.fx(m, "column", Math.min(1, state.carbon / (0.8 * state.target)));
      }
      return 0;
    }
    state.waited += dt;
    if (!state.started) {
      state.target = Math.max(state.target, sucrose * 12);
      k.fx(m, "char", Math.min(1, state.waited / 15));
      if (state.waited > 10) k.fx(m, "steam", 0.3);
      k.addHeat(m, 30 * dt);
      if (state.waited < 15) return 0;
      state.started = true;
      warnOnce(k, m, events, ctx, "concentrated-acid-heat", 60);
    }
    // The whole heap turns to carbon in about 10 s once it has started.
    const n = Math.min(sucrose, (state.target / 12) * (dt / 10));
    if (n <= k.EPS) return 0;
    const fromSolution = Math.min(k.aq(m, "Sucrose"), n);
    k.takeAq(m, "Sucrose", fromSolution);
    if (solid && n > fromSolution) k.takeSolid(m, solid, n - fromSolution);
    k.addSolid(m, "C", "residue", 12 * n);
    k.addAq(m, "H2O", 11 * n);
    // A little of the carbon goes on to reduce the acid itself: CO₂ and choking SO₂.
    k.evolveGas(m, "CO2", 0.4 * n, dt, { site: "bottom" });
    k.evolveGas(m, "SO2", 0.8 * n, dt, { site: "bottom" });
    k.heat(m, 200, n);
    state.carbon += 12 * n;
    k.fx(m, "char", 1);
    k.fx(m, "column", Math.min(1, state.carbon / (0.8 * state.target)));
    k.fx(m, "steam", 0.8);
    k.fx(m, "smoke", { rate: 0.7, color: "#d0d0d0", toxic: true });
    toxicWarn(k, m, events, ctx);
    return n;
  },
};

// Mixtures doc 14 keeps out of the school lab (§ 5 Q8): a warning, some heat and smoke, no detailed chemistry.
const DANGEROUS = [
  {
    id: "permanganate-sulfuric",
    when: (m, k) => k.solidMmol(m, "KMnO4") > k.EPS && k.sulfuricFraction(m) > 0.8,
    smoke: "#5a3a2a",
  },
  {
    id: "organic-nitric",
    when: (m, k) =>
      k.nitricFraction(m) > 0.5 &&
      k.aq(m, "C2H5OH") + k.aq(m, "C3H8O3") + k.aq(m, "Sucrose") + k.solidMmol(m, "SucroseCrystals") > 0.5,
    smoke: "#a0461e",
  },
  {
    id: "peroxide-sulfuric",
    when: (m, k) => k.conc(m, "H2O2") > 2 && k.sulfuricFraction(m) > 0.7,
    smoke: "#e0e0e0",
  },
];

export const dangerousMix = {
  id: "dangerous-mix",
  info: null,
  step(m, dt, ctx, k, events) {
    for (const entry of DANGEROUS) {
      if (!entry.when(m, k)) continue;
      warnOnce(k, m, events, ctx, "dangerous-mix", 30);
      k.addHeat(m, 60 * dt);
      k.fx(m, "smoke", { rate: 0.8, color: entry.smoke, toxic: true });
      k.fx(m, "steam", 0.5);
      toxicWarn(k, m, events, ctx);
      return dt * 0.05;
    }
    return 0;
  },
};

// H₂ + Cl₂ (doc 14, § 5 Q8): the mixture goes off at a flame or even in bright light.
export const hydrogenChlorine = {
  id: "hydrogen-chlorine",
  info: null,
  step(m, dt, ctx, k, events) {
    const h2 = k.gasFraction(m, "H2");
    const cl2 = atm(m, ctx, "Cl2");
    if (h2 < 0.05 || cl2 < 0.05) return 0;
    warnOnce(k, m, events, ctx, "dangerous-mix", 30);
    if (!ctx.flame) return 0;
    const n = Math.min(m.gas.H2 ?? 0, m.gas.Cl2 ?? 0);
    if (n <= k.EPS) return 0;
    k.addGas(m, "H2", -n);
    k.addGas(m, "Cl2", -n);
    k.addAq(m, "H+", 2 * n);
    k.addAq(m, "Cl-", 2 * n);
    const strength = Math.min(1, (n * 0.184) / 3);
    k.emit(events, "bang", { strength, radius: 0.5 + strength });
    k.emit(events, "flash", { color: "#e8ffe0", strength: 1 });
    if (strength > 0.6) k.emit(events, "shatter");
    return n;
  },
};

// Hot glass and heated concentrated acid are worth a word before anyone picks the vessel up.
export const hotGlass = {
  id: "hot-glass",
  info: null,
  step(m, dt, ctx, k, events) {
    if (m.tempC > 120) warnOnce(k, m, events, ctx, "hot-glass", 60);
    const heating = (ctx.heatW ?? 0) > 0 || (ctx.plateC ?? 0) > 60;
    if (heating && (k.sulfuricFraction(m) > 0.7 || k.nitricFraction(m) > 0.5)) {
      warnOnce(k, m, events, ctx, "concentrated-acid-heat", 60);
    }
    return 0;
  },
};

export const DANGER_RULES = [waterIntoAcid, acidIntoWater, sugarSulfuric, dangerousMix, hydrogenChlorine, hotGlass];
