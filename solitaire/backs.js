// hazeljs-examples, Solitaire: the card backs, drawn here (CC BY 4.0, as the site's other drawings): thirteen designs, each in
// five colour themes. A back is a white card, a patterned field, a gold-edged oval, and in it the design's motif twice, one
// copy turned over, base to base, as court cards are drawn, so that the back looks the same either way up and a turned card
// cannot be told from the rest; a motif already the same either way up (the compass rose, the knot) is drawn once.
// SolitaireBacks.svg(design, theme) gives the back as SVG text; .designs and .themes list them, in the order offered.
(root => {
  "use strict";
  const THEMES = [
    { id: "blue", name: "Royal blue and gold", field: "#1d3a7a", line: "#8fb0f0", dot: "#e8c56f", panel: "#16306a", gold: "#e8c56f", ink: "#7a5a12" },
    { id: "magenta", name: "Magenta and black", field: "#141016", line: "#d6338a", dot: "#ff8ad0", panel: "#050405", gold: "#ff3da5", ink: "#ffd6ec" },
    { id: "green", name: "Forest green and cream", field: "#1f4d2e", line: "#9fc58a", dot: "#f3e6c4", panel: "#163a22", gold: "#f3e6c4", ink: "#5a4a2a" },
    { id: "crimson", name: "Crimson and ivory", field: "#8a1c24", line: "#f1b5a8", dot: "#f6e7c8", panel: "#6a1018", gold: "#f6e7c8", ink: "#5a2a1a" },
    { id: "silver", name: "Midnight and silver", field: "#22252e", line: "#8a93a6", dot: "#d9dde6", panel: "#14161b", gold: "#d9dde6", ink: "#4a5060" },
  ];
  // shapes, in the theme's colours: o, a filled shape outlined in ink; line, a thick stroke outlined in ink (two strokes); dot
  const o = (t, d, extra = "") => `<path d="${d}" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.3" stroke-linejoin="round" ${extra}/>`;
  const line = (t, d, w) => `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="${w + 2.6}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${t.gold}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  const mirror = s => `<g transform="scale(-1 1)">${s}</g>`;

  // ---- the motifs, each drawn upright in about x -55..55, y -64..28, its base at the bottom (paired: drawn twice)
  const lily = t => o(t, "M0 -62 C11 -50 15 -30 9 -12 C7 -6 5 -2 4 2 L-4 2 C-5 -2 -7 -6 -9 -12 C-15 -30 -11 -50 0 -62 Z") +
    [1, -1].map(s => `<g transform="scale(${s} 1)">${o(t, "M5 0 C9 -20 22 -34 37 -32 C50 -30 54 -16 46 -6 C42 -1 36 -1 33 -5 C38 -6 41 -11 39 -16 C36 -22 27 -22 20 -14 C15 -9 11 -3 9 3 Z")}${o(t, "M7 10 C9 18 15 24 22 22 C26 21 27 16 23 14 C21 18 16 18 13 10 Z")}</g>`).join("") +
    `<rect x="-21" y="1" width="42" height="9" rx="2.5" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.3"/>` + o(t, "M-4 10 L4 10 C4 17 2 23 0 28 C-2 23 -4 17 -4 10 Z");
  const lion = t => {
    // the mane: sixteen flames round the face; the face, ears, eyes, nose and muzzle
    let mane = "";
    for (let i = 0; i < 16; i++) { const a = i * 22.5; mane += `<g transform="translate(0 -20) rotate(${a})">${o(t, "M-9 -26 C-8 -38 -3 -46 0 -50 C3 -46 8 -38 9 -26 Z")}</g>`; }
    return mane + `<circle cx="0" cy="-20" r="30" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.3"/>` +
      [1, -1].map(s => `<g transform="scale(${s} 1)">${o(t, "M14 -44 C20 -52 30 -48 27 -38 Z")}<path d="M7 -26 C11 -31 18 -31 21 -26 C18 -21 11 -21 7 -26 Z" fill="${t.panel}" stroke="${t.ink}" stroke-width="1"/>${dot(14, -26, 2.2, t.ink)}` +
        `<circle cx="7" cy="-6" r="7" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.2"/>${dot(5, -7, 1, t.ink)}${dot(9, -4, 1, t.ink)}</g>`).join("") +
      `<path d="M-6 -16 L6 -16 L0 -8 Z" fill="${t.ink}"/><path d="M0 -8 L0 -2 M-6 3 C-3 6 3 6 6 3" fill="none" stroke="${t.ink}" stroke-width="1.6" stroke-linecap="round"/>`;
  };
  const salamander = t => {
    // a lizard in flames: head, body and a curling tail, four splayed legs with their toes, spots, and flames at its sides
    const foot = (x, y, a) => `<g transform="translate(${x} ${y}) rotate(${a})">${dot(0, -4, 2.2, t.gold)}${dot(-3.5, -2, 2.2, t.gold)}${dot(3.5, -2, 2.2, t.gold)}</g>`;
    const flame = (x, y, h, a) => `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-6 0 C-8 -10 -2 -14 0 ${-h} C2 -14 8 -10 6 0 C4 4 -4 4 -6 0 Z" fill="${t.gold}" fill-opacity="0.8" stroke="${t.ink}" stroke-width="1"/></g>`;
    return [[1, 1], [-1, -1]].map(([sx]) => `<g transform="scale(${sx} 1)">${flame(40, -24, 22, 12)}${flame(44, 2, 18, 20)}${flame(36, -48, 16, 4)}</g>`).join("") +
      line(t, "M10 -34 L24 -44", 5) + line(t, "M-10 -34 L-24 -44", 5) + line(t, "M9 -8 L24 2", 5) + line(t, "M-9 -8 L-24 2", 5) +
      foot(25, -45, 50) + foot(-25, -45, -50) + foot(25, 3, 120) + foot(-25, 3, -120) +
      o(t, "M0 -46 C10 -44 13 -30 12 -18 C11 -8 8 0 6 6 C4 14 8 20 16 22 C24 23 28 16 24 12 C30 14 30 26 18 28 C4 30 -4 20 -4 8 C-4 0 -10 -8 -11 -18 C-12 -30 -10 -44 0 -46 Z") +
      `<ellipse cx="0" cy="-52" rx="8" ry="11" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.3"/>${dot(-3.2, -55, 1.6, t.ink)}${dot(3.2, -55, 1.6, t.ink)}` +
      dot(3, -34, 2.4, t.panel) + dot(-4, -24, 2.4, t.panel) + dot(4, -14, 2.2, t.panel) + dot(-2, -2, 2, t.panel) + dot(2, 10, 1.8, t.panel);
  };
  const tiger = t => {
    // a tiger's face: broad cheeks, ears, eyes, nose, whisker spots and its stripes
    const stripes = [1, -1].map(s => `<g transform="scale(${s} 1)"><path d="M28 -30 C20 -28 16 -24 14 -18" fill="none" stroke="${t.ink}" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M32 -16 C24 -14 20 -12 18 -8" fill="none" stroke="${t.ink}" stroke-width="3" stroke-linecap="round"/><path d="M30 -2 C24 0 21 2 19 5" fill="none" stroke="${t.ink}" stroke-width="2.6" stroke-linecap="round"/>` +
      `${o(t, "M18 -48 C22 -60 34 -58 34 -44 Z")}<path d="M22 -50 C25 -55 30 -54 30 -47 Z" fill="${t.panel}"/>` +
      `<path d="M8 -30 C12 -34 19 -33 21 -28 C16 -26 11 -26 8 -30 Z" fill="${t.panel}" stroke="${t.ink}" stroke-width="1"/>${dot(14, -29.5, 1.8, t.ink)}` +
      `<circle cx="6" cy="-8" r="7" fill="${t.gold}" stroke="${t.ink}" stroke-width="1"/>${dot(4, -8, 1, t.ink)}${dot(8, -6, 1, t.ink)}${dot(8, -10, 1, t.ink)}</g>`).join("");
    return o(t, "M0 -54 C22 -54 38 -42 38 -18 C38 4 22 18 0 20 C-22 18 -38 4 -38 -18 C-38 -42 -22 -54 0 -54 Z") + stripes +
      `<path d="M-6 -48 L0 -40 L6 -48 M-10 -42 L0 -34 L10 -42" fill="none" stroke="${t.ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M-6 -18 L6 -18 L0 -11 Z" fill="${t.ink}"/><path d="M0 -11 L0 -4 M-6 1 C-3 4 3 4 6 1" fill="none" stroke="${t.ink}" stroke-width="1.6" stroke-linecap="round"/>`;
  };
  const leafAt = (t, x, y, a, l = 16, w = 7) => `<g transform="translate(${x} ${y}) rotate(${a})">${o(t, `M0 0 C${w} ${-l * 0.35} ${w * 0.6} ${-l * 0.8} 0 ${-l} C${-w * 0.6} ${-l * 0.8} ${-w} ${-l * 0.35} 0 0 Z`)}<path d="M0 0 L0 ${-l * 0.85}" stroke="${t.ink}" stroke-width="0.8"/></g>`;
  const leaves = t => line(t, "M0 26 C3 0 -3 -30 0 -60", 4) +
    [[-1, 14, -52, 30], [1, 0, 52, 30], [-1, -16, -44, 28], [1, -30, 44, 26], [0, -46, -34, 22], [0, -46, 34, 22]].map(([x, y, a, l]) => leafAt(t, x, y, a, l, 12)).join("") +
    leafAt(t, 0, -58, 0, 20, 10);
  const flowers = t => {
    // a blossom on a curving stem, a leaf either side, and the vine's tendrils curling away
    const petals = Array.from({ length: 6 }, (_, i) => `<g transform="translate(0 -40) rotate(${i * 60})">${o(t, "M0 0 C11 -8 12 -21 0 -28 C-12 -21 -11 -8 0 0 Z")}</g>`).join("");
    return line(t, "M0 26 C-10 10 10 -6 0 -22", 3) +
      `<path d="M2 4 C14 0 24 -8 30 -20 C34 -28 28 -34 24 -28 C21 -24 26 -22 27 -24" fill="none" stroke="${t.gold}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<path d="M-2 12 C-14 10 -26 2 -32 -10 C-36 -18 -30 -24 -26 -18 C-23 -14 -28 -12 -29 -14" fill="none" stroke="${t.gold}" stroke-width="2.2" stroke-linecap="round"/>` +
      leafAt(t, -2, 8, -70, 26, 11) + leafAt(t, 3, -6, 65, 24, 10) + petals + `<circle cx="0" cy="-40" r="8" fill="${t.panel}" stroke="${t.ink}" stroke-width="1.2"/>${dot(0, -40, 2.5, t.gold)}`;
  };
  const hazelnut = t =>
    // Hazel's own: a hazelnut in its frilled husk, on a stalk with two leaves
    line(t, "M0 26 C0 16 0 8 0 2", 3) + leafAt(t, 0, 16, -60, 22, 10) + leafAt(t, 0, 12, 60, 22, 10) +
    o(t, "M0 -60 C14 -56 22 -40 20 -24 C18 -10 10 -4 0 -4 C-10 -4 -18 -10 -20 -24 C-22 -40 -14 -56 0 -60 Z") +
    `<path d="M-8 -50 C-12 -40 -12 -26 -8 -14" fill="none" stroke="${t.ink}" stroke-width="1" stroke-opacity="0.6"/>` +
    o(t, "M-22 -12 C-16 -16 -10 -10 -6 -14 C-2 -10 2 -10 6 -14 C10 -10 16 -16 22 -12 C20 -4 12 4 0 4 C-12 4 -20 -4 -22 -12 Z");
  const peacock = t => {
    // a feather: its quill, its fine barbs, and the eye at its tip
    let barbs = "";
    for (let i = 0; i < 9; i++) { const y = 20 - i * 9, w = 10 + i * 2.6; barbs += `<path d="M0 ${y} C${w * 0.6} ${y - 4} ${w} ${y - 10} ${w + 4} ${y - 16} M0 ${y} C${-w * 0.6} ${y - 4} ${-w} ${y - 10} ${-w - 4} ${y - 16}" fill="none" stroke="${t.gold}" stroke-width="1.2" stroke-opacity="0.85"/>`; }
    return barbs + line(t, "M0 28 L0 -30", 2.4) +
      `<ellipse cx="0" cy="-42" rx="17" ry="22" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.3"/><ellipse cx="0" cy="-40" rx="11" ry="15" fill="${t.panel}" stroke="${t.ink}" stroke-width="1"/>` +
      `<ellipse cx="0" cy="-38" rx="6" ry="8" fill="${t.gold}"/>${dot(0, -36, 2.5, t.panel)}`;
  };
  const butterfly = t =>
    // wings open, its body and feelers
    [1, -1].map(s => `<g transform="scale(${s} 1)">${o(t, "M2 -20 C10 -46 40 -58 48 -40 C54 -26 36 -14 4 -14 Z")}${o(t, "M2 -12 C20 -12 40 -2 36 14 C32 26 12 18 3 -4 Z")}` +
      `${dot(30, -38, 5, t.panel)}${dot(22, 6, 4, t.panel)}<path d="M1 -24 C4 -36 8 -44 14 -50" fill="none" stroke="${t.ink}" stroke-width="1.4" stroke-linecap="round"/>${dot(14, -50, 2.2, t.ink)}</g>`).join("") +
    `<ellipse cx="0" cy="-10" rx="3.6" ry="18" fill="${t.ink}"/>`;
  // ---- motifs the same either way up, drawn once, centred, in about x -66..66, y -110..110
  const compass = t => {
    const pt = (a, l, w) => `<g transform="rotate(${a})">${o(t, `M0 ${-l} L${w} 0 L0 ${w * 0.6} L${-w} 0 Z`)}<path d="M0 ${-l} L0 0" stroke="${t.ink}" stroke-width="1"/></g>`;
    return `<circle r="58" fill="none" stroke="${t.gold}" stroke-width="2"/><circle r="50" fill="none" stroke="${t.gold}" stroke-width="1" stroke-dasharray="2 4"/>` +
      [45, 135, 225, 315].map(a => pt(a, 52, 10)).join("") + [0, 90, 180, 270].map(a => pt(a, a % 180 === 0 ? 104 : 64, 14)).join("") +
      `<circle r="9" fill="${t.panel}" stroke="${t.gold}" stroke-width="2"/>${dot(0, 0, 3, t.gold)}`;
  };
  const knot = t => {
    // two rings woven, each over the other twice, the same either way up
    const v = "M0 -96 C34 -96 34 96 0 96 C-34 96 -34 -96 0 -96 Z", h = "M-60 0 C-60 -34 60 -34 60 0 C60 34 -60 34 -60 0 Z";
    const ring = d => `<path d="${d}" fill="none" stroke="${t.ink}" stroke-width="13"/><path d="${d}" fill="none" stroke="${t.gold}" stroke-width="9"/>`;
    return `<defs><clipPath id="kw"><circle cx="24" cy="-22" r="14"/><circle cx="-24" cy="22" r="14"/></clipPath></defs>` + ring(h) + ring(v) +
      `<g clip-path="url(#kw)">${ring(h)}</g>` + `<circle r="7" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.3"/>`;
  };
  const sun = t => {
    let rays = "";
    for (let i = 0; i < 16; i++) rays += `<g transform="rotate(${i * 22.5})">${o(t, i % 2 ? "M0 -40 L5 -58 L0 -66 L-5 -58 Z" : "M0 -40 L7 -62 L0 -80 L-7 -62 Z")}</g>`;
    return rays + `<circle r="38" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.5"/><circle r="30" fill="none" stroke="${t.ink}" stroke-width="1" stroke-dasharray="3 3"/><circle r="18" fill="${t.panel}" stroke="${t.ink}" stroke-width="1.2"/>${dot(0, 0, 7, t.gold)}`;
  };
  const diamond = t => [[0, -62, 30], [0, 62, 30], [0, 0, 40], [-38, 0, 14], [38, 0, 14], [0, -112, 12], [0, 112, 12]].map(([x, y, r]) =>
    `<path d="M${x} ${y - r * 1.4} L${x + r} ${y} L${x} ${y + r * 1.4} L${x - r} ${y} Z" fill="${t.gold}" stroke="${t.ink}" stroke-width="1.3"/>` +
    (r > 20 ? `<path d="M${x} ${y - r * 0.9} L${x + r * 0.64} ${y} L${x} ${y + r * 0.9} L${x - r * 0.64} ${y} Z" fill="${t.panel}"/>${dot(x, y, r * 0.18, t.gold)}` : "")).join("");

  // ---- the fields behind the oval
  const field = (kind, t) => {
    if (kind === "stripes") return `<pattern id="fp" width="40" height="22" patternUnits="userSpaceOnUse"><rect width="40" height="22" fill="${t.field}"/><path d="M-2 4 C8 2 14 8 22 6 C30 4 34 9 42 7 L42 11 C34 13 30 9 22 11 C14 13 8 7 -2 9 Z" fill="${t.line}" fill-opacity="0.85"/></pattern>`;
    if (kind === "waves") return `<pattern id="fp" width="24" height="12" patternUnits="userSpaceOnUse"><rect width="24" height="12" fill="${t.field}"/>${[0, 24].map(x => [10, 6.5, 3].map(r => `<circle cx="${x}" cy="12" r="${r}" fill="${t.field}" stroke="${t.line}" stroke-width="1.1"/>`).join("")).join("")}${[10, 6.5, 3].map(r => `<circle cx="12" cy="6" r="${r}" fill="${t.field}" stroke="${t.line}" stroke-width="1.1"/>`).join("")}</pattern>`;
    if (kind === "argyle") return `<pattern id="fp" width="28" height="40" patternUnits="userSpaceOnUse"><rect width="28" height="40" fill="${t.field}"/><path d="M14 0 L28 20 L14 40 L0 20 Z" fill="${t.line}" fill-opacity="0.35"/><path d="M0 0 L28 40 M28 0 L0 40" stroke="${t.dot}" stroke-width="0.8" stroke-dasharray="3 3"/></pattern>`;
    if (kind === "vines") return `<pattern id="fp" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="${t.field}"/><path d="M0 15 C8 5 22 25 30 15" fill="none" stroke="${t.line}" stroke-width="1.2"/><path d="M8 9 C10 5 14 6 12 10 Z M22 21 C20 25 16 24 18 20 Z" fill="${t.line}"/>${dot(15, 15, 1.6, t.dot)}</pattern>`;
    return `<pattern id="fp" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="18" height="18" fill="${t.field}"/><path d="M0 0H18M0 0V18" stroke="${t.line}" stroke-width="2"/><circle cx="9" cy="9" r="1.8" fill="${t.dot}"/></pattern>`;
  };

  const DESIGNS = [
    { id: "lily", name: "Fleurs-de-lis", motif: lily, field: "lattice" },
    { id: "lion", name: "Lions", motif: lion, field: "lattice" },
    { id: "salamander", name: "Salamanders", motif: salamander, field: "lattice" },
    { id: "tiger", name: "Tigers", motif: tiger, field: "stripes" },
    { id: "leaves", name: "Leaves", motif: leaves, field: "vines" },
    { id: "flowers", name: "Flowers and vines", motif: flowers, field: "vines" },
    { id: "hazelnut", name: "Hazelnuts", motif: hazelnut, field: "lattice" },
    { id: "peacock", name: "Peacock feathers", motif: peacock, field: "lattice" },
    { id: "butterfly", name: "Butterflies", motif: butterfly, field: "vines" },
    { id: "compass", name: "Compass rose", motif: compass, field: "lattice", once: true },
    { id: "knot", name: "Woven knot", motif: knot, field: "lattice", once: true },
    { id: "waves", name: "Waves and sun", motif: sun, field: "waves", once: true },
    { id: "diamonds", name: "Diamonds", motif: diamond, field: "argyle", once: true },
  ];
  function svg(designId, themeId) {
    const d = DESIGNS.find(x => x.id === designId) || DESIGNS[0], t = THEMES.find(x => x.id === themeId) || THEMES[0];
    const m = d.motif(t);
    const art = d.once ? `<g>${m}</g>` : `<g transform="translate(0 -36) scale(1.12)">${m}</g><g transform="rotate(180) translate(0 -36) scale(1.12)">${m}</g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-120 -168 240 336" width="240" height="336"><title>${d.name}, ${t.name}</title><defs>${field(d.field, t)}</defs>` +
      `<rect x="-119" y="-167" width="238" height="334" rx="12" fill="#fff" stroke="#3a3a3a" stroke-width="1"/>` +
      `<rect x="-106" y="-154" width="212" height="308" rx="8" fill="url(#fp)" stroke="${t.field}" stroke-width="3"/>` +
      `<rect x="-98" y="-146" width="196" height="292" rx="6" fill="none" stroke="${t.gold}" stroke-width="2"/>` +
      `<ellipse rx="74" ry="126" fill="${t.panel}" stroke="${t.gold}" stroke-width="4"/><ellipse rx="66" ry="118" fill="none" stroke="${t.gold}" stroke-width="1.2" stroke-opacity="0.7"/>` +
      art + `</svg>`;
  }
  root.SolitaireBacks = { designs: DESIGNS.map(({ id, name }) => ({ id, name })), themes: THEMES.map(({ id, name }) => ({ id, name })), svg };
})(typeof window !== "undefined" ? window : globalThis);
