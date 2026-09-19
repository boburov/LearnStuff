import { createContext, useContext } from "react";

export const KitContext = createContext(null);

export const useKit = () => {
  const kit = useContext(KitContext);
  if (!kit) throw new Error("useKit must be used inside <KitProvider>");
  return kit;
};
