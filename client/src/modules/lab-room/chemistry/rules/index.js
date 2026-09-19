import { ACID_BASE_RULES } from "./acidBase";
import { PRECIPITATION_RULES } from "./precipitation";
import { COMPLEX_RULES } from "./complexes";
import { REDOX_RULES } from "./redox";
import { GAS_RULES } from "./gases";
import { CATALYSIS_RULES } from "./catalysis";
import { METAL_RULES } from "./metals";
import { ALKALI_RULES } from "./alkali";
import { HEATING_RULES } from "./heating";
import { COMBUSTION_RULES } from "./combustion";
import { DANGER_RULES } from "./danger";
import { PHYSICAL_RULES } from "./physical";

// Order matters: fast ionic equilibria first so later rules see settled concentrations, slow physical changes last.
export const RULES = [
  ...ACID_BASE_RULES,
  ...PRECIPITATION_RULES,
  ...COMPLEX_RULES,
  ...REDOX_RULES,
  ...GAS_RULES,
  ...CATALYSIS_RULES,
  ...METAL_RULES,
  ...ALKALI_RULES,
  ...HEATING_RULES,
  ...COMBUSTION_RULES,
  ...DANGER_RULES,
  ...PHYSICAL_RULES,
];
