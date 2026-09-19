import { pushSound } from "../sound/queue";

// Fittings baked into the room that the player still uses: the computer screen, the two fan switches
// and the extinguisher bracket. Each is hit-tested as a rectangle on the wall plane it sits in.
export const PANELS = {
  monitor_screen: { axis: "z", pad: 0, title: "Laboratoriya kompyuteri", subtitle: "Oxirgi reaksiya haqida ma'lumot", label: "O'qish" },
  fumehood_switch: { axis: "x", pad: 0.09, title: "Mo'rili shkaf so'rg'ichi", device: "hoodFan" },
  ventilation_switch: { axis: "x", pad: 0.09, title: "Xona shamollatgichi", device: "ventilation" },
  extinguisher: { axis: "z", pad: 0.06, title: "O't o'chirgich", fixture: "extinguisher" },
};

const AXIS = { x: 0, y: 1, z: 2 };

// Distance along the ray to the panel's rectangle, or null when the ray misses it.
export const panelAlong = (anchor, panel, origin, direction, limit) => {
  const axis = AXIS[panel.axis];
  const dir = axis === 0 ? direction.x : direction.z;
  if (!anchor || Math.abs(dir) < 1e-4) return null;
  const from = axis === 0 ? origin.x : origin.z;
  const t = (anchor.position[axis] - from) / dir;
  if (t <= 0 || t > limit) return null;
  // Width runs along the free horizontal axis, height along y.
  const across = axis === 0 ? origin.z + direction.z * t - anchor.position[2] : origin.x + direction.x * t - anchor.position[0];
  const up = origin.y + direction.y * t - anchor.position[1];
  const [width, height] = anchor.size;
  return Math.abs(across) <= width / 2 + panel.pad && Math.abs(up) <= height / 2 + panel.pad ? t : null;
};

// The nearest panel the player is looking at, with the action it offers right now.
export const panelAt = ({ anchors, lab, world, held, origin, direction, limit }) => {
  let best = null;
  for (const [id, panel] of Object.entries(PANELS)) {
    const t = panelAlong(anchors?.[id], panel, origin, direction, limit);
    if (t == null || (best && t >= best.distance)) continue;
    best = { id, panel, distance: t };
  }
  if (!best) return null;
  const { panel } = best;
  if (panel.device) {
    const on = lab.hazards.devices[panel.device];
    return { ...best, label: on ? "O'chirish" : "Yoqish", subtitle: on ? "Hozir ishlayapti" : "Hozir o'chiq" };
  }
  if (panel.fixture) {
    const carried = world.store.get().objects.some((o) => o.typeId === panel.fixture);
    if (held?.typeId === panel.fixture) return { ...best, label: "Joyiga qo'yish", subtitle: null };
    if (carried) return null;
    if (held) return { ...best, label: "Avval qo'lingizdagini qo'ying", subtitle: null, disabled: true };
    return { ...best, label: "Olish", subtitle: "Yong'inni o'chirish uchun" };
  }
  if (held) return null;
  return { ...best, label: panel.label, subtitle: panel.subtitle };
};

// Returns "monitor" when the player opened the lab computer, so the page can show the reader.
export const runPanel = (hit, { lab, world, held }) => {
  if (!hit || hit.disabled) return null;
  const { panel } = hit;
  if (panel.device) {
    const next = !lab.hazards.devices[panel.device];
    lab.hazards.setDevice(panel.device, next);
    pushSound(lab, { type: "click" });
    world.flash(`${panel.title}: ${next ? "yoqildi" : "o'chirildi"}`);
    return null;
  }
  if (panel.fixture) {
    if (held?.typeId === panel.fixture) {
      world.removeHeld(held.id);
      return null;
    }
    const result = world.addToSlot(panel.fixture);
    if (!result.ok) world.flash("Barcha 5 joy band: avval biror narsani qo'ying");
    return null;
  }
  return hit.id === "monitor_screen" ? "monitor" : null;
};
