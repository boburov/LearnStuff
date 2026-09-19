import { DynamicDrawUsage, InstancedMesh, TorusGeometry } from "three";
import { createLiquidMaterial } from "../equipment/kit/materials";

const STRIDE = 5;

// Expanding surface rings: thin glossy tori that catch the room reflection like a real ripple.
export const createRipples = ({ capacity, quality, color = "#0d2230", opacity = 0.14 }) => {
  const geometry = new TorusGeometry(1, 0.045, 4, quality === "low" ? 12 : 22);
  geometry.rotateX(Math.PI / 2);
  const material = createLiquidMaterial({ color, opacity });
  const mesh = new InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.count = 0;
  mesh.visible = false;

  const state = new Float32Array(capacity * STRIDE);
  const m = mesh.instanceMatrix.array;
  let count = 0;

  // grow: metres of radius per second.
  const spawn = (x, y, z, grow) => {
    if (count >= capacity) return;
    const o = count * STRIDE;
    state[o] = x;
    state[o + 1] = y;
    state[o + 2] = z;
    state[o + 3] = 0;
    state[o + 4] = grow;
    count += 1;
  };

  const update = (dt, { life = 0.6, start = 0.002, maxDraw = capacity }) => {
    for (let i = 0; i < count; ) {
      const o = i * STRIDE;
      state[o + 3] += dt;
      if (state[o + 3] >= life) {
        count -= 1;
        if (i !== count) state.copyWithin(o, count * STRIDE, count * STRIDE + STRIDE);
        continue;
      }
      i += 1;
    }
    const drawn = Math.min(count, maxDraw);
    for (let i = 0; i < drawn; i += 1) {
      const o = i * STRIDE;
      const t = state[o + 3] / life;
      const r = start + state[o + 4] * state[o + 3];
      const thin = (1 - t) * 0.35;
      const k = i * 16;
      m[k] = r;
      m[k + 1] = 0;
      m[k + 2] = 0;
      m[k + 3] = 0;
      m[k + 4] = 0;
      m[k + 5] = r * thin;
      m[k + 6] = 0;
      m[k + 7] = 0;
      m[k + 8] = 0;
      m[k + 9] = 0;
      m[k + 10] = r;
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
    spawn,
    update,
    count: () => count,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
    },
  };
};
