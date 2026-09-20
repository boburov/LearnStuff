// Figma-style full-screen workspace for every topic.
// Left: info + item picker.  Center: 3D scene + bottom toolbar.  Right: AI panel.
import { useEffect, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Headset, PanelLeft, Sparkles } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import useObjectState from "@/shared/hooks/useObjectState";
import { SceneControlProvider } from "./SceneControlProvider";
import { useSceneControl } from "./sceneControl";
import Toolbar from "./Toolbar";
import AiPanel from "./AiPanel";
import SidePanel from "./SidePanel";
import WorkspaceMobileBar from "./WorkspaceMobileBar";

// AI faqat nomni emas, modelning real ma'lumotini ko'rishi uchun: render-only
// maydonlarni (rang, koordinatalar, geometriya) tashlab, ilmiy qiymatlarni qoldiramiz.
const OMIT_FIELDS = new Set(["id", "name", "color", "pos", "atoms", "bonds", "materials", "slug"]);
const cleanActiveData = (item) => {
  if (!item) return undefined;
  const out = {};
  for (const [key, value] of Object.entries(item)) {
    if (OMIT_FIELDS.has(key) || value == null) continue;
    if (Array.isArray(value)) {
      // Faqat son/matn massivlarini (masalan elektron qobiqlar [2,8,1]) qoldiramiz.
      if (value.every((v) => typeof v === "number" || typeof v === "string"))
        out[key] = value.join(", ");
      continue;
    }
    if (typeof value === "object") continue;
    out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
};

const LeftPanel = ({ title, description, backTo, backLabel, items, activeId, onSelect, info }) => (
  <div className="flex h-full flex-col">
    <div className="border-b border-border p-4">
      <Link
        to={backTo}
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> {backLabel}
      </Link>
      <h1 className="text-lg font-semibold">{title}</h1>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </div>

    <div className="flex flex-wrap gap-2 border-b border-border p-4">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            activeId === it.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-foreground hover:bg-secondary",
          )}
        >
          {it.name}
        </button>
      ))}
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto p-4">{info}</div>
  </div>
);

const DEFAULT_VR_HINT =
  "Shishaga qarab bosing (yoki qarab turing) - oling · probirkaga qaratib yana bosing - quyiladi";

const WorkspaceBody = ({
  title,
  description,
  backTo = "/",
  backLabel = "Orqaga",
  items,
  activeId,
  onSelect,
  scene,
  info,
  aiContext,
  vrHint = DEFAULT_VR_HINT,
}) => {
  const rootRef = useRef(null);
  const { panelsHidden, vrDismissed, leftOpen, aiOpen, setField } = useObjectState({
    panelsHidden: false,
    vrDismissed: false,
    leftOpen: false,
    aiOpen: false,
  });
  const { subject, topic } = useParams();
  const [searchParams] = useSearchParams();
  const {
    inVR,
    startVR,
    vrMessage,
    cardboard,
    exitCardboard,
    vrBox,
    enterVrBox,
    exitVrBox,
    walk,
    exitWalk,
    setAiContext,
    logAction,
  } = useSceneControl();

  // Bosh sahifadagi "VR laboratoriyaga kirish" tugmasi ?vr=1 bilan keladi.
  const vrRequested = searchParams.get("vr") === "1";

  // Immersive/walk modes take over the whole screen - no panels, no mobile bar.
  const immersive = cardboard || inVR || walk || vrBox;
  // A page may give separate hints for a headset (controllers) and phone VR (gaze + tap).
  const activeVrHint =
    vrHint && typeof vrHint === "object" ? (inVR ? vrHint.headset : vrHint.phone) : vrHint;

  // Feed the live page context to the AI agent: subject, topic, item list, and
  // the full real data of the active item so answers are grounded, not invented.
  useEffect(() => {
    const activeItem = items?.find((it) => it.id === activeId);
    setAiContext({
      context: {
        subject,
        topic,
        title,
        items: items?.map((it) => ({
          id: it.id,
          name: it.name,
          ...(it.formula ? { formula: it.formula } : {}),
          ...(it.symbol ? { symbol: it.symbol } : {}),
        })),
        activeItem: activeItem?.name,
        activeData: cleanActiveData(activeItem),
        ...aiContext,
      },
      onSelectItem: onSelect,
    });
  }, [subject, topic, title, items, activeId, aiContext, onSelect, setAiContext]);

  // Note in the action journal which item the user is viewing.
  useEffect(() => {
    const name = items?.find((it) => it.id === activeId)?.name;
    if (name) logAction(`"${name}" modelini ko'rdi`);
  }, [activeId, items, logAction]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  };

  // VR box: to'liq ekran + stereo split. Fullscreen va giroskop ruxsati bir xil
  // foydalanuvchi ishorasidan kelib chiqishi uchun ikkalasini await'siz boshlaymiz
  // (iOS gyro ruxsati ishorani "yeb" qo'ymasin). iOS-da div fullscreen bo'lmasa,
  // split baribir ochiladi.
  const enterVrBoxMode = () => {
    const entering = enterVrBox();
    rootRef.current?.requestFullscreen?.().catch(() => {});
    return entering;
  };

  // Split ko'rinishdan chiqish: VR box bo'lsa fullscreendan ham chiqamiz.
  const exitSplitView = () => {
    if (vrBox) {
      exitVrBox();
      if (document.fullscreenElement) document.exitFullscreen();
    } else {
      exitCardboard();
    }
  };

  // Fullscreendan (Esc / tizim tugmasi bilan) chiqilsa - VR box'ni ham yopamiz.
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement && vrBox) exitVrBox();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, [vrBox, exitVrBox]);

  return (
    <div ref={rootRef} className="relative flex h-full w-full bg-background">
      {!immersive && (
        <SidePanel
          side="left"
          open={leftOpen}
          onClose={() => setField("leftOpen", false)}
          desktopHidden={panelsHidden}
          widthClass="lg:w-72"
          className="lg:shadow-[4px_0_16px_-4px_rgba(0,0,0,0.06)]"
        >
          <LeftPanel
            title={title}
            description={description}
            backTo={backTo}
            backLabel={backLabel}
            items={items}
            activeId={activeId}
            onSelect={onSelect}
            info={info}
          />
        </SidePanel>
      )}

      <div className="relative min-w-0 flex-1">
        {scene}

        {/* Mobile: floating back + panel-open buttons (panels are drawers here). */}
        {!immersive && (
          <WorkspaceMobileBar
            backTo={backTo}
            onOpenLeft={() => setField("leftOpen", true)}
            leftIcon={<PanelLeft size={18} />}
            leftLabel="Ma'lumot panelini ochish"
            onOpenRight={() => setField("aiOpen", true)}
            rightIcon={<Sparkles size={18} />}
            rightLabel="Mira AI ni ochish"
          />
        )}

        {cardboard || vrBox ? (
          <>
            {/* Center seam to help align the phone in the headset. */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-white/40" />
            <button
              onClick={exitSplitView}
              className="absolute right-3 top-3 z-30 rounded-lg bg-background/90 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur"
            >
              Chiqish
            </button>
            {/* VR box'da kontroller yo'riqnomasi. */}
            {vrBox && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
                <div className="rounded-full bg-background/80 px-3 py-1 text-[13px] text-muted-foreground backdrop-blur">
                  Joystik — aylantirish · A — tanlash · B — orqaga · X/Y — masshtab
                </div>
              </div>
            )}
          </>
        ) : (
          // Toolbar is hidden during a WebXR session; the headset drives the view.
          !inVR && (
            <Toolbar
              panelsHidden={panelsHidden}
              onTogglePanels={() => setField("panelsHidden", !panelsHidden)}
              onToggleFullscreen={toggleFullscreen}
              onEnterVrBox={enterVrBoxMode}
            />
          )
        )}

        {/* Cardboard'da stereo seam markazda, shuning uchun yo'riqnoma tepada. */}
        {(cardboard || vrBox || inVR) && activeVrHint && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto rounded-full border border-border bg-background/90 px-4 py-1.5 text-center text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              {activeVrHint}
            </div>
          </div>
        )}

        {/* Sayohat (walk) rejimi yo'riqnomasi */}
        {walk && !inVR && (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-background/90 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <span>Sudrab qarang · WASD bilan yuring</span>
              <button
                onClick={exitWalk}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-foreground hover:bg-secondary/70"
              >
                Chiqish
              </button>
            </div>
          </div>
        )}

        {/* VR ko'zoynakdan kelinganda yagona tugma: qurilmaga qarab immersive-vr
            (headset), cardboard (telefon) yoki sayohat (kompyuter) avtomatik tanlanadi. */}
        {vrRequested && !inVR && !cardboard && !vrDismissed && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-background/80 p-6 backdrop-blur">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-xl">
              <div className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Headset size={24} />
              </div>
              <h2 className="mt-3 text-lg font-semibold">VR laboratoriya</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ko'zoynak ulansa - immersiv VR; telefon bo'lsa ko'zoynakka joylab
                giroskop bilan qarang; kompyuterda sudrab qarash va WASD bilan yuriladi.
              </p>
              <button
                onClick={async () => {
                  const mode = await startVR();
                  // Kompyuterda (headset/gyro yo'q) sayohat rejimiga tushdi - oynani yopamiz.
                  if (mode === "walk") setField("vrDismissed", true);
                }}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Headset size={16} /> VR rejimiga kirish
              </button>
              {vrMessage && (
                <p className="mt-2 text-xs text-destructive">{vrMessage}</p>
              )}
              <button
                onClick={() => setField("vrDismissed", true)}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground"
              >
                Oddiy rejimda davom etish
              </button>
            </div>
          </div>
        )}
      </div>

      {!immersive && (
        <SidePanel
          side="right"
          open={aiOpen}
          onClose={() => setField("aiOpen", false)}
          desktopHidden={panelsHidden}
          widthClass="lg:w-80"
          className="lg:shadow-[-4px_0_16px_-4px_rgba(0,0,0,0.06)]"
        >
          <AiPanel />
        </SidePanel>
      )}
    </div>
  );
};

const LabWorkspace = (props) => (
  <SceneControlProvider>
    <WorkspaceBody {...props} />
  </SceneControlProvider>
);

export default LabWorkspace;
