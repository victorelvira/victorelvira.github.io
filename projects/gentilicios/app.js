"use strict";
const DATA_V = "0.7.0";
const BUILD_AT = "2026-10-04 00:16";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;
applyStatic();   // the static texts of the page, in the language the reader is in (i18n.js decides it)

// ---------- vocabulary ----------
// Source names as the sources themselves write them: never translated. The few whose name carries a description of
// ours (a Wikipedia in another language, an annex, a Wikidata property, an INE table) live in i18n.js under "src.<id>".
const SRC_SHORT = {
  wikidata: "Wikidata", eswiki: "Wikipedia",
  cawiki_balears: "Viquipèdia", glwiki_xentilicios: "Galipedia", eswiktionary: "Wikcionario",
  avl_municipis: "Acadèmia Valenciana de la Llengua", parlament_cat_guia: "Parlament de Catalunya",
  euskaltzaindia_arauak: "Euskaltzaindia", acl_catalogo: "Academia Canaria de la Lengua",
  rag_lexico_admin: "Real Academia Galega", fundeurae: "FundéuRAE", rae_dle: "DLE · RAE",
  madoz: "Madoz (1845-1850)", felipe2_ciudadreal: "Relaciones de Felipe II", felipe2_cuenca: "Relaciones de Felipe II",
  felipe2_toledo: "Relaciones de Felipe II", felipe2_guadalajara: "Relaciones de Felipe II",
  cawiki: "Viquipèdia", glwiki: "Galipedia",
  minano: "Miñano (1826-1829)", rah1802: "Real Academia de la Historia (1802)", rah1846: "Govantes, RAH (1846)",
  felipe2_madrid: "Relaciones de Felipe II", eswiki_historia: "Wikipedia",
};
// the language badge is a code (es, ca, gl...), the same in every language
const LANG_LABEL = { es: "es", ca: "ca", gl: "gl", eu: "eu", ast: "ast", an: "an", oc: "oc" };
const srcName = s => TX("src." + s) || SRC_SHORT[s] || (SOURCES[s] && SOURCES[s].name) || s;
const fieldLabel = fd => TX("field." + fd) || fd;
const kindLabel = k => TX("kind." + k) || k;
const matchLabel = r => TX("match." + r) || r;
const langName = l => TX("lang." + l) || l;
const levelLabel = lv => TX("level." + lv) || lv;
const imgKind = k => TX("img." + k) || k;
const nsrc = n => T(n === 1 ? "nsrc.one" : "nsrc.many", { n });

// Language groups, always in this order (Víctor, 2026-09-17): Spanish, the other languages of Spain, foreign.
const CO_OFFICIAL = new Set(["ca", "gl", "eu", "ast", "an", "oc", "val", "ext"]);
const groupTitle = k => T("grp." + k);
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
const fmt = n => Number(n).toLocaleString(T("locale"));
// the reader's language decides the collation of the lists, as it decides the number format
const coll = (a, b) => String(a).localeCompare(String(b), T("locale"));

let MUNIS = [], BY_ID = new Map(), SOURCES = {}, V = DATA_V;
const CLAIMS_BY = new Map(), PROV_LOADED = new Map();
const HOVER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const isMobile = () => window.matchMedia("(max-width: 760px)").matches;
let VIEW = "map", mode = "ng", selected = null, layer = null, map = null;
const layersById = new Map();

// ---------- colours ----------
// categorical palettes: warm for suffixes, earthy for origins; "otro"/empty in paper grey
const SX_COL = { "-ense": "#7a4a2b", "-eño": "#c9905a", "-ano": "#2e6b6b", "-ero": "#8fb8b0", "-ino": "#7b3fb0",
  "-és": "#b6465f", "-(i)ego": "#d9a441", "-ejo": "#5b7f3a", otro: "#b8ada0", "": "#ebe5da" };
const SX_ORDER = ["-ense", "-eño", "-ano", "-ero", "-ino", "-és", "-(i)ego", "-ejo", "otro", ""];
const OL_COL = { latin: "#8a4f2a", arabic: "#2e6b6b", basque: "#b6465f", prerroman: "#7b3fb0", celtic: "#5b7f3a",
  germanic: "#d9a441", romance: "#c9905a", disputed: "#6f665c", unknown: "#b8ada0", "": "#ebe5da" };
const olLabel = k => T("ol." + (k || "none"));
const GA_COL = { nombre_antiguo: "#7b3fb0", otra_lengua: "#2e6b6b", sin_relacion: "#b6465f", nombre_actual: "#e6c89c", "": "#ebe5da" };
const gaLabel = k => T("ga." + (k || "none"));
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
const kindWord = k => T("kindword." + k);
// 0 (none) in paper grey, then 1, 2, 3, 4, 5+ clearly darker step by step (Víctor, 2026-09-17)
const SCALE_NG = ["#ebe5da", "#9cc3bb", "#5f9c91", "#2e6b6b", "#1b4747", "#0b2626"];
const SCALE_SRC = ["#ebe5da", "#d9ae78", "#b97c43", "#8a4f2a", "#5e3219", "#321a0c"];
function colourOf(m) {
  if (VIEW === "pop") return popColour(m);
  if (mode === "ga") return GA_COL[m.ga || ""];
  if (mode === "sx") return SX_COL[SX_COL[m.sx] ? m.sx : "otro"] || "#ebe5da";
  if (mode === "ol") return OL_COL[m.ol] || OL_COL[""];
  if (mode === "sources") return SCALE_SRC[Math.min(principalSources(m), 5)];
  if (mode === "ng") return SCALE_NG[Math.min(spanishCount(m), 5)];
  if (mode === "curious") return m.cu ? "#7b3fb0" : (m.g.length ? "#e7e0d4" : "#f3efe8");
  if (mode === "ety") return m.ety && m.hist ? "#1f4f4f" : m.ety ? "#2e6b6b" : m.hist ? "#8fb8b0" : "#ebe5da";
}
// 4 map groups, each with its variants chosen in the legend (Víctor, 2026-09-17: 7 buttons were too many)
// each variant's name is i18n key "variant.<k>" and its one-line note "vnote.<k>"
const GROUPS = { formas: ["ng"], forma: ["sx", "curious"], origen: ["ol", "ga"], doc: ["sources", "ety"] };
let group = "formas";
function legend() {
  if (VIEW === "pop") return popLegend();
  const count = f => fmt(MUNIS.filter(f).length);
  const rows = {
    sources: [[T("legend.src." + KINDS), null],
      ...[5, 4, 3, 2, 1].map(n => [SCALE_SRC[n], n === 5 ? T("legend.5plus") : String(n), m => Math.min(principalSources(m), 5) === n]),
      ["#ebe5da", T("legend.none." + KINDS), m => principalSources(m) === 0]],
    ng: [[T("legend.ng.title", { what: kindWord(KINDS) }), null],
      ...[5, 4, 3, 2, 1].map(n => [SCALE_NG[n], n === 5 ? T("legend.5plus") : String(n), m => Math.min(spanishCount(m), 5) === n]),
      ["#ebe5da", T("legend.none0"), m => spanishCount(m) === 0]],
    curious: [[T("legend.cur.title"), null],
      ["#7b3fb0", T("legend.cur.yes"), m => m.cu], ["#e7e0d4", T("legend.cur.no"), m => !m.cu && m.g.length],
      ["#f3efe8", T("legend.cur.nodem"), m => !m.g.length]],
    sx: [[T("legend.sx.title"), null]].concat(SX_ORDER.map(k => [SX_COL[k], k === "" ? T("legend.sx.none") : k === "otro" ? T("legend.sx.other") : k,
      mm => (SX_COL[mm.sx] ? mm.sx : "otro") === k && (k !== "otro" || mm.sx)])),
    ga: [[T("legend.ga.title"), null]].concat(Object.keys(GA_COL).map(k => [GA_COL[k], gaLabel(k), mm => (mm.ga || "") === k])),
    ol: [[T("legend.ol.title"), null]].concat(Object.keys(OL_COL).map(k => [OL_COL[k], olLabel(k), mm => (mm.ol || "") === k])),
    ety: [[T("legend.ety.title"), null],
      ["#1f4f4f", T("legend.ety.both"), m => m.ety && m.hist], ["#2e6b6b", T("legend.ety.ety"), m => m.ety && !m.hist],
      ["#8fb8b0", T("legend.ety.hist"), m => m.hist && !m.ety], ["#ebe5da", T("legend.ety.none"), m => !m.ety && !m.hist]],
  }[mode];
  document.getElementById("legend").innerHTML = rows.map(([c, l, f]) => f
    ? `<div class="lr"><span class="sw" style="background:${c}"></span>${l}<span class="ln">${count(f)}</span></div>`
    : `<div class="lt">${c}</div>`).join("") +
    `<div class="note">${esc(T("vnote." + mode))}</div>` +
    (GROUPS[group].length > 1 ? `<div class="kinds" role="group" aria-label="${esc(T("legend.aria.variant"))}">${GROUPS[group].map(k =>
      `<button type="button" data-variant="${k}" class="${mode === k ? "active" : ""}">${esc(T("variant." + k))}</button>`).join("")}</div>` : "") +
    (mode === "ng" || mode === "sources" ? `<div class="kinds" role="group" aria-label="${esc(T("legend.aria.kinds"))}">${["dem", "nick", "both"].map(k =>
      `<button type="button" data-kinds="${k}" class="${KINDS === k ? "active" : ""}">${esc(T("kinds." + k))}</button>`).join("")}</div>` : "");
  document.querySelectorAll("#legend [data-variant]").forEach(b => b.addEventListener("click", () => { mode = b.dataset.variant; restyle(); }));
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
    T("stats.bar", { munis: fmt(MUNIS.length), withg: fmt(withG), forms: fmt(forms) });
}

// the credit line carries two words of ours ("límites", "municipios"), so it is rewritten on a language change
let ATTRIB = null;
function setAttrib() {
  if (!map) return;
  if (ATTRIB) map.attributionControl.removeAttribution(ATTRIB);
  ATTRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · ' + esc(T("map.attrib"));
  map.attributionControl.addAttribution(ATTRIB);
}
function initMap(geo) {
  map = L.map("map", { preferCanvas: true, zoomControl: true, minZoom: 4 }).setView([40.2, -3.6], 6);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, opacity: .5 }).addTo(map);
  setAttrib();
  layer = L.geoJSON(geo, {
    style: f => ({ fillColor: colourOf(BY_ID.get(f.id)), fillOpacity: .88, color: "#fff", weight: .35 }),
    onEachFeature: (f, l) => {
      layersById.set(f.id, l);
      if (HOVER) {
        l.on("mouseover", () => {
          const m = BY_ID.get(f.id);
          const g = mainForms(m);
          const nk = m.g.filter(f => f.k === "nick" && langGroup(f.l) !== "fx").slice(0, 2).map(f => f.m).join(", ");
          l.bindTooltip(`<b>${esc(m.n)}</b>${g ? esc(g) : `<i>${esc(T("tip.nodem"))}</i>`}${nk ? `<br><span class="tk">${esc(T("tip.nick"))}: <i>${esc(nk)}</i></span>` : ""}`, { className: "mt", sticky: true, direction: "top" }).openTooltip();
          if (m.id !== selected) l.setStyle({ weight: 1.4, color: "#241a12" });
        });
        l.on("mouseout", () => { if (f.id !== selected) l.setStyle({ weight: .35, color: "#fff" }); });
      }
      // phone: a tap opens the bubble and "Más detalles" opens the ficha; desktop: the side panel is already
      // there, so a click opens the ficha directly (Víctor, 2026-09-17)
      l.on("click", e => { l.closeTooltip(); if (VIEW === "pop") return popFicha(f.id); isMobile() ? showPopup(f.id, e.latlng) : select(f.id, false); });
    },
  }).addTo(map);
  legend();
  document.querySelectorAll(".mode-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(x => x.classList.toggle("active", x === b));
    group = b.dataset.group;
    if (!GROUPS[group].includes(mode)) mode = GROUPS[group][0];
    restyle();
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
    <div class="pp">${esc(m.p === m.c ? m.p : m.p + " · " + m.c)}${m.pop != null ? ` · ${esc(T("bub.inhab", { n: fmt(m.pop) }))}` : ""}</div>
    ${dem.length ? `<div class="pg">${dem.slice(0, 4).map(formTxt).join("<br>")}${dem.length > 4 ? `<br><span class="pm">${esc(T("bub.more", { n: dem.length - 4 }))}</span>` : ""}</div>`
      : `<div class="pg pm">${esc(T("tip.nodem"))}</div>`}
    ${nick.length ? `<div class="pk">${esc(T("tip.nick"))}: ${nick.slice(0, 2).map(f => `<i>${esc(f.m)}</i>`).join(", ")}</div>` : ""}
    <div class="pc">${[m.ns ? esc(nsrc(m.ns)) : "", m.cu ? `<span class="badge cur">${esc(T("badge.curious"))}</span>` : "",
      m.ety ? esc(T("bub.ety", { n: m.ety })) : "", m.hist ? esc(T("bub.hist", { n: m.hist })) : ""].filter(Boolean).join(" · ")}</div>
    <button type="button" class="more" data-id="${m.id}">${esc(T("bub.detail"))}</button>
  </div>`;
  const ll = latlng || (layersById.get(id) && layersById.get(id).getBounds().getCenter());
  const pop = L.popup({ maxWidth: 260, autoPanPadding: [20, 70], className: "gpop" }).setLatLng(ll).setContent(html).openOn(map);
  const btn = pop.getElement() && pop.getElement().querySelector(".more");
  if (btn) btn.addEventListener("click", () => select(id, false));
}

// ---------- panel ----------
// the hash carries the id of what is open and, when it is not Spanish, the language: "#ine:39035&l=fr", "#l=en"
const hashId = () => {
  const first = location.hash.slice(1).split("&")[0];
  return /^l=/.test(first) ? "" : decodeURIComponent(first);
};
function setHash(id) {
  const lang = LANG === "es" ? "" : "l=" + LANG;
  const h = [id || "", lang].filter(Boolean).join("&");
  history.replaceState(null, "", h ? "#" + h : location.pathname);
}
function closeFicha() {
  if (terrLayer) { map.removeLayer(terrLayer); terrLayer = null; }
  document.body.classList.remove("detail-open");
  setHash(null);
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
  const pick = cur.slice().sort((a, b) => b.ns - a.ns || coll(a.n, b.n)).slice(0, 40);
  document.getElementById("panel-body").innerHTML = `
    <div class="intro">
      <h2>${esc(T("intro.h"))}</h2>
      <p>${T("intro.p")}</p>
      <div class="kpis">
        <div class="kpi"><b>${fmt(withG.length)}</b><span>${esc(T("intro.kpi1", { pct: Math.round(100 * withG.length / MUNIS.length) }))}</span></div>
        <div class="kpi"><b>${fmt(cur.length)}</b><span>${esc(T("intro.kpi2"))}</span></div>
        <div class="kpi"><b>${fmt(multi.length)}</b><span>${esc(T("intro.kpi3"))}</span></div>
        <div class="kpi"><b>${fmt(MUNIS.length - withG.length)}</b><span>${esc(T("intro.kpi4"))}</span></div>
      </div>
      <p class="note">${esc(T("quotes.note"))}</p>
      <div class="h3">${esc(T("intro.curious"))}</div>
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

// ---------- "parecidos": same name, similar name, similar gentilicio (computed by us, phase graph) ----------
const SIM = new Map(), SIM_LOADED = new Map();
function loadSimilar(pc) {
  if (!SIM_LOADED.has(pc)) {
    SIM_LOADED.set(pc, fetch(`gentilicios/data/similar/${pc}.json?v=${V}`).then(r => r.ok ? r.json() : {}).then(d => {
      for (const [e, s] of Object.entries(d)) SIM.set(e, s);
    }).catch(() => {}));
  }
  return SIM_LOADED.get(pc);
}
const simLink = x => `<a href="#${esc(x.i)}">${esc(x.n)}</a> <span class="sp">(${esc(x.p)})</span>`;
function similarHTML(s) {
  if (!s || (!s.hom && !s.sn && !s.sg && !s.sd)) return "";
  const rows = [];
  if (s.sd) for (const x of s.sd) rows.push(`<li><span class="sk">${esc(T("sim.samedem"))}</span><span class="sv"><i>${esc(x.f)}</i>
    ${x.n > x.o.length + 1 ? T("sim.inN", { n: x.n }) : ""}: ${x.o.map(simLink).join(" · ")}${x.n > x.o.length + 1 ? esc(T("sim.andmore")) : ""}</span></li>`);
  if (s.hom) rows.push(`<li><span class="sk">${esc(T("sim.samename"))}</span><span class="sv">${s.hom.map(x =>
    `${simLink(x)}${x.g ? `: <i>${esc(x.g)}</i>` : ""}`).join(" · ")}</span></li>`);
  if (s.sn) rows.push(`<li><span class="sk">${esc(T("sim.simname"))}</span><span class="sv">${s.sn.map(x =>
    `${simLink(x)} <span class="sj">${esc(T("sim.km", { n: x.km }))}</span>`).join(" · ")}</span></li>`);
  if (s.sg) rows.push(`<li><span class="sk">${esc(T("sim.simdem"))}</span><span class="sv">${s.sg.map(x =>
    `<i>${esc(x.b)}</i>, ${simLink(x)} <span class="sj">${esc(T("sim.km", { n: x.km }))}</span>`).join(" · ")}</span></li>`);
  return `<div class="h3">${esc(T("sim.h"))}</div>
    <p class="note">${esc(T("sim.note"))}</p>
    <ul class="simlist">${rows.join("")}</ul>`;
}

// ---------- territories: provinces, comunidades, comarcas, islands ----------
let TERR = new Map(), MUNI_TERR = {};
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
  return `<a href="#${esc(id)}" class="terr" data-terr="${esc(id)}" title="${esc(levelLabel(tt.lv))}${g ? ": " + esc(g.m) : ""}">${esc(label)}</a>`;
}
let terrLayer = null;
async function openTerritory(id) {
  const tt = TERR.get(id);
  if (!tt) return;
  selected = null; restyle();
  map.closePopup();
  openPanel();
  document.body.classList.add("has-ficha");
  setHash(id);
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
  body.innerHTML = `<div class="ficha"><h2>${esc(tt.n)}</h2><div class="where">${esc(levelLabel(tt.lv))}</div><p class="empty">${esc(T("ficha.loading"))}</p></div>`;
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
      ${f.l.map(l => `<span class="badge lang">${esc(l)}</span>`).join("")}${f.pr ? `<span class="badge prin">${esc(T("badge.principal"))}</span>` : ""}
      <span class="badge nsrc">${esc(nsrc(f.n))}</span></summary>${cs.map(claimHTML).join("")}</details>`;
  };
  const sections = (items, langsOf, render) => {
    const g = byGroup(items, langsOf);
    return ["es", "co", "fx"].filter(k => g[k].length).map(k => k === "fx"
      ? `<details class="lg fx"><summary>${esc(groupTitle(k))} (${g[k].length})</summary>${render(g[k])}</details>`
      : k === "es" ? `<div class="lg es">${render(g[k])}</div>` : `<div class="lg ${k}"><div class="lgt">${esc(groupTitle(k))}</div>${render(g[k])}</div>`).join("");
  };
  const dems = tt.g.filter(f => f.k === "dem"), nicks = tt.g.filter(f => f.k === "nick");
  const ety = cl.filter(c => ["name_etymology", "name_origin_legend"].includes(c.fd));
  const parent = tt.par && TERR.get(tt.par);
  // single-province comunidades: the gentilicio lives on the comunidad
  const sameName = !dems.length && parent && parent.n === tt.n;
  body.innerHTML = `<div class="ficha">
    <h2>${esc(tt.n)}</h2>
    <div class="where">${esc(levelLabel(tt.lv))}${parent ? ` · ${terrLink(parent.id, parent.n)}` : ""} · ${esc(T("ficha.nmunis", { n: fmt(members.size) }))}</div>
    <div class="ids">${tt.q ? `<a href="https://www.wikidata.org/wiki/${esc(tt.q)}" target="_blank" rel="noopener">Wikidata</a>` : ""}
      ${tt.w ? `<a href="https://es.wikipedia.org/wiki/${encodeURIComponent(tt.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia</a>` : ""}</div>
    <div class="h3">${esc(T("ficha.h.dem"))}</div>
    ${dems.length ? sections(dems, f => f.l, fs => fs.map(block).join(""))
      : sameName ? `<p class="empty">${T("ficha.sameprov", { link: terrLink(parent.id, parent.n) })}</p>` : `<p class="empty">${esc(T("ficha.nodem"))}</p>`}
    ${nicks.length ? `<div class="h3">${esc(T("ficha.h.nick"))}</div>${sections(nicks, f => f.l, fs => fs.map(block).join(""))}` : ""}
    <div class="h3">${esc(T("ficha.h.ety"))}</div>
    ${ety.length ? sections(ety, c => c.l, cs => cs.map(c => `<div class="form" style="padding:0">${claimHTML(c)}</div>`).join("")) : `<p class="empty">${esc(T("ficha.noety"))}</p>`}
    <p class="note">${esc(T("quotes.note"))}</p>
  </div>`;
  bindTerrLinks(body);
  document.getElementById("panel").scrollTop = 0;
}
function bindTerrLinks(root) {
  root.querySelectorAll("a.terr[data-terr]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); openTerritory(a.dataset.terr); }));
}

const SRC_NAME_CTX = { wikidata: "Wikidata", gisco_lau: "Eurostat GISCO" };
const ctxSrcName = s => TX("ctxsrc." + s) || SRC_NAME_CTX[s] || s;
function srcLink(ctx, field, label) {
  const s = ctx && ctx.src && ctx.src[field];
  return s ? ` <a class="srcl" href="${esc(s.u)}" target="_blank" rel="noopener" title="${esc(T("src.of", { name: ctxSrcName(s.s) }))}">${esc(label || ctxSrcName(s.s))}</a>` : "";
}
function contextHTML(m, ctx) {
  if (!ctx) return "";
  const nf = fmt;
  const facts = [];
  if (ctx.pop != null) facts.push(`${T("ctx.inhab", { n: nf(ctx.pop), y: esc(ctx.py) })}${srcLink(ctx, "population", "INE")}`);
  if (ctx.ph != null) facts.push(`${esc(T("ctx.inhabhist", { n: nf(ctx.ph), y: ctx.phy }))}${srcLink(ctx, "population_hist", "INE")}`);
  if (ctx.alt) facts.push(`${esc(T("ctx.alt", { n: nf(ctx.alt) }))}${srcLink(ctx, "altitude_m", "Wikidata")}`);
  if (ctx.area) facts.push(`${nf(Math.round(Number(ctx.area) * 10) / 10)} km²`);
  const coat = ctx.img.find(i => i.k === "coat_of_arms"), photo = ctx.img.find(i => i.k === "image");
  const credit = i => `${esc(imgKind(i.k))}: <a href="${esc(i.u)}" target="_blank" rel="noopener">${esc(i.a || "Wikimedia Commons")}</a>${i.lc ? `, <a href="${esc(i.lu)}" target="_blank" rel="noopener">${esc(i.lc)}</a>` : ""}`;
  const names = ctx.names.filter(n => n[0] && (n[0] !== m.n || n[2] || n[3]));
  return `
    ${photo ? `<figure class="ctx-photo"><img src="${esc(photo.t)}" alt="${esc(m.n)}" loading="lazy"></figure>` : ""}
    <div class="ctx-head">${coat ? `<img class="ctx-coat" src="${esc(coat.t)}" alt="${esc(T("ctx.coatalt", { name: m.n }))}" loading="lazy">` : ""}
      <div class="ctx-facts">${facts.join(" · ")}
        ${ctx.com.length ? `<div>${esc(T("ctx.comarca", { v: ctx.com.join(", ") }))}</div>` : ""}
        ${ctx.pat.length ? `<div>${esc(T("ctx.patron", { v: ctx.pat.join(", ") }))}</div>` : ""}
        ${names.length ? `<div>${T("ctx.names", { v: names.map(n => `${esc(n[0])}${n[1] ? ` <span class="badge lang" title="${esc(langName(n[1]))}">${esc(n[1])}</span>` : ""}${n[2] || n[3] ? ` <span class="ss">(${esc(n[2] || "…")}–${esc(n[3] || T("ctx.today"))})</span>` : ""}`).join(" · ") })}</div>` : ""}
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
  const js = (x, d) => { if (x == null || x === "") return d; if (typeof x !== "string") return x; try { return JSON.parse(x); } catch (e) { return d; } };
  try { const o = js(c.lc, {}); loc = Object.entries(o).filter(([k]) => k !== "revid").map(([k, v]) => `${k} ${v}`).join(" · "); } catch (e) {}
  let cites = "";
  try {
    const ci = js(c.ci, []);
    if (ci.length) cites = T("claim.cite", { v: ci.map(x => typeof x === "string" ? x : Object.entries(x).map(([k, v]) => `${k}=${v}`).join(" ")).join("; ") });
  } catch (e) {}
  let notes = "";
  try { const pn = js(c.pn, []); if (pn.length) notes = pn.map(x => typeof x === "string" ? x : JSON.stringify(x)).join("; "); } catch (e) {}
  const kind = c.hk ? `<span class="badge kind">${esc(kindLabel(c.hk))}</span> ` : "";
  const level = c.lv === "transcribed" ? T("claim.transcribed") : c.lv === "deduced" ? T("claim.deduced") : "";
  const PG = () => ({ "page ": T("claim.page"), "volume ": T("claim.volume"), "vol ": T("claim.volume"), "pdf_page ": T("claim.pdfpage"), "printed_page ": T("claim.page") });
  const human = [loc.replace(/^(page|volume|vol|pdf_page|printed_page) /, m => PG()[m] || m), T("claim.retrieved", { d: c.r }), level].filter(Boolean);
  const tech = [matchLabel(c.mr), cites, notes].filter(Boolean);
  return `<div class="claim">
    <div class="src">${kind}<a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(srcName(c.s))}</a>${c.l ? ` <span class="badge lang" title="${esc(langName(c.l))}">${esc(c.l)}</span>` : ""}</div>
    <blockquote>${esc(c.q)}</blockquote>
    <div class="meta">${human.map(esc).join(" · ")}${tech.length ? ` <details class="tech"><summary>${esc(T("claim.how"))}</summary>${tech.map(esc).join("<br>")}</details>` : ""}</div>
  </div>`;
}

async function select(id, fly) {
  const m = BY_ID.get(id);
  if (!m) return;
  selected = id; restyle();
  setHash(id);
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
  body.innerHTML = `<div class="ficha"><h2>${esc(m.n)}</h2><div class="where">${esc(m.p)} · ${esc(m.c)}</div><p class="empty">${esc(T("ficha.loading"))}</p></div>`;
  document.getElementById("panel").scrollTop = 0;
  await Promise.all([loadClaims(m.pc), loadContext(m.pc), loadSimilar(m.pc)]);
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
    const vars = f.v || [];
    const extra = new Set(vars.map(v => v[0]));
    if (f.f && !extra.has(f.f)) extra.add(f.f);
    for (const x of extra) cs = cs.concat(byForm.get((f.k === "nick" ? "nick|" : "dem|") + x) || []);
    const varLine = vars.length ? `<div class="vars" title="${esc(T("var.title"))}">${
      ["fem", "pl", "fem_pl"].filter(k => vars.some(v => v[1] === k)).map(k => `${esc(T("var." + k))}: <i>${vars.filter(v => v[1] === k).map(v => esc(v[0])).join(", ")}</i>`).join(" · ")}</div>` : "";
    return `<details class="form"><summary>
      <span class="fm">${esc(f.m)}</span>${f.f && f.f !== f.m ? `<span class="ff">${esc(f.f)}</span>` : ""}
      ${f.l.map(l => `<span class="badge lang">${esc(LANG_LABEL[l] || l)}</span>`).join("")}
      ${f.pr ? `<span class="badge prin" title="${esc(T("badge.principal.title"))}">${esc(T("badge.principal"))}</span>` : ""}
      ${f.cu ? `<span class="badge cur" title="${esc(T("badge.curious.title"))}">${esc(T("badge.curious"))}</span>` : ""}
      ${f.go === "nombre_antiguo" || f.go === "otra_lengua" ? `<span class="badge orig" title="${esc(T("badge.orig.title"))}">← ${esc((f.ge || "").replace(/ \(([^)]*)\)$/, ""))}</span>` : ""}
      <span class="badge nsrc" title="${esc(T("nsrc.title"))}">${esc(nsrc(f.n))}</span>
      ${varLine}
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
      if (k === "fx") return `<details class="lg fx"><summary>${esc(groupTitle(k))} (${g[k].length})</summary>${inner}</details>`;
      // Spanish goes first without a title (it is understood); the other groups keep theirs
      return k === "es" ? `<div class="lg es">${inner}</div>` : `<div class="lg ${k}"><div class="lgt">${esc(groupTitle(k))}</div>${inner}</div>`;
    }).join("");
  };
  const grouped = list => {
    const g = new Map();
    for (const c of list) { if (!g.has(c.fd)) g.set(c.fd, []); g.get(c.fd).push(c); }
    const multi = g.size > 1;
    return [...g].map(([fd, cs]) => `${multi ? `<div class="h4">${esc(fieldLabel(fd))}</div>` : ""}${cs.map(c => `<div class="form" style="padding:0">${claimHTML(c)}</div>`).join("")}`).join("");
  };
  body.innerHTML = `<div class="ficha">
    <h2>${esc(m.n)}</h2>
    <div class="where">${m.p === m.c && ccaaIdOf(m) ? terrLink(ccaaIdOf(m), m.c) : terrLink(provId(m), m.p) + (m.p === m.c ? "" : " · " + (ccaaIdOf(m) ? terrLink(ccaaIdOf(m), m.c) : esc(m.c)))}${(MUNI_TERR[id] || []).map(t => TERR.get(t) ? " · " + terrLink(t, TERR.get(t).n) : "").join("")}</div>
    ${contextHTML(m, CTX.get(id))}
    <div class="ids"><span>${esc(T("ficha.ine", { code: m.id.slice(4) }))}</span>
      ${m.q ? `<a href="https://www.wikidata.org/wiki/${esc(m.q)}" target="_blank" rel="noopener">Wikidata</a>` : ""}
      ${m.w ? `<a href="https://es.wikipedia.org/wiki/${encodeURIComponent(m.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia</a>` : ""}
      ${CTX.get(id) && CTX.get(id).web ? `<a href="${esc(CTX.get(id).web)}" target="_blank" rel="noopener">${esc(T("ficha.townhall"))}</a>` : ""}
    </div>
    <div class="h3">${esc(T("ficha.h.dem"))}</div>
    ${dems.length ? langSections(dems, f => f.l, fs => fs.slice().sort((a, b) => (b.pr ? 1 : 0) - (a.pr ? 1 : 0)).map(formBlock).join("")) : `<p class="empty">${esc(T("ficha.nodem"))}</p>`}
    ${nicks.length ? `<div class="h3">${esc(T("ficha.h.nick"))}</div><p class="note">${esc(T("ficha.nick.note"))}</p>${langSections(nicks, f => f.l, fs => fs.map(formBlock).join(""))}` : ""}
    ${(m.pd || []).length ? `<div class="h3">${esc(T("ficha.pedanias", { n: m.pd.length }))}</div>
      ${m.pd.map(s => {
        const sc = cl.filter(c => c.e === s.id);
        return `<details class="form"><summary><span class="sub-n">${esc(s.n)}</span>
          ${s.g.filter(g => g.k === "dem").map(g => `<span class="ff">${esc(g.m)}</span>${g.l.length && !g.l.includes("es") ? `<span class="badge lang">${esc(g.l.join(" "))}</span>` : ""}`).join(" ")}
          ${s.g.filter(g => g.k === "nick").length ? `<span class="badge">${esc(T("ficha.nickbadge", { v: s.g.filter(g => g.k === "nick").map(g => g.m).join(", ") }))}</span>` : ""}
        </summary>${sc.map(claimHTML).join("")}</details>`;
      }).join("")}` : ""}
    <div class="h3">${esc(T("ficha.h.ety"))}</div>
    ${ety.length ? `<p class="note warn">${esc(T("ficha.etywarn"))}</p>${langSections(ety, c => c.l, grouped)}` : `<p class="empty">${esc(T("ficha.noety"))}</p>`}
    <div class="h3">${esc(T("ficha.h.hist"))}</div>
    ${hist.length ? langSections(hist, c => c.l, grouped) : `<p class="empty">${esc(T("ficha.nohist"))}</p>`}
    ${similarHTML(SIM.get(id))}
    <p class="note">${esc(T("ficha.tip"))}</p>
    <p class="note">${esc(T("quotes.note"))}</p>
  </div>`;
  bindTerrLinks(body);
  if (terrLayer) { map.removeLayer(terrLayer); terrLayer = null; }
  document.getElementById("panel").scrollTop = 0;
  if (dems.length === 1) { const d = body.querySelector("details.form"); if (d) d.open = true; }
}

let REDIRECTS = null;
async function fromHash() {
  let id = hashId();
  if (/^ine:\d+$/.test(id) && !BY_ID.has(id)) {
    // an old INE code (merged or renamed municipality) leads to the current one
    if (!REDIRECTS) REDIRECTS = await fetch(`gentilicios/data/redirects.json?v=${V}`).then(r => r.ok ? r.json() : {}).catch(() => ({}));
    if (REDIRECTS[id]) { id = REDIRECTS[id]; setHash(id); }
  }
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
    hits = index.map(x => [score(x), x]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || coll(a[1].m.n, b[1].m.n)).slice(0, 30).map(([, x]) => x.m);
    on = 0;
    box.innerHTML = hits.length ? hits.map((m, i) => {
      const f = m.g.find(f => fold(f.m).includes(q) || fold(f.f).includes(q));
      return `<div class="sug${i === 0 ? " on" : ""}" data-id="${m.id}"><div class="sn">${hl(m.n, q)}</div>
        <div class="ss">${f ? `<i>${hl(f.m, q)}</i> · ` : (mainForms(m) ? `<i>${esc(mainForms(m))}</i> · ` : "")}${esc(m.p)}</div></div>`;
    }).join("") : `<div class="sug ss">${esc(T("search.none", { q: input.value }))}</div>`;
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
  const was = VIEW;
  VIEW = v;
  document.getElementById("v-map").classList.toggle("active", v === "map");
  document.getElementById("v-table").classList.toggle("active", v === "table");
  document.getElementById("v-pop").classList.toggle("active", v === "pop");
  document.getElementById("table-view").hidden = v !== "table";
  document.getElementById("colour-modes").hidden = v === "pop";
  document.getElementById("colour-modes").style.visibility = v === "table" ? "hidden" : "";
  document.getElementById("pop-modes").hidden = v !== "pop";
  document.body.classList.toggle("view-pop", v === "pop");
  if (v === "table") { shown = 300; renderTable(); return; }
  map.invalidateSize();
  restyle();
  // the side panel follows the tab: the same town's population ficha or gentilicio ficha
  if (v === "pop") { selected ? popFicha(selected) : popIntro(); }
  else if (was === "pop") { selected ? select(selected, false) : intro(); }
}
function initTable() {
  document.getElementById("v-map").addEventListener("click", () => showView("map"));
  document.getElementById("v-table").addEventListener("click", () => showView("table"));
  const sel = document.getElementById("t-ccaa");
  [...new Set(MUNIS.map(m => m.c))].sort(coll).forEach(c => sel.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
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
  rows.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === "number" ? x - y : coll(x, y)) * sortDir || coll(a.n, b.n); });
  document.getElementById("t-count").textContent = T("table.count", { n: fmt(rows.length) });
  document.querySelectorAll("#table th").forEach(th => th.classList.toggle("sorted", th.dataset.k === sortKey));
  document.querySelector("#table tbody").innerHTML = rows.slice(0, shown).map(m => {
    // Spanish forms first, then the other languages of Spain; foreign forms stay in the ficha only
    const dem = m.g.filter(f => f.k === "dem" && langGroup(f.l) !== "fx").sort((a, b) => (langGroup(a.l) !== "es") - (langGroup(b.l) !== "es") || (b.pr ? 1 : 0) - (a.pr ? 1 : 0));
    return `<tr data-id="${m.id}"><td>${esc(m.n)}</td><td>${esc(m.p)}</td><td>${esc(m.c)}</td>
      <td class="g">${dem.map(f => `<span class="${f.cu ? "cu" : ""}">${esc(f.m)}</span>${langGroup(f.l) === "co" ? ` <span class="badge lang">${esc(f.l.filter(l => CO_OFFICIAL.has(l)).join(" "))}</span>` : ""}`).join(", ") || '<span class="muted">·</span>'}</td>
      <td class="g">${esc(m.g.filter(f => f.k === "nick").map(f => f.m).join(", "))}</td>
      <td class="num">${m.pop != null ? fmt(m.pop) : ""}</td><td class="num">${m.ns || ""}</td><td class="cu">${m.cu ? "✦" : ""}</td><td class="num">${m.ety || ""}</td></tr>`;
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
      const hits = index.filter(x => x.name.includes(q)).sort((a, b) => (b.name.startsWith(q)) - (a.name.startsWith(q)) || coll(a.m.n, b.m.n)).slice(0, 12);
      sug.innerHTML = hits.map(x => `<div class="sug" data-id="${x.m.id}"><span class="sn">${esc(x.m.n)}</span> <span class="ss">${esc(x.m.p)}</span></div>`).join("") || `<div class="sug ss">${esc(T("route.nothing"))}</div>`;
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
  if (!path) { res.innerHTML = `<p class="empty">${esc(T("route.none"))}</p>`; return; }
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
  res.innerHTML = `<div class="rb-sum">${T("route.sum", { between: towns.length - 2 < 0 ? 0 : towns.length - 2, borders: towns.length - 1, km: fmt(Math.round(km)) })}
    <span class="ss">${esc(T("route.explored", { n: fmt(visited), ms: ms < 1 ? "<1" : Math.round(ms) }))}</span></div>
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

// ---------- population and territory tab (not gentilicios) ----------
let POP = null, pmode = "dens";
const trLabel = k => TX("tr." + k) || k;
const TR_COL = { growth: "#2e6b6b", stable: "#8fb8b0", decline_then_partial_recovery: "#d9a441",
  decline_since_1980s_or_later: "#e39a6b", peak_mid_century_then_decline: "#b6465f", decline_since_early_1900s: "#6e1f33" };
const BIN = (v, cuts, cols) => { if (v == null) return "#ebe5da"; for (let i = 0; i < cuts.length; i++) if (v < cuts[i]) return cols[i]; return cols[cols.length - 1]; };
// each bin's label is an i18n key ("pop.dens.0"...); the year bins are pure numbers and need none
const DENS = { cuts: [1, 10, 50, 200, 1000], cols: ["#e8f0f5", "#b9d3e3", "#7fb0cf", "#3f82b0", "#1d5687", "#0b2d4f"], k: "pop.dens" };
const CHP = { cuts: [-90, -75, -50, -25, -2], cols: ["#4a0f1f", "#8a2238", "#c0485b", "#e3908a", "#f1cdb9", "#8fb8b0"], k: "pop.chp" };
const ALT = { cuts: [200, 500, 800, 1100], cols: ["#e9efe1", "#c3d3a8", "#99ad72", "#6f7f45", "#4a3b26"], k: "pop.alt" };
const PKY = { cuts: [1920, 1950, 1970, 1991, 2010], cols: ["#3b1e54", "#6a3d8f", "#9b6fbd", "#c9a6dc", "#9cc3bb", "#2e6b6b"],
  labels: ["1900-1910", "1920-1940", "1950-1960", "1970-1981", "1991-2009", "2010-2025"] };

function popColour(m) {
  const p = POP && POP.m[m.id];
  if (!p) return "#ebe5da";
  if (pmode === "dens") return BIN(p.d, DENS.cuts, DENS.cols);
  if (pmode === "chp") return BIN(p.chp, CHP.cuts, CHP.cols);
  if (pmode === "alt") return BIN(p.alt, ALT.cuts, ALT.cols);
  if (pmode === "pky") return BIN(p.pky, PKY.cuts, PKY.cols);
  return TR_COL[p.tr] || "#ebe5da";
}
function popLegend() {
  const el = document.getElementById("legend");
  if (!POP) { el.innerHTML = `<div class="lt">${esc(T("loading"))}</div>`; return; }
  const vals = Object.values(POP.m);
  const binRows = (spec, key) => spec.cols.map((c, i) => {
    const lo = i ? spec.cuts[i - 1] : -Infinity, hi = i < spec.cuts.length ? spec.cuts[i] : Infinity;
    const n = vals.filter(p => p[key] != null && p[key] >= lo && p[key] < hi).length;
    const label = spec.labels ? spec.labels[i] : T(spec.k + "." + i);
    return `<div class="lr"><span class="sw" style="background:${c}"></span>${esc(label)}<span class="ln">${fmt(n)}</span></div>`;
  }).join("") + `<div class="lr"><span class="sw" style="background:#ebe5da"></span>${esc(T("pop.legend.nodata"))}<span class="ln">${fmt(MUNIS.length - vals.filter(p => p[key] != null).length)}</span></div>`;
  const title = T("pop.title." + pmode);
  const note = T("pop.note." + pmode);
  const body = pmode === "dens" ? binRows(DENS, "d") : pmode === "chp" ? binRows(CHP, "chp") : pmode === "alt" ? binRows(ALT, "alt")
    : pmode === "pky" ? binRows(PKY, "pky")
    : Object.keys(TR_COL).map(k => `<div class="lr"><span class="sw" style="background:${TR_COL[k]}"></span>${esc(trLabel(k))}<span class="ln">${fmt(vals.filter(p => p.tr === k).length)}</span></div>`).join("");
  el.innerHTML = `<div class="lt">${esc(title)}</div>${body}<div class="note">${esc(note)}</div>`;
}

function popChart(p) {
  const W = 360, H = 170, L = 48, R = 8, TOP = 10, B = 22;
  const ys = POP.years, vals = p.v, nc = new Set(p.nc);
  const maxV = Math.max(1, ...vals.filter(v => v != null));
  const x = yr => L + (yr - 1900) / (2025 - 1900) * (W - L - R), y = v => TOP + (1 - v / maxV) * (H - TOP - B);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="popchart" role="img" aria-label="${esc(T("pop.chart.aria"))}">`;
  for (const tv of [0, maxV / 2, maxV]) s += `<line x1="${L}" x2="${W - R}" y1="${y(tv)}" y2="${y(tv)}" class="grid"/><text x="${L - 4}" y="${y(tv) + 3}" class="ax" text-anchor="end">${fmt(Math.round(tv))}</text>`;
  for (const yr of [1900, 1950, 2000, 2025]) s += `<text x="${x(yr)}" y="${H - 6}" class="ax" text-anchor="middle">${yr}</text>`;
  const pad = ys.map((yr, i) => [yr, vals[i]]).filter(([yr, v]) => v != null && yr >= 1996);
  if (pad.length) s += `<polyline class="pad" points="${pad.map(([yr, v]) => `${x(yr)},${y(v)}`).join(" ")}"/>`;
  ys.forEach((yr, i) => {
    const v = vals[i];
    if (v == null || yr > 1991) return;
    s += `<circle cx="${x(yr)}" cy="${y(v)}" r="3.2" class="${nc.has(i) ? "cen nc" : "cen"}"><title>${yr}: ${fmt(v)}${nc.has(i) ? esc(T("pop.chart.nc")) : ""}</title></circle>`;
  });
  if (p.pky) {
    const i = ys.indexOf(p.pky);
    if (i >= 0 && vals[i] != null) s += `<circle cx="${x(p.pky)}" cy="${y(vals[i])}" r="5.5" class="peak"><title>${esc(T("pop.chart.peak", { n: fmt(p.pk), y: p.pky }))}</title></circle>`;
  }
  return s + `</svg>`;
}

function popIntro() {
  const body = document.getElementById("panel-body");
  if (!POP) { body.innerHTML = `<p class="empty">${esc(T("pop.intro.loading"))}</p>`; return; }
  const vals = Object.values(POP.m);
  const lost = th => vals.filter(p => p.chp != null && p.chp <= -th).length;
  body.innerHTML = `<div class="intro pop">
    <div class="pop-flag">${esc(T("pop.flag"))}</div>
    <h2>${esc(T("pop.intro.h"))}</h2>
    <p>${esc(T("pop.intro.p"))}</p>
    <div class="kpis">
      <div class="kpi"><b>${fmt(lost(50))}</b><span>${esc(T("pop.intro.kpi1"))}</span></div>
      <div class="kpi"><b>${fmt(lost(75))}</b><span>${esc(T("pop.intro.kpi2"))}</span></div>
      <div class="kpi"><b>${fmt(lost(90))}</b><span>${esc(T("pop.intro.kpi3"))}</span></div>
      <div class="kpi"><b>${fmt(vals.filter(p => p.c96 != null && p.c96 < 0).length)}</b><span>${esc(T("pop.intro.kpi4"))}</span></div>
    </div>
    <p class="note">${esc(T("pop.intro.note"))}</p>
  </div>`;
}

function popFicha(id) {
  const m = BY_ID.get(id), p = POP && POP.m[id];
  if (!m || !p) return;
  selected = id; restyle(); openPanel(); document.body.classList.add("has-ficha");
  setHash(id);
  const pct = v => v == null ? "·" : `${v > 0 ? "+" : ""}${Number(v).toLocaleString(T("locale"), { maximumFractionDigits: 1 })} %`;
  document.getElementById("panel-body").innerHTML = `<div class="ficha pop">
    <div class="pop-flag">${esc(T("pop.flag"))}</div>
    <h2>${esc(m.n)}</h2>
    <div class="where">${esc(m.p === m.c ? m.p : m.p + " · " + m.c)}</div>
    ${popChart(p)}
    <div class="kpis">
      <div class="kpi"><b>${p.v[p.v.length - 1] != null ? fmt(p.v[p.v.length - 1]) : "·"}</b><span>${esc(T("pop.kpi.2025"))}</span></div>
      <div class="kpi"><b>${p.pk != null ? fmt(p.pk) : "·"}</b><span>${esc(p.pky ? T("pop.kpi.peak", { y: p.pky }) : T("pop.kpi.peak.plain"))}</span></div>
      <div class="kpi"><b>${pct(p.chp)}</b><span>${esc(T("pop.kpi.frompeak"))}</span></div>
      <div class="kpi"><b>${pct(p.c96)}</b><span>${esc(T("pop.kpi.9625"))}</span></div>
      <div class="kpi"><b>${p.d != null ? fmt(Math.round(p.d * 10) / 10) : "·"}</b><span>${esc(T("pop.kpi.dens"))}</span></div>
      <div class="kpi"><b>${p.alt != null ? fmt(p.alt) + " m" : "·"}</b><span>${esc(p.alts && p.alts !== "referenced" ? T("pop.kpi.alt.unref") : T("pop.kpi.alt"))}</span></div>
    </div>
    <p>${T("pop.traj", { v: esc(trLabel(p.tr) || "·") })}</p>
    ${p.nc.length ? `<p class="note warn">${esc(T("pop.warn"))}</p>` : ""}
    <p class="note">${esc(T("pop.source"))}</p>
    <button type="button" class="chip btn" id="to-gent">${esc(T("pop.togent"))}</button>
  </div>`;
  document.getElementById("to-gent").addEventListener("click", () => { showView("map"); select(id, false); });
  document.getElementById("panel").scrollTop = 0;
}

fetch("gentilicios/data/build.json", { cache: "no-store" }).then(r => r.json()).then(b =>
  fetch(`gentilicios/data/population.json?v=${b.v}`)).then(r => r.ok ? r.json() : null).then(d => {
  if (!d) return;
  POP = d;
  document.getElementById("v-pop").hidden = false;
  document.getElementById("v-pop").addEventListener("click", () => showView("pop"));
  document.querySelectorAll(".pmode-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".pmode-btn").forEach(x => x.classList.toggle("active", x === b));
    pmode = b.dataset.pmode; restyle();
  }));
  if (VIEW === "pop") { restyle(); popIntro(); }
}).catch(() => {});

// ---------- language ----------
// a change of language redraws what is on screen; nothing is fetched again, the data has no language
function rerender() {
  applyStatic();
  if (MUNIS.length) stats();
  setAttrib();
  if (VIEW === "table") renderTable(); else restyle();
  // the side panel is always on screen on a desktop, open or not, so it is always redrawn
  const id = hashId();
  if (VIEW === "pop") selected ? popFicha(selected) : popIntro();
  else if (selected) select(selected, false);
  else if (/^(prov|ccaa|comarca|isla):/.test(id)) openTerritory(id);
  else intro();
  if (GRAPH && routeState.from && routeState.to) runRoute();
}
document.querySelectorAll("#lang-pick button").forEach(b => b.addEventListener("click", () => {
  setLang(b.dataset.lang); rerender(); setHash(hashId() || null);
}));
