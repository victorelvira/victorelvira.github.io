let map, layer, latest = [], visible = true, dirty = false, tileFailed = false;
const markers = new Map();
const colors = { '⭐': '#a1782b', '◼': '#37666a', '○': '#867d70' };
const symbols = { '⭐': '★', '◼': '■', '○': '○' };
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
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  tiles.on('tileerror', () => { tileFailed = true; report(); });
  layer = L.markerClusterGroup ? L.markerClusterGroup({
    maxClusterRadius: 42, showCoverageOnHover: false, spiderfyOnMaxZoom: true,
    iconCreateFunction(cluster) {
      const n = cluster.getAllChildMarkers().reduce((sum, marker) => sum + marker.options.placeCount, 0);
      const size = n >= 20 ? 44 : n >= 5 ? 37 : 32;
      return L.divIcon({ className: 'cluster-marker', html: `<span>${n}</span>`, iconSize: [size, size] });
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
    const p = group[0], title = group.map(p => p.Name).join(' · ');
    const marker = L.marker([Number(p.Latitude), Number(p.Longitude)], {
      title, alt: title, placeCount: group.length,
      icon: L.divIcon({ className: 'place-marker', html: `<span style="background:${colors[p.Priority]}">${group.length > 1 ? group.length : symbols[p.Priority]}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] })
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
export function focusPlace(id) {
  const marker = markers.get(id);
  if (!marker || !map) return;
  const select = () => { map.panTo(marker.getLatLng()); highlightPlace(id); };
  if (layer.zoomToShowLayer) layer.zoomToShowLayer(marker, select);
  else { map.setView(marker.getLatLng(), 16); select(); }
}
