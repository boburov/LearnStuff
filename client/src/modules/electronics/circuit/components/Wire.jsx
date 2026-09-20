// A single drooping bezier wire between two pin positions.
import { memo } from "react";

const path = (a, b) => {
  const dx = Math.abs(b.x - a.x);
  const sag = Math.min(70, 24 + dx * 0.25);
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + sag}, ${b.x} ${b.y + sag}, ${b.x} ${b.y}`;
};

const Wire = ({ a, b, color = "#22c55e", selected, onSelect }) => (
  <g onPointerDown={onSelect} style={{ cursor: onSelect ? "pointer" : "default" }}>
    {/* fat invisible hit area */}
    <path d={path(a, b)} stroke="transparent" strokeWidth="12" fill="none" />
    <path
      d={path(a, b)}
      stroke={selected ? "#0ea5e9" : color}
      strokeWidth={selected ? 4.5 : 3.5}
      fill="none"
      strokeLinecap="round"
    />
  </g>
);

export default memo(Wire);
