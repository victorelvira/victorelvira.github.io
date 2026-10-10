import { load, loadFresh, FAM, pct, fmt, elecLabel } from "./data.js?v=0.2.12";
import { seatRows, lines, dateOf, familySeries, IDEO } from "./charts.js?v=0.2.12";
import { projectFromPolls } from "./simulador.js?v=0.2.12";
const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { POLL_PARTY } from "./encuestas.js?v=0.2.12";

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
  const days = Math.ceil((ELECTION_DAY - new Date()) / 86400000);
  const base = Object.keys(dh).sort().at(-1);
  const conv = S.convocatoria_2026;
  const esc26 = conv?.escanos?.provincias ? Object.fromEntries(conv.escanos.provincias.map((r) => [r.prov, r.escanos])) : null;
  const proj = projectFromPolls(dh[base], E.ultimo, esc26);
  const ppvox = (proj.seats.pp ?? 0) + (proj.seats.vox ?? 0);
  const izqBloc = ["psoe", "izq", "erc", "bildu", "pnv", "bng", "compromis", "cup"].reduce((s, f) => s + (proj.seats[f] ?? 0), 0);
  const top = ["pp", "psoe", "vox", "sumar", "podemos", "salf"].filter((p) => E.ultimo[p] != null);

  const live = await noche(args[0] === "demo");
  app.innerHTML = `
    ${live ? nocheHtml(live) : ""}
    <section class="hero">
      <div class="eyebrow">Elecciones generales</div>
      <h1 class="big">29 de noviembre de 2026</h1>
      <p class="sub">${days > 0 ? `Faltan <b>${days} días</b>.` : days === 0 ? "<b>Hoy se vota.</b>" : ""} Elecciones anticipadas convocadas el 5 de octubre tras la derrota del Gobierno en los decretos de vivienda. Se eligen 350 diputados y 208 senadores.</p>
    </section>

    <h2>Qué dicen las encuestas</h2>
    <div class="stats">${top.map((p) => `<div class="stat"><div class="v"><i class="dot" style="background:${POLL_PARTY[p].c()}"></i>${String(E.ultimo[p]).replace(".", ",")}%</div><div class="k">${POLL_PARTY[p].n}</div></div>`).join("")}</div>
    <p class="note">Promedio corregido de ${E.polls.length} encuestas, último trabajo de campo ${fechaLarga(E.actualizado)}. <a href="#encuestas">Ver evolución y sesgos →</a></p>

    ${D ? movilizacion(D) : ""}

    <h2>Si se votara hoy</h2>
    <div class="card">
      <div id="proj"></div>
      <div class="stats">
        <div class="stat"><div class="v">${ppvox}</div><div class="k">PP + Vox ${ppvox >= 176 ? "· mayoría absoluta" : `· a ${176 - ppvox} de la mayoría`}</div></div>
        <div class="stat"><div class="v">${izqBloc}</div><div class="k">PSOE + Sumar/Podemos + nacionalistas de izquierda y PNV</div></div>
        <div class="stat"><div class="v">${proj.seats.junts ?? 0}</div><div class="k">Junts (bisagra)</div></div>
      </div>
      <p class="note">Proyección mecánica: el promedio de encuestas se aplica proporcionalmente sobre el reparto provincial de ${elecLabel(base)}${esc26 ? " con los escaños por provincia de 2026" : ""} y se reparte con D'Hondt, sin márgenes de error; la estimación con incertidumbre llegará con el modelo. <a href="#simulador/encuestas">Juega con el simulador →</a></p>
    </div>

    ${conv?.calendario ? `<h2>Calendario</h2>${calendario(conv)}` : ""}
    ${conv?.cambios_vs_2023?.length ? `<p class="note">Escaños por provincia en 2026 ${conv.escanos.fuente === "boe" ? "según el decreto de convocatoria (BOE)" : "calculados con la LOREG y la población oficial a 1-1-2025, a falta del decreto en el BOE"}: ${conv.cambios_vs_2023.map((c) => `${c.nombre} ${c.escanos_2023}→${c.escanos_2026}`).join(", ")}. <a href="#generales">Ver la serie histórica →</a></p>` : ""}

    <h2>Cómo hemos llegado aquí</h2>
    <p class="sub">Composición del Congreso tras cada elección general desde 1977, por familias políticas.</p>
    <div id="hist"></div>

    <div class="grid2">
      <div><h2>Participación</h2><div class="chart" id="part"></div>
        <p class="note">Total sobre censo (incluye residentes en el extranjero). Avances a las 14:00 y 18:00: datos oficiales sobre residentes en España.</p></div>
      <div><h2>Voto por familias</h2><div class="chart" id="votos"></div></div>
    </div>
    <h2>Más</h2>
    <div class="tiles">
      <a class="tile" href="#encuestas"><b>Encuestas</b><span>Todas las encuestas, quién acierta y cuánto cocina cada casa</span></a>
      <a class="tile" href="#generales"><b>Generales 1977-2023</b><span>Congreso, voto, participación y diputados por provincia</span></a>
      <a class="tile" href="#explora"><b>Explora</b><span>Tu pueblo, tu comunidad y el mapa de todas las elecciones</span></a>
    </div>`;

  if (live) {
    const fam = {};
    live.partidos.forEach((p) => { if (p.escanos) fam[p.familia] = (fam[p.familia] ?? 0) + p.escanos; });
    seatRows(app.querySelector("#live-seats"), [{ label: "Escaños", e: fam }], { labelWidth: 90 });
    // refresh while the page is open on election night
    clearTimeout(window.__nocheTimer);
    window.__nocheTimer = setTimeout(() => { if (location.hash.replace("#", "").split("/")[0] in { "": 1, inicio: 1 }) renderInicio(app, args); }, 60000);
  }
  seatRows(app.querySelector("#proj"), [{ label: "Proyección", e: proj.seats }], { labelWidth: 90 });
  const eids = S.elecciones;
  seatRows(app.querySelector("#hist"), eids.map((e) => ({ label: elecLabel(e).replace("Generales ", ""), e: S.nacional[e].e })), { labelWidth: 90 });
  const N = S.nacional;
  lines(app.querySelector("#part"), [
    { id: "t", name: "Final", color: "#1f4e8c", values: eids.map((e) => ({ date: dateOf(e), v: N[e].votantes / N[e].censo, label: elecLabel(e) })) },
    { id: "a2", name: "18:00", color: "#6b8fc7", values: eids.map((e) => ({ date: dateOf(e), v: N[e].av2, label: elecLabel(e) })) },
    { id: "a1", name: "14:00", color: "#a9bfe0", values: eids.map((e) => ({ date: dateOf(e), v: N[e].av1, label: elecLabel(e) })) },
  ], { height: 280, yMin: 0.2, yMax: 0.85 });
  lines(app.querySelector("#votos"), familySeries(N, elecLabel, 0.05).sort((a, b) => IDEO.indexOf(a.id) - IDEO.indexOf(b.id)), { height: 280 });
}

// latest survey with microdata: who is sure to vote, and the change from the same house's previous survey
function movilizacion(D) {
  const [casa, rows] = Object.entries(D.movilizacion).sort((a, b) => (a[1].at(-1).f < b[1].at(-1).f ? 1 : -1))[0];
  const r = rows.at(-1), p = rows.at(-2);
  const n0 = (x) => String(Math.round(x));
  const item = (k, label) => r[k] == null ? "" : `<div class="stat"><div class="v">${n0(r[k])}%${p?.[k] != null ? ` <span class="muted" style="font-size:13px;font-weight:400">${r[k] - p[k] >= 0 ? "+" : "−"}${n0(Math.abs(r[k] - p[k]))}</span>` : ""}</div><div class="k">${label}</div></div>`;
  return `<h2>¿Quién está movilizado?</h2>
    <div class="stats">${item("derecha", "votantes de PP y Vox en 2023")}${item("izquierda", "votantes de PSOE y Sumar en 2023")}${item("jovenes", "menores de 35 años")}${item("abstencion", "no votaron en 2023")}</div>
    <p class="note">Seguros de ir a votar (10 sobre 10) en la última encuesta con microdatos, ${casa} del ${fechaLarga(r.f)}; junto a cada cifra, el cambio en puntos frente a su encuesta anterior (${fechaLarga(p?.f)}). <a href="#encuestas">Ver la evolución y adónde va cada voto →</a></p>`;
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
