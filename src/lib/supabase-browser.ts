"use client";

/**
 * src/lib/supabase-browser.ts — Cliente de Supabase CON SESIÓN, en el navegador.
 *
 * QUÉ ES
 *   La función getSupabaseBrowserClient(): devuelve un cliente de Supabase
 *   que se ejecuta en el navegador y lleva la sesión de la administradora
 *   que inició sesión en el panel. Es el cuarto cliente del proyecto:
 *
 *     getSupabaseClient()            src/lib/supabase.ts         público, lecturas de la tienda
 *     getSupabaseAdmin()             src/lib/supabase.ts         clave secreta, solo el seed
 *     createSupabaseServerClient()   src/lib/supabase-server.ts  sesión, en el servidor
 *     getSupabaseBrowserClient()     este archivo                sesión, en el navegador
 *
 * POR QUÉ EXISTE
 *   Para SUBIR fotos y videos directamente desde el navegador a Supabase
 *   Storage. Si los archivos pasaran por nuestro servidor (por ejemplo, en
 *   una Server Action), un video de 50 MB tendría que viajar dos veces y
 *   chocaría con el límite de tamaño de las peticiones de Next.js. Subiendo
 *   desde aquí, el archivo va del navegador a Supabase en un solo viaje.
 *
 *   La seguridad no depende de este archivo: la clave que usa es la
 *   pública (publishable), y lo que permite subir o borrar son las
 *   políticas RLS (Row Level Security, reglas de acceso de Postgres) de la
 *   migración n.º 2, que exigen is_admin(). Sin sesión de administradora,
 *   Supabase rechaza la subida.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - createBrowserClient de @supabase/ssr (SSR = Server-Side Rendering)
 *     lee la sesión de las MISMAS cookies que escriben el servidor y el
 *     middleware al iniciar sesión (src/app/admin/actions.ts,
 *     src/middleware.ts). Esas cookies no son "httpOnly" precisamente para
 *     que este cliente pueda leerlas. No hay que volver a iniciar sesión.
 *   - En el navegador, @supabase/ssr devuelve siempre el mismo cliente
 *     (un "singleton"): llamar a esta función muchas veces no crea muchas
 *     conexiones.
 *   - Lo usa src/components/admin/GestorMedia.tsx para subir archivos (y
 *     para borrar uno recién subido si después falla el guardado).
 *   - "use client": no debe importarse desde código de servidor.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseBrowserClient(): SupabaseClient {
  // Escritas literalmente así para que Next.js sustituya su valor al
  // compilar el código del navegador (solo las variables NEXT_PUBLIC_ lo
  // permiten; la clave secreta nunca llega aquí).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Revisa el archivo .env.local (y reinicia el servidor tras editarlo).",
    );
  }

  return createBrowserClient(url, publishableKey);
}
