import { CanvasTexture, CylinderGeometry, SRGBColorSpace } from "three";
import { useKit } from "../kit/kitContext";
import GlassVessel from "../kit/GlassVessel";
import Contents from "../kit/Contents";
import { profileTable } from "../kit/profileTable";
import BlobShadow from "../kit/BlobShadow";
import { arc, buildVessel, radiusAt } from "../kit/vessel";

// Borosilicate crystallizing dish with spout: Ø150 × 75 mm, 2 mm wall, 2.5 mm flat bottom.
const RADIUS = 0.075;
const HEIGHT = 0.075;
const WALL = 0.002;
const BOTTOM = 0.0025;
const FILLET = 0.0065;
const FLARE = 0.0017;
const PRINT_RADIUS = RADIUS + 0.00012;
const PRINT_Y = [0.0105, 0.0175];
const PRINT_HALF_ANGLE = 0.16;
const PRINT_PX_PER_M = 26000;
const FONT = "Inter, 'Segoe UI', Arial, sans-serif";

const OUTLINE = [
  [0, 0],
  ...arc(RADIUS - FILLET, FILLET, FILLET, -Math.PI / 2, 0, 8),
  [RADIUS, HEIGHT - 0.012],
  [RADIUS + FLARE * 0.2, HEIGHT - 0.006],
  [RADIUS + FLARE * 0.6, HEIGHT - 0.0025],
  [RADIUS + FLARE, HEIGHT],
];

const createStampTexture = () => {
  const width = Math.round(2 * PRINT_HALF_ANGLE * PRINT_RADIUS * PRINT_PX_PER_M);
  const height = Math.round((PRINT_Y[1] - PRINT_Y[0]) * PRINT_PX_PER_M);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(0.0028 * PRINT_PX_PER_M)}px ${FONT}`;
  ctx.fillText("150 × 75", width / 2, height / 2);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

let assets = null;
const getAssets = () => {
  if (assets) return assets;
  const vessel = buildVessel({
    outline: OUTLINE,
    wall: WALL,
    bottom: BOTTOM,
    segments: 96,
    spout: { depth: 0.015, reach: 0.0052, halfAngle: 0.36 },
  });
  const printGeometry = new CylinderGeometry(
    PRINT_RADIUS,
    PRINT_RADIUS,
    PRINT_Y[1] - PRINT_Y[0],
    8,
    1,
    true,
    -PRINT_HALF_ANGLE,
    PRINT_HALF_ANGLE * 2,
  );
  printGeometry.translate(0, (PRINT_Y[0] + PRINT_Y[1]) / 2, 0);
  const mouthY = vessel.rimY;
  const innerProfile = vessel.innerProfile;
  assets = {
    vessel,
    mouth: { innerProfile, mouthY, mouthR: radiusAt(innerProfile, mouthY), capacityMl: profileTable(innerProfile, mouthY).capacityMl },
    printGeometry,
  };
  return assets;
};

const CrystallizingDish = ({ simId, volumeMl = 0, liquidColor, liquidOpacity, ...props }) => {
  const kit = useKit();
  const { vessel, mouth, printGeometry } = getAssets();
  const print = { geometry: printGeometry, material: kit.print("crystallizing-dish-150", createStampTexture) };

  return (
    <group {...props}>
      <GlassVessel vessel={vessel} print={print}>
        <Contents simId={simId} vessel={mouth} fallback={{ volumeMl, color: liquidColor, opacity: liquidOpacity }} />
      </GlassVessel>
      <BlobShadow radius={RADIUS * 1.35} opacity={0.3} />
    </group>
  );
};

export default CrystallizingDish;
