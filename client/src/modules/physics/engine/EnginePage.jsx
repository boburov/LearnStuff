import { useEffect, useMemo, useRef, useState } from "react";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import { useSceneControlOptional } from "@/shared/lab/sceneControl";
import useObjectState from "@/shared/hooks/useObjectState";
import { STEP_RPM, createSnapStore, snapshotOf, useSnap } from "./engineSim";
import { DEG, SPARK_ANGLE, strokeProgress } from "./engineMath";
import { createEngineSound } from "./engineSound";
import { PART_BY_ID } from "./engineParts";
import {
  DESCRIPTION,
  FAST_RPM,
  STROKE_INFO,
  TITLE,
  describeValve,
} from "./data/engineContent";
import EngineStage from "./components/EngineStage";
import EngineInfo from "./components/EngineInfo";
import StrokeHud from "./components/StrokeHud";
import EnginePartCard from "./components/EnginePartCard";

const MODES = [
  { id: "solid", name: "Butun" },
  { id: "xray", name: "Rentgen" },
  { id: "explode", name: "Qismlarga ajratish" },
];
const MODE_NAME = Object.fromEntries(MODES.map((m) => [m.id, m.name]));

const CAMERA = [4.2, 2.2, 6.8];
const CONTROLS = { minDistance: 3.5, maxDistance: 16, regress: false };
const START_RPM = 20;
const VR_HINT = {
  headset: "Kontroller nuri bilan qismni tanlang · chapdagi paneldan dvigatelni boshqaring",
  phone: "Chapdagi paneldagi tugmaga qarang va ekranga bosing (pultda - A)",
};

// Building ~200 part geometries takes a few seconds on first load; never show an empty white canvas.
const EngineLoading = ({ readyStore }) => {
  const ready = useSnap(readyStore);
  if (ready) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#0d111c] text-sm font-medium text-slate-300">
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-slate-600 border-t-violet-400" />
        Dvigatel yuklanmoqda...
      </div>
    </div>
  );
};

const EngineOverlays = ({ snapStore, running, stepping, rpm, mode, selectedId, onClosePart }) => {
  const { inVR, cardboard, vrBox, walk } = useSceneControlOptional();
  if (inVR || cardboard || vrBox) return null;
  return (
    <>
      {mode !== "explode" && (
        <StrokeHud
          snapStore={snapStore}
          running={running}
          stepping={stepping}
          rpm={rpm}
          lowered={walk}
        />
      )}
      <EnginePartCard partId={selectedId} onClose={onClosePart} />
    </>
  );
};

// The toolbar/AI pause only freezes the frame loop; mirror it into the page so buttons, HUD and sound agree.
const PauseSync = ({ bridgeRef, onPause, onResume }) => {
  const { paused, togglePause } = useSceneControlOptional();
  const last = useRef(paused);

  useEffect(() => {
    bridgeRef.current = { paused, resume: togglePause };
  });

  useEffect(() => {
    if (last.current === paused) return;
    last.current = paused;
    if (paused) onPause();
    else onResume();
  }, [paused, onPause, onResume]);

  return null;
};

const EnginePage = () => {
  const simRef = useRef({ theta: 0, rpm: START_RPM, running: false, stepEnd: null });
  const soundRef = useRef(null);
  const soundWanted = useRef(false);
  const pauseBridge = useRef({ paused: false, resume: null });
  const pausedRun = useRef(null);
  const aiKey = useRef("");
  const [snapStore] = useState(() => createSnapStore(snapshotOf(0)));
  const [readyStore] = useState(() => createSnapStore(false));

  const {
    mode,
    running,
    stepping,
    rpm,
    soundOn,
    selectedId,
    aiSnap,
    predictAnswer,
    setField,
    setFields,
  } = useObjectState({
    mode: "solid",
    running: false,
    stepping: false,
    rpm: START_RPM,
    soundOn: false,
    selectedId: null,
    aiSnap: snapshotOf(0),
    predictAnswer: null,
  });

  // setField/setFields are new each render; handlers below must stay stable for the memoized scene.
  const setters = useRef({ setField, setFields });
  const live = useRef({ mode });
  useEffect(() => {
    setters.current = { setField, setFields };
    live.current = { mode };
  });

  const actions = useMemo(() => {
    const set = (updates) => setters.current.setFields(updates);
    // Exact snapshot for a halted/jumped engine; the next tick must refresh the AI strings.
    const publish = (theta) => {
      const snap = snapshotOf(theta);
      snapStore.set(snap);
      aiKey.current = "";
      return snap;
    };
    const halt = () => {
      const s = simRef.current;
      s.running = false;
      s.stepEnd = null;
    };
    const unpause = () => {
      pausedRun.current = null;
      const bridge = pauseBridge.current;
      if (bridge.paused) bridge.resume?.();
    };
    const play = () => {
      unpause();
      const s = simRef.current;
      s.stepEnd = null;
      s.running = true;
      set({ mode: "xray", running: true, stepping: false });
    };
    const stop = () => {
      halt();
      set({ running: false, stepping: false, aiSnap: publish(simRef.current.theta) });
    };
    // Internal parts are hidden inside the shells in "Butun", so their highlight needs x-ray.
    const selectPart = (id) => {
      const part = id ? PART_BY_ID[id] : null;
      if (part && !part.shell && live.current.mode === "solid") set({ selectedId: id, mode: "xray" });
      else set({ selectedId: part ? id : null });
    };

    return {
      play,
      stop,
      selectPart,
      toggleRun: () => (simRef.current.running ? stop() : play()),
      stepStroke: (i) => {
        unpause();
        const s = simRef.current;
        // The power stroke starts a few degrees early so the spark fires on screen.
        s.theta = i === 2 ? SPARK_ANGLE - 4 * DEG : i * Math.PI;
        s.stepEnd = (i + 1) * Math.PI - 0.002;
        s.running = true;
        set({ mode: "xray", running: true, stepping: true, aiSnap: publish(i * Math.PI) });
      },
      changeMode: (id) => {
        // The AI's select_item lands here too; route part ids to selection, ignore anything else.
        if (!MODE_NAME[id]) {
          if (PART_BY_ID[id]) selectPart(id);
          return;
        }
        if (id === "explode") {
          halt();
          pausedRun.current = null;
          set({ mode: id, running: false, stepping: false, aiSnap: publish(simRef.current.theta) });
        } else {
          set({ mode: id });
        }
      },
      ready: () => readyStore.set(true),
      tick: (next) => {
        const s = simRef.current;
        let snap = next;
        if (s.stepEnd != null) {
          const from = Math.floor(s.stepEnd / Math.PI) * Math.PI;
          if (snap.theta < from) snap = snapshotOf(from);
        }
        snapStore.set(snap);
        const fast = s.running && s.stepEnd == null && s.rpm > FAST_RPM;
        const key = fast
          ? "fast"
          : `${snap.stroke}|${snap.intakeOpen}|${snap.exhaustOpen}|${strokeProgress(snap.theta) < 0.5}`;
        if (key !== aiKey.current) {
          aiKey.current = key;
          set({ aiSnap: snap });
        }
      },
      stepDone: () => set({ running: false, stepping: false }),
      pause: () => {
        const s = simRef.current;
        if (!s.running) return;
        pausedRun.current = { stepEnd: s.stepEnd };
        halt();
        set({ running: false, stepping: false, aiSnap: publish(s.theta) });
      },
      resume: () => {
        const saved = pausedRun.current;
        pausedRun.current = null;
        if (!saved) return;
        const s = simRef.current;
        s.stepEnd = saved.stepEnd;
        s.running = true;
        set({ running: true, stepping: saved.stepEnd != null });
      },
      closePart: () => set({ selectedId: null }),
      setRpm: (value) => set({ rpm: value }),
      answer: (id) => set({ predictAnswer: id }),
      retry: () => set({ predictAnswer: null }),
      toggleSound: async (on) => {
        soundWanted.current = on;
        set({ soundOn: on });
        const sound = soundRef.current;
        if (!sound) return;
        if (!on) {
          sound.disable();
          return;
        }
        try {
          await sound.enable();
          if (!soundWanted.current) {
            sound.disable();
            return;
          }
          const s = simRef.current;
          sound.setRpm(s.stepEnd != null ? Math.min(s.rpm, STEP_RPM) : s.rpm);
          sound.setRunning(s.running);
        } catch {
          soundWanted.current = false;
          set({ soundOn: false });
        }
      },
    };
  }, [snapStore, readyStore]);

  useEffect(() => {
    const sound = createEngineSound();
    soundRef.current = sound;
    return () => {
      sound.dispose();
      if (soundRef.current === sound) soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    simRef.current.rpm = rpm;
    soundRef.current?.setRpm(stepping ? Math.min(rpm, STEP_RPM) : rpm);
  }, [rpm, stepping]);

  useEffect(() => {
    soundRef.current?.setRunning(running);
  }, [running]);

  // Only coarse strings go to the AI so fast running does not churn the context.
  const fast = running && !stepping && rpm > FAST_RPM;
  const strokeInfo = STROKE_INFO[aiSnap.stroke] ?? STROKE_INFO[0];
  const statusText = running
    ? stepping
      ? "bitta takt sekin ko'rsatilmoqda"
      : "ishlamoqda"
    : "to'xtatilgan";
  const strokeText = fast
    ? "taktlar juda tez almashmoqda"
    : `${strokeInfo.number}-takt: ${strokeInfo.name}`;
  const progress = strokeProgress(aiSnap.theta);
  const intakeText = fast
    ? "navbat bilan ochilib-yopiladi"
    : describeValve(aiSnap.intakeOpen, strokeInfo.intakeValve, progress, running);
  const exhaustText = fast
    ? "navbat bilan ochilib-yopiladi"
    : describeValve(aiSnap.exhaustOpen, strokeInfo.exhaustValve, progress, running);
  const partText = PART_BY_ID[selectedId]?.label ?? "tanlanmagan";

  const aiContext = useMemo(
    () => ({
      rejim: MODE_NAME[mode],
      holat: statusText,
      aylanish_chastotasi_ayl_min: rpm,
      joriy_takt: strokeText,
      kiritish_klapani: intakeText,
      chiqarish_klapani: exhaustText,
      tanlangan_qism: partText,
    }),
    [mode, statusText, rpm, strokeText, intakeText, exhaustText, partText],
  );

  const stage = useMemo(
    () => (
      <Scene camera={CAMERA} bg="#0d111c" controls={CONTROLS}>
        <EngineStage
          simRef={simRef}
          soundRef={soundRef}
          mode={mode}
          selectedId={selectedId}
          running={running}
          maxDistance={CONTROLS.maxDistance}
          onSelectPart={actions.selectPart}
          onTick={actions.tick}
          onStepDone={actions.stepDone}
          onReady={actions.ready}
          onToggleRun={actions.toggleRun}
          onMode={actions.changeMode}
        />
      </Scene>
    ),
    [mode, selectedId, running, actions],
  );

  return (
    <LabWorkspace
      title={TITLE}
      description={DESCRIPTION}
      backTo="/physics"
      backLabel="Fizika"
      items={MODES}
      activeId={mode}
      onSelect={actions.changeMode}
      vrHint={VR_HINT}
      aiContext={aiContext}
      scene={
        <div className="relative h-full w-full bg-[#0d111c]">
          {stage}
          <EngineLoading readyStore={readyStore} />
          <PauseSync bridgeRef={pauseBridge} onPause={actions.pause} onResume={actions.resume} />
          <EngineOverlays
            snapStore={snapStore}
            running={running}
            stepping={stepping}
            rpm={rpm}
            mode={mode}
            selectedId={selectedId}
            onClosePart={actions.closePart}
          />
        </div>
      }
      info={
        <EngineInfo
          running={running}
          stepping={stepping}
          rpm={rpm}
          soundOn={soundOn}
          snapStore={snapStore}
          predictAnswer={predictAnswer}
          selectedId={selectedId}
          onToggleRun={actions.toggleRun}
          onRpm={actions.setRpm}
          onSound={actions.toggleSound}
          onStepStroke={actions.stepStroke}
          onPredict={actions.answer}
          onPredictRetry={actions.retry}
          onSelectPart={actions.selectPart}
        />
      }
    />
  );
};

export default EnginePage;
