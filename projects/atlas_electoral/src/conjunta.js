// The joint distribution of two groups' seats, next to the two histograms of the Modelo page (Víctor, 2026-11-17: "pintar la
// joint en otra pestaña de la figura... y en un gráfico 3D que permita rotar"). Same draws as the histograms
// (prediccion_draws.json, K0). Three views, one tab each: the two histograms (drawn by modelo.js), a heat map (x: the left
// group's seats, y: the right group's, darker = more draws) and 3D bars (height = how many draws give that pair; drag to turn
// it). P.bx/by name the groups on buttons and tooltips, P.nx/ny in sentences ("la izquierda", "el PP"). Whatever is missing up to 350 belongs to the rest. Three pairings: the blocs, PSOE / PP, PSOE / PP and Vox.
import { textos, md } from "./textos.js?v=0.2.157";
import { t, deCada, loc } from "./i18n.js?v=0.2.157";
import { showTip, hideTip } from "./data.js?v=0.2.157";
const d3 = window.d3;

const IZQ = ["psoe", "sumar", "podemos", "erc", "bildu", "pnv", "bng"], DER = ["pp", "vox", "salf"];
const PARES = {
  bloques: { x: IZQ, y: DER, bx: "Izquierda", by: "Derecha", nx: "la izquierda", ny: "la derecha", dx: "de la izquierda", dy: "de la derecha", modo: "176", cx: "#e30613", cy: "#1d84ce" },
  psoe_pp: { x: ["psoe"], y: ["pp"], bx: "PSOE", by: "PP", nx: "el PSOE", ny: "el PP", dx: "del PSOE", dy: "del PP", modo: "delante", cx: "#e30613", cy: "#1d84ce" },
  psoe_ppvox: { x: ["psoe"], y: ["pp", "vox"], bx: "PSOE", by: "PP y Vox", nx: "el PSOE", ny: "PP y Vox", dx: "del PSOE", dy: "de PP y Vox", modo: "176", cx: "#e30613", cy: "#1d84ce" },
};
const NEUTRO = "#9a9a9a";

export async function conjunta(card, DR, dibujaHist) {
  const T = await textos("modelo");
  const n = DR.s[0].length;
  const suma = (fs) => DR.s[0].map((_, i) => fs.reduce((a, f) => { const k = DR.partidos.indexOf(f); return a + (k < 0 ? 0 : DR.s[k][i]); }, 0));
  let vista = "hist", par = "bloques", ang = { yaw: -0.75, pitch: 0.95 };
  card.insertAdjacentHTML("afterbegin", `<div class="cj-ctl"><div class="seg cj-vista" role="group" aria-label="${t("Vista")}">
      <button type="button" data-v="hist">${t("Por separado")}</button><button type="button" data-v="mapa">${t("Juntos")}</button><button type="button" data-v="3d">${t("En 3D")}</button></div>
      <div class="seg cj-par" role="group" aria-label="${t("Qué grupos")}" hidden>${Object.entries(PARES).map(([k, p]) => `<button type="button" data-p="${k}">${t(p.bx)} · ${t(p.by)}</button>`).join("")}</div></div>`);
  const hist = card.querySelector("#pred-hist");
  hist.insertAdjacentHTML("afterend", '<div class="cj-panel" hidden></div><div class="cj-nota"></div>');
  const panel = card.querySelector(".cj-panel"), nota = card.querySelector(".cj-nota");

  const datos = () => {
    const P = PARES[par], X = suma(P.x), Y = suma(P.y);
    const cnt = new Map();
    for (let i = 0; i < n; i++) { const key = X[i] * 1000 + Y[i]; cnt.set(key, (cnt.get(key) ?? 0) + 1); }
    let ry = 0, rx = 0, ni = 0;
    for (let i = 0; i < n; i++) { const c = zona(P, X[i], Y[i]); if (c === P.cy) ry++; else if (c === P.cx) rx++; else ni++; }
    return { P, X, Y, cnt, ry, rx, ni };
  };
  const zona = (P, x, y) => (P.modo === "delante" ? (y > x ? P.cy : x > y ? P.cx : NEUTRO) : y >= 176 ? P.cy : x >= 176 ? P.cx : NEUTRO);
  const frec = (k) => (k * 1000 / n < 1 ? t("menos de 1 de cada 1.000") : deCada(Math.round((k * 1000) / n).toLocaleString(loc()), t("1.000")));
  const tip = (P, x, y, k) => md(T.tooltip_conjunta, { vars: { nx: t(P.bx), ny: t(P.by), x, y, otros: 350 - x - y, frecuencia: frec(k) }, page: "modelo" }).html;
  const pintaNota = (D) => {
    nota.innerHTML = vista === "hist" ? "" : md(T.conjunta, { vars: { nx: t(D.P.nx), ny: t(D.P.ny), dx: t(D.P.dx), dy: t(D.P.dy), y176: deCada(Math.round((100 * D.ry) / n), 100),
      x176: deCada(Math.round((100 * D.rx) / n), 100), ninguno: deCada(Math.round((100 * D.ni) / n), 100) }, flags: { tres: vista === "3d", delante: D.P.modo === "delante", llega: D.P.modo !== "delante" }, page: "modelo" }).html;
  };

  // heat map: one cell per seat pair, darker with more draws; the 176 lines; the colour says who reaches 176
  const mapa = (D) => {
    const { P, X, Y, cnt } = D;
    panel.innerHTML = "";
    const W = Math.max(320, Math.min(card.clientWidth || 700, 700)), H = W * 0.78, m = { t: 12, r: 14, b: 40, l: 46 };
    const pad = 4, ext = (A) => [Math.min(...A) - pad, Math.max(...A) + pad];
    const [x0, x1] = ext(X), [y0, y1] = ext(Y);
    const x = d3.scaleLinear().domain([x0, x1 + 1]).range([m.l, W - m.r]), y = d3.scaleLinear().domain([y0, y1 + 1]).range([H - m.b, m.t]);
    const max = d3.max([...cnt.values()]);
    const svg = d3.select(panel).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("class", "cj-svg");
    const cw = x(1) - x(0), ch = y(0) - y(1);
    const celdas = [...cnt].map(([key, k]) => ({ x: Math.floor(key / 1000), y: key % 1000, k }));
    svg.append("g").selectAll("rect").data(celdas).join("rect").attr("x", (d) => x(d.x)).attr("y", (d) => y(d.y + 1)).attr("width", cw + 0.3).attr("height", ch + 0.3)
      .attr("fill", (d) => zona(P, d.x, d.y)).attr("opacity", (d) => 0.12 + 0.88 * Math.sqrt(d.k / max))
      .on("mousemove", (ev, d) => showTip(tip(P, d.x, d.y, d.k), ev)).on("mouseleave", hideTip);
    const linea = (a, b, c, d2) => svg.append("line").attr("x1", a).attr("y1", b).attr("x2", c).attr("y2", d2).attr("stroke", "var(--ink)").attr("stroke-dasharray", "4 3");
    if (176 > x0 && 176 < x1) linea(x(176), m.t, x(176), H - m.b);
    if (176 > y0 && 176 < y1) linea(m.l, y(176), W - m.r, y(176));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.format("d")).tickSizeOuter(0));
    svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")).tickSizeOuter(0));
    svg.append("text").attr("x", W - m.r).attr("y", H - 6).attr("text-anchor", "end").attr("class", "cj-eje").text(t("Escaños {d}", { d: t(P.dx) }));
    svg.append("text").attr("x", m.l + 4).attr("y", m.t + 10).attr("class", "cj-eje").text(t("Escaños {d}", { d: t(P.dy) }));
  };

  // 3D bars on a canvas: x and y as in the map, height = draws; pairs grouped in squares of B seats; drag to turn
  const B = 3;
  let cv = null, barras = [], escala = {};
  const tres = (D) => {
    const { P, X, Y } = D;
    const cnt = new Map();
    for (let i = 0; i < n; i++) { const key = Math.floor(X[i] / B) * 1000 + Math.floor(Y[i] / B); cnt.set(key, (cnt.get(key) ?? 0) + 1); }
    barras = [...cnt].map(([key, k]) => ({ i: Math.floor(key / 1000), j: key % 1000, k }));
    const is = barras.map((b) => b.i), js = barras.map((b) => b.j);
    escala = { i0: Math.min(...is), i1: Math.max(...is), j0: Math.min(...js), j1: Math.max(...js), kmax: d3.max(barras, (b) => b.k), P };
    panel.innerHTML = '<canvas class="cj-3d"></canvas>';
    cv = panel.querySelector("canvas");
    const W = Math.max(320, Math.min(card.clientWidth || 700, 700)), H = Math.round(W * 0.75), r = window.devicePixelRatio || 1;
    cv.width = W * r; cv.height = H * r; cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    cv.getContext("2d").setTransform(r, 0, 0, r, 0, 0);
    let arr = null;
    cv.onpointerdown = (ev) => { arr = { x: ev.clientX, y: ev.clientY, a: { ...ang } }; cv.setPointerCapture(ev.pointerId); hideTip(); };
    cv.onpointermove = (ev) => {
      if (!arr) return;
      ang.yaw = arr.a.yaw + (ev.clientX - arr.x) * 0.01;
      ang.pitch = Math.max(0.15, Math.min(1.5, arr.a.pitch + (ev.clientY - arr.y) * 0.01));
      pinta3d();
    };
    cv.onpointerup = () => { arr = null; };
    pinta3d();
  };
  const pinta3d = () => {
    if (!cv) return;
    const ctx = cv.getContext("2d"), W = parseFloat(cv.style.width), H = parseFloat(cv.style.height);
    const { i0, i1, j0, j1, kmax, P } = escala;
    const css = getComputedStyle(document.documentElement), ink = css.getPropertyValue("--ink").trim() || "#222", line = css.getPropertyValue("--line").trim() || "#ccc";
    ctx.clearRect(0, 0, W, H);
    // world: x, y in [-1, 1] over the seat ranges, z in [0, 1.1]
    const ci = (i1 + i0 + 1) / 2, cj = (j1 + j0 + 1) / 2, s = 2 / Math.max(i1 - i0 + 1, j1 - j0 + 1);
    const cy = Math.cos(ang.yaw), sy = Math.sin(ang.yaw), cp = Math.cos(ang.pitch), sp = Math.sin(ang.pitch), f = W * 0.32;
    const pr = (x, y, z) => { const xr = x * cy - y * sy, yr = x * sy + y * cy; return [W / 2 + f * xr, H * 0.62 + f * (yr * cp - z * 1.15 * sp) * 0.9, yr * sp + z * cp]; };
    const wx = (i) => (i - ci) * s, wy = (j) => (j - cj) * s, wz = (k) => (0.85 * k) / kmax;
    // floor: the outline and the 176 lines
    const seg = (a, b, col, dash) => { ctx.beginPath(); ctx.setLineDash(dash ?? []); ctx.strokeStyle = col; const p = pr(...a), q = pr(...b); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.setLineDash([]); };
    const X0 = wx(i0), X1 = wx(i1 + 1), Y0 = wy(j0), Y1 = wy(j1 + 1);
    ctx.lineWidth = 1;
    seg([X0, Y0, 0], [X1, Y0, 0], line); seg([X1, Y0, 0], [X1, Y1, 0], line); seg([X1, Y1, 0], [X0, Y1, 0], line); seg([X0, Y1, 0], [X0, Y0, 0], line);
    const x176 = wx(176 / B), y176 = wy(176 / B);
    if (x176 > X0 && x176 < X1) seg([x176, Y0, 0], [x176, Y1, 0], ink, [4, 3]);
    if (y176 > Y0 && y176 < Y1) seg([X0, y176, 0], [X1, y176, 0], ink, [4, 3]);
    // bars, far to near (painter's order by depth)
    const w = s * 0.92;
    const caras = [];
    for (const b of barras) {
      const x = wx(b.i), y = wy(b.j), z = wz(b.k), col = zona(P, (b.i + 0.5) * B, (b.j + 0.5) * B);
      const c = [[x, y], [x + w, y], [x + w, y + w], [x, y + w]];
      const d = pr(x + w / 2, y + w / 2, z / 2)[2];
      caras.push({ d, b, col, c, z });
    }
    caras.sort((a, b) => a.d - b.d);
    for (const { col, c, z } of caras) {
      const top = c.map(([x, y]) => pr(x, y, z)), bot = c.map(([x, y]) => pr(x, y, 0));
      const cara = (pts, sh) => { ctx.beginPath(); pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = d3.color(col).darker(sh).formatHex(); ctx.fill(); };
      for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; cara([bot[k], bot[k2], top[k2], top[k]], 0.6 + 0.25 * (k % 2)); }
      cara(top, 0);
    }
    // axis labels at the floor's edges, drawn last so the bars do not hide them; each title at the far end of its row
    ctx.fillStyle = ink; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // kept inside the canvas when the turn brings a label to its edge
    const lab = (txt, p) => { const q = pr(...p), h = ctx.measureText(txt).width / 2 + 4; ctx.fillText(txt, Math.max(h, Math.min(W - h, q[0])), Math.max(10, Math.min(H - 10, q[1]))); };
    for (let v = Math.ceil((i0 * B) / 20) * 20; v <= (i1 + 1) * B; v += 20) lab(String(v), [wx(v / B), Y0 - 0.14, 0]);
    for (let v = Math.ceil((j0 * B) / 20) * 20; v <= (j1 + 1) * B; v += 20) lab(String(v), [X0 - 0.14, wy(v / B), 0]);
    ctx.font = "600 12px system-ui, sans-serif";
    lab(t("Escaños {d}", { d: t(P.dx) }), [X1 + 0.05, Y0 - 0.38, 0]);
    lab(t("Escaños {d}", { d: t(P.dy) }), [X0 - 0.38, Y1 + 0.05, 0]);
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
  };

  const pinta = () => {
    card.querySelectorAll(".cj-vista button").forEach((b) => { b.classList.toggle("on", b.dataset.v === vista); b.setAttribute("aria-pressed", b.dataset.v === vista); });
    card.querySelectorAll(".cj-par button").forEach((b) => { b.classList.toggle("on", b.dataset.p === par); b.setAttribute("aria-pressed", b.dataset.p === par); });
    card.querySelector(".cj-par").hidden = vista === "hist";
    hist.hidden = vista !== "hist"; panel.hidden = vista === "hist";
    cv = null;
    if (vista === "hist") { nota.innerHTML = ""; return; }
    const D = datos();
    (vista === "mapa" ? mapa : tres)(D);
    pintaNota(D);
  };
  card.querySelector(".cj-vista").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.v !== vista) { vista = b.dataset.v; pinta(); if (vista === "hist") dibujaHist(); } });
  card.querySelector(".cj-par").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.p !== par) { par = b.dataset.p; pinta(); } });
  pinta();
}
