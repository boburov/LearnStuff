import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Euler, Quaternion, Vector3 } from "three";
import { useSnap } from "@/shared/utils/snapStore";
import EquipmentModel from "../equipment/EquipmentModel";
import { BlobVisibleContext } from "../equipment/kit/blobContext";
import { bodyBounds, objectType } from "./objectTypes";
import { actionPose, gasOutletWorld, ignitePose, lipWorld, mouthWorld } from "../tools/poses";
import { CONTAINERS } from "../sim/containers";

const BLEND_S = 0.12;

// Wall fittings are carried low, at arm's length, so they don't fill half the view.
const FIXTURE_POSE = { position: [0.3, -0.72, -0.78], rotation: [0.2, -1.05, -0.12] };

// Hand position in camera space: lower right, far enough to stay out of the near plane.
const handPose = (typeId) => {
  const type = objectType(typeId);
  if (type.kind === "fixture") return FIXTURE_POSE;
  const { half, center } = bodyBounds(type.body);
  const size = Math.max(half[0], half[1], half[2]) * 2;
  const lying = half[0] > half[1] * 2.5;
  return {
    position: [0.2 + size * 0.15, -0.2 - center[1] - size * 0.25, -0.42 - size * 0.55],
    rotation: lying ? [0.25, -0.9, 0] : [0.08, -0.35, 0],
  };
};

const handPosition = new Vector3();
const handQuaternion = new Quaternion();
const tmpQuaternion = new Quaternion();
const tmpEuler = new Euler();
const tmpPoint = new Vector3();

const surfaceOf = (lab, target) => {
  const point = mouthWorld(target, tmpPoint);
  const params = CONTAINERS[target.typeId];
  const mixture = lab.mixture(target.id);
  if (params && mixture) point.y = target.position[1] + Math.max(0.004, (params.mouthY * mixture.volumeMl) / params.capacityMl);
  return point.toArray();
};

// Moves the held model between the hand and the pose of the running action, and publishes where it is.
const followHand = (group, camera, held, lab, world, anim, delta) => {
  const pose = handPose(held.typeId);
  handPosition.set(...pose.position).applyMatrix4(camera.matrixWorld);
  handQuaternion.copy(camera.quaternion).multiply(tmpQuaternion.setFromEuler(tmpEuler.set(...pose.rotation)));

  const activity = lab.activity;
  const action = activity.action;
  const target = action ? world.get(action.targetId) : null;
  anim.holdS = action && anim.actionKey === `${action.id}:${action.targetId}` ? anim.holdS + delta : 0;
  anim.actionKey = action ? `${action.id}:${action.targetId}` : null;

  let desired = null;
  if (action && target) {
    const lamp = target.typeId === "spirit-lamp" ? target : null;
    desired = actionPose({ action, held, target, lamp, camera, holdS: anim.holdS, lab });
  } else if (activity.ignite && held.typeId === "spirit-lamp") {
    const igniteTarget = world.get(activity.ignite.simId);
    if (igniteTarget) desired = ignitePose({ target: igniteTarget, camera });
  }
  if (desired) anim.pose = desired;
  anim.weight += ((desired ? 1 : 0) - anim.weight) * (1 - Math.exp(-delta / BLEND_S));

  if (anim.pose && anim.weight > 0.001) {
    group.position.lerpVectors(handPosition, anim.pose.position, anim.weight);
    group.quaternion.slerpQuaternions(handQuaternion, anim.pose.quaternion, anim.weight);
  } else {
    group.position.copy(handPosition);
    group.quaternion.copy(handQuaternion);
    anim.pose = null;
  }
  group.updateMatrixWorld();

  activity.heldPositions = { [held.id]: group.position.toArray() };
  if (activity.pour && desired?.lip && target) {
    activity.pour.from = anim.weight > 0.85 ? lipWorld(group.position, group.quaternion, desired.lip).toArray() : null;
    activity.pour.to = surfaceOf(lab, world.get(activity.pour.intoId) ?? target);
  }
  if (activity.gas && target) {
    activity.gas.from = gasOutletWorld(group.matrixWorld).toArray();
    const end = mouthWorld(target, tmpPoint);
    if (activity.gas.bubbling) end.y = target.position[1] + 0.012;
    activity.gas.to = end.toArray();
  }
};

const HeldItem = ({ world, lab }) => {
  const { hotbar, activeSlot, objects } = useSnap(world.store);
  const groupRef = useRef(null);
  const anim = useRef({ weight: 0, pose: null, holdS: 0, actionKey: null });
  const heldId = hotbar[activeSlot];
  const held = heldId ? objects.find((o) => o.id === heldId) : null;

  // Runs after the player moved the camera (priority 0) and before the composer renders (1).
  useFrame(({ camera }, delta) => {
    const group = groupRef.current;
    if (!group || !held) return;
    followHand(group, camera, held, lab, world, anim.current, delta);
  }, 0.6);

  if (!held) return null;
  return (
    <group ref={groupRef}>
      <BlobVisibleContext.Provider value={false}>
        <EquipmentModel key={held.id} id={held.typeId} simId={held.id} {...held.props} />
      </BlobVisibleContext.Provider>
    </group>
  );
};

export default HeldItem;
