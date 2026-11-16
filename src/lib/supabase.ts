/**
 * src/lib/supabase.ts — Conexión con Supabase.
 *
 * QUÉ ES
 *   El único lugar del proyecto donde se crean clientes de Supabase. Expone
 *   dos funciones, una por cada nivel de permiso:
 *
 *   1. getSupabaseClient() — cliente PÚBLICO.
 *      Usa la clave "publishable" (antes llamada "anon key"). Es seguro que
 *      llegue al navegador: solo puede hacer lo que permitan las políticas
 *      RLS de la base de datos, es decir, LEER perfumes activos y reseñas.
 *
 *   2. getSupabaseAdmin() — cliente de ADMINISTRACIÓN.
 *      Usa la clave secreta, que se SALTA todas las políticas RLS: puede
 *      crear, editar y borrar cualquier cosa. Solo debe ejecutarse en el
 *      servidor (rutas de API, scripts). Si se llama desde el navegador,
 *      lanza un error a propósito.
 *
 * POR QUÉ EXISTE
 *   Centraliza la lectura de las variables de entorno y evita que cada
 *   archivo cree su propia conexión con claves distintas o mal escritas.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Las claves salen de .env.local (que nunca se sube a Git):
 *       NEXT_PUBLIC_SUPABASE_URL
 *       NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *       SUPABASE_SECRET_KEY
 *     El prefijo NEXT_PUBLIC_ hace que Next.js incluya la variable en el
 *     JavaScript del navegador. La clave secreta NO lleva ese prefijo, así
 *     que Next nunca la envía al cliente.
 *   - src/lib/perfumes.ts es quien usa estos clientes; los componentes no
 *     deberían llamar a Supabase directamente.
 *   - scripts/migrate-perfumes.ts usa getSupabaseAdmin() para cargar el
 *     catálogo inicial.
 *   - En producción (Vercel/Cloudflare) hay que definir las mismas tres
 *     variables en el panel del hosting.
 */
import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Cliente público ya creado, para reutilizarlo en vez de crear uno por llamada. */
let publicClient: SupabaseClient | undefined;

/**
 * Lee la URL y la clave pública del entorno.
 * Se leen DENTRO de la función (no al cargar el archivo) para que el script
 * de migración pueda cargar .env.local antes de usarlas. Deben escribirse
 * literalmente como process.env.NEXT_PUBLIC_...: así es como Next.js las
 * sustituye por su valor al compilar el código del navegador.
 */
function readPublicEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Revisa el archivo .env.local (y reinicia el servidor tras editarlo).",
    );
  }
  return { url, publishableKey };
}

/**
 * Cliente público: lecturas del catálogo, respetando RLS.
 * Funciona igual en el servidor (páginas renderizadas con SSR) y en el
 * navegador (componentes de cliente).
 */
export function getSupabaseClient(): SupabaseClient {
  if (publicClient) return publicClient;

  const { url, publishableKey } = readPublicEnv();

  publicClient =
    typeof window === "undefined"
      ? // Servidor: no hay sesión de usuario que recordar ni refrescar.
        createClient(url, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : // Navegador: cliente de @supabase/ssr, preparado para manejar la
        // sesión con cookies cuando llegue el inicio de sesión (Fase 3).
        createBrowserClient(url, publishableKey);

  return publicClient;
}

/**
 * Cliente de administración: se salta RLS. SOLO servidor.
 * Se crea uno nuevo en cada llamada para no dejar un cliente con permisos
 * totales guardado en memoria compartida.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "getSupabaseAdmin() solo puede usarse en el servidor: la clave secreta nunca debe llegar al navegador.",
    );
  }

  const { url } = readPublicEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Falta SUPABASE_SECRET_KEY. Revisa el archivo .env.local.");
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
