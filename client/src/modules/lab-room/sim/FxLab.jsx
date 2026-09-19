import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import EquipmentModel from "../equipment/EquipmentModel";
import { LabContext } from "./labContext";
import { createLab } from "./createLab";
import { SCENARIOS } from "./scenarios";

const TOP = 0.9;
const STEP = 1 / 30;
const MAX_STEPS_PER_FRAME = 4;

const ctxAt = (scenario, t) =>
  Object.assign({}, ...(scenario.ctx ?? []).filter(([from, to]) => t >= from && t < to).map(([, , ctx]) => ctx));

const advance = (lab, rows, clock, dt) => {
  clock.time += dt;
  for (const row of rows) {
    if (row.scenario.device) {
      lab.ensureDevice(row.simId, row.scenario.state ?? {});
      (row.scenario.stateAt ?? []).forEach(([at, patch], i) => {
        const key = `${row.simId}:state:${i}`;
        if (at > clock.time || clock.done.has(key)) return;
        clock.done.add(key);
        lab.setDevice(row.simId, patch);
      });
      continue;
    }
    const entry = lab.ensureContainer(row.simId, row.scenario.container);
    row.scenario.timeline.forEach(([at, action], i) => {
      const key = `${row.simId}:${i}`;
      if (at > clock.time || clock.done.has(key)) return;
      clock.done.add(key);
      action(entry.mixture);
    });
  }
  lab.step(dt, (entry) => ctxAt(rows.find((row) => row.simId === entry.simId).scenario, clock.time));
  for (const row of rows) {
    if (row.scenario.fx && !row.scenario.device) Object.assign(lab.mixture(row.simId).fx, row.scenario.fx);
  }
};

// Dev-only review bench: ?fxlab=agno3-hcl,mg-hcl&t=6 runs real mixtures in a row of containers on bench 1.
const FxLab = ({ spec, startAt = 0, spacing = 0.16 }) => {
  const [lab] = useState(createLab);
  const clock = useRef({ time: 0, done: new Set(), acc: 0, ready: false });
  const rows = useMemo(() => {
    const names = spec.split(",").map((name) => name.trim()).filter((name) => SCENARIOS[name]);
    return names.map((name, i) => ({
      name,
      simId: `fx-${i}`,
      scenario: SCENARIOS[name],
      x: 0.3 - ((names.length - 1) * spacing) / 2 + i * spacing,
    }));
  }, [spec, spacing]);

  useEffect(() => {
    const state = clock.current;
    while (state.time < startAt) advance(lab, rows, state, STEP);
    state.ready = true;
    if (import.meta.env.DEV) window.__labFx = { lab, clock: state, rows };
  }, [lab, rows, startAt]);

  useFrame((_, delta) => {
    const state = clock.current;
    if (!state.ready) return;
    state.acc = Math.min(state.acc + delta, STEP * MAX_STEPS_PER_FRAME);
    while (state.acc >= STEP) {
      advance(lab, rows, state, STEP);
      state.acc -= STEP;
    }
  });

  return (
    <LabContext.Provider value={lab}>
      {rows.map((row) => (
        <EquipmentModel
          key={row.simId}
          id={row.scenario.device ?? row.scenario.container}
          simId={row.simId}
          position={[row.x, TOP, -0.72]}
        />
      ))}
    </LabContext.Provider>
  );
};

export default FxLab;
