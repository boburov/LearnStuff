// Registan guide data. Geometry/camera coords are tied to RegistanModel's layout.
// The Uzbek narration (CONTENT) lives in registanContent.js (AI-authored).

export const LEVELS = [
  { id: "kids", name: "Bolalar (8–12)" },
  { id: "school", name: "Maktab" },
  { id: "highschool", name: "Yuqori sinf" },
  { id: "university", name: "Universitet" },
  { id: "exam", name: "Imtihon" },
  { id: "tourist", name: "Sayyoh" },
];

// marker = 3D dot position; cam = where the guided camera flies to (pos + look).
export const HOTSPOTS = [
  { id: "entrance", name: "Peshtoq", marker: [0, 9, -12.5], cam: { pos: [0, 8, 6], look: [0, 7, -14] } },
  { id: "main-gate", name: "Bosh darvoza", marker: [0, 3, -12.3], cam: { pos: [0, 3.5, -1], look: [0, 2.5, -14] } },
  { id: "dome", name: "Gumbaz", marker: [-6.5, 13, -15.5], cam: { pos: [-6.5, 12, -1], look: [-6.5, 11, -15.5] } },
  { id: "minaret", name: "Minora", marker: [-15.5, 15, -2], cam: { pos: [-6, 12, 7], look: [-15.5, 11, -2] } },
  { id: "mosaic", name: "Mozaika (sher-quyosh)", marker: [15.6, 9, -3], cam: { pos: [7, 7.5, -2], look: [16, 7, -3] } },
  { id: "courtyard", name: "Hovli", marker: [0, 3, -5], cam: { pos: [0, 26, 10], look: [0, 1, -7] } },
  { id: "classroom", name: "Hujra (darsxona)", marker: [-15.5, 3, -6], cam: { pos: [-6, 4, 2], look: [-15.5, 3, -6] } },
];

export const OVERVIEW_CAM = { pos: [0, 18, 34], look: [0, 6, -9] };

export const getHotspot = (id) => HOTSPOTS.find((h) => h.id === id) || null;

// Guided-tour order (overview first, then features).
export const TOUR = ["overview", "entrance", "main-gate", "mosaic", "minaret", "dome", "courtyard", "classroom"];

// Time-travel: which madrasas are built + whether the square is earthquake-damaged.
export const ERAS = [
  { year: 1417, label: "Ulug'bek madrasasi", visible: ["ulugbek"], damaged: false },
  { year: 1420, label: "Ilm maskani", visible: ["ulugbek"], damaged: false },
  { year: 1636, label: "Sher-Dor madrasasi", visible: ["ulugbek", "sherdor"], damaged: false },
  { year: 1660, label: "Tillakori — maydon yakunlandi", visible: ["ulugbek", "sherdor", "tillakori"], damaged: false },
  { year: 1897, label: "Zilzila va vayronagarchilik", visible: ["ulugbek", "sherdor", "tillakori"], damaged: true },
  { year: 2024, label: "Bugungi Registon", visible: ["ulugbek", "sherdor", "tillakori"], damaged: false },
];

// Treasure hunt: architectural features to discover.
export const TREASURE = ["dome", "minaret", "mosaic", "main-gate", "courtyard"];

// Clickable parts for the real GLB model. `frac` = anchor position as a fraction
// [x,y,z] of the model's bounding box (0..1). These are seeded guesses meant to be
// TUNED against the live render (the GLB has no semantic part names).
export const PARTS = [
  { id: "entrance", name: "Peshtoq", frac: [0.5, 0.72, 0.82] },
  { id: "main-gate", name: "Bosh darvoza", frac: [0.5, 0.28, 0.86] },
  { id: "dome", name: "Gumbaz", frac: [0.45, 0.9, 0.45] },
  { id: "minaret", name: "Minora", frac: [0.22, 0.9, 0.66] },
  { id: "mosaic", name: "Mozaika (sher-quyosh)", frac: [0.74, 0.62, 0.62] },
  { id: "courtyard", name: "Hovli", frac: [0.5, 0.3, 0.5] },
  { id: "classroom", name: "Hujra (darsxona)", frac: [0.28, 0.32, 0.72] },
];

export const getPart = (id) => PARTS.find((p) => p.id === id) || null;

export { CONTENT } from "./registanContent";
