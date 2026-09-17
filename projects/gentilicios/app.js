"use strict";
const DATA_V = "0.4.7";
const BUILD_AT = "2026-09-17 09:24";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

// ---------- vocabulary ----------
const SRC_SHORT = {
  wikidata: "Wikidata", eswiki: "Wikipedia", eswiki_anexos: "Wikipedia · anexo de gentilicios",
  cawiki_balears: "Viquipèdia", glwiki_xentilicios: "Galipedia", eswiktionary: "Wikcionario",
  avl_municipis: "Acadèmia Valenciana de la Llengua", parlament_cat_guia: "Parlament de Catalunya",
  euskaltzaindia_arauak: "Euskaltzaindia", acl_catalogo: "Academia Canaria de la Lengua",
  rag_lexico_admin: "Real Academia Galega", fundeurae: "FundéuRAE", rae_dle: "DLE · RAE",
  madoz: "Madoz (1845-1850)", felipe2_ciudadreal: "Relaciones de Felipe II", felipe2_cuenca: "Relaciones de Felipe II",
  felipe2_toledo: "Relaciones de Felipe II", felipe2_guadalajara: "Relaciones de Felipe II",
  cawiki: "Viquipèdia", glwiki: "Galipedia", euwiki: "Wikipedia en euskera",
  anwiki: "Wikipedia en aragonés", astwiki: "Wikipedia en asturiano", enwiki: "Wikipedia en inglés",
  wikidata_p138: "Wikidata · nombrado en honor de", ine_alteraciones: "INE · variaciones de los municipios desde 1842",
  minano: "Miñano (1826-1829)", rah1802: "Real Academia de la Historia (1802)", rah1846: "Govantes, RAH (1846)",
  felipe2_madrid: "Relaciones de Felipe II", eswiki_historia: "Wikipedia",
};
const FIELD_LABEL = {
  demonym: "Gentilicio", demonym_nickname: "Apodo", demonym_dictionary: "Diccionario",
  name_etymology: "Etimología del nombre", name_origin_legend: "Por qué se llama así, según la tradición",
  name_historical_form: "Forma antigua del nombre", historical_description: "Descripción histórica",
  demonym_etymology: "Etimología del gentilicio", demonym_first_attestation: "Primera aparición del gentilicio",
  municipal_alteration: "Fusiones, segregaciones y cambios del municipio",
};
const KIND_LABEL = { academic: "académica", traditional: "tradicional", folk: "leyenda", deduced: "deducida" };
const LANG_LABEL = { es: "es", ca: "ca", gl: "gl", eu: "eu", ast: "ast", an: "an", oc: "oc" };
const MATCH_LABEL = {
  wikidata_item: "dato del propio elemento de Wikidata del municipio",
  eswiki_article: "ficha del artículo del municipio",
  list_link_item: "línea de una lista enlazada al artículo del municipio",
  list_name_unique_in_ccaa: "nombre único dentro de la comunidad de la lista",
  wiktionary_name_country: "nombre único en España citado en la acepción",
};
const srcName = s => SRC_SHORT[s] || (SOURCES[s] && SOURCES[s].name) || s;

// Language groups, always in this order (Víctor, 2026-09-17): Spanish, the other languages of Spain, foreign.
const CO_OFFICIAL = new Set(["ca", "gl", "eu", "ast", "an", "oc", "val", "ext"]);
const LANG_NAME = { es: "español", ca: "catalán / valenciano", gl: "gallego", eu: "euskera", ast: "asturiano", an: "aragonés", oc: "aranés",
  en: "inglés", fr: "francés", it: "italiano", de: "alemán", pt: "portugués", ar: "árabe", la: "latín" };
const GROUP_TITLE = { es: "En español", co: "En otras lenguas de España", fx: "En lenguas extranjeras" };
const langGroup = langs => {
  const ls = [].concat(langs || []).filter(Boolean);
  if (!ls.length || ls.includes("es")) return "es";
  return ls.some(l => CO_OFFICIAL.has(l)) ? "co" : "fx";
};
function byGroup(items, langsOf) {
  const g = { es: [], co: [], fx: [] };
  for (const it of items) g[langGroup(langsOf(it))].push(it);
  return g;
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fmt = n => n.toLocaleString("es-ES");

let MUNIS = [], BY_ID = new Map(), SOURCES = {}, V = DATA_V;
const CLAIMS_BY = new Map(), PROV_LOADED = new Map();
const HOVER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
let mode = "sx", selected = null, layer = null, map = null;
const layersById = new Map();

// ---------- colours ----------
// categorical palettes: warm for suffixes, earthy for origins; "otro"/empty in paper grey
const SX_COL = { "-ense": "#7a4a2b", "-eño": "#c9905a", "-ano": "#2e6b6b", "-ero": "#8fb8b0", "-ino": "#7b3fb0",
  "-és": "#b6465f", "-(i)ego": "#d9a441", "-ejo": "#5b7f3a", otro: "#b8ada0", "": "#ebe5da" };
const SX_ORDER = ["-ense", "-eño", "-ano", "-ero", "-ino", "-és", "-(i)ego", "-ejo", "otro", ""];
const OL_COL = { latin: "#8a4f2a", arabic: "#2e6b6b", basque: "#b6465f", prerroman: "#7b3fb0", celtic: "#5b7f3a",
  germanic: "#d9a441", romance: "#c9905a", disputed: "#6f665c", unknown: "#b8ada0", "": "#ebe5da" };
const OL_LABEL = { latin: "latín", arabic: "árabe", basque: "euskera", prerroman: "prerromano", celtic: "celta",
  germanic: "germánico", romance: "romance", disputed: "las fuentes no coinciden", unknown: "desconocido", "": "sin etimología" };
const GA_COL = { nombre_antiguo: "#7b3fb0", otra_lengua: "#2e6b6b", sin_relacion: "#b6465f", nombre_actual: "#e6c89c", "": "#ebe5da" };
const GA_LABEL = { nombre_antiguo: "de un nombre antiguo o latino", otra_lengua: "del nombre en otra lengua de España",
  sin_relacion: "no se parece a ningún nombre recogido", nombre_actual: "del nombre actual", "": "sin gentilicio" };
// per town: sources behind the principal Spanish form (each form has its own count; the principal is the one shown
// first), and distinct Spanish forms without apodos (other languages would inflate bilingual areas)
// "kinds" selector (Víctor, 2026-09-17): gentilicios, apodos or both, inside the same map
let KINDS = "dem";   // "dem" | "nick" | "both"
const kindOk = f => KINDS === "both" || f.k === KINDS;
const principalSources = m => {
  const dem = m.g.find(f => f.pr && f.k === "dem" && langGroup(f.l) === "es");
  const nick = m.g.filter(f => f.k === "nick" && langGroup(f.l) === "es").reduce((a, f) => Math.max(a, f.n), 0);
  if (KINDS === "dem") return dem ? dem.n : 0;
  if (KINDS === "nick") return nick;
  return Math.max(dem ? dem.n : 0, nick);
};
const spanishCount = m => m.g.filter(f => kindOk(f) && langGroup(f.l) === "es").length;
const KIND_WORD = { dem: "gentilicios", nick: "apodos", both: "gentilicios y apodos" };
function colourOf(m) {
  if (mode === "ga") return GA_COL[m.ga || ""];
  if (mode === "sx") return SX_COL[SX_COL[m.sx] ? m.sx : "otro"] || "#ebe5da";
  if (mode === "ol") return OL_COL[m.ol] || OL_COL[""];
  if (mode === "sources") {
    const n = principalSources(m);
    return n === 0 ? "#ebe5da" : n === 1 ? "#e6c89c" : n === 2 ? "#c9905a" : n <= 4 ? "#8a4f2a" : "#4a2614";
  }
  if (mode === "ng") {
    const n = spanishCount(m);
    return n === 0 ? "#ebe5da" : n === 1 ? "#cfe0dc" : n === 2 ? "#8fb8b0" : n <= 4 ? "#2e6b6b" : "#173b3b";
  }
  if (mode === "curious") return m.cu ? "#7b3fb0" : (m.g.length ? "#e7e0d4" : "#f3efe8");
  if (mode === "ety") return m.ety && m.hist ? "#1f4f4f" : m.ety ? "#2e6b6b" : m.hist ? "#8fb8b0" : "#ebe5da";
}
function legend() {
  const count = f => fmt(MUNIS.filter(f).length);
  const rows = {
    sources: [[KINDS === "dem" ? "Fuentes del gentilicio principal" : KINDS === "nick" ? "Fuentes del apodo más citado" : "Fuentes (gentilicio principal o apodo)", null],
      ["#4a2614", "5 o más", m => principalSources(m) >= 5], ["#8a4f2a", "3 o 4", m => principalSources(m) >= 3 && principalSources(m) <= 4],
      ["#c9905a", "2", m => principalSources(m) === 2], ["#e6c89c", "1", m => principalSources(m) === 1],
      ["#ebe5da", { dem: "sin gentilicio en español", nick: "sin apodo", both: "ni gentilicio ni apodo" }[KINDS], m => principalSources(m) === 0]],
    ng: [[`${KIND_WORD[KINDS][0].toUpperCase()}${KIND_WORD[KINDS].slice(1)} en español`, null],
      ["#173b3b", "5 o más", m => spanishCount(m) >= 5], ["#2e6b6b", "3 o 4", m => spanishCount(m) >= 3 && spanishCount(m) <= 4],
      ["#8fb8b0", "2", m => spanishCount(m) === 2], ["#cfe0dc", "1", m => spanishCount(m) === 1],
      ["#ebe5da", "ninguno", m => spanishCount(m) === 0]],
    curious: [["Gentilicio curioso", null],
      ["#7b3fb0", "no se parece al nombre", m => m.cu], ["#e7e0d4", "se parece", m => !m.cu && m.g.length],
      ["#f3efe8", "sin gentilicio", m => !m.g.length]],
    sx: [["Sufijo del gentilicio principal", null]].concat(SX_ORDER.map(k => [SX_COL[k], k === "" ? "sin gentilicio en español" : k === "otro" ? "otros" : k,
      mm => (SX_COL[mm.sx] ? mm.sx : "otro") === k && (k !== "otro" || mm.sx)])),
    ga: [["De dónde sale el gentilicio", null]].concat(Object.keys(GA_COL).map(k => [GA_COL[k], GA_LABEL[k], mm => (mm.ga || "") === k])),
    ol: [["Origen del nombre, según las fuentes", null]].concat(Object.keys(OL_COL).map(k => [OL_COL[k], OL_LABEL[k], mm => (mm.ol || "") === k])),
    ety: [["Etimología e historia", null],
      ["#1f4f4f", "las dos", m => m.ety && m.hist], ["#2e6b6b", "etimología", m => m.ety && !m.hist],
      ["#8fb8b0", "historia", m => m.hist && !m.ety], ["#ebe5da", "nada todavía", m => !m.ety && !m.hist]],
  }[mode];
  document.getElementById("legend").innerHTML = rows.map(([c, l, f]) => f
    ? `<div class="lr"><span class="sw" style="background:${c}"></span>${l}<span class="ln">${count(f)}</span></div>`
    : `<div class="lt">${c}</div>`).join("") +
    (mode === "curious" ? `<div class="note">calculado: comparamos el gentilicio con el nombre</div>` : "") +
    (mode === "sx" ? `<div class="note">del gentilicio principal en español</div>` : "") +
    (mode === "ng" ? `<div class="note">formas distintas en español; las otras lenguas, en la ficha</div>` : "") +
    (mode === "sources" ? `<div class="note">cada forma tiene sus fuentes</div>` : "") +
    (mode === "ga" ? `<div class="note">deducido: comparamos cada gentilicio con los nombres actuales, antiguos y en otras lenguas que dan las fuentes</div>` : "") +
    (mode === "ol" ? `<div class="note">la lengua que nombran las hipótesis</div>` : "") +
    (mode === "ng" || mode === "sources" ? `<div class="kinds" role="group" aria-label="Qué formas">${["dem", "nick", "both"].map(k =>
      `<button type="button" data-kinds="${k}" class="${KINDS === k ? "active" : ""}">${{ dem: "Gentilicios", nick: "Apodos", both: "Ambos" }[k]}</button>`).join("")}</div>` : "");
  document.querySelectorAll("#legend [data-kinds]").forEach(b => b.addEventListener("click", () => { KINDS = b.dataset.kinds; restyle(); }));
}
function restyle() {
  if (!layer) return;
  layer.eachLayer(l => {
    const m = BY_ID.get(l.feature.id);
    const sel = selected && m.id === selected;
    l.setStyle({ fillColor: colourOf(m), fillOpacity: sel ? 1 : .88, color: sel ? "#241a12" : "#fff", weight: sel ? 2.2 : .35 });
    if (sel) l.bringToFront();
  });
  legend();
}

// ---------- main gentilicio text ----------
function mainForms(m, n = 2) {
  const es = m.g.filter(f => f.k === "dem" && langGroup(f.l) === "es").sort((a, b) => (b.pr ? 1 : 0) - (a.pr ? 1 : 0));
  const co = m.g.filter(f => f.k === "dem" && langGroup(f.l) === "co");
  return es.concat(co).slice(0, n).map(f => f.m).join(", ");
}

// ---------- load ----------
// build.json is asked without cache; its hash versions every data file, so a rebuilt dataset is never
// hidden behind the browser's copy of the old one
fetch("gentilicios/data/build.json", { cache: "no-store" }).then(r => r.json()).catch(() => ({ v: DATA_V })).then(b => {
  V = b.v || DATA_V;
  return Promise.all([
    fetch(`gentilicios/data/munis.json?v=${V}`).then(r => r.json()),
    fetch(`gentilicios/data/sources.json?v=${V}`).then(r => r.json()),
    fetch(`gentilicios/data/municipalities.geojson?v=${V}`).then(r => r.json()),
  ]);
}).then(([munis, sources, geo]) => {
  MUNIS = munis; SOURCES = sources;
  for (const m of MUNIS) BY_ID.set(m.id, m);
  stats(); initMap(geo); initSearch(); initTable(); intro();
  fromHash();
});

function stats() {
  const withG = MUNIS.filter(m => m.g.some(f => f.k === "dem")).length;
  const forms = MUNIS.reduce((a, m) => a + m.g.length, 0);
  document.getElementById("stats").innerHTML =
    `<b>${fmt(MUNIS.length)}</b> municipios · <b>${fmt(withG)}</b> con gentilicio · <b>${fmt(forms)}</b> formas`;
}

function initMap(geo) {
  map = L.map("map", { preferCanvas: true, zoomControl: true, minZoom: 4 }).setView([40.2, -3.6], 6);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · límites: Eurostat GISCO · municipios: INE',
    maxZoom: 18, opacity: .5,
  }).addTo(map);
  layer = L.geoJSON(geo, {
    style: f => ({ fillColor: colourOf(BY_ID.get(f.id)), fillOpacity: .88, color: "#fff", weight: .35 }),
    onEachFeature: (f, l) => {
      layersById.set(f.id, l);
      if (HOVER) {
        l.on("mouseover", () => {
          const m = BY_ID.get(f.id);
          const g = mainForms(m);
          const nk = m.g.filter(f => f.k === "nick" && langGroup(f.l) !== "fx").slice(0, 2).map(f => f.m).join(", ");
          l.bindTooltip(`<b>${esc(m.n)}</b>${g ? esc(g) : "<i>sin gentilicio documentado</i>"}${nk ? `<br><span class="tk">apodo: <i>${esc(nk)}</i></span>` : ""}`, { className: "mt", sticky: true, direction: "top" }).openTooltip();
          if (m.id !== selected) l.setStyle({ weight: 1.4, color: "#241a12" });
        });
        l.on("mouseout", () => { if (f.id !== selected) l.setStyle({ weight: .35, color: "#fff" }); });
      }
      // phone: a tap opens the bubble and "Más detalles" opens the ficha; desktop: the side panel is already
      // there, so a click opens the ficha directly (Víctor, 2026-09-17)
      l.on("click", e => { l.closeTooltip(); isMobile() ? showPopup(f.id, e.latlng) : select(f.id, false); });
    },
  }).addTo(map);
  legend();
  document.querySelectorAll(".mode-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(x => x.classList.toggle("active", x === b));
    mode = b.dataset.mode; restyle();
  }));
  document.getElementById("go-canarias").addEventListener("click", () => map.flyTo([28.3, -15.8], 8));
}

// ---------- bubble ----------
function showPopup(id, latlng) {
  const m = BY_ID.get(id);
  if (!m) return;
  selected = id; restyle();
  const dem = m.g.filter(f => f.k === "dem" && langGroup(f.l) !== "fx"), nick = m.g.filter(f => f.k === "nick" && langGroup(f.l) !== "fx");
  dem.sort((a, b) => (langGroup(a.l) !== "es") - (langGroup(b.l) !== "es") || (b.pr ? 1 : 0) - (a.pr ? 1 : 0));
  const formTxt = f => `<i>${esc(f.m)}</i>${f.f && f.f !== f.m ? ` <span class="pf">/ ${esc(f.f)}</span>` : ""}${f.l.length && !f.l.includes("es") ? ` <span class="badge lang">${esc(f.l.join(" "))}</span>` : ""}`;
  const html = `<div class="pop">
    <div class="pn">${esc(m.n)}</div>
    <div class="pp">${esc(m.p === m.c ? m.p : m.p + " · " + m.c)}${m.pop != null ? ` · ${Number(m.pop).toLocaleString("es-ES")} hab.` : ""}</div>
    ${dem.length ? `<div class="pg">${dem.slice(0, 4).map(formTxt).join("<br>")}${dem.length > 4 ? `<br><span class="pm">y ${dem.length - 4} más</span>` : ""}</div>`
      : `<div class="pg pm">sin gentilicio documentado</div>`}
    ${nick.length ? `<div class="pk">apodo: ${nick.slice(0, 2).map(f => `<i>${esc(f.m)}</i>`).join(", ")}</div>` : ""}
    <div class="pc">${[m.ns ? `${m.ns} ${m.ns === 1 ? "fuente" : "fuentes"}` : "", m.cu ? `<span class="badge cur">curioso</span>` : "",
      m.ety ? `etimología (${m.ety})` : "", m.hist ? `historia (${m.hist})` : ""].filter(Boolean).join(" · ")}</div>
    <button type="button" class="more" data-id="${m.id}">Más detalles</button>
  </div>`;
  const ll = latlng || (layersById.get(id) && layersById.get(id).getBounds().getCenter());
  const pop = L.popup({ maxWidth: 260, autoPanPadding: [20, 70], className: "gpop" }).setLatLng(ll).setContent(html).openOn(map);
  const btn = pop.getElement() && pop.getElement().querySelector(".more");
  if (btn) btn.addEventListener("click", () => select(id, false));
}

// ---------- panel ----------
function closeFicha() {
  if (terrLayer) { map.removeLayer(terrLayer); terrLayer = null; }
  document.body.classList.remove("detail-open");
  history.replaceState(null, "", location.pathname);
  intro();
}
function openPanel() {
  document.body.classList.add("detail-open");
}

function intro() {
  selected = null; restyle();
  document.body.classList.remove("has-ficha");
  const withG = MUNIS.filter(m => m.g.some(f => f.k === "dem"));
  const cur = MUNIS.filter(m => m.cu);
  const multi = MUNIS.filter(m => m.g.filter(f => f.k === "dem" && (!f.l.length || f.l.includes("es"))).length >= 3);
  const pick = cur.slice().sort((a, b) => b.ns - a.ns || a.n.localeCompare(b.n, "es")).slice(0, 40);
  document.getElementById("panel-body").innerHTML = `
    <div class="intro">
      <h2>¿Cómo se llama la gente de cada pueblo?</h2>
      <p>Todos los gentilicios de los municipios de España que dicen las fuentes, con sus versiones, sus apodos y, poco a poco, la etimología y la historia del nombre. <b>Cada dato lleva su fuente</b>: pulsa un pueblo en el mapa o búscalo.</p>
      <div class="kpis">
        <div class="kpi"><b>${fmt(withG.length)}</b><span>municipios con gentilicio (${Math.round(100 * withG.length / MUNIS.length)} %)</span></div>
        <div class="kpi"><b>${fmt(cur.length)}</b><span>gentilicios que no se parecen al nombre</span></div>
        <div class="kpi"><b>${fmt(multi.length)}</b><span>pueblos con 3 o más gentilicios</span></div>
        <div class="kpi"><b>${fmt(MUNIS.length - withG.length)}</b><span>sin documentar todavía</span></div>
      </div>
      <div class="h3">Curiosos con más fuentes</div>
      <ul class="curlist">${pick.map(m => `<li data-id="${m.id}"><span class="cn">${esc(m.n)}</span>
        <span class="cg">${esc(m.g.filter(f => f.cu).map(f => f.m).slice(0, 2).join(", "))}</span><span class="cp">${esc(m.p)}</span></li>`).join("")}</ul>
    </div>`;
  document.querySelectorAll(".curlist li").forEach(li => li.addEventListener("click", () => select(li.dataset.id, true)));
}

const CTX = new Map(), CTX_LOADED = new Map();
function loadContext(pc) {
  if (!CTX_LOADED.has(pc)) {
    CTX_LOADED.set(pc, fetch(`gentilicios/data/context/${pc}.json?v=${V}`).then(r => r.ok ? r.json() : {}).then(d => {
      for (const [e, c] of Object.entries(d)) CTX.set(e, c);
    }).catch(() => {}));
  }
  return CTX_LOADED.get(pc);
}

// ---------- territories: provinces, comunidades, comarcas, islands ----------
let TERR = new Map(), MUNI_TERR = {};
const LEVEL_LABEL = { prov: "Provincia", ccaa: "Comunidad autónoma", comarca: "Comarca", isla: "Isla" };
fetch("gentilicios/data/build.json", { cache: "no-store" }).then(r => r.json()).then(b =>
  fetch(`gentilicios/data/territories.json?v=${b.v}`)).then(r => r.ok ? r.json() : null).then(d => {
  if (!d) return;
  for (const x of d.t) TERR.set(x.id, x);
  MUNI_TERR = d.mt || {};
}).catch(() => {});
const provId = m => `prov:${m.pc}`;
function ccaaIdOf(m) {
  const p = TERR.get(provId(m));
  return p && p.par && p.par.startsWith("ccaa:") ? p.par : null;
}
function terrLink(id, label) {
  const tt = TERR.get(id);
  if (!tt) return esc(label);
  const g = tt.g.find(f => f.pr) || tt.g.find(f => f.k === "dem");
  return `<a href="#${esc(id)}" class="terr" data-terr="${esc(id)}" title="${esc(LEVEL_LABEL[tt.lv] || "")}${g ? ": " + esc(g.m) : ""}">${esc(label)}</a>`;
}
let terrLayer = null;
async function openTerritory(id) {
  const tt = TERR.get(id);
  if (!tt) return;
  selected = null; restyle();
  map.closePopup();
  openPanel();
  document.body.classList.add("has-ficha");
  history.replaceState(null, "", "#" + id);
  // members on the map: comarca and island lists, or every town of the province / comunidad
  const members = tt.mem.length ? new Set(tt.mem)
    : new Set(MUNIS.filter(m => tt.lv === "prov" ? provId(m) === id : ccaaIdOf(m) === id).map(m => m.id));
  if (terrLayer) map.removeLayer(terrLayer);
  terrLayer = L.layerGroup().addTo(map);
  let bounds = null;
  for (const e of members) {
    const l = layersById.get(e);
    if (!l) continue;
    L.geoJSON(l.feature, { style: { color: "#241a12", weight: .6, fillColor: "#241a12", fillOpacity: .18 }, interactive: false }).addTo(terrLayer);
    bounds = bounds ? bounds.extend(l.getBounds()) : L.latLngBounds(l.getBounds().getSouthWest(), l.getBounds().getNorthEast());
  }
  if (bounds) { try { map.fitBounds(bounds, { padding: [20, 20] }); } catch (e) {} }
  const body = document.getElementById("panel-body");
  body.innerHTML = `<div class="ficha"><h2>${esc(tt.n)}</h2><div class="where">${esc(LEVEL_LABEL[tt.lv] || tt.lv)}</div><p class="empty">cargando fuentes…</p></div>`;
  await loadClaims("terr");
  const cl = CLAIMS_BY.get(id) || [];
  const byForm = new Map();
  for (const c of cl) if (["demonym", "demonym_nickname"].includes(c.fd)) {
    const k = (c.fd === "demonym_nickname" ? "nick|" : "dem|") + c.v;
    if (!byForm.has(k)) byForm.set(k, []);
    byForm.get(k).push(c);
  }
  const block = f => {
    let cs = byForm.get((f.k === "nick" ? "nick|" : "dem|") + f.m) || [];
    if (f.f) cs = cs.concat(byForm.get((f.k === "nick" ? "nick|" : "dem|") + f.f) || []);
    return `<details class="form"><summary><span class="fm">${esc(f.m)}</span>${f.f && f.f !== f.m ? `<span class="ff">${esc(f.f)}</span>` : ""}
      ${f.l.map(l => `<span class="badge lang">${esc(l)}</span>`).join("")}${f.pr ? `<span class="badge prin">principal</span>` : ""}
      <span class="badge nsrc">${f.n} ${f.n === 1 ? "fuente" : "fuentes"}</span></summary>${cs.map(claimHTML).join("")}</details>`;
  };
  const sections = (items, langsOf, render) => {
    const g = byGroup(items, langsOf);
    return ["es", "co", "fx"].filter(k => g[k].length).map(k => k === "fx"
      ? `<details class="lg fx"><summary>${GROUP_TITLE[k]} (${g[k].length})</summary>${render(g[k])}</details>`
      : k === "es" ? `<div class="lg es">${render(g[k])}</div>` : `<div class="lg ${k}"><div class="lgt">${GROUP_TITLE[k]}</div>${render(g[k])}</div>`).join("");
  };
  const dems = tt.g.filter(f => f.k === "dem"), nicks = tt.g.filter(f => f.k === "nick");
  const ety = cl.filter(c => ["name_etymology", "name_origin_legend"].includes(c.fd));
  const parent = tt.par && TERR.get(tt.par);
  // single-province comunidades: the gentilicio lives on the comunidad
  const sameName = !dems.length && parent && parent.n === tt.n;
  body.innerHTML = `<div class="ficha">
    <h2>${esc(tt.n)}</h2>
    <div class="where">${esc(LEVEL_LABEL[tt.lv] || tt.lv)}${parent ? ` · ${terrLink(parent.id, parent.n)}` : ""} · ${members.size} municipios</div>
    <div class="ids">${tt.q ? `<a href="https://www.wikidata.org/wiki/${esc(tt.q)}" target="_blank" rel="noopener">Wikidata</a>` : ""}
      ${tt.w ? `<a href="https://es.wikipedia.org/wiki/${encodeURIComponent(tt.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia</a>` : ""}</div>
    <div class="h3">Gentilicios</div>
    ${dems.length ? sections(dems, f => f.l, fs => fs.map(block).join(""))
      : sameName ? `<p class="empty">Ver ${terrLink(parent.id, parent.n)}: la provincia y la comunidad son la misma.</p>` : `<p class="empty">Ninguna fuente consultada da todavía un gentilicio.</p>`}
    ${nicks.length ? `<div class="h3">Apodos</div>${sections(nicks, f => f.l, fs => fs.map(block).join(""))}` : ""}
    <div class="h3">Etimología del nombre</div>
    ${ety.length ? sections(ety, c => c.l, cs => cs.map(c => `<div class="form" style="padding:0">${claimHTML(c)}</div>`).join("")) : `<p class="empty">Sin etimología recogida todavía.</p>`}
  </div>`;
  bindTerrLinks(body);
  document.getElementById("panel").scrollTop = 0;
}
function bindTerrLinks(root) {
  root.querySelectorAll("a.terr[data-terr]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openTerritory(a.dataset.terr); }));
}

const IMG_KIND = { coat_of_arms: "Escudo", flag: "Bandera", image: "Imagen" };
const SRC_NAME_CTX = { ine_padron: "INE, padrón", ine_hecho_1900: "INE, censos", wikidata: "Wikidata", gisco_lau: "Eurostat GISCO" };
function srcLink(ctx, field, label) {
  const s = ctx && ctx.src && ctx.src[field];
  return s ? ` <a class="srcl" href="${esc(s.u)}" target="_blank" rel="noopener" title="Fuente: ${esc(SRC_NAME_CTX[s.s] || s.s)}, consultado ${esc(s.r)}">${esc(label || SRC_NAME_CTX[s.s] || s.s)}</a>` : "";
}
function contextHTML(m, ctx) {
  if (!ctx) return "";
  const nf = n => Number(n).toLocaleString("es-ES");
  const facts = [];
  if (ctx.pop != null) facts.push(`<b>${nf(ctx.pop)}</b> hab. (${esc(ctx.py)})${srcLink(ctx, "population", "INE")}`);
  if (ctx.ph != null) facts.push(`${nf(ctx.ph)} en ${esc(ctx.phy)}${srcLink(ctx, "population_hist", "INE")}`);
  if (ctx.alt) facts.push(`${nf(ctx.alt)} m${srcLink(ctx, "altitude_m", "Wikidata")}`);
  if (ctx.area) facts.push(`${nf(Math.round(Number(ctx.area) * 10) / 10)} km²`);
  const coat = ctx.img.find(i => i.k === "coat_of_arms"), photo = ctx.img.find(i => i.k === "image");
  const credit = i => `${IMG_KIND[i.k]}: <a href="${esc(i.u)}" target="_blank" rel="noopener">${esc(i.a || "Wikimedia Commons")}</a>${i.lc ? `, <a href="${esc(i.lu)}" target="_blank" rel="noopener">${esc(i.lc)}</a>` : ""}`;
  const names = ctx.names.filter(n => n[0] && (n[0] !== m.n || n[2] || n[3]));
  const langName = l => LANG_NAME[l] || l;
  return `
    ${photo ? `<figure class="ctx-photo"><img src="${esc(photo.t)}" alt="${esc(m.n)}" loading="lazy"></figure>` : ""}
    <div class="ctx-head">${coat ? `<img class="ctx-coat" src="${esc(coat.t)}" alt="Escudo de ${esc(m.n)}" loading="lazy">` : ""}
      <div class="ctx-facts">${facts.join(" · ")}
        ${ctx.com.length ? `<div>Comarca: ${ctx.com.map(esc).join(", ")}</div>` : ""}
        ${ctx.pat.length ? `<div>Patrón: ${ctx.pat.map(esc).join(", ")}</div>` : ""}
        ${names.length ? `<div>Nombres oficiales: ${names.map(n => `${esc(n[0])}${n[1] ? ` <span class="badge lang" title="${esc(langName(n[1]))}">${esc(n[1])}</span>` : ""}${n[2] || n[3] ? ` <span class="ss">(${esc(n[2] || "…")}–${esc(n[3] || "hoy")})</span>` : ""}`).join(" · ")}</div>` : ""}
      </div></div>
    ${[photo, coat].filter(Boolean).length ? `<div class="ctx-credit">${[photo, coat].filter(Boolean).map(credit).join(" · ")}</div>` : ""}`;
}

function loadClaims(pc) {
  if (!PROV_LOADED.has(pc)) {
    PROV_LOADED.set(pc, fetch(`gentilicios/data/claims/${pc}.json?v=${V}`).then(r => r.ok ? r.json() : []).then(list => {
      for (const c of list) {
        if (!CLAIMS_BY.has(c.e)) CLAIMS_BY.set(c.e, []);
        CLAIMS_BY.get(c.e).push(c);
      }
    }));
  }
  return PROV_LOADED.get(pc);
}

function claimHTML(c) {
  let loc = "";
  try { const o = JSON.parse(c.lc || "{}"); loc = Object.entries(o).filter(([k]) => k !== "revid").map(([k, v]) => `${k} ${v}`).join(" · "); } catch (e) {}
  let cites = "";
  try {
    const ci = JSON.parse(c.ci || "[]");
    if (ci.length) cites = "cita: " + ci.map(x => typeof x === "string" ? x : Object.entries(x).map(([k, v]) => `${k}=${v}`).join(" ")).join("; ");
  } catch (e) {}
  let notes = "";
  try { const pn = JSON.parse(c.pn || "[]"); if (pn.length) notes = pn.map(x => typeof x === "string" ? x : JSON.stringify(x)).join("; "); } catch (e) {}
  const kind = c.hk ? `<span class="badge kind">${esc(KIND_LABEL[c.hk] || c.hk)}</span> ` : "";
  const level = c.lv === "transcribed" ? "transcrito de un escaneo" : c.lv === "deduced" ? "deducido por nosotros" : "";
  const human = [loc.replace(/^(page|volume|vol|pdf_page|printed_page) /, m => ({ "page ": "pág. ", "volume ": "tomo ", "vol ": "tomo ", "pdf_page ": "pág. PDF ", "printed_page ": "pág. " })[m] || m), "consultado " + c.r, level].filter(Boolean);
  const tech = [MATCH_LABEL[c.mr] || c.mr, cites, notes].filter(Boolean);
  return `<div class="claim">
    <div class="src">${kind}<a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(srcName(c.s))}</a>${c.l ? ` <span class="badge lang" title="${esc(LANG_NAME[c.l] || c.l)}">${esc(c.l)}</span>` : ""}</div>
    <blockquote>${esc(c.q)}</blockquote>
    <div class="meta">${human.map(esc).join(" · ")}${tech.length ? ` <details class="tech"><summary>cómo se leyó</summary>${tech.map(esc).join("<br>")}</details>` : ""}</div>
  </div>`;
}

async function select(id, fly) {
  const m = BY_ID.get(id);
  if (!m) return;
  selected = id; restyle();
  history.replaceState(null, "", "#" + id);
  if (fly && layersById.get(id)) {
    // a hidden page (background tab) cannot animate; flying there leaves the map at NaN
    const b = layersById.get(id).getBounds();
    try { document.hidden ? map.fitBounds(b, { maxZoom: 11 }) : map.flyToBounds(b, { maxZoom: 11, duration: .6 }); }
    catch (e) { map.invalidateSize(); map.fitBounds(b, { maxZoom: 11 }); }
  }
  map.closePopup();
  openPanel();
  document.body.classList.add("has-ficha");
  const body = document.getElementById("panel-body");
  body.innerHTML = `<div class="ficha"><h2>${esc(m.n)}</h2><div class="where">${esc(m.p)} · ${esc(m.c)}</div><p class="empty">cargando fuentes…</p></div>`;
  document.getElementById("panel").scrollTop = 0;
  await Promise.all([loadClaims(m.pc), loadContext(m.pc)]);
  if (selected !== id) return;
  const cl = (CLAIMS_BY.get(id) || []).concat(...(m.pd || []).map(s => CLAIMS_BY.get(s.id) || []));
  const byForm = new Map();
  for (const c of cl) if (c.e === id && ["demonym", "demonym_nickname", "demonym_dictionary"].includes(c.fd)) {
    const k = (c.fd === "demonym_nickname" ? "nick|" : "dem|") + c.v;
    if (!byForm.has(k)) byForm.set(k, []);
    byForm.get(k).push(c);
  }
  const formBlock = f => {
    const key = (f.k === "nick" ? "nick|" : "dem|") + f.m;
    let cs = byForm.get(key) || [];
    if (f.f) cs = cs.concat(byForm.get((f.k === "nick" ? "nick|" : "dem|") + f.f) || []);
    return `<details class="form"><summary>
      <span class="fm">${esc(f.m)}</span>${f.f && f.f !== f.m ? `<span class="ff">${esc(f.f)}</span>` : ""}
      ${f.l.map(l => `<span class="badge lang">${esc(LANG_LABEL[l] || l)}</span>`).join("")}
      ${f.pr ? `<span class="badge prin" title="Forma principal: la de la fuente con más autoridad (DLE, FundéuRAE, listas oficiales de las academias, luego Wikipedia y Wikidata); en empate, la que dan más fuentes">principal</span>` : ""}
      ${f.cu ? `<span class="badge cur" title="Calculado: no comparte comienzo ni sílabas con ningún nombre del municipio">curioso</span>` : ""}
      ${f.go === "nombre_antiguo" || f.go === "otra_lengua" ? `<span class="badge orig" title="Deducido por nosotros: el gentilicio comparte raíz con ese nombre, que da la fuente indicada">← ${esc((f.ge || "").replace(/ \(([^)]*)\)$/, ""))}</span>` : ""}
      <span class="badge nsrc" title="Fuentes distintas">${f.n} ${f.n === 1 ? "fuente" : "fuentes"}</span>
    </summary>${cs.map(claimHTML).join("")}</details>`;
  };
  const dems = m.g.filter(f => f.k === "dem"), nicks = m.g.filter(f => f.k === "nick");
  const other = fds => cl.filter(c => c.e === id && fds.includes(c.fd));
  const ety = other(["name_etymology", "name_origin_legend", "demonym_etymology"]);
  // history in a fixed order: old names, then changes of the municipality, then the gazetteers by date
  const HIST_ORDER = ["name_historical_form", "municipal_alteration", "demonym_first_attestation", "historical_description"];
  const SRC_YEAR = { felipe2_ciudadreal: 1575, felipe2_cuenca: 1575, felipe2_toledo: 1575, felipe2_guadalajara: 1575, felipe2_madrid: 1575,
    rah1802: 1802, minano: 1826, madoz: 1845, rah1846: 1846, ine_alteraciones: 1842 };
  const hist = other(HIST_ORDER).sort((a, b) => HIST_ORDER.indexOf(a.fd) - HIST_ORDER.indexOf(b.fd) || (SRC_YEAR[a.s] || 9999) - (SRC_YEAR[b.s] || 9999));
  // one section per language group, in order; foreign languages folded
  const langSections = (items, langsOf, render) => {
    const g = byGroup(items, langsOf);
    return ["es", "co", "fx"].filter(k => g[k].length).map(k => {
      const inner = render(g[k]);
      if (k === "fx") return `<details class="lg fx"><summary>${GROUP_TITLE[k]} (${g[k].length})</summary>${inner}</details>`;
      // Spanish goes first without a title (it is understood); the other groups keep theirs
      return k === "es" ? `<div class="lg es">${inner}</div>` : `<div class="lg ${k}"><div class="lgt">${GROUP_TITLE[k]}</div>${inner}</div>`;
    }).join("");
  };
  const grouped = list => {
    const g = new Map();
    for (const c of list) { if (!g.has(c.fd)) g.set(c.fd, []); g.get(c.fd).push(c); }
    const multi = g.size > 1;
    return [...g].map(([fd, cs]) => `${multi ? `<div class="h4">${esc(FIELD_LABEL[fd] || fd)}</div>` : ""}${cs.map(c => `<div class="form" style="padding:0">${claimHTML(c)}</div>`).join("")}`).join("");
  };
  body.innerHTML = `<div class="ficha">
    <h2>${esc(m.n)}</h2>
    <div class="where">${m.p === m.c && ccaaIdOf(m) ? terrLink(ccaaIdOf(m), m.c) : terrLink(provId(m), m.p) + (m.p === m.c ? "" : " · " + (ccaaIdOf(m) ? terrLink(ccaaIdOf(m), m.c) : esc(m.c)))}${(MUNI_TERR[id] || []).map(t => TERR.get(t) ? " · " + terrLink(t, TERR.get(t).n) : "").join("")}</div>
    ${contextHTML(m, CTX.get(id))}
    <div class="ids"><span>INE ${esc(m.id.slice(4))}</span>
      ${m.q ? `<a href="https://www.wikidata.org/wiki/${esc(m.q)}" target="_blank" rel="noopener">Wikidata</a>` : ""}
      ${m.w ? `<a href="https://es.wikipedia.org/wiki/${encodeURIComponent(m.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia</a>` : ""}
      ${CTX.get(id) && CTX.get(id).web ? `<a href="${esc(CTX.get(id).web)}" target="_blank" rel="noopener">Ayuntamiento</a>` : ""}
    </div>
    <div class="h3">Gentilicios</div>
    ${dems.length ? langSections(dems, f => f.l, fs => fs.slice().sort((a, b) => (b.pr ? 1 : 0) - (a.pr ? 1 : 0)).map(formBlock).join("")) : `<p class="empty">Ninguna fuente consultada da todavía un gentilicio.</p>`}
    ${nicks.length ? `<div class="h3">Apodos</div><p class="note">Lo dice la fuente: coloquial, malnom, apodo.</p>${langSections(nicks, f => f.l, fs => fs.map(formBlock).join(""))}` : ""}
    ${(m.pd || []).length ? `<div class="h3">Pedanías y núcleos con gentilicio (${m.pd.length})</div>
      ${m.pd.map(s => {
        const sc = cl.filter(c => c.e === s.id);
        return `<details class="form"><summary><span class="sub-n">${esc(s.n)}</span>
          ${s.g.filter(g => g.k === "dem").map(g => `<span class="ff">${esc(g.m)}</span>${g.l.length && !g.l.includes("es") ? `<span class="badge lang">${esc(g.l.join(" "))}</span>` : ""}`).join(" ")}
          ${s.g.filter(g => g.k === "nick").length ? `<span class="badge">apodo: ${esc(s.g.filter(g => g.k === "nick").map(g => g.m).join(", "))}</span>` : ""}
        </summary>${sc.map(claimHTML).join("")}</details>`;
      }).join("")}` : ""}
    <div class="h3">Etimología del nombre</div>
    ${ety.length ? `<p class="note warn">Citas literales de cada fuente. La separación en hipótesis la hace un programa y a veces junta dos o parte una: en revisión.</p>${langSections(ety, c => c.l, grouped)}` : `<p class="empty">Sin etimología recogida todavía.</p>`}
    <div class="h3">Historia</div>
    ${hist.length ? langSections(hist, c => c.l, grouped) : `<p class="empty">Sin datos históricos todavía.</p>`}
    <p class="note">Pulsa una forma para ver qué dice cada fuente, con la cita literal y el enlace.</p>
  </div>`;
  bindTerrLinks(body);
  if (terrLayer) { map.removeLayer(terrLayer); terrLayer = null; }
  document.getElementById("panel").scrollTop = 0;
  if (dems.length === 1) { const d = body.querySelector("details.form"); if (d) d.open = true; }
}

function fromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (BY_ID.has(id)) select(id, true);
  else if (/^(prov|ccaa|comarca|isla):/.test(id)) {
    const go = (n = 0) => TERR.has(id) ? openTerritory(id) : n < 30 && setTimeout(() => go(n + 1), 200);
    go();
  }
}
window.addEventListener("hashchange", fromHash);
document.getElementById("detail-close").addEventListener("click", closeFicha);
document.getElementById("about-btn").addEventListener("click", () => {
  if (document.body.classList.contains("detail-open") && !selected) { document.body.classList.remove("detail-open"); return; }
  intro(); openPanel(); document.getElementById("panel").scrollTop = 0;
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("detail-open")) closeFicha(); });
document.querySelector(".brand").addEventListener("click", e => {
  e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload();
});

// ---------- search ----------
function initSearch() {
  const input = document.getElementById("filter"), box = document.getElementById("suggest");
  const index = MUNIS.map(m => ({ m, name: fold(m.n), prov: fold(m.p), forms: m.g.map(f => fold(f.m) + " " + fold(f.f)).join(" ") }));
  let hits = [], on = 0;
  const hl = (text, q) => {
    const i = fold(text).indexOf(q);
    return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  };
  const render = () => {
    const q = fold(input.value.trim());
    if (q.length < 2) { box.hidden = true; if (!document.getElementById("table-view").hidden) renderTable(); return; }
    const score = x => x.name === q ? 0 : x.name.startsWith(q) ? 1 : x.forms.split(" ").some(w => w.startsWith(q)) ? 2 : x.name.includes(q) ? 3 : x.forms.includes(q) ? 4 : x.prov.startsWith(q) ? 5 : 9;
    hits = index.map(x => [score(x), x]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || a[1].m.n.localeCompare(b[1].m.n, "es")).slice(0, 30).map(([, x]) => x.m);
    on = 0;
    box.innerHTML = hits.length ? hits.map((m, i) => {
      const f = m.g.find(f => fold(f.m).includes(q) || fold(f.f).includes(q));
      return `<div class="sug${i === 0 ? " on" : ""}" data-id="${m.id}"><div class="sn">${hl(m.n, q)}</div>
        <div class="ss">${f ? `<i>${hl(f.m, q)}</i> · ` : (mainForms(m) ? `<i>${esc(mainForms(m))}</i> · ` : "")}${esc(m.p)}</div></div>`;
    }).join("") : `<div class="sug ss">Nada con «${esc(input.value)}»</div>`;
    box.hidden = false;
    box.querySelectorAll(".sug[data-id]").forEach(el => el.addEventListener("mousedown", e => { e.preventDefault(); choose(el.dataset.id); }));
    if (!document.getElementById("table-view").hidden) renderTable();
  };
  const choose = id => { box.hidden = true; input.blur(); showView("map"); select(id, true); };
  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => setTimeout(() => box.hidden = true, 150));
  input.addEventListener("keydown", e => {
    const els = [...box.querySelectorAll(".sug[data-id]")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); on = (on + (e.key === "ArrowDown" ? 1 : els.length - 1)) % Math.max(els.length, 1);
      els.forEach((el, i) => el.classList.toggle("on", i === on));
    } else if (e.key === "Enter" && els[on]) { choose(els[on].dataset.id); }
    else if (e.key === "Escape") { input.value = ""; box.hidden = true; if (!document.getElementById("table-view").hidden) renderTable(); }
  });
}

// ---------- table ----------
let sortKey = "n", sortDir = 1, shown = 300;
function showView(v) {
  document.getElementById("v-map").classList.toggle("active", v === "map");
  document.getElementById("v-table").classList.toggle("active", v === "table");
  document.getElementById("table-view").hidden = v !== "table";
  document.getElementById("colour-modes").style.visibility = v === "map" ? "" : "hidden";
  if (v === "table") { shown = 300; renderTable(); } else map.invalidateSize();
}
function initTable() {
  document.getElementById("v-map").addEventListener("click", () => showView("map"));
  document.getElementById("v-table").addEventListener("click", () => showView("table"));
  const sel = document.getElementById("t-ccaa");
  [...new Set(MUNIS.map(m => m.c))].sort((a, b) => a.localeCompare(b, "es")).forEach(c => sel.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
  ["t-curious", "t-empty", "t-ccaa"].forEach(id => document.getElementById(id).addEventListener("change", () => { shown = 300; renderTable(); }));
  document.querySelectorAll("#table th").forEach(th => th.addEventListener("click", () => {
    sortDir = sortKey === th.dataset.k ? -sortDir : (["ns", "ety", "cu", "pop"].includes(th.dataset.k) ? -1 : 1);
    sortKey = th.dataset.k; renderTable();
  }));
  document.getElementById("t-more").addEventListener("click", () => { shown += 500; renderTable(); });
}
function renderTable() {
  const q = fold(document.getElementById("filter").value.trim());
  const onlyCur = document.getElementById("t-curious").checked, onlyEmpty = document.getElementById("t-empty").checked;
  const ccaa = document.getElementById("t-ccaa").value;
  let rows = MUNIS.filter(m => (!onlyCur || m.cu) && (!onlyEmpty || !m.g.some(f => f.k === "dem")) && (!ccaa || m.c === ccaa) &&
    (q.length < 2 || fold(m.n).includes(q) || fold(m.p).includes(q) || m.g.some(f => fold(f.m).includes(q))));
  const val = m => ({ n: m.n, p: m.p, c: m.c, g: mainForms(m, 9), nick: m.g.filter(f => f.k === "nick").length, pop: m.pop || 0, ns: m.ns, cu: m.cu ? 1 : 0, ety: m.ety }[sortKey]);
  rows.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "es")) * sortDir || a.n.localeCompare(b.n, "es"); });
  document.getElementById("t-count").textContent = `${fmt(rows.length)} municipios`;
  document.querySelectorAll("#table th").forEach(th => th.classList.toggle("sorted", th.dataset.k === sortKey));
  document.querySelector("#table tbody").innerHTML = rows.slice(0, shown).map(m => {
    // Spanish forms first, then the other languages of Spain; foreign forms stay in the ficha only
    const dem = m.g.filter(f => f.k === "dem" && langGroup(f.l) !== "fx").sort((a, b) => (langGroup(a.l) !== "es") - (langGroup(b.l) !== "es") || (b.pr ? 1 : 0) - (a.pr ? 1 : 0));
    return `<tr data-id="${m.id}"><td>${esc(m.n)}</td><td>${esc(m.p)}</td><td>${esc(m.c)}</td>
      <td class="g">${dem.map(f => `<span class="${f.cu ? "cu" : ""}">${esc(f.m)}</span>${langGroup(f.l) === "co" ? ` <span class="badge lang">${esc(f.l.filter(l => CO_OFFICIAL.has(l)).join(" "))}</span>` : ""}`).join(", ") || '<span class="muted">·</span>'}</td>
      <td class="g">${esc(m.g.filter(f => f.k === "nick").map(f => f.m).join(", "))}</td>
      <td class="num">${m.pop != null ? Number(m.pop).toLocaleString("es-ES") : ""}</td><td class="num">${m.ns || ""}</td><td class="cu">${m.cu ? "✦" : ""}</td><td class="num">${m.ety || ""}</td></tr>`;
  }).join("");
  document.querySelectorAll("#table tbody tr").forEach(tr => tr.addEventListener("click", () => { showView("map"); select(tr.dataset.id, true); }));
  document.getElementById("t-more").hidden = rows.length <= shown;
}

// ---------- route between two towns ----------
// The graph joins municipalities that share a border (a walk across municipal terms, not roads).
// "menos pueblos": breadth-first search, every border costs 1. "menos km": A* with the straight-line distance
// between polygon centroids as edge cost and as the (admissible) heuristic. Both visit each town at most once:
// milliseconds for all of Spain, where trying every path would grow exponentially.
let GRAPH = null, routeLayer = null;
const routeState = { from: null, to: null };

function haversine(a, b) {
  const R = 6371, r = Math.PI / 180;
  const h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

class MinHeap {
  constructor() { this.a = []; }
  push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
      if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r;
      if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } }
    return top;
  }
  get size() { return this.a.length; }
}

function shortestPath(src, dst, byKm) {
  const n = GRAPH.ids.length, prev = new Int32Array(n).fill(-1), seen = new Uint8Array(n);
  let visited = 0;
  if (!byKm) {
    const q = [src]; seen[src] = 1;
    for (let qi = 0; qi < q.length; qi++) {
      const u = q[qi]; visited++;
      if (u === dst) break;
      for (const [v] of GRAPH.adj[u]) if (!seen[v]) { seen[v] = 1; prev[v] = u; q.push(v); }
    }
  } else {
    const g = new Float64Array(n).fill(Infinity), C = GRAPH.c, heap = new MinHeap();
    g[src] = 0; heap.push([C[src] && C[dst] ? haversine(C[src], C[dst]) : 0, src]);
    while (heap.size) {
      const [, u] = heap.pop();
      if (seen[u]) continue;
      seen[u] = 1; visited++;
      if (u === dst) break;
      for (const [v, d] of GRAPH.adj[u]) {
        const ng = g[u] + d;
        if (ng < g[v]) { g[v] = ng; prev[v] = u; heap.push([ng + (C[v] && C[dst] ? haversine(C[v], C[dst]) : 0), v]); }
      }
    }
  }
  if (src !== dst && prev[dst] === -1) return { path: null, visited };
  const path = [];
  for (let u = dst; u !== -1; u = prev[u]) { path.push(u); if (u === src) break; }
  return { path: path.reverse(), visited };
}

function initRoute() {
  const btn = document.getElementById("route-btn"), box = document.getElementById("route-box");
  btn.hidden = false;
  btn.addEventListener("click", () => { box.hidden = !box.hidden; if (!box.hidden) document.getElementById("r-from").focus(); });
  document.getElementById("r-close").addEventListener("click", () => { box.hidden = true; clearRoute(); });
  const index = MUNIS.map(m => ({ m, name: fold(m.n) }));
  for (const [inputId, key] of [["r-from", "from"], ["r-to", "to"]]) {
    const input = document.getElementById(inputId), sug = input.nextElementSibling;
    input.addEventListener("input", () => {
      const q = fold(input.value.trim());
      routeState[key] = null;
      if (q.length < 2) { sug.hidden = true; return; }
      const hits = index.filter(x => x.name.includes(q)).sort((a, b) => (b.name.startsWith(q)) - (a.name.startsWith(q)) || a.m.n.localeCompare(b.m.n, "es")).slice(0, 12);
      sug.innerHTML = hits.map(x => `<div class="sug" data-id="${x.m.id}"><span class="sn">${esc(x.m.n)}</span> <span class="ss">${esc(x.m.p)}</span></div>`).join("") || `<div class="sug ss">nada</div>`;
      sug.hidden = false;
      sug.querySelectorAll(".sug[data-id]").forEach(el => el.addEventListener("mousedown", e => {
        e.preventDefault(); routeState[key] = el.dataset.id; input.value = BY_ID.get(el.dataset.id).n; sug.hidden = true; runRoute();
      }));
    });
    input.addEventListener("blur", () => setTimeout(() => sug.hidden = true, 150));
  }
  document.querySelectorAll('input[name="r-mode"]').forEach(r => r.addEventListener("change", runRoute));
}

function clearRoute() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  document.getElementById("r-result").innerHTML = "";
}

function runRoute() {
  if (!routeState.from || !routeState.to) return;
  const idx = new Map(GRAPH.ids.map((e, i) => [e, i]));
  const byKm = document.querySelector('input[name="r-mode"]:checked').value === "km";
  const t0 = performance.now();
  const { path, visited } = shortestPath(idx.get(routeState.from), idx.get(routeState.to), byKm);
  const ms = performance.now() - t0;
  clearRoute();
  const res = document.getElementById("r-result");
  if (!path) { res.innerHTML = `<p class="empty">No hay camino por tierra (¿una isla?).</p>`; return; }
  let km = 0;
  for (let i = 1; i < path.length; i++) km += haversine(GRAPH.c[path[i - 1]], GRAPH.c[path[i]]);
  routeLayer = L.layerGroup().addTo(map);
  for (const i of path) {
    const l = layersById.get(GRAPH.ids[i]);
    if (l) L.geoJSON(l.feature, { style: { color: "#b6465f", weight: 1.5, fillColor: "#b6465f", fillOpacity: .35 }, interactive: false }).addTo(routeLayer);
  }
  L.polyline(path.map(i => GRAPH.c[i]), { color: "#241a12", weight: 3, dashArray: "6 5" }).addTo(routeLayer);
  map.fitBounds(L.polyline(path.map(i => GRAPH.c[i])).getBounds(), { padding: [30, 30] });
  const towns = path.map(i => BY_ID.get(GRAPH.ids[i]));
  res.innerHTML = `<div class="rb-sum"><b>${towns.length - 2 < 0 ? 0 : towns.length - 2}</b> pueblos por medio · ${towns.length - 1} fronteras · ${Math.round(km)} km en línea entre centros
    <span class="ss">(${visited} pueblos explorados en ${ms < 1 ? "<1" : Math.round(ms)} ms)</span></div>
    <ol class="rb-list">${towns.map(m => `<li data-id="${m.id}"><span class="sn">${esc(m.n)}</span> <i>${esc(m.pe || "")}</i> <span class="ss">${esc(m.p)}</span></li>`).join("")}</ol>`;
  res.querySelectorAll("li[data-id]").forEach(li => li.addEventListener("click", () => isMobile() ? showPopup(li.dataset.id) : select(li.dataset.id, false)));
}

fetch("gentilicios/data/build.json", { cache: "no-store" }).then(r => r.json()).then(b =>
  fetch(`gentilicios/data/graph.json?v=${b.v}`)).then(r => r.ok ? r.json() : null).then(g => {
  if (!g) return;
  GRAPH = g;
  const wait = () => (MUNIS.length && map) ? initRoute() : setTimeout(wait, 200);
  wait();
}).catch(() => {});
