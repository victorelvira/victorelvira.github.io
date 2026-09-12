/* Culture Atlas — app.js
 *
 * The spine is the sibling's (CHASSIS.md §1): one `state`, one predicate, every view calls it.
 * The fix is §1's: the predicate is a DECLARATIVE list, so there is never a second hand-maintained
 * copy of it for the table, and "does this dimension apply here?" is a field rather than a ternary.
 */
const DATA_V = "0.19.0";
let BUILD_AT = "";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// On a phone the count eats the word: "Stolperstein 16,575" becomes "Stolperstein 16,…". The
// number is context, the word is the control, so the number gets abbreviated and the word stays.
const narrow = () => window.matchMedia("(max-width: 720px)").matches;
const num = (n) => !narrow() ? n.toLocaleString()
  : n >= 1000 ? Math.round(n / 1000) + "k" : String(n);

const deacc = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const t = (s) => s;                                   // i18n hook — same shape as the sibling's
// Which Wikipedia the "Wikipedia" link goes to. Not a translation of the interface (that comes
// later, through t()) — just the courtesy of not sending a Spanish reader to en.wikipedia.
const LANG = (["en", "es", "fr", "de", "it", "pt", "nl", "pl"]
  .find((l) => (navigator.language || "en").toLowerCase().startsWith(l))) || "en";

/* ── vocabulary labels (the values themselves come from the bundle, never typed here) ── */
const LABEL = {
  access: { "open-air": "☀️ Always", hours: "🕐 Hours", "outside-only": "👁️ Outside",
            gone: "✕ Gone", unknown: "? Unknown" },
  marking: { museum: "🏛 Museum", plaque: "🪧 Plaque", monument: "🗿 Monument", tomb: "🪦 Tomb",
             unmarked: "○ Unmarked", unknown: "? Unknown" },
  // 🪦 not ⚰: the atlas maps the place they are, not the box. (Víctor, 2026-09-12.)
  // "Stolperstein" stays. It is the name the thing has in English and in Spanish too, not just in
  // German — Víctor checked — and renaming it to something blander would be inventing a worse
  // word for a thing that already has one. What was actually missing was not a translation: it
  // was the atlas explaining itself where somebody is looking. See the note under each row.
  what: { grave: "🪦 Grave", plaque: "🪧 Plaque", house: "🏠 House", statue: "🗿 Statue",
          museum: "🏛 Museum", church: "⛪ Church" },
  // A Stolperstein is a plaque; what differs is where it is mounted. Grouped, and still tellable
  // apart — the distinction appears only when there are plaques to tell apart.
  mount: { wall: "🧱 On a wall", ground: "🟫 In the pavement", "n/a": "— not a plaque" },
  dom: { letters: "Letters", music: "Music", image: "Image", stage: "Stage", science: "Science",
         power: "Power", faith: "Faith", sport: "Sport", trade: "Trade",
         other: "Other trade", nobody: "No person named" },
  verb: { born: "was born", lived: "lived", worked: "worked", died: "died", buried: "is buried",
          commemorated: "is remembered", built: "built it", exhibited: "is exhibited" },
  // The chip carries the SAME mark the map draws on a pin holding one thing (VERB_MARK below):
  // the filter row teaches you to read the map instead of being a second vocabulary.
  //
  // These were monochrome glyphs until 2026-09-12, on my claim that an emoji "turns to mush" at
  // 12 px inside a coloured circle. Víctor asked why the verb row did not match the others, I
  // rendered every candidate inside a real 22 px pin, and the claim was simply wrong — 🌱, 🕯️ and
  // 🔑 are perfectly legible there. An assertion I had never tested was costing the interface its
  // consistency.
  verbChip: { born: "🌱 born", lived: "🔑 lived", worked: "🛠️ worked", died: "🕯️ died",
              buried: "⚱️ buried", commemorated: "💐 remembered", built: "📐 built",
              exhibited: "🖼️ exhibited" },
};
/* ── the interface explaining itself ─────────────────────────────────────────────────────────
 * Víctor, who built this atlas, asked what a Stolperstein was. If the author does not know the
 * word, nobody arriving does — and half these labels are terms of art somebody (me) invented:
 * `outside-only`, `unmarked`, `exhibited`, `remembered`. A chip that needs explaining and does not
 * explain itself is a chip that filters by mystery.
 */
const HELP = {
  mount: {
    wall: "A plaque on a building, the ordinary kind: you read it standing on the pavement.",
    ground: "A Stolperstein — a brass cobble set INTO the pavement, outside the last home a victim of Nazi persecution chose freely. Gunter Demnig has laid more than 100 000 of them since 1992, which makes this the largest memorial in the world and the only one you walk on. Every one begins HIER WOHNTE — here lived. 14 874 of the 16 479 here commemorate somebody with no Wikipedia article at all, which is exactly the point.",
    "n/a": "Not a plaque.",
  },
  what: {
    grave: "Where they are buried — a cemetery, a church, or the stone itself when somebody has mapped it.",
    plaque: "A commemorative plaque — on a wall, or set into the pavement. Read the inscription: it is on the record.",
    house: "A building they were born in, or lived in — often still somebody's home.",
    statue: "A statue, bust, obelisk or memorial standing outdoors because of them.",
    museum: "A museum: one about them, or one holding their work.",
    church: "A church or chapel that holds them.",
  },
  access: {
    "open-air": "Out in the open. No door, no ticket, no hours — you can walk up to it right now.",
    hours: "There is a door, and it opens and closes. A museum, a church, a gated cemetery.",
    "outside-only": "Real and private. You can look at the building from the street; you do not go in.",
    gone: "The building was pulled down or the plaque removed. Kept on the map: the place is still where it happened.",
    unknown: "We do not know whether you can get in. Not a claim that you cannot.",
  },
  marking: {
    museum: "A museum marks the spot.",
    plaque: "A plaque marks it, and we have read what it says.",
    monument: "A statue or memorial marks it.",
    tomb: "The grave is marked and somebody has photographed the stone, so it can be found.",
    unmarked: "Nothing on the ground says so. You only know because this atlas told you.",
    unknown: "Nobody has looked, or nobody has recorded looking. Not the same as `unmarked`.",
  },
  verb: {
    born: "They were born here.", lived: "They lived here.", worked: "They worked here.",
    died: "They died here.", buried: "They are buried here.",
    commemorated: "They are remembered here — without the source telling us what happened here.",
    built: "They built or designed it.", exhibited: "Their work hangs here.",
  },
};

const WHY_DEAD = {
  what: "No traces of this kind in the atlas yet — plaques, houses and statues are the next harvest.",
  access: "Nothing in the current corpus has this access.",
  marking: "Nothing in the current corpus has this marking.",
  verb: "Nothing in the corpus records this — the plaque layer will bring more of them.",
};

/* ── the record card's side file: portraits and occupations, fetched ONCE, on the first click.
 * Keeping it out of the main bundle is what lets the bundle stay at 127 bytes a row (D6); fetching
 * it lazily is what stops a reader who never opens a pin from paying for it. */
let PEOPLE = null, peopleWaiters = [];
// The volatile half (DECISIONS D4, D7): published opening hours, keyed by the site's own
// coordinate. 50 KB, so it comes down at boot — but it is a separate file on a separate cadence,
// and nothing in the permanent corpus depends on it having arrived.
let HOURS = null;
function needPeople(then) {
  if (PEOPLE) return then();
  peopleWaiters.push(then);
  if (peopleWaiters.length > 1) return;                 // a fetch is already in flight
  fetch("culture/data/people.json?v=" + DATA_V)
    .then((r) => (r.ok ? r.json() : { p: {} }))
    .then((d) => { PEOPLE = d.p || {}; peopleWaiters.splice(0).forEach((f) => f()); })
    .catch(() => { PEOPLE = {}; peopleWaiters.splice(0).forEach((f) => f()); });
}
const thumb = (file, w) => file
  ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${w}`
  : null;

/* ── data ──
 * A site row is [name, lat, lon, kindIndex]; naming the columns beats counting commas. */
const S_NAME = 0, S_LAT = 1, S_LON = 2, S_KIND = 3;
let VOCAB = {}, SITES = [], TRACES = [];
let deepState = "none";   // none | loading | loaded — what the stats line has to admit
const F_PORTRAIT = 1, F_GRAVEPIC = 2, F_PLACELESS = 4;

/* ── state: one object, every dimension ── */
const state = {
  what: {}, mount: {}, access: {}, marking: {}, dom: {}, verb: {},
  q: "", yearMin: -Infinity, yearMax: Infinity, near: null, site: null, topN: 0,
  colorBy: "dom", person: null, personName: "",
};
// The renown dial (DECISIONS D6). Fame never decided who is IN the corpus; it is the reader's
// control over how much of it to look at. `rankCut` is recomputed from the current selection, so
// "the top 100" means the hundred best known of *what you are already filtering to* — the top 100
// writers, not the hundred best known people who happen to be writers.
let rankCut = 0;
function recomputeRankCut() {
  if (!state.topN) { rankCut = 0; return; }
  const ranks = [];
  for (const r of TRACES) if (passesExcept(r, "table", "renown")) ranks.push(r.rank);
  if (ranks.length <= state.topN) { rankCut = 0; return; }
  ranks.sort((a, z) => z - a);
  rankCut = ranks[state.topN - 1];
}

/* ── THE DIMENSIONS (CHASSIS §1) ────────────────────────────────────────────────────────────
 * Every filter is a row here. `appliesTo` replaces the sibling's hardcoded ternaries, and is what
 * stops `tablePass()` from ever being forked again. `family` marks the set-of-values dimensions
 * whose chips are generated from the bundle's own vocabulary — so a new value in the data cannot
 * be forgotten in the interface, which is exactly the bug check_views.py exists to catch.
 */
const ALL = ["map", "panel", "table"];
const DIMENSIONS = [
  { id: "what",    family: true, appliesTo: ALL, test: (r) => state.what[r.what] !== false },
  { id: "mount",   family: true, appliesTo: ALL, test: (r) => state.mount[r.mount] !== false },
  { id: "access",  family: true, appliesTo: ALL, test: (r) => state.access[r.access] !== false },
  { id: "marking", family: true, appliesTo: ALL, test: (r) => state.marking[r.marking] !== false },
  { id: "dom",     family: true, appliesTo: ALL, test: (r) => state.dom[r.dom] !== false },
  { id: "verb",    family: true, appliesTo: ALL, test: (r) => state.verb[r.verb] !== false },
  // A person with no dates stays visible at every slider position — the honesty rule lives inside
  // the predicate, not in a note beside it (CHASSIS §3d).
  { id: "life", appliesTo: ALL, test: (r) => {
      const a = r.born, b = r.died;
      if (a == null && b == null) return true;
      return (b ?? a) >= state.yearMin && (a ?? b) <= state.yearMax; } },
  { id: "text", appliesTo: ALL, test: (r) => !state.q || r._s.includes(state.q) },
  { id: "site", appliesTo: ALL, test: (r) => state.site == null || r.site === state.site },
  { id: "renown", appliesTo: ALL, test: (r) => !state.topN || r.rank >= rankCut },
  // Picking somebody out of the search does not merely fly there: it narrows the atlas to them,
  // the way the sibling's picker sets `museumFilter` when you click a museum (CHASSIS §3c).
  // Flying without narrowing left the panel behind still listing everyone matching the raw text.
  { id: "person", appliesTo: ALL, test: (r) => !state.person || r.qid === state.person },
  // A settlement is not an address (DECISIONS D9): listed and searchable, never pinned.
  { id: "pinnable", appliesTo: ["map", "panel"], test: (r) => !(r.flags & F_PLACELESS) },
];
const passes = (r, view) =>
  DIMENSIONS.every((d) => !d.appliesTo.includes(view) || d.test(r));
// Facet counts: how many rows this value would show if it were the only thing you changed.
const passesExcept = (r, view, skipId) =>
  DIMENSIONS.every((d) => d.id === skipId || !d.appliesTo.includes(view) || d.test(r));

/* ── map ── */
const HOME = [46, 6], HOME_ZOOM = 4;
const map = L.map("map", { worldCopyJump: true, zoomControl: true }).setView(HOME, HOME_ZOOM);
const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  // Wikidata is CC0 and Open Plaques is public domain: neither requires this. We credit them
  // anyway, and OSM's ODbL does require it. Attribution for the photographs is a separate question
  // and is answered per image, not here (../../LLM.md §5).
  // ODbL asks for this and now earns it twice: the tiles and the exact graves are both OSM.
  attribution: 'map & exact graves © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors (ODbL) · ' +
    'people & places <a href="https://www.wikidata.org">Wikidata</a> (CC0) · ' +
    'plaques <a href="https://openplaques.org">Open Plaques</a> (PD) · ' +
    'hours <a href="https://opendata.euskadi.eus">Open Data Euskadi</a>',
}).addTo(map);
// Aggregation, done by us instead of by MarkerCluster — and over EVERYTHING, which is the whole
// point. The screen is cut into cells and each cell becomes ONE pin carrying the total of every
// place inside it. Nothing is hidden and no number is a sample: a pin that says 3 412 means 3 412
// people are under it. Zooming in splits the cell, which is how the individual places emerge.
//
// (The first attempt drew the three most renowned places per cell and dropped the rest. It was
// fast and it was a lie — Paris showed one pin saying 43 while thousands sat underneath it.)
const pinLayer = L.layerGroup().addTo(map);

const CELL = 54;        // px — the grain of the aggregation

/* ── what the pins are coloured BY ───────────────────────────────────────────────────────────
 * A pin is a pie over everything underneath it, which is what makes the count honest. The pie has
 * to be over *something*, and there is no reason that something must always be the profession.
 * Colouring by verb answers a different question with the same mechanism and the same arithmetic:
 * how much of what is here is a birth, a death, a grave.
 *
 * Emoji cannot aggregate — you cannot draw 1 913 of them in one circle — so they appear exactly
 * where they mean something: on a pin that holds ONE trace. The marks are the genealogical ones,
 * ∗ for born and † for died, because they read at 20 px where an emoji turns to mush.
 */
const PALETTE = {
  dom: {}, // from the CSS variables, per domain
  verb: { born: "#5f8f4e", lived: "#3d6a86", worked: "#b08d3f", died: "#7c3f3f",
          buried: "#6b6250", commemorated: "#9a958a", built: "#8a7250", exhibited: "#7a5a8a" },
  access: { "open-air": "#5a6b57", hours: "#b08d3f", "outside-only": "#3d6a86",
            gone: "#a3552f", unknown: "#c3bdb0" },
  marking: { museum: "#3d6a86", plaque: "#b08d3f", monument: "#7c4a4a", tomb: "#6b6250",
             unmarked: "#a3552f", unknown: "#c3bdb0" },
};
// Identical to LABEL.verbChip above, on purpose. `buried` is ⚱️ and not 🪦 only because 🪦 is
// already the mark for the PLACE (`what: grave`); the two would sit side by side saying the same
// thing twice. 💐 for `remembered` is Víctor's call over my objection that a bouquet is an act of
// mourning rather than a record of one — he is right that it is the gesture the thing represents.
const VERB_MARK = { born: "🌱", lived: "🔑", worked: "🛠️", died: "🕯️", buried: "⚱️",
                    commemorated: "💐", built: "📐", exhibited: "🖼️" };

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const domColor = (d) => cssVar("--dom-" + (VOCAB.dom?.[d] ?? "other")) || "#9a958a";

function colourKey(r) { return r[state.colorBy]; }
function colourFor(k) {
  if (state.colorBy === "dom") return domColor(k);
  const v = VOCAB[state.colorBy]?.[k];
  return PALETTE[state.colorBy][v] || "#9a958a";
}

function pinIcon(counts, n, mark) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const size = n > 200 ? 40 : n > 40 ? 32 : n > 5 ? 26 : 20;
  let acc = 0;
  const stops = Object.entries(counts).sort((a, z) => z[1] - a[1]).map(([d, c]) => {
    const a = (acc / total) * 100; acc += c;
    return `${colourFor(+d)} ${a}% ${(acc / total) * 100}%`;
  }).join(",");
  // One trace under the pin: say WHAT it is, with a mark. More than one: say how many.
  const label = n > 1 ? `<b>${n > 999 ? "999+" : n}</b>`
              : (mark ? `<b class="mk">${mark}</b>` : "");
  return L.divIcon({ className: "pin", iconSize: [size, size], iconAnchor: [size / 2, size / 2], html:
    `<i style="background:conic-gradient(${stops})"></i>${label}` });
}

const places = [];   // {siteIdx, rows, lat, lon} — plain data. A marker is made only if it is drawn.

function buildPlaces() {
  pinLayer.clearLayers(); places.length = 0;
  const by = new Map();
  for (const r of TRACES) {
    if (r.flags & F_PLACELESS) continue;
    if (!by.has(r.site)) by.set(r.site, []);
    by.get(r.site).push(r);
  }
  for (const [siteIdx, rows] of by) {
    const s = SITES[siteIdx];
    places.push({ siteIdx, rows, lat: s[S_LAT], lon: s[S_LON], marker: null, shown: false, sig: "", vis: rows });
  }
}

function markerFor(pl) {
  if (pl.marker) return pl.marker;
  const m = L.marker([pl.lat, pl.lon], { icon: pinIcon({ 0: 1 }, pl.vis.length) });
  // Lazily: building a popup for a place nobody opened cost fifteen seconds per keystroke.
  m.bindPopup(() => sitePopup(pl.siteIdx, pl.vis), { maxWidth: 340 });
  m.bindTooltip(() => `${SITES[pl.siteIdx][S_NAME]} · ${pl.vis.length}`,
                { direction: "top", offset: [0, -12] });
  pl.marker = m;
  return m;
}

const CARD_MAX = 40;

function personRow(r) {
  const isPlaque = r.qid.startsWith("op");
  const pf = (PEOPLE && PEOPLE[r.qid]) || null;
  const src = pf && thumb(pf[0], 96);
  const th = src
    ? `<img class="th" src="${esc(src)}" alt="" loading="lazy">`
    : `<span class="th ph">${isPlaque ? "▭" : "·"}</span>`;
  const occ = pf && pf[1] ? `<div class="by">${esc(pf[1])}</div>` : "";
  const life = lifeStr(r);
  const acc = VOCAB.access[r.access], mk = VOCAB.marking[r.marking];
  const facts = [LABEL.verb[VOCAB.verb[r.verb]] || VOCAB.verb[r.verb],
                 (LABEL.access[acc] || acc), mk !== "unknown" ? (LABEL.marking[mk] || mk) : null]
                .filter(Boolean).join(" · ");
  const links = isPlaque ? "" :
    `<div class="lk">` +
    `<a href="https://www.wikidata.org/wiki/Special:GoToLinkedPage?site=${LANG}wiki&itemid=${esc(r.qid)}"` +
    ` target="_blank" rel="noopener">Wikipedia</a> · ` +
    `<a href="https://www.wikidata.org/wiki/${esc(r.qid)}" target="_blank" rel="noopener">Wikidata</a></div>`;
  return `<li class="pop-person" data-qid="${esc(r.qid)}">${th}<div class="wk">` +
    `<div class="wt">${esc(r.name)}${life ? ` <span class="yr">${esc(life)}</span>` : ""}</div>` +
    `${occ}<div class="fx">${esc(facts)}</div>${links}</div></li>`;
}

function hoursFor(s) {
  if (!HOURS) return null;
  return HOURS[`${s[S_LAT].toFixed(5)},${s[S_LON].toFixed(5)}`] || null;
}

function sitePopup(siteIdx, rows) {
  const s = SITES[siteIdx];
  const sorted = rows.slice().sort((a, z) => z.rank - a.rank);
  const acc = VOCAB.access[sorted[0].access];
  const meta = [VOCAB.siteKind[s[S_KIND]] || null, LABEL.access[acc] || acc,
                `${rows.length} ${rows.length === 1 ? "person" : "people"}`].filter(Boolean).join(" · ");
  // Published hours, never an assertion: the string, who published it, and the day they last
  // touched it. The atlas says what the administration said; it does not say "open" (D7).
  const h = hoursFor(s);
  const hoursBlock = h
    ? `<div class="hrs"><div class="hrs-h">🕐 ${esc(h.h)}</div>` +
      `<div class="hrs-src">per ${esc((h.src || "").replace(/^Open Data /, "Open Data "))}` +
      `${h.at ? `, last updated ${esc(String(h.at).split(" ")[0])}` : ""}` +
      `${h.web ? ` · <a href="${esc(h.web)}" target="_blank" rel="noopener">their site</a>` : ""}</div></div>`
    : "";
  const items = sorted.slice(0, CARD_MAX).map(personRow).join("");
  const more = sorted.length > CARD_MAX
    ? `<li class="pop-more">…and ${sorted.length - CARD_MAX} more — they are all in the list beside the map</li>` : "";
  return `<div class="card"><div class="hd"><div class="nm">${esc(s[S_NAME])}</div>` +
    `<div class="meta">${esc(meta)}</div>${hoursBlock}</div>` +
    `<ul class="people">${items}${more}</ul></div>`;
}

const lifeStr = (r) => r.born == null && r.died == null ? ""
  : `${r.born ?? "?"}–${r.died ?? "?"}`;

/* ── refresh: filter → quota → draw (CHASSIS §2, DECISIONS D6) ── */
function drawMap() {
  // Two bounds on purpose, and they must not be confused. Pins are drawn a little beyond the edge
  // (`draw`) so nothing pops in as you pan; the COUNTS are of what is actually on screen (`seen`),
  // because the panel counts that and two different numbers both labelled "in view" on the same
  // screen is a small lie of exactly the kind this project keeps refusing to tell.
  const draw = map.getBounds().pad(0.3);
  const seen = map.getBounds();
  const cells = new Map();
  let inView = 0, rowsInView = 0;
  for (const pl of places) {
    if (!draw.contains([pl.lat, pl.lon])) continue;
    const vis = pl.rows.filter((r) => passes(r, "map"));
    if (!vis.length) continue;
    pl.vis = vis;
    if (seen.contains([pl.lat, pl.lon])) { inView++; rowsInView += vis.length; }
    let w = 0;
    for (const r of vis) if (r.rank > w) w = r.rank;
    pl.w = w;
    const pt = map.latLngToContainerPoint([pl.lat, pl.lon]);
    const key = ((pt.x / CELL) | 0) + ":" + ((pt.y / CELL) | 0);
    let c = cells.get(key);
    if (!c) cells.set(key, (c = { places: [], n: 0, counts: {}, best: null, w: -1 }));
    c.places.push(pl);
    c.n += vis.length;
    for (const r of vis) { const k = colourKey(r); c.counts[k] = (c.counts[k] || 0) + 1; }
    // The pin sits on the most renowned place in the cell, so it is always on something real
    // rather than on an averaged coordinate in the middle of a river.
    if (w > c.w) { c.w = w; c.best = pl; }
  }

  // Every redraw builds new markers, so anything still attached to an old one is left pointing at
  // a marker that no longer exists, and Leaflet throws deep inside `layerPointToContainerPoint`.
  // A popup is the obvious one; a TOOLTIP does exactly the same and is easy to forget, because it
  // opens on hover and nobody thinks of it as open.
  map.closePopup();
  pinLayer.eachLayer((l) => { if (l.closeTooltip) l.closeTooltip(); });
  pinLayer.clearLayers();
  for (const c of cells.values()) {
    const only = c.n === 1 ? (c.best.vis[0] || null) : null;
    const m = L.marker([c.best.lat, c.best.lon],
                       { icon: pinIcon(c.counts, c.n, only && VERB_MARK[VOCAB.verb[only.verb]]) });
    if (c.places.length === 1) {
      m.bindPopup(() => sitePopup(c.best.siteIdx, c.best.vis), { maxWidth: 360, autoPan: false });
      m.on("click", () => needPeople(() => {
        if (m._map && m.isPopupOpen()) m.setPopupContent(sitePopup(c.best.siteIdx, c.best.vis));
      }));
      m.bindTooltip(`${SITES[c.best.siteIdx][S_NAME]} · ${c.n}`, { direction: "top", offset: [0, -12] });
    } else {
      m.bindPopup(() => cellPopup(c), { maxWidth: 360, autoPan: false });
      m.bindTooltip(`${c.places.length} places · ${c.n} people`, { direction: "top", offset: [0, -12] });
      // A grouped pin is a door, not a destination: clicking it goes in.
      m.on("click", () => map.setView([c.best.lat, c.best.lon], Math.min(map.getZoom() + 3, 18)));
    }
    pinLayer.addLayer(m);
  }
  return { pins: cells.size, inView, rowsInView };
}

function cellPopup(c) {
  const top = c.places.slice().sort((a, z) => z.vis.length - a.vis.length);
  const list = top.slice(0, 14).map((pl) => {
    const best = pl.vis.slice().sort((a, z) => z.rank - a.rank)[0];
    return `<li class="pop-place" data-lat="${pl.lat}" data-lon="${pl.lon}">` +
      `<span class="dot" style="background:${colourFor(colourKey(best))}"></span>` +
      `<div class="wk"><div class="wt">${esc(SITES[pl.siteIdx][S_NAME])}</div>` +
      `<div class="by">${esc(best.name)}${pl.vis.length > 1 ? ` and ${pl.vis.length - 1} more` : ""}</div></div>` +
      `<span class="yr">${pl.vis.length}</span></li>`;
  }).join("");
  return `<div class="card"><div class="hd"><div class="nm">${c.n.toLocaleString()} people</div>` +
    `<div class="meta">in ${c.places.length.toLocaleString()} places here · click the pin to zoom in</div></div>` +
    `<ul class="people">${list}</ul>` +
    (top.length > 14 ? `<div class="pop-more">…and ${top.length - 14} more places</div>` : "") + `</div>`;
}

// A row inside a grouped pin's card flies to that place.
map.on("popupopen", (e) => {
  const el = e.popup.getElement();
  if (!el) return;
  el.querySelectorAll(".pop-person[data-qid]").forEach((li) => li.addEventListener("click", (ev) => {
    if (ev.target.closest("a")) return;                 // the links keep their own action
    map.closePopup();
    openPerson(li.dataset.qid);
  }));
  el.querySelectorAll(".pop-place").forEach((li) => li.addEventListener("click", () => {
    map.closePopup();
    map.setView([+li.dataset.lat, +li.dataset.lon], Math.max(map.getZoom() + 3, 15));
  }));
});

function renderPersonChip() {
  const box = $("personchip");
  if (!box) return;
  box.hidden = !state.person;
  if (state.person)
    box.innerHTML = `<span>only <b>${esc(state.personName)}</b></span>` +
      `<button type="button" id="person-clear" title="Show everybody again">✕</button>`;
}
document.addEventListener("click", (e) => {
  if (!e.target.closest("#person-clear")) return;
  state.person = null; state.personName = ""; refresh();
});

function statsLine(pins, inView, rowsInView) {
  const grouped = pins < inView
    ? `${inView.toLocaleString()} places here, grouped into ${pins.toLocaleString()} pins — zoom in to split them`
    : `${inView.toLocaleString()} ${inView === 1 ? "place" : "places"} here, one pin each`;
  const tableN = TRACES.filter((r) => passes(r, "table")).length;
  const placeless = TRACES.filter((r) => passes(r, "table") && (r.flags & F_PLACELESS)).length;
  return `${grouped} · ${rowsInView.toLocaleString()} people in view · ` +
    `${tableN.toLocaleString()} traces pass the filters` +
    (placeless ? ` · ${placeless.toLocaleString()} of them unpinnable` : "") +
    // Under-reporting without saying so is the whole family of bug this project keeps refusing.
    (deepState === "loading" ? " · still loading the long tail…" : "");
}

function refresh() {
  recomputeRankCut();
  const { pins, inView, rowsInView } = drawMap();
  $("stats").textContent = statsLine(pins, inView, rowsInView);
  renderFamilies();
  renderWho();
  renderLegend();
  renderGlossary();
  renderPersonChip();
  foldSummary();
  markRailEnds();
  if (state.near) renderNearMe(); else renderPanel();
  if (tableOn) renderTable();
}

/* ── the legend ───────────────────────────────────────────────────────────────────────────────
 * Eleven colours on every pin and nothing on screen saying what they mean. The sibling has a
 * legend; not porting it was an oversight that only shows up when somebody arrives who did not
 * build the thing. It doubles as the colour-by switch, because the two questions — "what do these
 * colours mean" and "what should they mean" — are the same control.
 */
function renderLegend() {
  const box = $("legend");
  if (!box) return;
  const fam = state.colorBy;
  const counts = VOCAB[fam].map((_, i) =>
    TRACES.reduce((n, r) => n + (r[fam] === i && passes(r, "table") ? 1 : 0), 0));
  const label = (v) => fam === "verb" ? (LABEL.verbChip[v] || v)
                     : fam === "dom" ? (LABEL.dom[v] || v)
                     : (LABEL.access[v] || v).replace(/^\S+\s/, "");
  const swatches = VOCAB[fam].map((v, i) => counts[i]
    ? `<span class="lg-i" title="${esc(String(counts[i]))}">` +
      `<span class="lg-sw" style="background:${colourFor(i)}"></span>` +
      `${fam === "verb" && VERB_MARK[v] ? `<span class="lg-mk">${VERB_MARK[v]}</span>` : ""}` +
      `${esc(label(v))}</span>` : "").join("");
  box.innerHTML =
    `<span class="fam-lbl">Colour by</span>` +
    ["dom", "verb", "access"].map((f) =>
      `<button type="button" class="lg-by${f === fam ? " on" : ""}" data-by="${f}">` +
      `${f === "dom" ? "profession" : f === "verb" ? "what they did" : "access"}</button>`).join("") +
    `<span class="lg-keys">${swatches}</span>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("#legend button[data-by]");
  if (!b) return;
  state.colorBy = b.dataset.by;
  buildPlaces();            // the marks live on the icons, so the pins are rebuilt
  refresh();
});

/* ── the glossary, written out ───────────────────────────────────────────────────────────────
 * Tooltips answer the desktop reader and nobody else: a phone has no hover. So the same sentences
 * are also here, in the drawer, as a list you can read. It costs one <details> and it is the only
 * place in the interface where the atlas says what its own words mean.
 */
function renderGlossary() {
  const box = $("glossary");
  if (!box || box.dataset.done) return;
  const fam = (f) => {
    const vals = VOCAB[f] || [];
    const rows = vals.map((v) => {
      const help = (HELP[f] && HELP[f][v]) || "";
      if (!help) return "";
      const label = f === "verb" ? (LABEL.verbChip[v] || v) : (LABEL[f] && LABEL[f][v]) || v;
      return `<li><b>${esc(label)}</b> ${esc(help)}</li>`;
    }).join("");
    return rows ? `<h4>${esc(FAMILY_LABEL[f] || f)}</h4><ul>${rows}</ul>` : "";
  };
  box.innerHTML = ["what", "access", "marking", "verb"].map(fam).join("");
  box.dataset.done = "1";
}

/* ── chips: generated from the bundle's vocabulary, with live facet counts ──
 * Nothing here names a value: add "outside-only" to the data and its chip appears. A value with
 * no rows is drawn dead, with the reason (CHASSIS §4) instead of silently doing nothing.
 */
/* ── which axes earn a place on screen ───────────────────────────────────────────────────────
 * Measured, not felt. Knowing the TRACE KIND tells you 84 % of the verb, 73 % of the marking and
 * 61 % of the access: four rows of chips saying nearly the same thing four times, which is why
 * there seemed to be too many of them.
 *
 *   what → verb     84 %        marking's biggest value is `unknown`: 85 842 rows, 42 %
 *   what → marking  73 %        — a confession, not a filter
 *   what → access   61 %        access still earns its row; marking does not
 *
 * So: `what` is the primary control and `access` keeps its own row, because it is the question
 * this atlas exists to answer and a third of it is genuinely independent. `verb` appears only when
 * the current selection actually has verbs to choose between. `marking` moves to the drawer.
 */
// Values that exist so a family can partition the corpus, and that nobody would ever click.
// `mount: n/a` means "not a plaque" — 124 928 rows of structural filler, offered as a choice.
const HIDDEN_VALUES = { mount: ["n/a"] };

const FAMILY_BOX = { what: "fam-what", mount: "fam-mount", access: "fam-access",
                     verb: "fam-verb", marking: "fam-marking" };
const FAMILY_LABEL = { what: "What", mount: "Where the plaque is", access: "Can I see it?",
                       verb: "What happened here", marking: "Marking" };
function renderFamilies() {
  for (const [fam, boxId] of Object.entries(FAMILY_BOX)) {
    const box = $(boxId); if (!box) continue;
    const counts = VOCAB[fam].map((_, i) =>
      TRACES.reduce((n, r) => n + (r[fam] === i && passesExcept(r, "table", fam) ? 1 : 0), 0));
    const html = VOCAB[fam].map((v, i) => {
      if ((HIDDEN_VALUES[fam] || []).includes(v)) return "";
      const on = state[fam][i] !== false, dead = counts[i] === 0;
      // The chip IS the button, and clicking it means ONLY THIS — which is what you want nine
      // times in ten, and what a checkbox could never say. Clicking the same chip again gives
      // everything back. The little + is the tenth time: add this one to what is already up, or
      // take it away. Two affordances, the common one under the whole target.
      const soleSurvivor = on && VOCAB[fam].every((_, j) => j === i || state[fam][j] === false);
      const label = esc((fam === "verb" ? LABEL.verbChip[v] : LABEL[fam]?.[v]) ?? v);
      const help = (HELP[fam] && HELP[fam][v]) || "";
      if (dead)
        return `<span class="chipwrap"><span class="chip dead" title="${esc(help || WHY_DEAD[fam] || "")}">` +
               `${label}</span></span>`;
      const tip = help + (help ? "\n\n" : "") +
                  (soleSurvivor ? "Click to show everything again" : "Click to show only this");
      return `<span class="chipwrap">` +
        `<button type="button" class="chip${on ? " on" : ""}${soleSurvivor ? " sole" : ""}" ` +
        `data-only="${fam}:${i}" title="${esc(tip)}">` +
        `${label}<span class="n">${num(counts[i])}</span></button>` +
        `<button type="button" class="plus${on ? " on" : ""}" data-add="${fam}:${i}" ` +
        `title="${on ? "Take this one out" : "Add this one too"}">${on ? "−" : "+"}</button></span>`;
    }).join("");
    // A row offering one option is not a choice, it is furniture. The verb row hides itself when
    // the current selection has nothing to choose between — which is applicability made visible
    // rather than a ternary buried in a predicate (CHASSIS §1).
    // Clicking `only` on a chip is the moment somebody most wants to know what it means, and it is
    // the moment the tooltip cannot help them (a phone has no hover). So the explanation appears
    // under the row, for whatever they have just isolated.
    const soleIdx = VOCAB[fam].findIndex((_, j) =>
      state[fam][j] !== false && VOCAB[fam].every((_, k) => k === j || state[fam][k] === false));
    const note = soleIdx >= 0 && HELP[fam] && HELP[fam][VOCAB[fam][soleIdx]]
      ? `<span class="fam-note">${esc(HELP[fam][VOCAB[fam][soleIdx]])}</span>` : "";
    const live = counts.filter((c) => c > 0).length;
    const hideable = fam === "verb" || fam === "marking" || fam === "mount";
    box.hidden = hideable && live < 2;
    box.innerHTML = `<span class="fam-lbl">${esc(FAMILY_LABEL[fam] || fam)}</span>` + html + note;
  }
}
document.addEventListener("click", (e) => {
  const add = e.target.closest(".fam button[data-add]");
  if (add) {
    const [fam, i] = add.dataset.add.split(":");
    const next = state[fam][+i] === false;
    // never leave a family with nothing in it: that is an empty map with no way back
    if (!next && VOCAB[fam].every((_, j) => j === +i || state[fam][j] === false)) return;
    state[fam][+i] = next;
    refresh(); return;
  }
  const o = e.target.closest(".fam button[data-only]");
  if (o) {
    const [fam, i] = o.dataset.only.split(":");
    const sole = state[fam][+i] !== false &&
                 VOCAB[fam].every((_, j) => j === +i || state[fam][j] === false);
    VOCAB[fam].forEach((_, j) => { state[fam][j] = sole ? true : j === +i; });
    refresh();
  }
});

/* ── professions: a popover, not fifteen more chips ──────────────────────────────────────────
 * The bar was already crowded, so this follows the sibling's painter selector: one button, a
 * checklist behind it, and three verbs instead of one. `only` isolates, `also` adds a whole group
 * to what is on screen, and the tick adds or removes without disturbing the rest — because ONLY is
 * the right verb the first time and the wrong one the second (CHASSIS §3a).
 */
function domCounts() {
  return VOCAB.dom.map((_, i) =>
    TRACES.reduce((n, r) => n + (r.dom === i && passesExcept(r, "table", "dom") ? 1 : 0), 0));
}
function renderWho() {
  const box = $("who");
  const counts = domCounts();
  const on = VOCAB.dom.filter((_, i) => state.dom[i] !== false).length;
  const label = on === VOCAB.dom.length ? "All professions"
              : on === 1 ? (LABEL.dom[VOCAB.dom.findIndex((_, i) => state.dom[i] !== false)] || "1 profession")
              : `${on} professions`;
  const everythingOn = on === VOCAB.dom.length;
  const rows = VOCAB.dom.map((v, i) => {
    const isOn = state.dom[i] !== false;
    return `<li class="prow"><label><input type="checkbox" data-dom="${i}"${isOn ? " checked" : ""}>` +
      `<span class="sw" style="background:${isOn ? domColor(i) : "#cfc7bd"}"></span>` +
      `${esc(LABEL.dom[v] || v)}<span class="n">${num(counts[i])}</span></label>` +
      (isOn && !everythingOn ? "" : `<button type="button" class="only" data-only="${i}">only</button>`) +
      (!isOn ? `<button type="button" class="also" data-also="${i}">also</button>` : "") +
      `</li>`;
  }).join("");
  box.innerHTML = `<button id="who-btn" class="chip" type="button" aria-expanded="false">${esc(label)} ▾</button>` +
    `<div id="who-pop" class="pop"${$("who-pop") && !$("who-pop").hidden ? "" : " hidden"}>` +
    `<div class="pop-actions"><button type="button" data-all="1">all</button>` +
    `<button type="button" data-all="0">none</button></div><ul>${rows}</ul></div>`;
}
document.addEventListener("click", (e) => {
  if (e.target.id === "who-btn") {
    const pop = $("who-pop"); pop.hidden = !pop.hidden;
    $("who-btn").setAttribute("aria-expanded", String(!pop.hidden));
    return;
  }
  const only = e.target.closest("#who-pop button[data-only]");
  if (only) { VOCAB.dom.forEach((_, i) => { state.dom[i] = i === +only.dataset.only; }); refresh(); return; }
  const also = e.target.closest("#who-pop button[data-also]");
  if (also) { state.dom[+also.dataset.also] = true; refresh(); return; }
  const all = e.target.closest("#who-pop button[data-all]");
  if (all) { VOCAB.dom.forEach((_, i) => { state.dom[i] = all.dataset.all === "1"; }); refresh(); return; }
  if (!e.target.closest("#who") && $("who-pop") && !$("who-pop").hidden) $("who-pop").hidden = true;
});
document.addEventListener("change", (e) => {
  const cb = e.target.closest("#who-pop input[data-dom]"); if (!cb) return;
  state.dom[+cb.dataset.dom] = cb.checked; refresh();
});

/* ── one-click answers ──────────────────────────────────────────────────────────────────────
 * "Visible now" is the question this atlas was built for: what can I walk to and look at, right
 * this minute, with no door in the way. It is one click because it is the point.
 */
$("preset-now").addEventListener("click", () => {
  const openAir = VOCAB.access.indexOf("open-air");
  const on = VOCAB.access.every((_, i) => (i === openAir) === (state.access[i] !== false));
  VOCAB.access.forEach((_, i) => { state.access[i] = on ? true : i === openAir; });
  $("preset-now").classList.toggle("active", !on);
  refresh();
});
$("reset").addEventListener("click", () => {
  for (const fam of ["what", "mount", "access", "marking", "dom", "verb"])
    VOCAB[fam].forEach((_, i) => { state[fam][i] = true; });
  state.topN = 0; state.q = ""; state.near = null; state.site = null;
  state.person = null; state.personName = "";
  $("filter").value = ""; $("filter-clear").hidden = true;
  $("preset-now").classList.remove("active");
  $("locate").classList.remove("active");
  $("renown").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.top === "0"));
  buildTimeline(TL_MIN, TL_MAX);
  refresh();
});

/* ── the renown dial ── */
document.addEventListener("click", (e) => {
  const b = e.target.closest("#renown button[data-top]"); if (!b) return;
  state.topN = +b.dataset.top;
  $("renown").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  refresh();
});

/* ── one person, everything they left ────────────────────────────────────────────────────────
 * The atlas is person-anchored (DECISIONS D1) and until now you could not actually see a person:
 * only the places, with people inside them. This is the other direction — Chopin's grave in
 * Père-Lachaise, his heart in Warsaw, his plaques in seven cities, all on one card, in one list,
 * with the map able to frame the lot.
 */
const byPerson = new Map();
function indexPeople() {
  byPerson.clear();
  for (const r of TRACES) {
    if (!byPerson.has(r.qid)) byPerson.set(r.qid, []);
    byPerson.get(r.qid).push(r);
  }
}

const WHAT_ICON = { grave: "🪦", plaque: "▭", house: "🏠", statue: "🗿",
                    museum: "🏛", church: "⛪" };

function openPerson(qid) {
  const rows = byPerson.get(qid);
  if (!rows || !rows.length) return;
  needPeople(() => {
    const r0 = rows[0];
    const pf = (PEOPLE && PEOPLE[qid]) || null;
    const src = pf && thumb(pf[0], 160);
    const life = lifeStr(r0);
    const countries = new Set(rows.filter((r) => !(r.flags & F_PLACELESS)).map((r) => r.site));
    const sorted = rows.slice().sort((a, z) => a.verb - z.verb);

    const items = sorted.map((r, i) => {
      const acc = VOCAB.access[r.access], mk = VOCAB.marking[r.marking];
      const pinnable = !(r.flags & F_PLACELESS);
      return `<li class="sh-trace${pinnable ? "" : " unpinnable"}" data-i="${i}">` +
        `<span class="ic">${WHAT_ICON[VOCAB.what[r.what]] || "·"}</span><div class="wk">` +
        `<div class="wt">${esc(SITES[r.site][S_NAME])}</div>` +
        `<div class="fx">${esc(LABEL.verb[VOCAB.verb[r.verb]] || VOCAB.verb[r.verb])} · ` +
        `${esc(LABEL.access[acc] || acc)}${mk !== "unknown" ? " · " + esc(LABEL.marking[mk] || mk) : ""}</div>` +
        (pinnable ? "" : `<div class="fx warn">the source names a town, not a place — nothing to pin</div>`) +
        `</div></li>`;
    }).join("");

    $("sheet-body").innerHTML =
      `<div class="sh-head">` +
      (src ? `<img class="sh-por" src="${esc(src)}" alt="">` : `<div class="sh-por ph">·</div>`) +
      `<div><div class="sh-name">${esc(r0.name)}</div>` +
      `<div class="sh-life">${esc(life)}</div>` +
      (pf && pf[1] ? `<div class="sh-occ">${esc(pf[1])}</div>` : "") +
      `<div class="sh-count">${rows.length} ${rows.length === 1 ? "trace" : "traces"}` +
      `${countries.size > 1 ? ` in ${countries.size} places` : ""}</div>` +
      `<div class="sh-links">` +
      (qid.startsWith("op") || qid.startsWith("mus:") ? "" :
        `<a href="https://www.wikidata.org/wiki/Special:GoToLinkedPage?site=${LANG}wiki&itemid=${esc(qid)}" target="_blank" rel="noopener">Wikipedia</a> · ` +
        `<a href="https://www.wikidata.org/wiki/${esc(qid)}" target="_blank" rel="noopener">Wikidata</a>`) +
      // The other atlas. Same person, same QID, a different question about them — where their work
      // hangs rather than where they lie. The link only appears for the painters it knows.
      (pf && pf[2]
        ? ` · <a class="sh-sib" href="https://victorelvira.github.io/projects/artatlas.html#${esc(pf[2])}"` +
          ` target="_blank" rel="noopener" title="Their paintings, on the Atlas of Painting">` +
          `🖼 Their paintings</a>` : "") +
      `</div></div></div>` +
      `<div class="sh-actions"><button type="button" id="sh-fit">🗺 Frame them all</button></div>` +
      `<ul class="sh-list">${items}</ul>`;

    $("sheet").hidden = false;
    $("sheet-body").querySelectorAll(".sh-trace").forEach((li) => li.addEventListener("click", () => {
      const r = sorted[+li.dataset.i];
      if (r.flags & F_PLACELESS) return banner("The source names a town, not a place — there is nothing to fly to.");
      closeSheet();
      map.setView([SITES[r.site][S_LAT], SITES[r.site][S_LON]], 16);
    }));
    const fit = $("sh-fit");
    if (fit) fit.addEventListener("click", () => {
      const pts = sorted.filter((r) => !(r.flags & F_PLACELESS))
                        .map((r) => [SITES[r.site][S_LAT], SITES[r.site][S_LON]]);
      if (!pts.length) return banner("Nothing of theirs can be pinned.");
      closeSheet();
      if (pts.length === 1) map.setView(pts[0], 16);
      else map.fitBounds(L.latLngBounds(pts), { padding: [60, 60] });
    });
  });
}
function closeSheet() { $("sheet").hidden = true; }
$("sheet-close").addEventListener("click", closeSheet);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

/* ── side panel: filter → group → render plan → stream (CHASSIS §5) ── */
const PANEL_CHUNK = 80;
let panelPlan = [], panelCursor = 0, panelIO = null;
const folded = new Set();
let panelSort = "place";

function renderPanel() {
  if (panelIO) panelIO.disconnect();
  const b = map.getBounds();
  const vis = [];
  for (const pl of places) {
    const s = SITES[pl.siteIdx];
    if (!b.contains([s[S_LAT], s[S_LON]])) continue;
    for (const r of pl.rows) if (passes(r, "panel")) vis.push(r);
  }
  $("panel-head").innerHTML = `<b>${vis.length.toLocaleString()}</b>` +
    `<span class="ph-tail"> ${vis.length === 1 ? "person" : "people"} in view</span>`;
  const ul = $("worklist");
  if (!vis.length) {
    ul.innerHTML = `<li class="empty">${t("Pan or zoom the map — whoever is in view is listed here.")}</li>`;
    return;
  }
  panelPlan = [];
  if (panelSort === "place") {
    const groups = new Map();
    for (const r of vis) { if (!groups.has(r.site)) groups.set(r.site, []); groups.get(r.site).push(r); }
    const ordered = [...groups.entries()].sort((a, z) => z[1].length - a[1].length);
    for (const [siteIdx, rows] of ordered) {
      rows.sort((a, z) => z.rank - a.rank);
      panelPlan.push({ grp: { siteIdx, n: rows.length } });
      if (!folded.has(siteIdx)) for (const r of rows) panelPlan.push({ r });
    }
  } else {
    const cmp = { rank: (a, z) => z.rank - a.rank,
                  year: (a, z) => (a.born ?? a.died ?? 9999) - (z.born ?? z.died ?? 9999),
                  name: (a, z) => a.name.localeCompare(z.name) }[panelSort];
    for (const r of vis.slice().sort(cmp)) panelPlan.push({ r, flat: true });
  }
  panelCursor = 0; ul.innerHTML = ""; appendChunk();
}

function rowHTML(r, flat) {
  const acc = VOCAB.access[r.access], mk = VOCAB.marking[r.marking];
  return `<li class="row" data-qid="${esc(r.qid)}" data-site="${r.site}" title="Open this person">` +
    `<span class="dot" style="background:${colourFor(colourKey(r))}"></span>` +
    `<span class="nm">${esc(r.name)}</span><span class="yr">${lifeStr(r)}</span>` +
    `<span class="tags">` +
    (flat ? `<span class="badge">${esc(SITES[r.site][S_NAME].slice(0, 22))}</span>` : "") +
    `<span class="badge acc-${esc(acc)}">${esc((LABEL.access[acc] || acc).replace(/^\S+\s/, ""))}</span>` +
    (mk !== "unknown" ? `<span class="badge">${esc((LABEL.marking[mk] || mk).replace(/^\S+\s/, ""))}</span>` : "") +
    `</span></li>`;
}
function appendChunk() {
  const ul = $("worklist");
  const end = Math.min(panelCursor + PANEL_CHUNK, panelPlan.length);
  let html = "";
  for (let i = panelCursor; i < end; i++) {
    const it = panelPlan[i];
    if (it.grp) {
      const s = SITES[it.grp.siteIdx];
      html += `<li class="grp" data-site="${it.grp.siteIdx}">` +
        `<span>${folded.has(it.grp.siteIdx) ? "▸" : "▾"}</span>` +
        `<span class="gname">${esc(s[S_NAME])}</span>` +
        `<span class="gsub">${it.grp.n} ${it.grp.n === 1 ? "person" : "people"}</span></li>`;
    } else html += rowHTML(it.r, it.flat);
  }
  ul.insertAdjacentHTML("beforeend", html);
  panelCursor = end;
  if (panelCursor < panelPlan.length) {
    const sentinel = ul.lastElementChild;
    panelIO = new IntersectionObserver((es) => {
      if (es.some((x) => x.isIntersecting)) { panelIO.disconnect(); appendChunk(); }
    }, { root: ul, rootMargin: "300px" });
    if (sentinel) panelIO.observe(sentinel);
  }
}
$("worklist").addEventListener("click", (e) => {
  const g = e.target.closest("li.grp");
  if (g) { const i = +g.dataset.site; folded.has(i) ? folded.delete(i) : folded.add(i); renderPanel(); return; }
  const row = e.target.closest("li.row");
  if (!row) return;
  // A name opens the person; a row without one (near-me lists places) flies to the place.
  if (row.dataset.qid) { openPerson(row.dataset.qid); return; }
  const s = SITES[+row.dataset.site];
  map.setView([s[S_LAT], s[S_LON]], Math.max(map.getZoom(), 14));
});
// "fold all" acts on the render plan, never on the rows that happen to be on screen (CHASSIS §5)
$("pv-fold").addEventListener("click", () => {
  const anyOpen = places.some((pl) => !folded.has(pl.siteIdx));
  places.forEach((pl) => anyOpen ? folded.add(pl.siteIdx) : folded.delete(pl.siteIdx));
  renderPanel();
});
$("pv-sort").addEventListener("change", (e) => { panelSort = e.target.value; renderPanel(); });
// Panning and zooming change which cells exist, so the quota has to be re-run — that IS the
// mechanism by which zooming in reveals the ones that were held back.
map.on("moveend", () => {
  const { pins, inView, rowsInView } = drawMap();
  const quota = pins < inView
    ? `${inView.toLocaleString()} places here, grouped into ${pins.toLocaleString()} pins — zoom in to split them`
    : `${inView.toLocaleString()} ${inView === 1 ? "place" : "places"} here, one pin each`;
  const tableN = TRACES.filter((r) => passes(r, "table")).length;
  $("stats").textContent = `${quota} · ${rowsInView.toLocaleString()} people in view · ` +
    `${tableN.toLocaleString()} traces pass the filters`;
  if (!state.near) renderPanel();
});

/* ── table: the SAME predicate, a different view name. No second copy. ── */
let tableOn = false, tableSort = { key: "rank", dir: -1 };
const COLS = [
  { key: "name", label: "Person" }, { key: "born", label: "Born", num: true },
  { key: "died", label: "Died", num: true }, { key: "_site", label: "Place" },
  { key: "_access", label: "Access" }, { key: "_marking", label: "Marking" },
  { key: "_dom", label: "Domain" }, { key: "rank", label: "Renown", num: true },
];
const cell = (r, k) => k === "_site" ? SITES[r.site][S_NAME] : k === "_access" ? VOCAB.access[r.access]
  : k === "_marking" ? VOCAB.marking[r.marking] : k === "_dom" ? VOCAB.dom[r.dom] : r[k];
function renderTable() {
  const rows = TRACES.filter((r) => passes(r, "table"));
  const k = tableSort.key, num = COLS.find((c) => c.key === k)?.num;
  rows.sort((a, z) => {
    const va = num ? (cell(a, k) ?? -1e9) : deacc(cell(a, k)), vb = num ? (cell(z, k) ?? -1e9) : deacc(cell(z, k));
    return (va < vb ? -1 : va > vb ? 1 : 0) * tableSort.dir;
  });
  $("table-count").textContent = `${rows.length.toLocaleString()} traces`;
  $("traces-table").querySelector("thead").innerHTML = "<tr>" + COLS.map((c) =>
    `<th data-k="${c.key}">${esc(c.label)}${tableSort.key === c.key ? (tableSort.dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("") + "</tr>";
  $("traces-table").querySelector("tbody").innerHTML = rows.slice(0, 3000).map((r) =>
    "<tr>" + COLS.map((c) => `<td>${esc(cell(r, c.key) ?? "")}</td>`).join("") + "</tr>").join("");
}
$("traces-table").querySelector("thead").addEventListener("click", (e) => {
  const th = e.target.closest("th"); if (!th) return;
  if (tableSort.key === th.dataset.k) tableSort.dir *= -1;
  else tableSort = { key: th.dataset.k, dir: th.dataset.k === "rank" ? -1 : 1 };
  renderTable();
});
function setTable(on) {
  tableOn = on;
  $("table").hidden = !on; $("main").style.display = on ? "none" : "flex";
  $("v-table").classList.toggle("active", on); $("v-map").classList.toggle("active", !on);
  if (on) renderTable(); else map.invalidateSize();
}
$("v-table").addEventListener("click", () => setTable(true));
$("v-map").addEventListener("click", () => setTable(false));

/* ── the search box finds THINGS, not just rows ──────────────────────────────────────────────
 * The filter narrows every view, which is right and was never the problem. The problem was that
 * the panel only shows what is inside the map, so typing "Goya" showed whoever happened to be on
 * screen — four separate rows for his four traces, under a man called Goyau. You could explore the
 * atlas and you could not look anything up in it.
 *
 * So the box now also offers what it found: PEOPLE (one row each, with all their traces) and
 * PLACES. Picking one goes there. This is the sibling's painter box (CHASSIS §3c), where typing
 * also finds museums and clicking one sets a different dimension — one box, several kinds of
 * answer, no mode switch.
 */
const SUGGEST_MAX = 8;

function findEntities(q) {
  const people = [];
  for (const [qid, rows] of byPerson) {
    if (!rows[0]._s) continue;
    if (!deacc(rows[0].name).includes(q)) continue;
    let rank = 0;
    for (const r of rows) if (r.rank > rank) rank = r.rank;
    // an exact prefix beats a match buried in the middle: "Goya" must not rank under "Goyau"
    people.push({ qid, name: rows[0].name, rows, rank,
                  exact: deacc(rows[0].name).startsWith(q) ? 1 : 0 });
  }
  people.sort((a, z) => z.exact - a.exact || z.rank - a.rank || a.name.length - z.name.length);

  const seen = new Set();
  const places = [];
  for (let i = 0; i < SITES.length && places.length < 200; i++) {
    const nm = SITES[i][S_NAME];
    if (!deacc(nm).includes(q) || seen.has(nm)) continue;
    seen.add(nm);
    places.push({ i, name: nm });
  }
  return { people: people.slice(0, SUGGEST_MAX), places: places.slice(0, 4) };
}

function renderSuggest(q) {
  const box = $("suggest");
  if (!q || q.length < 2) { box.hidden = true; return; }
  const { people, places } = findEntities(q);
  if (!people.length && !places.length) { box.hidden = true; return; }
  const pRow = (p) => {
    const pf = (PEOPLE && PEOPLE[p.qid]) || null;
    const src = pf && thumb(pf[0], 64);
    const life = lifeStr(p.rows[0]);
    return `<li class="sg-person" data-qid="${esc(p.qid)}">` +
      (src ? `<img class="sg-th" src="${esc(src)}" alt="" loading="lazy">` : `<span class="sg-th ph">·</span>`) +
      `<div class="wk"><div class="wt">${esc(p.name)}` +
      `${life ? ` <span class="yr">${esc(life)}</span>` : ""}</div>` +
      `<div class="by">${pf && pf[1] ? esc(pf[1]) + " · " : ""}` +
      `${p.rows.length} ${p.rows.length === 1 ? "trace" : "traces"}</div></div></li>`;
  };
  box.innerHTML =
    (people.length ? `<li class="sg-h">People</li>` + people.map(pRow).join("") : "") +
    (places.length ? `<li class="sg-h">Places</li>` + places.map((pl) =>
      `<li class="sg-place" data-site="${pl.i}"><span class="sg-th ph">⌖</span>` +
      `<div class="wk"><div class="wt">${esc(pl.name)}</div></div></li>`).join("") : "");
  box.hidden = false;
}

$("suggest").addEventListener("click", (e) => {
  const per = e.target.closest(".sg-person");
  if (per) {
    $("suggest").hidden = true;
    state.person = per.dataset.qid;
    state.personName = (byPerson.get(state.person) || [{}])[0].name || "";
    const rows = byPerson.get(per.dataset.qid) || [];
    const pts = rows.filter((r) => !(r.flags & F_PLACELESS))
                    .map((r) => [SITES[r.site][S_LAT], SITES[r.site][S_LON]]);
    // go there first, then open the card: the map should already be right behind it
    refresh();
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [70, 70] });
    openPerson(per.dataset.qid);
    return;
  }
  const plc = e.target.closest(".sg-place");
  if (plc) {
    $("suggest").hidden = true;
    const s = SITES[+plc.dataset.site];
    map.setView([s[S_LAT], s[S_LON]], 16);
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest("#filter-wrap")) $("suggest").hidden = true;
});

/* ── free text ── */
const filterBox = $("filter");
let qTimer = null;
filterBox.addEventListener("input", () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => {
    state.q = deacc(filterBox.value.trim());
    $("filter-clear").hidden = !filterBox.value;
    renderSuggest(state.q);
    refresh();
  }, 160);
});
$("filter-clear").addEventListener("click", () => {
  filterBox.value = ""; state.q = ""; $("filter-clear").hidden = true;
  $("suggest").hidden = true; refresh();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.activeElement === filterBox) {
    if (!$("suggest").hidden) { $("suggest").hidden = true; return; }
    $("filter-clear").click();
  }
  // Enter takes the first suggestion — the whole point is not having to aim at it
  if (e.key === "Enter" && document.activeElement === filterBox) {
    const first = $("suggest").querySelector(".sg-person, .sg-place");
    if (first) first.click();
  }
});

/* ── lifetime slider ── */
let TL_MIN = -500, TL_MAX = 2026;
function buildTimeline(min, max) {
  TL_MIN = min; TL_MAX = max;
  const lo = $("tl-min"), hi = $("tl-max"), label = $("tl-label"), fill = $("tl-fill");
  lo.min = hi.min = min; lo.max = hi.max = max; lo.value = min; hi.value = max;
  state.yearMin = min; state.yearMax = max;
  const paint = () => {
    const span = max - min || 1;
    fill.style.left = ((state.yearMin - min) / span) * 100 + "%";
    fill.style.right = 100 - ((state.yearMax - min) / span) * 100 + "%";
    label.textContent = `${state.yearMin} – ${state.yearMax}`;
  };
  const update = () => {
    let a = +lo.value, b = +hi.value;
    if (a > b) { if (document.activeElement === lo) { b = a; hi.value = b; } else { a = b; lo.value = a; } }
    state.yearMin = a; state.yearMax = b; paint(); refresh();
  };
  lo.addEventListener("input", update); hi.addEventListener("input", update); paint();
}

/* ── near me: the sibling's adaptive radius (CHASSIS §3f), here crossed with access ── */
const NEAR_RADII = [1, 2, 5, 10, 25, 50, 100, 250];
function nearSites(lat, lon) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  return places.map((pl) => {
    const s = SITES[pl.siteIdx];
    const dLat = rad(s[S_LAT] - lat), dLon = rad(s[S_LON] - lon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(s[S_LAT])) * Math.sin(dLon / 2) ** 2;
    const vis = pl.rows.filter((r) => passes(r, "map"));
    return { s, d: 2 * R * Math.asin(Math.sqrt(a)), n: vis.length, rows: vis, siteIdx: pl.siteIdx };
  }).filter((x) => x.n).sort((a, z) => a.d - z.d);
}
function renderNearMe() {
  const { lat, lon, radiusKm } = state.near;
  const within = nearSites(lat, lon).filter((v) => v.d <= radiusKm);
  $("panel-head").innerHTML = `<b>${within.length}</b><span class="ph-tail"> places within ${radiusKm} km</span>`;
  const chips = NEAR_RADII.map((r) =>
    `<button type="button" class="pvbtn rchip${r === radiusKm ? " on" : ""}" data-r="${r}">${r}</button>`).join("");
  let html = `<li class="grp"><span class="gname">Radius km</span><span class="gsub">${chips}</span></li>`;
  if (!within.length) html += `<li class="empty">Nothing within ${radiusKm} km — try a larger radius.</li>`;
  for (const v of within) {
    const km = v.d < 1 ? `${Math.round(v.d * 1000)} m` : `${v.d < 10 ? v.d.toFixed(1) : Math.round(v.d)} km`;
    html += `<li class="row" data-site="${v.siteIdx}"><span class="nm">${esc(v.s[S_NAME])}</span>` +
      `<span class="yr">${v.n} ${v.n === 1 ? "person" : "people"}</span>` +
      `<span class="tags"><span class="badge">${km}</span></span></li>`;
  }
  $("worklist").innerHTML = html;
  $("worklist").querySelectorAll(".rchip").forEach((b) =>
    b.addEventListener("click", () => { state.near.radiusKm = +b.dataset.r; renderNearMe(); }));
}
$("locate").addEventListener("click", () => {
  const btn = $("locate");
  if (state.near) { state.near = null; btn.classList.remove("active"); renderPanel(); return; }
  if (!navigator.geolocation) return banner("Geolocation is not available in this browser.");
  btn.textContent = "📍 Locating…"; btn.disabled = true;
  navigator.geolocation.getCurrentPosition((pos) => {
    btn.disabled = false; btn.textContent = "📍 Near me"; btn.classList.add("active");
    const { latitude: lat, longitude: lon } = pos.coords;
    if (tableOn) setTable(false);
    const all = nearSites(lat, lon);
    const d0 = all.length ? all[0].d : Infinity;
    state.near = { lat, lon, radiusKm: NEAR_RADII.find((r) => r >= d0) || NEAR_RADII.at(-1) };
    map.setView([lat, lon], 11);
    renderNearMe();
  }, (err) => {
    btn.disabled = false; btn.textContent = "📍 Near me";
    banner("Could not get your location: " + err.message);
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
});

let bTimer = null;
function banner(msg) {
  const b = $("banner"); b.textContent = msg; b.hidden = false;
  clearTimeout(bTimer); bTimer = setTimeout(() => { b.hidden = true; }, 5000);
}
$("chrome-toggle").addEventListener("click", () => {
  document.body.classList.toggle("chrome-off"); map.invalidateSize();
});

/* ── folding the controls away ────────────────────────────────────────────────────────────────
 * On a phone the filter rows eat half the screen and the map — the thing the atlas IS — gets what
 * is left. One button folds them, and it says how many filters are still doing something, because
 * a folded control that is silently filtering is worse than no control at all.
 */
function foldSummary() {
  let n = 0;
  for (const fam of ["what", "access", "marking", "verb", "dom"])
    if (VOCAB[fam] && VOCAB[fam].some((_, i) => state[fam][i] === false)) n++;
  if (state.topN) n++;
  if (state.person) n++;
  const folded = document.body.classList.contains("folded");
  $("fold").innerHTML = folded
    ? `Filters ▾${n ? ` <b>${n}</b>` : ""}`
    : `Filters ▴${n ? ` <b>${n}</b>` : ""}`;
  $("fold").setAttribute("aria-expanded", String(!folded));
}
$("fold").addEventListener("click", () => {
  document.body.classList.toggle("folded");
  foldSummary();
  requestAnimationFrame(() => { map.invalidateSize({ pan: false }); renderPanel(); });
});
// a phone opens with the map, not with the controls
if (window.matchMedia("(max-width: 720px)").matches) document.body.classList.add("folded");
// The fade at the right edge of a scrolling rail is a promise that there is more; it has to stop
// promising when there is not. Cheap to compute, and the alternative is a control nobody finds.
function markRailEnds() {
  for (const id of ["modes-rail", "axes", "legend"]) {
    const el = $(id);
    if (!el) continue;
    el.classList.toggle("at-end", el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }
}
["modes-rail", "axes", "legend"].forEach((id) => {
  const el = $(id);
  if (el) el.addEventListener("scroll", markRailEnds, { passive: true });
});
window.addEventListener("resize", markRailEnds);

document.querySelector(".brand").addEventListener("click", (e) => {
  e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload();
});

/* ── absorbing a file ─────────────────────────────────────────────────────────────────────────
 * The corpus ships in two files (DECISIONS D6, and build.py's split): a base with everyone the
 * reader has heard of plus every plaque, statue and house, and a long tail of graves of people
 * with fewer than twenty Wikipedia editions. The tail arrives afterwards, while the map already
 * works, and its site indices are relative to its own file — so they are shifted on the way in.
 */
const siteAt = new Map();   // "lat,lon" → index in SITES

function absorb(d) {
  const ix = Object.fromEntries(d.cols.map((c, i) => [c, i]));
  // One site, one pin (DECISIONS D5) — and the two files each carry their own copy of any place
  // they share, because each renumbers only the sites it uses. Père-Lachaise arrived twice, and so
  // did 9 107 other coordinates. Merging on the coordinate also catches the honest case: a statue
  // and a grave standing at the same spot are one place to go to.
  const local = [];
  for (const s of d.sites) {
    const key = s[S_LAT] + "," + s[S_LON];
    let i = siteAt.get(key);
    if (i === undefined) { i = SITES.length; SITES.push(s); siteAt.set(key, i); }
    local.push(i);
  }
  for (const a of d.traces) {
    const site = local[a[ix.site]];
    const r = { qid: a[ix.qid], name: a[ix.name], born: a[ix.born], died: a[ix.died],
                site, what: a[ix.what], access: a[ix.access], marking: a[ix.marking],
                verb: a[ix.verb], rank: a[ix.rank], flags: a[ix.flags], dom: a[ix.dom],
                mount: a[ix.mount] };
    r._s = deacc(r.name + " " + SITES[site][S_NAME]);
    TRACES.push(r);
  }
}

/* ── boot ── */
fetch("culture/data/atlas.json?v=" + DATA_V)
  .then((r) => r.json())
  .then((d) => {
    // NOT `SITES = d.sites`: absorb() appends d.sites into SITES, and if they are the same array
    // it appends the array to itself, doubling forever. It reached 134 217 728 entries before the
    // page gave up. Aliasing an array you are about to append to is a very quiet way to hang.
    VOCAB = d.vocab; BUILD_AT = d.built;
    absorb(d);
    $("build").textContent = `v${DATA_V} · ${BUILD_AT}`;
    for (const fam of ["what", "mount", "access", "marking", "dom", "verb"])
      VOCAB[fam].forEach((_, i) => { state[fam][i] = true; });
    const years = TRACES.map((r) => r.died ?? r.born).filter((y) => y != null).sort((a, b) => a - b);
    buildTimeline(years[Math.floor(years.length * 0.01)] || -500, years.at(-1) || 2026);
    indexPeople();
    buildPlaces();
    // ORDER MATTERS. Leaflet is built before the flex layout exists and measures itself 0×0.
    // MarkerCluster indexes what it is given at the map's CURRENT size and zoom, so adding 47 000
    // markers while the map still thinks it is 0×0 collapses every one of them into a single
    // "999+" bubble in the middle of the screen. Measure first, insert second.
    // Twice on purpose. The first call is for the common case; the second runs after the browser
    // has laid out and painted once, which is when the map's box is final. A single call at boot
    // landed on a 0×0 map and drew an empty world — and since the box never changed again
    // afterwards, the ResizeObserver below had nothing to react to and it stayed empty.
    // refresh() is under 200 ms now, so paying for it twice at boot costs nothing.
    //
    // And the view is re-set each time: `pan: false` keeps the map's top-LEFT pixel fixed, so
    // resizing from 0×0 to 940×464 slides the centre by half the new size — the atlas opened over
    // Kuwait. Only at boot; a later resize must not yank the reader back to the home view.
    const settle = () => {
      map.invalidateSize({ pan: false });
      map.setView(HOME, HOME_ZOOM, { animate: false });
      refresh();
    };
    settle();
    requestAnimationFrame(settle);
    // Warm the record card's side file once the map is up: 1.4 MB fetched while nobody is waiting
    // beats 1.4 MB fetched at the moment somebody clicks.
    setTimeout(() => needPeople(() => {}), 1200);
    fetch("culture/data/hours.json?v=" + DATA_V)
      .then((r) => (r.ok ? r.json() : null))
      .then((h) => { if (h) { HOURS = h.h || {}; } })
      .catch(() => {});

    // The long tail, once the map is up and the reader is already looking at something. Nobody
    // waits for it, and the stats line says it is coming rather than quietly under-reporting.
    if (d.deep) {
      deepState = "loading";
      setTimeout(() => {
        fetch("culture/data/" + d.deep + "?v=" + DATA_V)
          .then((r) => (r.ok ? r.json() : null))
          .then((extra) => {
            if (!extra) { deepState = "none"; return; }
            absorb(extra);
            deepState = "loaded";
            // the long tail's half of the record-card file rides in with it
            fetch("culture/data/people-deep.json?v=" + DATA_V)
              .then((r) => (r.ok ? r.json() : null))
              .then((more) => { if (more && PEOPLE) Object.assign(PEOPLE, more.p || {}); })
              .catch(() => {});
            indexPeople();
            const years = TRACES.map((r) => r.died ?? r.born).filter((y) => y != null).sort((a, b) => a - b);
            if (years.length) buildTimeline(years[Math.floor(years.length * 0.01)], years.at(-1));
            buildPlaces();
            refresh();
          })
          .catch(() => { deepState = "none"; });
      }, 2500);
    }

    // And keep measuring: a ResizeObserver fires exactly when the box changes — first layout,
    // window resize, phone rotation, the panel folding away — where a timer only guesses, and lost
    // that race about half the time. `pan: false` because the default pans by half the size
    // difference, which from 0×0 is a 470 px shove that moves the map off centre.
    let rTimer = null;
    new ResizeObserver(() => {
      clearTimeout(rTimer);
      rTimer = setTimeout(() => {
        if (!document.getElementById("map").clientHeight) return;
        map.invalidateSize({ pan: false });
        refresh();
      }, 60);
    }).observe(document.getElementById("map"));
  })
  .catch((e) => banner("Could not load the atlas data: " + e.message));
