const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, FAM, showTip, hideTip } from "./data.js?v=0.2.108";
import { indexHtml, sectionIndex, declutter, leaders } from "./charts.js?v=0.2.108";
import { textos, md, INDICE } from "./textos.js?v=0.2.108";
import { pollChart, num, partyName, partyColor, cycleLabel, signed, signCell } from "./encuestas.js?v=0.2.108";

// The polls of past elections (tab "Encuestas históricas", route #historico; prose in textos/historico.md):
// any past general election's poll chart, polls against result per election, the final jump, pollster ratings.
export async function renderHistorico(app, args = []) {
  const [T, E, R, CI, GE] = await Promise.all([textos("historico"), load("encuestas.json"), load("ratings.json"),
    load("ciclos/index.json").catch(() => ({ ciclos: [] })), load("generales_encuestas.json").catch(() => null)]);
  const vars = { elecciones: R.elecciones.length };
  const slots = {
    eleccion: '<div class="chips" id="g-sel"></div>\n<div class="card" id="g-chart"></div>',
    aciertos: '<div class="scrollx" id="acc"></div>',
    errhist: '<div class="card chart" id="errhist"></div>',
  };
  const { html, sec } = md(T.principal, { vars, slots, page: "historico" });
  const IX = indexHtml(sec);
  app.innerHTML = `
    <div class="layout">
    ${IX.aside}
    <div class="content">
    ${html.replace(INDICE, IX.row)}
    </div></div>`;
  const $ = (s) => app.querySelector(s);

  sectionIndex(app);
  if (GE) pollsVsResult(app, GE, T);
  pollChart($("#chart-hist"), E, { CI, args, pastOnly: true, lastTable: false });
  const rated = R.ratings.filter((r) => r.elecciones >= 10).sort((a, b) => a.plus_minus - b.plus_minus);
  const pmMax = Math.max(...rated.map((r) => Math.abs(r.plus_minus)));
  const pmBar = (v) => `<div class="pm"><span style="${v < 0 ? `right:50%;width:${(-v / pmMax) * 50}%` : `left:50%;width:${(v / pmMax) * 50}%`};background:${v < 0 ? "#1d4ed8" : "#c2410c"}"></span><i></i></div>`;
  const leanCell = (v) => (v == null ? '<td class="num" style="color:var(--ink-3)">·</td>' : signCell(v));
  $("#acc").innerHTML = `<table><tr><th>Encuestadora</th><th class="num">Elecciones</th><th>Años</th><th class="num">Error</th><th>Frente al resto</th><th class="num"></th>
    <th class="num">PP</th><th class="num">PSOE</th><th class="num">Vox</th><th class="num">Izq.</th></tr>
    ${rated.map((r) => `<tr><td>${r.encuestadora}</td><td class="num">${r.elecciones}</td><td>${r.min}–${r.max}</td><td class="num">${num(r.mae, 2)}</td>
      <td style="width:22%">${pmBar(r.plus_minus)}</td><td class="num">${signed(r.plus_minus)}</td>
      ${leanCell(r.sesgo_pp)}${leanCell(r.sesgo_psoe)}${leanCell(r.sesgo_vox)}${leanCell(r.sesgo_izq)}</tr>`).join("")}</table>`;
  errHist($("#errhist"), R.elecciones);
  load("ciclos/salto.json").then((SJ) => saltos($("#salto"), SJ, T)).catch(() => {});
}

const TIPO_COLOR = { generales: "#1f4e8c", autonomicas: "#da5c22", europeas: "#2e8b57" };
function errHist(el, rows) {
  const W = Math.max(320, el.clientWidth || 900), H = 280, m = { t: 12, r: 16, b: 26, l: 40 };
  const x = d3.scaleLinear().domain(d3.extent(rows, (r) => r.anio)).nice().range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, Math.min(8, d3.max(rows, (r) => r.error_consenso))]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(5)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(Math.min(8, Math.floor(W / 60))).tickFormat(d3.format("d")).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v} pp`).tickSize(0)).call((g) => g.select(".domain").remove());
  svg.append("g").selectAll("circle").data(rows.filter((r) => r.error_consenso <= 8)).join("circle")
    .attr("cx", (r) => x(r.anio)).attr("cy", (r) => y(r.error_consenso)).attr("r", 4.5)
    .attr("fill", (r) => TIPO_COLOR[r.tipo]).attr("fill-opacity", 0.75).attr("stroke", "var(--surface)").attr("stroke-width", 1.5)
    .on("mousemove", (ev, r) => { const [t, a, c] = r.eleccion.split("|");
      showTip(`<b>${t === "autonomicas" ? `Autonómicas ${a}` : t[0].toUpperCase() + t.slice(1)} ${c.slice(0, 7)}</b><div class="row"><span>Error de la media</span><span>${num(r.error_consenso, 2)} pp</span></div><div class="row muted"><span>Encuestas finales</span><span>${r.encuestas}</span></div>`, ev); })
    .on("mouseleave", hideTip);
  el.insertAdjacentHTML("beforeend", `<div class="legend">${Object.entries({ generales: "Generales", autonomicas: "Autonómicas", europeas: "Europeas" }).map(([k, v]) => `<span><i class="sw" style="background:${TIPO_COLOR[k]}"></i>${v}</span>`).join("")}</div>`);
}

// small multiples: the last 120 days of each past cycle's average, with the result as ticks on election day
function saltos(el, SJ, T) {
  const W = 230, H = 150, m = { t: 20, r: 34, b: 18, l: 30 };
  el.innerHTML = `<div class="multiples">${SJ.ciclos.map((c, i) => `<div class="mult"><svg viewBox="0 0 ${W} ${H}" data-i="${i}"></svg></div>`).join("")}</div>
    ${md(T.salto, { page: "historico" }).html}`;
  SJ.ciclos.forEach((c, i) => {
    const svg = d3.select(el).select(`svg[data-i="${i}"]`);
    const days = c.dias.map((d) => new Date(d)), end = days.at(-1);
    const x = d3.scaleTime().domain([days[0], end]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 50]).range([H - m.b, m.t]);
    svg.append("text").attr("x", m.l).attr("y", 12).attr("font-weight", 600).attr("fill", "var(--ink)").text(cycleLabel(c.ciclo));
    svg.append("g").attr("class", "grid").selectAll("line").data([10, 20, 30, 40]).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues([0, 25, 50]).tickFormat((v) => `${v}%`).tickSize(0)).call((g) => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(3).tickFormat(d3.timeFormat("%b")).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
    const parties = Object.keys(c.resultado).sort((a, b) => c.resultado[b] - c.resultado[a]);
    for (const p of parties) {
      const col = partyColor(p);
      svg.append("path").attr("fill", "none").attr("stroke", col).attr("stroke-width", 1.6)
        .attr("d", d3.line().defined((v) => v != null).x((v, j) => x(days[j])).y((v) => y(v))(c.media[p]));
      svg.append("rect").attr("x", x(end) - 5).attr("y", y(c.resultado[p]) - 1.5).attr("width", 10).attr("height", 3).attr("fill", col).attr("stroke", "var(--surface)").attr("stroke-width", 0.8);
    }
    // the jump of each party, at its result; pushed apart where results are close (all of them are in the tooltip)
    const labels = declutter(parties.map((p) => { const last = [...c.media[p]].reverse().find((v) => v != null);
      return { p, d: c.resultado[p] - last, y: y(c.resultado[p]), priority: c.resultado[p] }; }), { min: m.t, max: H - m.b });
    const led = leaders(svg, labels, { x0: x(end) + 5, x1: x(end) + 8 });
    svg.append("g").selectAll("text").data(labels.filter((l) => !l.hidden)).join("text").attr("x", x(end) + (led ? 10 : 6)).attr("y", (l) => l.y + 4)
      .attr("fill", (l) => partyColor(l.p)).text((l) => `${l.d >= 0 ? "+" : "−"}${num(Math.abs(l.d))}`);
    svg.on("mousemove", (ev) => showTip(`<b>Generales ${cycleLabel(c.ciclo)}</b>${parties.map((p) => { const last = [...c.media[p]].reverse().find((v) => v != null);
      return `<div class="row"><span><i class="dot" style="background:${partyColor(p)}"></i>${partyName(p, c.ciclo)}</span><span>encuestas ${num(last)} · resultado ${num(c.resultado[p])} (${c.resultado[p] - last >= 0 ? "+" : "−"}${num(Math.abs(c.resultado[p] - last))})</span></div>`; }).join("")}`, ev))
      .on("mouseleave", hideTip).style("cursor", "pointer").on("click", () => { location.hash = `#historico/${c.ciclo}`; scrollTo(0, 0); });
  });
}

// per election: range of the final polls, their mean, the CIS raw intention and the result (generales_encuestas.json)
const PFAM = { sumar: "izq", iu: "izq", podemos: "izq", mas_pais: "izq", upyd: "cs", cds: "ucd" };
const pColor = (p) => (FAM[PFAM[p] ?? p] ?? FAM.otros).color;
const n1 = (x) => (x == null ? "·" : x.toFixed(1).replace(".", ","));
function pollsVsResult(app, G, T) {
  const $ = (s) => app.querySelector(s);
  const ciclos = Object.keys(G).sort();
  const label = (c) => new Date(c).toLocaleDateString("es-ES", { month: "short", year: "numeric" });
  let cur = ciclos.at(-1);
  function draw() {
    $("#g-sel").innerHTML = ciclos.map((c) => `<a class="chip ${c === cur ? "on" : ""}" href="#" data-c="${c}">${label(c)}</a>`).join("");
    $("#g-sel").querySelectorAll("a").forEach((a) => a.onclick = (ev) => { ev.preventDefault(); cur = a.dataset.c; draw(); });
    const g = G[cur], rows = g.partidos;
    const max = Math.max(...rows.flatMap((r) => [r.real, r.max ?? 0, r.cis_dir ?? 0])) * 1.08;
    const x = (v) => `${(v / max) * 100}%`;
    $("#g-chart").innerHTML = `<table class="pvr"><tr><th>Partido</th><th></th><th class="num">Encuestas</th><th class="num">Resultado</th><th class="num">Error</th></tr>
      ${rows.map((r) => { const c = pColor(r.p);
        return `<tr><td><i class="dot" style="background:${c}"></i>${r.n}</td>
        <td style="width:50%"><div class="pvr-track">
          ${r.min != null ? `<span class="pvr-range" style="left:${x(r.min)};width:${x(Math.max(0.3, r.max - r.min))};background:${c}"></span>` : ""}
          ${r.cis_dir != null ? `<b class="pvr-cis" style="left:${x(r.cis_dir)};border-color:${c}" title="CIS intención directa ${n1(r.cis_dir)}%"></b>` : ""}
          ${r.media != null ? `<span class="pvr-dot" style="left:${x(r.media)};background:${c}" title="Media ${n1(r.media)}%"></span>` : ""}
          <i class="pvr-real" style="left:${x(r.real)}" title="Resultado ${n1(r.real)}%"></i></div></td>
        <td class="num">${n1(r.media)}%</td><td class="num"><b>${n1(r.real)}%</b></td>
        <td class="num">${r.media == null ? "·" : `${r.media - r.real > 0 ? "+" : ""}${n1(r.media - r.real)}`}</td></tr>`; }).join("")}</table>
      ${md(T.eleccion, { vars: { encuestadoras: g.n, error_media: n1(g.mae_media), error_cis: g.mae_cis_dir != null ? ` · intención directa del CIS: ${n1(g.mae_cis_dir)} puntos` : "" }, page: "historico" }).html}`;
  }
  draw();
}
