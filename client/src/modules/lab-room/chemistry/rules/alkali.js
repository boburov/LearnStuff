import { warnOnce } from "./helpers";

// Na + H₂O (doc 14, № 37): the ball skates, hisses and finishes with a pop; a big piece or a narrow vessel is dangerous.
export const sodiumWater = {
  id: "sodium-water",
  info: "na-water",
  notice: 0.05,
  step(m, dt, ctx, k, events) {
    const piece = m.solids.find((s) => s.species === "Na" && s.form === "piece");
    if (!piece && !m.rules["sodium-water"]) return 0;
    const state = k.state(m, "sodium-water", { grams: 0, total: 0, burning: false, popped: false, banged: false });
    const watery = k.aq(m, "H2O") > k.EPS && k.aq(m, "H2O") >= k.aq(m, "C2H5OH");
    if (!piece || m.volumeMl <= k.EPS || !watery) {
      if (state.grams > 0 && !state.popped) {
        state.popped = true;
        k.emit(events, "pop", { strength: Math.min(1, state.grams * 4) });
        k.emit(events, "spatter", { radius: m.narrow ? 0.6 : 0.2 + state.grams, acid: false });
      }
      return 0;
    }
    const grams = (piece.mmol * 22.99) / 1000;
    if (grams > state.grams) state.grams = grams;
    piece.state = { ...piece.state, floating: true, molten: true };
    if (state.grams > 0.3 || m.narrow) state.burning = true;
    if (m.narrow) warnOnce(k, m, events, ctx, "sodium-narrow", 60);
    // Sodium in acid runs away far faster than in water (doc 14, § 5 Q8).
    const inAcid = k.conc(m, "H+") > 0.3;
    if (inAcid) {
      state.burning = true;
      warnOnce(k, m, events, ctx, "dangerous-mix", 60);
    }
    // 15 s for a rice grain; a narrow vessel traps the heat and makes it run away.
    const n = Math.min(k.shrink(piece, dt, m.narrow ? 6 : 15, inAcid ? 4 : 1), k.aq(m, "H2O"));
    if (n <= k.EPS) return 0;
    state.total += (n * 22.99) / 1000;
    k.takeSolid(m, piece, n);
    k.takeAq(m, "H2O", n);
    k.addAq(m, "Na+", n);
    k.addAq(m, "OH-", n);
    k.evolveGas(m, "H2", n / 2, dt, { site: "surface" });
    k.heat(m, 184, n);
    k.fx(m, "sodiumBall", { size: Math.min(1, Math.cbrt(grams / 0.1)), burning: state.burning });
    k.fx(m, "steam", Math.min(0.6, (n / Math.max(dt, 1e-3)) * 3));
    if (state.burning) k.fx(m, "flame", { kind: "sodium-water", intensity: Math.min(1, state.grams * 3) });
    // A tube holds the hydrogen and the heat in: one rice grain only burns, but a second one cracks it.
    if (m.narrow && !state.banged && (state.grams > 0.3 || state.total > 0.15)) {
      state.banged = true;
      k.emit(events, "bang", { strength: 1, radius: 1.5 });
      k.emit(events, "shatter");
    }
    return n;
  },
};

// Na + C₂H₅OH (doc 14, § 4.9): the same idea but calm — the sodium sinks and bubbles evenly, no ball and no flame.
export const sodiumEthanol = {
  id: "sodium-ethanol",
  info: "na-ethanol",
  notice: 0.05,
  step(m, dt, ctx, k) {
    const piece = m.solids.find((s) => s.species === "Na" && s.form === "piece");
    if (!piece || k.aq(m, "C2H5OH") <= k.EPS || k.aq(m, "H2O") > k.aq(m, "C2H5OH")) return 0;
    const n = Math.min(k.shrink(piece, dt, 60), k.aq(m, "C2H5OH"));
    if (n <= k.EPS) return 0;
    k.takeSolid(m, piece, n);
    k.takeAq(m, "C2H5OH", n);
    k.addAq(m, "Na+", n);
    k.addAq(m, "C2H5O-", n);
    k.evolveGas(m, "H2", n / 2, dt, { site: "pieces" });
    k.heat(m, 60, n);
    return n;
  },
};

export const ALKALI_RULES = [sodiumWater, sodiumEthanol];
