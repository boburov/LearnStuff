// Real-time AI yordamchi paneli. Backenddagi /ai/chat SSE oqimi orqali ishlaydi.
// Agent matn javob beradi, 3D sahnani boshqaradi, mavzuga o'tkazadi va kvizz tuzadi.
// Kuchli, silliq animatsiyalar bilan jonli "Mira AI" tajribasi.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Square,
  RotateCcw,
  Compass,
  MousePointerClick,
  Sparkles,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import robotHead from "@/shared/assets/icons/robot-head.svg";
import { useSceneControl } from "./sceneControl";
import { useAiChat } from "./useAiChat";

// Agentning tool chaqiruvini foydalanuvchiga tushunarli matnga aylantiradi.
const ACTION_LABEL = {
  control_scene: {
    zoom_in: "Yaqinlashtirdim 🔍",
    zoom_out: "Uzoqlashtirdim 🔭",
    reset: "Kamerani tikladim 🎥",
    pause: "Aylanishni to'xtatdim ⏸️",
    resume: "Aylanishni davom ettirdim ▶️",
  },
  navigate_topic: "Yangi mavzuga olib o'tdim 🚀",
  select_item: "Modelni tanladim ✨",
};

const actionText = (action) => {
  if (action.name === "control_scene")
    return (
      ACTION_LABEL.control_scene[action.args?.action] || "Sahnani boshqardim"
    );
  return ACTION_LABEL[action.name] || "Bajardim";
};

// Sodda avatar: o'ylayotganda yengil aylanuvchi halqa, soyasiz.
const MiraAvatar = ({ size = 32, thinking = false }) => (
  <span
    className="relative grid shrink-0 place-items-center"
    style={{ width: size, height: size }}
  >
    {/* O'ylayotganda aylanuvchi yupqa halqa */}
    {thinking && (
      <span className="animate-spin-slow absolute -inset-0.5 rounded-full bg-[conic-gradient(from_0deg,transparent,#6366f1,transparent)]" />
    )}
    <span className="relative grid size-full place-items-center rounded-full bg-primary/10 ring-1 ring-black/5">
      <img src={robotHead} alt="" className="size-[68%]" />
    </span>
  </span>
);

const TypingDots = () => (
  <span className="inline-flex items-center gap-1 py-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="size-1.5 animate-bounce rounded-full bg-current"
        style={{ animationDelay: `${i * 0.16}s` }}
      />
    ))}
  </span>
);

// Bitta test savoli - foydalanuvchi javob bersa, darhol to'g'ri/xato ko'rsatadi.
const QuizCard = ({ quiz }) => {
  const [picked, setPicked] = useState(null);
  const answered = picked !== null;
  const correct = picked === quiz.correctIndex;
  return (
    <div
      className={cn(
        "mt-2 animate-msg-in rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-violet-500/5 p-3",
        answered && !correct && "animate-shake",
      )}
    >
      <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
        <Sparkles size={14} className="text-primary" /> {quiz.question}
      </p>
      <div className="flex flex-col gap-1.5">
        {quiz.options.map((opt, i) => {
          const isCorrect = i === quiz.correctIndex;
          const isPicked = i === picked;
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => setPicked(i)}
              className={cn(
                "relative overflow-hidden rounded-lg border px-3 py-1.5 text-left text-sm transition-all duration-200",
                !answered &&
                  "border-border bg-background hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm",
                answered &&
                  isCorrect &&
                  "border-emerald-300 bg-emerald-50 text-emerald-700",
                answered &&
                  isPicked &&
                  !isCorrect &&
                  "border-red-300 bg-red-50 text-red-700",
                answered &&
                  !isCorrect &&
                  !isPicked &&
                  "border-border opacity-50",
              )}
            >
              {/* To'g'ri javob ustidan yorug'lik yuguradi */}
              {answered && isCorrect && (
                <span className="pointer-events-none absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              )}
              <span className="relative">{opt}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="mt-2 animate-pop text-xs font-semibold">
          {correct ? "🎉 Barakalla, to'g'ri!" : "💪 Yana urinib ko'ring!"}
        </p>
      )}
    </div>
  );
};

const Bubble = ({ msg }) => {
  const isUser = msg.role === "user";
  const streaming = msg.pending && msg.content; // yozilyapti
  return (
    <div
      className={cn("flex animate-msg-in gap-2", isUser && "flex-row-reverse")}
    >
      {!isUser && <MiraAvatar size={28} thinking={msg.pending} />}
      <div
        className={cn(
          "min-w-0 max-w-[85%]",
          isUser && "flex flex-col items-end",
        )}
      >
        {(msg.content || msg.pending) && (
          <div
            className={cn(
              "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm shadow-sm transition-shadow",
              isUser
                ? "rounded-br-sm bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground"
                : "rounded-bl-sm border border-border/60 bg-card text-foreground",
              msg.error && "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {msg.pending && !msg.content ? (
              <TypingDots />
            ) : (
              <>
                {msg.content}
                {/* Stream davomida miltillovchi kursor */}
                {streaming && (
                  <span className="ml-0.5 inline-block h-3.5 w-0.5 -translate-y-px animate-blink bg-current align-middle" />
                )}
              </>
            )}
          </div>
        )}
        {msg.action?.ok && (
          <div className="mt-1 inline-flex animate-pop items-center gap-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-200/60">
            {actionText(msg.action)}
          </div>
        )}
        {msg.quiz && <QuizCard quiz={msg.quiz} />}
      </div>
    </div>
  );
};

const SUGGESTIONS = [
  {
    icon: Compass,
    label: "Bu nima?",
    text: "Hozir ko'rib turganim nima? Qisqacha tushuntir.",
  },
  {
    icon: MousePointerClick,
    label: "Meni sina",
    text: "Joriy mavzu bo'yicha menga bitta test savoli ber.",
  },
];

const AiPanel = () => {
  const { aiContext, runAiAction, recentActions } = useSceneControl();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  // Eng so'nggi kontekst va harakat jurnalini ref'da saqlaymiz - shunda
  // buildContext barqaror bo'ladi, lekin yuborilganda eng yangi qiymatni oladi.
  const liveRef = useRef({ aiContext, recentActions });
  useEffect(() => {
    liveRef.current = { aiContext, recentActions };
  }, [aiContext, recentActions]);

  // Har so'rovda agentga joriy kontekst + foydalanuvchi harakatlarini beramiz.
  const buildContext = useCallback(() => {
    const { aiContext: ctx, recentActions: ra } = liveRef.current;
    return { ...ctx, recentActions: [...(ra?.current || [])] };
  }, []);

  const { messages, streaming, send, stop, reset } = useAiChat({
    buildContext,
    onAction: runAiAction,
  });

  // Yangi xabar kelganda pastga aylantiramiz.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const submit = (e) => {
    e?.preventDefault();
    if (!draft.trim() || streaming) return;
    send(draft);
    setDraft("");
  };

  // Welcome'dan keyin hali yozishmagan bo'lsa - tezkor takliflarni ko'rsatamiz.
  const showSuggestions = useMemo(
    () => messages.filter((m) => m.role === "user").length === 0,
    [messages],
  );

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-secondary/20">
      {/* Sarlavha */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <MiraAvatar size={36} thinking={streaming} />
        <div className="flex-1">
          <p className="animate-gradient-x bg-gradient-to-r from-sky-500 via-violet-500 to-indigo-500 bg-[length:200%_auto] bg-clip-text text-sm font-bold text-transparent">
            Mira AI
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
            </span>
            {streaming ? "Yozyapti..." : "Onlayn"}
          </p>
        </div>
        <button
          onClick={reset}
          title="Suhbatni tozalash"
          className="relative grid size-7 place-items-center rounded-lg text-muted-foreground transition-all duration-300 hover:rotate-[-180deg] hover:bg-secondary hover:text-foreground"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Xabarlar */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"
      >
        {messages.map((m, i) => (
          <Bubble key={i} msg={m} />
        ))}

        {showSuggestions && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUGGESTIONS.map((s, i) => (
              <button
                key={s.label}
                onClick={() => send(s.text)}
                style={{ animationDelay: `${0.15 + i * 0.12}s` }}
                className="inline-flex animate-msg-in items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
              >
                <s.icon size={13} className="text-primary" /> {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Kiritish maydoni */}
      <form onSubmit={submit} className="border-t border-border p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-secondary/40 px-3 py-2 transition-all duration-300 focus-within:border-primary/60 focus-within:bg-background focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            placeholder="Mira AI dan so'rang..."
            className="h-32 flex-1 resize-none border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              aria-label="To'xtatish"
              className="grid size-8 shrink-0 animate-pop place-items-center rounded-xl bg-red-500 text-white shadow-sm transition-transform hover:scale-110 active:scale-95"
            >
              <Square size={13} className="fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Yuborish"
              className="group grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md active:scale-95 disabled:scale-100 disabled:opacity-40 disabled:shadow-none"
            >
              <Send
                size={15}
                className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AiPanel;
