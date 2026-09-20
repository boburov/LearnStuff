// Tiny external store for simulation output. Parts subscribe per-id via useSyncExternalStore,
// so only the components whose visual actually changed re-render.
export function createSimStore() {
  let comps = {}; // id -> stable visual object
  let inputs = {}; // id -> live user input (button pressed, pot value)
  let meta = { running: false, error: null };
  const subs = new Set();
  const emit = () => {
    for (const f of subs) f();
  };

  return {
    subscribe(f) {
      subs.add(f);
      return () => subs.delete(f);
    },
    getComp: (id) => comps[id],
    getMeta: () => meta,
    getInput: (id) => inputs[id],
    setComps(next) {
      comps = next;
      emit();
    },
    setInput(id, patch) {
      inputs = { ...inputs, [id]: { ...inputs[id], ...patch } };
      emit();
    },
    seedInputs(seed) {
      inputs = seed;
      emit();
    },
    setMeta(patch) {
      meta = { ...meta, ...patch };
      emit();
    },
    reset() {
      comps = {};
      inputs = {};
      meta = { running: false, error: null };
      emit();
    },
  };
}
