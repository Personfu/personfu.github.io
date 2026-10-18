# Cyber Plaza sound

The public game has an original procedural score and Foley system in
`CyberWorld/src/ascension-audio.js`, bundled locally into the world renderer.
It uses no downloaded recordings, commercial soundtrack, microphone or remote
audio service. Sound is off initially. An opted-in preference resumes only on
Create/Continue or another player gesture.

The exploration bed uses a four-chord suspended minor progression, a sparse
eight-note motif, bass pulses and a short synthesized stereo reverberation tail.
Overclock changes the pulse timing and introduces a higher counterline. Entering
an interior crossfades exterior rain into electrical/server ambience. Footsteps
follow actual movement at separate walk/run cadences; dialogs stop footfalls and
duck the score. UI interactions have brief harmonic cues. Hidden pages suspend
the audio context and resume only when sound remains enabled.

A dynamics compressor bounds the summed mix. One-shot voices disconnect on
completion, the melodic voice count is bounded, and event scheduling uses the
audio clock without replaying missed beats after a stalled frame. The generated
noise buffer and persistent pad/hum voices are reused across districts. No audio
files enlarge the public offline snapshot.

This is a small adaptive synthesized soundscape. Recorded performances, voice
acting, richer spatial effects and a production soundtrack remain later audio
work. The browser regression checks consent, running context, interior/Overclock
transitions, bounded voices, mute and preference restoration on Continue.
