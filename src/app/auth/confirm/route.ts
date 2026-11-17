/**
 * src/app/auth/confirm/route.ts — Puerta de entrada de los enlaces de correo.
 *
 * QUÉ ES
 *   Un Route Handler (una ruta que no dibuja una página, sino que responde
 *   directamente a la petición) para GET /auth/confirm. Es la dirección a
 *   la que apuntan los enlaces de los correos de Supabase Auth:
 *   "te han invitado" y "restablece tu contraseña".
 *
 * POR QUÉ EXISTE
 *   El enlace del correo trae un código de un solo uso (token_hash). Aquí
 *   se canjea por una sesión con verifyOtp() —OTP (One-Time Password):
 *   contraseña de un solo uso— y, si es válido, la persona queda conectada
 *   y se la envía a crear su contraseña. Se hace en el servidor para que
 *   las cookies de sesión se escriban de forma segura y el código no pase
 *   por JavaScript del navegador.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Las plantillas de correo de Supabase ("Invite user" y "Reset
 *     Password") deben enlazar aquí. Se editan a mano en el Dashboard; el
 *     texto exacto está en supabase/README.md, "Plantillas de correo":
 *       /auth/confirm?token_hash=...&type=invite&next=/admin/crear-contrasena
 *   - Usa el cliente con sesión de src/lib/supabase-server.ts. En un Route
 *     Handler sí se pueden escribir cookies.
 *   - El middleware (src/middleware.ts) pasa por esta ruta, pero no exige
 *     sesión: quien llega aquí todavía no la tiene.
 *   - Si el enlace no vale, se redirige a /admin/login?error=enlace, donde
 *     src/app/admin/(acceso)/login/page.tsx muestra la explicación.
 *
 * SEGURIDAD
 *   - Solo se aceptan cuatro tipos de enlace (TIPOS_PERMITIDOS).
 *   - `next` se valida con rutaAdminSegura(): nunca se redirige fuera del
 *     panel, aunque alguien manipule el enlace (evita el "open redirect").
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import {
  RUTA_CREAR_CONTRASENA,
  RUTA_LOGIN,
  RUTA_PANEL,
  rutaAdminSegura,
} from "@/lib/admin-rutas";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * Tipos de enlace admitidos:
 *   invite     invitación a un administrador nuevo
 *   recovery   "olvidé mi contraseña"
 *   email      confirmación de correo / enlace de acceso (nombre actual)
 *   magiclink  enlace de acceso sin contraseña (nombre antiguo)
 */
const TIPOS_PERMITIDOS: readonly EmailOtpType[] = [
  "invite",
  "recovery",
  "email",
  "magiclink",
];

/** Comprueba que el texto de la URL sea uno de los tipos permitidos. */
function esTipoPermitido(valor: string | null): valor is EmailOtpType {
  return TIPOS_PERMITIDOS.includes(valor as EmailOtpType);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!tokenHash || !esTipoPermitido(type)) {
    redirect(`${RUTA_LOGIN}?error=enlace`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    // Caducado, ya usado o inventado: en todos los casos, el mismo aviso.
    redirect(`${RUTA_LOGIN}?error=enlace`);
  }

  // Si el enlace no trae un `next` válido, una invitación o recuperación
  // va a "crear contraseña" (es para lo que sirve ese correo) y el resto,
  // a la portada del panel.
  const porDefecto =
    type === "invite" || type === "recovery"
      ? RUTA_CREAR_CONTRASENA
      : RUTA_PANEL;

  // redirect() va fuera de cualquier try/catch: funciona lanzando una
  // excepción que Next.js intercepta.
  redirect(rutaAdminSegura(searchParams.get("next"), porDefecto));
}
