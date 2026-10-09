const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, FAM, showTip, hideTip } from "./data.js?v=0.2.9";
import { lines } from "./charts.js?v=0.2.9";

export const POLL_PARTY = {
  pp: { n: "PP", c: () => FAM.pp.color },
  psoe: { n: "PSOE", c: () => FAM.psoe.color },
  vox: { n: "Vox", c: () => FAM.vox.color },
  sumar: { n: "Sumar", c: () => "#d6246e" },
  podemos: { n: "Podemos", c: () => "#6b2e68" },
  salf: { n: "SALF", c: () => "#8a6d3b" },
  erc: { n: "ERC", c: () => FAM.erc.color },
  junts: { n: "Junts", c: () => FAM.junts.color },
  bildu: { n: "Bildu", c: () => FAM.bildu.color },
  pnv: { n: "PNV", c: () => FAM.pnv.color },
};
const MAIN = ["pp", "psoe", "vox", "sumar", "podemos", "salf"];
const num = (x, d = 1) => (x == null ? "·" : x.toFixed(d).replace(".", ","));

export async function renderEncuestas(app) {
  const [E, R, K] = await Promise.all([load("encuestas.json"), load("ratings.json"), load("cocina.json")]);
  const days = E.dias.map((d) => new Date(d));
  const show = new Set(MAIN.filter((p) => E.parties.includes(p)));

  app.innerHTML = `
    <h1>Encuestas hacia el 29N</h1>
    <p class="sub">Promedio de ${E.polls.length} encuestas publicadas desde julio de 2023 (último trabajo de campo: ${E.actualizado}). Cada encuestadora pesa lo mismo aunque publique más a menudo, y se corrige su sesgo sistemático respecto al resto.</p>
    <div class="stats" id="kpi"></div>
    <div class="controls" id="toggles"></div>
    <div class="card chart" id="ch"></div>
    <p class="note">Puntos: cada encuesta publicada, tal cual, sin corregir. Pasa el ratón (o toca) un punto para ver quién la hizo, cuándo y qué daba a cada partido; se resaltan sus puntos en los demás partidos y las demás encuestas de la misma casa. Un clic la deja fija. Línea: promedio corregido. Banda: dispersión habitual entre encuestas (±1,28 desviaciones, un 80%).</p>
    <p><a href="#simulador/encuestas">→ Ver estos porcentajes convertidos en escaños</a></p>
    <h2>Sesgo de cada encuestadora en este ciclo</h2>
    <p class="note">Diferencia media, en puntos, entre sus encuestas y el promedio. Positivo = da más a ese partido que el resto. Solo encuestadoras con 8 o más sondeos.</p>
    <div id="house"></div>
    <h2>La cocina: intención directa frente a estimación</h2>
    <p class="sub">Las encuestadoras no publican lo que contesta la gente, sino una estimación: ponderan por el recuerdo de voto, reparten a los indecisos y tienen en cuenta quién irá a votar. Algunas publican también la intención directa, la respuesta tal cual. Aquí se comparan las dos, ambas sobre el voto a partidos.</p>
    <div class="controls"><select id="ck-casa"></select><div class="seg" id="ck-party"></div></div>
    <div class="card chart" id="cocina"></div>
    <div id="ck-tab"></div>
    <p class="note">Intención directa: respuesta a «¿a qué partido votarías?», recalculada sobre quienes nombran un partido (sin blanco, nulo, abstención, indecisos ni quien no contesta). Izquierda: Sumar, Podemos, Más País e IU (Unidas Podemos en 2016-2019). Para 40dB y el CIS, la intención directa sale de sus propios informes; para el resto, de las tablas de intención directa recopiladas en Wikipedia, comparando solo los partidos que aparecen en las dos (la intención directa de esos partidos se reescala a la suma que les da la estimación). Fuentes: informes de 40dB para El País y la SER; marginales y estimaciones del CIS (origen de los datos: Centro de Investigaciones Sociológicas); Wikipedia.</p>
    <h2>¿Quién acierta? Ranking histórico, 1977–2026</h2>
    <p class="sub">Última encuesta de cada casa publicada entre 1 y 35 días antes de ${R.elecciones.length} elecciones (generales, autonómicas y europeas). «Frente al resto» compara su error con el de las demás casas en las mismas elecciones, para no castigar a quien encuestó elecciones difíciles, y descuenta la antelación (cada día antes de la votación añade unas ${num(R.metodo.pendiente_pp_dia * 100, 1)} centésimas de punto de error); negativo = acierta más. Casas con 10 o más elecciones. El CIS aparece dividido en dos etapas porque cambió su método de estimación en 2018.</p>
    <div class="scrollx" id="acc"></div>
    <p class="note">Error: media del error absoluto, en puntos, en los partidos con un 3% o más. Sesgo: cuánto da de más (+) o de menos (−) a cada familia, corregido hacia cero cuando hay pocas elecciones.</p>
    <h2>¿Han mejorado las encuestas?</h2>
    <p class="note">Error de la media de las encuestas finales en cada elección (puntos por partido).</p>
    <div class="card chart" id="errhist"></div>
    <h2>El error de las encuestas en cada elección</h2>
    <p class="note">Media de las encuestas de las dos últimas semanas menos el resultado real. Positivo = sobreestimado.</p>
    <div id="bias"></div>`;
  const $ = (s) => app.querySelector(s);

  $("#kpi").innerHTML = MAIN.filter((p) => E.ultimo[p] != null).map((p) => `<div class="stat"><div class="v"><i class="dot" style="background:${POLL_PARTY[p].c()}"></i>${num(E.ultimo[p])}%</div><div class="k">${POLL_PARTY[p].n}</div></div>`).join("");
  $("#toggles").innerHTML = E.parties.map((p) => `<label><input type="checkbox" data-p="${p}" ${show.has(p) ? "checked" : ""}/> ${POLL_PARTY[p].n}</label>`).join("");
  $("#toggles").querySelectorAll("input").forEach((i) => i.onchange = () => { i.checked ? show.add(i.dataset.p) : show.delete(i.dataset.p); draw(); });

  function draw() {
    const el = $("#ch"); el.innerHTML = "";
    const W = 1000, H = 420, m = { t: 12, r: 70, b: 26, l: 36 };
    const parties = E.parties.filter((p) => show.has(p));
    const x = d3.scaleTime().domain(d3.extent(days)).range([m.l, W - m.r]);
    const ymax = d3.max(parties, (p) => d3.max(E.polls, (q) => q.v[p])) ?? 40;
    const y = d3.scaleLinear().domain([0, Math.min(50, ymax + 2)]).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(6)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat((v) => `${v}%`).tickSize(0)).call((g) => g.select(".domain").remove());
    const x0 = x.domain()[0];
    const gBands = svg.append("g"), gTrail = svg.append("g"), gDots = svg.append("g"), gLines = svg.append("g");
    for (const p of parties) {
      const col = POLL_PARTY[p].c();
      const pts = days.map((d, i) => ({ d, m: E.media[p][i], s: E.sd[p][i] })).filter((o) => o.m != null);
      gBands.append("path").attr("fill", col).attr("opacity", 0.12)
        .attr("d", d3.area().x((o) => x(o.d)).y0((o) => y(o.m - 1.28 * o.s)).y1((o) => y(o.m + 1.28 * o.s)).curve(d3.curveMonotoneX)(pts));
      gLines.append("path").attr("fill", "none").attr("stroke", col).attr("stroke-width", 2).attr("pointer-events", "none")
        .attr("d", d3.line().x((o) => x(o.d)).y((o) => y(o.m)).curve(d3.curveMonotoneX)(pts));
    }
    // one dot per poll and party: the polls as published, before any correction
    const dots = [];
    E.polls.forEach((q, i) => { if (new Date(q.d) >= x0) for (const p of parties) if (q.v[p] != null)
      dots.push({ i, p, cx: x(new Date(q.d)), cy: y(q.v[p]) }); });
    const circles = gDots.selectAll("circle").data(dots).join("circle")
      .attr("cx", (o) => o.cx).attr("cy", (o) => o.cy).attr("r", 2).attr("fill", (o) => POLL_PARTY[o.p].c()).attr("opacity", 0.25);
    const delaunay = d3.Delaunay.from(dots, (o) => o.cx, (o) => o.cy);
    const labels = parties.map((p) => ({ p, y: y(E.media[p].at(-1)) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 13);
    svg.append("g").selectAll("text").data(labels).join("text").attr("x", W - m.r + 6).attr("y", (l) => l.y + 4)
      .attr("font-size", 12).attr("fill", "var(--ink-2)").text((l) => `${POLL_PARTY[l.p].n} ${num(E.media[l.p].at(-1))}`);
    const cross = svg.append("line").attr("stroke", "var(--ink-3)").attr("y1", m.t).attr("y2", H - m.b).style("display", "none");

    // hover a dot: that poll (every party) and the same pollster's other polls stand out
    let pinned = null;
    const fdate = (s) => new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
    function focus(i) {
      const house = i == null ? null : E.polls[i].e;
      circles.attr("r", (o) => (o.i === i ? 5 : house && E.polls[o.i].e === house ? 3 : 2))
        .attr("opacity", (o) => (i == null ? 0.25 : o.i === i ? 1 : E.polls[o.i].e === house ? 0.85 : 0.06))
        .attr("stroke", (o) => (o.i === i ? "var(--surface)" : null)).attr("stroke-width", 1.5);
      circles.filter((o) => o.i === i).raise();
      gTrail.selectAll("*").remove();
      if (i == null) return;
      for (const p of parties) {
        const tr = dots.filter((o) => o.p === p && E.polls[o.i].e === house).sort((a, b) => a.cx - b.cx);
        gTrail.append("path").attr("fill", "none").attr("stroke", POLL_PARTY[p].c()).attr("stroke-width", 1)
          .attr("stroke-dasharray", "3 3").attr("opacity", 0.7).attr("d", d3.line().x((o) => o.cx).y((o) => o.cy)(tr));
      }
    }
    function pollTip(i, ev) {
      const q = E.polls[i];
      const nHouse = E.polls.filter((r) => r.e === q.e).length;
      const rows = Object.entries(q.v).sort((a, b) => b[1] - a[1]);
      showTip(`<b>${q.e}</b>${q.m ? ` · ${q.m}` : ""}
        <div class="row muted"><span>Trabajo de campo</span><span>${q.f0 === q.f1 ? fdate(q.f1) : `${fdate(q.f0)} a ${fdate(q.f1)}`}</span></div>
        ${q.n ? `<div class="row muted"><span>Muestra</span><span>${q.n.toLocaleString("es-ES")}</span></div>` : ""}
        ${rows.map(([p, v]) => `<div class="row"><span><i class="dot" style="background:${POLL_PARTY[p]?.c() ?? "var(--ink-3)"}"></i>${POLL_PARTY[p]?.n ?? p}</span><span>${num(v)}%</span></div>`).join("")}
        <div class="row muted"><span>Encuestas de ${q.e} en el gráfico</span><span>${nHouse}</span></div>`, ev);
    }
    function avgTip(mx, ev) {
      const i = d3.leastIndex(days, (d) => Math.abs(x(d) - mx));
      cross.attr("x1", x(days[i])).attr("x2", x(days[i])).style("display", null);
      const rows = parties.filter((p) => E.media[p][i] != null).sort((a, b) => E.media[b][i] - E.media[a][i]);
      showTip(`<b>Promedio, ${fdate(days[i])}</b>${rows.map((p) =>
        `<div class="row"><span><i class="dot" style="background:${POLL_PARTY[p].c()}"></i>${POLL_PARTY[p].n}</span><span>${num(E.media[p][i])}%</span></div>`).join("")}`, ev);
    }
    const near = (mx, my) => { if (!dots.length) return null; const j = delaunay.find(mx, my);
      return Math.hypot(dots[j].cx - mx, dots[j].cy - my) <= 9 ? dots[j].i : null; };
    svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b).attr("fill", "transparent")
      .style("cursor", "crosshair")
      .on("mousemove", (ev) => {
        if (pinned != null) return;
        const [mx, my] = d3.pointer(ev);
        const i = near(mx, my);
        if (i != null) { cross.style("display", "none"); focus(i); pollTip(i, ev); } else { focus(null); avgTip(mx, ev); }
      })
      .on("click", (ev) => {   // click or tap pins a poll; clicking elsewhere releases it
        const [mx, my] = d3.pointer(ev);
        const i = near(mx, my);
        pinned = i != null && i !== pinned ? i : null;
        focus(pinned); if (pinned != null) pollTip(pinned, ev); else hideTip();
      })
      .on("mouseleave", () => { if (pinned == null) { cross.style("display", "none"); focus(null); hideTip(); } });
  }
  draw();

  const hp = ["pp", "psoe", "vox", "sumar"];
  const sign = (v) => (v == null ? "·" : Math.abs(v) < 0.05 ? "0,0" : `${v > 0 ? "+" : ""}${num(v)}`);
  const cell = (v) => `<td class="num" style="color:${v > 1 ? "var(--ink)" : v < -1 ? "var(--ink)" : "var(--ink-3)"};font-weight:${Math.abs(v ?? 0) > 1 ? 600 : 400}">${sign(v)}</td>`;
  $("#house").innerHTML = `<table><tr><th>Encuestadora</th><th class="num">n</th>${hp.map((p) => `<th class="num">${POLL_PARTY[p].n}</th>`).join("")}</tr>
    ${Object.entries(E.house).sort((a, b) => E.house_n[b[0]] - E.house_n[a[0]]).map(([e, h]) => `<tr><td>${e}</td><td class="num">${E.house_n[e]}</td>${hp.map((p) => cell(h[p])).join("")}</tr>`).join("")}</table>`;
  const rated = R.ratings.filter((r) => r.elecciones >= 10).sort((a, b) => a.plus_minus - b.plus_minus);
  const pmMax = Math.max(...rated.map((r) => Math.abs(r.plus_minus)));
  const pmBar = (v) => `<div class="pm"><span style="${v < 0 ? `right:50%;width:${(-v / pmMax) * 50}%` : `left:50%;width:${(v / pmMax) * 50}%`};background:${v < 0 ? "#1d4ed8" : "#c2410c"}"></span><i></i></div>`;
  const leanCell = (v) => (v == null ? '<td class="num" style="color:var(--ink-3)">·</td>' : cell(v));
  $("#acc").innerHTML = `<table><tr><th>Encuestadora</th><th class="num">Elecciones</th><th>Años</th><th class="num">Error</th><th>Frente al resto</th><th class="num"></th>
    <th class="num">PP</th><th class="num">PSOE</th><th class="num">Vox</th><th class="num">Izq.</th></tr>
    ${rated.map((r) => `<tr><td>${r.encuestadora}</td><td class="num">${r.elecciones}</td><td>${r.min}–${r.max}</td><td class="num">${num(r.mae, 2)}</td>
      <td style="width:22%">${pmBar(r.plus_minus)}</td><td class="num">${sign(r.plus_minus)}</td>
      ${leanCell(r.sesgo_pp)}${leanCell(r.sesgo_psoe)}${leanCell(r.sesgo_vox)}${leanCell(r.sesgo_izq)}</tr>`).join("")}</table>`;
  errHist($("#errhist"), R.elecciones);
  cocina(app, K);
  const bp = ["pp", "psoe", "vox", "sumar", "cs"];
  const names = { ...Object.fromEntries(bp.map((p) => [p, POLL_PARTY[p]?.n])), sumar: "Sumar/UP", cs: "Cs" };
  $("#bias").innerHTML = `<table><tr><th>Elección</th>${bp.map((p) => `<th class="num">${names[p]}</th>`).join("")}<th class="num">Error medio</th></tr>
    ${Object.entries(E.precision.sesgo).map(([c, s]) => `<tr><td>${c}</td>${bp.map((p) => cell(s[p])).join("")}<td class="num">${num(E.precision.error_medio[c], 2)} pp</td></tr>`).join("")}</table>`;
}

const TIPO_COLOR = { generales: "#1f4e8c", autonomicas: "#da5c22", europeas: "#2e8b57" };
function errHist(el, rows) {
  const W = Math.max(320, el.clientWidth || 900), H = 280, m = { t: 12, r: 16, b: 26, l: 40 };
  const x = d3.scaleLinear().domain(d3.extent(rows, (r) => r.anio)).nice().range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, Math.min(8, d3.max(rows, (r) => r.error_consenso))]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(5)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v} pp`).tickSize(0)).call((g) => g.select(".domain").remove());
  svg.append("g").selectAll("circle").data(rows.filter((r) => r.error_consenso <= 8)).join("circle")
    .attr("cx", (r) => x(r.anio)).attr("cy", (r) => y(r.error_consenso)).attr("r", 4.5)
    .attr("fill", (r) => TIPO_COLOR[r.tipo]).attr("fill-opacity", 0.75).attr("stroke", "var(--surface)").attr("stroke-width", 1.5)
    .on("mousemove", (ev, r) => { const [t, a, c] = r.eleccion.split("|");
      showTip(`<b>${t === "autonomicas" ? `Autonómicas ${a}` : t[0].toUpperCase() + t.slice(1)} ${c.slice(0, 7)}</b><div class="row"><span>Error de la media</span><span>${num(r.error_consenso, 2)} pp</span></div><div class="row muted"><span>Encuestas finales</span><span>${r.encuestas}</span></div>`, ev); })
    .on("mouseleave", hideTip);
  el.insertAdjacentHTML("beforeend", `<div class="legend">${Object.entries({ generales: "Generales", autonomicas: "Autonómicas", europeas: "Europeas" }).map(([k, v]) => `<span><i class="sw" style="background:${TIPO_COLOR[k]}"></i>${v}</span>`).join("")}</div>`);
}

const CK_PARTY = { pp: "PP", psoe: "PSOE", vox: "Vox", izq: "Izquierda" };
const ckColor = (p) => (p === "izq" ? "#d6246e" : FAM[p].color);
function cocina(app, K) {
  const $ = (s) => app.querySelector(s);
  let casa = "40dB", party = "pp";
  const seg = (el, opts, cur, set) => {
    el.innerHTML = Object.entries(opts).map(([k, v]) => `<button data-k="${k}" class="${k === cur ? "on" : ""}">${v}</button>`).join("");
    el.querySelectorAll("button").forEach((b) => b.onclick = () => { set(b.dataset.k); draw(); });
  };
  function draw() {
    const yr = (c) => `${K.casas[c][0].f.slice(0, 4)}-${K.casas[c].at(-1).f.slice(0, 4)}`;
    $("#ck-casa").innerHTML = Object.keys(K.casas).map((c) => `<option value="${c}" ${c === casa ? "selected" : ""}>${c} · ${K.casas[c].length} encuestas, ${yr(c)}</option>`).join("");
    $("#ck-casa").onchange = (ev) => { casa = ev.target.value; draw(); };
    seg($("#ck-party"), CK_PARTY, party, (k) => party = k);
    const rows = K.casas[casa].filter((r) => r.est[party] != null && r.dir[party] != null);
    const date = (r) => new Date(r.f);
    const col = ckColor(party);
    lines($("#cocina"), [
      { id: "est", name: "Estimación", color: col, values: rows.map((r) => ({ date: date(r), v: r.est[party] / 100, label: r.f })) },
      { id: "dir", name: "Intención directa", color: "var(--ink-3)", values: rows.map((r) => ({ date: date(r), v: r.dir[party] / 100, label: r.f })) },
    ], { height: 300, dash: { dir: "4 3" } });
    // average adjustment (estimate minus direct) per party, in periods
    const periods = casa === "CIS"
      ? [["1994-01-01", "2018-06-30", "1994 a junio de 2018"], ["2018-07-01", "2023-07-23", "julio de 2018 al 23J"], ["2023-07-24", "2099-01-01", "Desde el 23J"]]
      : [["1977-01-01", "2023-07-23", "Hasta el 23J"], ["2023-07-24", "2099-01-01", "Desde el 23J"]];
    const avg = (p, a, b) => { const xs = K.casas[casa].filter((r) => r.f >= a && r.f <= b && r.est[p] != null && r.dir[p] != null).map((r) => r.est[p] - r.dir[p]);
      return xs.length ? [xs.reduce((s, x) => s + x, 0) / xs.length, xs.length] : [null, 0]; };
    const sg = (v) => (v == null ? "·" : `${v > 0 ? "+" : ""}${num(v)}`);
    $("#ck-tab").innerHTML = `<table><tr><th>Ajuste medio (estimación menos intención directa, puntos)</th>${Object.values(CK_PARTY).map((n) => `<th class="num">${n}</th>`).join("")}<th class="num">Encuestas</th></tr>
      ${periods.filter(([a, b]) => K.casas[casa].some((r) => r.f >= a && r.f <= b)).map(([a, b, l]) => { const v = Object.keys(CK_PARTY).map((p) => avg(p, a, b));
        return `<tr><td>${casa} · ${l}</td>${v.map(([x]) => `<td class="num" style="font-weight:${Math.abs(x ?? 0) >= 2 ? 600 : 400}">${sg(x)}</td>`).join("")}<td class="num">${Math.max(...v.map(([, n]) => n))}</td></tr>`; }).join("")}</table>`;
  }
  draw();
}
