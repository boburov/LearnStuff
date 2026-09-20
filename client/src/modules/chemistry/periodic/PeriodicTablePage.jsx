// Interactive periodic table + ion engine + chemistry calculators (ported from Zperiod).
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useModal from "@/shared/hooks/useModal";
import { MODAL } from "@/shared/constants/modals";
import PeriodicTable from "./components/PeriodicTable";
import IonEngine from "./components/IonEngine";
import Calculators from "./components/Calculators";
import Worksheet from "./components/Worksheet";
import ElementModal from "./components/ElementModal";
import IonModal from "./components/IonModal";

const TABS = [
  { id: "table", label: "Davriy jadval" },
  { id: "ions", label: "Ionlar" },
  { id: "tools", label: "Kalkulyatorlar" },
  { id: "worksheet", label: "Ishchi varaq" },
];

const PeriodicTablePage = () => {
  const [tab, setTab] = useState("table");
  const { openModal } = useModal();

  const openElement = (el) => openModal(MODAL.ELEMENT_DETAIL, { number: el.number });
  const openIon = (ion) => openModal(MODAL.ION_DETAIL, { id: ion.id });

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-2.5">
        <Link to="/chemistry" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Kimyo
        </Link>
        <h1 className="text-sm font-semibold">Davriy jadval</h1>
        <div className="ml-auto flex gap-1 rounded-xl border border-border p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "table" && <PeriodicTable onSelect={openElement} />}
        {tab === "ions" && <IonEngine onSelect={openIon} />}
        {tab === "tools" && <Calculators />}
        {tab === "worksheet" && <Worksheet />}
      </div>

      <ElementModal />
      <IonModal />
    </div>
  );
};

export default PeriodicTablePage;
