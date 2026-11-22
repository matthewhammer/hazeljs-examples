// hazeljs-examples, Butterfly garden's music and sounds (0.0.63; Matthew, 2026-11-22: "add music and sound effects, a la star
// wave", "but happy and reggae to start"). The chip and its tunes are ../shared/chip.js; each garden plays one of the happy,
// major-key tunes, the reggae ones first (Garden sun, Honey breeze), then two of the ska, the house and the funk; the next
// garden the next. Here, the garden's own sounds, made on the same chip: a drop of nectar sent (a bloop), a caterpillar fed (a
// chime, three notes for a head), a butterfly out (a flutter up), a bud watered (a plip) and opened (a pop and a chime), a
// bump (a soft boing), another caterpillar (a little tune), the garden in full bloom, the start and the end. Nothing plays before
// a tap or a key; 🎵 and 🔊 turn each off, a slider beside each, remembered on this device.
(() => {
  "use strict";
  if (!window.HazelChip) return;
  // (the mix as Star wave's: the music under the sounds, the big moments dipping it)
  const C = window.HazelChip.make("hazeljs-examples/bugs/", { music: 0.34, sfx: 1 });
  const { hz } = window.HazelChip;
  const { sfx, tone, hiss, seq } = C;
  const byName = n => window.HazelChip.SONGS.findIndex(s => s.name === n);
  const GARDEN_TUNES = ["Garden sun", "Honey breeze", "Sunny skank", "Boardwalk", "Neon tide", "Second line"].map(byName).filter(i => i >= 0);
  const tuneOf = w => GARDEN_TUNES[((w % GARDEN_TUNES.length) + GARDEN_TUNES.length) % GARDEN_TUNES.length];
  let flutters = 0;
  const SFX = {
    drop: () => sfx(t => { tone("sine", hz(74), hz(88), t, 0.07, 0.2); tone("triangle", hz(62), hz(74), t, 0.05, 0.14); }),
    // (a caterpillar fed: a bright chime up a major chord, three notes and a fourth for a head)
    fed: head => sfx(t => { seq(t, head ? [84, 88, 91, 96] : [84, 88, 91], 0.05, "eighth", 0.18); hiss(t, 0.05, 0.12, "highpass", 6000); }, 0.25),
    // (a butterfly out: a quick flutter of notes going up, a little different each time)
    flutter: () => sfx(t => { const b = [88, 86, 91, 89][flutters++ % 4]; seq(t, [b, b + 3, b + 5, b + 8, b + 12], 0.032, "eighth", 0.12); tone("sine", hz(b + 12), hz(b + 12), t + 0.16, 0.18, 0.08, 30); }, 0.2),
    plip: () => sfx(t => tone("triangle", hz(91), hz(84), t, 0.05, 0.14)),
    bloom: () => sfx(t => { hiss(t, 0.05, 0.25, "highpass", 3000); tone("quarter", hz(79), hz(91), t, 0.08, 0.18); tone("sine", hz(96), hz(96), t + 0.07, 0.2, 0.12, 12); }, 0.25),
    bump: () => sfx(t => { tone("triangle", hz(52), hz(64), t, 0.12, 0.4); tone("triangle", hz(64), hz(50), t + 0.12, 0.2, 0.35); }, 0.5),
    more: () => sfx(t => seq(t, [67, 71, 74, 79, 74], 0.09, "quarter", 0.18)),
    full: () => sfx(t => { seq(t, [72, 76, 79, 84, 88], 0.09, "quarter", 0.22); tone("quarter", hz(91), hz(91), t + 0.45, 0.7, 0.2, 18); tone("triangle", hz(55), hz(55), t + 0.45, 0.7, 0.4); }, 0.7),
    start: () => sfx(t => { seq(t, [67, 71, 74], 0.09, "quarter", 0.22); tone("quarter", hz(79), hz(79), t + 0.27, 0.4, 0.22, 14); }),
    over: () => sfx(t => { seq(t, [79, 76, 72], 0.2, "quarter", 0.22); tone("quarter", hz(67), hz(67), t + 0.6, 0.7, 0.22, 18); tone("triangle", hz(43), hz(43), t + 0.6, 0.7, 0.4); }, 0.6),
  };
  window.GardenSound = {
    // (a tap or a key: the chip made, or woken, and the garden's tune started if music is on and nothing plays)
    gesture(w) { C.gesture(w != null ? tuneOf(w) : null); },
    tune(w) { C.tune(tuneOf(w)); },
    stop: C.stop,
    music: on => C.music(on), sounds: on => C.sounds(on),
    get musicOn() { return C.musicOn; }, get soundsOn() { return C.soundsOn; },
    volumeOf: C.volumeOf, setVolume: C.setVolume,
    status: C.status,
    ...SFX,
  };
})();
