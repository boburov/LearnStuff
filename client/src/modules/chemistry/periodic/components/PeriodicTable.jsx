import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { elements } from "@/modules/chemistry/data/elements";
import { CATEGORY_META, CATEGORY_ORDER } from "../utils/categories";
import ElementCard from "./ElementCard";

// Interactive 118-element periodic table with search + category filter + legend.
const PeriodicTable = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const set = new Set();
    elements.forEach((el) => {
      const byText =
        !q ||
        el.symbol.toLowerCase().startsWith(q) ||
        el.name.toLowerCase().includes(q) ||
        String(el.number) === q;
      const byCat = !activeCat || el.category === activeCat;
      if (byText && byCat) set.add(el.number);
    });
    return set;
  }, [q, activeCat]);

  const isDimmed = (el) => (q || activeCat) && !matches.has(el.number);

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Element qidirish..."
            className="w-52 rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        {activeCat && (
          <button
            onClick={() => setActiveCat(null)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            Filtrni tozalash
          </button>
        )}
      </div>

      {/* legend / category filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_ORDER.map((cat) => {
          const meta = CATEGORY_META[cat];
          const active = activeCat === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(active ? null : cat)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition ${
                active ? "border-foreground bg-secondary" : "border-transparent hover:bg-secondary/60"
              }`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.bg }} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* grid */}
      <div className="overflow-x-auto pb-2">
        <div
          className="grid min-w-[820px] gap-[3px]"
          style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))" }}
        >
          {elements.map((el) => (
            <ElementCard key={el.number} element={el} dimmed={isDimmed(el)} onClick={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PeriodicTable;
