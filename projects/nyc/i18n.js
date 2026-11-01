// The page in English and Spanish (PRACTICES.md 2.5). English is the source and the key: every sentence the
// reader sees is looked up by its English text in nyc/i18n_es.js, which scripts/i18n.py writes from
// data/i18n/*.csv and refuses to write while any sentence of the page has no translation.
// Language: ?lang=, then the reader's last choice (localStorage), then the browser, then English.
(function () {
  const LANGS = ["en", "es"];
  const DICTS = { es: typeof i18n_es === "object" ? i18n_es : {} };
  const norm = s => String(s).replace(/\s+/g, " ").trim();
  function choose() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    try { const s = localStorage.getItem("nyc.lang"); if (LANGS.includes(s)) return s; } catch { /* private window */ }
    return /^es\b/i.test(navigator.language || "") ? "es" : "en";
  }
  const lang = choose();
  window.LANG = lang;
  // t("{n} new in {year}", { n: 4, year: 2027 }): the sentence in the page's language, with its numbers
  window.t = (en, vars) => {
    let s = lang === "en" ? en : (DICTS[lang][norm(en)] ?? en);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  };
  window.setLang = l => {
    try { localStorage.setItem("nyc.lang", l); } catch { /* ignore */ }
    const u = new URL(location.href);
    u.searchParams.set("lang", l);
    location.href = u.toString();
  };
  // The fixed page: an element marked data-i18n takes the translation of its whole content (markup
  // included); data-i18n-attr="title,aria-label" lists the attributes to translate.
  function translateDom() {
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-lang]").forEach(b => {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
      b.addEventListener("click", () => { if (b.dataset.lang !== lang) window.setLang(b.dataset.lang); });
    });
    if (lang === "en") return;
    const d = DICTS[lang];
    document.title = d[norm(document.title)] ?? document.title;
    // the English text stays in data-en, for code that recognises a section by its title
    // a <span id> inside a sentence is a slot a script fills with a number: it is emptied for the lookup and
    // its value is put back into the translated sentence (the script may also fill it later)
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const probe = el.cloneNode(true), slots = {};
      probe.querySelectorAll("span[id]").forEach(s => { slots[s.id] = s.innerHTML; s.innerHTML = ""; });
      const v = d[norm(probe.innerHTML)];
      if (v === undefined) return;
      el.dataset.en = norm(el.textContent);
      el.innerHTML = v;
      Object.entries(slots).forEach(([id, val]) => { const s = el.querySelector("#" + CSS.escape(id)); if (s) s.innerHTML = val; });
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(el => el.dataset.i18nAttr.split(",").forEach(a => {
      const v = el.getAttribute(a);
      if (v && d[norm(v)] !== undefined) el.setAttribute(a, d[norm(v)]);
    }));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", translateDom);
  else translateDom();
})();
