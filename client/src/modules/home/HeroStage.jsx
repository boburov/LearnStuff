// Picks the hero centerpiece: WebGL voxel desk when the device can afford it, flat pixel desk otherwise.
import { lazy, Suspense, useEffect, useRef } from "react";
import useMediaQuery from "@/shared/hooks/useMediaQuery";
import useObjectState from "@/shared/hooks/useObjectState";
import HeroMachineStatic from "./HeroMachineStatic";

const HeroMachineScene = lazy(() => import("./HeroMachineScene"));

const hasWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
};

const isWeakDevice = () =>
  (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
  (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);

const HeroStage = () => {
  const wrapper = useRef(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isCompact = useMediaQuery("(max-width: 767px)");
  const { mode, active, setField } = useObjectState({ mode: "pending", active: true });

  useEffect(() => {
    const useStatic = reducedMotion || isCompact || !hasWebGL() || isWeakDevice();
    setField("mode", useStatic ? "static" : "scene");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, isCompact]);

  // Stop rendering when the hero is off-screen or the tab is hidden.
  useEffect(() => {
    if (mode !== "scene") return;
    const el = wrapper.current;
    let visible = true;
    const sync = () => setField("active", visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  return (
    <div ref={wrapper} aria-hidden="true" className="absolute inset-0">
      {mode === "scene" && (
        <Suspense fallback={null}>
          <HeroMachineScene active={active} />
        </Suspense>
      )}
      {mode === "static" && <HeroMachineStatic animate={!reducedMotion} />}
    </div>
  );
};

export default HeroStage;
