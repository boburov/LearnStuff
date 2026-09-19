import { PixelHeading, PixelSprite } from "@/shared/components/ui/pixel";
import Reveal from "@/shared/components/Reveal";

const STEPS = [
  {
    sprite: "cursor",
    title: "Fanni tanlang",
    text: "Kimyo, fizika, elektronika yoki tarix: qiziqtirgan yo'nalishni oching.",
  },
  {
    sprite: "cube",
    title: "Mavzuni tanlang",
    text: "Mavzular yo'lagi bo'ylab yuring va qiziqqan mavzu haqida qisqacha bilib oling.",
  },
  {
    sprite: "sparkle",
    title: "Keyingi qadamga o'ting",
    text: "Fanlar xaritasiga qaytib, boshqa yo'nalishlarni ham kashf eting.",
  },
];

const ProcessSection = () => (
  <section className="container py-16 md:py-24">
    <Reveal>
      <PixelHeading
        centered
        eyebrow="Qanday ishlaydi"
        eyebrowIcon={<PixelSprite name="cursor" size={10} />}
        title="Bilim sari uch qadam"
        description="Qiziqishdan boshlang. O'zingizga mos mavzuni toping."
      />
    </Reveal>

    <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
      <div
        aria-hidden="true"
        className="absolute left-[16%] right-[16%] top-10 hidden border-t-4 border-dashed border-border md:block"
      />

      {STEPS.map(({ sprite, title, text }, i) => (
        <Reveal key={title} delay={i * 110} className="relative text-center">
          <div className="pixel-outline-shadow relative mx-auto w-fit">
            <div className="pixel-corners grid size-20 place-items-center bg-card">
              <PixelSprite name={sprite} size={40} />
            </div>
          </div>
          <span className="absolute left-1/2 top-0 ml-7 grid size-8 -translate-y-2 place-items-center bg-primary font-pixel text-base font-bold text-primary-foreground">
            {i + 1}
          </span>
          <h3 className="mt-6 font-pixel text-xl font-semibold">{title}</h3>
          <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {text}
          </p>
        </Reveal>
      ))}
    </div>
  </section>
);

export default ProcessSection;
