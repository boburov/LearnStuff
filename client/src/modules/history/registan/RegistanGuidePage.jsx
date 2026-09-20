import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Volume2, VolumeX, Sparkles, Loader2, Send, X } from "lucide-react";
import Scene from "@/shared/lab/Scene";
import Toolbar from "@/shared/lab/Toolbar";
import { SceneControlProvider } from "@/shared/lab/SceneControlProvider";
import { useSceneControl } from "@/shared/lab/sceneControl";
import useObjectState from "@/shared/hooks/useObjectState";
import RegistanGlb from "./RegistanGlb";
import { PARTS, LEVELS, CONTENT, getPart } from "./registan";
import { useAiExplain } from "./useAiExplain";

const partName = (id) => getPart(id)?.name || "";
const baseInfo = (id, level) =>
  CONTENT.hotspots[id]?.levels?.[level] || CONTENT.overview?.levels?.[level] || "";

// Best-effort audio guide (Web Speech). Uzbek voices are rare -> nearest locale.
const speak = (text, on) => {
  const s = typeof window !== "undefined" && window.speechSynthesis;
  if (!s) return;
  s.cancel();
  if (!on || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = s.getVoices();
  u.voice =
    v.find((x) => /uz/i.test(x.lang)) ||
    v.find((x) => /ru/i.test(x.lang)) ||
    v.find((x) => /tr/i.test(x.lang)) ||
    null;
  u.lang = u.voice?.lang || "ru-RU";
  u.rate = 0.95;
  s.speak(u);
};

// Shared part-inspector (right sidebar + mobile sheet).
const Inspector = ({ selectedId, level, info, ai, voiceOn, question, on, onClose }) => (
  <div className="flex h-full flex-col">
    <div className="border-b border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{partName(selectedId)}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => on.toggleVoice()} className="rounded p-1.5 hover:bg-secondary" aria-label="Ovozli o'qish">
            {voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="rounded p-1.5 hover:bg-secondary lg:hidden" aria-label="Yopish">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => on.setLevel(l.id)}
            className={
              "rounded-full border px-2 py-0.5 text-[11px] transition-colors " +
              (level === l.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-secondary")
            }
          >
            {l.name}
          </button>
        ))}
      </div>
    </div>

    <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
      <p className="leading-relaxed text-muted-foreground">{info}</p>
      <button
        onClick={() => on.ask()}
        disabled={ai.loading}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
      >
        {ai.loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        AI batafsil tushuntirsin
      </button>
      {ai.error && <p className="text-xs text-destructive">{ai.error}</p>}
      {ai.text && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-primary">
            <Sparkles size={12} /> Mira AI gid
          </div>
          <p className="leading-relaxed">{ai.text}</p>
        </div>
      )}
    </div>

    <div className="border-t border-border p-3">
      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => on.setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && question.trim() && on.ask(question.trim())}
          placeholder="Bu qism haqida savol bering..."
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => question.trim() && on.ask(question.trim())}
          disabled={ai.loading || !question.trim()}
          className="grid w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Yuborish"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  </div>
);

const RegistanGuideInner = () => {
  const rootRef = useRef(null);
  const s = useObjectState({
    selectedId: null,
    level: "tourist",
    voiceOn: false,
    question: "",
    panelsHidden: false,
  });
  const { selectedId, level, voiceOn, question, panelsHidden, setField } = s;
  const ai = useAiExplain();

  // VR/immersive: headset (inVR) or phone cardboard take over the whole screen.
  const { inVR, cardboard, exitCardboard } = useSceneControl();
  const immersive = inVR || cardboard;

  const info = selectedId ? baseInfo(selectedId, level) : "";

  useEffect(() => {
    ai.reset();
    if (selectedId) speak(baseInfo(selectedId, level), voiceOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  };

  const ask = (q) => {
    setField("question", "");
    ai.explain({ part: partName(selectedId), level, question: typeof q === "string" ? q : undefined }).then(
      (t) => t && speak(t, voiceOn),
    );
  };

  const handlers = {
    setLevel: (l) => setField("level", l),
    setQuestion: (q) => setField("question", q),
    toggleVoice: () => {
      const nv = !voiceOn;
      setField("voiceOn", nv);
      speak(ai.text || info, nv);
    },
    ask,
  };

  const hidePanels = immersive || panelsHidden;

  return (
    <div ref={rootRef} className="relative flex h-full w-full bg-background">
      {/* left rail — part list */}
      {!immersive && (
        <aside className={"hidden w-56 shrink-0 flex-col border-r border-border bg-background lg:flex " + (panelsHidden ? "lg:hidden" : "")}>
          <div className="border-b border-border p-4">
            <Link to="/history" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft size={14} /> Tarix
            </Link>
            <h1 className="text-lg font-semibold">Registon — audio-gid</h1>
            <p className="mt-1 text-xs text-muted-foreground">Modeldagi yorug' nuqtani yoki binoni bosing.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">Qismlar</div>
            <div className="space-y-1">
              {PARTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setField("selectedId", p.id)}
                  className={
                    "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors " +
                    (selectedId === p.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary")
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
            <p className="mt-4 rounded-md bg-secondary/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Pastdagi <span className="font-medium text-foreground">VR</span> tugmasi bilan Registon maydoniga
              kirib, atrofga qarab yuring (shlem, telefon yoki WASD).
            </p>
          </div>
        </aside>
      )}

      {/* center — 3D */}
      <div className="relative min-w-0 flex-1">
        {!immersive && (
          <Link
            to="/history"
            className="absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/85 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur hover:text-foreground lg:hidden"
          >
            <ArrowLeft size={14} /> Tarix
          </Link>
        )}

        <Scene camera={[0, 30, 62]} controls={{ minDistance: 8, maxDistance: 160 }}>
          <RegistanGlb selectedId={selectedId} onSelect={(id) => setField("selectedId", id)} />
        </Scene>

        {!immersive && !selectedId && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
            <div className="rounded-full border border-border bg-background/85 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
              Bir qismni bosing — o'ngdan ma'lumot va AI chiqadi · pastda VR tugmasi
            </div>
          </div>
        )}

        {cardboard ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-white/40" />
            <button
              onClick={exitCardboard}
              className="absolute right-3 top-3 z-30 rounded-lg bg-background/90 px-3 py-1.5 text-sm font-medium shadow-md backdrop-blur"
            >
              Chiqish
            </button>
          </>
        ) : (
          !inVR && (
            <Toolbar
              panelsHidden={panelsHidden}
              onTogglePanels={() => setField("panelsHidden", !panelsHidden)}
              onToggleFullscreen={toggleFullscreen}
            />
          )
        )}
      </div>

      {/* right sidebar — desktop */}
      {!hidePanels && (
        <aside className="hidden w-80 shrink-0 border-l border-border bg-background lg:block">
          {selectedId ? (
            <Inspector {...{ selectedId, level, info, ai, voiceOn, question, on: handlers }} />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
              Qismni tanlang — bu yerda ma'lumot va AI gid chiqadi.
            </div>
          )}
        </aside>
      )}

      {/* mobile bottom sheet */}
      {!immersive && selectedId && (
        <div className="absolute inset-x-0 bottom-0 z-30 max-h-[62vh] overflow-hidden rounded-t-2xl border-t border-border bg-background shadow-2xl lg:hidden">
          <Inspector
            {...{ selectedId, level, info, ai, voiceOn, question, on: handlers }}
            onClose={() => setField("selectedId", null)}
          />
        </div>
      )}
    </div>
  );
};

const RegistanGuidePage = () => (
  <SceneControlProvider>
    <RegistanGuideInner />
  </SceneControlProvider>
);

export default RegistanGuidePage;
