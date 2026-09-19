/* Nombres de España · map, rankings and evolution of names and surnames (INE). */
"use strict";
const DATA_V = "0.5.0";
const BUILD_AT = "2026-09-19 13:50";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const fmt = n => n == null ? "" : Number(n).toLocaleString("es-ES");
const fmt1 = n => n == null ? "" : Number(n).toLocaleString("es-ES", {minimumFractionDigits: 1, maximumFractionDigits: 1});
const fmt2 = n => n == null ? "" : Number(n).toLocaleString("es-ES", {maximumFractionDigits: n < 1 ? 3 : 2});
const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-ZÑÇ' ]/g, " ").replace(/\s+/g, " ").trim();
const SEXNAME = {H: "Hombres", M: "Mujeres", A: "Apellidos"};
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const OTHER = "#c9c2b6", NONE = "#ebe7e0", FEW = "#f4f1eb";
const SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const DIV = ["#1c5cab", "#5598e7", "#9ec5f4", "#f0efec", "#f3b3b2", "#e66767", "#b8302f"];
const DEC_LABEL = {"1920": "antes de 1930", "1930": "años 30", "1940": "años 40", "1950": "años 50", "1960": "años 60",
  "1970": "años 70", "1980": "años 80", "1990": "años 90", "2000": "2000-09", "2010": "2010-19", "2020": "2020-24"};
const DEC_SHORT = {"1920": "<1930", "1930": "30s", "1940": "40s", "1950": "50s", "1960": "60s", "1970": "70s", "1980": "80s",
  "1990": "90s", "2000": "00s", "2010": "10s", "2020": "20s"};

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
  if (!k || k === "ES") return "España";
  const c = k[0], r = k.slice(1);
  if (c === "m" || c === "b") return PLACES.muni[r]?.n || r;
  if (c === "x") return PLACES.country?.[r] || r;
  if (c === "q") return r === "66" ? "el extranjero" : (PLACES.prov[r]?.n || r);
  return PLACES.prov[r]?.n || r;
};
const provOf = k => k[0] === "m" ? PLACES.muni[k.slice(1)]?.p : k.slice(1);

// ---------- state and URL
const state = {view: "map", mode: "top", sex: "M", sel: null, place: null, rankArea: "ES", hideEx: false, rankN: 100, nbArea: "ES", nbSex: "M", genArea: "00", genSex: "M"};
function writeHash() {
  const p = new URLSearchParams();
  if (state.view !== "map") p.set("v", state.view);
  if (state.mode !== "top") p.set("c", state.mode);
  if (state.sex !== "M") p.set("s", state.sex);
  if (state.sel) p.set("n", `${state.sel.sex}:${state.sel.key}`);
  if (state.place) p.set("l", state.place);
  if (state.view === "rank" && state.rankArea !== "ES") p.set("r", state.rankArea);
  const h = p.toString();
  history.replaceState(null, "", h ? "#" + h : location.pathname);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.view = ["map", "rank", "evo", "stats"].includes(p.get("v")) ? p.get("v") : "map";
  state.mode = ["top", "char", "age", "conc"].includes(p.get("c")) ? p.get("c") : "top";
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
    : `<b>${esc(prov)}</b><span class="muted">provincia · ${esc(m?.n || "")} aún sin dato propio</span>${u.label ? "<br>" + u.label.replace(/ <i>\((provincia|[^)]*dato de la provincia)\)<\/i>/, "") : ""}`;
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
      u.label = u.few ? `<i>${esc(disp(sex, key))}: menos de 5 personas</i>` : u.v == null ? `<i>sin dato</i>` :
        `${esc(disp(sex, key))}: <b style="display:inline">${fmt2(u.v)} ‰</b> <i>(${fmt(u.count)} personas${u.prov ? ", dato de la provincia" : ""})</i>`;
    }
    const lo = [0, ...br];
    SEQ.slice(0, br.length + 1).forEach((c, i) => legend.push([c, i === br.length ? `${fmt2(lo[i])} ‰ o más` : `${fmt2(lo[i])} a ${fmt2(br[i])} ‰`]));
    legend.push([FEW, "menos de 5 personas"]);
    note = `Por cada 1.000 ${sex === "A" ? "habitantes, como primer apellido" : sex === "H" ? "hombres" : "mujeres"} de cada sitio.` +
      (anyMuni ? "" : " Aún sin datos por municipio: cada pueblo lleva el valor de su provincia.");
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
          label: t ? `nº 1: <b style="display:inline">${esc(disp(sex, t))}</b>${prov ? " <i>(provincia)</i>" : ""}` : v ? "<i>ninguno llega a 5 personas</i>" : "<i>sin dato</i>"};
      }
      top.forEach(n => legend.push([col.get(n), disp(sex, n), counts.get(n)]));
      legend.push([OTHER, "otro"]);
      note = "Número de municipios a la derecha." + (sex !== "A" ? " Colores emparejados: cada nombre de mujer lleva el color del nombre de hombre con el que más pueblos comparte el nº 1." : "");
      setLegend(`Nº 1 · ${SEXNAME[sex].toLowerCase()}`, legend, note);
    } else if (mode === "char") {
      const br = [2, 3, 5, 10, 20];
      for (const f of geo.features) {
        const ine = f.id.slice(4), {v, prov} = placeVal(ine), k = v?.["k" + sex];
        unitValue[ine] = {fill: k ? SEQ[1 + binOf(k[1], br)] : (v ? SEQ[0] : NONE), op: prov && anyMuni ? .55 : 1,
          label: k ? `<b style="display:inline">${esc(disp(sex, k[0]))}</b>: ${fmt1(k[1])} veces más que en España${prov ? " <i>(provincia)</i>" : ""}` : v ? "<i>ningún nombre llega al doble que en España</i>" : "<i>sin dato</i>"};
      }
      legend.push([SEQ[0], "menos del doble"]);
      br.forEach((b, i) => legend.push([SEQ[1 + i], i === br.length - 1 ? `${b} veces o más` : `${b} a ${br[i + 1]} veces`]));
      note = "El nombre con más peso aquí comparado con su peso en España (al menos 10 personas). Pasa el ratón para verlo.";
      setLegend(`Característico · ${SEXNAME[sex].toLowerCase()}`, legend, note);
    } else if (mode === "age" || mode === "conc") {
      const s = sex === "A" ? "M" : sex;
      const fld = (mode === "age" ? "age" : "t10") + s;
      const vals = geo.features.map(f => placeVal(f.id.slice(4)).v?.[fld]).filter(x => x != null);
      const pal = mode === "age" ? DIV : SEQ;
      const br = quantBreaks(vals, 7);
      for (const f of geo.features) {
        const ine = f.id.slice(4), {v, prov} = placeVal(ine), x = v?.[fld];
        unitValue[ine] = {fill: x == null ? NONE : pal[binOf(x, br)], op: prov && anyMuni ? .55 : 1,
          label: x == null ? "<i>sin dato</i>" : mode === "age" ? `Edad media de sus nombres: <b style="display:inline">${fmt1(x)} años</b>` : `Con uno de los 10 nombres más comunes: <b style="display:inline">${fmt1(x)} %</b>`};
      }
      const lo = [Math.min(...vals), ...br];
      pal.slice(0, br.length + 1).forEach((c, i) => legend.push([c, `${fmt1(lo[i])}${i < br.length ? " a " + fmt1(br[i]) : " o más"}${mode === "age" ? " años" : " %"}`]));
      note = mode === "age" ? "Media de la edad que tienen, en toda España, las personas con los nombres de aquí. Alta: nombres de generaciones mayores." :
        "Parte de la gente que lleva uno de los 10 nombres más repetidos del sitio. Más oscuro: los nombres se repiten más (menos variedad).";
      if (sex === "A") note = "Solo para nombres de pila: se muestra mujeres. " + note;
      setLegend(`${mode === "age" ? "Generación" : "Repetición"} · ${SEXNAME[s].toLowerCase()}`, legend, note);
    }
  }
  layer.eachLayer(l => { const u = unitValue[l.feature.id.slice(4)] || {}; l.setStyle({fillColor: u.fill || NONE, fillOpacity: u.op ?? 1}); });
  const chip = $("#sel-chip");
  if (state.sel) {
    chip.hidden = false;
    chip.innerHTML = `<span>${esc(disp(state.sel.sex, state.sel.key))} <small style="opacity:.75">${state.sel.sex === "A" ? "apellido" : state.sel.sex === "H" ? "hombres" : "mujeres"}</small></span><button type="button" title="Quitar">✕</button>`;
    chip.querySelector("button").onclick = () => { state.sel = null; writeHash(); restyle(); syncSummary(); };
  } else chip.hidden = true;
}
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
  if ((bound === 0 && share >= 50) || bound === 2) return `<span class="badge ex" title="Según la nacionalidad de quienes lo llevan en toda España (INE)">${bound === 2 ? "sobre todo" : share + " %"} extranjeros</span>`;
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
  let h = `<div class="ficha"><h2>${esc(placeName(k))}</h2><div class="sub">${isMuni ? `${placeLink("p" + pc)}` : "provincia"}${PLACES.ccaa[prov?.c] && PLACES.ccaa[prov?.c] !== prov?.n ? " · " + esc(PLACES.ccaa[prov?.c]) : ""}</div>`;
  if (!a) {
    if (isMuni && PLACES.v[k]) { showPanel(h + `<div class="note box">Ningún nombre ni apellido lo llevan 5 o más personas aquí, así que el INE no publica ninguno (secreto estadístico).</div><p>${placeLink("p" + pc)}</p></div>`); return; }
    h += `<div class="note box">${isMuni ? "Los nombres de este municipio aún no se han descargado del INE (la descarga de los 8.132 municipios está en marcha). Mientras, su provincia:" : "Sin datos."}</div>`;
    if (isMuni) h += `<p>${placeLink("p" + pc)}</p>`;
    showPanel(h + "</div>");
    return;
  }
  h += `<div class="kpis">
    <div class="kpi"><b>${v.popM ? fmt(v.popM) : "·"}</b><span>mujeres</span></div>
    <div class="kpi"><b>${v.popH ? fmt(v.popH) : "·"}</b><span>hombres</span></div>
    <div class="kpi"><b>${fmt1(v.ageM)} / ${fmt1(v.ageH)}</b><span>edad media de sus nombres (M / H) <span class="badge calc">calculado</span></span></div></div>
    <div class="note">Población deducida de las cifras del INE (personas con el nombre nº 1 y su tanto por mil). Solo aparecen nombres y apellidos que llevan al menos 5 personas aquí.</div>`;
  {
    const s = state.sex, lst = (a[s] || []).slice(0, 40);
    if (lst.length > 3) {
      const W = Math.min(380, ($("#panel").clientWidth || 400) - 40);
      h += `<h3>Mosaico · ${s === "A" ? "apellidos" : s === "H" ? "nombres de hombre" : "nombres de mujer"} <span class="h3n">(los 40 primeros; superficie según cuántos lo llevan)</span></h3>` +
        treemapHTML(lst.map(r => ({key: r[0], count: r[1], permil: r[2]})), s, W, Math.round(W * .72), s === "A" ? "de primer apellido" : "personas");
    }
  }
  for (const sex of ["M", "H"]) {
    const lst = a[sex] || [];
    h += `<h3>${SEXNAME[sex]} · los más comunes <span class="h3n">(${fmt(lst.length)} nombres con 5 o más)</span></h3>`;
    h += listTable(lst.slice(0, 10).map(([key, count, permil]) => ({sex, key, count, permil, badge: exBadge(sex, key)})));
    const ch = characteristic(sex, lst);
    if (ch.length) h += `<div class="note" style="margin-top:8px"><b>Característicos de aquí</b> <span class="badge calc">calculado</span>: ${ch.map(([key, r]) => `${nameLink(sex, key)} <small class="muted">×${fmt1(r)}</small>`).join(", ")}</div>`;
  }
  const A = a.A || [];
  h += `<h3>Apellidos · los más comunes <span class="h3n">(${fmt(A.length)} con 5 o más)</span></h3>`;
  if (A.length) {
    h += listTable(A.slice(0, 15).map(r => ({sex: "A", key: r[0], count: r[1], permil: r[2], badge: exBadge("A", r[0]), extra: r[5] ? ` · ${fmt(r[5])} con los dos` : ""})));
    h += `<div class="note">Como primer apellido, por cada 1.000 habitantes.</div>`;
    const ch = characteristic("A", A);
    if (ch.length) h += `<div class="note" style="margin-top:8px"><b>Apellidos característicos de aquí</b> <span class="badge calc">calculado</span>: ${ch.map(([key, r]) => `${nameLink("A", key)} <small class="muted">×${fmt1(r)}</small>`).join(", ")}</div>`;
  } else h += `<div class="note">Aún sin descargar.</div>`;
  // surnames of the people BORN here (they may live anywhere in Spain today)
  const born = await J(`area/${isMuni ? "b" + k.slice(1) : "q" + k.slice(1)}.json`);
  if (born?.A?.length) {
    h += `<h3>Apellidos de los nacidos aquí <span class="h3n">(vivan donde vivan hoy en España)</span></h3>` +
      listTable(born.A.slice(0, 15).map(r => ({sex: "A", key: r[0], count: r[1], permil: r[2]})));
    const ch = characteristic("A", born.A);
    if (ch.length) h += `<div class="note" style="margin-top:8px"><b>Característicos de los nacidos aquí</b> <span class="badge calc">calculado</span>: ${ch.map(([key, r]) => `${nameLink("A", key)} <small class="muted">×${fmt1(r)}</small>`).join(", ")}</div>`;
    h += `<div class="note">INE, apellidos por ${isMuni ? "municipio" : "provincia"} de nacimiento: primer apellido por cada 1.000 nacidos aquí que residen en España.</div>`;
  }
  h += await localSeriesHTML(k);
  h += `<h3>Más</h3><p class="note"><span class="lnk" data-rank="${esc(k)}" style="color:var(--accent);cursor:pointer">Ver el ranking completo de ${esc(placeName(k))} →</span></p>`;
  h += `<p class="note">Fuente: INE, consulta de nombres y apellidos por ${isMuni ? "municipio" : "provincia"} de residencia, censo anual de población a 1-1-2025.</p>`;
  showPanel(h + "</div>");
  $("#panel-body [data-rank]")?.addEventListener("click", () => { state.rankArea = k; setView("rank"); });
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
const SRCNOTE = {
  IBESTAT: "IBESTAT, nombres de los nacidos (nombres con más de 4 bebés en Baleares, contados en cada municipio e isla)",
  Idescat: "Idescat, nombres de los nacidos (4 bebés o más en el área)",
  IECA: "IECA, nombres de los recién nacidos andaluces",
};
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
    const where = meta.level === "k" ? `comarca de ${meta.label}` : meta.level === "i" ? `isla de ${meta.label}` : meta.label;
    h += `<h3>Bebés año a año <span class="h3n">(${esc(where)}, ${meta.years.join("-")})</span></h3>`;
    if (meta.src === "IECA" && meta.level === "m") {
      const ys = Object.keys({...d.M, ...d.H}).sort().reverse();
      h += `<table class="ones"><thead><tr><th>Año</th><th>Niña nº 1</th><th>Niño nº 1</th></tr></thead><tbody>${ys.map(y =>
        `<tr><td>${y}</td>${["M", "H"].map(s => `<td>${(d[s][y] || []).map(([n, c]) => `${nameLink(s, n)} <small class="muted">${fmt(c)}</small>`).join(", ")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    } else {
      for (const s of ["M", "H"]) {
        const ys = Object.keys(d[s] || {}).sort();
        if (ys.length < 2) continue;
        h += `<div class="note" style="margin-top:6px"><b style="color:var(--ink)">${s === "M" ? "Niñas" : "Niños"}</b>: los 5 primeros de cada año</div>` +
          bump(seriesFromYears(d[s], s, 5), ys, y => "’" + y.slice(2), 5, `bx-${key}-${s}`.replace(/[^\w-]/g, ""), width);
      }
    }
    h += `<div class="note">${esc(SRCNOTE[meta.src] || meta.src)}.</div>`;
  }
  if (SERIES_IDX.rx.includes(k)) {
    const d = await J(`rx/${k}.json`);
    if (d) {
      h += `<h3>Residentes año a año <span class="h3n">(2011-2022)</span></h3>`;
      for (const s of ["M", "H", "A"]) {
        const ys = Object.keys(d[s] || {}).sort();
        if (ys.length < 2) continue;
        h += `<div class="note" style="margin-top:6px"><b style="color:var(--ink)">${SEXNAME[s]}</b>: los 5 más comunes cada año</div>` +
          bump(seriesFromYears(d[s], s, 5), ys, y => "’" + y.slice(2), 5, `rx-${k}-${s}`, width);
      }
      h += `<div class="note">IVE (Generalitat Valenciana), estadística de los nombres y los apellidos de la población: los 30 primeros de cada municipio y año. En apellidos, quien lo lleva de primero o de segundo.</div>`;
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
  let h = `<div class="ficha"><h2>${esc(name)}</h2><div class="sub">${sex === "A" ? "apellido" : sex === "H" ? "nombre de hombre" : "nombre de mujer"}${name.toUpperCase() !== key ? "" : ""} · forma del INE: <code>${esc(key)}</code></div>`;
  if (sex === "A") {
    if (r && r[1] == null) h += `<div class="note box">No está entre los 5.000 apellidos más frecuentes de España, así que el INE no da su total nacional.${r[7] ? ` Sumando las provincias donde aparece, lo llevan de primero <b>al menos ${fmt(r[7])}</b> personas.` : " Solo aparece en las listas de algunos municipios."}</div>`;
    else h += `<div class="kpis"><div class="kpi"><b>${fmt(r?.[1])}</b><span>de primer apellido</span></div>
      <div class="kpi"><b>${fmt(r?.[2])}</b><span>de segundo</span></div><div class="kpi"><b>${fmt(r?.[3])}</b><span>con los dos</span></div></div>`;
    if (r?.[6]) h += `<div class="note">${fmt2(r[6])} de cada 1.000 habitantes de España lo llevan de primer apellido.</div>`;
  } else {
    const rank = r ? IDX[sex].indexOf(r) + 1 : null;
    h += `<div class="kpis"><div class="kpi"><b>${fmt(r?.[1])}</b><span>personas en España</span></div>
      <div class="kpi"><b>${rank ? "nº " + fmt(rank) : "·"}</b><span>entre los de ${sex === "H" ? "hombre" : "mujer"}</span></div>
      <div class="kpi"><b>${r?.[2] ? fmt1(r[2]) : "·"}</b><span>años de edad media</span></div></div>`;
    if (r?.[5]) h += `<div class="note">${fmt2(r[5])} de cada 1.000 ${sex === "H" ? "hombres" : "mujeres"} de España.</div>`;
  }
  const ex = exBadge(sex, key);
  if (r) {
    const share = sex === "A" ? r[4] : r[3], bound = sex === "A" ? r[5] : r[4];
    if (share != null) h += `<div class="note box">${bound === 1 ? `Menos del ${Math.max(share, 1)} %` : bound === 2 ? "Casi todos" : share === 0 ? "Menos del 1 %" : `El ${share} %`} de quienes lo llevan en España ${bound === 2 ? "son" : "tienen"} nacionalidad extranjera. ${ex ? "" : ""}<span class="muted">INE, consulta por nacionalidad.</span></div>`;
  }
  // etymology
  const ety = d.ety || [];
  const SHORT = {eswiki: "Wikipedia", eswiktionary: "Wikcionario", wikidata: "Wikidata", rule_patronymic: "deducción por la terminación"};
  const srcLink = c => { const n = SHORT[c.source_id] || srcName(c.source_id); return c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener" title="${esc(srcName(c.source_id))}, consultado el ${esc(c.retrieved || "")}">${esc(n)}</a>` : esc(n); };
  const etys = ety.filter(c => c.field === "etymology" || c.field === "origin");
  const facts = [["origin_language", "Lengua de origen"], ["meaning", "Significado"], ["surname_type", "Tipo de apellido"]]
    .map(([f, label]) => [label, ety.filter(c => c.field === f)]).filter(x => x[1].length);
  const eqs = ety.filter(c => c.field === "equivalent");
  h += `<h3>De dónde viene</h3>`;
  if (facts.length) h += facts.map(([label, cs]) => `<div class="note" style="margin:3px 0"><b style="color:var(--ink)">${label}:</b> ${cs.map(c => `${esc(c.value)} <small>(${srcLink(c)}${c.status === "proposed" ? ", sin confirmar" : ""})</small>`).join(" · ")}</div>`).join("");
  if (etys.length) h += etys.map(c => {
    const q = c.quote && c.quote !== c.value && !c.value.startsWith(c.quote.replace(/…$/, "").slice(0, 40)) ? `<br>«${esc(c.quote)}»` : "";
    return `<div class="ety ${c.status === "proposed" ? "proposed" : ""}"><div class="q">${esc(c.value)}</div><div class="src">${c.status === "proposed" ? "deducción, sin confirmar · " : ""}${srcLink(c)}, consultado el ${esc(c.retrieved || "")}${q}</div></div>`;
  }).join("");
  if (!etys.length && !facts.length) h += `<div class="note">${sex !== "A" && key.includes(" ") ? "Nombre compuesto: mira cada parte: " + key.split(" ").map(p => nameLink(sex, p)).join(" · ") : "Sin etimología documentada todavía."}</div>`;
  const LANG = {ca: "catalán", gl: "gallego", eu: "euskera", ast: "asturiano", an: "aragonés", oc: "aranés"};
  if (eqs.length) h += `<div style="margin-top:10px" class="note">En otras lenguas de España:</div><div class="eq">${eqs.map(c => `<span title="${esc(SHORT[c.source_id] || c.source_id)}">${esc(c.value)} <i>${esc(LANG[c.lang] || c.lang || "")}</i></span>`).join("")}</div>`;
  // generations
  if (sex !== "A") {
    h += `<h3>Por generaciones <span class="h3n">(año de nacimiento, ‰ de cada generación)</span></h3>`;
    h += d.dec ? decChart(d.dec) : `<div class="note">No está entre los más frecuentes de ninguna década (lista nacional del INE).</div>`;
    h += `<h3>Recién nacidos 2002-2024 <span class="h3n">(puesto en España)</span></h3>`;
    h += d.nb ? nbChart(d.nb) : `<div class="note">Nunca entre los 100 más puestos a los recién nacidos de un año.</div>`;
  }
  // where
  const pl = d.pl || [];
  const provs = pl.filter(x => x[0][0] === "p" && x[2] != null).sort((a, b) => b[2] - a[2]);
  const munis = pl.filter(x => x[0][0] === "m" && x[2] != null && x[1] >= 20).sort((a, b) => b[2] - a[2]);
  h += `<h3>Dónde es más frecuente</h3>`;
  if (provs.length) h += `<div class="note">Provincias, ${sex === "A" ? "por cada 1.000 habitantes (primer apellido)" : "por cada 1.000 " + (sex === "H" ? "hombres" : "mujeres")}:</div>` +
    listTable(provs.slice(0, 10).map(x => ({place: x[0], count: x[1], permil: x[2]})));
  if (munis.length) h += `<div class="note" style="margin-top:10px">Municipios (con al menos 20 personas que lo llevan):</div>` +
    listTable(munis.slice(0, 10).map(x => ({place: x[0], count: x[1], permil: x[2]})));
  if (!provs.length && !munis.length) h += `<div class="note">Sin datos territoriales todavía.</div>`;
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
      `<table class="rl">${nat.map((x, i) => `<tr><td class="r">${i + 1}</td><td class="n"><span class="lnk" data-rankarea="x${esc(x[0])}">${esc(PLACES.country?.[x[0]] || x[0])}</span></td><td class="v">${fmt(x[1])}<br><small>${fmt2(x[2])} ‰ de esa nacionalidad</small></td></tr>`).join("")}</table>`;
  }
  h += `<p class="note" style="margin-top:14px">Fuente: INE, censo anual de población a 1-1-2025 (consultas de nombres y apellidos) y estadística de nacimientos 2002-2024. Etimologías: cada una con su fuente.</p>`;
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
    hits += `<rect class="hit" x="${x(i) - 14}" y="0" width="28" height="${H}" data-tip="<b>Nacidos ${DEC_LABEL[d]}</b>${v != null ? fmt2(v) + " ‰" : "fuera de la lista"}"/>`;
  });
  const grid = [0, .5, 1].map(f => `<line class="grid" x1="${L}" x2="${W - 8}" y1="${y(max * f)}" y2="${y(max * f)}"/><text x="${L - 4}" y="${y(max * f) + 4}" text-anchor="end">${fmt2(max * f)}</text>`).join("");
  const xl = ds.map((d, i) => i % 2 === 0 || i === ds.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${DEC_SHORT[d]}</text>` : "").join("");
  return `<svg class="ch" viewBox="0 0 ${W} ${H}">${grid}${xl}<polyline class="ln" points="${pts.join(" ")}"/>${dots}${hits}</svg>
    <div class="note">Gente que vive hoy en España, por década de nacimiento: cuántos de cada 1.000 nacidos entonces se llaman así. Los huecos: fuera de la lista del INE esa década.</div>`;
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
    hits += `<rect class="hit" x="${x(i) - 7}" y="0" width="14" height="${H}" data-tip="<b>${yr}</b>${v ? `nº ${v[0]} · ${fmt(v[1])} bebés` : "fuera de los 100 primeros"}"/>`;
  });
  if (cur.length) segs.push(cur);
  const grid = [1, 3, 10, 30, 100].map(r => `<line class="grid" x1="${L}" x2="${W - 8}" y1="${y(r)}" y2="${y(r)}"/><text x="${L - 4}" y="${y(r) + 4}" text-anchor="end">${r}</text>`).join("");
  const xl = years.map((yr, i) => i % 4 === 0 || i === years.length - 1 ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${yr}</text>` : "").join("");
  return `<svg class="ch" viewBox="0 0 ${W} ${H}">${grid}${xl}${segs.map(s => `<polyline class="ln" points="${s.join(" ")}"/>`).join("")}${dots}${hits}</svg>
    <div class="note">Puesto entre los nombres puestos a los bebés de cada año (1 = el más puesto; escala logarítmica, del 1 al 100).</div>`;
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
  showPanel(`<div class="ficha"><h2>Nombres de España</h2><div class="sub">cómo se llama la gente de cada pueblo</div>
    <p>Busca un nombre o un apellido y el mapa te dirá dónde se concentra; pulsa un pueblo para ver sus nombres y apellidos más comunes y los que son típicos de allí.</p>
    <p class="note">Todo va en <b>tanto por mil</b>: cuántos de cada 1.000 habitantes (del mismo sexo, en los nombres de pila) lo llevan, para que un pueblo pequeño y una ciudad se puedan comparar.</p>
    <div class="kpis"><div class="kpi"><b>${fmt(c.names_M)}</b><span>nombres de mujer</span></div><div class="kpi"><b>${fmt(c.names_H)}</b><span>nombres de hombre</span></div><div class="kpi"><b>${fmt(c.surnames)}</b><span>apellidos</span></div></div>
    <h3>Para empezar</h3>
    <p>${[["M", "MARIA"], ["H", "JOSE"], ["M", "LUCIA"], ["H", "HUGO"], ["M", "ANE"], ["H", "XABIER"], ["M", "MONTSERRAT"], ["H", "MOHAMED"], ["A", "GARCIA"], ["A", "FERNANDEZ"], ["A", "RODRIGUEZ"], ["A", "SANCHEZ"]].map(([s, k]) => nameLink(s, k)).join(" · ")}</p>
    <p class="note">Nombres de pila en los 6.090 municipios que publica el INE y apellidos en los 8.125. En los pueblos muy pequeños ningún nombre llega a las 5 personas que exige el INE.</p>
    <p class="note"><span class="lnk" id="about-link" style="color:var(--accent);cursor:pointer">Qué es esto, fuentes y método →</span></p></div>`);
  $("#about-link").onclick = showAbout;
}
function showAbout() {
  showPanel(`<div class="ficha about"><h2>Acerca de</h2><div class="sub">fuentes, método y límites</div>
  <h3>Fuentes</h3>
  <ul>
    <li><b>INE, nombres y apellidos de la población</b> (censo anual a 1 de enero de 2025): consultas por municipio, provincia, década de nacimiento y nacionalidad de <a href="https://www.ine.es/tnombres/formGeneral.do?vista=1" target="_blank" rel="noopener">ine.es/tnombres</a> y <a href="https://www.ine.es/apellidos/formGeneral.do?vista=1" target="_blank" rel="noopener">ine.es/apellidos</a>.</li>
    <li><b>INE, nombres de los recién nacidos</b> 2002-2024 (estadística de nacimientos): los 100 primeros de España y los 10 primeros de cada comunidad, cada año.</li>
    <li><b>INE, apellidos por municipio y provincia de nacimiento</b>, y nombres y apellidos por <b>nacionalidad</b> (141 países), del mismo censo.</li>
    <li><b>Bebés por debajo de la comunidad</b>: IBESTAT (Baleares, cada municipio e isla, 2005-2024), Idescat (Cataluña, comarcas, 1997-2025) e IECA (Andalucía, provincias 1996-2025 y el nº 1 de cada pueblo 2010-2025).</li>
    <li><b>Residentes año a año</b> en la Comunitat Valenciana: IVE, los 30 primeros de cada municipio, 2011-2022.</li>
    <li><b>Etimologías</b>: Wikcionario, Wikipedia y Wikidata, cada una con su enlace y fecha.</li>
    <li>Límites municipales: GISCO (© EuroGeographics).</li>
  </ul>
  <h3>Cómo leer las cifras</h3>
  <ul>
    <li><b>Tanto por mil (‰)</b>, como lo da el INE: personas con ese nombre por cada 1.000 habitantes del mismo sexo del sitio; en los apellidos, por cada 1.000 habitantes, como primer apellido.</li>
    <li><b>Secreto estadístico</b>: el INE solo publica un nombre si lo llevan al menos 20 personas en España, y en cada sitio, al menos 5. En un pueblo pequeño salen pocos nombres; los que faltan no son ceros, son "menos de 5".</li>
    <li>El INE escribe los nombres <b>en mayúsculas y sin tildes</b>, y quita "de", "del": MARIA CARMEN es María del Carmen. La forma con tildes que se ve aquí sale de Wikcionario o Wikipedia cuando la hay.</li>
    <li>"María" es solo María a secas: María Carmen, María José… se cuentan aparte.</li>
  </ul>
  <h3>Residentes extranjeros</h3>
  <p>Las cifras cuentan a <b>todos los que viven</b> en cada sitio, tengan la nacionalidad que tengan, igual que el INE. El INE no separa por nacionalidad dentro de un municipio, así que no se puede "quitar" a nadie de un pueblo. Lo que sí da es, para toda España, cuántos de los que llevan cada nombre son extranjeros: eso sale en la ficha de cada nombre, y en los rankings se pueden <b>ocultar los nombres que llevan sobre todo extranjeros</b> (la gente sigue contada; solo se ocultan esas filas).</p>
  <h3>Lo calculado</h3>
  <ul>
    <li><b>Característico</b>: el nombre cuyo tanto por mil en el sitio es más veces el de España (con al menos 10 personas y al menos el doble).</li>
    <li><b>Generación</b>: media de la edad media nacional de los nombres que lleva la gente del sitio (no es la edad de la gente del pueblo, aunque se le parece).</li>
    <li><b>Repetición</b>: parte de la población que lleva uno de los 10 nombres más comunes del sitio. Cuanto más alta, menos variedad.</li>
  </ul>
  <p class="note">Hecho sin ánimo de lucro. Cada dato lleva su fuente.</p></div>`);
}

// ---------- rankings view
async function renderRank() {
  const w = $("#rankwrap");
  const sex = state.sex;
  const opts = [`<option value="ES">España</option>`].concat(Object.entries(PLACES.prov).sort((a, b) => a[1].n.localeCompare(b[1].n, "es")).map(([pc, p]) => `<option value="p${pc}">${esc(p.n)}</option>`));
  if (state.rankArea[0] === "m") opts.splice(1, 0, `<option value="${state.rankArea}">${esc(placeName(state.rankArea))} (municipio)</option>`);
  if (sex === "A") opts.push(`<optgroup label="Por provincia de NACIMIENTO">${Object.entries(PLACES.prov).sort((a, b) => a[1].n.localeCompare(b[1].n, "es")).map(([pc, p]) => `<option value="q${pc}">Nacidos en ${esc(p.n)}</option>`).join("")}<option value="q66">Nacidos en el extranjero</option></optgroup>`);
  opts.push(`<optgroup label="Por nacionalidad (residentes en toda España)">${(PLACES.xs || []).map(c => [c, PLACES.country?.[c] || c]).sort((a, b) => a[1].localeCompare(b[1], "es")).map(([c, n]) => `<option value="x${c}">${esc(n)}</option>`).join("")}</optgroup>`);
  let rows = [];
  if (state.rankArea === "ES") {
    rows = IDX[sex].map(r => sex === "A" ? {key: r[0], count: r[1], permil: r[6], n2: r[2], nb: r[3]} : {key: r[0], count: r[1], permil: r[5], age: r[2]});
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
  const title = `${SEXNAME[sex]} · ${ra === "ES" ? "España" : ra[0] === "x" ? "nacionalidad: " + placeName(ra) : ra[0] === "q" ? "nacidos en " + placeName(ra) : placeName(ra)}`;
  const tmW = Math.min(980, (w.clientWidth || 900) - 40);
  const tmHTML = rows.length > 3 ? `<div class="tm-card"><h3>Mosaico de los 60 primeros</h3><p class="note">Cada rectángulo, un ${sex === "A" ? "apellido" : "nombre"}; su superficie, cuánta gente lo lleva.</p>${treemapHTML(rows.slice(0, 60), sex, tmW - 28, Math.round(Math.min(520, tmW * .55)), sex === "A" ? "de primer apellido" : "personas")}</div>` : "";
  w.innerHTML = `<div class="tools">
      <select id="r-area">${opts.join("")}</select>
      <label class="chip toggle"><input type="checkbox" id="r-ex" ${state.hideEx ? "checked" : ""}> ocultar los que llevan sobre todo extranjeros</label>
      <select id="r-n"><option value="100">100 primeros</option><option value="500">500 primeros</option><option value="0">todos</option></select>
    </div>
    <div class="rank-title">${esc(title)}</div>
    ${tmHTML}
    <p class="note">${fmt(all)} ${sex === "A" ? "apellidos" : "nombres"} con dato${hidden ? ` · ${fmt(hidden)} ocultos por llevarlos sobre todo extranjeros (siguen contados en el total)` : ""}. ${sex === "A" ? "Primer apellido por cada 1.000 habitantes." : `Por cada 1.000 ${sex === "H" ? "hombres" : "mujeres"}.`} Pulsa uno para ver su ficha y su mapa.</p>
    <table class="rank-table"><thead><tr><th class="v">#</th><th>${sex === "A" ? "Apellido" : "Nombre"}</th><th class="v">${sex === "A" ? "1.er apellido" : "Personas"}</th><th class="v">‰</th><th></th>${sex === "A" ? `<th class="v">2.º apellido</th><th class="v">los dos</th>` : `<th class="v">Edad media</th>`}<th class="v">Extranjeros</th></tr></thead>
    <tbody>${shown.map(r => {
      const ir = idxRow(sex, r.key); const share = ir ? (sex === "A" ? ir[4] : ir[3]) : null, bound = ir ? (sex === "A" ? ir[5] : ir[4]) : 0;
      return `<tr><td class="v muted">${r.rank}</td><td class="n" data-name="${sex}:${esc(r.key)}">${esc(disp(sex, r.key))}</td><td class="v">${fmt(r.count)}</td><td class="v">${fmt2(r.permil)}</td>
      <td style="width:18%"><div class="b" style="width:${Math.max(2, 100 * (r.permil || 0) / max)}%"></div></td>
      ${sex === "A" ? `<td class="v">${fmt(r.n2)}</td><td class="v">${fmt(r.nb)}</td>` : `<td class="v">${r.age ? fmt1(r.age) : ""}</td>`}
      <td class="v muted">${share == null ? "" : bound === 1 ? "<" + share + " %" : bound === 2 ? "casi todos" : share + " %"}</td></tr>`;
    }).join("")}</tbody></table>
    <p class="note">Edad media y extranjeros: cifras de toda España para ese nombre (INE). Fuente: INE, censo anual de población a 1-1-2025.</p>`;
  $("#r-area").value = state.rankArea;
  if ($("#r-area").value !== state.rankArea) { state.rankArea = "ES"; return renderRank(); }
  $("#r-n").value = String(state.rankN);
  $("#r-area").onchange = e => { state.rankArea = e.target.value; writeHash(); renderRank(); };
  $("#r-ex").onchange = e => { state.hideEx = e.target.checked; renderRank(); };
  $("#r-n").onchange = e => { state.rankN = +e.target.value; renderRank(); };
}

// ---------- evolution view
function bump(series, xs, xlabel, maxRank, id, width) {
  // series: Map name -> {label, ranks: {x: rank}}; drawn at the real width so text stays 11 px
  const W = width || Math.max(480, Math.min(1060, ($("#evowrap").clientWidth || 900) - 70)), H = 36 + maxRank * (width ? 24 : 32);
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
  return `<svg class="ch bump" id="${id}" viewBox="0 0 ${W} ${H}">${grid}${ranksL}${g}</svg>`;
}
function wireBump(id, sex) {
  const svg = document.getElementById(id);
  if (!svg) return;
  svg.querySelectorAll("g.s").forEach(g => {
    g.addEventListener("mouseenter", () => { g.classList.add("on"); g.parentNode.appendChild(g); });
    g.addEventListener("mouseleave", () => g.classList.remove("on"));
    g.addEventListener("click", () => openName(sex, g.dataset.k));
  });
}
async function renderEvo() {
  const w = $("#evowrap");
  const regional = state.nbArea.includes(":");
  const nbData = regional ? (await J(`nbx/${state.nbArea.replace(":", "_")}.json`)) : NB[state.nbArea];
  const years = Object.keys((nbData || NB.ES)[state.nbSex] || NB.ES.M).sort();
  const LV = {p: "provincia", i: "isla", k: "comarca", m: "municipio", c: "comunidad"};
  const groups = {};
  for (const [key, m] of Object.entries(SERIES_IDX.nb)) {
    if (m.src === "IECA" && m.level === "m") continue;  // only the nº 1 per town: shown in the town's ficha
    (groups[m.src] = groups[m.src] || []).push([key, `${m.label} (${LV[m.level] || m.level}, ${m.years.join("-")})`]);
  }
  const GL = {IECA: "Andalucía · IECA", IBESTAT: "Illes Balears · IBESTAT", Idescat: "Catalunya · Idescat"};
  const ccaaOpts = [`<optgroup label="INE · 2002-2024"><option value="ES">España</option>`].concat(Object.keys(NB).filter(k => k !== "ES").sort().map(k => `<option value="${k}">${esc(PLACES.ccaa[k] || k)}</option>`)).concat(["</optgroup>"])
    .concat(Object.entries(groups).map(([g, lst]) => `<optgroup label="${esc(GL[g] || g)}">${lst.sort((a, b) => a[1].localeCompare(b[1], "es")).map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join("")}</optgroup>`));
  const genName = k => k === "66" ? "Nacidos en el extranjero" : (PLACES.prov[k]?.n ? "Nacidos en " + PLACES.prov[k].n : k);
  const genOpts = [`<option value="00">España</option>`].concat(Object.keys(GEN.g).filter(k => k !== "00").sort((a, b) => genName(a).localeCompare(genName(b), "es")).map(k => `<option value="${k}">${esc(genName(k))}</option>`));
  const seg = (id, v) => `<span class="seg" id="${id}">${["M", "H"].map(s => `<button type="button" class="seg-btn ${v === s ? "active" : ""}" data-s="${s}">${SEXNAME[s]}</button>`).join("")}</span>`;
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
    <div class="card"><h2>Los nombres de los bebés, año a año</h2>
      <p class="note">Los 10 nombres más puestos cada año. Pasa el ratón por una línea para seguirla; púlsala para ver su ficha.</p>
      <div class="tools"><select id="nb-area">${ccaaOpts.join("")}</select>${seg("nb-sex", state.nbSex)}</div>
      ${bump(ser, years, y => "’" + y.slice(2), maxR, "bump-nb")}
      ${regional ? `<p class="note">${esc(SRCNOTE[SERIES_IDX.nb[state.nbArea]?.src] || "")}. Aquí se guardan los 15 primeros de cada año.</p>` : ""}
      <table class="ones"><thead><tr><th>Año</th><th>Nº 1</th><th class="v">bebés</th><th class="v">de cada 1.000</th></tr></thead><tbody>
      ${ones.slice().reverse().map(([y, r, t]) => r ? `<tr><td>${y}</td><td>${nameLink(state.nbSex, r[0])}</td><td class="v">${fmt(r[1])}</td><td class="v">${t ? fmt1(1000 * r[1] / t[1]) : ""}</td></tr>` : "").join("")}</tbody></table>
      <p class="note">Fuentes: INE, estadística de nacimientos (100 primeros de España y 10 de cada comunidad, 2002-2024); y por provincia, isla, comarca o municipio, IECA (Andalucía, 1996-2025), IBESTAT (Baleares, 2005-2024) e Idescat (Cataluña, 1997-2025).</p></div>
    <div class="card"><h2>Por generaciones: de los nacidos antes de 1930 a los de 2020</h2>
      <p class="note">Los 10 nombres más frecuentes entre la gente que vive hoy en España, según su década de nacimiento${state.genArea !== "00" ? " y su <b>provincia de nacimiento</b> (no la de residencia)" : ""}. Es la foto de 2025: de las generaciones mayores solo cuenta quien sigue vivo y residiendo en España.</p>
      <div class="tools"><select id="gen-area">${genOpts.join("")}</select>${seg("gen-sex", state.genSex)}</div>
      ${bump(gser, GEN.decades, d => DEC_SHORT[d], maxR, "bump-gen")}
      <p class="note">Fuente: INE, censo anual de población a 1-1-2025, nombres por provincia y década de nacimiento.</p></div>
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
  if (!STATS) { w.innerHTML = "<p class='note'>Sin datos.</p>"; return; }
  const H = STATS.topH.slice(0, 10), M = STATS.topM.slice(0, 10);
  const cell = new Map(STATS.cross.map(([h, m, c, p]) => [h + "|" + m, [c, p]]));
  const max = Math.max(...STATS.cross.map(x => x[2]));
  const shade = c => c ? SEQ[Math.min(SEQ.length - 1, Math.floor(SEQ.length * Math.sqrt(c / max) * .999))] : "#f6f3ee";
  let x = `<table class="xt"><thead><tr><th></th>${M.map(m => `<th>${nameLink("M", m)}</th>`).join("")}</tr></thead><tbody>` +
    H.map(h => `<tr><th>${nameLink("H", h)}</th>${M.map(m => { const [c, p] = cell.get(h + "|" + m) || [0, 0]; const i = c ? SEQ.indexOf(shade(c)) : -1;
      return `<td class="${i >= 3 ? "dk" : ""} ${c ? "" : "zero"}" style="background:${shade(c)}" data-tip="<b>${esc(disp("H", h))} y ${esc(disp("M", m))}</b>${c ? `nº 1 a la vez en ${fmt(c)} municipios (${fmt(p)} habitantes)` : "nunca a la vez"}">${c || "·"}</td>`; }).join("")}</tr>`).join("") + "</tbody></table>";
  const {H: cH, M: cM, r} = STATS.corr;
  const best = (i, byRow) => (byRow ? cM.map((m, j) => [m, r[i][j]]) : cH.map((h, j) => [h, r[j][i]])).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const bar = v => `<small>${fmt2(v)}</small>`;
  const pairsH = cH.slice(0, 24).map((h, i) => `<div class="pair"><span class="a">${nameLink("H", h)}</span><span class="bs">${best(i, true).map(([m, v]) => `<span>${nameLink("M", m)} ${bar(v)}</span>`).join("")}</span></div>`).join("");
  const pairsM = cM.slice(0, 24).map((m, j) => `<div class="pair"><span class="a">${nameLink("M", m)}</span><span class="bs">${best(j, false).map(([h, v]) => `<span>${nameLink("H", h)} ${bar(v)}</span>`).join("")}</span></div>`).join("");
  w.innerHTML = `<div class="evo-grid">
    <div class="card"><h2>El nº 1 de hombre y el nº 1 de mujer de cada pueblo</h2>
      <p class="note">En cuántos municipios el nombre de hombre más común (filas) y el de mujer más común (columnas) son esa pareja. Por eso en el mapa "El más común" cada nombre de mujer lleva el color del de hombre con el que más coincide: Antonio y María, Manuel y María Carmen, Jordi y Montserrat.</p>
      <div style="overflow-x:auto">${x}</div>
      <p class="note">Calculado a partir del INE (censo 1-1-2025), con los ${fmt(STATS.cross.reduce((a, b) => a + b[2], 0))} municipios que tienen los dos nº 1. <span class="badge calc">calculado</span></p></div>
    <div class="card"><h2>Nombres que suben y bajan juntos</h2>
      <p class="note">Para cada uno de los nombres más comunes, los tres del otro sexo cuyo tanto por mil sube y baja con el suyo de un pueblo a otro (correlación de 0 a 1; 1 = van siempre a la par). Aparecen dos efectos: la forma femenina del mismo nombre (Antonio y Antonia, Francisco y Francisca), que suele ser de la misma familia o la misma devoción local, y la generación (David y Laura, Alejandro y Lucía), porque los pueblos con más jóvenes tienen más de los dos.</p>
      <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);margin:14px 0 4px">Hombres → mujeres</h3><div class="pairs">${pairsH}</div>
      <h3 style="font-size:12px;text-transform:uppercase;color:var(--muted);margin:16px 0 4px">Mujeres → hombres</h3><div class="pairs">${pairsM}</div>
      <p class="note">Correlación de Pearson del tanto por mil en los ${fmt(STATS.corr.towns)} municipios de 2.000 habitantes o más, entre los 40 nombres más comunes de cada sexo en España; un nombre que no aparece en un pueblo cuenta como 0 (lo llevan menos de 5 personas). Que dos nombres vayan juntos no quiere decir que sean de las mismas personas ni de las mismas parejas. <span class="badge calc">calculado</span></p></div>
  </div>`;
}

// ---------- search
let SEARCH = [];
function buildSearch() {
  for (const sex of ["M", "H", "A"]) IDX[sex].forEach((r, i) => SEARCH.push({t: sex, key: r[0], n: norm(disp(sex, r[0])), label: disp(sex, r[0]), w: r[1] || r[7] || 0, floor: !r[1], rank: i}));
  for (const [ine, m] of Object.entries(PLACES.muni)) SEARCH.push({t: "m", key: "m" + ine, n: norm(m.n), label: m.n, sub: PLACES.prov[m.p]?.n, w: 1e9});
  for (const [pc, p] of Object.entries(PLACES.prov)) SEARCH.push({t: "p", key: "p" + pc, n: norm(p.n), label: p.n, sub: "provincia", w: 2e9});
}
const KIND = {M: "mujer", H: "hombre", A: "apellido", m: "municipio", p: "provincia"};
let sugIdx = -1, sugItems = [];
function suggest(q) {
  const box = $("#suggest");
  const nq = norm(q);
  if (nq.length < 2) { box.hidden = true; return; }
  const starts = [], inner = [];
  for (const s of SEARCH) {
    if (s.n.startsWith(nq)) starts.push(s); else if (nq.length >= 3 && s.n.includes(nq)) inner.push(s);
    if (starts.length > 400) break;
  }
  const score = s => (s.n === nq ? 1e12 : 0) + (s.t === "m" || s.t === "p" ? 5e8 : 0) + s.w;
  sugItems = [...starts.sort((a, b) => score(b) - score(a)), ...inner.sort((a, b) => score(b) - score(a))].slice(0, 14);
  sugIdx = -1;
  box.innerHTML = sugItems.map((s, i) => `<div class="sug" data-i="${i}"><span class="kind">${KIND[s.t]}</span><span class="sn">${esc(s.label)}</span><span class="ss">${s.t === "m" || s.t === "p" ? esc(s.sub || "") : (s.floor ? (s.w ? "≥" + fmt(s.w) : "local") : fmt(s.w)) + (s.t === "A" ? " 1.er ap." : " pers.")}</span></div>`).join("") || `<div class="sug muted">Nada con "${esc(q)}"</div>`;
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
const MODE_NAME = {top: "El más común", char: "Característico", age: "Generación", conc: "Repetición"};
const SEX_LONG = {M: "Nombres de mujer", H: "Nombres de hombre", A: "Apellidos"};
function syncSummary() {
  const s = state.view === "map" ? `${MODE_NAME[state.mode]} · ${SEX_LONG[state.sex]}` : SEX_LONG[state.sex];
  $("#mob-sum").textContent = state.sel && state.view === "map" ? `${disp(state.sel.sex, state.sel.key)} en el mapa` : s;
}
$("#mob-toggle").onclick = () => {
  const open = !document.body.classList.contains("filters-open");
  document.body.classList.toggle("filters-open", open);
  $("#mob-toggle").setAttribute("aria-expanded", open);
  $("#mob-toggle .ti").textContent = open ? "−" : "＋";
};
function closeFilters() { document.body.classList.remove("filters-open"); $("#mob-toggle .ti").textContent = "＋"; $("#mob-toggle").setAttribute("aria-expanded", "false"); }
function syncButtons() {
  $$(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  $$(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === state.mode));
  $$("#sex-tabs .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.sex === state.sex));
  document.body.classList.remove("view-map", "view-rank", "view-evo", "view-stats");
  document.body.classList.add("view-" + state.view);
  if ($("#mob-sum")) syncSummary();
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
});
$$(".about-open").forEach(b => b.onclick = () => { closeFilters(); showAbout(); });
document.querySelector(".brand").addEventListener("click", e => { e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload(); });

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
  $("#stats").innerHTML = `<b>${fmt(c.names_H + c.names_M)}</b> nombres · <b>${fmt(c.surnames)}</b> apellidos · <b>${fmt(c.munis_with_data)}</b> municipios · censo 1-1-2025`;
  buildSearch();
  readHash();
  syncButtons();
  const mapReady = initMap().then(() => { if (state.view === "map") restyle(); });
  setView(state.view);
  await mapReady;
  if (state.sel) openName(state.sel.sex, state.sel.key);
  else if (state.place) openPlace(state.place);
  else if (!isPhone()) showWelcome();
  else $("#panel-body").innerHTML = "";
})();
