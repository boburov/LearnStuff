// Atom datasets for the Bohr-model 3D viewer.
// shells = electrons per shell (e.g. [2, 8, 1] for sodium).

export const ATOMS = [
  {
    id: "hydrogen",
    name: "Vodorod",
    symbol: "H",
    number: 1,
    protons: 1,
    neutrons: 0,
    shells: [1],
    color: "#e5e7eb",
    about: "Eng yengil va eng ko'p tarqalgan element. Bitta proton va bitta elektronga ega.",
  },
  {
    id: "helium",
    name: "Geliy",
    symbol: "He",
    number: 2,
    protons: 2,
    neutrons: 2,
    shells: [2],
    color: "#fcd34d",
    about: "Inert gaz. Tashqi qobig'i to'la bo'lgani uchun deyarli reaksiyaga kirishmaydi.",
  },
  {
    id: "carbon",
    name: "Uglerod",
    symbol: "C",
    number: 6,
    protons: 6,
    neutrons: 6,
    shells: [2, 4],
    color: "#374151",
    about: "Hayot asosini tashkil etuvchi element. To'rt bog' hosil qila oladi.",
  },
  {
    id: "oxygen",
    name: "Kislorod",
    symbol: "O",
    number: 8,
    protons: 8,
    neutrons: 8,
    shells: [2, 6],
    color: "#ef4444",
    about: "Nafas olish uchun zarur. Suv va ko'plab birikmalar tarkibida bo'ladi.",
  },
  {
    id: "sodium",
    name: "Natriy",
    symbol: "Na",
    number: 11,
    protons: 11,
    neutrons: 12,
    shells: [2, 8, 1],
    color: "#a78bfa",
    about: "Yumshoq metall. Suv bilan kuchli reaksiyaga kirishadi, tuz tarkibida bo'ladi.",
  },
];

export const getAtom = (id) => ATOMS.find((a) => a.id === id) || null;
