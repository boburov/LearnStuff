import { cn } from "@/shared/utils/cn";
import { SPRITES, getSpriteRuns } from "./sprites";

// Crisp pixel-art icon. `colors` overrides palette keys (e.g. tint a subject island).
const PixelSprite = ({ name, size = 48, colors, className, title, ...rest }) => {
  const data = getSpriteRuns(name);
  if (!data) return null;
  const palette = { ...SPRITES[name].colors, ...colors };

  return (
    <svg
      viewBox={`0 0 ${data.width} ${data.height}`}
      width={size}
      height={(size * data.height) / data.width}
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
      {...rest}
    >
      {title && <title>{title}</title>}
      {data.runs.map(({ x, y, w, key }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={palette[key]} />
      ))}
    </svg>
  );
};

export default PixelSprite;
