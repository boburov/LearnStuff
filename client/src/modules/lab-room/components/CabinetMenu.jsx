import { useEffect, useMemo, useRef } from "react";
import { X } from "lucide-react";
import Button from "@/shared/components/ui/button/Button";
import Input from "@/shared/components/ui/input/Input";
import useObjectState from "@/shared/hooks/useObjectState";
import { useSnap } from "@/shared/utils/snapStore";
import { cn } from "@/shared/utils/cn";
import { EQUIPMENT } from "../equipment/catalog";
import { HAZARDS, STATES, SUBSTANCES } from "../substances/catalog";
import { SUBSTANCE_PREFIX, bodyBounds, objectType } from "../world/objectTypes";
import { PROMPTS } from "../world/prompts";
import { CABINET } from "../data/labRoomContent";
import KeyCap from "./KeyCap";
import Hotbar from "./Hotbar";

// The GHS icon module ships with the substance templates; the menu falls back to text until it exists.
const GHS_MODULE = Object.values(import.meta.glob("../substances/labels/ghs.js", { eager: true }))[0];
const DRAG_START = 6;
const ROW = 158;

const SECTION_DOT = {
  liquid: "bg-sky-500",
  powder: "bg-amber-500",
  solid: "bg-stone-500",
  gas: "bg-emerald-500",
  equipment: "bg-violet-500",
  search: "bg-slate-500",
};

// Thumbnails are framed to fill their square, so real size decides how big each item stands on the shelf.
const shelfSize = (typeId) => {
  const { half } = bodyBounds(objectType(typeId).body);
  const extent = Math.max(half[1] * 2, Math.max(half[0], half[2]) * 2 * 0.55);
  return Math.round(Math.min(100, Math.max(60, 44 + extent * 330)));
};

const substanceItem = (s) => {
  const typeId = `${SUBSTANCE_PREFIX}${s.id}`;
  return { typeId, name: s.name, formula: s.formula, detail: s.detail, hazards: s.hazards, description: s.description, size: shelfSize(typeId), clear: false };
};

// Empty clear glassware nearly vanishes in a flat thumbnail, so it gets lifted on the dark shelves.
const equipmentItem = (e) => ({
  typeId: e.id,
  name: e.name,
  formula: "",
  detail: "",
  hazards: [],
  description: "",
  size: shelfSize(e.id),
  clear: objectType(e.id).body.breaks === "glass",
});

const REAGENT_SECTIONS = STATES.map((s) => ({
  id: s.id,
  name: s.name,
  items: SUBSTANCES.filter((substance) => substance.state === s.id).map(substanceItem),
}));
const EQUIPMENT_SECTION = { id: "equipment", name: "Jihozlar", items: EQUIPMENT.map(equipmentItem) };
const ALL_ITEMS = [...REAGENT_SECTIONS.flatMap((s) => s.items), ...EQUIPMENT_SECTION.items];
const TABS = [...STATES, { id: "equipment", name: EQUIPMENT_SECTION.name }];

const matches = (item, query) => {
  const q = query.trim().toLowerCase();
  return item.name.toLowerCase().includes(q) || item.formula.toLowerCase().includes(q);
};

// Shelf boards repeat with the grid rows: board top, front lip, then the lip's shadow on the back panel.
const SHELF_STYLE = {
  backgroundImage: [
    "linear-gradient(to bottom, transparent 118px, rgba(15,23,32,0.2) 118px, rgba(15,23,32,0) 132px)",
    "linear-gradient(to bottom, transparent 106px, #fbfcfd 106px, #e2e6ea 107.5px, #aeb7c0 118px, transparent 118px)",
    "linear-gradient(to bottom, transparent 94px, #c3cad1 94px, #eceff2 106px, transparent 106px)",
  ].join(","),
  backgroundSize: `100% ${ROW}px`,
  backgroundRepeat: "repeat-y",
};

// A darker perforated back panel keeps clear glassware readable.
const BACK_PANEL_STYLE = {
  backgroundColor: "#3d454d",
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.09) 1px, transparent 1.6px)",
  backgroundSize: "11px 11px",
  backgroundAttachment: "local",
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const WarningSign = () => (
  <svg viewBox="0 0 32 28" className="h-7 w-8 shrink-0" aria-hidden="true">
    <path d="M16 2 30.5 26.5h-29Z" fill="#facc15" stroke="#111827" strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M16 10v8.5" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
    <circle cx="16" cy="22.3" r="1.8" fill="#111827" />
  </svg>
);

const HazardIcon = ({ id }) =>
  GHS_MODULE?.ghsDataUrl ? (
    <img src={GHS_MODULE.ghsDataUrl(id, 96)} alt="" className="size-9" draggable={false} />
  ) : (
    <span className="grid size-9 place-items-center rounded bg-red-600/85 text-xs font-bold text-white">!</span>
  );

const Door = ({ side }) => (
  <div
    aria-hidden="true"
    className={cn(
      "pointer-events-none absolute inset-y-0 z-20 w-1/2 border-[7px] border-[#c3c9cf] bg-[linear-gradient(115deg,rgba(255,255,255,0.42)_0%,rgba(214,232,240,0.14)_38%,rgba(255,255,255,0.3)_52%,rgba(214,232,240,0.1)_70%,rgba(255,255,255,0.22)_100%)] shadow-[inset_0_0_0_1px_rgba(15,23,32,0.25),0_0_24px_rgba(15,23,32,0.3)] motion-reduce:hidden",
      side === "left" ? "left-0 origin-left animate-cabinet-door-left" : "right-0 origin-right animate-cabinet-door-right",
    )}
  >
    <span
      className={cn(
        "absolute top-1/2 h-28 w-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#7d868f] via-[#f1f3f5] to-[#7d868f] shadow",
        side === "left" ? "right-2" : "left-2",
      )}
    />
  </div>
);

const Shelf = ({ section, urls, sectionRef, onItemPointerDown, onItemHover, onItemKey }) => (
  <section ref={sectionRef} className="pb-2">
    <div className="mb-1.5 flex items-center gap-2 px-1 pt-3">
      <span className="flex items-center gap-2 rounded-[3px] border border-[#b3bbc3] bg-gradient-to-b from-white to-[#dde2e6] px-2.5 py-1 shadow-[0_1px_2px_rgba(15,23,32,0.2)]">
        <span className="size-1.5 rounded-full bg-[#9aa3ac]" />
        <span className={cn("size-2 rounded-full", SECTION_DOT[section.id])} />
        <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-[#26323d]">{section.name}</span>
        <span className="text-[13px] font-semibold tabular-nums text-[#6b7783]">{section.items.length}</span>
        <span className="size-1.5 rounded-full bg-[#9aa3ac]" />
      </span>
    </div>
    <div className="grid grid-cols-[repeat(auto-fill,minmax(108px,1fr))]" style={{ ...SHELF_STYLE, gridAutoRows: `${ROW}px` }}>
      {section.items.map((item) => (
        <div
          key={item.typeId}
          role="button"
          tabIndex={0}
          aria-label={item.formula ? `${item.name} (${item.formula})` : item.name}
          onPointerDown={(e) => onItemPointerDown(e, item)}
          onPointerEnter={() => onItemHover(item.typeId)}
          onFocus={() => onItemHover(item.typeId)}
          onKeyDown={(e) => onItemKey(e, item)}
          className="group relative flex cursor-grab flex-col items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        >
          <div className="relative flex h-[100px] w-full items-end justify-center">
            <span className="absolute bottom-0 h-2.5 w-3/5 rounded-[50%] bg-[#0f1720]/30 blur-[3px]" />
            {urls[item.typeId] ? (
              <img
                src={urls[item.typeId]}
                alt=""
                draggable={false}
                style={{ width: item.size, height: item.size }}
                className={cn(
                  "relative object-contain transition-transform duration-150 group-hover:-translate-y-1.5",
                  item.clear
                    ? "[filter:brightness(1.6)_drop-shadow(0_0_1px_rgba(255,255,255,0.45))]"
                    : "[filter:drop-shadow(0_0_1px_rgba(255,255,255,0.22))]",
                )}
              />
            ) : (
              <span className="relative mb-3 size-9 animate-pulse rounded-full bg-white/15" />
            )}
          </div>
          <div className="mt-[10px] w-[92%] rounded-[2px] border border-[#d5d2c2] bg-[#fffdf5] px-1 py-0.5 text-center shadow-[0_1px_2px_rgba(15,23,32,0.18)]">
            <p className="line-clamp-2 text-[12px] font-semibold leading-[12px] text-[#1f2933]">{item.name}</p>
            {item.formula && <p className="truncate font-mono text-[12px] leading-[12px] text-[#52606d]">{item.formula}</p>}
          </div>
        </div>
      ))}
    </div>
  </section>
);

const CabinetMenu = ({ world, thumbs, onClose }) => {
  const { urls } = useSnap(thumbs.store);
  const cabinetRef = useRef(null);
  const scrollerRef = useRef(null);
  const ghostRef = useRef(null);
  const pointer = useRef(null);
  const sectionEls = useRef({});
  const pendingSection = useRef(null);
  const scrollLock = useRef(0);
  const { view, section, query, hovered, drag, setField, setFields } = useObjectState({
    view: "reagents",
    section: "liquid",
    query: "",
    hovered: null,
    drag: null,
  });

  const searching = Boolean(query.trim());
  const sections = useMemo(() => {
    if (searching) return [{ id: "search", name: CABINET.results, items: ALL_ITEMS.filter((item) => matches(item, query)) }];
    return view === "equipment" ? [EQUIPMENT_SECTION] : REAGENT_SECTIONS;
  }, [searching, query, view]);

  useEffect(() => {
    thumbs.request(ALL_ITEMS.map((item) => item.typeId));
  }, [thumbs]);

  // useObjectState setters change identity every render; the window listeners below must stay mounted.
  const setters = useRef({ setField, setFields });
  useEffect(() => {
    setters.current = { setField, setFields };
  });

  // A tab switch that also changes the shelves scrolls once the new shelves exist.
  useEffect(() => {
    const id = pendingSection.current;
    const scroller = scrollerRef.current;
    if (!id || !scroller) return;
    pendingSection.current = null;
    scroller.scrollTop = Math.max(0, (sectionEls.current[id]?.offsetTop ?? 0) - 4);
  });

  // Pointer handling lives on window so a drag can leave the cabinet and land on the bench or the hotbar.
  useEffect(() => {
    const targetAt = (x, y) => {
      const el = document.elementFromPoint(x, y);
      const slot = el?.closest?.("[data-slot]");
      if (slot) return { kind: "slot", slot: Number(slot.dataset.slot) };
      if (cabinetRef.current?.contains(el)) return { kind: "cabinet" };
      return { kind: "room" };
    };

    const onMove = (e) => {
      const p = pointer.current;
      if (!p) return;
      if (!p.started) {
        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_START) return;
        p.started = true;
      }
      if (ghostRef.current) ghostRef.current.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 40}px)`;
      const target = targetAt(e.clientX, e.clientY);
      if (target.kind === "room") {
        world.setDrag({
          typeId: p.typeId,
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: -(e.clientY / window.innerHeight) * 2 + 1,
        });
      } else {
        world.setDrag(null);
      }
      const result = target.kind === "room" ? world.dragResult : null;
      setters.current.setFields({
        drag: { typeId: p.typeId, source: p.source, target, valid: Boolean(result?.valid), reason: result?.reason ?? null },
      });
    };

    const onUp = (e) => {
      const p = pointer.current;
      pointer.current = null;
      if (!p) return;
      if (!p.started) {
        if (p.source.kind === "catalog") {
          const result = world.addToSlot(p.typeId);
          if (!result.ok) world.flash(PROMPTS.reasons.full);
        } else {
          world.selectSlot(p.source.slot);
        }
        return;
      }
      const target = targetAt(e.clientX, e.clientY);
      const placement = world.dragResult;
      if (target.kind === "slot") {
        if (p.source.kind === "catalog") {
          if (!world.addToSlot(p.typeId, target.slot).ok) world.flash(CABINET.slotTaken);
        } else if (p.source.slot !== target.slot) {
          world.swapSlots(p.source.slot, target.slot);
        }
      } else if (target.kind === "room" && placement?.valid) {
        if (p.source.kind === "catalog") world.placeNew(p.typeId, placement.pose, placement.supportId);
        else world.placeHeld(p.source.objectId, placement.pose, placement.supportId);
      } else if (target.kind === "room") {
        world.flash(PROMPTS.reasons[placement?.reason ?? "far"]);
      } else if (target.kind === "cabinet" && p.source.kind === "slot") {
        world.removeHeld(p.source.objectId);
      }
      world.setDrag(null);
      setters.current.setFields({ drag: null });
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      world.setDrag(null);
    };
  }, [world]);

  const startCatalogDrag = (e, item) => {
    if (e.button !== 0) return;
    e.preventDefault();
    pointer.current = { x: e.clientX, y: e.clientY, started: false, typeId: item.typeId, source: { kind: "catalog" } };
  };

  const startSlotDrag = (e, slot, object) => {
    e.preventDefault();
    pointer.current = {
      x: e.clientX,
      y: e.clientY,
      started: false,
      typeId: object.typeId,
      source: { kind: "slot", slot, objectId: object.id },
    };
  };

  const takeWithKeyboard = (e, item) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!world.addToSlot(item.typeId).ok) world.flash(PROMPTS.reasons.full);
  };

  const openTab = (id, timeStamp) => {
    if (id === "equipment") {
      pendingSection.current = "equipment";
      setFields({ view: "equipment", section: "equipment", query: "" });
      return;
    }
    if (view !== "reagents" || searching) {
      pendingSection.current = id;
      setFields({ view: "reagents", section: id, query: "" });
      return;
    }
    const scroller = scrollerRef.current;
    const el = sectionEls.current[id];
    setField("section", id);
    if (!scroller || !el) return;
    scrollLock.current = timeStamp + 700;
    scroller.scrollTo({ top: Math.max(0, el.offsetTop - 4), behavior: reducedMotion() ? "auto" : "smooth" });
  };

  // The tab under the label follows the shelf you have scrolled to.
  const followScroll = (e) => {
    if (view !== "reagents" || searching || e.timeStamp < scrollLock.current) return;
    const scroller = e.currentTarget;
    let current = STATES[0].id;
    for (const s of STATES) {
      const el = sectionEls.current[s.id];
      if (el && el.offsetTop - scroller.scrollTop <= 48) current = s.id;
    }
    if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) current = STATES[STATES.length - 1].id;
    if (current !== section) setField("section", current);
  };

  const hoveredItem = ALL_ITEMS.find((i) => i.typeId === hovered) ?? null;
  const dragging = Boolean(drag);

  return (
    <div className="dark absolute inset-0 z-30 select-none text-white">
      <div
        ref={cabinetRef}
        className={cn(
          "absolute bottom-28 left-5 top-5 flex w-[min(780px,62vw)] flex-col overflow-hidden rounded-md border-[9px] border-[#cdd2d7] bg-[#cdd2d7] shadow-[0_30px_80px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.6)] transition-opacity",
          dragging && drag.target.kind !== "cabinet" && "opacity-35",
        )}
      >
        <div className="relative flex items-center gap-3 border-b border-[#9aa3ac] bg-gradient-to-b from-[#e3e7ea] to-[#c4cad0] px-3 pb-2.5 pt-3.5 text-[#1f2933]">
          <WarningSign />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold uppercase tracking-[0.12em]">{CABINET.title}</p>
            <p className="text-[13px] text-[#52606d]">{CABINET.stock(SUBSTANCES.length, EQUIPMENT.length)}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input
              value={query}
              onChange={(e) => setField("query", e.target.value)}
              placeholder={CABINET.search}
              aria-label={CABINET.search}
              className="h-8 w-44 rounded-md border-[#aeb5bd] bg-white text-sm text-[#1f2933] placeholder:text-[#7b8794]"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label={CABINET.close}
              className="size-8 rounded-md text-[#1f2933] hover:bg-black/10 hover:text-[#1f2933]"
            >
              <X />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 bg-[#bfc6cc] px-2 pt-1.5">
          {TABS.map((t) => {
            const active = !searching && section === t.id;
            return (
              <Button
                key={t.id}
                variant="ghost"
                onClick={(e) => openTab(t.id, e.timeStamp)}
                className={cn(
                  "h-8 gap-1.5 rounded-b-none rounded-t-md px-2.5 text-xs font-semibold",
                  t.id === "equipment" && "ml-auto",
                  active
                    ? "bg-[#e8ebee] text-[#1f2933] hover:bg-[#e8ebee] hover:text-[#1f2933]"
                    : "text-[#3e4a55] hover:bg-white/45 hover:text-[#1f2933]",
                )}
              >
                <span className={cn("size-2 rounded-full", SECTION_DOT[t.id])} />
                {t.name}
              </Button>
            );
          })}
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            key={searching ? "search" : view}
            ref={scrollerRef}
            onScroll={followScroll}
            className="absolute inset-0 overflow-y-auto px-3 pb-3"
            style={BACK_PANEL_STYLE}
          >
            {sections.map((s) => (
              <Shelf
                key={s.id}
                section={s}
                urls={urls}
                sectionRef={(el) => {
                  if (el) sectionEls.current[s.id] = el;
                }}
                onItemPointerDown={startCatalogDrag}
                onItemHover={(typeId) => setField("hovered", typeId)}
                onItemKey={takeWithKeyboard}
              />
            ))}
            {sections.every((s) => !s.items.length) && <p className="py-10 text-center text-sm text-white/75">{CABINET.empty}</p>}
          </div>
          <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_16px_0_20px_-14px_rgba(15,23,32,0.4),inset_-16px_0_20px_-14px_rgba(15,23,32,0.4),inset_0_18px_22px_-16px_rgba(15,23,32,0.5)]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 z-10 h-1 rounded-b-full bg-white/90 shadow-[0_0_18px_6px_rgba(255,255,255,0.55)]" />
          <Door side="left" />
          <Door side="right" />
        </div>

        <div className="flex min-h-[104px] items-center gap-3 border-t-4 border-[#aab2ba] bg-[#f7f7f2] px-4 py-2.5 text-[#1f2933]">
          {hoveredItem ? (
            <>
              <div className="grid size-[76px] shrink-0 place-items-center rounded-md bg-white shadow-inner ring-1 ring-black/5">
                {urls[hoveredItem.typeId] && <img src={urls[hoveredItem.typeId]} alt="" draggable={false} className="size-[68px] object-contain" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {hoveredItem.name}
                  {hoveredItem.formula && <span className="ml-2 font-mono text-[13px] font-medium text-[#52606d]">{hoveredItem.formula}</span>}
                </p>
                {hoveredItem.detail && <p className="text-xs text-[#52606d]">{hoveredItem.detail}</p>}
                {hoveredItem.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed">{hoveredItem.description}</p>}
              </div>
              {hoveredItem.hazards.length > 0 && (
                <div className="flex shrink-0 gap-1">
                  {hoveredItem.hazards.map((h) => (
                    <figure key={h} className="flex w-14 flex-col items-center gap-0.5">
                      <HazardIcon id={h} />
                      <figcaption className="text-center text-[11px] leading-[11px] text-[#52606d]">{HAZARDS[h]}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="flex flex-wrap items-center gap-2 text-xs text-[#52606d]">
              <KeyCap light>E</KeyCap> {CABINET.hint}
            </p>
          )}
        </div>
      </div>

      {dragging && drag.target.kind === "room" && (
        <div className="pointer-events-none absolute right-6 top-6 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold">
          <span className={drag.valid ? "text-emerald-300" : "text-red-300"}>
            {drag.valid ? CABINET.dropHere : PROMPTS.reasons[drag.reason ?? "far"]}
          </span>
        </div>
      )}
      {dragging && drag.target.kind === "cabinet" && drag.source.kind === "slot" && (
        <div className="pointer-events-none absolute right-6 top-6 rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-sky-200">
          {CABINET.returnHere}
        </div>
      )}

      <Hotbar
        world={world}
        thumbs={thumbs}
        highlightSlot={dragging && drag.target.kind === "slot" ? drag.target.slot : null}
        onSlotPointerDown={startSlotDrag}
      />

      {dragging && (
        <div ref={ghostRef} className="pointer-events-none fixed left-0 top-0 z-50 size-20 opacity-90">
          {urls[drag.typeId] && <img src={urls[drag.typeId]} alt="" className="size-20 object-contain" />}
        </div>
      )}
    </div>
  );
};

export default CabinetMenu;
