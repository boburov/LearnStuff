import { appearance } from "../chemistry/appearance";
import { createMixture, mixIn, takePortion } from "../chemistry/mixture";
import { phOf } from "../chemistry/acidity";

const ETHANOL_ML_PER_MMOL = 0.0584;
const BENCH_TOP = 0.9015;
const FLOOR = 0.003;

// Anything that leaves a container lands on the bench it stood on, or on the floor.
const landingHeight = (position) => (position[1] > 0.6 ? BENCH_TOP : FLOOR);

export const spillPortion = (lab, portion, position, { hot = false } = {}) => {
  if (!portion || portion.volumeMl <= 0.05) return null;
  const sample = createMixture({ capacityMl: Math.max(1, portion.volumeMl * 2) });
  mixIn(sample, portion);
  const look = appearance(sample);
  const ph = phOf(sample);
  const y = landingHeight(position);
  return lab.hazards.spill([position[0], y, position[2]], {
    ml: sample.volumeMl,
    color: look.liquid.turbidity > 0.3 ? look.liquid.turbidColor : look.liquid.color,
    opacity: Math.max(0.3, Math.min(0.85, look.liquid.opacity + look.liquid.turbidity)),
    flammableMl: (sample.aq.C2H5OH ?? 0) * ETHANOL_ML_PER_MMOL,
    acidic: ph != null && ph < 3,
    surface: y > 0.5 ? "bench" : "floor",
    hot: hot || sample.tempC > 60,
  });
};

// Pours part (or all) of a container onto the surface below it.
export const spillMixture = (lab, simId, position, { fraction = 1 } = {}) => {
  const mixture = lab.mixture(simId);
  if (!mixture || mixture.volumeMl <= 0.05) return null;
  const hot = mixture.tempC > 60;
  const portion = takePortion(mixture, mixture.volumeMl * Math.min(1, fraction));
  return spillPortion(lab, portion, position, { hot });
};
