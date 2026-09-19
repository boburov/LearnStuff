import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Group, Mesh, Vector3 } from "three";
import { createLiquidMaterial } from "../equipment/kit/materials";
import { createDroplets } from "./fxDroplets";
import { createRipples } from "./fxRipples";
import { approach, budgetRoom, clamp, createColorTracker, frameBudget, lerp, rand } from "./fxCore";

const G = 9.81;
const _from = new Vector3();
const _to = new Vector3();
const _dir = new Vector3();

const buildTube = (along, around) => {
  const geometry = new BufferGeometry();
  const vertices = (along + 1) * (around + 1);
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(vertices * 3), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(vertices * 3), 3));
  const index = [];
  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < around; j += 1) {
      const a = i * (around + 1) + j;
      const b = a + around + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  geometry.setIndex(index);
  geometry.attributes.position.setUsage(DynamicDrawUsage);
  geometry.attributes.normal.setUsage(DynamicDrawUsage);
  geometry.boundingSphere = null;
  return geometry;
};

// A falling liquid stream: parabola from the lip to the target, thinning as it speeds up, with a splash.
export const createStream = ({ quality }) => {
  const low = quality === "low";
  const along = low ? 18 : 34;
  const around = low ? 6 : 10;
  const geometry = buildTube(along, around);
  const material = createLiquidMaterial({ color: "#0d2230", opacity: 0.12 });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = false;

  const drops = createDroplets({ capacity: low ? 18 : 44, quality, color: "#0d2230", opacity: 0.25 });
  const ripples = createRipples({ capacity: low ? 5 : 10, quality });
  const object = new Group();
  object.add(mesh, drops.object, ripples.object);

  const tint = createColorTracker("#0d2230");
  const position = geometry.attributes.position.array;
  const normal = geometry.attributes.normal.array;
  const seed = Math.random() * 100;
  const dropEnv = { gravity: G, drag: 0.4, floor: -0.004, stretch: 0.014, maxDraw: 0 };
  const rippleEnv = { life: 0.7, start: 0.003, maxDraw: 0 };
  let rate = 0;
  let time = 0;
  let dropCarry = 0;
  let rippleCarry = 0;

  const update = (frame, params) => {
    const { state, dt } = frame;
    time += dt;
    rate = approach(rate, params ? clamp(params.rate ?? 1, 0, 1) : 0, dt, 0.12);
    const budget = frameBudget(state, quality);
    if (!params || rate < 0.012) {
      mesh.visible = false;
      dropEnv.maxDraw = budgetRoom(budget);
      budget.used += drops.update(dt, dropEnv);
      rippleEnv.maxDraw = budgetRoom(budget);
      budget.used += ripples.update(dt, rippleEnv);
      return;
    }

    _from.copy(params.from);
    _to.copy(params.to);
    object.position.copy(_to);
    const color = tint.update(params.color, dt, 0.3);
    material.color.copy(color);
    material.opacity = Math.max(0.09, params.opacity ?? 0.1);
    drops.material.color.copy(color);
    drops.material.opacity = material.opacity * 1.6;

    _dir.copy(_to).sub(_from);
    const drop = Math.max(0.004, _from.y - _to.y);
    const span = Math.hypot(_dir.x, _dir.z);
    const fall = Math.sqrt((2 * drop) / G);
    const speed0 = clamp(span / fall, 0.04, 1.4);
    const dirX = span > 1e-5 ? _dir.x / span : 0;
    const dirZ = span > 1e-5 ? _dir.z / span : 0;
    const r0 = lerp(0.0011, 0.0042, rate ** 0.7);
    const wobbleAmp = 0.0007 * (0.4 + rate);
    // The curve stays in one vertical plane, so a horizontal binormal keeps the frame stable.
    const flat = span < 1e-5;
    const bx = flat ? 1 : -dirZ;
    const bz = flat ? 0 : dirX;

    for (let i = 0; i <= along; i += 1) {
      const u = i / along;
      const t = u * fall;
      // Geometry is written relative to the target point, which is where the group sits.
      const px = dirX * span * (u - 1);
      const pz = dirZ * span * (u - 1);
      const py = drop * (1 - u * u);
      const speed = Math.hypot(speed0, G * t);
      let radius = r0 * Math.sqrt(speed0 / speed);
      // Surface waves grow downstream; at a dribble they pinch the stream into beads.
      radius *= 1 + (0.1 + 0.55 * (1 - rate)) * u * Math.sin(u * 26 - time * 22 + seed);
      radius = Math.max(0.00025, radius);
      const wob = wobbleAmp * u * u * Math.sin(u * 13 - time * 9 + seed * 1.7);
      const ty = -2 * drop * u;
      const tl = Math.hypot(span, ty) || 1;
      const nx = flat ? 0 : (ty * dirX) / tl;
      const ny = flat ? 0 : -span / tl;
      const nz = flat ? 1 : (ty * dirZ) / tl;
      for (let j = 0; j <= around; j += 1) {
        const a = (j / around) * Math.PI * 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const ox = bx * ca + nx * sa;
        const oy = ny * sa;
        const oz = bz * ca + nz * sa;
        const k = (i * (around + 1) + j) * 3;
        position[k] = px + ox * radius + bx * wob;
        position[k + 1] = py + oy * radius;
        position[k + 2] = pz + oz * radius + bz * wob;
        normal[k] = ox;
        normal[k + 1] = oy;
        normal[k + 2] = oz;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    mesh.visible = true;

    dropCarry += (low ? 12 : 30) * rate * dt;
    while (dropCarry >= 1) {
      dropCarry -= 1;
      if (drops.count() >= budgetRoom(budget)) break;
      const a = Math.random() * Math.PI * 2;
      const out = rand(0.05, 0.35) * (0.4 + rate);
      drops.emit(Math.cos(a) * r0, 0.0015, Math.sin(a) * r0, Math.cos(a) * out, rand(0.15, 0.7), Math.sin(a) * out, rand(0.0003, 0.0009), rand(0.25, 0.6));
    }
    rippleCarry += (4 + 6 * rate) * dt;
    while (rippleCarry >= 1) {
      rippleCarry -= 1;
      ripples.spawn(rand(-r0, r0), 0.0004, rand(-r0, r0), 0.035 + 0.05 * rate);
    }
    dropEnv.maxDraw = budgetRoom(budget);
    budget.used += drops.update(dt, dropEnv);
    rippleEnv.maxDraw = budgetRoom(budget);
    budget.used += ripples.update(dt, rippleEnv);
  };

  return {
    object,
    update,
    dispose: () => {
      geometry.dispose();
      material.dispose();
      drops.dispose();
      ripples.dispose();
    },
  };
};
