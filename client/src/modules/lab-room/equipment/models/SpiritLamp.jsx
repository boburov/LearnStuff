import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  CatmullRomCurve3,
  CylinderGeometry,
  LatheGeometry,
  MeshStandardMaterial,
  SRGBColorSpace,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { useKit } from "../kit/kitContext";
import GlassVessel from "../kit/GlassVessel";
import Contents from "../kit/Contents";
import { DEVICE_PRIORITY, useDevice, stepValue } from "../kit/deviceState";
import { LampFlame } from "../../effects";
import BlobShadow from "../kit/BlobShadow";
import { arc, buildVessel, toVectors } from "../kit/vessel";

// Pressed-glass school spirit lamp: Ø75 mm body, Ø28 mm neck, nickel-plated screw collar, cotton wick, glass cap.
const R = 0.0375;
const NECK_R = 0.014;
const NECK_TOP = 0.071;
const SHOULDER = NECK_R + 0.0035;
const FILLET = 0.008;
const SKIRT_IN = NECK_R + 0.0003;
const SKIRT_R = 0.0159;
const SKIRT_BOTTOM = 0.0622;
const COLLAR_SHOULDER = 0.0735;
const CROWN_R = 0.0133;
const CROWN_TOP = 0.0775;
const TUBE_R = 0.0035;
const TUBE_WALL = 0.0006;
const TUBE_BOTTOM = 0.046;
const TUBE_TOP = 0.082;
const WICK_R = 0.0024;
const WICK_BASE = TUBE_TOP - 0.004;
const WICK_TOP = 0.0905;
const CAP_R = 0.016;
const CAP_H = 0.04;
const ALCOHOL_COLOR = "#121a1e";
const SEAM = Math.PI;

const ellipse = (cr, cy, a, b, from, to, steps) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / steps;
    return [cr + a * Math.cos(t), cy + b * Math.sin(t)];
  });

const BODY_OUTLINE = [
  [0, 0],
  ...arc(R - FILLET, FILLET, FILLET, -Math.PI / 2, 0, 6),
  [R + 0.0003, 0.018],
  ...ellipse(SHOULDER, 0.029, R - SHOULDER, 0.0275, 0, Math.PI / 2, 8),
  ...arc(SHOULDER, 0.06, 0.0035, -Math.PI / 2, -Math.PI, 3).slice(1),
  [NECK_R, NECK_TOP],
];

// Cap is modelled as an upright cup (dome at y = 0) and flipped when it sits on the collar.
const CAP_OUTLINE = [
  [0, 0],
  ...ellipse(0.0035, 0.0125, CAP_R - 0.0035, 0.0125, -Math.PI / 2, 0, 7),
  [CAP_R, CAP_H - 0.004],
  [CAP_R + 0.0003, CAP_H],
];

const COLLAR_PROFILE = [
  [SKIRT_IN, SKIRT_BOTTOM + 0.0004],
  [SKIRT_IN + 0.0004, SKIRT_BOTTOM],
  [SKIRT_R, SKIRT_BOTTOM],
  ...arc(SKIRT_R, SKIRT_BOTTOM + 0.0007, 0.0007, -Math.PI / 2, Math.PI / 2, 3).slice(1),
  [SKIRT_R - 0.0004, SKIRT_BOTTOM + 0.0016],
  [SKIRT_R - 0.0004, COLLAR_SHOULDER - 0.0016],
  ...arc(SKIRT_R - 0.0002, COLLAR_SHOULDER - 0.0008, 0.0008, -Math.PI / 2, Math.PI / 2, 3),
  [CROWN_R + 0.0005, COLLAR_SHOULDER],
  ...arc(CROWN_R + 0.0005, COLLAR_SHOULDER + 0.0005, 0.0005, -Math.PI / 2, -Math.PI, 2).slice(1),
  [CROWN_R, CROWN_TOP - 0.0009],
  ...arc(CROWN_R - 0.0009, CROWN_TOP - 0.0009, 0.0009, 0, Math.PI / 2, 3).slice(1),
  [TUBE_R + 0.0014, CROWN_TOP],
  [TUBE_R + 0.0008, CROWN_TOP + 0.0007],
  [TUBE_R, CROWN_TOP + 0.0007],
  [TUBE_R, NECK_TOP + 0.0002],
  [SKIRT_IN, NECK_TOP + 0.0002],
  [SKIRT_IN, SKIRT_BOTTOM + 0.0004],
];

const TUBE_PROFILE = [
  [TUBE_R - TUBE_WALL, TUBE_BOTTOM],
  [TUBE_R, TUBE_BOTTOM],
  [TUBE_R, TUBE_TOP - 0.0004],
  ...arc(TUBE_R - TUBE_WALL / 2, TUBE_TOP - 0.0004, TUBE_WALL / 2, 0, Math.PI, 4).slice(1),
  [TUBE_R - TUBE_WALL, TUBE_BOTTOM],
];

const hash = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Screw-cap ribs on the collar skirt; integer rib count keeps the lathe seam continuous.
const buildKnurl = (radius, y0, y1, ribs) => {
  const geometry = new CylinderGeometry(radius, radius, y1 - y0, ribs * 4, 1, true, SEAM);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const k = 0.5 + 0.5 * Math.cos(Math.atan2(x, z) * ribs);
    const scale = (radius - 0.0002 + 0.0005 * k) / radius;
    pos.setXYZ(i, x * scale, pos.getY(i), z * scale);
  }
  geometry.translate(0, (y0 + y1) / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
};

const setUv = (geometry, fn) => {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) {
    const [u, v] = fn(uv.getX(i), uv.getY(i));
    uv.setXY(i, u, v);
  }
};

// Exposed braided wick with a frayed, burnt crown plus the length that hangs into the alcohol.
const buildWick = () => {
  const height = WICK_TOP - WICK_BASE;
  const top = new CylinderGeometry(WICK_R, WICK_R, height, 14, 7, false, SEAM);
  top.translate(0, WICK_BASE + height / 2, 0);
  const pos = top.attributes.position;
  const uv = top.attributes.uv;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y - WICK_BASE) / height;
    const fray = Math.max(0, (t - 0.7) / 0.3);
    const n = hash(Math.round(Math.atan2(x, z) * 1000) * 0.37 + Math.round(t * 7));
    const r = Math.hypot(x, z);
    const scale = 1 + fray * (0.1 + 0.16 * (n - 0.5));
    const lift = r < 1e-6 ? 0.0006 : fray * fray * (n - 0.5) * 0.0007;
    pos.setXYZ(i, x * scale, y + lift, z * scale);
    uv.setY(i, 0.45 + Math.min(1, t) * 0.55);
  }
  top.computeVertexNormals();

  const fibers = Array.from({ length: 13 }, (_, i) => {
    const angle = (i / 13) * Math.PI * 2 + hash(i) * 0.5;
    const length = 0.0008 + hash(i + 20) * 0.0013;
    const fiber = new CylinderGeometry(0.00006, 0.00018, length, 4, 1, true);
    fiber.translate(0, length / 2, 0);
    fiber.rotateZ(-(0.35 + hash(i + 40) * 0.9));
    fiber.rotateY(angle + Math.PI / 2);
    const rr = WICK_R * (0.75 + hash(i + 60) * 0.35);
    fiber.translate(Math.sin(angle) * rr, WICK_TOP - 0.0009 + hash(i + 80) * 0.0009, Math.cos(angle) * rr);
    setUv(fiber, (u) => [u, 0.985]);
    return fiber;
  });

  const points = [
    [0, WICK_BASE + 0.001, 0],
    [0, TUBE_BOTTOM + 0.004, 0],
    [0.0005, TUBE_BOTTOM - 0.008, 0.0004],
    [0.0035, 0.021, 0.002],
    [0.0095, 0.009, 0.0065],
    [0.018, 0.0056, 0.009],
    [0.0265, 0.0055, 0.004],
    [0.029, 0.0056, -0.006],
  ].map((p) => new Vector3(...p));
  const path = new CatmullRomCurve3(points, false, "centripetal");
  const hanging = new TubeGeometry(path, 56, WICK_R * 0.88, 8, false);
  setUv(hanging, (u, v) => [v, 0.05 + (1 - u) * 0.35]);
  const end = new SphereGeometry(WICK_R * 0.88, 8, 6);
  end.translate(...points[points.length - 1].toArray());
  setUv(end, (u, v) => [u, 0.05 + v * 0.02]);

  return mergeGeometries([top, ...fibers, hanging, end]);
};

const createWickTexture = () => {
  const w = 64;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#efe9dc";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(92,84,66,0.3)";
  ctx.fillRect(0, h * 0.58, w, h * 0.42);
  for (let i = 0; i < 90; i += 1) {
    const x = hash(i) * w;
    ctx.strokeStyle = `rgba(${hash(i + 3) > 0.5 ? "255,255,250" : "150,135,110"},${0.18 + hash(i + 7) * 0.2})`;
    ctx.lineWidth = 1 + hash(i + 9) * 2;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + (hash(i + 11) > 0.5 ? 18 : -18), 0);
    ctx.stroke();
  }
  // v = 1 is the burnt top of the wick.
  const burn = ctx.createLinearGradient(0, 0, 0, h * 0.2);
  burn.addColorStop(0, "rgba(14,11,9,1)");
  burn.addColorStop(0.28, "rgba(24,17,12,0.97)");
  burn.addColorStop(0.55, "rgba(70,48,28,0.8)");
  burn.addColorStop(0.8, "rgba(150,118,80,0.35)");
  burn.addColorStop(1, "rgba(200,180,150,0)");
  ctx.fillStyle = burn;
  ctx.fillRect(0, 0, w, h * 0.2);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

const createWickMaterial = () => new MeshStandardMaterial({ map: createWickTexture(), roughness: 1 });

const disposeMaterial = (material) => {
  material.map?.dispose();
  material.dispose();
};

const CAP_CLOSED = [0, COLLAR_SHOULDER, 0];
const CAP_ASIDE = [0.064, 0, 0.022];
const WICK_TIP = [0, WICK_TOP, 0];

// Cap lifts, turns over and settles beside the lamp; p = 0 is capped, 1 is off.
const poseCap = (group, p, capHeight) => {
  const ease = p * p * (3 - 2 * p);
  group.position.set(
    CAP_ASIDE[0] * ease,
    (CAP_CLOSED[1] + capHeight) * (1 - ease) + Math.sin(Math.PI * ease) * 0.045,
    CAP_ASIDE[2] * ease,
  );
  group.rotation.set(0, 0, Math.PI * (1 - ease));
};

// Lamp animation state: cap swing and flame strength, driven once per frame from the device.
const createLampState = (capOn, capHeight) => {
  const state = { open: capOn ? 0 : 1, flame: { intensity: 0, boost: 0, dousing: 0 } };
  return {
    getFlame: () => (state.flame.intensity > 0.004 ? state.flame : null),
    update: (device, dt, capGroup, fuelStep, setFuel) => {
      if (device) state.open += ((device.capOn ? 0 : 1) - state.open) * (1 - Math.exp(-dt / 0.18));
      if (capGroup) poseCap(capGroup, state.open, capHeight);
      const lit = device?.lit ? 1 : 0;
      state.flame.intensity += (lit - state.flame.intensity) * (1 - Math.exp(-dt / (lit ? 0.25 : 0.12)));
      state.flame.boost = device?.boost ?? 0;
      state.flame.dousing = device?.dousing ?? 0;
      const step = device ? stepValue(device.fuelMl ?? 0, 1) : fuelStep;
      if (step !== fuelStep) setFuel(step);
    },
  };
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const body = buildVessel({ outline: BODY_OUTLINE, wall: 0.0025, bottom: 0.0033, segments: 48 });
  const cap = buildVessel({ outline: CAP_OUTLINE, wall: 0.0018, bottom: 0.0024, segments: 40 });
  cap.outer.computeBoundingBox();
  assets = {
    body,
    cap,
    capHeight: cap.outer.boundingBox.max.y,
    collar: mergeGeometries([
      new LatheGeometry(toVectors(COLLAR_PROFILE), 40, SEAM, Math.PI * 2),
      buildKnurl(SKIRT_R, SKIRT_BOTTOM + 0.0013, COLLAR_SHOULDER - 0.0013, 36),
    ]),
    tube: new LatheGeometry(toVectors(TUBE_PROFILE), 20, SEAM, Math.PI * 2),
    wick: buildWick(),
    mouth: { innerProfile: body.innerProfile, mouthY: body.rimY, mouthR: NECK_R - 0.0025 },
  };
  return assets;
};

const SpiritLamp = ({ simId, volumeMl = 60, liquidColor = ALCOHOL_COLOR, liquidOpacity = 0.07, capOn = true, ...props }) => {
  const kit = useKit();
  const { body, cap, capHeight, collar, tube, wick, mouth } = getAssets();
  const wickMaterial = useMemo(() => createWickMaterial(), []);
  useEffect(() => () => disposeMaterial(wickMaterial), [wickMaterial]);
  const { device } = useDevice(simId);
  const [fuel, setFuel] = useState(volumeMl);
  const capRef = useRef(null);
  const lamp = useMemo(() => createLampState(capOn, capHeight), [capOn, capHeight]);

  useFrame((_, delta) => lamp.update(device, Math.min(delta, 0.1), capRef.current, fuel, setFuel), DEVICE_PRIORITY);

  const volume = device ? fuel : volumeMl;
  const off = device ? !device.capOn : !capOn;

  return (
    <group {...props}>
      <mesh geometry={collar} material={kit.chrome} castShadow />
      <mesh geometry={tube} material={kit.steel} castShadow />
      <mesh geometry={wick} material={wickMaterial} castShadow />
      <GlassVessel vessel={body}>
        <Contents simId={simId} vessel={mouth} fallback={{ volumeMl: volume, color: liquidColor, opacity: liquidOpacity }} />
      </GlassVessel>
      <LampFlame origin={WICK_TIP} get={lamp.getFlame} />
      <group ref={capRef} position={capOn ? [0, COLLAR_SHOULDER + capHeight, 0] : [0.064, 0, 0.022]} rotation={[0, 0, capOn ? Math.PI : 0]}>
        <GlassVessel vessel={cap} />
      </group>
      {off && (
        <group position={[0.064, 0, 0.022]}>
          <BlobShadow radius={0.024} opacity={0.2} />
        </group>
      )}
      <BlobShadow radius={R * 1.45} opacity={0.3} />
    </group>
  );
};

export default SpiritLamp;
