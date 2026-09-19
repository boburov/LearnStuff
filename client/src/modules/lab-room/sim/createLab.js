import { createSnapStore } from "@/shared/utils/snapStore";
import { appearance } from "../chemistry/appearance";
import { createHazards } from "../hazards/hazardStore";
import { createMixture } from "../chemistry/mixture";
import { stepMixture } from "../chemistry/engine";
import { CONTAINERS } from "./containers";

// Holds the live state behind every lab object: container mixtures and device states, keyed by simId (object id).
export const createLab = () => {
  const containers = new Map();
  const devices = new Map();
  const listeners = new Map();
  const versions = new Map();
  let steps = 0;
  let now = 0;
  let generation = 0;

  const notify = (simId) => {
    versions.set(simId, (versions.get(simId) ?? 0) + 1);
    listeners.get(simId)?.forEach((listener) => listener());
  };

  const pendingMixes = new Map();

  const lab = {
    // Player settings effects must honour (reduceMotion dims flashes and shakes).
    prefs: { reduceMotion: false },
    // Spills, fires, room gas and the alarm.
    hazards: createHazards(),
    // What the player is doing this frame (pouring, heating, stirring…); written by the interaction system.
    activity: {},
    // Reaction pop-ups, warnings and the monitor's current reaction.
    feed: createSnapStore({ items: [], monitor: null, history: [] }),
    // Short-lived world-space light flashes (pops, bangs, ignition).
    flashes: [],
    // When each repeatable warning was last shown, so toasts don't repeat every step.
    notices: new Map(),
    // One-shot sounds the runtime asks for; the sound layer drains this every frame.
    sounds: [],
    queueMix: (simId, result) => {
      if (!result) return;
      if (!pendingMixes.has(simId)) pendingMixes.set(simId, []);
      pendingMixes.get(simId).push(result);
    },
    takeMixes: (simId) => {
      const list = pendingMixes.get(simId) ?? [];
      pendingMixes.delete(simId);
      return list;
    },
    now: () => now,
    // Bumped by reset so frame loops drop what they cached about the previous lab.
    generation: () => generation,

    ensureContainer: (simId, typeId, init) => {
      if (!containers.has(simId)) {
        const params = CONTAINERS[typeId] ?? { capacityMl: 100, vesselHeatJK: 20, coolWK: 0.6 };
        const mixture = createMixture(params);
        init?.(mixture);
        containers.set(simId, { simId, typeId, params, mixture, visual: null, visualStep: -1 });
      }
      return containers.get(simId);
    },
    container: (simId) => containers.get(simId) ?? null,
    mixture: (simId) => containers.get(simId)?.mixture ?? null,
    removeContainer: (simId) => containers.delete(simId),

    // Cached per simulation step, so every renderer reading it in the same frame shares one computation.
    visual: (simId) => {
      const entry = containers.get(simId);
      if (!entry) return null;
      if (entry.visualStep !== steps) {
        entry.visual = appearance(entry.mixture);
        entry.visualStep = steps;
      }
      return entry.visual;
    },

    device: (simId) => devices.get(simId) ?? null,
    removeDevice: (simId) => devices.delete(simId),
    ids: () => new Set([...containers.keys(), ...devices.keys()]),
    ensureDevice: (simId, initial) => {
      if (!devices.has(simId)) devices.set(simId, { ...initial });
      return devices.get(simId);
    },
    // Discrete changes that React should see (lit, cover, loads); continuous fields may be mutated directly.
    setDevice: (simId, patch) => {
      const state = devices.get(simId) ?? {};
      devices.set(simId, Object.assign(state, patch));
      notify(simId);
    },
    subscribe: (simId, listener) => {
      if (!listeners.has(simId)) listeners.set(simId, new Set());
      listeners.get(simId).add(listener);
      return () => listeners.get(simId)?.delete(listener);
    },
    version: (simId) => versions.get(simId) ?? 0,

    // ctxFor(entry) supplies heat, stirring, cover, atmosphere… for one container this step.
    step: (dt, ctxFor = () => ({})) => {
      now += dt;
      steps += 1;
      const events = [];
      for (const entry of containers.values()) {
        const ctx = { now, container: entry.typeId, coolWK: entry.params.coolWK, ...ctxFor(entry) };
        for (const event of stepMixture(entry.mixture, dt, ctx)) events.push({ ...event, simId: entry.simId });
      }
      return events;
    },

    reset: () => {
      containers.clear();
      devices.clear();
      pendingMixes.clear();
      lab.hazards.reset();
      lab.activity = {};
      lab.flashes.length = 0;
      lab.notices.clear();
      lab.sounds.length = 0;
      lab.feed.set({ items: [], monitor: null, history: [] });
      for (const simId of listeners.keys()) notify(simId);
      now = 0;
      generation += 1;
    },
  };
  return lab;
};
