import { useId } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import Button from "@/shared/components/ui/button/Button";
import Switch from "@/shared/components/ui/switch/Switch";
import Slider from "@/shared/components/ui/slider/Slider";
import { cn } from "@/shared/utils/cn";
import { DEG, GAS_COLORS } from "../engineMath";
import { PARTS } from "../engineParts";
import { STEP_RPM, useSnap } from "../engineSim";
import { FAST_RPM, GAS_LEGEND, INTRO, SPEED_PRESETS } from "../data/engineContent";
import StrokeList from "./StrokeList";
import PredictQuestion from "./PredictQuestion";

// Explanations expand only while a stroke lasts >= 1 s, so the list does not jump.
const DETAIL_RPM = 30;

const Section = ({ title, children }) => (
  <section className="space-y-2.5">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {title}
    </h3>
    {children}
  </section>
);

const Readout = ({ label, value }) => (
  <div className="flex justify-between gap-3 border-b border-border/60 py-1 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-semibold tabular-nums">{value}</span>
  </div>
);

const LiveStrokeList = ({ snapStore, ...props }) => {
  const { stroke } = useSnap(snapStore);
  return <StrokeList activeStroke={stroke} {...props} />;
};

const LiveReadouts = ({ snapStore, effectiveRpm, stepping }) => {
  const snap = useSnap(snapStore);
  const crankDeg = Math.round(snap.theta / DEG) % 720;
  const camDeg = Math.round(snap.theta / DEG / 2) % 360;

  return (
    <div className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
      <Readout label="Tirsakli val burchagi" value={`${crankDeg}°`} />
      <Readout label="Taqsimlash vali burchagi" value={`${camDeg}°`} />
      <Readout label="Porshen holati" value={`YChNdan ${Math.round(snap.travel * 100)}% pastda`} />
      <Readout label="Bir takt davomiyligi" value={`${(30 / effectiveRpm).toFixed(2)} s`} />
      <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
        YChN - yuqori chekka nuqta. Bir siklda tirsakli val 720°, taqsimlash vali esa
        atigi 360° buriladi.
        {stepping && " Takt hozir sekin ko'rsatilmoqda."}
      </p>
    </div>
  );
};

const EngineInfo = ({
  running = false,
  stepping = false,
  rpm,
  soundOn = false,
  snapStore,
  predictAnswer = null,
  selectedId = null,
  onToggleRun,
  onRpm,
  onSound,
  onStepStroke,
  onPredict,
  onPredictRetry,
  onSelectPart,
}) => {
  const soundId = useId();
  const effectiveRpm = stepping ? Math.min(rpm, STEP_RPM) : rpm;
  const detailed = !running || stepping || rpm <= DETAIL_RPM;
  const fast = running && !stepping && rpm > FAST_RPM;

  return (
    <div className="space-y-6">
      <Section title="Boshqaruv">
        <Button
          size="lg"
          className="w-full rounded-lg text-base [&_svg]:size-5"
          variant={running ? "secondary" : "default"}
          onClick={onToggleRun}
        >
          {running ? <Pause /> : <Play />}
          {running ? "To'xtatish" : "Ishga tushirish"}
        </Button>

        <Slider
          label="Aylanish chastotasi"
          value={rpm}
          min={10}
          max={600}
          step={10}
          unit=" ayl/min"
          onChange={onRpm}
        />

        <div className="grid grid-cols-3 gap-2">
          {SPEED_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onRpm(p.rpm)}
              aria-pressed={rpm === p.rpm}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-center transition-colors",
                rpm === p.rpm
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-secondary",
              )}
            >
              <span className="block text-sm font-semibold leading-tight">{p.name}</span>
              <span className="block text-xs tabular-nums opacity-80">{p.rpm}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <label htmlFor={soundId} className="flex items-center gap-2 text-sm font-medium">
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} className="text-muted-foreground" />}
            Ovoz
          </label>
          <Switch id={soundId} checked={soundOn} onChange={onSound} />
        </div>
      </Section>

      {/* Asked before the stroke cards, which name and explain the answer. */}
      <Section title="Bashorat">
        <PredictQuestion
          answer={predictAnswer}
          onAnswer={onPredict}
          onShowPower={() => onStepStroke(2)}
          onRetry={onPredictRetry}
        />
      </Section>

      <Section title="To'rt takt">
        <p className="text-xs text-muted-foreground">
          Taktni bosing - dvigatel aynan shu taktni sekin ko'rsatadi.
        </p>
        <LiveStrokeList
          snapStore={snapStore}
          running={running}
          detailed={detailed}
          fast={fast}
          onStep={onStepStroke}
        />
      </Section>

      <Section title="Holat">
        <LiveReadouts snapStore={snapStore} effectiveRpm={effectiveRpm} stepping={stepping} />
      </Section>

      <Section title="Gaz ranglari">
        <ul className="space-y-2">
          {GAS_LEGEND.map((g) => (
            <li key={g.id} className="flex items-center gap-2.5 text-sm">
              <span
                className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: GAS_COLORS[g.id] }}
              />
              <span className="flex-1 leading-tight">{g.label}</span>
              <span className="text-xs text-muted-foreground">{g.hint}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Qismlar">
        <p className="text-xs text-muted-foreground">
          Qismni tanlang yoki modelning o'zida bosing.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PARTS.map((p) => {
            const active = selectedId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPart(active ? null : p.id)}
                aria-pressed={active}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-secondary",
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Dvigatel haqida">
        <p className="text-sm leading-relaxed text-muted-foreground">{INTRO}</p>
      </Section>
    </div>
  );
};

export default EngineInfo;
