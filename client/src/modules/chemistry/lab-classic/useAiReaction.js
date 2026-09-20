// Ikki moddani miqdori bilan backend (/ai/reaction) ga yuboradi va Gemini
// aniqlagan reaksiya status'ini oladi. Kalit brauzerda emas - server orqali.
import { useCallback } from "react";
import useObjectState from "@/shared/hooks/useObjectState";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const useAiReaction = () => {
  const { loading, error, result, setFields, resetState } = useObjectState({
    loading: false,
    error: null,
    result: null,
  });

  const run = useCallback(
    async ({ a, b }) => {
      setFields({ loading: true, error: null, result: null });
      try {
        const res = await fetch(`${API_URL}/ai/reaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ a, b }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.message || "network");
        }
        setFields({ loading: false, result: json.data });
        return json.data;
      } catch {
        setFields({ loading: false, error: "Reaksiyani aniqlab bo'lmadi. Qaytadan urinib ko'ring." });
        return null;
      }
    },
    [setFields],
  );

  return { loading, error, result, run, reset: resetState };
};
