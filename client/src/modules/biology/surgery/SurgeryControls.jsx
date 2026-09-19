// Left-panel controls for the dissection page: per-layer opacity sliders
// (peel away skin/muscle) + a scalpel section that drives the clipping plane.
import { SURGERY_LAYERS } from "@/modules/biology/data/surgery";

const AXES = [
  { id: "x", label: "Ko'ndalang" },
  { id: "y", label: "Bo'yiga" },
  { id: "z", label: "Old-orqa" },
];

const SurgeryControls = ({ layers, onLayer, clip, onClip }) => (
  <div className="space-y-6">
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Qatlamlar</h2>
      {SURGERY_LAYERS.map((l) => {
        const pct = Math.round((layers[l.slug] ?? 0) * 100);
        return (
          <div key={l.slug} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: l.color }}
                />
                {l.title}
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={pct}
              onChange={(e) => onLayer(l.slug, Number(e.target.value) / 100)}
              className="w-full accent-primary"
            />
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Tashqi qatlamni 0% ga tushirsangiz, ichkarisi ko'rinadi.
      </p>
    </section>

    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Skalpel (kesish)</h2>
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={clip.enabled}
            onChange={(e) => onClip({ enabled: e.target.checked })}
            className="accent-primary"
          />
          Yoqish
        </label>
      </div>

      <div
        className={
          clip.enabled ? "space-y-3" : "pointer-events-none space-y-3 opacity-40"
        }
      >
        <div className="flex gap-1.5">
          {AXES.map((a) => (
            <button
              key={a.id}
              onClick={() => onClip({ axis: a.id })}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors ${
                clip.axis === a.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>Kesish joyi</span>
            <span className="text-muted-foreground">
              {Math.round(clip.position * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(clip.position * 100)}
            onChange={(e) => onClip({ position: Number(e.target.value) / 100 })}
            className="w-full accent-primary"
          />
        </div>

        <button
          onClick={() => onClip({ flip: !clip.flip })}
          className="w-full rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-secondary"
        >
          Yo'nalishni almashtirish
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Skalpel faqat yumshoq to'qimani (mushak, tomir) kesadi; a'zolar butun qoladi.
      </p>
    </section>
  </div>
);

export default SurgeryControls;
