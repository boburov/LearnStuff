// The 20 pieces of lab equipment; Uzbek names are pending the chemistry teacher's review.
export const EQUIPMENT_GROUPS = [
  { id: "container", name: "Idishlar" },
  { id: "tool", name: "Qo'shish va o'lchash asboblari" },
  { id: "heating", name: "Isitish va ushlab turish" },
];

export const EQUIPMENT = [
  { id: "beaker", name: "Kimyoviy stakan", group: "container", capacityMl: 250 },
  { id: "conical-flask", name: "Konussimon kolba", group: "container", capacityMl: 250 },
  { id: "test-tube", name: "Probirka", group: "container", capacityMl: 30 },
  { id: "measuring-cylinder", name: "O'lchov silindri", group: "container", capacityMl: 100 },
  { id: "evaporating-dish", name: "Chinni kosacha", group: "container", capacityMl: 170 },
  { id: "crucible", name: "Tigel", group: "container", capacityMl: 30 },
  { id: "crystallizing-dish", name: "Kristallizator", group: "container", capacityMl: 1000 },
  { id: "gas-jar", name: "Gaz yig'ish silindri", group: "container", capacityMl: 500 },
  { id: "dropper", name: "Tomizgich", group: "tool" },
  { id: "spatula", name: "Shpatel", group: "tool" },
  { id: "crucible-tongs", name: "Tigel qisqichi", group: "tool" },
  { id: "stirring-rod", name: "Shisha tayoqcha", group: "tool" },
  { id: "funnel", name: "Voronka", group: "tool" },
  { id: "thermometer", name: "Termometr", group: "tool" },
  { id: "digital-scale", name: "Elektron tarozi", group: "tool" },
  { id: "ph-paper", name: "Universal indikator qog'ozi", group: "tool" },
  { id: "spirit-lamp", name: "Spirt lampasi", group: "heating" },
  { id: "hot-plate", name: "Magnitli isitgich", group: "heating" },
  { id: "retort-stand", name: "Shtativ", group: "heating" },
  { id: "test-tube-rack", name: "Probirka shtativi", group: "heating" },
];

export const EQUIPMENT_BY_ID = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));
