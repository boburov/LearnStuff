export const EYE_HEIGHT = 1.65;
export const CAPSULE_RADIUS = 0.28;
export const CAPSULE_HALF_HEIGHT = 0.62;
export const CAPSULE_CENTER_Y = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.02;

export const WALK_SPEED = 1.9;
export const RUN_SPEED = 3.6;
export const ACCELERATION = 12;
export const LOOK_SPEED = 0.0022;
export const PITCH_LIMIT = 1.45;

// One stride = two steps; the head dips once per step.
export const STRIDE = { walk: 1.5, run: 2.2 };
export const BOB_AMPLITUDE = 0.03;

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Yaw/pitch for a camera at `from` looking at `to` (rotation order YXZ, forward = -Z).
export const lookAngles = (from, to) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  return {
    yaw: Math.atan2(-dx, -dz),
    pitch: clamp(Math.atan2(dy, Math.hypot(dx, dz)), -PITCH_LIMIT, PITCH_LIMIT),
  };
};

export const spawnPose = (meta) => {
  const [x, , z] = meta.spawn.position;
  const eye = [x, EYE_HEIGHT, z];
  return { x, z, ...lookAngles(eye, meta.spawn.lookAt) };
};

const MOVE_KEYS = {
  forward: ["KeyW", "ArrowUp"],
  back: ["KeyS", "ArrowDown"],
  left: ["KeyA", "ArrowLeft"],
  right: ["KeyD", "ArrowRight"],
  run: ["ShiftLeft", "ShiftRight"],
};

const held = (keys, codes) => codes.some((c) => keys.has(c));

// World-space target velocity from held keys and the current yaw.
export const targetVelocity = (keys, yaw) => {
  const forward = (held(keys, MOVE_KEYS.forward) ? 1 : 0) - (held(keys, MOVE_KEYS.back) ? 1 : 0);
  const strafe = (held(keys, MOVE_KEYS.right) ? 1 : 0) - (held(keys, MOVE_KEYS.left) ? 1 : 0);
  const running = held(keys, MOVE_KEYS.run);
  const length = Math.hypot(forward, strafe);
  if (!length) return { x: 0, z: 0, running };

  const speed = running ? RUN_SPEED : WALK_SPEED;
  const f = forward / length;
  const s = strafe / length;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);
  return {
    x: (-sin * f + cos * s) * speed,
    z: (-cos * f - sin * s) * speed,
    running,
  };
};
