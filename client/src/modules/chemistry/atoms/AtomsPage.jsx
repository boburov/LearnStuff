import { useState } from "react";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import AtomModel from "./AtomModel";
import { ATOMS, getAtom } from "@/modules/chemistry/data/atoms";

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-secondary px-3 py-2 text-center">
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

const AtomsPage = () => {
  const [activeId, setActiveId] = useState(ATOMS[0].id);
  const atom = getAtom(activeId);

  return (
    <LabWorkspace
      title="Atomlar"
      description="Yadro atrofida aylanayotgan elektron qobiqlarini kuzating."
      backTo="/chemistry"
      backLabel="Kimyo"
      items={ATOMS}
      activeId={activeId}
      onSelect={setActiveId}
      scene={
        <Scene camera={[0, 4, 9]}>
          <AtomModel atom={atom} />
        </Scene>
      }
      info={
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">{atom.name}</h2>
            <span className="font-mono text-primary">
              {atom.symbol} · №{atom.number}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{atom.about}</p>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Proton" value={atom.protons} />
            <Stat label="Neytron" value={atom.neutrons} />
            <Stat label="Elektron" value={atom.shells.reduce((a, b) => a + b, 0)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Qobiqlar: {atom.shells.join(" → ")}
          </p>
        </div>
      }
    />
  );
};

export default AtomsPage;
