/**
 * src/app/robots.ts — El archivo /robots.txt del sitio (Fase 6).
 *
 * QUÉ ES
 *   Next.js convierte este archivo en la respuesta de /robots.txt, el texto
 *   que los buscadores leen antes de recorrer un sitio.
 *
 * POR QUÉ EXISTE
 *   La tienda se publica primero como sitio de PRUEBAS en Cloudflare
 *   (isabelee-fragancias.<cuenta>.workers.dev). No debe aparecer en Google
 *   antes del lanzamiento: un resultado con precios o textos a medio hacer
 *   se queda en el buscador semanas.
 *     - NEXT_PUBLIC_INDEXAR distinto de "true" (o sin definir):
 *         User-agent: *  /  Disallow: /     → nadie recorre nada.
 *     - NEXT_PUBLIC_INDEXAR = "true" (al lanzar):
 *         todo permitido salvo /admin y /auth (el panel y sus enlaces de
 *         acceso no tienen nada que buscar).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lee INDEXAR de src/lib/site.ts, el mismo valor que usa el layout raíz
 *     (src/app/layout.tsx) para la etiqueta <meta name="robots">. Las dos
 *     cosas van juntas: robots.txt pide no recorrer y la etiqueta pide no
 *     indexar lo que se llegue a ver por otro camino (un enlace compartido).
 *   - Se genera al compilar (es estático). Cambiar la variable exige volver
 *     a desplegar. Procedimiento en doc/DESPLIEGUE.md, "Encender la
 *     indexación".
 *   - Aún no hay sitemap: cuando exista, se anuncia aquí con `sitemap:`.
 */
import type { MetadataRoute } from "next";
import { INDEXAR } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXAR) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/auth"] },
  };
}
