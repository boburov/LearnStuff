import { useCallback } from "react";
import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";
import { useThree } from "@react-three/fiber";
import { useKit } from "../equipment/kit/kitContext";
import { approach, budgetRoom, clamp, frameBudget, rand, useFxSystem } from "./fxCore";
import { createPuffs } from "./fxPuffs";
import { createRipples } from "./fxRipples";
import { createFireEffect } from "./fxFireEffect";

const RADIUS = 0.0034;

const createBall = ({ quality, scene }) => {
  const low = quality === "low";
  const object = new Group();
  const geometry = new SphereGeometry(1, low ? 12 : 20, low ? 8 : 14);
  const material = new MeshStandardMaterial({ color: "#d9dde2", metalness: 1, roughness: 0.17 });
  const ball = new Mesh(geometry, material);
  ball.castShadow = false;
  const vapour = createPuffs({ capacity: low ? 16 : 44, color: "#ffffff", noiseScale: 0.45, softness: 0.5, bulge: 0.3 });
  const ripples = createRipples({ capacity: low ? 6 : 14, quality, opacity: 0.05 });
  const fire = createFireEffect({ quality, scene, extras: false });
  object.add(ball, vapour.object, ripples.object, fire.object);

  const move = { x: 0, z: 0, vx: 0.08, vz: 0.05, size: 0, level: 0 };
  const seed = { life: 0, size: 0.003, grow: 0, alpha: 0.2, lift: 0.1, spin: 0.6, stretch: 1.2 };
  const vapourEnv = { time: 0, drag: 1.4, turbulence: 0.02, swirl: 30, fadeIn: 0.2, maxDraw: 0 };
  const rippleEnv = { life: 0.5, start: 0.002, maxDraw: 0 };
  let carry = 0;
  let rippleCarry = 0;
  let time = 0;

  const update = (frame, params, surfaceRadius) => {
    const { state, dt, reduceMotion } = frame;
    time += dt;
    move.level = approach(move.level, params ? 1 : 0, dt, 0.25);
    const target = params ? clamp(params.size ?? 1, 0, 1) : 0;
    move.size = approach(move.size, target, dt, 0.5);
    const level = params?.level ?? 0;
    const radius = RADIUS * (0.35 + 0.65 * move.size) * move.level;
    const budget = frameBudget(state, quality);
    const alive = move.level > 0.02 && radius > 1e-4;
    ball.visible = alive;

    if (alive) {
      // The escaping hydrogen shoves the ball around in short, erratic bursts.
      const jitter = (reduceMotion ? 0.4 : 1) * (0.6 + 1.6 * move.size);
      move.vx += (Math.random() - 0.5) * jitter * dt * 6;
      move.vz += (Math.random() - 0.5) * jitter * dt * 6;
      const speed = Math.hypot(move.vx, move.vz) || 1e-5;
      const wanted = clamp(0.06 + 0.22 * move.size, 0.04, 0.3) * (reduceMotion ? 0.6 : 1);
      move.vx *= wanted / speed;
      move.vz *= wanted / speed;
      move.x += move.vx * dt;
      move.z += move.vz * dt;
      const limit = Math.max(0, surfaceRadius - radius * 2);
      const dist = Math.hypot(move.x, move.z);
      if (dist > limit && dist > 1e-6) {
        const nx = move.x / dist;
        const nz = move.z / dist;
        const dot = move.vx * nx + move.vz * nz;
        move.vx -= 2 * dot * nx;
        move.vz -= 2 * dot * nz;
        move.vx += (Math.random() - 0.5) * 0.05;
        move.vz += (Math.random() - 0.5) * 0.05;
        move.x = nx * limit;
        move.z = nz * limit;
      }
      ball.position.set(move.x, level + radius * 0.25, move.z);
      ball.scale.setScalar(radius);
      ball.rotation.y += dt * 4;
      ball.rotation.x += dt * 2.5;

      carry += (low ? 12 : 26) * (0.4 + move.size) * dt;
      while (carry >= 1) {
        carry -= 1;
        if (vapour.count() >= budgetRoom(budget)) break;
        seed.life = rand(0.5, 1.1);
        seed.grow = rand(0.012, 0.026);
        vapour.spawn(move.x + rand(-0.003, 0.003), level + 0.002, move.z + rand(-0.003, 0.003), -move.vx * 0.2 + rand(-0.02, 0.02), rand(0.05, 0.12), -move.vz * 0.2 + rand(-0.02, 0.02), seed);
      }
      rippleCarry += 9 * dt;
      while (rippleCarry >= 1) {
        rippleCarry -= 1;
        ripples.spawn(move.x, level + 0.0004, move.z, 0.03);
      }
    } else {
      carry = 0;
    }

    vapourEnv.time = time;
    vapourEnv.maxDraw = budgetRoom(budget);
    budget.used += vapour.update(dt, vapourEnv, state.camera);
    rippleEnv.maxDraw = budgetRoom(budget);
    budget.used += ripples.update(dt, rippleEnv);
    fire.object.position.set(move.x, level + radius * 0.9, move.z);
    fire.update(frame, alive && params?.burning ? "sodium-water" : null, move.size * 0.6 + 0.4, radius);
  };

  return {
    object,
    update,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      vapour.dispose();
      ripples.dispose();
      fire.dispose();
    },
  };
};

// Molten sodium skating on a water surface, hissing vapour behind it.
// Props: surfaceRadius, get() → { level, size, burning } | null.
const SodiumBall = ({ surfaceRadius = 0.06, get }) => {
  const { quality } = useKit();
  const scene = useThree((s) => s.scene);
  const create = useCallback(() => createBall({ quality, scene }), [quality, scene]);
  const groupRef = useFxSystem(create, (system, frame) => system.update(frame, get?.() ?? null, surfaceRadius));
  return <group ref={groupRef} />;
};

export default SodiumBall;
