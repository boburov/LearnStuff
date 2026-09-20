// Real engine recording (CC0, see public/sounds/engine/SOURCE.md): start clip + one steady idle loop.
const BASE = "/sounds/engine/";
const FILES = { start: "engine-start.wav", idle: "engine-idle-loop.wav" };

const MASTER_GAIN = 0.8;
// Ignition catches ~1 s into the start clip; the loop fades in from there.
const CATCH_AT = 1.0;
const RESTART_GRACE_MS = 1500;
// One voice only: a second copy of this periodic sound beats against it and pumps the volume.
const VOICES = [{ detune: 1, offset: 0 }];

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Slider rpm (10..600, slow-motion animation) → 0..1 between idle and high revs.
const revAmount = (rpm) => clamp01(Math.log(Math.max(rpm, 10) / 10) / Math.log(60));

export const createEngineSound = () => {
  let ctx = null;
  let master = null;
  let tone = null;
  let level = null;
  let envelope = null;
  let voices = null;
  let buffers = null;
  let loading = null;
  let startSrc = null;
  let session = 0;
  let enabled = false;
  let disposed = false;
  let unsupported = false;
  let running = false;
  let engineOn = false;
  let stoppedAt = -Infinity;
  let rpm = 40;
  let suspendTimer = null;

  const build = () => {
    const AC = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    if (!AC) {
      unsupported = true;
      return false;
    }
    try {
      ctx = new AC();
    } catch {
      unsupported = true;
      return false;
    }
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 3;
    tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 2000;
    tone.connect(master).connect(comp).connect(ctx.destination);
    // envelope = engine on/off, level = loudness by rpm; kept separate so they never cancel each other.
    level = ctx.createGain();
    envelope = ctx.createGain();
    envelope.gain.value = 0;
    level.connect(envelope).connect(tone);
    return true;
  };

  const load = () => {
    if (!loading) {
      loading = Promise.all(
        Object.entries(FILES).map(async ([key, file]) => {
          const res = await fetch(BASE + file);
          if (!res.ok) throw new Error(file);
          return [key, await ctx.decodeAudioData(await res.arrayBuffer())];
        }),
      )
        .then((entries) => {
          buffers = Object.fromEntries(entries);
        })
        .catch(() => {
          loading = null;
        });
    }
    return loading;
  };

  const rampTo = (param, value, seconds) => {
    const t = ctx.currentTime;
    param.cancelScheduledValues(t);
    param.setValueAtTime(param.value, t);
    param.linearRampToValueAtTime(value, t + seconds);
  };

  const ensureVoices = () => {
    if (voices || !buffers) return;
    voices = VOICES.map(({ detune, offset }) => {
      const src = ctx.createBufferSource();
      src.buffer = buffers.idle;
      src.loop = true;
      src.connect(level);
      src.start(0, offset % buffers.idle.duration);
      return { src, detune };
    });
    applyRpm(0);
  };

  function applyRpm(seconds = 0.15) {
    if (!voices) return;
    const x = revAmount(rpm);
    const rate = 0.9 + 1.1 * x;
    for (const v of voices) rampTo(v.src.playbackRate, rate * v.detune, seconds);
    rampTo(level.gain, 0.55 + 0.45 * x, seconds);
    rampTo(tone.frequency, 1500 + 5500 * x, seconds);
  }

  const stopStartClip = () => {
    if (!startSrc) return;
    try {
      startSrc.stop();
    } catch {
      // already ended
    }
    startSrc = null;
  };

  const turnOn = () => {
    ensureVoices();
    if (!voices) return;
    engineOn = true;
    const t = ctx.currentTime;
    const env = envelope.gain;
    if (performance.now() - stoppedAt < RESTART_GRACE_MS) {
      rampTo(env, 1, 0.12);
      return;
    }
    stopStartClip();
    const src = ctx.createBufferSource();
    src.buffer = buffers.start;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.9, t);
    gain.gain.setValueAtTime(0.9, t + CATCH_AT);
    gain.gain.linearRampToValueAtTime(0, t + CATCH_AT + 0.3);
    src.connect(gain).connect(tone);
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
      if (startSrc === src) startSrc = null;
    };
    src.start(t);
    startSrc = src;
    env.cancelScheduledValues(t);
    env.setValueAtTime(0, t);
    env.setValueAtTime(0, t + CATCH_AT - 0.05);
    env.linearRampToValueAtTime(1, t + CATCH_AT + 0.25);
  };

  const turnOff = () => {
    engineOn = false;
    stoppedAt = performance.now();
    stopStartClip();
    if (voices) rampTo(envelope.gain, 0, 0.35);
  };

  const sync = () => {
    if (!enabled || !buffers) return;
    if (running && !engineOn) turnOn();
    else if (!running && engineOn) turnOff();
  };

  return {
    async enable() {
      if (disposed || unsupported) return;
      if (!ctx && !build()) return;
      clearTimeout(suspendTimer);
      suspendTimer = null;
      const mine = ++session;
      try {
        if (ctx.state !== "running") await ctx.resume();
        await load();
      } catch {
        return;
      }
      if (mine !== session || disposed || !buffers) return;
      enabled = true;
      rampTo(master.gain, MASTER_GAIN, 0.08);
      ensureVoices();
      applyRpm(0);
      sync();
    },

    disable() {
      if (!ctx || disposed) return;
      const mine = ++session;
      enabled = false;
      engineOn = false;
      stopStartClip();
      rampTo(master.gain, 0, 0.06);
      if (voices) rampTo(envelope.gain, 0, 0.06);
      clearTimeout(suspendTimer);
      suspendTimer = setTimeout(() => {
        suspendTimer = null;
        if (mine === session && ctx) ctx.suspend().catch(() => {});
      }, 250);
    },

    setRunning(on) {
      running = !!on;
      sync();
    },

    setRpm(value) {
      const next = Number.isFinite(value) ? Math.max(0, value) : 0;
      if (Math.abs(next - rpm) < 0.5) return;
      rpm = next;
      if (ctx && voices) applyRpm();
    },

    // The recording already contains combustion and valve noise.
    fire() {},
    valve() {},

    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      session++;
      clearTimeout(suspendTimer);
      suspendTimer = null;
      if (!ctx) return;
      stopStartClip();
      for (const v of voices ?? []) {
        try {
          v.src.stop();
        } catch {
          // already stopped
        }
        v.src.disconnect();
      }
      ctx.close?.().catch(() => {});
      ctx = master = tone = level = envelope = voices = buffers = null;
    },
  };
};
