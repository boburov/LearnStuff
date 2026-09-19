// Chap panel: qidiruv (3432 tushuncha), portlatish slayderi va 15 tizim
// ko'rinuvchanligi. Barcha holat sahifada (HumanAtlasPage) turadi.
import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { SYSTEMS, FEATURED_CONCEPTS, translateName } from "./data/systems";

const MAX_RESULTS = 40;

const AtlasControls = ({
  atlas,
  query,
  onQuery,
  onChoose,
  explode,
  onExplode,
  visible,
  onToggleSystem,
  onOnlySystem,
  onVisible,
  counts,
  visibleCount,
}) => {
  // Qidiruv inglizcha manba nomi va o'zbekcha tarjima bo'yicha ishlaydi.
  const results = useMemo(() => {
    if (!atlas) return [];
    const term = query.toLowerCase().trim();
    if (!term)
      return FEATURED_CONCEPTS.map((name) =>
        atlas.concepts.find((c) => c.name.toLowerCase() === name),
      ).filter(Boolean);
    return atlas.concepts
      .filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.id.toLowerCase().includes(term) ||
          translateName(c.name).toLowerCase().includes(term),
      )
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, MAX_RESULTS);
  }, [atlas, query]);

  const activeSystems = SYSTEMS.filter((s) => counts[s.id] > 0);
  const pct = Math.round(explode * 100);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Tuzilmani qidirish</h2>
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Yurak, femur, buyrak…"
            aria-label="Anatomik tuzilmani qidirish"
            className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-8 text-sm outline-none focus:border-primary"
          />
          {query && (
            <button
              onClick={() => onQuery("")}
              aria-label="Tozalash"
              className="absolute right-2 top-2 grid size-5 place-items-center rounded text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <ul className="max-h-56 space-y-0.5 overflow-y-auto rounded-lg border border-border p-1">
          {results.length === 0 && (
            <li className="px-2 py-3 text-center text-xs text-muted-foreground">Hech narsa topilmadi.</li>
          )}
          {results.map((c) => {
            const uz = translateName(c.name);
            return (
              <li key={c.id}>
                <button
                  onClick={() => onChoose(c)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-secondary"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{uz}</span>
                    {uz.toLowerCase() !== c.name.toLowerCase() && (
                      <span className="block truncate text-[11px] text-muted-foreground">{c.name}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{c.elements.length} qism</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-muted-foreground">
          {query ? `Eng ko'pi ${MAX_RESULTS} ta natija. Kichik tuzilmalar uchun aniqroq yozing.` : "Asosiy a'zolar. Istalgan nomni inglizcha yoki o'zbekcha yozing."}
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <h2 className="font-semibold">Portlatish</h2>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={pct}
          onChange={(e) => onExplode(Number(e.target.value) / 100)}
          aria-label="Anatomiyani portlatish darajasi"
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Yig'ilgan</span>
          <span>Har bir qism</span>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tizimlar</h2>
          <div className="flex gap-1 text-[11px]">
            <button onClick={() => onVisible(activeSystems.map((s) => s.id))} className="rounded px-1.5 py-0.5 text-primary hover:bg-secondary">
              Hammasi
            </button>
            <button onClick={() => onVisible([])} className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-secondary">
              Yashirish
            </button>
          </div>
        </div>
        <ul className="space-y-0.5">
          {activeSystems.map((s) => {
            const on = visible.includes(s.id);
            return (
              <li key={s.id} className={cn("flex items-center gap-2 rounded-md px-1.5 py-1 text-xs", on ? "" : "opacity-60")}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => onToggleSystem(s.id)}
                  aria-label={`${s.name} tizimini ko'rsatish`}
                  className="accent-primary"
                />
                <button
                  onClick={() => onOnlySystem(s.id)}
                  title={`Faqat ${s.name.toLowerCase()}`}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left hover:text-primary"
                >
                  <span className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.name}</span>
                </button>
                <span className="text-[11px] tabular-nums text-muted-foreground">{counts[s.id]}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-[11px] text-muted-foreground">{visibleCount.toLocaleString("uz")} ta qism ko'rinmoqda. Nomni bossangiz faqat shu tizim qoladi.</p>
      </section>

      <p className="border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Manba: BodyParts3D 4.0, © The Database Center for Life Science, CC BY 4.0. Katta yoshli erkak
        etalon anatomiyasi; ta'lim uchun, tibbiy tashxis vositasi emas.
      </p>
    </div>
  );
};

export default AtlasControls;
