// The province map shared by the Provincias tab (provincia.js, mode "Más votado") and the front page (inicio.js):
// the 52 province shapes, party names and colours, the 2023 results per province, and the "most voted party" colouring
// (the leader's colour, darker with its lead over the second), the "Bloques" colouring (the reader's groups of "Forma tu
// mayoría"). mapaMasVotado() draws the front page's version: every province labelled, and a card on click or tap.
const d3 = window.d3;
const topojson = window.topojson;
import { load, FAM, showTip, hideTip } from "./data.js?v=0.2.123";
import { POLL_PARTY, partyColor } from "./encuestas.js?v=0.2.123";
import { getGeo, rewind } from "./mapa.js?v=0.2.123";
import { textos, md } from "./textos.js?v=0.2.123";
import { BLOQUE_INICIAL, IDEO } from "./charts.js?v=0.2.123";

const pn = (f) => (f === "sumar" ? "Frente Amplio" : POLL_PARTY[f]?.n ?? FAM[f]?.nombre ?? (f === "otros" ? "Otras" : f.toUpperCase()));
export const short = (f) => (f === "sumar" ? "Frente Amplio" : pn(f).split(" y otros")[0]);
export const pc = (f) => POLL_PARTY[f]?.c() ?? FAM[f]?.color ?? "#888";
export const nm = (x, d = 1) => (x == null ? "·" : x.toFixed(d).replace(".", ","));
export const frecuencia = (s) => (s >= 0.095 ? `${Math.round(s * 10)} de cada 10` : `${Math.max(1, Math.round(s * 100))} de cada 100`);
export const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export const colorVoto = (f) => { const c = partyColor(f); return c === "#888" ? pc(f) : c; };   // partyColor has no "reg": its family colour
export const nombre = (f, anio) => (f === "sumar" && anio === "2023" ? "Sumar" : short(f));   // the Sumar space ran as Sumar in 2023
export const pctVoto = (x) => `${nm(x)}%`;
// light to dark in a party's colour (t from 0 to 1), from the page background towards a darker shade of the colour
export const rampa = (c) => d3.interpolateLab(d3.interpolateLab(cssVar("--surface"), c)(0.14), d3.color(c).darker(0.9));
// "Más votado": the lead of the first party over the second, in points, in four steps
export const VENTAJA = [5, 10, 20];
export const VENTAJA_LAB = ["hasta 5", "5–10", "10–20", "más de 20"];
export const pasoVentaja = (x) => d3.bisectRight(VENTAJA, x);
export const toneMasVotado = (f, i) => rampa(colorVoto(f))(0.25 + 0.75 * i / 3);
// three-letter labels of the 52 provinces (INE codes), the same letters as the Senate map's constituencies
export const ABREV = {
  "01": "ALA", "02": "ALB", "03": "ALI", "04": "ALM", "05": "ÁVI", "06": "BAD", "07": "BAL", "08": "BCN", "09": "BUR", "10": "CÁC",
  "11": "CÁD", "12": "CAS", "13": "CRE", "14": "COR", "15": "ACO", "16": "CUE", "17": "GIR", "18": "GRA", "19": "GUA", "20": "GIP",
  "21": "HUE", "22": "HSC", "23": "JAÉ", "24": "LEÓ", "25": "LLE", "26": "RIO", "27": "LUG", "28": "MAD", "29": "MÁL", "30": "MUR",
  "31": "NAV", "32": "OUR", "33": "AST", "34": "PAL", "35": "LPA", "36": "PON", "37": "SAL", "38": "TFE", "39": "CAN", "40": "SEG",
  "41": "SEV", "42": "SOR", "43": "TAR", "44": "TER", "45": "TOL", "46": "VAL", "47": "VLL", "48": "BIZ", "49": "ZAM", "50": "ZAR",
  "51": "CEU", "52": "MEL",
};

// the 52 provinces, merged from the municipalities by the first two digits of their INE code, drawn with the same
// composite projection (Canaries inset) as the municipal map
let provGeo;
export async function provincias() {
  if (provGeo) return provGeo;
  const [topo, { path, borders }] = await Promise.all([load("municipios.topo.json"), getGeo()]);
  const by = d3.group(topo.objects.municipalities.geometries, (g) => String(g.id).slice(0, 2));
  const features = [...by].map(([prov, gs]) => rewind({ type: "Feature", id: prov, geometry: topojson.merge(topo, gs) }));
  provGeo = { features, path, borders };
  return provGeo;
}

// 2023 general election per province (dhondt.json, from Interior): share of the valid vote per family and the most voted
export function resultados23(dh) {
  const out = {};
  for (const p of dh["generales_2023-07"]) {
    const valid = d3.sum(p.l, (l) => l[2]) + p.bl, v = {}, esc = {}, nom = {};
    for (const [sig, f0, x, e] of p.l) {
      const f = f0 === "izq" ? "sumar" : f0;
      if (f !== "otros") v[f] = (v[f] ?? 0) + 100 * x / valid;
      if (e) { esc[f] = (esc[f] ?? 0) + e; if (f === "otros" || f === "reg") nom[f] = sig; }   // seats; a seat outside the named families keeps its list's name
    }
    const [[f1, x1], [, x2] = [null, 0]] = Object.entries(v).sort((x, y) => y[1] - x[1]);
    out[p.prov] = { voto: v, primero: [f1, x1, x1 - x2], esc, nom };
  }
  return out;
}

/** "Más votado" for one year: the fill of a province, its tooltip, the legend and the aria label.
 *  D: provincias_29n.json; R23: resultados23() (needed for anio "2023"); T: the parts of textos/provincia.md. */
export function masVotado(D, R23, anio, T) {
  const y23 = anio === "2023";
  const pri = (p) => (y23 ? R23[p.prov]?.primero : p.primero);
  const votoDe = (p) => (y23 ? R23[p.prov]?.voto : p.voto) ?? {};
  const medio = (x) => (Array.isArray(x) ? x[0] : x);
  // the parties first somewhere, by number of provinces
  const lideres = [...d3.rollup(D.provincias.filter(pri), (g) => g.length, (p) => pri(p)[0])].sort((x, y) => y[1] - x[1]).map(([f]) => f);
  const fill = (p) => { const x = pri(p); return x ? toneMasVotado(x[0], pasoVentaja(x[2])) : "url(#pv-hatch)"; };
  const tip = (p) => {
    const x = pri(p), v = votoDe(p)[x[0]];
    return md(T.tooltip_mas_votado, { vars: { provincia: p.n, partido: nombre(x[0], anio), voto: pctVoto(medio(v)), ventaja: nm(x[2]),
      frecuencia: y23 ? null : frecuencia(x[1]) }, flags: { proyeccion: !y23 }, page: "provincia" }).html;
  };
  const legend = `<div class="pv-leg-mv"><span class="muted">Más votado${y23 ? " en 2023" : ""}; ventaja sobre el segundo, en puntos</span>
      <span></span>${VENTAJA_LAB.map((l) => `<span class="pv-leg-h">${l}</span>`).join("")}
      ${lideres.map((f) => `<span>${nombre(f, anio)}</span>${d3.range(4).map((i) => `<i class="sw" style="background:${toneMasVotado(f, i)}"></i>`).join("")}`).join("")}</div>`;
  const nota = md(T.nota_mas_votado, { vars: { simulaciones: d3.format(",.0f")(D.draws) }, flags: { proyeccion: !y23 }, page: "provincia" }).html;
  // the leader and its share, for the map labels ("MAD 38,2")
  const lider = (p) => { const x = pri(p); return x ? { f: x[0], voto: medio(votoDe(p)[x[0]]) } : null; };
  return { fill, tip, legend, nota, lider, aria: `Mapa de provincias por partido más votado${y23 ? " en 2023" : ""}` };
}


// "Bloques": each province in the colour of the bloc that leads in votes there, with the groups of "Forma tu mayoría"
// (at: {party: "izquierda" | "otros" | "derecha"}, the reader's grouping); a party not in that box (no seat in the central
// scenario) counts in its starting bloc. The share of a bloc is the sum of its parties' shares (medians in the projection).
export const BLOQUES = [["izquierda", "Izquierda", "#e30613"], ["otros", "Otros", "#9b9a93"], ["derecha", "Derecha", "#1d84ce"]];
const BQ = Object.fromEntries(BLOQUES.map(([g, n, c]) => [g, { n, c }]));
export const toneBloque = (g, i) => rampa(BQ[g].c)(0.25 + 0.75 * i / 3);
export function porBloques(D, R23, anio, T, at = {}) {
  const y23 = anio === "2023";
  const grupo = (f) => at[f] ?? BLOQUE_INICIAL[f] ?? "otros";
  const medio = (x) => (Array.isArray(x) ? x[0] : x);
  const cache = new Map();
  const reparto = (p) => {
    if (cache.has(p.prov)) return cache.get(p.prov);
    const v = (y23 ? R23[p.prov]?.voto : p.voto) ?? {}, b = { izquierda: 0, otros: 0, derecha: 0 };
    let n = 0;
    for (const [f, x] of Object.entries(v)) { const m = medio(x); if (f !== "otros" && m != null) { b[grupo(f)] += m; n++; } }
    const o = Object.entries(b).sort((x, y) => y[1] - x[1]);
    const r = n ? { b, primero: o[0][0], ventaja: o[0][1] - o[1][1], resto: Math.max(0, 100 - b.izquierda - b.otros - b.derecha) } : null;
    cache.set(p.prov, r);
    return r;
  };
  const fill = (p) => { const r = reparto(p); return r ? toneBloque(r.primero, pasoVentaja(r.ventaja)) : "url(#pv-hatch)"; };
  const tip = (p) => {
    const r = reparto(p);
    if (!r) return `<b>${p.n}</b>`;
    return md(T.tooltip_bloques, { vars: { provincia: p.n, bloque: BQ[r.primero].n, ventaja: nm(r.ventaja), izquierda: pctVoto(r.b.izquierda), otros: pctVoto(r.b.otros),
      derecha: pctVoto(r.b.derecha), resto: pctVoto(r.resto) }, flags: { proyeccion: !y23, resto: r.resto >= 0.5 }, page: "provincia" }).html;
  };
  const lideres = [...new Set(D.provincias.map(reparto).filter(Boolean).map((r) => r.primero))].sort((x, y) => BLOQUES.findIndex((b) => b[0] === x) - BLOQUES.findIndex((b) => b[0] === y));
  const legend = `<div class="pv-leg-mv"><span class="muted">Bloque más votado${y23 ? " en 2023" : ""}; ventaja sobre el segundo, en puntos</span>
      <span></span>${VENTAJA_LAB.map((l) => `<span class="pv-leg-h">${l}</span>`).join("")}
      ${lideres.map((g) => `<span>${BQ[g].n}</span>${d3.range(4).map((i) => `<i class="sw" style="background:${toneBloque(g, i)}"></i>`).join("")}`).join("")}</div>`;
  const sinEscano = [...new Set(D.provincias.flatMap((p) => Object.keys((y23 ? R23[p.prov]?.voto : p.voto) ?? {})))].filter((f) => f !== "otros" && !(f in at));
  const nota = T.nota_bloques ? md(T.nota_bloques, { vars: { fuera: sinEscano.map((f) => `${nombre(f, anio)} (${BQ[grupo(f)].n.toLowerCase()})`).join(", ") },
    flags: { proyeccion: !y23, fuera: sinEscano.length > 0 }, page: "provincia" }).html : "";
  const lider = (p) => { const r = reparto(p); return r ? { voto: r.b[r.primero], c: BQ[r.primero].c } : null; };
  return { fill, tip, legend, nota, lider, aria: `Mapa de provincias por bloque más votado${y23 ? " en 2023" : ""}` };
}

// "por diputados": the party (or the reader's bloc) with most seats. 2026: the likeliest split of the draws (the commonest
// seat vector, p.todos from export_provincias_29n.py), and how often each one leads in seats across all draws; 2023: the
// seats won. Small provinces tie (2-2, 1-1-1): a tie is drawn in stripes of the tied colours and named in the tooltip.
// Darker: a bigger lead in seats over the second.
export const VENTAJA_ESC = [2, 3, 5];
export const VENTAJA_ESC_LAB = ["1", "2", "3 o 4", "5 o más"];
export function porEscanos(D, R23, anio, T, { at = {}, bloques = false } = {}) {
  const y23 = anio === "2023";
  const grupo = (f) => at[f] ?? BLOQUE_INICIAL[f] ?? "otros";
  const clave = (f) => (bloques ? grupo(f) : f);
  const nomDe = (p, k) => (bloques ? BQ[k].n : (y23 && R23[p.prov]?.nom?.[k]) || (k === "otros" ? "Otras" : nombre(k, anio)));
  const colDe = (k) => (bloques ? BQ[k].c : colorVoto(k));
  const tone = (k, i) => rampa(colDe(k))(0.25 + 0.75 * i / 3);
  const rango = (k) => { const i = bloques ? BLOQUES.findIndex((b) => b[0] === k) : IDEO.indexOf(k === "sumar" ? "sumar" : k); return i < 0 ? 99 : i; };
  // near certainty reads better in hundredths than "10 de cada 10"
  const frec = (x) => (x >= 0.95 && x < 0.995 ? `${Math.round(x * 100)} de cada 100` : x >= 0.995 ? "más de 99 de cada 100" : frecuencia(x));
  // seats per key for one seat vector, and its leaders (several when tied) and lead over the next
  const suma = (fs, row) => { const o = {}; fs.forEach((f, j) => { if (row[j]) o[clave(f)] = (o[clave(f)] ?? 0) + row[j]; }); return o; };
  const lideres = (o) => {
    const e = Object.entries(o).sort((x, y) => y[1] - x[1]);
    if (!e.length) return null;
    const top = e.filter(([, n]) => n === e[0][1]).map(([k]) => k).sort((a, b) => rango(a) - rango(b));   // tied: left to right, always in the same order
    return { top, n: e[0][1], ventaja: top.length > 1 ? 0 : e[0][1] - (e[1]?.[1] ?? 0), o };
  };
  const cache = new Map();
  const info = (p) => {
    if (cache.has(p.prov)) return cache.get(p.prov);
    let r = null;
    if (y23) { const e = R23[p.prov]?.esc; if (e) r = lideres(suma(Object.keys(e), Object.values(e))); }
    else if (p.todos) {
      const { f, n } = p.todos, tot = d3.sum(n, (x) => x[0]);
      const modos = new Map(), freq = new Map();
      for (const row of n) {
        const o = suma(f, row.slice(1)), k = JSON.stringify(Object.entries(o).sort());
        modos.set(k, { o, c: (modos.get(k)?.c ?? 0) + row[0] });
        const L = lideres(o), q = L.top.length > 1 ? "empate" : L.top[0];
        freq.set(q, (freq.get(q) ?? 0) + row[0] / tot);
      }
      r = lideres(d3.greatest([...modos.values()], (x) => x.c).o);
      r.freq = [...freq].sort((x, y) => y[1] - x[1]);
      r.pModo = d3.max([...modos.values()], (x) => x.c) / tot;
    }
    cache.set(p.prov, r);
    return r;
  };
  const empId = (top) => `mv-emp-${top.join("-")}`;
  const empates = new Map();
  const fill = (p) => {
    const r = info(p);
    if (!r) return "url(#pv-hatch)";
    if (r.top.length > 1) { empates.set(empId(r.top), r.top); return `url(#${empId(r.top)})`; }
    return tone(r.top[0], d3.bisectRight(VENTAJA_ESC, r.ventaja));
  };
  D.provincias.forEach(fill);   // collects the ties, for the patterns and the legend
  const patterns = [...empates].map(([id, ks]) => {
    const w = 4, cs = ks.map((k) => tone(k, 1));
    return `<pattern id="${id}" width="${w * cs.length}" height="${w * cs.length}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">${cs.map((c, i) => `<rect x="${i * w}" width="${w}" height="${w * cs.length}" fill="${c}"></rect>`).join("")}</pattern>`;
  }).join("");
  const y = (ks, p) => { const n = ks.map((k) => nomDe(p, k)); return n.length > 1 ? `${n.slice(0, -1).join(", ")} y ${n.at(-1)}` : n[0]; };
  const repartoTxt = (p, o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${nomDe(p, k)} ${n}`).join(", ");
  const tip = (p) => {
    const r = info(p);
    if (!r) return `<b>${p.n}</b>`;
    const freq = r.freq ? r.freq.filter(([, x]) => x >= 0.005).map(([k, x]) => `${k === "empate" ? "empate" : nomDe(p, k)}, ${frec(x)}`).join("; ") : null;
    return md(T.tooltip_escanos, { vars: { provincia: p.n, lider: y(r.top, p), escanos: `${r.n} ${r.n === 1 ? "escaño" : "escaños"}`, ventaja: r.ventaja, ventaja_palabra: r.ventaja === 1 ? "escaño" : "escaños",
      reparto: repartoTxt(p, r.o), frecuencias: freq, prob_reparto: r.pModo != null ? frec(r.pModo) : null },
      flags: { proyeccion: !y23, empate: r.top.length > 1, bloques }, page: "provincia" }).html;
  };
  const presentes = [...new Set(D.provincias.map(info).filter((r) => r && r.top.length === 1).map((r) => r.top[0]))];
  const orden = bloques ? BLOQUES.map((b) => b[0]).filter((k) => presentes.includes(k))
    : presentes.sort((a, b) => d3.sum(D.provincias, (p) => info(p)?.top[0] === b) - d3.sum(D.provincias, (p) => info(p)?.top[0] === a));
  const nomLeg = (k) => (bloques ? BQ[k].n : k === "otros" ? "Otras" : nombre(k, anio));
  const sw = (ks) => `background:repeating-linear-gradient(45deg, ${ks.map((k, i) => `${tone(k, 1)} ${i * 4}px ${(i + 1) * 4}px`).join(", ")})`;
  const legend = `<div class="pv-leg-mv"><span class="muted">${bloques ? "Bloque" : "Partido"} con más diputados${y23 ? " en 2023" : ""}; ventaja sobre el segundo, en escaños</span>
      <span></span>${VENTAJA_ESC_LAB.map((l) => `<span class="pv-leg-h">${l}</span>`).join("")}
      ${orden.map((k) => `<span>${nomLeg(k)}</span>${d3.range(4).map((i) => `<i class="sw" style="background:${tone(k, i)}"></i>`).join("")}`).join("")}</div>
      ${empates.size ? `<div class="mv-leg-emp">${[...empates.values()].map((ks) => `<span><i class="sw" style="${sw(ks)}"></i>empate ${ks.map(nomLeg).slice(0, -1).join(", ")} y ${nomLeg(ks.at(-1))}</span>`).join("")}</div>` : ""}`;
  const nota = T.nota_escanos ? md(T.nota_escanos, { vars: { simulaciones: d3.format(",.0f")(D.draws) }, flags: { proyeccion: !y23, bloques }, page: "provincia" }).html : "";
  const lider = (p) => {
    const r = info(p);
    if (!r) return null;
    const t = r.top.length > 1 ? r.top.map((k) => r.o[k]).join("=") : String(r.n);
    return { t, c: r.top.length > 1 ? `url(#${empId(r.top)})` : colDe(r.top[0]) };
  };
  return { fill, tip, legend, nota, lider, patterns, aria: `Mapa de provincias por ${bloques ? "bloque" : "partido"} con más diputados${y23 ? " en 2023" : ""}` };
}

// "Cambios desde 2023" (2026 only): the bloc that leads each province in 2026, with the reader's groups, against the one
// that led it in 2023. Votes: the bloc first in each of the first draws of provincias_29n_draws.json (VD); seats: as in
// porEscanos (the likeliest split, all draws in p.todos). A province whose leader changes is drawn strong and outlined,
// one that keeps it is muted; the tooltip says how often the change happens across simulations.
export function porCambios(D, R23, VD, T, { at = {}, escanos = false } = {}) {
  const grupo = (f) => at[f] ?? BLOQUE_INICIAL[f] ?? "otros";
  const lider = (o) => { const e = Object.entries(o).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]); if (!e.length) return null; return e.length > 1 && e[1][1] === e[0][1] ? "empate" : e[0][0]; };
  const porGrupo = (fs, xs) => { const o = { izquierda: 0, otros: 0, derecha: 0 }; fs.forEach((f, j) => { if (f !== "otros" || escanos) o[grupo(f)] += xs[j]; }); return o; };
  const frec = (x) => (x >= 0.95 && x < 0.995 ? `${Math.round(x * 100)} de cada 100` : x >= 0.995 ? "más de 99 de cada 100" : x < 0.005 ? "menos de 1 de cada 100" : frecuencia(x));
  const cache = new Map();
  const info = (p) => {
    if (cache.has(p.prov)) return cache.get(p.prov);
    const r23 = R23[p.prov];
    let antes = null, freq = new Map(), tot = 0, o26 = null;
    if (escanos) {
      if (r23?.esc) antes = lider(porGrupo(Object.keys(r23.esc), Object.values(r23.esc)));
      const modos = new Map();
      for (const row of p.todos?.n ?? []) {
        const o = porGrupo(p.todos.f, row.slice(1)), k = lider(o), kk = JSON.stringify(o);
        freq.set(k, (freq.get(k) ?? 0) + row[0]); tot += row[0];
        modos.set(kk, { o, c: (modos.get(kk)?.c ?? 0) + row[0] });
      }
      o26 = d3.greatest([...modos.values()], (x) => x.c)?.o;
    } else {
      if (r23?.voto) antes = lider(porGrupo(Object.keys(r23.voto), Object.values(r23.voto)));
      const v = VD?.provincias?.[p.prov];
      for (const row of v?.d ?? []) { const k = lider(porGrupo(v.f, row)); freq.set(k, (freq.get(k) ?? 0) + 1); tot++; }
      const med = porGrupo(Object.keys(p.voto), Object.values(p.voto).map((x) => x[0]));
      o26 = med;
    }
    if (!tot || !antes) { cache.set(p.prov, null); return null; }
    const ahora = escanos ? lider(o26) : d3.greatest([...freq], (x) => x[1])[0];
    const r = { antes, ahora, cambia: ahora !== antes, pCambio: 1 - (freq.get(antes) ?? 0) / tot, o26 };
    cache.set(p.prov, r);
    return r;
  };
  const nom = (k) => (k === "empate" ? "un empate" : BQ[k].n);
  const fill = (p) => {
    const r = info(p);
    if (!r) return "url(#pv-hatch)";
    if (r.ahora === "empate") return cssVar("--nodata");
    return r.cambia ? rampa(BQ[r.ahora].c)(1) : rampa(BQ[r.ahora].c)(0.12);
  };
  const tip = (p) => {
    const r = info(p);
    if (!r) return `<b>${p.n}</b>`;
    return md(T.tooltip_cambios, { vars: { provincia: p.n, antes: nom(r.antes), ahora: nom(r.ahora), frecuencia: frec(r.pCambio) },
      flags: { cambia: r.cambia, escanos }, page: "provincia" }).html;
  };
  const presentes = BLOQUES.map((b) => b[0]).filter((g) => D.provincias.some((p) => info(p)?.ahora === g));
  const hayEmpate = D.provincias.some((p) => info(p)?.ahora === "empate");
  const nCambia = D.provincias.filter((p) => info(p)?.cambia).length;
  const legend = `<div class="mv-leg-cambio"><span class="muted">Bloque con más ${escanos ? "diputados" : "votos"} en 2026, comparado con 2023</span>
      ${presentes.map((g) => `<span><i class="sw mv-sw-cambio" style="background:${rampa(BQ[g].c)(1)}"></i>${BQ[g].n}, cambia</span><span><i class="sw" style="background:${rampa(BQ[g].c)(0.12)}"></i>${BQ[g].n}, sin cambio</span>`).join("")}
      ${hayEmpate ? `<span><i class="sw" style="background:var(--nodata)"></i>empate</span>` : ""}</div>`;
  const nota = T.nota_cambios ? md(T.nota_cambios, { vars: { cambian: nCambia, simulaciones: escanos ? d3.format(",.0f")(D.draws) : String(VD?.draws ?? "") }, flags: { escanos }, page: "provincia" }).html : "";
  const liderLab = (p) => {
    const r = info(p);
    if (!r) return null;
    if (r.ahora === "empate") return { t: "=", c: cssVar("--ink-3") };
    return { t: escanos ? String(r.o26[r.ahora]) : nm(r.o26[r.ahora]), c: BQ[r.ahora].c };
  };
  const cambiadas = D.provincias.filter((p) => info(p)?.cambia).map((p) => p.prov);
  return { fill, tip, legend, nota, lider: liderLab, cambiadas, aria: `Mapa de provincias que cambian de bloque ganador ${escanos ? "en diputados" : "en votos"} desde 2023` };
}

// state kept while the front page is redrawn (another model) and in the URL (#inicio?mapa=bloques&por=escanos&anio=2023):
// the year, the map (party or bloc) and how it counts (votes or seats)
const PORTADA = { anio: "2026", modo: "mv", por: "votos" };
const ESTADO = { anio: ["2026", "2023"], mapa: ["mv", "bloques", "cambios"], por: ["votos", "escanos"] };
function leerHash() {
  const q = new URLSearchParams(location.hash.split("?")[1] ?? "");
  if (ESTADO.anio.includes(q.get("anio"))) PORTADA.anio = q.get("anio");
  if (ESTADO.mapa.includes(q.get("mapa"))) PORTADA.modo = q.get("mapa");
  if (ESTADO.por.includes(q.get("por"))) PORTADA.por = q.get("por");
}
function escribirHash() {
  const [base, qs] = location.hash.split("?"), q = new URLSearchParams(qs ?? "");
  const set = (k, v, def) => (v === def ? q.delete(k) : q.set(k, v));
  set("anio", PORTADA.anio, "2026"); set("mapa", PORTADA.modo, "mv"); set("por", PORTADA.por, "votos");
  const h = `${base || "#inicio"}${q.toString() ? `?${q}` : ""}`;
  if (h !== location.hash) history.replaceState(null, "", h);
}

// ------------------------------------------------------------------ labels: every province, on it or in a side column
// Placement in screen pixels (the SVG's user units are the container's pixels, so text keeps its size). Each pill first
// tries its province's anchor (larger provinces first), then a few spots around it, never leaving the province. A pill that
// finds no free spot is called out: it goes to the left or right edge (the side nearest its province), in the sea beside
// the coast where there is room (a land mask says where), stacked in the order of the anchors and joined to the province by
// a thin leader. On a wide map a column may be reserved on one side or both (the map shrinks to make it), when that costs less.
const PILL = { pad: 4, gap: 3 };
let canvas;
function medir(text, font) {
  canvas ??= document.createElement("canvas");
  const c = canvas.getContext("2d");
  c.font = font;
  return c.measureText(text).width;
}
// land of the map at scale s and offset (tx, ty), as a summed-area table: tierra(x, y, w, h) counts land pixels in a box
function mascara(W, H, shapes, s, tx, ty) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const c = cv.getContext("2d", { willReadFrequently: true });
  c.setTransform(s, 0, 0, s, tx, ty);
  for (const d of shapes) c.fill(new Path2D(d));
  const a = c.getImageData(0, 0, W, H).data, S = new Uint32Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) {
    let row = 0;
    for (let x = 0; x < W; x++) { row += a[4 * (y * W + x) + 3] > 40 ? 1 : 0; S[(y + 1) * (W + 1) + x + 1] = S[y * (W + 1) + x + 1] + row; }
  }
  return (x, y, w, h) => {
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y)), x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
    if (x1 <= x0 || y1 <= y0) return 0;
    return S[y1 * (W + 1) + x1] - S[y0 * (W + 1) + x1] - S[y1 * (W + 1) + x0] + S[y0 * (W + 1) + x0];
  };
}
function colocar({ W, labs, mapBox, inside, fs, shapes }) {
  const h = Math.round(fs * 1.55), dotR = fs * 0.32, edge = 4, gapY = h + 2;
  labs.forEach((l) => { l.w = Math.ceil(PILL.pad + 2 * dotR + PILL.gap + l.tw + PILL.pad); l.h = h; });
  const colW = d3.max(labs, (l) => l.w) + 14;
  const [[x0, y0], [x1, y1]] = mapBox, mw = x1 - x0, mh = y1 - y0;
  // one layout with columns reserved on the sides given; returns its cost (pills called out, how far they drift from their
  // anchors, how much the box grows below the map, how much the map shrinks)
  const intento = (cols) => {
    const left = edge + (cols.L ? colW : 0), right = W - edge - (cols.R ? colW : 0);
    const s = (right - left) / mw, H0 = Math.ceil(mh * s) + 2 * edge;
    const tx = left - x0 * s, ty = edge - y0 * s;
    const placed = [], out = [];
    const hit = (r) => placed.some((q) => r.x < q.x + q.w + 1 && q.x < r.x + r.w + 1 && r.y < q.y + q.h + 1 && q.y < r.y + r.h + 1);
    const order = [...labs].sort((a, b) => b.area - a.area);
    for (const l of order) { l.sx = l.ax * s + tx; l.sy = l.ay * s + ty; l.r = null; l.col = null; }
    const libre = (l, dx, dy) => {
      const cx = l.sx + dx, cy = l.sy + dy, r = { x: cx - l.w / 2, y: cy - h / 2, w: l.w, h };
      if (r.x < left || r.x + r.w > right || r.y < 0 || r.y + r.h > H0) return null;
      if ((dx || dy) && !inside(l, (cx - tx) / s, (cy - ty) / s)) return null;
      return hit(r) ? null : r;
    };
    // first every pill on its anchor (larger provinces first), then the rest around their anchors
    for (const l of order) { const r = libre(l, 0, 0); if (r) { placed.push(r); l.r = r; } }
    const cand = [];
    for (const dy of [0, -0.5, 0.5, -1, 1, -1.5, 1.5, -2, 2]) for (const dx of [0, -0.2, 0.2, -0.4, 0.4, -0.6, 0.6]) if (dx || dy) cand.push([dx, dy]);
    cand.sort((a, b) => Math.hypot(a[0] * 2, a[1]) - Math.hypot(b[0] * 2, b[1]));
    for (const l of order) {
      if (l.r) continue;
      for (const [dx, dy] of cand) { const r = libre(l, dx * l.w, dy * h); if (r) { placed.push(r); l.r = r; break; } }
      if (!l.r) out.push(l);
    }
    // the called-out pills: down each edge in the order of their anchors, each at the free height nearest its anchor
    // (free: no land within 3 px, no other pill); below the map there is always room, so none is ever dropped
    const mid = d3.median(labs, (l) => l.sx);   // the side nearest the province: split at the median anchor (the Canaries inset sits far left)
    const Hmax = H0 + (out.length + 1) * gapY;
    const tierra = mascara(W, H0, shapes, s, tx, ty);
    let deriva = 0;
    for (const side of ["L", "R"]) {
      const ls = out.filter((l) => (l.sx < mid) === (side === "L")).sort((a, b) => a.sy - b.sy);
      let y = edge;
      for (const l of ls) {
        const x = side === "L" ? edge : W - edge - l.w, target = l.sy - h / 2;
        let best = null;
        for (let yy = y; yy + h <= Hmax - edge; yy++) {
          if (best && yy - target > Math.abs(best.y - target)) break;   // further down only moves away
          const r = { x, y: yy, w: l.w, h };
          if (yy < H0 && tierra(x - 3, yy - 3, l.w + 6, h + 6) > 0) continue;
          if (hit(r)) continue;
          if (!best || Math.abs(yy - target) < Math.abs(best.y - target)) best = r;
        }
        best ??= { x, y, w: l.w, h };
        deriva += Math.abs(best.y - target) / h;
        placed.push(best); l.r = best; l.col = side; y = best.y + gapY;
      }
    }
    const H = Math.max(H0, d3.max(placed, (r) => r.y + r.h + edge) ?? 0);
    const coste = 4 * out.length + deriva + 3 * (H - H0) / h + 25 * (1 - s * mw / (W - 2 * edge));
    return { s, tx, ty, H, coste };
  };
  // no columns, and on a wide map (not a phone nor the tablero's narrow card) also a column on either side or both
  const opciones = W >= 560 ? [{ L: false, R: false }, { L: true, R: false }, { L: false, R: true }, { L: true, R: true }] : [{ L: false, R: false }];
  const mejor = opciones.map((c) => ({ c, k: intento(c).coste })).sort((a, b) => a.k - b.k)[0].c;
  return { ...intento(mejor), h, dotR, cols: mejor };
}

// ------------------------------------------------------------------ the province card (click or tap on the map)
const f0 = (x) => d3.format(",.0f")(x);
const signo = (x) => (x == null ? "·" : `${x > 0.05 ? "+" : x < -0.05 ? "−" : ""}${nm(Math.abs(x))}`);
const iniciales = (s) => { const w = s.replace(/[^\p{L}\s]/gu, "").split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 2)).toUpperCase(); };
// leader photos: data/lideres.json ({party: {img, nombre, autor, licencia, fuente}}, img relative to that file) when it exists,
// else a badge in the party's colour with its initials; the photos shown are credited at the foot of the card
let LIDERES;
const lideresJson = () => (LIDERES ??= load("lideres.json").catch(() => null));
function badge(f, name, c, L, usadas) {
  const x = L?.[f];
  if (x?.img) {
    usadas?.add(f);
    return `<img class="mvp-foto" src="${new URL(x.img, new URL("../data/lideres.json", import.meta.url)).href}" alt="" title="${x.nombre ?? ""}" style="border-color:${c}">`;
  }
  return `<span class="mvp-ini" style="background:${c}" aria-hidden="true">${iniciales(name)}</span>`;
}
const creditos = (usadas, L) => (usadas.size ? `<details class="mvp-cred"><summary>Créditos de las fotos</summary>${[...usadas].map((f) => { const x = L[f];
  return `<div>${short(f)}: ${x.nombre ?? ""}${x.autor ? `, foto de ${x.autor}` : ""}${x.licencia ? ` (${x.licencia})` : ""}${x.fuente ? `, <a href="${x.fuente}" target="_blank" rel="noopener">fuente</a>` : ""}</div>`; }).join("")}</details>` : "");
async function fichaHtml(p, anio, T) {
  const [S, dh, L] = await Promise.all([load("series.json"), load("dhondt.json"), lideresJson()]);
  const y23 = anio === "2023";
  const r23 = dh["generales_2023-07"].find((x) => x.prov === p.prov);
  const validos = r23 ? d3.sum(r23.l, (l) => l[2]) + r23.bl : null;
  const s23 = S.provincias?.[p.prov]?.s?.["generales_2023-07"];
  const ccaa = Object.values(S.ccaa ?? {}).find((c) => c.provs?.includes(p.prov))?.n ?? "";
  let filas, cab, esc, frecReparto = null;
  const usadas = new Set();
  if (!y23) {
    esc = p.esc;
    // seats: the most frequent whole allocation of the province (repartos[0]), so the column adds up to the province's seats
    // (medians per party do not: Madrid's summed 38 of 37); without it, the median from pk (Víctor, 2026-11-17)
    const modal = p.repartos?.[0];
    const med = (l) => (modal ? modal.a[l.f] ?? 0 : l.pk.filter((x) => x >= 0.5).length);
    frecReparto = modal ? frecuencia(modal.p) : null;
    const ls = p.listas.map((l) => ({ ...l, m: med(l), v: p.voto[l.f]?.[0] ?? l.v })).sort((a, b) => b.m - a.m || b.v - a.v);
    cab = `<tr><th>Partido</th><th class="num">Esc.</th><th class="num">%</th><th class="num">Votos estim.</th><th class="num">2023</th><th class="num">Var.</th></tr>`;
    filas = ls.map((l) => {
      const n = l.f === "otros" ? "Otras candidaturas" : short(l.f), c = colorVoto(l.f), v23 = p.v23?.[l.f];
      const rango = l.lo === l.hi ? `${l.lo} en 9 de cada 10 simulaciones` : `entre ${l.lo} y ${l.hi} en 9 de cada 10 simulaciones`;
      const marca = l.f === "otros" ? '<span class="mvp-ini mvp-ini-o" aria-hidden="true"></span>' : badge(l.f, n, c, L, usadas);
      return `<tr><td><span class="mvp-p">${marca}<span>${n}</span></span></td>
        <td class="num mvp-esc" data-rango="${n}: ${rango}">${l.m ? `<span class="mvp-chip" style="--c:${c}">${l.m}</span>` : '<span class="mvp-cero">0</span>'}</td><td class="num">${nm(l.v)}</td>
        <td class="num">${validos ? f0(Math.round(l.v / 100 * validos / 100) * 100) : "·"}</td><td class="num">${v23 != null ? nm(v23) : "·"}</td>
        <td class="num">${v23 != null ? signo(l.v - v23) : "·"}</td></tr>`;
    }).join("");
  } else {
    esc = r23?.esc ?? p.esc23;
    const ls = (r23?.l ?? []).map(([sig, f0_, v, e]) => ({ sig, f: f0_ === "izq" ? "sumar" : f0_, v, e, pc: 100 * v / validos })).sort((a, b) => b.e - a.e || b.v - a.v);
    const main = ls.filter((l) => l.e > 0 || l.pc >= 1), resto = ls.filter((l) => !main.includes(l));
    cab = `<tr><th>Candidatura</th><th class="num">Esc.</th><th class="num">%</th><th class="num">Votos</th></tr>`;
    const fila = (n, f, e, pcv, v, c) => `<tr><td><span class="mvp-p">${f ? badge(f, n, c, null) : `<span class="mvp-ini mvp-ini-o" aria-hidden="true"></span>`}<span>${n}</span></span></td>
      <td class="num">${e ? `<span class="mvp-chip" style="--c:${c ?? "var(--ink-3)"}">${e}</span>` : '<span class="mvp-cero">0</span>'}</td><td class="num">${nm(pcv)}</td><td class="num">${f0(v)}</td></tr>`;
    filas = main.map((l) => fila(l.f === "otros" || l.f === "reg" ? l.sig : nombre(l.f, "2023"), l.f === "otros" ? null : l.f, l.e, l.pc, l.v, colorVoto(l.f))).join("")
      + (resto.length ? fila("Otras candidaturas", null, d3.sum(resto, (l) => l.e), d3.sum(resto, (l) => l.pc), d3.sum(resto, (l) => l.v)) : "");
  }
  const part = s23 ? nm(100 * s23.votantes / s23.censo) : null;
  const pie = T.pie_ficha ? md(T.pie_ficha, { vars: { participacion: part ? `${part}%` : null, frecuencia_reparto: frecReparto }, flags: { proyeccion: !y23, participacion: !!part, reparto: !!frecReparto }, page: "provincia" }).html : "";
  return `<div class="mvp-h"><div><div class="mvp-n" id="mvp-titulo">${p.n}</div>
      <div class="mvp-sub">${ccaa ? `<span class="mvp-cc">${ccaa}</span>` : ""}<span>${esc} ${esc === 1 ? "escaño" : "escaños"}${y23 ? " en 2023" : ""}</span></div></div>
      <button type="button" class="mvp-x" aria-label="Cerrar">×</button></div>
    <div class="mvp-t"><table>${cab}${filas}</table></div>
    <div class="mvp-pie">${pie}<a href="#provincia/${p.prov}">Ver la provincia</a>${creditos(usadas, L)}</div>`;
}

/** The front page's map: provinces in the colour of the most voted party, or of the leading bloc with the reader's groups
 *  of "Forma tu mayoría" (2026 projection or 2023 result); every province labelled with its letters and the leader's share,
 *  on the province or in a side column with a leader line; a tooltip on hover; a click or tap opens the province's card
 *  on the map (Esc or × closes it), with a link to #provincia/<code>. el: an empty element; D: provincias_29n.json;
 *  grupos: the object the "Forma tu mayoría" box keeps its groups in. Returns {grupos()}: call it after every regrouping. */
export async function mapaMasVotado(el, D, { grupos = {} } = {}) {
  const [{ features, path, borders }, T] = await Promise.all([provincias(), textos("provincia")]);
  let R23 = null;
  const byCode = Object.fromEntries(D.provincias.map((p) => [p.prov, p]));
  const feats = features.filter((f) => byCode[f.id]);
  // three levels of control, each nested under the one above: the year, then party or bloc, then votes or seats
  leerHash();
  el.innerHTML = `<div class="mv-controls">
    <div class="seg mv-anio" role="group" aria-label="Qué elección"><button type="button" data-a="2026">Proyección 2026</button><button type="button" data-a="2023">Resultados 2023</button></div>
    <div class="mv-nivel mv-n2"><div class="seg mv-modo" role="group" aria-label="Partido o bloque"><button type="button" data-m="mv">Más votado</button><button type="button" data-m="bloques">Bloques</button><button type="button" data-m="cambios">Cambios desde 2023</button></div>
      <div class="mv-nivel mv-n3"><div class="seg mv-por" role="group" aria-label="Por votos o por diputados"><button type="button" data-p="votos">por votos</button><button type="button" data-p="escanos">por diputados</button></div></div></div></div>
    <div class="mv-caja"><div class="mapwrap pvmap mvmap"><svg role="img"></svg></div><div class="mv-ficha" role="dialog" aria-labelledby="mvp-titulo" hidden></div></div>
    <div class="legend pv-legend mv-legend"></div><div class="mv-nota"></div>`;
  const box = el.querySelector(".mvmap"), caja = el.querySelector(".mv-caja"), ficha = el.querySelector(".mv-ficha");
  const svg = d3.select(el).select("svg");
  svg.append("defs").html(`<pattern id="pv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" style="fill:var(--nodata)"></rect><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--ink-3);stroke-width:1.2;opacity:.45"></line></pattern>`);
  const defsEmp = svg.append("defs");   // the stripes of the ties (por diputados), rewritten on every paint
  const mapBox = path.bounds({ type: "FeatureCollection", features });
  const gm = svg.append("g").attr("class", "mv-g");
  let sel = null;   // the province whose card is open
  // zoom on the open province, as Su Momento does: the province fills the part of the map the card leaves free (beside it,
  // or above it on a narrow map or a phone's sheet); the labels fade out while zoomed and come back on closing (Víctor, 2026-11-17)
  const featBy = Object.fromEntries(features.map((f) => [f.id, f]));
  function zoomA(id) {
    if (!lay) return;
    const base = `translate(${lay.tx},${lay.ty}) scale(${lay.s})`;
    svg.classed("mv-zoom", !!id);
    if (!id || !featBy[id]) { gm.interrupt().transition().duration(400).attr("transform", base); return; }
    const [[x0, y0], [x1, y1]] = path.bounds(featBy[id]);
    const W = +svg.attr("width"), H = lay.H, r = box.getBoundingClientRect(), u = W / (r.width || W);
    let fx = 0, fy = 0, fw = W, fh = H;
    if (!ficha.hidden) {
      const fb = ficha.getBoundingClientRect();
      if (ficha.classList.contains("mv-hoja")) fh = Math.min(H, Math.max(H * 0.4, (fb.top - r.top) * u));
      else if ((fb.left - r.left) * u > W * 0.35) fw = (fb.left - r.left) * u - 8;
      else fh = Math.min(H, Math.max(H * 0.3, (fb.top - r.top) * u));
    }
    const pad = Math.max(12, Math.min(fw, fh) * 0.08);
    const k = Math.max(lay.s, Math.min((fw - 2 * pad) / Math.max(1, x1 - x0), (fh - 2 * pad) / Math.max(1, y1 - y0), lay.s * 8));
    gm.interrupt().transition().duration(450).attr("transform", `translate(${fx + fw / 2 - k * (x0 + x1) / 2},${fy + fh / 2 - k * (y0 + y1) / 2}) scale(${k})`);
  }
  const pv = gm.selectAll("path.pv").data(feats).join("path").attr("class", "pv").attr("d", path).attr("data-prov", (f) => f.id);
  gm.append("path").attr("class", "prov").attr("d", borders);
  const gCambio = gm.append("g").attr("class", "mv-cambios");   // outlines of the provinces that change bloc (Cambios desde 2023)
  const hl = gm.append("path").attr("class", "pv-hl"), sl = gm.append("path").attr("class", "pv-hl mv-sel");
  const gLead = svg.append("g").attr("class", "mv-leads"), gl = svg.append("g").attr("class", "mv-labs");
  // touch: no hover bubble (the tap opens the card, which says more)
  let touch = false;
  svg.on("pointerdown", (ev) => { touch = ev.pointerType === "touch"; });
  const over = (id, ev) => { hl.attr("d", pv.filter((f) => f.id === id).attr("d")); if (!touch) showTip(cur.tip(byCode[id]), ev); };
  const out = () => { hideTip(); hl.attr("d", null); };
  pv.on("mousemove", (ev, f) => over(f.id, ev)).on("mouseleave", out).on("click", (ev, f) => { ev.stopPropagation(); abrir(f.id, ev); });
  svg.on("click", () => cerrar());
  // label anchor: the centroid of the largest polygon (islands and enclaves otherwise pull it out to sea)
  const area = Object.fromEntries(feats.map((f) => [f.id, path.area(f)]));
  const anchor = (f) => {
    const g = f.geometry;
    if (g.type !== "MultiPolygon") return path.centroid(f);
    const parts = g.coordinates.map((c) => ({ type: "Polygon", coordinates: c }));
    return path.centroid(parts[d3.maxIndex(parts, (q) => path.area(q))]);
  };
  const anchors = Object.fromEntries(feats.map((f) => [f.id, anchor(f)]));
  const pathEl = Object.fromEntries(pv.nodes().map((n) => [n.dataset.prov, n]));
  const shapes = feats.map((f) => path(f));
  const pt = svg.node().createSVGPoint();
  const inside = (l, x, y) => { pt.x = x; pt.y = y; return pathEl[l.id].isPointInFill(pt); };
  const seg = el.querySelector(".mv-anio"), mseg = el.querySelector(".mv-modo"), pseg = el.querySelector(".mv-por"), leg = el.querySelector(".mv-legend"), nota = el.querySelector(".mv-nota");
  let cur, lay;
  function etiquetas() {
    const W = Math.round(box.clientWidth) || 600;
    const fs = W >= 900 ? 11 : W >= 560 ? 10 : 9, font = `600 ${fs}px Inter, system-ui, sans-serif`;
    const labs = D.provincias.map((p) => ({ id: p.prov, l: cur.lider(p), a: anchors[p.prov] })).filter((d) => d.l && d.a && (d.l.t != null || d.l.voto != null))
      .map((d) => ({ id: d.id, ax: d.a[0], ay: d.a[1], area: area[d.id], c: d.l.c, text: `${ABREV[d.id] ?? d.id} ${d.l.t ?? nm(d.l.voto)}` }));
    // widths measured as drawn (the SVG text has tabular figures, which a canvas does not apply)
    const probe = gl.append("g").attr("class", "mv-pill").append("text").style("font-size", `${fs}px`);
    labs.forEach((l) => { probe.text(l.text); l.tw = probe.node().getComputedTextLength() || medir(l.text, font); });
    probe.node().parentNode.remove();
    lay = colocar({ W, labs, mapBox, inside, fs, shapes });
    svg.attr("viewBox", `0 0 ${W} ${lay.H}`).attr("width", W).attr("height", lay.H);
    gm.attr("transform", `translate(${lay.tx},${lay.ty}) scale(${lay.s})`);
    const { h, dotR } = lay;
    gLead.selectAll("*").remove(); gl.selectAll("*").remove();
    for (const l of labs.filter((x) => x.col)) {
      const ex = l.col === "L" ? l.r.x + l.r.w : l.r.x, ey = l.r.y + h / 2, kx = ex + (l.col === "L" ? 6 : -6);
      gLead.append("polyline").attr("points", `${ex},${ey} ${kx},${ey} ${l.sx},${l.sy}`);
      gLead.append("circle").attr("cx", l.sx).attr("cy", l.sy).attr("r", 1.8);
    }
    const g = gl.selectAll("g").data(labs).join("g").attr("class", (l) => `mv-pill${l.col ? " mv-pill-c" : ""}`).attr("transform", (l) => `translate(${l.r.x},${l.r.y})`)
      .attr("data-prov", (l) => l.id).attr("tabindex", 0).attr("role", "button").attr("aria-label", (l) => `${byCode[l.id].n}: ${l.text.split(" ").slice(1).join(" ")}`)
      .on("keydown", (ev, l) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); const b = ev.currentTarget.getBoundingClientRect(); abrir(l.id, { clientX: b.right, clientY: b.top }); } })
      .on("mousemove", (ev, l) => over(l.id, ev)).on("mouseleave", out).on("click", (ev, l) => { ev.stopPropagation(); abrir(l.id, ev); });
    g.append("rect").attr("width", (l) => l.w).attr("height", h).attr("rx", h / 2);
    g.append("circle").attr("cx", PILL.pad + dotR).attr("cy", h / 2).attr("r", dotR).attr("fill", (l) => l.c);
    g.append("text").attr("x", PILL.pad + 2 * dotR + PILL.gap).attr("y", h / 2).attr("dy", "0.35em").style("font-size", `${fs}px`).text((l) => l.text);
    el.querySelector(".mvmap").dataset.etiquetas = `${labs.length}/${labs.filter((l) => l.col).length}`;
  }
  async function paint() {
    if (PORTADA.anio === "2023" && !R23) R23 = resultados23(await load("dhondt.json"));
    seg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.a === PORTADA.anio); b.setAttribute("aria-pressed", b.dataset.a === PORTADA.anio); });
    mseg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.m === PORTADA.modo); b.setAttribute("aria-pressed", b.dataset.m === PORTADA.modo); });
    pseg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.p === PORTADA.por); b.setAttribute("aria-pressed", b.dataset.p === PORTADA.por); });
    // "Cambios desde 2023" compares 2026 with 2023: it does not exist for 2023, so the button goes away there
    const btnCambios = mseg.querySelector('[data-m="cambios"]');
    btnCambios.hidden = PORTADA.anio === "2023";
    if (PORTADA.modo === "cambios" && PORTADA.anio === "2023") PORTADA.modo = "bloques";
    mseg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.m === PORTADA.modo); b.setAttribute("aria-pressed", b.dataset.m === PORTADA.modo); });
    escribirHash();
    if (PORTADA.modo === "cambios") {
      if (!R23) R23 = resultados23(await load("dhondt.json"));
      const VD = PORTADA.por === "votos" ? await load("provincias_29n_draws.json").catch(() => null) : null;
      cur = porCambios(D, R23, VD, T, { at: grupos, escanos: PORTADA.por === "escanos" });
    } else if (PORTADA.por === "escanos") cur = porEscanos(D, R23, PORTADA.anio, T, { at: grupos, bloques: PORTADA.modo === "bloques" });
    else if (PORTADA.modo === "bloques") cur = porBloques(D, R23, PORTADA.anio, T, grupos);
    else { const mv = masVotado(D, R23, PORTADA.anio, T); cur = { ...mv, lider: (p) => { const x = mv.lider(p); return x && { ...x, c: colorVoto(x.f) }; } }; }
    defsEmp.html(cur.patterns ?? "");
    gCambio.selectAll("path").data(cur.cambiadas ?? []).join("path").attr("class", "mv-cambio").attr("d", (id) => pathEl[id].getAttribute("d"));
    pv.attr("fill", (f) => cur.fill(byCode[f.id]));
    svg.attr("aria-label", cur.aria);
    leg.innerHTML = cur.legend;
    nota.innerHTML = cur.nota;
    etiquetas();
    if (sel) abrir(sel);
  }
  // the card: placed beside the point clicked inside the map's box, or across the box on a narrow screen
  async function abrir(id, ev) {
    const p = byCode[id];
    if (!p) return;
    hideTip();
    sel = id;
    sl.attr("d", pathEl[id].getAttribute("d"));
    ficha.innerHTML = await fichaHtml(p, PORTADA.anio, T);
    ficha.hidden = false;
    // a phone: a sheet along the bottom of the screen, as wide as the screen (the map's box is too narrow for the table)
    const hoja = matchMedia("(max-width: 519px)").matches;
    ficha.classList.toggle("mv-hoja", hoja);
    // the card stays in one place (top right of the map; below the zoomed province on a narrow map), the map moves instead
    const cw = caja.clientWidth, fw = ficha.offsetWidth;
    if (hoja) { ficha.style.left = ficha.style.right = ficha.style.top = ""; }
    else if (cw < 620) { ficha.style.left = "4px"; ficha.style.right = "4px"; ficha.style.top = `${Math.round(box.clientHeight * 0.45)}px`; }
    else { ficha.style.right = ""; ficha.style.left = `${cw - fw - 8}px`; ficha.style.top = "8px"; }
    zoomA(id);
    ficha.querySelector(".mvp-x").onclick = () => cerrar(true);
    ficha.querySelectorAll("[data-rango]").forEach((c) => { const s = (e) => showTip(c.dataset.rango, e); c.onmousemove = s; c.onclick = s; c.onmouseleave = hideTip; });
    if (ev) ficha.querySelector(".mvp-x").focus({ preventScroll: true });
  }
  function cerrar(foco) {
    if (!sel) return;
    const id = sel;
    sel = null; ficha.hidden = true; sl.attr("d", null); hideTip();
    zoomA(null);
    if (foco) gl.select(`g[data-prov="${id}"]`).node()?.focus?.();
  }
  ficha.addEventListener("click", (ev) => ev.stopPropagation());
  const esc = (ev) => { if (ev.key === "Escape" && sel) cerrar(true); };
  document.addEventListener("keydown", esc);
  seg.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.a !== PORTADA.anio) { PORTADA.anio = b.dataset.a; paint(); } });
  mseg.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.m !== PORTADA.modo) { PORTADA.modo = b.dataset.m; paint(); } });
  pseg.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.p !== PORTADA.por) { PORTADA.por = b.dataset.p; paint(); } });
  // the labels are laid out again when the map's width changes (a window resize, the tablero's columns)
  let ancho = 0, t = null;
  const ro = new ResizeObserver(() => {
    if (!document.body.contains(el)) { ro.disconnect(); document.removeEventListener("keydown", esc); return; }
    const w = Math.round(box.clientWidth);
    if (w && w !== ancho && cur) { ancho = w; clearTimeout(t); t = setTimeout(() => { etiquetas(); if (sel) abrir(sel); }, 60); }
  });
  await document.fonts?.ready;
  await paint();
  ancho = Math.round(box.clientWidth);
  ro.observe(box);
  return { grupos: () => { if (PORTADA.modo !== "mv" && document.body.contains(el)) paint(); } };
}
