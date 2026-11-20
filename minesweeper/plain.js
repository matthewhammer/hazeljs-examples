// hazeljs-examples, Minesweeper in plain JavaScript (ticket 797), for timing only: the page never loads it. The same game,
// rules and hint as minesweeper/rules/*.hz (the mines laid by Knuth's selection sampling from the page's random numbers,
// never in the first tap's 3 by 3; a cell opened and the empty region spreading from every open empty cell; flags; a
// number's neighbours opened at once; and the hint's sure move, reasoned only from the open numbers), written as a
// JavaScript programmer would, with arrays and loops. Its answers are the same in the same order: the numbers read down the
// rows, each one's closed neighbours in Hazel's order, the same two passes for the mines, the same first sure move. Same
// functions and values as compiled.js, so node/compare-compiled.mjs --plain checks it and node/three-way.mjs times it.
(() => {
  "use strict";
  const closed = mine => ({ mine, near: 0, open: false, flag: false });
  const opened = x => ({ mine: x.mine, near: x.near, open: true, flag: x.flag });
  const NONE = { mine: false, near: 0, open: false, flag: false };
  const inside = (g, r, c) => r >= 0 && c >= 0 && r < g.rows && c < g.cols;
  const cellAt = (g, r, c) => inside(g, r, c) ? g.grid[r][c] : NONE;
  const game = (g, grid, left, over, won, boom) => ({ rows: g.rows, cols: g.cols, mines: g.mines, grid, left, over, won, boom });

  // ---- the board
  function fresh(rows, cols, mines) {
    const grid = []; for (let r = 0; r < rows; r++) { const row = []; for (let c = 0; c < cols; c++) row.push(closed(false)); grid.push(row); }
    return { rows, cols, mines, grid, left: rows * cols - mines, over: false, won: false, boom: -1 };
  }
  // the mines for a first tap at (r0, c0): cell by cell, outside its 3 by 3, a mine with chance (mines left) / (cells left),
  // one random number a cell considered
  function lay(rows, cols, mines, us, r0, c0) {
    const n = rows * cols, safe = i => { const r = Math.floor(i / cols), c = i - r * cols; return r >= r0 - 1 && r <= r0 + 1 && c >= c0 - 1 && c <= c0 + 1; };
    let free = 0; for (let i = 0; i < n; i++) if (!safe(i)) free++;
    let left = mines, k = 0;
    const grid = [];
    for (let r = 0; r < rows; r++) grid.push([]);
    for (let i = 0; i < n; i++) {
      let mine = false;
      if (!safe(i)) { if (k < us.length) { mine = us[k++] * free < left; if (mine) left--; } free--; }
      grid[Math.floor(i / cols)].push(closed(mine));
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let near = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols && grid[r + dr][c + dc].mine) near++;
      grid[r][c] = { mine: grid[r][c].mine, near, open: false, flag: false };
    }
    return { rows, cols, mines, grid, left: n - mines, over: false, won: false, boom: -1 };
  }

  // ---- play
  const zero = x => x.open && !x.mine && x.near === 0;
  // every closed, unflagged, safe cell beside an open empty one opens, and so on as far as it goes (from every open empty
  // cell on the board, as Hazel's sweeps do); how many opened
  function flood(grid, rows, cols) {
    const todo = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (zero(grid[r][c])) todo.push(r * cols + c);
    let n = 0;
    while (todo.length) {
      const p = todo.pop(), r = Math.floor(p / cols), c = p % cols;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const r2 = r + dr, c2 = c + dc; if ((!dr && !dc) || r2 < 0 || c2 < 0 || r2 >= rows || c2 >= cols) continue;
        const x = grid[r2][c2]; if (x.open || x.mine || x.flag) continue;
        grid[r2][c2] = opened(x); n++;
        if (x.near === 0) todo.push(r2 * cols + c2);
      }
    }
    return n;
  }
  function withGrid(g, grid, left) {
    if (left > 0) return game(g, grid, left, false, false, -1);
    return game(g, grid.map(row => row.map(x => x.mine ? { mine: true, near: x.near, open: false, flag: true } : x)), 0, true, true, -1);
  }
  // a cell opened: a mine ends the game (every mine shown); a number opens alone; an empty cell opens the region around it
  function reveal(g, r, c) {
    const x = cellAt(g, r, c);
    if (g.over || x.open || x.flag || !inside(g, r, c)) return g;
    if (x.mine) return game(g, g.grid.map(row => row.map(y => y.mine ? opened(y) : y)), g.left, true, false, r * g.cols + c);
    const grid = g.grid.map(row => row.slice());
    grid[r][c] = opened(x);
    if (x.near > 0) return withGrid(g, grid, g.left - 1);
    const n = flood(grid, g.rows, g.cols);
    return withGrid(g, grid, g.left - 1 - n);
  }
  function flag(g, r, c) {
    const x = cellAt(g, r, c);
    if (g.over || x.open || !inside(g, r, c)) return g;
    const grid = g.grid.slice(); grid[r] = grid[r].slice(); grid[r][c] = { mine: x.mine, near: x.near, open: false, flag: !x.flag };
    return game(g, grid, g.left, false, false, -1);
  }
  // a number's neighbours opened at once (k from 0 to 8 round the 3 by 3, the cell itself skipped), when as many flags are
  // around it as its number
  function chord(g, r, c) {
    const x = cellAt(g, r, c);
    if (g.over || !x.open || x.near === 0) return g;
    let fl = 0; for (let k = 0; k < 9; k++) if (k !== 4 && cellAt(g, r + Math.floor(k / 3) - 1, c + k % 3 - 1).flag) fl++;
    if (fl !== x.near) return g;
    for (let k = 0; k < 9; k++) if (k !== 4) g = reveal(g, r + Math.floor(k / 3) - 1, c + k % 3 - 1);
    return g;
  }
  const flags = g => g.grid.reduce((n, row) => n + row.reduce((m, x) => m + (x.flag ? 1 : 0), 0), 0);

  // ---- the hint: a sure move from the open numbers alone. Each open cell with closed neighbours is a number to reason
  // from, its closed neighbours [place, flagged] in Hazel's order: the column to its left (above, below, beside), its own
  // (above, below), the column to its right (above, below, beside)
  function numbers(g) {
    const { rows, cols } = g, out = [];
    const col = (r, c, mid, cs) => {
      if (c < 0 || c >= cols) return;
      for (const rr of mid ? [r - 1, r + 1, r] : [r - 1, r + 1]) if (rr >= 0 && rr < rows && !g.grid[rr][c].open) cs.push([rr * cols + c, g.grid[rr][c].flag]);
    };
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = g.grid[r][c]; if (!x.open) continue;
      const cs = []; col(r, c - 1, true, cs); col(r, c, false, cs); col(r, c + 1, true, cs);
      if (cs.length) out.push({ at: r * cols + c, near: x.near, cells: cs });
    }
    return out;
  }
  // the mines known so far, in the order Hazel's list holds them (the newest first): one pass over the numbers, each whose
  // unknown closed cells must all be mines adding them
  function minesFrom(ns, ms) {
    for (const n of ns) {
      const u = n.cells.filter(([p]) => !ms.has(p));
      const left = n.near - (n.cells.length - u.length);
      if (left > 0 && left === u.length) for (const [p, f] of u) ms.set(p, [p, f, n.at]);
    }
    return ms;
  }
  function safeFrom(ns, ms, wrong) {
    for (const n of ns) {
      const u = n.cells.filter(([p]) => !ms.has(p));
      if (n.cells.length - u.length !== n.near) continue;
      const q = u.find(([, f]) => f === wrong);
      if (q) return { kind: wrong ? 3 : 1, at: q[0], why: n.at };
    }
    return { kind: 0, at: -1, why: -1 };
  }
  // the sure move: kind 1 a safe cell to open; 3 a flag on a safe cell; 2 a mine not yet flagged; 0 none
  function sure(g) {
    if (g.over) return { kind: 0, at: -1, why: -1 };
    const ns = numbers(g), ms = minesFrom(ns, minesFrom(ns, new Map()));
    const s = safeFrom(ns, ms, false); if (s.kind) return s;
    const w = safeFrom(ns, ms, true); if (w.kind) return w;
    const all = [...ms.values()];
    for (let i = all.length - 1; i >= 0; i--) if (!all[i][1]) return { kind: 2, at: all[i][0], why: all[i][2] };
    return { kind: 0, at: -1, why: -1 };
  }

  const api = { fresh, lay, reveal, flag, chord, flags, sure, made: "plain JavaScript" };
  if (typeof window !== "undefined") window.MinesweeperPlain = api;
  if (typeof module !== "undefined") module.exports = api;
})();
