// The province card of the Provincias tab, laid out like a newspaper's results page (provincia.js draws it, this module
// computes its pieces): header and figures, the "Proyección 2026 / Resultados 2023" view, results per list, what a vote is
// worth (electors per seat), the last seat, the heads of the proclaimed lists, 2019 against 2023, the D'Hondt quotients
// of 2023 and the municipalities. The prose is textos/provincia.md (parts named after each block).
const d3 = window.d3;
import { META, load, loadMuni, norm, showTip, hideTip } from "./data.js?v=0.2.164";
import { md } from "./textos.js?v=0.2.164";
import { fam, famName } from "./charts.js?v=0.2.164";
import { reparto as dhondt } from "./dhondt_vis.js?v=0.2.164";
import { short, pc, nm, frecuencia } from "./masvotado.js?v=0.2.164";
import { t as tr, deCada, ordinal } from "./i18n.js?v=0.2.164";

const f0 = (x) => d3.format(",.0f")(x);   // at call time: the Spanish locale is set after the imports run
const E23 = "generales_2023-07", E19 = "generales_2019-11";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
// a frequency for readers ("7 de cada 10"); above 9 of 10, out of 100 so that 0.95 does not read "10 de cada 10"
const fr = (s) => (s > 0.9 && s < 0.995 ? deCada(Math.round(s * 100), 100) : frecuencia(s));
// the last seat's fights and the undecided seats, always out of 100: out of 10, three fights near 14 in 100 all read "1 de cada 10"
// (Víctor, 2026-11-18)
const fr100 = (s) => (s >= 0.995 ? tr("más de 99 de cada 100") : s < 0.01 ? tr("menos de 1 de cada 100") : deCada(Math.round(s * 100), 100));
const pal = (n, uno, varios) => (n === 1 ? tr(uno) : tr(varios));
const ord = (k) => ordinal(k, "f");
// one decimal for shares; the bar of a list on a 0..max scale
const pctTxt = (x) => `${nm(x)}%`;
const tipAttr = (html) => ` data-tip="${esc(html)}" tabindex="0"`;

/** 2023 lists of one province from dhondt.json: [{s, f, v, n}], with the valid vote, the D'Hondt result and its check. */
function listas23(dh, code, eid = E23) {
  const P = dh[eid]?.find((x) => x.prov === code);
  if (!P) return null;
  const lists = P.l.map(([s, f, v, n]) => ({ s, f, v, n })).sort((a, b) => b.v - a.v);
  const validos = d3.sum(lists, (l) => l.v) + P.bl;
  const r = dhondt(lists, P.esc, validos);
  return { P, lists, validos, r, esc: P.esc };
}

/** Electors per seat in every province: the 2023 general election census (overseas voters included) over the 2026 seats. */
export function electoresPorEscano(D, S) {
  const rows = D.provincias.map((p) => {
    const c = S.provincias[p.prov]?.s?.[E23]?.censo;
    return c ? { prov: p.prov, n: p.n, censo: c, esc: p.esc, x: c / p.esc } : null;
  }).filter(Boolean).sort((a, b) => a.x - b.x);
  const media = d3.sum(rows, (r) => r.censo) / d3.sum(rows, (r) => r.esc);
  return { rows, media };
}

const fila = (c, label, barra, cifras, tip) => `<div class="pf-fila"${tip ? tipAttr(tip) : ""}><div class="pf-nom"><i class="dot" style="background:${c}"></i>${label}</div>
  <div class="pf-barra">${barra}</div>${cifras}</div>`;

function barras2026(p) {
  const max = d3.max(p.listas, (l) => l.vhi) || 1, mas = p.repartos[0]?.a ?? {};
  return `<div class="pf-filas"><div class="pf-fila pf-cab"><div></div><div></div><div class="num">${tr("Voto")}</div><div class="num">${tr("Escaños")}</div></div>${p.listas.map((l) => {
    const n = mas[l.f] ?? 0, rango = l.lo === l.hi ? "" : ` (${l.lo}–${l.hi})`;
    // the same mark as the front page's ranges (dot = median, light band = 9 in 10 draws), not a solid bar with a faded
    // band over it, which read as two different things (Víctor, 2026-11-17)
    const barra = `<div class="rg-pista"><span class="rg-franja" style="left:${l.vlo / max * 100}%;width:${(l.vhi - l.vlo) / max * 100}%;background:${pc(l.f)}"></span><span class="rg-punto" style="left:${l.v / max * 100}%;background:${pc(l.f)}"></span></div>`;
    const tip = `<b>${short(l.f, p.prov)}</b>: ${tr("{v} de los votos (mediana); en 9 de cada 10 simulaciones, entre {lo} y {hi}.", { v: pctTxt(l.v), lo: pctTxt(l.vlo), hi: pctTxt(l.vhi) })} ${tr("Escaños: {n} en el reparto más probable", { n })}${rango ? `, ${tr("entre {a} y {b} en 9 de cada 10 simulaciones", { a: l.lo, b: l.hi })}` : ""}. ${tr("En 2023:")} ${p.v23[l.f] != null ? pctTxt(p.v23[l.f]) : tr("sin lista")}, ${p.s23[l.f] ?? 0} ${pal(p.s23[l.f] ?? 0, "escaño", "escaños")}.`;
    return fila(pc(l.f), short(l.f, p.prov), barra, `<div class="num">${pctTxt(l.v)}</div><div class="num pf-esc">${n}<small>${rango}</small></div>`, tip);
  }).join("")}</div>`;
}

function barras2023(L) {
  const { lists, validos } = L;
  const vis = lists.filter((l) => l.n || l.v >= 0.01 * validos), resto = lists.filter((l) => !vis.includes(l));
  const max = d3.max(vis, (l) => l.v) / validos * 100;
  const rows = vis.map((l) => ({ c: fam(l.f).color, label: l.s, v: l.v, n: l.n, tip: `<b>${l.s}</b>: ${tr("{v} votos, {p} del voto válido;", { v: f0(l.v), p: pctTxt(l.v / validos * 100) })} ${l.n} ${pal(l.n, "escaño", "escaños")}.${l.v < 0.03 * validos ? ` ${tr("No llegó al 3%.")}` : ""}` }));
  if (resto.length) rows.push({ c: "var(--ink-3)", label: tr("Otras {n} {listas}", { n: resto.length, listas: pal(resto.length, "lista", "listas") }), v: d3.sum(resto, (l) => l.v), n: 0, tip: resto.map((l) => `${l.s}: ${f0(l.v)}`).join("<br>") });
  return `<div class="pf-filas pf-filas23"><div class="pf-fila pf-cab"><div></div><div></div><div class="num">${tr("Voto")}</div><div class="num">${tr("Votos")}</div><div class="num">${tr("Escaños")}</div></div>${rows.map((r) => {
    const x = r.v / validos * 100;
    return fila(r.c, esc(r.label), `<span class="pf-med" style="width:${Math.min(100, x / max * 100)}%;background:${r.c}"></span>`,
      `<div class="num">${pctTxt(x)}</div><div class="num">${f0(r.v)}</div><div class="num pf-esc">${r.n}</div>`, r.tip);
  }).join("")}</div>`;
}

function tira(E, code) {
  const lo = E.rows[0].x, hi = E.rows.at(-1).x, pos = (x) => ((x - lo) / (hi - lo)) * 100;
  return `<div class="pf-tira" role="img" aria-label="${tr("Electores por escaño en las 52 provincias")}">
    <span class="pf-tira-media" style="left:${pos(E.media)}%"${tipAttr(tr("Media de España: {n} electores por escaño", { n: f0(E.media) }))}></span>
    ${E.rows.map((r, i) => `<a class="pf-tira-p${r.prov === code ? " on" : ""}" href="#provincia/${r.prov}" style="left:${pos(r.x)}%"${tipAttr(`<b>${r.n}</b>: ${tr("{x} electores por escaño ({c} electores, {e} {escanos}); {o} de 52", { x: f0(r.x), c: f0(r.censo), e: r.esc, escanos: pal(r.esc, "escaño", "escaños"), o: ord(i + 1) })}`)} aria-label="${r.n}"></a>`).join("")}
  </div><div class="pf-tira-ejes"><span>${f0(lo)}</span><span>${tr("{n} electores por escaño", { n: f0(hi) })}</span></div>`;
}

// the D'Hondt quotients of 2023: lists over 3% by votes, columns ÷1 ... one past the most seats any list won
function tablaDhondt(L) {
  const { lists, r } = L;
  const ok = lists.map((l, i) => i).filter((i) => r.ok[i]);
  const K = Math.max(3, d3.max(ok, (i) => r.n[i]) + 1);
  return `<div class="scrollx"><table class="nosort pf-dh"><tr><th>${tr("Lista")}</th>${d3.range(1, K + 1).map((k) => `<th class="num">÷${k}</th>`).join("")}</tr>
    ${ok.map((i) => { const l = lists[i]; return `<tr><td class="pv-nw"><i class="dot" style="background:${fam(l.f).color}"></i>${esc(l.s)}</td>${d3.range(1, K + 1).map((k) => {
      const gana = k <= r.n[i], ult = r.last && r.last.i === i && r.last.k === k, cola = r.next && r.next.i === i && r.next.k === k;
      const cls = [gana && "gana", ult && "ultimo", cola && "cola"].filter(Boolean).join(" ");
      const t = `${l.s}: ${tr("{v} votos entre {k}", { v: f0(l.v), k })}, ${f0(l.v / k)}${ult ? `. ${tr("El último escaño")}` : cola ? `. ${tr("El siguiente de la cola")}` : gana ? `. ${tr("Escaño")}` : ""}`;
      return `<td class="num ${cls}" style="--c:${fam(l.f).color}"${tipAttr(t)}>${f0(l.v / k)}</td>`;
    }).join("")}</tr>`; }).join("")}</table></div>`;
}

// 2019 against 2023, by party family; the name of 2023 (Sumar), of the biggest list for regional and other lists
function tablaEvolucion(dh, code) {
  const A = listas23(dh, code, E19), B = listas23(dh, code, E23);
  if (!A || !B) return null;
  const agg = (L) => d3.rollup(L.lists, (g) => ({ v: d3.sum(g, (l) => l.v) / L.validos * 100, n: d3.sum(g, (l) => l.n), s: g[0].s }), (l) => l.f);
  const a = agg(A), b = agg(B);
  const fams = [...new Set([...a.keys(), ...b.keys()])].filter((f) => f !== "otros" && ((a.get(f)?.v ?? 0) >= 1 || (b.get(f)?.v ?? 0) >= 1 || a.get(f)?.n || b.get(f)?.n))
    .sort((x, y) => (b.get(y)?.v ?? 0) - (b.get(x)?.v ?? 0) || (a.get(y)?.v ?? 0) - (a.get(x)?.v ?? 0));
  const nom = (f) => (f === "reg" ? (b.get(f) ?? a.get(f)).s : famName(f, E23));
  const flecha = (d) => (d > 0.05 ? `<span class="pf-sube">▲ ${nm(d)}</span>` : d < -0.05 ? `<span class="pf-baja">▼ ${nm(-d)}</span>` : '<span class="muted">=</span>');
  const row = (f, label, x, y) => {
    const t = `<b>${label}</b>: ${x ? tr("{v} y {n} {escanos} en {y} ({s})", { v: pctTxt(x.v), n: x.n, escanos: pal(x.n, "escaño", "escaños"), y: 2019, s: x.s }) : tr("sin lista en {y}", { y: 2019 })}; ${y ? tr("{v} y {n} {escanos} en {y} ({s})", { v: pctTxt(y.v), n: y.n, escanos: pal(y.n, "escaño", "escaños"), y: 2023, s: y.s }) : tr("sin lista en {y}", { y: 2023 })}.`;
    return `<tr${tipAttr(t)}><td class="pv-nw"><i class="dot" style="background:${f ? fam(f).color : "var(--ink-3)"}"></i>${esc(label)}</td><td class="num">${x ? pctTxt(x.v) : "·"}</td><td class="num">${y ? pctTxt(y.v) : "·"}</td>
      <td class="num pv-nw">${x && y ? flecha(y.v - x.v) : ""}</td><td class="num pv-nw">${x?.n ?? 0} → ${y?.n ?? 0}</td></tr>`;
  };
  return `<div class="scrollx"><table class="nosort pf-ev"><tr><th>${tr("Partido")}</th><th class="num">2019</th><th class="num">2023</th><th class="num">${tr("Cambio (puntos)")}</th><th class="num">${tr("Escaños")}</th></tr>
    ${fams.map((f) => row(f, nom(f), a.get(f), b.get(f))).join("")}</table></div>`;
}

// siglas of the BOE lists -> model party, to colour and order the heads of list
const SIGLAS = [[/^PP$/, "pp"], [/^(PSOE|PSC|PSE|PSdeG|PSIB)/, "psoe"], [/^VOX$/, "vox"], [/^(FA|SUMAR)\b/, "sumar"], [/^PODEMOS/, "podemos"], [/^SALF$/, "salf"],
  [/^ERC/, "erc"], [/^(JUNTS|JxCat)/i, "junts"], [/BILDU/, "bildu"], [/PNV/, "pnv"], [/^BNG/, "bng"], [/^(CCa|CC)\b/, "cc"], [/^CUP/, "cup"]];
// initials of a head of list: the first name and the first surname (two surnames, so the second capitalised word from the end)
const iniciales = (n) => { const w = n.split(/\s+/).filter((x) => /^[A-ZÁÉÍÓÚÑÜ]/.test(x)); return ((w[0]?.[0] ?? "") + (w.length >= 3 ? w.at(-2)[0] : w.at(-1)?.[0] ?? "")).toUpperCase(); };

// leader photos (data/lideres.json, pipeline/lideres.py; Víctor, 2026-11-16): keyed here by the head's name as the BOE writes it,
// so a photo shows only beside the very person it depicts (the Madrid head of the FA is not the Barcelona one); otherwise initials
const FOTOS = new Map(Object.values((await load("lideres.json").catch(() => null)) ?? {}).map((x) => [x.nombre, x]));
const cara = (c, color) => {
  const x = c.c && FOTOS.get(c.c);
  if (!x?.img) return `<span class="pf-ini" style="background:${color}" aria-hidden="true">${c.c ? iniciales(c.c) : "·"}</span>`;
  const cred = `${tr("Foto:")} ${x.autor}, ${x.licencia === "Public domain" ? tr("dominio público") : x.licencia} (Wikimedia Commons)`;
  return `<img class="pf-ini" src="${new URL(`../data/${x.img}`, import.meta.url).href}" alt="${esc(x.nombre)}" title="${esc(cred)}" style="background:${color};object-fit:cover;object-position:top">`;
};

function tablaCandidaturas(p, L, T, boe) {
  if (!p.candidaturas.length) return null;
  const reg = new Set((L?.lists ?? []).filter((l) => l.f === "reg").map((l) => l.s));
  const famDe = (s) => (reg.has(s) && p.listas.some((l) => l.f === "reg") ? "reg" : SIGLAS.find(([re]) => re.test(s))?.[1] ?? null);
  const orden = (f) => { const i = p.listas.findIndex((l) => l.f === f); return i < 0 ? 99 : i; };
  const cs = p.candidaturas.map((c, j) => ({ ...c, f: famDe(c.s), j })).sort((a, b) => orden(a.f) - orden(b.f) || a.j - b.j);
  return `<div class="pf-cands">${cs.map((c) => `<div class="pf-cand">${cara(c, c.f ? pc(c.f) : "var(--ink-3)")}
    <div><b>${esc(c.c ?? tr("Sin dato"))}</b><div class="pf-lista">${esc(c.d)}${c.d !== c.s ? ` <span class="muted">(${esc(c.s)})</span>` : ""}</div></div></div>`).join("")}</div>
    ${md(T.candidaturas_nota, { vars: { boe }, page: "provincia" }).html}`;
}

/** The figures, blocks and conditions the card adds to the "detalle" part, for the view shown ("2026" or "2023"). */
export function ficha({ p, D, S, dh, T, vista }) {
  const code = p.prov, y23 = vista === "2023";
  const L = listas23(dh, code);
  const s23 = S.provincias[code]?.s?.[E23];
  const E = electoresPorEscano(D, S);
  const k = E.rows.findIndex((r) => r.prov === code), me = E.rows[k];
  const cc = S.provincias[code]?.ccaa, ccn = META.ccaa[cc]?.n;
  const dEsc = p.esc - p.esc23;
  const vars = {};
  const flags = { proyeccion: !y23 };
  const slots = {
    cabecera: `<nav class="pf-migas" aria-label="${tr("Dónde estás")}"><a href="#provincia">${tr("Provincias")}</a>${ccn ? ` › <a href="#comunidad/${cc}">${ccn}</a>` : ""} › <span>${p.n}</span></nav>`,
    cifras: `<dl class="pf-cifras">
      <div><dt>${tr("Escaños 2026")}</dt><dd>${p.esc}${dEsc ? ` <small>(${tr("{d} respecto a 2023", { d: `${dEsc > 0 ? "+" : ""}${dEsc}` })})</small>` : ""}</dd></div>
      ${s23 ? `<div><dt>${tr("Censo 2023")}</dt><dd>${f0(s23.censo)}</dd></div><div><dt>${tr("Participación 2023")}</dt><dd>${pctTxt(s23.votantes / s23.censo * 100)}</dd></div>` : ""}
      ${me ? `<div><dt>${tr("Electores por escaño")}</dt><dd>${f0(me.x)}</dd></div>` : ""}</dl>`,
    vista: `<div class="seg pf-vista" role="group" aria-label="${tr("Qué se muestra")}">${[["2026", tr("Proyección 2026")], ["2023", tr("Resultados 2023")]].map(([v, t]) =>
      `<button type="button" data-v="${v}" class="${vista === v ? "on" : ""}" aria-pressed="${vista === v}">${t}</button>`).join("")}</div>`,
    mapa_aqui: `<div class="pf-mapa-hueco"></div>${md(T.mapa_ficha, { vars: { provincia: p.n }, page: "provincia" }).html}`,
  };
  // results per list
  slots.resultado = y23 ? (L ? md(T.resultado_2023, { slots: { barras: barras2023(L) }, page: "provincia" }).html : null)
    : md(T.resultado_2026, { vars: { simulaciones: f0(D.draws) }, slots: { barras: barras2026(p) }, page: "provincia" }).html;
  if (L && s23) {
    const a = Object.fromEntries(L.lists.filter((l) => l.n).map((l) => [l.s, l.n]));
    slots.resumen_2023 = md(T.resumen_2023, { vars: { escanos23: L.esc, escanos23_palabra: pal(L.esc, "escaño", "escaños"),
      reparto23: Object.entries(a).sort((x, y) => y[1] - x[1]).map(([s, n]) => `${s} ${n}`).join(", "), participacion: pctTxt(s23.votantes / s23.censo * 100) }, page: "provincia" }).html;
  }
  // what a vote is worth
  if (me) {
    const peso = E.media / me.x;
    slots.vale = md(T.vale, { vars: { provincia: p.n, electores: f0(me.x), media: f0(E.media), peso: Math.abs(peso - 1) < 0.05 ? tr("más o menos") : tr("{x} veces", { x: nm(peso) }),
      puesto: ord(k + 1), min_n: E.rows[0].n, min: f0(E.rows[0].x), max_n: E.rows.at(-1).n, max: f0(E.rows.at(-1).x) }, slots: { vale_tira: tira(E, code) }, page: "provincia" }).html;
  }
  // the last seat: 2026, every usual fight and the undecided seats with how often each party takes them
  if (!y23) {
    const pug = (p.ultimo ?? []).map(([x, y, s]) => md(T.aire_fila, { vars: { lleva: short(x, p.prov), fuera: short(y, p.prov), frecuencia: fr100(s) }, page: "provincia" }).html);
    const dud = p.listas.filter((l) => l.f !== "otros").flatMap((l) => l.pk.map((x, i) => ({ l, k: i + 1, x }))).filter((d) => d.x >= 0.1 && d.x < 0.9)
      .sort((a, b) => Math.abs(a.x - 0.5) - Math.abs(b.x - 0.5)).slice(0, 8).sort((a, b) => b.x - a.x)   // the eight closest to a coin toss
      .map((d) => md(T.dudoso_fila, { vars: { k: d.k, partido: short(d.l.f, p.prov), frecuencia: fr100(d.x) }, page: "provincia" }).html);
    slots.aire = md(T.aire, { flags: { pugnas: pug.length > 0, dudosos: dud.length > 0 }, slots: { pugnas_lista: `<ul class="pf-lista-aire">${pug.map((h) => `<li>${h.replace(/^<p[^>]*>|<\/p>$/g, "")}</li>`).join("")}</ul>`,
      dudosos_lista: `<ul class="pf-lista-aire">${dud.map((h) => `<li>${h.replace(/^<p[^>]*>|<\/p>$/g, "")}</li>`).join("")}</ul>` }, page: "provincia" }).html;
  } else if (L?.r.last) {
    const { last, next } = L.r, h = L.lists[last.i];
    const perder = next ? Math.max(0, Math.ceil(h.v - next.q * last.k) - 1) : null;
    slots.ultimo_2023 = md(T.ultimo_2023, { vars: { ultimo_de: h.s, cociente: f0(last.q), votos_lista: f0(h.v), divisor: last.k,
      siguiente: next ? L.lists[next.i].s : null, cociente_sig: next ? f0(next.q) : null, falta: L.r.falta != null ? f0(L.r.falta) : null, perder: perder != null ? f0(perder) : null },
      flags: { rival: !!next }, page: "provincia" }).html;
  }
  slots.tabla_candidaturas = tablaCandidaturas(p, L, T, D.boe);
  const ev = tablaEvolucion(dh, code);
  slots.evolucion = ev ? md(T.evolucion, { slots: { evolucion_tabla: ev }, page: "provincia" }).html : null;
  slots.dhondt = y23 && L ? md(T.dhondt, { vars: { escanos23: L.esc }, slots: { dhondt_tabla: tablaDhondt(L) }, page: "provincia" }).html : null;
  slots.municipios = '<div class="pf-munis"></div>';
  return { vars, slots, flags, check: L ? L.lists.every((l, i) => l.n === L.r.n[i]) : true };
}

/** The municipalities of the province by voters in 2023, with the most voted list and a search box (filled after drawing). */
export async function municipios(el, code, prov, T) {
  if (!el) return;
  const M = await loadMuni(code);
  if (!el.isConnected) return;
  const rows = Object.entries(M).map(([ine, d]) => {
    const r = d.e[E23];
    if (!r) return null;
    const top = r.c.reduce((a, b) => (b[2] > (a?.[2] ?? -1) ? b : a), null);
    const val = d3.sum(r.c, (c) => c[2]) + r.bl;
    return { ine, n: META.municipios[ine] ?? d.n, k: norm(META.municipios[ine] ?? d.n), vot: r.vot, censo: r.censo, top, share: top && val ? top[2] / val * 100 : null };
  }).filter(Boolean).sort((a, b) => b.vot - a.vot);
  const N = 20;
  el.innerHTML = `${md(T.municipios, { vars: { n: f0(rows.length), provincia: prov }, slots: { municipios_lista: `<div class="pf-munis-ctl"><input type="search" placeholder="${esc(tr("Busca un municipio de {p}", { p: prov }))}" aria-label="${tr("Buscar municipio")}" autocomplete="off"></div>
    <div class="scrollx"><table class="nosort pf-mun"><thead><tr><th>${tr("Municipio")}</th><th class="num">${tr("Votantes")}</th><th>${tr("Más votada")}</th></tr></thead><tbody></tbody></table></div>
    <p class="pf-mas"><button type="button" class="pf-btn"></button></p>` }, page: "provincia" }).html}`;
  const tb = el.querySelector("tbody"), inp = el.querySelector("input"), btn = el.querySelector(".pf-btn");
  let todos = false;
  const paint = () => {
    const q = norm(inp.value.trim());
    const hit = q ? rows.filter((r) => r.k.includes(q)) : rows;
    const show = q || todos ? hit : hit.slice(0, N);
    tb.innerHTML = show.map((r) => `<tr><td><a href="#pueblo/${r.ine}">${esc(r.n)}</a></td><td class="num">${f0(r.vot)}</td>
      <td class="pv-nw">${r.top ? `<i class="dot" style="background:${fam(r.top[1]).color}"></i>${esc(r.top[0])} <span class="muted">${pctTxt(r.share)}</span>` : "·"}</td></tr>`).join("")
      || `<tr><td colspan="3" class="muted">${tr("Ningún municipio con ese nombre.")}</td></tr>`;
    btn.parentElement.hidden = !!q || rows.length <= N;
    btn.textContent = todos ? tr("Ver solo los {n} con más votantes", { n: N }) : tr("Ver los {n} municipios", { n: f0(rows.length) });
  };
  inp.addEventListener("input", paint);
  btn.addEventListener("click", () => { todos = !todos; paint(); });
  paint();
}

/** Bubbles for every mark with data-tip inside el: hover with a mouse; on touch, a tap opens the bubble and a second tap
 *  on the same mark follows its link (if it has one). */
export function bocadillos(el) {
  let tipFor = null, touch = false;
  el.addEventListener("pointerdown", (ev) => { touch = ev.pointerType !== "mouse"; });
  el.addEventListener("mousemove", (ev) => { const t = ev.target.closest("[data-tip]"); if (t && !touch) showTip(t.dataset.tip, ev); });
  el.addEventListener("mouseout", (ev) => { const t = ev.target.closest("[data-tip]"); if (t && !t.contains(ev.relatedTarget) && !touch) hideTip(); });
  el.addEventListener("click", (ev) => {
    const t = ev.target.closest("[data-tip]");
    if (!t) { if (tipFor) { hideTip(); tipFor = null; } return; }
    if (!touch) return;   // a mouse click follows the link as usual
    if (tipFor !== t) { ev.preventDefault(); tipFor = t; showTip(t.dataset.tip, ev); }
    else { hideTip(); tipFor = null; }
  });
}
