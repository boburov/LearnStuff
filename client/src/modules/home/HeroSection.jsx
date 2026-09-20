import { useNavigate } from "react-router-dom";
import {
  GridBackground,
  PixelButton,
  PixelSprite,
  PixelTag,
} from "@/shared/components/ui/pixel";
import { SUBJECTS } from "@/modules/subjects/subjects";
import HeroFloatingCards from "./HeroFloatingCards";
import HeroStage from "./HeroStage";

// Nexprint-style sprites scattered around the headline.
const SCATTER = [
  { name: "star", size: 52, className: "left-[7%] top-40 hidden sm:block" },
  { name: "atom", size: 48, className: "left-[17%] top-16 hidden md:block" },
  { name: "bolt", size: 40, className: "right-[19%] top-24 hidden md:block" },
  { name: "heart", size: 44, className: "right-[7%] top-52 hidden sm:block" },
  { name: "sparkle", size: 34, className: "left-[4%] top-[26rem] hidden lg:block" },
];

const HeroSection = () => {
  const navigate = useNavigate();
  // VR session is started by the lab page overlay (needs its own user gesture).
  const enterLabVR = () => navigate("/chemistry/lab?vr=1");

  return (
    <section className="relative isolate overflow-hidden">
      <GridBackground fade="bottom" />

      {SCATTER.map(({ name, size, className }, i) => (
        <div
          key={name}
          aria-hidden="true"
          className={`pointer-events-none absolute motion-safe:animate-pixel-bob ${className}`}
          style={{ animationDelay: `${i * 0.35}s` }}
        >
          <PixelSprite name={name} size={size} />
        </div>
      ))}

      <div className="container relative flex flex-col items-center pt-10 text-center md:pt-14">
        <PixelTag icon={<PixelSprite name="sparkle" size={16} />}>
          3D · VR · AI o'quv laboratoriyasi
        </PixelTag>

        <h1 className="mt-6 font-pixel text-[2.6rem] font-bold leading-[1.02] text-foreground sm:text-6xl md:text-7xl">
          Fanni o'qib emas,
          <br />
          <span className="text-primary">sinab</span> o'rganing
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Kimyo, biologiya, fizika, elektronika va tarixni brauzerning o'zida aylantirib,
          kesib va tajriba qilib o'rganing. Yoningizda AI o'qituvchi, xohlasangiz VR.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-5">
          <PixelButton
            to={`/${SUBJECTS[0].slug}`}
            size="lg"
            icon={<PixelSprite name="flask" size={22} />}
          >
            Laboratoriyani ochish
          </PixelButton>
          <PixelButton
            onClick={enterLabVR}
            variant="secondary"
            size="lg"
            icon={<PixelSprite name="headset" size={24} />}
          >
            VR rejimda sinash
          </PixelButton>
        </div>

        <PixelSprite
          name="arrowDown"
          size={20}
          className="mt-6 motion-safe:animate-pixel-bob"
        />

        <div className="relative mt-2 h-[240px] w-full max-w-6xl xs:h-[260px] md:h-[420px] lg:h-[470px]">
          <HeroStage />
          <HeroFloatingCards />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
