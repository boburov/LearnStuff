import { CanvasTexture, SRGBColorSpace } from "three";

const FONT = "Inter, 'Segoe UI', Arial, sans-serif";
const WIDTH = 2048;

// Canvas wraps the full circumference; x = 0 m is the vessel's front (+Z), y is height on the vessel.
export const createGraduationTexture = ({ circumference, y0, y1, marks = [], texts = [], patches = [] }) => {
  const pxPerM = WIDTH / circumference;
  const height = Math.max(64, Math.round((y1 - y0) * pxPerM));
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const X = (m) => WIDTH / 2 + m * pxPerM;
  const Y = (y) => height - (y - y0) * pxPerM;
  const px = (m) => m * pxPerM;

  ctx.fillStyle = "#ffffff";
  for (const mark of marks) {
    const thickness = Math.max(2, px(mark.major ? 0.0007 : 0.0005));
    ctx.fillRect(X(mark.x ?? -0.012), Y(mark.y) - thickness / 2, px(mark.length ?? (mark.major ? 0.011 : 0.006)), thickness);
    if (mark.label) {
      ctx.font = `600 ${Math.round(px(mark.size ?? 0.0034))}px ${FONT}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(mark.label, X((mark.x ?? -0.012) + (mark.length ?? 0.011) + 0.0015), Y(mark.y));
    }
  }

  for (const text of texts) {
    ctx.font = `${text.weight ?? 700} ${Math.round(px(text.size))}px ${FONT}`;
    ctx.textAlign = text.align ?? "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text.value, X(text.x), Y(text.y));
  }

  for (const patch of patches) {
    ctx.beginPath();
    ctx.roundRect(X(patch.x), Y(patch.y + patch.h), px(patch.w), px(patch.h), px(0.0012));
    ctx.fill();
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};
