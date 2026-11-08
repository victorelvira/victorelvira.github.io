import { load, showTip, hideTip } from "./data.js?v=0.2.62";
import { indexHtml, sectionIndex } from "./charts.js?v=0.2.62";
import { EID, THRESHOLD, fmt, short, pct1, reparto, provScenario, turnos, precio, sirvio, partes, aire } from "./dhondt_vis.js?v=0.2.62";

// The D'Hondt tab. This module: the sand widget (votes fall as sand into one jar per list; a line (the price of a seat) comes down from the top
// and every time it touches a mark (all the votes, half, a third...) that list wins a seat. Same result as the
// table of quotients: a divisor method. Data: the July 2023 general election, province by province.

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const FRAC = ["", "todos sus votos", "la mitad de sus votos", "un tercio de sus votos", "un cuarto de sus votos", "un quinto de sus votos",
  "un sexto de sus votos", "un séptimo de sus votos", "un octavo de sus votos", "un noveno de sus votos", "un décimo de sus votos"];
const frac = (k) => FRAC[k] ?? `1/${k} de sus votos`;

/** The sand widget. set(scenario) loads {lists: [{name, color, v}], seats, validos, cap?, place?};
 *  editable: drag a jar's sand to change its votes. onStep(n) runs after every seat awarded. */
export function arena(el, { editable = false, onStep = null, onEdit = null } = {}) {
  el.innerHTML = `<div class="arena"><canvas></canvas></div>
    <div class="controls arena-ctl"><button class="play" data-a="play">Reproducir</button>
      <button class="play" data-a="step">Siguiente escaño</button><button class="play" data-a="end">Ir al final</button>
      <button class="play" data-a="reset">Repetir</button></div>
    <p class="linea arena-cap"></p>`;
  const cv = el.querySelector("canvas"), ctx = cv.getContext("2d"), capEl = el.querySelector(".arena-cap");
  const btn = (a) => el.querySelector(`[data-a="${a}"]`);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let S, R, L, A, raf = 0, last = 0;

  // ---- layout (CSS pixels) ----
  function layout() {
    const W = Math.max(300, el.clientWidth);
    const n = S.lists.length;
    const padL = 24, slot = (W - padL) / n;
    const jw = Math.min(slot * 0.62, 84);
    const top = 36, JH = W < 560 ? 210 : 250;
    const bottom = top + JH;
    const r = 8, per = Math.max(1, Math.floor((W - 20) / (2 * r + 5)));
    const rows = Math.ceil(S.seats / per);
    const seatTop = bottom + 52;
    const H = seatTop + rows * (2 * r + 5) + 8;
    const dpr = devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = `${W}px`; cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    L = { W, H, padL, slot, jw, top, JH, bottom, r, per, seatTop };
  }
  const jx = (i) => L.padL + L.slot * (i + 0.5);
  const yOf = (v) => L.bottom - (v / S.cap) * L.JH;
  function seatXY(s) {
    const row = Math.floor(s / L.per), col = s % L.per;
    const inRow = Math.min(L.per, S.seats - row * L.per), w = inRow * (2 * L.r + 5) - 5;
    return [(L.W - w) / 2 + L.r + col * (2 * L.r + 5), L.seatTop + L.r + row * (2 * L.r + 5)];
  }

  // ---- state ----
  function fresh(phase) {
    const G = 900, tot = S.lists.reduce((a, l) => a + l.v, 0) || 1;
    A = { phase, playing: false, ft: 0, grains: [], spawned: S.lists.map(() => 0), landed: S.lists.map(() => 0),
      totG: S.lists.map((l) => Math.max(l.v > 0 ? 8 : 0, Math.round((G * l.v) / tot))),
      n: 0, h: phase === "fill" ? null : S.cap, tween: null, tokens: [], pauseUntil: 0, stepOnly: false };
  }
  function toEnd() {
    A.phase = "done"; A.grains = []; A.tokens = []; A.tween = null; A.playing = false;
    A.n = R.won.length; A.h = R.last ? R.last.q : S.cap; A.landed = [...A.totG];
    onStep?.(A.n); caption(); buttons(); draw();
  }
  const busy = () => A.playing || A.tween || A.tokens.length || A.grains.length;

  function award(t) {
    const w = R.won[A.n];
    A.tokens.push({ i: w.i, slot: A.n, x0: jx(w.i) - L.jw / 2, y0: yOf(w.q), t0: t });
    A.n++;
    A.pauseUntil = t + pauseMs();
    if (A.stepOnly) { A.playing = false; A.stepOnly = false; }
    onStep?.(A.n); caption(); buttons();
  }
  const durMs = () => Math.max(160, Math.min(800, 3600 / S.seats));
  const pauseMs = () => Math.max(60, Math.min(420, 1800 / S.seats));
  function startTween(t) {
    A.tween = { from: A.h, to: R.won[A.n].q, t0: t, dur: durMs() };
  }

  function update(t, dt) {
    if (A.phase === "fill") {
      if (A.playing) {
        A.ft += dt;
        const T = 2200;
        S.lists.forEach((l, i) => {
          const due = Math.min(A.totG[i], Math.floor((A.ft / T) * A.totG[i]));
          for (; A.spawned[i] < due; A.spawned[i]++)
            A.grains.push({ i, x: jx(i) + (Math.random() - 0.5) * L.jw * 0.8, y: -Math.random() * 30, vy: 60 + Math.random() * 80 });
        });
      }
      const g = 1700;
      A.grains = A.grains.filter((p) => {
        p.vy += (g * dt) / 1000; p.y += (p.vy * dt) / 1000;
        if (p.y >= yOf(fillV(p.i)) - 2) { A.landed[p.i]++; return false; }
        return true;
      });
      if (A.spawned.every((s, i) => s >= A.totG[i]) && !A.grains.length) {
        A.landed = [...A.totG]; A.phase = "cut"; A.h = S.cap; A.pauseUntil = t + 500; caption(); buttons();
      }
      return;
    }
    if (A.tween) {
      const p = Math.min(1, (t - A.tween.t0) / A.tween.dur), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      A.h = A.tween.from + (A.tween.to - A.tween.from) * e;
      if (p >= 1) { A.h = A.tween.to; A.tween = null; award(t); }
    } else if (A.playing && A.n < R.won.length && t >= A.pauseUntil) startTween(t);
    A.tokens = A.tokens.filter((k) => t - k.t0 < 520);
    if (A.n >= R.won.length && !A.tween && !A.tokens.length && A.phase === "cut") {
      A.phase = "done"; A.playing = false; caption(); buttons();
    }
  }
  const fillV = (i) => (A.phase === "fill" ? (S.lists[i].v * A.landed[i]) / (A.totG[i] || 1) : S.lists[i].v);

  // ---- drawing ----
  function speckles(i, x0, y0, w, h, col) {
    // fixed pseudo-random grains on the sand, so it reads as sand and does not flicker
    ctx.fillStyle = col;
    const n = Math.floor((w * h) / 55);
    for (let j = 0; j < n; j++) {
      const a = Math.sin((i + 1) * 12.9898 + j * 78.233) * 43758.5453, b = Math.sin((i + 1) * 39.346 + j * 11.135) * 24634.6345;
      ctx.fillRect(x0 + (a - Math.floor(a)) * w, y0 + (b - Math.floor(b)) * h, 1.3, 1.3);
    }
  }
  function draw(t = performance.now()) {
    const ink = css("--ink"), ink3 = css("--ink-3"), line = css("--line"), surf = css("--surface");
    ctx.clearRect(0, 0, L.W, L.H);
    ctx.font = "11px system-ui, sans-serif"; ctx.textBaseline = "middle";
    const counts = S.lists.map((_, i) => R.won.slice(0, A.n).filter((w) => w.i === i).length);

    S.lists.forEach((l, i) => {
      const cx = jx(i), x0 = cx - L.jw / 2, v = fillV(i), ytop = yOf(v);
      // sand: faded where it has not bought a seat yet, full colour in blocks of one seat price
      if (v > 0) {
        const mound = A.phase === "fill" && A.landed[i] < A.totG[i] ? 4 : 0;
        ctx.save(); ctx.beginPath();
        ctx.moveTo(x0, L.bottom); ctx.lineTo(x0, ytop + mound);
        ctx.quadraticCurveTo(cx, ytop - mound, x0 + L.jw, ytop + mound); ctx.lineTo(x0 + L.jw, L.bottom); ctx.closePath(); ctx.clip();
        ctx.globalAlpha = R.ok[i] || A.phase === "fill" ? (A.h == null ? 0.9 : 0.32) : 0.22;
        ctx.fillStyle = l.color; ctx.fillRect(x0, ytop - mound, L.jw, L.bottom - ytop + mound);
        ctx.globalAlpha = 1;
        if (A.h != null && R.ok[i] && counts[i]) {
          const hb = (A.h / S.cap) * L.JH;
          ctx.fillStyle = l.color; ctx.fillRect(x0, L.bottom - counts[i] * hb, L.jw, counts[i] * hb);
          ctx.strokeStyle = surf; ctx.lineWidth = 2;
          for (let k = 1; k < counts[i]; k++) { const y = L.bottom - k * hb; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + L.jw, y); ctx.stroke(); }
        }
        speckles(i, x0, ytop - mound, L.jw, L.bottom - ytop + mound, "rgba(255,255,255,.28)");
        speckles(i + 50, x0, ytop - mound, L.jw, L.bottom - ytop + mound, "rgba(0,0,0,.16)");
        ctx.restore();
      }
      // the jar
      ctx.strokeStyle = ink3; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(x0 - 3, L.top - 4); ctx.lineTo(x0, L.top); ctx.lineTo(x0, L.bottom - 4); ctx.quadraticCurveTo(x0, L.bottom, x0 + 4, L.bottom);
      ctx.lineTo(x0 + L.jw - 4, L.bottom); ctx.quadraticCurveTo(x0 + L.jw, L.bottom, x0 + L.jw, L.bottom - 4); ctx.lineTo(x0 + L.jw, L.top); ctx.lineTo(x0 + L.jw + 3, L.top - 4);
      ctx.stroke();
      if (A.phase !== "fill" && !R.ok[i] && l.v > 0) {
        ctx.fillStyle = ink3; ctx.textAlign = "center"; ctx.fillText("no llega", cx, Math.min(ytop, L.bottom - 16) - 18); ctx.fillText("al 3%", cx, Math.min(ytop, L.bottom - 16) - 6);
      }
      // the marks: all its votes, half, a third... (only once the line is out)
      if (A.h != null && R.ok[i]) {
        const kmax = R.n[i] + 1;
        let lastY = -99;
        for (let k = 1; k <= kmax; k++) {
          const y = yOf(l.v / k), hit = k <= counts[i];
          if (L.bottom - y < 3) break;
          ctx.strokeStyle = hit ? ink : ink3; ctx.lineWidth = hit ? 2 : 1; ctx.setLineDash(hit ? [] : [3, 3]);
          ctx.beginPath(); ctx.moveTo(x0 - 6, y); ctx.lineTo(x0 + L.jw, y); ctx.stroke(); ctx.setLineDash([]);
          if (y - lastY >= 11 && L.slot - L.jw > 26) { ctx.fillStyle = hit ? ink : ink3; ctx.textAlign = "right"; ctx.fillText(`÷${k}`, x0 - 8, y); lastY = y; }
        }
      }
      // name, votes and seats under the jar
      ctx.textAlign = "center"; ctx.fillStyle = ink;
      ctx.font = "600 12px system-ui, sans-serif";
      const name = l.name.length > 9 && L.slot < 80 ? `${l.name.slice(0, 8)}.` : l.name;
      ctx.fillText(name, cx, L.bottom + 13);
      ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = css("--ink-2");
      ctx.fillText(short(l.v), cx, L.bottom + 27);
      if (A.h != null && counts[i]) { ctx.fillStyle = ink; ctx.font = "600 11px system-ui, sans-serif"; ctx.fillText(`${counts[i]} esc.`, cx, L.bottom + 41); ctx.font = "11px system-ui, sans-serif"; }
      if (editable) {   // a grip on the sand: drag it
        const gy = Math.max(L.top + 4, ytop);
        ctx.fillStyle = surf; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(cx - 14, gy - 5, 28, 10, 5); ctx.fill(); ctx.stroke();
        ctx.beginPath(); for (const d of [-5, 0, 5]) { ctx.moveTo(cx + d, gy - 2); ctx.lineTo(cx + d, gy + 2); } ctx.stroke();
      }
    });

    // the 3% threshold
    const thY = yOf(THRESHOLD * S.validos);
    if (L.bottom - thY > 2) {
      ctx.strokeStyle = "#c2410c"; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(0, thY); ctx.lineTo(L.W, thY); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#c2410c"; ctx.textAlign = "right"; ctx.font = "10px system-ui, sans-serif"; ctx.fillText("3%", L.W - 2, thY - 7);
    }
    // the price line; its value sits in a badge at the top right
    if (A.h != null) {
      const y = Math.max(L.top - 10, yOf(A.h));
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L.W, y); ctx.stroke();
      if (A.h < S.cap * 0.999) {
        const txt = `1 escaño = ${fmt.format(Math.round(A.h))} votos`;
        ctx.font = "600 12px system-ui, sans-serif"; const w = ctx.measureText(txt).width + 26;
        const lx = L.W - w - 6, ly = 12;
        ctx.fillStyle = ink; ctx.beginPath(); ctx.roundRect(lx, ly - 10, w, 20, 10); ctx.fill();
        ctx.fillRect(lx + 7, ly - 2, 12, 2.5);
        ctx.fillStyle = css("--bg"); ctx.textAlign = "left"; ctx.fillText(txt, lx + 22, ly);
        ctx.font = "11px system-ui, sans-serif";
      }
    }
    // the runner-up, once the seats are out
    if (A.phase === "done" && R.next) {
      const x0 = jx(R.next.i) - L.jw / 2, y = yOf(R.next.q);
      ctx.strokeStyle = "#c2410c"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 - 6, y); ctx.lineTo(x0 + L.jw, y); ctx.stroke();
    }
    // falling grains
    A.grains.forEach((p) => { ctx.fillStyle = S.lists[p.i].color; ctx.fillRect(p.x, p.y, 2.2, 2.2); });
    // the province's seats, in the order they are won
    for (let s = 0; s < S.seats; s++) {
      const [x, y] = seatXY(s);
      const flying = A.tokens.some((k) => k.slot === s);
      ctx.beginPath(); ctx.arc(x, y, L.r, 0, 2 * Math.PI);
      if (s < A.n && !flying) { ctx.fillStyle = S.lists[R.won[s].i].color; ctx.fill(); }
      else { ctx.strokeStyle = line; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    A.tokens.forEach((k) => {
      const p = Math.min(1, (t - k.t0) / 500), [x1, y1] = seatXY(k.slot);
      const x = k.x0 + (x1 - k.x0) * p, y = k.y0 + (y1 - k.y0) * p - Math.sin(p * Math.PI) * 40;
      ctx.beginPath(); ctx.arc(x, y, L.r * (1 + 0.4 * Math.sin(p * Math.PI)), 0, 2 * Math.PI);
      ctx.fillStyle = S.lists[k.i].color; ctx.fill(); ctx.strokeStyle = surf; ctx.lineWidth = 1.5; ctx.stroke();
    });
  }

  // ---- text and buttons ----
  function caption() {
    const place = S.place ? ` en ${S.place}` : "";
    if (A.phase === "fill") { capEl.innerHTML = `Cae la arena: cada grano son votos. La altura de cada bote es lo que votó cada lista${place}.`; return; }
    if (A.n === 0) {
      capEl.innerHTML = `Ahora baja una línea, el precio de un escaño. Cada vez que toca una marca de un bote (todos sus votos, la mitad, un tercio…), esa lista gana un escaño. Hay ${S.seats === 1 ? "un escaño" : `${S.seats} escaños`} en juego.`;
      return;
    }
    if (A.phase !== "done") {
      const w = R.won[A.n - 1], l = S.lists[w.i];
      capEl.innerHTML = `Escaño ${A.n} de ${S.seats}: <b>${l.name}</b>. La línea toca ${frac(w.k)} (${fmt.format(l.v)} ÷ ${w.k} = ${fmt.format(Math.round(w.q))}).`;
      return;
    }
    const res = S.lists.map((l, i) => [l, R.n[i]]).filter(([, n]) => n).map(([l, n]) => `${l.name} ${n}`).join(", ");
    const nx = R.next ? ` <b>${S.lists[R.next.i].name}</b> se queda a las puertas, la marca roja: le faltaron ${fmt.format(R.falta)} votos.` : "";
    capEl.innerHTML = `Reparto terminado: ${res}. Cada escaño ha costado ${fmt.format(Math.round(R.last?.q ?? 0))} votos, la altura de cada bloque. La arena clara que sobra arriba no compró ningún escaño.${nx}`;
  }
  function buttons() {
    const done = A.phase === "done";
    btn("play").textContent = A.playing ? "Pausa" : A.phase === "fill" && A.ft === 0 ? "Reproducir" : "Seguir";
    btn("play").disabled = done; btn("step").disabled = done; btn("end").disabled = done;
  }
  btn("play").onclick = () => { A.playing = !A.playing; A.stepOnly = false; buttons(); kick(); };
  btn("step").onclick = () => {
    if (A.phase === "fill") { A.grains = []; A.landed = [...A.totG]; A.spawned = [...A.totG]; A.phase = "cut"; A.h = S.cap; }
    if (A.tween) { A.h = A.tween.to; A.tween = null; award(performance.now()); }
    else if (A.n < R.won.length) { A.playing = true; A.stepOnly = true; A.pauseUntil = 0; }
    buttons(); kick();
  };
  btn("end").onclick = toEnd;
  btn("reset").onclick = () => { fresh(S.noSand ? "cut" : "fill"); A.playing = true; onStep?.(0); caption(); buttons(); kick(); };

  function frame(t) {
    raf = 0;
    if (!document.body.contains(cv)) return;
    const dt = Math.min(50, t - last); last = t;
    update(t, dt); draw(t);
    if (busy() || A.phase === "cut" && A.n < R.won.length && A.playing) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }

  // ---- dragging the sand (editable) ----
  if (editable) {
    cv.style.touchAction = "none"; cv.style.cursor = "ns-resize";
    let drag = null;
    const at = (ev) => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
    const setV = (i, y) => {
      const v = Math.max(0, Math.min(S.cap, Math.round((((L.bottom - y) / L.JH) * S.cap) / 100) * 100));
      S.lists[i].v = v; S.validos = S.lists.reduce((a, l) => a + l.v, 0) + (S.blank ?? 0);
      R = reparto(S.lists, S.seats, S.validos);
      toEnd(); onEdit?.(S);
    };
    cv.addEventListener("pointerdown", (ev) => {
      const [x, y] = at(ev); const i = Math.floor((x - L.padL) / L.slot);
      if (i < 0 || i >= S.lists.length || y > L.bottom + 10) return;
      drag = i; cv.setPointerCapture(ev.pointerId); setV(i, y);
    });
    cv.addEventListener("pointermove", (ev) => { if (drag != null) setV(drag, at(ev)[1]); });
    const up = () => { drag = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  }

  new ResizeObserver(() => { if (S && Math.abs(el.clientWidth - L.W) > 1) { layout(); draw(); } }).observe(el);

  return {
    set(scen, { play = true } = {}) {
      S = { ...scen, lists: scen.lists.map((l) => ({ ...l })) };
      S.cap = scen.cap ?? Math.max(...S.lists.map((l) => l.v)) * 1.06;
      R = reparto(S.lists, S.seats, S.validos);
      layout(); fresh(S.noSand ? "cut" : "fill");
      if (play && !reduce) { A.playing = true; caption(); buttons(); onStep?.(0); kick(); } else toEnd();
    },
    get: () => S,
    result: () => R,
  };
}

/** The classic table: one row per list, its votes divided by 1, 2, 3...; the first `n` quotients awarded are lit. */
function quotTable(el, S, R, n) {
  const K = Math.min(S.seats, Math.max(...R.n) + 1) || 1;
  const won = new Map(R.won.map((w, j) => [`${w.i}:${w.k}`, j]));
  const order = S.lists.map((_, i) => i).sort((a, b) => S.lists[b].v - S.lists[a].v);
  const nk = R.next ? `${R.next.i}:${R.next.k}` : "";
  el.innerHTML = `<div class="scrollx"><table class="nosort quot"><tr><th>Lista</th>${Array.from({ length: K }, (_, k) => `<th class="num">÷${k + 1}</th>`).join("")}<th class="num">Escaños</th></tr>
    ${order.map((i) => {
      const l = S.lists[i];
      const got = R.won.slice(0, n).filter((w) => w.i === i).length;
      if (!R.ok[i]) return `<tr class="out"><td><i class="dot" style="background:${l.color}"></i>${l.name}</td><td colspan="${K}" class="muted">no llega al 3% (${fmt.format(l.v)} votos)</td><td class="num">0</td></tr>`;
      return `<tr><td><i class="dot" style="background:${l.color}"></i>${l.name}</td>${Array.from({ length: K }, (_, k) => {
        const j = won.get(`${i}:${k + 1}`), lit = j != null && j < n, key = `${i}:${k + 1}`;
        const st = lit ? ` style="background:color-mix(in srgb, ${l.color} 26%, var(--surface))"` : "";
        return `<td class="num${lit ? " won" : ""}${n >= S.seats && key === nk ? " next" : ""}${j === n - 1 ? " cur" : ""}"${st}>${fmt.format(Math.round(l.v / (k + 1)))}${lit ? `<sup>${j + 1}º</sup>` : ""}</td>`;
      }).join("")}<td class="num"><b>${got}</b></td></tr>`;
    }).join("")}</table></div>`;
}

const PLAY = [
  { name: "Azul", color: "#1d84ce", v: 41000 }, { name: "Rojo", color: "#e30613", v: 33000 }, { name: "Verde", color: "#4f9e17", v: 14000 },
  { name: "Morado", color: "#8e4a8b", v: 8500 }, { name: "Naranja", color: "#eb6109", v: 3500 }];

export async function renderDhondt(app) {
  const dh = await load("dhondt.json");
  const provs = [...dh[EID]].sort((a, b) => a.n.localeCompare(b.n, "es"));
  const opts = (sel) => provs.map((p) => `<option value="${p.prov}"${p.prov === sel ? " selected" : ""}>${p.n} (${p.esc} ${p.esc === 1 ? "escaño" : "escaños"})</option>`).join("");
  const SEC = [["regla", "La regla"], ["precio", "Encuentra el precio"], ["juega", "Pruébalo"], ["voto", "¿Sirvió tu voto?"],
    ["partes", "De proporcional a D'Hondt"], ["aire", "Escaños en el aire"]];
  const IX = indexHtml(SEC);
  app.innerHTML = `
    <div class="layout">${IX.aside}<div class="content">
    <h1>Cómo se reparten los escaños</h1>
    <p class="sub">Cada provincia reparte sus escaños con la regla D'Hondt. Aquí se ve funcionar con los votos reales de las generales de julio de 2023, y lo que provoca.</p>
    ${IX.row}
    <section id="s-regla">
    <h2>La regla</h2>
    <div class="controls"><label>Provincia <select id="prov">${opts("39")}</select></label>
      <span class="chips" id="ejemplos">${[["42", "Soria"], ["39", "Cantabria"], ["28", "Madrid"]].map(([c, n]) => `<button class="chip" data-p="${c}">${n}</button>`).join("")}</span></div>
    <div id="tn"></div>
    <p class="note" id="tnnote"></p>
    <h3>Todos los turnos de una vez</h3>
    <p class="sub">Los votos de cada lista divididos entre 1, 2, 3…, puestos en fila de mayor a menor. Los primeros son los escaños; el primero que se queda fuera enseña lo cerca que estuvo.</p>
    <div id="esc" class="chart"></div>
    <details class="metodo-box"><summary>La tabla de cocientes</summary><div class="metodo" id="tabla"></div></details>
    </section>
    <section id="s-precio">
    <h2>Encuentra el precio</h2>
    <p class="sub">Otra forma de ver la misma regla. Arrastra la línea: es el precio de un escaño. Cada lista se lleva tantos escaños como bloques enteros de ese precio caben en sus votos. Busca un precio que reparta justo los escaños de la provincia.</p>
    <div class="controls"><label>Provincia <select id="prprov">${opts("29")}</select></label></div>
    <div id="pr"></div>
    </section>
    <section id="s-juega">
    <h2>Pruébalo</h2>
    <p class="sub">Los votos como arena en botes. Arrastra la arena de cada bote para cambiar sus votos, y cambia los escaños en juego. Prueba a que Naranja saque escaño, o a quitarle uno a Rojo con los votos justos.</p>
    <div class="controls"><span>Escaños en juego</span><span class="seg"><button id="menos" aria-label="Un escaño menos">−</button><button id="nesc" disabled></button><button id="mas" aria-label="Un escaño más">+</button></span></div>
    <div id="a2"></div>
    <div id="tabla2"></div>
    </section>
    <section id="s-voto">
    <h2>¿Sirvió tu voto?</h2>
    <p class="sub">Un voto a una lista que no saca escaño en su provincia no elige a nadie. En gris, esos votos.</p>
    <div class="controls"><label>Dónde <select id="svprov"><option value="">Toda España</option>${opts("")}</select></label></div>
    <div id="sv"></div>
    </section>
    <section id="s-partes">
    <h2>De proporcional a D'Hondt</h2>
    <p class="sub">¿Lo que se aleja el Congreso de los votos es culpa de D'Hondt o de las provincias? Las dos cosas, y se pueden separar en dos pasos.</p>
    <div id="pt"></div>
    <h3>La barrera real depende de la provincia</h3>
    <p class="sub">Cada punto es una provincia. Relleno: el porcentaje de la lista más pequeña que sacó escaño. Hueco: el de la más grande que se quedó sin él. Con más del porcentaje de la línea discontinua, el escaño está asegurado.</p>
    <div id="barrera" class="chart"></div>
    </section>
    <section id="s-aire">
    <h2>Escaños en el aire</h2>
    <p class="sub">En cada provincia, el último escaño se decide entre dos listas. Estas son las que se decidieron por menos votos en 2023: los votos que le faltaron a la que se quedó fuera.</p>
    <div id="ai"></div>
    <details class="metodo-box" id="metodo"><summary>Metodología</summary><div class="metodo">
    <p><b>La regla.</b> En cada provincia se dividen los votos de cada candidatura entre 1, 2, 3… hasta el número de escaños, y los escaños van a los cocientes más altos. Solo cuentan las candidaturas con al menos el 3% de los votos válidos de la provincia (candidaturas más voto en blanco). Es el artículo 163 de la Ley Orgánica del Régimen Electoral General. Ceuta y Melilla eligen un diputado cada una, por mayoría, que da lo mismo.</p>
    <p><b>Turnos, precio y arena.</b> Son tres formas de la misma regla. En los turnos, la fuerza de una lista son sus votos divididos entre sus escaños más uno, y cada escaño va a la más fuerte. En el precio, cada lista recibe tantos escaños como veces cabe el precio en sus votos, redondeando hacia abajo; el precio que reparte justo los escaños de la provincia está entre el último cociente que obtiene escaño y el primero que se queda fuera. La arena es el precio visto desde arriba: una línea que baja.</p>
    <p><b>Votos sin escaño.</b> Votos a candidaturas que no obtuvieron ningún escaño en su provincia. No cuenta los votos sobrantes de las que sí obtuvieron alguno, ni el voto en blanco.</p>
    <p><b>Los tres pasos.</b> Proporcional en toda España: los 350 escaños por restos mayores sobre los votos a candidaturas de toda España, sin barrera. Proporcional en cada provincia: los escaños de cada provincia por restos mayores sobre sus votos, sin barrera, sumados. D'Hondt: el resultado oficial. La diferencia entre los dos primeros es lo que pone el reparto de escaños entre provincias y el tamaño pequeño de muchas; la diferencia entre los dos últimos, lo que pone la fórmula con su barrera.</p>
    <p><b>Le faltaron.</b> Los votos que necesitaba la lista que se queda fuera para que su siguiente cociente superara al último que obtuvo escaño, sin que nadie más cambie; en porcentaje, sobre los votos válidos de la provincia.</p>
    <p><b>Las barras y los botes.</b> Se dibujan las listas con al menos el 1% de los votos válidos de la provincia, como mucho nueve. Las demás no llegan al 3% y no cambian el reparto. Datos: Ministerio del Interior.</p>
    </div></details>
    </section>
    </div></div>`;
  const $ = (s) => app.querySelector(s);
  sectionIndex(app);

  // 1. the rule, by turns, with the staircase and the table in step
  let w1;
  w1 = turnos($("#tn"), $("#esc"), { onStep: (n) => quotTable($("#tabla"), w1.get(), w1.result(), n) });
  function show(code, play = true) {
    const p = dh[EID].find((x) => x.prov === code);
    $("#prov").value = code;
    app.querySelectorAll("#ejemplos .chip").forEach((c) => c.classList.toggle("on", c.dataset.p === code));
    const sc = provScenario(p);
    w1.set(sc, { play });
    $("#tnnote").textContent = sc.hidden ? `Además, ${sc.hidden} ${sc.hidden === 1 ? "lista" : "listas"} con menos del 1% de los votos, que no se dibujan.` : "";
  }
  $("#prov").onchange = (e) => show(e.target.value);
  app.querySelectorAll("#ejemplos .chip").forEach((c) => c.onclick = () => show(c.dataset.p));
  show("39");

  // 2. find the price
  const pr = (code) => precio($("#pr"), provScenario(dh[EID].find((x) => x.prov === code)));
  $("#prprov").onchange = (e) => pr(e.target.value);
  pr("29");

  // 3. the sand playground
  const play = { lists: PLAY.map((l) => ({ ...l })), seats: 5, blank: 0, cap: 60000, noSand: true, place: "" };
  play.validos = play.lists.reduce((a, l) => a + l.v, 0);
  let w2;
  w2 = arena($("#a2"), { editable: true, onStep: (n) => quotTable($("#tabla2"), w2.get(), w2.result(), n),
    onEdit: (S) => { play.lists = S.lists.map((l) => ({ ...l })); play.validos = S.validos; } });
  const setSeats = (d) => {
    play.seats = Math.max(1, Math.min(20, play.seats + d));
    $("#nesc").textContent = play.seats;
    w2.set(play, { play: false });
    quotTable($("#tabla2"), w2.get(), w2.result(), play.seats);
  };
  $("#menos").onclick = () => setSeats(-1);
  $("#mas").onclick = () => setSeats(1);
  setSeats(0);

  // 4. votes that elected nobody
  $("#svprov").onchange = (e) => sirvio($("#sv"), dh, e.target.value);
  sirvio($("#sv"), dh, "");

  // 5. proportional to D'Hondt, and the real threshold
  partes($("#pt"), dh[EID]);
  barrera($("#barrera"), dh[EID]);

  // 6. last seats; a click shows that province by turns at the top
  aire($("#ai"), dh[EID], { onPick: (code) => { $("#s-regla").scrollIntoView({ behavior: "smooth" }); show(code); } });
}

function barrera(el, provs) {
  const d3 = window.d3;
  const pts = provs.filter((p) => p.esc > 1).map((p) => {
    const val = p.l.reduce((a, l) => a + l[2], 0) + p.bl;
    const win = p.l.filter((l) => l[3] > 0), lose = p.l.filter((l) => l[3] === 0);
    const mw = win.reduce((a, b) => (b[2] < a[2] ? b : a)), ml = lose.reduce((a, b) => (b[2] > a[2] ? b : a), lose[0]);
    return { n: p.n, esc: p.esc, w: mw[2] / val, wn: mw[0], l: ml ? ml[2] / val : null, ln: ml?.[0] };
  });
  const W = Math.max(320, el.clientWidth), H = W < 560 ? 280 : 340, m = { t: 12, r: 16, b: 38, l: 40 };
  const x = d3.scaleLog().domain([1.8, 40]).range([m.l, W - m.r]);
  const y = d3.scaleLinear().domain([0, 0.36]).range([H - m.b, m.t]);
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("g").attr("class", "axis").attr("transform", `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues([2, 3, 4, 5, 7, 10, 15, 20, 32, 37]).tickFormat(d3.format("d")));
  svg.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(6).tickFormat(d3.format(".0%")));
  svg.append("text").attr("x", (W + m.l) / 2).attr("y", H - 4).attr("text-anchor", "middle").attr("fill", "var(--ink-3)").attr("font-size", 11).text("Escaños de la provincia");
  const M = d3.range(2, 38.01, 0.25);
  svg.append("path").attr("d", d3.line().x((k) => x(k)).y((k) => y(1 / (k + 1)))(M)).attr("fill", "none").attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "4 4");
  svg.append("line").attr("x1", m.l).attr("x2", W - m.r).attr("y1", y(0.03)).attr("y2", y(0.03)).attr("stroke", "#c2410c").attr("stroke-dasharray", "2 4");
  svg.append("text").attr("x", W - m.r).attr("y", y(0.03) - 5).attr("text-anchor", "end").attr("fill", "#c2410c").attr("font-size", 10).text("barrera legal del 3%");
  const jit = (s, j) => x(s) * Math.exp(0) + (j % 3 - 1) * 4;
  const g = svg.append("g");
  pts.forEach((p, j) => {
    const cx = jit(p.esc, j);
    if (p.l != null) g.append("circle").attr("cx", cx).attr("cy", y(p.l)).attr("r", 4.5).attr("fill", "var(--surface)").attr("stroke", "var(--ink-2)").attr("stroke-width", 1.5)
      .on("mousemove", (ev) => showTip(`<b>${p.n}</b> · ${p.esc} escaños<div class="row"><span>${p.ln}, sin escaño</span><span>${pct1(p.l)}</span></div>`, ev)).on("mouseleave", hideTip);
    g.append("circle").attr("cx", cx).attr("cy", y(p.w)).attr("r", 4.5).attr("fill", "var(--ink)")
      .on("mousemove", (ev) => showTip(`<b>${p.n}</b> · ${p.esc} escaños<div class="row"><span>${p.wn}, con escaño</span><span>${pct1(p.w)}</span></div>`, ev)).on("mouseleave", hideTip);
  });
  const lab = (n, dy, txt) => { const p = pts.find((q) => q.n === n); if (p) svg.append("text").attr("x", x(p.esc) + 8).attr("y", y(p.w) + dy).attr("font-size", 11).attr("fill", "var(--ink-2)").text(txt ?? n); };
  lab("Soria", 4); lab("Madrid", -8); lab("Barcelona", 12);
}
