// hazeljs-examples, Pinball's music and sounds (ticket 793; Matthew: "let's have music and sound effects for pin ball.
// fast-paced, mega-man themed style, but original MIDI constructions."). Three tunes of our own, written below as notes (MIDI
// numbers, from names such as "e5" and "c#4") on a grid of sixteenths, with a chord for each bar; and a little chip, made of
// the Web Audio API, that plays them: a lead on a pulse wave a quarter on, an arpeggio on a thinner pulse (an eighth on), a
// triangle bass bouncing in octaves, and drums of noise (kick, snare, hats). The table's sounds (bumpers, slingshots,
// flippers, the plunger, portals, a ball lost, a thousand points, the game's start and end) are made on the same chip.
// Nothing plays before a tap or a key (browsers ask for that); 🎵 and 🔊 turn each off, remembered on this device.
(() => {
  "use strict";
  const PITCH = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const midi = s => { const m = /^([a-g])(#?)(\d)$/.exec(s); if (!m) throw new Error("not a note: " + s); return 12 * (+m[3] + 1) + PITCH[m[1]] + (m[2] ? 1 : 0); };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  // a chord by its name: its root (0 to 11) and its third (minor or major); "C/D" is C for the bar's first half, D its second
  const chordOf = name => { const m = /^([A-G])(#?)(m?)$/.exec(name); if (!m) throw new Error("not a chord: " + name); return { root: PITCH[m[1].toLowerCase()] + (m[2] ? 1 : 0), third: m[3] ? 3 : 4 }; };

  // ---- the tunes: a bar is 16 sixteenths, each a note, "-" (the note before held on) or "." (rest)
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
        "e6 - - - d6 - c6 - b5 - g#5 - e5 - - -"] }] }];
  // which tune each board plays: the floaty one for the ocean and the moon, the stormy one for the volcano, the funfair and
  // the portals
  const BOARD_TUNE = [0, 1, 2, 0, 0, 0, 1, 2, 1, 0];

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

  // ---- the chip
  let ctx = null, master, musicBus, sfxBus, noise, pulse = {}, timer = 0, song = null, at = 0, next = 0, playing = false;
  const kept = (k, d) => { try { const v = JSON.parse(localStorage.getItem("hazeljs-examples/pinball/" + k)); return v === null ? d : v; } catch (e) { return d; } };
  const keep = (k, v) => { try { localStorage.setItem("hazeljs-examples/pinball/" + k, JSON.stringify(v)); } catch (e) { /* this visit only */ } };
  const S = { music: kept("music", true), sfx: kept("sfx", true), tune: 0, notes: 0, sounds: 0 };
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
    musicBus = ctx.createGain(); musicBus.gain.value = S.music ? 0.55 : 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = S.sfx ? 0.8 : 0; sfxBus.connect(master);
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
  function start(board) {
    S.tune = BOARD_TUNE[board] ?? 0; song = SONGS[S.tune];
    if (!ctx) return;
    at = 0; next = ctx.currentTime + 0.25; playing = true;
    clearInterval(timer); timer = setInterval(tick, 25); tick();
  }
  function stop() { playing = false; clearInterval(timer); timer = 0; }

  // ---- the table's sounds
  const now = () => ctx.currentTime + 0.005;
  const sfx = f => { if (!ctx || !S.sfx) return; S.sounds++; f(now()); };
  const seq = (t, notes, each, kind = "half", vol = 0.14) => notes.forEach((n, i) => tone(sfxBus, kind, hz(n), hz(n), t + i * each, each * 0.95, vol));
  const SFX = {
    bump: i => sfx(t => tone(sfxBus, "half", hz(84 + 3 * (i % 5)), hz(91 + 3 * (i % 5)), t, 0.07, 0.15)),
    sling: () => sfx(t => { tone(sfxBus, "quarter", hz(79), hz(64), t, 0.08, 0.13); hiss(sfxBus, t, 0.05, 0.1, "highpass", 4000); }),
    flip: () => sfx(t => { hiss(sfxBus, t, 0.05, 0.2, "lowpass", 900); tone(sfxBus, "half", hz(45), hz(40), t, 0.035, 0.1); }),
    launch: k => sfx(t => { tone(sfxBus, "quarter", hz(48), hz(72 + Math.round(12 * k / 100)), t, 0.28, 0.12); hiss(sfxBus, t, 0.3, 0.12, "bandpass", 1200, 0.5); }),
    portal: () => sfx(t => { const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(hz(72), t); o.frequency.exponentialRampToValueAtTime(hz(96), t + 0.18); o.frequency.exponentialRampToValueAtTime(hz(79), t + 0.36);
      l.frequency.value = 22; lg.gain.value = 60; l.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.18, t); g.gain.linearRampToValueAtTime(0, t + 0.38); o.connect(g); g.connect(sfxBus);
      o.start(t); l.start(t); o.stop(t + 0.4); l.stop(t + 0.4); }),
    drain: () => sfx(t => { seq(t, [76, 75, 72, 71, 67, 64, 60], 0.06, "half", 0.13); tone(sfxBus, "triangle", hz(40), hz(28), t + 0.42, 0.3, 0.35); }),
    bonus: () => sfx(t => seq(t, [72, 76, 79, 84, 88, 91, 96], 0.045, "quarter", 0.1)),
    fanfare: () => sfx(t => { seq(t, [64, 67, 71], 0.09, "quarter", 0.12); tone(sfxBus, "quarter", hz(76), hz(76), t + 0.27, 0.4, 0.12, 14); }),
    over: () => sfx(t => { seq(t, [72, 71, 70], 0.2, "quarter", 0.12); tone(sfxBus, "quarter", hz(69), hz(69), t + 0.6, 0.7, 0.12, 18); tone(sfxBus, "triangle", hz(45), hz(45), t + 0.6, 0.7, 0.3); }),
    // (round two, ticket 805) a lamp lit: a blip climbing the scale as its row fills; a row all lit: a run up and a sparkle; a
    // kicker's spring; a ball out of a portal; a ball saved
    lamp: n => sfx(t => { const m = [79, 81, 84, 86, 88, 91, 93, 96][Math.min(7, Math.max(0, n - 1))]; tone(sfxBus, "eighth", hz(m), hz(m), t, 0.05, 0.1); tone(sfxBus, "eighth", hz(m + 12), hz(m + 12), t + 0.03, 0.04, 0.05); }),
    row: () => sfx(t => { seq(t, [72, 76, 79, 84, 88, 91, 96, 100], 0.035, "eighth", 0.1); for (let i = 0; i < 6; i++) tone(sfxBus, "half", hz(96 + (i % 3) * 4), hz(96 + (i % 3) * 4), t + 0.3 + i * 0.05, 0.04, 0.05); }),
    kick: () => sfx(t => { tone(sfxBus, "quarter", hz(55), hz(84), t, 0.16, 0.14); hiss(sfxBus, t, 0.08, 0.12, "bandpass", 2500, 0.8); }),
    warpOut: () => sfx(t => { tone(sfxBus, "triangle", hz(67), hz(91), t, 0.14, 0.16); tone(sfxBus, "half", hz(91), hz(91), t + 0.12, 0.08, 0.08); }),
    saved: () => sfx(t => { seq(t, [72, 79, 84, 88], 0.08, "quarter", 0.12); tone(sfxBus, "quarter", hz(91), hz(91), t + 0.32, 0.35, 0.11, 14); })
  };

  window.PinballSound = {
    // (a tap or a key: the chip made, or woken, and the board's tune started if it is not playing)
    gesture(board) { if (!init()) return; if (ctx.state === "suspended") ctx.resume(); if (!playing && S.music && board != null) start(board); },
    tune(board) { if (ctx && S.music) start(board); else { S.tune = BOARD_TUNE[board] ?? 0; song = SONGS[S.tune]; } },
    stop,
    music(on) { S.music = !!on; keep("music", S.music); if (!ctx) return; musicBus.gain.setTargetAtTime(on ? 0.55 : 0, ctx.currentTime, 0.05); if (!on) stop(); },
    sounds(on) { S.sfx = !!on; keep("sfx", S.sfx); if (ctx) sfxBus.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05); },
    get musicOn() { return S.music; }, get soundsOn() { return S.sfx; },
    // (what has played: the tune's name, notes and sounds so far, the chip's state)
    status: () => ({ tune: SONGS[S.tune].name, playing, notes: S.notes, sounds: S.sounds, state: ctx ? ctx.state : "not made" }),
    ...SFX,
    TUNES, SONGS
  };
})();
