// Pixel-art sprites: each row is a string, each char a palette key ("." = empty).

const INK = "#1d1330";

export const SPRITES = {
  logo: {
    colors: { k: INK, v: "#7c3aed", w: "#f5f3ff", g: "#a3e635", l: "#ecfccb", y: "#facc15" },
    rows: [
      ".kkkkkkkkkkkk.",
      "kvvvvvvvvvyvvk",
      "kvvvvwwwwyyyvk",
      "kvvvvvwwvvyvvk",
      "kvvvvvwwvvvvvk",
      "kvvvvvwwvvvvvk",
      "kvvvwwwwwwvvvk",
      "kvvwggggggwvvk",
      "kvvwglggggwvvk",
      "kvwggggglggwvk",
      "kvwggggggggwvk",
      "kvvwwwwwwwwvvk",
      "kvvvvvvvvvvvvk",
      ".kkkkkkkkkkkk.",
    ],
  },
  flask: {
    colors: { k: INK, w: "#f5f3ff", g: "#22c55e", l: "#86efac" },
    rows: [
      "....kkkk....",
      "....kwwk....",
      "....kwwk....",
      "....kwwk....",
      "...kwwwwk...",
      "..kwwwwwwk..",
      ".kggggggggk.",
      ".kgglgggggk.",
      "kggggggllggk",
      "kggggggggggk",
      "kggglggggggk",
      ".kkkkkkkkkk.",
    ],
  },
  planet: {
    colors: { k: INK, o: "#fb923c", d: "#ea580c", y: "#facc15" },
    rows: [
      "............",
      "....kkkk....",
      "..kkooookk..",
      ".kooooodook.",
      ".koooooddok.",
      "yyyyyyyyyyyy",
      ".kodooooook.",
      ".kooddooook.",
      "..kkooookk..",
      "....kkkk....",
    ],
  },
  chip: {
    colors: { k: INK, p: "#7c3aed", g: "#a78bfa", w: "#facc15", s: "#94a3b8" },
    rows: [
      "...s.s.s.s..",
      "..kkkkkkkkk.",
      "sskpppppppks",
      "..kpppppppk.",
      "sskpgggggpks",
      "..kpgwwggpk.",
      "sskpgggggpks",
      "..kpppppppk.",
      "sskpppppppks",
      "..kkkkkkkkk.",
      "...s.s.s.s..",
    ],
  },
  dome: {
    colors: { k: INK, t: "#14b8a6", l: "#5eead4", y: "#facc15", s: "#e7c08a", d: "#7c4a1e" },
    rows: [
      ".....yy.....",
      "....kttk....",
      "...kttttk...",
      "..kttltttk..",
      "..kttttttk..",
      ".kkkkkkkkkk.",
      ".kssssssssk.",
      ".ksskkkkssk.",
      ".ksskddkssk.",
      ".ksskddkssk.",
      ".ksskddkssk.",
      "kkkkkkkkkkkk",
    ],
  },
  star: {
    colors: { k: INK, y: "#facc15" },
    rows: [
      ".....kk.....",
      "....kyyk....",
      "....kyyk....",
      "kkkkyyyykkkk",
      "kyyyyyyyyyyk",
      ".kyykyykyyk.",
      "..kyyyyyyk..",
      "...kyyyyk...",
      "..kyyyyyyk..",
      "..kyykkyyk..",
      ".kyk....kyk.",
      ".kk......kk.",
    ],
  },
  heart: {
    colors: { k: INK, r: "#ef4444", p: "#fca5a5" },
    rows: [
      "............",
      "..kk....kk..",
      ".krrk..krrk.",
      "krprrkkrrrrk",
      "krprrrrrrrrk",
      "krrrrrrrrrrk",
      ".krrrrrrrrk.",
      "..krrrrrrk..",
      "...krrrrk...",
      "....krrk....",
      ".....kk.....",
    ],
  },
  bolt: {
    colors: { k: INK, b: "#3b82f6", c: "#93c5fd" },
    rows: [
      "......kkkkk.",
      ".....kbbbk..",
      "....kbcbk...",
      "...kbcbk....",
      "..kbbbbkkkk.",
      ".kbbccbbbbk.",
      ".kkkkkbbbk..",
      "....kbbbk...",
      "...kbbbk....",
      "..kbbk......",
      ".kbk........",
      ".kk.........",
    ],
  },
  atom: {
    colors: { o: "#8b5cf6", p: "#ec4899", w: "#fbcfe8", y: "#facc15" },
    rows: [
      "............",
      ".....oo.....",
      "...oo..oo...",
      "..y......o..",
      ".o...pp...o.",
      "o...pwpp...o",
      "o...pppp...o",
      ".o...pp...o.",
      "..o......y..",
      "...oo..oo...",
      ".....oo.....",
    ],
  },
  headset: {
    colors: { k: INK, v: "#8b5cf6", c: "#22d3ee", w: "#ecfeff" },
    rows: [
      "............",
      "..kkkkkkkk..",
      ".kvvvvvvvvk.",
      "kvvvvvvvvvvk",
      "kvccvvvvccvk",
      "kvcwvvvvcwvk",
      "kvccvkkvccvk",
      ".kvvk..kvvk.",
      "..kk....kk..",
    ],
  },
  robot: {
    colors: { k: INK, y: "#facc15", w: "#e2e8f0", c: "#22d3ee", v: "#8b5cf6" },
    rows: [
      ".....yy.....",
      ".....kk.....",
      "..kkkkkkkk..",
      ".kwwwwwwwwk.",
      ".kwccwwccwk.",
      ".kwccwwccwk.",
      ".kwwwwwwwwk.",
      ".kwwkkkkwwk.",
      "..kkkkkkkk..",
      "...kvvvvk...",
      "..kvvvvvvk..",
      "..kkkkkkkk..",
    ],
  },
  cube: {
    colors: { k: INK, t: "#c4b5fd", l: "#7c3aed", r: "#5b21b6" },
    rows: [
      ".....kk.....",
      "...kkttkk...",
      ".kkttttttkk.",
      "kttttttttttk",
      "kllllttrrrrk",
      "klllllrrrrrk",
      "klllllrrrrrk",
      "klllllrrrrrk",
      "klllllrrrrrk",
      ".kklllrrrkk.",
      "...kklrkk...",
      ".....kk.....",
    ],
  },
  gear: {
    colors: { k: INK, g: "#94a3b8", w: "#e2e8f0" },
    rows: [
      ".....kk.....",
      "..k.kggk.k..",
      ".kgkgwggkgk.",
      "..kggggggk..",
      ".kggkkkkggk.",
      "kgwgk..kgggk",
      "kgggk..kgggk",
      ".kggkkkkggk.",
      "..kggggggk..",
      ".kgkggggkgk.",
      "..k.kggk.k..",
      ".....kk.....",
    ],
  },
  bubble: {
    colors: { k: INK, w: "#ffffff", b: "#7c3aed" },
    rows: [
      "............",
      ".kkkkkkkkkk.",
      "kwwwwwwwwwwk",
      "kwwwwwwwwwwk",
      "kwwbwwbwwbwk",
      "kwwwwwwwwwwk",
      ".kkwkkkkkkk.",
      "..kwk.......",
      "..kk........",
    ],
  },
  phone: {
    colors: { k: INK, d: "#4c1d95", c: "#67e8f9", w: "#ecfeff" },
    rows: [
      "..kkkkkkkk..",
      "..kddddddk..",
      "..kcccccck..",
      "..kcwcccck..",
      "..kcccccck..",
      "..kccwwcck..",
      "..kcccccck..",
      "..kcccccck..",
      "..kddddddk..",
      "..kddwwddk..",
      "..kkkkkkkk..",
    ],
  },
  cursor: {
    colors: { k: INK, w: "#ffffff" },
    rows: [
      "k.......",
      "kk......",
      "kwk.....",
      "kwwk....",
      "kwwwk...",
      "kwwwwk..",
      "kwwwwwk.",
      "kwwwkkkk",
      "kwkwk...",
      "kk.kwk..",
      "...kwk..",
      "....k...",
    ],
  },
  sparkle: {
    colors: { y: "#facc15", w: "#fef9c3" },
    rows: [
      ".....y......",
      ".....y......",
      "....yyy.....",
      "yyyyywyyyy..",
      "....yyy.....",
      ".....y......",
      ".....y......",
      "............",
      "..........y.",
      ".........yyy",
      "..........y.",
    ],
  },
  flag: {
    colors: { k: INK, r: "#ef4444", w: "#ffffff" },
    rows: [
      "kk..........",
      "kkrrrrrrr...",
      "kkrrwrrrrr..",
      "kkrrrrrrrrr.",
      "kkrrrrrrr...",
      "kk..........",
      "kk..........",
      "kk..........",
      "kk..........",
      "kk..........",
      "kkkk........",
    ],
  },
  arrowDown: {
    colors: { p: "#7c3aed" },
    rows: ["ppppppp", ".ppppp.", "..ppp..", "...p..."],
  },
  dna: {
    colors: { b: "#3b82f6", r: "#ec4899", w: "#c4b5fd" },
    rows: [
      "bb........rr",
      ".bbwwwwwwrr.",
      "..bb....rr..",
      "...bbwwrr...",
      "....brrb....",
      "...rrwwbb...",
      "..rr....bb..",
      ".rrwwwwwwbb.",
      "rr........bb",
      ".rrwwwwwwbb.",
      "..rr....bb..",
      "...rrwwbb...",
    ],
  },
  island: {
    colors: { g: "#22c55e", l: "#86efac", d: "#a16207", b: "#713f12" },
    rows: [
      ".gggggggggggggg.",
      "gglggggggglggggg",
      "dddddddddddddddd",
      ".dddbdddddbdddd.",
      "..dddddddddddd..",
      "....dbdddddd....",
      "......dddd......",
    ],
  },
};

export const SUBJECT_SPRITES = {
  chemistry: "flask",
  biology: "dna",
  physics: "planet",
  electronics: "chip",
  history: "dome",
};

// Rows -> horizontal runs of one color, so an SVG needs far fewer <rect>s.
const runsCache = new Map();

export const getSpriteRuns = (name) => {
  if (runsCache.has(name)) return runsCache.get(name);
  const sprite = SPRITES[name];
  if (!sprite) return null;

  const width = Math.max(...sprite.rows.map((r) => r.length));
  const runs = [];
  sprite.rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      if (key !== ".") runs.push({ x, y, w: end - x, key });
      x = end;
    }
  });

  const result = { width, height: sprite.rows.length, runs };
  runsCache.set(name, result);
  return result;
};
