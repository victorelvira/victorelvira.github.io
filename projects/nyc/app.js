// New Year's Concert, prototype of the lighter view. No libraries.
// Data: nyc/{catalogue,composers,conductors,concerts}.js (the published files) and
// nyc/performances.js (notes about a piece in a given concert; prototype only).
"use strict";

const DATA_V = "1.2.1";
const BUILD_AT = "2026-10-13 21:50";

// --- indexes ---------------------------------------------------------------------------------
const CONCERTS = [...concerts].sort((a, b) => a.year - b.year);
const N = CONCERTS.length;
const BY_YEAR = new Map(CONCERTS.map(c => [c.year, c]));
const PIECE = new Map(catalogue.map(p => [p.piece_id, p]));
const COMPOSER = new Map(composers.map(c => [c.id, c]));
const CONDUCTOR = new Map(conductors.map(c => [c.id, c]));
const PERF = typeof performances === "object" ? performances : {};
// concerts announced but not yet played (data/ids/announced.csv): only the conductor is known
// 31 December 1939: kept and coloured like any concert, shown apart because the orchestra's numbered series
// starts on 1 January 1941 ("1st New Year's Concert" on its concert archive page)
const FORERUNNER = 1939;
const ANNOUNCED = new Map((typeof announced === "object" ? announced : [])
  .filter(a => !BY_YEAR.has(a.year)).map(a => [a.year, a]));
const LAST_YEAR = Math.max(CONCERTS[N - 1].year, ...ANNOUNCED.keys());
const conductorIdOf = y => (BY_YEAR.get(y) || ANNOUNCED.get(y)).conductor_id;
// title and date as the orchestra's own page gives them (data/sources/wph), e.g. 1939 was on 31 December
const META = typeof concert_meta === "object" ? concert_meta : {};
const dateOf = y => {
  const d = (META[y] || {}).date;
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

// piece_id -> [{year, pos}] in chronological order
const PLAYS = new Map();
CONCERTS.forEach(c => c.program.piece_id.forEach((pid, i) => {
  if (!PLAYS.has(pid)) PLAYS.set(pid, []);
  PLAYS.get(pid).push({ year: c.year, pos: i + 1 });
}));

// --- colour: what the tiles encode can be chosen ("Colour by") --------------------------------
// One categorical encoding (conductor: the og.jpg palette, grey for the rest) and several
// quantities on one sequential ramp. A quantity we do not have yet is listed and disabled.
// Every conductor with 3 or more concerts gets a colour; the others share a light grey.
const PALETTE = { "Willi Boskovsky": "#d8a854", "Clemens Krauss": "#aa585c", "Lorin Maazel": "#608ab2",
  "Riccardo Muti": "#6c9c76", "Zubin Mehta": "#a880b2", "Mariss Jansons": "#3f9a9b",
  "Daniel Barenboim": "#d0834a", "Franz Welser-Moest": "#3d4f7a" };
const REST = "#b4b8c4";
const conductorOf = c => CONDUCTOR.get(c.conductor_id);
// A joint work ("Johann Strauß II., Josef Strauß") belongs to each of its authors. Single people are
// looked up by name in composers.js; the joint ids (8, 21, 24) are never shown as one "composer".
const namesOf = p => p.composer.split(/,\s*(?=[A-ZÉ])/);
const NAME2ID = new Map(composers.filter(c => !/,/.test(c.name)).map(c => [c.name, c.id]));
const byComposer = (p, cid) => namesOf(p).includes(COMPOSER.get(cid).name);
const people = c => new Set(c.program.piece_id.flatMap(p => namesOf(PIECE.get(p))));
const firstYearOf = new Map();
CONCERTS.forEach(c => c.program.piece_id.forEach(p => { if (!firstYearOf.has(p)) firstYearOf.set(p, c.year); }));
const GOLD = "#8f6d2d";            // the year buttons of the published page
const METRICS = {
  none: { label: "None", kind: "plain" },
  conductor: { label: "Conductor", kind: "cat" },
  pieces: { label: "Pieces", kind: "seq", unit: "pieces", value: c => c.program.piece_id.length },
  composers: { label: "Composers", kind: "seq", unit: "composers", value: c => people(c).size },
  fresh: { label: "New pieces", kind: "seq", unit: "pieces new to the concert",
    value: c => c.program.piece_id.filter(p => firstYearOf.get(p) === c.year).length },
  beyond: { label: "Beyond Strauss", kind: "seq", unit: "% by composers outside the Strauss family",
    value: c => Math.round(100 * c.program.piece_id.filter(p => !/Strau(ß|ss)/.test(PIECE.get(p).composer)).length / c.program.piece_id.length) },
  // minutes of music on the official disc, only where the disc has every piece of that concert
  duration: { label: "Duration", kind: "seq", unit: "minutes on the official recording (applause included)",
    value: c => concertMinutes(c) },
};
// The whole concert's length, from the track lengths of the confirmed disc; null when the disc lacks any piece.
// (recordings.js is loaded before this file; REC is defined further down, so it is read here directly.)
function concertMinutes(c) {
  const d = ((typeof recordings === "object" ? recordings.durations : {}) || {})[c.year];
  if (!d) return null;
  const n = c.program.piece_id.length;
  let s = 0;
  for (let p = 1; p <= n; p++) { if (!d[p]) return null; s += d[p]; }
  return Math.round(s / 60);
}
const NO_VALUE = "#e9e6df";   // a concert with nothing to measure
const RAMP = ["#f4ead0", "#e2c27a", "#b98a2e", "#7a5418", "#3e2a0c"];   // pale gilt to dark bronze
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = s => [(s >> 16) & 255, (s >> 8) & 255, s & 255];
  const [x, y] = [ch(pa), ch(pb)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function rampAt(t) {
  const k = Math.min(RAMP.length - 2, Math.floor(t * (RAMP.length - 1)));
  return mix(RAMP[k], RAMP[k + 1], t * (RAMP.length - 1) - k);
}
let colourBy = "none";
const range = {};
Object.entries(METRICS).forEach(([k, m]) => {
  if (m.kind !== "seq") return;
  const vs = CONCERTS.map(m.value).filter(v => v !== null);
  range[k] = [Math.min(...vs), Math.max(...vs)];
});
function colourOf(c) {
  const m = METRICS[colourBy];
  if (m.kind === "plain") return GOLD;
  if (m.kind !== "seq") return PALETTE[conductorOf(c).name] || REST;
  const [lo, hi] = range[colourBy];
  const v = m.value(c);
  if (v === null) return NO_VALUE;
  return rampAt(hi > lo ? (v - lo) / (hi - lo) : 0);
}
function tipOf(c) {
  const m = METRICS[colourBy];
  const d = (META[c.year] || {}).date;
  return `${c.year}${d && !d.endsWith("-01-01") ? ` (${dateOf(c.year)})` : ""} · ${conductorOf(c).name}` + (m.kind === "seq" ? (m.value(c) === null ? " · no complete recording"
    : ` · ${m.value(c)}${colourBy === "beyond" ? "%" : colourBy === "duration" ? " min" : ""} ${colourBy === "duration" ? "on the official disc" : m.label.toLowerCase()}`) : "");
}

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
const ordinal = n => n + (["th", "st", "nd", "rd"][((n % 100) - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");
function splitOp(title) {
  const m = title.match(/^(.*?),\s*(op\.?\s?\S.*)$/i);
  return m ? { t: m[1], op: m[2] } : { t: title, op: "" };
}
const isNarrow = () => matchMedia("(max-width: 760px)").matches;
const $ = id => document.getElementById(id);

// --- state and the address -------------------------------------------------------------------
// #1987               a concert
// #1987/12            the 12th piece of that concert, as performed then
// #1987/piece-132     a piece, across all concerts
// #1987/composer-20   a composer
// #1987/conductor     the conductor of that concert
// Moves (another concert, another card) push a history entry; closing a card goes back.
const state = { year: CONCERTS[N - 1].year, card: null, pushedCard: false, view: "concerts" };

function hashOf(s) {
  if (s.view !== "concerts") return "#" + s.view;
  if (!s.card) return "#" + s.year;
  const c = s.card;
  return "#" + s.year + "/" + (c.kind === "perf" ? c.pos : c.kind === "conductor" ? "conductor" : `${c.kind}-${encodeURIComponent(c.id)}`);
}
function readHash() {
  const raw = decodeURIComponent(location.hash.slice(1));
  if (raw === "analysis" || raw === "catalogue") return { year: state.year, card: null, view: raw, section: null };
  if (raw.startsWith("analysis/")) return { year: state.year, card: null, view: "analysis", section: raw.slice(9) };
  // a card with no year (#piece-10, #composer-20, #type-Waltz, #conductor-7): the piece, person or form
  // across all concerts, opened beside the latest concert (a conductor's: beside their latest one)
  const bare = raw.match(/^(piece|composer|conductor)-(\d+)$/) || raw.match(/^(type)-(.+)$/);
  if (bare) {
    const kind = bare[1], id = kind === "type" ? bare[2] : Number(bare[2]);
    const mine = kind === "conductor" ? CONCERTS.filter(c => c.conductor_id === id) : [];
    const year = mine.length ? mine[mine.length - 1].year : CONCERTS[N - 1].year;
    return { year, card: { kind, id }, view: "concerts" };
  }
  const [y, sel] = raw.split("/");
  const year = BY_YEAR.has(Number(y)) || ANNOUNCED.has(Number(y)) ? Number(y) : CONCERTS[N - 1].year;
  let card = null;
  if (sel) {
    if (/^\d+$/.test(sel)) card = { kind: "perf", pos: Number(sel) };
    else if (sel === "conductor") card = { kind: "conductor", id: conductorIdOf(year) };
    else {
      const m = sel.match(/^(piece|composer)-(\d+)$/);
      const t = sel.match(/^type-(.+)$/);
      if (m) card = { kind: m[1], id: Number(m[2]) };
      else if (t) card = { kind: "type", id: t[1] };
    }
  }
  return { year, card, view: "concerts" };
}
function go(year, card, how = "push") {
  state.year = year;
  state.card = card;
  state.view = "concerts";
  const h = hashOf(state);
  if (h !== location.hash) history[how === "push" ? "pushState" : "replaceState"](null, "", h);
  if (card && how === "push") state.pushedCard = true;
  render();
}
function closeCard() {
  if (state.pushedCard) { state.pushedCard = false; history.back(); return; }
  go(state.year, null, "replace");
}
window.addEventListener("popstate", () => { Object.assign(state, readHash()); render(); });

// --- the years: a grid to choose (one row per decade) and, on wide screens, the bars above it ------
const textOn = hex => {          // dark ink on light colours, white on dark ones
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#1a1f33" : "#ffffff";
};
function drawYears() {
  // 1939 sits in the empty 1940 square (no concert on 1 January 1940), so the 1930s need no row of their own
  const first = Math.max(1940, Math.floor(CONCERTS[0].year / 10) * 10), last = Math.floor(CONCERTS[N - 1].year / 10) * 10;
  let html = "";
  for (let d = last; d >= first; d -= 10) {          // newest decade first, as on the old page
    for (let y0 = d; y0 < d + 10; y0++) {
      const y = y0 === 1940 && !BY_YEAR.has(1940) && BY_YEAR.has(FORERUNNER) ? FORERUNNER : y0;
      if (y > LAST_YEAR || y < CONCERTS[0].year) { html += `<span class="yr gap" aria-hidden="true"></span>`; continue; }  // keeps the decade in its row
      const c = BY_YEAR.get(y);
      const a = ANNOUNCED.get(y);
      if (a) {
        html += `<button class="yr soon" role="option" data-year="${y}"
          title="${y} · ${esc(CONDUCTOR.get(a.conductor_id).name)} · announced, programme not yet published">${y}</button>`;
      } else if (c) {
        const col = colourOf(c);
        html += `<button class="yr${y === FORERUNNER ? " forerunner" : ""}" role="option" data-year="${y}" style="--c:${col};--tc:${textOn(col)}"
          title="${esc(tipOf(c))}${y === FORERUNNER ? " · before the numbered series" : ""}">${y}</button>`;
      } else {
        const why = y === 1940 ? "no concert on 1 January 1940: the turn of 1939/40 was marked on 31 December 1939" : "";
        html += `<span class="yr none" title="${y}${why ? " · " + why : ""}">${y}</span>`;
      }
    }
  }
  $("years").innerHTML = html;
  $("bars").style.setProperty("--n", N + ANNOUNCED.size);
  $("bars").innerHTML = CONCERTS.map(c => `<button class="tile${c.year === FORERUNNER ? " forerunner" : ""}" data-year="${c.year}"
      style="--c:${colourOf(c)};--tc:${textOn(colourOf(c))}" title="${esc(tipOf(c))}" aria-label="${esc(tipOf(c))}"><span>${c.year}</span></button>`).join("") +
    [...ANNOUNCED.values()].map(a => `<button class="tile soon" data-year="${a.year}"
      title="${a.year} · ${esc(CONDUCTOR.get(a.conductor_id).name)} · announced" aria-label="${a.year}, announced"><span>${a.year}</span></button>`).join("");
  const all = [...CONCERTS.map(c => c.year), ...ANNOUNCED.keys()];
  $("bars-axis").innerHTML = all.map((y, i) => (y % 10 === 0 || i === 0 || i === all.length - 1)
    ? `<span style="left:${((i + 0.5) / all.length) * 100}%">${y}</span>` : "").join("");
  drawLegend();
}
function drawLegend() {
  const m = METRICS[colourBy];
  if (m.kind === "plain") {             // plain gold: nothing to explain (Víctor, 2026-10-13)
    $("strip-legend").innerHTML = "";
    return;
  }
  if (m.kind !== "seq") {
    const count = {};
    CONCERTS.forEach(c => { const n = conductorOf(c).name; count[n] = (count[n] || 0) + 1; });
    $("strip-legend").innerHTML = Object.keys(PALETTE).map(n =>
      `<span><b style="background:${PALETTE[n]}"></b>${esc(n.split(" ").pop())} ${count[n]}</span>`).join("") +
      `<span><b style="background:${REST}"></b>${Object.keys(count).length - Object.keys(PALETTE).length} others (1 or 2 each)</span>`;
  } else {
    const [lo, hi] = range[colourBy];
    const pct = colourBy === "beyond" ? "%" : "";
    $("strip-legend").innerHTML = `<span class="ramp-l">${lo}${pct}</span>
      <span class="ramp" style="background:linear-gradient(90deg,${RAMP.join(",")})"></span>
      <span class="ramp-l">${hi}${pct}</span><span>${esc(m.unit)} per concert, encores included</span>
      ${colourBy === "duration" ? `<span><b style="background:${NO_VALUE}"></b>no complete recording (${CONCERTS.filter(c => concertMinutes(c) === null).length} concerts)</span>` : ""}`;
  }
}
const WIDE = matchMedia("(min-width: 1180px)");
// Where the key (legend and "Colour by") goes: under the bars on a wide screen; on a phone under the
// years but outside them, because there the years stay pinned at the top while the programme scrolls,
// so every tap lights its years in view.
const NARROW = matchMedia("(max-width: 760px)");
function placeKey() {
  const key = $("key");
  const pane = document.querySelector(".years-pane");
  if (WIDE.matches) { const home = document.querySelector(".bars-wrap"); if (key.parentElement !== home) home.appendChild(key); }
  else if (NARROW.matches) { if (key.previousElementSibling !== pane) pane.after(key); }
  else if (key.parentElement !== pane) pane.appendChild(key);
  key.classList.toggle("pane", NARROW.matches && !WIDE.matches);
  setPinned();
}
// What stays pinned at the top: the tabs, plus the bars on a wide screen or the years on a phone.
// The card on a wide screen sits just under them (--pin-h).
function setPinned() {
  const root = document.documentElement.style;
  const views = $("views") ? $("views").offsetHeight : 0;
  const bars = document.querySelector(".bars-wrap");
  root.setProperty("--views-h", views + "px");
  root.setProperty("--pin-h", (views + (WIDE.matches && bars ? bars.offsetHeight : 0)) + "px");
}
WIDE.addEventListener("change", placeKey);
NARROW.addEventListener("change", placeKey);
addEventListener("resize", setPinned);
// the bars and their key change height as they are drawn and as the legend changes: measure again then
if (typeof ResizeObserver === "function") {
  const watch = new ResizeObserver(setPinned);
  ["views", "bars-wrap"].forEach(c => { const el = document.querySelector("." + c); if (el) watch.observe(el); });
}
function drawColourBy() {
  $("colour-by").innerHTML = `<span class="cb-l">Colour by</span>` + Object.entries(METRICS).map(([k, m]) =>
    `<button type="button" class="cb${k === colourBy ? " on" : ""}" data-by="${k}"${m.kind === "none" ? ` disabled title="${esc(m.why)}"` : ""}
      aria-pressed="${k === colourBy}">${esc(m.label)}${m.kind === "none" ? ` <small>(${esc(m.why)})</small>` : ""}</button>`).join("");
}
function setColourBy(k) {
  if (!METRICS[k] || METRICS[k].kind === "none") return;
  colourBy = k;
  // a refinement, not a move: replace the entry, keep the hash
  const u = new URL(location.href);
  if (k === "none") u.searchParams.delete("by"); else u.searchParams.set("by", k);
  history.replaceState(null, "", u.pathname + u.search + location.hash);
  drawColourBy();
  drawYears();
  render();
}
function wireYears() {
  const pick = e => {
    const t = e.target.closest("button.yr, button.tile");
    if (!t) return;
    go(Number(t.dataset.year), null);
    if (isNarrow()) $("concert").scrollIntoView({ behavior: "smooth", block: "start" });
  };
  $("years").addEventListener("click", pick);
  $("bars").addEventListener("click", pick);
  $("colour-by").addEventListener("click", e => {
    const b = e.target.closest("button.cb");
    if (b && !b.disabled) setColourBy(b.dataset.by);
  });
}
function paintStrip(litYears) {
  ["years", "bars"].forEach(id => {
    const box = $(id);
    box.classList.toggle("lit", !!litYears);
    box.querySelectorAll("button").forEach(t => {
      const y = Number(t.dataset.year);
      t.setAttribute("aria-selected", y === state.year ? "true" : "false");
      t.classList.toggle("on", !!litYears && litYears.has(y));
    });
  });
}

// --- the concert, as a programme sheet ---------------------------------------------------------
function partsOf(c) {
  const n = Number(c.n_program);
  const notes = PERF[c.year] || {};
  const starts = Object.entries(notes).filter(([, v]) => v.parte_desde).map(([p, v]) => [Number(p), v.parte_desde])
    .sort((a, b) => a[0] - b[0]);
  const parts = [];
  if (starts.length) {
    starts.forEach(([p, label], i) => parts.push({ name: `Part ${label}`, from: p, to: (starts[i + 1] ? starts[i + 1][0] : n + 1) - 1 }));
  } else {
    parts.push({ name: "Programme", from: 1, to: n });
  }
  if (c.program.piece_id.length > n) parts.push({ name: "Encores", from: n + 1, to: c.program.piece_id.length, enc: true });
  return parts;
}
// Facts about this line, as plain text in brackets (never pills: pills are for things you can click).
// The piece's own facts go next to its title; a composer's first time goes next to their name.
const FIRST_YEAR_OF_NAME = new Map();
CONCERTS.forEach(c => c.program.piece_id.forEach(pid => namesOf(PIECE.get(pid)).forEach(n => {
  if (!FIRST_YEAR_OF_NAME.has(n)) FIRST_YEAR_OF_NAME.set(n, c.year);
})));
function pieceAside(c, pos) {
  const plays = PLAYS.get(c.program.piece_id[pos - 1]);
  const idx = plays.findIndex(p => p.year === c.year && p.pos === pos);
  if (idx === 0) return ' <span class="aside">(first time)</span>';
  const gap = c.year - plays[idx - 1].year;
  return gap >= 20 ? ` <span class="aside">(back after ${gap} years)</span>` : "";
}
function composerAside(c, name) {
  return FIRST_YEAR_OF_NAME.get(name) === c.year ? ' <span class="aside">(first time)</span>' : "";
}
function noteAside(c, pos) {
  const note = (PERF[c.year] || {})[pos];
  return note && (note.solista || note.ballet || note.version) ? ' <span class="aside">(performance note)</span>' : "";
}
// What the open card points at: the years to light, and which rows of the concert on screen match.
function yearsOf(k) {
  const fromPieces = test => { const ys = new Set(); catalogue.filter(test).forEach(p => (PLAYS.get(p.piece_id) || []).forEach(x => ys.add(x.year))); return ys; };
  if (!k) return null;
  if (k.kind === "perf") return new Set(PLAYS.get(BY_YEAR.get(state.year).program.piece_id[k.pos - 1]).map(x => x.year));
  if (k.kind === "piece") return new Set((PLAYS.get(k.id) || []).map(x => x.year));
  if (k.kind === "composer") return fromPieces(p => byComposer(p, k.id));
  if (k.kind === "type") return fromPieces(p => p.type === k.id);
  if (k.kind === "conductor") return new Set([...CONCERTS.filter(x => x.conductor_id === k.id).map(x => x.year),
    ...[...ANNOUNCED.values()].filter(a => a.conductor_id === k.id).map(a => a.year)]);
  return null;
}
function rowMatches(k, pos, p) {
  if (!k) return false;
  if (k.kind === "perf") return k.pos === pos;
  if (k.kind === "piece") return p.piece_id === k.id;
  if (k.kind === "composer") return byComposer(p, k.id);
  if (k.kind === "type") return p.type === k.id;
  return false;
}
function drawAnnounced(a) {
  const cond = CONDUCTOR.get(a.conductor_id);
  const before = CONCERTS.filter(x => x.conductor_id === a.conductor_id).length;
  $("concert").innerHTML = `<div class="c-head">
      <h1>${a.year}</h1>
      <p class="who"><button type="button" data-card="conductor">${esc(cond.name)}</button></p>
      <p class="meta"><span class="badge soon-badge">announced</span> ·
        ${before ? `his ${ordinal(before + 1)} New Year's Concert` : "his first New Year's Concert"}</p></div>
    <p class="hint">The programme has not been published yet. The conductor is all that is known.</p>
    <p class="src">Source: <a href="${esc(a.source)}" target="_blank" rel="noopener">announcement, wienerphilharmoniker.at</a></p>`;
}
function drawConcert() {
  if (ANNOUNCED.has(state.year)) return drawAnnounced(ANNOUNCED.get(state.year));
  const c = BY_YEAR.get(state.year);
  const idx = CONCERTS.indexOf(c);
  const cond = conductorOf(c);
  const condCount = CONCERTS.filter(x => x.conductor_id === c.conductor_id);
  const nth = condCount.indexOf(c) + 1;
  // people, not composer ids: "Johann Strauß II., Josef Strauß" is two people already counted
  const comps = new Set(c.program.piece_id.flatMap(p => PIECE.get(p).composer.split(/,\s*(?=[A-ZÉ])/)));
  const k = state.card;
  // 2025 Wednesday, 1 January / Riccardo Muti, his 7th of 7 / 17 pieces by 6 composers
  // (the date keeps its year only when it is not the concert's: 1939 was on 31 December 1939)
  const d = (META[c.year] || {}).date || "";
  const day = dateOf(c.year).replace(d.startsWith(String(c.year)) ? " " + c.year : /$^/, "");
  const special = META[c.year] && META[c.year].title !== "New Year's Concert" ? META[c.year].title : "";
  // the heading as a short table: who conducted, what was played, which edition, where it comes from
  const edition = c.year === FORERUNNER
    ? "Before the numbered series (see the note below)"
    : `${ordinal(c.year - 1940)} New Year's Concert`;
  const note = c.year === FORERUNNER
    ? "The concert of 31 December 1939 is kept here, but the Vienna Philharmonic counts 1 January 1941 as its 1st New Year's Concert, so it carries no number."
    : c.year === 1941 ? "Counted as the 1st by the Vienna Philharmonic. Its forerunner, the concert of 31 December 1939, carries no number." : "";
  const w = (META[c.year] || {}).wiki || {};
  const links = [c.source ? `<a href="${esc(c.source)}" target="_blank" rel="noopener">Vienna Philharmonic</a>` : "",
    w.en ? `<a href="${esc(w.en)}" target="_blank" rel="noopener">Wikipedia</a>` : "",
    w.de ? `<a href="${esc(w.de)}" target="_blank" rel="noopener">Wikipedia (de)</a>` : ""].filter(Boolean);
  let html = `<div class="c-head">${shareButton("Share this concert")}
      <h1>${c.year} <span class="date">${esc(day)}</span></h1>
      <dl class="c-facts">
        <dt>Conductor</dt><dd class="who"><button type="button" data-card="conductor">${esc(cond.name)}</button> (${ordinal(nth)} of ${condCount.length})</dd>
        <dt>Programme</dt><dd><span class="e-piece">${c.program.piece_id.length} pieces</span> by <span class="e-composer">${comps.size} composers</span></dd>
        <dt>Edition</dt><dd>${edition}</dd>
        ${special ? `<dt>Billed as</dt><dd><i>${esc(special.replace(/\//g, " / "))}</i></dd>` : ""}
        ${links.length ? `<dt>Sources</dt><dd class="c-links">${links.join(" · ")}</dd>` : ""}
      </dl>
      ${note ? `<p class="c-note">${esc(note)}</p>` : ""}
      <p class="tap-key">Tap a <span class="e-conductor">conductor</span>, <span class="e-composer">composer</span>,
        <span class="e-form">form</span> or <span class="e-piece">piece</span> to light up its years.</p></div>`;
  partsOf(c).forEach(part => {
    html += `<section class="part${part.enc ? " zugaben" : ""}"><h2>${part.name}</h2><ol class="prog">`;
    for (let pos = part.from; pos <= part.to; pos++) {
      const p = PIECE.get(c.program.piece_id[pos - 1]);
      const { t, op } = splitOp(p.piece);
      const typeOn = k && k.kind === "type" && k.id === p.type;
      html += `<li class="row${rowMatches(k, pos, p) ? " hl" : ""}" tabindex="0" data-pos="${pos}">
          <span class="n">${pos}</span><span class="t">${esc(t)}${op ? ` <span class="op">${esc(op)}</span>` : ""}${pieceAside(c, pos)}</span>
          <span class="sub">${namesOf(p).map(n => { const id = NAME2ID.get(n) ?? p.composer_id; return `<button type="button" class="chip k k-comp${k && k.kind === "composer" && k.id === id ? " on" : ""}" data-cid="${id}">${esc(n)}</button>${composerAside(c, n)}`; }).join(" ")}${p.type && p.type !== "Unknown" ? `<button type="button" class="chip k k-type${typeOn ? " on" : ""}" data-type="${esc(p.type)}">${esc(p.type)}</button>` : ""}${noteAside(c, pos)}</span>
        </li>`;
    }
    html += `</ol></section>`;
  });
  $("concert").innerHTML = html;
}
$("concert").addEventListener("click", e => {
  const sh = e.target.closest(".c-head > .share");
  if (sh) return shareUrl(location.origin + location.pathname + "#" + state.year, sh);
  const comp = e.target.closest(".k-comp");
  if (comp) return go(state.year, { kind: "composer", id: Number(comp.dataset.cid) });
  const type = e.target.closest(".k-type");
  if (type) return go(state.year, { kind: "type", id: type.dataset.type });
  const row = e.target.closest(".row");
  if (row) return go(state.year, { kind: "perf", pos: Number(row.dataset.pos) });
  if (e.target.closest('[data-card="conductor"]')) go(state.year, { kind: "conductor", id: conductorIdOf(state.year) });
});
$("concert").addEventListener("keydown", e => {
  const row = e.target.closest(".row");
  if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); row.click(); }
});

// --- cards ---------------------------------------------------------------------------------------
// What each musical form is, with its Wikipedia article: copied from the old page (web/nyc/functions.js).
const TYPE_INFO = {
  "Waltz": {
    label: "dance form",
    desc: "A waltz is a dance in triple time, central to the Viennese tradition.",
    wiki: "https://en.wikipedia.org/wiki/Waltz"
  },
  "Polka": {
    label: "dance form",
    desc: "A polka is a lively dance in duple time, originally from Bohemia. Polka schnell is a faster and more brilliant variant. Polka mazurka combines polka rhythm with mazurka accents. Polka francaise is lighter and more elegant in character.",
    wiki: "https://en.wikipedia.org/wiki/Polka"
  },
  "March": {
    label: "musical form",
    desc: "A processional piece with a strong rhythmic drive.",
    wiki: "https://en.wikipedia.org/wiki/March_(music)"
  },
  "Galop": {
    label: "dance form",
    desc: "A galop is a very fast dance, typically used as a closing number.",
    wiki: "https://en.wikipedia.org/wiki/Galop"
  },
  "Quadrille": {
    label: "dance form",
    desc: "A quadrille is a suite of short dances, originally for ballroom figures.",
    wiki: "https://en.wikipedia.org/wiki/Quadrille"
  },
  "Overture": {
    label: "musical form",
    desc: "Introductory orchestral piece, often opening an opera or operetta.",
    wiki: "https://en.wikipedia.org/wiki/Overture"
  },
  "Csárdás": {
    label: "dance form",
    desc: "Hungarian dance with a slow introduction followed by a fast section.",
    wiki: "https://en.wikipedia.org/wiki/Cs%C3%A1rd%C3%A1s"
  },
  "Fantasie": {
    label: "musical form",
    desc: "Free-form composition with an improvisatory character.",
    wiki: "https://en.wikipedia.org/wiki/Fantasia_(musical_form)"
  }
};  
function typeInfo(name) {
  return TYPE_INFO[name] || TYPE_INFO[Object.keys(TYPE_INFO).find(k => name.includes(k))];
}
// YouTube refuses watch?v= and youtu.be addresses inside an iframe; only /embed/ works.
function youtubeEmbed(url) {
  const m = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  return m ? "https://www.youtube.com/embed/" + m[1] : url;
}
function mini(years, here) {
  return `<div class="mini" style="--n:${N}">${CONCERTS.map(c =>
    `<i class="${years.has(c.year) ? "on" : ""}${c.year === here ? " here" : ""}" style="--c:${colourOf(c)}" title="${c.year}"></i>`).join("")}</div>
    <div class="mini-axis"><span>${CONCERTS[0].year}</span><span>${CONCERTS[N - 1].year}</span></div>`;
}
function sourceLinks(list) {
  return (list || []).map(s => {
    const [kind, url] = s.split(" ");
    const label = kind === "wikipedia_de" ? "Wikipedia (de), revision read" : kind === "wph" ? "Vienna Philharmonic page" : kind;
    return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
  }).join(" · ");
}
// Concerts is the number to show. Performances only when it differs, and then say why:
// the same piece twice in one concert (Pizzicato-Polka, 1963, nos. 13 and 14).
function repeatsNote(plays) {
  const byYear = {};
  plays.forEach(x => (byYear[x.year] = byYear[x.year] || []).push(x.pos));
  const twice = Object.entries(byYear).filter(([, ps]) => ps.length > 1);
  if (!twice.length) return "";
  const what = twice.map(([y, ps]) => `${ps.length === 2 ? "twice" : ps.length + " times"} in ${y} (nos. ${ps.join(" and ")})`).join("; ");
  return `<p class="repeat-note">${plays.length} performances: played ${what}, probably repeated on the spot.</p>`;
}
function pieceSummary(pid) {
  const plays = PLAYS.get(pid);
  const years = [...new Set(plays.map(p => p.year))];
  let gap = { n: 0 };
  for (let i = 1; i < years.length; i++) if (years[i] - years[i - 1] > gap.n) gap = { n: years[i] - years[i - 1], a: years[i - 1], b: years[i] };
  return { plays, years, gap };
}
// Durations: length of the track on the confirmed official disc (applause included, the New Year's
// greeting is its own track). Disagreements: what each source says when they do not agree.
const REC = typeof recordings === "object" ? recordings : { durations: {}, disagreements: {}, discs: {} };
const durationOf = (year, pos) => ((REC.durations[year] || {})[pos]);
const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
function disagreementHtml(year, pos) {
  const list = (REC.disagreements[year] || {})[pos] || [];
  if (!list.length) return "";
  const label = { wph: "Vienna Philharmonic page", wikipedia_de: "Wikipedia (de)", musicbrainz: "disc" };
  return list.map(d => `<div class="sources-differ"><p><b>Sources disagree</b> on the ${d.campo === "opus" ? "opus number" : "encore"}:</p>
      <ul>${["wph", "wikipedia_de", "musicbrainz"].filter(k => d[k]).map(k => `<li>${label[k]}: ${esc(d[k])}</li>`).join("")}</ul>
      <p class="small">${esc(d.result_en)}</p></div>`).join("");
}

// One card per piece, in two parts: the piece in the concert on screen (place, part, soloist,
// what came before and after) and the piece across all concerts (years, numbers, every performance).
// From the catalogue the concert is the one where it was played, so the first part is always there.
function pieceCard(pid, c, pos) {
  const p = PIECE.get(pid);
  const { t, op } = splitOp(p.piece);
  const { plays, years, gap } = pieceSummary(pid);
  if (c && !pos) { const i = c.program.piece_id.indexOf(pid); pos = i >= 0 ? i + 1 : null; }
  let here = "";
  if (c && pos) {
    const n = Number(c.n_program);
    const part = partsOf(c).find(x => pos >= x.from && pos <= x.to);
    const where = pos > n ? `encore ${pos - n} of ${c.program.piece_id.length - n}` : `no. ${pos} of ${n} in the programme${part && /^Part/.test(part.name) ? `, ${part.name.toLowerCase()}` : ""}`;
    const note = (PERF[c.year] || {})[pos];
    const idx = plays.findIndex(x => x.year === c.year && x.pos === pos);
    const prev = idx > 0 ? plays[idx - 1].year : null;
    const before = pos > 1 ? PIECE.get(c.program.piece_id[pos - 2]) : null;
    const after = pos < c.program.piece_id.length ? PIECE.get(c.program.piece_id[pos]) : null;
    let notes = "";
    if (note && (note.solista || note.version || note.ballet)) {
      notes = `<div class="notes">
        ${note.solista ? `<p><b>Soloist</b> · ${esc(note.solista)}</p>` : ""}
        ${note.version ? `<p><b>Version</b> · ${esc(note.version)}</p>` : ""}
        ${note.ballet ? `<p><b>Ballet</b> · ${esc(note.ballet)}</p>` : ""}
        ${(note.nota || []).filter(x => !/parte empieza/.test(x)).map(x => `<p class="small">${esc(x)}</p>`).join("")}
        <p class="small">Source: ${sourceLinks(note.fuente)}${(note.lapiz || []).some(k => ["solista", "version", "ballet"].includes(k)) ? ' · <span class="lapiz">transcribed, not yet confirmed</span>' : ""}</p>
      </div>`;
    }
    here = `<h3>In ${c.year}</h3>
      ${notes}
      <dl class="facts">
        <dt>Conductor</dt><dd><button type="button" class="link" data-go="conductor">${esc(conductorOf(c).name)}</button></dd>
        <dt>Place</dt><dd>${where}</dd>
        <dt>History</dt><dd>${idx === 0 ? "first time at the New Year's Concert" : `${ordinal(idx + 1)} time; previously ${prev}${c.year - prev >= 20 ? `, ${c.year - prev} years before` : ""}`}</dd>
        ${durationOf(c.year, pos) ? `<dt>Recording</dt><dd>${mmss(durationOf(c.year, pos))} · <a href="${esc(REC.discs[c.year].url)}" target="_blank" rel="noopener">${esc(REC.discs[c.year].title)}</a></dd>` : ""}
      </dl>
      ${disagreementHtml(c.year, pos)}
      <p class="around">${before ? `After <button type="button" class="link" data-pos="${pos - 1}">${esc(splitOp(before.piece).t)}</button>` : "Opens the concert"}${after ? ` · before <button type="button" class="link" data-pos="${pos + 1}">${esc(splitOp(after.piece).t)}</button>` : " · closes the concert"}</p>`;
  }
  const ext = extLinks("piece", pid, { wiki_en: p.links.wiki.en, wiki_de: p.links.wiki.de, imslp: p.links.imslp });
  const yt = p.links.you.this || p.links.you.other;
  const video = yt ? `<div class="video"><iframe src="${esc(youtubeEmbed(yt))}" title="${esc(t)}" loading="lazy" allowfullscreen></iframe></div>` : "";
  return `<p class="k-eyebrow">Piece</p>
    <h2>${esc(t)}</h2>
    <p class="by">${namesOf(p).map(n => `<button type="button" data-go="composer-${NAME2ID.get(n) ?? p.composer_id}">${esc(n)}</button>`).join(", ")}${op ? " · " + esc(op) : ""}${p.type ? ` · <button type="button" class="chip k k-type" data-type="${esc(p.type)}">${esc(p.type)}</button>` : ""}</p>
    ${here}
    <h3>Across all concerts</h3>
    ${mini(new Set(years), c ? c.year : null)}
    <div class="stats"><div><b>${years.length}</b><span>concerts</span></div><div><b>${years[0]}</b><span>first played</span></div><div><b>${gap.n || "–"}</b><span>${gap.n ? `years away, ${gap.a}–${gap.b}` : "longest absence"}</span></div></div>
    ${repeatsNote(plays)}
    ${(() => {
      const ds = plays.map(x => durationOf(x.year, x.pos)).filter(Boolean).sort((a, b) => a - b);
      if (!ds.length) return "";
      const med = ds[Math.floor(ds.length / 2)];
      return `<p class="repeat-note">Typical length ${mmss(med)} (median of ${ds.length} recorded performance${ds.length > 1 ? "s" : ""}, from ${mmss(ds[0])} to ${mmss(ds[ds.length - 1])}). Track length on the official disc, applause included.</p>`;
    })()}
    <ul class="list">${plays.map(x => {
      const cc = BY_YEAR.get(x.year);
      const enc = x.pos > Number(cc.n_program);
      const note = (PERF[x.year] || {})[x.pos];
      const isHere = c && x.year === c.year && x.pos === pos;
      return `<li${isHere ? ' class="here"' : ""}><span class="y"><button type="button" class="link" data-year="${x.year}" data-pos="${x.pos}">${x.year}</button></span>
        <span>${esc(conductorOf(cc).name)}${note && note.solista ? ` · <i>${esc(note.solista)}</i>` : ""}${note && note.version && note.version.length <= 32 ? ` · <i>${esc(note.version)}</i>` : ""}</span>
        <span class="r">${enc ? "encore" : "no. " + x.pos}${durationOf(x.year, x.pos) ? ` · ${mmss(durationOf(x.year, x.pos))}` : ""}</span></li>`;
    }).join("")}</ul>
    ${video}
    ${ext.length ? `<div class="ext">${ext.join("")}</div>` : ""}
    ${ext.some(x => x.includes("unconf")) ? '<p class="small">* found automatically in Wikidata or IMSLP, not yet confirmed.</p>' : ""}`;
}
// Links of a piece or person: what the published files have, plus what scripts/fetch_links.py found in
// Wikidata and IMSLP (nyc/links.js). A link not yet confirmed (lápiz) carries a small mark.
const LINKS = typeof links === "object" ? links : { piece: {}, composer: {}, conductor: {} };
const LINK_LABEL = { wiki_en: "Wikipedia", wiki_de: "Wikipedia (de)", imslp: "Score (IMSLP)", wikidata: "Wikidata" };
function extLinks(kind, id, have) {
  const found = (LINKS[kind] || {})[String(id)] || {};
  return Object.keys(LINK_LABEL).map(k => {
    if (kind !== "piece" && k === "imslp") {               // a person's IMSLP page is the list of their works
      const f = found[k];
      return f ? link(f.url, "Works on IMSLP", f.estado) : "";
    }
    if (have[k]) return link(have[k], LINK_LABEL[k], "boli");
    return found[k] ? link(found[k].url, LINK_LABEL[k], found[k].estado) : "";
  }).filter(Boolean);
  function link(url, label, estado) {
    return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>${estado === "boli" ? "" : '<sup class="unconf" title="found automatically, not yet confirmed">*</sup>'}`;
  }
}
// A portrait straight from Wikimedia Commons, with who made it and under which licence, linked to
// its Commons page. No portrait in data/ids/portraits.csv means no picture: nothing is guessed.
const PORTRAITS = typeof portraits === "object" ? portraits : { composer: {}, conductor: {} };
// The head of a person's card: portrait (if Commons has one) beside kind, name and Wikipedia link.
// The photo credit goes to the foot of the card, so the head stays clean.
function personHead(kind, id, name, label, wiki) {
  const p = (PORTRAITS[kind] || {})[String(id)];
  const ext = extLinks(kind, id, { wiki_en: wiki });
  const text = `<div><p class="k-eyebrow">${label}</p><h2>${esc(name)}</h2>
    ${ext.length ? `<p class="by links">${ext.join("")}</p>` : ""}</div>`;
  if (!p) return text;
  return `<div class="person-head"><img src="${esc(p.src)}" alt="${esc(name)}" loading="lazy" referrerpolicy="no-referrer">${text}</div>`;
}
function photoCredit(kind, id) {
  const p = (PORTRAITS[kind] || {})[String(id)];
  if (!p) return "";
  const lic = p.license_url ? `<a href="${esc(p.license_url)}" target="_blank" rel="noopener">${esc(p.license)}</a>` : esc(p.license);
  return `<p class="photo-credit">Photo: ${esc(p.author)} · ${lic} · <a href="${esc(p.page)}" target="_blank" rel="noopener">Wikimedia Commons</a></p>`;
}
function composerCard(cid) {
  const comp = COMPOSER.get(cid);
  const pieces = catalogue.filter(p => byComposer(p, cid))
    .map(p => ({ p, plays: PLAYS.get(p.piece_id) || [] })).filter(x => x.plays.length)
    .sort((a, b) => b.plays.length - a.plays.length);
  const years = new Set(pieces.flatMap(x => x.plays.map(y => y.year)));
  const perf = pieces.reduce((n, x) => n + x.plays.length, 0);
  const shown = pieces.slice(0, 25);
  return `${personHead("composer", cid, comp ? comp.name : "?", "Composer", comp && comp.links.wiki.en)}
    ${mini(years, null)}
    <div class="stats"><div><b>${years.size}</b><span>concerts</span></div><div><b>${perf}</b><span>pieces played</span></div><div><b>${pieces.length}</b><span>different pieces</span></div></div>
    <h3>Pieces, most played first</h3>
    <ul class="list">${shown.map(x => `<li><span class="y">${x.plays.length}×</span>
      <span><button type="button" class="link" data-go="piece-${x.p.piece_id}">${esc(splitOp(x.p.piece).t)}</button></span>
      <span class="r">${x.plays[0].year}</span></li>`).join("")}</ul>
    ${pieces.length > shown.length ? `<p class="hint">and ${pieces.length - shown.length} more</p>` : ""}
    ${photoCredit("composer", cid)}`;
}
function conductorCard(id) {
  const cond = CONDUCTOR.get(id);
  const list = CONCERTS.filter(c => c.conductor_id === id);
  const next = [...ANNOUNCED.values()].filter(a => a.conductor_id === id);
  const upcoming = next.map(a => `<p class="notes">Announced for <b>${a.year}</b>${list.length ? "" : ", his first New Year's Concert"}.
      <span class="small">Source: <a href="${esc(a.source)}" target="_blank" rel="noopener">wienerphilharmoniker.at</a></span></p>`).join("");
  if (!list.length) {
    return `${personHead("conductor", id, cond.name, "Conductor", cond.links.wiki.en)}
      ${upcoming}
      ${photoCredit("conductor", id)}`;
  }
  return `${personHead("conductor", id, cond.name, "Conductor", cond.links.wiki.en)}
    ${mini(new Set(list.map(c => c.year)), state.year)}
    ${upcoming}
    <div class="stats"><div><b>${list.length}</b><span>concerts</span></div><div><b>${list[0].year}</b><span>first</span></div><div><b>${list[list.length - 1].year}</b><span>last</span></div></div>
    <h3>His concerts</h3>
    <ul class="list">${list.map(c => {
      const fresh = c.program.piece_id.filter(p => PLAYS.get(p)[0].year === c.year).length;
      return `<li><span class="y"><button type="button" class="link" data-year="${c.year}">${c.year}</button></span>
        <span>${c.program.piece_id.length} pieces</span><span class="r">${fresh ? fresh + " new to the concert" : ""}</span></li>`;
    }).join("")}</ul>
    ${photoCredit("conductor", id)}`;
}
function typeCard(name) {
  const pieces = catalogue.filter(p => p.type === name)
    .map(p => ({ p, plays: PLAYS.get(p.piece_id) || [] })).filter(x => x.plays.length)
    .sort((a, b) => b.plays.length - a.plays.length);
  const years = yearsOf({ kind: "type", id: name });
  const perf = pieces.reduce((n, x) => n + x.plays.length, 0);
  const here = BY_YEAR.get(state.year);
  const inThis = here ? here.program.piece_id.filter(pid => PIECE.get(pid).type === name).length : 0;
  const shown = pieces.slice(0, 25);
  const info = typeInfo(name);
  return `<p class="k-eyebrow">Musical form</p><h2>${esc(name)}</h2>
    ${here ? `<p class="by">${inThis} in ${state.year}, highlighted in the programme</p>` : ""}
    ${info ? `<p>${esc(info.desc)} <a href="${esc(info.wiki)}" target="_blank" rel="noopener">Wikipedia</a></p>` : ""}
    ${mini(years, state.year)}
    <div class="stats"><div><b>${years.size}</b><span>concerts</span></div><div><b>${perf}</b><span>pieces played</span></div><div><b>${pieces.length}</b><span>different pieces</span></div></div>
    <h3>Pieces of this form, most played first</h3>
    <ul class="list">${shown.map(x => `<li><span class="y">${x.plays.length}×</span>
      <span><button type="button" class="link" data-go="piece-${x.p.piece_id}">${esc(splitOp(x.p.piece).t)}</button> <span class="r">${esc(x.p.composer)}</span></span>
      <span class="r">${x.plays[0].year}</span></li>`).join("")}</ul>
    ${pieces.length > shown.length ? `<p class="hint">and ${pieces.length - shown.length} more</p>` : ""}`;
}
function drawCard() {
  const body = $("card-body");
  const c = BY_YEAR.get(state.year);
  const k = state.card;
  document.body.classList.toggle("card-open", !!k);
  const family = !k ? "" : { perf: "piece", piece: "piece", composer: "composer", type: "form", conductor: "conductor" }[k.kind];
  if (family) document.body.dataset.kind = family; else delete document.body.dataset.kind;
  if (!k) {
    body.innerHTML = `<p class="hint">Tap a piece to see it as it was played that year, and across all the concerts.</p>`;
    return paintStrip(null);
  }
  if (k.kind === "perf") body.innerHTML = pieceCard(c.program.piece_id[k.pos - 1], c, k.pos);
  else if (k.kind === "piece") body.innerHTML = pieceCard(k.id, c, null);
  else if (k.kind === "composer") body.innerHTML = composerCard(k.id);
  else if (k.kind === "type") body.innerHTML = typeCard(k.id);
  else if (k.kind === "conductor") body.innerHTML = conductorCard(k.id);
  body.insertAdjacentHTML("afterbegin", shareButton("Share this card"));
  paintStrip(yearsOf(k));
  $("card").scrollTop = 0;
}
$("card").addEventListener("click", e => {
  if (e.target.closest("#card-close")) return closeCard();
  const sh = e.target.closest(".share");
  if (sh) return shareUrl(location.origin + location.pathname + shareHash(state), sh);
  const ty = e.target.closest("[data-type]");
  if (ty) return go(state.year, { kind: "type", id: ty.dataset.type });
  const b = e.target.closest("[data-go], [data-pos], [data-year]");
  if (!b) return;
  if (b.dataset.go === "conductor") return go(state.year, { kind: "conductor", id: conductorIdOf(state.year) });
  if (b.dataset.go) {
    const [kind, id] = b.dataset.go.split("-");
    return go(state.year, { kind, id: Number(id) });
  }
  const year = b.dataset.year ? Number(b.dataset.year) : state.year;
  go(year, b.dataset.pos ? { kind: "perf", pos: Number(b.dataset.pos) } : null);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && state.card) closeCard(); });

// --- desktop: the card's edge can be dragged, and the width is remembered (from batalla) -------
function setupDivider() {
  const MIN = 300, MAX = 0.6;
  const apply = w => {
    const v = Math.min(Math.max(w, MIN), Math.round(window.innerWidth * MAX));
    document.documentElement.style.setProperty("--ficha-w", v + "px");
    return v;
  };
  let saved = 420;
  try { saved = Number(localStorage.getItem("nyc-card-w")) || 420; } catch (_) {}
  apply(saved);
  let dragging = false;
  const move = e => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const v = apply(window.innerWidth - x - 16);
    try { localStorage.setItem("nyc-card-w", v); } catch (_) {}
  };
  $("divider").addEventListener("mousedown", () => { if (!isNarrow()) { dragging = true; document.body.classList.add("resizing"); } });
  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", () => { dragging = false; document.body.classList.remove("resizing"); });
  $("divider").addEventListener("keydown", e => {
    const cur = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--ficha-w")) || saved;
    if (e.key === "ArrowLeft") apply(cur + 24);
    if (e.key === "ArrowRight") apply(cur - 24);
  });
}

// --- phone: the sheet's height can be dragged; it snaps and is remembered ----------------------
function setupSheet() {
  const SNAPS = [0.36, 0.6, 0.92];                 // share of the screen height
  const card = $("card"), grip = $("sheet-grip");
  const set = ratio => document.documentElement.style.setProperty("--sheet-h", Math.round(ratio * 100) + "vh");
  try { const r = Number(localStorage.getItem("nyc-sheet-h")); if (r) set(r); } catch (_) {}
  let startY = 0, startH = 0, dragging = false;
  grip.addEventListener("pointerdown", e => {
    if (!isNarrow()) return;
    dragging = true; startY = e.clientY; startH = card.getBoundingClientRect().height;
    grip.setPointerCapture(e.pointerId);
    document.body.classList.add("sheet-dragging");
  });
  grip.addEventListener("pointermove", e => {
    if (!dragging) return;
    const h = Math.min(Math.max(startH + (startY - e.clientY), 80), window.innerHeight * 0.94);
    document.documentElement.style.setProperty("--sheet-h", h + "px");
  });
  // the release of a drag must not count as a tap on whatever is under the finger
  let swallowUntil = 0;
  window.addEventListener("click", e => {
    if (Date.now() < swallowUntil) { e.stopPropagation(); e.preventDefault(); swallowUntil = 0; }
  }, true);
  const end = e => {
    if (!dragging) return;
    dragging = false;
    if (Math.abs(e.clientY - startY) > 6) swallowUntil = Date.now() + 500;
    document.body.classList.remove("sheet-dragging");
    const ratio = card.getBoundingClientRect().height / window.innerHeight;
    if (ratio < 0.2) { set(SNAPS[1]); return closeCard(); }      // dragged nearly away: close
    const snap = SNAPS.reduce((a, b) => Math.abs(b - ratio) < Math.abs(a - ratio) ? b : a);
    set(snap);
    try { localStorage.setItem("nyc-sheet-h", snap); } catch (_) {}
  };
  grip.addEventListener("pointerup", end);
  grip.addEventListener("pointercancel", end);
}

// --- the two tabs: "Analysis and context" (verbatim from the published page) and the catalogue ------
function showView(view, how = "push") {
  state.view = view;
  if (view !== "concerts") {
    const h = "#" + view;
    if (h !== location.hash) history[how === "push" ? "pushState" : "replaceState"](null, "", h);
  }
  render();
}
function paintView() {
  document.querySelectorAll(".view-tab").forEach(t => {
    const on = t.dataset.view === state.view;
    t.classList.toggle("on", on);
    t.setAttribute("aria-selected", on);
  });
  ["concerts", "analysis", "catalogue"].forEach(v => $("view-" + v).classList.toggle("on", v === state.view));
  if (state.view !== "concerts") document.body.classList.remove("card-open");
  // the analysis scripts redraw on Bootstrap's "shown.bs.tab" event; keep that contract
  if (state.view === "analysis" && paintView.last !== "analysis") {
    $("stats-tab").dispatchEvent(new Event("shown.bs.tab"));
    // charts drawn while the view was hidden have no size: let Chart.js measure them again once visible
    requestAnimationFrame(() => Object.values(window._charts || {}).forEach(ch => ch && ch.resize && ch.resize()));
  }
  paintView.last = state.view;
}
// Share what is being looked at. The address is computed from the state, not read from the bar. On a
// phone navigator.share opens the system sheet (only the URL: with a title, some apps glue text to the
// link and break it); elsewhere the link is copied and the button says so. Same as Batalla de Flores.
const ICON_SHARE = `<svg class="share-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="12.5" cy="3.5" r="2.2"/>
  <circle cx="3.5" cy="8" r="2.2"/><circle cx="12.5" cy="12.5" r="2.2"/>
  <path d="M5.4 6.9 10.6 4.3M5.4 9.1l5.2 2.6" stroke-width="1.4" fill="none"/></svg>`;
function shareButton(title, chart) {
  return `<button type="button" class="share"${chart ? ` data-chart="${esc(chart)}"` : ""} title="${esc(title)}">${ICON_SHARE}<span>Share</span></button>`;
}
// the link of a card: a performance keeps its concert; a piece, a person or a form is the same everywhere
function shareHash(s) {
  const c = s.card;
  if (!c) return hashOf(s);
  if (c.kind === "perf") return "#" + s.year + "/" + c.pos;
  if (c.kind === "type") return "#type-" + encodeURIComponent(c.id);
  return "#" + c.kind + "-" + c.id;
}
async function shareUrl(url, button) {
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share({ url }); return; }
    await navigator.clipboard.writeText(url);
    const label = button.querySelector("span");
    const before = label.textContent;
    label.textContent = "Link copied";
    setTimeout(() => { label.textContent = before; }, 2000);
  } catch { /* the reader closed the share sheet: nothing to do */ }
}
function setupViews() {
  $("views").addEventListener("click", e => {
    const t = e.target.closest(".view-tab");
    if (!t) return;
    if (t.dataset.view === "concerts") go(state.year, null);
    else showView(t.dataset.view);
    window.scrollTo({ top: 0 });
  });
  // the index of the analysis: one link per section, built from the section titles
  // short names for each chart inside its section: #analysis/strauss/pct
var CHART_IDS = {
  chartPiecesPerConcert_bar: "pieces", chartConductors: "count", chartPlayedByType: "played",
  chartCatalogueByType: "catalogue", chartFormsByYearCount: "by-year", chartFormsByYearPctLine: "by-year-pct",
  chartStraussVsNonStraussPct: "pct", chartStraussVsNonStrauss: "count", chartComposerPerformancesAll: "performances",
  chartComposerCatalogueAll: "catalogue", chartComposersByYearCount: "by-year", chartComposersByYearPct: "by-year-pct",
  chartMostRepeatedPieces: "most-repeated", chartRankAppearances: "rank", chartNewVsRepeatedByYearCount: "count",
  chartNewVsRepeatedByYearPct: "pct", chartNewVsRepeated: "cumulative",
};
// short, fixed names for the sections, so a shared link reads well: #analysis/strauss
  const SECTION_IDS = [[/consist of/i, "programme"], [/conductor/i, "conductors"], [/polkas and waltzes/i, "forms"],
    [/strauss family/i, "strauss"], [/composers have appeared/i, "composers"], [/pieces are often/i, "pieces"],
    [/new pieces and repetitions/i, "new-pieces"]];
  // each section gets a readable id from its title ("strauss", "conductor"...), so #analysis/strauss is a link
  const slug = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").split(" ").filter(w => w.length > 3 && !/^(what|does|consist|about|which|only|have|that|this|from|over|time|year|years|concert|concerts|neujahrskonzert)$/.test(w)).slice(0, 2).join("-");
  const boxes = [...document.querySelectorAll("#statsPane .catalogue-panel > .row > * > .plot-box")];
  const used = new Set();
  $("analysis-toc").innerHTML = boxes.map((b, i) => {
    if (!b.id) {
      const t = b.querySelector(".plot-title");
      const named = t && SECTION_IDS.find(([re]) => re.test(t.textContent));
      let id = named ? named[1] : (t && slug(t.textContent)) || "section-" + (i + 1);
      while (used.has(id)) id += "-" + (i + 1);
      used.add(id);
      b.id = id;
    }
    const title = b.querySelector(".plot-title");
    return title ? `<a href="#${b.id}" data-target="${b.id}">${esc(title.textContent.trim())}</a>` : "";
  }).join("");
  // The introductions fold away by default, so the charts come first; one button opens each again.
  document.querySelectorAll("#statsPane .plot-desc").forEach(d => {
    d.classList.add("folded");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "intro-toggle";
    b.textContent = "Read the introduction";
    b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", () => {
      const open = d.classList.toggle("folded") === false;
      b.textContent = open ? "Hide the introduction" : "Read the introduction";
      b.setAttribute("aria-expanded", String(open));
    });
    d.before(b);
  });
  // one link per chart, #analysis/<section>/<chart>, with its own share button in the corner
  document.querySelectorAll("#statsPane canvas").forEach(cv => {
    const box = cv.closest(".catalogue-panel > .row > * > .plot-box");
    // a line of its own just above the chart, right aligned, so it never covers the legend; the link lands here
    const pc = cv.closest(".plot-chart");
    if (!box || !pc) return;
    const id = box.id + "/" + (CHART_IDS[cv.id] || cv.id.replace(/^chart/, "").toLowerCase());
    pc.insertAdjacentHTML("beforebegin", `<div class="chart-share" id="${esc(id)}">${shareButton("Share this chart", id)}</div>`);
  });
  $("statsPane").addEventListener("click", e => {
    const sh = e.target.closest(".share[data-chart]");
    if (sh) shareUrl(location.origin + location.pathname + "#analysis/" + sh.dataset.chart, sh);
  });
  $("analysis-toc").addEventListener("click", e => {
    const a = e.target.closest("a[data-target]");
    if (!a) return;
    e.preventDefault();                       // a refinement: the address names the section, history does not grow
    history.replaceState(null, "", "#analysis/" + a.dataset.target);
    document.getElementById(a.dataset.target).scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// The catalogue: every piece, its form, its authors and in how many concerts it was played.
// Search by several words, sort by any column, click a piece, a form or a composer.
const CAT_COLS = [
  { key: "piece", label: "Piece", get: r => r.title },
  { key: "type", label: "Musical Form", get: r => r.p.type || "" },
  { key: "composer", label: "Composer", get: r => r.p.composer },
  { key: "concerts", label: "Concerts", get: r => r.concerts, num: true },
];
const catRows = catalogue.map(p => ({ p, title: p.piece, concerts: new Set((PLAYS.get(p.piece_id) || []).map(x => x.year)).size }));
const catSort = { key: "piece", dir: 1 };
// the concert to show alongside: the one on screen if it qualifies, otherwise the latest that does
function yearWith(test) {
  const here = BY_YEAR.get(state.year);
  if (here && test(here)) return state.year;
  const list = CONCERTS.filter(test);
  return list.length ? list[list.length - 1].year : state.year;
}
function drawCatalogue() {
  const words = $("cat-search").value.toUpperCase().split(/\s+/).filter(Boolean);
  const col = CAT_COLS.find(c => c.key === catSort.key);
  const rows = catRows
    .filter(r => { const txt = CAT_COLS.map(c => c.get(r)).join(" ").toUpperCase(); return words.every(w => txt.includes(w)); })
    .sort((a, b) => {
      const x = col.get(a), y = col.get(b);
      return catSort.dir * (col.num ? x - y : String(x).localeCompare(String(y)));
    });
  $("cat-table").innerHTML = `<thead><tr>${CAT_COLS.map(c => `<th data-key="${c.key}">${c.label}${c.key === catSort.key ? `<span class="dir">${catSort.dir > 0 ? "▲" : "▼"}</span>` : ""}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr data-pid="${r.p.piece_id}">
      <td class="t">${esc(r.title)}</td>
      <td>${r.p.type && r.p.type !== "Unknown" ? `<button type="button" class="chip k k-type" data-type="${esc(r.p.type)}">${esc(r.p.type)}</button>` : ""}</td>
      <td>${namesOf(r.p).map(n => `<button type="button" class="chip k k-comp" data-cid="${NAME2ID.get(n) ?? r.p.composer_id}">${esc(n)}</button>`).join(" ")}</td>
      <td class="n">${r.concerts}</td></tr>`).join("")}</tbody>`;
  $("cat-count").textContent = `${rows.length} displayed pieces`;
}
function setupCatalogue() {
  $("cat-search").addEventListener("input", drawCatalogue);
  $("cat-table").addEventListener("click", e => {
    const th = e.target.closest("th");
    if (th) {
      catSort.dir = catSort.key === th.dataset.key ? -catSort.dir : (th.dataset.key === "concerts" ? -1 : 1);
      catSort.key = th.dataset.key;
      return drawCatalogue();
    }
    const show = (year, card) => { go(year, card); $("concert").scrollIntoView({ behavior: "smooth", block: "start" }); };
    const comp = e.target.closest(".k-comp");
    if (comp) {
      const id = Number(comp.dataset.cid);
      return show(yearWith(c => c.program.piece_id.some(pid => byComposer(PIECE.get(pid), id))), { kind: "composer", id });
    }
    const type = e.target.closest(".k-type");
    if (type) {
      const t = type.dataset.type;
      return show(yearWith(c => c.program.piece_id.some(pid => PIECE.get(pid).type === t)), { kind: "type", id: t });
    }
    const tr = e.target.closest("tr[data-pid]");
    if (tr) {
      const pid = Number(tr.dataset.pid);
      show(yearWith(c => c.program.piece_id.includes(pid)), { kind: "piece", id: pid });
    }
  });
  drawCatalogue();
}

// --- go --------------------------------------------------------------------------------------------
function render() { paintView(); drawConcert(); drawCard(); }
$("build").textContent = `v${DATA_V} · ${BUILD_AT}`;
const by0 = new URL(location.href).searchParams.get("by");
if (by0 && METRICS[by0] && METRICS[by0].kind !== "none") colourBy = by0;
drawColourBy();
placeKey();
drawYears();
wireYears();
setupDivider();
setupSheet();
setupViews();
setupCatalogue();
Object.assign(state, readHash());
if (!location.hash) history.replaceState(null, "", hashOf(state));
render();
// arriving at #analysis/<section>: open that section once the charts have been laid out
if (state.section) setTimeout(() => { const el = document.getElementById(state.section); if (el) el.scrollIntoView({ block: "start" }); }, 400);
