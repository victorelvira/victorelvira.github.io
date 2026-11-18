const d3 = window.d3;
import { load, showTip, hideTip } from "./data.js?v=0.2.158";
import { textos, md, INDICE } from "./textos.js?v=0.2.158";
import { indexHtml, sectionIndex } from "./charts.js?v=0.2.158";
import { t as tr, lang, deCada, ordinal } from "./i18n.js?v=0.2.158";
// the province card's blocks (results per list, electors per seat, last seat, D'Hondt, 2019 vs 2023, municipalities)
import { ficha, municipios, bocadillos } from "./provincia_ficha.js?v=0.2.158";
// the province shapes, names, colours and the "Más votado" colouring are shared with the front page's map (masvotado.js)
import { short, pc, nm, frecuencia, cssVar, colorVoto, nombre, pctVoto, rampa, provincias, resultados23, masVotado } from "./masvotado.js?v=0.2.158";
export { short, pc };   // imported from here by resultados.js
const de100txt = (p) => (p >= 0.995 ? tr("más de 99 de cada 100") : p < 0.01 ? tr("menos de 1 de cada 100") : deCada(Math.round(p * 100), 100));   // frequencies, not percentages (Víctor)
export const pct = (p) => (p >= 0.995 ? ">99%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);
const f0 = (x) => d3.format(",.0f")(x);   // at call time: the Spanish locale is set after the imports run
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fecha = (s) => `${+s.slice(8)} ${(lang() === "en" ? MONTH : MES)[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
export const reparto = (a, prov) => Object.entries(a).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${short(f, prov)} ${n}`).join(", ");
// the closest calls: a party's k-th seat with a probability near one half
// "Dónde se decide" (front page) and the list in Provincias: the provinces whose last seat is most contested, ranked
// by how close to one half any party's next seat is; for each, the usual holder of the last seat, the first list left out,
// how often that is the fight and the median votes between them (p.ultimo, p.margen from export_provincias_29n.py)
export function pugnas(D, n) {
  return D.provincias.filter((p) => p.ultimo?.length)
    .map((p) => ({ p, d: Math.min(...p.listas.filter((l) => l.f !== "otros").flatMap((l) => l.pk.map((x) => Math.abs(x - 0.5)))) }))
    .sort((a, b) => enJuego(b.p) - enJuego(a.p) || a.d - b.d).slice(0, n).map(({ p }) => p);   // most seats in the air first
}
export const pugnaVars = (p) => ({ provincia: `<a href="#provincia/${p.prov}">${p.n}</a>`, escanos: p.esc, escanos_palabra: p.esc === 1 ? tr("escaño") : tr("escaños"), en_juego: enJuego(p),
  ultimo_de: short(p.ultimo[0][0], p.prov), primera_fuera: short(p.ultimo[0][1], p.prov), frecuencia: frecuencia(p.ultimo[0][2]), margen: p.margen != null ? f0(Math.round(p.margen / 100) * 100) : null });
export const pugnasHtml = (D, n, src, page) => pugnas(D, n).map((p) => md(src, { vars: pugnaVars(p), flags: { margen: p.margen != null }, page }).html).join("");
// "Dónde se decide" (Provincias): a party's k-th seat is secured when it wins at least k seats in 9 of every 10 draws
// (pk[k-1] >= 0.9); the seats in play of a province are the ones no party has secured that way
export const SEGURO = 0.9;
export const enJuego = (p) => p.esc - p.listas.reduce((s, l) => s + l.pk.filter((x) => x >= SEGURO).length, 0);
// the vote maps: the parties of the selector, nationwide first and then the regional ones, where they stand
const VOTO_ORDEN = ["pp", "psoe", "vox", "sumar", "podemos", "salf", "erc", "junts", "bildu", "pnv", "bng", "cc", "cup", "reg"];
// the map's state survives a redraw of the page: mode, year of the vote maps and party
const MAPA = { modo: "juego", anio: "2026", partido: "pp" };
// the province map, in three modes: seats in play (default), one party's vote and the most voted party; the two vote modes show
// the 29N projection (median of the draws, p.voto and p.primero from export_provincias_29n.py) or the 2023 result. Clicking a
// province opens its card in every mode
async function mapaEnJuego(el, D, T, onPick) {
  const { features, path, borders } = await provincias();
  const byCode = Object.fromEntries(D.provincias.map((p) => [p.prov, p]));
  const n = Object.fromEntries(D.provincias.map((p) => [p.prov, enJuego(p)]));
  const max = Math.max(1, ...Object.values(n));
  const base = cssVar("--nodata"), ramp = d3.interpolateLab(base, cssVar("--accent"));
  const color = (v) => (v ? ramp(0.25 + 0.75 * (v - 1) / Math.max(1, max - 1)) : base);
  let R23 = null;   // loaded the first time the 2023 results are asked for
  const wrap = el.parentElement;
  const seg = wrap.querySelector("#pv-modo"), aseg = wrap.querySelector("#pv-anio"), psel = wrap.querySelector("#pv-partido"), nota = wrap.querySelector(".pv-nota");
  const svg = d3.select(el).select("svg");
  // provinces where the party has no list: neutral grey with diagonal lines
  svg.append("defs").html(`<pattern id="pv-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" style="fill:var(--nodata)"></rect><line x1="0" y1="0" x2="0" y2="6" style="stroke:var(--ink-3);stroke-width:1.2;opacity:.45"></line></pattern>`);
  const pv = svg.selectAll("path.pv").data(features.filter((f) => byCode[f.id])).join("path").attr("class", "pv").attr("d", path)
    .attr("data-prov", (f) => f.id)
    // the hovered outline is a copy drawn on top (raising the path itself can swallow the click)
    .on("mouseenter", function () { hl.attr("d", this.getAttribute("d")); })
    .on("mousemove", (ev, f) => showTip(tipHtml(byCode[f.id]), ev))
    .on("mouseleave", () => { hideTip(); hl.attr("d", null); })
    .on("click", (ev, f) => { hideTip(); onPick(f.id); });
  svg.append("path").attr("class", "prov").attr("d", borders);
  const hl = svg.append("path").attr("class", "pv-hl");
  // crop the 960x720 frame of the municipal map to what is drawn here
  const [[x0, y0], [x1, y1]] = path.bounds({ type: "FeatureCollection", features }), pad = 12;
  svg.attr("viewBox", [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].join(" "));
  const legend = d3.select(el).append("div").attr("class", "legend pv-legend");
  // per province, for the year shown: {voto: {f: [median, p5, p95]} or {f: share}, primero: [f, share or frequency, lead]}
  const votoDe = (p) => (MAPA.anio === "2023" ? R23[p.prov]?.voto : p.voto) ?? {};
  const medio = (x) => (Array.isArray(x) ? x[0] : x);
  let fill, tipHtml;
  function juego() {
    fill = (p) => color(n[p.prov]);
    tipHtml = (p) => {
      const u = p.ultimo?.[0];
      return md(T.tooltip, { vars: { ...(u ? pugnaVars(p) : {}), provincia: p.n, escanos: p.esc, escanos_palabra: p.esc === 1 ? tr("escaño") : tr("escaños"),
        en_juego: n[p.prov] }, flags: { disputa: !!u }, page: "provincia" }).html;
    };
    legend.html(`<span class="muted">${tr("Escaños en juego")}</span>${d3.range(0, max + 1).map((v) => `<span><i class="sw" style="background:${color(v)}"></i>${v}</span>`).join("")}`);
    svg.attr("aria-label", tr("Mapa de provincias por escaños en juego"));
    return null;
  }
  function voto() {
    const f = MAPA.partido, nom = nombre(f, MAPA.anio), r = rampa(colorVoto(f)), y23 = MAPA.anio === "2023";
    const vals = D.provincias.map((p) => medio(votoDe(p)[f])).filter((x) => x != null);
    // breaks: round steps between the lowest and the highest province, at most six classes
    const cuts = d3.ticks(d3.min(vals), d3.max(vals), 5).filter((t) => t > d3.min(vals) && t < d3.max(vals));
    const k = cuts.length + 1, tone = (i) => r(k === 1 ? 1 : i / (k - 1));
    const cls = d3.scaleThreshold().domain(cuts).range(d3.range(k).map(tone));
    fill = (p) => { const x = votoDe(p)[f]; return x != null ? cls(medio(x)) : "url(#pv-hatch)"; };
    tipHtml = (p) => {
      const x = votoDe(p)[f];
      if (y23) return md(T.tooltip_voto_2023, { vars: { provincia: p.n, partido: nom, voto: x != null ? pctVoto(x) : null }, flags: { presenta: x != null }, page: "provincia" }).html;
      return md(T.tooltip_voto, { vars: { provincia: p.n, partido: nom, voto: x ? pctVoto(x[0]) : null, voto_lo: x ? pctVoto(x[1]) : null, voto_hi: x ? pctVoto(x[2]) : null },
        flags: { presenta: !!x }, page: "provincia" }).html;
    };
    const dg = cuts.some((t) => t % 1) ? 1 : 0, b = (t) => nm(t, dg);   // one decimal when the steps are below one point
    const lab = (i) => (i === 0 ? tr("menos de {x}%", { x: b(cuts[0]) }) : i === k - 1 ? tr("{x}% o más", { x: b(cuts[k - 2]) }) : `${b(cuts[i - 1])}–${b(cuts[i])}%`);
    const sinLista = D.provincias.some((p) => votoDe(p)[f] == null);
    legend.html(`<span class="muted">${y23 ? tr("Voto de {p} en 2023", { p: nom }) : tr("Voto de {p}", { p: nom })}</span>${k === 1 ? `<span><i class="sw" style="background:${tone(0)}"></i>${nm(vals[0])}%</span>`
      : d3.range(k).map((i) => `<span><i class="sw" style="background:${tone(i)}"></i>${lab(i)}</span>`).join("")}${sinLista ? `<span><i class="sw pv-sw-hatch"></i>${tr("sin lista")}</span>` : ""}`);
    svg.attr("aria-label", y23 ? tr("Mapa de provincias por voto de {p} en 2023", { p: nom }) : tr("Mapa de provincias por voto estimado de {p}", { p: nom }));
    return y23 ? md(T.nota_voto_2023, { vars: { partido: nom }, page: "provincia" }).html : md(T.nota_voto, { vars: { partido: nom, simulaciones: f0(D.draws) }, page: "provincia" }).html;
  }
  function primero() {
    const mv = masVotado(D, R23, MAPA.anio, T);
    fill = mv.fill;
    tipHtml = mv.tip;
    legend.html(mv.legend);
    svg.attr("aria-label", mv.aria);
    return mv.nota;
  }
  async function paint() {
    const v = MAPA.modo !== "juego";
    if (v && MAPA.anio === "2023" && !R23) R23 = resultados23(await load("dhondt.json"));
    seg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.m === MAPA.modo); b.setAttribute("aria-pressed", b.dataset.m === MAPA.modo); });
    aseg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.a === MAPA.anio); b.setAttribute("aria-pressed", b.dataset.a === MAPA.anio); });
    aseg.hidden = !v;
    psel.hidden = MAPA.modo !== "voto";
    if (MAPA.modo === "voto") {
      // the parties with a list somewhere in the year shown
      const partidos = VOTO_ORDEN.filter((f) => D.provincias.some((p) => votoDe(p)[f] != null));
      if (!partidos.includes(MAPA.partido)) MAPA.partido = partidos[0];
      psel.innerHTML = partidos.map((f) => `<option value="${f}">${nombre(f, MAPA.anio)}</option>`).join("");
      psel.value = MAPA.partido;
    }
    const texto = ({ juego, voto, primero })[MAPA.modo]();
    pv.attr("fill", (f) => fill(byCode[f.id]));
    nota.hidden = !texto;
    nota.innerHTML = texto ?? "";
  }
  seg.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) { MAPA.modo = b.dataset.m; paint(); } });
  aseg.addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) { MAPA.anio = b.dataset.a; paint(); } });
  psel.addEventListener("change", () => { MAPA.partido = psel.value; paint(); });
  await paint();
}

export const escanosAire = (D) => D.provincias.flatMap((p) => p.listas.filter((l) => l.f !== "otros").flatMap((l) => l.pk.map((x, k) => ({ p, l, k: k + 1, x })))).filter((d) => d.x >= 0.2 && d.x <= 0.8).sort((a, b) => Math.abs(a.x - 0.5) - Math.abs(b.x - 0.5));
// what changes between the likeliest allocation and another one (an allocation can differ in more than one seat)
function frase(a, b, prov) {
  const sube = [], baja = [];
  for (const f of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (b[f] ?? 0) - (a[f] ?? 0);
    if (d > 0) sube.push(`${short(f, prov)}${d > 1 ? ` (${d})` : ""}`); else if (d < 0) baja.push(`${short(f, prov)}${d < -1 ? ` (${-d})` : ""}`);
  }
  return tr("sube {a} y baja {b}", { a: sube.join(` ${tr("y")} `), b: baja.join(` ${tr("y")} `) });
}

// the card's view, "2026" (projection) or "2023" (results), read from the address
let VISTA = "2026";
export async function renderProvincia(app, args = []) {
  const D = await load("provincias_29n.json");
  const byCode = Object.fromEntries(D.provincias.map((p) => [p.prov, p]));
  let code = byCode[args[0]] ? args[0] : "28";
  const aire = escanosAire(D);
  const T = await textos("provincia");
  // the card's view: the 2026 projection or the 2023 results ("#provincia/<code>/2023"); 2023 data and census per province
  VISTA = args[1] === "2023" ? "2023" : "2026";
  const [S, dh] = await Promise.all([load("series.json"), load("dhondt.json")]);
  const hashFor = () => `#provincia/${code}${VISTA === "2023" ? "/2023" : ""}`;
  // the prose is textos/provincia.md; here only the figures and the computed blocks
  const vars = { ultimo_campo: fecha(D.ultimo_campo), simulaciones: f0(D.draws), boe: D.boe,
    en_juego: d3.sum(D.provincias, enJuego), total: d3.sum(D.provincias, (p) => p.esc), decididos: d3.sum(D.provincias, (p) => p.esc) - d3.sum(D.provincias, enJuego) };
  const { html, sec } = md(T.principal, { page: "provincia", vars, slots: {
    // two map modes and, in the vote mode, the party (filled by mapaEnJuego)
    mapa: `<div class="pv-mapa"><div class="controls"><div class="seg" id="pv-modo" role="group" aria-label="${tr("Qué muestra el mapa")}"><button type="button" data-m="juego">${tr("Escaños en juego")}</button><button type="button" data-m="voto">${tr("Voto por partido")}</button><button type="button" data-m="primero">${tr("Más votado")}</button></div>
      <div class="seg" id="pv-anio" role="group" aria-label="${tr("Qué votos")}" hidden><button type="button" data-a="2026">${tr("Proyección 2026")}</button><button type="button" data-a="2023">${tr("Resultados 2023")}</button></div>
      <select id="pv-partido" aria-label="${tr("Partido")}" hidden></select></div>
      <div class="mapwrap pvmap"><svg viewBox="0 0 960 720" role="img" aria-label="${tr("Mapa de provincias por escaños en juego")}"></svg></div><div class="pv-nota" hidden></div></div>`,
    selector: `<div class="controls"><select id="pv-sel" aria-label="${tr("Provincia")}">${D.provincias.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></div>`,
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
    const casillas = `<div class="scrollx"><table class="nosort pv-grid"><tr><th>${tr("Partido")}</th>${d3.range(1, kmax + 1).map((k) => `<th class="num">${ordinal(k, "m")}</th>`).join("")}</tr>
      ${p.listas.filter((l) => l.pk.length).map((l) => `<tr><td class="pv-nw"><i class="dot" style="background:${pc(l.f)}"></i>${short(l.f, p.prov)}</td>${d3.range(kmax).map((k) => { const x = l.pk[k]; return `<td>${x == null ? "" : `<div class="pv-c" title="${short(l.f)}: ${tr("{k} o más", { k: k + 1 })}, ${pct(x)}"><span style="height:${x * 100}%;background:${pc(l.f)}"></span></div><div class="pv-p">${x >= 0.995 ? "" : pct(x)}</div>`}</td>`; }).join("")}</tr>`).join("")}</table></div>`;
    const ult = p.ultimo[0];
    const nE = p.encuestas.length;
    const fams = [...new Set(p.encuestas.flatMap((q) => Object.keys(q.v)))].sort((x, y) => (p.listas.findIndex((l) => l.f === x) + 1 || 99) - (p.listas.findIndex((l) => l.f === y) + 1 || 99));
    const cel = (x) => { if (!x) return '<td class="num">·</td>'; const [v, lo, hi] = x; const s = lo == null ? "" : lo === hi ? `${lo} ${tr("esc.")}` : `${lo}–${hi} ${tr("esc.")}`; return `<td class="num pv-nw">${v != null ? `${nm(v)}%` : ""}${v != null && s ? "<br>" : ""}${s}</td>`; };
    // what each poll is, in words (alcance from export_provincias_29n.py)
    const ALCANCE = { provincia: tr("Solo de esta provincia"), nacional: tr("Nacional, con dato de la provincia"), varias: tr("Regional, con dato de la provincia") };
    const DONDE = { nacional: ` ${tr("en toda España")}`, varias: ` ${tr("en la comunidad")}` };   // where the interviews were made, when not only here
    const vars = {
      provincia: p.n, escanos: p.esc, escanos_palabra: p.esc === 1 ? tr("escaño") : tr("escaños"),
      cambio: dEsc ? ` (${dEsc > 0 ? tr("{n} más que en 2023", { n: dEsc === 1 ? tr("uno") : dEsc }) : tr("{n} menos que en 2023", { n: dEsc === -1 ? tr("uno") : -dEsc })})` : "",
      reparto: reparto(a.a, p.prov), prob_reparto: de100txt(a.p),
      siguientes: `${b ? ` ${tr("Le sigue un reparto en que {f}", { f: frase(a.a, b.a, p.prov) })} (${pct(b.p)})` : ""}${c ? ` ${tr("y otro en que {f}", { f: frase(a.a, c.a, p.prov) })} (${pct(c.p)})` : ""}${b ? "." : ""}`,
      ultimo_de: ult ? short(ult[0], p.prov) : null, primera_fuera: ult ? short(ult[1], p.prov) : null, prob_ultimo: ult ? de100txt(ult[2]) : null, margen: p.margen != null ? f0(Math.round(p.margen / 100) * 100) : null,
    };
    const slots = {
      casillas,
      tabla_partidos: `<div class="scrollx"><table class="nosort"><tr><th>${tr("Partido")}</th><th class="num">${tr("Escaños 2023")}</th><th class="num">${tr("Media prevista")}</th><th class="num">${deCada(9, 10)}</th><th class="num">${tr("Voto 2023")}</th><th class="num">${tr("Voto previsto")}</th><th class="num">${deCada(9, 10)}</th></tr>
      ${p.listas.map((l) => `<tr><td class="pv-nw"><i class="dot" style="background:${pc(l.f)}"></i>${short(l.f, p.prov)}</td><td class="num">${p.s23[l.f] ?? 0}</td><td class="num">${nm(l.s)}</td><td class="num">${l.lo === l.hi ? l.lo : `${l.lo}–${l.hi}`}</td><td class="num">${p.v23[l.f] != null ? `${nm(p.v23[l.f])}%` : "·"}</td><td class="num">${nm(l.v)}%</td><td class="num">${nm(l.vlo)}–${nm(l.vhi)}%</td></tr>`).join("")}</table></div>`,
      tabla_encuestas: nE ? `<div class="scrollx"><table class="nosort"><tr><th>${tr("Encuestadora")}</th><th>${tr("Medio")}</th><th>${tr("Fecha")}</th><th>${tr("Tipo")}</th><th class="num">${tr("Entrevistas")}</th>${fams.map((f) => `<th class="num">${short(f)}</th>`).join("")}<th>${tr("Origen")}</th></tr>
      ${p.encuestas.map((q) => `<tr><td class="pv-nw">${q.e}</td><td>${q.m ?? "·"}${q.x ? ` <span class="te-x">${tr("encargo")}</span>` : ""}</td><td class="pv-nw">${fecha(q.f)}</td><td>${ALCANCE[q.alcance] ?? tr("No consta")}</td><td class="num pv-nw">${(q.n ?? q.de) != null ? f0(q.n ?? q.de) + (DONDE[q.alcance] ?? "") : "·"}</td>${fams.map((f) => cel(q.v[f])).join("")}<td class="pv-nw">${q.url ? `<a href="${q.url}" target="_blank" rel="noopener">${tr("fuente")}</a>` : "·"}${q.rev ? ` <span class="te-x">${tr("sin revisar")}</span>` : ""}</td></tr>`).join("")}</table></div>` : null,
    };
    const flags = { disputa: !!ult, margen: p.margen != null, candidaturas: !!p.candidaturas.length, encuestas: !!nE };
    // the card's other blocks and the view (provincia_ficha.js); the heads of list come from there too
    const F = ficha({ p, D, S, dh, T, vista: VISTA });
    if (!F.check) console.warn(`D'Hondt 2023 de ${p.n} no coincide con los escaños de Interior`);
    // the province map is moved into the card (after the results) and kept alive across redraws
    const pvEl = app.querySelector("#pv"), mapa = app.querySelector(".pv-mapa");
    if (mapa && pvEl.contains(mapa)) mapaCasa.after(mapa);
    pvEl.innerHTML = md(T.detalle, { vars: { ...vars, ...F.vars }, slots: { ...slots, ...F.slots }, flags: { ...flags, ...F.flags }, page: "provincia" }).html;
    const hueco = pvEl.querySelector(".pf-mapa-hueco");
    if (mapa && hueco) hueco.append(mapa);
    // the selected province outlined on the map
    const svg = app.querySelector(".pvmap svg"), forma = svg?.querySelector(`path.pv[data-prov="${code}"]`);
    if (svg) { let m = svg.querySelector("path.pf-sel"); if (!m) { m = document.createElementNS("http://www.w3.org/2000/svg", "path"); m.setAttribute("class", "pf-sel"); svg.append(m); } m.setAttribute("d", forma?.getAttribute("d") ?? ""); }
    history.replaceState(null, "", hashFor());
    municipios(pvEl.querySelector(".pf-munis"), code, p.n, T);
  }
  // where the map is drawn by the page's text, so that a redraw can take it back before rebuilding the card
  const mapaCasa = document.createComment("mapa");
  app.querySelector(".pv-mapa")?.before(mapaCasa);
  bocadillos(app.querySelector("#pv"));
  app.querySelector("#pv").addEventListener("click", (ev) => {
    const b = ev.target.closest(".pf-vista button");
    if (b && b.dataset.v !== VISTA) { VISTA = b.dataset.v; draw(); }
  });
  sel.addEventListener("change", () => { code = sel.value; history.replaceState(null, "", `#provincia/${code}`); draw(); });
  draw();
  // "#provincia/<code>" (links from the lists) opens on that card; "#provincia/decide" is scrolled by main.js
  if (byCode[args[0]]) tuya();
}
