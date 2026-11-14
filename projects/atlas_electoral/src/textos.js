// The prose of every tab lives in web/atlas_electoral/textos/<page>.md, plain Markdown that Víctor edits by hand
// (syntax in textos/README.md). This module reads those files and turns them into the same HTML the pages had.
// The code keeps only what is computed: figures ({name}), charts and tables ([[name]]) and conditions (::: si name).
import { DATA_V } from "./data.js?v=0.2.74";

const BASE = new URL("../textos/", import.meta.url).href;
const cache = new Map();
export const INDICE = "<!--indice-->";

/** All the parts of a page file: {principal: "...", other: "..."} (a line "=== other ===" starts a part). */
export function textos(page) {
  if (!cache.has(page)) {
    cache.set(page, fetch(`${BASE}${page}.md?v=${DATA_V}`).then((r) => {
      if (!r.ok) throw new Error(`textos/${page}.md: ${r.status}`);
      return r.text();
    }).then((src) => {
      const parts = {};
      let name = "principal";
      for (const line of src.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/)) {
        const m = line.match(/^===\s*(.+?)\s*===\s*$/);
        if (m) { name = m[1]; continue; }
        (parts[name] ??= []).push(line);
      }
      return Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, v.join("\n")]));
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
      return `<mark title="Cifra desconocida">{${k}}</mark>`;
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
 * null or "": nothing); flags: booleans for "::: si name". sec: the index of h2 and h3 with an id, in indexHtml's format.
 */
export function md(src, { vars = {}, slots = {}, flags = {}, page = "?" } = {}) {
  const out = [], sec = [], stack = [];
  let para = [], pcls = null, inSection = false;
  const live = () => stack.every((f) => f.on);
  const flush = () => {
    if (para.length && live()) out.push(`<p${pcls ? ` class="${pcls}"` : ""}>${inline(para.join(" "), vars, page)}</p>`);
    para = []; pcls = null;
  };
  const close = (tag) => out.push(`</${tag}>`);
  for (const raw of src.split("\n")) {
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
        const title = pm[3] || "Metodología";
        const short = !!pm[2];
        if (parentOn) out.push(`<details class="metodo-box"${idA}><summary>${title}</summary>${short ? "" : '<div class="metodo">'}`);
        stack.push({ on: parentOn, cond: true, parentOn, close: short ? "</details>" : "</div></details>" });
        continue;
      }
      const cls = words.split(/\s+/).filter(Boolean).map((w) => BOX[w] ?? w.replace(/^\./, ""));
      if (parentOn) out.push(`<div${cls.length ? ` class="${cls.join(" ")}"` : ""}${idA}>`);
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
        out.push(`<section id="s-${a.id}">`); inSection = true;
        sec.push([a.id, a.label ?? a.text.replace(/<[^>]+>/g, "").trim(), []]);
        if (a.text.trim()) out.push(`<h2${cls}>${text}</h2>`);   // "## {#id | Label}": a section and an index entry without a visible title
      } else if (n === 3 && a.id) {
        out.push(`<h3 id="s-${a.id}"${cls}>${text}</h3>`);
        sec.at(-1)?.[2].push([a.id, a.label ?? a.text.replace(/<[^>]+>/g, "").trim()]);
      } else if (n === 4) out.push(`<div class="h4"${a.id ? ` id="${a.id}"` : ""}>${text}</div>`);
      else out.push(`<h${n}${a.id ? ` id="${a.id}"` : ""}${cls}>${text}</h${n}>`);
      continue;
    }
    // raw HTML lines pass through
    if (t.startsWith("<") && !para.length) { out.push(inline(t, vars, page)); continue; }
    // paragraph class markers: [sub], [nota], [línea], [antetítulo], [.any-class]
    m = t.match(/^\[(sub|nota|línea|linea|antetítulo|\.[\w-]+)\]\s*(.*)$/);
    if (m && !para.length) {
      if (m[1] === "antetítulo") { out.push(`<div class="eyebrow">${inline(m[2], vars, page)}</div>`); continue; }
      pcls = PCLASS[m[1]] ?? m[1].slice(1);
      if (m[2]) para.push(m[2]);
      continue;
    }
    para.push(t);
  }
  flush();
  if (inSection) close("section");
  return { html: out.join("\n"), sec };
}
