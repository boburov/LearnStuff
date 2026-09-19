import { EQUIPMENT_BY_ID } from "../equipment/catalog";
import { SUBSTANCE_BY_ID } from "../substances/catalog";

export const SUBSTANCE_PREFIX = "sub:";

// Physical proxies in model space (origin at the base). Cylinders stand on y = 0; boxes give size + center.
const EQUIPMENT_BODIES = {
  beaker: { shape: "cylinder", radius: 0.036, height: 0.095, breaks: "glass", support: true },
  "conical-flask": { shape: "cylinder", radius: 0.0425, height: 0.145, breaks: "glass", support: true },
  "test-tube": { shape: "cylinder", radius: 0.01, height: 0.18, breaks: "glass", lying: true, support: true },
  "measuring-cylinder": { shape: "cylinder", radius: 0.042, height: 0.25, breaks: "glass", support: true },
  "evaporating-dish": { shape: "cylinder", radius: 0.05, height: 0.045, breaks: "porcelain" },
  crucible: { shape: "cylinder", radius: 0.021, height: 0.047, breaks: "porcelain" },
  "crystallizing-dish": { shape: "cylinder", radius: 0.076, height: 0.0765, breaks: "glass" },
  "gas-jar": { shape: "cylinder", radius: 0.0375, height: 0.204, breaks: "glass" },
  dropper: { shape: "box", size: [0.118, 0.017, 0.017], center: [0, 0.0085, 0], breaks: "glass" },
  spatula: { shape: "box", size: [0.18, 0.006, 0.012], center: [0, 0.003, 0] },
  "crucible-tongs": { shape: "box", size: [0.234, 0.008, 0.04], center: [0, 0.004, 0] },
  "stirring-rod": { shape: "box", size: [0.2, 0.0066, 0.0066], center: [0, 0.0033, 0], breaks: "glass" },
  funnel: { shape: "cylinder", radius: 0.0375, height: 0.133, breaks: "glass", lying: true },
  thermometer: { shape: "box", size: [0.3, 0.006, 0.008], center: [0, 0.003, 0], breaks: "glass" },
  "digital-scale": { shape: "box", size: [0.13, 0.053, 0.19], center: [0, 0.0265, 0], support: true, heavy: true },
  "ph-paper": { shape: "box", size: [0.06, 0.042, 0.035], center: [0, 0.021, 0] },
  "spirit-lamp": { shape: "cylinder", radius: 0.038, height: 0.1145, breaks: "glass" },
  "hot-plate": { shape: "box", size: [0.16, 0.11, 0.28], center: [0, 0.055, 0], support: true, heavy: true },
  "retort-stand": {
    shape: "compound",
    parts: [
      { size: [0.13, 0.014, 0.2], center: [0, 0.007, 0] },
      { size: [0.012, 0.6, 0.012], center: [0, 0.31, -0.068] },
      // Ring with wire gauze: vessels stand on it above the lamp.
      { size: [0.085, 0.004, 0.085], center: [0.013, 0.2166, 0.03] },
    ],
    support: true,
    heavy: true,
  },
  "test-tube-rack": { shape: "box", size: [0.2, 0.11, 0.07], center: [0, 0.055, 0], support: true },
};

// Footprint radius, height with the cap on and nominal volume, as measured on the substance templates.
const BOTTLES = { narrow: [0.035, 0.1438, 250], dropper: [0.024, 0.1235, 100], hdpe: [0.031, 0.1372, 250] };

const substanceBody = (substance) => {
  const c = substance.container;
  if (substance.state === "liquid") {
    const kind = c.bottle === "plastic" ? "hdpe" : c.sizeMl <= 100 ? "dropper" : "narrow";
    const [radius, height, nominalMl] = BOTTLES[kind];
    const scale = Math.cbrt(c.sizeMl / nominalMl);
    return { shape: "cylinder", radius: radius * scale, height: height * scale, breaks: kind === "hdpe" ? null : "glass" };
  }
  if (substance.state === "powder") {
    return { shape: "cylinder", radius: 0.0275, height: 0.0792, breaks: c.jar === "plastic" ? null : "glass" };
  }
  if (substance.state === "solid") {
    return { shape: "cylinder", radius: 0.035, height: 0.0902, breaks: c.jar === "plastic" ? null : "glass" };
  }
  return { shape: "cylinder", radius: 0.033, height: 0.442, breaks: null };
};

// Wall fittings the player takes off their bracket instead of out of the cabinet.
export const FIXTURES = {
  extinguisher: { name: "O't o'chirgich", body: { shape: "cylinder", radius: 0.078, height: 0.53, heavy: true } },
};

const cache = new Map();

export const objectType = (typeId) => {
  if (cache.has(typeId)) return cache.get(typeId);
  let type = null;
  if (typeId.startsWith(SUBSTANCE_PREFIX)) {
    const substance = SUBSTANCE_BY_ID[typeId.slice(SUBSTANCE_PREFIX.length)];
    if (substance) type = { kind: "substance", name: substance.name, substance, body: substanceBody(substance) };
  } else if (EQUIPMENT_BY_ID[typeId]) {
    type = { kind: "equipment", name: EQUIPMENT_BY_ID[typeId].name, body: EQUIPMENT_BODIES[typeId] };
  } else if (FIXTURES[typeId]) {
    type = { kind: "fixture", name: FIXTURES[typeId].name, body: FIXTURES[typeId].body };
  }
  cache.set(typeId, type);
  return type;
};

// Half extents of the body's bounding box in model space, plus its center.
export const bodyBounds = (body) => {
  if (body.shape === "cylinder") {
    return { half: [body.radius, body.height / 2, body.radius], center: [0, body.height / 2, 0] };
  }
  const parts = body.shape === "box" ? [body] : body.parts;
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const part of parts) {
    for (let i = 0; i < 3; i += 1) {
      min[i] = Math.min(min[i], part.center[i] - part.size[i] / 2);
      max[i] = Math.max(max[i], part.center[i] + part.size[i] / 2);
    }
  }
  return {
    half: max.map((v, i) => (v - min[i]) / 2),
    center: max.map((v, i) => (v + min[i]) / 2),
  };
};
