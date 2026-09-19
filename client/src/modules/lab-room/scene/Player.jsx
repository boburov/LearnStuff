import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useRapier } from "@react-three/rapier";
import { GROUPS } from "../world/groups";
import {
  ACCELERATION,
  BOB_AMPLITUDE,
  CAPSULE_CENTER_Y,
  CAPSULE_HALF_HEIGHT,
  CAPSULE_RADIUS,
  EYE_HEIGHT,
  LOOK_SPEED,
  PITCH_LIMIT,
  RUN_SPEED,
  STRIDE,
  clamp,
  spawnPose,
  targetVelocity,
} from "./playerMath";

// Low enough to survive a long frame hitch, high enough that ~10 fps school PCs still walk at real speed.
const MAX_DT = 0.1;

// Kinematic capsule + Rapier character controller; the camera is the player's eyes.
const Player = ({ meta, inputRef, activeRef, settingsRef, poseRef, resetRef, teleportRef, eyeHeight }) => {
  const bodyRef = useRef(null);
  const colliderRef = useRef(null);
  const motion = useRef({ ready: false, resetToken: 0, teleportToken: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, phase: 0, bob: 0 });
  const { world } = useRapier();
  const spawn = useMemo(() => spawnPose(meta), [meta]);

  const controllerRef = useRef(null);
  // Pair allocation and disposal in the same effect so StrictMode can safely remount it.
  useEffect(() => {
    const controller = world.createCharacterController(0.01);
    controller.setSlideEnabled(true);
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
      world.removeCharacterController(controller);
    };
  }, [world]);

  useFrame((state, delta) => {
    const body = bodyRef.current;
    const collider = colliderRef.current;
    const controller = controllerRef.current;
    if (!body || !collider || !controller) return;

    const m = motion.current;
    const dt = Math.min(delta, MAX_DT);
    const input = inputRef.current;
    const settings = settingsRef.current;

    const teleport = (pose) => {
      body.setTranslation({ x: pose.x, y: CAPSULE_CENTER_Y, z: pose.z }, true);
      m.yaw = pose.yaw;
      m.pitch = pose.pitch;
      m.vx = 0;
      m.vz = 0;
    };

    if (!m.ready) {
      teleport(poseRef.current ?? spawn);
      m.resetToken = resetRef.current;
      m.ready = true;
    } else if (resetRef.current !== m.resetToken) {
      teleport(spawn);
      m.resetToken = resetRef.current;
    } else if (teleportRef?.current && teleportRef.current.token !== m.teleportToken) {
      teleport(teleportRef.current.pose);
      m.teleportToken = teleportRef.current.token;
    }

    const active = activeRef.current;
    if (active) {
      const look = LOOK_SPEED * settings.sensitivity;
      m.yaw -= input.lookX * look;
      m.pitch = clamp(m.pitch - input.lookY * look, -PITCH_LIMIT, PITCH_LIMIT);
    }
    input.lookX = 0;
    input.lookY = 0;

    const target = active ? targetVelocity(input.keys, m.yaw) : { x: 0, z: 0, running: false };
    const k = 1 - Math.exp(-ACCELERATION * dt);
    m.vx += (target.x - m.vx) * k;
    m.vz += (target.z - m.vz) * k;

    controller.computeColliderMovement(collider, { x: m.vx * dt, y: 0, z: m.vz * dt }, undefined, GROUPS.player);
    const move = controller.computedMovement();
    const pos = body.translation();
    const x = pos.x + move.x;
    const z = pos.z + move.z;
    body.setNextKinematicTranslation({ x, y: CAPSULE_CENTER_Y, z });

    // Head-bob follows the distance actually walked, so pushing into a wall doesn't bob.
    const walked = Math.hypot(move.x, move.z);
    const speed = walked / Math.max(dt, 1e-4);
    const stride = target.running ? STRIDE.run : STRIDE.walk;
    m.phase += (walked / stride) * Math.PI * 2;
    const amplitude = settings.reduceMotion ? 0 : BOB_AMPLITUDE * Math.min(speed / RUN_SPEED, 1);
    m.bob += (amplitude - m.bob) * k;

    const sway = Math.sin(m.phase) * m.bob * 0.5;
    const cos = Math.cos(m.yaw);
    const sin = Math.sin(m.yaw);
    const eye = eyeHeight ?? EYE_HEIGHT;
    state.camera.position.set(x + cos * sway, eye + Math.sin(m.phase * 2) * m.bob, z - sin * sway);
    state.camera.rotation.set(m.pitch, m.yaw, 0, "YXZ");

    poseRef.current = { x, z, yaw: m.yaw, pitch: m.pitch };
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={[spawn.x, CAPSULE_CENTER_Y, spawn.z]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider ref={colliderRef} args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} collisionGroups={GROUPS.player} />
    </RigidBody>
  );
};

export default Player;
