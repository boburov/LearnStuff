import LabWorkspace from "@/shared/lab/LabWorkspace";
import useObjectState from "@/shared/hooks/useObjectState";

const PRESETS = [
  { id: "lemon", name: "Limon", ph: 2 },
  { id: "water", name: "Suv", ph: 7 },
  { id: "soap", name: "Sovun", ph: 9 },
  { id: "naoh", name: "Ishqor", ph: 13 },
];

// Universal indikator rangi: pH -> rang.
const phColor = (ph) => {
  if (ph < 3) return "#e11d48"; // 0-2 qizil
  if (ph < 6) return "#f97316"; // 3-5 to'q sariq
  if (ph < 8) return "#22c55e"; // 6-7 yashil
  if (ph < 10) return "#14b8a6"; // 8-9 firuza
  return "#7c3aed"; // 10-14 binafsha
};

const holatiOf = (ph) => (ph < 7 ? "Kislotali" : ph > 7 ? "Ishqoriy" : "Neytral");

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

const Beaker = ({ ph }) => {
  const color = phColor(ph);
  // pH 0 -> deyarli to'la, pH 14 -> pastroq daraja (faqat vizual jonlantirish).
  const fillTop = 90 - (14 - ph) * 2; // 62..90 oralig'i
  const fillHeight = 250 - fillTop;
  return (
    <div className="grid h-full w-full place-items-center p-6">
      <svg viewBox="0 0 200 300" className="h-full max-h-[70vh] w-auto">
        <defs>
          <clipPath id="beakerClip">
            <path d="M45 40 L45 250 Q45 270 65 270 L135 270 Q155 270 155 250 L155 40 Z" />
          </clipPath>
          <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.75" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* Suyuqlik */}
        <g clipPath="url(#beakerClip)">
          <rect
            x="45"
            y={fillTop}
            width="110"
            height={fillHeight}
            fill="url(#liquidGrad)"
            style={{ transition: "y 0.2s, height 0.2s, fill 0.2s" }}
          />
          {/* Yuza chizig'i */}
          <ellipse
            cx="100"
            cy={fillTop}
            rx="55"
            ry="6"
            fill={color}
            opacity="0.55"
            style={{ transition: "cy 0.2s, fill 0.2s" }}
          />
        </g>

        {/* Stakan konturi */}
        <path
          d="M45 40 L45 250 Q45 270 65 270 L135 270 Q155 270 155 250 L155 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted-foreground"
        />
        {/* Og'iz */}
        <path
          d="M38 40 L162 40"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="text-muted-foreground"
        />

        <text
          x="100"
          y="150"
          textAnchor="middle"
          className="fill-white font-bold"
          style={{ fontSize: 34 }}
        >
          pH {ph.toFixed(1)}
        </text>
      </svg>
    </div>
  );
};

const PhPage = () => {
  const { ph, activeId, setFields } = useObjectState({ ph: 7, activeId: "water" });

  const selectPreset = (id) => {
    const p = PRESETS.find((x) => x.id === id);
    if (p) setFields({ ph: p.ph, activeId: id });
  };

  const setPh = (v) => setFields({ ph: v, activeId: null });

  const holati = holatiOf(ph);
  const hConc = Math.pow(10, -ph).toExponential(1);

  return (
    <LabWorkspace
      title="pH simulyatsiya"
      description="Eritma kuchini o'zgartirib pH va indikator rangini kuzating."
      backTo="/chemistry"
      backLabel="Kimyo"
      items={PRESETS}
      activeId={activeId}
      onSelect={selectPreset}
      aiContext={{ ph: Number(ph.toFixed(1)), holati }}
      scene={<Beaker ph={ph} />}
      info={
        <div className="space-y-5">
          <Slider
            label="pH darajasi"
            value={ph}
            min={0}
            max={14}
            step={0.1}
            display={ph.toFixed(1)}
            onChange={setPh}
          />

          <div className="text-xs">
            <Readout label="pH qiymati" value={ph.toFixed(1)} />
            <Readout label="[H⁺] (mol/L)" value={hConc} />
            <Readout label="Holati" value={holati} />
          </div>

          <p className="rounded-md bg-secondary/50 p-3 text-xs text-muted-foreground">
            Har bir pH pog'ona = 10 baravar [H⁺] konsentratsiya farqi. Ya'ni pH 4
            eritma pH 5 dan 10 marta kuchliroq kislotali.
          </p>
        </div>
      }
    />
  );
};

export default PhPage;
