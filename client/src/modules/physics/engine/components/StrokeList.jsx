import { ArrowDown, ArrowUp } from "lucide-react";
import Badge from "@/shared/components/ui/badge/Badge";
import { cn } from "@/shared/utils/cn";
import { STROKE_INFO } from "../data/engineContent";

const StrokeCard = ({ info, index, active, detailed, running, onStep }) => {
  const Arrow = info.piston === "pastga" ? ArrowDown : ArrowUp;

  return (
    <button
      type="button"
      onClick={() => onStep(index)}
      aria-current={active ? "step" : undefined}
      className={cn(
        "w-full rounded-xl border-2 p-3 text-left transition-colors",
        active ? "shadow-sm" : "border-border bg-background hover:bg-secondary",
      )}
      style={
        active ? { borderColor: info.color, backgroundColor: `${info.color}14` } : undefined
      }
    >
      <div className="flex items-center gap-2.5">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg text-base font-bold text-white"
          style={{ backgroundColor: info.color }}
        >
          {info.number}
        </span>
        <span className="flex-1 text-base font-semibold leading-tight">{info.name}</span>
        {active && running && (
          <Badge className="border-transparent text-white" style={{ backgroundColor: info.color }}>
            Hozir
          </Badge>
        )}
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          Porshen: <Arrow size={12} className="text-foreground" />
          <span className="font-medium text-foreground">{info.piston}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Kiritish: <span className="font-medium text-foreground">{info.intakeValve}</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>
          Chiqarish: <span className="font-medium text-foreground">{info.exhaustValve}</span>
        </span>
      </p>

      {active && detailed && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">{info.text}</p>
      )}
    </button>
  );
};

// At fast speeds the highlight would flash ~10x/s on a projector, so it is dropped.
const StrokeList = ({ activeStroke = 0, running = false, detailed = true, fast = false, onStep }) => (
  <div className="space-y-2">
    {STROKE_INFO.map((info, i) => (
      <StrokeCard
        key={info.id}
        info={info}
        index={i}
        active={!fast && i === activeStroke}
        detailed={detailed}
        running={running}
        onStep={onStep}
      />
    ))}
    {!detailed && (
      <p className="text-xs text-muted-foreground">
        Tushuntirishni o'qish uchun tezlikni pasaytiring yoki taktni bosing.
      </p>
    )}
  </div>
);

export default StrokeList;
