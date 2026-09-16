"use strict";
const DATA_V = "0.1.0";
const BUILD_AT = "2026-09-16 22:31";
document.getElementById("build").textContent = `v${DATA_V} · ${BUILD_AT}`;

// ---------- vocabulary ----------
const SRC_SHORT = {
  wikidata: "Wikidata", eswiki: "Wikipedia · ficha", eswiki_anexos: "Wikipedia · anexo",
  cawiki_balears: "Viquipèdia", glwiki_xentilicios: "Galipedia", eswiktionary: "Wikcionario",
  avl_municipis: "Acadèmia Valenciana de la Llengua", parlament_cat_guia: "Parlament de Catalunya",
  euskaltzaindia_arauak: "Euskaltzaindia", acl_catalogo: "Academia Canaria de la Lengua",
  rag_lexico_admin: "Real Academia Galega", fundeurae: "FundéuRAE", rae_dle: "DLE · RAE",
  madoz: "Madoz (1845-1850)", felipe2_ciudadreal: "Relaciones de Felipe II", felipe2_cuenca: "Relaciones de Felipe II",
  felipe2_toledo: "Relaciones de Felipe II", felipe2_guadalajara: "Relaciones de Felipe II",
  cawiki: "Viquipèdia", glwiki: "Galipedia", euwiki: "Wikipedia en euskera",
};
const FIELD_LABEL = {
  demonym: "Gentilicio", demonym_nickname: "Apodo", demonym_dictionary: "Diccionario",
  name_etymology: "Etimología del nombre", name_origin_legend: "Por qué se llama así, según la tradición",
  name_historical_form: "Forma antigua del nombre", historical_description: "Descripción histórica",
  demonym_etymology: "Etimología del gentilicio", demonym_first_attestation: "Primera aparición del gentilicio",
};
const KIND_LABEL = { academic: "académica", traditional: "tradicional", folk: "leyenda", deduced: "deducida" };
const LANG_LABEL = { es: "es", ca: "ca", gl: "gl", eu: "eu", ast: "ast", an: "an", oc: "oc" };
const MATCH_LABEL = {
  wikidata_item: "dato del propio elemento de Wikidata del municipio",
  eswiki_article: "ficha del artículo del municipio",
  list_link_item: "línea de una lista enlazada al artículo del municipio",
  list_name_unique_in_ccaa: "nombre único dentro de la comunidad de la lista",
  wiktionary_name_country: "nombre único en España citado en la acepción",
};
const srcName = s => SRC_SHORT[s] || (SOURCES[s] && SOURCES[s].name) || s;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fold = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fmt = n => n.toLocaleString("es-ES");

let MUNIS = [], BY_ID = new Map(), SOURCES = {}, CLAIMS = null, CLAIMS_BY = null;
let mode = "sources", selected = null, layer = null, map = null;
const layersById = new Map();

// ---------- colours ----------
function colourOf(m) {
  if (mode === "sources") {
    const n = m.ns;
    return n === 0 ? "#ebe5da" : n === 1 ? "#e6c89c" : n === 2 ? "#c9905a" : "#8a4f2a";
  }
  if (mode === "curious") return m.cu ? "#7b3fb0" : (m.g.length ? "#e7e0d4" : "#f3efe8");
  if (mode === "ety") return m.ety && m.hist ? "#1f4f4f" : m.ety ? "#2e6b6b" : m.hist ? "#8fb8b0" : "#ebe5da";
}
function legend() {
  const count = f => fmt(MUNIS.filter(f).length);
  const rows = {
    sources: [["Fuentes con gentilicio", null],
      ["#8a4f2a", "3 o más", m => m.ns >= 3], ["#c9905a", "2", m => m.ns === 2],
      ["#e6c89c", "1", m => m.ns === 1], ["#ebe5da", "sin documentar", m => m.ns === 0]],
    curious: [["Gentilicio curioso", null],
      ["#7b3fb0", "no se parece al nombre", m => m.cu], ["#e7e0d4", "se parece", m => !m.cu && m.g.length],
      ["#f3efe8", "sin gentilicio", m => !m.g.length]],
    ety: [["Etimología e historia", null],
      ["#1f4f4f", "las dos", m => m.ety && m.hist], ["#2e6b6b", "etimología", m => m.ety && !m.hist],
      ["#8fb8b0", "historia", m => m.hist && !m.ety], ["#ebe5da", "nada todavía", m => !m.ety && !m.hist]],
  }[mode];
  document.getElementById("legend").innerHTML = rows.map(([c, l, f]) => f
    ? `<div class="lr"><span class="sw" style="background:${c}"></span>${l}<span class="ln">${count(f)}</span></div>`
    : `<div class="lt">${c}</div>`).join("") +
    (mode === "curious" ? `<div class="note">calculado: comparamos el gentilicio con el nombre</div>` : "");
}
function restyle() {
  if (!layer) return;
  layer.eachLayer(l => {
    const m = BY_ID.get(l.feature.id);
    const sel = selected && m.id === selected;
    l.setStyle({ fillColor: colourOf(m), fillOpacity: sel ? 1 : .88, color: sel ? "#241a12" : "#fff", weight: sel ? 2.2 : .35 });
    if (sel) l.bringToFront();
  });
  legend();
}

// ---------- main gentilicio text ----------
function mainForms(m, n = 2) {
  const dem = m.g.filter(f => f.k === "dem" && (!f.l.length || f.l.includes("es")));
  const list = (dem.length ? dem : m.g.filter(f => f.k === "dem")).slice(0, n);
  return list.map(f => f.m).join(", ");
}

// ---------- load ----------
Promise.all([
  fetch(`gentilicios/data/munis.json?v=${DATA_V}`).then(r => r.json()),
  fetch(`gentilicios/data/sources.json?v=${DATA_V}`).then(r => r.json()),
  fetch(`gentilicios/data/municipalities.geojson?v=${DATA_V}`).then(r => r.json()),
]).then(([munis, sources, geo]) => {
  MUNIS = munis; SOURCES = sources;
  for (const m of MUNIS) BY_ID.set(m.id, m);
  stats(); initMap(geo); initSearch(); initTable(); intro();
  fromHash();
});

function stats() {
  const withG = MUNIS.filter(m => m.g.some(f => f.k === "dem")).length;
  const forms = MUNIS.reduce((a, m) => a + m.g.length, 0);
  document.getElementById("stats").innerHTML =
    `<b>${fmt(MUNIS.length)}</b> municipios · <b>${fmt(withG)}</b> con gentilicio · <b>${fmt(forms)}</b> formas`;
}

function initMap(geo) {
  map = L.map("map", { preferCanvas: true, zoomControl: true, minZoom: 4 }).setView([40.2, -3.6], 6);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · límites: Eurostat GISCO · municipios: INE',
    maxZoom: 18, opacity: .5,
  }).addTo(map);
  layer = L.geoJSON(geo, {
    style: f => ({ fillColor: colourOf(BY_ID.get(f.id)), fillOpacity: .88, color: "#fff", weight: .35 }),
    onEachFeature: (f, l) => {
      layersById.set(f.id, l);
      l.on("mouseover", () => {
        const m = BY_ID.get(f.id);
        const g = mainForms(m);
        l.bindTooltip(`<b>${esc(m.n)}</b>${g ? esc(g) : "<i>sin gentilicio documentado</i>"}`, { className: "mt", sticky: true, direction: "top" }).openTooltip();
        if (m.id !== selected) l.setStyle({ weight: 1.4, color: "#241a12" });
      });
      l.on("mouseout", () => { if (f.id !== selected) l.setStyle({ weight: .35, color: "#fff" }); });
      l.on("click", () => select(f.id, false));
    },
  }).addTo(map);
  legend();
  document.querySelectorAll(".mode-btn").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(x => x.classList.toggle("active", x === b));
    mode = b.dataset.mode; restyle();
  }));
  document.getElementById("go-canarias").addEventListener("click", () => map.flyTo([28.3, -15.8], 8));
}

// ---------- panel ----------
function intro() {
  selected = null; restyle();
  const withG = MUNIS.filter(m => m.g.some(f => f.k === "dem"));
  const cur = MUNIS.filter(m => m.cu);
  const multi = MUNIS.filter(m => m.g.filter(f => f.k === "dem" && (!f.l.length || f.l.includes("es"))).length >= 3);
  const pick = cur.slice().sort((a, b) => b.ns - a.ns || a.n.localeCompare(b.n, "es")).slice(0, 40);
  document.getElementById("panel-body").innerHTML = `
    <div class="intro">
      <h2>¿Cómo se llama la gente de cada pueblo?</h2>
      <p>Todos los gentilicios de los municipios de España que dicen las fuentes, con sus versiones, sus apodos y, poco a poco, la etimología y la historia del nombre. <b>Cada dato lleva su fuente</b>: pulsa un pueblo en el mapa o búscalo.</p>
      <div class="kpis">
        <div class="kpi"><b>${fmt(withG.length)}</b><span>municipios con gentilicio (${Math.round(100 * withG.length / MUNIS.length)} %)</span></div>
        <div class="kpi"><b>${fmt(cur.length)}</b><span>gentilicios que no se parecen al nombre</span></div>
        <div class="kpi"><b>${fmt(multi.length)}</b><span>pueblos con 3 o más gentilicios</span></div>
        <div class="kpi"><b>${fmt(MUNIS.length - withG.length)}</b><span>sin documentar todavía</span></div>
      </div>
      <div class="h3">Curiosos con más fuentes</div>
      <ul class="curlist">${pick.map(m => `<li data-id="${m.id}"><span class="cn">${esc(m.n)}</span>
        <span class="cg">${esc(m.g.filter(f => f.cu).map(f => f.m).slice(0, 2).join(", "))}</span><span class="cp">${esc(m.p)}</span></li>`).join("")}</ul>
    </div>`;
  document.querySelectorAll(".curlist li").forEach(li => li.addEventListener("click", () => select(li.dataset.id, true)));
}

async function loadClaims() {
  if (CLAIMS) return;
  CLAIMS = await fetch(`gentilicios/data/claims.json?v=${DATA_V}`).then(r => r.json());
  CLAIMS_BY = new Map();
  for (const c of CLAIMS) {
    if (!CLAIMS_BY.has(c.e)) CLAIMS_BY.set(c.e, []);
    CLAIMS_BY.get(c.e).push(c);
  }
}

function claimHTML(c) {
  let loc = "";
  try { const o = JSON.parse(c.lc || "{}"); loc = Object.entries(o).filter(([k]) => k !== "revid").map(([k, v]) => `${k} ${v}`).join(" · "); } catch (e) {}
  let cites = "";
  try {
    const ci = JSON.parse(c.ci || "[]");
    if (ci.length) cites = "cita: " + ci.map(x => typeof x === "string" ? x : Object.entries(x).map(([k, v]) => `${k}=${v}`).join(" ")).join("; ");
  } catch (e) {}
  let notes = "";
  try { const pn = JSON.parse(c.pn || "[]"); if (pn.length) notes = pn.map(x => typeof x === "string" ? x : JSON.stringify(x)).join("; "); } catch (e) {}
  const kind = c.hk ? `<span class="badge kind">${esc(KIND_LABEL[c.hk] || c.hk)}</span> ` : "";
  return `<div class="claim">
    <div class="src">${kind}<a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(srcName(c.s))}</a>${c.l ? ` <span class="badge lang">${esc(c.l)}</span>` : ""}</div>
    <blockquote>${esc(c.q)}</blockquote>
    <div class="meta">${[loc, "consultado " + c.r, c.lv !== "downloaded" ? c.lv : "", MATCH_LABEL[c.mr] || c.mr, cites, notes].filter(Boolean).map(esc).join(" · ")}</div>
  </div>`;
}

async function select(id, fly) {
  const m = BY_ID.get(id);
  if (!m) return;
  selected = id; restyle();
  history.replaceState(null, "", "#" + id);
  if (fly && layersById.get(id)) {
    // a hidden page (background tab) cannot animate; flying there leaves the map at NaN
    const b = layersById.get(id).getBounds();
    try { document.hidden ? map.fitBounds(b, { maxZoom: 11 }) : map.flyToBounds(b, { maxZoom: 11, duration: .6 }); }
    catch (e) { map.invalidateSize(); map.fitBounds(b, { maxZoom: 11 }); }
  }
  const body = document.getElementById("panel-body");
  body.innerHTML = `<div class="ficha"><button class="back">← todos</button><h2>${esc(m.n)}</h2><div class="where">${esc(m.p)} · ${esc(m.c)}</div><p class="empty">cargando fuentes…</p></div>`;
  await loadClaims();
  if (selected !== id) return;
  const cl = CLAIMS_BY.get(id) || [];
  const byForm = new Map();
  for (const c of cl) if (["demonym", "demonym_nickname", "demonym_dictionary"].includes(c.fd)) {
    const k = (c.fd === "demonym_nickname" ? "nick|" : "dem|") + c.v;
    if (!byForm.has(k)) byForm.set(k, []);
    byForm.get(k).push(c);
  }
  const formBlock = f => {
    const key = (f.k === "nick" ? "nick|" : "dem|") + f.m;
    let cs = byForm.get(key) || [];
    if (f.f) cs = cs.concat(byForm.get((f.k === "nick" ? "nick|" : "dem|") + f.f) || []);
    return `<details class="form"><summary>
      <span class="fm">${esc(f.m)}</span>${f.f && f.f !== f.m ? `<span class="ff">${esc(f.f)}</span>` : ""}
      ${f.l.map(l => `<span class="badge lang">${esc(LANG_LABEL[l] || l)}</span>`).join("")}
      ${f.cu ? `<span class="badge cur" title="Calculado: no comparte comienzo ni sílabas con ningún nombre del municipio">curioso</span>` : ""}
      <span class="badge nsrc" title="Fuentes distintas">${f.n} ${f.n === 1 ? "fuente" : "fuentes"}</span>
    </summary>${cs.map(claimHTML).join("")}</details>`;
  };
  const dems = m.g.filter(f => f.k === "dem"), nicks = m.g.filter(f => f.k === "nick");
  const other = fds => cl.filter(c => fds.includes(c.fd));
  const ety = other(["name_etymology", "name_origin_legend", "demonym_etymology"]);
  const hist = other(["name_historical_form", "historical_description", "demonym_first_attestation"]);
  const grouped = list => {
    const g = new Map();
    for (const c of list) { if (!g.has(c.fd)) g.set(c.fd, []); g.get(c.fd).push(c); }
    return [...g].map(([fd, cs]) => `<div class="h3" style="margin-top:10px">${esc(FIELD_LABEL[fd] || fd)}</div>${cs.map(c => `<div class="form" style="padding:0">${claimHTML(c)}</div>`).join("")}`).join("");
  };
  body.innerHTML = `<div class="ficha">
    <button class="back">← todos</button>
    <h2>${esc(m.n)}</h2>
    <div class="where">${esc(m.p)} · ${esc(m.c)}</div>
    <div class="ids"><span>INE ${esc(m.id.slice(4))}</span>
      ${m.q ? `<a href="https://www.wikidata.org/wiki/${esc(m.q)}" target="_blank" rel="noopener">Wikidata</a>` : ""}
      ${m.w ? `<a href="https://es.wikipedia.org/wiki/${encodeURIComponent(m.w.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia</a>` : ""}
    </div>
    <div class="h3">Gentilicios</div>
    ${dems.length ? dems.map(formBlock).join("") : `<p class="empty">Ninguna fuente consultada da todavía un gentilicio.</p>`}
    ${nicks.length ? `<div class="h3">Apodos</div><p class="note">Lo dice la fuente: coloquial, malnom, apodo.</p>${nicks.map(formBlock).join("")}` : ""}
    <div class="h3">Etimología del nombre</div>
    ${ety.length ? grouped(ety) : `<p class="empty">Sin etimología recogida todavía.</p>`}
    <div class="h3">Historia</div>
    ${hist.length ? grouped(hist) : `<p class="empty">Sin datos históricos todavía.</p>`}
    <p class="note">Pulsa una forma para ver qué dice cada fuente, con la cita literal y el enlace.</p>
  </div>`;
  body.querySelectorAll(".back").forEach(b => b.addEventListener("click", () => { history.replaceState(null, "", location.pathname); intro(); }));
  document.getElementById("panel").scrollTop = 0;
  if (dems.length === 1) body.querySelector("details.form").open = true;
}

function fromHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (BY_ID.has(id)) select(id, true);
}
window.addEventListener("hashchange", fromHash);
document.querySelector(".brand").addEventListener("click", e => {
  e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload();
});

// ---------- search ----------
function initSearch() {
  const input = document.getElementById("filter"), box = document.getElementById("suggest");
  const index = MUNIS.map(m => ({ m, name: fold(m.n), prov: fold(m.p), forms: m.g.map(f => fold(f.m) + " " + fold(f.f)).join(" ") }));
  let hits = [], on = 0;
  const hl = (text, q) => {
    const i = fold(text).indexOf(q);
    return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  };
  const render = () => {
    const q = fold(input.value.trim());
    if (q.length < 2) { box.hidden = true; if (!document.getElementById("table-view").hidden) renderTable(); return; }
    const score = x => x.name === q ? 0 : x.name.startsWith(q) ? 1 : x.forms.split(" ").some(w => w.startsWith(q)) ? 2 : x.name.includes(q) ? 3 : x.forms.includes(q) ? 4 : x.prov.startsWith(q) ? 5 : 9;
    hits = index.map(x => [score(x), x]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || a[1].m.n.localeCompare(b[1].m.n, "es")).slice(0, 30).map(([, x]) => x.m);
    on = 0;
    box.innerHTML = hits.length ? hits.map((m, i) => {
      const f = m.g.find(f => fold(f.m).includes(q) || fold(f.f).includes(q));
      return `<div class="sug${i === 0 ? " on" : ""}" data-id="${m.id}"><div class="sn">${hl(m.n, q)}</div>
        <div class="ss">${f ? `<i>${hl(f.m, q)}</i> · ` : (mainForms(m) ? `<i>${esc(mainForms(m))}</i> · ` : "")}${esc(m.p)}</div></div>`;
    }).join("") : `<div class="sug ss">Nada con «${esc(input.value)}»</div>`;
    box.hidden = false;
    box.querySelectorAll(".sug[data-id]").forEach(el => el.addEventListener("mousedown", e => { e.preventDefault(); choose(el.dataset.id); }));
    if (!document.getElementById("table-view").hidden) renderTable();
  };
  const choose = id => { box.hidden = true; input.blur(); showView("map"); select(id, true); };
  input.addEventListener("input", render);
  input.addEventListener("focus", render);
  input.addEventListener("blur", () => setTimeout(() => box.hidden = true, 150));
  input.addEventListener("keydown", e => {
    const els = [...box.querySelectorAll(".sug[data-id]")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); on = (on + (e.key === "ArrowDown" ? 1 : els.length - 1)) % Math.max(els.length, 1);
      els.forEach((el, i) => el.classList.toggle("on", i === on));
    } else if (e.key === "Enter" && els[on]) { choose(els[on].dataset.id); }
    else if (e.key === "Escape") { input.value = ""; box.hidden = true; if (!document.getElementById("table-view").hidden) renderTable(); }
  });
}

// ---------- table ----------
let sortKey = "n", sortDir = 1, shown = 300;
function showView(v) {
  document.getElementById("v-map").classList.toggle("active", v === "map");
  document.getElementById("v-table").classList.toggle("active", v === "table");
  document.getElementById("table-view").hidden = v !== "table";
  document.getElementById("colour-modes").style.visibility = v === "map" ? "" : "hidden";
  if (v === "table") { shown = 300; renderTable(); } else map.invalidateSize();
}
function initTable() {
  document.getElementById("v-map").addEventListener("click", () => showView("map"));
  document.getElementById("v-table").addEventListener("click", () => showView("table"));
  const sel = document.getElementById("t-ccaa");
  [...new Set(MUNIS.map(m => m.c))].sort((a, b) => a.localeCompare(b, "es")).forEach(c => sel.insertAdjacentHTML("beforeend", `<option>${esc(c)}</option>`));
  ["t-curious", "t-empty", "t-ccaa"].forEach(id => document.getElementById(id).addEventListener("change", () => { shown = 300; renderTable(); }));
  document.querySelectorAll("#table th").forEach(th => th.addEventListener("click", () => {
    sortDir = sortKey === th.dataset.k ? -sortDir : (["ns", "ety", "cu"].includes(th.dataset.k) ? -1 : 1);
    sortKey = th.dataset.k; renderTable();
  }));
  document.getElementById("t-more").addEventListener("click", () => { shown += 500; renderTable(); });
}
function renderTable() {
  const q = fold(document.getElementById("filter").value.trim());
  const onlyCur = document.getElementById("t-curious").checked, onlyEmpty = document.getElementById("t-empty").checked;
  const ccaa = document.getElementById("t-ccaa").value;
  let rows = MUNIS.filter(m => (!onlyCur || m.cu) && (!onlyEmpty || !m.g.some(f => f.k === "dem")) && (!ccaa || m.c === ccaa) &&
    (q.length < 2 || fold(m.n).includes(q) || fold(m.p).includes(q) || m.g.some(f => fold(f.m).includes(q))));
  const val = m => ({ n: m.n, p: m.p, c: m.c, g: mainForms(m, 9), nick: m.g.filter(f => f.k === "nick").length, ns: m.ns, cu: m.cu ? 1 : 0, ety: m.ety }[sortKey]);
  rows.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === "number" ? x - y : String(x).localeCompare(String(y), "es")) * sortDir || a.n.localeCompare(b.n, "es"); });
  document.getElementById("t-count").textContent = `${fmt(rows.length)} municipios`;
  document.querySelectorAll("#table th").forEach(th => th.classList.toggle("sorted", th.dataset.k === sortKey));
  document.querySelector("#table tbody").innerHTML = rows.slice(0, shown).map(m => {
    const dem = m.g.filter(f => f.k === "dem");
    return `<tr data-id="${m.id}"><td>${esc(m.n)}</td><td>${esc(m.p)}</td><td>${esc(m.c)}</td>
      <td class="g">${dem.map(f => `<span class="${f.cu ? "cu" : ""}">${esc(f.m)}</span>`).join(", ") || '<span class="muted">·</span>'}</td>
      <td class="g">${esc(m.g.filter(f => f.k === "nick").map(f => f.m).join(", "))}</td>
      <td class="num">${m.ns || ""}</td><td class="cu">${m.cu ? "✦" : ""}</td><td class="num">${m.ety || ""}</td></tr>`;
  }).join("");
  document.querySelectorAll("#table tbody tr").forEach(tr => tr.addEventListener("click", () => { showView("map"); select(tr.dataset.id, true); }));
  document.getElementById("t-more").hidden = rows.length <= shown;
}
