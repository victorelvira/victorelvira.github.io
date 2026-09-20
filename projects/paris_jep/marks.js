// Your own marks: a heart for what you want, a cross for what you have discarded.
// Kept in this browser (localStorage) and keyed by name+address, so rebuilding places.json — which
// renumbers every place — never moves a mark onto a different building.
const KEY = 'jep-marks';
export const markKey = p => `${p.Name}|${p.Address}`;
let marks = {};
try { marks = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { marks = {}; }
export const markOf = p => marks[markKey(p)] || '';
export function toggleMark(p, kind) {
  const key = markKey(p);
  if (marks[key] === kind) delete marks[key]; else marks[key] = kind;
  try { localStorage.setItem(KEY, JSON.stringify(marks)); } catch {}
  document.dispatchEvent(new CustomEvent('marks-changed', { detail: key }));
  return marks[key] || '';
}
export const markButtons = p => {
  const mark = markOf(p);
  return `<span class="marks"><button type="button" class="mark-btn love${mark === 'love' ? ' on' : ''}" data-mark="love" title="Me interesa" aria-pressed="${mark === 'love'}">♥</button><button type="button" class="mark-btn hide${mark === 'hide' ? ' on' : ''}" data-mark="hide" title="Descartar" aria-pressed="${mark === 'hide'}">✕</button></span>`;
};
