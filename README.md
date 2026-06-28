# Isabeleé Parfums — Frontend Project

Modern luxury perfume e-commerce landing page.  
**Tech:** HTML5 · CSS3 · Vanilla JavaScript · Modular components

---

## Project Structure

```
isabelee-perfumes/
├── index.html               ← Entry point
├── css/
│   ├── variables.css        ← All design tokens (colors, fonts, spacing)
│   ├── style.css            ← Main styles
│   └── responsive.css       ← Media queries only
├── js/
│   ├── main.js              ← Bootstrap, component loader, global behaviours
│   ├── products.js          ← Product rendering, filtering, wishlist
│   └── cart.js              ← Cart state, drawer UI, WhatsApp checkout
├── components/
│   ├── header.html          ← Navbar + mobile menu
│   ├── hero.html            ← Full-screen hero banner
│   ├── categories.html      ← Hombre / Mujer category cards
│   ├── products.html        ← Product grid + filter tabs + promo strip
│   ├── newsletter.html      ← Email subscribe section
│   └── footer.html          ← Footer with social, links, contact
├── data/
│   └── perfumes.json        ← Product catalog (edit here to add products)
├── assets/
│   ├── images/              ← Product photos (named per perfumes.json)
│   ├── logos/               ← isabelee-logo.png
│   ├── banners/             ← Hero/category banners
│   └── icons/               ← favicon.png, social icons
└── README.md
```

---

## How to Run

Components are loaded via `fetch()` and require a local web server.

**Option A — VS Code Live Server (recommended)**
1. Install the "Live Server" extension in VS Code
2. Right-click `index.html` → **Open with Live Server**

**Option B — Python (built-in)**
```bash
# Python 3
python -m http.server 8080
# then open: http://localhost:8080
```

**Option C — Node.js**
```bash
npx serve .
```

> Opening `index.html` directly as `file://` will block `fetch()` due to CORS.  
> Always use a local server.

---

## Adding Products

Edit `data/perfumes.json`. Each product follows this schema:

```json
{
  "id": 11,
  "brand": "BRAND NAME",
  "name": "Perfume Name",
  "description": "Extrait de Parfum",
  "volume": "50 ML",
  "price": 499900,
  "category": "mujer",          // "mujer" | "hombre" | "unisex"
  "badge": "Nuevo",              // null = no badge
  "badgeType": "new",            // "new" | "popular" | "exclusive" | null
  "image": "assets/images/brand-name.jpg",
  "gradient": "linear-gradient(145deg,#f9d5e5 0%,#f0a0c0 100%)",
  "capColor": "#c96090",
  "shineColor": "rgba(255,255,255,0.4)"
}
```

**gradient** — CSS background shown when no image is found  
**capColor** — color of the SVG bottle cap placeholder  
**shineColor** — opacity/color of bottle body shine

---

## Adding Product Images

1. Export/save your product photo as JPG or PNG
2. Name it matching `perfumes.json` → `"image"` field  
   e.g. `assets/images/ilmin-il-roso.jpg`
3. Recommended size: **600 × 800 px** minimum, square or portrait

> If an image fails to load, the SVG bottle placeholder is shown automatically.

---

## Logo

Place your logo file at:
```
assets/logos/isabelee-logo.png
```
The header and footer both reference this path. Recommended height: **120px+** at 2× for retina displays.

---

## Customizing Colors & Fonts

All design tokens are in `css/variables.css`:

```css
:root {
  --clr-black:  #000000;   /* main text */
  --clr-white:  #FFFFFF;   /* background */
  --clr-gold:   #C9A96E;   /* accent */
  --clr-beige:  #F5F0EB;   /* newsletter bg */
  --font-serif: 'Cormorant Garamond', serif;
  --font-sans:  'Jost', sans-serif;
  /* ... */
}
```

---

## WhatsApp Number

Search and replace `573011431065` across all files to update the number.

---

## Responsive Breakpoints

| Screen       | Products/row |
|--------------|:------------:|
| Desktop      | 4            |
| ≤ 1280px     | 3            |
| ≤ 768px      | **2**        |
| ≤ 480px      | **2** (tight) |

---

## Extracting Images from the PDF Catalog

The product images are embedded in `Perfume Mujeres.pdf`. To extract them:

1. Open the PDF in **Adobe Acrobat** (or free alternative **PDF24**)
2. Go to **Tools → Export PDF → Image**  
   — or — right-click each image → **Copy Image**
3. Save each image named as specified in `perfumes.json`
4. Place files in `assets/images/`

---

*Built for Isabeleé Parfums · 2025*
