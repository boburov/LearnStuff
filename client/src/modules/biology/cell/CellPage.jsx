import { useState } from "react";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import SketchfabEmbed from "@/shared/lab/SketchfabEmbed";
import CellModel from "./CellModel";
import { ORGANELLES, CELL_MODELS, getOrganelle, getCellModel } from "@/modules/biology/data/cell";

const CellPage = () => {
  const [activeId, setActiveId] = useState(ORGANELLES[0].id);
  const model = getCellModel(activeId); // set when a Sketchfab model is picked
  const organelle = getOrganelle(activeId) || ORGANELLES[0];

  // Picker lists the interactive organelles first, then the detailed 3D models.
  const items = [
    ...ORGANELLES,
    ...CELL_MODELS.map((m) => ({ id: m.id, name: m.name })),
  ];

  return (
    <LabWorkspace
      title="Hujayra"
      description="Organoid ustiga bosing yoki ro'yxatdan tanlang. Pastda batafsil 3D modellar ham bor."
      backTo="/biology"
      backLabel="Biologiya"
      items={items}
      activeId={activeId}
      onSelect={setActiveId}
      scene={
        model ? (
          <SketchfabEmbed id={model.sketchfab} title={model.name} />
        ) : (
          <Scene camera={[0, 2, 9]}>
            <CellModel activeId={activeId} onSelect={setActiveId} />
          </Scene>
        )
      }
      info={
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{model ? model.name : organelle.name}</h2>
          <p className="text-sm text-muted-foreground">{model ? model.about : organelle.about}</p>
        </div>
      }
    />
  );
};

export default CellPage;
