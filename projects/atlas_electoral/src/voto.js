// "Tu voto" (Víctor, 2026-11-17: "lo de dónde votar mejor, como pestaña propia"): pick your province and the bloc you want to
// win seats; the page says with which party of that bloc a vote weighs most there, with the table of every option, and lists
// the best option of each bloc in every province. Data: peso_voto.json (pipeline/peso_voto.py, «Nuestra predicción»); blocs:
// the starting groups of "Forma tu mayoría" (masvotado.js grupoDe, so Geroa Bai goes with the PNV in Navarra).
// The address keeps the choice: #voto/<province code>/<izquierda|derecha>.
import { load } from "./data.js?v=0.2.143";
import { textos, md } from "./textos.js?v=0.2.143";
import { t } from "./i18n.js?v=0.2.143";
import { opcionesPeso, deCadaMil, short, colorVoto, PESO_ART, parejas } from "./masvotado.js?v=0.2.143";

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
  const mil = (x) => Math.round(x * 1000);
  const controles = `<div class="vt-ctl"><label class="vt-l">${t("Dónde votas")} <select id="vt-prov">${provs.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></label>
    <div class="seg" id="vt-bloque" role="group" aria-label="${t("Para qué bloque")}"><button type="button" data-b="izquierda">${t("si quieres más escaños para la izquierda")}</button><button type="button" data-b="derecha">${t("si quieres más escaños para la derecha")}</button></div></div>`;
  const { html } = md(T.principal, { slots: { controles, respuesta: '<div id="vt-resp" class="card vt-resp"></div>', lista: '<div id="vt-lista"></div>' }, page: "voto" });
  app.innerHTML = html;
  const sel = app.querySelector("#vt-prov"), seg = app.querySelector("#vt-bloque"), resp = app.querySelector("#vt-resp"), lista = app.querySelector("#vt-lista");
  const respuesta = () => {
    const o = opcionesPeso(PW, prov, {}, bloque), p = byCode[prov];
    const frase = md(T.respuesta, { vars: { provincia: p.n, bloque: nomB(bloque), mejor: o[0] ? short(o[0].f, prov) : "", frecuencia: o[0] ? deCadaMil(o[0].g) : "",
      segundo: o[1] ? short(o[1].f, prov) : "", frecuencia_2: o[1] ? deCadaMil(o[1].g) : "" },
      flags: { vacia: !o.length || !(o[0].g > 0), segundo: o.length > 1, parejas: parejas(o) }, page: "voto" }).html;
    const filas = o.map((x) => `<tr><td><i class="dot" style="background:${colorVoto(x.f)}"></i>${short(x.f, prov)}</td><td class="num"><b>${mil(x.g)}</b></td><td class="num">${mil(x.p)}</td>
      <td>${x.quita.map((f) => (f === "otros" ? t("otras candidaturas") : short(f, prov))).join(", ") || "·"}</td></tr>`).join("");
    resp.innerHTML = frase + (o.length ? `<div class="scrollx"><table class="nosort vt-tab"><tr><th>${t("Partido")}</th><th class="num">${t("Escaño para {b}", { b: nomB(bloque) })}</th>
      <th class="num">${t("Escaño para el partido")}</th><th>${t("Se lo quitaría a")}</th></tr>${filas}</table></div><p class="note">${t("De cada 1.000 simulaciones, con 1.000 votos más a ese partido.")}</p>` : "");
  };
  const todas = () => {
    const filas = provs.map((p) => {
      const o = opcionesPeso(PW, p.prov, {}, bloque), a = o[0], b = o[1];
      return `<tr${p.prov === prov ? ' class="vt-sel"' : ""}><td><a href="#voto/${p.prov}/${bloque}">${p.n}</a></td>
        <td>${a && a.g > 0 ? `<i class="dot" style="background:${colorVoto(a.f)}"></i>${short(a.f, p.prov)}` : "·"}</td><td class="num">${a && a.g > 0 ? mil(a.g) : "·"}</td>
        <td>${b && b.g > 0 ? short(b.f, p.prov) : "·"}</td><td class="num">${b && b.g > 0 ? mil(b.g) : "·"}</td></tr>`;
    }).join("");
    lista.innerHTML = `<div class="scrollx"><table class="vt-todas"><tr><th>${t("Provincia")}</th><th>${t("Mejor opción")}</th><th class="num">${t("De cada 1.000")}</th>
      <th>${t("Segunda")}</th><th class="num">${t("De cada 1.000")}</th></tr>${filas}</table></div>`;
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
