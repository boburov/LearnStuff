import { DynamicDrawUsage, InstancedMesh, SphereGeometry } from "three";
import { createLiquidMaterial } from "../equipment/kit/materials";

const STRIDE = 10;

// Pooled liquid droplets: instanced spheres stretched along their flight, shaded like the kit's liquids.
export const createDroplets = ({ capacity, quality, color = "#0d2230", opacity = 0.25 }) => {
  const geometry = new SphereGeometry(1, quality === "low" ? 6 : 9, quality === "low" ? 4 : 6);
  const material = createLiquidMaterial({ color, opacity });
  const mesh = new InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  mesh.count = 0;
  mesh.visible = false;

  const state = new Float32Array(capacity * STRIDE);
  const m = mesh.instanceMatrix.array;
  let count = 0;

  const emit = (x, y, z, vx, vy, vz, radius, life) => {
    if (count >= capacity) return;
    const o = count * STRIDE;
    state[o] = x;
    state[o + 1] = y;
    state[o + 2] = z;
    state[o + 3] = vx;
    state[o + 4] = vy;
    state[o + 5] = vz;
    state[o + 6] = 0;
    state[o + 7] = life;
    state[o + 8] = radius;
    state[o + 9] = Math.random();
    count += 1;
  };

  // floor: local y where droplets land and disappear.
  const update = (dt, { gravity = 9.81, drag = 0.25, floor = -1, stretch = 0.02, maxDraw = capacity }) => {
    const damp = Math.exp(-drag * dt);
    for (let i = 0; i < count; ) {
      const o = i * STRIDE;
      const age = state[o + 6] + dt;
      if (age >= state[o + 7] || state[o + 1] < floor) {
        count -= 1;
        if (i !== count) state.copyWithin(o, count * STRIDE, count * STRIDE + STRIDE);
        continue;
      }
      state[o + 6] = age;
      state[o + 3] *= damp;
      state[o + 4] = state[o + 4] * damp - gravity * dt;
      state[o + 5] *= damp;
      state[o] += state[o + 3] * dt;
      state[o + 1] += state[o + 4] * dt;
      state[o + 2] += state[o + 5] * dt;
      i += 1;
    }

    const drawn = Math.min(count, maxDraw);
    for (let i = 0; i < drawn; i += 1) {
      const o = i * STRIDE;
      const vx = state[o + 3];
      const vy = state[o + 4];
      const vz = state[o + 5];
      const speed = Math.hypot(vx, vy, vz) || 1e-5;
      const t = state[o + 6] / state[o + 7];
      const r = state[o + 8] * (1 - 0.5 * t * t);
      const long = Math.min(4, 1 + (speed * stretch) / (2 * r));
      const ax = vx / speed;
      const ay = vy / speed;
      const az = vz / speed;
      // Motion stretch: the sphere's local Y follows the velocity, any perpendicular pair completes the basis.
      const hz = Math.abs(az) < 0.9 ? 1 : 0;
      const hx = hz === 1 ? 0 : 1;
      let px = ay * hz;
      let py = az * hx - ax * hz;
      let pz = -ay * hx;
      const plen = Math.hypot(px, py, pz) || 1;
      px /= plen;
      py /= plen;
      pz /= plen;
      const qx = ay * pz - az * py;
      const qy = az * px - ax * pz;
      const qz = ax * py - ay * px;
      const k = i * 16;
      m[k] = px * r;
      m[k + 1] = py * r;
      m[k + 2] = pz * r;
      m[k + 3] = 0;
      m[k + 4] = ax * r * long;
      m[k + 5] = ay * r * long;
      m[k + 6] = az * r * long;
      m[k + 7] = 0;
      m[k + 8] = qx * r;
      m[k + 9] = qy * r;
      m[k + 10] = qz * r;
      m[k + 11] = 0;
      m[k + 12] = state[o];
      m[k + 13] = state[o + 1];
      m[k + 14] = state[o + 2];
      m[k + 15] = 1;
    }
    mesh.count = drawn;
    mesh.instanceMatrix.clearUpdateRanges();
    if (drawn > 0) mesh.instanceMatrix.addUpdateRange(0, drawn * 16);
    mesh.instanceMatrix.needsUpdate = true;
    mesh.visible = drawn > 0;
    return drawn;
  };

  return {
    object: mesh,
    material,
    emit,
    update,
    count: () => count,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
};
