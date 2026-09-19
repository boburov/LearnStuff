// "Jarrohlik" - virtual dissection. Preset pills set the peel depth; the left
// panel adds per-layer opacity + a scalpel (clipping plane). Clicking a part
// opens its Uzbek detail in the shared corner modal. All UI state in one object.
import useObjectState from "@/shared/hooks/useObjectState";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import SurgeryModel from "./SurgeryModel";
import SurgeryControls from "./SurgeryControls";
import AnatomyDetailModal from "../anatomy/AnatomyDetailModal";
import { SURGERY_PRESETS, DEFAULT_PRESET, getPreset } from "@/modules/biology/data/surgery";

const SurgeryPage = () => {
  const { preset, layers, clip, selectedPart, setField, setFields } = useObjectState({
    preset: DEFAULT_PRESET,
    layers: { ...getPreset(DEFAULT_PRESET).layers },
    clip: { enabled: false, axis: "z", position: 0.5, flip: false },
    selectedPart: null,
  });

  // Presets replace the whole layer set; manual sliders clear the active pill.
  const applyPreset = (id) =>
    setFields({ preset: id, layers: { ...getPreset(id).layers }, selectedPart: null });
  const setLayer = (slug, value) =>
    setFields({ preset: null, layers: { ...layers, [slug]: value } });
  const setClip = (patch) => setField("clip", { ...clip, ...patch });

  return (
    <LabWorkspace
      title="Jarrohlik"
      description="Qatlamlarni shaffoflashtiring yoki skalpel bilan kesib, ichki a'zolarni ko'ring. A'zoni bossangiz tafsiloti chiqadi."
      backTo="/biology"
      backLabel="Biologiya"
      items={SURGERY_PRESETS.map((p) => ({ id: p.id, name: p.name }))}
      activeId={preset}
      onSelect={applyPreset}
      scene={
        <>
          <Scene
            camera={[0, 1, 6]}
            frameloop="demand"
            gl={{ localClippingEnabled: true }}
            controls={{
              minDistance: 0.5,
              maxDistance: 30,
              enablePan: true,
              zoomToCursor: true,
              zoomSpeed: 1.1,
            }}
          >
            <hemisphereLight args={["#ffffff", "#9ca3af", 0.9]} />
            <directionalLight position={[4, 6, 5]} intensity={0.8} />
            <directionalLight position={[-5, 2, -4]} intensity={0.4} />
            <SurgeryModel
              layerOpacity={layers}
              clip={clip}
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
      info={<SurgeryControls layers={layers} onLayer={setLayer} clip={clip} onClip={setClip} />}
    />
  );
};

export default SurgeryPage;
