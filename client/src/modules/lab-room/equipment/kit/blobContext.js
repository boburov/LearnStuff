import { createContext, useContext } from "react";

// Items carried in the hand hide their contact shadows.
export const BlobVisibleContext = createContext(true);

export const useBlobVisible = () => useContext(BlobVisibleContext);
