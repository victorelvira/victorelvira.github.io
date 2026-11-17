const d3 = window.d3; // vendored UMD build, loaded by the entry page
const topojson = window.topojson;
import { load, META, fmt, pct, fechaLarga, showTip, hideTip } from "./data.js?v=0.2.145";
import { fam } from "./charts.js?v=0.2.145";
import { getGeo, rewind } from "./mapa.js?v=0.2.145";
import { addZoom } from "./zoom.js?v=0.2.145";
import { textos, md } from "./textos.js?v=0.2.145";
import { t as tr, N_, sep } from "./i18n.js?v=0.2.145";

// The Senate (tab "Senado", route #senado, #senado/2023; prose in textos/senado.md). Two views of the same layout: the 29N
// forecast (prediccion_senado.json, pipeline/prediccion_senado.py) and the July 2023 result (senado_2023.json,
// pipeline/export_senado_2023.py, which also carries the party of every 2026 list, the joint lists and the island map).

// parties of the Senate page: names and colours (vocabulary colours where the party is a family; its own otherwise)
const PARTY = {
  pp: ["PP", null], psoe: ["PSOE", null], vox: ["Vox", null], erc: ["ERC", null], bildu: ["EH Bildu", null], pnv: ["PNV", null],
  junts: ["Junts", null], bng: ["BNG", null], cc: ["CC", null], upn: ["UPN", "#1f4e8c"], sumar: ["Frente Amplio", "#d6246e"],
  asg: ["ASG", "#2f8f5b"], ahi: ["AHI", "#b08d57"], sy: ["Soria ¡Ya!", "#7a5c2e"], "teruel existe": ["Teruel Existe", "#3c7d3a"],
  psoe_sumar: ["PSOE-Sumar (Eivissa-Formentera)", "#ef6a73"], podemos: ["Podemos", "#6b2e68"], otros: [N_("Otros"), "#9e9e9e"], nd: [N_("Sin asignar"), null],
};
const pname = (k, y) => (k === "sumar" && y === "2023" ? "Sumar" : k === "sumar" ? "Frente Amplio, Más Madrid, Compromís" : k === "otros" || k === "nd" ? tr(PARTY[k][0]) : PARTY[k]?.[0] ?? k.toUpperCase());
const pcolor = (k) => (k === "nd" ? "var(--nodata)" : PARTY[k]?.[1] ?? fam(k).color);
// left to right in the hemicycle
const ORDER = ["bildu", "erc", "sumar", "podemos", "bng", "psoe_sumar", "psoe", "pnv", "cc", "asg", "ahi", "sy", "teruel existe", "nd", "junts", "upn", "pp", "vox", "otros"];
const ord = (k) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length - 1);
// three-letter labels of the 60 constituencies (2026; 073 is Eivissa-Formentera in 2023)
const ABBR = {
  "019": "ALA", "029": "ALB", "039": "ALI", "049": "ALM", "059": "ÁVI", "069": "BAD", "071": "MLL", "072": "MEN", "073": "EIV", "074": "FOR",
  "089": "BCN", "099": "BUR", "109": "CÁC", "119": "CÁD", "129": "CAS", "139": "CRE", "149": "COR", "159": "ACO", "169": "CUE", "179": "GIR",
  "189": "GRA", "199": "GUA", "209": "GIP", "219": "HUE", "229": "HSC", "239": "JAÉ", "249": "LEÓ", "259": "LLE", "269": "RIO", "279": "LUG",
  "289": "MAD", "299": "MÁL", "309": "MUR", "319": "NAV", "329": "OUR", "339": "AST", "349": "PAL", "351": "GCA", "352": "LZT", "353": "FTV",
  "369": "PON", "379": "SAL", "384": "TFE", "385": "LPA", "386": "GOM", "387": "HIE", "399": "CAN", "409": "SEG", "419": "SEV", "429": "SOR",
  "439": "TAR", "449": "TER", "459": "TOL", "469": "VAL", "479": "VLL", "489": "BIZ", "499": "ZAM", "509": "ZAR", "519": "CEU", "529": "MEL",
};
// names of the communities in prediccion_senado.json (designated senators) -> keys of META.ccaa
const CCAA_KEY = { "Andalucía": "AN", "Aragón": "AR", "Asturias": "AS", "Illes Balears": "IB", "Canarias": "CN", "Cantabria": "CB", "Castilla-La Mancha": "CM",
  "Castilla y León": "CL", "Cataluña": "CT", "Extremadura": "EX", "Galicia": "GA", "Madrid": "MD", "Navarra": "NC", "País Vasco": "PV", "Región de Murcia": "MC",
  "La Rioja": "RI", "Comunitat Valenciana": "VC" };
const ccaaOf = (prov) => Object.keys(META.ccaa).find((k) => META.ccaa[k].provs.includes(prov));
const de100 = (n, of) => Math.round((100 * n) / of);
const num = (x) => sep(x);
const SHOW = 6;   // party rows before "Ver más"

export async function renderSenado(app, args = []) {
  const modo = args[0] === "2023" ? "2023" : "2026";
  const [T, P, H] = await Promise.all([textos("senado"), load("prediccion_senado.json"), load("senado_2023.json")]);
  const D = modo === "2026" ? data2026(P, H) : data2023(H);
  const sens = (s) => P.sensibilidad.find((x) => x.supuesto.includes(s) || x.supuesto.endsWith(s.trim())) ?? {};
  const sims = d3.format(",")(P.draws);
  const v23 = P.validacion.find((v) => v.eleccion === "2023-07");
  const pr = P.probabilidades[`mayoria_${P.camara}`];
  const vars = { simulaciones: sims, fecha: fechaLarga(P.fecha.slice(0, 10)), camara: P.camara, mayoria: P.mayoria, electos_total: P.electos_total,
    designados_total: P.designados_total, p_base: de100(pr.pp, 1), p_2023: de100(sens("July 2023").p_pp, 1), pp_2023: sens("July 2023").pp_p50,
    offset_pp: `${Math.round(100 * (Math.exp(P.parametros.alpha.pp) - 1))}%`, offset_2023: "0%",
    p_lambda05: de100(sens("lambda = 0.5").p_pp, 1), p_lambda1: de100(sens("lambda = 1").p_pp, 1), lambda: `${Math.round(100 * P.parametros.lambda.media)}%`,
    p_omega0: de100(P.sensibilidad.find((x) => x.supuesto.endsWith("omega = 0"))?.p_pp, 1), p_omega05: de100(sens("omega = 0.5").p_pp, 1),
    p_andalucia: de100(sens("Andaluc").p_pp, 1), aciertos_2023: v23?.aciertos };
  const cab = `<div class="sn-cab">
    <div class="sn-sec"><h2 class="sn-h">${md(T[`titulo_${modo}`], { page: "senado" }).html.replace(/<\/?p[^>]*>/g, "")}</h2>
    <div class="seg" id="sn-modo"><button data-m="2026"${modo === "2026" ? ' class="on"' : ""}>${tr("Proyección 2026")}</button><button data-m="2023"${modo === "2023" ? ' class="on"' : ""}>${tr("Resultados 2023")}</button></div></div></div>`;
  const panel = `<div class="sn-grid">
    <div class="card sn-izq">${md(T[`titular_${modo}`], { vars: D.vars, page: "senado" }).html}
      <div class="sn-hemi"></div><div class="legend sn-hemi-leg"></div><div class="sn-tabla"></div>
      ${md(T[`nota_${modo}`], { vars: D.vars, flags: D.flags, page: "senado" }).html}
      <p class="note sn-fuente">${D.fuente}</p></div>
    <div class="card sn-centro">${md(T[`mapa_${modo}`], { page: "senado" }).html}<div class="mapwrap sn-mapa"><svg role="img" aria-label="${tr("Mapa de circunscripciones del Senado")}"></svg></div><div class="legend sn-mapa-leg"></div></div>
    <div class="card sn-der">${md(T[`comunidades_${modo}`], { page: "senado" }).html}<div class="sn-ccaa"></div></div>
  </div>`;
  const { html } = md(T.principal, { vars, slots: { cabecera: cab, panel, coaliciones: '<div id="sn-coal"></div>' }, page: "senado" });
  app.innerHTML = `<div class="sn">${html}</div>`;
  const $ = (s) => app.querySelector(s);
  app.querySelectorAll("#sn-modo button").forEach((b) => b.onclick = () => { location.hash = b.dataset.m === "2023" ? "#senado/2023" : "#senado"; });

  hemiciclo($(".sn-hemi"), $(".sn-hemi-leg"), D);
  tabla($(".sn-tabla"), D);
  const sel = { circ: null };
  const mapa = await mapaCirc($(".sn-mapa"), $(".sn-mapa-leg"), D, sel, (c) => ccaaList.mark(c));
  const ccaaList = comunidades($(".sn-ccaa"), D, (k) => mapa.mark(k));
  coaliciones($("#sn-coal"), T, P, H);
}

// ----------------------------------------------------------------------------- data of each view
// splits of the forecast name lists by their siglas ("PP 3 · SDP (PSOE-IU-MS) 1"); each list's party from senado_2023.json
function parseSplit(s, circ, H) {
  return s.split(" · ").map((x) => { const m = x.match(/^(.*) (\d+)$/); return { siglas: m[1], n: +m[2], partido: H.partido_2026[circ]?.[m[1]] ?? "otros" }; });
}
function leaderOf(parts) {
  const by = {};
  for (const p of parts) by[p.partido] = (by[p.partido] ?? 0) + p.n;
  const [k, n] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  return { k, n, tie: Object.values(by).filter((x) => x === n).length > 1, by };
}

function data2026(P, H) {
  const pp = P.partidos.pp, pr = P.probabilidades[`mayoria_${P.camara}`];
  const keys = Object.keys(P.partidos).filter((k) => P.partidos[k].total.p50 > 0 || P.partidos[k].electos.p95 > 0);
  const seats = keys.map((k) => ({ k, e: P.partidos[k].electos.p50, d: P.partidos[k].designados }));
  const sin = P.camara - d3.sum(seats, (s) => s.e + s.d);
  if (sin > 0) seats.push({ k: "nd", e: sin, d: 0 });
  const circs = P.circunscripciones.map((c) => {
    const reps = c.repartos.map((r) => ({ ...r, parts: parseSplit(r.reparto, c.circ, H), de100: de100(r.veces, P.draws) }));
    return { circ: c.circ, nombre: c.nombre, escanos: c.escanos, reps, lead: leaderOf(reps[0].parts), seguro: reps[0].veces / P.draws };
  });
  const des = {};
  for (const d of P.designados) des[CCAA_KEY[d.nombre]] = d;
  return {
    modo: "2026", total: P.camara, mayoria: P.mayoria, seats, circs, des, draws: P.draws,
    filas: Object.entries(P.partidos).map(([k, x]) => ({ k, ...x })).sort((a, b) => b.total.p50 - a.total.p50 || b.total.media - a.total.media),
    vars: { pp_total: pp.total.p50, pp_lo: pp.total.p05, pp_hi: pp.total.p95, pp_electos: pp.electos.p50, pp_designados: pp.designados, camara: P.camara,
      mayoria: P.mayoria, p_pp: de100(pr.pp, 1), p_pp_vox: de100(pr.pp_vox, 1), simulaciones: d3.format(",")(P.draws),
      sin_asignar: sin, electos_total: P.electos_total, designados_total: P.designados_total },
    flags: { sin_asignar: sin > 0 },
    fuente: tr("Fuente: modelo propio sobre las encuestas; listas proclamadas en el BOE (BOE-A-2026-23103 y su corrección BOE-A-2026-23383)."),
  };
}

function data2023(H) {
  const N = H.nacional;
  const seats = Object.entries(N.partidos).filter(([, x]) => x.electos).map(([k, x]) => ({ k, e: x.electos, d: 0 }));
  const circs = H.circunscripciones.map((c) => {
    const parts = c.listas.filter((l) => l.electos).map((l) => ({ siglas: l.siglas, n: l.electos, partido: l.partido }));
    return { circ: c.circ, nombre: c.nombre, escanos: c.escanos, listas: c.listas, lead: leaderOf(parts), seguro: 1 };
  });
  const v = (x) => fmt.format(x);
  return {
    modo: "2023", total: H.electos, mayoria: null, seats, circs, des: {},
    filas: Object.entries(N.partidos).map(([k, x]) => ({ k, ...x })).filter((x) => x.electos || x.votos > 100000),
    vars: { pp_electos23: N.partidos.pp.electos, psoe_electos23: N.partidos.psoe.electos, electos23: H.electos, designados_no: H.designados_no,
      participacion: pct(N.votantes / N.censo), blancos: `${v(N.blancos)} (${pct(N.blancos / N.votantes)})`, nulos: `${v(N.nulos)} (${pct(N.nulos / N.votantes)})` },
    flags: {},
    fuente: tr("Fuente: Ministerio del Interior (Infoelectoral), elecciones al Senado del 23 de julio de 2023."),
  };
}

// ----------------------------------------------------------------------------- hemicycle and table
function hemiciclo(el, leg, D) {
  const n = D.total;
  const rows = n > 240 ? 10 : 9, W = 560, H = 300, cx = W / 2, cy = H - 14, R1 = 268, R0 = 100;
  const radii = d3.range(rows).map((r) => R0 + ((R1 - R0) * r) / (rows - 1));
  const per = radii.map((r) => Math.round((n * r) / d3.sum(radii)));
  per[rows - 1] += n - d3.sum(per);
  const pts = [];
  radii.forEach((r, ri) => { for (let j = 0; j < per[ri]; j++) { const a = Math.PI - (Math.PI * j) / (per[ri] - 1); pts.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }); } });
  pts.sort((p, q) => q.a - p.a || p.y - q.y);
  // seat list, left to right: each party's elected, then its designated
  const seq = [];
  for (const s of [...D.seats].sort((a, b) => ord(a.k) - ord(b.k))) {
    for (let i = 0; i < s.e; i++) seq.push({ k: s.k, des: false });
    for (let i = 0; i < s.d; i++) seq.push({ k: s.k, des: true });
  }
  const rDot = Math.min(7, ((R1 - R0) / (rows - 1)) * 0.42);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
    .attr("aria-label", D.modo === "2026" ? tr("Hemiciclo del Senado, escenario central") : tr("Senadores electos en 2023"));
  svg.selectAll("circle").data(pts.map((p, i) => ({ ...p, ...(seq[i] ?? { k: "nd" }) }))).join("circle")
    .attr("cx", (p) => p.x).attr("cy", (p) => p.y).attr("r", rDot)
    .attr("fill", (p) => pcolor(p.k)).attr("fill-opacity", (p) => (p.des ? 0.35 : 1))
    .attr("stroke", (p) => (p.des ? pcolor(p.k) : "none")).attr("stroke-width", 1.2)
    .on("mousemove", (ev, p) => {
      const s = D.seats.find((x) => x.k === p.k);
      showTip(`<b>${pname(p.k, D.modo)}</b>${p.k === "nd" ? `<div class="muted">${tr("escaños que las medianas no reparten")}</div>` : `<div class="row"><span>${tr("Electos")}</span><span>${s.e}</span></div>${D.modo === "2026" ? `<div class="row"><span>${tr("Designados")}</span><span>${s.d}</span></div>` : ""}`}`, ev);
    }).on("mouseleave", hideTip);
  if (D.mayoria) {
    svg.append("line").attr("x1", cx).attr("x2", cx).attr("y1", cy - R1 - 10).attr("y2", cy - R0 + 18).attr("stroke", "var(--ink)").attr("stroke-dasharray", "3 3");
    svg.append("text").attr("x", cx).attr("y", cy - 26).attr("text-anchor", "middle").attr("class", "t-m").attr("font-weight", 600).attr("fill", "var(--ink)").text(tr("Mayoría: {n}", { n: D.mayoria }));
  } else {
    svg.append("text").attr("x", cx).attr("y", cy - 26).attr("text-anchor", "middle").attr("class", "t-m").attr("font-weight", 600).attr("fill", "var(--ink)").text(tr("{n} electos", { n: D.total }));
  }
  const shown = [...D.seats].filter((s) => s.e + s.d > 0).sort((a, b) => b.e + b.d - (a.e + a.d)).filter((s) => s.k !== "nd");
  leg.innerHTML = shown.map((s) => `<span><i class="sw" style="background:${pcolor(s.k)}"></i>${pname(s.k, D.modo)} ${s.e + s.d}</span>`).join("")
    + (D.modo === "2026" ? `<span><i class="sw sn-sw-des"></i>${tr("designados (claro)")}</span>` : "");
}

function tabla(el, D) {
  const dot = (k) => `<i class="dot" style="background:${pcolor(k)}"></i>`;
  const rows = D.modo === "2026"
    ? D.filas.map((f) => `<tr><td>${dot(f.k)}${pname(f.k, "2026")}</td><td class="num">${f.electos.p50}</td><td class="num muted">${tr("{a} a {b}", { a: f.electos.p05, b: f.electos.p95 })}</td><td class="num">${f.designados}</td><td class="num"><b>${f.total.p50}</b></td></tr>`)
    : D.filas.map((f) => `<tr><td>${dot(f.k)}${pname(f.k, "2023")}</td><td class="num"><b>${f.electos}</b></td><td class="num">${fmt.format(f.votos)}</td></tr>`);
  const head = D.modo === "2026"
    ? `<tr><th>${tr("Partido")}</th><th class="num">${tr("Electos")}</th><th class="num" data-tip="${tr("En 9 de cada 10 simulaciones")}">${tr("Rango")}</th><th class="num">${tr("Designados")}</th><th class="num">${tr("Total")}</th></tr>`
    : `<tr><th>${tr("Partido")}</th><th class="num">${tr("Escaños")}</th><th class="num" data-tip="${tr("Voto del candidato más votado de cada lista, sumado")}">${tr("Votos")}</th></tr>`;
  const extra = rows.length - SHOW;
  el.innerHTML = `<div class="scrollx"><table class="nosort sn-t">${head}${rows.map((r, i) => (i >= SHOW ? r.replace("<tr>", '<tr class="sn-mas" hidden>') : r)).join("")}</table></div>
    ${extra > 0 ? `<button class="play sn-ver">${tr("Ver {n} más", { n: extra })}</button>` : ""}`;
  const b = el.querySelector(".sn-ver");
  if (b) b.onclick = () => { const open = b.dataset.open !== "1"; b.dataset.open = open ? "1" : ""; el.querySelectorAll(".sn-mas").forEach((r) => r.hidden = !open); b.textContent = open ? tr("Ver menos") : tr("Ver {n} más", { n: extra }); };
}

// ----------------------------------------------------------------------------- map of the constituencies
// provinces merged from the municipalities; Baleares and Canarias split into islands with the Senate's municipality -> island map
let circGeo;
async function circFeatures(H) {
  if (circGeo) return circGeo;
  const [topo, { path, borders }] = await Promise.all([load("municipios.topo.json"), getGeo()]);
  const by = d3.group(topo.objects.municipalities.geometries, (g) => H.islas[g.id] ?? `${String(g.id).slice(0, 2)}9`);
  const features = [...by].map(([c, gs]) => rewind({ type: "Feature", id: c, geometry: topojson.merge(topo, gs) }));
  // 2023: Eivissa and Formentera were one constituency
  const eivFor = rewind({ type: "Feature", id: "073", geometry: topojson.merge(topo, [...by.get("073"), ...by.get("074")]) });
  circGeo = { features, eivFor, path, borders };
  return circGeo;
}
// collision of rectangles (pills are wide and short, so circles would push them too far apart vertically): each overlapping pair
// is separated along the axis where it overlaps least
function rectCollide(gap) {
  let nodes;
  const force = () => {
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y, ox = (a.w + b.w) / 2 + gap - Math.abs(dx), oy = (a.h + b.h) / 2 + gap - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) { const m = (ox / 2) * (dx < 0 ? -1 : 1); a.x -= m; b.x += m; } else { const m = (oy / 2) * (dy < 0 ? -1 : 1); a.y -= m; b.y += m; }
    }
  };
  force.initialize = (n) => { nodes = n; };
  return force;
}
const textOn = (c) => (d3.hsl(c).l > 0.62 || /^#ff|^#ffd|^#ffb/i.test(c) ? "#111" : "#fff");

async function mapaCirc(wrap, leg, D, sel, onPick) {
  const H = await load("senado_2023.json");
  const G = await circFeatures(H);
  const feats = D.modo === "2023" ? [...G.features.filter((f) => f.id !== "073" && f.id !== "074"), G.eivFor] : G.features;
  const byC = Object.fromEntries(D.circs.map((c) => [c.circ, c]));
  const base = getComputedStyle(document.documentElement).getPropertyValue("--nodata").trim();
  const fill = (c) => {
    if (!c) return base;
    const col = c.lead.tie ? base : pcolor(c.lead.k);
    return d3.interpolateLab(base, col)(D.modo === "2023" ? 0.85 : 0.3 + 0.7 * Math.max(0, (c.seguro - 0.3) / 0.7));
  };
  const svg = d3.select(wrap).select("svg");
  const [[x0, y0], [x1, y1]] = G.path.bounds({ type: "FeatureCollection", features: feats }), pad = 10;
  svg.attr("viewBox", [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad].join(" "));
  const g = svg.append("g");
  const paths = g.selectAll("path.sn-c").data(feats).join("path").attr("class", "sn-c").attr("d", G.path).attr("fill", (f) => fill(byC[f.id]));
  g.append("path").attr("class", "prov").attr("d", G.borders);
  const hl = g.append("path").attr("class", "pv-hl");
  // pills keep a readable size on screen: scaled up with the map's reduction, up to 1.35 times (phones zoom in with the buttons)
  const K = Math.max(1, Math.min(1.35, (x1 - x0 + 2 * pad) / (wrap.clientWidth || 600)));
  // pills: abbreviation and the leader's seats over the constituency's seats, pushed apart where they would overlap
  const pills = feats.filter((f) => byC[f.id]).map((f) => {
    const c = byC[f.id], [x, y] = G.path.centroid(f);
    const lab = `${ABBR[f.id] ?? f.id} ${c.lead.n}/${c.escanos}`;
    return { id: f.id, c, x, y, x0: x, y0: y, lab, w: (lab.length * 7.4 + 10) * K, h: 17 * K };
  });
  const sim = d3.forceSimulation(pills).force("x", d3.forceX((p) => p.x0).strength(0.4)).force("y", d3.forceY((p) => p.y0).strength(0.4))
    .force("c", rectCollide(1.5 * K)).stop();
  for (let i = 0; i < 160; i++) sim.tick();
  for (const p of pills) {   // inside the frame
    p.x = Math.max(x0 - pad + p.w / 2, Math.min(x1 + pad - p.w / 2, p.x));
    p.y = Math.max(y0 - pad + p.h / 2, Math.min(y1 + pad - p.h / 2, p.y));
  }
  const gp = g.append("g").attr("class", "sn-pills");
  gp.selectAll("line").data(pills.filter((p) => Math.hypot(p.x - p.x0, p.y - p.y0) > 9 * K)).join("line")
    .attr("x1", (p) => p.x0).attr("y1", (p) => p.y0).attr("x2", (p) => p.x).attr("y2", (p) => p.y).attr("stroke", "var(--ink-3)").attr("stroke-width", 0.7);
  const pg = gp.selectAll("g").data(pills).join("g").attr("transform", (p) => `translate(${p.x},${p.y}) scale(${K})`);
  pg.append("rect").attr("x", (p) => -p.w / K / 2).attr("y", (p) => -p.h / K / 2).attr("width", (p) => p.w / K).attr("height", (p) => p.h / K).attr("rx", 8.5)
    .attr("fill", (p) => (p.c.lead.tie ? "var(--surface)" : pcolor(p.c.lead.k))).attr("stroke", (p) => (p.c.lead.tie ? "var(--ink-3)" : "none"));
  pg.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").attr("class", "sn-pill-t")
    .attr("fill", (p) => (p.c.lead.tie ? "var(--ink)" : textOn(pcolor(p.c.lead.k)))).text((p) => (p.c.lead.tie ? `${ABBR[p.id]} ${p.c.lead.n}-${p.c.lead.n}` : p.lab));

  const tip = (c) => {
    const isla = /^(07|35|38)/.test(c.circ) ? `<div class="muted">${tr("La isla es su propia circunscripción.")}</div>` : "";
    if (D.modo === "2023") {
      return `<b>${c.nombre}</b><div class="muted">${c.escanos} ${c.escanos === 1 ? tr("senador") : tr("senadores")}</div>${c.listas.slice(0, 5).map((l) =>
        `<div class="row"><span><i class="dot" style="background:${pcolor(l.partido)}"></i>${l.siglas}</span><span>${fmt.format(l.votos)}${l.electos ? ` · <b>${l.electos}</b>` : ""}</span></div>`).join("")}<div class="muted">${tr("votos del candidato más votado · escaños")}</div>${isla}`;
    }
    return `<b>${c.nombre}</b><div class="muted">${c.escanos} ${c.escanos === 1 ? tr("senador") : tr("senadores")} · ${tr("repartos más frecuentes")}</div>${c.reps.map((r) =>
      `<div class="row"><span>${r.parts.map((p) => `<i class="dot" style="background:${pcolor(p.partido)}"></i>${pname(p.partido, "2026").split(",")[0]} ${p.n}`).join(" · ")}</span><span style="white-space:nowrap">${tr("{n} de cada {de}", { n: r.de100, de: 100 })}</span></div>`).join("")}<div class="muted">${[...new Set(c.reps[0].parts.map((p) => p.siglas))].join(" · ")}</div>${isla}`;
  };
  const show = (ev, id) => { const c = byC[id]; if (c) showTip(tip(c), ev); };
  paths.on("mouseenter", function () { hl.attr("d", this.getAttribute("d")); }).on("mousemove", (ev, f) => show(ev, f.id))
    .on("mouseleave", () => { hideTip(); hl.attr("d", null); }).on("click", (ev, f) => { show(ev, f.id); onPick(f.id); });
  pg.style("cursor", "pointer").on("mousemove", (ev, p) => show(ev, p.id)).on("mouseleave", hideTip).on("click", (ev, p) => { show(ev, p.id); onPick(p.id); });
  const zoom = addZoom(svg, g, wrap, { max: 8 });
  zoom.filter((ev) => !ev.touches || ev.touches.length > 1);   // one finger scrolls the page on phones; two fingers zoom

  const present = [...new Set(D.circs.filter((c) => !c.lead.tie).map((c) => c.lead.k))].sort((a, b) => ord(a) - ord(b));
  leg.innerHTML = present.map((k) => `<span><i class="sw" style="background:${pcolor(k)}"></i>${pname(k, D.modo)}</span>`).join("")
    + (D.circs.some((c) => c.lead.tie) ? `<span><i class="sw sn-sw-empate"></i>${tr("empate a 2")}</span>` : "");
  return {
    // highlight the constituencies of a community (from the list on the right)
    mark(ccaa) {
      const provs = ccaa ? META.ccaa[ccaa].provs : [];
      paths.classed("sn-off", (f) => ccaa && !provs.includes(f.id.slice(0, 2)));
    },
  };
}

// ----------------------------------------------------------------------------- communities
function comunidades(el, D, onPick) {
  const rows = Object.entries(META.ccaa).map(([k, cc]) => {
    const cs = D.circs.filter((c) => cc.provs.includes(c.circ.slice(0, 2)));
    const by = {};
    for (const c of cs) for (const [p, n] of Object.entries(c.lead.by)) by[p] = (by[p] ?? 0) + n;
    const seats = d3.sum(cs, (c) => c.escanos);
    const [lk, ln] = Object.entries(by).sort((a, b) => b[1] - a[1])[0] ?? ["otros", 0];
    const tie = Object.values(by).filter((x) => x === ln).length > 1;
    return { k, n: cc.n, seats, by, lk, ln, tie, des: D.des[k]?.n ?? 0, desRep: D.des[k]?.reparto };
  }).filter((r) => r.seats).sort((a, b) => b.seats - a.seats || a.n.localeCompare(b.n, "es"));
  el.innerHTML = `<div class="sn-cl">${rows.map((r) => {
    const parts = Object.entries(r.by).filter(([, n]) => n).sort((a, b) => ord(a[0]) - ord(b[0]));
    const desTip = r.desRep ? Object.entries(r.desRep).map(([p, n]) => `${pname(p, "2026")} ${n}`).join(", ") : "";
    return `<button class="sn-cr" data-k="${r.k}">
      <span class="sn-cn">${r.n}</span>
      <span class="sn-cv">${r.tie ? tr("empate a {n}", { n: r.ln }) : `${pname(r.lk, D.modo).split(",")[0]} <b>${r.ln}</b>/${r.seats}`}${r.des ? `<small data-tip="${tr("Designados por su parlamento:")} ${desTip}"> +${r.des} ${tr("desig.")}</small>` : ""}</span>
      <span class="sn-cb">${parts.map(([p, n]) => `<i style="flex:${n};background:${pcolor(p)}"></i>`).join("")}</span></button>`;
  }).join("")}</div>`;
  let cur = null;
  el.querySelectorAll(".sn-cr").forEach((b) => b.onclick = () => {
    cur = cur === b.dataset.k ? null : b.dataset.k;
    el.querySelectorAll(".sn-cr").forEach((x) => x.classList.toggle("on", x.dataset.k === cur));
    onPick(cur);
  });
  return {
    mark(circ) {
      const k = circ ? ccaaOf(circ.slice(0, 2)) : null;
      cur = k;
      el.querySelectorAll(".sn-cr").forEach((x) => x.classList.toggle("on", x.dataset.k === k));
    },
  };
}

// ----------------------------------------------------------------------------- coalitions (joint lists of 29N)
const SMALL = new Set(["de", "del", "la", "el", "los", "las", "y", "i", "per", "por", "en", "al", "con"]);
const KEEP = new Set(["PP", "PSOE", "UPN", "UPC", "SDP", "EH", "ERC", "IU", "MS", "NC", "BC", "EUIB", "CC"]);
function titulo(s) {
  return s.split(/(\s+|-|\()/).map((w, i) => {
    if (!/[A-Za-zÀ-ÿ]/.test(w)) return w;
    if (KEEP.has(w)) return w;
    if (w !== w.toUpperCase()) return w;
    const l = w.toLowerCase();
    return i && SMALL.has(l) ? l : l.charAt(0).toUpperCase() + l.slice(1);
  }).join("");
}
const FAMN = { psoe: "PSOE", sumar: N_("espacio Sumar"), podemos: "Podemos", erc: "ERC", bildu: "EH Bildu", reg: "Nueva Canarias-BC", pp: "PP", cc: "CC" };

function coaliciones(el, T, P, H) {
  const modal = Object.fromEntries(P.circunscripciones.map((c) => [c.circ, parseSplit(c.repartos[0].reparto, c.circ, H)]));
  const cards = H.coaliciones_2026.map((c) => {
    let won = 0;
    const where = [];
    for (const x of c.circs) {
      const p = modal[x.circ]?.find((q) => q.siglas === x.siglas);
      if (p) { won += p.n; where.push(`${x.nombre} ${p.n}`); }
    }
    const fams = c.familias.length > 1 ? c.familias.map((f) => (f === "sumar" ? tr(FAMN[f]) : FAMN[f] ?? f)).join(" + ") : "";
    const n = c.circs.length;
    return `<div class="sn-co" style="--c:${pcolor(c.partido)}">
      <div class="sn-co-h"><i class="dot" style="background:${pcolor(c.partido)}"></i><b>${titulo(c.nombre)}</b></div>
      <div class="sn-co-s">${c.siglas.slice(0, 4).join(" · ")}${c.siglas.length > 4 ? ` ${tr("y {n} variantes más", { n: c.siglas.length - 4 })}` : ""}</div>
      ${fams ? `<div class="sn-co-m">${tr("Suma:")} ${fams}</div>` : ""}
      <div class="sn-co-d">${n === 1 ? c.circs[0].nombre : tr("{n} circunscripciones", { n })}</div>
      <div class="sn-co-w">${won ? `<b>${won}</b> ${won === 1 ? tr("senador") : tr("senadores")} ${tr("en el reparto más probable")}` : tr("Ningún senador en el reparto más probable")}${won && where.length <= 6 ? ` <span class="muted">(${where.join(", ")})</span>` : ""}</div>
    </div>`;
  });
  el.innerHTML = `${md(T.coaliciones_intro, { page: "senado" }).html}<div class="sn-coal">${cards.join("")}</div>`;
}
