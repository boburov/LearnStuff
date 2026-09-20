// Tarixiy atlas uchun mavjud yil snapshotlari (public/history/atlas/world_<year>.geojson).
// Manba: Historical Basemaps (aourednik/historical-basemaps), ochiq ma'lumot.
export const YEARS = [
  200, 500, 800, 1000, 1200, 1300, 1400, 1500, 1600, 1700, 1783, 1800, 1815,
  1880, 1900, 1914, 1920, 1938, 1945, 1960, 1994, 2000,
];

export const MIN_YEAR = YEARS[0];
export const MAX_YEAR = YEARS[YEARS.length - 1];

// Slider qiymati (istalgan yil) uchun eng yaqin mavjud snapshotni topadi.
export const nearestYear = (value) =>
  YEARS.reduce((best, y) =>
    Math.abs(y - value) < Math.abs(best - value) ? y : best,
  );

export const geojsonUrl = (year) => `/history/atlas/world_${year}.geojson`;

// Yilni "1783" yoki "200-yil" ko'rinishida ko'rsatish.
export const formatYear = (year) => `${year}-yil`;
