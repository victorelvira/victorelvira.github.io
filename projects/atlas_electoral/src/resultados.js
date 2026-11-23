// The model's results block (prose in textos/resultados.md), the same on the front page (#inicio, section "Qué dice
// nuestro modelo") and at the top of the Modelo tab: seats and vote per party as ranges, and the "Forma tu mayoría"
// box (seat bar, three draggable groups with their hatched bar, the evolution of the reader's blocs).
import { load, fechaLarga, showTip, hideTip } from "./data.js?v=0.2.178";
import { seatRows, bloques, declutter, leaders, cull, IDEO, BLOQUE_INICIAL, fam, famName } from "./charts.js?v=0.2.178";
import { num } from "./encuestas.js?v=0.2.178";
import { short, pc } from "./provincia.js?v=0.2.178";
import { textos, md } from "./textos.js?v=0.2.178";
import { t, loc, deCada, lang } from "./i18n.js?v=0.2.178";
const d3 = window.d3; // vendored UMD build, loaded by the entry page

/** The block's HTML and the index entries of its h3 subsections ([[id, label], ...]) for the page's section.
 *  PR: prediccion.json or any model file in its format (data/modelos/*.json). Put `html` in the page, then call
 *  wireResultados once it is in the document. modelos: the entries of data/modelos/index.json, to put the model selector
 *  (part "selector" of resultados.md, a <select id="modelo-sel">) at the top of the block; modelo: the id shown. The weekly
 *  evolution exists only for K0 (prediccion_serie_draws.json): with another model the part "nota_evolucion" goes above it. */
export async function resultadosHtml(PR, { modelos = null, modelo = null, DR = null } = {}) {
  const T = await textos("resultados");
  textosCache = T;
  const slots = { escanos_partido: `<div class="rg-esc">${rangos(escanosFilas(PR), { dec: 0, dens: DR ? densEscanos(DR) : null })}</div>${DR ? '<div class="cond"></div>' : ""}`, voto_partido: rangos(votoFilas(PR), { dec: 1, pct: true, dens: "cuantiles", puntos: await encuestasMes(PR) }) };
  // "¿Quién llega a 176?" (cards from the chosen model's draws), the shortcuts and the hemicycle of "Forma tu mayoría":
  // their captions are parts of resultados.md; without the part (or the draws) the slot stays empty
  // the selector and the cards are wrapped (.res-sel, .res-q176) so that the front page can lift them into its desktop grid
  slots.quien_176 = DR && T.quien_176 ? `<div class="res-q176">${md(T.quien_176, { vars: { ...tarjetasVars(DR), ...masVotadoVars(PR) }, flags: { mas_votado: !!masVotadoVars(PR).mv_pp }, page: "resultados" }).html}</div>` : null;
  slots.atajos = T.atajos ? md(T.atajos, { page: "resultados" }).html : null;
  slots.hemiciclo = `<div class="hemi"><svg class="hemi-svg" role="img" aria-label="${t("Hemiciclo del escenario central")}"></svg><div class="hemi-foco"></div></div>`;
  if (modelo && modelo !== "k0" && T.nota_evolucion) slots.evolucion = md(T.nota_evolucion, { page: "resultados" }).html + '<div id="evolucion"></div>';
  const { html, sub } = md(T.principal, { slots, page: "resultados" });
  let top = "";
  if (modelos?.length && T.selector) {
    const cur = modelos.find((m) => m.id === modelo) ?? modelos[0];
    const sel = `<select id="modelo-sel" style="max-width:100%">${modelos.map((m) => `<option value="${m.id}"${m.id === cur.id ? " selected" : ""}>${t(m.nombre)}</option>`).join("")}</select>`;
    top = `<div class="res-sel">${md(T.selector, { vars: { descripcion_modelo: t(cur.descripcion.replace(/\s*\([^)]*\)/g, "")) }, slots: { selector_modelo: sel }, page: "resultados" }).html}</div>`;
  }
  return { html: top + html, sec: sub };
}

/** Draws the seat bar (#proj), the groups (#bloques) and the evolution (#evolucion) found under root. Also serves the front
 *  page without a model (PR null): then est is the poll projection and there is no evolution nor ranges.
 *  onGroups(at, sumOf) runs after every regrouping (sumOf(group) -> seats of that group in every draw, with DR).
 *  at: {party: group}, the reader's groups; pass the same object again to keep them when the block is redrawn. */
export function wireResultados(root, { PR, DR, est, conv, onGroups = null, at = {} }) {
  const T = textosCache;   // read by resultadosHtml before this runs (null on the front page without a model)
  if (PR && DR) condicionar(root, PR, DR, T);
  seatRows(root.querySelector("#proj"), [{ label: PR ? t("Por partidos") : t("Estimación"), e: est }], { labelWidth: PR ? 130 : 90, eid: "generales_2026-11" });
  // the evolution of the two blocs the reader has formed (inside "Forma tu mayoría"): redrawn on every regrouping
  const evoEl = root.querySelector("#evolucion");
  let evoAt = null, SD = null;
  const evo = () => { if (evoEl && SD && evoAt) evolucion(evoEl, SD, evoAt, conv); };
  if (PR && evoEl) load("prediccion_serie_draws.json").then((d) => { SD = d; evo(); }).catch(() => { evoEl.innerHTML = ""; });
  const bqEl = root.querySelector("#bloques");
  const hemi = root.querySelector(".hemi") ? hemiciclo(root.querySelector(".hemi"), est, PR, T) : null;
  const atajos = root.querySelector(".atajos");
  // the group the hemicycle brings forward: the side of the last shortcut, else the group a party was last moved to
  // (not "Otros"), else the bigger of left and right
  let antes = null, foco = null;
  // under the party bar, the bar of the reader's three blocs, same width and labels (Víctor, 2026-11-17)
  const draw = () => bloques(bqEl, est, { at, draws: PR ? DR : null, barra: { label: t("Por bloques"), labelWidth: PR ? 130 : 90 },
    onChange: (at, sumOf) => {
      const movido = antes && Object.keys(at).find((f) => antes[f] && antes[f] !== at[f]);
      if (movido && at[movido] !== "otros") foco = at[movido];
      const tot = (g) => Object.keys(at).filter((f) => at[f] === g).reduce((a, f) => a + (est[f] ?? 0), 0);
      if (!foco) foco = tot("derecha") >= tot("izquierda") ? "derecha" : "izquierda";
      antes = { ...at };
      hemi?.update(at, foco, sumOf);
      if (atajos) marcarAtajos(atajos, at);
      evoAt = { ...at }; evo(); onGroups?.(at, sumOf);
    } });
  if (bqEl) {
    draw();
    // hovering a group's box brings its seats forward in the hemicycle for as long as the pointer is there
    bqEl.addEventListener("mouseover", (ev) => { const b = ev.target.closest(".bloque"); if (b && hemi) hemi.focus(b.dataset.g); });
    bqEl.addEventListener("mouseleave", () => hemi?.focus(null));
  }
  atajos?.addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-atajo]");
    if (!b || b.disabled) return;
    Object.assign(at, agrupar(b.dataset.atajo, at));
    antes = { ...at };
    foco = ATAJOS[b.dataset.atajo]?.[0] ?? null;   // Restablecer: back to the bigger side
    draw();
  });
  // the cards write their 90% range themselves ({r_*} in resultados.md); no tooltips (Víctor, 2026-11-16)
}

// ------------------------------------------------------------------ shortcuts, cards and hemicycle (front page, 2026-11-16)
let textosCache = null;   // the parts of resultados.md, kept by resultadosHtml for wireResultados
// the parties that voted for Sánchez's investiture in November 2023: PSOE, Sumar (with Podemos and Compromís inside it then),
// ERC, Junts, EH Bildu, PNV, BNG and Coalición Canaria (the same list as the model's "Bloque de la investidura de 2023")
const INVESTIDURA = ["psoe", "sumar", "podemos", "compromis", "erc", "junts", "bildu", "pnv", "bng", "cc"];
// each shortcut: the group it fills and its parties; the rest keep their starting group, except that the starting members
// of that same group who are not in the shortcut go to "Otros"
const ATAJOS = { ppvox: ["derecha", ["pp", "vox"]], investidura: ["izquierda", INVESTIDURA], izquierda: ["izquierda", ["psoe", "sumar", "podemos"]] };
function agrupar(id, at) {
  const out = {};
  for (const f of Object.keys(at)) {
    const ini = BLOQUE_INICIAL[f] ?? "otros", a = ATAJOS[id];
    out[f] = !a ? ini : a[1].includes(f) ? a[0] : ini === a[0] ? "otros" : ini;
  }
  return out;
}
// the shortcut whose grouping is the current one looks pressed; "Restablecer" is disabled when there is nothing to undo
function marcarAtajos(el, at) {
  const igual = (g) => Object.keys(at).every((f) => g[f] === at[f]);
  el.querySelectorAll("button[data-atajo]").forEach((b) => {
    const on = igual(agrupar(b.dataset.atajo, at));
    if (ATAJOS[b.dataset.atajo]) { b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); } else b.disabled = on;
  });
}

// seats of a set of parties in every draw (parties missing from the draws have no seats in any)
function suma(DR, fs) {
  const n = DR.s[0].length, t = new Int16Array(n);
  DR.partidos.forEach((f, i) => { if (fs.includes(f)) for (let k = 0; k < n; k++) t[k] += DR.s[i][k]; });
  return t;
}
// the cards show a percentage, not "N de cada 100": Víctor found the small "de cada 100" under a big figure confusing (2026-11-17)
// {veces} of the hemicycle note is a count out of 100 ("en 93 de cada 100 simulaciones"), not a percentage
const deCada100 = (p) => (p < 0.005 ? "<1%" : p > 0.995 ? ">99%" : `${Math.round(p * 100)}%`);
const frec10 = (p) => (p >= 0.095 ? deCada(Math.round(p * 10), 10) : deCada(Math.max(1, Math.round(p * 100)), 100));
// "¿Quién es la fuerza más votada?" (2026-11-17): from the model file, p_mas_votado {party: p} when it has it, else the PP's
// p_pp_mas_votado and the rest to the PSOE (the only other party with any chance in the 2026 polls)
function masVotadoVars(PR) {
  const m = PR?.p_mas_votado ?? (PR?.p_pp_mas_votado != null ? { pp: PR.p_pp_mas_votado, psoe: 1 - PR.p_pp_mas_votado } : null);
  if (!m) return {};
  // largest-remainder rounding over all parties, so the cards add up to 100 (77.5 and 22.5 rounded one by one gave 78 + 23)
  const ks = Object.keys(m), raw = ks.map((k) => m[k] * 100), fl = raw.map(Math.floor);
  let falta = 100 - fl.reduce((a, b) => a + b, 0);
  [...ks.keys()].sort((a, b) => (raw[b] - fl[b]) - (raw[a] - fl[a])).forEach((i) => { if (falta > 0 && raw[i] > fl[i]) { fl[i]++; falta--; } });
  const r = Object.fromEntries(ks.map((k, i) => [k, fl[i]]));
  const f = (k) => { const p = m[k] ?? 0, n = r[k] ?? 0; return n === 0 ? "<1%" : p < 1 && n === 100 ? ">99%" : `${n}%`; };
  return { mv_pp: f("pp"), mv_psoe: f("psoe"), mv_vox: f("vox") };
}
const cuantil = (a, p) => { const v = [...a].sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
// "¿Quién llega a 176?": {c_ppvox}, {c_pp}, {c_investidura}, {c_pp_psoe} (out of every 100 draws) and, for the cards' tooltips,
// the 90% range of each sum ({r_ppvox}...) and of the PP's lead over the PSOE
function tarjetasVars(DR) {
  const freq = (t, ok) => t.reduce((a, x) => a + (ok(x) ? 1 : 0), 0) / t.length;
  // the card's line: the median seats ("unos 194 escaños"). Until 2026-11-16 it gave the 90% range, "de 172 a 215", which next to
  // "92%" read as a contradiction (172 is under 176) (Víctor, 2026-11-16)
  const rango = (x) => t("({n} escaños esperados)", { n: cuantil(x, 0.5) });   // "esperados": what the figure is (Víctor, 2026-11-17)
  const ppvox = suma(DR, ["pp", "vox"]), pp = suma(DR, ["pp"]), inv = suma(DR, INVESTIDURA), psoe = suma(DR, ["psoe"]);
  const dif = pp.map((x, i) => x - psoe[i]);
  // fourth card (2026-11-17): neither PP+Vox nor the 2023 investiture bloc reaches 176. With every party in the draws this is
  // almost always a 175-175 tie; the rest is a seat of SALF, the only party with a chance of a seat outside both blocs.
  // Its tooltip: how often it is an exact tie
  const resto = ppvox.map((x, i) => 350 - x - inv[i]);
  const nin = [...ppvox.keys()].filter((i) => ppvox[i] < 176 && inv[i] < 176);
  const ppvoxNin = Int16Array.from(nin.map((i) => ppvox[i]));
  const empate = nin.length ? nin.filter((i) => resto[i] === 0).length / nin.length : 0;
  // without Junts nor CC: the same left group "Forma tu mayoría" starts with, so card and box agree (Víctor, 2026-11-16)
  const invSinJunts = suma(DR, INVESTIDURA.filter((f) => f !== "junts" && f !== "cc"));
  // who is outside both blocs in the "neither" draws: the seats of each party that is neither PP, Vox nor in the 2023 bloc
  const fuera = DR.partidos.filter((f) => !["pp", "vox", ...INVESTIDURA].includes(f));
  return { c_inv_sin_junts: deCada100(freq(invSinJunts, (x) => x >= 176)), r_inv_sin_junts: rango(invSinJunts),
    fuera_ninguno: fuera.map((f) => short(f)).join(", "), c_ninguno: deCada100(nin.length / ppvox.length), r_ninguno: nin.length ? rango(ppvoxNin) : "·", empate_ninguno: frec10(empate), c_ppvox: deCada100(freq(ppvox, (x) => x >= 176)), c_pp: deCada100(freq(pp, (x) => x >= 176)), c_investidura: deCada100(freq(inv, (x) => x >= 176)),
    c_pp_psoe: deCada100(freq(dif, (x) => x > 0)), r_ppvox: rango(ppvox), r_pp: rango(pp), r_investidura: rango(inv), r_pp_psoe: rango(dif),
    simulaciones: DR.s[0].length.toLocaleString(loc(), { useGrouping: "always" }) };
}

// 350 seat positions on a half disc: rows from an inner radius to the outer one, each with seats in proportion to its length,
// then ordered by angle, left to right, so that consecutive seats make a wedge (the usual parliament chart)
export function asientos(n = 350, filas = 10, r0 = 0.42) {
  const radios = d3.range(filas).map((i) => r0 + (1 - r0) * i / (filas - 1)), tot = d3.sum(radios);
  const por = radios.map((r) => Math.round(n * r / tot));
  for (let i = filas - 1, d = n - d3.sum(por); d; i = (i - 1 + filas) % filas) { por[i] += Math.sign(d); d -= Math.sign(d); }
  const pts = radios.flatMap((r, i) => d3.range(por[i]).map((j) => { const a = Math.PI * (1 - j / (por[i] - 1)); return { a, r, x: r * Math.cos(a), y: -r * Math.sin(a) }; }));
  return { pts: pts.sort((p, q) => q.a - p.a || p.r - q.r), punto: 0.4 * (1 - r0) / (filas - 1) };
}

/** The hemicycle of the central scenario: one dot per seat in the party's colour, the parties ordered by the reader's groups
 *  (Izquierda, Otros, Derecha) and, inside each, from left to right; the group in focus at full colour, the rest faded.
 *  Returns {update(at, foco, sumOf), focus(g)}: focus(g) brings another group forward for a moment (null: back). */
function hemiciclo(el, est, PR, T) {
  const { pts, punto } = asientos(d3.sum(Object.values(est)) || 350);
  const svg = d3.select(el).select("svg").attr("viewBox", "-1.04 -1.06 2.08 1.1");
  const G = ["izquierda", "otros", "derecha"], NAME = { izquierda: t("Izquierda"), otros: t("Otros"), derecha: t("Derecha") };
  const rango = (f) => { const e = PR?.partidos?.[f]?.escanos ?? PR?.otros_escanos?.[f]; return e ? [e.p05, e.p95] : null; };
  const dots = svg.append("g").selectAll("circle").data(pts).join("circle").attr("cx", (p) => p.x).attr("cy", (p) => p.y).attr("r", punto);
  // the 176th seat: the majority line runs up the middle of the half disc
  svg.append("line").attr("class", "hemi-176").attr("x1", 0).attr("x2", 0).attr("y1", -0.36).attr("y2", -1.05);
  svg.append("text").attr("class", "hemi-176t").attr("x", 0).attr("y", -0.24).attr("text-anchor", "middle").text("176");
  const foco = el.querySelector(".hemi-foco");
  let at = {}, fijo = null, sumOf = null, f0 = null;
  const tip = (f) => {
    const r = rango(f);
    return `<b>${famName(f, "generales_2026-11")}</b><div class="row"><span>${t("Escenario central")}</span><span>${t("{r} escaños", { r: est[f] })}</span></div>${r ? `<div class="row"><span>${t("9 de cada 10 simulaciones")}</span><span>${t("de {a} a {b}", { a: r[0], b: r[1] })}</span></div>` : ""}<div class="muted">${t("Grupo:")} ${NAME[at[f]] ?? NAME.otros}</div>`;
  };
  dots.on("mousemove", (ev, p) => { showTip(tip(p.f), ev); dots.classed("hemi-on", (q) => q.f === p.f); })
    .on("mouseleave", () => { hideTip(); dots.classed("hemi-on", false); })
    .on("click", (ev, p) => { showTip(tip(p.f), ev); dots.classed("hemi-on", (q) => q.f === p.f); });   // a tap shows the same bubble
  const paint = (g) => {
    dots.attr("opacity", (p) => (at[p.f] === g ? 1 : 0.22));
    const fs = Object.keys(est).filter((f) => est[f] && at[f] === g).sort((x, y) => est[y] - est[x]), n = d3.sum(fs, (f) => est[f]);
    const tt = sumOf?.(g);
    const p = tt ? tt.reduce((a, x) => a + (x >= 176 ? 1 : 0), 0) / tt.length : null;
    foco.innerHTML = T?.hemiciclo_foco ? md(T.hemiciclo_foco, { vars: { grupo: NAME[g], escanos: n, partidos: fs.map((f) => famName(f, "generales_2026-11")).join(", ") || t("ningún partido"),
      veces: p == null ? null : p < 0.005 ? t("menos de 1") : p > 0.995 ? t("más de 99") : String(Math.round(p * 100)) }, flags: { simulaciones: p != null }, page: "resultados" }).html : "";
  };
  return {
    update(a, g, s) {
      at = a; fijo = g; sumOf = s;
      const orden = Object.keys(est).filter((f) => est[f]).sort((x, y) => G.indexOf(at[x] ?? "otros") - G.indexOf(at[y] ?? "otros") || IDEO.indexOf(x) - IDEO.indexOf(y));
      let i = 0;
      for (const f of orden) for (let k = 0; k < est[f]; k++) if (pts[i]) pts[i++].f = f;
      dots.attr("fill", (p) => fam(p.f).color);
      paint(g);
    },
    focus(g) { if (g !== f0) { f0 = g; paint(g ?? fijo); } },
  };
}

// Ranges per party ("Escaños por partido" and "Voto estimado"): a dot at the central estimate and a band from the 5th
// to the 95th percentile of the simulations; rows with `avg` also get a tick at the simple poll average.
function escanosFilas(PR) {
  // the dot is the central scenario (the seats of "Forma tu mayoría" and the hemicycle), so a party has one figure on the page;
  // until 2026-11-17 it was the median, which can differ by one (PP 129 here, 130 there)
  const rows = Object.entries(PR.partidos).filter(([, d]) => d.escanos).map(([f, d]) => ({ f, c: PR.central?.[f] ?? d.escanos.p50, lo: d.escanos.p05, hi: d.escanos.p95 }));
  for (const [f, d] of Object.entries(PR.otros_escanos ?? {})) rows.push({ f, c: Math.round(d.media), lo: d.p05, hi: d.p95 });
  return rows.filter((r) => r.hi >= 1).sort((a, b) => b.c - a.c || b.hi - a.hi);
}
function votoFilas(PR) {
  return Object.entries(PR.partidos).map(([f, d]) => ({ f, c: d.voto.p50, lo: d.voto.p05, hi: d.voto.p95 }))
    .filter((r) => r.c >= 0.5).sort((a, b) => b.c - a.c);
}
// How often each value comes out, for the shade under each range (Víctor, 2026-11-18, after EL PAÍS's province bars): seats,
// the share of draws with each number of seats (DR, the model's draws); vote, without draws on the page, a two-piece normal
// through the median and the 5th and 95th percentiles. Each list of {v, w} has its largest w at 1.
function densEscanos(DR) {
  const out = {};
  DR.partidos.forEach((f, i) => {
    const h = new Map();
    for (const x of DR.s[i]) h.set(x, (h.get(x) ?? 0) + 1);
    const mx = Math.max(...h.values());
    out[f] = [...h].map(([v, n]) => ({ v, w: n / mx, h: 0.5 }));
  });
  return out;
}
// the polls of the last 30 days of fieldwork before the model's data cut, one dot each on the vote ranges (Víctor, 2026-11-18)
async function encuestasMes(PR) {
  const E = await load("encuestas.json").catch(() => null);
  if (!E?.polls) return null;
  const fin = new Date(`${PR.ultimo_campo ?? E.dias.at(-1)}T12:00`), ini = new Date(+fin - 30 * 864e5);
  const out = {};
  for (const q of E.polls) {
    const d = new Date(`${q.f1 ?? q.d}T12:00`);
    if (d < ini || d > fin) continue;
    for (const [f, v] of Object.entries(q.v ?? {})) if (v != null) (out[f] ??= []).push(v);
  }
  return out;
}
function densCuantiles(r) {
  const sl = Math.max((r.c - r.lo) / 1.645, 0.05), sh = Math.max((r.hi - r.c) / 1.645, 0.05), paso = 0.25, out = [];
  for (let v = Math.max(0, r.c - 3 * sl); v <= r.c + 3 * sh; v += paso) { const z = (v - r.c) / (v < r.c ? sl : sh); out.push({ v, w: Math.exp(-0.5 * z * z), h: paso / 2 }); }
  return out;
}
function rangos(rows, { dec = 0, pct = false, base = null, fijo = null, dens = null, puntos = null } = {}) {
  // base (f -> {lo, hi}): the unconditioned band, drawn faint under the conditioned one; fijo: the party held fixed
  const max = Math.max(...rows.map((r) => Math.max(r.hi, r.avg ?? 0, base?.[r.f]?.hi ?? 0, ...(puntos?.[r.f] ?? [0])))) * 1.05;
  const x = (v) => `${(100 * v / max).toFixed(2)}%`;
  const n = (v) => `${num(v, dec)}${pct ? "%" : ""}`;
  return `<div class="rangos">${rows.map((r) => `<div class="rg-fila${r.f === fijo ? " rg-fijo" : ""}">
    <span class="rg-nom"><i class="dot" style="background:${pc(r.f)}"></i>${short(r.f)}</span>
    <span class="rg-pista">${base?.[r.f] ? `<span class="rg-franja rg-base" style="left:${x(base[r.f].lo)};width:${x(base[r.f].hi - base[r.f].lo)}"></span>` : ""}${(() => {
      const ds = dens === "cuantiles" ? densCuantiles(r) : dens?.[r.f];
      if (!ds) return `<span class="rg-franja" style="left:${x(r.lo)};width:${x(r.hi - r.lo)};background:${pc(r.f)}"></span>`;
      return ds.filter((d) => d.w > 0.02).map((d) => `<i class="rg-d" style="left:${x(Math.max(0, d.v - d.h))};width:${x(2 * d.h)};opacity:${(0.06 + 0.8 * d.w).toFixed(2)};background:${pc(r.f)}"></i>`).join("")
        + `<span class="rg-caja" style="left:${x(r.lo)};width:${x(r.hi - r.lo)}"></span>`;
    })()}${(puntos?.[r.f] ?? []).map((v, i) => `<i class="rg-enc" style="left:${x(v)};top:${-7 + (i % 3) * 3}px"></i>`).join("")}<span class="rg-punto" style="left:${x(r.c)};background:${pc(r.f)}"></span>${r.avg != null ? `<span class="rg-media" style="left:${x(r.avg)}" title="${t("Promedio de encuestas:")} ${n(r.avg)}"></span>` : ""}</span>
    <span class="rg-num"><b>${n(r.c)}</b> <span class="muted">${num(r.lo, dec)}–${num(r.hi, dec)}</span></span></div>`).join("")}</div>`;
}

// Seats of the reader's left and right blocs week by week since the election was called: each week's stored draws
// (prediccion_serie_draws.json) summed over the parties of the bloc, then p05, p50 and p95; with the 176 line
function evolucion(el, SD, at, conv) {
  const desde = conv?.calendario?.find((c) => c.clave === "convocatoria_boe")?.fecha ?? "2026-09-01";
  const DEF = { podemos: "izquierda", salf: "derecha" };   // parties with no seat in the central scenario
  const group = (f) => at[f] ?? DEF[f] ?? "otros";
  const q = (a, p) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
  const W = SD.semanas.filter((w) => w.f >= desde).map((w) => {
    const b = {};
    for (const g of ["izquierda", "derecha"]) {
      const fs = Object.keys(w.s).filter((f) => group(f) === g);
      const n = w.s[fs[0]]?.length ?? 0;
      const sum = Array.from({ length: n }, (_, i) => fs.reduce((a, f) => a + w.s[f][i], 0)).sort((x, y) => x - y);
      b[g] = n ? [q(sum, 0.05), q(sum, 0.5), q(sum, 0.95)] : [0, 0, 0];
    }
    return { f: w.f, bloques: b };
  });
  if (W.length < 2) { el.innerHTML = ""; return; }
  const B = [["derecha", t("Derecha"), "#1d84ce"], ["izquierda", t("Izquierda"), "#e30613"]];
  const w = el.clientWidth || 700, narrow = w < 560, h = 220, m = { t: 10, r: narrow ? 92 : 110, b: 24, l: 34 };   // narrow: still room for "Derecha 195" (it was cut at 70)
  const x = d3.scaleTime().domain(d3.extent(W, (d) => new Date(d.f))).range([m.l, w - m.r]);
  const lo = d3.min(W, (d) => Math.min(d.bloques.derecha[0], d.bloques.izquierda[0])), hi = d3.max(W, (d) => Math.max(d.bloques.derecha[2], d.bloques.izquierda[2]));
  const y = d3.scaleLinear().domain([Math.min(lo, 170) - 5, Math.max(hi, 180) + 5]).range([h - m.b, m.t]);
  el.innerHTML = "";
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`).attr("width", "100%");
  const gx = svg.append("g").attr("transform", `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(narrow ? 3 : 5).tickFormat(d3.timeFormat("%e %b"))).attr("color", "var(--ink-3)");
  cull(gx.selectAll("text").nodes(), { pad: 4 });   // weekly ticks: drop the dates that run into the previous one
  svg.append("g").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5)).attr("color", "var(--ink-3)");
  svg.append("line").attr("x1", m.l).attr("x2", w - m.r).attr("y1", y(176)).attr("y2", y(176)).attr("stroke", "var(--ink-2)").attr("stroke-dasharray", "4 3");
  svg.append("text").attr("x", m.l + 4).attr("y", y(176) - 4).attr("fill", "var(--ink-2)").text(t("176, mayoría"));
  for (const [k, name, c] of B) {
    svg.append("path").attr("fill", c).attr("opacity", 0.12)
      .attr("d", d3.area().x((d) => x(new Date(d.f))).y0((d) => y(d.bloques[k][0])).y1((d) => y(d.bloques[k][2])).curve(d3.curveMonotoneX)(W));
    svg.append("path").attr("fill", "none").attr("stroke", c).attr("stroke-width", 2)
      .attr("d", d3.line().x((d) => x(new Date(d.f))).y((d) => y(d.bloques[k][1])).curve(d3.curveMonotoneX)(W));
  }
  const labs = declutter(B.map(([k, name, c]) => ({ name, c, v: W.at(-1).bloques[k][1], y: y(W.at(-1).bloques[k][1]), priority: W.at(-1).bloques[k][1] })), { min: m.t, max: h - m.b });
  leaders(svg, labs, { x0: w - m.r + 2, x1: w - m.r + 7 });
  for (const l of labs.filter((q) => !q.hidden)) svg.append("text").attr("x", w - m.r + 8).attr("y", l.y + 4).attr("fill", l.c).attr("font-weight", 600).text(`${l.name} ${l.v}`);
  const cross = svg.append("line").attr("y1", m.t).attr("y2", h - m.b).attr("stroke", "var(--ink-3)").style("display", "none");
  svg.append("rect").attr("x", m.l).attr("y", m.t).attr("width", w - m.l - m.r).attr("height", h - m.t - m.b).attr("fill", "transparent")
    .on("mousemove", (ev) => {
      const xd = x.invert(d3.pointer(ev)[0]);
      const d = W[d3.leastIndex(W, (o) => Math.abs(new Date(o.f) - xd))];
      cross.attr("x1", x(new Date(d.f))).attr("x2", x(new Date(d.f))).style("display", null);
      showTip(`<b>${t("Predicción del {f}", { f: fechaLarga(d.f) })}</b>${B.map(([k, name, c]) => `<div class="row"><span><i class="dot" style="background:${c}"></i>${name}</span><span>${d.bloques[k][1]} (${t("{a} a {b}", { a: d.bloques[k][0], b: d.bloques[k][2] })})</span></div>`).join("")}`, ev);
    })
    .on("mouseleave", () => { cross.style("display", "none"); hideTip(); });
}

// "Fija un partido" (Víctor's note 8, 2026-11-16): hold one party's seats at a value and redraw every other range with only
// the draws in which that party gets those seats (DR: the model's draws, seats of every party in each one, jointly), so the
// correlations show: with the PP lower, how much Vox and the PSOE gain. A window of ±w seats around the value, the narrowest
// with at least COND_MIN draws (up to ±COND_MAXW); fewer than that and the note says so.
const COND_MIN = 400, COND_MAXW = 6;
// the party with its article where Spanish uses one ("de que el PP saque"); English and the rest go bare
const ART = { pp: "el PP", psoe: "el PSOE", pnv: "el PNV", bng: "el BNG" };
const conArt = (f) => (lang() === "es" && ART[f]) || short(f);
function condicionar(root, PR, DR, T) {
  const el = root.querySelector(".cond"), rg = root.querySelector(".rg-esc");
  if (!el || !rg) return;
  const filas = escanosFilas(PR), base = Object.fromEntries(filas.map((r) => [r.f, r]));
  const fs = filas.map((r) => r.f).filter((f) => DR.partidos.includes(f));
  const S = DR.s[0].length, col = (f) => DR.s[DR.partidos.indexOf(f)];
  const q = (xs, a) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(a * (xs.length - 1))))];
  const rango = (f) => { const xs = Float64Array.from(col(f)).sort(); return [q(xs, 0.01), q(xs, 0.99)]; };
  let f = fs[0], v = null;
  el.innerHTML = `<label class="cond-l">${t("Fija los escaños de")} <select class="cond-f">${fs.map((x) => `<option value="${x}">${short(x)}</option>`).join("")}</select></label>
    <span class="cond-pista"><input type="range" class="cond-v" step="1" aria-label="${t("Escaños fijados")}"><span class="cond-esp" aria-hidden="true"></span></span><span class="cond-n"></span>
    <button type="button" class="cond-x">${t("Quitar")}</button><div class="cond-nota"></div>`;
  const sel = el.querySelector(".cond-f"), sl = el.querySelector(".cond-v"), lab = el.querySelector(".cond-n"), x = el.querySelector(".cond-x"), nota = el.querySelector(".cond-nota");
  // the expected seats (the central scenario) stay marked on the slider as a tick, wherever the thumb goes (Víctor, 2026-11-17);
  // the thumb's centre runs from 8 px to 100% - 8 px (a 16 px thumb)
  const esp = el.querySelector(".cond-esp");
  const setRange = () => {
    const [a, b] = rango(f), c = Math.round(base[f].c);
    sl.min = a; sl.max = b; sl.value = c;
    const fr = b > a ? (c - a) / (b - a) : 0.5;
    esp.style.left = `calc(8px + (100% - 16px) * ${fr})`; esp.title = t("{n} escaños esperados", { n: c });
  };
  const pinta = () => {
    x.hidden = v == null; el.classList.toggle("on", v != null);
    if (v == null) {
      lab.textContent = "";
      rg.innerHTML = rangos(filas, { dec: 0, dens: densEscanos(DR) });
      nota.innerHTML = T?.condiciona ? md(T.condiciona, { flags: { activo: false }, page: "resultados" }).html : "";
      return;
    }
    const c = col(f);
    let w = 0, idx = [];
    for (; w <= COND_MAXW; w++) { idx = []; for (let k = 0; k < S; k++) if (Math.abs(c[k] - v) <= w) idx.push(k); if (idx.length >= COND_MIN) break; }
    w = Math.min(w, COND_MAXW);
    lab.textContent = t("{n} escaños", { n: v });
    const rows = filas.map((r) => {
      if (!DR.partidos.includes(r.f) || !idx.length) return r;
      const xs = Float64Array.from(idx, (k) => col(r.f)[k]).sort();
      return { f: r.f, c: q(xs, 0.5), lo: q(xs, 0.05), hi: q(xs, 0.95) };
    });   // same rows in the same order as without conditioning, so the eye compares row by row
    rg.innerHTML = rangos(rows, { dec: 0, base, fijo: f });
    const pp = col("pp"), vox = col("vox");
    const k176 = idx.filter((k) => pp[k] + vox[k] >= 176).length;
    // the tail on the side the thumb went: P(seats <= v) left of the expected seats, P(seats >= v) right of them (or at them)
    const c0 = Math.round(base[f].c), menos = v < c0;
    let cola = 0; for (let k = 0; k < S; k++) if (menos ? c[k] <= v : c[k] >= v) cola++;
    const pc_ = cola / S, prob = pc_ < 0.005 ? t("menos del 1%") : pc_ > 0.995 ? t("más del 99%") : `${Math.round(pc_ * 100)}%`;
    nota.innerHTML = T?.condiciona ? md(T.condiciona, { vars: { partido: conArt(f), v, prob, esperados: c0, escanos: w ? t("entre {a} y {b} escaños", { a: v - w, b: v + w }) : t("{n} escaños", { n: v }),
      n: idx.length.toLocaleString(loc()), total: S.toLocaleString(loc()), ppvox: idx.length ? deCada(Math.round(10 * k176 / idx.length), 10) : "·" },
      flags: { activo: true, pocas: idx.length < COND_MIN, ninguna: !idx.length, menos, mas: !menos }, page: "resultados" }).html : "";
  };
  sel.onchange = () => { f = sel.value; v = null; setRange(); pinta(); };
  sl.oninput = () => { v = +sl.value; pinta(); };
  x.onclick = () => { v = null; setRange(); pinta(); };
  setRange(); pinta();
}
