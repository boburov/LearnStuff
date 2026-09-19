import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, LatheGeometry, Vector3 } from "three";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";
import { arc, toVectors } from "../kit/vessel";
import { DEVICE_PRIORITY, useDevice } from "../kit/deviceState";
import { pieceAsset, pieceMaterialFor, pieceSpec } from "../kit/pieceAssets";
import { createPieceUniforms, patchPieceMaterial } from "../kit/solidShading";
import { Flame, Smoke, Sparks } from "../../effects";

// Stainless crucible tongs, 230 mm: 6 × 3 mm flat bar, rivet 77 mm from the tips, bows for a Ø40 mm crucible.
const MM = 0.001;
const BAR = { half: 3, thick: 1.5 };
const RING = 16;
const EXPONENT = 0.34;
const CENTER_U = -38;

// Lower arm centerline in plan (u along the tongs toward the jaws, v across), slightly open; the upper arm mirrors it.
const ARM = [
  [-153, 17.5], [-146, 15.6], [-136, 13.6], [-120, 11.7], [-95, 9.8], [-70, 8], [-45, 6], [-25, 3.9], [-12, 1.9],
  [0, 0], [9, -1.9], [16, -4.8], [21.5, -9.4], [26, -14.45], [34.25, -22.7], [45.5, -25.7], [56.75, -22.7],
  [65, -14.45], [67.7, -7.6], [71.8, -5.9], [76.5, -5.4],
];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const roundEnd = (distance, radius) =>
  distance >= radius ? Infinity : radius * Math.sqrt(Math.max(0, 1 - ((radius - distance) / radius) ** 2));

// The upper arm rides on the lower one around the rivet and is cranked down to the bench beyond the overlap.
const crank = (u) => (smoothstep(-42, -24, u) - smoothstep(12, 27, u)) * (BAR.thick * 2 + 0.05);

const END_R = BAR.half + 0.8;
const TIP_R = BAR.half - 0.7;

const stationsFor = (plan, lift) => {
  const curve = new CatmullRomCurve3(plan.map(([u, v]) => new Vector3(u, 0, v)), false, "centripetal");
  const length = curve.getLength();
  const cap = (radius) => Array.from({ length: 7 }, (_, j) => radius * (1 - Math.cos((j / 7) * (Math.PI / 2))));
  const middle = Math.round((length - END_R - TIP_R) / 0.5);
  const distances = [
    ...cap(END_R),
    ...Array.from({ length: middle + 1 }, (_, i) => END_R + ((length - END_R - TIP_R) * i) / middle),
    ...cap(TIP_R).reverse().map((d) => length - d),
  ];
  const all = distances.map((s) => {
    const p = curve.getPointAt(Math.min(1, s / length));
    const flare = 0.8 * smoothstep(26, 0, s);
    const boss = 1.0 * (1 - smoothstep(5, 12, Math.hypot(p.x, p.z)));
    const slim = 0.7 * smoothstep(length - 12, length, s);
    const w = Math.min(BAR.half + flare + boss - slim, roundEnd(s, END_R), roundEnd(length - s, TIP_R));
    return { p: new Vector3(p.x, BAR.thick + lift(p.x), p.z), s, w: Math.max(w, 0.02) };
  });
  const kept = [all[0]];
  let lastIndex = 0;
  for (let i = 1; i < all.length - 1; i += 1) {
    const last = all[lastIndex];
    const lastDir = all[lastIndex + 1].p.clone().sub(last.p).normalize();
    const dir = all[i + 1].p.clone().sub(all[i].p).normalize();
    const turned = lastDir.angleTo(dir) > 0.035;
    const changed = Math.abs(all[i].w - last.w) > 0.06 || Math.abs(all[i].p.y - last.p.y) > 0.1;
    const ends = all[i].s < END_R || all[i].s > length - TIP_R;
    if (turned || changed || ends || all[i].s - last.s > 9) {
      kept.push(all[i]);
      lastIndex = i;
    }
  }
  kept.push(all[all.length - 1]);
  return kept;
};

const loft = (stations) => {
  const positions = [];
  const up = new Vector3();
  const side = new Vector3();
  const tangent = new Vector3();
  const Y = new Vector3(0, 1, 0);
  stations.forEach((station, i) => {
    const prev = stations[Math.max(0, i - 1)].p;
    const next = stations[Math.min(stations.length - 1, i + 1)].p;
    tangent.subVectors(next, prev).normalize();
    side.crossVectors(tangent, Y).normalize();
    up.crossVectors(side, tangent).normalize();
    for (let k = 0; k < RING; k += 1) {
      const a = (k / RING) * Math.PI * 2;
      const u = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** EXPONENT * station.w;
      const v = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** EXPONENT * BAR.thick;
      positions.push(
        station.p.x + side.x * u + up.x * v,
        station.p.y + side.y * u + up.y * v,
        station.p.z + side.z * u + up.z * v,
      );
    }
  });
  const index = [];
  const count = stations.length;
  for (let i = 0; i < count - 1; i += 1) {
    for (let k = 0; k < RING; k += 1) {
      const a = i * RING + k;
      const d = i * RING + ((k + 1) % RING);
      index.push(a, a + RING, d, a + RING, d + RING, d);
    }
  }
  const caps = positions.length / 3;
  positions.push(...stations[0].p.toArray(), ...stations[count - 1].p.toArray());
  for (let k = 0; k < RING; k += 1) {
    const k1 = (k + 1) % RING;
    index.push(caps, k, k1, caps + 1, (count - 1) * RING + k1, (count - 1) * RING + k);
  }
  return { positions, index };
};

const buildArms = () => {
  const lower = loft(stationsFor(ARM, () => 0));
  const upper = loft(stationsFor(ARM.map(([u, v]) => [u, -v]), crank));
  const offset = lower.positions.length / 3;
  const positions = [...lower.positions, ...upper.positions].map((value, i) =>
    (i % 3 === 0 ? value - CENTER_U : value) * MM,
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex([...lower.index, ...upper.index.map((i) => i + offset)]);
  geometry.computeVertexNormals();
  return geometry;
};

const buildRivet = () => {
  const top = BAR.thick * 4 + 0.05;
  const profile = [
    [0, 0.2],
    [2.2, 0.2],
    [2.2, top - 0.1],
    [3.45, top],
    ...arc(3.45, top + 0.28, 0.28, -Math.PI / 2, 0, 3).slice(1),
    ...Array.from({ length: 7 }, (_, i) => {
      const a = ((i + 1) / 7) * (Math.PI / 2);
      return [3.73 * Math.cos(a), top + 0.28 + 1.0 * Math.sin(a)];
    }),
  ];
  const geometry = new LatheGeometry(toVectors(profile.map(([r, y]) => [r * MM, y * MM])), 24);
  geometry.translate(-CENTER_U * MM, 0, 0);
  return geometry;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  assets = {
    arms: buildArms(),
    rivet: buildRivet(),
    pivot: [-CENTER_U * MM, BAR.thick * 4 * MM, 0],
    gripCenter: [(45.5 - CENTER_U) * MM, BAR.thick * MM, 0],
    jawTips: [(76.5 - CENTER_U) * MM, BAR.thick * MM, 0],
  };
  return assets;
};

const FLAME_RADIUS = 0.005;
const ORIGIN = [0, 0, 0];

// The gripped piece and how hot it is, refreshed once per frame from the device.
const createHeldState = () => {
  const glow = { value: 0 };
  const flame = { kind: "magnesium", intensity: 0 };
  const smoke = { rate: 0, color: "#f5f5f5", toxic: false };
  const sparks = { intensity: 0 };
  return {
    getFlame: () => (flame.intensity > 0.01 ? flame : null),
    getSmoke: () => (smoke.rate > 0.01 ? smoke : null),
    getSparks: () => (sparks.intensity > 0.01 ? sparks : null),
    update: (piece, dt, uniforms) => {
      const state = piece?.state ?? {};
      const step = 1 - Math.exp(-Math.min(dt, 0.1) / 0.25);
      const heat = state.burning ? 3 : state.molten ? 1.6 : state.hot ? 1 : 0;
      glow.value += (heat - glow.value) * step;
      uniforms.uGlow.value = glow.value;
      uniforms.uGlowColor.value.set(state.burning ? "#fff3d8" : "#ff5a1f");
      uniforms.uMolten.value += ((state.molten ? 1 : 0) - uniforms.uMolten.value) * step;
      flame.kind = piece?.species === "Mg" ? "magnesium" : piece?.species === "S" ? "sulfur" : "lamp";
      flame.intensity += ((state.burning ? 1 : 0) - flame.intensity) * step;
      smoke.rate = flame.intensity * (piece?.species === "Mg" ? 1 : 0.4);
      sparks.intensity = flame.intensity * (piece?.species === "Mg" ? 0.6 : 0.2);
    },
  };
};

const CrucibleTongs = ({ simId, piece = null, ...props }) => {
  const kit = useKit();
  const { arms, rivet, jawTips } = getAssets();
  const { device } = useDevice(simId);
  const held = device ? device.piece : piece;
  const species = held?.species;
  const shape = held?.shape;
  const color = held?.color;
  const spec = species ? pieceSpec(species, shape) : null;
  const asset = spec ? pieceAsset(spec.shape, 4) : null;
  const uniforms = useMemo(() => createPieceUniforms(), []);
  const material = useMemo(
    () => (spec && color ? patchPieceMaterial(pieceMaterialFor(spec, color).clone(), uniforms, kit.quality) : null),
    [spec, color, uniforms, kit.quality],
  );
  useEffect(() => () => material?.dispose(), [material]);
  const live = useMemo(() => createHeldState(), []);
  useFrame((_, delta) => live.update(held, delta, uniforms), DEVICE_PRIORITY);

  const size = spec ? Math.cbrt(Math.max(1e-5, held.grams) / spec.density / 1e6 / spec.unitVolume) : 0;
  const tip = [jawTips[0] + size * 0.22, jawTips[1], jawTips[2]];

  return (
    <group {...props}>
      <mesh geometry={arms} material={kit.steel} castShadow />
      <mesh geometry={rivet} material={kit.steel} castShadow />
      {asset && material && (
        <mesh geometry={asset.geometry} material={material} position={tip} rotation={[0, 0, spec.shape === "ribbon" ? 0.25 : 0]} scale={size} castShadow />
      )}
      <group position={[tip[0] + size * 0.4, tip[1], tip[2]]}>
        <Flame origin={ORIGIN} radius={FLAME_RADIUS} get={live.getFlame} />
        <Smoke origin={ORIGIN} radius={FLAME_RADIUS} get={live.getSmoke} />
        <Sparks origin={ORIGIN} get={live.getSparks} />
      </group>
      <group scale-x={3.6}>
        <BlobShadow radius={0.032} opacity={0.16} />
      </group>
    </group>
  );
};

export default CrucibleTongs;
