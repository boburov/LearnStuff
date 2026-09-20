// One placed component: chassis (from bodies) + selection frame + pin hitboxes.
// Subscribes only to its own sim slice so a blinking LED doesn't re-render the canvas.
import { memo, useRef } from "react";
import { getPart } from "../engine/parts";
import { PART_BODIES } from "./parts/bodies";
import { useCompVisual, useCompInput } from "../engine/useSimulation";

const PartNode = ({ comp, store, running, selected, onSelect, toWorld, onMove, onPinDown, wiringFromKey }) => {
  const part = getPart(comp.type);
  const Body = PART_BODIES[comp.type];
  const visual = useCompVisual(store, comp.id);
  const input = useCompInput(store, comp.id);
  const dragRef = useRef(null);
  if (!part || !Body) return null;

  const onBodyDown = (e) => {
    if (running) return;
    e.stopPropagation();
    onSelect(comp.id);
    const w = toWorld(e);
    dragRef.current = { dx: w.x - comp.x, dy: w.y - comp.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onBodyMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const w = toWorld(e);
    onMove(comp.id, Math.round(w.x - drag.dx), Math.round(w.y - drag.dy));
  };
  const endDrag = (e) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <g transform={`translate(${comp.x} ${comp.y})`}>
      {selected && (
        <rect
          x="-6"
          y="-6"
          width={part.w + 12}
          height={part.h + 12}
          rx="8"
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />
      )}
      <g onPointerDown={onBodyDown} onPointerMove={onBodyMove} onPointerUp={endDrag} style={{ cursor: running ? "default" : "grab" }}>
        <Body comp={comp} visual={visual} input={input} setInput={(patch) => store.setInput(comp.id, patch)} running={running} />
      </g>

      {/* pins */}
      {part.pins.map((p) => {
        const key = `${comp.id}:${p.id}`;
        const active = wiringFromKey === key;
        return (
          <g key={p.id}>
            <circle
              cx={p.x}
              cy={p.y}
              r="9"
              fill="transparent"
              style={{ cursor: "crosshair" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onPinDown(comp.id, p.id, { x: comp.x + p.x, y: comp.y + p.y });
              }}
            />
            <circle cx={p.x} cy={p.y} r={active ? 5 : 3.5} fill={active ? "#0ea5e9" : "#334155"} stroke="#fff" strokeWidth="1" pointerEvents="none" />
            {p.label && (
              <text x={p.x} y={p.y > 30 ? p.y + 12 : p.y - 6} textAnchor="middle" fontSize="8" fill="#64748b" pointerEvents="none">
                {p.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default memo(PartNode);
