import { useId } from "react";
import { cn } from "@/shared/utils/cn";

const Slider = ({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  display,
  onChange = () => {},
  disabled = false,
  className,
}) => {
  const id = useId();
  const shown = `${display ?? value}${unit}`;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        {label && (
          <label htmlFor={id} className="text-muted-foreground">
            {label}
          </label>
        )}
        <output htmlFor={id} className="font-semibold tabular-nums">
          {shown}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
};

export default Slider;
