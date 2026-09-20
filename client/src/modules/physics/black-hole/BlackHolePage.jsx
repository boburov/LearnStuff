import { useCallback, useMemo, useRef, useState } from "react";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import useObjectState from "@/shared/hooks/useObjectState";
import BlackHoleStage from "./BlackHoleStage";
import BlackHoleInfo from "./BlackHoleInfo";
import {
  DEFAULTS,
  DESCRIPTION,
  ISCO_R,
  PHOTON_R,
  QUALITIES,
  RS,
  TITLE,
  VIEWS,
  VR_HINT,
} from "./data/blackHoleContent";

const CONTROLS = { minDistance: 4, maxDistance: 70, enablePan: false };
const ITEMS = VIEWS.map((v) => ({ id: v.id, name: v.name }));
const START_QUALITY = QUALITIES.find((q) => q.id === DEFAULTS.quality);

const BlackHolePage = () => {
  const [distance, setDistance] = useState(VIEWS[0].position[2]);
  const sampled = useRef(0);

  const { state, view, setField, setFields } = useObjectState({
    ...DEFAULTS,
    steps: START_QUALITY.steps,
  });

  // The canvas is mounted once: every slider reaches the shader through this
  // ref, so moving one never remounts the WebGL context.
  const live = useRef({ settings: state, viewPosition: VIEWS[0].position });
  live.current = {
    settings: state,
    viewPosition: VIEWS.find((v) => v.id === view)?.position ?? VIEWS[0].position,
  };

  // The readout follows the camera, but a few times a second is plenty.
  const onCamera = useCallback((r) => {
    const now = performance.now();
    if (now - sampled.current < 120) return;
    sampled.current = now;
    setDistance(r);
  }, []);

  const scene = useMemo(
    () => (
      <Scene camera={VIEWS[0].position} bg="#05060c" controls={CONTROLS}>
        <BlackHoleStage live={live} onCamera={onCamera} />
      </Scene>
    ),
    [onCamera],
  );

  const aiContext = useMemo(
    () => ({
      qora_tuynuk: "Shvarcshild (aylanmaydigan), M = 1 birlikda",
      hodisalar_ufqi_rs: RS,
      foton_sferasi_M: PHOTON_R,
      isco_M: ISCO_R,
      kamera_masofasi_rs: (distance / RS).toFixed(1),
      disk_ichki_radius_rs: (state.inner / RS).toFixed(1),
      disk_tashqi_radius_rs: (state.outer / RS).toFixed(1),
      gravitatsion_linza: state.lensing ? "yoqilgan" : "o'chirilgan",
      doppler: state.doppler ? "yoqilgan" : "o'chirilgan",
    }),
    [distance, state.inner, state.outer, state.lensing, state.doppler],
  );

  return (
    <LabWorkspace
      title={TITLE}
      description={DESCRIPTION}
      backTo="/physics"
      backLabel="Fizika"
      items={ITEMS}
      activeId={view}
      onSelect={(id) => setField("view", id)}
      vrHint={VR_HINT}
      aiContext={aiContext}
      scene={<div className="relative h-full w-full bg-[#05060c]">{scene}</div>}
      info={<BlackHoleInfo settings={state} distance={distance} onChange={setFields} />}
    />
  );
};

export default BlackHolePage;
