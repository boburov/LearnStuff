/* eslint-disable react-refresh/only-export-components */
// SVG chassis for every component, drawn in local coords (0,0)-(w,h).
// Pins are drawn separately by PartNode. `visual` comes from the sim store (may be null when stopped).
import { getPart } from "../../engine/parts";

const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));

// ---- Arduino Uno ------------------------------------------------------------
const Arduino = () => {
  const { w, h } = getPart("arduino");
  return (
    <g>
      <rect x="0" y="0" width={w} height={h} rx="10" fill="#0f766e" stroke="#0b5850" />
      <rect x="0" y="18" width={w} height="10" fill="#0b5850" opacity="0.5" />
      <rect x="0" y={h - 28} width={w} height="10" fill="#0b5850" opacity="0.5" />
      {/* USB */}
      <rect x="-14" y="40" width="46" height="46" rx="3" fill="#cbd5e1" stroke="#94a3b8" />
      {/* power jack */}
      <rect x="-8" y="130" width="34" height="40" rx="4" fill="#111827" />
      {/* MCU chip */}
      <rect x={w / 2 - 55} y={h / 2 - 22} width="110" height="44" rx="3" fill="#1e293b" />
      {/* logo */}
      <text x={w / 2 + 70} y={h / 2 + 6} fill="#e2e8f0" fontSize="26" fontWeight="700" fontStyle="italic">
        UNO
      </text>
      <circle cx={w / 2} cy={h / 2 - 6} r="12" fill="none" stroke="#5eead4" strokeWidth="3" />
    </g>
  );
};

// ---- Breadboard -------------------------------------------------------------
const Breadboard = () => {
  const { w, h } = getPart("breadboard");
  return (
    <g>
      <rect x="0" y="0" width={w} height={h} rx="6" fill="#f8fafc" stroke="#cbd5e1" />
      <rect x="0" y={h / 2 - 8} width={w} height="16" fill="#e2e8f0" />
      <line x1="8" y1="12" x2={w - 8} y2="12" stroke="#ef4444" strokeWidth="2" opacity="0.7" />
      <line x1="8" y1={h - 12} x2={w - 8} y2={h - 12} stroke="#3b82f6" strokeWidth="2" opacity="0.7" />
    </g>
  );
};

// ---- LED --------------------------------------------------------------------
const Led = ({ comp, visual }) => {
  const color = comp.props?.color || "#ef4444";
  const on = visual?.on;
  const b = visual?.brightness ?? 0;
  return (
    <g>
      <line x1="12" y1="40" x2="12" y2="66" stroke="#9ca3af" strokeWidth="3" />
      <line x1="32" y1="34" x2="32" y2="66" stroke="#9ca3af" strokeWidth="3" />
      {on && <circle cx="22" cy="22" r={20 + b * 10} fill={color} opacity={0.25 * b} filter="url(#glow)" />}
      <circle cx="22" cy="22" r="16" fill={color} opacity={on ? 0.55 + 0.45 * b : 0.35} stroke="#0f172a" strokeOpacity="0.2" />
      <ellipse cx="17" cy="17" rx="5" ry="7" fill="#ffffff" opacity={on ? 0.6 : 0.3} />
    </g>
  );
};

// ---- RGB LED ----------------------------------------------------------------
const Rgb = ({ visual }) => {
  const r = visual?.r ?? 0;
  const g = visual?.g ?? 0;
  const b = visual?.b ?? 0;
  const lit = r + g + b > 6;
  const col = `rgb(${r},${g},${b})`;
  return (
    <g>
      {[10, 24, 38, 52].map((x) => (
        <line key={x} x1={x} y1="40" x2={x} y2="70" stroke="#9ca3af" strokeWidth="2.5" />
      ))}
      {lit && <circle cx="28" cy="24" r="26" fill={col} opacity="0.3" filter="url(#glow)" />}
      <circle cx="28" cy="24" r="20" fill={lit ? col : "#e5e7eb"} stroke="#0f172a" strokeOpacity="0.2" />
      <ellipse cx="21" cy="18" rx="6" ry="8" fill="#ffffff" opacity="0.5" />
    </g>
  );
};

// ---- Resistor ---------------------------------------------------------------
const bandColor = (d) => ["#000", "#78350f", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#6b7280", "#fff"][d] || "#000";
const Resistor = ({ comp }) => {
  const ohms = comp.props?.ohms ?? 220;
  const digits = String(ohms).replace(/0+$/, "").split("").map(Number);
  const bands = [digits[0] ?? 2, digits[1] ?? 2];
  return (
    <g>
      <line x1="0" y1="12" x2="90" y2="12" stroke="#9ca3af" strokeWidth="3" />
      <rect x="22" y="2" width="46" height="20" rx="8" fill="#e8d3a0" stroke="#c9a86a" />
      {bands.map((d, i) => (
        <rect key={i} x={30 + i * 10} y="2" width="5" height="20" fill={bandColor(d)} />
      ))}
      <rect x="54" y="2" width="5" height="20" fill="#eab308" />
    </g>
  );
};

// ---- Button -----------------------------------------------------------------
const Button = ({ comp, input, setInput, running }) => {
  const pressed = !!input?.pressed;
  const press = (v) => running && setInput({ pressed: v });
  return (
    <g
      style={{ cursor: running ? "pointer" : "default" }}
      onPointerDown={(e) => {
        if (!running) return;
        e.stopPropagation();
        press(true);
      }}
      onPointerUp={() => press(false)}
      onPointerLeave={() => press(false)}
    >
      <rect x="4" y="18" width="52" height="30" rx="3" fill="#334155" />
      <circle cx="30" cy="30" r="16" fill="#1e293b" />
      <circle cx="30" cy={pressed ? 30 : 28} r="12" fill={pressed ? "#dc2626" : "#ef4444"} stroke="#7f1d1d" />
    </g>
  );
};

// ---- Potentiometer ----------------------------------------------------------
const Potentiometer = ({ comp, input, setInput, running }) => {
  const value = input?.value ?? comp.props?.value ?? 512;
  const angle = -135 + (value / 1023) * 270;
  const onMove = (e) => {
    if (!running || e.buttons !== 1) return;
    e.stopPropagation();
    const next = clamp(0, 1023, value - e.movementY * 8);
    setInput({ value: Math.round(next) });
  };
  return (
    <g
      style={{ cursor: running ? "ns-resize" : "default" }}
      onPointerDown={(e) => running && (e.stopPropagation(), e.currentTarget.setPointerCapture(e.pointerId))}
      onPointerMove={onMove}
    >
      <circle cx="35" cy="32" r="26" fill="#1e40af" stroke="#1e3a8a" />
      <circle cx="35" cy="32" r="20" fill="#2563eb" />
      <g transform={`rotate(${angle} 35 32)`}>
        <rect x="33" y="14" width="4" height="18" rx="2" fill="#e2e8f0" />
      </g>
      {running && (
        <text x="35" y="66" textAnchor="middle" fontSize="11" fill="#475569">
          {Math.round(value)}
        </text>
      )}
    </g>
  );
};

// ---- Photoresistor ----------------------------------------------------------
const Photoresistor = ({ comp, input, setInput, running }) => {
  const light = input?.light ?? comp.props?.light ?? 700;
  const onMove = (e) => {
    if (!running || e.buttons !== 1) return;
    e.stopPropagation();
    setInput({ light: Math.round(clamp(0, 1023, light - e.movementY * 8)) });
  };
  return (
    <g
      style={{ cursor: running ? "ns-resize" : "default" }}
      onPointerDown={(e) => running && (e.stopPropagation(), e.currentTarget.setPointerCapture(e.pointerId))}
      onPointerMove={onMove}
    >
      <circle cx="30" cy="30" r="24" fill="#fde68a" stroke="#d97706" opacity={0.4 + (light / 1023) * 0.6} />
      <path d="M14 30 q8 -14 16 0 q8 14 16 0" fill="none" stroke="#78350f" strokeWidth="2.5" />
      {running && (
        <text x="30" y="66" textAnchor="middle" fontSize="11" fill="#475569">
          {Math.round(light)}
        </text>
      )}
    </g>
  );
};

// ---- Servo ------------------------------------------------------------------
const Servo = ({ visual }) => {
  const angle = visual?.angle ?? 0;
  return (
    <g>
      <rect x="14" y="14" width="60" height="42" rx="4" fill="#1d4ed8" stroke="#1e3a8a" />
      <rect x="30" y="4" width="18" height="14" fill="#1d4ed8" />
      <circle cx="39" cy="12" r="7" fill="#1e293b" />
      <g transform={`rotate(${angle - 90} 39 12)`}>
        <rect x="37" y="-14" width="4" height="26" rx="2" fill="#f8fafc" />
        <circle cx="39" cy="-12" r="3" fill="#cbd5e1" />
      </g>
    </g>
  );
};

// ---- DC motor ---------------------------------------------------------------
const Motor = ({ visual }) => {
  const speed = visual?.speed ?? 0;
  const dur = speed > 0.01 ? Math.max(0.15, 1.2 - speed) : 0;
  return (
    <g>
      <circle cx="40" cy="36" r="30" fill="#94a3b8" stroke="#64748b" />
      <circle cx="40" cy="36" r="30" fill="none" stroke="#475569" strokeWidth="2" />
      <g style={dur ? { animation: `cw-spin ${dur}s linear infinite`, transformOrigin: "40px 36px" } : undefined}>
        <rect x="38" y="10" width="4" height="52" rx="2" fill="#1e293b" />
        <rect x="14" y="34" width="52" height="4" rx="2" fill="#1e293b" />
      </g>
      <circle cx="40" cy="36" r="6" fill="#334155" />
    </g>
  );
};

// ---- Buzzer -----------------------------------------------------------------
const Buzzer = ({ visual }) => {
  const playing = visual?.playing;
  return (
    <g>
      <circle cx="32" cy="30" r="26" fill="#0f172a" stroke="#000" />
      <circle cx="32" cy="30" r="6" fill="#334155" />
      {playing && (
        <g stroke="#22c55e" strokeWidth="2.5" fill="none" style={{ animation: "buzz-pulse 0.4s ease-in-out infinite" }}>
          <path d="M60 18 q8 12 0 24" />
          <path d="M66 12 q12 18 0 36" />
        </g>
      )}
    </g>
  );
};

// ---- Battery ----------------------------------------------------------------
const Battery = () => (
  <g>
    <rect x="8" y="16" width="54" height="70" rx="5" fill="#1e293b" stroke="#0f172a" />
    <rect x="8" y="16" width="54" height="24" rx="5" fill="#f59e0b" />
    <text x="35" y="70" textAnchor="middle" fontSize="14" fill="#e2e8f0" fontWeight="700">9V</text>
    <circle cx="22" cy="10" r="6" fill="#cbd5e1" />
    <rect x="42" y="4" width="12" height="12" rx="2" fill="#cbd5e1" />
  </g>
);

export const PART_BODIES = {
  arduino: Arduino,
  breadboard: Breadboard,
  led: Led,
  rgb: Rgb,
  resistor: Resistor,
  button: Button,
  potentiometer: Potentiometer,
  photoresistor: Photoresistor,
  servo: Servo,
  motor: Motor,
  buzzer: Buzzer,
  battery: Battery,
};

// Shared SVG defs (glow filter + keyframes) mounted once by Canvas.
export const PartDefs = () => (
  <>
    <defs>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <style>{`
      @keyframes cw-spin { to { transform: rotate(360deg); } }
      @keyframes buzz-pulse { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
    `}</style>
  </>
);
