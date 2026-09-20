import ModalWrapper from "@/shared/components/ui/modal/ModalWrapper";
import { MODAL } from "@/shared/constants/modals";
import { finallyData } from "@/modules/chemistry/data/elements";
import { getCategoryMeta } from "../utils/categories";

const Row = ({ label, value }) =>
  value == null || value === "" ? null : (
    <div className="flex justify-between gap-3 border-b border-border/60 py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );

const Section = ({ title, children }) => (
  <div>
    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">{title}</h4>
    <div className="rounded-lg bg-secondary/50 px-3 py-1">{children}</div>
  </div>
);

const Chips = ({ items }) =>
  !items?.length ? null : (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <span key={x} className="rounded-full bg-secondary px-2.5 py-1 text-xs">
          {x}
        </span>
      ))}
    </div>
  );

const ElementBody = ({ number }) => {
  const el = finallyData?.[String(number)];
  if (!el) return <p className="p-4 text-sm text-muted-foreground">Ma'lumot topilmadi.</p>;

  const b = el.level1_basic || {};
  const a = el.level2_atomic || {};
  const p = el.level3_properties || {};
  const h = el.level4_history_stse || {};
  const cat = getCategoryMeta(b.type);
  const phys = p.physical || {};
  const elec = p.electronic || {};
  // Oxidation states live at level3.electronic (array); fall back to the basic string.
  const oxStates = elec.oxidationStates?.common?.join(", ") || b.commonOxidationStates || null;

  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto px-1 pb-2">
      {/* header */}
      <div className="flex items-center gap-4 rounded-xl p-4" style={{ background: cat.bg, color: cat.text }}>
        <div
          className="grid h-16 w-16 place-items-center rounded-xl text-2xl font-bold text-white"
          style={{ background: cat.text }}
        >
          {el.symbol}
        </div>
        <div>
          <div className="text-lg font-semibold">{el.name}</div>
          <div className="text-sm opacity-70">
            №{el.id} · {cat.label}
          </div>
        </div>
      </div>

      <Section title="Asosiy">
        <Row label="Guruh" value={b.group} />
        <Row label="Davr" value={b.period} />
        <Row label="Agregat holati (STP)" value={b.phaseAtSTP} />
        <Row label="Valent elektronlar" value={b.valenceElectrons} />
        <Row label="Oksidlanish darajalari" value={oxStates} />
        <Row label="Keng tarqalgan ionlar" value={b.commonIons} />
      </Section>

      <Section title="Atom tuzilishi">
        <Row label="Atom massasi" value={a.mass?.highSchool ? `${a.mass.highSchool} g/mol` : null} />
        <Row label="Protonlar" value={a.protons} />
        <Row label="Elektronlar" value={a.electronsNeutral} />
        <Row label="Elektron konfiguratsiya" value={elec.configuration} />
      </Section>

      {a.naturalIsotopes?.length > 0 && (
        <Section title="Tabiiy izotoplar">
          {a.naturalIsotopes.map((iso) => (
            <Row key={iso.name} label={`${iso.name} (${iso.neutron})`} value={iso.percent} />
          ))}
        </Section>
      )}

      <Section title="Fizik xossalar">
        <Row label="Elektromanfiylik" value={phys.electronegativity} />
        <Row label="Birinchi ionlanish" value={phys.firstIonization} />
        <Row label="Zichlik" value={phys.density} />
        <Row label="Erish harorati" value={phys.meltingPoint} />
        <Row label="Qaynash harorati" value={phys.boilingPoint} />
        <Row label="Atom radiusi" value={phys.atomicRadius} />
      </Section>

      {(h.history || h.commonUses) && (
        <Section title="Tarix va qo'llanilishi">
          <Row label="Kashf etilgan yil" value={h.history?.discoveryYear} />
          <Row label="Kashf etuvchi" value={h.history?.discoveredBy} />
          {h.commonUses?.length > 0 && (
            <div className="py-2">
              <div className="mb-1.5 text-xs text-muted-foreground">Qo'llanilishi</div>
              <Chips items={h.commonUses} />
            </div>
          )}
          {h.hazards?.length > 0 && (
            <div className="py-2">
              <div className="mb-1.5 text-xs text-muted-foreground">Xavflari</div>
              <Chips items={h.hazards} />
            </div>
          )}
        </Section>
      )}
    </div>
  );
};

const ElementModal = () => (
  <ModalWrapper name={MODAL.ELEMENT_DETAIL} title="Element ma'lumoti" className="max-w-2xl">
    <ElementBody />
  </ModalWrapper>
);

export default ElementModal;
