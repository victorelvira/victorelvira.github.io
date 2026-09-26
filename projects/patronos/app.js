"use strict";
const DATA_V = "0.10.0";
const BUILD_AT = "2026-09-26 18:23";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const fmt = n => n.toLocaleString("es-ES");
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const md = s => { const m = /^(\d\d)-(\d\d)$/.exec(s || ""); return m ? `${+m[2]} de ${MONTHS[+m[1] - 1]}` : ""; };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const idOf = f => f.properties.id.split(":")[1];

// Countries live on the same page, one tab each; the data folder follows the country.
const COUNTRIES = {
  es: {name: "España", dir: "patronos/data/", code: "INE", center: [40.2, -3.7], zoom: 6},
  it: {name: "Italia", dir: "patronos/data/it/", code: "ISTAT", center: [42.3, 12.6], zoom: 6},
};

const GROUP = {
  maria: {n: "Virgen María", c: "#3f6fae"}, cristo: {n: "Cristo", c: "#a8323e"}, santo: {n: "santo o santa", c: "#c9962f"},
  dios: {n: "Dios (Trinidad)", c: "#6b4c9a"}, sin_identificar: {n: "sin identificar", c: "#9a9187"},
};
const AGREE = {
  agree: {n: "coinciden", c: "#3f8f5a"}, partial: {n: "Wikidata añade", c: "#e0a526"}, disagree: {n: "no coinciden", c: "#c0392b"},
  only_eswiki: {n: "solo Wikipedia", c: "#6d8fc4"}, only_wikidata: {n: "solo Wikidata", c: "#9b86c2"},
  only_text: {n: "solo el texto del artículo", c: "#8fb3a8"}, only_fiesta: {n: "solo una fiesta local", c: "#c9b38a"},
};
const NODATA = "#ece7df", OTHER = "#cfc5b6", FADE = "#e9e4dc";
const PALETTE = ["#e0a526", "#2f8f6b", "#d0672f", "#7a55a8", "#3aa0b8", "#b35c8a", "#6a8f2f", "#8a5a2b",
  "#d24b6b", "#c47ac0", "#a8b83a", "#1f6f7a"];
const WIKI = {itwiki: "la Wikipedia en italiano", eswiki: "la Wikipedia en español", cawiki: "la Wikipedia en catalán", enwiki: "la Wikipedia en inglés"};
const SRC_NAME = {eswiki: "Wikipedia · ficha del pueblo", eswiki_text: "Wikipedia · texto del artículo", wikidata: "Wikidata · P417",
  itwiki: "Wikipedia en italiano · ficha del comune", fiesta_local: "Fiesta local oficial"};

let D, map, geoLayer = null, layers = {}, colorOf = {}, topKeys = [], firstCount = {}, BV = "", CH = null, chLayer = null, townIndex = [];
const cache = {};
const TODAY = (() => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const state = {country: "es", view: "main", town: null, dev: null, area: null, nodata: false, list: 40, q: "", churches: false,
  day: TODAY, g: ""};
const C = () => COUNTRIES[state.country];

// ---------- URL state (LLM.md §2c: every screen is a link) ----------
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.country = COUNTRIES[p.get("c")] ? p.get("c") : "es";
  state.view = ["main", "group", "agree", "cal"].includes(p.get("v")) ? p.get("v") : "main";
  state.day = /^\d\d-\d\d$/.test(p.get("dia") || "") ? p.get("dia") : TODAY;
  state.town = p.get("t") || null;
  state.dev = p.get("d") || null;
  state.area = p.get("p") ? {k: "p", v: p.get("p")} : p.get("r") ? {k: "c", v: p.get("r")} : null;
  state.nodata = p.get("nd") === "1";
  state.churches = p.get("ig") === "1";
}
function validate() {
  if (state.town && !D.towns[state.town]) state.town = null;
  if (state.dev && !D.devotions[state.dev]) state.dev = null;
  if (state.area && !Object.values(D.towns).some(t => t[state.area.k] === state.area.v)) state.area = null;
}
function writeHash(push) {
  const p = new URLSearchParams();
  if (state.country !== "es") p.set("c", state.country);
  if (state.view !== "main") p.set("v", state.view);
  if (state.town) p.set("t", state.town);
  if (state.dev) p.set("d", state.dev);
  if (state.area) p.set(state.area.k === "p" ? "p" : "r", state.area.v);
  if (state.nodata) p.set("nd", "1");
  if (state.churches) p.set("ig", "1");
  if (state.view === "cal" && state.day !== TODAY) p.set("dia", state.day);
  const h = p.toString() ? "#" + p.toString() : location.pathname;
  if (("#" + p.toString()) === location.hash) return;
  (push ? history.pushState : history.replaceState).call(history, null, "", h);
}
window.addEventListener("popstate", async () => {
  cardPushed = false;
  const before = state.country;
  readHash();
  if (state.country !== before) await loadCountry(state.country, false);
  validate();
  renderAll();
});

// ---------- load ----------
(async function init() {
  readHash();
  initMap();
  initControls();
  await loadCountry(state.country, !state.town);
  validate();
  renderAll();
  if (state.town) zoomTo(state.town);
})();

async function fetchCountry(c) {
  if (cache[c]) return cache[c];
  const dir = COUNTRIES[c].dir;
  const b = await fetch(`${dir}build.json`, {cache: "no-store"}).then(r => r.json()).catch(() => ({v: DATA_V}));
  const [data, geo] = await Promise.all([
    fetch(`${dir}patronos.json?v=${b.v}`).then(r => r.json()),
    fetch(`${dir}municipalities.geojson?v=${b.v}`).then(r => r.json()),
  ]);
  for (const d of Object.values(data.devotions)) d.n = cap(d.n);   // "san Rocco" (Italian usage) shown as a name
  cache[c] = {data, geo, v: b.v};
  return cache[c];
}
async function loadCountry(c, fit = true) {
  $("#stats").textContent = "cargando…";
  const {data, geo, v} = await fetchCountry(c);
  D = data; BV = v; CH = null;
  if (chLayer) { chLayer.remove(); chLayer = null; }
  prepare();
  if (geoLayer) geoLayer.remove();
  layers = {};
  geoLayer = L.geoJSON(geo, {
    style: f => styleOf(idOf(f)),
    onEachFeature: (f, layer) => {
      const ine = idOf(f);
      layers[ine] = layer;
      layer.on("mousemove", e => showTip(ine, e.originalEvent));
      layer.on("mouseout", hideTip);
      layer.on("click", () => { hideTip(); selectTown(ine, true); });
    },
  }).addTo(map);
  if (fit) map.setView(C().center, C().zoom);
  $("#churches-btn").hidden = !D.meta.churches;
  document.querySelectorAll(".country .cty").forEach(b => b.classList.toggle("on", b.dataset.c === c));
  document.title = `Patronos de ${C().name} · el santo de cada pueblo`;
  $(".brand strong").textContent = `Patronos de ${C().name}`;
  townIndex = Object.entries(D.towns).map(([ine, t]) => [ine, fold(t.n + " " + (t.n2 || "")), t]);
}

function first(t) { return t.e && t.e.length ? t.e[0] : null; }
function prepare() {
  firstCount = {}; colorOf = {};
  for (const t of Object.values(D.towns)) { const f = first(t); if (f) firstCount[f.k] = (firstCount[f.k] || 0) + 1; }
  topKeys = Object.keys(firstCount).filter(k => !k.startsWith("txt:")).sort((a, b) => firstCount[b] - firstCount[a]).slice(0, 14);
  let i = 0;
  for (const k of topKeys) colorOf[k] = k === "maria" ? GROUP.maria.c : k === "cristo" ? GROUP.cristo.c : PALETTE[i++ % PALETTE.length];
  const m = D.meta, pct = Math.round(100 * m.with_data / m.towns);
  $("#stats").innerHTML = `<b>${fmt(m.with_data)}</b> de ${fmt(m.towns)} pueblos con dato (${pct} %) · <b>${fmt(Object.values(D.devotions).filter(d => d.c).length)}</b> patrones distintos`;
}

// ---------- map ----------
function initMap() {
  map = L.map("map", {preferCanvas: true, minZoom: 4, maxZoom: 17, zoomSnap: 0.25}).setView(COUNTRIES.es.center, 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · contornos © EuroGeographics (GISCO)',
    opacity: 0.45, maxZoom: 17,
  }).addTo(map);
  map.on("zoomend", restyle);
  map.on("moveend", drawChurches);
  map.on("movestart zoomstart", hideTip);
}
const inArea = t => !state.area || t[state.area.k] === state.area.v;
function fillOf(ine) {
  const t = D.towns[ine];
  const has = t.e && t.e.length;
  if (!inArea(t)) return "#f3f0ea";
  if (state.dev) {
    if (has && t.e.some(e => e.k === state.dev)) return devColor(state.dev);
    return has ? FADE : NODATA;
  }
  if (state.nodata) return has ? FADE : "#8d7f70";
  if (!has) return NODATA;
  if (state.view === "group") return GROUP[D.devotions[t.e[0].k].g].c;
  if (state.view === "agree") return AGREE[t.a].c;
  if (state.view === "cal") {
    const hit = t.e.find(e => onDay(e, state.day));
    if (hit) return devColor(hit.k);
    return t.e.some(e => dayOf(e)) ? FADE : NODATA;
  }
  return colorOf[t.e[0].k] || OTHER;
}
function devColor(k) { return colorOf[k] || (GROUP[D.devotions[k].g] || GROUP.santo).c; }
function styleOf(ine) {
  const sel = ine === state.town;
  const z = map ? map.getZoom() : 6, base = z >= 12 ? 0.25 : z >= 10 ? 0.55 : 0.9;
  return {fillColor: fillOf(ine), fillOpacity: D.towns[ine].x && !state.nodata ? base * 0.55 : base,
    color: sel ? "#1d1519" : "#fff", weight: sel ? 2 : (map && map.getZoom() >= 8 ? 0.5 : 0.25)};
}
function restyle() { for (const ine in layers) layers[ine].setStyle(styleOf(ine)); if (state.town && layers[state.town]) layers[state.town].bringToFront(); }
function zoomTo(ine) { const l = layers[ine]; if (l) map.fitBounds(l.getBounds(), {maxZoom: 9, padding: [40, 40]}); }
function zoomArea() {
  const b = L.latLngBounds([]);
  for (const [ine, t] of Object.entries(D.towns)) if (inArea(t) && layers[ine]) b.extend(layers[ine].getBounds());
  if (b.isValid()) map.fitBounds(b, {padding: [30, 30]});
}

// ---------- tooltip: says who each mark is (LLM.md §2c) ----------
const tip = $("#tip");
function place(ev) { tip.style.left = Math.min(ev.clientX + 14, innerWidth - 290) + "px"; tip.style.top = Math.min(ev.clientY + 14, innerHeight - 90) + "px"; }
function showTip(ine, ev) {
  const t = D.towns[ine];
  const names = (t.e || []).map(e => devName(e)).slice(0, 4);
  tip.innerHTML = `<b>${esc(t.n)}</b> <span class="tp">${esc(t.p)}</span>` +
    `<div class="tl">${names.length ? names.map(esc).join("<br>") + (t.e.length > 4 ? `<br>y ${t.e.length - 4} más` : "") : "<i>sin dato todavía</i>"}</div>`;
  tip.hidden = false; place(ev);
}
function hideTip() { tip.hidden = true; }

// ---------- days ----------
// The day of a patron: the town's own (infobox or local holiday), else the advocation's feast, else the saint's (P841).
function dayOf(e) {
  if (e.d) return {md: e.d, how: e.s && e.s[0] && e.s[0][0] === "fiesta_local" ? "fecha de la fiesta local oficial" : "según la ficha del pueblo"};
  if (e.fd) return {md: e.fd, how: "fiesta de la advocación en Wikidata"};
  const d = D.devotions[e.k];
  if (d.g === "santo" && d.f) {
    const all = d.f.split(";");
    if (all.length === 1) return {md: d.f, how: "fiesta litúrgica del santo en Wikidata", all};
    // several feasts in Wikidata (often the old and the reformed calendar): we do not know which one the town keeps
    return {md: all.includes(state.day) ? state.day : all[0], all,
      how: `una de las ${all.length} fiestas del santo en Wikidata; no se sabe cuál celebra el pueblo`};
  }
  return null;
}
const onDay = (e, day) => { const d = dayOf(e); return !!d && (d.all ? d.all.includes(day) : d.md === day); };
const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
function shiftDay(m, n) {
  const d = new Date(2024, +m.slice(0, 2) - 1, +m.slice(3) + n);   // 2024: a leap year, so 29 February exists
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Display only: the source writes "NTRA. SRA. DE LAS AGUAS"; the stored value keeps it as it came.
function niceName(s) {
  const small = new Set(["de", "del", "la", "las", "los", "el", "y", "e", "a", "al"]);
  return s.toLowerCase().split(/(\s+)/).map((w, i) => /^\s+$/.test(w) || (i > 0 && small.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join("");
}
function devName(e) {
  const d = D.devotions[e.k];
  if ((d.g === "maria" || d.g === "cristo" || d.g === "dios" || d.g === "sin_identificar") && e.t) return e.t;
  return d.n;
}

// ---------- links: everything that names something leads to it ----------
const goDev = (k, label) => `<a class="go" href="#" data-go="dev" data-k="${esc(k)}" title="Todos los pueblos con este patrón">${esc(label ?? D.devotions[k].n)}</a>`;
const goTown = (ine, label) => `<a class="go" href="#" data-go="town" data-ine="${ine}">${esc(label ?? D.towns[ine].n)}</a>`;
const goDay = (m, label) => `<a class="go" href="#" data-go="day" data-day="${m}" title="Qué pueblos celebran a su patrón este día">${esc(label ?? md(m))}</a>`;
const goArea = (k, v) => `<a class="go" href="#" data-go="area" data-a="${k}" data-v="${esc(v)}" title="Resaltar sus pueblos">${esc(v)}</a>`;
const goGroup = g => `<a class="badge b-${g}" href="#" data-go="group" data-g="${g}" title="Ver este grupo">${esc(GROUP[g].n)}</a>`;
const goMap = (lat, lon) => `<a class="go pin" href="#" data-go="map" data-lat="${lat}" data-lon="${lon}" title="Verlo en el mapa">📍 en el mapa</a>`;

function follow(a) {
  const go = a.dataset.go;
  hideTip();
  if (go === "dev") selectDev(a.dataset.k, true);
  else if (go === "town") { selectTown(a.dataset.ine, true); zoomTo(a.dataset.ine); }
  else if (go === "day") { state.view = "cal"; state.day = a.dataset.day; state.town = null; state.dev = null; writeHash(true); renderAll(); }
  else if (go === "area") { state.area = {k: a.dataset.a, v: a.dataset.v}; state.town = null; state.dev = null; writeHash(true); renderAll(); zoomArea(); }
  else if (go === "group") { state.view = "group"; state.g = a.dataset.g; state.town = null; state.dev = null; writeHash(true); renderAll(); }
  else if (go === "map") {
    state.town = null; state.churches = true; writeHash(true); renderAll();
    map.setView([+a.dataset.lat, +a.dataset.lon], 16);
  }
  else if (go === "country") switchCountry(a.dataset.c);
}

// ---------- controls ----------
function initControls() {
  // one delegated handler: every [data-go] anywhere (card, panel, legend) follows its link
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-go]");
    if (a) { e.preventDefault(); follow(a); }
  });
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    state.view = b.dataset.view; state.dev = null; state.nodata = false; writeHash(false); renderAll();
  }));
  document.querySelectorAll(".country .cty").forEach(b => b.addEventListener("click", e => { e.preventDefault(); switchCountry(b.dataset.c); }));
  $("#explain").addEventListener("click", e => { if (!e.target.closest("button,a")) $("#explain").classList.toggle("open"); });
  $("#churches-btn").addEventListener("click", () => {
    state.churches = !state.churches; writeHash(false); renderAll();
    if (state.churches && map.getZoom() < 11) $("#explain").innerHTML += " <b>Acércate más para ver las iglesias.</b>";
  });
  $("#nodata").addEventListener("click", () => { state.nodata = !state.nodata; state.dev = null; writeHash(false); renderAll(); });
  document.querySelector(".brand").addEventListener("click", e => {
    e.preventDefault(); history.replaceState(null, "", location.pathname + (state.country !== "es" ? "#c=" + state.country : "")); location.reload();
  });
  // the card: ✕, Escape, a click on the dimmed map outside it (Atlas of Painting)
  $("#card-close").addEventListener("click", closeTown);
  $("#card").addEventListener("click", e => { if (e.target.id === "card") closeTown(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && state.town) closeTown(); });
  // town search
  const q = $("#town-q"), hits = $("#town-hits");
  let sel = 0, found = [];
  const draw = () => {
    hits.innerHTML = found.map(([ine, , t], i) => `<button type="button" data-ine="${ine}" class="${i === sel ? "on" : ""}">${esc(t.n)} <small>${esc(t.p)}</small></button>`).join("");
    hits.hidden = !found.length;
  };
  q.addEventListener("input", () => {
    const s = fold(q.value.trim());
    if (s.length < 2) { found = []; draw(); return; }
    found = townIndex.filter(x => x[1].startsWith(s)).concat(townIndex.filter(x => !x[1].startsWith(s) && x[1].includes(s))).slice(0, 14);
    sel = 0; draw();
  });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, found.length - 1); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); draw(); e.preventDefault(); }
    else if (e.key === "Enter" && found[sel]) { pick(found[sel][0]); }
    else if (e.key === "Escape") { found = []; draw(); }
  });
  hits.addEventListener("click", e => { const b = e.target.closest("button"); if (b) pick(b.dataset.ine); });
  const pick = ine => { found = []; draw(); q.value = ""; q.blur(); selectTown(ine, true); zoomTo(ine); };
  document.addEventListener("click", e => { if (!e.target.closest(".search-wrap")) { found = []; draw(); } });
  // resizable panel, remembered (LLM.md §2c)
  try { const w = localStorage.getItem("patronos.panel"); if (w) document.documentElement.style.setProperty("--panel-w", w); } catch (e) {}
  const drag = $("#drag");
  drag.addEventListener("pointerdown", e => {
    drag.setPointerCapture(e.pointerId);
    const move = ev => document.documentElement.style.setProperty("--panel-w", Math.max(280, Math.min(innerWidth * 0.7, innerWidth - ev.clientX)) + "px");
    const up = () => {
      drag.removeEventListener("pointermove", move); drag.removeEventListener("pointerup", up);
      map.invalidateSize();
      try { localStorage.setItem("patronos.panel", getComputedStyle(document.documentElement).getPropertyValue("--panel-w").trim()); } catch (e) {}
    };
    drag.addEventListener("pointermove", move); drag.addEventListener("pointerup", up);
  });
}

async function switchCountry(c) {
  if (c === state.country) return;
  Object.assign(state, {country: c, town: null, dev: null, area: null, nodata: false, q: "", g: "", list: 40});
  if (c !== "es") state.churches = false;
  await loadCountry(c, true);
  writeHash(true);
  renderAll();
}
// Opening a card pushes a history step; closing it steps back when we pushed it (so Back and ✕ agree, as in Batalla
// de Flores), and only replaces the URL when the card came from a shared link.
let cardPushed = false;
function selectTown(ine, push) { cardPushed = !!push; state.town = ine; writeHash(push); renderAll(); }
function closeTown() {
  if (cardPushed) { cardPushed = false; history.back(); return; }
  state.town = null; writeHash(false); renderAll();
}
function selectDev(k, push) { state.dev = k; state.nodata = false; state.town = null; writeHash(push); renderAll(); }

// ---------- render ----------
function renderAll() {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  $("#nodata").setAttribute("aria-pressed", state.nodata ? "true" : "false");
  $("#churches-btn").setAttribute("aria-pressed", state.churches ? "true" : "false");
  drawChurches();
  restyle();
  renderExplain();
  if (state.dev) renderDev(state.dev);
  else if (state.area) renderArea();
  else if (state.view === "cal") renderCal();
  else renderList();
  renderCard();
}

function sw(c) { return `<span class="sw" style="background:${c}"></span>`; }
function renderExplain() {
  const m = D.meta, no = m.towns - m.with_data, pct = Math.round(100 * no / m.towns);
  let h;
  if (state.dev) {
    const d = D.devotions[state.dev];
    h = `${sw(devColor(state.dev))}Resaltados: los <b>${fmt(d.c)}</b> pueblos que tienen a <b>${esc(d.n)}</b> entre sus patrones, en cualquier puesto. ${sw(FADE)}otros pueblos con dato ${sw(NODATA)}sin dato. <a class="go" href="#" data-go="clear">quitar</a>`;
  } else if (state.nodata) {
    h = `${sw("#8d7f70")}Los <b>${fmt(no)}</b> pueblos (${pct} %) de los que ninguna fuente dice el patrón. No quiere decir que no lo tengan: falta el dato.`;
  } else if (state.view === "cal") {
    const n = Object.values(D.towns).filter(t => inArea(t) && (t.e || []).some(e => onDay(e, state.day))).length;
    h = `<button type="button" class="chip" id="d-prev" aria-label="Día anterior">◀</button> <b>${md(state.day)}</b> <button type="button" class="chip" id="d-next" aria-label="Día siguiente">▶</button>` +
      `${state.day !== TODAY ? ` <button type="button" class="chip" id="d-today">hoy</button>` : ""} · <b>${plural(n, "pueblo celebra", "pueblos celebran")}</b> a un patrón este día. ` +
      `La fecha es la de la ficha del pueblo o, si no la da, la del santo o la advocación en Wikidata; la fiesta a menudo se pasa al fin de semana. ${sw(FADE)}con fecha otro día ${sw(NODATA)}sin fecha conocida.`;
  } else if (state.view === "group") {
    h = "Color del primer patrón que se nombra: " + Object.entries(GROUP).map(([g, x]) => `${sw(x.c)}<a class="go" href="#" data-go="group" data-g="${g}">${x.n}</a>`).join(" ") + ` ${sw(NODATA)}sin dato (${fmt(no)}, ${pct} %). Las advocaciones de la Virgen cuentan como María, y las imágenes de Cristo como Cristo; la advocación está en la ficha.`;
  } else if (state.view === "agree") {
    h = "¿Dicen lo mismo las fuentes? " + Object.entries(AGREE).filter(([k]) => m.agreement[k]).map(([k, a]) => `${sw(a.c)}${a.n} (${fmt(m.agreement[k])})`).join(" ") + ` ${sw(NODATA)}sin dato. Ojo: buena parte de Wikidata se copió de la Wikipedia en italiano, así que coincidir no es confirmarse.`;
  } else {
    h = `Color: el primer patrón que nombra la ficha del pueblo en Wikipedia (Wikidata si no hay ficha). Los ${topKeys.length} más frecuentes llevan color propio ${sw(OTHER)}el resto ${sw(NODATA)}sin dato (${fmt(no)} pueblos, ${pct} %). ${m.text_only || m.fiesta_only ? `Más pálidos: ${m.text_only ? `${fmt(m.text_only)} pueblos cuyo patrón solo se ha leído del texto del artículo` : ""}${m.text_only && m.fiesta_only ? " y " : ""}${m.fiesta_only ? `${fmt(m.fiesta_only)} cuya única pista es una fiesta local con nombre de santo` : ""} (a lápiz). ` : ""}Pulsa un pueblo para abrir su ficha.`;
  }
  if (state.area) h = `<b>${esc(state.area.v)}</b> resaltada. <a class="go" href="#" data-go="clear-area">quitar</a> · ` + h;
  $("#explain").innerHTML = h;
  const go = n => e => { e.stopPropagation(); state.day = n === 0 ? TODAY : shiftDay(state.day, n); writeHash(false); renderAll(); };
  if ($("#d-prev")) { $("#d-prev").onclick = go(-1); $("#d-next").onclick = go(1); }
  if ($("#d-today")) $("#d-today").onclick = go(0);
  const clr = $("#explain [data-go=clear]"); if (clr) clr.onclick = e => { e.preventDefault(); e.stopPropagation(); state.dev = null; writeHash(true); renderAll(); };
  const clra = $("#explain [data-go=clear-area]"); if (clra) clra.onclick = e => { e.preventDefault(); e.stopPropagation(); state.area = null; writeHash(true); renderAll(); };
}

function back(label) { return `<button class="back" type="button">← ${esc(label)}</button>`; }
function bindBack(fn) { const b = $("#panel .back"); if (b) b.addEventListener("click", fn); }

function renderCal() {
  const by = {};
  for (const [ine, t] of Object.entries(D.towns)) if (inArea(t)) for (const e of t.e || []) {
    if (onDay(e, state.day) && !(by[e.k] || []).some(x => x[0] === ine)) (by[e.k] = by[e.k] || []).push([ine, t, e, dayOf(e)]);
  }
  const keys = Object.keys(by).sort((a, b) => by[b].length - by[a].length);
  $("#panel").innerHTML = `<div class="p-h"><h2>${md(state.day)}</h2><span class="muted small">${keys.length ? plural(keys.length, "patrón", "patrones") : "ningún patrón con esta fecha"}</span></div>` +
    keys.map(k => `<div class="calgroup"><div><b>${goDev(k)}</b> <span class="muted small">${plural(by[k].length, "pueblo", "pueblos")}</span></div>` +
      `<ul class="towns">${by[k].sort((a, b) => a[1].n.localeCompare(b[1].n, "es")).map(([ine, t, e]) => `<li>${goTown(ine)}${e.t && e.t !== D.devotions[k].n && D.devotions[k].g !== "santo" ? ` <span class="muted">(${esc(e.t)})</span>` : ""}</li>`).join("")}</ul></div>`).join("") + foot();
}

function renderList() {
  const all = Object.entries(D.devotions).filter(([, d]) => d.c).sort((a, b) => b[1].c - a[1].c || a[1].n.localeCompare(b[1].n, "es"));
  const q = fold(state.q || "");
  const byG = state.g ? all.filter(([, d]) => d.g === state.g) : all;
  const rows = q ? byG.filter(([, d]) => fold(d.n).includes(q) || fold(d.le || "").includes(q)) : byG;
  const gc = g => all.filter(([, d]) => d.g === g).length;
  const shown = rows.slice(0, q ? 200 : state.list);
  const regions = [...new Set(Object.values(D.towns).map(t => t.c))].sort((a, b) => a.localeCompare(b, "es"));
  $("#panel").innerHTML = `
    <div class="p-h"><h2>Patrones</h2><span class="muted small">${fmt(all.length)} distintos · pueblos que los tienen</span></div>
    <input id="dev-q" type="search" placeholder="Buscar santo, Virgen, Cristo…" value="${esc(state.q)}" aria-label="Buscar patrón">
    <div class="gchips">${[["", "todos", all.length], ["santo", "santos", gc("santo")], ["maria", "María", gc("maria")], ["cristo", "Cristo", gc("cristo")], ["sin_identificar", "sin identificar", gc("sin_identificar")]]
      .map(([g, n, c]) => `<button type="button" class="chip" data-g="${g}" aria-pressed="${state.g === g}">${n} <span class="muted">${fmt(c)}</span></button>`).join("")}</div>
    ${state.g === "maria" || state.g === "cristo" ? `<p class="small muted">María y Cristo son una sola entrada cada uno; sus advocaciones están dentro (púlsala).</p>` : ""}
    <ul class="devlist">${shown.map(([k, d]) => `<li data-go="dev" data-k="${esc(k)}" class="${k === state.dev ? "sel" : ""}">${sw(colorOf[k] || OTHER)}<span class="nm">${esc(d.n)}${d.g === "sin_identificar" ? ' <span class="gtag">sin identificar</span>' : ""}</span><span class="ct">${fmt(d.c)}</span></li>`).join("")}</ul>
    ${!q && rows.length > shown.length ? `<button class="more" type="button">ver ${fmt(Math.min(rows.length - shown.length, 200))} más</button>` : ""}
    ${q && !rows.length ? `<p class="muted small">Ningún patrón con ese nombre.</p>` : ""}
    <div class="small muted" style="margin-top:12px">Por regiones: ${regions.map(r => goArea("c", r)).join(" · ")}</div>
    ${foot()}`;
  const inp = $("#dev-q");
  inp.addEventListener("input", () => { state.q = inp.value; const pos = inp.selectionStart; renderList(); const i2 = $("#dev-q"); i2.focus(); i2.setSelectionRange(pos, pos); });
  const more = $("#panel .more"); if (more) more.addEventListener("click", () => { state.list += 200; renderList(); });
  $("#panel").querySelectorAll(".gchips .chip").forEach(b => b.addEventListener("click", () => { state.g = b.dataset.g; renderList(); }));
}

// A province or region: its towns, their first patron, and what is most common there.
function renderArea() {
  const {k, v} = state.area;
  const towns = Object.entries(D.towns).filter(([, t]) => t[k] === v).sort((a, b) => a[1].n.localeCompare(b[1].n, "es"));
  const withData = towns.filter(([, t]) => t.e && t.e.length);
  const cnt = {};
  for (const [, t] of withData) for (const kk of new Set(t.e.map(e => e.k))) cnt[kk] = (cnt[kk] || 0) + 1;
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const sub = k === "c" ? [...new Set(towns.map(([, t]) => t.p))].sort((a, b) => a.localeCompare(b, "es")) : [];
  const region = k === "p" && towns[0] ? towns[0][1].c : "";
  $("#panel").innerHTML = `<div class="p-h"><span class="muted small">${k === "p" ? "Provincia" : "Región"}</span>${back("todos los patrones")}</div>
    <div class="town"><h2>${esc(v)}</h2>${region ? `<div class="where">${goArea("c", region)}</div>` : ""}
    <p><b>${fmt(withData.length)}</b> de ${fmt(towns.length)} pueblos con dato.</p>
    ${sub.length > 1 ? `<p class="small">Provincias: ${sub.map(p => goArea("p", p)).join(" · ")}</p>` : ""}
    <p class="small muted">Los patrones más repetidos aquí:</p><ul class="towns">${top.map(([kk, n]) => `<li>${goDev(kk)} <span class="muted">${n}</span></li>`).join("")}</ul>
    <p class="small muted">Sus pueblos y su primer patrón:</p>
    <ul class="arealist">${towns.map(([ine, t]) => `<li>${goTown(ine)}${t.e && t.e.length ? ` <span class="muted">·</span> ${goDev(t.e[0].k, devName(t.e[0]))}` : ' <span class="muted">· sin dato</span>'}</li>`).join("")}</ul></div>${foot()}`;
  bindBack(() => { state.area = null; writeHash(true); renderAll(); });
}

function roleText(e) { return e.r || "patrón o patrona"; }
function srcHtml(s) {
  const [src, url, quote, how, extra] = s;
  const ex = (extra || "").replace(/importado de ([a-z]+wiki(?:, [a-z]+wiki)*)/, (m, w) => "importado de " + w.split(", ").map(x => WIKI[x] || x).join(" y "));
  return `<div class="src"><span class="sname">${SRC_NAME[src] || src}</span> · <a href="${esc(url)}" target="_blank" rel="noopener">ver la fuente ↗</a>${ex ? ` · <span class="muted">${esc(ex)}</span>` : ""}
    <div><code>${esc(quote)}</code></div>${how ? `<div class="how">${esc(how)}</div>` : ""}</div>`;
}

// ---------- the town card (opens over the map, closes with ✕, Escape, a click outside or Back) ----------
function renderCard() {
  const box = $("#card");
  if (!state.town) { box.hidden = true; document.body.classList.remove("card-open"); return; }
  const ine = state.town, t = D.towns[ine];
  let h = `<h2 class="c-title">${esc(t.n)}</h2>${t.n2 ? `<div class="muted small">${esc(t.n2)}</div>` : ""}
    <div class="where">${goArea("p", t.p)} · ${goArea("c", t.c)} · <span class="muted">${C().code} ${ine}</span></div>`;
  if (!t.e || !t.e.length) {
    const parishes = ["Galicia", "Principado de Asturias", "Asturias", "Cantabria"].includes(t.c);
    h += `<div class="nodata">Todavía no hay dato. Ninguna fuente dice su patrón. No quiere decir que no lo tenga: es lo que falta por completar.` +
      (parishes ? ` En ${esc(t.c)} un municipio suele reunir varias parroquias o pueblos, y cada uno tiene su patrón, así que a menudo no hay un patrón del municipio entero.` : "") + `</div>`;
  } else {
    if (t.xf) h += `<div class="warn">Ninguna fuente dice el patrón de este pueblo. Lo que sigue son sus fiestas locales oficiales con nombre de santo: una pista indirecta, que puede ser el patrón del pueblo o el de una de sus pedanías. A lápiz.</div>`;
    else if (t.x) h += `<div class="warn">La ficha de este pueblo en Wikipedia no dice su patrón: se ha leído de una frase del artículo (debajo, la frase). Es una propuesta a lápiz, pendiente de confirmar.</div>`;
    if (t.a === "disagree") h += `<div class="warn">Wikipedia y Wikidata no nombran a ningún patrón en común. Se enseñan las dos versiones.</div>`;
    if (t.a === "partial") h += `<div class="warn">Wikidata nombra además a alguien que la ficha de Wikipedia no incluye (marcado «solo Wikidata»).</div>`;
    for (const e of t.e) {
      const d = D.devotions[e.k];
      const advText = e.t && e.t === e.t.toUpperCase() ? niceName(e.t) : e.t;
      const adv = e.t && e.t !== d.n && d.g !== "santo" ? `<div class="adv">como <b>${esc(advText)}</b></div>` : "";
      const dd = dayOf(e);
      const days = dd ? (dd.all || [dd.md]).map(x => goDay(x)).join(", ") : "";
      const fromFiesta = e.s && e.s[0] && e.s[0][0] === "fiesta_local";
      const flMatch = !fromFiesta && dd && t.fl && t.fl.some(f => (dd.all || [dd.md]).includes(f[0]));
      h += `<div class="entry">
        <div class="role">${esc(roleText(e))}${e.wo ? '<span class="badge b-wo">solo Wikidata</span>' : ""}</div>
        <div class="who">${goDev(e.k)} ${goGroup(d.g)}</div>
        ${adv}${dd ? `<div class="day">${days} · ${esc(dd.how)}${flMatch ? ` · <span class="ok">✓ es fiesta local oficial del municipio</span>` : ""}</div>` : ""}
        <div class="srcs">${e.s.map(srcHtml).join("")}</div></div>`;
    }
  }
  if (t.fl) {
    const who = {cat: "Generalitat de Catalunya", cyl: "Junta de Castilla y León", ara: "Gobierno de Aragón", mad: "Comunidad de Madrid", eus: "Gobierno Vasco"}[t.fl[0][3]];
    const named = t.fl.some(f => f[1]);
    h += `<div class="fl"><b>Fiestas locales oficiales ${t.fl[0][2]}</b> <span class="muted small">(${who})</span><ul>` +
      t.fl.map(f => `<li>${goDay(f[0])}${f[1] ? ` · ${esc(niceName(f[1]))}` : ""}</li>`).join("") + `</ul>` +
      `<p class="small muted">${named ? "Una fiesta local no es necesariamente el patrón (San Isidro, por ejemplo, es fiesta local en cientos de pueblos que tienen otro patrón)." : "Son fechas: no dicen a quién se celebra."}</p></div>`;
  }
  if (D.meta.churches) h += `<div id="churches" class="churchbox"><p class="muted small">Cargando iglesias e imágenes…</p></div>`;
  h += `<div class="links">${t.w ? `<a href="https://${D.meta.wiki || "es"}.wikipedia.org/wiki/${encodeURIComponent(t.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia ↗</a>` : ""}${t.q ? `<a href="https://www.wikidata.org/wiki/${t.q}" target="_blank" rel="noopener">Wikidata ↗</a>` : ""}<a class="go" href="#" data-go="zoom" data-ine="${ine}">ver en el mapa</a></div>`;
  $("#card-body").innerHTML = h;
  $("#card-body").querySelector("[data-go=zoom]").onclick = e => { e.preventDefault(); e.stopPropagation(); const i = state.town; closeTown(); zoomTo(i); };
  box.hidden = false; document.body.classList.add("card-open");
  $("#card .c-card").scrollTop = 0;
  fillChurches(ine);
}

function renderDev(k) {
  const d = D.devotions[k];
  const towns = Object.entries(D.towns).filter(([, t]) => inArea(t) && t.e && t.e.some(e => e.k === k))
    .sort((a, b) => a[1].p.localeCompare(b[1].p, "es") || a[1].n.localeCompare(b[1].n, "es"));
  let h = `<div class="p-h"><span class="muted small">Patrón</span>${back("todos los patrones")}</div>
    <div class="town"><h2>${esc(d.n)} ${goGroup(d.g)}</h2>`;
  if (d.le && d.le !== d.n) h += `<div class="where">En Wikidata: ${esc(d.le)}</div>`;
  if (d.g === "santo" && d.f) h += `<div class="day small">Fiesta litúrgica según Wikidata: ${d.f.split(";").map(x => goDay(x)).join(", ")}</div>`;
  if (d.g === "sin_identificar") h += `<div class="warn">Texto que la fuente no enlaza a nadie, o que en otros pueblos enlaza a santos distintos (por ejemplo, «San Antonio» puede ser el Abad o el de Padua). Se enseña tal cual.</div>`;
  h += `<p><b>${fmt(towns.length)}</b> pueblos${state.area ? ` de ${esc(state.area.v)}` : ""} lo tienen entre sus patrones.${d.im ? ` Hay <b>${fmt(d.im)}</b> imágenes o estatuas que lo representan con lugar conocido.` : ""}${d.ch ? ` Wikidata conoce <b>${fmt(d.ch)}</b> iglesias dedicadas a ${d.g === "santo" ? "él o ella" : "esta devoción"}.` : ""}</p>`;
  if (d.g === "maria" || d.g === "cristo" || d.g === "dios") {
    const adv = {};
    for (const [, t] of towns) for (const e of t.e) if (e.k === k) { const a = e.t || d.n; adv[a] = (adv[a] || 0) + 1; }
    const list = Object.entries(adv).sort((a, b) => b[1] - a[1]);
    h += `<p class="small muted">${fmt(list.length)} advocaciones distintas. Las más nombradas:</p><ul class="towns">${list.slice(0, 30).map(([a, n]) => `<li>${esc(a)} <span class="muted">${n}</span></li>`).join("")}</ul>`;
  }
  const byProv = {};
  for (const [ine, t] of towns) (byProv[t.p] = byProv[t.p] || []).push([ine, t]);
  h += Object.entries(byProv).map(([p, l]) => `<div class="small"><b>${goArea("p", p)}</b> <span class="muted">${l.length}</span></div><ul class="towns">${l.map(([ine]) => `<li>${goTown(ine)}</li>`).join("")}</ul>`).join("");
  h += `<div class="links">${d.w ? `<a href="https://${D.meta.wiki || "es"}.wikipedia.org/wiki/${encodeURIComponent(d.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia ↗</a>` : ""}${d.i ? `<a href="https://www.wikidata.org/wiki/${d.i}" target="_blank" rel="noopener">Wikidata ↗</a>` : ""}</div></div>${foot()}`;
  $("#panel").innerHTML = h;
  bindBack(() => { state.dev = null; writeHash(true); renderAll(); });
  $("#panel").scrollTop = 0;
}

// ---------- churches and images (Spain): loaded on first use; OpenStreetMap in its own file (ODbL) ----------
function loadChurches() {
  if (!CH) CH = Promise.all([
    fetch(`${C().dir}iglesias.json?v=${BV}`).then(r => r.json()),
    fetch(`${C().dir}iglesias_osm.json?v=${BV}`).then(r => r.json()),
    fetch(`${C().dir}imagenes.json?v=${BV}`).then(r => r.ok ? r.json() : {towns: {}}).catch(() => ({towns: {}})),
  ]).then(([w, o, im]) => ({w, o, im}));
  return CH;
}
const KIND_ORDER = ["catedral", "basílica", "colegiata", "iglesia parroquial", "iglesia", "santuario", "monasterio", "convento", "ermita", "capilla", "humilladero"];
// Only a named saint makes a star: "María" or "Cristo" as a group would star a Pietà in a town whose patrona is the
// Virgen de San Lorenzo, and those are not the same devotion.
function patronKeys(ine) { return new Set((D.towns[ine].e || []).map(e => e.k).filter(k => /^Q\d+$/.test(k))); }
function dedName(k, names) { return D.devotions[k] ? D.devotions[k].n : names[k] || ""; }
const dedLink = (k, names) => D.devotions[k] ? goDev(k) : esc(dedName(k, names));
async function drawChurches() {
  if (!map || !D) return;
  if (!D.meta.churches || !state.churches || map.getZoom() < 11) { if (chLayer) { chLayer.remove(); chLayer = null; } return; }
  const {w, o, im} = await loadChurches();
  const b = map.getBounds().pad(0.2);
  if (chLayer) chLayer.remove();
  chLayer = L.layerGroup();
  const tipAt = (e, html) => { tip.innerHTML = html; tip.hidden = false; place(e.originalEvent); };
  for (const [src, data] of [["o", o], ["w", w]]) for (const [ine, list] of Object.entries(data.towns)) {
    const pk = patronKeys(ine);
    for (const c of list) {
      if (!b.contains([c[3], c[4]])) continue;
      const star = c[7].some(k => pk.has(k));
      const m = L.circleMarker([c[3], c[4]], {radius: src === "w" ? 5 : 3.5, weight: 1, color: "#fff",
        fillColor: star ? "#e0a526" : src === "w" ? "#2a1d2b" : "#8d7f70", fillOpacity: 0.95});
      m.on("mousemove", e => tipAt(e, `<b>${esc(c[0] || "(sin nombre en la fuente)")}</b> <span class="tp">${esc(c[1])}${c[2] ? " · " + esc(c[2]) : ""}</span>` +
        (c[7].length ? `<div class="tl">dedicada a ${c[7].map(k => esc(dedName(k, w.names))).join(", ")}${star ? " ★ patrón del pueblo" : ""}</div>` : "") +
        `<div class="tp">${esc(D.towns[ine].n)} · ${src === "w" ? "Wikidata" : "OpenStreetMap"}</div>`));
      m.on("mouseout", hideTip);
      m.on("click", () => { hideTip(); selectTown(ine, true); });
      chLayer.addLayer(m);
    }
  }
  for (const [ine, list] of Object.entries(im.towns)) {
    const pk = patronKeys(ine);
    for (const c of list) {
      if (!b.contains([c[2], c[3]])) continue;
      const star = c[1].some(k => pk.has(k));
      const m = L.circleMarker([c[2], c[3]], {radius: 5.5, weight: 2, color: star ? "#e0a526" : "#fff", fillColor: "#7a55a8", fillOpacity: 0.95});
      m.on("mousemove", e => tipAt(e, `<b>${esc(c[0] || "(sin nombre en la fuente)")}</b> <span class="tp">imagen o estatua</span>` +
        (c[1].length ? `<div class="tl">representa a ${c[1].map(k => esc(dedName(k, im.names || {}))).filter(Boolean).join(", ")}${star ? " ★ patrón del pueblo" : ""}</div>` : "") +
        `<div class="tp">${esc(D.towns[ine].n)}${c[5] ? " · " + esc(c[5]) : ""} · ${c[9] === "osm" ? "OpenStreetMap" : "Wikidata"}</div>`));
      m.on("mouseout", hideTip);
      m.on("click", () => { hideTip(); selectTown(ine, true); });
      chLayer.addLayer(m);
    }
  }
  chLayer.addTo(map);
}
async function fillChurches(ine) {
  const box = document.getElementById("churches");
  if (!box) return;
  const {w, o, im} = await loadChurches();
  if (state.town !== ine || !document.getElementById("churches")) return;
  const pk = patronKeys(ine);
  const byKind = (a, b) => (KIND_ORDER.indexOf(a[1]) + 99) % 99 - (KIND_ORDER.indexOf(b[1]) + 99) % 99 || a[0].localeCompare(b[0], "es");
  const W = (w.towns[ine] || []).slice().sort(byKind), O = (o.towns[ine] || []).slice().sort(byKind);
  const row = (c, src) => {
    const star = c[7].some(k => pk.has(k));
    const link = src === "w" ? `https://www.wikidata.org/wiki/${c[5]}` : `https://www.openstreetmap.org/${c[6]}`;
    const ded = c[7].length ? ` · dedicada a ${c[7].map(k => dedLink(k, w.names)).join(", ")}` : "";
    return `<li${star ? ' class="star"' : ""}>${star ? "★ " : ""}<a href="${link}" target="_blank" rel="noopener">${esc(c[0] || "(sin nombre en la fuente)")}</a> <span class="muted">${esc(c[1])}${c[2] ? " · " + esc(c[2]) : ""}${c[8] ? " · patrimonio" : ""}</span>${ded} ${goMap(c[3], c[4])}</li>`;
  };
  const nstar = W.concat(O).filter(c => c[7].some(k => pk.has(k))).length;
  const I = im.towns[ine] || [];
  const irow = c => {
    const star = c[1].some(k => pk.has(k));
    const link = c[9] === "osm" ? `https://www.openstreetmap.org/${c[4]}` : c[4] ? `https://www.wikidata.org/wiki/${c[4]}` : "";
    const dep = c[1].map(k => dedLink(k, im.names || {})).filter(Boolean).join(", ");
    const thumb = c[8] ? `<a class="thumb" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(c[8])}" target="_blank" rel="noopener" title="Wikimedia Commons: autor y licencia"><img loading="lazy" alt="" src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(c[8])}?width=120"></a>` : "";
    const name = esc(c[0] || "(sin nombre en la fuente)");
    return `<li class="img${star ? " star" : ""}">${thumb}<div>${star ? "★ " : ""}${link ? `<a href="${link}" target="_blank" rel="noopener">${name}</a>` : `<b>${name}</b>`}` +
      `${dep ? ` · representa a ${dep}` : ""}${c[5] ? ` <span class="muted">· en ${esc(c[5])}</span>` : ""}${c[6] || c[7] ? ` <span class="muted">· ${esc([c[6], c[7]].filter(Boolean).join(", "))}</span>` : ""}` +
      `${c[9] === "osm" ? ' <span class="muted">(OpenStreetMap)</span>' : ""}` +
      `${String(c[9]).startsWith("contribution") ? ` <span class="badge b-wo">aportación${c[9].split(":")[1] === "proposed" ? ", a lápiz" : ""}${c[9].split(":")[2] ? " de " + esc(c[9].split(":")[2]) : ""}</span>` : ""} ${goMap(c[2], c[3])}</div></li>`;
  };
  const imgs = I.length ? `<h3>Imágenes y estatuas <span class="muted small">${I.length}</span></h3><ul class="churches">${I.map(irow).join("")}</ul>` +
    `<p class="muted small">Las fotos son de Wikimedia Commons; pulsa una para ver su autor y su licencia.</p>` : "";
  box.innerHTML = imgs + `<h3>Iglesias <span class="muted small">${W.length + O.length}</span></h3>` +
    (W.length + O.length === 0 ? `<p class="muted small">Ni Wikidata ni OpenStreetMap tienen iglesias dentro del término municipal.</p>` : "") +
    (nstar ? `<p class="small">★ dedicada a un santo patrón del pueblo (según la dedicatoria de Wikidata; con María o Cristo no se marca, porque la advocación puede ser otra).</p>` : "") +
    (W.length ? `<div class="small muted">Wikidata</div><ul class="churches">${W.map(c => row(c, "w")).join("")}</ul>` : "") +
    (O.length ? `<details${W.length ? "" : " open"}><summary class="small muted">OpenStreetMap: ${O.length} más</summary><ul class="churches">${O.map(c => row(c, "o")).join("")}</ul></details>` : "") +
    `<p class="muted small">La dedicatoria solo se da cuando Wikidata la dice; el nombre de la iglesia no se usa para deducirla.</p>`;
}

function foot() {
  return `<div class="foot">Fuentes: ${Object.values(D.sources).map(s => `<a href="${s.u}" target="_blank" rel="noopener">${esc(s.n)}</a> (${esc(s.l)}): ${esc(s.d)}`).join(" · ")}
    ${D.meta.churches ? `Iglesias: <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> (CC0) y © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores de OpenStreetMap</a> (ODbL). ` : ""}Contornos: GISCO © EuroGeographics. Códigos: ${C().code}.</div>`;
}
