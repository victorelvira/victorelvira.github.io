/* Interactive Atlas of Wood Carving — Spanish/English.
 *
 * WHAT IS TRANSLATED AND WHAT IS NOT
 *   Translated: every piece of UI chrome, and the CONTROLLED VOCABULARY that
 *   drives the filters — object types, relief forms, finishes, collections.
 *   That is a few dozen terms, it is done once, and it makes every facet in the
 *   atlas usable in both languages.
 *
 *   NOT translated: the record titles. They stay in the language of their
 *   source — French for the Palissy corpus, Italian for ArCo, English for the
 *   museums. This is a deliberate decision, not laziness. In devotional carving
 *   the title IS the dedication ("Vierge à l'Enfant", "Madonna Addolorata"),
 *   and machine-translating 17,000 of them would replace precise names with
 *   mush while multiplying the payload. `lang_orig` records which language each
 *   title is in.
 *
 * HOW IT WORKS
 *   Every translatable node carries data-i18n="key" (or data-i18n-ph for a
 *   placeholder, data-i18n-title for a tooltip). setLang() walks them. Strings
 *   built in JS go through t(). Vocabulary coming from the data goes through
 *   tv(), which falls back to the original term when there is no translation —
 *   so a new object type from a new source degrades to English instead of
 *   showing a blank chip.
 */

const I18N = {
  en: {
    "brand.title": "Interactive Atlas of Wood Carving",
    "brand.tagline": "where the carvings are",
    "brand.reload": "Reload the atlas (clears filters)",
    "nav.other": "other interactive projects",
    "nav.build": "Version and last update",
    "view.map": "🗺 Map & list",
    "view.gallery": "▦ Gallery",
    "view.table": "☰ Table",
    "view.map.t": "Map with the list of carvings beside it",
    "view.gallery.t": "Browse every carving as a photo grid",
    "view.table.t": "Browse every carving as a sortable table",
    "search.ph": "Search — title, church, commune, carver…",
    "clear": "Clear",
    "named": "Named carver",
    "named.t": "Only carvings whose maker is named in the record — devotional carving is largely anonymous workshop art",
    "carved": "Carved",
    "alldates": "all dates",
    "panel.head": "Carvings in view",
    "panel.count": "{n} carvings in view",
    "panel.empty": "Nothing here — pan the map or relax the filters.",
    "gallery.empty": "No carving matches these filters.",
    "more": "Show more ({n} left)",
    "stats": "{n} carvings · {p} places",
    "count": "{n} of {total}",
    "col.carving": "Carving", "col.type": "Type", "col.date": "Date",
    "col.where": "Where", "col.commune": "Commune", "col.carver": "Carver",
    "col.score": "Score",
    "sheet.type": "Type", "sheet.form": "Form", "sheet.date": "Date",
    "sheet.carver": "Carver", "sheet.where": "Where", "sheet.dept": "Département",
    "sheet.placed": "Placed", "sheet.photos": "Photographs",
    "sheet.iconography": "Iconography",
    "sheet.record": "Full record ↗",
    "sheet.photo": "Photograph {credit}. Linked from the source, not redistributed.",
    "sheet.collection": "Collection",
    "sheet.cc0": " · image released CC0",
    "foot.data": "Data",
    "foot.linked": "Photographs are linked from their source, never redistributed",
    "date.undated": "undated",
    "date.century": "{c}th c.",
    "date.centuries": "{a}–{b}th c.",
    "lang.switch": "Español",
  },
  es: {
    "brand.title": "Atlas interactivo de la talla en madera",
    "brand.tagline": "dónde están las tallas",
    "brand.reload": "Recargar el atlas (limpia los filtros)",
    "nav.other": "otros proyectos interactivos",
    "nav.build": "Versión y última actualización",
    "view.map": "🗺 Mapa y lista",
    "view.gallery": "▦ Galería",
    "view.table": "☰ Tabla",
    "view.map.t": "Mapa con la lista de tallas al lado",
    "view.gallery.t": "Ver todas las tallas como rejilla de fotos",
    "view.table.t": "Ver todas las tallas en una tabla ordenable",
    "search.ph": "Buscar — título, iglesia, municipio, tallista…",
    "clear": "Limpiar",
    "named": "Con tallista",
    "named.t": "Solo las tallas cuyo autor consta en la ficha — la imaginería es en su mayoría arte anónimo de taller",
    "carved": "Tallada",
    "alldates": "todas las fechas",
    "panel.head": "Tallas a la vista",
    "panel.count": "{n} tallas a la vista",
    "panel.empty": "Aquí no hay nada — mueve el mapa o quita filtros.",
    "gallery.empty": "Ninguna talla coincide con estos filtros.",
    "more": "Ver más ({n} restantes)",
    "stats": "{n} tallas · {p} sitios",
    "count": "{n} de {total}",
    "col.carving": "Talla", "col.type": "Tipo", "col.date": "Fecha",
    "col.where": "Dónde", "col.commune": "Municipio", "col.carver": "Tallista",
    "col.score": "Puntuación",
    "sheet.type": "Tipo", "sheet.form": "Forma", "sheet.date": "Fecha",
    "sheet.carver": "Tallista", "sheet.where": "Dónde", "sheet.dept": "Departamento",
    "sheet.placed": "Ubicación", "sheet.photos": "Fotografías",
    "sheet.iconography": "Iconografía",
    "sheet.record": "Ficha completa ↗",
    "sheet.photo": "Fotografía {credit}. Enlazada desde su origen, no redistribuida.",
    "sheet.collection": "Colección",
    "sheet.cc0": " · imagen liberada como CC0",
    "foot.data": "Datos",
    "foot.linked": "Las fotografías se enlazan desde su origen, nunca se redistribuyen",
    "date.undated": "sin fecha",
    "date.century": "s. {c}",
    "date.centuries": "s. {a}–{b}",
    "lang.switch": "English",
  },
};

/* Controlled vocabulary. Keys are the English terms the build scripts emit;
   an unknown term falls through to itself rather than disappearing. */
const VOCAB = {
  es: {
    // object types
    "Statue": "Estatua", "Sculptural group": "Grupo escultórico",
    "Altarpiece": "Retablo", "Relief": "Relieve", "Tabernacle": "Sagrario",
    "Pulpit": "Púlpito", "Sculpture": "Escultura", "Reliquary bust": "Busto relicario",
    "Reliquary": "Relicario", "Choir stalls": "Sillería de coro", "Bust": "Busto",
    "Calvary": "Calvario", "Carved panel": "Tabla tallada", "Figure": "Figura",
    "Architectural carving": "Talla arquitectónica", "Mask": "Máscara",
    "Frame": "Marco", "Carved door": "Puerta tallada", "Screen": "Cancel",
    "Crucifix": "Crucifijo", "Christ figure": "Cristo", "Virgin": "Virgen",
    "Statuette": "Estatuilla", "Netsuke": "Netsuke", "Overmantel": "Sobrechimenea",
    "Carving": "Talla", "Altar": "Altar", "Angel": "Ángel", "Model": "Modelo",
    "Figurehead": "Mascarón de proa", "Recumbent effigy": "Yacente",
    "Half relief": "Medio relieve", "Other": "Otros",
    "Nativity group": "Belén",
    // relief axis
    "In the round": "Bulto redondo", "Low relief": "Bajorrelieve",
    "High relief": "Altorrelieve", "Applied": "Adosada",
    // finishes
    "Carved": "Tallada", "Painted": "Pintada", "Polychrome": "Policromada",
    "Gilded": "Dorada",
    // collections
    "French churches": "Iglesias francesas", "Wikidata / Commons": "Wikidata / Commons",
    "V&A": "V&A", "The Met": "The Met", "Cleveland": "Cleveland",
    "Italian catalogue": "Catálogo italiano",
    "Spanish museums": "Museos españoles",
  },
};

let LANG = "en";

function t(key, vars) {
  let s = (I18N[LANG] && I18N[LANG][key]) || I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
  return s;
}

/* Vocabulary lookup: falls back to the original term, so a new object type from
   a new source shows in English rather than vanishing. */
function tv(term) {
  if (LANG === "en" || !term) return term;
  return (VOCAB[LANG] && VOCAB[LANG][term]) || term;
}

function applyStatic() {
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-ph]")) {
    el.placeholder = t(el.dataset.i18nPh);
  }
  for (const el of document.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.dataset.i18nTitle);
  }
}
