// Subject and topic selection data. Chemistry lab and biology topics are live; the rest are previews.
export const SUBJECTS = [
  {
    "slug": "chemistry",
    "title": "Kimyo",
    "short": "Moddalar, elementlar va ularning tuzilishi bilan tanishing.",
    "icon": "FlaskConical",
    "color": "#2563eb",
    "topics": [
      {
        "slug": "lab",
        "title": "3D laboratoriya",
        "short": "Xonada yuring, jihozlardan foydalaning va kimyoviy tajribalar o'tkazing.",
        "icon": "FlaskConical"
      },
      {
        "slug": "periodic-table",
        "title": "Davriy jadval",
        "short": "Kimyoviy elementlar va ularning davriy jadvaldagi o'rni.",
        "icon": "Grid3x3"
      },
      {
        "slug": "molecules",
        "title": "Molekulalar",
        "short": "Molekulalar tuzilishi va kimyoviy birikmalar asoslari.",
        "icon": "Hexagon"
      },
      {
        "slug": "atoms",
        "title": "Atomlar",
        "short": "Atom yadrosi, protonlar va elektronlar haqida.",
        "icon": "Atom"
      },
      {
        "slug": "ph",
        "title": "pH shkalasi",
        "short": "Kislotalilik, ishqoriylik va pH shkalasi asoslari.",
        "icon": "Droplet"
      },
      {
        "slug": "gas-laws",
        "title": "Gaz qonunlari",
        "short": "Hajm, harorat va bosim orasidagi bog'lanishlar.",
        "icon": "Gauge"
      }
    ]
  },
  {
    "slug": "biology",
    "title": "Biologiya",
    "short": "Tirik organizm asoslari - hujayra, DNK va inson tanasi.",
    "icon": "Dna",
    "color": "#059669",
    "topics": [
      {
        "slug": "cell",
        "title": "Hujayra",
        "short": "Hujayra organoidlari bilan tanishing.",
        "icon": "Microscope"
      },
      {
        "slug": "cell-studio",
        "title": "Hujayra studiyasi",
        "short": "7 xil hujayrani 3D da o'rganing - organoidlar, mikroskop va solishtirish.",
        "icon": "Microscope"
      },
      {
        "slug": "dna",
        "title": "DNK spirali",
        "short": "Qo'sh spiral va nukleotidlarni ko'ring.",
        "icon": "Dna"
      },
      {
        "slug": "anatomy",
        "title": "Odam anatomiyasi",
        "short": "Mushak, qon-tomir, asab, bo'g'im va ichki a'zolar tizimlarini 3D da o'rganing.",
        "icon": "PersonStanding"
      },
      {
        "slug": "human-atlas",
        "title": "Inson atlasi",
        "short": "2234 ta qism, 15 tizim: qidiring, tizimlarni yoqing, portlating va ajratib ko'ring.",
        "icon": "ScanSearch"
      },
      {
        "slug": "surgery",
        "title": "Jarrohlik",
        "short": "Qatlamlarni yeching yoki skalpel bilan kesib ichki a'zolarni ko'ring.",
        "icon": "Scissors"
      },
      {
        "slug": "genetics",
        "title": "Genetika (Punnett)",
        "short": "Ota-ona allellarini tanlab, avlod nisbatlarini Punnett jadvalida ko'ring.",
        "icon": "GitFork"
      },
      {
        "slug": "simulator",
        "title": "Odam tanasi simulyatori",
        "short": "Inson tanasi tizimlarini interaktiv 3D simulyatorda o'rganing.",
        "icon": "PersonStanding"
      }
    ]
  },
  {
    "slug": "physics",
    "title": "Fizika",
    "short": "Harakat, energiya va mexanizmlar qanday ishlashini o'rganing.",
    "icon": "Gauge",
    "color": "#ea580c",
    "topics": [
      {
        "slug": "engine",
        "title": "Ichki yonuv dvigateli",
        "short": "To'rt taktli dvigatelning qismlari va ishlash bosqichlari.",
        "icon": "Cog"
      }
    ]
  },
  {
    "slug": "electronics",
    "title": "Elektron mehanika",
    "short": "Elektron qismlar va sxemalar asoslari bilan tanishing.",
    "icon": "CircuitBoard",
    "color": "#7c3aed",
    "topics": [
      {
        "slug": "arduino",
        "title": "Elektron sxemalar",
        "short": "Elektron komponentlar va sxema tuzish asoslari.",
        "icon": "Cpu"
      }
    ]
  },
  {
    "slug": "history",
    "title": "Tarix",
    "short": "O'tmish, yodgorliklar va tarixiy davrlarni kashf eting.",
    "icon": "Landmark",
    "color": "#b5751a",
    "topics": [
      {
        "slug": "registan",
        "title": "Registon",
        "short": "Registon majmuasi va uning tarixiy ahamiyati.",
        "icon": "Landmark"
      },
      {
        "slug": "atlas",
        "title": "Tarixiy atlas",
        "short": "Tarixiy davrlar, davlatlar va ularning hududlari.",
        "icon": "Map"
      }
    ]
  }
];

export const getSubject = (slug) => SUBJECTS.find((subject) => subject.slug === slug);
export const getTopic = (subjectSlug, topicSlug) => getSubject(subjectSlug)?.topics.find((topic) => topic.slug === topicSlug);
