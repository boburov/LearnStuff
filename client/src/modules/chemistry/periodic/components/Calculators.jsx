import { useEffect, useRef, useState } from "react";
import { ArrowRight, Scale, Calculator, FlaskConical, Droplets, X } from "lucide-react";
import { getChemToolContent } from "../vendor/toolContentFactories";
import { attachToolEventListeners } from "../vendor/chemToolInteractions";
import "../vendor/css/tools.css";
import "../vendor/css/tool-modals-shared.css";
import "./tools-modal.css";

const TOOLS = [
  {
    id: "balancer",
    name: "Tenglama muvozanati",
    desc: "Murakkab kimyoviy tenglamalarni avtomatik muvozanatlang.",
    Icon: Scale,
    tint: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
  {
    id: "molar-mass",
    name: "Molyar massa",
    desc: "Molekular massani element bo'yicha taqsimlab hisoblang.",
    Icon: Calculator,
    tint: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  {
    id: "empirical",
    name: "Empirik formula",
    desc: "Foizli tarkibdan empirik va molekular formulani toping.",
    Icon: FlaskConical,
    tint: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    id: "solubility",
    name: "Eruvchanlik jadvali",
    desc: "Ionli birikmalar eruvchanligini qoidalar bilan ko'ring.",
    Icon: Droplets,
    tint: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
];

// Full-screen modal hosting a vendored Zperiod tool (keeps all interactive content).
const ToolModal = ({ tool, onClose }) => {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.innerHTML = getChemToolContent(tool.id);
    const raf = requestAnimationFrame(() => attachToolEventListeners(tool.id));
    return () => cancelAnimationFrame(raf);
  }, [tool.id]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { Icon } = tool;
  return (
    <div className="chem-tool-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="chem-tool-modal" role="dialog" aria-modal="true">
        <div className="chem-tool-modal-header">
          <span className={`chem-tool-modal-icon ${tool.tint}`}>
            <Icon size={20} />
          </span>
          <span className="chem-tool-modal-title">{tool.name}</span>
          <button className="chem-tool-modal-close" onClick={onClose}>
            <X size={15} /> Yopish
          </button>
        </div>
        <div className="chem-tool-modal-body" ref={bodyRef} />
      </div>
    </div>
  );
};

// Chemistry tools page: site-styled card grid; a card opens its full tool in a modal.
const Calculators = () => {
  const [active, setActive] = useState(null);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Kimyo kalkulyatorlari</h1>
        <p className="mt-1 text-sm text-muted-foreground">9–12-sinf kimyo hisoblagichlari</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const { id, name, desc, Icon, tint } = tool;
          return (
            <button
              key={id}
              onClick={() => setActive(tool)}
              className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tint}`}>
                  <Icon size={22} />
                </span>
                <ArrowRight size={18} className="text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {active && <ToolModal tool={active} onClose={() => setActive(null)} />}
    </div>
  );
};

export default Calculators;
