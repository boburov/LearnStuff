import { useMemo } from "react";
import { ionsData } from "@/modules/chemistry/data/ions";
import "./ions.css";

// Section + group ordering and colors — mirrored from Zperiod's ionsController.
const SECTION_ORDER = ["basic", "core", "trans", "special"];

const GROUPS_BY_SECTION = {
  basic: ["basic_cat1", "basic_cat2", "basic_cat3", "basic_an1", "basic_an2", "basic_an3"],
  core: ["core_c", "core_n", "core_s", "core_p", "core_cl"],
  trans: ["trans_cu", "trans_fe", "trans_pb", "trans_mn", "trans_cr"],
  special: ["spec_pair", "spec_acid", "spec_org"],
};

const GROUP_COLORS = {
  basic_cat1: "#FFCDD2",
  basic_cat2: "#FFCC80",
  basic_cat3: "#FFF59D",
  basic_an1: "#B2EBF2",
  basic_an2: "#BBDEFB",
  basic_an3: "#E1BEE7",
  core_c: "#CFD8DC",
  core_n: "#F8BBD0",
  core_s: "#DCEDC8",
  core_p: "#D1C4E9",
  core_cl: "#B9F6CA",
  trans_cu: "#FFAB91",
  trans_fe: "#BCAAA4",
  trans_pb: "#EEEEEE",
  trans_mn: "#E1BEE7",
  trans_cr: "#FFE082",
  spec_pair: "#B2DFDB",
  spec_acid: "#F0F4C3",
  spec_org: "#D7CCC8",
};

const SECTION_LABEL = {
  basic: "Oddiy monatomik ionlar",
  core: "Asosiy ko'p atomli ionlar",
  trans: "O'tish metallari",
  special: "Maxsus va organik ionlar",
};

const SUB = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };

// Convert unicode subscripts to <sub> markup (Zperiod formatChem).
const chemToHtml = (str = "") =>
  [...str].map((c) => (SUB[c] !== undefined ? `<sub>${SUB[c]}</sub>` : c)).join("");

// Build the stacked symbol markup: charge on top of the trailing subscript.
const ionSymbolHtml = (symbol, charge) => {
  const chem = chemToHtml(symbol);
  const m = chem.match(/^(.+)<sub>([^<]+)<\/sub>$/);
  if (m) {
    return `<span class="symbol-base">${m[1]}</span><span class="script-stack"><span class="script-sup">${charge}</span><span class="script-sub">${m[2]}</span></span>`;
  }
  return `${chem}<sup class="ion-charge-sup">${charge}</sup>`;
};

const IonCell = ({ ion, onClick }) => {
  const longFormula = ion.id === "ch3coo_minus";
  return (
    <button
      type="button"
      onClick={() => onClick(ion)}
      title={ion.name}
      className={`ion-table-cell${longFormula ? " ion-long-formula" : ""}`}
      style={{ backgroundColor: GROUP_COLORS[ion.group] || "#f0f0f0" }}
    >
      <span
        className="symbol"
        dangerouslySetInnerHTML={{ __html: ionSymbolHtml(ion.symbol, ion.charge) }}
      />
      <span className="name">{ion.name}</span>
    </button>
  );
};

// Ion browser grouped by section, ordered like Zperiod; clicking opens the ion detail modal.
const IonEngine = ({ onSelect }) => {
  const sections = useMemo(() => {
    const byGroup = new Map();
    ionsData.forEach((ion) => {
      if (!byGroup.has(ion.group)) byGroup.set(ion.group, []);
      byGroup.get(ion.group).push(ion);
    });
    return SECTION_ORDER.map((sec) => ({
      id: sec,
      ions: (GROUPS_BY_SECTION[sec] || []).flatMap((g) => byGroup.get(g) || []),
    })).filter((s) => s.ions.length);
  }, []);

  return (
    <div className="zperiod-ions">
      <p className="mb-4 text-sm text-muted-foreground">
        Ion ustiga bosing — zaryad, tuzilishi va xossalari haqida batafsil ma'lumot ochiladi.
      </p>
      {sections.map((section) => (
        <div key={section.id} className="ion-table-section">
          <h3 className="ion-table-heading">{SECTION_LABEL[section.id]}</h3>
          <div className="ion-table-grid">
            {section.ions.map((ion) => (
              <IonCell key={ion.id} ion={ion} onClick={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default IonEngine;
