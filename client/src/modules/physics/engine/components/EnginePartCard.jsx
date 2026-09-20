import { Cog, X } from "lucide-react";
import { PART_BY_ID } from "../engineParts";

// Bottom-left above the toolbar: clear of the top HUD and of the engine's head on narrow scenes.
const EnginePartCard = ({ partId, onClose }) => {
  const part = partId ? PART_BY_ID[partId] : null;
  if (!part) return null;

  return (
    <div
      className="pointer-events-none absolute bottom-20 left-4 z-30 w-80 max-w-[calc(100%-2rem)]"
    >
      <div
        key={part.id}
        className="pointer-events-auto max-h-[45vh] overflow-y-auto animate-in fade-in slide-in-from-left-5 slide-in-from-bottom-2 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur duration-200"
      >
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Cog size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Dvigatel qismi
            </p>
            <h3 className="text-lg font-semibold leading-tight">{part.label}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{part.desc}</p>
      </div>
    </div>
  );
};

export default EnginePartCard;
