import { useSyncExternalStore } from "react";

// Frame-driven values go through this store so only the readouts re-render, not the whole page.
export const createSnapStore = (initial) => {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
};

export const useSnap = (store) => useSyncExternalStore(store.subscribe, store.get);
