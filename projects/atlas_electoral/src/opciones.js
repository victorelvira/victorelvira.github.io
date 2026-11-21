// Two blocks under "Los 350 escaños, uno a uno" (Víctor, 2026-11-17, after EL PAÍS's page of 12 Nov):
// 1. "Opciones de escaño por partido": every seat a party wins in at least 1 draw in 4 (escanos_350.json "opciones"), split
//    into almost sure (>= 99 in 100), likely (>= 75 in 100) and in play (25 to 75 in 100), one bar per party. A disputed seat
//    counts once per party that can win it, so the options add up to more than 350. Hover or tap a bar: the provinces.
// 2. "Juega a simular la noche": three real seats (one almost sure, one likely, one in play); each simulated night draws each
//    seat with its probability, so the reader counts how often each one is lost. Independent draws, said in the note.
import { showTip, hideTip } from "./data.js?v=0.2.172";
import { IDEO, fam } from "./charts.js?v=0.2.172";
import { short, pc } from "./provincia.js?v=0.2.172";
import { textos, md } from "./textos.js?v=0.2.172";
import { t, deCada, ordinal, loc } from "./i18n.js?v=0.2.172";
import { CLASES } from "./parlamento.js?v=0.2.172";

const clase = (p) => CLASES.find(([, x]) => p >= x)[0];
const familia = (f) => f.split("|")[0];
const color = (f) => (pc(f) === "#888" ? fam(f).color : pc(f));
const NOMBRE_CLASE = { seguro: "casi seguros", probable: "probables", juego: "en juego" };
// parties with a row of their own; the rest (regional lists that differ by province) go to "Otros"
const PROPIOS = ["psoe", "sumar", "podemos", "erc", "bildu", "pnv", "bng", "junts", "cc", "pp", "vox", "salf"];
const frec = (p) => (p >= 0.9995 ? t("más de 999 de cada 1.000") : p >= 0.99 ? deCada(Math.round(p * 1000), t("1.000"))
  : deCada(Math.max(1, Math.min(p < 0.75 ? 74 : 98, Math.round(p * 100))), 100));

export async function opciones(el, E, D) {
  const T = await textos("portada");
  const nomProv = Object.fromEntries(D.provincias.map((p) => [p.prov, p.n]));
  const ops = E.opciones ?? [];
  const fila = (o) => (PROPIOS.includes(familia(o.f)) ? familia(o.f) : "otros");
  const filas = {};
  for (const o of ops) {
    const r = (filas[fila(o)] ??= { f: fila(o), seguro: [], probable: [], juego: [] });
    r[clase(o.p)].push(o);
  }
  const orden = (f) => { const i = IDEO.indexOf(f); return f === "otros" ? 999 : i < 0 ? 99 : i; };
  const rs = Object.values(filas).sort((a, b) => b.seguro.length + b.probable.length + b.juego.length - (a.seguro.length + a.probable.length + a.juego.length) || orden(a.f) - orden(b.f));
  const max = Math.max(...rs.map((r) => r.seguro.length + r.probable.length + r.juego.length));
  const nom = (f) => (f === "otros" ? t("Otros") : short(f));
  const cuenta = Object.fromEntries(CLASES.map(([c]) => [c, ops.filter((o) => clase(o.p) === c).length]));
  // provinces with most options in play
  const porProv = {};
  for (const o of ops) if (clase(o.p) === "juego") porProv[o.prov] = (porProv[o.prov] ?? 0) + 1;
  const top = Object.entries(porProv).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p, n]) => `${nomProv[p] ?? p} (${n})`).join(", ");
  const resumen = md(T.opciones_resumen, { vars: { seguros: cuenta.seguro, probables: cuenta.probable, juego: cuenta.juego,
    total: ops.length, provincias: top }, page: "portada" }).html;
  el.innerHTML = `${resumen}<div class="op-filas">${rs.map((r) => `<div class="op-fila" style="--c:${color(r.f)}">
      <span class="op-nom">${nom(r.f)}</span>
      <span class="op-barra">${CLASES.map(([c]) => (r[c].length ? `<span class="op-seg op-${c}" data-f="${r.f}" data-c="${c}" style="width:${(100 * r[c].length) / max}%"></span>` : "")).join("")}</span>
      <span class="op-n">${CLASES.map(([c]) => `<b class="op-t-${c}">${r[c].length}</b>`).join(" + ")}</span></div>`).join("")}</div>
    <div class="legend pl-leg">${CLASES.map(([c]) => `<span><i class="pl-sw pl-${c}"></i>${t({ seguro: "Casi seguros", probable: "Probables", juego: "En juego" }[c])}</span>`).join("")}</div>`;
  const tip = (f, c) => {
    const xs = [...filas[f][c]].sort((a, b) => b.p - a.p);
    const MAX = 14;
    const nombre = (o) => (f === "otros" ? `${short(familia(o.f), o.prov)}, ` : "") + `${nomProv[o.prov] ?? o.prov} ${ordinal(o.k)}` + (c === "seguro" ? "" : ` (${frec(o.p)})`);
    const lista = c === "seguro"
      ? Object.entries(xs.reduce((m, o) => ((m[o.prov] = (m[o.prov] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${nomProv[p] ?? p} ${n}`).join(", ")
      : xs.slice(0, MAX).map(nombre).join("; ") + (xs.length > MAX ? `; ${t("y {n} más", { n: xs.length - MAX })}` : "");
    return md(T.tooltip_opciones, { vars: { partido: nom(f), clase: t(NOMBRE_CLASE[c]), n: xs.length, lista }, flags: { lista: xs.length > 0 }, page: "portada" }).html;
  };
  const sobre = (ev) => { const s = ev.target.closest(".op-seg"); if (s) showTip(tip(s.dataset.f, s.dataset.c), ev); else hideTip(); };
  el.addEventListener("mousemove", sobre);
  el.addEventListener("click", (ev) => { ev.stopPropagation(); sobre(ev); });
  el.addEventListener("mouseleave", hideTip);
}

export async function simula(el, E, D) {
  const nomProv = Object.fromEntries(D.provincias.map((p) => [p.prov, p.n]));
  const ops = (E.opciones ?? []).filter((o) => PROPIOS.includes(familia(o.f)));
  const peso = (o) => ops.filter((x) => familia(x.f) === familia(o.f)).length;   // the biggest party first
  const cerca = (xs, p) => [...xs].sort((a, b) => Math.abs(a.p - p) - Math.abs(b.p - p))[0];
  // three real seats: the first seat of the most voted party in the largest province, one likely (near 87 in 100) and one
  // in play (near 1 in 2)
  const grande = [...D.provincias].sort((a, b) => (b.esc ?? 0) - (a.esc ?? 0))[0]?.prov ?? "28";
  const filas = [
    ops.filter((o) => o.prov === grande && o.k === 1 && o.p >= 0.99).sort((a, b) => peso(b) - peso(a))[0] ?? ops.find((o) => o.p >= 0.99),
    cerca(ops.filter((o) => o.p >= 0.75 && o.p < 0.99), 0.87),
    cerca(ops.filter((o) => o.p < 0.75), 0.5),
  ].filter(Boolean).map((o) => ({ o, ganadas: 0, noches: [] }));
  if (!filas.length) { el.remove(); return; }
  const ART = { pp: "del PP", psoe: "del PSOE", pnv: "del PNV", bng: "del BNG" };   // Spanish: "del PP", "de Vox"
  const dePartido = (o) => ART[familia(o.f)] ?? `de ${short(familia(o.f), o.prov)}`;
  const VER = 200;   // squares drawn per seat; past that only the count goes on
  let n = 0;
  el.innerHTML = `<div class="seg sm-bot" role="group" aria-label="${t("Simula noches electorales")}">
      <button type="button" data-n="1">${t("Simula 1 noche")}</button><button type="button" data-n="10">${t("10 noches")}</button><button type="button" data-n="100">${t("100 noches")}</button><button type="button" data-n="0">${t("Empezar de nuevo")}</button></div>
    <div class="sm-filas">${filas.map((r, i) => `<div class="sm-fila" style="--c:${color(familia(r.o.f))}">
      <div class="sm-cab"><span class="sm-tag pl-sw pl-${clase(r.o.p)}"></span><b>${t("{escano} escaño {de_partido} en {provincia}", { escano: ordinal(r.o.k), partido: short(familia(r.o.f), r.o.prov), de_partido: dePartido(r.o), provincia: nomProv[r.o.prov] ?? r.o.prov })}</b>
        · ${t({ seguro: "casi seguro", probable: "probable", juego: "en juego" }[clase(r.o.p)])}: ${t("lo gana en {f} simulaciones del modelo", { f: frec(r.o.p) })}</div>
      <div class="sm-cuadros" id="sm-c${i}"></div><div class="sm-cuenta" id="sm-n${i}"></div></div>`).join("")}</div>`;
  const pinta = () => filas.forEach((r, i) => {
    el.querySelector(`#sm-c${i}`).innerHTML = r.noches.map((g) => `<i class="sm-q${g ? " sm-si" : ""}"></i>`).join("");
    el.querySelector(`#sm-n${i}`).innerHTML = n ? t("Ganado en {g} de {n} noches; perdido en {p}.", { g: r.ganadas.toLocaleString(loc()), n: n.toLocaleString(loc()), p: (n - r.ganadas).toLocaleString(loc()) }) : t("Aún no hay noches simuladas.");
  });
  el.querySelector(".sm-bot").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b) return;
    const k = +b.dataset.n;
    if (!k) { n = 0; filas.forEach((r) => { r.ganadas = 0; r.noches = []; }); }
    for (let j = 0; j < k; j++) {
      n++;
      for (const r of filas) { const g = Math.random() < r.o.p; r.ganadas += g; if (r.noches.length < VER) r.noches.push(g); }
    }
    pinta();
  });
  pinta();
}
