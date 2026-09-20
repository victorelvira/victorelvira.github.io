import { filterPlaces, minutes } from './filters.mjs?v=2.7';
import { markOf, markButtons, toggleMark } from './marks.js?v=2.7';
import { updateMap, focusPlace, highlightPlace, setMapVisible, fitPlaces } from './map.js?v=2.7';
const $ = s => document.querySelector(s);
let places = [], filtered = [], selectedId = null, mapVisible = true, view = 'map';
const VERSION = '2.7', BUILD_AT = '2026-09-20 14:59';   // stamped by scripts/stamp_build.py at deploy — do not edit
{ const b = document.getElementById('build'); if (b) b.textContent = BUILD_AT ? `v${VERSION} · ${BUILD_AT}` : `v${VERSION}`; }
const mobile = () => matchMedia('(max-width:760px)').matches;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const statuses = { 'COMPLET': 'Completo', 'SANS RÉSERVATION': 'Sin reserva', 'RÉSERVATION': 'Con reserva', 'COMPLET activités JEP': 'Actividades JEP completas', 'ACCÈS LIBRE': 'Acceso libre', 'PARTIEL': 'Acceso parcial', 'TICKETS SUR PLACE': 'Entradas en el lugar', 'GRATUIT': 'Gratuito', 'COMPLET / RÉSERVATION': 'Completo / con reserva', 'À VÉRIFIER': 'Por verificar', 'COMPLET / ANNULATIONS': 'Completo / cancelaciones', 'BILLETTERIE': 'Taquilla', 'INSCRIPTIONS COMPLÈTES': 'Inscripciones completas', 'ACCÈS LIBRE — AUCUNE RÉSERVATION': 'Acceso libre', 'COMPLET — invitation obligatoire': 'Completo · sólo invitación', '2e PASSAGE — PARTICIPATION / ACCÈS À VÉRIFIER': 'Participación por verificar' };
const statusClass = { '🟢': 'free', '🎟️': 'reservation', '🟡': 'partial', '🔴': 'full', '🟠': 'full', '⚪': 'unknown' };
const priority = { '✦': ['★★★★ A+', 'aplus', 0], '⭐': ['★★★ A', '', 1], '◼': ['★★ B', 'medium', 2], '○': ['★ C', 'low', 3] };
function schedule(value) {
  if (value === '?') return '<span class="unconfirmed">Por confirmar</span>';
  if (value === '—') return '<span class="closed">Sin visita</span>';
  return `<span>${esc(value.replace('journée', 'Durante el día').replace('selon visite', 'Según visita').replace('dès ', 'Desde ').replace("jusqu'à ", 'Hasta ').replace(/;/g, ' · ').replace(' /30 min', ' · cada 30 min'))}</span>`;
}
function safeLink(value) { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? esc(u.href) : null; } catch { return null; } }
function meta(p) {
  const [label, cls] = priority[p.Priority] || ['Sin prioridad', 'low'];
  return `<div class="card-top"><span class="priority-badge ${cls}">${label}</span><span class="district">${p.Arrondissement === 'Paris' ? 'París' : `${esc(p.Arrondissement)} arrondissement`}</span></div>`;
}
const availability = { '❌': ['COMPLET', 'full'], '🔄': ['Vigilar cancelaciones', 'partial'], '❓': ['Disponibilidad no comprobada', 'unknown'], '✅': ['Hay plazas', 'free'] };
const rare = p => p.Rare ? ' <span class="status rare">Apertura excepcional</span>' : '';
const avail = p => { const a = availability[p.Availability]; return a ? ` <span class="status ${a[1]}">${a[0]}</span>` : ''; };
const status = p => `<span class="status ${p.Full ? 'full' : statusClass[p.Access] || 'unknown'}" title="${esc(p.Status)}">${esc(statuses[p.Status] || p.Status)}</span>`;
// A link shared by several places (or a guide article) is a generic listing, not the place's own page.
const activities = p => p.Activities?.length ? `<ul class="activities">${p.Activities.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
const generic = url => /sortiraparis\.com|\/guides?\//.test(url);
function detailBody(p) {
  const source = safeLink(p['Source / JEP page']), booking = safeLink(p['Booking link']), route = safeLink(p['Google Maps']);
  return `<p class="address">${esc(p.Address)}</p>${activities(p)}<div class="schedules"><div class="schedule"><strong>Sábado 19</strong>${schedule(p.Saturday)}</div><div class="schedule"><strong>Domingo 20</strong>${schedule(p.Sunday)}</div></div><div class="card-links">${source ? `<a href="${source}" target="_blank" rel="noopener noreferrer">${p.Official ? 'Programa oficial ↗' : generic(source) ? 'Artículo general JEP ↗' : 'Fuente / programa ↗'}</a>` : ''}${booking ? `<a href="${booking}" target="_blank" rel="noopener noreferrer"><b>Reservar ↗</b></a>` : ''}<a href="https://www.google.com/search?q=${encodeURIComponent(p.Name + ' journées du patrimoine 2026')}" target="_blank" rel="noopener noreferrer">Buscar programa ↗</a>${route ? `<a href="${route}" target="_blank" rel="noopener noreferrer">Cómo llegar ↗</a>` : ''}</div>${p.Official ? '' : '<p class="detail-location">No está en el programa oficial: horarios por confirmar.</p>'}${p.Latitude ? (p.geocoding?.type === 'street' ? '<p class="detail-location">Ubicación aproximada en la vía.</p>' : '') : '<p class="location-pending">Ubicación por precisar · disponible en la lista.</p>'}`;
}
function card(p) {
  return `<details class="card mark-${markOf(p) || 'none'}" id="place-${p.id}" data-card="${p.id}"><summary>${markButtons(p)}${meta(p)}<h3>${esc(p.Name)}</h3>${status(p)}${avail(p)}${rare(p)}</summary><div class="card-body">${detailBody(p)}${p.Latitude ? `<button type="button" class="show-on-map" data-place="${p.id}">Ver en el mapa</button>` : ''}</div></details>`;
}
function showSheet(p, groupIds = []) {
  selectedId = p.id;
  const others = groupIds.map(id => places.find(p => p.id === id)).filter(other => other && other.id !== p.id);
  $('#dialog-content').innerHTML = `<div class="detail-content mark-${markOf(p) || 'none'}">${markButtons(p)}${meta(p)}<h2 class="detail-heading" id="dialog-title">${esc(p.Name)}</h2>${status(p)}${avail(p)}${rare(p)}${detailBody(p)}${others.length ? `<div class="group-links"><span>También en esta dirección</span>${others.map(other => `<button type="button" data-related="${other.id}">${esc(other.Name)}</button>`).join('')}</div>` : ''}</div>`;
  $('#dialog-content').querySelectorAll('[data-related]').forEach(b => b.addEventListener('click', () => selectPlace(Number(b.dataset.related), { origin: 'map', groupIds })));
  if (!$('#place-dialog').open) $('#place-dialog').showModal();
  $('#place-dialog').scrollTop = 0;
}
function selectPlace(id, { origin = 'list', groupIds = [] } = {}) {
  const p = filtered.find(p => p.id === id); if (!p) return;
  selectedId = id;
  document.querySelectorAll('[data-card]').forEach(card => {
    const selected = Number(card.dataset.card) === id;
    card.classList.toggle('selected', selected);
    card.open = selected;
  });
  highlightPlace(id);
  if (origin === 'map' && mobile() && mapVisible) { showSheet(p, groupIds); return; }
  if (origin === 'map') {
    const card = $(`#place-${id}`);
    // Only the list scrolls: selecting a place never moves the page or the map.
    $('#list').scrollTo({ top: card.offsetTop - $('#list').offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    card.querySelector('summary').focus({ preventScroll: true });
  } else if (mapVisible && !mobile()) focusPlace(id);
}
window.addEventListener('place-selected', e => selectPlace(e.detail[0], { origin: 'map', groupIds: e.detail }));
$('#list').addEventListener('toggle', e => {
  const card = e.target;
  if (card.matches('[data-card]') && card.open && selectedId !== Number(card.dataset.card)) selectPlace(Number(card.dataset.card));
}, true);
$('#list').addEventListener('click', e => {
  const button = e.target.closest('[data-place]'); if (!button) return;
  const id = Number(button.dataset.place); setView('map'); requestAnimationFrame(() => focusPlace(id, true));
  if (mobile()) selectPlace(id, { origin: 'map' });
});
$('#close-detail').addEventListener('click', () => $('#place-dialog').close());
$('#place-dialog').addEventListener('click', e => { if (e.target === $('#place-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right || e.clientY > r.bottom) e.target.close(); } });
$('#filter-toggle').addEventListener('click', () => {
  const open = $('.filters').classList.toggle('expanded');
  $('#filter-toggle').setAttribute('aria-expanded', String(open));
  $('.toggle-icon').textContent = open ? '− cerrar' : '＋ pulsa';
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('.filters').classList.remove('expanded'); $('#filter-toggle').setAttribute('aria-expanded', 'false'); $('.toggle-icon').textContent = '＋ pulsa'; } });
// "Ahora" is the wall clock rounded down to the half hour; the rest are fixed hours.
const openValue = () => { const v = $('[name=open]:checked').value; if (v !== 'now') return v; const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${d.getMinutes() < 30 ? '00' : '30'}`; };
export function readFilters() { return { priorities: [...document.querySelectorAll('[name=priority]:checked')].map(i => i.value), entries: [...document.querySelectorAll('[name=entry]:checked')].map(i => i.value), day: $('[name=day]:checked').value, openAt: openValue(), includeUnknown: $('#unknown').checked, hideFull: $('#hide-full').checked, verifiedOnly: $('#verified').checked }; }
export function render() {
  const f = readFilters(); filtered = filterPlaces(places, f); selectedId = null;
  if ($('#place-dialog').open) $('#place-dialog').close();
    $('#count').textContent = filtered.length;
  const unknownHidden = f.openAt && !f.includeUnknown ? places.filter(p => !filterPlaces([p], { ...f, openAt: '', includeUnknown: true }).length ? false : !filterPlaces([p], f).length && filterPlaces([p], { ...f, includeUnknown: true }).length).length : 0;
  $('#time-hint').textContent = unknownHidden ? `${unknownHidden} lugares con horario sin confirmar quedan fuera.` : f.openAt ? 'Lugares con visita a esa hora o más tarde.' : 'Elige una hora para ver lo que sigue abierto.';
    const active = Number(!!f.priorities.length) + Number(!!f.entries.length) + Number(f.day !== 'any') + Number(!!f.openAt);
  // Collapsed on a phone, the toggle is the only place the filters are visible: it names them, briefly.
  const DAYS = { Saturday: 'Sáb.', Sunday: 'Dom.', both: 'Ambos' }, ENTRIES = { free: 'Libre', booking: 'Reserva', mixed: 'Mixto', unknown: 'Sin info' };
  const summary = [
    f.priorities.length ? f.priorities.map(p => priority[p][0].split(' ')[1]).join('') : '',
    DAYS[f.day] || '', { '': '', now: 'ahora' }[$('[name=open]:checked').value] ?? $('[name=open]:checked').value.slice(0, 2) + 'h',
    f.entries.length === 4 ? '' : f.entries.map(e => ENTRIES[e]).join('/'),
    f.verifiedOnly ? 'verificados' : '', f.hideFull ? '' : 'con completos',
  ].filter(Boolean);
  $('#filter-count').textContent = `(${[...summary, `${filtered.length} lugares`].join(' · ')})`;
  $('#result-note').textContent = active ? `${filtered.length} de ${places.length} · ${f.includeUnknown ? 'Incluye horarios pendientes' : 'Por prioridad'}` : 'Por prioridad · toda tu selección';
  $('#list').className = view === 'table' ? 'table-wrap' : 'cards';
  $('#list').innerHTML = filtered.length ? (view === 'table' ? table(filtered) : filtered.map(card).join('')) : `<div class="empty"><h3>No hay lugares con estos filtros</h3><p>Prueba otro día, amplía el horario o incluye horarios por confirmar.</p><button id="empty-reset" type="button">Restablecer filtros</button></div>`;
  $('#list').scrollTop = 0;
  $('#empty-reset')?.addEventListener('click', reset);
  $('#list').querySelectorAll('th[data-sort] button').forEach(b => b.addEventListener('click', () => {
    const key = b.parentElement.dataset.sort;
    sortAsc = sortBy === key ? !sortAsc : true; sortBy = key; render();
  }));
  updateMap(filtered); return filtered;
}
// --- table view ----------------------------------------------------------
// The same filtered places as the map and the cards, read as a list: what is open, where, and how
// you get in, in one screen. Sorting is per column and the day columns follow the day filter.
const COLUMNS = [
  ['Name', 'Lugar', p => `<b>${esc(p.Name)}</b>${p.Rare ? ' <span class="t-rare" title="Apertura excepcional">✶</span>' : ''}`],
  ['Arrondissement', 'Arr.', p => esc((p.Arrondissement || '').replace('e', ''))],
  ['Saturday', 'Sáb.', p => scheduleCell(p.Saturday)],
  ['Sunday', 'Dom.', p => scheduleCell(p.Sunday)],
  ['Priority', 'Prio.', p => { const [label, cls] = priority[p.Priority] || ['', '']; const [stars, letter] = label.split(' ');
    return `<span class="priority-badge ${cls}"><span class="t-stars">${stars}</span><span class="t-letter">${letter || ''}</span></span>`; }],
  ['mark', '♥ / ✕', p => markButtons(p)],
  ['Entry', 'Entrada', p => { const label = { free: 'Libre', booking: 'Reserva', mixed: 'Mixto', unknown: 'Sin info' }[p.Entry];
    return `<i class="dot ${p.Entry}" title="${label}"></i><span class="t-entry"> ${label}${p.Full ? ' <span class="t-full">completo</span>' : ''}</span>`; }],
];
// A venue with a dozen tour slots would own the row: show the first three and keep the rest in the tooltip.
const scheduleCell = v => {
  if (v === '—') return '<span class="closed">—</span>';
  if (v === '?') return '<span class="unconfirmed">?</span>';
  const spans = v.split(';');
  return `<span title="${esc(spans.join(' · '))}">${esc(spans.slice(0, 3).join(' · '))}${spans.length > 3 ? ` +${spans.length - 3}` : ''}</span>`;
};
let sortBy = 'Priority', sortAsc = true;
const sortValue = (p, key) => key === 'mark' ? ({ love: 0, '': 1, hide: 2 })[markOf(p)]
  : key === 'Priority' ? (priority[p.Priority]?.[2] ?? 4)
  : key === 'Arrondissement' ? parseInt(p.Arrondissement) || 99
  : key === 'Saturday' || key === 'Sunday' ? (p[key].match(/\d{2}:\d{2}/)?.[0] || '99:99')
  : String(p[key] ?? '').toLowerCase();
function table(rows) {
  const sorted = [...rows].sort((a, b) => {
    const x = sortValue(a, sortBy), y = sortValue(b, sortBy);
    return (x < y ? -1 : x > y ? 1 : 0) * (sortAsc ? 1 : -1);
  });
  const head = COLUMNS.map(([key, label]) => `<th data-sort="${key}" aria-sort="${sortBy === key ? (sortAsc ? 'ascending' : 'descending') : 'none'}"><button type="button">${label}${sortBy === key ? (sortAsc ? ' ▲' : ' ▼') : ''}</button></th>`).join('');
  const body = sorted.map(p => `<tr data-row="${p.id}" tabindex="0" class="mark-${markOf(p) || 'none'}">${COLUMNS.map(([, , cell]) => `<td>${cell(p)}</td>`).join('')}</tr>`).join('');
  const day = $('[name=day]:checked').value;
  return `<table class="places-table${day === 'Saturday' ? ' only-sat' : day === 'Sunday' ? ' only-sun' : ''}"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}
function setView(next) {
  view = next; mapVisible = next === 'map';
  $('.results-body').classList.toggle('map-visible', mapVisible);
  for (const v of ['map', 'list', 'table']) $(`#view-${v}`).setAttribute('aria-pressed', String(view === v));
  if ($('#place-dialog').open) $('#place-dialog').close();
  setMapVisible(mapVisible);
  render();
}
$('#view-list').addEventListener('click', () => setView('list'));
$('#view-map').addEventListener('click', () => setView('map'));
$('#view-table').addEventListener('click', () => setView('table'));
// A row is the whole place: tapping it opens the same detail sheet the map and the cards open.
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-mark]'); if (!btn) return;
  e.preventDefault(); e.stopPropagation();
  const host = btn.closest('[data-card],[data-row]');
  const place = host ? places.find(p => p.id === Number(host.dataset.card ?? host.dataset.row)) : places.find(p => p.id === selectedId);
  if (place) toggleMark(place, btn.dataset.mark);
}, true);
// A mark changes the list, the table and the colour on the map, so everything is redrawn.
document.addEventListener('marks-changed', () => { render(); if ($('#place-dialog').open && selectedId != null) showSheet(places.find(p => p.id === selectedId)); });
$('#list').addEventListener('click', e => { const row = e.target.closest('[data-row]'); if (row) showSheet(places.find(p => p.id === Number(row.dataset.row))); });
$('#list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-row]')) showSheet(places.find(p => p.id === Number(e.target.dataset.row))); });
$('#fit-map').addEventListener('click', fitPlaces);
// During the weekend the useful default is "today, from now on"; afterwards, no day or hour filter.
const JEP = { '2026-09-19': 'Saturday', '2026-09-20': 'Sunday' };
function applyDefaults() {
  const today = JEP[new Date().toLocaleDateString('sv')] || 'any';
  $(`[name=day][value=${today}]`).checked = true;
  $(`[name=open][value="${today === 'any' ? '' : 'now'}"]`).checked = true;
}
function reset() { document.querySelectorAll('[name=priority]').forEach(i => i.checked = false);  document.querySelectorAll('[name=entry]').forEach(i => i.checked = i.value === 'free'); $('#hide-full').checked = true; $('#verified').checked = false; applyDefaults(); $('#unknown').checked = false; render(); }
document.querySelectorAll('.filters input, .filters select').forEach(i => i.addEventListener('change', render));
$('#reset').addEventListener('click', reset);
if(document.modelContext?.registerTool){
  const lifecycle=new AbortController();
  try{Promise.resolve(document.modelContext.registerTool({name:'filter_places',title:'Filtrar lugares de París JEP',description:'Actualiza los filtros visibles y devuelve los lugares de la selección que coinciden. No confirma reservas ni disponibilidad.',inputSchema:{type:'object',properties:{priorities:{type:'array',items:{type:'string',enum:['✦','⭐','◼','○']}},entries:{type:'array',items:{type:'string',enum:['free','booking','mixed','unknown']}},hideFull:{type:'boolean'},verifiedOnly:{type:'boolean'},day:{type:'string',enum:['any','Saturday','Sunday','both']},openAt:{type:'string'},includeUnknown:{type:'boolean'}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Se esperaba un objeto de filtros.');
    const allowed=['priorities','entries','hideFull','verifiedOnly','day','openAt','includeUnknown'];if(Object.keys(input).some(k=>!allowed.includes(k)))throw new Error('Filtro desconocido.');
    const f={...readFilters(),...input};
    if(!Array.isArray(f.priorities)||f.priorities.some(p=>!['✦','⭐','◼','○'].includes(p))||!Array.isArray(f.entries)||f.entries.some(e=>!['free','booking','mixed','unknown'].includes(e))||!['any','Saturday','Sunday','both'].includes(f.day)||typeof f.includeUnknown!=='boolean')throw new Error('Valor de filtro inválido.');
    for(const t of [f.openAt])if(typeof t!=='string'||!/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t))throw new Error('Usa una hora HH:MM.');
        document.querySelectorAll('[name=priority]').forEach(i=>i.checked=f.priorities.includes(i.value));document.querySelectorAll('[name=day]').forEach(i=>i.checked=i.value===f.day);document.querySelectorAll('[name=entry]').forEach(i=>i.checked=f.entries.includes(i.value));$('#hide-full').checked=!!f.hideFull;$('#verified').checked=!!f.verifiedOnly;document.querySelectorAll('[name=open]').forEach(i=>i.checked=i.value===f.openAt);$('#unknown').checked=f.includeUnknown;
    const result=render();return {count:result.length,places:result.map(p=>({name:p.Name,saturday:p.Saturday,sunday:p.Sunday,status:p.Status}))};
  }},{signal:lifecycle.signal})).catch(()=>{});}catch{}
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
try {
  const response = await fetch(new URL(`./places.json?v=${VERSION}`, import.meta.url));
  if (!response.ok) throw new Error('No se pudo cargar la selección.');
  places = await response.json(); places.forEach((p, i) => p.id = i);
  places.sort((a, b) => (priority[a.Priority]?.[2] ?? 4) - (priority[b.Priority]?.[2] ?? 4));
  applyDefaults();
  render();
} catch {
  $('#list').innerHTML = '<div class="empty"><h3>No se pudo cargar la selección</h3><p>Comprueba tu conexión y vuelve a cargar la página.</p><button id="retry">Volver a intentar</button></div>';
  $('#retry').addEventListener('click', () => location.reload());
  $('#count').textContent = '—';
  $('#result-note').textContent = 'Error al cargar';
  $('#map-note').textContent = 'La lista no está disponible.';
}
