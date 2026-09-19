// Corner detail card shown when a body part is clicked in the 3D model.
// Slides in from the top-right corner; does not block the scene behind it.
import { X } from "lucide-react";

const AnatomyDetailModal = ({ part, onClose }) => {
  if (!part) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 w-72 max-w-[calc(100%-2rem)]">
      <div className="pointer-events-auto animate-in fade-in slide-in-from-right-5 slide-in-from-top-2 rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur duration-200">
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 size-4 shrink-0 rounded-full ring-1 ring-black/10"
            style={{ backgroundColor: part.color }}
          />
          <h3 className="flex-1 text-base font-semibold leading-tight">
            {part.label}
          </h3>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <X size={15} />
          </button>
        </div>

        {part.desc && (
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {part.desc}
          </p>
        )}
      </div>
    </div>
  );
};

export default AnatomyDetailModal;
