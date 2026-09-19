// Virtual dissection layers, reusing the same Z-Anatomy GLB models as anatomy.
// Layers are ordered outer -> inner; only soft tissue is `clippable` (cut by the
// scalpel), organs stay whole so the cut reveals them intact.
import skinUrl from "@/shared/assets/models/skin.glb?url";
import myologyUrl from "@/shared/assets/models/myology.glb?url";
import angiologyUrl from "@/shared/assets/models/angiology.glb?url";
import splanchnologyUrl from "@/shared/assets/models/splanchnology.glb?url";

// Real body-surface mesh exported from Z-Anatomy ("Regions of human body"),
// meshopt-compressed to share the same coordinate space as the other layers.
// Painted one flat skin tone; clicking it shows a generic "Teri" detail.
export const SKIN_DETAIL = {
  label: "Teri",
  color: "#e8b89b",
  desc: "Tananing eng tashqi himoya qoplami - suv, mikrob va zararli ta'sirlardan himoya qiladi, harorat va sezgini boshqaradi.",
};

export const SURGERY_LAYERS = [
  { slug: "skin", title: "Teri", url: skinUrl, color: "#e8b89b", clippable: true, flatColor: "#e8b89b", detail: SKIN_DETAIL },
  { slug: "muscle", title: "Mushaklar", url: myologyUrl, color: "#c0392b", clippable: true },
  { slug: "vessels", title: "Qon-tomir", url: angiologyUrl, color: "#7b241c", clippable: true },
  { slug: "organs", title: "Ichki a'zolar", url: splanchnologyUrl, color: "#cd6155", clippable: false },
];

// One-click depth presets: each sets every layer's opacity (0 = hidden, 1 = solid).
export const SURGERY_PRESETS = [
  { id: "skin", name: "Teri (butun tana)", layers: { skin: 1, muscle: 0, vessels: 0, organs: 0 } },
  { id: "muscle", name: "Mushaklar", layers: { skin: 0, muscle: 1, vessels: 0, organs: 0 } },
  { id: "vessels", name: "Qon-tomir", layers: { skin: 0, muscle: 0.18, vessels: 1, organs: 0 } },
  { id: "organs", name: "Ichki a'zolar", layers: { skin: 0, muscle: 0.1, vessels: 0.28, organs: 1 } },
];

export const DEFAULT_PRESET = "skin";

export const getPreset = (id) =>
  SURGERY_PRESETS.find((p) => p.id === id) ||
  SURGERY_PRESETS.find((p) => p.id === DEFAULT_PRESET);
