// Right panel: name, formula, key stats, element legend and a PubChem link.
import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import FormulaText from "@/shared/lab/FormulaText";
import { getElementMeta } from "@/modules/chemistry/data/molecules";

const STATE_LABEL = { gaz: "Gaz", suyuq: "Suyuq", qattiq: "Qattiq" };

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
      {label}
    </div>
    <div className="mt-0.5 text-sm font-medium">{value}</div>
  </div>
);

const MoleculeInfoPanel = ({ molecule }) => {
  // Unique elements present, for a small colour legend.
  const legend = useMemo(() => {
    const seen = [];
    for (const a of molecule.atoms) if (!seen.includes(a.el)) seen.push(a.el);
    return seen.map((sym) => ({ sym, ...getElementMeta(sym) }));
  }, [molecule]);

  const showIupac =
    molecule.iupacName &&
    molecule.iupacName.toLowerCase() !== molecule.nameEn.toLowerCase();

  return (
    <div className="flex h-full flex-col overflow-y-auto p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {molecule.categoryLabel}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {STATE_LABEL[molecule.state] ?? molecule.state}
        </span>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {molecule.dimensions?.toUpperCase()}
        </span>
      </div>

      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        {molecule.name}
      </h2>
      <FormulaText
        formula={molecule.formula}
        className="text-2xl font-light text-primary"
      />
      {showIupac && (
        <p className="mt-1 text-sm italic text-muted-foreground">
          {molecule.iupacName}
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Stat label="Molekulyar massa" value={`${molecule.weight} g/mol`} />
        <Stat label="PubChem CID" value={molecule.cid} />
        <Stat label="Atomlar" value={molecule.atoms.length} />
        <Stat label="Bog'lar" value={molecule.bonds.length} />
      </div>

      <div className="mt-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Elementlar
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {legend.map((el) => (
            <li
              key={el.sym}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-xs"
            >
              <span
                className="h-3 w-3 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: el.color }}
              />
              <span className="font-medium">{el.sym}</span>
              <span className="text-muted-foreground">{el.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <a
        href={`https://pubchem.ncbi.nlm.nih.gov/compound/${molecule.cid}`}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
      >
        PubChem'da ko'rish
        <ExternalLink size={16} />
      </a>
    </div>
  );
};

export default MoleculeInfoPanel;
