// M = 1 geometric units: the horizon sits at r = 2, the photon sphere at r = 3
// and the innermost stable orbit at r = 6. Distances shown to the learner are
// divided by the Schwarzschild radius, which is the number that means something.
export const RS = 2;
export const PHOTON_R = 3;
export const ISCO_R = 6;

export const TITLE = "Qora tuynuk";
export const DESCRIPTION =
  "Shvarcshild qora tuynugi: nur yo'llari real geodezik bo'yicha hisoblanadi.";

export const VIEWS = [
  { id: "edge", name: "Qirradan", position: [0, 3.9, 27] },
  { id: "tilt", name: "Qiya", position: [14, 12, 20] },
  { id: "top", name: "Tepadan", position: [0, 30, 0.8] },
  { id: "near", name: "Yaqindan", position: [0, 2.2, 11] },
];

export const QUALITIES = [
  { id: "low", name: "Past", steps: 130 },
  { id: "medium", name: "O'rta", steps: 220 },
  { id: "high", name: "Yuqori", steps: 330 },
  { id: "ultra", name: "Ultra", steps: 460 },
];

export const DEFAULTS = {
  view: "edge",
  quality: "medium",
  brightness: 0.85,
  inner: 6,
  outer: 18,
  turbulence: 0.6,
  speed: 1,
  opacity: 0.9,
  exposure: 1.1,
  lensing: true,
  doppler: true,
  markers: false,
  spinning: true,
};

// Short, self-contained explanations; each one names what to look for on screen.
export const FACTS = [
  {
    id: "horizon",
    title: "Hodisalar ufqi",
    text:
      "Markazdagi qop-qora doira - hodisalar ufqi. Uning radiusi Shvarcshild radiusi rs ga teng. Bu yerdan ichkariga tushgan nur hech qachon qaytib chiqa olmaydi, shuning uchun u qora ko'rinadi - u jism emas, chegara.",
  },
  {
    id: "shadow",
    title: "Soya ufqdan kattaroq",
    text:
      "Ekrandagi qora doira ufqdan ~2.6 barobar katta: uning radiusi 2.6 rs atrofida. Sabab - ufq yonidan o'tayotgan nurlar ham ichkariga tortilib ketadi, shuning uchun biz ufqning o'zini emas, uning soyasini ko'ramiz.",
  },
  {
    id: "lensing",
    title: "Gravitatsion linza",
    text:
      "Disk qora tuynukning orqasida yotadi, lekin biz uning yuqori qismini tepada, pastki qismini esa pastda halqa bo'lib ko'ramiz. Og'irlik nurni egib, diskning orqa tomonini tepaga \"ko'taradi\". Linzani o'chirib ko'ring - disk oddiy ellipsga aylanadi.",
  },
  {
    id: "photon",
    title: "Foton sferasi",
    text:
      "1.5 rs (r = 3M) da nur qora tuynuk atrofida aylana bo'ylab yura oladi. Soya chetidagi ingichka yorqin halqa - o'sha yerda bir necha marta aylanib chiqqan nurlar. Belgilarni yoqsangiz, u yashil halqa bilan ko'rsatiladi.",
  },
  {
    id: "isco",
    title: "ISCO - oxirgi barqaror orbita",
    text:
      "3 rs (r = 6M) dan ichkarida barqaror doiraviy orbita yo'q: modda spirally ufqqa tushadi. Shuning uchun akkretsiya diski aynan shu yerda tugaydi. Belgilarda u ko'k halqa.",
  },
  {
    id: "doppler",
    title: "Doppler nurlanishi",
    text:
      "Disk ichki qismi yorug'lik tezligining yarmiga yaqin tezlikda aylanadi. Bizga tomon kelayotgan tomon yorqinroq va ko'kroq, uzoqlashayotgani esa xiraroq va qizilroq bo'ladi. Dopplerni o'chirib-yoqib solishtiring.",
  },
  {
    id: "time",
    title: "Vaqt sekinlashuvi",
    text:
      "Ufqqa qanchalik yaqin bo'lsangiz, sizning soatingiz uzoqdagi kuzatuvchinikiga nisbatan shunchalik sekin yuradi. Panel tepasida kameraning masofasi va shu masofadagi vaqt sekinlashuvi ko'rsatilgan.",
  },
];

export const VR_HINT = {
  headset: "Kontroller bilan sahnani aylantiring; chapdagi paneldan disk va effektlarni boshqaring",
  phone: "Chapdagi paneldagi tugmaga qarang va ekranga bosing (pultda - A)",
};
