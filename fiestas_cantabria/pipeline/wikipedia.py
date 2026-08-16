# -*- coding: utf-8 -*-
"""
wikipedia.py — fuente de DESCRIPCIONES ricas para fiestas notables.

Usa la API de Wikipedia en español para bajar el extracto de introducción de los
artículos de las grandes fiestas. Texto bajo licencia CC BY-SA → reutilizable
citando el artículo (se guarda la URL como fuente).

Solo cubre fiestas con artículo propio (las notables). El resto se describe con
IA (descriptions_ia.json) o con la síntesis factual del programa.
"""
import json, os, re, urllib.request, urllib.parse

API = "https://es.wikipedia.org/w/api.php"
UA = {"User-Agent": "FiestasCantabria/1.0 (proyecto personal; contacto por GitHub)"}

# patrón (en el NOMBRE de la fiesta) -> título del artículo de Wikipedia
CURADO = {
    r"vijanera":               "La Vijanera",
    r"carnaval de santo[ñn]a":  "Carnaval de Santoña",
    r"guerras c[áa]ntabras":    "Guerras Cántabras (fiesta)",
    r"fol[íi]a":                "La Folía",
    r"batalla de (las )?flores": "Batalla de Flores (Laredo)",
    r"coso blanco":             "Coso Blanco",
    r"orujo":                   "Fiesta del Orujo",
    r"bien aparecida":          "Nuestra Señora la Bien Aparecida",
    r"d[íi]a de cantabria":     "Día de Cantabria",
    r"marmita":                 "Fiesta de la Marmita",
    r"semana grande de laredo": "Laredo",
}

def _fetch_extract(titulo):
    params = {
        "action": "query", "format": "json", "prop": "extracts",
        "exintro": 1, "explaintext": 1, "redirects": 1, "titles": titulo,
    }
    url = API + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    paginas = data.get("query", {}).get("pages", {})
    for _, p in paginas.items():
        if "missing" in p:
            return None, None
        extracto = (p.get("extract") or "").strip()
        if not extracto:
            return None, None
        page_url = "https://es.wikipedia.org/wiki/" + urllib.parse.quote(p["title"].replace(" ", "_"))
        return extracto, page_url
    return None, None

def _dos_frases(texto):
    """Primeras 1-2 frases, recortado a algo legible en una tarjeta."""
    texto = re.sub(r"\s+", " ", texto).strip()
    frases = re.split(r"(?<=[.!?])\s+", texto)
    out = " ".join(frases[:2]).strip()
    if len(out) > 320:
        out = out[:317].rsplit(" ", 1)[0] + "…"
    return out

def cargar(cache_dir):
    """Descarga (con caché en disco) los extractos de los artículos curados.
    Devuelve lista de (patrón_regex_compilado, descripcion, url)."""
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, "wikipedia.json")
    cache = {}
    if os.path.exists(cache_file):
        cache = json.load(open(cache_file, encoding="utf-8"))

    entradas = []
    for patron, titulo in CURADO.items():
        if titulo not in cache:
            try:
                extracto, url = _fetch_extract(titulo)
                cache[titulo] = {"extracto": extracto, "url": url}
            except Exception as e:
                cache[titulo] = {"extracto": None, "url": None, "error": str(e)}
        c = cache[titulo]
        if c.get("extracto"):
            entradas.append((re.compile(patron, re.I), _dos_frases(c["extracto"]), c["url"]))

    json.dump(cache, open(cache_file, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return entradas

def describir(nombre, entradas):
    """Si el nombre de la fiesta casa con un artículo, devuelve (desc, url)."""
    for patron, desc, url in entradas:
        if patron.search(nombre):
            return desc, url
    return None, None
