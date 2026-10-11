import { load, loadFresh, FAM, pct, fmt, elecLabel, BUILD_AT } from "./data.js?v=0.2.57";
import { seatRows, lines, dateOf, familySeries, IDEO, famName, fam, indexHtml, sectionIndex, bloques } from "./charts.js?v=0.2.57";
import { projectFromPolls } from "./simulador.js?v=0.2.57";
const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { POLL_PARTY, pollChart } from "./encuestas.js?v=0.2.57";

const ELECTION_DAY = new Date("2026-11-29T09:00:00+01:00");
const fechaLarga = (s) => new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long" });

const LIVE_ELECTION = "generales_2026-11";

// Election night: the provisional count written by pipeline/noche_electoral.py. Shown only when the
// file belongs to this election (#inicio/demo shows whatever sample is on disk, for testing).
async function noche(demo) {
  try {
    const d = await loadFresh("noche/nacional.json");
    return d && (d.eleccion === LIVE_ELECTION || demo) ? d : null;
  } catch { return null; }
}

function nocheHtml(d) {
  const n1 = (x) => (x == null ? "·" : x.toFixed(2).replace(".", ","));
  const hora = d.actualizado ? new Date(d.actualizado).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
  const ps = d.partidos.filter((p) => p.escanos > 0 || p.pct >= 1).sort((a, b) => b.escanos - a.escanos || b.votos - a.votos);
  return `<section class="card live">
    <div class="eyebrow">${d.eleccion === LIVE_ELECTION ? "Resultados provisionales" : `Prueba con datos de ${d.eleccion}`}</div>
    <h2 style="margin-top:4px">Escrutado el ${n1(d.mesas_pct ?? d.censo_pct)}% · ${hora}</h2>
    <div id="live-seats"></div>
    <table><tr><th>Candidatura</th><th class="num">Votos</th><th class="num">%</th><th class="num">Escaños</th><th class="num">Antes</th></tr>
      ${ps.map((p) => `<tr><td><i class="dot" style="background:${(FAM[p.familia] ?? FAM.otros).color}"></i>${p.siglas}</td>
        <td class="num">${fmt.format(p.votos)}</td><td class="num">${n1(p.pct)}</td><td class="num"><b>${p.escanos ?? "·"}</b></td>
        <td class="num">${p.escanos_ant ?? "·"}</td></tr>`).join("")}</table>
    <p class="note">Participación ${n1(d.participacion)}% · datos provisionales del Ministerio del Interior; se actualiza cada minuto. Los escaños definitivos los proclaman las juntas electorales.</p>
  </section>`;
}

export async function renderInicio(app, args = []) {
  const [S, E, dh] = await Promise.all([load("series.json"), load("encuestas.json"), load("dhondt.json")]);
  const D = await load("dentro.json").catch(() => null);
  // the model's estimate (pipeline/prediccion.py); without it, the mechanical projection of the poll average
  const [PR, DR] = await Promise.all([load("prediccion.json").catch(() => null), load("prediccion_draws.json").catch(() => null)]);
  const G = await load("geo_nuevos.json").catch(() => null);
  const days = Math.ceil((ELECTION_DAY - new Date()) / 86400000);
  const base = Object.keys(dh).sort().at(-1);
  const conv = S.convocatoria_2026;
  const esc26 = conv?.escanos?.provincias ? Object.fromEntries(conv.escanos.provincias.map((r) => [r.prov, r.escanos])) : null;
  const proj = projectFromPolls(dh[base], E.ultimo, esc26, G);
  const ppvox = (proj.seats.pp ?? 0) + (proj.seats.vox ?? 0);
  const izqNac = ["psoe", "izq", "sumar", "podemos"].reduce((s, f) => s + (proj.seats[f] ?? 0), 0);
  const otros = Object.entries(proj.seats).filter(([f, n]) => n && !["pp", "vox", "psoe", "izq", "sumar", "podemos"].includes(f)).sort((a, b) => b[1] - a[1]);
  const top = ["pp", "psoe", "vox", "sumar", "podemos", "salf"].filter((p) => E.ultimo[p] != null);

  const live = await noche(args[0] === "demo");
  // index: a sticky column on wide screens, a sticky scrollable row under the menu on phones
  const SEC = [["resumen", "Resumen de encuestas", [["diputados", "Diputados"], ["voto", "Porcentaje de voto"], ...(D ? [["movilizacion", "Movilización"]] : [])]], ["calendario", "Calendario", []]];
  const IX = indexHtml(SEC);
  app.innerHTML = `
    <div class="layout">
    ${IX.aside}
    <div class="content">
    ${live ? nocheHtml(live) : ""}
    <div class="eyebrow">Elecciones generales en España</div>
    <h1>29 de noviembre de 2026</h1>
    <p class="sub">${days > 0 ? `Faltan <b>${days} días</b> para las elecciones generales.` : days === 0 ? "<b>Hoy se vota.</b>" : ""} Se eligen 350 diputados y 208 senadores.</p>
    ${IX.row}

    <section id="s-resumen">
    <h2>Resumen de encuestas</h2>
    <p class="sub">Resumen de encuestas a día ${fechaLarga(BUILD_AT.slice(0, 10))}. Todos los detalles históricos, por encuestadora, la metodología y más, en <a href="#encuestas">Encuestas</a>.</p>
    <h3 id="s-diputados">Diputados (estimación)</h3>
    <div class="card">
      <div id="proj"></div>
      <div id="bloques"></div>
      <p class="note">Arrastra un partido a otro grupo. La mayoría son 176 diputados.</p>
      <details class="metodo-box"><summary>Metodología</summary><p class="note">${PR ? `Estimación del modelo propio: las encuestas, más el error que han tenido en cada general desde 1982, llevadas provincia a provincia y repartidas con D'Hondt en ${PR.draws.toLocaleString("es-ES")} simulaciones. La barra y las cifras son la estimación central; bajo cada grupo, el rango que recoge 9 de cada 10 simulaciones y la probabilidad de que el grupo llegue a 176.` : "Reparto del promedio de encuestas provincia a provincia con D'Hondt, sin márgenes de error."} <a href="#encuestas/metodo">Más detalle</a> · <a href="#simulador">Prueba otros porcentajes →</a></p></details>
    </div>

    <h3 id="s-voto">Porcentaje de voto (estimación)</h3>
    <p class="linea">${top.map((p) => `<span class="chip"><i class="dot" style="background:${POLL_PARTY[p].c()}"></i>${POLL_PARTY[p].n} <b>${String(E.ultimo[p]).replace(".", ",")}%</b></span>`).join("")}</p>
    <div id="chart-area"></div>


    ${D ? `<h3 id="s-movilizacion">Movilización (estimación)</h3>
    <p class="note">Porcentaje seguro de ir a votar (10 sobre 10) según lo que votó en julio de 2023, en las encuestas con microdatos de cada casa. Las dos preguntan de forma distinta y el CIS da niveles más altos: compara cada casa consigo misma. <a href="#encuestas">Adónde va cada voto, en Encuestas →</a></p>
    <div class="grid2" id="mov"></div>` : ""}
    </section>

    <section id="s-calendario">
    ${conv?.calendario ? `<h2>Calendario</h2>${calendario(conv)}` : ""}
    ${conv?.cambios_vs_2023?.length ? `<p class="note">Escaños por provincia en 2026 ${conv.escanos.fuente === "boe" ? "según el decreto de convocatoria (BOE)" : "calculados con la LOREG y la población oficial a 1-1-2025, a falta del decreto en el BOE"}: ${conv.cambios_vs_2023.map((c) => `${c.nombre} ${c.escanos_2023}→${c.escanos_2026}`).join(", ")}.</p>` : ""}

    <div class="tiles">
      <a class="tile" href="#generales"><b>Generales 1977-2023</b><span>El Congreso elección a elección, voto, participación, el mapa municipal</span></a>
      <a class="tile" href="#simulador/encuestas"><b>Simulador</b><span>Mueve los porcentajes y mira los escaños, mayorías y último escaño por provincia</span></a>
      <a class="tile" href="#encuestas"><b>Encuestas</b><span>Todas las encuestas desde 1982, la cocina y quién acierta</span></a>
    </div>
    </section>
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
  const est = PR?.central ?? proj.seats;
  seatRows(app.querySelector("#proj"), [{ label: "Estimación", e: est }], { labelWidth: 90, eid: "generales_2026-11" });
  bloques(app.querySelector("#bloques"), est, { draws: PR ? DR : null });
  pollChart(app.querySelector("#chart-area"), E, { selector: false, lastTable: false, tools: false, kpi: false });
  if (D) movilizacion(app.querySelector("#mov"), D);
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

