// Human anatomy GLB models. Each entry is a biology topic.
// `?url` import → Vite serves the asset; the file lives in shared/assets/models.
// UI text in Uzbek, slug/code values in English.
import myologyUrl from "@/shared/assets/models/myology.glb?url";
import angiologyUrl from "@/shared/assets/models/angiology.glb?url";
import neurologyUrl from "@/shared/assets/models/neurology.glb?url";
import arthrologyUrl from "@/shared/assets/models/arthrology.glb?url";
import splanchnologyUrl from "@/shared/assets/models/splanchnology.glb?url";
import muscularInsertionsUrl from "@/shared/assets/models/muscular_insertions.glb?url";
import skeletonUrl from "@/shared/assets/models/skeleton.glb?url";
import skullUrl from "@/shared/assets/models/skull.glb?url";
import vertebraeUrl from "@/shared/assets/models/vertebrae.glb?url";
import handUrl from "@/shared/assets/models/hand.glb?url";
import upperLimbUrl from "@/shared/assets/models/upper-limb.glb?url";
import lowerLimbUrl from "@/shared/assets/models/lower-limb.glb?url";
import digestiveSystemUrl from "@/shared/assets/models/digestive_system.glb?url";
import ecorcheUrl from "@/shared/assets/models/ecorche_-_anatomy_study.glb?url";
import diaphragmUrl from "@/shared/assets/models/human_diaphragm.glb?url";
import heartUrl from "@/shared/assets/models/human_heart_3d_model.glb?url";
import kidneyUrl from "@/shared/assets/models/human_kidney.glb?url";
import liverUrl from "@/shared/assets/models/human_liver_and_gallbladder.glb?url";
import orbitEyeUrl from "@/shared/assets/models/muscles_of_the_orbit_eye.glb?url";
import lungsUrl from "@/shared/assets/models/realistic_human_lungs.glb?url";


export const ANATOMY = [
  {
    slug: "myology",
    title: "Mushaklar tizimi",
    short: "Tana mushaklarining joylashuvini 3D da ko'ring.",
    icon: "Dumbbell",
    url: myologyUrl,
    about:
      "Mushaklar tizimi (miologiya) - tana harakatini ta'minlovchi skelet mushaklari. Ular suyaklarga birikib qisqarish orqali harakat hosil qiladi.",
  },
  {
    slug: "angiology",
    title: "Qon-tomir tizimi",
    short: "Arteriya va venalarning butun tanadagi tarmog'ini kuzating.",
    icon: "HeartPulse",
    url: angiologyUrl,
    about:
      "Qon-tomir tizimi (angiologiya) - yurak, arteriyalar, venalar va kapillyarlar. Qonni butun tanaga yetkazib, kislorod va oziq moddalarni tashiydi.",
  },
  {
    slug: "neurology",
    title: "Asab tizimi",
    short: "Bosh miya, orqa miya va nervlar tarmog'ini ko'ring.",
    icon: "Brain",
    url: neurologyUrl,
    about:
      "Asab tizimi (nevrologiya) - bosh miya, orqa miya va periferik nervlar. Tana a'zolari o'rtasida signal uzatib, harakat va sezgini boshqaradi.",
  },
  {
    slug: "arthrology",
    title: "Bo'g'imlar tizimi",
    short: "Suyaklar birlashadigan bo'g'imlarni o'rganing.",
    icon: "Bone",
    url: arthrologyUrl,
    about:
      "Bo'g'imlar tizimi (artrologiya) - suyaklarni o'zaro bog'lovchi bo'g'imlar. Ular tananing egiluvchanligi va harakat doirasini belgilaydi.",
  },
  {
    slug: "splanchnology",
    title: "Ichki a'zolar",
    short: "Ko'krak va qorin bo'shlig'idagi ichki a'zolarni ko'ring.",
    icon: "Heart",
    url: splanchnologyUrl,
    about:
      "Ichki a'zolar (splanxnologiya) - yurak, o'pka, jigar, oshqozon, ichaklar va boshqa a'zolar. Nafas olish, hazm qilish va ayirish jarayonlarini bajaradi.",
  },
  {
    slug: "muscular-insertions",
    title: "Mushak birikmalari",
    short: "Mushaklarning suyaklarga birikish nuqtalarini ko'ring.",
    icon: "Link",
    url: muscularInsertionsUrl,
    about:
      "Mushak birikmalari - mushaklarning suyaklarga boshlanish (origo) va tugash (insertio) nuqtalari. Bu birikmalar mushak qisqarganda qaysi suyak harakatlanishini belgilaydi.",
  },
  {
    slug: "skeleton",
    title: "Skelet",
    short: "To'liq suyak skeletini har tomondan ko'ring.",
    icon: "Bone",
    url: skeletonUrl,
    keepMaterial: true,
    about:
      "Skelet - tanadagi barcha suyaklar majmuasi. U tanaga tayanch beradi, ichki a'zolarni himoya qiladi va mushaklar bilan birga harakatni ta'minlaydi.",
  },
  {
    slug: "skull",
    title: "Bosh suyagi",
    short: "Bosh suyagi bo'laklarini rangli ajratib ko'ring.",
    icon: "Skull",
    url: skullUrl,
    keepMaterial: true,
    about:
      "Bosh suyagi (kranium) - miya va sezgi a'zolarini himoya qiluvchi suyaklar. Har bir suyak alohida rangda ajratilgan: peshona, tepa, chakka, ensa va yuz suyaklari.",
  },
  {
    slug: "vertebrae",
    title: "Umurtqalar",
    short: "Umurtqa suyagining tuzilishini yaqindan o'rganing.",
    icon: "Bone",
    url: vertebraeUrl,
    keepMaterial: true,
    about:
      "Umurtqalar - umurtqa pog'onasini tashkil etuvchi suyaklar. Har biri tana, yoy va o'siqlardan iborat bo'lib, orqa miyani himoya qiladi.",
  },
  {
    slug: "hand",
    title: "Qo'l panjasi",
    short: "Panja suyaklari va bo'g'imlarini ko'ring.",
    icon: "Hand",
    url: handUrl,
    keepMaterial: true,
    about:
      "Qo'l panjasi - bilak-kaft (karpal), kaft (metakarpal) va barmoq (falanga) suyaklaridan iborat. Inson eng nozik harakatlarni shu tuzilma orqali bajaradi.",
  },
  {
    slug: "upper-limb",
    title: "Yuqori oyoq-qo'l",
    short: "Yelka, bilak va panja suyaklarini birga ko'ring.",
    icon: "Dumbbell",
    url: upperLimbUrl,
    keepMaterial: true,
    about:
      "Yuqori oyoq-qo'l - yelka (yelka suyagi), bilak (bilak va tirsak suyaklari) va panja suyaklari. Keng harakat doirasi bilan ajralib turadi.",
  },
  {
    slug: "lower-limb",
    title: "Pastki oyoq-qo'l",
    short: "Son, boldir va oyoq panjasi suyaklarini ko'ring.",
    icon: "Footprints",
    url: lowerLimbUrl,
    keepMaterial: true,
    about:
      "Pastki oyoq-qo'l - son suyagi, tizza qopqog'i, boldir suyaklari va oyoq panjasi. Tana og'irligini ko'tarib, yurish va turishni ta'minlaydi.",
  },
  {
    slug: "digestive-system",
    title: "Hazm qilish tizimi",
    short: "Hazm qilish tizimi organlarini ko'ring.",
    icon: "Utensils",
    url: digestiveSystemUrl,
    keepMaterial: true,
    about:
      "Hazm qilish tizimi - ozuqa moddalarini parchalab, energiyani o'zlashtirish uchun xizmat qiladi. Oshqozon va ichaklardan iborat.",
  },
  {
    slug: "ecorche",
    title: "Ekorche (Anatomiya)",
    short: "Mushaklar tana yuzasi anatomiyasini batafsil o'rganing.",
    icon: "User",
    url: ecorcheUrl,
    keepMaterial: true,
    about:
      "Ekorche - terisiz holatda mushaklarni va ularning anatomik tuzilishini tasvirlovchi model. Inson anatomiyasini chuqur o'rganish uchun.",
  },
  {
    slug: "diaphragm",
    title: "Diafragma",
    short: "Nafas olishda qatnashadigan asosiy mushakni ko'ring.",
    icon: "Wind",
    url: diaphragmUrl,
    keepMaterial: true,
    about:
      "Diafragma - ko'krak va qorin bo'shliqlarini ajratib turuvchi, nafas olish jarayonida qatnashadigan asosiy gumbazsimon mushak.",
  },
  {
    slug: "heart",
    title: "Yurak",
    short: "Inson yuragining 3D modelini yaqindan kuzating.",
    icon: "Heart",
    url: heartUrl,
    keepMaterial: true,
    about:
      "Yurak - qon aylanish tizimining markaziy organi bo'lib, tanaga qon haydash vazifasini bajaradi.",
  },
  {
    slug: "kidney",
    title: "Buyrak",
    short: "Inson buyragining tuzilishini ko'ring.",
    icon: "Droplets",
    url: kidneyUrl,
    keepMaterial: true,
    about:
      "Buyrak - qonni filtrlab keraksiz moddalarni va ortiqcha suvni siydik orqali ajratib chiqaruvchi juft a'zo.",
  },
  {
    slug: "liver-and-gallbladder",
    title: "Jigar va O't pufagi",
    short: "Jigar va o't pufagining anatomiyasini o'rganing.",
    icon: "Activity",
    url: liverUrl,
    keepMaterial: true,
    about:
      "Jigar qonni zaharli moddalardan tozalaydi, o't pufagi esa hazm qilish uchun o't suyuqligini saqlaydi.",
  },
  {
    slug: "eye-orbit-muscles",
    title: "Ko'z kosasi mushaklari",
    short: "Ko'zni harakatlantiruvchi mushaklarni ko'ring.",
    icon: "Eye",
    url: orbitEyeUrl,
    keepMaterial: true,
    about:
      "Ko'z kosasi mushaklari - ko'z soqqasini barcha yo'nalishlarda harakatlantirish imkonini beradi.",
  },
  {
    slug: "lungs",
    title: "O'pkalar",
    short: "Nafas olish tizimining asosiy organi.",
    icon: "Wind",
    url: lungsUrl,
    keepMaterial: true,
    about:
      "O'pkalar - nafas olish tizimining markaziy organi bo'lib, qonni kislorod bilan boyitib, karbonat angidridni chiqarib yuboradi.",
  },
];

export const getAnatomy = (slug) =>
  ANATOMY.find((a) => a.slug === slug) || null;
