import { Link } from "react-router-dom";
import {
  GridBackground,
  PixelCard,
  PixelHeading,
  PixelSprite,
  SUBJECT_SPRITES,
} from "@/shared/components/ui/pixel";
import { SUBJECTS } from "@/modules/subjects/subjects";
import Reveal from "@/shared/components/Reveal";

// Island centers on a BOARD_W x BOARD_H board (desktop map).
const BOARD_W = 1000;
const BOARD_H = 400;
const MARGIN = 160;
// Spots follow the subject count, so adding a subject never runs off the board.
const SPOTS = SUBJECTS.map((_, i, all) => ({
  x: all.length < 2 ? BOARD_W / 2 : MARGIN + ((BOARD_W - MARGIN * 2) * i) / (all.length - 1),
  y: i % 2 ? 140 : 280,
}));
const START = { x: 30, y: 370 };

const pathD = [START, ...SPOTS]
  .map((p, i, all) => {
    if (i === 0) return `M${p.x} ${p.y}`;
    const prev = all[i - 1];
    const mx = (prev.x + p.x) / 2;
    return `C${mx} ${prev.y} ${mx} ${p.y} ${p.x} ${p.y}`;
  })
  .join(" ");

const Island = ({ subject, index }) => (
  <Link
    to={`/${subject.slug}`}
    className="group absolute flex w-44 -translate-x-1/2 -translate-y-[62%] flex-col items-center focus-visible:outline-none"
    style={{ left: `${(SPOTS[index].x / BOARD_W) * 100}%`, top: `${(SPOTS[index].y / BOARD_H) * 100}%` }}
  >
    <PixelSprite
      name={SUBJECT_SPRITES[subject.slug]}
      size={64}
      className="relative z-[1] transition-transform duration-150 group-hover:-translate-y-2 motion-safe:animate-pixel-bob motion-reduce:transition-none"
      style={{ animationDelay: `${index * 0.3}s` }}
    />
    <PixelSprite
      name="island"
      size={128}
      colors={{ g: subject.color, l: "#ffffff66" }}
      className="-mt-1"
    />
    <PixelCard className="-mt-3 w-full px-3 py-2 text-center transition-[transform,box-shadow] duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[6px_6px_0_0_theme(colors.pixel.ink)] group-focus-visible:ring-2 group-focus-visible:ring-ring motion-reduce:transition-none">
      <p className="font-pixel text-[13px] font-medium uppercase tracking-wider" style={{ color: subject.color }}>
        {index + 1}-dunyo
      </p>
      <p className="font-pixel text-lg font-bold leading-tight">{subject.title}</p>
      <p className="text-xs text-muted-foreground">{subject.topics.length} ta mavzu</p>
    </PixelCard>
  </Link>
);

const MapBoard = () => (
  <Reveal className="relative mt-12 hidden aspect-[1000/400] w-full lg:block">
    <svg
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className="absolute inset-0 size-full"
      fill="none"
      aria-hidden="true"
    >
      <path d={pathD} stroke="#1d1330" strokeOpacity="0.18" strokeWidth="14" strokeLinecap="square" />
      <path
        d={pathD}
        stroke="#ffffff"
        strokeWidth="6"
        strokeDasharray="12 12"
        strokeLinecap="square"
      />
    </svg>

    <Link
      to="/chemistry"
      title="Kimyo mavzularidan boshlang"
      className="group absolute flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1 focus-visible:outline-none"
      style={{ left: `${(START.x / BOARD_W) * 100}%`, top: `${(START.y / BOARD_H) * 100}%` }}
    >
      <span className="bg-pixel-ink px-1.5 py-0.5 font-pixel text-xs font-semibold tracking-wider text-pixel-coin transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-ring">
        START
      </span>
      <PixelSprite name="flag" size={32} className="ml-4" />
    </Link>

    {SUBJECTS.map((subject, i) => (
      <Island key={subject.slug} subject={subject} index={i} />
    ))}
  </Reveal>
);

const MapCards = () => (
  <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:hidden">
    {SUBJECTS.map((subject, i) => (
      <Reveal key={subject.slug} delay={i * 60}>
        <PixelCard as={Link} to={`/${subject.slug}`} interactive className="flex h-full gap-4 p-4">
          <span
            className="grid size-16 shrink-0 place-items-center rounded-sm border-2 border-pixel-ink"
            style={{ backgroundColor: `${subject.color}22` }}
          >
            <PixelSprite name={SUBJECT_SPRITES[subject.slug]} size={40} />
          </span>
          <span className="min-w-0">
            <span className="block font-pixel text-[13px] font-medium uppercase tracking-wider" style={{ color: subject.color }}>
              {i + 1}-dunyo · {subject.topics.length} ta mavzu
            </span>
            <span className="block font-pixel text-xl font-bold">{subject.title}</span>
            <span className="mt-1 block text-sm leading-snug text-muted-foreground">{subject.short}</span>
          </span>
        </PixelCard>
      </Reveal>
    ))}
  </div>
);

const WorldMapSection = () => (
  <section id="subjects" className="relative isolate scroll-mt-20 overflow-hidden py-16 md:py-24">
    <GridBackground />
    <div className="container">
      <Reveal>
        <PixelHeading
          centered
          eyebrow="Fanlar xaritasi"
          eyebrowIcon={<PixelSprite name="flag" size={14} />}
          title={`${SUBJECTS.length} ta dunyo, yangi bilimlar`}
          description="Har bir fan o'z mavzulari bilan alohida dunyo. Orolni bosing va mavzular yo'lagiga kiring."
        />
      </Reveal>
      <MapBoard />
      <MapCards />
    </div>
  </section>
);

export default WorldMapSection;
