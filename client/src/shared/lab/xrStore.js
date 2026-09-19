// Butun ilova bo'ylab yagona WebXR do'koni: VR sessiyani bosh sahifadagi
// tugmadan boshlab, keyin ochiladigan Canvas (masalan, laboratoriya) ichida
// render qilish uchun. Bitta sessiya, hamma joyda bir xil store.
import { createXRStore } from "@react-three/xr";

// Ichki Quest emulyatori faqat ?xremu bilan yoqiladi. Aks holda kompyuterda
// "VR" tugmasi soxta emulyator o'rniga "walk" (WASD) rejimiga tushadi, haqiqiy
// shlemda esa brauzer WebXR'ni o'zi ta'minlaydi.
const useEmulator =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).has("xremu");

export const xrStore = createXRStore({
  // local-floor: koordinata boshi - foydalanuvchining oyog'i; ~1.6m bo'yli
  // turgan ko'z stenddagi probirkani ramkaga oladi (XROrigin Y bilan moslanadi).
  originReferenceSpace: "local-floor",
  // MUHIM: sessiyani O'ZI taklif qilib avtomatik boshlab yubormasin.
  offerSession: false,
  // Emulyator o'chirilgan (default): kompyuterda VR tugmasi bo'sh emulyator emas,
  // "walk" rejimini ochadi. Test uchun URL'ga ?xremu qo'shsangiz - emulyator yoqiladi
  // (og'ir sintetik xonasiz).
  emulate: useEmulator ? { syntheticEnvironment: false } : false,
});
