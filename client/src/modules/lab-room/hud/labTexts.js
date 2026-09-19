import { REACTION_INFO } from "../chemistry/reactionInfo";

// Warning texts ship with the reaction rules; until they exist the HUD shows a generic safety line.
const WARNINGS = Object.values(import.meta.glob("../chemistry/warningInfo.js", { eager: true }))[0]?.WARNING_INFO ?? {};

const FALLBACK_WARNING = { title: "Xavfsizlik", text: "Ehtiyot bo'ling: bu tajriba xavfli.", danger: "yuqori" };

export const reactionInfo = (id) => REACTION_INFO[id] ?? null;
export const warningInfo = (id) => WARNINGS[id] ?? FALLBACK_WARNING;

export const DANGER_STYLE = {
  past: { label: "Xavf: past", tone: "emerald" },
  "o'rta": { label: "Xavf: o'rta", tone: "amber" },
  yuqori: { label: "Xavf: yuqori", tone: "red" },
};

export const MONITOR_TEXT = {
  title: "Laboratoriya kompyuteri",
  empty: "Hozircha reaksiya bo'lmadi. Moddalarni aralashtirib ko'ring — natija shu yerda chiqadi.",
  equation: "Tenglama",
  type: "Reaksiya turi",
  observation: "Nima bo'ldi",
  safety: "Xavfsizlik",
  history: "Oxirgi reaksiyalar",
  close: "Yopish",
  table: (n) => `Jadval № ${n}`,
  hint: "Batafsil — laboratoriya kompyuterida",
};
