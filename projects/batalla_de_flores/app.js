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
  indexBody: document.getElementById("index-body"),
  legend: document.getElementById("legend"),
  detail: document.getElementById("detail"),
  home: document.getElementById("home"),
  detailClose: document.getElementById("detail-close"),
};

const state = {
  dataset: null,
  editions: [],
  groups: [],
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
  groupSort: { key: "wins", dir: -1 },
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
 * poca informacion — de hecho esos anos traen mas carrozas que muchos "strong". */
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
  manual_seed: "Seed manual",
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
  if (!sourceType) return "—";
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
    `<span><b>${num(summary.years_with_ranked_results)}</b> años con palmarés</span>`,
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
    els.indexCount.textContent = `0 de ${num(state.editions.length)} ediciones`;
    els.indexBody.innerHTML = '<p class="empty">Ninguna edición encaja con los filtros actuales.</p>';
    return;
  }

  els.indexCount.textContent = `${num(state.filtered.length)} de ${num(state.editions.length)} ediciones`;
  // Cronologico inverso: arriba la decada mas reciente, y dentro de cada
  // decada el ano mas reciente primero, para que la lectura sea descendente
  // de principio a fin.
  const openDecade = resolveOpenDecade([...decades.keys()]);
  els.indexBody.innerHTML = [...decades.entries()].reverse().map(([decade, editions]) => `
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
              <span class="year-meta">${count ? `${count} carroza${count === 1 ? "" : "s"}` : STATUS_LABEL[edition.status] || "—"}</span>
              <span class="year-bar"></span>
            </button>`;
        }).join("")}
      </div>
    </div>`).join("");
}

/* ── indice: grupos ─────────────────────────────────────────────────────── */

/* Claves de ordenacion de la lista de grupos. `text` ordena ignorando tildes
 * y mayusculas; el resto son numericas. */
const GROUP_SORTS = {
  name: { type: "text", get: group => normalizeText(group.canonical_name) },
  from: { type: "num", get: group => group.first_year_seen },
  to: { type: "num", get: group => group.last_year_seen },
  editions: { type: "num", get: group => group.years.length },
  floats: { type: "num", get: group => group.float_count },
  wins: { type: "num", get: group => group.wins },
};

function sortGroups(groups) {
  const sort = GROUP_SORTS[state.groupSort.key] || GROUP_SORTS.wins;
  const dir = state.groupSort.dir;
  return [...groups].sort((a, b) => {
    const left = sort.get(a);
    const right = sort.get(b);
    if (left < right) return -dir;
    if (left > right) return dir;
    // Desempate estable: mas carrozas primero y luego alfabetico.
    return b.float_count - a.float_count
      || normalizeText(a.canonical_name).localeCompare(normalizeText(b.canonical_name));
  });
}

function sortHeader(key, label, extraClass = "") {
  const isActive = state.groupSort.key === key;
  const arrow = isActive ? (state.groupSort.dir === 1 ? " ▲" : " ▼") : "";
  return `<button class="sort${isActive ? " is-sorted" : ""} ${extraClass}" type="button"
    data-sort-group="${key}" aria-sort="${isActive ? (state.groupSort.dir === 1 ? "ascending" : "descending") : "none"}"
  >${label}${arrow}</button>`;
}

function renderGroupList() {
  const groups = filteredGroups();
  els.indexCount.textContent = `${num(groups.length)} de ${num(state.groups.length)} grupos`;
  if (!groups.length) {
    els.indexBody.innerHTML = '<p class="empty">Ningún grupo encaja con los filtros actuales.</p>';
    return;
  }
  els.indexBody.innerHTML = `
    <div class="rows rows-groups">
      <div class="row-head">
        ${sortHeader("name", "Grupo")}
        ${sortHeader("from", "Desde", "col-num")}
        ${sortHeader("to", "Hasta", "col-num")}
        ${sortHeader("editions", "Ediciones", "col-num col-ed")}
        ${sortHeader("floats", "Carrozas", "col-num")}
        ${sortHeader("wins", "1.º", "col-num col-wins")}
      </div>
      ${sortGroups(groups).map(group => {
        const slug = slugifyGroup(group.canonical_name);
        const active = state.selection?.kind === "group" && state.selection.id === slug;
        return `
          <button class="row${active ? " is-active" : ""}" type="button" data-group="${esc(slug)}">
            <span class="row-name">${esc(group.canonical_name)}</span>
            <span class="col-num">${group.first_year_seen}</span>
            <span class="col-num">${group.last_year_seen}</span>
            <span class="col-num col-ed">${group.years.length}</span>
            <span class="col-num">${group.float_count}</span>
            <span class="col-num col-wins">${group.wins || "—"}</span>
          </button>`;
      }).join("")}
    </div>`;
}

/* ── indice: recorridos ─────────────────────────────────────────────────── */

function renderRouteList() {
  els.indexCount.textContent = `${state.routes.length} eras de recorrido`;
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
          <span class="row-sub">${yearRange(route.start_year, route.end_year)} · ${editions.length} ediciones · ${num(floats)} carrozas</span>
          ${route.approximate ? '<span class="row-sub"><em>trazado aproximado</em></span>' : ""}
        </span>
      </button>`;
  }).join("")}</div>`;
}

function renderIndex() {
  if (state.mode === "editions") renderYearGrid();
  else if (state.mode === "groups") renderGroupList();
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

function mapLayers(project, activeId, { showStreets, showLabels }) {
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
    <g class="map-labels">${labels.texts}</g>`;
}

function renderRouteMap(activeId, { variant = "detail" } = {}) {
  const active = state.routes.find(route => route.id === activeId);
  const all = routeGeometries().flatMap(route => route.geometry.coordinates);
  if (!all.length) return "";

  const sizes = { detail: [420, 300], compact: [300, 200], thumb: [128, 84] };
  const [width, height] = sizes[variant] || sizes.detail;

  const zoomToRoute = variant !== "thumb" && active?.geometry?.coordinates?.length;
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
      })}
      ${variant === "thumb" ? "" : scaleBar(project)}
    </svg>`;

  if (variant === "thumb") return `<span class="map-thumb">${svg}</span>`;

  const attribution = state.map?.attribution || state.mapAttribution;
  return `
    <figure class="map map-${variant}">
      ${svg}
      ${attribution ? `<figcaption>Trazados de
        <a href="${esc(attribution.url)}" target="_blank" rel="noopener">${esc(attribution.source)}</a>
        (${esc(attribution.licence)}). Geometría actual de las calles, no plano histórico.</figcaption>` : ""}
    </figure>`;
}

/* ── detalle: edicion ───────────────────────────────────────────────────── */

function sourceCell(entry) {
  const url = entry.float_url || (entry.source_urls || [])[0];
  const tag = `<span class="tag" title="${esc(sourceLabel(entry.source_type))} (source_type: ${esc(entry.source_type || "")})">${esc(sourceShort(entry.source_type))}</span>`;
  return `<span class="src">${tag}${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">fuente ↗</a>` : ""}</span>`;
}

/* "A1.º" ordenado como texto daria A1, A10, A2. Se genera una clave
 * categoria + posicion rellenada a tres digitos. */
function positionSortKey(entry) {
  return `${entry.category || "Z"}${String(entry.position ?? 999).padStart(3, "0")}`;
}

function prizeChips(entry) {
  const prizes = [];
  if (entry.prize_art_rank) prizes.push(`Arte ${entry.prize_art_rank}.º`);
  if (entry.prize_costumes_rank) prizes.push(`Vestidos ${entry.prize_costumes_rank}.º`);
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
        <a href="${esc(entry.float_url || url)}" target="_blank" rel="noopener"
           title="${esc(entry.name)} — imagen alojada en batalladeflores.net">
          <img src="${esc(url)}" alt="${esc(entry.name)}" loading="lazy" referrerpolicy="no-referrer">
        </a>`).join("")}
    </div>
    <p class="muted" style="margin-top:6px">Imágenes servidas por batalladeflores.net; cada una enlaza a su ficha original.</p>`;
}

function provenanceBlock(entries, sources) {
  const counts = new Map();
  entries.forEach(entry => {
    const label = sourceLabel(entry.source_type);
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return `
    <div class="provenance">
      <b>Procedencia</b>
      <ul>
        ${[...counts.entries()].sort((a, b) => b[1] - a[1])
          .map(([label, count]) => `<li>${esc(label)}: ${count} entrada${count === 1 ? "" : "s"}</li>`).join("")
          || "<li>Sin entradas registradas para esta edición.</li>"}
      </ul>
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

  els.detail.innerHTML = `
    <div class="detail-head">
      <h2>${edition.year}</h2>
      <span class="label">${esc(edition.edition_label || "")}</span>
    </div>
    <div class="chips">
      <span class="chip rose">${esc(STATUS_LABEL[edition.status] || edition.status || "sin estado")}</span>
      <span class="chip ${coverageTier(edition) === "tier-full" ? "leaf" : "gold"}">${esc(COVERAGE_LABEL[edition.coverage] || edition.coverage || "")}</span>
      ${route ? `<button class="chip sky group-link" type="button" data-route="${esc(route.id)}">${esc(route.label)}</button>` : ""}
    </div>

    <div class="kpis">
      <div class="kpi"><span>${num(edition.result_count || 0)}</span><small>en palmarés</small></div>
      <div class="kpi"><span>${num(edition.float_count || 0)}</span><small>carrozas</small></div>
      <div class="kpi"><span>${num(new Set(entries.map(e => e.group_canonical).filter(Boolean)).size)}</span><small>grupos</small></div>
      <div class="kpi"><span>${num((edition.source_urls || []).length)}</span><small>fuentes</small></div>
    </div>

    ${route?.geometry ? renderRouteMap(route.id, { variant: "compact" }) : ""}

    ${renderGallery(entries)}

    ${ranked.length ? `
      <h3 class="section">Palmarés</h3>
      <table class="palmares">
        <thead><tr>
          <th data-sort-type="text">Pos.</th>
          <th data-sort-type="text">Carroza</th>
          <th data-sort-type="text">Grupo</th>
          <th data-sort-type="text">Fuente</th>
        </tr></thead>
        <tbody>
          ${ranked.map(entry => `
            <tr>
              <td class="pos" data-sort="${esc(positionSortKey(entry))}">${entry.category ? esc(entry.category) : ""}${entry.position != null ? `${entry.position}.º` : "—"}</td>
              <td class="name" data-sort="${esc(normalizeText(entry.name))}">${esc(entry.name)}${prizeChips(entry)
                ? `<small class="prizes">${esc(prizeChips(entry))}</small>` : ""}</td>
              <td class="group" data-sort="${esc(normalizeText(entry.group_canonical))}">${entry.group_canonical
                ? `<button class="group-link" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
                : "—"}</td>
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
                ? `<button class="group-link" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
                : "—"}</td>
              <td data-sort="${esc(sourceShort(entry.source_type))}">${sourceCell(entry)}</td>
            </tr>`).join("")}
        </tbody>
      </table>` : ""}

    ${(edition.notes || []).length ? `
      <h3 class="section">Notas</h3>
      <ul class="plain">${edition.notes.map(note => `<li>${esc(note)}</li>`).join("")}</ul>` : ""}

    ${provenanceBlock(entries, edition.source_urls || [])}
  `;
  els.detail.scrollTop = 0;
}

/* ── detalle: grupo ─────────────────────────────────────────────────────── */

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
    </div>
    <div class="chips">
      <span class="chip rose">${yearRange(group.first_year_seen, group.last_year_seen)}</span>
      ${categories.map(([cat, count]) => `<span class="chip">Cat. ${esc(cat)}: ${count}</span>`).join("")}
    </div>

    <div class="kpis">
      <div class="kpi"><span>${num(group.float_count)}</span><small>carrozas</small></div>
      <div class="kpi"><span>${num(group.wins)}</span><small>primeros puestos</small></div>
      <div class="kpi"><span>${num(podium)}</span><small>podios</small></div>
      <div class="kpi"><span>${num(group.years.length)}</span><small>ediciones</small></div>
    </div>

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
            <td class="pos" data-sort="${entry.year}"><button class="group-link" type="button" data-year="${entry.year}">${entry.year}</button></td>
            <td class="name" data-sort="${esc(normalizeText(entry.name))}">${esc(entry.name)}</td>
            <td class="pos" data-sort="${esc(positionSortKey(entry))}">${entry.category ? esc(entry.category) : ""}${entry.position != null ? `${entry.position}.º` : "—"}</td>
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
      <span class="chip rose">${yearRange(route.start_year, route.end_year)}</span>
      <span class="chip ${route.geometry ? "leaf" : ""}">${route.geometry
        ? (route.approximate ? "Trazado aproximado" : "Trazado real")
        : "Sin traza"}</span>
      ${route.osm?.old_name ? `<span class="chip gold">antes: ${esc(route.osm.old_name)}</span>` : ""}
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
      <b>Procedencia</b>
      <ul>
        <li>Las eras las declara el Ayuntamiento de Laredo en su página de la fiesta.</li>
        ${route.osm ? `<li>Geometría: OpenStreetMap, ${route.osm.way_ids.length === 1
          ? `way <code>${route.osm.way_ids[0]}</code>`
          : `${route.osm.way_ids.length} ways`} de «${esc(route.osm.name)}».</li>` : ""}
        ${route.approximate ? "<li>Trazado <b>aproximado</b>: ninguna fuente detalla las calles exactas del circuito.</li>" : ""}
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

function renderDetail() {
  const selection = state.selection;
  if (!selection) {
    const latest = latestRankedEdition();
    els.detail.innerHTML = `
      <div class="placeholder">
        <p class="placeholder-lead">Elige un año en la rejilla.</p>
        <p>Cada edición trae su palmarés, las carrozas documentadas, las fotos que
        conserva el archivo y el recorrido de aquel año.</p>
        <p>También puedes recorrerlo por <button class="group-link" type="button"
          data-mode-jump="groups">grupos</button> —quién más ha desfilado y quién más ha
        ganado— o por <button class="group-link" type="button" data-mode-jump="routes">recorridos</button>,
        que han cambiado tres veces desde 1908.</p>
        ${latest ? `<p class="placeholder-hint">Lo último: <button class="group-link" type="button"
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
  els.detail.innerHTML = '<p class="empty">No encuentro ese elemento en el dataset.</p>';
}

function select(kind, id, { updateHash = true, reveal = true } = {}) {
  state.selection = { kind, id };
  // En movil el detalle se superpone al indice; en escritorio no hace nada.
  if (reveal && isNarrow()) document.body.classList.add("detail-open");
  if (updateHash) {
    const prefix = { year: "y", group: "g", route: "r" }[kind];
    history.replaceState(null, "", `#/${prefix}/${id}`);
  }
  renderIndex();
  renderDetail();
}

function readHash() {
  const match = /^#\/(y|g|r)\/(.+)$/.exec(location.hash);
  if (!match) return null;
  const [, prefix, rawId] = match;
  const id = decodeURIComponent(rawId);
  if (prefix === "y") return { kind: "year", id: Number(id) };
  if (prefix === "g") return { kind: "group", id };
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

function closeDetail() {
  document.body.classList.remove("detail-open");
}

function resetToStart() {
  state.query = ""; state.decade = "all"; state.status = "all"; state.rankedOnly = false;
  els.search.value = ""; els.decade.value = "all"; els.status.value = "all"; els.rankedOnly.checked = false;
  state.groupSort = { key: "wins", dir: -1 };
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
    els.search.value = ""; els.decade.value = "all"; els.status.value = "all"; els.rankedOnly.checked = false;
    refresh();
  });

  els.tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

  // La dalia vuelve al inicio: limpia filtros, vuelve a Ediciones y selecciona
  // la ultima edicion con palmares, igual que en el arranque.
  els.home.addEventListener("click", event => {
    event.preventDefault();
    resetToStart();
  });

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
    const groupSort = event.target.closest("[data-sort-group]");
    if (groupSort) {
      const key = groupSort.dataset.sortGroup;
      if (state.groupSort.key === key) {
        state.groupSort.dir = -state.groupSort.dir;
      } else {
        // Texto arranca ascendente; los recuentos, de mayor a menor.
        state.groupSort = { key, dir: GROUP_SORTS[key]?.type === "text" ? 1 : -1 };
      }
      renderGroupList();
      return;
    }

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

    const target = event.target.closest("[data-year], [data-group], [data-route]");
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

    renderStats();
    renderFilterOptions();
    bindEvents();
    applyFilters();

    const fromHash = readHash();
    if (fromHash) {
      if (fromHash.kind === "group") setMode("groups");
      if (fromHash.kind === "route") setMode("routes");
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
