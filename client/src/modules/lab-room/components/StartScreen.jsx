import { useProgress } from "@react-three/drei";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Button from "@/shared/components/ui/button/Button";
import { BACK_LABEL, BACK_TO, CONTROLS, SUBTITLE, TEXT, TITLE } from "../data/labRoomContent";
import KeyCap from "./KeyCap";
import QualityPicker from "./QualityPicker";

const LoadingProgress = ({ ready }) => {
  const { progress } = useProgress();
  const percent = ready ? 100 : Math.min(99, Math.round(progress));
  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex justify-between text-xs text-white/60">
        <span>{ready ? TITLE : `${TEXT.loading}...`}</span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-violet-400 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

const StartScreen = ({ ready, tier, recommended, placeholder, lockHint, onQuality, onEnter }) => (
  <div className="dark absolute inset-0 z-30 flex bg-gradient-to-r from-[#070a12]/95 via-[#070a12]/85 to-[#070a12]/25 text-white">
    <div className="flex w-full max-w-xl flex-col justify-between gap-8 overflow-y-auto p-6 sm:p-12">
      <Link
        to={BACK_TO}
        className="inline-flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        {BACK_LABEL}
      </Link>

      <div className="space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">LearnStuff</p>
          <h1 className="mt-3 font-pixel text-4xl font-bold tracking-tight sm:text-5xl">{TITLE}</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">{SUBTITLE}</p>
        </div>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">{TEXT.controls}</h2>
          <ul className="mt-3 grid gap-2.5">
            {CONTROLS.map((control) => (
              <li key={control.label} className="flex items-center justify-between gap-4">
                <span className="flex flex-wrap gap-1.5">
                  {control.keys.map((key) => (
                    <KeyCap key={key}>{key}</KeyCap>
                  ))}
                </span>
                <span className="text-sm text-white/80">{control.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <QualityPicker tier={tier} recommended={recommended} onChange={onQuality} />
      </div>

      <div className="space-y-3">
        <LoadingProgress ready={ready} />
        {placeholder && ready && <p className="text-xs text-amber-300/90">{TEXT.placeholder}</p>}
        {lockHint && <p className="text-sm text-amber-300">{TEXT.lockHint}</p>}
        <Button
          size="lg"
          disabled={!ready}
          onClick={onEnter}
          className="h-12 w-full rounded-lg text-base font-semibold text-white"
        >
          {TEXT.enter}
        </Button>
      </div>
    </div>
  </div>
);

export default StartScreen;
