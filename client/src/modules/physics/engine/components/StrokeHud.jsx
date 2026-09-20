import { ArrowDown, ArrowUp, Gauge } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { strokeProgress } from "../engineMath";
import { useSnap } from "../engineSim";
import { FAST_RPM, STROKE_INFO, describeValve } from "../data/engineContent";

const ValvePill = ({ label, state }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1">
    <span
      className={cn(
        "size-2.5 rounded-full",
        state === "ochiq" && "bg-emerald-400 shadow-[0_0_8px_#34d399]",
        state === "yopiq" && "bg-white/35",
        state !== "ochiq" && state !== "yopiq" && "bg-amber-300",
      )}
    />
    {label}: <span className="font-semibold text-white">{state}</span>
  </span>
);

const StrokeHud = ({ snapStore, running = false, stepping = false, rpm = 0, lowered = false }) => {
  const snap = useSnap(snapStore);
  const info = STROKE_INFO[snap.stroke] ?? STROKE_INFO[0];
  const fast = running && !stepping && rpm > FAST_RPM;
  const progress = strokeProgress(snap.theta);
  const Arrow = info.piston === "pastga" ? ArrowDown : ArrowUp;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3",
        lowered ? "top-16" : "top-16 lg:top-4",
      )}
    >
      <div
        role="status"
        aria-live="off"
        className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 px-4 py-3 text-white shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl font-bold tabular-nums"
            style={{ backgroundColor: fast ? "#7c3aed" : info.color }}
          >
            {fast ? <Gauge size={24} /> : info.number}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight sm:text-2xl">
              {fast ? "Dvigatel ishlamoqda" : `${info.number}-takt · ${info.name}`}
            </p>
            <p className="truncate text-sm text-white/75">
              {fast
                ? `${rpm} ayl/min · taktlar juda tez almashmoqda`
                : running
                  ? info.short
                  : `${info.short} · to'xtatilgan`}
            </p>
          </div>
          {!fast && (
            <span
              className="hidden items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-sm font-medium sm:inline-flex"
              title="Porshen harakati"
            >
              <Arrow size={16} /> {info.piston}
            </span>
          )}
        </div>

        {!fast && (
          <div className="mt-2.5 flex flex-wrap gap-2 text-sm text-white/80">
            <ValvePill
              label="Kiritish"
              state={describeValve(snap.intakeOpen, info.intakeValve, progress, running)}
            />
            <ValvePill
              label="Chiqarish"
              state={describeValve(snap.exhaustOpen, info.exhaustValve, progress, running)}
            />
          </div>
        )}

        <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
          {STROKE_INFO.map((s, i) => {
            const fill = i < snap.stroke ? 1 : i === snap.stroke ? progress : 0;
            return (
              <div key={s.id} className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full transition-[width] duration-100 ease-linear"
                  style={{ width: `${fill * 100}%`, backgroundColor: s.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StrokeHud;
