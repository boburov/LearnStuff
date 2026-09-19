import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import DnaModel from "./DnaModel";

const BASES = [
  { letter: "A", name: "Adenin", color: "#ef4444" },
  { letter: "T", name: "Timin", color: "#3b82f6" },
  { letter: "G", name: "Guanin", color: "#10b981" },
  { letter: "C", name: "Sitozin", color: "#f59e0b" },
];

const DnaPage = () => (
  <LabWorkspace
    title="DNK spirali"
    description="Qo'sh spiralni aylantirib turli tomondan ko'ring."
    backTo="/biology"
    backLabel="Biologiya"
    items={[{ id: "dna", name: "Qo'sh spiral" }]}
    activeId="dna"
    onSelect={() => {}}
    scene={
      <Scene camera={[0, 0, 9]}>
        <DnaModel />
      </Scene>
    }
    info={
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          DNK - irsiy axborotni saqlovchi molekula. Ikki ip o'zaro buralib
          qo'sh spiral hosil qiladi, ular azot asoslari bilan bog'lanadi.
        </p>
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Azot asoslari:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BASES.map((b) => (
              <div key={b.letter} className="flex items-center gap-2 text-sm">
                <span
                  className="grid size-6 place-items-center rounded text-xs font-bold text-white"
                  style={{ backgroundColor: b.color }}
                >
                  {b.letter}
                </span>
                {b.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    }
  />
);

export default DnaPage;
