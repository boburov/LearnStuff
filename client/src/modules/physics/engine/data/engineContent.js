// Uzbek UI content for the 4-stroke engine topic; ids match STROKES / GAS_COLORS keys.

export const TITLE = "Ichki yonuv dvigateli";

export const DESCRIPTION =
  "To'rt taktli dvigatel ichida nima bo'layotganini ko'ring: taktni bosing yoki dvigatelni ishga tushiring.";

export const INTRO =
  "Silindr ichida yonilg'i yonadi: uning kimyoviy energiyasi avval issiqlikka, so'ng porshen va tirsakli valni harakatlantiradigan mexanik ishga aylanadi. Bu 9-sinf fizikasida o'rganiladigan to'rt taktli ichki yonuv dvigateli.";

export const STROKE_INFO = [
  {
    id: "intake",
    number: 1,
    name: "So'rish",
    short: "Aralashma silindrga kiradi",
    piston: "pastga",
    intakeValve: "ochiq",
    exhaustValve: "yopiq",
    color: "#2563eb",
    text: "Porshen yuqori chekka nuqtadan pastki chekka nuqtaga qarab pastga tushadi. Kiritish klapani ochiq, silindr ichida bosim pasayadi va yonilg'i-havo aralashmasi silindrga so'riladi.",
  },
  {
    id: "compression",
    number: 2,
    name: "Siqish",
    short: "Aralashma siqiladi",
    piston: "yuqoriga",
    intakeValve: "yopiq",
    exhaustValve: "yopiq",
    color: "#d97706",
    text: "Ikkala klapan ham yopiq. Porshen yuqoriga ko'tarilib aralashmani siqadi, shuning uchun uning bosimi va harorati oshadi. Takt oxirida sham uchqun chiqaradi.",
  },
  {
    id: "power",
    number: 3,
    name: "Ish yo'li",
    short: "Gaz porshenni itaradi",
    piston: "pastga",
    intakeValve: "yopiq",
    exhaustValve: "yopiq",
    color: "#dc2626",
    text: "Uchqundan aralashma yonib ketadi va gaz bosimi keskin oshadi. Kengayayotgan issiq gaz porshenni kuch bilan pastga itaradi. Foydali ish faqat shu taktda bajariladi, qolgan uch taktda valni maxovik aylantirib turadi.",
  },
  {
    id: "exhaust",
    number: 4,
    name: "Chiqarish",
    short: "Ishlatilgan gazlar chiqadi",
    piston: "yuqoriga",
    intakeValve: "yopiq",
    exhaustValve: "ochiq",
    color: "#64748b",
    text: "Chiqarish klapani ochiq. Porshen yuqoriga ko'tarilib, ishlatilgan gazlarni chiqarish quvuriga haydab chiqaradi. Shundan keyin sikl yana so'rish taktidan boshlanadi.",
  },
];

export const PREDICT = {
  question: "Bashorat qiling: qaysi taktda gaz porshenni itarib, foydali ish bajariladi?",
  options: STROKE_INFO.map((s) => ({ id: s.id, label: `${s.number}-takt` })),
  correct: "power",
  feedback: {
    correct:
      "To'g'ri! 3-takt - ish yo'li: yonayotgan gaz kengayib, porshenni pastga itaradi. To'rt taktdan faqat shunisida dvigatel foydali ish bajaradi.",
    wrong:
      "Noto'g'ri. Dvigatelni sekin aylantirib kuzating: qaysi taktda silindr ichi olovrang bo'lib, gaz porshenni pastga itaryapti?",
  },
  showPower: "Ish yo'li taktini ko'rsatish",
  retry: "Qayta urinish",
};

export const GAS_LEGEND = [
  { id: "mixture", label: "Yonilg'i-havo aralashmasi", hint: "So'rish va siqish" },
  { id: "flame", label: "Yonayotgan gaz", hint: "Ish yo'li" },
  { id: "exhaust", label: "Ishlatilgan gazlar", hint: "Chiqarish" },
];

export const SPEED_PRESETS = [
  { id: "slow", name: "Sekin", rpm: 20 },
  { id: "medium", name: "O'rta", rpm: 60 },
  { id: "fast", name: "Tez", rpm: 300 },
];

// Above this speed a stroke lasts < 1/3 s, too fast to read its name.
export const FAST_RPM = 90;

export const valveState = (open) => (open ? "ochiq" : "yopiq");

// Lift is a smooth bump, so near stroke ends a textbook-open valve is still opening or already shut.
export const describeValve = (open, textbookState, progress, live = true) => {
  // A stopped engine is being explained, so match the highlighted stroke card.
  if (!live) return textbookState;
  if (open) return "ochiq";
  if (textbookState !== "ochiq") return "yopiq";
  return progress < 0.5 ? "ochilmoqda" : "yopildi";
};
