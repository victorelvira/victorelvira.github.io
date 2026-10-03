/* Nombres de España · map, rankings and evolution of names and surnames (INE). */
"use strict";
const DATA_V = "0.7.1";
const BUILD_AT = "2026-10-04 00:14";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const fmt = n => n == null ? "" : Number(n).toLocaleString(T("locale"));
const fmt1 = n => n == null ? "" : Number(n).toLocaleString(T("locale"), {minimumFractionDigits: 1, maximumFractionDigits: 1});
const fmt2 = n => n == null ? "" : Number(n).toLocaleString(T("locale"), {maximumFractionDigits: n < 1 ? 3 : 2});
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-ZÑÇ' ]/g, " ").replace(/\s+/g, " ").trim();
const SEXNAME = s => T("sex." + s + ".short");
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const OTHER = "#c9c2b6", NONE = "#ebe7e0", FEW = "#f4f1eb";
const SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const DIV = ["#1c5cab", "#5598e7", "#9ec5f4", "#f0efec", "#f3b3b2", "#e66767", "#b8302f"];
const DEC_LABEL = d => T("dec." + d);
const DECADES = ["1920", "1930", "1940", "1950", "1960", "1970", "1980", "1990", "2000", "2010", "2020"];
const DEC_NAME = d => T("dec." + d);
const decList = () => state.decSpan === "one" ? [DECADES[state.dec]] : DECADES.slice(Math.min(state.d1, state.d2), Math.max(state.d1, state.d2) + 1);
const decLabel = () => state.decSpan === "one" ? DEC_NAME(DECADES[state.dec])
  : `${DEC_SHORT(DECADES[Math.min(state.d1, state.d2)])}-${DEC_SHORT(DECADES[Math.max(state.d1, state.d2)])}`;
const DEC_SHORT = d => T("dec.s" + d);

// ---------- data loading
let HASH = "";
const cache = {};
async function J(path) {
  if (!cache[path]) cache[path] = fetch(`nombres/data/${path}?h=${HASH}`).then(r => r.ok ? r.json() : null).catch(() => null);
  return cache[path];
}
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(str) {
  const b = new TextEncoder().encode(str); let c = 0xFFFFFFFF;
  for (const x of b) c = CRC[(c ^ x) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
const bucket = k => (crc32(k) % 256).toString(16).padStart(2, "0");

let IDX, PLACES, BUILD, NB, GEN, SERIES_IDX = {nb: {}, rx: [], comarca: {}};
const IDXMAP = {H: new Map(), M: new Map(), A: new Map()};

function titleCase(k) {
  return k.toLowerCase().split(" ").map((w, i) => (i && ["de", "del", "la", "las", "los", "y", "i"].includes(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function disp(sex, key) {
  if (!key) return "";
  const d = sex === "A" ? IDX.disp["ap:" + key] : IDX.disp[`nm:${sex}:${key}`];
  if (d) return d;
  // compound names: each part through its own display form (rule R004, proposed)
  if (sex !== "A" && key.includes(" ")) {
    const other = sex === "H" ? "M" : "H";  // José María: the part MARIA takes its spelling from the women's list
    const parts = key.split(" ").map(p => IDX.disp[`nm:${sex}:${p}`] || IDX.disp[`nm:${other}:${p}`] || titleCase(p));
    return parts.join(" ");
  }
  return titleCase(key);
}
const placeName = k => {
  if (!k || k === "ES") return T("spain");
  const c = k[0], r = k.slice(1);
  if (c === "m" || c === "b") return PLACES.muni[r]?.n || r;
  if (c === "x") return PLACES.country?.[r] || r;
  if (c === "q") return r === "66" ? T("rank.born.abroad").toLowerCase() : (PLACES.prov[r]?.n || r);
  return PLACES.prov[r]?.n || r;
};
const provOf = k => k[0] === "m" ? PLACES.muni[k.slice(1)]?.p : k.slice(1);

// ---------- state and URL
const state = {view: "map", mode: "top", dec: 6, decSpan: "one", d1: 4, d2: 7, sex: "M", sel: null, place: null, rankArea: "ES", hideEx: false, rankN: 100, nbArea: "ES", nbSex: "M", genArea: "00", genSex: "M"};
function writeHash() {
  const p = new URLSearchParams();
  if (state.view !== "map") p.set("v", state.view);
  if (state.mode !== "top") p.set("c", state.mode);
  if (state.mode === "gen") p.set("g", state.decSpan === "one" ? String(state.dec) : `${state.d1}-${state.d2}`);
  if (state.sex !== "M") p.set("s", state.sex);
  if (state.sel) p.set("n", `${state.sel.sex}:${state.sel.key}`);
  if (state.place) p.set("l", state.place);
  if (state.view === "rank" && state.rankArea !== "ES") p.set("r", state.rankArea);
  if (LANG !== "es") p.set("l", LANG);
  const h = p.toString();
  history.replaceState(null, "", h ? "#" + h : location.pathname);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.view = ["map", "rank", "evo", "stats"].includes(p.get("v")) ? p.get("v") : "map";
  state.mode = ["top", "char", "age", "conc", "gen"].includes(p.get("c")) ? p.get("c") : "top";
  const dp = (p.get("g") || "").split("-").map(Number);
  if (dp.length === 1 && dp[0] >= 0 && dp[0] <= 10) state.dec = dp[0];
  if (dp.length === 2 && dp.every(x => x >= 0 && x <= 10)) { state.decSpan = "range"; state.d1 = dp[0]; state.d2 = dp[1]; }
  state.sex = ["H", "M", "A"].includes(p.get("s")) ? p.get("s") : "M";
  const n = p.get("n");
  if (n && n.includes(":")) { const [sex, ...k] = n.split(":"); state.sel = {sex, key: k.join(":")}; state.sex = sex; }
  state.place = p.get("l");
  if (p.get("r")) state.rankArea = p.get("r");
}

// ---------- map
let map, layer, geo;
const provLayers = {};
const hasMuniData = ine => !!PLACES.v["m" + ine];
const unitValue = {};  // ine -> {v, prov:boolean, few:boolean, label}
async function initMap() {
  map = L.map("map", {preferCanvas: true, zoomSnap: 0.25, minZoom: 4, maxZoom: 12, attributionControl: true}).setView([40.2, -3.6], 6);
  map.attributionControl.setPrefix("").addAttribution("Datos: INE, censo anual 1-1-2025 · Límites: © EuroGeographics (GISCO)");
  geo = await J("municipalities.geojson");
  layer = L.geoJSON(geo, {
    renderer: L.canvas({padding: .5, tolerance: 2}),
    style: () => ({weight: .25, color: "#ffffff", fillOpacity: 1, fillColor: NONE}),
    onEachFeature: (f, l) => {
      const ine = f.id.slice(4), pc = PLACES.muni[ine]?.p;
      (provLayers[pc] = provLayers[pc] || []).push(l);
      // a town without its own data answers as its province: hover, tooltip and click
      const group = () => hasMuniData(ine) ? [l] : (provLayers[pc] || [l]);
      l.on("mouseover", e => { group().forEach(x => { x.setStyle({weight: hasMuniData(ine) ? 1.6 : .9, color: "#1d1a17"}); x.bringToFront(); }); showMapTip(e, f); });
      l.on("mousemove", e => moveTip(e.originalEvent));
      l.on("mouseout", () => { group().forEach(x => x.setStyle({weight: .25, color: "#ffffff"})); hideTip(); });
      l.on("click", () => openPlace(hasMuniData(ine) ? "m" + ine : "p" + pc));
    },
  }).addTo(map);
  map.fitBounds([[35.9, -9.4], [43.8, 3.4]]);  // the peninsula and the Balearics, whatever the screen width
  $("#go-canarias").onclick = () => map.flyTo([28.3, -15.8], 7.5);
}
function showMapTip(e, f) {
  const ine = f.id.slice(4), u = unitValue[ine] || {};
  const m = PLACES.muni[ine];
  const prov = PLACES.prov[m?.p]?.n || "";
  $("#tip").innerHTML = hasMuniData(ine)
    ? `<b>${esc(m?.n || f.properties.name)}</b><span class="muted">${esc(prov)}</span>${u.label ? "<br>" + u.label : ""}`
    : `<b>${esc(prov)}</b><span class="muted">${T("tip.prov", {town: esc(m?.n || "")})}</span>${u.label ? "<br>" + u.label : ""}`;
  $("#tip").hidden = false; moveTip(e.originalEvent);
}
function moveTip(ev) { const t = $("#tip"); if (!ev) return; t.style.left = Math.min(ev.clientX + 14, innerWidth - 270) + "px"; t.style.top = (ev.clientY + 14) + "px"; }
function hideTip() { $("#tip").hidden = true; }

function quantBreaks(vals, n) {
  const s = vals.filter(v => v != null && isFinite(v)).sort((a, b) => a - b);
  if (!s.length) return [];
  const br = [];
  for (let i = 1; i < n; i++) br.push(s[Math.floor(i * s.length / n)]);
  return [...new Set(br)];
}
const binOf = (v, br) => { let i = 0; while (i < br.length && v >= br[i]) i++; return i; };

function placeVal(ine) {
  const mv = PLACES.v["m" + ine];
  if (mv) return {v: mv, prov: false};
  const p = PLACES.muni[ine]?.p;
  return {v: PLACES.v["p" + p], prov: true};
}

// R007: the eight men's nº 1 names take the series colours in order of towns; each woman's name takes the colour of
// the man's name it most often shares the nº 1 with (one-to-one, largest counts first), so the regions keep their colour
let STATS = null;
function topColours(sex, counts) {
  const byCount = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  if (sex === "A" || !STATS) return new Map(byCount(counts).slice(0, 8).map((n, i) => [n, SERIES[i]]));
  const cH = new Map(), cM = new Map();
  for (const [h, m, c] of STATS.cross) { cH.set(h, (cH.get(h) || 0) + c); cM.set(m, (cM.get(m) || 0) + c); }
  const men = new Map(byCount(cH).slice(0, 8).map((n, i) => [n, SERIES[i]]));
  if (sex === "H") return men;
  const women = new Map(), used = new Set(), topW = byCount(cM).slice(0, 8);
  for (const [h, m, c] of STATS.cross) {
    if (!topW.includes(m) || women.has(m) || !men.has(h) || used.has(men.get(h))) continue;
    women.set(m, men.get(h)); used.add(men.get(h));
  }
  for (const m of topW) if (!women.has(m)) { const free = SERIES.find(c => !used.has(c)); if (free) { women.set(m, free); used.add(free); } }
  return new Map([...women.entries()].sort((a, b) => SERIES.indexOf(a[1]) - SERIES.indexOf(b[1])));
}

async function restyle() {
  if (!layer) return;
  const legend = [];
  let note = "";
  const anyMuni = Object.keys(PLACES.v).some(k => k[0] === "m");
  if (state.sel) {
    const {sex, key} = state.sel;
    const d = await nameData(sex, key);
    const byKey = new Map((d?.pl || []).map(r => [r[0], r]));
    const vals = [];
    for (const f of geo.features) {
      const ine = f.id.slice(4);
      let r = byKey.get("m" + ine), prov = false, few = false;
      if (!r) {
        if (PLACES.v["m" + ine]) few = true;
        else { r = byKey.get("p" + PLACES.muni[ine]?.p); prov = true; }
      }
      unitValue[ine] = {v: r ? r[2] : null, prov, few, count: r ? r[1] : null};
      if (r && r[2] != null && !prov) vals.push(r[2]);
      if (r && r[2] != null && prov && !anyMuni) vals.push(r[2]);
    }
    const br = quantBreaks(vals.length ? vals : Object.values(unitValue).map(u => u.v), 7);
    for (const [ine, u] of Object.entries(unitValue)) {
      u.fill = u.few ? FEW : u.v == null ? NONE : SEQ[binOf(u.v, br)];
      u.op = u.prov && anyMuni ? .55 : 1;
      u.label = u.few ? `<i>${T("tip.few", {name: esc(disp(sex, key))})}</i>` : u.v == null ? `<i>${T("legend.nodata")}</i>` :
        T("tip.permil", {name: esc(disp(sex, key)), permil: fmt2(u.v), n: fmt(u.count), prov: u.prov ? T("tip.ofprov") : ""});
    }
    const lo = [0, ...br];
    SEQ.slice(0, br.length + 1).forEach((c, i) => legend.push([c, i === br.length ? T("legend.permilplus", {a: fmt2(lo[i])}) : T("legend.permilrange", {a: fmt2(lo[i]), b: fmt2(br[i])})]));
    legend.push([FEW, T("legend.few")]);
    note = T("map.name.note", {who: T("who." + sex)});
    setLegend(`${esc(disp(sex, key))}`, legend, note);
  } else {
    const sex = state.sex, mode = state.mode;
    if (mode === "top") {
      const counts = new Map();
      for (const f of geo.features) { const {v} = placeVal(f.id.slice(4)); const t = v?.["t" + sex]; if (t) counts.set(t, (counts.get(t) || 0) + 1); }
      const col = topColours(sex, counts);
      const top = [...col.keys()];
      for (const f of geo.features) {
        const ine = f.id.slice(4), {v, prov} = placeVal(ine), t = v?.["t" + sex];
        unitValue[ine] = {fill: t ? (col.get(t) || OTHER) : v ? FEW : NONE, op: prov && anyMuni ? .55 : 1,
          label: t ? T("map.top.label", {name: esc(disp(sex, t)), prov: prov ? T("tip.provshort") : ""}) : `<i>${T(v ? "legend.none5" : "legend.nodata")}</i>`};
      }
      top.forEach(n => legend.push([col.get(n), disp(sex, n), counts.get(n)]));
      legend.push([OTHER, T("legend.other")]);
      note = T("map.top.note") + (sex !== "A" ? T("map.top.note.paired") : "");
      setLegend(T("map.top.title", {sex: SEXNAME(sex).toLowerCase()}), legend, note);
    } else if (mode === "char") {
      const br = [2, 3, 5, 10, 20];
      for (const f of geo.features) {
        const ine = f.id.slice(4), {v, prov} = placeVal(ine), k = v?.["k" + sex];
        unitValue[ine] = {fill: k ? SEQ[1 + binOf(k[1], br)] : (v ? SEQ[0] : NONE), op: prov && anyMuni ? .55 : 1,
          label: k ? T("map.char.label", {name: esc(disp(sex, k[0])), ratio: fmt1(k[1]), prov: prov ? T("tip.provshort") : ""}) : `<i>${T(v ? "legend.none2x" : "legend.nodata")}</i>`};
      }
      legend.push([SEQ[0], T("legend.under2x")]);
      br.forEach((b, i) => legend.push([SEQ[1 + i], i === br.length - 1 ? T("legend.timesplus", {a: b}) : T("legend.times", {a: b, b: br[i + 1]})]));
      note = T("map.char.note");
      setLegend(T("map.char.title", {sex: SEXNAME(sex).toLowerCase()}), legend, note);
    } else if (mode === "gen") {
      // R009: by province of BIRTH and decade of birth; every town of a province takes its province's value
      const sx = sex === "A" ? "M" : sex;
      const decs = decList();
      const perProv = {};
      for (const [pc, bysex] of Object.entries(GEN.g)) {
        if (pc === "00") continue;
        const tally = new Map();
        for (const d of decs) for (const [n, c] of (bysex[sx]?.[d] || [])) tally.set(n, (tally.get(n) || 0) + (c || 0));
        const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best) perProv[pc] = best;
      }
      const counts = new Map();
      for (const v of Object.values(perProv)) counts.set(v[0], (counts.get(v[0]) || 0) + 1);
      // this mode has its own palette: the pairing of R007 is about today's residents, not about each generation
      const col = new Map([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n], i) => [n, SERIES[i]]));
      for (const f of geo.features) {
        const pc = PLACES.muni[f.id.slice(4)]?.p, b = perProv[pc];
        unitValue[f.id.slice(4)] = {fill: b ? (col.get(b[0]) || OTHER) : NONE, op: 1,
          label: b ? T("map.gen.label", {when: esc(decLabel()), name: esc(disp(sx, b[0])), n: fmt(b[1])}) : `<i>${T("legend.nodata")}</i>`};
      }
      [...col.keys()].filter(n => counts.get(n)).forEach(n => legend.push([col.get(n), disp(sx, n), counts.get(n)]));
      if ([...counts.keys()].some(n => !col.has(n))) legend.push([OTHER, T("legend.other")]);
      note = T("map.gen.note", {when: decLabel()});
      if (sex === "A") note = T("map.onlywomen") + note;
      setLegend(T("map.gen.title", {sex: SEXNAME(sx).toLowerCase(), when: decLabel()}), legend, note);
    } else if (mode === "age" || mode === "conc") {
      const s = sex === "A" ? "M" : sex;
      const fld = (mode === "age" ? "age" : "t10") + s;
      const vals = geo.features.map(f => placeVal(f.id.slice(4)).v?.[fld]).filter(x => x != null);
      const pal = mode === "age" ? DIV : SEQ;
      const br = quantBreaks(vals, 7);
      for (const f of geo.features) {
        const ine = f.id.slice(4), {v, prov} = placeVal(ine), x = v?.[fld];
        unitValue[ine] = {fill: x == null ? NONE : pal[binOf(x, br)], op: prov && anyMuni ? .55 : 1,
          label: x == null ? `<i>${T("legend.nodata")}</i>` : T(mode === "age" ? "map.age.label" : "map.conc.label", {v: fmt1(x)})};
      }
      const lo = [Math.min(...vals), ...br];
      const unit = mode === "age" ? T("unit.years") : " %";
      pal.slice(0, br.length + 1).forEach((c, i) => legend.push([c, i < br.length ? T("legend.range", {a: fmt1(lo[i]), b: fmt1(br[i]), unit}) : T("legend.rangeplus", {a: fmt1(lo[i]), unit})]));
      note = T(mode === "age" ? "map.age.note" : "map.conc.note");
      if (sex === "A") note = T("map.onlywomen") + note;
      setLegend(T(mode === "age" ? "map.age.title" : "map.conc.title", {sex: SEXNAME(s).toLowerCase()}), legend, note);
    }
  }
  layer.eachLayer(l => { const u = unitValue[l.feature.id.slice(4)] || {}; l.setStyle({fillColor: u.fill || NONE, fillOpacity: u.op ?? 1}); });
  const chip = $("#sel-chip");
  if (state.sel) {
    chip.hidden = false;
    chip.innerHTML = `<span>${esc(disp(state.sel.sex, state.sel.key))} <small style="opacity:.75">${SEXNAME(state.sel.sex).toLowerCase()}</small></span><button type="button">✕</button>`;
    chip.querySelector("button").onclick = () => { state.sel = null; writeHash(); restyle(); syncSummary(); };
  } else chip.hidden = true;
}
$("#legend").addEventListener("click", () => { if (isPhone()) $("#legend").classList.toggle("open"); });
function setLegend(title, rows, note) {
  $("#legend").innerHTML = `<div class="lt">${title}</div>` + rows.map(([c, t, n]) =>
    `<div class="lr"><span class="sw" style="background:${c}"></span><span>${esc(t)}</span>${n != null ? `<span class="ln">${fmt(n)}</span>` : ""}</div>`).join("") +
    (note ? `<div class="note">${esc(note)}</div>` : "");
}

// ---------- per-name data
async function nameData(sex, key) {
  const k = sex === "A" ? key : `${sex}:${key}`;
  const b = await J(`${sex === "A" ? "a" : "n"}/${bucket(k)}.json`);
  return b?.[k] || null;
}
async function areaData(placeKey) {
  return await J(`area/${placeKey}.json`);
}

// ---------- panel
function showPanel(html) {
  $("#panel-body").innerHTML = html;
  $("#panel").scrollTop = 0;
  document.body.classList.add("has-ficha");
}
const isPhone = () => matchMedia("(max-width: 760px)").matches;
function closePanel() {
  document.body.classList.remove("has-ficha");
  state.place = null;
  // on a phone the ficha covers the map: closing must leave the map, not reopen the welcome text over it
  if (state.view === "map" && !isPhone()) showWelcome();
  writeHash();
}
$("#detail-close").onclick = closePanel;

function idxRow(sex, key) { return IDXMAP[sex].get(key); }
function exBadge(sex, key) {
  const r = idxRow(sex, key);
  if (!r) return "";
  const share = sex === "A" ? r[4] : r[3], bound = sex === "A" ? r[5] : r[4];
  if (share == null) return "";
  if ((bound === 0 && share >= 50) || bound === 2) return `<span class="badge ex" title="${T("badge.ex.title")}">${T("badge.ex", {share: bound === 2 ? T("badge.ex.mostly") : share + " %"})}</span>`;
  return "";
}
const isForeignMajority = (sex, key) => { const r = idxRow(sex, key); if (!r) return false; const s = sex === "A" ? r[4] : r[3], b = sex === "A" ? r[5] : r[4]; return (b === 0 && s >= 50) || b === 2; };

function nameLink(sex, key, text) { return `<span class="lnk" data-name="${sex}:${esc(key)}">${esc(text ?? disp(sex, key))}</span>`; }
function placeLink(k) { return `<span class="lnk" data-place="${esc(k)}">${esc(placeName(k))}</span>`; }
document.addEventListener("click", e => {
  const n = e.target.closest("[data-name]");
  if (n) { const [sex, ...k] = n.dataset.name.split(":"); openName(sex, k.join(":")); return; }
  const p = e.target.closest("[data-place]");
  if (p) { openPlace(p.dataset.place); return; }
  const ra = e.target.closest("[data-rankarea]");
  if (ra) { state.rankArea = ra.dataset.rankarea; setView("rank"); }
});

function listTable(rows, opts) {
  // rows: [{sex, key, count, permil, extra}]
  const max = Math.max(...rows.map(r => r.permil || 0), 0.0001);
  return `<table class="rl">${rows.map((r, i) => `<tr><td class="r">${r.rank ?? i + 1}</td><td class="n">${r.place ? placeLink(r.place) : nameLink(r.sex, r.key)}${r.badge || ""}</td>
    <td class="bar"><div class="b" style="width:${Math.max(2, 100 * (r.permil || 0) / max)}%"></div></td>
    <td class="v">${fmt2(r.permil)} ‰<br><small>${fmt(r.count)}${r.extra || ""}</small></td></tr>`).join("")}</table>`;
}

async function openPlace(k) {
  if (!k) return;
  state.place = k; writeHash();
  const a = await areaData(k);
  const isMuni = k[0] === "m";
  const pc = provOf(k), prov = PLACES.prov[pc];
  const v = PLACES.v[k] || {};
  let h = `<div class="ficha"><h2>${esc(placeName(k))}</h2><div class="sub">${isMuni ? `${placeLink("p" + pc)}` : T("place.sub.prov")}${PLACES.ccaa[prov?.c] && PLACES.ccaa[prov?.c] !== prov?.n ? " · " + esc(PLACES.ccaa[prov?.c]) : ""}</div>`;
  if (!a) {
    if (isMuni && PLACES.v[k]) { showPanel(h + `<div class="note box">${T("place.nobody5")}</div><p>${placeLink("p" + pc)}</p></div>`); return; }
    h += `<div class="note box">${T(isMuni ? "place.notyet" : "place.nodata")}</div>`;
    if (isMuni) h += `<p>${placeLink("p" + pc)}</p>`;
    showPanel(h + "</div>");
    return;
  }
  h += `<div class="kpis">
    <div class="kpi"><b>${v.popM ? fmt(v.popM) : "·"}</b><span>${T("place.kpi.women")}</span></div>
    <div class="kpi"><b>${v.popH ? fmt(v.popH) : "·"}</b><span>${T("place.kpi.men")}</span></div>
    <div class="kpi"><b>${fmt1(v.ageM)} / ${fmt1(v.ageH)}</b><span>${T("place.kpi.age")} <span class="badge calc">${T("calc")}</span></span></div></div>
    <div class="note">${T("place.note.pop")}</div>`;
  {
    const s = state.sex, lst = (a[s] || []).slice(0, 40);
    if (lst.length > 3) {
      const W = Math.min(380, ($("#panel").clientWidth || 400) - 40);
      h += `<h3>${T("place.h.mosaic", {what: T("sex." + s).toLowerCase()})} <span class="h3n">${T("place.h.mosaic.sub")}</span></h3>` +
        treemapHTML(lst.map(r => ({key: r[0], count: r[1], permil: r[2]})), s, W, Math.round(W * .72), T(s === "A" ? "unit.firstsur" : "unit.people"));
    }
  }
  for (const sex of ["M", "H"]) {
    const lst = a[sex] || [];
    h += `<h3>${T("place.h.top", {sex: T("sex." + sex)})} <span class="h3n">${T("place.h.top.sub", {n: fmt(lst.length)})}</span></h3>`;
    h += listTable(lst.slice(0, 10).map(([key, count, permil]) => ({sex, key, count, permil, badge: exBadge(sex, key)})));
    if (lst.length > 10) h += `<button type="button" class="more-btn" data-rankall="${sex}">${T("place.seeall", {n: fmt(lst.length)})}</button>`;
    const ch = characteristic(sex, lst);
    if (ch.length) h += `<div class="note" style="margin-top:8px"><b>${T("place.char")}</b> <span class="badge calc">${T("calc")}</span>: ${ch.map(([key, r]) => `${nameLink(sex, key)} <small class="muted">×${fmt1(r)}</small>`).join(", ")}</div>`;
  }
  const A = a.A || [];
  h += `<h3>${T("place.h.sur")} <span class="h3n">${T("place.h.sur.sub", {n: fmt(A.length)})}</span></h3>`;
  if (A.length) {
    h += listTable(A.slice(0, 15).map(r => ({sex: "A", key: r[0], count: r[1], permil: r[2], badge: exBadge("A", r[0]), extra: r[5] ? T("place.sur.both", {n: fmt(r[5])}) : ""})));
    if (A.length > 15) h += `<button type="button" class="more-btn" data-rankall="A">${T("place.seeall", {n: fmt(A.length)})}</button>`;
    h += `<div class="note">${T("place.note.sur")}</div>`;
    const ch = characteristic("A", A);
    if (ch.length) h += `<div class="note" style="margin-top:8px"><b>${T("place.char.sur")}</b> <span class="badge calc">${T("calc")}</span>: ${ch.map(([key, r]) => `${nameLink("A", key)} <small class="muted">×${fmt1(r)}</small>`).join(", ")}</div>`;
  } else h += `<div class="note">${T("place.notdown")}</div>`;
  // surnames of the people BORN here (they may live anywhere in Spain today)
  const born = await J(`area/${isMuni ? "b" + k.slice(1) : "q" + k.slice(1)}.json`);
  if (born?.A?.length) {
    h += `<h3>${T("place.h.born")} <span class="h3n">${T("place.h.born.sub")}</span></h3>` +
      listTable(born.A.slice(0, 15).map(r => ({sex: "A", key: r[0], count: r[1], permil: r[2]})));
    const ch = characteristic("A", born.A);
    if (ch.length) h += `<div class="note" style="margin-top:8px"><b>${T("place.born.char")}</b> <span class="badge calc">${T("calc")}</span>: ${ch.map(([key, r]) => `${nameLink("A", key)} <small class="muted">×${fmt1(r)}</small>`).join(", ")}</div>`;
    h += `<div class="note">${T("place.born.note", {level: T(isMuni ? "kind.m" : "kind.p")})}</div>`;
  }
  h += await localSeriesHTML(k);
  h += `<h3>${T("place.h.more")}</h3><p class="note"><span class="lnk" data-rank="${esc(k)}" style="color:var(--accent);cursor:pointer">${T("place.rankall", {place: esc(placeName(k))})}</span></p>`;
  h += `<p class="note">${T("place.source", {level: T(isMuni ? "kind.m" : "kind.p")})}</p>`;
  showPanel(h + "</div>");
  $("#panel-body [data-rank]")?.addEventListener("click", () => { state.rankArea = k; setView("rank"); });
  $$("#panel-body [data-rankall]").forEach(b => b.onclick = () => { state.rankArea = k; state.sex = b.dataset.rankall; state.rankN = 0; setView("rank"); });
  $$("#panel-body svg.bump").forEach(svg => wireBump(svg.id, svg.id.includes("-H") ? "H" : svg.id.includes("-A") ? "A" : "M"));
}
// ---------- treemap (squarified): one tile per name, area proportional to the people who carry it
function squarify(values, x, y, w, h) {
  const total = values.reduce((a, b) => a + b, 0), out = [];
  if (!total) return out;
  const scale = w * h / total;
  let items = values.map((v, i) => ({i, a: v * scale})), rect = {x, y, w, h};
  const worst = (row, side) => { const s = row.reduce((a, r) => a + r.a, 0), mx = Math.max(...row.map(r => r.a)), mn = Math.min(...row.map(r => r.a)); return Math.max(side * side * mx / (s * s), s * s / (side * side * mn)); };
  const lay = row => {
    const s = row.reduce((a, r) => a + r.a, 0);
    if (rect.w >= rect.h) { const cw = s / rect.h; let cy = rect.y; for (const r of row) { const ch = r.a / cw; out[r.i] = [rect.x, cy, cw, ch]; cy += ch; } rect = {x: rect.x + cw, y: rect.y, w: rect.w - cw, h: rect.h}; }
    else { const ch = s / rect.w; let cx = rect.x; for (const r of row) { const cw = r.a / ch; out[r.i] = [cx, rect.y, cw, ch]; cx += cw; } rect = {x: rect.x, y: rect.y + ch, w: rect.w, h: rect.h - ch}; }
  };
  let row = [];
  while (items.length) {
    const side = Math.min(rect.w, rect.h), it = items[0];
    if (!row.length || worst([...row, it], side) <= worst(row, side)) { row.push(it); items.shift(); }
    else { lay(row); row = []; }
  }
  if (row.length) lay(row);
  return out;
}
function treemapHTML(rows, sex, W, H, unit) {
  // rows: [{key, count, permil}] sorted desc; the rest of the people with a name shown is one grey tile
  const vals = rows.map(r => r.count || 0);
  const boxes = squarify(vals, 0, 0, W, H);
  const pal = ["#0d366b", "#104281", "#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef"];
  return `<div class="tm" style="height:${H}px">${rows.map((r, i) => {
    const [x, y, w, h] = boxes[i] || [0, 0, 0, 0];
    if (w < 1 || h < 1) return "";
    const col = pal[Math.min(pal.length - 1, Math.floor(10 * i / Math.max(rows.length, 1)))];
    const light = Math.floor(10 * i / Math.max(rows.length, 1)) >= 8;
    const big = w > 54 && h > 30, fs = Math.max(10, Math.min(22, Math.sqrt(w * h) / 6));
    // positions in % so the mosaic fits its box whatever width it finally gets
    return `<div class="t ${light ? "light" : ""}" data-name="${sex}:${esc(r.key)}" style="left:${100 * x / W}%;top:${100 * y / H}%;width:${100 * w / W}%;height:${100 * h / H}%;background:${col};font-size:${fs}px"
      data-tip="<b>${esc(disp(sex, r.key))}</b>${fmt(r.count)} ${unit}${r.permil ? " · " + fmt2(r.permil) + " ‰" : ""}">${big ? `<b>${esc(disp(sex, r.key))}</b>${h > 44 ? `<small>${fmt(r.count)}</small>` : ""}` : ""}</div>`;
  }).join("")}</div>`;
}

// ---------- regional series (newborns by area and year; Valencian residents' top 30 by year)
const SRCNOTE = s => T("src." + s);
function seriesFromYears(byYear, sex, top) {
  const ser = new Map();
  for (const [y, lst] of Object.entries(byYear)) lst.slice(0, top).forEach(([name], i) => {
    if (!ser.has(name)) ser.set(name, {label: disp(sex, name), ranks: {}});
    ser.get(name).ranks[y] = i + 1;
  });
  return ser;
}
function nbKeysFor(k) {
  const out = [];
  const S = SERIES_IDX.nb;
  for (const key of Object.keys(S)) if (key.endsWith(":" + k)) out.push(key);
  if (k[0] === "m" && SERIES_IDX.comarca[k.slice(1)]) out.push("idescat_nadons:k" + SERIES_IDX.comarca[k.slice(1)]);
  return out.filter(x => S[x]);
}
async function localSeriesHTML(k) {
  let h = "";
  const width = Math.min(380, ($("#panel").clientWidth || 400) - 40);
  for (const key of nbKeysFor(k)) {
    const meta = SERIES_IDX.nb[key], d = await J(`nbx/${key.replace(":", "_")}.json`);
    if (!d) continue;
    const where = meta.level === "k" ? T("series.comarca", {name: meta.label}) : meta.level === "i" ? T("series.isla", {name: meta.label}) : meta.label;
    h += `<h3>${T("series.h.babies")} <span class="h3n">${T("series.h.babies.sub", {where: esc(where), years: meta.years.join("-")})}</span></h3>`;
    if (meta.src === "IECA" && meta.level === "m") {
      const ys = Object.keys({...d.M, ...d.H}).sort().reverse();
      h += `<table class="ones"><thead><tr><th>${T("evo.col.year")}</th><th>${T("series.girls")} nº 1</th><th>${T("series.boys")} nº 1</th></tr></thead><tbody>${ys.map(y =>
        `<tr><td>${y}</td>${["M", "H"].map(s => `<td>${(d[s][y] || []).map(([n, c]) => `${nameLink(s, n)} <small class="muted">${fmt(c)}</small>`).join(", ")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    } else {
      for (const s of ["M", "H"]) {
        const ys = Object.keys(d[s] || {}).sort();
        if (ys.length < 2) continue;
        h += `<div class="note" style="margin-top:6px"><b style="color:var(--ink)">${T(s === "M" ? "series.girls" : "series.boys")}</b>${T("series.top5")}</div>` +
          bump(seriesFromYears(d[s], s, 5), ys, y => "’" + y.slice(2), 5, `bx-${key}-${s}`.replace(/[^\w-]/g, ""), width);
      }
    }
    h += `<div class="note">${esc(SRCNOTE(meta.src))}.</div>`;
  }
  if (SERIES_IDX.rx.includes(k)) {
    const d = await J(`rx/${k}.json`);
    if (d) {
      h += `<h3>${T("series.h.res")} <span class="h3n">${T("series.h.res.sub")}</span></h3>`;
      for (const s of ["M", "H", "A"]) {
        const ys = Object.keys(d[s] || {}).sort();
        if (ys.length < 2) continue;
        h += `<div class="note" style="margin-top:6px"><b style="color:var(--ink)">${T("sex." + s)}</b>${T("series.res.top5")}</div>` +
          bump(seriesFromYears(d[s], s, 5), ys, y => "’" + y.slice(2), 5, `rx-${k}-${s}`, width);
      }
      h += `<div class="note">${T("series.res.note")}</div>`;
    }
  }
  return h;
}

function characteristic(sex, lst) {
  // R002: ratio of per mil here to per mil in Spain, at least 10 people
  const out = [];
  for (const r of lst) {
    const [key, count, permil] = r;
    const ir = idxRow(sex, key); const natp = sex === "A" ? ir?.[6] : ir?.[5];
    if (count >= 10 && permil && natp) out.push([key, permil / natp]);
  }
  return out.filter(x => x[1] >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6);
}

async function openName(sex, key) {
  state.sel = {sex, key}; if (state.sex !== sex) state.sex = sex;
  syncButtons();
  writeHash();
  if (state.view === "map") restyle();
  const d = await nameData(sex, key) || {};
  const r = idxRow(sex, key);
  const name = disp(sex, key);
  let h = `<div class="ficha"><h2>${esc(name)}</h2><div class="sub">${T(sex === "A" ? "name.sub.sur" : "name.sub." + sex)}${T("name.sub.ine", {key: `<code>${esc(key)}</code>`})}</div>`;
  if (sex === "A") {
    if (r && r[1] == null) h += `<div class="note box">${T("name.nofigure")}${r[7] ? T("name.floor", {n: fmt(r[7])}) : T("name.onlylocal")}</div>`;
    else h += `<div class="kpis"><div class="kpi"><b>${fmt(r?.[1])}</b><span>${T("name.kpi.first")}</span></div>
      <div class="kpi"><b>${fmt(r?.[2])}</b><span>${T("name.kpi.second")}</span></div><div class="kpi"><b>${fmt(r?.[3])}</b><span>${T("name.kpi.both")}</span></div></div>`;
    if (r?.[6]) h += `<div class="note">${T("name.note.permil.sur", {permil: fmt2(r[6])})}</div>`;
  } else {
    const rank = r ? IDX[sex].indexOf(r) + 1 : null;
    h += `<div class="kpis"><div class="kpi"><b>${fmt(r?.[1])}</b><span>${T("name.kpi.people")}</span></div>
      <div class="kpi"><b>${rank ? "nº " + fmt(rank) : "·"}</b><span>${T("name.kpi.rankin", {sex: T("kind." + sex)})}</span></div>
      <div class="kpi"><b>${r?.[2] ? fmt1(r[2]) : "·"}</b><span>${T("name.kpi.age")}</span></div></div>`;
    if (r?.[5]) h += `<div class="note">${T("name.note.permil", {permil: fmt2(r[5]), who: T("who." + sex)})}</div>`;
  }
  const ex = exBadge(sex, key);
  if (r) {
    const share = sex === "A" ? r[4] : r[3], bound = sex === "A" ? r[5] : r[4];
    if (share != null) h += `<div class="note box">${T("name.ex.sentence", {
      part: bound === 1 ? T("name.ex.less", {share: Math.max(share, 1)}) : bound === 2 ? T("name.ex.most") : share === 0 ? T("name.ex.under1") : T("name.ex.exact", {share}),
      verb: T(bound === 2 ? "name.ex.are" : "name.ex.have")})}</div>`;
  }
  // etymology
  const ety = d.ety || [];
  const SHORT = {eswiki: "Wikipedia", eswiktionary: "Wikcionario", wikidata: "Wikidata", rule_patronymic: T("name.deduction").replace(/ · $/, "")};
  const srcLink = c => { const n = SHORT[c.source_id] || srcName(c.source_id); return c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" title="${esc(srcName(c.source_id))}, ${T("name.consulted", {date: esc(c.retrieved || "")})}">${esc(n)}</a>` : esc(n); };
  const etys = ety.filter(c => c.field === "etymology" || c.field === "origin");
  const facts = [["origin_language", T("name.fact.lang")], ["meaning", T("name.fact.meaning")], ["surname_type", T("name.fact.surtype")]]
    .map(([f, label]) => [label, ety.filter(c => c.field === f)]).filter(x => x[1].length);
  const eqs = ety.filter(c => c.field === "equivalent");
  h += `<h3>${T("name.h.origin")}</h3>`;
  if (facts.length) h += facts.map(([label, cs]) => `<div class="note" style="margin:3px 0"><b style="color:var(--ink)">${label}:</b> ${cs.map(c => `${esc(c.value)} <small>(${srcLink(c)}${c.status === "proposed" ? T("name.unconfirmed") : ""})</small>`).join(" · ")}</div>`).join("");
  if (etys.length) h += etys.map(c => {
    const q = c.quote && c.quote !== c.value && !c.value.startsWith(c.quote.replace(/…$/, "").slice(0, 40)) ? `<br>«${esc(c.quote)}»` : "";
    return `<div class="ety ${c.status === "proposed" ? "proposed" : ""}"><div class="q">${esc(c.value)}</div><div class="src">${c.status === "proposed" ? T("name.deduction") : ""}${srcLink(c)}, ${T("name.consulted", {date: esc(c.retrieved || "")})}${q}</div></div>`;
  }).join("");
  if (!etys.length && !facts.length) h += `<div class="note">${sex !== "A" && key.includes(" ") ? T("name.compound") + key.split(" ").map(p => nameLink(sex, p)).join(" · ") : T("name.noety")}</div>`;
  const LANGNAME = l => T("lang." + l);  // not LANG: that is the language of the page
  if (eqs.length) h += `<div style="margin-top:10px" class="note">${T("name.h.langs")}</div><div class="eq">${eqs.map(c => `<span title="${esc(SHORT[c.source_id] || c.source_id)}">${esc(c.value)} <i>${esc(c.lang ? LANGNAME(c.lang) : "")}</i></span>`).join("")}</div>`;
  // generations
  if (sex !== "A") {
    h += `<h3>${T("name.h.gen")} <span class="h3n">${T("name.h.gen.sub")}</span></h3>`;
    h += d.dec ? decChart(d.dec) : `<div class="note">${T("name.gen.none")}</div>`;
    h += `<h3>${T("name.h.nb")} <span class="h3n">${T("name.h.nb.sub")}</span></h3>`;
    h += d.nb ? nbChart(d.nb) : `<div class="note">${T("name.nb.none")}</div>`;
  }
  // where
  const pl = d.pl || [];
  const provs = pl.filter(x => x[0][0] === "p" && x[2] != null).sort((a, b) => b[2] - a[2]);
  const munis = pl.filter(x => x[0][0] === "m" && x[2] != null && x[1] >= 20).sort((a, b) => b[2] - a[2]);
  h += `<h3>${T("name.h.where")}</h3>`;
  if (provs.length) h += `<div class="note">${T("name.where.prov", {who: sex === "A" ? T("name.where.prov.sur") : T("name.where.prov.nm", {who: T("who." + sex)})})}</div>` +
    listTable(provs.slice(0, 10).map(x => ({place: x[0], count: x[1], permil: x[2]})));
  if (munis.length) h += `<div class="note" style="margin-top:10px">${T("name.where.muni")}</div>` +
    listTable(munis.slice(0, 10).map(x => ({place: x[0], count: x[1], permil: x[2]})));
  if (!provs.length && !munis.length) h += `<div class="note">${T("name.where.none")}</div>`;
  // where its bearers were born (surnames) and which nationalities carry it most
  if (d.born?.length) {
    const bp = d.born.filter(x => x[0][0] === "q" && x[2] != null).sort((a, b) => b[2] - a[2]);
    const bm = d.born.filter(x => x[0][0] === "b" && x[2] != null && x[1] >= 20).sort((a, b) => b[2] - a[2]);
    h += `<h3>Dónde nacieron quienes lo llevan</h3>`;
    if (bp.length) h += `<div class="note">Provincia de nacimiento, por cada 1.000 nacidos allí (primer apellido):</div>` +
      listTable(bp.filter(x => x[0] !== "q66").slice(0, 8).map(x => ({place: "p" + x[0].slice(1), count: x[1], permil: x[2]}))) +
      (bp.find(x => x[0] === "q66") ? `<div class="note">Nacidos en el extranjero: ${fmt(bp.find(x => x[0] === "q66")[1])} (${fmt2(bp.find(x => x[0] === "q66")[2])} ‰).</div>` : "");
    if (bm.length) h += `<div class="note" style="margin-top:10px">Municipio de nacimiento (al menos 20 personas):</div>` +
      listTable(bm.slice(0, 8).map(x => ({place: "m" + x[0].slice(1), count: x[1], permil: x[2]})));
  }
  if (d.nat?.length) {
    const nat = d.nat.filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 8);
    h += `<h3>Nacionalidades <span class="h3n">(residentes en España con otra nacionalidad que lo llevan)</span></h3>` +
      `<table class="rl">${nat.map((x, i) => `<tr><td class="r">${i + 1}</td><td class="n"><span class="lnk" data-rankarea="x${esc(x[0])}">${esc(PLACES.country?.[x[0]] || x[0])}</span></td><td class="v">${fmt(x[1])}<br><small>${T("name.nat.permil", {permil: fmt2(x[2])})}</small></td></tr>`).join("")}</table>`;
  }
  h += `<p class="note" style="margin-top:14px">${T("name.source")}</p>`;
  showPanel(h + "</div>");
}
let SOURCES = {};
const srcName = id => SOURCES[id]?.name || id || "";

// ---------- small charts (SVG)
function decChart(dec) {
  const ds = GEN.decades, W = 360, H = 130, L = 34, B = 22, T = 10;
  const vals = ds.map(d => dec[d] ?? null), max = Math.max(...vals.filter(v => v != null), 0.001);
  const x = i => L + i * (W - L - 8) / (ds.length - 1), y = v => T + (H - T - B) * (1 - v / max);
  let pts = [], dots = "", hits = "";
  ds.forEach((d, i) => {
    const v = vals[i];
    if (v != null) { pts.push(`${x(i)},${y(v)}`); dots += `<circle class="dot" cx="${x(i)}" cy="${y(v)}" r="4"/>`; }
    hits += `<rect class="hit" x="${x(i) - 14}" y="0" width="28" height="${H}" data-tip="<b>${T("chart.bornin", {when: DEC_LABEL(d)})}</b>${v != null ? fmt2(v) + " ‰" : T("chart.outoflist")}"/>`;
  });
  const grid = [0, .5, 1].map(f => `<line class="grid" x1="${L}" x2="${W - 8}" y1="${y(max * f)}" y2="${y(max * f)}"/><text x="${L - 4}" y="${y(max * f) + 4}" text-anchor="end">${fmt2(max * f)}</text>`).join("");
  const xl = ds.map((d, i) => i % 2 === 0 || i === ds.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${DEC_SHORT(d)}</text>` : "").join("");
  return `<svg class="ch" viewBox="0 0 ${W} ${H}">${grid}${xl}<polyline class="ln" points="${pts.join(" ")}"/>${dots}${hits}</svg>
    <div class="note">${T("name.gen.note")}</div>`;
}
function nbChart(nb) {
  const years = []; for (let y = 2002; y <= 2024; y++) years.push(String(y));
  const W = 360, H = 130, L = 34, B = 22, T = 10, maxR = 100;
  const x = i => L + i * (W - L - 8) / (years.length - 1), y = r => T + (H - T - B) * (Math.log(r) / Math.log(maxR));
  let segs = [], cur = [], dots = "", hits = "";
  years.forEach((yr, i) => {
    const v = nb[yr];
    if (v) { cur.push(`${x(i)},${y(v[0])}`); dots += `<circle class="dot" cx="${x(i)}" cy="${y(v[0])}" r="3.2"/>`; }
    else if (cur.length) { segs.push(cur); cur = []; }
    hits += `<rect class="hit" x="${x(i) - 7}" y="0" width="14" height="${H}" data-tip="<b>${yr}</b>${v ? T("chart.rankbabies", {rank: v[0], n: fmt(v[1])}) : T("chart.outof100")}"/>`;
  });
  if (cur.length) segs.push(cur);
  const grid = [1, 3, 10, 30, 100].map(r => `<line class="grid" x1="${L}" x2="${W - 8}" y1="${y(r)}" y2="${y(r)}"/><text x="${L - 4}" y="${y(r) + 4}" text-anchor="end">${r}</text>`).join("");
  const xl = years.map((yr, i) => i % 4 === 0 || i === years.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${yr}</text>` : "").join("");
  return `<svg class="ch" viewBox="0 0 ${W} ${H}">${grid}${xl}${segs.map(s => `<polyline class="ln" points="${s.join(" ")}"/>`).join("")}${dots}${hits}</svg>
    <div class="note">${T("name.nb.note")}</div>`;
}
document.addEventListener("mouseover", e => {
  const t = e.target.closest("[data-tip]");
  if (!t) return;
  $("#tip").innerHTML = t.dataset.tip; $("#tip").hidden = false; moveTip(e);
});
document.addEventListener("mousemove", e => { if (!$("#tip").hidden && e.target.closest("[data-tip]")) moveTip(e); });
document.addEventListener("mouseout", e => { if (e.target.closest("[data-tip]")) hideTip(); });

// ---------- welcome / about
function showWelcome() {
  const c = BUILD.counts;
  showPanel(`<div class="ficha"><h2>${T("brand")}</h2><div class="sub">${T("tagline")}</div>
    <p>${T("welcome.lead")}</p>
    <p class="note">${T("welcome.permil")}</p>
    <div class="kpis"><div class="kpi"><b>${fmt(c.names_M)}</b><span>${T("welcome.women")}</span></div><div class="kpi"><b>${fmt(c.names_H)}</b><span>${T("welcome.men")}</span></div><div class="kpi"><b>${fmt(c.surnames)}</b><span>${T("welcome.surnames")}</span></div></div>
    <h3>${T("welcome.start")}</h3>
    <p>${[["M", "MARIA"], ["H", "JOSE"], ["M", "LUCIA"], ["H", "HUGO"], ["M", "ANE"], ["H", "XABIER"], ["M", "MONTSERRAT"], ["H", "MOHAMED"], ["A", "GARCIA"], ["A", "FERNANDEZ"], ["A", "RODRIGUEZ"], ["A", "SANCHEZ"]].map(([s, k]) => nameLink(s, k)).join(" · ")}</p>
    <p class="note">${T("welcome.coverage")}</p>
    <p class="note"><span class="lnk" id="about-link" style="color:var(--accent);cursor:pointer">${T("welcome.aboutlink")}</span></p></div>`);
  $("#about-link").onclick = showAbout;
}
function showAbout() {
  const sister = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
    ? "../prenoms_francia/prenoms.html" : "https://victorelvira.github.io/projects/prenoms.html";
  showPanel(`<div class="ficha about"><h2>${T("about.h")}</h2><div class="sub">${T("about.sub")}</div>
  <h3>${T("about.h.sources")}</h3>
  <ul>${["about.src1", "about.src2", "about.src3", "about.src4", "about.src5", "about.src6", "about.src7"].map(k => `<li>${T(k)}</li>`).join("")}</ul>
  <h3>${T("about.h.read")}</h3>
  <ul>${["about.r1", "about.r2", "about.r3", "about.r4"].map(k => `<li>${T(k)}</li>`).join("")}</ul>
  <h3>${T("about.h.ex")}</h3>
  <p>${T("about.ex")}</p>
  <h3>${T("about.h.calc")}</h3>
  <ul>${["about.c1", "about.c2", "about.c3", "about.c4"].map(k => `<li>${T(k)}</li>`).join("")}</ul>
  <h3>${T("about.h.sister")}</h3>
  <p class="note">${T("about.sister", {url: sister})}</p>
  <p class="note">${T("about.quotes")}</p>
  <p class="note">${T("about.nonprofit")}</p></div>`);
}


// link to the sibling project: the same folder on the published site, a sibling folder when served locally
(() => {
  const a = document.querySelector(".sister");
  if (!a) return;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  a.href = local ? a.dataset.local : a.dataset.web;
})();

// ---------- rankings view
async function renderRank() {
  const w = $("#rankwrap");
  const sex = state.sex;
  const opts = [`<option value="ES">${T("spain")}</option>`].concat(Object.entries(PLACES.prov).sort((a, b) => a[1].n.localeCompare(b[1].n, T("locale"))).map(([pc, p]) => `<option value="p${pc}">${esc(p.n)}</option>`));
  if (state.rankArea[0] === "m") opts.splice(1, 0, `<option value="${state.rankArea}">${esc(placeName(state.rankArea))} (${T("kind.m")})</option>`);
  if (sex === "A") opts.push(`<optgroup label="${T("rank.group.born")}">${Object.entries(PLACES.prov).sort((a, b) => a[1].n.localeCompare(b[1].n, T("locale"))).map(([pc, p]) => `<option value="q${pc}">${T("rank.born.in", {prov: esc(p.n)})}</option>`).join("")}<option value="q66">${T("rank.born.abroad")}</option></optgroup>`);
  opts.push(`<optgroup label="${T("rank.group.nat")}">${(PLACES.xs || []).map(c => [c, PLACES.country?.[c] || c]).sort((a, b) => a[1].localeCompare(b[1], T("locale"))).map(([c, n]) => `<option value="x${c}">${esc(n)}</option>`).join("")}</optgroup>`);
  let rows = [];
  if (state.rankArea === "ES") {
    // Spain: only names with a national figure (surnames outside the INE's national top 5 000 have none)
    rows = IDX[sex].filter(r => r[1] != null).map(r => sex === "A" ? {key: r[0], count: r[1], permil: r[6], n2: r[2], nb: r[3]} : {key: r[0], count: r[1], permil: r[5], age: r[2]});
  } else {
    const a = await areaData(state.rankArea);
    rows = (a?.[sex] || []).map(r => sex === "A" ? {key: r[0], count: r[1], permil: r[2], n2: r[3], nb: r[5]} : {key: r[0], count: r[1], permil: r[2], age: idxRow(sex, r[0])?.[2]});
  }
  const all = rows.length;
  rows.forEach((r, i) => r.rank = i + 1);
  if (state.hideEx) rows = rows.filter(r => !isForeignMajority(sex, r.key));
  const hidden = all - rows.length;
  const shown = state.rankN ? rows.slice(0, state.rankN) : rows;
  const max = Math.max(...shown.map(r => r.permil || 0), 0.001);
  const ra = state.rankArea;
  const title = T("rank.title", {sex: T("sex." + sex), where: ra === "ES" ? T("spain") : ra[0] === "x" ? T("rank.where.nat", {name: placeName(ra)}) : ra[0] === "q" ? T("rank.where.born", {name: placeName(ra)}) : placeName(ra)});
  const tmW = Math.min(980, (w.clientWidth || 900) - 40);
  const tmHTML = rows.length > 3 ? `<div class="tm-card"><h3>${T("rank.mosaic")}</h3><p class="note">${T("rank.mosaic.note", {what: T(sex === "A" ? "kind.A" : "rank.col.name").toLowerCase()})}</p>${treemapHTML(rows.slice(0, 60), sex, tmW - 28, Math.round(Math.min(520, tmW * .55)), T(sex === "A" ? "unit.firstsur" : "unit.people"))}</div>` : "";
  w.innerHTML = `<div class="tools">
      <select id="r-area">${opts.join("")}</select>
      <label class="chip toggle"><input type="checkbox" id="r-ex" ${state.hideEx ? "checked" : ""}> ${T("rank.hideex")}</label>
      <select id="r-n"><option value="100">${T("rank.n100")}</option><option value="500">${T("rank.n500")}</option><option value="0">${T("rank.nall")}</option></select>
    </div>
    <div class="rank-title">${esc(title)}</div>
    ${tmHTML}
    <p class="note">${T("rank.count", {n: fmt(all), what: T(sex === "A" ? "sex.A" : "rank.col.name").toLowerCase()})}${hidden ? T("rank.hidden", {n: fmt(hidden)}) : ""}. ${sex === "A" ? T("rank.note.sur") : T("rank.note.nm", {who: T("who." + sex)})}${T("rank.note.click")}</p>
    <table class="rank-table ${sex === "A" ? "sur" : ""}"><thead><tr><th class="v">#</th><th>${T(sex === "A" ? "rank.col.surname" : "rank.col.name")}</th><th class="v">${T(sex === "A" ? "rank.col.first" : "rank.col.people")}</th><th class="v">‰</th><th></th>${sex === "A" ? `<th class="v">${T("rank.col.second")}</th><th class="v">${T("rank.col.both")}</th>` : `<th class="v">${T("rank.col.age")}</th>`}<th class="v">${T("rank.col.ex")}</th></tr></thead>
    <tbody>${shown.map(r => {
      const ir = idxRow(sex, r.key); const share = ir ? (sex === "A" ? ir[4] : ir[3]) : null, bound = ir ? (sex === "A" ? ir[5] : ir[4]) : 0;
      return `<tr><td class="v muted">${r.rank}</td><td class="n" data-name="${sex}:${esc(r.key)}">${esc(disp(sex, r.key))}</td><td class="v">${fmt(r.count)}</td><td class="v">${fmt2(r.permil)}</td>
      <td style="width:18%"><div class="b" style="width:${Math.max(2, 100 * (r.permil || 0) / max)}%"></div></td>
      ${sex === "A" ? `<td class="v">${fmt(r.n2)}</td><td class="v">${fmt(r.nb)}</td>` : `<td class="v">${r.age ? fmt1(r.age) : ""}</td>`}
      <td class="v muted">${share == null ? "" : bound === 1 ? "<" + share + " %" : bound === 2 ? T("name.ex.most").toLowerCase() : share + " %"}</td></tr>`;
    }).join("")}</tbody></table>
    ${shown.length < rows.length ? `<p style="text-align:center;margin:12px 0"><button type="button" class="chip btn" id="r-all">${T("rank.showall", {n: fmt(rows.length)})}</button></p>` : ""}
    <p class="note">${T("rank.source")}</p>`;
  $("#r-area").value = state.rankArea;
  if ($("#r-area").value !== state.rankArea) { state.rankArea = "ES"; return renderRank(); }
  $("#r-n").value = String(state.rankN);
  $("#r-area").onchange = e => { state.rankArea = e.target.value; writeHash(); renderRank(); };
  $("#r-ex").onchange = e => { state.hideEx = e.target.checked; renderRank(); };
  $("#r-n").onchange = e => { state.rankN = +e.target.value; renderRank(); };
  $("#r-all")?.addEventListener("click", () => { const y = $("#rankwrap").scrollTop; state.rankN = 0; renderRank().then(() => $("#rankwrap").scrollTop = y); });
}

// ---------- evolution view
function bump(series, xs, xlabel, maxRank, id, width) {
  // series: Map name -> {label, ranks: {x: rank}}; drawn at the real width so text stays 11 px
  const W = width || Math.max(560, Math.min(1060, ($("#evowrap").clientWidth || 900) - 70)), H = 36 + maxRank * (width ? 24 : 32);
  const L = W < 640 ? 92 : 120, R = W < 640 ? 92 : 120, T = 22, B = 26;
  const x = i => L + i * (W - L - R) / (xs.length - 1), y = r => T + (r - 1) * (H - T - B) / (maxRank - 1);
  let g = "";
  const grid = xs.map((v, i) => `<line class="grid" x1="${x(i)}" x2="${x(i)}" y1="${T - 8}" y2="${H - B + 4}"/>${W < 640 && xs.length > 12 && i % 2 ? "" : `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${esc(xlabel(v))}</text>`}`).join("");
  const ranksL = Array.from({length: maxRank}, (_, i) => `<text x="4" y="${y(i + 1) + 4}">${i + 1}</text>`).join("");
  for (const [key, s] of series) {
    let segs = [], cur = [], dots = "";
    xs.forEach((v, i) => {
      const r = s.ranks[v];
      if (r && r <= maxRank) { cur.push(`${x(i)},${y(r)}`); dots += `<circle class="dot" cx="${x(i)}" cy="${y(r)}" r="4.5"><title>${esc(s.label)} · ${esc(xlabel(v))}: nº ${r}</title></circle>`; }
      else if (cur.length) { segs.push(cur); cur = []; }
    });
    if (cur.length) segs.push(cur);
    const first = xs.findIndex(v => s.ranks[v] && s.ranks[v] <= maxRank), lastV = xs[xs.length - 1], firstV = xs[0];
    let labels = "";
    if (s.ranks[firstV] && s.ranks[firstV] <= maxRank) labels += `<text class="lbl" x="${x(0) - 10}" y="${y(s.ranks[firstV]) + 4}" text-anchor="end">${esc(s.label)}</text>`;
    if (s.ranks[lastV] && s.ranks[lastV] <= maxRank) labels += `<text class="lbl" x="${x(xs.length - 1) + 10}" y="${y(s.ranks[lastV]) + 4}">${esc(s.label)}</text>`;
    if (!labels && first >= 0) labels += `<text class="lbl" x="${x(first)}" y="${y(s.ranks[xs[first]]) - 9}" text-anchor="middle">${esc(s.label)}</text>`;
    g += `<g class="s" data-k="${esc(key)}">${segs.map(p => `<polyline class="ln" points="${p.join(" ")}"/>`).join("")}${dots}${labels}</g>`;
  }
  // at its own pixel width inside a horizontal scroller, so a phone scrolls it instead of shrinking the text
  return `<div class="scrollx"><svg class="ch bump" id="${id}" viewBox="0 0 ${W} ${H}" style="width:${W}px;max-width:none">${grid}${ranksL}${g}</svg></div>`;
}
// Hover lights a line in the colour it would keep if clicked; leaving it puts it back. A click pins that colour
// (click again to unpin) and the next hover previews the next colour. The hovered line is NOT re-appended to the
// SVG: moving the node under the pointer made the browser skip "mouseleave" and the colour stayed on.
let pinNext = 0;
function wireBump(id, sex) {
  const svg = document.getElementById(id);
  if (!svg) return;
  svg.querySelectorAll("g.s").forEach(g => {
    g.addEventListener("mouseenter", () => {
      if (g.classList.contains("pin")) return;
      g.style.setProperty("--hl", SERIES[pinNext % SERIES.length]);
      g.classList.add("on");
    });
    g.addEventListener("mouseleave", () => {
      if (g.classList.contains("pin")) return;
      g.classList.remove("on");
      g.style.removeProperty("--hl");
    });
    g.querySelectorAll("text.lbl").forEach(lb => {  // the name opens the ficha, the line pins the colour
      lb.style.cursor = "pointer";
      lb.addEventListener("click", e => { e.stopPropagation(); openName(sex, g.dataset.k); });
    });
    g.addEventListener("click", e => {
      if (g.classList.contains("pin")) {
        g.classList.remove("pin", "on");
        g.style.removeProperty("--hl");
      } else {
        g.style.setProperty("--hl", SERIES[pinNext % SERIES.length]);
        pinNext++;
        g.classList.add("pin");
        g.parentNode.appendChild(g);  // safe here: the click is over, not a hover
      }
    });
  });
}
async function renderEvo() {
  const w = $("#evowrap");
  const regional = state.nbArea.includes(":");
  const nbData = regional ? (await J(`nbx/${state.nbArea.replace(":", "_")}.json`)) : NB[state.nbArea];
  const years = Object.keys((nbData || NB.ES)[state.nbSex] || NB.ES.M).sort();
  const LV = {p: T("kind.p"), i: T("series.isla", {name: ""}).trim(), k: T("series.comarca", {name: ""}).trim(), m: T("kind.m"), c: "CCAA"};
  const groups = {};
  for (const [key, m] of Object.entries(SERIES_IDX.nb)) {
    if (m.src === "IECA" && m.level === "m") continue;  // only the nº 1 per town: shown in the town's ficha
    (groups[m.src] = groups[m.src] || []).push([key, `${m.label} (${LV[m.level] || m.level}, ${m.years.join("-")})`]);
  }
  const GL = {IECA: "Andalucía · IECA", IBESTAT: "Illes Balears · IBESTAT", Idescat: "Catalunya · Idescat"};
  const ccaaOpts = [`<optgroup label="INE · 2002-2024"><option value="ES">${T("spain")}</option>`].concat(Object.keys(NB).filter(k => k !== "ES").sort().map(k => `<option value="${k}">${esc(PLACES.ccaa[k] || k)}</option>`)).concat(["</optgroup>"])
    .concat(Object.entries(groups).map(([g, lst]) => `<optgroup label="${esc(GL[g] || g)}">${lst.sort((a, b) => a[1].localeCompare(b[1], "es")).map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join("")}</optgroup>`));
  const genName = k => k === "66" ? T("evo.gen.abroad") : (PLACES.prov[k]?.n ? T("evo.gen.born", {prov: PLACES.prov[k].n}) : k);
  const genOpts = [`<option value="00">${T("spain")}</option>`].concat(Object.keys(GEN.g).filter(k => k !== "00").sort((a, b) => genName(a).localeCompare(genName(b), "es")).map(k => `<option value="${k}">${esc(genName(k))}</option>`));
  const seg = (id, v) => `<span class="seg" id="${id}">${["M", "H"].map(s => `<button type="button" class="seg-btn ${v === s ? "active" : ""}" data-s="${s}">${SEXNAME(s)}</button>`).join("")}</span>`;
  // newborns
  const nb = nbData?.[state.nbSex] || {};
  const maxR = 10;
  const ser = new Map();
  for (const y of years) {
    const lst = (nb[y] || []).filter(r => r[0] !== "TOTAL");
    lst.forEach(([name], i) => {
      if (!ser.has(name)) ser.set(name, {label: disp(state.nbSex, name), ranks: {}});
      ser.get(name).ranks[y] = i + 1;
    });
  }
  for (const [k, s] of ser) if (!Object.values(s.ranks).some(r => r <= maxR)) ser.delete(k);
  const ones = years.map(y => { const l = (nb[y] || []).filter(r => r[0] !== "TOTAL"); const tot = (nb[y] || []).find(r => r[0] === "TOTAL"); return [y, l[0], tot]; });
  // generations
  const gen = GEN.g[state.genArea]?.[state.genSex] || {};
  const gser = new Map();
  for (const d of GEN.decades) (gen[d] || []).forEach(([name], i) => {
    if (!gser.has(name)) gser.set(name, {label: disp(state.genSex, name), ranks: {}});
    gser.get(name).ranks[d] = i + 1;
  });
  for (const [k, s] of gser) if (!Object.values(s.ranks).some(r => r <= maxR)) gser.delete(k);
  w.innerHTML = `<div class="evo-grid">
    <div class="card"><h2>${T("evo.h.nb")}</h2>
      <p class="note">${T("evo.nb.note")}</p>
      <div class="tools"><select id="nb-area">${ccaaOpts.join("")}</select>${seg("nb-sex", state.nbSex)}</div>
      ${bump(ser, years, y => "’" + y.slice(2), maxR, "bump-nb")}
      ${regional ? `<p class="note">${T("evo.nb.regional", {src: esc(SRCNOTE(SERIES_IDX.nb[state.nbArea]?.src || ""))})}</p>` : ""}
      <table class="ones"><thead><tr><th>${T("evo.col.year")}</th><th>${T("evo.col.one")}</th><th class="v">${T("evo.col.babies")}</th><th class="v">${T("evo.col.per1000")}</th></tr></thead><tbody>
      ${ones.slice().reverse().map(([y, r, t]) => r ? `<tr><td>${y}</td><td>${nameLink(state.nbSex, r[0])}</td><td class="v">${fmt(r[1])}</td><td class="v">${t ? fmt1(1000 * r[1] / t[1]) : ""}</td></tr>` : "").join("")}</tbody></table>
      <p class="note">${T("evo.nb.source")}</p></div>
    <div class="card"><h2>${T("evo.h.gen")}</h2>
      <p class="note">${T("evo.gen.note", {prov: state.genArea !== "00" ? T("evo.gen.prov") : ""})}</p>
      <div class="tools"><select id="gen-area">${genOpts.join("")}</select>${seg("gen-sex", state.genSex)}</div>
      ${bump(gser, GEN.decades, d => DEC_SHORT[d], maxR, "bump-gen")}
      <p class="note">${T("evo.gen.source")}</p></div>
  </div>`;
  $("#nb-area").value = state.nbArea; $("#gen-area").value = state.genArea;
  $("#nb-area").onchange = e => { state.nbArea = e.target.value; renderEvo(); };
  $("#nb-area").value = state.nbArea;
  $("#gen-area").onchange = e => { state.genArea = e.target.value; renderEvo(); };
  $$("#nb-sex .seg-btn").forEach(b => b.onclick = () => { state.nbSex = b.dataset.s; renderEvo(); });
  $$("#gen-sex .seg-btn").forEach(b => b.onclick = () => { state.genSex = b.dataset.s; renderEvo(); });
  wireBump("bump-nb", state.nbSex); wireBump("bump-gen", state.genSex);
}

// ---------- pairs between the sexes (R007, R008)
function renderStats() {
  const w = $("#statswrap");
  if (!STATS) { w.innerHTML = `<p class='note'>${T("place.nodata")}</p>`; return; }
  const H = STATS.topH.slice(0, 10), M = STATS.topM.slice(0, 10);
  const cell = new Map(STATS.cross.map(([h, m, c, p]) => [h + "|" + m, [c, p]]));
  const max = Math.max(...STATS.cross.map(x => x[2]));
  const shade = c => c ? SEQ[Math.min(SEQ.length - 1, Math.floor(SEQ.length * Math.sqrt(c / max) * .999))] : "#f6f3ee";
  let x = `<table class="xt"><thead><tr><th></th>${M.map(m => `<th>${nameLink("M", m)}</th>`).join("")}</tr></thead><tbody>` +
    H.map(h => `<tr><th>${nameLink("H", h)}</th>${M.map(m => { const [c, p] = cell.get(h + "|" + m) || [0, 0]; const i = c ? SEQ.indexOf(shade(c)) : -1;
      return `<td class="${i >= 3 ? "dk" : ""} ${c ? "" : "zero"}" style="background:${shade(c)}" data-tip="${c ? T("stats.cell", {man: esc(disp("H", h)), woman: esc(disp("M", m)), n: fmt(c), pop: fmt(p)}) : T("stats.cell.never", {man: esc(disp("H", h)), woman: esc(disp("M", m))})}">${c || "·"}</td>`; }).join("")}</tr>`).join("") + "</tbody></table>";
  const {H: cH, M: cM, r} = STATS.corr;
  const best = (i, byRow) => (byRow ? cM.map((m, j) => [m, r[i][j]]) : cH.map((h, j) => [h, r[j][i]])).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const bar = v => `<small>${fmt2(v)}</small>`;
  const pairsH = cH.slice(0, 24).map((h, i) => `<div class="pair"><span class="a">${nameLink("H", h)}</span><span class="bs">${best(i, true).map(([m, v]) => `<span>${nameLink("M", m)} ${bar(v)}</span>`).join("")}</span></div>`).join("");
  const pairsM = cM.slice(0, 24).map((m, j) => `<div class="pair"><span class="a">${nameLink("M", m)}</span><span class="bs">${best(j, false).map(([h, v]) => `<span>${nameLink("H", h)} ${bar(v)}</span>`).join("")}</span></div>`).join("");
  w.innerHTML = `<div class="evo-grid">
    <div class="card"><h2>${T("stats.h.cross")}</h2>
      <p class="note">${T("stats.cross.note")}</p>
      <div style="overflow-x:auto">${x}</div>
      <p class="note">${T("stats.cross.source", {n: fmt(STATS.cross.reduce((a, b) => a + b[2], 0))})} <span class="badge calc">${T("calc")}</span></p></div>
    <div class="card"><h2>${T("stats.h.corr")}</h2>
      <p class="note">${T("stats.corr.note")}</p>
      <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);margin:14px 0 4px">${T("stats.corr.h1")}</h3><div class="pairs">${pairsH}</div>
      <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);margin:16px 0 4px">${T("stats.corr.h2")}</h3><div class="pairs">${pairsM}</div>
      <p class="note">${T("stats.corr.source", {n: fmt(STATS.corr.towns)})} <span class="badge calc">${T("calc")}</span></p></div>
  </div>`;
}

// ---------- search
let SEARCH = [];
function buildSearch() {
  for (const sex of ["M", "H", "A"]) IDX[sex].forEach((r, i) => SEARCH.push({t: sex, key: r[0], n: norm(disp(sex, r[0])), label: disp(sex, r[0]), w: r[1] || r[7] || 0, floor: !r[1], rank: i}));
  for (const [ine, m] of Object.entries(PLACES.muni)) { const v = PLACES.v["m" + ine] || {}; SEARCH.push({t: "m", key: "m" + ine, n: norm(m.n), n2: norm(m.n.replace(/^(.*), (El|La|Los|Las|Lo|L'|A|O|As|Os|Es|Sa|Ses|Els|Les|Et)$/i, "$2 $1").replace(/^L' /, "L")), label: m.n, sub: PLACES.prov[m.p]?.n, w: (v.popH || 0) + (v.popM || 0)}); }
  for (const [pc, p] of Object.entries(PLACES.prov)) SEARCH.push({t: "p", key: "p" + pc, n: norm(p.n), label: p.n, sub: "provincia", w: 1});
}
const KIND = k => T("kind." + k);
let sugIdx = -1, sugItems = [];
function suggest(q) {
  const box = $("#suggest");
  const nq = norm(q);
  if (nq.length < 2) { box.hidden = true; return; }
  // best matches of EACH kind (towns, provinces, women's and men's names, surnames), so a common start like "mar" still
  // shows Marbella beside María; exact matches first, then by how many people carry it
  const groups = {p: [], m: [], M: [], H: [], A: []};
  for (const s of SEARCH) {
    const st = s.n.startsWith(nq) || (s.n2 && s.n2.startsWith(nq));
    if (st || (nq.length >= 3 && s.n.includes(nq))) groups[s.t].push([s, (s.n === nq ? 2 : st ? 1 : 0) * 1e12 + s.w]);
  }
  const per = {p: 3, m: 5, M: 4, H: 4, A: 4};
  sugItems = [];
  for (const k of ["p", "m", "M", "H", "A"]) sugItems.push(...groups[k].sort((a, b) => b[1] - a[1]).slice(0, per[k]).map(x => x[0]));
  const exact = sugItems.filter(s => s.n === nq);
  sugItems = [...exact, ...sugItems.filter(s => s.n !== nq)];
  sugIdx = -1;
  box.innerHTML = sugItems.map((s, i) => `<div class="sug" data-i="${i}"><span class="kind">${KIND(s.t)}</span><span class="sn">${esc(s.label)}</span><span class="ss">${s.t === "m" || s.t === "p" ? esc(s.sub || "") : (s.floor ? (s.w ? "≥" + fmt(s.w) : "local") : fmt(s.w)) + " " + T(s.t === "A" ? "unit.firstsur" : "unit.people")}</span></div>`).join("") || `<div class="sug muted">${T("search.none", {q: esc(q)})}</div>`;
  box.hidden = false;
}
function pick(s) {
  $("#suggest").hidden = true; $("#filter").value = "";
  if (s.t === "m" || s.t === "p") {
    openPlace(s.key);
    if (state.view === "map" && s.t === "m") { const f = geo?.features.find(f => f.id === "ine:" + s.key.slice(1)); if (f) map.fitBounds(L.geoJSON(f).getBounds(), {maxZoom: 10}); }
    if (state.view === "rank") { state.rankArea = s.key; renderRank(); }
  } else openName(s.t, s.key);
}
$("#filter").addEventListener("input", e => suggest(e.target.value));
$("#filter").addEventListener("keydown", e => {
  const box = $("#suggest");
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sugIdx = Math.max(0, Math.min(sugItems.length - 1, sugIdx + (e.key === "ArrowDown" ? 1 : -1))); $$(".sug").forEach((el, i) => el.classList.toggle("on", i === sugIdx)); }
  else if (e.key === "Enter" && sugItems.length) pick(sugItems[Math.max(0, sugIdx)]);
  else if (e.key === "Escape") box.hidden = true;
});
$("#suggest").addEventListener("mousedown", e => { const el = e.target.closest(".sug[data-i]"); if (el) pick(sugItems[+el.dataset.i]); });
$("#filter").addEventListener("blur", () => setTimeout(() => $("#suggest").hidden = true, 150));


// ---------- views and buttons
const MODE_NAME = m => T("mode." + m);
const SEX_LONG = s => T("sex." + s);
function syncSummary() {
  const s = state.view === "map"
    ? `${MODE_NAME(state.mode)}${state.mode === "gen" ? " " + decLabel() : ""} · ${SEX_LONG(state.sex)}`
    : SEX_LONG(state.sex);
  $("#mob-sum").textContent = state.sel && state.view === "map" ? disp(state.sel.sex, state.sel.key) : s;
}
// the decade slider of the Generación mode (0.6.0)
function syncDec() {
  $("#decwrap").hidden = !(state.view === "map" && state.mode === "gen");
  $$("#span-tabs .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.span === state.decSpan));
  $("#dec-one").hidden = state.decSpan !== "one";
  $("#dec-two").hidden = state.decSpan === "one";
  $("#dec").value = state.dec; $("#declab").textContent = DEC_NAME(DECADES[state.dec]);
  $("#d1").value = state.d1; $("#d2").value = state.d2; $("#dlab2").textContent = decLabel();
}
$$("#span-tabs .seg-btn").forEach(b => b.onclick = () => { state.decSpan = b.dataset.span; syncDec(); writeHash(); restyle(); syncSummary(); });
$("#dec").addEventListener("input", e => { state.dec = +e.target.value; syncDec(); writeHash(); restyle(); syncSummary(); });
$("#d1").addEventListener("input", e => { state.d1 = +e.target.value; syncDec(); writeHash(); restyle(); syncSummary(); });
$("#d2").addEventListener("input", e => { state.d2 = +e.target.value; syncDec(); writeHash(); restyle(); syncSummary(); });
$("#mob-toggle").onclick = () => {
  const open = !document.body.classList.contains("filters-open");
  document.body.classList.toggle("filters-open", open);
  $("#mob-toggle").setAttribute("aria-expanded", open);
  $("#mob-toggle .ti").textContent = open ? "−" : "＋";
  $("#mob-toggle .tl").textContent = T(open ? "filters.close" : "filters.more");
};
function closeFilters() { document.body.classList.remove("filters-open"); $("#mob-toggle .ti").textContent = "＋"; $("#mob-toggle .tl").textContent = T("filters.more"); $("#mob-toggle").setAttribute("aria-expanded", "false"); }
function syncButtons() {
  $$(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  $$(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === state.mode));
  $$("#sex-tabs .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.sex === state.sex));
  document.body.classList.remove("view-map", "view-rank", "view-evo", "view-stats");
  document.body.classList.add("view-" + state.view);
  if ($("#mob-sum")) syncSummary();
  if ($("#decwrap")) syncDec();
}
function setView(v) {
  state.view = v; syncButtons(); writeHash();
  $("#mapwrap").hidden = v !== "map"; $("#rankwrap").hidden = v !== "rank"; $("#evowrap").hidden = v !== "evo"; $("#statswrap").hidden = v !== "stats";
  if (v === "map" && map) { setTimeout(() => map.invalidateSize(), 0); restyle(); }
  if (v === "rank") renderRank();
  if (v === "evo") renderEvo();
  if (v === "stats") renderStats();
}
$$(".view-btn").forEach(b => b.onclick = () => setView(b.dataset.view));
$$(".mode-btn").forEach(b => b.onclick = () => { state.mode = b.dataset.mode; state.sel = null; syncButtons(); writeHash(); restyle(); closeFilters(); });
$$("#sex-tabs .seg-btn").forEach(b => b.onclick = () => {
  state.sex = b.dataset.sex; state.sel = null; syncButtons(); writeHash(); closeFilters();
  if (state.view === "map") restyle(); else if (state.view === "rank") renderRank();
  else if (state.view === "stats") renderStats();
});
$$(".about-open").forEach(b => b.onclick = () => { closeFilters(); showAbout(); });
document.querySelector(".brand").addEventListener("click", e => { e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload(); });

// ---------- language
function statsBar() {
  const c = BUILD.counts;
  $("#stats").innerHTML = T("stats.bar", {names: fmt(c.names_H + c.names_M), surnames: fmt(c.surnames), munis: fmt(c.munis_with_data)});
}
function rerender() {
  applyStatic(); statsBar();
  if (state.view === "map") restyle(); else if (state.view === "rank") renderRank();
  else if (state.view === "evo") renderEvo(); else if (state.view === "stats") renderStats();
  if (document.body.classList.contains("has-ficha")) {
    if (state.place) openPlace(state.place);
    else if (state.sel) openName(state.sel.sex, state.sel.key);
    else showWelcome();
  }
  SEARCH = []; buildSearch();
  syncButtons();
}
$$("#lang-pick button").forEach(b => b.onclick = () => { setLang(b.dataset.lang); rerender(); writeHash(); });

// ---------- start
(async () => {
  BUILD = await fetch("nombres/data/build.json?t=" + Date.now()).then(r => r.json());
  HASH = BUILD.hash;
  [IDX, PLACES, NB, GEN, SOURCES] = await Promise.all([J("index.json"), J("places.json"), J("newborns.json"), J("gen.json"), J("sources.json")]);
  SOURCES = SOURCES || {};
  SERIES_IDX = (await J("series.json")) || SERIES_IDX;
  STATS = await J("stats.json");
  // surnames outside the national top 5 000: [name, floor] -> the same row shape as the others
  for (const [n, fl] of IDX.Ax || []) IDX.A.push([n, null, null, null, null, 0, null, fl]);
  for (const s of ["H", "M", "A"]) for (const r of IDX[s]) IDXMAP[s].set(r[0], r);
  const c = BUILD.counts;
  statsBar();
  readHash();
  applyStatic();
  buildSearch();
  syncButtons();
  const mapReady = initMap().then(() => { if (state.view === "map") restyle(); });
  setView(state.view);
  await mapReady;
  if (state.sel) openName(state.sel.sex, state.sel.key);
  else if (state.place) openPlace(state.place);
  else if (!isPhone()) showWelcome();
  else $("#panel-body").innerHTML = "";
})();
