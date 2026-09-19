import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  CylinderGeometry,
  LatheGeometry,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  TorusGeometry,
} from "three";
import { useKit } from "../kit/kitContext";
import { toVectors } from "../kit/vessel";
import { DEVICE_PRIORITY, useDevice } from "../kit/deviceState";

// Spirit lab thermometer −10…+110 °C, 300 mm × Ø6 mm, Ø5 × 12 mm bulb, enamel back strip; lies along X, bulb at −X.
const MM = 0.001;
const LENGTH = 300;
const R = 3;
const BULB = { r: 2.5, length: 12 };
const SCALE = { min: -10, max: 110, start: 48, perDegree: 1.9 };
const STRIP = { from: 17, to: 289, width: 3.1, depth: 0.75 };
const COLUMN = { r: 0.36, from: 12.5 };
const FACE_TILT = (40 * Math.PI) / 180;
const PX_PER_MM = 15;

const axial = (a) => (a - LENGTH / 2) * MM;
const scaleAt = (celsius) => SCALE.start + (celsius - SCALE.min) * SCALE.perDegree;
const faceNormal = [0, Math.sin(FACE_TILT), Math.cos(FACE_TILT)];

const bodyProfile = () => {
  const points = [];
  for (let i = 0; i <= 7; i += 1) {
    const a = (i / 7) * (Math.PI / 2);
    points.push([BULB.r * Math.sin(a), BULB.r * (1 - Math.cos(a))]);
  }
  points.push([BULB.r, BULB.length - 1]);
  for (let i = 1; i <= 6; i += 1) {
    const t = i / 6;
    points.push([BULB.r + (R - BULB.r) * t * t * (3 - 2 * t), BULB.length - 1 + 4 * t]);
  }
  points.push([R, LENGTH - 9]);
  for (let i = 1; i <= 7; i += 1) {
    const a = (i / 7) * (Math.PI / 2);
    points.push([R * Math.cos(a), LENGTH - 9 + 2.6 * Math.sin(a)]);
  }
  return points;
};

const spiritProfile = () => {
  const inner = BULB.r - 0.6;
  const points = [[0, 0.5]];
  for (let i = 1; i <= 5; i += 1) {
    const a = (i / 5) * (Math.PI / 2);
    points.push([inner * Math.sin(a), 0.5 + inner * (1 - Math.cos(a))]);
  }
  points.push([inner, BULB.length - 1.6]);
  for (let i = 1; i <= 5; i += 1) {
    const t = i / 5;
    points.push([inner + (COLUMN.r - inner) * t * t * (3 - 2 * t), BULB.length - 1.6 + 2.6 * t]);
  }
  points.push([COLUMN.r, COLUMN.from + 1], [0, COLUMN.from + 1]);
  return points;
};

const alongX = (geometry) => {
  geometry.rotateZ(-Math.PI / 2);
  geometry.scale(MM, MM, MM);
  geometry.translate(axial(0), R * MM, 0);
  return geometry;
};

const offsetAlongFace = (geometry, distance) =>
  geometry.translate(0, faceNormal[1] * distance * MM, faceNormal[2] * distance * MM);

const createScaleTexture = () => {
  const length = STRIP.to - STRIP.from;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(length * PX_PER_MM);
  canvas.height = Math.round(STRIP.width * PX_PER_MM);
  const ctx = canvas.getContext("2d");
  const X = (a) => (a - STRIP.from) * PX_PER_MM;
  const px = (mm) => mm * PX_PER_MM;
  ctx.fillStyle = "#f7f6f1";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#16171a";
  for (let c = SCALE.min; c <= SCALE.max; c += 1) {
    const major = c % 10 === 0;
    const half = c % 5 === 0;
    const lengthMm = major ? 1.85 : half ? 1.45 : 1.05;
    const thick = px(major ? 0.19 : 0.13);
    ctx.fillRect(X(scaleAt(c)) - thick / 2, px(0.25), thick, px(lengthMm));
  }
  ctx.font = `600 ${Math.round(px(0.95))}px Inter, 'Segoe UI', Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let c = SCALE.min; c <= SCALE.max; c += 10) {
    ctx.fillText(String(c), X(scaleAt(c)), px(2.48));
  }
  ctx.font = `700 ${Math.round(px(1.35))}px Inter, 'Segoe UI', Arial, sans-serif`;
  ctx.fillText("°C", X(scaleAt(SCALE.max) + 8), px(1.6));
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const buildStrip = () => {
  const length = STRIP.to - STRIP.from;
  const geometry = new PlaneGeometry(length * MM, STRIP.width * MM);
  geometry.rotateX(-FACE_TILT);
  geometry.translate(axial((STRIP.from + STRIP.to) / 2), R * MM, 0);
  return offsetAlongFace(geometry, -STRIP.depth);
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const column = new CylinderGeometry(COLUMN.r * MM, COLUMN.r * MM, 1, 10, 1);
  column.translate(0, 0.5, 0);
  column.rotateZ(-Math.PI / 2);
  const ring = new TorusGeometry(2.3 * MM, 0.72 * MM, 10, 28);
  ring.rotateX(Math.PI / 2);
  ring.translate(axial(LENGTH - 6.4 + 2.3), R * MM, 0);
  assets = {
    body: alongX(new LatheGeometry(toVectors(bodyProfile()), 32, Math.PI, Math.PI * 2)),
    spirit: alongX(new LatheGeometry(toVectors(spiritProfile()), 16, Math.PI, Math.PI * 2)),
    column,
    ring,
    strip: buildStrip(),
    bulbCenter: [axial(BULB.length / 2), R * MM, 0],
  };
  return assets;
};

// Dyed alcohol seen through the capillary wall: deep saturated red with a wet sheen.
const createSpiritMaterial = () => new MeshStandardMaterial({ color: "#b0121b", roughness: 0.28 });

const columnLength = (celsius) => (scaleAt(Math.min(SCALE.max + 3, Math.max(SCALE.min - 3, celsius))) - COLUMN.from) * MM;

// The column follows the reading with the lag of a real thermometer.
const createColumnState = (initial) => {
  let value = initial;
  return {
    update: (target, dt, mesh) => {
      value += (target - value) * (1 - Math.exp(-Math.min(dt, 0.1) / 0.6));
      if (mesh) mesh.scale.x = columnLength(value);
    },
  };
};

const Thermometer = ({ simId, temperatureC = 22, ...props }) => {
  const kit = useKit();
  const { body, spirit, column, ring, strip } = getAssets();
  const spiritMaterial = useMemo(() => createSpiritMaterial(), []);
  useEffect(() => () => spiritMaterial.dispose(), [spiritMaterial]);
  const scaleMaterial = kit.print("thermometer-scale", createScaleTexture);
  const { device } = useDevice(simId);
  const columnRef = useRef(null);
  const live = useMemo(() => createColumnState(temperatureC), [temperatureC]);
  useFrame((_, delta) => live.update(device?.readingC ?? temperatureC, delta, columnRef.current), DEVICE_PRIORITY);

  return (
    <group {...props}>
      <mesh geometry={strip} material={scaleMaterial} />
      <mesh geometry={spirit} material={spiritMaterial} renderOrder={2} />
      <mesh
        ref={columnRef}
        geometry={column}
        material={spiritMaterial}
        renderOrder={2}
        position={[axial(COLUMN.from), R * MM, 0]}
        scale-x={columnLength(temperatureC)}
      />
      <mesh geometry={body} material={kit.glass} renderOrder={3} />
      <mesh geometry={ring} material={kit.glass} renderOrder={3} />
    </group>
  );
};

export default Thermometer;
