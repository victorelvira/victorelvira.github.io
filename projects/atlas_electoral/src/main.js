import { init } from "./data.js?v=0.2.19";
import { renderMapa } from "./mapa.js?v=0.2.19";
import { renderPueblo } from "./pueblo.js?v=0.2.19";
import { renderMiniatura } from "./miniatura.js?v=0.2.19";
import { renderSimulador } from "./simulador.js?v=0.2.19";
import { renderEncuestas } from "./encuestas.js?v=0.2.19";
import { renderInicio } from "./inicio.js?v=0.2.19";
import { renderHistoria } from "./historia.js?v=0.2.19";
import { renderComunidad } from "./comunidad.js?v=0.2.19";
import { renderExplora } from "./explora.js?v=0.2.19";
import { hideTip, DATA_V, BUILD_AT } from "./data.js?v=0.2.19";

// Spanish decimal comma and thousands point for every d3.format (axes, tooltips)
window.d3.formatDefaultLocale({ decimal: ",", thousands: ".", grouping: [3], currency: ["", " €"] });
// Spanish month and day names on every time axis (d3 defaults to English)
window.d3.timeFormatDefaultLocale({
  dateTime: "%A, %e de %B de %Y, %X", date: "%d/%m/%Y", time: "%H:%M:%S", periods: ["AM", "PM"],
  days: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
  shortDays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
  months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  shortMonths: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
});

const routes = {
  inicio: renderInicio,
  encuestas: renderEncuestas,
  generales: renderHistoria,
  historia: renderHistoria, // old links
  simulador: renderSimulador,
  mapa: renderMapa,
  explora: renderExplora,
  comunidad: renderComunidad,
  pueblo: renderPueblo,
  miniatura: renderMiniatura,
};
// views without a tab of their own (reached from the maps and the footer) light up Generales
const TAB = { historia: "generales", mapa: "generales", explora: "generales", pueblo: "generales", comunidad: "generales", miniatura: "generales" };

async function route() {
  hideTip();
  scrollTo(0, 0);
  const [name, ...args] = location.hash.replace(/^#/, "").split("/");
  const view = routes[name] ? name : "inicio";
  document.querySelectorAll("nav.sections a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${TAB[view] ?? view}`));
  const app = document.getElementById("app");
  app.innerHTML = '<p class="loading">Cargando…</p>';
  try {
    await routes[view](app, args.map(decodeURIComponent));
  } catch (e) {
    console.error(e);
    app.innerHTML = `<p>Error cargando la vista: ${e.message}</p>`;
  }
}

// Light by default; dark only when the viewer asks for it.
document.getElementById("theme").onclick = () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  route(); // map colours are computed from CSS tokens
};

document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;
// the brand reloads the project to its clean default view
document.querySelector(".brand").addEventListener("click", (e) => {
  e.preventDefault();
  history.replaceState(null, "", location.pathname);
  location.reload();
});

await init();
addEventListener("hashchange", route);
route();
