// Version: also the cache-bust for data files and the ?v= in the entry page (keep in sync).
export const DATA_V = "0.2.16";
export const BUILD_AT = "2026-10-10 11:02";

// data/ sits beside src/ inside the app folder; resolve it from this module, not from the page
const DATA_BASE = new URL("../data/", import.meta.url).href;
const cache = new Map();

// live files (election night): never cached, by the browser or here
export function loadFresh(path) {
  return fetch(`${DATA_BASE}${path}?v=${DATA_V}&t=${Date.now()}`).then((r) => (r.ok ? r.json() : null));
}

export function load(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(`${DATA_BASE}${path}?v=${DATA_V}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(path);
}

export let META;
export let FAM;          // id -> {nombre, color}
export let FAM_IDS;      // ordered ids

export async function init() {
  META = await load("meta.json");
  FAM = Object.fromEntries(META.familias.map((f) => [f.familia, f]));
  FAM_IDS = META.familias.map((f) => f.familia);
  // searchable list of municipalities
  META.lista = Object.entries(META.municipios).map(([ine, n]) => ({
    ine, n, p: META.provincias[ine.slice(0, 2)] ?? "",
    k: norm(n),
  }));
}

export const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const fmt = new Intl.NumberFormat("es-ES");
export const pct = (x, d = 1) => (x == null || isNaN(x) ? "·" : `${(x * 100).toFixed(d).replace(".", ",")}%`);
const MESES = ["", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export const elecLabel = (id) => META.elecciones.find((e) => e.eleccion === id)?.label
  ?? id.replace(/^(\w)(\w+)_(\d{4})-(\d{2})$/, (_, a, b, y, m) => `${a.toUpperCase()}${b} ${MESES[+m]} ${y}`);
export const byTipo = (t) => META.elecciones.filter((e) => e.tipo === t).map((e) => e.eleccion);

/** Row from res/{eleccion}.json -> {censo, votantes, validos, fam: {id: votos}} */
export function parseRow(cols, row) {
  if (!row) return null;
  const [censo, votantes, blancos, nulos, ...fv] = row;
  const fam = {};
  let cand = 0;
  if (cols.sparse) {
    // compact rows: [..., famIndex, votes, famIndex, votes, ...]; absent families have 0 votes
    for (const f of cols.fams) fam[f] = 0;
    for (let i = 0; i < fv.length; i += 2) { fam[cols.fams[fv[i]]] = fv[i + 1]; cand += fv[i + 1]; }
  } else {
    cols.slice(4).forEach((f, i) => { fam[f] = fv[i]; cand += fv[i]; });
  }
  return { censo, votantes, blancos, nulos, cand, validos: cand + blancos, fam };
}

/** Municipality detail file of one province, decoded to {ine: {n, e: {eleccion: {censo, vot, bl, nu, a1, a2, ab, c}}}}. */
const muniCache = new Map();
export function loadMuni(prov) {
  if (!muniCache.has(prov)) {
    muniCache.set(prov, load(`muni/${prov}.json`).then(({ s, f, m }) => {
      const out = {};
      for (const [ine, [n, es]] of Object.entries(m)) {
        const e = {};
        for (const [eid, a] of Object.entries(es)) {
          const [censo, vot, bl, nu, a1, a2, ab] = a;
          const c = [];
          for (let i = 7; i < a.length; i += 4) c.push([s[a[i]], f[a[i + 1]], a[i + 2], a[i + 3]]);
          e[eid] = { censo, vot, bl, nu, c, ...(a1 ? { a1, a2 } : {}), ...(ab ? { ab: 1 } : {}) };
        }
        out[ine] = { n, e };
      }
      return out;
    }));
  }
  return muniCache.get(prov);
}

export function winner(r) {
  let best = null, bv = -1, second = 0;
  for (const [f, v] of Object.entries(r.fam)) {
    if (v > bv) { second = bv; bv = v; best = f; } else if (v > second) second = v;
  }
  return { fam: best, share: r.cand ? bv / r.cand : 0, margin: r.cand ? (bv - Math.max(second, 0)) / r.cand : 0 };
}

// tooltip helper
const tip = () => document.getElementById("tip");
export function showTip(html, ev) {
  const t = tip();
  t.innerHTML = html;
  t.hidden = false;
  const pad = 14, w = t.offsetWidth, h = t.offsetHeight;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  if (x + w > innerWidth - 8) x = ev.clientX - w - pad;
  if (y + h > innerHeight - 8) y = ev.clientY - h - pad;
  t.style.left = `${x}px`; t.style.top = `${y}px`;
}
export const hideTip = () => { tip().hidden = true; };
