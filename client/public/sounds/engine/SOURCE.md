# Engine sound source

Both files are cut from one recording:

- "Car Starting and Accelerating" by jackthemurray, https://freesound.org/people/jackthemurray/sounds/433584/
- License: Creative Commons 0 (public domain dedication). No attribution required.
- Source file used: Freesound HQ preview `433584_5618682-hq.mp3` (downloaded 2026-09-16).

Edits (ffmpeg): mono, 32 kHz, 16-bit WAV.

- `engine-start.wav`: 1.10-2.40 s (starter cranking and ignition).
- `engine-idle-loop.wav`: 4.8-9.2 s (steady fast idle), looped with a 0.4 s half-sine crossfade. Higher rpm is made by raising playback rate in code.
