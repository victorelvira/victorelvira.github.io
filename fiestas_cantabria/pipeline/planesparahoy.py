# -*- coding: utf-8 -*-
"""
planesparahoy.py — fuente de AGENDA (esqueleto): fechas, coordenadas, programa.

Descarga la base SQLite pública que sirve planesparahoy (leyendo antes el
manifest para saber el nombre de archivo de la versión vigente) y extrae los
eventos "padre" (planes) de Cantabria con tag festivo, junto con sus actos hijo.

NO decide calidad ni descripciones: solo normaliza hechos. La calidad la aplica
build.py con rules.py.
"""
import json, sqlite3, urllib.request, os, datetime

MANIFEST = "https://datos.planesparahoy.com/cantabria.manifest.json"
BASE = "https://datos.planesparahoy.com/"
TAGS_FESTIVOS = ("fiestas", "tradiciones", "gastronomía", "ferias y mercados")
# Cabecera de navegador: el servidor rechaza el User-Agent por defecto de Python.
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                     "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}

def _get(url, timeout):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout)

def descargar(cache_dir):
    """Descarga la BD según el manifest. Devuelve (ruta_sqlite, info_manifest)."""
    os.makedirs(cache_dir, exist_ok=True)
    with _get(MANIFEST, 30) as r:
        manifest = json.loads(r.read().decode("utf-8"))
    destino = os.path.join(cache_dir, manifest["file"])
    if not os.path.exists(destino):
        with _get(BASE + manifest["file"], 120) as r, open(destino, "wb") as f:
            f.write(r.read())
    return destino, manifest

def extraer(sqlite_path):
    """Devuelve lista de eventos normalizados (padre) con su programa."""
    con = sqlite3.connect(sqlite_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    filas = cur.execute("""
        SELECT DISTINCT e.* FROM events e, json_each(e.tags) j
        WHERE e.parent_id IS NULL AND e.province_code='39'
          AND j.value IN ('fiestas','tradiciones','gastronomía','ferias y mercados')
        ORDER BY e.start_date, e.title
    """).fetchall()

    eventos = []
    for e in filas:
        tags = json.loads(e["tags"] or "[]")
        hijos = cur.execute("""
            SELECT title, venue, start_date, start_time
            FROM events WHERE parent_id=?
            ORDER BY start_date, COALESCE(start_time,'99:99'), id
        """, (e["id"],)).fetchall()
        programa = [{
            "titulo": h["title"].rsplit(" · ", 1)[0] if " · " in h["title"] else h["title"],
            "venue": h["venue"] or "",
            "fecha": h["start_date"],
            "hora": h["start_time"] or "",
        } for h in hijos]

        eventos.append({
            "id": e["id"],
            "title": e["title"],
            "summary": e["summary"] or "",       # editorial IA de planesparahoy (NO se copia)
            "start_date": e["start_date"],
            "end_date": e["end_date"] or e["start_date"],
            "muni_name": e["muni_name"] or "",
            "venue": e["venue"] or "",
            "lat": e["lat"],
            "lon": e["lon"],
            "is_free": e["is_free"],
            "price_text": e["price_text"] or "",
            "source_url": e["source_url"] or "",
            "tags": tags,
            "actos": len(programa),
            "programa": programa,
        })

    ver = cur.execute("SELECT value FROM meta WHERE key='version'").fetchone()
    con.close()
    return eventos, (ver[0] if ver else "")
