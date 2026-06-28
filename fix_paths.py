#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_paths.py
 - Lowercases folder names in every "image" field of perfumes.json
 - Fixes Ralph Lauren Blue -> Polo Blue
 - Verifies all 34 image files actually exist on disk
 - Replaces the inline window.PERFUMES block in index.html with the corrected data
"""
import json, os, re
from pathlib import Path

ROOT     = Path(r"c:\Users\USUARIO\OneDrive\Desktop\Proyecto\Isabeleé Parfum\isabelee-perfumes")
JSON_PATH = ROOT / "data" / "perfumes.json"
HTML_PATH = ROOT / "index.html"

# ── 1. Load JSON ──────────────────────────────────────────────────────────
with open(JSON_PATH, encoding="utf-8") as f:
    perfumes = json.load(f)

# ── 2. Fix each entry ─────────────────────────────────────────────────────
for p in perfumes:
    # Lowercase the subfolder segment in the image path
    # e.g.  assets/images/perfumes/Hombre/foo.webp
    #    -> assets/images/perfumes/hombre/foo.webp
    img = p["image"]
    img = img.replace("/Hombre/", "/hombre/")
    img = img.replace("/Mujer/",  "/mujer/")
    img = img.replace("/Unisex/", "/unisex/")
    p["image"] = img

    # Fix Ralph Lauren Blue -> Polo Blue
    if p["brand"] == "Ralph Lauren" and p["name"] == "Blue":
        p["name"]        = "Polo Blue"
        p["description"] = "Ralph Lauren Polo Blue, Eau de Parfum 125ml."

# ── 3. Verify every image exists on disk ──────────────────────────────────
print("Verificando 34 rutas de imagen...")
missing = []
for p in perfumes:
    full = ROOT / p["image"]
    if not full.exists():
        missing.append((p["id"], p["brand"], p["name"], p["image"]))

if missing:
    print(f"\n[FAIL] {len(missing)} imagen(es) NO encontrada(s):")
    for item in missing:
        print(f"  id={item[0]} {item[1]} {item[2]}  ->  {item[3]}")
else:
    print(f"OK: 34/34 imagenes existen\n")

# ── 4. Write corrected perfumes.json ─────────────────────────────────────
with open(JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(perfumes, f, ensure_ascii=False, indent=2)
print(f"[OK] data/perfumes.json actualizado")

# ── 5. Rebuild inline window.PERFUMES in index.html ───────────────────────
# Compact JSON (no extra spaces) for the inline script
inline_json = json.dumps(perfumes, ensure_ascii=False, separators=(",", ":"))
new_block   = f"<script>window.PERFUMES = {inline_json};</script>"

html = HTML_PATH.read_text(encoding="utf-8")

# Replace the entire <script>window.PERFUMES = [...];</script> block
pattern = r"<script>window\.PERFUMES\s*=\s*\[[\s\S]*?\][\s\S]*?;</script>"
if re.search(pattern, html):
    html = re.sub(pattern, new_block, html, count=1)
    HTML_PATH.write_text(html, encoding="utf-8")
    print("[OK] index.html inline window.PERFUMES reemplazado con 34 perfumes")
else:
    print("[WARN] No se encontro el bloque window.PERFUMES en index.html")

print("\nListo.")
