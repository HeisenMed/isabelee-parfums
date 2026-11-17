/**
 * src/app/admin/(acceso)/crear-contrasena/page.tsx — Página para crear o
 * cambiar la contraseña (ruta "/admin/crear-contrasena").
 *
 * QUÉ ES
 *   La pantalla a la que llega una administradora tras abrir el enlace de
 *   su correo de invitación o de recuperación.
 *
 * POR QUÉ EXISTE
 *   Las cuentas se crean por invitación y nacen sin contraseña: aquí se
 *   elige la primera. Es la misma pantalla para quien la olvidó.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Flujo completo: correo de Supabase → /auth/confirm (canjea el enlace
 *     por una sesión, src/app/auth/confirm/route.ts) → esta página.
 *   - REQUIERE SESIÓN. Se comprueba dos veces a propósito:
 *       1. en el middleware (src/middleware.ts), antes de llegar aquí;
 *       2. en esta página, por si el middleware cambiara en el futuro.
 *     Sin sesión se redirige a /admin/login?error=enlace.
 *   - Usa el cliente con sesión de src/lib/supabase-server.ts.
 *   - El formulario es src/components/admin/CrearContrasenaForm.tsx, que
 *     llama a crearContrasena() de src/app/admin/actions.ts.
 *   - No exige ser administrador: cambiar la contraseña propia no da
 *     acceso a nada. El filtro de administradores está al entrar al panel.
 *
 * ESTADO: DESACTIVADA
 *   Mientras RECUPERACION_POR_CORREO (src/lib/admin-rutas.ts) sea false no
 *   hay enlaces de correo que traigan hasta aquí. La página redirige: con
 *   sesión, a /admin/cambiar-contrasena (el cambio desde dentro del panel);
 *   sin sesión, a /admin/login. El formulario se conserva para cuando se
 *   active.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import CrearContrasenaForm from "@/components/admin/CrearContrasenaForm";
import {
  RECUPERACION_POR_CORREO,
  RUTA_CAMBIAR_CONTRASENA,
  RUTA_LOGIN,
} from "@/lib/admin-rutas";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Crear contraseña",
};

export default async function CrearContrasenaPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!RECUPERACION_POR_CORREO) {
    redirect(user ? RUTA_CAMBIAR_CONTRASENA : RUTA_LOGIN);
  }
  if (!user) redirect(`${RUTA_LOGIN}?error=enlace`);

  return (
    <>
      <h1 className="font-serif text-3xl font-semibold text-admin-text">
        Crear contraseña
      </h1>
      <p className="mt-1 text-sm text-admin-muted">
        Elige la contraseña con la que entrarás al panel
        {user.email ? (
          <>
            {" "}
            con la cuenta{" "}
            <span className="font-medium text-admin-text">{user.email}</span>
          </>
        ) : null}
        .
      </p>

      <div className="mt-6">
        <CrearContrasenaForm />
      </div>
    </>
  );
}
