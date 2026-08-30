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
  statsZoom: 1,           // 1 | 2 | 4: ensancha el grafico de barras y lo hace scrollable
  carrerasZoom: 1,        // factor sobre "todo a la vista" en el grafico de trayectorias
  carrerasCentro: null,   // que punto del siglo se esta mirando, de 0 a 1
  about: "",              // el texto de «¿Qué es esta página?», de que_es_esto.json
  editionCategory: "todas",  // "todas" | "A" | "B" — qué se ve en el palmarés
  routes: [],
  map: null,          // plano (calles, manzanas, verde): llega aparte
  mapAttribution: null,
  filtered: [],
  mode: "editions",
  selection: null, // {kind: "year"|"group"|"route", id}
  query: "",
  decade: "all",
  winnersOnly: false,
  // Se pone al pulsar un codigo de fuente: la ficha se abre con el bloque de
  // procedencia desplegado, que es justo lo que se ha ido a mirar.
  abrirProcedencia: false,
  // ¿Hemos apilado NOSOTROS alguna entrada de historial en esta sesión? Si se
  // entra directo por un enlace con # -desde el historial de Chrome, o desde
  // WhatsApp- no hay nada detrás, y volver atrás saca de la web.
  historialPropio: false,
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

/* El mismo estado, dicho corto. La rejilla tiene celdas de 60 px y la ficha una
 * línea entera: no cabe lo mismo en las dos, y forzarlo desigualaba la rejilla.
 * Coincide a propósito con los nombres de la leyenda que hay justo debajo. */
const ESTADO_CORTO = {
  not_held: "Sin datos",
  unknown: "Sin datos",
  cancelled: "Cancelada",
  planned: "Prevista",
};

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
  manual_seed: "Semilla inicial, sin página registrada",
  press_photo: "Prensa (pie de foto)",
  press_clipping: "Recorte de prensa",
  photo_archive: "Fotos cedidas por Santi Fernández",
  book: "Libro del Centenario (Oruña Fuentes, 2008)",
  press_history: "Hemeroteca histórica",
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
  press_clipping: "REC",
  photo_archive: "FOTO",
  book: "LIBRO",
  press_history: "HEMER",
};

const SOURCE_EXPLICA = {
  archive_palmares: "La página de palmarés que batalladeflores.net dedica a esa edición.",
  archive_float_page: "La página que batalladeflores.net dedica a esa carroza en concreto. "
    + "Es la misma web que el palmarés, así que coincidir con él no confirma nada.",
  official_result: "La nota que publica el Ayuntamiento de Laredo con la clasificación.",
  official_result_summary: "Resumen de prensa del resultado oficial del Ayuntamiento.",
  manual_seed: "Copiados de una web en la primera versión del proyecto sin anotar de qué "
    + "página. Es la fuente más débil del archivo: no hay forma de comprobarla.",
  press_photo: "El pie de una foto de prensa.",
  press_clipping: "Un recorte de prensa transcrito a mano, con el escaneo enlazado.",
  photo_archive: "El puesto y el grupo salen de cómo nombró él los ficheros al entregarlos: "
    + "lo afirma él, no lo deducimos nosotros.",
  book: "«Batalla de Flores de Laredo. 100 años de historia viva», de Alfonso Oruña Fuentes (2008).",
  press_history: "Prensa de la época —Mundo Gráfico, ABC, La Voz— leída de los escaneos.",
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

/* Por que ESTA edicion pasa el filtro del buscador.
 *
 * La rejilla filtra por un indice que incluye carrozas y grupos, pero la celda
 * solo ensena el ano: buscabas «pejino», quedaban ocho anos, y no habia forma
 * de saber que pintaba 1993 ahi. Esto devuelve la carroza o el grupo que ha
 * coincidido, para pintarlo debajo del ano.
 *
 * Dos frenos a proposito: nada con menos de dos letras -con una coincide
 * medio archivo y seria ruido-, y nada cuando lo buscado esta en el propio
 * ano visible, que entonces la razon es obvia. */
function razonDelFiltro(edition, query) {
  if (!query || query.length < 2) return null;
  if (String(edition.year).includes(query)) return null;
  const vistos = new Set();
  const razones = [];
  (edition.floats || []).forEach(entry => {
    let razon = null;
    if (normalizeText(entry.name).includes(query)) razon = { icono: "🌺", texto: entry.name };
    else if (normalizeText(`${entry.group_canonical || ""} ${entry.group_raw || ""}`).includes(query)) {
      razon = { icono: "👥", texto: entry.group_canonical || entry.group_raw };
    }
    if (razon && !vistos.has(razon.icono + razon.texto)) {
      vistos.add(razon.icono + razon.texto);
      razones.push(razon);
    }
  });
  return razones.length ? razones : null;
}

function applyFilters() {
  const query = normalizeText(state.query);
  state.filtered = state.editions.filter(edition => {
    if (state.decade !== "all" && Math.floor(edition.year / 10) * 10 !== Number(state.decade)) return false;
    if (query && !edition.searchIndex.includes(query)) return false;
    return true;
  });
  // "Limpiar" sin nada que limpiar es un boton muerto, y en el movil ademas
  // roba 64 px de una fila donde el buscador ya no tiene sitio para su propio
  // texto. Aparece cuando hay algo que quitar y desaparece cuando no.
  els.clearFilters.hidden = !hayAlgunFiltro();
}

function hayAlgunFiltro() {
  return Boolean(state.query) || state.decade !== "all"
    || state.winnersOnly || state.category;
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
    // "Ganadora" es el 1.er puesto, sea de la categoria que sea: en los anos de
    // categoria unica hay una, y desde que se parte en A y B hay dos. Filtrar
    // solo la A dejaria fuera media historia de la fiesta.
    && (!state.winnersOnly || entry.position === 1)
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

/* Aviso de la Noche Magica.
 *
 * Aparece en la cabecera solo en la cuenta atras -desde un mes antes hasta el
 * dia del desfile- y desaparece solo despues. Un banner permanente se vuelve
 * invisible; uno que solo sale cuando sirve, se lee. */
function nocheMagicaEstado(ahora = new Date()) {
  const nm = state.dataset.noche_magica;
  if (!nm?.fecha_iso || !nm?.desfile_iso) return null;

  // Diferencia en DIAS DE CALENDARIO, no en milisegundos: a las 10 de la mañana
  // del 27 faltan diez horas para las 20:00, y restando milisegundos eso
  // redondeaba a "mañana" cuando la respuesta correcta es "hoy".
  const soloDia = fecha => Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const [ay, am, ad] = nm.fecha_iso.split("-").map(Number);
  const [dy, dm, dd] = nm.desfile_iso.split("-").map(Number);
  const hoy = soloDia(ahora);
  const noche = Date.UTC(ay, am - 1, ad);
  const desfile = Date.UTC(dy, dm - 1, dd);

  const dias = Math.round((noche - hoy) / 86400000);
  if (hoy > desfile || dias > 31) return null;
  return { nm, dias, esDiaDesfile: hoy === desfile, ahora };
}

function renderNocheMagica() {
  const estado = nocheMagicaEstado();
  const caja = document.getElementById("noche-magica");
  if (!caja) return;
  if (!estado) { caja.hidden = true; return; }

  const { nm, dias, esDiaDesfile, ahora } = estado;
  const [, , hora] = (nm.hora.match(/(\d{1,2}):(\d{2})/) || [null, null, null]);
  const empezada = dias === 0 && ahora.getHours() >= Number((nm.hora.match(/(\d{1,2}):/) || [0, 20])[1]);

  let titular;
  if (esDiaDesfile) titular = "El desfile es hoy";
  else if (dias === 0) titular = empezada ? "La Noche Mágica está siendo ahora" : "La Noche Mágica es hoy";
  else if (dias === 1) titular = "La Noche Mágica es mañana";
  else titular = `La Noche Mágica es en ${dias} días`;

  // Corto a proposito: el recuadro vive sobre la cabecera y cada linea de mas
  // empuja el contenido real hacia abajo.
  const dia = esc(nm.fecha.replace(/ de \d{4}$/, "").replace(" de agosto", ""));
  const detalle = esDiaDesfile
    ? `${nm.desfile_hora ? `A las ${esc(nm.desfile_hora)} ` : ""}en la Alameda Miramar, ${nm.float_count} carrozas.`
    : `${dia} de agosto, ${esc(nm.hora)}. Locales abiertos de los ${nm.grupos.length} grupos.`;

  caja.hidden = false;
  caja.innerHTML = `
    <span class="nm-flor">🌺</span>
    <button class="nm-texto" type="button" data-year="${nm.year}"
      title="${esDiaDesfile ? "Ver la edición" : "Ver el mapa y los locales"}"><b>${titular}</b> · ${detalle}</button>
    <button class="nm-ir" type="button" data-year="${nm.year}">${
      esDiaDesfile ? `Ver <span class="nm-largo">la edición </span>${nm.year} →` : "Ver el mapa →"}</button>`;
}

function renderStats() {
  const summary = state.dataset.summary || {};
  els.stats.innerHTML = [
    // La cifra oficial, no el numero de filas: nuestros registros abarcan anos
    // en los que no hubo desfile y otros de los que no sabemos nada.
    `<span><b>${num(summary.official_edition_count || summary.edition_count)}</b> ediciones</span>`,
    `<span><b>${num(summary.float_count)}</b> carrozas</span>`,
    `<span><b>${num(summary.group_count)}</b> grupos</span>`,
  ].join("");
  const version = state.dataset.version ? `v${state.dataset.version}` : "sin versión";
  // Version y fecha en dos spans: la CSS los apila en columna. Asi caben los
  // dos en el movil sin que la barra crezca —dos lineas de letra diminuta
  // suman menos alto que una del texto normal de al lado— y sin separador,
  // que apilado sobraria.
  els.build.innerHTML = `<span>${esc(version)}</span><span class="build-fecha">${esc(
    state.dataset.built_at || state.dataset.updated_at || "s/f")}</span>`;
}

function renderFilterOptions() {
  const decades = [...new Set(state.editions.map(edition => Math.floor(edition.year / 10) * 10))].sort();
  els.decade.innerHTML = ['<option value="all">Todas las décadas</option>']
    .concat(decades.map(decade => `<option value="${decade}">${decade}s</option>`)).join("");
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
          const razones = razonDelFiltro(edition, normalizeText(state.query));
          const razon = razones && razones[0];
          return `
            <button class="year ${coverageClass(edition)}${active ? " is-active" : ""}"
                    type="button" data-year="${edition.year}"
                    title="${esc(edition.edition_label || edition.year)} · ${esc(COVERAGE_LABEL[edition.coverage] || "")}">
              <span class="year-num">${edition.year}</span>
              ${razon ? `<span class="year-meta year-razon"
                title="Coincide: ${esc(razones.map(r => r.texto).join(" · "))}">${razon.icono} ${esc(razon.texto)}${
                razones.length > 1 ? ` +${razones.length - 1}` : ""}</span>`
              : `<span class="year-meta">${count
                ? `${count} carroza${count === 1 ? "" : "s"}`
                // En la rejilla, la etiqueta corta. «Hueco documental» son
                // dieciséis caracteres contra los diez de «5 carrozas», y esa
                // celda salía visiblemente más ancha que sus vecinas, dejando la
                // rejilla desigual. Además la leyenda de abajo ya lo llamaba
                // «Sin datos»: eran dos nombres para lo mismo en la misma
                // pantalla. El nombre largo sigue en la ficha, que es donde hay
                // sitio para explicarse.
                : (ESTADO_CORTO[edition.status] || STATUS_LABEL[edition.status] || "–")}</span>`}
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
  return `<button class="chip link-chip t-float chip-filtro" type="button" data-category=""
    title="Quitar el filtro y ver todas las carrozas">
    Solo categoría ${esc(state.category)} ✕</button>`;
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

/* Filtro de ganadoras. Va en la barra de la pestana y no en los controles
 * generales de arriba porque solo tiene sentido aqui: en Ediciones o en Grupos
 * no hay nada que filtrar por puesto.
 *
 * Es un boton y no una casilla, y va PEGADO a «Fotos / Lista».
 *
 * Como casilla, y de ultimo en una barra empujada al borde derecho, se reporto
 * dos veces sin encontrarlo estando a la vista. Un control que decide QUE se
 * enseña tiene que estar donde ya se esta mirando —junto al que decide COMO se
 * enseña—, no en la otra punta. El orden de la fila lo dice: primero que ves
 * (Fotos/Lista), luego cuales (ganadoras), y ya al final en que orden. */
function winnersToggle() {
  return `
    <button class="view solo-ganadoras${state.winnersOnly ? " is-on" : ""}" type="button"
      data-winners="1" aria-pressed="${state.winnersOnly}"
      title="Enseñar solo las carrozas que ganaron su categoría">
      ${ICON_TROPHY} Solo ganadoras</button>`;
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
  els.indexTools.innerHTML = `${viewToggle()}${winnersToggle()}${gridSort()}${categoryNote()}`;
  els.indexCount.textContent = `${num(withPhoto.length)} con foto`;

  if (!withPhoto.length) {
    els.indexBody.innerHTML = '<p class="empty">Ninguna de estas carrozas tiene foto en el archivo.</p>';
    return;
  }

  els.indexBody.innerHTML = `<div class="float-grid">${sortRows("floats", withPhoto).map(entry => {
    const active = state.selection?.kind === "float" && state.selection.id === entry.id;
    return `
      <button class="tile${active ? " is-active" : ""}" type="button"
              ${photoAttrs(entry, entry.image_urls[0])}>
        <img src="${esc(thumbUrl(entry.image_urls[0]))}" alt="${esc(entry.name)}" loading="lazy">
        ${winnerBadge(entry)}
        <span class="tile-name">${esc(entry.name)}</span>
        <span class="tile-meta">${entry.year}${entry.position != null
          ? ` · ${entry.category || ""}${entry.position}.º` : ""}</span>
      </button>`;
  }).join("")}</div>`;
}

function renderFloatList() {
  const rows = filteredFloats();
  if (state.floatView === "grid") return renderFloatGrid(rows);

  els.indexTools.innerHTML = `${viewToggle()}${winnersToggle()}${gridSort(true)}${categoryNote()}`;
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
        <span class="col-src">Fuentes</span>
        <span aria-hidden="true"></span>
      </div>
      ${sortRows("floats", rows).map(entry => {
        const active = state.selection?.kind === "float" && state.selection.id === entry.id;
        return `
          <div class="row row-float${active ? " is-active" : ""}" role="button" tabindex="0"
               data-float="${esc(entry.id)}">
            <span class="row-name">${winnerBadge(entry, true)}${esc(entry.name)}${reviewMark(entry)}<small>${esc(entry.group_canonical || "sin grupo")}</small></span>
            <span class="col-grp">${esc(entry.group_canonical || "–")}</span>
            <span class="col-num">${entry.year}</span>
            <span class="col-num col-cat">${entry.category ? esc(entry.category) : "única"}</span>
            <span class="col-num">${entry.position != null ? `${entry.position}.º` : "–"}</span>
            <span class="col-src">${auditCell(entry)}</span>
            <span class="row-go" aria-hidden="true">›</span>
          </div>`;
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

/* Enseña el tooltip pegado a un elemento, no al cursor.
 *
 * Hace falta porque en un móvil no hay `hover` NI se ven los `title`: un chip
 * que solo se explica al pasar por encima está mudo en la mitad de los
 * dispositivos. Al tocarlo, el texto sale encima del propio chip. */
function mostrarTipEn(elemento) {
  if (!tipEl || !elemento.dataset.tip) return;
  tipEl.innerHTML = elemento.dataset.tip;
  tipEl.hidden = false;
  const caja = elemento.getBoundingClientRect();
  const x = Math.min(caja.left, window.innerWidth - tipEl.offsetWidth - 8);
  const arriba = caja.top - tipEl.offsetHeight - 8;
  tipEl.style.left = `${Math.max(8, x)}px`;
  tipEl.style.top = `${arriba < 8 ? caja.bottom + 8 : arriba}px`;
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

/* "2009, 2012 y 2013", no "2009, 2012, 2013". */
function listYears(years) {
  if (years.length < 2) return String(years[0] ?? "");
  return `${years.slice(0, -1).join(", ")} y ${years[years.length - 1]}`;
}

function statsYears() {
  const years = state.editions.map(edition => edition.year);
  return { min: Math.min(...years), max: Math.max(...years) };
}

function makeScale({ from, to, width, left, right = CHART.padR }) {
  return year => left + ((year - from) / (to - from || 1)) * (width - left - right);
}

/* El paso del eje X se calcula, no se fija: se pinta un ano de cada N, siendo N
 * el menor paso "redondo" que deje los rotulos separados al menos `minGap`.
 * Asi salen todos los anos cuando caben, y solo se ralean cuando se tocarian.
 * Se mide en unidades del viewBox, que es donde vive tambien el tamano de letra:
 * al encoger el SVG encogen los dos a la vez, asi que la cuenta sigue valiendo. */
const YEAR_STEPS = [1, 2, 5, 10, 20, 25, 50, 100];

/* 28 unidades: un ano ocupa ~23, asi que deja un respiro de ~5 entre rotulos.
 * Bajarlo los pega; subirlo empieza a esconder anos que cabian. */
function yearStepFor(scale, from, to, minGap = 28) {
  const perYear = Math.abs(scale(to) - scale(from)) / Math.max(to - from, 1);
  return YEAR_STEPS.find(step => step * perYear >= minGap) || YEAR_STEPS[YEAR_STEPS.length - 1];
}

function yearAxis(scale, { from, to, step, height, minGap }) {
  step = step || yearStepFor(scale, from, to, minGap);
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

function carrerasRows(category) {
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
  return [...series.entries()]
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
}

/* El grafico se pinta en pixeles de verdad, no en un viewBox que se estira.
 *
 * Un viewBox escalado tiene la ventaja de no necesitar medir nada, pero al
 * estirar el tiempo estira TAMBIEN las letras y los puntos: el ano 1908 acabaria
 * escrito en cuerpo 30. Aqui lo que cambia es cuantos pixeles ocupa un ano; los
 * nombres, las cifras del eje y los circulos miden siempre lo mismo. Por eso hay
 * que medir el hueco disponible, y por eso el pintado va aparte del armado del
 * bloque: el ancho real no existe hasta que el bloque esta en la pagina.
 *
 * El zoom es un FACTOR sobre el ancho que cabe, no una medida absoluta. Asi 1x
 * es exactamente "todo a la vista", que es como estaba antes de que esto se
 * pudiera mover, y sigue siendolo en un movil y en un monitor de 30 pulgadas. */
const CARRERAS = { nombres: 128, padIzq: 6, zoomMin: 1, zoomMax: 16, paso: 1.6 };

function chartCareers(category) {
  if (!carrerasRows(category).length) {
    return '<p class="empty">No hay suficientes datos en esta categoría.</p>';
  }
  // Solo el armazon: lo de dentro lo pone `pintarCarreras()` cuando ya se puede
  // medir. Se marca el zoom actual para que el bloque sepa reconstruirse igual
  // tras un re-render de la pestana.
  return `<div class="carreras" data-carreras>
    <div class="carreras-nombres"></div>
    <svg class="carreras-svg" role="img"
      aria-label="Trayectoria de cada carrocista a lo largo de los años"></svg>
  </div>`;
}

/* Que año se está mirando, de 0 a 1. Lo apuntan tanto el desplazamiento normal
 * como el arrastre: el arrastre mueve `scrollLeft` a mano y esperar a que el
 * navegador devuelva el evento es dar un rodeo para saber algo que ya sabemos. */
function apuntarCentro(caja) {
  if (caja.scrollWidth <= caja.clientWidth) return;
  state.carrerasCentro = (caja.scrollLeft + caja.clientWidth / 2) / caja.scrollWidth;
}

function pintarCarreras() {
  const caja = document.querySelector("[data-carreras]");
  if (!caja) return;
  const rows = carrerasRows(state.statsCategory);
  if (!rows.length) return;

  const { min, max } = statsYears();
  // El ancho de la columna de nombres se MIDE, no se supone: en el movil la CSS
  // se la estrecha para no comerse media pantalla, y dar por hecho los 128 px
  // dejaba el grafico desbordando desde el primer momento.
  const anchoNombres = caja.querySelector(".carreras-nombres").getBoundingClientRect().width
    || CARRERAS.nombres;
  const hueco = Math.max(180, caja.clientWidth - anchoNombres);
  const ancho = Math.round(hueco * state.carrerasZoom);
  const height = CHART.padT + rows.length * CHART.rowH + CHART.padB;
  const scale = makeScale({ from: min, to: max, width: ancho, left: CARRERAS.padIzq });

  const body = rows.map((row, index) => {
    const y = CHART.padT + index * CHART.rowH + CHART.rowH / 2;
    const dots = row.years.map(item => {
      const cls = item.best === 1 ? "win" : item.best <= 3 ? "podium" : "ran";
      const tip = `${row.name} · ${item.year}<b>${item.names.join(" · ")}</b>`;
      return `<circle class="dot ${cls}" cx="${scale(item.year).toFixed(1)}" cy="${y}"
        r="${item.best === 1 ? 3.4 : 2.6}" data-tip="${esc(tip)}"/>`;
    }).join("");
    const slug = esc(slugifyGroup(row.name));
    return `
      <g class="career${index % 2 ? " alt" : ""}" data-group="${slug}" data-fila="${index}">
        <rect class="career-hit" x="0" y="${y - CHART.rowH / 2}" width="${ancho}" height="${CHART.rowH}"/>
        <line class="span" x1="${scale(row.from).toFixed(1)}" y1="${y}"
              x2="${scale(row.to).toFixed(1)}" y2="${y}"/>
        ${dots}
      </g>`;
  }).join("");

  const svg = caja.querySelector(".carreras-svg");
  svg.setAttribute("viewBox", `0 0 ${ancho} ${height}`);
  svg.setAttribute("width", ancho);
  svg.setAttribute("height", height);
  svg.innerHTML = `${yearAxis(scale, { from: min, to: max, height })}${body}`;

  // Los nombres viven fuera del SVG para poder quedarse clavados a la izquierda
  // mientras el tiempo se desliza por debajo. Dentro del SVG se irian con el.
  const nombres = caja.querySelector(".carreras-nombres");
  nombres.style.height = `${height}px`;
  nombres.innerHTML = rows.map((row, index) => {
    const y = CHART.padT + index * CHART.rowH + CHART.rowH / 2;
    return `<button class="carrera-nombre" type="button" style="top:${y}px"
      data-group="${esc(slugifyGroup(row.name))}" data-fila="${index}"
      title="${esc(row.name)}">${esc(row.name)}</button>`;
  }).join("");

  caja.classList.toggle("hay-scroll", state.carrerasZoom > 1);
  // Los botones del tiempo los pinta `renderStatsTab`, que NO se vuelve a
  // ejecutar al cambiar el zoom -a proposito: repintar la pestana entera
  // mandaria la pagina de vuelta arriba-. Se ponen al dia aqui.
  const fila = document.querySelector("[data-carreras-tiempo]");
  if (fila) {
    const todoElSiglo = state.carrerasZoom <= 1;
    fila.querySelector('[data-carreras-zoom="fit"]').classList.toggle("is-on", todoElSiglo);
    fila.querySelector(".zoom-hint").hidden = todoElSiglo;
  }
  // El `scroll` de un elemento no burbujea, asi que delegarlo en `document` no
  // lo cazaba: va aqui, en la caja misma. `onscroll` en vez de
  // `addEventListener` porque este bloque se repinta y no queremos apilar
  // oyentes en cada repintado.
  caja.onscroll = () => apuntarCentro(caja);
  // Lo que se guarda es el AÑO que se estaba mirando, no el pixel: al estirar
  // el tiempo el pixel deja de significar lo mismo, y al volver de la ficha de
  // un carrocista el grafico saltaba de vuelta a 1908 aunque estuvieras en los
  // setenta.
  if (state.carrerasCentro != null && caja.scrollWidth > caja.clientWidth) {
    caja.scrollLeft = state.carrerasCentro * caja.scrollWidth - caja.clientWidth / 2;
  }
}

/* Grafico 2: cuantas carrozas desfilaron cada edicion.
 *
 * Con 119 ediciones en 720 px cada barra cae a 3,6 px y en un movil no se lee
 * nada. El zoom no escala la imagen: la redibuja mas ancha dentro de un
 * contenedor con scroll, asi que el texto sigue nitido y, sobre todo, caben
 * mas etiquetas de anos. */

/* Paso "redondo" para que la rejilla caiga en cifras que uno diria en voz alta
 * (2, 5, 10) y no en 7 o 13. */
function niceStep(top, target) {
  const raw = top / target;
  return [1, 2, 5, 10, 20, 50].find(step => step >= raw) || 100;
}

function chartFloatsPerYear(zoom = 1) {
  const width = CHART.w * zoom;
  // Al ampliar tambien se gana alto: si no, las lineas de rejilla nuevas caen
  // a 10 px unas de otras y las cifras se tocan.
  const height = zoom > 1 ? 200 : 150;
  const rows = state.editions.filter(edition => edition.float_count > 0);
  const top = Math.max(...rows.map(edition => edition.float_count));
  const base = height - CHART.padB;
  const { min, max } = statsYears();
  const left = 26;
  const scale = makeScale({ from: min, to: max, width, left });
  const yOf = value => base - (value / top) * (base - CHART.padT);

  // Y mas lineas de rejilla, que es lo que permite leer una barra sin tooltip.
  const step = niceStep(top, zoom > 1 ? 12 : 5);

  const grid = [];
  for (let value = 0; value <= top; value += step) {
    const y = yOf(value).toFixed(1);
    grid.push(`<line class="grid-line" x1="${left}" y1="${y}" x2="${width - CHART.padR}" y2="${y}"/>
      <text class="axis-label" x="${left - 5}" y="${(Number(y) + 3).toFixed(1)}" text-anchor="end">${value}</text>`);
  }

  const barW = 3.6 * Math.min(zoom, 3);
  const hitW = Math.max(9 * zoom, barW + 3);
  const bars = rows.map(edition => {
    const x = scale(edition.year);
    const h = base - yOf(edition.float_count);
    const tip = esc(`${edition.year}<b>${edition.float_count} carrozas</b>`);
    // Barra visible fina, zona de toque ancha: con 3,6 px de ancho acertar con
    // el dedo era una loteria.
    return `<g class="bar-group" data-year="${edition.year}" data-tip="${tip}">
      <rect class="bar-hit" x="${(x - hitW / 2).toFixed(1)}" y="${CHART.padT - 6}"
        width="${hitW.toFixed(1)}" height="${(base - CHART.padT + 6).toFixed(1)}"/>
      <rect class="bar ${coverageTier(edition)}" x="${(x - barW / 2).toFixed(1)}" y="${yOf(edition.float_count).toFixed(1)}"
        width="${barW.toFixed(1)}" height="${h.toFixed(1)}"/>
    </g>`;
  }).join("");

  return `<div class="chart-scroll${zoom > 1 ? " is-zoomed" : ""}">
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img"
      style="width:${zoom * 100}%"
      aria-label="Número de carrozas por edición">
      ${grid.join("")}
      <line class="axis-line" x1="${left}" y1="${base}" x2="${width - CHART.padR}" y2="${base}"/>
      ${yearAxis(scale, { from: min, to: max, height })}${bars}
    </svg></div>`;
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

/* Rachas de victorias. "Victoria" = 1.er puesto de la lista unica (hasta 2010)
 * o de la categoria A: son la misma competicion en dos epocas, y la B es otra.
 *
 * Se cuentan ediciones consecutivas, no anos consecutivos: hubo guerras y anos
 * sin fiesta, y encadenar 1935 con 1940 es ganar dos veces seguidas aunque
 * medien cinco anos. Contar anos naturales penalizaria por algo ajeno. */
function winStreaks(limit = 8) {
  const held = state.editions
    .filter(edition => (edition.floats || []).some(entry => entry.position != null))
    .sort((a, b) => a.year - b.year);
  const order = new Map(held.map((edition, index) => [edition.year, index]));

  const wins = new Map();
  held.forEach(edition => {
    (edition.floats || []).forEach(entry => {
      const main = entry.category == null || entry.category === "" || entry.category === "A";
      if (entry.position !== 1 || !main || !entry.group_canonical) return;
      if (!wins.has(entry.group_canonical)) wins.set(entry.group_canonical, new Set());
      wins.get(entry.group_canonical).add(edition.year);
    });
  });

  const rows = [];
  wins.forEach((years, group) => {
    const sorted = [...years].sort((a, b) => a - b);
    let best = [sorted[0]];
    let run = [sorted[0]];
    sorted.slice(1).forEach(year => {
      run = order.get(year) === order.get(run[run.length - 1]) + 1 ? [...run, year] : [year];
      if (run.length > best.length) best = run;
    });
    rows.push({ group, length: best.length, from: best[0], to: best[best.length - 1] });
  });

  return rows
    .filter(row => row.length >= 3)
    .sort((a, b) => b.length - a.length || a.from - b.from)
    .slice(0, limit);
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

/* Citas de hemeroteca de una carroza: el medio, lo que decia LITERALMENTE, y el
 * enlace al escaneo en batalladeflores.net.
 *
 * Sin la cita, "las fuentes no coinciden" es una afirmacion nuestra que hay que
 * creerse. Con ella, cualquiera abre el recorte y juzga por su cuenta, que es la
 * unica manera de que esto sea un archivo y no una opinion. */
function pressCitations(entry) {
  return (entry.source_refs || []).filter(ref => ref.kind === "press_history" && ref.texto);
}

function citationList(refs) {
  if (!refs.length) return "";
  return `<ul class="cite-list">${refs.map(ref => `
    <li><b>${esc(ref.cita)}</b>: ${esc(ref.texto)}${ref.url
      ? ` <a href="${esc(ref.url)}" target="_blank" rel="noopener">ver el recorte ↗</a>`
      : ""}</li>`).join("")}</ul>`;
}

/* Inventario de lo que no sabemos. Va en Estadisticas con el mismo rango que
 * el resto: un archivo que solo ensena lo que tiene tapa sus huecos. */
function openQuestions() {
  const disputed = [];
  const conflicting = [];
  const hemeroteca = [];
  state.editions.forEach(edition => {
    (edition.floats || []).forEach(entry => {
      const citas = pressCitations(entry);
      (entry.needs_review || []).forEach(reason => {
        const row = { year: edition.year, name: entry.name, reason, id: entry.id, citas };
        // Una atribucion en disputa marca las DOS entradas, pero es un solo caso:
        // listarlo dos veces doblaria el recuento y daria sensacion de caos.
        // La hemeroteca va en su propio cajon: no es que dos scrapings se
        // contradigan, es que un periodico de la epoca dice otra cosa, y eso se
        // resuelve leyendo el recorte, no arreglando el codigo.
        const target = citas.length ? hemeroteca
          : reason.startsWith("El archivo atribuye") ? disputed : conflicting;
        // El motivo es identico en las dos mitades del conflicto (normalize.py
        // ordena los nombres), asi que basta con el para no contarlo dos veces.
        if (!target.some(other => other.year === row.year && other.reason === row.reason)) {
          target.push(row);
        }
      });
    });
  });

  // La existencia misma de la edición puede estar en duda. Es una cuestión
  // abierta como cualquier otra y vive en la misma base de datos.
  // Lo que no puede ser verdad -dos primeros premios en la misma categoría- no
  // es un hueco: es un error, y va antes que nada.
  const imposibles = [];
  state.editions.forEach(edition => (edition.floats || []).forEach(entry => {
    (entry.needs_review || []).forEach(reason => {
      if (!reason.startsWith("Esto no puede ser")) return;
      if (imposibles.some(o => o.year === edition.year && o.reason === reason)) return;
      imposibles.push({ year: edition.year, name: entry.name, reason, id: entry.id });
    });
  }));

  const sinConfirmar = state.editions.filter(edition => edition.status === "unknown");

  const incomplete = state.editions.filter(edition =>
    (edition.notes_derivadas || []).some(note => note.includes("faltan")));
  const noPalmares = state.editions.filter(edition =>
    edition.status === "published" && !(edition.floats || []).some(entry => entry.position != null));

  // Tres huecos que faltaban en esta lista y son los más grandes del archivo.
  // «Pendiente» decía la verdad de lo que miraba, pero no miraba lo que más
  // falta: la fecha de casi la mitad de las ediciones.
  const sinFecha = state.editions.filter(edition =>
    !edition.parade_date && edition.status !== "cancelled" && edition.status !== "not_held");
  const sinFoto = state.editions.filter(edition =>
    edition.status === "published"
    && !(edition.floats || []).some(entry => (entry.image_urls || []).length));

  return { disputed, conflicting, hemeroteca, imposibles, sinConfirmar, incomplete,
           noPalmares, sinFecha, sinFoto };
}

/* Pestana propia, no un apendice de Estadisticas: que un archivo diga lo que no
 * sabe es la parte que lo separa de un listado, y enterrada al final no la ve
 * nadie. */
/* Boton por linea, no uno global: el aviso llega con la pregunta concreta ya
 * puesta, asi que quien responde no tiene que explicar de que hablaba. */
function askButton(id, label) {
  return `<button class="ask" type="button" data-ask="${esc(id)}" data-ask-label="${esc(label)}"
    title="¿Conoces el dato?">${ICON_FLAG}<span>¿lo sabes?</span></button>`;
}

function renderPendingTab() {
  const q = openQuestions();
  const total = q.disputed.length + q.conflicting.length + q.hemeroteca.length
    + q.imposibles.length + q.sinConfirmar.length + q.incomplete.length + q.noPalmares.length
    + q.sinFecha.length + q.sinFoto.length;
  els.indexCount.textContent = `${num(total)} cuestiones abiertas`;
  // Buscar "1954" aqui no filtra nada: los controles se esconden en esta vista.
  document.querySelector(".controls")?.setAttribute("hidden", "");

  const bloque = (icono, titulo, filas, pinta) => filas.length ? `
    <div class="open-block">
      <h4>${icono} ${titulo} <span class="open-count">${filas.length}</span></h4>
      <ul class="open-list">${filas.map(pinta).join("")}</ul>
    </div>` : "";

  els.indexBody.innerHTML = `
    <div class="stats-block">
      <p class="chart-note">Este archivo no está terminado. Aquí está todo lo que sabemos que falta
      o que no cuadra. Si conoces la respuesta a alguno, dínoslo con el botón de su línea.</p>
      <div class="chips"><button id="share-pending" class="share" type="button"
        title="Compartir esta lista">${ICON_SHARE}Compartir esta lista</button></div>

      ${bloque("📷", "Ediciones celebradas sin una sola foto", q.sinFoto, ed => `
        <li><button class="link t-year" type="button" data-year="${ed.year}">${ed.year}</button>
          — se celebró y no conservamos ninguna imagen${ed.year >= 2000
            ? ", y es reciente: seguro que alguien tiene fotos" : ""}.
          ${askButton(`fotos-${ed.year}`, `Fotos de la Batalla de ${ed.year}`)}</li>`)}

      <div class="open-block">
        <h4>🏆 Carrocistas repartidos entre varios nombres</h4>
        <p class="open-note">Los rankings de esta página cuentan grupos, que es lo único que dicen
        las fuentes: el nombre con el que se inscribió cada carroza. Pero una persona con cincuenta
        años de trayectoria cambia de socios, se asocia y se separa, y aparece repartida entre
        nombres de grupo distintos. El caso claro es José Antonio «Toñi» Quintana, a quien la Wikipedia
        atribuye 21 victorias y que aquí sale troceado en trece nombres —solo, con su hermano, con
        Ángel Sainz y con Transportes Maritina—, así que no encabeza ningún ranking pese a ser el
        más laureado de la historia. Le pasa a más gente. Reunir esas trayectorias pide un dato que
        no está escrito en ninguna fuente y sí en la memoria de los carrocistas: qué nombres
        corresponden a qué persona.</p>
        <p><button class="pill know" type="button" data-ask="carrocistas"
          data-ask-label="Carrocistas repartidos entre varios nombres">${ICON_FLAG}¿Conoces el dato?</button></p>
      </div>

      ${bloque("⛔", "Datos que no pueden ser ciertos", q.imposibles, row => `
        <li><button class="link t-year" type="button" data-year="${row.year}">${row.year}</button>
          ${esc(row.reason)}
          ${askButton(`year:${row.year}`, `${row.year} · puestos repetidos`)}</li>`)}
      ${bloque("🏷️", "Carrozas con dos grupos distintos", q.disputed, row => `
        <li><button class="link t-year" type="button" data-year="${row.year}">${row.year}</button>
          ${esc(row.name)} — ${esc(row.reason.replace("El archivo atribuye esta carroza a dos grupos: ", ""))}
          ${askButton(`year:${row.year}`, `${row.year} · ${row.name} · atribución`)}</li>`)}
      ${bloque("↕️", "Puestos en los que las fuentes no coinciden", q.conflicting, row => `
        <li><button class="link t-year" type="button" data-year="${row.year}">${row.year}</button>
          ${esc(row.name)} — ${esc(row.reason.replace("Las fuentes no coinciden en el puesto: ", ""))}
          ${askButton(`year:${row.year}`, `${row.year} · ${row.name} · puesto`)}</li>`)}
      ${q.hemeroteca.length ? `
      <div class="open-block">
        <h4>📰 La prensa de la época dice otra cosa <span class="open-count">${q.hemeroteca.length}</span></h4>
        <p class="open-note">Al vaciar los 37 recortes de hemeroteca que había en el archivo de
        batalladeflores.net —Mundo Gráfico, ABC, La Voz, La Unión Ilustrada— salieron estas
        discrepancias con lo que ya teníamos. <b>No hemos elegido versión.</b> Las dos constan, el
        puesto se ha dejado como estaba y aquí está lo que dice el periódico, palabra por palabra,
        con enlace al recorte para que cualquiera lo compruebe.</p>
        <ul class="open-list">${q.hemeroteca.map(row => `
          <li><button class="link t-year" type="button" data-year="${row.year}">${row.year}</button>
            <button class="link t-float" type="button" data-float="${esc(row.id)}">${esc(row.name)}</button>
            — ${esc(row.reason)}
            ${citationList(row.citas)}
            ${askButton(`year:${row.year}`, `${row.year} · ${row.name} · hemeroteca`)}</li>`).join("")}</ul>
      </div>` : ""}
      ${bloque("❔", "Años de los que no sabemos ni si hubo desfile", q.sinConfirmar, edition => `
        <li><button class="link t-year" type="button" data-year="${edition.year}">${edition.year}</button>
          ${esc(edition.notes?.[0] || "Sin confirmar.")}
          ${askButton(`year:${edition.year}`, `Edición ${edition.year} · ¿hubo Batalla?`)}</li>`)}
      ${bloque("📉", "Ediciones a las que les faltan carrozas", q.incomplete, edition => `
        <li><button class="link t-year" type="button" data-year="${edition.year}">${edition.year}</button>
          ${esc((edition.notes_derivadas || []).find(n => n.includes("faltan")) || "")}
          ${askButton(`year:${edition.year}`, `Edición ${edition.year} · faltan carrozas`)}</li>`)}

      ${bloque("📅", "Ediciones de las que no sabemos el día", q.sinFecha, ed => `
        <li><button class="link t-year" type="button" data-year="${ed.year}">${ed.year}</button>
          — sabemos el año, no el día. Un cartel, un programa o un recorte de prensa
          de aquella semana lo resuelve.
          ${askButton(`fecha-${ed.year}`, `Fecha del desfile de ${ed.year}`)}</li>`)}
      ${bloque("🕳️", "Ediciones celebradas sin palmarés conocido", q.noPalmares, edition => `
        <li><button class="link t-year" type="button" data-year="${edition.year}">${edition.year}</button>
          ${esc(edition.notes?.[0] || "No se ha localizado la clasificación.")}
          ${askButton(`year:${edition.year}`, `Edición ${edition.year} · sin palmarés`)}</li>`)}
    </div>`;
}

function renderStatsTab() {
  const summary = state.dataset.summary || {};
  // Las ediciones sin carrozas no pintan barra, asi que sus niveles tampoco
  // tienen por que salir en la leyenda.
  const shownTiers = new Set(state.editions
    .filter(edition => edition.float_count > 0)
    .map(coverageTier));
  // El record esta empatado a tres bandas (2009, 2012 y 2013): quedarse con el
  // primero que saliera del sort era arbitrario y ademas ocultaba dos ediciones.
  const topFloats = Math.max(...state.editions.map(edition => edition.float_count));
  const recordYears = state.editions
    .filter(edition => edition.float_count === topFloats)
    .map(edition => edition.year)
    .sort((a, b) => a - b);
  const topGroup = [...state.groups].sort((a, b) => b.wins - a.wins)[0];
  const longest = [...state.groups].sort((a, b) => b.years.length - a.years.length)[0];
  const category = state.statsCategory;
  const zoom = state.statsZoom;

  els.indexBody.innerHTML = `
    <div class="stats-block">
      <div class="kpis">
        <div class="kpi"><span>${num(summary.official_edition_count || summary.edition_count)}</span>
          <small>ediciones${summary.official_edition_count
            ? `, la última la <b>${summary.official_edition_count}.ª</b>` : ""}</small></div>
        <div class="kpi"><span>${topFloats}</span><small>carrozas, el récord${
          recordYears.length > 1 ? ", igualado en" : " en"} ${listYears(recordYears)}</small></div>
        <div class="kpi"><span>${topGroup.wins}</span><small>victorias de ${esc(topGroup.canonical_name)}</small></div>
        <div class="kpi"><span>${longest.years.length}</span><small>ediciones de ${esc(longest.canonical_name)}</small></div>
      </div>

      <h3 class="section">Número de carrozas por edición</h3>
      <p class="chart-note">Cuenta lo que el archivo conserva, no necesariamente lo que desfiló:
      donde la documentación es floja la barra se queda corta. El color es el nivel de datos.</p>
      <div class="chart-legend">
        ${TIERS.filter(([cls]) => shownTiers.has(cls))
          .map(([cls, label]) => `<span><i class="key ${cls}"></i>${label}</span>`).join("")}
      </div>
      <div class="chart-tabs zoom-tabs">
        <span class="zoom-label">Zoom</span>
        ${[[1, "1×"], [2, "2×"], [4, "4×"]].map(([level, label]) =>
          `<button class="view${zoom === level ? " is-on" : ""}" type="button"
            data-stats-zoom="${level}">${label}</button>`).join("")}
        ${zoom > 1 ? '<span class="zoom-hint">desliza el gráfico →</span>' : ""}
      </div>
      ${chartFloatsPerYear(zoom)}

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
      <div class="chart-tabs zoom-tabs" data-carreras-tiempo>
        <span class="zoom-label">Tiempo</span>
        <button class="view" type="button" data-carreras-zoom="out"
          title="Comprimir: más años a la vista">−</button>
        <button class="view" type="button" data-carreras-zoom="in"
          title="Estirar: más sitio entre año y año">+</button>
        <button class="view" type="button"
          data-carreras-zoom="fit" title="Volver a ver el siglo entero">Todo</button>
        <span class="zoom-hint" hidden>arrastra el gráfico →</span>
      </div>
      ${chartCareers(category)}

      <h3 class="section">🔥 Rachas de victorias</h3>
      <p class="chart-note">Ediciones ganadas seguidas. Cuenta el 1.<sup>er</sup> puesto de la lista
      única hasta ${CATEGORIES_FROM - 1} y el de la <b>categoría A</b> desde entonces: son la misma
      competición en dos épocas. Se miden <b>ediciones consecutivas</b>, no años: hubo guerras y años
      sin fiesta, y encadenar dos ediciones es ganarlas seguidas aunque medien cinco años.</p>
      <ol class="streaks">
        ${winStreaks().map((row, index) => `
          <li${index ? "" : ' class="top"'}>
            <span class="streak-n">${row.length}</span>
            <button class="link t-group" type="button" data-group="${esc(slugifyGroup(row.group))}">${esc(row.group)}</button>
            <span class="streak-years">${row.from}–${row.to}</span>
          </li>`).join("")}
      </ol>

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
              <td class="name"><button class="link t-float" type="button" data-float="${esc(entry.id)}">${esc(entry.name)}</button>${reviewMark(entry)}</td>
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
  // El grafico de trayectorias se pinta despues de insertar el HTML porque
  // necesita medir su hueco. Va aqui y no en cada sitio que llama a esta
  // funcion: si se olvida en uno, el bloque sale en blanco.
  pintarCarreras();
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

/* ── galeria de carteles ────────────────────────────────────────────────────
 * El cartel es la cara que cada edicion se dio a si misma, y juntos son un
 * paseo por medio siglo de estetica de la fiesta. Respetan el buscador y el
 * filtro de decada (venimos de state.filtered), van de nuevo a viejo, y cada
 * uno abre su edicion, que es donde vive su procedencia. */
function renderCartelesTab() {
  const conCartel = [...state.filtered].filter(e => e.cartel).sort((a, b) => b.year - a.year);
  els.indexCount.textContent = `${num(conCartel.length)} carteles`;
  if (!conCartel.length) {
    els.indexBody.innerHTML = `<p class="empty">Ningún cartel con los filtros puestos.</p>`;
    return;
  }
  // Cada clic lleva a lo suyo: el cartel se ABRE (visor, con su procedencia,
  // y flechas para pasear los 47 como una exposición) y el año lleva a la
  // edición. La celda no puede ser un botón con botones dentro —HTML se los
  // comería sin avisar, ya nos pasó— así que es un div con dos botones.
  //
  // El marco CODIFICA: es el color de la agrupación que gano ese año, estable
  // por grupo (sale de un hash del nombre canónico, no de una tabla que
  // mantener). Así la galería enseña las eras de dominio de un vistazo, como
  // la cinta de directores del Concierto de Año Nuevo. Gris = palmarés
  // desconocido, que también es información y de la honesta.
  const ganadorDe = e => {
    const g = (e.floats || []).find(f => f.position === 1 && (!f.category || f.category === "A"));
    return g ? g.group_canonical || g.group_raw : null;
  };
  // La rueda de color se reparte entera entre los ganadores presentes:
  // 360/n grados por grupo, separacion maxima garantizada. Un hash daba
  // tonos estables pero dejaba vecinos indistinguibles (dos rosas a 4°).
  // El orden de reparto es por victorias y luego alfabetico: deterministico
  // para los mismos datos, que es la estabilidad que importa aqui.
  const victorias = new Map();
  conCartel.forEach(e => { const q = ganadorDe(e); if (q) victorias.set(q, (victorias.get(q) || 0) + 1); });
  const ordenados = [...victorias.keys()].sort((a, b) =>
    victorias.get(b) - victorias.get(a) || a.localeCompare(b));
  const marcos = new Map(ordenados.map((q, i) =>
    [q, `hsl(${Math.round(i * 360 / ordenados.length)} 42% 86%)`]));
  els.indexBody.innerHTML = `
    <div class="cartel-grid">
      ${conCartel.map(e => { const quien = ganadorDe(e); return `
        <div class="cartel-celda" style="background:${quien ? esc(marcos.get(quien)) : "#ececec"}"
             title="${quien ? esc(`En ${e.year} ganó ${quien}`) : `Palmarés de ${e.year} sin localizar`}">
          <button class="cartel-img" type="button" title="Ver el cartel de ${e.year} en grande"
            data-photo="${esc(e.cartel.url)}" data-nombre="Cartel de ${e.year}"
            data-grupo="" data-anio="${e.year}" data-puesto=""
            data-credito="${esc(e.cartel.origen)}" data-origen="${esc(e.cartel.origen)}"
            data-ficha="" data-asigna="${esc(e.cartel.asignacion || "")}"
            data-asigna-prop="${esc(e.cartel.asignada_por || "")}">
            <img src="${esc(e.cartel.mini)}" alt="Cartel de la Batalla de Flores de ${e.year}" loading="lazy">
          </button>
          <button class="link cartel-anio" type="button" data-year="${e.year}"
            title="Abrir la edición de ${e.year}">${e.year}</button>
        </div>`; }).join("")}
    </div>
    ${(() => {
      const cuenta = new Map();
      conCartel.forEach(e => { const q = ganadorDe(e); if (q) cuenta.set(q, (cuenta.get(q) || 0) + 1); });
      const sinPalmares = conCartel.filter(e => !ganadorDe(e)).length;
      const filas = [...cuenta.entries()].sort((a, b) => b[1] - a[1])
        .map(([q, n]) => `<span class="marco-muestra" style="background:${esc(marcos.get(q))}"></span> ${esc(q)} (${n})`);
      if (sinPalmares) filas.push(`<span class="marco-muestra" style="background:#ececec"></span> sin palmarés (${sinPalmares})`);
      return `<p class="codes codes-inline">El marco es el color de la agrupación que ganó ese año:
        ${filas.join(" · ")}</p>`;
    })()}`;
}


function renderIndex() {
  if (state.mode !== "pending") document.querySelector(".controls")?.removeAttribute("hidden");
  hideTooltip();
  // Solo Carrozas tiene controles propios; el resto limpia la barra.
  if (state.mode !== "floats") els.indexTools.innerHTML = "";
  if (state.mode === "editions") renderYearGrid();
  else if (state.mode === "floats") renderFloatList();
  else if (state.mode === "groups") renderGroupList();
  else if (state.mode === "stats") renderStatsTab();
  else if (state.mode === "pending") renderPendingTab();
  else if (state.mode === "carteles") renderCartelesTab();
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

/* La edicion que viene no tiene palmares -no se ha celebrado- pero si se sabe
 * quien participa, con cuantas carrozas y donde las monta. Es lo unico util que
 * puede dar la ficha de un ano futuro, y ademas caduca: el jueves siguiente ya
 * no sirve. */
/* Zoom y arrastre sobre el SVG, sin libreria: se mueve el viewBox.
 * Se usa en los mapas de recorrido; el de la Noche Magica va con Leaflet. */
function makeZoomable(svg) {
  if (!svg || svg.dataset.zoomReady) return;
  svg.dataset.zoomReady = "1";

  const base = svg.viewBox.baseVal;
  const inicial = { x: base.x, y: base.y, w: base.width, h: base.height };
  let vista = { ...inicial };
  const MAX = 8;

  const aplicar = () => {
    svg.setAttribute("viewBox", `${vista.x} ${vista.y} ${vista.w} ${vista.h}`);
    svg.classList.toggle("is-zoomed", vista.w < inicial.w - 0.5);
  };

  const zoom = (factor, cx, cy) => {
    const w = Math.min(inicial.w, Math.max(inicial.w / MAX, vista.w / factor));
    const escala = w / vista.w;
    vista = { w, h: vista.h * escala,
      x: cx - (cx - vista.x) * escala, y: cy - (cy - vista.y) * escala };
    vista.x = Math.max(inicial.x, Math.min(vista.x, inicial.x + inicial.w - vista.w));
    vista.y = Math.max(inicial.y, Math.min(vista.y, inicial.y + inicial.h - vista.h));
    aplicar();
  };

  const aSvg = event => {
    const r = svg.getBoundingClientRect();
    return [vista.x + ((event.clientX - r.left) / r.width) * vista.w,
            vista.y + ((event.clientY - r.top) / r.height) * vista.h];
  };

  svg.addEventListener("wheel", event => {
    event.preventDefault();
    const [cx, cy] = aSvg(event);
    zoom(event.deltaY < 0 ? 1.25 : 1 / 1.25, cx, cy);
  }, { passive: false });
  svg.addEventListener("dblclick", event => { const [cx, cy] = aSvg(event); zoom(2, cx, cy); });

  const punteros = new Map();
  let previo = null;
  svg.addEventListener("pointerdown", event => {
    svg.setPointerCapture(event.pointerId);
    punteros.set(event.pointerId, event);
    previo = null;
  });
  svg.addEventListener("pointermove", event => {
    if (!punteros.has(event.pointerId)) return;
    const antes = punteros.get(event.pointerId);
    punteros.set(event.pointerId, event);
    const r = svg.getBoundingClientRect();
    if (punteros.size === 2) {
      const [a, b] = [...punteros.values()];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (previo) {
        const cx = vista.x + (((a.clientX + b.clientX) / 2 - r.left) / r.width) * vista.w;
        const cy = vista.y + (((a.clientY + b.clientY) / 2 - r.top) / r.height) * vista.h;
        zoom(dist / previo, cx, cy);
      }
      previo = dist;
      return;
    }
    if (vista.w >= inicial.w - 0.5) return;
    vista.x -= ((event.clientX - antes.clientX) / r.width) * vista.w;
    vista.y -= ((event.clientY - antes.clientY) / r.height) * vista.h;
    vista.x = Math.max(inicial.x, Math.min(vista.x, inicial.x + inicial.w - vista.w));
    vista.y = Math.max(inicial.y, Math.min(vista.y, inicial.y + inicial.h - vista.h));
    aplicar();
  });
  const soltar = event => { punteros.delete(event.pointerId); previo = null; };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);

  svg.closest("figure")?.querySelectorAll("[data-zoom-act]").forEach(boton => {
    boton.addEventListener("click", () => {
      const cx = vista.x + vista.w / 2;
      const cy = vista.y + vista.h / 2;
      if (boton.dataset.zoomAct === "reset") { vista = { ...inicial }; aplicar(); }
      else zoom(boton.dataset.zoomAct === "in" ? 1.6 : 1 / 1.6, cx, cy);
    });
  });
}

/* Leaflet servido desde el propio dominio, no de un CDN, y cargado SOLO cuando
 * hace falta un mapa de verdad: quien no lo abra no baja ni un byte. */
const LEAFLET = {
  js: "batalla_de_flores/vendor/leaflet.js",
  css: "batalla_de_flores/vendor/leaflet.css",
};
let leafletCargando = null;

function cargarLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletCargando) return leafletCargando;
  leafletCargando = new Promise((ok, fallo) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = LEAFLET.css;
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = LEAFLET.js;
    js.onload = ok;
    js.onerror = () => fallo(new Error("no se pudo cargar Leaflet"));
    document.head.appendChild(js);
  });
  return leafletCargando;
}

/* Enlace de navegacion: Google Maps con solo el destino usa la ubicacion actual
 * como origen, asi que no hay que pedirle la posicion a nadie ni guardarla. */
function comoLlegar(sitio) {
  return `https://www.google.com/maps/dir/?api=1&destination=${sitio.lat},${sitio.lon}`;
}

/* El mismo salto que en la Noche Magica, por el mismo motivo: en la ficha de un
 * recorrido uno quiere ver POR DONDE pasa de verdad, con los nombres de calle
 * al lado. Las miniaturas de las listas siguen siendo SVG: ahi el mapa si es
 * decorativo y ademas se pintan cientos, que con Leaflet seria insostenible. */
function pintarMapaRecorrido() {
  const caja = document.getElementById("mapa-recorrido");
  if (!caja || caja.dataset.listo) return;
  const ruta = state.routes.find(r => r.id === caja.dataset.route);
  const coords = ruta?.geometry?.coordinates || [];
  if (!coords.length) return;

  cargarLeaflet().then(() => {
    if (caja.dataset.listo) return;
    caja.dataset.listo = "1";

    // El GeoJSON viene [lon, lat] y Leaflet quiere [lat, lon].
    const puntos = coords.map(([lon, lat]) => [lat, lon]);
    const mapa = L.map(caja, { scrollWheelZoom: false }).setView(puntos[0], 16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "© colaboradores de OpenStreetMap",
    }).addTo(mapa);
    mapa.on("click", () => mapa.scrollWheelZoom.enable());

    const linea = L.polyline(puntos, {
      color: "#b6465f", weight: 6, opacity: 0.85, lineJoin: "round",
    }).addTo(mapa);
    L.polyline(puntos, { color: "#fff", weight: 2, opacity: 0.6, dashArray: "1 14" }).addTo(mapa);

    L.circleMarker(puntos[0], {
      radius: 7, color: "#fff", weight: 2, fillColor: "#2f7d4f", fillOpacity: 1,
    }).addTo(mapa).bindPopup(`<b>${esc(ruta.label)}</b><br>${esc(yearRange(ruta.start_year, ruta.end_year))}`);

    const encuadrar = () => {
      mapa.invalidateSize();
      mapa.fitBounds(linea.getBounds(), { padding: [26, 26] });
    };
    encuadrar();
    requestAnimationFrame(encuadrar);
    new ResizeObserver(encuadrar).observe(caja);

    const yo = L.control({ position: "topright" });
    yo.onAdd = () => {
      const boton = L.DomUtil.create("button", "leaflet-yo");
      boton.type = "button";
      boton.textContent = "◎";
      boton.title = "Dónde estoy";
      L.DomEvent.disableClickPropagation(boton);
      boton.addEventListener("click", () => {
        navigator.geolocation?.getCurrentPosition(pos => {
          const punto = [pos.coords.latitude, pos.coords.longitude];
          L.circleMarker(punto, {
            radius: 7, color: "#1c6fd0", fillColor: "#3b8ee6", fillOpacity: 0.9, weight: 2,
          }).addTo(mapa).bindPopup("Estás aquí");
          mapa.setView(punto, Math.max(mapa.getZoom(), 16));
        });
      });
      return boton;
    };
    yo.addTo(mapa);
  });
}

function pintarMapaMontaje(nm) {
  const caja = document.getElementById("mapa-montaje");
  if (!caja || caja.dataset.listo) return;

  cargarLeaflet().then(() => {
    if (caja.dataset.listo) return;
    caja.dataset.listo = "1";

    // Vista de salida ANTES de anadir capas: un mapa de Leaflet sin centro ni
    // zoom no pinta nada, y el encuadre real llega despues.
    const centro = nm.sitios.reduce((a, s) => [a[0] + s.lat / nm.sitios.length,
                                               a[1] + s.lon / nm.sitios.length], [0, 0]);
    const mapa = L.map(caja, { scrollWheelZoom: false }).setView(centro, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© colaboradores de OpenStreetMap",
    }).addTo(mapa);
    // Rueda solo tras hacer clic: si no, bajar la pagina con el raton encima
    // del mapa amplia el mapa en vez de desplazar.
    mapa.on("click", () => mapa.scrollWheelZoom.enable());

    const marcas = nm.sitios.map(sitio => {
      const grupos = nm.grupos.filter(g => g.sitio === sitio.id);
      const icono = L.divIcon({
        className: "montaje-icon",
        html: `<span>${grupos.map(g => g.orden).join("·")}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marca = L.marker([sitio.lat, sitio.lon], { icon: icono }).addTo(mapa);
      // Sin tope, en movil el globo se sale por la derecha.
      marca.bindPopup(`
        <b>${esc(sitio.nombre)}</b><br>
        ${grupos.map(g => `${g.orden}. ${g.group_canonical
          ? `<button class="link t-group" type="button"
              data-group="${esc(slugifyGroup(g.group_canonical))}">${esc(g.grupo)}</button>`
          : esc(g.grupo)}`).join("<br>")}
        <div class="pop-acciones">
          <a href="${comoLlegar(sitio)}" target="_blank" rel="noopener">Cómo llegar ↗</a>
          <button type="button" data-share-sitio="${esc(sitio.id)}">Compartir</button>
        </div>`, { maxWidth: 230, autoPanPadding: [12, 12] });
      return marca;
    });

    // invalidateSize antes de encuadrar: si el contenedor todavia no tiene su
    // tamano final, fitBounds calcula sobre 0x0 y el mapa abre pegadisimo.
    const encuadrar = () => {
      mapa.invalidateSize();
      mapa.fitBounds(L.featureGroup(marcas).getBounds(), { padding: [34, 34] });
    };
    encuadrar();
    requestAnimationFrame(encuadrar);
    // El panel de detalle puede estar oculto al pintar: cuando aparezca y el
    // contenedor coja tamano, se reencuadra solo.
    new ResizeObserver(encuadrar).observe(caja);

    // "Dónde estoy": la posicion no se guarda ni se manda a ningun sitio, solo
    // se pinta. Por eso el boton lo pide y no se pide al cargar.
    const yo = L.control({ position: "topright" });
    yo.onAdd = () => {
      const boton = L.DomUtil.create("button", "leaflet-yo");
      boton.type = "button";
      boton.textContent = "◎";
      boton.title = "Dónde estoy";
      L.DomEvent.disableClickPropagation(boton);
      boton.addEventListener("click", () => {
        boton.textContent = "…";
        navigator.geolocation?.getCurrentPosition(
          pos => {
            const punto = [pos.coords.latitude, pos.coords.longitude];
            L.circleMarker(punto, {
              radius: 7, color: "#1c6fd0", fillColor: "#3b8ee6", fillOpacity: 0.9, weight: 2,
            }).addTo(mapa).bindPopup("Estás aquí");
            mapa.setView(punto, Math.max(mapa.getZoom(), 15));
            boton.textContent = "◎";
          },
          () => { boton.textContent = "◎"; boton.title = "No se pudo obtener la ubicación"; },
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
      return boton;
    };
    yo.addTo(mapa);
  }).catch(() => {
    caja.innerHTML = '<p class="empty">No se ha podido cargar el mapa.</p>';
  });
}

function nocheMagicaBlock(edition) {
  const nm = state.dataset.noche_magica;
  if (!nm || nm.year !== edition.year) return "";
  const sitios = new Map(nm.sitios.map(sitio => [sitio.id, sitio]));

  return `
    <h3 class="section">🌺 Noche Mágica · ${esc(nm.fecha)}</h3>
    <p class="chart-note">La víspera del desfile, ${esc(nm.hora)}, los grupos abren sus locales
    para que la gente vea cómo se clavan las flores. Estas son las ubicaciones de montaje que
    publica el Ayuntamiento; el número es el orden de salida en el desfile.</p>

    <div id="mapa-montaje" class="mapa-montaje"
      aria-label="Mapa de los locales de montaje de la Noche Mágica"></div>
    <p class="chart-note mapa-pie">Pulsa una marca para ver quién monta allí, cómo llegar o
    compartir la ubicación. El botón <b>◎</b> te sitúa en el mapa.</p>

    <ol class="nm-lista">
      ${nm.grupos.map(fila => {
        const sitio = sitios.get(fila.sitio);
        const carrozas = [fila.a ? `${fila.a} en A` : "", fila.b ? `${fila.b} en B` : ""]
          .filter(Boolean).join(" · ");
        const enlace = sitio
          ? `<a href="https://www.openstreetmap.org/?mlat=${sitio.lat}&mlon=${sitio.lon}#map=18/${sitio.lat}/${sitio.lon}"
              target="_blank" rel="noopener" title="${esc(sitio.nombre)}">${esc(sitio.corto || sitio.nombre)} ↗</a>`
          : "sin ubicación publicada";
        // Lista y no tabla: son siete filas de dos datos, y con `table-layout:
        // fixed` la columna del numero se quedaba con un tercio del panel
        // partiendo cada nombre en tres lineas.
        return `<li>
          <span class="nm-num">${fila.orden}</span>
          <span class="nm-datos">
            <b>${fila.group_canonical
              ? `<button class="link t-group" type="button"
                  data-group="${esc(slugifyGroup(fila.group_canonical))}"
                  title="Ver la trayectoria de ${esc(fila.group_canonical)}">${esc(fila.grupo)}</button>`
              : esc(fila.grupo)}</b>
            <small>${esc(carrozas)} · ${enlace}</small>
          </span>
        </li>`;
      }).join("")}
    </ol>`;
}

/* ── detalle: edicion ───────────────────────────────────────────────────── */

/* De varias URLs se elige la mas concreta: la portada de un dominio no dice
 * nada y ademas redirige. */
function bestSourceUrl(entry) {
  const urls = entry.float_url ? [entry.float_url] : (entry.source_urls || []);
  return [...urls].sort((a, b) => b.length - a.length)[0] || null;
}

/* Una fila por fuente, no un cajon con todas.
 *
 * Un dato puede venir de tres sitios a la vez (RES·FOTO·MAN) y antes la celda
 * daba UN solo "fuente ↗", elegido por ser la URL mas larga: el lector no sabia
 * a cual de las tres llevaba, y las otras dos no tenian enlace. Ahora cada
 * fuente lleva el suyo.
 *
 * Las que no tienen enlace -las fotos cedidas por Santi son ficheros, no
 * paginas; la semilla no registro de donde salio- se quedan sin flecha, que es
 * la verdad. El codigo sigue abriendo la ficha, donde se explica cada una. */
const DATO_LABEL = {
  EXI: "que desfiló", POS: "el puesto", CAT: "la categoría", GRU: "el grupo", VES: "el premio de vestidos",
  ART: "el premio de arte", INT: "el premio internacional", PTS: "los puntos", FOT: "la foto", ARC: "la foto",
};

/* La columna de fuente, dato a dato.
 *
 * Antes listaba las fuentes que habían tocado la carroza —OFI, FOTO, MAN— sin
 * decir qué había aportado cada una: para auditar no vale, porque la pregunta
 * no es "¿quién pasó por aquí?" sino "¿de dónde sale QUE quedó tercera?".
 *
 * Ahora hay una etiqueta por DATO, y detrás sus enlaces. Si la misma página del
 * Ayuntamiento sostiene el puesto de las trece carrozas, sale trece veces: es
 * repetitivo y es lo correcto, porque cada fila se audita sola.
 *
 * FOT lleva enlace cuando la web publica la foto en la ficha de esa carroza;
 * cuando la identificación viene del nombre del fichero no hay página que
 * enlazar y se marca ARC, sin flecha. */
function auditCell(entry) {
  const claims = entry.claims || {};
  const bloques = [];

  // EXI abre la lista: antes de que el puesto o el grupo tengan quien los
  // sostenga, la primera afirmacion auditable es que esa carroza desfilo.
  const porDato = [["EXI", "name"], ["POS", "position"], ["CAT", "category"], ["GRU", "group_raw"],
                   ["VES", "prize_costumes_rank"], ["ART", "prize_art_rank"],
                   ["INT", "prize_international_rank"], ["PTS", "points"]];
  porDato.forEach(([code, campo]) => {
    const claim = claims[campo];
    if (!claim || entry[campo] == null) return;
    const enlaces = claim.fuentes.map(f => {
      const nombre = SOURCE_LABEL[f.kind] || f.kind;
      const ayuda = `${DATO_LABEL[code]}, según ${nombre}`;
      return f.url
        ? `<a href="${esc(f.url)}" target="_blank" rel="noopener" title="${esc(ayuda)}">↗</a>`
        : `<span class="src-nolink" title="${esc(ayuda)} — sin página que enlazar">·</span>`;
    }).join("");
    const otras = (claim.disputa || [])
      .map(d => `«${d.valor}» según ${joinEs(d.fuentes.map(f => SOURCE_LABEL[f.kind] || f.kind))}`);
    const dudoso = otras.length
      ? ` <button class="dato-duda" type="button" data-float="${esc(entry.id)}" data-prov="1"
          title="${esc(`Otra fuente dice ${joinEs(otras)}. `
            + ((entry.needs_review || []).some(r => r.includes("Se muestra el de"))
                ? "Se ha elegido una y la otra queda registrada: pulsa para ver por qué."
                : "Sin resolver: pulsa para ver las dos."))}"
          >?</button>` : "";
    // El chip NO lleva a ninguna parte: dice de dónde sale el dato y ya. Antes
    // abría la ficha de la carroza, que es abandonar la edición que estabas
    // mirando para ir a leer lo mismo. Se explica solo, en el sitio.
    bloques.push(`<span class="src-one"><button class="tag tag-src" type="button"
      data-tip="De dónde sale ${esc(DATO_LABEL[code])}">${code}</button>${enlaces}${dudoso}</span>`);
  });

  const refs = entry.image_refs || [];
  if (refs.length) {
    const porPagina = refs.filter(r => r.por === "pagina" && r.evidencia);
    const porFichero = refs.filter(r => !(r.por === "pagina" && r.evidencia));
    const cuenta = n => (refs.length > 1 ? ` ×${n}` : "");
    if (porPagina.length) {
      bloques.push(`<span class="src-one"><button class="tag tag-src" type="button"
        data-tip="${esc(`${porPagina.length} foto${porPagina.length === 1 ? "" : "s"}: la web `
          + `las publica en la ficha de esta carroza`)}">FOT${cuenta(porPagina.length)}</button>`
        + `<a href="${esc(porPagina[0].evidencia)}" target="_blank" rel="noopener"
             title="Ver la página donde se publican">↗</a></span>`);
    }
    if (porFichero.length) {
      const nombres = porFichero.slice(0, 3).map(r => r.evidencia).filter(Boolean).join(" · ");
      bloques.push(`<span class="src-one"><button class="tag tag-src" type="button"
        data-tip="${esc(`${porFichero.length} foto${porFichero.length === 1 ? "" : "s"} `
          + `identificada${porFichero.length === 1 ? "" : "s"} por el nombre del fichero: ${nombres}`)}"
        >ARC${cuenta(porFichero.length)}</button>`
        + `<span class="src-nolink" title="No hay página que enlazar: las identifica el nombre del fichero">·</span></span>`);
    }
  }

  return `<span class="src">${bloques.join("")}</span>`;
}

function sourceCell(entry) {
  return auditCell(entry);
}

/* Las mismas flechas, pero pegadas a UN dato suelto. En la ficha el puesto y el
 * grupo se leían desnudos y su procedencia estaba tres secciones más abajo,
 * plegada: para auditar hay que poder ver la fuente sin buscarla. */
function fieldSources(entry, campo) {
  const claim = (entry.claims || {})[campo];
  if (!claim || entry[campo] == null) return "";
  const enlaces = claim.fuentes.map(f => {
    const nombre = SOURCE_LABEL[f.kind] || f.kind;
    return f.url
      ? `<a href="${esc(f.url)}" target="_blank" rel="noopener" title="Según ${esc(nombre)}">↗</a>`
      : `<span class="src-nolink" title="${esc(nombre)} — sin página que enlazar">·</span>`;
  }).join("");
  const duda = (claim.disputa || []).map(d =>
    ` <span class="dato-duda" title="Otra fuente dice «${esc(String(d.valor))}»: ${esc(
      joinEs(d.fuentes.map(f => SOURCE_LABEL[f.kind] || f.kind)))}. Sin resolver.">?</span>`).join("");
  return `<span class="dato-src">${enlaces}${duda}</span>`;
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
/* Un dato en duda se publica igual, pero diciendolo. La alternativa -elegir
 * una version en silencio- da una pagina mas limpia y menos cierta. */
/* Una copa en las ganadoras. Al mirar 406 fotos seguidas no hay forma de saber
 * cuales ganaron sin abrir cada una, y es lo primero que uno quiere ver.
 * Solo el 1.er puesto: marcar tambien los podios llenaria la cuadricula. */
function winnerBadge(entry, inline = false) {
  if (entry.position !== 1) return "";
  const label = entry.category ? `Ganadora · categoría ${esc(entry.category)}` : "Ganadora";
  return `<span class="win-badge${inline ? " inline" : ""}" title="${label} (${entry.year})">
    ${ICON_TROPHY}</span>`;
}

/* La cabecera de una ficha, siempre igual.
 *
 * Antes cada tipo de ficha la montaba a su manera: en la de grupo el botón de
 * compartir iba dentro del título y en la de carroza en una fila aparte, así que
 * los mismos botones cambiaban de sitio al navegar. Una sola función.
 *
 * El identificador va aquí porque es lo que se usa para citar y para decidir:
 * si no está a la vista, hay que ir a buscarlo al fichero. */
function detailHead(titulo, { marca = "", ids = null, acciones = "", tam = 22 } = {}) {
  return `
    <div class="detail-head">
      <h2 style="font-size:${tam}px">${titulo}${marca}</h2>
    </div>
    ${ids ? `<p class="ids">
      <span class="id-par" title="Identificador de esta entidad. Se reparte por orden
        cronológico: la primera se queda la forma corta.">id:
        <code class="id-principal">${esc(ids.id)}</code></span>
      ${ids.completo ? `<span class="id-par" title="Grupo, año y título. Es NUESTRA atribución:
        cambia si cambia el grupo.">id_completo:
        <code>${esc(ids.completo)}</code></span>` : ""}
    </p>` : ""}
    <div class="chips">${shareButton()}${acciones}</div>`;
}

function reviewMark(entry) {
  const reasons = entry.needs_review || [];
  if (!reasons.length) return "";
  return `<button class="review-mark" type="button" data-float="${esc(entry.id)}" data-prov="1"
    data-tip="${esc(reasons.join(" · "))}"
    title="${esc(reasons.join(" · "))} — pulsa para verlo entero">?</button>`;
}

function prizeChips(entry) {
  const prizes = [];
  if (entry.prize_costumes_rank) prizes.push(`👗 Vestidos ${entry.prize_costumes_rank}.º`);
  if (entry.prize_art_rank) prizes.push(`🎨 Arte`);
  if (entry.points != null) prizes.push(`${entry.points} pts`);
  return prizes.join(" · ");
}

/* Miniatura para las cuadriculas. Las fotos cedidas se generan en dos tamanos
 * y la version de 1600 px no pinta nada en un recuadro de 150: son 400 KB por
 * casilla. Las del archivo web son URLs remotas y ahi no hay eleccion. */
function thumbUrl(url) {
  return url.startsWith("batalla_de_flores/fotos/") ? url.replace(/\.jpg$/, "-mini.jpg") : url;
}

/* Credito de la imagen. Va pegado a CADA foto, no solo en el pie de la pagina:
 * quien la mira tiene que saber de donde sale sin ir a buscarlo.
 *
 * Nunca devuelve vacio. Una carroza puede mezclar fotos de dos procedencias
 * -unas cedidas por Santi y otras del archivo web-, asi que el credito se
 * resuelve por FOTO, mirando su `image_ref`, y no por carroza. Antes solo se
 * pintaba cuando habia `image_credit` explicito, y las 640 del archivo salian
 * sin decir de donde venian. */
function creditText(entry, url) {
  const ref = (entry.image_refs || []).find(item => item.url === url);
  const origen = ref?.origen || "";
  if (entry.image_credit) return `Foto cedida por ${entry.image_credit}`;
  if (origen.includes("Santi")) return `Foto cedida por ${origen}`;
  if (origen) return "Del archivo de batalladeflores.net";
  // Sin `image_ref` no hay de donde sacarlo, pero callarse tampoco vale: se
  // dice que no consta, que es la verdad, y sale en Pendiente.
  return "Procedencia sin registrar";
}

/* De quién es la foto y por qué decimos que es de esta carroza son DOS
 * preguntas, y mezclarlas engaña. "Foto cedida por Santi Fernández" se puede
 * leer como que Santi certifica que sale Aiko, cuando en 287 casos la carroza
 * la deducimos nosotros del nombre del fichero y él no ha dicho nada.
 *
 * Así que van en dos líneas: arriba de quién es, debajo quién la asigna. Y
 * cuando la asignación es nuestra se marca, porque es lo que puede fallar. */
function photoAssign(entry, url) {
  const ref = (entry.image_refs || []).find(item => item.url === url);
  if (!ref) return "";
  const propia = ref.asignada_por !== "fuente";
  // Solo hay dos razones para decir que una foto es de una carroza, y cada una
  // trae su prueba: o la web la publica en la ficha de esa carroza -y damos el
  // enlace-, o lo dice el nombre del fichero -y lo enseñamos entero-.
  const corto = ref.por === "pagina"
    ? "lo dice su página" : "lo dice el nombre del fichero";
  const largo = ref.por === "pagina"
    ? `batalladeflores.net publica esta foto en la página que dedica a esta carroza: ${ref.evidencia || ""}`
    : `El fichero se llama «${ref.evidencia || ""}», que trae el año y el nombre de la carroza.`
      + (propia ? " La asociación la deducimos nosotros de ese nombre." : "");
  return `<span class="asigna${propia ? " asigna-deducida" : ""}" title="${esc(largo)}">${esc(corto)}</span>`;
}

function photoCredit(entry, url) {
  return `<span class="credito">${esc(creditText(entry, url))}</span>${photoAssign(entry, url)}`;
}

/* ── visor de fotos ────────────────────────────────────────────────────────
 *
 * Se abre ENCIMA de la aplicacion. Antes cada foto era un enlace con
 * target="_blank": sacaba al visitante a batalladeflores.net o a un JPEG suelto
 * y perdia donde estaba mirando.
 *
 * La galeria es lo que haya pintado en el panel de detalle en ese momento: en
 * una edicion, las carrozas de ese ano; en un grupo, las suyas. No hay que
 * decidir nada, basta con recorrer el DOM en orden. */
const lb = { fotos: [], indice: 0 };

/* Los cuatro datos que siempre acompanan a una foto. */
function photoMeta(entry) {
  const puesto = entry.position != null
    ? `${entry.category ? `${entry.category} · ` : ""}${entry.position}.º`
    : "";
  return {
    nombre: entry.name,
    grupo: entry.group_canonical || "",
    anio: String(entry.year),
    puesto,
    credito: "",  // se resuelve por foto en photoAttrs, no por carroza
    origen: entry.float_url || "",
  };
}

/* Se guardan en el propio elemento para no tener que buscar la carroza otra vez
 * al pulsar: el DOM ya sabe a que corresponde cada imagen. */
function photoAttrs(entry, url) {
  const m = photoMeta(entry);
  m.credito = creditText(entry, url);
  const ref = (entry.image_refs || []).find(item => item.url === url);
  m.asigna = ref ? (ref.asignada_por === "fuente"
    ? `Es esta carroza según la fuente: ${ref.asignacion}`
    : `Que sea esta carroza lo deducimos nosotros: ${ref.asignacion}`) : "";
  m.asignaProp = ref?.asignada_por || "";
  return `data-photo="${esc(url)}" data-nombre="${esc(m.nombre)}" data-grupo="${esc(m.grupo)}"
    data-anio="${esc(m.anio)}" data-puesto="${esc(m.puesto)}" data-credito="${esc(m.credito)}"
    data-origen="${esc(m.origen)}" data-ficha="${esc(entry.id)}"
    data-asigna="${esc(m.asigna)}" data-asigna-prop="${esc(m.asignaProp)}"`;
}

/* La galeria depende de DONDE se pulso.
 *
 * En el panel de detalle son las fotos de esa edicion o ese grupo. En la
 * cuadricula de Carrozas son TODAS las que haya filtradas, que es lo que
 * convierte la pestana en un carrusel: con el tick de ganadoras puesto,
 * pasas una a una todas las ganadoras de la historia. */
function abrirVisor(elemento) {
  const ambito = elemento.closest("#index-body") ? "#index-body" : "#detail";
  lb.fotos = [...document.querySelectorAll(`${ambito} [data-photo]`)];
  lb.indice = Math.max(0, lb.fotos.indexOf(elemento));
  document.getElementById("lightbox").hidden = false;
  document.body.classList.add("lb-abierto");
  pintarVisor();
  track("foto/abrir", "Ver foto", true);
}

function cerrarVisor() {
  document.getElementById("lightbox").hidden = true;
  document.body.classList.remove("lb-abierto");
}

function moverVisor(paso) {
  if (!lb.fotos.length) return;
  lb.indice = (lb.indice + paso + lb.fotos.length) % lb.fotos.length;
  pintarVisor();
}

function pintarVisor() {
  const el = lb.fotos[lb.indice];
  if (!el) return cerrarVisor();
  const contador = document.getElementById("lb-contador");
  if (contador) {
    contador.textContent = `${lb.indice + 1} / ${lb.fotos.length}`;
    contador.hidden = lb.fotos.length < 2;
  }
  const d = el.dataset;
  document.getElementById("lb-img").src = d.photo;
  document.getElementById("lb-img").alt = d.nombre;
  document.getElementById("lb-pie").innerHTML = `
    ${d.ficha
      ? `<button class="lb-nombre lb-link" type="button" data-lb-ficha="${esc(d.ficha)}"
           title="Abrir la ficha de esta carroza">${esc(d.nombre)} ›</button>`
      : `<span class="lb-nombre">${esc(d.nombre)}</span>`}
    <span class="lb-datos">
      ${d.grupo ? `<b>${esc(d.grupo)}</b>` : ""}
      <span>${esc(d.anio)}</span>
      ${d.puesto ? `<span class="lb-puesto">${esc(d.puesto)}</span>` : ""}
    </span>
    <span class="lb-credito">${esc(d.credito || "Procedencia sin registrar")}</span>
    ${d.asigna ? `<span class="lb-asigna${d.asignaProp === "fuente" ? "" : " asigna-deducida"}"
      >${esc(d.asigna)}</span>` : ""}
`;
  // Precarga de la siguiente: pasar fotos de 1600 px sin esto parpadea.
  const sig = lb.fotos[(lb.indice + 1) % lb.fotos.length];
  if (sig) new Image().src = sig.dataset.photo;
  document.querySelectorAll(".lb-nav").forEach(b => { b.hidden = lb.fotos.length < 2; });
}

/* Arrastrar el borde para ensanchar o estrechar la ficha.
 *
 * Una tabla de palmarés con seis columnas y una galería de fotos no quieren el
 * mismo ancho, y el que sirve para una aprieta a la otra. Se guarda la
 * preferencia: quien la mueve una vez no quiere volver a moverla.
 *
 * Solo en escritorio: en móvil la ficha se superpone y no hay dos columnas. */
/* Deslizador de tamaño de las fotos.
 *
 * Ni la rejilla ni el mosaico aciertan con un tamaño único: para reconocer una
 * carroza que recuerdas hace falta grande, y para barrer un año entero, pequeño.
 * Se guarda, como el ancho de la ficha. */
/* Anchos de columna a mano, arrastrando la separación de las cabeceras.
 *
 * Con `table-layout: fixed` los anchos los manda el CSS, y el reparto que sirve
 * para un palmarés de 1908 —dos columnas con datos— aprieta al de 2017, que
 * lleva foto, premios y cinco etiquetas de fuente. Cada uno quiere lo suyo.
 *
 * Se guarda por columna, no por edición: quien ensancha «Fuentes» una vez la
 * quiere ancha siempre. */
function setupColumnasAjustables() {
  const ANCHOS = {};
  try {
    Object.assign(ANCHOS, JSON.parse(localStorage.getItem("anchos-columna") || "{}"));
  } catch { /* si está corrupto, se empieza de cero */ }

  // Ninguna columna puede bajar de aquí, aunque el arrastre lo pida o aunque
  // venga guardado de antes con un valor imposible. El mínimo del arrastre se
  // calcula del título, pero eso solo protege a la columna que arrastras: la de
  // al lado se llevaba el estrujón sin defensa ninguna.
  const SUELO = { foto: 34, puesto: 52, carroza: 96, grupo: 80, fuentes: 74 };

  // El suelo se pone en la TABLA, no en las celdas.
  //
  // Con `table-layout: fixed`, el `min-width` de un `td` se ignora: el navegador
  // reparte lo que haya y las columnas sin anchura fija absorben el estrujón
  // hasta desaparecer. Ensanchar «Fuentes» a 300 px dejaba «Carroza» y «Grupo»
  // en CERO píxeles, literalmente.
  //
  // Así que se le da a la tabla un ancho mínimo igual a la suma de lo que cada
  // columna necesita —lo que el usuario haya fijado, o su suelo—. Por debajo de
  // eso la tabla ya no encoge: se desliza el panel. Encoger está bien hasta que
  // se deja de leer.
  const aplicar = () => {
    Object.entries(ANCHOS).forEach(([col, px]) => {
      document.documentElement.style.setProperty(
        `--col-${col}`, `${Math.max(px, SUELO[col] || 40)}px`);
    });
    // Y ahora se MIDE, en vez de calcular.
    //
    // Sumar los suelos no bastaba: las columnas que el usuario no ha tocado
    // miden lo que el navegador les dé, que suele ser más que su suelo, y al
    // sumar de menos la tabla se quedaba corta y las aplastaba igual. Aquí se
    // mira lo que ha quedado, se rescata a la que se haya caído por debajo de su
    // mínimo dándole anchura explícita, y se vuelve a medir.
    document.querySelectorAll("table.palmares.ajustable").forEach(tabla => {
      tabla.style.minWidth = "";
      for (let vuelta = 0; vuelta < 2; vuelta++) {
        let rescatada = false;
        tabla.querySelectorAll("th[data-col]").forEach(th => {
          const col = th.dataset.col;
          const suelo = SUELO[col] || 40;
          if (th.getBoundingClientRect().width < suelo - 0.5) {
            document.documentElement.style.setProperty(`--col-${col}`, `${suelo}px`);
            rescatada = true;
          }
        });
        if (!rescatada) break;
      }
      const suma = [...tabla.querySelectorAll("th[data-col]")]
        .reduce((total, th) => total + th.getBoundingClientRect().width, 0);
      tabla.style.minWidth = `${Math.ceil(suma)}px`;
    });
  };
  aplicar();

  let activo = null;
  document.addEventListener("mousedown", evento => {
    const th = evento.target.closest("table.ajustable th[data-col]");
    if (!th) return;
    const caja = th.getBoundingClientRect();
    // Solo los últimos 8 px de la cabecera: el resto sigue sirviendo para ordenar.
    if (evento.clientX < caja.right - 8) return;
    // El mínimo de una columna es lo que mide su propio título: una cabecera
    // recortada no se entiende, por corto que sea el dato de debajo.
    const medidor = document.createElement("span");
    medidor.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;"
      + `font:${getComputedStyle(th).font}`;
    medidor.textContent = th.textContent.trim();
    document.body.appendChild(medidor);
    const estilo = getComputedStyle(th);
    const minimo = Math.ceil(medidor.getBoundingClientRect().width)
      + parseFloat(estilo.paddingLeft || 0) + parseFloat(estilo.paddingRight || 0) + 14;
    medidor.remove();
    activo = { col: th.dataset.col, x0: evento.clientX, ancho0: caja.width, minimo };
    document.body.classList.add("redimensionando");
    evento.preventDefault();
  });
  window.addEventListener("mousemove", evento => {
    if (!activo) return;
    const nuevo = Math.max(activo.minimo, SUELO[activo.col] || 40,
      Math.round(activo.ancho0 + evento.clientX - activo.x0));
    ANCHOS[activo.col] = nuevo;
    document.documentElement.style.setProperty(`--col-${activo.col}`, `${nuevo}px`);
  });
  window.addEventListener("mouseup", () => {
    if (!activo) return;
    activo = null;
    document.body.classList.remove("redimensionando");
    aplicar();   // recalcula el mínimo de la tabla con el ancho recién fijado
    localStorage.setItem("anchos-columna", JSON.stringify(ANCHOS));
  });
}

function setupZoomGaleria() {
  const guardado = Number(localStorage.getItem("tam-galeria"));
  state.tamGaleria = guardado || 168;
  document.documentElement.style.setProperty("--galeria", `${state.tamGaleria}px`);

  document.addEventListener("input", evento => {
    if (evento.target.id !== "zoom-galeria") return;
    state.tamGaleria = Number(evento.target.value);
    document.documentElement.style.setProperty("--galeria", `${state.tamGaleria}px`);
    localStorage.setItem("tam-galeria", state.tamGaleria);
  });
}

/* iOS amplia la pagina al enfocar un campo cuya letra baje de 16 px, y despues
 * la deja descolocada. La salida facil es poner 16 px al campo, pero entonces
 * el buscador queda con la letra mas gorda que "Limpiar" y "Todas las decadas",
 * que van en la misma fila: se arreglaba el zoom estropeando la barra. Se
 * intento tres veces por ahi.
 *
 * Asi que se frena el zoom en lugar de rendirse a el: mientras hay un campo
 * enfocado, el viewport no deja ampliar; al salir del campo se devuelve. El
 * `maximum-scale` fijo de toda la vida no vale porque le quita el pellizco a
 * quien necesita ampliar para leer, y eso no se negocia por un detalle de
 * maquetacion. Aqui solo esta puesto los segundos que dura el foco.
 *
 * Solo en iOS: es el unico que hace esto, y en los demas seria quitar el
 * pellizco a cambio de nada. */
function frenarZoomAlEnfocar() {
  const esIOS = /iPad|iPhone|iPod/.test(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  if (!esIOS) return;
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  const suelto = meta.getAttribute("content");
  const atado = suelto + ", maximum-scale=1";
  const escribible = el => el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

  document.addEventListener("focusin", event => {
    if (escribible(event.target)) meta.setAttribute("content", atado);
  });
  document.addEventListener("focusout", event => {
    if (!escribible(event.target)) return;
    // Se devuelve el pellizco un instante despues: si se hace en el mismo
    // momento del blur, Safari aun esta cerrando el teclado y se lo come.
    setTimeout(() => {
      if (!escribible(document.activeElement)) meta.setAttribute("content", suelto);
    }, 300);
  });
}

/* Moverse por el grafico de trayectorias.
 *
 * El contenedor ya se desliza con el dedo y con la rueda horizontal, pero en un
 * portatil sin rueda lateral no hay forma de recorrer el siglo sin ir a la barra
 * de scroll. Con arrastrar basta. Se distingue del clic por la distancia: menos
 * de 4 px sigue siendo un clic y abre la ficha del carrocista.
 *
 * Ademas, el ancho de "todo a la vista" depende del hueco, asi que al cambiar el
 * tamano de la ventana hay que volver a medir. */
function setupCarreras() {
  let arrastre = null;
  // Se apunta al soltar y lo consume el `click` que viene detras. Si por lo que
  // sea ese click no llega -por ejemplo, si se suelta fuera de la ventana- la
  // marca se quedaria puesta y se comeria un clic legitimo mas tarde: cada
  // gesto nuevo la limpia.
  let fueArrastre = false;

  document.addEventListener("mousedown", evento => {
    fueArrastre = false;
    const caja = evento.target.closest("[data-carreras]");
    if (!caja || caja.scrollWidth <= caja.clientWidth) return;
    arrastre = { caja, x0: evento.clientX, scroll0: caja.scrollLeft, movido: 0 };
  });
  window.addEventListener("mousemove", evento => {
    if (!arrastre) return;
    const dx = evento.clientX - arrastre.x0;
    arrastre.movido = Math.max(arrastre.movido, Math.abs(dx));
    if (arrastre.movido < 4) return;
    arrastre.caja.classList.add("arrastrando");
    arrastre.caja.scrollLeft = arrastre.scroll0 - dx;
    apuntarCentro(arrastre.caja);
    evento.preventDefault();
  });
  // El `click` llega DESPUES del `mouseup`, asi que no se puede consultar el
  // arrastre desde el: para entonces ya se ha soltado. Se deja escrito al
  // soltar si aquello fue un arrastre, y el click lo lee y se anula.
  window.addEventListener("click", evento => {
    if (!fueArrastre) return;
    fueArrastre = false;
    if (!evento.target.closest("[data-carreras]")) return;
    evento.stopPropagation();
    evento.preventDefault();
  }, true);
  window.addEventListener("mouseup", () => {
    if (!arrastre) return;
    fueArrastre = arrastre.movido >= 4;
    arrastre.caja.classList.remove("arrastrando");
    arrastre = null;
  });

  // Resaltar la fila entera al pasar por el nombre, y al reves: son dos
  // elementos distintos desde que los nombres salieron del SVG.
  document.addEventListener("mouseover", evento => {
    const caja = document.querySelector("[data-carreras]");
    if (!caja) return;
    const fila = evento.target.closest("[data-fila]");
    caja.querySelectorAll(".hover-fila").forEach(el => el.classList.remove("hover-fila"));
    if (!fila || !caja.contains(fila)) return;
    caja.querySelectorAll(`[data-fila="${fila.dataset.fila}"]`)
      .forEach(el => el.classList.add("hover-fila"));
  });

  let temporizador = null;
  window.addEventListener("resize", () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => pintarCarreras(), 120);
  });
}

function setupDivisor() {
  const divisor = document.querySelector(".divisor");
  if (!divisor) return;
  const MIN = 300;
  const MAX_PROPORCION = 0.68;   // que nunca se coma el índice entero

  const aplicar = ancho => {
    const tope = Math.max(MIN, Math.round(window.innerWidth * MAX_PROPORCION));
    const valor = Math.min(Math.max(ancho, MIN), tope);
    document.documentElement.style.setProperty("--ficha-ancho", `${valor}px`);
    // Las fotos crecen con la columna: si alguien la ensancha es justo para ver
    // mejor, y una miniatura de 54 px no aprovecha el espacio que acaba de dar.
    const sobra = valor - MIN;
    document.documentElement.style.setProperty(
      "--miniatura", `${Math.round(54 + sobra * 0.22)}px`);
    return valor;
  };

  aplicar(Number(localStorage.getItem("ficha-ancho")) || 430);

  let arrastrando = false;
  const mover = evento => {
    if (!arrastrando) return;
    const x = evento.touches ? evento.touches[0].clientX : evento.clientX;
    aplicar(window.innerWidth - x - 20);
  };
  const soltar = () => {
    if (!arrastrando) return;
    arrastrando = false;
    divisor.classList.remove("arrastrando");
    document.body.classList.remove("redimensionando");
    const actual = getComputedStyle(document.documentElement).getPropertyValue("--ficha-ancho");
    if (actual) localStorage.setItem("ficha-ancho", parseInt(actual, 10));
  };
  const coger = evento => {
    if (isNarrow()) return;
    arrastrando = true;
    divisor.classList.add("arrastrando");
    document.body.classList.add("redimensionando");
    evento.preventDefault();
  };

  divisor.addEventListener("mousedown", coger);
  divisor.addEventListener("touchstart", coger, { passive: false });
  window.addEventListener("mousemove", mover);
  window.addEventListener("touchmove", mover, { passive: true });
  window.addEventListener("mouseup", soltar);
  window.addEventListener("touchend", soltar);

  // Con el teclado, flechas: un separador con `tabindex` que no responda al
  // teclado es un adorno.
  divisor.addEventListener("keydown", evento => {
    const paso = evento.key === "ArrowLeft" ? 24 : evento.key === "ArrowRight" ? -24 : 0;
    if (!paso) return;
    evento.preventDefault();
    const actual = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue("--ficha-ancho"), 10) || 430;
    localStorage.setItem("ficha-ancho", aplicar(actual + paso));
  });

  // Al estrechar la ventana, el tope relativo puede haber cambiado.
  window.addEventListener("resize", () => {
    const actual = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue("--ficha-ancho"), 10);
    if (actual) aplicar(actual);
  });
}

function setupVisor() {
  document.getElementById("lb-close").addEventListener("click", cerrarVisor);
  document.getElementById("lb-prev").addEventListener("click", () => moverVisor(-1));
  document.getElementById("lb-next").addEventListener("click", () => moverVisor(1));
  document.getElementById("lightbox").addEventListener("click", event => {
    // Pulsar el fondo cierra; sobre la foto o los botones, no.
    if (event.target.id === "lightbox") cerrarVisor();
  });
  document.addEventListener("keydown", event => {
    if (document.getElementById("lightbox").hidden) return;
    if (event.key === "Escape") cerrarVisor();
    if (event.key === "ArrowLeft") moverVisor(-1);
    if (event.key === "ArrowRight") moverVisor(1);
  });
  // Deslizar en el movil.
  let x0 = null;
  const caja = document.getElementById("lightbox");
  caja.addEventListener("touchstart", e => { x0 = e.changedTouches[0].clientX; }, { passive: true });
  caja.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 45) moverVisor(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });
}

/* Las fotos de las que sabemos el año pero no la carroza.
 *
 * Van DESPUÉS de las documentadas y en su propio apartado, no mezcladas: son
 * carrozas que desfilaron y de las que no tenemos ficha. Enseñarlas sin decirlo
 * sería hacerlas pasar por identificadas; esconderlas sería fingir que el
 * archivo está completo.
 *
 * El visor las recorre a continuación de las documentadas -están en el mismo
 * panel- así que se pasa de unas a otras sin salir. */
function renderGallerySinIdentificar(edition) {
  const fotos = edition.unassigned_images || [];
  if (!fotos.length) return "";
  return `
    <h3 class="section">Sin identificar (${fotos.length})</h3>
    <p class="chart-note">Estas fotos son de ${edition.year}, pero no sabemos de qué carroza.
    Si reconoces alguna, es justo lo que nos falta.</p>
    <div class="gallery gallery-anon">
      ${fotos.map(f => `
        <figure class="shot">
          <button type="button" class="shot-btn" data-photo="${esc(f.url)}"
            data-nombre="Carroza sin identificar" data-grupo="" data-anio="${edition.year}"
            data-puesto="" data-credito="Del archivo de batalladeflores.net"
            data-asigna="No sabemos de qué carroza es: el nombre del fichero («${esc(f.fichero || "")}») dice el año pero no el título"
            data-asigna-prop="deducción" data-origen="${esc(f.pagina || "")}"
            title="Carroza sin identificar de ${edition.year}">
            <img src="${esc(thumbUrl(f.url))}" alt="Carroza sin identificar de ${edition.year}" loading="lazy">
          </button>
          <figcaption>
            <span class="credito">Del archivo de batalladeflores.net</span>
            <span class="asigna asigna-deducida">no sabemos qué carroza es</span>
            <button class="ask" type="button" data-ask="year:${edition.year}"
              data-ask-label="${edition.year} · foto sin identificar (${esc(f.fichero || "")})"
              >${ICON_FLAG}<span>¿sabes cuál es?</span></button>
          </figcaption>
        </figure>`).join("")}
    </div>`;
}

function renderGallery(entries) {
  const TOPE = 60;
  const todas = entries.flatMap(entry =>
    (entry.image_urls || []).map(url => ({ url, entry })));
  const images = todas.slice(0, TOPE);
  if (!images.length) return "";
  return `
    <h3 class="section">Imágenes (${todas.length})
      <label class="zoom-fotos" title="Tamaño de las fotos">
        <span aria-hidden="true">▪</span>
        <input type="range" id="zoom-galeria" min="110" max="420" step="10"
          value="${state.tamGaleria || 168}" aria-label="Tamaño de las fotos">
        <span aria-hidden="true">■</span>
      </label>
    </h3>
    ${todas.length > TOPE ? `<p class="chart-note">Se muestran las primeras ${TOPE};
      el resto están en la ficha de cada carroza.</p>` : ""}
    <div class="gallery">
      ${images.map(({ url, entry }) => `
        <figure class="shot">
          <button type="button" class="shot-btn" ${photoAttrs(entry, url)}
             title="${esc(entry.name)} (${entry.year})${entry.group_canonical ? ` · ${esc(entry.group_canonical)}` : ""}">
            <img src="${esc(thumbUrl(url))}" alt="${esc(entry.name)}" loading="lazy">
          </button>
          <figcaption><span class="shot-name">${esc(entry.name)}</span><small>${entry.year}${entry.group_canonical ? ` · ${esc(entry.group_canonical)}` : ""}</small>
            ${photoCredit(entry)}</figcaption>
        </figure>`).join("")}
    </div>`;
}

/* Informe de procedencia, no una lista de fuentes.
 *
 * La pregunta que se hace quien mira una ficha no es "que fuentes hay" sino
 * "de donde sale ESTE dato". Asi que se responde por tipo de dato: quien
 * desfilo, quien gano, que no cuadra y que ha confirmado otra fuente distinta.
 * Todo sale del `source_type` de cada carroza, que es una lista unida por "+"
 * con las fuentes que aportaron esa fila. */

/* Familias de fuente, para poder decir "dos fuentes independientes": el
 * palmares y la ficha de carroza son la misma web, asi que no se confirman
 * entre si. */
const SOURCE_FAMILY = {
  archive_palmares: "archivo",
  archive_float_page: "archivo",
  official_result: "oficial",
  official_result_summary: "oficial",
  press_clipping: "prensa",
  book: "libro",
  press_history: "prensa",
  press_photo: "prensa",
  // La capa manual NO es una familia: es transcripcion nuestra de esas mismas
  // fuentes, asi que no puede "confirmar" nada de forma independiente.
};

function sourceParts(entry) {
  return (entry.source_type || "").split("+").filter(Boolean);
}

function families(entry) {
  return new Set(sourceParts(entry).map(part => SOURCE_FAMILY[part]).filter(Boolean));
}

/* "el archivo y la prensa" en vez de "archivo, prensa". */
function joinEs(items) {
  if (items.length < 2) return items[0] || "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function countBySource(entries) {
  const counts = new Map();
  entries.forEach(entry => sourceParts(entry).forEach(part => {
    counts.set(part, (counts.get(part) || 0) + 1);
  }));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function provenanceLine(label, entries, vacio) {
  if (!entries.length) return `<li><b>${label}:</b> ${vacio}</li>`;
  // Cada fuente con su flecha. La linea decia «14, de Programa oficial (14)»
  // sin enlace: el unico sitio de la ficha donde una fuente se citaba sin
  // poder ir a verla. Se enlaza la primera URL que esa fuente aporta en la
  // edicion; para una nota o un programa es LA pagina.
  const urlPorFuente = new Map();
  entries.forEach(entry => (entry.source_links || []).forEach(l => {
    if (l.url && !urlPorFuente.has(l.kind)) urlPorFuente.set(l.kind, l.url);
  }));
  const partes = countBySource(entries)
    .map(([part, n]) => {
      const url = urlPorFuente.get(part);
      const nombre = `${esc(SOURCE_LABEL[part] || part)} (${n})`;
      return url ? `${nombre} <a href="${esc(url)}" target="_blank" rel="noopener">↗</a>` : nombre;
    });
  return `<li><b>${label}:</b> ${entries.length}, de ${joinEs(partes)}.</li>`;
}

/* Leyenda de los codigos de fuente. Se pinta pegada a la tabla del palmares:
 * la version larga vive en "De donde sale cada dato", pero eso queda una
 * pantalla y media mas abajo y nadie ata los dos cabos. */
function codesLegend(entries) {
  const usados = new Set();
  entries.forEach(entry => {
    const c = entry.claims || {};
    if (c.name) usados.add("EXI");
    if (entry.position != null && c.position) usados.add("POS");
    if (entry.category && c.category) usados.add("CAT");
    if (entry.group_raw && c.group_raw) usados.add("GRU");
    if (entry.prize_costumes_rank != null) usados.add("VES");
    if (entry.prize_art_rank != null) usados.add("ART");
    if (entry.prize_international_rank != null) usados.add("INT");
    if (entry.points != null) usados.add("PTS");
    (entry.image_refs || []).forEach(r => usados.add(r.por === "pagina" ? "FOT" : "ARC"));
  });
  if (!usados.size) return "";
  const texto = {
    EXI: "que la carroza desfiló",
    POS: "el puesto", CAT: "la categoría", GRU: "el grupo", VES: "el premio de vestidos",
    ART: "el premio de arte",
    INT: "el premio internacional, que vota un jurado de las ciudades hermanas",
    PTS: "los puntos",
    FOT: "la foto, publicada en la ficha de esa carroza",
    ARC: "la foto, identificada por el nombre del fichero (sin página que enlazar)",
  };
  const orden = ["EXI", "POS", "CAT", "GRU", "VES", "ART", "INT", "PTS", "FOT", "ARC"];
  return `<p class="codes codes-inline">Cada flecha lleva a la fuente de ese dato:
    ${orden.filter(c => usados.has(c))
      .map(c => `<span class="tag">${c}</span> ${esc(texto[c])}`).join(" · ")}</p>`;
}

/* Lo que queda por confirmar EN ESTA EDICIÓN.
 *
 * No es una lista nueva: es la misma base de datos que alimenta la pestaña
 * "Pendiente", filtrada por año. Una cuestión abierta se escribe una vez y sale
 * en los dos sitios: en el inventario general y donde el lector se la va a
 * encontrar. Si solo estuviera en la pestaña, quien mira 1930 no se entera de
 * que ese podio está en disputa. */
/* Las gracias por las fotos, una vez por edición y no bajo cada carroza.
 *
 * El crédito por foto sigue estando donde toca —en su pie y en su ficha—, pero
 * repetir "cedidas por Santi Fernández" trece veces en la misma pantalla no
 * agradece más: cansa. Aquí va el reconocimiento; ahí arriba, la auditoría. */
function photoThanks(entries) {
  const origenes = new Map();
  entries.forEach(entry => (entry.image_refs || []).forEach(ref => {
    origenes.set(ref.origen, (origenes.get(ref.origen) || 0) + 1);
  }));
  if (!origenes.size) return "";
  const partes = [...origenes.entries()].sort((a, b) => b[1] - a[1]).map(([quien, n]) =>
    `<b>${esc(quien)}</b> (${n} foto${n === 1 ? "" : "s"})`);
  return `<p class="gracias">📷 Las fotos de esta edición son de ${joinEs(partes)}.
    Se publican con su permiso y cada una dice de dónde sale.</p>`;
}

function pendingForYear(year) {
  const q = openQuestions();
  const filas = [];
  q.sinConfirmar.filter(e => e.year === year).forEach(e => filas.push({
    icono: "❔", texto: e.notes?.[0] || "Está por confirmar que se celebrara.",
  }));
  q.imposibles.filter(r => r.year === year).forEach(r => filas.push({
    icono: "⛔", texto: esc(r.reason), crudo: true,
  }));
  q.hemeroteca.filter(r => r.year === year).forEach(r => filas.push({
    icono: "📰", texto: `<b>${esc(r.name)}</b> — ${esc(r.reason)}`,
    extra: citationList(r.citas), crudo: true,
  }));
  q.disputed.filter(r => r.year === year).forEach(r => filas.push({
    icono: "🏷️", texto: `<b>${esc(r.name)}</b> — ${esc(r.reason)}`, crudo: true,
  }));
  q.conflicting.filter(r => r.year === year).forEach(r => filas.push({
    icono: "↕️", texto: `<b>${esc(r.name)}</b> — ${esc(r.reason)}`, crudo: true,
  }));
  (state.huecosDeEdicion || []).forEach(texto => filas.push({ icono: "📉", texto }));
  q.incomplete.filter(e => e.year === year).forEach(e => filas.push({
    icono: "📉", texto: e.notes.find(n => n.includes("faltan al menos")) || "",
  }));
  q.noPalmares.filter(e => e.year === year).forEach(e => filas.push({
    icono: "🕳️", texto: "No se ha localizado la clasificación de esta edición.",
  }));
  if (!filas.length) return "";
  return `
    <h3 class="section">Por confirmar <span class="open-count">${filas.length}</span></h3>
    <ul class="open-list open-list-edicion">${filas.map(f => `
      <li>${f.icono} ${f.crudo ? f.texto : esc(f.texto)}${f.extra || ""}</li>`).join("")}</ul>
    <p class="chart-note">Están también en la pestaña
      <button class="link t-float" type="button" data-goto-pending="1">❓ Pendiente</button>,
      con el resto de lo que falta por cerrar en el archivo.</p>`;
}

function provenanceBlock(entries, sources, edition) {
  const ranked = entries.filter(entry => entry.position != null);
  const cruzadas = entries.filter(entry => families(entry).size > 1);
  const dudosas = entries.filter(entry => (entry.needs_review || []).length);
  const huecos = edition?.notes_derivadas || [];

  const codes = new Map();
  entries.forEach(entry => sourceParts(entry).forEach(part => {
    if (SOURCE_SHORT[part]) codes.set(SOURCE_SHORT[part], SOURCE_LABEL[part]);
  }));

  return `
    <div class="provenance">
      <b>De dónde sale cada dato</b>
      <ul class="prov-list">
        ${edition?.parade_date_text ? (() => {
          // Cuántas fuentes lo sostienen, y CADA UNA con su enlace.
          //
          // Antes decía «según X» con un solo nombre, aunque hubiera dos: la
          // segunda fuente se perdía en la ficha igual que se perdía en el libro
          // mayor. Y la corroboración es el dato más valioso del archivo —el 81%
          // viene de un solo sitio—, así que esconderla era esconder lo bueno.
          const fuentes = edition.parade_date_sources && edition.parade_date_sources.length
            ? edition.parade_date_sources
            : [{ nombre: edition.parade_date_source || "sin origen registrado",
                 enlace: edition.parade_date_url }];
          const lista = fuentes.map(f => `<li>${esc(f.nombre)}${f.enlace
            ? ` <a href="${esc(f.enlace)}" target="_blank" rel="noopener">↗</a>` : ""}</li>`).join("");
          const cuantas = fuentes.length === 1
            ? "Lo dice una fuente"
            : `Lo confirman <b>${fuentes.length} fuentes independientes</b>`;
          const cita = edition.parade_date_nota
            ? `<div class="prov-cita">${esc(edition.parade_date_nota)}</div>` : "";
          return `<li><b>La fecha del desfile:</b> ${esc(edition.parade_date_text)}.
            ${cuantas}:<ul class="prov-fuentes">${lista}</ul>${cita}</li>`;
        })() : ""}
        ${edition?.cartel ? `<li><b>El cartel:</b> procede de
          ${esc(edition.cartel.origen)} —
          <a href="${esc(edition.cartel.original)}" target="_blank" rel="noopener">el
          original ↗</a>—. Lo servimos desde aquí para no gastar el ancho de banda
          de quien lo publica. ${esc(edition.cartel.asignacion)}.</li>` : ""}
        ${edition?.status === "planned" ? (() => {
          // Una edicion sin celebrar no tiene datos "que falten": es que todavia
          // no existen. Decir "no consta ninguna carroza" ahi parece un fallo de
          // la pagina cuando es el estado correcto del mundo.
          //
          // Y desde que el programa oficial se publica ANTES del desfile, una
          // prevista puede tener ya sus carrozas: entonces se ensena la linea
          // de participantes con su fuente, como en cualquier edicion, y solo
          // la clasificacion queda como pendiente-por-naturaleza.
          if (entries.length) return `
            ${provenanceLine("Participantes", entries, "")}
            <li><b>Clasificación:</b> se sabrá tras el desfile.</li>`;
          const nm = state.dataset.noche_magica;
          const anuncio = nm && nm.year === edition.year
            ? `Se conocen los <b>${nm.grupos.length} grupos</b> y las
               <b>${nm.float_count} carrozas</b> que van a desfilar, publicados por el
               Ayuntamiento. Los nombres de las carrozas y la clasificación se sabrán
               el día del desfile.`
            : "Todavía no se ha celebrado.";
          return `<li><b>Edición aún por celebrar:</b> ${anuncio}</li>`;
        })() : `
        ${provenanceLine("Participantes", entries, "no consta ninguna carroza.")}
        ${ranked.length === entries.length && entries.length
          ? `<li><b>Clasificación:</b> ${entries.length === 1
              ? "la única carroza tiene puesto"
              : `las ${entries.length} tienen puesto`}, de las mismas fuentes.</li>`
          : provenanceLine("Clasificación", ranked, "ninguna carroza tiene puesto.")}
        ${cruzadas.length ? `<li><b>Confirmado por más de una fuente:</b> ${cruzadas.length}
          carroza${cruzadas.length === 1 ? "" : "s"} ${cruzadas.length === 1 ? "aparece" : "aparecen"}
          en fuentes independientes entre sí
          (${joinEs([...new Set(cruzadas.flatMap(entry => [...families(entry)]))].sort())}),
          que coinciden en el dato.</li>` : ""}
        ${dudosas.length ? `<li class="prov-warn"><b>Inconsistencias detectadas:</b> ${dudosas.length}
          en esta edición. Están marcadas con <span class="review-mark">?</span> en la tabla.</li>` : ""}
        ${huecos.length ? `<li class="prov-warn"><b>Lo que falta:</b> ${esc(huecos[0])}</li>` : ""}`}
      </ul>
      ${/* Aquí NO va la leyenda de códigos. Este bloque escribe las fuentes con
            su nombre entero —«Resultado oficial», «Fotos cedidas por Santi
            Fernández»—, así que explicar que OFI significa «Resultado oficial»
            es explicar una abreviatura que no aparece en ninguna parte. La
            leyenda vive donde se usan los códigos: debajo de la tabla del
            palmarés, en cuya columna FUENTES sí salen. */ ""}
      ${sources.length ? `<ul class="plain prov-urls">${sources.map(url => {
        // Un enlace a un .jpg de prensa no se explica solo: se etiqueta.
        const etiqueta = /\.jpe?g$/i.test(url) ? "📰 Ver el recorte de prensa original"
          : url.includes("revista-de-prensa") ? "Página de revista de prensa"
          : url.includes("laredo.es") ? "Nota del Ayuntamiento"
          : "Archivo de batalladeflores.net";
        // Sin repetir la URL debajo en texto plano: el enlace ya la lleva, y
        // verla escrita entera no añade nada salvo ruido y una línea que se
        // parte por la mitad en el móvil. Se deja en el `title` para quien
        // quiera saber a dónde va antes de pulsar.
        return `<li><a href="${esc(url)}" target="_blank" rel="noopener"
          title="${esc(url)}">${esc(etiqueta)} ↗</a></li>`;
      }).join("")}</ul>`
        : '<p style="margin:6px 0 0">Sin URL de fuente asociada.</p>'}
    </div>`;
}

/* La fecha, exactamente tan ancha como el año que tiene debajo.
 *
 * No se puede hacer con CSS: «viernes 28 de agosto» tiene veinte caracteres y
 * «2026» cuatro, así que el tamaño que los iguala depende de las dos cadenas y
 * cambia con cada edición —«sábado 1 de septiembre» no mide lo mismo—.
 *
 * Se hace en dos pasos porque uno solo no clava: primero el cuerpo de letra,
 * que acerca; luego el espaciado entre letras, que remata los píxeles que
 * falten. Estirar con `scaleX` habría sido más corto y habría deformado la
 * letra, que es lo que distingue esto de una fecha aplastada.
 *
 * El cuerpo va acotado: si la cadena es larguísima no se baja de 9 px, porque
 * una línea que no se lee no es alineación, es un adorno. */
function ajustarFechaAlAno() {
  const bloque = document.querySelector(".anio-bloque");
  const fecha = bloque?.querySelector(".fecha-desfile");
  const anio = bloque?.querySelector("h2");
  if (!fecha || !anio) return;

  fecha.style.fontSize = "";
  fecha.style.letterSpacing = "";
  const objetivo = anio.getBoundingClientRect().width;
  if (!objetivo) return;

  const base = parseFloat(getComputedStyle(fecha).fontSize);
  const anchoBase = fecha.getBoundingClientRect().width;
  if (!anchoBase) return;

  const cuerpo = Math.min(22, Math.max(9, base * (objetivo / anchoBase)));
  fecha.style.fontSize = `${cuerpo.toFixed(2)}px`;

  // El último ajuste, repartido entre los huecos. El espaciado también se pone
  // detrás de la última letra, así que los huecos son tantos como caracteres.
  const huecos = fecha.textContent.length;
  const resto = objetivo - fecha.getBoundingClientRect().width;
  if (huecos > 0) fecha.style.letterSpacing = `${(resto / huecos).toFixed(3)}px`;
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

  // Para la edicion que viene no hay carrozas en el palmares, pero si sabemos
  // cuantas van a desfilar: la cabecera diria "0 carrozas" y seria mentira.
  const nm = state.dataset.noche_magica;
  const previa = nm && nm.year === edition.year && !entries.length ? nm : null;
  const groupCount = previa ? previa.grupos.length
    : new Set(entries.map(e => e.group_canonical).filter(Boolean)).size;
  // La miniatura va como columna del palmares en vez de en galeria aparte: la
  // tabla ya tiene el ancho, y asi la foto queda junto a su carroza.
  // Con categorias A y B, mostrarlas juntas mezclaba dos competiciones
  // distintas: se separan con un selector, como en Estadisticas.
  const cats = [...new Set(ranked.map(entry => entry.category).filter(Boolean))].sort();
  const shownCat = state.editionCategory === "todas" || cats.includes(state.editionCategory)
    ? state.editionCategory : cats[0];
  const shown = cats.length > 1 && shownCat !== "todas"
    ? ranked.filter(entry => entry.category === shownCat) : ranked;
  const withPhotos = shown.some(entry => (entry.image_urls || []).length);

  // Anterior y siguiente recorren TODAS las ediciones por orden de año, no las
  // que deje el filtro puesto. Saltarse 1937-1940 porque un filtro los esconde
  // seria esconder justo lo que este archivo quiere enseñar: que hay años de
  // los que no ha quedado nada.
  const anios = state.editions.map(e => e.year).sort((a, b) => a - b);
  const donde = anios.indexOf(edition.year);
  const anterior = donde > 0 ? anios[donde - 1] : null;
  const siguiente = donde >= 0 && donde < anios.length - 1 ? anios[donde + 1] : null;
  // Con el año escrito en el boton y no una flecha sola: se ve a donde lleva
  // antes de pulsarlo, que en un archivo con huecos no es lo mismo que "+1".
  const navEdicion = `
    <nav class="edicion-nav" aria-label="Otras ediciones">
      ${anterior ? `<button class="nav-edicion" type="button" data-year="${anterior}"
        title="Edición de ${anterior}">‹ ${anterior}</button>` : "<span></span>"}
      ${siguiente ? `<button class="nav-edicion" type="button" data-year="${siguiente}"
        title="Edición de ${siguiente}">${siguiente} ›</button>` : "<span></span>"}
    </nav>`;

  els.detail.innerHTML = `
    <div class="detail-head edition-head">
      ${edition.cartel
        // Pequeño y al lado del año, no dentro de la galería.
        //
        // Un cartel no es una foto más de la edición: es la cara que la edición
        // se dio a sí misma, la encargó alguien y se pegó por Laredo. Y sobre
        // todo es la PRUEBA de la fecha —lleva impreso «28 de Agosto de 1998 ·
        // 89 Edición»—, así que su sitio es junto a la fecha, no al final.
        //
        // Pequeño a propósito: lo primero que se tiene que ver es el año, y
        // solo 43 de 115 ediciones tienen cartel. Un hueco grande y vacío en las
        // otras 72 sería peor que no ponerlo.
        ? `<button class="cartel-mini" type="button"
             data-photo="${esc(edition.cartel.url)}"
             data-nombre="Cartel de la Batalla de Flores de ${edition.year}"
             data-anio="${edition.year}" data-grupo="" data-puesto=""
             data-credito="${esc(`Cartel anunciador · ${edition.cartel.origen}`)}"
             data-origen="${esc(edition.cartel.origen)}"
             data-asigna="${esc(edition.cartel.asignacion)}"
             data-asigna-prop="${esc(edition.cartel.asignada_por)}"
             title="Cartel anunciador de ${edition.year} — pulsa para verlo entero">
             <img src="${esc(edition.cartel.mini)}" alt="Cartel de la Batalla de Flores de ${edition.year}" loading="lazy">
           </button>` : ""}
      <div class="anio-bloque">
      <h2>${edition.year}</h2>
      ${edition.parade_date_text
        // DEBAJO del año, no encima. El año es la identidad de la edición y es
        // por donde se navega: poniendo la fecha arriba, el ojo aterrizaba
        // primero en una línea gris pequeña. Debajo funciona como lo que es,
        // un pie. Y sin «de 2026», que ya está justo encima.
        //
        // El ancho lo iguala `ajustarFechaAlAno()`: la fecha mide exactamente
        // lo que el año, así que las dos líneas forman un bloque.
        ? `<span class="fecha-desfile" title="Fuente: ${esc(edition.parade_date_source || "")}">${
            esc(edition.parade_date_text.replace(/ de \d{4}$/, ""))}</span>` : ""}
      </div>
      <span class="discs">
        ${edition.edition_number
          ? `<span class="disc disc-wide" title="${esc(edition.edition_label || "")}"><b>${edition.edition_number}ª</b>edición</span>`
          : ""}
        <span class="disc"><b>${num(previa ? previa.float_count : (edition.float_count || 0))}</b>carrozas</span>
        <span class="disc"><b>${num(groupCount)}</b>grupos</span>
      </span>
    </div>
    ${navEdicion}
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
      ${cats.length > 1 ? `<div class="chart-tabs">
        <button class="view${shownCat === "todas" ? " is-on" : ""}" type="button"
          data-edition-cat="todas" title="Las ${ranked.length} carrozas del desfile, juntas">Todas</button>
        ${cats.map(cat =>
          `<button class="view${cat === shownCat ? " is-on" : ""}" type="button"
            data-edition-cat="${esc(cat)}">Categoría ${esc(cat)}</button>`).join("")}</div>` : ""}
      <table class="palmares ajustable${withPhotos ? " with-photo" : ""}">
        <thead><tr>
          ${withPhotos ? '<th class="c-photo" data-col="foto">Foto</th>' : ""}
          <th data-sort-type="text" data-col="puesto">Puesto</th>
          <th data-sort-type="text" data-col="carroza">Carroza</th>
          <th data-sort-type="text" data-col="grupo">Grupo</th>
          <th data-sort-type="text" data-col="fuentes">Fuentes</th>
        </tr></thead>
        <tbody>
          ${shown.map(entry => `
            <tr>
              ${withPhotos ? `<td class="c-photo">${(entry.image_urls || []).length
                ? `<button class="thumb" type="button" ${photoAttrs(entry, entry.image_urls[0])}
                     data-tip="${esc(entry.name)}"><img src="${esc(thumbUrl(entry.image_urls[0]))}"
                     alt="${esc(entry.name)}" loading="lazy"></button>`
                : ""}</td>` : ""}
              <td class="pos" data-sort="${esc(positionSortKey(entry))}">${entry.position === 1
                ? `${ICON_TROPHY}` : ""}${shownCat === "todas" && entry.category
                ? `<span class="pos-cat cat-${esc(entry.category.toLowerCase())}">${esc(entry.category)}</span>` : ""}${
                entry.position != null ? `${entry.position}.º` : "–"}</td>
              <td class="name" data-sort="${esc(normalizeText(entry.name))}"><button class="link t-float"
                type="button" data-float="${esc(entry.id)}">${esc(entry.name)}</button>${reviewMark(entry)}${prizeChips(entry)
                ? `<small class="prizes">${esc(prizeChips(entry))}</small>` : ""}</td>
              <td class="group" data-sort="${esc(normalizeText(entry.group_canonical))}">${entry.group_canonical
                ? `<button class="link t-group" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
                : "–"}</td>
              <td data-sort="${esc(sourceShort(entry.source_type))}">${sourceCell(entry)}</td>
            </tr>`).join("")}
        </tbody>
      </table>
      ${codesLegend(shown)}` : (edition.status === "planned" ? "" :
        '<h3 class="section">Palmarés</h3><p class="empty">No hay palmarés estructurado para este año.</p>')}

    ${unranked.length ? `
      <h3 class="section">Otras carrozas documentadas (${unranked.length})</h3>
      <table class="palmares">
        <colgroup><col><col><col class="c-src"></colgroup>
        <thead><tr>
          <th data-sort-type="text">Carroza</th>
          <th data-sort-type="text">Grupo</th>
          <th data-sort-type="text">Fuentes</th>
        </tr></thead>
        <tbody>
          ${unranked.map(entry => `
            <tr>
              <td class="name" data-sort="${esc(normalizeText(entry.name))}"><button class="link t-float"
                type="button" data-float="${esc(entry.id)}">${esc(entry.name)}</button>${reviewMark(entry)}</td>
              <td class="group" data-sort="${esc(normalizeText(entry.group_canonical))}">${entry.group_canonical
                ? `<button class="link t-group" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
                : "–"}</td>
              <td data-sort="${esc(sourceShort(entry.source_type))}">${sourceCell(entry)}</td>
            </tr>`).join("")}
        </tbody>
      </table>` : ""}

    ${edition.status === "planned" ? nocheMagicaBlock(edition) : ""}

    ${(() => {
      // Los huecos conocidos no son una nota mas al final: son lo que hay que
      // saber antes de leer el palmares, y la mejor peticion de ayuda posible.
      // El aviso rojo es para huecos DE VERDAD. Una nota que explique de donde
      // salio un dato -aunque diga "no aparece en ninguna fuente publicada"- no
      // es un hueco: es trazabilidad, y va en Notas.
      // Dos listas separadas: `notes` cuenta cosas que pasaron y no se tocan;
      // `notes_derivadas` describe lo que le falta al archivo y se rehace en
      // cada build a partir del estado final.
      const gaps = edition.notes_derivadas || [];
      const rest = edition.notes || [];
      state.huecosDeEdicion = gaps;
      return rest.length ? `<h3 class="section">Notas</h3>
          <ul class="plain">${rest.map(note => `<li>${esc(note)}</li>`).join("")}</ul>` : "";
    })()}

    ${edition.status === "planned" ? "" : nocheMagicaBlock(edition)}

    ${renderGallery(entries)}
    ${renderGallerySinIdentificar(edition)}

    ${route?.geometry ? `
      <h3 class="section">Recorrido</h3>
      ${renderRouteMap(route.id, { variant: "thumbstrip" })}` : ""}

    ${photoThanks(entries)}

    ${(edition.curiosidades || []).length ? `
      <h3 class="section">Curiosidades</h3>
      <ul class="curiosidades">
        ${edition.curiosidades.map(c => `<li>
          ${esc(c.texto)}
          <small>Se deduce de ${esc(c.de_donde_sale)}, que afirman
          ${joinEs((c.fuentes || []).map(f => f.enlace
            ? `<a href="${esc(f.enlace)}" target="_blank" rel="noopener">${esc(f.nombre)} ↗</a>`
            : esc(f.nombre))) || "fuentes sin registrar"}.</small>
        </li>`).join("")}
      </ul>` : ""}

    ${pendingForYear(edition.year)}

    ${provenanceBlock(entries, edition.source_urls || [], edition)}
  `;
  els.detail.scrollTop = 0;
  ajustarFechaAlAno();
  activarMapasZoom();
}

/* ── detalle: qué es esto ───────────────────────────────────────────────── */

/* Va por el mismo carril que las demas fichas (seleccion + hash + capa en
 * movil), asi que hereda la cruz de cerrar y se puede enlazar: #/info */
/* Las convenciones se cargan aparte y solo al abrirlas: son un dato de
 * trastienda que casi nadie mira, y no tiene sentido que pese en la carga de
 * todo el mundo. */
function cargarConvenciones() {
  if (state.convenciones !== undefined) return Promise.resolve(state.convenciones);
  state.convenciones = null;
  return fetch("batalla_de_flores/data/convenciones.json")
    .then(r => (r.ok ? r.json() : null))
    .then(d => { state.convenciones = d; if (state.selection?.kind === "about") renderAbout(); return d; })
    .catch(() => null);
}

/* Qué hemos tocado nosotros. Un archivo que dice de dónde viene cada dato tiene
 * que decir también en qué lo ha modificado: si no, la procedencia es media
 * verdad. Se genera de los propios datos, así que no se puede quedar vieja. */
function bloqueConvenciones() {
  const c = state.convenciones;
  if (!c) { cargarConvenciones(); return ""; }
  const pierden = (c.pliegues || []).filter(p => p.pierde_a_alguien);
  const normaliza = (c.pliegues || []).filter(p => !p.pierde_a_alguien);
  const suma = lista => lista.reduce((n, p) => n + p.carrozas, 0);
  const tabla = lista => `<table class="conv"><tbody>${lista.map(p => `
    <tr><td>${esc(p.de)}</td><td class="conv-flecha">→</td>
        <td><b>${esc(p.a)}</b></td><td class="conv-n">${p.carrozas}</td></tr>`).join("")}</tbody></table>`;

  return `
    <h3 class="section">Qué hemos decidido nosotros</h3>
    <p>Decir de dónde viene cada dato obliga a decir también <b>en qué lo hemos
    tocado</b>. Esto es esa lista, y se genera sola de los datos: no puede quedarse
    vieja.</p>

    <details class="proc-foto">
      <summary>Nombres de agrupación unificados
        <span class="proc-aviso">${suma(normaliza)} carrozas</span></summary>
      <p class="chart-note">El mismo grupo escrito de otra manera: se quita el prefijo
      legal o se unifica la grafía. No cambia quién firmó la carroza.</p>
      ${tabla(normaliza.slice(0, 24))}
    </details>

    ${pierden.length ? `<details class="proc-foto" open>
      <summary>Carrozas firmadas por varios de las que solo queda uno
        <span class="proc-aviso">${suma(pierden)} carrozas · sin decidir</span></summary>
      <p class="chart-note"><b>Esto no es unificar: es cambiar quién firmó la carroza.</b>
      Pasa porque el plegado de nombres es automático y se queda con el primero que
      encuentra. Cada una va marcada con <span class="review-mark">?</span> en su ficha.
      Está pendiente de revisar una a una.</p>
      ${tabla(pierden)}
    </details>` : ""}

    <details class="proc-foto">
      <summary>Cuando dos fuentes se contradicen
        <span class="proc-aviso">${(c.resueltas_por_autoridad || []).length} resueltas ·
        ${c.disputas_abiertas} abiertas</span></summary>
      <p class="chart-note">El nivel dice cómo llegó el dato; no dice quién está mejor
      situado para saberlo. Para eso manda el orden:
      <b>libro del Centenario</b> › <b>nota del Ayuntamiento</b> › <b>prensa de la
      época</b> › <b>archivo de batalladeflores.net</b> › <b>semilla del proyecto</b>.
      La versión que pierde <b>no se borra</b>: queda registrada con su fuente.</p>
      ${(c.resueltas_por_autoridad || []).length ? `<table class="conv"><tbody>
        ${c.resueltas_por_autoridad.map(r => `<tr>
          <td>${r.año} · ${esc(r.carroza)}</td><td class="conv-flecha">→</td>
          <td><b>${esc(r.puesto)}</b></td>
          <td class="conv-n">antes ${esc(r.descartado)}</td></tr>`).join("")}
      </tbody></table>` : ""}
    </details>`;
}

/* El enlace a batalladefloresdemo.netlify.app: escrito y listo, pero apagado
 * mientras esa página esté en pruebas. Recomendar un sitio es responder por él,
 * y no se recomienda algo que aún puede cambiar debajo. Se enciende poniendo
 * `true`, sin tocar nada más. */
const DEMO_EN_PRUEBAS = false;

function renderAbout() {
  // El texto ya no vive aquí: se escribe en `data/que_es_esto.md` y lo convierte
  // `scripts/build_que_es.py`. Estaba metido en una plantilla de JavaScript en
  // medio de este fichero, y editarlo era buscar el párrafo entre el código y
  // rezar por no romper una comilla. Un texto que da miedo tocar es un texto que
  // se queda viejo.
  //
  // Aquí solo se ponen los dos bloques que NO son prosa y que el Markdown no
  // puede escribir: la leyenda de colores y las convenciones editoriales.
  const texto = (state.about || "")
    .replace(":::colores:::", `
      <p class="legend-types">
        <span class="t-year">un año</span>
        <span class="t-group">un grupo</span>
        <span class="t-float">una carroza</span>
        <span class="t-route">un recorrido</span>
      </p>`)
    .replace(":::convenciones:::", bloqueConvenciones());

  els.detail.innerHTML = `
    <div class="detail-head">
      <h2 style="font-size:22px">¿Qué es esta página?</h2>
    </div>
    <div class="chips">${shareButton()}</div>
    <div class="about-texto">${texto}</div>`;
  els.detail.scrollTop = 0;
  activarMapasZoom();
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

/* De dónde sale cada cosa de una carroza. Son tres preguntas distintas y la
 * tercera es la que nadie suele responder:
 *
 *   - el dato (puesto, grupo): de qué fuente
 *   - la foto: de quién es
 *   - y por qué esa foto es de ESTA carroza, que a menudo es una inferencia
 *     nuestra a partir del nombre del fichero, no algo que diga la fuente.
 *
 * Va plegado: quien mira una carroza quiere ver la carroza. Quien duda, abre. */
const CLAIM_LABEL = {
  name: "Que desfiló",
  position: "El puesto", category: "La categoría", group_raw: "El grupo",
  points: "Los puntos", prize_costumes_rank: "El premio de vestidos",
  prize_art_rank: "El premio de arte", prize_international_rank: "El premio internacional",
};

/* Una línea por afirmación, no un cajón con todas.
 *
 * Antes ponía "El puesto y el grupo: A, B y C", que junta dos afirmaciones
 * distintas y tres fuentes sin decir cuál dijo qué. Ahora cada dato dice quién
 * lo sostiene, con su enlace, y si hay más de un origen independiente se marca:
 * dos páginas de la misma web no son dos fuentes, y eso hay que distinguirlo. */
function claimLines(entry) {
  const claims = entry.claims || {};
  const orden = ["name", "position", "category", "group_raw", "points",
                 "prize_costumes_rank", "prize_art_rank", "prize_international_rank"];
  const ordinal = new Set(["position", "prize_costumes_rank", "prize_art_rank", "prize_international_rank"]);
  const valor = campo => campo === "group_raw"
    ? (entry.group_raw || "")
    : campo === "name" ? `«${entry.name}»`
    : ordinal.has(campo) ? `${entry[campo]}.º` : String(entry[campo] ?? "");

  return orden.filter(campo => claims[campo] && entry[campo] != null).map(campo => {
    const claim = claims[campo];
    const quien = claim.fuentes.map(f => {
      const etiqueta = esc(SOURCE_LABEL[f.kind] || f.kind);
      return f.url
        ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${etiqueta} ↗</a>`
        : etiqueta;
    });
    const sello = claim.independientes >= 2
      ? ` <span class="tag corrobora" title="Lo dicen fuentes de procedencia distinta, que coinciden">${claim.independientes} orígenes ✓</span>`
      : "";
    const otras = (claim.disputa || []).map(d => `
      <br><small class="prov-disputa">Otra versión: <b>${esc(String(d.valor))}</b>, según
      ${joinEs(d.fuentes.map(f => esc(SOURCE_LABEL[f.kind] || f.kind)))}. Sin resolver.</small>`).join("");
    return `<li><b>${CLAIM_LABEL[campo] || campo}:</b>
      ${esc(valor(campo))} — ${joinEs(quien)}${sello}${otras}</li>`;
  }).join("");
}

function floatProvenance(entry) {
  const refs = entry.image_refs || [];
  const inferida = refs.some(r => r.asignada_por !== "fuente");
  const fuentes = (entry.source_type || "").split("+").filter(Boolean)
    .map(p => SOURCE_LABEL[p] || p);

  return `
    <details class="proc-foto"${inferida || state.abrirProcedencia ? " open" : ""}>
      <summary>De dónde sale todo esto${inferida
        ? ' <span class="proc-aviso">la foto está asignada por deducción</span>' : ""}</summary>
      <ul class="prov-list">
        ${claimLines(entry)}
        ${(entry.source_refs || []).filter(r => r.kind !== "press_history")
          .map(r => esc(r.cita)).filter(Boolean)
          .map(c => `<li class="prov-cita"><small>${c}</small></li>`).join("")}
        ${pressCitations(entry).length ? `<li><b>En la prensa de la época:</b>
          ${citationList(pressCitations(entry))}</li>` : ""}
        ${refs.length ? refs.map(r => `
          <li><b>La foto es de:</b> ${esc(r.origen)}.
            <br><small><b>Que sea de esta carroza</b>, ${r.por === "pagina"
              ? `lo dice su página: la publica en la ficha que dedica a esta carroza`
              : `lo dice el nombre del fichero: <code>${esc(r.evidencia || "")}</code>`}.
              ${r.por === "fichero" && r.asignada_por !== "fuente"
                ? " Esa asociación la deducimos nosotros de ese nombre." : ""}</small>
            ${r.pagina ? `<br><small><a href="${esc(r.pagina)}" target="_blank" rel="noopener">ver la página de origen ↗</a></small>` : ""}
            ${r.original ? `<br><small>Se sirve desde aquí una copia, para no cargarle el tráfico a
              su servidor. <a href="${esc(r.original)}" target="_blank" rel="noopener">ver el original ↗</a></small>` : ""}
          </li>`).join("")
        : entry.image_urls?.length
          ? "<li><b>La foto:</b> del archivo de batalladeflores.net.</li>"
          : ""}
      </ul>
    </details>`;
}

function renderFloatDetail(entry) {
  const edition = state.editions.find(item => item.year === entry.year);
  const prizes = prizeChips(entry);

  els.detail.innerHTML = `
    ${detailHead(esc(entry.name), { marca: reviewMark(entry),
      ids: { id: entry.id_carroza, completo: entry.id_completo } })}
    ${(entry.needs_review || []).length ? `<div class="review-box">
      <b>Dato sin aclarar</b>
      <ul>${entry.needs_review.map(reason => `<li>${esc(reason)}</li>`).join("")}</ul>
      ${pressCitations(entry).length ? `<p class="cite-head">Lo que dice la hemeroteca,
        palabra por palabra:</p>${citationList(pressCitations(entry))}` : ""}
      <p>Si sabes cuál es la versión buena, <button class="link t-float" type="button"
         id="open-report-from-float">cuéntanoslo</button>.</p>
    </div>` : ""}

    <dl class="facts">
      <div><dt>Año</dt><dd>
        <button class="link t-year" type="button" data-year="${entry.year}">${entry.year}</button>
      </dd></div>
      <div><dt>Grupo</dt><dd>${entry.group_canonical
        ? `<button class="link t-group" type="button" data-group="${esc(slugifyGroup(entry.group_canonical))}">${esc(entry.group_canonical)}</button>`
        : '<span class="muted-val">sin grupo</span>'}${fieldSources(entry, "group_raw")}</dd></div>
      <div><dt>Categoría</dt><dd>${entry.category
        ? `<button class="link t-float" type="button" data-category="${esc(entry.category)}">Categoría ${esc(entry.category)}</button>`
        : '<span class="muted-val">sin categoría</span>'}${fieldSources(entry, "category")}</dd></div>
      <div><dt>Puesto</dt><dd>${entry.position != null
        ? `<b>${entry.position}</b><span class="of-total"> de ${fieldSize(entry)}</span>`
        : '<span class="muted-val">no consta</span>'}${fieldSources(entry, "position")}</dd></div>
    </dl>

    ${prizes ? `<p class="span-note">${esc(prizes)}
      ${fieldSources(entry, "prize_costumes_rank")}${fieldSources(entry, "prize_art_rank")}
      ${fieldSources(entry, "points")}</p>` : ""}

    ${(entry.image_urls || []).length ? `
      <h3 class="section">Imágenes (${entry.image_urls.length})</h3>
      <div class="gallery gallery-big">
        ${entry.image_urls.map(url => `
          <figure class="shot">
            <button type="button" class="shot-btn" ${photoAttrs(entry, url)}
               title="${esc(entry.name)} (${entry.year})">
              <img src="${esc(thumbUrl(url))}" alt="${esc(entry.name)}" loading="lazy">
            </button>
            <figcaption>${photoCredit(entry, url)}</figcaption>
          </figure>`).join("")}
      </div>`
      : '<p class="empty">El archivo no conserva imágenes de esta carroza.</p>'}

    ${floatProvenance(entry)}

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
  activarMapasZoom();
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
/* Copa dibujada dentro del SVG, no el emoji: asi hereda el color de la
 * categoria. Sin pointer-events para no robarle el clic al punto. */
function trophyMark(cx, cy, cls) {
  return `<g class="trophy ${cls}" transform="translate(${(cx - 6).toFixed(1)} ${(cy - 20).toFixed(1)}) scale(0.75)"
    aria-hidden="true">
    <path d="M4 2h8v3a4 4 0 0 1-8 0V2z"/><path d="M2 3h2v2a2 2 0 0 1-2-2zM14 3h-2v2a2 2 0 0 0 2-2z"/>
    <path d="M7 9h2v3H7zM5 12h6v2H5z"/></g>`;
}

function chartGroupTimeline(entries) {
  const ranked = entries.filter(entry => entry.position != null);
  if (ranked.length < 2) return "";

  const from = Math.min(...ranked.map(e => e.year));
  const to = Math.max(...ranked.map(e => e.year));
  const worst = Math.max(...ranked.map(e => e.position));

  const width = 620;
  // Hueco extra arriba para que la copa del 1.er puesto no se salga.
  const topPad = CHART.padT + 16;
  const height = 34 + worst * 15 + CHART.padB + 16;
  const left = 30;
  const base = height - CHART.padB;
  const scale = makeScale({ from, to, width, left });
  const yOf = position => topPad + ((position - 1) / Math.max(worst - 1, 1)) * (base - topPad - 6);

  // Rejilla de puestos: 1.º arriba y el peor abajo, con los intermedios si caben.
  const levels = worst <= 8
    ? Array.from({ length: worst }, (_, i) => i + 1)
    : [1, 2, 3, Math.round(worst / 2), worst];
  const grid = levels.map(position => `
    <line class="axis-line" x1="${left}" y1="${yOf(position).toFixed(1)}" x2="${width - CHART.padR}" y2="${yOf(position).toFixed(1)}"/>
    <text class="axis-label" x="${left - 6}" y="${(yOf(position) + 3).toFixed(1)}" text-anchor="end">${position}.º</text>`).join("");

  // Los anos antiguos no tienen categoria porque el reglamento no las creo
  // hasta 2011. Se etiquetan diciendo eso, no con un guion ni con "sin
  // categoria", que se lee como si faltara el dato.
  const SIN_CAT = `hasta ${CATEGORIES_FROM - 1}`;
  const catOf = entry => entry.category || SIN_CAT;
  const catClass = category => category === SIN_CAT ? "none" : esc(category);
  const categories = [...new Set(ranked.map(catOf))].sort();

  // Un ano puede traer dos victorias, una por categoria. Se cuentan aqui para
  // repartir las copas en horizontal y que no se pisen.
  const winsByYear = new Map();
  ranked.filter(entry => entry.position === 1).forEach(entry => {
    if (!winsByYear.has(entry.year)) winsByYear.set(entry.year, []);
    const list = winsByYear.get(entry.year);
    if (!list.includes(catOf(entry))) list.push(catOf(entry));
  });
  winsByYear.forEach(list => list.sort());

  // La lista unica comparte color con A, asi que la ruptura de 2011 hay que
  // decirla explicitamente: una vertical discontinua donde cambio el reglamento.
  const splitYear = from < CATEGORIES_FROM && to >= CATEGORIES_FROM ? CATEGORIES_FROM : null;
  const split = splitYear ? `
    <line class="split-line" x1="${scale(splitYear).toFixed(1)}" y1="${topPad - 14}"
      x2="${scale(splitYear).toFixed(1)}" y2="${base}"/>
    <text class="split-label" x="${(scale(splitYear) - 4).toFixed(1)}" y="${topPad - 8}"
      text-anchor="end">${splitYear}</text>` : "";

  const lines = categories.map(category => {
    const points = ranked.filter(entry => catOf(entry) === category).sort((a, b) => a.year - b.year);
    const path = points.map((entry, index) =>
      `${index ? "L" : "M"}${scale(entry.year).toFixed(1)} ${yOf(entry.position).toFixed(1)}`).join("");
    const dots = points.map(entry => `
      <circle class="serie-dot" cx="${scale(entry.year).toFixed(1)}" cy="${yOf(entry.position).toFixed(1)}"
              r="${entry.position === 1 ? 4 : 3.2}" data-float="${esc(entry.id)}"
              data-tip="${esc(`${entry.year} · ${entry.category || ""}${entry.position}.º<b>${entry.name}</b>`)}"/>`).join("");
    // La copa va en su propia capa, encima de todas las lineas.
    const cups = points.filter(entry => entry.position === 1).map(entry => {
      const winners = winsByYear.get(entry.year) || [category];
      const index = Math.max(winners.indexOf(category), 0);
      const offset = (index - (winners.length - 1) / 2) * 13;
      return trophyMark(scale(entry.year) + offset, yOf(entry.position), `trophy-${catClass(category)}`);
    }).join("");
    return `<g class="serie serie-${catClass(category)}"><path class="serie-line" d="${path}"/>${dots}${cups}</g>`;
  }).join("");

  return `
    <h3 class="section">Su trayectoria</h3>
    <div class="chart-legend">${categories.filter(c => c !== SIN_CAT).map(c =>
      `<span><i class="key key-${catClass(c)}"></i>Categoría ${esc(c)}</span>`).join("")}
      ${splitYear ? `<span><i class="key key-split"></i>${CATEGORIES_FROM}: se crean A y B</span>` : ""}
      <span class="cup-key">${ICON_TROPHY}1.<sup>er</sup> puesto</span></div>
    ${categories.includes(SIN_CAT) ? `<p class="chart-note">Hasta ${CATEGORIES_FROM - 1} el palmarés
      era una lista única, que en <b>${CATEGORIES_FROM}</b> el reglamento municipal partió en dos
      según el tamaño de la carroza. Un puesto de antes se disputaba contra todas; uno de después,
      solo dentro de su categoría.</p>` : ""}
    <svg class="chart" viewBox="0 0 ${width} ${height}" role="img"
      aria-label="Evolución del puesto de ${esc(entries[0]?.group_canonical || "")} entre ${from} y ${to}">
      ${grid}
      ${yearAxis(scale, { from, to, height })}
      ${split}
      ${lines}
    </svg>`;
}

/* La mitad de los "grupos" son nombres de persona -"Ángel Sainz"-, y empezar
 * con "Desfiló entre..." dejaba la frase sin sujeto. Se antepone "El grupo",
 * salvo cuando el nombre ya es colectivo y quedaria "El grupo Grupo Pejino". */
const COLLECTIVE_START = /^(grupo|grupos|asoc|asociaci[oó]n|agrupaci[oó]n|agrupa|agrup|peña|pena|hnos|hermanos|hijos|colaboradores|amigos|vecinos|cofrad[ií]a|ayuntamiento|transportes|carrozas|gr\.)\b/i;

function groupSubject(name) {
  const limpio = esc(name);
  return COLLECTIVE_START.test(name) ? `<b>${limpio}</b>` : `El grupo <b>${limpio}</b>`;
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
    ${detailHead(esc(group.canonical_name),
      { ids: { id: group.id_grupo || "", completo: null } })}
    ${(() => {
      // Los otros nombres van DEBAJO de la frase que resume al grupo, y
      // plegados. Iban encima y a la vista: lo primero que leías de «El Cantu»
      // eran cuatro grafías distintas de su nombre, antes de saber cuántas
      // carrozas sacó. El aviso es importante —es una decisión NUESTRA juntar
      // esos nombres— pero es una nota al pie, no el titular.
      const otros = (group.aliases || []).filter(a => a !== group.canonical_name);
      const aviso = otros.length ? `<button class="alias-toggle" type="button"
        aria-expanded="false" aria-controls="alias-panel"
        title="Los otros nombres con los que aparece en las fuentes"
        >${otros.length} nombre${otros.length === 1 ? "" : "s"} más ▾</button>` : "";
      return `
    <p class="span-note">
      ${groupSubject(group.canonical_name)} desfiló
      entre <b>${group.first_year_seen}</b> y <b>${group.last_year_seen}</b>
      con <b>${num(group.float_count)}</b> carroza${group.float_count === 1 ? "" : "s"}${categories.length
        ? `, de las cuales ${categories.map(([cat, count]) =>
            `<b>${count}</b> en categoría ${esc(cat)}`).join(" y ")} (las categorías existen desde ${CATEGORIES_FROM})`
        : ""}. ${aviso}
    </p>
    ${otros.length ? `<p class="alias-note" id="alias-panel" hidden>También aparece en las
      fuentes como ${joinEs(otros.map(a => `<b>«${esc(a)}»</b>`))}. Aquí van juntos porque
      hemos decidido que son el mismo carrocista.</p>` : ""}`;
    })()}

    <div class="kpis">
      <div class="kpi"><span>${num(group.years.length)}</span><small>ediciones</small></div>
      <div class="kpi"><span>${num(group.float_count)}</span><small>carrozas</small></div>
      <div class="kpi"><span>${ICON_TROPHY}${num(group.wins)}</span><small>victorias</small></div>
      <div class="kpi"><span>${ICON_PODIUM}${num(podium)}</span><small title="Primer, segundo o tercer puesto">podios</small></div>
    </div>

    ${chartGroupTimeline(entries)}

    ${(() => {
      // La lista va ANTES que la galería, y con su miniatura, igual que el
      // palmarés de una edición. Antes se entraba a un carrocista y lo primero
      // eran cuarenta fotos sueltas: bonito, pero no se sabía qué carroza era
      // cuál ni de qué año. La tabla es la que responde eso.
      //
      // La galería se queda, al final: son las mismas fotos, pero mirar el
      // trabajo de un carrocista todo junto y en grande es otra cosa distinta
      // de leer su lista de años. Es redundante a propósito.
      const conFoto = entries.some(e => (e.image_urls || []).length);
      return `
    <h3 class="section">Carrozas</h3>
    <table class="palmares${conFoto ? " with-photo" : ""}">
      <colgroup>${conFoto ? '<col class="c-photo">' : ""}<col class="c-pos"><col><col class="c-pos"><col class="c-src"></colgroup>
      <thead><tr>
        ${conFoto ? '<th class="c-photo">Foto</th>' : ""}
        <th data-sort-type="num">Año</th>
        <th data-sort-type="text">Carroza</th>
        <th data-sort-type="text">Pos.</th>
        <th data-sort-type="text">Fuentes</th>
      </tr></thead>
      <tbody>
        ${entries.map(entry => `
          <tr>
            ${conFoto ? `<td class="c-photo">${(entry.image_urls || []).length
              ? `<button class="thumb" type="button" ${photoAttrs(entry, entry.image_urls[0])}
                   data-tip="${esc(`${entry.name} · ${entry.year}`)}"><img
                   src="${esc(thumbUrl(entry.image_urls[0]))}"
                   alt="${esc(entry.name)}" loading="lazy"></button>`
              : ""}</td>` : ""}
            <td class="pos" data-sort="${entry.year}"><button class="link t-year" type="button" data-year="${entry.year}">${entry.year}</button></td>
            <td class="name" data-sort="${esc(normalizeText(entry.name))}"><button
              class="link t-float" type="button" data-float="${esc(entry.id)}">${esc(entry.name)}</button>${reviewMark(entry)}</td>
            <td class="pos" data-sort="${esc(positionSortKey(entry))}">${entry.category ? esc(entry.category) : ""}${entry.position != null ? `${entry.position}.º` : "–"}</td>
            <td data-sort="${esc(sourceShort(entry.source_type))}">${sourceCell(entry)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
    })()}

    ${renderGallery(entries)}

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
  activarMapasZoom();
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

    ${route.geometry ? `<div id="mapa-recorrido" class="mapa-montaje"
      data-route="${esc(route.id)}"
      aria-label="Mapa del recorrido: ${esc(route.label)}"></div>
      <p class="chart-note mapa-pie">Mapa real, con calles y comercios: puedes ampliar, moverlo y
      situarte con <b>◎</b>. El punto verde marca dónde arranca el trazado${
        route.direction === "anticlockwise" ? ", que se recorre en sentido antihorario" : ""}.</p>` : ""}
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
  activarMapasZoom();
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

const ICON_FLAG = `<svg class="pill-icon" viewBox="0 0 16 16" aria-hidden="true">
  <path d="M3.4 1.6v13" stroke-width="1.6" fill="none"/>
  <path d="M4.6 2.6h8l-1.8 2.9 1.8 2.9h-8z"/></svg>`;

function shareButton() {
  return `<button id="share" class="share" type="button" title="Compartir esta ficha">${ICON_SHARE}Compartir</button>
    <button id="report-open" class="share" type="button" title="Avisar de un dato incorrecto">${ICON_FLAG}¿Algo mal?</button>`;
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

function activarMapasZoom() {
  document.querySelectorAll("#detail svg.zoomable").forEach(makeZoomable);
  const nm = state.dataset.noche_magica;
  if (nm && document.getElementById("mapa-montaje")) pintarMapaMontaje(nm);
  pintarMapaRecorrido();
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

/* ── corregir un dato ───────────────────────────────────────────────────── */

/* Mismo patrón que frontones: un Apps Script de Google recibe el POST y escribe
 * en una hoja. `no-cors` impide leer la respuesta, así que se da por enviado si
 * el fetch no revienta. Sin endpoint el botón avisa en vez de fallar callando. */
const REPORT_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxwXjxQaL4d9X67HJv3f17mR2ctchtxfpg0JCj054XK5jiViPybpD-XY-H3qSIxloOSXA/exec";

/* La foto va en base64 dentro del formulario. Antes se reduce en el navegador:
 * una foto de móvil son 3-5 MB y Apps Script no traga esos POST. */
const PHOTO_MAX_SIDE = 1600;
const PHOTO_QUALITY = 0.82;
let reportPhoto = null;

function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const scale = Math.min(1, PHOTO_MAX_SIDE / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function reportContext() {
  const selection = state.selection;
  const heading = document.querySelector("#detail h2")?.textContent?.trim() || "";
  if (!selection) return { label: "La página en general", id: "" };
  const kinds = { year: "Edición", group: "Grupo", route: "Recorrido", float: "Carroza", about: "Página" };
  return { label: `${kinds[selection.kind] || ""} ${heading}`.trim(), id: `${selection.kind}:${selection.id}` };
}

function openReport(override) {
  const context = override || reportContext();
  document.getElementById("report-ctx").textContent = `Sobre: ${context.label}`;
  document.getElementById("report-ficha").value = context.id;
  document.getElementById("report-url").value = location.href;
  document.getElementById("report-msg").textContent = "";
  document.getElementById("report-back").hidden = false;
  document.querySelector("#report-form [name=nombre]").focus();
  track("corregir/abrir", "Abrir corrección", true);
}

function closeReport() {
  document.getElementById("report-back").hidden = true;
}

function setupReport() {
  const form = document.getElementById("report-form");
  const note = document.getElementById("report-file-note");

  document.getElementById("report-close").addEventListener("click", closeReport);
  document.getElementById("report-back").addEventListener("click", event => {
    if (event.target.id === "report-back") closeReport();
  });

  document.getElementById("report-file").addEventListener("change", async event => {
    const file = event.target.files[0];
    reportPhoto = null;
    if (!file) { note.textContent = ""; return; }
    note.textContent = "Preparando la imagen…";
    try {
      reportPhoto = await shrinkPhoto(file);
      note.textContent = `${file.name} · ${Math.round(reportPhoto.length / 1400)} KB tras reducir`;
    } catch {
      note.textContent = "No he podido leer esa imagen.";
    }
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const message = document.getElementById("report-msg");
    const send = document.getElementById("report-send");

    if (!REPORT_ENDPOINT) {
      message.textContent = "El formulario todavía no está conectado.";
      return;
    }

    const data = new URLSearchParams(new FormData(form));
    data.set("proyecto", "batalla_de_flores");
    data.set("version", state.dataset?.version || "");
    if (reportPhoto) data.set("foto", reportPhoto);

    send.disabled = true;
    message.textContent = "Enviando…";
    try {
      await fetch(REPORT_ENDPOINT, { method: "POST", mode: "no-cors", body: data });
      message.textContent = "¡Gracias! Lo reviso y, si encaja, lo incorporo. 🙌";
      track("corregir/enviado", "Corrección enviada", true);
      form.reset();
      reportPhoto = null;
      note.textContent = "";
      setTimeout(closeReport, 1800);
    } catch {
      message.textContent = "No se ha podido enviar. Inténtalo más tarde.";
    } finally {
      send.disabled = false;
    }
  });
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
  const previa = state.selection;
  state.selection = { kind, id };
  // Hay ficha abierta: en el PC eso es lo que enciende la cruz de cerrar.
  document.body.classList.add("hay-ficha");
  // En movil el detalle se superpone al indice; en escritorio no hace nada.
  if (reveal && isNarrow()) document.body.classList.add("detail-open");
  if (updateHash) {
    const prefix = { year: "y", group: "g", route: "r", float: "c", about: "info" }[kind];
    // CADA ficha nueva apila su entrada, tambien al saltar de ficha a ficha.
    // Estuvo aplanado —una sola entrada por sesion de fichas— para poder
    // escapar de la web en dos pulsaciones, y en la calle se vio lo contrario:
    // la gente mayor navega SOLO con el boton atras, esperaba volver a la
    // ficha anterior, y en dos pulsaciones estaba fuera de la web sin boton de
    // adelante que la rescatara. Atras tiene que deshacer el ultimo paso, no
    // expulsar. Solo re-seleccionar la misma ficha reemplaza, para no apilar
    // duplicados.
    const same = previa && previa.kind === kind && previa.id === id;
    const method = same ? "replaceState" : "pushState";
    history[method](null, "", `#/${prefix}/${id}`);
    if (method === "pushState") state.historialPropio = true;
    track(location.pathname + location.hash, `${kind}: ${id}`);
  }
  renderIndex();
  renderDetail();
}

function readHash() {
  if (location.hash === "#/info/-") return { kind: "about", id: "-" };
  // La pestaña Pendiente es compartible: es la parte que uno quiere mandarle a
  // un carrocista, y sin URL propia no habia forma de enlazarla.
  if (location.hash === "#/pendiente") return null;
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
  // El filtro de categoría es de la pestaña de Carrozas y solo actúa ahí, pero
  // su aviso vive en la barra de esa pestaña — que se vacía al cambiar de
  // pestaña. Resultado: salías a Ediciones, volvías, y veías 97 carrozas de 585
  // sin nada en pantalla que dijera por qué. Un filtro activo e invisible es
  // peor que no tener filtro.
  //
  // Se va con la pestaña. Si un día hace falta que sobreviva, tendrá que subir
  // a la barra de filtros de arriba, que sí se ve siempre.
  if (mode !== "floats" && state.category) {
    state.category = null;
  }
  state.mode = mode;
  if (mode === "pending" && !state.selection) {
    history.replaceState(null, "", `${location.pathname}#/pendiente`);
  } else if (location.hash === "#/pendiente") {
    history.replaceState(null, "", location.pathname);
  }
  els.tabs.forEach(tab => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  renderIndex();
}

function refresh() {
  renderNocheMagica();
  applyFilters();
  renderIndex();
}

function latestRankedEdition() {
  return [...state.editions].reverse().find(edition => (edition.result_count || 0) > 0) || null;
}

/* Cerrar la capa tiene que deshacer la seleccion entera, no solo taparla: si
 * solo se ocultaba, el ano seguia marcado en la rejilla y la URL seguia
 * apuntando a el, asi que recargar o compartir devolvia a la ficha cerrada. */
/* Cierre "logico": limpia el estado sin tocar el historial. Lo usa popstate,
 * donde el navegador ya ha retrocedido por su cuenta. */
function clearSelection() {
  document.body.classList.remove("detail-open");
  document.body.classList.remove("hay-ficha");
  state.selection = null;
  renderIndex();
  renderDetail();
}

function closeDetail() {
  if (!state.selection) return;
  // La X hace lo mismo que el boton atras: deshacer el ultimo paso. Antes
  // habia una memoria propia de un salto (vengoDe); con el historial apilado
  // de verdad sobra, y tener dos memorias del mismo camino es tener dos
  // versiones que un dia discrepan.
  //
  // Pero si se ha entrado DIRECTO a un enlace con # -del historial del
  // navegador, de WhatsApp, de un marcador- no hay nada detrás y `back()` saca
  // de la web: cerrar una ficha no puede echarte del sitio. En ese caso se
  // limpia el hash y se aterriza en el índice, que es de donde se habría
  // venido de haber venido de algún sitio.
  if (location.hash && state.historialPropio) {
    history.back();
    return;
  }
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  clearSelection();
}

function resetToStart() {
  state.query = ""; state.decade = "all"; state.winnersOnly = false; state.category = null;
  els.search.value = ""; els.decade.value = "all";
  state.sort = { groups: { key: "wins", dir: -1 }, floats: { key: "year", dir: -1 } };
  state.openDecade = null;
  clearSelection();
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
  els.clearFilters.addEventListener("click", () => {
    state.query = ""; state.decade = "all"; state.winnersOnly = false;
    state.category = null;
    els.search.value = ""; els.decade.value = "all";
    refresh();
  });

  els.tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));

  // Una fila con role="button" no responde sola al teclado: hay que dárselo.
  document.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const fila = event.target.closest?.('[role="button"][data-float]');
    if (!fila || event.target.closest("a")) return;
    event.preventDefault();
    select("float", fila.dataset.float);
  });

  els.indexTools.addEventListener("click", event => {
    if (event.target.closest("[data-winners]")) {
      state.winnersOnly = !state.winnersOnly;
      renderFloatList();
    }
  });

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
    // Volver al inicio lo pide una persona, asi que el titulo se vuelve a
    // desplegar aunque ya se haya visto en esta carga.
    desplegarTitulo({ reiniciando: true });
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

    const alias = event.target.closest(".alias-toggle");
    if (alias) {
      const panel = document.getElementById("alias-panel");
      const abierto = alias.getAttribute("aria-expanded") === "true";
      alias.setAttribute("aria-expanded", String(!abierto));
      // La flecha gira con el estado: es la única señal de que hay algo debajo.
      alias.textContent = alias.textContent.replace(abierto ? "▴" : "▾", abierto ? "▾" : "▴");
      if (panel) panel.hidden = abierto;
      return;
    }

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

      if (event.target.closest("[data-goto-pending]")) { setMode("pending"); return; }

    const fichaVisor = event.target.closest("[data-lb-ficha]");
    if (fichaVisor) {
      cerrarVisor();
      select("float", fichaVisor.dataset.lbFicha);
      return;
    }

  const foto = event.target.closest("[data-photo]");
    if (foto) { abrirVisor(foto); return; }

    if (event.target.closest("#share-pending")) {
      shareUrl(`${location.origin}${location.pathname}#/pendiente`,
        "Batalla de Flores de Laredo · lo que queda por resolver",
        "Datos que faltan o no cuadran en el archivo de la Batalla de Flores de Laredo. Si conoces alguno, se agradece.",
        event.target.closest("#share-pending"));
      return;
    }
    if (event.target.closest("#share")) { shareCurrent(); return; }
    if (event.target.closest("#report-open")) { openReport(); return; }

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
      // En móvil la ficha se superpone al índice: al filtrar desde ella, el
      // resultado quedaba detrás y no se veía nada. Se cierra para que se vea
      // lo que acabas de pedir.
      if (state.category && isNarrow()) document.body.classList.remove("detail-open");
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

    const compartirSitio = event.target.closest("[data-share-sitio]");
    if (compartirSitio) {
      const nm = state.dataset.noche_magica;
      const sitio = nm?.sitios.find(x => x.id === compartirSitio.dataset.shareSitio);
      if (sitio) {
        const grupos = nm.grupos.filter(g => g.sitio === sitio.id).map(g => g.grupo).join(" y ");
        shareUrl(comoLlegar(sitio), `Noche Mágica · ${sitio.nombre}`,
          `Aquí montan ${grupos} sus carrozas para la Batalla de Flores.`, compartirSitio);
      }
      return;
    }

    const nmIr = event.target.closest(".nm-ir");
    if (nmIr) { setMode("editions"); select("year", Number(nmIr.dataset.year)); return; }

    const ask = event.target.closest("[data-ask]");
    if (ask) {
      openReport({ id: ask.dataset.ask, label: ask.dataset.askLabel });
      return;
    }
    if (event.target.closest("#open-report-from-stats, #open-report-from-float, #open-report-from-edition")) { openReport(); return; }

    const zoomCarreras = event.target.closest("[data-carreras-zoom]");
    if (zoomCarreras) {
      const que = zoomCarreras.dataset.carrerasZoom;
      const factor = que === "in" ? CARRERAS.paso : que === "out" ? 1 / CARRERAS.paso : 0;
      state.carrerasZoom = que === "fit" ? 1
        : Math.min(CARRERAS.zoomMax, Math.max(CARRERAS.zoomMin, state.carrerasZoom * factor));
      // Se repinta solo el grafico, no la pestana entera: repintarla mandaria la
      // pagina de vuelta arriba y perderia el tramo que se estaba mirando.
      pintarCarreras();
      return;
    }

    const statsZoom = event.target.closest("[data-stats-zoom]");
    if (statsZoom) {
      state.statsZoom = Number(statsZoom.dataset.statsZoom);
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

    // Antes que nada: un chip de fuente se explica y no lleva a ningún sitio.
    // Va aquí arriba porque en la lista de carrozas la fila entera es un botón,
    // y sin esto el clic se le escaparía a la fila y abriría la ficha igual.
    const chip = event.target.closest(".tag-src");
    if (chip) {
      event.stopPropagation();
      mostrarTipEn(chip);
      return;
    }

    const target = event.target.closest("[data-year], [data-group], [data-route], [data-float]");
    if (!target) return;
    // Abrir una ficha NO cambia de pestaña: el indice es donde estas mirando y
    // el detalle lo que miras. Antes saltaba de modo, y al cerrar la capa te
    // encontrabas en otro sitio del que habias salido.
    if (target.dataset.year) select("year", Number(target.dataset.year));
    else if (target.dataset.group) select("group", target.dataset.group);
    else if (target.dataset.route) select("route", target.dataset.route);
    else if (target.dataset.float) {
      state.abrirProcedencia = Boolean(target.dataset.prov);
      select("float", target.dataset.float);
      state.abrirProcedencia = false;
    }
  });

  // popstate cubre el boton atras del navegador y el gesto de deslizar del
  // movil. Sin hash es que hemos vuelto al indice: se cierra la ficha.
  window.addEventListener("popstate", () => {
    const selection = readHash();
    if (selection) select(selection.kind, selection.id, { updateHash: false });
    else clearSelection();
  });
}

/* ── arranque ───────────────────────────────────────────────────────────── */

/* «no-cache» no es «no guardes»: es «pregunta antes de servir lo guardado».
 * El JSON no lleva ?v= en la direccion como la CSS y el JS, asi que un
 * navegador que ya lo tenia seguia enseñando la version vieja mucho
 * despues de desplegar: la barra decia v2.47 con v2.49 publicado. Al
 * revalidar, si no ha cambiado el servidor responde 304 sin cuerpo y no
 * cuesta nada; si ha cambiado, llega el nuevo. */
fetch("batalla_de_flores/data/batalla_de_flores.json", { cache: "no-cache" })
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

    // El texto de «¿Qué es esta página?» va en su propio fichero para poder
    // editarse sin tocar código. Se pide aparte y sin bloquear: si no llega, la
    // web funciona igual y solo esa ficha sale vacía.
    fetch(`batalla_de_flores/data/que_es_esto.json?v=${encodeURIComponent(dataset.version || "")}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        state.about = d.html || "";
        if (state.selection && state.selection.kind === "about") renderDetail();
      })
      .catch(() => { /* sin texto, pero la web entera no se cae por esto */ });

    renderStats();
    renderFilterOptions();
    bindEvents();
    setupTooltip();
    setupReport();
    setupVisor();
  frenarZoomAlEnfocar();
  setupCarreras();
  setupDivisor();
  setupZoomGaleria();
  setupColumnasAjustables();
    applyFilters();
    renderNocheMagica();

    const fromHash = readHash();
    if (location.hash === "#/pendiente") {
      setMode("pending");
      renderDetail();
    } else if (fromHash) {
      if (fromHash.kind === "group") setMode("groups");
      if (fromHash.kind === "route") setMode("routes");
      if (fromHash.kind === "float") setMode("floats");
      select(fromHash.kind, fromHash.id, { updateHash: false });
    } else {
      // De salida se abre la ultima edicion con carrozas. Estuvo al reves
      // —sin seleccion, para invitar a pinchar la rejilla— hasta la Batalla
      // de 2026: recien celebrada, lo que la gente viene a ver ES la ultima
      // edicion, y que la portada la ensene sola vale mas que la invitacion.
      // Es la ultima CON carrozas, no el ano mas alto: asi en junio de 2027,
      // con la edicion nueva aun vacia, seguira abriendo 2026.
      //
      // SOLO en pantalla ancha: ahi la ficha se abre AL LADO de la rejilla y
      // suma. En el movil los paneles van en columna y la ficha abierta
      // sepulta la entrada normal de la web; ahi manda la rejilla.
      const ultima = !NARROW.matches
        && [...state.editions].reverse().find(e => (e.floats || []).length);
      if (ultima) {
        select("year", ultima.year, { updateHash: false });
      } else {
        renderIndex();
        renderDetail();
      }
    }
  })
  .catch(error => {
    els.detail.innerHTML = `<p class="empty">No he podido cargar el dataset (${esc(error.message)}).</p>`;
  });

/* El plano viaja aparte (~170 KB) y no bloquea nada: hasta que llega, los mapas
 * se pintan solo con los recorridos y al llegar se repinta lo que haya en
 * pantalla. Si falla, el archivo sigue funcionando entero. */
fetch("batalla_de_flores/data/map.json", { cache: "no-cache" })
  .then(response => (response.ok ? response.json() : null))
  .then(map => {
    if (!map) return;
    state.map = map;
    if (state.selection) renderDetail();
    if (state.mode === "routes") renderIndex();
  })
  .catch(() => {});

/* El titulo de bienvenida se despliega: arranca escrito como el dominio,
 * «Batalladedatos», y se abre a «Batalla de Flores de Laredo en datos».
 *
 * Quien decide SI se anima es el script en linea del HTML, no esto: tiene que
 * decidirse antes del primer fotograma, y app.js se carga al final del body.
 * Aqui solo se lleva el compas, y solo si aquel dejo puesta la clase.
 *
 * Las duraciones viven aqui y no en la CSS para no tenerlas escritas en dos
 * sitios: se pasan como variables, y la CSS trae los mismos numeros de
 * respaldo por si esto no llegara a correr. */
function desplegarTitulo({ reiniciando = false } = {}) {
  const h1 = document.getElementById("titulo");
  if (!h1) return;
  // Al arrancar, quien decide es el script en linea del HTML: si no puso la
  // clase —movimiento reducido— aqui no se fuerza. Al pinchar el logo si,
  // porque entonces lo ha pedido una persona.
  if (!reiniciando && !h1.classList.contains("anim")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  (desplegarTitulo.relojes || []).forEach(clearTimeout);
  desplegarTitulo.relojes = [];
  const luego = (fn, ms) => desplegarTitulo.relojes.push(setTimeout(fn, ms));

  const ESPERA = 1500;   // cuanto se lee «Batalladedatos» antes de abrirse
  const HUECO  = 700;    // lo que tardan los espacios en abrirse
  const ENTRE  = 700;    // del arranque al primer compas de letras
  const COMPAS = 900;    // lo que separa un compas del siguiente
  const LETRA  = 65;     // lo que separa una letra de la siguiente

  const huecos = [...h1.querySelectorAll(".hueco")];
  const brotes = [...h1.querySelectorAll(".brote")];

  // La unidad de la animacion es la letra entera: la primera vez, cada texto
  // de los brotes se trocea en un span por caracter, conservando los spans
  // interiores (.of, .years) para no perder su estilo. Una letra escondida
  // es display:none —no ocupa nada—, asi que nunca hay media letra cortada.
  if (!desplegarTitulo.troceado) {
    desplegarTitulo.troceado = true;
    const trocear = nodo => {
      [...nodo.childNodes].forEach(hijo => {
        if (hijo.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of hijo.textContent) {
            const s = document.createElement("span");
            s.className = "ch";
            s.textContent = ch;
            frag.appendChild(s);
          }
          nodo.replaceChild(frag, hijo);
        } else {
          trocear(hijo);
        }
      });
    };
    brotes.forEach(brote => { trocear(brote); brote.classList.add("letras"); });
  }
  const letras = brotes.map(brote => [...brote.querySelectorAll(".ch")]);

  // Estado de salida: huecos cerrados y todas las letras escondidas. Se mide
  // el ancho natural de los huecos con la clase quitada, porque un max-width
  // en «auto» no se puede animar; quitar y reponer la clase en el mismo
  // bloque no llega a pintarse, asi que no parpadea.
  h1.className = "";
  huecos.forEach(nodo => { nodo.style.maxWidth = ""; });
  letras.flat().forEach(ch => { ch.classList.add("oculta"); ch.classList.remove("entrando"); });
  const anchoHueco = huecos.map(nodo => nodo.scrollWidth);
  h1.className = "anim";
  h1.style.setProperty("--t-hueco", HUECO + "ms");
  void h1.offsetWidth;

  // 1 · se abren los espacios: Batalladedatos -> Batalla de datos
  luego(() => {
    huecos.forEach((nodo, i) => { nodo.style.maxWidth = anchoHueco[i] + "px"; });
  }, ESPERA);

  // 2, 3, 4 · las letras entran por compases —primero «Flores» y «en», luego
  // «de Laredo», al final los anos— y dentro de cada compas van una a una,
  // enteras, entrando con un pelin de desenfoque.
  [2, 3, 4].forEach((paso, orden) => {
    luego(() => {
      brotes.forEach((brote, b) => {
        if (brote.dataset.paso !== String(paso)) return;
        letras[b].forEach((ch, i) => {
          luego(() => {
            ch.classList.remove("oculta");
            ch.classList.add("entrando");
            void ch.offsetWidth;
            ch.classList.remove("entrando");
          }, i * LETRA);
        });
      });
    }, ESPERA + ENTRE + orden * COMPAS);
  });
}

desplegarTitulo();
