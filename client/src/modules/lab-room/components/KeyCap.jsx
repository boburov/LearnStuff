import { cn } from "@/shared/utils/cn";

const KeyCap = ({ children, light = false }) => (
  <kbd
    className={cn(
      "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 font-sans text-xs font-semibold",
      light
        ? "border-[#b8c0c8] border-b-[#8e98a2] bg-white text-[#1f2933] shadow-[inset_0_-2px_0_rgba(15,23,32,0.12)]"
        : "border-white/20 border-b-white/35 bg-white/10 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.35)]",
    )}
  >
    {children}
  </kbd>
);

export default KeyCap;
