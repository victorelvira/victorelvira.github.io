// "Provincia a provincia" on the front page (Víctor, 2026-11-18, after EL PAÍS's page of the same day: "dale a todo").
// A tile map of the 52 constituencies, each tile filled with one small square per seat option (escanos_350.json "opciones":
// every seat a party wins in at least 1 draw in 4), coloured by party and shaded by class (almost sure solid, likely tinted,
// in play hatched, the same as "Opciones de escaño por partido"). Two filters, by party and by class, with the counts.
// A tile picked (or the list below) opens the province's card in three tabs: the options per party, the seats and the vote,
// the last two as a band whose shade is how often each value comes out, a tick at the median, a box with 9 in 10 simulations
// and the change from 2023. The first time the map scrolls into view its squares start as the party bars and fly to their
// provinces (skipped with reduced motion); a button plays it again.
// Data: escanos_350.json (options), provincias_29n.json (seat and vote per list, pk = P(at least k seats), 2023), and, for the
// vote shades, provincias_29n_draws.json (500 draws of the vote per family and province), loaded the first time it is needed.
import { load, showTip, hideTip } from "./data.js?v=0.2.164";
import { IDEO, fam } from "./charts.js?v=0.2.164";
import { short, pc } from "./provincia.js?v=0.2.164";
import { textos, md } from "./textos.js?v=0.2.164";
import { t, deCada, loc } from "./i18n.js?v=0.2.164";
import { CLASES } from "./parlamento.js?v=0.2.164";

const clase = (p) => CLASES.find(([, x]) => p >= x)[0];
const familia = (f) => f.split("|")[0];
const color = (f) => (pc(f) === "#888" ? fam(f).color : pc(f));
const PARTIDOS = ["pp", "psoe", "vox", "sumar", "podemos"];   // a filter button each; the rest is "otros"
const grupo = (f) => (PARTIDOS.includes(familia(f)) ? familia(f) : "otros");
const NOMBRE = { seguro: "Casi seguros", probable: "Probables", juego: "En juego" };
// tile grid (column, row), roughly where each province is; the Canaries, Ceuta and Melilla in the last row
const CASILLA = {
  15: [0, 0, "C"], 27: [1, 0, "LU"], 33: [2, 0, "AS"], 39: [3, 0, "S"], 48: [4, 0, "BI"], 20: [5, 0, "SS"], 31: [6, 0, "NA"], 22: [7, 0, "HU"], 25: [8, 0, "L"], 17: [9, 0, "GI"],
  36: [0, 1, "PO"], 32: [1, 1, "OU"], 24: [2, 1, "LE"], 34: [3, 1, "P"], "09": [4, 1, "BU"], "01": [5, 1, "VI"], 26: [6, 1, "LO"], 50: [7, 1, "Z"], 43: [8, 1, "T"], "08": [9, 1, "B"],
  49: [1, 2, "ZA"], 47: [2, 2, "VA"], 40: [3, 2, "SG"], 42: [4, 2, "SO"], 19: [5, 2, "GU"], 44: [6, 2, "TE"], 12: [7, 2, "CS"],
  37: [1, 3, "SA"], "05": [2, 3, "AV"], 28: [3, 3, "M"], 16: [5, 3, "CU"], 46: [6, 3, "V"], "07": [8, 3, "IB"],
  10: [1, 4, "CC"], 45: [2, 4, "TO"], 13: [3, 4, "CR"], "02": [5, 4, "AB"], "03": [6, 4, "A"],
  "06": [1, 5, "BA"], 14: [2, 5, "CO"], 23: [3, 5, "J"], 30: [5, 5, "MU"],
  21: [1, 6, "H"], 41: [2, 6, "SE"], 18: [3, 6, "GR"], "04": [4, 6, "AL"],
  11: [2, 7, "CA"], 29: [3, 7, "MA"],
  38: [0, 8, "TF"], 35: [1, 8, "GC"], 51: [3, 8, "CE"], 52: [4, 8, "ML"],
};
const pad = (c) => String(c).padStart(2, "0");

export async function mosaico(el, E, D) {
  const T = await textos("portada");
  const byCode = Object.fromEntries(D.provincias.map((p) => [p.prov, p]));
  const orden = (f) => { const i = IDEO.indexOf(familia(f)); return i < 0 ? 99 : i; };
  const ops = (E.opciones ?? []).filter((o) => byCode[o.prov])
    .map((o) => ({ ...o, g: grupo(o.f), c: clase(o.p) }))
    .sort((a, b) => a.prov.localeCompare(b.prov) || CLASES.findIndex(([c]) => c === a.c) - CLASES.findIndex(([c]) => c === b.c) || orden(a.f) - orden(b.f) || b.p - a.p);
  let partido = "todos", cls = "todos", sel = "28", tab = "juego", VD = null;
  const provs = Object.keys(CASILLA).map(pad).filter((c) => byCode[c]);
  el.innerHTML = `<div class="mz-ctl"><div class="seg mz-p" role="group" aria-label="${t("Partido")}"><button type="button" data-p="todos">${t("Todos")}</button>${PARTIDOS.map((f) => `<button type="button" data-p="${f}">${short(f)}</button>`).join("")}<button type="button" data-p="otros">${t("Otros")}</button></div>
    <div class="seg mz-c" role="group" aria-label="${t("Seguridad")}"></div></div>
    <div class="mz-wrap"><div class="mz-grid">${provs.map((c) => { const [x, y, ab] = CASILLA[+c] ?? CASILLA[c]; return `<button type="button" class="mz-t" data-prov="${c}" style="grid-column:${x + 1};grid-row:${y + 1}" aria-label="${byCode[c].n}"><span class="mz-ab">${ab}</span><span class="mz-qs"></span></button>`; }).join("")}</div>
    <button type="button" class="mz-otra">${t("Ver otra vez cómo se reparten")}</button></div>
    <div class="legend pl-leg">${CLASES.map(([c]) => `<span><i class="pl-sw pl-${c}"></i>${t(NOMBRE[c])}</span>`).join("")}</div>
    <div class="card mz-ficha"></div>`;
  const grid = el.querySelector(".mz-grid"), ficha = el.querySelector(".mz-ficha"), segC = el.querySelector(".mz-c");
  const pasa = (o) => (partido === "todos" || o.g === partido) && (cls === "todos" || o.c === cls);
  const pinta = () => {
    el.querySelectorAll("[data-p]").forEach((b) => { b.classList.toggle("on", b.dataset.p === partido); b.setAttribute("aria-pressed", b.dataset.p === partido); });
    const delPartido = ops.filter((o) => partido === "todos" || o.g === partido);
    segC.innerHTML = `<button type="button" data-c="todos" class="${cls === "todos" ? "on" : ""}">${t("Todos")}<small>${delPartido.length}</small></button>` + CLASES.map(([c]) =>
      `<button type="button" data-c="${c}" class="${cls === c ? "on" : ""}">${t(NOMBRE[c])}<small>${delPartido.filter((o) => o.c === c).length}</small></button>`).join("");
    for (const tEl of grid.querySelectorAll(".mz-t")) {
      const c = tEl.dataset.prov;
      tEl.classList.toggle("on", c === sel);
      tEl.querySelector(".mz-qs").innerHTML = ops.filter((o) => o.prov === c && pasa(o)).map((o) => `<i class="mz-q op-${o.c}" style="--c:${color(o.f)}"></i>`).join("");
    }
  };
  // the province's card
  const fichaHtml = async () => {
    const p = byCode[sel], listas = p.listas.filter((l) => l.f !== "otros" && (l.pk[0] ?? 0) >= 0.02);
    const med = (l) => l.pk.filter((x) => x >= 0.5).length;
    const nom = (f) => short(f, p.prov);
    const signo = (d, u = "") => (d > 0 ? `+${d.toLocaleString(loc())}${u}` : d < 0 ? `−${(-d).toLocaleString(loc())}${u}` : `=`);
    const opcProv = ops.filter((o) => o.prov === sel);
    let cuerpo = "";
    if (tab === "juego") {
      cuerpo = `<table class="nosort mz-tab"><tr><th>${t("Partido")}</th>${CLASES.map(([c]) => `<th>${t(NOMBRE[c])}</th>`).join("")}</tr>
        ${listas.filter((l) => opcProv.some((o) => familia(o.f) === l.f)).map((l) => `<tr><td><b style="color:${color(l.f)}">${nom(l.f)}</b><br><span class="muted">${t("{n} esc.", { n: med(l) })} (${l.lo === l.hi ? l.lo : `${l.lo}–${l.hi}`})</span></td>
          ${CLASES.map(([c]) => { const n = opcProv.filter((o) => familia(o.f) === l.f && o.c === c).length; const q = `<i class="mz-q op-${c}" style="--c:${color(l.f)}"></i>`; return `<td>${n ? `<span class="mz-mini">${q.repeat(n)}</span> ${n}` : '<span class="muted">0</span>'}</td>`; }).join("")}</tr>`).join("")}</table>`;
    } else {
      const votos = tab === "votos";
      if (votos && !VD) VD = await load("provincias_29n_draws.json").catch(() => ({ provincias: {} }));
      const xmax = votos ? Math.min(100, Math.ceil(Math.max(...listas.map((l) => l.vhi)) / 10) * 10 + 5) : p.esc;
      const pos = (v) => `${(100 * v / xmax).toFixed(2)}%`;
      const filas = listas.map((l) => {
        let celdas = "", c, lo, hi, d23, txt;
        if (votos) {
          const pd = VD.provincias?.[p.prov], j = pd?.f.indexOf(l.f) ?? -1;
          const bins = new Array(Math.ceil(xmax * 2)).fill(0);   // half a point
          if (j >= 0) for (const r of pd.d) { const b = Math.floor(r[j] / 5); if (b >= 0 && b < bins.length) bins[b]++; }
          const mx = Math.max(...bins, 1);
          celdas = bins.map((n, b) => (n ? `<i style="left:${pos(b / 2)};width:${pos(0.5)};opacity:${(0.08 + 0.92 * n / mx).toFixed(2)}"></i>` : "")).join("");
          c = l.v; lo = l.vlo; hi = l.vhi; d23 = p.v23?.[l.f] != null ? Math.round((l.v - p.v23[l.f]) * 10) / 10 : null;
          txt = `${c.toLocaleString(loc(), { maximumFractionDigits: 1 })}%`;
        } else {
          const prob = (k) => (k === 0 ? 1 - (l.pk[0] ?? 0) : (l.pk[k - 1] ?? 0) - (l.pk[k] ?? 0));
          const ps = Array.from({ length: p.esc + 1 }, (_, k) => prob(k)), mx = Math.max(...ps);
          celdas = ps.map((x, k) => (x > 0.002 ? `<i style="left:${pos(k - 0.5 < 0 ? 0 : k - 0.5)};width:${pos(k === 0 ? 0.5 : 1)};opacity:${(0.08 + 0.92 * x / mx).toFixed(2)}"></i>` : "")).join("");
          c = med(l); lo = l.lo; hi = l.hi; d23 = c - (p.s23?.[l.f] ?? 0);
          txt = t("{n} esc.", { n: c });
        }
        return `<div class="mz-fila"><span class="mz-nom"><b style="color:${color(l.f)}">${nom(l.f)}</b><br>${txt} <span class="muted">(${d23 == null ? "·" : signo(d23)})</span></span>
          <span class="mz-pista" style="--c:${color(l.f)}">${celdas}<span class="mz-caja" style="left:${pos(lo)};width:${pos(Math.max(hi - lo, votos ? 0.2 : 0))}"></span><span class="mz-med" style="left:${pos(c)}"></span>
          <span class="mz-et" style="left:${pos(lo)}">${votos ? lo.toLocaleString(loc(), { maximumFractionDigits: 1 }) : lo}</span><span class="mz-et mz-et-hi" style="left:${pos(hi)}">${votos ? hi.toLocaleString(loc(), { maximumFractionDigits: 1 }) : hi}</span></span></div>`;
      }).join("");
      cuerpo = `<div class="mz-filas">${filas}</div><div class="legend mz-leg"><span><i class="mz-sw-g"></i>${t("Más oscuro, más probable")}</span><span><i class="mz-sw-m"></i>${t("Mediana")}</span><span><i class="mz-sw-c"></i>${deCada(9, 10)} ${t("simulaciones")}</span><span>${votos ? t("Entre paréntesis, cambio en puntos respecto a 2023") : t("Entre paréntesis, cambio respecto a 2023")}</span></div>`;
    }
    ficha.innerHTML = `<div class="mz-cab"><label>${t("Provincia")} <select class="mz-sel">${[...D.provincias].sort((a, b) => a.n.localeCompare(b.n, "es")).map((q) => `<option value="${q.prov}"${q.prov === sel ? " selected" : ""}>${q.n} (${t("{n} esc.", { n: q.esc })})</option>`).join("")}</select></label>
      <a href="#provincia/${sel}">${t("Ficha completa")} →</a></div>
      <div class="seg mz-tabs" role="tablist">${[["juego", "Opciones"], ["escanos", "Escaños"], ["votos", "Votos"]].map(([k, n]) => `<button type="button" role="tab" data-tab="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}">${t(n)}</button>`).join("")}</div>
      ${cuerpo}`;
  };
  el.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-p],[data-c],.mz-t,[data-tab],.mz-otra");
    if (!b) return;
    if (b.dataset.p) partido = b.dataset.p;
    else if (b.dataset.c) cls = b.dataset.c;
    else if (b.dataset.tab) { tab = b.dataset.tab; fichaHtml(); return; }
    else if (b.classList.contains("mz-otra")) { vuela(); return; }
    else { sel = b.dataset.prov; fichaHtml(); }
    pinta();
  });
  el.addEventListener("change", (ev) => { if (ev.target.classList.contains("mz-sel")) { sel = ev.target.value; pinta(); fichaHtml(); } });
  grid.addEventListener("mousemove", (ev) => {
    const tl = ev.target.closest(".mz-t");
    if (!tl) { hideTip(); return; }
    const p = byCode[tl.dataset.prov], os = ops.filter((o) => o.prov === p.prov);
    showTip(md(T.tooltip_mosaico, { vars: { provincia: p.n, escanos: p.esc, seguros: os.filter((o) => o.c === "seguro").length, probables: os.filter((o) => o.c === "probable").length,
      juego: os.filter((o) => o.c === "juego").length }, page: "portada" }).html, ev);
  });
  grid.addEventListener("mouseleave", hideTip);
  pinta();
  fichaHtml();

  // the squares start as one bar per party (almost sure at the bottom) and fly to their provinces
  function vuela() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const qs = [...grid.querySelectorAll(".mz-q")];
    if (!qs.length) return;
    const box = grid.getBoundingClientRect(), s = qs[0].getBoundingClientRect().width || 5;
    const gs = [...new Set(qs.map((q) => q.style.getPropertyValue("--c")))];
    const porColor = {};
    qs.forEach((q) => (porColor[q.style.getPropertyValue("--c")] ??= []).push(q));
    const anchoBarra = box.width / Math.max(gs.length, 6), cols = Math.max(4, Math.floor((anchoBarra * 0.7) / (s + 1)));
    gs.forEach((c, i) => {
      const xs = porColor[c].sort((a, b) => (a.classList.contains("op-seguro") ? 0 : a.classList.contains("op-probable") ? 1 : 2) - (b.classList.contains("op-seguro") ? 0 : b.classList.contains("op-probable") ? 1 : 2));
      xs.forEach((q, k) => {
        const r = q.getBoundingClientRect();
        const x0 = box.left + i * anchoBarra + (anchoBarra - cols * (s + 1)) / 2 + (k % cols) * (s + 1), y0 = box.bottom - 4 - Math.floor(k / cols) * (s + 1);
        q.style.transition = "none";
        q.style.transform = `translate(${x0 - r.left}px, ${y0 - r.top}px)`;
      });
    });
    void grid.offsetWidth;
    qs.forEach((q, k) => { q.style.transition = `transform 900ms cubic-bezier(.2,.7,.2,1) ${300 + (k % 60) * 12}ms`; q.style.transform = ""; });
  }
  const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); vuela(); } }, { threshold: 0.4 });
  io.observe(grid);
}
