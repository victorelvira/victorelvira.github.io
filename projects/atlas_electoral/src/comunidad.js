const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, META, FAM, FAM_IDS, parseRow, winner, pct, fmt, elecLabel, byTipo, showTip, hideTip } from "./data.js?v=0.2.16";
import { seatRows, lines, dateOf, familySeries, IDEO } from "./charts.js?v=0.2.16";
import { getGeo } from "./mapa.js?v=0.2.16";
import { addZoom } from "./zoom.js?v=0.2.16";
import { electosList, ELECTOS_NOTE } from "./electos.js?v=0.2.16";

const state = { cc: "MD", eleccion: null };

export async function renderComunidad(app, args) {
  const S = await load("series.json");
  if (args[0] && S.ccaa[args[0]]) state.cc = args[0];
  const C = S.ccaa[state.cc];
  const eids = S.elecciones, N = S.nacional;
  const lab = (e) => elecLabel(e);
  const munElections = byTipo("generales");
  if (!state.eleccion) state.eleccion = munElections.at(-1);
  history.replaceState(null, "", `#comunidad/${state.cc}`);

  const last = eids.at(-1);
  const L = C.s[last];
  app.innerHTML = `
    <h1>Tu comunidad</h1>
    <div class="chips">${Object.entries(S.ccaa).map(([c, v]) => `<a class="chip ${c === state.cc ? "on" : ""}" href="#comunidad/${c}">${v.n}</a>`).join("")}</div>
    <h1 style="margin-top:16px">${C.n}</h1>
    <div class="stats">
      <div class="stat"><div class="v">${L.escanos}</div><div class="k">diputados en ${lab(last)}</div></div>
      <div class="stat"><div class="v">${fmt.format(L.censo)}</div><div class="k">censo electoral</div></div>
      <div class="stat"><div class="v">${pct(L.votantes / L.censo)}</div><div class="k">participación (España: ${pct(N[last].votantes / N[last].censo)})</div></div>
    </div>
    <div class="grid2">
      <div><h2>Municipios</h2>
        <div class="controls"><label>Elección <select id="el">${munElections.map((e) => `<option value="${e}">${lab(e)}</option>`).join("")}</select></label></div>
        <div class="mapwrap"><svg viewBox="0 0 600 500" role="img" aria-label="Mapa de ${C.n}"></svg></div>
        <div id="leg"></div></div>
      <div><h2>Voto por familias (generales)</h2><div class="chart" id="votos"></div>
        <h2>Participación frente a España</h2><div class="chart" id="part"></div></div>
    </div>
    <h2>Parlamento autonómico</h2><div id="aut"></div>
    <h2>Diputados que ha elegido ${C.n} en el Congreso</h2><div id="seats"></div>
    <h2>Quién representa a ${C.n}</h2>
    <div class="controls"><div class="seg" id="rcargo">
      <button data-c="generales">Congreso</button><button data-c="senado">Senado</button><button data-c="autonomicas">Parlamento autonómico</button></div>
      <label>Elección <select id="relec"></select></label></div>
    <div id="reps"><p class="note">Cargando…</p></div>
    <p class="note">${ELECTOS_NOTE}</p>
    ${C.provs.length > 1 ? `<h2>Por provincia</h2><div class="scrollx" id="provs"></div>` : ""}`;
  const $ = (s) => app.querySelector(s);

  lines($("#votos"), familySeries(C.s, lab, 0.04).sort((a, b) => IDEO.indexOf(a.id) - IDEO.indexOf(b.id)), { height: 300 });
  lines($("#part"), [
    { id: "c", name: C.n.replace("Comunidad de ", "").replace("Región de ", ""), color: "#1f4e8c", values: eids.map((e) => ({ date: dateOf(e), v: C.s[e].votantes / C.s[e].censo, label: lab(e) })) },
    { id: "es", name: "España", color: "#8a8984", values: eids.map((e) => ({ date: dateOf(e), v: N[e].votantes / N[e].censo, label: lab(e) })) },
  ], { height: 220, yMin: 0.4, yMax: 0.9 });
  const A = S.autonomicas?.[state.cc] ?? {};
  const aeids = Object.keys(A).sort();
  if (aeids.length) {
    const short = (e) => lab(e).replace("Autonómicas ", "");
    $("#aut").innerHTML = `<p class="sub">Escaños tras cada elección autonómica: hasta 2012, Ministerio del Interior; después, el portal oficial de resultados de cada comunidad.</p>
      <div id="autseats"></div><h3 class="h3" style="margin-top:16px">Voto por familias</h3><div class="chart" id="autvotos"></div>`;
    seatRows($("#autseats"), aeids.filter((e) => A[e].escanos).map((e) => ({ label: short(e), e: A[e].e })),
      { total: Math.max(...aeids.map((e) => A[e].escanos)), labelWidth: 90 });
    lines($("#autvotos"), familySeries(A, lab, 0.04).sort((a, b) => IDEO.indexOf(a.id) - IDEO.indexOf(b.id)), { height: 280 });
  } else {
    $("#aut").innerHTML = `<p class="note">Interior no publica las autonómicas de ${C.n}.</p>`;
  }
  seatRows($("#seats"), eids.map((e) => ({ label: lab(e).replace("Generales ", ""), e: C.s[e].e })), { total: Math.max(...eids.map((e) => C.s[e].escanos)), labelWidth: 90 });

  if (C.provs.length > 1) {
    $("#provs").innerHTML = `<table><tr><th>Provincia</th><th class="num">Diputados</th>${["pp", "psoe", "vox", "izq"].map((f) => `<th class="num">${FAM[f].nombre.split(" ")[0]}</th>`).join("")}<th>Reparto ${lab(last).replace("Generales ", "")}</th></tr>
      ${C.provs.map((p) => { const r = S.provincias[p].s[last];
        return `<tr><td>${META.provincias[p]}</td><td class="num">${r.escanos}</td>${["pp", "psoe", "vox", "izq"].map((f) => `<td class="num">${r.v[f] ? pct(r.v[f] / Object.values(r.v).reduce((a, b) => a + b, 0)) : "·"}</td>`).join("")}
        <td>${IDEO.filter((f) => r.e[f]).map((f) => `<span style="white-space:nowrap;margin-right:8px"><i class="dot" style="background:${FAM[f].color}"></i>${r.e[f]}</span>`).join("")}</td></tr>`; }).join("")}</table>`;
  }

  // who represents the region: elected people by office and election
  const [NAC, AUT] = await Promise.all([load("electos/nacional.json"),
    load(`electos/autonomicas/${state.cc}.json`).catch(() => ({}))]);
  let cargo = state.cargo ?? "generales";
  const drawReps = () => {
    app.querySelectorAll("#rcargo button").forEach((b) => b.classList.toggle("on", b.dataset.c === cargo));
    const src = cargo === "autonomicas" ? AUT : NAC;
    const eids = Object.keys(src).filter((e) => e.startsWith(cargo === "autonomicas" ? "autonomicas" : `${cargo}_`)).sort();
    const sel = $("#relec");
    if (!eids.length) { sel.innerHTML = ""; $("#reps").innerHTML = '<p class="note">Sin datos publicables.</p>'; return; }
    if (!eids.includes(sel.value)) sel.innerHTML = eids.slice().reverse().map((e) => `<option value="${e}">${lab(e)}</option>`).join("");
    const e = sel.value || eids.at(-1);
    if (cargo === "autonomicas") {
      electosList($("#reps"), AUT[e]);
    } else {
      $("#reps").innerHTML = C.provs.map((p) => `<h3 class="h3">${META.provincias[p]}</h3><div data-p="${p}"></div>`).join("");
      for (const p of C.provs) electosList($("#reps").querySelector(`[data-p="${p}"]`), NAC[e]?.[p] ?? []);
    }
  };
  app.querySelectorAll("#rcargo button").forEach((b) => b.onclick = () => { cargo = state.cargo = b.dataset.c; $("#relec").innerHTML = ""; drawReps(); });
  $("#relec").onchange = drawReps;
  drawReps();

  // municipal map of the community
  const { features } = await getGeo();
  const feats = features.filter((f) => C.provs.includes(f.id.slice(0, 2)));
  const proj = d3.geoMercator().fitSize([600, 500], { type: "FeatureCollection", features: feats });
  const path = d3.geoPath(proj);
  const svg = d3.select(app).select(".mapwrap svg");
  const gRoot = svg.append("g");
  const paths = gRoot.selectAll("path").data(feats).join("path").attr("class", "m").attr("d", path);
  addZoom(svg, gRoot, app.querySelector(".mapwrap"), { max: 20 });
  const base = getComputedStyle(document.documentElement).getPropertyValue("--nodata").trim();

  async function draw() {
    $("#el").value = state.eleccion;
    const res = await load(`res/${state.eleccion}.json`);
    const rows = new Map(feats.map((f) => [f.id, parseRow(res.cols, res.m[f.id])]));
    paths.attr("fill", (d) => {
      const r = rows.get(d.id);
      if (!r || !r.cand) return base;
      const w = winner(r);
      return d3.interpolateLab(base, FAM[w.fam].color)(Math.max(0.25, Math.min(1, (w.share - 0.2) / 0.4)));
    }).on("mousemove", (ev, d) => {
      const r = rows.get(d.id);
      const top = r ? Object.entries(r.fam).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).slice(0, 4) : [];
      showTip(`<b>${META.municipios[d.id] ?? d.id}</b>${r ? top.map(([f, v]) => `<div class="row"><span><i class="dot" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span><span>${pct(v / r.cand)}</span></div>`).join("") + `<div class="row muted"><span>Participación</span><span>${pct(r.votantes / r.censo)}</span></div>` : '<div class="muted">sin datos</div>'}`, ev);
    }).on("mouseleave", hideTip).on("click", (ev, d) => { location.hash = `#pueblo/${d.id}`; });
    const present = new Set([...rows.values()].filter((r) => r?.cand).map((r) => winner(r).fam));
    $("#leg").innerHTML = `<div class="legend">${FAM_IDS.filter((f) => present.has(f)).map((f) => `<span><i class="sw" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span>`).join("")}<span class="note">· ganador; más intenso = más voto</span></div>`;
  }
  $("#el").onchange = (e) => { state.eleccion = e.target.value; draw(); };
  await draw();
}
