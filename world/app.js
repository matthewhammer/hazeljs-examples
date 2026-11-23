// hazeljs-examples, Gnome world (0.0.76; Matthew, 2026-11-23: "I'd like a new variation of gnome dig. This one is called
// 'gnome world.', until I think of a better name"; "move the gnome in a sub-tile way"; "a world that's larger than one
// screen"; "fill the entire available screen with game tiles in full screen mode"; "the feel of a platform NES/SNES game ---
// we scroll the level smoothly to center the gnome we control"; "at least 8 or 16 screen fulls of width, and maybe 4 or 8
// screen fulls of height, between deep underground and trees and tree houses"). The world, 448 tiles across and 128 down
// (sixteen screens of 28 by eight of 16), planned by Hazel (World.plan: the land, the rock, the rivers, the beavers, the
// villages, the great trees, the places under the ground), and built here into its tiles. Every frame the gnome takes a step
// in Hazel (World.step: running, jumping, climbing, digging, swimming), the beavers think in Hazel ten times a second
// (World.beaver), and how high a dam holds its river is Hazel (World.water_row); here, the water seeping through the ground,
// the boulders falling, the camera, and the drawing.
//
// (Matthew: "please get inspired by the artwork of Rien Poortvliet ... This is a key inspiration. And we should give credit";
// "We aren't copying any image/illustration, but we are drawing inspiration and giving credit") The pictures are inspired by
// Rien Poortvliet's paintings for Gnomes (Wil Huygen and Rien Poortvliet, 1976): the woods, the gnomes' homes among the roots,
// the earth in cutaway. All of them are our own, drawn here; none of his is copied. The roots, the ground and the trees are
// Gnome dig's (and its trees Messed Up Dress Up's).
//
// (Matthew: "Or just use hazel jit as you prototype the game logic") The rules run compiled by hazel-jit: Hazel's library
// from the hazeljs branch's build (hazelgrove/hazel#2857), whose Hazel.jitProgram compiles them as the page loads; where that
// does not load, hazeljs 0.0.4 from npm runs them interpreted (?lib=npm asks for it), slower: a step 4 ms, not 0.02.
(async () => {
  "use strict";
  const LIB_JIT = "https://build.hazel.org/hazeljs/hazel-lib.js", LIB_NPM = "https://cdn.jsdelivr.net/npm/hazeljs@0.0.4/hazel-lib.js";
  const PROGRAM = "world", MODULES = ["World"];
  const TAIL = "(plan = World.plan, ground = World.ground, village = World.village, furnish = World.furnish, limbs = World.limbs, styles = World.styles, beaver = World.beaver, water_row = World.water_row, step = World.step, roots = World.roots, threads = World.threads)";
  const KEY = "hazeljs-examples/world/";
  const Q = new URLSearchParams(location.search);
  const $ = id => document.getElementById(id);
  const text = async path => { const r = await fetch(path, { cache: "no-cache" }); if (!r.ok) throw new Error(path + ": " + r.status); return (await r.text()).replace(/\s+$/, ""); };
  const load = src => new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => no(new Error(src)); document.body.append(s); });
  const kept = (k, dflt) => { try { const v = JSON.parse(localStorage.getItem(KEY + k)); return v === null ? dflt : v; } catch (e) { return dflt; } };
  const keep = (k, v) => { try { localStorage.setItem(KEY + k, JSON.stringify(v)); } catch (e) { /* this visit only */ } };
  const SND = window.DigSound || null;   // (Gnome dig's music and sounds, dig/sound.js)

  // ---- the world's tiles: what is there (mat), its water (wat: for ground, the share of its pores full; for air, the share of
  // the tile full of water), what is behind an open tile (bg), what is on it (fix), a gem in it, roots in it, a digging's cracks
  const WW = 448, WH = 128, NN = WW * WH;
  const AIR = 0, SOIL = 1, CLAY = 2, SAND = 3, SSTONE = 4, SHALE = 5, LIME = 6, GRANITE = 7, MASON = 8, TIMBER = 9;
  const B_NONE = 0, B_DUG = 1, B_PLASTER = 2, B_WOOD = 3, B_STAIR = 4, B_CAVE = 5;
  const F_LADDER = 1, F_PLAT = 2, F_STAIR = 3, F_BRIDGE = 4, F_HATCH = 5, F_DOOR = 6;
  const mat = new Uint8Array(NN), wat = new Float32Array(NN), bg = new Uint8Array(NN), fix = new Uint8Array(NN), gem = new Uint8Array(NN), root = new Uint8Array(NN);
  const surf0 = new Int16Array(WW), top = new Int16Array(WW);   // (the land's surface as made; the highest solid tile now)
  const at = (c, r) => r * WW + c;
  const inside = (c, r) => c >= 0 && c < WW && r >= 0 && r < WH;
  // each kind of ground, from Hazel (World.ground): its pores (0 to 1), water's flow through it (a share of the pores a step), the
  // share that clings, the steps to dig it, its color
  const PORES = new Float32Array(10), FLOW = new Float32Array(10), CLING = new Float32Array(10), DIG = new Uint8Array(10), COLOR = [], NAME = [];
  const S = { built: null, lib: "", libFailed: false, plan: null, seed: kept("seed", 7), rivers: [], dams: [], lodges: [], beavers: [], rooms: [], villages: [],
    greats: [], trees: [], bushes: [], shrooms: [], rootSets: [], threadSets: [], rootPlan: [], boulders: [], ducts: [], lamps: [], items: [], houses: [], bridges: [], smoke: [], parts: [], drops: [], rain: 0, rainAt: 0,
    styles: [], dry: [], works: new Map(), g: null, hearts: 5, gems: kept("gems", 0), hurtAt: -1e9, faintAt: 0, start: { x: 12500, y: 0 }, keys: { left: false, right: false, up: false, down: false },
    jumpQueued: false, cam: { x: 0, y: 0, set: false }, frame: 0, map: kept("map", true), banner: null, places: [], stepMs: [], beaverAt: 0, damAt: 0, minimapAt: -1e9, dirty: true };
  const H = () => S.built && S.built.ok ? S.built.value : null;
  let seedRand = 1;
  const rand = () => { seedRand = (seedRand * 1103515245 + 12345) & 0x7fffffff; return seedRand / 0x7fffffff; };

  // ---- building the world from Hazel's plan
  function build(h, seed) {
    const p = h.plan(seed); S.plan = p; seedRand = seed * 7 + 3;
    for (let k = 0; k <= 9; k++) { const gr = h.ground(k); PORES[k] = gr.pores / 100; FLOW[k] = gr.flow / 1000; CLING[k] = gr.cling / 100; DIG[k] = gr.dig;
      COLOR[k] = "#" + gr.color.toString(16).padStart(6, "0"); NAME[k] = gr.name; }
    S.styles = h.styles;
    mat.fill(AIR); wat.fill(0); bg.fill(B_NONE); fix.fill(0); gem.fill(0); root.fill(0);
    const lerp = (a, i, step) => { const k = i / step, j = Math.min(a.length - 1, Math.floor(k)), f = k - j, b = a[Math.min(a.length - 1, j + 1)]; return a[j] * (1 - f) + b * f; };
    for (let c = 0; c < WW; c++) {
      const s = Math.round(lerp(p.surface, c, 8)); surf0[c] = s;
      let r = s;
      for (let L = 0; L < p.layers.length; L++) {
        const lay = p.layers[L], last = L === p.layers.length - 1, t = last ? WH : Math.round(lerp(lay.thick, c, 16));
        for (let k = 0; k < t && r < WH - 4; k++, r++) mat[at(c, r)] = lay.kind;
      }
      for (let r2 = WH - 4; r2 < WH; r2++) mat[at(c, r2)] = GRANITE;
    }
    const byKind = k => p.places.filter(q => q.kind === k);
    const blob = (q, kind, fn) => { const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
      for (let c = q.x; c < q.x + q.w; c++) for (let r = q.y; r < q.y + q.h; r++) { if (!inside(c, r) || r < surf0[c] + 3 || r >= WH - 4) continue;
        const u = (c + 0.5 - cx) / (q.w / 2), v = (r + 0.5 - cy) / (q.h / 2); if (u * u + v * v <= 1 + 0.25 * Math.sin(c * 1.7 + r)) fn ? fn(c, r) : (mat[at(c, r)] = kind); } };
    // under the ground: old river gravel, limestone shelves (their caves), granite, and bowls of clay holding water
    for (const q of byKind(41)) blob(q, SAND);
    for (const q of byKind(42)) { blob(q, LIME);
      for (let k = 0; k < 2 + (q.v % 2); k++) { const w = 4 + Math.floor(rand() * Math.max(2, q.w / 3)), hh = 2 + Math.floor(rand() * 2), x = q.x + 2 + Math.floor(rand() * Math.max(1, q.w - w - 4)), y = q.y + 2 + Math.floor(rand() * Math.max(1, q.h - hh - 3));
        blob({ x, y, w, h: hh + 1 }, 0, (c, r) => { const i = at(c, r); if (mat[i] === LIME) { mat[i] = AIR; bg[i] = B_CAVE; } }); } }
    for (const q of byKind(43)) blob(q, GRANITE);
    for (const q of byKind(40)) { const cx = q.x + q.w / 2;
      for (let c = q.x; c < q.x + q.w; c++) { if (c < 0 || c >= WW) continue; const u = (c + 0.5 - cx) / (q.w / 2), d = Math.round(q.h * Math.sqrt(Math.max(0, 1 - u * u)));
        const bottom = q.y + Math.max(1, d);
        for (let r = q.y; r < bottom && r < WH - 4; r++) { const i = at(c, r); if (r > surf0[c] + 2) { mat[i] = SAND; wat[i] = 1; } }
        for (let r = bottom; r < bottom + 2 && r < WH - 4; r++) if (r > surf0[c] + 2) mat[at(c, r)] = CLAY;
        if (Math.abs(u) > 0.85) for (let r = q.y - 1; r < bottom; r++) if (r > surf0[c] + 2) { mat[at(c, r)] = CLAY; wat[at(c, r)] = 0; } } }
    // the rivers: the banks sloping down to each, its channel, a bed of sand and gravel under it
    S.rivers = [];
    for (const q of p.places.filter(q => q.kind >= 10 && q.kind <= 12)) {
      const R = { kind: q.kind, x: q.x, w: q.w, natural: q.y, level: q.y, depth: q.h, bed: [], bank: 0, dam: null, name: ["a creek", "the stream", "the river"][q.kind - 10] };
      for (let c = q.x - 4; c < q.x + q.w + 4; c++) { if (c < 0 || c >= WW || (c >= q.x && c < q.x + q.w)) continue;
        const d = c < q.x ? q.x - c : c - (q.x + q.w - 1), t = q.y - 5 + Math.min(1, Math.floor((4 - d) / 2));
        for (let r = surf0[c]; r < t; r++) mat[at(c, r)] = AIR;
        if (surf0[c] < t) surf0[c] = t; }
      for (let c = q.x; c < q.x + q.w; c++) { const u = (c - q.x + 0.5) / q.w * 2 - 1, d = Math.max(1, Math.round(q.h * Math.sqrt(Math.max(0.05, 1 - u * u))));
        const bed = q.y + d; R.bed.push(bed);
        for (let r = 0; r < bed; r++) { const i = at(c, r); mat[i] = AIR; bg[i] = B_NONE; }
        for (let r = bed; r < bed + 2; r++) mat[at(c, r)] = SAND;
        surf0[c] = bed; }
      R.bank = Math.max(surf0[q.x - 1] ?? q.y - 4, surf0[q.x + q.w] ?? q.y - 4);
      S.rivers.push(R);
    }
    // the beavers' lodges, dams and the beavers
    S.lodges = byKind(13).map(q => ({ x: q.x, w: q.w, river: riverAt(q.x + q.w / 2) || riverAt(q.x + q.w + 3) || riverAt(q.x - 3) }));
    S.dams = byKind(14).map(q => { const R = riverAt(q.x + q.w / 2); const d = { x: q.x, w: q.w, logs: q.v, river: R, at: q.x + Math.floor(q.w / 2) }; if (R) R.dam = d; return d; });
    for (const d of S.dams) if (d.river) setLevel(h, d.river);
    S.beavers = byKind(15).map(q => ({ b: { x: q.x * 100, face: 1, job: 0, t: 40 + q.v * 35, tree: -1, lodge: q.x, dam: q.w, felled: -1, laid: false }, px: q.x, py: 0, swing: q.v }));
    // the villages, deep under the ground
    S.rooms = []; S.ducts = []; S.lamps = []; S.items = []; S.villages = [];
    for (const q of [...byKind(20), ...byKind(21)]) village(h, q, q.kind === 21 ? 1 : 0, p.seed);
    // the great trees, their limbs, platforms, ladders or stair, houses, and rope bridges to the trees beside the stair tree
    S.greats = []; S.houses = []; S.bridges = [];
    S.trees = byKind(50).map(q => ({ x: q.x, kind: q.v, h: q.h, alive: true, grow: 1, fallAt: 0, regrow: 0, seed: q.x * 13 + q.h }));
    for (const q of [...byKind(30), ...byKind(31)]) greatTree(h, q);
    S.bushes = byKind(51).map(q => ({ x: q.x, v: q.v }));
    // (Matthew: "gnome should be able to climb the tree like an animal"; "even the parts without a ladder"; "if he has the
    // tree-climb pack"; "place that into one of the tree houses by default") the tree-climbing pack, in the lowest house of
    // the first great tree
    { const first = S.houses.filter(hs => !hs.small).sort((a, b) => b.row - a.row)[0]; if (first) S.items.push({ kind: "climb", x: first.x + 0.5 - first.side * 1.1, y: first.row - 0.55, taken: false }); }
    S.shrooms = byKind(53).map(q => ({ x: q.x, v: q.v }));
    S.rootSets = []; S.threadSets = [];
    S.rootPlan = [...S.greats.map(G => ({ x: G.x, row: G.foot, k: 150, seed: G.v })), ...S.trees.map(t => ({ x: t.x, row: surf0[t.x], k: 70 + t.h * 4 + (t.tall ? 30 : 0), seed: t.seed })),
      ...S.shrooms.map(m => ({ x: m.x, row: surf0[m.x], seed: m.x * 3 + m.v, kind: "shroom" }))];
    // roots: under each tree, spreading and thinning down; water goes down them faster
    if (!(S.built && S.built.compiled)) for (const t of [...S.trees, ...S.greats.map(g => ({ x: g.x, h: g.h * 0.7 }))]) { const deep = Math.min(14, Math.round(t.h * 0.9)), s = surf0[t.x];
      for (let r = s; r < s + deep && r < WH - 4; r++) { const spread = 1 + Math.floor((r - s) / 3);
        for (let c = t.x - spread; c <= t.x + spread; c++) if (inside(c, r) && PORES[mat[at(c, r)]] > 0) root[at(c, r)] = Math.min(3, root[at(c, r)] + (Math.abs(c - t.x) <= 1 ? 2 : 1)); } }
    // gems in veins, and boulders, each in the ground (never in a room's walls)
    const diggable = i => mat[i] >= SOIL && mat[i] <= SHALE;
    for (const q of byKind(44)) for (let k = 0; k < q.v; k++) { const c = q.x + Math.floor(rand() * (q.w + 2)) - 1, r = q.y + Math.floor(rand() * (q.h + 2)) - 1;
      if (inside(c, r) && r > surf0[c] + 1 && diggable(at(c, r))) gem[at(c, r)] = 1 + Math.floor(rand() * 5); }
    S.boulders = [];
    for (const q of byKind(45)) { const c = q.x, r = q.y, i = inside(c, r) ? at(c, r) : -1;
      if (i >= 0 && r > surf0[c] + 1 && diggable(i) && inside(c, r + 1) && diggable(at(c, r + 1))) { mat[i] = AIR; bg[i] = B_DUG; gem[i] = 0; S.boulders.push({ c, r, oy: 0, wob: -1, falling: false }); } }
    // the water: below the table, the ground full; above it, damp; near a river, the table up to the river; caves under it full
    for (let c = 0; c < WW; c++) {
      let t = lerp(p.table, c, 16);
      for (const R of S.rivers) { const d = c < R.x ? R.x - c : c >= R.x + R.w ? c - (R.x + R.w - 1) : 0; if (d < 40) t = Math.min(t, R.level + d / 3); }
      for (let r = 0; r < WH; r++) { const i = at(c, r), m = mat[i];
        if (m === AIR) { if (r >= t && r > surf0[c]) wat[i] = 1; continue; }
        if (PORES[m] > 0 && wat[i] === 0) wat[i] = r >= t ? 1 : r < surf0[c] + 1 ? 0.3 : m === SAND ? 0.15 : 0.3; }
    }
    for (const R of S.rivers) holdRiver(R);
    for (let c = 0; c < WW; c++) top[c] = topOf(c);
    S.dry = []; for (let i = 0; i < NN; i++) if (mat[i] === AIR && (bg[i] === B_PLASTER || bg[i] === B_WOOD || bg[i] === B_STAIR)) S.dry.push(i);
    // where things are, for the words at the top of the picture
    S.places = [
      ...S.rivers.map(R => ({ x0: R.x - 3, x1: R.x + R.w + 3, name: R.dam ? `${R.name} and the beavers' dam` : R.name })),
      ...S.greats.map(g => ({ x0: g.x - 9, x1: g.x + 9, name: g.kind === 31 ? "the stair tree" : "a great tree, its ladders" })),
      ...S.villages.map(v => ({ x0: v.x0 - 2, x1: v.x1 + 2, name: v.which ? "the hamlet" : "the gnomes' village", under: true })),
    ];
    const g0 = { x: 12500, y: top[12] * 1000 };
    S.start = g0;
    S.g = { x: g0.x, y: g0.y, vx: 0, vy: 0, face: 1, ground: true, climb: false, swim: false, under: false, air: 600, gear: false, dc: -1, dr: -1, dt: 0, ev: 0 };
    S.works = new Map(); S.hearts = 5; S.cam.set = false; S.smoke = []; S.parts = []; S.minimapAt = -1e9; S.rain = 0; S.rainAt = S.frame + 60 * 60; S.banner = { text: "🌍 Gnome world", t: performance.now() };
  }
  const riverAt = x => S.rivers.find(R => x >= R.x - 0.5 && x < R.x + R.w + 0.5) || null;
  const topOf = c => { for (let r = 0; r < WH; r++) if (mat[at(c, r)] !== AIR) return r; return WH; };
  // (a dam's river at the height its logs hold it: World.water_row)
  function setLevel(h, R) { R.level = R.dam ? h.water_row(R.natural, R.bank, R.dam.logs) : R.natural; }
  function holdRiver(R) {
    for (let k = 0; k < R.w; k++) { const c = R.x + k; for (let r = Math.min(R.level, R.natural) - 4; r < R.bed[k]; r++) { if (r < 0) continue; const i = at(c, r);
      if (mat[i] === AIR && bg[i] === B_NONE) wat[i] = r >= R.level ? 1 : 0; } }
  }
  // a village: its rooms (World.village), walls of masonry round each, a timber floor, doorways between, the stair down from a
  // door on the hill, the things in each room (World.furnish), a lamp in each, and its chimneys and shafts up to the meadow
  function village(h, q, which, seed) {
    const rooms = h.village(q.x, q.y, which, seed), x0 = q.x;
    const set = (c, r, m, b) => { if (!inside(c, r)) return; const i = at(c, r); mat[i] = m; if (b != null) bg[i] = b; wat[i] = 0; gem[i] = 0; root[i] = 0; };
    let bottom = 0;
    for (const R of rooms) { bottom = Math.max(bottom, R.y + 4);
      for (let c = R.x - 1; c <= R.x + R.w; c++) for (let r = R.y - 1; r <= R.y + 4; r++) { const i = at(c, r); if (bg[i] !== B_PLASTER && bg[i] !== B_WOOD) set(c, r, r === R.y + 4 ? TIMBER : MASON); }
      for (let c = R.x; c < R.x + R.w; c++) for (let r = R.y; r < R.y + 4; r++) set(c, r, AIR, [5, 10, 2, 12].includes(R.kind) ? B_WOOD : B_PLASTER);
      R.things = h.furnish(R.kind, R.w);
      S.lamps.push({ x: R.x + R.w / 2, y: R.y + 0.7, r: 5.5 });
      S.rooms.push(R); }
    // doorways: between rooms side by side on a floor, and from the stair into each floor's first room
    for (const R of rooms) { for (const o of rooms) if (o !== R && o.y === R.y && o.x === R.x + R.w + 1) for (let r = R.y + 1; r < R.y + 4; r++) { set(R.x + R.w, r, AIR, B_PLASTER); fix[at(R.x + R.w, r)] = F_DOOR; }
      if (R.x === x0 + 3) for (let r = R.y + 1; r < R.y + 4; r++) { set(x0 + 2, r, AIR, B_PLASTER); fix[at(x0 + 2, r)] = F_DOOR; } }
    // the stair: two columns, a ladder, walls of masonry, from the hatch in the hill down to the lowest floor
    const s0 = Math.min(surf0[x0], surf0[x0 + 1]);
    for (let r = s0 - 1; r < bottom; r++) { for (const c of [x0 - 1, x0 + 2]) { const i = at(c, r); if (r >= s0 && fix[i] !== F_DOOR) set(c, r, MASON); }
      for (const c of [x0, x0 + 1]) { set(c, r, AIR, r >= s0 ? B_STAIR : B_NONE); fix[at(c, r)] = r === s0 ? F_HATCH : F_LADDER; } }
    for (const c of [x0 - 1, x0, x0 + 1, x0 + 2]) set(c, bottom, MASON);
    for (let c = x0 - 1; c <= x0 + 2; c++) surf0[c] = Math.max(surf0[c], s0);
    // chimneys (over the hearth or the stove), light shafts and air shafts, each a duct of masonry up through the ground
    for (const R of rooms) { if (!R.up) continue;
      const hearth = R.things.find(t => t.kind === 4 || t.kind === 5), cx = R.up === 3 && hearth ? R.x + Math.floor((hearth.at + hearth.w / 2) / 10) : R.x + Math.floor(R.w / 2) + (R.up === 2 ? 1 : 0);
      const top0 = surf0[cx];
      for (let r = top0; r < R.y; r++) { const i = at(cx, r); if (mat[i] !== AIR && bg[i] !== B_PLASTER && bg[i] !== B_WOOD) set(cx, r, MASON); }
      S.ducts.push({ kind: R.up, x: cx, y0: top0, y1: R.y, room: R });
      if (R.up === 1) S.lamps.push({ x: cx + 0.5, y: R.y + 1.5, r: 4.5, sun: true }); }
    // the diving gear, hung in the village's bath house (or its hall)
    if (which === 0) { const bath = rooms.find(R => R.kind === 7) || rooms[0]; S.items.push({ kind: "gear", x: bath.x + bath.w - 1.2, y: bath.y + 2.2, taken: false }); }
    S.villages.push({ which, x0, x1: Math.max(...rooms.map(R => R.x + R.w)), top: s0, bottom });
  }
  // a great tree: its limbs (World.limbs), a platform out along each, a ladder up its trunk (30) or a stair inside it (31), the
  // houses at the limbs' ends; on the stair tree, rope bridges out to a tall tree beside it, a platform and a house on that
  function greatTree(h, q) {
    const foot = surf0[q.x], limbs = h.limbs(q.kind, q.h, q.v), half = q.kind === 31 ? 2 : 1;
    const G = { kind: q.kind, x: q.x, foot, h: q.h, limbs, half, v: q.v };
    const highest = Math.max(...limbs.map(l => l.y));
    for (let r = foot - highest - 1; r < foot; r++) for (let c = q.x - (q.kind === 31 ? 1 : 0); c <= q.x + (q.kind === 31 ? 1 : 0); c++) if (inside(c, r) && mat[at(c, r)] === AIR) fix[at(c, r)] = q.kind === 31 ? F_STAIR : F_LADDER;
    for (const L of limbs) { const row = foot - L.y;
      for (let k = half; k <= half + L.len; k++) { const c = q.x + L.side * k; if (inside(c, row) && mat[at(c, row)] === AIR && !fix[at(c, row)]) fix[at(c, row)] = F_PLAT; }
      const end = q.x + L.side * (half + L.len - 1.6);
      if (L.house >= 0 && L.house < 100) S.houses.push({ style: L.house, x: end, row, side: L.side });
      else if (L.house >= 100) S.houses.push({ style: L.house, x: q.x + L.side * (half + L.len - 0.6), row, side: L.side, small: true });
      if (L.bridge) { const cx = q.x + L.side * (half + L.len + 8);
        if (cx > 3 && cx < WW - 4 && !riverAt(cx) && !riverAt(cx - 2) && !riverAt(cx + 2)) {
          for (let k = half + L.len + 1; k < half + L.len + 7; k++) { const c = q.x + L.side * k; if (inside(c, row) && mat[at(c, row)] === AIR) fix[at(c, row)] = F_BRIDGE; }
          for (let c = cx - 2; c <= cx + 2; c++) if (inside(c, row) && mat[at(c, row)] === AIR) fix[at(c, row)] = F_PLAT;
          const a = q.x + L.side * (half + L.len), b = q.x + L.side * (half + L.len + 6);
          S.bridges.push({ x0: Math.min(a, b) + (L.side > 0 ? 1 : 0), x1: Math.max(a, b) + (L.side > 0 ? 1 : 0), row });
          S.trees.push({ x: cx, kind: 0, h: L.y + 6, alive: true, grow: 1, fallAt: 0, regrow: 0, seed: cx * 7, tall: true, keep: true });
          S.houses.push({ style: (q.v + L.y) % 16, x: cx, row, side: L.side }); } } }
    for (const hs of S.houses) if (!hs.small && !hs.things) hs.things = h.furnish(HOUSE_ROOM[hs.style % 16], 4);
    S.greats.push(G);
  }

  // ---- the water, a step: down first (from the bottom up, so a step moves it at most a tile), as fast as the slower of the two
  // grounds lets it, four times as fast where roots are, and never the share that clings; then across, where the tile below is
  // full or holds water back: toward the drier side, the ground giving water to a tunnel only when nearly full itself. The
  // rivers held at their level; now and then a shower over the land; a little drying at the surface
  let sweep = 1;
  function waterStep() {
    for (let r = WH - 2; r >= 0; r--) { const base = r * WW;
      for (let c = 0; c < WW; c++) { const a = base + c, wa = wat[a]; if (wa <= 0.0005) continue;
        const ma = mat[a], pa = PORES[ma]; if (pa === 0) continue;
        const b = a + WW, mb = mat[b], pb = PORES[mb]; if (pb === 0) continue;
        const free = (wa - CLING[ma]) * pa; if (free <= 0) continue;
        const room = (1 - wat[b]) * pb; if (room <= 0.0001) continue;
        const k = Math.min(1, Math.min(FLOW[ma], FLOW[mb]) * (root[a] ? 1 + root[a] * 1.5 : 1));
        const qv = Math.min(free * k, room);
        wat[a] -= qv / pa; wat[b] += qv / pb; } }
    sweep = -sweep;
    for (let r = 0; r < WH - 1; r++) { const base = r * WW;
      for (let n = 0; n < WW; n++) { const c = sweep > 0 ? n : WW - 1 - n, a = base + c, wa = wat[a]; if (wa <= 0.002) continue;
        const ma = mat[a], pa = PORES[ma]; if (pa === 0) continue;
        const b = a + WW; if (PORES[mat[b]] > 0 && wat[b] < 0.98) continue;
        for (const d of [sweep, -sweep]) { const c2 = c + d; if (c2 < 0 || c2 >= WW) continue;
          const n2 = base + c2, mn = mat[n2], pn = PORES[mn]; if (pn === 0) continue;
          const sn = wat[n2]; if (sn >= wat[a] - 0.01) continue;
          if (mn === AIR && ma !== AIR && wat[a] < 0.9) continue;
          const k = Math.min(1, Math.min(FLOW[ma], FLOW[mn]) * 0.5 * (root[a] ? 2 : 1));
          const qv = (wat[a] - sn) * Math.min(pa, pn) * 0.5 * k;
          wat[a] -= qv / pa; wat[n2] += qv / pn; } } }
    for (const R of S.rivers) holdRiver(R);
    // (Matthew: "The gnome's basement levels are flooded!") the villages' pumps: every room's and the stair's water drawn down a
    // little each step, as the gnomes' hand pumps at the stair's foot lift it up and out to the meadow
    for (const i of S.dry) if (wat[i] > 0) wat[i] = Math.max(0, wat[i] - 0.004);
    // a shower now and then (fourteen seconds, every two minutes or so), and drying at the surface
    const now = S.frame;
    if (!S.rain && now > S.rainAt) { S.rain = 14 * 60; S.rainAt = now + (100 + Math.floor(rand() * 80)) * 60; }
    if (S.rain) { S.rain--; for (let n = 0; n < 24; n++) { const c = Math.floor(rand() * WW), r = top[c]; if (r >= WH || r > surf0[c] + 2) continue; const i = at(c, r);
      if (PORES[mat[i]] > 0) wat[i] = Math.min(1, wat[i] + 0.06); else if (r > 0 && mat[at(c, r - 1)] === AIR) wat[at(c, r - 1)] = Math.min(1, wat[at(c, r - 1)] + 0.03); } }
    if (now % 30 === 0) for (let c = 0; c < WW; c++) { const r = top[c]; if (r >= WH) continue; const i = at(c, r); if (PORES[mat[i]] > 0 && wat[i] > 0.25) wat[i] -= 0.004;
      if (r > 0) { const j = at(c, r - 1); if (wat[j] > 0 && wat[j] < 0.2 && !riverAt(c)) wat[j] = Math.max(0, wat[j] - 0.01); } }
  }

  // ---- the gnome's step, in Hazel (World.step): the tiles round it, packed three to a number, each what is there, water, and
  // whether it can be climbed
  // (a tile within a standing tree, its trunk or its crown, or a great tree's: where the pack lets the gnome climb)
  function treeAt(c, r) {
    for (const t of S.trees) { if (!t.alive || t.grow < 0.6 || Math.abs(c - t.x) > 6) continue; const foot = surf0[t.x], h = t.h * (t.tall ? 1.45 : 1);
      if (c === t.x && r < foot && r >= foot - h * 0.7) return true;
      const half = (t.kind === 1 ? 0.3 : t.kind === 4 ? 0.65 : 0.5) * h, cy = foot - h * 0.78, dy = (r + 0.5 - cy) / (h * 0.32), dx = (c + 0.5 - (t.x + 0.5)) / half;
      if (r < foot && dx * dx + dy * dy < 1) return true; }
    for (const G of S.greats) { if (Math.abs(c - G.x) > 14) continue; if (Math.abs(c - G.x) <= G.half && r < G.foot && r >= G.foot - G.h) return true;
      const dy = (r + 0.5 - (G.foot - G.h * 0.95)) / (G.h * 0.3), dx = (c - G.x) / (G.h * 0.5); if (dx * dx + dy * dy < 1) return true; }
    return false;
  }
  const boulderAt = (c, r) => S.boulders.some(b => b.c === c && (b.r === r || (b.falling && b.oy > 0 && b.r + 1 === r)));
  function code(c, r) {
    if (!inside(c, r)) return 7;
    const i = at(c, r), m = mat[i]; let k = m;
    if (m === AIR) { if (S.g && S.g.climbPack && treeAt(c, r)) k += 32; if (boulderAt(c, r)) k = 10; else if (fix[i] === F_PLAT || fix[i] === F_BRIDGE || fix[i] === F_HATCH) k = 11;
      if (wat[i] >= 0.5) k += 16;
      if ((fix[i] === F_LADDER || fix[i] === F_STAIR || bg[i] === B_DUG) && k < 32) k += 32; }
    return k;
  }
  function near(g) {
    const cx = Math.floor(g.x / 1000), cy = Math.floor((g.y - 1) / 1000), row = r => code(cx - 1, r) + 128 * code(cx, r) + 16384 * code(cx + 1, r);
    return { cx, cy, r0: row(cy - 3), r1: row(cy - 2), r2: row(cy - 1), r3: row(cy), r4: row(cy + 1) };
  }
  function digOut(c, r) {
    const i = at(c, r), m = mat[i];
    if (m === AIR) return;
    // (Matthew: "when i dig sideways I should build reinforcements. and upwards in the ground should indicate stairs and
    // reinforcements too") Gnome dig's works: a tile dug along, a timber set in it and in the one the gnome stands in; a tile
    // dug up or down, a ladder in both, its rails against cribbing
    { const g = S.g, gc = Math.floor(g.x / 1000), gr = Math.floor((g.y - 1) / 1000), here = inside(gc, gr) ? at(gc, gr) : -1, up = c === gc && r !== gr;
      if (up) { S.works.set(i, "ladder"); if (here >= 0 && bg[here] === B_DUG) S.works.set(here, "ladder"); }
      else { if (!S.works.has(i)) S.works.set(i, "frame"); if (here >= 0 && bg[here] === B_DUG && !S.works.has(here)) S.works.set(here, "frame"); } }
    const water = wat[i] * PORES[m];
    mat[i] = AIR; bg[i] = B_DUG; wat[i] = water;
    if (gem[i]) { S.gems++; keep("gems", S.gems); popWord("💎", c + 0.5, r + 0.3); if (SND) SND.gem(); gem[i] = 0; }
    else if (SND && S.frame - (S.digSndAt || 0) > 8) { SND.dig(); S.digSndAt = S.frame; }
    for (let k = 0; k < 7; k++) S.parts.push({ x: c + 0.5, y: r + 0.5, vx: (rand() - 0.5) * 0.12, vy: -rand() * 0.12, life: 30 + rand() * 20, col: COLOR[m] });
    if (r <= top[c]) top[c] = topOf(c);
    S.minimapAt = -1e9;
  }
  // (Matthew: "I should be able to build a bridge out of any pit") 🪵, B: standing at the edge of a pit or of the water, a plank
  // laid ahead at the gnome's own level, a bridge across, a plank a press; else, in a pit (or in its water), a ladder up the
  // gnome's own column, two rungs a press, to climb out by
  function buildHere() {
    const g = S.g; if (!g || S.faintAt) return;
    const c = Math.floor(g.x / 1000), stand = Math.floor(g.y / 1000), feet = Math.floor((g.y - 1) / 1000), ahead = c + g.face;
    const open = (cc, rr) => inside(cc, rr) && mat[at(cc, rr)] === AIR && !fix[at(cc, rr)] && !boulderAt(cc, rr);
    if (g.ground && open(ahead, stand)) { fix[at(ahead, stand)] = F_PLAT; S.works.set(at(ahead, stand), "plank"); popWord("🪵", ahead + 0.5, stand - 0.4); if (SND) SND.land(); return; }
    let n = 0;
    for (let r = feet; r > feet - 6 && n < 2; r--) { if (!inside(c, r) || mat[at(c, r)] !== AIR) break; if (!fix[at(c, r)]) { fix[at(c, r)] = F_LADDER; n++; } }
    if (n) { popWord("🪜", c + 0.5, feet - 1); if (SND) SND.land(); }
  }
  const words = [];
  const popWord = (t, x, y) => words.push({ t, x, y, at: performance.now() });
  function hurt(why) {
    if (performance.now() - S.hurtAt < 1500) return;
    S.hurtAt = performance.now(); S.hearts--; if (SND) SND.caught();
    popWord(why, S.g.x / 1000, S.g.y / 1000 - 1.6);
    if (S.hearts <= 0) { S.faintAt = performance.now(); S.banner = { text: "💫 The gnome fainted, and wakes up back home", t: performance.now() }; }
  }
  function gnomeStep(h) {
    const k = S.keys, pad = { dx: (k.right ? 1 : 0) - (k.left ? 1 : 0), up: k.up, down: k.down, jump: S.jumpQueued };
    S.jumpQueued = false;
    const t0 = performance.now();
    const g = h.step(S.g, near(S.g), pad); if (S.g.climbPack) g.climbPack = true;
    S.stepMs.push(performance.now() - t0); if (S.stepMs.length > 120) S.stepMs.shift();
    S.g = g;
    if (g.ev === 1 && g.dc >= 0) digOut(g.dc, g.dr);
    else if (g.ev === 3 && SND) SND.splash();
    else if (g.ev === 4) hurt("😵 out of breath");
    else if (g.ev === 5 && SND) SND.low();
    // the diving gear, walked into
    for (const it of S.items) if (!it.taken && Math.abs(it.x - g.x / 1000) < 0.8 && Math.abs(it.y - (g.y / 1000 - 0.5)) < 1) { it.taken = true; if (SND) SND.gem();
      if (it.kind === "climb") { S.g = { ...S.g, climbPack: true }; S.banner = { text: "🧗 The tree-climbing pack: climb any tree, like a squirrel (↑)", t: performance.now() }; }
      else { S.g = { ...S.g, gear: true }; S.banner = { text: "🤿 The diving gear: breathe under the water as long as you like", t: performance.now() }; } }
  }
  // ---- the boulders: one with open air under it wobbles, then falls (slower in the water), landing where it can fall no further;
  // falling on the gnome, a heart
  function bouldersStep() {
    for (const b of S.boulders) {
      const open = (c, r) => inside(c, r) && mat[at(c, r)] === AIR && !fix[at(c, r)] && !S.boulders.some(o => o !== b && o.c === c && o.r === r);
      if (!b.falling) { if (!open(b.c, b.r + 1)) { b.wob = -1; continue; }
        if (b.wob < 0) { b.wob = 45; if (SND) SND.wobble(); } else if (--b.wob <= 0) { b.falling = true; b.oy = 0; } continue; }
      const wet = wat[at(b.c, b.r)] > 0.5;
      b.oy += wet ? 0.04 : 0.11;
      while (b.oy >= 1) { b.r++; b.oy -= 1; if (!open(b.c, b.r + 1)) { b.oy = 0; b.falling = false; b.wob = -1; if (SND) SND.land(); break; } }
      const gx = S.g.x / 1000, gy = S.g.y / 1000;
      if (b.falling && Math.abs(gx - (b.c + 0.5)) < 0.8 && gy > b.r + b.oy + 0.2 && gy - 0.9 < b.r + b.oy + 1) hurt("💥 a boulder");
    }
  }
  // ---- the beavers (World.beaver, ten times a second): the trees standing near each's lodge, given; a tree it fells falls, and
  // grows again from a sapling; a log laid raises its dam a little, and with it its river (World.water_row); a log washes away
  // from each dam every minute
  function beaversStep(h) {
    for (const B of S.beavers) {
      const near = S.trees.filter(t => t.alive && t.grow >= 1 && !t.keep && Math.abs(t.x - B.b.lodge) <= 36).map(t => t.x);
      const b2 = h.beaver(B.b, near);
      if (b2.felled >= 0) { const t = S.trees.find(t => t.x === b2.felled && t.alive); if (t) { t.alive = false; t.fallAt = S.frame; t.fallDir = b2.face; t.regrow = 90 * 60; } }
      if (b2.laid) { const d = S.dams.find(d => Math.abs(d.at - b2.dam) <= 2); if (d && d.river) { d.logs = Math.min(d.logs + 1, 40); setLevel(h, d.river); } }
      B.b = b2;
    }
    if (S.frame - S.damAt > 60 * 60) { S.damAt = S.frame; for (const d of S.dams) if (d.logs > 0 && d.river) { d.logs--; setLevel(h, d.river); } }
    for (const t of S.trees) if (!t.alive && --t.regrow <= 0) { t.alive = true; t.grow = 0.15; }
  }

  // ---- one frame: the gnome, the boulders, the water, the beavers, the smoke; the camera after the gnome
  function tick(h) {
    S.frame++;
    if (S.faintAt) { if (performance.now() - S.faintAt > 1800) { S.faintAt = 0; S.hearts = 5; S.g = { ...S.g, x: S.start.x, y: top[Math.floor(S.start.x / 1000)] * 1000, vx: 0, vy: 0, air: 600 }; S.cam.set = false; } }
    else gnomeStep(h);
    bouldersStep();
    waterStep();
    if (S.frame % 6 === 0) beaversStep(h);
    for (const t of S.trees) if (t.alive && t.grow < 1) t.grow = Math.min(1, t.grow + 1 / (60 * 60));
    for (const B of S.beavers) B.px += (B.b.x / 100 - B.px) * 0.18;
    if (S.frame % 9 === 0) for (const d of S.ducts) if (d.kind === 3) S.smoke.push({ x: d.x + 0.5 + (rand() - 0.5) * 0.2, y: d.y0 - 2.2, r: 0.18, life: 0, drift: 0.004 + rand() * 0.006 });
    for (const s of S.smoke) { s.y -= 0.012; s.x += s.drift; s.r += 0.006; s.life++; }
    S.smoke = S.smoke.filter(s => s.life < 200);
    for (const p of S.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.01; p.life--; }
    S.parts = S.parts.filter(p => p.life > 0);
  }

  // ---- drawing: the sky and far hills, the trees, the ground (its tiles; the water in it as blue, darker the fuller), the
  // rooms and their things, the great trees and their houses, the beavers, the boulders, the gnome, the water over all that is
  // in it, the dark underground (lit by the lantern, the lamps and the light shafts), and the words and the map
  const cv = $("world"), ctx = cv.getContext("2d");
  let T = 32, VW = 30, VH = 17;
  function fit() {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.round(r.width * d)), hgt = Math.max(180, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; texCache.clear(); }
    T = Math.max(12, Math.round(hgt > w ? w / 15 : Math.min(w / 28, hgt / 15.75)));
    VW = cv.width / T; VH = cv.height / T;
  }
  // (each kind of ground a few tiles' worth of texture, made once for the tile's size: specks, layers, cracks, bricks, planks)
  const texCache = new Map();
  function tex(kind, v) {
    const key = kind * 8 + v; let t = texCache.get(key); if (t) return t;
    t = document.createElement("canvas"); t.width = t.height = T; const c = t.getContext("2d");
    let r = 1 + kind * 7 + v * 131; const R = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const base = kind === 100 ? "#4a2f1d" : kind === 101 ? "#e8dcc4" : kind === 102 ? "#8a5a33" : kind === 103 ? "#6b6258" : kind === 104 ? "#3c3a3a" : COLOR[kind];
    c.fillStyle = base; c.fillRect(0, 0, T, T);
    const speck = (n, col, s) => { c.fillStyle = col; for (let k = 0; k < n; k++) c.fillRect(Math.floor(R() * T), Math.floor(R() * T), s, s); };
    const u = Math.max(1, Math.round(T / 16));
    if (kind === SOIL) { speck(14, "rgba(0,0,0,0.18)", 2 * u); speck(8, "rgba(255,230,190,0.15)", u); }
    else if (kind === CLAY) { c.fillStyle = "rgba(255,255,255,0.08)"; c.fillRect(0, T * 0.3, T, u); c.fillRect(0, T * 0.72, T, u); speck(6, "rgba(0,0,0,0.12)", u); }
    else if (kind === SAND) { for (let k = 0; k < 16; k++) { c.fillStyle = ["#a88b5a", "#d9c08a", "#8d7a63", "#c7ad7a"][k % 4]; c.beginPath(); c.arc(R() * T, R() * T, (0.5 + R() * 1.6) * u, 0, 7); c.fill(); } }
    else if (kind === SSTONE) { c.fillStyle = "rgba(120,60,30,0.25)"; for (let y = (v * 3) % 5; y < T; y += Math.round(T / 4)) c.fillRect(0, y, T, u); speck(10, "rgba(255,230,200,0.18)", u); }
    else if (kind === SHALE) { c.fillStyle = "rgba(0,0,0,0.25)"; for (let y = v; y < T; y += Math.round(T / 6)) c.fillRect(0, y, T, u); speck(6, "rgba(255,255,255,0.08)", u); }
    else if (kind === LIME) { speck(10, "rgba(0,0,0,0.1)", u); c.strokeStyle = "rgba(90,80,60,0.35)"; c.lineWidth = u; c.beginPath(); c.arc(T * (0.3 + 0.4 * R()), T * (0.3 + 0.4 * R()), T * 0.12, 0.3, 5.5); c.stroke(); }
    else if (kind === GRANITE) { for (let k = 0; k < 18; k++) { c.fillStyle = ["#5c5658", "#c9c2bd", "#b07a7a", "#3e3a3c"][k % 4]; c.fillRect(R() * T, R() * T, 2 * u, 2 * u); } }
    else if (kind === MASON) { c.fillStyle = "rgba(60,50,40,0.55)"; const hh = T / 2; c.fillRect(0, hh - u / 2, T, u); c.fillRect(0, 0, T, u / 2);
      c.fillRect((v % 2 ? T * 0.5 : T * 0.2), 0, u, hh); c.fillRect((v % 2 ? T * 0.15 : T * 0.7), hh, u, hh); speck(5, "rgba(255,255,255,0.1)", u); }
    else if (kind === TIMBER) { c.fillStyle = "rgba(60,30,10,0.45)"; c.fillRect(0, T / 2, T, u); c.fillRect((v * 0.3 % 1) * T, 0, u, T / 2); c.fillStyle = "rgba(255,220,170,0.15)"; c.fillRect(0, 0, T, u); }
    else if (kind === 100) { speck(12, "rgba(0,0,0,0.25)", 2 * u); speck(6, "rgba(255,220,180,0.08)", u); }   // (dug: the earth behind a tunnel)
    else if (kind === 101) { speck(8, "rgba(120,100,70,0.12)", u); }   // (plaster)
    else if (kind === 102) { c.fillStyle = "rgba(50,25,10,0.4)"; for (let x = 0; x < T; x += Math.round(T / 3)) c.fillRect(x, 0, u, T); }   // (wood paneling)
    else if (kind === 103) { c.fillStyle = "rgba(30,25,20,0.45)"; c.fillRect(0, T / 2, T, u); c.fillRect(T / 2, 0, u, T / 2); c.fillRect(T / 5, T / 2, u, T / 2); }   // (the stair's stones)
    else if (kind === 104) { speck(14, "rgba(255,255,255,0.06)", 2 * u); }   // (a cave)
    texCache.set(key, t); return t;
  }
  const GEMS = ["", "#ef4444", "#22c55e", "#3b82f6", "#a855f7", "#f59e0b"];
  // (Gnome dig's earth, darker deeper: its four bands, and deeper still; each other kind of ground its own hue toward them, and
  // darker with the depth too)
  const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mixRGB = (a, b, f) => a.map((v, i) => Math.round(v + (b[i] - v) * f));
  const BANDS = [[0, "#a16207"], [6, "#92400e"], [14, "#7c2d12"], [26, "#5b2112"], [50, "#40170e"], [90, "#2a100a"]].map(([d, h]) => [d, hexRGB(h)]);
  const bandAt = d => { d = Math.max(0, d); for (let k = 1; k < BANDS.length; k++) if (d <= BANDS[k][0]) { const [d0, a] = BANDS[k - 1], [d1, b] = BANDS[k]; return mixRGB(a, b, (d - d0) / (d1 - d0)); } return BANDS[BANDS.length - 1][1]; };
  const HUE = { [CLAY]: "#9a4a2c", [SAND]: "#bf9050", [SSTONE]: "#b8662c", [SHALE]: "#5e4a3e", [LIME]: "#b9ae94", [GRANITE]: "#77706f" };
  const colCache = new Map(), rgbOf = a => `rgb(${a[0]},${a[1]},${a[2]})`;
  function groundCol(m, d) { const k = m * 256 + Math.max(0, Math.min(255, d)); let v = colCache.get(k); if (v) return v;
    const band = bandAt(d); v = rgbOf(m === SOIL ? band : mixRGB(mixRGB(hexRGB(HUE[m]), band, 0.3), [20, 10, 5], Math.min(0.5, Math.max(0, d) / 110))); colCache.set(k, v); return v; }
  const backCol = d => { const k = 100000 + Math.max(0, Math.min(255, d)); let v = colCache.get(k); if (!v) { v = rgbOf(mixRGB(bandAt(d), [20, 10, 5], 0.62)); colCache.set(k, v); } return v; };
  // (layers the size of the picture, for the roots and the threads, laid on at once, so that overlaps do not darken)
  const layerCv = [document.createElement("canvas"), document.createElement("canvas")];
  function layer(k, camX, camY) { const L = layerCv[k]; if (L.width !== cv.width || L.height !== cv.height) { L.width = cv.width; L.height = cv.height; }
    const c = L.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, L.width, L.height); c.setTransform(1, 0, 0, 1, -camX * T, -camY * T); return c; }
  // (the lines of each set, thinnest first, in as few strokes as their widths allow; mirrored about their tree, and a little
  // lower, for the roots seen behind a tunnel's back wall)
  function strokeLines(c, sets, col, wMul, dx, dy, minW, mirror, s, fixedW = 0) {
    c.strokeStyle = col; c.lineCap = "round";
    for (const R of sets) { const L = R.lines; let cur = -1;
      for (let k = 0; k < L.length; k += 5) { const w = L[k + 4]; if (w < minW) continue;
        const q = fixedW ? Math.max(0.8, fixedW * s / 100) : Math.max(1, Math.round(w / 100 * s * wMul * 2) / 2);
        if (q !== cur) { if (cur >= 0) c.stroke(); c.lineWidth = q; c.beginPath(); cur = q; }
        let x0 = L[k], y0 = L[k + 1], x1 = L[k + 2], y1 = L[k + 3]; if (mirror) { x0 = 2 * R.tx - x0; x1 = 2 * R.tx - x1; y0 += 45; y1 += 45; }
        c.moveTo(x0 / 100 * s + dx, y0 / 100 * s + dy); c.lineTo(x1 / 100 * s + dx, y1 / 100 * s + dy); }
      if (cur >= 0) c.stroke(); }
  }
  // (Gnome dig's drawWorks: a ladder, its two rails and four rungs, against a cribbing post each side; a timber set: a post
  // either side, a cap under the earth above, a sill on the earth below, their joints pegged)
  function drawWorks(c0, c1, r0, r1, u) {
    const c = ctx, dug = (k, r) => inside(k, r) && mat[at(k, r)] === AIR;
    const plank = (x, y, w2, h2, col, edge) => { c.fillStyle = col; c.fillRect(x, y, w2, h2); c.fillStyle = edge; c.fillRect(x, y + h2 * 0.72, w2, h2 * 0.28); };
    for (const [i, kind] of S.works) {
      const k = i % WW, r = Math.floor(i / WW); if (k < c0 || k > c1 || r < r0 || r > r1 || mat[i] !== AIR) continue;
      const x = k * u, y = r * u;
      if (kind === "ladder") {
        for (const px of [0.02, 0.9]) plank(x + px * u, y - 0.5, u * 0.08, u + 1, "#8f6233", "#5f3d1c");
        for (const rx of [0.24, 0.7]) plank(x + rx * u, y - 0.5, u * 0.07, u + 1, "#b07d45", "#8a5c2e");
        for (let j = 0; j < 4; j++) { const ry = y + (j + 0.4) * u / 4; plank(x + 0.24 * u, ry, u * 0.53, u * 0.055, "#c48f55", "#8a5c2e"); }
      } else {
        for (const px of [0.06, 0.86]) plank(x + px * u, y + u * 0.06, u * 0.08, u * 0.9, "#9a6a37", "#6e4721");
        if (!dug(k, r - 1)) plank(x - 0.5, y + u * 0.02, u + 1, u * 0.1, "#a8743e", "#6e4721");
        if (!dug(k, r + 1)) plank(x - 0.5, y + u * 0.9, u + 1, u * 0.08, "#8f6233", "#5f3d1c");
        c.strokeStyle = "rgba(110, 71, 33, 0.85)"; c.lineWidth = u * 0.035; c.beginPath(); c.moveTo(x + u * 0.12, y + u * 0.14); c.lineTo(x + u * 0.3, y + u * 0.12); c.moveTo(x + u * 0.88, y + u * 0.14); c.lineTo(x + u * 0.7, y + u * 0.12); c.stroke();
      }
    }
  }
  // (a dug tile's shaded edges, made once for the tile's size)
  let edgeSet = null;
  function edges() {
    if (edgeSet && edgeSet.T === T) return edgeSet;
    const mk = (w, h, x0, y0, x1, y1, a) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); const g = c.getContext("2d");
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(8,4,2,${a})`); gr.addColorStop(1, "rgba(8,4,2,0)"); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); return c; };
    edgeSet = { T, top: mk(T + 0.5, T * 0.34, 0, 0, 0, T * 0.34, 0.55), left: mk(T * 0.16, T + 0.5, 0, 0, T * 0.16, 0, 0.35), right: mk(T * 0.16 + 0.5, T + 0.5, T * 0.16, 0, 0, 0, 0.35) };
    return edgeSet;
  }
  // (each tree's roots and each mushroom's threads, grown in Hazel as they come near the view, a few a frame; the roots tell the
  // water where to go faster)
  function ensureRoots(x0, x1) {
    const h = H(); if (!h || !h.roots || !(S.built && S.built.compiled)) return;
    let n = 0;
    for (const t of S.rootPlan) { if (t.done || t.x < x0 || t.x > x1) continue; if (n++ >= 3) break; t.done = true;
      const lines = t.kind === "shroom" ? h.threads(t.x * 100 + 50, t.row, t.seed) : h.roots(t.x * 100 + 50, t.row, t.k, t.seed);
      lines.sort((a, b) => a.w - b.w);
      const L = new Float32Array(lines.length * 5); let lo = t.x, hi = t.x;
      lines.forEach((l, i) => { L[i * 5] = l.x0; L[i * 5 + 1] = l.y0; L[i * 5 + 2] = l.x1; L[i * 5 + 3] = l.y1; L[i * 5 + 4] = l.w; lo = Math.min(lo, l.x0 / 100, l.x1 / 100); hi = Math.max(hi, l.x0 / 100, l.x1 / 100);
        if (t.kind !== "shroom") for (let q = 0; q <= 2; q++) { const c = Math.floor((l.x0 + (l.x1 - l.x0) * q / 2) / 100), r = Math.floor((l.y0 + (l.y1 - l.y0) * q / 2) / 100);
          if (inside(c, r) && PORES[mat[at(c, r)]] > 0) root[at(c, r)] = Math.min(3, root[at(c, r)] + (l.w >= 10 ? 2 : 1)); } });
      (t.kind === "shroom" ? S.threadSets : S.rootSets).push({ tx: t.x * 100 + 50, x0: Math.floor(lo) - 1, x1: Math.ceil(hi) + 1, lines: L }); }
  }
  // (the gnome, Gnome dig's own, copied from dig/app.js: its cap, beard and lantern; and, for the water, a swimmer's arms and a tilt)
  const loverAt = () => {};
  function gnome(c, x, y, u, d, ready, moving, now, diving, loves, lamp = true, cheer = false, pose = null) {
    if (cheer) { d = 2; moving = false; }
    const back = d === 0, flip = d === 3 ? -1 : 1, side = d === 1 || d === 3, step = moving ? Math.sin(now / 70) : 0;
    const bob = cheer ? -Math.abs(Math.sin(now / 150)) * 6 : moving ? -Math.abs(step) * 1.4 : 0, wave = cheer ? Math.sin(now / 110) * 2.5 : 0;
    c.save(); c.translate(x, y); c.scale(flip * u / 40, u / 40); c.translate(0, bob);
    // (Gnome world: swimming along, he lies forward into the stroke, turned about his hips, his head up out of the water)
    if (pose && pose.swim && pose.stroke) { c.translate(0, 6); c.rotate(1.0); c.translate(0, -6); }
    const E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    if (!pose) E(0, 19 - bob, 13, 3.4, "rgba(0, 0, 0, 0.32)");   // (his shadow)
    for (const s2 of [-1, 1]) {   // (boots, a step at a time, with fur at the top)
      const lift = s2 * step > 0 ? -2 * Math.abs(step) : 0;
      c.fillStyle = "#4b5563"; c.beginPath(); c.roundRect(s2 * 6 - 4 + (s2 > 0 ? 1 : -1), 13 + lift, 9, 6, 2.5); c.fill();
      c.fillStyle = "#e5e7eb"; c.beginPath(); c.roundRect(s2 * 6 - 4, 11.5 + lift, 8, 3, 1.5); c.fill();
    }
    const tank = () => { c.fillStyle = "#facc15"; c.beginPath(); c.roundRect(back ? -5 : -15, -7, back ? 10 : 7, 17, 3.5); c.fill();
      c.fillStyle = "#a16207"; c.fillRect(back ? -1.5 : -13, -9.5, 3, 3); };
    if (diving && !back) tank();   // (0.0.68: the diving gear on, its air tank on his back, behind him, or, his back to us, on it)
    // (the tunic, its sleeves and the belt)
    c.fillStyle = "#3b5bab"; c.beginPath(); c.moveTo(-9, -3); c.lineTo(9, -3); c.lineTo(12, 13); c.quadraticCurveTo(0, 15, -12, 13); c.closePath(); c.fill();
    c.fillStyle = "#2f4a8f"; c.beginPath(); c.moveTo(3, -3); c.lineTo(9, -3); c.lineTo(12, 13); c.quadraticCurveTo(7, 14.3, 4, 14.5); c.closePath(); c.fill();
    c.fillStyle = "#7c4a1e"; c.fillRect(-11, 5.5, 22, 3.6);
    if (diving && back) tank();
    if (!back) { c.fillStyle = "#eab308"; c.beginPath(); c.roundRect(-3, 4.8, 6, 5, 1); c.fill(); c.fillStyle = "#7c4a1e"; c.fillRect(-1.2, 6.3, 2.4, 2); }
    let lx = cheer ? 15 : side ? 14 : 13, ly = cheer ? -19 - wave : side ? 2 : 5;   // (the lantern's hand)
    let hx = cheer ? -14 : -11, hy = cheer ? -16 + wave : 8;
    // (Gnome world, after Messed Up Dress Up's swimmers: swimming along, the arms windmill half a turn apart, the front crawl;
    // treading at the surface, the lantern held up out of the water, the other hand sculling)
    if (pose && pose.swim) { const a = pose.t / 170;
      if (pose.stroke) { lx = 10 + 13 * Math.cos(a); ly = -1 + 13 * Math.sin(a); hx = -6 + 13 * Math.cos(a + Math.PI); hy = -1 + 13 * Math.sin(a + Math.PI); }
      else { lx = 13; ly = -16; hx = -13 + 2.5 * Math.sin(a * 2); hy = 3 + 1.5 * Math.cos(a * 2); } }   // (the other hand)
    c.strokeStyle = "#3b5bab"; c.lineWidth = 4.5; c.lineCap = "round";
    c.beginPath(); c.moveTo(-8, -1); c.lineTo(hx, hy - 1); c.moveTo(8, -1); c.lineTo(lx - 2, ly); c.stroke();
    E(hx, hy, 2.4, 2.4, "#f2c9a0"); E(lx - 1.5, ly + 0.5, 2.4, 2.4, "#f2c9a0");
    if (loves && !back) { c.save(); c.translate(hx - 1, hy + 1); loverAt(c, 0, 0, 26, now, false); c.restore(); }   // (0.0.71: the love shooter in his other hand)
    // (the lantern: a handle, a dark frame, its glass lit when it is ready; 0.0.73: only once he has it)
    if (lamp) {
      if (ready) { const gl = c.createRadialGradient(lx + 1, ly + 7, 0, lx + 1, ly + 7, 12); gl.addColorStop(0, "rgba(254, 240, 138, 0.75)"); gl.addColorStop(1, "rgba(254, 240, 138, 0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx + 1, ly + 7, 12, 0, 7); c.fill(); }
    c.strokeStyle = "#1f2937"; c.lineWidth = 1.2; c.beginPath(); c.arc(lx + 1, ly + 2.5, 2.2, Math.PI, 0); c.stroke();
    c.fillStyle = "#1f2937"; c.beginPath(); c.roundRect(lx - 2.5, ly + 2.5, 7, 9, 1.5); c.fill();
    c.fillStyle = ready ? "#fef08a" : "#a16207"; c.beginPath(); c.roundRect(lx - 1.3, ly + 4, 4.6, 6, 1); c.fill();
    }
    if (back) {   // (his back: the beard showing at either side under the cap)
      E(-7.5, -6, 3.5, 6, "#f1f5f9", 0.3); E(7.5, -6, 3.5, 6, "#f1f5f9", -0.3);
      c.fillStyle = "#e5e7eb"; c.beginPath(); c.ellipse(0, -9.5, 8, 6.5, 0, 0, 7); c.fill();   // (white hair under the cap)
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.8; c.beginPath(); for (const hx of [-5, -2, 1, 4]) { c.moveTo(hx, -14); c.quadraticCurveTo(hx + 1, -9, hx, -4); } c.stroke();
    } else {
      // (the face, rosy cheeks, the beard down over the tunic, its strands)
      c.fillStyle = "#f2c9a0"; c.beginPath(); c.ellipse(side ? 1.5 : 0, -10.5, 7.5, 6.5, 0, 0, 7); c.fill();
      E(side ? -3 : -5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)"); E(side ? 6 : 5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)");
      c.fillStyle = "#f8fafc"; c.beginPath(); c.moveTo(-8 + (side ? 1 : 0), -8); c.quadraticCurveTo(-10, 3, (side ? 2 : 0), 12); c.quadraticCurveTo(10, 3, 8 + (side ? 2 : 0), -8); c.quadraticCurveTo(side ? 2 : 0, -2, -8 + (side ? 1 : 0), -8); c.fill();
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.8; c.beginPath();
      for (const bx of [-4, -1, 2, 5]) { const ox = side ? 1.5 : 0; c.moveTo(bx + ox, -3); c.quadraticCurveTo(bx * 0.6 + ox, 3, bx * 0.3 + ox, 8); }
      c.stroke();
      const fx = side ? 2.5 : 0;   // (the face turned a little toward the way he goes)
      // eyes, each with a glint, under bushy white brows
      for (const s2 of [-1, 1]) { const ex2 = fx + s2 * 3.2;
        if (cheer) { c.strokeStyle = "#1f2937"; c.lineWidth = 1.1; c.beginPath(); c.arc(ex2, -10.4, 1.7, Math.PI * 1.12, Math.PI * 1.88); c.stroke(); }
        else { E(ex2, -11.2, 1.5, 1.7, "#1f2937"); E(ex2 + 0.5, -11.8, 0.5, 0.5, "#ffffff"); }
        c.fillStyle = "#f8fafc"; c.beginPath(); c.ellipse(ex2 + s2 * 0.5, cheer ? -14.2 : -13.4, 3, 1.4, s2 * 0.3, 0, 7); c.fill();
        c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.5; c.beginPath(); c.moveTo(ex2 - 2, -13.2); c.lineTo(ex2 + 2.4, -13.8); c.stroke(); }
      if (cheer) { c.fillStyle = "#7f1d1d"; c.beginPath(); c.arc(fx, -5, 3.4, 0.08, Math.PI - 0.08); c.closePath(); c.fill(); E(fx, -2.5, 1.9, 1, "#f472b6"); }   // (his smile, open wide)
      // the moustache, sweeping out from under the nose, and the round nose
      E(fx - 3.6, -6.4, 4.6, 2.2, "#f1f5f9", 0.35); E(fx + 3.6, -6.4, 4.6, 2.2, "#f1f5f9", -0.35);
      c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.6; c.beginPath(); c.moveTo(fx, -7); c.lineTo(fx - 6.5, -5.2); c.moveTo(fx, -7); c.lineTo(fx + 6.5, -5.2); c.stroke();
      E(fx + (side ? 1 : 0), -8.6, 2.9, 2.6, "#f0997d"); E(fx + (side ? 0.2 : -0.8), -9.4, 0.9, 0.7, "rgba(255, 255, 255, 0.6)");
      if (diving) {   // (and the mask over his eyes, its strap round the back of his head)
        c.strokeStyle = "#0f172a"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(fx - 7, -11.5); c.lineTo(-9.5, -11); c.stroke();
        c.fillStyle = "#0284c7"; c.beginPath(); c.roundRect(fx - 7.5, -15.2, 15, 7.6, 3); c.fill();
        c.fillStyle = "rgba(224, 242, 254, 0.62)"; c.beginPath(); c.roundRect(fx - 6, -14, 12, 5.2, 2.2); c.fill();
        E(fx - 3.5, -13, 1.6, 0.7, "rgba(255, 255, 255, 0.85)", -0.3);
      }
    }
    if (back && diving) { c.strokeStyle = "#0f172a"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-8, -11.5); c.lineTo(8, -11.5); c.stroke(); }
    // (the tall red cap, pulled down over the brows, its tip bending back)
    c.fillStyle = "#dc2626"; c.beginPath(); c.moveTo(-10, -14.5); c.quadraticCurveTo(-7, -25, -1, -34); c.quadraticCurveTo(2, -36, 4, -32.5); c.quadraticCurveTo(7, -24, 10, -14.5); c.quadraticCurveTo(0, -16, -10, -14.5); c.fill();
    c.fillStyle = "#b91c1c"; c.beginPath(); c.moveTo(3, -33); c.quadraticCurveTo(7, -24, 10, -14.5); c.quadraticCurveTo(6, -15.3, 4, -15.5); c.quadraticCurveTo(4, -24, 3, -33); c.fill();
    c.strokeStyle = "rgba(255, 255, 255, 0.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -17.5); c.quadraticCurveTo(-4, -26, -0.5, -32); c.stroke();
    c.restore();
  }
  // (Matthew: "when the gnome is moving laterally, let's draw them in profile, like mario 3 as inspiration") The gnome from the
  // side, the way he goes, in the same cell of 40 units as the gnome facing us, its middle at x, y: his tall red cap leaning
  // back, its tip trailing; his round nose out in front, one eye under a bushy brow, the moustache sweeping back, the long
  // white beard down over his chest; his tunic and belt; the far arm swinging behind him, the near one holding the lantern out
  // ahead; his boots in a stride, a step every fifth of a second or so, his body bobbing; in the air, his legs tucked, the far
  // one back, the near one forward; with the diving gear, its tank on his back and its mask over his eye; swimming along, lying
  // forward into the stroke, his arms windmilling, his feet kicking
  function gnomeProfile(c, x, y, u, face, moving, ground, vy, now, diving, pose) {
    const swim = pose && pose.swim, stroke = swim && pose.stroke, p = now / 85;
    const run = moving && ground && !swim, bob = run ? -Math.abs(Math.sin(p)) * 1.6 : 0;
    const E = (cx, cy, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, rx, ry, rot, 0, 7); c.fill(); };
    c.save(); c.translate(x, y); c.scale((face < 0 ? -1 : 1) * u / 40, u / 40); c.translate(0, bob);
    if (stroke) { c.translate(0, 6); c.rotate(1.05); c.translate(0, -6); }
    else if (!ground && !swim) c.rotate(vy < 0 ? -0.08 : 0.06);
    else if (run) { c.translate(0, 18); c.rotate(0.08); c.translate(0, -18); }   // (leaning into the run)
    if (!swim && ground) E(0, 19 - bob, 12, 3.2, "rgba(0, 0, 0, 0.3)");
    // (the legs: a stride running; tucked in the air; kicking in the water; the far one darker, behind)
    const leg = (a, near) => { const hx = near ? 1.5 : -1.5, hy = 10, fx = hx + Math.sin(a) * 8, fy = hy + Math.cos(a) * 8;
      c.strokeStyle = near ? "#2f4a8f" : "#25396e"; c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(hx, hy); c.lineTo(fx, fy); c.stroke();
      c.fillStyle = near ? "#4b5563" : "#374151"; c.beginPath(); c.roundRect(fx - 3.2, fy - 1.5, 9, 5, 2.4); c.fill();
      c.fillStyle = near ? "#e5e7eb" : "#c7cbd1"; c.beginPath(); c.roundRect(fx - 3, fy - 2.8, 6, 2.6, 1.2); c.fill(); };
    const kick = stroke ? Math.sin(p * 2.2) * 0.45 : 0;
    const aNear = swim ? kick : !ground ? 0.75 : run ? Math.sin(p) * 1.0 : 0, aFar = swim ? -kick : !ground ? -0.55 : run ? -Math.sin(p) * 1.0 : 0;
    // (the far arm, behind him: swinging opposite the near leg, or windmilling)
    const shoulder = [0, -1.5], armAt = a => [shoulder[0] + Math.sin(a) * 10, shoulder[1] + Math.cos(a) * 10];
    const farA = stroke ? p * 1.2 + Math.PI : run ? -aNear * 0.9 : !ground ? -2.3 : 0.3, nearA = stroke ? p * 1.2 : run ? 0.9 + aNear * 0.25 : !ground ? 2.2 : 1.1;
    if (diving) { c.fillStyle = "#facc15"; c.beginPath(); c.roundRect(-13, -7, 7, 17, 3.5); c.fill(); c.fillStyle = "#a16207"; c.fillRect(-11, -9.5, 3, 3); }
    { const [hx, hy] = armAt(farA); c.strokeStyle = "#2f4a8f"; c.lineWidth = 4.5; c.lineCap = "round"; c.beginPath(); c.moveTo(-1, -1); c.lineTo(hx - 1, hy); c.stroke(); E(hx - 1, hy, 2.3, 2.3, "#e0b48a"); }
    leg(aFar, false);
    // (the tunic, the back of it shaded; the belt, the buckle in front)
    c.fillStyle = "#3b5bab"; c.beginPath(); c.moveTo(-6, -3); c.lineTo(5.5, -3); c.quadraticCurveTo(9, 4, 10, 13); c.quadraticCurveTo(0, 15, -9.5, 13); c.quadraticCurveTo(-8, 4, -6, -3); c.fill();
    c.fillStyle = "#2f4a8f"; c.beginPath(); c.moveTo(-6, -3); c.lineTo(-2, -3); c.lineTo(-3, 14); c.quadraticCurveTo(-7, 13.8, -9.5, 13); c.quadraticCurveTo(-8, 4, -6, -3); c.fill();
    c.fillStyle = "#7c4a1e"; c.fillRect(-8.7, 5.5, 18.2, 3.6); c.fillStyle = "#eab308"; c.beginPath(); c.roundRect(6, 4.8, 4, 5, 1); c.fill();
    leg(aNear, true);
    // (the head from the side: the white hair at the back, the ear, the face, the nose, the eye and brow, the moustache, the beard)
    E(-4.6, -9.5, 3.4, 5.4, "#e5e7eb");
    E(2, -10.5, 6.6, 6.4, "#f2c9a0");
    E(-1.8, -10, 1.6, 2.2, "#e0b48a");
    E(4.5, -8, 2.2, 1.6, "rgba(244, 114, 114, 0.45)");
    c.fillStyle = "#f8fafc"; c.beginPath(); c.moveTo(-2.5, -8); c.quadraticCurveTo(-4, 3, 3.5, 12); c.quadraticCurveTo(10.5, 3, 9.5, -6.5); c.quadraticCurveTo(3, -3, -2.5, -8); c.fill();
    c.strokeStyle = "#cbd5e1"; c.lineWidth = 0.8; c.beginPath(); for (const bx of [0.5, 3, 5.5, 8]) { c.moveTo(bx, -4); c.quadraticCurveTo(bx * 0.75, 3, bx * 0.5 + 2, 9); } c.stroke();
    E(6.5, -6.3, 4.6, 2, "#f1f5f9", -0.25);
    E(9.2, -8.8, 3.2, 2.8, "#f0997d"); E(8.6, -9.7, 0.9, 0.7, "rgba(255, 255, 255, 0.6)");
    E(5.4, -11.4, 1.3, 1.6, "#1f2937"); E(5.8, -12, 0.45, 0.45, "#ffffff");
    c.fillStyle = "#f8fafc"; c.beginPath(); c.ellipse(5.2, -13.5, 3, 1.3, -0.2, 0, 7); c.fill();
    if (diving) { c.fillStyle = "#0284c7"; c.beginPath(); c.roundRect(2.5, -15, 7.5, 7, 2.6); c.fill(); c.fillStyle = "rgba(224, 242, 254, 0.62)"; c.beginPath(); c.roundRect(3.6, -14, 5.4, 5, 2); c.fill();
      c.strokeStyle = "#0f172a"; c.lineWidth = 1.3; c.beginPath(); c.moveTo(2.5, -11.5); c.lineTo(-6, -11); c.stroke(); }
    // (the cap: its brim over the brow, the cone leaning back, the tip bending down behind him)
    c.fillStyle = "#dc2626"; c.beginPath(); c.moveTo(9.5, -13.6); c.quadraticCurveTo(6, -24, -1, -30); c.quadraticCurveTo(-6, -34.5, -11.5, -31.5); c.quadraticCurveTo(-8.5, -29.5, -8, -25); c.quadraticCurveTo(-8.5, -18, -8.5, -12); c.quadraticCurveTo(0, -15.4, 9.5, -13.6); c.fill();
    c.fillStyle = "#b91c1c"; c.beginPath(); c.moveTo(-8.5, -12); c.quadraticCurveTo(-8.5, -18, -8, -25); c.quadraticCurveTo(-8.5, -29.5, -11.5, -31.5); c.quadraticCurveTo(-5, -26, -4.5, -13.2); c.fill();
    c.strokeStyle = "rgba(255, 255, 255, 0.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(6, -16.5); c.quadraticCurveTo(3, -24, -2, -28.5); c.stroke();
    // (the near arm, the lantern held out ahead, glowing)
    { const [hx, hy] = armAt(nearA), lx = hx + 1.5, ly = hy - 1 + (run ? Math.sin(p * 2) * 0.8 : 0);
      c.strokeStyle = "#3b5bab"; c.lineWidth = 4.5; c.lineCap = "round"; c.beginPath(); c.moveTo(1.5, -1); c.lineTo(hx, hy); c.stroke(); E(hx, hy, 2.4, 2.4, "#f2c9a0");
      const gl = c.createRadialGradient(lx + 1, ly + 7, 0, lx + 1, ly + 7, 12); gl.addColorStop(0, "rgba(254, 240, 138, 0.75)"); gl.addColorStop(1, "rgba(254, 240, 138, 0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx + 1, ly + 7, 12, 0, 7); c.fill();
      c.strokeStyle = "#1f2937"; c.lineWidth = 1.2; c.beginPath(); c.arc(lx + 1, ly + 2.5, 2.2, Math.PI, 0); c.stroke();
      c.fillStyle = "#1f2937"; c.beginPath(); c.roundRect(lx - 2.5, ly + 2.5, 7, 9, 1.5); c.fill(); c.fillStyle = "#fef08a"; c.beginPath(); c.roundRect(lx - 1.3, ly + 4, 4.6, 6, 1); c.fill(); }
    c.restore();
  }
  // ---- (Matthew, 2026-11-23: "let's spend more polygons on the trees above surface too", "more realism"; "the trees leaves
  // should use the fractal branches and pads from Messed Up Dress Up, not these circles that look quite prototypy";
  // "foreground trees should have crowns, not trunks that just end like stumps") The trees as Messed Up Dress Up grows them
  // (dress-up/js/10-nature.js leafyTree, pineTree, taperSvg; 09-backgrounds.js padInner; by Matthew Hammer and family, Apache
  // 2.0), by way of Gnome dig's canvas port of them (dig/app.js, copied here): a trunk flaring at its roots, curved tapering
  // limbs forking up and out, leaf pads (low scalloped clouds, shaded beneath, lit on top) at their tips, darker behind and
  // lighter in front; a pine's tiers of drooping boughs. Each tree painted once into a picture of its own (a sprite), at its
  // own height here, and drawn from it. (Matthew: "please get inspired by the artwork of Rien Poortvliet"): in the spirit of
  // his woods for Gnomes (Wil Huygen and Rien Poortvliet, 1976), our own pictures, none of his copied.
  const seededR = seed => i => { const v = Math.sin(seed * 71.3 + i * 13.7) * 43758.5453; return v - Math.floor(v); };
  const poly = (c, pts, fill) => { c.fillStyle = fill; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); };
  const mixHex = (h, to, t) => { const a = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), b = [1, 3, 5].map(i => parseInt(to.slice(i, i + 2), 16));
    return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
  // a curved, tapering limb: from p0 by way of p1 to p2, w0 wide to w1
  function taper(c, p0, p1, p2, w0, w1, fill) {
    const L = [], R = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8, x = (1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0], y = (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1];
      const dx = 2 * (1 - u) * (p1[0] - p0[0]) + 2 * u * (p2[0] - p1[0]), dy = 2 * (1 - u) * (p1[1] - p0[1]) + 2 * u * (p2[1] - p1[1]), d = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * u) / 2;
      L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]);
    }
    poly(c, [...L, ...R.reverse()], fill);
  }
  // a leaf pad's shape j (of 8): a scalloped top over a flat bottom; its shade beneath and its lit top
  const PADS = [...Array(8)].map((_, j) => {
    const r = v => { const z = Math.sin(j * 57.1 + v * 13.9) * 43758.5453; return z - Math.floor(z); };
    const w = 170 + 70 * r(1), h = 34 + 22 * r(2), bumps = 3 + j % 5, amp = 7 + 7 * r(3), lean = (r(4) - 0.5) * 0.6, top = [], bottom = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40, x = (u - 0.5) * w, env = Math.pow(Math.sin(Math.PI * Math.pow(u, 1 + lean)), 0.7); top.push([x, -h * env - amp * Math.abs(Math.sin(Math.PI * bumps * u)) * env]); }
    for (let i = 12; i >= 0; i--) { const u = i / 12; bottom.push([(u - 0.5) * w, 5 * Math.sin(Math.PI * u)]); }
    return { all: [...top, ...bottom], shade: [...top.map(([x, y]) => [x, y * 0.3]), ...bottom], lit: top.filter((_, i) => i > 4 && i < 30).map(([x, y]) => [x * 0.7 - w * 0.06, y * 0.85 - 4]) };
  });
  function pad(c, j, x, y, sx, sy, color) {
    const P2 = PADS[((j % 8) + 8) % 8];
    c.save(); c.translate(x, y); c.scale(sx, sy); poly(c, P2.all, color); poly(c, P2.shade, "rgba(0, 0, 0, 0.2)"); poly(c, P2.lit, "rgba(255, 255, 255, 0.13)"); c.restore();
  }
  // a broadleaf tree: a trunk flaring at the roots, limbs forking up and out, leaf pads clustered at their tips
  function leafyTree(c, seed, o = {}) {
    const r = seededR(seed), H2 = o.h ?? 320, wide = o.wide ?? 1, bark = o.bark ?? "#6b4a2b", dk = mixHex(bark, "#000000", 0.35);
    const greens = o.greens ?? ["#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"];
    const limbs = [], tips = [];
    const grow = (x, y, a, len, w, lvl, id) => {
      const bend = (r(id * 7 + 1) - 0.5) * 0.6, mx = x + Math.cos(a) * len * 0.5, my = y + Math.sin(a) * len * 0.5;
      const ex = mx + Math.cos(a + bend) * len * 0.5, ey = my + Math.sin(a + bend) * len * 0.5;
      limbs.push([[x, y], [mx, my], [ex, ey], w, w * 0.6]);
      if (lvl === 0) { tips.push([ex, ey, len]); return; }
      const n = 2 + (r(id * 7 + 2) > 0.45 ? 1 : 0);
      for (let k = 0; k < n; k++) grow(ex, ey, a + bend + (k - (n - 1) / 2) * (0.55 + 0.3 * r(id * 7 + 3 + k)) * wide, len * (0.6 + 0.18 * r(id * 11 + k)), w * 0.6, lvl - 1, id * 3 + k + 1);
    };
    const lean = (r(1) - 0.5) * 0.18, top = [Math.sin(lean) * H2 * 0.45, -H2 * 0.44];
    if (o.shadow !== false) { c.fillStyle = "rgba(0, 0, 0, 0.15)"; c.beginPath(); c.ellipse(0, 2, 70 * wide, 11, 0, 0, 7); c.fill(); }   // (Gnome world: none for a great tree's crown, up in the air)
    for (const e of [-1, 1]) { c.fillStyle = bark; c.beginPath(); c.moveTo(e * 10, -24); c.quadraticCurveTo(e * 16, -4, e * (30 + 8 * r(2 + e)), 2); c.lineTo(e * 6, 2); c.closePath(); c.fill(); }
    taper(c, [0, 2], [top[0] * 0.4, -H2 * 0.24], top, 30, 19, bark);
    for (let k = 0; k < 3; k++) grow(top[0], top[1], -Math.PI / 2 + (k - 1) * 0.7 * wide + (r(10 + k) - 0.5) * 0.3, H2 * (0.25 + 0.06 * r(20 + k)), 16, 1, k + 2);
    for (const [p0, p1, p2, w0, w1] of limbs) taper(c, p0, p1, p2, w0, w1, bark);
    c.strokeStyle = dk; c.globalAlpha = 0.5; c.lineWidth = 3; c.beginPath(); c.moveTo(-4, -20); c.quadraticCurveTo(top[0] * 0.3 - 6, -H2 * 0.22, top[0] - 4, top[1] + 10); c.stroke(); c.globalAlpha = 1;
    if (o.marks) { c.fillStyle = "#292524"; for (let i = 0; i < 7; i++) { const q = 0.08 + i * 0.12, x = top[0] * q * 0.9, y = -H2 * 0.44 * q - 6; c.fillRect(x - 8 + (i % 2) * 6, y, 9, 3); } }   // (a birch's dark marks)
    if (o.bare) return;   // (Gnome world: the tree bare, its limbs seen when the gnome is under it)
    const pads = [];
    for (let i = 0; i < 4; i++) pads.push([top[0] + (r(30 + i) - 0.5) * 140 * wide, top[1] - 60 - 70 * r(34 + i), 0.55 + 0.2 * r(38 + i), 0]);
    tips.forEach(([x, y], i) => { pads.push([x + (r(40 + i) - 0.5) * 30, y - 16, 0.42 + 0.16 * r(50 + i), 1]); pads.push([x + (r(60 + i) - 0.5) * 40, y + 8, 0.36 + 0.14 * r(70 + i), 2]); });
    pads.sort((a, b) => a[3] - b[3] || a[1] - b[1]);
    pads.forEach(([x, y, sc, layer], i) => { const j = Math.floor(r(80 + i) * 8), sx = sc * (r(90 + i) < 0.5 ? -1 : 1) * wide;
      pad(c, j, x, y, sx, sc, greens[Math.min(greens.length - 1, layer + Math.floor(r(100 + i) * 3))]); });
  }
  // a pine: a trunk, then tiers of drooping boughs, ragged at their tips, darker underneath
  function pineTree(c, seed, color, n = 5) {
    const r = seededR(seed);
    c.fillStyle = "#5e3d22"; c.fillRect(-6, -34, 12, 36);
    for (let j = 0; j < n; j++) {
      const u = j / n, y = -22 - u * 158, hw = 60 * (1 - u * 0.84), th = 62 - 22 * u, tip = y - th, right = [];
      for (let q = 1; q <= 3; q++) { const v = q / 3, x = hw * v; right.push([x - hw / 6, y - 4 - 6 * r(j * 10 + q)], [x, y + 6 + 6 * r(j * 10 + q + 5) - 4 * v]); }
      const pts = [[0, tip], ...right, ...[...right].reverse().map(([x, yy]) => [-x * (0.94 + 0.1 * r(j + 40)), yy + 2 * (r(j + 41) - 0.5)])];
      c.lineJoin = "round"; c.strokeStyle = color; c.lineWidth = 3; poly(c, pts, color); c.stroke();
      poly(c, [[-hw * 0.85, y + 2], [hw * 0.85, y + 2], [hw * 0.5, y - th * 0.3], [-hw * 0.5, y - th * 0.3]], "rgba(0, 0, 0, 0.16)");
      poly(c, [[0, tip + 4], [-hw * 0.6, y - th * 0.15], [-hw * 0.18, y - th * 0.5]], "rgba(255, 255, 255, 0.1)");
    }
  }
  const spriteCache = new Map();
  function sprite(key, wT, hT, ox, oy, paint) {
    let sp = spriteCache.get(key);
    if (sp && sp.T === T) { spriteCache.delete(key); spriteCache.set(key, sp); return sp; }
    const res = Math.min(T, 44), c = document.createElement("canvas"); c.width = Math.ceil(wT * res); c.height = Math.ceil(hT * res);
    const g = c.getContext("2d"); g.translate(ox * res, oy * res); paint(g, res);
    sp = { cv: c, ox, oy, res, T }; spriteCache.set(key, sp);
    if (spriteCache.size > 70) spriteCache.delete(spriteCache.keys().next().value);
    return sp;
  }
  const drawSprite = (sp, x, y, k = 1) => { const f = T / sp.res * k; ctx.drawImage(sp.cv, x - sp.ox * T * k, y - sp.oy * T * k, sp.cv.width * f, sp.cv.height * f); };
  const TREE_LOOK = { 0: { wide: 1.05 }, 2: { wide: 0.8, bark: "#e9e4dc", marks: true, greens: ["#4d7c0f", "#5a8f2a", "#6aa832", "#7cbf3a", "#93d04a"] },
    3: { wide: 0.75, bark: "#c9c7b3", greens: ["#5a7a1f", "#6f9228", "#86a83a", "#a3c24e", "#c2d86a"] }, 4: { wide: 1.25, bark: "#5e4630", greens: ["#3f5e2c", "#4f6f33", "#5f803b", "#74934a", "#8aa85a"] } };
  // (Matthew: "the willow trees should look much better"; "look at real examples", and three photographs of weeping willows)
  // A weeping willow as the photographs have it: a broad dome, as wide as it is tall or wider; a thick, gnarled trunk leaning a
  // little, mossy on its lit side, splitting low into sinuous limbs that arch up and out and droop at their tips; and the leaves
  // in tassels hanging in layers from the limbs, behind and in front, the curtain reaching nearly to the ground, gaps in it
  // showing the trunk and limbs inside; yellow-green, or (one in three) silvery blue-green; lit from the east, where the sun is.
  // In two parts: its back (the back curtains, the trunk, the limbs) and its front (the front curtains, the light on them)
  function taper3(g, p0, p1, p2, p3, w0, w1, fill) {
    const L = [], R = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, mt = 1 - t;
      const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0], y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
      const dx = 3 * mt * mt * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]), dy = 3 * mt * mt * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
      const d = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * t) / 2; L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]); }
    poly(g, [...L, ...R.reverse()], fill);
  }
  function weepingWillow(g, t, hT, u, part) {
    const r = seededR(t.seed + 9), h = hT * u, W = h * (0.62 + 0.12 * r(1)), lean = (r(2) - 0.5) * u * 1.2, blue = t.seed % 3 === 0;
    const back = blue ? ["#3e5a55", "#4d6c66", "#5d7d76"] : ["#4a6418", "#5a7820", "#6b8a26"], front = blue ? ["#6f948b", "#86a9a0", "#a3c2b9"] : ["#86a92e", "#a2c23e", "#bcd75a"], hi = blue ? "#cfe0da" : "#dcec86";
    const bark = "#4e3e2c", moss = "rgba(120,140,60,0.45)";
    const top = x => -h * (0.98 - 0.55 * (x / W) ** 2) + (r(x / u * 1.7 + 3) - 0.5) * u * 0.6;   // (the dome)
    // (a tassel: a narrow strip of small leaves, tapering, hanging from y0 to y1, swaying a little; its edges ragged)
    const tassel = (x, y0, y1, col, wid) => { const n = Math.max(4, Math.round((y1 - y0) / (u * 0.22))), sway = (r(x * 1.3 + y0) - 0.5) * u * 0.5, L = [], R = [];
      for (let k = 0; k <= n; k++) { const q = k / n, cx = x + sway * q * q, cy = y0 + (y1 - y0) * q, w = wid * (1 - 0.75 * q) * (k % 2 ? 1.25 : 0.8); L.push([cx - w, cy]); R.push([cx + w, cy + u * 0.06]); }
      poly(g, [...L, ...R.reverse()], col); };
    const layer = (cols, y0off, gap, dw, step) => { for (let x = -W; x <= W; x += u * step) { if (r(x * 2.9 + y0off) < gap) continue;
      const xx = x + (r(x * 5.1) - 0.5) * u * 0.2, edge = Math.abs(xx) / W, y0 = top(xx) + y0off * h + r(x * 3.7) * u * 0.6;
      const y1 = -u * (0.15 + 0.9 * r(x * 7.3 + y0off)) - (1 - edge) * h * 0.08 * r(x * 1.1);
      if (y1 - y0 < u) continue; tassel(xx, y0, y1, cols[Math.floor(r(x * 4.3 + y0off) * 3)], u * dw); } };
    if (part === "back") {
      layer(back, 0, 0.08, 0.2, 0.26);
      // the trunk, gnarled and leaning, its foot flaring, moss on its lit side; the limbs, sinuous, arching out and drooping
      const fx = lean, fy = -h * 0.3;
      taper3(g, [0, u * 0.05], [u * 0.25, -h * 0.1], [lean * 0.5 - u * 0.2, -h * 0.2], [fx, fy], u * 1.05, u * 0.75, bark);
      for (const e of [-1, 1]) { g.fillStyle = bark; g.beginPath(); g.moveTo(e * u * 0.3, -u * 0.8); g.quadraticCurveTo(e * u * 0.45, -u * 0.15, e * u * 1.0, u * 0.05); g.lineTo(e * u * 0.1, u * 0.05); g.closePath(); g.fill(); }
      g.strokeStyle = "rgba(25,18,10,0.5)"; g.lineWidth = Math.max(1, u / 18);
      for (let j = 0; j < 5; j++) { const f = (j / 4 - 0.5) * 0.8; g.beginPath(); g.moveTo(f * u, 0); g.bezierCurveTo(f * u + u * 0.2, -h * 0.1, lean * 0.5 + f * u * 0.6, -h * 0.2, fx + f * u * 0.5, fy); g.stroke(); }
      g.fillStyle = moss; g.beginPath(); g.ellipse(u * 0.25, -h * 0.12, u * 0.18, h * 0.09, 0.1, 0, 7); g.fill();
      for (let k = 0; k < 5; k++) { const side = k - 2, a = -Math.PI / 2 + side * 0.5 + (r(k + 20) - 0.5) * 0.25, reach = W * (0.55 + 0.35 * r(k + 30));
        const p3 = [fx + Math.cos(a) * reach * 1.25, fy + Math.sin(a) * h * 0.5 + h * 0.12 * Math.abs(side) * 0.6];
        taper3(g, [fx, fy], [fx + Math.cos(a) * reach * 0.25, fy - h * (0.3 + 0.1 * r(k + 40))], [p3[0] * 0.8, p3[1] - h * 0.25], p3, u * (0.55 - 0.06 * Math.abs(side)), u * 0.1, bark);
        g.fillStyle = moss; g.beginPath(); g.ellipse(fx + Math.cos(a) * reach * 0.3 + u * 0.1, fy - h * 0.2, u * 0.12, u * 0.4, a + 1.6, 0, 7); g.fill();
        g.strokeStyle = bark; g.lineWidth = Math.max(1, u / 16); g.beginPath(); for (let j = 0; j < 4; j++) { const q = 0.45 + j * 0.14, x0 = fx + (p3[0] - fx) * q, y0 = fy - h * 0.28 + (p3[1] - fy + h * 0.28) * q;
          g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (r(k * 9 + j) - 0.5) * u * 1.4, y0 - u * 0.6, x0 + (r(k * 7 + j) - 0.5) * u * 1.8, y0 + u * 0.9); } g.stroke(); }
      return; }
    // the curtains in front, gaps in them; the light along the east and the top
    layer(front, 0.06, 0.3, 0.22, 0.3);
    layer([front[2], hi, front[1]], 0.1, 0.62, 0.16, 0.34);
    g.globalAlpha = 0.55; for (let x = W * 0.1; x <= W; x += u * 0.4) { if (r(x * 8.1) < 0.4) continue; const y0 = top(x) + u * 0.2, y1 = y0 + h * (0.2 + 0.3 * r(x * 6.6)); tassel(x, y0, y1, hi, u * 0.1); } g.globalAlpha = 1;
  }
  // (two pictures of each tree: its back, seen always, and its front, faded away while the gnome is under the tree, so the
  // inside shows, as a cutaway (Matthew: "when we go under a tree, we should reveal the 'cut away'"; "same for other trees,
  // but especially willows since they have low hanging leaves"; "on the ground surface", "esp near water"): a willow's back
  // curtains, trunk and limbs, and its front curtains; another tree bare, its trunk and limbs, and whole)
  function treeSprite(t, part = "front") {
    const hT = t.h * (t.tall ? 1.45 : 1) * (t.kind === 4 ? 1.1 : 1), wT = (t.kind === 1 ? 0.45 : t.kind === 4 ? 1.0 : 0.8 * (TREE_LOOK[t.kind] || TREE_LOOK[0]).wide) * hT + 1.2;
    return sprite(`tree:${t.kind}:${t.h}:${t.seed}:${t.tall ? 1 : 0}:${part}`, wT * 2, hT * 1.3 + 1, wT, hT * 1.3 + 0.6, (g, u) => {
      if (t.kind === 4) { weepingWillow(g, t, hT, u, part); return; }
      if (t.kind === 1) { const sc = hT * 1.1 * u / 200; g.scale(sc, sc);
        if (part === "back") { g.fillStyle = "#5e3d22"; g.beginPath(); g.moveTo(-6, 2); g.lineTo(-2, -190); g.lineTo(2, -190); g.lineTo(6, 2); g.fill();
          g.strokeStyle = "#5e3d22"; g.lineWidth = 3; g.beginPath(); for (let j = 0; j < 7; j++) { const y = -30 - j * 22, w = 50 * (1 - j / 8); g.moveTo(0, y); g.lineTo(-w, y + 10); g.moveTo(0, y - 6); g.lineTo(w, y + 4); } g.stroke(); return; }
        pineTree(g, t.seed + 1, ["#1f5f3a", "#245f34", "#2a6b3c"][t.seed % 3], 5 + Math.floor(t.h / 3)); return; }
      const sc = hT * u / 330; g.scale(sc, sc); leafyTree(g, t.seed + 1, { ...(TREE_LOOK[t.kind] || TREE_LOOK[0]), bare: part === "back" });
    });
  }
  // (how far each tree is opened: the gnome under its crown, on the land or in the water beside it)
  function underTree(t) {
    const g = S.g; if (!g) return false;
    const hT = t.h * (t.kind === 4 ? 1.1 : 1), half = (t.kind === 1 ? 0.35 : t.kind === 4 ? 0.75 : 0.55) * hT, gx = g.x / 1000, gy = g.y / 1000, foot = surf0[t.x];
    return Math.abs(gx - (t.x + 0.5)) < half && gy <= foot + 2.5 && gy >= foot - hT * 0.8;
  }
  const bushSprite = b => sprite(`bush:${b.x}:${b.v}`, 3, 2, 1.5, 1.7, (g, u) => { const r = seededR(b.x * 7 + b.v), sc = u / 120; g.scale(sc, sc);
    const greens = ["#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"];
    for (let i = 0; i < 5; i++) pad(g, Math.floor(r(i) * 8), (r(i + 10) - 0.5) * 110, -20 - 45 * r(i + 20) - (i > 2 ? 25 : 0), 0.4 + 0.18 * r(i + 30), 0.55 + 0.25 * r(i + 40), greens[Math.min(4, i)]);
    if (b.v === 2) { g.fillStyle = "#b91c1c"; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc((r(i + 50) - 0.5) * 120, -20 - 50 * r(i + 60), 5, 0, 7); g.fill(); } } });
  // (a felled tree: falling for a second, then a stump; a sapling grows, its picture drawn small)
  function drawTree(t, x, y) {
    const c = ctx;
    if (!t.alive) {
      const f = Math.min(1, (S.frame - t.fallAt) / 50);
      c.fillStyle = "#5e4630"; c.fillRect(x - 0.2 * T, y - 0.35 * T, 0.4 * T, 0.35 * T); c.fillStyle = "#d9b98a"; c.beginPath(); c.ellipse(x, y - 0.35 * T, 0.2 * T, 0.08 * T, 0, 0, 7); c.fill();
      c.strokeStyle = "#a8875e"; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 0.35 * T, 0.1 * T, 0.04 * T, 0, 0, 7); c.stroke();
      if (f < 1) { c.save(); c.translate(x, y - 0.35 * T); c.rotate((t.fallDir || 1) * f * Math.PI / 2); c.globalAlpha = 1 - f * 0.6; drawSprite(treeSprite(t), 0, 0.35 * T); c.restore(); }
      return; }
    const k = t.tall ? 1 : t.grow;
    t.open = (t.open || 0) + ((underTree(t) ? 1 : 0) - (t.open || 0)) * 0.12;
    if (t.open > 0.02 || t.kind === 4) { drawSprite(treeSprite(t, "back"), x, y, k); ctx.globalAlpha = 1 - 0.85 * t.open; }
    drawSprite(treeSprite(t, "front"), x, y, k); ctx.globalAlpha = 1;
  }
  // a mushroom on the land: a fly agaric (red, flecked white) or a bolete (brown, stout)
  function drawShroom(m, x, y) {
    const c = ctx, s0 = T * (0.7 + (m.x % 3) * 0.12);
    if (m.v === 0) { c.fillStyle = "#f3efe4"; c.beginPath(); c.moveTo(x - s0 * 0.08, y); c.lineTo(x - s0 * 0.06, y - s0 * 0.45); c.lineTo(x + s0 * 0.06, y - s0 * 0.45); c.lineTo(x + s0 * 0.1, y); c.fill();
      c.fillStyle = "#e9e1cf"; c.fillRect(x - s0 * 0.1, y - s0 * 0.3, s0 * 0.2, s0 * 0.04);
      c.fillStyle = "#c8321e"; c.beginPath(); c.ellipse(x, y - s0 * 0.45, s0 * 0.3, s0 * 0.2, 0, Math.PI, 0); c.fill();
      c.fillStyle = "rgba(0,0,0,0.18)"; c.beginPath(); c.ellipse(x, y - s0 * 0.46, s0 * 0.3, s0 * 0.05, 0, 0, Math.PI); c.fill();
      c.fillStyle = "#fffaf0"; for (const [dx, dy, r] of [[-0.15, -0.52, 0.035], [0.02, -0.6, 0.03], [0.16, -0.5, 0.03], [-0.04, -0.5, 0.025], [0.1, -0.56, 0.02]]) { c.beginPath(); c.arc(x + dx * s0, y + dy * s0, r * s0, 0, 7); c.fill(); } }
    else { c.fillStyle = "#e5d6b8"; c.beginPath(); c.ellipse(x, y - s0 * 0.16, s0 * 0.11, s0 * 0.17, 0, 0, 7); c.fill();
      c.fillStyle = "#7a4a26"; c.beginPath(); c.ellipse(x, y - s0 * 0.34, s0 * 0.22, s0 * 0.14, 0, Math.PI, 0); c.fill(); c.fillStyle = "#9a6438"; c.beginPath(); c.ellipse(x + s0 * 0.05, y - s0 * 0.4, s0 * 0.08, s0 * 0.04, 0, 0, 7); c.fill(); }
  }
  // a great tree: a wide leafy crown at the top of it (Dress Up's leafy tree, large), pads over each house, the trunk wide and
  // buttressed, furrowed, a curved limb out under each platform
  function greatSprite(G) {
    const maxLen = Math.max(...G.limbs.map(l => l.len)), w = G.half + maxLen + 8, hh = G.h * 1.3 + 2;
    return sprite(`great:${G.x}:${G.v}`, w * 2, hh + 1, w, hh, (g, u) => {
      // (Matthew: "top of tree still looks like multiple trunks, and crown isn't natural") its crown grows from its own trunk:
      // the trunk tapering up into five great limbs, each forking again and again (as Dress Up's trees fork), and leaf pads at
      // every tip, tree-sized, many of them, darker behind and lighter in front; a branch up from each platform's limb, pads
      // at its tips over the house
      const h = G.h * u, bw = (G.half + 0.75) * u, bark = "#6b4a2b", dk = "#45301c", r = seededR(G.v + 5), topY = -h * 0.78, topW = u * 1.4;
      const greens = ["#1f4f24", "#285e2a", "#2f7d32", "#3a8a3c", "#47a047", "#58b050"], limbs = [], tips = [];
      const fork = (x, y, a, len, wd, lvl, id) => { const bend = (r(id * 7 + 1) - 0.5) * 0.5, mx = x + Math.cos(a) * len * 0.5, my = y + Math.sin(a) * len * 0.5;
        const ex = mx + Math.cos(a + bend) * len * 0.5, ey = my + Math.sin(a + bend) * len * 0.5; limbs.push([[x, y], [mx, my], [ex, ey], wd, wd * 0.62]);
        if (lvl === 0) { tips.push([ex, ey]); return; }
        const n = 2 + (r(id * 7 + 2) > 0.5 ? 1 : 0);
        for (let k = 0; k < n; k++) fork(ex, ey, a + bend + (k - (n - 1) / 2) * (0.5 + 0.3 * r(id * 7 + 3 + k)), len * (0.62 + 0.16 * r(id * 11 + k)), wd * 0.62, lvl - 1, id * 3 + k + 1); };
      for (let k = 0; k < 5; k++) fork((k - 2) * u * 0.25, topY + u * 0.6, -Math.PI / 2 + (k - 2) * 0.48 + (r(k + 60) - 0.5) * 0.2, h * (0.2 + 0.05 * r(k + 70)), topW * 0.62, 3, k + 1);
      for (const L of G.limbs) { const ly = -L.y * u, ex = L.side * (G.half + L.len) * u; fork(ex * 0.62, ly - u * 0.2, -Math.PI / 2 + L.side * 0.35, u * 2.4, u * 0.3, 1, 200 + L.y); }
      const padAt = (x, y, sc, col, j) => { g.save(); g.translate(x, y); const k = u * sc / 200; g.scale(k * (r(j) < 0.5 ? -1 : 1), k); pad(g, Math.floor(r(j + 1) * 8), 0, 0, 1, 1, col); g.restore(); };
      tips.forEach(([x, y], i) => padAt(x + (r(i + 300) - 0.5) * u * 0.8, y - u * 0.2, 2.6 + r(i + 310), greens[Math.floor(r(i + 320) * 2)], i * 5 + 400));
      // (the trunk: buttresses flaring out over the ground, tapering up to where the crown's limbs leave it; the light to the east)
      g.fillStyle = bark; g.beginPath(); g.moveTo(-bw - 2.2 * u, u * 0.1); g.bezierCurveTo(-bw - 0.6 * u, -u * 0.1, -bw - 0.1 * u, -u * 0.6, -bw * 0.95, -u * 1.6);
      g.bezierCurveTo(-bw * 0.8, -h * 0.35, -topW * 0.9, -h * 0.6, -topW * 0.55, topY); g.lineTo(topW * 0.55, topY);
      g.bezierCurveTo(topW * 0.9, -h * 0.6, bw * 0.8, -h * 0.35, bw * 0.95, -u * 1.6); g.bezierCurveTo(bw + 0.1 * u, -u * 0.6, bw + 0.6 * u, -u * 0.1, bw + 2.2 * u, u * 0.1); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,240,220,0.08)"; g.beginPath(); g.moveTo(bw * 0.2, -u); g.bezierCurveTo(bw * 0.5, -h * 0.35, topW * 0.5, -h * 0.6, topW * 0.1, topY); g.lineTo(topW * 0.5, topY); g.bezierCurveTo(topW * 0.85, -h * 0.6, bw * 0.78, -h * 0.35, bw * 0.9, -u); g.fill();
      for (const [p0, p1, p2, w0, w1] of limbs) taper(g, p0, p1, p2, w0, w1, bark);
      g.strokeStyle = dk; g.globalAlpha = 0.5; g.lineWidth = Math.max(1, u / 14);
      for (let j = 0; j < 13; j++) { const f = j / 12 * 2 - 1; g.beginPath(); g.moveTo(f * (bw + 1.1 * u), u * 0.05); for (let k = 1; k <= 14; k++) { const y = topY * k / 14, wv = bw + (topW * 0.55 - bw) * k / 14; g.lineTo(f * wv + (r(j * 20 + k) - 0.5) * u * 0.1, y); } g.stroke(); }
      g.globalAlpha = 1;
      for (const L of G.limbs) { const ly = -L.y * u, ex = L.side * (G.half + L.len + 0.3) * u;
        taper(g, [L.side * bw * 0.4, ly + 1.6 * u], [ex * 0.45, ly + 0.9 * u], [ex, ly + 0.28 * u], u * 0.85, u * 0.3, bark); }
      tips.forEach(([x, y], i) => { padAt(x + (r(i + 500) - 0.5) * u * 1.2, y + u * 0.5, 2.1 + 0.8 * r(i + 510), greens[2 + Math.floor(r(i + 520) * 3)], i * 5 + 600);
        if (r(i + 530) < 0.5) padAt(x + (r(i + 540) - 0.5) * u * 1.6, y - u * 0.7, 1.7 + 0.6 * r(i + 550), greens[3 + Math.floor(r(i + 560) * 3)], i * 5 + 700); });
    });
  }
  // a tree house (one of the sixteen styles, World.styles), its floor at y, its middle at x
  // (Matthew: "tree houses should have interiors, and a way to go inside of them"; "no inside of tree houses?") Walking in
  // through its door, the gnome is inside: the house's front fades away, as a tree's does, and there is its room, paneled,
  // its window lit, a lamp, and its things (World.furnish), the kind of room its style says
  const HOUSE_ROOM = [10, 2, 12, 4, 1, 6, 11, 5, 2, 1, 4, 10, 5, 1, 12, 2];
  const insideHouse = H0 => { const g = S.g; return !!g && !H0.small && Math.abs(g.x / 1000 - (H0.x + 0.5)) < 1.8 && Math.abs(g.y / 1000 - H0.row) < 0.35; };
  function drawRoom(H0, x, y) {
    const c = ctx, s = T, st = S.styles[H0.style % S.styles.length], wall = st ? "#" + st.walls.toString(16).padStart(6, "0") : "#c9a26b", w = 3.8 * s, L = x - w / 2;
    c.fillStyle = mixHex(wall, "#2a1a0e", 0.35); c.fillRect(L, y - 2.5 * s, w, 2.5 * s);
    c.fillStyle = "rgba(0,0,0,0.12)"; for (let k = 1; k < 8; k++) c.fillRect(L + k * w / 8, y - 2.5 * s, Math.max(1, s / 30), 2.5 * s);
    c.fillStyle = "#7a5230"; c.fillRect(L, y - 0.08 * s, w, 0.08 * s);
    c.fillStyle = "#ffe8a8"; c.fillRect(x + 0.9 * s, y - 1.9 * s, 0.6 * s, 0.6 * s); c.strokeStyle = "#5e3d22"; c.lineWidth = Math.max(1, s / 16); c.strokeRect(x + 0.9 * s, y - 1.9 * s, 0.6 * s, 0.6 * s);
    c.save(); c.beginPath(); c.rect(L, y - 2.5 * s, w, 2.5 * s); c.clip();
    for (const t of H0.things || []) drawThing(t.kind, L - 0.1 * s + t.at / 10 * s, y, t.w / 10 * s);
    c.restore();
    c.strokeStyle = "#333"; c.lineWidth = Math.max(1, s / 24); c.beginPath(); c.moveTo(x, y - 2.5 * s); c.lineTo(x, y - 2.1 * s); c.stroke(); c.fillStyle = "#fde68a"; c.fillRect(x - 0.08 * s, y - 2.1 * s, 0.16 * s, 0.2 * s);
  }
  function drawHouse(H0, x, y) {
    const c = ctx, s = T, col = n => "#" + n.toString(16).padStart(6, "0");
    if (!H0.small) { H0.open = (H0.open || 0) + ((insideHouse(H0) ? 1 : 0) - (H0.open || 0)) * 0.15; if (H0.open > 0.02) drawRoom(H0, x, y); }
    if (H0.open > 0.02) c.globalAlpha = 1 - 0.9 * H0.open;
    drawHouseFront(H0, x, y, c, s, col); c.globalAlpha = 1;
  }
  function drawHouseFront(H0, x, y, c, s, col) {
    if (H0.small) {   // (a bird house on a post, or a squirrel's round house)
      c.fillStyle = H0.style === 100 ? "#c0703a" : "#8a6a4a"; c.fillRect(x - 0.35 * s, y - 0.8 * s, 0.7 * s, 0.7 * s);
      c.fillStyle = "#5a3a20"; c.beginPath(); c.moveTo(x - 0.5 * s, y - 0.8 * s); c.lineTo(x, y - 1.2 * s); c.lineTo(x + 0.5 * s, y - 0.8 * s); c.fill();
      c.fillStyle = "#1a1008"; c.beginPath(); c.arc(x, y - 0.5 * s, 0.13 * s, 0, 7); c.fill();
      if (H0.style === 101) { c.fillStyle = "#b5651d"; c.beginPath(); c.arc(x + 0.45 * s, y - 0.25 * s, 0.13 * s, 0, 7); c.fill(); }
      return; }
    const st = S.styles[H0.style % S.styles.length]; if (!st) return;
    const w = 3.8 * s, hh = 2.5 * s, L = x - w / 2, top0 = y - hh;
    // (the walls: shingles, in rows, the trim at the corners)
    c.fillStyle = col(st.walls); c.fillRect(L, top0, w, hh);
    c.fillStyle = "rgba(0,0,0,0.13)"; for (let yy = top0 + s * 0.3; yy < y; yy += s * 0.3) c.fillRect(L, yy, w, Math.max(1, s / 24));
    c.fillStyle = col(st.trim); c.fillRect(L, top0, s * 0.12, hh); c.fillRect(L + w - s * 0.12, top0, s * 0.12, hh); c.fillRect(L - s * 0.1, y - s * 0.12, w + s * 0.2, s * 0.12);
    // (the door, rounded at the top, and two windows)
    c.fillStyle = "#4a2e1a"; c.beginPath(); c.roundRect(x - 0.35 * s, y - 1.3 * s, 0.7 * s, 1.3 * s, [0.35 * s, 0.35 * s, 0, 0]); c.fill();
    c.fillStyle = "#f2c12e"; c.beginPath(); c.arc(x + 0.18 * s, y - 0.62 * s, 0.05 * s, 0, 7); c.fill();
    for (const sd of [-1, 1]) { const wx = x + sd * 1.15 * s, wy = y - 1.55 * s;
      c.fillStyle = "#ffe29a"; c.strokeStyle = col(st.trim); c.lineWidth = Math.max(1, s / 14);
      c.beginPath(); if (st.win === 1) c.arc(wx, wy, 0.33 * s, 0, 7); else if (st.win === 3) c.roundRect(wx - 0.3 * s, wy - 0.4 * s, 0.6 * s, 0.75 * s, [0.3 * s, 0.3 * s, 0, 0]); else c.rect(wx - 0.32 * s, wy - 0.32 * s, 0.64 * s, 0.64 * s); c.fill(); c.stroke();
      c.beginPath(); if (st.win === 2) { c.moveTo(wx - 0.32 * s, wy); c.lineTo(wx, wy - 0.32 * s); c.lineTo(wx + 0.32 * s, wy); c.lineTo(wx, wy + 0.32 * s); c.closePath(); } else { c.moveTo(wx - 0.3 * s, wy); c.lineTo(wx + 0.3 * s, wy); c.moveTo(wx, wy - 0.35 * s); c.lineTo(wx, wy + 0.35 * s); } c.stroke(); }
    // (the roof, of its kind: gables with rafter tails and braces, a hip, a cap, a cone, a dome, a shed roof, thatch)
    c.fillStyle = col(st.roofc); c.strokeStyle = "rgba(0,0,0,0.3)"; c.lineWidth = Math.max(1, s / 18);
    const R = st.roof, ov = 0.45 * s; c.beginPath();
    if (R === 0) { c.moveTo(L - ov, top0); c.lineTo(x, top0 - 1.2 * s); c.lineTo(L + w + ov, top0); }
    else if (R === 1) { c.moveTo(L - ov * 0.6, top0); c.lineTo(x, top0 - 2 * s); c.lineTo(L + w + ov * 0.6, top0); }
    else if (R === 2) { c.moveTo(L - ov, top0); c.lineTo(L + w * 0.3, top0 - 1.2 * s); c.lineTo(L + w * 0.7, top0 - 1.2 * s); c.lineTo(L + w + ov, top0); }
    else if (R === 3) { c.moveTo(L - ov * 1.4, top0 + 0.2 * s); c.bezierCurveTo(L - ov, top0 - 2.4 * s, L + w + ov, top0 - 2.4 * s, L + w + ov * 1.4, top0 + 0.2 * s); }
    else if (R === 4) { c.moveTo(L - ov, top0 + 0.1 * s); c.bezierCurveTo(L - ov, top0 - 1.6 * s, L + w + ov, top0 - 1.6 * s, L + w + ov, top0 + 0.1 * s); }
    else if (R === 5) { c.moveTo(L - ov, top0); c.lineTo(x, top0 - 2.6 * s); c.lineTo(L + w + ov, top0); }
    else if (R === 6) { c.moveTo(L, top0); c.arc(x, top0, w / 2, Math.PI, 0); }
    else if (R === 7) { c.moveTo(L - ov, top0 - 0.2 * s); c.lineTo(L + w + ov, top0 - 1.1 * s); c.lineTo(L + w + ov, top0); c.lineTo(L - ov, top0); }
    else { c.moveTo(L - ov * 1.3, top0 + 0.3 * s); c.quadraticCurveTo(x, top0 - 2.4 * s, L + w + ov * 1.3, top0 + 0.3 * s); }
    c.closePath(); c.fill(); c.stroke();
    if (R === 3) { c.fillStyle = "rgba(255,255,255,0.85)"; for (const [dx, dy, rr] of [[-0.9, -0.9, 0.22], [0.5, -1.2, 0.17], [1.2, -0.6, 0.14], [-0.1, -1.5, 0.12]]) { c.beginPath(); c.arc(x + dx * s, top0 + dy * s, rr * s, 0, 7); c.fill(); } }
    if (R === 4) { c.strokeStyle = "rgba(0,0,0,0.25)"; for (let j = -3; j <= 3; j++) { c.beginPath(); c.moveTo(x + j * 0.5 * s, top0); c.lineTo(x + j * 0.35 * s, top0 - 1.1 * s); c.stroke(); } c.fillStyle = col(st.roofc); c.fillRect(x - 0.06 * s, top0 - 1.6 * s, 0.12 * s, 0.4 * s); }
    if (R === 8) { c.strokeStyle = "rgba(90,70,20,0.5)"; for (let j = 0; j < 14; j++) { const xx = L - ov + j * (w + 2 * ov) / 13; c.beginPath(); c.moveTo(xx, top0 + 0.25 * s); c.lineTo(xx + 0.05 * s, top0 - 0.1 * s); c.stroke(); } }
    if (R <= 1) { c.fillStyle = col(st.trim); for (let j = 0; j < 4; j++) { c.fillRect(L - ov + j * 0.18 * s, top0 - 0.05 * s, 0.07 * s, 0.25 * s); c.fillRect(L + w + ov - j * 0.18 * s - 0.07 * s, top0 - 0.05 * s, 0.07 * s, 0.25 * s); }
      c.strokeStyle = col(st.trim); c.lineWidth = Math.max(1, s / 12); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(x + sd * w * 0.46, top0); c.lineTo(x + sd * w * 0.46, top0 + 0.35 * s); c.lineTo(x + sd * w * 0.3, top0); c.stroke(); } }
    // (its one thing more)
    const M = st.more; c.lineWidth = Math.max(1, s / 14);
    if (M === 1) { c.fillStyle = col(st.trim); for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(x + sd * 0.75 * s - 0.08 * s, y - 1.6 * s); c.lineTo(x + sd * 0.75 * s + 0.08 * s, y - 1.6 * s); c.lineTo(x + sd * 0.75 * s + 0.14 * s, y - 0.25 * s); c.lineTo(x + sd * 0.75 * s - 0.14 * s, y - 0.25 * s); c.fill(); c.fillStyle = "#8e8a80"; c.fillRect(x + sd * 0.75 * s - 0.18 * s, y - 0.25 * s, 0.36 * s, 0.25 * s); c.fillStyle = col(st.trim); } }
    else if (M === 2) { c.fillStyle = col(st.trim); c.fillRect(L - 0.5 * s, top0 + 0.6 * s, 0.5 * s, 0.1 * s); for (let j = 0; j < 4; j++) c.fillRect(L - 0.5 * s + j * 0.15 * s, top0 + 0.25 * s, 0.05 * s, 0.4 * s); c.fillRect(L - 0.5 * s, top0 + 0.25 * s, 0.5 * s, 0.06 * s); }
    else if (M === 3) { c.fillStyle = col(st.walls); c.fillRect(L + w - 0.5 * s, top0 - 1.6 * s, 0.8 * s, 1.6 * s); c.fillStyle = col(st.roofc); c.beginPath(); c.moveTo(L + w - 0.7 * s, top0 - 1.6 * s); c.lineTo(L + w - 0.1 * s, top0 - 2.7 * s); c.lineTo(L + w + 0.5 * s, top0 - 1.6 * s); c.fill(); c.fillStyle = "#ffe29a"; c.fillRect(L + w - 0.25 * s, top0 - 1.2 * s, 0.3 * s, 0.4 * s); }
    else if (M === 4) { c.fillStyle = "#8b4a3a"; c.fillRect(L + w * 0.72, top0 - 1.6 * s, 0.4 * s, 1.2 * s); }
    else if (M === 5) { c.fillStyle = col(st.walls); c.fillRect(x - 0.4 * s, top0 - 0.9 * s, 0.8 * s, 0.7 * s); c.fillStyle = "#ffe29a"; c.fillRect(x - 0.22 * s, top0 - 0.75 * s, 0.44 * s, 0.4 * s); c.fillStyle = col(st.roofc); c.beginPath(); c.moveTo(x - 0.55 * s, top0 - 0.9 * s); c.lineTo(x, top0 - 1.35 * s); c.lineTo(x + 0.55 * s, top0 - 0.9 * s); c.fill(); }
    else if (M === 6) { c.fillStyle = "#c8a032"; c.beginPath(); c.moveTo(x - 0.25 * s, top0 - 1.2 * s); c.quadraticCurveTo(x, top0 - 1.8 * s, x + 0.25 * s, top0 - 1.2 * s); c.fill(); }
    else if (M === 7) { c.strokeStyle = "#b8860b"; c.lineWidth = 0.16 * s; c.beginPath(); c.moveTo(x - 0.2 * s, top0 - 1.6 * s); c.lineTo(x + 0.9 * s, top0 - 2.4 * s); c.stroke(); }
    else if (M === 8) { for (const sd of [-1, 1]) { c.fillStyle = "#7a4a2a"; c.fillRect(x + sd * 1.15 * s - 0.4 * s, y - 1.15 * s, 0.8 * s, 0.15 * s); for (let j = 0; j < 3; j++) { c.fillStyle = ["#e85d75", "#f2c12e", "#e53935"][j]; c.beginPath(); c.arc(x + sd * 1.15 * s + (j - 1) * 0.25 * s, y - 1.2 * s, 0.09 * s, 0, 7); c.fill(); } } }
    else if (M === 9) { c.fillStyle = "#7a5230"; c.fillRect(L + w + 0.05 * s, y - 0.75 * s, 0.5 * s, 0.75 * s); c.fillStyle = "#4a3020"; c.fillRect(L + w + 0.05 * s, y - 0.55 * s, 0.5 * s, 0.06 * s); }
    else if (M === 10) { c.strokeStyle = "#333"; c.beginPath(); c.moveTo(x, top0 - (R === 1 ? 2 : 1.2) * s); c.lineTo(x, top0 - (R === 1 ? 2.6 : 1.8) * s); c.moveTo(x - 0.3 * s, top0 - (R === 1 ? 2.45 : 1.65) * s); c.lineTo(x + 0.3 * s, top0 - (R === 1 ? 2.45 : 1.65) * s); c.stroke(); }
    else if (M === 11) { c.fillStyle = "#e3b448"; for (let j = 0; j < 3; j++) { c.beginPath(); c.ellipse(L - 0.35 * s, y - 0.2 * s - j * 0.22 * s, (0.32 - j * 0.07) * s, 0.12 * s, 0, 0, 7); c.fill(); } }
  }
  // a thing in a room (World.furnish), its left edge at x, standing on the floor at y, w its width (all in pixels)
  function drawThing(k, x, y, w) {
    const c = ctx, s = T, m = x + w / 2;
    const box = (col, bx, by, bw, bh, rr = 0) => { c.fillStyle = col; c.beginPath(); c.roundRect(bx, by, bw, bh, rr); c.fill(); };
    const ell = (col, ex, ey, rx, ry) => { c.fillStyle = col; c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, 7); c.fill(); };
    const wood = "#8b5a2b", dark = "#5a3a1e";
    switch (k) {
      case 1: box(dark, x, y - 0.9 * s, 0.12 * s, 0.9 * s); box(dark, x + w - 0.12 * s, y - 0.6 * s, 0.12 * s, 0.6 * s); box("#e9e1d0", x + 0.1 * s, y - 0.55 * s, w - 0.2 * s, 0.25 * s, 3); box("#c0392b", x + 0.4 * s, y - 0.5 * s, w - 0.5 * s, 0.22 * s, 3); ell("#fff", x + 0.3 * s, y - 0.62 * s, 0.22 * s, 0.1 * s); box(wood, x, y - 0.3 * s, w, 0.12 * s); break;
      case 2: box(wood, x, y - 0.8 * s, w, 0.1 * s); box(dark, x + 0.1 * s, y - 0.7 * s, 0.08 * s, 0.7 * s); box(dark, x + w - 0.18 * s, y - 0.7 * s, 0.08 * s, 0.7 * s); ell("#e9e1d0", m, y - 0.86 * s, 0.18 * s, 0.05 * s); break;
      case 3: box(dark, x + 0.05 * s, y - 1.05 * s, 0.07 * s, 1.05 * s); box(wood, x, y - 0.5 * s, w, 0.08 * s); box(dark, x + w - 0.1 * s, y - 0.45 * s, 0.07 * s, 0.45 * s); break;
      case 4: box("#7d7068", x, y - 2.2 * s, w, 2.2 * s); box("#5a4f48", x - 0.1 * s, y - 1.5 * s, w + 0.2 * s, 0.14 * s); box("#1a120c", x + 0.25 * s, y - 1.25 * s, w - 0.5 * s, 1.25 * s, [0.4 * s, 0.4 * s, 0, 0]);
        { const f = Math.sin(S.frame / 4) * 0.08 * s; ell("#f59e0b", m, y - 0.35 * s, 0.32 * s, 0.32 * s + f); ell("#fde047", m, y - 0.25 * s, 0.16 * s, 0.2 * s - f / 2); } break;
      case 5: box("#2d2d2d", x, y - 1.1 * s, w, 1.1 * s, 3); box("#444", x - 0.05 * s, y - 1.15 * s, w + 0.1 * s, 0.1 * s); box("#c2410c", x + 0.2 * s, y - 0.6 * s, 0.35 * s, 0.25 * s); box("#888", x + w * 0.6, y - 1.35 * s, 0.3 * s, 0.22 * s, 2); break;
      case 6: { const sy = y - 2.4 * s; box(wood, x, sy, w, 0.08 * s); box(wood, x, sy + 0.7 * s, w, 0.08 * s); for (let j = 0; j < Math.floor(w / (0.3 * s)); j++) { box(["#d97706", "#65a30d", "#b91c1c", "#e5e7eb"][j % 4], x + 0.08 * s + j * 0.3 * s, sy - 0.32 * s, 0.2 * s, 0.32 * s, 2); box(["#92400e", "#e5e7eb", "#4d7c0f"][j % 3], x + 0.1 * s + j * 0.3 * s, sy + 0.4 * s, 0.18 * s, 0.3 * s, 2); } break; }
      case 7: box("#8b5a2b", x, y - 1 * s, w, 1 * s, 0.25 * s); box("#555", x, y - 0.8 * s, w, 0.06 * s); box("#555", x, y - 0.25 * s, w, 0.06 * s); break;
      case 8: box("#6b4a2b", m - 0.25 * s, y - 0.45 * s, 0.5 * s, 0.45 * s); c.fillStyle = "#3a3a3a"; c.beginPath(); c.moveTo(x, y - 0.65 * s); c.lineTo(x + w, y - 0.65 * s); c.lineTo(x + w - 0.2 * s, y - 0.45 * s); c.lineTo(x + 0.2 * s, y - 0.45 * s); c.fill(); break;
      case 9: c.fillStyle = "#7a4a2a"; c.beginPath(); c.moveTo(x, y - 0.3 * s); c.lineTo(x + w, y - 0.55 * s); c.lineTo(x + w, y - 0.15 * s); c.closePath(); c.fill(); box("#3a2a1a", x + w - 0.1 * s, y - 0.5 * s, 0.2 * s, 0.4 * s); break;
      case 10: box(wood, x, y - 0.9 * s, w, 0.12 * s); box(dark, x + 0.1 * s, y - 0.8 * s, 0.1 * s, 0.8 * s); box(dark, x + w - 0.2 * s, y - 0.8 * s, 0.1 * s, 0.8 * s); box("#777", x + 0.3 * s, y - 1.15 * s, 0.5 * s, 0.08 * s); box("#a0522d", x + 0.3 * s, y - 1.12 * s, 0.12 * s, 0.25 * s);
        c.strokeStyle = "#555"; c.lineWidth = Math.max(1, s / 16); for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(x + w * 0.5 + j * 0.2 * s, y - 2.2 * s); c.lineTo(x + w * 0.5 + j * 0.2 * s, y - 1.7 * s); c.stroke(); } break;
      case 11: box(dark, x, y - 2.4 * s, w, 2.4 * s); for (let r = 0; r < 4; r++) for (let j = 0; j < Math.floor(w / (0.13 * s)) - 1; j++) box(["#b91c1c", "#1d4ed8", "#15803d", "#a16207", "#7e22ce"][(r * 3 + j) % 5], x + 0.08 * s + j * 0.13 * s, y - 2.3 * s + r * 0.58 * s, 0.1 * s, 0.45 * s); break;
      case 12: box(wood, x, y - 0.85 * s, w, 0.1 * s); box(dark, x + 0.05 * s, y - 0.75 * s, 0.4 * s, 0.75 * s); box(dark, x + w - 0.12 * s, y - 0.75 * s, 0.08 * s, 0.75 * s); box("#f5f0e1", x + w - 0.4 * s, y - 1.05 * s, 0.08 * s, 0.2 * s); ell("#fde047", x + w - 0.36 * s, y - 1.12 * s, 0.05 * s, 0.08 * s); box("#e9e1d0", x + 0.5 * s, y - 0.9 * s, 0.4 * s, 0.05 * s); break;
      case 13: c.fillStyle = "#9a6a3a"; c.beginPath(); c.moveTo(x, y - 0.8 * s); c.lineTo(x + w, y - 0.8 * s); c.lineTo(x + w - 0.15 * s, y); c.lineTo(x + 0.15 * s, y); c.fill(); box("#7dd3fc", x + 0.05 * s, y - 0.75 * s, w - 0.1 * s, 0.1 * s); box("#555", x, y - 0.55 * s, w, 0.05 * s); break;
      case 14: box("#3f6212", m - 0.12 * s, y - 1.3 * s, 0.24 * s, 1.3 * s); box("#4d7c0f", m - 0.2 * s, y - 1.35 * s, 0.4 * s, 0.1 * s); c.strokeStyle = "#3f6212"; c.lineWidth = 0.08 * s; c.beginPath(); c.moveTo(m, y - 1.25 * s); c.lineTo(m + 0.45 * s, y - 1.55 * s); c.stroke(); box("#3f6212", m + 0.1 * s, y - 1.0 * s, 0.25 * s, 0.08 * s); break;
      case 15: box(wood, x, y - 1 * s, w, 0.1 * s); box(dark, x + 0.08 * s, y - 0.9 * s, 0.08 * s, 0.9 * s); box(dark, x + w - 0.16 * s, y - 0.9 * s, 0.08 * s, 0.9 * s); ell("#e5e7eb", m, y - 1.08 * s, 0.25 * s, 0.08 * s); box("#94a3b8", m - 0.25 * s, y - 1.9 * s, 0.5 * s, 0.6 * s, 0.25 * s); break;
      case 16: box("#5a3a1e", x, y - 0.4 * s, w, 0.4 * s); for (let j = 0; j < Math.floor(w / (0.25 * s)); j++) { const mx = x + 0.15 * s + j * 0.25 * s; box("#f5f0e1", mx - 0.03 * s, y - 0.6 * s, 0.06 * s, 0.2 * s); ell(j % 2 ? "#c2410c" : "#e8d9b5", mx, y - 0.62 * s, 0.12 * s, 0.06 * s); } break;
      case 17: box(wood, x, y - 2 * s, 0.1 * s, 2 * s); box(wood, x + w - 0.1 * s, y - 2 * s, 0.1 * s, 2 * s); box(wood, x, y - 2 * s, w, 0.1 * s); box(wood, x, y - 0.9 * s, w, 0.1 * s);
        c.strokeStyle = "#d4a373"; c.lineWidth = Math.max(1, s / 30); for (let j = 1; j < 10; j++) { c.beginPath(); c.moveTo(x + j * w / 10, y - 1.9 * s); c.lineTo(x + j * w / 10, y - 0.9 * s); c.stroke(); } box("#b45309", x + 0.15 * s, y - 1.5 * s, w - 0.3 * s, 0.4 * s); break;
      case 18: c.strokeStyle = wood; c.lineWidth = 0.08 * s; c.beginPath(); c.arc(x + w * 0.6, y - 0.85 * s, 0.42 * s, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x + w * 0.6, y - 0.85 * s); c.lineTo(x + w * 0.6, y); c.moveTo(x, y); c.lineTo(x + 0.3 * s, y - 0.6 * s); c.stroke();
        c.save(); c.translate(x + w * 0.6, y - 0.85 * s); c.rotate(S.frame / 20); c.lineWidth = Math.max(1, s / 24); c.beginPath(); for (let j = 0; j < 4; j++) { c.moveTo(0, 0); c.lineTo(Math.cos(j * 0.8) * 0.4 * s, Math.sin(j * 0.8) * 0.4 * s); } c.stroke(); c.restore(); box("#f5f0e1", x + 0.15 * s, y - 0.95 * s, 0.2 * s, 0.25 * s, 3); break;
      case 19: box("#9a6a3a", m - 0.22 * s, y - 0.9 * s, 0.44 * s, 0.9 * s, 0.1 * s); box(dark, m - 0.03 * s, y - 1.3 * s, 0.06 * s, 0.4 * s); break;
      case 20: box(dark, x, y - 2.6 * s, w, 2.6 * s, 0.15 * s); ell("#f5f0e1", m, y - 2.15 * s, w * 0.35, w * 0.35); c.strokeStyle = "#333"; c.lineWidth = Math.max(1, s / 24); c.beginPath(); c.moveTo(m, y - 2.15 * s); c.lineTo(m, y - 2.3 * s); c.moveTo(m, y - 2.15 * s); c.lineTo(m + 0.1 * s, y - 2.15 * s); c.stroke();
        { const a = Math.sin(S.frame / 30) * 0.35; c.strokeStyle = "#c8a032"; c.lineWidth = Math.max(1, s / 20); c.beginPath(); c.moveTo(m, y - 1.7 * s); c.lineTo(m + Math.sin(a) * 0.8 * s, y - 1.7 * s + Math.cos(a) * 0.8 * s); c.stroke(); ell("#c8a032", m + Math.sin(a) * 0.8 * s, y - 1.7 * s + Math.cos(a) * 0.8 * s, 0.1 * s, 0.1 * s); } break;
      case 21: { const a = Math.sin(S.frame / 40) * 0.06; c.save(); c.translate(m, y); c.rotate(a); box(wood, -w / 2, -0.55 * s, w, 0.08 * s); box(dark, w / 2 - 0.12 * s, -1.2 * s, 0.08 * s, 0.7 * s); c.strokeStyle = dark; c.lineWidth = 0.07 * s; c.beginPath(); c.moveTo(-w / 2, -0.05 * s); c.quadraticCurveTo(0, 0.12 * s, w / 2, -0.05 * s); c.stroke(); box(dark, -w / 2 + 0.1 * s, -0.5 * s, 0.07 * s, 0.45 * s); c.restore(); break; }
      case 22: box("#a16207", x, y - 1.3 * s, w, 1.3 * s, 3); box("#ca8a04", x + 0.08 * s, y - 1.2 * s, w - 0.16 * s, 0.5 * s, 2); box("#bfe3f5", x + 0.15 * s, y - 1.15 * s, w - 0.3 * s, 0.3 * s, 2); box("#888", x + w - 0.2 * s, y - 0.6 * s, 0.08 * s, 0.2 * s); break;
      case 23: box("#9f1239", x, y - 0.06 * s, w, 0.06 * s); box("#f59e0b", x + 0.2 * s, y - 0.06 * s, w - 0.4 * s, 0.03 * s); break;
      case 25: c.fillStyle = "#c9a26b"; c.beginPath(); c.moveTo(x, y - 0.8 * s); c.quadraticCurveTo(m, y + 0.1 * s, x + w, y - 0.8 * s); c.lineTo(x + w - 0.1 * s, y - 0.35 * s); c.lineTo(x + 0.1 * s, y - 0.35 * s); c.fill(); box("#bae6fd", x + 0.15 * s, y - 0.75 * s, w - 0.3 * s, 0.2 * s, 3); break;
      case 26: box("#7a4a2a", x, y - 0.7 * s, w, 0.7 * s, 3); box("#5a3a1e", x, y - 0.7 * s, w, 0.2 * s, 3); box("#c8a032", m - 0.06 * s, y - 0.55 * s, 0.12 * s, 0.15 * s); break;
      case 27: box("#8e8a80", x, y - 1 * s, w, 1 * s, 0.1 * s); c.fillStyle = "rgba(0,0,0,0.2)"; for (let j = 0; j < 3; j++) c.fillRect(x, y - 0.33 * s * (j + 1), w, Math.max(1, s / 20)); box(dark, x + 0.1 * s, y - 2.1 * s, 0.1 * s, 1.1 * s); box(dark, x + w - 0.2 * s, y - 2.1 * s, 0.1 * s, 1.1 * s); box(dark, x + 0.1 * s, y - 2.1 * s, w - 0.2 * s, 0.1 * s);
        box("#6b6b6b", m - 0.15 * s, y - 1.75 * s + Math.sin(S.frame / 50) * 0.2 * s, 0.3 * s, 0.3 * s, 2); break;
      case 28: box("#b45309", m - 0.25 * s, y - 0.45 * s, 0.5 * s, 0.45 * s, [0, 0, 0.1 * s, 0.1 * s]); c.strokeStyle = "#15803d"; c.lineWidth = 0.08 * s; for (let j = -2; j <= 2; j++) { c.beginPath(); c.moveTo(m, y - 0.45 * s); c.quadraticCurveTo(m + j * 0.25 * s, y - 1.2 * s, m + j * 0.38 * s, y - 0.8 * s); c.stroke(); } break;
      case 29: box("#7c2d12", x, y - 2.6 * s, w, 1.3 * s); box("#f59e0b", x + 0.1 * s, y - 2.5 * s, w - 0.2 * s, 1.1 * s); ell("#15803d", m, y - 2 * s, w * 0.3, 0.3 * s); box(dark, x - 0.05 * s, y - 2.65 * s, w + 0.1 * s, 0.08 * s); break;
      case 30: box(wood, x, y - 0.8 * s, w, 0.12 * s); for (const f of [0.1, 0.5, 0.88]) box(dark, x + w * f - 0.05 * s, y - 0.7 * s, 0.1 * s, 0.7 * s); box(dark, x + 0.1 * s, y - 0.4 * s, w - 0.2 * s, 0.08 * s);
        for (let j = 0; j < Math.floor(w / (0.6 * s)); j++) { ell("#e9e1d0", x + 0.4 * s + j * 0.6 * s, y - 0.86 * s, 0.17 * s, 0.05 * s); } break;
      case 31: box("#8e8a80", x, y - 0.9 * s, w, 0.9 * s, 2); box("#6b6b6b", x + 0.1 * s, y - 0.85 * s, w - 0.2 * s, 0.25 * s, 2); box("#9a6a3a", x + w - 0.45 * s, y - 1.25 * s, 0.35 * s, 0.35 * s, 2); break;
      case 32: c.strokeStyle = "#7a7a7a"; c.lineWidth = 0.18 * s; c.beginPath(); c.arc(m, y - 0.75 * s, 0.35 * s, 0, 7); c.stroke(); box(dark, x, y - 0.5 * s, w, 0.08 * s); box(dark, x + 0.05 * s, y - 0.45 * s, 0.08 * s, 0.45 * s); box(dark, x + w - 0.13 * s, y - 0.45 * s, 0.08 * s, 0.45 * s); break;
      case 33: box(dark, m - 0.05 * s, y - 0.7 * s, 0.1 * s, 0.7 * s); ell("#2563eb", m, y - 0.95 * s, 0.25 * s, 0.25 * s); ell("#16a34a", m - 0.05 * s, y - 1 * s, 0.1 * s, 0.13 * s); break;
      case 34: c.strokeStyle = "#333"; c.lineWidth = Math.max(1, s / 20); c.beginPath(); c.moveTo(m, y - 1.4 * s); c.lineTo(m, y - 0.95 * s); c.stroke(); ell("#2d2d2d", m, y - 0.75 * s, 0.3 * s, 0.24 * s); ell("#f59e0b", m, y - 0.2 * s, 0.25 * s, 0.18 * s); break;
      case 35: box(dark, x, y - 2.2 * s, w, 0.08 * s); for (let j = 0; j < 3; j++) box(["#166534", "#7c2d12", "#1e3a8a"][j], x + 0.1 * s + j * 0.28 * s, y - 2.15 * s, 0.24 * s, 0.9 * s, [0, 0, 0.1 * s, 0.1 * s]); break;
      case 36: box(dark, x, y - 2.2 * s, 0.1 * s, 2.2 * s); box(dark, x + w - 0.1 * s, y - 2.2 * s, 0.1 * s, 2.2 * s); for (const yy of [0.35, 1.35]) { box(wood, x, y - yy * s, w, 0.1 * s); box("#1d4ed8", x + 0.2 * s, y - (yy + 0.22) * s, w - 0.3 * s, 0.2 * s, 3); ell("#fff", x + 0.3 * s, y - (yy + 0.28) * s, 0.18 * s, 0.08 * s); } break;
    }
  }
  // (Matthew: "the interior of the beaver dams' house structures should be shown", with a cutaway of a lodge) A lodge in
  // cutaway, as the world is: a dome of sticks and mud on the river's bed (or on the bank), stones round its foot; inside, its
  // chamber, dry, just above the water: the feeding floor, peeled sticks on it, and the nest, higher, its bedding of shredded
  // wood; two tunnels from the floor down through the base to the entrances under the water; the air vent at the top, where
  // the sticks are loose; and the beavers resting in it, curled up asleep
  function drawLodge(L, s) {
    const c = ctx, R = L.river, mid = L.x + L.w / 2, k = Math.floor(mid) - R.x, inCh = k >= 0 && k < R.w;
    const base = inCh ? R.bed[k] : surf0[Math.max(0, Math.min(WW - 1, Math.floor(mid)))], lvl = R.level, r = seededR(L.x * 7 + 3);
    const cx = mid * s, by = base * s, W = (L.w / 2 + 1.1) * s, topY = (Math.min(lvl, base) - 3.3) * s, ry = by - topY;
    const dome = () => { c.beginPath(); c.moveTo(cx - W, by); c.bezierCurveTo(cx - W, by - ry * 0.75, cx - W * 0.55, topY, cx, topY); c.bezierCurveTo(cx + W * 0.55, topY, cx + W, by - ry * 0.75, cx + W, by); c.closePath(); };
    // (the mass: mud packed among the sticks)
    c.fillStyle = "#5e4128"; dome(); c.fill();
    c.save(); dome(); c.clip();
    c.lineCap = "round";
    for (let j = 0; j < 140; j++) { const a = r(j) * Math.PI, d = 0.55 + 0.45 * r(j + 300), x = cx + Math.cos(a) * W * d * (r(j + 600) < 0.5 ? -1 : 1), y = by - Math.sin(a) * ry * d * (0.4 + 0.6 * r(j + 900)) + (r(j + 1200) - 0.5) * s * 0.3;
      const ang = (r(j + 1500) - 0.5) * 2.4, len = s * (0.4 + 0.7 * r(j + 1800));
      c.strokeStyle = ["#8a6440", "#a07a4a", "#6b4a2b", "#c4a274", "#4a3220"][j % 5]; c.lineWidth = Math.max(1, s * (0.05 + 0.05 * r(j + 2100)));
      c.beginPath(); c.moveTo(x - Math.cos(ang) * len / 2, y - Math.sin(ang) * len / 2); c.lineTo(x + Math.cos(ang) * len / 2, y + Math.sin(ang) * len / 2); c.stroke(); }
    // (the chamber: a dry room just above the water, its floor a little over the waterline; the nest higher, to the east)
    const fy = (lvl - 0.15) * s, chH = Math.min(1.7 * s, (fy - topY) * 0.66), chW = W * 0.62;
    c.fillStyle = "#24170d"; c.beginPath(); c.moveTo(cx - chW, fy); c.bezierCurveTo(cx - chW, fy - chH * 0.9, cx - chW * 0.4, fy - chH * 1.1, cx + chW * 0.1, fy - chH); c.bezierCurveTo(cx + chW * 0.7, fy - chH * 1.15, cx + chW * 1.05, fy - chH * 0.8, cx + chW, fy - s * 0.25); c.lineTo(cx + chW * 0.3, fy - s * 0.25); c.lineTo(cx + chW * 0.25, fy); c.closePath(); c.fill();
    c.fillStyle = "#4a3220"; c.fillRect(cx - chW, fy - s * 0.06, chW * 1.25, s * 0.1); c.fillRect(cx + chW * 0.25, fy - s * 0.31, chW * 0.75, s * 0.1);
    c.strokeStyle = "#d8c48a"; c.lineWidth = Math.max(1, s / 28); c.beginPath();
    for (let j = 0; j < 26; j++) { const x = cx + chW * (0.3 + 0.65 * r(j + 2400)), y = fy - s * (0.32 + 0.12 * r(j + 2500)); c.moveTo(x, y); c.lineTo(x + s * (r(j + 2600) - 0.5) * 0.4, y - s * 0.04 * r(j + 2700)); } c.stroke();
    c.strokeStyle = "#e8d8b0"; c.lineWidth = Math.max(1, s / 16); c.beginPath(); for (let j = 0; j < 3; j++) { const x = cx - chW * (0.8 - 0.25 * j); c.moveTo(x, fy - s * 0.1); c.lineTo(x + s * 0.35, fy - s * 0.14); } c.stroke();
    // (two tunnels down from the floor, through the base, to the entrances under the water)
    c.strokeStyle = "#1b2833"; c.lineWidth = s * 0.42;
    for (const [x0, x1] of [[cx - chW * 0.55, cx - W * 0.85], [cx - chW * 0.1, cx + W * 0.2]]) { c.beginPath(); c.moveTo(x0, fy - s * 0.05); c.quadraticCurveTo((x0 + x1) / 2, fy + (by - fy) * 0.35, x1, by - s * 0.35); c.stroke(); }
    // (the air vent, loose sticks at the top)
    c.strokeStyle = "rgba(255,240,210,0.25)"; c.lineWidth = Math.max(1, s / 20); c.beginPath(); for (let j = 0; j < 5; j++) { const x = cx + (j - 2) * s * 0.12; c.moveTo(x, topY + s * 0.1); c.lineTo(x + s * 0.05, topY + s * 0.5); } c.stroke();
    // (the beavers resting, curled up asleep in the nest)
    let n = 0;
    for (const B of S.beavers) { if (B.b.job !== 0 || Math.abs(B.b.lodge - mid) > 4) continue; const x = cx + chW * (0.45 + 0.22 * n) - (n > 1 ? chW * 0.9 : 0), y = fy - s * (n > 1 ? 0.12 : 0.36); n++;
      c.fillStyle = "#3b2a1e"; c.beginPath(); c.ellipse(x - s * 0.2, y - s * 0.05, s * 0.2, s * 0.07, -0.4, 0, 7); c.fill();
      c.fillStyle = "#7a4a28"; c.beginPath(); c.ellipse(x, y - s * 0.17, s * 0.3, s * 0.18, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + s * 0.24, y - s * 0.12, s * 0.13, s * 0.1, 0, 0, 7); c.fill();
      c.strokeStyle = "#1a1008"; c.lineWidth = Math.max(1, s / 30); c.beginPath(); c.arc(x + s * 0.27, y - s * 0.15, s * 0.03, 0.2, Math.PI - 0.2); c.stroke();
      if (Math.floor(performance.now() / 900 + n) % 3 === 0) { c.fillStyle = "rgba(255,255,255,0.7)"; c.font = `${Math.round(0.28 * s)}px sans-serif`; c.fillText("z", x + s * 0.3, y - s * 0.45); } }
    c.restore();
    c.strokeStyle = "#3a2818"; c.lineWidth = Math.max(1, s / 14); dome(); c.stroke();
    // (stones round its foot)
    for (let j = 0; j < 7; j++) { c.fillStyle = ["#8a8580", "#a39e98", "#6f6a66"][j % 3]; c.beginPath(); c.ellipse(cx - W + (j + 0.5) * W * 2 / 7, by - s * 0.08, s * (0.18 + 0.1 * r(j + 3000)), s * 0.12, 0, 0, 7); c.fill(); }
  }
  function drawBeaver(B, x, y, swimming) {
    const c = ctx, s = T, f = B.b.face || 1, job = B.b.job;
    if (job === 0) return;   // (in the lodge, resting: drawn there, drawLodge)
    c.save(); c.translate(x, y); c.scale(f, 1);
    const bob = job === 2 ? Math.sin(S.frame / 3) * 0.05 * s : 0;
    c.fillStyle = "#3b2a1e"; c.beginPath(); c.ellipse(-0.55 * s, -0.1 * s, 0.32 * s, 0.11 * s, -0.2, 0, 7); c.fill();   // (the tail, flat)
    c.fillStyle = "#7a4a28"; c.beginPath(); c.ellipse(0, -0.3 * s, 0.42 * s, 0.28 * s, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(0.38 * s, -0.42 * s + bob, 0.2 * s, 0.17 * s, 0, 0, 7); c.fill();
    c.fillStyle = "#1a1008"; c.beginPath(); c.arc(0.45 * s, -0.48 * s + bob, 0.035 * s, 0, 7); c.fill(); c.beginPath(); c.arc(0.57 * s, -0.42 * s + bob, 0.04 * s, 0, 7); c.fill();
    c.fillStyle = "#fde68a"; c.fillRect(0.5 * s, -0.36 * s + bob, 0.06 * s, 0.08 * s);
    c.fillStyle = "#5a3a1e"; c.beginPath(); c.arc(0.28 * s, -0.58 * s + bob, 0.06 * s, 0, 7); c.fill();
    if (!swimming) { c.fillStyle = "#5a3a1e"; c.fillRect(-0.2 * s, -0.1 * s, 0.1 * s, 0.12 * s); c.fillRect(0.2 * s, -0.1 * s, 0.1 * s, 0.12 * s); }
    if (job === 3) { c.fillStyle = "#8b5a2b"; c.beginPath(); c.roundRect(-1.4 * s, -0.55 * s, 1.9 * s, 0.22 * s, 0.1 * s); c.fill(); c.fillStyle = "#d9b98a"; c.beginPath(); c.ellipse(-1.4 * s, -0.44 * s, 0.06 * s, 0.11 * s, 0, 0, 7); c.fill(); }
    c.restore();
  }
  function draw() {
    fit();
    const now = performance.now(), W = cv.width, Hh = cv.height, s = T, g = S.g;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!g) { ctx.fillStyle = "#8cc4ec"; ctx.fillRect(0, 0, W, Hh); return; }
    // (the camera: smoothly after the gnome, a little ahead the way it faces, kept inside the world)
    const gx = g.x / 1000, gy = g.y / 1000 - 0.45, tx = gx + g.face * 1.2 - VW / 2, ty = gy - VH / 2;
    if (!S.cam.set) { S.cam.x = tx; S.cam.y = ty; S.cam.set = true; }
    S.cam.x += (tx - S.cam.x) * 0.12; S.cam.y += (ty - S.cam.y) * 0.12;
    S.cam.x = Math.max(0, Math.min(WW - VW, S.cam.x)); S.cam.y = Math.max(0, Math.min(WH - VH, S.cam.y));
    const camX = Math.round(S.cam.x * s) / s, camY = Math.round(S.cam.y * s) / s;
    const c0 = Math.max(0, Math.floor(camX) - 1), c1 = Math.min(WW - 1, Math.ceil(camX + VW) + 1), r0 = Math.max(0, Math.floor(camY) - 1), r1 = Math.min(WH - 1, Math.ceil(camY + VH) + 1);
    // the sky, the sun, far hills (slower, behind), clouds
    const sk = ctx.createLinearGradient(0, 0, 0, Hh); sk.addColorStop(0, "#5fa8e0"); sk.addColorStop(1, "#cfe9f7"); ctx.fillStyle = sk; ctx.fillRect(0, 0, W, Hh);
    const skyY = y => (y - camY) * s;
    ctx.fillStyle = "#fff6c2"; ctx.beginPath(); ctx.arc(W * 0.82, skyY(6) * 0.4 + s * 2, s * 1.4, 0, 7); ctx.fill();
    for (const [par, col, amp, base] of [[0.25, "#a8c8a0", 4, 33], [0.5, "#86b07a", 3, 36]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, Hh);
      for (let px = 0; px <= W + 8; px += 8) { const wx = (px / s + camX * par); ctx.lineTo(px, (base - amp * (Math.sin(wx / 9) * 0.6 + Math.sin(wx / 23 + 1) * 0.8) - camY * (1 - par) - camY * par) * s); }
      ctx.lineTo(W, Hh); ctx.fill(); }
    for (let k = 0; k < 9; k++) { const cx = ((k * 61 + now / 900) % (WW * 0.6)) * 1.6 - camX * 0.35 * s / s; const x = (cx - camX * 0.0) * s * 0.5 + ((k * 137) % W), y = skyY(4 + (k * 7) % 12) * 0.6 + s;
      ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.beginPath(); ctx.ellipse(((x % (W + 400)) + W + 400) % (W + 400) - 200, y, s * 1.6, s * 0.45, 0, 0, 7); ctx.fill(); }
    ctx.save(); ctx.translate(-camX * s, -camY * s);
    // above the land: the trees, bushes and mushrooms (painted once, sprites), then the great trees over them
    for (const t of S.trees) if (t.x >= c0 - 9 && t.x <= c1 + 9) drawTree(t, (t.x + 0.5) * s, surf0[t.x] * s);
    for (const b of S.bushes) if (b.x >= c0 - 2 && b.x <= c1 + 2) drawSprite(bushSprite(b), (b.x + 0.5) * s, surf0[b.x] * s);
    for (const m of S.shrooms) if (m.x >= c0 - 1 && m.x <= c1 + 1) drawShroom(m, (m.x + 0.5) * s, surf0[m.x] * s);
    for (const G of S.greats) { if (G.x + 22 < c0 || G.x - 22 > c1) continue; const x = (G.x + 0.5) * s, y = G.foot * s;
      drawSprite(greatSprite(G), x, y);
      if (G.kind === 31) {   // (the stair inside: the trunk cut away, a winding stair round a post, a door to each limb)
        const top0 = y - (Math.max(...G.limbs.map(l => l.y)) + 1.2) * s, iw = (G.half + 0.2) * 2 * s * 0.75;
        ctx.fillStyle = "#24160c"; ctx.beginPath(); ctx.roundRect(x - iw / 2, top0, iw, y - top0, [iw / 2, iw / 2, 0, 0]); ctx.fill();
        ctx.strokeStyle = "#5e3d22"; ctx.lineWidth = Math.max(2, s / 8); ctx.stroke();
        ctx.fillStyle = "#5e3d22"; ctx.fillRect(x - 0.12 * s, top0 + 0.3 * s, 0.24 * s, y - top0 - 0.3 * s);
        for (let yy = y - 0.5 * s, j = 0; yy > top0 + 0.4 * s; yy -= 0.5 * s, j++) { const a = j * 0.9, sx = Math.sin(a); ctx.fillStyle = Math.cos(a) > 0 ? "#b07a48" : "#7a5230";
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + sx * iw * 0.46, yy - 0.12 * s); ctx.lineTo(x + sx * iw * 0.46, yy + 0.02 * s); ctx.lineTo(x, yy + 0.12 * s); ctx.fill(); }
        for (const L of G.limbs) { const ly = y - L.y * s; ctx.fillStyle = "#4a2e1a"; ctx.beginPath(); ctx.roundRect(x + L.side * (iw / 2) - (L.side > 0 ? 0 : 0.35 * s), ly - 1 * s, 0.35 * s, 1 * s, [0.15 * s, 0.15 * s, 0, 0]); ctx.fill(); } }
    }
    // the ground, as Gnome dig paints it: each kind flat, darker deeper, a fleck or two, its own faint marks
    const dk = new Path2D(), lt = new Path2D(), ln = new Path2D(), sp = Math.max(1, s * 0.08);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const m = mat[at(c, r)]; if (m < SOIL || m > GRANITE) continue;
      const x = c * s, y = r * s, hsh = (c * 73 + r * 151) % 97;
      ctx.fillStyle = groundCol(m, r - surf0[c]); ctx.fillRect(x, y, s + 0.5, s + 0.5);
      dk.rect(x + s * (0.15 + (hsh % 5) * 0.03), y + s * 0.3, sp, sp); dk.rect(x + s * 0.65, y + s * (0.6 + (hsh % 3) * 0.08), sp, sp);
      if (m === SAND) { lt.rect(x + s * 0.4, y + s * 0.15, sp * 1.3, sp); dk.rect(x + s * 0.8, y + s * 0.45, sp * 1.2, sp * 1.2); lt.rect(x + s * 0.25, y + s * 0.75, sp, sp); }
      else if (m === SSTONE) lt.rect(x, y + s * (0.2 + (hsh % 6) * 0.1), s, Math.max(1, s * 0.04));
      else if (m === SHALE) { ln.rect(x, y + s * 0.35, s, Math.max(1, s * 0.035)); ln.rect(x, y + s * 0.72, s, Math.max(1, s * 0.035)); }
      else if (m === LIME) { lt.rect(x + s * 0.5, y + s * 0.2, sp, sp); lt.rect(x + s * 0.3, y + s * 0.62, sp * 1.5, sp * 0.6); }
      else if (m === GRANITE) { lt.rect(x + s * 0.3, y + s * 0.15, sp, sp); lt.rect(x + s * 0.75, y + s * 0.5, sp, sp); dk.rect(x + s * 0.45, y + s * 0.8, sp, sp); } }
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fill(dk); ctx.fillStyle = "rgba(255,232,200,0.1)"; ctx.fill(lt); ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fill(ln);
    // (Matthew: "the tree roots have regressed, a lot, from the original gnome dig prototype game"; "it had foreground and
    // background elements, and accommodations for dug out earth tiles"; "the artwork behind those roots was a key part of the
    // aesthetic that I wanted to adopt") Gnome dig's roots and mycelium, grown in Hazel (World.roots, World.threads), and drawn
    // as Gnome dig draws them: one dark layer laid on faintly, a shade darker than the earth they cross, the threads pale;
    // behind a tunnel, its back wall darker and in it the roots seen from behind; across a tunnel, the roots that ran through it
    // as wood, over the gnome
    ensureRoots(c0 - 14, c1 + 14);
    const sets = S.rootSets.filter(R => R.x1 >= c0 - 1 && R.x0 <= c1 + 1), tsets = S.threadSets.filter(R => R.x1 >= c0 - 1 && R.x0 <= c1 + 1);
    const lay = layer(0, camX, camY); strokeLines(lay, sets, "#24120a", 1, 0, 0, 0, false, s); strokeLines(lay, sets, "#3d2414", 0.35, -1, -1, 9, false, s);
    const lay2 = layer(1, camX, camY); strokeLines(lay2, tsets, "#fafaf5", 1, 0, 0, 0, false, s, 3);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.3; ctx.drawImage(layerCv[0], 0, 0); ctx.globalAlpha = 0.4; ctx.drawImage(layerCv[1], 0, 0); ctx.restore();
    // masonry and timber, and what is behind each open tile under the land: rooms' walls, the stair's stones, a cave's rock
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r), m = mat[i];
      if (m === MASON || m === TIMBER) { ctx.drawImage(tex(m, (c * 3 + r * 5) & 3), c * s, r * s); continue; }
      if (m !== AIR) continue; const b = bg[i];
      if (b === B_PLASTER || b === B_WOOD || b === B_STAIR || b === B_CAVE) ctx.drawImage(tex(b === B_PLASTER ? 101 : b === B_WOOD ? 102 : b === B_STAIR ? 103 : 104, (c * 7 + r * 3) & 3), c * s, r * s); }
    // the dug tiles (Gnome dig's dugLayer): a back wall of darker earth, the roots seen from behind it, the near roots faint and
    // light, the threads; each edge against the ground shaded, the floor lit a little
    const dugPath = new Path2D(); let dugN = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r); if (mat[i] !== AIR || bg[i] !== B_DUG) continue;
      ctx.fillStyle = backCol(r - surf0[c]); ctx.fillRect(c * s, r * s, s + 0.5, s + 0.5); dugPath.rect(c * s, r * s, s + 0.5, s + 0.5); dugN++; }
    if (dugN) {
      const far = layer(0, camX, camY); strokeLines(far, sets, "#24120a", 1, 0, 0, 0, true, s);
      ctx.save(); ctx.clip(dugPath); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.42; ctx.drawImage(layerCv[0], 0, 0);
      const near = layer(0, camX, camY); strokeLines(near, sets, "#b08a63", 1, 0, 0, 0, false, s);
      ctx.globalAlpha = 0.2; ctx.drawImage(layerCv[0], 0, 0); ctx.globalAlpha = 0.14; ctx.drawImage(layerCv[1], 0, 0); ctx.restore();
      const E = edges(), open = (cc, rr) => inside(cc, rr) && mat[at(cc, rr)] === AIR;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r); if (mat[i] !== AIR || bg[i] !== B_DUG) continue;
        if (!open(c, r - 1)) ctx.drawImage(E.top, c * s, r * s); if (!open(c - 1, r)) ctx.drawImage(E.left, c * s, r * s); if (!open(c + 1, r)) ctx.drawImage(E.right, c * s + s * 0.84, r * s);
        if (!open(c, r + 1)) { ctx.fillStyle = "rgba(255,228,196,0.07)"; ctx.fillRect(c * s, r * s + s * 0.9, s + 0.5, s * 0.1); } }
      drawWorks(c0, c1, r0, r1, s); }
    // on the ground: grass along the land, the water in it (blue, darker the fuller), gems, a digging's cracks
    const dc = g.dt > 0 ? g.dc : -1, dr = g.dr;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r), m = mat[i]; if (m === AIR) continue;
      if (r === top[c] && r <= surf0[c] + 1 && m <= SSTONE) { ctx.fillStyle = "#4d7c0f"; ctx.fillRect(c * s, r * s - s * 0.04, s + 0.5, s * 0.14);
        ctx.strokeStyle = "#65a30d"; ctx.lineWidth = Math.max(1, s * 0.035); ctx.beginPath();
        for (let j = 0; j < 7; j++) { const bx = c * s + (j + 0.3) * s / 7, bh = s * (0.1 + ((c * 7 + j * 13) % 5) * 0.035); ctx.moveTo(bx, r * s); ctx.lineTo(bx + s * 0.03 * (((c + j) % 3) - 1), r * s - bh); } ctx.stroke(); }
      const w0 = wat[i]; if (PORES[m] > 0 && w0 > 0.05) { ctx.fillStyle = `rgba(37,99,235,${(0.03 + 0.2 * w0 * w0).toFixed(3)})`; ctx.fillRect(c * s, r * s, s + 0.5, s + 0.5);
        if (w0 > 0.95 && ((c * 7 + r * 3 + (S.frame >> 4)) % 11 === 0)) { ctx.fillStyle = "rgba(200,230,255,0.45)"; ctx.fillRect(c * s + s * 0.4, r * s + s * 0.4, s * 0.1, s * 0.1); } }
      if (gem[i]) { const tw = 0.5 + 0.5 * Math.sin(now / 300 + c + r); ctx.fillStyle = GEMS[gem[i]]; ctx.beginPath(); ctx.moveTo(c * s + s * 0.5, r * s + s * 0.2); ctx.lineTo(c * s + s * 0.78, r * s + s * 0.45); ctx.lineTo(c * s + s * 0.5, r * s + s * 0.8); ctx.lineTo(c * s + s * 0.22, r * s + s * 0.45); ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${(0.4 + 0.5 * tw).toFixed(2)})`; ctx.fillRect(c * s + s * 0.42, r * s + s * 0.32, s * 0.1, s * 0.1); }
      if (c === dc && r === dr) { ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = Math.max(1, s / 14); const f = Math.min(1, g.dt / Math.max(1, DIG[m])); ctx.beginPath();
        for (let j = 0; j < 1 + Math.floor(f * 4); j++) { const a = j * 1.7; ctx.moveTo(c * s + s / 2, r * s + s / 2); ctx.lineTo(c * s + s / 2 + Math.cos(a) * s * 0.45 * f, r * s + s / 2 + Math.sin(a) * s * 0.45 * f); } ctx.stroke(); } }
    // the rooms' things, the doorways' frames, a lamp in each room
    for (const R of S.rooms) { if (R.x + R.w < c0 || R.x > c1 || R.y + 5 < r0 || R.y > r1) continue;
      for (const t of R.things) drawThing(t.kind, (R.x + t.at / 10) * s, (R.y + 4) * s, t.w / 10 * s);
      const lx = (R.x + R.w / 2) * s, ly = R.y * s; ctx.strokeStyle = "#333"; ctx.lineWidth = Math.max(1, s / 24); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly + 0.45 * s); ctx.stroke();
      ctx.fillStyle = "#3a3a3a"; ctx.fillRect(lx - 0.12 * s, ly + 0.45 * s, 0.24 * s, 0.32 * s); ctx.fillStyle = "#fde68a"; ctx.fillRect(lx - 0.08 * s, ly + 0.5 * s, 0.16 * s, 0.22 * s); }
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (fix[at(c, r)] === F_DOOR && fix[at(c, r - 1)] !== F_DOOR) { ctx.fillStyle = "#6b4a2b"; ctx.fillRect(c * s, r * s, s, 0.15 * s); ctx.fillRect(c * s, r * s, 0.12 * s, 3 * s); ctx.fillRect(c * s + s - 0.12 * s, r * s, 0.12 * s, 3 * s); }
    // ladders, the stair's steps, platforms, the hatch, rope bridges
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const f = fix[at(c, r)]; if (!f) continue; const x = c * s, y = r * s;
      if (f === F_LADDER) { ctx.fillStyle = "#8b5e34"; ctx.fillRect(x + 0.18 * s, y, 0.1 * s, s); ctx.fillRect(x + 0.72 * s, y, 0.1 * s, s); ctx.fillStyle = "#a0703f"; ctx.fillRect(x + 0.18 * s, y + 0.2 * s, 0.64 * s, 0.09 * s); ctx.fillRect(x + 0.18 * s, y + 0.7 * s, 0.64 * s, 0.09 * s); }
      else if (f === F_PLAT || f === F_HATCH) { ctx.fillStyle = f === F_HATCH ? "#7a4a28" : "#8b5a2b"; ctx.fillRect(x, y, s, 0.2 * s); ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(x + s * 0.48, y, Math.max(1, s / 20), 0.2 * s); }
      else if (f === F_BRIDGE) { const sag = Math.sin(((c % 7) + 0.5) / 7 * Math.PI) * 0.12 * s; ctx.fillStyle = "#a0703f"; ctx.fillRect(x + 0.05 * s, y + sag, 0.9 * s, 0.14 * s); ctx.strokeStyle = "#d8c49a"; ctx.lineWidth = Math.max(1, s / 20); ctx.beginPath(); ctx.moveTo(x, y - 0.6 * s + sag); ctx.lineTo(x + s, y - 0.6 * s + sag); ctx.moveTo(x + 0.5 * s, y - 0.6 * s + sag); ctx.lineTo(x + 0.5 * s, y + sag); ctx.stroke(); } }
    for (const hs of S.houses) if (hs.x > c0 - 4 && hs.x < c1 + 4) drawHouse(hs, (hs.x + 0.5) * s, hs.row * s);
    // the village's door on the hill: a porch over the hatch; chimneys with smoke, light shafts' glass domes, air shafts' caps
    for (const v of S.villages) { const x = (v.x0 + 1) * s, y = v.top * s; if (v.x0 < c0 - 4 || v.x0 > c1 + 4) continue;
      ctx.fillStyle = "#8e8a80"; ctx.fillRect(x - 1.3 * s, y - 1.6 * s, 0.25 * s, 1.6 * s); ctx.fillRect(x + 1.05 * s, y - 1.6 * s, 0.25 * s, 1.6 * s);
      ctx.fillStyle = "#b91c1c"; ctx.beginPath(); ctx.moveTo(x - 1.6 * s, y - 1.6 * s); ctx.lineTo(x, y - 2.6 * s); ctx.lineTo(x + 1.6 * s, y - 1.6 * s); ctx.fill();
      ctx.fillStyle = "#fff"; for (const [dx, dy] of [[-0.6, -1.9], [0.4, -2.2], [0.9, -1.8]]) { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, 0.1 * s, 0, 7); ctx.fill(); } }
    for (const d of S.ducts) { if (d.x < c0 - 2 || d.x > c1 + 2) continue; const x = d.x * s, y0 = d.y0 * s;
      if (d.kind === 3) { ctx.fillStyle = "#8b4a3a"; ctx.fillRect(x + 0.2 * s, y0 - 2.2 * s, 0.6 * s, 2.2 * s); ctx.fillStyle = "#6b3a2a"; ctx.fillRect(x + 0.12 * s, y0 - 2.3 * s, 0.76 * s, 0.2 * s); }
      else if (d.kind === 1) { ctx.fillStyle = "rgba(200,235,255,0.85)"; ctx.beginPath(); ctx.arc(x + 0.5 * s, y0, 0.55 * s, Math.PI, 0); ctx.fill(); ctx.strokeStyle = "#555"; ctx.lineWidth = Math.max(1, s / 20); ctx.stroke(); }
      else { ctx.fillStyle = "#6b7280"; ctx.fillRect(x + 0.38 * s, y0 - 0.9 * s, 0.24 * s, 0.9 * s); ctx.beginPath(); ctx.ellipse(x + 0.5 * s, y0 - 0.95 * s, 0.45 * s, 0.18 * s, 0, Math.PI, 0); ctx.fill(); }
      // (through the rooms above its own, the duct as a pipe along the wall; and into its own room, a chimney hood or a beam of light)
      for (const R of S.rooms) if (R !== d.room && d.x >= R.x && d.x < R.x + R.w && R.y < d.y1) { ctx.fillStyle = d.kind === 3 ? "#6b3a2a" : "#7a7a7a"; ctx.fillRect(x + 0.3 * s, R.y * s, 0.4 * s, 4 * s); }
      if (d.kind === 1) { const R = d.room; const gr = ctx.createLinearGradient(0, R.y * s, 0, (R.y + 4) * s); gr.addColorStop(0, "rgba(255,240,180,0.45)"); gr.addColorStop(1, "rgba(255,240,180,0)"); ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(x + 0.2 * s, R.y * s); ctx.lineTo(x + 0.8 * s, R.y * s); ctx.lineTo(x + 1.8 * s, (R.y + 4) * s); ctx.lineTo(x - 0.8 * s, (R.y + 4) * s); ctx.fill(); } }
    for (const sm of S.smoke) { ctx.fillStyle = `rgba(200,200,200,${(0.5 * (1 - sm.life / 200)).toFixed(3)})`; ctx.beginPath(); ctx.arc(sm.x * s, sm.y * s, sm.r * s, 0, 7); ctx.fill(); }
    // the beavers' lodges (domes of sticks) and dams (logs across the river, up to the water), behind the water
    for (const L of S.lodges) { if (!L.river || L.x > c1 + 8 || L.x + L.w < c0 - 8) continue; drawLodge(L, s); }
    for (const d of S.dams) { const R = d.river; if (!R || R.x > c1 + 2 || R.x + R.w < c0 - 2) continue; ctx.globalAlpha = 0.45;
      for (let k = 0; k < R.w; k++) { const c = R.x + k; for (let rr = R.bed[k] - 1; rr >= R.level - 0.5; rr -= 0.5) { ctx.fillStyle = (k + Math.floor(rr * 2)) % 2 ? "#7a5230" : "#8b6040"; ctx.beginPath(); ctx.roundRect(c * s - 0.05 * s, rr * s, s * 1.1, 0.46 * s, 0.2 * s); ctx.fill(); } }
      ctx.globalAlpha = 1; ctx.strokeStyle = "#5e3d22"; ctx.lineWidth = Math.max(1, s / 10); for (let k = 0; k < R.w * 2; k++) { const x = (R.x + k / 2) * s; ctx.beginPath(); ctx.moveTo(x, (R.level - 0.4) * s); ctx.lineTo(x + 0.3 * s, (R.level - 0.9 - (k % 3) * 0.2) * s); ctx.stroke(); } }
    // the beavers, the boulders, the diving gear, the gnome, the dirt flying
    for (const B of S.beavers) { const c = Math.floor(B.px), R = riverAt(c + 0.5), y = R ? R.level + 0.35 : surf0[Math.max(0, Math.min(WW - 1, c))]; B.py = B.py ? B.py + (y - B.py) * 0.25 : y; if (c < c0 - 3 || c > c1 + 3) continue; drawBeaver(B, (B.px + 0.5) * s, B.py * s, !!R); }
    for (const b of S.boulders) { if (b.c < c0 - 1 || b.c > c1 + 1 || b.r < r0 - 1 || b.r > r1 + 1) continue; const sh = b.wob > 0 ? Math.sin(now / 30) * 0.05 * s : 0, x = (b.c + 0.5) * s + sh, y = (b.r + b.oy + 0.5) * s;
      ctx.fillStyle = "#7d7b78"; ctx.beginPath(); ctx.ellipse(x, y + 0.04 * s, 0.47 * s, 0.44 * s, 0, 0, 7); ctx.fill(); ctx.fillStyle = "#a8a5a0"; ctx.beginPath(); ctx.ellipse(x - 0.12 * s, y - 0.12 * s, 0.22 * s, 0.16 * s, -0.4, 0, 7); ctx.fill(); }
    for (const it of S.items) if (!it.taken && it.kind === "climb") { const x = it.x * s, y = it.y * s + Math.sin(now / 300) * 0.06 * s;
      ctx.fillStyle = "#7a4a28"; ctx.beginPath(); ctx.roundRect(x - 0.25 * s, y - 0.3 * s, 0.5 * s, 0.6 * s, 0.12 * s); ctx.fill(); ctx.fillStyle = "#a0703f"; ctx.fillRect(x - 0.18 * s, y - 0.05 * s, 0.36 * s, 0.18 * s);
      ctx.strokeStyle = "#d8c49a"; ctx.lineWidth = Math.max(1, s / 18); ctx.beginPath(); ctx.arc(x + 0.32 * s, y, 0.16 * s, 0, 7); ctx.stroke(); ctx.font = `${Math.round(0.5 * s)}px sans-serif`; ctx.fillText("✨", x - 0.6 * s, y - 0.35 * s); }
    for (const it of S.items) if (!it.taken && it.kind !== "climb") { const x = it.x * s, y = it.y * s + Math.sin(now / 300) * 0.06 * s; ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.roundRect(x - 0.18 * s, y - 0.35 * s, 0.36 * s, 0.7 * s, 0.15 * s); ctx.fill();
      ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.roundRect(x + 0.2 * s, y - 0.3 * s, 0.45 * s, 0.25 * s, 0.1 * s); ctx.fill(); ctx.font = `${Math.round(0.6 * s)}px sans-serif`; ctx.fillText("✨", x - 0.6 * s, y - 0.4 * s); }
    const blink = performance.now() - S.hurtAt < 1500 && Math.floor(now / 100) % 2 === 0;
    if (!S.faintAt && !blink) {
      const moving = Math.abs(g.vx) > 10 || (g.climb && (S.keys.up || S.keys.down)), d = g.climb && !g.ground ? 0 : g.face > 0 ? 1 : 3;
      const swimPose = g.swim && !g.gear ? { swim: true, stroke: Math.abs(g.vx) > 10, t: now } : g.under ? { swim: true, stroke: true, under: true, t: now } : null;
      // (Matthew: "when the gnome is moving laterally, let's draw them in profile, like mario 3 as inspiration") running,
      // jumping, falling or swimming along, the gnome in profile; standing still or climbing, facing us, as before
      const lateral = !g.climb && (Math.abs(g.vx) > 10 || !g.ground || (swimPose && swimPose.stroke && Math.abs(g.vx) > 10));
      if (lateral) gnomeProfile(ctx, gx * s, (g.y / 1000) * s - 0.48 * s, s * 0.98, g.face, Math.abs(g.vx) > 10, g.ground, g.vy, now, g.gear, swimPose);
      else gnome(ctx, gx * s, (g.y / 1000) * s - 0.48 * s, s * 0.98, d, true, moving, now, g.gear, false, true, false, swimPose);
      if (g.under && !g.gear) { for (let j = 0; j < Math.ceil(g.air / 120); j++) { ctx.strokeStyle = g.air < 150 && Math.floor(now / 150) % 2 ? "#ef4444" : "rgba(220,240,255,0.9)"; ctx.lineWidth = Math.max(1, s / 20); ctx.beginPath(); ctx.arc((gx - 0.5 + j * 0.25) * s, (g.y / 1000 - 1.25 - (j % 2) * 0.12) * s, 0.09 * s, 0, 7); ctx.stroke(); } }
      if (g.swim && !g.under) { ctx.strokeStyle = "rgba(255,255,255,0.8)"; ctx.lineWidth = Math.max(1, s / 16); const wl = Math.floor((g.y / 1000 - 0.45)) ; const sx = gx * s, sy = (wl) * s;
        for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(sx + sd * (0.45 + (now % 900) / 900 * 0.5) * s, sy, 0.18 * s, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
    }
    for (const p of S.parts) { ctx.fillStyle = p.col; ctx.fillRect(p.x * s, p.y * s, s * 0.1, s * 0.1); }
    // (Gnome dig's front layer: the roots that ran through a tunnel still crossing it, as wood, its shadow on the wall behind, its
    // bark, its top lit; the gnome goes behind them)
    if (dugN) { ctx.save(); ctx.clip(dugPath); strokeLines(ctx, sets, "rgba(5,2,1,0.45)", 1.05, s * 0.05, s * 0.07, 5, false, s); strokeLines(ctx, sets, "#5b3a22", 1, 0, 0, 5, false, s);
      strokeLines(ctx, sets, "#8a6440", 0.35, -s * 0.012, -s * 0.012, 5, false, s); ctx.restore(); }
    // the water in the open (rivers, caves, tunnels flooded): over everything in it, so what is under it shows through, bluer
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) { const i = at(c, r); if (mat[i] !== AIR) continue; const w0 = wat[i]; if (w0 < 0.03) continue;
      const above = r > 0 && mat[at(c, r - 1)] === AIR && wat[at(c, r - 1)] > 0.5, hgt = above ? 1 : Math.min(1, w0);
      ctx.fillStyle = "rgba(40,120,210,0.45)"; ctx.fillRect(c * s, (r + 1 - hgt) * s, s, hgt * s + 0.5);
      if (!above) { ctx.fillStyle = "rgba(220,240,255,0.6)"; ctx.fillRect(c * s, (r + 1 - hgt) * s, s, Math.max(1, s / 16)); } }
    // rain, in a shower
    if (S.rain) { ctx.strokeStyle = "rgba(200,220,255,0.6)"; ctx.lineWidth = Math.max(1, s / 24); ctx.beginPath(); for (let k = 0; k < 120; k++) { const x = (c0 + ((k * 37.7 + S.frame * 0.3 * (k % 3 + 1)) % (c1 - c0 + 1))) * s, y = (r0 + ((k * 13.3 + S.frame * 0.5) % (r1 - r0 + 1))) * s; const col = Math.floor(x / s); if (col >= 0 && col < WW && y / s < top[col]) { ctx.moveTo(x, y); ctx.lineTo(x - 0.1 * s, y + 0.5 * s); } } ctx.stroke(); }
    // the dark under the ground: each tile darker the further it is under the sky, lit by the lantern, the lamps and the light
    // shafts; drawn as a tiny picture, a pixel a tile, stretched smooth over the view
    {
      const lw = c1 - c0 + 3, lh = r1 - r0 + 3, img = darkImg(lw, lh), d = img.data;
      const lights = [{ x: gx, y: gy, r: 6.5 }, ...S.lamps.filter(l => l.x > c0 - 8 && l.x < c1 + 8 && l.y > r0 - 8 && l.y < r1 + 8)];
      for (let j = 0; j < lh; j++) for (let k = 0; k < lw; k++) { const c = c0 - 1 + k, r = r0 - 1 + j; let a = 0;
        if (c >= 0 && c < WW && r >= 0 && r < WH) { const sky = Math.min(top[c], surf0[c]); a = r <= sky ? 0 : Math.min(0.9, (r - sky) / 6);
          if (a > 0) { let L = 0; for (const l of lights) { const dx = c + 0.5 - l.x, dy = r + 0.5 - l.y, q = 1 - Math.sqrt(dx * dx + dy * dy) / l.r; if (q > L) L = q; } a *= 1 - Math.min(1, L * 1.3); } }
        const o = (j * lw + k) * 4; d[o] = 6; d[o + 1] = 4; d[o + 2] = 12; d[o + 3] = Math.round(a * 255); }
      darkCtx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(darkCv, 0, 0, lw, lh, (c0 - 1) * s, (r0 - 1) * s, lw * s, lh * s);
    }
    // words floating up
    ctx.textAlign = "center"; ctx.font = `bold ${Math.round(0.55 * s)}px sans-serif`;
    for (let k = words.length - 1; k >= 0; k--) { const w = words[k], f = (now - w.at) / 1200; if (f > 1) { words.splice(k, 1); continue; } ctx.globalAlpha = 1 - f; ctx.fillStyle = "#fff"; ctx.strokeStyle = "rgba(0,0,0,0.6)"; ctx.lineWidth = 3; ctx.strokeText(w.t, w.x * s, (w.y - f) * s); ctx.fillText(w.t, w.x * s, (w.y - f) * s); ctx.globalAlpha = 1; }
    ctx.restore();
    hud(now);
  }
  const darkCv = document.createElement("canvas"), darkCtx = darkCv.getContext("2d"); let darkData = null;
  function darkImg(w, h) { if (darkCv.width !== w || darkCv.height !== h || !darkData) { darkCv.width = w; darkCv.height = h; darkData = darkCtx.createImageData(w, h); } return darkData; }
  // ---- the words over the picture: the hearts, the gems, how deep or how high, the place; a banner; and the map of the world
  const mapCv = document.createElement("canvas"); mapCv.width = WW; mapCv.height = WH; const mapCtx = mapCv.getContext("2d"); const mapImg = mapCtx.createImageData(WW, WH);
  const map2Cv = document.createElement("canvas"); map2Cv.width = WW * 2; map2Cv.height = WH * 2; const map2Ctx = map2Cv.getContext("2d");
  const MAPCOL = [[0, 0, 0], [122, 74, 36], [160, 99, 74], [194, 163, 107], [200, 135, 90], [91, 95, 102], [207, 202, 184], [138, 133, 136], [156, 143, 128], [139, 90, 43]];
  function minimap() {
    const d = mapImg.data;
    for (let r = 0; r < WH; r++) for (let c = 0; c < WW; c++) { const i = at(c, r), o = i * 4, m = mat[i]; let col;
      if (m === AIR) col = wat[i] > 0.5 ? [50, 110, 200] : r < surf0[c] ? [150, 200, 235] : bg[i] === B_PLASTER || bg[i] === B_WOOD ? [230, 200, 140] : bg[i] === B_STAIR ? [120, 110, 100] : [60, 40, 28];
      else { col = MAPCOL[m]; if (PORES[m] > 0 && wat[i] > 0.6) col = [col[0] * 0.6, col[1] * 0.7, col[2] * 0.6 + 80]; if (gem[i]) col = [[0, 0, 0], [255, 90, 90], [90, 235, 120], [110, 160, 255], [200, 120, 255], [255, 200, 60]][gem[i]]; }
      if (m === AIR && fix[i] && fix[i] !== F_DOOR) col = fix[i] === F_LADDER || fix[i] === F_STAIR ? [196, 150, 95] : [139, 94, 52];   // (ladders, the stair, platforms, bridges, planks)
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255; }
    mapCtx.putImageData(mapImg, 0, 0);
    // (Matthew: "foreground trees and tree houses do not appear in the overview map HUD"; "the overview map should not use ovals
    // for tree pads. Use triangles, if you must"; "arrays of triangles") Over the tiles, on a layer two pixels a tile: each
    // tree's crown as an array of triangles, its pads (a leafy tree's stacked three, two, one, low and wide; a pine's tiers; a
    // willow's dome, its tassels hanging as narrow triangles), its trunk (a felled tree, its stump); each great tree's crown in
    // rows of pads, more over each house, its trunk, limbs and ladder; each tree house, its walls and roof in their colors
    const m = map2Ctx, hex = n => "#" + n.toString(16).padStart(6, "0");
    m.imageSmoothingEnabled = false; m.clearRect(0, 0, map2Cv.width, map2Cv.height); m.drawImage(mapCv, 0, 0, map2Cv.width, map2Cv.height);
    m.save(); m.scale(2, 2);
    const tri = (x0, y0, x1, y1, x2, y2, col) => { m.fillStyle = col; m.beginPath(); m.moveTo(x0, y0); m.lineTo(x1, y1); m.lineTo(x2, y2); m.closePath(); m.fill(); };
    const pad = (x, y, w, h, col) => tri(x - w / 2, y, x + w / 2, y, x, y - h, col);   // (a pad: a low, wide triangle, its base at y)
    const LEAF = { 0: ["#285e2a", "#2f7d32", "#47a047"], 2: ["#5a8f2a", "#6aa832", "#93d04a"], 3: ["#6f9228", "#86a83a", "#c2d86a"], 4: ["#5a7820", "#86a92e", "#bcd75a"] };
    for (const t of S.trees) { const foot = surf0[t.x], cx = t.x + 0.5;
      if (!t.alive) { m.fillStyle = "#6b4a2b"; m.fillRect(t.x + 0.25, foot - 0.5, 0.5, 0.5); continue; }
      const h = t.h * (t.tall ? 1.45 : 1) * t.grow;
      m.fillStyle = t.kind === 2 ? "#e9e4dc" : t.kind === 3 ? "#c9c7b3" : "#6b4a2b"; m.fillRect(cx - 0.25, foot - h * 0.5, 0.5, h * 0.5);
      if (t.kind === 1) { for (let k = 0; k < 4; k++) { const w = h * (0.62 - 0.12 * k), y = foot - h * (0.18 + 0.2 * k); pad(cx, y, w, h * 0.32, ["#1f5f3a", "#245f34", "#2a6b3c", "#357a46"][k]); } continue; }
      const C = LEAF[t.kind] || LEAF[0], hw = h * (t.kind === 4 ? 0.62 : t.kind === 0 ? 0.52 : 0.42), cy = foot - h * 0.58, th = h * 0.2;
      if (t.kind === 4) { for (let j = 0; j < 7; j++) { const x = cx - hw + (j + 0.5) * hw * 2 / 7, y0 = cy - h * 0.05 * Math.cos((j - 3) / 3.5 * 1.4); tri(x - hw / 7, y0, x + hw / 7, y0, x + 0.1, foot - h * (0.06 + 0.08 * (j % 2)), C[j % 2]); } }
      for (let k = 0; k < 3; k++) { const n = 3 - k, w = hw * 2 / 3 * (1.15 - 0.08 * k), y = cy - k * th * 0.85;
        for (let j = 0; j < n; j++) pad(n === 1 ? cx : cx - hw * (1 - 0.33 * k) + w / 2 + j * (hw * 2 * (1 - 0.33 * k) - w) / (n - 1), y, w, th, C[k]); } }
    for (const G of S.greats) { const cx = G.x + 0.5, h = G.h, C = LEAF[0];
      for (let k = 0; k < 4; k++) { const n = 6 - k, w = h * 0.28, y = G.foot - h * (0.72 + 0.11 * k), half = h * (0.5 - 0.08 * k);
        for (let j = 0; j < n; j++) pad(cx - half + w / 2 + j * (half * 2 - w) / (n - 1), y, w, h * 0.12, C[(j + k) % 3]); }
      m.fillStyle = "#6b4a2b"; m.fillRect(G.x - G.half, G.foot - h * 0.78, G.half * 2 + 1, h * 0.78);
      m.strokeStyle = "#6b4a2b"; m.lineWidth = 0.6;
      for (const L of G.limbs) { const ex = cx + L.side * (G.half + L.len), y = G.foot - L.y; m.beginPath(); m.moveTo(cx, y + 1.5); m.lineTo(ex, y + 0.4); m.stroke();
        pad(cx + L.side * (G.half + L.len * 0.55), y - 4.2, 2.6, 1.1, C[1]); pad(cx + L.side * (G.half + L.len * 0.85), y - 4.6, 2.2, 1, C[2]); }
      m.fillStyle = "#d8b07a"; for (let r = G.foot - G.h; r < G.foot; r++) for (let c = G.x - G.half; c <= G.x + G.half; c++) if (inside(c, r) && (fix[at(c, r)] === F_LADDER || fix[at(c, r)] === F_STAIR)) m.fillRect(c, r, 1, 1); }
    for (const hs of S.houses) { if (hs.small) { m.fillStyle = "#c0703a"; m.fillRect(hs.x, hs.row - 1, 0.8, 0.8); continue; }
      const st = S.styles[hs.style % S.styles.length]; if (!st) continue; const x0 = hs.x + 0.5 - 1.9;
      m.fillStyle = hex(st.walls); m.fillRect(x0, hs.row - 2.5, 3.8, 2.5); tri(x0 - 0.4, hs.row - 2.5, x0 + 4.2, hs.row - 2.5, x0 + 1.9, hs.row - 3.8, hex(st.roofc));
      m.fillStyle = "#3a2414"; m.fillRect(x0 + 1.6, hs.row - 1.2, 0.6, 1.2); }
    m.restore();
  }
  function hud(now) {
    const W = cv.width, Hh = cv.height, k = Math.max(1, Math.min(2.2, W / 900)), g = S.g;
    ctx.save(); ctx.textAlign = "left"; ctx.textBaseline = "top";
    const pill = (x, y, w, h) => { ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.roundRect(x, y, w, h, 10 * k); ctx.fill(); };
    ctx.font = `${Math.round(18 * k)}px sans-serif`;
    const hearts = "❤️".repeat(Math.max(0, S.hearts)) + "🤍".repeat(Math.max(0, 5 - S.hearts));
    const RV = g ? riverAt(g.x / 1000) : null, land = g ? (RV ? RV.natural - 4 : surf0[Math.floor(g.x / 1000)]) : 0, depth = g ? Math.round(g.y / 1000 - land) : 0;
    const where = g && (g.swim || g.under) ? (g.under ? "🫧 under the water" : "🏊 swimming") : depth > 1 ? `⛏️ ${depth} m down` : depth < -2 ? `🌳 ${-depth} m up` : "🌿 on the land";
    const gx = g ? g.x / 1000 : 0, place = (S.places.find(p => gx >= p.x0 && gx <= p.x1 && (!p.under || depth > 3)) || { name: "" }).name;
    const line = `${hearts}  💎 ${S.gems}  ${where}${g && g.gear ? "  🤿" : ""}${g && g.climbPack ? "  🧗" : ""}${place ? "  ·  " + place : ""}`;
    const tw = ctx.measureText(line).width;
    pill(10 * k, 10 * k, tw + 20 * k, 30 * k); ctx.fillStyle = "#fff"; ctx.fillText(line, 20 * k, 15 * k);
    if (g && g.under && !g.gear) { const f = g.air / 600; pill(10 * k, 46 * k, 160 * k, 16 * k); ctx.fillStyle = f < 0.25 ? "#ef4444" : "#7dd3fc"; ctx.fillRect(14 * k, 50 * k, 152 * k * f, 8 * k); }
    if (S.banner && now - S.banner.t < 3500) { const f = Math.min(1, (3500 - (now - S.banner.t)) / 500); ctx.globalAlpha = f; ctx.font = `bold ${Math.round(24 * k)}px sans-serif`; ctx.textAlign = "center";
      const bw = ctx.measureText(S.banner.text).width; pill(W / 2 - bw / 2 - 16 * k, Hh * 0.18, bw + 32 * k, 40 * k); ctx.fillStyle = "#fff"; ctx.fillText(S.banner.text, W / 2, Hh * 0.18 + 8 * k); ctx.globalAlpha = 1; }
    if (S.map && g) {
      if (S.frame - S.minimapAt > 45) { minimap(); S.minimapAt = S.frame; }
      const mw = Math.min(W * 0.3, 340 * k), mh = mw * WH / WW, mx = W - mw - 10 * k, my = 10 * k + (document.documentElement.classList.contains("oracle-fs") ? 40 * k : 0);
      ctx.globalAlpha = 0.88; ctx.imageSmoothingEnabled = true; ctx.drawImage(map2Cv, mx, my, mw, mh); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.strokeRect(mx + S.cam.x / WW * mw, my + S.cam.y / WH * mh, VW / WW * mw, VH / WH * mh);
      // (Matthew: "overview map should show placement of all items on map that can be aquired") each thing still to be found,
      // marked where it is: the diving gear 🤿 and the tree-climbing pack 🧗, on a dark spot, big enough to read; the gems are the
      // map's colored flecks, each its own color
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `${Math.round(13 * k)}px sans-serif`;
      for (const it of S.items) { if (it.taken) continue; const ix = mx + it.x / WW * mw, iy = my + it.y / WH * mh;
        ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.beginPath(); ctx.arc(ix, iy, 8 * k, 0, 7); ctx.fill(); ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillText(it.kind === "climb" ? "🧗" : "🤿", ix, iy + 0.5 * k); }
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(mx + gx / WW * mw, my + g.y / 1000 / WH * mh, 3 * k, 0, 7); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh); }
    ctx.restore();
    if (S.frame % 15 === 0) { $("gems").textContent = `💎 ${S.gems}`; $("hearts").textContent = hearts; $("where").textContent = place || where; }
  }

  // ---- the loop: a step each sixtieth of a second (several to catch up, at most four a frame), then the picture
  let acc = 0, lastT = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    const h = H();
    if (!h || !S.g || document.hidden || (P && P.paused())) { lastT = t; draw(); return; }
    acc += Math.min(100, t - (lastT || t)) * 60 / 1000; lastT = t;
    let n = 0;
    try { while (acc >= 1 && n < 4) { tick(h); acc -= 1; n++; } } catch (e) { S.built = { ...S.built, ok: false, threw: String(e && e.message || e) }; drawStatus(); console.error(e); return; }
    if (n >= 4) acc = 0;
    draw();
  }
  requestAnimationFrame(frame);

  // ---- the keys and the buttons
  const KEYS = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right", ArrowUp: "up", w: "up", W: "up", z: "up", Z: "up", ArrowDown: "down", s: "down", S: "down" };
  const typing = e => /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== "checkbox";
  addEventListener("keydown", e => {
    if (typing(e)) return;
    const k = KEYS[e.key];
    if (k) { if (e.key.startsWith("Arrow")) e.preventDefault(); if (k === "up" && !S.keys.up) S.jumpQueued = true; S.keys[k] = true; }
    else if (e.key === "m" || e.key === "M") toggleMap();
    else if (e.key === "b" || e.key === "B") { e.preventDefault(); buildHere(); }
  });
  addEventListener("keyup", e => { const k = KEYS[e.key]; if (k) S.keys[k] = false; });
  addEventListener("blur", () => { for (const k in S.keys) S.keys[k] = false; });
  for (const b of document.querySelectorAll(".gw-pad button[data-k]")) {
    const k = b.dataset.k;
    b.addEventListener("pointerdown", e => { e.preventDefault(); b.setPointerCapture && b.setPointerCapture(e.pointerId); b.classList.add("held"); if (k === "up" && !S.keys.up) S.jumpQueued = true; S.keys[k] = true; });
    for (const ev of ["pointerup", "pointercancel", "lostpointercapture"]) b.addEventListener(ev, () => { b.classList.remove("held"); S.keys[k] = false; });
    b.addEventListener("contextmenu", e => e.preventDefault());
  }
  { const b = $("build"); if (b) b.addEventListener("pointerdown", e => { e.preventDefault(); buildHere(); }); }
  function toggleMap() { S.map = !S.map; keep("map", S.map); $("map").setAttribute("aria-pressed", String(S.map)); }
  $("map").setAttribute("aria-pressed", String(S.map));
  $("map").addEventListener("click", () => { toggleMap(); $("map").blur(); });
  $("new").addEventListener("click", () => { const h = H(); if (!h) return; S.seed = 1 + Math.floor(Math.random() * 100000); keep("seed", S.seed); build(h, S.seed); $("new").blur(); });
  addEventListener("resize", () => draw());
  const P = window.HazelPause ? window.HazelPause.make({ into: $("new").parentElement, over: $("world").parentElement,
    onChange: paused => { if (!SND) return; if (paused) SND.stop(); else SND.tune(0); } }) : null;
  if (SND) {
    const sw = (id, get, set) => { const b = $(id); if (!b) return; b.setAttribute("aria-pressed", String(get()));
      b.addEventListener("click", () => { set(!get()); b.setAttribute("aria-pressed", String(get())); if (get()) SND.gesture(0); b.blur(); }); };
    sw("music", () => SND.musicOn, on => { SND.music(on); if (on) SND.tune(0); });
    sw("sfx", () => SND.soundsOn, on => SND.sounds(on));
    if (window.HazelVolume) {
      window.HazelVolume.slider($("music"), { label: "Music volume", get: () => SND.volumeOf("music"), set: v => SND.setVolume("music", v), isOn: () => SND.musicOn });
      window.HazelVolume.slider($("sfx"), { label: "Sounds volume", get: () => SND.volumeOf("sfx"), set: v => SND.setVolume("sfx", v), isOn: () => SND.soundsOn, hear: () => SND.gem() });
    }
    for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => SND.gesture(0), true);
  } else for (const id of ["music", "sfx"]) { const b = $(id); if (b) b.hidden = true; }

  // ---- the rules: Hazel's library (with hazel-jit: the hazeljs branch's build; else npm's 0.0.4), the program built and,
  // where the library can, compiled; then the world made from its plan
  function drawStatus() {
    const st = $("status"), b = S.built;
    if (!window.Hazel) { st.className = "status wait"; st.textContent = S.libFailed ? "Hazel did not load: check the connection, then reload." : "⏳ Loading Hazel, whose rules plan the world and move the gnome…"; return; }
    if (!b) { st.className = "status wait"; st.textContent = "⏳ Building the rules…"; return; }
    if (b.ok) { const ms = S.stepMs.length ? (S.stepMs.reduce((a, v) => a + v, 0) / S.stepMs.length).toFixed(3) : "…";
      st.className = "status ok"; st.textContent = b.compiled ? `✓ Hazel's rules, compiled by hazel-jit as the page loaded (${(b.ms / 1000).toFixed(1)} s, the hazeljs branch's build): the gnome's step about ${ms} ms.`
        : `✓ Hazel's rules, built by hazeljs ${S.lib === LIB_NPM ? "0.0.4" : ""} in ${(b.ms / 1000).toFixed(1)} s and interpreted${b.reason ? " (not compiled: " + b.reason + ")" : ""}: the gnome's step about ${ms} ms, so the world may go slowly.`; return; }
    st.className = "status no";
    st.textContent = "The rules have an error, so the world cannot be made: " + (b.threw || (b.errors || []).map(e => (e.module ? e.module + ": " : "") + String(e.message || e).replace(/\s+/g, " ")).join("; ") || "they did not build");
  }
  setInterval(() => { if (S.built && S.built.ok) drawStatus(); }, 3000);
  let L = null, timer = 0;
  function buildRules() {
    if (!window.Hazel || !L) return;
    const sp = L.spec(PROGRAM, TAIL), key = JSON.stringify(sp);
    if (S.built && S.built.key === key) return;
    const t0 = performance.now(); let r, threw = "";
    const jit = typeof window.Hazel.jitProgram === "function" && !Q.has("interpreted");
    try { r = jit ? window.Hazel.jitProgram(sp) : window.Hazel.runProgram(sp); } catch (e) { threw = String(e && e.message || e); r = { ok: false, errors: [] }; }
    const v = r.value && typeof r.value === "object" ? r.value : null;
    S.built = { key, ok: !!v && typeof v.step === "function" && typeof v.plan === "function" && !(r.errors || []).length, compiled: !!r.compiled, reason: r.reason || "", value: v, errors: r.errors || [], threw, ms: performance.now() - t0 };
    S.stepMs = [];
    if (S.built.ok) { try { build(v, S.seed); } catch (e) { S.built = { ...S.built, ok: false, threw: "making the world: " + String(e && e.message || e) }; console.error(e); } }
    drawStatus();
  }
  function loadLib() {
    drawStatus();
    const want = Q.get("lib") === "npm" ? [LIB_NPM] : [LIB_JIT, LIB_NPM];
    const next = i => { if (i >= want.length) { S.libFailed = true; drawStatus(); return; }
      const s = document.createElement("script"); s.src = want[i]; s.async = true;
      s.onload = () => { S.lib = want[i]; drawStatus(); setTimeout(buildRules, 30); }; s.onerror = () => { s.remove(); next(i + 1); };
      document.head.append(s); };
    next(0);
  }
  try {
    const [pre, ...mods] = await Promise.all([text("rules/preamble.hz"), ...MODULES.map(m => text(`rules/${m}.hz`))]);
    document.querySelector(`pre.hazel[data-program="${PROGRAM}"]:not([data-module])`).textContent = pre;
    MODULES.forEach((m, i) => { document.querySelector(`pre.hazel[data-module="${m}"]`).textContent = mods[i]; });
    window.HazelListingsOptions = { start: "request" };
    await load("../shared/hazel-listings.js?v=0.0.24");
    L = window.HazelListings; L.tail(PROGRAM, TAIL);
    L.onChange(PROGRAM, () => { clearTimeout(timer); timer = setTimeout(buildRules, 350); });
    loadLib();
  } catch (e) {
    $("status").textContent = "Could not start: " + (e && e.message || e) + ". Serve this folder over http (python3 -m http.server) and open it from localhost.";
  }
  $("reset-rules").addEventListener("click", () => { if (L) L.reset(PROGRAM); });
  // ---- ⚙️ Advanced: this device's speed (600 of the gnome's steps through Hazel)
  if (window.OracleAdvanced) window.OracleAdvanced.panel({
    holder: $("advanced"), name: "Gnome world", built: () => S.built, libAt: () => 0, keysIn: null,
    mode: () => ({ asked: S.built && S.built.compiled ? "compiled" : "interpreted", error: null }),
    about: "600 of the gnome's steps through Hazel, running and jumping",
    work: async say => {
      const h = H(); if (!h || !S.g) return { data: { hazel: false }, text: ["Hazel was not ready, so nothing was timed in it"] };
      say("🧪 measuring: 600 steps…"); let g = S.g; const t0 = performance.now();
      for (let n = 0; n < 600; n++) g = h.step(g, near(g), { dx: n % 120 < 60 ? 1 : -1, up: n % 40 < 10, down: false, jump: n % 40 === 0 });
      const ms = (performance.now() - t0) / 600;
      return { data: { step: +ms.toFixed(4) }, text: [`a step of the gnome through Hazel: ${ms.toFixed(3)} ms`] };
    },
  });
  if (Q.has("test")) window.WorldTest = { profile: gnomeProfile, front: gnome, map: () => { minimap(); return map2Cv; }, S, tick: n => { const h = H(); for (let i = 0; i < n; i++) tick(h); draw(); }, draw, near, code, at, mat, wat, fix, bg };
  document.body.classList.add("js");
  draw();
})();
