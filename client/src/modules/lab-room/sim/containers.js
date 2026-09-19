// Simulation parameters per container type, measured on the models (capacity = brimful ml).
// vesselHeatJK is the glass that warms with the contents; coolWK sets how fast it cools; mouthY/mouthR (m) are where pours and tools aim.
export const CONTAINERS = {
  beaker: { capacityMl: 330, vesselHeatJK: 30, coolWK: 0.8, narrow: false, mouthY: 0.0953, mouthR: 0.0347 },
  "conical-flask": { capacityMl: 325, vesselHeatJK: 35, coolWK: 0.7, narrow: true, mouthY: 0.1435, mouthR: 0.0155 },
  "test-tube": { capacityMl: 37, vesselHeatJK: 12, coolWK: 0.25, narrow: true, mouthY: 0.1792, mouthR: 0.0082 },
  "measuring-cylinder": { capacityMl: 129, vesselHeatJK: 40, coolWK: 0.6, narrow: true, mouthY: 0.2485, mouthR: 0.0132 },
  "evaporating-dish": { capacityMl: 171, vesselHeatJK: 60, coolWK: 1.2, narrow: false, mouthY: 0.0435, mouthR: 0.0466 },
  crucible: { capacityMl: 23.7, vesselHeatJK: 15, coolWK: 0.3, narrow: false, mouthY: 0.0369, mouthR: 0.0176 },
  "crystallizing-dish": { capacityMl: 1224, vesselHeatJK: 110, coolWK: 2.5, narrow: false, mouthY: 0.0755, mouthR: 0.0748 },
  "gas-jar": { capacityMl: 464, vesselHeatJK: 90, coolWK: 1.0, narrow: false, mouthY: 0.2, mouthR: 0.0279, coverable: true },
  // A piece held in the tongs is simulated in open air (no liquid, no headspace).
  "crucible-tongs": { capacityMl: 0, vesselHeatJK: 2, coolWK: 0.15, narrow: false, mouthY: 0, mouthR: 0 },
};

// Empty glass/metal mass for the scale reading (g).
export const EMPTY_MASS_G = {
  beaker: 70,
  "conical-flask": 95,
  "test-tube": 11,
  "measuring-cylinder": 105,
  "evaporating-dish": 110,
  crucible: 22,
  "crystallizing-dish": 320,
  "gas-jar": 260,
  funnel: 45,
  dropper: 6,
  spatula: 18,
  "stirring-rod": 12,
  thermometer: 25,
  "ph-paper": 30,
};

export const isContainer = (typeId) => Boolean(CONTAINERS[typeId]);
