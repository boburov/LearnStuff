// Provides shared state between the 3D Scene and the bottom toolbar.
// `paused` gates auto-rotation; `controlsRef` lets the toolbar reset and zoom the camera.
// Also hosts the AI assistant's context + action bus so the agent can drive the scene.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SceneControlContext } from "./sceneControl";
import { xrStore } from "./xrStore";

const ZOOM_STEP = 1.2; // multiply/divide camera distance per zoom step

// Phone cardboard VR is feasible when the device exposes orientation events.
// We DON'T require pointer:coarse (it wrongly excludes phones with a paired
// stylus/mouse and tablets); a touch-capable device with DeviceOrientationEvent
// is enough to OFFER the button - a live event is verified at toggle time.
const detectGyro = () =>
  typeof window !== "undefined" &&
  "DeviceOrientationEvent" in window &&
  ("ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.("(pointer: coarse)").matches);

export const SceneControlProvider = ({ children }) => {
  const navigate = useNavigate();
  const [paused, setPaused] = useState(false);
  // Seed from the live store so a session that is already running (e.g. entered
  // before this provider mounted) is reflected immediately, not a render late.
  const [inVR, setInVR] = useState(() => xrStore.getState().session != null);
  const [vrSupported, setVrSupported] = useState(false);
  const [cardboard, setCardboard] = useState(false);
  // "VR box" (Cardboard-style headset): fullscreen stereo split, gyro-driven when
  // available and a static split otherwise - so it never blanks on a gyro-less device.
  const [vrBox, setVrBox] = useState(false);
  const [walk, setWalk] = useState(false);
  const [gyroSupported] = useState(detectGyro);
  // Short Uzbek note shown when VR can't start / falls back to another mode.
  const [vrMessage, setVrMessage] = useState("");
  const controlsRef = useRef(null);

  // What the user is looking at right now - fed to the AI as live context.
  const [aiContext, setAiContextState] = useState({});
  // Page registers a callback so the agent can select an item (molecule, planet...).
  const onSelectItemRef = useRef(null);
  // Ring buffer of the user's recent actions, so the agent can be proactive.
  const recentActions = useRef([]);

  const setAiContext = useCallback((ctx) => {
    setAiContextState(ctx?.context || {});
    onSelectItemRef.current = ctx?.onSelectItem || null;
  }, []);

  const logAction = useCallback((text) => {
    if (!text) return;
    const buf = recentActions.current;
    buf.push(text);
    if (buf.length > 12) buf.shift();
  }, []);

  // Feature-detect immersive-vr so we only show the button on capable devices.
  useEffect(() => {
    let active = true;
    navigator.xr
      ?.isSessionSupported?.("immersive-vr")
      .then((ok) => active && setVrSupported(!!ok))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Track whether an XR session is running. The initial value is already seeded
  // from xrStore.getState() above, so here we only subscribe to future changes.
  useEffect(() => xrStore.subscribe((s) => setInVR(s.session != null)), []);

  // Headset-only path; never throws (rejection swallowed). Returns the session.
  const enterVR = useCallback(async () => {
    try {
      return await xrStore.enterVR();
    } catch {
      return null;
    }
  }, []);

  // iOS 13+ needs an explicit gesture-triggered permission for gyroscope.
  const requestGyroPermission = useCallback(async () => {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") {
      try {
        return (await D.requestPermission()) === "granted";
      } catch {
        return false;
      }
    }
    return true;
  }, []);

  const exitCardboard = useCallback(() => setCardboard(false), []);
  const toggleCardboard = useCallback(async () => {
    if (cardboard) {
      setCardboard(false);
      return;
    }
    const ok = await requestGyroPermission();
    if (ok) {
      setWalk(false);
      setCardboard(true);
    } else {
      setVrMessage("Giroskopga ruxsat berilmadi");
    }
  }, [cardboard, requestGyroPermission]);

  // Dedicated "VR box" mode: go straight to the fullscreen left/right stereo split
  // for a phone-in-a-headset - no immersive-vr headset attempt. Unlike cardboard it
  // does NOT require a gyroscope (persists as a static split), so it also previews
  // on desktop. Gyro is requested here (needs the button's user gesture) for head-look.
  const exitVrBox = useCallback(() => setVrBox(false), []);
  const enterVrBox = useCallback(async () => {
    setVrMessage("");
    const ok = await requestGyroPermission();
    setWalk(false);
    setCardboard(false);
    setVrBox(true);
    if (!ok) setVrMessage("Giroskopsiz: statik ko'rinish");
  }, [requestGyroPermission]);

  // ONE universal "Enter VR": real headset (immersive-vr) -> phone cardboard
  // (stereo + gyro) -> desktop magic-window (drag-look + WASD). Always does
  // something useful and surfaces a reason in Uzbek instead of failing silently.
  const startVR = useCallback(async () => {
    setVrMessage("");
    // 1) Real headset / emulator.
    if (window.isSecureContext && navigator.xr) {
      try {
        if (await navigator.xr.isSessionSupported("immersive-vr")) {
          const session = await enterVR();
          if (session) return "vr";
        }
      } catch {
        // fall through to cardboard / walk
      }
    }
    // 2) Phone cardboard - faqat haqiqiy sensor/teginishli qurilmada. Desktop
    //    Safari ham DeviceOrientationEvent'ni e'lon qiladi (giroskopsiz), shuning
    //    uchun bu yerda qat'iy detektsiya (gyroSupported) ishlatiladi, aks holda
    //    kompyuter split-screen cardboard'ga tushib qolardi.
    if (gyroSupported) {
      const ok = await requestGyroPermission();
      if (ok) {
        setWalk(false);
        setCardboard(true);
        return "cardboard";
      }
      setVrMessage("Giroskopga ruxsat berilmadi");
    }
    // 3) Desktop / no gyro: magic-window walk so the button always does something.
    if (!window.isSecureContext) setVrMessage("VR uchun HTTPS ulanish kerak");
    setCardboard(false);
    setWalk(true);
    return "walk";
  }, [enterVR, requestGyroPermission, gyroSupported]);

  // Desktop first-person walk mode (mutually exclusive with cardboard).
  const exitWalk = useCallback(() => setWalk(false), []);
  const toggleWalk = useCallback(() => {
    setCardboard(false);
    setWalk((w) => !w);
  }, []);

  // Esc leaves walk mode.
  useEffect(() => {
    if (!walk) return;
    const onKey = (e) => e.key === "Escape" && setWalk(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [walk]);

  const togglePause = () => setPaused((p) => !p);
  const reset = useCallback(() => controlsRef.current?.reset(), []);

  // Dolly the camera toward/away from the orbit target, clamped to the
  // controls' min/max distance. `factor < 1` zooms in, `> 1` zooms out.
  const dolly = useCallback((factor) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;
    const target = controls.target;
    const dir = camera.position.clone().sub(target);
    const dist = dir.length();
    const next = Math.min(
      controls.maxDistance,
      Math.max(controls.minDistance, dist * factor),
    );
    camera.position.copy(target).add(dir.setLength(next));
    controls.update();
  }, []);

  const zoomIn = useCallback(() => dolly(1 / ZOOM_STEP), [dolly]);
  const zoomOut = useCallback(() => dolly(ZOOM_STEP), [dolly]);

  // Leaving cardboard mode on Escape (e.g. when testing on desktop).
  useEffect(() => {
    if (!cardboard) return;
    const onKey = (e) => e.key === "Escape" && setCardboard(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardboard]);

  // Esc leaves VR box mode (fullscreen exit is also synced in LabWorkspace).
  useEffect(() => {
    if (!vrBox) return;
    const onKey = (e) => e.key === "Escape" && setVrBox(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vrBox]);

  // Executes a tool call emitted by the AI agent. Returns true when handled,
  // so the panel can show a small "bajarildi" confirmation.
  const runAiAction = useCallback(
    (action) => {
      if (!action?.name) return false;
      switch (action.name) {
        case "control_scene": {
          const a = action.args?.action;
          if (a === "zoom_in") zoomIn();
          else if (a === "zoom_out") zoomOut();
          else if (a === "reset") reset();
          else if (a === "pause") setPaused(true);
          else if (a === "resume") setPaused(false);
          else return false;
          return true;
        }
        case "navigate_topic": {
          const { subject, topic } = action.args || {};
          if (!subject || !topic) return false;
          navigate(`/${subject}/${topic}`);
          return true;
        }
        case "select_item": {
          const id = action.args?.itemId;
          if (!id || !onSelectItemRef.current) return false;
          onSelectItemRef.current(id);
          return true;
        }
        default:
          return false; // start_quiz - panel o'zi qayta ishlaydi
      }
    },
    [zoomIn, zoomOut, reset, navigate],
  );

  const value = useMemo(
    () => ({
      paused,
      togglePause,
      reset,
      zoomIn,
      zoomOut,
      controlsRef,
      xrStore,
      inVR,
      vrSupported,
      enterVR,
      startVR,
      vrMessage,
      setVrMessage,
      cardboard,
      gyroSupported,
      toggleCardboard,
      exitCardboard,
      vrBox,
      enterVrBox,
      exitVrBox,
      walk,
      toggleWalk,
      exitWalk,
      aiContext,
      setAiContext,
      runAiAction,
      recentActions,
      logAction,
    }),
    [
      paused,
      reset,
      zoomIn,
      zoomOut,
      inVR,
      vrSupported,
      enterVR,
      startVR,
      vrMessage,
      cardboard,
      gyroSupported,
      toggleCardboard,
      exitCardboard,
      vrBox,
      enterVrBox,
      exitVrBox,
      walk,
      toggleWalk,
      exitWalk,
      aiContext,
      setAiContext,
      runAiAction,
      logAction,
    ],
  );

  return (
    <SceneControlContext.Provider value={value}>
      {children}
    </SceneControlContext.Provider>
  );
};
