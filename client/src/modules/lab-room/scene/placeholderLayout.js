// Stand-in layout used until the baked Blender room exists; numbers follow the room contract.
const box = (name, center, half) => ({ name, center, half });

export const PLACEHOLDER_COLLIDERS = [
  box("wall_front", [0, 1.6, -4.25], [5.5, 1.6, 0.25]),
  box("wall_back", [0, 1.6, 4.25], [5.5, 1.6, 0.25]),
  box("wall_left", [-5.25, 1.6, 0], [0.25, 1.6, 4.5]),
  box("wall_right", [5.25, 1.6, 0], [0.25, 1.6, 4.5]),
  box("bench_1", [0.3, 0.45, -1.15], [1.8, 0.45, 0.675]),
  box("bench_2", [0.3, 0.45, 1.35], [1.8, 0.45, 0.675]),
  box("sink_counter", [0.6, 0.45, 3.7], [2.5, 0.45, 0.3]),
  box("fume_hood", [-4.575, 1.2, -0.85], [0.425, 1.2, 0.75]),
  box("chem_cabinet", [-2.8, 1, 3.775], [0.5, 1, 0.225]),
  box("teacher_desk", [-3.2, 0.38, -2.85], [0.7, 0.38, 0.35]),
  box("waste_bin", [3.5, 0.3, 3.7], [0.18, 0.3, 0.18]),
];

export const PLACEHOLDER_META = {
  lightmapScale: 1,
  spawn: { position: [-3.9, 0, 2.2], lookAt: [0.3, 1.2, -1.15] },
  anchors: {},
};

const WHITE = "#e9ecef";
const TOP = "#1d1f22";

export const PLACEHOLDER_BLOCKS = [
  { center: [0.3, 0.43, -1.15], size: [3.56, 0.86, 1.3], color: WHITE },
  { center: [0.3, 0.88, -1.15], size: [3.6, 0.04, 1.35], color: TOP },
  { center: [0.3, 0.43, 1.35], size: [3.56, 0.86, 1.3], color: WHITE },
  { center: [0.3, 0.88, 1.35], size: [3.6, 0.04, 1.35], color: TOP },
  { center: [0.6, 0.43, 3.7], size: [5, 0.86, 0.6], color: WHITE },
  { center: [0.6, 0.88, 3.7], size: [5, 0.04, 0.6], color: TOP },
  { center: [-4.575, 1.2, -0.85], size: [0.85, 2.4, 1.5], color: "#d5d9de" },
  { center: [-2.8, 1, 3.775], size: [1, 2, 0.45], color: "#c4c9cf" },
  { center: [-3.2, 0.38, -2.85], size: [1.4, 0.76, 0.7], color: "#b08a61" },
  { center: [0.4, 1.5, -3.98], size: [2.4, 1.2, 0.03], color: "#f8f9fa" },
];

export const PLACEHOLDER_WINDOWS = [-2.6, 0, 2.6].map((z) => ({ center: [4.99, 1.7, z], size: [1.8, 1.6] }));
