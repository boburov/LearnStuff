// Left panel for the molecule library: back link, search and a
// category-grouped, scrollable list of all molecules.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import FormulaText from "@/shared/lab/FormulaText";

const MoleculeLibrarySidebar = ({
  molecules,
  selectedCid,
  onSelect,
  search,
  onSearch,
}) => {
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = q
      ? molecules.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.nameEn.toLowerCase().includes(q) ||
            m.formula.toLowerCase().includes(q) ||
            m.iupacName.toLowerCase().includes(q),
        )
      : molecules;

    const byCategory = new Map();
    for (const m of matches) {
      const list = byCategory.get(m.category) ?? [];
      list.push(m);
      byCategory.set(m.category, list);
    }
    return [...byCategory.entries()].sort((a, b) =>
      a[1][0].categoryLabel.localeCompare(b[1][0].categoryLabel),
    );
  }, [molecules, search]);

  const total = groups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <Link
          to="/chemistry"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> Kimyo
        </Link>

        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Molekulalar</h1>
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {molecules.length}
          </span>
        </div>

        <div className="relative mt-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={16} />
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Nomi yoki formula bo'yicha qidirish"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {total === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            "{search}" bo'yicha molekula topilmadi.
          </p>
        )}

        {groups.map(([category, list]) => (
          <div key={category} className="mb-3">
            <h3 className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {list[0].categoryLabel}{" "}
              <span className="text-muted-foreground/60">({list.length})</span>
            </h3>
            <ul>
              {list.map((m) => {
                const active = m.cid === selectedCid;
                return (
                  <li key={m.cid}>
                    <button
                      onClick={() => onSelect(m.cid)}
                      className={cn(
                        "flex w-full items-baseline justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-foreground hover:bg-secondary",
                      )}
                    >
                      <span className="truncate">{m.name}</span>
                      <FormulaText
                        formula={m.formula}
                        className="shrink-0 text-xs text-muted-foreground"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MoleculeLibrarySidebar;
