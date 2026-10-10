import { load, FAM_IDS, elecLabel } from "./data.js?v=0.2.22";
import { fam, famName, IDEO, EXTRA } from "./charts.js?v=0.2.22";

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

export const NEW = Object.keys(EXTRA);          // sumar, podemos, salf: separate lists since 2024
export const SLIDERS = ["pp", "psoe", "vox", "izq", "cs", ...NEW];
/** Sliders that make sense for a results set: the families it has, plus the three new parties once split. */
export const slidersFor = (nat) => SLIDERS.filter((f) => nat[f] > 0);
const fdate = (s) => new Date(s).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
const num = (x, d = 1) => (+x).toFixed(d).replace(".", ",");

/** Replace each province's "izq" list (Sumar in 2023) by Sumar, Podemos and SALF lists whose votes follow
 *  their shares in the June 2024 European election (geo_nuevos.json), over the province's valid votes. */
export function splitNew(provs, geo) {
  if (!geo) return provs;
  return provs.map((p) => {
    const valid = p.l.reduce((a, [, , v]) => a + v, 0) + p.bl;
    const g = geo.p[p.prov] ?? {};
    return { ...p, l: [...p.l.filter(([, f]) => f !== "izq"), ...NEW.map((k) => [EXTRA[k].nombre, k, Math.round(valid * (g[k] ?? 0)), 0])] };
  });
}

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
export const pollTargets = (u) => ({ pp: u.pp / 100, psoe: u.psoe / 100, vox: u.vox / 100, cs: 0,
  sumar: (u.sumar ?? 0) / 100, podemos: (u.podemos ?? 0) / 100, salf: (u.salf ?? 0) / 100,
  izq: ((u.sumar ?? 0) + (u.podemos ?? 0)) / 100 });   // izq only when the base is not split

export function projectFromPolls(provs, ultimo, esc = null, geo = null) {
  provs = splitNew(provs, geo);
  const nat = natShares(provs), t = pollTargets(ultimo);
  const factor = Object.fromEntries(slidersFor(nat).map((f) => [f, t[f] / nat[f]]));
  return seatsFor(provs, factor, esc);
}
const state = { base: null, target: {} };

export async function renderSimulador(app, args = [], embed = false) {
  const [dh, E, G] = await Promise.all([load("dhondt.json"), load("encuestas.json"), load("geo_nuevos.json")]);
  const gens = Object.keys(dh).sort();
  if (!state.base) state.base = gens.at(-1);
  const fromPolls = args[0] === "encuestas";

  app.innerHTML = `
    ${embed ? "" : "<h1>Simulador de escaños</h1>"}
    <p class="sub">Elige una elección de partida y mueve el porcentaje nacional de cada partido. El cambio se aplica de forma proporcional en cada provincia (si un partido pasa del 20% al 25%, sus votos se multiplican por 1,25 en todas partes) y se reparten los escaños con la regla D'Hondt y el umbral del 3% por provincia.</p>
    <div class="controls"><label>Elección base <select id="base">${gens.map((g) => `<option value="${g}">${elecLabel(g)}</option>`).join("")}</select></label>
      <button class="play" id="reset">Restablecer</button>
      <button class="play" id="polls">Cargar promedio de encuestas (${fdate(E.actualizado)})</button></div>
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
    // with the poll scenario on the 2023 base, Sumar, Podemos and SALF become separate lists (2024 geography)
    state.provs = usePolls && state.base === gens.at(-1) ? splitNew(dh[state.base], G) : dh[state.base];
    const nat = natShares(state.provs);
    state.nat = nat;
    state.sliders = slidersFor(nat);
    state.target = Object.fromEntries(state.sliders.map((f) => [f, nat[f]]));
    if (usePolls) {
      const u = E.ultimo, t = pollTargets(u);
      for (const f of state.sliders) state.target[f] = t[f] ?? state.target[f];
      $("#pollnote").textContent = `Escenario: promedio de encuestas a ${fdate(E.actualizado)} (PP ${num(u.pp)}, PSOE ${num(u.psoe)}, Vox ${num(u.vox)}, Sumar ${num(u.sumar)}, Podemos ${num(u.podemos)}, SALF ${num(u.salf)}), aplicado sobre el reparto provincial de ${elecLabel(state.base)}. Sumar, Podemos y SALF no tuvieron lista propia en 2023: su reparto por provincias sigue el de las europeas de junio de 2024, escalado al promedio nacional.`;
    } else $("#pollnote").textContent = "";
    $("#sl").innerHTML = state.sliders.map((f) => `
      <label><span><i class="dot" style="background:${fam(f).color}"></i>${famName(f, state.base)}</span>
      <input type="range" min="0" max="50" step="0.1" value="${(state.target[f] * 100).toFixed(1)}" data-f="${f}" />
      <output>${num(state.target[f] * 100)}</output></label>`).join("");
    $("#sl").querySelectorAll("input").forEach((inp) => inp.oninput = () => {
      state.target[inp.dataset.f] = inp.value / 100;
      inp.nextElementSibling.textContent = num(inp.value);
      compute();
    });
    compute();
  }

  function compute() {
    const factor = Object.fromEntries(state.sliders.map((f) => [f, state.target[f] / state.nat[f]]));
    const base = seatsFor(dh[state.base]), sim = seatsFor(state.provs, factor);
    if (state.provs !== dh[state.base]) {          // split base: the 2023 "izq" list was Sumar's
      base.seats.sumar = base.seats.izq; delete base.seats.izq;
      for (const p of base.perProv) { if (p.byF.izq) { p.byF.sumar = p.byF.izq; delete p.byF.izq; } }
    }
    const IDS = [...FAM_IDS, ...NEW];
    const order = IDS.filter((f) => sim.seats[f] || base.seats[f]).sort((a, b) => (sim.seats[b] ?? 0) - (sim.seats[a] ?? 0));
    const totalPct = Object.entries(state.nat).reduce((s, [f, v]) => s + (state.sliders.includes(f) ? state.target[f] : v), 0);
    $("#sum").textContent = `· los porcentajes suman ${num(totalPct * 100)}% (incluye regionales y otros sin cambios)`;
    const bar = $("#bar");
    bar.querySelectorAll("div").forEach((d) => d.remove());
    // blocs: left-ish to right-ish ordering for the hemicycle bar
    for (const f of IDEO.filter((f) => sim.seats[f])) bar.insertAdjacentHTML("beforeend", `<div title="${famName(f, state.base)}: ${sim.seats[f]}" style="flex:${sim.seats[f]};background:${fam(f).color}"></div>`);
    $("#leg").innerHTML = IDEO.filter((f) => sim.seats[f]).map((f) => `<span><i class="sw" style="background:${fam(f).color}"></i>${famName(f, state.base)} <b>${sim.seats[f]}</b></span>`).join("") + `<span class="note">· la línea marca la mayoría absoluta (176)</span>`;
    $("#tbl").innerHTML = `<table><tr><th>Partido</th><th class="num">${elecLabel(state.base)}</th><th class="num">Simulado</th><th class="num">Dif.</th></tr>
      ${order.map((f) => { const a = base.seats[f] ?? 0, b = sim.seats[f] ?? 0;
        return `<tr><td><i class="dot" style="background:${fam(f).color}"></i>${famName(f, state.base)}</td><td class="num">${a}</td><td class="num"><b>${b}</b></td><td class="num">${b - a > 0 ? "+" : ""}${b - a || ""}</td></tr>`; }).join("")}
      <tr><td>PP + Vox</td><td class="num">${(base.seats.pp ?? 0) + (base.seats.vox ?? 0)}</td><td class="num"><b>${(sim.seats.pp ?? 0) + (sim.seats.vox ?? 0)}</b></td><td></td></tr>
      </table>`;
    const changes = sim.perProv.map((p, i) => {
      const diffs = IDS.map((f) => [f, (p.byF[f] ?? 0) - (base.perProv[i].byF[f] ?? 0)]).filter(([, d]) => d);
      return { n: p.n, diffs };
    }).filter((p) => p.diffs.length);
    $("#prov").innerHTML = changes.length ? `<table>${changes.map((p) => `<tr><td>${p.n}</td><td>${p.diffs.map(([f, d]) =>
      `<span style="white-space:nowrap;margin-right:10px"><i class="dot" style="background:${fam(f).color}"></i>${d > 0 ? "+" : ""}${d}</span>`).join("")}</td></tr>`).join("")}</table>`
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
