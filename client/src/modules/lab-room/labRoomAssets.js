import { PLACEHOLDER_COLLIDERS, PLACEHOLDER_META } from "./scene/placeholderLayout";

const BASE = "/models/lab-room";

export const ROOM_ASSETS = {
  glb: `${BASE}/room.glb`,
  lightmap: { high: `${BASE}/lightmap-high.webp`, low: `${BASE}/lightmap-low.webp` },
  colliders: `${BASE}/colliders.json`,
  meta: `${BASE}/room-meta.json`,
  exterior: `${BASE}/exterior.jpg`,
};

// The dev server answers missing files with index.html, so "ok" alone doesn't mean the file exists.
const fetchJson = async (url) => {
  const res = await fetch(url, { cache: "no-cache" });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || type.includes("text/html")) throw new Error(`missing ${url}`);
  return res.json();
};

const fileExists = async (url) => {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-cache" });
    const type = res.headers.get("content-type") || "";
    return res.ok && !type.includes("text/html");
  } catch {
    return false;
  }
};

export const loadRoomManifest = async () => {
  try {
    const [meta, colliders, hasGlb] = await Promise.all([
      fetchJson(ROOM_ASSETS.meta),
      fetchJson(ROOM_ASSETS.colliders),
      fileExists(ROOM_ASSETS.glb),
    ]);
    if (!hasGlb) throw new Error("missing room.glb");
    return { placeholder: false, meta, boxes: colliders.boxes ?? [] };
  } catch {
    return { placeholder: true, meta: PLACEHOLDER_META, boxes: PLACEHOLDER_COLLIDERS };
  }
};
