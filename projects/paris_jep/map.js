let map, layer, latest = [], visible = true, dirty = false, tileFailed = false;
const markers = new Map();
import { markOf } from './marks.js?v=2.9';
const colors = { '✦': '#8a5b12', '⭐': '#a1782b', '◼': '#37666a', '○': '#867d70' };
const MUTED = '#b6b1a8';   // a discarded place keeps its pin, in grey: still there, no longer shouting
const symbols = { '✦': '★', '⭐': 'A', '◼': 'B', '○': 'C' };
const emitSelection = group => window.dispatchEvent(new CustomEvent('place-selected', { detail: group.map(p => p.id) }));
function report() {
  const count = latest.filter(p => p.Latitude && p.Longitude).length;
  const missing = latest.length - count;
  document.querySelector('#map-note').textContent = tileFailed
    ? 'El fondo del mapa no se ha podido cargar. Puedes usar la lista.'
    : `${count} en el mapa${missing ? ` · ${missing} con ubicación pendiente` : ''}.`;
}
function ensureMap() {
  if (map) return true;
  if (!window.L) { document.querySelector('#map-note').textContent = 'Mapa no disponible. Puedes usar la lista.'; return false; }
  map = L.map('map', { scrollWheelZoom: true }).setView([48.857, 2.342], 12);
  map.on('dragstart', () => document.dispatchEvent(new Event('map-drag')));
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  tiles.on('tileerror', () => { tileFailed = true; report(); });
  layer = L.markerClusterGroup ? L.markerClusterGroup({
    maxClusterRadius: 42, showCoverageOnHover: false, spiderfyOnMaxZoom: true,
    iconCreateFunction(cluster) {
      const children = cluster.getAllChildMarkers();
      const n = children.reduce((sum, marker) => sum + marker.options.placeCount, 0);
      const size = n >= 20 ? 44 : n >= 5 ? 37 : 32;
      // A heart hidden inside a cluster would be invisible until you zoomed in: the number wears the ring.
      const loved = children.some(marker => marker.options.loved);
      return L.divIcon({ className: `cluster-marker${loved ? ' loved' : ''}`, html: `<span>${n}</span>`, iconSize: [size, size] });
    }
  }) : L.layerGroup();
  layer.addTo(map);
  new ResizeObserver(() => map.invalidateSize({ pan: false })).observe(document.querySelector('#map'));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) map.invalidateSize({ pan: false }); });
  return true;
}
export function fitPlaces() {
  if (!map) return;
  const points = latest.filter(p => p.Latitude && p.Longitude).map(p => [Number(p.Latitude), Number(p.Longitude)]);
  if (points.length) map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
}
export function updateMap(places) {
  latest = places; dirty = true; report();
  if (!visible || !ensureMap()) return;
  layer.clearLayers(); markers.clear();
  const groups = new Map();
  for (const p of places) {
    if (!p.Latitude || !p.Longitude) continue;
    const key = `${p.Latitude},${p.Longitude}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  for (const group of groups.values()) {
    const p = group[0], title = group.map(p => `${p.Access} ${p.Name}`).join(' · ');
    const marker = L.marker([Number(p.Latitude), Number(p.Longitude)], {
      title, alt: title, placeCount: group.length, loved: group.some(q => markOf(q) === 'love'),
      icon: L.divIcon({ className: 'place-marker', html: `<span class="${p.Priority === '✦' ? 'aplus ' : ''}${markOf(p) === 'hide' ? 'muted' : markOf(p) === 'love' ? 'loved' : ''}" style="background:${markOf(p) === 'hide' ? MUTED : colors[p.Priority]}">${group.length > 1 ? group.length : symbols[p.Priority]}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] })
    });
    const label = document.createElement('span'); label.textContent = title;
    marker.bindTooltip(label, { direction: 'top', offset: [0, -12] });
    marker.on('click', () => emitSelection(group));
    marker.on('add', () => marker.getElement()?.setAttribute('aria-label', title));
    layer.addLayer(marker);
    group.forEach(p => markers.set(p.id, marker));
  }
  dirty = false; fitPlaces();
}
export function highlightPlace(id) {
  new Set(markers.values()).forEach(marker => marker.getElement()?.classList.remove('selected'));
  markers.get(id)?.getElement()?.classList.add('selected');
}
export function setMapVisible(value) {
  visible = value;
  if (!value) return;
  if (!ensureMap()) return;
  map.invalidateSize({ pan: false });
  if (dirty) updateMap(latest);
}
export function focusPlace(id, zoom = false) {
  const marker = markers.get(id);
  if (!marker || !map) return;
  // zoom=true ("show on map" button): always zoom in close, otherwise the click looks like it did nothing.
  const select = () => { zoom ? map.setView(marker.getLatLng(), Math.max(map.getZoom(), 17)) : map.panTo(marker.getLatLng()); highlightPlace(id); };
  if (layer.zoomToShowLayer) layer.zoomToShowLayer(marker, select);
  else { map.setView(marker.getLatLng(), 16); select(); }
}

// --- Where I am -----------------------------------------------------------
// Three states, because two was a lie: off, following, and watching-but-not-chasing (you panned
// away to look at something). The button says which one it is in, and what the next tap will do.
let meWatch = null, meDot = null, meHalo = null, meFollow = false;
const meBtn = () => document.querySelector('#locate');
function drawMe(lat, lon, acc) {
  if (!meDot) {
    meHalo = L.circle([lat, lon], { radius: acc || 0, color: '#2f6fd0', weight: 1, fillColor: '#2f6fd0', fillOpacity: .12, interactive: false });
    meDot = L.circleMarker([lat, lon], { radius: 7, color: '#fff', weight: 3, fillColor: '#2f6fd0', fillOpacity: 1 });
    meDot.bindTooltip('Estás aquí', { direction: 'top', offset: [0, -10] });
    meHalo.addTo(map); meDot.addTo(map);
  } else {
    meDot.setLatLng([lat, lon]);
    meHalo.setLatLng([lat, lon]).setRadius(acc || 0);
  }
  meDot.bringToFront();
}
function stopMe() {
  if (meWatch != null) navigator.geolocation.clearWatch(meWatch);
  meWatch = null; meFollow = false;
  if (meDot) { map.removeLayer(meDot); map.removeLayer(meHalo); }
  meDot = meHalo = null;
  meBtn().disabled = false; meState();
}
function meState() {
  const btn = meBtn();
  btn.textContent = meWatch == null ? '📍 Dónde estoy' : meFollow ? '📍 Siguiendo' : '📍 Volver a mí';
  btn.title = meWatch == null ? 'Mostrar un punto en tu posición' : meFollow ? 'Te está siguiendo. Pulsa para apagarlo' : 'Llevar el mapa de vuelta a ti';
  btn.classList.toggle('active', meWatch != null);
}
meBtn()?.addEventListener('click', () => {
  const btn = meBtn();
  // Panned away and the dot is still live: the obvious next tap is "take me back", not "stop".
  if (meWatch != null && !meFollow && meDot) { meFollow = true; map.setView(meDot.getLatLng(), Math.max(map.getZoom(), 15)); meState(); return; }
  if (meWatch != null) return stopMe();
  if (!navigator.geolocation || !ensureMap()) { btn.textContent = '📍 No disponible'; return; }
  btn.textContent = '📍 Localizando…'; btn.disabled = true;
  let first = true, lastPan = null;
  meFollow = true;
  meWatch = navigator.geolocation.watchPosition(pos => {
    const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
    btn.disabled = false; meState();
    drawMe(lat, lon, acc);
    meHalo.setStyle({ color: '#2f6fd0', fillColor: '#2f6fd0' });   // fresh again
    if (first) { first = false; lastPan = { lat, lon }; map.fitBounds(L.latLng(lat, lon).toBounds(2000), { animate: false }); return; }
    // Walking: only after 20 m, because a phone reports a position every second.
    if (meFollow && (!lastPan || map.distance([lastPan.lat, lastPan.lon], [lat, lon]) > 20)) { lastPan = { lat, lon }; map.panTo([lat, lon], { animate: true }); }
  }, err => {
    btn.disabled = false;
    // Only a REFUSAL ends it: in the street the GPS times out all the time, between tall buildings
    // or underground. The last dot stays and its halo turns grey to say it is not current.
    if (err.code === 1) { stopMe(); meBtn().textContent = '📍 Permiso denegado'; return; }
    if (meHalo) meHalo.setStyle({ color: '#9a958a', fillColor: '#9a958a' });
    else meState();
  }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 });
});
// Dragging the map is a statement that you want to look somewhere else. The dot keeps moving; the
// map stops chasing it. Tapping the button again re-centres and resumes.
document.addEventListener('map-drag', () => { if (meWatch != null && meFollow) { meFollow = false; meState(); } });
