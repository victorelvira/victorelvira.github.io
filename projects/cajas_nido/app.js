/* Cajas nido de Laredo — mapa interactivo. */
const DATA_V = "0.2.1";
const BUILD_AT = "2026-08-20 17:53";

const D = window.DATOS;
const $ = (s) => document.querySelector(s);

const COLOR = {
  paridos: "#3d7ea6", mariquitas: "#d1495b", murcielagos: "#6b4e8f",
  erizos: "#9c6b3f", lechuzas: "#c98b1b", cernicalos: "#b3541e",
  balcon: "#2a8f7e", otras: "#6b7680",
};
const EMOJI = {
  paridos: "🐦", mariquitas: "🐞", murcielagos: "🦇", erizos: "🦔",
  lechuzas: "🦉", cernicalos: "🪶", balcon: "🪟", otras: "📦",
};
const ROSA = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
// Orden fijo de tipos: fija la leyenda y el reparto de los quesitos del clúster.
const ORDEN_TIPOS = ["paridos", "mariquitas", "murcielagos", "erizos",
                     "lechuzas", "cernicalos", "balcon", "otras"];
const ESTADO = {
  ocupada:      { etiqueta: "Ocupada",     color: "#2e8b3f", emoji: "🥚" },
  vacia:        { etiqueta: "Vacía",       color: "#8a8a8a", emoji: "⚪" },
  limpiada:     { etiqueta: "Limpiada",    color: "#3d7ea6", emoji: "🧽" },
  danada:       { etiqueta: "Dañada",      color: "#d98324", emoji: "🔧" },
  desaparecida: { etiqueta: "Desaparecida", color: "#c0392b", emoji: "❓" },
};

const estado = { tipos: new Set(), centros: new Set(), anios: new Set(), expo: new Set(),
                 estados: new Set(), texto: "", soloFoto: false, porMapa: false,
                 orden: "ref", sel: null };
const HAY_SEGUIMIENTO = D.cajas.some((c) => c.revisiones.length);

/* ------------------------------------------------------------------ mapa */
const map = L.map("map", { zoomControl: true }).setView([43.4145, -3.425], 14);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const capaZonas = L.layerGroup();
D.zonas.forEach((z) => {
  z.rings.forEach((r) => L.polygon(r, {
    color: "#2e6b3e", weight: 1, fillColor: "#4d9e5f", fillOpacity: .25,
  }).bindTooltip(z.nombre).addTo(capaZonas));
});

const capaRiesgos = L.layerGroup().addTo(map);
D.riesgos.filter((r) => r.coord).forEach((r) => {
  L.marker(r.coord, { icon: L.divIcon({
    className: "", iconSize: [20, 18], iconAnchor: [10, 13],
    html: `<div class="pin-riesgo">!</div>`,
  })}).bindTooltip(r.nombre).on("click", () => abrirRiesgo(r)).addTo(capaRiesgos);
});

// Los clústeres llevan un color neutro para no competir con el color de tipo.
const capaCajas = L.markerClusterGroup({
  maxClusterRadius: 40,
  showCoverageOnHover: false,
  spiderfyOnMaxZoom: true,
  disableClusteringAtZoom: 18,
  iconCreateFunction(c) {
    const hijos = c.getAllChildMarkers();
    const n = hijos.length;
    const size = n >= 25 ? 46 : n >= 10 ? 40 : 34;

    // Reparto por tipo, en el orden fijo de la leyenda para que el quesito
    // no cambie de aspecto al reagruparse.
    const cuenta = new Map();
    hijos.forEach((m) => cuenta.set(m.options.tipo, (cuenta.get(m.options.tipo) || 0) + 1));
    const partes = ORDEN_TIPOS.filter((t) => cuenta.has(t)).map((t) => [t, cuenta.get(t)]);

    let fondo;
    if (partes.length === 1) {
      fondo = COLOR[partes[0][0]];
    } else {
      let acc = 0;
      fondo = "conic-gradient(" + partes.map(([t, k]) => {
        const desde = (acc / n) * 100;
        acc += k;
        return `${COLOR[t]} ${desde.toFixed(2)}% ${((acc / n) * 100).toFixed(2)}%`;
      }).join(", ") + ")";
    }
    return L.divIcon({
      html: `<div class="cl" style="width:${size}px;height:${size}px;background:${fondo}">
               <span class="cl-n">${n}</span></div>`,
      className: "", iconSize: [size, size],
    });
  },
});
map.addLayer(capaCajas);

const marcadores = new Map();
D.cajas.filter((c) => c.coord).forEach((c) => {
  const m = L.marker(c.coord, { tipo: c.tipo, icon: L.divIcon({
    className: "", iconSize: [16, 16], iconAnchor: [8, 8],
    html: `<div class="pin${c.estado ? " pin-" + c.estado : ""}" style="width:16px;height:16px;background:${COLOR[c.tipo]}"></div>`,
  })});
  m.bindTooltip(`${EMOJI[c.tipo]} ${c.ref}`);
  m.on("click", () => { abrirCaja(c); marcar(c.id); });
  marcadores.set(c.id, m);
});

// Leyenda de colores por tipo, abajo a la izquierda.
const leyenda = L.control({ position: "bottomleft" });
leyenda.onAdd = () => {
  const div = L.DomUtil.create("div", "leyenda");
  div.innerHTML = ORDEN_TIPOS.filter((t) => D.cajas.some((c) => c.tipo === t))
    .map((t) => `<div><span class="k" style="background:${COLOR[t]}"></span>${
      D.cajas.find((c) => c.tipo === t).tipoLabel}</div>`).join("") +
    `<div><span class="k k-tri"></span>Riesgos y peligros</div>`;
  return div;
};
leyenda.addTo(map);

/* --------------------------------------------------------------- filtros */
function cuenta(campo, valor, base) {
  return base.filter((c) => (campo === "expo" ? c.exposicion : c[campo]) === valor).length;
}

function construirChips(id, campo, valores, opts = {}) {
  const cont = $(id);
  cont.innerHTML = "";
  valores.forEach(({ valor, etiqueta, color, n }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    if (opts.rosa) b.dataset.rumbo = valor;
    if (!n) { b.disabled = true; b.classList.add("chip-vacio"); }
    if (color) b.style.setProperty("--c", color);
    b.innerHTML = (color ? `<span class="punto"></span>` : "") +
      `<span>${etiqueta}</span><span class="n">${n}</span>`;
    b.onclick = () => {
      if (!n) return;
      const s = estado[campo];
      s.has(valor) ? s.delete(valor) : s.add(valor);
      b.classList.toggle("activo");
      render();
    };
    cont.appendChild(b);
  });
  if (opts.rosa) {
    const c = document.createElement("span");
    c.className = "rosa-centro";
    c.textContent = "🧭";
    cont.appendChild(c);
  }
}

function inicializarFiltros() {
  const tipos = [...new Set(D.cajas.map((c) => c.tipo))]
    .map((t) => ({ valor: t, etiqueta: D.cajas.find((c) => c.tipo === t).tipoLabel,
                   color: COLOR[t], n: cuenta("tipo", t, D.cajas) }))
    .sort((a, b) => b.n - a.n);
  construirChips("#f-tipos", "tipos", tipos);

  const centros = [...new Set(D.cajas.map((c) => c.centro).filter(Boolean))]
    .map((v) => ({ valor: v, etiqueta: v, n: cuenta("centro", v, D.cajas) }))
    .sort((a, b) => b.n - a.n);
  const sinCentro = D.cajas.filter((c) => !c.centro).length;
  if (sinCentro) centros.push({ valor: "", etiqueta: "Sin anotar", n: sinCentro });
  construirChips("#f-centros", "centros", centros);

  const anios = [...new Set(D.cajas.map((c) => c.anio).filter(Boolean))].sort()
    .map((v) => ({ valor: v, etiqueta: v, n: cuenta("anio", v, D.cajas) }));
  construirChips("#f-anios", "anios", anios);

  const expo = ROSA.map((v) => ({ valor: v, etiqueta: v, n: cuenta("expo", v, D.cajas) }));
  construirChips("#f-expo", "expo", expo, { rosa: true });

  // El bloque de seguimiento sólo aparece cuando hay revisiones cargadas.
  $("#g-estados").hidden = !HAY_SEGUIMIENTO;
  if (HAY_SEGUIMIENTO) {
    const est = Object.keys(ESTADO)
      .filter((e) => D.cajas.some((c) => c.estado === e))
      .map((e) => ({ valor: e, etiqueta: `${ESTADO[e].emoji} ${ESTADO[e].etiqueta}`,
                     color: ESTADO[e].color, n: cuenta("estado", e, D.cajas) }));
    const sinRevisar = D.cajas.filter((c) => !c.estado).length;
    if (sinRevisar) est.push({ valor: "", etiqueta: "Sin revisar", n: sinRevisar });
    construirChips("#f-estados", "estados", est);
  }
}

function filtrar() {
  const t = estado.texto.toLowerCase();
  const b = estado.porMapa ? map.getBounds() : null;
  return D.cajas.filter((c) => {
    if (estado.tipos.size && !estado.tipos.has(c.tipo)) return false;
    if (estado.centros.size && !estado.centros.has(c.centro)) return false;
    if (estado.anios.size && !estado.anios.has(c.anio)) return false;
    if (estado.expo.size && !estado.expo.has(c.exposicion)) return false;
    if (estado.estados.size && !estado.estados.has(c.estado)) return false;
    if (estado.soloFoto && !c.fotos.length) return false;
    if (b && c.coord && !b.contains(c.coord)) return false;
    if (t) {
      const heno = [c.ref, c.tipoLabel, c.constructor, c.equipo, c.ubicacion, c.notas, c.materiales]
        .join(" ").toLowerCase();
      if (!heno.includes(t)) return false;
    }
    return true;
  });
}

const ORDENES = {
  ref:    { etiqueta: "Número de caja", fn: (a, b) => a.ref.localeCompare(b.ref, "es", { numeric: true }) },
  fecha:  { etiqueta: "Más recientes",  fn: (a, b) => (b.fecha || "").localeCompare(a.fecha || "") },
  centro: { etiqueta: "Colegio",        fn: (a, b) => (a.centro || "zz").localeCompare(b.centro || "zz", "es") },
  tipo:   { etiqueta: "Tipo de caja",   fn: (a, b) => a.tipoLabel.localeCompare(b.tipoLabel, "es") },
};

/* --------------------------------------------------------------- render */
function render() {
  const vis = filtrar().sort(ORDENES[estado.orden].fn);
  $("#contador").textContent = vis.length;

  capaCajas.clearLayers();
  vis.forEach((c) => { const m = marcadores.get(c.id); if (m) capaCajas.addLayer(m); });

  const total = D.cajas.length;
  $("#lista-n").textContent = vis.length === total
    ? `Las ${total} cajas`
    : `${vis.length} de ${total} cajas`;
  $("#lista-filtrada").hidden = vis.length === total;

  const ul = $("#lista");
  ul.innerHTML = "";
  if (!vis.length) {
    ul.innerHTML = '<li class="vacio">Ninguna caja coincide con los filtros.<br>' +
                   'Prueba a quitar alguno, o pulsa «Limpiar filtros».</li>';
    return;
  }
  const frag = document.createDocumentFragment();
  vis.forEach((c) => {
    const li = document.createElement("li");
    li.className = "card" + (estado.sel === c.id ? " sel" : "");
    li.style.borderLeftColor = COLOR[c.tipo];
    li.innerHTML =
      (c.fotos.length ? `<img class="card-thumb" loading="lazy" src="cajas_nido/img/${c.fotos[0]}" alt="">`
                      : `<span class="card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:22px">${EMOJI[c.tipo]}</span>`) +
      `<div class="card-body">
         <div class="card-tit">
           <span class="card-ref">${c.ref}</span>
           <span class="card-tipo" style="background:${COLOR[c.tipo]}">${EMOJI[c.tipo]} ${c.tipoLabel}</span>
           ${c.estado ? `<span class="card-estado" title="${ESTADO[c.estado].etiqueta}">${ESTADO[c.estado].emoji}</span>` : ""}
         </div>
         <div class="card-sub">${[c.equipo && "«" + c.equipo + "»", c.centro, fechaES(c.fecha)]
            .filter(Boolean).join(" · ") || "sin datos de construcción"}</div>
       </div>`;
    li.onclick = () => { abrirCaja(c); marcar(c.id); if (c.coord) map.setView(c.coord, 18); };
    frag.appendChild(li);
  });
  ul.appendChild(frag);
  if (!$("#panel-datos").hidden) pintarDatos(vis);
  if (!$("#panel-galeria").hidden) pintarGaleria(vis);
}

function marcar(id) {
  estado.sel = id;
  document.querySelectorAll(".card").forEach((e) => e.classList.remove("sel"));
}

function fechaES(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* --------------------------------------------------------------- detalle */
function fila(dt, dd) {
  return dd ? `<div class="det-fila"><dt>${dt}</dt><dd>${dd}</dd></div>` : "";
}

function abrirCaja(c) {
  const fotos = c.fotos.map((f) =>
    `<img loading="lazy" src="cajas_nido/img/${f}" alt="Caja nido ${c.ref}">`).join("");
  $("#detalle-contenido").innerHTML =
    (fotos ? `<div class="det-fotos">${fotos}</div>` : "") +
    `<div class="det-cuerpo">
       <span class="det-badge" style="background:${COLOR[c.tipo]}">${EMOJI[c.tipo]} ${c.tipoLabel}</span>
       <h2>Caja ${c.ref}</h2>
       <p class="det-ref">${c.tipoRaw || ""}</p>
       ${fila("Instalada", fechaES(c.fecha))}
       ${fila("Equipo", c.equipo)}
       ${fila("Construida por", c.constructor)}
       ${fila("Ubicación", c.ubicacion)}
       ${fila("Orientación", c.exposicionRaw)}
       ${fila("Materiales", c.materiales)}
       ${fila("Notas", c.notas)}
       ${fila("Coordenadas", c.coord ? c.coord.map((n) => n.toFixed(5)).join(", ") : "")}
       ${c.revisiones.length ? `<div class="det-fila"><dt>Seguimiento</dt><dd>${
          c.revisiones.map((r) => `<div class="rev">
            <span class="rev-punto" style="background:${(ESTADO[r.estado] || {}).color || "#999"}"></span>
            <b>${(ESTADO[r.estado] || {}).etiqueta || r.estado}</b> · ${fechaES(r.fecha)}
            ${r.especie ? "<br>" + r.especie : ""}${r.notas ? "<br><i>" + r.notas + "</i>" : ""}
          </div>`).join("")}</dd></div>` : ""}
       <div class="det-acciones">
         ${c.coord ? `<a target="_blank" rel="noopener"
            href="https://www.google.com/maps/dir/?api=1&destination=${c.coord[0]},${c.coord[1]}">Cómo llegar</a>` : ""}
         <button type="button" class="compartir" data-slug="${c.slug}">Compartir esta caja</button>
       </div>
     </div>`;
  history.replaceState(null, "", "#caja=" + c.slug);
  mostrarDetalle();
}

function abrirRiesgo(r) {
  const fotos = r.fotos.map((f) => `<img loading="lazy" src="cajas_nido/img/${f}" alt="">`).join("");
  $("#detalle-contenido").innerHTML =
    (fotos ? `<div class="det-fotos">${fotos}</div>` : "") +
    `<div class="det-cuerpo">
       <span class="det-badge" style="background:#c0392b">⚠️ ${r.tipoLabel}</span>
       <h2>${r.nombre}</h2>
       ${fila("Por qué es un riesgo", r.info)}
       ${fila("Notas", r.notas)}
     </div>`;
  mostrarDetalle();
}

function mostrarDetalle() {
  $("#detalle").hidden = false;
  $("#overlay").hidden = false;
}
function cerrarDetalle() {
  $("#detalle").hidden = true;
  $("#overlay").hidden = true;
  if (location.hash) history.replaceState(null, "", location.pathname);
}

// Copiar el enlace directo a una caja: es la vía por la que un colegio manda
// a las familias la caja que construyó su clase.
async function compartir(slug) {
  const url = location.origin + location.pathname + "#caja=" + slug;
  const btn = $(`.compartir[data-slug="${slug}"]`);
  try {
    if (navigator.share) { await navigator.share({ title: "Cajas nido de Laredo", url }); return; }
    await navigator.clipboard.writeText(url);
    btn.textContent = "¡Enlace copiado!";
    setTimeout(() => { btn.textContent = "Compartir esta caja"; }, 2000);
  } catch { /* el usuario canceló el diálogo de compartir */ }
}

// #caja=061 abre esa ficha directamente, con el mapa centrado en ella.
function abrirDesdeHash() {
  const m = /#caja=(.+)$/.exec(location.hash);
  if (!m) return;
  const c = D.cajas.find((x) => x.slug === decodeURIComponent(m[1]));
  if (!c) return;
  abrirCaja(c);
  if (c.coord) map.setView(c.coord, 18);
}

/* --------------------------------------------------------------- galería */
// La entrada principal para "quiero ver la caja que construyó mi clase".
function pintarGaleria(vis) {
  const conFoto = vis.filter((c) => c.fotos.length);
  const sinFoto = vis.length - conFoto.length;
  $("#panel-galeria").innerHTML =
    `<p class="gal-nota">${conFoto.length} cajas con foto` +
    (sinFoto ? ` · ${sinFoto} todavía sin fotografiar` : "") + `</p>` +
    `<div class="gal-grid">` + conFoto.map((c) =>
      `<figure class="gal-item" data-id="${c.id}">
         <img loading="lazy" src="cajas_nido/img/${c.fotos[0]}" alt="Caja nido ${c.ref}">
         <figcaption>
           <strong>${c.ref}</strong>
           <span>${c.equipo ? "«" + c.equipo + "»" : c.centro || c.tipoLabel}</span>
         </figcaption>
       </figure>`).join("") + `</div>` +
    (conFoto.length ? "" : '<p class="vacio">Ninguna de las cajas filtradas tiene foto.</p>');
  $("#panel-galeria").querySelectorAll(".gal-item").forEach((el) => {
    el.onclick = () => abrirCaja(D.cajas.find((c) => c.id === el.dataset.id));
  });
}

/* ----------------------------------------------------------------- datos */
function pintarDatos(vis) {
  const grupo = (fn) => {
    const m = new Map();
    vis.forEach((c) => { const k = fn(c); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const barras = (tit, pares, color) => {
    const max = Math.max(...pares.map((p) => p[1]), 1);
    return `<div class="barras"><h3>${tit}</h3>` + pares.map(([k, n]) =>
      `<div class="barra"><span class="bl" title="${k}">${k}</span>
       <span class="bt" style="width:${(n / max) * 100}%;background:${color(k)}"></span>
       <span class="bn">${n}</span></div>`).join("") + "</div>";
  };
  const conFoto = vis.filter((c) => c.fotos.length).length;
  $("#panel-datos").innerHTML =
    `<div class="stat-grid">
       <div class="stat"><div class="stat-n">${vis.length}</div><div class="stat-l">cajas nido</div></div>
       <div class="stat"><div class="stat-n">${new Set(vis.map((c) => c.centro).filter(Boolean)).size}</div><div class="stat-l">centros y grupos participantes</div></div>
       <div class="stat"><div class="stat-n">${conFoto}</div><div class="stat-l">documentadas con foto</div></div>
       <div class="stat"><div class="stat-n">${D.riesgos.length}</div><div class="stat-l">riesgos localizados</div></div>
       <div class="stat"><div class="stat-n">${D.zonas.length}</div><div class="stat-l">zonas verdes municipales</div></div>
     </div>` +
    barras("Por tipo de caja", grupo((c) => c.tipoLabel),
           (k) => COLOR[(D.cajas.find((c) => c.tipoLabel === k) || {}).tipo] || "#2e6b3e") +
    barras("Por quién la construyó", grupo((c) => c.centro), () => "#2e6b3e") +
    barras("Por año de instalación", grupo((c) => c.anio).sort((a, b) => a[0].localeCompare(b[0])), () => "#3d7ea6") +
    barras("Por orientación", ROSA.map((r) => [r, vis.filter((c) => c.exposicion === r).length])
           .filter((p) => p[1]), () => "#c98b1b");
}

/* --------------------------------------------------------------- eventos */
$("#buscar").addEventListener("input", (e) => { estado.texto = e.target.value.trim(); render(); });
$("#orden").addEventListener("change", (e) => { estado.orden = e.target.value; render(); });
$("#solo-foto").addEventListener("change", (e) => { estado.soloFoto = e.target.checked; render(); });
$("#filtro-mapa").addEventListener("change", (e) => { estado.porMapa = e.target.checked; render(); });
map.on("moveend", () => { if (estado.porMapa) render(); });

$("#capa-riesgos").checked = true;
$("#capa-riesgos").addEventListener("change", (e) =>
  e.target.checked ? map.addLayer(capaRiesgos) : map.removeLayer(capaRiesgos));
$("#capa-zonas").addEventListener("change", (e) =>
  e.target.checked ? map.addLayer(capaZonas) : map.removeLayer(capaZonas));

$("#limpiar").addEventListener("click", () => {
  ["tipos", "centros", "anios", "expo", "estados"].forEach((k) => estado[k].clear());
  estado.texto = ""; estado.soloFoto = false;
  $("#buscar").value = ""; $("#solo-foto").checked = false;
  document.querySelectorAll(".chip.activo").forEach((c) => c.classList.remove("activo"));
  render();
});

$("#cerrar-detalle").addEventListener("click", cerrarDetalle);
$("#overlay").addEventListener("click", cerrarDetalle);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("#visor").hidden) $("#visor").hidden = true; else cerrarDetalle();
});

$("#detalle").addEventListener("click", (e) => {
  if (e.target.classList.contains("compartir")) { compartir(e.target.dataset.slug); return; }
  if (e.target.tagName === "IMG" && e.target.closest(".det-fotos")) {
    $("#visor-img").src = e.target.src;
    $("#visor").hidden = false;
  }
});
$("#cerrar-visor").addEventListener("click", () => { $("#visor").hidden = true; });
$("#visor").addEventListener("click", (e) => { if (e.target.id === "visor") $("#visor").hidden = true; });

document.querySelectorAll(".vista-toggle button").forEach((b) => {
  b.addEventListener("click", () => {
    document.querySelectorAll(".vista-toggle button").forEach((x) => x.classList.remove("vista-activa"));
    b.classList.add("vista-activa");
    const v = b.dataset.vista;
    document.body.className = "vista-" + v;
    $("#panel-datos").hidden = v !== "datos";
    $("#panel-galeria").hidden = v !== "galeria";
    if (v === "datos") pintarDatos(filtrar());
    else if (v === "galeria") pintarGaleria(filtrar());
    else map.invalidateSize();
  });
});

document.querySelector(".brand").addEventListener("click", (e) => {
  e.preventDefault();
  history.replaceState(null, "", location.pathname);
  location.reload();
});

/* ------------------------------------------------------------------ init */
$("#build").textContent = `v${DATA_V} · updated ${BUILD_AT}`;
$("#update-info").textContent = `datos del mapa: ${D.meta.generado}`;
document.body.className = "vista-mapa";
$("#orden").innerHTML = Object.entries(ORDENES)
  .map(([k, v]) => `<option value="${k}">${v.etiqueta}</option>`).join("");
inicializarFiltros();
render();
requestAnimationFrame(() => {
  map.invalidateSize();
  const puntos = D.cajas.filter((c) => c.coord).map((c) => c.coord);
  if (puntos.length) map.fitBounds(L.latLngBounds(puntos).pad(0.05));
  abrirDesdeHash();
});
window.addEventListener("hashchange", abrirDesdeHash);
