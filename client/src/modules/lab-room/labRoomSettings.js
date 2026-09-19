const STORAGE_KEY = "learnstuff:lab-room:settings";

export const DEFAULT_SETTINGS = {
  quality: null,
  sensitivity: 1,
  showFps: false,
  sound: 0.7,
  reduceMotion: false,
};

// textureCap: the largest texture the tier uploads (mipmapped RGBA ≈ 1.33·w·h·4 bytes each).
export const TIERS = {
  high: { dpr: [1, 1.75], effects: true, lightmap: "high", envSize: 256, printScale: 1, textureCap: 2048 },
  low: { dpr: 1, effects: false, lightmap: "low", envSize: 256, printScale: 0.5, textureCap: 1024 },
};

export const loadSettings = () => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private mode or blocked storage: settings just won't persist.
  }
};

const LOW_GPU = /(intel|mali|adreno|powervr|videocore|swiftshader|llvmpipe|softpipe|basic render)/i;
const HIGH_GPU = /(apple m\d|apple gpu|nvidia|geforce|quadro|rtx|radeon rx|radeon pro|arc\(tm\) a|arc a\d)/i;

const readRenderer = () => {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) return null;
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = String(
    debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  );
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return renderer;
};

// Integrated/unknown GPUs default to Low; the user can switch in the Sifat menu.
export const detectDevice = () => {
  const renderer = readRenderer();
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fine = window.matchMedia("(any-pointer: fine)").matches;
  const headset = /OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent);

  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;
  const strongGpu = renderer && HIGH_GPU.test(renderer) && !LOW_GPU.test(renderer);
  const recommended = strongGpu && cores > 4 && memory > 4 ? "high" : "low";

  return {
    webgl2: Boolean(renderer),
    touchOnly: (coarse && !fine) || headset,
    renderer: renderer || "",
    recommended,
  };
};
