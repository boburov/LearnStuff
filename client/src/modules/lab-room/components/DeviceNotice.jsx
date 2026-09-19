import { Link } from "react-router-dom";
import { Monitor } from "lucide-react";
import Button from "@/shared/components/ui/button/Button";
import { BACK_TO, DEVICE_NOTICE } from "../data/labRoomContent";

const DeviceNotice = ({ kind }) => {
  const copy = DEVICE_NOTICE[kind];
  return (
    <div className="dark grid h-full place-items-center bg-[#070a12] p-6 text-white">
      <div className="max-w-md space-y-5 text-center">
        <Monitor className="mx-auto size-12 text-violet-300" />
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="leading-relaxed text-white/70">{copy.text}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="ghost" className="rounded-lg text-white hover:bg-white/10 hover:text-white">
            <Link to={BACK_TO}>{DEVICE_NOTICE.back}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeviceNotice;
