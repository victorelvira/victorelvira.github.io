/* Culture Atlas · app.js
 *
 * The spine is the sibling's (CHASSIS.md §1): one `state`, one predicate, every view calls it.
 * The fix is §1's: the predicate is a DECLARATIVE list, so there is never a second hand-maintained
 * copy of it for the table, and "does this dimension apply here?" is a field rather than a ternary.
 */
const DATA_V = "0.29.2";
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
const t = (s) => s;                                   // i18n hook: same shape as the sibling's
// Which Wikipedia the "Wikipedia" link goes to. Not a translation of the interface (that comes
// later, through t()): just the courtesy of not sending a Spanish reader to en.wikipedia.
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
  // German (Víctor checked) and renaming it to something blander would be inventing a worse
  // word for a thing that already has one. What was actually missing was not a translation: it
  // was the atlas explaining itself where somebody is looking. See the note under each row.
  // ⚔️ for battles is Víctor's (2026-09-14); 🗓️ for the other events is provisional, a neutral mark
  // for assassinations, attacks and massacres, where anything louder would be the wrong tone.
  what: { grave: "🪦 Grave", plaque: "🪧 Plaque", house: "🏠 House", statue: "🗿 Statue",
          museum: "🏛 Museum", church: "⛪ Church", battle: "⚔️ Battle", event: "🗓️ Event" },
  // A Stolperstein is a plaque; what differs is where it is mounted. Grouped, and still tellable
  // apart: the distinction appears only when there are plaques to tell apart.
  mount: { wall: "🧱 On a wall", ground: "🟫 In the pavement", "n/a": "Not a plaque" },
  dom: { letters: "Letters", music: "Music", image: "Art and architecture", stage: "Stage and screen", science: "Science",
         power: "Politics and power", faith: "Religion", sport: "Sport", trade: "Business",
         other: "Other", nobody: "No person named" },
  verb: { born: "was born", lived: "lived", worked: "worked", died: "died", buried: "is buried",
          commemorated: "is remembered", built: "built it", exhibited: "is exhibited", happened: "happened" },
  // The chip carries the SAME mark the map draws on a pin holding one thing (VERB_MARK below):
  // the filter row teaches you to read the map instead of being a second vocabulary.
  //
  // These were monochrome glyphs until 2026-09-12, on my claim that an emoji "turns to mush" at
  // 12 px inside a coloured circle. Víctor asked why the verb row did not match the others, I
  // rendered every candidate inside a real 22 px pin, and the claim was simply wrong: 🌱, 🕯️ and
  // 🔑 are perfectly legible there. An assertion I had never tested was costing the interface its
  // consistency.
  verbChip: { born: "🌱 Born", lived: "🔑 Lived", worked: "🛠️ Worked", died: "🕯️ Died",
              buried: "⚱️ Buried", commemorated: "💐 Remembered", built: "📐 Built",
              exhibited: "🖼️ Exhibited", happened: "🗓️ Happened" },
};
// The same words without their mark, for running text (a card's line, a list badge, the table). A value the
// sources do not know says nothing: "? Unknown" on a card read as a broken field.
const PLAIN = { "open-air": "Always visible", hours: "Opening hours", "outside-only": "Seen from outside", gone: "Gone" };
const plain = (fam, v) => (v === "unknown" || v == null ? "" : fam === "access" && PLAIN[v] ? PLAIN[v] :
  ((fam === "verb" ? LABEL.verbChip[v] : LABEL[fam] && LABEL[fam][v]) || v).replace(/^[^\p{L}]+/u, ""));
const capital = (x) => (x ? x[0].toUpperCase() + x.slice(1) : x);
/* ── the interface explaining itself ─────────────────────────────────────────────────────────
 * Víctor, who built this atlas, asked what a Stolperstein was. If the author does not know the
 * word, nobody arriving does, and half these labels are terms of art somebody (me) invented:
 * `outside-only`, `unmarked`, `exhibited`, `remembered`. A chip that needs explaining and does not
 * explain itself is a chip that filters by mystery.
 */
const HELP = {
  mount: {
    wall: "A plaque on a building, the ordinary kind: you read it standing on the pavement.",
    ground: "A Stolperstein: a brass cobble set INTO the pavement, outside the last home a victim of Nazi persecution chose freely. Gunter Demnig has laid more than 100 000 of them since 1992, which makes this the largest memorial in the world and the only one you walk on. Every one begins HIER WOHNTE, “here lived”. 14 874 of the 16 479 here commemorate somebody with no Wikipedia article at all, which is exactly the point.",
    "n/a": "Not a plaque.",
  },
  what: {
    grave: "Where they are buried: a cemetery, a church, or the stone itself when somebody has mapped it.",
    plaque: "A commemorative plaque, on a wall or set into the pavement. Read the inscription: it is on the record.",
    house: "A building they were born in, lived in or died in. Often still somebody's home.",
    statue: "A statue, bust, obelisk or memorial standing outdoors because of them.",
    museum: "A museum: one about them, or one holding their work.",
    church: "A church or chapel that holds them.",
    battle: "Where a battle was fought. A battlefield is an area, not a spot: the pin marks where Wikidata places it.",
    event: "Where something happened that history remembers: an assassination, a terrorist attack, a massacre.",
  },
  access: {
    "open-air": "Out in the open. No door, no ticket, no hours: you can walk up to it right now.",
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
    commemorated: "They are remembered here, without the source telling us what happened here.",
    built: "They built or designed it.", exhibited: "Their work hangs here.",
    happened: "Not a person's trace: the place where a battle or an event took place.",
  },
};

const WHY_DEAD = {
  what: "No traces of this kind in the atlas yet.",
  access: "Nothing in the current corpus has this access.",
  marking: "Nothing in the current corpus has this marking.",
  verb: "Nothing in the corpus records this yet.",
};

/* ── the record card's side file: portraits and occupations, fetched ONCE, on the first click.
 * Keeping it out of the main bundle is what lets the bundle stay at 127 bytes a row (D6); fetching
 * it lazily is what stops a reader who never opens a pin from paying for it. */
let PEOPLE = null, peopleWaiters = [];
// The volatile half (DECISIONS D4, D7): published opening hours, keyed by the site's own
// coordinate. 50 KB, so it comes down at boot, but it is a separate file on a separate cadence,
// and nothing in the permanent corpus depends on it having arrived.
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
const S_NAME = 0, S_LAT = 1, S_LON = 2, S_KIND = 3, S_WHERE = 4, S_OSM = 5;
// The town and country, interned per file. "4 Rue Croix des Petits Champs" is a real address and
// a useless one: there is one in Paris and there could be one anywhere, and a reader standing in
// front of the wrong wall has no way to tell. Kept out of the NAME so that Père-Lachaise is not
// renamed "Père-Lachaise, Paris, France": two fields, each true, shown together.
const WHERES = [""];
const whereOf = (s) => WHERES[s[S_WHERE]] || "";
let VOCAB = {}, SITES = [], TRACES = [];
let deepState = "none";
let startLongTail = () => {};             // set at boot when the base names a long tail
let longTailWaiting = false;
let loadHere = () => {};                  // the long-tail squares on screen (0.28)   // none | loading | loaded: what the stats line has to admit
const F_PORTRAIT = 1, F_GRAVEPIC = 2, F_PLACELESS = 4;
// The pin's shape says what its colour and emoji cannot (Víctor, 2026-09-14: "necesitamos distintos
// códigos"): F_APPROX, the point stands for an AREA (a battlefield, a town, a square), drawn larger and
// dashed; F_SAINT, the person is canonised or beatified (Wikidata P411), drawn with a halo.
const F_APPROX = 8, F_SAINT = 16;

/* ── state: one object, every dimension ── */
// 0.27 DEFAULT: the 500 best known PEOPLE HERE, i.e. in the map as it stands. The whole world at once
// was 315 000 traces drawn as a carpet of pins, and "here" means a zoom into Madrid shows Madrid's best
// known, not whoever is best known on Earth and happens to be in Madrid. "all" is one tap away and the
// list says how many are held back (Víctor, 2026-09-15: "más inteligente en los que salen por defecto").
const TOP_DEFAULT = 500;
const state = {
  what: {}, mount: {}, access: {}, marking: {}, dom: {}, verb: {},
  q: "", yearMin: -Infinity, yearMax: Infinity, near: null, site: null, topN: TOP_DEFAULT, topWhere: "here",
  colorBy: "dom", person: null, personName: "", personSec: null, group: null,
};
// The renown dial (DECISIONS D6). Fame never decided who is IN the corpus; it is the reader's
// control over how much of it to look at. `rankCut` is recomputed from the current selection, so
// "the top 100" means the hundred best known of *what you are already filtering to*: the top 100
// writers, not the hundred best known people who happen to be writers.
let rankCut = 0;
// 0.27: it counts PEOPLE, not traces (a person with thirty statues took thirty of the hundred), and it
// can count them HERE (in the map's current bounds) or in the WORLD. Víctor: "quizás necesitamos los dos".
let heldBack = 0;
function recomputeRankCut() {
  heldBack = 0;
  if (!state.topN) { rankCut = 0; return; }
  const here = state.topWhere === "here" ? map.getBounds() : null;
  const best = new Map();
  for (const r of TRACES) {
    if (!passesExcept(r, "table", "renown")) continue;
    if (here && (r.flags & F_PLACELESS || !here.contains([SITES[r.site][S_LAT], SITES[r.site][S_LON]]))) continue;
    if ((best.get(r.qid) || 0) < r.rank) best.set(r.qid, r.rank);
  }
  if (best.size <= state.topN) { rankCut = 0; return; }
  const ranks = [...best.values()].sort((a, z) => z - a);
  rankCut = ranks[state.topN - 1];
  heldBack = ranks.filter((x) => x < rankCut).length;
}

/* ── THE DIMENSIONS (CHASSIS §1) ────────────────────────────────────────────────────────────
 * Every filter is a row here. `appliesTo` replaces the sibling's hardcoded ternaries, and is what
 * stops `tablePass()` from ever being forked again. `family` marks the set-of-values dimensions
 * whose chips are generated from the bundle's own vocabulary, so a new value in the data cannot
 * be forgotten in the interface, which is exactly the bug check_views.py exists to catch.
 */
const ALL = ["map", "panel", "table"];
const SEC_VERBS = { life: ["happened", "born", "lived", "worked", "died", "buried"], work: ["built", "exhibited"],
                    remembered: ["commemorated"] };
const DIMENSIONS = [
  { id: "what",    family: true, appliesTo: ALL, test: (r) => state.what[r.what] !== false },
  { id: "mount",   family: true, appliesTo: ALL, test: (r) => state.mount[r.mount] !== false },
  { id: "access",  family: true, appliesTo: ALL, test: (r) => state.access[r.access] !== false },
  { id: "marking", family: true, appliesTo: ALL, test: (r) => state.marking[r.marking] !== false },
  { id: "dom",     family: true, appliesTo: ALL, test: (r) => state.dom[r.dom] !== false },
  { id: "verb",    family: true, appliesTo: ALL, test: (r) => state.verb[r.verb] !== false },
  // A person with no dates stays visible at every slider position: the honesty rule lives inside
  // the predicate, not in a note beside it (CHASSIS §3d).
  { id: "life", appliesTo: ALL, test: (r) => {
      if (state.person) return true;        // a chosen person is shown whole: Aristotle predates the timeline's start
      const a = r.born, b = r.died;
      if (a == null && b == null) return true;
      return (b ?? a) >= state.yearMin && (a ?? b) <= state.yearMax; } },
  { id: "text", appliesTo: ALL, test: (r) => !state.q || r._s.includes(state.q) },
  { id: "site", appliesTo: ALL, test: (r) => state.site == null || r.site === state.site },
  // a person the reader chose is shown whole, whatever the dial says
  { id: "renown", appliesTo: ALL, test: (r) => !state.topN || !!state.person || r.rank >= rankCut },
  // Picking somebody out of the search does not merely fly there: it narrows the atlas to them,
  // the way the sibling's picker sets `museumFilter` when you click a museum (CHASSIS §3c).
  // Flying without narrowing left the panel behind still listing everyone matching the raw text.
  { id: "person", appliesTo: ALL, test: (r) => !state.person || r.qid === state.person || !!(state.group && state.group.has(r.qid)) },
  // one section of that person's card: their life, their work, or where they are remembered (D29)
  { id: "personSec", appliesTo: ALL, test: (r) => !state.person || !state.personSec ||
      (SEC_VERBS[state.personSec] || []).includes(VOCAB.verb[r.verb]) },
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
// Aggregation, done by us instead of by MarkerCluster, and over EVERYTHING, which is the whole
// point. The screen is cut into cells and each cell becomes ONE pin carrying the total of every
// place inside it. Nothing is hidden and no number is a sample: a pin that says 3 412 means 3 412
// people are under it. Zooming in splits the cell, which is how the individual places emerge.
//
// (The first attempt drew the three most renowned places per cell and dropped the rest. It was
// fast and it was a lie: Paris showed one pin saying 43 while thousands sat underneath it.)
const pinLayer = L.layerGroup().addTo(map);

const CELL = 54;        // px: the grain of the aggregation

/* ── what the pins are coloured BY ───────────────────────────────────────────────────────────
 * A pin is a pie over everything underneath it, which is what makes the count honest. The pie has
 * to be over *something*, and there is no reason that something must always be the profession.
 * Colouring by verb answers a different question with the same mechanism and the same arithmetic:
 * how much of what is here is a birth, a death, a grave.
 *
 * Emoji cannot aggregate (you cannot draw 1 913 of them in one circle) so they appear exactly
 * where they mean something: on a pin that holds ONE trace. The marks are the genealogical ones,
 * ∗ for born and † for died, because they read at 20 px where an emoji turns to mush.
 */
const PALETTE = {
  dom: {}, // from the CSS variables, per domain
  verb: { born: "#5f8f4e", lived: "#3d6a86", worked: "#b08d3f", died: "#7c3f3f",
          buried: "#6b6250", commemorated: "#9a958a", built: "#8a7250", exhibited: "#7a5a8a",
          happened: "#5a4a3a" },
  access: { "open-air": "#5a6b57", hours: "#b08d3f", "outside-only": "#3d6a86",
            gone: "#a3552f", unknown: "#c3bdb0" },
  marking: { museum: "#3d6a86", plaque: "#b08d3f", monument: "#7c4a4a", tomb: "#6b6250",
             unmarked: "#a3552f", unknown: "#c3bdb0" },
};
// Identical to LABEL.verbChip above, on purpose. `buried` is ⚱️ and not 🪦 only because 🪦 is
// already the mark for the PLACE (`what: grave`); the two would sit side by side saying the same
// thing twice. 💐 for `remembered` is Víctor's call over my objection that a bouquet is an act of
// mourning rather than a record of one: he is right that it is the gesture the thing represents.
const VERB_MARK = { born: "🌱", lived: "🔑", worked: "🛠️", died: "🕯️", buried: "⚱️",
                    commemorated: "💐", built: "📐", exhibited: "🖼️", happened: "🗓️" };

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const domColor = (d) => cssVar("--dom-" + (VOCAB.dom?.[d] ?? "other")) || "#9a958a";

function colourKey(r) { return r[state.colorBy]; }
function colourFor(k) {
  if (state.colorBy === "dom") return domColor(k);
  const v = VOCAB[state.colorBy]?.[k];
  return PALETTE[state.colorBy][v] || "#9a958a";
}

/* What a pin holding ONE trace shows. It used to be the verb's mark, always, so every museum on
 * the map carried 💐 ("remembered") and Víctor asked why museums were flowers. Verbs are for
 * PEOPLE, and only where they tell you something the kind does not (Víctor, 2026-09-13: "lo del
 * verbo es para personas; museos son museos"). A grave is 🪦, a statue 🗿, a museum 🏛, whatever
 * the verb; a plaque or a house shows 🌱 🔑 🛠️ 🕯️ 📐 when somebody was born, lived, worked, died
 * or built there, because that is the whole difference between two plaques. */
const PIN_VERBS = new Set(["born", "lived", "worked", "died", "built"]);
function pinMark(r) {
  const what = VOCAB.what[r.what], verb = VOCAB.verb[r.verb];
  if ((what === "plaque" || what === "house") && r.qid.startsWith("Q") && PIN_VERBS.has(verb))
    return VERB_MARK[verb];
  return WHAT_ICON[what] || "";
}

function pinIcon(counts, n, mark, area = false, halo = false) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  // An area is drawn larger than a spot of the same count: the circle is the size of the doubt.
  const size = (n > 200 ? 40 : n > 40 ? 32 : n > 5 ? 26 : 20) + (area ? 10 : 0);
  let acc = 0;
  const stops = Object.entries(counts).sort((a, z) => z[1] - a[1]).map(([d, c]) => {
    const a = (acc / total) * 100; acc += c;
    return `${colourFor(+d)} ${a}% ${(acc / total) * 100}%`;
  }).join(",");
  // One trace under the pin: say WHAT it is, with a mark. More than one: say how many.
  const label = n > 1 ? `<b>${n > 999 ? "999+" : n}</b>`
              : (mark ? `<b class="mk">${mark}</b>` : "");
  return L.divIcon({ className: "pin" + (area ? " area" : "") + (halo ? " halo" : ""),
    iconSize: [size, size], iconAnchor: [size / 2, size / 2], html:
    `<i style="background:conic-gradient(${stops})"></i>${label}` });
}

const places = [];   // {siteIdx, rows, lat, lon}: plain data. A marker is made only if it is drawn.

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

// What a person did at THIS place, in words. The chips say "died"; a card says "died here".
const HERE = { born: "born here", lived: "lived here", worked: "worked here", died: "died here",
  buried: "buried here", commemorated: "remembered here", built: "built this", exhibited: "work on show here" };

// A Commons picture that opens large when tapped (the sibling's thumbnails do the same).
const pic = (file, cls, w, cap) =>
  `<img class="${cls}" src="${esc(thumb(file, w))}" alt="" loading="lazy" data-file="${esc(file)}" data-cap="${esc(cap)}">`;

function personRow(r, headAccess) {
  const what = VOCAB.what[r.what], verb = VOCAB.verb[r.verb];
  const pf = (PEOPLE && PEOPLE[r.qid]) || null;
  const portrait = pf && pf[0];
  // The grave's own photograph, when Commons has one: on a grave card it is what you will see.
  const gravePic = what === "grave" && pf && pf[3];
  const main = portrait || gravePic;
  const th = main ? pic(main, "th", 144, portrait ? r.name : `The grave of ${r.name}`)
                  : `<span class="th ph">${WHAT_ICON[what] || "·"}</span>`;
  const second = portrait && gravePic
    ? `<div class="gp">${pic(gravePic, "gth", 96, `The grave of ${r.name}`)}<span>the grave</span></div>` : "";
  const occ = pf && pf[1] ? `<div class="by">${esc(pf[1])}</div>` : "";
  const life = lifeStr(r);
  const acc = VOCAB.access[r.access], mk = VOCAB.marking[r.marking];
  const facts = [`${WHAT_ICON[what] || ""} ${HERE[verb] || ""}`.trim(),
                 acc !== headAccess ? plain("access", acc) : null,
                 // the plaque IS the marking, and a museum is its own: saying so again is noise
                 mk !== what ? plain("marking", mk) : null]
                .filter(Boolean).join(" · ");
  const wq = r.qid.replace(/^ev:/, "");
  const links = `<div class="lk">` +
    `<a class="wp-link" data-q="${esc(wq)}" href="https://www.wikidata.org/wiki/Special:GoToLinkedPage?site=${LANG}wiki&itemid=${esc(wq)}"` +
    ` target="_blank" rel="noopener">Wikipedia</a> · ` +
    `<a href="https://www.wikidata.org/wiki/${esc(wq)}" target="_blank" rel="noopener">Wikidata</a></div>`;
  return `<li class="pop-person" data-qid="${esc(r.qid)}">${th}<div class="wk">` +
    `<div class="wt">${esc(r.name)}${life ? ` <span class="yr">${esc(life)}</span>` : ""}</div>` +
    `${occ}<div class="fx">${esc(facts)}</div>${second}${links}</div></li>`;
}

/* OSM's opening_hours is a machine syntax: "Tu-Fr 09:30-14:00; Sa,Su 10:00-14:00; PH off". Read out
 * for a person, display only: day and month abbreviations spelled out, "PH" as holidays, "off" as
 * closed, one rule a line. The source string is kept whole in the tooltip, and anything this does
 * not recognise is left exactly as OSM has it. Never rewrites what a Basque official source wrote. */
const OSM_WORDS = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun",
  PH: "public holidays", SH: "school holidays", off: "closed", closed: "closed" };
function readableHours(h, fromOsm) {
  if (!fromOsm) return esc(h);
  return h.split(/\s*;\s*/).filter(Boolean).map((rule) =>
    esc(rule.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su|PH|SH|off|closed)\b/g, (w) => OSM_WORDS[w])
            .replace(/-/g, "–").replace(/,(?=\S)/g, ", "))).join("<br>");
}

// Published hours, never an assertion (D7): the string, who published it, and the day it was last
// checked. The atlas says what the source said; it never says "open".
function hoursHTML(h) {
  return `<div class="hrs"><div class="hrs-h" title="${esc(h.h)}">🕐 ${readableHours(h.h, !!h.osm)}</div>` +
      `<div class="hrs-src">per ${h.osm
          ? `<a href="https://www.openstreetmap.org/${esc(h.osm)}" target="_blank" rel="noopener">${esc(h.src)}</a>`
          : esc(h.src || "")}` +
      // Dated, always (D7): the day the source itself last checked it, or, when OSM has no check
      // date, the day we read it, which is weaker and says so.
      `${h.at ? `, checked ${esc(String(h.at).split(" ")[0])}` : h.read ? `, as read on ${esc(h.read)} (never re-checked there)` : ""}` +
      `${h.web ? ` · <a href="${esc(h.web)}" target="_blank" rel="noopener">their site</a>` : ""}</div></div>`;
}

function sitePopup(siteIdx, rows) {
  const s = SITES[siteIdx];
  const sorted = rows.slice().sort((a, z) => z.rank - a.rank);
  const acc = VOCAB.access[sorted[0].access];
  // People are listed; a museum, or a plaque about a bridge, is the place itself and lives in the
  // head. Listing "Museo del Prado" as a person under "Museo del Prado" said the same thing twice.
  const kind = VOCAB.siteKind[s[S_KIND]] || "";
  // An event is listed like a person at a memorial that remembers it (0.26), and not at the place it
  // happened, where the card above already is the event.
  const persons = sorted.filter((r) => r.qid.startsWith("Q") ||
                                       (r.qid.startsWith("ev:") && !["battle", "event"].includes(kind)));
  // A site kind is a little wider than a trace kind: a cemetery holds graves.
  const kindIcon = WHAT_ICON[kind] || { cemetery: "🪦", building: "🏛" }[kind] || "";
  const meta = [kind ? capital(kind) : null, plain("access", acc),
                persons.length ? `${persons.length} ${persons.length === 1 ? "person" : "people"}` : null]
               .filter(Boolean).join(" · ");
  // Published hours, never an assertion: the string, who published it, and the day they last
  // touched it. The atlas says what the administration said; it does not say "open" (D7).
  const hoursBlock = kind === "museum" ? `<div class="hrs-slot" data-key="${s[S_LAT]},${s[S_LON]}"></div>` : "";
  const items = persons.slice(0, CARD_MAX).map((r) => personRow(r, acc)).join("");
  const more = persons.length > CARD_MAX
    ? `<li class="pop-more">…and ${persons.length - CARD_MAX} more. They are all in the list beside the map.</li>` : "";
  // What the plaque says, fetched when the card opens (build_inscriptions.py, 0.5° tiles).
  // A plaque from Open Plaques has its words in ins/; one from OpenStreetMap (0.26) has them in its
  // card, like a statue. Both are asked for; the one that has nothing removes itself.
  const ins = (kind === "plaque" && !s[S_OSM] ? `<div class="ins" data-key="${s[S_LAT]},${s[S_LON]}"></div>` : "") +
    // a museum's photo, kind and website, fetched the same way (build.py, culture/data/cards/)
    (["museum", "statue", "battle", "event", "plaque", "grave"].includes(kind) ? `<div class="mx" data-key="${s[S_LAT]},${s[S_LON]}"></div>` : "");
  const where = whereOf(s);
  const area = rows.every((r) => r.flags & F_APPROX);
  return `<div class="card"><div class="hd"><div class="nm">${esc(s[S_NAME])}</div>` +
    (where ? `<div class="where">📍 ${esc(where)}</div>` : "") +
    (area && !["battle", "event"].includes(kind)
      ? `<div class="where approx">◌ somewhere around here: the source gives ${kind === "settlement" ? "the town" : "the square or the area"}, not the exact spot</div>` : "") +
    `<div class="meta">${esc(meta)}</div>${hoursBlock}${ins}</div>` +
    (items ? `<ul class="people">${items}${more}</ul>` : "") + `</div>`;
}

// Years come from the Wikidata Query Service, which numbers them ASTRONOMICALLY: year 0 exists, so
// -489 is 490 BC (Marathon) and -383 is 384 BC (Aristotle). Printed raw, Aristotle lived "-383–-321".
const yearStr = (y) => y == null ? "?" : y <= 0 ? `${1 - y} BC` : `${y}`;
const lifeStr = (r) => r.born == null && r.died == null ? ""
  : r.qid.startsWith("ev:") ? yearStr(r.born)     // an event has a year, not a life
  // "1946–?" read as a missing date; a living person (or an unknown death) is "born 1946"
  : r.died == null ? `born ${yearStr(r.born)}` : r.born == null ? `died ${yearStr(r.died)}`
  : `${yearStr(r.born)}–${yearStr(r.died)}`;

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
    if (!c) cells.set(key, (c = { places: [], n: 0, counts: {}, best: null, w: -1, area: 0, saint: 0 }));
    c.places.push(pl);
    c.n += vis.length;
    for (const r of vis) {
      const k = colourKey(r); c.counts[k] = (c.counts[k] || 0) + 1;
      if (r.flags & F_APPROX) c.area++;
      if (r.flags & F_SAINT) c.saint++;
    }
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
                       // dashed only if EVERY trace under it is an area: one exact grave among
                       // town-only ones is still a spot you can walk to. A halo if at least half
                       // are saints, so a crowded square with one chapel does not glow.
                       { icon: pinIcon(c.counts, c.n, only && pinMark(only),
                                       c.area === c.n, c.saint * 2 >= c.n) });
    // On a wide screen a pin does not open a card over the map: the list beside it goes to that place
    // and lights it (the Atlas of Painting's `revealMuseumInPanel`, D26). The popup stays bound for
    // the phone, where it is routed into the bottom sheet.
    m.cell = c;
    m.on("click", (ev) => {
      if (narrow()) return;
      m.closePopup();
      revealInPanel(c);
    });
    if (c.places.length === 1) {
      m.bindPopup(() => sitePopup(c.best.siteIdx, c.best.vis), { maxWidth: 360, autoPan: false });
      m.bindTooltip(`${SITES[c.best.siteIdx][S_NAME]} · ${c.n}`, { direction: "top", offset: [0, -12] });
    } else {
      m.bindPopup(() => cellPopup(c), { maxWidth: 360, autoPan: false });
      m.bindTooltip(`${c.places.length} places · ${c.n} people`, { direction: "top", offset: [0, -12] });
      // A grouped pin USED to zoom in on click, "a door, not a destination". It also opened its
      // popup, because that is what bindPopup does, and the zoom fired `moveend`, and `moveend`
      // rebuilds every marker: the list appeared and was destroyed in the same gesture. Two
      // reasonable behaviours on one tap, one of them killing the other.
      //
      // So the list IS the door now. It names what is inside instead of making you guess, each
      // row flies to its place, and a button in its header does the old blind zoom. Nothing moves
      // the map on the tap that opens a list.
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
      (whereOf(SITES[pl.siteIdx]) ? `<div class="by dim">${esc(whereOf(SITES[pl.siteIdx]))}</div>` : "") +
      `<div class="by">${esc(best.name)}${pl.vis.length > 1 ? ` and ${pl.vis.length - 1} more` : ""}</div></div>` +
      `<span class="yr">${pl.vis.length}</span></li>`;
  }).join("");
  return `<div class="card"><div class="hd"><div class="nm">${c.n.toLocaleString()} people</div>` +
    `<div class="meta">in ${c.places.length.toLocaleString()} places here</div>` +
    `<button type="button" class="pop-zoom" data-lat="${c.best.lat}" data-lon="${c.best.lon}">` +
    `🔍 Zoom in here</button></div>` +
    `<ul class="people">${list}</ul>` +
    (top.length > 14 ? `<div class="pop-more">…and ${top.length - 14} more places</div>` : "") + `</div>`;
}

// A row inside a card opens that person; a row inside a grouped card flies to that place.
// Written once and called for both hosts: the popup on a wide screen, the sheet on a narrow one.
function wirePopupBody(el, dismiss) {
  if (!el) return;
  el.querySelectorAll("img[data-file]").forEach((img) => img.addEventListener("click", (ev) => {
    ev.stopPropagation();              // the picture, not the row: do not open the person
    openLightbox(img.dataset.file, img.dataset.cap);
  }));
  fillInscriptions(el);
  el.querySelectorAll(".pop-person[data-qid]").forEach((li) => li.addEventListener("click", (ev) => {
    if (ev.target.closest("a")) return;                 // the links keep their own action
    dismiss();
    openPerson(li.dataset.qid);
  }));
  el.querySelectorAll(".pop-place").forEach((li) => li.addEventListener("click", () => {
    dismiss();
    map.setView([+li.dataset.lat, +li.dataset.lon], Math.max(map.getZoom() + 3, 15));
  }));
  const zoom = el.querySelector(".pop-zoom");
  if (zoom) zoom.addEventListener("click", () => {
    dismiss();
    map.setView([+zoom.dataset.lat, +zoom.dataset.lon], Math.min(map.getZoom() + 3, 18));
  });
}
map.on("popupopen", (e) => {
  const popup = e.popup;
  // What was bound is a FUNCTION, so a place nobody opens never pays for its card. Calling it again
  // is how a card is re-rendered once portraits, trades and grave photos have arrived: on a phone
  // the first render used to be copied into the sheet before people.json existed, and every row
  // came out bare.
  const bound = popup.getContent();
  const render = () => (typeof bound === "function" ? bound(popup._source) : bound);
  if (narrow()) {
    map.closePopup(popup);
    openCard = null;
    const cell = popup._source && popup._source.cell;
    openPlace = cell && cell.places.length === 1 ? placeKey(cell.places[0].siteIdx) : null;
    showPlaceSheet(render); syncURL(); return;
  }
  if (!narrow()) { map.closePopup(popup); return; }   // wide screen: the list is the card (revealInPanel)
  const wire = () => wirePopupBody(popup.getElement(), () => map.closePopup());
  wire();
  if (!PEOPLE) needPeople(() => { if (popup.isOpen()) { popup.setContent(bound); wire(); } });
});
// Tapping the map background dismisses a place list, the way tapping outside any sheet should.
// Only a place list: a person card was opened deliberately and closes deliberately.
map.on("click", () => { if ($("sheet").dataset.kind === "place") closeSheet(); });

/* ── THE MODE BAR: what the map is narrowed to, and the one way out (0.27) ─────────────────────────
 * Víctor, 2026-09-15: after "Everything on the map", what happens to the zoom and how do you leave this
 * person? Answer: the map shows ONLY them (or only one section of their card, or their contemporaries),
 * a bar over the map says so in words, and "✕ Show everyone" puts back the map and filters exactly as
 * they were before. The back button does the same, one step. */
let modeBack = null;                // { center, zoom, years: [min, max, chosen] } from before the mode
const modeBar = L.DomUtil.create("div", "modebar", map.getContainer());
L.DomEvent.disableClickPropagation(modeBar);
L.DomEvent.disableScrollPropagation(modeBar);
function renderPersonChip() {
  const box = $("personchip");
  if (box) box.hidden = true;                 // the bar over the map replaced the header chip
  const secName = { life: "their life", work: "their work", remembered: "where they are remembered" }[state.personSec];
  let html = "";
  if (state.person) {
    const n = new Set(TRACES.filter((r) => passes(r, "map")).map((r) => r.site)).size;
    html = `<span class="mb-t">${state.group ? `<b>${esc(state.personName)}</b> and ${state.group.size} people they knew`
                                          : `Only <b>${esc(state.personName)}</b>${secName ? ` · ${secName}` : ""}`} · ${n} ${n === 1 ? "place" : "places"}</span>` +
      (state.personSec ? `<button type="button" data-mb="all">All their places</button>` : "") +
      `<button type="button" data-mb="card">Card</button>`;
  } else if (contemporaryOf) {
    html = `<span class="mb-t">Alive at the same time as <b>${esc(contemporaryOf.name)}</b> · ${yearStr(state.yearMin)}–${yearStr(state.yearMax)}</span>`;
  }
  if (html) html += `<button type="button" data-mb="exit" class="mb-x">✕ Show everyone</button>`;
  modeBar.innerHTML = html;
  modeBar.hidden = !html;
}
let contemporaryOf = null;
modeBar.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-mb]"); if (!b) return;
  if (b.dataset.mb === "exit") exitMode();
  else if (b.dataset.mb === "card" && state.person) openPerson(state.person);
  else if (b.dataset.mb === "all" && state.person) { state.personSec = null; refresh(); frameRows(byPerson.get(state.person) || []); }
});
function enterPersonMode(qid, sec) {
  if (!state.person && !contemporaryOf) modeBack = { center: map.getCenter(), zoom: map.getZoom() };
  contemporaryOf = null;
  state.person = qid; state.personSec = sec || null; state.group = null;
  state.personName = ((byPerson.get(qid) || [])[0] || {}).name || "";
  refresh();
}
function exitMode() {
  const back = modeBack; modeBack = null;
  if (contemporaryOf) { tlChosen = contemporaryOf.chosen; state.yearMin = contemporaryOf.years[0]; state.yearMax = contemporaryOf.years[1];
                        contemporaryOf = null; buildTimeline(TL_MIN, TL_MAX); }
  state.person = null; state.personName = ""; state.personSec = null; state.group = null;
  streetLayer.clearLayers(); streetLayerOf = null;
  if (back) map.setView(back.center, back.zoom, { animate: false });
  refresh();
}
// frame some traces sensibly: never closer than a street, never so wide the pins mean nothing
function frameRows(rows) {
  const pts = rows.filter((r) => !(r.flags & F_PLACELESS)).map((r) => [SITES[r.site][S_LAT], SITES[r.site][S_LON]]);
  if (!pts.length) return false;
  if (pts.length === 1) { map.setView(pts[0], 15); return true; }
  const sz = map.getSize();
  const pad = Math.max(8, Math.min(narrow() ? 24 : 60, Math.floor(Math.min(sz.x, sz.y) / 6)));
  map.fitBounds(L.latLngBounds(pts), { padding: [pad, pad], maxZoom: 16 });
  return true;
}

// Half a sentence on screen; the counts behind it in the tooltip (Víctor, 2026-09-15: the line was jargon).
function statsLine(pins, inView, rowsInView) {
  const short = `${rowsInView.toLocaleString()} ${rowsInView === 1 ? "person" : "people"} in ${inView.toLocaleString()} ${inView === 1 ? "place" : "places"}` +
    (deepState === "loading" ? " · loading more…" : "");
  const grouped = pins < inView
    ? `${inView.toLocaleString()} places here, grouped into ${pins.toLocaleString()} pins. Zoom in to split them`
    : `${inView.toLocaleString()} ${inView === 1 ? "place" : "places"} here, one pin each`;
  const tableN = TRACES.filter((r) => passes(r, "table")).length;
  const placeless = TRACES.filter((r) => passes(r, "table") && (r.flags & F_PLACELESS)).length;
  $("stats").title = `${grouped} · ${rowsInView.toLocaleString()} people in view · ` +
    `${tableN.toLocaleString()} traces pass the filters` +
    (placeless ? ` · ${placeless.toLocaleString()} of them unpinnable` : "") +
    // Under-reporting without saying so is the whole family of bug this project keeps refusing.
    (deepState === "loading" ? " · still loading the less known here…" :
     (deepState === "none" || deepState === "partial") && longTailWaiting ? " · the less known arrive as you zoom in" : "");
  return short;
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
  renderPanel();
  if (tableOn) renderTable();
  syncURL();
}

/* ── the legend ───────────────────────────────────────────────────────────────────────────────
 * Eleven colours on every pin and nothing on screen saying what they mean. The sibling has a
 * legend; not porting it was an oversight that only shows up when somebody arrives who did not
 * build the thing. It doubles as the colour-by switch, because the two questions ("what do these
 * colours mean" and "what should they mean") are the same control.
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
    `<span class="lg-keys">${swatches}</span>` +
    // The shapes, next to the colours: what the pin's outline says, whatever it is coloured by.
    `<span class="lg-keys lg-shapes"><span class="fam-lbl">Shapes</span>` +
    `<span class="lg-i"><span class="lg-pin halo"></span>saint or blessed</span>` +
    `<span class="lg-i"><span class="lg-pin area"></span>an area, not an exact spot</span></span>`;
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
 *   what → marking  73 %        · a confession, not a filter
 *   what → access   61 %        access still earns its row; marking does not
 *
 * So: `what` is the primary control and `access` keeps its own row, because it is the question
 * this atlas exists to answer and a third of it is genuinely independent. `verb` appears only when
 * the current selection actually has verbs to choose between. `marking` moves to the drawer.
 */
// Values that exist so a family can partition the corpus, and that nobody would ever click.
// `mount: n/a` means "not a plaque": 124 928 rows of structural filler, offered as a choice.
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
      // The chip IS the button, and clicking it means ONLY THIS, which is what you want nine
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
    // the current selection has nothing to choose between, which is applicability made visible
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
 * to what is on screen, and the tick adds or removes without disturbing the rest, because ONLY is
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
    if (!pop.hidden) {
      const r = e.target.getBoundingClientRect();
      pop.style.top = `${Math.round(r.bottom + 4)}px`;
      pop.style.left = `${Math.round(Math.max(6, Math.min(r.left, innerWidth - pop.offsetWidth - 6)))}px`;
    }
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
/* ── the other one-click answer: was he HERE, or is this just a statue of him? ────────────────
 * Garibaldi has thirty monuments in this corpus and one grave. Rome has a Via Garibaldi and so
 * does nearly every town in Italy; the atlas already refuses to map the streets themselves
 * (data/memorial_kinds.json, `_streets`: "the sign is, the street is not"), but a bronze
 * Garibaldi in a town he never entered is still a real, mappable object, and it is a completely
 * different claim from the house he died in.
 *
 * The axis that separates them already exists: `verb`. `commemorated` means somebody put this up
 * about him; `born`/`lived`/`worked`/`died`/`buried` mean he was standing where you are standing.
 * What was missing was a way to ask the question in one tap instead of un-ticking chips.
 */
const VERBS_PRESENT = ["born", "lived", "worked", "died", "buried"];
$("preset-was").addEventListener("click", () => {
  const want = (v) => VERBS_PRESENT.includes(v);
  const on = VOCAB.verb.every((v, i) => want(v) === (state.verb[i] !== false));
  VOCAB.verb.forEach((v, i) => { state.verb[i] = on ? true : want(v); });
  $("preset-was").classList.toggle("active", !on);
  refresh();
});

$("reset").addEventListener("click", () => {
  for (const fam of ["what", "mount", "access", "marking", "dom", "verb"])
    VOCAB[fam].forEach((_, i) => { state[fam][i] = true; });
  state.topN = TOP_DEFAULT; state.topWhere = "here"; state.q = ""; state.site = null;
  state.person = null; state.personName = ""; state.personSec = null; modeBack = null;
  $("filter").value = ""; $("filter-clear").hidden = true;
  $("preset-now").classList.remove("active");
  $("preset-was").classList.remove("active");
  tlChosen = false;
  paintRenown();
  buildTimeline(TL_MIN, TL_MAX);
  refresh();
});

/* ── the renown dial ── */
document.addEventListener("click", (e) => {
  if (!e.target.closest("#ph-all")) return;
  state.topN = 0; paintRenown(); refresh();
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("#renown button[data-top]"); if (!b) return;
  state.topN = +b.dataset.top;
  if (b.dataset.where) state.topWhere = b.dataset.where;
  paintRenown();
  refresh();
});
function paintRenown() {
  $("renown").querySelectorAll("button[data-top]").forEach((x) => x.classList.toggle("on",
    +x.dataset.top === state.topN && (!state.topN || x.dataset.where === state.topWhere)));
}

/* ── one person, everything they left ────────────────────────────────────────────────────────
 * The atlas is person-anchored (DECISIONS D1) and until now you could not actually see a person:
 * only the places, with people inside them. This is the other direction: Chopin's grave in
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

const WHAT_ICON = { battle: "⚔️", event: "🗓️", grave: "🪦", plaque: "🪧", house: "🏠", statue: "🗿",
                    museum: "🏛", church: "⛪" };

let openCardRows = 0;
function openPerson(qid, keepScroll) {
  const rows = byPerson.get(qid);
  if (!rows || !rows.length) { startLongTail(); return; }
  openCardRows = rows.length;
  openCard = qid; cardBack = null; renderPanelBack();
  if (streetLayerOf && streetLayerOf !== qid) { streetLayer.clearLayers(); streetLayerOf = null; }
  if (narrow()) openPlace = null;          // on a phone the person's sheet replaces the place's
  syncURL();
  sheetToken++;                      // a place card still waiting for people.json must not land here
  needPeople(() => {
    const r0 = rows[0];
    const pf = (PEOPLE && PEOPLE[qid]) || null;
    const src = pf && thumb(pf[0], 160);
    const life = lifeStr(r0);
    const countries = new Set(rows.filter((r) => !(r.flags & F_PLACELESS)).map((r) => r.site));
    // an event opens on where it HAPPENED, then what remembers it
    const vk = (r) => VOCAB.verb[r.verb] === "happened" ? -1 : r.verb;
    const sorted = rows.slice().sort((a, z) => vk(a) - vk(z));

    const itemHTML = (r, i) => {
      const acc = VOCAB.access[r.access], mk = VOCAB.marking[r.marking];
      const pinnable = !(r.flags & F_PLACELESS);
      return `<li class="sh-trace${pinnable ? "" : " unpinnable"}" data-i="${i}">` +
        `<span class="ic">${WHAT_ICON[VOCAB.what[r.what]] || "·"}</span><div class="wk">` +
        `<div class="wt">${esc(SITES[r.site][S_NAME])}</div>` +
        (whereOf(SITES[r.site]) ? `<div class="fx wh">${esc(whereOf(SITES[r.site]))}</div>` : "") +
        `<div class="fx">${esc([capital(plain("verb", VOCAB.verb[r.verb])), plain("access", acc),
                                mk !== VOCAB.what[r.what] ? plain("marking", mk) : ""].filter(Boolean).join(" · "))}</div>` +
        (pinnable ? "" : `<div class="fx warn">the source names a town, not a place: nothing to pin</div>`) +
        (r.flags & F_APPROX ? `<div class="fx approx">◌ an area, not an exact spot</div>` : "") +
        `</div></li>`;
    };
    // TWO KINDS OF TRACE, TWO SECTIONS (Víctor, 2026-09-15): "cada persona tiene que tener dos secciones:
    // una para cosas de su vida de verdad y otra, debajo, de que se le recuerda". A statue of Dante in
    // Buenos Aires belongs on his card, and it must not read as if he had been there. The verb decides:
    // born, lived, worked, died, buried are their life; built and exhibited, their work; commemorated,
    // what others put up in their memory, wherever that is.
    const isEvent = qid.startsWith("ev:");
    const SECTIONS = [
      { key: "life", title: isEvent ? "Where it happened" : "Their life",
        note: isEvent ? "" : "where they were born, lived, worked, died or lie",
        verbs: ["happened", "born", "lived", "worked", "died", "buried"] },
      { key: "work", title: "Their work", note: "what they built, and where their work is on show",
        verbs: ["built", "exhibited"] },
      { key: "remembered", title: "Remembered",
        note: isEvent ? "memorials of it, wherever they stand"
                      : "statues, plaques and memorials put up in their memory: they need not have been there",
        verbs: ["commemorated"] },
    ];
    const secOf = (r) => (SECTIONS.find((x) => x.verbs.includes(VOCAB.verb[r.verb])) || SECTIONS[2]).key;
    const bySec = Object.fromEntries(SECTIONS.map((x) => [x.key, []]));
    sorted.forEach((r, i) => bySec[secOf(r)].push([r, i]));
    const shown = SECTIONS.filter((x) => bySec[x.key].length);
    const knewSlot = `<div class="sh-sec sh-knew" data-sec="knew" data-q="${esc(qid)}" hidden></div>`;
    const items = shown.map((x) =>
      `<div class="sh-sec" data-sec="${x.key}"><div class="sh-sec-h"><span class="sh-sec-t">${x.title}</span>` +
      `<span class="sh-sec-n">${bySec[x.key].length}</span>` +
      `<button type="button" class="sh-sec-fit" data-sec="${x.key}" title="Show only these on the map">On the map</button></div>` +
      (x.note ? `<div class="sh-sec-note">${x.note}</div>` : "") +
      `<ul class="sh-list">${bySec[x.key].map(([r, i]) => itemHTML(r, i)).join("")}</ul></div>` +
      (x.key !== "remembered" && !shown.slice(shown.indexOf(x) + 1).some((y) => y.key !== "remembered") ? knewSlot : "")).join("") +
      (shown.every((x) => x.key === "remembered") ? knewSlot : "") +
      `<div class="sh-sec sh-streets" data-sec="streets" data-q="${esc(qid)}" hidden></div>`;

    const scrollWas = $("sheet-body").scrollTop;
    $("sheet-body").innerHTML =
      `<div class="sh-head">` +
      (src ? `<img class="sh-por" src="${esc(src)}" alt="">` : `<div class="sh-por ph">·</div>`) +
      `<div><div class="sh-name">${esc(r0.name)}${r0.flags & F_SAINT ? ` <span class="sh-halo" title="Canonised or beatified (Wikidata P411)">saint or blessed</span>` : ""}</div>` +
      `<div class="sh-life">${esc(life)}</div>` +
      (pf && pf[1] ? `<div class="sh-occ">${esc(pf[1])}</div>` : "") +
      `<div class="sh-sum" data-q="${esc(qid.replace(/^ev:/, ""))}"></div>` +
      `<div class="sh-count">${countries.size || rows.length} ${(countries.size || rows.length) === 1 ? "place" : "places"}</div>` +
      `<div class="sh-links">` +
      (!/^(ev:)?Q\d+$/.test(qid) ? "" :
        `<a class="wp-link" data-q="${esc(qid.replace(/^ev:/, ""))}" href="https://www.wikidata.org/wiki/Special:GoToLinkedPage?site=${LANG}wiki&itemid=${esc(qid.replace(/^ev:/, ""))}" target="_blank" rel="noopener">Wikipedia</a> · ` +
        `<a href="https://www.wikidata.org/wiki/${esc(qid.replace(/^ev:/, ""))}" target="_blank" rel="noopener">Wikidata</a>`) +
      // The other atlas. Same person, same QID, a different question about them, where their work
      // hangs rather than where they lie. The link only appears for the painters it knows.
      (pf && pf[2]
        ? ` · <a class="sh-sib" href="https://victorelvira.github.io/projects/artatlas.html#${esc(pf[2])}"` +
          ` target="_blank" rel="noopener" title="Their paintings, on the Atlas of Painting">` +
          `Their paintings</a>` : "") +
      `</div></div></div>` +
      `<div class="sh-actions">` +
      (shown.length > 1 ? `<button type="button" id="sh-fit-all">All their places on the map</button>` : "") +
      (!isEvent && r0.born != null && r0.died != null && r0.died - r0.born < 130
        ? `<button type="button" id="sh-contemp" title="The timeline set to their lifetime: everyone alive while they were">Their contemporaries</button>` : "") +
      `</div>` +
      items;

    $("sheet").dataset.kind = "person";
    $("sheet").hidden = false;
    $("sheet-body").scrollTop = keepScroll ? scrollWas : 0;
    fillSummary($("sheet-body").querySelector(".sh-sum"));
    if (!isEvent) fillKnew($("sheet-body").querySelector(".sh-knew"));
    if (!isEvent) fillStreets($("sheet-body").querySelector(".sh-streets"));
    $("sheet-body").scrollTop = 0;
    $("sheet-body").querySelectorAll(".sh-trace").forEach((li) => li.addEventListener("click", () => {
      const r = sorted[+li.dataset.i];
      if (r.flags & F_PLACELESS) return banner("The source names a town, not a place. There is nothing to fly to.");
      // Beside the map the card stays: the map flies, the row is marked, and the pin is there to tap.
      if (!narrow()) {
        $("sheet-body").querySelectorAll(".sh-trace.on").forEach((x) => x.classList.remove("on"));
        li.classList.add("on");
      } else closeSheet();
      map.setView([SITES[r.site][S_LAT], SITES[r.site][S_LON]], 16);
    }));
    // "Frame them all" framed every trace, and a person with statues on four continents (Chopin: 29
    // homages, from Buenos Aires to Tallinn) came out as the whole planet at zoom 1, which looked
    // like the button did nothing (Víctor, 2026-09-13). The first button frames where they actually
    // WERE (born, lived, worked, died, buried); the second frames everything, homages included.
    const frame = (rows, emptyMsg) => {
      const pts = rows.filter((r) => !(r.flags & F_PLACELESS))
                      .map((r) => [SITES[r.site][S_LAT], SITES[r.site][S_LON]]);
      if (!pts.length) return banner(emptyMsg);
      if (narrow()) closeSheet();        // beside the map, the card stays while the map frames them
      if (pts.length === 1) map.setView(pts[0], 16);
      // The margin is at most a sixth of the map. A fixed 60 px was a third of a phone's width, and on a
      // map squeezed short by a large list it exceeded the map itself, and Leaflet answered zoom 19.
      else {
        const sz = map.getSize();
        const pad = Math.max(8, Math.min(narrow() ? 18 : 60, Math.floor(Math.min(sz.x, sz.y) / 6)));
        map.fitBounds(L.latLngBounds(pts), { padding: [pad, pad], maxZoom: 17 });
      }
    };
    // each section frames its own places: where they WERE, or where they are remembered (Chopin: 29
    // homages from Buenos Aires to Tallinn, which framed together looked like the whole planet)
    // "On the map" is a MODE now (0.27): the map shows only this person, or only this section, with the
    // bar that says so and the way out; then it frames them.
    const onMap = (sec, rows, empty) => {
      if (!rows.some((r) => !(r.flags & F_PLACELESS))) return banner(empty);
      enterPersonMode(qid, sec);
      if (narrow()) closeSheet();
      frameRows(rows);
    };
    $("sheet-body").querySelectorAll(".sh-sec-fit").forEach((b) => b.addEventListener("click", () =>
      onMap(b.dataset.sec, bySec[b.dataset.sec].map(([r]) => r), "None of these can be pinned.")));
    const fitAll = $("sh-fit-all");
    if (fitAll) fitAll.addEventListener("click", () => onMap(null, sorted, "Nothing of theirs can be pinned."));
    // Who else was alive then (Víctor: "iluminar los coetáneos"): the timeline set to their life, the
    // rest of the map left as it is, so the map around them fills with their contemporaries.
    const cont = $("sh-contemp");
    if (cont) cont.addEventListener("click", () => {
      if (r0.born == null || r0.died == null) return;
      if (!state.person && !contemporaryOf) modeBack = { center: map.getCenter(), zoom: map.getZoom() };
      contemporaryOf = { qid, name: r0.name, years: [state.yearMin, state.yearMax], chosen: tlChosen };
      state.person = null; state.personSec = null;
      tlChosen = true; state.yearMin = r0.born; state.yearMax = r0.died;
      buildTimeline(TL_MIN, TL_MAX);
      if (narrow()) closeSheet();
      refresh();
    });
  });
}
function closeSheet() {
  const wasPlace = $("sheet").dataset.kind === "place";
  $("sheet").hidden = true; $("sheet").dataset.kind = "";
  if (openCard) { openCard = null; syncURL(); }
  if (wasPlace && openPlace) { openPlace = null; syncURL(); }
}

/* ── on a wide screen the person card lives IN the list panel (D26) ─────────────────────────────
 * Víctor, 2026-09-14: floating cards are right on a phone; on a computer a side panel works better.
 * The same #sheet element is moved into #panel and fills it, so every handler keeps working, the map
 * is never covered, and the list underneath keeps its scroll for "← Back to the list". Crossing the
 * breakpoint (a window resized) moves it back out. */
let openCard = null, pendingCard = null, cardBack = null, openPlace = null, pendingPlace = null;
const placeKey = (siteIdx) => `${SITES[siteIdx][S_LAT]},${SITES[siteIdx][S_LON]}`;
function placeSheet() {
  const inPanel = !narrow();
  const host = inPanel ? $("panel") : document.body;
  if ($("sheet").parentElement !== host) host.appendChild($("sheet"));
  $("sheet").classList.toggle("in-panel", inPanel);
}
placeSheet();
window.matchMedia("(max-width: 720px)").addEventListener("change", placeSheet);
$("sheet-back").addEventListener("click", closeSheet);
function tryPendingCard() {
  if (pendingPlace) {
    const pl = places.find((x) => placeKey(x.siteIdx) === pendingPlace);
    if (pl) {
      pendingPlace = null;
      if (pendingCard || openCard) {
        // a card is (or will be) on top: remember the place under it without closing the card
        selectedSite = pl.siteIdx; openPlace = placeKey(pl.siteIdx);
      } else if (narrow()) { openPlace = placeKey(pl.siteIdx); showPlaceSheet(() => sitePopup(pl.siteIdx, pl.vis || pl.rows)); }
      else revealInPanel({ places: [pl] });
    }
  }
  if (pendingCard && byPerson.has(pendingCard)) { const q = pendingCard; pendingCard = null; openPerson(q); }
}

/* A pin tapped on a wide screen: the list goes to its place (grouped by place, unfolded, scrolled to,
 * lit for a few seconds), and a single place shows its card (hours, inscription, photo) at the top of
 * its group. A grouped pin lights every place under it. If a person's card was open, the list says
 * how to get back to them. */
let selectedSite = null, flashTimer = 0;
function revealInPanel(c) {
  const sites = c.places.slice().sort((a, z) => (z.vis || z.rows).length - (a.vis || a.rows).length).map((pl) => pl.siteIdx);
  if (!sites.length) return;
  if (!$("sheet").hidden && $("sheet").dataset.kind === "person" && openCard) cardBack = openCard;
  if (!$("sheet").hidden) closeSheet();
  renderPanelBack();
  selectedSite = sites.length === 1 ? sites[0] : null;
  openPlace = selectedSite == null ? null : placeKey(selectedSite);
  syncURL();
  if (panelSort !== "place") { sortBeforePin = panelSort; panelSort = "place"; $("pv-sort").value = "place"; }
  sites.forEach((i) => folded.delete(i));
  listArea = null;
  renderPanel();
  const ul = $("worklist"), sel = `li.grp[data-site="${sites[0]}"]`;
  for (let guard = 0; !ul.querySelector(sel) && panelCursor < panelPlan.length && guard < 400; guard++) {
    if (panelIO) panelIO.disconnect();
    appendChunk();
  }
  const target = ul.querySelector(sel);
  if (!target) return;
  ul.scrollTop += target.getBoundingClientRect().top - ul.getBoundingClientRect().top;
  clearTimeout(flashTimer);
  ul.querySelectorAll(".grp-flash").forEach((x) => x.classList.remove("grp-flash"));
  sites.forEach((i) => ul.querySelector(`li.grp[data-site="${i}"]`)?.classList.add("grp-flash"));
  flashTimer = setTimeout(() => ul.querySelectorAll(".grp-flash").forEach((x) => x.classList.remove("grp-flash")), 3600);
}
function renderPanelBack() {
  const b = $("panel-back");
  const rows = cardBack && byPerson.get(cardBack);
  b.hidden = !rows;
  if (rows) b.textContent = `← Back to ${rows[0].name}`;
}
$("panel-back").addEventListener("click", () => { const q = cardBack; cardBack = null; renderPanelBack(); if (q) openPerson(q); });

/* ── a map list that the map cannot take away (the sibling's lesson, ported) ──────────────────
 * On a phone this sequence was reliably infuriating: tap a pin, a list of twenty-five names
 * opens, the map moves, and the list is gone before you have read the second name. Nothing was
 * random about it. A Leaflet popup is a child of the map pane and is anchored to a marker, and
 * `drawMap()` rebuilds every marker on `moveend`, so the popup's own anchor is destroyed under
 * it. The map was eating its own list.
 *
 * The sibling solved this by taking the list OUT of the map: on a narrow screen the popup's
 * content is moved into the fixed bottom sheet and the Leaflet popup is closed immediately. The
 * sheet is a sibling of the map, not a child, so a redraw cannot touch it. `autoPan: false` is
 * the other half: an opening popup must never scroll the map out from under your thumb.
 */
let sheetToken = 0;
function openSheetHTML(html, kind, keepScroll) {
  const body = $("sheet-body"), top = body.scrollTop;
  body.innerHTML = html;
  body.scrollTop = keepScroll ? top : 0;
  $("sheet").dataset.kind = kind || "place";
  $("sheet").hidden = false;
  wirePopupBody(body, closeSheet);
}
function showPlaceSheet(render) {
  const tok = ++sheetToken;
  openSheetHTML(render(), "place");
  if (!PEOPLE) needPeople(() => {
    if (tok === sheetToken && !$("sheet").hidden) openSheetHTML(render(), "place", true);
  });
}
$("sheet-close").addEventListener("click", closeSheet);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

/* ── "Wikipedia" goes to a Wikipedia ────────────────────────────────────────────────────────────
 * The link used Special:GoToLinkedPage for the reader's language, which works only when that article
 * exists. For everybody without one (people whose only article is in Czech or Bashkir, most local
 * museums and statues) it landed on a Wikidata error page, and Víctor, reading in Spanish,
 * hit it constantly. Now the click asks Wikidata which articles exist and opens the best one: the
 * reader's language, then English, then whichever exists; Wikidata itself only when none does.
 * A blank tab is opened inside the click, so no popup blocker stops it, and pointed afterwards. */
// Which Wikipedia article to open for an item, or null when no Wikipedia has one. After the reader's
// language and English, the large Wikipedias written by people, in that order; then anything. The
// first version took whichever came first alphabetically, and sent an English reader of the Museo
// Marítimo del Cantábrico to the Esperanto article. Bot-built wikis (Cebuano, Waray, Egyptian Arabic)
// are never preferred, and Abstract Wikipedia is not an article.
const WP_ORDER = [LANG, "en", "es", "fr", "de", "it", "pt", "ca", "eu", "gl", "nl", "pl", "ru", "uk", "cs",
                  "sv", "da", "no", "fi", "hu", "ro", "el", "tr", "ar", "fa", "he", "ja", "zh", "ko"];
function pickWikipedia(links) {
  const isWp = (k) => /^[a-z_]+wiki$/.test(k) &&
    !/^(commons|species|meta|wikidata|mediawiki|sources|wikimania|abstract|wikifunctions)wiki$/.test(k);
  const pick = WP_ORDER.map((l) => links[`${l}wiki`]).find(Boolean) ||
    Object.entries(links).filter(([k]) => isWp(k) && !/^(ceb|war|arz)wiki$/.test(k)).map(([, v]) => v)[0] ||
    Object.entries(links).filter(([k]) => isWp(k)).map(([, v]) => v)[0];
  return pick ? pick.url : null;
}

/* WHO THEY KNEW (0.27). Víctor, 2026-09-15: "documentar quién se conoció con quién… un grafo en círculo, tocas a
 * alguien y se iluminan las personas con las que coincidió". No database of meetings exists; Wikidata holds
 * relations that cannot happen without meeting (spouse, sibling, parent, teacher and student, partner),
 * which is what build_relations.py keeps, between two people the atlas shows. Loaded on the first card. */
let RELATIONS = null, relJob = null, pendingKnew = false;
function needRelations() {
  if (!relJob) relJob = fetch(`culture/data/relations.json?v=${DATA_V}`).then((r) => (r.ok ? r.json() : null))
    .then((d) => (RELATIONS = d)).catch(() => null);
  return relJob;
}
const REL_GROUP = { spouse: "love", partner: "love", father: "family", mother: "family", child: "family",
  sibling: "family", parent: "family", relative: "family", teacher: "learning", student: "learning",
  "doctoral advisor": "learning", "doctoral student": "learning", "worked with": "work", "significant person": "other" };
// Wikidata's property names, in the words a card uses
const REL_WORD = { "significant person": "knew", "worked with": "worked with", "doctoral advisor": "doctoral advisor",
  "doctoral student": "doctoral student", relative: "relative" };
function fillKnew(box) {
  if (!box) return;
  const qid = box.dataset.q;
  needRelations().then((R) => {
    if (!R || !box.isConnected) return;
    const list = (R.p[qid] || []).map(([ri, q]) => ({ rel: R.rel[ri], q, row: (byPerson.get(q) || [])[0] }))
                                  .filter((x) => x.row);
    if (!list.length) return;
    const me = (byPerson.get(qid) || [])[0];
    // an ellipse inside a box wide enough for the names on either side (they were cut off at 320)
    const N = Math.min(list.length, 18), W = 440, H = 240, cx = W / 2, cy = H / 2, RX = 96, RY = 96;
    const nodes = list.slice(0, N).map((x, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
      return { ...x, x: cx + RX * Math.cos(a), y: cy + RY * Math.sin(a), right: Math.cos(a) >= -0.01 };
    });
    const short = (s) => (s.length > 22 ? s.slice(0, 21) + "…" : s);
    const svg = `<svg class="kn-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="People ${esc(me.name)} knew">` +
      nodes.map((n) => `<line class="kn-l g-${REL_GROUP[n.rel] || "other"}" data-q="${esc(n.q)}" x1="${cx}" y1="${cy}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}"/>`).join("") +
      `<circle class="kn-me" cx="${cx}" cy="${cy}" r="7"/>` +
      nodes.map((n) => `<g class="kn-n g-${REL_GROUP[n.rel] || "other"}" data-q="${esc(n.q)}" tabindex="0">` +
        `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="5"/>` +
        `<text x="${(n.x + (n.right ? 8 : -8)).toFixed(1)}" y="${(n.y + 3.5).toFixed(1)}" text-anchor="${n.right ? "start" : "end"}">${esc(short(n.row.name))}</text>` +
        `<title>${esc(n.row.name)} · ${esc(REL_WORD[n.rel] || n.rel)}${lifeStr(n.row) ? " · " + esc(lifeStr(n.row)) : ""}</title></g>`).join("") +
      `</svg>`;
    const chips = list.map((x) => `<button type="button" class="kn-c g-${REL_GROUP[x.rel] || "other"}" data-q="${esc(x.q)}">` +
      `<span class="kn-r">${esc(REL_WORD[x.rel] || x.rel)}</span> ${esc(x.row.name)}</button>`).join("");
    box.innerHTML = `<div class="sh-sec-h"><span class="sh-sec-t">People they knew</span><span class="sh-sec-n">${list.length}</span>` +
      `<button type="button" class="sh-sec-fit kn-map" title="Them and the people they knew, together on the map">Together on the map</button></div>` +
      `<div class="sh-sec-note">family, love, teachers and students, work: relations that mean they met (Wikidata)</div>` +
      svg + `<div class="kn-chips">${chips}</div>`;
    box.hidden = false;
    // touch a name: its line lights up; tap it: their card
    const light = (q, on) => box.querySelectorAll(`[data-q="${CSS.escape(q)}"]`).forEach((el) => el.classList.toggle("lit", on));
    box.querySelectorAll("[data-q]").forEach((el) => {
      el.addEventListener("mouseenter", () => light(el.dataset.q, true));
      el.addEventListener("mouseleave", () => light(el.dataset.q, false));
      el.addEventListener("click", () => openPerson(el.dataset.q));
    });
    box.querySelector(".kn-map").addEventListener("click", () => {
      enterPersonMode(qid, null);
      state.group = new Set(list.map((x) => x.q));
      refresh();
      if (narrow()) closeSheet();
      // frame where they LIVED, not every statue of them on the planet
      const all = [...(byPerson.get(qid) || []), ...list.flatMap((x) => byPerson.get(x.q) || [])];
      const lived = all.filter((r) => SEC_VERBS.life.includes(VOCAB.verb[r.verb]));
      frameRows(lived.length ? lived : all);
    });
    if (pendingKnew && state.person === qid) { pendingKnew = false; state.group = new Set(list.map((x) => x.q)); refresh(); }
  });
}

/* STREETS AND SQUARES NAMED AFTER THEM (0.27, the plan B Víctor asked for, off by default on the map).
 * For the top 10 000 people of the culture rank, from OpenStreetMap's name:etymology:wikidata. A street is
 * not a trace (the `_streets` rule): it has its own section below "Remembered" and its own map layer. */
// 64 shards by the QID's number (build_streets.py): a card fetches the one its person is in
const streetShards = new Map();
function needStreets(qid) {
  const k = +qid.slice(1) % 64;
  if (!streetShards.has(k)) streetShards.set(k, fetch(`culture/data/streets/${k}.json?v=${DATA_V}`)
    .then((r) => (r.ok ? r.json() : null)).catch(() => null));
  return streetShards.get(k);
}
function fillStreets(box) {
  if (!box) return;
  const qid = box.dataset.q;
  needStreets(qid).then((S) => {
    const list = S && S.p[qid];
    if (!list || !list.length || !box.isConnected) return;
    const squares = list.filter((r) => r[1] === "square").length;
    box.innerHTML = `<div class="sh-sec-h"><span class="sh-sec-t">Streets and squares</span><span class="sh-sec-n">${list.length}</span>` +
      `<button type="button" class="sh-sec-fit st-map">🗺 On the map</button></div>` +
      `<div class="sh-sec-note">named after them${squares ? `, ${squares} of them squares` : ""} · at least these: only those OpenStreetMap says are named after them</div>` +
      `<ul class="st-list">${list.slice(0, 60).map((r, i) => `<li data-i="${i}">${r[1] === "square" ? "⬚" : "┃"} ${esc(r[0])}</li>`).join("")}` +
      (list.length > 60 ? `<li class="st-more">…and ${list.length - 60} more</li>` : "") + `</ul>`;
    box.hidden = false;
    box.querySelectorAll("li[data-i]").forEach((li) => li.addEventListener("click", () => {
      const r = list[+li.dataset.i];
      if (narrow()) closeSheet();
      map.setView([r[2], r[3]], 17);
      showStreetMarks(qid, list);
    }));
    box.querySelector(".st-map").addEventListener("click", () => {
      showStreetMarks(qid, list);
      if (narrow()) closeSheet();
      const b = L.latLngBounds(list.map((r) => [r[2], r[3]]));
      if (list.length === 1) map.setView([list[0][2], list[0][3]], 16); else map.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
    });
  });
}
// the streets of ONE person drawn as small bars over the map, until the card changes or the mode ends
const streetLayer = L.layerGroup().addTo(map);
function showStreetMarks(qid, list) {
  streetLayer.clearLayers();
  const icon = (sq) => L.divIcon({ className: "st-pin" + (sq ? " sq" : ""), iconSize: [14, 14], iconAnchor: [7, 7] });
  for (const r of list) {
    L.marker([r[2], r[3]], { icon: icon(r[1] === "square"), keyboard: false })
      .bindTooltip(`${esc(r[0])}${r[4] > 1 ? ` · ${r[4]} stretches` : ""}`, { direction: "top" }).addTo(streetLayer);
  }
  streetLayerOf = qid;
}
let streetLayerOf = null;

/* WHO THEY WERE, IN TWO SENTENCES (0.27): the first lines of their Wikipedia article, in the reader's
 * language when it exists (pickWikipedia's order), fetched when the card opens and credited. A card
 * that only listed places said where someone is and never who they were. */
const summaries = new Map();
function fillSummary(box) {
  if (!box || !/^Q\d+$/.test(box.dataset.q || "")) return;
  const q = box.dataset.q;
  const show = (x) => {
    if (!x || !box.isConnected) return;
    const max = narrow() ? 200 : 340;     // on a phone the card is half the screen: two sentences, not a page
    const text = x.extract.length > max + 10 ? x.extract.slice(0, x.extract.lastIndexOf(" ", max)) + "…" : x.extract;
    // credited in words; the "Wikipedia" link right below it is the link
    box.innerHTML = `${esc(text)} <span class="sh-sum-src">(Wikipedia)</span>`;
    if (x.description && x.description.length < 90) {
      let occ = box.parentElement.querySelector(".sh-occ");
      if (!occ) { occ = document.createElement("div"); occ.className = "sh-occ"; box.before(occ); }
      occ.textContent = capital(x.description.replace(/\s*\([^)]*\d{3,4}[^)]*\)\s*$/, ""));   // the years are on the line above
    }
  };
  if (summaries.has(q)) return summaries.get(q).then(show);
  const job = fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${q}&props=sitelinks/urls&format=json&origin=*`)
    .then((r) => r.json())
    .then((d) => {
      const url = pickWikipedia((((d.entities || {})[q]) || {}).sitelinks || {});
      if (!url) return null;
      wpUrl.set(q, url);
      const m = url.match(/^https:\/\/([a-z-]+)\.wikipedia\.org\/wiki\/(.+)$/);
      if (!m) return null;
      return fetch(`https://${m[1]}.wikipedia.org/api/rest_v1/page/summary/${m[2]}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((s) => (s && s.extract && s.type !== "disambiguation" ? { extract: s.extract, url, description: s.description } : null));
    })
    .catch(() => null);
  summaries.set(q, job);
  job.then(show);
}

// RESOLVED BEFORE THE TAP (0.26.1). 0.23.3 asked Wikidata on the tap and, when no Wikipedia had an
// article (a plaque in Buenos Aires, most small museums and statues), opened Wikidata under a link
// that said "Wikipedia". Víctor: "el link de Wikipedia lleva a Wikidata… gran decepción". Now every
// "Wikipedia" link is looked up as soon as it appears on screen, 50 items per request: it becomes a
// plain link to the article, or it disappears, and the Wikidata link beside it stays.
const wpUrl = new Map();              // QID → article URL, or null for "no Wikipedia has one"
let wpTimer = 0;
function resolveWikipediaLinks() {
  const links = [...document.querySelectorAll("a.wp-link[data-q]:not([data-wp])")];
  const apply = () => links.forEach((a) => {
    const q = a.dataset.q;
    if (!wpUrl.has(q) || !a.isConnected) return;
    const url = wpUrl.get(q);
    a.dataset.wp = url ? "1" : "0";
    if (url) { a.href = url; a.target = "_blank"; a.rel = "noopener"; return; }
    // no article anywhere: take the link out, and the " · " that joined it to its neighbour
    const next = a.nextSibling, prev = a.previousSibling;
    if (next && next.nodeType === 3 && /^\s*·\s*$/.test(next.textContent)) next.remove();
    else if (prev && prev.nodeType === 3 && /^\s*·\s*$/.test(prev.textContent)) prev.remove();
    a.remove();
  });
  const need = [...new Set(links.map((a) => a.dataset.q))].filter((q) => /^Q\d+$/.test(q) && !wpUrl.has(q));
  apply();
  for (let i = 0; i < need.length; i += 50) {
    const ids = need.slice(i, i + 50);
    fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join("|")}` +
          `&props=sitelinks/urls&format=json&origin=*`)
      .then((r) => r.json())
      .then((d) => {
        for (const q of ids) {
          const ent = (d.entities || {})[q];
          // a merged item answers under its new id; follow it rather than calling it article-less
          const target = ent && ent.redirects ? (d.entities || {})[ent.redirects.to] : ent;
          if (ent) wpUrl.set(q, pickWikipedia((target || {}).sitelinks || {}));
        }
        apply();
      })
      .catch(() => {});        // offline: the links keep their fallback and the tap handler below
  }
}
new MutationObserver(() => { clearTimeout(wpTimer); wpTimer = setTimeout(resolveWikipediaLinks, 120); })
  .observe(document.body, { childList: true, subtree: true });

// A tap on a link not resolved yet (just rendered, or offline): ask on the tap, as before, but never
// dress Wikidata up as Wikipedia. With no article, say so and stay.
document.addEventListener("click", (e) => {
  const a = e.target.closest("a.wp-link[data-q]");
  if (!a || a.dataset.wp === "1" || e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return;
  e.preventDefault();
  const q = a.dataset.q;
  if (wpUrl.has(q) && !wpUrl.get(q)) return banner("No Wikipedia has an article on this yet.");
  const tab = window.open("", "_blank");
  const go = (url) => { if (tab) { tab.opener = null; tab.location.href = url; } else location.href = url; };
  fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${encodeURIComponent(q)}` +
        `&props=sitelinks/urls&format=json&origin=*`)
    .then((r) => r.json())
    .then((d) => {
      const url = pickWikipedia((((d.entities || {})[q]) || {}).sitelinks || {});
      wpUrl.set(q, url);
      if (url) go(url);
      else { if (tab) tab.close(); banner("No Wikipedia has an article on this yet."); resolveWikipediaLinks(); }
    })
    .catch(() => go(a.href));
});

/* ── a picture, large ─────────────────────────────────────────────────────────────────────────
 * Every thumbnail is a Commons file. Tapped, it opens at 1 280 px with a link to its Commons page,
 * which is where the author and the licence are: the atlas shows the picture and says whose it is,
 * it does not restate a licence it has not read. */
function openLightbox(file, cap) {
  $("lb-img").src = thumb(file, 1280);
  $("lb-cap").innerHTML = `${esc(cap || "")} · <a href="https://commons.wikimedia.org/wiki/File:` +
    `${encodeURIComponent(file.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikimedia Commons: author and licence</a>`;
  $("lightbox").hidden = false;
}
function closeLightbox() { $("lightbox").hidden = true; $("lb-img").src = ""; }
$("lightbox").addEventListener("click", (e) => { if (!e.target.closest("a")) closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("lightbox").hidden) { e.stopImmediatePropagation(); closeLightbox(); }
}, true);

/* ── what the plaque says ─────────────────────────────────────────────────────────────────────
 * 47 064 inscriptions, 17 MB, cut into 0.5° tiles (build_inscriptions.py); a card fetches the one
 * tile it needs, once. Long texts fold to five lines and open with a tap. */
const insTiles = new Map();
function tileFor(dir, key) {
  const [lat, lon] = key.split(",").map(Number);
  const step = dir === "ins" ? 0.5 : 2;          // ins/ 0.5° (build_inscriptions.py); cards/ and hrs/ 2° (build.py, build_hours.py)
  const tile = `${dir}/${Math.floor(lat / step)}_${Math.floor(lon / step)}`;
  if (!insTiles.has(tile))
    insTiles.set(tile, fetch(`culture/data/${tile}.json?v=${DATA_V}`)
      .then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  return insTiles.get(tile);
}
function fillInscriptions(root) {
  root.querySelectorAll(".hrs-slot[data-key]").forEach((box) => {
    tileFor("hrs", box.dataset.key).then((t) => {
      const h = t[box.dataset.key];
      if (h) box.outerHTML = hoursHTML(h); else box.remove();
    });
  });
  root.querySelectorAll(".mx[data-key]").forEach((box) => {
    tileFor("cards", box.dataset.key).then((t) => {
      const x = t[box.dataset.key];
      if (!x) { box.remove(); return; }
      // A statue from OpenStreetMap says when it was put up, what it is made of, who made it, and
      // what it says; and it says where it came from, because ODbL asks for that and so do we.
      const when = typeof x.date === "number" ? yearStr(x.date) : (x.date ? `put up ${esc(x.date)}` : "");
      const facts = [when, x.material ? esc(x.material) : "", x.by ? `by ${esc(x.by)}` : "",
                     x.marked ? `${x.marked === 1 ? "a memorial recalls it" : x.marked + " memorials recall it"}` : ""].filter(Boolean).join(" · ");
      box.innerHTML = (x.img ? pic(x.img, "mx-img", 480, "") : "") +
        `<div class="mx-t">${x.k ? `<div class="mx-k">${esc(x.k)}</div>` : ""}` +
        (facts ? `<div class="mx-f">${facts}</div>` : "") +
        // D23: a battlefield, or a point that is only its town's centre, is an area; saying so is
        // the difference between a pin and a promise
        (x.approx ? `<div class="mx-f approx">📍 an area, not an exact spot</div>` : "") +
        (x.ins ? `<blockquote class="ins-q">${esc(x.ins)}</blockquote>` : "") + `<div class="lk">` +
        [x.osm ? `<a href="https://www.openstreetmap.org/${esc(x.osm)}" target="_blank" rel="noopener">OpenStreetMap</a>` : "",
         x.web ? `<a href="${esc(x.web)}" target="_blank" rel="noopener">Website</a>` : "",
         x.wd ? `<a class="wp-link" data-q="${esc(x.wd)}" href="https://www.wikidata.org/wiki/Special:GoToLinkedPage?site=${LANG}wiki&itemid=${esc(x.wd)}" target="_blank" rel="noopener">Wikipedia</a>` : "",
         x.wd ? `<a href="https://www.wikidata.org/wiki/${esc(x.wd)}" target="_blank" rel="noopener">Wikidata</a>` : ""]
          .filter(Boolean).join(" · ") + `</div></div>`;
      const img = box.querySelector("img[data-file]");
      if (img) {
        img.dataset.cap = box.closest(".card")?.querySelector(".nm")?.textContent || "";
        img.addEventListener("click", (ev) => { ev.stopPropagation(); openLightbox(img.dataset.file, img.dataset.cap); });
      }
    });
  });
  root.querySelectorAll(".ins[data-key]").forEach((box) => {
    const key = box.dataset.key;
    tileFor("ins", key).then((t) => {
      const list = t[key] || [];
      if (!list.length) { box.remove(); return; }
      box.innerHTML = list.slice(0, 4).map(([id, text, year]) =>
        `<blockquote class="ins-q">${esc(text)}</blockquote>` +
        `<div class="ins-src"><a href="https://openplaques.org/plaques/${id}" target="_blank" rel="noopener">` +
        `Open Plaques № ${id}</a>${year ? ` · put up ${esc(year)}` : ""}</div>`).join("") +
        (list.length > 4 ? `<div class="ins-src">…and ${list.length - 4} more plaques on this spot</div>` : "");
      box.querySelectorAll(".ins-q").forEach((q) => q.addEventListener("click", () => q.classList.toggle("open")));
    });
  });
}

/* ── side panel: filter → group → render plan → stream (CHASSIS §5) ── */
const PANEL_CHUNK = 80;
let panelPlan = [], panelCursor = 0, panelIO = null;
const folded = new Set();
// People first (0.29): grouped by place, a country-scale view listed Picasso once per plaque, nine times in a row.
// A tapped pin still opens its place group (revealInPanel switches to "place").
let panelSort = "person", sortBeforePin = null;

// While the reader resizes the list, the map shrinks or grows, and a list that follows the map's
// bounds loses rows exactly when the reader asked for MORE list (Víctor, 2026-09-13). So a resize
// freezes the area the list covers; the first time the reader moves the map themselves, the list
// follows the map again.
let listArea = null;
function renderPanel() {
  if (panelIO) panelIO.disconnect();
  const b = listArea || map.getBounds();
  const vis = [];
  for (const pl of places) {
    const s = SITES[pl.siteIdx];
    if (!b.contains([s[S_LAT], s[S_LON]])) continue;
    for (const r of pl.rows) if (passes(r, "panel")) vis.push(r);
  }
  const nPeople = new Set(vis.map((r) => r.qid)).size;
  // say what the dial is holding back, and give the way to see it (a default must not hide a gap)
  const held = state.topN && !state.person && heldBack
    ? `<button type="button" id="ph-all" class="ph-more" title="Show everyone, not only the best known">+${heldBack.toLocaleString()} less known ${state.topWhere === "here" ? "here" : "in the world"}</button>` : "";
  $("panel-head").innerHTML = `<b>${nPeople.toLocaleString()}</b>` +
    `<span class="ph-tail"> ${nPeople === 1 ? "person" : "people"} in view${state.topN && !state.person ? ` · the best known ${state.topWhere === "here" ? "here" : "in the world"}` : ""}</span>` + held;
  const ul = $("worklist");
  if (!vis.length) {
    ul.innerHTML = `<li class="empty">${t("Pan or zoom the map. Whoever is in view is listed here.")}</li>`;
    return;
  }
  panelPlan = [];
  $("pv-fold").hidden = panelSort !== "place";
  if (panelSort === "person") {
    const who = new Map();
    for (const r of vis) {
      const w = who.get(r.qid);
      if (!w) who.set(r.qid, { r, n: 1, sites: new Set([r.site]) });
      else { w.n++; w.sites.add(r.site); if (r.rank > w.r.rank) w.r = r; }
    }
    for (const w of [...who.values()].sort((a, z) => z.r.rank - a.r.rank || z.n - a.n)) panelPlan.push({ person: w });
  } else if (panelSort === "place") {
    const groups = new Map();
    for (const r of vis) { if (!groups.has(r.site)) groups.set(r.site, []); groups.get(r.site).push(r); }
    // places in order of the best known person in each (0.27), then by how many: the biggest cemetery in
    // view used to head the list whoever lay in it
    const top = (rows) => rows.reduce((m, r) => (r.rank > m ? r.rank : m), 0);
    const ordered = [...groups.entries()].sort((a, z) => top(z[1]) - top(a[1]) || z[1].length - a[1].length);
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

function personRowHTML(w) {
  const r = w.r, k = w.sites.size;
  const where = k > 1 ? `${k} places` : SITES[r.site][S_NAME];
  return `<li class="row person" data-qid="${esc(r.qid)}" data-site="${r.site}" title="Open this person">` +
    `<span class="dot" style="background:${colourFor(colourKey(r))}"></span>` +
    `<span class="nm">${esc(r.name)}</span><span class="yr">${lifeStr(r)}</span>` +
    `<span class="tags"><span class="badge where">${esc(where.length > 28 ? where.slice(0, 27) + "…" : where)}</span></span></li>`;
}
function rowHTML(r, flat) {
  const acc = VOCAB.access[r.access], mk = VOCAB.marking[r.marking];
  return `<li class="row" data-qid="${esc(r.qid)}" data-site="${r.site}" title="Open this person">` +
    `<span class="dot" style="background:${colourFor(colourKey(r))}"></span>` +
    `<span class="nm">${esc(r.name)}</span><span class="yr">${lifeStr(r)}</span>` +
    `<span class="tags">` +
    (flat ? `<span class="badge">${esc(SITES[r.site][S_NAME].slice(0, 22))}</span>` : "") +
    (acc !== "unknown" ? `<span class="badge acc-${esc(acc)}">${esc((LABEL.access[acc] || acc).replace(/^[^\p{L}]+/u, ""))}</span>` : "") +
    (mk !== "unknown" ? `<span class="badge">${esc(plain("marking", mk))}</span>` : "") +
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
        `<span class="gname">${esc(s[S_NAME])}` +
        (whereOf(s) ? `<span class="gwhere">${esc(whereOf(s))}</span>` : "") + `</span>` +
        `<span class="gsub">${it.grp.n} ${it.grp.n === 1 ? "person" : "people"}</span></li>`;
      // the place a pin was tapped for: its card (kind, access, hours, words, photo) opens its group
      if (it.grp.siteIdx === selectedSite) {
        const pl = places.find((x) => x.siteIdx === selectedSite);
        const box = document.createElement("div");
        box.innerHTML = sitePopup(selectedSite, (pl && (pl.vis || pl.rows)) || []);
        const hd = box.querySelector(".hd");
        if (hd) html += `<li class="grp-card card"><button type="button" class="grp-card-x" title="Close this card">✕</button>${hd.outerHTML}</li>`;
      }
    } else if (it.person) html += personRowHTML(it.person);
    else html += rowHTML(it.r, it.flat);
  }
  ul.insertAdjacentHTML("beforeend", html);
  const card = ul.querySelector("li.grp-card:not([data-filled])");
  if (card) { card.dataset.filled = "1"; fillInscriptions(card); }
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
  if (e.target.closest(".grp-card-x")) {
    selectedSite = null; openPlace = null;
    // back to the list the reader had before the pin opened its place
    if (sortBeforePin) { panelSort = sortBeforePin; $("pv-sort").value = panelSort; sortBeforePin = null; }
    renderPanel(); syncURL(); return;
  }
  if (e.target.closest("li.grp-card")) return;            // its links and pictures act on their own
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
$("pv-sort").addEventListener("change", (e) => { panelSort = e.target.value; sortBeforePin = null; renderPanel(); });
// Panning and zooming change which cells exist, so the quota has to be re-run: that IS the
// mechanism by which zooming in reveals the ones that were held back.
map.on("moveend", () => {
  if (state.topN && state.topWhere === "here") recomputeRankCut();
  const { pins, inView, rowsInView } = drawMap();
  $("stats").textContent = statsLine(pins, inView, rowsInView);     // one sentence, one place (was written twice)
  renderPanel();
  syncURL();
});

/* ── table: the SAME predicate, a different view name. No second copy. ── */
let tableOn = false, tableSort = { key: "rank", dir: -1 };
const COLS = [
  { key: "name", label: "Person" }, { key: "born", label: "Born", num: true },
  { key: "died", label: "Died", num: true }, { key: "_site", label: "Place" },
  { key: "_access", label: "Can I see it?" }, { key: "_marking", label: "What is there" },
  { key: "_dom", label: "Field" }, { key: "rank", label: "Renown", num: true },
];
const cell = (r, k) => k === "_site" ? SITES[r.site][S_NAME] : k === "_access" ? plain("access", VOCAB.access[r.access])
  : k === "_marking" ? plain("marking", VOCAB.marking[r.marking]) : k === "_dom" ? plain("dom", VOCAB.dom[r.dom]) : r[k];
function renderTable() {
  const rows = TRACES.filter((r) => passes(r, "table"));
  const k = tableSort.key, num = COLS.find((c) => c.key === k)?.num;
  rows.sort((a, z) => {
    const va = num ? (cell(a, k) ?? -1e9) : deacc(cell(a, k)), vb = num ? (cell(z, k) ?? -1e9) : deacc(cell(z, k));
    return (va < vb ? -1 : va > vb ? 1 : 0) * tableSort.dir;
  });
  $("table-count").textContent = `${rows.length.toLocaleString()} rows` + (rows.length > 3000 ? " · the first 3,000 shown" : "");
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
  if (on) { startLongTail(); setTop(false); }
  $("table").hidden = !on; $("main").style.display = on ? "none" : "flex";
  $("v-table").classList.toggle("active", on); $("v-map").classList.toggle("active", !on);
  if (on) renderTable(); else map.invalidateSize();
  syncURL();
}
$("v-table").addEventListener("click", () => setTable(true));
$("v-map").addEventListener("click", () => { setTop(false); setTable(false); });
$("v-top").addEventListener("click", () => setTop(true));

/* ── TOP PEOPLE (0.27): the ranking, and how it is made ─────────────────────────────────────────────
 * Víctor, 2026-09-15: "quiero un panel de top personas… explica cómo se han conseguido… di que se han ajustado
 * ciertas nacionalidades para compensar falta de datos, que es la verdad". culture/data/top.json
 * (build_top.py): the 10 000 highest ranks, with country of birth, traces, and the numbers per country. */
let TOP = null, topOn = false, topN = 500, topJob = null;
$("tp-map").addEventListener("click", () => setTop(false));
function setTop(on) {
  topOn = on;
  $("toppanel").hidden = !on;
  $("v-top").classList.toggle("active", on);
  if (on) {
    $("table").hidden = true; tableOn = false; $("v-table").classList.remove("active");
    $("main").style.display = "none"; $("v-map").classList.remove("active");
    // on a phone the open filters sit above the list: the tap that asks for the list folds them away
    if (matchMedia("(max-width: 720px)").matches && !document.body.classList.contains("folded")) $("fold").click();
    if (!topJob) topJob = fetch(`culture/data/top.json?v=${DATA_V}`).then((r) => r.json()).then((d) => { TOP = d; initTop(); });
    else if (TOP) renderTop();
  } else if (!tableOn) {
    $("main").style.display = "flex"; $("v-map").classList.add("active"); map.invalidateSize();
  }
  syncURL();
}
const pct = (x) => (x == null ? "?" : `${Math.round(x * 100)} %`);
function initTop() {
  const m = TOP.method || {};
  const cs = TOP.countries;
  const cName = (c) => (c ? c.en : "");
  const byQ = Object.fromEntries(cs.map((c) => [c.q, c]));
  const THE = new Set(["United Kingdom", "United States", "Netherlands", "Czech Republic"]);
  const share = (c) => (c && c.famous_dead ? c.in_atlas / c.famous_dead : null);
  const cov = (q) => { const c = byQ[q]; const x = share(c);
    return x == null ? "" : `${Math.round(x * 100)} % of those born in ${THE.has(c.en) ? "the " : ""}${c.en}`; };
  const list = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs.join(""));
  const adjusted = cs.filter((c) => c.factor != null && c.factor !== 1).sort((a, z) => z.factor - a.factor);
  // one sentence, not a methods section (Víctor: "esto no es una web académica… algo muchísimo más flojo de una frase")
  $("tp-how").innerHTML = `<p class="tp-note">Based on Wikipedia, with some adjustments by language and country of birth.</p>`;
  const sel = $("tp-country");
  const counts = {};
  for (const p of TOP.people) if (p[5] >= 0) counts[p[5]] = (counts[p[5]] || 0) + 1;
  sel.innerHTML = `<option value="">every country of birth</option>` +
    Object.entries(counts).sort((a, z) => z[1] - a[1]).map(([i, n]) => `<option value="${i}">${esc(cName(cs[i]))} (${n})</option>`).join("");
  $("tp-bar").querySelectorAll("button[data-n]").forEach((b) => b.addEventListener("click", () => {
    topN = +b.dataset.n; $("tp-bar").querySelectorAll("button[data-n]").forEach((x) => x.classList.toggle("on", x === b)); renderTop();
  }));
  sel.addEventListener("change", renderTop);
  $("tp-bar").querySelectorAll(".tp-tabs button").forEach((b) => b.addEventListener("click", () => showTopTab(b.dataset.tab)));
  $("tp-q").addEventListener("input", renderTop);
  $("tp-list").addEventListener("click", (e) => {
    const row = e.target.closest("[data-qid]"); if (!row) return;
    setTop(false); setTable(false);
    const q = row.dataset.qid;
    startLongTail();                       // the panel can be opened before the less known have arrived
    enterPersonMode(q, null); frameRows(byPerson.get(q) || []);
    if (byPerson.has(q)) openPerson(q); else pendingCard = q;
  });
  renderTop();
}
/* the plan B, as numbers: every street and square named after a person of the atlas (build_streets.py) */
let STATS = null;
function showTopTab(tab) {
  $("tp-bar").querySelectorAll(".tp-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
  const streets = tab === "streets";
  $("tp-body").hidden = streets; $("tp-streets").hidden = !streets;
  $("tp-bar").querySelectorAll(".tp-ns, #tp-country, #tp-q").forEach((el) => { el.style.display = streets ? "none" : ""; });
  if (!streets) return;
  const draw = () => {
    const S = STATS, max = (xs, i) => Math.max(1, ...xs.map((x) => x[i]));
    const bar = (label, n, m, extra) => `<div class="tp-bar-row"><span class="tp-bl">${label}</span>` +
      `<span class="tp-bb"><i style="width:${(100 * n / m).toFixed(1)}%"></i></span><span class="tp-bn">${n.toLocaleString()}</span>${extra || ""}</div>`;
    const g = S.gender, gt = (g.female || 0) + (g.male || 0);
    const ord = (n) => n + ((n % 100 >= 11 && n % 100 <= 13) ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"));
    const cent = (c) => (c > 0 ? `${ord(c)} century` : `${ord(-c)} century BC`);
    $("tp-streets").innerHTML =
      `<p class="tp-note">${S.streets.toLocaleString()} streets and squares named after ${S.people.toLocaleString()} people of the atlas, from OpenStreetMap and Wikidata.</p>` +
      `<div class="st-grid"><section><h3>Most streets</h3>` +
      S.top.slice(0, 25).map(([q, name, n, c]) => `<div class="tp-bar-row st-p" data-qid="${esc(q)}"><span class="tp-bl">${esc(name)}</span>` +
        `<span class="tp-bb"><i style="width:${(100 * n / S.top[0][2]).toFixed(1)}%"></i></span><span class="tp-bn">${n.toLocaleString()}</span></div>`).join("") +
      `</section><section><h3>By country of birth</h3>` +
      S.countries.slice(0, 15).map(([c, n, who]) => bar(esc(c), n, S.countries[0][1], `<span class="st-who">${esc(who)}</span>`)).join("") +
      `<h3>Women and men</h3>` + bar("women", g.female || 0, gt) + bar("men", g.male || 0, gt) +
      `<h3>By century of birth</h3>` + S.centuries.map(([c, n]) => bar(cent(c), n, max(S.centuries, 1))).join("") +
      `</section></div>`;
    $("tp-streets").querySelectorAll(".st-p").forEach((row) => row.addEventListener("click", () => {
      const q = row.dataset.qid; setTop(false); setTable(false); startLongTail();
      enterPersonMode(q, null); frameRows(byPerson.get(q) || []);
      if (byPerson.has(q)) openPerson(q); else pendingCard = q;
    }));
  };
  if (STATS) draw();
  else fetch(`culture/data/streets-stats.json?v=${DATA_V}`).then((r) => r.json()).then((d) => { STATS = d; draw(); });
}
function renderTop() {
  if (!TOP) return;
  const cs = TOP.countries, want = $("tp-country").value, q = deacc($("tp-q").value || "");
  const slice = TOP.people.slice(0, topN);
  const count = {};
  for (const p of slice) if (p[5] >= 0) count[p[5]] = (count[p[5]] || 0) + 1;
  const bars = Object.entries(count).sort((a, z) => z[1] - a[1]).slice(0, 15);
  const max = bars.length ? bars[0][1] : 1;
  $("tp-countries").innerHTML = `<h3>Countries of birth in the top ${topN.toLocaleString()}</h3>` +
    bars.map(([i, n]) => `<div class="tp-bar-row"><span class="tp-bl">${esc(cs[i].en)}</span>` +
      `<span class="tp-bb"><i style="width:${(100 * n / max).toFixed(1)}%"></i></span><span class="tp-bn">${n}</span></div>`).join("");
  const rows = slice.map((p, i) => [p, i + 1]).filter(([p]) => (!want || String(p[5]) === want) && (!q || deacc(p[1]).includes(q)));
  $("tp-list").innerHTML = `<table class="tp-table"><thead><tr><th>#</th><th>person</th><th>life</th><th>born in</th>` +
    `<th title="The renown score described on the left">renown</th><th title="Places in the atlas">places</th></tr></thead><tbody>` +
    rows.slice(0, 2000).map(([p, pos]) => `<tr data-qid="${esc(p[0])}"><td class="tp-pos">${pos}</td><td class="tp-name">${esc(p[1])}</td>` +
      `<td>${esc(lifeStr({ qid: p[0], born: p[2], died: p[3] }))}</td><td>${p[5] >= 0 ? esc(cs[p[5]].en) : ""}</td>` +
      `<td class="tp-num">${p[4]}</td><td class="tp-num">${p[6]}</td></tr>`).join("") +
    `</tbody></table>` + (rows.length > 2000 ? `<p class="tp-more">Showing 2,000 of ${rows.length.toLocaleString()}: choose a country or search a name.</p>` : "");
}

/* ── the search box finds THINGS, not just rows ──────────────────────────────────────────────
 * The filter narrows every view, which is right and was never the problem. The problem was that
 * the panel only shows what is inside the map, so typing "Goya" showed whoever happened to be on
 * screen: four separate rows for his four traces, under a man called Goyau. You could explore the
 * atlas and you could not look anything up in it.
 *
 * So the box now also offers what it found: PEOPLE (one row each, with all their traces) and
 * PLACES. Picking one goes there. This is the sibling's painter box (CHASSIS §3c), where typing
 * also finds museums and clicking one sets a different dimension: one box, several kinds of
 * answer, no mode switch.
 */
const SUGGEST_MAX = 8;

function findEntities(q) {
  const people = [];
  for (const [qid, rows] of byPerson) {
    if (!rows[0]._s || !qid.startsWith("Q")) continue;       // museums, plaques and events are places
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
      `<li class="sg-place" data-site="${pl.i}"><span class="sg-th ph">${WHAT_ICON[VOCAB.siteKind[SITES[pl.i][S_KIND]]] || "⌖"}</span>` +
      `<div class="wk"><div class="wt">${esc(pl.name)}</div></div></li>`).join("") : "");
  box.hidden = false;
}

$("suggest").addEventListener("click", (e) => {
  const per = e.target.closest(".sg-person");
  if (per) {
    $("suggest").hidden = true;
    // go there first, then open the card: the map should already be right behind it
    enterPersonMode(per.dataset.qid, null);
    frameRows(byPerson.get(per.dataset.qid) || []);
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
  // Enter takes the first suggestion: the whole point is not having to aim at it
  if (e.key === "Enter" && document.activeElement === filterBox) {
    const first = $("suggest").querySelector(".sg-person, .sg-place");
    if (first) first.click();
  }
});

/* ── lifetime slider ── */
let TL_MIN = -500, TL_MAX = 2026;
// Set once somebody (the reader, or a link they opened) has actually chosen a range. The long
// tail arrives 2.5 s after boot and calls buildTimeline again with wider bounds; without this flag
// that second call silently threw away the range the URL had just restored.
let tlChosen = false;
function buildTimeline(min, max) {
  TL_MIN = min; TL_MAX = max;
  const lo = $("tl-min"), hi = $("tl-max"), label = $("tl-label"), fill = $("tl-fill");
  lo.min = hi.min = min; lo.max = hi.max = max;
  if (tlChosen) {                       // keep the chosen range, clamped into the new bounds
    state.yearMin = Math.max(min, Math.min(max, state.yearMin));
    state.yearMax = Math.max(min, Math.min(max, state.yearMax));
  } else { state.yearMin = min; state.yearMax = max; }
  lo.value = state.yearMin; hi.value = state.yearMax;
  const paint = () => {
    const span = max - min || 1;
    fill.style.left = ((state.yearMin - min) / span) * 100 + "%";
    fill.style.right = 100 - ((state.yearMax - min) / span) * 100 + "%";
    label.textContent = `${yearStr(state.yearMin)} – ${yearStr(state.yearMax)}`;
  };
  const update = () => {
    let a = +lo.value, b = +hi.value;
    if (a > b) { if (document.activeElement === lo) { b = a; hi.value = b; } else { a = b; lo.value = a; } }
    state.yearMin = a; state.yearMax = b; tlChosen = true; paint(); refresh();
  };
  // listeners once: every rebuild used to add another pair, so a drag ran refresh() several times over
  lo.oninput = update; hi.oninput = update; paint();
}

/* ── the blue dot: where you are, while you walk ──────────────────────────────────────────────
 * The old button took ONE fix, listed what was near it, and then knew nothing more, so the atlas
 * was a thing you consulted before leaving the house, not a thing you used in the street. This
 * watches instead: a dot that moves with you, a halo the size of the error the phone admits to,
 * and the "near me" list re-sorting as you walk.
 *
 * The dot lives in its OWN layer. `pinLayer` is cleared and rebuilt on every `moveend`: putting
 * the dot in there would delete it the first time you moved, which is the same bug as the popup
 * the map used to eat, and it would be much harder to notice because you would blame the GPS.
 *
 * Nothing about the position is stored, sent, or written to the URL. It is asked for, drawn, and
 * forgotten when you switch it off.
 */
const meLayer = L.layerGroup().addTo(map);
let resizingMap = false;
/* ── the list's size, dragged ─────────────────────────────────────────────────────────────────
 * The grip on the panel's edge sets its width beside the map, or its height under it on a phone.
 * Remembered per layout in this browser only (a convenience, not state worth a URL). */
(function panelGrip() {
  const grip = $("panel-grip"), panel = $("panel"), main = $("main");
  const key = () => (narrow() ? "panelH" : "panelW");
  const apply = (px) => { panel.style.flex = px ? `0 0 ${px}px` : ""; };
  const restore = () => { let v = null; try { v = +localStorage.getItem(key()) || null; } catch (e) {} apply(v); };
  const save = (px) => { try { localStorage.setItem(key(), String(px)); } catch (e) {} };
  restore();
  let lastNarrow = narrow();
  window.addEventListener("resize", () => { if (narrow() !== lastNarrow) { lastNarrow = narrow(); restore(); } });
  // The first version resized on every pointermove, and every resize made the map redraw its pins
  // and the list: on a phone the grip stuttered and lagged behind the thumb. Now the size follows
  // the finger on animation frames, and the map is redrawn once, on release.
  let drag = null, frame = 0, px = 0;
  const limits = () => {
    const r = main.getBoundingClientRect();
    return narrow() ? [70, r.height - 90, r] : [220, r.width - 240, r];
  };
  grip.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: false };
    if (!listArea) listArea = map.getBounds();          // what the list shows until the map is moved
    window.panelDragging = true;
    try { grip.setPointerCapture(e.pointerId); } catch (err) {}
    grip.classList.add("dragging"); document.body.classList.add("dragging-panel"); e.preventDefault();
  });
  grip.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (Math.abs(e.clientY - drag.y) + Math.abs(e.clientX - drag.x) > 6) drag.moved = true;
    if (!drag.moved) return;
    e.preventDefault();
    const [lo, hi, r] = limits();
    px = Math.round(Math.max(lo, Math.min(hi, narrow() ? r.bottom - e.clientY : r.right - e.clientX)));
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; apply(px); });
  });
  const end = () => {
    if (!drag) return;
    const tapped = !drag.moved;
    drag = null; window.panelDragging = false;
    grip.classList.remove("dragging"); document.body.classList.remove("dragging-panel");
    if (tapped && narrow()) {
      // A tap steps through three sizes, the gesture a phone's bottom sheets have taught everyone.
      const [lo, hi, r] = limits();
      const now = panel.getBoundingClientRect().height;
      const steps = [0.28, 0.5, 0.78].map((f) => Math.round(Math.max(lo, Math.min(hi, r.height * f))));
      px = steps.find((v) => v > now + 8) || steps[0];
      apply(px);
    }
    if (px) save(px);
    requestAnimationFrame(() => {
      resizingMap = true; map.invalidateSize({ pan: false }); resizingMap = false;
      refresh();
    });
  };
  grip.addEventListener("pointerup", end); grip.addEventListener("pointercancel", end);
})();
let meWatch = null, meDot = null, meHalo = null, meFollow = false, urlViewBeforeMe = null;

function drawMe(lat, lon, acc) {
  if (!meDot) {
    meHalo = L.circle([lat, lon], { radius: acc || 0, color: "#2f6fd0", weight: 1,
                                    fillColor: "#2f6fd0", fillOpacity: 0.12, interactive: false });
    meDot = L.circleMarker([lat, lon], { radius: 7, color: "#fff", weight: 3,
                                         fillColor: "#2f6fd0", fillOpacity: 1 });
    meDot.bindTooltip("You are here", { direction: "top", offset: [0, -10] });
    meLayer.addLayer(meHalo); meLayer.addLayer(meDot);
  } else {
    meDot.setLatLng([lat, lon]);
    meHalo.setLatLng([lat, lon]).setRadius(acc || 0);
  }
  meDot.bringToFront();
}

function stopMe() {
  if (meWatch != null) navigator.geolocation.clearWatch(meWatch);
  meWatch = null; meLayer.clearLayers(); meDot = meHalo = null; meFollow = false;
  $("locate").disabled = false;
  meButton();
}

// Three states, because two was a lie: off, following, and watching-but-not-chasing (you panned
// away to look at something). The button says which one it is in, and what the next tap will do.
function meButton() {
  const btn = $("locate");
  btn.textContent = meWatch == null ? "📍 Where I am" : meFollow ? "📍 Following" : "📍 Re-centre";
  btn.title = meWatch == null ? "Show a live dot where you are"
            : meFollow ? "Following you. Tap to switch it off"
            : "Bring the map back to you";
  btn.classList.toggle("active", meWatch != null);
}

$("locate").addEventListener("click", () => {
  const btn = $("locate");
  // Panned away and the dot is still live: the obvious next tap is "take me back", not "stop".
  if (meWatch != null && !meFollow && meDot) {
    meFollow = true; map.setView(meDot.getLatLng(), Math.max(map.getZoom(), 15));
    meButton(); return;
  }
  if (meWatch != null) return stopMe();
  if (!navigator.geolocation) return banner("Geolocation is not available in this browser.");
  btn.textContent = "📍 Locating…"; btn.disabled = true;
  { const c = map.getCenter(); urlViewBeforeMe = `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${map.getZoom()}`; }
  let first = true, lastPan = null;
  meFollow = true;
  meWatch = navigator.geolocation.watchPosition((pos) => {
    const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
    btn.disabled = false; meButton();
    drawMe(lat, lon, acc);
    if (meHalo) meHalo.setStyle({ color: "#2f6fd0", fillColor: "#2f6fd0" });   // fresh again
    if (first) {
      first = false;
      if (tableOn) setTable(false);
      // The map comes to you, a few kilometres a side (4 km), and the list is simply what is on it.
      // The first version switched the list to "14 places within 1 km" instead, a second list with
      // its own rules; Víctor: "no quiero que la lista dependa de la localización, sino del mapa".
      map.fitBounds(L.latLng(lat, lon).toBounds(4000), { animate: false });
      lastPan = { lat, lon };
      return;
    }
    // Walking: the map follows, and so the pins and the list filter themselves to where you are.
    // Only after 20 m, because every pan redraws the pins and the list, and a phone reports a
    // position every second.
    if (meFollow && (!lastPan || map.distance([lastPan.lat, lastPan.lon], [lat, lon]) > 20)) {
      lastPan = { lat, lon };
      map.panTo([lat, lon], { animate: true });
    }
  }, (err) => {
    btn.disabled = false;
    // Only a REFUSAL ends it. The first version stopped on any error, and in the street the GPS
    // times out all the time: inside a church, between tall buildings, underground. The dot then
    // vanished for good and you had to know to tap again. A timeout or a lost signal now keeps the
    // watch alive; the last dot stays, its halo turns grey to say it is not current.
    if (err.code === 1) {
      stopMe();
      return banner("This browser is not allowed to share your location. Check the site permissions.");
    }
    if (meHalo) meHalo.setStyle({ color: "#9a958a", fillColor: "#9a958a" });
    else { btn.textContent = "📍 Still looking…"; banner("No position yet. Keep the page open, it keeps trying."); }
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
});
// Dragging the map is a statement that you want to look somewhere else. The dot keeps moving; the
// map stops chasing it. Tapping the button again re-centres and resumes.
map.on("dragstart", () => { if (meWatch != null && meFollow) { meFollow = false; meButton(); } });
// Any real movement of the map ends a frozen list: the reader dragging or zooming, a flight they
// asked for, the map following their location. `movestart` is exactly that: Leaflet's invalidateSize,
// which is what a resize calls, fires move and moveend but never movestart.
map.on("movestart", () => { if (!window.panelDragging && !resizingMap) listArea = null; });

let bTimer = null;
function banner(msg) {
  const b = $("banner"); b.textContent = msg; b.hidden = false;
  clearTimeout(bTimer); bTimer = setTimeout(() => { b.hidden = true; }, 5000);
}
$("chrome-toggle").addEventListener("click", () => {
  document.body.classList.toggle("chrome-off"); map.invalidateSize();
});

/* ── folding the controls away ────────────────────────────────────────────────────────────────
 * On a phone the filter rows eat half the screen and the map (the thing the atlas IS) gets what
 * is left. One button folds them, and it says how many filters are still doing something, because
 * a folded control that is silently filtering is worse than no control at all.
 */
function foldSummary() {
  let n = 0;
  for (const fam of ["what", "access", "marking", "verb", "dom"])
    if (VOCAB[fam] && VOCAB[fam].some((_, i) => state[fam][i] === false)) n++;
  if (state.topN !== TOP_DEFAULT || state.topWhere !== "here") n++;     // the default is not a filter the reader set
  if (state.person) n++;
  const folded = document.body.classList.contains("folded");
  // Open, the button says what the next tap does. "Filters ▴" read as a label, not as the way back
  // to the map (Víctor, 2026-09-13).
  $("fold").innerHTML = folded
    ? `Filters ▾${n ? ` <b>${n}</b>` : ""}`
    : `✕ Close filters${n ? ` <b>${n}</b>` : ""}`;
  $("fold").setAttribute("aria-expanded", String(!folded));
}
$("fold-done").addEventListener("click", () => { if (topOn) setTop(false); if (!document.body.classList.contains("folded")) $("fold").click(); });
$("fold").addEventListener("click", () => {
  document.body.classList.toggle("folded");
  foldSummary();
  requestAnimationFrame(() => { map.invalidateSize({ pan: false }); renderPanel(); });
});
// Everyone opens with the map, not with the controls. On a computer the views and the best-known dial stay
// in sight; the families, the filter box and the timeline wait behind "Filters" (Víctor, 2026-09-15: half the
// screen was filters before the map).
document.body.classList.add("folded");
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
 * works, and its site indices are relative to its own file, so they are shifted on the way in.
 */
const siteAt = new Map();   // "lat,lon" → index in SITES

function absorb(d) {
  const ix = Object.fromEntries(d.cols.map((c, i) => [c, i]));
  // One site, one pin (DECISIONS D5), and the two files each carry their own copy of any place
  // they share, because each renumbers only the sites it uses. Père-Lachaise arrived twice, and so
  // did 9 107 other coordinates. Merging on the coordinate also catches the honest case: a statue
  // and a grave standing at the same spot are one place to go to.
  // Each file interns its OWN town lines, so a `where` index from the long tail means something
  // different from the same number in the base file. Translate on the way in, before the row is
  // stored: the alternative is shipping the whole vocabulary twice, which is half a megabyte of
  // town names the long tail never points at.
  const wmap = (d.vocab.where || [""]).map((w) => {
    let i = WHERES.indexOf(w);
    if (i < 0) { i = WHERES.length; WHERES.push(w); }
    return i;
  });
  const local = [];
  // S_OSM: the site came ONLY from OpenStreetMap (the file carries an ODbL `licence`). Such a plaque has
  // its words in its card, not in the Open Plaques tiles, and must not ask for a tile that is not there.
  const fromOSM = /ODbL/.test(d.licence || "") ? 1 : 0;
  for (const s of d.sites) {
    const key = s[S_LAT] + "," + s[S_LON];
    let i = siteAt.get(key);
    if (i === undefined) {
      s[S_WHERE] = wmap[s[S_WHERE]] ?? 0;
      s[S_OSM] = fromOSM;
      i = SITES.length; SITES.push(s); siteAt.set(key, i);
    } else if (!fromOSM) SITES[i][S_OSM] = 0;
    local.push(i);
  }
  for (const a of d.traces) {
    const site = local[a[ix.site]];
    const r = { qid: a[ix.qid], name: a[ix.name], born: a[ix.born], died: a[ix.died],
                site, what: a[ix.what], access: a[ix.access], marking: a[ix.marking],
                verb: a[ix.verb], rank: a[ix.rank], flags: a[ix.flags], dom: a[ix.dom],
                mount: a[ix.mount] };
    r._s = deacc(r.name + " " + SITES[site][S_NAME] + " " + whereOf(SITES[site]));
    TRACES.push(r);
  }
}

/* ── the whole view lives in the URL ──────────────────────────────────────────────────────────
 * A phone throws a background tab away and reloads it from the address bar when you come back,
 * and without this, that reload landed on the home view: every filter gone, the map back over
 * Europe, whatever you had found lost. The atlas looked like it had forgotten, and it had.
 *
 * `replaceState`, never `pushState`. The map fires `moveend` on every pan and a push per pan would
 * fill the back button with three hundred indistinguishable steps, which is a worse phone than the
 * one we started with. The URL is a SNAPSHOT of where you are standing, not a log of how you got
 * here: reload it, share it, bookmark it, reopen the tab tomorrow, and you are back.
 *
 * Families are written as the values still TICKED, by name, and only when some are NOT, so a
 * clean view keeps a clean URL, and a value added to the bundle next month cannot be silently
 * excluded by a link written today: it is absent from the list, so it arrives ticked. An old link
 * showing MORE than its author saw is the honest failure; showing less, invisibly, is not.
 */
const URL_FAMS = ["what", "mount", "access", "marking", "dom", "verb"];
let urlTimer = null, urlBooted = false;

function viewToURL() {
  const p = new URLSearchParams();
  for (const fam of URL_FAMS) {
    const v = VOCAB[fam];
    if (!v) continue;
    if (v.some((_, i) => state[fam][i] === false))
      p.set(fam, v.filter((_, i) => state[fam][i] !== false).join(",") || "none");
  }
  if (state.topN !== TOP_DEFAULT || state.topWhere !== "here") p.set("top", `${state.topN}${state.topN ? "-" + state.topWhere : ""}`);
  if (state.personSec && state.person) p.set("whosec", state.personSec);
  if (state.group && state.person) p.set("knew", "1");
  if (state.q) p.set("q", state.q);
  if (state.person) p.set("who", state.person);
  // the place tapped and the person card open, so a reload, a shared link and the back button come back
  // to them; while one is still waiting for its file, the URL keeps asking for it
  if (openPlace || pendingPlace) p.set("place", openPlace || pendingPlace);
  if (openCard || pendingCard) p.set("card", openCard || pendingCard);
  if (state.colorBy !== "dom") p.set("by", state.colorBy);
  if (tableOn) p.set("view", "table");
  if (topOn) p.set("view", "top");
  if (tlChosen && (state.yearMin > TL_MIN || state.yearMax < TL_MAX))
    p.set("yr", `${state.yearMin},${state.yearMax}`);
  // NOT `near`. Everything else about the view belongs in the URL; where the reader is standing
  // does not. A shared link, a screenshot of the address bar, a browser history synced to another
  // machine: each would be carrying somebody's location to somewhere they never sent it. The
  // location is live, it is theirs, and it is re-asked for every time.
  // The fold is remembered only when it disagrees with what this screen would have done, so the
  // same link opens sensibly on a phone and on a laptop.
  const folded = document.body.classList.contains("folded");
  if (!folded) p.set("fold", "0");
  // While the blue dot is on, the map is centred on the reader, so the map's centre IS their
  // location. The URL keeps the view from before they pressed the button (D17: the view belongs in
  // the URL, the reader's position never does).
  if (meWatch != null && urlViewBeforeMe) p.set("m", urlViewBeforeMe);
  else {
    const c = map.getCenter();
    p.set("m", `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${map.getZoom()}`);
  }
  return p.toString();
}

/* THE BACK BUTTON UNDOES (0.26.2). Víctor, 2026-09-14, from Batalla de Flores: people press back a lot,
 * so each ACTION must be a step in the history and back must undo it instead of leaving the site.
 * An action is anything that changes the URL other than the map's position: a filter, a card opened
 * or closed, a place tapped, the table, the fold. Those PUSH a step. Moving the map REPLACES the
 * current step (a hundred pans are not a hundred backs), and so do the continuous gestures: typing in
 * the filter (each letter extends the last) and dragging the timeline (one step per drag). */
let lastYrChange = 0, replaceUntil = 0;
function syncURL() {
  if (!urlBooted) return;             // never write the home view over the link being restored
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => {
    const qs = viewToURL();
    const now = new URLSearchParams(qs), was = new URLSearchParams(location.search);
    now.delete("m"); was.delete("m");
    const changed = [...new Set([...now.keys(), ...was.keys()])].filter((k) => now.get(k) !== was.get(k));
    let push = changed.length > 0;
    if (push && changed.every((k) => k === "q")) {
      const a = was.get("q") || "", b = now.get("q") || "";
      // still typing: one letter more or fewer. Starting a search and clearing it are steps.
      if (a && b && (a.startsWith(b) || b.startsWith(a))) push = false;
    }
    if (changed.includes("yr")) {
      if (changed.length === 1 && Date.now() - lastYrChange < 1500) push = false;   // still dragging
      lastYrChange = Date.now();
    }
    // Restoring a step (the back button itself) must never write a new one.
    if (Date.now() < replaceUntil) push = false;
    const url = location.pathname + (qs ? "?" + qs : "") + location.hash;
    if (push) history.pushState(null, "", url); else history.replaceState(null, "", url);
  }, 250);
}

/* Read a URL back into the view. Runs at boot and on `popstate` (the phone's back button, and the
 * gesture that restores an evicted tab). Everything it touches is also touched by hand somewhere
 * else in this file, so it sets the STATE and then the controls that display it: never the other
 * way round. */
function applyURL() {
  const p = new URLSearchParams(location.search);
  for (const fam of URL_FAMS) {
    const v = VOCAB[fam];
    if (!v) continue;
    if (!p.has(fam)) { v.forEach((_, i) => { state[fam][i] = true; }); continue; }
    const on = new Set(p.get(fam) === "none" ? [] : p.get(fam).split(","));
    v.forEach((name, i) => { state[fam][i] = on.has(name); });
  }
  // "500-here", "100-world", "0"; an old link's bare "100" was the world's hundred
  if (p.has("top")) {
    const [n, w] = p.get("top").split("-");
    state.topN = +n || 0; state.topWhere = w === "here" ? "here" : "world";
  } else { state.topN = TOP_DEFAULT; state.topWhere = "here"; }
  state.personSec = p.get("whosec") || null;
  state.group = null; pendingKnew = p.get("knew") === "1" && !!p.get("who");
  state.q = deacc(p.get("q") || "");
  state.person = p.get("who") || null;
  pendingCard = p.get("card") || null;          // opened once its person has arrived (tryPendingCard)
  pendingPlace = p.get("place") || null;
  if (pendingCard === openCard) pendingCard = null;
  // (a place already chosen is revealed again all the same: the list was redrawn from the top)
  // a step back to where no card was open closes it; to where no place was chosen unselects it
  if (!p.get("card") && openCard) closeSheet();
  if (!p.get("place") && openPlace) {
    openPlace = null; selectedSite = null;
    if ($("sheet").dataset.kind === "place") closeSheet();
  }
  state.colorBy = ["dom", "verb", "access"].includes(p.get("by")) ? p.get("by") : "dom";
  if (state.person) {
    const rows = byPerson.get(state.person);
    state.personName = rows && rows.length ? rows[0].name : state.person;
  } else state.personName = "";
  const yr = (p.get("yr") || "").split(",").map(Number);
  if (yr.length === 2 && yr.every(Number.isFinite)) {
    state.yearMin = yr[0]; state.yearMax = yr[1]; tlChosen = true;
    $("tl-min").value = yr[0]; $("tl-max").value = yr[1];
  } else if (urlBooted && tlChosen) {
    // a step back to where no years were chosen (the contemporaries mode, a timeline drag) clears them
    tlChosen = false; contemporaryOf = null;
    buildTimeline(TL_MIN, TL_MAX);
  }
  if (!p.has("yr")) contemporaryOf = null;

  // and now the controls that show all that
  $("filter").value = p.get("q") || "";
  $("filter-clear").hidden = !$("filter").value;
  paintRenown();
  const openAir = VOCAB.access.indexOf("open-air");
  $("preset-now").classList.toggle("active",
    openAir >= 0 && VOCAB.access.every((_, i) => (state.access[i] !== false) === (i === openAir)));
  $("preset-was").classList.toggle("active",
    VOCAB.verb.every((v, i) => VERBS_PRESENT.includes(v) === (state.verb[i] !== false)));
  if (p.has("fold")) document.body.classList.toggle("folded", p.get("fold") === "1");
  setTable(p.get("view") === "table");
  // Top people is a step too: back from it returns to the map, forward reopens it
  if ((p.get("view") === "top") !== topOn) setTop(p.get("view") === "top");

  const m = (p.get("m") || "").split(",").map(Number);
  return m.length === 3 && m.every(Number.isFinite) ? [[m[0], m[1]], m[2]] : null;
}

// The back button, and the moment a phone hands an evicted tab back. Rebuilding the pins is not
// optional: `colorBy` decides what the icons are made of.
window.addEventListener("popstate", () => {
  if (!VOCAB.what) return;
  replaceUntil = Date.now() + 1200;
  const where = applyURL();
  if (where) map.setView(where[0], where[1], { animate: false });
  buildPlaces();
  refresh();
  tryPendingCard();
});

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
    // Before the first draw, and before buildPlaces: `colorBy` decides what the pins are made of,
    // and a link that asked for "colour by what they did" must not draw one frame in profession
    // colours first. applyURL hands back where the map should be, or null for the home view.
    const bootView = applyURL();
    urlBooted = true;
    buildPlaces();
    // ORDER MATTERS. Leaflet is built before the flex layout exists and measures itself 0×0.
    // MarkerCluster indexes what it is given at the map's CURRENT size and zoom, so adding 47 000
    // markers while the map still thinks it is 0×0 collapses every one of them into a single
    // "999+" bubble in the middle of the screen. Measure first, insert second.
    // Twice on purpose. The first call is for the common case; the second runs after the browser
    // has laid out and painted once, which is when the map's box is final. A single call at boot
    // landed on a 0×0 map and drew an empty world, and since the box never changed again
    // afterwards, the ResizeObserver below had nothing to react to and it stayed empty.
    // refresh() is under 200 ms now, so paying for it twice at boot costs nothing.
    //
    // And the view is re-set each time: `pan: false` keeps the map's top-LEFT pixel fixed, so
    // resizing from 0×0 to 940×464 slides the centre by half the new size: the atlas opened over
    // Kuwait. Only at boot; a later resize must not yank the reader back to the home view.
    const settle = () => {
      map.invalidateSize({ pan: false });
      // The view the link asked for, or home. Re-set on every settle for the same reason home was:
      // `pan: false` keeps the top-LEFT pixel fixed, so growing from 0×0 slides the centre by half
      // the new size and the atlas opens somewhere nobody asked for.
      if (bootView) map.setView(bootView[0], bootView[1], { animate: false });
      else map.setView(HOME, HOME_ZOOM, { animate: false });
      refresh();
    };
    settle();
    requestAnimationFrame(settle);
    tryPendingCard();
    // Warm the record card's side file once the map is up: 1.4 MB fetched while nobody is waiting
    // beats 1.4 MB fetched at the moment somebody clicks.
    setTimeout(() => needPeople(() => {}), 1200);
    // Hours are fetched per card, from culture/data/hrs/ (build_hours.py). Nothing at boot.

    // The long tail, once the map is up and the reader is already looking at something. Nobody
    // waits for it, and the stats line says it is coming rather than quietly under-reporting.
    // THE LONG TAIL WHEN IT IS WANTED (0.27): the base is the atlas at country scale; the long tail (graves
    // of the less known, OpenStreetMap, events: ~20 MB) used to follow 2.5 s after every visit. Now it comes
    // the first time the reader zooms to region scale, searches, opens the table, needs a card or a link
    // that lives in it, or after 25 s on the page. The stats line says it is coming meanwhile.
    // 0.28 · THE LONG TAIL BY AREA. The less known used to be one file (20 MB by now); it is cut into 10° squares
    // (build.py) and the map asks for the squares on screen once it is at region scale. Everything at once only
    // when something needs the whole atlas: a search, the table, the top-people panel, a card or link to
    // somebody not loaded yet. OpenStreetMap and the events still come whole, with the first square.
    if (d.deepTiles) {
      // squares of two folders: the long tail, and the museums only OpenStreetMap knows (0.28, ODbL)
      const step = d.deepTiles.step, got = new Map();
      const avail = new Set([...Object.keys(d.deepTiles.tiles).map((t) => "deep/" + t),
                             ...Object.keys((d.osmMuseumTiles || {}).tiles || {}).map((t) => "osm-museums/" + t)]);
      longTailWaiting = true;
      const cards = (name) => fetch(`culture/data/${name}?v=${DATA_V}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((more) => { if (more) needPeople(() => Object.assign(PEOPLE, more.p || {})); })
        .catch(() => {});
      const settleIn = () => {
        indexPeople();
        const years = TRACES.map((r) => r.died ?? r.born).filter((y) => y != null).sort((a, b) => a - b);
        if (years.length) buildTimeline(years[Math.floor(years.length * 0.01)], years.at(-1));
        buildPlaces();
        refresh();
        tryPendingCard();         // a ?card= person who lives in the long tail arrives here
        // the open card may have just gained traces, or people it knew: redraw it in place
        if (openCard && !$("sheet").hidden && (byPerson.get(openCard) || []).length !== openCardRows) openPerson(openCard, true);
        else { const kb = document.querySelector("#sheet-body .sh-knew"); if (kb) fillKnew(kb); }
      };
      let settleTimer = 0;
      const settleSoon = () => { clearTimeout(settleTimer); settleTimer = setTimeout(settleIn, 200); };
      const done = () => {
        if ([...avail].every((t) => got.has(t)) && moreDone) { deepState = "loaded"; settleSoon(); }
      };
      let moreStarted = false, moreDone = false;
      const startMore = () => {
        if (moreStarted) return;
        moreStarted = true;
        cards("people-deep.json");
        const more = (d.more || []).slice();
        const next = () => {
          const f = more.shift();
          if (!f) { moreDone = true; done(); return; }
          fetch("culture/data/" + f + "?v=" + DATA_V)
            .then((r) => (r.ok ? r.json() : null))
            // a file names its own card file, if it has people
            .then((x) => { if (x) { absorb(x); if (x.people) cards(x.people); settleSoon(); } })
            .catch(() => {})
            .finally(next);
        };
        next();
      };
      const loadTile = (t) => {
        if (!avail.has(t) || got.has(t)) return;
        deepState = "loading";
        got.set(t, fetch(`culture/data/${t}.json?v=${DATA_V}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((x) => { if (x) absorb(x); settleSoon(); })
          .catch(() => {})
          .finally(() => { if (deepState === "loading" && [...got.values()].length) deepState = "partial"; done(); }));
      };
      const tilesOnScreen = () => {
        const b = map.getBounds().pad(0.2), out = [];
        const norm = (i) => ((i + 18) % 36 + 36) % 36 - 18;   // a view across the date line wraps
        for (let la = Math.floor(b.getSouth() / step); la <= Math.floor(b.getNorth() / step); la++)
          for (let lo = Math.floor(b.getWest() / step); lo <= Math.floor(b.getEast() / step); lo++)
            out.push(`deep/${la}_${norm(lo)}`, `osm-museums/${la}_${norm(lo)}`);
        return out;
      };
      loadHere = () => { if (map.getZoom() < 6) return; startMore(); tilesOnScreen().forEach(loadTile); };
      startLongTail = () => { startMore(); [...avail].forEach(loadTile); };
      map.on("moveend", loadHere);
      $("filter").addEventListener("input", () => startLongTail(), { once: true });
      if (pendingCard || pendingPlace || tableOn || state.person || state.q) startLongTail(); else loadHere();
    }

    // And keep measuring: a ResizeObserver fires exactly when the box changes (first layout,
    // window resize, phone rotation, the panel folding away) where a timer only guesses, and lost
    // that race about half the time. `pan: false` because the default pans by half the size
    // difference, which from 0×0 is a 470 px shove that moves the map off centre.
    let rTimer = null;
    new ResizeObserver(() => {
      clearTimeout(rTimer);
      rTimer = setTimeout(() => {
        if (!document.getElementById("map").clientHeight || window.panelDragging) return;
        map.invalidateSize({ pan: false });
        refresh();
      }, 60);
    }).observe(document.getElementById("map"));
  })
  .catch((e) => banner("Could not load the atlas data: " + e.message));
