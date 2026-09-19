import { SUBSTANCE_BY_ID } from "../substances/catalog";
import { CONTAINERS } from "./containers";

// Model-space points the tools aim at (metres), measured on the equipment and substance models.
const BOTTLE_MOUTH = { narrow: [0.134, 0.0095], dropper: [0.092, 0.0069], hdpe: [0.131, 0.0108] };
const JAR_MOUTH = { powder: 0.076, solid: 0.086 };

export const GAS_OUTLET = [0.0245, 0.408, 0];
export const LAMP_WICK = [0, 0.0905, 0];
export const LAMP_FLAME_TOP = [0, 0.135, 0];
export const HOT_PLATE_TOP = [0, 0.11, -0.056];
export const STAND_RING = [0.013, 0.2186, 0.03];
export const MONITOR_ANCHOR = "monitor_screen";

// Working end of each tool in its rest model space, and which way that end points (+1 = +x, -1 = -x).
export const TOOL_TIPS = {
  dropper: { tip: [-0.056, 0.004, 0], sign: -1 },
  spatula: { tip: [-0.083, 0.003, 0], sign: -1 },
  "crucible-tongs": { tip: [0.1145, 0.0015, 0], sign: 1 },
  thermometer: { tip: [-0.144, 0.003, 0], sign: -1 },
  "stirring-rod": { tip: [-0.1, 0.0033, 0], sign: -1 },
};

// Mouth of anything that can be poured from or into: [y, radius].
export const mouthOf = (typeId) => {
  if (CONTAINERS[typeId]) return [CONTAINERS[typeId].mouthY, CONTAINERS[typeId].mouthR];
  if (typeId === "funnel") return [0.1323, 0.034];
  if (!typeId.startsWith("sub:")) return null;
  const substance = SUBSTANCE_BY_ID[typeId.slice(4)];
  if (!substance) return null;
  if (substance.state === "liquid") {
    const { bottle = "clear", sizeMl = 250 } = substance.container;
    const kind = bottle === "plastic" ? "hdpe" : sizeMl <= 100 ? "dropper" : "narrow";
    const scale = Math.cbrt(sizeMl / (kind === "dropper" ? 100 : 250));
    return BOTTLE_MOUTH[kind].map((v) => v * scale);
  }
  if (substance.state === "gas") return [GAS_OUTLET[1], 0.003];
  return [JAR_MOUTH[substance.state], 0.022];
};
