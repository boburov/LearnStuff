import { objectType } from "./objectTypes";

const LMB = "Chap tugma";

export const displayName = (typeId) => {
  const type = objectType(typeId);
  if (!type) return "";
  return type.kind === "substance" ? `${type.name} · ${type.substance.formula}` : type.name;
};

export const PROMPTS = {
  reasons: {
    surface: "Bu yerga qo'yib bo'lmaydi",
    support: "Bu narsaning ustiga qo'yib bo'lmaydi",
    blocked: "Bu joy band",
    far: "Qo'yish uchun stolga yaqinroq qarang",
    occupied: "Avval ustidagi narsani oling",
    full: "Barcha 5 joy band: avval biror narsani qo'ying",
  },

  holding: (held, placement, subtitle = null) => {
    const reason = placement ? placement.reason : "far";
    const actions = [
      { keys: [LMB], label: placement?.valid ? "Qo'yish" : PROMPTS.reasons[reason], disabled: !placement?.valid },
      { keys: ["G"], label: "Tashlash" },
    ];
    return {
      key: `hold:${held.id}:${placement?.valid ?? "none"}:${reason}:${subtitle}`,
      title: displayName(held.typeId),
      subtitle,
      actions,
    };
  },

  focus: (object, subtitle = null) =>
    object && {
      key: `focus:${object.id}:${subtitle}`,
      title: displayName(object.typeId),
      subtitle,
      actions: [{ keys: [LMB], label: "Olish" }],
    },

  action: (action, target, subtitle, held) => {
    const actions = [
      {
        keys: [action.mode === "hold" ? `${LMB} (bosib turing)` : LMB],
        label: action.label,
        disabled: !action.valid,
      },
    ];
    if (held) actions.push({ keys: ["G"], label: "Tashlash" });
    return {
      key: `act:${action.id}:${action.targetId}:${action.label}:${action.valid}:${subtitle}`,
      title: target ? displayName(target.typeId) : action.label,
      subtitle,
      actions,
    };
  },

  progress: (info) =>
    info && { key: `progress:${info.title}:${info.subtitle}`, title: info.title, subtitle: info.subtitle, actions: [] },

  // Wall fittings: the computer screen, the fan switches and the extinguisher bracket.
  panel: (hit) => ({
    key: `panel:${hit.id}:${hit.label}`,
    title: hit.panel.title,
    subtitle: hit.subtitle,
    actions: [{ keys: [LMB], label: hit.label, disabled: Boolean(hit.disabled) }],
  }),
};
