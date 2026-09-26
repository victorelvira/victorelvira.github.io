"use strict";
const DATA_V = "0.8.0";
const BUILD_AT = "2026-09-26 16:35";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const fmt = n => n.toLocaleString("es-ES");
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const md = s => { const m = /^(\d\d)-(\d\d)$/.exec(s || ""); return m ? `${+m[2]} de ${MONTHS[+m[1] - 1]}` : ""; };
const fold = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const GROUP = {
  maria: {n: "Virgen María", c: "#3f6fae"}, cristo: {n: "Cristo", c: "#a8323e"}, santo: {n: "santo o santa", c: "#c9962f"},
  dios: {n: "Dios (Trinidad)", c: "#6b4c9a"}, sin_identificar: {n: "sin identificar", c: "#9a9187"},
};
const AGREE = {
  agree: {n: "coinciden", c: "#3f8f5a", d: "todo lo que dice Wikidata lo dice también Wikipedia"},
  partial: {n: "Wikidata añade", c: "#e0a526", d: "Wikidata nombra además a alguien que la ficha no incluye"},
  disagree: {n: "no coinciden", c: "#c0392b", d: "no nombran a ningún patrón en común"},
  only_eswiki: {n: "solo Wikipedia", c: "#6d8fc4", d: ""},
  only_wikidata: {n: "solo Wikidata", c: "#9b86c2", d: ""},
  only_text: {n: "solo el texto del artículo", c: "#8fb3a8", d: ""},
};
const NODATA = "#ece7df", OTHER = "#cfc5b6", FADE = "#e9e4dc";
const PALETTE = ["#e0a526", "#2f8f6b", "#d0672f", "#7a55a8", "#3aa0b8", "#b35c8a", "#6a8f2f", "#8a5a2b",
  "#d24b6b", "#c47ac0", "#a8b83a", "#1f6f7a"];
const WIKI = {itwiki: "la Wikipedia en italiano", eswiki: "la Wikipedia en español", cawiki: "la Wikipedia en catalán", enwiki: "la Wikipedia en inglés"};

let D, map, geoLayer, layers = {}, colorOf = {}, topKeys = [], firstCount = {}, BV = "", CH = null, chLayer = null;
const TODAY = (() => { const d = new Date(); return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
const state = {view: "main", town: null, dev: null, nodata: false, list: 40, q: "", churches: false, day: TODAY, g: ""};

// ---------- URL state (LLM.md §2c: every screen is a link) ----------
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  state.view = ["main", "group", "agree", "cal"].includes(p.get("v")) ? p.get("v") : "main";
  state.day = /^\d\d-\d\d$/.test(p.get("dia") || "") ? p.get("dia") : TODAY;
  state.town = p.get("t") && D.towns[p.get("t")] ? p.get("t") : null;
  state.dev = p.get("d") && D.devotions[p.get("d")] ? p.get("d") : null;
  state.nodata = p.get("nd") === "1";
  state.churches = p.get("ig") === "1";
}
function writeHash(push) {
  const p = new URLSearchParams();
  if (state.view !== "main") p.set("v", state.view);
  if (state.town) p.set("t", state.town);
  if (state.dev) p.set("d", state.dev);
  if (state.nodata) p.set("nd", "1");
  if (state.churches) p.set("ig", "1");
  if (state.view === "cal" && state.day !== TODAY) p.set("dia", state.day);
  const h = p.toString() ? "#" + p.toString() : location.pathname;
  if (("#" + p.toString()) === location.hash) return;
  (push ? history.pushState : history.replaceState).call(history, null, "", h);
}
window.addEventListener("popstate", () => { readHash(); renderAll(); });

// ---------- load ----------
(async function init() {
  const b = await fetch("patronos/data/build.json", {cache: "no-store"}).then(r => r.json()).catch(() => ({v: DATA_V}));
  const [data, geo] = await Promise.all([
    fetch(`patronos/data/patronos.json?v=${b.v}`).then(r => r.json()),
    fetch(`patronos/data/municipalities.geojson?v=${b.v}`).then(r => r.json()),
  ]);
  D = data; BV = b.v;
  prepare();
  readHash();
  initMap(geo);
  initControls();
  renderAll();
  if (state.town) zoomTo(state.town);
})();

function first(t) { return t.e && t.e.length ? t.e[0] : null; }

function prepare() {
  for (const [ine, t] of Object.entries(D.towns)) {
    const f = first(t);
    if (f) firstCount[f.k] = (firstCount[f.k] || 0) + 1;
  }
  topKeys = Object.keys(firstCount).filter(k => !k.startsWith("txt:")).sort((a, b) => firstCount[b] - firstCount[a]).slice(0, 14);
  let i = 0;
  for (const k of topKeys) colorOf[k] = k === "maria" ? GROUP.maria.c : k === "cristo" ? GROUP.cristo.c : PALETTE[i++ % PALETTE.length];
  const m = D.meta, pct = Math.round(100 * m.with_data / m.towns);
  $("#stats").innerHTML = `<b>${fmt(m.with_data)}</b> de ${fmt(m.towns)} pueblos con dato (${pct} %) · <b>${fmt(Object.values(D.devotions).filter(d => d.c).length)}</b> patrones distintos`;
}

// ---------- map ----------
function initMap(geo) {
  map = L.map("map", {preferCanvas: true, minZoom: 4, maxZoom: 17, zoomSnap: 0.25}).setView([40.2, -3.7], 6);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · contornos © EuroGeographics (GISCO)',
    opacity: 0.45, maxZoom: 17,
  }).addTo(map);
  geoLayer = L.geoJSON(geo, {
    style: f => styleOf(f.properties.id.slice(4)),
    onEachFeature: (f, layer) => {
      const ine = f.properties.id.slice(4);
      layers[ine] = layer;
      layer.on("mousemove", e => showTip(ine, e.originalEvent));
      layer.on("mouseout", hideTip);
      layer.on("click", () => { hideTip(); selectTown(ine, true); });
    },
  }).addTo(map);
  map.on("zoomend", restyle);
  map.on("moveend", drawChurches);
  map.on("movestart zoomstart", hideTip);
}

// ---------- churches: loaded on first use (two files: Wikidata, and OpenStreetMap under ODbL) ----------
function loadChurches() {
  if (!CH) CH = Promise.all([
    fetch(`patronos/data/iglesias.json?v=${BV}`).then(r => r.json()),
    fetch(`patronos/data/iglesias_osm.json?v=${BV}`).then(r => r.json()),
    fetch(`patronos/data/imagenes.json?v=${BV}`).then(r => r.ok ? r.json() : {towns: {}}).catch(() => ({towns: {}})),
  ]).then(([w, o, im]) => ({w, o, im}));
  return CH;
}
const KIND_ORDER = ["catedral", "basílica", "colegiata", "iglesia parroquial", "iglesia", "santuario", "monasterio", "convento", "ermita", "capilla", "humilladero"];
// Only a named saint makes a star: "María" or "Cristo" as a group would star a Pietà in a town whose patrona is the
// Virgen de San Lorenzo, and those are not the same devotion.
function patronKeys(ine) { return new Set((D.towns[ine].e || []).map(e => e.k).filter(k => /^Q\d+$/.test(k))); }
function dedName(k, names) {
  if (D.devotions[k]) return D.devotions[k].n;
  return names[k] || "";
}
async function drawChurches() {
  if (!map) return;
  if (!state.churches || map.getZoom() < 11) { if (chLayer) { chLayer.remove(); chLayer = null; } return; }
  const {w, o, im} = await loadChurches();
  const b = map.getBounds().pad(0.2);
  if (chLayer) chLayer.remove();
  chLayer = L.layerGroup();
  for (const [src, data] of [["o", o], ["w", w]]) for (const [ine, list] of Object.entries(data.towns)) {
    const pk = patronKeys(ine);
    for (const c of list) {
      if (!b.contains([c[3], c[4]])) continue;
      const star = c[7].some(k => pk.has(k));
      const m = L.circleMarker([c[3], c[4]], {radius: src === "w" ? 5 : 3.5, weight: 1, color: "#fff",
        fillColor: star ? "#e0a526" : src === "w" ? "#2a1d2b" : "#8d7f70", fillOpacity: 0.95});
      m.on("mousemove", e => { tip.innerHTML = `<b>${esc(c[0] || "(sin nombre en la fuente)")}</b> <span class="tp">${esc(c[1])}${c[2] ? " · " + esc(c[2]) : ""}</span>` +
        (c[7].length ? `<div class="tl">dedicada a ${c[7].map(k => esc(dedName(k, w.names))).join(", ")}${star ? " ★ patrón del pueblo" : ""}</div>` : "") +
        `<div class="tp">${esc(D.towns[ine].n)} · ${src === "w" ? "Wikidata" : "OpenStreetMap"}</div>`; tip.hidden = false;
        tip.style.left = Math.min(e.originalEvent.clientX + 14, innerWidth - 290) + "px"; tip.style.top = Math.min(e.originalEvent.clientY + 14, innerHeight - 90) + "px"; });
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
      m.on("mousemove", e => { tip.innerHTML = `<b>${esc(c[0] || "(sin nombre en la fuente)")}</b> <span class="tp">imagen o estatua</span>` +
        (c[1].length ? `<div class="tl">representa a ${c[1].map(k => esc(dedName(k, im.names || {}))).filter(Boolean).join(", ")}${star ? " ★ patrón del pueblo" : ""}</div>` : "") +
        `<div class="tp">${esc(D.towns[ine].n)}${c[5] ? " · " + esc(c[5]) : ""} · ${c[9] === "osm" ? "OpenStreetMap" : "Wikidata"}</div>`; tip.hidden = false;
        tip.style.left = Math.min(e.originalEvent.clientX + 14, innerWidth - 290) + "px"; tip.style.top = Math.min(e.originalEvent.clientY + 14, innerHeight - 90) + "px"; });
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
  if (state.town !== ine) return;
  const pk = patronKeys(ine);
  const byKind = (a, b) => (KIND_ORDER.indexOf(a[1]) + 99) % 99 - (KIND_ORDER.indexOf(b[1]) + 99) % 99 || a[0].localeCompare(b[0], "es");
  const W = (w.towns[ine] || []).slice().sort(byKind), O = (o.towns[ine] || []).slice().sort(byKind);
  const row = (c, src) => {
    const star = c[7].some(k => pk.has(k));
    const link = src === "w" ? `https://www.wikidata.org/wiki/${c[5]}` : `https://www.openstreetmap.org/${c[6]}`;
    const ded = c[7].length ? ` · dedicada a ${c[7].map(k => D.devotions[k] ? `<button type="button" class="lk" data-k="${esc(k)}">${esc(D.devotions[k].n)}</button>` : esc(dedName(k, w.names))).join(", ")}` : "";
    return `<li${star ? ' class="star"' : ""}>${star ? "★ " : ""}<a href="${link}" target="_blank" rel="noopener">${esc(c[0] || "(sin nombre en la fuente)")}</a> <span class="muted">${esc(c[1])}${c[2] ? " · " + esc(c[2]) : ""}${c[8] ? " · patrimonio" : ""}</span>${ded}</li>`;
  };
  const nstar = W.concat(O).filter(c => c[7].some(k => pk.has(k))).length;
  const I = im.towns[ine] || [];
  const irow = c => {
    const star = c[1].some(k => pk.has(k));
    const link = c[9] === "osm" ? `https://www.openstreetmap.org/${c[4]}` : c[4] ? `https://www.wikidata.org/wiki/${c[4]}` : "#";
    const dep = c[1].map(k => D.devotions[k] ? `<button type="button" class="lk" data-k="${esc(k)}">${esc(D.devotions[k].n)}</button>` : esc(dedName(k, im.names || {}))).filter(Boolean).join(", ");
    const thumb = c[8] ? `<a class="thumb" href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(c[8])}" target="_blank" rel="noopener" title="Wikimedia Commons: autor y licencia"><img loading="lazy" alt="" src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(c[8])}?width=120"></a>` : "";
    return `<li class="img${star ? " star" : ""}">${thumb}<div>${star ? "★ " : ""}<a href="${link}" target="_blank" rel="noopener">${esc(c[0] || "(sin nombre en la fuente)")}</a>` +
      `${dep ? ` · representa a ${dep}` : ""}${c[5] ? ` <span class="muted">· en ${esc(c[5])}</span>` : ""}${c[6] || c[7] ? ` <span class="muted">· ${esc([c[6], c[7]].filter(Boolean).join(", "))}</span>` : ""}` +
      `${c[9] === "osm" ? ' <span class="muted">(OpenStreetMap)</span>' : ""}` +
      `${String(c[9]).startsWith("contribution") ? ` <span class="badge b-wo">aportación${c[9].split(":")[1] === "proposed" ? ", a lápiz" : ""}${c[9].split(":")[2] ? " de " + esc(c[9].split(":")[2]) : ""}</span>` : ""}</div></li>`;
  };
  const imgs = I.length ? `<h3>Imágenes y estatuas <span class="muted small">${I.length}</span></h3><ul class="churches">${I.map(irow).join("")}</ul>` +
    `<p class="muted small">Las fotos son de Wikimedia Commons; pulsa una para ver su autor y su licencia.</p>` : "";
  box.innerHTML = imgs + `<h3>Iglesias <span class="muted small">${W.length + O.length}</span></h3>` +
    (W.length + O.length === 0 ? `<p class="muted small">Ni Wikidata ni OpenStreetMap tienen iglesias dentro del término municipal.</p>` : "") +
    (nstar ? `<p class="small">★ dedicada a un santo patrón del pueblo (según la dedicatoria de Wikidata; con María o Cristo no se marca, porque la advocación puede ser otra).</p>` : "") +
    (W.length ? `<div class="small muted">Wikidata</div><ul class="churches">${W.map(c => row(c, "w")).join("")}</ul>` : "") +
    (O.length ? `<details${W.length ? "" : " open"}><summary class="small muted">OpenStreetMap: ${O.length} más</summary><ul class="churches">${O.map(c => row(c, "o")).join("")}</ul></details>` : "") +
    `<p class="muted small">La dedicatoria solo se da cuando Wikidata la dice; el nombre de la iglesia no se usa para deducirla.</p>`;
  box.querySelectorAll("button.lk").forEach(b => b.addEventListener("click", () => selectDev(b.dataset.k, true)));
}

function fillOf(ine) {
  const t = D.towns[ine];
  const has = t.e && t.e.length;
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
  return {fillColor: fillOf(ine), fillOpacity: D.towns[ine].x && !state.nodata ? base * 0.55 : base, color: sel ? "#1d1519" : "#fff", weight: sel ? 2 : (map && map.getZoom() >= 8 ? 0.5 : 0.25)};
}
function restyle() { for (const ine in layers) layers[ine].setStyle(styleOf(ine)); if (state.town && layers[state.town]) layers[state.town].bringToFront(); }

// ---------- tooltip: says who each mark is (LLM.md §2c) ----------
const tip = $("#tip");
function showTip(ine, ev) {
  const t = D.towns[ine];
  const names = (t.e || []).map(e => devName(e)).slice(0, 4);
  tip.innerHTML = `<b>${esc(t.n)}</b> <span class="tp">${esc(t.p)}</span>` +
    `<div class="tl">${names.length ? names.map(esc).join("<br>") + (t.e.length > 4 ? `<br>y ${t.e.length - 4} más` : "") : "<i>sin dato todavía</i>"}</div>`;
  tip.hidden = false;
  const x = Math.min(ev.clientX + 14, innerWidth - 290), y = Math.min(ev.clientY + 14, innerHeight - 90);
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
function hideTip() { tip.hidden = true; }
// The day of a patron: the town's own (infobox), else the advocation's feast (Wikidata), else the saint's (P841).
function dayOf(e) {
  if (e.d) return {md: e.d, how: "según la ficha del pueblo"};
  if (e.fd) return {md: e.fd, how: "fiesta de la advocación en Wikidata"};
  const d = D.devotions[e.k];
  if (d.g === "santo" && d.f) {
    const all = d.f.split(";");
    if (all.length === 1) return {md: d.f, how: "fiesta litúrgica del santo en Wikidata", all};
    // several feasts in Wikidata (often the old and the reformed calendar): we do not know which one the town keeps
    return {md: all.includes(state.day) ? state.day : all[0], all,
      how: `una de las ${all.length} fiestas del santo en Wikidata (${all.map(md).join(", ")}); no se sabe cuál celebra el pueblo`};
  }
  return null;
}
const onDay = (e, day) => { const d = dayOf(e); return !!d && (d.all ? d.all.includes(day) : d.md === day); };
const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
function shiftDay(md, n) {
  const d = new Date(2024, +md.slice(0, 2) - 1, +md.slice(3) + n);   // 2024: a leap year, so 29 February exists
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

// ---------- controls ----------
function initControls() {
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => {
    state.view = b.dataset.view; state.dev = null; state.nodata = false; writeHash(false); renderAll();
  }));
  $("#explain").addEventListener("click", () => $("#explain").classList.toggle("open"));
  $("#churches-btn").addEventListener("click", () => {
    state.churches = !state.churches; writeHash(false); renderAll();
    if (state.churches && map.getZoom() < 11) $("#explain").innerHTML += " <b>Acércate más para ver las iglesias.</b>";
  });
  $("#nodata").addEventListener("click", () => { state.nodata = !state.nodata; state.dev = null; writeHash(false); renderAll(); });
  document.querySelector(".brand").addEventListener("click", e => {
    e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload();
  });
  // town search
  const q = $("#town-q"), hits = $("#town-hits");
  const index = Object.entries(D.towns).map(([ine, t]) => [ine, fold(t.n), t]);
  let sel = 0, found = [];
  const draw = () => {
    hits.innerHTML = found.map(([ine, , t], i) => `<button type="button" data-ine="${ine}" class="${i === sel ? "on" : ""}">${esc(t.n)} <small>${esc(t.p)}</small></button>`).join("");
    hits.hidden = !found.length;
  };
  q.addEventListener("input", () => {
    const s = fold(q.value.trim());
    if (s.length < 2) { found = []; draw(); return; }
    found = index.filter(x => x[1].startsWith(s)).concat(index.filter(x => !x[1].startsWith(s) && x[1].includes(s))).slice(0, 14);
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
    const move = ev => {
      const w = Math.max(280, Math.min(innerWidth * 0.7, innerWidth - ev.clientX)) + "px";
      document.documentElement.style.setProperty("--panel-w", w);
    };
    const up = () => {
      drag.removeEventListener("pointermove", move); drag.removeEventListener("pointerup", up);
      map.invalidateSize();
      try { localStorage.setItem("patronos.panel", getComputedStyle(document.documentElement).getPropertyValue("--panel-w").trim()); } catch (e) {}
    };
    drag.addEventListener("pointermove", move); drag.addEventListener("pointerup", up);
  });
}

function zoomTo(ine) { const l = layers[ine]; if (l) map.fitBounds(l.getBounds(), {maxZoom: 9, padding: [40, 40]}); }
function selectTown(ine, push) { state.town = ine; writeHash(push); renderAll(); }
function selectDev(k, push) { state.dev = k; state.nodata = false; state.town = null; writeHash(push); renderAll(); }

// ---------- render ----------
function renderAll() {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.view === state.view));
  $("#nodata").setAttribute("aria-pressed", state.nodata ? "true" : "false");
  $("#churches-btn").setAttribute("aria-pressed", state.churches ? "true" : "false");
  drawChurches();
  restyle();
  renderExplain();
  if (state.town) renderTown(state.town);
  else if (state.dev) renderDev(state.dev);
  else if (state.view === "cal") renderCal();
  else renderList();
}

function sw(c) { return `<span class="sw" style="background:${c}"></span>`; }
function renderExplain() {
  const m = D.meta, no = m.towns - m.with_data, pct = Math.round(100 * no / m.towns);
  let h;
  if (state.dev) {
    const d = D.devotions[state.dev];
    h = `${sw(devColor(state.dev))}Resaltados: los <b>${fmt(d.c)}</b> pueblos que tienen a <b>${esc(d.n)}</b> entre sus patrones, en cualquier puesto. ${sw(FADE)}otros pueblos con dato ${sw(NODATA)}sin dato.`;
  } else if (state.nodata) {
    h = `${sw("#8d7f70")}Los <b>${fmt(no)}</b> pueblos (${pct} %) de los que ni la ficha de Wikipedia ni Wikidata dicen el patrón. No quiere decir que no lo tengan: falta el dato.`;
  } else if (state.view === "cal") {
    const n = Object.values(D.towns).filter(t => (t.e || []).some(e => onDay(e, state.day))).length;
    const dated = Object.values(D.towns).filter(t => (t.e || []).some(e => dayOf(e))).length;
    h = `<button type="button" class="chip" id="d-prev" aria-label="Día anterior">◀</button> <b>${md(state.day)}</b> <button type="button" class="chip" id="d-next" aria-label="Día siguiente">▶</button>` +
      `${state.day !== TODAY ? ` <button type="button" class="chip" id="d-today">hoy</button>` : ""} · <b>${plural(n, "pueblo celebra", "pueblos celebran")}</b> a un patrón este día. ` +
      `La fecha es la de la ficha del pueblo o, si no la da, la del santo o la advocación en Wikidata; la fiesta del pueblo a menudo se pasa al fin de semana. ${sw(FADE)}con fecha otro día (${fmt(dated)} pueblos con alguna fecha) ${sw(NODATA)}sin fecha conocida.`;
  } else if (state.view === "group") {
    h = "Color del primer patrón que se nombra: " + Object.values(GROUP).map(g => `${sw(g.c)}${g.n}`).join("") + `${sw(NODATA)}sin dato (${fmt(no)}, ${pct} %). Las advocaciones de la Virgen cuentan como María, y las imágenes de Cristo como Cristo; la advocación está en la ficha.`;
  } else if (state.view === "agree") {
    h = "¿Dicen lo mismo las dos fuentes? " + Object.entries(AGREE).map(([k, a]) => `${sw(a.c)}${a.n} (${fmt(m.agreement[k] || 0)})`).join("") + `${sw(NODATA)}sin dato. Ojo: buena parte de Wikidata se copió de la Wikipedia en italiano, así que coincidir no es confirmarse.`;
  } else {
    h = `Color: el primer patrón que nombra la ficha del pueblo en Wikipedia (Wikidata si no hay ficha). Los ${topKeys.length} más frecuentes llevan color propio ${sw(OTHER)}el resto ${sw(NODATA)}sin dato (${fmt(no)} pueblos, ${pct} %). Más pálidos: ${fmt(m.text_only)} pueblos cuyo patrón solo se ha leído del texto del artículo (a lápiz). Pulsa un pueblo para ver todos sus patrones y la fuente de cada uno.`;
  }
  $("#explain").innerHTML = h;
  const go = n => e => { e.stopPropagation(); state.day = n === 0 ? TODAY : shiftDay(state.day, n); writeHash(false); renderAll(); };
  if ($("#d-prev")) { $("#d-prev").onclick = go(-1); $("#d-next").onclick = go(1); }
  if ($("#d-today")) $("#d-today").onclick = go(0);
}

function renderCal() {
  const by = {};
  for (const [ine, t] of Object.entries(D.towns)) for (const e of t.e || []) {
    if (onDay(e, state.day) && !(by[e.k] || []).some(x => x[0] === ine)) (by[e.k] = by[e.k] || []).push([ine, t, e, dayOf(e)]);
  }
  const keys = Object.keys(by).sort((a, b) => by[b].length - by[a].length);
  $("#panel").innerHTML = `<div class="p-h"><h2>${md(state.day)}</h2><span class="muted small">${keys.length ? plural(keys.length, "patrón", "patrones") : "ningún patrón con esta fecha"}</span></div>` +
    keys.map(k => `<div class="calgroup"><div><button type="button" class="lk" data-k="${esc(k)}"><b>${esc(D.devotions[k].n)}</b></button> <span class="muted small">${plural(by[k].length, "pueblo", "pueblos")}</span></div>` +
      `<ul class="towns">${by[k].sort((a, b) => a[1].n.localeCompare(b[1].n, "es")).map(([ine, t, e, d]) => `<li><button type="button" data-ine="${ine}" title="${esc(d.how)}">${esc(t.n)}</button>${e.t && e.t !== D.devotions[k].n && D.devotions[k].g !== "santo" ? ` <span class="muted">(${esc(e.t)})</span>` : ""}</li>`).join("")}</ul></div>`).join("") + foot();
  $("#panel").querySelectorAll("button.lk").forEach(b => b.addEventListener("click", () => selectDev(b.dataset.k, true)));
  $("#panel").querySelectorAll(".towns button").forEach(b => b.addEventListener("click", () => { selectTown(b.dataset.ine, true); zoomTo(b.dataset.ine); }));
}

function renderList() {
  const all = Object.entries(D.devotions).filter(([, d]) => d.c).sort((a, b) => b[1].c - a[1].c || a[1].n.localeCompare(b[1].n, "es"));
  const q = fold(state.q || "");
  const byG = state.g ? all.filter(([, d]) => d.g === state.g) : all;
  const rows = q ? byG.filter(([, d]) => fold(d.n).includes(q) || fold(d.le || "").includes(q)) : byG;
  const gc = g => all.filter(([, d]) => d.g === g).length;
  const shown = rows.slice(0, q ? 200 : state.list);
  $("#panel").innerHTML = `
    <div class="p-h"><h2>Patrones</h2><span class="muted small">${fmt(all.length)} distintos · pueblos que los tienen</span></div>
    <input id="dev-q" type="search" placeholder="Buscar santo, Virgen, Cristo…" value="${esc(state.q)}" aria-label="Buscar patrón">
    <div class="gchips">${[["", "todos", all.length], ["santo", "santos", gc("santo")], ["maria", "María", gc("maria")], ["cristo", "Cristo", gc("cristo")], ["sin_identificar", "sin identificar", gc("sin_identificar")]]
      .map(([g, n, c]) => `<button type="button" class="chip" data-g="${g}" aria-pressed="${state.g === g}">${n} <span class="muted">${fmt(c)}</span></button>`).join("")}</div>
    ${state.g === "maria" || state.g === "cristo" ? `<p class="small muted">María y Cristo son una sola entrada cada uno; sus advocaciones están dentro (púlsala).</p>` : ""}
    <ul class="devlist">${shown.map(([k, d]) => `<li data-k="${esc(k)}" class="${k === state.dev ? "sel" : ""}">${sw(colorOf[k] || OTHER)}<span class="nm">${esc(d.n)}${d.g === "sin_identificar" ? ' <span class="gtag">sin identificar</span>' : ""}</span><span class="ct">${fmt(d.c)}</span></li>`).join("")}</ul>
    ${!q && rows.length > shown.length ? `<button class="more" type="button">ver ${fmt(Math.min(rows.length - shown.length, 200))} más</button>` : ""}
    ${q && !rows.length ? `<p class="muted small">Ningún patrón con ese nombre.</p>` : ""}
    ${foot()}`;
  const inp = $("#dev-q");
  inp.addEventListener("input", () => { state.q = inp.value; const pos = inp.selectionStart; renderList(); const i2 = $("#dev-q"); i2.focus(); i2.setSelectionRange(pos, pos); });
  $("#panel .devlist").addEventListener("click", e => { const li = e.target.closest("li"); if (li) selectDev(li.dataset.k, true); });
  const more = $("#panel .more"); if (more) more.addEventListener("click", () => { state.list += 200; renderList(); });
  $("#panel").querySelectorAll(".gchips .chip").forEach(b => b.addEventListener("click", () => { state.g = b.dataset.g; renderList(); }));
}

function roleText(e) {
  if (e.r) return e.r;
  return "patrón o patrona";
}
function srcHtml(s) {
  const [src, url, quote, how, extra] = s;
  let ex = extra || "";
  ex = ex.replace(/importado de ([a-z]+wiki(?:, [a-z]+wiki)*)/, (m, w) => "importado de " + w.split(", ").map(x => WIKI[x] || x).join(" y "));
  const name = {eswiki: "Wikipedia · ficha del pueblo", eswiki_text: "Wikipedia · texto del artículo", wikidata: "Wikidata · P417"}[src];
  return `<div class="src"><span class="sname">${name}</span> · <a href="${esc(url)}" target="_blank" rel="noopener">ver</a>${ex ? ` · <span class="muted">${esc(ex)}</span>` : ""}
    <div><code>${esc(quote)}</code></div>${how ? `<div class="how">${esc(how)}</div>` : ""}</div>`;
}
function renderTown(ine) {
  const t = D.towns[ine];
  let h = `<div class="p-h"><span class="muted small">Pueblo</span><button class="back" type="button">${state.dev ? "← " + esc(D.devotions[state.dev].n) : "← todos los patrones"}</button></div>
    <div class="town"><h2>${esc(t.n)}</h2><div class="where">${esc(t.p)} · ${esc(t.c)}</div>`;
  if (!t.e || !t.e.length) {
    const parishes = ["Galicia", "Principado de Asturias", "Asturias", "Cantabria"].includes(t.c);
    h += `<div class="nodata">Todavía no hay dato. La ficha de este pueblo en Wikipedia no dice su patrón, y Wikidata tampoco. No quiere decir que no lo tenga: es lo que falta por completar.` +
      (parishes ? ` En ${esc(t.c)} un municipio suele reunir varias parroquias o pueblos, y cada uno tiene su patrón, así que a menudo no hay un patrón del municipio entero.` : "") + `</div>`;
  } else {
    if (t.x) h += `<div class="warn">La ficha de este pueblo en Wikipedia no dice su patrón: se ha leído de una frase del artículo (debajo, la frase). Es una propuesta a lápiz, pendiente de confirmar.</div>`;
    if (t.a === "disagree") h += `<div class="warn">Wikipedia y Wikidata no nombran a ningún patrón en común. Se enseñan las dos versiones.</div>`;
    if (t.a === "partial") h += `<div class="warn">Wikidata nombra además a alguien que la ficha de Wikipedia no incluye (marcado «solo Wikidata»).</div>`;
    for (const e of t.e) {
      const d = D.devotions[e.k];
      const adv = e.t && e.t !== d.n ? `<div class="adv">como <b>${esc(e.t)}</b></div>` : "";
      const dd = dayOf(e), day = dd ? `${md(dd.md)} · ${dd.how}` : "";
      const flMatch = dd && t.fl && t.fl.some(f => (dd.all || [dd.md]).includes(f[0]));
      h += `<div class="entry">
        <div class="role">${esc(roleText(e))}${e.wo ? '<span class="badge b-wo">solo Wikidata</span>' : ""}</div>
        <div class="who"><button type="button" data-k="${esc(e.k)}" title="Ver todos los pueblos con este patrón">${esc(d.n)}</button><span class="badge b-${d.g}">${esc(GROUP[d.g].n)}</span></div>
        ${adv}${day ? `<div class="day">${day}${flMatch ? ` · <span class="ok">✓ es fiesta local oficial del municipio en 2026</span>` : ""}</div>` : ""}
        <div class="srcs">${e.s.map(srcHtml).join("")}</div></div>`;
    }
  }
  if (t.fl) {
    const who = {cat: "Generalitat de Catalunya", cyl: "Junta de Castilla y León", ara: "Gobierno de Aragón", mad: "Comunidad de Madrid", eus: "Gobierno Vasco"}[t.fl[0][3]];
    const named = t.fl.some(f => f[1]);
    h += `<div class="fl"><b>Fiestas locales oficiales ${t.fl[0][2]}</b> <span class="muted small">(${who})</span><ul>` +
      t.fl.map(f => `<li>${md(f[0])}${f[1] ? ` · ${esc(niceName(f[1]))}` : ""}</li>`).join("") + `</ul>` +
      `<p class="small muted">${named ? "Una fiesta local no es necesariamente el patrón (San Isidro, por ejemplo, es fiesta local en cientos de pueblos que tienen otro patrón)." : "Son fechas: no dicen a quién se celebra."}</p></div>`;
  }
  h += `<div id="churches" class="churchbox"><p class="muted small">Cargando iglesias…</p></div>`;
  h += `<div class="links">${t.w ? `<a href="https://es.wikipedia.org/wiki/${encodeURIComponent(t.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia</a>` : ""}${t.q ? `<a href="https://www.wikidata.org/wiki/${t.q}" target="_blank" rel="noopener">Wikidata</a>` : ""}<span class="muted">INE ${ine}</span></div></div>${foot()}`;
  $("#panel").innerHTML = h;
  $("#panel .back").addEventListener("click", () => { state.town = null; writeHash(true); renderAll(); });
  $("#panel").querySelectorAll(".who button").forEach(b => b.addEventListener("click", () => selectDev(b.dataset.k, true)));
  $("#panel").scrollTop = 0;
  fillChurches(ine);
}

function renderDev(k) {
  const d = D.devotions[k];
  const towns = Object.entries(D.towns).filter(([, t]) => t.e && t.e.some(e => e.k === k))
    .sort((a, b) => a[1].p.localeCompare(b[1].p, "es") || a[1].n.localeCompare(b[1].n, "es"));
  let h = `<div class="p-h"><span class="muted small">Patrón</span><button class="back" type="button">← todos los patrones</button></div>
    <div class="town"><h2>${esc(d.n)} <span class="badge b-${d.g}">${esc(GROUP[d.g].n)}</span></h2>`;
  if (d.le && d.le !== d.n) h += `<div class="where">En Wikidata: ${esc(d.le)}</div>`;
  if (d.g === "santo" && d.fl) h += `<div class="day small">Fiesta litúrgica según Wikidata: ${esc(d.fl)}</div>`;
  if (d.g === "sin_identificar") h += `<div class="warn">Texto que la fuente no enlaza a nadie, o que en otros pueblos enlaza a santos distintos (por ejemplo, «San Antonio» puede ser el Abad o el de Padua). Se enseña tal cual.</div>`;
  h += `<p><b>${fmt(towns.length)}</b> pueblos lo tienen entre sus patrones.${d.im ? ` Hay <b>${fmt(d.im)}</b> imágenes o estatuas que lo representan con lugar conocido.` : ""}${d.ch ? ` Wikidata conoce <b>${fmt(d.ch)}</b> iglesias dedicadas a ${d.g === "santo" ? "él o ella" : "esta devoción"} en España.` : ""}</p>`;
  if (d.g === "maria" || d.g === "cristo" || d.g === "dios") {
    const adv = {};
    for (const [, t] of towns) for (const e of t.e) if (e.k === k) { const a = e.t || d.n; adv[a] = (adv[a] || 0) + 1; }
    const list = Object.entries(adv).sort((a, b) => b[1] - a[1]);
    h += `<p class="small muted">${fmt(list.length)} advocaciones distintas. Las más nombradas:</p><ul class="towns">${list.slice(0, 30).map(([a, n]) => `<li>${esc(a)} <span class="muted">${n}</span></li>`).join("")}</ul>`;
  }
  const byProv = {};
  for (const [ine, t] of towns) (byProv[t.p] = byProv[t.p] || []).push([ine, t]);
  h += Object.entries(byProv).map(([p, l]) => `<div class="small"><b>${esc(p)}</b> <span class="muted">${l.length}</span></div><ul class="towns">${l.map(([ine, t]) => `<li><button type="button" data-ine="${ine}">${esc(t.n)}</button></li>`).join("")}</ul>`).join("");
  h += `<div class="links">${d.w ? `<a href="https://es.wikipedia.org/wiki/${encodeURIComponent(d.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia</a>` : ""}${d.i ? `<a href="https://www.wikidata.org/wiki/${d.i}" target="_blank" rel="noopener">Wikidata</a>` : ""}</div></div>${foot()}`;
  $("#panel").innerHTML = h;
  $("#panel .back").addEventListener("click", () => { state.dev = null; writeHash(true); renderAll(); });
  $("#panel").querySelectorAll(".towns button").forEach(b => b.addEventListener("click", () => { selectTown(b.dataset.ine, true); zoomTo(b.dataset.ine); }));
  $("#panel").scrollTop = 0;
}

function foot() {
  return `<div class="foot">Fuentes: ${Object.values(D.sources).map(s => `<a href="${s.u}" target="_blank" rel="noopener">${esc(s.n)}</a> (${esc(s.l)}): ${esc(s.d)}`).join(" · ")}
    Iglesias: <a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> (CC0) y © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores de OpenStreetMap</a> (ODbL). Contornos: GISCO © EuroGeographics. Códigos: INE.</div>`;
}
