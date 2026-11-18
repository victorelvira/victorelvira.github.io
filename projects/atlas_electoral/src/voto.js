// "Tu voto" (Víctor, 2026-11-17: "lo de dónde votar mejor, como pestaña propia"): pick your province and the bloc you want to
// win seats; the page says with which party of that bloc a vote weighs most there and, for every other party, how many times
// more chances a vote for the best one has of adding a seat to the bloc (Víctor, 2026-11-18: "X veces más chances que tu voto
// contribuya a un diputado de PSOE que de Podemos", instead of "1 entre N"), whether the answer depends on how the night goes
// (thirds of the draws; the selector of the night was removed the same day) and the best option in every province. Data: peso_voto.json (pipeline/
// peso_voto.py, «Nuestra predicción»; "e" = the same by thirds of the draws) and escanos_350.json; blocs: the starting groups of
// "Forma tu mayoría" (masvotado.js grupoDe, so Geroa Bai goes with the PNV in Navarra).
// The address keeps the choice: #voto/<province code>/<izquierda|derecha> (an old third segment, the night, is ignored).
import { load } from "./data.js?v=0.2.159";
import { textos, md } from "./textos.js?v=0.2.159";
import { t, lang } from "./i18n.js?v=0.2.159";
import { opcionesPeso, short, colorVoto, PESO_ART, PESO_NUNCA } from "./masvotado.js?v=0.2.159";

const KEY = "atlas_electoral.voto";   // the reader's last province, bloc and night (a convenience: the page works without it)
const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const guardar = (x) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* private window */ } };
const BLOQUES = ["izquierda", "derecha"];
// "la noche va bien / como se espera / mal" for the chosen bloc, as a third of the draws by the national lead of the left
const TERCIO = { izquierda: { bien: 2, normal: 1, mal: 0 }, derecha: { bien: 0, normal: 1, mal: 2 } };
const NUNCA = PESO_NUNCA;   // the "casi nunca" floor, shared with the map
const PAREJAS = 1.25;       // under 1.25 times, "casi las mismas posibilidades"
const ART = { pp: "el PP", psoe: "el PSOE", pnv: "el PNV", bng: "el BNG" };

export async function renderVoto(app, args = []) {
  const [T, PW, D] = await Promise.all([textos("voto"), load("peso_voto.json"), load("provincias_29n.json")]);
  const provs = [...D.provincias].sort((a, b) => a.n.localeCompare(b.n, "es"));
  const byCode = Object.fromEntries(provs.map((p) => [p.prov, p]));
  const prev = leer();
  let prov = byCode[args[0]] ? args[0] : byCode[prev.prov] ? prev.prov : "28";
  let bloque = BLOQUES.includes(args[1]) ? args[1] : BLOQUES.includes(prev.bloque) ? prev.bloque : "derecha";
  const nomB = (b) => t(PESO_ART[b]);
  const conArt = (f, pv = prov) => (lang() === "es" && ART[f]) || short(f, pv);
  // "al PP", "a Vox" (Spanish contracts a + el); English: "for PP" (a vote for) or "from PP" (taken from)
  const aP = (f, en, pv = prov) => (lang() === "es" ? (ART[f] ? `al ${ART[f].slice(3)}` : `a ${short(f, pv)}`) : `${en} ${short(f, pv)}`);
  // how many times more chances: "1,4", "3", "más de 100"
  const veces = (a, b) => { const r = a / b; return r >= 100 ? t("más de 100") : r < 3 ? String(Math.round(r * 10) / 10).replace(".", lang() === "en" ? "." : ",") : String(Math.round(r)); };
  const controles = `<div class="vt-ctl"><label class="vt-l">${t("Dónde votas")} <select id="vt-prov">${provs.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></label>
    <div class="seg" id="vt-bloque" role="group" aria-label="${t("Para qué bloque")}"><button type="button" data-b="izquierda">${t("si quieres más escaños para la izquierda")}</button><button type="button" data-b="derecha">${t("si quieres más escaños para la derecha")}</button></div></div>`;
  const ES = PW.escenarios ?? {}, num = (x) => String(x).replace(".", lang() === "en" ? "." : ",");
  const { html } = md(T.principal, { vars: { mediana: num(ES.mediana_derecha ?? ""), corte_bajo: num(ES.cortes_derecha?.[0] ?? ""), corte_alto: num(ES.cortes_derecha?.[1] ?? "") }, slots: { controles, respuesta: '<div id="vt-resp" class="card vt-resp"></div>', lista: '<div id="vt-lista"></div>' }, page: "voto" });
  app.innerHTML = html;
  const sel = app.querySelector("#vt-prov"), seg = app.querySelector("#vt-bloque"), resp = app.querySelector("#vt-resp"), lista = app.querySelector("#vt-lista");
  const linea = (h) => h.replace(/^<p[^>]*>|<\/p>$/g, "");
  const respuesta = () => {
    const o = opcionesPeso(PW, prov, {}, bloque), p = byCode[prov], a = o[0];
    const hay = a && a.g >= NUNCA;
    const frase = md(T.respuesta, { vars: { provincia: p.n, bloque: nomB(bloque), mejor: a ? conArt(a.f) : "" }, flags: { vacia: !hay }, page: "voto" }).html;
    // every other party of the bloc, one line each: how many times more chances a vote for the best one has (the bad news included)
    const lineas = hay ? o.slice(1).map((x) => {
      const roba = x.g >= NUNCA && x.p >= 0.002 && x.p - x.g >= x.g && x.dentro.length;
      const flags = x.g < NUNCA ? (x.v < 3 ? { umbral: true } : { lejos: true }) : a.g / x.g < PAREJAS ? { parejas: true } : { normal: true };
      const vars = { partido: short(x.f, prov), mejor: conArt(a.f), veces: x.g >= NUNCA ? veces(a.g, x.g) : "", bloque: nomB(bloque), a_mejor: aP(a.f, "for"), a_partido: aP(x.f, "for"),
        a_dentro: x.dentro.map((f) => aP(f, "from")).join(lang() === "es" ? " o " : " or ") };
      return `<li>${linea(md(T.partido, { vars, flags, page: "voto" }).html)}${roba ? ` ${linea(md(T.roba, { vars, page: "voto" }).html)}` : ""}</li>`;
    }).join("") : "";
    // does the best option change with how the night goes? (thirds of the draws by the national lead of the left)
    let depende = "";
    const tercio = (n) => TERCIO[bloque][n];
    const mejor = ["bien", "normal", "mal"].map((n) => { const x = opcionesPeso(PW, prov, {}, bloque, tercio(n))[0]; return x && x.g >= NUNCA ? x.f : null; });
    if (hay && mejor.some(Boolean)) {
      const nom = (f) => (f ? conArt(f) : t("ninguno"));
      depende = md(T.depende, { vars: { bloque: nomB(bloque), mejor_bien: nom(mejor[0]), mejor_normal: nom(mejor[1]), mejor_mal: nom(mejor[2]) },
        flags: { igual: mejor[0] === mejor[1] && mejor[1] === mejor[2], bn: mejor[0] === mejor[1] && mejor[1] !== mejor[2], nm: mejor[1] === mejor[2] && mejor[0] !== mejor[1], no_bn_nm: mejor[0] !== mejor[1] && mejor[1] !== mejor[2] }, page: "voto" }).html;
    }
    const pequeno = hay ? md(T.pequeno, { page: "voto" }).html : "";
    resp.innerHTML = frase + (lineas ? `<ul class="vt-lineas">${lineas}</ul>` : "") + depende + pequeno;
  };
  const todas = () => {
    const filas = provs.map((p) => {
      const o = opcionesPeso(PW, p.prov, {}, bloque), a = o[0], b = o[1];
      const okA = a && a.g >= NUNCA, okB = okA && b && b.g >= NUNCA;
      return `<tr${p.prov === prov ? ' class="vt-sel"' : ""}><td><a href="#voto/${p.prov}/${bloque}">${p.n}</a></td>
        <td>${okA ? `<i class="dot" style="background:${colorVoto(a.f)}"></i>${short(a.f, p.prov)}` : "·"}</td>
        <td>${okB ? short(b.f, p.prov) : okA && b ? `${short(b.f, p.prov)} <span class="muted">(${t("casi nunca")})</span>` : "·"}</td>
        <td class="num">${okB ? t("{x} veces", { x: veces(a.g, b.g) }) : okA && b ? t("muchas más") : "·"}</td></tr>`;
    }).join("");
    lista.innerHTML = `<div class="scrollx"><table class="vt-todas"><tr><th>${t("Provincia")}</th><th>${t("Mejor opción")}</th><th>${t("Segunda")}</th><th class="num">${t("Posibilidades de la mejor frente a la segunda")}</th></tr>${filas}</table></div>`;
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
