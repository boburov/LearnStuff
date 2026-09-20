// A compact element palette ("davriy jadval"): clickable CPK-coloured tiles.
// Clicking an element pours one atom of it into the vessel.
import { X } from "lucide-react";
import { ELEMENT_SUBSTANCES } from "@/modules/chemistry/data/substances";

// Atomic numbers for the offered elements (display only).
const NUMBER = {
  H: 1, C: 6, N: 7, O: 8, Na: 11, Mg: 12, S: 16, Cl: 17,
  K: 19, Ca: 20, Mn: 25, Fe: 26, Cu: 29, Zn: 30,
};

const PeriodicTableModal = ({ onPick, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">Davriy jadval</h2>
        <span className="text-xs text-muted-foreground">Bosing - idishga qo'shiladi</span>
        <button
          onClick={onClose}
          aria-label="Yopish"
          className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2 p-4 sm:grid-cols-7">
        {ELEMENT_SUBSTANCES.map((el) => (
          <button
            key={el.id}
            onClick={() => onPick(el)}
            title={el.name}
            style={{ backgroundColor: el.color }}
            className="flex aspect-square flex-col items-center justify-center rounded-lg p-1 leading-none text-slate-900 ring-1 ring-black/10 transition hover:scale-110 hover:ring-2 hover:ring-primary"
          >
            <span className="text-[8px] opacity-70">{NUMBER[el.formula] ?? ""}</span>
            <span className="text-sm font-bold">{el.formula}</span>
            <span className="mt-0.5 max-w-full truncate text-[7px] opacity-80">
              {el.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default PeriodicTableModal;
