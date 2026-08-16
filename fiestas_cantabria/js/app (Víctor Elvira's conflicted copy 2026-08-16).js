/* Fiestas de pueblo de Cantabria — lógica de la aplicación */

const TIPOS = {
  carnaval:     { label: "Carnaval",     color: getVar("--t-carnaval") },
  romeria:      { label: "Romería",      color: getVar("--t-romeria") },
  gastronomica: { label: "Gastronómica", color: getVar("--t-gastronomica") },
  historica:    { label: "Histórica",    color: getVar("--t-historica") },
  floral:       { label: "Floral",       color: getVar("--t-floral") },
  religiosa:    { label: "Religiosa",    color: getVar("--t-religiosa") },
  patronal:     { label: "Patronal",     color: getVar("--t-patronal") }
};

function getVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
}

// --- Utilidades de fecha ---------------------------------------------
function fmtISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const HOY = new Date(); HOY.setHours(0, 0, 0, 0);
const HOY_ISO = fmtISO(HOY);

// fin de semana de referencia (próximo sábado-domingo, o el actual)
function findeRange() {
  const d = new Date(HOY);
  const dow = d.getDay();                 // 0 dom .. 6 sáb
  const diasHastaSab = (6 - dow + 7) % 7; // 0 si hoy es sábado
  const sab = new Date(d); sab.setDate(d.getDate() + diasHastaSab);
  const dom = new Date(sab); dom.setDate(sab.getDate() + 1);
  // si hoy es domingo, el "finde" es hoy mismo
  const ini = dow === 0 ? d : sab;
  return { sat: fmtISO(ini), sun: fmtISO(dom) };
}
const FINDE = findeRange();

// --- Mapa -------------------------------------------------------------
const map = L.map("map", { scrollWheelZoom: true }).setView([43.25, -4.03], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const markers = new Map(); // id -> marker

function iconoTipo(tipo) {
  const color = (TIPOS[tipo] || {}).color || "#888";
  return L.divIcon({
    className: "marker-pin",
    html: `<div style="background:${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

const pinStyle = document.createElement("style");
pinStyle.textContent = `
  .marker-pin div {
    width: 20px; height: 20px; border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg); border: 2px solid #fff;
    box-shadow: 0 1px 4px rgba(0,0,0,.4);
  }`;
document.head.appendChild(pinStyle);

// --- Estado y elementos ----------------------------------------------
const $lista = document.getElementById("lista");
const $buscar = document.getElementById("buscar");
const $tipo = document.getElementById("filtro-tipo");
const $orden = document.getElementById("orden");
const $desde = document.getElementById("desde");
const $hasta = document.getElementById("hasta");
const $mapa = document.getElementById("filtro-mapa");
const $contador = document.getElementById("contador");
const $detalle = document.getElementById("detalle");
const $detalleCont = document.getElementById("detalle-contenido");
const $overlay = document.getElementById("overlay");

let ignoreDate = false;   // "Todas" desactiva el filtro de fecha
let _arr = [];            // último conjunto que pasa filtros no espaciales

FIESTAS.forEach((f, i) => f._id = i);

// por defecto arranca en hoy, pero se permite elegir cualquier fecha (también pasada)
$desde.value = HOY_ISO;

// --- Marcadores (se crean una vez) -----------------------------------
FIESTAS.forEach(f => {
  const m = L.marker([f.lat, f.lng], { icon: iconoTipo(f.tipo) });
  m.bindPopup(popupHTML(f));
  m.on("popupopen", () => {
    const link = document.querySelector(".popup-link[data-id='" + f._id + "']");
    if (link) link.onclick = () => abrirDetalle(f);
  });
  markers.set(f._id, m);
});

function popupHTML(f) {
  const t = TIPOS[f.tipo] || { label: f.tipo };
  return `<b>${f.nombre}</b><br>📍 ${f.pueblo}${f.municipio && f.municipio !== f.pueblo ? " · " + f.municipio : ""}<br>
    🗓 ${f.fecha}<br><span style="color:${t.color}">● ${t.label}</span>
    <br><span class="popup-link" data-id="${f._id}">Ver detalle →</span>`;
}

// --- Filtros ----------------------------------------------------------
function esEsteFinde(f) {
  if (!f.inicio) return false;
  return f.fin >= FINDE.sat && f.inicio <= FINDE.sun;
}

function pasaFecha(f) {
  if (ignoreDate) return true;
  if (!f.inicio) return true; // sin fecha conocida → no se filtra fuera
  const winStart = $desde.value || "0000-01-01";  // se permite cualquier fecha, también pasada
  const winEnd = $hasta.value || "9999-12-31";
  const fFin = f.fin || f.inicio;
  return fFin >= winStart && f.inicio <= winEnd;
}

function pasaNoEspacial(f) {
  const q = $buscar.value.trim().toLowerCase();
  const tipo = $tipo.value;
  if (tipo && f.tipo !== tipo) return false;
  if (!pasaFecha(f)) return false;
  if (q) {
    const txt = (f.nombre + " " + f.pueblo + " " + f.municipio + " " + (f.comarca || "")).toLowerCase();
    if (!txt.includes(q)) return false;
  }
  return true;
}

function inBounds(f) {
  return map.getBounds().contains([f.lat, f.lng]);
}

function sortKey(f) {
  return f.inicio || `2026-${String(f.mes).padStart(2, "0")}-01`;
}

// duración en días (1 = un solo día)
function durDias(f) {
  if (!f.inicio) return 999;
  const a = new Date(f.inicio), b = new Date(f.fin || f.inicio);
  return Math.round((b - a) / 86400000) + 1;
}

function ordenar(list) {
  const modo = $orden.value;
  if (modo === "fin") {
    list.sort((a, b) => (a.fin || a.inicio || "").localeCompare(b.fin || b.inicio || "") || a.nombre.localeCompare(b.nombre));
  } else if (modo === "inicio") {
    list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)) || a.nombre.localeCompare(b.nombre));
  } else { // "cortas": duración ascendente, luego por fecha de inicio
    list.sort((a, b) => durDias(a) - durDias(b) || sortKey(a).localeCompare(sortKey(b)));
  }
  return list;
}

// --- Render -----------------------------------------------------------
function aplicarFiltros() {
  _arr = FIESTAS.filter(pasaNoEspacial);
  const visibles = new Set(_arr.map(f => f._id));
  markers.forEach((m, id) => {
    if (visibles.has(id)) { if (!map.hasLayer(m)) m.addTo(map); }
    else if (map.hasLayer(m)) map.removeLayer(m);
  });
  renderLista();
}

function renderLista() {
  let list = _arr.slice();
  // solo filtramos por zona si el mapa está visible y con tamaño (evita 0 al arrancar oculto en móvil)
  const mapaVisible = map.getSize().x > 0 && map.getSize().y > 0;
  if ($mapa.checked && mapaVisible) list = list.filter(inBounds);
  ordenar(list);

  $contador.textContent = list.length;
  $lista.innerHTML = "";

  if (list.length === 0) {
    const msg = $mapa.checked
      ? "No hay fiestas en esta zona del mapa con estos filtros. Aleja el mapa o desmarca «solo zona visible»."
      : "Sin resultados con estos filtros.";
    $lista.innerHTML = `<li class="vacio">${msg}</li>`;
    return;
  }

  list.forEach(f => {
    const t = TIPOS[f.tipo] || { label: f.tipo, color: "#888" };
    const li = document.createElement("li");
    li.className = "card";
    li.style.borderLeftColor = t.color;
    li.dataset.id = f._id;
    li.innerHTML = `
      <h3>${f.nombre}</h3>
      <div class="meta">
        <span class="pueblo">${f.pueblo}</span>
        <span class="fecha">${f.fecha}</span>
        <span class="dur">${durDias(f)} día${durDias(f) !== 1 ? "s" : ""}</span>
      </div>
      <div class="card-badges">
        <span class="badge" style="background:${t.color}">${t.label}</span>
        ${f.interes ? `<span class="badge badge-interes">Interés ${f.interes}</span>` : ""}
        ${esEsteFinde(f) ? `<span class="hoy-flag">¡Este finde!</span>` : ""}
      </div>`;
    li.onclick = () => {
      marcarActiva(f._id);
      abrirDetalle(f);
      map.flyTo([f.lat, f.lng], 12, { duration: .6 });
    };
    $lista.appendChild(li);
  });
}

function marcarActiva(id) {
  document.querySelectorAll(".card").forEach(c =>
    c.classList.toggle("activa", c.dataset.id == id));
}

// --- Panel de detalle -------------------------------------------------
function abrirDetalle(f) {
  const t = TIPOS[f.tipo] || { label: f.tipo, color: "#888" };
  let html = `
    <div class="d-badges">
      <span class="badge" style="background:${t.color}">${t.label}</span>
      ${f.interes ? `<span class="badge badge-interes">Interés Turístico ${f.interes}</span>` : ""}
      ${esEsteFinde(f) ? `<span class="hoy-flag">¡Este finde!</span>` : ""}
    </div>
    <h2>${f.nombre}</h2>
    <div class="d-meta">📍 <strong>${f.pueblo}</strong>${f.municipio && f.municipio !== f.pueblo ? " · " + f.municipio : ""}${f.comarca ? " (" + f.comarca + ")" : ""}</div>
    <div class="d-meta">🗓 ${f.fecha}</div>
    <p class="d-desc">${f.descripcion || ""}</p>`;

  if (f.programa && f.programa.length) {
    html += `<div class="programa"><h3>Programa</h3>`;
    let diaActual = null;
    f.programa.forEach(p => {
      if (p.dia !== diaActual) {
        diaActual = p.dia;
        html += `<div class="prog-dia">${p.dia}</div>`;
      }
      html += `<div class="prog-item">
        <span class="prog-hora">${p.hora || "—"}</span>
        <span class="prog-evento">${p.evento}${p.lugar ? `<span class="prog-lugar">${p.lugar}</span>` : ""}</span>
      </div>`;
    });
    html += `</div>`;
  }

  if (f.fuente) {
    html += `<p class="d-fuente">Fuente: <a href="${f.fuente}" target="_blank" rel="noopener">${new URL(f.fuente).hostname}</a></p>`;
  }

  $detalleCont.innerHTML = html;
  $detalle.hidden = false;
  $overlay.hidden = false;
}

function cerrarDetalle() {
  $detalle.hidden = true;
  $overlay.hidden = true;
}
document.getElementById("cerrar-detalle").onclick = cerrarDetalle;
$overlay.onclick = cerrarDetalle;
document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarDetalle(); });

// --- Eventos de filtros ----------------------------------------------
$buscar.addEventListener("input", aplicarFiltros);
$tipo.addEventListener("change", aplicarFiltros);
$orden.addEventListener("change", renderLista);

function onFechaManual() {
  ignoreDate = false;
  $hasta.min = $desde.value || HOY_ISO;
  actualizarChips(null);
  aplicarFiltros();
}
$desde.addEventListener("change", onFechaManual);
$hasta.addEventListener("change", onFechaManual);

$mapa.addEventListener("change", renderLista);
map.on("moveend", () => { if ($mapa.checked) renderLista(); });

// botones rápidos de fecha
function lastDayOfMonthISO(base) {
  const d = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return fmtISO(d);
}
function actualizarChips(activo) {
  document.querySelectorAll(".chip").forEach(c =>
    c.classList.toggle("chip-activo", c.dataset.rango === activo));
}
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const r = chip.dataset.rango;
    ignoreDate = false;
    if (r === "hoy") {
      $desde.value = HOY_ISO; $hasta.value = HOY_ISO;
    } else if (r === "finde") {
      $desde.value = FINDE.sat < HOY_ISO ? HOY_ISO : FINDE.sat;
      $hasta.value = FINDE.sun;
    } else if (r === "mes") {
      $desde.value = HOY_ISO; $hasta.value = lastDayOfMonthISO(HOY);
    } else if (r === "todas") {
      ignoreDate = true; $desde.value = ""; $hasta.value = "";
    }
    $hasta.min = $desde.value || HOY_ISO;
    actualizarChips(r);
    aplicarFiltros();
  });
});

// --- Conmutador Lista/Mapa (móvil) -----------------------------------
document.querySelectorAll(".vista-toggle button").forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.vista;
    document.body.classList.toggle("vista-mapa", v === "mapa");
    document.querySelectorAll(".vista-toggle button").forEach(x =>
      x.classList.toggle("vista-activa", x === btn));
    if (v === "mapa") {
      setTimeout(() => { map.invalidateSize(); renderLista(); }, 60);
    } else {
      renderLista();
    }
  });
});

// --- Indicador de última actualización -------------------------------
(function mostrarUpdate() {
  const el = document.getElementById("update-info");
  if (el && typeof DATA_INFO !== "undefined" && DATA_INFO.generado) {
    el.textContent = "actualizado " + DATA_INFO.generado + " h";
    el.title = "Datos regenerados el " + DATA_INFO.generado +
      (DATA_INFO.feed ? " · feed " + DATA_INFO.feed : "");
  }
})();

// --- Inicio -----------------------------------------------------------
aplicarFiltros();
