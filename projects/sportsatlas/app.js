/* Sports Atlas · static app. Two sports that never share a screen, a table as the spine, a card beside it,
   the map as one view among others. Data built by scripts/build.py into sportsatlas/data/. */
"use strict";

const DATA_V = "0.9.0";
const BUILD_AT = "2026-09-25 22:12";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = s => String(s || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const fmt = n => (n ?? 0).toLocaleString("en-GB");
const WIKI = t => "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(t).replace(/ /g, "_"));
const WAR = [[1914, 1918, "First World War"], [1939, 1945, "Second World War"]];

document.querySelector(".brand").addEventListener("click", e => {
  e.preventDefault();
  history.replaceState(null, "", location.pathname);
  location.reload();
});

/* ------------------------------------------------------------------ data */

const D = { football: {}, tennis: {}, olympics: {} };   // per sport: idx, comp, ed, venue, matches, players, teams
const cache = {};

async function getJSON(path) {
  if (!cache[path]) {
    cache[path] = fetch(`sportsatlas/data/${path}?v=${DATA_V}`).then(r => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    });
  }
  return cache[path];
}
const edition = id => getJSON(`editions/${id}.json`);

function unpack(p) {
  return p.rows.map(r => r.map((v, i) => (p.cols[i] === "s" && typeof v === "number") ? p.words[v] : v));
}

// flags and crests (R48): a flag by the name a team or a country is shown under, a crest by club page
let IMG = { flag: {}, crest: {}, pictogram: {}, ioc: {} };
const SHOW_IMAGES = true;  // one switch to take every flag and crest off the web
const imgFor = key => {
  if (!SHOW_IMAGES || !key) return "";
  const src = key.startsWith("club:") ? IMG.crest[key] : IMG.flag[key.replace(/^nat:/, "")];
  return src ? `<img class="badge${key.startsWith("club:") ? " crest" : ""}" src="sportsatlas/${src}" alt="" loading="lazy">` : "";
};
async function loadIndex(sport) {
  const d = D[sport];
  // the flags every table needs come first; crests and the Olympic images only with the sport that draws them
  if (!IMG.loaded) { IMG = { ...IMG, ...await getJSON("images.json").catch(() => ({})) }; IMG.loaded = true; }
  if (sport === "football" && !IMG.crestLoaded) { IMG.crest = (await getJSON("images-crests.json").catch(() => ({}))).crest || {}; IMG.crestLoaded = true; }
  if (sport === "olympics" && !IMG.olyLoaded) { Object.assign(IMG, await getJSON("images-olympics.json").catch(() => ({}))); IMG.olyLoaded = true; }
  if (d.idx) return d;
  d.idx = await getJSON(`${sport}/index.json`);
  d.comp = Object.fromEntries((d.idx.competitions || d.idx.sports || []).map(c => [c.id, c]));
  d.ed = Object.fromEntries(d.idx.editions.map(e => [e.id, e]));
  d.venue = Object.fromEntries(d.idx.venues.map(v => [v.id, v]));
  return d;
}
async function loadMatches(sport) {
  const d = D[sport];
  if (d.matches) return d.matches;
  const files = sport === "football" ? d.idx.competitions.map(c => `football/matches-${c.id}.json`)
    : ["slams", "masters", "atp500", "finals", "olympics", "slams_w", "wta1000", "wta_finals", "olympics_w"].map(x => `tennis/matches-${x}.json`);
  const packs = await Promise.all(files.map(f => getJSON(f).catch(() => ({ words: [], cols: [], rows: [] }))));
  d.matches = packs.flatMap(unpack).filter(r => d.ed[r[0]]);
  return d.matches;
}
async function loadPlayers(sport) {
  const d = D[sport];
  if (!d.players) d.players = await getJSON(`${sport}/players.json`);
  return d.players;
}
async function loadTeams() {
  const d = D.football;
  if (!d.teams) d.teams = await getJSON("football/teams.json");
  return d.teams;
}

/* ------------------------------------------------------------------ state ⇄ address */

const FOOTBALL_GROUPS = { national: ["worldcup", "euro"], international: ["ucl", "uel", "cwc", "fairs"], leagues: ["laliga", "premier"] };
const FOOTBALL_GROUP_NAME = c => FOOTBALL_GROUPS.national.includes(c) ? "National teams" : FOOTBALL_GROUPS.international.includes(c) ? "Clubs · international" : "Clubs · national";
const VIEWS = {
  football: [["matches", "Matches"], ["editions", "Tournaments & seasons"], ["teams", "Teams"], ["players", "Players"], ["map", "Map"]],
  tennis: [["matches", "Matches"], ["editions", "Editions"], ["players", "Players"], ["map", "Map"]],
  olympics: [["editions", "Games"], ["sports", "Sports"], ["countries", "Countries"], ["athletes", "Medallists"], ["map", "Map"]],
};
const S = { sport: "football", g: "m", page: "", view: "editions", comps: new Set(), rounds: new Set(), surf: new Set(), ed: "", y0: null, y1: null, q: "", sort: null, open: "", limit: 300 };

function readHash() {
  const [path, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const [sport, view] = path.split("/");
  const p = new URLSearchParams(query);
  S.sport = ["tennis", "olympics"].includes(sport) ? sport : "football";
  S.view = VIEWS[S.sport].some(v => v[0] === view) ? view : "editions";
  S.comps = new Set((p.get("c") || "").split(",").filter(Boolean));
  S.rounds = new Set((p.get("r") || "").split(",").filter(Boolean));
  S.surf = new Set((p.get("sf") || "").split(",").filter(x => SURF[x]));
  const y = (p.get("y") || "").split("-").map(Number);
  S.y0 = y[0] || null; S.y1 = y[1] || null;
  S.q = p.get("q") || "";
  const s = p.get("s");
  S.sort = s ? { key: s.replace(/-$/, ""), dir: s.endsWith("-") ? -1 : 1 } : null;
  S.open = p.get("o") || "";
  S.page = p.get("p") || "";
  S.ed = p.get("e") || "";
  S.g = p.get("g") === "w" ? "w" : "m";
}
/* Moves (a card, a view, a sport) add a step to the browser's history, so Back returns to where you were;
   refinements (filters, sort, "show more") replace the current step. */
let navDepth = 0, pushNext = false;
function writeHash(push = false) {
  const p = new URLSearchParams();
  if (S.comps.size) p.set("c", [...S.comps].join(","));
  if (S.rounds.size) p.set("r", [...S.rounds].join(","));
  if (S.sport === "tennis" && S.surf.size) p.set("sf", [...S.surf].join(","));
  if (S.y0 || S.y1) p.set("y", `${S.y0 || ""}-${S.y1 || ""}`);
  if (S.q) p.set("q", S.q);
  if (S.sort) p.set("s", S.sort.key + (S.sort.dir < 0 ? "-" : ""));
  if (S.ed) p.set("e", S.ed);
  if (S.sport === "tennis" && S.g === "w") p.set("g", "w");
  if (S.page) p.set("p", S.page);
  if (S.open) p.set("o", S.open);
  const q = p.toString().replace(/%2C/g, ",");
  const url = `#${S.sport}/${S.view}${q ? "?" + q : ""}`;
  if (push && url !== location.hash) { history.pushState({ depth: navDepth + 1 }, "", url); navDepth++; }
  else history.replaceState({ depth: navDepth }, "", url);
  $("#rec-back").hidden = navDepth === 0;
}

const inYears = y => (!S.y0 || y >= S.y0) && (!S.y1 || y <= S.y1);
// tennis shows one tour at a time: men's or women's singles (S.g), never both in one table
const genderOn = c => S.sport !== "tennis" || !!(D.tennis.comp && D.tennis.comp[c] && D.tennis.comp[c].women) === (S.g === "w");
const compOn = c => genderOn(c) && (!S.comps.size || S.comps.has(c));
// the court: a family read from each edition's page (or Jeff Sackmann's file where the page gives none)
const SURF = { clay: "Clay", grass: "Grass", hard: "Hard", carpet: "Carpet", wood: "Wood" };
const surfOn = e => S.sport !== "tennis" || !S.surf.size || (e && S.surf.has(e.surf));
const surfPill = (e, long) => e && e.surf ? `<span class="surf s-${e.surf}" title="${esc(e.surface || SURF[e.surf])}${e.surf_basis === "tennis_atp" ? " (from Jeff Sackmann's tennis_atp: the page gives none)" : ""}">${SURF[e.surf]}${e.indoor ? (long ? " · indoor" : " (i)") : ""}</span>` : "";
// the tier of a tennis competition, as a badge: a Grand Slam, a 1000, a 500, the Finals, the Olympics
const TIER = { slam: ["Grand Slam", "gs", 0], slam_w: ["Grand Slam", "gs", 0], masters: ["1000", "k1", 1], wta1000: ["1000", "k1", 1], atp500: ["500", "k5", 2],
  finals: ["Finals", "fin", 3], finals_w: ["Finals", "fin", 3], olympics: ["Olympics", "oly", 4], olympics_w: ["Olympics", "oly", 4] };
const tierOf = c => TIER[(D.tennis.comp && D.tennis.comp[c] || {}).group];
const tierBadge = c => { const t = tierOf(c); return t ? `<span class="tier ${t[1]}">${t[0]}</span>` : ""; };

/* ------------------------------------------------------------------ chrome */

$("#sport-tabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.dataset.sport === S.sport) return;
  S.sport = b.dataset.sport; S.comps.clear(); S.rounds.clear(); S.sort = null; S.open = ""; S.page = ""; S.q = ""; S.limit = 300;
  if (!VIEWS[S.sport].some(v => v[0] === S.view)) S.view = "editions";
  pushNext = true; render();
});
$("#gender").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b || b.dataset.g === S.g) return;
  S.g = b.dataset.g; S.page = ""; S.comps.clear(); S.rounds.clear(); S.sort = null; S.limit = 300;
  pushNext = true; render();
});
$("#view-tabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  S.view = b.dataset.view; S.page = ""; S.sort = null; S.limit = 300; S.rounds.clear();
  pushNext = true; render();
});
let qTimer;
$("#q").addEventListener("input", e => { clearTimeout(qTimer); qTimer = setTimeout(() => { S.q = e.target.value.trim(); S.page = ""; S.limit = 300; render(); }, 140); });
for (const id of ["y0", "y1"]) {
  $("#" + id).addEventListener("change", e => { S[id] = +e.target.value || null; S.limit = 300; render(); });
}
$("#facets").addEventListener("click", e => {
  const b = e.target.closest("[data-f]"); if (!b) return;
  const set = b.dataset.f === "c" ? S.comps : b.dataset.f === "sf" ? S.surf : S.rounds;
  const vals = b.dataset.v.split(",");
  const on = vals.every(v => set.has(v));
  if (e.altKey || e.metaKey) { set.clear(); vals.forEach(v => set.add(v)); }
  else vals.forEach(v => on ? set.delete(v) : set.add(v));
  S.page = ""; S.limit = 300; render();
});
$("#active").addEventListener("click", e => {
  const b = e.target.closest("button[data-clear]"); if (!b) return;
  const k = b.dataset.clear;
  if (k === "q") { S.q = ""; $("#q").value = ""; }
  if (k === "y") { S.y0 = S.y1 = null; }
  if (k === "c") S.comps.clear();
  if (k === "r") S.rounds.clear();
  if (k === "sf") S.surf.clear();
  if (k === "e") S.ed = "";
  render();
});
$("#more").addEventListener("click", () => { S.limit += 600; renderTable(); });

function chrome() {
  const d = D[S.sport];
  document.body.classList.toggle("tennis", S.sport === "tennis");
  $$("#sport-tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.sport === S.sport));
  $("#gender").hidden = S.sport !== "tennis";
  $("#gender").innerHTML = [["m", "Men"], ["w", "Women"]].map(([k, l]) => `<button data-g="${k}" aria-pressed="${S.g === k}">${l}</button>`).join("");
  $("#view-tabs").innerHTML = VIEWS[S.sport].map(([k, l]) => `<button data-view="${k}" aria-pressed="${k === S.view}">${l}</button>`).join("");
  // rewrite the box only when the search really changed: "Real " typed must keep its space for the next letter
  if ($("#q").value.trim() !== S.q) $("#q").value = S.q;
  $("#q").placeholder = S.sport === "tennis" ? "Filter by player or tournament"
    : S.sport === "olympics" ? "Filter by Games, host, sport or committee" : "Filter by team, player, tournament";
  const years = d.idx.editions.map(e => e.year);
  $("#y0").placeholder = Math.min(...years); $("#y1").placeholder = Math.max(...years);
  $("#y0").value = S.y0 || ""; $("#y1").value = S.y1 || "";
  const eds = d.idx.editions;
  const matches = eds.reduce((a, e) => a + (e.matches || 0), 0);
  $("#totals").innerHTML = S.sport === "football"
    ? `<b>${fmt(matches)}</b> matches · <b>${fmt(eds.length)}</b> tournaments and seasons`
    : S.sport === "olympics"
      ? `<b>${fmt(eds.filter(e => e.held).length)}</b> Games · <b>${fmt(eds.reduce((a, e) => a + (e.events || 0), 0))}</b> events · <b>${fmt((d.idx.sports || []).length)}</b> disciplines`
      : `<b>${fmt(matches)}</b> matches · <b>${fmt(eds.length)}</b> editions`;

  // facets: competitions, then rounds for the match table
  const count = c => eds.filter(e => e.comp === c && inYears(e.year)).length;
  const setOf = f => f === "c" ? S.comps : f === "sf" ? S.surf : S.rounds;
  const chip = (f, v, label, n, cls = "") => `<span class="chip${cls ? " " + cls : ""}" role="button" tabindex="0" data-f="${f}" data-v="${esc(v)}" aria-pressed="${v.split(",").every(x => setOf(f).has(x))}">${esc(label)}${n != null ? ` <span class="n">${fmt(n)}</span>` : ""}</span>`;
  let h = "";
  if (S.sport === "olympics") {
    // the Games need no competition chips: a discipline is a row of its own table, and the years narrow the rest
    h = "";
  } else if (S.sport === "football") {
    // national teams, then clubs: their international cups, then their national leagues
    const grp = (label, ids) => `<div class="fg">${chip("c", ids.join(","), label)}${ids.map(c => chip("c", c, d.comp[c].short, count(c))).join("")}</div>`;
    h += grp("National teams", FOOTBALL_GROUPS.national) + `<span class="chip-sep"></span>`;
    h += grp("Clubs · international", FOOTBALL_GROUPS.international) + `<span class="chip-sep"></span>`;
    h += grp("Clubs · national", FOOTBALL_GROUPS.leagues);
    if (S.view === "matches") {
      h += `<span class="chip-sep"></span><div class="fg"><span class="lbl">Stage</span>${[["Final", "Final"], ["Semi-finals", "Semi-finals"], ["Quarter-finals", "Quarter-finals"], ["Round of 16", "Earlier knockout rounds"], ["Groups", "Groups and league phase"], ["League", "League"]].map(([r, l]) => chip("r", r, l)).join("")}</div>`;
    }
  } else {
    const w = S.g === "w";
    const slams = d.idx.competitions.filter(c => c.group === (w ? "slam_w" : "slam")), masters = d.idx.competitions.filter(c => c.group === (w ? "wta1000" : "masters"));
    const other = d.idx.competitions.filter(c => w ? (c.group === "finals_w" || c.group === "olympics_w") : (c.group === "finals" || c.group === "olympics"));
    // the courts first: they are also the key to the timeline's colours
    const surfN = f => eds.filter(e => e.surf === f && genderOn(e.comp) && (!S.comps.size || S.comps.has(e.comp)) && inYears(e.year)).length;
    h += `<div class="fg">${["clay", "grass", "hard", "carpet"].filter(f => surfN(f)).map(f => chip("sf", f, SURF[f], surfN(f), "surfchip s-" + f)).join("")}</div><span class="chip-sep"></span>`;
    h += `<div class="fg">${chip("c", slams.map(c => c.id).join(","), "Grand Slams", null, "tierchip gs")}${slams.map(c => chip("c", c.id, c.short, count(c.id))).join("")}</div><span class="chip-sep"></span>`;
    h += `<div class="fg">${chip("c", masters.map(c => c.id).join(","), w ? "WTA 1000" : "Masters 1000", null, "tierchip k1")}${masters.filter(c => count(c.id)).map(c => chip("c", c.id, c.short, count(c.id))).join("")}</div>`;
    const five = w ? [] : d.idx.competitions.filter(c => c.group === "atp500");
    if (five.length) h += `<span class="chip-sep"></span><div class="fg">${chip("c", five.map(c => c.id).join(","), "ATP 500", null, "tierchip k5")}${five.filter(c => count(c.id)).map(c => chip("c", c.id, c.short, count(c.id))).join("")}</div>`;
    h += `<span class="chip-sep"></span><div class="fg"><span class="lbl">Also</span>${other.map(c => chip("c", c.id, c.short, count(c.id))).join("")}</div>`;
    if (S.view === "matches") {
      h += `<span class="chip-sep"></span><div class="fg"><span class="lbl">Round</span>${["Final", "Semifinals", "Quarterfinals", "Earlier"].map(r => chip("r", r, r)).join("")}</div>`;
    }
  }
  $("#facets").innerHTML = h;

  const act = [];
  if (S.q) act.push(`<span class="mchip">“${esc(S.q)}”<button data-clear="q" aria-label="Clear">×</button></span>`);
  if (S.y0 || S.y1) act.push(`<span class="mchip">${S.y0 || "…"}–${S.y1 || "…"}<button data-clear="y" aria-label="Clear">×</button></span>`);
  if (S.comps.size) act.push(`<span class="mchip">${S.comps.size} competition${S.comps.size > 1 ? "s" : ""}<button data-clear="c" aria-label="Clear">×</button></span>`);
  if (S.ed && d.ed[S.ed]) act.push(`<span class="mchip">${esc(d.ed[S.ed].title)}<button data-clear="e" aria-label="Clear">×</button></span>`);
  if (S.rounds.size) act.push(`<span class="mchip">${[...S.rounds].join(", ")}<button data-clear="r" aria-label="Clear">×</button></span>`);
  if (S.sport === "tennis" && S.surf.size) act.push(`<span class="mchip">${[...S.surf].map(x => SURF[x].toLowerCase()).join(", ")}<button data-clear="sf" aria-label="Clear">×</button></span>`);
  $("#active").innerHTML = act.join("");
}

/* ------------------------------------------------------------------ table machinery */

let current = { cols: [], rows: [] };

function stageGroup(stage) {
  const s = (stage || "").toLowerCase();
  if (s === "league") return "League";
  if (/league phase|group/.test(s)) return "Groups";
  if (/play-?off|preliminary|first round|second round|third round|round of (16|32)|intermediate/.test(s)) return "Round of 16";
  if (/semi/.test(s)) return "Semi-finals";
  if (/quarter/.test(s)) return "Quarter-finals";
  if (/round of 16|second round|round of 32|first round/.test(s)) return "Round of 16";
  if (/^final$/.test(s)) return "Final";
  if (/third/.test(s)) return "Third place";
  return "Groups";
}
function roundGroup(rank, name) { if (name === "Round robin") return "Earlier"; return rank === 0 ? "Final" : rank === 1 ? "Semifinals" : rank === 2 ? "Quarterfinals" : "Earlier"; }

const th = c => `<th data-k="${c.k}" class="${c.num ? "num" : ""} ${c.hide ? "hide-s" : ""}">${c.l}${S.sort && S.sort.key === c.k ? ` <span class="dir">${S.sort.dir > 0 ? "▲" : "▼"}</span>` : ""}</th>`;
$("#table").addEventListener("click", e => {
  const h = e.target.closest("th[data-k]");
  if (h) {
    const k = h.dataset.k;
    S.sort = S.sort && S.sort.key === k ? { key: k, dir: -S.sort.dir } : { key: k, dir: current.cols.find(c => c.k === k)?.num ? -1 : 1 };
    renderTable(); writeHash(); return;
  }
  if (filterClick(e)) return;
  const go = e.target.closest("[data-open]");
  if (go) { e.stopPropagation(); openCard(go.dataset.open); return; }
  const tr = e.target.closest("tr[data-row]");
  if (tr) openCard(tr.dataset.row);
});

function renderTable() {
  const { cols, rows } = current;
  let list = rows;
  if (S.sort) {
    const c = cols.find(x => x.k === S.sort.key);
    if (c) {
      const get = c.s || c.v;
      list = [...rows].sort((a, b) => {
        const x = get(a), y = get(b);
        if (x == null && y == null) return 0;
        if (x == null) return 1;
        if (y == null) return -1;
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * S.sort.dir;
      });
    }
  }
  const shown = list.slice(0, S.limit);
  $("#table").innerHTML = rows.length
    ? `<thead><tr>${cols.map(th).join("")}</tr></thead><tbody>${shown.map(r => `<tr data-row="${esc(current.open(r))}">${cols.map(c => `<td class="${c.cls || ""} ${c.hide ? "hide-s" : ""}">${c.r ? c.r(r) : esc(c.v(r) ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>`
    : `<tbody><tr><td class="empty">Nothing matches these filters.</td></tr></tbody>`;
  $("#more").hidden = list.length <= S.limit;
  $("#more").textContent = `Show more · ${fmt(list.length - S.limit)} left`;
  $("#count").innerHTML = `<b>${fmt(list.length)}</b> ${list.length === 1 || current.noun.endsWith("s") ? current.noun : current.noun.replace(/(ch)$/, "$1e") + "s"}${current.note ? ` · ${current.note}` : ""}`;
}

/* Two kinds of link besides opening a card: a competition name narrows the table to that competition, a country
   (or any plain value marked data-q) becomes the filter text. */
function filterClick(e) {
  const m = e.target.closest("[data-matches]");
  if (m) { e.preventDefault(); e.stopPropagation(); S.page = ""; S.open = ""; S.view = "matches"; S.ed = m.dataset.matches; S.comps.clear(); S.rounds.clear(); S.y0 = S.y1 = null; S.q = ""; S.sort = null; S.limit = 300; pushNext = true; render(); return true; }
  // a fact that opens the table on exactly those matches: {"q": name, "comps": [...], "rounds": [...]}
  const tb = e.target.closest("[data-table]");
  if (tb) {
    e.preventDefault(); e.stopPropagation();
    const f = JSON.parse(tb.dataset.table);
    S.page = ""; S.open = ""; S.view = "matches"; S.ed = ""; S.y0 = S.y1 = null; S.sort = null; S.limit = 300;
    S.q = f.q || ""; S.comps = new Set(f.comps || []); S.rounds = new Set(f.rounds || []); S.surf = new Set(f.surf || []);
    if (f.g) S.g = f.g;
    pushNext = true; render(); return true;
  }
  // a fact that unfolds its list in place
  const fb = e.target.closest("[data-fact]");
  if (fb) {
    e.preventDefault(); e.stopPropagation();
    const root = fb.closest("#page-body, #rec-body");
    const panel = root && root.querySelector(`.fact-panel[data-for="${fb.dataset.fact}"]`);
    const open = panel && panel.hidden;
    root.querySelectorAll(".fact-panel").forEach(x => { x.hidden = true; });
    root.querySelectorAll("[data-fact]").forEach(x => x.setAttribute("aria-pressed", "false"));
    if (panel && open) { panel.hidden = false; fb.setAttribute("aria-pressed", "true"); }
    return true;
  }
  const c = e.target.closest("[data-comp]");
  if (c) { e.preventDefault(); e.stopPropagation(); S.page = ""; S.comps = new Set([c.dataset.comp]); S.limit = 300; render(); return true; }
  const q = e.target.closest("[data-q]");
  if (q) { e.preventDefault(); e.stopPropagation(); S.page = ""; S.q = q.dataset.q; S.limit = 300; render(); return true; }
  return false;
}
const compLnk = (d, id) => `<button class="lnk f" data-open="comp:${esc(id)}" title="${esc(d.comp[id]?.name || id)}">${esc(d.comp[id]?.short || id)}</button>`;
const edLnk = (d, id, cls = "") => d.ed[id] ? `<button class="lnk ${cls}" data-open="edition:${esc(id)}"${d.ed[id].name_then && !d.ed[id].title.includes(d.ed[id].name_then) ? ` title="Played as ${esc(d.ed[id].name_then)}"` : ""}>${esc(d.ed[id].title)}</button>` : esc(id);
// every word of the search in one of the names: "Federer Wimbledon", "Real Madrid"
const hit = (...names) => {
  if (!S.q) return true;
  const hay = names.map(fold);
  return fold(S.q).split(/\s+/).filter(Boolean).every(w => hay.some(n => n.includes(w)));
};
const lnk = (open, text, cls = "") => `<button class="lnk ${cls}" data-open="${esc(open)}">${open.startsWith("team:") ? imgFor(open.slice(5)) : ""}${esc(text)}</button>`;

/* ------------------------------------------------------------------ views */

async function render() {
  await loadIndex(S.sport);
  chrome();
  writeHash(pushNext); pushNext = false;
  const d = D[S.sport];
  const isMap = S.view === "map";
  $("#scroll").hidden = isMap;
  $("#mapview").hidden = !isMap;
  $("#tl-wrap").hidden = S.view !== "editions";
  $("#tl-key").hidden = !["editions", "map"].includes(S.view);
  if (isMap) { $("#count").innerHTML = ""; await renderMap(); }
  else {
    $("#count").textContent = "Loading…";
    if (S.sport === "olympics") await loadOlympics();
    if (S.view === "matches") await viewMatches(d);
    if (S.view === "editions") S.sport === "olympics" ? viewGames(d) : viewEditions(d);
    if (S.view === "sports") viewSports(d);
    if (S.view === "countries") viewCountries(d);
    if (S.view === "athletes") await viewMedallists(d);
    if (S.view === "players") await viewPlayers(d);
    if (S.view === "teams") await viewTeams(d);
    renderTable();
  }
  if (S.page && !wide()) { S.open = S.open || S.page; S.page = ""; }  // an address made on a wide screen, opened on a phone
  if (S.page) await openPage(S.page, true); else closePage(true);
  if (S.open) openCard(S.open, true); else closeCard(true);
  suggest();
}

/* The filter also offers the people and teams it matches, to open their card in one click. */
async function suggest() {
  const q = fold(S.q);
  const box = $("#active");
  $$(".sugg", box).forEach(x => x.remove());
  if (q.length < 3) return;
  const out = [];
  const score = n => { const f = fold(n); return f === q ? 0 : f.split(/\s+/).some(w => w.startsWith(q)) ? 1 : f.includes(q) ? 2 : 9; };
  if (S.sport === "tennis") {
    const ps = await loadPlayers("tennis");
    ps.filter(p => score(p.name) < 9).sort((a, b) => score(a.name) - score(b.name)).slice(0, 4)
      .forEach(p => out.push(`<button class="chip sugg" data-open="player:${esc(p.id)}">${esc(p.name)} <span class="n">player</span></button>`));
  } else {
    const [ts, ps] = await Promise.all([loadTeams(), loadPlayers("football")]);
    ts.filter(t => score(t.name) < 9).sort((a, b) => score(a.name) - score(b.name)).slice(0, 2)
      .forEach(t => out.push(`<button class="chip sugg" data-open="team:${esc(t.key)}">${esc(t.name)} <span class="n">${t.kind === "national" ? "national team" : "club"}</span></button>`));
    ps.filter(p => score(p.name) < 9).sort((a, b) => score(a.name) - score(b.name) || b.r.length - a.r.length).slice(0, 4 - out.length)
      .forEach(p => out.push(`<button class="chip sugg" data-open="fplayer:${esc(p.key)}">${esc(p.name)} <span class="n">player</span></button>`));
  }
  if (fold(S.q) !== q) return;
  box.insertAdjacentHTML("afterbegin", out.join(""));
}
$("#active").addEventListener("click", e => {
  const b = e.target.closest(".sugg"); if (b) openCard(b.dataset.open);
});

async function viewMatches(d) {
  const all = await loadMatches(S.sport);
  if (S.sport === "football") {
    const rows = all.filter(r => {
      const e = d.ed[r[0]];
      return (!S.ed || r[0] === S.ed) && compOn(e.comp) && inYears(e.year) && (!S.rounds.size || S.rounds.has(stageGroup(r[2]))) && hit(r[3], r[4], e.title, e.name_then, r[9]);
    });
    const res = r => r[5] == null ? 0 : r[5] > r[6] ? 1 : r[6] > r[5] ? 2 : (/p(\d+)-(\d+)/.exec(r[7]) || []).slice(1).map(Number).reduce((a, b, i) => i ? (a > b ? 1 : 2) : b, 0);
    current = {
      noun: "match", rows, open: r => "edition:" + r[0],
      note: (S.ed ? /^(laliga|premier)-/.test(S.ed) : (S.comps.has("laliga") || S.comps.has("premier") || !S.comps.size)) ? "league dates from the clubs' season articles, else from engsoccerdata" : "",
      cols: [
        { k: "when", l: "Date", v: r => r[1] || "", s: r => (r[1] || String(d.ed[r[0]].year)), cls: "yr" },
        { k: "ed", l: "Edition", v: r => d.ed[r[0]].title, s: r => d.ed[r[0]].year + d.ed[r[0]].comp, r: r => edLnk(d, r[0], "f"), cls: "edc" },
        { k: "comp", l: "Competition", v: r => d.comp[d.ed[r[0]].comp].short, r: r => compLnk(d, d.ed[r[0]].comp), cls: "comp", hide: true },
        { k: "stage", l: "Stage", v: r => r[2], cls: "stagecell", hide: true },
        { k: "t1", l: "Home / team 1", v: r => r[3], r: r => lnk("team:" + r[11], r[3], res(r) === 1 ? "w" : ""), cls: "team r" },
        { k: "score", l: "Score", v: r => r[5] == null ? null : r[5] - r[6], r: r => r[5] == null ? `<small>${r[7] === "np" ? "not played" : "–"}</small>` : `${r[5]}–${r[6]}${r[7].trim() && r[7] !== "np" ? `<small>${esc(r[7].replace(/aet/, "a.e.t.").replace(/p(\d+)-(\d+)/, "$1–$2 pens"))}</small>` : ""}`, cls: "score" },
        { k: "t2", l: "Away / team 2", v: r => r[4], r: r => lnk("team:" + r[12], r[4], res(r) === 2 ? "w" : ""), cls: "team" },
        { k: "venue", l: "Ground", v: r => r[9], r: r => r[8] ? lnk("venue:" + r[8], r[9]) : esc(r[9] || ""), cls: "muted", hide: true },
        { k: "att", l: "Crowd", v: r => r[10], r: r => r[10] ? fmt(r[10]) : "", cls: "num", num: true, hide: true },
      ],
    };
  } else {
    const rows = all.filter(r => {
      const e = d.ed[r[0]];
      return (!S.ed || r[0] === S.ed) && compOn(e.comp) && surfOn(e) && inYears(e.year) && (!S.rounds.size || S.rounds.has(roundGroup(r[2], r[1]))) && hit(r[3], r[4], e.title, e.name_then);
    });
    const W = r => r[5] === 2 ? 4 : 3, L = r => r[5] === 2 ? 3 : 4;
    current = {
      noun: "match", rows, open: r => "edition:" + r[0],
      cols: [
        { k: "year", l: "Edition", v: r => d.ed[r[0]].title, s: r => d.ed[r[0]].year, r: r => edLnk(d, r[0], "f"), cls: "edc" },
        { k: "comp", l: "Tournament", v: r => d.comp[d.ed[r[0]].comp].short, s: r => (tierOf(d.ed[r[0]].comp) || [, , 9])[2] + d.comp[d.ed[r[0]].comp].short, r: r => tierBadge(d.ed[r[0]].comp) + compLnk(d, d.ed[r[0]].comp), cls: "comp hide-s" },
        { k: "surf", l: "Surface", v: r => d.ed[r[0]].surf || "", r: r => surfPill(d.ed[r[0]]), hide: true },
        { k: "round", l: "Round", v: r => r[1], s: r => r[2], cls: "stagecell" },
        { k: "w", l: "Winner", v: r => r[W(r)], r: r => lnk("player:" + r[W(r) + 4], r[W(r)], r[5] ? "w" : "") + flag(r[W(r) + 6]), cls: "team" },
        { k: "score", l: "Score", v: r => r[6], cls: "tennis-score" },
        { k: "l", l: "Loser", v: r => r[L(r)], r: r => lnk("player:" + r[L(r) + 4], r[L(r)]) + flag(r[L(r) + 6]), cls: "team" },
      ],
    };
    if (!S.sort) S.sort = { key: "year", dir: -1 };
  }
}
const flag = f => f ? `<span class="flag">${esc(f)}</span>` : "";

function viewEditions(d) {
  const rows = d.idx.editions.filter(e => compOn(e.comp) && surfOn(e) && inYears(e.year) && hit(e.title, e.name_then, e.champion, e.runner_up, e.host));
  drawTimeline(d, rows);
  const reading = e => e.reading === "check" ? `<span class="pill warn" title="The source does not fully add up; see the card">check</span>` : e.reading === "no_draw" ? `<span class="pill">no draw</span>` : "";
  if (S.sport === "football") {
    current = {
      noun: "edition", rows, open: e => "edition:" + e.id,
      cols: [
        { k: "year", l: "Edition", v: e => e.title, s: e => e.year, r: e => edLnk(d, e.id), cls: "edc" },
        { k: "comp", l: "Competition", v: e => d.comp[e.comp].short, r: e => compLnk(d, e.comp), cls: "comp" },
        { k: "champ", l: "Champion", v: e => e.champion, r: e => e.champion ? lnk("team:" + e.champion_key, e.champion, "w") : "", cls: "name" },
        { k: "runner", l: "Runner-up", v: e => e.runner_up, r: e => e.runner_up ? lnk("team:" + e.runner_key, e.runner_up) : "", cls: "muted hide-s" },
        { k: "host", l: "Host", v: e => e.host || "", cls: "muted", hide: true },
        { k: "teams", l: "Teams", v: e => e.teams, cls: "num", num: true, hide: true },
        { k: "matches", l: "Matches", v: e => e.matches, cls: "num", num: true },
        { k: "goals", l: "Goals", v: e => e.goals, cls: "num", num: true, hide: true },
        { k: "gpm", l: "Per match", v: e => e.matches ? +(e.goals / e.matches).toFixed(2) : null, cls: "num", num: true },
        { k: "reading", l: "", v: e => e.reading || "", r: reading },
      ],
    };
  } else {
    current = {
      noun: "edition", rows, open: e => "edition:" + e.id,
      cols: [
        { k: "year", l: "Edition", v: e => e.title, s: e => e.year, r: e => edLnk(d, e.id), cls: "edc" },
        { k: "comp", l: "Tournament", v: e => d.comp[e.comp].short, s: e => (tierOf(e.comp) || [, , 9])[2] + d.comp[e.comp].short, r: e => tierBadge(e.comp) + compLnk(d, e.comp), cls: "comp" },
        { k: "surf", l: "Surface", v: e => e.surf || "", r: e => surfPill(e), hide: true },
        { k: "champ", l: "Champion", v: e => e.champion, r: e => e.champion ? lnk("player:" + e.champion_id, e.champion, "w") : `<span class="muted">${e.matches ? "" : "not held or no draw"}</span>`, cls: "name" },
        { k: "runner", l: "Runner-up", v: e => e.runner_up, r: e => e.runner_up ? lnk("player:" + e.runner_id, e.runner_up) : "", cls: "muted hide-s" },
        { k: "final", l: "Final", v: e => e.final, cls: "tennis-score", hide: true },
        { k: "players", l: "Players", v: e => e.players, cls: "num", num: true, hide: true },
        { k: "reading", l: "", v: e => e.reading || "", r: reading },
      ],
    };
  }
  if (!S.sort) S.sort = { key: "year", dir: -1 };
}

async function viewPlayers(d) {
  const ps = await loadPlayers(S.sport);
  if (S.sport === "tennis") {
    const rows = [];
    for (const p of ps) {
      if (!hit(p.name, p.flag)) continue;
      const r = p.r.filter(x => compOn(x[4]) && inYears(x[3]) && surfOn(d.ed[x[0]]));
      if (!r.length) continue;
      const t = r.filter(x => x[2] === "Champion");
      rows.push({ p, n: r.length, titles: t.length, slams: t.filter(x => x[5] === "slams" || x[5] === "slams_w").length, masters: t.filter(x => x[5] === "masters" || x[5] === "wta1000").length, five: t.filter(x => x[5] === "atp500").length,
        finals: r.filter(x => x[1] <= 0).length, y0: r[0][3], y1: r[r.length - 1][3] });
    }
    current = {
      noun: "player", rows, open: x => "player:" + x.p.id,
      cols: [
        { k: "name", l: "Player", v: x => x.p.name, r: x => lnk("player:" + x.p.id, x.p.name), cls: "name" },
        { k: "flag", l: "Country", v: x => x.p.flag, r: x => x.p.flag ? `<button class="lnk f" data-q="${esc(x.p.flag)}" title="Only players from ${esc(x.p.flag)}">${imgFor(x.p.flag)}${esc(x.p.flag)}</button>` : "", cls: "muted" },
        { k: "titles", l: "Titles", v: x => x.titles, r: x => x.titles ? `<span class="win">${x.titles}</span>` : "", cls: "num", num: true },
        { k: "slams", l: "Slams", v: x => x.slams, r: x => x.slams || "", cls: "num", num: true },
        { k: "masters", l: S.g === "w" ? "WTA 1000" : "Masters", v: x => x.masters, r: x => x.masters || "", cls: "num", num: true },
        ...(S.g === "w" ? [] : [{ k: "five", l: "500", v: x => x.five, r: x => x.five || "", cls: "num", num: true, hide: true }]),
        { k: "finals", l: "Finals", v: x => x.finals, r: x => x.finals || "", cls: "num", num: true, hide: true },
        { k: "n", l: "Editions", v: x => x.n, cls: "num", num: true },
        { k: "span", l: "Years", v: x => `${x.y0}–${x.y1}`, s: x => x.y0, cls: "yr", hide: true },
      ],
    };
    if (!S.sort) S.sort = { key: "titles", dir: -1 };
  } else {
    const rows = [];
    for (const p of ps) {
      const r = p.r.filter(x => compOn(x[1]) && inYears(x[2]));
      const goals = (p.g || []).reduce((a, [eid, n]) => { const e = d.ed[eid]; return a + (e && compOn(e.comp) && inYears(e.year) ? n : 0); }, 0);
      if (!r.length && !goals) continue;
      const teams = [...new Set(r.filter(x => x[1] === "worldcup" || x[1] === "euro").map(x => x[3]))];
      const clubs = [...new Set(r.filter(x => x[1] === "laliga" || x[1] === "premier").map(x => x[3]))];
      if (!hit(p.name, ...teams, ...clubs)) continue;
      rows.push({ p, n: r.length, teams, clubs, wc: r.filter(x => x[1] === "worldcup").length, eu: r.filter(x => x[1] === "euro").length,
        cs: r.filter(x => x[1] === "laliga" || x[1] === "premier").length, goals,
        y0: r.length ? r[0][2] : Math.min(...p.g.map(([eid]) => d.ed[eid]?.year || 9999)), y1: r.length ? r[r.length - 1][2] : Math.max(...p.g.map(([eid]) => d.ed[eid]?.year || 0)) });
    }
    current = {
      noun: "player", rows, open: x => "fplayer:" + x.p.key,
      note: "named in a World Cup or Euro squad or a club's season squad, or scoring in a match box; goals as the match boxes write them",
      cols: [
        { k: "name", l: "Player", v: x => x.p.name, r: x => lnk("fplayer:" + x.p.key, x.p.name), cls: "name" },
        { k: "born", l: "Born", v: x => x.p.born, cls: "yr", hide: true },
        { k: "team", l: "National team", v: x => x.teams.join(", "), r: x => x.teams.map(t => lnk("team:nat:" + t, t, "f")).join(", "), cls: "muted" },
        { k: "wc", l: "World Cups", v: x => x.wc, r: x => x.wc || "", cls: "num", num: true },
        { k: "eu", l: "Euros", v: x => x.eu, r: x => x.eu || "", cls: "num", num: true },
        { k: "cs", l: "Club seasons", v: x => x.cs, r: x => x.cs || "", cls: "num", num: true },
        { k: "goals", l: "Goals", v: x => x.goals, r: x => x.goals || "", cls: "num", num: true },
        { k: "span", l: "Years", v: x => `${x.y0}–${x.y1}`, s: x => x.y0, cls: "yr", hide: true },
      ],
    };
    if (!S.sort) S.sort = { key: "wc", dir: -1 };
  }
}

async function viewTeams(d) {
  const ts = await loadTeams();
  const rows = [];
  for (const t of ts) {
    if (!hit(t.name)) continue;
    const r = t.r.filter(x => compOn(x.c) && inYears(x.y));
    if (!r.length) continue;
    const sum = k => r.reduce((a, x) => a + (x[k] || 0), 0);
    rows.push({ t, n: r.length, titles: r.filter(x => x.fin === "Champion").length, p: sum("p"), w: sum("w"), d: sum("d"), l: sum("l_"),
      gf: sum("gf"), ga: sum("ga"), y0: r[0].y, y1: r[r.length - 1].y });
  }
  current = {
    noun: "team", rows, open: x => "team:" + x.t.key,
    cols: [
      { k: "name", l: "Team", v: x => x.t.name, r: x => lnk("team:" + x.t.key, x.t.name), cls: "name" },
      { k: "kind", l: "", v: x => x.t.kind === "national" ? "national team" : "club", cls: "muted", hide: true },
      { k: "titles", l: "Titles", v: x => x.titles, r: x => x.titles ? `<span class="win">${x.titles}</span>` : "", cls: "num", num: true },
      { k: "n", l: "Editions", v: x => x.n, cls: "num", num: true },
      { k: "p", l: "P", v: x => x.p, cls: "num", num: true },
      { k: "w", l: "W", v: x => x.w, cls: "num", num: true, hide: true },
      { k: "d", l: "D", v: x => x.d, cls: "num", num: true, hide: true },
      { k: "l", l: "L", v: x => x.l, cls: "num", num: true, hide: true },
      { k: "gd", l: "Goals", v: x => x.gf - x.ga, r: x => `${fmt(x.gf)}–${fmt(x.ga)}`, cls: "num", num: true },
      { k: "span", l: "Years", v: x => `${x.y0}–${x.y1}`, s: x => x.y0, cls: "yr", hide: true },
    ],
  };
  if (!S.sort) S.sort = { key: "titles", dir: -1 };
}

/* ------------------------------------------------------------------ timeline */

let focusEds = null;
/* The timeline's rows go by category, each under a header that folds it: the Grand Slams, then the 1000s, the 500s,
   the Finals and the Olympics; in football the national teams, the clubs' international cups, their leagues. A folded
   category draws all its editions on one row. Which are folded is remembered in this browser only. */
const TL_K = { football: 1, tennis: 1, olympics: 1 };
/* The colour of a mark says something in every sport: the court in tennis, the champion's country in football, the
   continent that hosted those Games in the Olympics. Five hues, checked for colour-blind separation in this order,
   and every one of them named in the key under the timeline; what has no answer stays grey. */
const HUES = ["#2f6db5", "#e3894a", "#2d6b33", "#8a3f7a", "#b9922b"];
const GREY = "#b9b2a6";
const CONTINENT = { Europe: HUES[0], Americas: HUES[1], Asia: HUES[2], Oceania: HUES[3], Africa: HUES[4] };
let tlKey = [];   // [[what, colour]] of the timeline as it is drawn now
function markColours(eds) {
  if (S.sport === "tennis") {
    tlKey = ["clay", "grass", "hard", "carpet"].filter(f => eds.some(e => e.surf === f)).map(f => [SURF[f], `var(--${f})`]);
    return e => e.surf ? `var(--${e.surf})` : GREY;
  }
  if (S.sport === "olympics") {
    const cont = e => (D.olympics.ed[e.ed || e.id] || {}).continent || "";
    const seen = [...new Set(eds.map(cont))].filter(Boolean);
    tlKey = Object.keys(CONTINENT).filter(c => seen.includes(c)).map(c => [c, CONTINENT[c]]);
    return e => CONTINENT[cont(e)] || GREY;
  }
  // football: the countries that won most of what is on screen take the five hues, the rest share grey
  const n = new Map();
  for (const e of eds) if (e.champ_country) n.set(e.champ_country, (n.get(e.champ_country) || 0) + 1);
  const top = [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, HUES.length).map(([c]) => c);
  const of = Object.fromEntries(top.map((c, i) => [c, HUES[i]]));
  tlKey = top.map(c => [c, of[c]]).concat(n.size > top.length ? [["other countries", GREY]] : []);
  return e => of[e.champ_country] || GREY;
}  // how far the years are stretched, per sport
const TL_FOLD = (() => { try { return new Set(JSON.parse(localStorage.getItem("tlFold") || "[]")); } catch { return new Set(); } })();
function tlGroups(d) {
  const w = S.g === "w", by = gs => (d.idx.competitions || []).filter(c => gs.includes(c.group));
  if (S.sport === "olympics") {
    // the three answers the Games ask of their programme: what never left, what is on it now, what is gone
    const pick = want => d.idx.sports.filter(x => discStatus(d, x.id)[0] === want);
    return [["always", "In every Games", pick("in every Games")], ["now", "On the programme now", pick("on the programme")],
            ["gone", "Gone from it", [...pick("gone"), ...pick("demonstration only")]]];
  }
  return S.sport === "tennis"
    ? [["slams", "Grand Slams", by([w ? "slam_w" : "slam"])], ["k1", w ? "WTA 1000" : "Masters 1000", by([w ? "wta1000" : "masters"])],
       ["k5", "ATP 500", w ? [] : by(["atp500"])], ["other", "Finals, Olympics", by(w ? ["finals_w", "olympics_w"] : ["finals", "olympics"])]]
    : [["national", "National teams", FOOTBALL_GROUPS.national], ["international", "Clubs · international", FOOTBALL_GROUPS.international],
       ["leagues", "Clubs · national", FOOTBALL_GROUPS.leagues]].map(([k, l, ids]) => [k, l, ids.map(id => d.comp[id]).filter(Boolean)]);
}
function drawTimeline(d, rows) {
  const svg = $("#tl");
  const tlEds = S.sport === "olympics" ? D.olympics.tlEds : d.idx.editions.map(e => ({ ...e, size: e.matches || 0 }));
  const shown = c => tlEds.some(e => e.comp === c.id && inYears(e.year)) && (S.sport === "olympics" || compOn(c.id));
  const groups = tlGroups(d).map(([k, l, cs]) => [k, l, cs.filter(shown)]).filter(g => g[2].length);
  const lines = [];  // one per header, one per competition row (or one for a folded category)
  for (const [k, l, cs] of groups) {
    const folded = TL_FOLD.has(S.sport + ":" + k);
    lines.push({ head: true, k, l, n: cs.length, folded });
    if (folded) lines.push({ comps: cs, label: `${cs.length} ${S.sport === "tennis" ? "tournaments" : S.sport === "olympics" ? "disciplines" : "competitions"}` });
    else cs.forEach(c => lines.push({ comps: [c], label: c.short || c.name }));
  }
  const rowsN = lines.filter(x => !x.head).length;
  const sc = $("#tl-scroll"), K = TL_K[S.sport];
  const W = Math.round(Math.max(760, sc.clientWidth || 900) * K), LEFT = 132, RIGHT = 10, TOP = 16, HEAD = 17;
  const ROW = rowsN > 8 ? 13 : 18;
  const years = d.idx.editions.map(e => e.year);
  const Y0 = Math.min(...years) - 1, Y1 = Math.max(...years) + 1;
  const x = y => LEFT + (y - Y0) / (Y1 - Y0) * (W - LEFT - RIGHT);
  const bodyH = lines.reduce((a, ln) => a + (ln.head ? HEAD : ROW), 0);
  const H = TOP + bodyH + 18;
  const vis = new Set(rows.map(e => e.id));
  let s = "";
  for (const [a, b, n] of WAR) if (a > Y0) s += `<rect class="war" x="${x(a)}" y="${TOP - 3}" width="${x(b + 1) - x(a)}" height="${bodyH + 4}"/><text class="war-l" x="${(x(a) + x(b + 1)) / 2}" y="${TOP - 5}" text-anchor="middle">${n}</text>`;
  const step = [1, 2, 5, 10, 20].find(st => (x(Y0 + st) - x(Y0)) >= 44) || 20;  // a year label every 44 px at least
  for (let y = Math.ceil(Y0 / step) * step; y <= Y1; y += step) s += `<line class="grid${y % 10 ? " minor" : ""}" x1="${x(y)}" x2="${x(y)}" y1="${TOP - 3}" y2="${TOP + bodyH}"/><text class="axis" x="${x(y)}" y="${H - 3}" text-anchor="middle">${y}</text>`;
  const mw = Math.max(2, Math.min(26, (W - LEFT - RIGHT) / (Y1 - Y0) * .6));
  const colourOf = markColours(tlEds);
  let cy = TOP, lbl = "";
  for (const ln of lines) {
    if (ln.head) {
      s += `<line class="tlg-line" x1="0" x2="${W - RIGHT}" y1="${cy + HEAD - 2}" y2="${cy + HEAD - 2}"/>`;
      // the names live in a strip pinned over the left edge, so they stay as the years scroll
      lbl += `<g class="tlg" data-g="${ln.k}" role="button" tabindex="0" aria-expanded="${!ln.folded}"><rect class="tlg-hit" x="0" y="${cy}" width="${LEFT - 4}" height="${HEAD}"/>`
        + `<line class="tlg-line" x1="0" x2="${LEFT}" y1="${cy + HEAD - 2}" y2="${cy + HEAD - 2}"/>`
        + `<path class="tlg-tri" d="${ln.folded ? "M2 3.5L9 7L2 10.5Z" : "M2 4.5L9 4.5L5.5 11Z"}" transform="translate(0 ${cy + 1})"/>`
        + `<text class="tlg-l" x="14" y="${cy + HEAD - 5}">${esc(ln.l)}</text></g>`;
      cy += HEAD;
      continue;
    }
    lbl += `<text class="lbl${ln.comps.length > 1 ? " folded" : ""}" x="12" y="${cy + ROW / 2 + 4}">${esc(ln.label)}</text>`;
    const base = cy + ROW - 3, tall = ROW - 5;
    for (const c of ln.comps) {
      const es = tlEds.filter(e => e.comp === c.id).sort((a, b) => a.year - b.year);
      if (!es.length) continue;
      // the years this competition ran, as a band: then a gap is a break with a meaning (a war, a cup that ended),
      // not empty paper. A run breaks when a gap is far longer than that competition's own cadence.
      const gaps = es.slice(1).map((e, i) => e.year - es[i].year).sort((a, b) => a - b);
      const usual = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 1;
      const runs = [[es[0]]];
      for (const e of es.slice(1)) {
        const prev = runs[runs.length - 1];
        (e.year - prev[prev.length - 1].year > Math.max(2, usual * 2.5) ? runs.push([e]) : prev.push(e));
      }
      for (const run of runs) {
        const a = x(run[0].year), b = x(run[run.length - 1].year);
        s += `<rect class="band${ln.comps.length > 1 ? " stack" : ""}" style="fill:${colourOf(run[Math.floor(run.length / 2)])}" x="${(a - mw / 2 - 1).toFixed(1)}" y="${(base - tall * .62).toFixed(1)}" width="${Math.max(mw + 2, b - a + mw + 2).toFixed(1)}" height="${(tall * .62).toFixed(1)}" rx="2"/>`;
      }
      // the mark is as tall as the edition was big (its matches, or the events of that discipline), never a bare dot
      const top = Math.max(...es.map(e => e.size || 0), 1);
      for (const e of es) {
        const off = !vis.has(e.ed || e.id) || (focusEds && !focusEds.has(e.id));
        const h = Math.max(3, Math.min(1, (e.size || 0) / top) * tall);
        s += `<rect class="mk${off ? " off" : ""}${S.sport === "tennis" && e.surf ? " s-" + e.surf : ""}${e.demo ? " demo" : ""}${ln.comps.length > 1 ? " stack" : ""}" style="fill:${colourOf(e)}" data-id="${e.ed || e.id}" x="${(x(e.year) - mw / 2 + (e.id.endsWith("-dec") ? mw : 0)).toFixed(1)}" y="${(base - h).toFixed(1)}" width="${mw.toFixed(1)}" height="${h.toFixed(1)}" rx="1"/>`;
      }
      // once the years are far enough apart, each mark says which year it is
      if (x(Y0 + 1) - x(Y0) > 26 && ln.comps.length === 1) {
        for (const e of es) s += `<text class="mk-y" x="${x(e.year).toFixed(1)}" y="${(base - tall - 1).toFixed(1)}" text-anchor="middle">${e.year}</text>`;
      }
    }
    cy += ROW;
  }
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.style.width = W + "px";
  svg.style.height = H + "px";
  svg.innerHTML = s;
  const strip = $("#tl-lbl");
  strip.setAttribute("viewBox", `0 0 ${LEFT} ${H}`);
  strip.style.width = LEFT + "px";
  strip.style.height = H + "px";
  strip.innerHTML = lbl;
  renderKey();
  $("#tl-tools [data-tlz=out]").disabled = K <= 1;
  $("#tl-tools [data-tlz=fit]").hidden = K <= 1;
  TL_GEOM = { LEFT, RIGHT, W, Y0, Y1 };
}
let TL_GEOM = null;
function tlRedraw() {
  const d = D[S.sport];
  drawTimeline(d, d.idx.editions.filter(e => S.sport === "olympics" ? inYears(e.year) && hit(e.title, e.city, e.country)
    : compOn(e.comp) && surfOn(e) && inYears(e.year) && hit(e.title, e.name_then, e.champion, e.runner_up, e.host)));
}
$("#tl-tools").addEventListener("click", e => {
  const b = e.target.closest("[data-tlz]"); if (!b || !TL_GEOM) return;
  const sc = $("#tl-scroll"), g = TL_GEOM;
  // keep the year in the middle of what is visible (right of the pinned names) where it is
  const yearAt = px => g.Y0 + (px - g.LEFT) / (g.W - g.LEFT - g.RIGHT) * (g.Y1 - g.Y0);
  const mid = yearAt(sc.scrollLeft + (sc.clientWidth + g.LEFT) / 2);
  TL_K[S.sport] = b.dataset.tlz === "fit" ? 1 : Math.max(1, Math.min(24, TL_K[S.sport] * (b.dataset.tlz === "in" ? 1.6 : 1 / 1.6)));
  tlRedraw();
  const n = TL_GEOM, xm = n.LEFT + (mid - n.Y0) / (n.Y1 - n.Y0) * (n.W - n.LEFT - n.RIGHT);
  sc.scrollLeft = Math.max(0, xm - (sc.clientWidth + n.LEFT) / 2);
});
/* The key of what the colours mean, under the timeline and under the map. */
function renderKey() {
  const key = $("#tl-key");
  key.innerHTML = `<span class="what">${S.sport === "tennis" ? "Court:" : S.sport === "olympics" ? "Held in:" : "Champion from:"}</span>`
    + tlKey.map(([what, c]) => `<span class="k"><i style="--c:${c}"></i>${esc(what)}</span>`).join("");
  key.hidden = !tlKey.length || !["editions", "map"].includes(S.view);
}

function toggleTlGroup(k) {
  const key = S.sport + ":" + k;
  TL_FOLD.has(key) ? TL_FOLD.delete(key) : TL_FOLD.add(key);
  try { localStorage.setItem("tlFold", JSON.stringify([...TL_FOLD])); } catch { }
  tlRedraw();
}
$("#tl-lbl").addEventListener("click", e => { const g = e.target.closest(".tlg"); if (g) toggleTlGroup(g.dataset.g); });
$("#tl-lbl").addEventListener("keydown", e => { const g = e.target.closest(".tlg"); if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggleTlGroup(g.dataset.g); } });
$("#tl").addEventListener("click", e => { const m = e.target.closest(".mk"); if (m && !$("#tl-scroll").dataset.dragged) openCard("edition:" + m.dataset.id); });
$("#tl").addEventListener("mousemove", e => {
  const m = e.target.closest(".mk"); if (!m) return hideTip();
  const ed = D[S.sport].ed[m.dataset.id];
  if (!ed) return hideTip();
  showTip(e, `<b>${esc(ed.title)}</b><br>${S.sport === "olympics" ? (ed.held ? `${esc(ed.city)} · ${fmt(ed.events)} events` : "not held") : ed.champion ? "Champion · " + esc(ed.champion) : "No champion recorded"}`);
});
$("#tl").addEventListener("mouseleave", hideTip);
const tip = $("#tip");
function showTip(ev, html) {
  tip.innerHTML = html; tip.classList.add("on");
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(innerWidth - w - 8, ev.clientX + 12) + "px";
  tip.style.top = Math.max(8, ev.clientY - h - 10) + "px";
}
function hideTip() { tip.classList.remove("on"); }

/* ------------------------------------------------------------------ the Olympic Games

   A third atlas beside football and tennis, and never mixed with them: the Summer Games, edition by edition, with the
   programme of each (discipline by discipline, with the events it awarded and the pictogram Wikipedia draws for it)
   and the medal table by National Olympic Committee, as each Games' own article and medal table state them. */

const OLY_MEDALS = ["gold", "silver", "bronze"];
async function loadOlympics() {
  const d = D.olympics;
  if (!d.med) {
    const [med, prog] = await Promise.all([getJSON("olympics/medals.json"), getJSON("olympics/programme.json")]);
    d.med = unpack(med);
    d.prog = unpack(prog);
    d.disc = {};
    for (const p of d.prog) {
      const y = +p[0].slice(7);
      const x = d.disc[p[1]] = d.disc[p[1]] || { years: [], demo: [], events: 0, then: {} };
      (p[3] ? x.demo : x.years).push(y);
      x.events += p[2];
      if (p[6]) x.then[y] = p[6];
    }
    // the timeline draws one row per discipline: a mark where it was on that programme
    d.tlEds = d.prog.map(p => ({ id: `${p[0]}|${p[1]}`, comp: p[1], year: +p[0].slice(7), demo: !!p[3], ed: p[0], size: p[2] }));
  }
  return d;
}
const lastGames = d => Math.max(...d.idx.editions.filter(e => e.held).map(e => e.year));
function discStatus(d, code) {
  const x = d.disc[code] || { years: [] };
  const held = d.idx.editions.filter(e => e.held).map(e => e.year);
  if (!x.years.length) return ["demonstration only", "oly-demo"];
  if (held.every(y => x.years.includes(y))) return ["in every Games", "oly-always"];
  return x.years.includes(lastGames(d)) ? ["on the programme", "oly-now"] : ["gone", "oly-gone"];
}
const picto = code => IMG.pictogram[code] ? `<img class="picto" src="sportsatlas/${IMG.pictogram[code]}" alt="" loading="lazy">` : "";
const iocFlag = (code, year) => {
  const src = IMG.ioc[`${code}|${year}`] || Object.entries(IMG.ioc).filter(([k]) => k.startsWith(code + "|")).sort().pop()?.[1];
  return src ? `<img class="badge" src="sportsatlas/${src}" alt="" loading="lazy">` : "";
};
const nocName = (d, code, year) => (d.med.find(m => m[1] === code && (!year || m[0] === `summer-${year}`)) || d.med.find(m => m[1] === code) || [, , code])[2];

function viewGames(d) {
  const rows = d.idx.editions.filter(e => inYears(e.year) && hit(e.title, e.city, e.country));
  drawTimeline(d, rows);
  current = {
    noun: "Games", rows, open: e => "edition:" + e.id,
    cols: [
      { k: "year", l: "Games", v: e => e.title, s: e => e.year, r: e => edLnk(d, e.id), cls: "edc" },
      { k: "city", l: "Host", v: e => e.city, r: e => e.held ? esc(e.city) : `<span class="muted">not held</span>`, cls: "name" },
      { k: "country", l: "Country", v: e => e.country, cls: "muted" },
      { k: "nations", l: "Committees", v: e => e.nations || null, cls: "num", num: true },
      { k: "athletes", l: "Athletes", v: e => e.athletes || null, cls: "num", num: true },
      { k: "sports", l: "Sports", v: e => e.sports || null, cls: "num", num: true },
      { k: "events", l: "Events", v: e => e.events || null, cls: "num", num: true },
      { k: "reading", l: "", v: e => e.reading || "", r: e => e.reading === "check" ? `<span class="pill warn" title="The sources do not agree on how many events there were; see the card">check</span>` : "" },
    ],
  };
  if (!S.sort) S.sort = { key: "year", dir: -1 };
}

function viewSports(d) {
  const rows = d.idx.sports.map(x => {
    const s = d.disc[x.id] || { years: [], demo: [], events: 0 };
    const [status, cls] = discStatus(d, x.id);
    const all = [...s.years, ...s.demo];
    return { x, n: s.years.length, demo: s.demo.length, events: s.events, first: Math.min(...all), last: Math.max(...all), status, cls };
  }).filter(r => hit(r.x.name, r.x.sport, r.x.body, r.status));
  current = {
    noun: "discipline", rows, open: r => "disc:" + r.x.id,
    cols: [
      { k: "name", l: "Discipline", v: r => r.x.name, r: r => `${picto(r.x.id)}<button class="lnk" data-open="disc:${esc(r.x.id)}">${esc(r.x.name)}</button>`, cls: "name" },
      { k: "sport", l: "Sport", v: r => r.x.sport, r: r => r.x.sport === r.x.name ? `<span class="muted">—</span>` : esc(r.x.sport), cls: "muted" },
      { k: "code", l: "Code", v: r => r.x.id, cls: "muted hide-s" },
      { k: "status", l: "On the programme", v: r => r.status, r: r => `<span class="pill ${r.cls}">${esc(r.status)}</span>` },
      { k: "n", l: "Games", v: r => r.n, cls: "num", num: true },
      { k: "first", l: "First", v: r => r.first, cls: "yr" },
      { k: "last", l: "Last", v: r => r.last, cls: "yr" },
      { k: "events", l: "Events", v: r => r.events, cls: "num", num: true },
      { k: "body", l: "Federation", v: r => r.x.body, cls: "muted", hide: true },
    ],
  };
  if (!S.sort) S.sort = { key: "n", dir: -1 };
}

function viewCountries(d) {
  const by = new Map();
  for (const m of d.med) {
    const e = d.ed[m[0]];
    if (!inYears(e.year)) continue;
    const r = by.get(m[1]) || { code: m[1], name: m[2], games: 0, g: 0, s: 0, b: 0, last: 0 };
    r.g += m[3]; r.s += m[4]; r.b += m[5]; r.games++;
    if (e.year > r.last) { r.last = e.year; r.name = m[2]; }
    by.set(m[1], r);
  }
  const rows = [...by.values()].filter(r => hit(r.name, r.code)).map(r => ({ ...r, total: r.g + r.s + r.b }));
  current = {
    noun: "committee", rows, open: r => "noc:" + r.code,
    cols: [
      { k: "name", l: "Committee", v: r => r.name, r: r => `${iocFlag(r.code, r.last)}<button class="lnk" data-open="noc:${esc(r.code)}">${esc(r.name)}</button>`, cls: "name" },
      { k: "code", l: "Code", v: r => r.code, cls: "muted hide-s" },
      { k: "games", l: "Games with a medal", v: r => r.games, cls: "num", num: true },
      { k: "g", l: "Gold", v: r => r.g, r: r => `<span class="win">${r.g}</span>`, cls: "num", num: true },
      { k: "s", l: "Silver", v: r => r.s, cls: "num", num: true },
      { k: "b", l: "Bronze", v: r => r.b, cls: "num", num: true },
      { k: "total", l: "Total", v: r => r.total, cls: "num", num: true },
      { k: "last", l: "Last", v: r => r.last, cls: "yr", hide: true },
    ],
  };
  if (!S.sort) S.sort = { key: "g", dir: -1 };
}

/* Every medal of every event, person by person: loaded when the medallists are asked for, not before. */
async function loadMedallists() {
  const d = D.olympics;
  if (!d.win) {
    d.win = unpack(await getJSON("olympics/medallists.json"));
    d.byPerson = new Map();
    for (const w of d.win) {
      if (!w[5] && !w[6]) continue;  // a team medal whose members the source does not name
      const id = w[5] || `name:${w[6]}`;
      const p = d.byPerson.get(id) || { id, name: w[6] || id, nocs: new Set(), g: 0, s: 0, b: 0, rows: [] };
      p[w[3][0] === "g" ? "g" : w[3][0] === "s" ? "s" : "b"]++;
      p.nocs.add(w[4]);
      p.rows.push(w);
      p.name = w[6] || p.name;
      d.byPerson.set(id, p);
    }
  }
  return d;
}

/* Which tennis edition of the atlas is the Olympic tournament of each Games, so the two atlases point at each other. */
async function olyTennisLink(d) {
  if (d.tennisAt) return d.tennisAt;
  const t = await loadIndex("tennis").catch(() => null);
  d.tennisAt = {};
  for (const e of (t ? t.idx.editions : [])) if (e.comp === "olympics") d.tennisAt[e.year] = e.id;
  return d.tennisAt;
}

async function viewMedallists(d) {
  await loadMedallists();
  const rows = [];
  for (const p of d.byPerson.values()) {
    const rs = p.rows.filter(w => inYears(d.ed[w[0]].year));
    if (!rs.length || !hit(p.name, ...p.nocs)) continue;
    const years = rs.map(w => d.ed[w[0]].year);
    rows.push({ p, g: rs.filter(w => w[3] === "gold").length, s: rs.filter(w => w[3] === "silver").length,
                b: rs.filter(w => w[3] === "bronze").length, n: rs.length, y0: Math.min(...years), y1: Math.max(...years),
                noc: rs[rs.length - 1][4], games: new Set(rs.map(w => w[0])).size });
  }
  current = {
    noun: "medallist", rows, open: r => "athlete:" + r.p.id,
    note: "a team medal counts once for each of its members, as the sources list them",
    cols: [
      { k: "name", l: "Medallist", v: r => r.p.name, r: r => `${iocFlag(r.noc, r.y1)}<button class="lnk" data-open="athlete:${esc(r.p.id)}">${esc(r.p.name)}</button>`, cls: "name" },
      { k: "noc", l: "Committee", v: r => r.noc, r: r => `<button class="lnk f" data-open="noc:${esc(r.noc)}">${esc(r.noc)}</button>`, cls: "muted" },
      { k: "g", l: "Gold", v: r => r.g, r: r => r.g ? `<span class="win">${r.g}</span>` : "", cls: "num", num: true },
      { k: "s", l: "Silver", v: r => r.s, r: r => r.s || "", cls: "num", num: true },
      { k: "b", l: "Bronze", v: r => r.b, r: r => r.b || "", cls: "num", num: true },
      { k: "n", l: "Medals", v: r => r.n, cls: "num", num: true },
      { k: "games", l: "Games", v: r => r.games, cls: "num", num: true, hide: true },
      { k: "span", l: "Years", v: r => `${r.y0}–${r.y1}`, s: r => r.y0, cls: "yr" },
    ],
  };
  if (!S.sort) S.sort = { key: "g", dir: -1 };
}

/* One medallist: every medal, Games by Games, with the event it was won in. */
function cardAthlete(d, id) {
  const p = d.byPerson.get(id);
  if (!p) return `<h2>Medallist not found</h2>`;
  const rs = p.rows.slice().sort((a, b) => d.ed[a[0]].year - d.ed[b[0]].year || a[1].localeCompare(b[1]));
  const years = rs.map(w => d.ed[w[0]].year);
  const byGames = [...new Set(rs.map(w => w[0]))];
  const M = { gold: ["Gold", "gold"], silver: ["Silver", "final"], bronze: ["Bronze", ""] };
  return `<p class="kick"><span class="dot"></span>Olympic medallist · ${[...p.nocs].map(esc).join(", ")}</p>
    <h2>${iocFlag(rs[rs.length - 1][4], years[years.length - 1])}${esc(p.name)}</h2>
    <p class="sub">${p.rows.length} medal${p.rows.length === 1 ? "" : "s"} in ${byGames.length} Games, ${Math.min(...years)} to ${Math.max(...years)}.</p>
    ${factsBlock([
      { big: true, label: `${p.g + p.s + p.b} medals` },
      ...(p.g ? [{ label: `${p.g} gold` }] : []), ...(p.s ? [{ label: `${p.s} silver` }] : []), ...(p.b ? [{ label: `${p.b} bronze` }] : []),
      { label: `${byGames.length} Games`, panel: `<p class="sub">${byGames.map(e => d.ed[e].title).join(" · ")}</p>` },
    ])}
    <table class="mini"><thead><tr><th>Games</th><th>Sport</th><th>Event</th><th>Medal</th></tr></thead>
    <tbody>${rs.slice().reverse().map(w => `<tr class="${w[3] === "gold" ? "c" : ""}" data-go data-open="edition:${esc(w[0])}"><td>${edLnk(d, w[0])}</td><td>${esc(w[1])}</td><td>${esc(w[2])}${w[7] > 1 ? ` <span class="written">team of ${w[7]}</span>` : ""}</td><td><span class="pill ${M[w[3]][1]}">${M[w[3]][0]}</span></td></tr>`).join("")}</tbody></table>`;
}

/* One Games: who hosted it, what was on its programme, and its medal table. */
function cardGames(d, id) {  // needs the medallists loaded when it is opened (cardHtml does it)
  const e = d.ed[id];
  if (!e) return `<h2>Games not found</h2>`;
  if (!e.held) {
    return `<p class="kick"><span class="dot"></span>Summer Olympic Games · ${e.year}</p><h2>${esc(e.title)}</h2>
      <div class="note"><b>Not held.</b> The Games of ${e.year} were awarded but never took place; the article is kept here so the gap is visible.</div>`;
  }
  const prog = d.prog.filter(p => p[0] === id).sort((a, b) => b[2] - a[2] || a[1].localeCompare(b[1]));
  const med = d.med.filter(m => m[0] === id).sort((a, b) => b[3] - a[3] || b[4] - a[4] || b[5] - a[5]);
  const v = d.venue[(e.venues || [])[0]];
  const disagree = e.reading === "check";
  return `<p class="kick"><span class="dot"></span>Summer Olympic Games · ${e.year}</p>
    <h2>${esc(e.title)}</h2>
    <p class="sub">${esc(e.city)}${e.country ? `, ${esc(e.country)}` : ""}${e.opening ? ` · ${esc(e.opening)} to ${esc(e.closing)}` : ""}.</p>
    ${factsBlock([
      { big: true, label: `${fmt(e.events)} events`, panel: `<p class="sub">In ${e.sports} sports and ${e.disciplines} disciplines, as the programme lists them.</p>` },
      { label: `${fmt(e.nations)} committees` },
      { label: `${fmt(e.athletes)} athletes` },
      { label: `${fmt(med.reduce((a, m) => a + m[3] + m[4] + m[5], 0))} medals in the table` },
    ].filter(f => !/\bNaN|^0 /.test(f.label)))}
    ${disagree ? `<div class="note warn"><b>The sources do not agree on how many events there were.</b> The programme adds up to ${fmt(e.events_read)}, the edition's infobox says ${fmt(e.events)}, and its medal table gives ${fmt(e.golds)} golds. All three are shown; none is corrected.</div>` : ""}
    <dl>
      ${v ? `<dt>Main venue</dt><dd>${lnk("venue:" + v.id, v.name)}</dd>` : e.stadium ? `<dt>Main venue</dt><dd>${esc(e.stadium)}</dd>` : ""}
      ${e.opened_by ? `<dt>Opened by</dt><dd>${esc(e.opened_by)}</dd>` : ""}
      <dt>Golds in the table</dt><dd>${fmt(e.golds)}</dd>
    </dl>
    <h4 class="sec">The programme</h4>
    <div class="oly-prog">${prog.map(p => `<button class="oly-sp${p[3] ? " demo" : ""}" data-open="disc:${esc(p[1])}" title="${esc(d.comp[p[1]] ? d.comp[p[1]].short : p[1])}${p[6] ? `, shown that year as ${p[6]}` : ""}${p[3] ? ", a demonstration sport that year" : ""}">${picto(p[1])}<span class="nm">${esc((d.comp[p[1]] || {}).short || p[1])}</span><span class="n">${p[3] ? "demo" : p[2]}</span></button>`).join("")}</div>
    ${olyTop(d, w => w[0] === id, "Most medals at these Games")}
    ${d.tennisAt && d.tennisAt[e.year] ? `<p class="sub"><a href="#tennis/editions?p=edition%3A${encodeURIComponent(d.tennisAt[e.year])}">The tennis tournament of these Games</a> is in the tennis atlas, draw by draw.</p>` : ""}
    <h4 class="sec">Medal table</h4>
    <table class="mini"><thead><tr><th>Committee</th><th class="num">Gold</th><th class="num">Silver</th><th class="num">Bronze</th><th class="num">Total</th></tr></thead>
    <tbody>${med.map(m => `<tr class="${m[6] ? "c" : ""}" data-go data-open="noc:${esc(m[1])}"><td>${iocFlag(m[1], e.year)}${esc(m[2])}${m[6] ? ` <span class="written">host</span>` : ""}</td><td class="num">${m[3]}</td><td class="num">${m[4]}</td><td class="num">${m[5]}</td><td class="num"><b>${m[3] + m[4] + m[5]}</b></td></tr>`).join("")}</tbody></table>`;
}

/* The people with most medals among the rows a filter keeps: used on a Games and on a committee. */
function olyTop(d, keep, title, n = 8) {
  if (!d.byPerson) return "";
  const rows = [];
  for (const p of d.byPerson.values()) {
    const rs = p.rows.filter(keep);
    if (!rs.length) continue;
    rows.push({ p, g: rs.filter(w => w[3] === "gold").length, n: rs.length });
  }
  rows.sort((a, b) => b.g - a.g || b.n - a.n || a.p.name.localeCompare(b.p.name));
  if (!rows.length) return "";
  return `<h4 class="sec">${esc(title)}</h4><div class="oly-prog">${rows.slice(0, n).map(r =>
    `<button class="oly-sp" data-open="athlete:${esc(r.p.id)}"><span class="nm">${esc(r.p.name)}</span><span class="n">${r.g ? `${r.g}G ` : ""}${r.n}</span></button>`).join("")}</div>`;
}

/* One National Olympic Committee: its medals Games by Games, and where they came from. */
function cardNoc(d, code) {
  const rs = d.med.filter(m => m[1] === code).sort((a, b) => d.ed[a[0]].year - d.ed[b[0]].year);
  if (!rs.length) return `<h2>Committee not found</h2>`;
  const g = rs.reduce((a, m) => a + m[3], 0), s = rs.reduce((a, m) => a + m[4], 0), b = rs.reduce((a, m) => a + m[5], 0);
  const last = rs[rs.length - 1];
  const points = rs.map(m => ({ year: d.ed[m[0]].year, lv: Math.max(1, rankOf(d, m[0], code)), eid: m[0], tip: `${d.ed[m[0]].title}: ${m[3]} gold, ${m[4]} silver, ${m[5]} bronze` }));
  const held = d.idx.editions.filter(e => e.held).map(e => e.year);
  const names = [...new Set(rs.map(m => m[2]))];
  return `<p class="kick"><span class="dot"></span>National Olympic Committee · ${esc(code)}</p>
    <h2>${iocFlag(code, last ? d.ed[last[0]].year : 0)}${esc(last[2])}</h2>
    <p class="sub">${rs.length} Games with a medal, ${d.ed[rs[0][0]].year} to ${d.ed[last[0]].year}.${names.length > 1 ? ` Shown as ${names.map(esc).join(", ")} over the years.` : ""}</p>
    ${factsBlock([
      { big: true, label: `${fmt(g + s + b)} medals` },
      { label: `${fmt(g)} gold` }, { label: `${fmt(s)} silver` }, { label: `${fmt(b)} bronze` },
    ])}
    ${olyTop(d, w => w[4] === code, "Its most decorated")}
    <h4 class="sec">Where it finished</h4>
    ${trajectory({ points, held, levels: [], from: Math.min(...held), to: Math.max(...held), numeric: true })}
    <details open><summary>Games by Games</summary><table class="mini"><thead><tr><th>Games</th><th class="num">Gold</th><th class="num">Silver</th><th class="num">Bronze</th><th class="num">Place</th></tr></thead>
    <tbody>${rs.slice().reverse().map(m => `<tr data-go data-open="edition:${esc(m[0])}"><td>${edLnk(d, m[0])}</td><td class="num">${m[3]}</td><td class="num">${m[4]}</td><td class="num">${m[5]}</td><td class="num">${ordinal(rankOf(d, m[0], code))}</td></tr>`).join("")}</tbody></table></details>`;
}
/* Where a committee finished in a Games: the place its gold, then silver, then bronze give it in that medal table. */
function rankOf(d, eid, code) {
  const table = d.med.filter(m => m[0] === eid).sort((a, b) => b[3] - a[3] || b[4] - a[4] || b[5] - a[5]);
  const key = m => `${m[3]}|${m[4]}|${m[5]}`;
  const mine = table.find(m => m[1] === code);
  return mine ? table.findIndex(m => key(m) === key(mine)) + 1 : 0;
}

/* One discipline: the Games it was on, with the events it awarded, and the names it was shown under. */
function cardDisc(d, code) {
  const x = d.comp[code];
  const s = d.disc[code] || { years: [], demo: [], then: {} };
  if (!x) return `<h2>Discipline not found</h2>`;
  const [status, cls] = discStatus(d, code);
  const rs = d.prog.filter(p => p[1] === code).sort((a, b) => d.ed[a[0]].year - d.ed[b[0]].year);
  const held = d.idx.editions.filter(e => e.held).map(e => e.year);
  const points = rs.filter(p => !p[3]).map(p => ({ year: d.ed[p[0]].year, lv: p[2], eid: p[0], tip: `${d.ed[p[0]].title}: ${p[2]} events` }));
  const gaps = held.filter(y => !s.years.includes(y) && !s.demo.includes(y));
  return `<p class="kick"><span class="dot"></span>Olympic discipline${x.sport !== x.name ? ` · ${esc(x.sport)}` : ""} · ${esc(code)}</p>
    <h2>${picto(code)}${esc(x.name)}</h2>
    <p class="sub"><span class="pill ${cls}">${esc(status)}</span> ${s.years.length} Games${s.demo.length ? `, and ${s.demo.length} more as a demonstration` : ""}${x.body ? ` · ${esc(x.body)}` : ""}</p>
    ${factsBlock([
      { big: true, label: `${fmt(s.events)} events` },
      { label: `${s.years.length} Games`, panel: `<p class="sub">${s.years.join(", ")}</p>` },
      ...(s.demo.length ? [{ label: `${s.demo.length} as demonstration`, panel: `<p class="sub">${s.demo.join(", ")}</p>` }] : []),
      ...(gaps.length ? [{ label: `absent from ${gaps.length} Games`, panel: `<p class="sub">${gaps.join(", ")}</p>` }] : []),
    ])}
    ${points.length > 1 ? `<h4 class="sec">Events it awarded</h4>${trajectory({ points, held, levels: [], from: Math.min(...held), to: Math.max(...held), numeric: true })}` : ""}
    ${Object.keys(s.then).length ? `<div class="note"><b>Shown under other names.</b> ${Object.entries(s.then).map(([y, n]) => `${y}: ${esc(n)}`).join(" · ")}</div>` : ""}
    <details><summary>Games by Games</summary><table class="mini"><tbody>${rs.slice().reverse().map(p => `<tr data-go data-open="edition:${esc(p[0])}"><td>${edLnk(d, p[0])}</td><td class="num">${p[3] ? `<span class="pill">demonstration</span>` : `${p[2]} event${p[2] === 1 ? "" : "s"}`}</td><td class="num">${p[4] ? `${p[4]} committees` : ""}</td><td class="num">${p[5] ? `${fmt(p[5])} athletes` : ""}</td></tr>`).join("")}</tbody></table></details>`;
}

/* ------------------------------------------------------------------ map (one view among others) */

let map, layer;
/* Leaflet is only needed by the map: it is fetched the first time a map is drawn, not on every page. */
let leafletReady = null;
function loadLeaflet() {
  if (!leafletReady) {
    leafletReady = new Promise((ok, ko) => {
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = `sportsatlas/vendor/leaflet.css?v=${DATA_V}`;
      document.head.appendChild(css);
      const js = document.createElement("script");
      js.src = `sportsatlas/vendor/leaflet.js?v=${DATA_V}`;
      js.onload = ok; js.onerror = () => ko(new Error("Leaflet did not load"));
      document.head.appendChild(js);
    });
  }
  return leafletReady;
}

async function renderMap() {
  await loadLeaflet();
  const d = D[S.sport];
  if (S.sport === "olympics") await loadOlympics();
  if (!map) {
    map = L.map("map", { worldCopyJump: true, minZoom: 2 }).setView([35, 0], 2);
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16, attribution: "Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }
  setTimeout(() => map.invalidateSize(), 30);
  layer.clearLayers();
  const color = getComputedStyle(document.body).getPropertyValue("--sport").trim();
  // a ground's colour says the same as a mark's: the court played on, the country that won there, the continent
  const eachEd = S.sport === "olympics" ? d.idx.editions : d.idx.editions;
  const colourOf = markColours(S.sport === "olympics" ? D.olympics.tlEds : eachEd);
  renderKey();
  const commonest = list => { const n = new Map(); for (const c of list) n.set(c, (n.get(c) || 0) + 1); return [...n.entries()].sort((a, b) => b[1] - a[1])[0][0]; };
  const pts = [];
  let n = 0;
  for (const v of d.idx.venues) {
    if (v.lat == null) continue;
    const eds = v.editions.map(id => d.ed[id]).filter(e => e && compOn(e.comp) && surfOn(e) && inYears(e.year) && hit(v.name, e.title, e.champion));
    if (!eds.length) continue;
    n++;
    const yrs = eds.map(e => e.year);
    const fill = commonest(eds.map(e => colourOf(S.sport === "olympics" ? { ed: e.id, id: e.id } : e))) || color;
    L.circleMarker([v.lat, v.lon], { radius: 4 + Math.sqrt(eds.length) * 1.6, color: "#fff", weight: 1.2, fillColor: fill, fillOpacity: .85 })
      .bindTooltip(`<b>${esc(v.name)}</b><br>${eds.length} edition${eds.length > 1 ? "s" : ""} · ${Math.min(...yrs)}${yrs.length > 1 ? "–" + Math.max(...yrs) : ""}`, { className: "vt", direction: "top" })
      .on("click", () => openCard("venue:" + v.id)).addTo(layer);
    pts.push([v.lat, v.lon]);
  }
  if (pts.length && (S.comps.size || S.y0 || S.y1 || S.q)) setTimeout(() => map.fitBounds(pts, { padding: [40, 40], maxZoom: 7 }), 60);
  $("#count").innerHTML = `<b>${fmt(n)}</b> venues${S.sport === "football" ? " · World Cup and Euro grounds from each match; league grounds from each club's Wikidata item, dated when Wikidata dates them" : ""}`;
}

/* ------------------------------------------------------------------ cards */

$("#rec .close").addEventListener("click", () => closeCard());
$("#rec-back").addEventListener("click", () => history.back());
addEventListener("keydown", e => { if (e.key === "Escape") { if (!$("#drawer").hidden) closeDraw(); else closeCard(); } });
$("#rec-body").addEventListener("click", e => {
  if (filterClick(e)) return;
  const g = e.target.closest("[data-open]");
  if (g) { e.preventDefault(); openCard(g.dataset.open); }
});
function closeCard(silent) {
  $("#rec").hidden = true; S.open = ""; focusEds = null;
  if (!S.page) describe("", "");
  $$("#table tr.sel").forEach(t => t.classList.remove("sel"));
  if (!silent) writeHash(true);
  relayout();
}
/* The table column changes width when the card opens or closes: the timeline and the map must follow. */
function relayout() {
  requestAnimationFrame(() => {
    if (S.view === "editions") drawTimeline(D[S.sport], current.rows);
    if (map && S.view === "map") map.invalidateSize();
  });
}

/* What gets a page of its own on a wide screen: a tournament or season of one year, a team, a competition. What they
   lead to (a player, a venue) opens in the card beside the page. */
const PAGE_TYPES = new Set(["edition", "team", "comp", "about", "player", "noc", "disc", "athlete"]);
const wide = () => innerWidth >= 1000;
// one ground, two sports: the Wikidata item is the same, so the card says what the other sport played there
async function otherSportVenue(id) {
  const other = S.sport === "football" ? "tennis" : "football";
  const od = await loadIndex(other);
  const v = od.venue[id];
  if (!v) return "";
  const eds = v.editions.map(e => od.ed[e]).filter(Boolean).sort((a, b) => a.year - b.year);
  return `<div class="note">The same ground in ${other}: ${eds.slice(0, 6).map(e => `<a href="#${other}/editions?p=edition%3A${encodeURIComponent(e.id)}&o=venue%3A${id}">${esc(e.title)}</a>`).join(", ")}${eds.length > 6 ? ` and ${eds.length - 6} more` : ""}.</div>`;
}
async function cardHtml(d, type, id) {
  if (type === "about") return aboutHtml();
  if (S.sport === "olympics") {
    await loadOlympics();
    if (type === "edition") { await loadMedallists(); await olyTennisLink(d); return cardGames(d, id); }
    if (type === "noc") { await loadMedallists(); return cardNoc(d, id); }
    if (type === "disc") return cardDisc(d, id);
    if (type === "athlete") { await loadMedallists(); return cardAthlete(d, id); }
  }
  if (type === "edition" && d.ed[id]) return cardEdition(d, d.ed[id]);
  if (type === "venue" && d.venue[id]) return cardVenue(d, d.venue[id]) + await otherSportVenue(id);
  if (type === "comp" && d.comp[id]) return cardCompetition(d, d.comp[id]);
  if (type === "player") return cardTennisPlayer(d, id);
  if (type === "fplayer") return cardFootballPlayer(d, id);
  if (type === "team") return cardTeam(d, id);
  return null;
}
/* The page open now, described for machines too: its title in the tab, and schema.org JSON-LD whose sameAs names the
   same thing in Wikipedia, Wikidata and the other databases (R49). */
async function describe(ref, title) {
  document.title = title ? `${title} · Sports Atlas` : "Sports Atlas";
  let tag = document.getElementById("ld");
  if (!tag) { tag = document.createElement("script"); tag.type = "application/ld+json"; tag.id = "ld"; document.head.appendChild(tag); }
  if (!ref) { tag.textContent = ""; return; }
  const [type, id] = [ref.slice(0, ref.indexOf(":")), ref.slice(ref.indexOf(":") + 1)];
  const page = type === "team" ? (id.startsWith("club:") ? id.slice(5) : "") : (type === "player" || type === "fplayer") ? id : "";
  const kind = { edition: "SportsEvent", team: "SportsTeam", comp: "SportsOrganization", player: "Person", fplayer: "Person", venue: "Place" }[type] || "Thing";
  const same = [];
  if (page && !page.startsWith("name:")) {
    same.push(WIKI(page));
    if (!EXT) EXT = await getJSON("extids.json").catch(() => ({ props: {}, pages: {} }));
    const e = EXT.pages[page];
    if (e) {
      same.push(`https://www.wikidata.org/wiki/${e.q}`);
      for (const [p, ids] of Object.entries(e)) if (p !== "q" && EXT.props[p]) same.push(EXT.props[p].formatter.replace("$1", encodeURIComponent(ids[0])));
    }
  }
  if (type === "venue") same.push(`https://www.wikidata.org/wiki/${id}`);
  if (type === "edition" && D[S.sport].ed && D[S.sport].ed[id]) {
    const e = D[S.sport].ed[id];
    if (e.wiki_title || e.wiki) same.push(WIKI(e.wiki_title || e.wiki));
    if (e.qid) same.push(`https://www.wikidata.org/wiki/${e.qid}`);
  }
  tag.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": kind, name: title, url: location.href, ...(same.length ? { sameAs: same } : {}) });
}

/* About: what the atlas is, how it is read and checked, its sources and licences, and the open data. Numbers are
   read from the published data, never typed. */
async function aboutHtml() {
  const [f, t, o] = await Promise.all([loadIndex("football"), loadIndex("tennis"), loadIndex("olympics")]);
  const pkg = await getJSON("../open/datapackage.json").catch(() => null);
  const n = (d, k) => d.idx.editions.reduce((a, e) => a + (e[k] || 0), 0);
  const ext = a => `<a href="${a[1]}" target="_blank" rel="noopener">${a[0]}</a>`;
  const JOINS = { football_matches: "edition_id, home_team_id, away_team_id, venue_wikidata", football_goals: "edition_id, player_id, credited_team_id",
    football_teams: "team_id, wikidata, external ids", football_players: "player_id, wikidata, fjelstul_player_id, external ids",
    football_squads: "player_id, edition_id, team_id", football_team_lineage: "from_team_id, to_team_id", football_editions: "edition_id, competition_id",
    tennis_matches: "edition_id, player1_id, player2_id, winner_id", tennis_players: "player_id, wikidata, tennis_abstract_ids, external ids",
    tennis_editions: "edition_id, competition_id, champion_id", venues: "wikidata" };
  return `<p class="kick"><span class="dot"></span>About</p>
    <h2>Sports Atlas</h2>
    <div class="about">
    <p>A historical atlas of football, tennis and the Olympic Games: every match of the great competitions, table first,
    each one traced to the page it was read from. Football: ${fmt(n(f, "matches"))} matches in ${fmt(f.idx.editions.length)} tournaments and seasons
    (World Cups, Euros, the European club cups, La Liga, the Premier League). Tennis: ${fmt(n(t, "matches"))} singles matches in
    ${fmt(t.idx.editions.length)} editions, men's and women's (Grand Slams, Masters 1000 and WTA 1000, ATP 500 from 2009, ATP and WTA Finals, Olympics).
    The Summer Olympic Games: ${fmt(o.idx.editions.filter(e => e.held).length)} Games from 1896, their programme discipline by discipline
    (${fmt(o.idx.sports.length)} disciplines, with the pictogram Wikipedia draws for each) and the medal table of each, committee by committee.
    Medals by athlete are not read yet.</p>

    <h3>How it is read</h3>
    <p>The English Wikipedia leads: its match boxes, draws, results grids, squads and infoboxes are read as they are written,
    from a saved copy of each page. A player or a club is the page its link lands on, never a name that looks alike. Where
    the sources disagree (a season whose results do not give its table, a draw that does not add up, goals that do not make
    the score) the atlas says so on the card instead of guessing, and nothing is patched to look coherent.</p>
    <p>Other open sources check it: engsoccerdata's league results (joined by results, never by names), the Fjelstul World
    Cup Database's goals and squads (joined by Wikipedia page), and Jeff Sackmann's ATP and WTA results and rankings (joined
    by the draw, confirmed by Wikidata id). Their agreement is counted, and shown where it fails.</p>

    <h3>Sources and licences</h3>
    <table class="mini"><tbody>
      <tr><td>${ext(["English Wikipedia", "https://en.wikipedia.org"])}</td><td class="written">matches, draws, squads, tables, goals · CC BY-SA 4.0</td></tr>
      <tr><td>${ext(["Wikidata", "https://www.wikidata.org"])}</td><td class="written">places, coordinates, grounds, external ids · CC0</td></tr>
      <tr><td>${ext(["engsoccerdata", "https://github.com/jalapic/engsoccerdata"])} (James Curley)</td><td class="written">league dates and a check on scores · GPL</td></tr>
      <tr><td>${ext(["Fjelstul World Cup Database", "https://github.com/jfjelstul/worldcup"])}</td><td class="written">a check on World Cup scorers and squads · © 2023 Joshua C. Fjelstul, Ph.D., ${ext(["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/legalcode"])}</td></tr>
      <tr><td>tennis_atp, tennis_wta (Jeff Sackmann / ${ext(["Tennis Abstract", "http://www.tennisabstract.com/"])})</td><td class="written">a check on the draws, and ATP and WTA rankings · ${ext(["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/"])}</td></tr>
      <tr><td>Wikimedia Commons</td><td class="written">flags, almost all public domain, each file's licence recorded</td></tr>
      <tr><td>Club crests</td><td class="written">belong to their clubs; shown, as Wikipedia shows them, to identify the club the atlas informs about; any is removed on request</td></tr>
      <tr><td>Esri</td><td class="written">map tiles</td></tr>
    </tbody></table>

    <h3>Open data</h3>
    <p>Everything in the atlas, as ${pkg ? pkg.resources.length : ""} CSV tables that join by Wikipedia page, Wikidata item and the ids of
    the other datasets (Transfermarkt, BDFútbol, ATP, WTA, Olympedia…), described as a Frictionless Data Package.</p>
    <p><a class="dl" href="sportsatlas/open/sports-atlas-data.zip">Download all tables (CSV, zip)</a><a class="dl" href="sportsatlas/open/datapackage.json" target="_blank" rel="noopener">datapackage.json</a><a class="dl" href="sportsatlas/open/README.md" target="_blank" rel="noopener">README</a></p>
    ${pkg ? `<table class="mini"><thead><tr><th>Table</th><th class="num">Rows</th><th>Joins by</th></tr></thead><tbody>${pkg.resources.map(r => `<tr><td>${esc(r.name)}</td><td class="num">${fmt(r.rows)}</td><td class="written">${esc(JOINS[r.name] || "competition_id")}</td></tr>`).join("")}</tbody></table>` : ""}
    <p class="written">Wikipedia-derived tables are CC BY-SA 4.0; the ranking columns and tennis_abstract_ids derive from tennis_atp and tennis_wta and are for non-commercial use.</p>

    <h3>Version</h3>
    <p class="written">v${DATA_V} · ${BUILD_AT}. A personal project by ${ext(["Víctor Elvira", "https://victorelvira.github.io"])}.</p>
    </div>`;
}

async function openPage(ref, silent) {
  const i = ref.indexOf(":");
  const type = ref.slice(0, i), id = ref.slice(i + 1);
  const d = await loadIndex(S.sport);
  let html;
  focusEds = null;
  try { html = await cardHtml(d, type, id); } catch (err) { console.error(err); html = `<h2>Could not open this</h2><p class="sub">${esc(err.message)}</p>`; }
  if (html == null) return;
  if (S.sport === "tennis" && type === "edition" && d.ed[id] && !!(d.comp[d.ed[id].comp] || {}).women !== (S.g === "w")) { S.g = S.g === "w" ? "m" : "w"; S.comps.clear(); }
  // the full draw of a tennis edition is part of its page, not a sheet over it
  if (type === "edition" && S.sport === "tennis" && d.ed[id]) {
    const x = await edition(id);
    if (x.draw && x.draw.length) html += `<div class="page-draw"><h4 class="sec">The full draw · ${fmt(d.ed[id].matches)} matches</h4><input type="search" class="draw-q" placeholder="Find a player in this draw">
      <div class="bracket-scroll"><div class="bracket">${x.draw.map(r => `<div class="round"><div class="round-name">${esc(r.name)} · ${r.matches.length}</div><div class="slots">${r.matches.map(mcard).join("")}</div></div>`).join("")}</div></div></div>`;
  }
  if (S.page !== ref) { S.open = ""; $("#rec").hidden = true; }
  S.page = ref;
  const body = $("#page-body");
  body.innerHTML = html;
  $("#page").hidden = false;
  $("#subbar").hidden = $("#stage").hidden = true;
  $("#page").scrollTop = 0;
  $("#open-draw", body)?.remove();
  const q = $(".draw-q", body);
  if (q) q.addEventListener("input", ev => {
    const v = fold(ev.target.value.trim());
    body.querySelectorAll(".page-draw .mc").forEach(mc => mc.classList.toggle("dim", !!v && ![...mc.querySelectorAll(".nm")].some(n => fold(n.textContent).includes(v))));
    const first = v && body.querySelector(".page-draw .mc:not(.dim)");
    if (first) first.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  });
  hoverPaths(body);
  if (!silent) writeHash(true);
  describe(ref, ref === "about:" ? "About" : $("#page-body h2")?.textContent || "");
  $("#about-tab").setAttribute("aria-pressed", ref === "about:");
}
function closePage(silent) {
  if (!S.page && $("#page").hidden) return;
  S.page = "";
  describe("", "");
  $("#about-tab").setAttribute("aria-pressed", "false");
  $("#page").hidden = true;
  $("#subbar").hidden = $("#stage").hidden = false;
  if (!silent) writeHash(true);
  relayout();
}
$("#about-tab").addEventListener("click", () => openCard("about:"));
$("#page-back").addEventListener("click", () => navDepth > 0 ? history.back() : closePage());
$("#page-table").addEventListener("click", () => { closeCard(true); closePage(); });
$("#page-body").addEventListener("click", e => {
  if (filterClick(e)) return;
  const pl = e.target.closest(".page-draw .pl[data-pid]");
  if (pl) { e.preventDefault(); openCard("player:" + pl.dataset.pid); return; }
  const g = e.target.closest("[data-open]");
  if (g) { e.preventDefault(); openCard(g.dataset.open); }
});

async function openCard(ref, silent) {
  const i = ref.indexOf(":");
  const type = ref.slice(0, i), id = ref.slice(i + 1);
  if (PAGE_TYPES.has(type) && wide()) return openPage(ref, silent);
  const d = await loadIndex(S.sport);
  let html = "";
  focusEds = null;
  try {
    html = await cardHtml(d, type, id);
    if (html == null) return;
  } catch (err) {
    console.error(err);
    html = `<h2>Could not open this</h2><p class="sub">${esc(err.message)}</p>`;
  }
  // a women's edition opened from a link switches the tennis tables to the women's tour, and back
  if (S.sport === "tennis" && type === "edition" && d.ed[id] && !!(d.comp[d.ed[id].comp] || {}).women !== (S.g === "w")) { S.g = S.g === "w" ? "m" : "w"; S.comps.clear(); if (!silent) setTimeout(render, 0); }
  S.open = ref;
  $("#rec-body").innerHTML = html;
  $("#rec").hidden = false;
  $("#rec").scrollTop = 0;
  $$("#table tr").forEach(t => t.classList.toggle("sel", t.dataset.row === ref));
  if (!silent) writeHash(true);
  relayout();
  const od = $("#open-draw");
  if (od) od.addEventListener("click", async () => openDraw(d.ed[id], await edition(id)));
  hoverPaths($("#rec-body"));
  if (!S.page) describe(ref, ref === "about:" ? "About" : $("#rec-body h2")?.textContent || "");
}

const TENNIS_GROUP = { slam: "Grand Slam", masters: "Masters 1000", atp500: "ATP 500", finals: "ATP Finals", olympics: "Olympic Games",
  slam_w: "Grand Slam · women", wta1000: "WTA 1000 · women", finals_w: "WTA Finals", olympics_w: "Olympic Games · women" };
const CUP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9.5 17h5"/></svg>`;
const month = iso => { if (!iso) return ""; const [, m, dd] = iso.split("-"); return `${+dd} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m - 1]}`; };

/* The name an edition was played under, when it is not the competition's name today. */
function playedAs(d, e) {
  const c = d.comp[e.comp];
  if (!e.name_then || e.title.includes(e.name_then) || e.name_then === c.name) return "";
  return `<p class="then">Played as <i>${esc(e.name_then)}</i> · <button class="lnk" data-open="comp:${esc(e.comp)}">every name it has had</button></p>`;
}

/* A competition's names, as runs of consecutive editions: Monte Carlo Open 1990–1999, Monte Carlo Masters 2000–2007… */
function nameRuns(eds) {
  const runs = [];
  for (const e of eds) {
    const n = e.name_then || e.title;
    const last = runs[runs.length - 1];
    if (last && last.name === n) { last.to = e.label; last.n++; last.last = e.id; }
    else runs.push({ name: n, from: e.label, to: e.label, n: 1, first: e.id, last: e.id });
  }
  return runs;
}

/* What an edition card offers besides reading it: its matches in the table, and its competition. */
function edActions(d, e) {
  return `<div class="acts"><button class="btn" data-matches="${esc(e.id)}">See its ${fmt(e.matches)} matches in the table</button>${compLnkBtn(d, e.comp)}</div>`;
}
const compLnkBtn = (d, id) => `<button class="btn" data-open="comp:${esc(id)}">${esc(d.comp[id].name)}: every edition</button>`;

/* A competition's card: what it is in numbers, who won it most, every edition, where it was played. */
function cardCompetition(d, c) {
  const eds = d.idx.editions.filter(e => e.comp === c.id).sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
  const played = eds.filter(e => e.matches);
  const matches = eds.reduce((a, e) => a + (e.matches || 0), 0);
  const football = S.sport === "football";
  const goals = football ? eds.reduce((a, e) => a + (e.goals || 0), 0) : 0;
  focusEds = new Set(eds.map(e => e.id));
  // most titles
  const tally = new Map();
  for (const e of eds) {
    if (!e.champion) continue;
    const key = football ? e.champion_key : e.champion_id;
    const t = tally.get(key) || { key, name: e.champion, n: 0, last: 0, runner: 0 };
    t.n++; t.last = e.year; tally.set(key, t);
  }
  for (const e of eds) {
    const key = football ? e.runner_key : e.runner_id;
    if (key && tally.has(key)) tally.get(key).runner++;
  }
  const top = [...tally.values()].sort((a, b) => b.n - a.n || b.last - a.last).slice(0, 12);
  const max = top[0]?.n || 1;
  const open = t => football ? "team:" + t.key : "player:" + t.key;
  // venues
  const vcount = new Map();
  for (const e of eds) for (const v of e.venues || []) vcount.set(v, (vcount.get(v) || 0) + 1);
  const venues = [...vcount].map(([id, n]) => ({ v: d.venue[id], n })).filter(x => x.v).sort((a, b) => b.n - a.n).slice(0, 12);
  // chart: goals per match (football) or players in the draw (tennis), one bar per edition
  const val = e => football ? (e.matches ? e.goals / e.matches : 0) : (e.players || 0);
  const vmax = Math.max(...played.map(val), 1);
  const chartTitle = football ? "Goals per match, edition by edition" : "Players in the draw, edition by edition";
  const extra = e => football ? (c.kind === "tournament" ? esc(e.host || "") : `${e.teams} clubs`) : esc(e.final || "");
  return `<p class="kick"><span class="dot"></span>${football ? FOOTBALL_GROUP_NAME(c.id) : (TENNIS_GROUP[c.group] || "Tennis")}</p>
    <h2>${esc(c.name)}</h2>${c.note ? `<div class="note">${esc(c.note)}</div>` : ""}
    <p class="sub">${eds.length} editions in the atlas, ${eds[0]?.label || ""} to ${eds[eds.length - 1]?.label || ""}; ${fmt(matches)} matches${football ? `, ${fmt(goals)} goals` : ""}.</p>
    <div class="acts"><button class="btn" data-comp="${esc(c.id)}">Only ${esc(c.short)} in the table</button></div>
    ${(() => {
      const runs = nameRuns(eds);
      if (runs.length < 2) return "";
      return `<h4 class="sec">Names over time</h4><ol class="names">${runs.map(r => `<li><span class="nm">${esc(r.name)}</span><span class="yrs">${edLnk(d, r.first).replace(/>[^<]*</, `>${esc(r.from)}<`)}${r.n > 1 ? ` – ${edLnk(d, r.last).replace(/>[^<]*</, `>${esc(r.to)}<`)}` : ""}</span><span class="n">${r.n} ${c.kind === "league" ? "season" : "edition"}${r.n > 1 ? "s" : ""}</span></li>`).join("")}</ol>`;
    })()}
    ${top.length ? `<h4 class="sec">Most titles</h4><div class="bars">${top.map(t => `<div class="bar" data-go data-open="${esc(open(t))}" title="${esc(t.name)}: ${t.n} title${t.n > 1 ? "s" : ""}${t.runner ? `, ${t.runner} time${t.runner > 1 ? "s" : ""} runner-up` : ""}"><span class="nm">${esc(t.name)}</span><span class="trk"><span class="fill" style="width:${t.n / max * 100}%"></span></span><span class="n">${t.n}</span></div>`).join("")}</div>` : ""}
    ${played.length > 2 ? `<h4 class="sec">${chartTitle}</h4><div class="cols">${played.map(e => `<div class="c on" style="height:${val(e) / vmax * 100}%" data-open="edition:${e.id}" title="${esc(e.title)}: ${football ? val(e).toFixed(2) : val(e)}"></div>`).join("")}</div><div class="cols-axis"><span>${played[0].label}</span><span>${played[played.length - 1].label}</span></div>` : ""}
    <h4 class="sec">Every edition</h4>
    <table class="mini"><thead><tr><th>Edition</th><th>Champion</th><th>Runner-up</th><th>${football ? (c.kind === "tournament" ? "Host" : "Clubs") : "Final"}</th></tr></thead>
    <tbody>${eds.slice().reverse().map(e => `<tr data-go data-open="edition:${e.id}"><td>${edLnk(d, e.id)}</td>
      <td>${e.champion ? lnk(football ? "team:" + e.champion_key : "player:" + e.champion_id, e.champion, "win") : `<span class="written">${e.matches ? "" : "not held or no draw"}</span>`}</td>
      <td>${e.runner_up ? lnk(football ? "team:" + e.runner_key : "player:" + e.runner_id, e.runner_up) : ""}</td><td class="written">${extra(e)}</td></tr>`).join("")}</tbody></table>
    ${venues.length ? `<h4 class="sec">Where it was played most</h4><table class="mini"><tbody>${venues.map(x => `<tr data-go data-open="venue:${x.v.id}"><td>${lnk("venue:" + x.v.id, x.v.name)}</td><td class="written">${esc(x.v.country || "")}</td><td class="num">${x.n} edition${x.n > 1 ? "s" : ""}</td></tr>`).join("")}</tbody></table>` : ""}
    <p class="links"><a href="${WIKI(c.wiki || c.name)}" target="_blank" rel="noopener">${esc(c.wiki || c.name)}</a> on Wikipedia.</p>`;
}

async function cardEdition(d, e) {
  const x = await edition(e.id);
  const comp = d.comp[e.comp];
  if (comp.kind === "tournament" || comp.kind === "cup") return cardTournament(d, e, x, comp);
  if (comp.kind === "league") return cardSeason(d, e, x, comp);
  return cardDraw(d, e, x, comp);
}

/* Where else a player or a club is (R49): the sports databases its Wikidata item names, linked by each property's own
   formatter URL. Loaded when a card first needs it. */
let EXT = null;
async function elsewhere(page) {
  if (!page || page.startsWith("name:")) return "";
  if (!EXT) EXT = await getJSON("extids.json").catch(() => ({ props: {}, pages: {} }));
  const e = EXT.pages[page];
  if (!e) return "";
  const links = Object.entries(e).filter(([p]) => p !== "q" && EXT.props[p]).flatMap(([p, ids]) => ids.slice(0, 1).map(id => {
    const m = EXT.props[p];
    const name = m.label.replace(/\u200e/g, "").replace(/\s*\(.*\)$/, "").replace(/\s*(player|club|team|squad|athlete|people|person)?\s*ID(\s+since \d{4})?$/i, "")
      .replace(/^Association of Tennis Professionals$/, "ATP").replace(/^Women's Tennis Association$/, "WTA");
    return `<a href="${esc(m.formatter.replace("$1", encodeURIComponent(id)))}" target="_blank" rel="noopener" title="${esc(m.label)}: ${esc(id)}">${esc(name)}</a>`;
  }));
  return `<p class="links elsewhere"><span class="written">Elsewhere:</span> <a href="https://www.wikidata.org/wiki/${esc(e.q)}" target="_blank" rel="noopener">Wikidata</a>${links.length ? " · " + links.join(" · ") : ""}</p>`;
}

/* Goals as the match box writes them: "Messi 23' pen, 108' · Mbappé 80' pen, 81', 118' pen". */
function goalLine(m) {
  if (!m.goals) return "";
  const side = n => {
    const by = new Map();
    for (const g of m.goals.filter(g => g[0] === n)) {
      if (!by.has(g[1])) by.set(g[1], { name: g[2], key: g[1], mins: [] });
      by.get(g[1]).mins.push(`${esc(g[3] ? g[3] + "'" : "?")}${g[4] ? ` <i>${g[4] === "og" ? "own goal" : g[4]}</i>` : ""}`);
    }
    return [...by.values()].map(p => `${p.key.startsWith("name:") ? esc(p.name) : lnk("fplayer:" + p.key, p.name)} ${p.mins.join(", ")}`).join("; ");
  };
  const differs = m.goals[0][5] === "differs" ? ` <span class="written" title="The goals written in the match box do not add up to its score">(do not add up to the score)</span>` : "";
  const fj = m.fj_goals ? ` <span class="written fj" title="The Fjelstul World Cup Database gives: ${esc(m.fj_goals)}">(another source differs)</span>` : "";
  return `<div class="goals">${[side(1), side(2)].filter(Boolean).join(" · ")}${differs}${fj}</div>`;
}
function scorersBlock(x, noun) {
  if (!x.scorers || !x.scorers.length) return "";
  const withLines = x.matches.filter(m => m.goals || (m.g1 === 0 && m.g2 === 0) || (m.hg === 0 && m.ag === 0)).length;
  const played = x.matches.filter(m => m.played || m.hg != null).length;
  const shown = new Map(x.matches.flatMap(m => [[m.k1 || m.hk, m.t1 || m.h], [m.k2 || m.ak, m.t2 || m.a]]));
  return `<h4 class="sec">Top scorers</h4>
    <p class="sub">From the goals written in ${fmt(withLines)} of the ${fmt(played)} ${noun} (own goals left out)${withLines < played ? ": the others give no scorers, so these are counts in those matches, not the full season" : ""}.</p>
    <table class="mini"><tbody>${x.scorers.map(([k, n, g, t]) => `<tr${k.startsWith("name:") ? "" : ` data-go data-open="fplayer:${esc(k)}"`}><td>${k.startsWith("name:") ? esc(n) : lnk("fplayer:" + k, n)}</td><td class="muted">${t ? lnk("team:" + t, shown.get(t) || t.slice(t.indexOf(":") + 1)) : ""}</td><td class="num">${g}</td></tr>`).join("")}</tbody></table>`;
}

/* A knockout stage's place in the bracket: 0 the final, 1 the semi-finals… Stages that are not a standard knockout
   round (groups, a final round group, the first rounds of the old club cups) stay out of the bracket. */
function koRank(stage) {
  const s = (stage || "").toLowerCase();
  if (/^final$/.test(s)) return 0;
  if (/^semi-?finals?$/.test(s)) return 1;
  if (/^quarter-?finals?$/.test(s)) return 2;
  if (/^round of 16$|^eighth-?finals?$/.test(s)) return 3;
  if (/^round of 32$/.test(s)) return 4;
  return null;
}
// How far a team went in one edition, from its record: 1 champion … 6 group or earlier round
function finishLevel(fin) {
  const s = (fin || "").toLowerCase();
  if (s === "champion") return 1;
  if (s === "runner-up") return 2;
  if (/third|fourth|semi/.test(s)) return 3;
  if (/quarter/.test(s)) return 4;
  if (/round of (16|32)|second round|play-?off/.test(s)) return 5;
  return 6;
}
const FINISH_NAMES = ["", "Champion", "Final", "Semi-finals", "Quarter-finals", "Round of 16", "Groups or earlier"];

/* The bracket drawn from the final backwards: each tie sits beside the ties its two teams came from. */
function bracketHtml(x, e, team) {
  const rounds = new Map();
  for (const m of x.matches) {
    const r = koRank(m.stage);
    if (r == null || !m.k1 || !m.k2) continue;
    const key = [m.k1, m.k2].sort().join("|");
    if (!rounds.has(r)) rounds.set(r, new Map());
    const ties = rounds.get(r);
    if (!ties.has(key)) ties.set(key, { a: m.k1, b: m.k2, na: m.t1, nb: m.t2, ms: [] });
    ties.get(key).ms.push(m);
  }
  if (!rounds.has(0)) return "";
  const depth = Math.max(...rounds.keys());
  const inRound = (r, k) => [...(rounds.get(r) || new Map()).values()].find(t => t.a === k || t.b === k);
  // order: the final, then for each tie the ties of its first and second team one round earlier
  const order = new Map([[0, [...rounds.get(0).values()]]]);
  for (let r = 1; r <= depth; r++) {
    const seen = new Set(), list = [];
    for (const t of order.get(r - 1) || []) for (const k of [t.a, t.b]) { const u = inRound(r, k); if (u && !seen.has(u)) { seen.add(u); list.push(u); } }
    for (const u of (rounds.get(r) || new Map()).values()) if (!seen.has(u)) list.push(u);
    order.set(r, list);
  }
  const winner = (t, r) => r === 0 ? (e.champion_key && (t.a === e.champion_key || t.b === e.champion_key) ? e.champion_key : null)
    : (inRound(r - 1, t.a) ? t.a : inRound(r - 1, t.b) ? t.b : null);
  const goalsOf = (t, k) => t.ms.sort((p, q) => (p.date || "").localeCompare(q.date || "")).map(m => {
    const g = m.k1 === k ? m.g1 : m.g2, o = m.k1 === k ? m.g2 : m.g1;
    const pen = m.pens ? (m.k1 === k ? m.pens[0] : m.pens[1]) : null;
    return m.played ? `${g}${pen != null ? `<sup title="penalty shoot-out">(${pen})</sup>` : ""}` : "–";
  }).join(" ");
  const box = (t, r) => {
    const w = winner(t, r);
    const line = (k, n) => `<div class="bt${w === k ? " w" : ""}"><span class="bn">${team(n, k)}</span><span class="bs">${goalsOf(t, k)}</span></div>`;
    const aet = t.ms.some(m => m.aet) ? `<div class="bx" title="after extra time">after extra time</div>` : "";
    return `<div class="tie">${line(t.a, t.na)}${line(t.b, t.nb)}${aet}</div>`;
  };
  const cols = [];
  for (let r = depth; r >= 0; r--) cols.push(`<div class="bcol"><div class="bhead">${["Final", "Semi-finals", "Quarter-finals", "Round of 16", "Round of 32"][r]}</div><div class="bties">${order.get(r).map(t => box(t, r)).join("")}</div></div>`);
  return `<h4 class="sec">The knockout stage</h4><div class="kbracket-scroll"><div class="kbracket">${cols.join("")}</div></div>`;
}

/* Where each team of this edition's last four finished in every edition of the competition (batalladedatos' paths). */
function pathsHtml(d, e, teams, team) {
  const all = d.idx.editions.filter(y => y.comp === e.comp).sort((a, b) => a.year - b.year);
  const byKey = new Map(teams.map(t => [t.key, t]));
  const four = teams.filter(t => t.r.some(r => r.e === e.id && finishLevel(r.fin) <= 3))
    .sort((a, b) => finishLevel(a.r.find(r => r.e === e.id).fin) - finishLevel(b.r.find(r => r.e === e.id).fin)).slice(0, 4);
  if (four.length < 2 || all.length < 3) return "";
  const W = 640, H = 230, L = 108, R = 12, T = 26, B = 24;
  const X = i => L + i / (all.length - 1) * (W - L - R), Y = lv => T + (lv - 1) / 5 * (H - T - B);
  const COLORS = ["#0072B2", "#D55E00", "#009E73", "#CC79A7"];  // Okabe–Ito: told apart with any colour vision
  const grid = [1, 2, 3, 4, 5, 6].map(lv => `<line x1="${L}" x2="${W - R}" y1="${Y(lv)}" y2="${Y(lv)}" class="axis-line"/><text class="axis-label" x="${L - 8}" y="${Y(lv) + 4}" text-anchor="end">${FINISH_NAMES[lv]}</text>`).join("");
  const yrs = all.filter((y, i) => i === 0 || i === all.length - 1 || i % Math.ceil(all.length / 8) === 0).map(y => `<text class="axis-label" x="${X(all.indexOf(y))}" y="${H - 6}" text-anchor="middle">${y.year}</text>`).join("");
  const series = four.map((t, si) => {
    const pts = all.map((y, i) => { const r = t.r.find(z => z.e === y.id); return r ? { i, lv: finishLevel(r.fin), y } : null; });
    let path = "", prev = null, gaps = "";
    for (const p of pts) {
      if (!p) continue;
      if (prev) (p.i === prev.i + 1 ? (path += `L${X(p.i)},${Y(p.lv)}`) : (gaps += `M${X(prev.i)},${Y(prev.lv)}L${X(p.i)},${Y(p.lv)}`, path += `M${X(p.i)},${Y(p.lv)}`));
      else path += `M${X(p.i)},${Y(p.lv)}`;
      prev = p;
    }
    const dots = pts.filter(Boolean).map(p => `<circle cx="${X(p.i)}" cy="${Y(p.lv)}" r="${p.y.id === e.id ? 5 : p.lv === 1 ? 4 : 2.6}" fill="${COLORS[si]}" class="${p.y.id === e.id ? "now" : ""}" data-open="edition:${p.y.id}"><title>${esc(t.name)} · ${p.y.year}: ${FINISH_NAMES[p.lv]}</title></circle>`).join("");
    const cups = pts.filter(p => p && p.lv === 1).map(p => TROPHY(X(p.i), Y(p.lv)).replace('class="trophy"', `class="trophy" style="fill:${COLORS[si]}"`)).join("");
    return `<g><path d="${gaps}" stroke="${COLORS[si]}" class="gap"/><path d="${path}" stroke="${COLORS[si]}" class="line"/>${dots}${cups}</g>`;
  }).join("");
  return `<div><h4 class="sec">Where this edition's last four went, every ${esc(d.comp[e.comp].short)}</h4>
    <div class="legend">${four.map((t, i) => `<span><i style="background:${COLORS[i]}"></i>${team(t.name, t.key)}</span>`).join("")}<span class="written">dashed: editions it did not play</span></div>
    <svg class="chart paths" viewBox="0 0 ${W} ${H}" role="img" aria-label="Finish of each semi-finalist in every edition">${grid}${yrs}<line x1="${X(all.findIndex(y => y.id === e.id))}" x2="${X(all.findIndex(y => y.id === e.id))}" y1="${T}" y2="${H - B}" class="nowline"/>${series}</svg></div>`;
}

async function cardTournament(d, e, x, comp) {
  const teams = await loadTeams();
  const stages = [];
  for (const m of x.matches) {
    let s = stages.find(z => z.name === m.stage);
    if (!s) stages.push(s = { name: m.stage, ms: [] });
    s.ms.push(m);
  }
  // A club cup names its teams by page (k1, k2); a national team is its name.
  const team = (t, k) => lnk("team:" + (k || "nat:" + t), t);
  const row = m => {
    if (!m.played) return `<div class="match np"><div class="d">${month(m.date)}</div><div class="t1">${team(m.t1, m.k1)}</div><div class="sc">not played</div><div>${team(m.t2, m.k2)}</div><div class="where">Scheduled at ${esc(m.stadium)} · <a href="${WIKI(m.src.page)}#${encodeURIComponent((m.src.section || "").replace(/ /g, "_"))}" target="_blank" rel="noopener">why, on Wikipedia</a></div></div>`;
    const w1 = m.g1 > m.g2 || (m.g1 === m.g2 && m.pens && m.pens[0] > m.pens[1]);
    const w2 = m.g2 > m.g1 || (m.g1 === m.g2 && m.pens && m.pens[1] > m.pens[0]);
    const extra = [m.aet ? "after extra time" : "", m.pens ? `${m.pens[0]}–${m.pens[1]} on penalties` : ""].filter(Boolean).join(" · ");
    return `<div class="match"><div class="d">${m.date ? month(m.date) : m.leg ? `<span title="The page gives this leg only as a score in a two-legged tie: no date">Leg ${m.leg}</span>` : ""}</div><div class="t1 ${w1 ? "w" : ""}">${team(m.t1, m.k1)}</div><div class="sc">${m.g1}–${m.g2}${extra ? `<small>${extra}</small>` : ""}</div><div class="${w2 ? "w" : ""}">${team(m.t2, m.k2)}</div>
      <div class="where">${m.venue ? lnk("venue:" + m.venue, m.stadium) : esc(m.stadium)}${m.ground_basis === "home" ? ` <span title="The page gives no ground for this leg: the home club's ground that season, from Wikidata. To be confirmed by a source for the match.">(home ground, to be confirmed)</span>` : ""}${m.attendance ? ` · ${fmt(m.attendance)}` : ""}</div>${goalLine(m)}</div>`;
  };
  const dec = e.declared || {};
  const agree = dec.matches && +dec.matches === e.matches;
  // the hosts: the first thing a World Cup or a Euro is known by
  const hosts = comp.kind === "cup" ? "" : (e.host || "").split(/,\s*/).filter(Boolean);
  const hostBand = hosts.length ? `<div class="hosts"><span class="written">Hosted by</span> ${hosts.map(h => `<span class="host">${imgFor("nat:" + h)}${esc(h)}</span>`).join("")}</div>` : "";
  const bracket = bracketHtml(x, e, team);
  const ko = stages.filter(s => bracket && koRank(s.name) != null);
  // groups in their own order (A, B, C…, 1, 2…), the matches outside the bracket (third place) after them
  const rest = stages.filter(s => !ko.includes(s)).map((s, i) => ({ s, i }))
    .sort((a, b) => { const ga = /^group /i.test(a.s.name), gb = /^group /i.test(b.s.name);
      return ga && gb ? a.s.name.localeCompare(b.s.name, "en", { numeric: true }) : ga !== gb ? (ga ? -1 : 1) : a.i - b.i; })
    .map(x => x.s);
  return `<p class="kick"><span class="dot"></span>${compLnk(d, e.comp)} · ${esc(e.label || e.year)}</p>
    <h2>${esc(e.title)}</h2>${hostBand}${playedAs(d, e)}${edActions(d, e)}${comp.note ? `<div class="note">${esc(comp.note)}</div>` : ""}
    <p class="sub">${comp.kind === "cup" && e.host ? `${esc(e.host)}. ` : ""}${e.teams} teams, ${e.matches} matches, ${e.goals} goals${e.matches ? ` (${(e.goals / e.matches).toFixed(2)} a match)` : ""}.</p>
    ${e.champion ? `<div class="champ">${CUP}<div><div class="who">${team(e.champion, e.champion_key)}</div><div class="how">beat ${team(e.runner_up, e.runner_key)}${e.final ? ` in the final, ${esc(e.final.replace(/a\.e\.t\./g, "after extra time").replace(/\((\d+)–(\d+) p\)/g, "($1–$2 on penalties)"))}` : ", who finished second in the final round"}</div></div></div>` : ""}
    <div class="keyfacts">${agree ? `<span class="kf">${e.matches} of ${dec.matches} matches read, as the infobox declares</span>` : dec.matches ? `<span class="kf warn">${e.matches} read, infobox declares ${esc(dec.matches)}</span>` : ""}</div>
    ${bracket}
    <div class="duo">${pathsHtml(d, e, teams, team)}<div>${scorersBlock(x, "matches")}</div></div>
    ${x.fjelstul ? `<p class="sub">Scorers checked against the Fjelstul World Cup Database (Joshua C. Fjelstul, CC BY-SA 4.0): the same scorers and minutes in ${fmt(x.fjelstul.matches_agree)} of ${fmt(x.fjelstul.matches)} matches, ${fmt(x.fjelstul.goals_agree)} of its ${fmt(x.fjelstul.their_goals)} goals. Where it differs the match says so; hover to read its version.</p>` : ""}
    ${rest.map(s => `<div class="stage-h"><span>${esc(s.name)}</span><em>${s.ms.length}</em></div>${s.ms.map(row).join("")}`).join("")}
    ${ko.length ? `<details class="ko-detail"><summary class="btn">The knockout matches in detail: grounds, crowds, scorers</summary>${ko.map(s => `<div class="stage-h"><span>${esc(s.name)}</span><em>${s.ms.length}</em></div>${s.ms.map(row).join("")}`).join("")}</details>` : ""}
    <p class="links">Read from <a href="${WIKI(e.wiki)}" target="_blank" rel="noopener">${esc(e.wiki)}</a> and its group and knockout pages. Grounds as the source names them for that tournament.</p>`;
}

function cardSeason(d, e, x, comp) {
  const t = x.table || [];
  const keyOf = Object.fromEntries(t.map(r => [r.team, r.key]));
  const teamLnk = n => keyOf[n] ? lnk("team:" + keyOf[n], n) : esc(n);
  const by = Object.fromEntries(t.map(r => [r.team, r]));
  const teams = t.map(r => r.team);
  const cell = {};
  for (const m of x.matches) cell[m.h + "|" + m.a] = m;
  const abbr = n => n.replace(/^(Real|Club|CD|CF|FC|UD|RCD|SD|CA|Athletic|Atlético|Sporting|Deportivo)\s+/i, "").slice(0, 3).toUpperCase();
  const grid = teams.length && x.matches.length ? `<div class="grid-res"><table><thead><tr><th>Home \\ Away</th>${teams.map(a => `<th title="${esc(a)}">${esc(abbr(a))}</th>`).join("")}</tr></thead><tbody>${teams.map(h => `<tr><th>${teamLnk(h)}</th>${teams.map(a => {
    if (h === a) return `<td class="self"></td>`;
    const m = cell[h + "|" + a];
    if (!m || m.hg == null) return `<td>${m ? "·" : ""}</td>`;
    return `<td class="${m.hg > m.ag ? "hw" : m.hg < m.ag ? "aw" : ""}">${m.hg}–${m.ag}</td>`;
  }).join("")}</tr>`).join("")}</tbody></table></div>` : "";
  const dated = x.matches.filter(m => m.date).sort((a, b) => a.date.localeCompare(b.date));
  const alts = x.matches.filter(m => m.alt).length;
  const verdicts = x.matches.filter(m => m.verdict);
  const warn = x.reading === "check"
    ? `<div class="note warn"><b>The source does not add up.</b> Recounting wins, draws, losses and goals from the results grid does not give the league table on the same page: ${esc(x.reading_detail || "")}. Both are shown as written.${x.esd_gives_table === true ? ` <b>A second source settles it:</b> engsoccerdata's results for this season give exactly this table, so the difference is in the page's results grid${alts ? `; the results where they differ are marked below` : ""}.` : x.esd_gives_table === false ? " engsoccerdata's results do not give this table either." : ""}${x.adds_up_with_majority === true ? " With the score two of three sources give, the grid adds up too." : ""}</div>`
    : x.reading === "no_table" ? `<div class="note"><b>No league table</b> in a form we can read on this page; results only.</div>` : "";
  return `<p class="kick"><span class="dot"></span>${compLnk(d, e.comp)} · ${esc(e.label)}</p>
    <h2>${esc(e.title)}</h2>${playedAs(d, e)}${edActions(d, e)}
    <p class="sub">${e.teams} clubs, ${fmt(e.matches)} matches, ${fmt(e.goals)} goals.</p>
    ${e.champion ? `<div class="champ">${CUP}<div><div class="who">${lnk("team:" + (e.champion_key || ""), e.champion)}</div><div class="how">${by[e.champion] ? `${by[e.champion].pts} points, ${by[e.champion].w} wins` : ""}${e.runner_up ? `, ahead of ${teamLnk(e.runner_up)}` : ""}</div></div></div>` : ""}
    ${warn}
    <h4 class="sec">League table</h4>
    <table class="mini"><thead><tr><th>#</th><th>Club</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num">GF</th><th class="num">GA</th><th class="num">Pts</th></tr></thead>
    <tbody>${t.map(r => `<tr class="${r.pos === 1 ? "c" : ""}" data-go data-open="team:${esc(r.key)}"><td>${r.pos}</td><td>${esc(r.team)}${r.status ? ` <span class="flag">${esc(r.status)}</span>` : ""}</td><td class="num">${r.p}</td><td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l}</td><td class="num">${r.gf}</td><td class="num">${r.ga}</td><td class="num"><b>${r.pts}</b>${r.adj ? `<span class="flag">${r.adj > 0 ? "+" : ""}${r.adj}</span>` : ""}</td></tr>`).join("")}</tbody></table>
    ${grid ? `<h4 class="sec">Every result · home down, away across</h4>${grid}` : ""}
    ${verdicts.length ? `<h4 class="sec">Results the sources give differently</h4><table class="mini"><tbody>${verdicts.map(m => `<tr><td>${lnk("team:" + m.hk, m.h)} – ${lnk("team:" + m.ak, m.a)}</td><td class="num">${m.hg}–${m.ag}</td><td class="written">season page; ${esc(m.alt)}. ${esc(m.verdict)}</td></tr>`).join("")}</tbody></table>` : ""}
    ${scorersBlock(x, "results")}
    ${dated.length ? `<h4 class="sec">By date · ${fmt(dated.length)} of ${fmt(x.matches.length)} results</h4>
      <p class="sub">Dates, grounds and crowds come from the clubs' own season articles, joined to the grid by season and club. Where no article dates a match, the date is engsoccerdata's (James Curley), joined by results, never by names; it is marked.${alts ? ` In ${alts} match${alts > 1 ? "es" : ""} another source gives another score; both are shown.` : ""}</p>
      <details${dated.length <= 60 ? " open" : ""}><summary class="btn">Show the ${fmt(dated.length)} dated matches</summary>
      ${dated.map(m => `<div class="match"><div class="d">${m.date_src === "engsoccerdata" ? `<span title="Date from engsoccerdata: no club article dates this match">${month(m.date)}°</span>` : m.esd_date ? `<span title="The club article gives this date; engsoccerdata gives ${esc(m.esd_date)}">${month(m.date)}*</span>` : month(m.date)}${m.round ? `<br>R${esc(m.round)}` : ""}</div><div class="t1 ${m.hg > m.ag ? "w" : ""}">${lnk("team:" + m.hk, m.h)}</div><div class="sc">${m.hg ?? ""}–${m.ag ?? ""}${m.alt ? `<small>${esc(m.alt)}</small>` : ""}</div><div class="${m.ag > m.hg ? "w" : ""}">${lnk("team:" + m.ak, m.a)}</div>${m.ground || m.crowd ? `<div class="where">${m.venue ? lnk("venue:" + m.venue, m.ground) : esc(m.ground)}${m.ground_basis === "home" ? ` <span title="The club article gives no ground for this match: the home club's ground that season, from Wikidata. To be confirmed by a source for the match.">(home ground, to be confirmed)</span>` : ""}${m.crowd ? ` · ${fmt(m.crowd)}` : ""}</div>` : ""}${goalLine(m)}</div>`).join("")}</details>` : ""}
    <p class="links">Read from <a href="${WIKI(e.wiki_title || e.title)}" target="_blank" rel="noopener">${esc(e.wiki_title || e.title)}</a>${dated.length ? ", the clubs' season articles and engsoccerdata (° a date only engsoccerdata gives, * a date it gives differently)" : ""}. The season page itself gives no dates or grounds.</p>`;
}

function sets(score, w) {
  const parts = String(score || "").split(/,\s*/).map(x => x.match(/^(\d+)(?:\((\d+)\))?[–-](\d+)(?:\((\d+)\))?/)).filter(Boolean);
  if (!parts.length) return null;
  const win = parts.map(p => ({ g: p[1], tb: p[2] || "", o: p[3] }));
  const lose = win.map(x => ({ g: x.o, tb: "", o: x.g }));
  return w === 2 ? [lose, win] : [win, lose];
}
function mcard(m) {
  const ss = sets(m.score, m.w);
  const line = (p, i) => {
    const won = m.w === i + 1;
    const cells = ss ? ss[i].map(x => `<b class="g${+x.g > +x.o ? " w" : ""}">${esc(x.g)}${x.tb ? `<sup>${esc(x.tb)}</sup>` : ""}</b>`).join("") : (won && m.score ? `<i>${esc(m.score)}</i>` : "");
    return `<div class="pl${won ? " w" : ""}" data-pid="${esc(p.id)}" title="${esc(p.name)}${p.flag ? " · " + esc(p.flag) : ""}${p.rank ? ` · ATP rank ${p.rank} that week (Jeff Sackmann, tennis_atp)` : ""}"><span class="sd">${esc(p.seed || "")}</span><span class="nm">${imgFor(p.flag)}${esc(p.name)}</span><span class="sc">${cells}</span></div>`;
  };
  return `<div class="mc${m.atp_score ? " atp-differs" : ""}"${m.atp_score ? ` title="Jeff Sackmann's ATP results give ${esc(m.atp_score)}"` : ""}>${m.p.map(line).join("")}</div>`;
}

function cardDraw(d, e, x, comp) {
  const draw = x.draw || [];
  const last3 = draw.slice(-3);
  const v = d.venue[e.venues[0]];
  const group = TENNIS_GROUP[comp.group] || "Tennis";
  const warn = x.reading === "check" ? `<div class="note warn"><b>The draw does not fully add up in the source.</b> Reading it left a player with no defeat or a match too many, so a round may show a gap or a duplicate. Listed for review, not patched.</div>` : "";
  const none = !draw.length ? `<div class="note"><b>No draw to show.</b> ${e.year === 2020 ? "The 2020 edition was cancelled." : "The page for this edition has no draw we can read."}</div>` : "";
  return `<p class="kick">${tierBadge(e.comp)} ${group} · ${compLnk(d, e.comp)} · ${e.year}</p>
    <h2>${esc(e.title)}</h2>${playedAs(d, e)}${edActions(d, e)}
    <p class="sub">${surfPill(e, true)} ${comp.women ? "Women's" : "Men's"} singles${e.players ? `, ${e.players} players` : ""}${e.surface && e.surf_basis !== "tennis_atp" ? `, on ${esc(e.surface.toLowerCase())} as the page writes it` : ""}.</p>
    ${e.surf_basis === "tennis_atp" ? `<div class="note">The edition's pages give no surface; <b>${SURF[e.surf].toLowerCase()}</b> is Jeff Sackmann's tennis_atp.</div>` : ""}
    ${/^olympics/.test(e.comp) ? `<p class="sub"><a href="#olympics/editions?p=edition%3Asummer-${e.year}">The Games these draws belong to</a> are in the Olympic atlas, with their programme and medal table.</p>` : ""}
    ${e.surf_atp ? `<div class="note warn"><b>The sources differ on the court.</b> The page writes “${esc(e.surface)}”; Jeff Sackmann's tennis_atp gives ${esc(e.surf_atp)}. Both are shown, neither is corrected.</div>` : ""}
    ${e.champion ? `<div class="champ">${CUP}<div><div class="who">${lnk("player:" + e.champion_id, e.champion)}</div><div class="how">beat ${lnk("player:" + e.runner_id, e.runner_up)} in the final${e.final ? `, ${esc(e.final)}` : ""}</div></div></div>` : ""}
    <dl>
      <dt>Venue</dt><dd>${v ? lnk("venue:" + v.id, v.name) : '<span class="written">not stated in the source</span>'}${x.venue_written && v && x.venue_written !== v.name ? `<div class="written">written as “${esc(x.venue_written)}”</div>` : ""}</dd>
      ${e.location ? `<dt>Place</dt><dd>${esc(e.location)}</dd>` : ""}
      ${e.dates ? `<dt>Dates</dt><dd>${esc(e.dates)}</dd>` : ""}
      <dt>Matches</dt><dd>${fmt(e.matches)} in ${draw.length} rounds</dd>
    </dl>
    ${warn}${none}
    ${x.atp ? `<div class="note">Checked against Jeff Sackmann's ${comp.women ? "WTA results (tennis_wta" : "ATP results (tennis_atp"}, CC BY-NC-SA): ${fmt(x.atp.joined)} of his ${fmt(x.atp.theirs)} matches found in this draw, ${x.atp.winner_agrees === x.atp.joined ? "every winner the same" : `${fmt(x.atp.joined - x.atp.winner_agrees)} with another winner`}${x.atp.joined - x.atp.score_agrees ? `, ${fmt(x.atp.joined - x.atp.score_agrees)} with another score (marked in the draw; hover to see his)` : ", every score the same"}.</div>` : ""}
    ${last3.length ? `<h4 class="sec">The last rounds</h4><div class="mini-draw">${last3.map(r => `<div class="col${r.matches.length === 1 ? " one" : ""}"><p class="kick">${esc(r.name)}</p>${r.matches.map(mcard).join("")}</div>`).join("")}</div>
      <button class="btn" id="open-draw">Open the full draw · ${fmt(e.matches)} matches</button>` : ""}
    <p class="links">Read from <a href="${WIKI(e.wiki)}" target="_blank" rel="noopener">${esc(e.wiki)}</a>.${e.venue_basis && e.venue_basis !== "edition infobox venue" ? ` Venue from ${esc(e.venue_basis)}.` : ""}</p>`;
}

function hoverPaths(root) {
  if (root.dataset.paths) return;
  root.dataset.paths = "1";
  root.addEventListener("mouseover", ev => {
    const pl = ev.target.closest(".pl"); if (!pl) return;
    root.querySelectorAll(".pl").forEach(x => x.classList.toggle("path", x.dataset.pid === pl.dataset.pid));
  });
  root.addEventListener("mouseleave", () => root.querySelectorAll(".pl.path").forEach(x => x.classList.remove("path")));
  root.addEventListener("click", ev => {
    const pl = ev.target.closest(".pl"); if (!pl) return;
    closeDraw(); openCard("player:" + pl.dataset.pid);
  });
}
function openDraw(e, x) {
  const dr = $("#drawer");
  dr.innerHTML = `<div class="sheet" role="dialog" aria-label="Full draw"><div class="sheet-h"><div class="ttl"><h3>${esc(e.title)}</h3><div class="sub">${/_w$/.test(e.comp) ? "Women's" : "Men's"} singles · ${e.players} players · ${matchMedia("(hover: none)").matches ? "tap a name to open the player" : "hover a name to follow the path, click it to open the player"}</div></div>
    <input type="search" id="draw-q" placeholder="Find a player in this draw"><button class="x" aria-label="Close">×</button></div>
    <div class="bracket-scroll"><div class="bracket">${x.draw.map(r => `<div class="round"><div class="round-name">${esc(r.name)} · ${r.matches.length}</div><div class="slots">${r.matches.map(mcard).join("")}</div></div>`).join("")}</div></div></div>`;
  dr.hidden = false;
  delete dr.dataset.paths;
  $(".x", dr).addEventListener("click", closeDraw);
  hoverPaths(dr);
  $("#draw-q", dr).addEventListener("input", ev => {
    const q = fold(ev.target.value.trim());
    dr.querySelectorAll(".mc").forEach(mc => mc.classList.toggle("dim", !!q && ![...mc.querySelectorAll(".nm")].some(n => fold(n.textContent).includes(q))));
    const first = q && dr.querySelector(".mc:not(.dim)");
    if (first) first.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });
  });
}
function closeDraw() { const dr = $("#drawer"); dr.hidden = true; dr.innerHTML = ""; }

function cardVenue(d, v) {
  const eds = v.editions.map(id => d.ed[id]).filter(Boolean).sort((a, b) => a.year - b.year);
  const yrs = eds.map(e => e.year);
  focusEds = new Set(v.editions);
  return `<p class="kick"><span class="dot"></span>${esc(v.country || "Venue")}</p>
    <h2>${esc(v.name)}</h2>
    <p class="sub">${eds.length} edition${eds.length > 1 ? "s" : ""} between ${Math.min(...yrs)} and ${Math.max(...yrs)}, ${fmt(v.matches)} matches.${v.approx ? " Placed at its city: the source gives no exact point." : ""}</p>
    ${v.clubs && v.clubs.length ? `<div class="keyfacts">${v.clubs.map(([k, n]) => `<span class="kf big">home of ${lnk("team:" + k, n)}</span>`).join("")}</div>` : ""}
    ${v.note ? `<div class="note">${esc(v.note)}</div>` : ""}
    ${v.undated ? `<div class="note">This ground comes from the club's Wikidata item with no dates, so it is today's ground placed in every season. A club that moved will show here for years it played elsewhere.</div>` : ""}
    ${v.written.length ? `<div class="keyfacts">${v.written.map(w => `<span class="kf">written as “${esc(w)}”</span>`).join("")}</div>` : ""}
    <h4 class="sec">What happened here</h4>
    <table class="mini"><tbody>${eds.map(e => `<tr data-go data-open="edition:${e.id}"><td>${edLnk(d, e.id)}</td><td>${compLnk(d, e.comp)}</td><td>${e.champion ? (e.champion_id ? lnk("player:" + e.champion_id, e.champion, "win") : e.champion_key ? lnk("team:" + e.champion_key, e.champion, "win") : `<span class="win">${esc(e.champion)}</span>`) : ""}</td></tr>`).join("")}</tbody></table>
    <p class="links">${v.wiki ? `<a href="${WIKI(v.wiki)}" target="_blank" rel="noopener">${esc(v.wiki)}</a> on Wikipedia · ` : ""}<a href="https://www.wikidata.org/wiki/${v.id}" target="_blank" rel="noopener">${v.id}</a> on Wikidata. The name is today's; each edition keeps the name the source used then.</p>`;
}

/* ATP ranking month by month (tennis_atp): one thin line, No. 1 at the top, a log scale so the top 10 has room. */
function rankChart(flat, titles) {
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push({ ym: flat[i], r: flat[i + 1] });
  if (pts.length < 2) return "";
  const t = ym => Math.floor(ym / 100) + ((ym % 100) - 1) / 12;
  const x0 = t(pts[0].ym), x1 = t(pts[pts.length - 1].ym) + 1 / 12;
  const H = 170, L = 34, R = 8, T = 10, B = 22;
  const worst = Math.max(...pts.map(p => p.r)), top = Math.max(10, Math.pow(10, Math.ceil(Math.log10(worst))));
  const Y = r => T + Math.log10(r) / Math.log10(top) * (H - T - B);
  const ticks = [1, 10, 100, 1000].filter(v => v <= top);
  return zoomable({ from: x0, to: x1, W: chartW(600), H, L, R, draw: (W, X) => {
    // a gap of more than three months in the file breaks the line rather than inventing the months between
    let path = "", prev = null;
    for (const p of pts) { path += `${prev && t(p.ym) - t(prev.ym) > 0.26 ? "M" : prev ? "L" : "M"}${X(t(p.ym)).toFixed(1)},${Y(p.r).toFixed(1)}`; prev = p; }
    const step = yearStep((x1 - x0) * chartW(600) / W, 6 * chartW(600) / 600);
    const years = []; for (let y = Math.ceil(x0 / step) * step; y <= x1; y += step) years.push(y);
    const marks = titles.map(tt => `<line x1="${X(tt.y + 0.5).toFixed(1)}" x2="${X(tt.y + 0.5).toFixed(1)}" y1="${H - B}" y2="${H - B + 5}" class="tmark"><title>${esc(tt.name)}</title></line>`).join("");
    const hits = pts.map(p => `<circle cx="${X(t(p.ym)).toFixed(1)}" cy="${Y(p.r).toFixed(1)}" r="4" class="hit"><title>${String(p.ym).slice(0, 4)}-${String(p.ym).slice(4)}: No. ${p.r}</title></circle>`).join("");
    return `<svg class="rank" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ranking by month">
    ${ticks.map(v => `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
    ${years.map(y => `<text x="${X(y)}" y="${H - 6}" text-anchor="middle">${y}</text>`).join("")}
    <path d="${path}" class="line"/>${marks}${hits}</svg>`;
  } });
}

/* A chart over years that can be stretched and scrolled (as the artatlas timeline): − and + change the pixels per
   year, the plot scrolls sideways (drag or trackpad), and the y labels stay pinned on the left as a frozen strip.
   Each chart keeps its drawing function, so a zoom redraws at the new width instead of stretching circles and text. */
const ZOOMS = new Map();
let zoomSeq = 0;
const yearStep = (span, n) => [1, 2, 5, 10, 20, 25, 50].find(s => span / s <= n) || 50;
// the width a chart is designed at: its own on a wide screen, the screen's on a phone, so its 10-unit text stays 10 px
const chartW = base => Math.round(Math.min(base, Math.max(320, innerWidth - 32)));
function zoomable(spec) {
  const id = "z" + (++zoomSeq);
  if (ZOOMS.size > 200) ZOOMS.delete(ZOOMS.keys().next().value);
  ZOOMS.set(id, { ...spec, k: 1 });
  return `<div class="zc" data-z="${id}"><div class="zc-bar"><button type="button" data-zoom="out" title="Shorten the years" aria-label="Zoom out" disabled>−</button><button type="button" data-zoom="in" title="Stretch the years" aria-label="Zoom in">+</button><button type="button" data-zoom="fit" title="Back to all the years" hidden>all</button></div>${zoomDraw(id)}</div>`;
}
function zoomDraw(id) {
  const z = ZOOMS.get(id), W = Math.round(z.W * z.k);
  const X = v => z.L + (v - z.from) / Math.max(1e-9, z.to - z.from) * (W - z.L - z.R);
  const svg = z.draw(W, X);
  // the same drawing twice: once scrolling, once cut to its label strip and pinned over the left edge
  return `<div class="zc-scroll"><div class="zc-inner" style="width:${(z.k * 100).toFixed(2)}%">${svg}</div></div>`
    + (z.k > 1 ? `<div class="zc-y" style="width:${(z.L / z.W * 100).toFixed(3)}%"><div style="width:${(z.k * z.W / z.L * 100).toFixed(2)}%">${svg.replace(/<title>[^<]*<\/title>/g, "")}</div></div>` : "");
}
// the plot's own width in pixels (the scrolling part between the label strip and the right margin)
const zoomPlotW = (box, z) => box.querySelector(".zc-inner").clientWidth * (1 - (z.L + z.R) / (z.W * z.k));
function zoomRedraw(box) {
  const z = ZOOMS.get(box.dataset.z);
  box.querySelectorAll(".zc-scroll, .zc-y").forEach(n => n.remove());
  box.insertAdjacentHTML("beforeend", zoomDraw(box.dataset.z));
  box.querySelector("[data-zoom=fit]").hidden = z.k <= 1;
  box.querySelector("[data-zoom=out]").disabled = z.k <= 1;
  return box.querySelector(".zc-scroll");
}
/* Zoom so that years y0..y1 fill the view, and scroll to them (used by links and by the thumbnail capture). */
function zoomTo(box, y0, y1) {
  const z = ZOOMS.get(box.dataset.z);
  if (!z) return;
  // the pinned label strip covers the first L units of the view, so the years must fill what is left of it
  z.k = Math.max(1, Math.min(40, (1 - z.L / z.W) * (z.to - z.from) / Math.max(0.5, y1 - y0) + (z.L + z.R) / z.W));
  const sc = zoomRedraw(box);
  sc.scrollLeft = Math.max(0, (y0 - z.from) / (z.to - z.from) * zoomPlotW(box, z));
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-zoom]");
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const box = b.closest(".zc"), z = box && ZOOMS.get(box.dataset.z);
  if (!z) return;
  const sc = box.querySelector(".zc-scroll");
  const L = sc.clientWidth * z.L / (z.W * z.k) * z.k;  // label strip in pixels, the same at any zoom
  // keep the year in the middle of the view where it is
  const mid = (sc.scrollLeft + (sc.clientWidth + L) / 2 - L) / Math.max(1, zoomPlotW(box, z));
  z.k = b.dataset.zoom === "fit" ? 1 : Math.max(1, Math.min(40, z.k * (b.dataset.zoom === "in" ? 1.6 : 1 / 1.6)));
  const sc2 = zoomRedraw(box);
  sc2.scrollLeft = Math.max(0, mid * zoomPlotW(box, z) - (sc2.clientWidth - L) / 2);
}, true);
// drag to pan a stretched chart
document.addEventListener("pointerdown", e => {
  const sc = e.target.closest(".zc-scroll, #tl-scroll");
  if (!sc || e.button !== 0 || sc.scrollWidth <= sc.clientWidth || e.target.closest("[data-open]")) return;
  const x = e.clientX, left = sc.scrollLeft;
  delete sc.dataset.dragged;
  const move = ev => { if (Math.abs(ev.clientX - x) > 4) { sc.scrollLeft = left - (ev.clientX - x); sc.classList.add("dragging"); sc.dataset.dragged = "1"; } };
  const up = () => { sc.classList.remove("dragging"); removeEventListener("pointermove", move); removeEventListener("pointerup", up); setTimeout(() => delete sc.dataset.dragged, 0); };
  addEventListener("pointermove", move); addEventListener("pointerup", up);
});

async function cardTennisPlayer(d, id) {
  const ps = await loadPlayers("tennis");
  const p = ps.find(x => x.id === id);
  if (!p) return `<h2>Player not found</h2>`;
  const titles = p.r.filter(r => r[2] === "Champion");
  focusEds = new Set(p.r.map(r => r[0]));
  const groups = [["slams", "Grand Slams"], ["masters", "Masters 1000"], ["atp500", "ATP 500"], ["finals", "ATP Finals"], ["olympics", "Olympic Games"],
    ["slams_w", "Grand Slams"], ["wta1000", "WTA 1000 (Tier I, Premier Mandatory and Premier 5)"], ["wta_finals", "WTA Finals"], ["olympics_w", "Olympic Games"]].map(([k, l]) => [l, p.r.filter(r => r[5] === k)]).filter(g => g[1].length);
  const all = await loadMatches("tennis");
  let w = 0, l = 0;
  const rivals = new Map();
  for (const m of all) {
    const side = m[7] === id ? 1 : m[8] === id ? 2 : 0;
    if (!side || !m[5]) continue;
    const won = m[5] === side;
    won ? w++ : l++;
    const oid = side === 1 ? m[8] : m[7], oname = side === 1 ? m[4] : m[3];
    const rv = rivals.get(oid) || { id: oid, name: oname, w: 0, l: 0 };
    won ? rv.w++ : rv.l++;
    rivals.set(oid, rv);
  }
  const top = [...rivals.values()].sort((a, b) => (b.w + b.l) - (a.w + a.l) || b.w - a.w).slice(0, 8);
  const rk = p.rank ? ((await getJSON("tennis/rankings.json").catch(() => ({})))[id] || []) : [];
  const tour = p.rank && String(p.rank.atp_id).startsWith("w") ? "WTA" : "ATP";
  const rankBlock = p.rank ? `<h4 class="sec">${tour} ranking</h4>
    <div class="keyfacts"><span class="kf big">best No. ${p.rank.best}</span><span class="kf">first on ${esc(p.rank.best_on)}</span>${p.rank.weeks_no1 ? `<span class="kf">${fmt(p.rank.weeks_no1)} weeks at No. 1</span>` : ""}${p.rank.weeks_top10 ? `<span class="kf">${fmt(p.rank.weeks_top10)} weeks in the top 10</span>` : ""}</div>
    ${rankChart(rk, titles.filter(r => r[5] === "slams" || r[5] === "slams_w").map(r => ({ y: r[3], name: d.ed[r[0]]?.title || r[0] })))}
    <p class="sub">Month by month, from Jeff Sackmann's ${tour === "WTA" ? "tennis_wta" : "tennis_atp"} (CC BY-NC-SA). Weeks are counted among the ranking weeks in his files, which have gaps (intermittent before 1985), so they can be fewer than the ATP's official count. Ticks under the line: Grand Slam titles.</p>` : "";
  const pill = r => r[2] === "Champion" ? `<span class="pill gold">Champion</span>` : r[2] === "Runner-up" ? `<span class="pill final">Runner-up</span>` : `<span class="pill">${esc(r[2])}</span>`;
  return `<p class="kick"><span class="dot"></span>Player${p.flag ? ` · <button class="lnk f" data-q="${esc(p.flag)}" title="Filter by ${esc(p.flag)}">${esc(p.flag)}</button>` : ""}</p>
    <h2>${esc(p.name)}</h2>
    <p class="sub">${p.r.length} appearance${p.r.length > 1 ? "s" : ""} in these draws, ${p.r[0][3]} to ${p.r[p.r.length - 1][3]}.</p>
    ${(() => {
      const byGroup = keys => titles.filter(r => keys.includes(r[5]));
      const compsOf = keys => d.idx.competitions.filter(c => p.r.some(r => keys.includes(r[5]) && r[4] === c.id)).map(c => c.id);
      const groupsDef = [["Grand Slam", ["slams", "slams_w"]], ["Masters 1000", ["masters"]], ["ATP 500", ["atp500"]], ["WTA 1000", ["wta1000"]], ["ATP Finals", ["finals"]], ["WTA Finals", ["wta_finals"]], ["Olympic gold", ["olympics", "olympics_w"]]];
      const finalsPlayed = p.r.filter(r => r[1] <= 0 && r[2] !== "Round robin");
      const g = p.r.some(r => /(_w|wta1000|wta_finals)$/.test(r[5])) ? "w" : "m";
      return factsBlock([
        { big: true, label: `${titles.length} title${titles.length === 1 ? "" : "s"}`, panel: editionChips(d, titles.map(r => r[0]).reverse()), table: { g, q: p.name, rounds: ["Final"] }, tableLabel: "Show their finals in the table" },
        ...groupsDef.filter(([, k]) => byGroup(k).length).map(([l, k]) => ({ label: `${byGroup(k).length} ${l}`, panel: editionChips(d, byGroup(k).map(r => r[0]).reverse()), table: { g, q: p.name, comps: compsOf(k), rounds: ["Final"] }, tableLabel: `Show their ${l} finals in the table` })),
        ...["clay", "grass", "hard", "carpet"].map(f => [f, titles.filter(r => d.ed[r[0]]?.surf === f)]).filter(([, t]) => t.length).map(([f, t]) => ({ label: `${t.length} on ${f}`, cls: "s-" + f, panel: editionChips(d, t.map(r => r[0]).reverse()), table: { g, q: p.name, rounds: ["Final"], surf: [f] }, tableLabel: `Show their finals on ${f} in the table` })),
        { label: `${finalsPlayed.length} finals`, panel: editionChips(d, finalsPlayed.map(r => r[0]).reverse()), table: { g, q: p.name, rounds: ["Final"] } },
        ...(w + l ? [{ label: `won ${fmt(w)} · lost ${fmt(l)} · ${Math.round(w / (w + l) * 100)}%`, table: { g, q: p.name }, tableLabel: `Show all ${fmt(w + l)} matches in the table` }] : []),
      ]);
    })()}
    ${playerHistory(d, p)}
    <p class="sub written">The Davis Cup and the Billie Jean King Cup are not in the atlas yet.</p>
    ${rankBlock}
    ${top.length > 1 ? `<h4 class="sec">Most frequent opponents in these draws</h4><table class="mini"><thead><tr><th>Opponent</th><th class="num">Played</th><th class="num">Won</th><th class="num">Lost</th></tr></thead><tbody>${top.map(o => `<tr data-go data-open="player:${esc(o.id)}"><td>${esc(o.name)}</td><td class="num">${o.w + o.l}</td><td class="num">${o.w}</td><td class="num">${o.l}</td></tr>`).join("")}</tbody></table>` : ""}
    ${await elsewhere(id)}
    ${id.startsWith("name:") ? `<p class="links">No Wikipedia article: the name as the draw writes it.</p>` : `<p class="links"><a href="${WIKI(id)}" target="_blank" rel="noopener">${esc(id)}</a> on Wikipedia.</p>`}`;
}

async function cardFootballPlayer(d, key) {
  const ps = await loadPlayers("football");
  const p = ps.find(x => x.key === key);
  if (!p) return `<h2>Player not found</h2>`;
  focusEds = new Set([...p.r.map(r => r[0]), ...(p.g || []).map(g => g[0])]);
  const teamKeys = new Set((await loadTeams()).map(t => t.key));
  const goals = (p.g || []).map(([eid, n]) => ({ e: d.ed[eid], n })).filter(x => x.e).sort((a, b) => a.e.year - b.e.year || a.e.id.localeCompare(b.e.id));
  const gTotal = goals.reduce((a, x) => a + x.n, 0);
  const nat = p.r.filter(r => r[1] === "worldcup" || r[1] === "euro"), club = p.r.filter(r => r[1] === "laliga" || r[1] === "premier");
  // a player who played for two teams of one lineage (Yugoslavia, then Croatia): said, not merged
  const natKeys = [...new Set(nat.map(r => r[8] || "nat:" + r[3]))];
  const lin = (await loadTeams()).filter(t => natKeys.includes(t.key)).flatMap(t => (t.lineage || []).filter(l => l.way === "to" && natKeys.includes(l.key)).map(l => [t, l]));
  return `<p class="kick"><span class="dot"></span>Player${p.born ? " · born " + esc(p.born) : ""}</p>
    <h2>${esc(p.name)}</h2>
    <p class="sub">${nat.length ? `${nat.length} national-team squad${nat.length > 1 ? "s" : ""}` : ""}${nat.length && club.length ? ", " : ""}${club.length ? `${club.length} club season${club.length > 1 ? "s" : ""}` : ""}${!nat.length && !club.length ? "Named only as a scorer in the match boxes" : ""}.</p>
    ${lin.length ? `<div class="note">${lin.map(([t, l]) => `Played for ${lnk("team:" + t.key, t.name)} and for ${lnk("team:" + l.key, l.name)}. ${esc(lineageSentence(t.name, l.name, l.relation))}`).join(" ")}</div>` : ""}
    ${gTotal ? `<div class="keyfacts"><span class="kf big">${fmt(gTotal)} goal${gTotal === 1 ? "" : "s"}</span><span class="kf" title="Goals as the match boxes write them; many league matches have no box with scorers">in the matches whose box names the scorers</span></div>
      <h4 class="sec">Goals</h4><table class="mini"><tbody>${goals.map(x => `<tr data-go data-open="edition:${x.e.id}"><td>${edLnk(d, x.e.id)}</td><td>${compLnk(d, x.e.comp)}</td><td class="num">${x.n}</td></tr>`).join("")}</tbody></table>` : ""}
    ${nat.length ? `<h4 class="sec">World Cup and Euro squads</h4><table class="mini"><thead><tr><th>Edition</th><th>Tournament</th><th>Team</th><th>Pos</th><th>Club then</th></tr></thead><tbody>${nat.map(r => `<tr data-go data-open="edition:${r[0]}"><td>${edLnk(d, r[0])}</td><td>${compLnk(d, r[1])}</td><td>${teamKeys.has(r[8] || "nat:" + r[3]) ? lnk("team:" + (r[8] || "nat:" + r[3]), r[3]) : `${esc(r[3])} <span class="written">(no match played)</span>`}</td><td>${esc(r[4])}</td><td>${r[9] && teamKeys.has(r[9]) ? lnk("team:" + r[9], r[6]) : esc(r[6])}</td></tr>`).join("")}</tbody></table>` : ""}
    ${club.length ? `<h4 class="sec">Club seasons</h4><table class="mini"><thead><tr><th>Season</th><th>League</th><th>Club</th><th>Pos</th><th>No</th></tr></thead><tbody>${club.map(r => `<tr data-go data-open="edition:${r[0]}"><td>${edLnk(d, r[0])}</td><td>${compLnk(d, r[1])}</td><td>${r[8] && teamKeys.has(r[8]) ? lnk("team:" + r[8], r[3]) : esc(r[3])}</td><td>${esc(r[4])}</td><td>${esc(r[5])}</td></tr>`).join("")}</tbody></table>` : ""}
    ${await elsewhere(key)}
    ${key.startsWith("name:") ? `<p class="links">No Wikipedia article: the name as the squad writes it.</p>` : `<p class="links"><a href="${WIKI(key)}" target="_blank" rel="noopener">${esc(key)}</a> on Wikipedia.</p>`}`;
}

// "95 league seasons and 65 European campaigns": a club's rows are per competition, not per season.
function clubSpan(d, rows) {
  const n = k => rows.filter(r => (d.comp[d.ed[r.e]?.comp]?.kind === "league") === (k === "league")).length;
  const pl = (x, one, many) => `${x} ${x === 1 ? one : many}`;
  return [n("league") && pl(n("league"), "league season", "league seasons"), n("cup") && pl(n("cup"), "European campaign", "European campaigns")].filter(Boolean).join(" and ");
}

// Lineage (data/vocab/team_lineage.csv): beside a team, never merged into its record.
const LINEAGE_PHRASE = {
  from: { same_team: "The same team as", renamed: "Renamed from", successor: "Successor of", joint_successor: "Joint successor of", merged_into: "Absorbed", split_from: "Formed from part of" },
  to: { same_team: "The same team as", renamed: "Renamed", successor: "Succeeded by", joint_successor: "Record shared by its joint successor", merged_into: "Merged into", split_from: "Part of it formed" },
};
function lineageSentence(from, to, relation) {
  return { same_team: `${from} and ${to} are one team written two ways.`, renamed: `${from} was renamed ${to}.`, successor: `${to} succeeded ${from}.`, joint_successor: `${to} is a joint successor of ${from}.`,
    merged_into: `${from} merged into ${to}.`, split_from: `${to} was formed from part of ${from}.` }[relation] || "";
}
// The teams whose record this one carries, followed back: renamed, successor, joint successor, absorbed. Not a split.
function recordLine(ts, key) {
  const byKey = new Map(ts.map(t => [t.key, t])), seen = new Set([key]), q = [key], out = [];
  while (q.length) {
    for (const l of byKey.get(q.shift())?.lineage || []) {
      if (l.way !== "from" || l.relation === "split_from" || seen.has(l.key)) continue;
      seen.add(l.key); q.push(l.key); out.push(byKey.get(l.key));
    }
  }
  return out.filter(Boolean);
}
async function lineageSection(ts, t) {
  if (!t.lineage) return "";
  const ps = await loadPlayers("football");
  const inSquad = k => new Set(ps.filter(p => p.r.some(r => r[8] === k)).map(p => p.key));
  const mine = t.kind === "national" ? inSquad(t.key) : null;
  const rows = t.lineage.map(l => {
    const shared = mine ? ps.filter(p => mine.has(p.key) && p.r.some(r => r[8] === l.key)) : [];
    return `<li>${LINEAGE_PHRASE[l.way][l.relation]} ${lnk("team:" + l.key, l.name === t.name ? l.key.slice(l.key.indexOf(":") + 1) : l.name)}${l.year ? ` (${esc(l.year)})` : ""}${l.status === "proposed" ? ` <span class="written" title="At pencil: proposed, not yet confirmed">to be confirmed</span>` : ""}
      <div class="written" title="${esc(l.source)}">“${esc(l.evidence)}”, ${esc(l.source)}</div>
      ${shared.length ? `<div>${shared.length} player${shared.length > 1 ? "s" : ""} in the squads of both: ${shared.slice(0, 8).map(p => lnk("fplayer:" + p.key, p.name)).join(", ")}${shared.length > 8 ? "…" : ""}</div>` : ""}</li>`;
  });
  return `<h4 class="sec">Lineage</h4><ul class="lineage">${rows.join("")}</ul>`;
}

/* Facts you can open: each number on a card unfolds the editions behind it, and sends the table to those matches. */
function factsBlock(facts) {
  const buttons = facts.map((f, i) => f.panel || f.table
    ? `<button class="kf${f.big ? " big" : ""}${f.cls ? " surfkf " + f.cls : ""} fact" data-fact="f${i}" aria-pressed="false">${f.label}</button>`
    : `<span class="kf${f.big ? " big" : ""}">${f.label}</span>`).join("");
  const panels = facts.map((f, i) => f.panel || f.table ? `<div class="fact-panel" data-for="f${i}" hidden>
      ${f.panel || ""}${f.table ? `<button class="btn" data-table='${esc(JSON.stringify(f.table))}'>${esc(f.tableLabel || "Show these matches in the table")}</button>` : ""}</div>` : "").join("");
  return `<div class="keyfacts">${buttons}</div>${panels}`;
}
function editionChips(d, eids) {
  return `<div class="ed-chips">${eids.map(eid => `<button class="chip" data-open="edition:${esc(eid)}">${esc(d.ed[eid]?.title || eid)}</button>`).join("")}</div>`;
}

/* A career line, as batalladedatos draws its groups: the finish in each edition (best at the top), a cup where it
   won, a dashed stretch across editions held but not played. One chart per competition, all on the same years. */
const TROPHY = (cx, cy) => `<g class="trophy" transform="translate(${(cx - 6).toFixed(1)} ${(cy - 21).toFixed(1)}) scale(0.75)" aria-hidden="true"><path d="M4 2h8v3a4 4 0 0 1-8 0V2z"/><path d="M2 3h2v2a2 2 0 0 1-2-2zM14 3h-2v2a2 2 0 0 0 2-2z"/><path d="M7 9h2v3H7zM5 12h6v2H5z"/></g>`;
function trajectory({ points, held, levels, from, to, numeric }) {
  if (!points.length) return "";
  const worst = numeric ? Math.max(4, ...points.map(p => p.lv)) : levels.length - 1;
  const L = numeric ? 34 : 112, R = 14, T = 26, B = 22;
  const rows = numeric ? Math.min(worst, 10) : worst;
  const H = T + B + Math.max(3, rows) * 17;
  const span = Math.max(1, to - from);
  const Y = lv => T + (lv - 1) / Math.max(1, worst - 1) * (H - T - B);
  const ticks = numeric ? [...new Set([1, 2, 3, Math.round(worst / 2), worst])].filter(v => v >= 1 && v <= worst) : levels.map((_, i) => i).slice(1);
  const best = new Map();
  for (const p of points) if (!best.has(p.year) || p.lv < best.get(p.year).lv) best.set(p.year, p);
  const line = [...best.values()].sort((a, b) => a.year - b.year);
  return zoomable({ from, to: from + span, W: chartW(640), H, L, R, draw: (W, X) => {
    const grid = ticks.map(v => `<line class="axis-line" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="axis-label" x="${L - 6}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${numeric ? ordinal(v) : esc(levels[v])}</text>`).join("");
    const step = yearStep(span * chartW(640) / W, 9 * chartW(640) / 640);
    const years = [];
    for (let y = Math.ceil(from / step) * step; y <= to; y += step) years.push(y);
    const axis = years.map(y => `<line class="axis-line faint" x1="${X(y).toFixed(1)}" x2="${X(y).toFixed(1)}" y1="${T - 8}" y2="${H - B}"/><text class="axis-label" x="${X(y).toFixed(1)}" y="${H - B + 14}" text-anchor="middle">${y}</text>`).join("");
    const solid = [], gaps = [];
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1], b = line[i];
      const seg = `M${X(a.year).toFixed(1)} ${Y(a.lv).toFixed(1)}L${X(b.year).toFixed(1)} ${Y(b.lv).toFixed(1)}`;
      (held.some(y => y > a.year && y < b.year) ? gaps : solid).push(seg);
    }
    const dots = points.map(p => `<circle class="serie-dot${p.lv === 1 ? " won" : ""}" cx="${X(p.year).toFixed(1)}" cy="${Y(p.lv).toFixed(1)}" r="${p.lv === 1 ? 4.2 : 3.2}" data-open="edition:${esc(p.eid)}"><title>${esc(p.tip)}</title></circle>`).join("");
    const cups = points.filter(p => p.lv === 1).map(p => TROPHY(X(p.year), Y(p.lv))).join("");
    return `<svg class="chart traj" viewBox="0 0 ${W} ${H}" role="img">${grid}${axis}<path class="serie-line" d="${solid.join("")}"/>${gaps.length ? `<path class="serie-line serie-ausencia" d="${gaps.join("")}"/>` : ""}${dots}${cups}</svg>`;
  } });
}

/* A team's history, competition by competition: national teams in their tournaments, clubs in their international
   cups and then their leagues. Each with its line, its numbers, and its editions folded underneath. */
const FOOT_ORDER = ["worldcup", "euro", "ucl", "uel", "cwc", "fairs", "laliga", "premier"];
const CUP_LEVELS = ["", "Champion", "Final", "Semi-finals", "Quarter-finals", "Last 16", "Groups or earlier"];
function teamHistory(d, t) {
  const from = Math.min(...t.r.map(r => r.y)), to = Math.max(...t.r.map(r => r.y));
  const ord = n => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  const fin = r => r.fin === "Champion" ? `<span class="pill gold">Champion</span>` : r.fin === "Runner-up" ? `<span class="pill final">Runner-up</span>` : /^\d+$/.test(r.fin) ? `<span class="pill">${ord(+r.fin)}</span>` : `<span class="pill">${esc(r.fin)}</span>`;
  const groups = [["National teams", ["worldcup", "euro"]], ["International", ["ucl", "uel", "cwc", "fairs"]], ["National", ["laliga", "premier"]]];
  return groups.map(([gname, comps]) => {
    const secs = comps.map(c => {
      const rs = t.r.filter(r => r.c === c).sort((a, b) => a.y - b.y || a.e.localeCompare(b.e));
      if (!rs.length) return "";
      const league = d.comp[c]?.kind === "league";
      const held = d.idx.editions.filter(e => e.comp === c).map(e => e.year);
      const lv = r => league ? (r.fin === "Champion" ? 1 : +r.fin || 20) : finishLevel(r.fin);
      const points = rs.map(r => ({ year: r.y, lv: lv(r), eid: r.e, tip: `${d.ed[r.e]?.title || r.l}: ${r.fin}` }));
      const titles = rs.filter(r => r.fin === "Champion").length;
      const bestLv = Math.min(...points.map(p => p.lv));
      const p = rs.reduce((a, r) => a + (r.p || 0), 0), w = rs.reduce((a, r) => a + (r.w || 0), 0);
      return `<section class="hist"><h3>${compLnk(d, c)}</h3>
        <p class="sub">${rs.length} ${league ? "season" : "edition"}${rs.length === 1 ? "" : "s"}, ${rs[0].y} to ${rs[rs.length - 1].y} · ${titles ? `<b>${titles} title${titles === 1 ? "" : "s"}</b>` : `best: ${league ? ordinal(bestLv) : CUP_LEVELS[bestLv].toLowerCase()}`} · ${fmt(p)} matches, ${fmt(w)} won</p>
        ${trajectory({ points, held, levels: CUP_LEVELS, from, to, numeric: league })}
        <details><summary>Edition by edition</summary><table class="mini"><thead><tr><th>Edition</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num">Goals</th><th class="num">Finish</th></tr></thead>
        <tbody>${rs.slice().reverse().map(r => `<tr class="${r.fin === "Champion" ? "c" : ""}" data-go data-open="edition:${r.e}"><td>${edLnk(d, r.e)}</td><td class="num">${r.p}</td><td class="num">${r.w}</td><td class="num">${r.d}</td><td class="num">${r.l_}</td><td class="num">${r.gf}–${r.ga}</td><td class="num">${fin(r)}</td></tr>`).join("")}</tbody></table></details></section>`;
    }).join("");
    return secs && t.kind === "national" && gname !== "National teams" ? "" : secs ? `${t.kind === "club" ? `<h4 class="sec grp">${gname === "International" ? "International competitions" : "National league"}</h4>` : ""}${secs}` : "";
  }).join("");
}

/* A player's career, event by event: the Grand Slams, then the 1000s, the Finals and the Olympics. */
const TENNIS_LEVELS = ["", "Won", "Final", "Semi-finals", "Quarter-finals", "Last 16", "Last 32", "Last 64", "Earlier"];
const FINALS_LEVELS = ["", "Won", "Final", "Semi-finals", "Round robin"];
function tennisLevel(r) {
  if (r[2] === "Champion") return 1;
  if (r[2] === "Round robin") return 4;
  return Math.min(8, (r[1] || 0) + 2);
}
function playerHistory(d, p) {
  const from = Math.min(...p.r.map(r => r[3])), to = Math.max(...p.r.map(r => r[3]));
  const sets = [["Grand Slams", ["slams", "slams_w"]], ["Masters 1000", ["masters"]], ["ATP 500", ["atp500"]], ["WTA 1000", ["wta1000"]], ["ATP Finals", ["finals"]], ["WTA Finals", ["wta_finals"]], ["Olympic Games", ["olympics", "olympics_w"]]];
  const order = d.idx.competitions.map(c => c.id);
  return sets.map(([name, keys]) => {
    const rs = p.r.filter(r => keys.includes(r[5]));
    if (!rs.length) return "";
    const comps = [...new Set(rs.map(r => r[4]))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const finals = keys.includes("finals") || keys.includes("wta_finals");
    const secs = comps.map(c => {
      const cr = rs.filter(r => r[4] === c).sort((a, b) => a[3] - b[3]);
      const held = d.idx.editions.filter(e => e.comp === c).map(e => e.year);
      const points = cr.map(r => ({ year: r[3], lv: finals ? Math.min(4, tennisLevel(r)) : tennisLevel(r), eid: r[0], tip: `${d.ed[r[0]]?.title || r[0]}: ${r[2]}` }));
      const titles = cr.filter(r => r[2] === "Champion").length;
      const levels = finals ? FINALS_LEVELS : TENNIS_LEVELS;
      const bestLv = Math.min(...points.map(x => x.lv));
      const courts = [...new Set(cr.map(r => d.ed[r[0]]?.surf).filter(Boolean))].map(f => surfPill({ surf: f })).join(" ");
      return `<section class="hist"><h3>${tierBadge(c)}${compLnk(d, c)} ${courts}</h3>
        <p class="sub">${cr.length} appearance${cr.length === 1 ? "" : "s"}, ${cr[0][3]} to ${cr[cr.length - 1][3]} · ${titles ? `<b>${titles} title${titles === 1 ? "" : "s"}</b>` : `best: ${levels[bestLv].toLowerCase()}`}</p>
        ${trajectory({ points, held, levels, from, to })}
        <details><summary>Year by year</summary><table class="mini"><tbody>${cr.slice().reverse().map(r => `<tr class="${r[2] === "Champion" ? "c" : ""}" data-go data-open="edition:${r[0]}"><td>${edLnk(d, r[0])}</td><td class="num">${r[2] === "Champion" ? `<span class="pill gold">Won</span>` : r[2] === "Runner-up" ? `<span class="pill final">Final</span>` : `<span class="pill">${esc(r[2])}</span>`}</td></tr>`).join("")}</tbody></table></details></section>`;
    }).join("");
    return `<h4 class="sec grp">${name}</h4>${secs}`;
  }).join("");
}

async function cardTeam(d, key) {
  const ts = await loadTeams();
  const t = ts.find(x => x.key === key);
  if (!t) return `<h2>Team not found</h2>`;
  const line = recordLine(ts, key);
  const lineRows = [t, ...line].flatMap(x => x.r);
  const lineTitles = lineRows.filter(r => r.fin === "Champion").length;
  const lineage = await lineageSection(ts, t);
  focusEds = new Set(t.r.map(r => r.e));
  const titles = t.r.filter(r => r.fin === "Champion");
  const sum = k => t.r.reduce((a, x) => a + (x[k] || 0), 0);
  const fin = r => r.fin === "Champion" ? `<span class="pill gold">Champion</span>` : r.fin === "Runner-up" ? `<span class="pill final">Runner-up</span>` : `<span class="pill">${esc(r.fin)}</span>`;
  const ord = n => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  return `<p class="kick"><span class="dot"></span>${t.kind === "national" ? "National team" : "Club"}</p>
    <h2>${imgFor(t.key)}${esc(t.name)}</h2>
    <p class="sub">${t.kind === "national" ? `${t.r.length} tournament${t.r.length === 1 ? "" : "s"}` : clubSpan(d, t.r)} in the atlas, ${t.r[0].y} to ${t.r[t.r.length - 1].y}.</p>
    ${factsBlock([
      { big: true, label: `${titles.length} title${titles.length === 1 ? "" : "s"}`, panel: titles.length ? editionChips(d, titles.map(r => r.e).reverse()) : "" },
      ...[...new Set(titles.map(r => r.c))].sort((a, b) => FOOT_ORDER.indexOf(a) - FOOT_ORDER.indexOf(b)).map(c => ({ label: `${titles.filter(r => r.c === c).length} ${esc(d.comp[c]?.short || c)}`, panel: editionChips(d, titles.filter(r => r.c === c).map(r => r.e).reverse()), table: { q: t.name, comps: [c], rounds: d.comp[c]?.kind === "league" ? [] : ["Final"] }, tableLabel: d.comp[c]?.kind === "league" ? "Show these leagues' matches in the table" : "Show its finals in the table" })),
      { label: `${fmt(sum("p"))} matches`, table: { q: t.name }, tableLabel: `Show all ${fmt(sum("p"))} matches in the table` },
      { label: `${fmt(sum("w"))} won · ${fmt(sum("d"))} drawn · ${fmt(sum("l_"))} lost` },
      { label: `goals ${fmt(sum("gf"))}–${fmt(sum("ga"))}` },
    ])}
    ${line.length ? `<div class="keyfacts"><span class="kf lineage" title="Its own record plus the teams whose record it carries (Lineage below). Each team keeps its own card.">with its lineage: ${lineTitles} title${lineTitles === 1 ? "" : "s"}, ${fmt(lineRows.reduce((a, r) => a + (r.p || 0), 0))} matches, as ${[t, ...line].map(x => esc(line.some(y => y !== x && y.name === x.name) || (x !== t && x.name === t.name) ? x.key.slice(x.key.indexOf(":") + 1) : x.name)).join(", ")}</span></div>` : ""}
    ${lineage}
    ${teamHistory(d, t)}
    ${t.kind === "club" ? await elsewhere(key.slice(5)) : ""}
    <p class="links">${t.kind === "national" ? "Teams are kept as they played: West Germany and Germany, the Soviet Union and Russia, each have their own record. The lineage is added beside it, marked, from what the teams' Wikipedia articles say." : `Club identity is the Wikipedia page the season tables link to${key.startsWith("club:") ? `: <a href="${WIKI(key.slice(5))}" target="_blank" rel="noopener">${esc(key.slice(5))}</a>` : ""}.`}</p>`;
}

/* A club's league finishes, one dot per season, first place at the top. One series, so no legend; gold marks a
   title, gaps are seasons outside these two leagues. */
function positions(t, d) {
  const rs = t.r.filter(r => /^\d+$/.test(r.fin) || r.fin === "Champion").map(r => ({ y: r.y, pos: r.fin === "Champion" ? 1 : +r.fin, e: r.e, l: r.l, c: r.c }));
  if (rs.length < 3) return "";
  const W = 500, H = 120, L = 26, R = 8, T = 10, B = 20;
  const y0 = Math.min(...rs.map(r => r.y)), y1 = Math.max(...rs.map(r => r.y));
  const maxP = Math.max(20, ...rs.map(r => r.pos));
  const x = y => L + (y1 === y0 ? 0.5 : (y - y0) / (y1 - y0)) * (W - L - R);
  const yy = p => T + (p - 1) / (maxP - 1) * (H - T - B);
  let path = "", prev = null;
  for (const r of rs) {
    path += (prev !== null && r.y - prev === 1 ? "L" : "M") + x(r.y).toFixed(1) + " " + yy(r.pos).toFixed(1);
    prev = r.y;
  }
  const ticks = [1, 5, 10, 15, 20].filter(p => p <= maxP);
  const decades = [];
  for (let y = Math.ceil(y0 / 10) * 10; y <= y1; y += 10) decades.push(y);
  return `<h4 class="sec">League finish, season by season</h4>
    <svg class="pos" viewBox="0 0 ${W} ${H}" role="img" aria-label="League finishing position by season">
      ${ticks.map(p => `<line x1="${L}" x2="${W - R}" y1="${yy(p)}" y2="${yy(p)}" class="g"/><text x="${L - 6}" y="${yy(p) + 3}" class="ax" text-anchor="end">${p}</text>`).join("")}
      ${decades.map(y => `<text x="${x(y)}" y="${H - 5}" class="ax" text-anchor="middle">${y}</text>`).join("")}
      <path d="${path}" class="ln"/>
      ${rs.map(r => `<circle cx="${x(r.y)}" cy="${yy(r.pos)}" r="${r.pos === 1 ? 4 : 2.6}" class="${r.pos === 1 ? "t" : "p"}" data-go data-open="edition:${r.e}"><title>${esc(r.l)} ${esc(d.comp[r.c]?.short || "")}: ${r.pos === 1 ? "champion" : ordinal(r.pos)}</title></circle>`).join("")}
    </svg>`;
}
function ordinal(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

/* ------------------------------------------------------------------ boot */

readHash();
addEventListener("hashchange", () => { readHash(); render(); });
addEventListener("popstate", e => { navDepth = e.state?.depth || 0; readHash(); render(); });
addEventListener("resize", () => { if (S.view === "editions") drawTimeline(D[S.sport], current.rows); });
render().catch(err => {
  console.error(err);
  $("#count").innerHTML = `The atlas could not load (${esc(err.message)}). Serve the folder over http, not as a file.`;
});
