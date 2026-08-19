/* Mapa de frontones. Consume data/frontones.geojson (generado por scripts/build.py). */

const COLORS = { cantabria: "#1b5e3f", euskadi: "#b23a2e" };
const SRC_LABEL = { osm: "OSM", gis: "GIS Cantabria", frontons: "frontons.net", manual: "añadido (local)" };
const TIPO_LABEL = {
  pared_izq: "pared izquierda", plaza_libre: "plaza libre", trinquete: "trinquete",
  corto: "corto", largo: "largo",
};

const map = L.map("map", { zoomControl: true }).setView([43.25, -3.6], 8);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: "© OpenStreetMap",
}).addTo(map);
requestAnimationFrame(() => map.invalidateSize());
window.addEventListener("resize", () => map.invalidateSize());

const group = L.layerGroup().addTo(map);
const all = [];   // {marker, region, confianza}
const state = { cantabria: true, euskadi: true, soloVerificados: false };

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function srcBadge(s, p) {
  const url = s === "osm" ? p.osm_url : s === "frontons" ? p.frontons_url : p.gis_url;
  const label = SRC_LABEL[s] || s;
  return url
    ? `<a class="tag src" href="${url}" target="_blank" rel="noopener">${label} ↗</a>`
    : `<span class="tag src">${label}</span>`;
}

function popup(p, lat, lon) {
  const name = p.name ? esc(p.name) : "Frontón";
  const muni = p.municipio ? esc(p.municipio) : null;
  // municipio en negrita en el título (es lo primero que se busca)
  const title = muni
    ? `<span class="nm">${name}</span> · <span class="muni">${muni}</span>`
    : `<span class="muni">${name}</span>`;
  const tipoTxt = p.tipo ? esc(TIPO_LABEL[p.tipo] || p.tipo)
                         : (!muni ? (p.region === "cantabria" ? "Cantabria" : "Euskadi") : "");
  const dir = p.direccion ? esc(p.direccion.replace(/[\s,]*(España|Espagne)\s*$/i, "").trim()) : "";

  const nSrc = (p.sources || [p.source]).length;
  const confTxt = (p.sources || []).includes("manual")
    ? "✓ Añadido a mano"
    : p.confianza === "confirmado"
      ? `✓ Confirmado · ${nSrc} fuentes`
      : "⚠ Sin confirmar · 1 fuente";
  const conf = `<div class="conf ${p.confianza === "confirmado" ? "ok" : "warn"}">${confTxt}</div>`;

  const badges = (p.sources || [p.source]).map(s => srcBadge(s, p)).join("");

  const edit = p.edit_url || `https://www.openstreetmap.org/edit#map=19/${lat}/${lon}`;
  const editTxt = p.edit_url ? "Corregir en OpenStreetMap ↗" : "Añadir/corregir en OpenStreetMap ↗";

  return `<div class="pop">
    <h3>${title}</h3>
    ${tipoTxt ? `<div class="sub">${tipoTxt}</div>` : ""}
    ${dir ? `<div class="addr">${dir}</div>` : ""}
    ${conf}
    <div class="tags">${badges}</div>
    <a class="edit" href="https://www.google.com/maps/search/?api=1&query=${lat},${lon}" target="_blank" rel="noopener">📍 Cómo llegar ↗</a>
    <a class="edit" href="${edit}" target="_blank" rel="noopener">${editTxt}</a>
    <div class="ids">${(p.member_ids || []).map(esc).join(" · ")}</div>
  </div>`;
}

function styleFor(region, confianza) {
  const c = COLORS[region] || "#555";
  return confianza === "confirmado"
    ? { radius: 6, weight: 2, color: c, fillColor: c, fillOpacity: 0.7 }
    : { radius: 5, weight: 1.5, color: c, fillColor: c, fillOpacity: 0.12, dashArray: "2,3" };
}

function redraw() {
  group.clearLayers();
  const shown = { cantabria: 0, euskadi: 0 };
  let conf = 0;
  for (const it of all) {
    const visible = state[it.region] && (!state.soloVerificados || it.confianza === "confirmado");
    if (visible) {
      group.addLayer(it.marker);
      if (it.region in shown) shown[it.region]++;
      if (it.confianza === "confirmado") conf++;
    }
  }
  document.getElementById("stats").innerHTML =
    `<b>${shown.cantabria + shown.euskadi}</b> frontones · <b>${shown.cantabria}</b> Cantabria · ` +
    `<b>${shown.euskadi}</b> Euskadi · <span class="ok">${conf} ✓</span>`;
}

fetch("frontones/data/frontones.geojson")
  .then(r => r.json())
  .then(fc => {
    fc.features.forEach(f => {
      const [lon, lat] = f.geometry.coordinates;
      const p = f.properties;
      const marker = L.circleMarker([lat, lon], styleFor(p.region, p.confianza))
        .bindPopup(() => popup(p, lat, lon));
      all.push({ marker, region: p.region, confianza: p.confianza, props: p });
    });
    redraw();
  })
  .catch(e => { document.getElementById("stats").textContent = "No se pudo cargar el dataset"; console.error(e); });

// Filtros
document.querySelectorAll(".filters input[data-region]").forEach(cb => {
  cb.addEventListener("change", e => { state[e.target.dataset.region] = e.target.checked; redraw(); });
});
const verCb = document.getElementById("solo-verificados");
if (verCb) verCb.addEventListener("change", e => { state.soloVerificados = e.target.checked; redraw(); });

// "Cerca de mí": geolocalización del navegador (sin backend)
function haversine(aLat, aLon, bLat, bLon) {
  const R = 6371000, r = x => x * Math.PI / 180;
  const dLat = r(bLat - aLat), dLon = r(bLon - aLon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const fmtDist = m => m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;

let meMarker = null;
const nearBtn = document.getElementById("near-me");
if (nearBtn) nearBtn.addEventListener("click", () => {
  if (!navigator.geolocation) { alert("Tu navegador no permite geolocalización."); return; }
  nearBtn.textContent = "📍 Buscando…"; nearBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(pos => {
    const la = pos.coords.latitude, lo = pos.coords.longitude;
    if (meMarker) map.removeLayer(meMarker);
    meMarker = L.circleMarker([la, lo], { radius: 8, weight: 3, color: "#1a73e8", fillColor: "#1a73e8", fillOpacity: 0.9 }).addTo(map);
    const near = all
      .filter(it => state[it.region] && (!state.soloVerificados || it.confianza === "confirmado"))
      .map(it => ({ it, d: haversine(la, lo, it.marker.getLatLng().lat, it.marker.getLatLng().lng) }))
      .sort((a, b) => a.d - b.d).slice(0, 5);
    const list = near.map(({ it, d }) => {
      const nm = it.props.name ? esc(it.props.name) : "Frontón";
      const mu = it.props.municipio ? ` <span class="muni">${esc(it.props.municipio)}</span>` : "";
      return `${nm}${mu} — <b>${fmtDist(d)}</b>`;
    }).join("<br>");
    meMarker.bindPopup(`<div class="pop"><h3>Estás aquí</h3><div class="near">${list || "Sin frontones visibles"}</div></div>`).openPopup();
    const pts = [[la, lo], ...near.map(x => [x.it.marker.getLatLng().lat, x.it.marker.getLatLng().lng])];
    if (pts.length > 1) map.fitBounds(pts, { padding: [60, 60], maxZoom: 14 });
    else map.setView([la, lo], 13);
    nearBtn.textContent = "📍 Cerca de mí"; nearBtn.disabled = false;
  }, () => {
    nearBtn.textContent = "📍 Cerca de mí"; nearBtn.disabled = false;
    alert("No pude obtener tu ubicación. ¿Diste permiso al navegador?");
  }, { enableHighAccuracy: true, timeout: 10000 });
});

// ── Reporte comunitario ────────────────────────────────────────────────
// Pega aquí la URL de tu Web App de Google Apps Script (termina en /exec):
const REPORT_ENDPOINT = "https://script.google.com/macros/s/AKfycbxgpFado69HbPzmWw0d1uqqwMT3ipapcUwtSp9pWyOELcrND5idSUE2k4WG9D4QWa4Q/exec";

const $ = id => document.getElementById(id);
let reportMarker = null;

function startReport() {
  if (!REPORT_ENDPOINT) { alert("El reporte aún no está configurado (falta el endpoint)."); return; }
  $("report-banner").hidden = false;
  map.getContainer().style.cursor = "crosshair";
  map.once("click", onReportClick);
}
function stopReport() {
  $("report-banner").hidden = true;
  map.getContainer().style.cursor = "";
  map.off("click", onReportClick);
}
async function onReportClick(e) {
  const { lat, lng } = e.latlng;
  if (reportMarker) map.removeLayer(reportMarker);
  reportMarker = L.marker([lat, lng]).addTo(map);
  const form = $("report-form");
  form.lat.value = lat.toFixed(6);
  form.lon.value = lng.toFixed(6);
  $("report-loc").textContent = `Ubicación: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  $("report-banner").hidden = true;
  map.getContainer().style.cursor = "";
  $("report-msg").textContent = "";
  $("report-panel").hidden = false;
  // autocompletar municipio (no bloqueante)
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`);
    const a = (await r.json()).address || {};
    if (!form.municipio.value) form.municipio.value = a.village || a.town || a.municipality || a.city || "";
  } catch (_) {}
}
function closeReport() {
  $("report-panel").hidden = true;
  if (reportMarker) { map.removeLayer(reportMarker); reportMarker = null; }
  $("report-form").reset();
}

if ($("report")) $("report").addEventListener("click", startReport);
if ($("report-abort")) $("report-abort").addEventListener("click", stopReport);
if ($("report-cancel")) $("report-cancel").addEventListener("click", closeReport);
if ($("report-form")) $("report-form").addEventListener("submit", e => {
  e.preventDefault();
  const data = new URLSearchParams(new FormData($("report-form")));
  $("report-send").disabled = true;
  $("report-msg").textContent = "Enviando…";
  fetch(REPORT_ENDPOINT, { method: "POST", mode: "no-cors", body: data })
    .then(() => {
      $("report-msg").textContent = "¡Gracias! Lo revisaré. 🙌";
      setTimeout(closeReport, 1500);
    })
    .catch(() => { $("report-msg").textContent = "No se pudo enviar. Inténtalo luego."; })
    .finally(() => { $("report-send").disabled = false; });
});
