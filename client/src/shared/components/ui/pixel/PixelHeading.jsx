import { cn } from "@/shared/utils/cn";
import PixelTag from "./PixelTag";

// Section heading: pixel eyebrow + pixel-font title + plain description.
const PixelHeading = ({ eyebrow, eyebrowIcon, title, description, centered = false, className }) => (
  <div className={cn("max-w-2xl", centered && "mx-auto text-center", className)}>
    {eyebrow && <PixelTag icon={eyebrowIcon}>{eyebrow}</PixelTag>}
    <h2 className="mt-5 font-pixel text-3xl font-bold leading-tight text-foreground md:text-5xl">
      {title}
    </h2>
    {description && (
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p>
    )}
  </div>
);

export default PixelHeading;
