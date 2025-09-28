# -*- coding: utf-8 -*-

"""
split_bib.py
-------------
Lee un archivo .bib que contenga múltiples entradas y genera un archivo .bib
por cada cita, usando exactamente la clave (key) como nombre: <key>.bib

Uso básico:
    python tools/split_bib.py

Opciones avanzadas:
    python tools/split_bib.py --input data/publications/_all_publications.bib
    python tools/split_bib.py --input data/publications/_all_publications.bib --outdir assets/bib

Características:
- Parser robusto basado en conteo de llaves/paréntesis (no requiere librerías externas).
- Soporta @article{...}, @inproceedings{...}, @phdthesis{...}, @book(...), etc.
- Omite bloques sin clave (p. ej., @comment, @preamble, @string).
"""

import os
import argparse

# === Configuración de rutas automáticas ===
# Carpeta raíz del proyecto (un nivel arriba de /tools)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# Rutas por defecto
DEFAULT_INPUT = os.path.join(ROOT_DIR, 'data', 'publications', '_all_publications.bib')
DEFAULT_OUTPUT_DIR = os.path.join(ROOT_DIR, 'assets', 'bib')


def split_bib_file(input_path, output_dir):
    """Divide un archivo .bib en archivos individuales, uno por cada cita."""

    if not os.path.exists(input_path):
        print(f"[ERROR] No se encontró el archivo de entrada: {input_path}")
        return

    os.makedirs(output_dir, exist_ok=True)

    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    entries = []
    current = []
    depth = 0
    inside = False

    # Parser básico: detecta bloques @...{ ... }
    for line in content.splitlines():
        stripped = line.strip()
        if stripped.startswith('@'):
            if current and inside:
                entries.append('\n'.join(current))
                current = []
            inside = True
            depth = stripped.count('{') - stripped.count('}')
            current.append(line)
        elif inside:
            depth += stripped.count('{') - stripped.count('}')
            current.append(line)
            if depth == 0:
                entries.append('\n'.join(current))
                current = []
                inside = False

    # Procesar la última entrada
    if current and inside:
        entries.append('\n'.join(current))

    count = 0
    for entry in entries:
        # Extraer la clave (key) justo después de @tipo{
        header = entry.split('\n', 1)[0]
        if '{' in header:
            key = header.split('{', 1)[1].split(',', 1)[0].strip()
        else:
            continue

        if not key:
            continue

        out_file = os.path.join(output_dir, f"{key}.bib")
        with open(out_file, 'w', encoding='utf-8') as out:
            out.write(entry.strip() + '\n')

        count += 1

    print(f"[OK] Se generaron {count} archivos .bib en: {output_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Divide un archivo .bib en archivos individuales")
    parser.add_argument('--input', type=str, default=DEFAULT_INPUT,
                        help=f"Ruta del archivo .bib de entrada (por defecto: {DEFAULT_INPUT})")
    parser.add_argument('--outdir', type=str, default=DEFAULT_OUTPUT_DIR,
                        help=f"Carpeta de salida (por defecto: {DEFAULT_OUTPUT_DIR})")

    args = parser.parse_args()

    split_bib_file(args.input, args.outdir)