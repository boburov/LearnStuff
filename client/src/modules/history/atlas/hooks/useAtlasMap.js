import { useCallback, useEffect, useRef } from "react";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
// maplibre worker'ini o'zi import.meta.url orqali qidiradi — bundle qilingach bu manzil
// mavjud bo'lmay qoladi va GeoJSON qatlamlari (worker'da parse qilinadi) chizilmaydi.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { geojsonUrl } from "../data/atlasYears";

setWorkerUrl(maplibreWorkerUrl);

// Matnsiz (labels-free) toza raster fon — fonda shahar/viloyat nomlari chalkashtirmasligi uchun.
// CARTO "light_nolabels" (kalitsiz, bepul). Faqat relyef/tekstura ko'rinadi.
const BASE_STYLE = {
  version: 8,
  glyphs: "https://fonts.openmaptiles.org/{fontstack}/{range}.pbf",
  sources: {
    base: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap © CARTO",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

const SRC = "historical";
const LABEL_SRC = "historical-labels";

// Halqa (ring) yuzasi va markazini (centroid) hisoblaydi — nom joylashuvi uchun.
function ringCentroid(ring) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, n = ring.length - 1; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (!area) return { area: 0, point: ring[0] };
  return { area: Math.abs(area), point: [cx / (6 * area), cy / (6 * area)] };
}

// Davlatning eng katta bo'lagi markazini {area, point} ko'rinishida qaytaradi.
function labelPoint(geometry) {
  if (!geometry) return null;
  const polys =
    geometry.type === "Polygon"
      ? [geometry.coordinates]
      : geometry.type === "MultiPolygon"
        ? geometry.coordinates
        : [];
  let best = null;
  for (const poly of polys) {
    const outer = poly[0];
    if (!outer || outer.length < 4) continue;
    const c = ringCentroid(outer);
    if (!best || c.area > best.area) best = c;
  }
  return best;
}

// Xaritani yaratadi va tarixiy qatlamni boshqaradi.
// onPick(props|null) — davlat bosilganda chaqiriladi.
export function useAtlasMap({ containerRef, onPick }) {
  const mapRef = useRef(null);
  const readyRef = useRef(false); // source/qatlamlar qo'shilganmi
  const onPickRef = useRef(onPick);
  const pendingRef = useRef(null); // {year, colorForName} — hali qo'llanmagan so'rov

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  // Tanlangan yil uchun GeoJSON ni yuklab, qatlamga uzatadi (source mavjud bo'lganda).
  // Har bir davlat uchun bitta markaz nuqtasi (label source) hisoblanadi —
  // nom hududning eng katta bo'lagi markazida, bir marta chiqadi.
  const applyYear = useCallback(async (year, colorForName) => {
    const map = mapRef.current;
    if (!map) return;
    const res = await fetch(geojsonUrl(year));
    const data = await res.json();

    // Bir xil nomli feature'larni birlashtiramiz: nom eng katta bo'lakda bir marta chiqadi.
    const byName = new Map();
    for (const f of data.features) {
      f.properties = f.properties || {};
      f.properties._color = colorForName(f.properties.NAME);
      const name = f.properties.NAME;
      if (!name) continue;
      const c = labelPoint(f.geometry);
      if (!c) continue;
      const prev = byName.get(name);
      if (!prev || c.area > prev.area) byName.set(name, c);
    }

    const labels = [...byName.entries()].map(([name, c]) => ({
      type: "Feature",
      properties: { NAME: name },
      geometry: { type: "Point", coordinates: c.point },
    }));

    const src = map.getSource(SRC);
    if (src) src.setData(data);
    const lsrc = map.getSource(LABEL_SRC);
    if (lsrc) lsrc.setData({ type: "FeatureCollection", features: labels });
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;
    const map = new MapLibreMap({
      container,
      style: BASE_STYLE,
      center: [68.69, 41.34], // Markaziy Osiyo (linkdagi pozitsiya)
      zoom: 4,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), "top-right");

    // Konteyner o'lchami kech aniqlansa (0x0 bo'lib qolmasligi uchun) qayta o'lchash.
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container);

    map.on("load", () => {
      map.resize();
      map.addSource(SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      // Nomlar uchun alohida markaz-nuqta source'i (har davlat bitta nuqta).
      map.addSource(LABEL_SRC, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // To'ldirilgan hududlar (yarim shaffof — fon tekstura ko'rinib turadi).
      map.addLayer({
        id: "hist-fill",
        type: "fill",
        source: SRC,
        paint: {
          "fill-color": ["coalesce", ["get", "_color"], "#888"],
          "fill-opacity": 0.5,
        },
      });
      // Chegara chiziqlari.
      map.addLayer({
        id: "hist-line",
        type: "line",
        source: SRC,
        paint: {
          "line-color": "#1f2937",
          "line-width": 0.8,
          "line-opacity": 0.7,
        },
      });
      // Davlat nomlari — hududning markaz nuqtasida (bir marta).
      map.addLayer({
        id: "hist-label",
        type: "symbol",
        source: LABEL_SRC,
        layout: {
          "text-field": ["get", "NAME"],
          "text-size": 13,
          "text-font": ["Noto Sans Regular"],
          "text-max-width": 8,
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "#0f172a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.6,
        },
      });

      map.on("click", "hist-fill", (e) => {
        const f = e.features?.[0];
        if (f) onPickRef.current?.(f.properties);
      });
      map.on("click", (e) => {
        const hits = map.queryRenderedFeatures(e.point, { layers: ["hist-fill"] });
        if (!hits.length) onPickRef.current?.(null);
      });
      map.on("mouseenter", "hist-fill", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "hist-fill", () => (map.getCanvas().style.cursor = ""));

      readyRef.current = true;
      // Load'gacha so'ralgan yil bo'lsa — endi qo'llaymiz.
      if (pendingRef.current) {
        const { year, colorForName } = pendingRef.current;
        pendingRef.current = null;
        applyYear(year, colorForName);
      }
    });

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, [containerRef, applyYear]);

  // Sahifa chaqiradi: yil o'zgarsa. Source tayyor bo'lmasa — navbatga qo'yiladi.
  const setYear = useCallback(
    (year, colorForName) => {
      if (readyRef.current) applyYear(year, colorForName);
      else pendingRef.current = { year, colorForName };
    },
    [applyYear],
  );

  return { mapRef, setYear };
}
