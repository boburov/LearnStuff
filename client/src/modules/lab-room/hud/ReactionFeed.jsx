import { useEffect, useState } from "react";
import { useSnap } from "@/shared/utils/snapStore";
import { cn } from "@/shared/utils/cn";
import { formatNumber } from "../tools/describe";
import { DANGER_STYLE, MONITOR_TEXT, reactionInfo, warningInfo } from "./labTexts";

const SHOW_S = 6;

const toneClass = {
  emerald: "border-emerald-400/60",
  amber: "border-amber-400/70",
  red: "border-red-500/80 bg-red-950/70",
};

const Toast = ({ item }) => {
  if (item.kind === "reaction") {
    const info = reactionInfo(item.id);
    if (!info) return null;
    const danger = DANGER_STYLE[info.danger] ?? DANGER_STYLE.past;
    return (
      <div className={cn("w-[min(460px,90vw)] rounded-xl border-l-4 bg-black/65 px-4 py-2.5 text-white shadow-lg", toneClass[danger.tone])}>
        <p className="text-sm font-semibold">{info.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-white/80">{info.observation}</p>
        <p className="mt-1 text-[13px] text-white/55">{MONITOR_TEXT.hint}</p>
      </div>
    );
  }
  if (item.kind === "warning") {
    const info = warningInfo(item.id);
    return (
      <div className={cn("w-[min(460px,90vw)] rounded-xl border-l-4 px-4 py-2.5 text-white shadow-lg", toneClass.red)}>
        <p className="text-sm font-bold">⚠ {info.title}</p>
        <p className="mt-0.5 text-xs text-white/85">{info.text}</p>
      </div>
    );
  }
  if (item.kind === "ph") {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-black/65 px-4 py-2 text-white shadow-lg">
        <span className="size-6 rounded-sm border border-white/30" style={{ backgroundColor: item.color }} />
        <span className="text-sm font-semibold">pH ≈ {formatNumber(item.ph, 0)}</span>
        <span className="text-xs text-white/75">{item.word}</span>
      </div>
    );
  }
  return <div className="rounded-xl bg-black/65 px-4 py-2 text-sm text-white shadow-lg">{item.text}</div>;
};

// Short pop-ups for reactions, safety warnings and measurements; they fade after a few seconds of lab time.
const ReactionFeed = ({ lab }) => {
  const { items } = useSnap(lab.feed);
  const [now, setNow] = useState(() => lab.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(lab.now()), 500);
    return () => clearInterval(timer);
  }, [lab]);
  const visible = items.filter((item) => now - item.at < SHOW_S);
  if (!visible.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex flex-col items-center gap-2 px-4">
      {visible.map((item) => (
        <Toast key={`${item.kind}:${item.id ?? item.text ?? item.ph}:${item.at}`} item={item} />
      ))}
    </div>
  );
};

export default ReactionFeed;
