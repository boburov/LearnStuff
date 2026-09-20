// AI reaksiya: 2 modda + har biriga miqdor kiritiladi, backend orqali Gemini'ga
// yuboriladi va status qaytadi. Status'ga qarab bench'da reaksiya ijro etiladi.
import { Sparkles, X, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import useObjectState from "@/shared/hooks/useObjectState";
import FormulaText from "@/shared/lab/FormulaText";
import { SUBSTANCES } from "@/modules/chemistry/data/substances";
import { REACTION_STYLES, effectForStatus } from "@/modules/chemistry/data/reactions";
import { useAiReaction } from "./useAiReaction";

const SUBSTANCE_BY_ID = Object.fromEntries(SUBSTANCES.map((s) => [s.id, s]));
const UNITS = ["g", "ml", "dona"];

// Suyuqliklar uchun ml, qolganlari uchun g ni boshlang'ich birlik qilib olamiz.
const defaultUnit = (s) => (s?.state === "suyuq" ? "ml" : "g");

const ReagentPicker = ({ label, id, qty, unit, onChange }) => {
  const s = SUBSTANCE_BY_ID[id];
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: s?.color || "#dfe9f2" }}
        />
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <select
        value={id}
        onChange={(e) => {
          const next = SUBSTANCE_BY_ID[e.target.value];
          onChange({ id: e.target.value, unit: defaultUnit(next) });
        }}
        className="mb-2 w-full rounded-lg border border-border bg-card px-2 py-2 text-sm"
      >
        {SUBSTANCES.map((sub) => (
          <option key={sub.id} value={sub.id}>
            {sub.name} ({sub.formula})
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          step="any"
          value={qty}
          onChange={(e) => onChange({ qty: e.target.value })}
          placeholder="Miqdor"
          className="w-full rounded-lg border border-border bg-card px-2 py-2 text-sm"
        />
        <select
          value={unit}
          onChange={(e) => onChange({ unit: e.target.value })}
          className="rounded-lg border border-border bg-card px-2 py-2 text-sm"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const AiReactionModal = ({ onClose, onReaction }) => {
  const { loading, error, result, run } = useAiReaction();
  const form = useObjectState({
    aId: "cmp-dryice",
    aQty: "30",
    aUnit: "g",
    bId: "cmp-h2o",
    bQty: "3",
    bUnit: "ml",
  });

  const subA = SUBSTANCE_BY_ID[form.aId];
  const subB = SUBSTANCE_BY_ID[form.bId];
  const qtyA = Number(form.aQty);
  const qtyB = Number(form.bQty);
  const valid = subA && subB && qtyA > 0 && qtyB > 0;

  const effect = result ? effectForStatus(result.status) : null;

  const start = async () => {
    if (!valid || loading) return;
    const data = await run({
      a: { name: subA.name, formula: subA.formula, quantity: qtyA, unit: form.aUnit },
      b: { name: subB.name, formula: subB.formula, quantity: qtyB, unit: form.bUnit },
    });
    if (data) onReaction?.(subA, subB, data);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Sparkles size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">AI reaksiya</h2>
          <span className="text-xs text-muted-foreground">Miqdorni kiriting</span>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <ReagentPicker
            label="1-modda"
            id={form.aId}
            qty={form.aQty}
            unit={form.aUnit}
            onChange={(p) =>
              form.setFields({
                ...(p.id !== undefined && { aId: p.id }),
                ...(p.qty !== undefined && { aQty: p.qty }),
                ...(p.unit !== undefined && { aUnit: p.unit }),
              })
            }
          />

          <div className="flex items-center justify-center text-muted-foreground">
            <span className="text-lg font-bold">+</span>
          </div>

          <ReagentPicker
            label="2-modda"
            id={form.bId}
            qty={form.bQty}
            unit={form.bUnit}
            onChange={(p) =>
              form.setFields({
                ...(p.id !== undefined && { bId: p.id }),
                ...(p.qty !== undefined && { bQty: p.qty }),
                ...(p.unit !== undefined && { bUnit: p.unit }),
              })
            }
          />

          <button
            type="button"
            onClick={start}
            disabled={!valid || loading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition",
              (!valid || loading) && "cursor-not-allowed opacity-50",
            )}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> AI o'ylamoqda...
              </>
            ) : (
              <>
                Reaksiyani boshlash <ArrowRight size={16} />
              </>
            )}
          </button>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          {effect && (
            <div className={cn("rounded-xl border px-4 py-3", REACTION_STYLES[effect.kind] || "border-border bg-secondary")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{effect.title}</span>
                {result.intensity && (
                  <span className="ml-auto text-[11px] font-semibold opacity-80">
                    Kuchi: {result.intensity}/10
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs opacity-90">{result.description}</p>
              {result.equation && (
                <div className="mt-2 rounded-lg bg-white/50 px-2 py-1 text-xs font-medium">
                  <FormulaText formula={result.equation} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiReactionModal;
