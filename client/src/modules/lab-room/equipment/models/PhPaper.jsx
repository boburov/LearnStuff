import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useKit } from "../kit/kitContext";
import BlobShadow from "../kit/BlobShadow";
import { useDevice } from "../kit/deviceState";

// Universal indicator paper: 60 × 35 × 22 mm roll dispenser standing on its long edge, label facing +Z, 3 loose 70 × 7 mm strips.
const MM = 0.001;
const BOX = { w: 60, h: 35, d: 22, radius: 1.5, lid: 28.6 };
const LABEL = { w: 52, h: 23.5, px: 24 };
const SLOT = { x: 18, length: 10.5, width: 1.5 };
const TAPE_WIDTH = 7;
const PH_COLORS = [
  "#d7262d", "#e8452c", "#f06e2a", "#f59b26", "#f4c01f", "#c9cf2a", "#7fbf3f",
  "#2f9e4f", "#1a8f78", "#1a7fb0", "#2a5aa6", "#3a3f94", "#56308a", "#6b2379",
];
const STRIPS = [
  { x: 4, z: 21.5, angle: 0.05, lift: 1.3, twist: 0.25 },
  { x: -6, z: 32.5, angle: -0.03, lift: 3.2, twist: -0.5 },
  { x: 11, z: 43.5, angle: 0.06, lift: 1.0, twist: 0.3 },
];

const FONT = "Inter, 'Segoe UI', Arial, sans-serif";

const createLabelTexture = () => {
  const k = LABEL.px;
  const canvas = document.createElement("canvas");
  canvas.width = LABEL.w * k;
  canvas.height = LABEL.h * k;
  const ctx = canvas.getContext("2d");
  const text = (value, x, y, size, weight, align = "center") => {
    ctx.font = `${weight} ${size * k}px ${FONT}`;
    ctx.textAlign = align;
    ctx.fillText(value, x * k, y * k);
  };
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, canvas.height, 1.6 * k);
  ctx.fillStyle = "#fbf8ee";
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#f2c12e";
  ctx.fillRect(0, 0, canvas.width, 6.2 * k);
  ctx.restore();
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#1d1b17";
  text("pH 1–14", 3, 3.25, 3.9, 800, "left");
  text("Universal", 49, 2.15, 1.65, 600, "right");
  text("indikator qog'ozi", 49, 4.3, 1.65, 600, "right");

  const size = 4.6;
  const gap = 1.6;
  const left = (LABEL.w - (7 * size + 6 * gap)) / 2;
  PH_COLORS.forEach((color, i) => {
    const row = Math.floor(i / 7);
    const x = left + (i % 7) * (size + gap);
    const y = 7.4 + row * 7.6;
    ctx.beginPath();
    ctx.roundRect(x * k, y * k, size * k, size * k, 0.5 * k);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = "#26231d";
    text(String(i + 1), x + size / 2, y + size + 1.35, 1.7, 700);
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const buildTape = () => {
  const curve = new CatmullRomCurve3(
    [[SLOT.x, BOX.h - 1], [SLOT.x + 0.2, BOX.h + 3.5], [SLOT.x + 2.4, BOX.h + 6.4], [SLOT.x + 6.6, BOX.h + 7.2], [SLOT.x + 10.6, BOX.h + 5.6], [SLOT.x + 13.4, BOX.h + 2.2], [SLOT.x + 14.6, BOX.h - 2.6]].map(
      ([x, y]) => new Vector3(x, y, 0),
    ),
  );
  const points = curve.getSpacedPoints(28);
  const positions = [];
  const index = [];
  points.forEach((p, i) => {
    const t = i / (points.length - 1);
    const sag = 0.5 * t * t;
    positions.push(p.x * MM, (p.y + sag) * MM, (-TAPE_WIDTH / 2) * MM, p.x * MM, (p.y - sag) * MM, (TAPE_WIDTH / 2) * MM);
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
};

const buildStrip = ({ x, z, angle, lift, twist }) => {
  const geometry = new PlaneGeometry(70 * MM, TAPE_WIDTH * MM, 28, 2);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = pos.getX(i) / (35 * MM);
    const v = pos.getZ(i) / ((TAPE_WIDTH / 2) * MM);
    const y = 0.12 + lift * u * u * (0.6 + 0.4 * Math.max(0, u)) + twist * Math.max(0, u) * v;
    pos.setY(i, y * MM);
  }
  geometry.rotateY(angle);
  geometry.translate(x * MM, 0, z * MM);
  geometry.computeVertexNormals();
  return geometry;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const lower = new RoundedBoxGeometry(BOX.w * MM, BOX.lid * MM, BOX.d * MM, 4, BOX.radius * MM);
  lower.translate(0, (BOX.lid / 2) * MM, 0);
  const lidHeight = BOX.h - BOX.lid - 0.25;
  const lid = new RoundedBoxGeometry((BOX.w + 0.2) * MM, lidHeight * MM, (BOX.d + 0.2) * MM, 4, BOX.radius * MM);
  lid.translate(0, (BOX.h - lidHeight / 2) * MM, 0);
  const core = new RoundedBoxGeometry((BOX.w - 1.6) * MM, 3 * MM, (BOX.d - 1.6) * MM, 1, 0.6 * MM);
  core.translate(0, BOX.lid * MM, 0);
  const slot = new PlaneGeometry(SLOT.width * MM, SLOT.length * MM);
  slot.rotateX(-Math.PI / 2);
  slot.translate(SLOT.x * MM, (BOX.h + 0.03) * MM, 0);
  const label = new PlaneGeometry(LABEL.w * MM, LABEL.h * MM);
  label.translate(0, (BOX.lid / 2) * MM, (BOX.d / 2 + 0.06) * MM);
  assets = {
    lower,
    lid,
    core,
    slot,
    label,
    tape: buildTape(),
    strips: STRIPS.map(buildStrip),
    tapeExit: [SLOT.x * MM, BOX.h * MM, 0],
    labelCenter: [0, (BOX.lid / 2) * MM, (BOX.d / 2) * MM],
  };
  return assets;
};

// Unused universal indicator paper is orange-yellow and matte.
const createPaperMaterial = () => new MeshStandardMaterial({ color: "#c99545", roughness: 0.95, side: DoubleSide });

const DRY = new Color("#c99545");
const TESTED = { x: 6, z: 30, angle: 0.08, length: 62, width: TAPE_WIDTH };

// A torn-off strip lying in front of the box: the dipped end carries the pH colour, wet and slightly darker.
const buildTestedStrip = (hex) => {
  const cols = 22;
  const rows = 2;
  const wet = new Color(hex);
  const positions = [];
  const colors = [];
  const index = [];
  for (let i = 0; i <= cols; i += 1) {
    const t = i / cols;
    const x = (t - 0.5) * TESTED.length;
    // Capillary rise: the colour soaks about a third of the way up the strip.
    const soak = 1 - Math.min(1, Math.max(0, (t - 0.18) / 0.22));
    const lift = 0.35 + 0.9 * t * t + Math.sin(t * 7) * 0.12;
    for (let j = 0; j <= rows; j += 1) {
      const z = (j / rows - 0.5) * TESTED.width;
      positions.push(x, lift + Math.abs(z) * 0.02, z);
      const c = DRY.clone().lerp(wet, soak);
      colors.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      const a = i * (rows + 1) + j;
      index.push(a, a + rows + 1, a + 1, a + 1, a + rows + 1, a + rows + 2);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions.map((v) => v * MM)), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
};

const createTestedMaterial = () =>
  new MeshStandardMaterial({ vertexColors: true, roughness: 0.75, side: DoubleSide });

const PhPaper = ({ simId, strip = null, ...props }) => {
  const kit = useKit();
  const { lower, lid, core, slot, label, tape, strips } = getAssets();
  const labelMaterial = kit.print("ph-paper-label", createLabelTexture);
  const paperMaterial = useMemo(() => createPaperMaterial(), []);
  useEffect(() => () => paperMaterial.dispose(), [paperMaterial]);
  const { device } = useDevice(simId);
  const tested = device ? device.strip : strip;
  const testedColor = tested?.color;
  const testedGeometry = useMemo(() => (testedColor ? buildTestedStrip(testedColor) : null), [testedColor]);
  const testedMaterial = useMemo(() => (testedColor ? createTestedMaterial() : null), [testedColor]);
  useEffect(() => () => testedGeometry?.dispose(), [testedGeometry]);
  useEffect(() => () => testedMaterial?.dispose(), [testedMaterial]);

  return (
    <group {...props}>
      <mesh geometry={lower} material={kit.plasticWhite} castShadow receiveShadow />
      <mesh geometry={lid} material={kit.plasticWhite} castShadow receiveShadow />
      <mesh geometry={core} material={kit.plasticGray} />
      <mesh geometry={slot} material={kit.plasticDark} />
      <mesh geometry={label} material={labelMaterial} receiveShadow />
      <mesh geometry={tape} material={paperMaterial} castShadow />
      {strips.map((loose) => (
        <mesh key={loose.uuid} geometry={loose} material={paperMaterial} castShadow />
      ))}
      {testedGeometry && testedMaterial && (
        <mesh
          geometry={testedGeometry}
          material={testedMaterial}
          position={[TESTED.x * MM, 0, TESTED.z * MM]}
          rotation-y={TESTED.angle}
          castShadow
        />
      )}
      {STRIPS.map(({ x, z, angle }) => (
        <group key={`${x},${z}`} position={[x * MM, 0, z * MM]} rotation-y={angle} scale-z={0.17}>
          <BlobShadow radius={0.037} opacity={0.22} />
        </group>
      ))}
      <group scale-z={0.5}>
        <BlobShadow radius={0.038} opacity={0.34} />
      </group>
    </group>
  );
};

export default PhPaper;
