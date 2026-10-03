/* Nombres de Francia · a century of first names by département, and surnames by decade (INSEE). */
"use strict";
const DATA_V = "0.4.1";
const BUILD_AT = "2026-10-04 00:15";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const fmt = n => n == null ? "" : Number(n).toLocaleString(T("locale"));
const fmt1 = n => n == null ? "" : Number(n).toLocaleString(T("locale"), {maximumFractionDigits: 1});
const fmt2 = n => n == null ? "" : Number(n).toLocaleString(T("locale"), {maximumFractionDigits: n < 1 ? 2 : 1});
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z' -]/g, " ").replace(/\s+/g, " ").trim();
const cap = s => (s || "").split(/([ -])/).map(w => w.length > 1 ? w[0] + w.slice(1).toLowerCase() : w).join("");
const SEXNAME = s => T("sex." + s);
const SHORT = s => T("sex." + s + ".short");
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const OTHER = "#c9c2b6", NONE = "#ebe7e0", FEW = "#f4f1eb";
const DEC_LABEL = d => d.replace("_", "-");

let HASH = "", BUILD, PLACES, IDX, APIDX, TOPS, DEPTOT, NAT, APTOPS, CHAR, CONC, geo, map, layer;
const cache = {};
async function J(path) {
  if (!cache[path]) cache[path] = fetch(`prenoms/data/${path}?h=${HASH}`).then(r => r.ok ? r.json() : null).catch(() => null);
  return cache[path];
}
const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(str) { const b = new TextEncoder().encode(str); let c = 0xFFFFFFFF; for (const x of b) c = CRC[(c ^ x) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
const bucket = k => (crc32(k) % 512).toString(16).padStart(3, "0");

const state = {view: "map", sex: "2", year: 1970, span: "year", y1: 1960, y2: 1980, mode: "top", sel: null, dep: null, rankDep: "FR"};
// a period runs from y1 to the last year of the block that starts at y2 (the grid is every 5 years)
const spanYears = () => { const out = []; for (let y = state.y1; y <= Math.min(state.y2 + 4, 2025); y++) out.push(String(y)); return out; };
const spanLabel = () => `${state.y1}-${Math.min(state.y2 + 4, 2025)}`;
const whenLabel = () => state.span === "year" ? String(state.year) : spanLabel();
const isPhone = () => matchMedia("(max-width: 760px)").matches;
const depName = d => PLACES.dep[d]?.n || d;
const key = () => state.sel ? `${state.sel.sex}:${state.sel.name}` : null;
const depTot = (d, y = state.year, sex = state.sex) => DEPTOT[`${sex}:${y}:${d}`] || 0;

function writeHash() {
  const p = new URLSearchParams();
  if (state.view !== "map") p.set("v", state.view);
  if (state.mode !== "top") p.set("c", state.mode);
  if (state.sex !== "2") p.set("s", state.sex);
  if (state.year !== 1970) p.set("y", state.year);
  if (state.span === "range") p.set("p", `${state.y1}-${state.y2}`);
  if (LANG !== "es") p.set("l", LANG);
  if (state.sel) p.set("n", `${state.sel.sex}:${state.sel.name}`);
  if (state.dep) p.set("d", state.dep);
  const h = p.toString();
  history.replaceState(null, "", h ? "#" + h : location.pathname);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (["map", "rank", "evo", "stats"].includes(p.get("v"))) state.view = p.get("v");
  if (["top", "char", "conc"].includes(p.get("c"))) state.mode = p.get("c");
  if (["1", "2", "A"].includes(p.get("s"))) state.sex = p.get("s");
  const y = +p.get("y"); if (y >= 1900 && y <= 2025) state.year = y;
  const n = p.get("n");
  if (n && n.includes(":")) { const [sex, ...r] = n.split(":"); state.sel = {sex, name: r.join(":")}; state.sex = sex; }
  if (p.get("d")) state.dep = p.get("d");
  const pr = (p.get("p") || "").match(/^(\d{4})-(\d{4})$/);
  if (pr) { state.span = "range"; state.y1 = +pr[1]; state.y2 = +pr[2]; }
}

// ---------- data per name
async function nameData(sex, name) {
  if (sex === "A") return (await J(`a/${bucket(name)}.json`))?.[name] || null;
  const k = `${sex}:${name}`;
  return (await J(`n/${bucket(k)}.json`))?.[k] || null;
}

// ---------- map
async function initMap() {
  map = L.map("map", {preferCanvas: true, zoomSnap: .25, minZoom: 4, maxZoom: 11}).setView([46.6, 2.4], 5.5);
  map.attributionControl.setPrefix("").addAttribution("Source : Insee (fichier des prénoms, édition 2025), Licence Ouverte 2.0 · límites: france-geojson (IGN)");
  geo = await J("departements.geojson");
  layer = L.geoJSON(geo, {
    renderer: L.canvas({padding: .5}),
    style: () => ({weight: .6, color: "#fff", fillOpacity: 1, fillColor: NONE}),
    onEachFeature: (f, l) => {
      l.on("mouseover", e => { l.setStyle({weight: 2, color: "#1d1a17"}); l.bringToFront(); tipFor(e, f.id); });
      l.on("mousemove", e => moveTip(e.originalEvent));
      l.on("mouseout", () => { l.setStyle({weight: .6, color: "#fff"}); hideTip(); });
      l.on("click", () => openDep(f.id));
    },
  }).addTo(map);
  // keep France filling the pane until the reader moves the map themselves
  let moved = false;
  map.on("zoomstart dragstart", () => { moved = true; });
  const fit = () => { map.invalidateSize(); if (!moved) map.fitBounds(layer.getBounds(), {padding: [8, 8]}); };
  setTimeout(fit, 0);
  addEventListener("resize", () => setTimeout(fit, 120));
  window.fitMap = fit;
}
function moveTip(ev) { const t = $("#tip"); if (!ev) return; t.style.left = Math.min(ev.clientX + 14, innerWidth - 260) + "px"; t.style.top = (ev.clientY + 14) + "px"; }
function hideTip() { $("#tip").hidden = true; }
function tipFor(e, d) {
  const u = UNIT[d] || {};
  $("#tip").innerHTML = `<b>${esc(depName(d))}</b><span class="muted">${esc(d)}</span>${u.label ? "<br>" + u.label : ""}`;
  $("#tip").hidden = false; moveTip(e.originalEvent);
}
const UNIT = {};

function quantBreaks(vals, n) {
  const s = vals.filter(v => v != null && isFinite(v) && v > 0).sort((a, b) => a - b);
  if (!s.length) return [];
  return [...new Set(Array.from({length: n - 1}, (_, i) => s[Math.floor((i + 1) * s.length / n)]))];
}
const binOf = (v, br) => { let i = 0; while (i < br.length && v >= br[i]) i++; return i; };

async function restyle() {
  if (!layer) return;
  const legend = [];
  let note = "", title = "";
  if (state.sel) {
    const {sex, name} = state.sel;
    const d = await nameData(sex, name);
    const vals = [];
    for (const f of geo.features) {
      const id = f.id;
      let v = null, n = null;
      if (sex === "A") {
        const dec = state.decade || PLACES.decades[PLACES.decades.length - 1];
        n = d?.dep?.[id]?.[PLACES.decades.indexOf(dec)] || null;
        v = n || null;
      } else if (state.span === "range") {
        n = spanYears().reduce((a, y) => a + (d?.dep?.[y]?.[id] || 0), 0) || null;
        const t = spanYears().reduce((a, y) => a + depTot(id, y, sex), 0);
        v = n && t ? 1000 * n / t : null;
      } else {
        n = d?.dep?.[state.year]?.[id] || null;
        const t = depTot(id, state.year, sex);
        v = n && t ? 1000 * n / t : null;
      }
      UNIT[id] = {v, n};
      if (v) vals.push(v);
    }
    const br = quantBreaks(vals, 7);
    for (const f of geo.features) {
      const u = UNIT[f.id];
      u.fill = u.v == null ? FEW : SEQ[binOf(u.v, br)];
      u.label = u.v == null
        ? `<i>${T(sex === "A" ? "legend.under30" : "legend.nofigure")}</i>`
        : T(sex === "A" ? "map.name.label.ap" : "map.name.label", {name: esc(cap(name)), n: fmt(u.n), permil: fmt2(u.v)});
    }
    const lo = [0, ...br];
    SEQ.slice(0, br.length + 1).forEach((c, i) => legend.push([c, i === br.length ? `${fmt2(lo[i])}+` : `${fmt2(lo[i])} - ${fmt2(br[i])}`]));
    legend.push([FEW, T(sex === "A" ? "legend.under30" : "legend.nofigure")]);
    title = cap(name) + (sex === "A" ? "" : ` · ${whenLabel()}`);
    note = T(sex === "A" ? "map.name.note.ap" : "map.name.note.year");
  } else if (state.sex === "A") {
    const dec = PLACES.decades[PLACES.decades.length - 1];
    const counts = new Map();
    for (const f of geo.features) { const t = APTOPS[f.id]?.[0]; if (t) counts.set(t[0], (counts.get(t[0]) || 0) + 1); }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]);
    const col = new Map(top.map((n, i) => [n, SERIES[i]]));
    for (const f of geo.features) {
      const t = APTOPS[f.id]?.[0];
      UNIT[f.id] = {fill: t ? (col.get(t[0]) || OTHER) : NONE,
        label: t ? T("map.ap.label", {name: esc(cap(t[0])), n: fmt(t[1])}) : `<i>${T("legend.nodata")}</i>`};
    }
    top.forEach((n, i) => legend.push([SERIES[i], cap(n), counts.get(n)]));
    legend.push([OTHER, T("legend.other")]);
    title = T("map.ap.title");
    note = T("map.ap.note");
  } else if (state.mode !== "top" && state.sex !== "A") {
    // characteristic / repetition: only per year (the source gives them year by year)
    const yr = state.span === "year" ? state.year : state.y1;
    if (state.mode === "char") {
      const br = [2, 3, 5, 10, 20];
      for (const f of geo.features) {
        const c = CHAR[`${state.sex}:${yr}:${f.id}`];
        UNIT[f.id] = {fill: c ? SEQ[1 + binOf(c[1], br)] : SEQ[0],
          label: c ? T("map.char.label", {name: esc(cap(c[0])), ratio: fmt1(c[1]), n: fmt(c[2])}) : `<i>${T("legend.none2x")}</i>`};
      }
      legend.push([SEQ[0], T("legend.under2x")]);
      br.forEach((b, i) => legend.push([SEQ[1 + i], i === br.length - 1 ? T("legend.timesplus", {a: b}) : T("legend.times", {a: b, b: br[i + 1]})]));
      title = T("map.char.title", {sex: SHORT(state.sex).toLowerCase(), year: yr});
      note = T("map.char.note") + (state.span === "range" ? T("map.onlyyear", {year: yr}) : "");
    } else {
      const vals = geo.features.map(f => CONC[`${state.sex}:${yr}:${f.id}`]).filter(v => v != null);
      const br = quantBreaks(vals, 7);
      for (const f of geo.features) {
        const v = CONC[`${state.sex}:${yr}:${f.id}`];
        UNIT[f.id] = {fill: v == null ? NONE : SEQ[binOf(v, br)],
          label: v == null ? `<i>${T("legend.nodata")}</i>` : T("map.conc.label", {v: fmt1(v)})};
      }
      const lo = [Math.min(...vals), ...br];
      SEQ.slice(0, br.length + 1).forEach((c, i) => legend.push([c, `${fmt1(lo[i])}${i < br.length ? " - " + fmt1(br[i]) : "+"} %`]));
      title = T("map.conc.title", {sex: SHORT(state.sex).toLowerCase(), year: yr});
      note = T("map.conc.note") + (state.span === "range" ? T("map.onlyyear", {year: yr}) : "");
    }
  } else {
    const RNG = state.span === "range" ? await J(`rng/${state.sex}_${state.y1}.json`) : null;
    const topOf = d => state.span === "range" ? RNG?.[`${state.y2}:${d}`] : TOPS[`${state.sex}:${state.year}:${d}`];
    const counts = new Map();
    for (const f of geo.features) { const t = topOf(f.id); if (t) counts.set(t[0], (counts.get(t[0]) || 0) + 1); }
    const col = await pairedColours(counts);
    const top = [...col.keys()];
    for (const f of geo.features) {
      const t = topOf(f.id);
      UNIT[f.id] = {fill: t ? (col.get(t[0]) || OTHER) : NONE,
        label: t ? T("map.top.label", {name: esc(cap(t[0])), n: fmt(t[1]), permil: fmt2(t[2])}) : `<i>${T("legend.nodata")}</i>`};
    }
    top.forEach(n => legend.push([col.get(n), cap(n), counts.get(n) || 0]));
    legend.push([OTHER, T("legend.other")]);
    title = T("map.top.title", {sex: SHORT(state.sex).toLowerCase(), when: whenLabel()});
    note = T(state.span === "range" ? "map.top.note.range" : "map.top.note.year");
  }
  layer.eachLayer(l => l.setStyle({fillColor: UNIT[l.feature.id]?.fill || NONE}));
  setLegend(title, legend, note);
  const chip = $("#sel-chip");
  if (state.sel) {
    chip.hidden = false;
    chip.innerHTML = `<span>${esc(cap(state.sel.name))} <small style="opacity:.75">${state.sel.sex === "A" ? T("kind.A") : SHORT(state.sel.sex).toLowerCase()}</small></span><button type="button">✕</button>`;
    chip.querySelector("button").onclick = () => { state.sel = null; writeHash(); restyle(); syncSummary(); };
  } else chip.hidden = true;
}
// R006: the boys' nº 1 names take the series colours by number of départements; each girls' name takes the colour of
// the boys' name it shares the nº 1 with in most départements, so switching sex keeps the regions' colours
async function pairedColours(counts) {
  const byCount = m => [...m.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const pairs = await nameOnePairs();
  const cH = new Map(), cM = new Map();
  for (const [h, m, c] of pairs) { cH.set(h, (cH.get(h) || 0) + c); cM.set(m, (cM.get(m) || 0) + c); }
  const men = new Map(byCount(cH).slice(0, 8).map((n, i) => [n, SERIES[i]]));
  if (state.sex === "1") return men;
  if (state.sex === "A" || !pairs.length) return new Map(byCount(counts).slice(0, 8).map((n, i) => [n, SERIES[i]]));
  const women = new Map(), used = new Set(), topW = byCount(counts).slice(0, 8);
  for (const [h, m] of [...pairs].sort((a, b) => b[2] - a[2])) {
    if (!topW.includes(m) || women.has(m) || !men.has(h) || used.has(men.get(h))) continue;
    women.set(m, men.get(h)); used.add(men.get(h));
  }
  for (const m of topW) if (!women.has(m)) { const free = SERIES.find(c => !used.has(c)); if (free) { women.set(m, free); used.add(free); } }
  return new Map([...women.entries()].sort((a, b) => SERIES.indexOf(a[1]) - SERIES.indexOf(b[1])));
}
// [boy nº 1, girl nº 1, nº of départements] for the year or period on screen
async function nameOnePairs() {
  const out = new Map();
  if (state.span === "range") {
    const [g, b] = await Promise.all([J(`rng/2_${state.y1}.json`), J(`rng/1_${state.y1}.json`)]);
    for (const d of Object.keys(PLACES.dep)) {
      const h = b?.[`${state.y2}:${d}`], m = g?.[`${state.y2}:${d}`];
      if (h && m) out.set(h[0] + "|" + m[0], (out.get(h[0] + "|" + m[0]) || 0) + 1);
    }
  } else {
    for (const d of Object.keys(PLACES.dep)) {
      const h = TOPS[`1:${state.year}:${d}`], m = TOPS[`2:${state.year}:${d}`];
      if (h && m) out.set(h[0] + "|" + m[0], (out.get(h[0] + "|" + m[0]) || 0) + 1);
    }
  }
  return [...out.entries()].map(([k, c]) => [...k.split("|"), c]);
}

function setLegend(title, rows, note) {
  $("#legend").innerHTML = `<div class="lt">${esc(title)}</div>` + rows.map(([c, t, n]) =>
    `<div class="lr"><span class="sw" style="background:${c}"></span><span>${esc(t)}</span>${n != null ? `<span class="ln">${fmt(n)}</span>` : ""}</div>`).join("") +
    (note ? `<div class="note">${esc(note)}</div>` : "");
}

// ---------- charts
function lineChart(years, vals, markYear, unit, width) {
  const W = width || 360, H = 130, L = 34, B = 22, T = 10;
  const max = Math.max(...vals, .0001);
  const x = i => L + i * (W - L - 8) / (years.length - 1), y = v => T + (H - T - B) * (1 - v / max);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const cur = years.indexOf(String(markYear));
  const grid = [0, .5, 1].map(f => `<line class="grid" x1="${L}" x2="${W - 8}" y1="${y(max * f)}" y2="${y(max * f)}"/><text x="${L - 4}" y="${y(max * f) + 4}" text-anchor="end">${fmt2(max * f)}</text>`).join("");
  const ticks = years.map((yr, i) => +yr % 25 === 0 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${yr}</text>` : "").join("");
  const hits = years.map((yr, i) => `<rect class="hit" x="${x(i) - 1.5}" y="0" width="3" height="${H}" data-tip="<b>${yr}</b>${fmt2(vals[i])} ${unit}"/>`).join("");
  return `<svg class="ch" viewBox="0 0 ${W} ${H}">${grid}${ticks}${cur >= 0 ? `<line x1="${x(cur)}" x2="${x(cur)}" y1="4" y2="${y(0)}" stroke="#b6465f" stroke-width="1.5"/>` : ""}
    <polyline class="ln" points="${pts}"/>${hits}</svg>`;
}
document.addEventListener("mouseover", e => { const t = e.target.closest("[data-tip]"); if (!t) return; $("#tip").innerHTML = t.dataset.tip; $("#tip").hidden = false; moveTip(e); });
document.addEventListener("mousemove", e => { if (!$("#tip").hidden && e.target.closest("[data-tip]")) moveTip(e); });
document.addEventListener("mouseout", e => { if (e.target.closest("[data-tip]")) hideTip(); });

// ---------- treemap (squarified), copied from nombres_españa/nombres/app.js on 2026-10-03
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
function treemapHTML(rows, sex, W, H) {
  const boxes = squarify(rows.map(r => r[1]), 0, 0, W, H);
  const pal = ["#0d366b", "#104281", "#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef"];
  return `<div class="tm" style="height:${H}px">${rows.map(([n, c], i) => {
    const [x, y, w, h] = boxes[i] || [0, 0, 0, 0];
    if (w < 1 || h < 1) return "";
    const slot = Math.floor(10 * i / Math.max(rows.length, 1));
    const big = w > 54 && h > 30, fs = Math.max(10, Math.min(22, Math.sqrt(w * h) / 6));
    return `<div class="t ${slot >= 8 ? "light" : ""}" data-name="${sex}:${esc(n)}" style="left:${100 * x / W}%;top:${100 * y / H}%;width:${100 * w / W}%;height:${100 * h / H}%;background:${pal[Math.min(9, slot)]};font-size:${fs}px"
      data-tip="<b>${esc(cap(n))}</b>${fmt(c)} ${sex === "A" ? "nacidos" : "bebés"}">${big ? `<b>${esc(cap(n))}</b>${h > 44 ? `<small>${fmt(c)}</small>` : ""}` : ""}</div>`;
  }).join("")}</div>`;
}

// ---------- panel
function showPanel(html) { $("#panel-body").innerHTML = html; $("#panel").scrollTop = 0; document.body.classList.add("has-ficha"); }
$("#detail-close").onclick = () => {
  document.body.classList.remove("has-ficha");
  state.dep = null; writeHash();
  if (state.view === "map" && !isPhone()) showWelcome();
};
const nameLink = (sex, n, text) => `<span class="lnk" data-name="${sex}:${esc(n)}">${esc(text ?? cap(n))}</span>`;
const depLink = d => `<span class="lnk" data-dep="${esc(d)}">${esc(depName(d))}</span>`;
document.addEventListener("click", e => {
  const n = e.target.closest("[data-name]");
  if (n) { const [sex, ...k] = n.dataset.name.split(":"); openName(sex, k.join(":")); return; }
  const d = e.target.closest("[data-dep]");
  if (d) openDep(d.dataset.dep);
});

const YEARS = [];
for (let y = 1900; y <= 2025; y++) YEARS.push(String(y));

async function openName(sex, name) {
  state.sel = {sex, name};
  if (state.sex !== sex) { state.sex = sex; syncButtons(); }
  writeHash();
  if (state.view === "map") restyle();
  const d = await nameData(sex, name) || {};
  const W = Math.min(360, ($("#panel").clientWidth || 400) - 40);
  let h = `<div class="ficha"><h2>${esc(cap(name))}</h2><div class="sub">${sex === "A" ? T("name.sub.ap") : T("name.sub", {sex: SEXNAME(sex).toLowerCase()})}</div>`;
  if (sex === "A") {
    const nat = d.nat || [], tot = nat.reduce((a, b) => a + b, 0);
    const peak = nat.indexOf(Math.max(...nat));
    h += `<div class="kpis"><div class="kpi"><b>${fmt(tot)}</b><span>${T("name.kpi.born")}</span></div>
      <div class="kpi"><b>${esc(DEC_LABEL(PLACES.decades[peak] || ""))}</b><span>${T("name.kpi.peakdec")}</span></div>
      <div class="kpi"><b>${fmt(Object.keys(d.dep || {}).length)}</b><span>${T("name.kpi.deps")}</span></div></div>
      <h3>${T("name.h.decades")}</h3>` +
      lineChart(PLACES.decades.map(x => x.slice(0, 4)), nat, null, "nacidos", W) +
      `<div class="note">${T("name.note.decades")}</div>`;
    const deps = Object.entries(d.dep || {}).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0)]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    h += `<h3>${T("name.h.whereborn")}</h3><table class="rl">${deps.map(([k, v], i) => `<tr><td class="r">${i + 1}</td><td class="n">${depLink(k)}</td><td class="v">${fmt(v)}</td></tr>`).join("")}</table>`;
  } else {
    const nat = d.nat || {}, tot = Object.values(nat).reduce((a, b) => a + b, 0);
    const peak = Object.entries(nat).sort((a, b) => b[1] - a[1])[0] || ["", 0];
    const vals = YEARS.map(y => { const t = NAT.tot[`${sex}:${y}`]; return t ? 1000 * (nat[y] || 0) / t : 0; });
    const rank = d.rank?.[String(state.year)];
    h += `<div class="kpis"><div class="kpi"><b>${fmt(tot)}</b><span>${T("name.kpi.babies")}</span></div>
      <div class="kpi"><b>${esc(peak[0])}</b><span>${T("name.kpi.peak", {n: fmt(peak[1])})}</span></div>
      <div class="kpi"><b>${state.span === "year" ? (rank ? "nº " + rank : "·") : fmt(spanYears().reduce((a, y) => a + (nat[y] || 0), 0))}</b><span>${state.span === "year" ? T("name.kpi.rank", {year: state.year}) : T("name.kpi.inrange", {range: spanLabel()})}</span></div></div>
      <h3>${T("name.h.years")} <span class="h3n">${T("name.h.years.sub")}</span></h3>` +
      lineChart(YEARS, vals, state.year, "‰", W) +
      `<div class="note">${T("name.inyear", {year: state.year, n: fmt(nat[String(state.year)] || 0), rank: rank ? T("name.rankof", {rank}) : ""})}</div>`;
    const ys = state.span === "year" ? [String(state.year)] : spanYears();
    const byDep = {};
    for (const y of ys) for (const [k, n] of Object.entries((d.dep || {})[y] || {})) byDep[k] = (byDep[k] || 0) + n;
    const denom = k => ys.reduce((a, y) => a + depTot(k, y, sex), 0);
    const rows = Object.entries(byDep).map(([k, n]) => [k, n, denom(k) ? 1000 * n / denom(k) : 0])
      .sort((a, b) => b[2] - a[2]).slice(0, 10);
    h += `<h3>${T("name.h.where", {when: esc(whenLabel())})}</h3>`;
    h += rows.length ? `<table class="rl">${rows.map(([k, n, p], i) => `<tr><td class="r">${i + 1}</td><td class="n">${depLink(k)}</td><td class="v">${fmt2(p)} ‰<br><small>${fmt(n)} ${T("unit.babies")}</small></td></tr>`).join("")}</table>`
      : `<div class="note">${T("name.nowhere")}</div>`;
  }
  h += `<p class="note" style="margin-top:14px">${T("name.source")}</p></div>`;
  showPanel(h);
}

async function openDep(d) {
  state.dep = d; writeHash();
  const W = Math.min(360, ($("#panel").clientWidth || 400) - 40);
  const sex = state.sex === "A" ? "2" : state.sex;
  let h = `<div class="ficha"><h2>${esc(depName(d))}</h2><div class="sub">${T("dep.sub", {code: esc(d)})}${PLACES.dep[d]?.map ? "" : T("dep.nomap")}</div>`;
  const when = state.span === "year" ? [String(state.year)] : spanYears();
  const rngF = state.span === "range" ? await Promise.all([J(`rng/2_${state.y1}.json`), J(`rng/1_${state.y1}.json`)]) : null;
  const t2 = state.span === "year" ? TOPS[`2:${state.year}:${d}`] : rngF[0]?.[`${state.y2}:${d}`];
  const t1 = state.span === "year" ? TOPS[`1:${state.year}:${d}`] : rngF[1]?.[`${state.y2}:${d}`];
  h += `<div class="kpis"><div class="kpi"><b>${t2 ? esc(cap(t2[0])) : "·"}</b><span>${T("dep.kpi.girl", {when: esc(whenLabel())})}</span></div>
    <div class="kpi"><b>${t1 ? esc(cap(t1[0])) : "·"}</b><span>${T("dep.kpi.boy", {when: esc(whenLabel())})}</span></div>
    <div class="kpi"><b>${fmt(when.reduce((a, y) => a + depTot(d, y, "1") + depTot(d, y, "2"), 0))}</b><span>${T("dep.kpi.babies")}</span></div></div>`;
  // the top of this year, from the per-name files is too costly: use the ranking table built on the fly
  const top = await depTop(d, state.span === "year" ? [String(state.year)] : spanYears());
  {
    const s = state.sex === "A" ? "2" : state.sex, lst = top[s].slice(0, 40);
    if (lst.length > 3) h += `<h3>${T("dep.h.mosaic", {sex: SEXNAME(s).toLowerCase()})} <span class="h3n">${T("dep.h.mosaic.sub", {when: esc(whenLabel())})}</span></h3>` +
      treemapHTML(lst, s, W, Math.round(W * .72));
  }
  for (const s of ["2", "1"]) {
    h += `<h3>${T("dep.h.top", {sex: SEXNAME(s), when: esc(whenLabel())})}</h3>`;
    const lst = top[s].slice(0, 10);
    const den = when.reduce((a, y) => a + depTot(d, y, s), 0);  // the whole period, not one year
    h += lst.length ? `<table class="rl">${lst.map(([n, c], i) => `<tr><td class="r">${i + 1}</td><td class="n">${nameLink(s, n)}</td><td class="v">${fmt(c)}<br><small>${fmt2(1000 * c / Math.max(den, 1))} ‰</small></td></tr>`).join("")}</table>`
      : `<div class="note">${T("dep.nodata")}</div>`;
  }
  const ap = APTOPS[d] || [];
  h += `<h3>${T("dep.h.surnames")} <span class="h3n">${T("dep.h.surnames.sub")}</span></h3>`;
  h += ap.length ? `<table class="rl">${ap.slice(0, 10).map(([n, c], i) => `<tr><td class="r">${i + 1}</td><td class="n">${nameLink("A", n)}</td><td class="v">${fmt(c)}</td></tr>`).join("")}</table>`
    : `<div class="note">${T("dep.nodata")}</div>`;
  h += `<p class="note" style="margin-top:14px">Fuente: INSEE. Los nombres con menos de 5 bebés en el departamento y año no se publican, así que el total de arriba es solo de los publicados.</p></div>`;
  showPanel(h);
}
// the departmental top of a year: TOPS has the nº 1; for the rest, read the buckets of the names that were national
// top 200 that year (enough for a department's top 10) and keep what the département lists
const depTopCache = {};
async function depTop(d, years) {
  const ck = `${d}:${years[0]}:${years[years.length - 1]}`;
  if (depTopCache[ck]) return depTopCache[ck];
  const out = {"1": [], "2": []};
  for (const s of ["1", "2"]) {
    const names = years.flatMap(y => (NAT.top[`${s}:${y}`] || []).map(r => r[1]));
    const extra = IDX[s].slice(0, 300).map(r => r[0]);
    const want = [...new Set([...names, ...extra])];
    const byBucket = {};
    for (const n of want) (byBucket[bucket(`${s}:${n}`)] = byBucket[bucket(`${s}:${n}`)] || []).push(n);
    const got = await Promise.all(Object.keys(byBucket).map(b => J(`n/${b}.json`)));
    const map = Object.assign({}, ...got.filter(Boolean));
    for (const n of want) {
      const c = years.reduce((a, y) => a + (map[`${s}:${n}`]?.dep?.[y]?.[d] || 0), 0);
      if (c) out[s].push([n, c]);
    }
    out[s].sort((a, b) => b[1] - a[1]);
  }
  depTopCache[ck] = out;
  return out;
}

function showWelcome() {
  const c = BUILD.counts;
  showPanel(`<div class="ficha"><h2>${T("brand")}</h2><div class="sub">${T("tagline")}</div>
    <p>${T("welcome.lead")}</p>
    <div class="kpis"><div class="kpi"><b>${fmt(c.first_names)}</b><span>${T("welcome.names")}</span></div><div class="kpi"><b>${fmt(c.surnames)}</b><span>${T("welcome.surnames")}</span></div><div class="kpi"><b>${c.years[0]}-${c.years[1]}</b><span>${T("welcome.years")}</span></div></div>
    <h3>${T("welcome.start")}</h3>
    <p>${[["2", "MARIE"], ["2", "NATHALIE"], ["2", "EMMA"], ["1", "JEAN"], ["1", "MICHEL"], ["1", "GABRIEL"], ["1", "MOHAMED"], ["A", "MARTIN"], ["A", "DUPONT"]].map(([s, n]) => nameLink(s, n)).join(" · ")}</p>
    <p class="note">${T("welcome.click")}</p>
    <p class="note"><span class="lnk about-open" style="color:var(--accent);cursor:pointer">${T("welcome.aboutlink")}</span></p></div>`);
  $("#panel-body .about-open").onclick = showAbout;
}
function showAbout() {
  const sister = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)
    ? "../nombres_espa%C3%B1a/nombres.html" : "https://victorelvira.github.io/projects/nombres.html";
  showPanel(`<div class="ficha about"><h2>${T("about.h")}</h2><div class="sub">${T("about.sub")}</div>
  <h3>${T("about.h.sources")}</h3>
  <ul>${["about.src1", "about.src2", "about.src3", "about.src4"].map(k => `<li>${T(k)}</li>`).join("")}</ul>
  <h3>${T("about.h.read")}</h3>
  <ul>${["about.r1", "about.r2", "about.r3", "about.r4", "about.r5"].map(k => `<li>${T(k)}</li>`).join("")}</ul>
  <h3>${T("about.h.sister")}</h3>
  <p class="note">${T("about.sister", {url: sister})}</p>
  <p class="note">${T("about.nonprofit")}</p></div>`);
}
$$(".about-open").forEach(b => b.onclick = () => { closeFilters(); showAbout(); });

// ---------- rankings
async function renderRank() {
  const w = $("#rankwrap");
  const sex = state.sex;
  const opts = [`<option value="FR">${T("rank.all")}</option>`].concat(Object.keys(PLACES.dep).sort((a, b) => depName(a).localeCompare(depName(b), T("locale")))
    .map(d => `<option value="${d}">${esc(depName(d))}${PLACES.dep[d].map ? "" : T("rank.overseas")}</option>`));
  let rows = [], note = "";
  if (sex === "A") {
    if (state.rankDep === "FR") rows = APIDX.slice(0, 200).map(([n, c]) => [n, c]);
    else rows = (APTOPS[state.rankDep] || []).map(([n, c]) => [n, c]);
    note = T("rank.note.ap");
  } else if (state.rankDep === "FR") {
    if (state.span === "year") {
      rows = (NAT.top[`${sex}:${state.year}`] || []).map(r => [r[1], r[2]]);
      note = T("rank.note.year", {year: state.year});
    } else {
      const ys = spanYears();
      const names = [...new Set(ys.flatMap(y => (NAT.top[`${sex}:${y}`] || []).map(r => r[1])))];
      const got = await Promise.all([...new Set(names.map(n => bucket(`${sex}:${n}`)))].map(b => J(`n/${b}.json`)));
      const m = Object.assign({}, ...got.filter(Boolean));
      rows = names.map(n => [n, ys.reduce((a, y) => a + (m[`${sex}:${n}`]?.nat?.[y] || 0), 0)]).sort((a, b) => b[1] - a[1]);
      note = T("rank.note.range", {range: spanLabel()});
    }
  } else {
    const top = await depTop(state.rankDep, state.span === "year" ? [String(state.year)] : spanYears());
    rows = top[sex].slice(0, 50);
    note = T("rank.note.dep", {dep: depName(state.rankDep), when: whenLabel()});
  }
  const max = Math.max(...rows.map(r => r[1] || 0), 1);
  const shown = state.rankAll ? rows : rows.slice(0, 100);
  const tmW = Math.min(980, (w.clientWidth || 900) - 40);
  const tm = rows.length > 3 ? `<div class="tm-card"><h3>${T("rank.mosaic", {n: Math.min(60, rows.length)})}</h3><p class="note">${T("rank.mosaic.note", {what: T(sex === "A" ? "kind.A" : "rank.col.name").toLowerCase()})}</p>${treemapHTML(rows.slice(0, 60), sex, tmW - 28, Math.round(Math.min(520, tmW * .55)))}</div>` : "";
  w.innerHTML = `<div class="tools"><select id="r-dep">${opts.join("")}</select>
      <span class="yr-note">${sex === "A" ? T("rank.when.ap") : (state.span === "year" ? T("rank.when.year", {year: state.year}) : T("rank.when.range", {range: spanLabel()}))}</span></div>
    <div class="rank-title">${esc(T("rank.title", {sex: SEXNAME(sex), where: state.rankDep === "FR" ? T("rank.all") : depName(state.rankDep)}))}</div>
    <p class="note">${esc(note)}</p>
    ${tm}
    <table class="rank-table"><thead><tr><th class="v">#</th><th>${T(sex === "A" ? "rank.col.surname" : "rank.col.name")}</th><th class="v">${T(sex === "A" ? "rank.col.born" : "rank.col.babies")}</th><th></th></tr></thead><tbody>
    ${shown.map(([n, c], i) => `<tr><td class="v muted">${i + 1}</td><td class="n" data-name="${sex}:${esc(n)}">${esc(cap(n))}</td><td class="v">${fmt(c)}</td>
      <td style="width:34%"><div class="b" style="width:${Math.max(2, 100 * c / max)}%"></div></td></tr>`).join("")}</tbody></table>
    ${shown.length < rows.length ? `<p style="text-align:center;margin:12px 0"><button type="button" class="chip btn" id="r-all">${T("rank.showall", {n: fmt(rows.length)})}</button></p>` : ""}`;
  $("#r-dep").value = state.rankDep;
  $("#r-dep").onchange = e => { state.rankDep = e.target.value; state.rankAll = false; renderRank(); };
  $("#r-all")?.addEventListener("click", () => { const y = $("#rankwrap").scrollTop; state.rankAll = true; renderRank().then(() => $("#rankwrap").scrollTop = y); });
}

// ---------- evolution
function renderEvo() {
  const w = $("#evowrap");
  const sex = state.sex === "A" ? "2" : state.sex;
  const years = YEARS.filter(y => +y % 5 === 0);
  const ser = new Map();
  for (const y of years) for (const [rank, name] of (NAT.top[`${sex}:${y}`] || []).map(r => [r[0], r[1]])) {
    if (!ser.has(name)) ser.set(name, {label: cap(name), ranks: {}});
    ser.get(name).ranks[y] = rank;
  }
  // 26 years x 10 places with a label at each end needs room: a wide chart that scrolls sideways
  const W = Math.max(1700, ($("#evowrap").clientWidth || 900) - 60), maxR = 10, H = 40 + maxR * 34;
  const L = 120, R = 120, PT = 24, B = 26;  // PT, not T: T() is the dictionary
  const x = i => L + i * (W - L - R) / (years.length - 1), y = r => PT + (r - 1) * (H - PT - B) / (maxR - 1);
  let g = "";
  for (const [name, s] of ser) {
    let segs = [], cur = [], dots = "";
    years.forEach((yr, i) => {
      const r = s.ranks[yr];
      if (r && r <= maxR) { cur.push(`${x(i)},${y(r)}`); dots += `<circle class="dot" cx="${x(i)}" cy="${y(r)}" r="4"><title>${esc(s.label)} · ${yr}: nº ${r}</title></circle>`; }
      else if (cur.length) { segs.push(cur); cur = []; }
    });
    if (cur.length) segs.push(cur);
    const first = years.find(yr => s.ranks[yr] <= maxR), last = [...years].reverse().find(yr => s.ranks[yr] <= maxR);
    let labels = "";
    if (first) labels += `<text class="lbl" x="${x(years.indexOf(first)) - 8}" y="${y(s.ranks[first]) + 4}" text-anchor="end">${esc(s.label)}</text>`;
    if (last && last !== first) labels += `<text class="lbl" x="${x(years.indexOf(last)) + 8}" y="${y(s.ranks[last]) + 4}">${esc(s.label)}</text>`;
    g += `<g class="s" data-k="${esc(name)}">${segs.map(p => `<polyline class="ln" points="${p.join(" ")}"/>`).join("")}${dots}${labels}</g>`;
  }
  const grid = years.map((v, i) => `<line class="grid" x1="${x(i)}" x2="${x(i)}" y1="${PT - 8}" y2="${H - B + 4}"/><text x="${x(i)}" y="${H - 6}" text-anchor="middle">${v}</text>`).join("");
  const ranks = Array.from({length: maxR}, (_, i) => `<text x="4" y="${y(i + 1) + 4}">${i + 1}</text>`).join("");
  w.innerHTML = `<div class="evo-grid"><div class="card">
      <h2>${T("evo.h")}</h2>
      <p class="note">${T("evo.note")}</p>
      <div class="scrollx"><svg class="ch bump" id="bump" viewBox="0 0 ${W} ${H}" style="width:${W}px;max-width:none">${grid}${ranks}${g}</svg></div>
    </div>
    <div class="card"><h2>${T("evo.h2")}</h2>
      <table class="ones"><thead><tr><th>${T("evo.col.year")}</th><th>${T("sex.2.short")}</th><th class="v">${T("unit.babies")}</th><th>${T("sex.1.short")}</th><th class="v">${T("unit.babies")}</th></tr></thead><tbody>
      ${YEARS.filter(y => +y % 5 === 0).reverse().map(yr => {
        const a = (NAT.top[`2:${yr}`] || [])[0], b = (NAT.top[`1:${yr}`] || [])[0];
        return `<tr><td>${yr}</td><td>${a ? nameLink("2", a[1]) : ""}</td><td class="v">${a ? fmt(a[2]) : ""}</td><td>${b ? nameLink("1", b[1]) : ""}</td><td class="v">${b ? fmt(b[2]) : ""}</td></tr>`;
      }).join("")}</tbody></table></div></div>`;
  wireBump("bump", sex);
}

// ---------- pairs: which boy's and girl's nº 1 go together, across the départements
async function renderStats() {
  const w = $("#statswrap");
  const pairs = (await nameOnePairs()).sort((a, b) => b[2] - a[2]);
  const H = [...new Set(pairs.map(p => p[0]))].slice(0, 10), M = [...new Set(pairs.map(p => p[1]))].slice(0, 10);
  const cell = new Map(pairs.map(p => [p[0] + "|" + p[1], p[2]]));
  const max = Math.max(...pairs.map(p => p[2]), 1);
  const shade = c => c ? SEQ[Math.min(SEQ.length - 1, Math.floor(SEQ.length * Math.sqrt(c / max) * .999))] : "#f6f3ee";
  const table = `<table class="xt"><thead><tr><th></th>${M.map(m => `<th>${nameLink("2", m)}</th>`).join("")}</tr></thead><tbody>` +
    H.map(h => `<tr><th>${nameLink("1", h)}</th>${M.map(m => { const c = cell.get(h + "|" + m) || 0; const i = SEQ.indexOf(shade(c));
      return `<td class="${i >= 3 ? "dk" : ""} ${c ? "" : "zero"}" style="background:${shade(c)}" data-tip="${T("stats.cell", {boy: esc(cap(h)), girl: esc(cap(m)), n: fmt(c)})}">${c || "·"}</td>`; }).join("")}</tr>`).join("") +
    "</tbody></table>";
  const paired = pairs.slice(0, 12).map(([h, m, c]) => `<div class="pair"><span class="a">${nameLink("1", h)} + ${nameLink("2", m)}</span><span class="bs"><span>${T("stats.deps", {n: fmt(c)})}</span></span></div>`).join("");
  w.innerHTML = `<div class="evo-grid"><div class="card">
      <h2>${T("stats.h")}</h2>
      <p class="note">${T("stats.note", {when: esc(whenLabel())})}</p>
      <div style="overflow-x:auto">${table}</div>
      <div style="margin-top:14px">${paired}</div>
      <p class="note">${T("stats.source", {n: fmt(Object.keys(PLACES.dep).length)})} <span class="badge calc">${T("calc")}</span></p>
    </div></div>`;
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

// ---------- search
let SEARCH = [], sugItems = [], sugIdx = -1;
function buildSearch() {
  for (const s of ["1", "2"]) IDX[s].forEach(r => SEARCH.push({t: s, key: r[0], n: norm(r[0]), label: cap(r[0]), w: r[1]}));
  APIDX.forEach(([n, c]) => SEARCH.push({t: "A", key: n, n: norm(n), label: cap(n), w: c}));
  for (const d of Object.keys(PLACES.dep)) SEARCH.push({t: "d", key: d, n: norm(depName(d)), label: depName(d), sub: T("dep.sub", {code: d}), w: 1});
}
const KIND = k => T("kind." + k);
function suggest(q) {
  const box = $("#suggest"), nq = norm(q);
  if (nq.length < 2) { box.hidden = true; return; }
  const groups = {d: [], "2": [], "1": [], A: []};
  for (const s of SEARCH) {
    const st = s.n.startsWith(nq);
    if (st || (nq.length >= 3 && s.n.includes(nq))) groups[s.t].push([s, (s.n === nq ? 2 : st ? 1 : 0) * 1e12 + s.w]);
  }
  const per = {d: 3, "2": 5, "1": 5, A: 5};
  sugItems = [];
  for (const k of ["d", "2", "1", "A"]) sugItems.push(...groups[k].sort((a, b) => b[1] - a[1]).slice(0, per[k]).map(x => x[0]));
  const exact = sugItems.filter(s => s.n === nq);
  sugItems = [...exact, ...sugItems.filter(s => s.n !== nq)];
  sugIdx = -1;
  box.innerHTML = sugItems.map((s, i) => `<div class="sug" data-i="${i}"><span class="kind">${KIND(s.t)}</span><span class="sn">${esc(s.label)}</span><span class="ss">${s.t === "d" ? esc(s.sub) : fmt(s.w) + " " + T(s.t === "A" ? "unit.born" : "unit.babies")}</span></div>`).join("") || `<div class="sug muted">${T("search.none", {q: esc(q)})}</div>`;
  box.hidden = false;
}
function pick(s) {
  $("#suggest").hidden = true; $("#filter").value = "";
  if (s.t === "d") openDep(s.key); else openName(s.t, s.key);
}
$("#filter").addEventListener("input", e => suggest(e.target.value));
$("#filter").addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sugIdx = Math.max(0, Math.min(sugItems.length - 1, sugIdx + (e.key === "ArrowDown" ? 1 : -1))); $$(".sug").forEach((el, i) => el.classList.toggle("on", i === sugIdx)); }
  else if (e.key === "Enter" && sugItems.length) pick(sugItems[Math.max(0, sugIdx)]);
  else if (e.key === "Escape") $("#suggest").hidden = true;
});
$("#suggest").addEventListener("mousedown", e => { const el = e.target.closest(".sug[data-i]"); if (el) pick(sugItems[+el.dataset.i]); });
$("#filter").addEventListener("blur", () => setTimeout(() => $("#suggest").hidden = true, 150));

// ---------- views
function syncSummary() { $("#mob-sum").textContent = state.sel ? cap(state.sel.name) : `${SHORT(state.sex)} · ${whenLabel()}`; }
function closeFilters() { document.body.classList.remove("filters-open"); $("#mob-toggle .ti").textContent = "＋"; $("#mob-toggle .tl").textContent = T("filters.more"); $("#mob-toggle").setAttribute("aria-expanded", "false"); }
$("#mob-toggle").onclick = () => {
  const open = !document.body.classList.contains("filters-open");
  document.body.classList.toggle("filters-open", open);
  $("#mob-toggle .ti").textContent = open ? "−" : "＋";
  $("#mob-toggle .tl").textContent = T(open ? "filters.close" : "filters.more");
};
function syncButtons() {
  $$(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  $$("#sex-tabs .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.sex === state.sex));
  document.body.classList.remove("view-map", "view-rank", "view-evo", "view-stats");
  document.body.classList.add("view-" + state.view);
  $$(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === state.mode));
  $("#yearwrap").style.display = (state.view === "evo" || state.sex === "A") ? "none" : "";
  syncSummary();
}
function setView(v) {
  state.view = v; syncButtons(); writeHash();
  $("#mapwrap").hidden = v !== "map"; $("#rankwrap").hidden = v !== "rank"; $("#evowrap").hidden = v !== "evo"; $("#statswrap").hidden = v !== "stats";
  if (v === "map" && map) { setTimeout(() => window.fitMap && window.fitMap(), 0); restyle(); }
  if (v === "rank") renderRank();
  if (v === "evo") renderEvo();
  if (v === "stats") renderStats();
}
$$(".view-btn").forEach(b => b.onclick = () => setView(b.dataset.view));
$$(".mode-btn").forEach(b => b.onclick = () => { state.mode = b.dataset.mode; state.sel = null; syncButtons(); writeHash(); restyle(); closeFilters(); });
$$("#sex-tabs .seg-btn").forEach(b => b.onclick = () => {
  state.sex = b.dataset.sex; state.sel = null; syncButtons(); writeHash(); closeFilters();
  if (state.view === "map") restyle(); else if (state.view === "rank") renderRank();
  else if (state.view === "stats") renderStats(); else renderEvo();
});
function syncSpan() {
  $$("#span-tabs .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.span === state.span));
  $("#one").hidden = state.span !== "year";
  $("#two").hidden = state.span === "year";
  $("#rlab").textContent = spanLabel();
  $("#y1").value = state.y1; $("#y2").value = state.y2;
}
function afterWhenChange() {
  syncSummary(); writeHash();
  if (state.view === "map") restyle(); else if (state.view === "rank") renderRank(); else if (state.view === "stats") renderStats();
  if (document.body.classList.contains("has-ficha")) {
    if (state.dep) openDep(state.dep);
    else if (state.sel) openName(state.sel.sex, state.sel.name);
  }
}
$$("#span-tabs .seg-btn").forEach(b => b.onclick = () => { state.span = b.dataset.span; syncSpan(); afterWhenChange(); });
$("#y1").addEventListener("input", e => {
  state.y1 = +e.target.value;
  if (state.y2 < state.y1) state.y2 = state.y1;
  syncSpan(); afterWhenChange();
});
$("#y2").addEventListener("input", e => {
  state.y2 = +e.target.value;
  if (state.y1 > state.y2) state.y1 = state.y2;
  syncSpan(); afterWhenChange();
});
$("#year").addEventListener("input", e => {
  state.year = +e.target.value; $("#ylab").textContent = state.year; afterWhenChange();
});
document.querySelector(".brand").addEventListener("click", e => { e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload(); });


// link to the sibling project: the same folder on the published site, a sibling folder when served locally
(() => {
  const a = document.querySelector(".sister");
  if (!a) return;
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  a.href = local ? a.dataset.local : a.dataset.web;
})();

// ---------- language
function statsBar() {
  const c = BUILD.counts;
  $("#stats").innerHTML = T("stats.bar", {names: fmt(c.first_names), surnames: fmt(c.surnames), deps: c.departements, from: c.years[0], to: c.years[1]});
}
function rerender() {
  applyStatic();
  statsBar();
  if (state.view === "map") restyle(); else if (state.view === "rank") renderRank();
  else if (state.view === "evo") renderEvo(); else if (state.view === "stats") renderStats();
  if (document.body.classList.contains("has-ficha")) {
    if (state.dep) openDep(state.dep);
    else if (state.sel) openName(state.sel.sex, state.sel.name);
    else showWelcome();
  }
  SEARCH = []; buildSearch();
  syncButtons(); syncSpan();
}
$$("#lang-pick button").forEach(b => b.onclick = () => { setLang(b.dataset.lang); rerender(); writeHash(); });

// ---------- start
(async () => {
  BUILD = await fetch("prenoms/data/build.json?t=" + Date.now()).then(r => r.json());
  HASH = BUILD.hash;
  [PLACES, IDX, APIDX, TOPS, DEPTOT, NAT, APTOPS] = await Promise.all(
    ["places", "index", "ap_index", "tops", "deptot", "nat", "ap_tops"].map(f => J(f + ".json")));
  [CHAR, CONC] = await Promise.all([J("char.json"), J("conc.json")]);
  const c = BUILD.counts;
  statsBar();
  readHash();
  applyStatic();
  $("#year").value = state.year; $("#ylab").textContent = state.year; syncSpan();
  buildSearch();
  syncButtons();
  const ready = initMap().then(() => { if (state.view === "map") restyle(); });
  setView(state.view);
  if (state.sel) openName(state.sel.sex, state.sel.name);
  else if (state.dep) openDep(state.dep);
  else if (!isPhone()) showWelcome();
  await ready;
})();
