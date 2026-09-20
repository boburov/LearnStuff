// Central registry: subjects -> topics. Every topic here has a live page.
// `slug` values are URL params: /:subject and /:subject/:topic.
// UI text in Uzbek, code values in English.

export const SUBJECTS = [
  {
    slug: "chemistry",
    title: "Kimyo",
    short: "Modda tuzilishi - molekula va atomlarni 3D da o'rganing.",
    icon: "FlaskConical",
    color: "#2563eb",
    topics: [
      {
        slug: "periodic-table",
        title: "Davriy jadval",
        short: "118 element, ionlar va tenglama/molyar massa kalkulyatorlari.",
        icon: "Grid3x3",
      },
      {
        slug: "molecules",
        title: "Molekulalar",
        short: "Suv, CO₂, metan kabi birikmalarni aylantirib ko'ring.",
        icon: "Hexagon",
      },
      {
        slug: "lab",
        title: "Interaktiv laboratoriya",
        short: "Laboratoriya xonasida yuring, reaktivlarni aralashtirib reaksiyalarni kuzating.",
        icon: "TestTubes",
      },
      {
        slug: "atoms",
        title: "Atomlar",
        short: "Yadro va elektron orbitalarini kuzating.",
        icon: "Atom",
      },
      {
        slug: "ph",
        title: "pH simulyatsiya",
        short: "Eritma kuchini o'zgartirib pH va indikator rangini kuzating.",
        icon: "Droplet",
      },
      {
        slug: "gas-laws",
        title: "Gaz qonunlari",
        short: "Hajm, harorat va mol miqdorini o'zgartirib bosimni hisoblang.",
        icon: "Gauge",
      },
    ],
  },
  {
    slug: "biology",
    title: "Biologiya",
    short: "Tirik organizm asoslari - hujayra, DNK va inson tanasi.",
    icon: "Dna",
    color: "#059669",
    topics: [
      {
        slug: "cell",
        title: "Hujayra",
        short: "Hujayra organoidlari bilan tanishing.",
        icon: "Microscope",
      },
      {
        slug: "cell-studio",
        title: "Hujayra studiyasi",
        short: "7 xil hujayrani 3D da o'rganing - organoidlar, mikroskop va solishtirish.",
        icon: "Microscope",
      },
      {
        slug: "dna",
        title: "DNK spirali",
        short: "Qo'sh spiral va nukleotidlarni ko'ring.",
        icon: "Dna",
      },
      {
        slug: "anatomy",
        title: "Odam anatomiyasi",
        short: "Mushak, qon-tomir, asab, bo'g'im va ichki a'zolar tizimlarini 3D da o'rganing.",
        icon: "PersonStanding",
      },
      {
        slug: "human-atlas",
        title: "Inson atlasi",
        short: "2234 ta qism, 15 tizim: qidiring, tizimlarni yoqing, portlating va ajratib ko'ring.",
        icon: "ScanSearch",
      },
      {
        slug: "surgery",
        title: "Jarrohlik",
        short: "Qatlamlarni yeching yoki skalpel bilan kesib ichki a'zolarni ko'ring.",
        icon: "Scissors",
      },
      {
        slug: "genetics",
        title: "Genetika (Punnett)",
        short: "Ota-ona allellarini tanlab, avlod nisbatlarini Punnett jadvalida ko'ring.",
        icon: "GitFork",
      },
      {
        slug: "simulator",
        title: "Odam tanasi simulyatori",
        short: "Inson tanasi tizimlarini interaktiv 3D simulyatorda o'rganing.",
        icon: "PersonStanding",
      },
    ],
  },
  {
    slug: "physics",
    title: "Fizika",
    short: "Mexanizmlar va koinot - dvigatel ichini oching, qora tuynuk atrofida nurni kuzating.",
    icon: "Gauge",
    color: "#ea580c",
    topics: [
      {
        slug: "black-hole",
        title: "Qora tuynuk",
        short: "Astronomiya: nur qora tuynuk atrofida qanday egiladi - linza, disk va Doppler.",
        icon: "CircleDot",
      },
      {
        slug: "engine",
        title: "Ichki yonuv dvigateli",
        short: "To'rt taktli dvigatel ishini rentgen rejimida kuzating va qismlarga ajrating.",
        icon: "Cog",
      },
    ],
  },
  {
    slug: "electronics",
    title: "Elektron mehanika",
    short: "Platalar va sxemalar - Arduino bilan LED va motorlarni boshqaring.",
    icon: "CircuitBoard",
    color: "#7c3aed",
    topics: [
      {
        slug: "arduino",
        title: "Sxema quruvchi",
        short: "Komponentlarni tortib ulang, kod yozing va simulyatsiyani jonli kuzating.",
        icon: "Cpu",
      },
    ],
  },
  {
    slug: "history",
    title: "Tarix",
    short: "O'tmish yodgorliklari - Registonni 3D da AI gid bilan kashf eting.",
    icon: "Landmark",
    color: "#b5751a",
    topics: [
      {
        slug: "registan",
        title: "Registon (audio-gid)",
        short: "3D Registon: hotspotlar, sayohat, vaqt sayohati va AI gid.",
        icon: "Landmark",
      },
      {
        slug: "atlas",
        title: "Tarixiy atlas",
        short: "Vaqt jadvalini suring: qaysi davrda qaysi davlat qanday hududlarni egallaganini ko'ring.",
        icon: "Map",
      },
    ],
  },
];

export const getSubject = (slug) => SUBJECTS.find((subject) => subject.slug === slug) || null;

export const getTopic = (subjectSlug, topicSlug) =>
  getSubject(subjectSlug)?.topics.find((topic) => topic.slug === topicSlug) || null;
