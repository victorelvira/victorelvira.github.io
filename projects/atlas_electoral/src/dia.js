// "Cómo vamos, día a día" on the front page (Víctor, 2026-11-18: "un plot claro en portada de cómo vamos día a día, muy limpio,
// con zoom en las últimas 2 semanas y posibilidad de periodos más largos, y también la última semana").
// Data: historia_nuestra.json (pipeline/historia_nuestra.py): «Nuestra predicción» re-run for every past day with only the polls
// known then and today's model; daily from 1 Sep 2026, weekly before. Two views: "Bloques", PP + Vox and the 2023 investiture
// bloc (medians, each with the band of 9 in 10 simulations, and the 176 line; Víctor's notes 10 and 11, 2026-11-18), and the
// seats of each party (medians). Ranges: last week, 2 weeks (default), month, 3 months, all.
import { showTip, hideTip, load } from "./data.js?v=0.2.178";
import { textos, md } from "./textos.js?v=0.2.178";
import { t, deCada, loc } from "./i18n.js?v=0.2.178";
import { partyName, partyColor } from "./encuestas.js?v=0.2.178";

const RANGOS = [["7", 7, "Última semana"], ["14", 14, "2 semanas"], ["30", 30, "1 mes"], ["90", 90, "3 meses"], ["todo", 0, "Todo"]];
const PARTIDOS = ["pp", "psoe", "vox", "sumar"];
const KEY = "atlas_electoral.dia";   // the reader's last range and view (a convenience: works without it)
const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const guardar = (x) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* private window */ } };

export async function diaADia(el) {
  const [T, H] = await Promise.all([textos("portada"), load("historia_nuestra.json")]);
  const D = (H.dias ?? []).map((x) => ({ ...x, d: new Date(`${x.f}T12:00`) }));
  if (D.length < 2) { el.remove(); return; }
  const prev = leer();
  let rango = RANGOS.some(([k]) => k === prev.rango) ? prev.rango : "14", vista = prev.vista === "partidos" ? "partidos" : "bloque";
  const fecha = (d, largo) => d.toLocaleDateString(loc(), largo ? { day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short" });
  const freq = (p) => (p >= 0.995 ? t("más de 99 de cada 100") : p < 0.005 ? t("menos de 1 de cada 100") : deCada(Math.round(p * 100), 100));
  el.innerHTML = `${md(T.dia_titulo, { page: "portada" }).html}
    <div class="dia-ctl"><div class="seg" role="group" aria-label="${t("Periodo")}">${RANGOS.map(([k, , n]) => `<button type="button" data-r="${k}">${t(n)}</button>`).join("")}</div>
    <div class="seg" role="group" aria-label="${t("Qué mostrar")}"><button type="button" data-v="bloque">${t("Bloques")}</button><button type="button" data-v="partidos">${t("Por partido")}</button></div></div>
    <div class="dia-frase"></div><div class="chart dia-chart"></div><div class="dia-nota"></div>`;
  const ch = el.querySelector(".dia-chart"), frase = el.querySelector(".dia-frase"), nota = el.querySelector(".dia-nota");

  const pinta = () => {
    el.querySelectorAll("[data-r]").forEach((b) => { b.classList.toggle("on", b.dataset.r === rango); b.setAttribute("aria-pressed", b.dataset.r === rango); });
    el.querySelectorAll("[data-v]").forEach((b) => { b.classList.toggle("on", b.dataset.v === vista); b.setAttribute("aria-pressed", b.dataset.v === vista); });
    const dias = RANGOS.find(([k]) => k === rango)[1];
    const fin = D.at(-1).d, ini = dias ? new Date(+fin - dias * 864e5) : D[0].d;
    const xs = D.filter((x) => x.d >= ini);
    const a = xs[0], b = xs.at(-1);
    frase.innerHTML = md(T.dia_frase, { vars: { desde: fecha(a.d, dias === 0), antes: freq(a.p176), hoy: freq(b.p176), esc_antes: a.ppvox[1], esc_hoy: b.ppvox[1],
      inv_antes: a.inv ? freq(a.p176_inv) : "", inv_hoy: b.inv ? freq(b.p176_inv) : "" },
      flags: { igual: Math.round(a.p176 * 100) === Math.round(b.p176 * 100) }, page: "portada" }).html;
    nota.innerHTML = md(T.dia_nota, { vars: { diario_desde: fecha(new Date(`${H.diario_desde}T12:00`), true) }, flags: { semanal: dias === 0 || dias > 78 }, page: "portada" }).html;
    dibuja(ch, xs, vista, fecha, freq, dias);
    guardar({ rango, vista });
  };
  el.addEventListener("click", (ev) => {
    const r = ev.target.closest("[data-r]"), v = ev.target.closest("[data-v]");
    if (r && r.dataset.r !== rango) { rango = r.dataset.r; pinta(); }
    if (v && v.dataset.v !== vista) { vista = v.dataset.v; pinta(); }
  });
  pinta();
  // redraw at the new width when the column changes size (rotation, the desktop grid)
  let w0 = ch.clientWidth;
  new ResizeObserver(() => { if (Math.abs(ch.clientWidth - w0) > 20) { w0 = ch.clientWidth; pinta(); } }).observe(ch);
}

function dibuja(el, xs, vista, fecha, freq, dias) {
  el.innerHTML = "";
  const bloques = vista === "bloque";
  const W = Math.max(300, Math.round(el.clientWidth || 600)), H = bloques ? 240 : 210, m = { t: 12, r: bloques ? 120 : 92, b: 24, l: 34 };
  const x = d3.scaleTime().domain(d3.extent(xs, (p) => p.d)).range([m.l, W - m.r]);
  const series = bloques
    ? [{ id: "ppvox", name: t("PP y Vox"), color: "#1d84ce", v: (p) => p.ppvox[1], lo: (p) => p.ppvox[0], hi: (p) => p.ppvox[2], p: (p) => p.p176 },
      { id: "inv", name: t("Investidura 2023"), color: "#e30613", v: (p) => p.inv?.[1] ?? null, lo: (p) => p.inv?.[0] ?? null, hi: (p) => p.inv?.[2] ?? null, p: (p) => p.p176_inv }]
    : PARTIDOS.map((f) => ({ id: f, name: partyName(f, "2026"), color: partyColor(f), v: (p) => p.esc[f]?.[1] ?? null }));
  const vals = xs.flatMap((p) => series.flatMap((s) => [s.v(p), s.lo?.(p), s.hi?.(p)])).filter((v) => v != null);
  const lo = bloques ? Math.min(165, d3.min(vals) - 4) : 0, hi = bloques ? Math.max(185, d3.max(vals) + 4) : d3.max(vals) * 1.08;
  const y = d3.scaleLinear().domain([lo, hi]).nice().range([H - m.b, m.t]);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("role", "img")
    .attr("aria-label", bloques ? t("Escaños de los bloques, día a día") : t("Escaños por partido, día a día"));
  svg.append("g").attr("class", "grid").selectAll("line").data(y.ticks(5)).join("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y).attr("y2", y);
  const nt = dias && dias <= 14 ? Math.min(xs.length, Math.max(3, Math.floor(W / 70))) : Math.max(3, Math.floor(W / 90));
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`)
    .call(d3.axisBottom(x).ticks(nt).tickFormat((d) => (dias === 0 ? d.toLocaleDateString(loc(), { month: "short", year: "2-digit" }) : fecha(d))).tickSizeOuter(0))
    .call((g) => g.select(".domain").remove());
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(0)).call((g) => g.select(".domain").remove());
  if (bloques) {
    for (const s of series) {
      const ok = xs.filter((p) => s.lo(p) != null);
      svg.append("path").attr("d", d3.area().x((p) => x(p.d)).y0((p) => y(s.lo(p))).y1((p) => y(s.hi(p)))(ok)).attr("fill", s.color).attr("opacity", 0.12);
    }
    svg.append("line").attr("class", "dia-176").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(176)).attr("y2", y(176));
    svg.append("text").attr("class", "dia-176-t").attr("x", m.l + 4).attr("y", y(176) - 4).text(t("176, mayoría"));
  }
  const pts = xs.length <= 31;
  const fin = [];
  for (const s of series) {
    svg.append("path").attr("d", d3.line().defined((p) => s.v(p) != null).x((p) => x(p.d)).y((p) => y(s.v(p)))(xs))
      .attr("fill", "none").attr("stroke", s.color).attr("stroke-width", 2).attr("stroke-linejoin", "round");
    if (pts) svg.append("g").selectAll("circle").data(xs.filter((p) => s.v(p) != null)).join("circle").attr("cx", (p) => x(p.d)).attr("cy", (p) => y(s.v(p)))
      .attr("r", 3).attr("fill", s.color).attr("stroke", "var(--surface)").attr("stroke-width", 1.5);
    const l = xs.at(-1);
    if (s.v(l) != null) fin.push({ y: y(s.v(l)), txt: `${s.name} ${s.v(l)}` });
  }
  fin.sort((a, b) => a.y - b.y).forEach((f, i, a) => { if (i && f.y - a[i - 1].y < 14) f.y = a[i - 1].y + 14; });   // labels never overlap
  svg.append("g").selectAll("text").data(fin).join("text").attr("class", "dia-lab").attr("x", W - m.r + 6).attr("y", (f) => f.y + 4).text((f) => f.txt);
  // crosshair and tooltip, on the nearest day
  const cross = svg.append("line").attr("stroke", "var(--ink-3)").attr("y1", m.t).attr("y2", H - m.b).style("display", "none");
  const tip = (ev) => {
    const [mx] = d3.pointer(ev);
    const p = xs[d3.leastIndex(xs, (q) => Math.abs(x(q.d) - mx))];
    cross.attr("x1", x(p.d)).attr("x2", x(p.d)).style("display", null);
    const filas = bloques
      ? series.filter((s) => s.v(p) != null).map((s) => `<div class="row"><span><i class="dot" style="background:${s.color}"></i>${s.name}</span><span>${s.v(p)} (${s.lo(p)}–${s.hi(p)})</span></div><div class="row"><span>${t("Llegan a 176")}</span><span>${freq(s.p(p))}</span></div>`).join("")
        + `<div class="row"><span>${t("Entre paréntesis, 9 de cada 10 simulaciones")}</span></div>`
      : series.filter((s) => s.v(p) != null).map((s) => `<div class="row"><span><i class="dot" style="background:${s.color}"></i>${s.name}</span><span>${s.v(p)}</span></div>`).join("");
    showTip(`<b>${fecha(p.d, true)}</b>${filas}`, ev);
  };
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", W - m.l - m.r).attr("height", H - m.t - m.b).attr("fill", "transparent")
    .on("mousemove", tip).on("click", tip).on("mouseleave", () => { cross.style("display", "none"); hideTip(); });
}
