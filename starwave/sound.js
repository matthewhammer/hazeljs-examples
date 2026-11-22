// hazeljs-examples, Star wave's music and sounds (0.0.55; Matthew, 2026-11-22: "for Star wave, let's have sound effects, and
// let's have music ... Let's share these songs with the other game that has them: pinball"; 0.0.57, "let's do some major key,
// reggae-ska (fast paced) tracks -- the current ones all seem minor key", "sounds like deadmau5, the major key stuff", "new
// orleans funk (the meters)", "reggae-ska (sublime)", "major key"). The chip and its tunes are ../shared/chip.js; each wave
// plays one of the six major-key tunes (two ska, two house, two funk), the next wave the next. Here, the game's own sounds,
// made on the same chip, for the game as reimagined in 0.0.57 (hearts sent up to visitors who turn the town rainbow): a heart
// sent, a heart connecting (a sparkle up a major chord), a rainbow dropped, a floor turned rainbow (the next note up a major
// scale, so the town's rainbow climbs as it fills), the visitors' steps, the town all rainbow (now!), just right, too soon or
// too late, the start and the end. Nothing plays before a tap or a key; 🎵 and 🔊 turn each off, remembered on this device.
(() => {
  "use strict";
  if (!window.HazelChip) return;
  // (0.0.56: the music quieter and the sounds louder than Pinball's mix, Matthew: "the sound effects are too quiet compared to
  // the music in star wave"; the big moments dip the music under them)
  const C = window.HazelChip.make("hazeljs-examples/starwave/", { music: 0.34, sfx: 1 });
  const { hz } = window.HazelChip;
  const { sfx, tone, hiss, seq } = C;
  // (the six major-key tunes, the shared list's ninth to fourteenth: Sunny skank, Neon tide, Second line, Boardwalk, Glass city,
  // Crescent strut)
  const WAVE_TUNES = [8, 9, 10, 11, 12, 13];
  const tuneOf = wave => WAVE_TUNES[((wave % WAVE_TUNES.length) + WAVE_TUNES.length) % WAVE_TUNES.length];
  const MAJOR = [0, 2, 4, 5, 7, 9, 11];
  const up = p => 67 + 12 * Math.floor(p / 7) + MAJOR[p % 7];   // (the p-th note up a major scale from G4)
  let marchBeat = 0;
  const SFX = {
    shot: () => sfx(t => { tone("quarter", hz(76), hz(88), t, 0.09, 0.2); tone("eighth", hz(100), hz(100), t + 0.05, 0.04, 0.06); }),
    // (a heart connecting: a sparkle up a major chord, higher for the higher kinds, and a soft pop)
    hit: kind => sfx(t => { const b = 76 + 2 * kind; seq(t, [b, b + 4, b + 7, b + 12], 0.035, "eighth", 0.17); hiss(t, 0.08, 0.22, "highpass", 5000); tone("triangle", hz(b - 12), hz(b), t, 0.12, 0.3); }, 0.3),
    bomb: () => sfx(t => tone("triangle", hz(91), hz(79), t, 0.08, 0.2)),
    // (a floor turned rainbow: the next note up the scale as the town fills, p of 22)
    paint: p => sfx(t => { const n = up(p); tone("quarter", hz(n), hz(n), t, 0.13, 0.15); tone("triangle", hz(n - 12), hz(n - 12), t, 0.13, 0.22); }),
    march: () => sfx(t => { const n = [43, 47][marchBeat++ % 2]; tone("triangle", hz(n), hz(n), t, 0.07, 0.3); }),
    // (the town all rainbow: now's the time for the last heart)
    glow: () => sfx(t => { seq(t, [72, 76, 79, 84, 88, 91, 96], 0.04, "quarter", 0.16); tone("quarter", hz(100), hz(100), t + 0.28, 0.5, 0.12, 20); }, 0.5),
    cleared: () => sfx(t => { seq(t, [72, 76, 79, 84], 0.1, "quarter", 0.24); tone("quarter", hz(88), hz(88), t + 0.4, 0.6, 0.22, 16); tone("triangle", hz(48), hz(48), t + 0.4, 0.6, 0.4); }, 0.7),
    soon: () => sfx(t => { seq(t, [79, 77, 76, 74], 0.11, "quarter", 0.2); tone("triangle", hz(50), hz(50), t + 0.44, 0.4, 0.35); }, 0.6),
    late: () => sfx(t => { seq(t, [74, 72, 71, 67], 0.14, "quarter", 0.2); tone("triangle", hz(43), hz(43), t + 0.56, 0.5, 0.4); }, 0.6),
    boom: () => sfx(t => { hiss(t, 0.4, 0.4, "lowpass", 900, 0.7); tone("half", hz(52), hz(40), t, 0.3, 0.2); }, 0.5),
    start: () => sfx(t => { seq(t, [67, 71, 74], 0.09, "quarter", 0.24); tone("quarter", hz(79), hz(79), t + 0.27, 0.4, 0.24, 14); }),
    over: () => sfx(t => { seq(t, [79, 76, 72], 0.2, "quarter", 0.24); tone("quarter", hz(67), hz(67), t + 0.6, 0.7, 0.24, 18); tone("triangle", hz(43), hz(43), t + 0.6, 0.7, 0.45); }, 0.6),
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
