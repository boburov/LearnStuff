// Tanlangan tuzilma kartasi (yuqori o'ng burchak): o'zbekcha nom, manba nomi,
// tizim, izoh, FMA identifikatori va ajratib ko'rsatish tugmasi.
import { ChevronRight, Focus, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { SYSTEM_BY_ID, translateName, explanation } from "./data/systems";

const MAX_MEMBERS = 30;

const AtlasDetailCard = ({ chosen, parts, isolate, onIsolate, onPickPart, onClose }) => {
  if (!chosen || parts.length === 0) return null;
  const first = parts[0];
  const system = SYSTEM_BY_ID[first.system];
  const uz = translateName(chosen.name);
  const info = explanation(chosen.name, first.system);

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 w-80 max-w-[calc(100%-2rem)]">
      <div className="pointer-events-auto animate-in fade-in slide-in-from-right-5 slide-in-from-top-2 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur duration-200">
        <div className="flex items-start gap-2.5">
          <span className="mt-1 size-3.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: system?.color }} />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{system?.name || "Anatomiya"}</div>
            <h3 className="text-base font-semibold leading-tight">{uz}</h3>
            {uz.toLowerCase() !== chosen.name.toLowerCase() && (
              <div className="text-xs text-muted-foreground">{chosen.name}</div>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{info.text}</p>
        {!info.specific && (
          <p className="mt-1 text-[11px] text-muted-foreground/80">Tizim haqida umumiy izoh. Tuzilma manba anatomiyasidan aniqlangan.</p>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-secondary/60 p-2">
            <dt className="text-muted-foreground">Atlas kodi</dt>
            <dd className="font-medium">{chosen.id}</dd>
          </div>
          <div className="rounded-lg bg-secondary/60 p-2">
            <dt className="text-muted-foreground">Tanlangan qismlar</dt>
            <dd className="font-medium">{parts.length.toLocaleString("uz")}</dd>
          </div>
        </dl>

        {parts.length > 1 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold">Tarkibidagi tuzilmalar</h4>
            <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
              {parts.slice(0, MAX_MEMBERS).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => onPickPart(p.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-secondary"
                  >
                    <span className="truncate">{translateName(p.name)}</span>
                    <ChevronRight size={12} className="shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
            {parts.length > MAX_MEMBERS && (
              <p className="mt-1 text-[11px] text-muted-foreground">Yana {parts.length - MAX_MEMBERS} ta qism.</p>
            )}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-1.5">
          <button
            onClick={onIsolate}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isolate ? "bg-secondary text-foreground hover:bg-secondary/70" : "bg-primary text-primary-foreground hover:opacity-90",
            )}
          >
            <Focus size={15} />
            {isolate ? "Atrofidagi anatomiyani ko'rsatish" : "Ajratib ko'rsatish"}
          </button>
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground">
            Tanlovni bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
};

export default AtlasDetailCard;
