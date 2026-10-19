// Churches of Rome · app.js, one file, no build step.
// Contract (CHASSIS.md section 3): state -> passes(church) -> [map, list, views]. No view filters on its own.

const DATA_V = "0.3.1";
const BUILD_AT = "2026-10-19 10:47";

// ------------------------------------------------------------------ i18n
// Keyed by the English string. Every key exists in every language: tools/check_views.py refuses
// a deploy otherwise (PRACTICES.md tier 1, rule 10).
const I18N = {
  es: {
    "Churches of Rome": "Iglesias de Roma",
    "every church, chapel and oratory, standing or lost": "todas las iglesias, capillas y oratorios, en pie o desaparecidos",
    "Share": "Compartir", "Where I am": "Dónde estoy",
    "Copy a link to what you are looking at": "Copia un enlace a lo que estás viendo",
    "Show a live dot where you are": "Muestra un punto donde estás",
    "Search a church, a saint, an artist, a person buried there": "Busca una iglesia, un santo, un artista, alguien enterrado allí",
    "Churches": "Iglesias", "Art": "Arte", "Buried": "Enterrados", "Saints": "Santos",
    "Other filters": "Otros filtros",
    "major_basilica": "Basílica mayor", "basilica": "Basílica", "cathedral": "Catedral", "church": "Iglesia",
    "oratory": "Oratorio", "chapel": "Capilla", "unknown kind": "Tipo sin dato",
    "standing": "En uso", "former": "Ya no es iglesia", "ruin": "Ruina", "lost": "Desaparecida",
    "State": "Estado", "Founded": "Fundación", "Holds": "Contiene", "District": "Barrio", "Also": "Además",
    "works of art": "obras de arte", "burials": "enterramientos", "a cardinal title": "un título cardenalicio",
    "a photo": "una foto", "opening hours": "horario", "any district": "cualquier barrio",
    "national": "nacional", "parish": "parroquial", "shrine": "santuario", "pilgrimage": "peregrinación",
    "only in OpenStreetMap": "solo en OpenStreetMap", "no year recorded": "sin año",
    "from": "desde", "to": "hasta", "Show everything": "Mostrar todo",
    "Dot: one church; size: how many Wikipedias write about it; colour: kind; hollow: no longer a church; dashed: lost; faint: approximate position.": "Punto: una iglesia; tamaño: en cuántas Wikipedias aparece; color: tipo; hueco: ya no es iglesia; discontinuo: desaparecida; tenue: posición aproximada.",
    "{n} of {t} churches": "{n} de {t} iglesias", "{n} without a position, listed but not on the map": "{n} sin posición, en la lista pero no en el mapa",
    "Show more": "Mostrar más", "Nothing matches.": "Nada coincide.", "Back to the list": "Volver a la lista",
    "Back": "Atrás", "Open the church": "Abrir la iglesia", "Interior": "Interior", "Exterior": "Exterior",
    "Photo": "Foto", "From Wikipedia": "De Wikipedia", "Read more on Wikipedia": "Seguir leyendo en Wikipedia",
    "Facts": "Datos", "Dedicated to": "Dedicada a", "Architect": "Arquitecto", "Style": "Estilo",
    "Founded or built": "Fundada o construida", "Demolished or closed": "Derribada o cerrada",
    "Denomination": "Confesión", "Rite": "Rito", "Address": "Dirección", "Heritage": "Patrimonio",
    "listed as Italian cultural heritage": "protegida como bien cultural italiano",
    "Part of": "Forma parte de", "Inside it": "Dentro", "Opening hours": "Horario",
    "Mass times": "Misas", "as recorded in OpenStreetMap; check before you go": "según OpenStreetMap; compruébalo antes de ir",
    "Cardinal title": "Título cardenalicio", "Holders recorded in Wikidata": "Titulares registrados en Wikidata",
    "What is inside": "Qué hay dentro", "Shown in": "Aparece en", "Buried here": "Enterrados aquí",
    "Links": "Enlaces", "Sources": "Fuentes", "Show all {n}": "Ver los {n}",
    "Position from OpenStreetMap: Wikidata has none.": "Posición de OpenStreetMap: Wikidata no tiene.",
    "This church is only in OpenStreetMap: Wikidata does not have it yet.": "Esta iglesia solo está en OpenStreetMap: Wikidata aún no la tiene.",
    "No position known: it is not on the map.": "Sin posición conocida: no está en el mapa.",
    "century": "siglo", "c.": "h.", "BC": "a. C.",
    "pope": "papa", "cardinal": "cardenal", "saint": "santo", "blessed": "beato", "venerated": "venerable",
    "artist": "artista", "musician": "músico", "writer": "escritor", "clergy": "clero",
    "painting": "pintura", "fresco": "fresco", "sculpture": "escultura", "tomb": "sepulcro", "mosaic": "mosaico",
    "altar": "altar", "object": "objeto", "other": "otro", "architecture": "arquitectura", "relic": "reliquia",
    "{n} works in {c} churches": "{n} obras en {c} iglesias", "{n} people in {c} churches": "{n} personas en {c} iglesias",
    "{n} saints and dedications": "{n} santos y advocaciones", "churches": "iglesias", "works": "obras",
    "Works by": "Obras de", "Dedicated to:": "Dedicadas a:", "Buried:": "Enterrado:",
    "Link copied": "Enlace copiado", "Location unavailable": "Ubicación no disponible",
    "Feast": "Fiesta", "Wikidata": "Wikidata", "Commons": "Commons", "Churches of Rome Wiki": "Churches of Rome Wiki",
    "everyone": "todos", "unknown": "desconocido", "Popes": "Papas", "Artists": "Artistas",
    "Loading the churches...": "Cargando las iglesias...", "The data could not be loaded. Reload the page.": "No se pudieron cargar los datos. Recarga la página.",
    "by fame": "por fama", "by name": "por nombre", "by year": "por año",
    "Only in the Churches of Rome Wiki. Position: the address it gives, found by OpenStreetMap Nominatim.": "Solo en la Churches of Rome Wiki. Posición: la dirección que da, localizada con Nominatim de OpenStreetMap.",
    "Only in the Churches of Rome Wiki. Position: the street it gives, found by OpenStreetMap Nominatim. Approximate.": "Solo en la Churches of Rome Wiki. Posición: la calle que da, localizada con Nominatim de OpenStreetMap. Aproximada.",
    "Approximate.": "Aproximada.", "yes, according to the Churches of Rome Wiki": "sí, según la Churches of Rome Wiki",
    "only": "solo", "all": "todo", "Relics": "Reliquias", "only in the Churches of Rome Wiki": "solo en la Churches of Rome Wiki", "outside the walls": "fuera de las murallas",
    "Built": "Construida", "Consecrated": "Consagrada", "Artists": "Artistas", "Loading...": "Cargando...",
    "relics": "reliquias", "a long text": "un texto largo", "Read the whole entry": "Leer la entrada completa", "In the words of the Churches of Rome Wiki": "Con las palabras de la Churches of Rome Wiki", "paragraphs": "párrafos", "Text": "Texto",
    "This church is only in the Churches of Rome Wiki: no position is known, so it is not on the map.": "Esta iglesia solo está en la Churches of Rome Wiki: no se conoce su posición, así que no está en el mapa.", "in": "en", "Funeral monuments": "Monumentos funerarios",
    "commemorated by a monument here; Wikidata does not record them as buried here": "recordados por un monumento aquí; Wikidata no dice que estén enterrados aquí", "Events held here": "Acontecimientos que tuvieron lugar aquí", "event": "acontecimiento",
  },
  it: {
    "Churches of Rome": "Chiese di Roma",
    "every church, chapel and oratory, standing or lost": "tutte le chiese, cappelle e oratori, esistenti o scomparsi",
    "Share": "Condividi", "Where I am": "Dove sono",
    "Copy a link to what you are looking at": "Copia un link a ciò che stai guardando",
    "Show a live dot where you are": "Mostra un punto dove sei",
    "Search a church, a saint, an artist, a person buried there": "Cerca una chiesa, un santo, un artista, chi vi è sepolto",
    "Churches": "Chiese", "Art": "Arte", "Buried": "Sepolti", "Saints": "Santi",
    "Other filters": "Altri filtri",
    "major_basilica": "Basilica maggiore", "basilica": "Basilica", "cathedral": "Cattedrale", "church": "Chiesa",
    "oratory": "Oratorio", "chapel": "Cappella", "unknown kind": "Tipo non indicato",
    "standing": "In uso", "former": "Non più chiesa", "ruin": "Rudere", "lost": "Scomparsa",
    "State": "Stato", "Founded": "Fondazione", "Holds": "Contiene", "District": "Zona", "Also": "Inoltre",
    "works of art": "opere d'arte", "burials": "sepolture", "a cardinal title": "un titolo cardinalizio",
    "a photo": "una foto", "opening hours": "orari", "any district": "qualsiasi zona",
    "national": "nazionale", "parish": "parrocchiale", "shrine": "santuario", "pilgrimage": "pellegrinaggio",
    "only in OpenStreetMap": "solo in OpenStreetMap", "no year recorded": "senza anno",
    "from": "da", "to": "a", "Show everything": "Mostra tutto",
    "Dot: one church; size: how many Wikipedias write about it; colour: kind; hollow: no longer a church; dashed: lost; faint: approximate position.": "Punto: una chiesa; grandezza: in quante Wikipedia compare; colore: tipo; vuoto: non più chiesa; tratteggiato: scomparsa; tenue: posizione approssimativa.",
    "{n} of {t} churches": "{n} di {t} chiese", "{n} without a position, listed but not on the map": "{n} senza posizione, in elenco ma non sulla mappa",
    "Show more": "Mostra altre", "Nothing matches.": "Nessun risultato.", "Back to the list": "Torna all'elenco",
    "Back": "Indietro", "Open the church": "Apri la chiesa", "Interior": "Interno", "Exterior": "Esterno",
    "Photo": "Foto", "From Wikipedia": "Da Wikipedia", "Read more on Wikipedia": "Continua su Wikipedia",
    "Facts": "Dati", "Dedicated to": "Dedicata a", "Architect": "Architetto", "Style": "Stile",
    "Founded or built": "Fondata o costruita", "Demolished or closed": "Demolita o chiusa",
    "Denomination": "Confessione", "Rite": "Rito", "Address": "Indirizzo", "Heritage": "Patrimonio",
    "listed as Italian cultural heritage": "tutelata come bene culturale italiano",
    "Part of": "Fa parte di", "Inside it": "Al suo interno", "Opening hours": "Orari",
    "Mass times": "Messe", "as recorded in OpenStreetMap; check before you go": "secondo OpenStreetMap; verifica prima di andare",
    "Cardinal title": "Titolo cardinalizio", "Holders recorded in Wikidata": "Titolari registrati in Wikidata",
    "What is inside": "Cosa contiene", "Shown in": "Raffigurata in", "Buried here": "Sepolti qui",
    "Links": "Link", "Sources": "Fonti", "Show all {n}": "Mostra tutti i {n}",
    "Position from OpenStreetMap: Wikidata has none.": "Posizione da OpenStreetMap: Wikidata non ne ha.",
    "This church is only in OpenStreetMap: Wikidata does not have it yet.": "Questa chiesa è solo in OpenStreetMap: Wikidata non la ha ancora.",
    "No position known: it is not on the map.": "Posizione sconosciuta: non è sulla mappa.",
    "century": "secolo", "c.": "ca.", "BC": "a.C.",
    "pope": "papa", "cardinal": "cardinale", "saint": "santo", "blessed": "beato", "venerated": "venerabile",
    "artist": "artista", "musician": "musicista", "writer": "scrittore", "clergy": "clero",
    "painting": "dipinto", "fresco": "affresco", "sculpture": "scultura", "tomb": "sepolcro", "mosaic": "mosaico",
    "altar": "altare", "object": "oggetto", "other": "altro", "architecture": "architettura", "relic": "reliquia",
    "{n} works in {c} churches": "{n} opere in {c} chiese", "{n} people in {c} churches": "{n} persone in {c} chiese",
    "{n} saints and dedications": "{n} santi e dedicazioni", "churches": "chiese", "works": "opere",
    "Works by": "Opere di", "Dedicated to:": "Dedicate a:", "Buried:": "Sepolto:",
    "Link copied": "Link copiato", "Location unavailable": "Posizione non disponibile",
    "Feast": "Festa", "Wikidata": "Wikidata", "Commons": "Commons", "Churches of Rome Wiki": "Churches of Rome Wiki",
    "everyone": "tutti", "unknown": "sconosciuto", "Popes": "Papi", "Artists": "Artisti",
    "Loading the churches...": "Caricamento delle chiese...", "The data could not be loaded. Reload the page.": "Impossibile caricare i dati. Ricarica la pagina.",
    "by fame": "per fama", "by name": "per nome", "by year": "per anno",
    "Only in the Churches of Rome Wiki. Position: the address it gives, found by OpenStreetMap Nominatim.": "Solo nella Churches of Rome Wiki. Posizione: l'indirizzo che riporta, trovato con Nominatim di OpenStreetMap.",
    "Only in the Churches of Rome Wiki. Position: the street it gives, found by OpenStreetMap Nominatim. Approximate.": "Solo nella Churches of Rome Wiki. Posizione: la via che riporta, trovata con Nominatim di OpenStreetMap. Approssimativa.",
    "Approximate.": "Approssimativa.", "yes, according to the Churches of Rome Wiki": "sì, secondo la Churches of Rome Wiki",
    "only": "solo", "all": "tutto", "Relics": "Reliquie", "only in the Churches of Rome Wiki": "solo nella Churches of Rome Wiki", "outside the walls": "fuori le mura",
    "Built": "Costruita", "Consecrated": "Consacrata", "Artists": "Artisti", "Loading...": "Caricamento...",
    "relics": "reliquie", "a long text": "un testo lungo", "Read the whole entry": "Leggi la voce completa", "In the words of the Churches of Rome Wiki": "Con le parole della Churches of Rome Wiki", "paragraphs": "paragrafi", "Text": "Testo",
    "This church is only in the Churches of Rome Wiki: no position is known, so it is not on the map.": "Questa chiesa è solo nella Churches of Rome Wiki: la posizione non è nota, quindi non è sulla mappa.", "in": "in", "Funeral monuments": "Monumenti funebri",
    "commemorated by a monument here; Wikidata does not record them as buried here": "ricordati da un monumento qui; Wikidata non li registra come sepolti qui", "Events held here": "Avvenimenti che vi si sono svolti", "event": "avvenimento",
  },
};
const EN_ONLY = { "major_basilica": "Major basilica", "basilica": "Basilica", "cathedral": "Cathedral",
  "church": "Church", "oratory": "Oratory", "chapel": "Chapel", "standing": "In use", "former": "No longer a church",
  "ruin": "Ruin", "lost": "Lost" };
let LANG = "en";
function t(s, vars) {
  let out = LANG === "en" ? (EN_ONLY[s] || s) : ((I18N[LANG] || {})[s] || EN_ONLY[s] || s);
  if (vars) for (const k in vars) out = out.replace("{" + k + "}", vars[k]);
  return out;
}
function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll(".langbtn").forEach(b => b.classList.toggle("active", b.dataset.lang === LANG));
}

// ------------------------------------------------------------------ helpers
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Wikidata writes Italian and Spanish labels in lower case ("basilica di San Pietro"); a heading is not.
function pick(n, lang = LANG) {
  if (!n) return "";
  const v = n[lang] || n.en || n.it || n.es || n.fr || Object.values(n)[0] || "";
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
}
// Wikimedia serves a fixed ladder of thumbnail widths; asking for another one is slower and throttled.
const WIDTHS = [120, 250, 330, 500, 960, 1280];
function thumb(file, w = 330) {
  w = WIDTHS.find(x => x >= w) || 1280;
  return file ? "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + w : "";
}
// Wikimedia throttles a burst of thumbnails; a failed one is asked again once, a little later.
function img(file, w, cls, loading = "lazy") {
  return file ? `<img class="${cls}" src="${thumb(file, w)}" alt="" loading="${loading}" onerror="if(!this.dataset.r){this.dataset.r=1;const s=this.src;setTimeout(()=>{this.src=s+'&r=1'},1500)}else{this.style.visibility='hidden'}">` : "";
}
function credit(file) {
  const c = DB.credits[file];
  return c ? `${t("Photo")}: ${esc(c[0])} · ${esc(c[1])} · Wikimedia Commons` : "";
}
function yearStr(y) { return y == null ? "" : y <= 0 ? `${1 - y} ${t("BC")}` : String(y); }
function centuryOf(y) { return y == null ? null : y > 0 ? Math.ceil(y / 100) : -Math.ceil((1 - y) / 100); }
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
function centuryStr(c) { return c == null ? "" : c > 0 ? `${ROMAN[c] || c} ${t("century")}` : `${ROMAN[-c] || -c} ${t("century")} ${t("BC")}`; }
function dateStr(y, prec) {
  // A Wikidata date carries its precision (CONVENTIONS.md section 4a): 9 year, 8 decade, 7 century.
  if (y == null) return "";
  if (prec != null && prec <= 7) return centuryStr(centuryOf(y));
  if (prec === 8) return `${yearStr(y)}s`;
  return yearStr(y);
}
function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => el.hidden = true, 1800); }

// ------------------------------------------------------------------ data
let DB = null, BY_ID = new Map(), CHILDREN = new Map();
const KINDS = ["major_basilica", "basilica", "cathedral", "church", "oratory", "chapel", ""];
// The liturgical colours (Víctor, 2026-10-19: "colores con relación católica"). Basilicas wear the
// cardinal red, and a major basilica is the same red with the papal gold ring around it; the
// cathedral the bishop's violet; the parish church the green of Ordinary Time, the everyday colour of
// the year; the oratory Marian blue; the chapel the rose of Gaudete and Laetare.
const KIND_COLOUR = { major_basilica: "#a3171c", basilica: "#a3171c", cathedral: "#5e2a7e", church: "#3f7d4e", oratory: "#2f5f9e", chapel: "#c56b8a", "": "#8a8178" };
const PAPAL_GOLD = "#d4a52a";
const STATUSES = ["", "former", "ruin", "lost"];
const FLAGS = ["national", "parish", "shrine", "pilgrimage", "cathedral", "osm_only", "wiki_only"];
const FLAG_LABEL = { osm_only: "only in OpenStreetMap", wiki_only: "only in the Churches of Rome Wiki" };
function flagLabel(f) { return t(FLAG_LABEL[f] || f); }

function kindKey(c) { return c.kind || ""; }
function statusKey(c) { return c.status || ""; }
function kindLabel(k) { return k ? t(k) : t("unknown kind"); }
function statusLabel(s) { return s ? t(s) : t("standing"); }

// The search text of a church: every name in every language, plus the names of what it holds.
function searchText(c) {
  const parts = [...Object.values(c.n || {}), ...(c.alt || []), c.w_artists || "", c.w_arch || ""];
  for (const q of [...(c.ded || []), ...(c.arch || []), ...(c.bur || [])]) { const p = DB.people[q]; if (p) parts.push(...Object.values(p.n || {})); }
  for (const q of c.art || []) { const w = DB.works[q]; if (w) { parts.push(...Object.values(w.n || {})); for (const a of w.by || []) { const p = DB.people[a]; parts.push(...Object.values((p && p.n) || DB.terms[a] || {})); } } }
  if (c.dist != null) parts.push(DB.districts[c.dist]);
  if (c.muni != null) parts.push(DB.districts[c.muni]);
  return fold(parts.join(" | "));
}

// ------------------------------------------------------------------ state + the one predicate
const state = {
  view: "churches", q: "", kinds: new Set(), status: new Set(), flags: new Set(), holds: new Set(),
  dist: "", yr: [null, null], by: "", ded: "", arch: "", who: "", sel: "", order: "fame",
};
const DIMENSIONS = [
  { id: "q", on: () => state.q, test: c => qMatch(c._s) },
  { id: "kind", on: () => state.kinds.size, test: c => !state.kinds.has(kindKey(c)) },
  { id: "status", on: () => state.status.size, test: c => !state.status.has(statusKey(c)) },
  { id: "flags", on: () => state.flags.size, test: c => [...state.flags].every(f => (c.flags || []).includes(f)) },
  { id: "holds", on: () => state.holds.size, test: c => [...state.holds].every(h => holds(c, h)) },
  { id: "dist", on: () => state.dist !== "", test: c => String(c.dist ?? c.muni ?? "") === state.dist || String(c.muni ?? "") === state.dist },
  // Unknown passes, or it says it did not (CHASSIS.md section 3): an undated church passes the year filter.
  { id: "yr", on: () => state.yr[0] != null || state.yr[1] != null, test: c => c.y == null || ((state.yr[0] == null || c.y >= state.yr[0]) && (state.yr[1] == null || c.y <= state.yr[1])) },
  { id: "by", on: () => state.by, test: c => (c.art || []).some(w => (DB.works[w]?.by || []).includes(state.by)) },
  { id: "ded", on: () => state.ded, test: c => (c.ded || []).includes(state.ded) },
  { id: "arch", on: () => state.arch, test: c => (c.arch || []).includes(state.arch) },
  { id: "who", on: () => state.who, test: c => (c.bur || []).includes(state.who) },
];
function holds(c, h) {
  if (h === "art") return (c.art || []).length > 0;
  if (h === "bur") return (c.bur || []).length > 0;
  if (h === "tit") return (c.tit || []).length > 0 || !!c.titular;
  if (h === "img") return !!c.img;
  if (h === "oh") return !!(c.oh || c.svc);
  if (h === "rel") return !!c.w_nrel || (c.art || []).some(w => DB.works[w]?.kind === "relic");
  if (h === "wiki") return !!c.wiki;
  return false;
}
// "brera cara" means both words; "a or b", "a, b" and "a | b" are alternatives (PRACTICES.md 2.1).
let Q_ALTS = [];
function parseQ(q) {
  q = fold(q).trim();
  if (!q) return [];
  const quoted = /^".*"$/.test(q);
  if (quoted) return [[q.slice(1, -1)]];
  return q.split(/\s+or\s+|,|\|/).map(a => a.trim().split(/\s+/).filter(Boolean)).filter(a => a.length);
}
function qMatch(s) { return Q_ALTS.some(words => words.every(w => s.includes(w))); }
function passes(c, except) {
  for (const d of DIMENSIONS) if (d.id !== except && d.on() && !d.test(c)) return false;
  return true;
}

// ------------------------------------------------------------------ map
let map, layer, meLayer, markers = new Map(), rings = new Map(), renderer;
// Size says how many Wikipedias write about the church; it shrinks when zoomed out so the centre,
// where hundreds of churches stand within a kilometre, does not become one blot.
function radius(c) {
  const z = map ? map.getZoom() : 13;
  const k = z >= 16 ? 1 : z >= 15 ? 0.8 : z >= 14 ? 0.62 : z >= 13 ? 0.5 : 0.4;
  return Math.max(2.5, (3 + Math.min(10, Math.sqrt(c.sl || 0) * 1.2)) * k);
}
function styleFor(c, sel) {
  const col = KIND_COLOUR[kindKey(c)];
  const s = statusKey(c);
  // an approximate position (a street, a "present site") is drawn faint: it says where to look, not where it is
  const faint = c.apx ? 0.45 : 1;
  return {
    radius: radius(c) + (sel ? 3 : 0), color: sel ? "#111" : (s ? col : "#fff"), weight: sel ? 3 : (s ? 2 : 1),
    opacity: faint, fillColor: col, fillOpacity: (s === "" ? 0.9 : s === "former" ? 0.25 : 0.05) * faint,
    dashArray: s === "lost" ? "3 3" : s === "ruin" ? "1 3" : null, renderer,
  };
}
function initMap() {
  renderer = L.canvas({ padding: 0.3, tolerance: 6 });
  map = L.map("map", { zoomControl: true, preferCanvas: true }).setView([41.895, 12.48], 13);
  // OpenStreetMap tiles, quietened in CSS (.leaflet-tile-pane) so the churches are what the eye finds first.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.on("zoomend", () => { for (const [id, m] of markers) { const c = BY_ID.get(id); m.setRadius(radius(c) + (id === state.sel ? 3 : 0)); } for (const [id, r] of rings) r.setRadius(radius(BY_ID.get(id)) + 4); });
  layer = L.layerGroup().addTo(map);
  meLayer = L.layerGroup().addTo(map);
  map.on("moveend", () => { if (booted) saveURL(); });
}
const TOUCH = matchMedia("(hover: none)").matches;
let tappedOnce = "";
function tipHTML(c) {
  const bits = [kindLabel(kindKey(c)), c.y != null ? dateStr(c.y, c.yp) : "", c.dist != null ? DB.districts[c.dist] : ""].filter(Boolean);
  const cnt = [(c.art || []).length ? `${c.art.length} ${t("works")}` : "", (c.bur || []).length ? `${c.bur.length} ${t("burials")}` : ""].filter(Boolean);
  return `${c.img ? `<div class="tim" style="background-image:url('${thumb(c.img, 300)}')"></div>` : ""}<b>${esc(pick(c.n) || c.id)}</b><span>${esc(bits.join(" · "))}${c.status ? " · " + esc(statusLabel(c.status)) : ""}</span>${cnt.length ? `<span>${esc(cnt.join(" · "))}</span>` : ""}${TOUCH ? `<span><a href="#" data-open="${c.id}">${t("Open the church")}</a></span>` : ""}`;
}
function drawMap(list) {
  layer.clearLayers();
  markers.clear();
  rings.clear();
  for (const c of list) {
    if (!c.ll) continue;
    const m = L.circleMarker(c.ll, styleFor(c, c.id === state.sel));
    m.bindTooltip(() => tipHTML(c), { className: "tip", direction: "top", offset: [0, -4], interactive: TOUCH });
    m.on("click", () => {
      // On touch, the first tap shows the same bubble a mouse would see; the second opens (CONVENTIONS.md 2c).
      if (TOUCH && tappedOnce !== c.id) { tappedOnce = c.id; m.openTooltip(); return; }
      tappedOnce = "";
      openCard(c.id, { push: true, pan: false });
    });
    if (kindKey(c) === "major_basilica") {
      rings.set(c.id, L.circleMarker(c.ll, { radius: radius(c) + 4, color: PAPAL_GOLD, weight: 3, fill: false, interactive: false, renderer }).addTo(layer));
    }
    m.addTo(layer);
    markers.set(c.id, m);
  }
}
document.addEventListener("click", e => {
  const a = e.target.closest("[data-open]");
  if (a) { e.preventDefault(); openCard(a.dataset.open, { push: true, pan: true }); }
});

// ------------------------------------------------------------------ the panel: chips, filters, list
function counts(except, key) {
  const out = new Map();
  for (const c of DB.churches) if (passes(c, except)) { const k = key(c); out.set(k, (out.get(k) || 0) + 1); }
  return out;
}
// "only": show just this value instead of unticking all the others. Pressed again on the value that
// is already alone, it brings everything back.
function onlyBtn(dim, v, off, all) {
  const alone = all.every(x => x === v || off.has(x)) && !off.has(v);
  return `<span class="only" data-only-${dim}="${v}" role="button" title="${esc(alone ? t("Show everything") : t("only"))}">${esc(alone ? t("all") : t("only"))}</span>`;
}
function setOnly(set, v, all) {
  const alone = all.every(x => x === v || set.has(x)) && !set.has(v);
  set.clear();
  if (!alone) for (const x of all) if (x !== v) set.add(x);
}
function renderKinds() {
  const n = counts("kind", kindKey);
  $("#kinds").innerHTML = KINDS.filter(k => n.get(k) || state.kinds.has(k)).map(k =>
    `<button type="button" class="chip ${state.kinds.has(k) ? "off" : ""}" data-kind="${k}"><span class="dot" style="background:${KIND_COLOUR[k]}${k === "major_basilica" ? `;box-shadow:0 0 0 2px ${PAPAL_GOLD}` : ""}"></span>${esc(kindLabel(k))} <span class="n">${n.get(k) || 0}</span>${onlyBtn("kind", k, state.kinds, KINDS)}</button>`).join("");
}
function renderMore() {
  const box = $("#more");
  const ns = counts("status", statusKey);
  const status = STATUSES.filter(s => ns.get(s) || state.status.has(s)).map(s => `<button type="button" class="chip ${state.status.has(s) ? "off" : ""}" data-status="${s}">${esc(statusLabel(s))} <span class="n">${ns.get(s) || 0}</span>${onlyBtn("status", s, state.status, STATUSES)}</button>`).join("");
  const holdsN = h => DB.churches.filter(c => passes(c, "holds") && holds(c, h)).length;
  const hl = [["art", "works of art"], ["bur", "burials"], ["rel", "relics"], ["tit", "a cardinal title"], ["img", "a photo"], ["oh", "opening hours"], ["wiki", "a long text"]]
    .map(([h, l]) => { const n = holdsN(h); return `<button type="button" class="chip ${state.holds.has(h) ? "on" : ""}" data-holds="${h}" ${n || state.holds.has(h) ? "" : "disabled"}>${esc(t(l))} <span class="n">${n}</span></button>`; }).join("");
  const flagN = f => DB.churches.filter(c => passes(c, "flags") && (c.flags || []).includes(f)).length;
  const fl = FLAGS.map(f => { const n = flagN(f); return `<button type="button" class="chip ${state.flags.has(f) ? "on" : ""}" data-flag="${f}" ${n || state.flags.has(f) ? "" : "disabled"}>${esc(flagLabel(f))} <span class="n">${n}</span></button>`; }).join("");
  const nd = new Map();
  for (const c of DB.churches) if (passes(c, "dist")) for (const k of new Set([c.dist, c.muni])) if (k != null) nd.set(k, (nd.get(k) || 0) + 1);
  const opts = [...nd.keys()].sort((a, b) => DB.districts[a].localeCompare(DB.districts[b]))
    .map(k => `<option value="${k}" ${String(k) === state.dist ? "selected" : ""}>${esc(DB.districts[k])} (${nd.get(k)})</option>`).join("");
  box.innerHTML = `<h4>${t("State")}</h4><div class="chips">${status}</div>
    <h4>${t("Holds")}</h4><div class="chips">${hl}</div>
    <h4>${t("Also")}</h4><div class="chips">${fl}</div>
    <h4>${t("District")}</h4><select id="dist"><option value="">${t("any district")}</option>${opts}</select>
    <h4>${t("Founded")}</h4><div class="yr-row">${t("from")} <input type="number" id="yr0" value="${state.yr[0] ?? ""}" placeholder="300"> ${t("to")} <input type="number" id="yr1" value="${state.yr[1] ?? ""}" placeholder="2026"></div>
    <p class="note">${esc(t("no year recorded"))}: ${DB.churches.filter(c => c.y == null).length}</p>`;
  const sum = [];
  if (state.status.size) sum.push(t("State"));
  for (const h of state.holds) sum.push(t({ art: "works of art", bur: "burials", rel: "relics", tit: "a cardinal title", img: "a photo", oh: "opening hours", wiki: "a long text" }[h]));
  for (const f of state.flags) sum.push(flagLabel(f));
  if (state.dist) sum.push(DB.districts[+state.dist]);
  if (state.yr[0] != null || state.yr[1] != null) sum.push(`${state.yr[0] ?? ""}–${state.yr[1] ?? ""}`);
  $("#more-sum").textContent = sum.length ? "· " + sum.join(" · ") : "";
}
function renderActive() {
  const chips = [];
  if (state.by) chips.push(["by", `${t("Works by")} ${personName(state.by)}`]);
  if (state.ded) chips.push(["ded", `${t("Dedicated to:")} ${personName(state.ded)}`]);
  if (state.arch) chips.push(["arch", `${t("Architect")}: ${personName(state.arch)}`]);
  if (state.who) chips.push(["who", `${t("Buried:")} ${personName(state.who)}`]);
  const any = chips.length || state.q || state.kinds.size || state.status.size || state.flags.size || state.holds.size || state.dist || state.arch || state.yr[0] != null || state.yr[1] != null;
  $("#active").innerHTML = chips.map(([k, l]) => `<button type="button" class="chip" data-unset="${k}">${esc(l)} ✕</button>`).join("") +
    (any ? `<button type="button" class="chip" data-unset="all">${t("Show everything")}</button>` : "");
}
function personName(q) { return pick(DB.people[q]?.n || DB.terms[q]) || q; }

let LIMIT = 150;
function sortChurches(list) {
  if (state.order === "name") return list.sort((a, b) => pick(a.n).localeCompare(pick(b.n)));
  if (state.order === "year") return list.sort((a, b) => (a.y ?? 9999) - (b.y ?? 9999));
  return list;  // the bundle arrives ordered by fame
}
function rowHTML(c) {
  const bits = [kindLabel(kindKey(c)), c.status ? statusLabel(c.status) : "", c.y != null ? dateStr(c.y, c.yp) : "", c.dist != null ? DB.districts[c.dist] : (c.muni != null ? DB.districts[c.muni] : "")].filter(Boolean);
  const cnt = [(c.art || []).length ? `🖼 ${c.art.length}` : "", (c.bur || []).length ? `✝ ${c.bur.length}` : ""].filter(Boolean).join(" ");
  return `<div class="row ${c.id === state.sel ? "sel" : ""}" data-id="${c.id}">${c.img ? `${img(c.img, 120, "thumb")}` : `<div class="thumb ph">✚</div>`}<div class="t"><b>${esc(pick(c.n) || c.id)}</b><span>${esc(bits.join(" · "))}</span></div><div class="cnt">${cnt}</div></div>`;
}
let CURRENT = [];
function render() {
  Q_ALTS = parseQ(state.q);
  CURRENT = DB.churches.filter(c => passes(c));
  renderKinds();
  if (!$("#more").hidden) renderMore(); else renderMore();
  renderActive();
  drawMap(CURRENT);
  const placeless = CURRENT.filter(c => !c.ll).length;
  $("#legend").innerHTML = `${esc(t("{n} of {t} churches", { n: CURRENT.length, t: DB.churches.length }))}. ${esc(t("Dot: one church; size: how many Wikipedias write about it; colour: kind; hollow: no longer a church; dashed: lost; faint: approximate position."))}${placeless ? " " + esc(t("{n} without a position, listed but not on the map", { n: placeless })) + "." : ""}`;
  renderList();
  saveURL();
}
function renderList() {
  const box = $("#list");
  if (state.view === "art") return renderArtists(box);
  if (state.view === "people") return renderPeople(box);
  if (state.view === "saints") return renderSaints(box);
  const list = sortChurches([...CURRENT]);
  if (!list.length) { box.innerHTML = `<p class="empty">${t("Nothing matches.")} <a href="#" data-unset="all">${t("Show everything")}</a></p>`; return; }
  const order = ["fame", "name", "year"].map(o => `<button type="button" class="chip ${state.order === o ? "on" : ""}" data-order="${o}">${t({ fame: "by fame", name: "by name", year: "by year" }[o])}</button>`).join("");
  box.innerHTML = `<div class="chips" style="padding:6px 12px">${order}</div>` + list.slice(0, LIMIT).map(rowHTML).join("") +
    (list.length > LIMIT ? `<a class="more-link" data-more="1">${t("Show more")} (${list.length - LIMIT})</a>` : "");
}
// The three index views read CURRENT, so they agree with the map and the counts (one predicate).
function renderArtists(box) {
  const agg = new Map();
  for (const c of CURRENT) for (const w of c.art || []) for (const a of DB.works[w]?.by || []) {
    const e = agg.get(a) || { works: new Set(), churches: new Set() }; e.works.add(w); e.churches.add(c.id); agg.set(a, e);
  }
  const rows = [...agg.entries()].sort((a, b) => b[1].works.size - a[1].works.size || personName(a[0]).localeCompare(personName(b[0])));
  const nw = new Set(CURRENT.flatMap(c => c.art || [])).size;
  box.innerHTML = `<p class="note" style="padding:6px 12px">${esc(t("{n} works in {c} churches", { n: nw, c: CURRENT.filter(c => (c.art || []).length).length }))}</p>` +
    rows.slice(0, 400).map(([a, e]) => { const p = DB.people[a]; return `<div class="row" data-by="${a}">${p?.img ? `${img(p.img, 120, "thumb")}` : `<div class="thumb ph">🖌</div>`}<div class="t"><b>${esc(personName(a))}</b><span>${p?.b != null || p?.d != null ? esc(`${yearStr(p.b)}–${yearStr(p.d)}`) : ""}</span></div><div class="cnt">${e.works.size} ${t("works")}<br>${e.churches.size} ${t("churches")}</div></div>`; }).join("") ||
    `<p class="empty">${t("Nothing matches.")}</p>`;
}
let PEOPLE_TAG = "";
function renderPeople(box) {
  const agg = new Map();
  for (const c of CURRENT) for (const p of c.bur || []) { const e = agg.get(p) || []; e.push(c.id); agg.set(p, e); }
  const tags = ["", "pope", "cardinal", "saint", "artist", "musician", "writer"];
  const tagN = tg => [...agg.keys()].filter(p => !tg || (DB.people[p]?.tags || []).includes(tg)).length;
  let rows = [...agg.entries()].filter(([p]) => !PEOPLE_TAG || (DB.people[p]?.tags || []).includes(PEOPLE_TAG));
  rows.sort((a, b) => (DB.people[b[0]]?.sl || 0) - (DB.people[a[0]]?.sl || 0));
  box.innerHTML = `<div class="chips" style="padding:6px 12px">${tags.map(tg => `<button type="button" class="chip ${PEOPLE_TAG === tg ? "on" : ""}" data-ptag="${tg}">${esc(tg ? t(tg) : t("everyone"))} <span class="n">${tagN(tg)}</span></button>`).join("")}</div>
    <p class="note" style="padding:0 12px">${esc(t("{n} people in {c} churches", { n: agg.size, c: CURRENT.filter(c => (c.bur || []).length).length }))}</p>` +
    rows.slice(0, 500).map(([q, cs]) => { const p = DB.people[q] || {}; const c = BY_ID.get(cs[0]); return `<div class="row" data-open="${cs[0]}">${p.img ? `${img(p.img, 120, "thumb")}` : `<div class="thumb ph">✝</div>`}<div class="t"><b>${esc(pick(p.n) || q)}${(p.tags || []).map(tg => `<span class="tag ${tg}">${esc(t(tg))}</span>`).join("")}</b><span>${esc([p.b != null || p.d != null ? `${yearStr(p.b)}–${yearStr(p.d)}` : "", pick(c?.n)].filter(Boolean).join(" · "))}</span></div></div>`; }).join("");
}
function renderSaints(box) {
  const agg = new Map();
  for (const c of CURRENT) for (const s of c.ded || []) { const e = agg.get(s) || []; e.push(c.id); agg.set(s, e); }
  const rows = [...agg.entries()].sort((a, b) => b[1].length - a[1].length || personName(a[0]).localeCompare(personName(b[0])));
  box.innerHTML = `<p class="note" style="padding:6px 12px">${esc(t("{n} saints and dedications", { n: agg.size }))}</p>` +
    rows.map(([q, cs]) => { const p = DB.people[q] || {}; return `<div class="row" data-ded="${q}">${p.img ? `${img(p.img, 120, "thumb")}` : `<div class="thumb ph">✶</div>`}<div class="t"><b>${esc(personName(q))}</b><span>${esc(pick(p.desc) || "")}</span></div><div class="cnt">${cs.length} ${t("churches")}</div></div>`; }).join("");
}

// ------------------------------------------------------------------ the record card
let SUMMARIES = null;
async function loadSummaries() {
  if (SUMMARIES) return SUMMARIES;
  try { SUMMARIES = await (await fetch(`romechurches/data/summaries.json?v=${DATA_V}`)).json(); } catch (e) { SUMMARIES = {}; }
  return SUMMARIES;
}
function pillPerson(q, data) {
  const p = DB.people[q];
  const nm = personName(q);
  return `<span class="pill ${p?.img ? "" : "noimg"}" data-${data}="${q}">${p?.img ? `<img src="${thumb(p.img, 60)}" alt="" loading="lazy">` : ""}${esc(nm)}</span>`;
}
function term(q) { return pick(DB.terms[q]) || q; }
function workCell(q) {
  const w = DB.works[q] || {};
  const by = (w.by || []).map(personName).join(", ");
  const sub = [w.kind ? t(w.kind) : "", by, dateStr(w.y, w.yp)].filter(Boolean).join(" · ");
  const href = w.wp || `https://www.wikidata.org/wiki/${q}`;
  return `<a class="cell" href="${esc(href)}" target="_blank" rel="noopener" title="${esc(w.img ? DB.credits[w.img]?.join(" · ") || "" : "")}">${w.img ? `${img(w.img, 250, "im")}` : `<div class="im ph">🖼</div>`}<b>${esc(pick(w.n) || q)}</b><span>${esc(sub)}</span></a>`;
}
function personLi(q, where) {
  const p = DB.people[q] || {};
  const href = p.wp || `https://www.wikidata.org/wiki/${q}`;
  return `<li>${p.img ? img(p.img, 120, "av") : `<div class="av"></div>`}<div class="w"><b><a href="${esc(href)}" target="_blank" rel="noopener">${esc(pick(p.n) || q)}</a></b>${(p.tags || []).map(tg => `<span class="tag ${tg}">${esc(t(tg))}</span>`).join("")}<span>${esc([p.b != null || p.d != null ? `${yearStr(p.b)}–${yearStr(p.d)}` : "", pick(p.desc)].filter(Boolean).join(" · "))}</span>${where ? `<span>${where}</span>` : ""}</div></li>`;
}
let heroInterior = false;
async function renderCard(c) {
  const box = $("#card");
  const otherNames = [...new Set([...Object.entries(c.n || {}).filter(([l]) => l !== LANG).map(([, v]) => v), ...(c.alt || [])])].filter(v => v.toLowerCase() !== pick(c.n).toLowerCase()).slice(0, 4);
  const hero = heroInterior && c.int ? c.int : (c.img || c.int);
  const badges = [`<span class="badge" style="background:${KIND_COLOUR[kindKey(c)]};color:#fff${kindKey(c) === "major_basilica" ? `;box-shadow:0 0 0 2px ${PAPAL_GOLD}` : ""}">${esc(kindLabel(kindKey(c)))}</span>`,
    c.status ? `<span class="badge ${c.status}">${esc(statusLabel(c.status))}</span>` : "",
    ...(c.flags || []).filter(f => f !== "cathedral").map(f => `<span class="badge">${esc(flagLabel(f))}</span>`)].join("");
  const place = [c.dist != null ? DB.districts[c.dist] : "", c.muni != null ? DB.districts[c.muni] : "", c.zone ? `${t("outside the walls")}, ${c.zone}` : ""].filter(Boolean).join(" · ");
  const facts = [];
  if (c.ded?.length) facts.push([t("Dedicated to"), c.ded.map(q => pillPerson(q, "ded")).join("")]);
  if (c.y != null) facts.push([t("Founded or built"), esc(dateStr(c.y, c.yp))]);
  if (c.ydis != null) facts.push([t("Demolished or closed"), esc(yearStr(c.ydis))]);
  if (c.arch?.length) facts.push([t("Architect"), c.arch.map(q => pillPerson(q, "archf")).join("")]);
  if (c.style?.length) facts.push([t("Style"), esc(c.style.map(term).join(", "))]);
  if (c.rel?.length || c.denom) facts.push([t("Denomination"), esc(c.rel?.length ? c.rel.map(term).join(", ") : c.denom)]);
  if (c.rite?.length) facts.push([t("Rite"), esc(c.rite.map(term).join(", "))]);
  if (c.her) facts.push([t("Heritage"), esc(t("listed as Italian cultural heritage"))]);
  if (c.addr) facts.push([t("Address"), esc(c.addr)]);
  if (c.titular && !(c.tit || []).length) facts.push([t("Cardinal title"), esc(t("yes, according to the Churches of Rome Wiki"))]);
  if (c.part?.length) facts.push([t("Part of"), c.part.map(p => `<a href="#" data-open="${p}">${esc(pick(BY_ID.get(p)?.n) || p)}</a>`).join(", ")]);
  const kids = CHILDREN.get(c.id) || [];
  if (kids.length) facts.push([t("Inside it"), kids.map(p => `<a href="#" data-open="${p}">${esc(pick(BY_ID.get(p)?.n) || p)}</a>`).join(", ")]);
  if (c.w_built && c.y == null) facts.push([t("Built"), esc(c.w_built) + ` <span class="note">(${esc(t("Churches of Rome Wiki"))})</span>`]);
  if (c.w_cons) facts.push([t("Consecrated"), esc(c.w_cons)]);
  if (c.w_arch && !c.arch?.length) facts.push([t("Architect"), esc(c.w_arch)]);
  if (c.w_ded && !c.ded?.length) facts.push([t("Dedicated to"), esc(c.w_ded)]);
  if (c.w_artists) facts.push([t("Artists"), esc(c.w_artists)]);
  if (c.w_addr && !c.addr) facts.push([t("Address"), esc(c.w_addr)]);
  if (c.oh) facts.push([t("Opening hours"), `<span class="hours">${esc(c.oh)}</span><div class="note">${esc(t("as recorded in OpenStreetMap; check before you go"))}</div>`]);
  if (c.svc) facts.push([t("Mass times"), `<span class="hours">${esc(c.svc)}</span><div class="note">${esc(t("as recorded in OpenStreetMap; check before you go"))}</div>`]);
  const where = c.id.startsWith("wiki:") && !c.ll ? t("This church is only in the Churches of Rome Wiki: no position is known, so it is not on the map.")
    : c.cs === "address" ? t("Only in the Churches of Rome Wiki. Position: the address it gives, found by OpenStreetMap Nominatim.") + (c.apx ? " " + t("Approximate.") : "")
    : c.cs === "street" ? t("Only in the Churches of Rome Wiki. Position: the street it gives, found by OpenStreetMap Nominatim. Approximate.")
    : !c.ll ? t("No position known: it is not on the map.") : c.id.startsWith("osm:") ? t("This church is only in OpenStreetMap: Wikidata does not have it yet.") : c.cs === "osm" ? t("Position from OpenStreetMap: Wikidata has none.") : "";
  const relics = (c.art || []).filter(w => DB.works[w]?.kind === "relic");
  const events = [...(c.ev || [])].sort((a, b) => (DB.works[a]?.y ?? 9999) - (DB.works[b]?.y ?? 9999));
  const art = (c.art || []).filter(w => DB.works[w]?.kind !== "relic").sort((a, b) => (DB.works[b]?.sl || 0) - (DB.works[a]?.sl || 0) || (DB.works[b]?.img ? 1 : 0) - (DB.works[a]?.img ? 1 : 0));
  const dep = [...(c.dep || [])].sort((a, b) => (DB.works[a]?.y ?? 9999) - (DB.works[b]?.y ?? 9999));
  const bur = [...(c.bur || [])].sort((a, b) => (DB.people[b]?.sl || 0) - (DB.people[a]?.sl || 0));
  const titles = (c.tit || []).map(q => DB.titles[q]).filter(Boolean);
  const wpLinks = Object.entries(c.wp || {}).map(([l, ti]) => `<a href="https://${l}.wikipedia.org/wiki/${encodeURIComponent(ti.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia ${l.toUpperCase()}</a>`);
  const links = [...wpLinks,
    c.id.startsWith("Q") ? `<a href="https://www.wikidata.org/wiki/${c.id}" target="_blank" rel="noopener">Wikidata</a>` : "",
    c.cat ? `<a href="https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(c.cat.replace(/ /g, "_"))}" target="_blank" rel="noopener">Commons</a>` : "",
    c.osm ? `<a href="https://www.openstreetmap.org/${{ n: "node", w: "way", r: "relation" }[c.osm[0]]}/${c.osm.slice(1)}" target="_blank" rel="noopener">OpenStreetMap</a>` : "",
    c.ids?.beweb ? `<a href="https://www.beweb.chiesacattolica.it/edificidiculto/edificio/${encodeURIComponent(c.ids.beweb)}/" target="_blank" rel="noopener">BeWeB</a>` : "",
    c.ids?.gcatholic ? `<a href="https://gcatholic.org/churches/${esc(c.ids.gcatholic)}" target="_blank" rel="noopener">GCatholic</a>` : "",
    c.wiki ? `<a href="https://romanchurches.fandom.com/wiki/${encodeURIComponent(c.wiki.replace(/ /g, "_"))}" target="_blank" rel="noopener">${t("Churches of Rome Wiki")}</a>` : "",
    c.web ? `<a href="${esc(c.web)}" target="_blank" rel="noopener">Web</a>` : "",
  ].filter(Boolean);
  const show = (arr, n) => arr.length > n ? arr.slice(0, n) : arr;
  box.innerHTML = `<div class="card-top"><button type="button" class="chip btn" data-close="1">← ${t("Back to the list")}</button></div>
    ${hero ? `<div class="card-hero">${img(hero, 960, "", "eager")}${c.img && c.int ? `<button type="button" class="chip btn swap" data-swap="1">${heroInterior ? t("Exterior") : t("Interior")}</button>` : ""}</div><div class="credit">${credit(hero)}</div>` : ""}
    <h2>${esc(pick(c.n) || c.id)}</h2>
    ${otherNames.length ? `<div class="alt">${esc(otherNames.join(" · "))}</div>` : ""}
    <div class="meta">${badges} ${esc(place)}</div>
    ${where ? `<p class="note" style="margin:4px 12px">${esc(where)}</p>` : ""}
    <div class="summary" id="summary">${pick(c.desc) ? `<span class="note">${esc(pick(c.desc))}</span>` : ""}</div>
    ${c.wiki ? `<div class="sec" id="wiki"><h3>${t("Churches of Rome Wiki")}</h3><p class="note">${t("Loading...")}</p></div>` : ""}
    ${facts.length ? `<div class="sec"><h3>${t("Facts")}</h3><table class="facts">${facts.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("")}</table></div>` : ""}
    ${art.length ? `<div class="sec"><h3>${t("What is inside")} · ${art.length}</h3><div class="grid">${show(art, 60).map(workCell).join("")}</div></div>` : ""}
    ${relics.length || c.w_nrel ? `<div class="sec"><h3>${t("Relics")}</h3>${relics.length ? `<div class="grid">${relics.map(workCell).join("")}</div>` : ""}<div id="w-rel"></div></div>` : ""}
    ${!bur.length && c.w_nbur ? `<div class="sec"><h3>${t("Buried here")}</h3><div id="w-bur"></div></div>` : ""}
    ${bur.length ? `<div class="sec"><h3>${t("Buried here")} · ${bur.length}</h3><div id="w-bur"></div><ul class="people">${show(bur, 80).map(q => personLi(q, c.bvia?.[q] ? esc(t("in")) + " " + esc(term(c.bvia[q])) : "")).join("")}</ul>${bur.length > 80 ? `<p class="note">${t("Show all {n}", { n: bur.length })}: <a href="#" data-view-people="1">${t("Buried")}</a></p>` : ""}</div>` : ""}
    ${(c.mon || []).length ? `<div class="sec"><h3>${t("Funeral monuments")} · ${c.mon.length}</h3><p class="note">${esc(t("commemorated by a monument here; Wikidata does not record them as buried here"))}</p><ul class="people">${c.mon.map(q => personLi(q, c.mon_by?.[q] ? esc(pick(DB.works[c.mon_by[q]]?.n)) : "")).join("")}</ul></div>` : ""}
    ${titles.map(ti => `<div class="sec"><h3>${t("Cardinal title")}: ${esc(pick(ti.n))}</h3>${ti.h.length ? `<p class="note">${t("Holders recorded in Wikidata")}</p><ul class="people">${ti.h.map(h => `<li>${DB.people[h.p]?.img ? img(DB.people[h.p].img, 120, "av") : `<div class="av"></div>`}<div class="w"><b>${esc(personName(h.p))}</b><span>${esc([term(h.pos), h.s != null || h.e != null ? `${yearStr(h.s)}–${yearStr(h.e)}` : ""].filter(Boolean).join(" · "))}</span></div></li>`).join("")}</ul>` : ""}</div>`).join("")}
    ${events.length ? `<div class="sec"><h3>${t("Events held here")} · ${events.length}</h3><ul class="people">${events.map(q => { const w = DB.works[q] || {}; return `<li><div class="w"><b><a href="${esc(w.wp || "https://www.wikidata.org/wiki/" + q)}" target="_blank" rel="noopener">${esc(pick(w.n) || q)}</a></b><span>${esc(dateStr(w.y, w.yp))}</span></div></li>`; }).join("")}</ul></div>` : ""}
    ${dep.length ? `<div class="sec"><h3>${t("Shown in")} · ${dep.length}</h3><div class="grid">${show(dep, 30).map(workCell).join("")}</div></div>` : ""}
    <div class="sec"><h3>${t("Links")}</h3><div class="links">${links.join("")}</div></div>
    <div class="sec"><h3>${t("Sources")}</h3><p class="note">Wikidata (CC0) · OpenStreetMap (ODbL) · Wikipedia (CC BY-SA) · Wikimedia Commons · Churches of Rome Wiki (CC BY-SA)</p></div>`;
  box.scrollTop = 0;
  if (c.wiki) loadWiki(c);
  const s = await loadSummaries();
  const sm = s[c.id];
  if (sm && state.sel === c.id) {
    const lang = sm[LANG] ? LANG : sm.en ? "en" : sm.it ? "it" : Object.keys(sm)[0];
    const ti = (c.wp || {})[lang];
    $("#summary").innerHTML = `${esc(sm[lang])}<span class="src">${t("From Wikipedia")} (${lang.toUpperCase()}, CC BY-SA)${ti ? ` · <a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(ti.replace(/ /g, "_"))}" target="_blank" rel="noopener">${t("Read more on Wikipedia")}</a>` : ""}</span>`;
  }
}
// The wiki's long text lives in 32 shards (build.py shard_of), fetched when a card needs one.
const WIKI = new Map();
function shardOf(id) { let n = 0; for (const ch of id) n += ch.codePointAt(0); return n % 32; }
async function loadWiki(c) {
  const k = shardOf(c.id);
  try {
    if (!WIKI.has(k)) WIKI.set(k, await (await fetch(`romechurches/data/wiki/${k}.json?v=${DATA_V}`)).json());
  } catch (e) { WIKI.set(k, {}); }
  const tx = WIKI.get(k)[c.id];
  const box = $("#wiki");
  if (!box || state.sel !== c.id) return;
  if (!tx || !tx.p.length) { box.remove(); return; }
  const lead = tx.p.filter(([h]) => !h).slice(0, 3);
  const rest = tx.p.slice(lead.length ? tx.p.findIndex(([h]) => h) : 0);
  let html = lead.map(([, p]) => `<p class="wtext">${esc(p)}</p>`).join("");
  if (rest.length && tx.p.some(([h]) => h)) {
    let body = "", last = null;
    for (const [h, p] of rest) { if (h !== last) { body += `<h4>${esc(h)}</h4>`; last = h; } body += `<p class="wtext">${esc(p)}</p>`; }
    html += `<details class="wmore"><summary>${t("Read the whole entry")} (${rest.length} ${t("paragraphs")})</summary>${body}</details>`;
  }
  const quotes = (id, list) => { const el = $(id); if (el && list?.length) el.innerHTML = `<details class="wmore"${list.length <= 3 ? " open" : ""}><summary>${t("In the words of the Churches of Rome Wiki")} (${list.length})</summary>${list.map(x => `<p class="wtext quote">${esc(x)}</p>`).join("")}</details>`; };
  quotes("#w-rel", tx.rel);
  quotes("#w-bur", tx.bur);
  html += `<p class="note">${t("Text")}: Churches of Rome Wiki, CC BY-SA · <a href="https://romanchurches.fandom.com/wiki/${encodeURIComponent(tx.t.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(tx.t)}</a></p>`;
  box.innerHTML = `<h3>${t("Churches of Rome Wiki")}</h3>` + html;
}
let listScroll = 0;
function openCard(id, { push = true, pan = true } = {}) {
  const c = BY_ID.get(id);
  if (!c) return;
  if (!state.sel) listScroll = $("#list").scrollTop;
  const prev = state.sel;
  state.sel = id;
  heroInterior = false;
  $("#panel-list").hidden = true;
  $("#card").hidden = false;
  renderCard(c);
  restyle(prev); restyle(id);
  if (pan && c.ll && map && !map.getBounds().pad(-0.15).contains(c.ll)) map.panTo(c.ll);
  // on a phone the card is below the map: bring its top into view
  if (matchMedia("(max-width: 640px)").matches) $("#panel").scrollIntoView({ block: "start" });
  saveURL(push);
}
function closeCard(push = true) {
  const prev = state.sel;
  state.sel = "";
  $("#card").hidden = true;
  $("#panel-list").hidden = false;
  restyle(prev);
  renderList();
  $("#list").scrollTop = listScroll;
  saveURL(push);
}
function restyle(id) {
  const m = markers.get(id), c = BY_ID.get(id);
  if (m && c) { m.setStyle(styleFor(c, id === state.sel)); m.setRadius(radius(c) + (id === state.sel ? 3 : 0)); if (id === state.sel) m.bringToFront(); }
}

// ------------------------------------------------------------------ URL: every screen is a link
let booted = false;
function saveURL(push = false) {
  if (!booted) return;
  const p = new URLSearchParams();
  if (state.view !== "churches") p.set("view", state.view);
  if (state.sel) p.set("c", state.sel);
  if (state.q) p.set("q", state.q);
  if (state.kinds.size) p.set("nk", [...state.kinds].map(k => k || "none").join(","));
  if (state.status.size) p.set("ns", [...state.status].map(k => k || "standing").join(","));
  if (state.flags.size) p.set("f", [...state.flags].join(","));
  if (state.holds.size) p.set("h", [...state.holds].join(","));
  if (state.dist) p.set("d", state.dist);
  if (state.yr[0] != null || state.yr[1] != null) p.set("yr", `${state.yr[0] ?? ""},${state.yr[1] ?? ""}`);
  for (const k of ["by", "ded", "arch", "who"]) if (state[k]) p.set(k, state[k]);
  if (LANG !== "en") p.set("lang", LANG);
  if (map) { const c = map.getCenter(); p.set("mv", `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${map.getZoom()}`); }
  const url = location.pathname + (p.toString() ? "?" + p.toString().replace(/%2C/g, ",") : "");
  if (url === location.pathname + location.search) return;
  // A move pushes a history step, a refinement replaces it (PRACTICES.md 2.3).
  (push ? history.pushState : history.replaceState).call(history, null, "", url);
}
function readURL() {
  const p = new URLSearchParams(location.search);
  state.view = p.get("view") || "churches";
  state.q = p.get("q") || "";
  state.kinds = new Set((p.get("nk") || "").split(",").filter(Boolean).map(k => k === "none" ? "" : k));
  state.status = new Set((p.get("ns") || "").split(",").filter(Boolean).map(k => k === "standing" ? "" : k));
  state.flags = new Set((p.get("f") || "").split(",").filter(Boolean));
  state.holds = new Set((p.get("h") || "").split(",").filter(Boolean));
  state.dist = p.get("d") || "";
  const yr = (p.get("yr") || ",").split(",");
  state.yr = [yr[0] === "" ? null : +yr[0], yr[1] === "" || yr[1] == null ? null : +yr[1]];
  for (const k of ["by", "ded", "arch", "who"]) state[k] = p.get(k) || "";
  const mv = (p.get("mv") || "").split(",").map(Number);
  return { sel: p.get("c") || "", mv: mv.length === 3 && mv.every(Number.isFinite) ? mv : null };
}
function pickLang() {
  const p = new URLSearchParams(location.search).get("lang");
  let stored = null;
  try { stored = localStorage.getItem("rc.lang"); } catch (e) { /* private mode */ }
  const nav = (navigator.language || "en").slice(0, 2);
  for (const l of [p, stored, nav]) if (["en", "es", "it"].includes(l)) return l;
  return "en";
}

// ------------------------------------------------------------------ events
function wire() {
  let qTimer;
  $("#q").addEventListener("input", e => {
    $("#q-clear").hidden = !e.target.value;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = e.target.value; LIMIT = 150; render(); }, 140);
  });
  const clearQ = () => { $("#q").value = ""; $("#q-clear").hidden = true; state.q = ""; render(); };
  $("#q-clear").addEventListener("click", clearQ);
  $("#q").addEventListener("keydown", e => { if (e.key === "Escape") clearQ(); });
  $("#views").addEventListener("click", e => {
    const b = e.target.closest("[data-view]"); if (!b) return;
    state.view = b.dataset.view;
    document.querySelectorAll(".view-btn").forEach(x => x.classList.toggle("active", x === b));
    if (state.sel) closeCard(false);
    renderList(); saveURL(true);
  });
  $("#more-btn").addEventListener("click", () => {
    const box = $("#more"); box.hidden = !box.hidden; $("#more-btn").setAttribute("aria-expanded", String(!box.hidden));
  });
  $("#panel").addEventListener("click", e => {
    const only = e.target.closest("[data-only-kind],[data-only-status]");
    if (only) {
      e.stopPropagation();
      if (only.dataset.onlyKind !== undefined) setOnly(state.kinds, only.dataset.onlyKind, KINDS);
      else setOnly(state.status, only.dataset.onlyStatus, STATUSES);
      LIMIT = 150; render(); return;
    }
    const el = e.target.closest("[data-kind],[data-status],[data-flag],[data-holds],[data-unset],[data-id],[data-more],[data-order],[data-by],[data-ded],[data-archf],[data-ptag],[data-close],[data-swap],[data-view-people]");
    if (!el) return;
    const d = el.dataset;
    if (d.kind !== undefined) { state.kinds.has(d.kind) ? state.kinds.delete(d.kind) : state.kinds.add(d.kind); }
    else if (d.status !== undefined) { state.status.has(d.status) ? state.status.delete(d.status) : state.status.add(d.status); }
    else if (d.flag) { state.flags.has(d.flag) ? state.flags.delete(d.flag) : state.flags.add(d.flag); }
    else if (d.holds) { state.holds.has(d.holds) ? state.holds.delete(d.holds) : state.holds.add(d.holds); }
    else if (d.unset) {
      e.preventDefault();
      if (d.unset === "all") { Object.assign(state, { q: "", kinds: new Set(), status: new Set(), flags: new Set(), holds: new Set(), dist: "", yr: [null, null], by: "", ded: "", arch: "", who: "" }); $("#q").value = ""; $("#q-clear").hidden = true; }
      else state[d.unset] = "";
    }
    else if (d.id) { openCard(d.id, { push: true, pan: true }); return; }
    else if (d.more) { LIMIT += 300; renderList(); return; }
    else if (d.order) { state.order = d.order; renderList(); return; }
    else if (d.by) { state.by = d.by; state.view = "churches"; syncViews(); clearSearchOnJump(); if (state.sel) closeCard(false); }
    else if (d.archf) { state.arch = d.archf; state.view = "churches"; syncViews(); clearSearchOnJump(); if (state.sel) closeCard(false); }
    else if (d.ded) { state.ded = d.ded; state.view = "churches"; syncViews(); clearSearchOnJump(); if (state.sel) closeCard(false); }
    else if (d.ptag !== undefined) { PEOPLE_TAG = d.ptag; renderList(); return; }
    else if (d.close) { closeCard(true); return; }
    else if (d.swap) { heroInterior = !heroInterior; renderCard(BY_ID.get(state.sel)); return; }
    else if (d.viewPeople) { e.preventDefault(); state.who = ""; state.view = "people"; syncViews(); closeCard(true); }
    else return;
    LIMIT = 150; render();
  });
  $("#panel").addEventListener("change", e => {
    if (e.target.id === "dist") { state.dist = e.target.value; render(); }
    if (e.target.id === "yr0" || e.target.id === "yr1") {
      const v = e.target.value === "" ? null : +e.target.value;
      state.yr[e.target.id === "yr0" ? 0 : 1] = Number.isFinite(v) ? v : null; render();
    }
  });
  $("#langsel").addEventListener("click", e => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    LANG = b.dataset.lang;
    try { localStorage.setItem("rc.lang", LANG); } catch (err) { /* private mode */ }
    applyI18n(); render();
    if (state.sel) renderCard(BY_ID.get(state.sel));
  });
  $("#share-view").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast(t("Link copied")); } catch (e) { prompt("", location.href); }
  });
  $("#locate").addEventListener("click", locate);
  document.querySelector(".brand").addEventListener("click", e => {
    e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload();
  });
  window.addEventListener("popstate", () => {
    const { sel, mv } = readURL();
    $("#q").value = state.q;
    syncViews();
    render();
    if (sel) openCard(sel, { push: false, pan: true }); else if (state.sel) closeCard(false);
    if (mv) map.setView([mv[0], mv[1]], mv[2], { animate: false });
  });
  // the panel edge can be dragged, and the width is remembered on this device
  const handle = $("#resize");
  handle.addEventListener("pointerdown", e => {
    handle.setPointerCapture(e.pointerId);
    const move = ev => { const w = Math.max(300, Math.min(window.innerWidth * 0.7, ev.clientX)); document.documentElement.style.setProperty("--panel-w", w + "px"); };
    const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); map.invalidateSize(); try { localStorage.setItem("rc.panelw", getComputedStyle(document.documentElement).getPropertyValue("--panel-w")); } catch (err) { /* private mode */ } };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
  });
  try { const w = localStorage.getItem("rc.panelw"); if (w) document.documentElement.style.setProperty("--panel-w", w); } catch (e) { /* private mode */ }
}
function syncViews() { document.querySelectorAll(".view-btn").forEach(x => x.classList.toggle("active", x.dataset.view === state.view)); }
function clearSearchOnJump() { state.q = ""; $("#q").value = ""; $("#q-clear").hidden = true; }

// "Where I am": a live dot, first fit to the reader and the churches around them.
let watchId = null, meMarker = null, firstFix = true;
function locate() {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; meLayer.clearLayers(); meMarker = null; $("#locate").classList.remove("on"); return; }
  if (!navigator.geolocation) return toast(t("Location unavailable"));
  firstFix = true;
  $("#locate").classList.add("on");
  watchId = navigator.geolocation.watchPosition(pos => {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if (!meMarker) meMarker = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [14, 14] }), interactive: false }).addTo(meLayer);
    else meMarker.setLatLng(ll);
    if (firstFix) { firstFix = false; map.setView(ll, Math.max(map.getZoom(), 16)); }
  }, () => { toast(t("Location unavailable")); $("#locate").classList.remove("on"); watchId = null; }, { enableHighAccuracy: true, maximumAge: 15000 });
}

// ------------------------------------------------------------------ boot
async function boot() {
  $("#build").textContent = `v${DATA_V} · ${BUILD_AT}`;
  LANG = pickLang();
  applyI18n();
  $("#list").innerHTML = `<p class="loading">${t("Loading the churches...")}</p>`;
  initMap();
  wire();
  try {
    DB = await (await fetch(`romechurches/data/churches.json?v=${DATA_V}`)).json();
  } catch (e) {
    $("#list").innerHTML = `<p class="empty">${t("The data could not be loaded. Reload the page.")}</p>`;
    return;
  }
  for (const c of DB.churches) {
    BY_ID.set(c.id, c);
    for (const p of c.part || []) { if (!CHILDREN.has(p)) CHILDREN.set(p, []); CHILDREN.get(p).push(c.id); }
  }
  for (const c of DB.churches) c._s = searchText(c);
  const { sel, mv } = readURL();
  $("#q").value = state.q; $("#q-clear").hidden = !state.q;
  syncViews();
  if (mv) map.setView([mv[0], mv[1]], mv[2], { animate: false });
  booted = true;
  render();
  if (sel) openCard(sel, { push: false, pan: !mv });
}
boot();
