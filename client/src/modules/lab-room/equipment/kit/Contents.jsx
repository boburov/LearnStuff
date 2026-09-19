import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useLab } from "../../sim/labContext";
import { Bubbles, Flame, FlashLight, Smoke, SodiumBall, Sparks, Spatter, Steam } from "../../effects";
import { useKit } from "./kitContext";
import Liquid from "./Liquid";
import { createLiveContents, staticVisual } from "./liveContents";

// After the lab runner (0.55) and the held-item pose (0.6), before effects read their params (0.7).
export const CONTENTS_PRIORITY = 0.65;
const ORIGIN = [0, 0, 0];
const POINT_FLAME_RADIUS = 0.006;

const LiveContents = ({ lab, simId, vessel, fallback }) => {
  const { quality } = useKit();
  const { innerProfile, mouthY, mouthR, meniscus } = vessel;
  const live = useMemo(
    () => createLiveContents({ innerProfile, mouthY, mouthR, meniscus, quality }),
    [innerProfile, mouthY, mouthR, meniscus, quality],
  );
  useEffect(() => () => live.dispose(), [live]);
  const { volumeMl, color, opacity } = fallback ?? {};
  const idle = useMemo(() => staticVisual({ volumeMl, color, opacity }), [volumeMl, color, opacity]);

  useFrame((state, delta) => live.update(lab.visual(simId) ?? idle, delta, state.clock.elapsedTime), CONTENTS_PRIORITY);

  return (
    <primitive object={live.group}>
      <Bubbles innerProfile={innerProfile} get={live.get.bubbles} />
      <Bubbles innerProfile={innerProfile} get={live.get.boil} />
      <SodiumBall surfaceRadius={live.mouthRadius} get={live.get.sodium} />
      <primitive object={live.anchors.vent}>
        <Steam origin={ORIGIN} radius={live.mouthRadius} get={live.get.steam} />
        <Smoke origin={ORIGIN} radius={live.mouthRadius} get={live.get.smoke} />
        <Sparks origin={ORIGIN} get={live.get.sparks} />
        <Spatter origin={ORIGIN} radius={live.mouthRadius} get={live.get.spatter} />
        <FlashLight origin={ORIGIN} get={live.get.flash} />
      </primitive>
      <primitive object={live.anchors.pool}>
        <Flame origin={ORIGIN} radius={live.mouthRadius} get={live.get.pool} />
      </primitive>
      <primitive object={live.anchors.point}>
        <Flame origin={ORIGIN} radius={POINT_FLAME_RADIUS} get={live.get.point} />
      </primitive>
    </primitive>
  );
};

// Live chemistry when a lab and simId exist; otherwise exactly the static liquid of thumbnails and showcase rows.
const Contents = ({ simId, vessel, fallback }) => {
  const lab = useLab();
  if (lab && simId) return <LiveContents lab={lab} simId={simId} vessel={vessel} fallback={fallback} />;
  if (!(fallback?.volumeMl > 0)) return null;
  return (
    <Liquid
      innerProfile={vessel.innerProfile}
      volumeMl={fallback.volumeMl}
      color={fallback.color}
      opacity={fallback.opacity}
      meniscus={vessel.meniscus}
    />
  );
};

export default Contents;
