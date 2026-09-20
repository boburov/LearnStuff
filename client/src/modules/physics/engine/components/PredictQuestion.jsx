import { CircleCheck, Flame, CircleHelp, RotateCcw, CircleX } from "lucide-react";
import Button from "@/shared/components/ui/button/Button";
import { cn } from "@/shared/utils/cn";
import { PREDICT } from "../data/engineContent";

const PredictQuestion = ({ answer = null, onAnswer, onShowPower, onRetry }) => {
  const answered = answer != null;
  const correct = answer === PREDICT.correct;

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
      <p className="flex gap-2 text-sm font-semibold leading-snug">
        <CircleHelp size={18} className="mt-0.5 shrink-0 text-primary" />
        {PREDICT.question}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {PREDICT.options.map((opt) => {
          const chosen = answer === opt.id;
          const isRight = opt.id === PREDICT.correct;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(opt.id)}
              aria-pressed={chosen}
              className={cn(
                "rounded-lg border px-1 py-2 text-center text-sm font-medium transition-colors disabled:cursor-default",
                !answered && "border-border bg-background hover:border-primary hover:bg-secondary",
                answered && chosen && isRight && "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                answered && chosen && !isRight && "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                answered && !chosen && "border-border bg-background opacity-60",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {answered && (
        <div
          role="status"
          className={cn(
            "mt-3 flex gap-2 rounded-lg p-2.5 text-sm leading-relaxed",
            correct
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              : "bg-amber-500/10 text-amber-800 dark:text-amber-200",
          )}
        >
          {correct ? (
            <CircleCheck size={18} className="mt-0.5 shrink-0" />
          ) : (
            <CircleX size={18} className="mt-0.5 shrink-0" />
          )}
          <span>{correct ? PREDICT.feedback.correct : PREDICT.feedback.wrong}</span>
        </div>
      )}

      {answered && (
        <div className="mt-3 flex flex-col gap-2">
          {correct && (
            <Button className="w-full rounded-lg" onClick={onShowPower}>
              <Flame /> {PREDICT.showPower}
            </Button>
          )}
          <Button variant="ghost" className="w-full rounded-lg" onClick={onRetry}>
            <RotateCcw /> {PREDICT.retry}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PredictQuestion;
