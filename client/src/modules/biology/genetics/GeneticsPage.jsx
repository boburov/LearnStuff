import LabWorkspace from "@/shared/lab/LabWorkspace";
import useObjectState from "@/shared/hooks/useObjectState";

const TRAITS = [
  { id: "eye", name: "Ko'z rangi", dom: "Jigarrang", rec: "Ko'k" },
  { id: "height", name: "Bo'y", dom: "Baland", rec: "Past" },
  { id: "widow", name: "Soch chizig'i", dom: "Uchli", rec: "Tekis" },
];

const GENOTYPES = ["AA", "Aa", "aa"];

// Ikki allelni birlashtirib normal genotip beradi (A doim oldinda: aA -> Aa).
const combine = (a, b) => [a, b].sort().join("");

const getTrait = (id) => TRAITS.find((t) => t.id === id) ?? TRAITS[0];

const Readout = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-semibold tabular-nums">{value}</span>
  </div>
);

const GenoPicker = ({ label, value, onChange }) => (
  <div className="mb-3">
    <div className="mb-1 text-xs text-muted-foreground">{label}</div>
    <div className="flex gap-2">
      {GENOTYPES.map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={
            "flex-1 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors " +
            (value === g
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-secondary")
          }
        >
          {g}
        </button>
      ))}
    </div>
  </div>
);

// Genotip bo'yicha rang: dominant (A bor) yashil, retsessiv (aa) kulrang.
const cellColor = (geno) =>
  geno === "aa"
    ? "bg-secondary/50 border-border/60 text-muted-foreground"
    : "bg-primary/15 border-primary/40 text-primary";

const GeneticsPage = () => {
  const st = useObjectState({ trait: "eye", p1: "Aa", p2: "Aa" });
  const trait = getTrait(st.trait);

  const a1 = st.p1.split("");
  const a2 = st.p2.split("");
  // 4 ta avlod: har bir ota-ona allelining kombinatsiyasi (Punnett 2x2).
  const grid = a1.map((x) => a2.map((y) => combine(x, y)));
  const offspring = grid.flat();

  const cAA = offspring.filter((g) => g === "AA").length;
  const cAa = offspring.filter((g) => g === "Aa").length;
  const caa = offspring.filter((g) => g === "aa").length;

  const dom = cAA + cAa; // kamida bitta A -> dominant fenotip
  const rec = caa;

  // Nisbatlarni eng sodda ko'rinishga keltiramiz (4 ta nusxadan).
  const genoRatio = [cAA, cAa, caa].join(" : ");
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const g = gcd(dom, rec) || 1;
  const phenoRatio = `${dom / g} : ${rec / g}`;
  const domPct = Math.round((dom / 4) * 100);

  const onSelect = (id) => st.setField("trait", id);

  const scene = (
    <div className="grid h-full w-full place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-2 text-center text-sm text-muted-foreground">
          Punnett jadvali
        </div>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
          <div />
          {a2.map((y, j) => (
            <div key={j} className="text-center text-lg font-bold text-foreground">
              {y}
            </div>
          ))}
          {a1.map((x, i) => (
            <RowGroup key={i} label={x} cells={grid[i]} />
          ))}
        </div>

        <div className="mt-6 flex justify-center gap-6 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-primary/40 bg-primary/15" />
            {trait.dom} (dominant)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-border/60 bg-secondary/50" />
            {trait.rec} (retsessiv)
          </span>
        </div>
      </div>
    </div>
  );

  const info = (
    <div className="space-y-4 text-sm">
      <div>
        <GenoPicker label="1-ota-ona genotipi" value={st.p1} onChange={(v) => st.setField("p1", v)} />
        <GenoPicker label="2-ota-ona genotipi" value={st.p2} onChange={(v) => st.setField("p2", v)} />
      </div>

      <div>
        <Readout label="Genotip nisbati (AA : Aa : aa)" value={genoRatio} />
        <Readout label={`Fenotip nisbati (${trait.dom} : ${trait.rec})`} value={phenoRatio} />
        <Readout label="Dominant foizi" value={`${domPct}%`} />
      </div>

      <p className="text-xs text-muted-foreground">
        Ikki geterozigota (Aa × Aa) ota-ona 3 : 1 fenotip nisbatini beradi — klassik
        Mendel qonuni.
      </p>
    </div>
  );

  return (
    <LabWorkspace
      title="Genetika (Punnett)"
      description="Ota-ona allellarini tanlab, avlod nisbatlarini Punnett jadvalida ko'ring."
      backTo="/biology"
      backLabel="Biologiya"
      items={TRAITS}
      activeId={st.trait}
      onSelect={onSelect}
      aiContext={{ ota1: st.p1, ota2: st.p2, fenotip_nisbat: phenoRatio }}
      scene={scene}
      info={info}
    />
  );
};

const RowGroup = ({ label, cells }) => (
  <>
    <div className="grid place-items-center text-lg font-bold text-foreground">{label}</div>
    {cells.map((geno, j) => (
      <div
        key={j}
        className={
          "grid aspect-square place-items-center rounded-md border text-xl font-bold tabular-nums " +
          cellColor(geno)
        }
      >
        {geno}
      </div>
    ))}
  </>
);

export default GeneticsPage;
