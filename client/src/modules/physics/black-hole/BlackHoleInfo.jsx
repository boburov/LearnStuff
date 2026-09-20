import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import Switch from "@/shared/components/ui/switch/Switch";
import Slider from "@/shared/components/ui/slider/Slider";
import { cn } from "@/shared/utils/cn";
import { FACTS, ISCO_R, PHOTON_R, QUALITIES, RS } from "./data/blackHoleContent";

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

const Row = ({ label, value, children }) => {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <label htmlFor={id} className="text-muted-foreground">{label}</label>
        {value != null && <span className="font-semibold tabular-nums">{value}</span>}
      </div>
      <div id={id}>{children}</div>
    </div>
  );
};

const Toggle = ({ label, hint, checked, onChange }) => (
  <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-2">
    <span>
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>}
    </span>
    <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5 shrink-0" />
  </label>
);

const Fact = ({ fact, open, onToggle }) => (
  <div className="overflow-hidden rounded-lg border border-border">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-secondary/60"
    >
      {fact.title}
      <ChevronDown size={15} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
    </button>
    {open && (
      <p className="border-t border-border px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        {fact.text}
      </p>
    )}
  </div>
);

const BlackHoleInfo = ({ settings, distance, onChange }) => {
  const [openFact, setOpenFact] = useState("horizon");
  const set = (key) => (value) => onChange({ [key]: value });

  // Distance is in M; the horizon is at r = 2M, so r / rs is the honest number.
  const inRs = distance / RS;
  // A clock resting at this distance ticks this much slower than one far away.
  const dilation = inRs > 1.01 ? 1 / Math.sqrt(1 - RS / distance) : null;

  return (
    <div className="space-y-6 text-sm">
      <div className="rounded-lg bg-secondary/50 px-3 py-2">
        <Readout label="Kamera masofasi" value={`${inRs.toFixed(1)} rs`} />
        <Readout
          label="Vaqt sekinlashuvi"
          value={dilation ? `${dilation.toFixed(2)}×` : "cheksiz"}
        />
        <Readout label="Foton sferasi" value={`${(PHOTON_R / RS).toFixed(1)} rs`} />
        <Readout label="ISCO" value={`${(ISCO_R / RS).toFixed(1)} rs`} />
        <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
          rs - Shvarcshild radiusi, ya'ni hodisalar ufqi. Quyosh massasidagi qora
          tuynuk uchun u atigi 3 km, Yer uchun esa 9 mm bo'lardi.
        </p>
      </div>

      <Section title="Fizika">
        <div className="space-y-2">
          <Toggle
            label="Gravitatsion linza"
            hint="O'chirilsa, nur to'g'ri chiziq bo'ylab yuradi - disk oddiy ellipsga aylanadi."
            checked={settings.lensing}
            onChange={set("lensing")}
          />
          <Toggle
            label="Doppler effekti"
            hint="Bizga tomon aylanayotgan tomon yorqinroq va ko'kroq ko'rinadi."
            checked={settings.doppler}
            onChange={set("doppler")}
          />
          <Toggle
            label="Belgilar"
            hint="Foton sferasi (yashil) va ISCO (ko'k) halqalari."
            checked={settings.markers}
            onChange={set("markers")}
          />
          <Toggle
            label="Aylanish"
            hint="Disk moddasi orbitada harakatlanadi."
            checked={settings.spinning}
            onChange={set("spinning")}
          />
        </div>
      </Section>

      <Section title="Akkretsiya diski">
        <div className="space-y-4">
          <Row label="Yorqinlik" value={settings.brightness.toFixed(2)}>
            <Slider
              min={0.1}
              max={2.5}
              step={0.05}
              value={[settings.brightness]}
              onValueChange={([v]) => set("brightness")(v)}
            />
          </Row>
          <Row label="Ichki radius" value={`${(settings.inner / RS).toFixed(1)} rs`}>
            <Slider
              min={3}
              max={14}
              step={0.5}
              value={[settings.inner]}
              onValueChange={([v]) => set("inner")(v)}
            />
          </Row>
          <Row label="Tashqi radius" value={`${(settings.outer / RS).toFixed(1)} rs`}>
            <Slider
              min={8}
              max={30}
              step={0.5}
              value={[settings.outer]}
              onValueChange={([v]) => set("outer")(v)}
            />
          </Row>
          <Row label="Turbulentlik" value={settings.turbulence.toFixed(2)}>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={[settings.turbulence]}
              onValueChange={([v]) => set("turbulence")(v)}
            />
          </Row>
          <Row label="Aylanish tezligi" value={`${settings.speed.toFixed(1)}×`}>
            <Slider
              min={0}
              max={3}
              step={0.1}
              value={[settings.speed]}
              onValueChange={([v]) => set("speed")(v)}
            />
          </Row>
          <Row label="Zichlik" value={settings.opacity.toFixed(2)}>
            <Slider
              min={0.1}
              max={1}
              step={0.05}
              value={[settings.opacity]}
              onValueChange={([v]) => set("opacity")(v)}
            />
          </Row>
        </div>
      </Section>

      <Section title="Tasvir">
        <div className="space-y-4">
          <Row label="Ekspozitsiya" value={settings.exposure.toFixed(2)}>
            <Slider
              min={0.3}
              max={2.5}
              step={0.05}
              value={[settings.exposure]}
              onValueChange={([v]) => set("exposure")(v)}
            />
          </Row>
          <Row label="Sifat">
            <div className="flex flex-wrap gap-2">
              {QUALITIES.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onChange({ quality: q.id, steps: q.steps })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    settings.quality === q.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  {q.name}
                </button>
              ))}
            </div>
          </Row>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Har bir piksel uchun nur yo'li alohida hisoblanadi. Kompyuter sekin
            ishlayotgan bo'lsa, sifatni pasaytiring.
          </p>
        </div>
      </Section>

      <Section title="Nima ko'rinyapti">
        <div className="space-y-2">
          {FACTS.map((fact) => (
            <Fact
              key={fact.id}
              fact={fact}
              open={openFact === fact.id}
              onToggle={() => setOpenFact(openFact === fact.id ? null : fact.id)}
            />
          ))}
        </div>
      </Section>
    </div>
  );
};

export default BlackHoleInfo;
