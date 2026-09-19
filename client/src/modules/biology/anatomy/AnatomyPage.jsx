// Single "Odam anatomiyasi" page holding every body system. The side panel
// switches which GLB model is shown; clicking a part opens its detail in a
// corner modal. Both bits of UI state live in one useObjectState.
import useObjectState from "@/shared/hooks/useObjectState";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import AnatomyModel from "./AnatomyModel";
import AnatomyDetailModal from "./AnatomyDetailModal";
import { ANATOMY, getAnatomy } from "@/modules/biology/data/anatomy";

const AnatomyPage = () => {
  const { activeSlug, selectedPart, setField, setFields } = useObjectState({
    activeSlug: ANATOMY[0].slug,
    selectedPart: null,
  });
  const model = getAnatomy(activeSlug);

  return (
    <LabWorkspace
      title={model.title}
      description="Modelni aylantiring va yaqinlashtiring. Biror qismni bossangiz tafsiloti chiqadi."
      backTo="/biology"
      backLabel="Biologiya"
      items={ANATOMY.map((a) => ({ id: a.slug, name: a.title }))}
      activeId={model.slug}
      // Switching system resets the open detail.
      onSelect={(id) => setFields({ activeSlug: id, selectedPart: null })}
      scene={
        <>
          <Scene
            camera={[0, 1, 6]}
            frameloop="demand"
            controls={{
              minDistance: 0.5,
              maxDistance: 30,
              enablePan: true,
              zoomToCursor: true,
              zoomSpeed: 1.1,
            }}
          >
            {/* Soft fill from several sides so the tinted anatomy reads clearly. */}
            <hemisphereLight args={["#ffffff", "#9ca3af", 0.9]} />
            <directionalLight position={[4, 6, 5]} intensity={0.8} />
            <directionalLight position={[-5, 2, -4]} intensity={0.4} />
            <AnatomyModel
              url={model.url}
              keepMaterial={!!model.keepMaterial}
              frozen={!!selectedPart}
              onPick={(part) => setField("selectedPart", part)}
            />
          </Scene>
          <AnatomyDetailModal
            part={selectedPart}
            onClose={() => setField("selectedPart", null)}
          />
        </>
      }
      info={
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{model.title}</h2>
          <p className="text-sm text-muted-foreground">{model.about}</p>
        </div>
      }
    />
  );
};

export default AnatomyPage;
