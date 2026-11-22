// hazeljs-examples, Pinball's music and sounds (ticket 793; Matthew: "let's have music and sound effects for pin ball.
// fast-paced, mega-man themed style, but original MIDI constructions."). The chip and the tunes are shared with Star wave
// since 0.0.55 (../shared/chip.js: eight tunes of our own, Pinball's first three and five written for Star wave); here, which
// tune each board plays, and the table's sounds (bumpers, slingshots, flippers, the plunger, portals, a ball lost, a thousand
// points, the game's start and end), made on the same chip. Nothing plays before a tap or a key; 🎵 and 🔊 turn each off.
(() => {
  "use strict";
  if (!window.HazelChip) return;
  const C = window.HazelChip.make("hazeljs-examples/pinball/");
  const { hz } = window.HazelChip;
  const { sfx, tone, hiss, seq } = C;
  // which tune each board plays (of the eight): the floaty ones for the ocean and the moon, the stormy ones for the volcano, the
  // funfair and the portals, the new ones spread over the rest (0.0.55)
  const BOARD_TUNE = [0, 1, 2, 3, 4, 5, 1, 2, 6, 7];

  // ---- the table's sounds
  const SFX = {
    bump: i => sfx(t => tone("half", hz(84 + 3 * (i % 5)), hz(91 + 3 * (i % 5)), t, 0.07, 0.15)),
    sling: () => sfx(t => { tone("quarter", hz(79), hz(64), t, 0.08, 0.13); hiss(t, 0.05, 0.1, "highpass", 4000); }),
    flip: () => sfx(t => { hiss(t, 0.05, 0.2, "lowpass", 900); tone("half", hz(45), hz(40), t, 0.035, 0.1); }),
    launch: k => sfx(t => { tone("quarter", hz(48), hz(72 + Math.round(12 * k / 100)), t, 0.28, 0.12); hiss(t, 0.3, 0.12, "bandpass", 1200, 0.5); }),
    portal: () => sfx(t => { const ctx = C.ctx, o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(hz(72), t); o.frequency.exponentialRampToValueAtTime(hz(96), t + 0.18); o.frequency.exponentialRampToValueAtTime(hz(79), t + 0.36);
      l.frequency.value = 22; lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.18, t); g.gain.linearRampToValueAtTime(0, t + 0.38); o.connect(g); g.connect(C.bus);
      o.start(t); l.start(t); o.stop(t + 0.4); l.stop(t + 0.4); }),
    drain: () => sfx(t => { seq(t, [76, 75, 72, 71, 67, 64, 60], 0.06, "half", 0.13); tone("triangle", hz(40), hz(28), t + 0.42, 0.3, 0.35); }),
    bonus: () => sfx(t => seq(t, [72, 76, 79, 84, 88, 91, 96], 0.045, "quarter", 0.1)),
    fanfare: () => sfx(t => { seq(t, [64, 67, 71], 0.09, "quarter", 0.12); tone("quarter", hz(76), hz(76), t + 0.27, 0.4, 0.12, 14); }),
    over: () => sfx(t => { seq(t, [72, 71, 70], 0.2, "quarter", 0.12); tone("quarter", hz(69), hz(69), t + 0.6, 0.7, 0.12, 18); tone("triangle", hz(45), hz(45), t + 0.6, 0.7, 0.3); }),
    // (round two, ticket 805) a lamp lit: a blip climbing the scale as its row fills; a row all lit: a run up and a sparkle; a
    // kicker's spring; a ball out of a portal; a ball saved
    lamp: n => sfx(t => { const m = [79, 81, 84, 86, 88, 91, 93, 96][Math.min(7, Math.max(0, n - 1))]; tone("eighth", hz(m), hz(m), t, 0.05, 0.1); tone("eighth", hz(m + 12), hz(m + 12), t + 0.03, 0.04, 0.05); }),
    row: () => sfx(t => { seq(t, [72, 76, 79, 84, 88, 91, 96, 100], 0.035, "eighth", 0.1); for (let i = 0; i < 6; i++) tone("half", hz(96 + (i % 3) * 4), hz(96 + (i % 3) * 4), t + 0.3 + i * 0.05, 0.04, 0.05); }),
    kick: () => sfx(t => { tone("quarter", hz(55), hz(84), t, 0.16, 0.14); hiss(t, 0.08, 0.12, "bandpass", 2500, 0.8); }),
    warpOut: () => sfx(t => { tone("triangle", hz(67), hz(91), t, 0.14, 0.16); tone("half", hz(91), hz(91), t + 0.12, 0.08, 0.08); }),
    saved: () => sfx(t => { seq(t, [72, 79, 84, 88], 0.08, "quarter", 0.12); tone("quarter", hz(91), hz(91), t + 0.32, 0.35, 0.11, 14); })
  };

  window.PinballSound = {
    // (a tap or a key: the chip made, or woken, and the board's tune started if it is not playing)
    gesture(board) { C.gesture(board != null ? BOARD_TUNE[board] ?? 0 : null); },
    tune(board) { C.tune(BOARD_TUNE[board] ?? 0); },
    stop: C.stop,
    music: on => C.music(on), sounds: on => C.sounds(on),
    get musicOn() { return C.musicOn; }, get soundsOn() { return C.soundsOn; },
    status: C.status,
    ...SFX,
    TUNES: window.HazelChip.TUNES, SONGS: window.HazelChip.SONGS
  };
})();
