import { Link } from "react-router-dom";
import { cn } from "@/shared/utils/cn";

const VARIANTS = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-card text-foreground",
  coin: "bg-pixel-coin text-pixel-ink",
};

// Stepped-corner button with an ink outline; the outline lives on the wrapper so clip-path can't cut it.
const PixelButton = ({
  to,
  onClick,
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}) => {
  const face = (
    <span
      className={cn(
        "pixel-corners flex items-center justify-center gap-2.5 font-pixel font-semibold tracking-wide",
        size === "lg" ? "px-7 py-3.5 text-lg" : "px-5 py-2.5 text-base",
        VARIANTS[variant],
      )}
    >
      {icon}
      {children}
    </span>
  );

  const wrapper = cn(
    "pixel-outline-shadow inline-block transition-transform duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 motion-reduce:transition-none",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={wrapper} {...rest}>
        {face}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={wrapper} {...rest}>
      {face}
    </button>
  );
};

export default PixelButton;
