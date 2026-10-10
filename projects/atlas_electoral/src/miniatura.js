const d3 = window.d3; // vendored UMD build, loaded by the entry page
import { load, META, elecLabel } from "./data.js?v=0.2.24";

export async function renderMiniatura(app) {
  const mini = await load("miniatura.json");
  const n = mini.elecciones.length;
  const W = 140, H = 22, max = d3.max(mini.top, (m) => d3.max(m.serie));
  const spark = (s) => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${s.map((v, i) =>
    `<rect x="${i * (W / n) + 1}" width="${W / n - 2}" y="${H - (v / max) * H}" height="${(v / max) * H}" rx="1.5" fill="var(--ink-3)"><title>${elecLabel(mini.elecciones[i])}: ${v} pp</title></rect>`).join("")}</svg>`;

  app.innerHTML = `
    <h1>España en miniatura</h1>
    <p class="sub">¿Qué municipio vota como España? Para cada elección general desde 1977 medimos la distancia entre el reparto de votos del municipio y el del conjunto del país (índice de disimilitud: la mitad de la suma de las diferencias, en puntos porcentuales). Promediamos las ${n} elecciones. Solo municipios con más de 1.000 electores y datos en todas ellas.</p>
    <table>
      <tr><th>#</th><th>Municipio</th><th>Provincia</th><th class="num">Distancia media</th><th>Por elección (${mini.elecciones[0].slice(10, 14)} → ${mini.elecciones.at(-1).slice(10, 14)})</th></tr>
      ${mini.top.map((m, i) => `<tr><td>${i + 1}</td><td><a href="#pueblo/${m.ine}">${m.n}</a></td>
        <td>${META.provincias[m.ine.slice(0, 2)]}</td><td class="num">${m.d.toFixed(1).replace(".", ",")} pp</td><td>${spark(m.serie)}</td></tr>`).join("")}
    </table>
    <p class="note">Una distancia de 5 pp significa que habría que mover un 5% de los votos de un partido a otro para que el municipio quedara igual que España. Las barras más bajas indican más parecido.</p>`;
}
