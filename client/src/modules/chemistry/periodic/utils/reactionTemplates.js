// Balanced-equation reaction bank + worksheet generation logic.
// Ported from Zperiod's worksheet-generator.js (pure, no DOM).

export const reactionTemplates = {
  synthesis: [
    { reactants: ["Na", "Cl2"], products: ["NaCl"], coefficients: [2, 1, 2] },
    { reactants: ["Mg", "O2"], products: ["MgO"], coefficients: [2, 1, 2] },
    { reactants: ["Fe", "O2"], products: ["Fe2O3"], coefficients: [4, 3, 2] },
    { reactants: ["Al", "O2"], products: ["Al2O3"], coefficients: [4, 3, 2] },
    { reactants: ["H2", "O2"], products: ["H2O"], coefficients: [2, 1, 2] },
    { reactants: ["N2", "H2"], products: ["NH3"], coefficients: [1, 3, 2] },
    { reactants: ["Ca", "O2"], products: ["CaO"], coefficients: [2, 1, 2] },
    { reactants: ["K", "Br2"], products: ["KBr"], coefficients: [2, 1, 2] },
    { reactants: ["Li", "N2"], products: ["Li3N"], coefficients: [6, 1, 2] },
    { reactants: ["P4", "O2"], products: ["P4O10"], coefficients: [1, 5, 1] },
    { reactants: ["S", "O2"], products: ["SO2"], coefficients: [1, 1, 1] },
    { reactants: ["Fe", "S"], products: ["FeS"], coefficients: [1, 1, 1] },
    { reactants: ["Cu", "S"], products: ["Cu2S"], coefficients: [2, 1, 1] },
    { reactants: ["Zn", "Cl2"], products: ["ZnCl2"], coefficients: [1, 1, 1] },
    { reactants: ["Ca", "N2"], products: ["Ca3N2"], coefficients: [3, 1, 1] },
    { reactants: ["Ba", "O2"], products: ["BaO"], coefficients: [2, 1, 2] },
    { reactants: ["Sr", "Cl2"], products: ["SrCl2"], coefficients: [1, 1, 1] },
    { reactants: ["Mg", "N2"], products: ["Mg3N2"], coefficients: [3, 1, 1] },
    { reactants: ["Al", "S"], products: ["Al2S3"], coefficients: [2, 3, 1] },
    { reactants: ["Fe", "Cl2"], products: ["FeCl3"], coefficients: [2, 3, 2] },
    { reactants: ["Sn", "O2"], products: ["SnO2"], coefficients: [1, 1, 1] },
    { reactants: ["Ti", "O2"], products: ["TiO2"], coefficients: [1, 1, 1] },
    { reactants: ["Cu", "O2"], products: ["CuO"], coefficients: [2, 1, 2] },
    { reactants: ["Pb", "O2"], products: ["PbO"], coefficients: [2, 1, 2] },
  ],
  decomposition: [
    { reactants: ["H2O2"], products: ["H2O", "O2"], coefficients: [2, 2, 1] },
    { reactants: ["HgO"], products: ["Hg", "O2"], coefficients: [2, 2, 1] },
    { reactants: ["KClO3"], products: ["KCl", "O2"], coefficients: [2, 2, 3] },
    { reactants: ["CaCO3"], products: ["CaO", "CO2"], coefficients: [1, 1, 1] },
    { reactants: ["NaHCO3"], products: ["Na2CO3", "H2O", "CO2"], coefficients: [2, 1, 1, 1] },
    { reactants: ["NH4NO3"], products: ["N2O", "H2O"], coefficients: [1, 1, 2] },
    { reactants: ["Mg(OH)2"], products: ["MgO", "H2O"], coefficients: [1, 1, 1] },
    { reactants: ["Al2O3"], products: ["Al", "O2"], coefficients: [2, 4, 3] },
    { reactants: ["PbO2"], products: ["PbO", "O2"], coefficients: [2, 2, 1] },
    { reactants: ["H2CO3"], products: ["H2O", "CO2"], coefficients: [1, 1, 1] },
    { reactants: ["Na2CO3"], products: ["Na2O", "CO2"], coefficients: [1, 1, 1] },
    { reactants: ["BaCO3"], products: ["BaO", "CO2"], coefficients: [1, 1, 1] },
    { reactants: ["Fe2O3"], products: ["Fe", "O2"], coefficients: [2, 4, 3] },
    { reactants: ["AgNO3"], products: ["Ag", "NO2", "O2"], coefficients: [2, 2, 2, 1] },
    { reactants: ["Pb(NO3)2"], products: ["PbO", "NO2", "O2"], coefficients: [2, 2, 4, 1] },
    { reactants: ["Ca(OH)2"], products: ["CaO", "H2O"], coefficients: [1, 1, 1] },
    { reactants: ["NaNO3"], products: ["NaNO2", "O2"], coefficients: [2, 2, 1] },
    { reactants: ["KNO3"], products: ["KNO2", "O2"], coefficients: [2, 2, 1] },
  ],
  "single-replacement": [
    { reactants: ["Zn", "HCl"], products: ["ZnCl2", "H2"], coefficients: [1, 2, 1, 1] },
    { reactants: ["Fe", "CuSO4"], products: ["FeSO4", "Cu"], coefficients: [1, 1, 1, 1] },
    { reactants: ["Mg", "HCl"], products: ["MgCl2", "H2"], coefficients: [1, 2, 1, 1] },
    { reactants: ["Na", "H2O"], products: ["NaOH", "H2"], coefficients: [2, 2, 2, 1] },
    { reactants: ["K", "H2O"], products: ["KOH", "H2"], coefficients: [2, 2, 2, 1] },
    { reactants: ["Ca", "H2O"], products: ["Ca(OH)2", "H2"], coefficients: [1, 2, 1, 1] },
    { reactants: ["Al", "HCl"], products: ["AlCl3", "H2"], coefficients: [2, 6, 2, 3] },
    { reactants: ["Zn", "AgNO3"], products: ["Zn(NO3)2", "Ag"], coefficients: [1, 2, 1, 2] },
    { reactants: ["Cu", "AgNO3"], products: ["Cu(NO3)2", "Ag"], coefficients: [1, 2, 1, 2] },
    { reactants: ["Fe", "HCl"], products: ["FeCl2", "H2"], coefficients: [1, 2, 1, 1] },
    { reactants: ["Mg", "H2SO4"], products: ["MgSO4", "H2"], coefficients: [1, 1, 1, 1] },
    { reactants: ["Li", "H2O"], products: ["LiOH", "H2"], coefficients: [2, 2, 2, 1] },
    { reactants: ["Al", "Fe2O3"], products: ["Al2O3", "Fe"], coefficients: [2, 1, 1, 2] },
    { reactants: ["Zn", "CuCl2"], products: ["ZnCl2", "Cu"], coefficients: [1, 1, 1, 1] },
    { reactants: ["Fe", "H2SO4"], products: ["FeSO4", "H2"], coefficients: [1, 1, 1, 1] },
    { reactants: ["Mg", "CuSO4"], products: ["MgSO4", "Cu"], coefficients: [1, 1, 1, 1] },
    { reactants: ["Ca", "HCl"], products: ["CaCl2", "H2"], coefficients: [1, 2, 1, 1] },
    { reactants: ["Ba", "H2O"], products: ["Ba(OH)2", "H2"], coefficients: [1, 2, 1, 1] },
    { reactants: ["Sr", "H2O"], products: ["Sr(OH)2", "H2"], coefficients: [1, 2, 1, 1] },
    { reactants: ["Al", "CuSO4"], products: ["Al2(SO4)3", "Cu"], coefficients: [2, 3, 1, 3] },
  ],
  combustion: [
    { reactants: ["CH4", "O2"], products: ["CO2", "H2O"], coefficients: [1, 2, 1, 2] },
    { reactants: ["C2H6", "O2"], products: ["CO2", "H2O"], coefficients: [2, 7, 4, 6] },
    { reactants: ["C3H8", "O2"], products: ["CO2", "H2O"], coefficients: [1, 5, 3, 4] },
    { reactants: ["C4H10", "O2"], products: ["CO2", "H2O"], coefficients: [2, 13, 8, 10] },
    { reactants: ["C2H5OH", "O2"], products: ["CO2", "H2O"], coefficients: [1, 3, 2, 3] },
    { reactants: ["C6H12O6", "O2"], products: ["CO2", "H2O"], coefficients: [1, 6, 6, 6] },
    { reactants: ["C2H2", "O2"], products: ["CO2", "H2O"], coefficients: [2, 5, 4, 2] },
    { reactants: ["C6H6", "O2"], products: ["CO2", "H2O"], coefficients: [2, 15, 12, 6] },
    { reactants: ["CH3OH", "O2"], products: ["CO2", "H2O"], coefficients: [2, 3, 2, 4] },
    { reactants: ["C5H12", "O2"], products: ["CO2", "H2O"], coefficients: [1, 8, 5, 6] },
    { reactants: ["C2H4", "O2"], products: ["CO2", "H2O"], coefficients: [1, 3, 2, 2] },
    { reactants: ["C3H6", "O2"], products: ["CO2", "H2O"], coefficients: [2, 9, 6, 6] },
    { reactants: ["C7H16", "O2"], products: ["CO2", "H2O"], coefficients: [1, 11, 7, 8] },
    { reactants: ["C8H18", "O2"], products: ["CO2", "H2O"], coefficients: [2, 25, 16, 18] },
    { reactants: ["C3H4", "O2"], products: ["CO2", "H2O"], coefficients: [1, 4, 3, 2] },
    { reactants: ["C4H8", "O2"], products: ["CO2", "H2O"], coefficients: [1, 6, 4, 4] },
    { reactants: ["C6H14", "O2"], products: ["CO2", "H2O"], coefficients: [2, 19, 12, 14] },
    { reactants: ["C10H22", "O2"], products: ["CO2", "H2O"], coefficients: [2, 31, 20, 22] },
  ],
  "double-replacement": [
    { reactants: ["HCl", "NaOH"], products: ["NaCl", "H2O"], coefficients: [1, 1, 1, 1] },
    { reactants: ["H2SO4", "NaOH"], products: ["Na2SO4", "H2O"], coefficients: [1, 2, 1, 2] },
    { reactants: ["HNO3", "KOH"], products: ["KNO3", "H2O"], coefficients: [1, 1, 1, 1] },
    { reactants: ["H2SO4", "KOH"], products: ["K2SO4", "H2O"], coefficients: [1, 2, 1, 2] },
    { reactants: ["HCl", "Ca(OH)2"], products: ["CaCl2", "H2O"], coefficients: [2, 1, 1, 2] },
    { reactants: ["H2SO4", "Ca(OH)2"], products: ["CaSO4", "H2O"], coefficients: [1, 1, 1, 2] },
    { reactants: ["HCl", "Ba(OH)2"], products: ["BaCl2", "H2O"], coefficients: [2, 1, 1, 2] },
    { reactants: ["H3PO4", "NaOH"], products: ["Na3PO4", "H2O"], coefficients: [1, 3, 1, 3] },
    { reactants: ["H2CO3", "NaOH"], products: ["Na2CO3", "H2O"], coefficients: [1, 2, 1, 2] },
    { reactants: ["AgNO3", "NaCl"], products: ["AgCl", "NaNO3"], coefficients: [1, 1, 1, 1] },
    { reactants: ["BaCl2", "Na2SO4"], products: ["BaSO4", "NaCl"], coefficients: [1, 1, 1, 2] },
    { reactants: ["Pb(NO3)2", "KI"], products: ["PbI2", "KNO3"], coefficients: [1, 2, 1, 2] },
    { reactants: ["CaCl2", "Na2CO3"], products: ["CaCO3", "NaCl"], coefficients: [1, 1, 1, 2] },
    { reactants: ["FeCl3", "NaOH"], products: ["Fe(OH)3", "NaCl"], coefficients: [1, 3, 1, 3] },
    { reactants: ["CuSO4", "NaOH"], products: ["Cu(OH)2", "Na2SO4"], coefficients: [1, 2, 1, 1] },
    { reactants: ["AgNO3", "K2CrO4"], products: ["Ag2CrO4", "KNO3"], coefficients: [2, 1, 1, 2] },
    { reactants: ["MgCl2", "NaOH"], products: ["Mg(OH)2", "NaCl"], coefficients: [1, 2, 1, 2] },
    { reactants: ["ZnSO4", "NaOH"], products: ["Zn(OH)2", "Na2SO4"], coefficients: [1, 2, 1, 1] },
    { reactants: ["AlCl3", "NaOH"], products: ["Al(OH)3", "NaCl"], coefficients: [1, 3, 1, 3] },
    { reactants: ["Na2CO3", "HCl"], products: ["NaCl", "H2O", "CO2"], coefficients: [1, 2, 2, 1, 1] },
    { reactants: ["CaCO3", "HCl"], products: ["CaCl2", "H2O", "CO2"], coefficients: [1, 2, 1, 1, 1] },
    { reactants: ["NaHCO3", "HCl"], products: ["NaCl", "H2O", "CO2"], coefficients: [1, 1, 1, 1, 1] },
    { reactants: ["Na2S", "HCl"], products: ["NaCl", "H2S"], coefficients: [1, 2, 2, 1] },
    { reactants: ["NH4Cl", "NaOH"], products: ["NaCl", "H2O", "NH3"], coefficients: [1, 1, 1, 1, 1] },
    { reactants: ["(NH4)2SO4", "NaOH"], products: ["Na2SO4", "H2O", "NH3"], coefficients: [1, 2, 1, 2, 2] },
  ],
};

export const REACTION_TYPES = [
  { value: "synthesis", label: "Birikish", formula: "A + B → AB" },
  { value: "decomposition", label: "Parchalanish", formula: "AB → A + B" },
  { value: "single-replacement", label: "Bir o'rinbosarlik", formula: "A + BC → AC + B" },
  { value: "double-replacement", label: "Ikki o'rinbosarlik", formula: "AB + CD → AD + CB" },
  { value: "combustion", label: "Yonish", formula: "Uglevodorod + O₂" },
];

export const DIFFICULTIES = [
  { value: "easy", label: "Oson" },
  { value: "medium", label: "O'rta" },
  { value: "hard", label: "Qiyin" },
];

export const TYPE_SHORT = {
  synthesis: "Birikish",
  decomposition: "Parchalanish",
  "single-replacement": "Bir o'rinbosarlik",
  "double-replacement": "Ikki o'rinbosarlik",
  combustion: "Yonish",
};

const getReactionDifficulty = (r) => {
  let score = 1.5;
  const coeffSum = r.coefficients.reduce((a, b) => a + b, 0);
  const hasParen =
    r.reactants.some((f) => f.includes("(")) || r.products.some((f) => f.includes("("));

  if (r.type === "combustion") score += 2;
  else if (r.type === "single-replacement") score += 1;
  else if (r.type === "decomposition") score += 0.5;

  if (hasParen) score += 1;
  if (coeffSum > 12) score += 1;
  if (coeffSum <= 5) score -= 0.5;

  return score;
};

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const generateWorksheetId = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

// Selects `count` balanced-equation questions from the chosen types + difficulty.
export const generateWorksheet = ({ count, selectedTypes, difficulty }) => {
  if (!selectedTypes.length) return null;

  const allReactions = [];
  selectedTypes.forEach((type) => {
    (reactionTemplates[type] || []).forEach((reaction) => {
      allReactions.push({ ...reaction, type, diffScore: getReactionDifficulty({ ...reaction, type }) });
    });
  });

  let primaryPool = [];
  const mediumPool = [];
  allReactions.forEach((r) => {
    const s = r.diffScore;
    if (s >= 1.5 && s <= 3.5) mediumPool.push(r);
    if (difficulty === "easy" && s <= 2.5) primaryPool.push(r);
    else if (difficulty === "medium" && s >= 1.5 && s <= 4.0) primaryPool.push(r);
    else if (difficulty === "hard" && s >= 2.5) primaryPool.push(r);
  });

  if (primaryPool.length < count) primaryPool = allReactions;

  let mediumMixCount = 0;
  if (difficulty === "hard" && count <= 10) mediumMixCount = Math.max(1, Math.floor(count * 0.2));
  const primaryCount = count - mediumMixCount;
  const quotaPerType = Math.ceil(primaryCount / selectedTypes.length);

  shuffleArray(primaryPool);
  shuffleArray(mediumPool);

  const finalQuestions = [];
  let selectedSoFar = 0;
  selectedTypes.forEach((type) => {
    if (selectedSoFar >= primaryCount) return;
    const typeCandidates = primaryPool.filter((r) => r.type === type);
    const take = Math.min(quotaPerType, typeCandidates.length, primaryCount - selectedSoFar);
    finalQuestions.push(...typeCandidates.slice(0, take));
    selectedSoFar += take;
  });

  if (finalQuestions.length < primaryCount) {
    const remainingNeeded = primaryCount - finalQuestions.length;
    const usedIds = new Set(finalQuestions.map((q) => JSON.stringify(q.reactants)));
    const others = primaryPool.filter((q) => !usedIds.has(JSON.stringify(q.reactants)));
    finalQuestions.push(...others.slice(0, remainingNeeded));
  }
  while (finalQuestions.length < primaryCount && primaryPool.length) {
    finalQuestions.push(primaryPool[Math.floor(Math.random() * primaryPool.length)]);
  }

  if (mediumMixCount > 0) {
    let mixed = 0;
    for (const r of mediumPool) {
      if (mixed >= mediumMixCount) break;
      if (!finalQuestions.includes(r)) {
        finalQuestions.push(r);
        mixed++;
      }
    }
  }

  shuffleArray(finalQuestions);

  return {
    id: generateWorksheetId(),
    questions: finalQuestions,
    types: selectedTypes,
    difficulty,
    totalCount: count,
  };
};
