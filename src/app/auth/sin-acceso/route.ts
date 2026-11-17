/**
 * src/app/auth/sin-acceso/route.ts — Cierra la sesión de quien no es
 * administrador.
 *
 * QUÉ ES
 *   Un Route Handler para GET /auth/sin-acceso. Cierra la sesión actual y
 *   redirige a /admin/login?error=sin-acceso.
 *
 * POR QUÉ EXISTE
 *   Cuando alguien inicia sesión con una cuenta que NO está en la lista de
 *   administradores, el layout del panel (src/app/admin/(panel)/layout.tsx)
 *   debe sacarlo. Pero un layout es un Server Component, y Next.js no deja
 *   que un Server Component escriba cookies: no puede cerrar la sesión por
 *   sí mismo. Si solo redirigiera al login, la sesión seguiría abierta, el
 *   middleware vería un usuario conectado y lo devolvería a /admin... y así
 *   en un bucle infinito. Por eso el layout redirige AQUÍ, donde sí se
 *   pueden borrar las cookies.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo llama únicamente el layout del panel, mediante redirect().
 *   - Usa el cliente con sesión de src/lib/supabase-server.ts.
 *   - El destino es fijo (no lee nada de la URL), así que no puede usarse
 *     para redirigir a otro sitio.
 *   - Es un GET que cierra sesión. Lo peor que podría hacer un tercero con
 *     un enlace a esta ruta es desconectar a alguien, que tendría que
 *     volver a entrar; no expone ni modifica datos.
 */
import { redirect } from "next/navigation";
import { RUTA_LOGIN } from "@/lib/admin-rutas";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  // Borra las cookies de sesión aunque el aviso a Supabase fallara.
  await supabase.auth.signOut();
  redirect(`${RUTA_LOGIN}?error=sin-acceso`);
}
