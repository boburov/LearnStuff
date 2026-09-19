// Human Atlas statik fayllari (public/models/atlas). Backend emas, shuning
// uchun axios http o'rniga oddiy fetch - baseURL API'ga emas, saytga ishora qiladi.
export const ATLAS_MANIFEST_URL = "/models/atlas/atlas.json";

export const atlasAPI = {
  manifest: (signal) =>
    fetch(ATLAS_MANIFEST_URL, { signal }).then((r) => {
      if (!r.ok) throw new Error("Anatomiya katalogi yuklanmadi.");
      return r.json();
    }),
};

// Chunk .gz bo'lib keladi; host Content-Encoding bilan o'zi ochib bergan bo'lsa
// ikki marta ochmaslik uchun gzip sarlavhasini (1f 8b) tekshiramiz.
export const fetchChunk = async (chunk, signal) => {
  const res = await fetch(chunk.url, { signal });
  if (!res.ok) throw new Error("Anatomiya fayli yuklanmadi.");
  const payload = await res.arrayBuffer();
  const sig = new Uint8Array(payload, 0, Math.min(2, payload.byteLength));
  const isGzip = sig[0] === 0x1f && sig[1] === 0x8b;
  let buffer = payload;
  if (isGzip) {
    if (typeof DecompressionStream === "undefined")
      throw new Error("Brauzeringiz siqilgan modelni ocha olmaydi. Yangiroq brauzer ishlating.");
    buffer = await new Response(
      new Blob([payload]).stream().pipeThrough(new DecompressionStream("gzip")),
    ).arrayBuffer();
  }
  if (buffer.byteLength !== chunk.bytes)
    throw new Error("Anatomiya fayli to'liq yuklanmadi. Sahifani yangilang.");
  return buffer;
};
