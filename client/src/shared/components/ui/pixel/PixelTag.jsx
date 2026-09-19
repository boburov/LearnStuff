import { cn } from "@/shared/utils/cn";

// Small stepped label, used as an eyebrow above headings.
const PixelTag = ({ icon, className, children }) => (
  <span className={cn("pixel-outline inline-block", className)}>
    <span className="pixel-corners flex items-center gap-2 bg-card px-3 py-1 font-pixel text-sm font-medium text-foreground">
      {icon}
      {children}
    </span>
  </span>
);

export default PixelTag;
