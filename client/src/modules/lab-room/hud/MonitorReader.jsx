import { X } from "lucide-react";
import Button from "@/shared/components/ui/button/Button";
import { useSnap } from "@/shared/utils/snapStore";
import { cn } from "@/shared/utils/cn";
import { DANGER_STYLE, MONITOR_TEXT, reactionInfo } from "./labTexts";

const badgeClass = {
  emerald: "bg-emerald-500/15 text-emerald-300",
  amber: "bg-amber-500/15 text-amber-300",
  red: "bg-red-500/20 text-red-300",
};

const Field = ({ label, children }) => (
  <div>
    <p className="text-[13px] font-semibold uppercase tracking-wider text-sky-300/80">{label}</p>
    <div className="mt-1 text-sm leading-relaxed text-white/90">{children}</div>
  </div>
);

// Readable 2D version of the lab computer screen: the latest reaction explained, plus recent ones.
const MonitorReader = ({ lab, onClose }) => {
  const { monitor, history } = useSnap(lab.feed);
  const info = monitor ? reactionInfo(monitor) : null;
  const danger = info ? DANGER_STYLE[info.danger] ?? DANGER_STYLE.past : null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-6">
      <div className="relative flex max-h-full w-[min(760px,94vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1720] text-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#16212c] px-5 py-3">
          <span className="size-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm font-semibold">{MONITOR_TEXT.title}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={MONITOR_TEXT.close}
            className="ml-auto size-8 text-white hover:bg-white/10 hover:text-white"
          >
            <X />
          </Button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {info ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{info.title}</h2>
                {info.table && <span className="rounded bg-white/10 px-2 py-0.5 text-xs">{MONITOR_TEXT.table(info.table)}</span>}
                <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", badgeClass[danger.tone])}>{danger.label}</span>
              </div>
              <Field label={MONITOR_TEXT.equation}>
                {info.equation.map((line) => (
                  <p key={line} className="font-mono text-[15px]">
                    {line}
                  </p>
                ))}
              </Field>
              <Field label={MONITOR_TEXT.type}>{info.type}</Field>
              <Field label={MONITOR_TEXT.observation}>{info.observation}</Field>
              <Field label={MONITOR_TEXT.safety}>{info.safety}</Field>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-white/70">{MONITOR_TEXT.empty}</p>
          )}
          {history.length > 1 && (
            <div className="border-t border-white/10 pt-3">
              <p className="text-[13px] font-semibold uppercase tracking-wider text-white/50">{MONITOR_TEXT.history}</p>
              <ul className="mt-2 space-y-1 text-sm text-white/80">
                {history.slice(1).map((id) => (
                  <li key={id}>{reactionInfo(id)?.title ?? id}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitorReader;
