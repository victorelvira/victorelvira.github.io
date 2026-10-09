export async function renderExplora(app) {
  app.innerHTML = `
    <h1>Explora</h1>
    <p class="sub">Los resultados de cada municipio y cada comunidad desde 1977, en todas las elecciones: generales, autonómicas, municipales, europeas y Senado.</p>
    <div class="tiles">
      <a class="tile" href="#pueblo"><b>Tu pueblo</b><span>Historial electoral de cualquier municipio, sus concejales y sus gemelos electorales</span></a>
      <a class="tile" href="#comunidad"><b>Tu comunidad</b><span>Parlamento autonómico, voto, participación y quién la representa</span></a>
      <a class="tile" href="#mapa"><b>Mapa municipal</b><span>Qué votó cada municipio en cada elección</span></a>
      <a class="tile" href="#miniatura"><b>España en miniatura</b><span>Los municipios que votan como el conjunto del país</span></a>
    </div>`;
}
