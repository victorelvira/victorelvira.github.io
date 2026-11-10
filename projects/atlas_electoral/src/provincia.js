const d3 = window.d3;
import { load, FAM } from "./data.js?v=0.2.67";
import { POLL_PARTY } from "./encuestas.js?v=0.2.67";

const pn = (f) => (f === "sumar" ? "Sumar / Frente Amplio" : POLL_PARTY[f]?.n ?? FAM[f]?.nombre ?? (f === "otros" ? "Otras" : f.toUpperCase()));
export const short = (f) => (f === "sumar" ? "Sumar / FA" : pn(f).split(" y otros")[0]);
export const pc = (f) => POLL_PARTY[f]?.c() ?? FAM[f]?.color ?? "#888";
const nm = (x, d = 1) => (x == null ? "·" : x.toFixed(d).replace(".", ","));
export const pct = (p) => (p >= 0.995 ? ">99%" : p < 0.01 ? "<1%" : `${Math.round(p * 100)}%`);
const f0 = (x) => d3.format(",.0f")(x);   // at call time: the Spanish locale is set after the imports run
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fecha = (s) => `${+s.slice(8)} ${MES[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
export const reparto = (a) => Object.entries(a).sort((x, y) => y[1] - x[1]).map(([f, n]) => `${short(f)} ${n}`).join(", ");
// the closest calls: a party's k-th seat with a probability near one half
export const escanosAire = (D) => D.provincias.flatMap((p) => p.listas.filter((l) => l.f !== "otros").flatMap((l) => l.pk.map((x, k) => ({ p, l, k: k + 1, x })))).filter((d) => d.x >= 0.2 && d.x <= 0.8).sort((a, b) => Math.abs(a.x - 0.5) - Math.abs(b.x - 0.5));
// what changes between the likeliest allocation and another one (an allocation can differ in more than one seat)
function frase(a, b) {
  const sube = [], baja = [];
  for (const f of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const d = (b[f] ?? 0) - (a[f] ?? 0);
    if (d > 0) sube.push(`${short(f)}${d > 1 ? ` (${d})` : ""}`); else if (d < 0) baja.push(`${short(f)}${d < -1 ? ` (${-d})` : ""}`);
  }
  return `sube ${sube.join(" y ")} y baja ${baja.join(" y ")}`;
}

export async function renderProvincia(app, args = []) {
  const D = await load("provincias_29n.json");
  const byCode = Object.fromEntries(D.provincias.map((p) => [p.prov, p]));
  let code = byCode[args[0]] ? args[0] : "28";
  const aire = escanosAire(D);
  app.innerHTML = `
    <h1>Tu provincia</h1>
    <p class="sub">Qué espera el modelo para el 29N en cada provincia, con cuánta seguridad, y todas las encuestas publicadas allí. Con encuestas hasta el ${fecha(D.ultimo_campo)}.</p>
    <div class="controls"><select id="pv-sel" aria-label="Provincia">${D.provincias.map((p) => `<option value="${p.prov}">${p.n}</option>`).join("")}</select></div>
    <section id="pv"></section>
    <section>
    <h2>Escaños en el aire</h2>
    <p class="note">Los casos más igualados de toda España: partidos con una probabilidad cercana a la mitad de conseguir ese escaño. Un mismo escaño disputado aparece una vez por cada partido que lo pelea. Pulsa una provincia para verla.</p>
    <div class="scrollx"><table class="nosort"><tr><th>Provincia</th><th>Partido</th><th class="num">Escaño</th><th class="num">Probabilidad</th><th>Reparto más probable</th></tr>
    ${aire.slice(0, 30).map((d) => `<tr><td><a href="#provincia/${d.p.prov}">${d.p.n}</a></td><td class="pv-nw"><i class="dot" style="background:${pc(d.l.f)}"></i>${short(d.l.f)}</td><td class="num">${d.k}.º</td><td class="num">${pct(d.x)}</td><td>${reparto(d.p.repartos[0].a)}</td></tr>`).join("")}</table></div>
    </section>
    <details class="metodo-box" id="metodo"><summary>Metodología</summary><div class="metodo">
    <p><b>De dónde sale.</b> Es el mismo modelo de la pestaña Encuestas, con ${f0(D.draws)} simulaciones: promedio nacional de encuestas, error común de la industria y, en cada simulación, voto provincial a partir del mapa de 2023 (Sumar, Podemos y SALF, a partir de las europeas de 2024) con ruido por comunidad y provincia y reparto D'Hondt. Las listas que no aparecen en las encuestas nacionales conservan sus votos de 2023.</p>
    <p><b>Partidos regionales.</b> ERC, Junts, Bildu y PNV son cerca del 1% de una muestra nacional, así que su error se mide aparte y el ruido de las encuestas se ajusta a su tamaño. Probado en las elecciones desde 1986, el 90% de sus resultados cae dentro del rango del 90%.</p>
    <p><b>Candidaturas.</b> Las proclamadas para el Congreso en el <a href="${D.boe}" target="_blank" rel="noopener">BOE del 3 de noviembre</a>, con la corrección del 7. De cada lista se muestra solo su cabeza.</p>
    <p><b>Lo que no hace.</b> Las encuestas de la provincia se muestran, pero no mueven este cálculo. Al probarlas sobre las elecciones de 2015 a 2023 mejoraron poco, y solo cuando cambió mucho el mapa de partidos.</p>
    <p><b>Cómo leer las casillas.</b> Cada casilla es un escaño de ese partido: la primera, ganar al menos uno; la segunda, al menos dos. Cuanto más llena, más probable.</p>
    <p><b>Votos del último escaño.</b> Mediana, entre las simulaciones, de los votos que le faltan a la primera lista que se queda fuera para superar a la última que entra, a la escala de los votos de 2023.</p>
    <p><b>Muestra.</b> Propia: la encuesta entrevistó a una muestra de la provincia. Desglose: el dato sale de una muestra mayor. Las filas transcritas de prensa y aún no revisadas van marcadas como tales.</p>
    </div></details>`;
  const sel = app.querySelector("#pv-sel");
  function draw() {
    const p = byCode[code], [a, b, c] = p.repartos;
    sel.value = code;
    const dEsc = p.esc - p.esc23;
    const kmax = Math.max(...p.listas.map((l) => l.pk.length), 1);
    const casillas = `<div class="scrollx"><table class="nosort pv-grid"><tr><th>Partido</th>${d3.range(1, kmax + 1).map((k) => `<th class="num">${k}.º</th>`).join("")}</tr>
      ${p.listas.filter((l) => l.pk.length).map((l) => `<tr><td class="pv-nw"><i class="dot" style="background:${pc(l.f)}"></i>${short(l.f)}</td>${d3.range(kmax).map((k) => { const x = l.pk[k]; return `<td>${x == null ? "" : `<div class="pv-c" title="${short(l.f)}: ${k + 1} o más, ${pct(x)}"><span style="height:${x * 100}%;background:${pc(l.f)}"></span></div><div class="pv-p">${x >= 0.995 ? "" : pct(x)}</div>`}</td>`; }).join("")}</tr>`).join("")}</table></div>`;
    const ult = p.ultimo[0];
    const nE = p.encuestas.length;
    const fams = [...new Set(p.encuestas.flatMap((q) => Object.keys(q.v)))].sort((x, y) => (p.listas.findIndex((l) => l.f === x) + 1 || 99) - (p.listas.findIndex((l) => l.f === y) + 1 || 99));
    const cel = (x) => { if (!x) return '<td class="num">·</td>'; const [v, lo, hi] = x; const s = lo == null ? "" : lo === hi ? `${lo} esc.` : `${lo}–${hi} esc.`; return `<td class="num pv-nw">${v != null ? `${nm(v)}%` : ""}${v != null && s ? "<br>" : ""}${s}</td>`; };
    const TIPO = { propia: "Propia", desglose: "Desglose", "no consta": "No consta" };
    app.querySelector("#pv").innerHTML = `
      <h2>${p.n}</h2>
      <p>Elige ${p.esc} ${p.esc === 1 ? "escaño" : "escaños"}${dEsc ? ` (${Math.abs(dEsc) === 1 ? "uno" : Math.abs(dEsc)} ${dEsc > 0 ? "más" : "menos"} que en 2023)` : ""}. El reparto más probable es <b>${reparto(a.a)}</b>, que sale en el ${pct(a.p)} de las simulaciones.${b ? ` Le sigue un reparto en que ${frase(a.a, b.a)} (${pct(b.p)})` : ""}${c ? ` y otro en que ${frase(a.a, c.a)} (${pct(c.p)})` : ""}${b ? "." : ""}</p>
      <h3>Probabilidad de cada escaño</h3>
      ${casillas}
      <h3>Escaños y voto por partido</h3>
      <div class="scrollx"><table class="nosort"><tr><th>Partido</th><th class="num">Escaños 2023</th><th class="num">Media prevista</th><th class="num">Rango 90%</th><th class="num">Voto 2023</th><th class="num">Voto previsto</th><th class="num">Rango 90%</th></tr>
      ${p.listas.map((l) => `<tr><td class="pv-nw"><i class="dot" style="background:${pc(l.f)}"></i>${short(l.f)}</td><td class="num">${p.s23[l.f] ?? 0}</td><td class="num">${nm(l.s)}</td><td class="num">${l.lo === l.hi ? l.lo : `${l.lo}–${l.hi}`}</td><td class="num">${p.v23[l.f] != null ? `${nm(p.v23[l.f])}%` : "·"}</td><td class="num">${nm(l.v)}%</td><td class="num">${nm(l.vlo)}–${nm(l.vhi)}%</td></tr>`).join("")}</table></div>
      <h3>El último escaño</h3>
      <p>${ult ? `Lo más frecuente es que el último escaño sea de <b>${short(ult[0])}</b> y que la primera lista fuera sea <b>${short(ult[1])}</b> (${pct(ult[2])} de las simulaciones). ${p.margen != null ? `Les separan unos ${f0(p.margen)} votos.` : ""}` : "No hay disputa entre partidos por el último escaño."}</p>
      <h3>Candidaturas proclamadas</h3>
      ${p.candidaturas.length ? `<div class="scrollx"><table class="nosort"><tr><th>Siglas</th><th>Candidatura</th><th>Cabeza de lista</th></tr>${p.candidaturas.map((c) => `<tr><td class="pv-nw">${c.s}</td><td>${c.d}</td><td class="pv-nw">${c.c ?? "·"}</td></tr>`).join("")}</table></div>` : '<p class="note">Sin datos.</p>'}
      <h3>Encuestas publicadas aquí</h3>
      ${nE ? `<div class="scrollx"><table class="nosort"><tr><th>Encuestadora</th><th>Medio</th><th>Fecha</th><th class="num">n</th><th>Muestra</th>${fams.map((f) => `<th class="num">${short(f)}</th>`).join("")}<th>Origen</th></tr>
      ${p.encuestas.map((q) => `<tr><td class="pv-nw">${q.e}</td><td>${q.m ?? "·"}${q.x ? ' <span class="te-x">encargo</span>' : ""}</td><td class="pv-nw">${fecha(q.f)}</td><td class="num pv-nw">${q.n != null ? f0(q.n) : q.de != null ? `<span class="te-de">de ${f0(q.de)}</span>` : "·"}</td><td>${TIPO[q.tipo]}</td>${fams.map((f) => cel(q.v[f])).join("")}<td class="pv-nw">${q.url ? `<a href="${q.url}" target="_blank" rel="noopener">fuente</a>` : "·"}${q.rev ? ' <span class="te-x">sin revisar</span>' : ""}</td></tr>`).join("")}</table></div>` : '<p class="note">Aún no conocemos ninguna encuesta publicada para esta provincia.</p>'}`;
  }
  sel.addEventListener("change", () => { code = sel.value; history.replaceState(null, "", `#provincia/${code}`); draw(); });
  draw();
}
