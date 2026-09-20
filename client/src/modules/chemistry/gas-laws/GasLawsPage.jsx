import { useEffect, useRef } from "react";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import useObjectState from "@/shared/hooks/useObjectState";

const R = 8.314;

const ITEMS = [
  { id: "boyle", name: "Boyl (T const)" },
  { id: "charles", name: "Sharl (P const)" },
  { id: "default", name: "Erkin" },
];

const PRESETS = {
  boyle: { volume: 4, temperature: 300, moles: 1 },
  charles: { volume: 6, temperature: 400, moles: 1 },
  default: { volume: 5, temperature: 300, moles: 1 },
};

const Slider = ({ label, value, min, max, step, unit, display, onChange }) => (
  <label className="block">
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">
        {display ?? value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="mt-1 w-full accent-primary"
    />
  </label>
);

const Readout = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-semibold tabular-nums">{value}</span>
  </div>
);

// SVG geometriyasi (viewBox 0..200 x, 0..260 y)
const CYL_X = 60;
const CYL_W = 80;
const CYL_TOP = 20;
const CYL_BOTTOM = 240;
const CYL_H = CYL_BOTTOM - CYL_TOP;
const PARTICLE_COUNT = 8;

// Deterministic initial layout (no Math.random -> keeps render pure).
const INITIAL_PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  x: 0.12 + ((i * 0.37) % 0.8),
  y: 0.12 + ((i * 0.53) % 0.8),
  vx: Math.cos(i * 1.7),
  vy: Math.sin(i * 2.3),
}));

const GasScene = ({ volume, temperature }) => {
  const svgRef = useRef(null);
  const dotsRef = useRef([]);
  const rafRef = useRef(0);
  const stateRef = useRef({ volume, temperature });
  const partsRef = useRef(INITIAL_PARTICLES.map((p) => ({ ...p })));

  useEffect(() => {
    stateRef.current = { volume, temperature };
  }, [volume, temperature]);

  useEffect(() => {
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { volume: v, temperature: t } = stateRef.current;

      // Piston balandligi hajmga proporsional (1..10 L -> qamrov).
      const fill = (v - 1) / 9; // 0..1
      const gasTop = CYL_BOTTOM - (0.35 + 0.6 * fill) * CYL_H;
      const gasHeight = CYL_BOTTOM - gasTop;

      // Tezlik haroratga proporsional.
      const speed = 30 + (t - 100) / 500 * 90;

      const parts = partsRef.current;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx * speed * dt * 0.006;
        p.y += p.vy * speed * dt * 0.006;
        if (p.x < 0.05) { p.x = 0.05; p.vx = Math.abs(p.vx); }
        if (p.x > 0.95) { p.x = 0.95; p.vx = -Math.abs(p.vx); }
        if (p.y < 0.05) { p.y = 0.05; p.vy = Math.abs(p.vy); }
        if (p.y > 0.95) { p.y = 0.95; p.vy = -Math.abs(p.vy); }

        const el = dotsRef.current[i];
        if (el) {
          el.setAttribute("cx", CYL_X + 6 + p.x * (CYL_W - 12));
          el.setAttribute("cy", gasTop + 6 + p.y * (gasHeight - 12));
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const fill = (volume - 1) / 9;
  const gasTop = CYL_BOTTOM - (0.35 + 0.6 * fill) * CYL_H;

  return (
    <div className="grid h-full w-full place-items-center p-6">
      <svg ref={svgRef} viewBox="0 0 200 260" className="h-full max-h-[520px] w-auto">
        {/* Silindr tashqi devori */}
        <rect
          x={CYL_X}
          y={CYL_TOP}
          width={CYL_W}
          height={CYL_H}
          rx="6"
          className="fill-secondary/50 stroke-border"
          strokeWidth="2"
        />
        {/* Gaz sohasi */}
        <rect
          x={CYL_X + 2}
          y={gasTop}
          width={CYL_W - 4}
          height={CYL_BOTTOM - gasTop - 2}
          rx="4"
          className="fill-primary/10"
        />
        {/* Zarrachalar */}
        {INITIAL_PARTICLES.map((_, i) => (
          <circle
            key={i}
            ref={(el) => (dotsRef.current[i] = el)}
            r="4"
            className="fill-primary"
          />
        ))}
        {/* Piston plastinasi */}
        <rect
          x={CYL_X - 4}
          y={gasTop - 8}
          width={CYL_W + 8}
          height="8"
          rx="3"
          className="fill-foreground/70"
        />
        {/* Piston shtoki */}
        <rect
          x={CYL_X + CYL_W / 2 - 5}
          y={CYL_TOP - 12}
          width="10"
          height={gasTop - 8 - (CYL_TOP - 12)}
          className="fill-foreground/50"
        />
        {/* Osnova */}
        <rect
          x={CYL_X - 12}
          y={CYL_BOTTOM}
          width={CYL_W + 24}
          height="8"
          rx="2"
          className="fill-muted-foreground/40"
        />
      </svg>
    </div>
  );
};

const GasLawsPage = () => {
  const st = useObjectState({
    activeId: "default",
    volume: 5,
    temperature: 300,
    moles: 1,
  });

  const onSelect = (id) => {
    const p = PRESETS[id] ?? PRESETS.default;
    st.setFields({ activeId: id, ...p });
  };

  // Real ideal gaz qonuni: P = nRT / V  (L, K, mol -> kPa)
  const pressure = (st.moles * R * st.temperature) / st.volume;

  return (
    <LabWorkspace
      title="Gaz qonunlari"
      description="Hajm, harorat va mol miqdorini o'zgartirib bosimni hisoblang."
      backTo="/chemistry"
      backLabel="Kimyo"
      items={ITEMS}
      activeId={st.activeId}
      onSelect={onSelect}
      aiContext={{
        hajm_L: Number(st.volume.toFixed(2)),
        harorat_K: Number(st.temperature.toFixed(0)),
        mol_n: Number(st.moles.toFixed(2)),
        bosim_kPa: Number(pressure.toFixed(1)),
      }}
      scene={<GasScene volume={st.volume} temperature={st.temperature} />}
      info={
        <div className="space-y-5">
          <div className="space-y-3">
            <Slider
              label="Hajm V"
              value={st.volume}
              min={1}
              max={10}
              step={0.1}
              unit=" L"
              display={st.volume.toFixed(1)}
              onChange={(v) => st.setField("volume", v)}
            />
            <Slider
              label="Harorat T"
              value={st.temperature}
              min={100}
              max={600}
              step={1}
              unit=" K"
              display={st.temperature.toFixed(0)}
              onChange={(v) => st.setField("temperature", v)}
            />
            <Slider
              label="Mol miqdori n"
              value={st.moles}
              min={0.5}
              max={3}
              step={0.1}
              unit=" mol"
              display={st.moles.toFixed(1)}
              onChange={(v) => st.setField("moles", v)}
            />
          </div>

          <div className="rounded-lg bg-secondary/50 p-3 text-sm">
            <Readout label="Bosim P" value={`${pressure.toFixed(1)} kPa`} />
            <Readout label="Formula" value="PV = nRT" />
            <Readout label="R doimiy" value="8.314 J/(mol·K)" />
          </div>

          <p className="text-xs text-muted-foreground">
            T ↑ (V o'zgarmas) → P ↑. V ↑ → P ↓. Bu ideal gaz qonuni PV = nRT.
          </p>
        </div>
      }
    />
  );
};

export default GasLawsPage;
