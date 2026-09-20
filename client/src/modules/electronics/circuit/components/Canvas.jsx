// SVG workspace: pan/zoom, drop-to-place, drag-to-move, click-pin-to-wire.
import { useCallback, useEffect, useRef, useState } from "react";
import { getPart, parsePinKey } from "../engine/parts";
import { PartDefs } from "./parts/bodies";
import PartNode from "./PartNode";
import Wire from "./Wire";

const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v));

const wireColorFor = (compType, pinId) => {
  const part = getPart(compType);
  const role = part?.pins.find((p) => p.id === pinId)?.role;
  if (role === "gnd") return "#0f172a";
  if (role === "power5v" || role === "power3v3") return "#ef4444";
  if (role === "analog" || role === "wiper") return "#eab308";
  return "#22c55e";
};

const Canvas = ({ doc, dispatch, store, running }) => {
  const svgRef = useRef(null);
  const [view, setView] = useState({ x: 40, y: 40, z: 0.85 });
  const [pending, setPending] = useState(null); // { fromKey, fromPos }
  const [cursor, setCursor] = useState(null);
  const panRef = useRef(null);

  const compMap = {};
  for (const c of doc.components) compMap[c.id] = c;

  const pinPos = useCallback(
    (key) => {
      const { compId, pinId } = parsePinKey(key);
      const c = compMap[compId];
      if (!c) return null;
      const p = getPart(c.type)?.pins.find((pp) => pp.id === pinId);
      if (!p) return null;
      return { x: c.x + p.x, y: c.y + p.y };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.components],
  );

  const toWorld = useCallback(
    (e) => {
      const r = svgRef.current.getBoundingClientRect();
      return { x: (e.clientX - r.left - view.x) / view.z, y: (e.clientY - r.top - view.y) / view.z };
    },
    [view],
  );

  const onPinDown = (compId, pinId, worldPos) => {
    const key = `${compId}:${pinId}`;
    if (!pending) {
      setPending({ fromKey: key, fromPos: worldPos });
      setCursor(worldPos);
      return;
    }
    if (pending.fromKey === key) {
      setPending(null);
      return;
    }
    dispatch({ type: "ADD_WIRE", a: pending.fromKey, b: key, color: wireColorFor(compMap[compId].type, pinId) });
    setPending(null);
  };

  // pan on empty background + clear selection
  const onBgDown = (e) => {
    if (e.target !== svgRef.current && e.target.dataset?.bg !== "1") return;
    dispatch({ type: "SELECT", id: null });
    setPending(null);
    panRef.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    svgRef.current.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (panRef.current) {
      setView((v) => ({ ...v, x: panRef.current.ox + (e.clientX - panRef.current.sx), y: panRef.current.oy + (e.clientY - panRef.current.sy) }));
    } else if (pending) {
      setCursor(toWorld(e));
    }
  };
  const onUp = (e) => {
    panRef.current = null;
    try {
      svgRef.current.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onWheel = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    const nz = clamp(0.3, 2.5, view.z * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    const wx = (mx - view.x) / view.z;
    const wy = (my - view.y) / view.z;
    setView({ x: mx - wx * nz, y: my - wy * nz, z: nz });
  };

  const onDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("text/part");
    if (!type) return;
    const w = toWorld(e);
    const part = getPart(type);
    dispatch({ type: "ADD_COMPONENT", componentType: type, x: Math.round(w.x - part.w / 2), y: Math.round(w.y - part.h / 2) });
  };

  // delete key removes selection
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
      if (doc.selectedWireId) dispatch({ type: "DELETE_WIRE", id: doc.selectedWireId });
      else if (doc.selectedId) dispatch({ type: "DELETE_COMPONENT", id: doc.selectedId });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc.selectedId, doc.selectedWireId, dispatch]);

  return (
    <svg
      ref={svgRef}
      className="h-full w-full touch-none select-none bg-slate-50 dark:bg-slate-900"
      onPointerDown={onBgDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onWheel={onWheel}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <PartDefs />
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.2" className="fill-slate-300 dark:fill-slate-700" />
        </pattern>
      </defs>
      <rect data-bg="1" x="0" y="0" width="100%" height="100%" fill="url(#grid)" />

      <g transform={`translate(${view.x} ${view.y}) scale(${view.z})`}>
        {doc.wires.map((w) => {
          const a = pinPos(w.a);
          const b = pinPos(w.b);
          if (!a || !b) return null;
          return (
            <Wire
              key={w.id}
              a={a}
              b={b}
              color={w.color}
              selected={doc.selectedWireId === w.id}
              onSelect={running ? undefined : (e) => (e.stopPropagation(), dispatch({ type: "SELECT_WIRE", id: w.id }))}
            />
          );
        })}

        {pending && cursor && pinPos(pending.fromKey) && (
          <Wire a={pinPos(pending.fromKey)} b={cursor} color="#0ea5e9" />
        )}

        {doc.components.map((c) => (
          <PartNode
            key={c.id}
            comp={c}
            store={store}
            running={running}
            selected={doc.selectedId === c.id}
            toWorld={toWorld}
            onSelect={(id) => dispatch({ type: "SELECT", id })}
            onMove={(id, x, y) => dispatch({ type: "MOVE_COMPONENT", id, x, y })}
            onPinDown={onPinDown}
            wiringFromKey={pending?.fromKey}
          />
        ))}
      </g>
    </svg>
  );
};

export default Canvas;
