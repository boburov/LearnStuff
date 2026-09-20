import { useEffect, useState } from "react";
import { SUBJECTS } from "@/modules/subjects/subjects";

// Index of the subject currently shown on the hero machine screen.
const useSubjectCycle = (enabled = true, interval = 1800) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % SUBJECTS.length), interval);
    return () => clearInterval(id);
  }, [enabled, interval]);

  return index;
};

export default useSubjectCycle;
