import { useKit } from "../kit/kitContext";
import GlassVessel from "../kit/GlassVessel";
import Contents from "../kit/Contents";
import BlobShadow from "../kit/BlobShadow";
import { arc, buildPrintBand, buildVessel, heightForVolume, radiusAt } from "../kit/vessel";
import { createGraduationTexture } from "../kit/printTextures";

// 250 ml Griffin low-form beaker: Ø70 × 95 mm, 1.4 mm borosilicate wall.
const RADIUS = 0.035;
const HEIGHT = 0.095;
const WALL = 0.0014;
const BOTTOM = 0.0022;
const FILLET = 0.0045;
const FLARE = 0.0011;
const PRINT_RADIUS = RADIUS + 0.00012;
const PRINT_Y = [0.006, HEIGHT - 0.01];

const OUTLINE = [
  [0, 0],
  ...arc(RADIUS - FILLET, FILLET, FILLET, -Math.PI / 2, 0, 6),
  [RADIUS, HEIGHT - 0.007],
  [RADIUS + FLARE * 0.45, HEIGHT - 0.0032],
  [RADIUS + FLARE, HEIGHT],
];

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const vessel = buildVessel({
    outline: OUTLINE,
    wall: WALL,
    bottom: BOTTOM,
    segments: 72,
    spout: { depth: 0.011, reach: 0.0042, halfAngle: 0.42 },
  });
  const level = (ml) => heightForVolume(vessel.innerProfile, ml);
  const createTexture = () =>
    createGraduationTexture({
      circumference: Math.PI * 2 * PRINT_RADIUS,
      y0: PRINT_Y[0],
      y1: PRINT_Y[1],
      marks: [25, 50, 75, 100, 125, 150, 175, 200, 225].map((ml) => ({
        y: level(ml),
        major: ml % 50 === 0,
        label: ml % 50 === 0 ? String(ml) : null,
      })),
      texts: [
        { value: "250 ml", x: -0.012, y: level(250) + 0.004, size: 0.0052, weight: 800 },
        { value: "±5%", x: 0.011, y: level(250) + 0.004, size: 0.0028, weight: 600 },
      ],
      patches: [{ x: 0.017, y: level(60), w: 0.017, h: 0.011 }],
    });
  const mouth = { innerProfile: vessel.innerProfile, capacityMl: 250, mouthY: vessel.rimY, mouthR: radiusAt(vessel.innerProfile, vessel.rimY) };
  assets = { vessel, mouth, createTexture, printGeometry: buildPrintBand(PRINT_RADIUS, ...PRINT_Y, 96) };
  return assets;
};

const Beaker = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, ...props }) => {
  const kit = useKit();
  const { vessel, mouth, createTexture, printGeometry } = getAssets();
  const print = { geometry: printGeometry, material: kit.print("beaker-250", createTexture) };

  return (
    <group {...props}>
      <GlassVessel vessel={vessel} print={print}>
        <Contents simId={simId} vessel={mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      </GlassVessel>
      <BlobShadow radius={RADIUS * 1.45} opacity={0.28} />
    </group>
  );
};

export default Beaker;
