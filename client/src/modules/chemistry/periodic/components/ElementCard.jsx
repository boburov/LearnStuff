import { getCategoryMeta } from "../utils/categories";
import { atomicMasses } from "../utils/chemMath";

// One cell in the periodic table grid — full category colour like Zperiod.
const ElementCard = ({ element, dimmed, onClick }) => {
  const { bg, text } = getCategoryMeta(element.category);
  const mass = atomicMasses[element.symbol];

  // "La-Lu" / "Ac-Lr" series placeholders: a label, not a clickable element.
  if (element.series) {
    return (
      <div
        style={{ gridColumn: element.column, gridRow: element.row, background: bg, color: text }}
        className={`grid aspect-square place-items-center rounded-[15%] text-[8px] font-semibold leading-tight ${
          dimmed ? "opacity-20" : "opacity-100"
        }`}
        title={element.name}
      >
        <span>{element.symbol}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(element)}
      style={{ gridColumn: element.column, gridRow: element.row, background: bg, color: text }}
      className={`group relative flex aspect-square flex-col justify-between rounded-[15%] border border-black/10 p-1 text-left transition hover:z-10 hover:scale-[1.18] hover:shadow-lg ${
        dimmed ? "opacity-20" : "opacity-100"
      }`}
      title={element.name}
    >
      <div className="flex items-center justify-between text-[7px] leading-none opacity-70">
        <span>{element.number}</span>
        {mass && <span className="hidden sm:inline">{Math.round(mass)}</span>}
      </div>
      <div className="text-center text-[11px] font-bold leading-none sm:text-sm">
        {element.symbol}
      </div>
      <div className="truncate text-center text-[6px] leading-none opacity-70 sm:text-[7px]">
        {element.name}
      </div>
    </button>
  );
};

export default ElementCard;
