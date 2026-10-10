import { FAM } from "./data.js?v=0.2.20";

const LOWER = new Set(["de", "del", "la", "las", "los", "y", "i", "da", "do", "das", "dos", "e"]);

/** The source writes many names in capitals; show them in title case (particles in lower case). */
export function displayName(s) {
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(/(\s+|-)/).map((w, i) =>
    (i > 0 && LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join("");
}

/** Elected people grouped by list: [[name, siglas, familia, ...], ...] */
export function electosList(el, list) {
  const groups = new Map();
  for (const [n, s, f] of list) {
    const k = s || "(sin siglas)";
    if (!groups.has(k)) groups.set(k, { f, names: [] });
    groups.get(k).names.push(displayName(n));
  }
  const ordered = [...groups.entries()].sort((a, b) => b[1].names.length - a[1].names.length);
  el.innerHTML = `<div class="electos">${ordered.map(([s, g]) => `
    <div class="eg"><div class="eh"><i class="dot" style="background:${(FAM[g.f] ?? FAM.otros).color}"></i><b>${s}</b> <span class="note">${g.names.length}</span></div>
    <ol>${g.names.map((n) => `<li>${n}</li>`).join("")}</ol></div>`).join("")}</div>`;
}

export const ELECTOS_NOTE = "Solo se publican las personas elegidas, ligadas a su cargo, y solo donde su número coincide con los escaños oficiales; los candidatos no electos no aparecen por su nombre. Fuente: listas de candidatos del Ministerio del Interior.";
