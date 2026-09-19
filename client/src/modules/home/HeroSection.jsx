import { GridBackground, PixelButton, PixelSprite, PixelTag } from '@/shared/components/ui/pixel';

const SPRITES = [
  { name: 'star', size: 52, position: 'left-[7%] top-32 hidden sm:block' },
  { name: 'bolt', size: 40, position: 'right-[15%] top-20 hidden md:block' },
  { name: 'heart', size: 44, position: 'right-[7%] bottom-20 hidden sm:block' },
  { name: 'sparkle', size: 32, position: 'left-[18%] bottom-16 hidden md:block' },
];

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      <GridBackground fade="bottom" />
      {SPRITES.map(({ name, size, position }, i) => (
        <div key={name} aria-hidden="true" className={`pointer-events-none absolute motion-safe:animate-pixel-bob ${position}`} style={{ animationDelay: `${i * 0.35}s` }}>
          <PixelSprite name={name} size={size} />
        </div>
      ))}
      <div className="container relative flex flex-col items-center py-16 text-center md:py-24">
        <PixelTag icon={<PixelSprite name="sparkle" size={16} />}>LearnStuff · Bilim sari yangi qadam</PixelTag>
        <h1 className="mt-6 font-pixel text-[2.6rem] font-bold leading-[1.02] text-foreground sm:text-6xl md:text-7xl">
          Har kuni yangi narsa.<br /><span className="text-primary">O'rganish</span> shu yerdan boshlanadi.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          O'zingizga qiziq fanni tanlang, mavzularni kashf eting va bilim sari birinchi qadamni tashlang.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-5">
          <PixelButton to="/subjects" size="lg" icon={<PixelSprite name="flag" size={22} />}>Fanlarni ko'rish</PixelButton>
          <PixelButton to="/chemistry/lab" variant="secondary" size="lg" icon={<PixelSprite name="cursor" size={18} />}>3D laboratoriya</PixelButton>
        </div>
        <a href="#subjects" aria-label="Fanlar xaritasiga o'tish" className="mt-10 p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <PixelSprite name="arrowDown" size={20} className="motion-safe:animate-pixel-bob" />
        </a>
      </div>
    </section>
  );
}
