// Davlat nomidan barqaror rang hosil qiladi (bir davlat yillar bo'ylab bir xil rangda).
const hash = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

export const colorForName = (name) => {
  if (!name) return "#6b7280";
  const h = hash(String(name)) % 360;
  return `hsl(${h}, 55%, 55%)`;
};
