#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""rebuild_perfumes.py - Rebuild data/perfumes.json from Perfumes/ images."""

import os, re, json, sys, unicodedata
from pathlib import Path

# Pillow auto-install
try:
    from PIL import Image
except ImportError:
    print("Instalando Pillow...")
    os.system(f'"{sys.executable}" -m pip install Pillow')
    from PIL import Image

ROOT = Path(r"c:\Users\USUARIO\OneDrive\Desktop\Proyecto\Isabeleé Parfum\isabelee-perfumes")

# Brand registry: key (lowercase) -> canonical display name
# Sorted longest-first so the greedy match always picks the most specific brand
BRANDS = {
    "yves saint laurent":  "Yves Saint Laurent",
    "dolce & gabbana":     "Dolce & Gabbana",
    "dolce&gabbana":       "Dolce & Gabbana",
    "parfums de marly":    "Parfums de Marly",
    "acqua di parma":      "Acqua di Parma",
    "jean paul gaultier":  "Jean Paul Gaultier",
    "polo ralph lauren":   "Ralph Lauren",
    "carolina herrera":    "Carolina Herrera",
    "viktor & rolf":       "Viktor & Rolf",
    "viktor&rolf":         "Viktor & Rolf",
    "thierry mugler":      "Thierry Mugler",
    "giorgio armani":      "Giorgio Armani",
    "christian dior":      "Dior",
    "paco rabanne":        "Paco Rabanne",
    "ralph lauren":        "Ralph Lauren",
    "marc jacobs":         "Marc Jacobs",
    "calvin klein":        "Calvin Klein",
    "jo malone":           "Jo Malone",
    "tom ford":            "Tom Ford",
    "lancôme":             "Lancôme",
    "lancome":             "Lancôme",
    "valentino":           "Valentino",
    "givenchy":            "Givenchy",
    "orientica":           "Orientica",
    "lattafa":             "Lattafa",
    "versace":             "Versace",
    "montale":             "Montale",
    "rabanne":             "Paco Rabanne",
    "burberry":            "Burberry",
    "chanel":              "Chanel",
    "prada":               "Prada",
    "loewe":               "Loewe",
    "gucci":               "Gucci",
    "dior":                "Dior",
    "ilmin":               "ILMIN",
    "ahli":                "AHLI",
    "ch":                  "Carolina Herrera",  # prefix alias: CH-Good-Girl
}
BRAND_KEYS = sorted(BRANDS.keys(), key=len, reverse=True)

# Concentration tokens to strip from filename
CONC_RE = re.compile(
    r'\b(?:Extrait\s+de\s+Parfum|Eau\s+de\s+Parfum|Eau\s+de\s+Toilette|'
    r'Eau\s+de\s+Cologne|Agua\s+de\s+Perfume|Agua\s+de\s+Colonia|'
    r'EDP|EDT|EDC|Parfum|Extrait|Edp|Edt)\b',
    re.IGNORECASE,
)

# Category / prefix words - not part of the model name
NOISE_RE = re.compile(
    r'\b(?:Perfume|Hombre|Mujer|Unisex|For\s+Men|For\s+Women)\b',
    re.IGNORECASE,
)

VOL_RE = re.compile(r'(\d+)\s*m[lL]')

# --------------------------------------------------------------------------
def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


def make_slug(brand, name):
    raw = f"{brand} {name}"
    s = strip_accents(raw.lower())
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


SMALL_WORDS = {"de", "la", "le", "du", "des", "et", "and", "of", "the", "&", "di"}

def titlify(s):
    words = s.split()
    result = []
    for i, w in enumerate(words):
        if w.upper() == w and 1 < len(w) <= 5 and w.isalpha():
            result.append(w)          # keep acronyms like EDP, YSL
        elif w.lower() in SMALL_WORDS and i > 0:
            result.append(w.lower())  # small words lowercase (not first)
        else:
            result.append(w.capitalize())
    return " ".join(result)


def match_brand(text):
    """Return (canonical_brand, start, end) for longest matching brand key."""
    text_l = text.lower()
    for key in BRAND_KEYS:
        idx = text_l.find(key)
        if idx == -1:
            continue
        before_ok = (idx == 0 or not text_l[idx - 1].isalpha())
        after_idx = idx + len(key)
        after_ok  = (after_idx >= len(text_l) or not text_l[after_idx].isalpha())
        if before_ok and after_ok:
            return BRANDS[key], idx, after_idx
    return None, -1, -1


def parse(stem):
    """Return (brand, name, volume, confidence_note)."""
    # Normalize: hyphens/underscores -> space
    text = re.sub(r"[-_]+", " ", stem)
    text = re.sub(r"\s+", " ", text).strip()

    # 1. Extract volume
    vm = VOL_RE.search(text)
    volume = f"{vm.group(1)}ml" if vm else "100ml"
    if vm:
        text = (text[:vm.start()] + text[vm.end():]).strip()
        text = re.sub(r"\s+", " ", text).strip()

    # 2. Remove concentration tokens
    text = CONC_RE.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # 3. Remove category / prefix noise
    text = NOISE_RE.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # 4. Match brand (longest key, word-boundary-aware)
    brand_canon, b_start, b_end = match_brand(text)

    if brand_canon is None:
        return "Unknown", text.title(), volume, "brand not found"

    # 5. Name = text minus the brand span
    name_raw = (text[:b_start] + text[b_end:]).strip()
    name_raw = re.sub(r"\s+", " ", name_raw).strip()

    # 6. Remove a brand alias that appears at the VERY START of name_raw
    #    (e.g. "CH" leftover after "Carolina Herrera" removed from mid-text)
    name_l = name_raw.lower()
    for key in BRAND_KEYS:
        if not name_l.startswith(key):
            continue
        after_pos = len(key)
        if after_pos >= len(name_l) or not name_l[after_pos].isalpha():
            name_raw = name_raw[after_pos:].strip()
            name_raw = re.sub(r"\s+", " ", name_raw).strip()
            break

    # 7. Strip trailing "de" only — leftover from "J'adore de Christian Dior"
    #    pattern: "J'adore de" -> after brand removal -> trailing "de" stripped
    name_raw = re.sub(r'\s+de\s*$', '', name_raw, flags=re.IGNORECASE).strip()

    note = ""
    if not name_raw:
        note = "name is empty after parsing"
    name = titlify(name_raw) if name_raw else "Unknown Model"

    return brand_canon, name, volume, note


def optimize_image(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as img:
        if img.mode == "P":
            img = img.convert("RGBA")
        elif img.mode not in ("RGB", "RGBA", "L"):
            img = img.convert("RGB")
        if img.width > 800:
            new_h = round(img.height * 800 / img.width)
            img = img.resize((800, new_h), Image.LANCZOS)
        img.save(dst, "WEBP", quality=82, method=6)


FOLDERS = [
    ("Hombre", "hombre"),
    ("Mujer",  "mujer"),
    ("Unisex", "unisex"),
]
IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def main():
    perf_dir  = ROOT / "Perfumes"
    json_path = ROOT / "data" / "perfumes.json"

    new_perfumes = []
    review       = []
    pid          = 1

    for folder_name, category in FOLDERS:
        src_dir = perf_dir / folder_name
        if not src_dir.exists():
            print(f"[SKIP] Perfumes/{folder_name}/ not found")
            continue

        imgs = sorted(f for f in src_dir.iterdir() if f.suffix.lower() in IMG_EXTS)
        print(f"\n-- {folder_name} ({len(imgs)} images) --")

        for img in imgs:
            brand, name, volume, note = parse(img.stem)
            sl       = make_slug(brand, name)
            webp_rel = f"assets/images/perfumes/{folder_name}/{sl}.webp"
            webp_dst = ROOT / webp_rel

            try:
                optimize_image(img, webp_dst)
                print(f"  [OK] {img.name}")
            except Exception as e:
                print(f"  [ERR] {img.name}  ->  {e}")
                webp_rel = f"assets/images/perfumes/{folder_name}/{img.name}"

            familia     = "Unisex" if category == "unisex" else None
            description = f"{brand} {name}, Eau de Parfum {volume}."

            entry = {
                "id":          pid,
                "brand":       brand,
                "name":        name,
                "category":    category,
                "volume":      volume,
                "price":       None,
                "badge":       None,
                "familia":     familia,
                "description": description,
                "image":       webp_rel,
            }
            new_perfumes.append(entry)

            if note or brand == "Unknown":
                review.append({
                    "id":    pid,
                    "file":  img.name,
                    "brand": brand,
                    "name":  name,
                    "note":  note or "unknown brand",
                })

            pid += 1

    # Write JSON completely from scratch
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(new_perfumes, f, ensure_ascii=False, indent=2)
    print(f"\n[OK] Wrote {len(new_perfumes)} entries -> data/perfumes.json")

    # Summary
    print("\n" + "=" * 65)
    print("RESUMEN")
    print("=" * 65)
    by_cat = {}
    for p in new_perfumes:
        by_cat[p["category"]] = by_cat.get(p["category"], 0) + 1
    for cat, cnt in sorted(by_cat.items()):
        print(f"  {cat:10s}: {cnt} perfumes")
    print(f"  {'TOTAL':10s}: {len(new_perfumes)}")

    if review:
        print(f"\nItems que necesitan revision manual ({len(review)}):")
        print(f"{'ID':<4} {'Brand':<22} {'Name':<28} Nota")
        print("-" * 80)
        for r in review:
            print(f"{r['id']:<4} {r['brand']:<22} {r['name']:<28} {r['note']}")
            print(f"     archivo: {r['file']}")
    else:
        print("\nTodos los items parseados con confianza.")

    print("\nListo.")


if __name__ == "__main__":
    main()
