// "Tu voto" (Víctor, 2026-11-17: "lo de dónde votar mejor, como pestaña propia"): pick your province and the bloc you want to
// win seats; the page says with which party of that bloc a vote weighs most there, with the table of every option, and lists
// the best option of each bloc in every province. Data: peso_voto.json (pipeline/peso_voto.py, «Nuestra predicción»); blocs:
// the starting groups of "Forma tu mayoría" (masvotado.js grupoDe, so Geroa Bai goes with the PNV in Navarra).
// The address keeps the choice: #voto/<province code>/<izquierda|derecha>.
import { load } from "./data.js?v=0.2.148";
import { textos, md } from "./textos.js?v=0.2.148";
import { t, lang } from "./i18n.js?v=0.2.148";
import { opcionesPeso, short, colorVoto, PESO_ART, parejas, entreN, PESO_NUNCA } from "./masvotado.js?v=0.2.148";

const KEY = "atlas_electoral.voto";   // the reader's last province and bloc (a convenience: the page works without it)
const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const guardar = (x) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* private window */ } };

export async function renderVoto(app, args = []) {
  const [T, PW, D] = await Promise.all([textos("voto"), load("peso_voto.json"), load("provincias_29n.json")]);
  const provs = [...D.provincias].sort((a, b) => a.n.localeCompare(b.n, "es"));
  const byCode = Object.fromEntries(provs.map((p) => [p.prov, p]));
  const prev = leer();
  let prov = byCode[args[0]] ? args[0] : byCode[prev.prov] ? prev.prov : "28";
  let bloque = ["izquierda", "derecha"].includes(args[1]) ? args[1] : ["izquierda", "derecha"].includes(prev.bloque) ? prev.bloque : "derecha";
  const nomB = (b) => t(PESO_ART[b]);
  // one vote's chance of deciding a seat of the bloc, as "1 entre N" (Víctor, 2026-11-17: "en simulaciones no ayuda"):
  // g is the share of draws in which 1,000 more votes give the bloc a seat, so one vote does it about g / 1,000 of the time;
  // N rounded to two significant figures; under 1 in 2 million it reads "casi nunca"
  const N = entreN, NUNCA = PESO_NUNCA;   // masvotado.js: "1 entre N" and the "casi nunca" floor, shared with the map
  const ART = { pp: "el PP", psoe: "el PSOE", pnv: "el PNV", bng: "el BNG" };
  const conArt = (f) => (lang() === "es" && ART[f]) || short(f, prov);
  // "al PP", "a Vox" (Spanish contracts a + el); English: "for PP" (a vote for) or "from PP" (taken from)
  const aP = (f, en) => (lang() === "es" ? (ART[f] ? `al ${ART[f].slice(3)}` : `a ${short(f, prov)}`) : `${en} ${short(f, prov)}`);
  const veces = (a, b) => { const r = a / b; return r < 3 ? String(Math.round(r * 10) / 10).replace(".", lang() === "en" ? "." : ",") : String(Math.round(r)); };
  const controles = `<div class="vt-ctl"><label class="vt-l">${t("Dónde votas")} <select id="vt-prov">${provs.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></label>
    <div class="seg" id="vt-bloque" role="group" aria-label="${t("Para qué bloque")}"><button type="button" data-b="izquierda">${t("si quieres más escaños para la izquierda")}</button><button type="button" data-b="derecha">${t("si quieres más escaños para la derecha")}</button></div></div>`;
  const { html } = md(T.principal, { slots: { controles, respuesta: '<div id="vt-resp" class="card vt-resp"></div>', lista: '<div id="vt-lista"></div>' }, page: "voto" });
  app.innerHTML = html;
  const sel = app.querySelector("#vt-prov"), seg = app.querySelector("#vt-bloque"), resp = app.querySelector("#vt-resp"), lista = app.querySelector("#vt-lista");
  const respuesta = () => {
    const o = opcionesPeso(PW, prov, {}, bloque), p = byCode[prov], a = o[0], b = o[1];
    const hay = a && a.g >= NUNCA, seg = hay && b && b.g >= NUNCA;
    const frase = md(T.respuesta, { vars: { provincia: p.n, bloque: nomB(bloque), mejor: a ? conArt(a.f) : "", n: hay ? N(a.g) : "",
      segundo: b ? conArt(b.f) : "", veces: seg ? veces(a.g, b.g) : "", a_mejor: a ? aP(a.f, "for") : "", a_segundo: b ? aP(b.f, "for") : "" },
      flags: { vacia: !hay, segundo: seg, parejas: seg && b.g >= 0.8 * a.g }, page: "voto" }).html;
    // every other party of the bloc, one line each, the bad news included
    const lineas = o.slice(hay ? 1 : 0).map((x) => {
      const roba = x.p >= 0.002 && x.p - x.g >= x.g && x.dentro.length;
      const flags = x.g < NUNCA ? (x.v < 3 ? { umbral: true } : { lejos: true }) : roba ? { roba: true } : { normal: true };
      return `<li>${md(T.partido, { vars: { partido: short(x.f, prov), n: x.g >= NUNCA ? N(x.g) : "", bloque: nomB(bloque),
        a_dentro: x.dentro.map((f) => aP(f, "from")).join(lang() === "es" ? " o " : " or ") }, flags, page: "voto" }).html.replace(/^<p[^>]*>|<\/p>$/g, "")}</li>`;
    }).join("");
    resp.innerHTML = frase + (lineas ? `<ul class="vt-lineas">${lineas}</ul>` : "");
  };
  const todas = () => {
    const filas = provs.map((p) => {
      const o = opcionesPeso(PW, p.prov, {}, bloque), a = o[0], b = o[1];
      return `<tr${p.prov === prov ? ' class="vt-sel"' : ""}><td><a href="#voto/${p.prov}/${bloque}">${p.n}</a></td>
        <td>${a && a.g >= NUNCA ? `<i class="dot" style="background:${colorVoto(a.f)}"></i>${short(a.f, p.prov)}` : "·"}</td><td class="num">${a && a.g >= NUNCA ? N(a.g) : "·"}</td>
        <td>${b && b.g >= NUNCA ? short(b.f, p.prov) : "·"}</td><td class="num">${b && b.g >= NUNCA ? N(b.g) : "·"}</td></tr>`;
    }).join("");
    lista.innerHTML = `<div class="scrollx"><table class="vt-todas"><tr><th>${t("Provincia")}</th><th>${t("Mejor opción")}</th><th class="num">${t("Un voto decide, 1 entre")}</th>
      <th>${t("Segunda")}</th><th class="num">${t("1 entre")}</th></tr>${filas}</table></div>`;
  };
  const pinta = () => {
    sel.value = prov;
    seg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.b === bloque); b.setAttribute("aria-pressed", b.dataset.b === bloque); });
    respuesta(); todas();
    guardar({ prov, bloque });
    const h = `#voto/${prov}/${bloque}`;
    if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h);
  };
  sel.onchange = () => { prov = sel.value; pinta(); };
  seg.onclick = (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.b !== bloque) { bloque = b.dataset.b; pinta(); } };
  pinta();
}
