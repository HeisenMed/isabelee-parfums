/**
 * open-next.config.ts — Configuración del adaptador OpenNext para
 * Cloudflare (Fase 6, simplificada en la Fase 6B).
 *
 * QUÉ ES
 *   Le dice a @opennextjs/cloudflare dónde buscar las páginas que Next.js
 *   ya generó al compilar, cuando la app corre como Worker de Cloudflare.
 *
 * POR QUÉ EXISTE
 *   Fase 6B: para el primer lanzamiento se decidió NO usar caché de páginas
 *   en Cloudflare (R2 pide método de pago y añade recursos que mantener).
 *   Toda la tienda se genera en cada visita (`dynamic = "force-dynamic"` en
 *   la portada, las fichas y /api/buscar; /catalogo ya lo era).
 *
 *   Aun así quedan unas pocas rutas que Next genera AL COMPILAR y no cambian
 *   hasta el siguiente despliegue: /robots.txt, la página 404 y
 *   /admin/recuperar. Para ellas, la documentación de OpenNext
 *   (opennext.js.org/cloudflare/caching, "SSG site") recomienda la caché
 *   incremental de SOLO LECTURA basada en Workers Static Assets: el
 *   despliegue copia esas páginas junto a los archivos estáticos y el Worker
 *   las lee de ahí. No necesita cola, ni caché de etiquetas, ni ningún
 *   recurso de pago.
 *
 *   Por qué esta y no la "dummy" (la que se usa sin indicar nada): la dummy
 *   no guarda ni lee nada, así que cada página precompilada tendría que
 *   volver a generarse en cada petición o fallar; la documentación no la
 *   presenta como opción para páginas precompiladas.
 *
 *   enableCacheInterception (servir esas páginas antes de cargar Next.js)
 *   queda desactivado, su valor por defecto: solo acelera tres rutas poco
 *   visitadas y es una pieza más que probar.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Solo necesita el binding ASSETS, que ya está en wrangler.jsonc.
 *   - Lo leen `opennextjs-cloudflare build`, `preview` y `deploy` (scripts
 *     cf:* de package.json). `next dev` y `next build` no lo usan.
 *   - revalidatePath() en las Server Actions del panel no rompe nada: sin
 *     caché de etiquetas, OpenNext usa una "dummy" que no escribe nada, y
 *     además captura cualquier error (comprobado en su código).
 *   - Cómo volver a la caché con R2 + D1 + Durable Object:
 *     doc/DESPLIEGUE.md, "Cómo reactivar la caché".
 */
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
