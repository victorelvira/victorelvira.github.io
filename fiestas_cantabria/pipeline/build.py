#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build.py — orquestador del pipeline.

    ingest (planesparahoy) → quality gate (rules) → clasificar → describir
    → escribir js/data.js  + informe de calidad en reports/

Uso:  python3 build.py
"""
import os, json, datetime, re, collections
import planesparahoy, rules, wikipedia

# se rellenan en main()
WIKI_ENTRADAS = []
IA_CACHE = {}
INTERES_LIST = []   # cargado de interes.json

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
CACHE = os.path.join(AQUI, "cache")
REPORTS = os.path.join(AQUI, "reports")
OUT = os.path.join(RAIZ, "js", "data.js")

MESES = ["", "enero","febrero","marzo","abril","mayo","junio","julio",
         "agosto","septiembre","octubre","noviembre","diciembre"]
DIAS = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]

import unicodedata as _ud
def _sin_acentos(s):
    return _ud.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()

def nivel_interes(nombre, municipio, pueblo):
    """Flag oficial de interés turístico (Nacional/Regional/'') según interes.json."""
    n, m, p = _sin_acentos(nombre), _sin_acentos(municipio), _sin_acentos(pueblo)
    for entrada in INTERES_LIST:
        if entrada["clave"] in n:
            mm = entrada.get("muni", "")
            if not mm or mm in m or mm in p:
                return entrada["nivel"]
    return ""

def fmt_fecha(ini, fin):
    d1 = datetime.date.fromisoformat(ini)
    if not fin or fin == ini:
        return f"{d1.day} de {MESES[d1.month]}"
    d2 = datetime.date.fromisoformat(fin)
    if d1.month == d2.month:
        return f"{d1.day}–{d2.day} de {MESES[d1.month]}"
    return f"{d1.day} {MESES[d1.month]} – {d2.day} {MESES[d2.month]}"

def dia_label(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{DIAS[d.weekday()]} {d.day}"

def split_nombre(title):
    if " · " in title:
        nombre, pueblo = title.rsplit(" · ", 1)
    else:
        nombre, pueblo = title, ""
    nombre = re.sub(r"\s*20\d{2}\b", "", nombre).strip()
    return nombre, pueblo.strip()

# Categorías de acto para una descripción FACTUAL derivada del programa real
_CATS = [
    ("verbenas y bailes",      r"verbena|baile|orquesta|disco|macrodisco|dj|concierto|música|charanga"),
    ("actos religiosos",       r"misa|procesi[óo]n|rosario|novena|ofrenda|v[íi]a crucis"),
    ("comida popular",         r"comida|paella|paellada|paparajote|paparaju|paparaja|marmita|paparajotes|espicha|degustaci[óo]n|chocolat|sardin|bonito|paparajuela|magosto|yantar|pincho|tapa"),
    ("actividades infantiles", r"infantil|niñ|hinchable|payaso|taller|parque|tren tur|kinder|títeres|magia"),
    ("deporte y juegos",       r"deporte|bolos|petanca|torneo|carrera|marcha|campeonato|juegos|concurso"),
    ("fuegos y pirotecnia",    r"fuego|pirotecnia|cohete|bomba|traca"),
    ("folclore y tradición",   r"danza|piteros|pandereta|marzas|picayos|romer[íi]a|desfile|carrozas|traje"),
]

def describir_factual(nombre, pueblo, tipo, fecha, programa, is_free, price_text):
    """Descripción provisional 100% factual, derivada del programa real.
    (En fases siguientes se enriquece con Wikipedia + IA.)"""
    texto_prog = " ".join((p["evento"] if "evento" in p else p.get("titulo","")) for p in programa).lower()
    cats = [nombre_cat for nombre_cat, patron in _CATS if re.search(patron, texto_prog)]
    base = f"{nombre} en {pueblo}. {fecha}."
    if cats:
        if len(cats) == 1:
            base += f" Con {cats[0]}."
        else:
            base += " Con " + ", ".join(cats[:-1]) + " y " + cats[-1] + "."
    if is_free == 1:
        base += " Entrada gratuita."
    elif price_text:
        base += f" {price_text}."
    return base

def build_registro(ev):
    nombre, pueblo = split_nombre(ev["title"])
    if not pueblo:
        pueblo = ev["muni_name"]
    tipo = rules.clasificar_tipo(ev["title"], ev["tags"])

    programa = [{
        "dia": dia_label(p["fecha"]),
        "hora": p["hora"],
        "evento": p["titulo"],
        "lugar": p["venue"],
    } for p in ev["programa"]]

    interes = nivel_interes(nombre, ev["muni_name"], pueblo)

    fecha_txt = fmt_fecha(ev["start_date"], ev["end_date"])
    fuente = ev["source_url"]

    # --- Descripción: prioridad Wikipedia > IA (escrita a mano) > factual ---
    desc, wiki_url = wikipedia.describir(nombre, WIKI_ENTRADAS)
    if desc:
        fuente_desc = "wikipedia"
        fuente = wiki_url  # atribución requerida por CC BY-SA
    else:
        clave = f"{nombre}|{pueblo}"
        if clave in IA_CACHE:
            desc, fuente_desc = IA_CACHE[clave], "ia"
        else:
            desc = describir_factual(nombre, pueblo, tipo, fecha_txt,
                                     programa, ev["is_free"], ev["price_text"])
            fuente_desc = "factual"

    reg = {
        "nombre": nombre,
        "pueblo": pueblo,
        "municipio": ev["muni_name"],
        "comarca": "",
        "mes": datetime.date.fromisoformat(ev["start_date"]).month,
        "fecha": fecha_txt,
        "inicio": ev["start_date"],
        "fin": ev["end_date"],
        "tipo": tipo,
        "interes": interes,
        "lat": round(ev["lat"], 5),
        "lng": round(ev["lon"], 5),
        "descripcion": desc,
        "_fuente_desc": fuente_desc,
    }
    if fuente:
        reg["fuente"] = fuente
    if programa:
        reg["programa"] = programa
    return reg

# --- Deduplicación clásicas ↔ scrapeadas -----------------------------
import unicodedata
_STOP = {"la", "las", "el", "los", "de", "del", "y", "en", "fiestas", "fiesta", "san", "nuestra", "senora", "sra", "ntra"}

def _tokens(texto):
    t = unicodedata.normalize("NFKD", texto.lower()).encode("ascii", "ignore").decode()
    return {w for w in re.findall(r"[a-z0-9]+", t) if w not in _STOP and len(w) > 2}

def _norm(texto):
    return unicodedata.normalize("NFKD", texto.lower()).encode("ascii", "ignore").decode().strip()

def es_duplicada(clasica, scrapeadas):
    """¿La fiesta clásica ya está cubierta por una scrapeada? (mismo municipio +
    solapamiento de palabras significativas del nombre)."""
    ct = _tokens(clasica["nombre"])
    cm = _norm(clasica["municipio"])
    for s in scrapeadas:
        if _norm(s["municipio"]) != cm and _norm(s["pueblo"]) != _norm(clasica["pueblo"]):
            continue
        st = _tokens(s["nombre"])
        if ct and st and len(ct & st) / len(ct) >= 0.6:
            return s["nombre"]
    return None

def main():
    global WIKI_ENTRADAS, IA_CACHE, INTERES_LIST
    print("· Cargando descripciones de Wikipedia…")
    WIKI_ENTRADAS = wikipedia.cargar(CACHE)
    ia_path = os.path.join(AQUI, "descriptions_ia.json")
    IA_CACHE = json.load(open(ia_path, encoding="utf-8")) if os.path.exists(ia_path) else {}
    int_path = os.path.join(AQUI, "interes.json")
    if os.path.exists(int_path):
        ij = json.load(open(int_path, encoding="utf-8"))
        INTERES_LIST = ij.get("nacional", []) + ij.get("regional", [])
    print(f"  {len(WIKI_ENTRADAS)} artículos wiki · {len(IA_CACHE)} descripciones IA · {len(INTERES_LIST)} fiestas de interés")

    print("· Descargando feed de planesparahoy…")
    sqlite_path, manifest = planesparahoy.descargar(CACHE)
    eventos, feed_ver = planesparahoy.extraer(sqlite_path)
    print(f"  {len(eventos)} candidatos (tag festivo, provincia 39)")

    kept, dropped = [], []
    for ev in eventos:
        ok, motivo = rules.es_fiesta_pueblo(ev)
        (kept if ok else dropped).append((ev, motivo))

    fiestas = [build_registro(ev) for ev, _ in kept]
    fiestas.sort(key=lambda f: (f["inicio"], f["nombre"]))

    # ---- Clásicas curadas + deduplicación ----
    clasicas_path = os.path.join(AQUI, "clasicas.json")
    clasicas = json.load(open(clasicas_path, encoding="utf-8")) if os.path.exists(clasicas_path) else []
    clasicas_kept, dup_msgs = [], []
    for c in clasicas:
        dup = es_duplicada(c, fiestas)
        if dup:
            dup_msgs.append(f"{c['nombre']} · {c['municipio']}  ≈  {dup} (scrapeada)")
        else:
            c["interes"] = nivel_interes(c["nombre"], c["municipio"], c.get("pueblo", ""))
            c["_fuente_desc"] = "clasica"
            clasicas_kept.append(c)

    todas = clasicas_kept + fiestas
    todas.sort(key=lambda f: (f.get("inicio") or f"2026-{f['mes']:02d}-01", f["nombre"]))

    # ---- Informe de calidad ----
    os.makedirs(REPORTS, exist_ok=True)
    tipos = collections.Counter(f["tipo"] for f in todas)
    with open(os.path.join(REPORTS, "quality_report.txt"), "w", encoding="utf-8") as r:
        r.write(f"INFORME DE CALIDAD — {datetime.datetime.now().isoformat(timespec='seconds')}\n")
        r.write(f"Feed planesparahoy: versión {feed_ver}\n\n")
        r.write(f"Candidatos: {len(eventos)}\n")
        r.write(f"ACEPTADAS (fiestas de pueblo): {len(kept)}\n")
        r.write(f"DESCARTADAS (ruido): {len(dropped)}\n")
        r.write(f"CLÁSICAS añadidas: {len(clasicas_kept)}  (de {len(clasicas)}; {len(dup_msgs)} duplicadas omitidas)\n")
        r.write(f"TOTAL fiestas: {len(todas)}\n\n")
        if dup_msgs:
            r.write("Clásicas omitidas por estar ya en el feed:\n")
            for m in dup_msgs:
                r.write(f"  {m}\n")
            r.write("\n")
        r.write("Distribución por tipo:\n")
        for t, n in tipos.most_common():
            r.write(f"  {t:14} {n}\n")
        fuentes = collections.Counter(f["_fuente_desc"] for f in todas)
        r.write("\nOrigen de las descripciones:\n")
        for s, n in fuentes.most_common():
            r.write(f"  {s:14} {n}\n")
        r.write("\n--- DESCARTADAS (revisar; si alguna es fiesta, añádela a OVERRIDES) ---\n")
        for ev, motivo in sorted(dropped, key=lambda x: x[1]):
            r.write(f"  [{ev['id']}] {ev['title']}  →  {motivo}\n")
        r.write("\n--- ACEPTADAS ---\n")
        for ev, motivo in sorted(kept, key=lambda x: x[0]['title']):
            r.write(f"  [{ev['id']}] {ev['title']}  ({motivo})\n")

    # ---- Escribir data.js ----
    info = {
        "generado": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "feed": feed_ver,
        "fiestas": len(todas),
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("/*\n"
                 " * Fiestas de pueblo de Cantabria — generado por pipeline/build.py\n"
                 f" * {info['generado']} · feed planesparahoy {feed_ver}\n"
                 " * Fuentes: planesparahoy (agenda), Wikipedia (descripciones notables),\n"
                 " * descripciones IA y clásicas curadas. Ver pipeline/FUENTES.md.\n"
                 " */\n\n")
        fh.write("const FIESTAS = ")
        fh.write(json.dumps(todas, ensure_ascii=False, indent=1))
        fh.write(";\n\n")
        fh.write("const DATA_INFO = " + json.dumps(info, ensure_ascii=False) + ";\n")

    print(f"· {len(kept)} aceptadas, {len(dropped)} descartadas, "
          f"{len(clasicas_kept)} clásicas ({len(dup_msgs)} dup omitidas) → {len(todas)} total")
    print(f"· data.js escrito · informe en pipeline/reports/quality_report.txt")

if __name__ == "__main__":
    main()
