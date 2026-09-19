// "Inson atlasi" - BodyParts3D asosidagi 2234 qismli interaktiv anatomiya.
// Tizimlarni yoqib-o'chirish, qidiruv, portlatish (inventar) va ajratib
// ko'rsatish. Butun UI holati bitta useObjectState'da.
import { useCallback, useMemo } from "react";
import { Activity, RotateCcw } from "lucide-react";
import useObjectState from "@/shared/hooks/useObjectState";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import { useAtlasQuery } from "./hooks/useAtlasQuery";
import AtlasBody from "./AtlasBody";
import AtlasControls from "./AtlasControls";
import AtlasDetailCard from "./AtlasDetailCard";
import { SYSTEMS, SYSTEM_BY_ID, DEFAULT_VISIBLE, PRESETS, translateName } from "./data/systems";

const INITIAL = {
  preset: "all",
  visible: DEFAULT_VISIBLE,
  selected: [],
  chosen: null,
  isolate: false,
  explode: 0,
  query: "",
  progress: 0,
  error: "",
};

const HumanAtlasPage = () => {
  const { data: atlas, isError: manifestFailed } = useAtlasQuery();
  const state = useObjectState(INITIAL);
  const { preset, visible, selected, chosen, isolate, explode, query, progress, error, setField, setFields } = state;

  const partsById = useMemo(() => new Map(atlas?.parts.map((p) => [p.id, p])), [atlas]);
  const counts = useMemo(
    () => Object.fromEntries(SYSTEMS.map((s) => [s.id, atlas?.parts.filter((p) => p.system === s.id).length ?? 0])),
    [atlas],
  );
  const selectedParts = useMemo(() => selected.map((id) => partsById.get(id)).filter(Boolean), [selected, partsById]);
  const visibleCount = useMemo(
    () => atlas?.parts.filter((p) => (isolate ? selected.includes(p.id) : visible.includes(p.system) || selected.includes(p.id))).length ?? 0,
    [atlas, isolate, selected, visible],
  );

  // Tushunchani (bir yoki bir nechta qism) tanlash.
  const choose = useCallback(
    (concept) => setFields({ chosen: concept, selected: concept.elements, isolate: false }),
    [setFields],
  );
  // 3D sahnada bosilgan yagona qism.
  const pickPart = useCallback(
    (id) => {
      const p = partsById.get(id);
      if (!p) return;
      setFields({ chosen: { id: p.conceptId, name: p.name, elements: [id] }, selected: [id], isolate: false });
    },
    [partsById, setFields],
  );
  const clearSelection = () => setFields({ chosen: null, selected: [], isolate: false });

  // Preset pill'lari (AI select_item ham shu orqali keladi).
  const applyPreset = useCallback(
    (id) => {
      const p = PRESETS.find((x) => x.id === id);
      if (!p) return;
      setFields({ preset: id, visible: p.systems, selected: [], chosen: null, isolate: false });
    },
    [setFields],
  );
  const setVisible = (list) => setFields({ preset: null, visible: list, selected: [], chosen: null, isolate: false });
  const toggleSystem = (id) => setVisible(visible.includes(id) ? visible.filter((x) => x !== id) : [...visible, id]);
  const resetAll = () => setFields({ ...INITIAL, progress, error });

  // AI kontekst: tanlangan tuzilma va ko'rinayotgan tizimlar haqida real ma'lumot.
  const aiContext = useMemo(
    () => ({
      source: "BodyParts3D 4.0 (CC BY 4.0), katta yoshli erkak etalon anatomiyasi",
      totalParts: atlas?.parts.length,
      totalConcepts: atlas?.concepts.length,
      visibleSystems: visible.map((id) => SYSTEM_BY_ID[id]?.name).filter(Boolean).join(", "),
      explodePercent: Math.round(explode * 100),
      isolated: isolate,
      selectedStructure: chosen ? `${translateName(chosen.name)} (${chosen.name}, ${chosen.id})` : undefined,
      selectedSystem: selectedParts[0] ? SYSTEM_BY_ID[selectedParts[0].system]?.name : undefined,
      selectedPieces: selected.length || undefined,
    }),
    [atlas, visible, explode, isolate, chosen, selectedParts, selected.length],
  );

  const loading = atlas && progress < 100 && !error;
  const failure = error || (manifestFailed ? "Anatomiya katalogi yuklanmadi. Sahifani yangilang." : "");

  return (
    <LabWorkspace
      title="Inson atlasi"
      description="2234 ta qism, 15 tizim. Aylantiring, yaqinlashtiring; qismni bossangiz tafsiloti chiqadi."
      backTo="/biology"
      backLabel="Biologiya"
      items={PRESETS.map((p) => ({ id: p.id, name: p.name }))}
      activeId={preset}
      onSelect={applyPreset}
      aiContext={aiContext}
      scene={
        <>
          <Scene
            camera={[1.0, 0.18, 2.85]}
            frameloop="demand"
            bg="#f3f2f7"
            controls={{
              minDistance: 0.05,
              maxDistance: 30,
              enablePan: true,
              zoomToCursor: true,
              zoomSpeed: 1.1,
              maxPolarAngle: Math.PI * 0.96,
            }}
          >
            <hemisphereLight args={["#ffffff", "#a7acb2", 0.9]} />
            <directionalLight position={[-2, 4, 3]} intensity={1.8} color="#fffaf4" />
            <directionalLight position={[2, 2, -3]} intensity={1.2} color="#e9f0ff" />
            {atlas && (
              <AtlasBody
                atlas={atlas}
                visible={visible}
                selected={selected}
                isolate={isolate}
                explode={explode}
                onPick={pickPart}
                onProgress={(n) => setField("progress", n)}
                onError={(msg) => setField("error", msg)}
              />
            )}
          </Scene>

          <AtlasDetailCard
            chosen={chosen}
            parts={selectedParts}
            isolate={isolate}
            onIsolate={() => setFields({ isolate: !isolate, explode: 0 })}
            onPickPart={pickPart}
            onClose={clearSelection}
          />

          {/* Sahna sarlavhasi + tiklash (pastki chapda, toolbar'ga xalaqit bermaydi). */}
          <div className="pointer-events-none absolute bottom-5 left-4 z-20 hidden items-center gap-2 lg:flex">
            <span className="rounded-full border border-border bg-background/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground backdrop-blur">
              {isolate ? translateName(chosen?.name) : explode > 0.95 ? "Anatomik inventar" : explode > 0.05 ? "Ajratilgan tuzilmalar" : "Katta yoshli odam · erkak"}
            </span>
            <button
              onClick={resetAll}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full border border-border bg-background/85 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur hover:text-foreground"
            >
              <RotateCcw size={12} /> Tiklash
            </button>
          </div>

          {(loading || !atlas) && !failure && (
            <div role="status" className="absolute inset-x-0 top-4 z-30 flex justify-center px-4">
              <div className="flex w-full max-w-xs items-center gap-3 rounded-2xl border border-border bg-background/90 p-3 shadow-lg backdrop-blur">
                <Activity size={18} className="shrink-0 animate-pulse text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Anatomiya tayyorlanmoqda</div>
                  <div className="text-xs text-muted-foreground">{progress}% · {atlas?.parts.length.toLocaleString("uz") ?? "2 234"} ta qism</div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                    <i className="block h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {failure && (
            <div role="alert" className="absolute inset-x-0 top-4 z-30 flex justify-center px-4">
              <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-destructive/40 bg-background/95 p-3 text-sm shadow-lg">
                <p className="flex-1 text-destructive">{failure}</p>
                <button onClick={() => location.reload()} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/70">
                  Yangilash
                </button>
              </div>
            </div>
          )}
        </>
      }
      info={
        <AtlasControls
          atlas={atlas}
          query={query}
          onQuery={(q) => setField("query", q)}
          onChoose={choose}
          explode={explode}
          onExplode={(v) => setFields({ explode: v, isolate: false })}
          visible={visible}
          onToggleSystem={toggleSystem}
          onOnlySystem={(id) => setVisible([id])}
          onVisible={setVisible}
          counts={counts}
          visibleCount={visibleCount}
        />
      }
    />
  );
};

export default HumanAtlasPage;
