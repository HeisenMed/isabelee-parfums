/**
 * src/lib/site.ts — Datos globales del sitio (marca, navegación, contacto).
 *
 * QUÉ ES
 *   Un módulo de constantes: nombre de la marca, lema, enlaces del menú y
 *   las URLs de WhatsApp.
 *
 * POR QUÉ EXISTE
 *   En el sitio estático el número de WhatsApp estaba repetido en cuatro
 *   archivos (index.html, producto.html, cart.js, footer.html) y había que
 *   cambiarlo en todos. Aquí vive en UN solo lugar: si el número, el lema
 *   o un enlace del menú cambia, se edita solo este archivo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Header.tsx y Footer.tsx leen NAV_LINKS para pintar el menú.
 *   - Las tarjetas y la ficha de producto usan PLACEHOLDER_IMAGE,
 *     formatPrecio() y whatsappUrl().
 *   - WhatsAppButton.tsx, WelcomeModal.tsx, WhatsAppCta.tsx y Footer.tsx
 *     usan las URLs de WhatsApp.
 *   - layout.tsx usa SITE_NAME y SITE_TAGLINE para los metadatos.
 *   - No lleva "use client": son datos puros, sirven tanto en componentes
 *     de servidor como de cliente.
 */

/**
 * Nombre comercial. Se escribe "Isabeleé": doble e, con la tilde en la
 * ÚLTIMA. (El sitio v1 se llamaba "Isabeleé Parfums"; durante las primeras
 * fases de v2 se usó "Isabelé".)
 */
export const SITE_NAME = "Isabeleé Fragancias";

/** Forma corta de la marca, usada como logotipo de texto. */
export const SITE_SHORT_NAME = "Isabeleé";

/** Lema de la marca. */
export const SITE_TAGLINE = "Donde cada aroma encuentra su historia";

/** Número del negocio tal como se muestra a las personas. */
export const WHATSAPP_DISPLAY = "+57 304 644 6463";

/** Enlace base de WhatsApp, sin mensaje (CLAUDE.md §11.3). */
export const WHATSAPP_URL = "https://wa.me/573046446463";

/**
 * Enlace de WhatsApp con el mensaje prellenado estándar:
 * "Hola Isabeleé, me interesa una fragancia 🌷".
 * Se construye con whatsappUrl() (definida más abajo), que codifica la
 * tilde, los espacios y el emoji para la URL: así el nombre de la marca
 * sale de SITE_SHORT_NAME y no hay que reescribir a mano secuencias como
 * %C3%A9 si vuelve a cambiar.
 * El emoji es la única excepción permitida por CLAUDE.md §10.3, porque se
 * muestra dentro de WhatsApp y no en la interfaz del sitio.
 */
export const WHATSAPP_MESSAGE_URL = whatsappUrl(
  `Hola ${SITE_SHORT_NAME}, me interesa una fragancia 🌷`,
);

/** Forma de cada enlace de navegación. */
export type NavLink = {
  /** Texto visible. */
  label: string;
  /** Destino. Las anclas (#) apuntan a secciones de la página de inicio. */
  href: string;
};

/**
 * Enlaces del menú principal, en el mismo orden que la navbar anterior.
 * Hombre / Mujer / Unisex abren el catálogo ya filtrado por categoría: el
 * parámetro ?genero= lo interpreta src/app/(tienda)/catalogo/page.tsx.
 */
export const NAV_LINKS: NavLink[] = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/catalogo" },
  { label: "Hombre", href: "/catalogo?genero=Hombre" },
  { label: "Mujer", href: "/catalogo?genero=Mujer" },
  { label: "Unisex", href: "/catalogo?genero=Unisex" },
  { label: "Contacto", href: "/#contacto" },
];

/**
 * Imagen genérica para perfumes que aún no tienen foto (CLAUDE.md §4).
 * Debe coincidir con la que usa supabase/seed/seed-from-v1.ts.
 */
export const PLACEHOLDER_IMAGE = "/assets/images/perfumes/placeholder-locion.webp";

/**
 * Construye un enlace de WhatsApp con un mensaje prellenado cualquiera.
 * encodeURIComponent convierte espacios, tildes y signos al formato que
 * exige una URL (CLAUDE.md §11.3).
 */
export function whatsappUrl(message: string): string {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

/**
 * Da formato de pesos colombianos a un precio: 250000 → "$ 250.000".
 * Sin decimales, porque los precios del catálogo son valores enteros en COP.
 */
export function formatPrecio(precio: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(precio);
}
