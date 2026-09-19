import { SUBSTANCE_BY_ID } from "../substances/catalog";
import { SPECIES } from "../chemistry/species";
import { SUBSTANCE_PREFIX } from "../world/objectTypes";
import { isVessel } from "./actions";

const HISTORY_SHOWN = 3;

export const formatNumber = (value, digits = 1) => {
  const rounded = Math.abs(value) >= 10 || digits === 0 ? Math.round(value) : Number(value.toFixed(digits));
  return String(rounded).replace(".", ",");
};

const formatEntry = (entry) => {
  if (entry.unit === "ml") return `${formatNumber(entry.amount)} ml ${entry.label}`;
  if (entry.unit === "g") return `${formatNumber(entry.amount)} g ${entry.label}`;
  if (entry.unit === "piece") return `${Math.round(entry.amount)} bo'lak ${entry.label}`;
  return `${entry.label} gazi`;
};

const contentsLine = (lab, id) => {
  const mixture = lab.mixture(id);
  const visual = lab.visual(id);
  if (!mixture || !visual) return null;
  const parts = [];
  const entries = mixture.history.filter((h) => h.amount > 0.004);
  if (mixture.volumeMl <= 0.01 && !mixture.solids.length && !entries.length) parts.push("bo'sh");
  else if (entries.length) {
    const shown = entries.slice(-HISTORY_SHOWN).map(formatEntry).join(" + ");
    parts.push(entries.length > HISTORY_SHOWN ? `… + ${shown}` : shown);
  }
  const fx = visual.fx ?? {};
  if (fx.flame) parts.push("yonmoqda");
  else if (fx.boiling > 0.2) parts.push("qaynamoqda");
  else if ((fx.bubbles?.rate ?? 0) > 0.01) parts.push("gaz ajralmoqda");
  if (visual.bed.ml > 0.05 || visual.liquid.turbidity > 0.4) parts.push("cho'kma");
  parts.push(`${Math.round(visual.tempC)} °C`);
  return parts.join(" · ");
};

const deviceLine = (lab, object) => {
  const device = lab.device(object.id);
  if (!device) return null;
  const { typeId } = object;
  if (typeId === "spirit-lamp") return device.lit ? "yonib turibdi" : "o'chiq";
  if (typeId === "hot-plate") return `${Math.round(device.plateC)} °C${device.stir ? " · aralashtirgich yoqilgan" : ""}`;
  if (typeId === "thermometer") return `${formatNumber(device.readingC)} °C`;
  if (typeId === "digital-scale") return `${formatNumber(device.readingG, 2)} g`;
  if (typeId === "dropper") return device.fillMl > 0.02 ? `${formatNumber(device.fillMl, 2)} ml` : "bo'sh";
  if (typeId === "spatula") return device.load ? `${formatNumber(device.load.grams)} g ${SUBSTANCE_BY_ID[device.load.sourceId]?.formula ?? ""}` : null;
  if (typeId === "crucible-tongs" && device.piece) {
    const state = device.piece.state ?? {};
    const note = state.burning ? " · yonmoqda" : state.molten ? " · erigan" : "";
    return `${SPECIES[device.piece.species]?.formula ?? ""} bo'lagi${note}`;
  }
  if (typeId === "ph-paper" && device.strip) return `pH ≈ ${formatNumber(device.strip.ph, 0)}`;
  if (typeId.startsWith(SUBSTANCE_PREFIX)) {
    const substance = SUBSTANCE_BY_ID[typeId.slice(SUBSTANCE_PREFIX.length)];
    if (substance?.state === "liquid") return `${Math.round(substance.container.fillMl * device.remaining)} ml qoldi`;
  }
  return null;
};

// Second line of the look-at label: what is inside and how hot it is, or a device's reading.
export const describeObject = (lab, object) => {
  if (!lab || !object) return null;
  if (isVessel(object.typeId)) return contentsLine(lab, object.id);
  return deviceLine(lab, object);
};
