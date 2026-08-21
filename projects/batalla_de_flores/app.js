/* Batalla de Flores · Laredo
 *
 * Front sin dependencias sobre `data/batalla_de_flores.json`.
 * Dos paneles con scroll propio: indice (anos / grupos / recorridos) y detalle.
 * Todo lo que se pinta lleva su procedencia: cada carroza enlaza a la pagina
 * de la que salio y muestra el `source_type` con el que la marco el pipeline.
 */

const els = {
  build: document.getElementById("build"),
  stats: document.getElementById("stats"),
  search: document.getElementById("search"),
  decade: document.getElementById("decade"),
  status: document.getElementById("status"),
  rankedOnly: document.getElementById("ranked-only"),
  clearFilters: document.getElementById("clear-filters"),
  tabs: document.querySelectorAll(".tab"),
  indexCount: document.getElementById("index-count"),
  indexTools: document.getElementById("index-tools"),
  indexBody: document.getElementById("index-body"),
  legend: document.getElementById("legend"),
  detail: document.getElementById("detail"),
  home: document.getElementById("home"),
  detailClose: document.getElementById("detail-close"),
  faq: document.getElementById("faq"),
  shareSite: document.getElementById("share-site"),
};

const state = {
  dataset: null,
  editions: [],
  groups: [],
  floats: [],   // indice plano para la pestana Carrozas
  floatView: "grid",   // "grid" | "list": entra por las fotos, que es lo que engancha
  category: null,      // filtro de la pestana Carrozas: "A" | "B" | null
  statsCategory: "all",   // "all" | "A" | "B" en el grafico de trayectorias
  editionCategory: "A",   // categoria visible en el palmares de una edicion
  routes: [],
  map: null,          // plano (calles, manzanas, verde): llega aparte
  mapAttribution: null,
  filtered: [],
  mode: "editions",
  selection: null, // {kind: "year"|"group"|"route", id}
  query: "",
  decade: "all",
  status: "all",
  rankedOnly: false,
  sort: { groups: { key: "wins", dir: -1 }, floats: { key: "year", dir: -1 } },
  openDecade: null,   // solo se usa en movil: una decada desplegada a la vez
};

const NARROW = window.matchMedia("(max-width: 900px)");
const isNarrow = () => NARROW.matches;

/* ── utilidades ─────────────────────────────────────────────────────────── */

function esc(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  }[char]));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

function slugifyGroup(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function num(value) {
  return new Intl.NumberFormat("es-ES").format(value ?? 0);
}

const STATUS_LABEL = {
  published: "Publicada",
  planned: "Prevista",
  cancelled: "Cancelada",
  not_held: "No celebrada",
  unknown: "Hueco documental",
};

/* `coverage` responde a "de donde sale", no a "cuanto hay". Se muestra como
 * chip en el detalle. Ojo con "official_only": significa una sola fuente, no
 * poca informacion; de hecho esos anos traen mas carrozas que muchos "strong". */
const COVERAGE_LABEL = {
  strong: "Archivo completo",
  partial: "Archivo parcial",
  // Las dos variantes oficiales dicen lo mismo: viene del Ayuntamiento. Cuanto
  // hay lo dice el color de la rejilla y los contadores, no esta etiqueta.
  official_only: "Fuente oficial",
  official_partial: "Fuente oficial",
  cancelled: "Cancelada",
  no_event: "Sin edición",
  missing: "Sin documentar",
};

/* La rejilla colorea por CUANTO hay, que es lo que el visitante quiere saber,
 * y se calcula del contenido real para que no pueda contradecirlo. */
const TIERS = [
  ["tier-full", "Palmarés completo"],
  ["tier-partial", "Datos parciales"],
  ["tier-planned", "Aún por celebrar"],
  ["tier-none", "Sin datos"],
];

function coverageTier(edition) {
  // La proxima edicion no es un hueco documental: no ha pasado todavia. Va en
  // naranja para que no se confunda con las canceladas ni con las vacias.
  if (edition.status === "planned") return "tier-planned";
  const floats = edition.floats || [];
  if (!floats.length) return "tier-none";
  const ranked = floats.filter(entry => entry.position != null).length;
  return ranked >= 5 ? "tier-full" : "tier-partial";
}

/* De donde sale cada entrada. Se muestra tal cual en el detalle para que se
 * vea que un palmares de 1931 y un resultado de 2024 no valen lo mismo. */
const SOURCE_LABEL = {
  archive_palmares: "Palmarés del archivo",
  archive_float_page: "Ficha de carroza",
  official_result: "Resultado oficial",
  official_result_summary: "Resumen oficial",
  manual_seed: "Transcrito a mano",
  press_photo: "Prensa (pie de foto)",
};

/* Version corta para las tablas del panel de detalle, que es estrecho.
 * El nombre completo queda en el tooltip y en el bloque de procedencia. */
const SOURCE_SHORT = {
  archive_palmares: "PAL",
  archive_float_page: "FICHA",
  official_result: "OFI",
  official_result_summary: "RES",
  manual_seed: "MAN",
  press_photo: "PRE",
};

function sourceShort(sourceType) {
  if (!sourceType) return "–";
  return sourceType
    .split("+")
    .map(part => SOURCE_SHORT[part] || part)
    .filter((part, index, list) => list.indexOf(part) === index)
    .join("·");
}

function sourceLabel(sourceType) {
  if (!sourceType) return "Sin marcar";
  return sourceType
    .split("+")
    .map(part => SOURCE_LABEL[part] || part)
    .filter((part, index, list) => list.indexOf(part) === index)
    .join(" + ");
}

function coverageClass(edition) {
  return coverageTier(edition);
}

function routeForYear(year) {
  return state.routes.find(route => year >= route.start_year && year <= route.end_year) || null;
}

function yearRange(from, to) {
  return from === to ? String(from) : `${from}–${to}`;
}

/* ── indice de busqueda ─────────────────────────────────────────────────── */

function buildSearchIndex(edition) {
  const pieces = [
    edition.year, edition.edition_label, edition.status, edition.coverage,
    ...(edition.notes || []),
    ...(edition.floats || []).flatMap(item => [item.name, item.group_canonical, item.group_raw]),
  ];
  return normalizeText(pieces.filter(Boolean).join(" "));
}

function applyFilters() {
  const query = normalizeText(state.query);
  state.filtered = state.editions.filter(edition => {
    if (state.decade !== "all" && Math.floor(edition.year / 10) * 10 !== Number(state.decade)) return false;
    if (state.status !== "all" && edition.status !== state.status) return false;
    if (state.rankedOnly && !(edition.result_count > 0)) return false;
    if (query && !edition.searchIndex.includes(query)) return false;
    return true;
  });
}

/* Todas las carrozas en una sola lista, para la pestana de tabla. Se construye
 * una vez al cargar: 724 filas recorridas en cada teclazo del buscador seria
 * tonteria. */
function buildFloatIndex(editions) {
  return editions.flatMap(edition =>
    (edition.floats || []).map(entry => ({
      ...entry,
      year: edition.year,
      search: normalizeText(`${entry.name} ${entry.group_canonical || ""}`),
    })));
}

function filteredFloats() {
  const query = normalizeText(state.query);
  const visibleYears = new Set(state.filtered.map(edition => edition.year));
  return state.floats.filter(entry =>
    visibleYears.has(entry.year)
    && (!state.category || entry.category === state.category)
    && (!query || entry.search.includes(query)));
}

function filteredGroups() {
  const query = normalizeText(state.query);
  const visibleYears = new Set(state.filtered.map(edition => edition.year));
  return state.groups
    .map(group => {
      const years = (group.years || []).filter(year => visibleYears.has(year));
      return { ...group, visibleYears: years };
    })
    .filter(group => group.visibleYears.length > 0)
    .filter(group => !query || normalizeText(group.canonical_name).includes(query)
      || (group.aliases || []).some(alias => normalizeText(alias).includes(query)));
}

/* ── cabecera ───────────────────────────────────────────────────────────── */

function renderStats() {
  const summary = state.dataset.summary || {};
  els.stats.innerHTML = [
    `<span><b>${num(summary.edition_count)}</b> ediciones</span>`,
    `<span><b>${num(summary.float_count)}</b> carrozas</span>`,
    `<span><b>${num(summary.group_count)}</b> grupos</span>`,
  ].join("");
  const version = state.dataset.version ? `v${state.dataset.version}` : "sin versión";
  els.build.textContent = `${version} · ${state.dataset.built_at || state.dataset.updated_at || "s/f"}`;
}

function renderFilterOptions() {
  const decades = [...new Set(state.editions.map(edition => Math.floor(edition.year / 10) * 10))].sort();
  els.decade.innerHTML = ['<option value="all">Todas las décadas</option>']
    .concat(decades.map(decade => `<option value="${decade}">${decade}s</option>`)).join("");

  const statuses = [...new Set(state.editions.map(edition => edition.status))];
  els.status.innerHTML = ['<option value="all">Todos los estados</option>']
    .concat(statuses.map(value => `<option value="${esc(value)}">${esc(STATUS_LABEL[value] || value)}</option>`)).join("");
}

function renderLegend() {
  if (state.mode !== "editions") { els.legend.hidden = true; return; }
  els.legend.hidden = false;
  const counts = new Map(TIERS.map(([cls]) => [cls, 0]));
  state.filtered.forEach(edition => {
    const tier = coverageTier(edition);
    counts.set(tier, (counts.get(tier) || 0) + 1);
  });
  els.legend.innerHTML = TIERS
    .map(([cls, label]) => `<span class="${cls}"><i></i>${label} <b>${counts.get(cls) || 0}</b></span>`)
    .join("");
}

/* ── indice: anos ───────────────────────────────────────────────────────── */

/* En movil solo se despliega una decada; por defecto, la del ano seleccionado
 * (o la mas reciente que quede tras los filtros). En escritorio se ven todas,
 * asi que este valor solo decide que fila lleva la clase `is-open`. */
function resolveOpenDecade(availableDecades) {
  if (state.openDecade !== null && availableDecades.includes(state.openDecade)) {
    return state.openDecade;
  }
  if (state.selection?.kind === "year") {
    const fromSelection = Math.floor(state.selection.id / 10) * 10;
    if (availableDecades.includes(fromSelection)) return fromSelection;
  }
  return Math.max(...availableDecades);
}

function renderYearGrid() {
  // Los filtros ocultan: una decada que se queda sin anos desaparece entera.
  // Antes se atenuaban, y ver "1970s" en gris al filtrar por 2020s confundia.
  const decades = new Map();
  state.filtered.forEach(edition => {
    const decade = Math.floor(edition.year / 10) * 10;
    if (!decades.has(decade)) decades.set(decade, []);
    decades.get(decade).push(edition);
  });

  if (!decades.size) {
    setCount(0, state.editions.length, "ediciones");
    els.indexBody.innerHTML = '<p class="empty">Ninguna edición encaja con los filtros actuales.</p>';
    return;
  }

  setCount(state.filtered.length, state.editions.length, "ediciones");
  // Cronologico inverso: arriba la decada mas reciente, y dentro de cada
  // decada el ano mas reciente primero, para que la lectura sea descendente
  // de principio a fin.
  const openDecade = resolveOpenDecade([...decades.keys()]);
  // El envoltorio permite que en movil las decadas cerradas fluyan como fichas
  // en varias por linea (ver `.decades` en el CSS).
  els.indexBody.innerHTML = `<div class="decades">` + [...decades.entries()].reverse().map(([decade, editions]) => `
    <div class="decade-row${decade === openDecade ? " is-open" : ""}">
      <button class="decade-label" type="button" data-decade="${decade}"
              aria-expanded="${decade === openDecade}">${decade}s<span class="decade-count">${editions.length}</span></button>
      <div class="year-grid">
        ${[...editions].reverse().map(edition => {
          const active = state.selection?.kind === "year" && state.selection.id === edition.year;
          const count = edition.result_count || edition.float_count || 0;
          return `
            <button class="year ${coverageClass(edition)}${active ? " is-active" : ""}"
                    type="button" data-year="${edition.year}"
                    title="${esc(edition.edition_label || edition.year)} · ${esc(COVERAGE_LABEL[edition.coverage] || "")}">
              <span class="year-num">${edition.year}</span>
              <span class="year-meta">${count ? `${count} carroza${count === 1 ? "" : "s"}` : STATUS_LABEL[edition.status] || "–"}</span>
              <span class="year-bar"></span>
            </button>`;
        }).join("")}
      </div>
    </div>`).join("") + `</div>`;
}

/* ── indice: grupos ─────────────────────────────────────────────────────── */

/* Claves de ordenacion de la lista de grupos. `text` ordena ignorando tildes
 * y mayusculas; el resto son numericas. */
/* Claves de ordenacion de las dos listas tabulares. `text` ordena ignorando
 * tildes y mayusculas; el resto son numericas. Los sin dato (una carroza sin
 * puesto) se mandan al final en vez de colarse como cero. */
const SORTS = {
  groups: {
    name: { type: "text", get: group => normalizeText(group.canonical_name) },
    from: { type: "num", get: group => group.first_year_seen },
    to: { type: "num", get: group => group.last_year_seen },
    editions: { type: "num", get: group => group.years.length },
    floats: { type: "num", get: group => group.float_count },
    wins: { type: "num", get: group => group.wins },
  },
  floats: {
    name: { type: "text", get: entry => normalizeText(entry.name) },
    group: { type: "text", get: entry => normalizeText(entry.group_canonical) },
    year: { type: "num", get: entry => entry.year },
    category: { type: "text", get: entry => entry.category || "\uffff" },
    position: { type: "num", get: entry => entry.position ?? Number.POSITIVE_INFINITY },
  },
};

const TIEBREAK = {
  groups: (a, b) => b.float_count - a.float_count
    || normalizeText(a.canonical_name).localeCompare(normalizeText(b.canonical_name)),
  floats: (a, b) => b.year - a.year
    || (a.category || "").localeCompare(b.category || "")
    || (a.position ?? 99) - (b.position ?? 99),
};

function sortRows(mode, rows) {
  const { key, dir } = state.sort[mode];
  const sort = SORTS[mode][key];
  const missing = value => value === null || value === undefined
    || value === "" || value === Number.POSITIVE_INFINITY || value === "\uffff";

  return [...rows].sort((a, b) => {
    const left = sort.get(a);
    const right = sort.get(b);
    // Lo que no tiene dato va siempre al final, se ordene como se ordene: una
    // carroza sin puesto no es "la primera" ni "la ultima", es que no compitio.
    if (missing(left) !== missing(right)) return missing(left) ? 1 : -1;
    if (left < right) return -dir;
    if (left > right) return dir;
    return TIEBREAK[mode](a, b);
  });
}

function sortHeader(mode, key, label, extraClass = "") {
  const { key: active, dir } = state.sort[mode];
  const isActive = active === key;
  const arrow = isActive ? (dir === 1 ? " ▲" : " ▼") : "";
  return `<button class="sort${isActive ? " is-sorted" : ""} ${extraClass}" type="button"
    data-sort-by="${mode}:${key}" aria-sort="${isActive ? (dir === 1 ? "ascending" : "descending") : "none"}"
  >${label}${arrow}</button>`;
}

function renderGroupList() {
  const groups = filteredGroups();
  setCount(groups.length, state.groups.length, "grupos");
  if (!groups.length) {
    els.indexBody.innerHTML = '<p class="empty">Ningún grupo encaja con los filtros actuales.</p>';
    return;
  }
  els.indexBody.innerHTML = `
    <div class="rows rows-groups">
      <div class="row-head">
        ${sortHeader("groups", "name", "Grupo")}
        ${sortHeader("groups", "from", "Desde", "col-num")}
        ${sortHeader("groups", "to", "Hasta", "col-num")}
        ${sortHeader("groups", "editions", 'Edic<span class="short">.</span><span class="long">iones</span>', "col-num")}
        ${sortHeader("groups", "floats", "Carrozas", "col-num col-floats")}
        ${sortHeader("groups", "wins", "🏆", "col-num col-wins")}
        <span aria-hidden="true"></span>
      </div>
      ${sortRows("groups", groups).map(group => {
        const slug = slugifyGroup(group.canonical_name);
        const active = state.selection?.kind === "group" && state.selection.id === slug;
        return `
          <button class="row${active ? " is-active" : ""}" type="button" data-group="${esc(slug)}">
            <span class="row-name">${esc(group.canonical_name)}</span>
            <span class="col-num">${group.first_year_seen}</span>
            <span class="col-num">${group.last_year_seen}</span>
            <span class="col-num">${group.years.length}</span>
            <span class="col-num col-floats">${group.float_count}</span>
            <span class="col-num col-wins">${group.wins || "–"}</span>
            <span class="row-go" aria-hidden="true">›</span>
          </button>`;
      }).join("")}
    </div>`;
}

/* ── indice: carrozas ───────────────────────────────────────────────────── */

function categoryNote() {
  if (!state.category) return "";
  return `<button class="chip link-chip t-float" type="button" data-category="">
    Categoría ${esc(state.category)} ✕</button>`;
}

/* En cuadricula no hay cabeceras de tabla donde pinchar, asi que el orden se
 * elige aqui. Se limita a lo que tiene sentido mirando fotos. */
function gridSort(hidden = false) {
  const options = [
    ["year", "Por año"],
    ["name", "Alfabético"],
    ["group", "Por grupo"],
    ["position", "Por puesto"],
  ];
  const { key, dir } = state.sort.floats;
  return `
    <span class="sort-slot${hidden ? " is-hidden" : ""}">
    <select class="grid-sort" aria-label="Ordenar la cuadrícula"${hidden ? " tabindex=\"-1\"" : ""}>
      ${options.map(([value, label]) => `<option value="${value}"${value === key ? " selected" : ""}>${label}</option>`).join("")}
    </select>
    <button class="view" type="button" data-flip="1"
      title="Invertir el orden">${dir === 1 ? "↑" : "↓"}</button></span>`;
}

function viewToggle() {
  return `
    <div class="view-toggle">
      <button class="view${state.floatView === "grid" ? " is-on" : ""}" type="button"
              data-view="grid" title="Ver las fotos en cuadrícula">▦ Fotos</button>
      <button class="view${state.floatView === "list" ? " is-on" : ""}" type="button"
              data-view="list" title="Ver como tabla ordenable">☰ Lista</button>
    </div>`;
}

/* Cuadricula: solo las carrozas con foto. De 724, 406 la tienen; con las otras
 * 318 en blanco esto parecia roto, y el contador ya avisa de cuantas quedan. */
function renderFloatGrid(rows) {
  const withPhoto = rows.filter(entry => (entry.image_urls || []).length);
  els.indexTools.innerHTML = `${viewToggle()}${gridSort()}${categoryNote()}`;
  els.indexCount.textContent = `${num(withPhoto.length)} con foto`;

  if (!withPhoto.length) {
    els.indexBody.innerHTML = '<p class="empty">Ninguna de estas carrozas tiene foto en el archivo.</p>';
    return;
  }

  els.indexBody.innerHTML = `<div class="float-grid">${sortRows("floats", withPhoto).map(entry => {
    const active = state.selection?.kind === "float" && state.selection.id === entry.id;
    return `
      <button class="tile${active ? " is-active" : ""}" type="button" data-float="${esc(entry.id)}">
        <img src="${esc(entry.image_urls[0])}" alt="${esc(entry.name)}" loading="lazy" referrerpolicy="no-referrer">
        <span class="tile-name">${esc(entry.name)}</span>
        <span class="tile-meta">${entry.year}${entry.position != null
          ? ` · ${entry.category || ""}${entry.position}.º` : ""}</span>
      </button>`;
  }).join("")}</div>`;
}

function renderFloatList() {
  const rows = filteredFloats();
  if (state.floatView === "grid") return renderFloatGrid(rows);

  els.indexTools.innerHTML = `${viewToggle()}${gridSort(true)}${categoryNote()}`;
  setCount(rows.length, state.floats.length, "carrozas");
  if (!rows.length) {
    els.indexBody.innerHTML = '<p class="empty">Ninguna carroza encaja con la búsqueda.</p>';
    return;
  }

  els.indexBody.innerHTML = `
    <div class="rows rows-floats">
      <div class="row-head">
        ${sortHeader("floats", "name", "Carroza")}
        ${sortHeader("floats", "group", "Grupo", "col-grp")}
        ${sortHeader("floats", "year", "Año", "col-num")}
        ${sortHeader("floats", "category", "Cat.", "col-num col-cat")}
        ${sortHeader("floats", "position", "Puesto", "col-num")}
        <span aria-hidden="true"></span>
      </div>
      ${sortRows("floats", rows).map(entry => {
        const active = state.selection?.kind === "float" && state.selection.id === entry.id;
        return `
          <button class="row row-float${active ? " is-active" : ""}" type="button" data-float="${esc(entry.id)}">
            <span class="row-name">${esc(entry.name)}<small>${esc(entry.group_canonical || "sin grupo")}</small></span>
            <span class="col-grp">${esc(entry.group_canonical || "–")}</span>
            <span class="col-num">${entry.year}</span>
            <span class="col-num col-cat">${entry.category ? esc(entry.category) : "única"}</span>
            <span class="col-num">${entry.position != null ? `${entry.position}.º` : "–"}</span>
            <span class="row-go" aria-hidden="true">›</span>
          </button>`;
      }).join("")}
    </div>`;
}

/* Tooltip de los graficos. Se usa uno solo, movido por delegacion: los SVG
 * tienen cientos de elementos y ponerle un listener a cada uno seria absurdo.
 * En tactil no estorba porque `mouseover` no dispara con el dedo. */
let tipEl = null;

/* Se llama al repintar y al hacer clic: si el elemento que disparo el tooltip
 * desaparece del DOM, `mouseout` no llega nunca y el globo se queda flotando
 * sobre la pagina para siempre. */
function hideTooltip() {
  if (tipEl) tipEl.hidden = true;
}

function setupTooltip() {
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  document.body.appendChild(tip);
  tipEl = tip;

  document.addEventListener("mouseover", event => {
    const target = event.target.closest?.("[data-tip]");
    if (!target) return;
    tip.innerHTML = target.dataset.tip;
    tip.hidden = false;
  });

  document.addEventListener("mousemove", event => {
    if (tip.hidden) return;
    // Se aparta del cursor y se pega al borde si no cabe.
    const x = Math.min(event.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    const y = event.clientY - tip.offsetHeight - 12;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${y < 8 ? event.clientY + 18 : y}px`;
  });

  document.addEventListener("mouseout", event => {
    if (event.target.closest?.("[data-tip]")) tip.hidden = true;
  });
}

/* ── indice: numeros ────────────────────────────────────────────────────── */

/* Graficos en SVG a mano, sin libreria: son tres, fijos, y meter una
 * dependencia de 200 KB para esto no compensa. */

const CHART = { w: 720, rowH: 13, padL: 128, padR: 14, padT: 16, padB: 22 };

function statsYears() {
  const years = state.editions.map(edition => edition.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}

function makeScale({ from, to, width, left, right = CHART.padR }) {
  return year => left + ((year - from) / (to - from || 1)) * (width - left - right);
}

function yearAxis(scale, { from, to, step, height }) {
  const ticks = [];
  for (let year = Math.ceil(from / step) * step; year <= to; year += step) ticks.push(year);
  return ticks.map(year => {
    const x = scale(year).toFixed(1);
    return `<line class="axis-line" x1="${x}" y1="${CHART.padT - 6}" x2="${x}" y2="${height - CHART.padB}"/>
      <text class="axis-label" x="${x}" y="${height - CHART.padB + 13}">${year}</text>`;
  }).join("");
}

/* Grafico 1: cada carrocista, una fila. Banda gris de su primera a su ultima
 * aparicion, y un punto por edicion en la que compitio, coloreado por puesto.
 * Asi se ve de un golpe cuando entran, cuando desaparecen y como les fue. */
const CATEGORIES_FROM = 2011;

function chartCareers(category) {
  const series = new Map();
  state.floats.forEach(entry => {
    if (entry.position == null || !entry.group_canonical) return;
    // "todas" recorre el siglo entero; A y B solo tienen sentido desde 2011.
    if (category !== "all" && (entry.category || null) !== category) return;
    if (!series.has(entry.group_canonical)) series.set(entry.group_canonical, []);
    series.get(entry.group_canonical).push(entry);
  });

  // Un punto por edicion, no por carroza: 45 grupos llevaron dos o tres carrozas
  // en el mismo ano y los circulos se pisaban unos a otros, dejando anillos de
  // colores que no significaban nada. Se pinta su mejor puesto de ese ano.
  const rows = [...series.entries()]
    .filter(([, items]) => items.length >= 3)
    .map(([name, items]) => {
      const perYear = new Map();
      items.forEach(item => {
        const current = perYear.get(item.year);
        if (!current || item.position < current.best) {
          perYear.set(item.year, { year: item.year, best: item.position, names: [] });
        }
      });
      items.forEach(item => perYear.get(item.year).names.push(`${item.name} (${item.position}.º)`));
      const years = [...perYear.values()].sort((a, b) => a.year - b.year);
      return {
        name,
        years,
        from: years[0].year,
        to: years[years.length - 1].year,
      };
    })
    .sort((a, b) => a.from - b.from || a.to - b.to);

  if (!rows.length) return '<p class="empty">No hay suficientes datos en esta categoría.</p>';

  const { min, max } = statsYears();
  const scale = makeScale({ from: min, to: max, width: CHART.w, left: CHART.padL });
  const height = CHART.padT + rows.length * CHART.rowH + CHART.padB;
  const body = rows.map((row, index) => {
    const y = CHART.padT + index * CHART.rowH + CHART.rowH / 2;
    const dots = row.years.map(item => {
      const cls = item.best === 1 ? "win" : item.best <= 3 ? "podium" : "ran";
      const tip = `${row.name} · ${item.year}<b>${item.names.join(" · ")}</b>`;
      return `<circle class="dot ${cls}" cx="${scale(item.year).toFixed(1)}" cy="${y}"
        r="${item.best === 1 ? 3.4 : 2.6}" data-tip="${esc(tip)}"/>`;
    }).join("");
    return `
      <g class="career${index % 2 ? " alt" : ""}" data-group="${esc(slugifyGroup(row.name))}">
        <rect class="career-hit" x="0" y="${y - CHART.rowH / 2}" width="${CHART.w}" height="${CHART.rowH}"/>
        <text class="career-name" x="${CHART.padL - 8}" y="${y + 3.2}">${esc(row.name)}</text>
        <line class="span" x1="${scale(row.from).toFixed(1)}" y1="${y}"
              x2="${scale(row.to).toFixed(1)}" y2="${y}"/>
        ${dots}
      </g>`;
  }).join("");

  return `<svg class="chart" viewBox="0 0 ${CHART.w} ${height}" role="img"
    aria-label="Trayectoria de cada carrocista a lo largo de los años">
    ${yearAxis(scale, { from: min, to: max, step: 20, height })}${body}</svg>`;
}

/* Grafico 2: cuantas carrozas desfilaron cada edicion. */
function chartFloatsPerYear() {
  const width = CHART.w;
  const height = 150;
  const rows = state.editions.filter(edition => edition.float_count > 0);
  const top = Math.max(...rows.map(edition => edition.float_count));
  const base = height - CHART.padB;
  const { min, max } = statsYears();
  // Margen izquierdo minimo: aqui no hay nombres que colocar, solo la cifra
  // del maximo, asi que la primera barra arranca casi pegada al borde.
  const scale = makeScale({ from: min, to: max, width, left: 22 });

  const bars = rows.map(edition => {
    const x = scale(edition.year);
    const h = (edition.float_count / top) * (base - CHART.padT);
    return `<rect class="bar ${coverageTier(edition)}" x="${(x - 1.8).toFixed(1)}" y="${(base - h).toFixed(1)}"
      width="3.6" height="${h.toFixed(1)}" data-year="${edition.year}"
      data-tip="${esc(`${edition.year}<b>${edition.float_count} carrozas</b>`)}"/>`;
  }).join("");

  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img"
    aria-label="Carrozas por edición">
    <text class="axis-label" x="18" y="${CHART.padT + 4}" text-anchor="end">${top}</text>
    <line class="axis-line" x1="22" y1="${base}" x2="${width - CHART.padR}" y2="${base}"/>
    ${yearAxis(scale, { from: min, to: max, step: 20, height })}${bars}</svg>`;
}

/* El podio de vestidos, una fila por edicion en vez de una por puesto: con
 * 1.º y 2.º en filas seguidas el ano se repetia y no se comparaba nada. */
function prizeByYear(field) {
  const years = new Map();
  state.floats.filter(entry => entry[field]).forEach(entry => {
    if (!years.has(entry.year)) years.set(entry.year, {});
    years.get(entry.year)[entry[field]] = entry;
  });
  return [...years.entries()].sort((a, b) => b[0] - a[0]);
}

/* Quien acumula mas premios. Cuenta por grupo, no por carroza: lo interesante
 * es que Grupo Pejino gane vestidos tres veces, no con que alegoria. */
function prizeRanking(field, { onlyFirst }) {
  const tally = new Map();
  state.floats.forEach(entry => {
    const rank = entry[field];
    if (!rank || !entry.group_canonical) return;
    if (onlyFirst && rank !== 1) return;
    tally.set(entry.group_canonical, (tally.get(entry.group_canonical) || 0) + 1);
  });
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5);
}

function prizeTop(title, field, options) {
  const rows = prizeRanking(field, options);
  if (!rows.length) return "";
  return `
    <div class="prize-top">
      <h5>${title}</h5>
      <ol>${rows.map(([name, count]) => `<li>
        <button class="link t-group" type="button" data-group="${esc(slugifyGroup(name))}">${esc(name)}</button>
        <b>${count}</b></li>`).join("")}</ol>
    </div>`;
}

function prizeCell(entry) {
  if (!entry) return '<span class="muted-val">–</span>';
  return `<button class="link t-float" type="button" data-float="${esc(entry.id)}">${esc(entry.name)}</button>
    <small class="cell-sub">${esc(entry.group_canonical || "")}</small>`;
}

function renderStatsTab() {
  const summary = state.dataset.summary || {};
  // Las ediciones sin carrozas no pintan barra, asi que sus niveles tampoco
  // tienen por que salir en la leyenda.
  const shownTiers = new Set(state.editions
    .filter(edition => edition.float_count > 0)
    .map(coverageTier));
  const biggest = [...state.editions].sort((a, b) => b.float_count - a.float_count)[0];
  const topGroup = [...state.groups].sort((a, b) => b.wins - a.wins)[0];
  const longest = [...state.groups].sort((a, b) => b.years.length - a.years.length)[0];
  const category = state.statsCategory;

  els.indexBody.innerHTML = `
    <div class="stats-block">
      <div class="kpis">
        <div class="kpi"><span>${num(summary.edition_count)}</span><small>ediciones</small></div>
        <div class="kpi"><span>${biggest.float_count}</span><small>carrozas en ${biggest.year}, el récord</small></div>
        <div class="kpi"><span>${topGroup.wins}</span><small>victorias de ${esc(topGroup.canonical_name)}</small></div>
        <div class="kpi"><span>${longest.years.length}</span><small>ediciones de ${esc(longest.canonical_name)}</small></div>
      </div>

      <h3 class="section">Carrozas documentadas por edición</h3>
      <p class="chart-note">Cuenta lo que el archivo conserva, no necesariamente lo que desfiló:
      donde la documentación es floja la barra se queda corta. El color es el nivel de datos.</p>
      <div class="chart-legend">
        ${TIERS.filter(([cls]) => shownTiers.has(cls))
          .map(([cls, label]) => `<span><i class="key ${cls}"></i>${label}</span>`).join("")}
      </div>
      ${chartFloatsPerYear()}

      <h3 class="section">Trayectoria de los carrocistas</h3>
      <div class="chart-tabs">
        ${[["all", "Todas"], ["A", "Categoría A"], ["B", "Categoría B"]].map(([cat, label]) =>
          `<button class="view${category === cat ? " is-on" : ""}" type="button"
            data-stats-cat="${cat}">${label}</button>`).join("")}
      </div>
      <p class="chart-note">Cada fila es un grupo con tres o más participaciones. La línea gris va
      de su primera a su última carroza; cada punto es una edición, y el color dice cómo le fue.
      ${category === "all"
        ? `Las categorías A y B no existen antes de <b>${CATEGORIES_FROM}</b>, cuando el reglamento
           municipal las creó según el tamaño de la carroza; por eso «Todas» es la única vista que
           cubre el siglo entero.`
        : `Solo desde <b>${CATEGORIES_FROM}</b>: antes de esa fecha había una única lista.`}</p>
      <div class="chart-legend">
        <span class="win-key">${ICON_TROPHY}Ganador</span>
        <span class="podium-key">${ICON_PODIUM}Podio</span>
        <span><i class="dot ran"></i>Resto</span>
      </div>
      ${chartCareers(category)}

      <h3 class="section">Premios especiales</h3>
      <p class="chart-note">Aparte de la clasificación del desfile. <b>👗 Vestidos</b> lo puntúa el
      jurado; <b>🎨 Arte</b> lo concede ACELAR, la asociación de comerciantes de Laredo, desde 2009,
      y su trofeo es una obra de un artista laredano elegida en un concurso propio. Solo constan
      desde 2016.</p>

      <div class="prize-list">
        <h4>👗 Premio a los vestidos</h4>
        <table class="palmares prize-table">
          <thead><tr><th>Año</th><th>🥇 Primero</th><th>🥈 Segundo</th><th>🥉 Tercero</th></tr></thead>
          <tbody>${prizeByYear("prize_costumes_rank").map(([year, podium]) => `
            <tr>
              <td class="pos"><button class="link t-year" type="button" data-year="${year}">${year}</button></td>
              ${[1, 2, 3].map(rank => `<td>${prizeCell(podium[rank])}</td>`).join("")}
            </tr>`).join("")}</tbody>
        </table>
        <div class="prize-tops">
          ${prizeTop("Más primeros puestos", "prize_costumes_rank", { onlyFirst: true })}
          ${prizeTop("Más podios (1.º, 2.º o 3.º)", "prize_costumes_rank", { onlyFirst: false })}
        </div>
      </div>

      <div class="prize-list">
        <h4>🎨 Premio al arte</h4>
        <table class="palmares prize-table">
          <thead><tr><th>Año</th><th>Carroza</th><th>Grupo</th></tr></thead>
          <tbody>${state.floats.filter(entry => entry.prize_art_rank)
            .sort((a, b) => b.year - a.year || a.name.localeCompare(b.name)).map(entry => `
            <tr>
              <td class="pos"><button class="link t-year" type="button" data-year="${entry.year}">${entry.year}</button></td>
              <td class="name"><button class="link t-float" type="button" data-float="${esc(entry.id)}">${esc(entry.name)}</button></td>
              <td class="group">${entry.group_canonical
                ? `<button class="link t-group" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
                : "–"}</td>
            </tr>`).join("")}</tbody>
        </table>
        <div class="prize-tops">
          ${prizeTop("Más premios al arte", "prize_art_rank", { onlyFirst: false })}
        </div>
      </div>
    </div>`;
}

/* ── indice: recorridos ─────────────────────────────────────────────────── */

function renderRouteList() {
  els.indexCount.textContent = "";
  // Mismo criterio que la rejilla de anos: lo mas reciente arriba.
  els.indexBody.innerHTML = `<div class="rows rows-routes">${[...state.routes].reverse().map(route => {
    const active = state.selection?.kind === "route" && state.selection.id === route.id;
    const editions = state.editions.filter(edition => edition.year >= route.start_year && edition.year <= route.end_year);
    const floats = editions.reduce((total, edition) => total + (edition.float_count || 0), 0);
    return `
      <button class="row row-route${active ? " is-active" : ""}" type="button" data-route="${esc(route.id)}">
        ${route.geometry
          ? renderRouteMap(route.id, { variant: "thumb" })
          : '<span class="map-thumb is-empty">sin traza</span>'}
        <span class="route-copy">
          <span class="row-name">${esc(route.label)}</span>
          <span class="row-sub">(<b>${yearRange(route.start_year, route.end_year)}</b>) · ${editions.length} ediciones · ${num(floats)} carrozas</span>
          ${route.approximate ? '<span class="row-sub"><em>trazado aproximado</em></span>' : ""}
        </span>
      </button>`;
  }).join("")}</div>`;
}

/* El contador solo aparece cuando filtra: "119 de 119 ediciones" ocupaba una
 * linea entera para no decir nada. */
function setCount(shown, total, noun) {
  els.indexCount.textContent = shown === total ? "" : `${num(shown)} de ${num(total)} ${noun}`;
}

function renderIndex() {
  hideTooltip();
  // Solo Carrozas tiene controles propios; el resto limpia la barra.
  if (state.mode !== "floats") els.indexTools.innerHTML = "";
  if (state.mode === "editions") renderYearGrid();
  else if (state.mode === "floats") renderFloatList();
  else if (state.mode === "groups") renderGroupList();
  else if (state.mode === "stats") renderStatsTab();
  else renderRouteList();
  renderLegend();
}

/* ── mapa de recorridos (SVG, sin dependencias) ─────────────────────────── */

/* Cuatro geometrias fijas: no hacen falta tiles ni zoom interactivo. Se
 * proyecta en plano (equirectangular con correccion por coseno de la latitud);
 * a menos de 1 km de ancho el error no se ve.
 *
 * Dos encuadres distintos a proposito:
 *  - `fit: "all"` para las miniaturas de la lista, con el mismo marco para las
 *    tres, que es lo que permite compararlas de un vistazo.
 *  - `fit: "route"` para el mapa grande, ajustado a su recorrido: la Alameda a
 *    escala comun es un borron de 45x31, y sola se lee como el circuito que es.
 */
function routeGeometries() {
  return state.routes.filter(route => route.geometry?.coordinates?.length);
}

function makeProjection(points, { width, height, margin = 1.5, padding = 10 }) {
  if (!points.length) return null;

  const lons = points.map(p => p[0]);
  const lats = points.map(p => p[1]);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);

  const cLon = (Math.min(...lons) + Math.max(...lons)) / 2;
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  // Suelo de 200 m: una calle recta tiene anchura casi nula y sin esto el
  // encuadre se iria a un zoom absurdo.
  const spanLon = Math.max((Math.max(...lons) - Math.min(...lons)) * margin, 0.0025);
  const spanLat = Math.max((Math.max(...lats) - Math.min(...lats)) * margin, 0.0018);

  const scale = Math.min(
    (width - padding * 2) / (spanLon * kx),
    (height - padding * 2) / spanLat,
  );

  const project = ([lon, lat]) => [
    width / 2 + (lon - cLon) * kx * scale,
    height / 2 - (lat - cLat) * scale,   // y invertida: norte arriba
  ];
  project.unitsPerMetre = scale / 111320;
  project.width = width;
  project.height = height;
  return project;
}

function toPath(coordinates, project, close = false) {
  const d = coordinates
    .map((point, index) => {
      const [x, y] = project(point);
      return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
  return close ? `${d}Z` : d;
}

/* Barra de escala: el numero redondo que ocupe cerca de un cuarto del ancho. */
function scaleBar(project) {
  const target = (project.width * 0.28) / project.unitsPerMetre;
  const metres = [50, 100, 200, 250, 500, 1000]
    .reduce((best, value) => (Math.abs(value - target) < Math.abs(best - target) ? value : best));
  const width = metres * project.unitsPerMetre;
  const x = 12;
  const y = project.height - 14;
  return `
    <g class="map-scale">
      <line x1="${x}" y1="${y}" x2="${x + width}" y2="${y}"/>
      <line x1="${x}" y1="${y - 4}" x2="${x}" y2="${y + 4}"/>
      <line x1="${x + width}" y1="${y - 4}" x2="${x + width}" y2="${y + 4}"/>
      <text x="${x + width / 2}" y="${y - 6}">${metres} m</text>
    </g>`;
}

/* Etiquetas de calle sobre el propio trazo con <textPath>. Solo se pintan las
 * que caben: una calle de 40 px no admite "Calle del Marqués de Comillas". */
let labelSeq = 0;

function streetLabels(project, streets) {
  const defs = [];
  const texts = [];

  streets.forEach(street => {
    if (!street.name) return;
    let points = street.coordinates.map(project);
    // Si la calle va de derecha a izquierda el texto saldria del reves.
    if (points[points.length - 1][0] < points[0][0]) points = [...points].reverse();

    const drawn = points.reduce((total, point, index) =>
      index ? total + Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]) : 0, 0);
    if (drawn < street.name.length * 5.4 + 12) return;

    // El texto se ancla a la mitad del trazo: si esa mitad cae fuera del
    // encuadre, la etiqueta sale cortada contra el borde. Mejor no pintarla.
    const middle = points[Math.floor(points.length / 2)];
    const margin = 12;
    if (middle[0] < margin || middle[0] > project.width - margin
      || middle[1] < margin || middle[1] > project.height - margin) return;

    const id = `st${labelSeq++}`;
    const d = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
    defs.push(`<path id="${id}" d="${d}"/>`);
    texts.push(`<text class="map-label" dy="-2.5"><textPath href="#${id}" startOffset="50%">${esc(street.name)}</textPath></text>`);
  });

  return { defs: defs.join(""), texts: texts.join("") };
}

/* Flechas de sentido sobre un circuito cerrado.
 *
 * El signo del area de Gauss dice como esta enrollado el poligono, pero ojo:
 * en pantalla la Y crece hacia abajo, asi que area positiva es horario visual.
 * Si no coincide con el sentido que queremos, se recorre al reves. */
function directionArrows(points, direction) {
  if (points.length < 3) return "";

  const area = points.reduce((total, [x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length];
    return total + (x * ny - nx * y);
  }, 0);
  const drawnClockwise = area > 0;              // Y invertida: ver comentario
  const ring = drawnClockwise === (direction === "anticlockwise")
    ? [...points].reverse()
    : points;

  // Longitudes acumuladas para repartir las flechas por el perimetro.
  const closed = [...ring, ring[0]];
  const steps = [];
  let total = 0;
  for (let i = 1; i < closed.length; i++) {
    total += Math.hypot(closed[i][0] - closed[i - 1][0], closed[i][1] - closed[i - 1][1]);
    steps.push(total);
  }

  return [0.16, 0.5, 0.83].map(fraction => {
    const target = total * fraction;
    const index = steps.findIndex(value => value >= target);
    const [ax, ay] = closed[index];
    const [bx, by] = closed[index + 1] || closed[0];
    const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    const before = index ? steps[index - 1] : 0;
    const t = (target - before) / Math.max(steps[index] - before, 0.001);
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    return `<path class="map-arrow" d="M-4 -3.4 L4 0 L-4 3.4 Z"
      transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${angle.toFixed(1)})"/>`;
  }).join("");
}

function mapLayers(project, activeId, { showStreets, showLabels, showArrows }) {
  const map = state.map || {};

  const natural = (map.context || [])
    .map(item => `<path class="map-${esc(item.kind)}" d="${toPath(item.coordinates, project, item.kind === "beach")}"/>`)
    .join("");

  const areas = (map.areas || [])
    .map(item => `<path class="map-${esc(item.kind)}" d="${toPath(item.coordinates, project, true)}"/>`)
    .join("");

  const buildings = showStreets
    ? (map.buildings || []).map(points => `<path class="map-building" d="${toPath(points, project, true)}"/>`).join("")
    : "";

  const streetList = map.streets || [];
  const streets = showStreets
    ? streetList.map(item => `<path class="map-street" d="${toPath(item.coordinates, project)}"/>`).join("")
    : "";

  const labels = showLabels ? streetLabels(project, streetList) : { defs: "", texts: "" };

  const active = state.routes.find(route => route.id === activeId);
  // En la miniatura las flechas son ruido: a 128 px no se leen.
  const arrows = showArrows && active?.direction && active.geometry?.type === "Polygon"
    ? directionArrows(active.geometry.coordinates.map(project), active.direction)
    : "";

  // El activo se pinta el ultimo para que quede por encima del resto.
  const routes = routeGeometries()
    .sort((a, b) => (a.id === activeId ? 1 : 0) - (b.id === activeId ? 1 : 0))
    .map(route => {
      const closed = route.geometry.type === "Polygon";
      return `<path class="map-route${route.id === activeId ? " is-active" : ""}"
        d="${toPath(route.geometry.coordinates, project, closed)}"
        data-route="${esc(route.id)}"><title>${esc(route.label)} (${yearRange(route.start_year, route.end_year)})</title></path>`;
    })
    .join("");

  return `
    <defs>${labels.defs}</defs>
    <g class="map-ctx">${natural}${areas}${buildings}${streets}</g>
    <g class="map-routes">${routes}</g>
    <g class="map-arrows">${arrows}</g>
    <g class="map-labels">${labels.texts}</g>`;
}

function renderRouteMap(activeId, { variant = "detail" } = {}) {
  const active = state.routes.find(route => route.id === activeId);
  const all = routeGeometries().flatMap(route => route.geometry.coordinates);
  if (!all.length) return "";

  const sizes = { detail: [420, 300], compact: [300, 200], thumbstrip: [220, 140], thumb: [128, 84] };
  const [width, height] = sizes[variant] || sizes.detail;

  const zoomToRoute = variant !== "thumb" && active?.geometry?.coordinates?.length;
  const light = variant === "thumbstrip";
  const project = makeProjection(
    zoomToRoute ? active.geometry.coordinates : all,
    { width, height, margin: zoomToRoute ? 1.9 : 1.5, padding: variant === "thumb" ? 6 : 12 },
  );
  if (!project) return "";

  const svg = `<svg viewBox="0 0 ${width} ${height}" role="img"
      aria-label="${esc(active ? `Recorrido: ${active.label}` : "Recorridos de la Batalla de Flores")}">
      ${mapLayers(project, activeId, {
        showStreets: variant !== "thumb",
        showLabels: variant === "detail",
        showArrows: variant !== "thumb" && !light,
      })}
      ${variant === "thumb" || light ? "" : scaleBar(project)}
    </svg>`;

  if (variant === "thumb") return `<span class="map-thumb">${svg}</span>`;

  // Sin figcaption: la atribucion a OSM vive en el pie de la pagina y repetirla
  // bajo cada mapa solo robaba sitio.
  return `<figure class="map map-${variant}">${svg}</figure>`;
}

/* ── detalle: edicion ───────────────────────────────────────────────────── */

/* De varias URLs se elige la mas concreta: la portada de un dominio no dice
 * nada y ademas redirige. */
function bestSourceUrl(entry) {
  const urls = entry.float_url ? [entry.float_url] : (entry.source_urls || []);
  return [...urls].sort((a, b) => b.length - a.length)[0] || null;
}

function sourceCell(entry) {
  const url = bestSourceUrl(entry);
  const tag = `<span class="tag" title="${esc(sourceLabel(entry.source_type))} (source_type: ${esc(entry.source_type || "")})">${esc(sourceShort(entry.source_type))}</span>`;
  // En movil solo la flecha: "fuente ↗" se comia el ancho de la tabla.
  return `<span class="src">${tag}${url
    ? `<a href="${esc(url)}" target="_blank" rel="noopener" title="Ver la fuente"><span class="long">fuente </span>↗</a>`
    : ""}</span>`;
}

/* "A1.º" ordenado como texto daria A1, A10, A2. Se genera una clave
 * categoria + posicion rellenada a tres digitos. */
function positionSortKey(entry) {
  return `${entry.category || "Z"}${String(entry.position ?? 999).padStart(3, "0")}`;
}

/* Premios especiales, aparte de la clasificacion del desfile:
 *  - Vestidos: lo puntua el jurado (650/430/320 € segun las bases).
 *  - Arte: lo concede ACELAR, la asociacion de comerciantes, desde 2009. El
 *    trofeo es una obra de un artista laredano elegida en su propio concurso. */
function prizeChips(entry) {
  const prizes = [];
  if (entry.prize_costumes_rank) prizes.push(`👗 Vestidos ${entry.prize_costumes_rank}.º`);
  if (entry.prize_art_rank) prizes.push(`🎨 Arte`);
  if (entry.points != null) prizes.push(`${entry.points} pts`);
  return prizes.join(" · ");
}

function renderGallery(entries) {
  const images = entries.flatMap(entry =>
    (entry.image_urls || []).map(url => ({ url, entry }))).slice(0, 24);
  if (!images.length) return "";
  return `
    <h3 class="section">Imágenes (${images.length})</h3>
    <div class="gallery">
      ${images.map(({ url, entry }) => `
        <figure class="shot">
          <a href="${esc(entry.float_url || url)}" target="_blank" rel="noopener"
             title="${esc(entry.name)} (${entry.year})${entry.group_canonical ? ` · ${esc(entry.group_canonical)}` : ""}, imagen alojada en batalladeflores.net">
            <img src="${esc(url)}" alt="${esc(entry.name)}" loading="lazy" referrerpolicy="no-referrer">
          </a>
          <figcaption>${esc(entry.name)}<small>${entry.year}${entry.group_canonical ? ` · ${esc(entry.group_canonical)}` : ""}</small></figcaption>
        </figure>`).join("")}
    </div>`;
}

function provenanceBlock(entries, sources) {
  const counts = new Map();
  entries.forEach(entry => {
    const label = sourceLabel(entry.source_type);
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  // Se listan con su abreviatura para poder descifrar los "OFI·MAN" de la tabla.
  const codes = new Map();
  entries.forEach(entry => {
    (entry.source_type || "").split("+").forEach(part => {
      if (part && SOURCE_SHORT[part]) codes.set(SOURCE_SHORT[part], SOURCE_LABEL[part]);
    });
  });

  return `
    <div class="provenance">
      <b>Fuentes</b>
      <ul>
        ${[...counts.entries()].sort((a, b) => b[1] - a[1])
          .map(([label, count]) => `<li>${esc(label)}: ${count} entrada${count === 1 ? "" : "s"}</li>`).join("")
          || "<li>Sin entradas registradas para esta edición.</li>"}
      </ul>
      ${codes.size ? `<p class="codes">${[...codes.entries()]
        .map(([code, label]) => `<span class="tag">${esc(code)}</span> ${esc(label)}`).join(" · ")}</p>` : ""}
      ${sources.length ? `<ul class="plain" style="margin-top:6px">${sources
        .map(url => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></li>`).join("")}</ul>`
        : '<p style="margin:6px 0 0">Sin URL de fuente asociada.</p>'}
    </div>`;
}

function renderEditionDetail(edition) {
  const entries = edition.floats || [];
  // Por categoria y luego posicion: si no, A1 y B1 salian juntos y ordenados
  // por nombre, que es como leerlo en desorden.
  const ranked = entries
    .filter(entry => entry.position != null || entry.category)
    .sort((a, b) => positionSortKey(a).localeCompare(positionSortKey(b)));
  const unranked = entries.filter(entry => !(entry.position != null || entry.category));
  const route = routeForYear(edition.year);

  const groupCount = new Set(entries.map(e => e.group_canonical).filter(Boolean)).size;
  // La miniatura va como columna del palmares en vez de en galeria aparte: la
  // tabla ya tiene el ancho, y asi la foto queda junto a su carroza.
  // Con categorias A y B, mostrarlas juntas mezclaba dos competiciones
  // distintas: se separan con un selector, como en Estadisticas.
  const cats = [...new Set(ranked.map(entry => entry.category).filter(Boolean))].sort();
  const shownCat = cats.includes(state.editionCategory) ? state.editionCategory : cats[0];
  const shown = cats.length > 1 ? ranked.filter(entry => entry.category === shownCat) : ranked;
  const withPhotos = shown.some(entry => (entry.image_urls || []).length);

  els.detail.innerHTML = `
    <div class="detail-head edition-head">
      <h2>${edition.year}</h2>
      <span class="discs">
        ${edition.edition_number
          ? `<span class="disc disc-wide" title="${esc(edition.edition_label || "")}"><b>${edition.edition_number}ª</b>edición</span>`
          : ""}
        <span class="disc"><b>${num(edition.float_count || 0)}</b>carrozas</span>
        <span class="disc"><b>${num(groupCount)}</b>grupos</span>
      </span>
    </div>
    <div class="chips">
      ${edition.status !== "published"
        ? `<span class="chip rose">${esc(STATUS_LABEL[edition.status] || edition.status)}</span>` : ""}
      ${route ? `<button class="chip link-chip t-route" type="button" data-route="${esc(route.id)}">${esc(route.label)}</button>` : ""}
      ${edition.virtual_tour ? `<a class="chip link-chip t-year" href="${esc(edition.virtual_tour)}"
        target="_blank" rel="noopener" title="Panorámicas de laredoturismo.es">360° ↗</a>` : ""}
      ${shareButton()}
    </div>

    ${ranked.length ? `
      <h3 class="section">Palmarés</h3>
      ${cats.length > 1 ? `<div class="chart-tabs">${cats.map(cat =>
        `<button class="view${cat === shownCat ? " is-on" : ""}" type="button"
          data-edition-cat="${esc(cat)}">Categoría ${esc(cat)}</button>`).join("")}</div>` : ""}
      <table class="palmares${withPhotos ? " with-photo" : ""}">
        <thead><tr>
          ${withPhotos ? '<th class="c-photo" aria-label="Foto"></th>' : ""}
          <th data-sort-type="text">Puesto</th>
          <th data-sort-type="text">Carroza</th>
          <th data-sort-type="text">Grupo</th>
          <th data-sort-type="text">Fuente</th>
        </tr></thead>
        <tbody>
          ${shown.map(entry => `
            <tr>
              ${withPhotos ? `<td class="c-photo">${(entry.image_urls || []).length
                ? `<button class="thumb" type="button" data-float="${esc(entry.id)}"
                     data-tip="${esc(entry.name)}"><img src="${esc(entry.image_urls[0])}"
                     alt="${esc(entry.name)}" loading="lazy" referrerpolicy="no-referrer"></button>`
                : ""}</td>` : ""}
              <td class="pos" data-sort="${esc(positionSortKey(entry))}">${entry.position === 1
                ? `${ICON_TROPHY}` : ""}${cats.length > 1 || !entry.category ? "" : ""}${entry.position != null ? `${entry.position}.º` : "–"}</td>
              <td class="name" data-sort="${esc(normalizeText(entry.name))}">${esc(entry.name)}${prizeChips(entry)
                ? `<small class="prizes">${esc(prizeChips(entry))}</small>` : ""}</td>
              <td class="group" data-sort="${esc(normalizeText(entry.group_canonical))}">${entry.group_canonical
                ? `<button class="link t-group" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
                : "–"}</td>
              <td data-sort="${esc(sourceShort(entry.source_type))}">${sourceCell(entry)}</td>
            </tr>`).join("")}
        </tbody>
      </table>` : '<h3 class="section">Palmarés</h3><p class="empty">No hay palmarés estructurado para este año.</p>'}

    ${unranked.length ? `
      <h3 class="section">Otras carrozas documentadas (${unranked.length})</h3>
      <table class="palmares">
        <colgroup><col><col><col class="c-src"></colgroup>
        <thead><tr>
          <th data-sort-type="text">Carroza</th>
          <th data-sort-type="text">Grupo</th>
          <th data-sort-type="text">Fuente</th>
        </tr></thead>
        <tbody>
          ${unranked.map(entry => `
            <tr>
              <td class="name" data-sort="${esc(normalizeText(entry.name))}">${esc(entry.name)}</td>
              <td class="group" data-sort="${esc(normalizeText(entry.group_canonical))}">${entry.group_canonical
                ? `<button class="link t-group" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
                : "–"}</td>
              <td data-sort="${esc(sourceShort(entry.source_type))}">${sourceCell(entry)}</td>
            </tr>`).join("")}
        </tbody>
      </table>` : ""}

    ${(edition.notes || []).length ? `
      <h3 class="section">Notas</h3>
      <ul class="plain">${edition.notes.map(note => `<li>${esc(note)}</li>`).join("")}</ul>` : ""}

    ${renderGallery(entries.filter(entry => !ranked.includes(entry)))}

    ${route?.geometry ? `
      <h3 class="section">Recorrido</h3>
      ${renderRouteMap(route.id, { variant: "thumbstrip" })}` : ""}

    ${provenanceBlock(entries, edition.source_urls || [])}
  `;
  els.detail.scrollTop = 0;
}

/* ── detalle: qué es esto ───────────────────────────────────────────────── */

/* Va por el mismo carril que las demas fichas (seleccion + hash + capa en
 * movil), asi que hereda la cruz de cerrar y se puede enlazar: #/info */
function renderAbout() {
  const summary = state.dataset.summary || {};
  els.detail.innerHTML = `
    <div class="detail-head">
      <h2 style="font-size:22px">¿Qué es esta página?</h2>
    </div>
    <div class="chips">${shareButton()}</div>

    <p class="about-lead">Un archivo interactivo de la <b>Batalla de Flores de Laredo</b>,
    declarada Fiesta de Interés Turístico Nacional, que reúne
    ${num(summary.edition_count)} ediciones desde 1908 con
    ${num(summary.float_count)} carrozas y ${num(summary.group_count)} grupos
    carrocistas, cada una con la fuente de la que sale.</p>

    <h3 class="section">No es la web oficial</h3>
    <p>Es un proyecto personal y sin ánimo de lucro, hecho por afición a la fiesta.
    No representa al Ayuntamiento ni a la organización. Para información oficial
    (fechas, inscripciones, programa) acude a
    <a href="https://www.laredo.es/09/fiestas_flores.php" target="_blank" rel="noopener">laredo.es</a>
    o a <a href="https://www.batalladeflores.net/" target="_blank" rel="noopener">batalladeflores.net</a>.</p>

    <h3 class="section">De dónde salen los datos</h3>
    <p>El grueso del archivo histórico procede de
    <a href="https://www.batalladeflores.net/" target="_blank" rel="noopener">batalladeflores.net</a>,
    un trabajo de recopilación excelente, más de un siglo documentado carroza a
    carroza, sin el cual esta página no existiría. Los resultados recientes salen
    de las notas oficiales del Ayuntamiento de Laredo. Aquí no se copia su
    contenido: se estructura en una base de datos derivada, y
    <b>cada carroza enlaza a la página concreta de la que sale</b>.</p>
    <p>Las imágenes se muestran enlazadas desde el servidor original y
    pertenecen a sus autores.</p>

    <h3 class="section">¿Qué falta, y por qué?</h3>
    <ul class="plain">
      <li><b>2018</b> es el único año celebrado del que falta el palmarés. Se sabe que
      desfilaron 15 carrozas de ocho grupos, pero ni el archivo ni el Ayuntamiento
      publicaron los resultados. <b>Se sigue buscando</b>: si guardas un recorte, una
      foto o el programa de aquella edición, encaja aquí.</li>
      <li><b>2020 y 2021</b> no se celebraron por la pandemia; entre 1936 y 1939 tampoco.</li>
      <li>Los años más antiguos tienen fichas sueltas, no palmarés completos.</li>
    </ul>
    <p class="muted">Cada edición dice en su ficha de dónde viene lo que muestra, así
    que los huecos se ven en lugar de disimularse.</p>

    <h3 class="section">Cómo moverse</h3>
    <p>Cada tipo de dato tiene su color, y lo que lleva color se puede pinchar:</p>
    <p class="legend-types">
      <span class="t-year">un año</span>
      <span class="t-group">un grupo</span>
      <span class="t-float">una carroza</span>
      <span class="t-route">un recorrido</span>
    </p>

    <h3 class="section">¿Ves un error?</h3>
    <p>Es muy posible que lo haya: mucho de esto viene de parsear páginas antiguas,
    y hay años en los que las propias fuentes se contradicen. <b>Próximamente se
    habilitará un formulario</b> para avisar de datos incorrectos o aportar los que
    faltan.</p>

    <div class="provenance">
      <b>Ficha técnica</b>
      <ul>
        <li>Versión ${esc(state.dataset.version || "–")}, generada el ${esc(state.dataset.built_at || "–")}.</li>
        <li>Web estática sin dependencias; los mapas se dibujan sobre datos de
        OpenStreetMap (ODbL).</li>
      </ul>
    </div>`;
  els.detail.scrollTop = 0;
}

/* ── detalle: carroza ───────────────────────────────────────────────────── */

/* "5 de 11": cuantas carrozas compitieron en esa misma categoria y ano. Sin el
 * denominador, un quinto puesto no dice si fue de once o de cinco. */
function fieldSize(entry) {
  return state.floats.filter(other =>
    other.year === entry.year
    && other.category === entry.category
    && other.position != null).length;
}

function renderFloatDetail(entry) {
  const edition = state.editions.find(item => item.year === entry.year);
  const prizes = prizeChips(entry);

  els.detail.innerHTML = `
    <div class="detail-head">
      <h2 style="font-size:22px">${esc(entry.name)}</h2>
    </div>
    <div class="chips">${shareButton()}</div>

    <dl class="facts">
      <div><dt>Año</dt><dd>
        <button class="link t-year" type="button" data-year="${entry.year}">${entry.year}</button>
      </dd></div>
      <div><dt>Grupo</dt><dd>${entry.group_canonical
        ? `<button class="link t-group" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
        : '<span class="muted-val">sin grupo</span>'}</dd></div>
      <div><dt>Categoría</dt><dd>${entry.category
        ? `<button class="link t-float" type="button" data-category="${esc(entry.category)}">Categoría ${esc(entry.category)}</button>`
        : '<span class="muted-val">sin categoría</span>'}</dd></div>
      <div><dt>Puesto</dt><dd>${entry.position != null
        ? `<b>${entry.position}</b><span class="of-total"> de ${fieldSize(entry)}</span>`
        : '<span class="muted-val">no consta</span>'}</dd></div>
    </dl>

    ${prizes ? `<p class="span-note">${esc(prizes)}</p>` : ""}

    ${(entry.image_urls || []).length ? `
      <h3 class="section">Imágenes (${entry.image_urls.length})</h3>
      <div class="gallery gallery-big">
        ${entry.image_urls.map(url => `
          <figure class="shot">
            <a href="${esc(entry.float_url || url)}" target="_blank" rel="noopener"
               title="${esc(entry.name)} (${entry.year}), imagen alojada en batalladeflores.net">
              <img src="${esc(url)}" alt="${esc(entry.name)}" loading="lazy" referrerpolicy="no-referrer">
            </a>
          </figure>`).join("")}
      </div>`
      : '<p class="empty">El archivo no conserva imágenes de esta carroza.</p>'}

    ${(entry.notes || []).length
      ? `<h3 class="section">Notas</h3><ul class="plain">${entry.notes.map(note => `<li>${esc(note)}</li>`).join("")}</ul>`
      : ""}

    <div class="provenance">
      <b>Fuentes</b>
      <ul>
        <li>${esc(sourceLabel(entry.source_type))}</li>
        ${edition ? `<li>Edición de ${entry.year}: ${esc(edition.edition_label || "")}</li>` : ""}
      </ul>
      ${(entry.source_urls || []).length ? `<ul class="plain" style="margin-top:6px">${entry.source_urls
        .map(url => `<li><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></li>`).join("")}</ul>` : ""}
    </div>`;
  els.detail.scrollTop = 0;
}

/* ── detalle: grupo ─────────────────────────────────────────────────────── */

/* El emoji de bronce se leia como "tercer puesto", que es justo lo contrario de
 * lo que cuenta. Un podio de tres escalones no deja lugar a dudas. */
const ICON_TROPHY = `<svg class="kpi-icon" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M4 2h8v3a4 4 0 0 1-8 0V2z"/><path d="M2 3h2v2a2 2 0 0 1-2-2zM14 3h-2v2a2 2 0 0 0 2-2z"/>
  <path d="M7 9h2v3H7zM5 12h6v2H5z"/></svg>`;
const ICON_PODIUM = `<svg class="kpi-icon" viewBox="0 0 16 16" aria-hidden="true">
  <rect x="6" y="4" width="4" height="10"/><rect x="1.5" y="7.5" width="4" height="6.5"/>
  <rect x="10.5" y="9" width="4" height="5"/></svg>`;

/* Linea temporal de un solo carrocista: el eje X va de su primera a su ultima
 * carroza, no del siglo entero, y el Y es el puesto de verdad, con el 1 arriba.
 * Una linea por categoria, porque competir en A y en B no es lo mismo. */
function chartGroupTimeline(entries) {
  const ranked = entries.filter(entry => entry.position != null);
  if (ranked.length < 2) return "";

  const from = Math.min(...ranked.map(e => e.year));
  const to = Math.max(...ranked.map(e => e.year));
  const worst = Math.max(...ranked.map(e => e.position));

  const width = 620;
  const height = 34 + worst * 15 + CHART.padB;
  const left = 30;
  const base = height - CHART.padB;
  const scale = makeScale({ from, to, width, left });
  const yOf = position => CHART.padT + ((position - 1) / Math.max(worst - 1, 1)) * (base - CHART.padT - 6);

  // Rejilla de puestos: 1.º arriba y el peor abajo, con los intermedios si caben.
  const levels = worst <= 8
    ? Array.from({ length: worst }, (_, i) => i + 1)
    : [1, 2, 3, Math.round(worst / 2), worst];
  const grid = levels.map(position => `
    <line class="axis-line" x1="${left}" y1="${yOf(position).toFixed(1)}" x2="${width - CHART.padR}" y2="${yOf(position).toFixed(1)}"/>
    <text class="axis-label" x="${left - 6}" y="${(yOf(position) + 3).toFixed(1)}" text-anchor="end">${position}.º</text>`).join("");

  // Los anos antiguos no tienen categoria; se etiquetan como tal en vez de con
  // un guion, que no dice nada.
  const SIN_CAT = "sin categoría";
  const categories = [...new Set(ranked.map(entry => entry.category || SIN_CAT))].sort();
  const lines = categories.map(category => {
    const points = ranked
      .filter(entry => (entry.category || SIN_CAT) === category)
      .sort((a, b) => a.year - b.year);
    const path = points.map((entry, index) =>
      `${index ? "L" : "M"}${scale(entry.year).toFixed(1)} ${yOf(entry.position).toFixed(1)}`).join("");
    const dots = points.map(entry => `
      <circle class="dot ${entry.position === 1 ? "win" : entry.position <= 3 ? "podium" : "ran"}"
              cx="${scale(entry.year).toFixed(1)}" cy="${yOf(entry.position).toFixed(1)}"
              r="${entry.position === 1 ? 4 : 3.2}" data-float="${esc(entry.id)}"
              data-tip="${esc(`${entry.year} · ${entry.category || ""}${entry.position}.º<b>${entry.name}</b>`)}"/>`).join("");
    return `<g class="serie serie-${category === SIN_CAT ? "none" : esc(category)}"><path class="serie-line" d="${path}"/>${dots}</g>`;
  }).join("");

  return `
    <h3 class="section">Su trayectoria</h3>
    ${categories.length > 1 ? `<div class="chart-legend">${categories.map(c =>
      `<span><i class="key key-${c === SIN_CAT ? "none" : esc(c)}"></i>${c === SIN_CAT ? "lista única" : esc(c)}</span>`).join("")}</div>` : ""}
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Evolución del puesto de ${esc(entries[0]?.group_canonical || "")} entre ${from} y ${to}">
      ${grid}
      ${yearAxis(scale, { from, to, step: to - from > 30 ? 10 : to - from > 12 ? 5 : 2, height })}
      ${lines}
    </svg>`;
}

function renderGroupDetail(group) {
  const entries = [];
  state.editions.forEach(edition => {
    (edition.floats || []).forEach(entry => {
      if (entry.group_canonical === group.canonical_name) entries.push({ ...entry, year: edition.year });
    });
  });
  entries.sort((a, b) => b.year - a.year || (a.position ?? 99) - (b.position ?? 99));

  const categories = Object.entries(group.category_counts || {}).sort();
  const podium = entries.filter(entry => entry.position != null && entry.position <= 3).length;

  els.detail.innerHTML = `
    <div class="detail-head">
      <h2 style="font-size:22px">${esc(group.canonical_name)}</h2>
      ${shareButton()}
    </div>
    <p class="span-note">
      Desfiló entre <b>${group.first_year_seen}</b> y <b>${group.last_year_seen}</b>
      con <b>${num(group.float_count)}</b> carroza${group.float_count === 1 ? "" : "s"}${categories.length
        ? `, de las cuales ${categories.map(([cat, count]) =>
            `<b>${count}</b> en categoría ${esc(cat)}`).join(" y ")} (las categorías existen desde ${CATEGORIES_FROM})`
        : ""}.
    </p>

    <div class="kpis">
      <div class="kpi"><span>${num(group.years.length)}</span><small>ediciones</small></div>
      <div class="kpi"><span>${num(group.float_count)}</span><small>carrozas</small></div>
      <div class="kpi"><span>${ICON_TROPHY}${num(group.wins)}</span><small>victorias</small></div>
      <div class="kpi"><span>${ICON_PODIUM}${num(podium)}</span><small title="Primer, segundo o tercer puesto">podios</small></div>
    </div>

    ${chartGroupTimeline(entries)}

    ${renderGallery(entries)}

    <h3 class="section">Carrozas</h3>
    <table class="palmares">
      <colgroup><col class="c-pos"><col><col class="c-pos"><col class="c-src"></colgroup>
      <thead><tr>
        <th data-sort-type="num">Año</th>
        <th data-sort-type="text">Carroza</th>
        <th data-sort-type="text">Pos.</th>
        <th data-sort-type="text">Fuente</th>
      </tr></thead>
      <tbody>
        ${entries.map(entry => `
          <tr>
            <td class="pos" data-sort="${entry.year}"><button class="link t-year" type="button" data-year="${entry.year}">${entry.year}</button></td>
            <td class="name" data-sort="${esc(normalizeText(entry.name))}">${esc(entry.name)}</td>
            <td class="pos" data-sort="${esc(positionSortKey(entry))}">${entry.category ? esc(entry.category) : ""}${entry.position != null ? `${entry.position}.º` : "–"}</td>
            <td data-sort="${esc(sourceShort(entry.source_type))}">${sourceCell(entry)}</td>
          </tr>`).join("")}
      </tbody>
    </table>

    <div class="provenance">
      <b>Normalización del nombre</b>
      <ul>
        <li>Forma canónica: <b>${esc(group.canonical_name)}</b></li>
        ${(group.merged_variants || []).length
          ? `<li>Variantes plegadas: ${group.merged_variants.map(v => esc(v)).join(", ")}</li>`
          : "<li>Sin variantes plegadas.</li>"}
        ${(group.aliases || []).length
          ? `<li>Tal y como aparece en las fuentes: ${group.aliases.map(a => esc(a)).join(" · ")}</li>` : ""}
      </ul>
    </div>`;
  els.detail.scrollTop = 0;
}

/* ── detalle: recorrido ─────────────────────────────────────────────────── */

function renderRouteDetail(route) {
  const editions = state.editions.filter(e => e.year >= route.start_year && e.year <= route.end_year);
  const floats = editions.reduce((total, e) => total + (e.float_count || 0), 0);
  els.detail.innerHTML = `
    <div class="detail-head">
      <h2 style="font-size:20px">${esc(route.label)}</h2>
    </div>
    <div class="chips">
      ${shareButton()}
      <span class="chip rose">${yearRange(route.start_year, route.end_year)}</span>
      <span class="chip ${route.geometry ? "leaf" : ""}">${route.geometry
        ? (route.approximate ? "Trazado aproximado" : "Trazado real")
        : "Sin traza"}</span>
      ${route.osm?.old_name ? `<span class="chip gold">antes: ${esc(route.osm.old_name)}</span>` : ""}
      ${route.direction === "anticlockwise" ? '<span class="chip">↺ sentido antihorario</span>' : ""}
    </div>
    <div class="kpis">
      <div class="kpi"><span>${num(editions.length)}</span><small>ediciones</small></div>
      <div class="kpi"><span>${num(floats)}</span><small>carrozas</small></div>
    </div>

    ${route.geometry ? renderRouteMap(route.id) : ""}
    ${route.note ? `<p class="muted" style="margin-top:6px">${esc(route.note)}</p>` : ""}

    <h3 class="section">Ediciones en este trazado</h3>
    <div class="year-grid">
      ${[...editions].reverse().map(e => `<button class="year ${coverageClass(e)}" type="button" data-year="${e.year}">
        <span class="year-num">${e.year}</span><span class="year-bar"></span></button>`).join("")}
    </div>
    <div class="provenance">
      <b>Fuentes</b>
      <ul>
        <li>Las eras las declara el Ayuntamiento de Laredo en su página de la fiesta.</li>
        ${route.osm ? `<li>Geometría: OpenStreetMap, ${route.osm.way_ids.length === 1
          ? `way <code>${route.osm.way_ids[0]}</code>`
          : `${route.osm.way_ids.length} ways`} de «${esc(route.osm.name)}».</li>` : ""}
        ${route.approximate ? "<li>Trazado <b>aproximado</b>: ninguna fuente detalla las calles exactas del circuito.</li>" : ""}
        ${route.direction_source ? `<li>Sentido de la marcha: ${esc(route.direction_source)}. No lo publica ninguna fuente.</li>` : ""}
      </ul>
      ${route.source_url ? `<ul class="plain" style="margin-top:6px"><li><a href="${esc(route.source_url)}" target="_blank" rel="noopener">${esc(route.source_url)}</a></li></ul>` : ""}
    </div>`;
  els.detail.scrollTop = 0;
}

/* ── ordenacion de las tablas del detalle ───────────────────────────────── */

/* Las tablas del panel de detalle se ordenan sobre el DOM, no re-renderizando:
 * cada `td` lleva su clave en `data-sort` y cada `th` el tipo de comparacion.
 * Asi el orden sobrevive a los clics del usuario hasta que cambia la seleccion. */
function sortDetailTable(table, columnIndex, direction) {
  const head = table.tHead?.rows[0];
  const body = table.tBodies[0];
  if (!head || !body) return;

  const type = head.cells[columnIndex]?.dataset.sortType || "text";
  const value = cell => {
    const raw = cell?.dataset.sort ?? cell?.textContent ?? "";
    if (type !== "num") return String(raw);
    const parsed = Number.parseFloat(raw);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
  };

  [...body.rows]
    .sort((rowA, rowB) => {
      const left = value(rowA.cells[columnIndex]);
      const right = value(rowB.cells[columnIndex]);
      if (left < right) return -direction;
      if (left > right) return direction;
      return 0;
    })
    .forEach(row => body.appendChild(row));

  [...head.cells].forEach((cell, index) => {
    cell.setAttribute("aria-sort", index === columnIndex
      ? (direction === 1 ? "ascending" : "descending") : "none");
  });
}

function handleDetailSort(header) {
  const table = header.closest("table.palmares");
  const index = [...header.parentElement.cells].indexOf(header);
  // Primer clic: ascendente. Segundo sobre la misma columna: descendente.
  const direction = header.getAttribute("aria-sort") === "ascending" ? -1 : 1;
  sortDetailTable(table, index, direction);
}

/* ── seleccion y deep-links ─────────────────────────────────────────────── */

/* Compartir. En movil `navigator.share` abre la hoja del sistema (WhatsApp, X,
 * Instagram, lo que tenga instalado), que es mejor que cinco botones de marca.
 * En escritorio no existe casi nunca: ahi se copia el enlace. */
/* Icono de compartir en vez de solo texto: el emoji cambia de dibujo en cada
 * sistema y aqui hace falta que se reconozca de un vistazo. */
const ICON_SHARE = `<svg class="pill-icon" viewBox="0 0 16 16" aria-hidden="true">
  <circle cx="12.5" cy="3.5" r="2.2"/><circle cx="3.5" cy="8" r="2.2"/><circle cx="12.5" cy="12.5" r="2.2"/>
  <path d="M5.4 6.9 10.6 4.3M5.4 9.1l5.2 2.6" stroke-width="1.4" fill="none"/></svg>`;

function shareButton() {
  return `<button id="share" class="share" type="button" title="Compartir esta ficha">${ICON_SHARE}Compartir</button>`;
}

async function shareUrl(url, title, text, button) {
  track("compartir", title, true);
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    if (button) {
      const original = button.textContent;
      button.textContent = "Enlace copiado";
      setTimeout(() => { button.textContent = original; }, 2000);
    }
  } catch {
    /* el usuario cancelo la hoja de compartir: no hay nada que hacer */
  }
}

function shareCurrent() {
  const heading = document.querySelector("#detail h2")?.textContent?.trim();
  return shareUrl(
    location.href,
    `Batalla de Flores de Laredo${heading ? ` · ${heading}` : ""}`,
    "Archivo de la Batalla de Flores de Laredo",
    document.getElementById("share"),
  );
}

function renderDetail() {
  hideTooltip();
  const selection = state.selection;
  if (!selection) {
    const latest = latestRankedEdition();
    els.detail.innerHTML = `
      <div class="placeholder">
        <p class="placeholder-lead">Elige un año en la rejilla.</p>
        <p>Cada edición trae su palmarés, las carrozas documentadas, las fotos que
        conserva el archivo y el recorrido de aquel año.</p>
        <p>También puedes recorrerlo por <button class="link t-group" type="button"
          data-mode-jump="groups">grupos</button> (quién más ha desfilado y quién más ha
        ganado) o por <button class="link t-route" type="button" data-mode-jump="routes">recorridos</button>,
        que han cambiado tres veces desde 1908.</p>
        ${latest ? `<p class="placeholder-hint">Lo último: <button class="link t-year" type="button"
          data-year="${latest.year}">${latest.year}</button>.</p>` : ""}
      </div>`;
    return;
  }
  if (selection.kind === "year") {
    const edition = state.editions.find(e => e.year === selection.id);
    if (edition) return renderEditionDetail(edition);
  }
  if (selection.kind === "group") {
    const group = state.groups.find(g => slugifyGroup(g.canonical_name) === selection.id);
    if (group) return renderGroupDetail(group);
  }
  if (selection.kind === "route") {
    const route = state.routes.find(r => r.id === selection.id);
    if (route) return renderRouteDetail(route);
  }
  if (selection.kind === "about") return renderAbout();
  if (selection.kind === "float") {
    const entry = state.floats.find(item => item.id === selection.id);
    if (entry) return renderFloatDetail(entry);
  }
  els.detail.innerHTML = '<p class="empty">No encuentro ese elemento en el dataset.</p>';
}

/* ── analitica ──────────────────────────────────────────────────────────── */

/* GoatCounter cuenta la carga de la pagina por su cuenta, pero aqui la
 * navegacion es por hash y no dispara nada. Se cuentan las selecciones del
 * usuario (no la de arranque) para saber que anos y que grupos se miran.
 * Si el script no esta puesto, esto no hace nada. */
function track(path, title, event = false) {
  window.goatcounter?.count?.({ path, title, event });
  // Lo mismo a GA, para poder comparar los tres contadores midiendo lo mismo.
  window.gtag?.(event ? "event" : "page_view", event ? title : "page_view", {
    page_location: location.origin + path,
    page_title: title,
  });
}

function select(kind, id, { updateHash = true, reveal = true } = {}) {
  state.selection = { kind, id };
  // En movil el detalle se superpone al indice; en escritorio no hace nada.
  if (reveal && isNarrow()) document.body.classList.add("detail-open");
  if (updateHash) {
    const prefix = { year: "y", group: "g", route: "r", float: "c", about: "info" }[kind];
    history.replaceState(null, "", `#/${prefix}/${id}`);
    track(location.pathname + location.hash, `${kind}: ${id}`);
  }
  renderIndex();
  renderDetail();
}

function readHash() {
  if (location.hash === "#/info/-") return { kind: "about", id: "-" };
  const match = /^#\/(y|g|r|c)\/(.+)$/.exec(location.hash);
  if (!match) return null;
  const [, prefix, rawId] = match;
  const id = decodeURIComponent(rawId);
  if (prefix === "y") return { kind: "year", id: Number(id) };
  if (prefix === "g") return { kind: "group", id };
  if (prefix === "c") return { kind: "float", id };
  return { kind: "route", id };
}

function setMode(mode) {
  state.mode = mode;
  els.tabs.forEach(tab => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  renderIndex();
}

function refresh() {
  applyFilters();
  renderIndex();
}

function latestRankedEdition() {
  return [...state.editions].reverse().find(edition => (edition.result_count || 0) > 0) || null;
}

/* Cerrar la capa tiene que deshacer la seleccion entera, no solo taparla: si
 * solo se ocultaba, el ano seguia marcado en la rejilla y la URL seguia
 * apuntando a el, asi que recargar o compartir devolvia a la ficha cerrada. */
function closeDetail() {
  if (!document.body.classList.contains("detail-open")) return;
  document.body.classList.remove("detail-open");
  state.selection = null;
  history.replaceState(null, "", location.pathname + location.search);
  renderIndex();
  renderDetail();
}

function resetToStart() {
  state.query = ""; state.decade = "all"; state.status = "all"; state.rankedOnly = false; state.category = null;
  els.search.value = ""; els.decade.value = "all"; els.status.value = "all"; els.rankedOnly.checked = false;
  state.sort = { groups: { key: "wins", dir: -1 }, floats: { key: "year", dir: -1 } };
  state.openDecade = null;
  closeDetail();
  setMode("editions");
  applyFilters();
  state.selection = null;
  history.replaceState(null, "", location.pathname);
  renderIndex();
  renderDetail();
  els.indexBody.scrollTop = 0;
}

/* ── eventos ────────────────────────────────────────────────────────────── */

function bindEvents() {
  els.search.addEventListener("input", event => { state.query = event.target.value; refresh(); });
  els.decade.addEventListener("change", event => { state.decade = event.target.value; refresh(); });
  els.status.addEventListener("change", event => { state.status = event.target.value; refresh(); });
  els.rankedOnly.addEventListener("change", event => { state.rankedOnly = event.target.checked; refresh(); });
  els.clearFilters.addEventListener("click", () => {
    state.query = ""; state.decade = "all"; state.status = "all"; state.rankedOnly = false;
    state.category = null;
    els.search.value = ""; els.decade.value = "all"; els.status.value = "all"; els.rankedOnly.checked = false;
    refresh();
  });

  els.tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

  els.indexTools.addEventListener("change", event => {
    if (!event.target.classList.contains("grid-sort")) return;
    const key = event.target.value;
    state.sort.floats = { key, dir: SORTS.floats[key].type === "text" ? 1 : -1 };
    renderFloatList();
  });

  // La dalia vuelve al inicio: limpia filtros, vuelve a Ediciones y selecciona
  // la ultima edicion con palmares, igual que en el arranque.
  els.home.addEventListener("click", event => {
    event.preventDefault();
    resetToStart();
  });

  els.faq.addEventListener("click", () => select("about", "-"));
  document.getElementById("faq-foot")?.addEventListener("click", () => select("about", "-"));
  // Compartir la web entera: sin hash, para que el enlace no lleve a una ficha.
  els.shareSite.addEventListener("click", () => shareUrl(
    location.origin + location.pathname,
    "Batalla de Flores de Laredo",
    "Archivo interactivo de la Batalla de Flores de Laredo, desde 1908",
    els.shareSite,
  ));

  els.detailClose.addEventListener("click", () => closeDetail());
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDetail();
  });
  // Al pasar a pantalla ancha, el detalle deja de ser una capa: se descuelga.
  NARROW.addEventListener("change", event => {
    if (!event.matches) document.body.classList.remove("detail-open");
  });

  // Un unico delegador: sirve para el indice y para los enlaces del detalle.
  document.addEventListener("click", event => {
    hideTooltip();
    const header = event.target.closest("[data-sort-by]");
    if (header) {
      const [mode, key] = header.dataset.sortBy.split(":");
      const current = state.sort[mode];
      if (current.key === key) {
        current.dir = -current.dir;
      } else {
        // Texto arranca ascendente; los recuentos, de mayor a menor.
        state.sort[mode] = { key, dir: SORTS[mode][key].type === "text" ? 1 : -1 };
      }
      renderIndex();
      return;
    }

    if (event.target.closest("#share")) { shareCurrent(); return; }

    const jump = event.target.closest("[data-mode-jump]");
    if (jump) { setMode(jump.dataset.modeJump); return; }

    const decadeToggle = event.target.closest("[data-decade]");
    if (decadeToggle) {
      const decade = Number(decadeToggle.dataset.decade);
      state.openDecade = state.openDecade === decade ? null : decade;
      renderYearGrid();
      return;
    }

    const tableHeader = event.target.closest("table.palmares thead th");
    if (tableHeader) {
      handleDetailSort(tableHeader);
      return;
    }

    const category = event.target.closest("[data-category]");
    if (category) {
      state.category = category.dataset.category || null;
      if (state.mode !== "floats") setMode("floats");
      else renderFloatList();
      return;
    }

    const editionCat = event.target.closest("[data-edition-cat]");
    if (editionCat) {
      state.editionCategory = editionCat.dataset.editionCat;
      renderDetail();
      return;
    }

    const statsCat = event.target.closest("[data-stats-cat]");
    if (statsCat) {
      state.statsCategory = statsCat.dataset.statsCat;
      renderStatsTab();
      return;
    }

    const flip = event.target.closest("[data-flip]");
    if (flip) {
      state.sort.floats.dir = -state.sort.floats.dir;
      renderFloatList();
      return;
    }

    const view = event.target.closest("[data-view]");
    if (view) {
      state.floatView = view.dataset.view;
      renderFloatList();
      return;
    }

    const target = event.target.closest("[data-year], [data-group], [data-route], [data-float]");
    if (!target) return;
    if (target.dataset.year) {
      if (state.mode !== "editions") setMode("editions");
      select("year", Number(target.dataset.year));
    } else if (target.dataset.group) {
      if (state.mode !== "groups") setMode("groups");
      select("group", target.dataset.group);
    } else if (target.dataset.route) {
      if (state.mode !== "routes") setMode("routes");
      select("route", target.dataset.route);
    } else if (target.dataset.float) {
      if (state.mode !== "floats") setMode("floats");
      select("float", target.dataset.float);
    }
  });

  window.addEventListener("hashchange", () => {
    const selection = readHash();
    if (selection) select(selection.kind, selection.id, { updateHash: false });
  });
}

/* ── arranque ───────────────────────────────────────────────────────────── */

fetch("batalla_de_flores/data/batalla_de_flores.json")
  .then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(dataset => {
    state.dataset = dataset;
    state.routes = dataset.map_features || [];
    state.mapAttribution = dataset.map_attribution || null;
    state.groups = dataset.groups || [];
    state.editions = (dataset.editions || []).map(edition => ({
      ...edition,
      searchIndex: buildSearchIndex(edition),
    }));

    state.floats = buildFloatIndex(state.editions);

    renderStats();
    renderFilterOptions();
    bindEvents();
    setupTooltip();
    applyFilters();

    const fromHash = readHash();
    if (fromHash) {
      if (fromHash.kind === "group") setMode("groups");
      if (fromHash.kind === "route") setMode("routes");
      if (fromHash.kind === "float") setMode("floats");
      select(fromHash.kind, fromHash.id, { updateHash: false });
    } else {
      // Sin seleccion de salida: con una edicion ya abierta, la rejilla no
      // invitaba a pinchar.
      renderIndex();
      renderDetail();
    }
  })
  .catch(error => {
    els.detail.innerHTML = `<p class="empty">No he podido cargar el dataset (${esc(error.message)}).</p>`;
  });

/* El plano viaja aparte (~170 KB) y no bloquea nada: hasta que llega, los mapas
 * se pintan solo con los recorridos y al llegar se repinta lo que haya en
 * pantalla. Si falla, el archivo sigue funcionando entero. */
fetch("batalla_de_flores/data/map.json")
  .then(response => (response.ok ? response.json() : null))
  .then(map => {
    if (!map) return;
    state.map = map;
    if (state.selection) renderDetail();
    if (state.mode === "routes") renderIndex();
  })
  .catch(() => {});
