const LIMIT = 12;

// One-shot sounds wait here for the sound layer; the queue is capped so a muted room can't grow it.
export const pushSound = (lab, sound) => {
  if (lab.sounds.length >= LIMIT) lab.sounds.shift();
  lab.sounds.push(sound);
};
