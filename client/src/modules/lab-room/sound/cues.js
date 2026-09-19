// Every sound in the room, synthesised from noise and a few oscillators.
// One-shots take a place ({ pan, gain }) from listener.js; continuous voices are built once and follow a level.
const rand = (lo, hi) => lo + Math.random() * (hi - lo);

export const createCues = (engine) => {
  const ctx = engine.context;

  // Schedules a short voice and cleans it up when the source ends.
  const shot = (busName, build, duration) => {
    const out = engine.channel(busName);
    const stop = build(out, ctx.currentTime);
    const end = ctx.currentTime + duration;
    stop(end);
    setTimeout(() => out.dispose(), (duration + 0.2) * 1000);
    return out;
  };

  const place = (out, at) => {
    out.panner.pan.value = at?.pan ?? 0;
    out.gain.gain.value = at?.gain ?? 1;
  };

  const noiseBurst = (out, t, { duration, type, frequency, Q = 1, peak = 1, attack = 0.002 }) => {
    const src = engine.source();
    const filter = engine.filter(type, frequency, Q);
    const env = engine.gain(0);
    src.connect(filter).connect(env).connect(out.gain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.start(t, rand(0, 2));
    return { src, filter, end: t + duration };
  };

  const ping = (out, t, { frequency, duration, peak = 0.2, type = "sine" }) => {
    const osc = engine.osc(type, frequency);
    const env = engine.gain(0);
    osc.connect(env).connect(out.gain);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(peak, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.02);
    return osc;
  };

  const cues = {
    // Rubber soles on vinyl: a soft slap plus the floor's own thump.
    footstep: (at, running = false) =>
      shot("world", (out, t) => {
        place(out, at);
        const level = running ? 0.5 : 0.32;
        const burst = noiseBurst(out, t, { duration: 0.09, type: "bandpass", frequency: rand(850, 1250), Q: 1.1, peak: level });
        ping(out, t, { frequency: rand(95, 125), duration: 0.07, peak: level * 0.5 });
        return (end) => burst.src.stop(end + 0.02);
      }, 0.12),

    // Lab glass: three inharmonic partials over a tiny tick.
    clink: (at, size = 1) =>
      shot("world", (out, t) => {
        place(out, at);
        const base = 2600 / Math.max(0.6, size);
        for (const [ratio, peak, decay] of [[1, 0.16, 0.28], [1.58, 0.1, 0.22], [2.24, 0.06, 0.16]]) {
          ping(out, t, { frequency: base * ratio * rand(0.97, 1.03), duration: decay, peak });
        }
        const burst = noiseBurst(out, t, { duration: 0.02, type: "highpass", frequency: 4000, peak: 0.12 });
        return (end) => burst.src.stop(end + 0.02);
      }, 0.32),

    // Something without a ring to it (wood, plastic, a full bottle) meeting the bench.
    thud: (at) =>
      shot("world", (out, t) => {
        place(out, at);
        ping(out, t, { frequency: rand(150, 210), duration: 0.1, peak: 0.22 });
        const burst = noiseBurst(out, t, { duration: 0.07, type: "lowpass", frequency: 900, peak: 0.16 });
        return (end) => burst.src.stop(end + 0.02);
      }, 0.14),

    shatter: (at) =>
      shot("world", (out, t) => {
        place(out, at);
        const burst = noiseBurst(out, t, { duration: 0.45, type: "highpass", frequency: 2200, peak: 0.55 });
        for (let i = 0; i < 9; i += 1) {
          ping(out, t + rand(0.01, 0.26), { frequency: rand(2200, 6200), duration: rand(0.05, 0.16), peak: rand(0.05, 0.14) });
        }
        return (end) => burst.src.stop(end + 0.02);
      }, 0.5),

    // A single bubble breaking the surface.
    bubble: (at) =>
      shot("world", (out, t) => {
        place(out, at);
        const osc = engine.osc("sine", rand(160, 260));
        const env = engine.gain(0);
        osc.connect(env).connect(out.gain);
        osc.frequency.exponentialRampToValueAtTime(rand(420, 700), t + 0.045);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.11, t + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        osc.start(t);
        osc.stop(t + 0.08);
        return () => {};
      }, 0.1),

    // Cork-like pop from a small gas release.
    pop: (at) =>
      shot("world", (out, t) => {
        place(out, at);
        const osc = engine.osc("sine", 420);
        const env = engine.gain(0);
        osc.connect(env).connect(out.gain);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.07);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.3, t + 0.004);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.start(t);
        osc.stop(t + 0.12);
        const burst = noiseBurst(out, t, { duration: 0.03, type: "bandpass", frequency: 1800, peak: 0.14 });
        return (end) => burst.src.stop(end + 0.02);
      }, 0.14),

    // Hydrogen going off in a tube, or a dangerous mix: a crack and a low thump.
    bang: (at, strength = 1) =>
      shot("world", (out, t) => {
        place(out, at);
        const level = Math.min(1, 0.45 + strength * 0.5);
        const src = engine.source();
        const filter = engine.filter("lowpass", 4500, 0.8);
        const env = engine.gain(0);
        src.connect(filter).connect(env).connect(out.gain);
        filter.frequency.exponentialRampToValueAtTime(180, t + 0.35);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(level, t + 0.006);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        src.start(t, rand(0, 2));
        ping(out, t, { frequency: 58, duration: 0.3, peak: level * 0.7 });
        return (end) => src.stop(end + 0.02);
      }, 0.45),

    // Something catching fire.
    whoosh: (at) =>
      shot("world", (out, t) => {
        place(out, at);
        const src = engine.source();
        const filter = engine.filter("bandpass", 500, 0.7);
        const env = engine.gain(0);
        src.connect(filter).connect(env).connect(out.gain);
        filter.frequency.linearRampToValueAtTime(1600, t + 0.18);
        env.gain.setValueAtTime(0, t);
        env.gain.linearRampToValueAtTime(0.3, t + 0.06);
        env.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        src.start(t, rand(0, 2));
        return (end) => src.stop(end + 0.02);
      }, 0.38),

    // Wall switch, hotbar, cabinet: small dry clicks.
    click: (soft = false) =>
      shot("ui", (out, t) => {
        place(out, { pan: 0, gain: soft ? 0.5 : 0.9 });
        const burst = noiseBurst(out, t, { duration: 0.018, type: "highpass", frequency: 2600, peak: 0.3, attack: 0.001 });
        ping(out, t, { frequency: soft ? 900 : 1500, duration: 0.03, peak: 0.08, type: "triangle" });
        return (end) => burst.src.stop(end + 0.02);
      }, 0.06),

    // Fire alarm gong: one strike, repeated by the driver while the alarm rings.
    bell: (at) =>
      shot("world", (out, t) => {
        place(out, at);
        for (const [frequency, peak, decay] of [[820, 0.26, 0.55], [1230, 0.18, 0.45], [2150, 0.1, 0.3], [3050, 0.06, 0.2]]) {
          ping(out, t, { frequency: frequency * rand(0.995, 1.005), duration: decay, peak });
        }
        const burst = noiseBurst(out, t, { duration: 0.04, type: "bandpass", frequency: 3200, Q: 0.8, peak: 0.16 });
        return (end) => burst.src.stop(end + 0.02);
      }, 0.6),
  };

  // A continuous voice: noise through a filter, with a level that is ramped instead of switched.
  const voice = ({ bus = "ambience", type, frequency, Q = 1, tone = null }) => {
    const out = engine.channel(bus);
    const src = engine.source();
    const filter = engine.filter(type, frequency, Q);
    const env = engine.gain(0);
    src.connect(filter).connect(env).connect(out.gain);
    src.start(0, rand(0, 2));
    let osc = null;
    let oscGain = null;
    if (tone) {
      osc = engine.osc(tone.type ?? "sine", tone.frequency);
      oscGain = engine.gain(0);
      osc.connect(oscGain).connect(out.gain);
      osc.start(0);
    }
    return {
      filter,
      set: (level, at = null, seconds = 0.12) => {
        engine.ramp(env.gain, Math.max(0, level), seconds);
        if (oscGain) engine.ramp(oscGain.gain, Math.max(0, level) * (tone.mix ?? 0.5), seconds);
        if (at) {
          engine.ramp(out.panner.pan, at.pan, 0.2);
          engine.ramp(out.gain.gain, at.gain, 0.2);
        }
      },
      tune: (amount, seconds = 0.15) => engine.ramp(filter.frequency, frequency * (0.7 + 1.1 * amount), seconds),
      stop: () => {
        try {
          src.stop();
          osc?.stop();
        } catch {
          // already stopped
        }
        out.dispose();
      },
    };
  };

  return { ...cues, voice };
};
