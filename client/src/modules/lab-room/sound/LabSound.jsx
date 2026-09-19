import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { objectType } from "../world/objectTypes";
import { createAudioEngine } from "./audioEngine";
import { createCues } from "./cues";
import { CLINKS, LOOPS, SHOTS, STEPS, loadSamples } from "./samples";

const STRIDE = 0.78;
const RUN_SPEED = 2.6;
const BELL_EVERY_S = 0.55;
const BELL_AT = [-4.5, 2.4, 3.95];
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const BUBBLE_MAX_HZ = 14;

const tmpDir = new Vector3();
const tmpRight = new Vector3();
const tmpTo = new Vector3();

// How loud and how far to the side a point in the room sounds from where the player stands.
const placeAt = (camera, position) => {
  if (!position) return { pan: 0, gain: 0.6 };
  tmpTo.set(position[0], position[1], position[2]).sub(camera.position);
  const distance = tmpTo.length();
  camera.getWorldDirection(tmpDir);
  tmpRight.set(-tmpDir.z, 0, tmpDir.x).normalize();
  const pan = distance > 0.05 ? Math.max(-0.85, Math.min(0.85, tmpTo.dot(tmpRight) / distance)) : 0;
  return { pan, gain: Math.min(1, 1.5 / (0.9 + distance * distance * 0.55)) };
};

const isGlass = (typeId) => Boolean(objectType(typeId)?.body?.breaks);

// Everything the room is doing this frame, collapsed into a few levels the voices can follow.
const survey = (world, lab, camera) => {
  const out = { fizz: 0, bubbles: 0, boil: 0, flame: 0, flameAt: null, fizzAt: null, loudest: 0, hottest: 0 };
  for (const object of world.store.get().objects) {
    const visual = lab.visual(object.id);
    const device = lab.device(object.id);
    const position = object.state === "held" ? lab.activity.heldPositions?.[object.id] ?? object.position : object.position;
    if (device?.lit) {
      const at = placeAt(camera, position);
      out.flame += 0.22 * at.gain;
      if (at.gain > out.hottest) {
        out.hottest = at.gain;
        out.flameAt = at;
      }
    }
    const fx = visual?.fx;
    if (!fx) continue;
    const at = placeAt(camera, position);
    const rate = fx.bubbles?.rate ?? 0;
    if (rate > 0) {
      out.fizz += (1 - Math.exp(-rate * 1.4)) * at.gain;
      out.bubbles += Math.min(BUBBLE_MAX_HZ, rate * 5) * at.gain;
      if (at.gain > out.loudest) {
        out.loudest = at.gain;
        out.fizzAt = at;
      }
    }
    if (fx.boiling) out.boil += fx.boiling * at.gain;
    if (fx.flame) {
      out.flame += (fx.flame.intensity ?? 1) * 0.5 * at.gain;
      if (at.gain > out.hottest) {
        out.hottest = at.gain;
        out.flameAt = at;
      }
    }
  }
  for (const fire of lab.hazards.fires()) {
    const at = placeAt(camera, fire.position);
    out.flame += 0.8 * at.gain;
    if (at.gain > out.hottest) {
      out.hottest = at.gain;
      out.flameAt = at;
    }
  }
  return out;
};

// Take, put down, break: the world store tells us what changed since the last frame.
const trackObjects = (world, lab, camera, seen, player, first) => {
  const objects = world.store.get().objects;
  const alive = new Set();
  for (const object of objects) {
    alive.add(object.id);
    const was = seen.get(object.id);
    seen.set(object.id, object.state);
    if (first || was === object.state) continue;
    const at = placeAt(camera, object.state === "held" ? lab.activity.cameraPosition : object.position);
    if (object.state === "held") {
      if (isGlass(object.typeId)) player.clink({ ...at, gain: at.gain * 0.45 });
      else player.click(true);
    } else if (object.state === "placed" && was) {
      if (isGlass(object.typeId)) player.clink(at);
      else player.thud(at);
    }
  }
  for (const [id, state] of seen) {
    if (alive.has(id)) continue;
    seen.delete(id);
    if (!first && state !== "held") player.shatter({ pan: 0, gain: 0.7 });
  }
};

// One-shot player: prefers the recording, falls back to the synthesised cue of the same name.
const createPlayer = (engine, cues, samples) => {
  const shot = (key, at, rate = 1) => {
    const buffer = samples[key];
    if (!buffer) return false;
    engine.play(buffer, at, { gain: SHOTS[key]?.gain ?? 1, rate, bus: key === "click" ? "ui" : "world" });
    return true;
  };
  return {
    footstep: (at, running) => {
      if (!shot(pick(STEPS), at, running ? 1.12 : 0.95 + Math.random() * 0.1)) cues.footstep(at, running);
    },
    clink: (at) => {
      if (!shot(pick(CLINKS), at, 0.92 + Math.random() * 0.18)) cues.clink(at);
    },
    thud: (at) => shot("thud", at, 0.9 + Math.random() * 0.2) || cues.thud(at),
    shatter: (at) => shot("shatter", at) || cues.shatter(at),
    pop: (at) => shot("pop", at, 0.9 + Math.random() * 0.25) || cues.pop(at),
    bang: (at, strength) => shot("bang", at, 0.85 + Math.random() * 0.2) || cues.bang(at, strength),
    whoosh: (at) => shot("ignite", at) || cues.whoosh(at),
    click: (soft) => shot("click", { pan: 0, gain: soft ? 0.55 : 1 }, soft ? 1.15 : 1) || cues.click(soft),
    bubble: (at) => cues.bubble(at),
  };
};

// A continuous voice from a recording, or the synthesised one when the file is missing.
const createVoices = (engine, cues, samples) => {
  // Synth voices are far louder per unit of level than a normalised recording, so they are scaled down.
  const loopOf = (key, bus, fallback) => {
    if (samples[key]) return engine.loop(samples[key], { bus, gain: LOOPS[key]?.gain ?? 1 });
    const synth = cues.voice(fallback);
    return { ...synth, set: (level, at, seconds) => synth.set(level * 0.3, at, seconds) };
  };
  return {
    hum: loopOf("hum", "ambience", { type: "lowpass", frequency: 160, tone: { frequency: 98, mix: 0.25 } }),
    fans: loopOf("fan", "ambience", { type: "lowpass", frequency: 300, tone: { frequency: 124, mix: 0.3 } }),
    flame: loopOf("flame", "world", { bus: "world", type: "lowpass", frequency: 420, Q: 0.7 }),
    fizz: loopOf("fizz", "world", { bus: "world", type: "highpass", frequency: 2600 }),
    boil: loopOf("boil", "world", { bus: "world", type: "bandpass", frequency: 1200, Q: 1.2 }),
    pour: loopOf("pour", "world", { bus: "world", type: "bandpass", frequency: 900, Q: 2.2 }),
    hiss: loopOf("hiss", "world", { bus: "world", type: "bandpass", frequency: 4200, Q: 0.6 }),
    bell: samples.bell ? engine.loop(samples.bell, { bus: "world", gain: LOOPS.bell.gain }) : null,
  };
};

const drainQueue = (lab, camera, player) => {
  const queue = lab.sounds;
  while (queue.length) {
    const sound = queue.shift();
    const at = placeAt(camera, sound.position);
    if (sound.type === "pop") player.pop(at);
    else if (sound.type === "bang") player.bang(at, sound.strength ?? 1);
    else if (sound.type === "shatter") player.shatter(at);
    else if (sound.type === "whoosh") player.whoosh(at);
    else if (sound.type === "click") player.click(sound.soft ?? false);
  }
};

const step = (audio, world, lab, camera, dt) => {
  const { player, voices, state } = audio;
  const survey_ = survey(world, lab, camera);

  // Footsteps from how far the player actually moved.
  const speed = state.last ? tmpTo.set(camera.position.x, 0, camera.position.z).distanceTo(state.last) / Math.max(dt, 1e-3) : 0;
  if (state.last) state.walked += tmpTo.set(camera.position.x, 0, camera.position.z).distanceTo(state.last);
  else state.last = new Vector3();
  state.last.set(camera.position.x, 0, camera.position.z);
  const running = speed > RUN_SPEED;
  if (state.walked > (running ? STRIDE * 0.8 : STRIDE)) {
    state.walked = 0;
    player.footstep({ pan: 0, gain: 1 }, running);
  }

  const pour = lab.activity.pour;
  const pourLevel = pour?.rate ? Math.min(1, 0.25 + pour.rate * 0.9) : 0;
  voices.pour.set(pourLevel * 0.9, pour ? placeAt(camera, pour.to ?? pour.from) : null);
  if (pourLevel > 0) voices.pour.tune(pourLevel);

  const spray = lab.activity.spray;
  voices.hiss.set(spray ? 0.8 : 0, spray ? placeAt(camera, spray.origin) : null, spray ? 0.05 : 0.25);

  voices.fizz.set(Math.min(0.8, survey_.fizz * 0.6), survey_.fizzAt);
  voices.boil.set(Math.min(0.7, survey_.boil * 0.8), survey_.fizzAt);
  voices.flame.set(Math.min(0.9, survey_.flame * 0.6), survey_.flameAt);

  const devices = lab.hazards.devices;
  const fans = (devices.hoodFan ? 0.5 : 0) + (devices.ventilation ? 0.5 : 0);
  voices.fans.set(fans * 0.5, null, 0.6);

  // Single bubbles on top of the fizz, at the rate the chemistry is making them.
  state.bubbleCarry += survey_.bubbles * dt;
  while (state.bubbleCarry >= 1) {
    state.bubbleCarry -= 1;
    player.bubble(survey_.fizzAt ?? { pan: 0, gain: 0.5 });
  }

  const ringing = lab.hazards.alarm.active;
  if (voices.bell) {
    voices.bell.set(ringing ? 0.85 : 0, placeAt(camera, BELL_AT), ringing ? 0.08 : 0.4);
  } else if (ringing) {
    state.bellIn -= dt;
    if (state.bellIn <= 0) {
      state.bellIn = BELL_EVERY_S;
      audio.cues.bell(placeAt(camera, BELL_AT));
    }
  }

  trackObjects(world, lab, camera, state.seen, player, state.first);
  state.first = false;
  drainQueue(lab, camera, player);
};

// Builds the audio graph on the first frame the player is in the room, then drives every voice.
const LabSound = ({ world, lab, live, settingsRef }) => {
  const audioRef = useRef(null);
  const hiddenRef = useRef(false);

  useEffect(() => {
    const audio = { engine: createAudioEngine(), cues: null, player: null, voices: null, samples: null, loading: null, state: null, volume: -1 };
    audioRef.current = audio;
    if (import.meta.env.DEV) window.__labAudio = audio;
    // A tab in the background should not keep humming.
    const onVisibility = () => {
      hiddenRef.current = document.hidden;
      if (document.hidden) audio.engine.mute();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (import.meta.env.DEV) delete window.__labAudio;
      for (const voice of Object.values(audio.voices ?? {})) voice.stop();
      audio.engine.dispose();
      audioRef.current = null;
    };
  }, []);

  useFrame(({ camera }, delta) => {
    const audio = audioRef.current;
    if (!audio) return;
    const wanted = settingsRef?.current?.sound ?? 0.7;
    const active = live && wanted > 0 && !hiddenRef.current;
    if (!active) {
      if (audio.volume > 0) {
        audio.engine.mute();
        audio.volume = 0;
      }
      return;
    }
    if (!audio.engine.ready) {
      audio.engine.enable(wanted);
      if (!audio.engine.context) return;
    }
    // The recordings load once; until they arrive the room stays quiet rather than half-synthesised.
    if (!audio.samples) {
      if (!audio.loading) audio.loading = loadSamples(audio.engine.context).then((samples) => { audio.samples = samples; });
      return;
    }
    if (!audio.player) {
      audio.cues = createCues(audio.engine);
      audio.player = createPlayer(audio.engine, audio.cues, audio.samples);
      audio.voices = createVoices(audio.engine, audio.cues, audio.samples);
      audio.state = { walked: 0, last: null, bubbleCarry: 0, bellIn: 0, seen: new Map(), first: true };
      audio.voices.hum.set(0.25, null, 1.5);
    }
    if (Math.abs(audio.volume - wanted) > 0.01) {
      audio.engine.setVolume(wanted);
      audio.volume = wanted;
    }
    step(audio, world, lab, camera, Math.min(delta, 0.1));
  }, 0.58);

  return null;
};

export default LabSound;
