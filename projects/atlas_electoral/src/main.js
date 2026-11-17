import { init } from "./data.js?v=0.2.143";
import { renderMapa } from "./mapa.js?v=0.2.143";
import { renderPueblo } from "./pueblo.js?v=0.2.143";
import { renderMiniatura } from "./miniatura.js?v=0.2.143";
import { renderSimulador } from "./simulador.js?v=0.2.143";
import { renderEncuestas } from "./encuestas.js?v=0.2.143";
import { renderHistorico } from "./historico.js?v=0.2.143";
import { renderModelo } from "./modelo.js?v=0.2.143";
import { renderInicio } from "./inicio.js?v=0.2.143";
import { renderHistoria } from "./historia.js?v=0.2.143";
import { renderComunidad } from "./comunidad.js?v=0.2.143";
import { renderExplora } from "./explora.js?v=0.2.143";
import { renderDhondt } from "./dhondt.js?v=0.2.143";
import { renderProvincia } from "./provincia.js?v=0.2.143";
import { renderSenado } from "./senado.js?v=0.2.143";
import { renderVoto } from "./voto.js?v=0.2.143";
import { hideTip, showTip, DATA_V, BUILD_AT } from "./data.js?v=0.2.143";
import { LANG, setView, chrome, t } from "./i18n.js?v=0.2.143";
import { textos, md, VEDA } from "./textos.js?v=0.2.143";

// d3's number and date formats follow the language of each view (i18n.js, setView, called by the router)

const routes = {
  inicio: renderInicio,
  encuestas: renderEncuestas,
  modelo: renderModelo,
  historico: renderHistorico,
  generales: renderHistoria,
  historia: renderHistoria, // old links
  simulador: renderSimulador,
  dhondt: renderDhondt,
  provincia: renderProvincia,
  senado: renderSenado,
  voto: renderVoto,
  mapa: renderMapa,
  explora: renderExplora,
  comunidad: renderComunidad,
  pueblo: renderPueblo,
  miniatura: renderMiniatura,
};
// views without a tab of their own (reached from the maps and the footer) light up Generales
const TAB = { historia: "generales", mapa: "generales", explora: "generales", pueblo: "generales", comunidad: "generales", miniatura: "generales" };

// old links into the Encuestas page whose content now has a tab of its own: past cycles ("#encuestas/2019-11-10")
// and the past-polls sections go to Encuestas históricas, the forecast to Modelo
const PAST = ["pasado", "ciclos", "eleccion", "salto", "aciertos"];
function moved(name, args) {
  if (name !== "encuestas" || !args[0]) return name;
  if (/^\d{4}-\d{2}-\d{2}$/.test(args[0]) || PAST.includes(args[0])) return "historico";
  if (args[0] === "prediccion") return "modelo";
  return name;
}

async function route() {
  hideTip();
  scrollTo(0, 0);
  let [name, ...args] = location.hash.replace(/^#/, "").split("/");
  if (moved(name, args) !== name) { name = moved(name, args); history.replaceState(null, "", `#${[name, ...args].join("/")}`); }
  const view = routes[name] ? name : "inicio";
  setView(view);   // English only on the views that exist in English (i18n.js, EN_VIEWS)
  document.querySelectorAll("nav.sections a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${TAB[view] ?? view}`));
  // the chamber toggle in the header: Senado on its own page, Congreso everywhere else
  document.querySelectorAll("nav.camara a").forEach((a) => {
    const on = a.dataset.c === (view === "senado" ? "senado" : "congreso");
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
  });
  const app = document.getElementById("app");
  const cam = document.querySelector("nav.camara");
  const top = document.querySelector("header.top"), row = top.querySelector(":scope > .nav-wrap, :scope > nav.sections");
  top.insertBefore(cam, row);   // back home before the view is wiped
  cam.hidden = true;
  app.innerHTML = `<p class="loading">${t("Cargando…")}</p>`;
  try {
    await routes[view](app, args.map(decodeURIComponent));
    // the Congreso | Senado toggle sits beside the forecast's heading (Víctor, 2026-11-15), only on those two pages
    const hc = view === "inicio" ? app.querySelector("#s-diputados > h2") : view === "senado" ? app.querySelector("h2.sn-h") : null;
    if (hc) { hc.classList.add("h-camara"); hc.append(cam); cam.hidden = false; }
    // an English reader on a page that exists only in Spanish: one line above it says so
    if (LANG === "en" && document.documentElement.lang === "es") app.insertAdjacentHTML("afterbegin", '<p class="note lang-note" lang="en">This page is available in Spanish only.</p>');
    // the blackout notice (textos/portada.md, aviso_veda) on the pages with the forecast or the polls
    if (VEDA && ["inicio", "modelo", "senado", "encuestas", "provincia", "voto"].includes(view)) {
      const T = await textos("portada");
      if (T.aviso_veda) app.insertAdjacentHTML("afterbegin", `<div class="aviso-veda" role="note">${md(T.aviso_veda, { page: "portada" }).html}</div>`);
    }
    if (args[0] === "metodo") { const m = app.querySelector("#metodo"); if (m) { m.open = true; m.scrollIntoView({ block: "start" }); } }
    // "#inicio/fiarse": a link to a section of a page (the section ids are "s-<name>", textos/*.md headings {#name})
    else if (args[0] && /^[\w-]+$/.test(args[0])) app.querySelector(`#s-${args[0]}`)?.scrollIntoView({ block: "start" });
  } catch (e) {
    console.error(e);
    app.innerHTML = `<p>${t("Error cargando la vista:")} ${e.message}</p>`;
  }
}

// Every table sorts by the column whose header is clicked (tables with class "nosort" excepted);
// numbers (with the page's decimals, %, signs) sort numerically, the rest alphabetically; a second click reverses.
document.getElementById("app").addEventListener("click", (ev) => {
  const th = ev.target.closest("th");
  const table = th?.closest("table");
  if (!table || table.classList.contains("nosort") || th.closest("tr") !== table.querySelector("tr")) return;
  const rows = [...table.querySelectorAll("tr")].slice(1).filter((r) => r.querySelector("td"));
  if (rows.length < 3) return;
  const col = [...th.parentNode.children].indexOf(th);
  const val = (r) => { const c = r.children[col]; if (!c) return ""; const t = c.textContent.trim().replace(/\s*\(.*\)$/, "");
    const d = t.replace(/[^\d,.\-−+]/g, "").replace("−", "-");   // English pages write 1,234.5; Spanish ones 1.234,5
    const n = parseFloat(document.documentElement.lang === "en" ? d.replace(/,/g, "") : d.replace(/\./g, "").replace(",", ".")); return isNaN(n) ? t.toLowerCase() : n; };
  const dir = th.dataset.dir === "asc" ? "desc" : "asc";
  table.querySelectorAll("th").forEach((h) => { delete h.dataset.dir; h.classList.remove("sorted"); });
  th.dataset.dir = dir; th.classList.add("sorted");
  rows.sort((a, b) => { const x = val(a), y = val(b); const r = typeof x === "number" && typeof y === "number" ? x - y : typeof x === "number" ? -1 : typeof y === "number" ? 1 : String(x).localeCompare(String(y), "es");
    return dir === "asc" ? r : -r; });
  const parent = rows[0].parentNode;
  rows.forEach((r) => parent.appendChild(r));
});

// Light by default; dark only when the viewer asks for it.
document.getElementById("theme").onclick = () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  route(); // map colours are computed from CSS tokens
};

document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;
chrome();   // top bar and footer in the reader's language, ES · EN buttons
// phones: the row of tabs scrolls sideways; a fade and a "›" (or "‹") show on the side that has more (Víctor, 2026-11-15)
{
  const nav = document.querySelector("header.top nav.sections");
  const wrap = document.createElement("div");
  wrap.className = "nav-wrap";
  nav.before(wrap); wrap.append(nav);
  const btn = (cls, txt, dx) => { const b = document.createElement("button"); b.className = `nav-mas ${cls}`; b.textContent = txt; b.tabIndex = -1;
    b.setAttribute("aria-hidden", "true"); b.onclick = () => nav.scrollBy({ left: dx * nav.clientWidth * 0.6, behavior: "smooth" }); wrap.append(b); };
  btn("der", "›", 1); btn("izq", "‹", -1);
  const upd = () => { wrap.classList.toggle("mas-der", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4); wrap.classList.toggle("mas-izq", nav.scrollLeft > 4); };
  nav.addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); upd();
  nav.querySelector("a.on")?.scrollIntoView({ inline: "nearest", block: "nearest" });
}
// the brand reloads the project to its clean default view
document.querySelector(".brand").addEventListener("click", (e) => {
  e.preventDefault();
  history.replaceState(null, "", location.pathname + (LANG === "en" ? "?lang=en" : ""));   // the language survives the reset
  location.reload();
});

await init();
// explanations on hover: any element with data-tip="..." shows it in the shared tooltip
const app0 = document.getElementById("app");
app0.addEventListener("mousemove", (ev) => { const t = ev.target.closest?.("[data-tip]"); if (t && t.dataset.tip) showTip(t.dataset.tip, ev); });
app0.addEventListener("mouseout", (ev) => { if (ev.target.closest?.("[data-tip]") && !ev.relatedTarget?.closest?.("[data-tip]")) hideTip(); });
addEventListener("hashchange", route);
route();
