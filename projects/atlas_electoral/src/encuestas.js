const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, FAM, showTip, hideTip } from "./data.js?v=0.2.74";
import { lines, indexHtml, sectionIndex, seatRows, bloques } from "./charts.js?v=0.2.74";
import { textos, md, INDICE } from "./textos.js?v=0.2.74";

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

// parties outside POLL_PARTY (past cycles) and the name of the "sumar" key by cycle (Podemos lineage)
const OTHER = { cs: ["Ciudadanos", "#f6a21d"], upyd: ["UPyD", "#e0218a"], iu: ["IU", "#b8001f"], mas_pais: ["Más País", "#2bb3a6"],
  compromis: ["Compromís", "#e8743b"], cup: ["CUP", "#f0e442"], upn: ["UPN", "#1b5e9e"], cds: ["CDS", "#7fb14f"], ucd: ["UCD", "#2e8b57"],
  cc: ["CC", "#f2c200"], bng: ["BNG", "#5bc0de"], pce: ["PCE", "#b8001f"], ap: ["AP", "#1d84ce"], otros: ["Otros", "#999"] };
const partyName = (k, ciclo) => k === "sumar" ? (ciclo < "2016" ? "Podemos" : ciclo < "2023" ? "Unidas Podemos" : "Sumar")
  : POLL_PARTY[k]?.n ?? OTHER[k]?.[0] ?? k.toUpperCase();
const partyColor = (k) => POLL_PARTY[k]?.c() ?? OTHER[k]?.[1] ?? "#888";
// the six parties shown by default: the biggest by result (past cycles) or by the latest average
const mainOf = (E) => E.resultado ? [...E.parties].sort((a, b) => (E.resultado[b] ?? 0) - (E.resultado[a] ?? 0)).slice(0, 6) : MAIN.filter((p) => E.parties.includes(p));
const cycleLabel = (c) => new Date(c).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

export async function renderEncuestas(app, args = []) {
  const [T, E, R, K, D, CI, CP, GE] = await Promise.all([textos("encuestas"), load("encuestas.json"), load("ratings.json"), load("cocina.json"), load("dentro.json"),
    load("ciclos/index.json").catch(() => ({ ciclos: [] })), load("cocina_pasos.json").catch(() => null), load("generales_encuestas.json").catch(() => null)]);

  // the prose is textos/encuestas.md; here only the figures and the computed blocks
  const vars = {
    encuestas: E.polls.filter((q) => !q.x).length,
    ultima: new Date(E.actualizado).toLocaleDateString("es-ES", { day: "numeric", month: "long" }),
    chips: MAIN.filter((p) => E.ultimo[p] != null).map((p) => `<span class="chip"><i class="dot" style="background:${POLL_PARTY[p].c()}"></i>${POLL_PARTY[p].n} <b>${num(E.ultimo[p])}%</b></span>`).join(""),
    elecciones: R.elecciones.length,
  };
  const slots = {
    controles_tabla: '<div class="controls"><div class="seg" id="te-gran"></div><select id="te-enc" aria-label="Encuestadora"></select></div>',
    tabla_encuestas: '<div class="scrollx" id="te-tabla"></div>\n<p id="te-mas"></p>',
    house: '<div class="scrollx" id="house"></div>',
    controles_movilizacion: '<div class="controls"><div class="seg" id="dt-casa"></div></div>',
    movilizacion: '<div class="card chart" id="dt-mov"></div>',
    controles_matriz: '<div class="controls"><select id="dt-enc"></select></div>',
    matriz: '<div class="scrollx" id="dt-mat"></div>',
    controles_paso: '<div class="controls"><label>Encuesta <select id="cp-sel"></select></label></div>',
    paso: '<div class="card chart" id="cp-chart"></div>',
    controles_cocina: '<div class="controls"><select id="ck-casa"></select><div class="seg" id="ck-party"></div></div>',
    cocina: '<div class="card chart" id="cocina"></div>',
    tabla_cocina: '<div class="scrollx" id="ck-tab"></div>',
    eleccion: '<div class="chips" id="g-sel"></div>\n<div class="card" id="g-chart"></div>',
    aciertos: '<div class="scrollx" id="acc"></div>',
    errhist: '<div class="card chart" id="errhist"></div>',
  };
  const { html, sec } = md(T.principal, { vars, slots, page: "encuestas" });
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
  await pollChart($("#chart-area"), E, { CI, selector: false, lastTable: true, kpi: false });
  pollChart($("#chart-hist"), E, { CI, args, pastOnly: true, lastTable: false });
  load("prediccion.json").then((P) => prediccion($("#pred"), P, T)).catch(() => { $("#pred").innerHTML = md(T.sin_prediccion, { page: "encuestas" }).html; });

  load("tabla_encuestas.json").then((T) => tablaEncuestas(app, T)).catch(() => {});
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
  load("ciclos/salto.json").then((SJ) => saltos($("#salto"), SJ, T)).catch(() => {});
  cocina(app, K);
  if (CP) cocinaPasos(app, CP, T);
  dentro(app, D);

}

function tablaEncuestas(app, T) {
  const $ = (q) => app.querySelector(q);
  const GR = [["todas", "Todas"], ["estado", "Estado"], ["comunidad", "Comunidad"], ["provincia", "Provincia"], ["híbrido", "Híbrido"]];
  const NIV = { estado: "Estado", ccaa: "Comunidad", provincia: "Provincia" };
  const TIPO = { nacional: "Nacional", propia: "Propia", desglose: "Desglose", "no consta": "No consta" };
  const STEP = 40, fmt = d3.format(",.0f");
  const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const dm = (s) => (s ? [+s.slice(8), MES[+s.slice(5, 7) - 1], s.slice(0, 4)] : null);
  const campo = (i, f) => {
    const a = dm(i), b = dm(f);
    if (!b) return "·";
    const fin = `${b[0]} ${b[1]} ${b[2]}`;
    if (!a || i === f) return fin;
    return a[1] === b[1] && a[2] === b[2] ? `${a[0]}–${fin}` : `${a[0]} ${a[1]}–${fin}`;
  };
  const nCell = (r) => (r.n != null ? (Array.isArray(r.n) ? `${fmt(r.n[0])}–${fmt(r.n[1])}` : fmt(r.n)) : r.de != null ? `<span class="te-de">de ${fmt(r.de)}</span>` : "·");
  const encs = [...new Set(T.estudios.map((e) => e.e))].sort((a, b) => a.localeCompare(b, "es"));
  $("#te-enc").innerHTML = `<option value="">Todas las encuestadoras</option>${encs.map((e) => `<option>${e}</option>`).join("")}`;
  let gran = "todas", shown = STEP;
  $("#te-gran").innerHTML = GR.map(([k, n]) => `<button data-k="${k}">${n}</button>`).join("");
  function draw() {
    const enc = $("#te-enc").value;
    const L = T.estudios.filter((e) => (gran === "todas" || e.g === gran) && (!enc || e.e === enc));
    let band = 0;
    const rows = L.slice(0, shown).map((e) => {
      const cls = e.r.length > 1 ? `te-b${band++ % 2}` : "";
      return e.r.map((r, j) => `<tr class="${cls}">
        ${j === 0 ? `<td>${e.e}</td><td>${e.m ?? "·"}${e.x ? ` <span class="te-x">${e.x}</span>` : ""}</td><td class="te-nw">${campo(e.i, e.f)}</td><td>${e.g[0].toUpperCase()}${e.g.slice(1)}</td>` : "<td></td><td></td><td></td><td></td>"}
        <td>${NIV[r.niv]}</td><td${r.todas ? ` title="${r.todas}"` : ""}>${r.amb}</td><td class="num te-nw">${nCell(r)}</td><td>${TIPO[r.tipo]}</td><td>${r.da[0].toUpperCase()}${r.da.slice(1)}</td>
        <td class="te-nw">${r.url ? `<a href="${r.url}" target="_blank" rel="noopener">fuente</a>` : "·"}${r.nota ? ' <span class="te-x" title="' + r.nota + '">sin revisar</span>' : ""}</td></tr>`).join("");
    }).join("");
    $("#te-tabla").innerHTML = `<table class="nosort te"><tr><th>Encuestadora</th><th>Medio</th><th>Campo</th><th>Granularidad</th><th>Nivel</th><th>Ámbito</th><th class="num">n</th><th>Muestra</th><th>Publica</th><th>Origen</th></tr>${rows}</table>`;
    app.querySelectorAll("#te-gran button").forEach((b) => b.classList.toggle("on", b.dataset.k === gran));
    $("#te-mas").innerHTML = L.length > shown ? `<button class="te-more">Ver ${Math.min(STEP, L.length - shown)} más (${fmt(L.length - shown)} sin mostrar)</button>` : L.length ? "" : '<span class="note">Ninguna encuesta con ese filtro.</span>';
  }
  $("#te-gran").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b) { gran = b.dataset.k; shown = STEP; draw(); } });
  $("#te-enc").addEventListener("change", () => { shown = STEP; draw(); });
  $("#te-mas").addEventListener("click", (ev) => { if (ev.target.closest("button")) { shown += STEP; draw(); } });
  draw();
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

const DT_ROW = { pp: "PP", psoe: "PSOE", vox: "Vox", sumar: "Sumar", abstencion: "No votó" };
const DT_COL = { pp: "PP", psoe: "PSOE", vox: "Vox", sumar: "Sumar", podemos: "Podemos", salf: "SALF", otros: "Otros", abst: "No votará", indecisos: "Indecisos" };
function dentro(app, D) {
  const $ = (s) => app.querySelector(s);
  let casa = D.transferencias["40dB"] ? "40dB" : Object.keys(D.transferencias)[0], enc = null;
  const color = (k) => (k === "abstencion" ? "var(--ink-3)" : POLL_PARTY[k].c());
  const fecha = (f) => new Date(f).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  function draw() {
    $("#dt-casa").innerHTML = Object.keys(D.movilizacion).map((c) => `<button data-k="${c}" class="${c === casa ? "on" : ""}">${c}</button>`).join("");
    $("#dt-casa").querySelectorAll("button").forEach((b) => b.onclick = () => { casa = b.dataset.k; enc = null; draw(); });
    const M = D.movilizacion[casa] ?? [];
    lines($("#dt-mov"), [
      ...Object.keys(DT_ROW).map((k) => ({ id: k, name: DT_ROW[k], color: color(k), values: M.map((r) => ({ date: new Date(r.f), v: r[k] == null ? null : r[k] / 100, label: r.f })) })),
      { id: "jovenes", name: "Menores de 35", color: "var(--ink-2)", values: M.map((r) => ({ date: new Date(r.f), v: r.jovenes == null ? null : r.jovenes / 100, label: r.f })) },
    ], { height: 300, dash: { jovenes: "4 3" } });
    const T = D.transferencias[casa] ?? [];
    if (enc == null || !T[enc]) enc = T.length - 1;
    $("#dt-enc").innerHTML = T.map((t, i) => `<option value="${i}" ${i === enc ? "selected" : ""}>${casa} · ${fecha(t.f)}</option>`).reverse().join("");
    $("#dt-enc").onchange = (ev) => { enc = +ev.target.value; draw(); };
    const t = T[enc], prev = T[enc - 1];
    if (!t) { $("#dt-mat").innerHTML = ""; return; }
    const cols = D.columnas;
    const cell = (r, j) => {
      const v = t.filas[r][j], p = prev?.filas[r]?.[j], d = p == null ? null : v - p;
      const bg = `color-mix(in srgb, ${cols[j] === r ? color(r) : "var(--ink-3)"} ${Math.min(60, Math.round(v * 0.7))}%, transparent)`;
      return `<td class="num" style="background:${bg}">${num(v, 0)}${d != null && Math.abs(d) >= 3 ? ` <span class="muted">(${d > 0 ? "+" : ""}${num(d, 0)})</span>` : ""}</td>`;
    };
    $("#dt-mat").innerHTML = `<table class="heat"><tr><th>Votó en 2023 ↓ · votaría ahora →</th>${cols.map((c) => `<th class="num">${DT_COL[c]}</th>`).join("")}</tr>
      ${D.filas.filter((r) => t.filas[r]).map((r) => `<tr><td><i class="dot" style="background:${color(r)}"></i>${DT_ROW[r]}</td>${cols.map((_, j) => cell(r, j)).join("")}</tr>`).join("")}</table>`;
  }
  draw();
}

// small multiples: the last 120 days of each past cycle's average, with the result as ticks on election day
function saltos(el, SJ, T) {
  const W = 230, H = 150, m = { t: 20, r: 34, b: 18, l: 30 };
  el.innerHTML = `<div class="multiples">${SJ.ciclos.map((c, i) => `<div class="mult"><svg viewBox="0 0 ${W} ${H}" data-i="${i}"></svg></div>`).join("")}</div>
    ${md(T.salto, { page: "encuestas" }).html}`;
  SJ.ciclos.forEach((c, i) => {
    const svg = d3.select(el).select(`svg[data-i="${i}"]`);
    const days = c.dias.map((d) => new Date(d)), end = days.at(-1);
    const x = d3.scaleTime().domain([days[0], end]).range([m.l, W - m.r]);
    const y = d3.scaleLinear().domain([0, 50]).range([H - m.b, m.t]);
    svg.append("text").attr("x", m.l).attr("y", 12).attr("font-size", 12).attr("font-weight", 600).attr("fill", "var(--ink)").text(cycleLabel(c.ciclo));
    svg.append("g").attr("class", "grid").selectAll("line").data([10, 20, 30, 40]).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues([0, 25, 50]).tickFormat((v) => `${v}%`).tickSize(0)).call((g) => g.select(".domain").remove());
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(3).tickFormat(d3.timeFormat("%b")).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
    const parties = Object.keys(c.resultado).sort((a, b) => c.resultado[b] - c.resultado[a]);
    for (const p of parties) {
      const col = partyColor(p);
      svg.append("path").attr("fill", "none").attr("stroke", col).attr("stroke-width", 1.6)
        .attr("d", d3.line().defined((v) => v != null).x((v, j) => x(days[j])).y((v) => y(v))(c.media[p]));
      svg.append("rect").attr("x", x(end) - 5).attr("y", y(c.resultado[p]) - 1.5).attr("width", 10).attr("height", 3).attr("fill", col).attr("stroke", "var(--surface)").attr("stroke-width", 0.8);
      const last = [...c.media[p]].reverse().find((v) => v != null);
      svg.append("text").attr("x", x(end) + 6).attr("y", y(c.resultado[p]) + 4).attr("font-size", 9).attr("fill", col).text(`${c.resultado[p] - last >= 0 ? "+" : "−"}${num(Math.abs(c.resultado[p] - last))}`);
    }
    svg.on("mousemove", (ev) => showTip(`<b>Generales ${cycleLabel(c.ciclo)}</b>${parties.map((p) => { const last = [...c.media[p]].reverse().find((v) => v != null);
      return `<div class="row"><span><i class="dot" style="background:${partyColor(p)}"></i>${partyName(p, c.ciclo)}</span><span>encuestas ${num(last)} · resultado ${num(c.resultado[p])} (${c.resultado[p] - last >= 0 ? "+" : "−"}${num(Math.abs(c.resultado[p] - last))})</span></div>`; }).join("")}`, ev))
      .on("mouseleave", hideTip).style("cursor", "pointer").on("click", () => { location.hash = `#encuestas/${c.ciclo}`; scrollTo(0, 0); });
  });
}

/** The poll chart block (figures, party toggles, zoom, pollster selector, chart, note; optionally the cycle
 *  selector and the last-polls table), drawn inside `el`. Used by the Encuestas page and the 29N page. */
export function chartHtml({ selector = true, lastTable = true, tools = true, kpi = true, T = {} } = {}) {
  return (selector ? `    <div class="controls"><label>Elección <select id="ciclo"></select></label><span class="note" id="cycle-note"></span></div>` : "") + `
    ${kpi ? '<div class="stats" id="kpi"></div>' : ""}
    <div class="controls" id="toggles"></div>
    <div class="controls"><div class="seg" id="zoom"></div>
      ${tools ? `<details class="casas" id="casas-box"><summary>Encuestadoras: <b id="casas-sum"></b></summary>
        <div class="casas-act"><button data-a="all">Todas</button><button data-a="none">Ninguna</button>
          <label><input type="checkbox" id="corr" checked/> Descontar el sesgo de cada casa respecto a las demás</label></div>
        <div class="chips" id="casas"></div>
        <label class="casas-x"><input type="checkbox" id="showx"/> Mostrar también, como círculos huecos, <span id="x-desc"></span>. No entran en el promedio: las reestimaciones reutilizan la muestra de una encuesta del CIS ya contada, y las de partido no son independientes.</label></details>` : ""}</div>
    <div class="card chart" id="ch"><div id="ch-main"></div><div id="ch-ov" class="overview"></div></div>
    <p class="note" id="ch-note"></p>
` + (lastTable ? `
    ${md(T.ultimas ?? "", { slots: { last: '<div class="scrollx" id="last"></div>' }, page: "encuestas" }).html}
` : "");
}

export async function pollChart(el, E, { CI = { ciclos: [] }, args = [], selector = true, lastTable = true, tools = true, kpi = true, pastOnly = false } = {}) {
  const $ = (s) => el.querySelector(s);
  const clipId = `clip${Math.random().toString(36).slice(2, 7)}`;   // two charts on one page must not share a clipPath
  // the cycle note and the last-polls heading are prose from textos/encuestas.md (only shown on the Encuestas page)
  const T = selector || lastTable ? await textos("encuestas") : {};
  const frase = (src, vars) => md(src ?? "", { vars, page: "encuestas" }).html.replace(/^<p[^>]*>|<\/p>$/g, "");
  el.innerHTML = chartHtml({ selector, lastTable, tools, kpi, T });
  // the chart block, for the current cycle or any past one (ciclos/<ciclo>.json has the same shape plus "resultado")
  function pollBlock(E) {
    const PN = (k) => partyName(k, E.ciclo), PC = partyColor;
    const days = E.dias.map((d) => new Date(d));
    const show = new Set(mainOf(E));
    if ($("#cycle-note")) $("#cycle-note").innerHTML = E.resultado
      ? frase(T.nota_ciclo, { ciclo: cycleLabel(E.ciclo), encuestas: E.polls.filter((q) => !q.x).length, desde: cycleLabel(E.polls.map((q) => q.f1).sort()[0]) })
      : "";
    // pollsters with their own fieldwork; re-estimations of CIS data and party polls (q.x) never enter the average
    const houses = Array.from(d3.rollup(E.polls.filter((q) => !q.x), (v) => v.length, (q) => q.e)).sort((a, b) => b[1] - a[1]);
    const MIN_CHIP = 5;
    const big = houses.filter(([, n]) => n >= MIN_CHIP), small = houses.filter(([, n]) => n < MIN_CHIP);
    const sel = new Set(houses.map(([h]) => h));
    let showX = false;
    const nx = d3.rollup(E.polls.filter((q) => q.x), (v) => v.length, (q) => q.x);
    const tDay = (s) => Math.round(new Date(s) / 864e5);
    const dayT = days.map((d) => Math.round(d / 864e5));
    let corr = true, avg = { media: E.media, sd: E.sd };
    const end = days.at(-1), start = days[0];
    const ZOOM = { "1s": 7, "1m": 31, "3m": 92, "1a": 365, todo: null };
    const DAY = 864e5, MIN_WIN = 7 * DAY;
    let zoom = "3m", win = null;
    const setZoom = (k) => { zoom = k; win = ZOOM[k] ? [new Date(Math.max(+start, +end - ZOOM[k] * DAY)), end] : [start, end]; };
    // + and -: halve or double the window, anchored at the end when it is there, else at its centre; clamped
    const zoomBy = (f) => {
      const len = Math.min(+end - +start, Math.max(MIN_WIN, (+win[1] - +win[0]) * f));
      let a, b;
      if (+win[1] >= +end - DAY) { b = +end; a = b - len; } else { const c = (+win[0] + +win[1]) / 2; a = c - len / 2; b = c + len / 2; }
      if (a < +start) { a = +start; b = a + len; }
      if (b > +end) { b = +end; a = b - len; }
      win = [new Date(a), new Date(b)];
      zoom = Object.keys(ZOOM).find((k) => ZOOM[k] ? Math.abs(len - ZOOM[k] * DAY) < DAY && b === +end : len >= +end - +start) ?? null;
    };
    setZoom("3m");

    // the same kernel as pipeline/poll_model.py (one-sided exponential, tau 10 days, 120-day memory,
    // weight min(sqrt(n/1000), 2) divided by the pollster's polls in the last 30 days), on the chosen polls
    function kernelAverage(force = false) {
      if (!force && corr && sel.size === houses.length) return { media: E.media, sd: E.sd };
      const P = E.polls.filter((q) => !q.x && sel.has(q.e)).map((q) => ({ t: tDay(q.d), e: q.e, w: Math.min(Math.sqrt((q.n ?? 1000) / 1000), 2), v: q.v }));
      const media = {}, sd = {};
      for (const p of E.parties) {
        const Q = P.filter((q) => q.v[p] != null).map((q) => ({ ...q, x: q.v[p] - (corr ? E.efecto_casa?.[q.e]?.[p] ?? 0 : 0) }))
          .sort((a, b) => a.t - b.t);
        if (Q.length < 10) { media[p] = dayT.map(() => null); sd[p] = media[p]; continue; }
        media[p] = []; sd[p] = [];
        const lo = (t) => d3.bisector((q) => q.t).left(Q, t), hi = (t) => d3.bisector((q) => q.t).right(Q, t);
        for (const T of dayT) {
          const a = lo(T - 120), b = hi(T), c = lo(T - 30);
          if (b <= a) { media[p].push(null); sd[p].push(null); continue; }
          const crowd = new Map();
          for (let j = c; j < b; j++) crowd.set(Q[j].e, (crowd.get(Q[j].e) ?? 0) + 1);
          let W = 0, S = 0;
          const w = [];
          for (let j = a; j < b; j++) { const wj = Q[j].w * Math.exp(-(T - Q[j].t) / 10) / Math.max(crowd.get(Q[j].e) ?? 0, 1); w.push(wj); W += wj; S += wj * Q[j].x; }
          const mm = S / W;
          let V = 0;
          for (let j = a; j < b; j++) V += w[j - a] * (Q[j].x - mm) ** 2;
          media[p].push(mm); sd[p].push(Math.sqrt(V / W));
        }
      }
      return { media, sd };
    }
    const last = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i]; return null; };

    function kpi() {
      if ($("#kpi")) $("#kpi").innerHTML = mainOf(E).filter((p) => last(avg.media[p] ?? []) != null).map((p) => E.resultado
        ? `<div class="stat"><div class="v"><i class="dot" style="background:${PC(p)}"></i>${num(E.resultado[p])}%</div><div class="k">${PN(p)} · encuestas ${num(last(avg.media[p]))}</div></div>`
        : `<div class="stat"><div class="v"><i class="dot" style="background:${PC(p)}"></i>${num(last(avg.media[p]))}%</div><div class="k">${PN(p)}</div></div>`).join("");
      const all = sel.size === houses.length;
      const nsmall = small.filter(([h]) => sel.has(h)).length;
      if ($("#casas-sum")) $("#casas-sum").textContent = all ? `todas (${big.length} habituales y ${small.length} ocasionales)` : sel.size === 0 ? "ninguna"
        : sel.size <= 3 ? [...sel].join(", ") : `${sel.size - nsmall} de ${big.length} habituales${nsmall ? ` y ${nsmall} ocasionales` : ""}`;
      $("#ch-note").innerHTML = (all && corr ? "" : `Promedio ${corr ? "corregido" : "sin corregir"} de ${all ? "todas las encuestadoras" : sel.size === 1 ? [...sel][0] : `${sel.size} encuestadoras`}. `)
        + "Cada punto es una encuesta: pasa el ratón por encima para ver cuál."
        + ($("#casas-box") ? "" : ' <a href="#encuestas">Elegir encuestadoras y ver elecciones pasadas, en Encuestas →</a>');
    }

    // last 12 polls (with their own fieldwork), published figure and gap to the corrected average on that date
    {
      const cols = mainOf(E);
      const at = (p, d) => { const i = d3.leastIndex(days, (x) => Math.abs(x - new Date(d))); return E.media[p][i]; };
      const fd = (s) => new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
      const rows = E.polls.filter((q) => !q.x).sort((a, b) => (a.f1 < b.f1 ? 1 : -1)).slice(0, 12);
      if ($("#last")) $("#last").innerHTML = `<table><tr><th>Encuestadora</th><th>Medio</th><th>Campo</th><th class="num">Muestra</th>${cols.map((p) => `<th class="num"><i class="dot" style="background:${PC(p)}"></i>${PN(p)}</th>`).join("")}</tr>
        ${rows.map((q) => `<tr><td>${q.e}</td><td class="muted">${q.m ?? ""}</td><td>${q.f0 === q.f1 ? fd(q.f1) : `${fd(q.f0)} a ${fd(q.f1)}`}</td><td class="num">${q.n ? q.n.toLocaleString("es-ES") : "·"}</td>
          ${cols.map((p) => { const v = q.v[p], a = at(p, q.f1), d = v == null || a == null ? null : v - a;
            return `<td class="num">${v == null ? "·" : num(v)}${d == null ? "" : ` <span class="muted" style="font-size:11px">(${d >= 0 ? "+" : "−"}${num(Math.abs(d))})</span>`}</td>`; }).join("")}</tr>`).join("")}</table>`;
    }
    $("#toggles").innerHTML = E.parties.map((p) => `<label><input type="checkbox" data-p="${p}" ${show.has(p) ? "checked" : ""}/> ${PN(p)}</label>`).join("");
    $("#toggles").querySelectorAll("input").forEach((i) => i.onchange = () => { i.checked ? show.add(i.dataset.p) : show.delete(i.dataset.p); draw(); overview(); });
    $("#zoom").innerHTML = `<button data-z="in" title="Acercar">+</button><button data-z="out" title="Alejar">−</button>`
      + Object.entries({ "1s": "1 semana", "1m": "1 mes", "3m": "3 meses", "1a": "1 año", todo: "Todo" }).map(([k, v]) => `<button data-k="${k}">${v}</button>`).join("");
    $("#zoom").querySelectorAll("button[data-k]").forEach((b) => b.onclick = () => { setZoom(b.dataset.k); draw(); moveBrush(); });
    $("#zoom").querySelectorAll("button[data-z]").forEach((b) => b.onclick = () => { zoomBy(b.dataset.z === "in" ? 0.5 : 2); draw(); moveBrush(); });
    const markZoom = () => $("#zoom").querySelectorAll("button[data-k]").forEach((b) => b.classList.toggle("on", b.dataset.k === zoom));
    function chips() {
      if (!$("#casas")) return;
      const smallOn = small.some(([h]) => sel.has(h));
      $("#casas").innerHTML = big.map(([h, n]) => `<label class="${sel.has(h) ? "" : "off"}"><input type="checkbox" data-h="${h}" ${sel.has(h) ? "checked" : ""}/>${h} <span class="muted">${n}</span></label>`).join("")
        + (small.length ? `<label class="${smallOn ? "" : "off"}" title="${small.map(([h, n]) => `${h} (${n})`).join(", ")}"><input type="checkbox" data-h="__otras" ${smallOn ? "checked" : ""}/>Otras ${small.length} casas <span class="muted">${d3.sum(small, ([, n]) => n)}</span></label>` : "");
      $("#casas").querySelectorAll("input").forEach((i) => i.onchange = () => {
        const hs = i.dataset.h === "__otras" ? small.map(([h]) => h) : [i.dataset.h];
        hs.forEach((h) => (i.checked ? sel.add(h) : sel.delete(h))); refresh(); });
    }
    if ($("#x-desc")) $("#x-desc").textContent = [nx.get("reest") && `las ${nx.get("reest")} reestimaciones de encuestas del CIS hechas por otras empresas`, nx.get("interna") && `${nx.get("interna") === 1 ? "la encuesta encargada" : `las ${nx.get("interna")} encuestas encargadas`} por un partido`].filter(Boolean).join(" y ");
    if ($("#showx")) $("#showx").onchange = (ev) => { showX = ev.target.checked; draw(); };
    $("#casas-box")?.querySelectorAll(".casas-act button").forEach((b) => b.onclick = () => {
      if (b.dataset.a === "all") houses.forEach(([h]) => sel.add(h)); else sel.clear(); refresh(); });
    if ($("#corr")) $("#corr").onchange = (ev) => { corr = ev.target.checked; refresh(); };
    function refresh() { avg = kernelAverage(); chips(); kpi(); draw(); overview(); }

    // drawn at the container's real width so text keeps its size on a phone; the overview reuses W
    let W = 1000;
    const m = { t: 12, r: 70, b: 26, l: 36 };
    function draw() {
      markZoom();
      const el = $("#ch-main"); el.innerHTML = "";
      W = Math.max(340, Math.round(el.clientWidth || 1000));
      const H = W < 600 ? 360 : 420;
      const parties = E.parties.filter((p) => show.has(p));
      const x = d3.scaleTime().domain(win).range([m.l, W - m.r]);
      const inWin = (d) => d >= win[0] && d <= win[1];
      const shown = (q) => (q.x ? showX : sel.has(q.e));
      const vis = E.polls.filter((q) => shown(q) && inWin(new Date(q.d)));
      const visAvg = parties.flatMap((p) => days.map((d, i) => (inWin(d) ? avg.media[p][i] : null)).filter((v) => v != null));
      const ymax = Math.max(d3.max(parties, (p) => d3.max(vis, (q) => q.v[p])) ?? 0, d3.max(visAvg) ?? 0) || 40;
      const y = d3.scaleLinear().domain([0, Math.min(50, ymax + 2)]).nice().range([H - m.b, m.t]);
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
      svg.append("defs").append("clipPath").attr("id", clipId).append("rect").attr("x", m.l).attr("y", 0).attr("width", W - m.l - m.r).attr("height", H);
      svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(6)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(W / 110))).tickFormat((+win[1] - +win[0]) / DAY <= 45 ? d3.timeFormat("%-d %b") : null).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
      svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat((v) => `${v}%`).tickSize(0)).call((g) => g.select(".domain").remove());
      const plot = svg.append("g").attr("clip-path", `url(#${clipId})`);
      const gBands = plot.append("g"), gTrail = plot.append("g"), gDots = plot.append("g"), gLines = plot.append("g");
      for (const p of parties) {
        const col = PC(p);
        const pts = days.map((d, i) => ({ d, m: avg.media[p][i], s: avg.sd[p][i] })).filter((o) => o.m != null);
        gBands.append("path").attr("fill", col).attr("opacity", 0.12)
          .attr("d", d3.area().x((o) => x(o.d)).y0((o) => y(o.m - 1.28 * o.s)).y1((o) => y(o.m + 1.28 * o.s)).curve(d3.curveMonotoneX)(pts));
        gLines.append("path").attr("fill", "none").attr("stroke", col).attr("stroke-width", 2).attr("pointer-events", "none")
          .attr("d", d3.line().x((o) => x(o.d)).y((o) => y(o.m)).curve(d3.curveMonotoneX)(pts));
      }
      // one dot per poll and party: the polls as published, before any correction
      const dots = [];
      E.polls.forEach((q, i) => { if (shown(q) && inWin(new Date(q.d))) for (const p of parties) if (q.v[p] != null)
        dots.push({ i, p, cx: x(new Date(q.d)), cy: y(q.v[p]) }); });
      // fewer dots on screen (short window or few pollsters) -> bigger, more opaque dots
      const npolls = new Set(dots.map((o) => o.i)).size;
      const r0 = npolls < 60 ? 3.5 : npolls < 150 ? 3 : 2, o0 = npolls < 60 ? 0.7 : npolls < 150 ? 0.45 : 0.25;
      const circles = gDots.selectAll("circle").data(dots).join("circle")
        .attr("cx", (o) => o.cx).attr("cy", (o) => o.cy).attr("r", r0).attr("opacity", o0)
        .attr("fill", (o) => (E.polls[o.i].x ? "none" : PC(o.p))).attr("stroke", (o) => (E.polls[o.i].x ? PC(o.p) : null));
      const delaunay = d3.Delaunay.from(dots, (o) => o.cx, (o) => o.cy);
      // labels: value of the average at the right edge of the window
      const iEnd = d3.leastIndex(days, (d) => Math.abs(d - win[1]));
      const valAt = (p) => { for (let i = iEnd; i >= 0; i--) if (avg.media[p][i] != null) return avg.media[p][i]; return null; };
      const lv = (p) => (E.resultado && +win[1] >= +end - DAY ? E.resultado[p] : valAt(p));   // past cycle at its end: the result
      const labels = parties.filter((p) => lv(p) != null).map((p) => ({ p, v: lv(p), y: y(lv(p)) })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 13);
      svg.append("g").selectAll("text").data(labels).join("text").attr("x", W - m.r + 6).attr("y", (l) => l.y + 4)
        .attr("font-size", 12).attr("fill", "var(--ink-2)").attr("font-weight", E.resultado && +win[1] >= +end - DAY ? 600 : 400).text((l) => `${PN(l.p)} ${num(l.v)}`);
      if (E.resultado && inWin(end)) {   // past cycle: the result, as a tick per party on election day
        svg.append("line").attr("x1", x(end)).attr("x2", x(end)).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "4 3");
        svg.append("text").attr("x", x(end) - 4).attr("y", m.t + 10).attr("text-anchor", "end").attr("font-size", 11).attr("fill", "var(--ink-2)").text("resultado");
        for (const p of parties) if (E.resultado[p] != null) svg.append("rect").attr("x", x(end) - 7).attr("y", y(E.resultado[p]) - 2).attr("width", 14).attr("height", 4)
          .attr("fill", PC(p)).attr("stroke", "var(--surface)").attr("stroke-width", 1);
      }
      const cross = svg.append("line").attr("stroke", "var(--ink-3)").attr("y1", m.t).attr("y2", H - m.b).style("display", "none");

      // hover a dot: that poll (every party) and the same pollster's other polls stand out
      let pinned = null;
      const fdate = (s) => new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
      function focus(i) {
        const house = i == null ? null : E.polls[i].e;
        circles.attr("r", (o) => (o.i === i ? 5 : house && E.polls[o.i].e === house ? 3 : r0))
          .attr("opacity", (o) => (i == null ? o0 : o.i === i ? 1 : E.polls[o.i].e === house ? 0.85 : 0.06))
          .attr("stroke", (o) => (E.polls[o.i].x ? PC(o.p) : o.i === i ? "var(--surface)" : null)).attr("stroke-width", 1.5);
        circles.filter((o) => o.i === i).raise();
        gTrail.selectAll("*").remove();
        if (i == null) return;
        for (const p of parties) {
          const tr = dots.filter((o) => o.p === p && E.polls[o.i].e === house).sort((a, b) => a.cx - b.cx);
          gTrail.append("path").attr("fill", "none").attr("stroke", PC(p)).attr("stroke-width", 1)
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
          ${rows.map(([p, v]) => `<div class="row"><span><i class="dot" style="background:${PC(p) ?? "var(--ink-3)"}"></i>${PN(p) ?? p}</span><span>${num(v)}%</span></div>`).join("")}
          <div class="row muted"><span>Encuestas de ${q.e} en el ciclo</span><span>${nHouse}</span></div>
          ${q.x ? `<div class="muted" style="max-width:240px;white-space:normal">${q.x === "reest" ? "Reestimación de una encuesta del CIS con otra cocina: misma muestra, no entra en el promedio." : "Encuesta encargada por un partido: no entra en el promedio."}</div>` : ""}`, ev);
      }
      function avgTip(mx, ev) {
        const xd = x.invert(mx);
        const i = d3.leastIndex(days, (d) => Math.abs(d - xd));
        cross.attr("x1", x(days[i])).attr("x2", x(days[i])).style("display", null);
        const rows = parties.filter((p) => avg.media[p][i] != null).sort((a, b) => avg.media[b][i] - avg.media[a][i]);
        showTip(`<b>Promedio, ${fdate(days[i])}</b>${rows.map((p) =>
          `<div class="row"><span><i class="dot" style="background:${PC(p)}"></i>${PN(p)}</span><span>${num(avg.media[p][i])}%</span></div>`).join("")}`, ev);
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

    // overview of the whole cycle with a draggable window (d3 brush)
    let brush, gBrush, xo;
    function overview() {
      const el = $("#ch-ov"); el.innerHTML = "";
      const H = 64, mt = 4, mb = 18;
      xo = d3.scaleTime().domain([start, end]).range([m.l, W - m.r]);
      const parties = E.parties.filter((p) => show.has(p));
      const yo = d3.scaleLinear().domain([0, d3.max(parties, (p) => d3.max(avg.media[p])) ?? 40]).nice().range([H - mb, mt]);
      const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
      svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - mb})`).call(d3.axisBottom(xo).ticks(Math.max(3, Math.floor(W / 110))).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
      for (const p of parties) svg.append("path").attr("fill", "none").attr("stroke", PC(p)).attr("stroke-width", 1).attr("opacity", 0.8)
        .attr("d", d3.line().defined((v) => v != null).x((v, i) => xo(days[i])).y((v) => yo(v))(avg.media[p]));
      brush = d3.brushX().extent([[m.l, 0], [W - m.r, H - mb]])
        .on("brush end", (ev) => {
          if (!ev.sourceEvent) return;                 // moved by code
          if (!ev.selection) { setZoom("todo"); draw(); moveBrush(); return; }
          win = ev.selection.map(xo.invert); zoom = null; draw();
        });
      gBrush = svg.append("g").attr("class", "brush").call(brush);
      moveBrush();
    }
    function moveBrush() { if (gBrush) gBrush.call(brush.move, win.map(xo)); }

    refresh();
  }
  const cycles = [...(pastOnly ? [] : [{ ciclo: E.ciclo, label: "Hacia el 29N (en curso)" }]), ...CI.ciclos.slice().reverse().map((c) => ({ ciclo: c.ciclo, label: `${cycleLabel(c.ciclo)} · ${c.polls} encuestas` }))];
  if (selector) $("#ciclo").innerHTML = cycles.map((c) => `<option value="${c.ciclo}">${c.label}</option>`).join("");
  const cache = { [E.ciclo]: E };
  async function showCycle(c, chosen = false) {
    cache[c] ??= await load(`ciclos/${c}.json`);
    if (!selector) { pollBlock(cache[c]); return; }
    $("#ciclo").value = c;
    if (chosen) history.replaceState(null, "", c === E.ciclo ? "#encuestas" : `#encuestas/${c}`);
    pollBlock(cache[c]);
  }
  if (selector) $("#ciclo").onchange = (ev) => showCycle(ev.target.value, true);
  await showCycle(cycles.some((c) => c.ciclo === args[0]) ? args[0] : pastOnly ? cycles[0].ciclo : E.ciclo);
}

// step-by-step cooking of one real survey (cocina_pasos.json): direct intention -> recall weighting -> undecided -> turnout -> published
// the text of each step is in textos/encuestas.md (part "paso_a_paso")
const CP_KEYS = ["D", "R", "RI", "RIT", "pub"];
function cocinaPasos(app, CP, T) {
  const $ = (s) => app.querySelector(s);
  const fd = (s) => new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  const houses = [...new Set(CP.encuestas.map((e) => e.casa))];
  $("#cp-sel").innerHTML = houses.map((h) => `<optgroup label="${h}">${CP.encuestas.map((e, i) => [e, i]).filter(([e]) => e.casa === h)
    .map(([e, i]) => `<option value="${i}">${fd(e.f)}${e.eleccion ? " · preelectoral" : ""}</option>`).join("")}</optgroup>`).join("");
  const col = (p) => (p === "izq" ? "#d6246e" : partyColor(p));
  const name = (p, f) => (p === "izq" ? (f < "2023-01" ? "Unidas Podemos" : f < "2023-08" ? "Sumar" : "Sumar y Podemos") : partyName(p, f.slice(0, 4)));
  function draw() {
    const e = CP.encuestas[+$("#cp-sel").value];
    const keys = CP_KEYS;
    const parties = Object.keys(e.p).sort((a, b) => e.p[b].pub - e.p[a].pub);
    const el = $("#cp-chart"); el.innerHTML = "";
    const W = Math.max(340, el.clientWidth || 900), H = 320, m = { t: 28, r: 120, b: 44, l: 36 };
    const x = d3.scalePoint().domain(keys).range([m.l, W - m.r]);
    const vals = parties.flatMap((p) => keys.map((k) => e.p[p][k]));
    const y = d3.scaleLinear().domain([0, Math.min(60, d3.max(vals) + 4)]).nice().range([H - m.b, m.t]);
    const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(5)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat((v) => `${v}%`).tickSize(0)).call((g) => g.select(".domain").remove());
    const short = { D: "tal cual", R: "+ recuerdo", RI: "+ indecisos", RIT: "+ prob. de votar", pub: "publicado" };
    svg.append("g").selectAll("text").data(keys).join("text").attr("x", (k) => x(k)).attr("y", H - m.b + 18).attr("text-anchor", "middle").attr("font-size", 12).attr("fill", "var(--ink-2)").text((k) => short[k]);
    svg.append("g").selectAll("line").data(keys).join("line").attr("x1", (k) => x(k)).attr("x2", (k) => x(k)).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "var(--line)");
    for (const p of parties) {
      const pts = keys.map((k) => ({ k, v: e.p[p][k] }));
      svg.append("path").attr("fill", "none").attr("stroke", col(p)).attr("stroke-width", 2).attr("d", d3.line().x((d) => x(d.k)).y((d) => y(d.v))(pts));
      svg.append("g").selectAll("circle").data(pts).join("circle").attr("cx", (d) => x(d.k)).attr("cy", (d) => y(d.v)).attr("r", 3.5).attr("fill", col(p)).attr("stroke", "var(--surface)").attr("stroke-width", 1.5);
      svg.append("g").selectAll("text").data(pts).join("text").attr("x", (d) => x(d.k)).attr("y", (d) => y(d.v) - 8).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", col(p)).text((d) => num(d.v));
      svg.append("text").attr("x", x("pub") + 10).attr("y", y(e.p[p].pub) + 4).attr("font-size", 12).attr("fill", "var(--ink-2)").text(`${name(p, e.f)}${e.p[p].res != null ? ` · resultado ${num(e.p[p].res)}` : ""}`);
      if (e.p[p].res != null) svg.append("rect").attr("x", x("pub") - 7).attr("y", y(e.p[p].res) - 1.5).attr("width", 14).attr("height", 3).attr("fill", col(p));
    }
    const sg = (v) => `${v >= 0 ? "+" : "−"}${num(Math.abs(v))}`;
    const vars = { casa: e.casa, fecha: fd(e.f), entrevistas: e.n.toLocaleString("es-ES"), partidos: parties.map((p) => name(p, e.f)).join(", ") };
    keys.forEach((k, i) => { if (i > 0) vars[`cambio_${k}`] = ` <span class="muted">Cambio: ${parties.map((p) => `${name(p, e.f)} ${sg(e.p[p][k] - e.p[p][keys[i - 1]])}`).join(", ")}.</span>`; });
    $("#cp-text").innerHTML = md(T.paso_a_paso, { vars, page: "encuestas" }).html;
  }
  $("#cp-sel").onchange = draw;
  draw();
}

// the model's forecast (prediccion.json, pipeline/prediccion.py): probabilities, ranges, the PP+Vox seat histogram
function prediccion(el, P, T) {
  const fd = (s) => new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  const pc = (x) => `${Math.round(x * 100)}%`;
  const parties = Object.keys(P.partidos);
  const sims = P.draws.toLocaleString("es-ES");
  const vars = { fecha: fd(P.fecha), n_encuestas: P.n_encuestas, simulaciones: sims, pp_primero: pc(P.p_pp_primero),
    b_escala: String(P.parametros.b_escala).replace(".", ","), s_ccaa: P.parametros.s_ccaa, s_prov: P.parametros.s_prov };
  const slots = {
    tabla_partidos: `<div class="scrollx"><table><tr><th>Partido</th><th class="num">Voto, mediana</th><th class="num">Horquilla (90%)</th><th class="num">Escaños, mediana</th><th class="num">Horquilla (90%)</th></tr>
      ${parties.map((p) => { const d = P.partidos[p]; return `<tr><td><i class="dot" style="background:${partyColor(p)}"></i>${partyName(p, "2026")}</td><td class="num">${num(d.voto.p50)}%</td><td class="num">${num(d.voto.p05)} a ${num(d.voto.p95)}</td><td class="num">${d.escanos ? d.escanos.p50 : "·"}</td><td class="num">${d.escanos ? `${d.escanos.p05} a ${d.escanos.p95}` : "·"}</td></tr>`; }).join("")}</table></div>`,
    histograma: '<div class="card chart" id="pred-hist"></div>',
    serie_probabilidad: '<div class="chart" id="pred-prob"></div>',
    serie_escanos: '<div class="chart" id="pred-esc"></div>',
  };
  el.innerHTML = md(T.prediccion, { vars, slots, page: "encuestas" }).html;
  // the seat bar and the draggable groups (the same component as the 29N page); the histogram follows the groups
  seatRows(el.querySelector("#pred-bar"), [{ label: "Estimación", e: P.central }], { labelWidth: 90, eid: "generales_2026-11" });
  const elh = el.querySelector("#pred-hist");
  const hist = (sumOf) => {
    elh.innerHTML = "";
    const G = [["izquierda", "Izquierda", "#e30613"], ["derecha", "Derecha", "#1d84ce"]].map(([g, n, c]) => ({ n, c, t: sumOf(g) }));
    const lo = Math.min(...G.map((g) => d3.min(g.t))), hi = Math.max(...G.map((g) => d3.max(g.t)));
    const W = Math.max(340, elh.clientWidth || 900), H = 200, m = { t: 14, r: 16, b: 26, l: 36 };
    const x = d3.scaleLinear().domain([Math.min(lo, 170), Math.max(hi, 182) + 1]).range([m.l, W - m.r]);
    const bins = G.map((g) => { const c = new Map(); for (const v of g.t) c.set(v, (c.get(v) ?? 0) + 1); return { ...g, c }; });
    const y = d3.scaleLinear().domain([0, d3.max(bins, (b) => d3.max([...b.c.values()]))]).nice().range([H - m.b, m.t]);
    const svg = d3.select(elh).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    const bw = Math.max(1, x(1) - x(0) - 0.5);
    for (const b of bins) svg.append("g").selectAll("rect").data([...b.c]).join("rect").attr("x", ([v]) => x(v)).attr("y", ([, n]) => y(n)).attr("width", bw).attr("height", ([, n]) => y(0) - y(n)).attr("fill", b.c2 ?? b.c).attr("opacity", 0.7);
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d3.format("d")).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
    svg.append("line").attr("x1", x(176)).attr("x2", x(176)).attr("y1", m.t).attr("y2", H - m.b).attr("stroke", "var(--ink)").attr("stroke-dasharray", "4 3");
    svg.append("text").attr("x", x(176) + 5).attr("y", m.t + 8).attr("font-size", 11).attr("fill", "var(--ink)").text("176");
    elh.insertAdjacentHTML("beforeend", `<div class="legend">${bins.map((b) => `<span><i class="sw" style="background:${b.c}"></i>${b.n}</span>`).join("")}</div>`);
  };
  load("prediccion_draws.json").then((DR) => bloques(el.querySelector("#pred-bloques"), P.central, { draws: DR, onChange: (at, sumOf) => hist(sumOf) }));
  load("prediccion_serie.json").then((SE) => {
    const w = SE.semanas, dt = (s) => new Date(s);
    lines(el.querySelector("#pred-prob"), [{ id: "d", name: "PP, Vox y SALF", color: "#1d84ce", values: w.map((x) => ({ date: dt(x.f), v: x.p_derecha, label: x.f })) }],
      { height: 220, yMin: 0, yMax: 1 });
    lines(el.querySelector("#pred-esc"), Object.keys(P.partidos).filter((p) => w.at(-1).esc[p]?.[1] >= 1).map((p) => ({ id: p, name: partyName(p, "2026"), color: partyColor(p),
      values: w.map((x) => ({ date: dt(x.f), v: x.esc[p]?.[1] ?? null, label: x.f })) })), { height: 220, fmt: (v) => `${Math.round(v)} escaños`, yTicks: (v) => v, yMin: 0 });
  }).catch(() => {});
  load("backtest.json").then((B) => {
    const h7 = B.horizontes[7], h30 = B.horizontes[30], pc = (x) => `${Math.round(x * 100)}%`;
    el.querySelector("#pred-bt").innerHTML = md(T.backtest, { vars: { generales: B.elecciones, desde: B.desde, voto_7: pc(h7.voto.en90), escanos_7: pc(h7.escanos.en90),
      voto_30: pc(h30.voto.en90), escanos_30: pc(h30.escanos.en90) }, page: "encuestas" }).html;
  }).catch(() => {});
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
      ${md(T.eleccion, { vars: { encuestadoras: g.n, error_media: n1(g.mae_media), error_cis: g.mae_cis_dir != null ? ` · intención directa del CIS: ${n1(g.mae_cis_dir)} puntos` : "" }, page: "encuestas" }).html}`;
  }
  draw();
}
