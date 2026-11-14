import { renderMapa } from "./mapa.js?v=0.2.74";
import { projectFromPolls, natShares, seatsFor } from "./simulador.js?v=0.2.74";
import { indexHtml, sectionIndex } from "./charts.js?v=0.2.74";
import { load, META, FAM, fmt, pct, elecLabel } from "./data.js?v=0.2.74";
import { seatRows, lines, dateOf, familySeries, IDEO } from "./charts.js?v=0.2.74";
import { textos, md, INDICE } from "./textos.js?v=0.2.74";

export async function renderHistoria(app) {
  const [S, G, E, dh, geo, PR, CI] = await Promise.all([load("series.json"), load("generales_encuestas.json"), load("encuestas.json"), load("dhondt.json"),
    load("geo_nuevos.json").catch(() => null), load("prediccion.json").catch(() => null), load("ciclos/index.json").catch(() => ({ ciclos: [] }))]);
  const eids = S.elecciones, N = S.nacional;
  const conv = S.convocatoria_2026;
  const short = (e) => elecLabel(e).replace("Generales ", "");
  const lab = (e) => elecLabel(e);

  const T = await textos("generales");
  // the prose is textos/generales.md; here only the conditions and the containers of charts and tables
  const chart = (id) => `<div class="chart" id="${id}"></div>`;
  const slots = { votos: chart("votos"), part: chart("part"), avances: chart("avances"), bn: chart("bn"), dip: '<div class="scrollx" id="dip"></div>' };
  const flags = { provisional: !!(conv?.escanos?.fuente && conv.escanos.fuente !== "boe") };
  const { html, sec } = md(T.principal, { slots, flags, page: "generales" });
  // the participation section has no h2 of its own, so its index entry is added here
  const IX = indexHtml(sec);
  app.innerHTML = `
    <div class="layout">
    ${IX.aside}
    <div class="content">
    ${html.replace(INDICE, IX.row)}
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
    $("#correo").innerHTML = md(T.correo, { vars: { ultima: lab(lastVc) }, slots: { vc: chart("vc") }, page: "generales" }).html;
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
    $("#cera").innerHTML = md(T.cera, { slots: { cc: chart("cc") }, page: "generales" }).html;
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

