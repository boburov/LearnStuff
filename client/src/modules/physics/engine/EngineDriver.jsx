import { useRef } from "react";
import { usePausableFrame } from "@/shared/lab/usePausableFrame";
import { CYCLE, SPARK_ANGLE, VALVES, crossed, rpmToRadPerSec, strokeIndex } from "./engineMath";
import { STEP_RPM, snapshotOf } from "./engineSim";

const TICK_MS = 100;
const valveCloseAngle = (which) => VALVES[which].peak + VALVES[which].width / 2;

const EngineDriver = ({ simRef, soundRef, onTick, onStepDone }) => {
  const lastTick = useRef({ at: 0, stroke: -1 });

  usePausableFrame((state, delta) => {
    const s = simRef.current;
    if (!s.running) return;

    const dt = Math.min(delta, 0.05);
    const rpm = s.stepEnd != null ? Math.min(s.rpm, STEP_RPM) : s.rpm;
    const prev = s.theta;
    let next = prev + rpmToRadPerSec(rpm) * dt;
    let finished = false;
    if (s.stepEnd != null && next >= s.stepEnd) {
      next = s.stepEnd;
      finished = true;
    }

    const sound = soundRef?.current;
    if (sound) {
      if (crossed(prev, next, SPARK_ANGLE)) sound.fire();
      if (crossed(prev, next, valveCloseAngle("intake")) || crossed(prev, next, valveCloseAngle("exhaust")))
        sound.valve();
    }

    if (finished) {
      s.theta = next;
      s.running = false;
      s.stepEnd = null;
    } else {
      s.theta = next >= CYCLE ? next - CYCLE : next;
    }

    const now = state.clock.elapsedTime * 1000;
    const stroke = strokeIndex(s.theta);
    if (finished || stroke !== lastTick.current.stroke || now - lastTick.current.at > TICK_MS) {
      lastTick.current = { at: now, stroke };
      onTick?.(snapshotOf(s.theta));
    }
    if (finished) onStepDone?.();
  });

  return null;
};

export default EngineDriver;
