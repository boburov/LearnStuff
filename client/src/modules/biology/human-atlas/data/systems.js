// Human Atlas (BodyParts3D 4.0, CC BY 4.0) ma'lumot qatlami: 15 tizim, preset
// to'plamlar va asosiy a'zolar izohi. UI matni o'zbekcha, id/rang inglizcha.
export const SYSTEMS = [
  { id: "skeletal", name: "Skelet", color: "#e2d9ba", description: "Suyaklar tananing tayanch karkasini hosil qiladi, a'zolarni himoya qiladi va mushaklar uchun birikish nuqtasi bo'ladi. Suyak ichki to'qimasi minerallarni saqlaydi va qon hujayralarini ishlab chiqaradi." },
  { id: "muscular", name: "Mushaklar", color: "#a85b50", description: "Skelet mushaklari birikkan joyini tortib harakat hosil qiladi. Paylar bilan birga bo'g'imlarni harakatlantiradi, gavda holatini ushlab turadi va issiqlik ishlab chiqaradi." },
  { id: "cardiac", name: "Yurak", color: "#b96760", description: "Yurak to'rt kamerali mushakli nasos. Klapanlari qonni o'pka va katta qon aylanish doiralari bo'ylab faqat oldinga yo'naltiradi." },
  { id: "sensory", name: "Sezgi a'zolari", color: "#b0c8ce", description: "Ko'rish, eshitish va muvozanat kabi maxsus sezgilarga xizmat qiluvchi tuzilmalar. Ularning ixtisoslashgan to'qimalari qo'zg'atuvchini sezib, asab tizimi bilan birga axborot uzatadi." },
  { id: "arterial", name: "Arteriyalar", color: "#c05245", description: "Yurak qonni tomirlar bo'ylab haydaydi. Arteriyalar qonni yurakdan to'qimalarga, kichik doirada esa o'pkaga olib boradi." },
  { id: "venous", name: "Venalar", color: "#527c9f", description: "Venalar qonni yurakka qaytaradi. Yuzaki va chuqur tarmoqlar to'qimalardan qon yig'adi; o'pka venalari kislorodga boy qonni o'pkadan olib keladi." },
  { id: "nervous", name: "Asab tizimi", color: "#d8b565", description: "Bosh miya, orqa miya va periferik nervlar signallarni uzatadi va qayta ishlaydi. Sezgi, harakat, muvofiqlashtirish va tana funksiyalarini avtomatik boshqarishni ta'minlaydi." },
  { id: "respiratory", name: "Nafas olish", color: "#b98991", description: "Nafas yo'llari havoni o'pkaga o'tkazadi; u yerda kislorod va karbonat angidrid havo bilan qon o'rtasida almashinadi. Nafas olish nafas mushaklari hosil qilgan bosim farqiga bog'liq." },
  { id: "digestive", name: "Hazm qilish", color: "#b8916b", description: "Hazm yo'li ovqatni parchalaydi, oziq moddalar va suvni so'radi, chiqindini oldinga suradi. Yordamchi a'zolar o't va hazm fermentlarini ishlab chiqaradi." },
  { id: "urinary", name: "Siydik ajratish", color: "#b47961", description: "Buyraklar qonni filtrlaydi, suyuqlik, elektrolit va kislota-ishqor muvozanatini boshqaradi. Siydik siydik yo'llari orqali qovuqqa tushadi va siydik chiqarish kanali orqali chiqadi." },
  { id: "lymphatic", name: "Limfa tizimi", color: "#879f7c", description: "Limfa tomirlari ortiqcha to'qima suyuqligini qon aylanishiga qaytaradi. Limfa tugunlari va boshqa limfoid a'zolar immun nazorat va javobni ta'minlaydi." },
  { id: "endocrine", name: "Endokrin", color: "#c5a09a", description: "Endokrin bezlar qonga gormonlar ajratib, moddalar almashinuvi, o'sish, stressga javob va ko'payish kabi jarayonlarni muvofiqlashtiradi." },
  { id: "reproductive", name: "Ko'payish", color: "#bda098", description: "Bu yerda ko'rsatilgan erkak jinsiy a'zolari spermatozoid ishlab chiqarish, yetilishi, tashilishi va jinsiy gormonlar ajratilishida ishtirok etadi." },
  { id: "integumentary", name: "Tana yuzasi", color: "#ba9b7d", description: "Tana yuzasi tashqi anatomik mo'ljal bo'lib xizmat qiladi. Teri tizimi himoya to'sig'ini hosil qiladi, sezgi va harorat boshqaruvida ishtirok etadi." },
  { id: "connective", name: "Biriktiruvchi to'qima", color: "#aec3bb", description: "Tog'ay, boylamlar va boshqa biriktiruvchi to'qimalar tuzilmalarni tayaydi, bog'laydi va ajratadi. Bo'g'imlarni mustahkamlaydi va mexanik yukni taqsimlaydi." },
];

export const SYSTEM_BY_ID = Object.fromEntries(SYSTEMS.map((s) => [s.id, s]));

// Teri (integumentary) sukut bo'yicha yashirin - ichki tuzilmalar ko'rinsin.
export const DEFAULT_VISIBLE = SYSTEMS.map((s) => s.id).filter((id) => id !== "integumentary");

// Chap paneldagi tez tanlov to'plamlari (AI select_item ham shu id'larni ishlatadi).
export const PRESETS = [
  { id: "all", name: "Hammasi", systems: DEFAULT_VISIBLE },
  { id: "skeleton", name: "Skelet", systems: ["skeletal", "connective"] },
  { id: "muscles", name: "Mushaklar", systems: ["skeletal", "muscular"] },
  { id: "organs", name: "Ichki a'zolar", systems: ["cardiac", "respiratory", "digestive", "urinary", "endocrine", "reproductive", "lymphatic"] },
  { id: "cardio", name: "Yurak-qon tomir", systems: ["cardiac", "arterial", "venous"] },
  { id: "nervous", name: "Asab", systems: ["nervous", "sensory"] },
  { id: "body", name: "Tana yuzasi", systems: ["integumentary", "skeletal"] },
];

// Asosiy a'zolarning qisqa izohi (kalit - inglizcha manba nomi, kichik harfda).
export const EXPLANATIONS = {
  heart: "Ko'krak qafasidagi mushakli nasos. O'ng yarmi qonni o'pkaga, chap yarmi esa butun tanaga haydaydi.",
  liver: "Diafragmaning o'ng tomoni ostidagi eng katta bez. So'rilgan oziq moddalarni qayta ishlaydi, o't ishlab chiqaradi va qon oqsillarini sintez qiladi.",
  brain: "Asab tizimining markaziy a'zosi. O'zaro bog'langan bo'limlari idrok, harakat, xotira, nutq va tana funksiyalarini boshqaradi.",
  stomach: "Qizilo'ngach va ingichka ichak o'rtasidagi mushakli xalta. Ovqatni kislota va fermentlar bilan aralashtirib, o'n ikki barmoq ichakka o'tkazadi.",
  spleen: "Qorin bo'shlig'ining yuqori chap qismidagi limfoid a'zo. Qonni filtrlaydi, eskirgan qon hujayralarini yo'q qiladi va immunitetda ishtirok etadi.",
  pancreas: "Hazm va endokrin vazifali qorin a'zosi. Ingichka ichakka fermentlar yetkazadi hamda insulin va glyukagon gormonlarini ajratadi.",
  "urinary bladder": "Chanoqdagi mushakli rezervuar. Buyraklardan siydik yo'llari orqali kelgan siydikni to'plab turadi.",
  trachea: "Hiqildoqni bronxlar bilan bog'lovchi asosiy nafas yo'li. Tog'ay halqalari nafas paytida yo'lni ochiq tutadi.",
  diaphragm: "Ko'krak va qorin bo'shliqlarini ajratuvchi keng mushak. Qisqarganda ko'krak hajmini oshirib, havoni o'pkaga tortadi.",
  "right lung": "O'ng o'pka uch bo'lakdan iborat va chap o'pkadan kattaroq. Alveolalarda kislorod qonga o'tadi, karbonat angidrid esa chiqariladi.",
  "left lung": "Chap o'pka ikki bo'lakdan iborat; yurak uchun joy qoldirgan yurak o'yig'i bor. Gaz almashinuvi alveolalarda kechadi.",
  "right kidney": "Bel sohasidagi loviyasimon a'zo. Qonni filtrlab siydik hosil qiladi, suv-tuz muvozanatini va qon bosimini boshqaradi.",
  "left kidney": "Chap buyrak odatda o'ng buyrakdan biroz yuqoriroq joylashadi. Nefronlar qonni filtrlab, chiqindini siydik sifatida chiqaradi.",
  cerebellum: "Miyacha - harakat aniqligi, muvozanat va mushak tonusini boshqaruvchi bosh miya bo'limi.",
  "spinal cord": "Orqa miya - umurtqa kanalidagi asab yo'li. Bosh miya bilan tana o'rtasida signallarni uzatadi va reflekslarni boshqaradi.",
  esophagus: "Qizilo'ngach - halqumdan me'daga ovqatni to'lqinsimon (peristaltik) qisqarish bilan olib o'tuvchi mushakli nay.",
  "small intestine": "Ingichka ichak - oziq moddalar asosan so'riladigan uzun nay: o'n ikki barmoq, och va yonbosh ichaklardan iborat.",
  "large intestine": "Yo'g'on ichak - suv va tuzlarni so'rib, chiqindini shakllantiradi va chiqaradi.",
  gallbladder: "O't pufagi - jigar ishlab chiqargan o'tni to'plab, yog'li ovqat kelganda o'n ikki barmoq ichakka chiqaradi.",
  "thyroid gland": "Qalqonsimon bez - tiroksin gormoni orqali moddalar almashinuvi tezligini boshqaradi.",
  "pituitary gland": "Gipofiz - bosh miya asosidagi 'bosh bez'; boshqa endokrin bezlar faoliyatini boshqaruvchi gormonlar ajratadi.",
  "pineal body": "Epifiz - melatonin ishlab chiqarib, uyqu-uyg'oqlik ritmini boshqaradi.",
  prostate: "Prostata - siydik chiqarish kanalining boshlanish qismini o'rab turuvchi bez; urug' suyuqligining bir qismini ishlab chiqaradi.",
  skin: "Teri - tananing eng katta a'zosi. Himoya, sezgi, harorat boshqaruvi va D vitamini sintezini ta'minlaydi.",
  sternum: "To'sh suyagi - ko'krak qafasi oldida qovurg'alarni birlashtiruvchi yassi suyak; yurak va o'pkani himoya qiladi.",
  sacrum: "Dumg'aza - beshta birlashgan umurtqadan iborat uchburchak suyak; umurtqa pog'onasini chanoq bilan bog'laydi.",
  mandible: "Pastki jag' - bosh suyagining yagona harakatchan suyagi; chaynash va nutqda ishtirok etadi.",
  "frontal bone": "Peshona suyagi - bosh suyagining oldingi qismini va ko'z kosalari tomini hosil qiladi.",
  "occipital bone": "Ensa suyagi - bosh suyagining orqa-pastki qismi; katta teshigi orqali orqa miya o'tadi.",
  "corpus callosum": "Qadoqsimon tana - ikki miya yarim sharini bog'lovchi eng katta oq modda tutami.",
  hypothalamus: "Gipotalamus - harorat, ochlik, chanqoq va gormonal muvozanatni boshqaruvchi miya markazi.",
  "medulla oblongata": "Uzunchoq miya - nafas, yurak urishi va qon bosimini boshqaruvchi hayotiy markazlar joylashgan bo'lim.",
  pons: "Ko'prik - bosh miya bo'limlari o'rtasida signallarni uzatuvchi va nafasni boshqarishda ishtirok etuvchi tuzilma.",
  midbrain: "O'rta miya - ko'rish va eshitish reflekslari hamda harakat boshqaruvida ishtirok etadi.",
  thymus: "Ayrisimon bez - T-limfotsitlar yetiladigan limfoid a'zo; bolalikda eng faol.",
  "ascending aorta": "Ko'tariluvchi aorta - chap qorinchadan chiquvchi eng katta arteriyaning boshlang'ich qismi; toj arteriyalari shu yerdan boshlanadi.",
  "arch of aorta": "Aorta ravog'i - bosh, bo'yin va qo'llarni qon bilan ta'minlovchi yirik tarmoqlar chiquvchi egri qism.",
  "abdominal aorta": "Qorin aortasi - qorin a'zolari va oyoqlarni qon bilan ta'minlovchi asosiy arteriya.",
  "inferior vena cava": "Pastki kovak vena - tananing pastki qismidan qonni o'ng bo'lmachaga qaytaruvchi eng katta vena.",
  "superior vena cava": "Yuqori kovak vena - bosh, bo'yin va qo'llardan qonni o'ng bo'lmachaga qaytaradi.",
  "pulmonary trunk": "O'pka poyasi - o'ng qorinchadan kislorodsiz qonni o'pkaga olib boruvchi tomir.",
};

// Inglizcha manba nomi -> o'zbekcha nom. Chap/o'ng va "of ..." qismlar
// translateName() ichida avtomatik qayta ishlanadi.
export const NAME_UZ = {
  "human body": "Inson tanasi",
  heart: "Yurak", liver: "Jigar", brain: "Bosh miya", stomach: "Me'da", spleen: "Taloq",
  pancreas: "Oshqozon osti bezi", "urinary bladder": "Siydik pufagi", trachea: "Traxeya (kekirdak)",
  diaphragm: "Diafragma", lung: "O'pka", kidney: "Buyrak", ureter: "Siydik yo'li", urethra: "Siydik chiqarish kanali",
  cerebellum: "Miyacha", "spinal cord": "Orqa miya", esophagus: "Qizilo'ngach", "small intestine": "Ingichka ichak",
  "large intestine": "Yo'g'on ichak", gallbladder: "O't pufagi", "thyroid gland": "Qalqonsimon bez",
  "pituitary gland": "Gipofiz", "pineal body": "Epifiz", prostate: "Prostata", skin: "Teri", sternum: "To'sh suyagi",
  sacrum: "Dumg'aza", mandible: "Pastki jag'", maxilla: "Yuqori jag'", "frontal bone": "Peshona suyagi",
  "occipital bone": "Ensa suyagi", "parietal bone": "Tepa suyagi", "temporal bone": "Chakka suyagi",
  "sphenoid bone": "Ponasimon suyak", ethmoid: "G'alvirsimon suyak", "nasal bone": "Burun suyagi",
  "zygomatic bone": "Yonoq suyagi", "lacrimal bone": "Ko'z yosh suyagi", "hyoid bone": "Til osti suyagi",
  "corpus callosum": "Qadoqsimon tana", hypothalamus: "Gipotalamus", thalamus: "Talamus",
  "medulla oblongata": "Uzunchoq miya", pons: "Ko'prik", midbrain: "O'rta miya", thymus: "Ayrisimon bez",
  "adrenal gland": "Buyrak usti bezi", testis: "Moyak", epididymis: "Moyak ortig'i", "seminal vesicle": "Urug' pufakchasi",
  "deferent duct": "Urug' chiqaruvchi yo'l", "ascending aorta": "Ko'tariluvchi aorta", "arch of aorta": "Aorta ravog'i",
  "descending aorta": "Tushuvchi aorta", "abdominal aorta": "Qorin aortasi", "thoracic aorta": "Ko'krak aortasi",
  "inferior vena cava": "Pastki kovak vena", "superior vena cava": "Yuqori kovak vena", "pulmonary trunk": "O'pka poyasi",
  "pulmonary artery": "O'pka arteriyasi", "pulmonary vein": "O'pka venasi", "common carotid artery": "Umumiy uyqu arteriyasi",
  "internal carotid artery": "Ichki uyqu arteriyasi", "external carotid artery": "Tashqi uyqu arteriyasi",
  "subclavian artery": "O'mrov osti arteriyasi", "subclavian vein": "O'mrov osti venasi", "vertebral artery": "Umurtqa arteriyasi",
  "brachiocephalic artery": "Yelka-bosh poyasi", "internal jugular vein": "Ichki bo'yinturuq venasi",
  "external jugular vein": "Tashqi bo'yinturuq venasi", "femoral artery": "Son arteriyasi", "femoral vein": "Son venasi",
  "popliteal artery": "Taqim arteriyasi", "popliteal vein": "Taqim venasi", "great saphenous vein": "Katta teri osti venasi",
  "small saphenous vein": "Kichik teri osti venasi", "renal artery": "Buyrak arteriyasi", "renal vein": "Buyrak venasi",
  "portal vein": "Darvoza venasi", "splenic artery": "Taloq arteriyasi", "hepatic artery": "Jigar arteriyasi",
  "azygos vein": "Toq vena", "cephalic vein": "Yelka-bosh venasi", "basilic vein": "Tirsak venasi",
  "brachial artery": "Yelka arteriyasi", "radial artery": "Bilak arteriyasi", "ulnar artery": "Tirsak arteriyasi",
  "anterior tibial artery": "Oldingi katta boldir arteriyasi", "posterior tibial artery": "Orqa katta boldir arteriyasi",
  "coronary artery": "Toj arteriyasi", "trunk of right coronary artery": "O'ng toj arteriyasi poyasi",
  "trunk of left coronary artery": "Chap toj arteriyasi poyasi", "mitral valve": "Mitral klapan",
  "tricuspid valve": "Uch tavaqali klapan", "aortic valve": "Aorta klapani", "pulmonary valve": "O'pka klapani",
  "wall of ventricle": "Qorincha devori", "wall of left atrium": "Chap bo'lmacha devori", "wall of right atrium": "O'ng bo'lmacha devori",
  "cavity of left ventricle": "Chap qorincha bo'shlig'i", "cavity of right ventricle": "O'ng qorincha bo'shlig'i",
  "cavity of left atrium": "Chap bo'lmacha bo'shlig'i", "cavity of right atrium": "O'ng bo'lmacha bo'shlig'i",
  "lateral ventricle": "Yon qorincha", "third ventricle": "Uchinchi qorincha", "fourth ventricle": "To'rtinchi qorincha",
  femur: "Son suyagi", tibia: "Katta boldir suyagi", fibula: "Kichik boldir suyagi", patella: "Tizza qopqog'i",
  humerus: "Yelka suyagi", radius: "Bilak suyagi", ulna: "Tirsak suyagi", clavicle: "O'mrov suyagi", scapula: "Kurak suyagi",
  "hip bone": "Chanoq suyagi", ilium: "Yonbosh suyagi", ischium: "O'tirg'ich suyagi", pubis: "Qov suyagi",
  coccyx: "Dum suyagi", calcaneus: "Tovon suyagi", talus: "Oshiq suyagi", rib: "Qovurg'a",
  "first rib": "Birinchi qovurg'a", "second rib": "Ikkinchi qovurg'a", "third rib": "Uchinchi qovurg'a",
  "fourth rib": "To'rtinchi qovurg'a", "fifth rib": "Beshinchi qovurg'a", "sixth rib": "Oltinchi qovurg'a",
  "seventh rib": "Yettinchi qovurg'a", "eighth rib": "Sakkizinchi qovurg'a", "ninth rib": "To'qqizinchi qovurg'a",
  "tenth rib": "O'ninchi qovurg'a", "eleventh rib": "O'n birinchi qovurg'a", "twelfth rib": "O'n ikkinchi qovurg'a",
  "body of sternum": "To'sh suyagi tanasi", "manubrium of sternum": "To'sh suyagi dastasi", "xiphoid process": "Xanjarsimon o'simta",
  "cervical vertebra": "Bo'yin umurtqasi", "thoracic vertebra": "Ko'krak umurtqasi", "lumbar vertebra": "Bel umurtqasi",
  "first lumbar vertebra": "Birinchi bel umurtqasi", "second lumbar vertebra": "Ikkinchi bel umurtqasi",
  "third lumbar vertebra": "Uchinchi bel umurtqasi", "fourth lumbar vertebra": "To'rtinchi bel umurtqasi",
  "fifth lumbar vertebra": "Beshinchi bel umurtqasi", "intervertebral disk": "Umurtqalararo disk", atlas: "Atlant (1-bo'yin umurtqasi)",
  axis: "Aksis (2-bo'yin umurtqasi)", "cricoid cartilage": "Uzuksimon tog'ay", "thyroid cartilage": "Qalqonsimon tog'ay",
  epiglottis: "Hiqildoq usti tog'ayi", larynx: "Hiqildoq", pharynx: "Halqum", tongue: "Til", "main bronchus": "Bosh bronx",
  "ascending colon": "Ko'tariluvchi chambar ichak", "transverse colon": "Ko'ndalang chambar ichak",
  "descending colon": "Tushuvchi chambar ichak", "sigmoid colon": "Sigmasimon ichak", rectum: "To'g'ri ichak",
  cecum: "Ko'richak", "vermiform appendix": "Chuvalchangsimon o'simta", duodenum: "O'n ikki barmoq ichak",
  jejunum: "Och ichak", ileum: "Yonbosh ichak", "mesentery of small intestine": "Ingichka ichak tutqichi",
  "external oblique": "Tashqi qiyshiq mushak", "internal oblique": "Ichki qiyshiq mushak", "rectus abdominis": "Qorin to'g'ri mushagi",
  "serratus anterior": "Oldingi tishsimon mushak", "pectoralis major": "Katta ko'krak mushagi", "pectoralis minor": "Kichik ko'krak mushagi",
  "sternocleidomastoid": "To'sh-o'mrov-so'rg'ichsimon mushak", trapezius: "Trapetsiyasimon mushak",
  "latissimus dorsi": "Orqaning keng mushagi", deltoid: "Deltasimon mushak", "biceps brachii": "Yelkaning ikki boshli mushagi",
  "triceps brachii": "Yelkaning uch boshli mushagi", "gluteus maximus": "Katta dumba mushagi", "gluteus medius": "O'rta dumba mushagi",
  sartorius: "Tikuvchi mushak", "rectus femoris": "Sonning to'g'ri mushagi", "vastus lateralis": "Tashqi keng mushak",
  "vastus medialis": "Ichki keng mushak", "biceps femoris": "Sonning ikki boshli mushagi", gastrocnemius: "Boldir mushagi",
  soleus: "Kambalasimon mushak", "tibialis anterior": "Oldingi katta boldir mushagi", "external intercostal muscle": "Tashqi qovurg'alararo mushak",
  "internal intercostal muscle": "Ichki qovurg'alararo mushak", "innermost intercostal muscle": "Eng ichki qovurg'alararo mushak",
  platysma: "Bo'yin teri osti mushagi", masseter: "Chaynov mushagi", "temporalis": "Chakka mushagi", "iliotibial tract": "Yonbosh-boldir trakti",
  "calcaneal tendon": "Axill payi", "linea alba": "Oq chiziq", "tensor fasciae latae": "Keng fassiyani taranglovchi mushak",
  "optic nerve": "Ko'ruv nervi", "facial nerve": "Yuz nervi", "vagus nerve": "Adashgan nerv", "sciatic nerve": "Quymich nervi",
  "median nerve": "O'rta nerv", "ulnar nerve": "Tirsak nervi", "radial nerve": "Bilak nervi", "femoral nerve": "Son nervi",
  "tibial nerve": "Katta boldir nervi", "phrenic nerve": "Diafragma nervi", "trigeminal nerve": "Uch shoxli nerv",
  "white matter of right cerebral hemisphere": "O'ng miya yarim shari oq moddasi",
  "white matter of left cerebral hemisphere": "Chap miya yarim shari oq moddasi", "occipital lobe": "Ensa bo'lagi",
  "frontal lobe": "Peshona bo'lagi", "temporal lobe": "Chakka bo'lagi", "parietal lobe": "Tepa bo'lagi",
  "superior frontal gyrus": "Yuqori peshona pushtasi", "middle frontal gyrus": "O'rta peshona pushtasi",
  "inferior frontal gyrus": "Pastki peshona pushtasi", "precentral gyrus": "Markaz oldi pushtasi", "postcentral gyrus": "Markaz orqa pushtasi",
  "superior parietal lobule": "Yuqori tepa bo'lakchasi", "angular gyrus": "Burchak pushtasi", "supramarginal gyrus": "Chekka usti pushtasi",
  "internal capsule": "Ichki kapsula", "tentorium cerebelli": "Miyacha chodiri", "choroid plexus of cerebral hemisphere": "Miya yarim shari tomirli chigali",
  "peduncle of midbrain": "O'rta miya oyoqchasi", "septum of telencephalon": "Oxirgi miya to'sig'i",
  sclera: "Oq parda (sklera)", cornea: "Shox parda", iris: "Rangdor parda", lens: "Gavhar", choroid: "Tomirli parda",
  "vitreous body": "Shishasimon tana", "optic part of retina": "To'r parda (ko'ruv qismi)", "corona ciliaris": "Kiprikli toj",
  "lacrimal gland": "Ko'z yosh bezi", "lacrimal sac": "Ko'z yosh xaltasi", "nasolacrimal duct": "Burun-ko'z yosh yo'li",
  "anterior chamber of eyeball": "Ko'z oldingi kamerasi", "suspensory ligament of lens": "Gavhar osuvchi boylami",
  "external ear": "Tashqi quloq", eyebrow: "Qosh", "hair of head": "Bosh sochi", lip: "Lab", "pubic hair": "Qov sochi",
  "corpus cavernosum of penis": "Jinsiy olat g'ovak tanasi", "corpus spongiosum of penis": "Jinsiy olat shimgichsimon tanasi",
  "glans penis": "Olat boshchasi", "lobe of thymus": "Ayrisimon bez bo'lagi", "vocal ligament": "Ovoz boylami",
  "thyrohyoid membrane": "Qalqon-til osti pardasi", "interosseous membrane of leg": "Boldir suyaklararo pardasi",
  "interosseous membrane of forearm": "Bilak suyaklararo pardasi", "long plantar ligament": "Uzun kaft osti boylami",
  "vascular tree": "Tomirlar daraxti", artery: "Arteriya", vein: "Vena", "systemic artery": "Katta doira arteriyasi",
  "systemic vein": "Katta doira venasi", "bone organ": "Suyak", "muscle organ": "Mushak", "long bone": "Uzun suyak",
  "respiratory system": "Nafas olish tizimi", "cardiovascular system": "Yurak-qon tomir tizimi", "alimentary system": "Hazm tizimi",
  "skeletal system": "Skelet tizimi", "musculoskeletal system": "Tayanch-harakat tizimi", "nervous system": "Asab tizimi",
  "urinary system": "Siydik ajratish tizimi", "endocrine system": "Endokrin tizim", "lymphatic system": "Limfa tizimi",
  head: "Bosh", neck: "Bo'yin", trunk: "Gavda", thorax: "Ko'krak qafasi", abdomen: "Qorin", pelvis: "Chanoq",
  "upper limb": "Qo'l (yuqori oyoq-qo'l)", "lower limb": "Oyoq (pastki oyoq-qo'l)", hand: "Qo'l panjasi", foot: "Oyoq panjasi",
  skull: "Bosh suyagi", "vertebral column": "Umurtqa pog'onasi", "rib cage": "Ko'krak qafasi suyaklari", mediastinum: "Ko'ks oralig'i",
  "gastrointestinal tract": "Oshqozon-ichak yo'li", "tracheobronchial tree": "Traxeobronxial daraxt", "bronchial tree": "Bronx daraxti",
};

const SIDE = { right: "O'ng", left: "Chap" };

// Manba nomini o'zbekchaga o'giradi; lug'atda bo'lmasa inglizchasini qaytaradi.
export const translateName = (name) => {
  if (!name) return "";
  const key = name.toLowerCase().trim();
  if (NAME_UZ[key]) return NAME_UZ[key];
  // "right femur" -> "O'ng son suyagi"
  const side = key.match(/^(right|left) (.+)$/);
  if (side && NAME_UZ[side[2]]) return `${SIDE[side[1]]} ${NAME_UZ[side[2]].toLowerCase()}`;
  // "optic part of left retina" -> lug'atdagi chap/o'ngsiz variant + tomon.
  const inner = key.match(/^(.+?) (right|left) (.+)$/);
  if (inner) {
    const base = NAME_UZ[`${inner[1]} ${inner[3]}`];
    if (base) return `${SIDE[inner[2]]} ${base.toLowerCase()}`;
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
};

// Nomga mos izoh: aniq a'zo izohi bo'lmasa tizim izohi qaytadi.
export const explanation = (name, systemId) => {
  const key = (name || "").toLowerCase().trim();
  if (EXPLANATIONS[key]) return { text: EXPLANATIONS[key], specific: true };
  const side = key.match(/^(right|left) (.+)$/);
  if (side && EXPLANATIONS[side[2]]) return { text: EXPLANATIONS[side[2]], specific: true };
  return { text: SYSTEM_BY_ID[systemId]?.description || "", specific: false };
};

// Qidiruv panelida bo'sh so'rovda ko'rsatiladigan mashhur a'zolar.
export const FEATURED_CONCEPTS = [
  "heart", "brain", "liver", "stomach", "right lung", "left lung", "right kidney", "spleen", "pancreas",
  "urinary bladder", "trachea", "diaphragm", "cerebellum", "spinal cord", "sternum", "sacrum", "mandible",
];
