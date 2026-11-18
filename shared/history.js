// hazeljs-oracles: each oracle's history of readings, kept in this browser's local storage (^ticket(734); Matthew, 2026-11-15:
// "retrieves past oracle readings with timestamps and outcomes, with a chance to open it as if it was just read (but with a new
// heading --- reading from <Date, Time>)"; "stores that data in browser local storage, for now").
//
// Each oracle has its own key, so the histories are separate. A record is {id, at, ...the oracle's own fields}; the page says
// how to sum one up in a line and how to open one. Newest first, at most KEEP of them. Storage can be missing or refused (a
// private window, blocked site data), so every read and write is guarded and the panel says when there is none.
//
// (0.0.16; Matthew, 2026-11-18: "for each history item: add note, which adds free-form text from the user, with a timestamp;
// as they revisit the history, they may take notes and want to add them directly to this history. each note can be shown
// (default), hidden, or removed. add an emoji (default is a red heart).") A record may also carry notes, [{id, at, text,
// hidden}], oldest first, and one emoji. 📝 writes a note under the reading (Ctrl+Enter saves, Esc leaves it); each note
// can be hidden, shown again, or removed. ♡ marks the reading with a red heart, and pressing the mark again chooses another
// or none.
window.OracleHistory = (() => {
  "use strict";
  const KEEP = 200, NOTE_MAX = 2000;
  const EMOJI = ["❤️", "⭐", "✨", "🌙", "☀️", "🔥", "💧", "🌱", "🙏", "🤔", "😮", "😢"];
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  // "Sun 15 Nov 2026, 07:52", in the reader's own language and time zone
  const when = at => new Date(at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  function store(key) {
    const read = () => { try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    const write = list => { try { localStorage.setItem(key, JSON.stringify(list.slice(0, KEEP))); return true; } catch (e) { return false; } };
    const ok = (() => { try { const k = key + ":probe"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
    return {
      ok, list: read,
      add(rec) { const r = { id: newId(), at: new Date().toISOString(), ...rec }; write([r, ...read()]); return r; },
      // f: the record, a copy, to the record as it should be
      update(id, f) { const list = read(), i = list.findIndex(r => r.id === id); if (i < 0) return null; list[i] = f({ ...list[i] }); write(list); return list[i]; },
      remove(id) { write(read().filter(r => r.id !== id)); },
      clear() { try { localStorage.removeItem(key); } catch (e) { /* nothing kept */ } },
    };
  }

  // The panel: a <details> in holder. summarize(rec) gives the line (a string or a node), open(rec) shows it as just read.
  // (0.0.17, for astrology) noun: what a record is, one and many; empty(): the words when there is none; foot(): a line
  // above "Forget them all", or none.
  const button = (cls, text, title, onclick) => { const b = el("button", cls, text); b.type = "button"; if (title) b.title = title; b.addEventListener("click", onclick); return b; };
  function panel({ holder, key, summarize, open, noun = ["reading", "readings"], empty = null, foot = null }) {
    const S = store(key);
    let current = null;
    let picking = null;        // the reading whose emoji is being chosen
    let composing = null;      // {id, text}: a note being written, kept across redraws (another tab's readings redraw)
    let focusNote = false;
    const box = el("details", "history");
    const head = el("summary");
    const body = el("div", "history-body");
    box.append(head, body);
    holder.append(box);
    function draw() {
      const list = S.list();
      head.textContent = `🕰 History (${list.length ? list.length + " " + (list.length === 1 ? noun[0] : noun[1]) : "none yet"})`;
      body.replaceChildren();
      if (!S.ok) { body.append(el("p", "muted", "This browser keeps no history here (its storage is off for this page, as in a private window).")); return; }
      if (!list.length) { body.append(el("p", "muted", empty ? empty() : "Your readings are kept here, in this browser only, newest first.")); return; }
      const ol = el("ol", "history-list");
      for (const r of list) {
        const li = el("li", r.id === current ? "open" : "");
        const row = el("div", "history-row");
        const b = el("button", "history-open"); b.type = "button";
        b.append(el("span", "history-when", when(r.at)), el("span", "history-what"));
        const what = summarize(r); b.lastChild.append(what);
        b.title = `Open this ${noun[0]} again`;
        b.addEventListener("click", () => { current = r.id; open(r, when(r.at)); draw(); });
        const em = button("history-emoji" + (r.emoji ? "" : " none"), r.emoji || "♡",
          r.emoji ? `Change this ${noun[0]}'s emoji, or take it off` : `Mark this ${noun[0]} with an emoji: a red heart, then another if you like`,
          () => { if (!r.emoji) S.update(r.id, x => ({ ...x, emoji: "❤️" })); else picking = picking === r.id ? null : r.id; draw(); });
        em.setAttribute("aria-label", (r.emoji ? "The emoji " + r.emoji + " on" : "Mark") + ` the ${noun[0]} from ` + when(r.at));
        const nb = button("history-note-add", "📝", `Add a note to this ${noun[0]}`,
          () => { composing = { id: r.id, text: composing && composing.id === r.id ? composing.text : "" }; focusNote = true; draw(); });
        nb.setAttribute("aria-label", `Add a note to the ${noun[0]} from ` + when(r.at));
        const x = el("button", "history-x", "✕"); x.type = "button"; x.title = `Forget this ${noun[0]}`;
        x.setAttribute("aria-label", `Forget the ${noun[0]} from ` + when(r.at));
        x.addEventListener("click", () => { S.remove(r.id); if (current === r.id) current = null; draw(); });
        row.append(b, em, nb, x);
        li.append(row);
        if (picking === r.id) {
          const pk = el("div", "history-picker");
          for (const e of EMOJI) pk.append(button("history-pick" + (e === r.emoji ? " on" : ""), e, "Mark it " + e, () => { S.update(r.id, x => ({ ...x, emoji: e })); picking = null; draw(); }));
          pk.append(button("history-pick off", "none", "Take the emoji off", () => { S.update(r.id, x => { delete x.emoji; return x; }); picking = null; draw(); }));
          li.append(pk);
        }
        const notes = Array.isArray(r.notes) ? r.notes : [];
        if (notes.length) {
          const ul = el("ul", "history-notes");
          const setNotes = f => { S.update(r.id, x => ({ ...x, notes: f(Array.isArray(x.notes) ? x.notes : []) })); draw(); };
          for (const n of notes) {
            const ni = el("li", n.hidden ? "hidden-note" : "");
            ni.append(el("span", "history-when", when(n.at)));
            if (n.hidden) ni.append(el("span", "muted history-n-hidden", " · a note, hidden"));
            const tools = el("span", "history-n-tools");
            tools.append(
              button("", n.hidden ? "show" : "hide", n.hidden ? "Show this note" : "Hide this note (it is kept)", () => setNotes(ns => ns.map(m => m.id === n.id ? { ...m, hidden: !m.hidden } : m))),
              button("", "remove", "Remove this note", () => { if (confirm("Remove this note? It cannot be undone.")) setNotes(ns => ns.filter(m => m.id !== n.id)); }));
            ni.append(tools);
            if (!n.hidden) ni.append(el("div", "history-n-text", n.text));
            ul.append(ni);
          }
          li.append(ul);
        }
        if (composing && composing.id === r.id) {
          const f = el("div", "history-compose");
          const ta = el("textarea"); ta.rows = 3; ta.maxLength = NOTE_MAX; ta.value = composing.text;
          ta.placeholder = `A note on this ${noun[0]}, for you: what you make of it now…`;
          ta.setAttribute("aria-label", `A note on the ${noun[0]} from ` + when(r.at));
          const save = () => {
            const text = ta.value.trim();
            if (text) S.update(r.id, x => ({ ...x, notes: [...(Array.isArray(x.notes) ? x.notes : []), { id: newId(), at: new Date().toISOString(), text }] }));
            composing = null; draw();
          };
          const leave = () => { composing = null; draw(); };
          ta.addEventListener("input", () => { if (composing) composing.text = ta.value; });
          ta.addEventListener("keydown", e => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
            else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); leave(); }
          });
          const btns = el("div", "history-compose-btns");
          btns.append(button("primary", "Save the note", `Save it under this ${noun[0]}, with the time (Ctrl+Enter)`, save), button("", "Cancel", "Leave it unsaved (Esc)", leave));
          f.append(ta, btns);
          li.append(f);
          if (focusNote) { focusNote = false; setTimeout(() => ta.focus(), 0); }
        }
        ol.append(li);
      }
      const clear = el("button", "history-clear", "Forget them all"); clear.type = "button";
      clear.addEventListener("click", () => { if (confirm(`Forget all ${list.length} ${list.length === 1 ? noun[0] : noun[1]} kept in this browser? This cannot be undone.`)) { S.clear(); current = null; draw(); } });
      const note = el("p", "muted history-note", (foot && foot() ? foot() + " " : "") + "Kept in this browser only.");
      note.append(clear);
      body.append(ol, note);
    }
    addEventListener("storage", e => { if (e.key === key) draw(); });   // another tab's readings
    draw();
    return {
      add(rec) { const r = S.add(rec); current = r.id; draw(); return r; },
      // a new reading: nothing from the history is open
      leave() { if (current) { current = null; draw(); } },
      // (0.0.17) the records, newest first; and drawn again, when what empty() or foot() says has changed
      list: () => S.list(),
      redraw: () => draw(),
      when,
    };
  }
  return { panel, when };
})();
