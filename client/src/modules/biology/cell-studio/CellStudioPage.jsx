import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Box, Brain, Camera, CircleDot, EyeOff, Gauge, Heart,
  Info, MessageCircle, Plus, RotateCcw, Sparkles, Star, Target, X,
} from "lucide-react";
import useObjectState from "@/shared/hooks/useObjectState";
import CellScene from "./CellScene";
import { cells, getCellById } from "./data/cells";

const MODES = [
  { id: "mesh", label: "Model", Icon: Box },
  { id: "focus", label: "Fokus", Icon: CircleDot },
];

const initial = getCellById("animal");

// Small preview thumbnail for a cell (image if available, else a coloured orb).
const MiniCell = ({ cell, size = 40 }) => {
  const src = cell.renderImage?.url || cell.modelAsset?.previewUrl;
  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-xl"
      style={{ width: size, height: size, background: cell.accentSoft }}
    >
      {src ? (
        <img src={src} alt="" aria-hidden className="h-full w-full object-contain" />
      ) : (
        <span className="h-2/3 w-2/3 rounded-full" style={{ background: cell.accent }} />
      )}
    </span>
  );
};

const Panel = ({ title, icon, action, children, className = "" }) => (
  <section className={`rounded-2xl border border-border bg-card ${className}`}>
    {title && (
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold">{icon}{title}</span>
        {action}
      </div>
    )}
    <div className="p-4">{children}</div>
  </section>
);

const buildTutorPrompts = (cell, organelle) => [
  `${organelle.name} ${cell.name}ning tirik qolishiga qanday yordam berishini tushuntir.`,
  `${cell.name} va ${getCellById(cell.comparison).name} o'rtasidagi vizual farqlar bo'yicha meni sinovdan o'tkaz.`,
  `3D modelda ${organelle.name}ni topishda menga yo'l ko'rsat.`,
  `${cell.name} tuzilishini bitta klinik kuzatuv bilan bog'la (tibbiy maslahat bermay).`,
];

const CellStudioPage = () => {
  const s = useObjectState({
    selectedCellId: initial.id,
    activeOrganelle: initial.defaultOrganelle,
    viewMode: "mesh",
    crossSection: false,
    autoRotate: true,
    resetKey: 0,
    favorites: new Set([initial.id]),
    viewedCells: new Set([initial.id]),
    viewedOrganelleKeys: new Set([`${initial.id}:${initial.defaultOrganelle}`]),
    comparisonOpen: false,
    tutorPrompt: `3D modelda ${initial.organelles[0].name}ni topishda menga yo'l ko'rsat.`,
    toast: null,
  });
  const toastTimer = useRef(null);

  const cell = useMemo(() => getCellById(s.selectedCellId), [s.selectedCellId]);
  const organelle = cell.organelles.find((o) => o.id === s.activeOrganelle) ?? cell.organelles[0];
  const compared = getCellById(cell.comparison);
  const totalOrganelles = useMemo(() => cells.reduce((t, c) => t + c.organelles.length, 0), []);
  const mastery = useMemo(() => {
    const cc = s.viewedCells.size / cells.length;
    const oc = s.viewedOrganelleKeys.size / totalOrganelles;
    return Math.round((cc * 0.42 + oc * 0.58) * 100);
  }, [s.viewedCells, s.viewedOrganelleKeys, totalOrganelles]);

  // Reset organelle + close comparison when the cell changes.
  useEffect(() => {
    s.setFields({ activeOrganelle: cell.defaultOrganelle, comparisonOpen: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell.id]);

  // Track coverage for the mastery meter.
  useEffect(() => {
    s.setFields({
      viewedCells: new Set(s.viewedCells).add(cell.id),
      viewedOrganelleKeys: new Set(s.viewedOrganelleKeys).add(`${cell.id}:${s.activeOrganelle}`),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cell.id, s.activeOrganelle]);

  const showToast = (message) => {
    s.setField("toast", message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => s.setField("toast", null), 2600);
  };

  const toggleFavorite = (id) => {
    const next = new Set(s.favorites);
    next.has(id) ? next.delete(id) : next.add(id);
    s.setField("favorites", next);
  };

  const setMode = (viewMode) => s.setField("viewMode", viewMode);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* top bar */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
        <Link to="/biology" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Biologiya
        </Link>
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: cell.accentSoft, color: cell.accent }}>
          <Sparkles size={16} />
        </span>
        <h1 className="text-sm font-semibold">Hujayra studiyasi</h1>
        <span className="hidden text-xs text-muted-foreground sm:inline">Mikro darajada hayotni o'rganing</span>
      </div>

      {/* body */}
      <div className="grid flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* left rail */}
        <aside className="space-y-4">
          <Panel title="Hujayra turlari" icon={<Star size={15} />}>
            <div className="space-y-1.5">
              {cells.map((c) => {
                const selected = c.id === cell.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => s.setField("selectedCellId", c.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left transition ${
                      selected ? "border-primary/50 bg-secondary" : "border-transparent hover:bg-secondary/60"
                    }`}
                  >
                    <MiniCell cell={c} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-semibold">{c.name}</strong>
                      <span className="block truncate text-xs text-muted-foreground">{c.type}</span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`${c.name} sevimli`}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(c.id); }}
                      className={s.favorites.has(c.id) ? "text-amber-400" : "text-muted-foreground/40 hover:text-muted-foreground"}
                    >
                      <Star size={16} fill="currentColor" />
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel title="Organoidlar" icon={<Sparkles size={15} />}>
            <div className="space-y-1">
              {cell.organelles.map((o) => (
                <button
                  key={o.id}
                  onClick={() => s.setField("activeOrganelle", o.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    s.activeOrganelle === o.id ? "bg-secondary font-medium" : "hover:bg-secondary/60"
                  }`}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: o.color }} />
                  {o.name}
                </button>
              ))}
            </div>
          </Panel>
        </aside>

        {/* center */}
        <main className="space-y-4">
          <Panel className="overflow-hidden">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{cell.name}</h2>
                <p className="text-sm text-muted-foreground">{cell.type}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 rounded-xl border border-border p-1">
                  {MODES.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setMode(id)}
                      title={label}
                      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                        s.viewMode === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={s.crossSection}
                    onChange={(e) => s.setField("crossSection", e.target.checked)}
                    className="accent-primary"
                  />
                  Kesim
                </label>
              </div>
            </div>

            <div className="h-[46vh] min-h-[320px] overflow-hidden rounded-xl border border-border bg-[#fbf7ee]">
              <CellScene
                cell={cell}
                activeOrganelle={s.activeOrganelle}
                viewMode={s.viewMode}
                crossSection={s.crossSection}
                autoRotate={s.autoRotate}
                resetKey={s.resetKey}
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <ToolBtn active={s.autoRotate} onClick={() => s.setField("autoRotate", !s.autoRotate)} icon={<RotateCcw size={15} />}>Aylantirish</ToolBtn>
              <ToolBtn onClick={() => setMode("focus")} icon={<CircleDot size={15} />}>Ajratish</ToolBtn>
              <ToolBtn onClick={() => setMode("focus")} icon={<EyeOff size={15} />}>Boshqasini yashirish</ToolBtn>
              <ToolBtn onClick={() => { s.setField("resetKey", s.resetKey + 1); showToast("Ko'rinish tiklandi."); }} icon={<RotateCcw size={15} />}>Ko'rinishni tiklash</ToolBtn>
              <ToolBtn onClick={() => showToast("Skrinshot funksiyasi keyinroq qo'shiladi.")} icon={<Camera size={15} />}>Skrinshot</ToolBtn>
            </div>
          </Panel>

          {/* bottom: microscope + compare */}
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Mikroskop ko'rinishi" icon={<Info size={15} />}>
              <div className="flex flex-wrap gap-2">
                {cell.microscope.map((image) => (
                  <button
                    key={image.label}
                    onClick={() => showToast(`${image.label} tanlandi.`)}
                    className="flex min-w-[92px] flex-1 flex-col items-center gap-2 rounded-xl border border-border p-2.5 transition hover:border-primary/40"
                  >
                    <span className="h-10 w-full rounded-lg" style={{ background: image.tone }} />
                    <strong className="text-center text-[11px] font-medium leading-tight">{image.label}</strong>
                  </button>
                ))}
                <button
                  onClick={() => showToast("Rasm yuklash rejalashtirilgan qadam.")}
                  className="flex min-w-[92px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border p-2.5 text-muted-foreground hover:border-primary/40"
                >
                  <Plus size={22} />
                  <strong className="text-[11px] font-medium">Rasm qo'shish</strong>
                </button>
              </div>
            </Panel>

            <Panel title="Hujayralarni solishtirish" icon={<Info size={15} />}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MiniCell cell={cell} size={36} />
                  <span className="text-xs">
                    <strong className="block font-semibold">{cell.name}</strong>
                    <em className="not-italic text-muted-foreground">Siz shu yerdasiz</em>
                  </span>
                </div>
                <b className="text-xs text-muted-foreground">VS</b>
                <div className="flex items-center gap-2">
                  <span className="text-right text-xs">
                    <strong className="block font-semibold">{compared.name}</strong>
                    <em className="not-italic text-muted-foreground">{compared.type}</em>
                  </span>
                  <MiniCell cell={compared} size={36} />
                </div>
              </div>
              <button
                onClick={() => s.setField("comparisonOpen", true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Solishtirish oynasini ochish <ArrowRight size={16} />
              </button>
            </Panel>
          </div>
        </main>

        {/* right rail */}
        <aside className="space-y-4">
          <Panel
            title="Organoid tafsilotlari"
            action={
              <button onClick={() => toggleFavorite(cell.id)} aria-label="Sevimli">
                <Heart size={18} fill={s.favorites.has(cell.id) ? "currentColor" : "none"} className="text-rose-500" />
              </button>
            }
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl" style={{ background: organelle.color }} />
              <div>
                <h3 className="font-semibold">{organelle.name}</h3>
                <p className="text-xs text-muted-foreground">{organelle.subtitle}</p>
              </div>
            </div>
            <dl className="space-y-1.5">
              {organelle.attributes.map((a) => (
                <div key={a.label} className="flex justify-between gap-3 text-sm">
                  <dt className="text-muted-foreground">{a.label}</dt>
                  <dd className="text-right font-medium">{a.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Biologik izohlar">
            <p className="text-sm text-muted-foreground">{organelle.note}</p>
            <div className="mt-3 rounded-xl bg-secondary/60 p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Klinik kontekst</span>
              <p className="mt-1 text-sm">{cell.clinicalContext}</p>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <span>Qiziqarli fakt: {organelle.fact}</span>
            </div>
          </Panel>

          <Panel title="AI o'qituvchi" icon={<Brain size={15} />}>
            <div className="rounded-xl bg-secondary/60 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Gauge size={16} /> O'zlashtirish <strong className="ml-auto">{mastery}%</strong>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${mastery}%` }} />
              </div>
              <small className="mt-2 block text-[11px] text-muted-foreground">
                {s.viewedCells.size}/{cells.length} hujayra ko'rildi · {s.viewedOrganelleKeys.size}/{totalOrganelles} organoid tekshirildi
              </small>
            </div>

            <div className="mt-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Target size={14} /> Joriy dars maqsadi</span>
              <p className="mt-1 text-sm">
                <strong>{organelle.name}</strong>ni toping, vazifasini tushuntiring, so'ng {compared.name}dagi mos tuzilma bilan solishtiring.
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-border p-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><MessageCircle size={14} /> AI uchun tayyorlangan so'rov</span>
              <p className="mt-1 text-sm">{s.tutorPrompt}</p>
            </div>

            <div className="mt-3 space-y-1.5">
              {buildTutorPrompts(cell, organelle).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { s.setField("tutorPrompt", prompt); showToast("AI so'rovi tayyorlandi."); }}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-xs transition hover:bg-secondary"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Qayerda uchraydi">
            <div className="mb-2 h-16 rounded-xl" style={{ background: `linear-gradient(135deg, ${cell.accentSoft}, ${cell.accent})` }} />
            <h4 className="font-semibold">{cell.occurrence.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{cell.occurrence.body}</p>
          </Panel>
        </aside>
      </div>

      {/* comparison modal */}
      {s.comparisonOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && s.setField("comparisonOpen", false)}
        >
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">Solishtirish ko'rinishi</h3>
                <p className="text-sm text-muted-foreground">{cell.name} — {compared.name} bilan</p>
              </div>
              <button onClick={() => s.setField("comparisonOpen", false)} className="rounded-lg border border-border p-1.5 hover:bg-secondary">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[cell, compared].map((item) => {
                const org = item.organelles.find((o) => o.id === item.defaultOrganelle) ?? item.organelles[0];
                return (
                  <section key={item.id} className="rounded-xl border border-border p-4 text-center">
                    <div className="flex justify-center"><MiniCell cell={item} size={56} /></div>
                    <h4 className="mt-2 font-semibold">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">{item.type}</p>
                    <dl className="mt-3 space-y-1.5 text-left text-sm">
                      <Row label="Asosiy fokus" value={org.name} />
                      <Row label="Asosiy izoh" value={org.subtitle} />
                      <Row label="Uchraydi" value={item.occurrence.title} />
                    </dl>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {s.toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {s.toast}
        </div>
      )}
    </div>
  );
};

const ToolBtn = ({ active, onClick, icon, children }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
      active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary"
    }`}
  >
    {icon} {children}
  </button>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between gap-3">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-medium">{value}</dd>
  </div>
);

export default CellStudioPage;
