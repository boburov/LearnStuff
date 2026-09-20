import { useEffect, useMemo, useRef, useState } from "react";

export const useCountUp = (target, duration = 1000) => {
  const safeTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const safeDuration = Number.isFinite(Number(duration))
    ? Math.max(Number(duration), 0)
    : 1000;

  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (safeDuration === 0) {
      setValue(safeTarget);
      return undefined;
    }

    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / safeDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(eased * safeTarget));

      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [safeTarget, safeDuration]);

  return value;
};

const AnimatedCounter = ({
  value = 0,
  duration = 1000,
  prefix = "",
  suffix = "",
  formatter,
  className = "",
}) => {
  const animatedValue = useCountUp(value, duration);

  const displayValue = useMemo(() => {
    if (typeof formatter === "function") {
      return formatter(animatedValue);
    }

    return animatedValue.toLocaleString("uz-UZ");
  }, [animatedValue, formatter]);

  return (
    <span className={className}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
