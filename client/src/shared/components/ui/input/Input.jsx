// Utils
import { cn } from "@/shared/utils/cn.js";

export const inputBaseClasses =
  "flex h-10 w-full rounded-[2px] border border-input bg-white px-3 py-2 text-base outline-2 outline-primary outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const Input = ({ className, type = "text", ref, ...props }) => {
  if (type === "textarea") {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(inputBaseClasses, "h-auto min-h-40 max-h-96", className)}
      />
    );
  }

  return (
    <input
      ref={ref}
      {...props}
      type={type}
      className={cn(inputBaseClasses, className)}
    />
  );
};

Input.displayName = "Input";

export default Input;
