import { useSnap } from "@/shared/utils/snapStore";
import { cn } from "@/shared/utils/cn";
import KeyCap from "./KeyCap";

const InteractionPrompt = ({ world }) => {
  const { prompt, flash } = useSnap(world.hud);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[calc(50%+28px)] z-20 flex flex-col items-center gap-2 px-4">
      {prompt && (
        <div className="flex flex-col items-center gap-1.5 rounded-xl bg-black/50 px-4 py-2 text-white">
          <span className="text-sm font-semibold">{prompt.title}</span>
          {prompt.subtitle && <span className="-mt-1 text-xs text-white/75">{prompt.subtitle}</span>}
          {prompt.actions.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3">
              {prompt.actions.map((action) => (
                <span
                  key={action.label}
                  className={cn("flex items-center gap-1.5 text-xs", action.disabled ? "text-amber-300" : "text-white/85")}
                >
                  {action.keys.map((key) => (
                    <KeyCap key={key}>{key}</KeyCap>
                  ))}
                  {action.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {flash && (
        <span
          key={flash.at}
          className="animate-flash-out rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-black"
        >
          {flash.text}
        </span>
      )}
    </div>
  );
};

export default InteractionPrompt;
