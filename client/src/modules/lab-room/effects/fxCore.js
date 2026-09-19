import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferAttribute,
  Color,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
} from "three";
import { useLab } from "../sim/labContext";

// After the lab runner (0.55) and the held-item pose (0.6), before the composer renders (1).
export const FX_PRIORITY = 0.7;
const MAX_DT = 1 / 20;
const BUDGET = { high: 3000, low: 800 };

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const approach = (current, target, dt, tau) => target + (current - target) * Math.exp(-dt / tau);
export const rand = (lo, hi) => lo + Math.random() * (hi - lo);

// Hex strings are parsed only when they change, so smoothing a colour allocates nothing per frame.
export const createColorTracker = (initial = "#ffffff") => {
  const target = new Color(initial);
  const current = target.clone();
  let hex = initial;
  return {
    current,
    update: (value, dt, tau) => {
      if (typeof value === "string" && value !== hex) {
        hex = value;
        target.set(value);
      }
      current.lerp(target, 1 - Math.exp(-dt / tau));
      return current;
    },
    snap: () => current.copy(target),
  };
};

// Shared per-renderer particle budget; resets when the frame clock moves on.
const budgets = new WeakMap();
export const frameBudget = (state, quality) => {
  let budget = budgets.get(state.gl);
  if (!budget) {
    budget = { stamp: -1, used: 0, limit: 0 };
    budgets.set(state.gl, budget);
  }
  if (budget.stamp !== state.clock.elapsedTime) {
    budget.stamp = state.clock.elapsedTime;
    if (import.meta.env.DEV) window.__fxParticles = budget.used;
    budget.used = 0;
  }
  budget.limit = BUDGET[quality] ?? BUDGET.low;
  return budget;
};

export const budgetRoom = (budget) => Math.max(0, budget.limit - budget.used);

// Mounts an imperative effect system under a group and drives it once per frame; `create` must be memoised.
export const useFxSystem = (create, frame) => {
  const groupRef = useRef(null);
  const systemRef = useRef(null);
  const lab = useLab();

  useEffect(() => {
    const group = groupRef.current;
    const system = create();
    group.add(system.object);
    systemRef.current = system;
    return () => {
      group.remove(system.object);
      system.dispose();
      systemRef.current = null;
    };
  }, [create]);

  useFrame((state, delta) => {
    const system = systemRef.current;
    if (!system) return;
    frame(system, { state, dt: Math.min(delta, MAX_DT), reduceMotion: Boolean(lab?.prefs?.reduceMotion) });
  }, FX_PRIORITY);

  return groupRef;
};

// A camera-facing quad per instance; attributes are [name, itemSize] pairs sized for `capacity`.
export const createQuadInstances = (capacity, attributes) => {
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  // Lit materials switch to flat shading (no vNormal) when a geometry has no normals.
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  for (const [name, size] of attributes) {
    const attribute = new InstancedBufferAttribute(new Float32Array(capacity * size), size);
    attribute.setUsage(DynamicDrawUsage);
    geometry.setAttribute(name, attribute);
  }
  geometry.instanceCount = 0;
  return geometry;
};

export const markInstances = (attribute, count) => {
  attribute.clearUpdateRanges();
  if (count <= 0) return;
  attribute.addUpdateRange(0, count * attribute.itemSize);
  attribute.needsUpdate = true;
};

// Accepts [[r, y], …] (kit vessels) or Vector2 (x = r); returns an O(1) radius lookup over the profile height.
export const createProfile = (points) => {
  const n = points?.length ?? 0;
  if (n < 2) return null;
  const rs = new Float32Array(n);
  const ys = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const p = points[i];
    rs[i] = p.x ?? p[0];
    ys[i] = p.y ?? p[1];
  }
  const floor = ys[0];
  const top = ys[n - 1];
  const samples = 96;
  const table = new Float32Array(samples + 1);
  const exact = (y) => {
    for (let i = 1; i < n; i += 1) {
      if (y >= ys[i - 1] && y <= ys[i]) {
        const span = ys[i] - ys[i - 1];
        return span < 1e-7 ? rs[i] : rs[i - 1] + ((rs[i] - rs[i - 1]) * (y - ys[i - 1])) / span;
      }
    }
    return y < floor ? 0 : rs[n - 1];
  };
  for (let i = 0; i <= samples; i += 1) table[i] = exact(floor + ((top - floor) * i) / samples + 1e-6);
  const radiusAt = (y) => {
    if (y <= floor) return 0;
    if (y >= top) return table[samples];
    const f = ((y - floor) / (top - floor)) * samples;
    const i = Math.floor(f);
    return table[i] + (table[Math.min(samples, i + 1)] - table[i]) * (f - i);
  };
  return { floor, top, radiusAt, source: points };
};
