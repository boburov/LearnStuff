import { isValveOpen, normTheta, pistonTravel, strokeIndex } from "./engineMath";

export { createSnapStore, useSnap } from "@/shared/utils/snapStore";

export const STEP_RPM = 12;

export const snapshotOf = (theta) => ({
  theta: normTheta(theta),
  stroke: strokeIndex(theta),
  travel: pistonTravel(theta),
  intakeOpen: isValveOpen(theta, "intake"),
  exhaustOpen: isValveOpen(theta, "exhaust"),
});
