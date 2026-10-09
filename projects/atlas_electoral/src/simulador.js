import { load, FAM, FAM_IDS, elecLabel } from "./data.js?v=0.2.9";

/** D'Hondt with the 3% provincial threshold over valid votes (candidaturas + blancos). */
export function dhondt(lists, seats, validos, threshold = 0.03) {
  const ok = lists.map((l, i) => ({ i, v: l.v })).filter((l) => l.v >= threshold * validos && l.v > 0);
  const out = new Array(lists.length).fill(0);
  const quots = [];
  for (const l of ok) for (let s = 1; s <= seats; s++) quots.push({ i: l.i, q: l.v / s, v: l.v });
  quots.sort((a, b) => b.q - a.q || b.v - a.v);
  for (let k = 0; k < seats && k < quots.length; k++) out[quots[k].i]++;
  return out;
}

export const SLIDERS = ["pp", "psoe", "vox", "izq", "cs"];

/** National family shares (over candidaturas + blancos) of a provincial results set. */
export function natShares(provs) {
  const tot = {}; let all = 0;
  for (const p of provs) { for (const [, f, v] of p.l) { tot[f] = (tot[f] ?? 0) + v; all += v; } all += p.bl; }
  return Object.fromEntries(Object.entries(tot).map(([f, v]) => [f, v / all]));
}

/** Seats per family after scaling each family's votes by factor[f]; esc overrides seats per province. */
export function seatsFor(provs, factor = {}, esc = null) {
  const seats = {}; const perProv = [];
  for (const p of provs) {
    const lists = p.l.map(([s, f, v]) => ({ s, f, v: v * (factor[f] ?? 1) }));
    const validos = lists.reduce((a, l) => a + l.v, 0) + p.bl;
    const r = dhondt(lists, esc?.[p.prov] ?? p.esc, validos);
    const byF = {};
    lists.forEach((l, i) => { if (r[i]) { seats[l.f] = (seats[l.f] ?? 0) + r[i]; byF[l.f] = (byF[l.f] ?? 0) + r[i]; } });
    perProv.push({ n: p.n, prov: p.prov, byF });
  }
  return { seats, perProv };
}

/** Poll average (encuestas.json "ultimo", in %) -> family targets (shares). */
export const pollTargets = (u) => ({ pp: u.pp / 100, psoe: u.psoe / 100, vox: u.vox / 100,
  izq: ((u.sumar ?? 0) + (u.podemos ?? 0)) / 100, cs: 0 });

export function projectFromPolls(provs, ultimo, esc = null) {
  const nat = natShares(provs), t = pollTargets(ultimo);
  const factor = Object.fromEntries(SLIDERS.map((f) => [f, nat[f] ? t[f] / nat[f] : 1]));
  return seatsFor(provs, factor, esc);
}
const state = { base: null, target: {} };

export async function renderSimulador(app, args = []) {
  const [dh, E] = await Promise.all([load("dhondt.json"), load("encuestas.json")]);
  const gens = Object.keys(dh).sort();
  if (!state.base) state.base = gens.at(-1);
  const fromPolls = args[0] === "encuestas";

  app.innerHTML = `
    <h1>Simulador de escaños</h1>
    <p class="sub">Elige una elección de partida y mueve el porcentaje nacional de cada partido. El cambio se aplica de forma proporcional en cada provincia (si un partido pasa del 20% al 25%, sus votos se multiplican por 1,25 en todas partes) y se reparten los escaños con la regla D'Hondt y el umbral del 3% por provincia.</p>
    <div class="controls"><label>Elección base <select id="base">${gens.map((g) => `<option value="${g}">${elecLabel(g)}</option>`).join("")}</select></label>
      <button class="play" id="reset">Restablecer</button>
      <button class="play" id="polls">Cargar promedio de encuestas (${E.actualizado})</button></div>
    <p class="note" id="pollnote"></p>
    <div class="sliders" id="sl"></div>
    <h2>Congreso resultante <span id="sum" class="note"></span></h2>
    <div class="seats" id="bar"><span class="majority" title="Mayoría absoluta: 176"></span></div>
    <div class="legend" id="leg"></div>
    <div class="grid2">
      <div><h2>Escaños por partido</h2><div id="tbl"></div></div>
      <div><h2>Lo que más cambia por provincia</h2><div id="prov"></div></div>
    </div>`;
  const $ = (s) => app.querySelector(s);
  $("#base").value = state.base;

  function setup(usePolls = false) {
    const nat = natShares(dh[state.base]);
    state.nat = nat;
    state.target = Object.fromEntries(SLIDERS.map((f) => [f, nat[f] ?? 0]));
    if (usePolls) {
      // poll parties -> families; Sumar + Podemos both count as the PCE/IU/Podemos/Sumar family
      const u = E.ultimo;
      Object.assign(state.target, pollTargets(u));
      $("#pollnote").textContent = `Escenario: promedio de encuestas a ${E.actualizado} (PP ${u.pp}, PSOE ${u.psoe}, Vox ${u.vox}, Sumar+Podemos ${((u.sumar ?? 0) + (u.podemos ?? 0)).toFixed(1)}), aplicado sobre el reparto provincial de ${elecLabel(state.base)}. SALF y otros partidos nuevos no se modelan: sus votos quedan en el resto.`;
    } else $("#pollnote").textContent = "";
    $("#sl").innerHTML = SLIDERS.filter((f) => nat[f] > 0).map((f) => `
      <label><span><i class="dot" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</span>
      <input type="range" min="0" max="50" step="0.1" value="${(state.target[f] * 100).toFixed(1)}" data-f="${f}" />
      <output>${(state.target[f] * 100).toFixed(1)}</output></label>`).join("");
    $("#sl").querySelectorAll("input").forEach((inp) => inp.oninput = () => {
      state.target[inp.dataset.f] = inp.value / 100;
      inp.nextElementSibling.textContent = (+inp.value).toFixed(1);
      compute();
    });
    compute();
  }

  function compute() {
    const factor = Object.fromEntries(SLIDERS.map((f) => [f, state.nat[f] ? state.target[f] / state.nat[f] : 1]));
    const base = seatsFor(dh[state.base]), sim = seatsFor(dh[state.base], factor);
    const order = FAM_IDS.filter((f) => sim.seats[f] || base.seats[f]).sort((a, b) => (sim.seats[b] ?? 0) - (sim.seats[a] ?? 0));
    const totalPct = Object.entries(state.nat).reduce((s, [f, v]) => s + (SLIDERS.includes(f) ? state.target[f] : v), 0);
    $("#sum").textContent = `· los porcentajes suman ${(totalPct * 100).toFixed(1).replace(".", ",")}% (incluye regionales y otros sin cambios)`;
    const bar = $("#bar");
    bar.querySelectorAll("div").forEach((d) => d.remove());
    // blocs: left-ish to right-ish ordering for the hemicycle bar
    const ideo = ["bildu", "cup", "izq", "erc", "bng", "compromis", "psoe", "pnv", "cc", "otros", "junts", "ucd", "cs", "pp", "vox"];
    for (const f of ideo.filter((f) => sim.seats[f])) bar.insertAdjacentHTML("beforeend", `<div title="${FAM[f].nombre}: ${sim.seats[f]}" style="flex:${sim.seats[f]};background:${FAM[f].color}"></div>`);
    $("#leg").innerHTML = ideo.filter((f) => sim.seats[f]).map((f) => `<span><i class="sw" style="background:${FAM[f].color}"></i>${FAM[f].nombre} <b>${sim.seats[f]}</b></span>`).join("") + `<span class="note">· la línea marca la mayoría absoluta (176)</span>`;
    $("#tbl").innerHTML = `<table><tr><th>Partido</th><th class="num">${elecLabel(state.base)}</th><th class="num">Simulado</th><th class="num">Dif.</th></tr>
      ${order.map((f) => { const a = base.seats[f] ?? 0, b = sim.seats[f] ?? 0;
        return `<tr><td><i class="dot" style="background:${FAM[f].color}"></i>${FAM[f].nombre}</td><td class="num">${a}</td><td class="num"><b>${b}</b></td><td class="num">${b - a > 0 ? "+" : ""}${b - a || ""}</td></tr>`; }).join("")}
      <tr><td>PP + Vox</td><td class="num">${(base.seats.pp ?? 0) + (base.seats.vox ?? 0)}</td><td class="num"><b>${(sim.seats.pp ?? 0) + (sim.seats.vox ?? 0)}</b></td><td></td></tr>
      </table>`;
    const changes = sim.perProv.map((p, i) => {
      const diffs = FAM_IDS.map((f) => [f, (p.byF[f] ?? 0) - (base.perProv[i].byF[f] ?? 0)]).filter(([, d]) => d);
      return { n: p.n, diffs };
    }).filter((p) => p.diffs.length);
    $("#prov").innerHTML = changes.length ? `<table>${changes.map((p) => `<tr><td>${p.n}</td><td>${p.diffs.map(([f, d]) =>
      `<span style="white-space:nowrap;margin-right:10px"><i class="dot" style="background:${FAM[f].color}"></i>${d > 0 ? "+" : ""}${d}</span>`).join("")}</td></tr>`).join("")}</table>`
      : `<p class="note">Mueve algún control para ver qué escaños cambian de manos.</p>`;
  }

  $("#base").onchange = (e) => { state.base = e.target.value; setup(); };
  $("#reset").onclick = () => setup(false);
  $("#polls").onclick = () => { state.base = gens.at(-1); $("#base").value = state.base; setup(true); };
  if (fromPolls) state.base = gens.at(-1);
  $("#base").value = state.base;
  setup(fromPolls);
}

/** Seeded PRNG + normal draws so the landing shows stable numbers between reloads. */
function rng(seed = 29112026) {
  let s = seed >>> 0;
  const u = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

/**
 * Monte Carlo seat projection.
 * National error = bloc swing right↔left (σ 1.8 pp) + transfers PP↔Vox (σ 1.5) and
 * PSOE↔Sumar (σ 1.2) + own noise (0.6 × 2.5 pp for a 30% party, scaled by sqrt(share)).
 * Magnitudes follow the 2015–2023 error of the final poll average (1–2.5 pp per party).
 * Each list in each province also gets independent multiplicative noise (σ = 8%).
 */
export function monteCarlo(provs, ultimo, esc = null, n = 2000) {
  const nat = natShares(provs), t = pollTargets(ultimo), z = rng();
  const sigma = (share) => Math.sqrt(2.0 ** 2 + 1.5 ** 2) / 100 * Math.sqrt(Math.max(share, 0.005) / 0.3);
  const draws = [];
  for (let k = 0; k < n; k++) {
    // correlated error: bloc swing (right vs left), transfers inside each bloc, own noise
    const bloc = z() * 0.018, inRight = z() * 0.015, inLeft = z() * 0.012;
    const shock = { pp: bloc / 2 + inRight, vox: bloc / 2 - inRight, psoe: -bloc / 2 + inLeft, izq: -bloc / 2 - inLeft };
    const factor = {};
    for (const f of SLIDERS) {
      if (!nat[f] || !t[f]) continue;
      factor[f] = Math.max(0, t[f] + (shock[f] ?? 0) + z() * sigma(t[f]) * 0.6) / nat[f];
    }
    const seats = {};
    for (const p of provs) {
      const lists = p.l.map(([s, f, v]) => ({ f, v: v * (factor[f] ?? 1) * Math.exp(0.08 * z()) }));
      const validos = lists.reduce((a, l) => a + l.v, 0) + p.bl;
      const r = dhondt(lists, esc?.[p.prov] ?? p.esc, validos);
      lists.forEach((l, i) => { if (r[i]) seats[l.f] = (seats[l.f] ?? 0) + r[i]; });
    }
    draws.push(seats);
  }
  const q = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))];
  const fams = [...new Set(draws.flatMap((d) => Object.keys(d)))];
  const summary = Object.fromEntries(fams.map((f) => {
    const a = draws.map((d) => d[f] ?? 0).sort((x, y) => x - y);
    return [f, { p10: q(a, 0.1), p50: q(a, 0.5), p90: q(a, 0.9) }];
  }));
  const prob = (fn) => draws.filter(fn).length / n;
  return {
    n, summary, draws,
    pPPVox: prob((d) => (d.pp ?? 0) + (d.vox ?? 0) >= 176),
    pPPsolo: prob((d) => (d.pp ?? 0) >= 176),
    pPPfirst: prob((d) => (d.pp ?? 0) > (d.psoe ?? 0)),
    pLeft: prob((d) => ["psoe", "izq", "erc", "bildu", "pnv", "bng", "compromis", "cup"].reduce((s, f) => s + (d[f] ?? 0), 0) >= 176),
    pVoxOverPSOE: prob((d) => (d.vox ?? 0) > (d.psoe ?? 0)),
  };
}
