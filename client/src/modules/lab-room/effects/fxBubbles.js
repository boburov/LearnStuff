import {
  Color,
  DynamicDrawUsage,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
  Vector4,
} from "three";
import { clamp, createColorTracker, createProfile, lerp } from "./fxCore";
import { createRipples } from "./fxRipples";

// Gas bubbles in water are silvery: past the critical angle the surface reflects everything (total internal
// reflection), so the rim is a bright ring of room reflection and the middle stays almost clear.
const OUTPUT = /* glsl */ `
float bNdotV = saturate( dot( geometryNormal, geometryViewDir ) );
float bSin = sqrt( max( 0.0, 1.0 - bNdotV * bNdotV ) );
float bTir = smoothstep( 0.5, 0.86, bSin );
float bBand = smoothstep( 0.15, 0.48, bSin ) * ( 1.0 - bTir );
#ifdef USE_ENVMAP
vec3 bEnv = getIBLRadiance( geometryViewDir, geometryNormal, 0.05 );
#else
vec3 bEnv = vec3( 0.35 );
#endif
#ifdef USE_INSTANCING_COLOR
float bScale = vColor.r;
#else
float bScale = 1.0;
#endif
float bAlpha = clamp( uBubble.x + bTir * uBubble.y + bBand * uBubble.w, 0.0, 1.0 ) * bScale;
vec3 bColor = ( bEnv * ( bTir * uBubble.z + 0.05 ) + totalSpecular * 1.6 ) * uTint + totalDiffuse * bAlpha;
gl_FragColor = vec4( bColor * bScale, bAlpha );
`;

const createBubbleMaterial = () => {
  const material = new MeshStandardMaterial({
    color: "#0a1216",
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
  });
  const uniforms = {
    uBubble: { value: new Vector4(0.04, 0.85, 1.1, 0.12) },
    uTint: { value: new Color(1, 1, 1) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec4 uBubble;\nuniform vec3 uTint;")
      .replace("#include <opaque_fragment>", OUTPUT)
      .replace("#include <premultiplied_alpha_fragment>", "");
  };
  material.customProgramCacheKey = () => "fx-bubble";
  return { material, uniforms };
};

const SIZES = {
  fine: [0.00026, 0.0005],
  medium: [0.0006, 0.0011],
  large: [0.0013, 0.0024],
};

// `size` may be a name or a multiplier (1 = normal fizz, 3 = boiling).
const sizeKey = (size) => {
  if (typeof size !== "number") return SIZES[size] ? size : "medium";
  if (size >= 2.2) return "large";
  return size >= 0.8 ? "medium" : "fine";
};

const STRIDE = 12;
const B = { x: 0, y: 1, z: 2, r: 3, vy: 4, phase: 5, wob: 6, mode: 7, timer: 8, seed: 9, drift: 10, fade: 11 };
const SITES = 10;

const _pos = new Vector3();

// Instanced bubbles that rise inside a vessel profile, wobble, pop at the surface and leave froth and ripples.
export const createBubbles = ({ quality }) => {
  const low = quality === "low";
  const capacity = low ? 110 : 320;
  const ringCapacity = low ? 10 : 26;
  const object = new Group();
  const { material, uniforms } = createBubbleMaterial();
  const sphere = new SphereGeometry(1, low ? 8 : 12, low ? 5 : 8);

  const mesh = new InstancedMesh(sphere, material, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3).fill(1), 3);
  mesh.instanceColor.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.count = 0;
  mesh.visible = false;

  const rings = createRipples({ capacity: ringCapacity, quality, opacity: 0.04 });
  object.add(mesh, rings.object);

  const state = new Float32Array(capacity * STRIDE);
  const sites = new Float32Array(SITES * 2);
  const matrices = mesh.instanceMatrix.array;
  const colors = mesh.instanceColor.array;
  const tint = createColorTracker("#ffffff");
  let count = 0;
  let ringGrow = 0.02;
  let profile = null;
  let profileSource = null;
  let carry = 0;
  let rate = 0;
  let sitesFor = -1;

  const pickSites = (radius) => {
    for (let i = 0; i < SITES; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * radius;
      sites[i * 2] = Math.cos(a) * d;
      sites[i * 2 + 1] = Math.sin(a) * d;
    }
  };

  const spawn = (x, y, z, radius, drift) => {
    if (count >= capacity) return;
    const o = count * STRIDE;
    state[o + B.x] = x;
    state[o + B.y] = y;
    state[o + B.z] = z;
    state[o + B.r] = radius;
    state[o + B.vy] = 0.01;
    state[o + B.phase] = Math.random() * Math.PI * 2;
    state[o + B.wob] = 0;
    state[o + B.mode] = 0;
    state[o + B.timer] = 0;
    state[o + B.seed] = Math.random();
    state[o + B.drift] = drift;
    state[o + B.fade] = 1;
    count += 1;
  };


  // params: { level, rate (mmol/s), site, sources, size, color }

  const update = (dt, params, points, frame, budget) => {
    const { state: three, reduceMotion } = frame;
    uniforms.uTint.value.copy(tint.update(params?.color ?? "#ffffff", dt, 0.3));
    if (points !== profileSource) {
      profileSource = points;
      profile = createProfile(points);
      sitesFor = -1;
    }
    const active = Boolean(params && profile && params.level > profile.floor + 0.002);
    const level = active ? params.level : 0;
    rate = lerp(rate, active ? Math.max(0, params.rate ?? 0) : 0, 1 - Math.exp(-dt / 0.3));

    if (active) {
      const [rLo, rHi] = SIZES[sizeKey(params.size)];
      const floorR = profile.radiusAt(profile.floor + rHi * 3);
      if (sitesFor !== Math.round(floorR * 1e4)) {
        sitesFor = Math.round(floorR * 1e4);
        pickSites(Math.max(0, floorR - rHi * 2));
      }
      // ~60 bubbles per second per mmol/s, capped by tier.
      const perSecond = Math.min(rate * 60, low ? 90 : 260);
      carry += perSecond * dt;
      const room = Math.min(capacity, budget);
      while (carry >= 1) {
        carry -= 1;
        if (count >= room) break;
        const radius = lerp(rLo, rHi, Math.random() ** 1.5);
        const site = params.site;
        const sources = params.sources;
        if ((site === "pieces" || site === "tube") && sources?.length) {
          const s = sources[Math.floor(Math.random() * sources.length)];
          const jitter = site === "tube" ? 0.0012 : 0.004;
          spawn(
            s[0] + (Math.random() - 0.5) * jitter,
            Math.max(profile.floor + radius, s[1] + (Math.random() - 0.5) * jitter),
            s[2] + (Math.random() - 0.5) * jitter,
            radius,
            Math.random() * 0.4 + 0.2,
          );
        } else if (site === "surface") {
          const a = Math.random() * Math.PI * 2;
          const rr = Math.sqrt(Math.random()) * Math.max(0, profile.radiusAt(level) - radius * 2);
          spawn(Math.cos(a) * rr, level - 0.004 - Math.random() * 0.01, Math.sin(a) * rr, radius, 0.3);
        } else {
          const i = Math.floor(Math.random() * SITES);
          const jitter = radius * 2;
          spawn(
            sites[i * 2] + (Math.random() - 0.5) * jitter,
            profile.floor + radius * 1.2,
            sites[i * 2 + 1] + (Math.random() - 0.5) * jitter,
            radius,
            Math.random() * 0.5 + 0.2,
          );
        }
      }
    } else {
      carry = 0;
    }

    // Surface rings must stay inside the vessel, so their reach follows the liquid width.
    ringGrow = Math.min(0.016, Math.max(0.003, profile ? profile.radiusAt(level) * 0.45 : 0.008)) / 0.5;
    const froth = clamp((rate - 1.2) / 5, 0, 1);
    const wobbleScale = reduceMotion ? 0.5 : 1;
    for (let i = 0; i < count; ) {
      const o = i * STRIDE;
      const radius = state[o + B.r];
      let dead = false;
      if (state[o + B.mode] === 2) {
        state[o + B.timer] += dt;
        state[o + B.fade] = 1 - state[o + B.timer] / 0.06;
        if (state[o + B.fade] <= 0) dead = true;
      } else if (state[o + B.mode] === 1) {
        state[o + B.timer] -= dt;
        state[o + B.y] = level - radius * 0.35;
        const dist = Math.hypot(state[o + B.x], state[o + B.z]);
        const wall = Math.max(0, profile.radiusAt(level) - radius);
        if (dist < wall) {
          const push = (0.004 + 0.01 * froth) * dt;
          const k = dist > 1e-6 ? (dist + push) / dist : 1;
          state[o + B.x] *= k;
          state[o + B.z] *= k;
        }
        if (state[o + B.timer] <= 0) {
          state[o + B.mode] = 2;
          state[o + B.timer] = 0;
          if (radius > 0.0009 && Math.random() < 0.25) rings.spawn(state[o + B.x], 0.0004, state[o + B.z], ringGrow);
        }
      } else {
        // Terminal rise speed grows with size; bubbles accelerate out of their nucleation site.
        const target = clamp(0.03 + 190 * radius, 0.05, 0.3);
        state[o + B.vy] += (target - state[o + B.vy]) * (1 - Math.exp(-dt / 0.09));
        state[o + B.y] += state[o + B.vy] * dt;
        state[o + B.phase] += dt * (9 + 24 * radius * 100) * wobbleScale;
        const wob = Math.min(1, radius / 0.0009) * state[o + B.drift] * wobbleScale;
        state[o + B.wob] = wob;
        const sway = wob * 0.0025;
        state[o + B.x] += Math.cos(state[o + B.phase]) * sway * dt * 12;
        state[o + B.z] += Math.sin(state[o + B.phase] * 0.87 + state[o + B.seed]) * sway * dt * 12;
        const wall = Math.max(0, profile.radiusAt(state[o + B.y]) - radius - 0.0004);
        const dist = Math.hypot(state[o + B.x], state[o + B.z]);
        if (dist > wall && dist > 1e-6) {
          const k = wall / dist;
          state[o + B.x] *= k;
          state[o + B.z] *= k;
        }
        if (state[o + B.y] + radius >= level - 0.0006) {
          if (froth > 0.02 && Math.random() < 0.2 + froth * 0.8) {
            state[o + B.mode] = 1;
            state[o + B.timer] = 0.15 + Math.random() * (0.3 + froth * 2.2);
          } else {
            state[o + B.mode] = 2;
            state[o + B.timer] = 0;
            if (radius > 0.0009 && Math.random() < 0.3) rings.spawn(state[o + B.x], 0.0004, state[o + B.z], ringGrow);
          }
        }
      }
      if (!active && state[o + B.mode] !== 2 && state[o + B.y] > level) dead = true;
      if (dead) {
        count -= 1;
        if (i !== count) state.copyWithin(o, count * STRIDE, count * STRIDE + STRIDE);
        continue;
      }
      i += 1;
    }

    // Bubbles below a pixel or two shimmer; draw them at a floor size and dim them instead.
    object.getWorldPosition(_pos);
    const dist = _pos.distanceTo(three.camera.position);
    const pixel = (2 * Math.tan((three.camera.fov * Math.PI) / 360) * dist) / Math.max(1, three.size.height * three.viewport.dpr);
    const minRadius = pixel * 1.15;

    // Bubbles and the vessel's liquid share renderOrder 2; sitting mid-column keeps them sorted in front of it.
    const lift = active ? (profile.floor + level) * 0.5 : 0;
    mesh.position.y = lift;
    rings.object.position.y = level;
    const drawn = Math.min(count, budget);
    for (let i = 0; i < drawn; i += 1) {
      const o = i * STRIDE;
      const radius = state[o + B.r];
      const draw = Math.max(radius, minRadius);
      const dim = Math.min(1, (radius / draw) ** 1.15);
      const surface = state[o + B.mode] === 1;
      const wob = 0.12 * state[o + B.wob] * Math.sin(state[o + B.phase] * 1.7);
      const sx = draw * (1 + wob) * state[o + B.fade];
      const sy = draw * (surface ? 0.75 : 1 - wob) * state[o + B.fade];
      const k = i * 16;
      matrices[k] = sx;
      matrices[k + 1] = 0;
      matrices[k + 2] = 0;
      matrices[k + 3] = 0;
      matrices[k + 4] = 0;
      matrices[k + 5] = sy;
      matrices[k + 6] = 0;
      matrices[k + 7] = 0;
      matrices[k + 8] = 0;
      matrices[k + 9] = 0;
      matrices[k + 10] = sx;
      matrices[k + 11] = 0;
      matrices[k + 12] = state[o + B.x];
      matrices[k + 13] = state[o + B.y] - lift;
      matrices[k + 14] = state[o + B.z];
      matrices[k + 15] = 1;
      const alpha = dim * state[o + B.fade];
      colors[i * 3] = alpha;
      colors[i * 3 + 1] = alpha;
      colors[i * 3 + 2] = alpha;
    }
    mesh.count = drawn;
    mesh.instanceMatrix.clearUpdateRanges();
    mesh.instanceColor.clearUpdateRanges();
    if (drawn > 0) {
      mesh.instanceMatrix.addUpdateRange(0, drawn * 16);
      mesh.instanceColor.addUpdateRange(0, drawn * 3);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    mesh.visible = drawn > 0;

    const ringDrawn = rings.update(dt, { life: 0.5, start: 0.0012, maxDraw: Math.max(0, budget - drawn) });

    return drawn + ringDrawn;
  };

  return {
    object,
    uniforms,
    update,
    count: () => count,
    dispose: () => {
      sphere.dispose();
      material.dispose();
      mesh.dispose();
      rings.dispose();
    },
  };
};
