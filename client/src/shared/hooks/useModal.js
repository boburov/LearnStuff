import { useSyncExternalStore } from "react";

// Modals open from anywhere by name, so their state lives outside React. No
// store library for it: one map and a set of listeners is the whole thing.
const CLOSED = { isOpen: false, isLoading: false, data: null };

let modals = {};
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());
const set = (name, state) => {
  modals = { ...modals, [name]: { ...(modals[name] || CLOSED), ...state } };
  emit();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const useModal = (name) => {
  const modal = useSyncExternalStore(
    subscribe,
    () => (name ? modals[name] : undefined) || CLOSED,
    () => CLOSED,
  );

  return {
    ...modal,
    openModal: (modalName, data = null) => set(modalName, { isOpen: true, data }),
    closeModal: (modalName, data = null) => set(modalName, { isOpen: false, data }),
    updateModalData: (modalName, data) => set(modalName, { data }),
    updateModalLoading: (modalName, value) => set(modalName, { isLoading: value }),
  };
};

export default useModal;
