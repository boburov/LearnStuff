import { useSnap } from "@/shared/utils/snapStore";
import { cn } from "@/shared/utils/cn";
import { displayName } from "../world/prompts";

const Slot = ({ index, object, url, active, highlight, onPointerDown }) => (
  <div
    data-slot={index}
    onPointerDown={object && onPointerDown ? (e) => onPointerDown(e, index, object) : undefined}
    className={cn(
      "relative grid size-16 place-items-center rounded-xl border bg-black/45 transition-colors",
      active ? "border-violet-300 bg-violet-500/25 shadow-[0_0_0_2px_rgba(196,181,253,0.35)]" : "border-white/15",
      highlight && "border-emerald-300 bg-emerald-400/20",
      object && onPointerDown && "cursor-grab",
    )}
  >
    <span className="absolute left-1.5 top-1 text-[12px] font-semibold text-white/60">{index + 1}</span>
    {object && url && <img src={url} alt="" draggable={false} className="size-14 object-contain" />}
    {object && !url && <span className="size-6 animate-pulse rounded-full bg-white/20" />}
  </div>
);

const Hotbar = ({ world, thumbs, highlightSlot = null, onSlotPointerDown }) => {
  const { hotbar, activeSlot, objects } = useSnap(world.store);
  const { urls } = useSnap(thumbs.store);
  const byId = new Map(objects.map((o) => [o.id, o]));
  const activeObject = byId.get(hotbar[activeSlot]);

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2">
      {activeObject && (
        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium text-white">
          {displayName(activeObject.typeId)}
        </span>
      )}
      <div className="flex gap-2">
        {hotbar.map((id, index) => {
          const object = id ? byId.get(id) : null;
          return (
            <Slot
              key={index}
              index={index}
              object={object}
              url={object ? urls[object.typeId] : null}
              active={index === activeSlot}
              highlight={index === highlightSlot}
              onPointerDown={onSlotPointerDown}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Hotbar;
