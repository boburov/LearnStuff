// Figma-style floating toolbar pinned to the bottom-center of the 3D area.
import { useEffect } from "react";
import {
  Pause,
  Play,
  RotateCcw,
  Maximize2,
  PanelsTopLeft,
  Plus,
  Minus,
  Headset,
  Glasses,
  Footprints,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { useSceneControl } from "./sceneControl";

const ToolButton = ({ label, active, onClick, children, className }) => (
  <button
    type="button"
    onClick={onClick}
    title={label}
    aria-label={label}
    className={cn(
      "grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
      active && "bg-primary/10 text-primary",
      className,
    )}
  >
    {children}
  </button>
);

const Toolbar = ({ onToggleFullscreen, onTogglePanels, onEnterVrBox, panelsHidden }) => {
  const {
    paused,
    togglePause,
    reset,
    zoomIn,
    zoomOut,
    startVR,
    gyroSupported,
    walk,
    toggleWalk,
  } = useSceneControl();

  // Keyboard zoom: +/= zooms in, -/_ zooms out (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable)
        return;
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-2">
      <div className="hidden-scrollbar pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border bg-background/90 p-1.5 shadow-lg backdrop-blur">
        <ToolButton
          label={paused ? "Davom ettirish" : "To'xtatish"}
          onClick={togglePause}
        >
          {paused ? <Play size={18} /> : <Pause size={18} />}
        </ToolButton>

        <ToolButton label="Kamerani tiklash" onClick={reset}>
          <RotateCcw size={18} />
        </ToolButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolButton label="Uzoqlashtirish" onClick={zoomOut}>
          <Minus size={18} />
        </ToolButton>

        <ToolButton label="Yaqinlashtirish" onClick={zoomIn}>
          <Plus size={18} />
        </ToolButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Panel toggle is desktop-only; on mobile the panels are drawers. */}
        <ToolButton
          label={panelsHidden ? "Panellarni ko'rsatish" : "Panellarni yashirish"}
          active={panelsHidden}
          onClick={onTogglePanels}
          className="hidden lg:grid"
        >
          <PanelsTopLeft size={18} />
        </ToolButton>

        <ToolButton label="To'liq ekran" onClick={onToggleFullscreen}>
          <Maximize2 size={18} />
        </ToolButton>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Bitta universal VR tugmasi: headset bo'lsa immersive-vr, telefon bo'lsa
            cardboard, aks holda sayohat (magic-window) - har doim ishlaydi. */}
        <ToolButton label="VR rejimi" onClick={startVR}>
          <Headset size={18} />
        </ToolButton>

        {/* VR box: to'liq ekranda 2 linza uchun "[ ][ ]" chap/o'ng stereo split. */}
        {onEnterVrBox && (
          <ToolButton label="VR box (2 linza)" onClick={onEnterVrBox}>
            <Glasses size={18} />
          </ToolButton>
        )}

        {/* Sayohat: gyrosi yo'q qurilmalarda alohida tugma (WASD + sichqoncha). */}
        {!gyroSupported && (
          <ToolButton label="Sayohat rejimi (WASD)" active={walk} onClick={toggleWalk}>
            <Footprints size={18} />
          </ToolButton>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
