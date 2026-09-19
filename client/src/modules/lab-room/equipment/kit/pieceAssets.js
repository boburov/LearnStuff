import { Vector3 } from "three";
import { createPieceMaterial } from "../../substances/templates/containerMaterials";
import { coilRoots, pieceGeometry } from "../../substances/templates/solidPieces";

const DENSITY = { Na: 0.97, Mg: 1.74, Zn: 7.14, Fe: 7.87, Cu: 8.96, Ag: 10.5, CaCO3: 2.71, S: 2.07, C: 1.9 };
const METALLIC = { Na: 0.6, Mg: 0.9, Zn: 0.8, Fe: 0.8, Cu: 1, Ag: 1 };

// unitVolume: the volume of the unit-size geometry, so mass alone gives the instance scale.
const SHAPES = {
  chunk: { unitVolume: 3.1, half: 0.8, pieces: "chunks", upright: false, tipOver: 0 },
  chip: { unitVolume: 3.0, half: 0.8, pieces: "chunks", upright: false, tipOver: 0 },
  granule: { unitVolume: 2.7, half: 0.72, pieces: "granules", upright: false, tipOver: 0 },
  ribbon: { unitVolume: 7e-4, half: 0.006, pieces: "ribbon", upright: false, tipOver: 0, nominal: 0.03 },
  wire: { unitVolume: 0.0236, half: 0.33, pieces: "wire", upright: true, tipOver: Math.PI / 2 },
};

const specCache = new Map();

export const pieceSpec = (species, shape) => {
  const key = `${species}:${shape}`;
  if (!specCache.has(key)) {
    const base = SHAPES[shape] ?? SHAPES.chunk;
    specCache.set(key, {
      ...base,
      shape: SHAPES[shape] ? shape : "chunk",
      density: DENSITY[species] ?? 3,
      metallic: METALLIC[species] ?? 0,
      stretch: base.nominal ? new Vector3(1, 1, 1) : null,
    });
  }
  return specCache.get(key);
};

const geometryCache = new Map();

// Geometry plus how far it reaches below and around its origin, so a piece rests on the floor instead of sinking into it.
export const pieceAsset = (shape, seed = 3) => {
  const key = `${shape}:${seed % 5}`;
  if (!geometryCache.has(key)) {
    const geometry = pieceGeometry(shape, 3 + (seed % 5));
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    geometryCache.set(key, {
      geometry,
      lowest: Math.max(0.002, -min.y),
      radius: Math.max(Math.abs(min.x), Math.abs(max.x), Math.abs(min.z), Math.abs(max.z)),
      length: max.x - min.x,
    });
  }
  return geometryCache.get(key);
};

const materialCache = new Map();

// Base materials (with their generated textures) are shared; every instance clones one for its own coat and glow.
export const pieceMaterialFor = (spec, color) => {
  const key = `${spec.pieces}:${color}:${spec.metallic}`;
  if (!materialCache.has(key)) {
    materialCache.set(key, createPieceMaterial({ pieces: spec.pieces, color, metallic: spec.metallic, seed: 11 }));
  }
  return materialCache.get(key);
};

const LOOKS = {
  gel: { grain: 420, lump: 1.1, rough: 0.35, sparkle: 0, metal: 0, relief: 0.0011 },
  curdy: { grain: 950, lump: 1.3, rough: 0.72, sparkle: 0, metal: 0, relief: 0.0009 },
  fine: { grain: 2400, lump: 0.3, rough: 0.92, sparkle: 0, metal: 0, relief: 0.00028 },
  powder: { grain: 2000, lump: 0.5, rough: 0.95, sparkle: 0, metal: 0, relief: 0.0005 },
  crystal: { grain: 1500, lump: 0.45, rough: 0.35, sparkle: 0.55, metal: 0, relief: 0.0006 },
  metal: { grain: 2100, lump: 0.5, rough: 0.5, sparkle: 0.45, metal: 0.75, relief: 0.0005 },
};

// Precipitate and powder colours from species.js, mapped to how that solid actually sits in the vessel.
const KNOWN = [
  ["#f5f5f0", "curdy"],
  ["#f0dc82", "fine"],
  ["#6fb4e8", "gel"],
  ["#8cc6d9", "gel"],
  ["#8a3b12", "gel"],
  ["#1a1a1a", "fine"],
  ["#e8d8b8", "fine"],
  ["#f4f4f4", "fine"],
  ["#f2f0ea", "fine"],
  ["#1d1b1a", "fine"],
  ["#f2f2f2", "fine"],
  ["#5a4632", "fine"],
  ["#f0f0f0", "fine"],
  ["#2b2b2b", "fine"],
  ["#111111", "fine"],
  ["#2a0f35", "crystal"],
  ["#f7f6f2", "crystal"],
  ["#e8d23a", "powder"],
  ["#f2f2ef", "powder"],
  ["#3b2a1f", "powder"],
  ["#1f2418", "powder"],
  ["#4a4a4c", "metal"],
  ["#b8703f", "metal"],
  ["#9a9ea3", "metal"],
].map(([hex, look]) => ({ rgb: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255), look }));

const lookCache = new Map();

// appearance only gives the bed a blended colour, so the nearest known solid decides its texture.
// `named` comes from appearance (gel, curdy, fine, powder, crystal, metal); the colour match is the fallback.
export const bedLook = (color, wet, named = null) => {
  const key = `${named ?? color}:${wet ? 1 : 0}`;
  if (lookCache.has(key)) return lookCache.get(key);
  const fallback = wet ? "fine" : "powder";
  let name = named && LOOKS[named] ? named : fallback;
  if (!named && typeof color === "string" && color.length === 7) {
    const rgb = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
    let best = 0.1;
    for (const entry of KNOWN) {
      const d = Math.hypot(rgb[0] - entry.rgb[0], rgb[1] - entry.rgb[1], rgb[2] - entry.rgb[2]);
      if (d < best) {
        best = d;
        name = entry.look;
      }
    }
  }
  const look = LOOKS[name] ?? LOOKS[fallback];
  lookCache.set(key, look);
  return look;
};

let roots = null;

export const crystalRoots = () => {
  if (!roots) roots = coilRoots(130, 5);
  return roots;
};
