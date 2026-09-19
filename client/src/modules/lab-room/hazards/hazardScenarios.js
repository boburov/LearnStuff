// Dev-only seeds for reviewing the hazard visuals: /chemistry/lab-3d?autostart=1&hazard=fire
const BENCH = 0.9015;
const FLOOR = 0.003;

const ethanol = (hazards, position) =>
  hazards.spill(position, { ml: 45, color: "#16222a", opacity: 0.12, flammableMl: 34, surface: position[1] > 0.5 ? "bench" : "floor" });

const acid = (hazards, position) =>
  hazards.spill(position, { ml: 140, color: "#caa94a", opacity: 0.3, acidic: true, surface: position[1] > 0.5 ? "bench" : "floor" });

const cloud = (hazards, species, position, mmol) => {
  hazards.addGas(species, position, mmol);
  hazards.addGas(species, [position[0] + 1, position[1], position[2]], mmol * 0.6);
  hazards.addGas(species, [position[0] - 1, position[1], position[2]], mmol * 0.6);
};

export const HAZARD_SCENARIOS = {
  spill: (hazards) => {
    ethanol(hazards, [-0.35, BENCH, -0.95]);
    acid(hazards, [-2.4, FLOOR, 0.1]);
  },
  fire: (hazards) => {
    ethanol(hazards, [-0.35, BENCH, -0.95]);
    ethanol(hazards, [-0.05, BENCH, -0.9]);
    ethanol(hazards, [-2.4, FLOOR, 0.1]);
    for (const puddle of hazards.puddles) puddle.burning = puddle.flammableMl > 0;
  },
  gas: (hazards) => {
    cloud(hazards, "Cl2", [0.3, 1, -1.15], 6);
    cloud(hazards, "NO2", [2.6, 1, 1.35], 4);
  },
  alarm: (hazards) => {
    HAZARD_SCENARIOS.fire(hazards);
    HAZARD_SCENARIOS.gas(hazards);
    hazards.alarm.fireSince = 0.01;
  },
};

export const seedHazards = (lab, name) => {
  const seed = HAZARD_SCENARIOS[name];
  if (seed) seed(lab.hazards);
};
