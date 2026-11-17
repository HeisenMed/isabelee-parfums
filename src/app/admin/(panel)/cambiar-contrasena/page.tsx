/**
 * src/app/admin/(panel)/cambiar-contrasena/page.tsx — Cambiar la contraseña
 * desde el panel (ruta "/admin/cambiar-contrasena").
 *
 * QUÉ ES
 *   La pantalla donde una administradora, ya dentro del panel, sustituye
 *   su contraseña por otra.
 *
 * POR QUÉ EXISTE
 *   El proyecto no tiene todavía un servidor de correo propio —SMTP (Simple
 *   Mail Transfer Protocol, el protocolo con el que se envían correos)—,
 *   así que no funcionan los enlaces de "olvidé mi contraseña". Las cuentas
 *   se crean en el Dashboard de Supabase con una contraseña inicial, y esta
 *   pantalla permite cambiarla por una que solo conozca su dueña.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Está dentro del grupo (panel): la protege el layout
 *     src/app/admin/(panel)/layout.tsx (sesión + administrador) y hereda su
 *     barra superior, que enlaza aquí con "Cambiar contraseña".
 *   - El formulario es src/components/admin/CambiarContrasenaForm.tsx, que
 *     llama a cambiarContrasena() de src/app/admin/actions.ts.
 *   - /admin/crear-contrasena (la pantalla equivalente para enlaces de
 *     correo) redirige aquí mientras RECUPERACION_POR_CORREO sea false.
 *   - Si se olvida la contraseña y no se puede entrar, hoy la única vía es
 *     que alguien con acceso al Dashboard de Supabase asigne una nueva
 *     (Authentication → Users).
 */
import type { Metadata } from "next";
import CambiarContrasenaForm from "@/components/admin/CambiarContrasenaForm";
import { tarjeta } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Cambiar contraseña",
};

export default async function CambiarContrasenaPage() {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") return null;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-4xl font-semibold text-admin-text">
        Cambiar contraseña
      </h1>
      <p className="mt-2 text-base text-admin-muted">
        Cuenta{" "}
        <span className="break-all font-medium text-admin-text">
          {acceso.user.email}
        </span>
        . La sesión actual sigue abierta después del cambio.
      </p>

      <div className={`${tarjeta} mt-6`}>
        <CambiarContrasenaForm />
      </div>
    </div>
  );
}
