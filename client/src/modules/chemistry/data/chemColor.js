// Tiny hex-colour helpers for blending poured substances into one liquid colour.
// Mixing happens in plain sRGB - not physically accurate, but reads naturally.

const FALLBACK = "#dfe9f2";

export const hexToRgb = (hex) => {
  let h = String(hex).replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const int = parseInt(h, 16);
  if (h.length !== 6 || Number.isNaN(int)) return { r: 136, g: 136, b: 136 };
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};

export const rgbToHex = ({ r, g, b }) => {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const hex = (n) => clamp(n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
};

// Weighted average of several colours (each entry { color, weight }).
export const blendColors = (parts) => {
  const total = parts.reduce((sum, p) => sum + Math.max(0, p.weight), 0);
  if (total <= 0) return FALLBACK;
  const acc = parts.reduce(
    (a, p) => {
      const w = Math.max(0, p.weight);
      const { r, g, b } = hexToRgb(p.color);
      return { r: a.r + r * w, g: a.g + g * w, b: a.b + b * w };
    },
    { r: 0, g: 0, b: 0 },
  );
  return rgbToHex({ r: acc.r / total, g: acc.g / total, b: acc.b / total });
};
