// The model's results block (prose in textos/resultados.md), the same on the front page (#inicio, section "Qué dice
// nuestro modelo") and at the top of the Modelo tab: seats and vote per party as ranges, and the "Forma tu mayoría"
// box (seat bar, three draggable groups with their hatched bar, the evolution of the reader's blocs).
import { load, fechaLarga, showTip, hideTip } from "./data.js?v=0.2.108";
import { seatRows, bloques, declutter, leaders, cull } from "./charts.js?v=0.2.108";
import { num } from "./encuestas.js?v=0.2.108";
import { short, pc } from "./provincia.js?v=0.2.108";
import { textos, md } from "./textos.js?v=0.2.108";
const d3 = window.d3; // vendored UMD build, loaded by the entry page

/** The block's HTML and the index entries of its h3 subsections ([[id, label], ...]) for the page's section.
 *  PR: prediccion.json. Put `html` in the page, then call wireResultados once it is in the document. */
export async function resultadosHtml(PR) {
  const T = await textos("resultados");
  const slots = { escanos_partido: rangos(escanosFilas(PR), { dec: 0 }), voto_partido: rangos(votoFilas(PR), { dec: 1, pct: true }) };
  const { html, sub } = md(T.principal, { slots, page: "resultados" });
  return { html, sec: sub };
}

/** Draws the seat bar (#proj), the groups (#bloques) and the evolution (#evolucion) found under root. Also serves the front
 *  page without a model (PR null): then est is the poll projection and there is no evolution nor ranges.
 *  onGroups(at, sumOf) runs after every regrouping (sumOf(group) -> seats of that group in every draw, with DR). */
export function wireResultados(root, { PR, DR, est, conv, onGroups = null }) {
  seatRows(root.querySelector("#proj"), [{ label: PR ? "Escenario central" : "Estimación", e: est }], { labelWidth: PR ? 130 : 90, eid: "generales_2026-11" });
  // the evolution of the two blocs the reader has formed (inside "Forma tu mayoría"): redrawn on every regrouping
  const evoEl = root.querySelector("#evolucion");
  let evoAt = null, SD = null;
  const evo = () => { if (evoEl && SD && evoAt) evolucion(evoEl, SD, evoAt, conv); };
  if (PR && evoEl) load("prediccion_serie_draws.json").then((d) => { SD = d; evo(); }).catch(() => { evoEl.innerHTML = ""; });
  bloques(root.querySelector("#bloques"), est, { draws: PR ? DR : null, barra: { label: "Bloques", labelWidth: PR ? 130 : 90 },
    onChange: (at, sumOf) => { evoAt = { ...at }; evo(); onGroups?.(at, sumOf); } });
}

// Ranges per party ("Escaños por partido" and "Voto estimado"): a dot at the central estimate and a band from the 5th
// to the 95th percentile of the simulations; rows with `avg` also get a tick at the simple poll average.
function escanosFilas(PR) {
  const rows = Object.entries(PR.partidos).filter(([, d]) => d.escanos).map(([f, d]) => ({ f, c: d.escanos.p50, lo: d.escanos.p05, hi: d.escanos.p95 }));
  for (const [f, d] of Object.entries(PR.otros_escanos ?? {})) rows.push({ f, c: Math.round(d.media), lo: d.p05, hi: d.p95 });
  return rows.filter((r) => r.hi >= 1).sort((a, b) => b.c - a.c || b.hi - a.hi);
}
function votoFilas(PR) {
  return Object.entries(PR.partidos).map(([f, d]) => ({ f, c: d.voto.p50, lo: d.voto.p05, hi: d.voto.p95 }))
    .filter((r) => r.c >= 0.5).sort((a, b) => b.c - a.c);
}
function rangos(rows, { dec = 0, pct = false } = {}) {
  const max = Math.max(...rows.map((r) => Math.max(r.hi, r.avg ?? 0))) * 1.05;
  const x = (v) => `${(100 * v / max).toFixed(2)}%`;
  const n = (v) => `${num(v, dec)}${pct ? "%" : ""}`;
  return `<div class="rangos">${rows.map((r) => `<div class="rg-fila">
    <span class="rg-nom"><i class="dot" style="background:${pc(r.f)}"></i>${short(r.f)}</span>
    <span class="rg-pista"><span class="rg-franja" style="left:${x(r.lo)};width:${x(r.hi - r.lo)};background:${pc(r.f)}"></span><span class="rg-punto" style="left:${x(r.c)};background:${pc(r.f)}"></span>${r.avg != null ? `<span class="rg-media" style="left:${x(r.avg)}" title="Promedio de encuestas: ${n(r.avg)}"></span>` : ""}</span>
    <span class="rg-num"><b>${n(r.c)}</b> <span class="muted">${num(r.lo, dec)}–${num(r.hi, dec)}</span></span></div>`).join("")}</div>`;
}

// Seats of the reader's left and right blocs week by week since the election was called: each week's stored draws
// (prediccion_serie_draws.json) summed over the parties of the bloc, then p05, p50 and p95; with the 176 line
function evolucion(el, SD, at, conv) {
  const desde = conv?.calendario?.find((c) => c.clave === "convocatoria_boe")?.fecha ?? "2026-09-01";
  const DEF = { podemos: "izquierda", salf: "derecha" };   // parties with no seat in the central scenario
  const group = (f) => at[f] ?? DEF[f] ?? "otros";
  const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  const W = SD.semanas.filter((w) => w.f >= desde).map((w) => {
    const b = {};
    for (const g of ["izquierda", "derecha"]) {
      const fs = Object.keys(w.s).filter((f) => group(f) === g);
      const n = w.s[fs[0]]?.length ?? 0;
      const sum = Array.from({ length: n }, (_, i) => fs.reduce((a, f) => a + w.s[f][i], 0)).sort((x, y) => x - y);
      b[g] = n ? [q(sum, 0.05), q(sum, 0.5), q(sum, 0.95)] : [0, 0, 0];
    }
    return { f: w.f, bloques: b };
  });
  if (W.length < 2) { el.innerHTML = ""; return; }
  const B = [["derecha", "Derecha", "#1d84ce"], ["izquierda", "Izquierda", "#e30613"]];
  const w = el.clientWidth || 700, narrow = w < 560, h = 220, m = { t: 10, r: narrow ? 70 : 110, b: 24, l: 34 };
  const x = d3.scaleTime().domain(d3.extent(W, (d) => new Date(d.f))).range([m.l, w - m.r]);
  const lo = d3.min(W, (d) => Math.min(d.bloques.derecha[0], d.bloques.izquierda[0])), hi = d3.max(W, (d) => Math.max(d.bloques.derecha[2], d.bloques.izquierda[2]));
  const y = d3.scaleLinear().domain([Math.min(lo, 170) - 5, Math.max(hi, 180) + 5]).range([h - m.b, m.t]);
  el.innerHTML = "";
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%");
  const gx = svg.append("g").attr("transform", `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(narrow ? 3 : 5).tickFormat(d3.timeFormat("%e %b"))).attr("color", "var(--ink-3)");
  cull(gx.selectAll("text").nodes(), { pad: 4 });   // weekly ticks: drop the dates that run into the previous one
  svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5)).attr("color", "var(--ink-3)");
  svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(176)).attr("y2", y(176)).attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "4 3");
  svg.append("text").attr("x", m.l + 4).attr("y", y(176) - 4).attr("fill", "var(--ink-2)").text("176, mayoría");
  for (const [k, name, c] of B) {
    svg.append("path").attr("fill", c).attr("opacity", 0.12)
      .attr("d", d3.area().x((d) => x(new Date(d.f))).y0((d) => y(d.bloques[k][0])).y1((d) => y(d.bloques[k][2])).curve(d3.curveMonotoneX)(W));
    svg.append("path").attr("fill", "none").attr("stroke", c).attr("stroke-width", 2)
      .attr("d", d3.line().x((d) => x(new Date(d.f))).y((d) => y(d.bloques[k][1])).curve(d3.curveMonotoneX)(W));
  }
  const labs = declutter(B.map(([k, name, c]) => ({ name, c, v: W.at(-1).bloques[k][1], y: y(W.at(-1).bloques[k][1]), priority: W.at(-1).bloques[k][1] })), { min: m.t, max: h - m.b });
  leaders(svg, labs, { x0: w - m.r + 2, x1: w - m.r + 7 });
  for (const l of labs.filter((q) => !q.hidden)) svg.append("text").attr("x", w - m.r + 8).attr("y", l.y + 4).attr("fill", l.c).attr("font-weight", 600).text(`${l.name} ${l.v}`);
  const cross = svg.append("line").attr("y1", m.t).attr("y2", h - m.b).attr("stroke", "var(--ink-3)").style("display", "none");
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", w - m.l - m.r).attr("height", h - m.t - m.b).attr("fill", "transparent")
    .on("mousemove", (ev) => {
      const xd = x.invert(d3.pointer(ev)[0]);
      const d = W[d3.leastIndex(W, (o) => Math.abs(new Date(o.f) - xd))];
      cross.attr("x1", x(new Date(d.f))).attr("x2", x(new Date(d.f))).style("display", null);
      showTip(`<b>Semana del ${fechaLarga(d.f)}</b>${B.map(([k, name, c]) => `<div class="row"><span><i class="dot" style="background:${c}"></i>${name}</span><span>${d.bloques[k][1]} (${d.bloques[k][0]} a ${d.bloques[k][2]})</span></div>`).join("")}`, ev);
    })
    .on("mouseleave", () => { cross.style("display", "none"); hideTip(); });
}
