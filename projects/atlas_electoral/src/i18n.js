// The reader's language. Spanish is the site's language and its default; English is a layer on top, phase 1 (2026-11-15):
// the 29N pages only (front page, Modelo, Provincias, Senado, Tu voto), listed in EN_VIEWS. English only when the address says
// ?lang=en; otherwise Spanish, always (Víctor, 2026-11-17: "español por defecto"; until then the last choice was remembered in
// localStorage, so a reader who once pressed EN kept getting English). The browser's language is not used. This departs
// from the family default (English last) on purpose: declared in chassis.json.
// Interface strings are keyed by their Spanish text: t("Escaños") is "Escaños" in Spanish and lang_en.js["Escaños"] in English.
// N_() only marks a string for pipeline/check_textos_en.py, for strings stored in a table and passed to t() later.
// Prose is not here: textos/en/<page>.md beside textos/<page>.md (src/textos.js picks the folder).
import EN from "./lang_en.js?v=0.2.149";

const KEY = "atlas_electoral.lang";
const LANGS = ["es", "en"];
const fromUrl = () => new URLSearchParams(location.search).get("lang");
function choose() {
  const q = fromUrl();
  if (LANGS.includes(q)) return q;
  try { localStorage.removeItem(KEY); } catch { /* nothing stored */ }   // a choice remembered before 2026-11-17 no longer counts
  return "es";   // no browser detection (2026-11-15): Víctor's own browser is en-GB, and the site is Spanish unless the reader asks
}
/** The reader's language, for the whole visit. */
export const LANG = choose();
/** Views that exist in English; every other view is drawn in Spanish, with a one-line note in English above it. */
export const EN_VIEWS = new Set(["inicio", "modelo", "provincia", "senado", "voto"]);
/** Text files that exist in textos/en/ (pipeline/check_textos_en.py checks them against the Spanish ones). */
export const EN_TEXTOS = new Set(["portada", "resultados", "provincia", "senado", "modelo", "voto"]);

// the language of the view being drawn: English only on a translated view, so an untranslated page stays Spanish throughout
let page = LANG;
export const lang = () => page;
export const loc = () => (page === "en" ? "en-GB" : "es-ES");

const missing = new Set();
/** A Spanish interface string in the language of the view; {name} in it is filled from vars. */
export function t(s, vars) {
  let out = s;
  if (page === "en") {
    out = EN[s];
    if (out == null) {
      if (!missing.has(s)) { missing.add(s); console.warn(`i18n: no English for "${s}"`); }
      out = s;
    }
  }
  return vars ? out.replace(/\{(\w+)\}/g, (m, k) => (k in vars && vars[k] != null ? String(vars[k]) : m)) : out;
}
export const N_ = (s) => s;

/** A figure written with a decimal point ("38.2", "1.5"), with the decimal sign of the view's language. */
export const sep = (s) => (page === "en" ? String(s) : String(s).replace(".", ","));
/** x with d decimals, in the view's language ("38,2" / "38.2"). */
export const fix = (x, d = 1) => sep(x.toFixed(d));
/** A frequency for readers: "7 de cada 10" / "7 out of 10". */
export const deCada = (n, de) => t("{n} de cada {de}", { n, de });
/** An ordinal: "3.º" (g "m") or "3.ª" (g "f") in Spanish, "3rd" in English. */
export function ordinal(k, g = "m") {
  if (page !== "en") return `${k}.${g === "f" ? "ª" : "º"}`;
  const s = k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] ?? "th";
  return `${k}${s}`;
}

// d3's number and date formats (axes, tooltips) follow the view's language
const D3 = {
  es: {
    number: { decimal: ",", thousands: ".", grouping: [3], currency: ["", " €"] },
    time: {
      dateTime: "%A, %e de %B de %Y, %X", date: "%d/%m/%Y", time: "%H:%M:%S", periods: ["AM", "PM"],
      days: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
      shortDays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
      months: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
      shortMonths: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    },
  },
  en: {
    number: { decimal: ".", thousands: ",", grouping: [3], currency: ["€", ""] },
    time: {
      dateTime: "%A, %e %B %Y, %X", date: "%d/%m/%Y", time: "%H:%M:%S", periods: ["AM", "PM"],
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    },
  },
};
function locales() {
  window.d3.formatDefaultLocale(D3[page].number);
  window.d3.timeFormatDefaultLocale(D3[page].time);
}

/** Called by the router before drawing a view: sets the view's language, <html lang> and d3's formats. */
export function setView(view) {
  page = LANG === "en" && EN_VIEWS.has(view) ? "en" : "es";
  document.documentElement.lang = page;
  locales();
  return page;
}

/** The page's own chrome (top bar, footer): every element with data-i18n gets its text (or, with data-i18n="html", its
 *  inner HTML) in the reader's language; the ES · EN buttons are marked and keep the address (hash included). */
export function chrome() {
  const was = page;
  page = LANG;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    // the key is the Spanish as written in the page, without the line marks the local server adds (data-src)
    el.dataset.es ??= el.dataset.i18n === "html" ? el.innerHTML.replace(/ data-src="[^"]*"/g, "").trim().replace(/\s+/g, " ") : el.textContent.trim();
    if (el.dataset.i18n === "html") el.innerHTML = t(el.dataset.es); else el.textContent = t(el.dataset.es);
  }
  for (const el of document.querySelectorAll("[data-i18n-label]")) el.setAttribute("aria-label", t(el.dataset.i18nLabel));
  page = was;
  // the phone's switch (first in the row of tabs, where the identity bar has no room): the other language only
  document.querySelectorAll("a.lang-m").forEach((a) => {
    const other = LANG === "en" ? "es" : "en";
    a.dataset.l = other; a.lang = other; a.textContent = other.toUpperCase();
    a.href = `?lang=${other}`; a.setAttribute("aria-label", other === "en" ? "English" : "Español");
  });
  document.querySelectorAll("nav.lang a, a.lang-m").forEach((a) => {
    const on = a.dataset.l === LANG;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
    a.onclick = (ev) => {
      ev.preventDefault();
      const u = new URL(location.href);
      u.searchParams.set("lang", a.dataset.l);
      location.assign(u.href);
    };
  });
}
