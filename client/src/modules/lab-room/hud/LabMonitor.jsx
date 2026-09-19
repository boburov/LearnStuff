import { useEffect, useMemo } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { useSnap } from "@/shared/utils/snapStore";
import { DANGER_STYLE, MONITOR_TEXT, reactionInfo } from "./labTexts";

const WIDTH = 1280;
const HEIGHT = 720;
const FONT = "Inter, 'Segoe UI', Arial, sans-serif";
const TONE_COLOR = { emerald: "#34d399", amber: "#fbbf24", red: "#f87171" };

const wrap = (ctx, text, maxWidth) => {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const drawScreen = (ctx, info) => {
  ctx.fillStyle = "#0b1117";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#16212c";
  ctx.fillRect(0, 0, WIDTH, 64);
  ctx.fillStyle = "#34d399";
  ctx.beginPath();
  ctx.arc(38, 32, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e5edf5";
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText(MONITOR_TEXT.title, 62, 42);

  const left = 48;
  const width = WIDTH - left * 2;
  if (!info) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `400 32px ${FONT}`;
    wrap(ctx, MONITOR_TEXT.empty, width).forEach((line, i) => ctx.fillText(line, left, 180 + i * 46));
    return;
  }
  let y = 128;
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 44px ${FONT}`;
  wrap(ctx, info.title, width).slice(0, 2).forEach((line) => {
    ctx.fillText(line, left, y);
    y += 54;
  });
  const danger = DANGER_STYLE[info.danger] ?? DANGER_STYLE.past;
  ctx.fillStyle = TONE_COLOR[danger.tone];
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(`${danger.label}${info.table ? ` · ${MONITOR_TEXT.table(info.table)}` : ""}`, left, y);
  y += 52;
  ctx.fillStyle = "#e2e8f0";
  ctx.font = `500 34px ui-monospace, Menlo, Consolas, monospace`;
  info.equation.slice(0, 3).forEach((line) => {
    ctx.fillText(line, left, y);
    y += 46;
  });
  y += 10;
  ctx.fillStyle = "#7dd3fc";
  ctx.font = `600 22px ${FONT}`;
  ctx.fillText(MONITOR_TEXT.observation.toUpperCase(), left, y);
  y += 38;
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `400 30px ${FONT}`;
  wrap(ctx, info.observation, width).slice(0, 4).forEach((line) => {
    ctx.fillText(line, left, y);
    y += 40;
  });
  ctx.fillStyle = "#fca5a5";
  ctx.font = `400 26px ${FONT}`;
  wrap(ctx, `${MONITOR_TEXT.safety}: ${info.safety}`, width).slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, left, HEIGHT - 70 + i * 34);
  });
};

const repaint = (screen, monitor) => {
  drawScreen(screen.canvas.getContext("2d"), monitor ? reactionInfo(monitor) : null);
  screen.texture.needsUpdate = true;
};

// The lab computer screen at the end of bench 1 shows the latest reaction; walk up and click it to read in 2D.
const LabMonitor = ({ lab, anchor }) => {
  const { monitor } = useSnap(lab.feed);
  const screen = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    return { canvas, texture };
  }, []);

  useEffect(() => repaint(screen, monitor), [screen, monitor]);
  useEffect(() => () => screen.texture.dispose(), [screen]);

  if (!anchor) return null;
  const [x, y, z] = anchor.position;
  return (
    <mesh position={[x, y, z + 0.003]}>
      <planeGeometry args={anchor.size} />
      <meshBasicMaterial map={screen.texture} toneMapped={false} />
    </mesh>
  );
};

export default LabMonitor;
