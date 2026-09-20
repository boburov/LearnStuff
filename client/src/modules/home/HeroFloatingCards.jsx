// Tilted feature cards floating beside the hero desk (desktop only).
import { PixelCard, PixelSprite } from "@/shared/components/ui/pixel";
import { cn } from "@/shared/utils/cn";

// Tilt sits on the inner node - the float animation owns the outer transform.
const Floating = ({ className, tilt, delay, children }) => (
  <div
    className={cn("absolute hidden motion-safe:animate-float-y lg:block", className)}
    style={{ animationDelay: delay }}
  >
    <div style={{ transform: `rotate(${tilt}deg)` }}>{children}</div>
  </div>
);

const HeroFloatingCards = () => (
  <>
    <Floating className="left-0 top-4 xl:-left-6" tilt={-6} delay="0s">
      <PixelCard className="w-60 p-3.5">
        <div className="flex items-center gap-2.5">
          <PixelSprite name="robot" size={30} />
          <div>
            <p className="font-pixel text-sm font-semibold leading-none">AI o'qituvchi</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Mavzuni biladi</p>
          </div>
        </div>
        <p className="mt-3 rounded-sm bg-secondary px-2.5 py-2 text-xs leading-snug">
          Nega suv 100°C da qaynaydi?
        </p>
        <div className="mt-2 flex items-center gap-1 pl-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 bg-primary motion-safe:animate-blink"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </PixelCard>
    </Floating>

    <Floating className="right-2 top-0 xl:-right-4" tilt={5} delay="1.2s">
      <PixelCard className="flex w-52 items-center gap-3 p-3.5">
        <PixelSprite name="headset" size={40} />
        <div>
          <p className="font-pixel text-sm font-semibold leading-none">VR tayyor</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Cardboard · Quest</p>
        </div>
      </PixelCard>
    </Floating>

    <Floating className="bottom-28 right-0 xl:-right-10" tilt={-4} delay="2.4s">
      <PixelCard className="flex w-56 items-center gap-3 p-3.5">
        <PixelSprite name="cube" size={36} />
        <div>
          <p className="font-pixel text-sm font-semibold leading-none">3D model</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Aylantiring, kesing, yaqinlashtiring</p>
        </div>
      </PixelCard>
    </Floating>
  </>
);

export default HeroFloatingCards;
