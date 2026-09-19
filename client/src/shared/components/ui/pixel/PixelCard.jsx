import { cn } from "@/shared/utils/cn";

// Card with an ink border and a hard offset shadow; `interactive` lifts it on hover.
const PixelCard = ({ as: Tag = "div", interactive = false, className, children, ...rest }) => (
  <Tag
    className={cn(
      "rounded-md border-2 border-pixel-ink bg-card shadow-[4px_4px_0_0_theme(colors.pixel.ink)]",
      interactive &&
        "transition-[transform,box-shadow] duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_theme(colors.pixel.ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_theme(colors.pixel.ink)] motion-reduce:transition-none",
      className,
    )}
    {...rest}
  >
    {children}
  </Tag>
);

export default PixelCard;
