import { cn } from "@/shared/utils/cn";
import useReveal from "@/shared/hooks/useReveal";

// Scroll paytida silliq paydo bo'luvchi o'ram. `prefers-reduced-motion` yoqilgan
// bo'lsa kontent darhol ko'rinadi (motion-reduce variantlari orqali).
const Reveal = ({ as: Tag = "div", delay = 0, className, children, ...rest }) => {
  const [ref, shown] = useReveal();

  return (
    <Tag
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        shown
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0 motion-reduce:translate-y-0 motion-reduce:opacity-100",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
