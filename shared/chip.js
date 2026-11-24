// hazeljs-examples: the little chip that plays the games' music and makes their sounds (0.0.55; moved here from Pinball's
// sound.js, ticket 793, Matthew: "let's have music and sound effects for pin ball. fast-paced, mega-man themed style, but
// original MIDI constructions"; then, for Star wave: "let's create another set of melodies and chord progressions, in the style
// of mega man. Let's share these songs with the other game that has them: pinball"). Sixteen tunes of our own (six, 0.0.57, in major keys: ska, New Orleans funk, progressive house; two, 0.0.63, reggae), written below as
// notes (MIDI numbers, from names such as "e5" and "c#4") on a grid of sixteenths, with a chord for each bar; and the chip,
// made of the Web Audio API, that plays them: a lead on a pulse wave a quarter on, an arpeggio on a thinner pulse (an eighth
// on), a triangle bass bouncing in octaves, and drums of noise (kick, snare, hats). A game's own sounds are made on the same
// chip (tone, hiss, seq). Nothing plays before a tap or a key (browsers ask for that); 🎵 and 🔊 turn each off, remembered on
// this device under the game's own key.
//   const C = HazelChip.make("hazeljs-examples/<game>/");  C.gesture(tune); C.tune(i); C.sfx(t => C.tone("half", f0, f1, t, dur, vol))
(() => {
  "use strict";
  const PITCH = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const midi = s => { const m = /^([a-g])(#?)(\d)$/.exec(s); if (!m) throw new Error("not a note: " + s); return 12 * (+m[3] + 1) + PITCH[m[1]] + (m[2] ? 1 : 0); };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  // a chord by its name: its root (0 to 11), its third (minor or major), and a seventh (10, as in "E7"; 11, "Cmaj7") or a sixth
  // ("G6", 9) added, else 0; "C/D" is C for the bar's first half, D its second
  const chordOf = name => { const m = /^([A-G])(#?)(m?)(maj7|7|6)?$/.exec(name); if (!m) throw new Error("not a chord: " + name);
    return { root: PITCH[m[1].toLowerCase()] + (m[2] ? 1 : 0), third: m[3] ? 3 : 4, ext: m[4] === "7" ? 10 : m[4] === "maj7" ? 11 : m[4] === "6" ? 9 : 0 }; };

  // ---- the tunes: a bar is 16 sixteenths, each a note, "-" (the note before held on) or "." (rest). The first three were
  // Pinball's own; the next five were written for Star wave, and both games play them all
  const TUNES = [
    { name: "Overdrive", bpm: 172, kick: [0, 8, 10], sections: [
      { chords: ["Em", "C", "D", "B"], lead: [
        "e5 - - - b4 - e5 - g5 - f#5 - e5 - b4 -",
        "c5 - - - g4 - c5 - e5 - d5 - c5 - g4 -",
        "d5 - - - a4 - d5 - f#5 - a5 - g5 - f#5 -",
        "f#5 - - - - - d#5 - b4 - d#5 - f#5 - b5 -"] },
      { chords: ["Em", "C", "D", "B"], lead: [
        "e5 - - - b4 - e5 - g5 - f#5 - e5 - g5 -",
        "a5 - g5 - e5 - c5 - e5 - g5 - c6 - b5 -",
        "a5 - - - f#5 - d5 - f#5 - a5 - d6 - c6 -",
        "b5 - - - - - - - b5 a5 g5 f#5 d#5 f#5 b5 -"] },
      { chords: ["Am", "Em", "C", "D", "Am", "Em", "B", "B"], lead: [
        "a4 - c5 - e5 - a5 - g5 - e5 - c5 - e5 -",
        "g5 - - - f#5 - e5 - d5 - e5 - - - b4 -",
        "c5 - e5 - g5 - c6 - b5 - g5 - e5 - g5 -",
        "a5 - - - - - f#5 - d5 - f#5 - a5 - - -",
        "c6 - b5 - a5 - e5 - a5 - b5 - c6 - d6 -",
        "e6 - - - b5 - g5 - e5 - g5 - b5 - e6 -",
        "d#6 - - - b5 - f#5 - d#5 - f#5 - b5 - d#6 -",
        "f#6 - - - - - - - . . . . . . . ."] }] },
    { name: "Bumper storm", bpm: 184, kick: [0, 3, 8, 11], sections: [
      { chords: ["Dm", "A#", "C", "A"], lead: [
        "d5 - . d5 - . f5 - a5 - . a5 - g5 f5 -",
        "a#4 - . a#4 - . d5 - f5 - . f5 - e5 d5 -",
        "c5 - . c5 - . e5 - g5 - . g5 - a5 g5 -",
        "a5 - - - g5 - e5 - c#5 - e5 - a4 - c#5 -"] },
      { chords: ["Dm", "A#", "C", "A"], lead: [
        "d6 - . d6 - . c6 - a5 - . a5 - c6 d6 -",
        "f6 - . f6 - . d6 - a#5 - . a#5 - c6 d6 -",
        "e6 - . e6 - . c6 - g5 - . g5 - a5 a#5 -",
        "a5 - - - - - - - a5 g5 f5 e5 c#5 e5 a5 -"] },
      { chords: ["Gm", "Dm", "A#/C", "A"], lead: [
        "g5 - a#5 - d6 - a#5 - g5 - d5 - g5 - a#5 -",
        "a5 - - - f5 - d5 - f5 - a5 - d6 - - -",
        "f5 - d5 - a#4 - d5 - g5 - e5 - c5 - e5 -",
        "a5 - c#6 - e6 - c#6 - a5 - e5 - c#5 - e5 -"] }] },
    { name: "Orbit", bpm: 140, kick: [0, 10], sections: [
      { chords: ["Am", "G", "F", "E"], lead: [
        "e5 - - - - - a5 - - - g5 - e5 - - -",
        "d5 - - - - - g5 - - - f5 - d5 - - -",
        "c5 - - - - - f5 - - - e5 - c5 - a4 -",
        "b4 - - - - - g#4 - - - b4 - e5 - - -"] },
      { chords: ["F", "G", "Am", "E"], lead: [
        "a5 - - - c6 - - - a5 - - - f5 - - -",
        "b5 - - - d6 - - - b5 - - - g5 - - -",
        "c6 - b5 - a5 - e5 - a5 - c6 - e6 - - -",
        "e6 - - - d6 - c6 - b5 - g#5 - e5 - - -"] }] },
    // ---- (0.0.55; Matthew, 2026-11-22: "let's create another set of melodies and chord progressions, in the style of mega man";
    // "let's share these songs with the other game that has them: pinball") five more of our own: minor keys, i, VI, VII and V
    // underneath, the lead jumping octaves over a bass that bounces, fast; a theme, its answer an octave up, and a bridge
    { name: "Steel sky", bpm: 168, kick: [0, 6, 8, 14], sections: [
      { chords: ["Em", "C", "G", "D"], lead: [
        "e5 - e5 g5 - e5 b5 - a5 - g5 - f#5 - g5 -",
        "e5 - e5 g5 - e5 c6 - b5 - g5 - e5 - c5 -",
        "d5 - d5 g5 - d5 b5 - a5 - g5 - d5 - b4 -",
        "a4 - d5 - f#5 - a5 - d6 - c6 - a5 - f#5 -"] },
      { chords: ["Em", "C", "B", "B"], lead: [
        "b5 - - - a5 - g5 - e5 - g5 - b5 - e6 -",
        "c6 - - - b5 - g5 - e5 - g5 - c6 - e6 -",
        "d#6 - - - b5 - f#5 - d#5 - f#5 - b5 - d#6 -",
        "f#6 - - - e6 - d#6 - b5 - - - . . . ."] },
      { chords: ["Am", "Em", "C", "D"], lead: [
        "a5 - c6 - e6 - c6 - a5 - e5 - a5 - c6 -",
        "b5 - - - g5 - e5 - g5 - b5 - e6 - - -",
        "c6 - e6 - g6 - e6 - c6 - g5 - c6 - e6 -",
        "d6 - - - a5 - f#5 - d5 - f#5 - a5 - d6 -"] }] },
    { name: "Circuit run", bpm: 176, kick: [0, 3, 8, 11], sections: [
      { chords: ["Am", "F", "G", "Em"], lead: [
        "a5 . a5 . c6 - a5 - e5 - a5 - c6 - e6 -",
        "f5 . f5 . a5 - f5 - c5 - f5 - a5 - c6 -",
        "g5 . g5 . b5 - g5 - d5 - g5 - b5 - d6 -",
        "e6 - - - d6 - b5 - g5 - e5 - g5 - b5 -"] },
      { chords: ["F", "G", "Am", "Am"], lead: [
        "c6 - a5 - f5 - a5 - c6 - f6 - e6 - c6 -",
        "d6 - b5 - g5 - b5 - d6 - g6 - f6 - d6 -",
        "e6 - - - c6 - - - a5 - - - e5 - - -",
        "a5 - c6 - e6 - a6 - - - - - . . . ."] },
      { chords: ["Dm", "Am", "E", "E"], lead: [
        "d6 - f6 - a6 - f6 - d6 - a5 - d6 - f6 -",
        "e6 - - - c6 - a5 - c6 - e6 - a6 - - -",
        "g#6 - - - e6 - b5 - g#5 - b5 - e6 - - -",
        "e6 d6 c6 b5 a5 g#5 e5 - - - - - . . . ."] }] },
    { name: "Neon fortress", bpm: 160, kick: [0, 8, 10], sections: [
      { chords: ["Dm", "A#", "C", "A"], lead: [
        "d5 - f5 - a5 - d6 - c6 - a5 - f5 - a5 -",
        "a#5 - - - f5 - d5 - f5 - a#5 - d6 - - -",
        "c6 - - - g5 - e5 - g5 - c6 - e6 - d6 -",
        "c#6 - - - - - a5 - e5 - c#5 - e5 - a5 -"] },
      { chords: ["Dm", "A#", "Gm", "A"], lead: [
        "f6 - e6 - d6 - a5 - d6 - e6 - f6 - a6 -",
        "g6 - f6 - d6 - a#5 - d6 - f6 - a#6 - - -",
        "a#6 - a6 - g6 - d6 - a#5 - d6 - g6 - - -",
        "a6 - - - - - - - g6 f6 e6 c#6 a5 . . ."] },
      { chords: ["Gm", "Dm", "A#", "A"], lead: [
        "g5 - - - a#5 - d6 - g6 - - - f6 - d6 -",
        "f6 - - - d6 - a5 - f5 - a5 - d6 - - -",
        "f6 - - - d6 - a#5 - f5 - a#5 - d6 - f6 -",
        "e6 - - - c#6 - a5 - e5 - a5 - c#6 - e6 -"] }] },
    { name: "Comet chase", bpm: 184, kick: [0, 7, 8, 14], sections: [
      { chords: ["Gm", "D#", "F", "D"], lead: [
        "g5 - g5 a#5 - g5 d6 - c6 - a#5 - a5 - g5 -",
        "g5 - g5 a#5 - g5 d#6 - d6 - a#5 - g5 - d#5 -",
        "f5 - f5 a5 - f5 c6 - a#5 - a5 - f5 - c5 -",
        "d5 - f#5 - a5 - d6 - f#6 - - - d6 - a5 -"] },
      { chords: ["Gm", "D#", "Cm", "D"], lead: [
        "d6 - - - a#5 - - - g5 - a#5 - d6 - g6 -",
        "d#6 - - - a#5 - - - g5 - a#5 - d#6 - g6 -",
        "g6 - f6 - d#6 - c6 - g5 - c6 - d#6 - f6 -",
        "f#6 - - - a6 - - - f#6 d6 a5 f#5 d5 . . ."] },
      { chords: ["D#", "F", "Gm", "D"], lead: [
        "a#5 - d#6 - g6 - d#6 - a#5 - g5 - a#5 - d#6 -",
        "c6 - f6 - a6 - f6 - c6 - a5 - c6 - f6 -",
        "d6 - g6 - a#6 - g6 - d6 - a#5 - d6 - g6 -",
        "a6 - - - f#6 - d6 - a5 - d6 - f#6 - a6 -"] }] },
    { name: "Last light", bpm: 150, kick: [0, 10], sections: [
      { chords: ["Cm", "G#", "A#", "G"], lead: [
        "c5 - - - g5 - - - d#5 - - - g5 - c6 -",
        "c6 - - - g#5 - - - d#5 - - - g#5 - c6 -",
        "d6 - - - a#5 - - - f5 - - - a#5 - d6 -",
        "b5 - - - d6 - - - g6 - - - - - - -"] },
      { chords: ["Cm", "G#", "Fm", "G"], lead: [
        "g6 - d#6 - c6 - g5 - c6 - d#6 - g6 - c7 -",
        "c7 - - - g#6 - d#6 - c6 - d#6 - g#6 - - -",
        "g#6 - g6 - f6 - c6 - g#5 - c6 - f6 - - -",
        "g6 - - - - - - - f6 d#6 d6 b5 g5 . . ."] },
      { chords: ["G#", "A#", "Cm", "G"], lead: [
        "d#6 - - - c6 - g#5 - d#5 - g#5 - c6 - d#6 -",
        "f6 - - - d6 - a#5 - f5 - a#5 - d6 - f6 -",
        "g6 - - - d#6 - c6 - g5 - c6 - d#6 - g6 -",
        "g6 - f6 - d6 - b5 - g5 - b5 - d6 - f6 -"] }] },
    // ---- (0.0.57; Matthew, 2026-11-22: "let's do some major key, reggae-ska (fast paced) tracks -- the current ones all seem minor
    // key", "let's look into sounds like deadmau5, the major key stuff", "new orleans funk (the meters)", "reggae-ska (sublime)",
    // "major key") six more of our own, all in major keys, each with its own band under the lead (STYLES below): two fast ska
    // tunes (the chords chopped on the off-beats, a walking bass, a horn lead), two New Orleans funk tunes (a syncopated bass,
    // chicken-scratch chords, ghost notes, a swing on the sixteenths), and two progressive house tunes (four on the floor, a
    // rolling off-beat bass, pads pumping under the kick, a plucked arpeggio)
    { name: "Sunny skank", style: "ska", bpm: 172, sections: [
      { chords: ["G", "C", "D", "G"], lead: [
        "g5 - . d5 g5 - b5 - d6 - . b5 - . g5 -",
        "e5 - . c5 e5 - g5 - c6 - . a5 - . g5 -",
        "f#5 - . d5 f#5 - a5 - d6 - c6 - b5 - a5 -",
        "g5 - - - b5 - d6 - g6 - - - . . . ."] },
      { chords: ["G", "C", "D", "D"], lead: [
        "b5 - . b5 - . a5 g5 - . d5 - g5 - b5 -",
        "c6 - . c6 - . b5 a5 - . e5 - a5 - c6 -",
        "d6 - . c6 - . b5 a5 - . f#5 - a5 - d6 -",
        "e6 - d6 - c6 - b5 - a5 - f#5 - d5 - . ."] },
      { chords: ["Em", "C", "G", "D"], lead: [
        "e5 - g5 - b5 - e6 - . e6 d6 - b5 - g5 -",
        "c6 - - - g5 - e5 - . e5 g5 - c6 - e6 -",
        "d6 - - - b5 - g5 - . g5 b5 - d6 - g6 -",
        "f#6 - - - e6 - d6 - a5 - - - . d5 e5 f#5"] }] },
    { name: "Neon tide", style: "house", bpm: 128, sections: [
      { chords: ["C", "G", "F", "F"], lead: [
        "e5 - . g5 - . c6 - e5 - . g5 - . c6 -",
        "d5 - . g5 - . b5 - d5 - . g5 - . b5 -",
        "c5 - . f5 - . a5 - c5 - . f5 - . a5 -",
        "c5 - . f5 - . a5 - c6 - - - a5 - g5 -"] },
      { chords: ["C", "G", "F", "G"], lead: [
        "g5 - - - - - e6 - - - d6 - c6 - - -",
        "d6 - - - - - b5 - - - c6 - d6 - - -",
        "c6 - - - - - a5 - - - c6 - f6 - - -",
        "e6 - - - d6 - - - b5 - - - g5 - - -"] },
      { chords: ["F", "G", "C", "C"], lead: [
        "a5 - - - c6 - - - f6 - - - e6 - c6 -",
        "b5 - - - d6 - - - g6 - - - f6 - d6 -",
        "e6 - - - - - - - g6 - - - - - - -",
        "e6 - d6 - c6 - g5 - e5 - d5 - c5 - . ."] }] },
    { name: "Second line", style: "funk", bpm: 100, swing: 0.16, sections: [
      { chords: ["E7", "A7", "E7", "E7"], lead: [
        "e5 . e5 g5 g#5 . b5 . d6 - b5 . a5 g#5 e5 .",
        "a5 . a5 c6 c#6 . e6 . g6 - e6 . d6 c#6 a5 .",
        "e5 . e5 g5 g#5 . b5 . d6 - b5 . a5 g#5 e5 .",
        "b5 - - . g#5 . e5 . d5 . e5 - . . . ."] },
      { chords: ["A7", "A7", "E7", "E7"], lead: [
        "c#6 . c#6 . e6 . c#6 a5 . g5 . a5 - . . .",
        "a5 . c6 c#6 . e6 . g6 - . f#6 e6 . c#6 a5 .",
        "g#5 . b5 . e6 - . d6 b5 . g#5 . e5 - . .",
        "e5 . e5 g5 g#5 . b5 . d6 - b5 . a5 g#5 e5 ."] },
      { chords: ["B7", "A7", "E7", "B7"], lead: [
        "f#5 . a5 . b5 . d#6 . f#6 - . d#6 b5 . a5 .",
        "e5 . a5 . c#6 . e6 . g6 - . e6 c#6 . a5 .",
        "g#5 - . e5 g5 g#5 . b5 - . e6 . d6 b5 . .",
        "b5 - - - a5 . f#5 . d#5 . f#5 . a5 . b5 ."] }] },
    { name: "Boardwalk", style: "ska", bpm: 164, sections: [
      { chords: ["D", "G", "D", "G"], lead: [
        ". . a4 - d5 - f#5 - . . a4 - d5 - f#5 -",
        "g5 - f#5 - e5 - d5 - b4 - - - . . . .",
        ". . a4 - d5 - f#5 - . . a5 - f#5 - d5 -",
        "e5 - - - d5 - b4 - d5 - - - . . . ."] },
      { chords: ["D", "G", "A", "A7"], lead: [
        "a5 - . a5 - . f#5 - a5 - b5 - a5 - f#5 -",
        "g5 - . g5 - . d5 - g5 - a5 - g5 - d5 -",
        "e5 - . e5 - . c#5 - e5 - a5 - c#6 - e6 -",
        "d6 - c#6 - b5 - a5 - g5 - f#5 - e5 - . ."] },
      { chords: ["Bm", "G", "D", "A"], lead: [
        "f#5 - - - d5 - b4 - d5 - f#5 - b5 - - -",
        "g5 - - - d5 - b4 - d5 - g5 - b5 - - -",
        "a5 - - - f#5 - d5 - f#5 - a5 - d6 - - -",
        "c#6 - - - b5 - a5 - e5 - . . a4 - c#5 -"] }] },
    { name: "Glass city", style: "house", bpm: 126, sections: [
      { chords: ["A", "E", "D", "D"], lead: [
        "a5 . a5 . . e5 . a5 . b5 . c#6 . . b5 .",
        "g#5 . g#5 . . e5 . g#5 . a5 . b5 . . a5 .",
        "f#5 . f#5 . . d5 . f#5 . a5 . d6 . . c#6 .",
        "a5 - - - - - - - . . . . e5 . f#5 ."] },
      { chords: ["A", "E", "D", "E"], lead: [
        "e6 - - - c#6 - - - a5 - - - c#6 - e6 -",
        "e6 - - - b5 - - - g#5 - - - b5 - e6 -",
        "f#6 - - - d6 - - - a5 - - - d6 - f#6 -",
        "e6 - - - - - - - d6 - c#6 - b5 - g#5 -"] },
      { chords: ["F#m", "D", "A", "E"], lead: [
        "c#6 - - - a5 - f#5 - a5 - c#6 - f#6 - - -",
        "f#6 - - - d6 - a5 - d6 - f#6 - a6 - - -",
        "a6 - - - e6 - c#6 - a5 - c#6 - e6 - - -",
        "g#6 - - - - - - - b5 . b5 . e6 . g#5 ."] }] },
    { name: "Crescent strut", style: "funk", bpm: 108, swing: 0.14, sections: [
      { chords: ["G7", "G7", "C7", "G7"], lead: [
        "g5 - . g5 . . f5 g5 . b5 . d6 . . c6 b5",
        "g5 . . . f5 . d5 . f5 g5 . . . . . .",
        "c6 - . c6 . . a#5 c6 . e6 . g6 . . f6 e6",
        "d6 . . . b5 . g5 . f5 g5 . . . . . ."] },
      { chords: ["D7", "C7", "G7", "D7"], lead: [
        "f#5 . a5 . c6 - . a5 . f#5 . d5 . . . .",
        "e5 . g5 . a#5 - . g5 . e5 . c5 . . . .",
        "g5 - . g5 . . f5 g5 . b5 . d6 . . c6 b5",
        "a5 . . f#5 . . d5 . c6 - . a5 - . f#5 ."] },
      { chords: ["C7", "C7", "G7", "G7"], lead: [
        "e6 - - - c6 . g5 . a#5 - . g5 e5 . c5 .",
        "e5 . g5 . c6 . e6 . g6 - . e6 . c6 . .",
        "d6 - - - b5 . g5 . f5 - . d5 b4 . g4 .",
        "g4 . b4 . d5 . f5 . g5 . b5 . d6 . f6 ."] }] },
    // ---- (0.0.63; Matthew, for the Butterfly garden: "add music and sound effects, a la star wave", "but happy and reggae to
    // start") two of our own in the reggae style (STYLES.reggae): a one drop, the chord chopped on two and four, an organ
    // bubbling, a round bass; major keys, a happy, laid-back lead
    { name: "Garden sun", style: "reggae", bpm: 88, swing: 0.12, sections: [
      { chords: ["G", "C", "G", "D"], lead: [
        "b4 - - d5 - - g5 - . . a5 - g5 - d5 -",
        "e5 - - g5 - - c6 - . . b5 - a5 - g5 -",
        "d5 - - g5 - - b5 - . . a5 - g5 - b5 -",
        "a5 - - - f#5 - d5 - . . . . . . . ."] },
      { chords: ["G", "C", "D", "G"], lead: [
        "g5 - a5 - b5 - d6 - . b5 - . a5 - g5 -",
        "e5 - g5 - c6 - e6 - . c6 - . b5 - a5 -",
        "f#5 - a5 - d6 - f#6 - . d6 - . c6 - a5 -",
        "g5 - - - - - - - . . d5 - e5 - f#5 -"] },
      { chords: ["C", "G", "D", "G"], lead: [
        "e6 - - - d6 - c6 - . . g5 - e5 - . .",
        "d6 - - - b5 - g5 - . . d5 - g5 - . .",
        "a5 - - - f#5 - a5 - d6 - - - c6 - a5 -",
        "g5 - - - - - - - . . . . . . . ."] }] },
    { name: "Honey breeze", style: "reggae", bpm: 92, swing: 0.12, sections: [
      { chords: ["D", "G", "A", "D"], lead: [
        ". . f#5 - a5 - . d6 - . a5 - f#5 - . .",
        ". . g5 - b5 - . d6 - . b5 - g5 - . .",
        ". . e5 - a5 - . c#6 - . a5 - e5 - . .",
        "d5 - - - f#5 - - - a5 - - - . . . ."] },
      { chords: ["Bm", "G", "A", "D"], lead: [
        "f#5 - - - d5 - b4 - d5 - f#5 - b5 - - -",
        "g5 - - - d5 - b4 - d5 - g5 - b5 - - -",
        "a5 - - - e5 - c#5 - e5 - a5 - c#6 - - -",
        "d6 - - - - - - - . . a5 - b5 - c#6 -"] },
      { chords: ["G", "A", "D", "D"], lead: [
        "d6 - b5 - g5 - b5 - d6 - - - . . . .",
        "c#6 - a5 - e5 - a5 - c#6 - - - . . . .",
        "a5 - f#5 - d5 - f#5 - a5 - d6 - f#6 - - -",
        "d6 - - - - - - - . . . . . . . ."] }] },
    // ---- (0.0.68; Matthew, for Gnome dig: "gnome dig game needs music and sound effects") two of our own for the gnome, major
    // keys: a fast ska hop in C for his lantern, and a New Orleans strut in D for the cellar and the roots
    { name: "Lantern hop", style: "ska", bpm: 170, sections: [
      { chords: ["C", "F", "G", "C"], lead: [
        "c5 . e5 . g5 - e5 . c6 - . g5 . e5 . .",
        "f5 . a5 . c6 - a5 . f5 - . c5 . f5 . .",
        "g5 . b5 . d6 - b5 . g5 . a5 . b5 . d6 .",
        "c6 - - . g5 . e5 . c5 - - - . . . ."] },
      { chords: ["Am", "F", "C", "G"], lead: [
        "e5 - . a5 . . c6 - b5 . a5 . e5 . . .",
        "f5 - . a5 . . c6 - d6 . c6 . a5 . . .",
        "e5 . g5 . c6 . e6 - d6 . c6 . g5 . . .",
        "d6 - . b5 . . g5 . d5 . g5 . b5 . d6 ."] },
      { chords: ["F", "G", "C", "C"], lead: [
        "a5 . c6 . f6 - e6 . d6 . c6 . a5 . . .",
        "b5 . d6 . g6 - f6 . e6 . d6 . b5 . . .",
        "c6 . e6 . g6 - e6 . c6 . g5 . e5 . c5 .",
        "c6 - - - - - . . g5 . a5 . b5 . . ."] }] },
    { name: "Root cellar", style: "funk", bpm: 104, swing: 0.14, sections: [
      { chords: ["D7", "D7", "G7", "D7"], lead: [
        "d5 - . d5 . . c5 d5 . f#5 . a5 . . g5 f#5",
        "d5 . . . c5 . a4 . c5 d5 . . . . . .",
        "g5 - . g5 . . f5 g5 . b5 . d6 . . c6 b5",
        "a5 . . . f#5 . d5 . c5 d5 . . . . . ."] },
      { chords: ["A7", "G7", "D7", "A7"], lead: [
        "c#6 . e6 . g6 - . e6 . c#6 . a5 . . . .",
        "b5 . d6 . f6 - . d6 . b5 . g5 . . . .",
        "d5 - . d5 . . c5 d5 . f#5 . a5 . . g5 f#5",
        "e5 . . c#5 . . a4 . g5 - . e5 - . c#5 ."] },
      { chords: ["G7", "G7", "D7", "D7"], lead: [
        "b5 - - - g5 . d5 . f5 - . d5 b4 . g4 .",
        "b4 . d5 . g5 . b5 . d6 - . b5 . g5 . .",
        "a5 - - - f#5 . d5 . c5 - . a4 f#4 . d4 .",
        "d4 . f#4 . a4 . c5 . d5 . f#5 . a5 . c6 ."] }] },
    // ---- (0.0.74; Matthew, for Gnome dig: "when we clear a level, let's play a special celebration music loop") the gnome's party:
    // a bright, bouncing ska in G, round and round until you go on
    { name: "Confetti skank", style: "ska", bpm: 178, sections: [
      { chords: ["G", "C", "D", "G"], lead: [
        "g5 . b5 . d6 - b5 . g6 - . d6 . b5 . .",
        "e6 . c6 . g5 - c6 . e6 - . g6 . e6 . .",
        "f#6 . d6 . a5 - d6 . f#6 . e6 . d6 . c6 .",
        "b5 - d6 - g6 - - - . . d6 . g6 . . ."] },
      { chords: ["C", "D", "G", "G"], lead: [
        "e6 - . c6 . . g5 - c6 . e6 . g6 . . .",
        "f#6 - . d6 . . a5 - d6 . f#6 . a5 . . .",
        "g6 . f#6 . e6 . d6 . b5 . a5 . g5 . b5 .",
        "g5 - - - - - . . d6 . e6 . f#6 . . ."] }] },
    // ---- (0.0.102; Matthew, for Gnome world: "let's take the current loop and extend it into about 10 sections that vary the
    // current loop") Lantern hop grown into ten sections, about a minute: its three as they were, then the first again run up
    // and down in eighths, its third; a break of the bass, the chops and the drums under horn stabs; the first and second a
    // whole step up (D), the second answered in calls; a bridge (IV, iii, ii, V); the second again as a duet of the horn and the
    // bass alone; and the third, up, for the end, held. Round again, in C. Gnome world plays it on the land
    { name: "Lantern road", style: "ska", bpm: 170, sections: [
      { chords: ["C", "F", "G", "C"], lead: [
        "c5 . e5 . g5 - e5 . c6 - . g5 . e5 . .",
        "f5 . a5 . c6 - a5 . f5 - . c5 . f5 . .",
        "g5 . b5 . d6 - b5 . g5 . a5 . b5 . d6 .",
        "c6 - - . g5 . e5 . c5 - - - . . . ."] },
      { chords: ["Am", "F", "C", "G"], lead: [
        "e5 - . a5 . . c6 - b5 . a5 . e5 . . .",
        "f5 - . a5 . . c6 - d6 . c6 . a5 . . .",
        "e5 . g5 . c6 . e6 - d6 . c6 . g5 . . .",
        "d6 - . b5 . . g5 . d5 . g5 . b5 . d6 ."] },
      { chords: ["C", "F", "G", "C"], lead: [
        "c5 d5 e5 . g5 a5 g5 e5 c6 - . g5 a5 g5 e5 .",
        "f5 g5 a5 . c6 d6 c6 a5 f5 - . c5 d5 e5 f5 .",
        "g5 a5 b5 . d6 e6 d6 b5 g5 . a5 . b5 c6 d6 .",
        "e6 - d6 c6 - . g5 . e5 . c5 - - . . ."] },
      { chords: ["F", "G", "C", "C"], lead: [
        "a5 . c6 . f6 - e6 . d6 . c6 . a5 . . .",
        "b5 . d6 . g6 - f6 . e6 . d6 . b5 . . .",
        "c6 . e6 . g6 - e6 . c6 . g5 . e5 . c5 .",
        "c6 - - - - - . . g5 . a5 . b5 . . ."] },
      { chords: ["C", "F", "G", "C"], mute: ["chord"], lead: [
        "c6 . . . . . . . e6 . . . . . . .",
        "f6 . . . . . . . c6 . . . . . . .",
        "d6 . . . . . . . b5 . . . g5 . . .",
        "c6 . . . g5 . . . e5 . g5 . c6 . d6 ."] },
      { chords: ["C", "F", "G", "C"], up: 2, lead: [
        "c5 . e5 . g5 - e5 . c6 - . g5 . e5 . .",
        "f5 . a5 . c6 - a5 . f5 - . c5 . f5 . .",
        "g5 . b5 . d6 - b5 . g5 . a5 . b5 . d6 .",
        "c6 - - . g5 . e5 . c5 - - - . . . ."] },
      { chords: ["Am", "F", "C", "G"], up: 2, lead: [
        "e5 - . a5 . . . . c6 . b5 . a5 . . .",
        "f5 - . a5 . . . . d6 . c6 . a5 . . .",
        "e5 . g5 . c6 . e6 . g6 - e6 . d6 . c6 .",
        "d6 - - - b5 - - - g5 . a5 . b5 . d6 ."] },
      { chords: ["F", "Em", "Dm", "G"], up: 2, lead: [
        "a5 . . f5 a5 . c6 . a5 . . . f5 . . .",
        "g5 . . e5 g5 . b5 . g5 . . . e5 . . .",
        "f5 . . d5 f5 . a5 . f5 . a5 . d6 . . .",
        "g5 . b5 . d6 . g6 - - - f6 . e6 . d6 ."] },
      { chords: ["Am", "F", "C", "G"], up: 2, mute: ["drums", "chord"], lead: [
        "e5 - . a5 . . c6 - b5 . a5 . e5 . . .",
        "f5 - . a5 . . c6 - d6 . c6 . a5 . . .",
        "e5 . g5 . c6 . e6 - d6 . c6 . g5 . . .",
        "d6 - . b5 . . g5 . d5 . g5 . b5 . d6 ."] },
      { chords: ["F", "G", "C", "C"], up: 2, lead: [
        "a5 . c6 . f6 - e6 . d6 . c6 . a5 . . .",
        "b5 . d6 . g6 - f6 . e6 . d6 . b5 . . .",
        "c6 . e6 . g6 - e6 . c6 . e6 . g6 . c6 .",
        "c6 - - - - - - - . . . . . . . ."] }] }];
  // ---- a tune as steps: for every sixteenth, the notes that start on it (an instrument, a note, how many steps it lasts)
  const ARP = [0, 1, 2, 3, 2, 1, 2, 1];
  // (0.0.57) the bands under the lead, by a tune's style: what the bass, the chords and the drums play in a bar, put(k, note) on
  // its sixteenth k; at(k) the chord there; last, the section's last bar (a fill); b, the bar in its section
  const BASS = c => 40 + ((c.root - 4 + 12) % 12);                              // (the bass's root, between E2 and D#3)
  const VOICE = (c, ivs, lo) => ivs.map(iv => lo + ((c.root + iv) % 12));       // (a chord's tones, each in the octave from lo)
  const STYLES = {
    // ska, fast: the chord chopped on every off-beat; a walking bass on the beats (root, third, fifth, sixth, back to the
    // fifth); the kick on one and three, the snare on two and four, the hats on the off-beats; a roll to end a section
    ska(put, at, last) {
      for (let e = 0; e < 4; e++) { const k = 4 * e, c = at(k), r = BASS(c);
        put(k, ["bass", r + [0, c.third, 7, 9][e], e === 3 ? 1 : 2]); put(k, ["hat"]);
        put(k + 2, ["chord", VOICE(c, [0, c.third, 7], 62), 1, "half", 0.04]); put(k + 2, ["ohat"]); }
      put(14, ["bass", BASS(at(14)) + 7, 1]);
      put(0, ["kick"]); put(8, ["kick"]); put(4, ["snare"]); put(12, ["snare"]);
      if (last) for (const k of [13, 14, 15]) put(k, ["snare"]);
    },
    // New Orleans funk: two bars that answer each other: a syncopated bass (the root, its octave, the seventh, the fifth, a
    // minor third slid up to the major), chicken-scratch chords (third, seventh, ninth) between the beats, the kick off the
    // beat, the snare on two and four with ghost notes, sixteenths on the hats (and the tune's swing on them)
    funk(put, at, last, b) {
      const A = b % 2 === 0;
      const bass = A ? [[0, 0, 2], [3, 0, 1], [6, 10, 1], [7, 12, 1], [10, 7, 1], [12, 0, 1], [14, 10, 1], [15, 12, 1]]
                     : [[0, 0, 3], [4, 12, 1], [6, 10, 1], [8, 7, 2], [11, 0, 1], [13, 3, 1], [14, 4, 2]];
      for (const [k, iv, len] of bass) put(k, ["bass", BASS(at(k)) + iv, len]);
      for (const k of A ? [2, 5, 10, 13] : [1, 6, 9, 14]) { const c = at(k); put(k, ["chord", VOICE(c, [c.third, c.ext || 10, 14], 62), 1, "eighth", 0.038]); }
      for (const k of A ? [0, 3, 7, 10] : [0, 6, 10, 13]) put(k, ["kick"]);
      put(4, ["snare"]); put(12, ["snare"]);
      for (const k of [2, 7, 9, 15]) put(k, ["ghost"]);
      for (let k = 0; k < 16; k++) if (k !== 14) put(k, ["hat", k % 2 ? 0.03 : 0.055]);
      put(14, ["ohat"]);
      if (last) for (const k of [11, 13, 15]) put(k, ["snare"]);
    },
    // (0.0.63) reggae, laid back: the one drop (the kick and a rim click together on three, nothing on one), the hats on the
    // eighths and an open hat on the and of four; the chord chopped on two and four; an organ bubbling on the off sixteenths
    // (the root and the fifth, low then high); a round bass that leaves room (root, third, fifth, sixth, fifth, the octave)
    reggae(put, at, last) {
      put(8, ["kick"]); put(8, ["rim"]);
      for (const k of [0, 2, 4, 6, 10, 12]) put(k, ["hat", 0.035]);
      put(14, ["ohat"]);
      for (const k of [4, 12]) { const c = at(k); put(k, ["chord", VOICE(c, [0, c.third, 7], 64), 1, "half", 0.045]); }
      for (const k of [2, 3, 6, 7, 10, 11, 14, 15]) { const c = at(k); put(k, ["bubble", 55 + ((c.root - 7 + 12) % 12) + (k % 2 ? 19 : 12)]); }
      const bass = [[0, 0, 3], [3, null, 1], [6, 7, 2], [10, 9, 1], [12, 7, 1], [14, 12, 2]];
      for (const [k, iv, len] of bass) { const c = at(k); put(k, ["bass", BASS(c) + (iv === null ? c.third : iv), len]); }
      if (last) { put(13, ["rim"]); put(15, ["rim"]); }
    },
    // (0.0.102; Matthew, for Gnome world: "a reggae dub remix of the current music when we are under water --- half tempo -- keep
    // the beat going") dub, at half time: the one drop (the kick and a rim click on three, the rim into the echo); the hats few;
    // the chord skanked on two and four into the echo; the bass round and long, leaving room; a snare thrown into the echo now
    // and then
    dub(put, at, last, b) {
      put(8, ["kick"]); put(8, ["rim", "echo"]);
      for (const k of [2, 6, 10, 14]) put(k, ["hat", 0.022]);
      for (const k of [4, 12]) { const c = at(k); put(k, ["chord", VOICE(c, [0, c.third, 7], 64), 1, "half", 0.04, "echo"]); }
      for (const [k, iv, len] of [[0, 0, 5], [6, 7, 2], [8, 0, 3], [12, 7, 2], [14, 12, 2]]) put(k, ["bass", BASS(at(k)) + iv, len]);
      if (b % 2 === 1) put(14, ["snare", "echo"]);
      if (last) put(15, ["rim", "echo"]);
    },
    // progressive house: the kick on every beat, a clap on two and four, open hats on the off-beats; a bass rolling on the
    // off-beats; a pad (the chord with a ninth) swelling up between kicks, so it pumps; a plucked arpeggio in sixteenths
    house(put, at, last, b) {
      for (const k of [0, 4, 8, 12]) { const c = at(k); put(k, ["kick"]); put(k, ["pad", VOICE(c, [0, c.third, 7, c.ext || 2], 64), 4]); }
      put(4, ["clap"]); put(12, ["clap"]);
      for (const k of [2, 6, 10, 14]) { put(k, ["ohat"]); put(k, ["bass", BASS(at(k)) + (k === 14 && b % 2 ? 12 : 0), 2]); }
      for (let k = 1; k < 16; k += 2) put(k, ["hat", 0.03]);
      const UP = [0, 7, 12, 16, 19, 16, 12, 7];
      for (let k = 0; k < 16; k++) { const c = at(k), iv = UP[k % 8] === 16 ? 12 + c.third : UP[k % 8]; put(k, ["pluck", 57 + ((c.root - 9 + 12) % 12) + iv, 1]); }
      if (last) for (const k of [10, 13, 14, 15]) put(k, ["clap"]);
    },
  };
  // (0.0.102) A section may vary its tune: up, its notes and chords that many semitones higher; mute, the parts it leaves out
  // ("lead", "bass", "chord", "drums", ...); style, the band under it in another style. And a tune's dub (dub true): at half time,
  // the band in the dub style, the lead only now and then (the first half of every other bar), into the echo
  const DRUMS = ["kick", "snare", "hat", "ohat", "ghost", "clap", "rim"];
  function stepsOf(T, dub = false) {
    const out = [];
    T.sections.forEach((sec, si) => sec.lead.forEach((bar, b) => {
      const toks = bar.trim().split(/\s+/);
      if (toks.length !== 16) throw new Error(`${T.name}, section ${si + 1}, bar ${b + 1}: ${toks.length} sixteenths`);
      const up = sec.up || 0, mute = sec.mute || [], off = ev => mute.includes(ev[0]) || (mute.includes("drums") && DRUMS.includes(ev[0]));
      const halves = sec.chords[b].split("/").map(chordOf).map(c => up ? { ...c, root: (c.root + up) % 12 } : c), at = k => halves[k < 8 || halves.length === 1 ? 0 : 1];
      const base = out.length;
      for (let k = 0; k < 16; k++) out.push([]);
      toks.forEach((t, k) => { if (t === "-" || t === "." || off(["lead"]) || (dub && (b % 2 === 1 || k >= 8))) return; let len = 1; while (k + len < 16 && toks[k + len] === "-") len++; out[base + k].push(dub ? ["lead", midi(t) + up, len, "echo"] : ["lead", midi(t) + up, len]); });
      const style = dub ? "dub" : sec.style || T.style;
      if (style) { STYLES[style]((k, ev) => { if (!off(ev)) out[base + k].push(ev); }, at, b === sec.lead.length - 1, b); return; }
      for (let e = 0; e < 8; e++) { const c = at(2 * e), r = 40 + ((c.root - 4 + 12) % 12);   // (the bass between E2 and D#3)
        out[base + 2 * e].push(["bass", e === 7 ? r + 7 : e % 2 ? r + 12 : r, 2]); }
      for (let k = 0; k < 16; k++) { const c = at(k), tones = [0, c.third, 7, 12]; out[base + k].push(["arp", 57 + ((c.root - 9 + 12) % 12) + tones[ARP[k % 8]], 1]); }
      const last = b === sec.lead.length - 1;
      for (let k = 0; k < 16; k++) {
        if (T.kick.includes(k)) out[base + k].push(["kick"]);
        if (k === 4 || k === 12 || (last && k >= 13)) out[base + k].push(["snare"]);
        else if (k % 2 === 0 && !T.kick.includes(k)) out[base + k].push(["hat"]);
      }
    }));
    return out;
  }
  const SONGS = TUNES.map(T => ({ name: T.name, style: T.style || "chip", swing: T.swing || 0, step: 60 / T.bpm / 4, steps: stepsOf(T) }));
  // (a tune's dub, made the first time it is asked for: the same bars at half time, so a bar of it lines up with a bar of the tune)
  const DUBS = new Map();
  const dub = i => { if (!(i in SONGS)) return null; if (!DUBS.has(i)) { const T = TUNES[i]; DUBS.set(i, { name: T.name + " (dub)", base: i, style: "dub", lead: T.style || "chip", swing: 0.1, step: 60 / T.bpm / 4 * 2, steps: stepsOf(T, true) }); } return DUBS.get(i); };


  // ---- the chip: one for a page, its 🎵 and 🔊 kept under the page's key; MIX the loudness of the music and of the sounds
  // (0.0.56: Star wave's sounds louder than its music, Matthew: "the sound effects are too quiet compared to the music in star wave")
  function make(KEY, MIX = {}) {
    const LOUD = { music: MIX.music ?? 0.55, sfx: MIX.sfx ?? 0.8 };
    const kept = (k, d) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? d : v; } catch (e) { return d; } };
    const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* this visit only */ } };
      let ctx = null, master, musicBus, sfxBus, noise, pulse = {}, timer = 0, song = null, at = 0, next = 0, playing = false;
    // (0.0.102) the decks: each a song playing (from at, its next step at next), into its own gain and a high-pass (for a DJ's
    // fade: the one going out thinned from the bottom as it fades); its wet bus also into the echo (a delay fed back through a
    // low-pass, its tail going on after the deck has gone). The first deck's song, at, next are the song, at, next above
    let decks = [], echo = null;

    const S = { music: kept("music", true), sfx: kept("sfx", true), tune: 0, notes: 0, sounds: 0, hush: 1,
                vol: { music: kept("music-volume", 1), sfx: kept("sfx-volume", 1) } };   // (0.0.56: each slider's level, 0 to 1)
    const level = which => (which === "music" ? S.music : S.sfx) ? LOUD[which] * S.vol[which] * (which === "music" ? S.hush : 1) : 0;
    function wave(duty) {   // (a pulse wave, on for `duty` of each cycle: its first 32 harmonics)
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = 2 * Math.sin(Math.PI * k * duty) / (Math.PI * k);
      return ctx.createPeriodicWave(re, im);
    }
    function init() {
      if (ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4; comp.connect(ctx.destination);
      master = ctx.createGain(); master.gain.value = 0.8; master.connect(comp);
      musicBus = ctx.createGain(); musicBus.gain.value = level("music"); musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = level("sfx"); sfxBus.connect(master);
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      pulse = { quarter: wave(0.25), eighth: wave(0.125), half: wave(0.5) };
      { const inp = ctx.createGain(), d = ctx.createDelay(3), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), out = ctx.createGain();
        inp.gain.value = 0.55; d.delayTime.value = 0.5; fb.gain.value = 0.5; lp.type = "lowpass"; lp.frequency.value = 1800; out.gain.value = 0.9;
        inp.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out); out.connect(musicBus); echo = { inp, d }; }
      document.addEventListener("visibilitychange", () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
      return true;
    }
    // a tone: a wave (a pulse's name, or "triangle", "sine"), from one pitch to another, its loudness held then let go
    function tone(bus, kind, f0, f1, t, dur, vol, vib = 0, attack = 0.004) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      if (pulse[kind]) o.setPeriodicWave(pulse[kind]); else o.type = kind;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack);
      g.gain.setValueAtTime(vol, Math.max(t + attack, t + dur - 0.02)); g.gain.linearRampToValueAtTime(0, t + dur);
      if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(vib, t + Math.min(0.25, dur));
        l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + 0.02); }
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
    }
    function hiss(bus, t, dur, vol, filter, freq, q = 1) {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noise; f.type = filter; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
    }
    function play(ev, t, step, D) {
      S.notes++;
      const [inst, n, len] = ev, song = D.song, musicBus = ev[ev.length - 1] === "echo" ? D.wet : D.out, style = song.lead || song.style;
      if (inst === "lead" && style === "ska") {   // (a horn: a square lead, an octave below it on the triangle; in a dub, softer)
        const v = song.style === "dub" ? 0.6 : 1; tone(musicBus, "half", hz(n), hz(n), t, len * step * 0.9, 0.075 * v, len >= 4 ? 16 : 0); tone(musicBus, "triangle", hz(n - 12), hz(n - 12), t, len * step * 0.9, 0.1 * v); }
      else if (inst === "lead") tone(musicBus, style === "house" ? "half" : "quarter", hz(n), hz(n), t, len * step * 0.95, style === "house" ? 0.085 : 0.11, len >= 4 ? 14 : 0);
      else if (inst === "chord") for (const m of n) tone(musicBus, ev[3], hz(m), hz(m), t, len * step * (song.style === "dub" ? 0.35 : 0.6), ev[4]);
      else if (inst === "pad") for (const m of n) tone(musicBus, "half", hz(m), hz(m), t + 0.01, len * step * 0.95, 0.017, 0, len * step * 0.6);
      else if (inst === "pluck") tone(musicBus, "quarter", hz(n), hz(n), t, step * 0.5, 0.038);
      else if (inst === "ohat") hiss(musicBus, t, 0.11, 0.06, "highpass", 6500);
      else if (inst === "ghost") hiss(musicBus, t, 0.06, 0.06, "bandpass", 2000, 0.7);
      else if (inst === "clap") for (const d of [0, 0.012, 0.024]) hiss(musicBus, t + d, 0.1, 0.15, "bandpass", 1300, 0.9);
      else if (inst === "rim") { hiss(musicBus, t, 0.04, 0.14, "bandpass", 2600, 3); tone(musicBus, "triangle", 900, 700, t, 0.025, 0.08); }
      else if (inst === "bubble") tone(musicBus, "quarter", hz(n), hz(n), t, step * 0.45, 0.026);
      else if (inst === "arp") tone(musicBus, "eighth", hz(n), hz(n), t, step * 0.8, 0.032);
      else if (inst === "bass") tone(musicBus, song.style === "dub" ? "sine" : "triangle", hz(n), hz(n), t, len * step * 0.9, song.style === "dub" ? 0.42 : 0.3);
      else if (inst === "kick") { tone(musicBus, "sine", 160, 45, t, 0.1, 0.5); }
      else if (inst === "snare") { hiss(musicBus, t, 0.12, 0.22, "bandpass", 1900, 0.7); tone(musicBus, "triangle", 190, 150, t, 0.06, 0.15); }
      else if (inst === "hat") hiss(musicBus, t, 0.03, typeof ev[1] === "number" ? ev[1] : 0.06, "highpass", 7000);
    }
    // (the scheduler: every 25 ms, the notes of the next 120 ms put on the audio clock)
    const adv = (D, k) => D.song.step * (D.song.swing ? (k % 2 ? 1 - D.song.swing : 1 + D.song.swing) : 1);   // (a swing: the off sixteenths late)
    function tick() {
      if (!playing) return;
      for (const D of decks) while (D.next < ctx.currentTime + 0.12 && D.next < D.until) {
        for (const ev of D.song.steps[D.at]) play(ev, D.next, D.song.step, D);
        D.next += adv(D, D.at); D.at = (D.at + 1) % D.song.steps.length;
      }
      decks = decks.filter(D => { if (D.until < ctx.currentTime - 1) { D.out.disconnect(); return false; } return true; });
      const D0 = decks[decks.length - 1]; if (D0) { song = D0.song; at = D0.at; next = D0.next; }
    }
    function deck(sg, t0, from = 0) {
      const out = ctx.createGain(), hp = ctx.createBiquadFilter(), wet = ctx.createGain();
      hp.type = "highpass"; hp.frequency.value = 10; out.connect(hp); hp.connect(musicBus); wet.connect(out); wet.connect(echo.inp);
      const D = { song: sg, at: from % sg.steps.length, next: t0, until: Infinity, out, hp, wet }; decks.push(D);
      if (sg.style === "dub") echo.d.delayTime.setValueAtTime(sg.step * 3, t0);   // (the echo a dotted eighth of the dub)
      return D;
    }
    function start(i) {
      S.tune = i in SONGS ? i : 0; song = SONGS[S.tune];
      if (!ctx) return;
      for (const D of decks) D.out.disconnect(); decks = [];
      const D = deck(song, ctx.currentTime + 0.25); at = 0; next = D.next; playing = true;
      clearInterval(timer); timer = setInterval(tick, 25); tick();
    }
    function stop() { playing = false; clearInterval(timer); timer = 0; for (const D of decks) D.out.disconnect(); decks = []; }
    // (0.0.102; Matthew: "fade like a DJ") mix(x): song x (a number, or a dub) brought in on the next bar of the one playing, over
    // fade seconds: it rises as the other falls, the other thinned from the bottom as it goes. A tune and its dub go on from the
    // same bar, so the beat goes on through the change; any other starts at its top
    function mix(x, fade = 2.5) {
      const sg = typeof x === "number" ? SONGS[x] : x; if (!sg) return;
      if (typeof x === "number") S.tune = x;
      if (!ctx || !S.music) { song = sg; return; }
      const cur = decks[decks.length - 1];
      if (!playing || !cur) { start(typeof x === "number" ? x : 0); if (typeof x !== "number") { for (const D of decks) D.out.disconnect(); decks = []; deck(sg, ctx.currentTime + 0.25); } return; }
      if (cur.song === sg) return;
      let n = (16 - cur.at % 16) % 16 || 16, t0 = cur.next; for (let k = 0; k < n; k++) t0 += adv(cur, cur.at + k);
      const kin = (a, b) => (a.base ?? SONGS.indexOf(a)) === (b.base ?? SONGS.indexOf(b));
      const D = deck(sg, t0, kin(sg, cur.song) ? cur.at + n : 0);
      D.out.gain.setValueAtTime(0.0001, ctx.currentTime); D.out.gain.setValueAtTime(0.0001, t0); D.out.gain.linearRampToValueAtTime(1, t0 + fade);
      for (const O of decks) if (O !== D && O.until === Infinity) { O.out.gain.setValueAtTime(O.out.gain.value, t0); O.out.gain.linearRampToValueAtTime(0.0001, t0 + fade);
        O.hp.frequency.setValueAtTime(10, t0); O.hp.frequency.exponentialRampToValueAtTime(700, t0 + fade); O.until = t0 + fade; }
      while (decks.length > 3) decks.shift().out.disconnect();
    }
    // (a game's sound; a big one (duck) dips the music under it for a moment)
    const sfx = (f, duck = 0) => { if (!ctx || !S.sfx) return; S.sounds++; const t = ctx.currentTime + 0.005; f(t);
      if (duck && S.music) { const g = musicBus.gain; g.cancelScheduledValues(t); g.setTargetAtTime(level("music") * (1 - duck), t, 0.01); g.setTargetAtTime(level("music"), t + duck * 0.5, 0.08); } };
    return {
      // (a tap or a key: the chip made, or woken, and tune i started if music is on and nothing plays)
      gesture(i) { if (!init()) return; if (ctx.state === "suspended") ctx.resume(); if (!playing && S.music && i != null) start(i); },
      tune(i) { if (ctx && S.music) start(i); else { S.tune = i in SONGS ? i : 0; song = SONGS[S.tune]; } },
      stop, mix,
      music(on) { S.music = !!on; keep("music", S.music); if (!ctx) return; musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setTargetAtTime(level("music"), ctx.currentTime, 0.05); if (!on) stop(); },
      sounds(on) { S.sfx = !!on; keep("sfx", S.sfx); if (ctx) sfxBus.gain.setTargetAtTime(level("sfx"), ctx.currentTime, 0.05); },
      // (0.0.104, Gnome world's villagers read aloud) the music softened to k of its level while a voice speaks, and back at 1:
      // for now only, not kept like the slider
      hush(k) { S.hush = Math.max(0, Math.min(1, k)); if (!ctx) return; const g = musicBus.gain; g.cancelScheduledValues(ctx.currentTime); g.setTargetAtTime(level("music"), ctx.currentTime, k < 1 ? 0.08 : 0.3); },
      get musicOn() { return S.music; }, get soundsOn() { return S.sfx; },
      // (0.0.56) how loud the music or the sounds are, 0 to 1, each its own slider's, kept on this device
      volumeOf: which => S.vol[which],
      setVolume(which, v) { S.vol[which] = Math.max(0, Math.min(1, v)); keep(which + "-volume", S.vol[which]);
        if (ctx) { const b = which === "music" ? musicBus : sfxBus; b.gain.cancelScheduledValues(ctx.currentTime); b.gain.setTargetAtTime(level(which), ctx.currentTime, 0.03); } },
      status: () => ({ tune: SONGS[S.tune].name, playing, notes: S.notes, sounds: S.sounds, state: ctx ? ctx.state : "not made", decks: decks.map(D => ({ song: D.song.name, at: D.at, until: D.until })) }),
      // (a game's own sounds: f(t) at the audio clock's now, if sounds are on; and the chip's voices for them, on the sounds' bus)
      sfx,
      tone: (kind, f0, f1, t, dur, vol, vib = 0) => tone(sfxBus, kind, f0, f1, t, dur, vol, vib),
      hiss: (t, dur, vol, filter, freq, q = 1) => hiss(sfxBus, t, dur, vol, filter, freq, q),
      seq: (t, notes, each, kind = "half", vol = 0.14) => notes.forEach((n, i) => tone(sfxBus, kind, hz(n), hz(n), t + i * each, each * 0.95, vol)),
      get ctx() { return ctx; }, get bus() { return sfxBus; },
    };
  }
  window.HazelChip = { make, TUNES, SONGS, hz, midi, dub };
})();
