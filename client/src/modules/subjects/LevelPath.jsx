// Topics as numbered level nodes on a snaking path (desktop) or a vertical track (mobile).
import { Link } from "react-router-dom";
import { PixelCard } from "@/shared/components/ui/pixel";
import Icon from "@/shared/components/Icon";

const PER_ROW = 4;
const BOARD_W = 1000;
const ROW_H = 230;
const SIDE = 125;

const nodePoint = (i) => {
  const row = Math.floor(i / PER_ROW);
  const col = i % PER_ROW;
  const slot = row % 2 === 0 ? col : PER_ROW - 1 - col;
  return { x: SIDE + slot * ((BOARD_W - SIDE * 2) / (PER_ROW - 1)), y: 90 + row * ROW_H };
};

const buildPath = (count) => {
  let d = "";
  for (let i = 0; i < count; i++) {
    const p = nodePoint(i);
    if (i === 0) {
      d = `M${p.x} ${p.y}`;
      continue;
    }
    const prev = nodePoint(i - 1);
    if (prev.y === p.y) d += ` L${p.x} ${p.y}`;
    else {
      const bulge = p.x > BOARD_W / 2 ? p.x + 110 : p.x - 110;
      d += ` C${bulge} ${prev.y} ${bulge} ${p.y} ${p.x} ${p.y}`;
    }
  }
  return d;
};

const NodeTile = ({ number, icon, color, size = "lg" }) => (
  <span className="pixel-outline-shadow relative block w-fit">
    <span
      className={
        size === "lg"
          ? "pixel-corners grid size-20 place-items-center"
          : "pixel-corners grid size-14 place-items-center"
      }
      style={{ backgroundColor: color }}
    >
      <Icon name={icon} size={size === "lg" ? 30 : 22} className="text-white" />
    </span>
    <span className="absolute -right-3 -top-3 grid size-8 place-items-center border-2 border-pixel-ink bg-pixel-coin font-pixel text-base font-bold text-pixel-ink">
      {number}
    </span>
  </span>
);

const DesktopPath = ({ subject }) => {
  const { topics, color } = subject;
  const rows = Math.ceil(topics.length / PER_ROW);
  const height = 90 * 2 + (rows - 1) * ROW_H + 60;

  return (
    <div className="relative hidden w-full lg:block" style={{ aspectRatio: `${BOARD_W} / ${height}` }}>
      <svg viewBox={`0 0 ${BOARD_W} ${height}`} className="absolute inset-0 size-full" fill="none" aria-hidden="true">
        <path d={buildPath(topics.length)} stroke={color} strokeOpacity="0.25" strokeWidth="16" strokeLinecap="square" />
        <path d={buildPath(topics.length)} stroke="#ffffff" strokeWidth="5" strokeDasharray="12 12" strokeLinecap="square" />
      </svg>

      {topics.map((topic, i) => {
        const p = nodePoint(i);
        return (
          <Link
            key={topic.slug}
            to={`/${subject.slug}/${topic.slug}`}
            className="group absolute flex w-48 -translate-x-1/2 -translate-y-10 flex-col items-center text-center focus-visible:outline-none"
            style={{ left: `${(p.x / BOARD_W) * 100}%`, top: `${(p.y / height) * 100}%` }}
          >
            {/* hover card with the short description */}
            <PixelCard className="pointer-events-none absolute bottom-full z-10 mb-3 w-56 translate-y-1 px-3 py-2 text-left text-xs leading-snug text-muted-foreground opacity-0 transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
              {topic.short}
            </PixelCard>

            <span className="transition-transform duration-150 group-hover:-translate-y-1.5 group-active:translate-y-0.5 motion-reduce:transition-none">
              <NodeTile number={i + 1} icon={topic.icon} color={color} />
            </span>
            <span className="mt-4 rounded-sm bg-background/90 px-2 font-pixel text-lg font-semibold leading-tight group-hover:text-primary group-focus-visible:ring-2 group-focus-visible:ring-ring">
              {topic.title}
            </span>
          </Link>
        );
      })}
    </div>
  );
};

const MobileTrack = ({ subject }) => (
  <ol className="relative space-y-5 before:absolute before:bottom-6 before:left-7 before:top-6 before:border-l-4 before:border-dashed before:border-[var(--track-color)] lg:hidden" style={{ "--track-color": `${subject.color}55` }}>
    {subject.topics.map((topic, i) => (
      <li key={topic.slug} className="relative">
        <Link to={`/${subject.slug}/${topic.slug}`} className="group flex items-center gap-5 focus-visible:outline-none">
          <NodeTile number={i + 1} icon={topic.icon} color={subject.color} size="sm" />
          <PixelCard className="min-w-0 flex-1 px-4 py-3 transition-transform duration-150 group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-ring motion-reduce:transition-none">
            <span className="block font-pixel text-lg font-semibold leading-tight">{topic.title}</span>
            <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{topic.short}</span>
          </PixelCard>
        </Link>
      </li>
    ))}
  </ol>
);

const LevelPath = ({ subject }) => (
  <>
    <DesktopPath subject={subject} />
    <MobileTrack subject={subject} />
  </>
);

export default LevelPath;
