// Shared pixel navigation.
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { PixelLogo, PixelSprite, SUBJECT_SPRITES } from "@/shared/components/ui/pixel";
import { cn } from "@/shared/utils/cn";
import { SUBJECTS } from "@/modules/subjects/subjects";

const linkClass = (isActive) =>
  cn(
    "flex items-center gap-2 rounded-sm border-2 px-3 py-1.5 font-pixel text-base leading-none transition-colors",
    isActive
      ? "border-pixel-ink bg-card text-foreground shadow-[3px_3px_0_0_theme(colors.pixel.ink)]"
      : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground",
  );

const SiteHeader = () => {
  const [open, setOpen] = useState(false);

  return (
    // Match the graph-paper background of the page.
    <header className="bg-pixel-grid sticky top-0 z-30 bg-background">
      <div className="container flex h-16 items-center justify-between gap-4">
        <PixelLogo />

        <nav className="hidden items-center gap-1.5 lg:flex">
          {SUBJECTS.map((s) => (
            <NavLink key={s.slug} to={`/${s.slug}`} className={({ isActive }) => linkClass(isActive)}>
              <PixelSprite name={SUBJECT_SPRITES[s.slug]} size={16} />
              {s.title}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Menyuni yopish" : "Menyuni ochish"}
          aria-expanded={open}
          className="grid size-10 place-items-center rounded-sm border-2 border-pixel-ink bg-card shadow-[3px_3px_0_0_theme(colors.pixel.ink)] transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none lg:hidden"
        >
          {/* pixel hamburger / cross */}
          <svg viewBox="0 0 7 7" width="18" height="18" shapeRendering="crispEdges" aria-hidden="true">
            {open ? (
              <path d="M0 0h1v1H0zM1 1h1v1H1zM2 2h1v1H2zM3 3h1v1H3zM4 4h1v1H4zM5 5h1v1H5zM6 6h1v1H6zM6 0h1v1H6zM5 1h1v1H5zM4 2h1v1H4zM2 4h1v1H2zM1 5h1v1H1zM0 6h1v1H0z" fill="#1d1330" />
            ) : (
              <path d="M0 0h7v1H0zM0 3h7v1H0zM0 6h7v1H0z" fill="#1d1330" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="container flex flex-col gap-1.5 py-3 lg:hidden">
          {SUBJECTS.map((s) => (
            <NavLink
              key={s.slug}
              to={`/${s.slug}`}
              onClick={() => setOpen(false)}
              className={({ isActive }) => cn(linkClass(isActive), "py-2.5")}
            >
              <PixelSprite name={SUBJECT_SPRITES[s.slug]} size={20} />
              {s.title}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
};

export default SiteHeader;
