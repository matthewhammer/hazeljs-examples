// hazeljs-examples, Gnome dig's music and sounds (0.0.68; Matthew, 2026-11-22: "gnome dig game needs music and sound effects").
// The chip and its tunes are ../shared/chip.js; each level plays one of the happy, major-key tunes, the gnome's own first
// (Lantern hop, a fast ska in C; Root cellar, a New Orleans strut in D), then the ska, the funk, the house and the reggae of the
// other games; the next level the next. Here, the ground's own sounds, made on the same chip: a cell of earth dug (a soft
// crunch), a gem (a bright chime), the lantern's flash (a shimmer up), a stunned monster caught (a jingle), a boulder loosened
// (a rattle) and landing (a thud), a monster squashed (a thud and a boing), you caught, a level cleared, an animal let go (a
// whistle down) or under a boulder (a sad fall), into the water (a splash), your breath running low (a bubble), out of breath,
// the diving gear found (a sparkle), (0.0.74) the love blast (a sweep up) and a ghost won over (an aww), the start and the end; and a level cleared, the party's own tune (Confetti skank) until you go on. Nothing plays before a tap or a key; 🎵 and 🔊 turn each off, a
// slider beside each, remembered on this device.
(() => {
  "use strict";
  if (!window.HazelChip) return;
  // (the mix as Star wave's and the garden's: the music under the sounds, the big moments dipping it)
  const C = window.HazelChip.make("hazeljs-examples/dig/", { music: 0.34, sfx: 1 });
  const { hz } = window.HazelChip;
  const { sfx, tone, hiss, seq } = C;
  const byName = n => window.HazelChip.SONGS.findIndex(s => s.name === n);
  const DIG_TUNES = ["Lantern hop", "Root cellar", "Sunny skank", "Crescent strut", "Boardwalk", "Second line", "Glass city", "Garden sun"].map(byName).filter(i => i >= 0);
  const tuneOf = lv => DIG_TUNES[((lv % DIG_TUNES.length) + DIG_TUNES.length) % DIG_TUNES.length];
  let crunches = 0;
  const SFX = {
    // (a cell of earth dug: short and low, a little different each time, as it comes every fifth of a second when digging on)
    dig: () => sfx(t => { const k = crunches++ % 3; hiss(t, 0.05, 0.1, "lowpass", 700 + 200 * k); tone("triangle", hz(40 + k), hz(33), t, 0.06, 0.16); }),
    // (0.0.128, Gnome world: its dig a drum fill on the music's beat, ../shared/chip.js's fill; no music playing, a crunch that
    // laptop speakers carry: the soft one's low thump, 82 Hz, they cannot, under the music, so digging seemed to make no sound)
    digFill: () => { const r = C.fill ? C.fill() : null; if (r) return r;
      sfx(t => { const k = crunches++ % 3; hiss(t, 0.07, 0.2, "bandpass", 1500 + 300 * k, 1.1); hiss(t, 0.04, 0.12, "highpass", 4000); tone("triangle", hz(52 + k), hz(45), t, 0.07, 0.2); }); return null; },
    gem: () => sfx(t => { seq(t, [88, 93, 100], 0.05, "eighth", 0.18); hiss(t + 0.1, 0.12, 0.08, "highpass", 7000); }, 0.25),
    flash: () => sfx(t => { tone("sine", hz(84), hz(96), t, 0.2, 0.16); hiss(t, 0.16, 0.08, "highpass", 5000); }),
    caught_mon: () => sfx(t => seq(t, [76, 79, 84, 88], 0.06, "quarter", 0.2), 0.25),
    wobble: () => sfx(t => { for (let i = 0; i < 5; i++) tone("triangle", hz(50 + (i % 2) * 2), hz(49), t + i * 0.07, 0.04, 0.14); hiss(t, 0.33, 0.05, "bandpass", 400); }),
    land: () => sfx(t => { tone("triangle", hz(40), hz(26), t, 0.22, 0.45); hiss(t, 0.1, 0.18, "lowpass", 500); }, 0.3),
    squash: () => sfx(t => { tone("triangle", hz(45), hz(28), t, 0.25, 0.45); hiss(t, 0.12, 0.2, "lowpass", 600); tone("triangle", hz(60), hz(72), t + 0.16, 0.2, 0.25, 20); seq(t + 0.36, [79, 84], 0.08, "quarter", 0.16); }, 0.5),
    caught: () => sfx(t => { seq(t, [74, 71, 67, 62], 0.12, "quarter", 0.2); tone("triangle", hz(43), hz(38), t + 0.48, 0.4, 0.4); }, 0.6),
    cleared: () => sfx(t => { seq(t, [72, 76, 79, 84, 88], 0.09, "quarter", 0.22); tone("quarter", hz(91), hz(91), t + 0.45, 0.7, 0.2, 18); tone("triangle", hz(48), hz(48), t + 0.45, 0.7, 0.4); }, 0.7),
    letgo: () => sfx(t => tone("triangle", hz(86), hz(64), t, 0.35, 0.14)),
    crushed: () => sfx(t => { tone("triangle", hz(40), hz(26), t, 0.22, 0.45); seq(t + 0.2, [79, 75, 72, 67], 0.18, "triangle", 0.22); tone("triangle", hz(43), hz(36), t + 0.92, 0.6, 0.4); }, 0.8),
    splash: () => sfx(t => { hiss(t, 0.35, 0.22, "bandpass", 1300); tone("sine", hz(62), hz(76), t, 0.1, 0.14); tone("sine", hz(80), hz(86), t + 0.12, 0.06, 0.1); }, 0.2),
    low: () => sfx(t => { tone("sine", hz(84), hz(96), t, 0.07, 0.16); tone("sine", hz(86), hz(98), t + 0.1, 0.07, 0.12); }),
    drowned: () => sfx(t => { for (let i = 0; i < 6; i++) tone("sine", hz(86 - i * 3), hz(92 - i * 3), t + i * 0.08, 0.06, 0.15); tone("triangle", hz(43), hz(38), t + 0.5, 0.4, 0.35); }, 0.6),
    gear: () => sfx(t => { seq(t, [79, 84, 88, 91, 96], 0.05, "eighth", 0.18); hiss(t + 0.2, 0.2, 0.08, "highpass", 6000); tone("sine", hz(100), hz(100), t + 0.25, 0.3, 0.1, 16); }, 0.35),
    // (0.0.70) a ghost burnt up in the sunlight: a sizzle and a puff going up; (0.0.71) the love shooter found: a warm chime up; and,
    // while it shoots, now and then a soft pew
    burn: () => sfx(t => { hiss(t, 0.45, 0.2, "highpass", 3500); tone("triangle", hz(72), hz(96), t + 0.05, 0.35, 0.16); seq(t + 0.3, [84, 88, 91], 0.06, "eighth", 0.14); }, 0.4),
    love: () => sfx(t => { seq(t, [76, 80, 83, 88], 0.07, "quarter", 0.2); tone("sine", hz(92), hz(92), t + 0.3, 0.4, 0.14, 14); }, 0.4),
    pew: () => sfx(t => tone("sine", hz(88), hz(100), t, 0.08, 0.08)),
    // (0.0.74) the love blast: a bright sweep up with a sparkle; a ghost won over: a happy little "aww" up and a chime
    blast: () => sfx(t => { tone("sine", hz(76), hz(100), t, 0.18, 0.16); seq(t + 0.08, [91, 95, 98], 0.04, "eighth", 0.12); hiss(t, 0.15, 0.06, "highpass", 6500); }, 0.2),
    won: () => sfx(t => { tone("triangle", hz(79), hz(86), t, 0.22, 0.2); seq(t + 0.22, [84, 88, 91, 96], 0.07, "quarter", 0.2); tone("sine", hz(96), hz(96), t + 0.5, 0.45, 0.12, 14); }, 0.5),
    start: () => sfx(t => { seq(t, [67, 72, 76], 0.09, "quarter", 0.22); tone("quarter", hz(79), hz(79), t + 0.27, 0.4, 0.22, 14); }),
    over: () => sfx(t => { seq(t, [79, 76, 72], 0.2, "quarter", 0.22); tone("quarter", hz(67), hz(67), t + 0.6, 0.7, 0.22, 18); tone("triangle", hz(43), hz(43), t + 0.6, 0.7, 0.4); }, 0.6),
    // (Gnome world 0.0.96: the wildlife, soft, now and then) a frog's croak; a sparrow's chirp; a robin's phrase; a blue jay's harsh
    // call; a hawk's scream, high and falling; a duck's quack; a swan's soft honk
    croak: () => sfx(t => { for (let i = 0; i < 2; i++) { tone("quarter", hz(41), hz(38), t + i * 0.17, 0.11, 0.11, 25); hiss(t + i * 0.17, 0.09, 0.05, "bandpass", 600); } }),
    chirp: () => sfx(t => { tone("sine", hz(96), hz(101), t, 0.045, 0.05); tone("sine", hz(98), hz(103), t + 0.08, 0.04, 0.05); }),
    robin: () => sfx(t => { tone("sine", hz(91), hz(95), t, 0.09, 0.05); tone("sine", hz(94), hz(89), t + 0.13, 0.09, 0.05); tone("sine", hz(93), hz(97), t + 0.27, 0.08, 0.05); }),
    jay: () => sfx(t => { tone("quarter", hz(84), hz(78), t, 0.2, 0.04); hiss(t, 0.18, 0.04, "bandpass", 3200); }),
    hawk: () => sfx(t => { tone("sine", hz(97), hz(87), t, 0.65, 0.05, 12); hiss(t, 0.5, 0.02, "highpass", 5000); }),
    quack: () => sfx(t => { for (let i = 0; i < 2; i++) { tone("quarter", hz(56), hz(52), t + i * 0.16, 0.11, 0.06); hiss(t + i * 0.16, 0.1, 0.04, "bandpass", 900); } }),
    bloop: () => sfx(t => { tone("sine", hz(55), hz(79), t, 0.16, 0.16); hiss(t, 0.12, 0.05, "lowpass", 900); }),   // (Gnome world 0.0.146: a jellyfish's pulse)
    honk: () => sfx(t => { tone("triangle", hz(61), hz(59), t, 0.28, 0.07); tone("quarter", hz(61), hz(59), t, 0.28, 0.02); }),
  };
  let pref = -1;   // (0.0.102: a page's own first tune, by name, which a tap starts instead of a level's: Gnome world's)
  window.DigSound = {
    // (a tap or a key: the chip made, or woken, and the level's tune started if music is on and nothing plays)
    gesture(lv) { C.gesture(pref >= 0 ? pref : lv != null ? tuneOf(lv) : null); },
    // (0.0.102, for Gnome world: its music by where the gnome is) a tune by its name: mixed in on the next bar, as a DJ would, or
    // its dub (half time) under the water; played now; or the one a tap starts
    mix(name, o = {}) { const i = byName(name); if (i >= 0 && C.mix) C.mix(o.dub ? window.HazelChip.dub(i) : i, o.fade); },
    play(name) { const i = byName(name); C.tune(i >= 0 ? i : tuneOf(0)); },
    prefer(name) { pref = byName(name); },
    tune(lv) { C.tune(tuneOf(lv)); },
    // (0.0.74) a level cleared: the party's own tune, round and round until you go on
    celebrate() { const i = byName("Confetti skank"); if (i >= 0) C.tune(i); },
    stop: C.stop,
    music: on => C.music(on), sounds: on => C.sounds(on),
    get musicOn() { return C.musicOn; }, get soundsOn() { return C.soundsOn; },
    volumeOf: C.volumeOf, setVolume: C.setVolume,
    hush: k => { if (C.hush) C.hush(k); },
    status: C.status,
    ...SFX,
  };
})();
