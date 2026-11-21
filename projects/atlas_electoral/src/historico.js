import { fix } from "./i18n.js?v=0.2.169";
const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, FAM, showTip, hideTip } from "./data.js?v=0.2.169";
import { indexHtml, sectionIndex, declutter, leaders } from "./charts.js?v=0.2.169";
import { textos, md, INDICE } from "./textos.js?v=0.2.169";
import { pollChart, num, partyName, partyColor, cycleLabel, signed, signCell } from "./encuestas.js?v=0.2.169";

// The polls of past elections (tab "Encuestas históricas", route #historico; prose in textos/historico.md):
// any past general election's poll chart, polls against result per election, the final jump, pollster ratings.
export async function renderHistorico(app, args = []) {
  const [T, E, R, CI, GE, EC] = await Promise.all([textos("historico"), load("encuestas.json"), load("ratings.json"),
    load("ciclos/index.json").catch(() => ({ ciclos: [] })), load("generales_encuestas.json").catch(() => null),
    load("error_casas.json").catch(() => null)]);
  const vars = { elecciones: R.elecciones.length };
  const slots = {
    eleccion: '<div class="chips" id="g-sel"></div>\n<div class="card" id="g-chart"></div>',
    aciertos: '<div class="scrollx" id="acc"></div>',
    errhist: '<div class="card chart" id="errhist"></div>',
    errores: '<div class="ec" id="ec"></div>',
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
  if (EC && $("#ec")) errorCasas($("#ec"), EC, T, args);
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
const n1 = (x) => (x == null ? "·" : fix(x, 1));
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

// ---- Error por casa (error_casas.json, pipeline/export_error_casas.py) ----
// Each house's last poll in the 21 days before each election, against the result (poll minus result, points).
// (a) industry error per party (mean over houses), (b) each house's mean absolute error, (c) one house's error
// with one party in every election, against the industry error. A house picked in the selector or in (b) is marked
// in all three. State in the URL: #historico/errores/<tipo>/<house>/<party>. The CIS comes as two houses split at its
// 2018 method change, named as in "Quién acierta"; an old link with plain "CIS" opens the newer one.
// Autonómicas: chart (a) has dots only, since a line would join different regions.
const EC_TIPOS = { generales: "Generales", autonomicas: "Autonómicas", europeas: "Europeas" };
const EC_NAME = { adelante: "Adelante Andalucía", mas_madrid: "Más Madrid", en_comu: "Comuns", por_andalucia: "Por Andalucía",
  upl: "UPL", cha: "CHA", teruel_existe: "Teruel Existe", alianca: "Aliança Catalana", soria_ya: "Soria ¡Ya!", geroa_bai: "Geroa Bai",
  el_pi: "El Pi", mes: "Més", nca: "NCa", foro: "Foro", prc: "PRC", pr: "PR+", par: "PAR", ahora_republicas: "Ahora Repúblicas" };
const ecName = (p, ciclo) => EC_NAME[p] ?? partyName(p, ciclo);
// the name of a party's line across many elections (the "sumar" key is Podemos, then Unidas Podemos, then Sumar)
const ecLine = (p, tipo) => (p === "sumar" && tipo === "generales" ? "Podemos, UP, Sumar" : ecName(p, "2023"));
const sgn = (v) => `${v > 0.05 ? "+" : v < -0.05 ? "−" : ""}${num(Math.abs(v))}`;
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
// hover on a mouse and tap on a touch screen open the same bubble
const tipOn = (sel, html) => sel.on("mousemove", (ev, d) => showTip(html(d), ev)).on("click.tip", (ev, d) => showTip(html(d), ev)).on("mouseleave", hideTip);

function errorCasas(el, EC, T, args) {
  const tipos = Object.keys(EC_TIPOS).filter((t) => EC.tipos[t]);
  const st = { tipo: tipos[0], casa: null, partido: "psoe" };
  if (args[0] === "errores") {
    if (tipos.includes(args[1])) st.tipo = args[1];
    if (args[2] && args[2] !== "-") st.casa = args[2] === "CIS" ? "CIS (desde 2018)" : args[2];   // links from before the CIS split
    if (args[3]) st.partido = args[3];
  }
  el.innerHTML = `<div class="ec-ctl"><div class="seg" id="ec-tipo">${tipos.map((t) => `<button data-t="${t}">${EC_TIPOS[t]}</button>`).join("")}</div>
    <label class="ec-sel">Casa <select id="ec-casa"></select></label></div>
    <div id="ec-intro"></div>
    <div class="card chart ec-a"><div id="ec-a-t"></div><div class="scrollx" id="ec-a"></div><div class="legend" id="ec-a-leg"></div></div>
    <div class="card chart ec-b"><div id="ec-b-t"></div><div id="ec-b"></div></div>
    <div class="card chart ec-c"><div id="ec-c-t"></div><div class="chips" id="ec-p"></div><div class="multiples ec-mult" id="ec-c"></div></div>
    <div id="ec-nota"></div>`;
  const $ = (s) => el.querySelector(s);
  let D;   // the current type, prepared

  function prepare() {
    const X = EC.tipos[st.tipo], E = X.elecciones;
    const rows = X.filas.map(([e, c, p, v, r, d]) => ({ e, c, p, v, r, d, err: v - r }));
    // industry error: mean over houses, per election and party
    const ind = d3.rollup(rows, (g) => ({ err: mean(g.map((x) => x.err)), n: g.length, lo: d3.min(g, (x) => x.err), hi: d3.max(g, (x) => x.err), r: g[0].r }), (x) => x.p, (x) => x.e);
    // each house: per election, the mean absolute error over the parties it reports; then the mean over elections
    const casas = d3.rollups(rows, (g) => {
      const per = d3.rollups(g, (h) => mean(h.map((x) => Math.abs(x.err))), (x) => x.e).sort((a, b) => a[0] - b[0]);
      const lean = (p) => { const h = g.filter((x) => x.p === p); return h.length ? mean(h.map((x) => x.err)) : null; };
      return { n: per.length, mae: mean(per.map((x) => x[1])), per, els: per.map((x) => x[0]), pp: lean("pp"), psoe: lean("psoe") };
    }, (x) => x.c).map(([c, v]) => ({ c, ...v }));
    const minEl = Math.min(3, E.length);
    const rated = casas.filter((h) => h.n >= minEl).sort((a, b) => a.mae - b.mae);
    // parties of chart (a): in 3 or more elections of this type and a fifth of them (all of them if there are fewer); of chart (c): in 2 or more
    const nEl = d3.rollup(rows, (g) => new Set(g.map((x) => x.e)).size, (x) => x.p);
    const byN = [...nEl].sort((a, b) => b[1] - a[1]);
    const lineas = byN.filter(([, n]) => n >= Math.min(E.length, Math.max(3, Math.floor(0.2 * E.length)))).map(([p]) => p);
    const elegibles = byN.filter(([, n]) => n >= 2).map(([p]) => p);
    const short = (e) => (st.tipo === "autonomicas" ? `${e.ambito} ${e.ciclo.slice(2, 4)}` : e.label);
    D = { E, rows, ind, casas, rated, minEl, lineas, elegibles, short };
    if (st.casa && !casas.some((h) => h.c === st.casa)) st.casa = null;
    if (!elegibles.includes(st.partido)) st.partido = elegibles.includes("psoe") ? "psoe" : elegibles[0];
  }

  function url() {
    history.replaceState(null, "", `#historico/errores/${st.tipo}/${st.casa ? encodeURIComponent(st.casa) : "-"}/${st.partido}`);
  }

  function draw() {
    const vars = { tipo: EC_TIPOS[st.tipo].toLowerCase(), n_elecciones: D.E.length, min: D.minEl, casas: D.rated.length, total_casas: D.casas.length };
    const part = (k) => (T[k] ? md(T[k], { vars, page: "historico" }).html : "");
    el.querySelectorAll("#ec-tipo button").forEach((b) => b.classList.toggle("on", b.dataset.t === st.tipo));
    const opts = [...D.casas].sort((a, b) => b.n - a.n || a.c.localeCompare(b.c, "es"));
    $("#ec-casa").innerHTML = `<option value="">Ninguna</option>${opts.map((h) => `<option value="${h.c}"${h.c === st.casa ? " selected" : ""}>${h.c} (${h.n})</option>`).join("")}`;
    $("#ec-intro").innerHTML = part("errores_intro");
    $("#ec-a-t").innerHTML = part("errores_industria");
    $("#ec-b-t").innerHTML = part("errores_casas");
    $("#ec-c-t").innerHTML = part("errores_patron");
    $("#ec-nota").innerHTML = part("errores_nota");
    industria();
    ranking();
    chipsPartido();
    patron();
  }

  // (a) industry error per party across elections, with the selected house's own errors as rings
  function industria() {
    const box = $("#ec-a"); box.innerHTML = "";
    const n = D.E.length, step = st.tipo === "autonomicas" ? 20 : 30;
    const W = Math.max(320, box.clientWidth || 900, step * n + 120), H = 300;
    const rot = (W - 162) / n < 46;   // slanted labels when they would touch
    const m = { t: 22, r: 118, b: rot ? 50 : 26, l: 44 };
    const x = d3.scalePoint().domain(d3.range(n)).range([m.l, W - m.r]).padding(0.3);
    const pts = D.lineas.flatMap((p) => [...(D.ind.get(p) ?? [])].map(([e, v]) => ({ p, e, ...v })));
    const mine = st.casa ? D.rows.filter((r) => r.c === st.casa && D.lineas.includes(r.p)) : [];
    const lim = Math.max(4, d3.max([...pts, ...mine], (d) => Math.abs(d.err)) ?? 4);
    const y = d3.scaleLinear().domain([-lim, lim]).nice().range([H - m.b, m.t]);
    const svg = d3.select(box).append("svg").attr("viewBox", `0 0 ${W} ${H}`).style("min-width", `${W}px`);
    svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(6)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
    svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "var(--ink-2)").attr("stroke-width", 1.2);
    svg.append("text").attr("x", m.l + 4).attr("y", m.t - 8).attr("class", "ec-zero").text("↑ por encima de 0: sobreestimado");
    svg.append("text").attr("x", m.l + 4).attr("y", H - m.b - 6).attr("class", "ec-zero").text("↓ por debajo: subestimado");
    const ax = svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
      .call(d3.axisBottom(x).tickFormat((i) => D.short(D.E[i])).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
    if (rot) ax.selectAll("text").attr("transform", "rotate(-50)").attr("text-anchor", "end").attr("dx", "-.4em").attr("dy", ".3em");
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat((v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`).tickSize(0)).call((g) => g.select(".domain").remove());
    svg.append("text").attr("transform", `translate(12,${(m.t + H - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").attr("class", "ec-zero").text("puntos");
    const order = [...D.lineas].sort((a, b) => (a === "psoe") - (b === "psoe"));   // PSOE drawn last, on top
    const joined = st.tipo !== "autonomicas";   // regional elections are different regions: no line between them
    if (joined) for (const p of order) {
      const s = [...(D.ind.get(p) ?? [])].sort((a, b) => a[0] - b[0]);
      svg.append("path").attr("fill", "none").attr("stroke", partyColor(p)).attr("stroke-width", p === "psoe" ? 3.2 : 1.6)
        .attr("stroke-opacity", p === "psoe" ? 1 : st.casa ? 0.35 : 0.6)
        .attr("d", d3.line().x(([e]) => x(e)).y(([, v]) => y(v.err))(s));
    }
    const g = svg.append("g").selectAll("circle").data(pts.sort((a, b) => (a.p === "psoe") - (b.p === "psoe"))).join("circle")
      .attr("cx", (d) => x(d.e)).attr("cy", (d) => y(d.err)).attr("r", (d) => (d.p === "psoe" ? 4.5 : 3.2))
      .attr("fill", (d) => partyColor(d.p)).attr("fill-opacity", (d) => (d.p === "psoe" || !st.casa ? 1 : 0.4)).attr("stroke", "var(--surface)").attr("stroke-width", 1);
    tipOn(g, (d) => { const e = D.E[d.e];
      return `<b>${ecName(d.p, e.ciclo)} · ${EC_TIPOS[st.tipo]} ${e.label}</b><div class="row"><span>Error de la industria</span><span>${sgn(d.err)} puntos</span></div>
        <div class="row"><span>Resultado</span><span>${num(d.r)}%</span></div><div class="row muted"><span>Casas (de menos a más)</span><span>${sgn(d.lo)} a ${sgn(d.hi)}</span></div>
        <div class="row muted"><span>Encuestas finales</span><span>${d.n}</span></div>`; });
    if (mine.length) {
      const r = svg.append("g").selectAll("circle").data(mine).join("circle").attr("class", "ec-mine")
        .attr("cx", (d) => x(d.e)).attr("cy", (d) => y(d.err)).attr("r", 6).attr("fill", "none").attr("stroke", (d) => partyColor(d.p)).attr("stroke-width", 2.2);
      tipOn(r, (d) => { const e = D.E[d.e], i = D.ind.get(d.p).get(d.e);
        return `<b>${st.casa} · ${ecName(d.p, e.ciclo)} · ${e.label}</b><div class="row"><span>Su error</span><span>${sgn(d.err)} puntos</span></div>
          <div class="row"><span>Industria</span><span>${sgn(i.err)}</span></div><div class="row muted"><span>Encuesta · resultado</span><span>${num(d.v)}% · ${num(d.r)}%</span></div>
          <div class="row muted"><span>Antelación</span><span>${d.d} días</span></div>`; });
    }
    // labels at the right end of each line
    const last = D.lineas.map((p) => { const s = [...D.ind.get(p)].sort((a, b) => a[0] - b[0]).at(-1); return { p, y: y(s[1].err), priority: p === "psoe" ? 99 : s[1].n, e: s[0] }; });
    // labels of lines reaching the last election are pushed apart at the right; a line that ended earlier is named above its end
    const lab = [...declutter(last.filter((l) => l.e === n - 1), { min: m.t, max: H - m.b }),
      ...last.filter((l) => l.e < n - 1).map((l) => ({ ...l, early: true, y: l.y - 12 }))];
    svg.append("g").selectAll("text").data(lab.filter((l) => !l.hidden)).join("text").attr("x", (l) => x(l.e) + (l.early ? 0 : 8)).attr("y", (l) => l.y + 4)
      .attr("text-anchor", (l) => (l.early ? "middle" : "start")).attr("class", "ec-lab")
      .attr("fill", (l) => partyColor(l.p)).attr("font-weight", (l) => (l.p === "psoe" ? 700 : 400)).attr("font-size", 12).text((l) => ecLine(l.p, st.tipo));
    $("#ec-a-leg").innerHTML = st.casa ? `<span><i class="ec-ring"></i>${st.casa}: su error con cada partido</span><span class="muted">${joined ? "líneas" : "puntos"}: media de todas las casas</span>` : "";
  }

  // (b) mean absolute error per house, best first
  function ranking() {
    const box = $("#ec-b"); box.innerHTML = "";
    if (!D.rated.length) { box.innerHTML = '<p class="note">Ninguna casa tiene encuestas en suficientes elecciones de este tipo.</p>'; return; }
    const W = Math.max(320, box.clientWidth || 700), row = 22, m = { t: 6, r: 48, b: 22, l: Math.min(190, W * 0.42) };
    const H = m.t + m.b + row * D.rated.length;
    const x = d3.scaleLinear().domain([0, d3.max(D.rated, (h) => h.mae)]).nice().range([m.l, W - m.r]);
    const y = d3.scaleBand().domain(D.rated.map((h) => h.c)).range([m.t, H - m.b]).padding(0.25);
    const svg = d3.select(box).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    svg.append("g").attr("class", "grid").selectAll("line").data(x.ticks(5)).join("line").attr("x1", x).attr("x2", x).attr("y1", m.t).attr("y2", H - m.b);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat((v) => `${num(v, v % 1 ? 1 : 0)}`).tickSize(0)).call((g) => g.select(".domain").remove());
    const gs = svg.append("g").selectAll("g").data(D.rated).join("g").attr("class", "ec-bar").classed("on", (h) => h.c === st.casa).style("cursor", "pointer");
    gs.append("rect").attr("x", 0).attr("y", (h) => y(h.c) - 2).attr("width", W).attr("height", y.bandwidth() + 4).attr("fill", "transparent");
    gs.append("rect").attr("class", "ec-b-bar").attr("x", m.l).attr("y", (h) => y(h.c)).attr("height", y.bandwidth()).attr("width", (h) => x(h.mae) - m.l);
    gs.append("text").attr("x", m.l - 6).attr("y", (h) => y(h.c) + y.bandwidth() / 2 + 4).attr("text-anchor", "end").attr("class", "ec-b-lab").text((h) => `${h.c} (${h.n})`);
    gs.append("text").attr("x", (h) => x(h.mae) + 5).attr("y", (h) => y(h.c) + y.bandwidth() / 2 + 4).attr("class", "ec-b-val").text((h) => num(h.mae));
    gs.on("click.sel", (ev, h) => { st.casa = st.casa === h.c ? null : h.c; url(); draw(); });
    tipOn(gs, (h) => { const yrs = d3.extent(h.els, (e) => D.E[e].ciclo.slice(0, 4));
      return `<b>${h.c}</b><div class="row"><span>Error medio</span><span>${num(h.mae, 2)} puntos por partido</span></div>
        <div class="row"><span>Elecciones</span><span>${h.n} (${yrs[0] === yrs[1] ? yrs[0] : `${yrs[0]}–${yrs[1]}`})</span></div>
        ${h.pp != null ? `<div class="row muted"><span>Error medio con el PP</span><span>${sgn(h.pp)}</span></div>` : ""}
        ${h.psoe != null ? `<div class="row muted"><span>Error medio con el PSOE</span><span>${sgn(h.psoe)}</span></div>` : ""}
        <div class="row muted"><span></span><span>${st.casa === h.c ? "toca para quitar la marca" : "toca para marcarla en los gráficos"}</span></div>`; });
  }

  function chipsPartido() {
    $("#ec-p").innerHTML = D.elegibles.map((p) => `<a href="#" class="chip${p === st.partido ? " on" : ""}" data-p="${p}"><i class="dot" style="background:${partyColor(p)}"></i>${ecLine(p, st.tipo)}</a>`).join("");
    $("#ec-p").querySelectorAll("a").forEach((a) => a.onclick = (ev) => { ev.preventDefault(); st.partido = a.dataset.p; url(); chipsPartido(); patron(); });
  }

  // (c) one small chart per house: its error with the chosen party in every election, and the industry error (grey)
  function patron() {
    const box = $("#ec-c"); box.innerHTML = "";
    const p = st.partido, I = D.ind.get(p) ?? new Map();
    const hs = D.rated.map((h) => {
      const pts = D.rows.filter((r) => r.c === h.c && r.p === p).sort((a, b) => a.e - b.e);
      const rel = pts.map((r) => r.err - I.get(r.e).err);
      return { ...h, pts, m: pts.length ? mean(pts.map((r) => r.err)) : null, rel: rel.length ? mean(rel) : null };
    }).filter((h) => h.pts.length).sort((a, b) => (b.c === st.casa) - (a.c === st.casa) || b.pts.length - a.pts.length || a.c.localeCompare(b.c, "es"));
    if (!hs.length) { box.innerHTML = '<p class="note">Ninguna de estas casas publicó ese partido.</p>'; return; }
    const W = 230, H = 130, m = { t: 34, r: 8, b: 14, l: 28 };
    const n = D.E.length;
    const x = d3.scalePoint().domain(d3.range(n)).range([m.l, W - m.r]).padding(0.4);
    const lim = Math.max(3, d3.max(hs.flatMap((h) => h.pts), (r) => Math.abs(r.err)), d3.max([...I.values()], (v) => Math.abs(v.err)) ?? 0);
    const y = d3.scaleLinear().domain([-lim, lim]).nice().range([H - m.b, m.t]);
    const col = partyColor(p), ind = [...I].sort((a, b) => a[0] - b[0]);
    box.innerHTML = hs.map((h, i) => `<div class="mult ec-m${h.c === st.casa ? " on" : ""}"><svg viewBox="0 0 ${W} ${H}" data-i="${i}"></svg></div>`).join("");
    hs.forEach((h, i) => {
      const svg = d3.select(box).select(`svg[data-i="${i}"]`);
      svg.append("text").attr("x", 0).attr("y", 12).attr("font-weight", 600).attr("fill", "var(--ink)").text(`${h.c} (${h.pts.length})`);
      svg.append("text").attr("x", 0).attr("y", 26).attr("class", "ec-zero").text(`media ${sgn(h.m)} · frente a la industria ${sgn(h.rel)}`);
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(3).tickFormat((v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}`).tickSize(0)).call((g) => g.select(".domain").remove());
      svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "var(--ink-3)");
      svg.append("path").attr("fill", "none").attr("stroke", "var(--ink-3)").attr("stroke-opacity", 0.7).attr("stroke-width", 1.2)
        .attr("d", d3.line().x(([e]) => x(e)).y(([, v]) => y(v.err))(ind));
      svg.append("g").selectAll("line").data(h.pts).join("line").attr("x1", (r) => x(r.e)).attr("x2", (r) => x(r.e)).attr("y1", (r) => y(I.get(r.e).err)).attr("y2", (r) => y(r.err))
        .attr("stroke", col).attr("stroke-opacity", 0.5);
      const c = svg.append("g").selectAll("circle").data(h.pts).join("circle").attr("cx", (r) => x(r.e)).attr("cy", (r) => y(r.err)).attr("r", 3.6)
        .attr("fill", col).attr("stroke", "var(--surface)").attr("stroke-width", 1);
      tipOn(c, (r) => { const e = D.E[r.e];
        return `<b>${h.c} · ${ecName(p, e.ciclo)} · ${EC_TIPOS[st.tipo]} ${e.label}</b><div class="row"><span>Su error</span><span>${sgn(r.err)} puntos</span></div>
          <div class="row"><span>Error de la industria</span><span>${sgn(I.get(r.e).err)}</span></div>
          <div class="row muted"><span>Encuesta · resultado</span><span>${num(r.v)}% · ${num(r.r)}%</span></div><div class="row muted"><span>Antelación</span><span>${r.d} días</span></div>`; });
    });
  }

  el.querySelectorAll("#ec-tipo button").forEach((b) => b.onclick = () => { st.tipo = b.dataset.t; prepare(); url(); draw(); });
  $("#ec-casa").onchange = (ev) => { st.casa = ev.target.value || null; url(); draw(); };
  prepare();
  draw();
}
