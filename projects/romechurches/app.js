// Churches of Rome · app.js, one file, no build step.
// Contract (CHASSIS.md section 3): state -> passes(church) -> [map, list, views]. No view filters on its own.

const DATA_V = "0.9.2";
const BUILD_AT = "2026-10-20 10:48";

// ------------------------------------------------------------------ i18n
// Keyed by the English string. Every key exists in every language: tools/check_views.py refuses
// a deploy otherwise (PRACTICES.md tier 1, rule 10).
const I18N = {
  es: {
    "Churches of Rome": "Iglesias de Roma",
    "every church, chapel and oratory, standing or lost": "todas las iglesias, capillas y oratorios, en pie o desaparecidos",
    "Share": "Compartir", "Where I am": "Dónde estoy",
    "Copy a link to what you are looking at": "Copia un enlace a lo que estás viendo",
    "Show a live dot where you are": "Muestra un punto donde estás",
    "Search a church, a saint, an artist, a person buried there": "Busca una iglesia, un santo, un artista, alguien enterrado allí",
    "Churches": "Iglesias", "Art": "Arte", "Buried": "Enterrados", "Saints": "Santos",
    "Other filters": "Otros filtros",
    "major_basilica": "Basílica mayor", "basilica": "Basílica", "cathedral": "Catedral", "church": "Iglesia",
    "oratory": "Oratorio", "chapel": "Capilla", "unknown kind": "Tipo sin dato",
    "standing": "En uso", "former": "Ya no es iglesia", "ruin": "Ruina", "lost": "Desaparecida",
    "State": "Estado", "Founded": "Fundación", "Holds": "Contiene", "District": "Barrio", "Also": "Además",
    "works of art": "obras de arte", "burials": "enterramientos", "a cardinal title": "un título cardenalicio",
    "a photo": "una foto", "opening hours": "horario", "any district": "cualquier barrio",
    "national": "nacional", "parish": "parroquial", "shrine": "santuario", "pilgrimage": "peregrinación",
    "only in OpenStreetMap": "solo en OpenStreetMap", "no year recorded": "sin año",
    "from": "desde", "to": "hasta", "Show everything": "Mostrar todo",
    "Dot: one church; size: how many Wikipedias write about it; colour: kind; hollow: no longer a church; dashed: lost; faint: approximate position.": "Punto: una iglesia; tamaño: en cuántas Wikipedias aparece; color: tipo; hueco: ya no es iglesia; discontinuo: desaparecida; tenue: posición aproximada.",
    "{n} of {t} churches": "{n} de {t} iglesias", "{n} without a position, listed but not on the map": "{n} sin posición, en la lista pero no en el mapa",
    "Show more": "Mostrar más", "Nothing matches.": "Nada coincide.", "Back to the list": "Volver a la lista",
    "Back": "Atrás", "Open the church": "Abrir la iglesia", "Interior": "Interior", "Exterior": "Exterior",
    "Photo": "Foto", "From Wikipedia": "De Wikipedia", "Read more on Wikipedia": "Seguir leyendo en Wikipedia",
    "Facts": "Datos", "Dedicated to": "Dedicada a", "Architect": "Arquitecto", "Style": "Estilo",
    "Founded or built": "Fundada o construida", "Demolished or closed": "Derribada o cerrada",
    "Denomination": "Confesión", "Rite": "Rito", "Address": "Dirección", "Heritage": "Patrimonio",
    "listed as Italian cultural heritage": "protegida como bien cultural italiano",
    "Part of": "Forma parte de", "Inside it": "Dentro", "Opening hours": "Horario",
    "Mass times": "Misas", "as recorded in OpenStreetMap; check before you go": "según OpenStreetMap; compruébalo antes de ir",
    "Cardinal title": "Título cardenalicio", "Holders recorded in Wikidata": "Titulares registrados en Wikidata",
    "What is inside": "Qué hay dentro", "Shown in": "Aparece en", "Buried here": "Enterrados aquí",
    "Links": "Enlaces", "Sources": "Fuentes", "Show all {n}": "Ver los {n}",
    "Position from OpenStreetMap: Wikidata has none.": "Posición de OpenStreetMap: Wikidata no tiene.",
    "This church is only in OpenStreetMap: Wikidata does not have it yet.": "Esta iglesia solo está en OpenStreetMap: Wikidata aún no la tiene.",
    "No position known: it is not on the map.": "Sin posición conocida: no está en el mapa.",
    "century": "siglo", "c.": "h.", "BC": "a. C.",
    "pope": "papa", "cardinal": "cardenal", "saint": "santo", "blessed": "beato", "venerated": "venerable",
    "artist": "artista", "musician": "músico", "writer": "escritor", "clergy": "clero",
    "painting": "pintura", "fresco": "fresco", "sculpture": "escultura", "tomb": "sepulcro", "mosaic": "mosaico",
    "altar": "altar", "object": "objeto", "other": "otro", "architecture": "arquitectura", "relic": "reliquia",
    "{n} works in {c} churches": "{n} obras en {c} iglesias", "{n} people in {c} churches": "{n} personas en {c} iglesias",
    "{n} saints and dedications": "{n} santos y advocaciones", "churches": "iglesias", "works": "obras",
    "Works by": "Obras de", "Dedicated to:": "Dedicadas a:", "Buried:": "Enterrado:",
    "Link copied": "Enlace copiado", "Location unavailable": "Ubicación no disponible",
    "Feast": "Fiesta", "Wikidata": "Wikidata", "Commons": "Commons", "Churches of Rome Wiki": "Churches of Rome Wiki",
    "everyone": "todos", "unknown": "desconocido", "Popes": "Papas", "Artists": "Artistas",
    "Loading the churches...": "Cargando las iglesias...", "The data could not be loaded. Reload the page.": "No se pudieron cargar los datos. Recarga la página.",
    "by fame": "por fama", "by name": "por nombre", "by year": "por año",
    "Only in the Churches of Rome Wiki. Position: the address it gives, found by OpenStreetMap Nominatim.": "Solo en la Churches of Rome Wiki. Posición: la dirección que da, localizada con Nominatim de OpenStreetMap.",
    "Only in the Churches of Rome Wiki. Position: the street it gives, found by OpenStreetMap Nominatim. Approximate.": "Solo en la Churches of Rome Wiki. Posición: la calle que da, localizada con Nominatim de OpenStreetMap. Aproximada.",
    "Approximate.": "Aproximada.", "yes, according to the Churches of Rome Wiki": "sí, según la Churches of Rome Wiki",
    "Art by": "Arte de", "Every church with this artist": "Todas las iglesias con este artista", "artists named in the texts": "artistas citados en los textos",
    "Artists named in the texts": "Artistas citados en los textos",
    "Counting also the churches whose texts name the artist.": "Contando también las iglesias cuyos textos citan al artista.",
    "Recognised by name in the Churches of Rome Wiki and in Wikipedia; each comes with the sentence that names it.": "Reconocidos por su nombre en la Churches of Rome Wiki y en Wikipedia; cada uno va con la frase que lo cita.",
    "Close": "Cerrar", "On the map": "En el mapa",
    "Explore": "Explorar",
    "Within the {n} churches the filters show. Choosing a row shows its churches.": "Dentro de las {n} iglesias que muestran los filtros. Al elegir una fila se ven sus iglesias.",
    "Enter: search these words in every church": "Intro: buscar estas palabras en todas las iglesias",
    "Explore by artist, saint or burial": "Explorar por artista, santo o enterramiento",
    "Family": "Familia",
    "Families": "Familias",
    "chapels": "capillas",
    "Chapels and parts": "Capillas y partes",
    "dedicated to": "dedicada a",
    "its own card": "su ficha",
    "As the Churches of Rome Wiki walks through the church. Open one to read its text.": "Tal como la Churches of Rome Wiki recorre la iglesia. Abre una para leer su texto.",
    "Families who founded or owned a chapel, as the Churches of Rome Wiki names them. The same name is shown as one family.": "Familias que fundaron o poseyeron una capilla, como las nombra la Churches of Rome Wiki. El mismo apellido se muestra como una familia.",
    "part:sanctuary": "presbiterio",
    "part:crypt": "cripta",
    "part:sacristy": "sacristía",
    "part:baptistery": "baptisterio",
    "part:transept": "crucero",
    "part:nave": "nave",
    "part:dome": "cúpula",
    "part:campanile": "campanario",
    "part:cloister": "claustro",
    "part:chapel": "capilla",
    "Relics of": "Reliquias de",
    "relic:body": "cuerpo",
    "relic:head": "cabeza",
    "relic:arm": "brazo",
    "relic:blood": "sangre",
    "relic:bones": "huesos",
    "relic:relic": "reliquia",
    "no longer here, the text says": "ya no está aquí, según el texto",
    "True Cross": "Vera Cruz",
    "Holy Nails": "Santos Clavos",
    "Crown of Thorns": "Corona de espinas",
    "Column of the Flagellation": "Columna de la Flagelación",
    "Holy Crib": "Santa Cuna",
    "Holy Stairs": "Escalera Santa",
    "Veil of Veronica": "Velo de la Verónica",
    "Titulus Crucis": "Titulus Crucis",
    "Relics read in the texts (\"the relics of St X\") and saints buried in the church. Not shown: {n} whose saint the texts do not name unambiguously, and those the texts say have left.": "Reliquias leídas en los textos («las reliquias de san X») y santos enterrados en la iglesia. No se muestran: {n} cuyo santo los textos no nombran sin ambigüedad, y las que según los textos ya no están.",
    "Where": "Dónde",
    "zone:rione": "Centro histórico (rioni)",
    "zone:outer": "Resto de Roma",
    "zone:vatican": "Vaticano",
    "zone:unknown": "Zona desconocida",
    "Rome here is Roma Capitale, the comune (1,287 km²), and Vatican City. The historic centre is the 22 rioni.": "Roma aquí es Roma Capitale, el municipio (1.287 km²), y la Ciudad del Vaticano. El centro histórico son los 22 rioni.",
    "Catalogue": "Catálogo",
    "Catalogue of works": "Catálogo de obras",
    "with a photograph": "con foto",
    "{n} works in {c} churches, as catalogued in Wikidata. They follow the church filters; artists the texts only name are not works and are not here.": "{n} obras en {c} iglesias, tal como las cataloga Wikidata. Siguen los filtros de iglesias; los artistas que los textos solo citan no son obras y no están aquí.",
    "Every work catalogued in the churches you are looking at": "Todas las obras catalogadas en las iglesias que estás viendo",
    "Follow the map": "Seguir el mapa",
    "{n} in view": "{n} a la vista",
    "The list shows only the churches the map is showing": "La lista muestra solo las iglesias que enseña el mapa",
    "In the national catalogue": "En el catálogo nacional", "liturgical": "objeto litúrgico",
    "parts": "partes",
    "Every object the Italian state has catalogued in this church (ICCD, CC BY 4.0), with its place in the building. Each opens its record, with photographs.": "Cada objeto que el Estado italiano ha catalogado en esta iglesia (ICCD, CC BY 4.0), con su lugar en el edificio. Cada uno abre su ficha, con fotografías.",
    "{n} works in {c} churches, from Wikidata and the national catalogue (ICCD). They follow the church filters; artists the texts only name are not works and are not here.": "{n} obras en {c} iglesias, de Wikidata y del catálogo nacional (ICCD). Siguen los filtros de iglesias; los artistas que los textos solo citan no son obras y no están aquí.",
    "Wikidata and the national catalogue": "Wikidata y catálogo nacional",
    "Wikidata only": "Solo Wikidata",
    "Share this church": "Comparte esta iglesia",
    "only": "solo", "all": "todo", "Relics": "Reliquias", "only in the Churches of Rome Wiki": "solo en la Churches of Rome Wiki", "outside the walls": "fuera de las murallas",
    "Built": "Construida", "Consecrated": "Consagrada", "Artists": "Artistas", "Loading...": "Cargando...",
    "relics": "reliquias", "a long text": "un texto largo", "Read the whole entry": "Leer la entrada completa", "In the words of the Churches of Rome Wiki": "Con las palabras de la Churches of Rome Wiki", "paragraphs": "párrafos", "Text": "Texto",
    "This church is only in the Churches of Rome Wiki: no position is known, so it is not on the map.": "Esta iglesia solo está en la Churches of Rome Wiki: no se conoce su posición, así que no está en el mapa.", "in": "en", "Funeral monuments": "Monumentos funerarios",
    "commemorated by a monument here; Wikidata does not record them as buried here": "recordados por un monumento aquí; Wikidata no dice que estén enterrados aquí", "Events held here": "Acontecimientos que tuvieron lugar aquí", "event": "acontecimiento",
  },
  it: {
    "Churches of Rome": "Chiese di Roma",
    "every church, chapel and oratory, standing or lost": "tutte le chiese, cappelle e oratori, esistenti o scomparsi",
    "Share": "Condividi", "Where I am": "Dove sono",
    "Copy a link to what you are looking at": "Copia un link a ciò che stai guardando",
    "Show a live dot where you are": "Mostra un punto dove sei",
    "Search a church, a saint, an artist, a person buried there": "Cerca una chiesa, un santo, un artista, chi vi è sepolto",
    "Churches": "Chiese", "Art": "Arte", "Buried": "Sepolti", "Saints": "Santi",
    "Other filters": "Altri filtri",
    "major_basilica": "Basilica maggiore", "basilica": "Basilica", "cathedral": "Cattedrale", "church": "Chiesa",
    "oratory": "Oratorio", "chapel": "Cappella", "unknown kind": "Tipo non indicato",
    "standing": "In uso", "former": "Non più chiesa", "ruin": "Rudere", "lost": "Scomparsa",
    "State": "Stato", "Founded": "Fondazione", "Holds": "Contiene", "District": "Zona", "Also": "Inoltre",
    "works of art": "opere d'arte", "burials": "sepolture", "a cardinal title": "un titolo cardinalizio",
    "a photo": "una foto", "opening hours": "orari", "any district": "qualsiasi zona",
    "national": "nazionale", "parish": "parrocchiale", "shrine": "santuario", "pilgrimage": "pellegrinaggio",
    "only in OpenStreetMap": "solo in OpenStreetMap", "no year recorded": "senza anno",
    "from": "da", "to": "a", "Show everything": "Mostra tutto",
    "Dot: one church; size: how many Wikipedias write about it; colour: kind; hollow: no longer a church; dashed: lost; faint: approximate position.": "Punto: una chiesa; grandezza: in quante Wikipedia compare; colore: tipo; vuoto: non più chiesa; tratteggiato: scomparsa; tenue: posizione approssimativa.",
    "{n} of {t} churches": "{n} di {t} chiese", "{n} without a position, listed but not on the map": "{n} senza posizione, in elenco ma non sulla mappa",
    "Show more": "Mostra altre", "Nothing matches.": "Nessun risultato.", "Back to the list": "Torna all'elenco",
    "Back": "Indietro", "Open the church": "Apri la chiesa", "Interior": "Interno", "Exterior": "Esterno",
    "Photo": "Foto", "From Wikipedia": "Da Wikipedia", "Read more on Wikipedia": "Continua su Wikipedia",
    "Facts": "Dati", "Dedicated to": "Dedicata a", "Architect": "Architetto", "Style": "Stile",
    "Founded or built": "Fondata o costruita", "Demolished or closed": "Demolita o chiusa",
    "Denomination": "Confessione", "Rite": "Rito", "Address": "Indirizzo", "Heritage": "Patrimonio",
    "listed as Italian cultural heritage": "tutelata come bene culturale italiano",
    "Part of": "Fa parte di", "Inside it": "Al suo interno", "Opening hours": "Orari",
    "Mass times": "Messe", "as recorded in OpenStreetMap; check before you go": "secondo OpenStreetMap; verifica prima di andare",
    "Cardinal title": "Titolo cardinalizio", "Holders recorded in Wikidata": "Titolari registrati in Wikidata",
    "What is inside": "Cosa contiene", "Shown in": "Raffigurata in", "Buried here": "Sepolti qui",
    "Links": "Link", "Sources": "Fonti", "Show all {n}": "Mostra tutti i {n}",
    "Position from OpenStreetMap: Wikidata has none.": "Posizione da OpenStreetMap: Wikidata non ne ha.",
    "This church is only in OpenStreetMap: Wikidata does not have it yet.": "Questa chiesa è solo in OpenStreetMap: Wikidata non la ha ancora.",
    "No position known: it is not on the map.": "Posizione sconosciuta: non è sulla mappa.",
    "century": "secolo", "c.": "ca.", "BC": "a.C.",
    "pope": "papa", "cardinal": "cardinale", "saint": "santo", "blessed": "beato", "venerated": "venerabile",
    "artist": "artista", "musician": "musicista", "writer": "scrittore", "clergy": "clero",
    "painting": "dipinto", "fresco": "affresco", "sculpture": "scultura", "tomb": "sepolcro", "mosaic": "mosaico",
    "altar": "altare", "object": "oggetto", "other": "altro", "architecture": "architettura", "relic": "reliquia",
    "{n} works in {c} churches": "{n} opere in {c} chiese", "{n} people in {c} churches": "{n} persone in {c} chiese",
    "{n} saints and dedications": "{n} santi e dedicazioni", "churches": "chiese", "works": "opere",
    "Works by": "Opere di", "Dedicated to:": "Dedicate a:", "Buried:": "Sepolto:",
    "Link copied": "Link copiato", "Location unavailable": "Posizione non disponibile",
    "Feast": "Festa", "Wikidata": "Wikidata", "Commons": "Commons", "Churches of Rome Wiki": "Churches of Rome Wiki",
    "everyone": "tutti", "unknown": "sconosciuto", "Popes": "Papi", "Artists": "Artisti",
    "Loading the churches...": "Caricamento delle chiese...", "The data could not be loaded. Reload the page.": "Impossibile caricare i dati. Ricarica la pagina.",
    "by fame": "per fama", "by name": "per nome", "by year": "per anno",
    "Only in the Churches of Rome Wiki. Position: the address it gives, found by OpenStreetMap Nominatim.": "Solo nella Churches of Rome Wiki. Posizione: l'indirizzo che riporta, trovato con Nominatim di OpenStreetMap.",
    "Only in the Churches of Rome Wiki. Position: the street it gives, found by OpenStreetMap Nominatim. Approximate.": "Solo nella Churches of Rome Wiki. Posizione: la via che riporta, trovata con Nominatim di OpenStreetMap. Approssimativa.",
    "Approximate.": "Approssimativa.", "yes, according to the Churches of Rome Wiki": "sì, secondo la Churches of Rome Wiki",
    "Art by": "Arte di", "Every church with this artist": "Tutte le chiese con questo artista", "artists named in the texts": "artisti citati nei testi",
    "Artists named in the texts": "Artisti citati nei testi",
    "Counting also the churches whose texts name the artist.": "Contando anche le chiese i cui testi citano l'artista.",
    "Recognised by name in the Churches of Rome Wiki and in Wikipedia; each comes with the sentence that names it.": "Riconosciuti per nome nella Churches of Rome Wiki e in Wikipedia; ciascuno con la frase che lo cita.",
    "Close": "Chiudi", "On the map": "Sulla mappa",
    "Explore": "Esplora",
    "Within the {n} churches the filters show. Choosing a row shows its churches.": "Tra le {n} chiese che mostrano i filtri. Scegliendo una riga si vedono le sue chiese.",
    "Enter: search these words in every church": "Invio: cerca queste parole in tutte le chiese",
    "Explore by artist, saint or burial": "Esplora per artista, santo o sepoltura",
    "Family": "Famiglia",
    "Families": "Famiglie",
    "chapels": "cappelle",
    "Chapels and parts": "Cappelle e parti",
    "dedicated to": "dedicata a",
    "its own card": "la sua scheda",
    "As the Churches of Rome Wiki walks through the church. Open one to read its text.": "Come la Churches of Rome Wiki percorre la chiesa. Aprine una per leggerne il testo.",
    "Families who founded or owned a chapel, as the Churches of Rome Wiki names them. The same name is shown as one family.": "Famiglie che fondarono o possedettero una cappella, come le nomina la Churches of Rome Wiki. Lo stesso cognome è mostrato come una famiglia.",
    "part:sanctuary": "presbiterio",
    "part:crypt": "cripta",
    "part:sacristy": "sagrestia",
    "part:baptistery": "battistero",
    "part:transept": "transetto",
    "part:nave": "navata",
    "part:dome": "cupola",
    "part:campanile": "campanile",
    "part:cloister": "chiostro",
    "part:chapel": "cappella",
    "Relics of": "Reliquie di",
    "relic:body": "corpo",
    "relic:head": "capo",
    "relic:arm": "braccio",
    "relic:blood": "sangue",
    "relic:bones": "ossa",
    "relic:relic": "reliquia",
    "no longer here, the text says": "non è più qui, secondo il testo",
    "True Cross": "Vera Croce",
    "Holy Nails": "Santi Chiodi",
    "Crown of Thorns": "Corona di spine",
    "Column of the Flagellation": "Colonna della Flagellazione",
    "Holy Crib": "Sacra Culla",
    "Holy Stairs": "Scala Santa",
    "Veil of Veronica": "Velo della Veronica",
    "Titulus Crucis": "Titulus Crucis",
    "Relics read in the texts (\"the relics of St X\") and saints buried in the church. Not shown: {n} whose saint the texts do not name unambiguously, and those the texts say have left.": "Reliquie lette nei testi («le reliquie di san X») e santi sepolti nella chiesa. Non mostrate: {n} il cui santo i testi non nominano senza ambiguità, e quelle che secondo i testi non ci sono più.",
    "Where": "Dove",
    "zone:rione": "Centro storico (rioni)",
    "zone:outer": "Resto di Roma",
    "zone:vatican": "Vaticano",
    "zone:unknown": "Zona sconosciuta",
    "Rome here is Roma Capitale, the comune (1,287 km²), and Vatican City. The historic centre is the 22 rioni.": "Roma qui è Roma Capitale, il comune (1.287 km²), e la Città del Vaticano. Il centro storico sono i 22 rioni.",
    "Catalogue": "Catalogo",
    "Catalogue of works": "Catalogo delle opere",
    "with a photograph": "con foto",
    "{n} works in {c} churches, as catalogued in Wikidata. They follow the church filters; artists the texts only name are not works and are not here.": "{n} opere in {c} chiese, come le cataloga Wikidata. Seguono i filtri delle chiese; gli artisti che i testi citano soltanto non sono opere e non sono qui.",
    "Every work catalogued in the churches you are looking at": "Tutte le opere catalogate nelle chiese che stai guardando",
    "Follow the map": "Segui la mappa",
    "{n} in view": "{n} in vista",
    "The list shows only the churches the map is showing": "L'elenco mostra solo le chiese che mostra la mappa",
    "In the national catalogue": "Nel catalogo nazionale", "liturgical": "oggetto liturgico",
    "parts": "parti",
    "Every object the Italian state has catalogued in this church (ICCD, CC BY 4.0), with its place in the building. Each opens its record, with photographs.": "Ogni oggetto che lo Stato italiano ha catalogato in questa chiesa (ICCD, CC BY 4.0), con il suo posto nell'edificio. Ciascuno apre la sua scheda, con fotografie.",
    "{n} works in {c} churches, from Wikidata and the national catalogue (ICCD). They follow the church filters; artists the texts only name are not works and are not here.": "{n} opere in {c} chiese, da Wikidata e dal catalogo nazionale (ICCD). Seguono i filtri delle chiese; gli artisti che i testi citano soltanto non sono opere e non sono qui.",
    "Wikidata and the national catalogue": "Wikidata e catalogo nazionale",
    "Wikidata only": "Solo Wikidata",
    "Share this church": "Condividi questa chiesa",
    "only": "solo", "all": "tutto", "Relics": "Reliquie", "only in the Churches of Rome Wiki": "solo nella Churches of Rome Wiki", "outside the walls": "fuori le mura",
    "Built": "Costruita", "Consecrated": "Consacrata", "Artists": "Artisti", "Loading...": "Caricamento...",
    "relics": "reliquie", "a long text": "un testo lungo", "Read the whole entry": "Leggi la voce completa", "In the words of the Churches of Rome Wiki": "Con le parole della Churches of Rome Wiki", "paragraphs": "paragrafi", "Text": "Testo",
    "This church is only in the Churches of Rome Wiki: no position is known, so it is not on the map.": "Questa chiesa è solo nella Churches of Rome Wiki: la posizione non è nota, quindi non è sulla mappa.", "in": "in", "Funeral monuments": "Monumenti funebri",
    "commemorated by a monument here; Wikidata does not record them as buried here": "ricordati da un monumento qui; Wikidata non li registra come sepolti qui", "Events held here": "Avvenimenti che vi si sono svolti", "event": "avvenimento",
  },
};
const EN_ONLY = { "major_basilica": "Major basilica", "basilica": "Basilica", "cathedral": "Cathedral",
  "church": "Church", "oratory": "Oratory", "chapel": "Chapel", "standing": "In use", "former": "No longer a church",
  "ruin": "Ruin", "lost": "Lost", "part:sanctuary": "sanctuary", "part:crypt": "crypt", "part:sacristy": "sacristy",
  "part:baptistery": "baptistery", "part:transept": "transept", "part:nave": "nave", "part:dome": "dome",
  "part:campanile": "bell tower", "part:cloister": "cloister", "part:chapel": "chapel",
  "liturgical": "liturgical object", "zone:rione": "Historic centre (rioni)", "zone:outer": "Rest of Rome", "zone:vatican": "Vatican", "zone:unknown": "Zone unknown",
  "relic:body": "body", "relic:head": "head", "relic:arm": "arm", "relic:blood": "blood", "relic:bones": "bones", "relic:relic": "relic" };
let LANG = "en";
function t(s, vars) {
  let out = LANG === "en" ? (EN_ONLY[s] || s) : ((I18N[LANG] || {})[s] || EN_ONLY[s] || s);
  if (vars) for (const k in vars) out = out.replace("{" + k + "}", vars[k]);
  return out;
}
function applyI18n() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll(".langbtn").forEach(b => b.classList.toggle("active", b.dataset.lang === LANG));
}

// ------------------------------------------------------------------ helpers
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fold = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
// Wikidata writes Italian and Spanish labels in lower case ("basilica di San Pietro"); a heading is not.
function pick(n, lang = LANG) {
  if (!n) return "";
  const v = n[lang] || n.en || n.it || n.es || n.fr || Object.values(n)[0] || "";
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : "";
}
// Wikimedia serves a fixed ladder of thumbnail widths; asking for another one is slower and throttled.
const WIDTHS = [120, 250, 330, 500, 960, 1280];
function thumb(file, w = 330) {
  w = WIDTHS.find(x => x >= w) || 1280;
  return file ? "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=" + w : "";
}
// Wikimedia throttles a burst of thumbnails; a failed one is asked again once, a little later.
function img(file, w, cls, loading = "lazy") {
  return file ? `<img class="${cls}" src="${thumb(file, w)}" alt="" loading="${loading}" onerror="if(!this.dataset.r){this.dataset.r=1;const s=this.src;setTimeout(()=>{this.src=s+'&r=1'},1500)}else{this.style.visibility='hidden'}">` : "";
}
function credit(file) {
  const c = DB.credits[file];
  return c ? `${t("Photo")}: ${esc(c[0])} · ${esc(c[1])} · Wikimedia Commons` : "";
}
function yearStr(y) { return y == null ? "" : y <= 0 ? `${1 - y} ${t("BC")}` : String(y); }
function centuryOf(y) { return y == null ? null : y > 0 ? Math.ceil(y / 100) : -Math.ceil((1 - y) / 100); }
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
function centuryStr(c) { return c == null ? "" : c > 0 ? `${ROMAN[c] || c} ${t("century")}` : `${ROMAN[-c] || -c} ${t("century")} ${t("BC")}`; }
function dateStr(y, prec) {
  // A Wikidata date carries its precision (CONVENTIONS.md section 4a): 9 year, 8 decade, 7 century.
  if (y == null) return "";
  if (prec != null && prec <= 7) return centuryStr(centuryOf(y));
  if (prec === 8) return `${yearStr(y)}s`;
  return yearStr(y);
}
function toast(msg) { const el = $("#toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => el.hidden = true, 1800); }

// ------------------------------------------------------------------ data
let DB = null, BY_ID = new Map(), CHILDREN = new Map();
const KINDS = ["major_basilica", "basilica", "cathedral", "church", "oratory", "chapel", ""];
// The liturgical colours (Víctor, 2026-10-19: "colores con relación católica"). Basilicas wear the
// cardinal red, and a major basilica is the same red with the papal gold ring around it; the
// cathedral the bishop's violet; the church Marian blue (the green of Ordinary Time was hard to see on
// the map, Víctor 2026-10-20); the oratory the liturgical gold, darkened to read on the map; the
// chapel the rose of Gaudete and Laetare.
const KIND_COLOUR = { major_basilica: "#a3171c", basilica: "#a3171c", cathedral: "#5e2a7e", church: "#2f5f9e", oratory: "#9a7417", chapel: "#c56b8a", "": "#8a8178" };
const PAPAL_GOLD = "#d4a52a";
const STATUSES = ["", "former", "ruin", "lost"];
const FLAGS = ["national", "parish", "shrine", "pilgrimage", "cathedral", "osm_only", "wiki_only"];
const FLAG_LABEL = { osm_only: "only in OpenStreetMap", wiki_only: "only in the Churches of Rome Wiki" };
function flagLabel(f) { return t(FLAG_LABEL[f] || f); }

function kindKey(c) { return c.kind || ""; }
function statusKey(c) { return c.status || ""; }
function kindLabel(k) { return k ? t(k) : t("unknown kind"); }
function statusLabel(s) { return s ? t(s) : t("standing"); }

// The search text of a church: every name in every language, plus the names of what it holds.
function searchText(c) {
  const parts = [...Object.values(c.n || {}), ...(c.alt || []), c.w_artists || "", c.w_arch || ""];
  for (const q of [...(c.ded || []), ...(c.arch || []), ...(c.bur || [])]) { const p = DB.people[q]; if (p) parts.push(...Object.values(p.n || {})); }
  for (const q of c.art || []) { const w = DB.works[q]; if (w) { parts.push(...Object.values(w.n || {})); for (const a of w.by || []) { const p = DB.people[a]; parts.push(...Object.values((p && p.n) || DB.terms[a] || {})); } } }
  for (const q of c.ma || []) parts.push(...Object.values(DB.people[q]?.n || {}));
  if (c.dist != null) parts.push(DB.districts[c.dist]);
  if (c.muni != null) parts.push(DB.districts[c.muni]);
  return fold(parts.join(" | "));
}

// ------------------------------------------------------------------ state + the one predicate
const state = {
  follow: true, x: "", g: false, gk: new Set(), gimg: false, go: "fame", fam: "", rel: "", zones: new Set(), q: "", kinds: new Set(), status: new Set(), flags: new Set(), holds: new Set(),
  dist: "", yr: [null, null], by: "", ded: "", arch: "", who: "", sel: "", order: "fame",
};
const DIMENSIONS = [
  { id: "q", on: () => state.q, test: c => qMatch(c._s) },
  { id: "kind", on: () => state.kinds.size, test: c => !state.kinds.has(kindKey(c)) },
  { id: "status", on: () => state.status.size, test: c => !state.status.has(statusKey(c)) },
  { id: "flags", on: () => state.flags.size, test: c => [...state.flags].every(f => (c.flags || []).includes(f)) },
  { id: "holds", on: () => state.holds.size, test: c => [...state.holds].every(h => holds(c, h)) },
  { id: "dist", on: () => state.dist !== "", test: c => String(c.dist ?? c.muni ?? "") === state.dist || String(c.muni ?? "") === state.dist },
  // Unknown passes, or it says it did not (CHASSIS.md section 3): an undated church passes the year filter.
  { id: "yr", on: () => state.yr[0] != null || state.yr[1] != null, test: c => c.y == null || ((state.yr[0] == null || c.y >= state.yr[0]) && (state.yr[1] == null || c.y <= state.yr[1])) },
  { id: "by", on: () => state.by, test: c => (c.art || []).some(w => (DB.works[w]?.by || []).includes(state.by)) || (c.ma || []).includes(state.by) },
  { id: "ded", on: () => state.ded, test: c => (c.ded || []).includes(state.ded) },
  { id: "zone", on: () => state.zones.size, test: c => state.zones.has(c.zt || "") },
  { id: "rel", on: () => state.rel, test: c => (c.rl || []).some(r => r.q === state.rel && !r.gone) },
  { id: "fam", on: () => state.fam, test: c => (c.parts || []).some(pid => DB.parts[pid]?.fk === state.fam) },
  { id: "arch", on: () => state.arch, test: c => (c.arch || []).includes(state.arch) },
  { id: "who", on: () => state.who, test: c => (c.bur || []).includes(state.who) },
];
function holds(c, h) {
  if (h === "art") return (c.art || []).length > 0;
  if (h === "bur") return (c.bur || []).length > 0;
  if (h === "tit") return (c.tit || []).length > 0 || !!c.titular;
  if (h === "img") return !!c.img;
  if (h === "oh") return !!(c.oh || c.svc);
  if (h === "rel") return !!(c.rl || []).length || !!c.w_nrel || (c.art || []).some(w => DB.works[w]?.kind === "relic");
  if (h === "wiki") return !!c.wiki;
  if (h === "named") return !!(c.ma || []).length;
  return false;
}
// "brera cara" means both words; "a or b", "a, b" and "a | b" are alternatives (PRACTICES.md 2.1).
let Q_ALTS = [];
function parseQ(q) {
  q = fold(q).trim();
  if (!q) return [];
  const quoted = /^".*"$/.test(q);
  if (quoted) return [[q.slice(1, -1)]];
  return q.split(/\s+or\s+|,|\|/).map(a => a.trim().split(/\s+/).filter(Boolean)).filter(a => a.length);
}
function qMatch(s) { return Q_ALTS.some(words => words.every(w => s.includes(w))); }
function passes(c, except) {
  for (const d of DIMENSIONS) if (d.id !== except && d.on() && !d.test(c)) return false;
  return true;
}

// ------------------------------------------------------------------ map
let map, layer, meLayer, markers = new Map(), rings = new Map(), renderer;
// Size says how many Wikipedias write about the church; it shrinks when zoomed out so the centre,
// where hundreds of churches stand within a kilometre, does not become one blot.
function radius(c) {
  const z = map ? map.getZoom() : 13;
  const k = z >= 16 ? 1 : z >= 15 ? 0.8 : z >= 14 ? 0.62 : z >= 13 ? 0.5 : 0.4;
  return Math.max(2.5, (3 + Math.min(10, Math.sqrt(c.sl || 0) * 1.2)) * k);
}
function styleFor(c, sel) {
  const col = KIND_COLOUR[kindKey(c)];
  const s = statusKey(c);
  // an approximate position (a street, a "present site") is drawn faint: it says where to look, not where it is
  const faint = c.apx ? 0.45 : 1;
  return {
    radius: radius(c) + (sel ? 3 : 0), color: sel ? "#111" : (s ? col : "#fff"), weight: sel ? 3 : (s ? 2 : 1),
    opacity: faint, fillColor: col, fillOpacity: (s === "" ? 0.9 : s === "former" ? 0.25 : 0.05) * faint,
    dashArray: s === "lost" ? "3 3" : s === "ruin" ? "1 3" : null, renderer,
  };
}
function initMap() {
  renderer = L.canvas({ padding: 0.3, tolerance: 6 });
  map = L.map("map", { zoomControl: true, preferCanvas: true }).setView([41.895, 12.48], 13);
  // OpenStreetMap tiles, quietened in CSS (.leaflet-tile-pane) so the churches are what the eye finds first.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  map.on("zoomend", () => { for (const [id, m] of markers) { const c = BY_ID.get(id); m.setRadius(radius(c) + (id === state.sel ? 3 : 0)); } for (const [id, r] of rings) r.setRadius(radius(BY_ID.get(id)) + 4); });
  layer = L.layerGroup().addTo(map);
  meLayer = L.layerGroup().addTo(map);
  let viewTimer;
  map.on("moveend", () => {
    if (!booted) return;
    saveURL();
    if (!state.follow) return;
    clearTimeout(viewTimer);
    viewTimer = setTimeout(() => { computeView(); renderLegend(); if (!state.sel) renderList(); if (state.x) renderExplore(); renderGallery(); }, 120);
  });
}
const TOUCH = matchMedia("(hover: none)").matches;
let tappedOnce = "";
function tipHTML(c) {
  const bits = [kindLabel(kindKey(c)), c.y != null ? dateStr(c.y, c.yp) : "", c.dist != null ? DB.districts[c.dist] : ""].filter(Boolean);
  const cnt = [(c.art || []).length ? `${c.art.length} ${t("works")}` : "", (c.bur || []).length ? `${c.bur.length} ${t("burials")}` : ""].filter(Boolean);
  return `${c.img ? `<div class="tim" style="background-image:url('${thumb(c.img, 300)}')"></div>` : ""}<b>${esc(pick(c.n) || c.id)}</b><span>${esc(bits.join(" · "))}${c.status ? " · " + esc(statusLabel(c.status)) : ""}</span>${cnt.length ? `<span>${esc(cnt.join(" · "))}</span>` : ""}${TOUCH ? `<span><a href="#" data-open="${c.id}">${t("Open the church")}</a></span>` : ""}`;
}
function drawMap(list) {
  layer.clearLayers();
  markers.clear();
  rings.clear();
  for (const c of list) {
    if (!c.ll) continue;
    const m = L.circleMarker(c.ll, styleFor(c, c.id === state.sel));
    m.bindTooltip(() => tipHTML(c), { className: "tip", direction: "top", offset: [0, -4], interactive: TOUCH });
    m.on("click", () => {
      // On touch, the first tap shows the same bubble a mouse would see; the second opens (CONVENTIONS.md 2c).
      if (TOUCH && tappedOnce !== c.id) { tappedOnce = c.id; m.openTooltip(); return; }
      tappedOnce = "";
      openCard(c.id, { push: true, pan: false });
    });
    if (kindKey(c) === "major_basilica") {
      rings.set(c.id, L.circleMarker(c.ll, { radius: radius(c) + 4, color: PAPAL_GOLD, weight: 3, fill: false, interactive: false, renderer }).addTo(layer));
    }
    m.addTo(layer);
    markers.set(c.id, m);
  }
}
document.addEventListener("click", e => {
  const a = e.target.closest("[data-open]");
  if (a) { e.preventDefault(); openCard(a.dataset.open, { push: true, pan: true }); }
});

// ------------------------------------------------------------------ the panel: chips, filters, list
function counts(except, key) {
  const out = new Map();
  for (const c of DB.churches) if (passes(c, except)) { const k = key(c); out.set(k, (out.get(k) || 0) + 1); }
  return out;
}
// "only": show just this value instead of unticking all the others. Pressed again on the value that
// is already alone, it brings everything back.
function onlyBtn(dim, v, off, all) {
  const alone = all.every(x => x === v || off.has(x)) && !off.has(v);
  return `<span class="only" data-only-${dim}="${v}" role="button" title="${esc(alone ? t("Show everything") : t("only"))}">${esc(alone ? t("all") : t("only"))}</span>`;
}
function setOnly(set, v, all) {
  const alone = all.every(x => x === v || set.has(x)) && !set.has(v);
  set.clear();
  if (!alone) for (const x of all) if (x !== v) set.add(x);
}
function renderKinds() {
  const n = counts("kind", kindKey);
  $("#kinds").innerHTML = KINDS.filter(k => n.get(k) || state.kinds.has(k)).map(k =>
    `<button type="button" class="chip ${state.kinds.has(k) ? "off" : ""}" data-kind="${k}"><span class="dot" style="background:${KIND_COLOUR[k]}${k === "major_basilica" ? `;box-shadow:0 0 0 2px ${PAPAL_GOLD}` : ""}"></span>${esc(kindLabel(k))} <span class="n">${n.get(k) || 0}</span>${onlyBtn("kind", k, state.kinds, KINDS)}</button>`).join("");
}
function renderMore() {
  const box = $("#more");
  const ns = counts("status", statusKey);
  const status = STATUSES.filter(s => ns.get(s) || state.status.has(s)).map(s => `<button type="button" class="chip ${state.status.has(s) ? "off" : ""}" data-status="${s}">${esc(statusLabel(s))} <span class="n">${ns.get(s) || 0}</span>${onlyBtn("status", s, state.status, STATUSES)}</button>`).join("");
  const holdsN = h => DB.churches.filter(c => passes(c, "holds") && holds(c, h)).length;
  const hl = [["art", "works of art"], ["bur", "burials"], ["rel", "relics"], ["tit", "a cardinal title"], ["img", "a photo"], ["oh", "opening hours"], ["wiki", "a long text"], ["named", "artists named in the texts"]]
    .map(([h, l]) => { const n = holdsN(h); return `<button type="button" class="chip ${state.holds.has(h) ? "on" : ""}" data-holds="${h}" ${n || state.holds.has(h) ? "" : "disabled"}>${esc(t(l))} <span class="n">${n}</span></button>`; }).join("");
  const flagN = f => DB.churches.filter(c => passes(c, "flags") && (c.flags || []).includes(f)).length;
  const fl = FLAGS.map(f => { const n = flagN(f); return `<button type="button" class="chip ${state.flags.has(f) ? "on" : ""}" data-flag="${f}" ${n || state.flags.has(f) ? "" : "disabled"}>${esc(flagLabel(f))} <span class="n">${n}</span></button>`; }).join("");
  const nd = new Map();
  for (const c of DB.churches) if (passes(c, "dist")) for (const k of new Set([c.dist, c.muni])) if (k != null) nd.set(k, (nd.get(k) || 0) + 1);
  const opts = [...nd.keys()].sort((a, b) => DB.districts[a].localeCompare(DB.districts[b]))
    .map(k => `<option value="${k}" ${String(k) === state.dist ? "selected" : ""}>${esc(DB.districts[k])} (${nd.get(k)})</option>`).join("");
  const nz = counts("zone", c => c.zt || "");
  const zones = ["rione", "outer", "vatican", ""].filter(z => nz.get(z) || state.zones.has(z)).map(z => `<button type="button" class="chip ${state.zones.has(z) ? "on" : ""}" data-zone="${z}">${esc(t("zone:" + (z || "unknown")))} <span class="n">${nz.get(z) || 0}</span></button>`).join("");
  box.innerHTML = `<h4>${t("Where")}</h4><div class="chips">${zones}</div><p class="note">${esc(t("Rome here is Roma Capitale, the comune (1,287 km²), and Vatican City. The historic centre is the 22 rioni."))}</p>
    <h4>${t("State")}</h4><div class="chips">${status}</div>
    <h4>${t("Holds")}</h4><div class="chips">${hl}</div>
    <h4>${t("Also")}</h4><div class="chips">${fl}</div>
    <h4>${t("District")}</h4><select id="dist"><option value="">${t("any district")}</option>${opts}</select>
    <h4>${t("Founded")}</h4><div class="yr-row">${t("from")} <input type="number" id="yr0" value="${state.yr[0] ?? ""}" placeholder="300"> ${t("to")} <input type="number" id="yr1" value="${state.yr[1] ?? ""}" placeholder="2026"></div>
    <p class="note">${esc(t("no year recorded"))}: ${DB.churches.filter(c => c.y == null).length}</p>`;
  const sum = [];
  for (const z of state.zones) sum.push(t("zone:" + (z || "unknown")));
  if (state.status.size) sum.push(t("State"));
  for (const h of state.holds) sum.push(t({ art: "works of art", bur: "burials", rel: "relics", tit: "a cardinal title", img: "a photo", oh: "opening hours", wiki: "a long text", named: "artists named in the texts" }[h]));
  for (const f of state.flags) sum.push(flagLabel(f));
  if (state.dist) sum.push(DB.districts[+state.dist]);
  if (state.yr[0] != null || state.yr[1] != null) sum.push(`${state.yr[0] ?? ""}–${state.yr[1] ?? ""}`);
  $("#more-sum").textContent = sum.length ? "· " + sum.join(" · ") : "";
}
function renderActive() {
  const chips = [];
  if (state.by) chips.push(["by", `${t("Art by")} ${personName(state.by)}`]);
  if (state.ded) chips.push(["ded", `${t("Dedicated to:")} ${personName(state.ded)}`]);
  if (state.rel) chips.push(["rel", `${t("Relics of")} ${relicName(state.rel)}`]);
  if (state.fam) chips.push(["fam", `${t("Family")}: ${DB.families[state.fam]?.n || state.fam}`]);
  if (state.arch) chips.push(["arch", `${t("Architect")}: ${personName(state.arch)}`]);
  if (state.who) chips.push(["who", `${t("Buried:")} ${personName(state.who)}`]);
  const any = chips.length || state.q || state.kinds.size || state.status.size || state.flags.size || state.holds.size || state.dist || state.arch || state.fam || state.rel || state.zones.size || state.yr[0] != null || state.yr[1] != null;
  $("#active").innerHTML = chips.map(([k, l]) => `<button type="button" class="chip" data-unset="${k}">${esc(l)} ✕</button>`).join("") +
    (any ? `<button type="button" class="chip" data-unset="all">${t("Show everything")}</button>` : "");
}
function personName(q) { return pick(DB.people[q]?.n || DB.terms[q]) || q; }

let LIMIT = 150;
function sortChurches(list) {
  if (state.order === "name") return list.sort((a, b) => pick(a.n).localeCompare(pick(b.n)));
  if (state.order === "year") return list.sort((a, b) => (a.y ?? 9999) - (b.y ?? 9999));
  return list;  // the bundle arrives ordered by fame
}
function rowHTML(c) {
  const bits = [kindLabel(kindKey(c)), c.status ? statusLabel(c.status) : "", c.y != null ? dateStr(c.y, c.yp) : "", c.dist != null ? DB.districts[c.dist] : (c.muni != null ? DB.districts[c.muni] : "")].filter(Boolean);
  const cnt = [(c.art || []).length ? `🖼 ${c.art.length}` : "", (c.bur || []).length ? `✝ ${c.bur.length}` : ""].filter(Boolean).join(" ");
  return `<div class="row ${c.id === state.sel ? "sel" : ""}" data-id="${c.id}">${c.img ? `${img(c.img, 120, "thumb")}` : `<div class="thumb ph">✚</div>`}<div class="t"><b>${esc(pick(c.n) || c.id)}</b><span>${esc(bits.join(" · "))}</span></div><div class="cnt">${cnt}</div></div>`;
}
let CURRENT = [];
// The list, Explore and the catalogue follow the map (as in the other atlases): VIEWSET is CURRENT cut
// to what the map shows. The map itself draws all of CURRENT, so a pan never makes dots vanish at the
// edges. A church with no position cannot be in view: with "follow the map" off, the list has them all.
let VIEWSET = [];
function computeView() {
  if (!state.follow || !map) { VIEWSET = CURRENT; return; }
  const b = map.getBounds();
  VIEWSET = CURRENT.filter(c => c.ll && b.contains(c.ll));
}
function render() {
  Q_ALTS = parseQ(state.q);
  CURRENT = DB.churches.filter(c => passes(c));
  renderKinds();
  if (!$("#more").hidden) renderMore(); else renderMore();
  renderActive();
  drawMap(CURRENT);
  computeView();
  renderLegend();
  renderList();
  renderGallery();
  saveURL();
}
function renderLegend() {
  const placeless = CURRENT.filter(c => !c.ll).length;
  const follow = `<button type="button" class="chip ${state.follow ? "on" : ""}" data-follow="1" title="${esc(t("The list shows only the churches the map is showing"))}">⌖ ${esc(t("Follow the map"))}</button>`;
  $("#legend").innerHTML = `${follow} ${state.follow ? esc(t("{n} in view", { n: VIEWSET.length })) + " · " : ""}${esc(t("{n} of {t} churches", { n: CURRENT.length, t: DB.churches.length }))}. ${esc(t("Dot: one church; size: how many Wikipedias write about it; colour: kind; hollow: no longer a church; dashed: lost; faint: approximate position."))}${placeless ? " " + esc(t("{n} without a position, listed but not on the map", { n: placeless })) + "." : ""}`;
}
function renderList() {
  const box = $("#list");
  if (state.x) renderExplore();
  const list = sortChurches([...VIEWSET]);
  if (!list.length) { box.innerHTML = `<p class="empty">${t("Nothing matches.")} <a href="#" data-unset="all">${t("Show everything")}</a></p>`; return; }
  const order = ["fame", "name", "year"].map(o => `<button type="button" class="chip ${state.order === o ? "on" : ""}" data-order="${o}">${t({ fame: "by fame", name: "by name", year: "by year" }[o])}</button>`).join("");
  box.innerHTML = `<div class="chips" style="padding:6px 12px">${order}</div>` + list.slice(0, LIMIT).map(rowHTML).join("") +
    (list.length > LIMIT ? `<a class="more-link" data-more="1">${t("Show more")} (${list.length - LIMIT})</a>` : "");
}
// The three index views read VIEWSET, so they agree with the map and the counts (one predicate).
function renderArtists(box) {
  const agg = new Map();
  const get = a => { if (!agg.has(a)) agg.set(a, { works: new Set(), churches: new Set(), named: new Set() }); return agg.get(a); };
  for (const c of VIEWSET) for (const w of c.art || []) for (const a of DB.works[w]?.by || []) { const e = get(a); e.works.add(w); e.churches.add(c.id); }
  for (const c of VIEWSET) for (const a of c.ma || []) { const e = get(a); e.named.add(c.id); e.churches.add(c.id); }
  const rows = [...agg.entries()].sort((a, b) => b[1].churches.size - a[1].churches.size || b[1].works.size - a[1].works.size || personName(a[0]).localeCompare(personName(b[0])));
  const nw = new Set(VIEWSET.flatMap(c => c.art || [])).size;
  box.innerHTML = `<p class="note" style="padding:6px 12px">${esc(t("{n} works in {c} churches", { n: nw, c: VIEWSET.filter(c => (c.art || []).length).length }))}. ${esc(t("Counting also the churches whose texts name the artist."))}</p>` +
    rows.slice(0, 400).map(([a, e]) => { const p = DB.people[a]; return `<div class="row" data-by="${a}">${p?.img ? `${img(p.img, 120, "thumb")}` : `<div class="thumb ph">🖌</div>`}<div class="t"><b>${esc(personName(a))}</b><span>${p?.b != null || p?.d != null ? esc(`${yearStr(p.b)}–${yearStr(p.d)}`) : ""}</span></div><div class="cnt">${e.churches.size} ${t("churches")}<br>${e.works.size ? `${e.works.size} ${t("works")}` : ""}</div></div>`; }).join("") ||
    `<p class="empty">${t("Nothing matches.")}</p>`;
}
let PEOPLE_TAG = "";
function renderPeople(box) {
  const agg = new Map();
  for (const c of VIEWSET) for (const p of c.bur || []) { const e = agg.get(p) || []; e.push(c.id); agg.set(p, e); }
  const tags = ["", "pope", "cardinal", "saint", "artist", "musician", "writer"];
  const tagN = tg => [...agg.keys()].filter(p => !tg || (DB.people[p]?.tags || []).includes(tg)).length;
  let rows = [...agg.entries()].filter(([p]) => !PEOPLE_TAG || (DB.people[p]?.tags || []).includes(PEOPLE_TAG));
  rows.sort((a, b) => (DB.people[b[0]]?.sl || 0) - (DB.people[a[0]]?.sl || 0));
  box.innerHTML = `<div class="chips" style="padding:6px 12px">${tags.map(tg => `<button type="button" class="chip ${PEOPLE_TAG === tg ? "on" : ""}" data-ptag="${tg}">${esc(tg ? t(tg) : t("everyone"))} <span class="n">${tagN(tg)}</span></button>`).join("")}</div>
    <p class="note" style="padding:0 12px">${esc(t("{n} people in {c} churches", { n: agg.size, c: VIEWSET.filter(c => (c.bur || []).length).length }))}</p>` +
    rows.slice(0, 500).map(([q, cs]) => { const p = DB.people[q] || {}; const c = BY_ID.get(cs[0]); return `<div class="row" data-open="${cs[0]}">${p.img ? `${img(p.img, 120, "thumb")}` : `<div class="thumb ph">✝</div>`}<div class="t"><b>${esc(pick(p.n) || q)}${(p.tags || []).map(tg => `<span class="tag ${tg}">${esc(t(tg))}</span>`).join("")}</b><span>${esc([p.b != null || p.d != null ? `${yearStr(p.b)}–${yearStr(p.d)}` : "", pick(c?.n)].filter(Boolean).join(" · "))}</span></div></div>`; }).join("");
}
// The families that founded or owned chapels, as the wiki names them: one row per family name.
function relicName(q) { return q.startsWith("relic:") ? t(DB.passion[q] || q) : personName(q); }
// Relics by whose they are: a saint (or a relic of the Passion) and the churches that keep one.
function renderRelics(box) {
  const agg = new Map();
  let unlinked = 0;
  for (const c of VIEWSET) for (const r of c.rl || []) {
    if (r.gone) continue;
    if (!r.q) { unlinked++; continue; }
    if (!agg.has(r.q)) agg.set(r.q, { cs: new Set(), kinds: new Set() });
    agg.get(r.q).cs.add(c.id); agg.get(r.q).kinds.add(r.k);
  }
  const rows = [...agg.entries()].sort((a, b) => b[1].cs.size - a[1].cs.size || relicName(a[0]).localeCompare(relicName(b[0])));
  box.innerHTML = `<p class="note" style="padding:6px 12px">${esc(t("Relics read in the texts (\"the relics of St X\") and saints buried in the church. Not shown: {n} whose saint the texts do not name unambiguously, and those the texts say have left.", { n: unlinked }))}</p>` +
    (rows.map(([q, e]) => { const p = DB.people[q]; return `<div class="row" data-rel="${q}">${p?.img ? img(p.img, 120, "thumb") : `<div class="thumb ph">${q.startsWith("relic:") ? "✝" : "✶"}</div>`}<div class="t"><b>${esc(relicName(q))}</b><span>${esc([...e.kinds].map(k => t("relic:" + k)).join(" · "))}</span></div><div class="cnt">${e.cs.size} ${t("churches")}</div></div>`; }).join("") ||
     `<p class="empty">${t("Nothing matches.")}</p>`);
}
function renderFamilies(box) {
  const inView = new Set(VIEWSET.map(c => c.id));
  const rows = Object.entries(DB.families).map(([fk, f]) => {
    const parts = f.parts.filter(pid => inView.has(DB.parts[pid]?.c));
    return [fk, f, parts, new Set(parts.map(pid => DB.parts[pid].c))];
  }).filter(r => r[2].length).sort((a, b) => b[3].size - a[3].size || b[2].length - a[2].length || a[1].n.localeCompare(b[1].n));
  box.innerHTML = `<p class="note" style="padding:6px 12px">${esc(t("Families who founded or owned a chapel, as the Churches of Rome Wiki names them. The same name is shown as one family."))}</p>` +
    (rows.map(([fk, f, parts, cs]) => `<div class="row" data-fam="${fk}"><div class="thumb ph">⚜</div><div class="t"><b>${esc(f.n)}</b><span>${esc(parts.map(pid => DB.parts[pid].n).slice(0, 3).join(" · "))}</span></div><div class="cnt">${parts.length} ${t("chapels")}<br>${cs.size} ${t("churches")}</div></div>`).join("") ||
     `<p class="empty">${t("Nothing matches.")}</p>`);
}
function renderSaints(box) {
  const agg = new Map();
  for (const c of VIEWSET) for (const s of c.ded || []) { const e = agg.get(s) || []; e.push(c.id); agg.set(s, e); }
  const rows = [...agg.entries()].sort((a, b) => b[1].length - a[1].length || personName(a[0]).localeCompare(personName(b[0])));
  box.innerHTML = `<p class="note" style="padding:6px 12px">${esc(t("{n} saints and dedications", { n: agg.size }))}</p>` +
    rows.map(([q, cs]) => { const p = DB.people[q] || {}; return `<div class="row" data-ded="${q}">${p.img ? `${img(p.img, 120, "thumb")}` : `<div class="thumb ph">✶</div>`}<div class="t"><b>${esc(personName(q))}</b><span>${esc(pick(p.desc) || "")}</span></div><div class="cnt">${cs.length} ${t("churches")}</div></div>`; }).join("");
}

// ------------------------------------------------------------------ Explorar
// The map and the list are always churches. Explorar is the other way in: by artist, by saint, by
// who is buried there. Every row leads back to churches, as a filter chip or as one church's card,
// and every index counts only the churches the current filters let through.
const EXPLORE = [["artists", "Artists"], ["saints", "Saints"], ["relics", "Relics"], ["families", "Families"], ["people", "Buried"]];
function openExplore(x, push = true) {
  state.x = x || state.x || "artists";
  if (state.sel) closeCard(false);
  $("#explore").hidden = false;
  if (!PHONE()) $("#panel-list").hidden = true;
  document.body.classList.toggle("sheet-open", PHONE());
  renderExplore();
  saveURL(push);
  litTop();
}
function closeExplore(push = true) {
  state.x = "";
  $("#explore").hidden = true;
  $("#panel-list").hidden = false;
  document.body.classList.remove("sheet-open");
  saveURL(push);
  litTop();
}
function renderExplore() {
  const box = $("#explore");
  const n = VIEWSET.length;
  box.innerHTML = `<div class="card-top"><b class="ex-title">${t("Explore")}</b><button type="button" class="card-x" data-exclose="1" aria-label="${esc(t("Close"))}">✕</button></div>
    <div class="ex-tabs">${EXPLORE.map(([k, l]) => `<button type="button" class="view-btn ${state.x === k ? "active" : ""}" data-x="${k}">${esc(t(l))}</button>`).join("")}</div>
    <p class="note ex-scope">${esc(t("Within the {n} churches the filters show. Choosing a row shows its churches.", { n }))}</p>
    <div id="ex-body" class="list ex-body"></div>`;
  const body = $("#ex-body");
  if (state.x === "saints") renderSaints(body);
  else if (state.x === "people") renderPeople(body);
  else if (state.x === "families") renderFamilies(body);
  else if (state.x === "relics") renderRelics(body);
  else renderArtists(body);
}

// ------------------------------------------------------------------ the national catalogue (ICCD)
// The Catalogo generale dei Beni Culturali, joined church by church (build.py join_iccd_sites). It
// arrives after the map, in a file of its own: [title, kind, date, artist ids, other names, position,
// record id, number of components, material].
let ICCD = null;
async function loadIccd() {
  try { ICCD = await (await fetch(`romechurches/data/iccd.json?v=${DATA_V}`)).json(); } catch (e) { ICCD = { works: {}, by_church: {} }; return; }
  if (state.sel) renderCard(BY_ID.get(state.sel));
  renderGallery();
}
const ICCD_PAGE = id => `https://catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/${id}`;
function iccdSection(c) {
  if (!c.niccd) return "";
  if (!ICCD) return `<div class="sec"><h3>${t("In the national catalogue")} · ${c.niccd}</h3><p class="note">${t("Loading...")}</p></div>`;
  const ids = ICCD.by_church[c.id] || [];
  const groups = new Map();
  for (const id of ids) { const k = ICCD.works[id][1]; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(id); }
  const order = ["painting", "fresco", "sculpture", "tomb", "mosaic", "altar", "relic", "liturgical", "object", "architecture", "other"];
  const li = id => {
    const [title, , date, qs, names, pos, page, ncomp] = ICCD.works[id];
    const who = [...qs.map(q => `<span class="pill noimg" data-by="${q}">${esc(personName(q))}</span>`), ...names.map(n => esc(n))].join(" ");
    return `<li><div class="w"><b><a href="${ICCD_PAGE(page)}" target="_blank" rel="noopener">${esc(title)}</a></b> ${who}<span>${esc([date, pos, ncomp ? `${ncomp} ${t("parts")}` : ""].filter(Boolean).join(" · "))}</span></div></li>`;
  };
  return `<div class="sec"><h3>${t("In the national catalogue")} · ${ids.length}</h3><p class="note">${esc(t("Every object the Italian state has catalogued in this church (ICCD, CC BY 4.0), with its place in the building. Each opens its record, with photographs."))}</p>` +
    [...groups].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([k, list]) =>
      `<details class="wmore"${groups.size === 1 ? " open" : ""}><summary><b>${esc(t(k))}</b> · ${list.length}</summary><ul class="people iccd">${list.slice(0, 300).map(li).join("")}</ul>${list.length > 300 ? `<p class="note">+${list.length - 300}</p>` : ""}</details>`).join("") + `</div>`;
}

// ------------------------------------------------------------------ the catalogue of works
// Every catalogued work in the churches the filters show, as a gallery. It is a view of the same
// churches (one predicate): narrowing the churches narrows the works. Its own controls only choose
// among the works: kind, photograph, order. Events (a conclave) are not works and are not here.
const GKINDS = ["painting", "fresco", "sculpture", "tomb", "mosaic", "altar", "relic", "liturgical", "object", "architecture", "other", ""];
let GLIMIT = 120;
function galleryWorks() {
  const seen = new Map();
  if (ICCD && state.gsrc !== "wd") for (const c of VIEWSET) for (const id of ICCD.by_church[c.id] || []) {
    const x = ICCD.works[id];
    if (state.by && !x[3].includes(state.by)) continue;
    seen.set("iccd:" + id, c.id);
  }
  for (const c of VIEWSET) for (const w of c.art || []) {
    const x = DB.works[w];
    if (!x || seen.has(w)) continue;
    if (state.by && !(x.by || []).includes(state.by) && !(c.ma || []).includes(state.by)) continue;
    seen.set(w, c.id);
  }
  return [...seen];
}
function workOf(w) {
  if (!w.startsWith("iccd:")) return DB.works[w];
  const x = ICCD.works[w.slice(5)];
  return { n: { it: x[0] }, kind: x[1], by: x[3], names: x[4], y: parseInt(x[2]) || null, yp: 7, sl: 0, iccd: x[6], date: x[2], pos: x[5] };
}
function gpasses(w) {
  const x = workOf(w);
  if (state.gk.size && !state.gk.has(x.kind || "")) return false;
  if (state.gimg && !x.img) return false;
  return true;
}
function openGallery(push = true) {
  state.g = true;
  if (state.sel) closeCard(false);
  if (state.x) closeExplore(false);
  $("#gallery").hidden = false;
  document.body.classList.toggle("sheet-open", PHONE());
  GLIMIT = 120;
  renderGallery();
  saveURL(push);
  litTop();
}
function closeGallery(push = true) {
  state.g = false;
  $("#gallery").hidden = true;
  document.body.classList.remove("sheet-open");
  saveURL(push);
  litTop();
}
function renderGallery() {
  if (!state.g) return;
  const all = galleryWorks();
  const kc = new Map();
  for (const [w] of all) { const k = workOf(w).kind || ""; kc.set(k, (kc.get(k) || 0) + 1); }
  let list = all.filter(([w]) => gpasses(w));
  const yr = w => workOf(w).y ?? 9999;
  if (state.go === "year") list.sort((a, b) => yr(a[0]) - yr(b[0]));
  else list.sort((a, b) => (workOf(b[0]).sl || 0) - (workOf(a[0]).sl || 0) || (workOf(b[0]).img ? 1 : 0) - (workOf(a[0]).img ? 1 : 0));
  const nimg = all.filter(([w]) => workOf(w).img).length;
  const chips = GKINDS.filter(k => kc.get(k) || state.gk.has(k)).map(k => `<button type="button" class="chip ${state.gk.has(k) ? "on" : ""}" data-gk="${k}">${esc(k ? t(k) : t("unknown kind"))} <span class="n">${kc.get(k) || 0}</span></button>`).join("");
  const cell = ([w, cid]) => {
    const x = workOf(w), c = BY_ID.get(cid);
    const by = [...(x.by || []).map(personName), ...(x.names || [])].join(", ");
    if (w.startsWith("iccd:")) return `<div class="gcell"><a class="gimg" href="${ICCD_PAGE(x.iccd)}" target="_blank" rel="noopener"><div class="im ph iccdph">${esc(t(x.kind || "other"))}<small>ICCD</small></div></a>
      <b>${esc(pick(x.n))}</b><span>${esc([by, x.date].filter(Boolean).join(" · "))}</span>
      <a href="#" class="gchurch" data-open="${cid}">${esc(pick(c?.n))}</a></div>`;
    return `<div class="gcell"><button type="button" class="gimg" data-work="${w}" data-wc="${cid}">${x.img ? img(x.img, 330, "im") : `<div class="im ph">🖼</div>`}</button>
      <b>${esc(pick(x.n) || w)}</b><span>${esc([by, dateStr(x.y, x.yp)].filter(Boolean).join(" · "))}</span>
      <a href="#" class="gchurch" data-open="${cid}">${esc(pick(c?.n))}</a></div>`;
  };
  $("#gallery").innerHTML = `<div class="card-top"><b class="ex-title">${t("Catalogue of works")}</b><button type="button" class="card-x" data-gclose="1" aria-label="${esc(t("Close"))}">✕</button></div>
    <div class="gctl"><div class="chips">${chips}</div>
      <div class="chips"><button type="button" class="chip ${state.gimg ? "on" : ""}" data-gimg="1">${t("with a photograph")} <span class="n">${nimg}</span></button>
      ${["fame", "year"].map(o => `<button type="button" class="chip ${state.go === o ? "on" : ""}" data-go="${o}">${t({ fame: "by fame", year: "by year" }[o])}</button>`).join("")}</div>
      <p class="note">${esc(t("{n} works in {c} churches, from Wikidata and the national catalogue (ICCD). They follow the church filters; artists the texts only name are not works and are not here.", { n: list.length, c: new Set(list.map(e => e[1])).size }))}</p>
      <div class="chips">${[["all", "Wikidata and the national catalogue"], ["wd", "Wikidata only"]].map(([k, l]) => `<button type="button" class="chip ${(state.gsrc || "all") === k ? "on" : ""}" data-gsrc="${k}">${esc(t(l))}</button>`).join("")}</div></div>
    <div class="ggrid">${list.slice(0, GLIMIT).map(cell).join("") || `<p class="empty">${t("Nothing matches.")}</p>`}</div>
    ${list.length > GLIMIT ? `<a class="more-link" data-gmore="1">${t("Show more")} (${list.length - GLIMIT})</a>` : ""}`;
}
// one work, large: the picture, its credit, what it is, and the way to its church
function openWork(w, cid) {
  const x = DB.works[w], c = BY_ID.get(cid);
  const by = (x.by || []).map(q => `<span class="pill ${DB.people[q]?.img ? "" : "noimg"}" data-by="${q}">${DB.people[q]?.img ? `<img src="${thumb(DB.people[q].img, 120)}" alt="">` : ""}${esc(personName(q))}</span>`).join("");
  const box = $("#lightbox");
  box.innerHTML = `<div class="lb-card"><button type="button" class="card-x lb-x" data-lbclose="1" aria-label="${esc(t("Close"))}">✕</button>
    ${x.img ? `<div class="lb-img">${img(x.img, 960, "", "eager")}</div><div class="credit">${credit(x.img)}</div>` : ""}
    <div class="lb-body"><h2>${esc(pick(x.n) || w)}</h2>
      <p class="meta">${x.kind ? `<span class="badge">${esc(t(x.kind))}</span>` : ""} ${esc(dateStr(x.y, x.yp))}</p>
      <div>${by}</div>
      <p><a href="#" data-open="${cid}" data-lbclose="1">⛪ ${esc(pick(c?.n))}</a></p>
      <p class="links">${x.iccd ? `<a href="${ICCD_PAGE(x.iccd)}" target="_blank" rel="noopener">ICCD</a>` : ""}${x.wp ? `<a href="${esc(x.wp)}" target="_blank" rel="noopener">Wikipedia</a>` : ""}<a href="https://www.wikidata.org/wiki/${w}" target="_blank" rel="noopener">Wikidata</a></p></div></div>`;
  box.hidden = false;
}

// ------------------------------------------------------------------ search suggestions
// Typing finds churches, artists, saints, people buried and districts at once, grouped. Choosing a
// suggestion does what the matching index row does; Enter keeps the words as a plain search.
let SUGGEST_INDEX = null;
function suggestIndex() {
  if (SUGGEST_INDEX) return SUGGEST_INDEX;
  const art = new Map(), sai = new Map(), bur = new Map(), rel = new Map();
  const add = (m, q, c) => { if (!m.has(q)) m.set(q, new Set()); m.get(q).add(c); };
  for (const c of DB.churches) {
    for (const w of c.art || []) for (const a of DB.works[w]?.by || []) add(art, a, c.id);
    for (const a of [...(c.ma || []), ...(c.arch || [])]) add(art, a, c.id);
    for (const q of c.ded || []) add(sai, q, c.id);
    for (const q of c.bur || []) add(bur, q, c.id);
    for (const r of c.rl || []) if (r.q && !r.gone) add(rel, r.q, c.id);
  }
  const names = q => fold(Object.values(DB.people[q]?.n || DB.terms[q] || {}).join(" | "));
  SUGGEST_INDEX = {
    artists: [...art].map(([q, cs]) => ({ q, cs, s: names(q) })),
    saints: [...sai].map(([q, cs]) => ({ q, cs, s: names(q) })),
    people: [...bur].map(([q, cs]) => ({ q, cs, s: names(q) })),
    relics: [...rel].map(([q, cs]) => ({ q, cs, s: q.startsWith("relic:") ? fold(relicName(q)) : names(q) })),
  };
  return SUGGEST_INDEX;
}
function renderSuggest(text) {
  const box = $("#suggest");
  const words = fold(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length || !DB) { box.hidden = true; return; }
  const hit = s => words.every(w => s.includes(w));
  const ix = suggestIndex();
  const ch = DB.churches.filter(c => hit(fold(Object.values(c.n || {}).join(" | ") + " " + (c.alt || []).join(" ")))).slice(0, 6);
  const top = (list, k) => list.filter(e => hit(e.s)).sort((a, b) => b.cs.size - a.cs.size).slice(0, k);
  const groups = [
    ["Churches", ch.map(c => `<button type="button" class="sg" data-sg="c" data-v="${c.id}"><span class="dot" style="background:${KIND_COLOUR[kindKey(c)]}"></span>${esc(pick(c.n))}<span class="note">${esc(kindLabel(kindKey(c)))}</span></button>`)],
    ["Artists", top(ix.artists, 5).map(e => `<button type="button" class="sg" data-sg="by" data-v="${e.q}">🖌 ${esc(personName(e.q))}<span class="note">${e.cs.size} ${t("churches")}</span></button>`)],
    ["Saints", top(ix.saints, 4).map(e => `<button type="button" class="sg" data-sg="ded" data-v="${e.q}">✶ ${esc(personName(e.q))}<span class="note">${e.cs.size} ${t("churches")}</span></button>`)],
    ["Relics", top(ix.relics, 4).map(e => `<button type="button" class="sg" data-sg="rel" data-v="${e.q}">✝ ${esc(relicName(e.q))}<span class="note">${e.cs.size} ${t("churches")}</span></button>`)],
    ["Families", Object.entries(DB.families).filter(([, f]) => hit(fold(f.n))).slice(0, 3).map(([fk, f]) => `<button type="button" class="sg" data-sg="fam" data-v="${fk}">⚜ ${esc(f.n)}<span class="note">${f.parts.length} ${t("chapels")}</span></button>`)],
    ["Buried", top(ix.people, 4).map(e => `<button type="button" class="sg" data-sg="who" data-v="${e.q}">✝ ${esc(personName(e.q))}<span class="note">${esc(pick(BY_ID.get([...e.cs][0])?.n))}</span></button>`)],
    ["District", DB.districts.map((d, i) => [d, i]).filter(([d]) => hit(fold(d))).slice(0, 3).map(([d, i]) => `<button type="button" class="sg" data-sg="d" data-v="${i}">⌖ ${esc(d)}</button>`)],
  ].filter(([, items]) => items.length);
  box.innerHTML = groups.length
    ? groups.map(([g, items]) => `<div class="sg-group"><div class="sg-head">${esc(t(g))}</div>${items.join("")}</div>`).join("") + `<div class="sg-foot note">${esc(t("Enter: search these words in every church"))}</div>`
    : `<div class="sg-foot note">${esc(t("Nothing matches."))}</div>`;
  box.hidden = false;
}
function pickSuggestion(kind, v) {
  $("#suggest").hidden = true;
  clearSearchOnJump();
  if (kind === "c") { render(); openCard(v, { push: true, pan: true }); return; }
  if (kind === "by") state.by = v;
  else if (kind === "ded") state.ded = v;
  else if (kind === "d") state.dist = String(v);
  else if (kind === "fam") state.fam = v;
  else if (kind === "rel") state.rel = v;
  else if (kind === "who") {
    const cs = [...(suggestIndex().people.find(e => e.q === v)?.cs || [])];
    if (cs.length === 1) { render(); openCard(cs[0], { push: true, pan: true }); return; }
    state.who = v;
  }
  if (state.x) closeExplore(false);
  if (state.sel) closeCard(false);
  LIMIT = 150; render(); saveURL(true);
}

// ------------------------------------------------------------------ the record card
let SUMMARIES = null;
async function loadSummaries() {
  if (SUMMARIES) return SUMMARIES;
  try { SUMMARIES = await (await fetch(`romechurches/data/summaries.json?v=${DATA_V}`)).json(); } catch (e) { SUMMARIES = {}; }
  return SUMMARIES;
}
function pillPerson(q, data) {
  const p = DB.people[q];
  const nm = personName(q);
  return `<span class="pill ${p?.img ? "" : "noimg"}" data-${data}="${q}">${p?.img ? `<img src="${thumb(p.img, 60)}" alt="" loading="lazy">` : ""}${esc(nm)}</span>`;
}
function term(q) { return pick(DB.terms[q]) || q; }
// Chapels first, in the order the church is walked through; then the other parts.
const PART_ORDER = ["chapel", "sanctuary", "transept", "nave", "crypt", "baptistery", "sacristy", "dome", "cloister", "campanile"];
function partsSection(c) {
  const ps = (c.parts || []).map(pid => [pid, DB.parts[pid]]).filter(([, p]) => p);
  if (!ps.length) return "";
  ps.sort((a, b) => PART_ORDER.indexOf(a[1].k) - PART_ORDER.indexOf(b[1].k) || a[1].o - b[1].o);
  const nch = ps.filter(([, p]) => p.k === "chapel").length;
  const row = ([pid, p]) => {
    const fam = p.fk ? `<span class="pill noimg" data-fam="${p.fk}">⚜ ${esc(DB.families[p.fk]?.n || p.fam)}</span>` : "";
    const sub = [p.pos, p.ded ? `${t("dedicated to")} ${p.ded}` : ""].filter(Boolean).join(" · ");
    const twin = p.qid && BY_ID.get(p.qid) ? ` <a href="#" data-open="${p.qid}" class="note">${t("its own card")}</a>` : "";
    return `<details class="wmore part" data-part="${pid}"><summary><b>${esc(p.n)}</b>${p.k !== "chapel" ? ` <span class="badge">${esc(t("part:" + p.k))}</span>` : ""}${sub ? `<span class="note psub">${esc(sub)}</span>` : ""}</summary>
      <div class="pbody">${fam}${(p.ma || []).map(q => pillPerson(q, "x")).join("")}${twin}<div class="ptext" data-ptext="${pid}"></div></div></details>`;
  };
  return `<div class="sec"><h3>${t("Chapels and parts")} · ${nch} ${t("chapels")}</h3><p class="note">${esc(t("As the Churches of Rome Wiki walks through the church. Open one to read its text."))}</p>${ps.map(row).join("")}</div>`;
}
function relicList(c) {
  const rl = c.rl || [];
  if (!rl.length) return "";
  const SRC = { wiki: "Churches of Rome Wiki", wpit: "Wikipedia IT", wpen: "Wikipedia EN", burial: "Wikidata" };
  const li = r => {
    const who = r.q ? (r.q.startsWith("relic:") ? `<span class="pill noimg" data-rel="${r.q}">✝ ${esc(relicName(r.q))}</span>` : pillPerson(r.q, "rel")) : `<span class="pill noimg">${esc(r.n)}</span>`;
    const where = r.pt && DB.parts[r.pt] ? ` · ${esc(DB.parts[r.pt].n)}` : "";
    return `<li class="relic ${r.gone ? "gone" : ""}"><div class="w">${who} <span class="note">${esc(t("relic:" + r.k))}${where}${r.gone ? " · " + esc(t("no longer here, the text says")) : ""} · ${esc(SRC[r.src] || r.src)}</span>${(r.s || []).length ? `<div class="rsent" data-rs="${r.s.join(",")}"></div>` : ""}</div></li>`;
  };
  return `<ul class="people relics">${[...rl].sort((a, b) => a.gone - b.gone).map(li).join("")}</ul>`;
}
function workCell(q) {
  const w = DB.works[q] || {};
  const by = (w.by || []).map(personName).join(", ");
  const sub = [w.kind ? t(w.kind) : "", by, dateStr(w.y, w.yp)].filter(Boolean).join(" · ");
  const href = w.wp || `https://www.wikidata.org/wiki/${q}`;
  return `<a class="cell" href="${esc(href)}" target="_blank" rel="noopener" title="${esc(w.img ? DB.credits[w.img]?.join(" · ") || "" : "")}">${w.img ? `${img(w.img, 250, "im")}` : `<div class="im ph">🖼</div>`}<b>${esc(pick(w.n) || q)}</b><span>${esc(sub)}</span></a>`;
}
function personLi(q, where) {
  const p = DB.people[q] || {};
  const href = p.wp || `https://www.wikidata.org/wiki/${q}`;
  return `<li>${p.img ? img(p.img, 120, "av") : `<div class="av"></div>`}<div class="w"><b><a href="${esc(href)}" target="_blank" rel="noopener">${esc(pick(p.n) || q)}</a></b>${(p.tags || []).map(tg => `<span class="tag ${tg}">${esc(t(tg))}</span>`).join("")}<span>${esc([p.b != null || p.d != null ? `${yearStr(p.b)}–${yearStr(p.d)}` : "", pick(p.desc)].filter(Boolean).join(" · "))}</span>${where ? `<span>${where}</span>` : ""}</div></li>`;
}
let heroInterior = false;
async function renderCard(c) {
  const box = $("#card");
  const otherNames = [...new Set([...Object.entries(c.n || {}).filter(([l]) => l !== LANG).map(([, v]) => v), ...(c.alt || [])])].filter(v => v.toLowerCase() !== pick(c.n).toLowerCase()).slice(0, 4);
  const hero = heroInterior && c.int ? c.int : (c.img || c.int);
  const badges = [`<span class="badge" style="background:${KIND_COLOUR[kindKey(c)]};color:#fff${kindKey(c) === "major_basilica" ? `;box-shadow:0 0 0 2px ${PAPAL_GOLD}` : ""}">${esc(kindLabel(kindKey(c)))}</span>`,
    c.status ? `<span class="badge ${c.status}">${esc(statusLabel(c.status))}</span>` : "",
    ...(c.flags || []).filter(f => f !== "cathedral").map(f => `<span class="badge">${esc(flagLabel(f))}</span>`)].join("");
  const place = [c.dist != null ? DB.districts[c.dist] : "", c.muni != null ? DB.districts[c.muni] : "", c.zone ? `${t("outside the walls")}, ${c.zone}` : ""].filter(Boolean).join(" · ");
  const facts = [];
  if (c.ded?.length) facts.push([t("Dedicated to"), c.ded.map(q => pillPerson(q, "ded")).join("")]);
  if (c.y != null) facts.push([t("Founded or built"), esc(dateStr(c.y, c.yp))]);
  if (c.ydis != null) facts.push([t("Demolished or closed"), esc(yearStr(c.ydis))]);
  if (c.arch?.length) facts.push([t("Architect"), c.arch.map(q => pillPerson(q, "archf")).join("")]);
  if (c.style?.length) facts.push([t("Style"), esc(c.style.map(term).join(", "))]);
  if (c.rel?.length || c.denom) facts.push([t("Denomination"), esc(c.rel?.length ? c.rel.map(term).join(", ") : c.denom)]);
  if (c.rite?.length) facts.push([t("Rite"), esc(c.rite.map(term).join(", "))]);
  if (c.her) facts.push([t("Heritage"), esc(t("listed as Italian cultural heritage"))]);
  if (c.addr) facts.push([t("Address"), esc(c.addr)]);
  if (c.titular && !(c.tit || []).length) facts.push([t("Cardinal title"), esc(t("yes, according to the Churches of Rome Wiki"))]);
  if (c.part?.length) facts.push([t("Part of"), c.part.map(p => `<a href="#" data-open="${p}">${esc(pick(BY_ID.get(p)?.n) || p)}</a>`).join(", ")]);
  const kids = CHILDREN.get(c.id) || [];
  if (kids.length) facts.push([t("Inside it"), kids.map(p => `<a href="#" data-open="${p}">${esc(pick(BY_ID.get(p)?.n) || p)}</a>`).join(", ")]);
  if (c.w_built && c.y == null) facts.push([t("Built"), esc(c.w_built) + ` <span class="note">(${esc(t("Churches of Rome Wiki"))})</span>`]);
  if (c.w_cons) facts.push([t("Consecrated"), esc(c.w_cons)]);
  if (c.w_arch && !c.arch?.length) facts.push([t("Architect"), esc(c.w_arch)]);
  if (c.w_ded && !c.ded?.length) facts.push([t("Dedicated to"), esc(c.w_ded)]);
  if (c.w_artists) facts.push([t("Artists"), esc(c.w_artists)]);
  if (c.w_addr && !c.addr) facts.push([t("Address"), esc(c.w_addr)]);
  if (c.oh) facts.push([t("Opening hours"), `<span class="hours">${esc(c.oh)}</span><div class="note">${esc(t("as recorded in OpenStreetMap; check before you go"))}</div>`]);
  if (c.svc) facts.push([t("Mass times"), `<span class="hours">${esc(c.svc)}</span><div class="note">${esc(t("as recorded in OpenStreetMap; check before you go"))}</div>`]);
  const where = c.id.startsWith("wiki:") && !c.ll ? t("This church is only in the Churches of Rome Wiki: no position is known, so it is not on the map.")
    : c.cs === "address" ? t("Only in the Churches of Rome Wiki. Position: the address it gives, found by OpenStreetMap Nominatim.") + (c.apx ? " " + t("Approximate.") : "")
    : c.cs === "street" ? t("Only in the Churches of Rome Wiki. Position: the street it gives, found by OpenStreetMap Nominatim. Approximate.")
    : !c.ll ? t("No position known: it is not on the map.") : c.id.startsWith("osm:") ? t("This church is only in OpenStreetMap: Wikidata does not have it yet.") : c.cs === "osm" ? t("Position from OpenStreetMap: Wikidata has none.") : "";
  const relics = (c.art || []).filter(w => DB.works[w]?.kind === "relic");
  const events = [...(c.ev || [])].sort((a, b) => (DB.works[a]?.y ?? 9999) - (DB.works[b]?.y ?? 9999));
  const art = (c.art || []).filter(w => DB.works[w]?.kind !== "relic").sort((a, b) => (DB.works[b]?.sl || 0) - (DB.works[a]?.sl || 0) || (DB.works[b]?.img ? 1 : 0) - (DB.works[a]?.img ? 1 : 0));
  const dep = [...(c.dep || [])].sort((a, b) => (DB.works[a]?.y ?? 9999) - (DB.works[b]?.y ?? 9999));
  const bur = [...(c.bur || [])].sort((a, b) => (DB.people[b]?.sl || 0) - (DB.people[a]?.sl || 0));
  const titles = (c.tit || []).map(q => DB.titles[q]).filter(Boolean);
  const wpLinks = Object.entries(c.wp || {}).map(([l, ti]) => `<a href="https://${l}.wikipedia.org/wiki/${encodeURIComponent(ti.replace(/ /g, "_"))}" target="_blank" rel="noopener">Wikipedia ${l.toUpperCase()}</a>`);
  const links = [...wpLinks,
    c.id.startsWith("Q") ? `<a href="https://www.wikidata.org/wiki/${c.id}" target="_blank" rel="noopener">Wikidata</a>` : "",
    c.cat ? `<a href="https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(c.cat.replace(/ /g, "_"))}" target="_blank" rel="noopener">Commons</a>` : "",
    c.osm ? `<a href="https://www.openstreetmap.org/${{ n: "node", w: "way", r: "relation" }[c.osm[0]]}/${c.osm.slice(1)}" target="_blank" rel="noopener">OpenStreetMap</a>` : "",
    c.ids?.beweb ? `<a href="https://www.beweb.chiesacattolica.it/edificidiculto/edificio/${encodeURIComponent(c.ids.beweb)}/" target="_blank" rel="noopener">BeWeB</a>` : "",
    c.ids?.gcatholic ? `<a href="https://gcatholic.org/churches/${esc(c.ids.gcatholic)}" target="_blank" rel="noopener">GCatholic</a>` : "",
    c.wiki ? `<a href="https://romanchurches.fandom.com/wiki/${encodeURIComponent(c.wiki.replace(/ /g, "_"))}" target="_blank" rel="noopener">${t("Churches of Rome Wiki")}</a>` : "",
    c.web ? `<a href="${esc(c.web)}" target="_blank" rel="noopener">Web</a>` : "",
  ].filter(Boolean);
  const show = (arr, n) => arr.length > n ? arr.slice(0, n) : arr;
  box.innerHTML = `<div class="card-top"><button type="button" class="chip btn" data-close="1">← ${t("Back to the list")}</button>${c.ll ? `<button type="button" class="chip btn" data-onmap="1">📍 ${t("On the map")}</button>` : ""}<button type="button" class="chip btn" data-sharec="1" title="${esc(t("Share this church"))}"><svg class="ic-share" viewBox="0 0 16 16" aria-hidden="true"><circle cx="12.5" cy="3.5" r="2.1"/><circle cx="3.5" cy="8" r="2.1"/><circle cx="12.5" cy="12.5" r="2.1"/><path d="M5.4 6.9 10.6 4.3M5.4 9.1l5.2 2.6" stroke-width="1.5" fill="none"/></svg><span class="lbl">${t("Share")}</span></button><button type="button" class="card-x" data-close="1" aria-label="${esc(t("Close"))}">✕</button></div>
    ${hero ? `<div class="card-hero">${img(hero, 960, "", "eager")}${c.img && c.int ? `<button type="button" class="chip btn swap" data-swap="1">${heroInterior ? t("Exterior") : t("Interior")}</button>` : ""}</div><div class="credit">${credit(hero)}</div>` : ""}
    <h2>${esc(pick(c.n) || c.id)}</h2>
    ${otherNames.length ? `<div class="alt">${esc(otherNames.join(" · "))}</div>` : ""}
    <div class="meta">${badges} ${esc(place)}</div>
    ${where ? `<p class="note" style="margin:4px 12px">${esc(where)}</p>` : ""}
    <div class="summary" id="summary">${pick(c.desc) ? `<span class="note">${esc(pick(c.desc))}</span>` : ""}</div>
    ${c.wiki ? `<div class="sec" id="wiki"><h3>${t("Churches of Rome Wiki")}</h3><p class="note">${t("Loading...")}</p></div>` : ""}
    ${facts.length ? `<div class="sec"><h3>${t("Facts")}</h3><table class="facts">${facts.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${v}</td></tr>`).join("")}</table></div>` : ""}
    ${partsSection(c)}
    ${iccdSection(c)}
    ${c.ma?.length ? `<div class="sec"><h3>${t("Artists named in the texts")} · ${c.ma.length}</h3><div id="w-art"><p class="note">${t("Loading...")}</p></div></div>` : ""}
    ${art.length ? `<div class="sec"><h3>${t("What is inside")} · ${art.length}</h3><div class="grid">${show(art, 60).map(workCell).join("")}</div></div>` : ""}
    ${relics.length || c.w_nrel || c.rl?.length ? `<div class="sec"><h3>${t("Relics")}</h3>${relicList(c)}${relics.length ? `<div class="grid">${relics.map(workCell).join("")}</div>` : ""}<div id="w-rel"></div></div>` : ""}
    ${!bur.length && c.w_nbur ? `<div class="sec"><h3>${t("Buried here")}</h3><div id="w-bur"></div></div>` : ""}
    ${bur.length ? `<div class="sec"><h3>${t("Buried here")} · ${bur.length}</h3><div id="w-bur"></div><ul class="people">${show(bur, 80).map(q => personLi(q, c.bvia?.[q] ? esc(t("in")) + " " + esc(term(c.bvia[q])) : "")).join("")}</ul>${bur.length > 80 ? `<p class="note">${t("Show all {n}", { n: bur.length })}: <a href="#" data-view-people="1">${t("Buried")}</a></p>` : ""}</div>` : ""}
    ${(c.mon || []).length ? `<div class="sec"><h3>${t("Funeral monuments")} · ${c.mon.length}</h3><p class="note">${esc(t("commemorated by a monument here; Wikidata does not record them as buried here"))}</p><ul class="people">${c.mon.map(q => personLi(q, c.mon_by?.[q] ? esc(pick(DB.works[c.mon_by[q]]?.n)) : "")).join("")}</ul></div>` : ""}
    ${titles.map(ti => `<div class="sec"><h3>${t("Cardinal title")}: ${esc(pick(ti.n))}</h3>${ti.h.length ? `<p class="note">${t("Holders recorded in Wikidata")}</p><ul class="people">${ti.h.map(h => `<li>${DB.people[h.p]?.img ? img(DB.people[h.p].img, 120, "av") : `<div class="av"></div>`}<div class="w"><b>${esc(personName(h.p))}</b><span>${esc([term(h.pos), h.s != null || h.e != null ? `${yearStr(h.s)}–${yearStr(h.e)}` : ""].filter(Boolean).join(" · "))}</span></div></li>`).join("")}</ul>` : ""}</div>`).join("")}
    ${events.length ? `<div class="sec"><h3>${t("Events held here")} · ${events.length}</h3><ul class="people">${events.map(q => { const w = DB.works[q] || {}; return `<li><div class="w"><b><a href="${esc(w.wp || "https://www.wikidata.org/wiki/" + q)}" target="_blank" rel="noopener">${esc(pick(w.n) || q)}</a></b><span>${esc(dateStr(w.y, w.yp))}</span></div></li>`; }).join("")}</ul></div>` : ""}
    ${dep.length ? `<div class="sec"><h3>${t("Shown in")} · ${dep.length}</h3><div class="grid">${show(dep, 30).map(workCell).join("")}</div></div>` : ""}
    <div class="sec"><h3>${t("Links")}</h3><div class="links">${links.join("")}</div></div>
    <div class="sec"><h3>${t("Sources")}</h3><p class="note">Wikidata (CC0) · OpenStreetMap (ODbL) · Wikipedia (CC BY-SA) · Wikimedia Commons · Churches of Rome Wiki (CC BY-SA)</p></div>`;
  box.scrollTop = 0;
  if (c.wiki || c.ma || c.rl) loadWiki(c);
  const s = await loadSummaries();
  const sm = s[c.id];
  if (sm && state.sel === c.id) {
    const lang = sm[LANG] ? LANG : sm.en ? "en" : sm.it ? "it" : Object.keys(sm)[0];
    const ti = (c.wp || {})[lang];
    $("#summary").innerHTML = `${esc(sm[lang])}<span class="src">${t("From Wikipedia")} (${lang.toUpperCase()}, CC BY-SA)${ti ? ` · <a href="https://${lang}.wikipedia.org/wiki/${encodeURIComponent(ti.replace(/ /g, "_"))}" target="_blank" rel="noopener">${t("Read more on Wikipedia")}</a>` : ""}</span>`;
  }
}
// The wiki's long text lives in 32 shards (build.py shard_of), fetched when a card needs one.
const WIKI = new Map();
function shardOf(id) { let n = 0; for (const ch of id) n += ch.codePointAt(0); return n % 32; }
async function loadWiki(c) {
  const k = shardOf(c.id);
  try {
    if (!WIKI.has(k)) WIKI.set(k, await (await fetch(`romechurches/data/wiki/${k}.json?v=${DATA_V}`)).json());
  } catch (e) { WIKI.set(k, {}); }
  const tx = WIKI.get(k)[c.id];
  const box = $("#wiki");
  if (state.sel !== c.id) return;
  renderMentions(c, tx);
  if (!box) return;
  if (!tx || !tx.p.length) { box.remove(); return; }
  const lead = tx.p.filter(([h]) => !h).slice(0, 3);
  const rest = tx.p.slice(lead.length ? tx.p.findIndex(([h]) => h) : 0);
  let html = lead.map(([, p]) => `<p class="wtext">${esc(p)}</p>`).join("");
  if (rest.length && tx.p.some(([h]) => h)) {
    let body = "", last = null;
    for (const [h, p] of rest) { if (h !== last) { body += `<h4>${esc(h)}</h4>`; last = h; } body += `<p class="wtext">${esc(p)}</p>`; }
    html += `<details class="wmore"><summary>${t("Read the whole entry")} (${rest.length} ${t("paragraphs")})</summary>${body}</details>`;
  }
  const quotes = (id, list) => { const el = $(id); if (el && list?.length) el.innerHTML = `<details class="wmore"${list.length <= 3 ? " open" : ""}><summary>${t("In the words of the Churches of Rome Wiki")} (${list.length})</summary>${list.map(x => `<p class="wtext quote">${esc(x)}</p>`).join("")}</details>`; };
  quotes("#w-rel", tx.rel);
  document.querySelectorAll("#card .rsent").forEach(el => {
    el.innerHTML = el.dataset.rs.split(",").map(i => tx.rls?.[+i]).filter(Boolean).map(x => `<p class="wtext quote">${esc(x)}</p>`).join("");
  });
  quotes("#w-bur", tx.bur);
  html += `<p class="note">${t("Text")}: Churches of Rome Wiki, CC BY-SA · <a href="https://romanchurches.fandom.com/wiki/${encodeURIComponent(tx.t.replace(/ /g, "_"))}" target="_blank" rel="noopener">${esc(tx.t)}</a></p>`;
  box.innerHTML = `<h3>${t("Churches of Rome Wiki")}</h3>` + html;
}
// Artists the texts name, with the sentence that names them: the texts' words, never a catalogue.
function renderMentions(c, tx) {
  const el = $("#w-art");
  if (!el) return;
  const m = tx?.ment;
  if (!m) { el.innerHTML = ""; return; }
  const SRC = { wiki: "Churches of Rome Wiki", wpit: "Wikipedia IT", wpen: "Wikipedia EN" };
  const order = Object.entries(m).sort((a, b) => b[1].n - a[1].n);
  el.innerHTML = `<p class="note">${esc(t("Recognised by name in the Churches of Rome Wiki and in Wikipedia; each comes with the sentence that names it."))}</p>` +
    order.map(([q, e]) => `<details class="wmore ment"><summary>${pillPerson(q, "x")} <span class="note">${e.k.map(k => esc(t(k))).join(" · ")}</span></summary>${e.s.map(x => `<p class="wtext quote">${esc(x)}</p>`).join("")}<p class="note">${e.src.map(x => esc(SRC[x] || x)).join(" · ")} · <a href="#" data-by="${q}">${esc(t("Every church with this artist"))}</a></p></details>`).join("");
}
const PHONE = () => matchMedia("(max-width: 640px)").matches;
document.addEventListener("toggle", e => {
  const d = e.target;
  if (!d.matches?.("details.part") || !d.open) return;
  const el = d.querySelector(".ptext");
  if (!el || el.dataset.done) return;
  const p = DB.parts[d.dataset.part];
  const tx = WIKI.get(shardOf(p.c))?.[p.c];
  if (!tx) return;
  el.innerHTML = tx.p.filter(([h]) => h === p.n).map(([, x]) => `<p class="wtext">${esc(x)}</p>`).join("");
  el.dataset.done = "1";
}, true);
// A church's own page carries its name and photograph in a shared link's preview, then opens its card.
const SHARE_BASE = "https://victorelvira.github.io/projects/romechurches/c/";
async function shareChurch(c) {
  if (!c) return;
  const url = SHARE_BASE + c.id.replace(/[^A-Za-z0-9]/g, "-") + ".html";
  const title = pick(c.n);
  try {
    if (navigator.share && TOUCH) { await navigator.share({ title, url }); return; }
    await navigator.clipboard.writeText(url); toast(t("Link copied"));
  } catch (e) { if (e?.name !== "AbortError") prompt("", url); }
}
let listScroll = 0;
function openCard(id, { push = true, pan = true } = {}) {
  const c = BY_ID.get(id);
  if (!c) return;
  if (!state.sel) listScroll = $("#list").scrollTop;
  if (state.x) { state.x = ""; $("#explore").hidden = true; }
  if (state.g) { state.g = false; $("#gallery").hidden = true; }
  litTop();
  const prev = state.sel;
  state.sel = id;
  heroInterior = false;
  // on a phone the card is a sheet over everything, like the record cards of the other atlases;
  // the list stays underneath, where the reader left it
  if (!PHONE()) $("#panel-list").hidden = true;
  $("#card").hidden = false;
  document.body.classList.toggle("sheet-open", PHONE());
  renderCard(c);
  restyle(prev); restyle(id);
  if (pan && c.ll && map && !map.getBounds().pad(-0.15).contains(c.ll)) map.panTo(c.ll);
  saveURL(push);
}
function closeCard(push = true) {
  const prev = state.sel;
  state.sel = "";
  $("#card").hidden = true;
  $("#panel-list").hidden = false;
  document.body.classList.remove("sheet-open");
  restyle(prev);
  renderList();
  $("#list").scrollTop = listScroll;
  saveURL(push);
}
function restyle(id) {
  const m = markers.get(id), c = BY_ID.get(id);
  if (m && c) { m.setStyle(styleFor(c, id === state.sel)); m.setRadius(radius(c) + (id === state.sel ? 3 : 0)); if (id === state.sel) m.bringToFront(); }
}

// ------------------------------------------------------------------ URL: every screen is a link
let booted = false;
function saveURL(push = false) {
  if (!booted) return;
  const p = new URLSearchParams();
  if (!state.follow) p.set("all", "1");
  if (state.x) p.set("x", state.x);
  if (state.g) p.set("g", [...state.gk].map(k => k || "none").join(",") || "all");
  if (state.sel) p.set("c", state.sel);
  if (state.q) p.set("q", state.q);
  if (state.kinds.size) p.set("nk", [...state.kinds].map(k => k || "none").join(","));
  if (state.status.size) p.set("ns", [...state.status].map(k => k || "standing").join(","));
  if (state.flags.size) p.set("f", [...state.flags].join(","));
  if (state.holds.size) p.set("h", [...state.holds].join(","));
  if (state.zones.size) p.set("z", [...state.zones].map(z => z || "unknown").join(","));
  if (state.dist) p.set("d", state.dist);
  if (state.yr[0] != null || state.yr[1] != null) p.set("yr", `${state.yr[0] ?? ""},${state.yr[1] ?? ""}`);
  for (const k of ["by", "ded", "arch", "fam", "rel", "who"]) if (state[k]) p.set(k, state[k]);
  if (LANG !== "en") p.set("lang", LANG);
  if (map) { const c = map.getCenter(); p.set("mv", `${c.lat.toFixed(5)},${c.lng.toFixed(5)},${map.getZoom()}`); }
  const url = location.pathname + (p.toString() ? "?" + p.toString().replace(/%2C/g, ",") : "");
  if (url === location.pathname + location.search) return;
  // A move pushes a history step, a refinement replaces it (PRACTICES.md 2.3).
  (push ? history.pushState : history.replaceState).call(history, null, "", url);
}
function readURL() {
  const p = new URLSearchParams(location.search);
  state.follow = p.get("all") !== "1";
  const g = p.get("g");
  state.g = !!g;
  state.gk = new Set(g && g !== "all" ? g.split(",").map(k => k === "none" ? "" : k) : []);
  state.x = ["artists", "saints", "relics", "families", "people"].includes(p.get("x")) ? p.get("x") : "";
  state.q = p.get("q") || "";
  state.kinds = new Set((p.get("nk") || "").split(",").filter(Boolean).map(k => k === "none" ? "" : k));
  state.status = new Set((p.get("ns") || "").split(",").filter(Boolean).map(k => k === "standing" ? "" : k));
  state.flags = new Set((p.get("f") || "").split(",").filter(Boolean));
  state.holds = new Set((p.get("h") || "").split(",").filter(Boolean));
  state.zones = new Set((p.get("z") || "").split(",").filter(Boolean).map(z => z === "unknown" ? "" : z));
  state.dist = p.get("d") || "";
  const yr = (p.get("yr") || ",").split(",");
  state.yr = [yr[0] === "" ? null : +yr[0], yr[1] === "" || yr[1] == null ? null : +yr[1]];
  for (const k of ["by", "ded", "arch", "fam", "rel", "who"]) state[k] = p.get(k) || "";
  const mv = (p.get("mv") || "").split(",").map(Number);
  return { sel: p.get("c") || "", mv: mv.length === 3 && mv.every(Number.isFinite) ? mv : null };
}
function pickLang() {
  const p = new URLSearchParams(location.search).get("lang");
  let stored = null;
  try { stored = localStorage.getItem("rc.lang"); } catch (e) { /* private mode */ }
  const nav = (navigator.language || "en").slice(0, 2);
  for (const l of [p, stored, nav]) if (["en", "es", "it"].includes(l)) return l;
  return "en";
}

// ------------------------------------------------------------------ events
function wire() {
  let qTimer;
  $("#q").addEventListener("input", e => {
    $("#q-clear").hidden = !e.target.value;
    renderSuggest(e.target.value);
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = e.target.value; LIMIT = 150; render(); }, 140);
  });
  const clearQ = () => { $("#q").value = ""; $("#q-clear").hidden = true; $("#suggest").hidden = true; state.q = ""; render(); };
  $("#q-clear").addEventListener("click", clearQ);
  $("#q").addEventListener("keydown", e => { if (e.key === "Escape") clearQ(); });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape" || document.activeElement === $("#q")) return;
    if (!$("#lightbox").hidden) $("#lightbox").hidden = true;
    else if (state.sel) closeCard(true);
    else if (state.g) closeGallery(true);
  });
  $("#explore-btn").addEventListener("click", () => openExplore("artists"));
  $("#gallery-btn").addEventListener("click", () => openGallery());
  $("#gallery").addEventListener("click", e => {
    const el = e.target.closest("[data-gk],[data-gimg],[data-go],[data-gsrc],[data-gclose],[data-gmore],[data-work]");
    if (!el) return;
    const d = el.dataset;
    if (d.work) { openWork(d.work, d.wc); return; }
    if (d.gclose) { closeGallery(true); return; }
    if (d.gmore) { GLIMIT += 240; renderGallery(); return; }
    if (d.gk !== undefined) state.gk.has(d.gk) ? state.gk.delete(d.gk) : state.gk.add(d.gk);
    else if (d.gimg) state.gimg = !state.gimg;
    else if (d.go) state.go = d.go;
    else if (d.gsrc) state.gsrc = d.gsrc;
    GLIMIT = 120; renderGallery(); saveURL();
  });
  $("#lightbox").addEventListener("click", e => {
    const by = e.target.closest("[data-by]");
    if (by) { $("#lightbox").hidden = true; state.by = by.dataset.by; LIMIT = 150; render(); return; }
    if (e.target.closest("[data-lbclose]") || e.target === $("#lightbox")) $("#lightbox").hidden = true;
  });
  $("#suggest").addEventListener("click", e => {
    const b = e.target.closest("[data-sg]"); if (b) pickSuggestion(b.dataset.sg, b.dataset.v);
  });
  $("#q").addEventListener("keydown", e => { if (e.key === "Enter") $("#suggest").hidden = true; });
  document.addEventListener("click", e => { if (!e.target.closest(".search-row")) $("#suggest").hidden = true; });
  $("#more-btn").addEventListener("click", () => {
    const box = $("#more"); box.hidden = !box.hidden; $("#more-btn").setAttribute("aria-expanded", String(!box.hidden));
  });
  $("#panel").addEventListener("click", e => {
    const only = e.target.closest("[data-only-kind],[data-only-status]");
    if (only) {
      e.stopPropagation();
      if (only.dataset.onlyKind !== undefined) setOnly(state.kinds, only.dataset.onlyKind, KINDS);
      else setOnly(state.status, only.dataset.onlyStatus, STATUSES);
      LIMIT = 150; render(); return;
    }
    const el = e.target.closest("[data-follow],[data-zone],[data-kind],[data-status],[data-flag],[data-holds],[data-unset],[data-id],[data-more],[data-order],[data-by],[data-ded],[data-archf],[data-fam],[data-rel],[data-ptag],[data-close],[data-sharec],[data-onmap],[data-swap],[data-x],[data-exclose],[data-view-people]");
    if (!el) return;
    if (el.tagName === "A") e.preventDefault();
    const d = el.dataset;
    if (d.follow) { state.follow = !state.follow; computeView(); renderLegend(); renderList(); if (state.x) renderExplore(); renderGallery(); saveURL(); return; }
    else if (d.zone !== undefined) { state.zones.has(d.zone) ? state.zones.delete(d.zone) : state.zones.add(d.zone); }
    else if (d.kind !== undefined) { state.kinds.has(d.kind) ? state.kinds.delete(d.kind) : state.kinds.add(d.kind); }
    else if (d.status !== undefined) { state.status.has(d.status) ? state.status.delete(d.status) : state.status.add(d.status); }
    else if (d.flag) { state.flags.has(d.flag) ? state.flags.delete(d.flag) : state.flags.add(d.flag); }
    else if (d.holds) { state.holds.has(d.holds) ? state.holds.delete(d.holds) : state.holds.add(d.holds); }
    else if (d.unset) {
      e.preventDefault();
      if (d.unset === "all") { Object.assign(state, { q: "", kinds: new Set(), status: new Set(), flags: new Set(), holds: new Set(), zones: new Set(), dist: "", yr: [null, null], by: "", ded: "", arch: "", fam: "", rel: "", who: "" }); $("#q").value = ""; $("#q-clear").hidden = true; }
      else state[d.unset] = "";
    }
    else if (d.id) { openCard(d.id, { push: true, pan: true }); return; }
    else if (d.more) { LIMIT += 300; renderList(); return; }
    else if (d.order) { state.order = d.order; renderList(); return; }
    else if (d.by) { state.by = d.by; clearSearchOnJump(); if (state.sel) closeCard(false); if (state.x) closeExplore(false); }
    else if (d.rel) { state.rel = d.rel; clearSearchOnJump(); if (state.sel) closeCard(false); if (state.x) closeExplore(false); }
    else if (d.fam) { state.fam = d.fam; clearSearchOnJump(); if (state.sel) closeCard(false); if (state.x) closeExplore(false); }
    else if (d.archf) { state.arch = d.archf; clearSearchOnJump(); if (state.sel) closeCard(false); if (state.x) closeExplore(false); }
    else if (d.ded) { state.ded = d.ded; clearSearchOnJump(); if (state.sel) closeCard(false); if (state.x) closeExplore(false); }
    else if (d.ptag !== undefined) { PEOPLE_TAG = d.ptag; renderExplore(); return; }
    else if (d.close) { closeCard(true); return; }
    else if (d.x) { openExplore(d.x, false); return; }
    else if (d.exclose) { closeExplore(true); return; }
    else if (d.sharec) { shareChurch(BY_ID.get(state.sel)); return; }
    else if (d.onmap) { const c = BY_ID.get(state.sel); closeCard(true); if (c?.ll) { map.setView(c.ll, Math.max(map.getZoom(), 17)); restyle(c.id); markers.get(c.id)?.openTooltip(); } return; }
    else if (d.swap) { heroInterior = !heroInterior; renderCard(BY_ID.get(state.sel)); return; }
    else if (d.viewPeople) { e.preventDefault(); state.who = ""; closeCard(false); openExplore("people"); return; }
    else return;
    LIMIT = 150; render();
  });
  $("#panel").addEventListener("change", e => {
    if (e.target.id === "dist") { state.dist = e.target.value; render(); }
    if (e.target.id === "yr0" || e.target.id === "yr1") {
      const v = e.target.value === "" ? null : +e.target.value;
      state.yr[e.target.id === "yr0" ? 0 : 1] = Number.isFinite(v) ? v : null; render();
    }
  });
  $("#langsel").addEventListener("click", e => {
    const b = e.target.closest("[data-lang]"); if (!b) return;
    LANG = b.dataset.lang;
    try { localStorage.setItem("rc.lang", LANG); } catch (err) { /* private mode */ }
    applyI18n(); render();
    if (state.sel) renderCard(BY_ID.get(state.sel));
  });
  $("#share-view").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast(t("Link copied")); } catch (e) { prompt("", location.href); }
  });
  $("#locate").addEventListener("click", locate);
  document.querySelector(".brand").addEventListener("click", e => {
    e.preventDefault(); history.replaceState(null, "", location.pathname); location.reload();
  });
  window.addEventListener("popstate", () => {
    const { sel, mv } = readURL();
    $("#q").value = state.q;
    syncViews();
    render();
    if (sel) openCard(sel, { push: false, pan: true }); else if (state.sel) closeCard(false);
    if (mv) map.setView([mv[0], mv[1]], mv[2], { animate: false });
  });
  // the panel edge can be dragged, and the width is remembered on this device
  const handle = $("#resize");
  handle.addEventListener("pointerdown", e => {
    handle.setPointerCapture(e.pointerId);
    const move = ev => { const w = Math.max(300, Math.min(window.innerWidth * 0.7, ev.clientX)); document.documentElement.style.setProperty("--panel-w", w + "px"); };
    const up = () => { handle.removeEventListener("pointermove", move); handle.removeEventListener("pointerup", up); map.invalidateSize(); try { localStorage.setItem("rc.panelw", getComputedStyle(document.documentElement).getPropertyValue("--panel-w")); } catch (err) { /* private mode */ } };
    handle.addEventListener("pointermove", move); handle.addEventListener("pointerup", up);
  });
  try { const w = localStorage.getItem("rc.panelw"); if (w) document.documentElement.style.setProperty("--panel-w", w); } catch (e) { /* private mode */ }
}
function litTop() {
  $("#explore-btn").classList.toggle("on", !!state.x);
  $("#gallery-btn").classList.toggle("on", !!state.g);
}
function syncViews() {
  if (state.x) openExplore(state.x, false); else { $("#explore").hidden = true; }
  if (state.g) openGallery(false); else { $("#gallery").hidden = true; }
}
function clearSearchOnJump() { state.q = ""; $("#q").value = ""; $("#q-clear").hidden = true; }

// "Where I am": a live dot, first fit to the reader and the churches around them.
let watchId = null, meMarker = null, firstFix = true;
function locate() {
  if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; meLayer.clearLayers(); meMarker = null; $("#locate").classList.remove("on"); return; }
  if (!navigator.geolocation) return toast(t("Location unavailable"));
  firstFix = true;
  $("#locate").classList.add("on");
  watchId = navigator.geolocation.watchPosition(pos => {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if (!meMarker) meMarker = L.marker(ll, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [14, 14] }), interactive: false }).addTo(meLayer);
    else meMarker.setLatLng(ll);
    if (firstFix) { firstFix = false; map.setView(ll, Math.max(map.getZoom(), 16)); }
  }, () => { toast(t("Location unavailable")); $("#locate").classList.remove("on"); watchId = null; }, { enableHighAccuracy: true, maximumAge: 15000 });
}

// ------------------------------------------------------------------ boot
async function boot() {
  $("#build").textContent = `v${DATA_V} · ${BUILD_AT}`;
  LANG = pickLang();
  applyI18n();
  $("#list").innerHTML = `<p class="loading">${t("Loading the churches...")}</p>`;
  initMap();
  wire();
  try {
    DB = await (await fetch(`romechurches/data/churches.json?v=${DATA_V}`)).json();
  } catch (e) {
    $("#list").innerHTML = `<p class="empty">${t("The data could not be loaded. Reload the page.")}</p>`;
    return;
  }
  for (const c of DB.churches) {
    BY_ID.set(c.id, c);
    for (const p of c.part || []) { if (!CHILDREN.has(p)) CHILDREN.set(p, []); CHILDREN.get(p).push(c.id); }
  }
  for (const c of DB.churches) c._s = searchText(c);
  const { sel, mv } = readURL();
  $("#q").value = state.q; $("#q-clear").hidden = !state.q;
  syncViews();
  if (mv) map.setView([mv[0], mv[1]], mv[2], { animate: false });
  booted = true;
  render();
  loadIccd();
  if (sel) openCard(sel, { push: false, pan: !mv });
}
boot();
