// The prose of every tab lives in web/atlas_electoral/textos/<page>.md, plain Markdown that Víctor edits by hand
// (syntax in textos/README.md). This module reads those files and turns them into the same HTML the pages had.
// The code keeps only what is computed: figures ({name}), charts and tables ([[name]]) and conditions (::: si name).
import { DATA_V } from "./data.js?v=0.2.154";
import { lang, t as tr, EN_TEXTOS } from "./i18n.js?v=0.2.154";

const BASE = new URL("../textos/", import.meta.url).href;
const cache = new Map();
const ORIGIN = new Map();   // text of a part -> {page, start line in the file}
const SRC = decodeURIComponent(new URL(BASE).pathname);   // the text folder, from the server root
export const INDICE = "<!--indice-->";

// On localhost the text files are never cached, and a saved edit re-renders the page by itself (kept scroll position):
// every 1.5 s the files already read are asked for their Last-Modified date. The published site is not affected.
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
// The legal blackout on polls (LOREG art. 69.7; docs/protocolo_29N.md, section 8): from 24 November 00:00 to 29 November 20:00,
// Madrid time (UTC+1), checked in the reader's browser so it needs no deploy. Every text can use "::: si veda". ?veda=1 or
// ?veda=0 in the address forces it, to test it before the 24th.
export const VEDA = (() => {
  const q = new URLSearchParams(location.search).get("veda");
  if (q === "1" || q === "0") {
    // read once and taken out of the address, so a test does not stick to every page visited or link copied afterwards
    const u = new URL(location.href); u.searchParams.delete("veda"); history.replaceState(null, "", u);
    return q === "1";
  }
  const n = Date.now();
  return n >= Date.UTC(2026, 10, 23, 23) && n < Date.UTC(2026, 10, 29, 19);
})();
const stamps = new Map();
let watching = false;
function watch() {
  if (watching) return;
  watching = true;
  window.__liveTexts = true;   // the family server's reload script (chassis/servir.py) leaves the .md files to this one
  setInterval(async () => {
    for (const [page, seen] of stamps) {   // page: the file's path under textos/ without .md ("portada", "en/portada")
      const r = await fetch(`${BASE}${page}.md`, { method: "HEAD", cache: "no-store" }).catch(() => null);
      const lm = r?.headers.get("Last-Modified");
      if (!lm || lm === seen) continue;
      stamps.set(page, lm);
      cache.delete(page);
      const y = scrollY;
      dispatchEvent(new HashChangeEvent("hashchange"));
      setTimeout(() => scrollTo(0, y), 900);
      return;
    }
  }, 1500);
}

/** All the parts of a page file: {principal: "...", other: "..."} (a line "=== other ===" starts a part).
 *  In English (a view that exists in English, i18n.js) the file is textos/en/<page>.md, with the same parts and names. */
export function textos(name) {
  const page = lang() === "en" && EN_TEXTOS.has(name) ? `en/${name}` : name;
  if (!cache.has(page)) {
    cache.set(page, fetch(`${BASE}${page}.md?v=${DATA_V}`, LOCAL ? { cache: "no-store" } : {}).then((r) => {
      if (!r.ok) throw new Error(`textos/${page}.md: ${r.status}`);
      if (LOCAL) { stamps.set(page, r.headers.get("Last-Modified")); watch(); }
      return r.text();
    }).then((src) => {
      const parts = {}, start = { principal: 1 };
      let name = "principal";
      // comments are blanked, not removed, so line numbers stay those of the file (for Alt+click)
      src.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, "")).split(/\r?\n/).forEach((line, i) => {
        const m = line.match(/^===\s*(.+?)\s*===\s*$/);
        if (m) { name = m[1]; start[name] = i + 2; return; }
        (parts[name] ??= []).push(line);
      });
      return Object.fromEntries(Object.entries(parts).map(([k, v]) => {
        const text = v.join("\n");
        ORIGIN.set(text, { page, start: start[k] });
        return [k, text];
      }));
    }));
  }
  return cache.get(page);
}

const PCLASS = { sub: "sub", nota: "note", "línea": "linea", linea: "linea" };
const BOX = { tarjeta: "card", controles: "controls", mosaico: "tiles", rejilla: "grid2" };

function inline(s, vars, page) {
  return s
    .replace(/\\\{/g, "\u0000")
    .replace(/\{([\wáéíóúñü]+)\}/gi, (m, k) => {
      if (k in vars && vars[k] != null) return String(vars[k]);
      console.warn(`textos/${page}: no value for {${k}}`);
      return `<mark title="${tr("Cifra desconocida")}">{${k}}</mark>`;
    })
    .replace(/\u0000/g, "{")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<i>$2</i>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => (/^https?:/.test(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : `<a href="${u}">${t}</a>`));
}

// "{#id | Index label .class}" after a heading
function attrs(s) {
  const m = s.match(/\s*\{([^}]*)\}\s*$/);
  if (!m || !/^\s*[#.]/.test(m[1])) return { text: s, id: null, label: null, cls: [] };
  const [a, label] = m[1].split("|").map((x) => x.trim());
  return { text: s.slice(0, m.index), id: (a.match(/#([\w-]+)/) || [])[1] || null, label: label || null, cls: [...a.matchAll(/\.([\w-]+)/g)].map((x) => x[1]) };
}

/**
 * Markdown part -> {html, sec}. vars: values for {name}; slots: HTML for [[name]] (missing: an empty div with that id;
 * null or "": nothing); flags: booleans for "::: si name". sec: the index of h2 and h3 with an id, in indexHtml's format;
 * sub: the h3 with an id that come before any h2 (a block placed inside another page's section, e.g. resultados.md).
 */
export function md(src, { vars = {}, slots = {}, flags = {}, page = "?" } = {}) {
  flags = { veda: VEDA, ...flags };
  const out = [], sec = [], sub = [], stack = [];
  let para = [], pcls = null, inSection = false, pline = 0;
  // on localhost every block remembers its file and line (data-src="/elecciones_españa/.../portada.md:42"), the mark that the
  // family server (chassis/servir.py) also puts on static HTML; its Alt+double-click opens that line in the editor
  const o = LOCAL ? ORIGIN.get(src) : null;
  const at = (i) => (o ? ` data-src="${SRC}${o.page}.md:${o.start + i}"` : "");
  const live = () => stack.every((f) => f.on);
  const flush = () => {
    if (para.length && live()) out.push(`<p${pcls ? ` class="${pcls}"` : ""}${at(pline)}>${inline(para.join(" "), vars, page)}</p>`);
    para = []; pcls = null;
  };
  const close = (tag) => out.push(`</${tag}>`);
  for (const [i, raw] of src.split("\n").entries()) {
    const line = raw.trimEnd();
    const t = line.trim();
    // conditions and boxes
    let m = t.match(/^:::\s*(.*)$/);
    if (m) {
      flush();
      const arg = m[1].trim();
      if (!arg) {   // end of the innermost block
        const f = stack.pop();
        if (f && f.close && f.parentOn) out.push(f.close);
        continue;
      }
      if (/^si no$/.test(arg)) { const f = stack.at(-1); if (f) f.on = !f.cond && f.parentOn; continue; }
      const parentOn = live();
      const c = arg.match(/^si (no )?([\wáéíóúñü]+)$/i);
      if (c) { const v = !!flags[c[2]] !== !!c[1]; stack.push({ on: v && parentOn, cond: v, parentOn, close: null }); continue; }
      const id = (arg.match(/#([\w-]+)/) || [])[1];
      const words = arg.replace(/#[\w-]+/g, "").trim();
      const idA = id ? ` id="${id}"` : "";
      const pm = words.match(/^(metodología|plegable)(?:\s+(corta))?(?:\s+"([^"]+)")?\s*$/);
      if (pm) {
        const title = pm[3] || tr("Metodología");
        const short = !!pm[2];
        if (parentOn) out.push(`<details class="metodo-box"${idA}${at(i)}><summary>${title}</summary>${short ? "" : '<div class="metodo">'}`);
        stack.push({ on: parentOn, cond: true, parentOn, close: short ? "</details>" : "</div></details>" });
        continue;
      }
      const cls = words.split(/\s+/).filter(Boolean).map((w) => BOX[w] ?? w.replace(/^\./, ""));
      if (parentOn) out.push(`<div${cls.length ? ` class="${cls.join(" ")}"` : ""}${idA}${at(i)}>`);
      stack.push({ on: parentOn, cond: true, parentOn, close: "</div>" });
      continue;
    }
    if (!live()) continue;
    if (!t) { flush(); continue; }
    // slots
    m = t.match(/^\[\[([\wáéíóúñü-]+)\]\]$/i);
    if (m) {
      flush();
      if (m[1] === "índice" || m[1] === "indice") out.push(INDICE);
      else if (m[1] in slots) { if (slots[m[1]]) out.push(slots[m[1]]); }
      else out.push(`<div id="${m[1]}"></div>`);
      continue;
    }
    // headings
    m = t.match(/^(#{1,4})\s+(.*)$/);
    if (m) {
      flush();
      const n = m[1].length, a = attrs(m[2]);
      const text = inline(a.text, vars, page);
      const cls = a.cls.length ? ` class="${a.cls.join(" ")}"` : "";
      if (n === 2 && a.id) {
        if (inSection) close("section");
        out.push(`<section id="s-${a.id}"${a.text.trim() ? "" : at(i)}>`); inSection = true;
        sec.push([a.id, a.label ?? a.text.replace(/<[^>]+>/g, "").trim(), []]);
        if (a.text.trim()) out.push(`<h2${cls}${at(i)}>${text}</h2>`);   // "## {#id | Label}": a section and an index entry without a visible title
      } else if (n === 3 && a.id) {
        out.push(`<h3 id="s-${a.id}"${cls}${at(i)}>${text}</h3>`);
        (sec.at(-1)?.[2] ?? sub).push([a.id, a.label ?? a.text.replace(/<[^>]+>/g, "").trim()]);
      } else if (n === 4) out.push(`<div class="h4"${a.id ? ` id="${a.id}"` : ""}${at(i)}>${text}</div>`);
      else out.push(`<h${n}${a.id ? ` id="${a.id}"` : ""}${cls}${at(i)}>${text}</h${n}>`);
      continue;
    }
    // raw HTML lines pass through
    if (t.startsWith("<") && !para.length) { out.push(inline(t, vars, page).replace(/^<([a-z][\w-]*)/i, `<$1${at(i)}`)); continue; }
    // paragraph class markers: [sub], [nota], [línea], [antetítulo], [.any-class]
    m = t.match(/^\[(sub|nota|línea|linea|antetítulo|\.[\w-]+)\]\s*(.*)$/);
    if (m && !para.length) {
      if (m[1] === "antetítulo") { out.push(`<div class="eyebrow"${at(i)}>${inline(m[2], vars, page)}</div>`); continue; }
      pcls = PCLASS[m[1]] ?? m[1].slice(1);
      pline = i;
      if (m[2]) para.push(m[2]);
      continue;
    }
    if (!para.length && !pcls) pline = i;
    para.push(t);
  }
  flush();
  if (inSection) close("section");
  return { html: out.join("\n"), sec, sub };
}
