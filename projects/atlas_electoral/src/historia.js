import { renderMapa } from "./mapa.js?v=0.2.58";
import { projectFromPolls, natShares, seatsFor } from "./simulador.js?v=0.2.58";
import { indexHtml, sectionIndex } from "./charts.js?v=0.2.58";
import { load, META, FAM, fmt, pct, elecLabel } from "./data.js?v=0.2.58";
import { seatRows, lines, dateOf, familySeries, IDEO } from "./charts.js?v=0.2.58";

export async function renderHistoria(app) {
  const [S, G, E, dh, geo, PR, CI] = await Promise.all([load("series.json"), load("generales_encuestas.json"), load("encuestas.json"), load("dhondt.json"),
    load("geo_nuevos.json").catch(() => null), load("prediccion.json").catch(() => null), load("ciclos/index.json").catch(() => ({ ciclos: [] }))]);
  const eids = S.elecciones, N = S.nacional;
  const conv = S.convocatoria_2026;
  const short = (e) => elecLabel(e).replace("Generales ", "");
  const lab = (e) => elecLabel(e);

  const SEC = [["congreso", "El Congreso"], ["mapa", "Municipio a municipio"], ["senado", "El Senado"],
    ["voto", "Voto por familias"], ["participacion", "Participación y voto por correo"], ["provincias", "Diputados por provincia"]];
  const IX = indexHtml(SEC);
  app.innerHTML = `
    <div class="layout">
    ${IX.aside}
    <div class="content">
    <h1>Elecciones generales, 1977-2023</h1>
    <p class="sub">Todas las elecciones generales desde 1977: composición del Congreso, voto, participación y abstención, y cómo ha cambiado el número de diputados de cada provincia.</p>
    ${IX.row}
    <section id="s-congreso">
<h2>El Congreso, elección a elección</h2>
    <p class="note">Encima de cada elección, en apagado, los escaños que daba la media final de las encuestas.</p><div id="seats"></div>
    </section>
    <section id="s-mapa">
<h2>Municipio a municipio</h2>
    <p class="note">Quién ganó en cada municipio. Pulsa ▶ para recorrer las elecciones, o pulsa un municipio (o búscalo) para ver su historial.</p>
    <div id="mapa"></div>
    </section>
    <section id="s-senado">
<h2>El Senado</h2><p class="sub">Senadores elegidos directamente (207 en 1977, 208 desde 1979); no incluye los designados por los parlamentos autonómicos.</p><div id="senado"></div>
    </section>
    <section id="s-voto">
<h2>Voto por familias políticas</h2><div class="chart" id="votos"></div>
    </section>
    <section id="s-participacion">
<div class="grid2">
      <div><h3>Participación y abstención</h3><div class="chart" id="part"></div>
        <p class="note">Generales: votantes sobre censo total (con residentes en el extranjero). Municipales: sobre residentes, sin los pueblos de listas abiertas.</p></div>
      <div><h3>Participación a lo largo del día</h3><div class="chart" id="avances"></div>
        <p class="note">Porcentaje de residentes que habían votado en cada avance oficial de Interior y al cierre (total con exterior). En 1979 y 1982 el primer avance fue a las 15:00; desde 1986, a las 14:00. En 1977 no hubo avances.</p></div>
    </div>
    <div class="grid2">
      <div><h3>Voto en blanco y nulo</h3><div class="chart" id="bn"></div></div>
      <div id="correo"></div>
    </div>
    <div id="cera"></div>
    </section>
    <section id="s-provincias">
<h2>Diputados por provincia</h2>
    <p class="sub">El reparto se recalcula en cada convocatoria según la población (mínimo 2 por provincia, 1 para Ceuta y Melilla). Las flechas marcan cambios respecto a la elección anterior.</p>
    <div class="scrollx" id="dip"></div>
    <details class="metodo-box" id="metodo"><summary>Metodología</summary><div class="metodo">
    <p><b>Resultados.</b> Ministerio del Interior (Infoelectoral), mesa a mesa agregado a municipio y provincia, para generales, Senado, municipales y europeas desde 1977, y autonómicas hasta 2012; desde 2012 las autonómicas vienen del portal oficial de resultados de cada comunidad. Interior es la fuente de verdad; Wikipedia solo se usa para las encuestas.</p>
    <p><b>Familias.</b> Las candidaturas se agrupan en familias políticas (PP incluye AP y CD; PCE/IU/Podemos/Sumar; CiU/Junts; HB/Bildu...) con un vocabulario escrito a mano, con reglas por elección para los casos dudosos. Desde 2019 se muestran con su nombre actual. Un cambio de familia nunca altera un voto: solo cómo se suma.</p>
    <p><b>Participación y voto por correo.</b> Participación sobre el censo total (con residentes en el extranjero); avances a las 14:00 y 18:00 sobre residentes en España, de los partes oficiales. Voto por correo: solicitudes aceptadas por la Oficina del Censo Electoral y votos admitidos por Correos cuando se publicaron. El voto CERA no se asigna a municipios. En municipales, los pueblos de hasta 250 habitantes votan con listas abiertas: el voto de cada lista se aproxima por su candidato más votado.</p>
    <p><b>Lo que decían las encuestas.</b> Para cada elección, la última encuesta de cada casa en los 35 días anteriores, frente al resultado; el rombo es la intención directa del preelectoral del CIS, sin cocina.</p>
    <p class="note">Fuentes: Ministerio del Interior; portales de resultados de las comunidades; INE (censo y voto por correo); IGN (límites municipales); Wikipedia (encuestas); CIS (origen de los datos: Centro de Investigaciones Sociológicas).</p>
    </div></details>
    ${conv?.escanos?.fuente && conv.escanos.fuente !== "boe" ? `<p class="note">* 2026: calculado con la regla de la LOREG (art. 162) y la población oficial a 1 de enero de 2025, a falta de que el BOE publique el decreto. El método reproduce exactamente el reparto de 2019 y 2023.</p>` : ""}
    </section>
    </div></div>`;
  const $ = (s) => app.querySelector(s);
  sectionIndex(app);

  // newest first, with today's estimate from the polls on top in faded colours (the same projection as the 29N page)
  const base = Object.keys(dh).sort().at(-1), conv26 = S.convocatoria_2026;
  const esc26 = conv26?.escanos?.provincias ? Object.fromEntries(conv26.escanos.provincias.map((r) => [r.prov, r.escanos])) : null;
  const proj = projectFromPolls(dh[base], E.ultimo, esc26, geo);
  const toFam = (seats) => { const o = {};   // Sumar and Podemos back into their family, SALF into "otros": one legend
    for (const [f, n] of Object.entries(seats)) { const k = f === "sumar" || f === "podemos" ? "izq" : f === "salf" ? "otros" : f; o[k] = (o[k] ?? 0) + n; } return o; };
  const est26 = toFam(PR?.central ?? proj.seats);
  const gens = Object.keys(dh).sort();
  const pollRow = (e) => {   // what the final polls gave, in seats: their average swung from the previous general election
    const c = CI.ciclos.find((x) => x.ciclo.slice(0, 7) === e.slice(e.indexOf("_") + 1)), prev = gens[gens.indexOf(e) - 1];
    if (!c?.ultimo || !prev) return null;
    const nat = natShares(dh[prev]), target = {};
    for (const [p, v] of Object.entries(c.ultimo)) { const f = PFAM[p] ?? p; target[f] = (target[f] ?? 0) + v / 100; }
    const factor = Object.fromEntries(Object.entries(target).filter(([f]) => nat[f] > 0).map(([f, v]) => [f, v / nat[f]]));
    const esc = Object.fromEntries(dh[e].map((p) => [p.prov, p.esc]));
    return { label: "encuestas", e: seatsFor(dh[prev], factor, esc).seats, muted: true };
  };
  seatRows($("#seats"), [{ label: "2026 · estimación", e: est26, muted: true },
    ...[...eids].reverse().flatMap((e) => [pollRow(e), { label: short(e), e: N[e].e }].filter(Boolean))], { labelWidth: 110 });
  renderMapa($("#mapa"), [], { tipos: ["generales"] });   // not awaited: the rest of the page draws meanwhile
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
    $("#correo").innerHTML = `<h3>Voto por correo</h3><div class="chart" id="vc"></div>
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
    $("#cera").innerHTML = `<h3>Españoles en el extranjero (CERA)</h3><div class="chart" id="cc"></div>
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

