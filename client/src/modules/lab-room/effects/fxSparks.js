import { AdditiveBlending, Color, DoubleSide, Mesh, ShaderMaterial } from "three";
import { createQuadInstances, markInstances } from "./fxCore";

const VERTEX = /* glsl */ `
attribute vec3 aPos;
attribute vec3 aVel;
attribute vec4 aSpark;
uniform float uPixel;
uniform float uStreak;
varying vec2 vQuad;
varying float vHeat;
varying float vEnergy;
void main() {
  vec4 head = modelViewMatrix * vec4( aPos, 1.0 );
  vec4 tail = modelViewMatrix * vec4( aPos - aVel * uStreak, 1.0 );
  vec2 d = head.xy - tail.xy;
  float len = length( d );
  vec2 dir = len > 1e-6 ? d / len : vec2( 0.0, 1.0 );
  vec2 perp = vec2( - dir.y, dir.x );
  float depth = max( - head.z, 0.02 );
  float minWidth = uPixel * depth * 1.3;
  float width = max( aSpark.y, minWidth );
  // Sub-pixel sparks are widened for stability and dimmed so their energy stays the same.
  vEnergy = aSpark.y / width;
  vec4 p = mix( tail, head, position.y * 0.5 + 0.5 );
  p.xy += perp * position.x * width + dir * position.y * width;
  gl_Position = projectionMatrix * p;
  vQuad = position.xy;
  vHeat = aSpark.x;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uHot;
uniform vec3 uWarm;
uniform vec3 uCool;
uniform float uGain;
varying vec2 vQuad;
varying float vHeat;
varying float vEnergy;
void main() {
  float across = 1.0 - vQuad.x * vQuad.x;
  float along = smoothstep( - 1.0, 0.3, vQuad.y );
  vec3 color = vHeat > 0.5 ? mix( uWarm, uHot, ( vHeat - 0.5 ) * 2.0 ) : mix( uCool, uWarm, vHeat * 2.0 );
  float brightness = mix( 0.4, 1.0, vHeat ) * vHeat;
  gl_FragColor = vec4( color * ( uGain * brightness * across * across * along * vEnergy ), 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const STRIDE = 12;

// Velocity-stretched additive streaks that cool from white to red and fall under gravity.
export const createSparks = ({ capacity }) => {
  const geometry = createQuadInstances(capacity, [["aPos", 3], ["aVel", 3], ["aSpark", 4]]);
  const material = new ShaderMaterial({
    uniforms: {
      uPixel: { value: 0.001 },
      uStreak: { value: 0.014 },
      uHot: { value: new Color("#fff4dc").multiplyScalar(4.5) },
      uWarm: { value: new Color("#ff9b2f").multiplyScalar(2.2) },
      uCool: { value: new Color("#b83208").multiplyScalar(0.8) },
      uGain: { value: 1 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    // The quad is built around the screen-space velocity, so its winding flips with the streak direction.
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  mesh.visible = false;

  const state = new Float32Array(capacity * STRIDE);
  const pos = geometry.attributes.aPos;
  const vel = geometry.attributes.aVel;
  const spark = geometry.attributes.aSpark;
  let count = 0;

  // Random direction in a cone around +Y (spread 0 = straight up, 1 = full sphere).
  const emit = (x, y, z, { speed = [0.4, 1.4], spread = 0.55, life = [0.2, 0.5], width = [0.0006, 0.0012], heat = 1 }) => {
    if (count >= capacity) return;
    const o = count * STRIDE;
    const cosTheta = 1 - Math.random() * spread * 2;
    const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
    const phi = Math.random() * Math.PI * 2;
    const v = speed[0] + Math.random() * (speed[1] - speed[0]);
    state[o] = x;
    state[o + 1] = y;
    state[o + 2] = z;
    state[o + 3] = Math.cos(phi) * sinTheta * v;
    state[o + 4] = cosTheta * v;
    state[o + 5] = Math.sin(phi) * sinTheta * v;
    state[o + 6] = 0;
    state[o + 7] = life[0] + Math.random() * (life[1] - life[0]);
    state[o + 8] = heat;
    state[o + 9] = width[0] + Math.random() * (width[1] - width[0]);
    state[o + 10] = Math.random();
    state[o + 11] = 0;
    count += 1;
  };

  const update = (dt, { gravity = 9.81, drag = 2.5, maxDraw = capacity, pixel, forks = 0, floor = -0.06 }) => {
    const damping = Math.exp(-drag * dt);
    for (let i = 0; i < count; ) {
      const o = i * STRIDE;
      const age = state[o + 6] + dt;
      if (age >= state[o + 7] || state[o + 1] < floor) {
        // A few magnesium-style sparks burst into smaller ones at the end of their flight.
        if (forks > 0 && state[o + 11] === 0 && state[o + 10] < forks && count + 2 < capacity) {
          const px = state[o];
          const py = state[o + 1];
          const pz = state[o + 2];
          for (let k = 0; k < 2; k += 1) emit(px, py, pz, { speed: [0.2, 0.6], spread: 1, life: [0.08, 0.2], width: [0.0002, 0.0004], heat: 0.8 });
          for (let k = 1; k <= 2; k += 1) state[(count - k) * STRIDE + 11] = 1;
        }
        count -= 1;
        if (i !== count) state.copyWithin(o, count * STRIDE, count * STRIDE + STRIDE);
        continue;
      }
      state[o + 6] = age;
      state[o + 3] *= damping;
      state[o + 4] = state[o + 4] * damping - gravity * dt;
      state[o + 5] *= damping;
      state[o] += state[o + 3] * dt;
      state[o + 1] += state[o + 4] * dt;
      state[o + 2] += state[o + 5] * dt;
      i += 1;
    }

    const drawn = Math.min(count, maxDraw);
    const p = pos.array;
    const v = vel.array;
    const s = spark.array;
    for (let i = 0; i < drawn; i += 1) {
      const o = i * STRIDE;
      const t = state[o + 6] / state[o + 7];
      p[i * 3] = state[o];
      p[i * 3 + 1] = state[o + 1];
      p[i * 3 + 2] = state[o + 2];
      v[i * 3] = state[o + 3];
      v[i * 3 + 1] = state[o + 4];
      v[i * 3 + 2] = state[o + 5];
      s[i * 4] = state[o + 8] * Math.pow(1 - t, 1.4);
      s[i * 4 + 1] = state[o + 9] * (1 - 0.5 * t);
      s[i * 4 + 2] = t;
      s[i * 4 + 3] = state[o + 10];
    }
    markInstances(pos, drawn);
    markInstances(vel, drawn);
    markInstances(spark, drawn);
    geometry.instanceCount = drawn;
    material.uniforms.uPixel.value = pixel;
    mesh.visible = drawn > 0;
    return drawn;
  };

  return {
    object: mesh,
    uniforms: material.uniforms,
    emit,
    update,
    count: () => count,
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
};

// View-space size of one drawing-buffer pixel at depth 1 m.
export const pixelScale = (state) => {
  const camera = state.camera;
  const height = state.size.height * state.viewport.dpr;
  return camera.isPerspectiveCamera ? (2 * Math.tan((camera.fov * Math.PI) / 360)) / Math.max(1, height) : 0.001;
};
