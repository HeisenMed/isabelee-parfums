/**
 * src/app/admin/(acceso)/recuperar/page.tsx — Página "olvidé mi contraseña"
 * (ruta "/admin/recuperar").
 *
 * QUÉ ES
 *   La pantalla donde se pide un correo con el enlace para crear una
 *   contraseña nueva.
 *
 * POR QUÉ EXISTE
 *   Para que una administradora que olvidó su contraseña pueda recuperarla
 *   sola, sin que nadie tenga que entrar al Dashboard de Supabase.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Es una de las dos rutas del panel que el middleware
 *     (src/middleware.ts) deja ver sin sesión.
 *   - El formulario es src/components/admin/RecuperarForm.tsx, que llama a
 *     solicitarRecuperacion() de src/app/admin/actions.ts.
 *   - El correo que envía Supabase enlaza a src/app/auth/confirm/route.ts,
 *     que abre la sesión y lleva a /admin/crear-contrasena.
 *   - Se dibuja dentro de src/app/admin/(acceso)/layout.tsx.
 *
 * ESTADO: DESACTIVADA
 *   Mientras RECUPERACION_POR_CORREO (src/lib/admin-rutas.ts) sea false,
 *   esta página no muestra nada y redirige a /admin/login: no hay servidor
 *   de correo, así que el enlace nunca llegaría. El formulario y su acción
 *   se conservan intactos para cuando se active.
 */
import type { Metadata } from "next";
import Link from "next/link";
import RecuperarForm from "@/components/admin/RecuperarForm";
import { enlace } from "@/components/admin/estilos";
import { redirect } from "next/navigation";
import { RECUPERACION_POR_CORREO, RUTA_LOGIN } from "@/lib/admin-rutas";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function RecuperarPage() {
  if (!RECUPERACION_POR_CORREO) redirect(RUTA_LOGIN);

  return (
    <>
      <h1 className="font-serif text-3xl font-semibold text-admin-text">
        Recuperar contraseña
      </h1>
      <p className="mt-1 text-sm text-admin-muted">
        Escribe tu correo y te enviaremos un enlace para crear una contraseña
        nueva.
      </p>

      <div className="mt-6">
        <RecuperarForm />
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href={RUTA_LOGIN} className={enlace}>
          Volver a ingresar
        </Link>
      </p>
    </>
  );
}
