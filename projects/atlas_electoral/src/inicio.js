import { load, loadFresh, FAM, fmt, BUILD_AT, de100, fechaLarga } from "./data.js?v=0.2.133";
import { seatRows, lines, indexHtml, sectionIndex } from "./charts.js?v=0.2.133";
import { projectFromPolls } from "./simulador.js?v=0.2.133";
import { POLL_PARTY, pollChart } from "./encuestas.js?v=0.2.133";
import { pugnasHtml } from "./provincia.js?v=0.2.133";
import { textos, md, INDICE } from "./textos.js?v=0.2.133";
import { resultadosHtml, wireResultados } from "./resultados.js?v=0.2.133";
import { mapaMasVotado } from "./masvotado.js?v=0.2.133";
import { t, N_, loc, fix, sep } from "./i18n.js?v=0.2.133";

const ELECTION_DAY = new Date("2026-11-29T09:00:00+01:00");

const LIVE_ELECTION = "generales_2026-11";

// The model shown in "Qué dice nuestro modelo": by default the average of the models (data/modelos/index.json, written by
// pipeline/modelos/portada.py); "#inicio?modelo=p0" picks another one. Kept in the URL, never in localStorage.
// Ids before the rename of 2026-11-16 (docs/glosario.md) still work. Old "c0" (now r0) cannot be kept: c0 is now the old b0.
const OLD_ID = { "a0-logit": "k0-logit", a0: "k0", a1: "k1", a2: "k2", a3: "k3", a4: "k4", a5: "k5", a6: "k6", b0: "c0", d0: "m0" };
const modeloDeHash = () => { const id = (location.hash.match(/[?&]modelo=([\w-]+)/) || [])[1]?.toLowerCase(); return OLD_ID[id] ?? id; };
const GROUPS = {};
const ANCHO = "(min-width: 1200px)";   // the desktop grid of the front page (keep in step with style.css, "Portada: tablero")
const PAREJAS = "(min-width: 1360px)";   // and from here (content column over 1100 px) related blocks go side by side (parejas(), below)
let ultimo = null, mqListo = false;   // the reader's groups in "Forma tu mayoría", kept when another model is chosen

// Election night: the provisional count written by pipeline/noche_electoral.py. Shown only when the
// file belongs to this election (#inicio/demo shows whatever sample is on disk, for testing).
async function noche(demo) {
  try {
    const d = await loadFresh("noche/nacional.json");
    return d && (d.eleccion === LIVE_ELECTION || demo) ? d : null;
  } catch { return null; }
}

function nocheHtml(d, T) {
  const n1 = (x) => (x == null ? "·" : fix(x, 2));
  const hora = d.actualizado ? new Date(d.actualizado).toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" }) : "";
  const ps = d.partidos.filter((p) => p.escanos > 0 || p.pct >= 1).sort((a, b) => b.escanos - a.escanos || b.votos - a.votos);
  const tabla = `<table><tr><th>${t("Candidatura")}</th><th class="num">${t("Votos")}</th><th class="num">%</th><th class="num">${t("Escaños")}</th><th class="num">${t("Antes")}</th></tr>
      ${ps.map((p) => `<tr><td><i class="dot" style="background:${(FAM[p.familia] ?? FAM.otros).color}"></i>${p.siglas}</td>
        <td class="num">${fmt.format(p.votos)}</td><td class="num">${n1(p.pct)}</td><td class="num"><b>${p.escanos ?? "·"}</b></td>
        <td class="num">${p.escanos_ant ?? "·"}</td></tr>`).join("")}</table>`;
  const vars = { titulo_noche: d.eleccion === LIVE_ELECTION ? t("Resultados provisionales") : t("Prueba con datos de {e}", { e: d.eleccion }),
    escrutado: n1(d.mesas_pct ?? d.censo_pct), hora, participacion: n1(d.participacion) };
  return `<section class="card live">${md(T.noche, { vars, slots: { tabla_noche: tabla }, page: "portada" }).html}</section>`;
}

export async function renderInicio(app, args = []) {
  const [S, E, dh] = await Promise.all([load("series.json"), load("encuestas.json"), load("dhondt.json")]);
  const D = await load("dentro.json").catch(() => null);
  // the model's estimate: the chosen entry of data/modelos/index.json (default: the average), else prediccion.json
  // (pipeline/prediccion.py); without either, the mechanical projection of the poll average
  const IDX = await load("modelos/index.json").catch(() => null);
  const modelos = IDX?.modelos?.length ? IDX.modelos : null;
  let pick = modelos ? modelos.find((m) => m.id === modeloDeHash()) ?? modelos.find((m) => m.id === IDX.por_defecto) ?? modelos[0] : null;
  let [PR, DR] = pick ? await Promise.all([load(pick.archivo).catch(() => null), load(pick.draws).catch(() => null)]) : [null, null];
  if (!PR || !DR) {
    [PR, DR] = await Promise.all([load("prediccion.json").catch(() => null), load("prediccion_draws.json").catch(() => null)]);
    pick = modelos?.find((m) => m.id === "k0") ?? null;
  }
  const G = await load("geo_nuevos.json").catch(() => null);
  const [PV0, BT, EC] = await Promise.all([load("provincias_29n.json").catch(() => null), load("backtest.json").catch(() => null), load("error_comun.json").catch(() => null)]);
  // the province map and "Dónde se decide" follow the chosen model (Víctor, 2026-11-16): its own provinces file
  // (data/provincias/<id>.json, export_provincias_29n.py --todos), with the polls and candidates of provincias_29n.json;
  // a model without one falls back on «Nuestra predicción», and the map says so (condition otro_modelo)
  const PVm = pick && pick.id !== "nuestra" && pick.provincias ? await load(pick.provincias).catch(() => null) : null;
  const PV = PVm && PV0 ? juntarProvincias(PV0, PVm, pick.provincias) : PV0;
  const mayoria = PR?.mayorias.find((m) => m.nombre === "PP + Vox");
  // the summary counts the same draws as the cards below it (the site carries a sample of the model's simulations; the full
  // count in PR.mayorias can round to another figure: 92.5 against 92.3, Víctor 2026-11-16)
  const ppvoxDR = (() => {
    if (!DR) return null;
    const i = DR.partidos.indexOf("pp"), j = DR.partidos.indexOf("vox");
    if (i < 0 || j < 0) return null;
    let k = 0; DR.s[i].forEach((x, n) => { if (x + DR.s[j][n] >= 176) k++; });
    return k / DR.s[i].length;
  })();
  const days = Math.ceil((ELECTION_DAY - new Date()) / 86400000);
  const base = Object.keys(dh).sort().at(-1);
  const conv = S.convocatoria_2026;
  const esc26 = conv?.escanos?.provincias ? Object.fromEntries(conv.escanos.provincias.map((r) => [r.prov, r.escanos])) : null;
  const proj = projectFromPolls(dh[base], E.ultimo, esc26, G);
  const top = ["pp", "psoe", "vox", "sumar", "podemos", "salf"].filter((p) => E.ultimo[p] != null);

  const live = await noche(args[0] === "demo");
  const T = await textos("portada");
  const R = PR ? await resultadosHtml(PR, { modelos: pick ? modelos : null, modelo: pick?.id ?? "k0", DR }) : null;   // the results block shared with the Modelo tab (textos/resultados.md)
  // the prose is textos/portada.md; here only the figures, the conditions and the computed blocks
  const vars = {
    dias: days, ultimo_campo: PR ? fechaLarga(PR.ultimo_campo) : null, ppvox_176: ppvoxDR != null ? de100(ppvoxDR) : mayoria ? de100(mayoria.prob) : null,
    pp_primero: PR ? de100(PR.p_pp_primero) : null, pp_mas_votado: PR?.p_pp_mas_votado != null ? de100(PR.p_pp_mas_votado) : null,
    ultimo_modelo: PR ? fechaLarga(PR.fecha.slice(0, 10)) : null, simulaciones: PR ? PR.draws.toLocaleString(loc(), { useGrouping: "always" }) : null, fecha_datos: fechaLarga(BUILD_AT.slice(0, 10)),
    elecciones: BT?.elecciones, desde: BT?.desde, acierto_voto: BT ? de100(BT.horizontes[7].voto.en90) : null, acierto_escanos: BT ? de100(BT.horizontes[7].escanos.en90) : null,
    error_x15: EC ? de100(EC.escala_x15) : null, error_x08: EC ? de100(EC.escala_x08) : null,
    fuente_escanos: conv?.escanos?.fuente === "boe" ? t("según el decreto de convocatoria (BOE)") : t("calculados con la LOREG y la población oficial a 1-1-2025, a falta del decreto en el BOE"),
    cambios_escanos: (conv?.cambios_vs_2023 ?? []).map((c) => `${c.nombre} ${c.escanos_2023}→${c.escanos_2026}`).join(", "),
  };
  const flags = { antes: days > 0, hoy: days === 0, despues: days < 0, modelo: !!mayoria, provincias: !!PV, validacion: !!BT, sensibilidad: !!(BT && EC),
    movilizacion: !!D, cambios: !!conv?.cambios_vs_2023?.length };
  const slots = {
    noche: null,
    promedio: `<p class="linea">${top.map((p) => `<span class="chip"><i class="dot" style="background:${POLL_PARTY[p].c()}"></i>${POLL_PARTY[p].n} <b>${sep(E.ultimo[p])}%</b></span>`).join("")}</p>`,
    pugnas: PV ? pugnasHtml(PV, 3, T.pugna, "portada") : null,
    mov: '<div class="grid2" id="mov"></div>',
    resultados: R?.html ?? null,
    calendario: conv?.calendario ? calendario(conv) : null,
  };
  // the map of the most voted party per province (part "mapa" of portada.md): the province projection is always K0's
  const mapa = PV && T.mapa ? md(T.mapa, { flags: { otro_modelo: (pick?.id ?? "nuestra") !== "nuestra" && !PVm }, vars: { modelo: pick?.nombre ? t(pick.nombre) : "" },
    slots: { mapa_masvotado: '<div id="mapa-masvotado"></div>' }, page: "portada" }) : null;
  slots.mapa_portada = mapa?.html ? `<div class="tb-mapa">${mapa.html}</div>` : null;
  const { html, sec } = md(T.principal, { vars, flags, slots, page: "portada" });
  // desktop (>= 1200 px) with a model: the top of the page becomes a grid of cards (tablero(), below); the map moves up into it
  const ancho = !!R && matchMedia(ANCHO).matches;
  if (R) sec.find(([id]) => id === "diputados")?.[2].push(...R.sec);   // Escaños and Voto, after Resumen
  if (mapa && ancho) sec.find(([id]) => id === "diputados")?.[2].splice(1, 0, ...mapa.sub);   // the map, after Resumen (centre card)
  else if (mapa) sec.find(([id]) => id === "aire")?.[2].push(...mapa.sub);   // the map, inside "Dónde se decide"
  // index: a sticky column on wide screens, a sticky scrollable row under the menu on phones
  const IX = indexHtml(sec);
  app.innerHTML = `
    <div class="layout portada${ancho ? " tablero" : ""}">
    ${IX.aside}
    <div class="content">
    ${live ? nocheHtml(live, T) : ""}
    ${html.replace(INDICE, IX.row)}
    </div></div>`;
  // the chosen model's one-line description goes above "Resumen", on every screen (Víctor, 2026-11-17); since 2026-11-16 at the
  // end of the "Últimos datos" note, on the same line, so it does not take a row of its own (Víctor's note: space lost under it)
  const desc = app.querySelector("p.res-desc"), resH = app.querySelector("#s-resumen");
  const nota = resH?.previousElementSibling?.classList.contains("note") ? resH.previousElementSibling : null;
  if (desc && nota) { const s = document.createElement("span"); s.className = "res-desc"; s.innerHTML = desc.innerHTML; nota.append(" ", s); desc.remove(); }
  else if (desc && resH) resH.before(desc);
  if (ancho) tablero(app);
  if (ancho && matchMedia(PAREJAS).matches) parejas(app);
  sectionIndex(app);
  // crossing the 1200 or the 1360 px line redraws the page in the other layout (one listener each for the module, on the last page drawn)
  ultimo = { app, args };
  if (!mqListo) {
    mqListo = true;
    for (const q of [ANCHO, PAREJAS]) matchMedia(q).addEventListener("change", () => { if (document.body.contains(ultimo.app.querySelector(".layout.portada"))) renderInicio(ultimo.app, ultimo.args); });
  }

  if (live) {
    const fam = {};
    live.partidos.forEach((p) => { if (p.escanos) fam[p.familia] = (fam[p.familia] ?? 0) + p.escanos; });
    seatRows(app.querySelector("#live-seats"), [{ label: t("Escaños"), e: fam }], { labelWidth: 90, eid: "generales_2026-11" });
    // refresh while the page is open on election night
    clearTimeout(window.__nocheTimer);
    window.__nocheTimer = setTimeout(() => { if (location.hash.replace("#", "").split(/[/?]/)[0] in { "": 1, inicio: 1 }) renderInicio(app, args); }, 60000);
  }
  // without a model, portada.md has its own seat bar and groups (the poll projection): the same wiring
  // the map's "Bloques" view follows the groups of "Forma tu mayoría" (mapaMV is set below, once the map is drawn)
  let mapaMV = null;
  wireResultados(app, { PR, DR, est: PR?.central ?? proj.seats, conv, at: GROUPS, onGroups: () => mapaMV?.grupos() });
  // another model: the hash remembers it (replaceState, so the router does not reload the page) and the page is redrawn in place
  app.querySelector("#modelo-sel")?.addEventListener("change", async (ev) => {
    const id = ev.target.value;
    history.replaceState(null, "", `#inicio${id === IDX?.por_defecto ? "" : `?modelo=${id}`}`);
    const y = scrollY;
    await renderInicio(app, args);
    scrollTo(0, y);
    app.querySelector("#modelo-sel")?.focus({ preventScroll: true });
  });
  pollChart(app.querySelector("#chart-area"), E, { selector: false, lastTable: false, tools: false, kpi: false });
  cambioCasas(app.querySelector("#chart-area"), T);
  const mm = app.querySelector("#mapa-masvotado");
  if (mm && PV) mapaMV = await mapaMasVotado(mm, PV, { grupos: GROUPS });

}

/** Desktop front page: lifts the blocks already in the page into three cards at the top of "Qué dice nuestro modelo",
 *  left: the summary sentence, the model selector and "¿Quién llega a 176?"; centre: the map of the most voted party (from
 *  "Dónde se decide"); right: "Escaños por partido". Inside "Forma tu mayoría", two columns: the shortcuts, seat bar, groups
 *  and evolution on the left, the hemicycle with its sentence on the right (sticky, so it stays in view while parties move).
 *  Only moves nodes: the texts, ids and wiring are unchanged, and phones and tablets keep the single column in the order of the markdown. */
function tablero(app) {
  const res = app.querySelector("#s-resumen"), sec = res?.closest("section");
  if (!sec) return;
  const grid = document.createElement("div");
  grid.className = "tb-grid";
  const col = (cls) => { const c = document.createElement("div"); c.className = `tb-col ${cls}`; grid.append(c); return c; };
  const izq = col("tb-izq"), centro = col("tb-centro"), der = col("tb-der");
  sec.insertBefore(grid, res);
  const linea = res.nextElementSibling?.classList.contains("linea") ? res.nextElementSibling : null;
  const hemi = sec.querySelector(".hemi");
  izq.append(...[app.querySelector("p.res-desc"), res, linea, sec.querySelector(".res-sel"), sec.querySelector(".res-q176")].filter(Boolean));
  const mapa = app.querySelector(".tb-mapa");
  if (mapa) centro.append(mapa);
  const esc = sec.querySelector("#s-escanos");
  if (esc) {   // the h3, its caption and the first ranges list after it
    const run = [esc];
    for (let n = esc.nextElementSibling; n && !n.classList.contains("juego"); n = n.nextElementSibling) { run.push(n); if (n.classList.contains("rangos")) break; }
    der.append(...run);
  }
  // "Voto estimado" goes under the seats in the right column, which is shorter than the map: no empty space beside the map
  // (Víctor, 2026-11-17: "cuantos menos huecos menos"); a placeholder keeps its place for the poll chart (parejas(), below)
  const votos = sec.querySelector("#s-votos");
  if (votos && esc) {
    const run = [votos];
    for (let n = votos.nextElementSibling; n && n.tagName !== "DETAILS" && n.tagName !== "SECTION" && !n.classList.contains("juego"); n = n.nextElementSibling) run.push(n);
    const hueco = document.createElement("div");
    hueco.className = "tb-hueco-voto";
    votos.before(hueco);
    der.append(...run);
  }
  const juego = hemi?.closest(".juego");
  if (juego) {   // everything after the title goes into the left column, the hemicycle into the right one
    const jg = document.createElement("div"), ji = document.createElement("div"), jd = document.createElement("div");
    jg.className = "jg-grid"; ji.className = "jg-izq"; jd.className = "jg-der";
    const h = juego.querySelector(":scope > .h4");
    ji.append(...[...juego.children].filter((n) => n !== h && n !== hemi && !n.classList.contains("juego-tag")));
    jd.append(hemi);
    jg.append(ji, jd);
    juego.append(jg);
  }
  for (const c of [centro, der]) if (!c.childElementCount) c.remove();
  grid.dataset.cols = grid.childElementCount;
}

/** Wide front page (content column over 1100 px): related blocks side by side instead of one very wide block. "Voto estimado"
 *  beside the poll average (its sentence, the line of figures, the chart and its links come up from "El modelo explicado");
 *  "El modelo explicado" beside "Dónde se decide"; the calendar beside the tiles. Only moves nodes (sections keep their ids,
 *  so the index still finds them). */
function parejas(app) {
  const par = (antes, izq, der, cls = "") => {
    if (!antes || !izq.length || !der.length) return;
    const p = document.createElement("div"), a = document.createElement("div"), b = document.createElement("div");
    p.className = `par ${cls}`; a.className = "par-a"; b.className = "par-b";
    antes.before(p); a.append(...izq); b.append(...der); p.append(a, b);
  };
  const run = (h, stop) => { const r = [h]; for (let n = h.nextElementSibling; n && !stop(n); n = n.nextElementSibling) r.push(n); return r; };
  const votos = app.querySelector("#s-votos"), chart = app.querySelector("#chart-area"), hueco = app.querySelector(".tb-hueco-voto");
  if (hueco && chart) {   // "Voto estimado" went up into the tablero: the poll chart takes its place, at full width
    const linea = chart.previousElementSibling?.classList.contains("linea") ? chart.previousElementSibling : null;
    const frase = linea?.previousElementSibling?.tagName === "P" ? linea.previousElementSibling : null;
    const nota = chart.nextElementSibling?.classList.contains("note") ? chart.nextElementSibling : null;
    hueco.append(...[frase, linea, chart, nota].filter(Boolean));
  } else if (votos && chart) {
    const izq = run(votos, (n) => n.tagName === "DETAILS" || n.tagName === "SECTION" || n.classList.contains("par"));
    const linea = chart.previousElementSibling?.classList.contains("linea") ? chart.previousElementSibling : null;
    const frase = linea?.previousElementSibling?.tagName === "P" ? linea.previousElementSibling : null;
    const nota = chart.nextElementSibling?.classList.contains("note") ? chart.nextElementSibling : null;
    par(votos, izq, [frase, linea, chart, nota].filter(Boolean), "par-voto");
  }
  // two short text sections side by side: "El modelo explicado" (its chart went up beside "Voto estimado") and "Dónde se decide"
  const voto = app.querySelector("#s-voto"), aire = app.querySelector("#s-aire");
  if (voto && aire && !aire.querySelector("#mapa-masvotado")) par(voto, [voto], [aire], "par-secciones");
  const cal = app.querySelector("table.cal"), tiles = app.querySelector("#s-calendario .tiles");
  if (cal && tiles) par(cal, [cal], [tiles], "par-cal");
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
  convocatoria_boe: N_("Convocatoria en el BOE"),
  voto_correo_solicitud_fin: N_("Último día para pedir el voto por correo"),
  consulta_censo: N_("Consulta del censo y reclamaciones"),
  presentacion_candidaturas: N_("Presentación de candidaturas"),
  proclamacion_candidaturas: N_("Proclamación de candidaturas"),
  cera_envio_papeletas: N_("Exterior: envío de papeletas"),
  voto_correo_envio_documentacion: N_("Voto por correo: envío de la documentación"),
  campana_electoral: N_("Campaña electoral"),
  cera_deposito_urna: N_("Exterior: voto en urna en consulados"),
  cera_voto_correo_fin: N_("Exterior: último día para enviar el voto"),
  voto_correo_entrega_fin: N_("Último día para votar por correo en Correos"),
  jornada_reflexion: N_("Jornada de reflexión"),
  jornada_electoral: N_("Votación"),
};

function calendario(conv) {
  const f = (d) => new Date(d).toLocaleDateString(loc(), { day: "numeric", month: "short" });
  const today = new Date().toISOString().slice(0, 10);
  const start = (c) => (c.fecha_fin ? c.fecha_inicio : c.fecha);
  const rows = conv.calendario.filter((c) => HITOS[c.clave]).sort((a, b) => start(a).localeCompare(start(b))).map((c) => {
    const end = c.fecha_fin ?? c.fecha;
    const when = c.fecha_fin ? `${f(c.fecha_inicio)} – ${f(c.fecha_fin)}` : f(c.fecha);
    return `<tr class="${end < today ? "past" : ""}"><td style="width:150px">${when}</td><td>${t(HITOS[c.clave])}</td>
      <td class="note">${c.fuente === "calculado" ? t("calculado (LOREG)") : c.fuente}</td></tr>`;
  });
  return `<table class="cal">${rows.join("")}</table>`;
}


// "Cada encuestadora comparada consigo misma" (part cambio_casas of portada.md; Claude, 2026-11-15): below the poll chart, from
// data/cambio_casas.json (pipeline/cambio_casas.py). The three parties whose direction is most one-sided get a phrase; the
// table per pollster is folded. A description of the data, not a forecast.
const CC_PARTIES = ["pp", "psoe", "vox", "sumar", "podemos"];
async function cambioCasas(chart, T) {
  if (!chart || !T.cambio_casas) return;
  const C = await load("cambio_casas.json").catch(() => null);
  if (!C?.casas?.length) return;
  const name = (f) => POLL_PARTY[f]?.n ?? f;
  const corta = (d) => new Date(d).toLocaleDateString(loc(), { day: "numeric", month: "short" }).replace(".", "");   // "8 oct", "8 Oct"
  const R = CC_PARTIES.filter((f) => C.resumen[f]).map((f) => ({ f, ...C.resumen[f], lado: Math.max(C.resumen[f].bajan, C.resumen[f].suben) / C.resumen[f].n }))
    .sort((a, b) => b.lado - a.lado).slice(0, 3);
  const trozos = R.map((r) => r.bajan > r.suben ? t("{p} baja en {a} de {n}", { p: name(r.f), a: r.bajan, n: r.n })
    : r.suben > r.bajan ? t("{p} sube en {a} de {n}", { p: name(r.f), a: r.suben, n: r.n }) : t("{p} sube en tantas como baja", { p: name(r.f) }));
  const frase = trozos.length > 1 ? `${trozos.slice(0, -1).join(", ")} ${t("y")} ${trozos.at(-1)}` : trozos[0];
  const cel = (v) => v == null ? '<td class="num">·</td>' : `<td class="num" style="color:${v > 0 ? "var(--pos, #1a7f37)" : v < 0 ? "var(--neg, #c62828)" : "inherit"}">${v > 0 ? "+" : v < 0 ? "−" : ""}${fix(Math.abs(v), 1)}</td>`;
  const tabla = `<details class="card cc-tabla"><summary>${t("Cambio por encuestadora, en puntos")}</summary><div class="scrollx"><table class="nosort">
    <tr><th>${t("Encuestadora")}</th><th>${t("Antes")}</th><th>${t("Ahora")}</th>${CC_PARTIES.map((f) => `<th class="num">${name(f)}</th>`).join("")}</tr>
    ${C.casas.map((c) => `<tr><td>${c.casa}</td><td>${corta(c.antes)}</td><td>${corta(c.ahora)}</td>${CC_PARTIES.map((f) => cel(c.cambio[f])).join("")}</tr>`).join("")}
    </table></div></details>`;
  const box = document.createElement("div");
  box.className = "cc";
  box.innerHTML = md(T.cambio_casas, { vars: { frase_cambio: frase, n_casas: C.casas.length }, slots: { tabla_cambio: tabla }, page: "portada" }).html;
  chart.after(box);
}

// a model's provinces (no polls, no candidates) completed from provincias_29n.json; drawsFile: its draws for "Cambios desde 2023"
function juntarProvincias(base, mod, archivo) {
  const B = Object.fromEntries(base.provincias.map((p) => [p.prov, p]));
  return { ...mod, drawsFile: archivo.replace(/\.json$/, "_draws.json"),
    provincias: mod.provincias.map((p) => ({ ...p, encuestas: B[p.prov]?.encuestas ?? [], candidaturas: B[p.prov]?.candidaturas ?? [], s23: p.s23 ?? B[p.prov]?.s23, v23: p.v23 ?? B[p.prov]?.v23 })) };
}
