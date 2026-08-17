# -*- coding: utf-8 -*-
"""
rules.py — núcleo de calidad del pipeline.

Contiene:
  - Bounding box de Cantabria (validación de coordenadas)
  - Clasificación robusta de `tipo` (carnaval, romeria, gastronomica, ...)
  - Puerta de calidad: ¿esto es una fiesta de pueblo o ruido (concierto,
    exposición, bingo, feria del libro...)?
  - Overrides manuales para los casos límite que las reglas no aciertan.

Filosofía: las reglas resuelven el 90 %. El 10 % dudoso se ve en el informe
(reports/) y se corrige en OVERRIDES sin tocar el código.
"""
import re

# --- Cantabria: caja envolvente aproximada ---------------------------
# Sirve para descartar eventos con coordenadas fuera de la región.
CANTABRIA_BBOX = {"lat_min": 42.70, "lat_max": 43.66, "lon_min": -5.00, "lon_max": -3.09}

def coord_valida(lat, lon):
    b = CANTABRIA_BBOX
    return b["lat_min"] <= lat <= b["lat_max"] and b["lon_min"] <= lon <= b["lon_max"]

def nombre_sin_pueblo(title):
    """'Fiestas de San Roque · Rubayo' -> 'Fiestas de San Roque'.
    Importante: las reglas se aplican al NOMBRE, no al pueblo (si no, un pueblo
    llamado 'La Virgen' provocaría falsos positivos)."""
    return title.rsplit(" · ", 1)[0] if " · " in title else title

# --- Clasificación de tipo -------------------------------------------
# Orden importa: se evalúa de arriba a abajo y gana el primero.
_TIPO_REGLAS = [
    ("carnaval",     r"carnaval|vijanera|zamarron|antruido|antruejo"),
    ("historica",    r"guerras c[áa]ntabras|recreaci[óo]n|medieval|c[áa]ntabro-?romano|vikingo|macell?um"),
    ("floral",       r"batalla de (las )?flores|gala floral|coso blanco|d[íi]a de las flores"),
    ("romeria",      r"romer[íi]a|fol[íi]a|santuca"),
    ("gastronomica", r"\bferia\b|marmita|queso|orujo|sidra|cocido|alubia|tomate|anchoa|bonito|sardin|\btapa|vino|gastron[óo]m|degustaci[óo]n|yantar|espicha|artesan[íi]a"),
    # santo/virgen dentro de "Fiestas de…" son PATRONALES, no actos religiosos
    ("patronal",     r"fiestas?|patronales|san |santa |santo |santos m[áa]rtires|virgen|ntra\.? ?sra|nuestra se[ñn]ora|asunci[óo]n|el carmen|santo cristo|santísima cruz|chupinazo|semana grande"),
    # religiosa se reserva para actos claramente religiosos sueltos
    ("religiosa",    r"misa|procesi[óo]n|rosario|novena|v[íi]a crucis|picayos"),
]

def clasificar_tipo(title, tags):
    t = nombre_sin_pueblo(title).lower()
    for tipo, patron in _TIPO_REGLAS:
        if re.search(patron, t):
            return tipo
    if "gastronomía" in tags or "ferias y mercados" in tags:
        return "gastronomica"
    return "patronal"

# --- Puerta de calidad: ¿es una fiesta de pueblo? --------------------
# Patrones que, si aparecen en el título, indican fiesta de pueblo real.
_KEEP = re.compile(
    r"(^fiestas?\b|patronales|san |santa |santo |santos m[áa]rtires|virgen|"
    r"ntra\.? ?sra|nuestra se[ñn]ora|asunci[óo]n|el carmen|san roque|"
    r"carnaval|vijanera|zamarron|romer[íi]a|fol[íi]a|santuca|"
    r"guerras c[áa]ntabras|batalla de (las )?flores|gala floral|coso blanco|"
    r"d[íi]a de cantabria|semana grande|chupinazo|verbena|"
    r"feria .*(queso|sidra|tomate|tapa|marmita|orujo|ganado|vino|anchoa|bonito|alubia|cocido|artesan|gastro|origen)|"
    r"marmita|fiesta de la|d[íi]a de la)",
    re.IGNORECASE)

# Patrones que descartan aunque parezca fiesta (tienen prioridad sobre KEEP).
_DROP = re.compile(
    r"(concierto|recital|\bdj\b|tributo|mon[óo]logo|"
    r"festival (de verano|el rodeo|de naciones|internacional de)|aldea fest|"
    r"exposici[óo]n|visita guiada|visitas guiadas|paseo cultural|"
    r"taller|curso|charla|conferencia|\bcine\b|"
    r"bingo|paella|comida de|brunch|rave|kinder|yoga|pilates|strength|barre|"
    r"feria del (libro|stock|autom[óo]vil|outlet)|"
    r"concurso de (pe[ñn]as|fotograf)|marcha de|pirotecnia|"
    r"apertura del (rinc[óo]n|mercado|parque)|"
    r"love pride|pride day|"
    r"misa y procesi[óo]n|salida con el santo|diana floreada|"
    r"chirigota|ruta |senderismo|carrera|torneo|campeonato|guajira)",
    re.IGNORECASE)

# Overrides manuales por id de evento (planesparahoy):  id -> "keep" | "drop"
# Para los casos límite que las reglas no aciertan. Rellenar tras leer el informe.
OVERRIDES = {
    615203: "drop",   # Sonorama Ribera Day — festival de música, no fiesta de pueblo
    562890: "drop",   # AURA Summer Edition — evento musical
    # añade aquí los casos que el informe no acierte:  id: "keep" | "drop"
}

def es_fiesta_pueblo(ev):
    """Decide si un evento es fiesta de pueblo. Devuelve (bool, motivo)."""
    ov = OVERRIDES.get(ev["id"])
    if ov == "keep":
        return True, "override:keep"
    if ov == "drop":
        return False, "override:drop"

    if not coord_valida(ev["lat"], ev["lon"]):
        return False, "coordenadas fuera de Cantabria"

    nombre = nombre_sin_pueblo(ev["title"])   # ignora el nombre del pueblo
    if _DROP.search(nombre):
        return False, "patrón de no-fiesta (concierto/expo/feria del libro/…)"
    if _KEEP.search(nombre):
        return True, "patrón de fiesta"

    # Ambiguo: aceptamos solo si tiene programa sustancial y tag festivo
    if ev["actos"] >= 5 and ("fiestas" in ev["tags"] or "tradiciones" in ev["tags"]):
        return True, f"ambiguo, {ev['actos']} actos"
    return False, "sin patrón de fiesta ni programa suficiente"
