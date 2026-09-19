import {
  CanvasTexture,
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MultiplyBlending,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
} from "three";
import { applySpecularAlpha } from "../../equipment/kit/glassShading";

// Ground (frosted) glass of stopper cones and sockets: pale, rough, semi-opaque.
export const createGroundGlass = (color = "#cfd8d5", opacity = 0.24) =>
  applySpecularAlpha(
    new MeshPhysicalMaterial({
      color,
      roughness: 0.5,
      metalness: 0,
      ior: 1.5,
      opacity,
      envMapIntensity: 1,
      side: DoubleSide,
    }),
    0.2,
  );

const TINT_VERTEX = /* glsl */ `
varying vec3 vTintNormal;
varying vec3 vTintView;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vTintNormal = normalMatrix * normal;
  vTintView = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

// Beer-Lambert: the light path through the wall grows at grazing angles, so edges look deeper.
const TINT_FRAGMENT = /* glsl */ `
uniform vec3 tint;
varying vec3 vTintNormal;
varying vec3 vTintView;
void main() {
  float facing = abs(dot(normalize(vTintNormal), normalize(vTintView)));
  gl_FragColor = vec4(pow(tint, vec3(1.0 / max(facing, 0.2))), 1.0);
}
`;

// Coloured glass absorbs what is behind it; drawn just before the kit glass pass of the same surface.
export const createGlassTint = (color) =>
  new ShaderMaterial({
    uniforms: { tint: { value: new Color(color) } },
    vertexShader: TINT_VERTEX,
    fragmentShader: TINT_FRAGMENT,
    blending: MultiplyBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthWrite: false,
  });

// Natural HDPE: opaque, but the contents show as a slightly darker, tinted band below the fill level.
export const createHdpeMaterial = ({ color = "#eeece6", roughness = 0.52, level = -1, content = "#b9c2c6", strength = 0.3 }) => {
  const material = new MeshStandardMaterial({ color, roughness });
  const uniforms = {
    hdpeLevel: { value: level },
    hdpeContent: { value: new Color(content) },
    hdpeStrength: { value: strength },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying float vHdpeY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHdpeY = position.y;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vHdpeY;\nuniform float hdpeLevel;\nuniform vec3 hdpeContent;\nuniform float hdpeStrength;",
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float hdpeFill = 1.0 - smoothstep(hdpeLevel - 0.0015, hdpeLevel + 0.0015, vHdpeY);
float hdpeLine = exp(-pow((vHdpeY - hdpeLevel) / 0.0007, 2.0));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * hdpeContent, hdpeFill * hdpeStrength);
diffuseColor.rgb *= 1.0 - hdpeLine * hdpeStrength * 0.35;`,
      );
  };
  material.customProgramCacheKey = () => "substance-hdpe";
  material.userData.hdpeLevel = uniforms.hdpeLevel;
  return material;
};

export const createBrass = () => new MeshStandardMaterial({ color: "#c7a052", metalness: 1, roughness: 0.3 });

export const canvasTexture = (size, paint, { srgb = false, repeat = true } = {}) => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(size, size);
  paint(image.data, size);
  ctx.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  texture.anisotropy = 4;
  return texture;
};

export const disposeMaterial = (material) => {
  if (!material) return;
  for (const key of ["map", "normalMap", "roughnessMap", "metalnessMap", "bumpMap", "clearcoatMap", "alphaMap"]) {
    material[key]?.dispose();
  }
  material.dispose();
};

const hash2 = (x, y, seed) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const smooth = (t) => t * t * (3 - 2 * t);
const wrap = (v, period) => ((v % period) + period) % period;

// Value noise that tiles with the given integer period.
const tileNoise = (x, y, period, seed) => {
  const [xi, yi] = [Math.floor(x), Math.floor(y)];
  const [fx, fy] = [smooth(x - xi), smooth(y - yi)];
  const v = (i, j) => hash2(wrap(xi + i, period), wrap(yi + j, period), seed);
  const top = v(0, 0) + (v(1, 0) - v(0, 0)) * fx;
  const bottom = v(0, 1) + (v(1, 1) - v(0, 1)) * fx;
  return top + (bottom - top) * fy;
};

const tileFbm = (u, v, base, seed, octaves = 4) => {
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o += 1) {
    const f = base * 2 ** o;
    const w = 0.5 ** o;
    sum += tileNoise(u * f, v * f, f, seed + o * 31) * w;
    norm += w;
  }
  return sum / norm;
};

// Tileable Voronoi: nearest and second-nearest feature distances plus the nearest cell's id.
const cells = (u, v, count, seed) => {
  const [x, y] = [u * count, v * count];
  const [cx, cy] = [Math.floor(x), Math.floor(y)];
  let d1 = 9;
  let d2 = 9;
  let id = 0;
  for (let j = -1; j <= 1; j += 1) {
    for (let i = -1; i <= 1; i += 1) {
      const gx = wrap(cx + i, count);
      const gy = wrap(cy + j, count);
      const px = cx + i + hash2(gx, gy, seed);
      const py = cy + j + hash2(gx, gy, seed + 7);
      const d = Math.hypot(px - x, py - y);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = gx * 131 + gy;
      } else if (d < d2) d2 = d;
    }
  }
  return { d1, d2, id };
};

const SIZE = 256;

// Packs per-pixel [height, albedo, roughness, tiltX, tiltY] samples into map, roughness and normal textures.
const grainTextures = (sample, { normalStrength = 1, heightNormals = true } = {}) => {
  const samples = new Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) samples[y * SIZE + x] = sample(x / SIZE, y / SIZE);
  }
  const at = (x, y) => samples[wrap(y, SIZE) * SIZE + wrap(x, SIZE)];
  const map = canvasTexture(
    SIZE,
    (data) => {
      samples.forEach((s, i) => {
        const g = Math.round(Math.min(1, s.albedo) * 255);
        data.set([g, g, g, 255], i * 4);
      });
    },
    { srgb: true },
  );
  const roughness = canvasTexture(SIZE, (data) => {
    samples.forEach((s, i) => {
      const g = Math.round(Math.min(1, s.roughness) * 255);
      data.set([g, g, g, 255], i * 4);
    });
  });
  const normal = canvasTexture(SIZE, (data) => {
    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const s = at(x, y);
        let nx = s.tiltX ?? 0;
        let ny = s.tiltY ?? 0;
        if (heightNormals) {
          nx += (at(x - 1, y).height - at(x + 1, y).height) * normalStrength;
          ny += (at(x, y + 1).height - at(x, y - 1).height) * normalStrength;
        }
        const len = Math.hypot(nx, ny, 1);
        data.set([((nx / len) * 0.5 + 0.5) * 255, ((ny / len) * 0.5 + 0.5) * 255, ((1 / len) * 0.5 + 0.5) * 255, 255], (y * SIZE + x) * 4);
      }
    }
  });
  return { map, roughness, normal };
};

const powderSamplers = {
  fine: (seed) => (u, v) => {
    const n = tileFbm(u, v, 16, seed);
    const speck = hash2(Math.floor(u * SIZE), Math.floor(v * SIZE), seed + 3);
    return { height: n * 6 + speck * 0.8, albedo: 0.84 + n * 0.16 - (speck > 0.97 ? 0.1 : 0), roughness: 1 };
  },
  crystal: (seed) => (u, v) => {
    const c = cells(u, v, 48, seed);
    const r1 = hash2(c.id, 1, seed);
    const r2 = hash2(c.id, 2, seed);
    const edge = smooth(Math.min(1, (c.d2 - c.d1) / 0.12));
    const tilt = 0.35 + hash2(c.id, 3, seed) * 1.1;
    return {
      height: 0,
      albedo: (0.8 + r1 * 0.2) * (0.72 + 0.28 * edge),
      roughness: 0.12 + hash2(c.id, 4, seed) * 0.3 + (1 - edge) * 0.4,
      tiltX: Math.cos(r2 * Math.PI * 2) * tilt,
      tiltY: Math.sin(r2 * Math.PI * 2) * tilt,
    };
  },
  metal: (seed) => (u, v) => {
    const c = cells(u, v, 64, seed);
    const r2 = hash2(c.id, 2, seed);
    const edge = smooth(Math.min(1, (c.d2 - c.d1) / 0.2));
    const tilt = 0.25 + hash2(c.id, 3, seed) * 0.9;
    return {
      height: 0,
      albedo: (0.55 + hash2(c.id, 1, seed) * 0.45) * (0.45 + 0.55 * edge),
      roughness: 0.3 + hash2(c.id, 4, seed) * 0.35 + (1 - edge) * 0.3,
      tiltX: Math.cos(r2 * Math.PI * 2) * tilt,
      tiltY: Math.sin(r2 * Math.PI * 2) * tilt,
    };
  },
  granule: (seed) => (u, v) => {
    const c = cells(u, v, 18, seed);
    const dome = Math.max(0, 1 - (c.d1 / 0.62) ** 2);
    const crevice = smooth(Math.min(1, (c.d2 - c.d1) / 0.25));
    const n = tileFbm(u, v, 32, seed + 5, 2);
    return {
      height: dome * 5 + n,
      albedo: (0.5 + 0.5 * crevice) * (0.8 + hash2(c.id, 1, seed) * 0.2),
      roughness: 0.4 + n * 0.3 + (1 - crevice) * 0.3,
    };
  },
};

// Powders and granular piles: fine = matte dust, crystal = glinting facets, metal = filings, granule = packed lumps.
export const createGrainMaterial = ({ color, grain = "fine", seed = 1, metalness }) => {
  const kind = powderSamplers[grain] ? grain : "fine";
  const heightNormals = kind === "fine" || kind === "granule";
  const textures = grainTextures(powderSamplers[kind](seed), { normalStrength: kind === "fine" ? 0.35 : 0.6, heightNormals });
  const metal = metalness ?? (kind === "metal" ? 0.75 : 0);
  return new MeshStandardMaterial({
    color,
    map: textures.map,
    roughnessMap: textures.roughness,
    roughness: kind === "fine" ? 0.95 : 1,
    normalMap: textures.normal,
    metalness: metal,
    envMapIntensity: kind === "crystal" ? 1.4 : 1,
  });
};

// Crushed marble: sugary crystalline white with grey mottling, faint veins and glinting grains.
const createMarbleMaterial = (color, seed) => {
  const textures = grainTextures(
    (u, v) => {
      const c = cells(u, v, 40, seed);
      const mottle = tileFbm(u, v, 6, seed + 3, 3);
      const vein = Math.abs(Math.sin((u * 1.5 + tileFbm(u, v, 3, seed, 3) * 2.5) * Math.PI * 2));
      return {
        height: 0,
        albedo: 0.84 + hash2(c.id, 1, seed) * 0.1 + (mottle - 0.5) * 0.12 - (1 - smooth(Math.min(1, vein / 0.08))) * 0.1,
        roughness: 0.45 + hash2(c.id, 4, seed) * 0.35,
        tiltX: (hash2(c.id, 2, seed) - 0.5) * 0.7,
        tiltY: (hash2(c.id, 3, seed) - 0.5) * 0.7,
      };
    },
    { heightNormals: false },
  );
  return new MeshStandardMaterial({ color, map: textures.map, roughnessMap: textures.roughness, normalMap: textures.normal, roughness: 1 });
};

// Alkali metal lumps: dull white-grey oxide crust with bright metal showing where it was cut.
const createCrustedMetalMaterial = (color, metallic, seed) => {
  const crust = new Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) crust[y * SIZE + x] = smooth(Math.min(1, Math.max(0, (tileFbm(x / SIZE, y / SIZE, 6, seed, 4) - 0.4) / 0.12)));
  }
  const map = canvasTexture(
    SIZE,
    (data) => {
      crust.forEach((k, i) => {
        const c = Math.round((0.95 - k * 0.2) * 255);
        data.set([c, c, Math.round(c * (1 - k * 0.04)), 255], i * 4);
      });
    },
    { srgb: true },
  );
  const surface = canvasTexture(SIZE, (data) => {
    crust.forEach((k, i) => data.set([0, Math.round((0.38 + k * 0.45) * 255), Math.round((1 - k * 0.9) * 255), 255], i * 4));
  });
  return new MeshStandardMaterial({ color, map, roughnessMap: surface, metalnessMap: surface, roughness: 1, metalness: metallic * 0.85 });
};

// Rolled ribbon: the top face shows each wound layer as a thin line.
const createRibbonMaterial = (color, metallic) => {
  const map = canvasTexture(
    64,
    (data) => {
      for (let y = 0; y < 64; y += 1) {
        for (let x = 0; x < 64; x += 1) {
          const c = Math.round((Math.abs(x - 32) < 7 ? 0.3 : 0.98 - (Math.abs(x - 32) / 32) * 0.15) * 255);
          data.set([c, c, c, 255], (y * 64 + x) * 4);
        }
      }
    },
    { srgb: true },
  );
  return new MeshStandardMaterial({ color, map, metalness: metallic * 0.65, roughness: 0.4, side: DoubleSide });
};

export const createPieceMaterial = ({ pieces, color, metallic = 0, seed = 1 }) => {
  if (pieces === "chunks") return metallic > 0.3 ? createCrustedMetalMaterial(color, metallic, seed) : createMarbleMaterial(color, seed);
  if (pieces === "granules") return createGrainMaterial({ color, grain: "granule", seed, metalness: metallic });
  if (pieces === "ribbon") return createRibbonMaterial(color, metallic);
  return new MeshStandardMaterial({ color, metalness: metallic, roughness: 0.26 });
};
