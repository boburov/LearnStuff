import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useDeviceVersion, useLab } from "../../sim/labContext";
import { CONTENTS_PRIORITY } from "./Contents";

// Devices update with the contents, after the lab runner and before the effects read their params.
export const DEVICE_PRIORITY = CONTENTS_PRIORITY;

// Device state for a model: discrete changes re-render through the version, continuous values are read in useFrame.
export const useDevice = (simId) => {
  const lab = useLab();
  useDeviceVersion(simId);
  const [, bump] = useState(0);
  const device = lab && simId ? lab.device(simId) : null;
  // A device registered without a notify (dev scenes, first frame) still needs one render.
  useFrame(() => {
    if (!lab || !simId || device || !lab.device(simId)) return;
    bump((n) => n + 1);
  }, DEVICE_PRIORITY);
  return { lab, device };
};

// Quantising a continuous device value keeps canvases and geometry from rebuilding every frame.
export const stepValue = (value, step) => Math.round(value / step) * step;

// Follows one continuous device value at a fixed step, so heavy rebuilds happen only when it really moves.
export const useDeviceStep = (device, read, step, fallback) => {
  const [stepped, setStepped] = useState(fallback);
  useFrame(() => {
    if (!device) return;
    const next = stepValue(read(device), step);
    if (next !== stepped) setStepped(next);
  }, DEVICE_PRIORITY);
  return device ? stepped : fallback;
};
