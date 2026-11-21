// hazeljs-examples, Mahjong solitaire's tiles (ticket 803): our own art, drawn on a canvas. A face is a number (as the rules
// have it): 0 to 8 dots 1 to 9, 9 to 17 bamboo, 18 to 26 characters, 27 to 30 the winds east, south, west, north, 31 to 33 the
// dragons red, green, white, 34 to 37 the flowers, 38 to 41 the seasons. draw(c, face, x, y, w, h) paints the face in the box.
(() => {
  "use strict";
  const BLUE = "#1d4ed8", GREEN = "#15803d", RED = "#b91c1c", NAVY = "#1e293b";
  const NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九"], WIND = ["東", "南", "西", "北"], WIND_EN = ["E", "S", "W", "N"];
  const NAMES = (() => { const n = [], suit = ["dots", "bamboo", "characters"];
    for (let s = 0; s < 3; s++) for (let k = 1; k <= 9; k++) n.push(`${k} ${suit[s]}`);
    return n.concat(["East wind", "South wind", "West wind", "North wind", "Red dragon", "Green dragon", "White dragon",
      "Plum (flower 1)", "Orchid (flower 2)", "Chrysanthemum (flower 3)", "Lotus (flower 4)", "Spring (season 1)", "Summer (season 2)", "Autumn (season 3)", "Winter (season 4)"]); })();
  // a dot: a coloured ring, a white ring inside, a dot at the middle
  function dot(c, x, y, r, col) {
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = "#fffdf5"; c.beginPath(); c.arc(x, y, r * 0.68, 0, 7); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, r * 0.36, 0, 7); c.fill();
  }
  const DOTS = [
    [[0.5, 0.5]], [[0.5, 0.27], [0.5, 0.73]], [[0.25, 0.2], [0.5, 0.5], [0.75, 0.8]], [[0.29, 0.27], [0.71, 0.27], [0.29, 0.73], [0.71, 0.73]],
    [[0.27, 0.22], [0.73, 0.22], [0.5, 0.5], [0.27, 0.78], [0.73, 0.78]], [[0.3, 0.2], [0.7, 0.2], [0.3, 0.5], [0.7, 0.5], [0.3, 0.8], [0.7, 0.8]],
    [[0.22, 0.13], [0.5, 0.25], [0.78, 0.37], [0.3, 0.62], [0.7, 0.62], [0.3, 0.86], [0.7, 0.86]],
    [[0.3, 0.13], [0.7, 0.13], [0.3, 0.38], [0.7, 0.38], [0.3, 0.62], [0.7, 0.62], [0.3, 0.87], [0.7, 0.87]],
    [[0.22, 0.18], [0.5, 0.18], [0.78, 0.18], [0.22, 0.5], [0.5, 0.5], [0.78, 0.5], [0.22, 0.82], [0.5, 0.82], [0.78, 0.82]]];
  const DOT_COL = n => (i, len) => n === 1 ? RED : n === 7 ? (i < 3 ? GREEN : RED) : n === 6 ? (i < 2 ? GREEN : RED) : n === 9 ? [BLUE, GREEN, RED][Math.floor(i / 3)] : [BLUE, GREEN, RED, BLUE, GREEN][i % 5];
  // a stick of bamboo: a green cane with joints
  function stick(c, x, y, w, h, col) {
    c.fillStyle = col; const r = w / 2;
    c.beginPath(); c.moveTo(x - r, y - h / 2 + r); c.arc(x, y - h / 2 + r, r, Math.PI, 0); c.lineTo(x + r, y + h / 2 - r); c.arc(x, y + h / 2 - r, r, 0, Math.PI); c.closePath(); c.fill();
    c.strokeStyle = "#fffdf5"; c.lineWidth = Math.max(1, w * 0.18);
    c.beginPath(); c.moveTo(x - r * 0.9, y); c.lineTo(x + r * 0.9, y); c.stroke();
    c.beginPath(); c.moveTo(x, y - h / 2 + r * 1.2); c.lineTo(x, y + h / 2 - r * 1.2); c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1;
  }
  const STICKS = [null, [[0.5, 0.27, 0], [0.5, 0.73, 0]], [[0.5, 0.27, 0], [0.3, 0.73, 0], [0.7, 0.73, 0]], [[0.3, 0.27, 0], [0.7, 0.27, 0], [0.3, 0.73, 0], [0.7, 0.73, 0]],
    [[0.27, 0.27, 0], [0.73, 0.27, 0], [0.5, 0.5, 1], [0.27, 0.73, 0], [0.73, 0.73, 0]], [[0.22, 0.27, 0], [0.5, 0.27, 0], [0.78, 0.27, 0], [0.22, 0.73, 0], [0.5, 0.73, 0], [0.78, 0.73, 0]],
    [[0.5, 0.18, 1], [0.22, 0.52, 0], [0.5, 0.52, 0], [0.78, 0.52, 0], [0.22, 0.83, 0], [0.5, 0.83, 0], [0.78, 0.83, 0]],
    [[0.16, 0.27, 0], [0.39, 0.27, 0], [0.61, 0.27, 0], [0.84, 0.27, 0], [0.16, 0.73, 0], [0.39, 0.73, 0], [0.61, 0.73, 0], [0.84, 0.73, 0]],
    [[0.22, 0.18, 0], [0.5, 0.18, 1], [0.78, 0.18, 0], [0.22, 0.5, 0], [0.5, 0.5, 1], [0.78, 0.5, 0], [0.22, 0.82, 0], [0.5, 0.82, 1], [0.78, 0.82, 0]]];
  // the one of bamboo: a bird on a cane
  function bird(c, x, y, w, h) {
    c.strokeStyle = GREEN; c.lineWidth = w * 0.05; c.lineCap = "round";
    for (const a of [-0.5, -0.2, 0.1, 0.4]) { c.beginPath(); c.moveTo(x - w * 0.05, y + h * 0.05); c.quadraticCurveTo(x - w * 0.25, y + h * (0.2 + a * 0.1), x - w * (0.36 - a * 0.1), y + h * (0.33 + a * 0.18)); c.stroke(); }
    c.fillStyle = GREEN; c.beginPath(); c.ellipse(x + w * 0.04, y, w * 0.2, h * 0.13, -0.5, 0, 7); c.fill();
    c.fillStyle = BLUE; c.beginPath(); c.arc(x + w * 0.2, y - h * 0.16, w * 0.09, 0, 7); c.fill();
    c.fillStyle = RED; c.beginPath(); c.moveTo(x + w * 0.18, y - h * 0.23); c.lineTo(x + w * 0.14, y - h * 0.33); c.lineTo(x + w * 0.24, y - h * 0.25); c.fill();
    c.beginPath(); c.moveTo(x + w * 0.28, y - h * 0.17); c.lineTo(x + w * 0.38, y - h * 0.14); c.lineTo(x + w * 0.28, y - h * 0.12); c.fill();
    c.fillStyle = "#fffdf5"; c.beginPath(); c.arc(x + w * 0.22, y - h * 0.17, w * 0.025, 0, 7); c.fill();
  }
  function glyph(c, ch, x, y, size, col, weight = 700) {
    c.fillStyle = col; c.font = `${weight} ${size}px "Noto Serif CJK SC", "Songti SC", "SimSun", "Noto Sans CJK SC", "PingFang SC", serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(ch, x, y);
  }
  function corner(c, t, x, y, w, col) { c.fillStyle = col; c.font = `700 ${Math.round(w * 0.2)}px system-ui, sans-serif`; c.textAlign = "left"; c.textBaseline = "top"; c.fillText(t, x + w * 0.07, y + w * 0.05); }
  function flower(c, x, y, w, h, col, k) {
    c.strokeStyle = GREEN; c.lineWidth = w * 0.05; c.beginPath(); c.moveTo(x, y + h * 0.02); c.quadraticCurveTo(x - w * 0.1, y + h * 0.2, x + w * 0.02, y + h * 0.36); c.stroke();
    c.fillStyle = GREEN; c.beginPath(); c.ellipse(x + w * 0.12, y + h * 0.22, w * 0.12, w * 0.05, -0.6, 0, 7); c.fill();
    c.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p * 2 * Math.PI / 5 - Math.PI / 2; c.beginPath(); c.ellipse(x + Math.cos(a) * w * 0.15, y - h * 0.12 + Math.sin(a) * w * 0.15, w * 0.13, w * 0.09, a, 0, 7); c.fill(); }
    c.fillStyle = "#facc15"; c.beginPath(); c.arc(x, y - h * 0.12, w * 0.07, 0, 7); c.fill();
    corner(c, String(k), x - w / 2, y - h / 2, w, col);
  }
  function season(c, f, x, y, w, h) {
    const k = f - 37;
    if (k === 1) { c.strokeStyle = GREEN; c.lineWidth = w * 0.06; c.beginPath(); c.moveTo(x, y + h * 0.3); c.lineTo(x, y - h * 0.05); c.stroke();
      c.fillStyle = "#22c55e"; for (const d of [-1, 1]) { c.beginPath(); c.ellipse(x + d * w * 0.15, y - h * 0.08, w * 0.17, w * 0.08, d * -0.5, 0, 7); c.fill(); }
      c.fillStyle = "#86efac"; c.beginPath(); c.ellipse(x, y - h * 0.2, w * 0.07, w * 0.13, 0, 0, 7); c.fill(); }
    else if (k === 2) { c.fillStyle = "#f97316"; c.strokeStyle = "#f97316"; c.lineWidth = w * 0.05; c.beginPath(); c.arc(x, y, w * 0.17, 0, 7); c.fill();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * w * 0.24, y + Math.sin(a) * w * 0.24); c.lineTo(x + Math.cos(a) * w * 0.34, y + Math.sin(a) * w * 0.34); c.stroke(); } }
    else if (k === 3) { c.fillStyle = "#dc2626"; c.beginPath();
      for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 0.16 : 0.33) * w; c.lineTo(x + Math.cos(a) * r, y - h * 0.03 + Math.sin(a) * r); } c.closePath(); c.fill();
      c.strokeStyle = "#7c2d12"; c.lineWidth = w * 0.04; c.beginPath(); c.moveTo(x, y - h * 0.03); c.lineTo(x, y + h * 0.3); c.stroke(); }
    else { c.strokeStyle = "#0284c7"; c.lineWidth = w * 0.045; c.lineCap = "round";
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, ex = x + Math.cos(a) * w * 0.3, ey = y + Math.sin(a) * w * 0.3; c.beginPath(); c.moveTo(x, y); c.lineTo(ex, ey); c.stroke();
        const mx = x + Math.cos(a) * w * 0.18, my = y + Math.sin(a) * w * 0.18; for (const d of [-0.6, 0.6]) { c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + Math.cos(a + d) * w * 0.09, my + Math.sin(a + d) * w * 0.09); c.stroke(); } } }
    corner(c, String(k), x - w / 2, y - h / 2, w, ["#16a34a", "#ea580c", "#dc2626", "#0284c7"][k - 1]);
  }
  function draw(c, f, x, y, w, h) {
    const cx = x + w / 2, cy = y + h / 2; c.save();
    if (f < 9) { const n = f + 1, col = DOT_COL(n); DOTS[n - 1].forEach(([u, v], i) => dot(c, x + u * w, y + v * h, n === 1 ? w * 0.33 : n > 6 ? w * 0.12 : w * 0.14, col(i))); }
    else if (f < 18) { const n = f - 8; if (n === 1) bird(c, cx, cy, w, h); else STICKS[n - 1].forEach(([u, v, red]) => stick(c, x + u * w, y + v * h, w * (n > 6 ? 0.12 : 0.14), h * (n > 6 ? 0.24 : 0.36), red ? RED : GREEN)); }
    else if (f < 27) { glyph(c, NUM[f - 18], cx, y + h * 0.3, Math.round(w * 0.42), NAVY); glyph(c, "萬", cx, y + h * 0.7, Math.round(w * 0.5), RED); }
    else if (f < 31) { glyph(c, WIND[f - 27], cx, cy + h * 0.04, Math.round(w * 0.66), NAVY); corner(c, WIND_EN[f - 27], x, y, w, "#64748b"); }
    else if (f === 31) glyph(c, "中", cx, cy, Math.round(w * 0.7), RED);
    else if (f === 32) glyph(c, "發", cx, cy, Math.round(w * 0.66), GREEN);
    else if (f === 33) { c.strokeStyle = BLUE; c.lineWidth = Math.max(1.5, w * 0.06); c.strokeRect(x + w * 0.2, y + h * 0.17, w * 0.6, h * 0.66); c.lineWidth = Math.max(1, w * 0.025); c.strokeRect(x + w * 0.28, y + h * 0.24, w * 0.44, h * 0.52); }
    else if (f < 38) flower(c, cx, cy, w, h, ["#e11d48", "#a855f7", "#eab308", "#0ea5e9"][f - 34], f - 33);
    else season(c, f, cx, cy, w, h);
    c.restore();
  }
  window.MsTiles = { draw, name: f => NAMES[f] || "" };
})();
