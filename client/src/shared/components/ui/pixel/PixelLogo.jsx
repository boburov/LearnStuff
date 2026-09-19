import { Link } from "react-router-dom";
import { cn } from "@/shared/utils/cn";
import PixelSprite from "./PixelSprite";

const PixelLogo = ({ to = "/", size = 30, className }) => (
  <Link
    to={to}
    className={cn(
      "group flex items-center gap-2.5 font-pixel text-2xl font-bold leading-none text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
  >
    <PixelSprite
      name="star"
      size={size}
      title="LearnStuff"
      className="transition-transform duration-200 group-hover:-rotate-6 motion-reduce:transition-none"
    />
    <span>
      Learn<span className="text-primary">Stuff</span>
    </span>
  </Link>
);

export default PixelLogo;
