// hazeljs-oracles: each oracle's history of readings, kept in this browser's local storage (^ticket(734); Matthew, 2026-11-15:
// "retrieves past oracle readings with timestamps and outcomes, with a chance to open it as if it was just read (but with a new
// heading --- reading from <Date, Time>)"; "stores that data in browser local storage, for now").
//
// Each oracle has its own key, so the histories are separate. A record is {id, at, ...the oracle's own fields}; the page says
// how to sum one up in a line and how to open one. Newest first, at most KEEP of them. Storage can be missing or refused (a
// private window, blocked site data), so every read and write is guarded and the panel says when there is none.
window.OracleHistory = (() => {
  "use strict";
  const KEEP = 200;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  // "Sun 15 Nov 2026, 07:52", in the reader's own language and time zone
  const when = at => new Date(at).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  function store(key) {
    const read = () => { try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } };
    const write = list => { try { localStorage.setItem(key, JSON.stringify(list.slice(0, KEEP))); return true; } catch (e) { return false; } };
    const ok = (() => { try { const k = key + ":probe"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; } catch (e) { return false; } })();
    return {
      ok, list: read,
      add(rec) { const r = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: new Date().toISOString(), ...rec }; write([r, ...read()]); return r; },
      remove(id) { write(read().filter(r => r.id !== id)); },
      clear() { try { localStorage.removeItem(key); } catch (e) { /* nothing kept */ } },
    };
  }

  // The panel: a <details> in holder. summarize(rec) gives the line (a string or a node), open(rec) shows it as just read.
  function panel({ holder, key, summarize, open }) {
    const S = store(key);
    let current = null;
    const box = el("details", "history");
    const head = el("summary");
    const body = el("div", "history-body");
    box.append(head, body);
    holder.append(box);
    function draw() {
      const list = S.list();
      head.textContent = `🕰 History (${list.length ? list.length + (list.length === 1 ? " reading" : " readings") : "none yet"})`;
      body.replaceChildren();
      if (!S.ok) { body.append(el("p", "muted", "This browser keeps no history here (its storage is off for this page, as in a private window).")); return; }
      if (!list.length) { body.append(el("p", "muted", "Your readings are kept here, in this browser only, newest first.")); return; }
      const ol = el("ol", "history-list");
      for (const r of list) {
        const li = el("li", r.id === current ? "open" : "");
        const b = el("button", "history-open"); b.type = "button";
        b.append(el("span", "history-when", when(r.at)), el("span", "history-what"));
        const what = summarize(r); b.lastChild.append(what);
        b.title = "Open this reading again";
        b.addEventListener("click", () => { current = r.id; open(r, when(r.at)); draw(); });
        const x = el("button", "history-x", "✕"); x.type = "button"; x.title = "Forget this reading";
        x.setAttribute("aria-label", "Forget the reading from " + when(r.at));
        x.addEventListener("click", () => { S.remove(r.id); if (current === r.id) current = null; draw(); });
        li.append(b, x);
        ol.append(li);
      }
      const clear = el("button", "history-clear", "Forget them all"); clear.type = "button";
      clear.addEventListener("click", () => { if (confirm(`Forget all ${list.length} readings kept in this browser? This cannot be undone.`)) { S.clear(); current = null; draw(); } });
      const note = el("p", "muted history-note", "Kept in this browser only.");
      note.append(clear);
      body.append(ol, note);
    }
    addEventListener("storage", e => { if (e.key === key) draw(); });   // another tab's readings
    draw();
    return {
      add(rec) { const r = S.add(rec); current = r.id; draw(); return r; },
      // a new reading: nothing from the history is open
      leave() { if (current) { current = null; draw(); } },
      when,
    };
  }
  return { panel, when };
})();
