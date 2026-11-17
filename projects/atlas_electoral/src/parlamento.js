// "Los 350 escaños, uno a uno" (Víctor, 2026-11-16): a hemicycle where each dot is one concrete seat (the PSOE's first seat in
// Soria, the PP's second in Navarra...), drawn by how sure it is: solid when its party wins it in more than 999 of 1,000 draws,
// lighter from 95 in 100, a ring when it is in play. Hover or tap: the province, the seat, how often it is won, the votes it has
// to spare (or lacks) in the median draw and who takes it when it is lost. Data: escanos_350.json (pipeline/escanos_350.py),
// always «Nuestra predicción». Two orders: by party (left to right) or by how sure (in play in the middle).
import { showTip, hideTip } from "./data.js?v=0.2.147";
import { IDEO, fam } from "./charts.js?v=0.2.147";
import { asientos } from "./resultados.js?v=0.2.147";
import { short, pc } from "./provincia.js?v=0.2.147";
import { textos, md } from "./textos.js?v=0.2.147";
import { t, deCada, ordinal, loc } from "./i18n.js?v=0.2.147";
const d3 = window.d3;

export const CLASES = [["seguro", 0.999], ["probable", 0.95], ["juego", 0]];   // the first threshold each seat reaches
const clase = (p) => CLASES.find(([, x]) => p >= x)[0];
// "más de 999 de cada 1.000", "997 de cada 1.000", "87 de cada 100"
// (a seat in play, under 95 in 100, never reads "95 de cada 100" by rounding)
const frec = (p) => (p >= 0.9995 ? t("más de 999 de cada 1.000") : p >= 0.995 ? deCada(Math.round(p * 1000), t("1.000"))
  : deCada(Math.max(1, Math.min(p < 0.95 ? 94 : 99, Math.round(p * 100))), 100));
const miles = (n) => n.toLocaleString(loc());
// a family, or "family|2023 list name" for one of two lists of a family in a province (Navarra: PP and UPN)
const nombre = (f, prov) => { const [fa, sig] = f.split("|"); return sig ? `${sig === "U.P.N." ? "UPN" : sig.replace(/^JxCAT - /, "")} (${short(fa, prov)})` : short(fa, prov); };
const familia = (f) => f.split("|")[0];

export async function parlamento(el, E, D) {
  const T = await textos("portada");
  const nomProv = Object.fromEntries(D.provincias.map((p) => [p.prov, p.n]));
  const cuenta = Object.fromEntries(CLASES.map(([c]) => [c, E.escanos.filter((s) => clase(s.p) === c).length]));
  let orden = "partido";
  el.innerHTML = `<div class="seg pl-orden" role="group" aria-label="${t("Orden de los escaños")}"><button type="button" data-o="partido">${t("Por partido")}</button><button type="button" data-o="seguridad">${t("Por seguridad")}</button></div>
    <div class="pl-wrap"><svg class="pl-svg" role="img" aria-label="${t("Hemiciclo de los 350 escaños, cada uno según lo seguro que está")}"></svg></div>
    <div class="legend pl-leg">${CLASES.map(([c]) => `<span><i class="pl-sw pl-${c}"></i>${t({ seguro: "Casi seguros", probable: "Probables", juego: "En juego" }[c])} <b>${cuenta[c]}</b></span>`).join("")}</div>`;
  const { pts, punto } = asientos(E.escanos.length);
  const svg = d3.select(el).select("svg").attr("viewBox", "-1.04 -1.06 2.08 1.1");
  const g = svg.append("g");
  const ideo = (s) => { const i = IDEO.indexOf(familia(s.f) === "sumar" ? "sumar" : familia(s.f)); return i < 0 ? 99 : i; };
  const rank = { seguro: 0, probable: 1, juego: 2 };
  const ordenar = () => {
    const xs = [...E.escanos];
    // by party: left to right, and inside a party the surest first; by how sure: the sure seats at both ends, the ones in play
    // in the middle, each class by party
    if (orden === "partido") xs.sort((a, b) => ideo(a) - ideo(b) || b.p - a.p);
    else {
      const izq = xs.filter((s, i) => i % 2 === 0), der = xs.filter((s, i) => i % 2 === 1);
      izq.sort((a, b) => rank[clase(a.p)] - rank[clase(b.p)] || ideo(a) - ideo(b));
      der.sort((a, b) => rank[clase(b.p)] - rank[clase(a.p)] || ideo(a) - ideo(b));
      xs.splice(0, xs.length, ...izq, ...der);
    }
    return xs;
  };
  const tip = (s) => {
    const n = nombre(s.f, s.prov), quien = Object.entries(s.quien ?? {});
    return md(T.tooltip_350, { vars: { provincia: nomProv[s.prov] ?? s.prov, escano: ordinal(s.k), partido: n, frecuencia: frec(s.p),
      votos: miles(Math.abs(s.margen)), quien: quien.map(([f, x]) => `${nombre(f, s.prov)} (${deCada(Math.max(1, Math.round(x * 10)), 10)})`).join(", ") },
      flags: { sobran: s.margen > 0, faltan: s.margen <= 0, quien: quien.length > 0 && s.p < 0.9995 }, page: "portada" }).html;
  };
  // each seat keeps its dot (keyed by province, party and k), so a new order moves the dots; the first drawing places them at once
  const clave = (s) => `${s.prov}-${s.f}-${s.k}`;
  let primera = true;
  const dibuja = () => {
    const xs = ordenar();
    const datos = pts.map((p, i) => ({ ...p, s: xs[i] }));
    const c = g.selectAll("circle").data(datos, (d) => clave(d.s)).join("circle").attr("r", punto)
      .attr("class", (d) => `pl-d pl-${clase(d.s.p)}`)
      .attr("style", (d) => `--c:${pc(familia(d.s.f)) === "#888" ? fam(familia(d.s.f)).color : pc(familia(d.s.f))}`);
    (primera ? c : c.transition().duration(600)).attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    primera = false;
    el.querySelectorAll(".pl-orden button").forEach((b) => { b.classList.toggle("on", b.dataset.o === orden); b.setAttribute("aria-pressed", b.dataset.o === orden); });
  };
  let sel = null;
  const marca = (d) => { g.selectAll("circle").classed("pl-on", (q) => q === d); };
  g.on("mousemove", (ev) => { const d = d3.select(ev.target).datum(); if (d?.s) { showTip(tip(d.s), ev); if (!sel) marca(d); } })
    .on("mouseleave", () => { if (!sel) { hideTip(); marca(null); } })
    .on("click", (ev) => { const d = d3.select(ev.target).datum(); if (d?.s) { ev.stopPropagation(); sel = d; marca(d); showTip(tip(d.s), ev); } });
  svg.on("click", () => { sel = null; marca(null); hideTip(); });
  el.querySelector(".pl-orden").addEventListener("click", (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.o !== orden) { orden = b.dataset.o; dibuja(); } });
  dibuja();
  return cuenta;
}
