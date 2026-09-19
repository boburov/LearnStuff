import { Color, Group, Vector3 } from "three";
import { FLAME_KINDS, createFlame } from "./fxFlame";
import { createGlow } from "./fxGlow";
import { createSparks, pixelScale } from "./fxSparks";
import { createPuffs } from "./fxPuffs";
import { createShimmer } from "./fxShimmer";
import { acquireLight } from "./fxLight";
import { budgetRoom, frameBudget } from "./fxCore";

const _world = new Vector3();

// Flame volume + halo + sparks + smoke + shared light, driven by one kind/intensity pair.
export const createFireEffect = ({ quality, scene, extras = true }) => {
  const low = quality === "low";
  const object = new Group();
  const flame = createFlame({ quality });
  const glow = createGlow({ core: 26 });
  const sparks = createSparks({ capacity: low ? 24 : 72 });
  const smoke = createPuffs({ capacity: low ? 20 : 80, color: "#f5f5f5", noiseScale: 0.6, softness: 0.5, sort: true });
  object.add(flame.object, glow.object, sparks.object, smoke.object);
  const shimmer = createShimmer({ quality });
  if (shimmer) object.add(shimmer.object);
  const light = !low && scene ? acquireLight(scene) : null;
  const shimmerParams = { width: 0, height: 0, y: 0, strength: 0 };

  const glowColor = new Color();
  const lightColor = new Color();
  const sparkSeed = { speed: null, spread: 0.55, life: [0.18, 0.5], width: [0.0005, 0.0011] };
  const sparkEnv = { pixel: 0, forks: 0, drag: 2.2, maxDraw: 0 };
  const smokeSeed = { life: 0, size: 0, grow: 0, alpha: 0, glow: 1, lift: 0.18, stretch: 1.25 };
  const smokeEnv = { time: 0, drag: 1.4, turbulence: 0.05, swirl: 30, spread: 0.006, maxDraw: 0 };
  let paletteKind = null;
  let sparkCarry = 0;
  let smokeCarry = 0;
  let time = 0;

  const applyPalette = (preset) => {
    if (preset.sparks) {
      sparks.uniforms.uHot.value.set(preset.sparks.hot).multiplyScalar(5);
      sparks.uniforms.uWarm.value.set(preset.sparks.warm).multiplyScalar(2.4);
      sparks.uniforms.uCool.value.set(preset.sparks.cool).multiplyScalar(0.9);
    }
    if (preset.smoke) {
      smoke.material.color.set(preset.smoke.color);
      smoke.uniforms.uGlow.value.set(preset.smoke.glow).multiplyScalar(1.6);
    }
    if (preset.glow) glowColor.set(preset.glow.color);
    if (preset.light) lightColor.set(preset.light.color);
  };

  // frame: { state, dt, reduceMotion }; mods pass through to the flame (LampFlame boost/dousing).
  const update = (frame, kind, intensity, radius, mods = null) => {
    const { state, dt, reduceMotion } = frame;
    time += dt;
    const level = flame.update(dt, kind, intensity, radius, reduceMotion, mods);
    const current = flame.kind();
    const preset = current ? FLAME_KINDS[current] : null;
    if (current !== paletteKind && preset) {
      paletteKind = current;
      applyPalette(preset);
    }
    const budget = frameBudget(state, quality);
    const active = level > 0.01 && Boolean(kind);
    const R = flame.radius();
    const H = flame.height();

    if (preset?.glow && level > 0.004) {
      const strength = preset.glow.intensity[low ? 1 : 0] * level * flame.flick();
      glow.object.position.set(0, H * 0.3, 0);
      glow.set(glowColor, strength, preset.glow.size * (0.55 + 0.45 * level));
    } else {
      glow.set(glowColor, 0, 0);
    }

    const sparkSpec = extras && active ? preset?.sparks : null;
    if (sparkSpec) {
      sparkCarry += sparkSpec.rate * level * (low ? 0.5 : 1) * (reduceMotion ? 0.6 : 1) * dt;
      const room = budgetRoom(budget);
      while (sparkCarry >= 1) {
        sparkCarry -= 1;
        if (sparks.count() >= room) continue;
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * R * 0.7;
        sparkSeed.speed = sparkSpec.speed;
        sparks.emit(Math.cos(a) * d, H * (0.15 + Math.random() * 0.4), Math.sin(a) * d, sparkSeed);
      }
    } else {
      sparkCarry = 0;
    }
    sparkEnv.pixel = pixelScale(state);
    sparkEnv.forks = sparkSpec?.forks ?? 0;
    sparkEnv.maxDraw = Math.max(0, budgetRoom(budget));
    budget.used += sparks.update(dt, sparkEnv);

    const smokeSpec = extras && active ? preset?.smoke : null;
    if (smokeSpec) {
      smokeCarry += (low ? 12 : 34) * smokeSpec.rate * level * dt;
      while (smokeCarry >= 1) {
        smokeCarry -= 1;
        if (smoke.count() >= budgetRoom(budget)) continue;
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * R * 0.6;
        smokeSeed.life = 2 + Math.random() * 1.2;
        smokeSeed.size = R * 0.9 + 0.003;
        smokeSeed.grow = 0.03 + Math.random() * 0.02;
        smokeSeed.alpha = low ? 0.32 : 0.2;
        smoke.spawn(Math.cos(a) * d, H * (0.6 + Math.random() * 0.5), Math.sin(a) * d, (Math.random() - 0.5) * 0.03, 0.12 + Math.random() * 0.1, (Math.random() - 0.5) * 0.03, smokeSeed);
      }
    } else {
      smokeCarry = 0;
    }
    smoke.uniforms.uGlow.value.copy(glowColor).multiplyScalar(preset?.smoke ? 2.5 * level : 0);
    smokeEnv.time = time;
    smokeEnv.maxDraw = Math.max(0, budgetRoom(budget));
    budget.used += smoke.update(dt, smokeEnv, state.camera);

    if (shimmer) {
      shimmerParams.width = R * 2.2;
      shimmerParams.height = H * 2.4;
      shimmerParams.y = H * 0.55;
      shimmerParams.strength = (preset?.shimmer ?? 0) * level;
      shimmer.update(dt, shimmerParams, state.camera);
    }

    if (light) {
      object.getWorldPosition(_world);
      _world.y += H * 0.4;
      const spec = preset?.light;
      const strength = spec && level > 0.004 ? spec.intensity * level * flame.flick() * (reduceMotion ? 0.7 : 1) : 0;
      light.offer(state.clock.elapsedTime, _world, lightColor, strength, spec?.distance ?? 2);
    }
    return level;
  };

  return {
    object,
    update,
    flame,
    dispose: () => {
      flame.dispose();
      glow.dispose();
      sparks.dispose();
      smoke.dispose();
      shimmer?.dispose();
      light?.release();
    },
  };
};
