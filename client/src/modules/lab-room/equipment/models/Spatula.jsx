import { useEffect, useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute, SphereGeometry } from "three";
import { useKit } from "../kit/kitContext";
import { useDevice } from "../kit/deviceState";
import { createGrainMaterial, disposeMaterial } from "../../substances/templates/containerMaterials";

// Stainless spoon-spatula, 180 mm: a Ø3 mm rod pressed into a 9 × 14 mm spoon and a bent 8 × 30 mm blade.
const MM = 0.001;
const SHAFT_R = 1.5;
const SPOON = { center: -82.8, halfLength: 7.2, halfWidth: 4.5, depth: 2.1, plate: 0.34 };
const BLADE = { bendStart: 57, bendLength: 6, angle: 0.075, halfWidth: 4, plate: 0.4, tipPlate: 0.3 };
const RING = 32;
const POLISHED_UNTIL = -77.5;

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const smoothMax = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + (h * h * k) / 4;
};

const bladeDrop = (x) => {
  const { bendStart, bendLength, angle } = BLADE;
  const d = x - bendStart;
  if (d <= 0) return 0;
  const slope = Math.tan(angle);
  return d < bendLength ? (d * d * slope) / (2 * bendLength) : (bendLength / 2 + d - bendLength) * slope;
};

// Cross-section at x (mm): half width w, half thickness h, superellipse exponent e, bowl depth cup.
const section = (x) => {
  const { center, halfLength, halfWidth, depth, plate } = SPOON;
  if (x < 0) {
    const t = (x - center) / halfLength;
    const oval = halfWidth * Math.sqrt(Math.max(0, 1 - t * t));
    const round = smoothstep(-80, -74.5, x);
    return {
      y: 0,
      w: x <= center ? oval : smoothMax(oval, SHAFT_R, 1),
      h: mix(plate, SHAFT_R, round),
      e: mix(0.42, 1, round),
      cup: depth * Math.pow(Math.max(0, 1 - t * t), 0.75) * (1 - smoothstep(-80, -75, x)),
    };
  }
  const flat = smoothstep(51, 61, x);
  const end = 90 - BLADE.halfWidth;
  const rounded = x > end ? BLADE.halfWidth * Math.sqrt(Math.max(0, 1 - ((x - end) / BLADE.halfWidth) ** 2)) : Infinity;
  const plateHalf = mix(BLADE.plate, BLADE.tipPlate, smoothstep(62, 90, x));
  return {
    y: -bladeDrop(x),
    w: Math.min(mix(SHAFT_R, BLADE.halfWidth, smoothstep(52, 63, x)), rounded),
    h: mix(SHAFT_R, plateHalf, flat),
    e: mix(1, 0.42, flat),
    cup: 0,
  };
};

const sampleX = () => {
  const spans = [
    [-90, -88.5, 0.25],
    [-88.5, -72, 0.5],
    [-72, 50, 8],
    [50, 64, 0.8],
    [64, 86, 2],
    [86, 90, 0.3],
  ];
  const xs = [];
  for (const [a, b, step] of spans) {
    const n = Math.max(1, Math.round((b - a) / step));
    for (let i = 0; i < n; i += 1) xs.push(a + ((b - a) * i) / n);
  }
  xs.push(90);
  return xs;
};

const buildSpatula = () => {
  const xs = sampleX();
  const sections = xs.map(section);
  const positions = [];
  xs.forEach((x, i) => {
    const prev = Math.max(0, i - 1);
    const next = Math.min(xs.length - 1, i + 1);
    const dx = xs[next] - xs[prev];
    const dy = sections[next].y - sections[prev].y;
    const len = Math.hypot(dx, dy);
    const [ux, uy] = [-dy / len, dx / len];
    const { y, w, h, e, cup } = sections[i];
    for (let k = 0; k < RING; k += 1) {
      const a = (k / RING) * Math.PI * 2;
      const u = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** e;
      const v = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** e;
      const lift = v * h - cup * (1 - u * u);
      positions.push(x + ux * lift, y + uy * lift, u * w);
    }
  });

  const index = [];
  const polished = [];
  const count = xs.length;
  for (let i = 0; i < count - 1; i += 1) {
    const target = xs[i] < POLISHED_UNTIL ? polished : index;
    for (let k = 0; k < RING; k += 1) {
      const a = i * RING + k;
      const b = a + RING;
      const c = (i + 1) * RING + ((k + 1) % RING);
      const d = i * RING + ((k + 1) % RING);
      target.push(a, b, d, b, c, d);
    }
  }
  const start = positions.length / 3;
  positions.push(xs[0], 0, 0, xs[count - 1], sections[count - 1].y, 0);
  for (let k = 0; k < RING; k += 1) {
    const k1 = (k + 1) % RING;
    polished.push(start, k, k1);
    index.push(start + 1, (count - 1) * RING + k1, (count - 1) * RING + k);
  }

  // Rest on the spoon bowl and the bent blade tip: rotate about Z until both ends touch.
  const lowest = (angle, side) => {
    let min = Infinity;
    for (let i = 0; i < positions.length; i += 3) {
      if (Math.sign(positions[i]) !== side) continue;
      min = Math.min(min, positions[i] * Math.sin(angle) + positions[i + 1] * Math.cos(angle));
    }
    return min;
  };
  let lo = -0.08;
  let hi = 0.08;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (lowest(mid, -1) < lowest(mid, 1)) hi = mid;
    else lo = mid;
  }
  const tilt = (lo + hi) / 2;
  const floor = Math.min(lowest(tilt, -1), lowest(tilt, 1));
  const [s, c] = [Math.sin(tilt), Math.cos(tilt)];
  for (let i = 0; i < positions.length; i += 3) {
    const [x, y] = [positions[i], positions[i + 1]];
    positions[i] = (x * c - y * s) * MM;
    positions[i + 1] = (x * s + y * c - floor) * MM;
    positions[i + 2] *= MM;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex([...polished, ...index]);
  geometry.addGroup(0, polished.length, 0);
  geometry.addGroup(polished.length, index.length, 1);
  geometry.computeVertexNormals();
  // Where a scoop of powder sits, in the same rotated frame as the finished mesh.
  const bx = SPOON.center;
  geometry.userData.bowl = [bx * c * MM, (bx * s - floor) * MM + 0.0006, 0];
  return geometry;
};

// Heaped scoop sitting in the spoon bowl; one unit is 1 cm³ of loose powder.
const buildHeap = () => {
  const dome = new SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = dome.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const [x, y, z] = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const lumps = Math.sin(x * 9 + z * 6) * 0.06 + Math.sin(x * 21 - z * 17) * 0.035;
    pos.setXYZ(i, x * (1.35 + lumps), y * (0.52 + lumps * 0.5), z * (0.95 + lumps));
  }
  dome.computeVertexNormals();
  return dome;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const spatula = buildSpatula();
  assets = { spatula, heap: buildHeap(), bowl: spatula.userData.bowl };
  return assets;
};

// Loose powder is about 1.2 g/cm³ and the heap geometry holds ~1.4 unit³.
const heapScale = (grams) => Math.cbrt(Math.max(0.03, grams) / 1.2e6 / 1.4);

const Spatula = ({ simId, load = null, ...props }) => {
  const kit = useKit();
  const { spatula, heap, bowl } = getAssets();
  const { device } = useDevice(simId);
  const scoop = device ? device.load : load;
  const color = scoop?.color;
  const grain = scoop?.grain ?? "fine";
  const powder = useMemo(() => (color ? createGrainMaterial({ color, grain, seed: 5 }) : null), [color, grain]);
  useEffect(() => () => disposeMaterial(powder), [powder]);

  return (
    <group {...props}>
      <mesh geometry={spatula} material={[kit.chrome, kit.steel]} castShadow />
      {scoop && powder && (
        <mesh geometry={heap} material={powder} position={bowl} scale={heapScale(scoop.grams)} castShadow />
      )}
    </group>
  );
};

export default Spatula;
