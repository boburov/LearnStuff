import ModalWrapper from "@/shared/components/ui/modal/ModalWrapper";
import { MODAL } from "@/shared/constants/modals";
import { ionsData } from "@/modules/chemistry/data/ions";

// Uzbek labels for the known customData keys; unknown keys fall back to the raw key.
const KEY_LABEL = {
  type: "Turi",
  source: "Manbasi",
  phase: "Holati",
  valence: "Valentlik",
  keyCompounds: "Asosiy birikmalar",
  molarMass: "Molyar massa",
  subatomic: "Subatomik zarralar",
  statusBanner: "Xususiyati",
  config: "Konfiguratsiya",
  oxidation: "Oksidlanish",
  ionicRadius: "Ion radiusi",
  hydrationEnthalpy: "Gidratlanish entalpiyasi",
  coordination: "Koordinatsiya",
  discoveryYear: "Kashf yili",
  discoveredBy: "Kashf etuvchi",
  namedBy: "Nomlanishi",
  stse: "Ekologik ta'siri",
  commonUses: "Qo'llanilishi",
  hazards: "Xavflari",
};

const LEVEL_TITLE = {
  level1: "Asosiy",
  level2: "Atom tuzilishi",
  level3: "Kimyoviy xossalar",
  level4: "Tarix va qo'llanilishi",
};

const humanize = (k) => KEY_LABEL[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const Entry = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-border/60 py-1.5 text-sm last:border-0">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

const LevelBlock = ({ levelKey, data }) => {
  if (!data) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        {LEVEL_TITLE[levelKey] || levelKey}
      </h4>
      <div className="rounded-lg bg-secondary/50 px-3 py-1">
        {Object.entries(data).map(([k, v]) => {
          if (v == null || v === "") return null;
          // Nested slot objects: { label, result, desc }
          if (typeof v === "object") {
            return <Entry key={k} label={v.label || humanize(k)} value={`${v.result || ""}${v.desc ? ` — ${v.desc}` : ""}`} />;
          }
          return <Entry key={k} label={humanize(k)} value={String(v)} />;
        })}
      </div>
    </div>
  );
};

const IonBody = ({ id }) => {
  const ion = ionsData.find((x) => x.id === id);
  if (!ion) return <p className="p-4 text-sm text-muted-foreground">Ma'lumot topilmadi.</p>;
  const cd = ion.customData || {};

  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto px-1 pb-2">
      <div className="flex items-center gap-4 rounded-xl bg-secondary/60 p-4">
        <div className="grid h-16 w-16 place-items-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
          {ion.symbol}
          <sup className="text-sm">{ion.charge}</sup>
        </div>
        <div>
          <div className="text-lg font-semibold">{ion.name}</div>
          <div className="text-sm text-muted-foreground">
            {ion.type} · {ion.category}
          </div>
        </div>
      </div>
      {["level1", "level2", "level3", "level4"].map((lvl) => (
        <LevelBlock key={lvl} levelKey={lvl} data={cd[lvl]} />
      ))}
    </div>
  );
};

const IonModal = () => (
  <ModalWrapper name={MODAL.ION_DETAIL} title="Ion ma'lumoti" className="max-w-2xl">
    <IonBody />
  </ModalWrapper>
);

export default IonModal;
