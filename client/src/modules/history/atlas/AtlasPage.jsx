import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";

import useObjectState from "@/shared/hooks/useObjectState";
import { useAtlasMap } from "./hooks/useAtlasMap";
import { nearestYear } from "./data/atlasYears";
import { colorForName } from "./data/atlasColor";
import Timeline from "./components/Timeline";
import InfoCard from "./components/InfoCard";

// Tarixiy interaktiv atlas: yilni surganda davlat chegaralari o'zgaradi.
export default function AtlasPage() {
  const containerRef = useRef(null);
  const { year, picked, setFields } = useObjectState({
    year: 1783, // linkdagi davrga yaqin (Buxoro amirligi)
    picked: null,
  });

  // Ko'rsatilayotgan snapshot yili — slider qiymatidan hosil bo'ladi.
  const snapshot = nearestYear(year);

  const { setYear } = useAtlasMap({
    containerRef,
    onPick: (props) => setFields({ picked: props }),
  });

  // Slider yilini eng yaqin mavjud snapshotga moslab, xaritani yangilaydi.
  // setYear useCallback([]) — barqaror, shuning uchun faqat snapshot o'zgarganda ishlaydi.
  useEffect(() => {
    setYear(snapshot, colorForName);
  }, [snapshot, setYear]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />

      <Link
        to="/history"
        className="pointer-events-auto absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-background/90 px-3 py-2 text-sm font-medium shadow-lg backdrop-blur hover:bg-background"
      >
        <ArrowLeft size={16} />
        Ortga
      </Link>

      <InfoCard
        props={picked}
        year={snapshot}
        onClose={() => setFields({ picked: null })}
      />

      <Timeline value={year} onChange={(y) => setFields({ year: y })} />
    </div>
  );
}
