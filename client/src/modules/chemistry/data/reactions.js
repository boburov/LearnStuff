// Offline reaction classifier for the lab bench. A poured mixture is reduced to
// the set of elemental symbols present; the first matching rule fires its
// effect (headline + visual kind). No external service, no sound.

// Visual effect families and their banner styles (Tailwind classes).
export const REACTION_STYLES = {
  explosion: "border-orange-300 bg-orange-50/95 text-orange-700",
  flash: "border-blue-300 bg-blue-50/95 text-blue-700",
  smoke: "border-slate-300 bg-slate-100/95 text-slate-700",
  fizz: "border-cyan-300 bg-cyan-50/95 text-cyan-700",
};

// status -> visual kind + Uzbek headline + one-line explanation.
const STATUS_INFO = {
  portlash: { kind: "explosion", title: "Portlash!", detail: "Kuchli portlovchi reaksiya." },
  yonish: { kind: "explosion", title: "Yonish!", detail: "Modda alangalanib yonadi." },
  tutun: { kind: "smoke", title: "Tutun!", detail: "Reaksiyadan tutun ko'tariladi." },
  qaynash: { kind: "fizz", title: "Qaynash!", detail: "Aralashma qaynay boshladi." },
  pufaklanish: { kind: "fizz", title: "Pufaklanish", detail: "Gaz pufakchalari ajraladi." },
  rang_ozgarishi: { kind: "flash", title: "Rang o'zgardi", detail: "Eritma rangi o'zgardi." },
  chokma: { kind: "flash", title: "Cho'kma", detail: "Cho'kma hosil bo'ldi." },
  gaz_ajralishi: { kind: "smoke", title: "Gaz ajraldi", detail: "Reaksiyada gaz chiqdi." },
  issiqlik: { kind: "flash", title: "Issiqlik ajraldi", detail: "Ekzotermik reaksiya." },
  tuman: { kind: "smoke", title: "Tuman!", detail: "Quruq muz suvda bug'lanib quyuq tuman hosil qiladi." },
  neytral: { kind: null, title: "Reaksiya yo'q", detail: "Sezilarli o'zgarish yo'q." },
};

export const effectForStatus = (status) => ({ status, ...STATUS_INFO[status] });

// First matching rule wins, so the most dramatic reactions are listed first.
const RULES = [
  { needs: ["H", "O"], status: "portlash" },
  { needs: ["K", "O"], status: "portlash" },
  { needs: ["Na", "O"], status: "yonish" },
  { needs: ["Na", "Cl"], status: "yonish" },
  { needs: ["S", "O"], status: "tutun" },
  { needs: ["C", "O"], status: "tutun" },
  { needs: ["Fe", "O"], status: "rang_ozgarishi" },
  { needs: ["Mn", "O"], status: "gaz_ajralishi" },
];

// A status for a set of elemental symbols, or null if nothing applies.
export const classifyReaction = (elementSymbols) => {
  for (const rule of RULES) {
    if (rule.needs.every((sym) => elementSymbols.has(sym))) return rule.status;
  }
  return null;
};

// Reactions between whole reagents (by substance id), e.g. water + dry ice ->
// thick fog. These take priority over the element rules.
const COMBO_RULES = [{ needs: ["cmp-h2o", "cmp-dryice"], status: "tuman" }];

// A status for a poured list based on which named reagents are present.
export const detectCombo = (poured) => {
  const ids = new Set(poured.map((s) => s.id));
  for (const rule of COMBO_RULES) {
    if (rule.needs.every((id) => ids.has(id))) return rule.status;
  }
  return null;
};

// True while the contents are actively producing fog (water + dry ice).
export const isFogging = (poured) => detectCombo(poured) === "tuman";

// Representative liquid colours for recognised products, keyed by molecule id,
// so a correct reaction reads right (water clear-blue, not pink).
export const PRODUCT_COLORS = {
  water: "#cfeefb",
  h2o2: "#e9f6ff",
  nacl: "#f1f5fb",
  ammonia: "#eef7f0",
  ozone: "#dbeeff",
  oxygen: "#e6f2fb",
  hydrogen: "#eef4fb",
  nitrogen: "#eef1f6",
  co2: "#eef2f5",
  so2: "#f3f1dd",
  co: "#eef2f5",
};
