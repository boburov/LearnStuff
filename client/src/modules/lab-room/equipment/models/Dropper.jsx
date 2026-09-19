import { useEffect, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { LatheGeometry } from "three";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";
import { createLiquidMaterial } from "../kit/materials";
import { arc, toVectors } from "../kit/vessel";
import { DEVICE_PRIORITY, stepValue, useDevice } from "../kit/deviceState";

// Glass dropper: 90 mm tube (OD 7, wall 1) drawn down to a Ø2 mm tip over 30 mm; red teat Ø16 × 32 mm.
const MM = 0.001;
const TUBE_LENGTH = 90 * MM;
const TUBE_R = 3.5 * MM;
const WALL = 1 * MM;
const TAPER = 30 * MM;
const TIP_R = 1 * MM;
const TIP_BORE = 0.42 * MM;
const LIP = (TIP_R - TIP_BORE) / 2;
const RIM = WALL / 2;
const TEAT_START = 78 * MM;
const TEAT_LENGTH = 32 * MM;
const LIQUID_INSET = 0.08 * MM;

const ease = (t) => {
  const s = Math.pow(Math.min(1, Math.max(0, t)), 0.8);
  return s * s * (3 - 2 * s);
};
const outerRadius = (y) => TIP_R + (TUBE_R - TIP_R) * ease(y / TAPER);
const boreRadius = (y) => TIP_BORE + (TUBE_R - WALL - TIP_BORE) * ease(y / TAPER);

const taperSamples = (radius, count = 16) =>
  Array.from({ length: count + 1 }, (_, i) => {
    const y = LIP + ((TAPER - LIP) * i) / count;
    return [radius(y), y];
  });

const outerProfile = () => [
  ...arc((TIP_R + TIP_BORE) / 2, LIP, LIP, -Math.PI / 2, 0, 4),
  ...taperSamples(outerRadius).slice(1),
  [TUBE_R, TUBE_LENGTH - RIM],
  ...arc(TUBE_R - RIM, TUBE_LENGTH - RIM, RIM, 0, Math.PI / 2, 3).slice(1),
];

const boreProfile = () => [
  ...arc(TUBE_R - RIM, TUBE_LENGTH - RIM, RIM, Math.PI / 2, Math.PI, 3),
  [TUBE_R - WALL, TAPER],
  ...taperSamples(boreRadius).reverse().slice(1),
  ...arc((TIP_R + TIP_BORE) / 2, LIP, LIP, Math.PI, Math.PI * 1.5, 4).slice(1),
];

// Teat silhouette in mm from its opening (u = 0) to the closed dome; starts inside, gripping the tube.
const teatProfile = () => {
  const points = [[3.46, 1.5], [3.52, 0.95]];
  points.push(...arc(4.45, 0.85, 0.85, Math.PI, Math.PI * 2, 8).slice(1));
  points.push([5.32, 2.1], [5.18, 2.75], [4.9, 3.2], [4.82, 3.8], [4.84, 7.6]);
  for (let i = 1; i <= 8; i += 1) {
    const t = i / 8;
    points.push([4.84 + (8 - 4.84) * t * t * (3 - 2 * t), 7.6 + 7.6 * t]);
  }
  points.push([8.02, 19.5], [7.96, 23.5]);
  for (let i = 1; i <= 10; i += 1) {
    const a = (i / 10) * (Math.PI / 2);
    points.push([7.96 * Math.cos(a), 23.5 + 8.5 * Math.sin(a)]);
  }
  return points.map(([r, u]) => [r * MM, TEAT_START + u * MM]);
};

// Tilt about the tip so both the teat and the tube shoulder touch the bench.
const solveRest = (glass, teat) => {
  const lowest = (points, a) =>
    points.reduce((best, [r, y]) => {
      const h = y * Math.sin(a) - r * Math.cos(a);
      return h < best.h ? { h, x: y * Math.cos(a) + r * Math.sin(a) } : best;
    }, { h: Infinity, x: 0 });
  let lo = 0;
  let hi = 0.3;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (lowest(teat, mid).h < lowest(glass, mid).h) lo = mid;
    else hi = mid;
  }
  const tilt = (lo + hi) / 2;
  const g = lowest(glass, tilt);
  const t = lowest(teat, tilt);
  const originX = -(g.x + t.x) / 2;
  return { tilt, position: [originX, -Math.min(g.h, t.h), 0], contacts: [g.x + originX, t.x + originX] };
};

const buildLiquid = (fill) => {
  if (!(fill > 0)) return null;
  const level = LIP + Math.min(1, fill) * (TEAT_START - LIP);
  const points = [[0, LIP * 0.5]];
  const steps = 18;
  for (let i = 0; i <= steps; i += 1) {
    const y = LIP * 0.5 + ((level - LIP * 0.5) * i) / steps;
    points.push([Math.max(0, boreRadius(y) - LIQUID_INSET), y]);
  }
  const edge = boreRadius(level) - LIQUID_INSET;
  points.push([edge * 0.55, level - edge * 0.32], [0, level - edge * 0.42]);
  return new LatheGeometry(toVectors(points), 20, Math.PI, Math.PI * 2);
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const outer = outerProfile();
  const teat = teatProfile();
  const rest = solveRest(outer, teat.slice(2));
  const along = (y) => [rest.position[0] + y * Math.cos(rest.tilt), rest.position[1] + y * Math.sin(rest.tilt), 0];
  assets = {
    outer: new LatheGeometry(toVectors(outer), 28, Math.PI, Math.PI * 2),
    bore: new LatheGeometry(toVectors(boreProfile()), 28, Math.PI, Math.PI * 2),
    teat: new LatheGeometry(toVectors(teat), 40, Math.PI, Math.PI * 2),
    rest,
    tip: along(0),
    teatCenter: along(TEAT_START + 19 * MM),
    teatEnd: along(TEAT_START + TEAT_LENGTH),
  };
  return assets;
};

const Dropper = ({ simId, fillFraction = 0, liquidColor, liquidOpacity, ...props }) => {
  const kit = useKit();
  const { outer, bore, teat, rest } = getAssets();
  const { device } = useDevice(simId);
  // Drawing up and releasing drops moves the level in steps, so the column is rebuilt only every ~0.04 ml.
  const [fill, setFill] = useState(fillFraction);
  useFrame(() => {
    if (!device) return;
    const next = stepValue(Math.min(1, Math.max(0, (device.fillMl ?? 0) / (device.capacityMl || 2))), 1 / 48);
    if (next !== fill) setFill(next);
  }, DEVICE_PRIORITY);
  const level = device ? fill : fillFraction;
  const color = device?.color ?? liquidColor;
  const opacity = device?.opacity ?? liquidOpacity;
  const liquid = useMemo(() => buildLiquid(level), [level]);
  const liquidMaterial = useMemo(() => createLiquidMaterial({ color, opacity }), [color, opacity]);
  useEffect(() => () => liquid?.dispose(), [liquid]);
  useEffect(() => () => liquidMaterial.dispose(), [liquidMaterial]);

  return (
    <group {...props}>
      <group position={rest.position} rotation-z={rest.tilt - Math.PI / 2}>
        <mesh geometry={bore} material={kit.glass} renderOrder={1} />
        {liquid && <mesh geometry={liquid} material={liquidMaterial} renderOrder={2} />}
        <mesh geometry={outer} material={kit.glass} renderOrder={3} />
        <mesh geometry={teat} material={kit.rubberRed} castShadow />
      </group>
      <group position-x={rest.contacts[1]} scale-x={1.6}>
        <BlobShadow radius={0.011} opacity={0.3} />
      </group>
    </group>
  );
};

export default Dropper;
