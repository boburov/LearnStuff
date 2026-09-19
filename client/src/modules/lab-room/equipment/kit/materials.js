import { CanvasTexture, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from "three";
import { applySpecularAlpha } from "./glassShading";
import { capTexture } from "../../textureCap";

// Grayscale radial falloff used as an alpha map (alphaMap reads the green channel).
const createBlobTexture = () => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.45, "#9a9a9a");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
};

// Borosilicate lab glass: nearly black diffuse so it only tints, reflections come from the room capture.
const createGlass = () =>
  applySpecularAlpha(
    new MeshPhysicalMaterial({
      color: "#0e1715",
      roughness: 0.035,
      metalness: 0,
      ior: 1.5,
      specularIntensity: 1,
      opacity: 0.07,
      envMapIntensity: 1.25,
    }),
    0.55,
  );

// Enamel graduations and labels fired onto the glass; opaque so they sort before the glass.
const createPrint = (map) =>
  new MeshStandardMaterial({ map, color: "#ffffff", roughness: 0.55, alphaTest: 0.35, side: DoubleSide });

// Clear liquids should use a dark tint and low opacity; scattering diffuse light makes water look milky.
export const createLiquidMaterial = ({ color = "#0d2230", opacity = 0.08 } = {}) =>
  applySpecularAlpha(
    new MeshPhysicalMaterial({
      color,
      roughness: 0.02,
      metalness: 0,
      ior: 1.33,
      specularIntensity: 1,
      opacity,
      envMapIntensity: 1,
      side: DoubleSide,
    }),
    0.35,
  );

const standard = (params) => new MeshStandardMaterial(params);

export const createKitMaterials = ({ printScale = 1, quality = "high", textureCap = 2048 } = {}) => {
  const materials = {
    glass: createGlass(),
    porcelainGlazed: new MeshPhysicalMaterial({
      color: "#f3f1eb",
      roughness: 0.28,
      clearcoat: 0.7,
      clearcoatRoughness: 0.06,
    }),
    porcelainMatte: standard({ color: "#e6e0d4", roughness: 0.85 }),
    steel: standard({ color: "#c6c9cd", metalness: 1, roughness: 0.3 }),
    chrome: standard({ color: "#e4e6e8", metalness: 1, roughness: 0.08 }),
    castIron: standard({ color: "#2c2e31", metalness: 0.35, roughness: 0.6 }),
    rubberRed: standard({ color: "#a3231c", roughness: 0.55 }),
    rubberBlack: standard({ color: "#1c1c1f", roughness: 0.72 }),
    plasticWhite: standard({ color: "#eceef0", roughness: 0.38 }),
    plasticGray: standard({ color: "#8d949b", roughness: 0.45 }),
    plasticDark: standard({ color: "#26292e", roughness: 0.42 }),
    woodLight: standard({ color: "#c79d6d", roughness: 0.62 }),
    paper: standard({ color: "#fbfaf6", roughness: 0.95, side: DoubleSide }),
    cotton: standard({ color: "#efe8d8", roughness: 1 }),
  };

  const printCache = new Map();
  const blobTexture = createBlobTexture();
  return {
    ...materials,
    blobTexture,
    // Low tier draws substance labels at half resolution to save GPU memory on integrated graphics.
    printScale,
    // "high" | "low": effects scale particle counts and skip expensive passes on low.
    quality,
    // Print materials are per texture (graduations differ per vessel), cached so remounts reuse them.
    print: (key, createTexture) => {
      if (!printCache.has(key)) printCache.set(key, createPrint(capTexture(createTexture(), textureCap)));
      return printCache.get(key);
    },
    dispose: () => {
      Object.values(materials).forEach((m) => m.dispose());
      blobTexture.dispose();
      printCache.forEach((m) => {
        m.map?.dispose();
        m.dispose();
      });
    },
  };
};
