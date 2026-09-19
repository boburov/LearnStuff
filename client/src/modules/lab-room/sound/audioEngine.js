// One Web Audio graph for the whole room: master → compressor → speakers, with three buses.
// Everything is synthesised, so the room stays silent until the player enters and costs no downloads.
const MASTER = 0.9;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const noiseBuffer = (ctx, seconds) => {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    // A touch of brown noise underneath keeps hisses from sounding thin.
    last = (last + 0.02 * white) / 1.02;
    data[i] = white * 0.75 + last * 3;
  }
  return buffer;
};

export const createAudioEngine = () => {
  let ctx = null;
  let master = null;
  let output = null;
  let noise = null;
  let volume = 0.7;
  let enabled = false;
  let dead = false;
  const buses = {};

  const build = () => {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch {
      return false;
    }
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.15;
    master.connect(comp).connect(ctx.destination);
    output = comp;
    for (const [name, level] of [["world", 1.6], ["ambience", 1], ["ui", 1.2]]) {
      const bus = ctx.createGain();
      bus.gain.value = level;
      bus.connect(master);
      buses[name] = bus;
    }
    noise = noiseBuffer(ctx, 2.5);
    return true;
  };

  const ramp = (param, value, seconds) => {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(value, t + Math.max(0.005, seconds));
  };

  const engine = {
    get context() {
      return ctx;
    },
    get ready() {
      return Boolean(ctx) && enabled;
    },
    now: () => ctx?.currentTime ?? 0,
    bus: (name) => buses[name] ?? buses.world,

    // The first call must come from a click: browsers refuse to start audio before a gesture.
    enable: async (level = volume) => {
      if (dead) return;
      if (!ctx && !build()) {
        dead = true;
        return;
      }
      volume = clamp(level, 0, 1);
      try {
        if (ctx.state !== "running") await ctx.resume();
      } catch {
        return;
      }
      enabled = true;
      ramp(master.gain, MASTER * volume, 0.25);
    },

    setVolume: (level) => {
      volume = clamp(level, 0, 1);
      if (ctx && enabled) ramp(master.gain, MASTER * volume, 0.12);
    },

    mute: () => {
      if (!ctx) return;
      enabled = false;
      ramp(master.gain, 0, 0.12);
    },

    // A panned, distance-attenuated tap into a bus; every voice is built on one of these.
    channel: (busName = "world") => {
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      gain.connect(panner).connect(engine.bus(busName));
      return { gain, panner, dispose: () => { gain.disconnect(); panner.disconnect(); } };
    },

    // One-shot from a recording: a fresh source per hit, with a small random pitch shift.
    play: (buffer, at, { gain = 1, rate = 1, bus = "world" } = {}) => {
      if (!ctx || !buffer) return;
      const out = engine.channel(bus);
      out.panner.pan.value = at?.pan ?? 0;
      out.gain.gain.value = (at?.gain ?? 1) * gain;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = rate;
      src.connect(out.gain);
      src.onended = () => {
        src.disconnect();
        out.dispose();
      };
      src.start();
    },

    // Continuous voice from a looping recording; the level is ramped, never switched.
    loop: (buffer, { bus = "ambience", gain = 1 } = {}) => {
      const out = engine.channel(bus);
      const env = ctx.createGain();
      env.gain.value = 0;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(env).connect(out.gain);
      src.start(0, Math.random() * buffer.duration);
      return {
        set: (level, at = null, seconds = 0.12) => {
          ramp(env.gain, Math.max(0, level) * gain, seconds);
          if (at) {
            ramp(out.panner.pan, at.pan, 0.2);
            ramp(out.gain.gain, at.gain, 0.2);
          }
        },
        // 0..1 "brighter and faster"; the synth voice in cues.js answers the same call with its filter.
        tune: (amount, seconds = 0.2) => ramp(src.playbackRate, 0.85 + 0.35 * Math.max(0, Math.min(1, amount)), seconds),
        stop: () => {
          try {
            src.stop();
          } catch {
            // already stopped
          }
          out.dispose();
        },
      };
    },

    source: () => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      return src;
    },

    filter: (type, frequency, Q = 1) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = frequency;
      f.Q.value = Q;
      return f;
    },

    gain: (value = 0) => {
      const g = ctx.createGain();
      g.gain.value = value;
      return g;
    },

    osc: (type, frequency) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = frequency;
      return o;
    },

    ramp,

    // Dev hook: an analyser on the room's own output, so a test can measure that a cue really sounds.
    tap: () => {
      if (!ctx || !output) return null;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      output.connect(analyser);
      return analyser;
    },

    dispose: () => {
      if (!ctx || dead) return;
      dead = true;
      enabled = false;
      ctx.close?.().catch(() => {});
      ctx = master = output = noise = null;
    },
  };
  return engine;
};
