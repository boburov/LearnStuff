import { PixelCard, PixelHeading, PixelSprite } from "@/shared/components/ui/pixel";
import Reveal from "@/shared/components/Reveal";

const FEATURES = [
  {
    sprite: "cube",
    tag: "3D",
    title: "3D interaktiv modellar",
    text: "Molekula, hujayra, anatomiya va dvigatelni aylantiring, kattalashtiring va ichidan ko'ring.",
  },
  {
    sprite: "gear",
    tag: "SIM",
    title: "Haqiqiy simulyatsiyalar",
    text: "Reaksiya, pH, gaz qonunlari va elektron sxemalar fizik-kimyoviy qoidalar asosida hisoblanadi.",
  },
  {
    sprite: "robot",
    tag: "AI",
    title: "AI o'qituvchi",
    text: "Mavzu kontekstini biladigan sun'iy intellekt savolingizga o'sha sahnaning o'zida javob beradi.",
  },
  {
    sprite: "headset",
    tag: "VR",
    title: "VR va WebXR",
    text: "Telefon uchun Cardboard yoki Quest ko'zoynagi bilan laboratoriyaga ichkaridan kiring.",
  },
  {
    sprite: "bubble",
    tag: "UZ",
    title: "To'liq o'zbek tilida",
    text: "Barcha mavzular, atamalar va AI izohlari o'zbek tilida tayyorlangan.",
  },
  {
    sprite: "phone",
    tag: "WEB",
    title: "Brauzerda ishlaydi",
    text: "O'rnatish va ro'yxatdan o'tish shart emas. Havolani oching, telefonda ham ishlaydi.",
  },
];

const FeaturesSection = () => (
  <section className="border-y-2 border-pixel-ink bg-secondary/60 py-16 md:py-24">
    <div className="container">
      <Reveal>
        <PixelHeading
          centered
          eyebrow="Imkoniyatlar"
          eyebrowIcon={<PixelSprite name="bolt" size={14} />}
          title="Laboratoriyadagi jihozlar"
          description="Darslikdagi rasm jonli tajribaga aylanadi: ko'ring, o'zgartiring, natijani kuzating."
        />
      </Reveal>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ sprite, tag, title, text }, i) => (
          <Reveal key={title} delay={i * 60} className="h-full">
            <PixelCard className="group relative h-full p-5">
              <span className="absolute right-4 top-4 bg-pixel-ink px-1.5 py-0.5 font-pixel text-[11px] font-semibold tracking-wider text-pixel-coin">
                {tag}
              </span>
              <span className="grid size-16 place-items-center rounded-sm border-2 border-dashed border-border bg-background">
                <PixelSprite
                  name={sprite}
                  size={40}
                  className="transition-transform duration-150 group-hover:-translate-y-1 motion-reduce:transition-none"
                />
              </span>
              <h3 className="mt-4 font-pixel text-xl font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </PixelCard>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
