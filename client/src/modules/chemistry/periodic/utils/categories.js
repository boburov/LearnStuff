// Element categories: Uzbek label + Zperiod cell colors [background, text].
// Keys match the `category` field in lab/data/elements.js.

export const CATEGORY_META = {
  "Alkali Metal": { label: "Ishqoriy metall", bg: "#ffcccc", text: "#5d2e2e" },
  "Alkaline Earth Metal": { label: "Ishqoriy-yer metall", bg: "#ffe5cc", text: "#5d402e" },
  "Transition Metal": { label: "O'tuvchi metall", bg: "#fff2cc", text: "#5d522e" },
  "Post-transition Metal": { label: "Post-o'tuvchi metall", bg: "#d9e2f3", text: "#2e3a5d" },
  Metalloid: { label: "Metalloid", bg: "#d1e7dd", text: "#2e5d4b" },
  "Other nonmetal": { label: "Nometall", bg: "#e2f0d9", text: "#3a5d2e" },
  Halogen: { label: "Galogen", bg: "#ffffcc", text: "#5d5d2e" },
  "Noble Gas": { label: "Nodir gaz", bg: "#e0ccff", text: "#4b2e5d" },
  Lanthanide: { label: "Lantanoid", bg: "#fce4d6", text: "#5d3a2e" },
  Actinide: { label: "Aktinoid", bg: "#fddddd", text: "#5d2e2e" },
  Unknown: { label: "Noma'lum", bg: "#e0e0e0", text: "#666666" },
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_META);

export const getCategoryMeta = (category) =>
  CATEGORY_META[category] || CATEGORY_META.Unknown;
