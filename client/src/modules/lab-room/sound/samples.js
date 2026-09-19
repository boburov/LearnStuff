// Recordings cut from CC0 sources; see public/sounds/lab/SOURCE.md. Anything that fails to load
// falls back to the synthesised cue of the same name.
const BASE = "/sounds/lab/";

export const SHOTS = {
  step1: { gain: 0.5 },
  step2: { gain: 0.5 },
  step3: { gain: 0.5 },
  step4: { gain: 0.5 },
  clink: { gain: 0.5 },
  clink2: { gain: 0.5 },
  thud: { gain: 0.7 },
  shatter: { gain: 0.9 },
  pop: { gain: 0.6 },
  bang: { gain: 1 },
  click: { gain: 0.5 },
  ignite: { gain: 0.7 },
};

export const LOOPS = {
  pour: { gain: 1.1 },
  fizz: { gain: 0.9 },
  boil: { gain: 1 },
  flame: { gain: 1 },
  hiss: { gain: 1.1 },
  fan: { gain: 1 },
  hum: { gain: 1 },
  bell: { gain: 0.9 },
};

export const STEPS = ["step1", "step2", "step3", "step4"];
export const CLINKS = ["clink", "clink2"];

// Loads every clip once; a failed file simply stays missing.
export const loadSamples = async (ctx) => {
  const keys = [...Object.keys(SHOTS), ...Object.keys(LOOPS)];
  const entries = await Promise.all(
    keys.map(async (key) => {
      try {
        const res = await fetch(`${BASE}${key}.wav`);
        if (!res.ok) return null;
        return [key, await ctx.decodeAudioData(await res.arrayBuffer())];
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter(Boolean));
};
