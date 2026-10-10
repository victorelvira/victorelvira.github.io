import { renderMapa } from "./mapa.js?v=0.2.21";
import { load, META, FAM, fmt, pct, elecLabel } from "./data.js?v=0.2.21";
import { seatRows, lines, dateOf, familySeries, IDEO } from "./charts.js?v=0.2.21";

export async function renderHistoria(app) {
  const [S, G] = await Promise.all([load("series.json"), load("generales_encuestas.json")]);
  const eids = S.elecciones, N = S.nacional;
  const conv = S.convocatoria_2026;
  const short = (e) => elecLabel(e).replace("Generales ", "");
  const lab = (e) => elecLabel(e);

  app.innerHTML = `
    <h1>Elecciones generales, 1977-2023</h1>
    <p class="sub">Todas las elecciones generales desde 1977: composición del Congreso, voto, participación y abstención, y cómo ha cambiado el número de diputados de cada provincia.</p>
    <h2>El Congreso, elección a elección</h2><div id="seats"></div>
    <h2>Municipio a municipio</h2>
    <p class="sub">Quién ganó en cada municipio en cada elección general. Elige qué ver, mueve el deslizador de años o pulsa ▶, y pulsa un municipio (o búscalo) para abrir su ficha: historial completo, concejales y gemelos electorales.</p>
    <div id="mapa"></div>
    <h2>Lo que decían las encuestas</h2>
    <p class="sub">Para cada elección, la última encuesta de cada casa publicada en el mes anterior, frente al resultado. Barra: de la encuesta más baja a la más alta. Punto: su media. Rombo: intención directa del CIS, sin cocinar. Raya negra: resultado.</p>
    <div class="chips" id="g-sel"></div>
    <div class="card" id="g-chart"></div>
    <div class="chart" id="g-err"></div>
    <p class="note">Error medio: diferencia absoluta media, en puntos, en los partidos con un 3% o más. Fuentes: encuestas recopiladas en Wikipedia; intención directa de los preelectorales del CIS (origen de los datos: Centro de Investigaciones Sociológicas).</p>
    <h2>El Senado</h2><p class="sub">Senadores elegidos directamente (207 en 1977, 208 desde 1979); no incluye los designados por los parlamentos autonómicos.</p><div id="senado"></div>
    <h2>Voto por familias políticas</h2><div class="chart" id="votos"></div>
    <div class="grid2">
      <div><h2>Participación y abstención</h2><div class="chart" id="part"></div>
        <p class="note">Generales: votantes sobre censo total (con residentes en el extranjero). Municipales: sobre residentes, sin los pueblos de listas abiertas.</p></div>
      <div><h2>Participación a lo largo del día</h2><div class="chart" id="avances"></div>
        <p class="note">Porcentaje de residentes que habían votado en cada avance oficial de Interior y al cierre (total con exterior). En 1979 y 1982 el primer avance fue a las 15:00; desde 1986, a las 14:00. En 1977 no hubo avances.</p></div>
    </div>
    <div class="grid2">
      <div><h2>Voto en blanco y nulo</h2><div class="chart" id="bn"></div></div>
      <div id="correo"></div>
    </div>
    <div id="cera"></div>
    <h2>Diputados por provincia</h2>
    <p class="sub">El reparto se recalcula en cada convocatoria según la población (mínimo 2 por provincia, 1 para Ceuta y Melilla). Las flechas marcan cambios respecto a la elección anterior.</p>
    <div class="scrollx" id="dip"></div>
    ${conv?.escanos?.fuente && conv.escanos.fuente !== "boe" ? `<p class="note">* 2026: calculado con la regla de la LOREG (art. 162) y la población oficial a 1 de enero de 2025, a falta de que el BOE publique el decreto. El método reproduce exactamente el reparto de 2019 y 2023.</p>` : ""}`;
  const $ = (s) => app.querySelector(s);

  seatRows($("#seats"), eids.map((e) => ({ label: short(e), e: N[e].e })), { labelWidth: 90 });
  renderMapa($("#mapa"), [], { tipos: ["generales"] });   // not awaited: the rest of the page draws meanwhile
  pollsVsResult(app, G, eids);
  if (S.senado) seatRows($("#senado"), Object.keys(S.senado).sort().map((e) => ({ label: lab(e).replace("Senado ", ""), e: S.senado[e] })), { total: 208, labelWidth: 90 });
  lines($("#votos"), familySeries(N, lab, 0.03).sort((a, b) => IDEO.indexOf(a.id) - IDEO.indexOf(b.id)), { height: 360 });

  const M = S.municipales, meids = Object.keys(M).sort();
  lines($("#part"), [
    { id: "g", name: "Generales", color: "#1f4e8c", values: eids.map((e) => ({ date: dateOf(e), v: N[e].votantes / N[e].censo, label: lab(e) })) },
    { id: "m", name: "Municipales", color: "#8a8984", values: meids.map((e) => ({ date: dateOf(e), v: M[e].votantes / M[e].censo, label: lab(e) })) },
  ], { height: 260, yMin: 0.5, yMax: 0.85 });
  lines($("#avances"), [
    { id: "t", name: "Cierre", color: "#1f4e8c", values: eids.map((e) => ({ date: dateOf(e), v: N[e].votantes / N[e].censo, label: lab(e) })) },
    { id: "a2", name: "2º avance (18:00)", color: "#6b8fc7", values: eids.map((e) => ({ date: dateOf(e), v: N[e].av2, label: lab(e) })) },
    { id: "a1", name: "1er avance (14:00)", color: "#a9bfe0", values: eids.map((e) => ({ date: dateOf(e), v: N[e].av1, label: lab(e) })) },
  ], { height: 260, yMin: 0.2, yMax: 0.85 });
  lines($("#bn"), [
    { id: "b", name: "En blanco", color: "#8a8984", values: eids.map((e) => ({ date: dateOf(e), v: N[e].blancos / N[e].votantes, label: lab(e) })) },
    { id: "n", name: "Nulo", color: "#c2410c", values: eids.map((e) => ({ date: dateOf(e), v: N[e].nulos / N[e].votantes, label: lab(e) })) },
  ], { height: 260, fmt: (v) => pct(v, 2), yTicks: (v) => `${n1(v * 100)}%` });

  // voto por correo (official counts only; how they voted is not published)
  const vcAll = S.voto_correo ?? [];
  const vc = vcAll.filter((r) => r.ambito === "ES" && r.solicitudes_aceptadas != null);
  if (vc.length) {
    const lastVc = vc.at(-1).eleccion;
    $("#correo").innerHTML = `<h2>Voto por correo</h2><div class="chart" id="vc"></div>
      <p class="note">Solicitudes aceptadas (INE, Oficina del Censo Electoral) y votos admitidos por Correos cuando se publicaron. El récord de ${lab(lastVc)} coincide con unas elecciones en pleno julio. <b>Qué</b> se vota por correo no se publica: los sobres se mezclan en la urna de cada mesa.</p>
      <h3 class="h3">Dónde más se pidió (${lab(lastVc)}, % del censo de residentes)</h3><div id="vcprov"></div>`;
    lines($("#vc"), [
      { id: "s", name: "Solicitudes aceptadas", color: "#1f4e8c", values: vc.map((r) => ({ date: dateOf(r.eleccion), v: r.solicitudes_aceptadas, label: lab(r.eleccion) })) },
      { id: "v", name: "Votos admitidos", color: "#6b8fc7", values: vc.map((r) => ({ date: dateOf(r.eleccion), v: r.votos_correo_admitidos_correos ?? r.votos_correo_entregados_mesas ?? null, label: lab(r.eleccion) })) },
    ], { height: 260, fmt: (v) => fmt.format(Math.round(v)), yTicks: (v) => `${n1(v / 1e6)} M` });
    const pr = vcAll.filter((r) => r.eleccion === lastVc && r.ambito !== "ES" && r.pct_aceptadas_sobre_censo_cer != null)
      .sort((a, b) => b.pct_aceptadas_sobre_censo_cer - a.pct_aceptadas_sobre_censo_cer);
    const mx = pr[0]?.pct_aceptadas_sobre_censo_cer ?? 1;
    $("#vcprov").innerHTML = `<table>${pr.slice(0, 10).map((r) => `<tr><td>${META.provincias[String(r.ambito).padStart(2, "0")] ?? r.ambito}</td>
      <td style="width:50%"><span class="hbar" style="width:${(r.pct_aceptadas_sobre_censo_cer / mx) * 100}%;background:#1f4e8c"></span></td>
      <td class="num">${String(r.pct_aceptadas_sobre_censo_cer).replace(".", ",")}%</td></tr>`).join("")}</table>`;
  }
  const cera = (S.cera ?? []).filter((r) => r.ambito === "ES" && r.participacion_cera != null);
  if (cera.length) {
    $("#cera").innerHTML = `<h2>Españoles en el extranjero (CERA)</h2><div class="chart" id="cc"></div>
      <p class="note">Participación del censo de residentes ausentes. Entre 2011 y 2019 rigió el «voto rogado» (había que solicitar el voto antes de recibirlo) y la participación se hundió por debajo del 7%; se derogó en 2022.</p>`;
    lines($("#cc"), [{ id: "c", name: "Participación CERA", color: "#1f4e8c",
      values: cera.map((r) => ({ date: dateOf(r.eleccion), v: r.participacion_cera > 1 ? r.participacion_cera / 100 : r.participacion_cera, label: `${lab(r.eleccion)}${r.voto_rogado ? " · voto rogado" : ""}` })) }],
      { height: 240 });
  }

  // seats per province heat table
  const provs = Object.keys(S.provincias).sort((a, b) => META.provincias[a].localeCompare(META.provincias[b], "es"));
  const cols = [...eids, ...(conv?.escanos?.provincias ? ["2026"] : [])];
  const years = cols.map((e) => e.slice(e.indexOf("_") + 1, e.indexOf("_") + 5));
  const colLabel = (e) => { const y = e.slice(e.indexOf("_") + 1, e.indexOf("_") + 5);
    return years.filter((x) => x === y).length > 1 ? short(e) : y; };
  const seatsOf = (p, e) => (e === "2026" ? conv.escanos.provincias.find((r) => r.prov === p)?.escanos : S.provincias[p].s[e]?.escanos);
  $("#dip").innerHTML = `<table class="heat"><tr><th>Provincia</th>${cols.map((e) => `<th class="num">${e === "2026" ? `<b>2026</b>${conv.escanos.fuente === "boe" ? "" : "*"}` : colLabel(e)}</th>`).join("")}</tr>
    ${provs.map((p) => `<tr><td>${META.provincias[p]}</td>${cols.map((e, i) => {
      const v = seatsOf(p, e), prev = i ? seatsOf(p, cols[i - 1]) : v;
      const d = v != null && prev != null ? v - prev : 0;
      return `<td class="num ${d > 0 ? "up" : d < 0 ? "down" : ""}">${v ?? "·"}${d > 0 ? "▲" : d < 0 ? "▼" : ""}</td>`;
    }).join("")}</tr>`).join("")}</table>`;
}

const PFAM = { sumar: "izq", iu: "izq", podemos: "izq", mas_pais: "izq", upyd: "cs", cds: "ucd" };
const pColor = (p) => (FAM[PFAM[p] ?? p] ?? FAM.otros).color;
const n1 = (x) => (x == null ? "·" : x.toFixed(1).replace(".", ","));

function pollsVsResult(app, G, eids) {
  const $ = (s) => app.querySelector(s);
  const ciclos = Object.keys(G).sort();
  const byDate = Object.fromEntries(eids.map((e) => [e.slice(e.indexOf("_") + 1, e.indexOf("_") + 8), e]));
  const label = (c) => elecLabel(byDate[c.slice(0, 7)] ?? `generales_${c.slice(0, 7)}`).replace("Generales ", "");
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
      <p class="note"><a href="#encuestas/${cur}">Ver la evolución de todas las encuestas de este ciclo →</a></p>
      <p class="note">${g.n} encuestadoras · error medio de la media de encuestas: <b>${n1(g.mae_media)} puntos</b>${g.mae_cis_dir != null ? ` · intención directa del CIS: ${n1(g.mae_cis_dir)} puntos` : ""}</p>`;
  }
  draw();
  lines($("#g-err"), [
    { id: "m", name: "Media de encuestas", color: "#1f4e8c", values: ciclos.map((c) => ({ date: new Date(c), v: G[c].mae_media, label: label(c) })) },
    { id: "d", name: "CIS sin cocinar", color: "#8a8984", values: ciclos.map((c) => ({ date: new Date(c), v: G[c].mae_cis_dir, label: label(c) })) },
  ], { height: 220, fmt: (v) => `${n1(v)} puntos`, yTicks: (v) => `${v} pp`, dash: { d: "4 3" } });
}
