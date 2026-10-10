const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { FAM, pct, showTip, hideTip } from "./data.js?v=0.2.11";

// left-to-right ordering used for every seat bar
export const IDEO = ["bildu", "cup", "izq", "erc", "bng", "compromis", "psoe", "pnv", "cc", "otros", "junts", "ucd", "cs", "pp", "vox"];

/** One horizontal 350-seat bar per row. rows: [{label, e: {fam: seats}, href?}] */
export function seatRows(el, rows, { total = 350, labelWidth = 120 } = {}) {
  const maj = Math.floor(total / 2) + 1;
  el.innerHTML = `<div class="seatrows">${rows.map((r) => {
    const fams = IDEO.filter((f) => r.e[f]);
    return `<div class="sr"><span class="sl" style="width:${labelWidth}px">${r.href ? `<a href="${r.href}">${r.label}</a>` : r.label}</span>
      <div class="seats" style="height:20px;flex:1">${fams.map((f) =>
        `<div data-f="${f}" data-n="${r.e[f]}" data-l="${r.label}" style="flex:${r.e[f]};background:${FAM[f].color}"></div>`).join("")}
        <span class="majority" style="left:${(maj / total) * 100}%"></span></div></div>`;
  }).join("")}</div>
  <div class="legend">${IDEO.filter((f) => rows.some((r) => r.e[f])).map((f) => `<span><i class="sw" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span>`).join("")}
  <span class="note">· línea: mayoría absoluta (${maj})</span></div>`;
  el.querySelectorAll(".seats div").forEach((d) => {
    d.onmousemove = (ev) => showTip(`<b>${d.dataset.l}</b><div class="row"><span><i class="dot" style="background:${FAM[d.dataset.f].color}"></i>${FAM[d.dataset.f].nombre}</span><span>${d.dataset.n} escaños</span></div>`, ev);
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
