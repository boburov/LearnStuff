export const TITLE = "Kimyo laboratoriyasi";
export const SUBTITLE =
  "Haqiqiy laboratoriya xonasida yuring, jihozlarni yaqindan ko'ring va tajribalar o'tkazing.";
export const BACK_LABEL = "Kimyo";
export const BACK_TO = "/chemistry";

export const CONTROLS = [
  { keys: ["W", "A", "S", "D"], label: "Yurish" },
  { keys: ["Shift"], label: "Yugurish" },
  { keys: ["Sichqoncha"], label: "Atrofga qarash" },
  { keys: ["Chap tugma"], label: "Olish, qo'yish, ishlatish" },
  { keys: ["Chap tugma (bosib turing)"], label: "Quyish, qizdirish, aralashtirish" },
  { keys: ["G"], label: "Qo'ldagini tashlash" },
  { keys: ["1–5"], label: "Qo'ldagi narsani tanlash" },
  { keys: ["E"], label: "Moddalar shkafi" },
  { keys: ["Esc"], label: "Menyu" },
];

export const CABINET = {
  title: "Kimyoviy reaktivlar shkafi",
  stock: (reagents, tools) => `${reagents} ta reaktiv · ${tools} ta jihoz`,
  results: "Qidiruv natijalari",
  search: "Qidirish...",
  close: "Yopish",
  empty: "Hech narsa topilmadi",
  hint: "yopish · bosing: qo'lga olish · sudrang: qo'l paneliga yoki stolga qo'yish",
  dropHere: "Shu yerga qo'yish",
  returnHere: "Shkafga qaytarish",
  slotTaken: "Bu joy band",
};

export const QUALITY_OPTIONS = [
  { id: "high", label: "Yuqori", hint: "Kuchli kompyuterlar uchun" },
  { id: "low", label: "Past", hint: "Maktab kompyuterlari uchun" },
];

export const TEXT = {
  enter: "Kirish",
  loading: "Laboratoriya yuklanmoqda",
  quality: "Grafika sifati",
  recommended: "tavsiya",
  controls: "Boshqaruv",
  pauseTitle: "Pauza",
  resume: "Davom etish",
  qualityMenu: "Sifat",
  reset: "Laboratoriyani tiklash",
  resetDone: "Laboratoriya boshlang'ich holatga qaytdi",
  exit: "Chiqish",
  back: "Orqaga",
  sensitivity: "Sichqoncha sezgirligi",
  volume: "Ovoz balandligi",
  volumeOff: "o'chiq",
  showFps: "Kadr tezligini ko'rsatish",
  reduceMotion: "Miltillash va silkinishni kamaytirish",
  lockHint: "Davom etish uchun ekranni bosing",
  dragHint: "Atrofga qarash uchun sichqonchani bosib turib torting · Esc - menyu",
  fpsUnit: "kadr/s",
  placeholder: "Xona modeli hali tayyor emas - vaqtinchalik xona ko'rsatilmoqda",
};

export const DEVICE_NOTICE = {
  touch: {
    title: "Bu laboratoriya kompyuterda ishlaydi",
    text: "Yurish va tajriba uchun klaviatura va sichqoncha kerak. Laboratoriyani kompyuterda oching; telefonda fanlar va mavzularni ko'rishingiz mumkin.",
  },
  webgl: {
    title: "Brauzeringiz 3D grafikani qo'llab-quvvatlamaydi",
    text: "WebGL 2 qo'llab-quvvatlanadigan brauzer va qurilmada qayta urinib ko'ring.",
  },
  back: "Kimyo bo'limiga qaytish",
};
