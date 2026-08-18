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
      all.push({ marker, region: p.region, confianza: p.confianza });
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
