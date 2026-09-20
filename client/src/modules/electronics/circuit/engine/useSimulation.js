// Drives the sketch: builds the board + netlist, then pumps the generator each frame
// with a virtual clock so delay() advances time without ever blocking the browser.
import { useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import { buildNetlist } from "./netlist";
import { createBoard } from "./board";
import { createRunner } from "./interpreter";

const MAX_STEPS = 20000; // per frame, guards runaway loops without delay
const SPEED = 1; // virtual-ms per real-ms

const shallow = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  if (ka.length !== Object.keys(b).length) return false;
  return ka.every((k) => a[k] === b[k]);
};

export function useSimulation({ store, running, code, components, wires, onStop }) {
  const dataRef = useRef({ code, components, wires });
  const onStopRef = useRef(onStop);
  // keep the latest inputs available to the frame loop without restarting it
  useEffect(() => {
    dataRef.current = { code, components, wires };
    onStopRef.current = onStop;
  });

  useEffect(() => {
    if (!running) return undefined;
    const { code: src, components: comps, wires: ws } = dataRef.current;

    const netlist = buildNetlist(comps, ws);
    const board = createBoard(netlist, store);

    // seed interactive inputs from component props
    const seed = {};
    for (const c of comps) {
      if (c.type === "potentiometer") seed[c.id] = { value: c.props?.value ?? 512 };
      else if (c.type === "photoresistor") seed[c.id] = { light: c.props?.light ?? 700 };
      else if (c.type === "button") seed[c.id] = { pressed: false };
    }
    store.seedInputs(seed);

    let gen;
    try {
      gen = createRunner(src, board.api);
    } catch (e) {
      store.setMeta({ running: false, error: e.message });
      onStopRef.current?.();
      return undefined;
    }
    store.setMeta({ running: true, error: null });

    let raf = 0;
    let active = true;
    let virtual = 0;
    let pending = 0;
    let lastTs = null;
    let prevComps = {};

    const commit = () => {
      const next = board.readVisuals(dataRef.current.components);
      const merged = {};
      for (const id of Object.keys(next))
        merged[id] = shallow(prevComps[id], next[id]) ? prevComps[id] : next[id];
      prevComps = merged;
      store.setComps(merged);
    };

    const frame = (ts) => {
      if (!active) return;
      if (lastTs == null) lastTs = ts;
      let budget = Math.min(40, ts - lastTs) * SPEED;
      lastTs = ts;
      let steps = 0;
      try {
        while (steps < MAX_STEPS) {
          if (pending > 0) {
            if (budget <= 0) break;
            const step = Math.min(pending, budget);
            pending -= step;
            budget -= step;
            virtual += step;
            board.setTime(virtual);
            continue;
          }
          const r = gen.next();
          steps++;
          if (r.done) break;
          if (r.value && r.value.type === "delay") pending += r.value.ms;
        }
      } catch (e) {
        active = false;
        store.setMeta({ running: false, error: `Ishlash xatosi: ${e.message}` });
        onStopRef.current?.();
        return;
      }
      commit();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      active = false;
      cancelAnimationFrame(raf);
      store.setComps({});
      store.setMeta({ running: false });
    };
  }, [running, store]);
}

// Subscribe one part to its own visual slice (no re-render unless its slice changes).
export function useCompVisual(store, id) {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getComp(id),
  );
}

export function useSimMeta(store) {
  return useSyncExternalStore(store.subscribe, store.getMeta);
}

export function useCompInput(store, id) {
  return useSyncExternalStore(store.subscribe, () => store.getInput(id));
}
