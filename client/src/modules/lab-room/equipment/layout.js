const TOP = 0.9;

// Anchors below come from the model files (ring/gauze height, rack holes, funnel seat).
const STAND = { x: -1.2, z: -0.78 };
const GAUZE = { x: STAND.x + 0.013, y: TOP + 0.2186, z: STAND.z + 0.03 };
const STAND_BASE_TOP = TOP + 0.014;
const RACK = { x: -0.8, z: -0.7 };
const RACK_TUBE_Y = TOP + 0.009;
const RACK_HOLE_Z = RACK.z + 0.012;
const FLASK = { x: -0.28, z: -0.84 };
// Flask rim (0.1445) minus the funnel height where its cone matches the Ø31 mm neck bore (0.0945).
const FUNNEL_Y = TOP + 0.1445 - 0.0945;

const WATER = { liquidColor: "#0d2230", liquidOpacity: 0.08 };

// Students work on the +Z half of bench_1 (the monitor sits at its right end) and bench_2.
export const BENCH_LAYOUT = [
  { key: "retort-stand", id: "retort-stand", position: [STAND.x, TOP, STAND.z] },
  { key: "spirit-lamp", id: "spirit-lamp", position: [GAUZE.x, STAND_BASE_TOP, GAUZE.z], on: "retort-stand" },
  { key: "beaker-heating", id: "beaker", position: [GAUZE.x, GAUZE.y, GAUZE.z], rotation: [0, -0.5, 0], on: "retort-stand", volumeMl: 120, ...WATER },

  { key: "test-tube-rack", id: "test-tube-rack", position: [RACK.x, TOP, RACK.z] },
  { key: "test-tube-1", id: "test-tube", position: [RACK.x - 0.07, RACK_TUBE_Y, RACK_HOLE_Z], on: "test-tube-rack" },
  { key: "test-tube-2", id: "test-tube", position: [RACK.x - 0.014, RACK_TUBE_Y, RACK_HOLE_Z], on: "test-tube-rack" },
  { key: "test-tube-3", id: "test-tube", position: [RACK.x + 0.042, RACK_TUBE_Y, RACK_HOLE_Z], on: "test-tube-rack" },

  { key: "beaker-1", id: "beaker", position: [-0.52, TOP, -0.66], rotation: [0, 0.35, 0] },
  { key: "conical-flask", id: "conical-flask", position: [FLASK.x, TOP, FLASK.z], rotation: [0, 0.2, 0] },
  { key: "funnel", id: "funnel", position: [FLASK.x, FUNNEL_Y, FLASK.z], rotation: [0, 1.1, 0], on: "conical-flask" },
  { key: "measuring-cylinder", id: "measuring-cylinder", position: [-0.04, TOP, -0.94], rotation: [0, -0.3, 0] },
  { key: "thermometer", id: "thermometer", position: [-0.17, TOP, -0.56], rotation: [0, 0.06, 0] },

  { key: "hot-plate", id: "hot-plate", position: [0.3, TOP, -0.8] },
  { key: "digital-scale", id: "digital-scale", position: [0.72, TOP, -0.79] },
  { key: "ph-paper", id: "ph-paper", position: [1.02, TOP, -0.9], rotation: [0, -0.25, 0] },
  { key: "stirring-rod", id: "stirring-rod", position: [0.62, TOP, -0.575], rotation: [0, 0.05, 0] },
  { key: "dropper", id: "dropper", position: [0.93, TOP, -0.6], rotation: [0, 0.35, 0] },
  { key: "spatula", id: "spatula", position: [1.12, TOP, -0.565], rotation: [0, -0.15, 0] },
  { key: "crucible-tongs", id: "crucible-tongs", position: [1.22, TOP, -0.68], rotation: [0, 1.35, 0] },

  { key: "crystallizing-dish", id: "crystallizing-dish", position: [-0.95, TOP, 1.74], volumeMl: 600, ...WATER },
  { key: "gas-jar", id: "gas-jar", position: [-0.62, TOP, 1.86] },
  { key: "evaporating-dish", id: "evaporating-dish", position: [-0.3, TOP, 1.72], rotation: [0, 0.6, 0] },
  { key: "crucible", id: "crucible", position: [-0.08, TOP, 1.8] },
  { key: "beaker-2", id: "beaker", position: [0.2, TOP, 1.72], rotation: [0, -0.4, 0] },
];

// Dev review rows (?showcase=glass-test or ?showcase=beaker,funnel): items lined up along bench_1's front edge.
const SHOWCASE_PRESETS = {
  "glass-test": [
    { id: "beaker" },
    { id: "beaker", props: { volumeMl: 150, ...WATER } },
    { id: "beaker", props: { volumeMl: 200, liquidColor: "#1f6fd1", liquidOpacity: 0.55 } },
    { id: "beaker", props: { volumeMl: 120, liquidColor: "#7a1f8f", liquidOpacity: 0.8 } },
  ],
};

export const showcaseLayout = (spec, spacing = 0.16) => {
  const entries = SHOWCASE_PRESETS[spec] ?? spec.split(",").map((id) => ({ id: id.trim() }));
  const start = 0.3 - ((entries.length - 1) * spacing) / 2;
  return entries.map((entry, i) => ({
    key: `showcase-${i}`,
    id: entry.id,
    position: [start + i * spacing, TOP, -0.72],
    rotation: [0, 0, 0],
    ...entry.props,
  }));
};
