#!/usr/bin/env python3
"""
Normaliza los nombres de las fotos: minúsculas, sin acentos, sin espacios.

Para qué sirve: GitHub Pages distingue mayúsculas de minúsculas, y los
espacios en nombres de archivo rompen las URLs. Las fotos que salen del
iPhone vienen como IMG_1234.JPG, así que si agregas un lote nuevo, corre
esto antes de meterlas a fotos.json.

Uso:
    python3 renombrar-fotos.py src/assets/fotos

Agrega --dry-run para ver qué haría sin tocar nada.

Dos cosas que este script maneja y un `mv` a mano no:

1. macOS guarda los acentos descompuestos (la ñ son dos caracteres: n +
   tilde). Un script que compara contra "Peña.jpeg" escrito normal no
   encuentra el archivo y lo salta en silencio.

2. El sistema de archivos de macOS no distingue mayúsculas, así que
   renombrar aguila.JPG a aguila.jpg no hace nada: para el sistema son el
   mismo archivo. Hay que pasar por un nombre temporal.
"""

import os
import re
import sys
import unicodedata


def normaliza(nombre):
    base, _, ext = nombre.rpartition(".")
    if not base:  # archivo sin extensión
        base, ext = nombre, ""
    base = unicodedata.normalize("NFKD", base)
    base = "".join(c for c in base if not unicodedata.combining(c))
    base = base.lower()
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return f"{base}.{ext.lower()}" if ext else base


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    prueba = "--dry-run" in sys.argv

    if not args:
        print(__doc__)
        return 1

    carpeta = args[0]
    if not os.path.isdir(carpeta):
        print(f"No existe la carpeta: {carpeta}")
        return 1

    nombres = sorted(n for n in os.listdir(carpeta) if not n.startswith("."))
    existentes = set(nombres)
    cambios, colisiones = [], []

    for nombre in nombres:
        nuevo = normaliza(nombre)
        if nuevo == nombre:
            continue
        # Colisión real: otro archivo distinto ya ocupa ese nombre.
        if nuevo in existentes and nuevo.lower() != nombre.lower():
            colisiones.append((nombre, nuevo))
            continue
        cambios.append((nombre, nuevo))
        existentes.discard(nombre)
        existentes.add(nuevo)

    if prueba:
        for a, b in cambios:
            print(f"  {a}  →  {b}")
        print(f"\n{len(cambios)} se renombrarían, {len(nombres) - len(cambios)} ya están bien")
    else:
        for a, b in cambios:
            temporal = os.path.join(carpeta, "__tmp__" + b)
            os.rename(os.path.join(carpeta, a), temporal)
            os.rename(temporal, os.path.join(carpeta, b))
            print(f"  {a}  →  {b}")
        print(f"\n{len(cambios)} renombrados, {len(nombres) - len(cambios)} ya estaban bien")

    if colisiones:
        print("\nCOLISIONES — estos no se tocaron porque el nombre ya está ocupado:")
        for a, b in colisiones:
            print(f"  {a}  →  {b}")
        print("Renómbralos a mano.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
