// "Tu voto" (Víctor, 2026-11-17: "lo de dónde votar mejor, como pestaña propia"): pick your province, the bloc you want to
// win seats and, if you like, how you think the night will go for it; the page says with which party of that bloc a vote
// weighs most there, one line per other party (the bad news included), whether the answer depends on how the night goes, the
// bloc's seats at risk there (on a bad night) and the best option in every province. Data: peso_voto.json (pipeline/
// peso_voto.py, «Nuestra predicción»; "e" = the same by thirds of the draws) and escanos_350.json; blocs: the starting groups of
// "Forma tu mayoría" (masvotado.js grupoDe, so Geroa Bai goes with the PNV in Navarra).
// The address keeps the choice: #voto/<province code>/<izquierda|derecha>/<todas|bien|normal|mal>.
import { load } from "./data.js?v=0.2.153";
import { textos, md } from "./textos.js?v=0.2.153";
import { t, lang, ordinal, deCada } from "./i18n.js?v=0.2.153";
import { opcionesPeso, short, colorVoto, PESO_ART, entreN, PESO_NUNCA, grupoDe } from "./masvotado.js?v=0.2.153";

const KEY = "atlas_electoral.voto";   // the reader's last province, bloc and night (a convenience: the page works without it)
const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const guardar = (x) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* private window */ } };
const BLOQUES = ["izquierda", "derecha"], NOCHES = ["todas", "bien", "normal", "mal"];
// "la noche va bien / como se espera / mal" for the chosen bloc, as a third of the draws by the national lead of the left
const TERCIO = { izquierda: { bien: 2, normal: 1, mal: 0 }, derecha: { bien: 0, normal: 1, mal: 2 } };
const NUNCA = PESO_NUNCA, N = entreN;   // "1 entre N" (N = 1,000 / g) and the "casi nunca" floor, shared with the map
const ART = { pp: "el PP", psoe: "el PSOE", pnv: "el PNV", bng: "el BNG" };

export async function renderVoto(app, args = []) {
  const [T, PW, D, E3] = await Promise.all([textos("voto"), load("peso_voto.json"), load("provincias_29n.json"), load("escanos_350.json").catch(() => null)]);
  const provs = [...D.provincias].sort((a, b) => a.n.localeCompare(b.n, "es"));
  const byCode = Object.fromEntries(provs.map((p) => [p.prov, p]));
  const prev = leer();
  let prov = byCode[args[0]] ? args[0] : byCode[prev.prov] ? prev.prov : "28";
  let bloque = BLOQUES.includes(args[1]) ? args[1] : BLOQUES.includes(prev.bloque) ? prev.bloque : "derecha";
  let noche = NOCHES.includes(args[2]) ? args[2] : "todas";
  const nomB = (b) => t(PESO_ART[b]);
  const conArt = (f, pv = prov) => (lang() === "es" && ART[f]) || short(f, pv);
  // "al PP", "a Vox" (Spanish contracts a + el); English: "for PP" (a vote for) or "from PP" (taken from)
  const aP = (f, en) => (lang() === "es" ? (ART[f] ? `al ${ART[f].slice(3)}` : `a ${short(f, prov)}`) : `${en} ${short(f, prov)}`);
  const veces = (a, b) => { const r = a / b; return r < 3 ? String(Math.round(r * 10) / 10).replace(".", lang() === "en" ? "." : ",") : String(Math.round(r)); };
  const tercio = (n = noche, b = bloque) => (n === "todas" ? null : TERCIO[b][n]);
  const controles = `<div class="vt-ctl"><label class="vt-l">${t("Dónde votas")} <select id="vt-prov">${provs.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></label>
    <div class="seg" id="vt-bloque" role="group" aria-label="${t("Para qué bloque")}"><button type="button" data-b="izquierda">${t("si quieres más escaños para la izquierda")}</button><button type="button" data-b="derecha">${t("si quieres más escaños para la derecha")}</button></div>
    <div class="vt-noche"><span class="vt-l">${t("Cómo crees que irá la noche")}</span><div class="seg" id="vt-noche" role="group" aria-label="${t("Cómo crees que irá la noche")}"></div></div></div>`;
  const ES = PW.escenarios ?? {}, num = (x) => String(x).replace(".", lang() === "en" ? "." : ",");
  const { html } = md(T.principal, { vars: { mediana: num(ES.mediana_derecha ?? ""), corte_bajo: num(ES.cortes_derecha?.[0] ?? ""), corte_alto: num(ES.cortes_derecha?.[1] ?? "") }, slots: { controles, respuesta: '<div id="vt-resp" class="card vt-resp"></div>', lista: '<div id="vt-lista"></div>' }, page: "voto" });
  app.innerHTML = html;
  const sel = app.querySelector("#vt-prov"), seg = app.querySelector("#vt-bloque"), segN = app.querySelector("#vt-noche"), resp = app.querySelector("#vt-resp"), lista = app.querySelector("#vt-lista");
  const etiquetaNoche = (n) => ({ todas: t("sin suponer nada"), bien: t("bien para {b}", { b: nomB(bloque) }), normal: t("como se espera"), mal: t("mal para {b}", { b: nomB(bloque) }) }[n]);
  const linea = (h) => h.replace(/^<p[^>]*>|<\/p>$/g, "");
  const respuesta = () => {
    const o = opcionesPeso(PW, prov, {}, bloque, tercio()), p = byCode[prov], a = o[0], b = o[1];
    const hay = a && a.g >= NUNCA, seg2 = hay && b && b.g >= NUNCA;
    const contexto = noche === "todas" ? "" : md(T.contexto, { vars: { bloque: nomB(bloque) }, flags: { ataque: noche === "bien", normal: noche === "normal", defensa: noche === "mal" }, page: "voto" }).html;
    const frase = md(T.respuesta, { vars: { provincia: p.n, bloque: nomB(bloque), mejor: a ? conArt(a.f) : "", n: hay ? N(a.g) : "",
      segundo: b ? conArt(b.f) : "", veces: seg2 ? veces(a.g, b.g) : "", a_mejor: a ? aP(a.f, "for") : "", a_segundo: b ? aP(b.f, "for") : "" },
      flags: { vacia: !hay, segundo: seg2, parejas: seg2 && b.g >= 0.8 * a.g }, page: "voto" }).html;
    // every other party of the bloc, one line each, the bad news included
    const lineas = o.slice(hay ? 1 : 0).map((x) => {
      const roba = x.p >= 0.002 && x.p - x.g >= x.g && x.dentro.length;
      const flags = x.g < NUNCA ? (x.v < 3 ? { umbral: true } : { lejos: true }) : roba ? { roba: true } : { normal: true };
      return `<li>${linea(md(T.partido, { vars: { partido: short(x.f, prov), n: x.g >= NUNCA ? N(x.g) : "", bloque: nomB(bloque),
        a_dentro: x.dentro.map((f) => aP(f, "from")).join(lang() === "es" ? " o " : " or ") }, flags, page: "voto" }).html)}</li>`;
    }).join("");
    // over all the draws: does the best option change with how the night goes?
    let depende = "";
    if (noche === "todas") {
      const mejor = ["bien", "normal", "mal"].map((n) => { const x = opcionesPeso(PW, prov, {}, bloque, tercio(n))[0]; return x && x.g >= NUNCA ? x.f : null; });
      if (mejor.some(Boolean)) {
        const nom = (f) => (f ? conArt(f) : t("ninguno"));
        depende = md(T.depende, { vars: { bloque: nomB(bloque), mejor_bien: nom(mejor[0]), mejor_normal: nom(mejor[1]), mejor_mal: nom(mejor[2]) },
          flags: { igual: mejor[0] === mejor[1] && mejor[1] === mejor[2], bn: mejor[0] === mejor[1] && mejor[1] !== mejor[2], nm: mejor[1] === mejor[2] && mejor[0] !== mejor[1], no_bn_nm: mejor[0] !== mejor[1] && mejor[1] !== mejor[2] }, page: "voto" }).html;
      }
    }
    // on a bad night: the bloc's seats here that are at risk (won in 50 to 95 of 100 draws, escanos_350.json)
    let riesgo = "";
    if (noche === "mal" && E3) {
      const grupo = grupoDe({});
      const s = E3.escanos.filter((x) => x.prov === prov && grupo(x.f.split("|")[0], prov) === bloque && x.p >= 0.5 && x.p < 0.95).sort((u, w) => u.p - w.p);
      const nombre = (x) => { const f = x.f.split("|")[0]; return lang() === "es" ? `el ${ordinal(x.k)} ${ART[f] ? `del ${ART[f].slice(3)}` : `de ${short(f, prov)}`}` : `${short(f, prov)}'s ${ordinal(x.k)}`; };
      riesgo = md(T.riesgo, { vars: { bloque: nomB(bloque), lista: s.map((x) => t("{e} (lo gana en {f} simulaciones)", { e: nombre(x), f: deCada(Math.round(x.p * 100), 100) })).join("; ") },
        flags: { hay: s.length > 0 }, page: "voto" }).html;
    }
    resp.innerHTML = contexto + frase + (lineas ? `<ul class="vt-lineas">${lineas}</ul>` : "") + depende + riesgo;
  };
  const todas = () => {
    const filas = provs.map((p) => {
      const o = opcionesPeso(PW, p.prov, {}, bloque, tercio()), a = o[0], b = o[1];
      return `<tr${p.prov === prov ? ' class="vt-sel"' : ""}><td><a href="#voto/${p.prov}/${bloque}/${noche}">${p.n}</a></td>
        <td>${a && a.g >= NUNCA ? `<i class="dot" style="background:${colorVoto(a.f)}"></i>${short(a.f, p.prov)}` : "·"}</td><td class="num">${a && a.g >= NUNCA ? N(a.g) : "·"}</td>
        <td>${b && b.g >= NUNCA ? short(b.f, p.prov) : "·"}</td><td class="num">${b && b.g >= NUNCA ? N(b.g) : "·"}</td></tr>`;
    }).join("");
    lista.innerHTML = `<div class="scrollx"><table class="vt-todas"><tr><th>${t("Provincia")}</th><th>${t("Mejor opción")}</th><th class="num">${t("Un voto decide, 1 entre")}</th>
      <th>${t("Segunda")}</th><th class="num">${t("1 entre")}</th></tr>${filas}</table></div>`;
  };
  const pinta = () => {
    sel.value = prov;
    seg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.b === bloque); b.setAttribute("aria-pressed", b.dataset.b === bloque); });
    segN.innerHTML = NOCHES.map((n) => `<button type="button" data-n="${n}" class="${n === noche ? "on" : ""}" aria-pressed="${n === noche}">${etiquetaNoche(n)}</button>`).join("");
    respuesta(); todas();
    guardar({ prov, bloque });
    const h = `#voto/${prov}/${bloque}${noche === "todas" ? "" : `/${noche}`}`;
    if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h);
  };
  sel.onchange = () => { prov = sel.value; pinta(); };
  seg.onclick = (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.b !== bloque) { bloque = b.dataset.b; pinta(); } };
  segN.onclick = (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.n !== noche) { noche = b.dataset.n; pinta(); } };
  pinta();
}
