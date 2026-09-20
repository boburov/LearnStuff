import { useEffect } from "react";
import {
  Compass, Route, Clock, GitCompare, Trophy, BookOpen, Play, Pause,
  SkipBack, SkipForward, Volume2, VolumeX, HelpCircle, Check,
} from "lucide-react";
import Scene from "@/shared/lab/Scene";
import LabWorkspace from "@/shared/lab/LabWorkspace";
import useObjectState from "@/shared/hooks/useObjectState";
import RegistanModel from "./RegistanModel";
import {
  HOTSPOTS, LEVELS, TOUR, ERAS, TREASURE, OVERVIEW_CAM, CONTENT, getHotspot,
} from "./registan";

const MODES = [
  { id: "explore", name: "3D ko'rish", icon: Compass },
  { id: "tour", name: "Sayohat", icon: Route },
  { id: "story", name: "Hikoya", icon: BookOpen },
  { id: "timeline", name: "Vaqt sayohati", icon: Clock },
  { id: "compare", name: "Taqqoslash", icon: GitCompare },
  { id: "treasure", name: "Xazina", icon: Trophy },
];
const TREASURE_KEY = "registan-treasure";

const explain = (id, level) =>
  (id === "overview" ? CONTENT.overview : CONTENT.hotspots[id])?.levels?.[level] || "";
const storyOf = (id) =>
  (id === "overview" ? CONTENT.overview : CONTENT.hotspots[id])?.story || "";
const nameOf = (id) => (id === "overview" ? "Registon" : getHotspot(id)?.name || "");
const camOf = (id) => (id === "overview" ? OVERVIEW_CAM : getHotspot(id)?.cam);

// Best-effort audio guide (Web Speech). Uzbek voices are rare, so we fall back
// to a nearby locale — the choreographed captions carry the experience.
const speak = (text, on) => {
  const synth = typeof window !== "undefined" && window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  if (!on || !text) return;
  const u = new SpeechSynthesisUtterance(text);
  const v = synth.getVoices();
  u.voice =
    v.find((x) => /uz/i.test(x.lang)) ||
    v.find((x) => /ru/i.test(x.lang)) ||
    v.find((x) => /tr/i.test(x.lang)) ||
    null;
  u.lang = u.voice?.lang || "ru-RU";
  u.rate = 0.95;
  synth.speak(u);
};

const Pill = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
      (active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-background text-foreground hover:bg-secondary")
    }
  >
    {Icon && <Icon size={13} />} {children}
  </button>
);

const QuizBox = ({ onClose }) => {
  const { i, picked, score, setFields } = useObjectState({ i: 0, picked: null, score: 0 });
  const q = CONTENT.quiz[i];
  const done = i >= CONTENT.quiz.length;

  if (done)
    return (
      <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">
        <div className="text-base font-semibold">Test yakunlandi 🎉</div>
        <p className="mt-1 text-muted-foreground">
          Natija: {score} / {CONTENT.quiz.length}
        </p>
        <button
          onClick={onClose}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Yopish
        </button>
      </div>
    );

  const answered = picked !== null;
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-4 text-sm">
      <div className="mb-2 text-xs text-muted-foreground">
        Savol {i + 1} / {CONTENT.quiz.length}
      </div>
      <div className="mb-3 font-medium">{q.q}</div>
      <div className="space-y-1.5">
        {q.options.map((opt, k) => {
          const correct = k === q.answer;
          const cls = !answered
            ? "border-border hover:bg-secondary"
            : correct
              ? "border-emerald-500 bg-emerald-500/10"
              : k === picked
                ? "border-rose-500 bg-rose-500/10"
                : "border-border opacity-60";
          return (
            <button
              key={k}
              disabled={answered}
              onClick={() => setFields({ picked: k, score: score + (correct ? 1 : 0) })}
              className={"flex w-full items-center justify-between rounded-md border px-3 py-1.5 text-left transition-colors " + cls}
            >
              {opt}
              {answered && correct && <Check size={14} className="text-emerald-600" />}
            </button>
          );
        })}
      </div>
      {answered && (
        <>
          <p className="mt-2 text-xs text-muted-foreground">{q.explanation}</p>
          <button
            onClick={() => setFields({ i: i + 1, picked: null })}
            className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
          >
            Keyingi
          </button>
        </>
      )}
    </div>
  );
};

const RegistanPage = () => {
  const s = useObjectState({
    activeId: "overview",
    level: "tourist",
    mode: "explore",
    eraIdx: ERAS.length - 1,
    focus: { ...OVERVIEW_CAM, key: "overview" },
    tourStep: 0,
    tourPlaying: false,
    voiceOn: false,
    found: [],
    xp: 0,
    quizOpen: false,
  });
  const {
    activeId, level, mode, eraIdx, focus, tourStep, tourPlaying, voiceOn,
    found, xp, quizOpen, setField, setFields,
  } = s;

  const touring = mode === "tour" || mode === "story";
  const tourId = TOUR[tourStep];

  // Load saved treasure progress once.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TREASURE_KEY) || "null");
      if (saved) setFields({ found: saved.found || [], xp: saved.xp || 0 });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusOn = (id) => setField("focus", { ...camOf(id), key: id + ":" + Math.round(performance.now()) });

  // Pick a hotspot (from the 3D dots or the left picker).
  const handleHotspot = (id) => {
    setFields({ activeId: id, mode: mode === "timeline" || mode === "compare" ? "explore" : mode });
    focusOn(id);
    if (mode === "treasure" && TREASURE.includes(id) && !found.includes(id)) {
      const nf = [...found, id];
      const nxp = xp + 20;
      setFields({ found: nf, xp: nxp });
      try {
        localStorage.setItem(TREASURE_KEY, JSON.stringify({ found: nf, xp: nxp }));
      } catch {
        /* ignore */
      }
    }
  };

  // Guided tour: focus + narrate each step, auto-advance while playing.
  useEffect(() => {
    if (!touring) return;
    setField("activeId", tourId);
    focusOn(tourId);
    speak(mode === "story" ? storyOf(tourId) : explain(tourId, level), voiceOn);
    if (!tourPlaying) return;
    const last = tourStep >= TOUR.length - 1;
    const t = setTimeout(() => {
      if (last) setFields({ tourPlaying: false, quizOpen: true });
      else setField("tourStep", tourStep + 1);
    }, 8500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touring, tourStep, tourPlaying, mode]);

  // Timeline: frame the whole ensemble + narrate the era.
  useEffect(() => {
    if (mode !== "timeline") return;
    setField("focus", { ...OVERVIEW_CAM, key: "era:" + eraIdx });
    speak(CONTENT.eras[ERAS[eraIdx].year], voiceOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, eraIdx]);

  // Explore: narrate the picked hotspot when the level changes.
  useEffect(() => {
    if (mode === "explore") speak(explain(activeId, level), voiceOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, level, mode]);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const era = ERAS[eraIdx];
  const captionTitle =
    mode === "timeline" ? `${era.year} — ${era.label}` : nameOf(activeId);
  const captionText =
    mode === "timeline"
      ? CONTENT.eras[era.year]
      : mode === "story"
        ? storyOf(activeId)
        : explain(activeId, level);

  const setMode = (m) => {
    if (m === "tour" || m === "story")
      setFields({ mode: m, tourStep: 0, tourPlaying: true, quizOpen: false });
    else if (m === "timeline")
      setFields({ mode: m, focus: { ...OVERVIEW_CAM, key: "era:" + eraIdx } });
    else setFields({ mode: m, tourPlaying: false });
  };

  return (
    <LabWorkspace
      title="Registon — audio-gid"
      description="Hotspotlarni bosing, sayohatni boshlang yoki AIdan so'rang."
      backTo="/history"
      backLabel="Tarix"
      items={HOTSPOTS}
      activeId={activeId}
      onSelect={handleHotspot}
      aiContext={{
        bino: "Registon (Samarqand)",
        nuqta: nameOf(activeId),
        daraja: LEVELS.find((l) => l.id === level)?.name,
        ...(mode === "timeline" ? { davr: `${era.year} ${era.label}` } : {}),
      }}
      scene={
        <div className="relative h-full w-full">
          <Scene camera={OVERVIEW_CAM.pos} controls={{ minDistance: 4, maxDistance: 110 }}>
            <RegistanModel
              spots={HOTSPOTS}
              activeId={activeId}
              onSelect={handleHotspot}
              focus={focus}
              onArrive={() => setField("focus", null)}
              visible={mode === "timeline" ? era.visible : null}
              damaged={mode === "timeline" ? era.damaged : false}
            />
          </Scene>

          {captionText && mode !== "compare" && (
            <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-4">
              <div className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-border bg-background/90 p-4 shadow-xl backdrop-blur">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{captionTitle}</span>
                  <div className="flex items-center gap-1">
                    {touring && (
                      <>
                        <button aria-label="Oldingi" className="rounded p-1 hover:bg-secondary disabled:opacity-40" disabled={tourStep === 0}
                          onClick={() => setField("tourStep", Math.max(0, tourStep - 1))}>
                          <SkipBack size={15} />
                        </button>
                        <button aria-label={tourPlaying ? "Pauza" : "Davom"} className="rounded p-1 hover:bg-secondary"
                          onClick={() => setField("tourPlaying", !tourPlaying)}>
                          {tourPlaying ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button aria-label="Keyingi" className="rounded p-1 hover:bg-secondary disabled:opacity-40" disabled={tourStep >= TOUR.length - 1}
                          onClick={() => setField("tourStep", Math.min(TOUR.length - 1, tourStep + 1))}>
                          <SkipForward size={15} />
                        </button>
                      </>
                    )}
                    <button aria-label="Ovoz" className="rounded p-1 hover:bg-secondary"
                      onClick={() => {
                        const nv = !voiceOn;
                        setField("voiceOn", nv);
                        speak(captionText, nv);
                      }}>
                      {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                    </button>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{captionText}</p>
                {touring && (
                  <div className="mt-2 text-right text-[11px] text-muted-foreground/70">
                    {tourStep + 1} / {TOUR.length}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      }
      info={
        <div className="space-y-4">
          {/* Mode switcher */}
          <div className="flex flex-wrap gap-1.5">
            {MODES.map((m) => (
              <Pill key={m.id} active={mode === m.id} icon={m.icon} onClick={() => setMode(m.id)}>
                {m.name}
              </Pill>
            ))}
          </div>

          {/* Explanation level */}
          {(mode === "explore" || touring) && (
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Tushuntirish darajasi</div>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((l) => (
                  <Pill key={l.id} active={level === l.id} onClick={() => setField("level", l.id)}>
                    {l.name}
                  </Pill>
                ))}
              </div>
            </div>
          )}

          {/* Timeline slider */}
          {mode === "timeline" && (
            <div>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="font-semibold">{era.year}</span>
                <span className="text-xs text-muted-foreground">{era.label}</span>
              </div>
              <input
                type="range" min={0} max={ERAS.length - 1} step={1} value={eraIdx}
                onChange={(e) => setField("eraIdx", parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                {ERAS.map((e) => <span key={e.year}>{e.year}</span>)}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{CONTENT.eras[era.year]}</p>
            </div>
          )}

          {/* Compare table */}
          {mode === "compare" && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5 pr-2 font-medium"> </th>
                    <th className="py-1.5 pr-2 font-semibold text-primary">{CONTENT.compare.a}</th>
                    <th className="py-1.5 font-semibold">{CONTENT.compare.b}</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTENT.compare.rows.map((r) => (
                    <tr key={r.aspect} className="border-b border-border/50 align-top">
                      <td className="py-1.5 pr-2 text-muted-foreground">{r.aspect}</td>
                      <td className="py-1.5 pr-2">{r.registan}</td>
                      <td className="py-1.5">{r.colosseum}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Treasure hunt */}
          {mode === "treasure" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Xazina topish</span>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                  <Trophy size={13} /> {xp} XP
                </span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                3D dagi belgilarni bosib me'moriy elementlarni toping:
              </p>
              <ul className="space-y-1.5">
                {TREASURE.map((id) => {
                  const ok = found.includes(id);
                  return (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className={"grid size-4 place-items-center rounded border " + (ok ? "border-emerald-500 bg-emerald-500 text-white" : "border-border")}>
                        {ok && <Check size={11} />}
                      </span>
                      <span className={ok ? "" : "text-muted-foreground"}>{nameOf(id)}</span>
                    </li>
                  );
                })}
              </ul>
              {found.length >= TREASURE.length && (
                <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                  🏅 Barcha elementlar topildi! Registon me'morchiligi bo'yicha nishonni qo'lga kiritdingiz.
                </div>
              )}
            </div>
          )}

          {/* Ask AI suggestions (feeds the Mira panel via context) */}
          {(mode === "explore" || touring) && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <HelpCircle size={13} /> Mira AIdan so'rang (o'ng panel)
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CONTENT.askSuggestions.map((q) => (
                  <span key={q} className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quiz */}
          <div>
            {quizOpen ? (
              <QuizBox onClose={() => setField("quizOpen", false)} />
            ) : (
              <button
                onClick={() => setField("quizOpen", true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                <HelpCircle size={14} /> Bilimni sinang (test)
              </button>
            )}
          </div>
        </div>
      }
    />
  );
};

export default RegistanPage;
