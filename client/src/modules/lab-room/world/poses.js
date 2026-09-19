import { Euler, Quaternion, Vector3 } from "three";
import { bodyBounds } from "./objectTypes";

const LIFT = 0.0015;
const tmpEuler = new Euler();
const tmpCenter = new Vector3();

// Upright items face the player (+Z toward the camera); long thin items lie on their side across the view.
export const restPose = (body, point, yaw, { upright = false } = {}) => {
  if (!body.lying || upright) {
    return { position: [point.x, point.y + LIFT, point.z], rotation: [0, yaw, 0] };
  }
  const rotation = [0, yaw, Math.PI / 2];
  const { center } = bodyBounds(body);
  tmpCenter.set(...center).applyEuler(tmpEuler.set(...rotation));
  return {
    position: [point.x - tmpCenter.x, point.y + body.radius + LIFT - tmpCenter.y, point.z - tmpCenter.z],
    rotation,
  };
};

// World-space center and rotation of the body's bounding box for overlap tests.
export const poseBounds = (body, pose) => {
  const { half, center } = bodyBounds(body);
  const quaternion = new Quaternion().setFromEuler(tmpEuler.set(...pose.rotation));
  const worldCenter = new Vector3(...center).applyQuaternion(quaternion).add(new Vector3(...pose.position));
  return { half, center: worldCenter, quaternion };
};
