import { createContext, useContext, useSyncExternalStore } from "react";

export const LabContext = createContext(null);

// Null outside a running lab (thumbnails, showcase rows): models then draw their static props.
export const useLab = () => useContext(LabContext);

const noSubscribe = () => () => {};

// Re-renders on discrete device changes (lamp lit, cover, tool load); continuous values are read in useFrame.
export const useDeviceVersion = (simId) => {
  const lab = useLab();
  const active = Boolean(lab && simId);
  return useSyncExternalStore(
    active ? (listener) => lab.subscribe(simId, listener) : noSubscribe,
    () => (active ? lab.version(simId) : 0),
  );
};
