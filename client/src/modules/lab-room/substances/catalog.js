// The 30 substances (9 elements + 21 compounds). Names, descriptions and hazards await the chemistry teacher's review.
export const STATES = [
  { id: "liquid", name: "Suyuqliklar" },
  { id: "powder", name: "Kukunlar" },
  { id: "solid", name: "Qattiq moddalar" },
  { id: "gas", name: "Gazlar" },
];

// GHS pictograms shown on labels and in the cabinet menu.
export const HAZARDS = {
  flammable: "Yonuvchan",
  oxidizer: "Oksidlovchi",
  gas: "Bosim ostidagi gaz",
  corrosive: "Yemiruvchi",
  toxic: "Zaharli",
  irritant: "Zararli",
  health: "Sog'liq uchun xavfli",
  environment: "Atrof-muhit uchun xavfli",
};

const CLEAR = { color: "#0d2230", opacity: 0.08 };

const liquid = (id, name, formula, { detail = "", hazards = [], description, bottle = "clear", sizeMl = 250, fillMl = 200, look = CLEAR }) => ({
  id, name, formula, detail, hazards, description, state: "liquid",
  container: { bottle, sizeMl, fillMl, ...look },
});

const powder = (id, name, formula, { detail = "", hazards = [], description, jar = "plastic", color, grain = "fine", fill = 0.7 }) => ({
  id, name, formula, detail, hazards, description, state: "powder",
  container: { jar, color, grain, fill },
});

const solid = (id, name, formula, { detail = "", hazards = [], description, jar = "glass", color, metallic = 0, pieces, underOil = false, fill = 0.55 }) => ({
  id, name, formula, detail, hazards, description, state: "solid",
  container: { jar, color, metallic, pieces, underOil, fill },
});

// Cylinder colors follow the GOST 949-73 marking used in Uzbekistan.
const gas = (id, name, formula, { hazards = [], description, body, band = null, stencil, stencilColor, gasColor = null }) => ({
  id, name, formula, detail: "", hazards, description, state: "gas",
  container: { body, band, stencil, stencilColor, gasColor },
});

export const SUBSTANCES = [
  liquid("water", "Distillangan suv", "H₂O", {
    description: "Tozalangan suv. Eritmalar tayyorlash va idishlarni chayish uchun.",
  }),
  liquid("hcl", "Xlorid kislota", "HCl", {
    detail: "10% eritma",
    hazards: ["corrosive", "irritant"],
    description: "Rangsiz, o'tkir hidli kuchli kislota. Metallar va karbonatlar bilan reaksiyaga kirishadi.",
  }),
  liquid("h2so4", "Sulfat kislota", "H₂SO₄", {
    detail: "konsentrlangan, 96%",
    hazards: ["corrosive"],
    description: "Moysimon, og'ir kuchli kislota. Suvni tortib oladi va kuchli qiziydi.",
    look: { color: "#141a1c", opacity: 0.1, viscous: true },
  }),
  liquid("hno3", "Nitrat kislota", "HNO₃", {
    detail: "konsentrlangan, 65%",
    hazards: ["oxidizer", "corrosive"],
    bottle: "amber",
    description: "Kuchli oksidlovchi kislota. Yorug'likda sarg'ayadi, metallarni eritadi.",
    look: { color: "#3a3312", opacity: 0.14 },
  }),
  liquid("naoh", "Natriy gidroksid", "NaOH", {
    detail: "10% eritma",
    hazards: ["corrosive"],
    bottle: "plastic",
    description: "Kuchli ishqor. Teri va ko'zni kuydiradi, kislotalarni neytrallaydi.",
  }),
  liquid("nh3", "Ammiak eritmasi", "NH₃·H₂O", {
    detail: "novshadil spirti, 10%",
    hazards: ["corrosive", "irritant", "environment"],
    description: "O'tkir hidli ishqoriy eritma. Mis tuzlari bilan to'q ko'k rang beradi.",
  }),
  liquid("limewater", "Ohak suvi", "Ca(OH)₂", {
    detail: "to'yingan eritma",
    hazards: ["irritant"],
    description: "Kalsiy gidroksidning tiniq eritmasi. Uglerod(IV) oksid bilan loyqalanadi.",
  }),
  liquid("h2o2", "Vodorod peroksid", "H₂O₂", {
    detail: "30% eritma",
    hazards: ["corrosive", "irritant"],
    bottle: "amber",
    description: "Kuchli oksidlovchi. Katalizator bilan tez parchalanib, kislorod ajratadi.",
  }),
  liquid("ethanol", "Etil spirti", "C₂H₅OH", {
    detail: "96%",
    hazards: ["flammable", "irritant"],
    description: "Rangsiz, oson alangalanadigan suyuqlik. Ko'k alanga bilan yonadi.",
  }),
  liquid("glycerin", "Glitserin", "C₃H₅(OH)₃", {
    description: "Quyuq, shirin ta'mli suyuqlik. Kaliy permanganat bilan o'z-o'zidan yonadi.",
    look: { color: "#161c1e", opacity: 0.12, viscous: true },
  }),
  liquid("phenolphthalein", "Fenolftalein", "C₂₀H₁₄O₄", {
    detail: "indikator, 1% spirtli eritma",
    hazards: ["flammable", "health"],
    sizeMl: 100,
    fillMl: 80,
    description: "Indikator: kislotali va neytral muhitda rangsiz, ishqoriy muhitda pushti.",
  }),
  liquid("cuso4", "Mis(II) sulfat", "CuSO₄", {
    detail: "0,5 M eritma",
    hazards: ["irritant", "environment"],
    description: "Ko'k rangli eritma. Ishqorlar bilan ko'k cho'kma hosil qiladi.",
    look: { color: "#1f6fd1", opacity: 0.5 },
  }),
  liquid("agno3", "Kumush nitrat", "AgNO₃", {
    detail: "0,1 M eritma",
    hazards: ["corrosive", "environment"],
    bottle: "amber",
    description: "Rangsiz eritma. Xloridlar bilan oq, yodidlar bilan sariq cho'kma beradi.",
  }),
  liquid("fecl3", "Temir(III) xlorid", "FeCl₃", {
    detail: "0,5 M eritma",
    hazards: ["corrosive", "irritant"],
    description: "Sariq-qo'ng'ir eritma. Ishqorlar bilan zang rangli cho'kma hosil qiladi.",
    look: { color: "#b0620f", opacity: 0.55 },
  }),
  liquid("ki", "Kaliy yodid", "KI", {
    detail: "0,5 M eritma",
    bottle: "amber",
    description: "Rangsiz eritma. Oksidlovchilar ta'sirida qo'ng'ir yod ajraladi.",
  }),

  powder("nahco3", "Natriy gidrokarbonat", "NaHCO₃", {
    detail: "ichimlik sodasi",
    color: "#f2f2ef",
    description: "Oq kukun. Kislotalar bilan ko'pirib, uglerod(IV) oksid chiqaradi.",
  }),
  powder("mno2", "Marganes(IV) oksid", "MnO₂", {
    hazards: ["irritant"],
    jar: "glass",
    color: "#1d1b1a",
    description: "Qora kukun. Vodorod peroksid parchalanishini tezlashtiradigan katalizator.",
  }),
  powder("kmno4", "Kaliy permanganat", "KMnO₄", {
    hazards: ["oxidizer", "irritant", "environment"],
    jar: "amber",
    color: "#2a0f35",
    grain: "crystal",
    description: "To'q binafsha kristallar. Kuchli oksidlovchi, suvda binafsha rang beradi.",
  }),
  powder("sulfur", "Oltingugurt", "S", {
    hazards: ["irritant"],
    color: "#e8d23a",
    description: "Sariq kukun. Ko'k alanga bilan yonib, bo'g'uvchi gaz hosil qiladi.",
  }),
  powder("iron-filings", "Temir qipig'i", "Fe", {
    color: "#4a4a4c",
    grain: "metal",
    description: "Kulrang metall qipig'i. Mis tuzlaridan misni siqib chiqaradi.",
  }),
  powder("sugar", "Shakar", "C₁₂H₂₂O₁₁", {
    detail: "saxaroza",
    jar: "glass",
    color: "#f7f6f2",
    grain: "crystal",
    description: "Oq kristallar. Konsentrlangan sulfat kislota bilan ko'mirga aylanadi.",
  }),

  solid("sodium", "Natriy", "Na", {
    detail: "moy ostida",
    hazards: ["flammable", "corrosive"],
    color: "#b9bcc0",
    metallic: 0.6,
    pieces: "chunks",
    underOil: true,
    description: "Yumshoq ishqoriy metall. Havo va suvdan saqlash uchun moy ostida turadi.",
  }),
  solid("magnesium", "Magniy", "Mg", {
    detail: "lenta",
    hazards: ["flammable"],
    color: "#c8cacd",
    metallic: 0.9,
    pieces: "ribbon",
    description: "Kumushrang metall lenta. Ko'zni qamashtiruvchi oq alanga bilan yonadi.",
  }),
  solid("zinc", "Rux", "Zn", {
    detail: "granulalar",
    hazards: ["environment"],
    jar: "plastic",
    color: "#9a9ea3",
    metallic: 0.8,
    pieces: "granules",
    description: "Kulrang metall donachalari. Kislotalar bilan vodorod ajratadi.",
  }),
  solid("copper", "Mis", "Cu", {
    detail: "sim",
    color: "#b8703f",
    metallic: 1,
    pieces: "wire",
    description: "Qizg'ish metall sim. Nitrat kislota bilan qo'ng'ir gaz ajratadi.",
  }),
  solid("marble", "Marmar", "CaCO₃", {
    detail: "bo'laklar",
    jar: "plastic",
    color: "#e6e2da",
    pieces: "chunks",
    description: "Kalsiy karbonat bo'laklari. Kislotalar bilan ko'pirib, gaz chiqaradi.",
  }),

  gas("oxygen", "Kislorod", "O₂", {
    hazards: ["oxidizer", "gas"],
    body: "#4aa3df",
    stencil: "KISLOROD",
    stencilColor: "#101010",
    description: "Rangsiz gaz. Yonishni kuchaytiradi.",
  }),
  gas("hydrogen", "Vodorod", "H₂", {
    hazards: ["flammable", "gas"],
    body: "#1f5c32",
    stencil: "VODOROD",
    stencilColor: "#c62828",
    description: "Eng yengil, rangsiz gaz. Havo bilan aralashmasi portlaydi.",
  }),
  gas("co2", "Uglerod(IV) oksid", "CO₂", {
    hazards: ["gas"],
    body: "#1b1b1b",
    stencil: "KARBONAT ANGIDRID",
    stencilColor: "#f0c419",
    description: "Rangsiz, havodan og'ir gaz. Ohak suvini loyqalantiradi, yonishni o'chiradi.",
  }),
  gas("chlorine", "Xlor", "Cl₂", {
    hazards: ["oxidizer", "gas", "toxic", "environment"],
    body: "#6b705c",
    band: "#2e7d32",
    stencil: "XLOR",
    stencilColor: "#f2f2f2",
    gasColor: "#c9d94a",
    description: "Sariq-yashil zaharli gaz. O'tkir hidli, nafas yo'llarini kuydiradi.",
  }),
];

export const SUBSTANCE_BY_ID = Object.fromEntries(SUBSTANCES.map((s) => [s.id, s]));
