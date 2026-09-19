// Subject and topic selection data. The 3D chemistry lab is live; other lessons are previews.
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
