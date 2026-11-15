const d3 = window.d3;
const topojson = window.topojson;
import { load, FAM, showTip, hideTip } from "./data.js?v=0.2.108";
import { POLL_PARTY } from "./encuestas.js?v=0.2.108";
import { getGeo, rewind } from "./mapa.js?v=0.2.108";
import { textos, md, INDICE } from "./textos.js?v=0.2.108";
import { indexHtml, sectionIndex } from "./charts.js?v=0.2.108";

const pn = (f) => (f === "sumar" ? "Frente Amplio" : POLL_PARTY[f]?.n ?? FAM[f]?.nombre ?? (f === "otros" ? "Otras" : f.toUpperCase()));
export const short = (f) => (f === "sumar" ? "Frente Amplio" : pn(f).split(" y otros")[0]);
export const pc = (f) => POLL_PARTY[f]?.c() ?? FAM[f]?.color ?? "#888";
const nm = (x, d = 1) => (x == null ? "·" : x.toFixed(d).replace(".", ","));
export const pct = (p) => (p >= 0.995 ? ">99%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);
const f0 = (x) => d3.format(",.0f")(x);   // at call time: the Spanish locale is set after the imports run
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (s) => `${+s.slice(8)} ${MES[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
export const reparto = (a) => Object.entries(a).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${short(f)} ${n}`).join(", ");
// the closest calls: a party's k-th seat with a probability near one half
// "Dónde se decide" (front page) and the list in Provincias: the provinces whose last seat is most contested, ranked
// by how close to one half any party's next seat is; for each, the usual holder of the last seat, the first list left out,
// how often that is the fight and the median votes between them (p.ultimo, p.margen from export_provincias_29n.py)
export function pugnas(D, n) {
  return D.provincias.filter((p) => p.ultimo?.length)
    .map((p) => ({ p, d: Math.min(...p.listas.filter((l) => l.f !== "otros").flatMap((l) => l.pk.map((x) => Math.abs(x - 0.5)))) }))
    .sort((a, b) => enJuego(b.p) - enJuego(a.p) || a.d - b.d).slice(0, n).map(({ p }) => p);   // most seats in the air first
}
const frecuencia = (s) => (s >= 0.095 ? `${Math.round(s * 10)} de cada 10` : `${Math.max(1, Math.round(s * 100))} de cada 100`);
export const pugnaVars = (p) => ({ provincia: `<a href="#provincia/${p.prov}">${p.n}</a>`, escanos: p.esc, escanos_palabra: p.esc === 1 ? "escaño" : "escaños", en_juego: enJuego(p),
  ultimo_de: short(p.ultimo[0][0]), primera_fuera: short(p.ultimo[0][1]), frecuencia: frecuencia(p.ultimo[0][2]), margen: p.margen != null ? f0(p.margen) : null });
export const pugnasHtml = (D, n, src, page) => pugnas(D, n).map((p) => md(src, { vars: pugnaVars(p), flags: { margen: p.margen != null }, page }).html).join("");
// "Dónde se decide" (Provincias): a party's k-th seat is secured when it wins at least k seats in 9 of every 10 draws
// (pk[k-1] >= 0.9); the seats in play of a province are the ones no party has secured that way
export const SEGURO = 0.9;
export const enJuego = (p) => p.esc - p.listas.reduce((s, l) => s + l.pk.filter((x) => x >= SEGURO).length, 0);
// the 52 provinces, merged from the municipalities by the first two digits of their INE code, drawn with the same
// composite projection (Canaries inset) as the municipal map
let provGeo;
async function provincias() {
  if (provGeo) return provGeo;
  const [topo, { path, borders }] = await Promise.all([load("municipios.topo.json"), getGeo()]);
  const by = d3.group(topo.objects.municipalities.geometries, (g) => String(g.id).slice(0, 2));
  const features = [...by].map(([prov, gs]) => rewind({ type: "Feature", id: prov, geometry: topojson.merge(topo, gs) }));
  provGeo = { features, path, borders };
  return provGeo;
}
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
async function mapaEnJuego(el, D, T, onPick) {
  const { features, path, borders } = await provincias();
  const byCode = Object.fromEntries(D.provincias.map((p) => [p.prov, p]));
  const n = Object.fromEntries(D.provincias.map((p) => [p.prov, enJuego(p)]));
  const max = Math.max(1, ...Object.values(n));
  const base = cssVar("--nodata"), ramp = d3.interpolateLab(base, cssVar("--accent"));
  const color = (v) => (v ? ramp(0.25 + 0.75 * (v - 1) / Math.max(1, max - 1)) : base);
  const svg = d3.select(el).select("svg");
  svg.selectAll("path.pv").data(features.filter((f) => byCode[f.id])).join("path").attr("class", "pv").attr("d", path)
    .attr("fill", (f) => color(n[f.id])).attr("data-prov", (f) => f.id)
    // the hovered outline is a copy drawn on top (raising the path itself can swallow the click)
    .on("mouseenter", function () { hl.attr("d", this.getAttribute("d")); })
    .on("mousemove", (ev, f) => {
      const p = byCode[f.id], u = p.ultimo?.[0];
      showTip(md(T.tooltip, { vars: { ...(u ? pugnaVars(p) : {}), provincia: p.n, escanos: p.esc, escanos_palabra: p.esc === 1 ? "escaño" : "escaños",
        en_juego: n[f.id] }, flags: { disputa: !!u }, page: "provincia" }).html, ev);
    })
    .on("mouseleave", () => { hideTip(); hl.attr("d", null); })
    .on("click", (ev, f) => { hideTip(); onPick(f.id); });
  svg.append("path").attr("class", "prov").attr("d", borders);
  const hl = svg.append("path").attr("class", "pv-hl");
  // crop the 960x720 frame of the municipal map to what is drawn here
  const [[x0, y0], [x1, y1]] = path.bounds({ type: "FeatureCollection", features }), pad = 12;
  svg.attr("viewBox", [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].join(" "));
  const vals = d3.range(0, max + 1);
  d3.select(el).append("div").attr("class", "legend pv-legend").html(`<span class="muted">Escaños en juego</span>${vals.map((v) => `<span><i class="sw" style="background:${color(v)}"></i>${v}</span>`).join("")}`);
}

export const escanosAire = (D) => D.provincias.flatMap((p) => p.listas.filter((l) => l.f !== "otros").flatMap((l) => l.pk.map((x, k) => ({ p, l, k: k + 1, x })))).filter((d) => d.x >= 0.2 && d.x <= 0.8).sort((a, b) => Math.abs(a.x - 0.5) - Math.abs(b.x - 0.5));
// what changes between the likeliest allocation and another one (an allocation can differ in more than one seat)
function frase(a, b) {
  const sube = [], baja = [];
  for (const f of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (b[f] ?? 0) - (a[f] ?? 0);
    if (d > 0) sube.push(`${short(f)}${d > 1 ? ` (${d})` : ""}`); else if (d < 0) baja.push(`${short(f)}${d < -1 ? ` (${-d})` : ""}`);
  }
  return `sube ${sube.join(" y ")} y baja ${baja.join(" y ")}`;
}

export async function renderProvincia(app, args = []) {
  const D = await load("provincias_29n.json");
  const byCode = Object.fromEntries(D.provincias.map((p) => [p.prov, p]));
  let code = byCode[args[0]] ? args[0] : "28";
  const aire = escanosAire(D);
  const T = await textos("provincia");
  // the prose is textos/provincia.md; here only the figures and the computed blocks
  const vars = { ultimo_campo: fecha(D.ultimo_campo), simulaciones: f0(D.draws), boe: D.boe,
    en_juego: d3.sum(D.provincias, enJuego), total: d3.sum(D.provincias, (p) => p.esc), decididos: d3.sum(D.provincias, (p) => p.esc) - d3.sum(D.provincias, enJuego) };
  const { html, sec } = md(T.principal, { page: "provincia", vars, slots: {
    mapa: '<div class="mapwrap pvmap"><svg viewBox="0 0 960 720" role="img" aria-label="Mapa de provincias por escaños en juego"></svg></div>',
    selector: `<div class="controls"><select id="pv-sel" aria-label="Provincia">${D.provincias.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></div>`,
    detalle: '<section id="pv"></section>',
    pugnas: pugnasHtml(D, 20, T.pugna, "provincia"),
  } });
  // the frame of the other tabs: index column on wide screens, index row on phones (where [[índice]] is, else before the first section)
  const IX = indexHtml(sec);
  const body = html.includes(INDICE) ? html.replace(INDICE, IX.row) : html.replace(/<section id="s-/, `${IX.row}$&`);
  app.innerHTML = `<div class="layout">${IX.aside}<div class="content">${body}</div></div>`;
  sectionIndex(app);
  const sel = app.querySelector("#pv-sel");
  const tuya = () => app.querySelector("#s-tuya")?.scrollIntoView({ block: "start" });
  // a province picked on the map: its card below, with the address #provincia/<code>
  await mapaEnJuego(app.querySelector(".pvmap"), D, T, (c) => { code = c; history.replaceState(null, "", `#provincia/${code}`); draw(); tuya(); });
  function draw() {
    const p = byCode[code], [a, b, c] = p.repartos;
    sel.value = code;
    const dEsc = p.esc - p.esc23;
    const kmax = Math.max(...p.listas.map((l) => l.pk.length), 1);
    const casillas = `<div class="scrollx"><table class="nosort pv-grid"><tr><th>Partido</th>${d3.range(1, kmax + 1).map((k) => `<th class="num">${k}.º</th>`).join("")}</tr>
      ${p.listas.filter((l) => l.pk.length).map((l) => `<tr><td class="pv-nw"><i class="dot" style="background:${pc(l.f)}"></i>${short(l.f)}</td>${d3.range(kmax).map((k) => { const x = l.pk[k]; return `<td>${x == null ? "" : `<div class="pv-c" title="${short(l.f)}: ${k + 1} o más, ${pct(x)}"><span style="height:${x * 100}%;background:${pc(l.f)}"></span></div><div class="pv-p">${x >= 0.995 ? "" : pct(x)}</div>`}</td>`; }).join("")}</tr>`).join("")}</table></div>`;
    const ult = p.ultimo[0];
    const nE = p.encuestas.length;
    const fams = [...new Set(p.encuestas.flatMap((q) => Object.keys(q.v)))].sort((x, y) => (p.listas.findIndex((l) => l.f === x) + 1 || 99) - (p.listas.findIndex((l) => l.f === y) + 1 || 99));
    const cel = (x) => { if (!x) return '<td class="num">·</td>'; const [v, lo, hi] = x; const s = lo == null ? "" : lo === hi ? `${lo} esc.` : `${lo}–${hi} esc.`; return `<td class="num pv-nw">${v != null ? `${nm(v)}%` : ""}${v != null && s ? "<br>" : ""}${s}</td>`; };
    // what each poll is, in words (alcance from export_provincias_29n.py)
    const ALCANCE = { provincia: "Solo de esta provincia", nacional: "Nacional, con dato de la provincia", varias: "Regional, con dato de la provincia" };
    const DONDE = { nacional: " en toda España", varias: " en la comunidad" };   // where the interviews were made, when not only here
    const vars = {
      provincia: p.n, escanos: p.esc, escanos_palabra: p.esc === 1 ? "escaño" : "escaños",
      cambio: dEsc ? ` (${Math.abs(dEsc) === 1 ? "uno" : Math.abs(dEsc)} ${dEsc > 0 ? "más" : "menos"} que en 2023)` : "",
      reparto: reparto(a.a), prob_reparto: pct(a.p),
      siguientes: `${b ? ` Le sigue un reparto en que ${frase(a.a, b.a)} (${pct(b.p)})` : ""}${c ? ` y otro en que ${frase(a.a, c.a)} (${pct(c.p)})` : ""}${b ? "." : ""}`,
      ultimo_de: ult ? short(ult[0]) : null, primera_fuera: ult ? short(ult[1]) : null, prob_ultimo: ult ? pct(ult[2]) : null, margen: p.margen != null ? f0(p.margen) : null,
    };
    const slots = {
      casillas,
      tabla_partidos: `<div class="scrollx"><table class="nosort"><tr><th>Partido</th><th class="num">Escaños 2023</th><th class="num">Media prevista</th><th class="num">Rango 90%</th><th class="num">Voto 2023</th><th class="num">Voto previsto</th><th class="num">Rango 90%</th></tr>
      ${p.listas.map((l) => `<tr><td class="pv-nw"><i class="dot" style="background:${pc(l.f)}"></i>${short(l.f)}</td><td class="num">${p.s23[l.f] ?? 0}</td><td class="num">${nm(l.s)}</td><td class="num">${l.lo === l.hi ? l.lo : `${l.lo}–${l.hi}`}</td><td class="num">${p.v23[l.f] != null ? `${nm(p.v23[l.f])}%` : "·"}</td><td class="num">${nm(l.v)}%</td><td class="num">${nm(l.vlo)}–${nm(l.vhi)}%</td></tr>`).join("")}</table></div>`,
      tabla_candidaturas: p.candidaturas.length ? `<div class="scrollx"><table class="nosort"><tr><th>Siglas</th><th>Candidatura</th><th>Cabeza de lista</th></tr>${p.candidaturas.map((c) => `<tr><td class="pv-nw">${c.s}</td><td>${c.d}</td><td class="pv-nw">${c.c ?? "·"}</td></tr>`).join("")}</table></div>` : null,
      tabla_encuestas: nE ? `<div class="scrollx"><table class="nosort"><tr><th>Encuestadora</th><th>Medio</th><th>Fecha</th><th>Tipo</th><th class="num">Entrevistas</th>${fams.map((f) => `<th class="num">${short(f)}</th>`).join("")}<th>Origen</th></tr>
      ${p.encuestas.map((q) => `<tr><td class="pv-nw">${q.e}</td><td>${q.m ?? "·"}${q.x ? ' <span class="te-x">encargo</span>' : ""}</td><td class="pv-nw">${fecha(q.f)}</td><td>${ALCANCE[q.alcance] ?? "No consta"}</td><td class="num pv-nw">${(q.n ?? q.de) != null ? f0(q.n ?? q.de) + (DONDE[q.alcance] ?? "") : "·"}</td>${fams.map((f) => cel(q.v[f])).join("")}<td class="pv-nw">${q.url ? `<a href="${q.url}" target="_blank" rel="noopener">fuente</a>` : "·"}${q.rev ? ' <span class="te-x">sin revisar</span>' : ""}</td></tr>`).join("")}</table></div>` : null,
    };
    const flags = { disputa: !!ult, margen: p.margen != null, candidaturas: !!p.candidaturas.length, encuestas: !!nE };
    app.querySelector("#pv").innerHTML = md(T.detalle, { vars, slots, flags, page: "provincia" }).html;
  }
  sel.addEventListener("change", () => { code = sel.value; history.replaceState(null, "", `#provincia/${code}`); draw(); });
  draw();
  // "#provincia/<code>" (links from the lists) opens on that card; "#provincia/decide" is scrolled by main.js
  if (byCode[args[0]]) tuya();
}
