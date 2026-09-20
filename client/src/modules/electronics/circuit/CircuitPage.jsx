// Tinkercad-style 2D circuit builder: palette + SVG canvas + code editor + live simulation.
import { useMemo, useReducer, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getPart } from "./engine/parts";
import { createSimStore } from "./engine/simStore";
import { useSimulation, useSimMeta } from "./engine/useSimulation";
import { TEMPLATES, getTemplate } from "./data/templates";
import Palette from "./components/Palette";
import Canvas from "./components/Canvas";
import CodeEditor from "./components/CodeEditor";

const uid = () => Math.random().toString(36).slice(2, 8);

const docFromTemplate = (t) => ({
  components: t.components.map((c) => ({ ...c, props: { ...c.props } })),
  wires: t.wires.map((w) => ({ ...w })),
  selectedId: null,
  selectedWireId: null,
});

function reducer(state, a) {
  switch (a.type) {
    case "SET_DOC":
      return docFromTemplate(a.template);
    case "ADD_COMPONENT": {
      const id = `${a.componentType}-${uid()}`;
      return {
        ...state,
        components: [...state.components, { id, type: a.componentType, x: a.x, y: a.y, props: { ...getPart(a.componentType).props } }],
        selectedId: id,
        selectedWireId: null,
      };
    }
    case "MOVE_COMPONENT":
      return { ...state, components: state.components.map((c) => (c.id === a.id ? { ...c, x: a.x, y: a.y } : c)) };
    case "DELETE_COMPONENT":
      return {
        ...state,
        components: state.components.filter((c) => c.id !== a.id),
        wires: state.wires.filter((w) => !w.a.startsWith(`${a.id}:`) && !w.b.startsWith(`${a.id}:`)),
        selectedId: null,
      };
    case "ADD_WIRE": {
      const dup = state.wires.some((w) => (w.a === a.a && w.b === a.b) || (w.a === a.b && w.b === a.a));
      if (dup) return state;
      return { ...state, wires: [...state.wires, { id: `w-${uid()}`, a: a.a, b: a.b, color: a.color }] };
    }
    case "DELETE_WIRE":
      return { ...state, wires: state.wires.filter((w) => w.id !== a.id), selectedWireId: null };
    case "SELECT":
      return { ...state, selectedId: a.id, selectedWireId: null };
    case "SELECT_WIRE":
      return { ...state, selectedWireId: a.id, selectedId: null };
    case "SET_PROP":
      return { ...state, components: state.components.map((c) => (c.id === a.id ? { ...c, props: { ...c.props, [a.key]: a.value } } : c)) };
    case "CLEAR":
      return { components: [], wires: [], selectedId: null, selectedWireId: null };
    default:
      return state;
  }
}

const LED_COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#f97316", "#a855f7"];

// Small floating inspector for the selected component.
const Inspector = ({ comp, dispatch }) => {
  if (!comp) return null;
  const part = getPart(comp.type);
  return (
    <div className="absolute bottom-4 left-4 z-10 w-56 rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">{part.label}</span>
        <button onClick={() => dispatch({ type: "DELETE_COMPONENT", id: comp.id })} className="rounded-md p-1 text-red-500 hover:bg-red-500/10" title="O'chirish">
          <Trash2 size={15} />
        </button>
      </div>
      {comp.type === "led" && (
        <div className="flex flex-wrap gap-1.5">
          {LED_COLORS.map((col) => (
            <button
              key={col}
              onClick={() => dispatch({ type: "SET_PROP", id: comp.id, key: "color", value: col })}
              className={`h-6 w-6 rounded-full border-2 ${comp.props.color === col ? "border-foreground" : "border-transparent"}`}
              style={{ background: col }}
            />
          ))}
        </div>
      )}
      {comp.type === "resistor" && (
        <label className="flex items-center gap-2 text-xs">
          Qarshilik
          <select
            value={comp.props.ohms}
            onChange={(e) => dispatch({ type: "SET_PROP", id: comp.id, key: "ohms", value: Number(e.target.value) })}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1"
          >
            {[220, 330, 1000, 10000].map((o) => (
              <option key={o} value={o}>
                {o >= 1000 ? `${o / 1000}kΩ` : `${o}Ω`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
};

const CircuitPage = () => {
  const store = useMemo(() => createSimStore(), []);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [doc, dispatch] = useReducer(reducer, TEMPLATES[0], docFromTemplate);
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [running, setRunning] = useState(false);
  const meta = useSimMeta(store);

  useSimulation({ store, running, code, components: doc.components, wires: doc.wires, onStop: () => setRunning(false) });

  const loadTemplate = (id) => {
    setRunning(false);
    store.reset();
    const t = getTemplate(id);
    setTemplateId(id);
    dispatch({ type: "SET_DOC", template: t });
    setCode(t.code);
  };

  const selected = doc.components.find((c) => c.id === doc.selectedId) || null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* top bar */}
      <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
        <Link to="/electronics" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Elektron mehanika
        </Link>
        <h1 className="text-sm font-semibold">Sxema quruvchi</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={templateId}
            onChange={(e) => loadTemplate(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              setRunning(false);
              store.reset();
              dispatch({ type: "CLEAR" });
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"
          >
            Tozalash
          </button>
        </div>
      </div>

      {/* body */}
      <div className="flex min-h-0 flex-1">
        <aside className="w-52 shrink-0 border-r border-border">
          <Palette disabled={running} />
        </aside>

        <main className="relative min-w-0 flex-1">
          <Canvas doc={doc} dispatch={dispatch} store={store} running={running} />
          {!running && <Inspector comp={selected} dispatch={dispatch} />}
        </main>

        <aside className="w-[380px] shrink-0">
          <CodeEditor code={code} onChange={setCode} running={running} onToggleRun={() => setRunning((r) => !r)} error={meta.error} />
        </aside>
      </div>
    </div>
  );
};

export default CircuitPage;
