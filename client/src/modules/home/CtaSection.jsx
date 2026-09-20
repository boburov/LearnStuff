import { useNavigate } from "react-router-dom";
import { PixelButton, PixelSprite } from "@/shared/components/ui/pixel";
import { SUBJECTS } from "@/modules/subjects/subjects";
import Reveal from "@/shared/components/Reveal";

const CtaSection = () => {
  const navigate = useNavigate();
  const enterLabVR = () => navigate("/chemistry/lab?vr=1");

  return (
    <section className="container pb-20 md:pb-28">
      <Reveal className="relative overflow-hidden rounded-md border-2 border-pixel-ink bg-primary px-6 py-14 text-center shadow-[6px_6px_0_0_theme(colors.pixel.ink)] md:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <PixelSprite name="star" size={48} className="absolute left-6 top-6 hidden motion-safe:animate-pixel-bob sm:block" />
        <PixelSprite name="heart" size={40} className="absolute bottom-8 right-8 hidden motion-safe:animate-pixel-bob sm:block" style={{ animationDelay: "0.5s" }} />
        <PixelSprite name="bolt" size={34} className="absolute right-16 top-8 hidden motion-safe:animate-pixel-bob md:block" style={{ animationDelay: "0.9s" }} />

        <h2 className="relative mx-auto max-w-2xl font-pixel text-3xl font-bold leading-tight text-white md:text-5xl">
          Birinchi tajribangizni hoziroq boshlang
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-base text-violet-100">
          Laboratoriya ochiq: ro'yxatdan o'tish ham, to'lov ham kerak emas. Bitta bosishda 3D sahnaga kirasiz.
        </p>

        <div className="relative mt-8 flex flex-wrap justify-center gap-5">
          <PixelButton to={`/${SUBJECTS[0].slug}`} variant="coin" size="lg" icon={<PixelSprite name="flask" size={22} />}>
            Laboratoriyani ochish
          </PixelButton>
          <PixelButton onClick={enterLabVR} variant="secondary" size="lg" icon={<PixelSprite name="headset" size={24} />}>
            VR rejimda sinash
          </PixelButton>
        </div>
      </Reveal>
    </section>
  );
};

export default CtaSection;
