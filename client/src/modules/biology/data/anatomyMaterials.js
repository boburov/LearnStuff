// Z-Anatomy GLB models name their parts only by material (Bone, Muscles, Eye...),
// and many ship without baseColor. This map gives each material an anatomical
// color + an Uzbek label + a short description, shown in the click detail panel.
// Key = material base name (trailing ".001" etc. stripped, case-insensitive).
export const ANATOMY_MATERIALS = {
  artery: { color: "#c0392b", label: "Arteriya", desc: "Yurakdan a'zolarga kislorodga boy qonni olib boruvchi qon tomir." },
  articular_capsule: { color: "#8e7cc3", label: "Bo'g'im kapsulasi", desc: "Bo'g'imni o'rab, sinovial suyuqlikni ushlab turuvchi parda." },
  bone: { color: "#e8dcc0", label: "Suyak", desc: "Tananing tayanch skeletini tashkil etuvchi qattiq to'qima." },
  brain: { color: "#f2b6c6", label: "Bosh miya", desc: "Markaziy asab tizimining bosh qismi - fikrlash va boshqaruv markazi." },
  bronchi: { color: "#d98880", label: "Bronxlar", desc: "Traxeyadan o'pkaga havo olib boruvchi naychalar." },
  cartilage: { color: "#aed6f1", label: "Tog'ay", desc: "Bo'g'im va nafas yo'llaridagi egiluvchan biriktiruvchi to'qima." },
  cerebellum: { color: "#e8a0b8", label: "Miyacha", desc: "Harakat muvozanati va koordinatsiyasini boshqaruvchi miya bo'limi." },
  cornea: { color: "#aab7c4", label: "Shox parda", desc: "Ko'zning oldingi shaffof qavati, yorug'likni sindiradi." },
  ductus: { color: "#7dcea0", label: "Yo'l (kanal)", desc: "Suyuqlik yoki sekretni tashuvchi anatomik naycha." },
  eye: { color: "#fdfefe", label: "Ko'z", desc: "Ko'rish a'zosi - yorug'likni qabul qilib miyaga uzatadi." },
  fat: { color: "#f7dc6f", label: "Yog' to'qimasi", desc: "Energiya zaxirasi va himoya vazifasini bajaruvchi to'qima." },
  gland: { color: "#bb8fce", label: "Bez", desc: "Gormon yoki sekret ishlab chiqaruvchi a'zo." },
  intestine: { color: "#e59866", label: "Ichak", desc: "Ovqat hazm qilish va oziq moddalar so'rilishini ta'minlaydi." },
  iris: { color: "#5499c7", label: "Rangdor parda", desc: "Qorachiq o'lchamini boshqarib, ko'zga tushadigan yorug'likni rostlaydi." },
  lcr: { color: "#a9cce3", label: "Miya suyuqligi", desc: "Bosh va orqa miyani o'rab, himoya qiluvchi suyuqlik." },
  ligament: { color: "#d5dbdb", label: "Boylam", desc: "Suyaklarni o'zaro bog'lab, bo'g'imni mustahkamlovchi to'qima." },
  lung: { color: "#ec7063", label: "O'pka", desc: "Nafas olishda kislorod va karbonat angidrid almashinuvini ta'minlaydi." },
  mucosa: { color: "#f5b7b1", label: "Shilliq parda", desc: "Ichki a'zo yuzasini qoplab, namlik va himoya beruvchi qavat." },
  muscles: { color: "#c0392b", label: "Mushak", desc: "Qisqarish orqali tana harakatini ta'minlovchi to'qima." },
  muscular_ending: { color: "#2980b9", label: "Mushak tugashi", desc: "Mushakning suyakka birikadigan tugash (insertio) nuqtasi." },
  muscular_origin: { color: "#c0392b", label: "Mushak boshlanishi", desc: "Mushakning suyakka birikadigan boshlanish (origo) nuqtasi." },
  nerve: { color: "#f4d03f", label: "Nerv", desc: "Tana bo'ylab elektr signallarni uzatuvchi nerv tolasi." },
  nucleus: { color: "#9b59b6", label: "Yadro", desc: "Asab markazi yoki boshqaruv vazifasini bajaruvchi qism." },
  organ: { color: "#cd6155", label: "A'zo", desc: "Muayyan fiziologik vazifani bajaruvchi ichki a'zo." },
  peritoneum: { color: "#fadbd8", label: "Qorin pardasi", desc: "Qorin bo'shlig'i va ichki a'zolarni qoplaydigan parda." },
  suture: { color: "#d7ccc8", label: "Choklar", desc: "Kalla suyaklarini birlashtiruvchi qo'zg'almas birikma." },
  teeth: { color: "#fdf6e3", label: "Tishlar", desc: "Ovqatni maydalashga xizmat qiluvchi qattiq tuzilmalar." },
  tendon: { color: "#d5d8dc", label: "Pay", desc: "Mushakni suyakka biriktiruvchi pishiq biriktiruvchi to'qima." },
  vein: { color: "#2c3e94", label: "Vena", desc: "A'zolardan yurakka qonni qaytaruvchi qon tomir." },
  white_matter: { color: "#fae5d3", label: "Oq modda", desc: "Miya va orqa miyaning nerv tolalaridan iborat qismi." },
};

// Resolve a material name (e.g. "Cartilage.002") to its color + Uzbek label + desc.
export const resolveMaterial = (name) => {
  if (!name) return null;
  const key = name.replace(/\.\d+$/, "").toLowerCase();
  return ANATOMY_MATERIALS[key] || null;
};
