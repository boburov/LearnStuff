import { useSnap } from "@/shared/utils/snapStore";
import { TEXT } from "../data/labRoomContent";

export const Crosshair = () => (
  <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_0_1.5px_rgba(0,0,0,0.45)]" />
);

export const DragHint = () => (
  <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
    <span className="rounded-full bg-black/55 px-4 py-1.5 text-xs font-medium text-white">{TEXT.dragHint}</span>
  </div>
);

export const FpsBadge = ({ store }) => {
  const fps = useSnap(store);
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-40 rounded-md bg-black/60 px-2 py-1 font-mono text-xs text-white">
      {fps} {TEXT.fpsUnit}
    </div>
  );
};
