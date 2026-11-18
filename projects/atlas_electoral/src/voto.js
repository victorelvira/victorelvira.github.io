// "Tu voto" (Víctor, 2026-11-17: "lo de dónde votar mejor, como pestaña propia"): pick your province and the bloc you want to
// win seats; the page says with which party of that bloc a vote weighs most there and, for every other party, how many times
// more chances a vote for the best one has of adding a seat to the bloc (Víctor, 2026-11-18: "X veces más chances que tu voto
// contribuya a un diputado de PSOE que de Podemos", instead of "1 entre N"), whether the answer depends on how the night goes
// (thirds of the draws: removed and brought back the same day as three buttons, "como se espera" by default, each compared
// with the others in one line) and the best option in every province. Data: peso_voto.json (pipeline/
// peso_voto.py, «Nuestra predicción»; "e" = the same by thirds of the draws) and escanos_350.json; blocs: the starting groups of
// "Forma tu mayoría" (masvotado.js grupoDe, so Geroa Bai goes with the PNV in Navarra).
// The address keeps the choice: #voto/<province code>/<izquierda|derecha>/<bien|mal> (no third segment: as expected).
import { load } from "./data.js?v=0.2.163";
import { textos, md } from "./textos.js?v=0.2.163";
import { t, lang, ordinal } from "./i18n.js?v=0.2.163";
import { opcionesPeso, short, colorVoto, PESO_ART, PESO_NUNCA, frente } from "./masvotado.js?v=0.2.163";

const KEY = "atlas_electoral.voto";   // the reader's last province, bloc and night (a convenience: the page works without it)
const leer = () => { try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); } catch { return {}; } };
const guardar = (x) => { try { localStorage.setItem(KEY, JSON.stringify(x)); } catch { /* private window */ } };
const BLOQUES = ["izquierda", "derecha"], NOCHES = ["bien", "normal", "mal"];
// "la noche va bien / como se espera / mal" for the chosen bloc, as a third of the draws by the national lead of the left
const TERCIO = { izquierda: { bien: 2, normal: 1, mal: 0 }, derecha: { bien: 0, normal: 1, mal: 2 } };
const NUNCA = PESO_NUNCA;   // the "casi nunca" floor, shared with the map
// "pesa poco vote lo que vote" (Víctor, 2026-11-18): even the best option gives the bloc a seat in under 5 of 1,000 draws with
// 1,000 more votes (about the lowest fifth of provinces for each bloc); the page then says so first, then the best one anyway
const POCO = 0.005;
const ART = { pp: "el PP", psoe: "el PSOE", pnv: "el PNV", bng: "el BNG" };

export async function renderVoto(app, args = []) {
  const [T, PW, D] = await Promise.all([textos("voto"), load("peso_voto.json"), load("provincias_29n.json")]);
  const provs = [...D.provincias].sort((a, b) => a.n.localeCompare(b.n, "es"));
  const byCode = Object.fromEntries(provs.map((p) => [p.prov, p]));
  const prev = leer();
  let prov = byCode[args[0]] ? args[0] : byCode[prev.prov] ? prev.prov : "28";
  let bloque = BLOQUES.includes(args[1]) ? args[1] : BLOQUES.includes(prev.bloque) ? prev.bloque : "derecha";
  let noche = NOCHES.includes(args[2]) ? args[2] : "normal";   // the night for the chosen bloc; "como se espera" by default
  const nomB = (b) => t(PESO_ART[b]);
  const conArt = (f, pv = prov) => (lang() === "es" && ART[f]) || short(f, pv);
  const controles = `<div class="vt-ctl"><label class="vt-l">${t("Dónde votas")} <select id="vt-prov">${provs.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></label>
    <div class="seg" id="vt-bloque" role="group" aria-label="${t("Para qué bloque")}"><button type="button" data-b="izquierda">${t("si quieres más escaños para la izquierda")}</button><button type="button" data-b="derecha">${t("si quieres más escaños para la derecha")}</button></div>
    <div class="vt-noche"><span class="vt-l">${t("Cómo crees que irá la noche")}</span><div class="seg" id="vt-noche" role="group" aria-label="${t("Cómo crees que irá la noche")}"></div></div></div>`;
  const ES = PW.escenarios ?? {}, num = (x) => String(x).replace(".", lang() === "en" ? "." : ",");
  const { html } = md(T.principal, { vars: { mediana: num(ES.mediana_derecha ?? ""), corte_bajo: num(ES.cortes_derecha?.[0] ?? ""), corte_alto: num(ES.cortes_derecha?.[1] ?? "") }, slots: { controles, respuesta: '<div id="vt-resp" class="card vt-resp"></div>', lista: '<div id="vt-lista"></div>' }, page: "voto" });
  app.innerHTML = html;
  const sel = app.querySelector("#vt-prov"), seg = app.querySelector("#vt-bloque"), segN = app.querySelector("#vt-noche"), resp = app.querySelector("#vt-resp"), lista = app.querySelector("#vt-lista");
  const etiquetaNoche = (n) => ({ bien: t("bien para {b}", { b: nomB(bloque) }), normal: t("como se espera"), mal: t("mal para {b}", { b: nomB(bloque) }) }[n]);
  const tercio = (n = noche) => TERCIO[bloque][n];
  const mejorEn = (n) => { const x = opcionesPeso(PW, prov, {}, bloque, tercio(n))[0]; return x && x.g >= NUNCA ? x.f : null; };
  const respuesta = () => {
    const o = opcionesPeso(PW, prov, {}, bloque, tercio()), p = byCode[prov], a = o[0];
    const hay = a && a.g >= NUNCA;
    // the next seat of each of the two best options in the chosen night: the first k it wins in under half of those draws
    // (peso_voto.json "k"; Víctor, 2026-11-18: "usa el siguiente escaño del escenario elegido")
    const sig = ({ f, k }) => (k ? (lang() === "es" ? `el ${ordinal(k)} ${ART[f] ? `del ${ART[f].slice(3)}` : `de ${short(f, prov)}`}` : `${short(f, prov)}'s ${ordinal(k)}`) : short(f, prov));
    const poco = hay && a.g < POCO, dos = o.slice(0, 2).filter((x) => x.g >= NUNCA);
    const frase = md(T.respuesta, { vars: { provincia: p.n, bloque: nomB(bloque), mejor: a ? conArt(a.f) : "", noche: { bien: t("bien"), normal: t("como se espera"), mal: t("mal") }[noche],
      escanos: dos.map(sig).join(lang() === "es" ? " o " : " or ") }, flags: { vacia: !hay, solo: o.length < 2, poco, mucho: !poco }, page: "voto" }).html;
    // every other party of the bloc, one short line each: how many times more chances a vote for the best one has
    // (seats taken from partners of the same bloc are already left out of the ratio, so no note for them)
    const lineas = hay ? o.slice(1).map((x) => {
      const nota = x.g < NUNCA && x.v < 3 ? t("por debajo del 3%") : "";
      return `<li><b>${short(x.f, prov)}</b>: ${frente(a, x)}${nota ? ` <span class="muted">(${nota})</span>` : ""}</li>`;
    }).join("") : "";
    // the chosen night against the others (Víctor, 2026-11-18): from the middle, the better and the worse night; from either
    // end, the night as expected. "también el PNV" when it is the same party.
    let compara = "";
    if (hay) {
      const m = Object.fromEntries(NOCHES.map((n) => [n, mejorEn(n)]));
      const nom = (f) => (!f ? t("ninguno") : f === a.f ? t("también {m}", { m: conArt(f) }) : conArt(f));
      compara = md(T.compara, { vars: { bloque: nomB(bloque), mejor_bien: nom(m.bien), mejor_normal: nom(m.normal), mejor_mal: nom(m.mal) },
        flags: { medio: noche === "normal", igual: noche === "normal" && m.bien === a.f && m.mal === a.f, extremo: noche !== "normal", cambia: noche !== "normal" && m.normal !== a.f }, page: "voto" }).html;
    }
    resp.innerHTML = frase + (lineas ? `<ul class="vt-lineas">${lineas}</ul>` : "") + compara;
  };
  const todas = () => {
    const filas = provs.map((p) => {
      const o = opcionesPeso(PW, p.prov, {}, bloque, tercio()), a = o[0], b = o[1];
      const okA = a && a.g >= NUNCA;
      return `<tr${p.prov === prov ? ' class="vt-sel"' : ""}><td><a href="#voto/${p.prov}/${bloque}/${noche}">${p.n}</a></td>
        <td>${okA ? `<i class="dot" style="background:${colorVoto(a.f)}"></i>${short(a.f, p.prov)}` : "·"}</td>
        <td>${okA && b ? short(b.f, p.prov) : "·"}</td>
        <td class="num">${okA && b ? frente(a, b) : "·"}</td></tr>`;
    }).join("");
    lista.innerHTML = `<div class="scrollx"><table class="vt-todas"><tr><th>${t("Provincia")}</th><th>${t("Mejor opción")}</th><th>${t("Segunda")}</th><th class="num">${t("Veces más que la segunda")}</th></tr>${filas}</table></div>`;
  };
  const pinta = () => {
    sel.value = prov;
    seg.querySelectorAll("button").forEach((b) => { b.classList.toggle("on", b.dataset.b === bloque); b.setAttribute("aria-pressed", b.dataset.b === bloque); });
    segN.innerHTML = NOCHES.map((n) => `<button type="button" data-n="${n}" class="${n === noche ? "on" : ""}" aria-pressed="${n === noche}">${etiquetaNoche(n)}</button>`).join("");
    respuesta(); todas();
    guardar({ prov, bloque });
    const h = `#voto/${prov}/${bloque}${noche === "normal" ? "" : `/${noche}`}`;
    if (location.hash !== h) history.replaceState(null, "", location.pathname + location.search + h);
  };
  sel.onchange = () => { prov = sel.value; pinta(); };
  seg.onclick = (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.b !== bloque) { bloque = b.dataset.b; pinta(); } };
  segN.onclick = (ev) => { const b = ev.target.closest("button"); if (b && b.dataset.n !== noche) { noche = b.dataset.n; pinta(); } };
  pinta();
}
