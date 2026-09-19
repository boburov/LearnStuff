// Lists the topics of one subject (/:subject) as a level path.
import { Link, useParams } from "react-router-dom";
import {
  GridBackground,
  PixelSprite,
  PixelTag,
  SUBJECT_SPRITES,
} from "@/shared/components/ui/pixel";
import { SUBJECTS, getSubject } from "@/modules/subjects/subjects";
import LevelPath from "./LevelPath";
import NotFoundPage from "../layout/NotFoundPage";

const SubjectPage = () => {
  const { subject: slug } = useParams();
  const subject = getSubject(slug);
  if (!subject) return <NotFoundPage />;

  const worldNumber = SUBJECTS.findIndex((s) => s.slug === subject.slug) + 1;

  return (
    <div className="relative isolate min-h-full overflow-hidden">
      <GridBackground fade="bottom" />

      <div className="container py-8 md:py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-pixel text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <PixelSprite name="arrowDown" size={12} className="rotate-90" />
          Bosh sahifa
        </Link>

        <header className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="pixel-outline-shadow w-fit motion-safe:animate-pixel-bob">
            <span
              className="pixel-corners grid size-24 place-items-center"
              // Opaque base: the outline filter would show through a translucent fill.
              style={{ background: `linear-gradient(${subject.color}26, ${subject.color}26), #fff` }}
            >
              <PixelSprite name={SUBJECT_SPRITES[subject.slug]} size={60} />
            </span>
          </span>
          <div>
            <PixelTag>
              <span style={{ color: subject.color }}>{worldNumber}-dunyo</span>
              <span className="text-muted-foreground">· {subject.topics.length} ta mavzu</span>
            </PixelTag>
            <h1 className="mt-3 font-pixel text-4xl font-bold leading-none md:text-6xl">
              {subject.title}
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">{subject.short}</p>
          </div>
        </header>

        <div className="mt-12 md:mt-16">
          <LevelPath subject={subject} />
        </div>
      </div>
    </div>
  );
};

export default SubjectPage;
