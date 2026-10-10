const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, loadMuni, META, FAM, FAM_IDS, norm, fmt, pct, elecLabel, byTipo, showTip, hideTip } from "./data.js?v=0.2.22";
import { lines, dateOf } from "./charts.js?v=0.2.22";
import { electosList, ELECTOS_NOTE } from "./electos.js?v=0.2.22";

export function searchBox(container, onPick, placeholder = "Busca tu municipio… (p. ej. Gozón, Lorca, Sant Cugat)") {
  container.innerHTML = `<div class="search"><input type="search" placeholder="${placeholder}" autocomplete="off" aria-label="Buscar municipio" /><div class="sugg" hidden></div></div>`;
  const input = container.querySelector("input"), box = container.querySelector(".sugg");
  let sel = 0, hits = [];
  const render = () => {
    box.hidden = !hits.length;
    box.innerHTML = hits.map((h, i) => `<a href="#pueblo/${h.ine}" class="${i === sel ? "sel" : ""}">${h.n} <small>${h.p}</small></a>`).join("");
  };
  input.oninput = () => {
    const q = norm(input.value.trim());
    sel = 0;
    hits = q.length < 2 ? [] : META.lista.filter((m) => m.k.includes(q))
      .sort((a, b) => (b.k.startsWith(q) - a.k.startsWith(q)) || a.k.length - b.k.length).slice(0, 12);
    render();
  };
  input.onkeydown = (e) => {
    if (e.key === "ArrowDown") { sel = Math.min(sel + 1, hits.length - 1); render(); e.preventDefault(); }
    if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); render(); e.preventDefault(); }
    if (e.key === "Enter" && hits[sel]) onPick(hits[sel].ine);
  };
  box.onclick = () => { box.hidden = true; };
  return input;
}

export async function renderPueblo(app, args) {
  const ine = args[0];
  app.innerHTML = `<h1>Tu pueblo</h1><p class="sub">Historial electoral completo de cualquier municipio, sus «gemelos» electorales y cuánto se parece a España.</p><div id="s"></div><div id="ficha"></div>`;
  const input = searchBox(app.querySelector("#s"), (i) => { location.hash = `#pueblo/${i}`; });
  if (!ine) { input.focus(); return; }
  if (!META.municipios[ine]) { app.querySelector("#ficha").innerHTML = "<p>Municipio no encontrado.</p>"; return; }

  const [prov, gem, mini] = await Promise.all([loadMuni(ine.slice(0, 2)), load("gemelos.json"), load("miniatura.json")]);
  const d = prov[ine];
  const ficha = app.querySelector("#ficha");
  const gens = byTipo("generales").filter((e) => d?.e[e]);
  const muns = byTipo("municipales").filter((e) => d?.e[e]);
  const auts = byTipo("autonomicas").filter((e) => d?.e[e]);
  const eurs = byTipo("europeas").filter((e) => d?.e[e]);
  const last = gens.at(-1);
  const L = d.e[last];
  const rankAll = Object.values(mini.por_municipio).filter((v) => v != null).sort(d3.ascending);
  const myMini = mini.por_municipio[ine];
  const percentile = myMini != null ? d3.bisectLeft(rankAll, myMini) / rankAll.length : null;

  ficha.innerHTML = `
    <h1 style="margin-top:20px">${META.municipios[ine]} <span style="font-weight:400;color:var(--ink-2);font-size:18px">${META.provincias[ine.slice(0, 2)]}</span></h1>
    <div class="stats">
      <div class="stat"><div class="v">${fmt.format(L.censo)}</div><div class="k">censo (${elecLabel(last)})</div></div>
      <div class="stat"><div class="v">${pct(L.vot / L.censo)}</div><div class="k">participación</div></div>
      <div class="stat"><div class="v">${myMini != null ? `${myMini.toFixed(1).replace(".", ",")} pp` : "·"}</div>
        <div class="k">distancia media a España${percentile != null ? ` · más parecido que el ${Math.round((1 - percentile) * 100)}% de municipios` : ""}</div></div>
    </div>
    <div class="grid2">
      <div class="card"><h2 style="margin-top:0">Generales</h2><div class="chart" id="cg"></div></div>
      <div class="card"><h2 style="margin-top:0">Municipales</h2><div class="chart" id="cm"></div></div>
    </div>
    <div class="grid2" style="margin-top:16px">
      <div class="card"><h2 style="margin-top:0">Autonómicas</h2><div class="chart" id="ca"></div></div>
      <div class="card"><h2 style="margin-top:0">Europeas</h2><div class="chart" id="ce"></div></div>
    </div>
    <h2>Participación</h2><div class="card chart" id="cp"></div>
    <div class="grid2">
      <div><h2>Resultado ${elecLabel(last)}</h2>${candTable(L)}</div>
      <div><h2>Gemelos electorales</h2><p class="note">Municipios cuyo voto en las generales de 2015–2019 más se parece al de ${META.municipios[ine]}.</p>
        ${gem[ine] ? `<table><tr><th>Municipio</th><th>Provincia</th><th class="num">Distancia</th></tr>${gem[ine].map(([g, dd]) =>
          `<tr><td><a href="#pueblo/${g}">${META.municipios[g]}</a></td><td>${META.provincias[g.slice(0, 2)]}</td><td class="num">${dd.toFixed(1).replace(".", ",")}</td></tr>`).join("")}</table>` : "<p class='note'>Sin datos suficientes.</p>"}
      </div>
    </div>
    ${muns.length ? `<h2>Último resultado municipal (${elecLabel(muns.at(-1))})</h2>${d.e[muns.at(-1)].ab ? '<p class="note">Municipio de listas abiertas (hasta 250 habitantes): cada elector marca candidatos sueltos. El voto de cada lista es el de su candidato más votado y no hay datos de censo ni participación.</p>' : ""}${candTable(d.e[muns.at(-1)], true)}` : ""}
    <h2>Concejales electos</h2><div class="controls"><div class="seg" id="cyears"></div></div><div id="concejales"><p class="note">Cargando…</p></div>
    <p class="note">${ELECTOS_NOTE} Disponible de 2003 a 2023: antes, las listas de concejales de la fuente están incompletas.</p>`;

  lineChart(ficha.querySelector("#cg"), gens, d);
  load(`electos/municipales/${ine.slice(0, 2)}.json`).catch(() => ({})).then((all) => {
    const E = all[ine] ?? {};
    const years = Object.keys(E).sort();
    const box = ficha.querySelector("#concejales"), seg = ficha.querySelector("#cyears");
    if (!years.length) { box.innerHTML = '<p class="note">Sin concejales publicables para este municipio.</p>'; return; }
    const show = (e) => {
      seg.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.e === e));
      electosList(box, E[e]);
    };
    seg.innerHTML = years.map((e) => `<button data-e="${e}">${e.slice(12, 16)}</button>`).join("");
    seg.querySelectorAll("button").forEach((b) => b.onclick = () => show(b.dataset.e));
    show(years.at(-1));
  });
  const partSeries = (list, name, color, key) => ({ id: name, name, color,
    values: list.map((e) => ({ date: dateOf(e), label: elecLabel(e),
      // open-list municipalities have no census (censo 0): no turnout
      v: !d.e[e].censo ? null : key ? (d.e[e][key] ? d.e[e][key] / d.e[e].censo : null) : d.e[e].vot / d.e[e].censo })) });
  lines(ficha.querySelector("#cp"), [
    partSeries(gens, "Generales", "#1f4e8c"),
    partSeries(gens, "Generales 18:00", "#6b8fc7", "a2"),
    partSeries(gens, "Generales 14:00", "#a9bfe0", "a1"),
    partSeries(muns, "Municipales", "#8a8984"),
  ], { height: 240, yMin: 0, yMax: 1 });
  if (muns.length) lineChart(ficha.querySelector("#cm"), muns, d);
  else ficha.querySelector("#cm").innerHTML = "<p class='note'>Sin datos municipales en la fuente.</p>";
  if (auts.length > 1) lineChart(ficha.querySelector("#ca"), auts, d);
  else ficha.querySelector("#ca").innerHTML = "<p class='note'>Sin suficientes elecciones autonómicas con datos de este municipio.</p>";
  if (eurs.length > 1) lineChart(ficha.querySelector("#ce"), eurs, d);
  else ficha.querySelector("#ce").innerHTML = "<p class='note'>Sin datos.</p>";
}

function candTable(r, electos = false) {
  const cand = r.c.reduce((s, c) => s + c[2], 0);
  const max = d3.max(r.c, (c) => c[2]);
  return `<table><tr><th>Candidatura</th><th></th><th class="num">Votos</th><th class="num">%</th>${electos ? '<th class="num">Concejales</th>' : ""}</tr>
    ${r.c.map(([s, f, v, e]) => `<tr><td><i class="dot" style="background:${FAM[f].color}"></i>${s}</td>
      <td style="width:30%"><span class="hbar" style="width:${(v / max) * 100}%;background:${FAM[f].color}"></span></td>
      <td class="num">${fmt.format(v)}</td><td class="num">${pct(v / r.vot)}</td>${electos ? `<td class="num">${e}</td>` : ""}</tr>`).join("")}
  </table><p class="note">% sobre votantes. Se muestran las 10 candidaturas más votadas.</p>`;
}

/** Share by family over elections; families that ever reach 5% get a line. */
export function lineChart(el, elections, d) {
  const data = elections.map((e) => {
    const r = d.e[e];
    const fam = Object.fromEntries(FAM_IDS.map((f) => [f, 0]));
    let cand = 0;
    for (const [, f, v] of r.c) { fam[f] += v; cand += v; }
    return { e, date: new Date(e.split("_")[1] + "-15"), fam, cand };
  });
  const fams = FAM_IDS.filter((f) => f !== "otros" && d3.max(data, (x) => x.fam[f] / x.cand) >= 0.05);
  const W = 520, H = 260, m = { t: 10, r: 90, b: 24, l: 34 };
  const x = d3.scaleTime().domain(d3.extent(data, (x) => x.date)).range([m.l, W - m.r]);
  const ymax = d3.max(data, (x) => d3.max(fams, (f) => x.fam[f] / x.cand)) || 0.5;
  const y = d3.scaleLinear().domain([0, Math.min(1, ymax * 1.08)]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(4)).join("line")
    .attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).ticks(6).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`)
    .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format(".0%")).tickSize(0)).call((g) => g.select(".domain").remove());
  const line = (f) => d3.line().x((p) => x(p.date)).y((p) => y(p.fam[f] / p.cand)).defined((p) => p.cand > 0);
  for (const f of fams) {
    svg.append("path").attr("d", line(f)(data)).attr("fill", "none").attr("stroke", FAM[f].color).attr("stroke-width", 2);
    svg.append("g").selectAll("circle").data(data.filter((p) => p.fam[f] > 0)).join("circle")
      .attr("cx", (p) => x(p.date)).attr("cy", (p) => y(p.fam[f] / p.cand)).attr("r", 2.5)
      .attr("fill", FAM[f].color).attr("stroke", "var(--surface)").attr("stroke-width", 1);
  }
  // direct labels at the end, de-collided
  const lastP = data.at(-1);
  const labels = fams.filter((f) => lastP.fam[f] > 0).map((f) => ({ f, y: y(lastP.fam[f] / lastP.cand) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 12);
  svg.append("g").selectAll("text").data(labels).join("text")
    .attr("x", W - m.r + 6).attr("y", (l) => l.y + 4).attr("font-size", 11).attr("fill", "var(--ink-2)")
    .text((l) => FAM[l.f].nombre.split(/[ /(]/)[0]);
  // hover crosshair
  const cross = svg.append("line").attr("stroke", "var(--ink-3)").attr("y1", m.t).attr("y2", H - m.b).style("display", "none");
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b).attr("fill", "transparent")
    .on("mousemove", (ev) => {
      const [mx] = d3.pointer(ev);
      const p = data[d3.leastIndex(data, (q) => Math.abs(x(q.date) - mx))];
      cross.attr("x1", x(p.date)).attr("x2", x(p.date)).style("display", null);
      const rows = FAM_IDS.filter((f) => p.fam[f] > 0).sort((a, b) => p.fam[b] - p.fam[a]).slice(0, 6);
      showTip(`<b>${elecLabel(p.e)}</b>${rows.map((f) => `<div class="row"><span><i class="dot" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span><span>${pct(p.fam[f] / p.cand)}</span></div>`).join("")}`, ev);
    })
    .on("mouseleave", () => { cross.style("display", "none"); hideTip(); });
  el.insertAdjacentHTML("beforeend", `<div class="legend">${fams.map((f) => `<span><i class="sw" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span>`).join("")}</div>`);
}
