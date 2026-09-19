import { createSnapStore } from "@/shared/utils/snapStore";
import { objectType } from "./objectTypes";

export const SLOT_COUNT = 5;

const snapshotOf = (state) => ({
  objects: [...state.objects.values()],
  hotbar: [...state.hotbar],
  activeSlot: state.activeSlot,
  bursts: [...state.bursts],
});

const fromLayout = (entries) => {
  const objects = new Map();
  const idByKey = {};
  entries.forEach((entry, i) => {
    idByKey[entry.key] = `o${i + 1}`;
  });
  for (const { key, id: typeId, position, rotation = [0, 0, 0], on = null, ...props } of entries) {
    if (!objectType(typeId)) continue;
    const id = idByKey[key];
    objects.set(id, { id, typeId, props, state: "placed", position, rotation, supportId: on ? idByKey[on] : null, rev: 0 });
  }
  return { objects, nextId: entries.length + 1 };
};

// Mutable world state for the lab; React reads snapshots, frame code reads/writes through the actions.
export const createWorld = (layout) => {
  let initial = fromLayout(layout);
  const state = {
    objects: initial.objects,
    hotbar: Array(SLOT_COUNT).fill(null),
    activeSlot: 0,
    bursts: [],
    nextId: initial.nextId,
    nextBurst: 1,
  };
  const store = createSnapStore(snapshotOf(state));
  const hud = createSnapStore({ prompt: null, flash: null });
  const commit = () => store.set(snapshotOf(state));

  const firstFreeSlot = () => {
    if (state.hotbar[state.activeSlot] == null) return state.activeSlot;
    return state.hotbar.findIndex((id) => id == null);
  };

  const children = (id) => [...state.objects.values()].filter((o) => o.supportId === id && o.state === "placed");

  const detach = (id) => {
    const object = state.objects.get(id);
    if (object) object.supportId = null;
  };

  const world = {
    store,
    hud,
    query: null,
    dragPreview: null,
    dragResult: null,
    get: (id) => state.objects.get(id),
    setQuery: (query) => {
      world.query = query;
    },
    setDrag: (drag) => {
      world.dragPreview = drag;
      if (!drag) world.dragResult = null;
    },
    setDragResult: (result) => {
      world.dragResult = result;
    },
    activeObject: () => state.objects.get(state.hotbar[state.activeSlot]) ?? null,

    take: (id) => {
      const object = state.objects.get(id);
      if (!object || object.state === "held") return { ok: false };
      if (children(id).length) return { ok: false, reason: "occupied" };
      const slot = firstFreeSlot();
      if (slot < 0) return { ok: false, reason: "full" };
      detach(id);
      object.state = "held";
      state.hotbar[slot] = id;
      state.activeSlot = slot;
      commit();
      return { ok: true, slot };
    },

    addToSlot: (typeId, slot = null, props = {}) => {
      const target = slot ?? firstFreeSlot();
      if (target < 0 || state.hotbar[target] != null || !objectType(typeId)) return { ok: false, reason: "full" };
      const id = `o${state.nextId}`;
      state.nextId += 1;
      state.objects.set(id, { id, typeId, props, state: "held", position: [0, 0, 0], rotation: [0, 0, 0], supportId: null, rev: 0 });
      state.hotbar[target] = id;
      state.activeSlot = target;
      commit();
      return { ok: true, id };
    },

    placeNew: (typeId, pose, supportId = null, props = {}) => {
      if (!objectType(typeId)) return { ok: false };
      const id = `o${state.nextId}`;
      state.nextId += 1;
      state.objects.set(id, { id, typeId, props, state: "placed", ...pose, supportId, rev: 0 });
      commit();
      return { ok: true, id };
    },

    placeHeld: (id, pose, supportId = null) => {
      const object = state.objects.get(id);
      if (!object || object.state !== "held") return { ok: false };
      state.hotbar = state.hotbar.map((slotId) => (slotId === id ? null : slotId));
      Object.assign(object, pose, { state: "placed", supportId, rev: object.rev + 1 });
      commit();
      return { ok: true };
    },

    dropHeld: (id, pose, velocity) => {
      const object = state.objects.get(id);
      if (!object || object.state !== "held") return { ok: false };
      state.hotbar = state.hotbar.map((slotId) => (slotId === id ? null : slotId));
      Object.assign(object, pose, { state: "dynamic", velocity, supportId: null, rev: object.rev + 1 });
      commit();
      return { ok: true };
    },

    removeHeld: (id) => {
      const object = state.objects.get(id);
      if (!object || object.state !== "held") return { ok: false };
      state.hotbar = state.hotbar.map((slotId) => (slotId === id ? null : slotId));
      state.objects.delete(id);
      commit();
      return { ok: true };
    },

    shatter: (id, position, rotation, velocity) => {
      const object = state.objects.get(id);
      if (!object) return;
      for (const child of children(id)) detach(child.id);
      state.objects.delete(id);
      state.bursts.push({ id: `b${state.nextBurst}`, typeId: object.typeId, position, rotation, velocity });
      state.nextBurst += 1;
      commit();
    },

    // A blast throws light placed items outward; heavy supports (stands, hot plates) stay put.
    knock: (center, radius, strength, exceptId = null) => {
      let moved = false;
      for (const object of state.objects.values()) {
        if (object.state !== "placed" || object.id === exceptId || objectType(object.typeId)?.body.heavy) continue;
        const dx = object.position[0] - center[0];
        const dz = object.position[2] - center[2];
        const distance = Math.hypot(dx, object.position[1] - center[1], dz);
        if (distance > radius) continue;
        const push = (strength * 3 * (1 - distance / radius)) / Math.max(0.15, distance);
        const flat = Math.max(0.05, Math.hypot(dx, dz));
        for (const child of children(object.id)) detach(child.id);
        Object.assign(object, {
          state: "dynamic",
          supportId: null,
          velocity: [(dx / flat) * push * 0.6, 1.2 * strength, (dz / flat) * push * 0.6],
          rev: object.rev + 1,
        });
        moved = true;
      }
      if (moved) commit();
    },

    selectSlot: (slot) => {
      if (slot < 0 || slot >= SLOT_COUNT || slot === state.activeSlot) return;
      state.activeSlot = slot;
      commit();
    },

    cycleSlot: (direction) => {
      state.activeSlot = (state.activeSlot + direction + SLOT_COUNT) % SLOT_COUNT;
      commit();
    },

    swapSlots: (a, b) => {
      [state.hotbar[a], state.hotbar[b]] = [state.hotbar[b], state.hotbar[a]];
      state.activeSlot = b;
      commit();
    },

    reset: () => {
      initial = fromLayout(layout);
      state.objects = initial.objects;
      state.nextId = initial.nextId;
      state.hotbar = Array(SLOT_COUNT).fill(null);
      state.activeSlot = 0;
      state.bursts = [];
      commit();
    },

    setPrompt: (prompt) => {
      const current = hud.get();
      if (current.prompt?.key === prompt?.key) return;
      hud.set({ ...current, prompt });
    },

    flash: (text) => {
      if (!text) return;
      hud.set({ ...hud.get(), flash: { text, at: performance.now() } });
    },
  };
  return world;
};
