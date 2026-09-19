import { Data3DTexture, LinearFilter, RGBAFormat, RepeatWrapping, UnsignedByteType } from "three";

const SIZE = 32;

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);

const grad = (hash, x, y, z) => {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

// Tileable Perlin noise: lattice coordinates wrap at `period`, so the texture repeats seamlessly.
const createPerlin = (seed) => {
  const random = mulberry32(seed);
  const table = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [table[i], table[j]] = [table[j], table[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i += 1) perm[i] = table[i & 255];
  const hash = (x, y, z) => perm[perm[perm[x] + y] + z];

  return (x, y, z, period) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const fx = x - xi;
    const fy = y - yi;
    const fz = z - zi;
    const x0 = ((xi % period) + period) % period;
    const y0 = ((yi % period) + period) % period;
    const z0 = ((zi % period) + period) % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const z1 = (z0 + 1) % period;
    const u = fade(fx);
    const v = fade(fy);
    const w = fade(fz);
    const a = grad(hash(x0, y0, z0), fx, fy, fz) * (1 - u) + grad(hash(x1, y0, z0), fx - 1, fy, fz) * u;
    const b = grad(hash(x0, y1, z0), fx, fy - 1, fz) * (1 - u) + grad(hash(x1, y1, z0), fx - 1, fy - 1, fz) * u;
    const c = grad(hash(x0, y0, z1), fx, fy, fz - 1) * (1 - u) + grad(hash(x1, y0, z1), fx - 1, fy, fz - 1) * u;
    const d = grad(hash(x0, y1, z1), fx, fy - 1, fz - 1) * (1 - u) + grad(hash(x1, y1, z1), fx - 1, fy - 1, fz - 1) * u;
    return (a * (1 - v) + b * v) * (1 - w) + (c * (1 - v) + d * v) * w;
  };
};

// R, G, B: independent soft fbm for displacement; A: finer fbm for erosion and detail.
const CHANNELS = [
  { seed: 11, octaves: [[4, 0.7], [8, 0.3]] },
  { seed: 23, octaves: [[4, 0.7], [8, 0.3]] },
  { seed: 37, octaves: [[4, 0.7], [8, 0.3]] },
  { seed: 51, octaves: [[4, 0.4], [8, 0.45], [16, 0.15]] },
];

const buildTexture = () => {
  const data = new Uint8Array(SIZE * SIZE * SIZE * 4);
  CHANNELS.forEach(({ seed, octaves }, channel) => {
    const perlin = createPerlin(seed);
    for (let z = 0; z < SIZE; z += 1) {
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          let value = 0;
          for (const [period, amp] of octaves) {
            const s = period / SIZE;
            value += perlin(x * s, y * s, z * s, period) * amp;
          }
          const byte = Math.round((0.5 + value * 0.8) * 255);
          data[((z * SIZE + y) * SIZE + x) * 4 + channel] = byte < 0 ? 0 : byte > 255 ? 255 : byte;
        }
      }
    }
  });
  const texture = new Data3DTexture(data, SIZE, SIZE, SIZE);
  texture.format = RGBAFormat;
  texture.type = UnsignedByteType;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.wrapR = RepeatWrapping;
  texture.unpackAlignment = 1;
  texture.needsUpdate = true;
  return texture;
};

let shared = null;
let users = 0;

// One 32³ tileable noise volume shared by every effect; freed when the last user unmounts.
export const acquireNoise = () => {
  if (!shared) shared = buildTexture();
  users += 1;
  return shared;
};

export const releaseNoise = () => {
  users -= 1;
  if (users <= 0 && shared) {
    shared.dispose();
    shared = null;
    users = 0;
  }
};

// Generating the volume costs ~60 ms, so it is built while the room is idle instead of at the first flame.
if (typeof window !== "undefined") {
  const warm = () => acquireNoise();
  if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 5000 });
  else window.setTimeout(warm, 1500);
}
