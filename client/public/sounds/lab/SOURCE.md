# Lab room sound sources

Every file is cut from a Creative Commons 0 (public domain) recording on freesound.org.
CC0 needs no attribution; the sources are listed so a cut can be redone or replaced.

Processing (ffmpeg + a Python pass): mono, 32 kHz, 16-bit WAV, trimmed to the region below and
peak-normalised (one-shots) or RMS-normalised (loops). Each loop folds its last 0.35 s back over
its first 0.35 s, so it repeats without a click — see the engine-sound note in this repo for why
loop choice matters.

| file | used for | cut | source | author | freesound |
|---|---|---|---|---|---|
| `bang.wav` | explosion | 0.00–0.95 s | small explosion | bevibeldesign | [315826](https://freesound.org/s/315826/) |
| `bell.wav` | fire alarm | 0.30–2.30 s, looped | fire alarm bell | msx2plus | [678345](https://freesound.org/s/678345/) |
| `boil.wav` | boiling | 6.2–9.7 s, looped | Boiling Pot of Water | monsterthing | [456382](https://freesound.org/s/456382/) |
| `click.wav` | switches and knobs | 0.02–0.12 s | Switch Light 05.wav | tbrook | [348225](https://freesound.org/s/348225/) |
| `clink.wav` | glass picked up or set down | 0.19–0.42 s | clinking glass.aiff | TheWah | [104815](https://freesound.org/s/104815/) |
| `clink2.wav` | glass picked up or set down | 0.44–0.67 s | clinking glass.aiff | TheWah | [104815](https://freesound.org/s/104815/) |
| `fan.wav` | fume hood and room fans | 13.0–17.0 s, looped | Fan looping.wav | jgxxx | [704393](https://freesound.org/s/704393/) |
| `fizz.wav` | bubbling and fizzing | 21.25–25.25 s, looped | water bubbles.wav | Chrisfiedlermusic | [610010](https://freesound.org/s/610010/) |
| `flame.wav` | lamp, reaction and spill fires | 0.75–4.75 s, looped | Fire Burning Loop | midimagician | [249418](https://freesound.org/s/249418/) |
| `hiss.wav` | extinguisher jet | 0.55–2.75 s, looped | Hissing Sound.wav | Yin_Yang_Jake007 | [406089](https://freesound.org/s/406089/) |
| `hum.wav` | room tone | 1.75–7.75 s, looped | Apartment Room Tone.wav | cMilan | [426767](https://freesound.org/s/426767/) |
| `ignite.wav` | something catching fire | 0.00–1.00 s | Match strike 03 | scalywhale | [423811](https://freesound.org/s/423811/) |
| `pop.wav` | small gas pop | 0.16–0.60 s | Pop sound | deraj | [202230](https://freesound.org/s/202230/) |
| `pour.wav` | pouring | 0.55–2.75 s, looped | Water Being Poured Into a Wine Glass, Water Poured into Pitcher.wav | danhelbling | [272397](https://freesound.org/s/272397/) |
| `shatter.wav` | breaking glass | 0.00–1.50 s | Breaking Glass Stereo | GN2013 | [199906](https://freesound.org/s/199906/) |
| `step1.wav` | footstep | 3.71–3.93 s | Footsteps, Tile, Male Sneakers, Slow Pace.wav | SpliceSound | [170506](https://freesound.org/s/170506/) |
| `step2.wav` | footstep | 5.00–5.22 s | Footsteps, Tile, Male Sneakers, Slow Pace.wav | SpliceSound | [170506](https://freesound.org/s/170506/) |
| `step3.wav` | footstep | 8.87–9.09 s | Footsteps, Tile, Male Sneakers, Slow Pace.wav | SpliceSound | [170506](https://freesound.org/s/170506/) |
| `step4.wav` | footstep | 19.26–19.48 s | Footsteps, Tile, Male Sneakers, Slow Pace.wav | SpliceSound | [170506](https://freesound.org/s/170506/) |
| `thud.wav` | something without a ring set down | 0.30–0.95 s | Knocking once on wood, single footstep | CuboRodante | [812363](https://freesound.org/s/812363/) |

Downloaded 2026-09-18 from the freesound HQ previews (`*-hq.mp3`); every source page was checked
for the CC0 mark.

If a file fails to load the room falls back to its own synthesised cues (`sound/cues.js`), so a
missing sound never leaves the lab silent.
