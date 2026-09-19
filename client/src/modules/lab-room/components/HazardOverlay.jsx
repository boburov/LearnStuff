import { useEffect, useRef } from "react";
import { SPECIES } from "../chemistry/species";

const TICK_MS = 100;

const GAS_ADVICE = {
  low: (name) => `${name} hidi keldi — mo'rili shkafdan foydalaning`,
  mid: (name) => `${name} bug'idan yo'talyapsiz — nafasni ushlab, uzoqlashing`,
  high: (name) => `Havo xavfli: ${name} ko'p — eshik tomon chiqing va shamollatgichni yoqing`,
};

const ALARM_TEXT = { fire: "Yong'in signali", gas: "Havoda zaharli gaz" };

const gasMessage = (irritant, species) => {
  if (!species || irritant < 0.25) return "";
  const name = SPECIES[species]?.name ?? "zaharli gaz";
  if (irritant > 1) return GAS_ADVICE.high(name);
  return irritant > 0.55 ? GAS_ADVICE.mid(name) : GAS_ADVICE.low(name);
};

const setLayer = (el, opacity, extra) => {
  if (!el) return;
  el.style.opacity = opacity.toFixed(3);
  if (extra) Object.assign(el.style, extra);
};

// Writes straight to the DOM every tick: the values change continuously and must not re-render the page.
const paint = (root, lab) => {
  if (!root) return;
  const { exposure, alarm } = lab.hazards;
  const calm = lab.prefs.reduceMotion;
  const eye = lab.activity.cameraPosition;
  const irritant = exposure.irritant;
  const haze = eye ? lab.hazards.haze(eye) : { color: "#ffffff" };

  setLayer(root.querySelector("[data-layer='gas']"), Math.min(0.55, irritant * 0.38), {
    background: `radial-gradient(ellipse at center, transparent 22%, ${haze.color} 115%)`,
  });
  // A full-screen backdrop blur is the one expensive layer here, so school machines get the vignette only.
  const ceiling = lab.prefs.tier === "low" ? 0 : calm ? 1.6 : 3.4;
  const blur = Math.min(ceiling, Math.max(0, irritant - 0.45) * 3.4);
  setLayer(root.querySelector("[data-layer='blur']"), blur > 0.05 ? 1 : 0, {
    backdropFilter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none",
  });
  setLayer(root.querySelector("[data-layer='heat']"), Math.min(0.6, exposure.heat * 0.7));
  setLayer(root.querySelector("[data-layer='flash']"), calm ? Math.min(0.45, exposure.flash * 0.5) : exposure.flash);
  setLayer(root.querySelector("[data-layer='ring']"), Math.min(0.75, exposure.ringing));
  setLayer(root.querySelector("[data-layer='alarm']"), alarm.active ? 1 : 0);

  const banner = root.querySelector("[data-layer='banner']");
  const label = root.querySelector("[data-text='banner']");
  const text = alarm.active ? ALARM_TEXT[alarm.reason] ?? ALARM_TEXT.gas : "";
  if (label && label.textContent !== text) label.textContent = text;
  const caption = root.querySelector("[data-layer='caption']");
  const message = alarm.active ? "" : gasMessage(irritant, exposure.species);
  if (caption && caption.textContent !== message) caption.textContent = message;
  setLayer(caption, message ? 1 : 0);
  setLayer(banner, text ? 1 : 0);
};

// What the room's air, fires and bangs do to the player's own view.
const HazardOverlay = ({ lab }) => {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const timer = setInterval(() => paint(root, lab), TICK_MS);
    return () => clearInterval(timer);
  }, [lab]);

  return (
    <div ref={rootRef} aria-hidden className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <div data-layer="blur" className="absolute inset-0 opacity-0 transition-opacity duration-200" />
      <div data-layer="gas" className="absolute inset-0 opacity-0 mix-blend-multiply transition-opacity duration-200" />
      <div
        data-layer="heat"
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{ background: "radial-gradient(ellipse at 50% 120%, rgba(255,138,46,0.75) 0%, transparent 55%)" }}
      />
      <div
        data-layer="ring"
        className="absolute inset-0 opacity-0 transition-opacity duration-500"
        style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(8,10,14,0.92) 100%)" }}
      />
      <div data-layer="flash" className="absolute inset-0 bg-white opacity-0" />
      {/* The pulse lives on an inner element: a CSS animation would override the opacity written above. */}
      <div data-layer="alarm" className="absolute inset-0 opacity-0 transition-opacity duration-300">
        <div className="absolute inset-0 animate-pulse" style={{ boxShadow: "inset 0 0 90px 10px rgba(220,38,38,0.4)" }} />
      </div>
      <div data-layer="banner" className="absolute right-4 top-4 flex justify-end opacity-0 transition-opacity duration-200">
        <span data-text="banner" className="animate-pulse rounded-full bg-red-700/90 px-4 py-1.5 text-sm font-bold text-white shadow-lg" />
      </div>
      <div className="absolute inset-x-0 bottom-28 flex justify-center px-6">
        <span data-layer="caption" className="rounded-full bg-black/65 px-4 py-1.5 text-sm font-medium text-white opacity-0" />
      </div>
    </div>
  );
};

export default HazardOverlay;
