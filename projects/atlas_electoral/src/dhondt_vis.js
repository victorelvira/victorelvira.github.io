import { fam, famName, IDEO } from "./charts.js?v=0.2.63";
import { showTip, hideTip } from "./data.js?v=0.2.63";

// Pieces of the D'Hondt tab other than the sand: turns (bars that split), the staircase of quotients, the
// find-the-price game, the votes that elected nobody, proportional-to-D'Hondt in three steps, and the last seats.

export const EID = "generales_2023-07";
export const THRESHOLD = 0.03;
export const fmt = { format: (x) => window.d3.format(",.0f")(x) };
export const short = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(".", ",")} M` : v >= 1e4 ? `${Math.round(v / 1000)} mil` : fmt.format(Math.round(v)));
export const pct1 = (x) => `${(100 * x).toFixed(1).replace(".", ",")}%`;
const pct2 = (x) => `${(100 * x).toFixed(2).replace(".", ",")}%`;
const ORDER = [...IDEO.slice(0, IDEO.indexOf("otros")), "reg", ...IDEO.slice(IDEO.indexOf("otros"))];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** D'Hondt with the 3% threshold, keeping every quotient: won (in award order), the first one left out and its gap. */
export function reparto(lists, seats, validos) {
  const ok = lists.map((l) => l.v > 0 && l.v >= THRESHOLD * validos);
  const q = [];
  lists.forEach((l, i) => { if (ok[i]) for (let k = 1; k <= seats + 1; k++) q.push({ i, k, q: l.v / k, v: l.v }); });
  q.sort((a, b) => b.q - a.q || b.v - a.v);
  const won = q.slice(0, seats);
  const last = won.at(-1);
  const next = q.slice(seats).find((x) => x.i !== last?.i) ?? null;
  const falta = last && next ? Math.floor(last.q * next.k - next.v) + 1 : null;   // votes the runner-up lacked
  const n = lists.map((_, i) => won.filter((w) => w.i === i).length);
  return { ok, won, last, next, falta, n, all: q };
}

/** Lists of one province: every list over 1% of valid votes (and always those over 3%), at most nine. */
export function provScenario(p) {
  const validos = p.l.reduce((a, l) => a + l[2], 0) + p.bl;
  const lists = p.l.filter((l) => l[2] >= 0.01 * validos).sort((a, b) => b[2] - a[2])
    .filter((l, j) => j < 9 || l[2] >= THRESHOLD * validos)
    .map(([name, f, v]) => ({ name: name.length > 14 ? name.split(/[-–]/)[0].trim() : name, f, color: fam(f).color, v }));
  return { lists, seats: p.esc, validos, place: p.n, hidden: p.l.length - lists.length };
}

const seatSpans = (M) => `<div class="tn-seats">${Array.from({ length: M }, () => '<i></i>').join("")}</div>`;

/* ---------------------------------------------------------------- 1. turns */

/** Every list is a bar as tall as its votes. Each turn the tallest bar wins a seat and is divided: by 2 after its
 *  first seat, by 3 after the second... `esc` gets the staircase of all quotients, lit in step. */
export function turnos(el, esc, { onStep = null } = {}) {
  const d3 = window.d3;
  el.innerHTML = `<div class="tn-chart"></div><div class="tn-seatwrap"></div>
    <div class="controls arena-ctl"><button class="play" data-a="play">Reproducir</button><button class="play" data-a="step">Siguiente turno</button>
      <button class="play" data-a="end">Ir al final</button><button class="play" data-a="reset">Repetir</button></div>
    <p class="linea tn-cap"></p>`;
  const chart = el.querySelector(".tn-chart"), cap = el.querySelector(".tn-cap"), btn = (a) => el.querySelector(`[data-a="${a}"]`);
  let S, R, n = 0, hl = -1, pending = false, playing = false, timer = null, svg, x, y, W, H;
  const M = () => S.seats;
  const counts = (k) => S.lists.map((_, i) => R.won.slice(0, k).filter((w) => w.i === i).length);
  const speed = () => ({ hl: Math.max(110, Math.min(550, 2600 / M())), mv: Math.max(160, Math.min(750, 3400 / M())) });

  function build() {
    W = Math.max(300, chart.clientWidth); H = W < 560 ? 230 : 270;
    const m = { t: 34, b: 50 };
    chart.innerHTML = "";
    svg = d3.select(chart).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
    x = d3.scaleBand().domain(d3.range(S.lists.length)).range([4, W - 4]).padding(0.28);
    y = d3.scaleLinear().domain([0, d3.max(S.lists, (l) => l.v)]).range([H - m.b, m.t]);
    svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "var(--ink-3)");
    const thr = THRESHOLD * S.validos;
    if (y(0) - y(thr) > 2) {
      svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(thr)).attr("y2", y(thr)).attr("stroke", "#c2410c").attr("stroke-dasharray", "2 4");
      svg.append("text").attr("x", W - 2).attr("y", y(thr) - 4).attr("text-anchor", "end").attr("font-size", 10).attr("fill", "#c2410c").text("3%");
    }
    const g = svg.selectAll("g.tb").data(S.lists).join("g").attr("class", "tb").attr("transform", (_, i) => `translate(${x(i)},0)`);
    g.append("rect").attr("class", "ghost").attr("width", x.bandwidth()).attr("y", (l) => y(l.v)).attr("height", (l) => y(0) - y(l.v))
      .attr("fill", (l) => l.color).attr("opacity", 0.14);
    g.append("rect").attr("class", "f").attr("width", x.bandwidth()).attr("y", (l) => y(l.v)).attr("height", (l) => y(0) - y(l.v))
      .attr("fill", (l, i) => (R.ok[i] ? l.color : "var(--nodata)")).attr("stroke-width", 3);
    g.append("text").attr("class", "dv").attr("x", x.bandwidth() / 2).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 600).attr("fill", "var(--ink)");
    g.append("text").attr("x", x.bandwidth() / 2).attr("y", y(0) + 15).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 600).attr("fill", "var(--ink)")
      .text((l) => (l.name.length > 9 && x.bandwidth() < 60 ? `${l.name.slice(0, 8)}.` : l.name));
    g.append("text").attr("x", x.bandwidth() / 2).attr("y", y(0) + 29).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "var(--ink-2)")
      .text((l, i) => (R.ok[i] ? short(l.v) : "no llega al 3%"));
    g.append("text").attr("class", "ns").attr("x", x.bandwidth() / 2).attr("y", y(0) + 43).attr("text-anchor", "middle").attr("font-size", 11).attr("font-weight", 600).attr("fill", "var(--ink)");
    el.querySelector(".tn-seatwrap").innerHTML = seatSpans(M());
  }

  function draw(dur) {
    const c = counts(n);
    const t = svg.transition().duration(dur).ease(d3.easeCubicInOut);
    svg.selectAll("g.tb").each(function (l, i) {
      const g = d3.select(this), f = l.v / (c[i] + 1), on = R.ok[i];
      g.select("rect.f").attr("stroke", i === hl ? "var(--ink)" : "none").transition(t).attr("y", y(on ? f : l.v)).attr("height", y(0) - y(on ? f : l.v));
      g.select("text.dv").text(on ? (i === hl ? `escaño ${n + 1}` : `÷${c[i] + 1}`) : "").transition(t).attr("y", y(on ? f : l.v) - 7);
      g.select("text.ns").text(c[i] ? `${c[i]} esc.` : "");
    });
    el.querySelectorAll(".tn-seats i").forEach((s, k) => { s.style.background = k < n ? S.lists[R.won[k].i].color : ""; s.classList.toggle("on", k < n); });
    escalera(esc, S, R, n);
    caption();
    const done = n >= M();
    btn("play").textContent = playing ? "Pausa" : n === 0 && !pending ? "Reproducir" : "Seguir";
    btn("play").disabled = done; btn("step").disabled = done; btn("end").disabled = done;
  }

  function caption() {
    const c = counts(n);
    if (n === 0 && hl < 0) {
      cap.innerHTML = `Cada lista empieza con una barra tan alta como sus votos. En cada turno, la barra más alta gana un escaño y se divide: entre 2 después de su primer escaño, entre 3 después del segundo… Hay ${M() === 1 ? "un escaño" : `${M()} escaños`} en juego.`;
      return;
    }
    if (hl >= 0) { const l = S.lists[hl]; cap.innerHTML = `Turno ${n + 1}: la barra más alta es la de <b>${l.name}</b>, ${fmt.format(Math.round(l.v / (c[hl] + 1)))}.`; return; }
    if (n < M()) {
      const w = R.won[n - 1], l = S.lists[w.i];
      cap.innerHTML = `Escaño ${n} para <b>${l.name}</b>. Su barra baja a ${fmt.format(l.v)} ÷ ${w.k + 1} = ${fmt.format(Math.round(l.v / (w.k + 1)))}.`;
      return;
    }
    const res = S.lists.map((l, i) => [l, R.n[i]]).filter(([, k]) => k).map(([l, k]) => `${l.name} ${k}`).join(", ");
    const nx = R.next ? ` El siguiente turno habría sido para <b>${S.lists[R.next.i].name}</b>: le faltaron ${fmt.format(R.falta)} votos.` : "";
    cap.innerHTML = `Reparto terminado: ${res}.${nx}`;
  }

  function award() {
    pending = false; hl = -1; n++;
    const { mv } = speed();
    draw(mv); onStep?.(n);
    if (playing && n < M()) timer = setTimeout(turn, mv + 120);
    else { playing = false; draw(0); }
  }
  function turn() {
    if (n >= M()) return;
    hl = R.won[n].i; pending = true; draw(0);
    timer = setTimeout(award, speed().hl);
  }
  btn("play").onclick = () => {
    playing = !playing;
    if (playing && !pending) turn(); else if (!playing) { clearTimeout(timer); if (pending) award(); }
    draw(0);
  };
  btn("step").onclick = () => { playing = false; clearTimeout(timer); if (pending) award(); else turn(); };
  btn("end").onclick = () => { playing = false; clearTimeout(timer); pending = false; hl = -1; n = M(); draw(300); onStep?.(n); };
  btn("reset").onclick = () => { clearTimeout(timer); pending = false; hl = -1; n = 0; draw(300); onStep?.(0); playing = true; timer = setTimeout(turn, 500); draw(0); };

  new ResizeObserver(() => { if (S && Math.abs(chart.clientWidth - W) > 1) { build(); draw(0); } }).observe(chart);
  return {
    set(sc, { play = true } = {}) {
      clearTimeout(timer); S = sc; R = reparto(S.lists, S.seats, S.validos);
      n = 0; hl = -1; pending = false; playing = false;
      build(); draw(0); onStep?.(0);
      if (play && !matchMedia("(prefers-reduced-motion: reduce)").matches) { playing = true; timer = setTimeout(turn, 700); draw(0); }
      else { n = M(); draw(0); onStep?.(n); }
    },
    get: () => S, result: () => R,
  };
}

/** All the quotients of the province in one row, largest first; the first `n` are lit, the cut sits after the last seat. */
function escalera(el, S, R, n) {
  const d3 = window.d3;
  const M = S.seats, q = R.all.slice(0, Math.min(R.all.length, M + Math.max(3, Math.ceil(M / 4))));
  const W = Math.max(300, el.clientWidth), H = 170, m = { t: 14, b: 26 };
  const x = d3.scaleBand().domain(d3.range(q.length)).range([0, W]).padding(0.12);
  const y = d3.scaleLinear().domain([0, q[0]?.q ?? 1]).range([H - m.b, m.t]);
  let svg = d3.select(el).select("svg");
  if (svg.empty() || +svg.attr("data-w") !== W || svg.attr("data-k") !== S.place + M) {
    el.innerHTML = "";
    svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`).attr("data-w", W).attr("data-k", S.place + M);
    svg.selectAll("rect").data(q).join("rect").attr("x", (_, j) => x(j)).attr("width", x.bandwidth())
      .attr("y", (d) => y(d.q)).attr("height", (d) => y(0) - y(d.q)).attr("fill", (d) => S.lists[d.i].color)
      .on("mousemove", (ev, d) => showTip(`<b>${S.lists[d.i].name}</b><div class="row"><span>${fmt.format(d.v)} ÷ ${d.k}</span><span>${fmt.format(Math.round(d.q))}</span></div>`, ev))
      .on("mouseleave", hideTip);
    if (x.bandwidth() >= 16) svg.selectAll("text.k").data(q).join("text").attr("class", "k").attr("x", (_, j) => x(j) + x.bandwidth() / 2).attr("y", H - m.b + 13)
      .attr("text-anchor", "middle").attr("font-size", 10).attr("fill", "var(--ink-3)").text((d) => `÷${d.k}`);
    const cx = x(M - 1) + x.bandwidth() + (x.step() - x.bandwidth()) / 2;
    if (q.length > M) {
      svg.append("line").attr("x1", cx).attr("x2", cx).attr("y1", 0).attr("y2", H - 4).attr("stroke", "#c2410c").attr("stroke-dasharray", "3 3");
      svg.append("text").attr("x", cx - 4).attr("y", 10).attr("text-anchor", "end").attr("font-size", 11).attr("fill", "var(--ink-2)").text(`${M} escaños`);
      svg.append("text").attr("x", cx + 4).attr("y", 10).attr("font-size", 11).attr("fill", "var(--ink-3)").text("fuera");
    }
  }
  svg.selectAll("rect").attr("opacity", (_, j) => (j < n ? 1 : j < M ? 0.28 : 0.12))
    .attr("stroke", (_, j) => (j === M && n >= M ? "#c2410c" : "none")).attr("stroke-width", 2).attr("stroke-dasharray", "3 2");
}

/* ---------------------------------------------------------------- 2. find the price */

/** Drag a line, the price of a seat: each list gets as many seats as whole blocks of that price fit in its votes.
 *  The reader has to find a price that hands out exactly the province's seats; any price in a whole interval does. */
export function precio(el, sc, start = null) {
  const d3 = window.d3;
  const R = reparto(sc.lists, sc.seats, sc.validos), M = sc.seats;
  const lo = R.all[M]?.q ?? 0, hi = R.last.q;            // any price in (lo, hi] gives the D'Hondt seats
  const maxV = d3.max(sc.lists, (l) => l.v);
  el.innerHTML = `<div class="pr-chart"></div><div class="tn-seatwrap">${seatSpans(M)}</div>
    <div class="controls arena-ctl"><label class="pr-range">Precio <input type="range" min="0" max="1000" step="1"/></label>
      <button class="play" data-a="show">Enséñamelo</button></div><p class="linea pr-cap"></p>`;
  const chart = el.querySelector(".pr-chart"), cap = el.querySelector(".pr-cap"), range = el.querySelector("input");
  const W = Math.max(300, chart.clientWidth), H = W < 560 ? 240 : 280, m = { t: 26, b: 34 };
  const x = d3.scaleBand().domain(d3.range(sc.lists.length)).range([4, W - 4]).padding(0.3);
  const y = d3.scaleLinear().domain([0, maxV * 1.04]).range([H - m.b, m.t]);
  const pMin = maxV / 60;
  const toRange = d3.scaleLog().domain([pMin, maxV * 1.04]).range([0, 1000]);
  let p = start ?? maxV * 1.02;
  const svg = d3.select(chart).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("line").attr("x1", 0).attr("x2", W).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "var(--ink-3)");
  const bars = svg.selectAll("g.pb").data(sc.lists).join("g").attr("class", "pb").attr("transform", (_, i) => `translate(${x(i)},0)`);
  bars.append("rect").attr("width", x.bandwidth()).attr("y", (l) => y(l.v)).attr("height", (l) => y(0) - y(l.v))
    .attr("fill", (l, i) => (R.ok[i] ? l.color : "var(--nodata)")).attr("opacity", 0.25);
  bars.append("g").attr("class", "blocks");
  bars.append("text").attr("x", x.bandwidth() / 2).attr("y", y(0) + 14).attr("text-anchor", "middle").attr("font-size", 12).attr("font-weight", 600).attr("fill", "var(--ink)")
    .text((l) => (l.name.length > 9 && x.bandwidth() < 60 ? `${l.name.slice(0, 8)}.` : l.name));
  bars.append("text").attr("class", "ns").attr("x", x.bandwidth() / 2).attr("y", y(0) + 28).attr("text-anchor", "middle").attr("font-size", 11).attr("fill", "var(--ink-2)");
  const line = svg.append("g").attr("class", "pr-line").style("cursor", "ns-resize").style("touch-action", "none");
  line.append("rect").attr("x", 0).attr("width", W).attr("y", -14).attr("height", 28).attr("fill", "transparent");
  line.append("line").attr("x1", 0).attr("x2", W).attr("stroke", "var(--ink)").attr("stroke-width", 2.5);
  line.append("rect").attr("class", "pill").attr("y", -11).attr("height", 22).attr("rx", 11).attr("fill", "var(--ink)");
  line.append("text").attr("class", "pt").attr("y", 4).attr("font-size", 12).attr("font-weight", 600).attr("fill", "var(--bg)");
  line.call(d3.drag().on("drag", (ev) => set(y.invert(ev.y))));

  function set(v, fromRange = false) {
    p = Math.max(pMin, Math.min(maxV * 1.04, v));
    if (!fromRange) range.value = toRange(p);
    const k = sc.lists.map((l, i) => (R.ok[i] ? Math.floor(l.v / p) : 0)), X = d3.sum(k), hb = y(0) - y(p);
    bars.each(function (l, i) {
      d3.select(this).select("g.blocks").selectAll("rect").data(d3.range(k[i])).join("rect")
        .attr("width", x.bandwidth()).attr("y", (j) => y(0) - (j + 1) * hb + 1).attr("height", Math.max(1, hb - 2)).attr("fill", l.color);
      d3.select(this).select("text.ns").text(k[i] ? `${k[i]} esc.` : "");
    });
    const txt = `1 escaño = ${fmt.format(Math.round(p))} votos`;
    line.attr("transform", `translate(0,${y(p)})`);
    line.select("text.pt").text(txt);
    const tw = txt.length * 6.6 + 18;
    line.select("rect.pill").attr("x", W - tw - 4).attr("width", tw);
    line.select("text.pt").attr("x", W - tw + 5);
    el.querySelectorAll(".tn-seats i").forEach((s, j) => { s.classList.toggle("on", j < X); s.classList.toggle("over", j >= M); s.style.background = ""; });
    const wrap = el.querySelector(".tn-seats");
    wrap.querySelectorAll("i.extra").forEach((e) => e.remove());
    for (let j = M; j < Math.min(X, M + 40); j++) wrap.insertAdjacentHTML("beforeend", '<i class="extra"></i>');
    if (X === M) {
      const res = sc.lists.map((l, i) => [l, k[i]]).filter(([, s]) => s).map(([l, s]) => `${l.name} ${s}`).join(", ");
      cap.innerHTML = `<b>Justo ${M}.</b> Es el reparto D'Hondt: ${res}. Cualquier precio entre ${fmt.format(Math.floor(lo) + 1)} y ${fmt.format(Math.floor(hi))} votos da este mismo reparto; el más alto es lo que costó el último escaño.`;
      cap.classList.add("ok");
    } else {
      cap.classList.remove("ok");
      cap.innerHTML = X === 0 ? `Con este precio nadie paga un escaño. Baja la línea: la provincia reparte ${M}.`
        : X < M ? `Salen ${X} de ${M}. Faltan ${M - X}: baja el precio.` : `Salen ${X}, ${X - M} de más: sube el precio.`;
    }
  }
  range.oninput = () => set(toRange.invert(+range.value), true);
  el.querySelector('[data-a="show"]').onclick = () => {
    const target = Math.sqrt(Math.max(lo, pMin) * hi) || hi;
    const i = d3.interpolate(p, target);
    d3.select(chart).transition().duration(1100).ease(d3.easeCubicInOut).tween("p", () => (t) => set(i(t)));
  };
  set(p);
  // redraw at the new width (the first layout can come before the section has its final width)
  const ro = new ResizeObserver(() => { if (!document.body.contains(chart)) ro.disconnect(); else if (Math.abs(chart.clientWidth - W) > 2) { ro.disconnect(); precio(el, sc, p); } });
  ro.observe(chart);
}

/* ---------------------------------------------------------------- 3. votes that elected nobody */

/** One dot per `unit` votes, grouped by party; grey dots went to lists that won no seat in their province. */
export function sirvio(el, dh, code) {
  const provs = dh[EID].filter((p) => !code || p.prov === code);
  const groups = new Map();
  let tot = 0, lost = 0;
  provs.forEach((p) => p.l.forEach(([name, f, v, s]) => {
    const key = code ? name : f;
    const g = groups.get(key) ?? { name: code ? name : famName(f, EID), color: fam(f).color, ok: 0, no: 0, v: 0 };
    g.v += v; if (s > 0) g.ok += v; else g.no += v;
    groups.set(key, g); tot += v; if (!s) lost += v;
  }));
  const units = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000];
  const unit = units.find((u) => tot / u <= 900) ?? 100000;
  const big = [...groups.values()].filter((g) => g.v >= unit * 2).sort((a, b) => b.v - a.v);
  const small = [...groups.values()].filter((g) => g.v < unit * 2);
  if (small.length === 1) big.push(small[0]);
  else if (small.length) big.push({ name: `Otras ${small.length} listas`, color: "#9e9e9e", ok: d3sum(small, "ok"), no: d3sum(small, "no"), v: d3sum(small, "v") });
  const place = code ? provs[0].n : "toda España";
  el.innerHTML = `<p class="linea">En ${place}, ${fmt.format(lost)} votos, el ${pct1(lost / tot)}, fueron a listas que no sacaron ningún escaño en su provincia. Cada punto son ${fmt.format(unit)} votos.</p>
    <div class="sv">${big.map((g) => {
      const a = Math.round(g.ok / unit), b = Math.round(g.no / unit);
      return `<div class="sv-row"><div class="sv-l"><i class="dot" style="background:${g.color}"></i>${g.name}<span>${g.no ? `${pct1(g.no / g.v)} sin escaño` : "todos con escaño"}</span></div>
        <div class="sv-d">${`<i style="background:${g.color}"></i>`.repeat(a)}${'<i class="no"></i>'.repeat(b)}</div></div>`;
    }).join("")}</div>`;
}
const d3sum = (a, k) => a.reduce((s, x) => s + x[k], 0);

/* ---------------------------------------------------------------- 4. proportional to D'Hondt in three steps */

function hare(v, M) {
  const t = Object.values(v).reduce((a, b) => a + b, 0), q = {}, s = {};
  for (const [k, x] of Object.entries(v)) { q[k] = (M * x) / t; s[k] = Math.floor(q[k]); }
  const left = M - Object.values(s).reduce((a, b) => a + b, 0);
  Object.keys(q).sort((a, b) => (q[b] % 1) - (q[a] % 1)).slice(0, left).forEach((k) => s[k]++);
  return s;
}
export function pasos(provs) {
  const nat = {}, real = {}, prov = {};
  provs.forEach((p) => {
    const v = {};
    p.l.forEach(([, f, x, s]) => { v[f] = (v[f] ?? 0) + x; nat[f] = (nat[f] ?? 0) + x; real[f] = (real[f] ?? 0) + s; });
    for (const [f, s] of Object.entries(hare(v, p.esc))) prov[f] = (prov[f] ?? 0) + s;
  });
  return { votes: nat, steps: [hare(nat, 350), prov, real] };
}

/** A 350-seat hemicycle that recolours as the reader moves from a national proportional split to provincial
 *  proportional to the real D'Hondt result, plus the table of what each step gives or takes. */
export function partes(el, provs) {
  const d3 = window.d3;
  const { votes, steps } = pasos(provs);
  const fams = ORDER.filter((f) => steps.some((s) => s[f]));
  const NAMES = ["Proporcional en toda España", "Proporcional en cada provincia", "D'Hondt, el resultado real"];
  const CAP = ["Los 350 escaños repartidos en proporción a los votos de toda España, como si fuera una sola circunscripción.",
    "Cada provincia reparte sus escaños en proporción exacta a sus votos, sin barrera. Aquí ya pesan el tamaño de las provincias y que no hay medios escaños.",
    "El resultado de julio de 2023: D'Hondt y la barrera del 3% en cada provincia."];
  el.innerHTML = `<div class="controls"><span class="seg" id="pt-seg">${NAMES.map((n, i) => `<button data-i="${i}">${n}</button>`).join("")}</span>
    <button class="play" id="pt-play">Ver los tres pasos</button></div>
    <div class="pt-hemi"></div><p class="linea pt-cap"></p><div class="legend pt-leg"></div>
    <div class="scrollx"><table class="pt-tab"><tr><th>Partido</th><th class="num">Votos</th><th class="num">España</th><th class="num">Provincias</th><th class="num">D'Hondt</th><th class="num">Por las provincias</th><th class="num">Por la fórmula</th></tr>
    ${fams.filter((f) => f !== "otros").sort((a, b) => votes[b] - votes[a]).map((f) => {
      const [a, b, c] = steps.map((s) => s[f] ?? 0), d1 = b - a, d2 = c - b;
      const sg = (d) => `<td class="num ${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+" : d < 0 ? "−" : ""}${Math.abs(d)}</td>`;
      return `<tr><td><i class="dot" style="background:${fam(f).color}"></i>${famName(f, EID)}</td><td class="num">${pct1(votes[f] / d3.sum(Object.values(votes)))}</td><td class="num">${a}</td><td class="num">${b}</td><td class="num">${c}</td>${sg(d1)}${sg(d2)}</tr>`;
    }).join("")}</table></div>`;
  // hemicycle: rows of seats whose count grows with the radius, ordered by angle from left to right
  const W = 560, H = 300, cx = W / 2, cy = H - 10, R1 = 270, R0 = 110, rows = 11;
  const radii = d3.range(rows).map((r) => R0 + ((R1 - R0) * r) / (rows - 1));
  let per = radii.map((r) => Math.round((350 * r) / d3.sum(radii)));
  per[rows - 1] += 350 - d3.sum(per);
  const pts = [];
  radii.forEach((r, ri) => { for (let j = 0; j < per[ri]; j++) { const a = Math.PI - (Math.PI * j) / (per[ri] - 1); pts.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }); } });
  pts.sort((p, q) => q.a - p.a);
  const svg = d3.select(el.querySelector(".pt-hemi")).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  const dots = svg.selectAll("circle").data(pts).join("circle").attr("cx", (p) => p.x).attr("cy", (p) => p.y).attr("r", 6.2).attr("fill", "var(--nodata)");
  const big = svg.append("text").attr("x", cx).attr("y", cy - 30).attr("text-anchor", "middle").attr("font-size", 15).attr("font-weight", 600).attr("fill", "var(--ink)");
  let cur = -1;
  function show(i, dur = 900) {
    cur = i;
    const s = steps[i], colors = [];
    fams.forEach((f) => { for (let k = 0; k < (s[f] ?? 0); k++) colors.push(fam(f).color); });
    dots.transition().duration(dur).delay((_, j) => (dur ? j * 1.2 : 0)).attr("fill", (_, j) => colors[j] ?? "var(--nodata)");
    el.querySelectorAll("#pt-seg button").forEach((b) => b.classList.toggle("on", +b.dataset.i === i));
    el.querySelector(".pt-cap").textContent = CAP[i];
    big.text(NAMES[i]);
    el.querySelector(".pt-leg").innerHTML = fams.filter((f) => s[f]).map((f) => {
      const d = i ? (s[f] ?? 0) - (steps[i - 1][f] ?? 0) : 0;
      return `<span><i class="sw" style="background:${fam(f).color}"></i>${famName(f, EID)} ${s[f]}${d ? ` <span class="${d > 0 ? "up" : "down"}">(${d > 0 ? "+" : "−"}${Math.abs(d)})</span>` : ""}</span>`;
    }).join("");
  }
  el.querySelectorAll("#pt-seg button").forEach((b) => b.onclick = () => show(+b.dataset.i));
  el.querySelector("#pt-play").onclick = async () => { show(0, 0); await wait(1600); show(1); await wait(2600); show(2); };
  show(2, 0);
  // play the three steps once, the first time the hemicycle scrolls into view
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); el.querySelector("#pt-play").click(); } }, { threshold: 0.6 })
    .observe(el.querySelector(".pt-hemi"));
}

/* ---------------------------------------------------------------- 5. last seats */

/** Every province's last seat: who took it, who was next, and how many votes the next one lacked. */
export function aire(el, provs, { onPick = null } = {}) {
  const rows = provs.map((p) => {
    const sc = { lists: p.l.map(([name, f, v]) => ({ name, f, v, color: fam(f).color })), seats: p.esc };
    const val = p.l.reduce((a, l) => a + l[2], 0) + p.bl;
    const R = reparto(sc.lists, sc.seats, val);
    if (!R.next) return null;
    return { prov: p.prov, n: p.n, esc: p.esc, win: sc.lists[R.last.i], lose: sc.lists[R.next.i], falta: R.falta, share: R.falta / val };
  }).filter(Boolean).sort((a, b) => a.share - b.share);
  const max = Math.min(0.05, rows.at(-1).share);
  let all = false;
  function draw() {
    const shown = all ? rows : rows.slice(0, 12);
    el.innerHTML = `<div class="ai">${shown.map((r) => `<a class="ai-row" href="#dhondt" data-p="${r.prov}">
      <span class="ai-n">${r.n} <small>${r.esc} esc.</small></span>
      <span class="ai-bar"><i style="width:${Math.max(0.6, (100 * Math.min(r.share, max)) / max)}%"></i></span>
      <span class="ai-t"><b>${fmt.format(r.falta)} votos</b> (${pct2(r.share)}) <i class="dot" style="background:${r.win.color}"></i>${r.win.name} se lleva el último y <i class="dot" style="background:${r.lose.color}"></i>${r.lose.name} se queda fuera</span></a>`).join("")}</div>
      <p class="note">${all ? "" : `<button class="play" id="ai-all">Ver las ${rows.length} provincias</button> · `}Pulsa una provincia para verla por turnos arriba.</p>`;
    el.querySelector("#ai-all")?.addEventListener("click", () => { all = true; draw(); });
    el.querySelectorAll(".ai-row").forEach((a) => a.onclick = (ev) => { ev.preventDefault(); onPick?.(a.dataset.p); });
  }
  draw();
}
