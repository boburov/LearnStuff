// Context object + consumer hook (kept separate from the provider component so
// fast-refresh stays happy - a file may export either components or non-components).
import { createContext, useContext } from "react";

export const SceneControlContext = createContext(null);

// Safe defaults for scenes rendered outside a provider (e.g. the landing hero).
const NOOP_CONTROL = {
  paused: false,
  togglePause: () => {},
  reset: () => {},
  zoomIn: () => {},
  zoomOut: () => {},
  controlsRef: { current: null },
  // WebXR VR: immersive-vr session via a headset.
  xrStore: null,
  inVR: false,
  vrSupported: false,
  enterVR: () => {},
  // Universal "Enter VR": immersive-vr -> cardboard -> walk fallback.
  startVR: async () => "walk",
  vrMessage: "",
  setVrMessage: () => {},
  // Phone cardboard VR: split-screen stereo + gyroscope.
  cardboard: false,
  gyroSupported: false,
  toggleCardboard: () => {},
  exitCardboard: () => {},
  // "VR box": fullscreen left/right stereo split adapted for the two lenses.
  vrBox: false,
  enterVrBox: async () => {},
  exitVrBox: () => {},
  // Desktop first-person "walk" mode: drag-look + WASD locomotion.
  walk: false,
  toggleWalk: () => {},
  exitWalk: () => {},
  // AI yordamchi uchun: joriy kontekst, uni o'rnatish va agent aksiyalarini bajarish.
  aiContext: {},
  setAiContext: () => {},
  runAiAction: () => false,
  recentActions: { current: [] },
  logAction: () => {},
};

// Throws if no provider - use where the toolbar is guaranteed (workspace).
export const useSceneControl = () => {
  const ctx = useContext(SceneControlContext);
  if (!ctx)
    throw new Error("useSceneControl must be used within SceneControlProvider");
  return ctx;
};

// Never throws - falls back to no-op when there is no provider.
export const useSceneControlOptional = () =>
  useContext(SceneControlContext) ?? NOOP_CONTROL;
