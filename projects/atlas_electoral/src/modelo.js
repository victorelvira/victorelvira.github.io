const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, de100, fechaLarga } from "./data.js?v=0.2.155";
import { lines, indexHtml, sectionIndex } from "./charts.js?v=0.2.155";
import { textos, md, INDICE } from "./textos.js?v=0.2.155";
import { num, partyName, partyColor } from "./encuestas.js?v=0.2.155";
import { t as tr, loc, sep } from "./i18n.js?v=0.2.155";
import { conjunta } from "./conjunta.js?v=0.2.155";

const pc = (x) => `${de100(x)}%`;

// The statistical model (tab "Modelo", route #modelo; prose in textos/modelo.md): what is only here (table, histogram,
// weekly series, back-test); the main results are on the front page (resultados.js), not repeated (Víctor, 2026-11-15).
export async function renderModelo(app) {
  const T = await textos("modelo");
  const P = await load("prediccion.json").catch(() => null);
  const DR = P ? await load("prediccion_draws.json").catch(() => null) : null;
  const pred = P ? prediccionHtml(P, T) : md(T.sin_prediccion, { page: "modelo" }).html;
  const glosario = T.glosario ? md(T.glosario, { page: "modelo" }).html : null;   // folded "Glosario" box (part "glosario")
  const fotos = await creditosFotos(T);   // folded "Fotos de los candidatos" box (part "fotos"), from lideres.json
  const { html, sec } = md(T.principal, { slots: { pred, glosario, fotos }, page: "modelo" });
  const IX = indexHtml(sec);
  app.innerHTML = `
    <div class="layout">
    ${IX.aside}
    <div class="content">
    ${html.replace(INDICE, IX.row)}
    </div></div>`;
  const $ = (s) => app.querySelector(s);
  sectionIndex(app);
  if (P) {
    // the histogram of the starting blocs (the same groups as the front page's "Forma tu mayoría" starts with)
    const BLOQ = { derecha: ["pp", "vox", "salf"], izquierda: ["psoe", "sumar", "podemos", "erc", "bildu", "pnv", "bng"] };
    if (DR) {
      const dib = () => histograma($("#pred-hist"))((g) => DR.s[0].map((_, i) => DR.partidos.reduce((a, f, k) => a + (BLOQ[g].includes(f) ? DR.s[k][i] : 0), 0)));
      dib();
      conjunta($(".cj-card"), DR, dib);   // tabs: the two histograms, the joint as a heat map and in 3D (src/conjunta.js)
    }
    prediccion(app, P, T);
  }
  // "Cuánto fiarse" (textos/modelo.md, part "fiarse"): back-test (backtest.py) and sensitivity to the common error (analysis_error_comun.py)
  const [BT, EC] = await Promise.all([load("backtest.json").catch(() => null), load("error_comun.json").catch(() => null)]);
  if ($("#fiarse")) $("#fiarse").innerHTML = BT ? md(T.fiarse, { page: "modelo", flags: { sensibilidad: !!EC }, vars: {
    elecciones: BT.elecciones, desde: BT.desde, acierto_voto: de100(BT.horizontes[7].voto.en90), acierto_escanos: de100(BT.horizontes[7].escanos.en90),
    error_x15: EC ? de100(EC.escala_x15) : null, error_x08: EC ? de100(EC.escala_x08) : null } }).html : "";
}

// credits of the leader photos (lideres.json, pipeline/lideres.py): author and licence of each, with links (Víctor, 2026-11-16).
// Without the file or the part, the section stays empty (md drops an empty slot).
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
async function creditosFotos(T) {
  const L = T.fotos ? await load("lideres.json").catch(() => null) : null;
  if (!L || !Object.keys(L).length) return null;
  const items = Object.values(L).map((x) => `<li><img src="${esc(new URL(`../data/${x.img}`, import.meta.url).href)}" alt="" width="36" height="36" loading="lazy" style="object-fit:cover;object-position:top;border-radius:50%;vertical-align:middle;margin-right:.5em">`
    + `${esc(x.nombre)} (${esc(x.lista)}, ${esc(x.provincia)}): ${tr("{foto} de {autor}", { foto: `<a href="${esc(x.fuente)}" target="_blank" rel="noopener">${tr("foto")}</a>`, autor: esc(x.autor) })}, `
    + `${x.licencia_url ? `<a href="${esc(x.licencia_url)}" target="_blank" rel="noopener">${esc(x.licencia)}</a>` : esc(x.licencia === "Public domain" ? tr("dominio público") : x.licencia)}.</li>`).join("");
  return md(T.fotos, { slots: { lista_fotos: `<ul class="creditos-fotos">${items}</ul>` }, page: "modelo" }).html;
}

// the model's forecast (prediccion.json, pipeline/prediccion.py): the part "prediccion" of modelo.md, with the shared block
function prediccionHtml(P, T) {
  const parties = Object.keys(P.partidos);
  const sims = P.draws.toLocaleString(loc(), { useGrouping: "always" });
  const vars = { fecha: fechaLarga(P.fecha), n_encuestas: P.n_encuestas, simulaciones: sims, pp_primero: pc(P.p_pp_primero),
    b_escala: sep(P.parametros.b_escala), s_ccaa: P.parametros.s_ccaa, s_prov: P.parametros.s_prov };
  const slots = {
    tabla_partidos: `<div class="scrollx"><table><tr><th>${tr("Partido")}</th><th class="num">${tr("Voto, mediana")}</th><th class="num">${tr("Horquilla (90%)")}</th><th class="num">${tr("Escaños, mediana")}</th><th class="num">${tr("Horquilla (90%)")}</th></tr>
      ${parties.map((p) => { const d = P.partidos[p]; return `<tr><td><i class="dot" style="background:${partyColor(p)}"></i>${partyName(p, "2026")}</td><td class="num">${num(d.voto.p50)}%</td><td class="num">${tr("{a} a {b}", { a: num(d.voto.p05), b: num(d.voto.p95) })}</td><td class="num">${d.escanos ? d.escanos.p50 : "·"}</td><td class="num">${d.escanos ? tr("{a} a {b}", { a: d.escanos.p05, b: d.escanos.p95 }) : "·"}</td></tr>`; }).join("")}</table></div>`,
    histograma: '<div class="card chart cj-card"><div id="pred-hist"></div></div>',
    serie_probabilidad: '<div class="chart" id="pred-prob"></div>',
    serie_escanos: '<div class="chart" id="pred-esc"></div>',
    diario: '<div class="chart" id="pred-dia"></div><div id="pred-dia-t"></div>',
  };
  return md(T.prediccion, { vars, slots, page: "modelo" }).html;
}

// seats of the left and right groups in every simulation; returns the function that redraws it for a regrouping
function histograma(elh) {
  return (sumOf) => {
    elh.innerHTML = "";
    const G = [["izquierda", tr("Izquierda"), "#e30613"], ["derecha", tr("Derecha"), "#1d84ce"]].map(([g, n, c]) => ({ n, c, t: sumOf(g) }));
    const lo = Math.min(...G.map((g) => d3.min(g.t))), hi = Math.max(...G.map((g) => d3.max(g.t)));
    const W = Math.max(340, elh.clientWidth || 900), H = 200, m = { t: 14, r: 16, b: 26, l: 36 };
    const x = d3.scaleLinear().domain([Math.min(lo, 170), Math.max(hi, 182) + 1]).range([m.l, W - m.r]);
    // counts per seat total; "cnt", not "c": "c" is the bloc colour (it used to be overwritten, so the bars had no colour)
    const bins = G.map((g) => { const cnt = new Map(); for (const v of g.t) cnt.set(v, (cnt.get(v) ?? 0) + 1); return { ...g, cnt }; });
    const y = d3.scaleLinear().domain([0, d3.max(bins, (b) => d3.max([...b.cnt.values()]))]).nice().range([H - m.b, m.t]);
    const svg = d3.select(elh).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    const bw = Math.max(1, x(1) - x(0) - 0.5);
    for (const b of bins) svg.append("g").selectAll("rect").data([...b.cnt]).join("rect").attr("x", ([v]) => x(v)).attr("y", ([, n]) => y(n)).attr("width", bw).attr("height", ([, n]) => y(0) - y(n)).attr("fill", b.c).attr("opacity", 0.7);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
    svg.append("line").attr("x1", x(176)).attr("x2", x(176)).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "var(--ink)").attr("stroke-dasharray", "4 3");
    svg.append("text").attr("x", x(176) + 5).attr("y", m.t + 8).attr("fill", "var(--ink)").text("176");
    elh.insertAdjacentHTML("beforeend", `<div class="legend">${bins.map((b) => `<span><i class="sw" style="background:${b.c}"></i>${b.n}</span>`).join("")}</div>`);
  };
}

// the weekly series and the back-test paragraph, drawn into the page once it is in the document
function prediccion(el, P, T) {
  load("prediccion_serie.json").then((SE) => {
    const w = SE.semanas, dt = (s) => new Date(s);
    lines(el.querySelector("#pred-prob"), [{ id: "d", name: tr("PP, Vox y SALF"), color: "#1d84ce", values: w.map((x) => ({ date: dt(x.f), v: x.p_derecha, label: x.f })) }],
      { height: 220, yMin: 0, yMax: 1 });
    lines(el.querySelector("#pred-esc"), Object.keys(P.partidos).filter((p) => w.at(-1).esc[p]?.[1] >= 1).map((p) => ({ id: p, name: partyName(p, "2026"), color: partyColor(p),
      values: w.map((x) => ({ date: dt(x.f), v: x.esc[p]?.[1] ?? null, label: x.f })) })), { height: 220, fmt: (v) => tr("{r} escaños", { r: Math.round(v) }), yTicks: (v) => v, yMin: 0 });
  }).catch(() => {});
  // the published forecast as it stood each day (registro_diario.json, pipeline/registro_diario.py): never recomputed
  load("registro_diario.json").then((R) => {
    const d = R.dias, PS = ["pp", "psoe", "vox", "sumar", "podemos", "salf"], dt = (s) => new Date(s);
    if (!d.length) return;
    if (d.length > 1) lines(el.querySelector("#pred-dia"), [{ id: "d", name: tr("PP y Vox llegan a 176"), color: "#1d84ce", values: d.map((x) => ({ date: dt(x.fecha), v: x.p_ppvox_176, label: x.fecha })) }],
      { height: 180, yMin: 0, yMax: 1 });
    const dia = (s) => new Date(`${s}T12:00`).toLocaleDateString(loc(), { day: "numeric", month: "short" });
    el.querySelector("#pred-dia-t").innerHTML = `<div class="scrollx"><table class="pred-dia"><tr><th>${tr("Día")}</th><th>${tr("Encuestas hasta")}</th><th class="num">${tr("PP y Vox llegan a 176")}</th>${PS.map((p) => `<th class="num"><i class="dot" style="background:${partyColor(p)}"></i>${partyName(p, "2026")}</th>`).join("")}</tr>
      ${[...d].reverse().map((x) => `<tr><td>${dia(x.fecha)}${x.cambio ? " *" : ""}</td><td>${x.ultimo_campo ? dia(x.ultimo_campo) : "·"}</td><td class="num">${x.p_ppvox_176 != null ? `${(x.p_ppvox_176 * 100).toLocaleString(loc(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : "·"}</td>${PS.map((p) => `<td class="num">${x.esc[p] ?? "·"}</td>`).join("")}</tr>`).join("")}</table></div>`;
  }).catch(() => {});
  load("backtest.json").then((B) => {
    const h7 = B.horizontes[7], h30 = B.horizontes[30];
    el.querySelector("#pred-bt").innerHTML = md(T.backtest, { vars: { generales: B.elecciones, desde: B.desde, voto_7: pc(h7.voto.en90), escanos_7: pc(h7.escanos.en90),
      voto_30: pc(h30.voto.en90), escanos_30: pc(h30.escanos.en90) }, page: "modelo" }).html;
  }).catch(() => {});
}
