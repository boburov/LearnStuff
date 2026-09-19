import { Euler, Quaternion, Vector3 } from "three";
import { CONTAINERS } from "../sim/containers";
import { GAS_OUTLET, LAMP_WICK, TOOL_TIPS, mouthOf } from "../sim/anchors";

const UP = new Vector3(0, 1, 0);
const tmpEuler = new Euler();
const tmpA = new Vector3();
const tmpB = new Vector3();
const tmpQ = new Quaternion();
const tmpQ2 = new Quaternion();

// Tilt angles (rad) at full pour: bottles need more than open vessels.
const POUR_TILT = { bottle: 1.9, "test-tube": 1.95, default: 1.65 };
const FLAME_OFFSET = 0.035;

export const objectQuaternion = (object, out = new Quaternion()) => out.setFromEuler(tmpEuler.set(...object.rotation));

// World point of a model-space anchor on a placed object.
export const worldPoint = (object, local, out = new Vector3()) =>
  out.set(...local).applyQuaternion(objectQuaternion(object, tmpQ2)).add(tmpA.set(...object.position));

const mouthPoint = (object, out) => {
  const mouth = mouthOf(object.typeId);
  return worldPoint(object, [0, mouth ? mouth[0] : 0.1, 0], out);
};

// Horizontal unit vector from the camera toward a point.
const towards = (camera, point, out) => {
  out.set(point.x - camera.x, 0, point.z - camera.z);
  if (out.lengthSq() < 1e-6) out.set(0, 0, -1);
  return out.normalize();
};

// Pose that puts a local point of the held model at `target` with rotation `quaternion`.
const placeLocal = (quaternion, local, target) => ({
  position: target.clone().sub(tmpB.set(...local).applyQuaternion(quaternion)),
  quaternion,
});

// A tool whose working end lies along ±x: point that end straight down, facing the player.
const toolDown = (typeId, camera, target) => {
  const tool = TOOL_TIPS[typeId];
  if (!tool) return null;
  const facing = towards(camera, target, new Vector3());
  const yaw = Math.atan2(-facing.x, -facing.z);
  const q = new Quaternion().setFromEuler(new Euler(0, yaw, 0));
  q.multiply(tmpQ.setFromAxisAngle(new Vector3(0, 0, 1), tool.sign < 0 ? Math.PI / 2 : -Math.PI / 2));
  q.premultiply(tmpQ.setFromAxisAngle(tmpA.set(-facing.z, 0, facing.x), -0.18));
  return placeLocal(q, tool.tip, target);
};

// A tool held level, pointing away from the player with its working end at `target` (tongs into a flame).
const toolLevel = (typeId, camera, target) => {
  const tool = TOOL_TIPS[typeId];
  if (!tool) return null;
  const forward = towards(camera, target, new Vector3());
  const along = tool.sign > 0 ? forward : forward.clone().negate();
  const q = new Quaternion().setFromAxisAngle(UP, Math.atan2(-along.z, along.x));
  q.premultiply(tmpQ.setFromAxisAngle(tmpA.set(-forward.z, 0, forward.x), -0.15));
  return placeLocal(q, tool.tip, target);
};

// Where the held item goes while an action runs; null keeps it in the hand.
export const actionPose = ({ action, held, target, lamp, camera, holdS, lab }) => {
  if (!action || !held || !target) return null;
  const cam = camera.position;

  if (action.id === "pour") {
    const mouth = mouthPoint(target, new Vector3());
    const heldMouth = mouthOf(held.typeId) ?? [0.1, 0.02];
    const targetMouth = mouthOf(target.typeId) ?? [0.1, 0.03];
    // Pour sideways from the player's right so the stream stays in view.
    const forward = towards(cam, mouth, new Vector3());
    const dir = new Vector3(forward.z, 0, -forward.x);
    const yaw = Math.atan2(-dir.z, dir.x);
    const kind = held.typeId.startsWith("sub:") ? "bottle" : held.typeId;
    const tilt = Math.min(1, holdS / 0.45) * (POUR_TILT[kind] ?? POUR_TILT.default);
    const q = new Quaternion().setFromAxisAngle(UP, yaw);
    q.premultiply(tmpQ.setFromAxisAngle(tmpA.crossVectors(UP, dir).normalize(), tilt));
    const lip = [heldMouth[1], heldMouth[0], 0];
    const target3 = mouth.addScaledVector(UP, 0.035 + targetMouth[1] * 0.2).addScaledVector(dir, -targetMouth[1] * 0.35);
    return { ...placeLocal(q, lip, target3), lip };
  }

  if (action.id === "dropper-drop") return toolDown("dropper", cam, mouthPoint(target, new Vector3()).addScaledVector(UP, 0.02));

  if (action.id === "stir" || action.id === "measure") {
    const params = CONTAINERS[target.typeId];
    const mixture = lab.mixture(target.id);
    const depth = params && mixture ? Math.min(params.mouthY * 0.8, 0.01 + (params.mouthY * mixture.volumeMl) / params.capacityMl) : 0.03;
    const spin = action.id === "stir" ? holdS * 5 : 0;
    const radius = params ? params.mouthR * 0.35 : 0.01;
    const point = worldPoint(target, [Math.cos(spin) * radius, Math.max(0.012, depth * 0.35), Math.sin(spin) * radius], new Vector3());
    return toolDown(held.typeId, cam, point);
  }

  if (action.id === "heat-in-flame" && lamp) {
    const flame = worldPoint(lamp, [LAMP_WICK[0], LAMP_WICK[1] + FLAME_OFFSET, LAMP_WICK[2]], new Vector3());
    if (held.typeId === "crucible-tongs") return toolLevel("crucible-tongs", cam, flame);
    const forward = towards(cam, flame, new Vector3());
    const q = new Quaternion().setFromAxisAngle(forward, 0.55);
    return placeLocal(q, [0, 0.012, 0], flame);
  }

  if (action.id === "immerse") {
    const inside = mouthPoint(target, new Vector3()).addScaledVector(UP, -0.09);
    if (held.typeId === "crucible-tongs") return toolDown("crucible-tongs", cam, inside);
    return placeLocal(new Quaternion(), [0, 0, 0], inside);
  }

  return null;
};

// Pose for a lit lamp brought to a container's mouth for a moment (ignition).
export const ignitePose = ({ target, camera }) => {
  const mouth = mouthPoint(target, new Vector3());
  const dir = towards(camera.position, mouth, new Vector3());
  const spot = mouth.addScaledVector(UP, 0.015).addScaledVector(dir, -0.03);
  return placeLocal(new Quaternion(), [LAMP_WICK[0], LAMP_WICK[1] + 0.02, LAMP_WICK[2]], spot);
};

export const lipWorld = (position, quaternion, lip, out = new Vector3()) =>
  out.set(...lip).applyQuaternion(quaternion).add(position);

export const gasOutletWorld = (matrixWorld, out = new Vector3()) => out.set(...GAS_OUTLET).applyMatrix4(matrixWorld);

export const mouthWorld = (object, out = new Vector3()) => mouthPoint(object, out);
