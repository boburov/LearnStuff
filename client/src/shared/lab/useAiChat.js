// AI chat hook: backenddagi /ai/chat SSE oqimini o'qiydi, javobni token-token
// ko'rsatadi va agent yuborgan "tool" buyruqlarini onAction() orqali uzatadi.
import { useCallback, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const WELCOME = {
  role: "assistant",
  content:
    "Salom! Men Mira AI - SmartLab yordamchisiman 🤖✨ Modellar haqida so'rang, sizni mavzuga olib o'taman yoki test tuzib beraman. Qani, nimadan boshlaymiz? 😊",
};

export const useAiChat = ({ buildContext, onAction } = {}) => {
  const [messages, setMessages] = useState([WELCOME]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const send = useCallback(
    async (text) => {
      const content = text?.trim();
      if (!content || streaming) return;

      // History: oldingi xabarlar + yangi user xabari (welcome'ni yubormaymiz).
      const history = [...messages, { role: "user", content }]
        .filter((m) => m !== WELCOME)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        { role: "user", content },
        { role: "assistant", content: "", pending: true },
      ]);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      // assistant xabarining matnini stream davomida yangilab boramiz.
      const patchLast = (updater) =>
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") next[next.length - 1] = updater(last);
          return next;
        });

      try {
        const res = await fetch(`${API_URL}/ai/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history, context: buildContext?.() || {} }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("network");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // SSE: "data: {...}\n\n" bloklarini ajratib o'qiymiz.
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json) continue;

            let evt;
            try {
              evt = JSON.parse(json);
            } catch {
              continue;
            }

            if (evt.type === "token") {
              patchLast((m) => ({
                ...m,
                pending: false,
                content: m.content + evt.value,
              }));
            } else if (evt.type === "tool") {
              const action = { name: evt.name, args: evt.args };
              if (evt.name === "start_quiz") {
                patchLast((m) => ({ ...m, pending: false, quiz: evt.args }));
              } else {
                const ok = onAction?.(action);
                patchLast((m) => ({
                  ...m,
                  pending: false,
                  action: { ...action, ok },
                }));
              }
            } else if (evt.type === "error") {
              patchLast((m) => ({
                ...m,
                pending: false,
                content: m.content || evt.message,
                error: true,
              }));
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          patchLast((m) => ({
            ...m,
            pending: false,
            content:
              m.content ||
              "Uzr, hozir javob bera olmadim 😔 Internet yoki server bilan bog'lanishda muammo bor.",
            error: true,
          }));
        }
      } finally {
        // pending bayroqni har holda tozalaymiz.
        patchLast((m) => ({ ...m, pending: false }));
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, buildContext, onAction],
  );

  const reset = useCallback(() => {
    stop();
    setMessages([WELCOME]);
  }, [stop]);

  return { messages, streaming, send, stop, reset };
};
