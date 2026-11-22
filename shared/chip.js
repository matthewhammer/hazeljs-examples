// hazeljs-examples: the little chip that plays the games' music and makes their sounds (0.0.55; moved here from Pinball's
// sound.js, ticket 793, Matthew: "let's have music and sound effects for pin ball. fast-paced, mega-man themed style, but
// original MIDI constructions"; then, for Star wave: "let's create another set of melodies and chord progressions, in the style
// of mega man. Let's share these songs with the other game that has them: pinball"). Eight tunes of our own, written below as
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
  // a chord by its name: its root (0 to 11) and its third (minor or major); "C/D" is C for the bar's first half, D its second
  const chordOf = name => { const m = /^([A-G])(#?)(m?)$/.exec(name); if (!m) throw new Error("not a chord: " + name); return { root: PITCH[m[1].toLowerCase()] + (m[2] ? 1 : 0), third: m[3] ? 3 : 4 }; };

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
        "g6 - f6 - d6 - b5 - g5 - b5 - d6 - f6 -"] }] }];
  // ---- a tune as steps: for every sixteenth, the notes that start on it (an instrument, a note, how many steps it lasts)
  const ARP = [0, 1, 2, 3, 2, 1, 2, 1];
  function stepsOf(T) {
    const out = [];
    T.sections.forEach((sec, si) => sec.lead.forEach((bar, b) => {
      const toks = bar.trim().split(/\s+/);
      if (toks.length !== 16) throw new Error(`${T.name}, section ${si + 1}, bar ${b + 1}: ${toks.length} sixteenths`);
      const halves = sec.chords[b].split("/").map(chordOf), at = k => halves[k < 8 || halves.length === 1 ? 0 : 1];
      const base = out.length;
      for (let k = 0; k < 16; k++) out.push([]);
      toks.forEach((t, k) => { if (t === "-" || t === ".") return; let len = 1; while (k + len < 16 && toks[k + len] === "-") len++; out[base + k].push(["lead", midi(t), len]); });
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
  const SONGS = TUNES.map(T => ({ name: T.name, step: 60 / T.bpm / 4, steps: stepsOf(T) }));


  // ---- the chip: one for a page, its 🎵 and 🔊 kept under the page's key; MIX the loudness of the music and of the sounds
  // (0.0.56: Star wave's sounds louder than its music, Matthew: "the sound effects are too quiet compared to the music in star wave")
  function make(KEY, MIX = {}) {
    const LOUD = { music: MIX.music ?? 0.55, sfx: MIX.sfx ?? 0.8 };
    const kept = (k, d) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? d : v; } catch (e) { return d; } };
    const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* this visit only */ } };
      let ctx = null, master, musicBus, sfxBus, noise, pulse = {}, timer = 0, song = null, at = 0, next = 0, playing = false;

    const S = { music: kept("music", true), sfx: kept("sfx", true), tune: 0, notes: 0, sounds: 0,
                vol: { music: kept("music-volume", 1), sfx: kept("sfx-volume", 1) } };   // (0.0.56: each slider's level, 0 to 1)
    const level = which => (which === "music" ? S.music : S.sfx) ? LOUD[which] * S.vol[which] : 0;
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
      document.addEventListener("visibilitychange", () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
      return true;
    }
    // a tone: a wave (a pulse's name, or "triangle", "sine"), from one pitch to another, its loudness held then let go
    function tone(bus, kind, f0, f1, t, dur, vol, vib = 0) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      if (pulse[kind]) o.setPeriodicWave(pulse[kind]); else o.type = kind;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
      g.gain.setValueAtTime(vol, Math.max(t + 0.004, t + dur - 0.02)); g.gain.linearRampToValueAtTime(0, t + dur);
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
    function play(ev, t, step) {
      S.notes++;
      const [inst, n, len] = ev;
      if (inst === "lead") tone(musicBus, "quarter", hz(n), hz(n), t, len * step * 0.95, 0.11, len >= 4 ? 14 : 0);
      else if (inst === "arp") tone(musicBus, "eighth", hz(n), hz(n), t, step * 0.8, 0.032);
      else if (inst === "bass") tone(musicBus, "triangle", hz(n), hz(n), t, len * step * 0.9, 0.3);
      else if (inst === "kick") { tone(musicBus, "sine", 160, 45, t, 0.1, 0.5); }
      else if (inst === "snare") { hiss(musicBus, t, 0.12, 0.22, "bandpass", 1900, 0.7); tone(musicBus, "triangle", 190, 150, t, 0.06, 0.15); }
      else if (inst === "hat") hiss(musicBus, t, 0.03, 0.06, "highpass", 7000);
    }
    // (the scheduler: every 25 ms, the notes of the next 120 ms put on the audio clock)
    function tick() {
      if (!playing || !song) return;
      while (next < ctx.currentTime + 0.12) {
        for (const ev of song.steps[at]) play(ev, next, song.step);
        next += song.step; at = (at + 1) % song.steps.length;
      }
    }
    function start(i) {
      S.tune = i in SONGS ? i : 0; song = SONGS[S.tune];
      if (!ctx) return;
      at = 0; next = ctx.currentTime + 0.25; playing = true;
      clearInterval(timer); timer = setInterval(tick, 25); tick();
    }
    function stop() { playing = false; clearInterval(timer); timer = 0; }
    // (a game's sound; a big one (duck) dips the music under it for a moment)
    const sfx = (f, duck = 0) => { if (!ctx || !S.sfx) return; S.sounds++; const t = ctx.currentTime + 0.005; f(t);
      if (duck && S.music) { const g = musicBus.gain; g.cancelScheduledValues(t); g.setTargetAtTime(level("music") * (1 - duck), t, 0.01); g.setTargetAtTime(level("music"), t + duck * 0.5, 0.08); } };
    return {
      // (a tap or a key: the chip made, or woken, and tune i started if music is on and nothing plays)
      gesture(i) { if (!init()) return; if (ctx.state === "suspended") ctx.resume(); if (!playing && S.music && i != null) start(i); },
      tune(i) { if (ctx && S.music) start(i); else { S.tune = i in SONGS ? i : 0; song = SONGS[S.tune]; } },
      stop,
      music(on) { S.music = !!on; keep("music", S.music); if (!ctx) return; musicBus.gain.cancelScheduledValues(ctx.currentTime); musicBus.gain.setTargetAtTime(level("music"), ctx.currentTime, 0.05); if (!on) stop(); },
      sounds(on) { S.sfx = !!on; keep("sfx", S.sfx); if (ctx) sfxBus.gain.setTargetAtTime(level("sfx"), ctx.currentTime, 0.05); },
      get musicOn() { return S.music; }, get soundsOn() { return S.sfx; },
      // (0.0.56) how loud the music or the sounds are, 0 to 1, each its own slider's, kept on this device
      volumeOf: which => S.vol[which],
      setVolume(which, v) { S.vol[which] = Math.max(0, Math.min(1, v)); keep(which + "-volume", S.vol[which]);
        if (ctx) { const b = which === "music" ? musicBus : sfxBus; b.gain.cancelScheduledValues(ctx.currentTime); b.gain.setTargetAtTime(level(which), ctx.currentTime, 0.03); } },
      status: () => ({ tune: SONGS[S.tune].name, playing, notes: S.notes, sounds: S.sounds, state: ctx ? ctx.state : "not made" }),
      // (a game's own sounds: f(t) at the audio clock's now, if sounds are on; and the chip's voices for them, on the sounds' bus)
      sfx,
      tone: (kind, f0, f1, t, dur, vol, vib = 0) => tone(sfxBus, kind, f0, f1, t, dur, vol, vib),
      hiss: (t, dur, vol, filter, freq, q = 1) => hiss(sfxBus, t, dur, vol, filter, freq, q),
      seq: (t, notes, each, kind = "half", vol = 0.14) => notes.forEach((n, i) => tone(sfxBus, kind, hz(n), hz(n), t + i * each, each * 0.95, vol)),
      get ctx() { return ctx; }, get bus() { return sfxBus; },
    };
  }
  window.HazelChip = { make, TUNES, SONGS, hz, midi };
})();
