import { Link } from "react-router-dom";
import { PixelLogo, PixelSprite, SUBJECT_SPRITES } from "@/shared/components/ui/pixel";
import { SUBJECTS } from "@/modules/subjects/subjects";

const SiteFooter = () => (
  <footer className="border-t-2 border-pixel-ink bg-card">
    <div className="container flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <PixelLogo />
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Kichik qadamlar bilan katta bilim sari. LearnStuff bilan o'rganing.
        </p>
      </div>

      <nav aria-label="Fanlar" className="flex flex-wrap gap-x-5 gap-y-3">
        {SUBJECTS.map((subject) => (
          <Link
            key={subject.slug}
            to={`/${subject.slug}`}
            className="flex items-center gap-1.5 font-pixel text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <PixelSprite name={SUBJECT_SPRITES[subject.slug]} size={16} />
            {subject.title}
          </Link>
        ))}
      </nav>
    </div>
  </footer>
);

export default SiteFooter;
