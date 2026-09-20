// Flat pixel version of the hero desk for phones and reduced motion - no WebGL.
import { PixelSprite, SUBJECT_SPRITES } from "@/shared/components/ui/pixel";
import { SUBJECTS } from "@/modules/subjects/subjects";
import useSubjectCycle from "./useSubjectCycle";

const HeroMachineStatic = ({ animate = true }) => {
  const subject = SUBJECTS[useSubjectCycle(animate)];

  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
      <div className="flex w-full max-w-md items-end justify-between px-4">
        <PixelSprite name="flask" size={44} />

        <div className="relative mb-0 flex flex-col items-center">
          <div>
            <div className="flex items-center gap-2 rounded-sm border-[3px] border-pixel-ink bg-violet-500 p-2.5">
              <div className="flex h-28 w-36 flex-col items-center justify-center gap-2 rounded-sm bg-pixel-ink xs:h-32 xs:w-44">
                <PixelSprite
                  key={subject.slug}
                  name={SUBJECT_SPRITES[subject.slug]}
                  size={52}
                  colors={{ k: "#ede9fe" }}
                  className="motion-safe:animate-pop"
                />
                <span className="font-pixel text-xs font-semibold uppercase tracking-wide text-violet-100">
                  {subject.title}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <span className="size-3.5 rounded-full bg-pixel-heart" />
                <span className="h-2 w-3.5 bg-pixel-slime" />
                <span className="h-2 w-3.5 bg-pixel-bolt" />
              </div>
            </div>
          </div>
          <div className="h-2 w-12 bg-pixel-ink" />
        </div>

        <PixelSprite name="robot" size={44} />
      </div>

      {/* desk */}
      <div className="h-4 w-full max-w-lg border-2 border-pixel-ink bg-[#e8b07a]" />
      <div className="grid h-10 w-[94%] max-w-md grid-cols-3 gap-2 border-x-2 border-pixel-ink bg-[#f6efe3] px-2 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex justify-center border-2 border-b-0 border-[#d9c9ad] pt-1.5">
            <span className="h-1.5 w-6 bg-[#c9b89c]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroMachineStatic;
