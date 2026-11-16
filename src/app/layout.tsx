/**
 * src/app/layout.tsx — Layout raíz de Isabelé Fragancias (v2, Next.js).
 *
 * QUÉ ES
 *   El "marco" HTML que envuelve a TODAS las páginas de la app. En el App
 *   Router de Next.js este archivo es obligatorio: define las etiquetas
 *   <html> y <body>, y cada página (por ejemplo src/app/page.tsx) se
 *   inyecta donde aparece {children}.
 *
 * POR QUÉ EXISTE
 *   En el sitio estático anterior, cada HTML (index.html, producto.html)
 *   repetía su propio <head>, la navbar, el footer, el botón de WhatsApp y
 *   el modal. Aquí todo eso se declara una sola vez y lo heredan todas las
 *   rutas, presentes y futuras.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Importa ./globals.css, que carga Tailwind y las animaciones CSS.
 *   - Carga las dos tipografías de marca con next/font, que las descarga
 *     en la compilación y las sirve desde el propio dominio (sin pedir
 *     nada a Google al visitar el sitio). Cada fuente expone una variable
 *     CSS (--font-cormorant, --font-jost) que tailwind.config.ts usa para
 *     las clases `font-serif` y `font-sans`.
 *   - Monta los componentes presentes en todas las páginas:
 *       <Header />          src/components/layout/Header.tsx
 *       <Footer />          src/components/layout/Footer.tsx
 *       <WhatsAppButton />  src/components/ui/WhatsAppButton.tsx
 *       <WelcomeModal />    src/components/ui/WelcomeModal.tsx
 *   - Exporta `metadata`, que Next convierte en <title>, <meta> y
 *     etiquetas Open Graph (la vista previa al compartir el enlace en
 *     WhatsApp o redes). Una página puede sobrescribirlo con el suyo.
 *   - Es un componente de servidor; los componentes interactivos que
 *     monta llevan su propio "use client".
 */
import type { Metadata } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import WelcomeModal from "@/components/ui/WelcomeModal";
import WhatsAppButton from "@/components/ui/WhatsAppButton";
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
      <body className="bg-dark-deep font-sans text-ink antialiased">
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
        <WelcomeModal />
      </body>
    </html>
  );
}
