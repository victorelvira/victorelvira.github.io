const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { FAM, pct, showTip, hideTip } from "./data.js?v=0.2.57";

// left-to-right ordering used for every seat bar
export const IDEO = ["bildu", "cup", "podemos", "izq", "sumar", "erc", "bng", "compromis", "psoe", "pnv", "cc", "otros", "junts", "ucd", "cs", "pp", "vox", "salf"];
// parties projected on their own for 2026 that are not families of the vocabulary (same colours as encuestas.js)
export const EXTRA = { sumar: { nombre: "Sumar", color: "#d6246e" }, podemos: { nombre: "Podemos", color: "#6b2e68" }, salf: { nombre: "SALF", color: "#8a6d3b" } };
export const fam = (f) => FAM[f] ?? EXTRA[f] ?? { nombre: f, color: "#999" };
/** Family name as it read at a given election: the vocabulary name spans 1977-2026 ("PP (AP/CD)",
 *  "PCE/IU/Podemos/Sumar"); from 2019 on the current label is clearer. eid like "generales_2023-07". */
const NOW = { pp: "PP", junts: "Junts", bildu: "EH Bildu", cs: "Ciudadanos", ucd: "CDS", izq: "Sumar" };
export function famName(f, eid) {
  const y = eid ? +String(eid).replace(/^\D*/, "").slice(0, 4) : 0;
  if (y < 2019) return fam(f).nombre;
  if (f === "izq") return y >= 2023 ? "Sumar" : "Unidas Podemos";
  return NOW[f] ?? fam(f).nombre;
}

/** One horizontal 350-seat bar per row. rows: [{label, e: {fam: seats}, href?, muted?}]; muted = an estimate, drawn in faded colours. */
export function seatRows(el, rows, { total = 350, labelWidth = 120, eid = null } = {}) {
  const maj = Math.floor(total / 2) + 1;   // eid: election whose party names the legend uses (famName)
  el.innerHTML = `<div class="seatrows">${rows.map((r) => {
    const fams = IDEO.filter((f) => r.e[f]);
    return `<div class="sr${r.muted ? " muted-row" : ""}"><span class="sl" style="width:${labelWidth}px">${r.href ? `<a href="${r.href}">${r.label}</a>` : r.label}</span>
      <div class="seats" style="height:20px;flex:1${r.muted ? ";opacity:.45" : ""}">${fams.map((f) =>
        `<div data-f="${f}" data-n="${r.e[f]}" data-l="${r.label}" style="flex:${r.e[f]};background:${fam(f).color}"></div>`).join("")}
        <span class="majority" style="left:${(maj / total) * 100}%"></span></div></div>`;
  }).join("")}</div>
  <div class="legend">${IDEO.filter((f) => rows.some((r) => r.e[f])).map((f) => `<span><i class="sw" style="background:${fam(f).color}"></i>${famName(f, eid)}</span>`).join("")}
</div>`;
  el.querySelectorAll(".seats div").forEach((d) => {
    d.onmousemove = (ev) => showTip(`<b>${d.dataset.l}</b><div class="row"><span><i class="dot" style="background:${fam(d.dataset.f).color}"></i>${famName(d.dataset.f, eid)}</span><span>${d.dataset.n} escaños</span></div>`, ev);
    d.onmouseleave = hideTip;
  });
}

/**
 * Multi-line chart over dates.
 * series: [{id, name, color, values: [{date, v, label?}]}]; v in [0,1] unless fmt given.
 */
export function lines(el, series, { height = 300, fmt = (v) => pct(v), yTicks = (v) => d3.format(".0%")(v), yMin = 0, yMax, dash = {} } = {}) {
  el.innerHTML = "";
  // draw at the container's real width so text stays at its nominal size
  const W = Math.max(320, Math.round(el.clientWidth || 900)), H = height, m = { t: 10, r: 110, b: 24, l: 40 };
  const all = series.flatMap((s) => s.values.filter((p) => p.v != null));
  if (!all.length) return;
  const x = d3.scaleTime().domain(d3.extent(all, (p) => p.date)).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([yMin, yMax ?? d3.max(all, (p) => p.v) * 1.08]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(5)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(W / 90))).tickSizeOuter(0)).call((g) => g.select(".domain").remove());
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(yTicks).tickSize(0)).call((g) => g.select(".domain").remove());
  for (const s of series) {
    const vals = s.values.filter((p) => p.v != null);
    svg.append("path").attr("d", d3.line().x((p) => x(p.date)).y((p) => y(p.v)).defined((p) => p.v != null)(s.values))
      .attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2).attr("stroke-dasharray", dash[s.id] ?? null);
    svg.append("g").selectAll("circle").data(vals).join("circle").attr("cx", (p) => x(p.date)).attr("cy", (p) => y(p.v))
      .attr("r", 3).attr("fill", s.color).attr("stroke", "var(--surface)").attr("stroke-width", 1.5);
  }
  const labels = series.map((s) => { const l = s.values.filter((p) => p.v != null).at(-1); return l && { s, y: y(l.v), x: x(l.date) }; })
    .filter(Boolean).sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 13);
  svg.append("g").selectAll("text").data(labels).join("text").attr("x", (l) => l.x + 8).attr("y", (l) => l.y + 4)
    .attr("font-size", 12).attr("fill", "var(--ink-2)").text((l) => l.s.name);
  const dates = [...new Set(all.map((p) => +p.date))].sort((a, b) => a - b).map((t) => new Date(t));
  const cross = svg.append("line").attr("stroke", "var(--ink-3)").attr("y1", m.t).attr("y2", H - m.b).style("display", "none");
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b).attr("fill", "transparent")
    .on("mousemove", (ev) => {
      const [mx] = d3.pointer(ev);
      const d = dates[d3.leastIndex(dates, (q) => Math.abs(x(q) - mx))];
      cross.attr("x1", x(d)).attr("x2", x(d)).style("display", null);
      const rows = series.map((s) => ({ s, p: s.values.find((p) => +p.date === +d) })).filter((r) => r.p && r.p.v != null).sort((a, b) => b.p.v - a.p.v);
      showTip(`<b>${rows[0]?.p.label ?? d.getFullYear()}</b>${rows.map((r) => `<div class="row"><span><i class="dot" style="background:${r.s.color}"></i>${r.s.name}</span><span>${fmt(r.p.v)}</span></div>`).join("")}`, ev);
    }).on("mouseleave", () => { cross.style("display", "none"); hideTip(); });
  el.insertAdjacentHTML("beforeend", `<div class="legend">${series.map((s) => `<span><i class="sw" style="background:${s.color}"></i>${s.name}</span>`).join("")}</div>`);
}

export const dateOf = (eid) => new Date(`${eid.split("_")[1]}-15`);

/** family vote-share series from {eid: {v: {fam: votes}}} */
export function familySeries(points, labelOf, minShare = 0.04) {
  const eids = Object.keys(points).sort();
  const share = (eid, f) => { const v = points[eid].v; const t = Object.values(v).reduce((a, b) => a + b, 0); return t ? (v[f] ?? 0) / t : null; };
  const fams = Object.keys(FAM).filter((f) => f !== "otros" && eids.some((e) => share(e, f) >= minShare));
  return fams.map((f) => ({ id: f, name: FAM[f].nombre, color: FAM[f].color,
    values: eids.map((e) => ({ date: dateOf(e), v: share(e, f) || null, label: labelOf(e) })) }));
}

/** Section index for a long page. SEC: [[id, name, [[subId, subName], ...]], ...] (ids without the "s-" prefix).
 *  indexHtml() gives the two pieces to put in the template; sectionIndex() wires clicks and the scroll spy. */
export function indexHtml(SEC) {
  const a = (id, n, cls = "") => `<a class="${cls}" href="${location.hash.split("/")[0] || "#inicio"}" data-s="s-${id}">${n}</a>`;
  const items = SEC.map(([id, n, sub = []]) => a(id, n) + sub.map(([sid, sn]) => a(sid, sn, "sub")).join("")).join("");
  return { row: `<div class="toc-row" id="toc-row">${items}</div>`, aside: `<aside class="toc" id="toc"><nav>${items}</nav></aside>` };
}
export function sectionIndex(app) {
  const tocs = [app.querySelector("#toc"), app.querySelector("#toc-row")];
  if (!tocs[0] || !tocs[1]) return;
  const header = document.querySelector("header.top");   // the phone row sticks right under the (two-line) header
  const placeRow = () => { tocs[1].style.top = `${header.offsetHeight}px`; };
  placeRow(); addEventListener("resize", placeRow);
  const links = tocs.flatMap((t) => [...t.querySelectorAll("a")]);
  links.forEach((a) => a.onclick = (ev) => { ev.preventDefault(); app.querySelector(`#${a.dataset.s}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  const ids = links.map((a) => a.dataset.s).filter((v, i, arr) => arr.indexOf(v) === i);
  let tick = false;
  function onScroll() {
    tick = false;
    if (!document.body.contains(tocs[0])) { removeEventListener("scroll", onScroll); return; }
    let cur = null;
    for (const id of ids) { const el = app.querySelector(`#${id}`); if (el && el.getBoundingClientRect().top <= 130) cur = id; }
    links.forEach((a) => a.classList.toggle("on", a.dataset.s === cur));
    const row = tocs[1].querySelector("a.on");   // keep the current chip in view on the phone row
    if (row && row.dataset.s !== tocs[1].dataset.last) { tocs[1].dataset.last = row.dataset.s; row.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); }
  }
  addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
}

/** Seat sums in three groups (Izquierda, Otros, Derecha); parties are chips dragged between the boxes
 *  (pointer events: mouse and touch). `at` keeps the reader's grouping when the seats are redrawn.
 *  With `draws` (prediccion_draws.json) each box also gives its 90% range and the probability of 176;
 *  `onChange(at, sumOf)` runs after every regrouping, sumOf(group) -> seats of that group in every draw. */
export function bloques(el, seats, { eid = "generales_2026-11", at = {}, draws = null, onChange = null } = {}) {
  const G = ["izquierda", "otros", "derecha"], NAME = { izquierda: "Izquierda", otros: "Otros", derecha: "Derecha" };
  const start = { pp: "derecha", vox: "derecha", salf: "derecha", cs: "derecha", ucd: "derecha", psoe: "izquierda", sumar: "izquierda", podemos: "izquierda", izq: "izquierda" };
  const fams = Object.entries(seats).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([f]) => f);
  for (const f of fams) at[f] ??= start[f] ?? "otros";
  const sumOf = (g) => {   // seats of group g in every draw
    if (!draws) return null;
    const n = draws.s[0].length, t = new Int16Array(n);
    draws.partidos.forEach((f, i) => { if (at[f] === g) for (let k = 0; k < n; k++) t[k] += draws.s[i][k]; });
    return t;
  };
  const stats = (g) => {
    const t = sumOf(g); if (!t) return "";
    const v = [...t].sort((a, b) => a - b), q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
    const pr = v.filter((x) => x >= 176).length / v.length;
    return `<div class="bq-p">de ${q(0.05)} a ${q(0.95)}${pr >= 0.005 ? ` · ${pr > 0.995 ? "más del 99" : Math.round(pr * 100)}% de llegar a 176` : ""}</div>`;
  };
  const draw = () => {
    el.innerHTML = `<div class="bloques">${G.map((g) => { const fs = fams.filter((f) => at[f] === g), tot = fs.reduce((a, f) => a + seats[f], 0);
      return `<div class="bloque" data-g="${g}"><div class="bq-h">${NAME[g]} = <b>${tot}</b>${!draws && tot >= 176 ? ' <span class="muted">· llega a 176</span>' : ""}</div>${stats(g)}<div class="bq-chips">${fs.map((f) =>
        `<span class="chip drag" data-f="${f}"><i class="dot" style="background:${fam(f).color}"></i>${famName(f, eid)} ${seats[f]}</span>`).join("")}</div></div>`; }).join("")}</div>`;
    el.querySelectorAll(".chip").forEach((c) => c.onpointerdown = (ev) => {
      ev.preventDefault();
      const ghost = c.cloneNode(true); ghost.classList.add("ghost"); document.body.appendChild(ghost);
      const dx = ev.clientX - c.getBoundingClientRect().left, dy = ev.clientY - c.getBoundingClientRect().top;
      const place = (e) => { ghost.style.left = `${e.clientX - dx}px`; ghost.style.top = `${e.clientY - dy}px`;
        const over = document.elementsFromPoint(e.clientX, e.clientY).find((x) => x.classList?.contains("bloque"));
        el.querySelectorAll(".bloque").forEach((bx) => bx.classList.toggle("over", bx === over)); return over; };
      c.classList.add("dragging"); c.setPointerCapture(ev.pointerId); place(ev);
      c.onpointermove = place;
      c.onpointerup = c.onpointercancel = (e) => { const over = place(e); ghost.remove(); c.classList.remove("dragging");
        if (over && over.dataset.g !== at[c.dataset.f]) { at[c.dataset.f] = over.dataset.g; draw(); } else el.querySelectorAll(".bloque").forEach((bx) => bx.classList.remove("over")); };
    });
    onChange?.(at, sumOf);
  };
  draw();
}
