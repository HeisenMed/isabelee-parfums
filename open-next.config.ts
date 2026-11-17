/**
 * open-next.config.ts — Configuración del adaptador OpenNext para
 * Cloudflare (Fase 6).
 *
 * QUÉ ES
 *   Le dice a @opennextjs/cloudflare dónde guardar la caché de Next.js
 *   cuando la app corre como Worker de Cloudflare.
 *
 * POR QUÉ EXISTE
 *   En un servidor normal, Next.js guarda las páginas generadas en el disco
 *   (.next/). Un Worker no tiene disco persistente, así que la caché va a
 *   servicios de Cloudflare. Sin esto, `revalidate = 60` (ISR, Incremental
 *   Static Regeneration) y revalidatePath() —con los que el panel actualiza
 *   la tienda al guardar— no funcionarían.
 *
 *   Es la configuración que la documentación de OpenNext recomienda para un
 *   "sitio pequeño que usa revalidación" (opennext.js.org/cloudflare/caching):
 *     - incrementalCache: R2 → las páginas generadas (bucket isabelee-cache).
 *     - tagCache: D1     → cuándo se invalidó cada ruta (revalidatePath).
 *     - queue: Durable Object → regenera en segundo plano las páginas con
 *       `revalidate = 60` cuando caducan (obligatoria con revalidación por
 *       tiempo).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Cada pieza busca su binding en wrangler.jsonc por un nombre fijo:
 *     NEXT_INC_CACHE_R2_BUCKET, NEXT_TAG_CACHE_D1, NEXT_CACHE_DO_QUEUE y
 *     WORKER_SELF_REFERENCE.
 *   - Lo leen `opennextjs-cloudflare build`, `preview` y `deploy`
 *     (scripts cf:* de package.json). `next dev` y `next build` no lo usan.
 *   - Explicación completa en doc/DESPLIEGUE.md.
 */
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
