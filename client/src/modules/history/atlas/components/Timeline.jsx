import { MIN_YEAR, MAX_YEAR, YEARS, formatYear } from "../data/atlasYears";

// Pastdagi vaqt jadvali: yilni surganda xarita davlat chegaralari o'zgaradi.
export default function Timeline({ value, onChange }) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-center">
          <span className="rounded-md bg-primary px-4 py-1 text-lg font-bold text-primary-foreground tabular-nums">
            {formatYear(value)}
          </span>
        </div>

        <input
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="Yil"
        />

        {/* Mavjud snapshot yillarining belgilari */}
        <div className="relative mt-1 h-4 select-none">
          {YEARS.map((y) => {
            const pct = ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
            return (
              <button
                key={y}
                onClick={() => onChange(y)}
                style={{ left: `${pct}%` }}
                className="absolute -translate-x-1/2 text-[10px] text-white/70 hover:text-white"
                title={formatYear(y)}
              >
                |
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
