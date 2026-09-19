import { Color, Matrix4, Mesh, MeshStandardMaterial, Vector4 } from "three";
import { acquireNoise, releaseNoise } from "./fxNoise";
import { createQuadInstances, markInstances } from "./fxCore";

const VERTEX_PARS = /* glsl */ `
attribute vec3 aCenter;
attribute vec4 aShape;
attribute vec4 aLife;
varying vec2 vCorner;
varying vec2 vNoiseUv;
varying vec4 vLife;
varying float vSeed;
`;

const PROJECT = /* glsl */ `
vec4 mvPosition = modelViewMatrix * vec4( aCenter, 1.0 );
float puffC = cos( aShape.y );
float puffS = sin( aShape.y );
vec2 puffCorner = vec2( puffC * position.x - puffS * position.y, puffS * position.x + puffC * position.y );
mvPosition.xy += position.xy * aShape.x * vec2( 1.0, aShape.z );
gl_Position = projectionMatrix * mvPosition;
vCorner = position.xy;
vNoiseUv = puffCorner * vec2( 1.0, aShape.z );
vLife = aLife;
vSeed = aShape.w;
`;

const FRAGMENT_PARS = /* glsl */ `
uniform sampler3D uNoise;
uniform vec4 uPuff;
uniform vec3 uGlow;
varying vec2 vCorner;
varying vec2 vNoiseUv;
varying vec4 vLife;
varying float vSeed;
`;

// Radial falloff × animated noise, eroded with age so puffs break into wisps before they vanish.
const ALPHA = /* glsl */ `
float puffR2 = dot( vCorner, vCorner );
if ( puffR2 >= 1.0 ) discard;
float puffFall = 1.0 - puffR2;
puffFall *= puffFall;
vec3 puffQ = vec3( vNoiseUv * uPuff.x + vSeed * 7.31, vLife.z * uPuff.z + vSeed * 3.17 );
vec4 puffN = texture( uNoise, puffQ );
vec4 puffM = texture( uNoise, puffQ * 2.3 + 0.37 );
float puffD = puffFall * ( 0.2 + 0.8 * ( 0.55 * puffN.r + 0.25 * puffN.g + 0.2 * puffM.a ) );
float puffLo = mix( 0.16, 0.46, vLife.y );
float puffA = smoothstep( puffLo, puffLo + uPuff.y, puffD ) * vLife.x;
diffuseColor.a *= puffA;
if ( diffuseColor.a < 0.002 ) discard;
diffuseColor.rgb *= 0.88 + 0.12 * fract( vSeed * 13.7 );
`;

// A rounded view-space normal gives each puff a lit top and a softer underside.
const NORMAL = /* glsl */ `
float faceDirection = 1.0;
vec3 normal = normalize( vec3( ( vCorner + ( puffN.gb - 0.5 ) * 0.6 ) * uPuff.w, sqrt( max( 1.0 - puffR2, 0.0 ) ) + 0.3 ) );
vec3 nonPerturbedNormal = normal;
`;

const createPuffMaterial = (noise) => {
  const material = new MeshStandardMaterial({
    color: "#ffffff",
    roughness: 1,
    metalness: 0,
    transparent: true,
    depthWrite: false,
  });
  const uniforms = {
    uNoise: { value: noise },
    uPuff: { value: new Vector4(0.55, 0.3, 0.3, 0.8) },
    uGlow: { value: new Color(0, 0, 0) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
      .replace("#include <normal_vertex>", "vNormal = vec3( 0.0, 0.0, 1.0 );")
      .replace("#include <begin_vertex>", "vec3 transformed = aCenter;")
      .replace("#include <project_vertex>", PROJECT);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${FRAGMENT_PARS}`)
      .replace("#include <alphamap_fragment>", ALPHA)
      .replace("#include <normal_fragment_begin>", NORMAL)
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlow * vLife.w;");
  };
  material.customProgramCacheKey = () => "fx-puff";
  return { material, uniforms };
};

const STRIDE = 17;
const P = { x: 0, y: 1, z: 2, vx: 3, vy: 4, vz: 5, age: 6, life: 7, size: 8, grow: 9, rot: 10, spin: 11, seed: 12, alpha: 13, glow: 14, lift: 15, stretch: 16 };

const _mv = new Matrix4();

// Pooled soft billboards lit like the equipment (room reflections + key light); used for steam, smoke and vapour.
export const createPuffs = ({ capacity, color = "#ffffff", noiseScale = 0.55, softness = 0.45, evolve = 0.3, bulge = 0.45, sort = false }) => {
  const noise = acquireNoise();
  const geometry = createQuadInstances(capacity, [["aCenter", 3], ["aShape", 4], ["aLife", 4]]);
  const { material, uniforms } = createPuffMaterial(noise);
  material.color.set(color);
  uniforms.uPuff.value.set(noiseScale, softness, evolve, bulge);
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.visible = false;

  const state = new Float32Array(capacity * STRIDE);
  const depth = new Float32Array(capacity);
  const order = new Uint16Array(capacity);
  const center = geometry.attributes.aCenter;
  const shape = geometry.attributes.aShape;
  const life = geometry.attributes.aLife;
  let count = 0;

  const spawn = (x, y, z, vx, vy, vz, p) => {
    if (count >= capacity) return false;
    const o = count * STRIDE;
    state[o + P.x] = x;
    state[o + P.y] = y;
    state[o + P.z] = z;
    state[o + P.vx] = vx;
    state[o + P.vy] = vy;
    state[o + P.vz] = vz;
    state[o + P.age] = 0;
    state[o + P.life] = p.life;
    state[o + P.size] = p.size;
    state[o + P.grow] = p.grow;
    state[o + P.rot] = Math.random() * Math.PI * 2;
    state[o + P.spin] = (Math.random() - 0.5) * (p.spin ?? 0.6);
    state[o + P.seed] = Math.random() * 64;
    state[o + P.alpha] = p.alpha;
    state[o + P.glow] = p.glow ?? 0;
    state[o + P.lift] = p.lift ?? 0;
    state[o + P.stretch] = p.stretch ?? 1;
    count += 1;
    return true;
  };

  // env: { time, drag, turbulence, swirl, sink, fadeIn, maxDraw }
  const update = (dt, env, camera) => {
    const { time, drag, turbulence, swirl, sink = 0, fadeIn = 0.12, spread = 0 } = env;
    const relax = 1 - Math.exp(-dt * drag);
    for (let i = 0; i < count; ) {
      const o = i * STRIDE;
      const age = state[o + P.age] + dt;
      if (age >= state[o + P.life]) {
        count -= 1;
        if (i !== count) state.copyWithin(o, count * STRIDE, count * STRIDE + STRIDE);
        continue;
      }
      state[o + P.age] = age;
      const x = state[o + P.x];
      const y = state[o + P.y];
      const z = state[o + P.z];
      const seed = state[o + P.seed];
      const k = Math.min(1, age * 3);
      const tx = (Math.sin(y * swirl + time * 1.7 + seed) * 0.6 + Math.sin(z * swirl * 0.7 - time * 1.1 + seed * 2.3) * 0.4) * turbulence * k;
      const tz = (Math.cos(y * swirl * 0.9 + time * 1.3 + seed * 1.7) * 0.6 + Math.sin(x * swirl * 0.8 + time * 1.9 + seed) * 0.4) * turbulence * k;
      const radial = Math.hypot(x, z) || 1;
      state[o + P.vx] += (tx + (x / radial) * spread - state[o + P.vx]) * relax;
      state[o + P.vz] += (tz + (z / radial) * spread - state[o + P.vz]) * relax;
      // Buoyancy fades as the plume cools; heavy smoke then sinks.
      const lift = state[o + P.lift] * Math.exp(-age * 1.2) - sink * Math.min(1, age * 0.8);
      state[o + P.vy] += (lift - state[o + P.vy] * drag * 0.35) * dt;
      state[o + P.x] = x + state[o + P.vx] * dt;
      state[o + P.y] = y + state[o + P.vy] * dt;
      state[o + P.z] = z + state[o + P.vz] * dt;
      state[o + P.rot] += state[o + P.spin] * dt;
      i += 1;
    }

    const drawn = Math.min(count, env.maxDraw ?? count);
    for (let i = 0; i < drawn; i += 1) order[i] = i;
    if (sort && camera && drawn > 1) {
      _mv.multiplyMatrices(camera.matrixWorldInverse, mesh.matrixWorld);
      const e = _mv.elements;
      for (let i = 0; i < drawn; i += 1) {
        const o = i * STRIDE;
        depth[i] = e[2] * state[o] + e[6] * state[o + 1] + e[10] * state[o + 2] + e[14];
      }
      for (let i = 1; i < drawn; i += 1) {
        const v = order[i];
        let j = i - 1;
        while (j >= 0 && depth[order[j]] > depth[v]) {
          order[j + 1] = order[j];
          j -= 1;
        }
        order[j + 1] = v;
      }
    }

    const c = center.array;
    const s = shape.array;
    const l = life.array;
    for (let n = 0; n < drawn; n += 1) {
      const o = order[n] * STRIDE;
      const age = state[o + P.age];
      const t = age / state[o + P.life];
      const fade = Math.min(1, t / fadeIn) * (1 - t * t * (3 - 2 * t));
      c[n * 3] = state[o + P.x];
      c[n * 3 + 1] = state[o + P.y];
      c[n * 3 + 2] = state[o + P.z];
      s[n * 4] = state[o + P.size] + state[o + P.grow] * age;
      s[n * 4 + 1] = state[o + P.rot];
      s[n * 4 + 2] = state[o + P.stretch];
      s[n * 4 + 3] = state[o + P.seed];
      l[n * 4] = state[o + P.alpha] * fade;
      l[n * 4 + 1] = t;
      l[n * 4 + 2] = age + state[o + P.seed];
      l[n * 4 + 3] = state[o + P.glow] * Math.max(0, 1 - t * 3.5);
    }
    markInstances(center, drawn);
    markInstances(shape, drawn);
    markInstances(life, drawn);
    geometry.instanceCount = drawn;
    mesh.visible = drawn > 0;
    return drawn;
  };

  return {
    object: mesh,
    material,
    uniforms,
    spawn,
    update,
    count: () => count,
    clear: () => {
      count = 0;
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
      releaseNoise();
    },
  };
};
