const d3 = window.d3; // vendored UMD build, loaded by the entry page
const topojson = window.topojson;
const geoConicConformalSpain = d3.geoConicConformalSpain;
import { searchBox } from "./pueblo.js?v=0.2.19";
import { load, META, FAM, FAM_IDS, parseRow, winner, pct, fmt, elecLabel, byTipo, showTip, hideTip } from "./data.js?v=0.2.19";
import { addZoom } from "./zoom.js?v=0.2.19";

const state = { tipo: "generales", eleccion: null, modo: "ganador", familia: "psoe", playing: null };
let geo; // cached {features, provMesh, path}

const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export async function getGeo() {
  if (geo) return geo;
  const topo = await load("municipios.topo.json");
  // IGN rings come in planar (counter-clockwise) winding; d3 is spherical and would read
  // them as "the whole globe minus the municipality", so reverse any that are inverted.
  const features = topojson.feature(topo, topo.objects.municipalities).features.map(rewind);
  const provMesh = topojson.mesh(topo, topo.objects.provinces, (a, b) => a !== b);
  const projection = geoConicConformalSpain().fitSize([960, 720], { type: "FeatureCollection", features });
  const path = d3.geoPath(projection);
  geo = { features, provMesh, path, borders: projection.getCompositionBorders() };
  return geo;
}

// Autonómicas are held on different dates per region, so the map shows a composite per
// year ("autmap_YYYY"): every region with its latest regional election up to that year.
const AUT_FIRST = 1983;
// last year with a regional election in the data (Interior up to 2012, regional portals after)
const autLast = () => Math.max(...META.elecciones.filter((e) => e.tipo === "autonomicas" && e.provs.length).map((e) => +e.fecha.slice(0, 4)));
const isAut = (id) => id.startsWith("autmap_");
const tipoOf = (id) => (isAut(id) ? "autonomicas" : id.split("_")[0]);
function steps(tipo) {
  // skip elections without municipal data (e.g. Senado 1977-1982)
  if (tipo !== "autonomicas") return byTipo(tipo).filter((e) => META.elecciones.find((x) => x.eleccion === e).provs.length);
  return d3.range(AUT_FIRST, autLast() + 1).map((y) => `autmap_${y}`);
}
function label(id) {
  return isAut(id) ? `Autonómicas · mapa en ${id.slice(7)}` : elecLabel(id);
}

/** Which regional election each region shows in a composite year. */
function autSources(year) {
  const out = [];
  for (const [cc, c] of Object.entries(META.ccaa)) {
    const e = META.elecciones.filter((x) => x.tipo === "autonomicas" && x.fecha <= `${year}-12`
      && c.provs.some((p) => x.provs.includes(p))).at(-1);
    if (e) out.push({ cc, n: c.n, eleccion: e.eleccion, provs: c.provs });
  }
  return out;
}

async function loadRes(id) {
  if (!isAut(id)) return load(`res/${id}.json`);
  const src = autSources(+id.slice(7));
  const files = await Promise.all([...new Set(src.map((s) => s.eleccion))].map((e) => load(`res/${e}.json`).then((r) => [e, r])));
  const byE = Object.fromEntries(files);
  const m = {}, av = {};
  let cols;
  for (const s of src) {
    const r = byE[s.eleccion];
    cols = r.cols;
    for (const [ine, row] of Object.entries(r.m)) if (s.provs.includes(ine.slice(0, 2))) m[ine] = row;
  }
  return { cols, m, av, sources: src };
}

function previousOf(eid) {
  if (isAut(eid)) { const y = +eid.slice(7) - 4; return y >= AUT_FIRST ? `autmap_${y}` : null; }
  const list = byTipo(eid.split("_")[0]);
  const i = list.indexOf(eid);
  return i > 0 ? list[i - 1] : null;
}

/** Standalone page (#mapa/...) or, with embed = {tipos: [...]}, a map block inside another page: one
 *  election type, no title, the hash untouched, and a municipality search above the map. */
export async function renderMapa(app, args, embed = null) {
  if (embed) { state.tipo = embed.tipos[0]; state.eleccion = null; if (state.playing) { clearInterval(state.playing); state.playing = null; } }
  if (args[0] && (META.elecciones.some((e) => e.eleccion === args[0]) || isAut(args[0]))) {
    state.eleccion = args[0];
    state.tipo = tipoOf(args[0]);
  }
  if (args[1]) state.modo = args[1];
  if (args[2] && FAM[args[2]]) state.familia = args[2];
  if (!state.eleccion) state.eleccion = steps(state.tipo).at(-1);

  const TIPOS = { generales: "Generales", autonomicas: "Autonómicas", municipales: "Municipales", europeas: "Europeas", senado: "Senado" };
  const tipos = embed ? embed.tipos : Object.keys(TIPOS);
  app.innerHTML = `
    ${embed ? '<div id="msearch"></div>' : `<h1>¿Qué votó cada municipio?</h1>
    <p class="sub">Generales y municipales desde 1977, Senado desde 1986, europeas desde 1987 y autonómicas desde 1982, municipio a municipio. Pasa el ratón (o toca) para ver el detalle y pulsa para abrir la ficha del pueblo.</p>`}
    <div class="controls">
      <div class="seg" id="tipo" ${tipos.length > 1 ? "" : "hidden"}>${tipos.map((t) => `<button data-v="${t}">${TIPOS[t]}</button>`).join("")}</div>
      <div class="seg" id="modo">
        <button data-v="ganador">Ganador</button><button data-v="partido">% de un partido</button>
        <button data-v="cambio">Cambio vs anterior</button><button data-v="participacion">Participación</button>
        <button data-v="av1">A las 14:00</button><button data-v="av2">A las 18:00</button>
      </div>
      <label id="famwrap">Partido <select id="fam">${FAM_IDS.filter((f) => f !== "otros")
        .map((f) => `<option value="${f}">${FAM[f].nombre}</option>`).join("")}</select></label>
    </div>
    <div class="controls timeline">
      <button class="play" id="play" aria-label="Reproducir">▶</button>
      <input type="range" id="t" min="0" step="1" />
      <span class="lbl" id="tl"></span>
    </div>
    <div class="mapwrap"><svg viewBox="0 0 960 720" role="img" aria-label="Mapa municipal"></svg></div>
    <div id="leg"></div>
    <h2 id="nat-h"></h2>
    <div id="nat"></div>
    <p class="note">Gris: sin datos (municipio inexistente en esa fecha o no incluido en la fuente). En municipales, los pueblos de hasta 250 habitantes votan con listas abiertas: el voto de cada lista se aproxima por el de su candidato más votado y no hay dato de participación.</p>`;

  const { features, provMesh, path, borders } = await getGeo();
  const svg = d3.select(app).select("svg");
  const gRoot = svg.append("g");
  const gM = gRoot.append("g");
  const paths = gM.selectAll("path").data(features).join("path")
    .attr("class", "m").attr("d", path);
  gRoot.append("path").attr("class", "prov").attr("d", path(provMesh));
  gRoot.append("path").attr("class", "prov").attr("d", borders);
  addZoom(svg, gRoot, app.querySelector(".mapwrap"));

  const $ = (s) => app.querySelector(s);
  const slider = $("#t");

  async function draw() {
    const list = steps(state.tipo);
    if (!list.includes(state.eleccion)) state.eleccion = list.at(-1);
    slider.max = list.length - 1;
    slider.value = list.indexOf(state.eleccion);
    $("#tl").textContent = label(state.eleccion);
    app.querySelectorAll("#tipo button").forEach((b) => b.classList.toggle("on", b.dataset.v === state.tipo));
    app.querySelectorAll("#modo button").forEach((b) => b.classList.toggle("on", b.dataset.v === state.modo));
    $("#famwrap").style.display = ["partido", "cambio"].includes(state.modo) ? "" : "none";
    $("#fam").value = state.familia;
    if (!embed) history.replaceState(null, "", `#mapa/${state.eleccion}/${state.modo}/${state.familia}`);

    const res = await loadRes(state.eleccion);
    state.av = res.av;
    state.abiertas = new Set(res.abiertas ?? []);
    const prevId = previousOf(state.eleccion);
    const prev = state.modo === "cambio" && prevId ? await loadRes(prevId) : null;
    const rows = new Map();
    for (const [ine, r] of Object.entries(res.m)) rows.set(ine, parseRow(res.cols, r));
    const prevRows = prev ? new Map(Object.entries(prev.m).map(([k, r]) => [k, parseRow(prev.cols, r)])) : null;

    const base = cssVar("--nodata");
    const famShare = (r, f) => (r && r.cand ? r.fam[f] / r.cand : null);
    let color, legend;
    if (state.modo === "ganador") {
      color = (r) => {
        const w = winner(r);
        if (!w.fam || !r.cand) return base;
        const t = Math.max(0.25, Math.min(1, (w.share - 0.2) / 0.4));
        return d3.interpolateLab(base, FAM[w.fam].color)(t);
      };
      const present = new Set([...rows.values()].map((r) => winner(r).fam));
      legend = `<div class="legend">${FAM_IDS.filter((f) => present.has(f)).map((f) =>
        `<span><i class="sw" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span>`).join("")}
        <span class="muted">· más intenso = más votos para el ganador</span></div>`;
    } else if (state.modo === "partido") {
      const vals = [...rows.values()].map((r) => famShare(r, state.familia)).filter((v) => v != null).sort(d3.ascending);
      const hi = Math.max(0.05, d3.quantileSorted(vals, 0.98) ?? 0.5);
      const ramp = d3.interpolateLab(base, FAM[state.familia].color);
      color = (r) => { const s = famShare(r, state.familia); return s == null ? base : ramp(Math.min(1, s / hi)); };
      legend = rampLegend(ramp, "0%", `≥${pct(hi, 0)}`, `Voto a ${FAM[state.familia].nombre}`);
    } else if (state.modo === "av1" || state.modo === "av2") {
      const k = state.modo === "av1" ? 0 : 1;
      const av = res.av ?? {};
      const [lo, hi] = k ? [0.35, 0.75] : [0.2, 0.55];
      const ramp = d3.interpolateLab(base, "#1f4e8c");
      color = (r, ine) => (av[ine] && r?.censo ? ramp(Math.max(0, Math.min(1, (av[ine][k] / r.censo - lo) / (hi - lo)))) : base);
      legend = Object.keys(av).length
        ? rampLegend(ramp, `≤${pct(lo, 0)}`, `≥${pct(hi, 0)}`, `Habían votado a las ${k ? "18:00" : "14:00"} (avance oficial, % del censo)`)
        : `<p class="note">Interior no publica avances por municipio para esta elección.</p>`;
      state.av = av;
    } else if (state.modo === "participacion") {
      const ramp = d3.interpolateLab(base, "#1f4e8c");
      color = (r) => (r && r.censo ? ramp(Math.max(0, Math.min(1, (r.votantes / r.censo - 0.4) / 0.5))) : base);
      legend = rampLegend(ramp, "≤40%", "≥90%", "Participación (votantes / censo)");
    } else {
      const neg = "#c2410c", pos = "#1d4ed8";
      const div = (d) => (d < 0 ? d3.interpolateLab(base, neg)(Math.min(1, -d / 0.15)) : d3.interpolateLab(base, pos)(Math.min(1, d / 0.15)));
      color = (r, ine) => {
        const p = prevRows?.get(ine);
        const a = famShare(r, state.familia), b = famShare(p, state.familia);
        return a == null || b == null ? base : div(a - b);
      };
      legend = `<div class="ramp">${prevId ? `Cambio de ${FAM[state.familia].nombre} respecto a ${label(prevId)}` : "No hay elección anterior"}
        <span>−15 pp</span><span class="bar" style="background:linear-gradient(90deg,${neg},${base},${pos})"></span><span>+15 pp</span></div>`;
    }
    paths.attr("fill", (d) => { const r = rows.get(d.id); return r ? color(r, d.id) : base; });
    $("#leg").innerHTML = legend + (res.sources ? `<p class="note">Elección autonómica usada en cada comunidad: ${res.sources.map((x) => `${x.n} ${elecLabel(x.eleccion).replace("Autonómicas ", "")}`).join(" · ")}. Hasta 2012, Ministerio del Interior; desde 2012, portales oficiales de cada comunidad. Sin datos municipales de Cataluña y País Vasco 1980 ni de Galicia 1981 y 1985.</p>` : "");

    paths.on("mousemove", (ev, d) => showTip(tipHtml(d.id, rows.get(d.id), prevRows?.get(d.id)), ev))
      .on("mouseleave", hideTip)
      .on("click", (ev, d) => { location.hash = `#pueblo/${d.id}`; });

    renderNational(rows);
  }

  function tipHtml(ine, r, p) {
    const name = META.municipios[ine] ?? ine;
    const prov = META.provincias[ine.slice(0, 2)] ?? "";
    if (!r) return `<b>${name}</b><div class="muted">${prov} · sin datos</div>`;
    const top = Object.entries(r.fam).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return `<b>${name}</b><div class="muted">${prov} · censo ${fmt.format(r.censo)}</div>
      ${top.map(([f, v]) => `<div class="row"><span><i class="dot" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span><span>${pct(v / r.cand)}${
        state.modo === "cambio" && p?.cand && f === state.familia ? ` (${d3.format("+.1f")((v / r.cand - p.fam[f] / p.cand) * 100)} pp)` : ""}</span></div>`).join("")}
      ${state.abiertas?.has(ine) ? '<div class="muted">Listas abiertas (≤250 hab.): voto aproximado por el candidato más votado de cada lista</div>'
        : `<div class="row muted"><span>Participación</span><span>${pct(r.votantes / r.censo)}</span></div>`}
      ${state.av?.[ine] ? `<div class="row muted"><span>A las 14:00 / 18:00</span><span>${pct(state.av[ine][0] / r.censo)} / ${pct(state.av[ine][1] / r.censo)}</span></div>` : ""}`;
  }

  function renderNational(rows) {
    const tot = Object.fromEntries(FAM_IDS.map((f) => [f, 0]));
    let cand = 0;
    for (const r of rows.values()) for (const f of FAM_IDS) { tot[f] += r.fam[f]; cand += r.fam[f]; }
    const order = FAM_IDS.filter((f) => tot[f] > 0).sort((a, b) => (a === "otros") - (b === "otros") || tot[b] - tot[a]);
    $("#nat-h").textContent = isAut(state.eleccion) ? `Suma de las últimas autonómicas · ${state.eleccion.slice(7)}` : `Total España · ${label(state.eleccion)}`;
    $("#nat").innerHTML = `<div class="seats" style="height:22px">${order.map((f) =>
      `<div title="${FAM[f].nombre}: ${pct(tot[f] / cand)}" style="flex:${tot[f]};background:${FAM[f].color}"></div>`).join("")}</div>
      <div class="legend">${order.filter((f) => tot[f] / cand > 0.01).map((f) =>
        `<span><i class="sw" style="background:${FAM[f].color}"></i>${FAM[f].nombre} <b>${pct(tot[f] / cand)}</b></span>`).join("")}</div>
      <p class="note">Sobre votos a candidaturas en municipios (sin voto exterior).</p>`;
  }

  app.querySelectorAll("#tipo button").forEach((b) => b.onclick = () => { state.tipo = b.dataset.v; state.eleccion = steps(state.tipo).at(-1); draw(); });
  if (embed) searchBox($("#msearch"), (ine) => { location.hash = `#pueblo/${ine}`; }, "Busca tu municipio para ver su ficha (p. ej. Gozón, Lorca, Sant Cugat)");
  app.querySelectorAll("#modo button").forEach((b) => b.onclick = () => { state.modo = b.dataset.v; draw(); });
  $("#fam").onchange = (e) => { state.familia = e.target.value; draw(); };
  slider.oninput = () => { state.eleccion = steps(state.tipo)[+slider.value]; draw(); };
  $("#play").onclick = () => {
    if (state.playing) { clearInterval(state.playing); state.playing = null; $("#play").textContent = "▶"; return; }
    $("#play").textContent = "❚❚";
    state.playing = setInterval(() => {
      const list = steps(state.tipo);
      const i = (list.indexOf(state.eleccion) + 1) % list.length;
      state.eleccion = list[i];
      draw();
      if (!document.body.contains(slider)) { clearInterval(state.playing); state.playing = null; }
    }, 1400);
  };
  await draw();
}

function rewind(f) {
  const g = f.geometry;
  if (!g) return f;
  // fix each polygon separately: a multipolygon can mix correct and inverted parts
  const fix = (rings) => (d3.geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI
    ? rings.map((r) => [...r].reverse()) : rings);
  const coordinates = g.type === "Polygon" ? fix(g.coordinates) : g.coordinates.map(fix);
  return { ...f, geometry: { ...g, coordinates } };
}

function rampLegend(ramp, lo, hi, title) {
  const stops = d3.range(0, 1.01, 0.1).map((t) => ramp(t)).join(",");
  return `<div class="ramp">${title} <span>${lo}</span><span class="bar" style="background:linear-gradient(90deg,${stops})"></span><span>${hi}</span></div>`;
}
