/**
 * src/app/layout.tsx — Layout raíz de Isabeleé Fragancias (v2, Next.js).
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
 *   - INDEXACIÓN (Fase 6): `metadata.robots` depende de INDEXAR
 *     (src/lib/site.ts, variable NEXT_PUBLIC_INDEXAR). Mientras no sea
 *     "true", toda la tienda lleva noindex, nofollow; va a la par con
 *     src/app/robots.ts.
 *   - src/app/not-found.tsx (la página 404) se dibuja directamente dentro
 *     de este layout, por eso trae su propio header y footer.
 *   - TEMA DÍA/NOCHE (Fase 4): un script en <head> pone data-theme en
 *     <html> antes de que se pinte nada (ver SCRIPT_TEMA más abajo). Las
 *     variables de color de cada tema están en globals.css y el botón que
 *     lo cambia es src/components/ui/ThemeToggle.tsx.
 *   - Es un componente de servidor.
 */
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { INDEXAR, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

/**
 * Clave de localStorage con el tema elegido ("noche" | "dia"). La misma
 * constante usa ThemeToggle.tsx; se repite aquí como texto porque el
 * script de abajo se ejecuta antes que cualquier módulo de JavaScript.
 */
const CLAVE_TEMA = "isabelee-tema";

/**
 * Script que se ejecuta en <head>, ANTES de pintar la página.
 *
 * Por qué: si el tema se aplicara desde React (después de cargar el
 * JavaScript), quien eligió el modo día vería primero la página en noche
 * y luego un "fogonazo" al cambiar. Este script mínimo lee la preferencia
 * y pone data-theme en <html> antes del primer pintado.
 *   - Cualquier valor que no sea "dia" se trata como "noche" (el tema por
 *     defecto de la marca).
 *   - try/catch: en algunos navegadores en modo privado, o con el
 *     almacenamiento bloqueado, leer localStorage lanza un error; entonces
 *     se queda en noche.
 * Se escribe como texto (no como función de React) porque debe ir
 * literalmente dentro de <script> en el HTML.
 */
const SCRIPT_TEMA = `(function(){var t="noche";try{if(localStorage.getItem("${CLAVE_TEMA}")==="dia")t="dia"}catch(e){}document.documentElement.setAttribute("data-theme",t)})();`;

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
    // Las páginas internas mostrarán "Su título | Isabeleé Fragancias".
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
  // Mientras NEXT_PUBLIC_INDEXAR no sea "true" (sitio de pruebas), se pide a
  // los buscadores que no indexen ni sigan enlaces. Con "true", no se pone
  // nada y rige el comportamiento normal. El panel lo vuelve a fijar en
  // noindex siempre (src/app/admin/layout.tsx).
  robots: INDEXAR ? undefined : { index: false, follow: false },
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
    // data-theme="noche": el valor que llega en el HTML del servidor. Si la
    //   persona eligió el día, SCRIPT_TEMA lo cambia antes de pintar.
    // suppressHydrationWarning: como SCRIPT_TEMA puede cambiar data-theme
    //   antes de que React "hidrate" la página (es decir, antes de que
    //   conecte su versión con el HTML recibido), React vería que <html> no
    //   coincide con lo que generó el servidor y avisaría de un error de
    //   hidratación. Esta propiedad le indica que esa diferencia en los
    //   atributos de <html> es intencional. Solo afecta a <html>, no a sus
    //   hijos: cualquier otro desajuste seguiría avisándose.
    <html
      lang="es"
      data-scroll-behavior="smooth"
      data-theme="noche"
      suppressHydrationWarning
      className={`${cormorant.variable} ${jost.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      {/* El <body> solo fija la tipografía base. Los colores (fondo y texto)
          los pone el marco de cada zona: la tienda (noche o día) y el panel
          (siempre claro). */}
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
