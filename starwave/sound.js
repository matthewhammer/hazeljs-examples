// hazeljs-examples, Star wave's music and sounds (0.0.55; Matthew, 2026-11-22: "for Star wave, let's have sound effects, and
// let's have music. Let's create another set of melodies and chord progressions, in the style of mega man. Let's share these
// songs with the other game that has them: pinball"). The chip and its tunes are ../shared/chip.js; each wave plays one of the
// five tunes written for Star wave, the next wave the next. Here, the game's own sounds, made on the same chip: your shot, an
// invader hit, a bomb dropped, the formation's march (two low notes, its step quickening as it does), the cannon hit, a wave
// cleared, the start and the end. Nothing plays before a tap or a key; 🎵 and 🔊 turn each off, remembered on this device.
(() => {
  "use strict";
  if (!window.HazelChip) return;
  // (0.0.56: the music quieter and the sounds louder than Pinball's mix, Matthew: "the sound effects are too quiet compared to
  // the music in star wave"; a hit, a loss, a wave cleared and the end dip the music under them)
  const C = window.HazelChip.make("hazeljs-examples/starwave/", { music: 0.34, sfx: 1 });
  const { hz } = window.HazelChip;
  const { sfx, tone, hiss, seq } = C;
  // (the tunes written for Star wave: the shared list's fourth to eighth)
  const WAVE_TUNES = [3, 4, 5, 6, 7];
  const tuneOf = wave => WAVE_TUNES[((wave % WAVE_TUNES.length) + WAVE_TUNES.length) % WAVE_TUNES.length];
  let marchBeat = 0;
  const SFX = {
    shot: () => sfx(t => { tone("eighth", hz(84), hz(98), t, 0.09, 0.22); hiss(t, 0.05, 0.12, "highpass", 6000); }),
    // (an invader hit: a crunch of noise and a drop, higher for the higher kinds)
    hit: kind => sfx(t => { hiss(t, 0.18, 0.55, "bandpass", 1400 + 500 * kind, 0.9); tone("quarter", hz(72 + 4 * kind), hz(48 + 4 * kind), t, 0.16, 0.26); }, 0.4),
    bomb: () => sfx(t => tone("triangle", hz(70), hz(58), t, 0.1, 0.18)),
    march: () => sfx(t => { const n = [40, 38][marchBeat++ % 2]; tone("triangle", hz(n), hz(n), t, 0.08, 0.42); }),
    boom: () => sfx(t => { hiss(t, 0.6, 0.7, "lowpass", 900, 0.7); tone("half", hz(52), hz(28), t, 0.5, 0.32); seq(t + 0.45, [64, 61, 57], 0.08, "quarter", 0.2); }, 0.6),
    cleared: () => sfx(t => { seq(t, [72, 76, 79, 84, 88, 91], 0.06, "quarter", 0.24); tone("quarter", hz(96), hz(96), t + 0.36, 0.4, 0.22, 14); }, 0.6),
    start: () => sfx(t => { seq(t, [60, 64, 67], 0.09, "quarter", 0.24); tone("quarter", hz(72), hz(72), t + 0.27, 0.4, 0.24, 14); }),
    over: () => sfx(t => { seq(t, [67, 66, 65], 0.2, "quarter", 0.24); tone("quarter", hz(64), hz(64), t + 0.6, 0.7, 0.24, 18); tone("triangle", hz(40), hz(40), t + 0.6, 0.7, 0.45); }, 0.6),
  };
  window.StarWaveSound = {
    // (a tap or a key: the chip made, or woken, and the wave's tune started if music is on and nothing plays)
    gesture(wave) { C.gesture(wave != null ? tuneOf(wave) : null); },
    tune(wave) { C.tune(tuneOf(wave)); },
    stop: C.stop,
    music: on => C.music(on), sounds: on => C.sounds(on),
    get musicOn() { return C.musicOn; }, get soundsOn() { return C.soundsOn; },
    volumeOf: C.volumeOf, setVolume: C.setVolume,
    status: C.status,
    ...SFX,
  };
})();
