import AnimatedCounter from "@/shared/components/ui/counter/AnimatedCounter";
import { PixelSprite } from "@/shared/components/ui/pixel";
import useMediaQuery from "@/shared/hooks/useMediaQuery";
import { SUBJECTS } from "@/modules/subjects/subjects";
import useReveal from "@/shared/hooks/useReveal";

const TOPIC_COUNT = SUBJECTS.reduce((sum, s) => sum + s.topics.length, 0);

const STATS = [
  { value: SUBJECTS.length, label: "fan yo'nalishi", sprite: "flask" },
  { value: TOPIC_COUNT, label: "interaktiv mavzu", sprite: "cube" },
  { value: 3, label: "o'rganish rejimi", sprite: "headset" },
  { value: 100, suffix: "%", label: "o'zbek tilida", sprite: "bubble" },
];

// Bonau.ly-style thin stats bar right under the hero desk.
const StatsSection = () => {
  const [ref, shown] = useReveal({ threshold: 0.3 });
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  return (
    <section ref={ref} className="border-y-2 border-pixel-ink bg-card">
      <div className="container grid grid-cols-2 gap-y-4 py-5 lg:grid-cols-4 lg:divide-x-2 lg:divide-dashed lg:divide-border">
        {STATS.map(({ value, suffix, label, sprite }) => (
          <div key={label} className="flex items-center gap-3 lg:justify-center">
            <PixelSprite name={sprite} size={28} />
            <p className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <span className="font-pixel text-2xl font-bold text-foreground md:text-3xl">
                {shown ? (
                  <AnimatedCounter value={value} suffix={suffix} duration={reducedMotion ? 0 : 1200} />
                ) : (
                  `0${suffix ?? ""}`
                )}
              </span>
              <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsSection;
