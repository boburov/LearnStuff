// Mobile-only floating controls for the 3D workspace: a back button plus
// buttons that open the side panels (drawers). Hidden on lg+ where the panels
// are always visible in-flow.
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const btn =
  "pointer-events-auto grid size-10 place-items-center rounded-xl border border-border bg-background/90 text-foreground shadow-md backdrop-blur transition-transform hover:bg-secondary active:scale-95";

const WorkspaceMobileBar = ({
  backTo = "/",
  onOpenLeft,
  leftIcon,
  leftLabel = "Panel",
  onOpenRight,
  rightIcon,
  rightLabel = "Panel",
}) => (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-3 lg:hidden">
    <div className="flex gap-2">
      <Link to={backTo} aria-label="Orqaga" className={btn}>
        <ArrowLeft size={18} />
      </Link>
      {onOpenLeft && (
        <button type="button" onClick={onOpenLeft} aria-label={leftLabel} className={btn}>
          {leftIcon}
        </button>
      )}
    </div>
    {onOpenRight && (
      <button type="button" onClick={onOpenRight} aria-label={rightLabel} className={btn}>
        {rightIcon}
      </button>
    )}
  </div>
);

export default WorkspaceMobileBar;
