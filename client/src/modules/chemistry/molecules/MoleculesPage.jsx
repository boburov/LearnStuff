// Molecule library: searchable category list (left) + 3D viewer with toolbar
// (center) + PubChem info panel (right). 240 molecules from PubChem data.
import { useRef } from "react";
import { List, Info } from "lucide-react";
import Scene from "@/shared/lab/Scene";
import Toolbar from "@/shared/lab/Toolbar";
import SidePanel from "@/shared/lab/SidePanel";
import WorkspaceMobileBar from "@/shared/lab/WorkspaceMobileBar";
import { SceneControlProvider } from "@/shared/lab/SceneControlProvider";
import { useSceneControl } from "@/shared/lab/sceneControl";
import useObjectState from "@/shared/hooks/useObjectState";
import { cn } from "@/shared/utils/cn";
import MoleculeModel from "./MoleculeModel";
import MoleculeStates from "./MoleculeStates";
import MoleculeLibrarySidebar from "./MoleculeLibrarySidebar";
import MoleculeInfoPanel from "./MoleculeInfoPanel";
import { MOLECULE_LIBRARY, getLibraryMolecule } from "@/modules/chemistry/data/moleculeLibrary";

// Ko'rinish: molekula modeli yoki uchta agregat holat (zarrachalar animatsiyasi).
const VIEWS = [
  { id: "molekula", label: "Molekula" },
  { id: "qattiq", label: "Qattiq" },
  { id: "suyuq", label: "Suyuq" },
  { id: "gaz", label: "Gaz" },
];

const STATE_HINT = {
  qattiq: "Zarrachalar panjara bo'lib qotgan va joyida tebranadi.",
  suyuq: "Zarrachalar zich, lekin bir-birining ustidan oqib turadi.",
  gaz: "Zarrachalar tez uchadi va idish devorlaridan sakraydi.",
};

// Open on a recognizable molecule if present, else the first in the dataset.
const DEFAULT_CID = (
  MOLECULE_LIBRARY.find((m) => m.nameEn.toLowerCase() === "caffeine") ??
  MOLECULE_LIBRARY[0]
).cid;

const MoleculesBody = () => {
  const rootRef = useRef(null);
  const { selectedCid, search, panelsHidden, view, listOpen, infoOpen, setField, setFields } =
    useObjectState({
      selectedCid: DEFAULT_CID,
      search: "",
      panelsHidden: false,
      view: "molekula",
      listOpen: false,
      infoOpen: false,
    });
  const { inVR, cardboard, exitCardboard } = useSceneControl();

  const molecule = getLibraryMolecule(selectedCid) ?? MOLECULE_LIBRARY[0];
  const isState = view !== "molekula";

  // Immersive VR modes take over the whole screen - no panels, no mobile bar.
  const immersive = cardboard || inVR;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={rootRef} className="relative flex h-full w-full bg-background">
      {!immersive && (
        <SidePanel
          side="left"
          open={listOpen}
          onClose={() => setField("listOpen", false)}
          desktopHidden={panelsHidden}
          widthClass="lg:w-72"
          className="lg:shadow-[4px_0_16px_-4px_rgba(0,0,0,0.06)]"
        >
          <MoleculeLibrarySidebar
            molecules={MOLECULE_LIBRARY}
            selectedCid={molecule.cid}
            onSelect={(cid) => setFields({ selectedCid: cid, listOpen: false })}
            search={search}
            onSearch={(v) => setField("search", v)}
          />
        </SidePanel>
      )}

      <div className="relative min-w-0 flex-1">
        {/* Mobile: floating back + open-library / open-info buttons. */}
        {!immersive && (
          <WorkspaceMobileBar
            backTo="/chemistry"
            onOpenLeft={() => setField("listOpen", true)}
            leftIcon={<List size={18} />}
            leftLabel="Molekulalar ro'yxatini ochish"
            onOpenRight={() => setField("infoOpen", true)}
            rightIcon={<Info size={18} />}
            rightLabel="Ma'lumot panelini ochish"
          />
        )}

        <Scene camera={[0, 0, 6.5]} bg="#0b1020">
          {isState ? (
            <MoleculeStates molecule={molecule} state={view} />
          ) : (
            <MoleculeModel molecule={molecule} />
          )}
        </Scene>

        {/* Ko'rinish almashtirgich: molekula yoki agregat holat */}
        {!inVR && !cardboard && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-1.5">
            <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-background/90 p-1 shadow-lg backdrop-blur">
              {VIEWS.map((v) => {
                const natural = v.id !== "molekula" && v.id === molecule.state;
                return (
                  <button
                    key={v.id}
                    onClick={() => setField("view", v.id)}
                    className={cn(
                      "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      view === v.id
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {v.label}
                    {natural && (
                      <span
                        className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-400"
                        title="Xona haroratidagi holat"
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {isState && (
              <span className="pointer-events-auto rounded-md bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
                {STATE_HINT[view]}
              </span>
            )}
          </div>
        )}

        {cardboard ? (
          <>
            {/* Center seam to help align the phone in the headset. */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-white/40" />
            <button
              onClick={exitCardboard}
              className="absolute right-3 top-3 z-30 rounded-lg bg-background/90 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur"
            >
              Chiqish
            </button>
          </>
        ) : (
          // Toolbar is hidden during a WebXR session; the headset drives the view.
          !inVR && (
            <Toolbar
              panelsHidden={panelsHidden}
              onTogglePanels={() => setField("panelsHidden", !panelsHidden)}
              onToggleFullscreen={toggleFullscreen}
            />
          )
        )}
      </div>

      {!immersive && (
        <SidePanel
          side="right"
          open={infoOpen}
          onClose={() => setField("infoOpen", false)}
          desktopHidden={panelsHidden}
          widthClass="lg:w-80"
          className="lg:shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.06)]"
        >
          <MoleculeInfoPanel molecule={molecule} />
        </SidePanel>
      )}
    </div>
  );
};

const MoleculesPage = () => (
  <SceneControlProvider>
    <MoleculesBody />
  </SceneControlProvider>
);

export default MoleculesPage;
