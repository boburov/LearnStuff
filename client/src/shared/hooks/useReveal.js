import { useEffect, useRef, useState } from "react";

// Element ekranga kirganda bir marta true qaytaradi (scroll reveal uchun).
const useReveal = ({ threshold = 0.12, rootMargin = "0px 0px -8% 0px" } = {}) => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;

    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        observer.disconnect();
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shown, threshold, rootMargin]);

  return [ref, shown];
};

export default useReveal;
