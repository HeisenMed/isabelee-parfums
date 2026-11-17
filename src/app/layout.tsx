/**
 * src/app/layout.tsx — Layout raíz de Isabelé Fragancias (v2, Next.js).
 *
 * QUÉ ES
 *   El "marco" HTML mínimo que envuelve a TODAS las rutas de la app, tanto
 *   la tienda como el panel de administración. En el App Router de Next.js
 *   este archivo es obligatorio: define las etiquetas <html> y <body>.
 *
 * POR QUÉ EXISTE
 *   Desde la Fase 3 el proyecto tiene dos "sitios" que comparten dominio
 *   pero no apariencia: la tienda (oscura, con header, footer y WhatsApp) y
 *   el panel de administración (claro y sobrio). Por eso este layout ya NO
 *   monta el Header ni el Footer: solo deja lo que de verdad es común a
 *   ambos —el documento HTML, las tipografías, el CSS global y los
 *   metadatos del sitio— y cada zona añade su propio marco:
 *       src/app/(tienda)/layout.tsx   → marco de la tienda
 *       src/app/admin/layout.tsx      → marco del panel
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Importa ./globals.css, que carga Tailwind y las animaciones CSS.
 *   - Carga las dos tipografías de marca con next/font, que las descarga
 *     en la compilación y las sirve desde el propio dominio (sin pedir
 *     nada a Google al visitar el sitio). Cada fuente expone una variable
 *     CSS (--font-cormorant, --font-jost) que tailwind.config.ts usa para
 *     las clases `font-serif` y `font-sans`. Las usan la tienda y el panel.
 *   - Exporta `metadata`, que Next convierte en <title>, <meta> y
 *     etiquetas Open Graph (la vista previa al compartir el enlace en
 *     WhatsApp o redes). Cada página puede sobrescribirlo; el panel
 *     cambia además la plantilla del título en src/app/admin/layout.tsx.
 *   - src/app/not-found.tsx (la página 404) se dibuja directamente dentro
 *     de este layout, por eso trae su propio header y footer.
 *   - Es un componente de servidor.
 */
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

/** Títulos y texto de marca. Incluye itálica para los acentos dorados. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap", // muestra texto con fuente de respaldo mientras carga
});

/** Cuerpo de texto, menús y botones. */
const jost = Jost({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jost",
  display: "swap",
});

/** Descripción compartida por la etiqueta <meta> y por Open Graph. */
const description =
  "Las fragancias más vendidas del mundo, disponibles en Colombia. Perfumes para hombre, mujer y unisex.";

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    // Las páginas internas mostrarán "Su título | Isabelé Fragancias".
    template: `%s | ${SITE_NAME}`,
  },
  description,
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description,
    siteName: SITE_NAME,
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="es": todo el contenido está en español (lectores de pantalla y
    // buscadores lo usan). Las variables de fuente se declaran en <html>
    // para que estén disponibles en todo el documento.
    // data-scroll-behavior: avisa a Next de que el scroll suave de
    // globals.css es intencional, para que no interfiera al navegar.
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${jost.variable}`}
    >
      {/* El <body> solo fija la tipografía base. Los colores (fondo y texto)
          los pone el marco de cada zona: oscuro en la tienda, claro en el
          panel. */}
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
