import { useEffect, useRef } from "react";

// Sichqoncha holati (-1..1) ref'da saqlanadi - render qayta ishga tushmaydi,
// faqat useFrame ichida o'qiladi (parallaks uchun).
const usePointerRef = (enabled = true) => {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled]);

  return pointer;
};

export default usePointerRef;
