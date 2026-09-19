import { cn } from "@/shared/utils/cn";

const FADES = {
  none: undefined,
  edges: "radial-gradient(ellipse 85% 75% at 50% 45%, black 55%, transparent)",
  bottom: "linear-gradient(to bottom, black 70%, transparent)",
};

// Light graph-paper grid behind a section.
const GridBackground = ({ fade = "edges", className }) => (
  <div
    aria-hidden="true"
    className={cn("bg-pixel-grid pointer-events-none absolute inset-0 -z-10", className)}
    style={{ maskImage: FADES[fade], WebkitMaskImage: FADES[fade] }}
  />
);

export default GridBackground;
