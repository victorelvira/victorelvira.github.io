import { load, loadFresh, FAM, fmt, BUILD_AT, de100, fechaLarga } from "./data.js?v=0.2.108";
import { seatRows, lines, indexHtml, sectionIndex } from "./charts.js?v=0.2.108";
import { projectFromPolls } from "./simulador.js?v=0.2.108";
import { POLL_PARTY, pollChart } from "./encuestas.js?v=0.2.108";
import { pugnasHtml } from "./provincia.js?v=0.2.108";
import { textos, md, INDICE } from "./textos.js?v=0.2.108";
import { resultadosHtml, wireResultados } from "./resultados.js?v=0.2.108";

const ELECTION_DAY = new Date("2026-11-29T09:00:00+01:00");

const LIVE_ELECTION = "generales_2026-11";

// Election night: the provisional count written by pipeline/noche_electoral.py. Shown only when the
// file belongs to this election (#inicio/demo shows whatever sample is on disk, for testing).
async function noche(demo) {
  try {
    const d = await loadFresh("noche/nacional.json");
    return d && (d.eleccion === LIVE_ELECTION || demo) ? d : null;
  } catch { return null; }
}

function nocheHtml(d, T) {
  const n1 = (x) => (x == null ? "·" : x.toFixed(2).replace(".", ","));
  const hora = d.actualizado ? new Date(d.actualizado).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
  const ps = d.partidos.filter((p) => p.escanos > 0 || p.pct >= 1).sort((a, b) => b.escanos - a.escanos || b.votos - a.votos);
  const tabla = `<table><tr><th>Candidatura</th><th class="num">Votos</th><th class="num">%</th><th class="num">Escaños</th><th class="num">Antes</th></tr>
      ${ps.map((p) => `<tr><td><i class="dot" style="background:${(FAM[p.familia] ?? FAM.otros).color}"></i>${p.siglas}</td>
        <td class="num">${fmt.format(p.votos)}</td><td class="num">${n1(p.pct)}</td><td class="num"><b>${p.escanos ?? "·"}</b></td>
        <td class="num">${p.escanos_ant ?? "·"}</td></tr>`).join("")}</table>`;
  const vars = { titulo_noche: d.eleccion === LIVE_ELECTION ? "Resultados provisionales" : `Prueba con datos de ${d.eleccion}`,
    escrutado: n1(d.mesas_pct ?? d.censo_pct), hora, participacion: n1(d.participacion) };
  return `<section class="card live">${md(T.noche, { vars, slots: { tabla_noche: tabla }, page: "portada" }).html}</section>`;
}

export async function renderInicio(app, args = []) {
  const [S, E, dh] = await Promise.all([load("series.json"), load("encuestas.json"), load("dhondt.json")]);
  const D = await load("dentro.json").catch(() => null);
  // the model's estimate (pipeline/prediccion.py); without it, the mechanical projection of the poll average
  const [PR, DR] = await Promise.all([load("prediccion.json").catch(() => null), load("prediccion_draws.json").catch(() => null)]);
  const G = await load("geo_nuevos.json").catch(() => null);
  const [PV, BT, EC] = await Promise.all([load("provincias_29n.json").catch(() => null), load("backtest.json").catch(() => null), load("error_comun.json").catch(() => null)]);
  const mayoria = PR?.mayorias.find((m) => m.nombre === "PP + Vox");
  const days = Math.ceil((ELECTION_DAY - new Date()) / 86400000);
  const base = Object.keys(dh).sort().at(-1);
  const conv = S.convocatoria_2026;
  const esc26 = conv?.escanos?.provincias ? Object.fromEntries(conv.escanos.provincias.map((r) => [r.prov, r.escanos])) : null;
  const proj = projectFromPolls(dh[base], E.ultimo, esc26, G);
  const top = ["pp", "psoe", "vox", "sumar", "podemos", "salf"].filter((p) => E.ultimo[p] != null);

  const live = await noche(args[0] === "demo");
  const T = await textos("portada");
  const R = PR ? await resultadosHtml(PR) : null;   // the results block shared with the Modelo tab (textos/resultados.md)
  // the prose is textos/portada.md; here only the figures, the conditions and the computed blocks
  const vars = {
    dias: days, ultimo_campo: PR ? fechaLarga(PR.ultimo_campo) : null, ppvox_176: mayoria ? de100(mayoria.prob) : null,
    pp_primero: PR ? de100(PR.p_pp_primero) : null, pp_mas_votado: PR?.p_pp_mas_votado != null ? de100(PR.p_pp_mas_votado) : null,
    ultimo_modelo: PR ? fechaLarga(PR.fecha.slice(0, 10)) : null, simulaciones: PR ? PR.draws.toLocaleString("es-ES") : null, fecha_datos: fechaLarga(BUILD_AT.slice(0, 10)),
    elecciones: BT?.elecciones, desde: BT?.desde, acierto_voto: BT ? de100(BT.horizontes[7].voto.en90) : null, acierto_escanos: BT ? de100(BT.horizontes[7].escanos.en90) : null,
    error_x15: EC ? de100(EC.escala_x15) : null, error_x08: EC ? de100(EC.escala_x08) : null,
    fuente_escanos: conv?.escanos?.fuente === "boe" ? "según el decreto de convocatoria (BOE)" : "calculados con la LOREG y la población oficial a 1-1-2025, a falta del decreto en el BOE",
    cambios_escanos: (conv?.cambios_vs_2023 ?? []).map((c) => `${c.nombre} ${c.escanos_2023}→${c.escanos_2026}`).join(", "),
  };
  const flags = { antes: days > 0, hoy: days === 0, despues: days < 0, modelo: !!mayoria, provincias: !!PV, validacion: !!BT, sensibilidad: !!(BT && EC),
    movilizacion: !!D, cambios: !!conv?.cambios_vs_2023?.length };
  const slots = {
    noche: null,
    promedio: `<p class="linea">${top.map((p) => `<span class="chip"><i class="dot" style="background:${POLL_PARTY[p].c()}"></i>${POLL_PARTY[p].n} <b>${String(E.ultimo[p]).replace(".", ",")}%</b></span>`).join("")}</p>`,
    pugnas: PV ? pugnasHtml(PV, 3, T.pugna, "portada") : null,
    mov: '<div class="grid2" id="mov"></div>',
    resultados: R?.html ?? null,
    calendario: conv?.calendario ? calendario(conv) : null,
  };
  const { html, sec } = md(T.principal, { vars, flags, slots, page: "portada" });
  if (R) sec.find(([id]) => id === "diputados")?.[2].push(...R.sec);   // Escaños and Voto, after Resumen
  // index: a sticky column on wide screens, a sticky scrollable row under the menu on phones
  const IX = indexHtml(sec);
  app.innerHTML = `
    <div class="layout">
    ${IX.aside}
    <div class="content">
    ${live ? nocheHtml(live, T) : ""}
    ${html.replace(INDICE, IX.row)}
    </div></div>`;
  sectionIndex(app);

  if (live) {
    const fam = {};
    live.partidos.forEach((p) => { if (p.escanos) fam[p.familia] = (fam[p.familia] ?? 0) + p.escanos; });
    seatRows(app.querySelector("#live-seats"), [{ label: "Escaños", e: fam }], { labelWidth: 90, eid: "generales_2026-11" });
    // refresh while the page is open on election night
    clearTimeout(window.__nocheTimer);
    window.__nocheTimer = setTimeout(() => { if (location.hash.replace("#", "").split("/")[0] in { "": 1, inicio: 1 }) renderInicio(app, args); }, 60000);
  }
  // without a model, portada.md has its own seat bar and groups (the poll projection): the same wiring
  wireResultados(app, { PR, DR, est: PR?.central ?? proj.seats, conv });
  pollChart(app.querySelector("#chart-area"), E, { selector: false, lastTable: false, tools: false, kpi: false });

}

// latest survey with microdata: who is sure to vote, and the change from the same house's previous survey
// mobilisation as two small time series (one per house with microdata): sure to vote by 2023 vote
function movilizacion(el, D) {
  const G = [["derecha", "Votó PP o Vox", "#1d84ce"], ["izquierda", "Votó PSOE o Sumar", "#e30613"], ["jovenes", "Menores de 35", "#6b2e68"], ["abstencion", "No votó", "#8a8984"]];
  el.innerHTML = Object.keys(D.movilizacion).map((casa) => `<div><div class="h4">${casa}</div><div class="chart" id="mov-${casa.replace(/\W/g, "")}"></div></div>`).join("");
  for (const [casa, rows] of Object.entries(D.movilizacion)) {
    const last = rows.at(-1);
    lines(el.querySelector(`#mov-${casa.replace(/\W/g, "")}`), G.map(([k, n, c]) => ({ id: k, name: `${n} ${last[k] != null ? Math.round(last[k]) + "%" : ""}`, color: c,
      values: rows.map((r) => ({ date: new Date(r.f), v: r[k] == null ? null : r[k] / 100, label: r.f })) })), { height: 200, yMin: 0, yMax: 1 });
  }
}

const HITOS = {
  convocatoria_boe: "Convocatoria en el BOE",
  voto_correo_solicitud_fin: "Último día para pedir el voto por correo",
  consulta_censo: "Consulta del censo y reclamaciones",
  presentacion_candidaturas: "Presentación de candidaturas",
  proclamacion_candidaturas: "Proclamación de candidaturas",
  cera_envio_papeletas: "Exterior: envío de papeletas",
  voto_correo_envio_documentacion: "Voto por correo: envío de la documentación",
  campana_electoral: "Campaña electoral",
  cera_deposito_urna: "Exterior: voto en urna en consulados",
  cera_voto_correo_fin: "Exterior: último día para enviar el voto",
  voto_correo_entrega_fin: "Último día para votar por correo en Correos",
  jornada_reflexion: "Jornada de reflexión",
  jornada_electoral: "Votación",
};

function calendario(conv) {
  const f = (d) => new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  const today = new Date().toISOString().slice(0, 10);
  const start = (c) => (c.fecha_fin ? c.fecha_inicio : c.fecha);
  const rows = conv.calendario.filter((c) => HITOS[c.clave]).sort((a, b) => start(a).localeCompare(start(b))).map((c) => {
    const end = c.fecha_fin ?? c.fecha;
    const when = c.fecha_fin ? `${f(c.fecha_inicio)} – ${f(c.fecha_fin)}` : f(c.fecha);
    return `<tr class="${end < today ? "past" : ""}"><td style="width:150px">${when}</td><td>${HITOS[c.clave]}</td>
      <td class="note">${c.fuente === "calculado" ? "calculado (LOREG)" : c.fuente}</td></tr>`;
  });
  return `<table class="cal">${rows.join("")}</table>`;
}

