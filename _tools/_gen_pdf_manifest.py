# -*- coding: utf-8 -*-

"""
_gen_pdf_manifest.py
--------------------
Escanea assets/papers/ y genera data/publications/pdf_manifest.json con la
lista de claves (keys) que tienen un draft <key>_pre.pdf disponible.

La página publications.html usa ese manifest para mostrar el botón "PDF"
solo en las entradas que realmente tienen el fichero (evita enlaces rotos).

Uso:
    python tools/_gen_pdf_manifest.py

Ejecútalo cada vez que añadas o quites un PDF en assets/papers/.
"""

import os
import json
import argparse

# === Configuración de rutas automáticas ===
# Carpeta raíz del proyecto (un nivel arriba de /tools)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

DEFAULT_PAPERS_DIR = os.path.join(ROOT_DIR, 'assets', 'papers')
DEFAULT_OUTPUT = os.path.join(ROOT_DIR, 'data', 'publications', 'pdf_manifest.json')

SUFFIX = '_pre.pdf'


def gen_manifest(papers_dir, output_path):
    """Genera el manifest JSON con las claves que tienen PDF."""

    if not os.path.isdir(papers_dir):
        print(f"[ERROR] No se encontró la carpeta: {papers_dir}")
        return

    keys = sorted(
        f[:-len(SUFFIX)].lower()
        for f in os.listdir(papers_dir)
        if f.endswith(SUFFIX)
    )

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as out:
        json.dump(keys, out, indent=2, ensure_ascii=False)
        out.write('\n')

    print(f"[OK] {len(keys)} claves con PDF escritas en: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Genera el manifest de PDFs disponibles")
    parser.add_argument('--papers', type=str, default=DEFAULT_PAPERS_DIR,
                        help=f"Carpeta con los PDFs (por defecto: {DEFAULT_PAPERS_DIR})")
    parser.add_argument('--output', type=str, default=DEFAULT_OUTPUT,
                        help=f"Ruta del JSON de salida (por defecto: {DEFAULT_OUTPUT})")

    args = parser.parse_args()

    gen_manifest(args.papers, args.output)
