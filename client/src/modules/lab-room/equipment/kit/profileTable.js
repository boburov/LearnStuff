import { radiusAt } from "./vessel";

const SAMPLES = 160;
export const SHADER_RADII = 48;

const tables = new WeakMap();

// O(1) height ↔ volume ↔ radius lookups for a vessel profile, built once per profile array and mouth height.
export const profileTable = (profile, top = profile[profile.length - 1][1]) => {
  let byTop = tables.get(profile);
  if (!byTop) {
    byTop = new Map();
    tables.set(profile, byTop);
  }
  if (byTop.has(top)) return byTop.get(top);

  const floor = profile[0][1];
  const height = Math.max(1e-4, top - floor);
  const dy = height / SAMPLES;
  const radius = new Float32Array(SAMPLES + 1);
  const volume = new Float64Array(SAMPLES + 1);
  // Flat floors start with a zero-length segment; sample a hair above so the floor keeps its radius.
  for (let i = 0; i <= SAMPLES; i += 1) radius[i] = radiusAt(profile, Math.min(top, floor + i * dy + 1e-6));
  for (let i = 1; i <= SAMPLES; i += 1) {
    const r = radiusAt(profile, floor + (i - 0.5) * dy);
    volume[i] = volume[i - 1] + Math.PI * r * r * dy * 1e6;
  }
  let maxRadius = 0;
  for (let i = 0; i <= SAMPLES; i += 1) maxRadius = Math.max(maxRadius, radius[i]);

  const radiusAtY = (y) => {
    const f = Math.min(SAMPLES, Math.max(0, (y - floor) / dy));
    const i = Math.min(SAMPLES - 1, Math.floor(f));
    return radius[i] + (radius[i + 1] - radius[i]) * (f - i);
  };

  const levelForMl = (ml) => {
    if (ml <= 0) return floor;
    if (ml >= volume[SAMPLES]) return top;
    let lo = 0;
    let hi = SAMPLES;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (volume[mid] < ml) lo = mid;
      else hi = mid;
    }
    const span = volume[hi] - volume[lo] || 1;
    return floor + (lo + (ml - volume[lo]) / span) * dy;
  };

  const mlBelow = (y) => {
    const f = Math.min(SAMPLES, Math.max(0, (y - floor) / dy));
    const i = Math.min(SAMPLES - 1, Math.floor(f));
    return volume[i] + (volume[i + 1] - volume[i]) * (f - i);
  };

  // Height of the floor at a given distance from the axis (round and conical bottoms rise toward the wall).
  const floorAtRadius = (r) => {
    for (let i = 0; i <= SAMPLES; i += 1) if (radius[i] >= r) return floor + i * dy;
    return top;
  };

  const shaderRadii = new Float32Array(SHADER_RADII + 1);
  for (let i = 0; i <= SHADER_RADII; i += 1) shaderRadii[i] = radiusAtY(floor + (height * i) / SHADER_RADII);

  const table = { floor, top, height, maxRadius, capacityMl: volume[SAMPLES], radiusAtY, levelForMl, mlBelow, floorAtRadius, shaderRadii };
  byTop.set(top, table);
  return table;
};
