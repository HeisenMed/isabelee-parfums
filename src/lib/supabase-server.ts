/**
 * src/lib/supabase-server.ts — Cliente de Supabase CON SESIÓN (servidor).
 *
 * QUÉ ES
 *   La función createSupabaseServerClient(): crea un cliente de Supabase
 *   que "sabe" quién ha iniciado sesión, porque lee y escribe las cookies
 *   de la petición actual. Es el tercer cliente del proyecto:
 *
 *     getSupabaseClient()            src/lib/supabase.ts   público, sin sesión
 *     getSupabaseAdmin()             src/lib/supabase.ts   clave secreta
 *     createSupabaseServerClient()   este archivo          sesión del usuario
 *
 * POR QUÉ EXISTE
 *   El panel de administración necesita actuar "en nombre de" la persona
 *   que entró. Este cliente usa la clave pública (publishable) más el token
 *   de sesión guardado en las cookies, de modo que la base de datos aplica
 *   las políticas RLS (Row Level Security: reglas de Postgres que deciden,
 *   fila por fila, qué puede leer o escribir cada usuario) según quién sea.
 *   A diferencia de getSupabaseAdmin(), NO se salta la seguridad: si quien
 *   llama no es administrador, la base de datos rechaza la operación.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Usa createServerClient de @supabase/ssr (SSR = Server-Side Rendering,
 *     renderizado en el servidor), la librería oficial para manejar la
 *     sesión con cookies.
 *   - Lo usan SOLO las piezas del panel: src/lib/admin-auth.ts,
 *     src/app/admin/actions.ts y los manejadores de src/app/auth/.
 *   - src/middleware.ts crea su propio cliente con el mismo patrón, porque
 *     allí las cookies se leen de la petición y se escriben en la
 *     respuesta, no con cookies() de next/headers.
 *   - PROHIBIDO importarlo desde la tienda (src/app/(tienda)/ o los
 *     componentes que usa): la tienda no debe depender de la sesión de
 *     nadie, y llamar a cookies() convertiría en dinámica para siempre una
 *     página que podría volver a guardarse en caché (hoy la tienda se genera
 *     en cada visita, Fase 6B; ver doc/DESPLIEGUE.md).
 *   - Solo servidor: next/headers no existe en el navegador, así que
 *     importarlo desde un componente con "use client" rompe la compilación.
 */
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Crea un cliente nuevo para la petición en curso.
 * Hay que llamarla en cada petición (nunca guardar el cliente en una
 * variable global): cada visitante tiene sus propias cookies, y compartir
 * el cliente mezclaría la sesión de una persona con la de otra.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Revisa el archivo .env.local (y reinicia el servidor tras editarlo).",
    );
  }

  // En Next.js 15 cookies() es asíncrona: hay que esperarla con await.
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      // Supabase lee de aquí el token de sesión.
      getAll() {
        return cookieStore.getAll();
      },
      // Supabase llama a setAll cuando la sesión cambia: al iniciar o
      // cerrar sesión, o al renovar un token caducado.
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Next.js solo permite escribir cookies en Server Actions y en
          // Route Handlers. Si esto se ejecuta mientras se dibuja una
          // página o un layout (un Server Component), set() lanza un
          // error. Se ignora a propósito: en ese caso la sesión ya la
          // renovó el middleware (src/middleware.ts) antes de llegar aquí.
        }
      },
    },
  });
}
