// Left rail: component groups. Each tile is HTML5-draggable onto the canvas.
import { PALETTE_GROUPS, getPart } from "../engine/parts";
import { PART_BODIES } from "./parts/bodies";

const Thumb = ({ type }) => {
  const part = getPart(type);
  const Body = PART_BODIES[type];
  const pad = 10;
  return (
    <svg viewBox={`${-pad} ${-pad} ${part.w + pad * 2} ${part.h + pad * 2}`} className="h-12 w-full">
      <Body comp={{ id: "preview", type, props: part.props }} />
    </svg>
  );
};

const Palette = ({ disabled }) => (
  <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
    {PALETTE_GROUPS.map((g) => (
      <div key={g.id}>
        <div className="mb-2 text-xs font-medium text-muted-foreground">{g.label}</div>
        <div className="grid grid-cols-2 gap-2">
          {g.types.map((type) => {
            const part = getPart(type);
            return (
              <div
                key={type}
                draggable={!disabled}
                onDragStart={(e) => e.dataTransfer.setData("text/part", type)}
                className={`flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-2 transition-colors ${
                  disabled ? "opacity-50" : "cursor-grab hover:border-primary hover:bg-secondary active:cursor-grabbing"
                }`}
                title={part.label}
              >
                <Thumb type={type} />
                <span className="text-center text-[11px] leading-tight text-foreground">{part.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default Palette;
