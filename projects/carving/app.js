/* Interactive Atlas of Wood Carving — app.
 *
 * Three views over one filtered set: a clustered Leaflet map with a live side
 * list (the Atlas of Painting pattern), a photo gallery (the Batalla de Flores
 * floats pattern), and a sortable table. All three read the SAME `visible()`
 * result, so a filter changes every view at once and there is only one place
 * where "what is currently shown" is decided.
 *
 * IMAGES ARE LINKED, NEVER COPIED. Every `img` src points at the Ministère de
 * la Culture CDN. That is a licensing requirement, not an optimisation: the
 * Palissy metadata is Licence Etalab but the photographs are not ours to
 * redistribute. Do not add a download step, and keep the credit line visible in
 * the record sheet.
 *
 * Version + cache-busting: bump DATA_V and BUILD_AT here AND the ?v= in
 * carving.html on every change, or browsers will serve stale files.
 */

const DATA_V = "0.3.2";
const BUILD_AT = "2026-08-23 21:40";

// Gallery/table batch size. Kept at 60 rather than 120 because every card is a
// remote image: browsers open ~6 connections per host, so a 120-card batch
// queues about six seconds of thumbnails before the grid looks finished, while
// 60 fills in roughly half that. The images themselves are quick (200-700 ms).
const PAGE = 60;
const MAX_PINS = 4000;     // safety valve; clustering handles the rest

const state = {
  items: [],
  meta: {},
  view: "map",
  q: "",
  kinds: new Set(),        // empty = no type filter
  finishes: new Set(),
  forms: new Set(),        // relief depth / in the round
  namedOnly: false,
  sources: new Set(),      // empty = every collection
  yearMin: null, yearMax: null, yearWideOpen: true,
  bounds: null,
  shown: PAGE,
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Palissy dates a piece by century far more often than by year, so a range is
   the honest representation. Render it the way an art historian would. */
const roman = n => ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"][n] || n;
function dateLabel(it) {
  const [a, b] = it.y || [];
  if (!a) return "undated";
  const ca = Math.ceil(a / 100), cb = Math.ceil(b / 100);
  return ca === cb ? `${roman(ca)}th c.` : `${roman(ca)}–${roman(cb)}th c.`;
}
/* Palissy records are addressed by notice reference; museum records carry
   their own absolute URL. Always send the visitor to the original record. */
const recordURL = it => it.u || (state.meta.notice_base + it.i);

const SOURCE_LABEL = {
  palissy: "French churches", vam: "V&A", met: "The Met", cleveland: "Cleveland",
  wikidata: "Wikidata / Commons",
};

/* ── filtering — the single source of truth for all three views ── */
function passes(it) {
  if (state.sources.size && !state.sources.has(it.src)) return false;
  if (state.kinds.size && !state.kinds.has(it.k)) return false;
  if (state.finishes.size && !(it.f || []).some(f => state.finishes.has(f))) return false;
  if (state.forms.size && !state.forms.has(it.fm)) return false;
  if (state.namedOnly && !it.a) return false;
  if (state.yearMin != null && it.y[0] && !state.yearWideOpen) {
    // A piece counts as inside the window if its range overlaps it at all;
    // undated pieces always pass rather than silently disappearing.
    if (it.y[1] < state.yearMin || it.y[0] > state.yearMax) return false;
  }
  if (state.q) {
    const hay = `${it.t} ${it.p} ${it.m} ${it.a || ""} ${it.ic || ""}`.toLowerCase();
    if (!hay.includes(state.q)) return false;
  }
  return true;
}
const visible = () => state.items.filter(passes);

/* ── map ── */
let map, cluster, byPlace = new Map();

function initMap() {
  // Opened on France at first, which quietly hid the whole museum leg: every
  // Grinling Gibbons in the atlas is in London, Cleveland or New York, so the
  // default view made them look absent. The initial view now fits whatever is
  // loaded (see fitToVisible after the markers are built).
  map = L.map("map", { zoomControl: true, worldCopyJump: true }).setView([46.7, 2.4], 5);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18, attribution: "© OpenStreetMap contributors",
  }).addTo(map);
  cluster = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: 46,
    iconCreateFunction(c) {
      const n = c.getAllChildMarkers().reduce((s, m) => s + (m.options.count || 1), 0);
      const size = n > 999 ? 52 : n > 99 ? 44 : 38;
      return L.divIcon({
        html: `<div><span>${n > 999 ? (n / 1000).toFixed(1) + "k" : n}</span></div>`,
        className: "marker-cluster", iconSize: [size, size],
      });
    },
  });
  map.addLayer(cluster);
  map.on("moveend", renderPanel);

  // Leaflet measures the container when the map is built. At that moment the
  // flex layout has not settled, so it latches onto the wrong height and paints
  // tiles into a small box. Re-measure after the first frame, and on resize.
  requestAnimationFrame(() => map.invalidateSize());
  setTimeout(() => map.invalidateSize(), 250);
  window.addEventListener("resize", () => map.invalidateSize());
}

/* One pin per building, not per carving: a church with nine statues is one
   point with a counter, the same rule the Atlas of Painting uses for museums. */
function buildMarkers() {
  cluster.clearLayers();
  byPlace = new Map();
  const vis = visible();
  for (const it of vis) {
    const key = it.g[0].toFixed(5) + "," + it.g[1].toFixed(5) + "|" + it.p;
    let p = byPlace.get(key);
    if (!p) { p = { g: it.g, place: it.p, commune: it.m, items: [] }; byPlace.set(key, p); }
    p.items.push(it);
  }
  const places = [...byPlace.values()].slice(0, MAX_PINS);
  for (const p of places) {
    const n = p.items.length;
    const size = n > 9 ? 30 : n > 1 ? 26 : 22;
    const m = L.marker(p.g, {
      count: n,
      icon: L.divIcon({
        className: "", iconSize: [size, size],
        html: `<div class="pin ${p.items[0].gp === "museum" ? "museum" : ""}" style="width:${size}px;height:${size}px">${n > 1 ? n : ""}</div>`,
      }),
    });
    m.bindPopup(() => popupHTML(p), { maxWidth: 300 });
    p.marker = m;
    cluster.addLayer(m);
  }
  renderPanel();
  return vis;
}

/* Frame the bulk of what is selected, not its extremes.
   Palissy includes the French overseas départements — Réunion at longitude 55,
   Martinique at -61 — so a plain fitBounds over every point opened the atlas
   zoomed out across Africa and the Atlantic. Percentile bounds keep France,
   Britain and the American museums in frame while leaving the overseas pieces
   on the map for anyone who pans to them. Same reasoning as the time slider.
   Below a few hundred points percentiles stop meaning anything, so a small
   selection is framed exactly. */
function fitToVisible() {
  const vis = visible();
  if (!vis.length) return;
  let pts = vis.map(i => i.g);
  if (vis.length > 300) {
    const lats = pts.map(p => p[0]).sort((a, b) => a - b);
    const lons = pts.map(p => p[1]).sort((a, b) => a - b);
    const q = (arr, f) => arr[Math.floor(f * (arr.length - 1))];
    pts = [[q(lats, 0.01), q(lons, 0.01)], [q(lats, 0.99), q(lons, 0.99)]];
  }
  // animate:false is load-bearing, not a preference. The invalidateSize() calls
  // that fix the container measurement fire at the next frame and at 250 ms —
  // right on top of an animated fitBounds, which then gets cancelled and the map
  // snaps back to its initial view. That looked exactly like "the fit is being
  // ignored": the American museums vanished off-screen every time.
  map.fitBounds(L.latLngBounds(pts).pad(0.08), { maxZoom: 12, animate: false });
}

function popupHTML(p) {
  const rows = p.items.slice(0, 6).map(it => `
    <li class="item" data-id="${it.i}">
      <img class="th" loading="lazy" src="${esc(it.img)}" alt="">
      <span class="it"><b>${esc(it.t)}</b><span>${esc(dateLabel(it))}</span></span>
    </li>`).join("");
  const more = p.items.length > 6 ? `<div class="vsub">+${p.items.length - 6} more</div>` : "";
  return `<div class="venue">${esc(p.place || "—")}<span class="vsub">${esc(p.commune)}</span></div>
          <ul style="list-style:none;margin:6px 0 0;padding:0">${rows}</ul>${more}`;
}

/* Side list: only what is inside the current viewport, grouped by building. */
function renderPanel() {
  if (state.view !== "map" || !map) return;
  const b = map.getBounds();
  const groups = [...byPlace.values()]
    .filter(p => b.contains(L.latLng(p.g)))
    .sort((x, y) => y.items.length - x.items.length)
    .slice(0, 160);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  $("#panel-head").textContent =
    total ? `${total.toLocaleString("en")} carvings in view` : "Carvings in view";
  $("#worklist").innerHTML = groups.length ? groups.map(p => `
    <li class="venue">${esc(p.place || "—")}<span class="vsub">${esc(p.commune)} · ${p.items.length}</span></li>
    ${p.items.map(it => `
      <li class="item" data-id="${it.i}">
        <img class="th" loading="lazy" src="${esc(it.img)}" alt="">
        <span class="it"><b>${esc(it.t)}</b><span>${esc(dateLabel(it))}${it.a ? " · " + esc(it.a) : ""}</span></span>
      </li>`).join("")}`).join("")
    : `<li class="empty">Nothing here — pan the map or relax the filters.</li>`;
}

/* ── gallery ── */
/* NB: gallery images are deliberately NOT loading="lazy". The cards are
   injected into a scroll container after load, and in that situation the lazy
   heuristic can decide nothing is ever in view and fetch none of them — which is
   exactly what happened. Pagination already bounds the cost to PAGE images per
   batch, so eager loading is both simpler and reliable. */
function renderGallery() {
  const vis = visible();
  const slice = vis.slice(0, state.shown);
  $("#grid").innerHTML = slice.length ? slice.map(it => `
    <button class="card" data-id="${it.i}" type="button">
      <img src="${esc(it.img)}" alt="${esc(it.t)}">
      <span class="cm">
        <b>${esc(it.t)}</b>
        <span class="cy">${esc(dateLabel(it))}</span>
        <span>${esc(it.p || "—")}</span>
        <span>${esc(it.m)}</span>
      </span>
    </button>`).join("")
    : `<p class="empty">No carving matches these filters.</p>`;
  $("#more").hidden = slice.length >= vis.length;
  $("#more").textContent = `Show more (${(vis.length - slice.length).toLocaleString("en")} left)`;
}

/* ── table ── */
const COLS = [
  { k: "img", label: "", sort: null },
  { k: "t", label: "Carving" },
  { k: "k", label: "Type" },
  { k: "y", label: "Date", cls: "num", val: it => it.y[0] || 9999 },
  { k: "p", label: "Where", cls: "hide-s" },
  { k: "m", label: "Commune" },
  { k: "a", label: "Carver", cls: "hide-s" },
  { k: "s", label: "Score", cls: "num" },
];
let sortKey = "s", sortDir = -1;

function renderTable() {
  const vis = visible().slice().sort((a, b) => {
    const col = COLS.find(c => c.k === sortKey);
    const va = col.val ? col.val(a) : (a[sortKey] ?? "");
    const vb = col.val ? col.val(b) : (b[sortKey] ?? "");
    return (va > vb ? 1 : va < vb ? -1 : 0) * sortDir;
  });
  const slice = vis.slice(0, state.shown);
  $("#works-table thead").innerHTML = "<tr>" + COLS.map(c =>
    `<th data-k="${c.k}" class="${c.cls || ""}">${c.label}` +
    (c.k === sortKey ? ` <span class="ar">${sortDir > 0 ? "▲" : "▼"}</span>` : "") + "</th>").join("") + "</tr>";
  $("#works-table tbody").innerHTML = slice.map(it => `
    <tr data-id="${it.i}">
      <td><img class="tth" loading="lazy" src="${esc(it.img)}" alt=""></td>
      <td>${esc(it.t)}</td>
      <td>${esc(it.k)}</td>
      <td class="num">${esc(dateLabel(it))}</td>
      <td class="hide-s">${esc(it.p || "—")}</td>
      <td>${esc(it.m)}</td>
      <td class="hide-s">${esc(it.a || "—")}</td>
      <td class="num">${it.s}</td>
    </tr>`).join("");
  $("#more-table").hidden = slice.length >= vis.length;
  $("#more-table").textContent = `Show more (${(vis.length - slice.length).toLocaleString("en")} left)`;
}

/* ── record sheet ── */
function openSheet(id) {
  const it = state.items.find(x => x.i === id);
  if (!it) return;
  const fact = (label, v) => v ? `<div class="fact"><dt>${label}</dt><dd>${esc(v)}</dd></div>` : "";
  $("#sheet-body").innerHTML = `
    <div class="sheet-in">
      <img class="big" src="${esc(it.img)}" alt="${esc(it.t)}" data-cap="${esc(it.t + " — " + (it.p || ""))}">
      <div class="sheet-txt">
        <h2>${esc(it.t)}</h2>
        <p class="sub">${esc(it.p || "")}${it.m ? " · " + esc(it.m) : ""}</p>
        ${(it.f || []).length ? `<div class="tags">${it.f.map(f => `<span class="tag">${esc(f)}</span>`).join("")}</div>` : ""}
        <dl class="facts">
          ${fact("Type", it.k)}
          ${fact("Form", it.fm)}
          ${fact("Date", dateLabel(it))}
          ${fact("Carver", it.a)}
          ${fact("Where", SOURCE_LABEL[it.src] || it.src)}
          ${fact("Département", it.d)}
          ${fact("Placed", it.e)}
          ${fact("Photographs", it.n)}
        </dl>
        ${it.ic ? `<p class="sub">Iconography: ${esc(it.ic)}</p>` : ""}
        <a class="gobtn" href="${recordURL(it)}" target="_blank" rel="noopener">Full record ↗</a>
        <p class="credit">Photograph ${esc(it.cr || state.meta.credit)}. Linked from the source, not redistributed.<br>
        Collection: ${esc(SOURCE_LABEL[it.src] || it.src)}${it.r === "cc0" ? " · image released CC0" : ""}</p>
      </div>
    </div>`;
  $("#sheet").hidden = false;
}

/* ── filters UI ── */
function buildChips() {
  const bySrc = {};
  for (const it of state.items) bySrc[it.src] = (bySrc[it.src] || 0) + 1;
  $("#sources").innerHTML = Object.entries(bySrc).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<button class="chip src" data-src="${esc(k)}" type="button">${esc(SOURCE_LABEL[k] || k)} <span class="n">${n.toLocaleString("en")}</span></button>`).join("");

  const count = (key, val) => state.items.filter(it =>
    key === "k" ? it.k === val : (it.f || []).includes(val)).length;
  const kinds = [...new Set(state.items.map(i => i.k))]
    .sort((a, b) => count("k", b) - count("k", a));
  $("#kinds").innerHTML = kinds.map(k =>
    `<button class="chip" data-kind="${esc(k)}" type="button">${esc(k)} <span class="n">${count("k", k)}</span></button>`).join("");
  const forms = [...new Set(state.items.map(i => i.fm).filter(Boolean))]
    .sort((a, b) => state.items.filter(i => i.fm === b).length
                  - state.items.filter(i => i.fm === a).length);
  $("#forms").innerHTML = forms.map(f =>
    `<button class="chip" data-form="${esc(f)}" type="button">${esc(f)} <span class="n">${state.items.filter(i => i.fm === f).length.toLocaleString("en")}</span></button>`).join("");

  const fins = [...new Set(state.items.flatMap(i => i.f || []))]
    .sort((a, b) => count("f", b) - count("f", a));
  $("#finishes").innerHTML = fins.map(f =>
    `<button class="chip" data-fin="${esc(f)}" type="button">${esc(f)} <span class="n">${count("f", f)}</span></button>`).join("");
}

function buildTimeline() {
  // Percentile bounds, not min/max. Three genuine outliers (a 5th-century
  // Chinese cross, two pre-Christian votive figures) would otherwise stretch
  // the axis from -500 to 2100 and squeeze the 15,000 pieces that sit between
  // 1400 and 1800 into a thumbnail. Those records are real and stay in the
  // data; when a handle sits at its end stop the filter opens up (see passes()),
  // so nothing outside the visible range is silently hidden.
  const ys = state.items.map(i => i.y[0]).filter(Boolean).sort((a, b) => a - b);
  const pct = q => ys[Math.floor(q * (ys.length - 1))];
  const lo = Math.floor(pct(0.005) / 100) * 100;
  const hi = Math.ceil(pct(0.995) / 100) * 100;
  const mn = $("#tl-min"), mx = $("#tl-max");
  for (const el of [mn, mx]) { el.min = lo; el.max = hi; el.step = 25; }
  mn.value = lo; mx.value = hi;
  state.yearMin = lo; state.yearMax = hi;
  const sync = () => {
    let a = +mn.value, b = +mx.value;
    if (a > b) [a, b] = [b, a];
    state.yearMin = a; state.yearMax = b;
    // Both handles parked at the ends means "no date filter at all", which is
    // what lets the out-of-range outliers stay visible by default.
    state.yearWideOpen = (a <= lo && b >= hi);
    const l = (a - lo) / (hi - lo) * 100, r = (b - lo) / (hi - lo) * 100;
    $("#tl-fill").style.left = l + "%";
    $("#tl-fill").style.width = (r - l) + "%";
    $("#tl-label").textContent = state.yearWideOpen ? "all dates" : `${a}–${b}`;
    refresh();
  };
  mn.oninput = mx.oninput = sync;
  sync();
}

/* ── one refresh for every view ── */
function refresh() {
  const n = visible().length;
  $("#result-count").textContent =
    `${n.toLocaleString("en")} of ${state.items.length.toLocaleString("en")}`;
  if (state.view === "map") buildMarkers();
  else if (state.view === "gallery") renderGallery();
  else renderTable();
}

function setView(v) {
  state.view = v; state.shown = PAGE;
  $$(".view-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
  $("#main").style.display = v === "map" ? "flex" : "none";
  $("#gallery").hidden = v !== "gallery";
  $("#table").hidden = v !== "table";
  if (v === "map") requestAnimationFrame(() => map.invalidateSize());
  refresh();
}

/* ── wiring ── */
function wire() {
  $$(".view-btn").forEach(b => b.onclick = () => setView(b.dataset.view));

  let t;
  $("#search").oninput = e => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); state.shown = PAGE; refresh(); }, 180);
  };

  $("#sources").onclick = e => {
    const b = e.target.closest("[data-src]"); if (!b) return;
    const k = b.dataset.src;
    state.sources.has(k) ? state.sources.delete(k) : state.sources.add(k);
    b.classList.toggle("on"); state.shown = PAGE; refresh();
    // Jump the map to whatever is now selected, so picking "V&A" does not leave
    // the visitor staring at an empty France.
    if (state.view === "map") fitToVisible();
  };

  $("#kinds").onclick = e => {
    const b = e.target.closest("[data-kind]"); if (!b) return;
    const k = b.dataset.kind;
    state.kinds.has(k) ? state.kinds.delete(k) : state.kinds.add(k);
    b.classList.toggle("on"); state.shown = PAGE; refresh();
  };
  $("#finishes").onclick = e => {
    const b = e.target.closest("[data-fin]"); if (!b) return;
    const f = b.dataset.fin;
    state.finishes.has(f) ? state.finishes.delete(f) : state.finishes.add(f);
    b.classList.toggle("on"); state.shown = PAGE; refresh();
  };
  $("#forms").onclick = e => {
    const b = e.target.closest("[data-form]"); if (!b) return;
    const f = b.dataset.form;
    state.forms.has(f) ? state.forms.delete(f) : state.forms.add(f);
    b.classList.toggle("on"); state.shown = PAGE; refresh();
  };

  $("#named-only").onchange = e => { state.namedOnly = e.target.checked; state.shown = PAGE; refresh(); };

  $("#clear-filters").onclick = () => {
    state.kinds.clear(); state.finishes.clear(); state.sources.clear();
    state.forms.clear(); state.namedOnly = false;
    state.q = ""; state.shown = PAGE;
    $("#search").value = ""; $("#named-only").checked = false;
    $$("#kinds .chip, #finishes .chip, #sources .chip, #forms .chip").forEach(c => c.classList.remove("on"));
    $("#tl-min").value = $("#tl-min").min; $("#tl-max").value = $("#tl-max").max;
    $("#tl-min").dispatchEvent(new Event("input"));
  };

  $("#more").onclick = () => { state.shown += PAGE; renderGallery(); };
  $("#more-table").onclick = () => { state.shown += PAGE; renderTable(); };

  $("#works-table").addEventListener("click", e => {
    const th = e.target.closest("th[data-k]");
    if (th && th.dataset.k !== "img") {
      if (sortKey === th.dataset.k) sortDir *= -1; else { sortKey = th.dataset.k; sortDir = 1; }
      renderTable(); return;
    }
    const tr = e.target.closest("tr[data-id]");
    if (tr) openSheet(tr.dataset.id);
  });

  // One delegated handler covers the panel, the popups and the gallery.
  document.addEventListener("click", e => {
    const card = e.target.closest(".card[data-id], li.item[data-id]");
    if (card) { openSheet(card.dataset.id); return; }
    const big = e.target.closest("img.big");
    if (big) {
      $("#lb-img").src = big.src;
      $("#lb-cap").textContent = big.dataset.cap + " — " + state.meta.credit;
      $("#lightbox").hidden = false;
    }
  });
  $("#sheet-close").onclick = () => $("#sheet").hidden = true;
  $("#lb-close").onclick = () => $("#lightbox").hidden = true;
  $("#lightbox").onclick = e => { if (e.target.id === "lightbox") $("#lightbox").hidden = true; };
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!$("#lightbox").hidden) $("#lightbox").hidden = true;
    else $("#sheet").hidden = true;
  });

  // Shared convention: the brand reloads the project to its clean default view.
  document.querySelector(".brand").addEventListener("click", e => {
    e.preventDefault();
    history.replaceState(null, "", location.pathname);
    location.reload();
  });
}

/* ── boot ── */
(async function init() {
  $("#build").textContent = `v${DATA_V} · ${BUILD_AT}`;
  const res = await fetch(`carving/data/carvings.json?v=${DATA_V}`);
  const data = await res.json();
  state.items = data.items;
  state.meta = data.meta;

  const places = new Set(state.items.map(i => i.p + "|" + i.m)).size;
  $("#stats").textContent =
    `${state.items.length.toLocaleString("en")} carvings · ${places.toLocaleString("en")} places`;

  initMap();
  buildChips();
  buildTimeline();   // calls refresh() through sync()
  wire();
  fitToVisible();    // frame the whole corpus, not just France
})();
