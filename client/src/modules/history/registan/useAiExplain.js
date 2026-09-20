// Tanlangan qismni (yoki savolni) backend /ai/explain (Gemini) orqali tushuntiradi.
// Kalit brauzerda emas - server orqali.
import { useCallback } from "react";
import useObjectState from "@/shared/hooks/useObjectState";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const useAiExplain = () => {
  const { loading, error, text, setFields } = useObjectState({
    loading: false,
    error: null,
    text: "",
  });

  const explain = useCallback(
    async ({ building = "Registon", part, level = "tourist", question } = {}) => {
      if (!part) return null;
      setFields({ loading: true, error: null });
      try {
        const res = await fetch(`${API_URL}/ai/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ building, part, level, question }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json?.message || "network");
        }
        setFields({ loading: false, text: json.data.text });
        return json.data.text;
      } catch (e) {
        const msg =
          e.message && e.message !== "network" && e.message !== "Failed to fetch"
            ? e.message
            : "AI serverga ulanib bo'lmadi. Backend ishga tushganmi?";
        setFields({ loading: false, error: msg });
        return null;
      }
    },
    [setFields],
  );

  return { loading, error, text, explain, reset: () => setFields({ text: "", error: null }) };
};
