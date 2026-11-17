/**
 * src/app/admin/(acceso)/login/page.tsx — Página de inicio de sesión
 * (ruta "/admin/login").
 *
 * QUÉ ES
 *   La pantalla donde una administradora escribe su correo y contraseña.
 *
 * POR QUÉ EXISTE
 *   Es la única entrada al panel. No hay registro: las cuentas se crean por
 *   invitación desde Supabase y el registro público está desactivado.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - El middleware (src/middleware.ts) envía aquí a quien intenta abrir
 *     el panel sin sesión, añadiendo ?next=<ruta que quería ver>. Y si
 *     quien llega YA tiene sesión, lo manda directo a /admin.
 *   - Esta página lee dos parámetros de la URL:
 *       next   a dónde ir tras entrar. Se valida con rutaAdminSegura().
 *       error  motivo por el que se llegó aquí; se traduce a un mensaje.
 *              "enlace"      → lo pone src/app/auth/confirm/route.ts
 *              "sin-acceso"  → lo pone src/app/auth/sin-acceso/route.ts
 *   - El formulario es src/components/admin/LoginForm.tsx (componente de
 *     cliente), que llama a iniciarSesion() de src/app/admin/actions.ts.
 *   - Se dibuja dentro de src/app/admin/(acceso)/layout.tsx.
 */
import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { avisoInfo } from "@/components/admin/estilos";
import { RECUPERACION_POR_CORREO, rutaAdminSegura } from "@/lib/admin-rutas";

export const metadata: Metadata = {
  title: "Ingresar",
};

/**
 * Mensajes para cada valor conocido de ?error=. Un valor desconocido no
 * muestra nada: nunca se imprime en pantalla texto llegado por la URL.
 */
const AVISOS: Record<string, string> = {
  // El texto depende de si la recuperación por correo está activa: no se
  // debe remitir a un enlace que hoy no se muestra.
  enlace: RECUPERACION_POR_CORREO
    ? "El enlace del correo caducó o ya se usó. Pide uno nuevo con «¿Olvidaste tu contraseña?»."
    : "El enlace del correo caducó o ya no es válido. Pide a quien administra el sitio que te asigne una contraseña nueva.",
  "sin-acceso":
    "Esa cuenta no tiene permiso para entrar al panel. Si crees que es un error, avisa a quien administra el sitio.",
};

type LoginPageProps = {
  /** En Next.js 15 los parámetros de la URL llegan como una promesa. */
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  // Un parámetro repetido (?next=a&next=b) llega como lista: se ignora.
  const next = typeof params.next === "string" ? params.next : null;
  const error = typeof params.error === "string" ? params.error : "";
  const aviso = AVISOS[error];

  return (
    <>
      <h1 className="font-serif text-3xl font-semibold text-admin-text">
        Ingresar
      </h1>
      <p className="mt-1 text-sm text-admin-muted">
        Escribe el correo y la contraseña de tu cuenta de administración.
      </p>

      {aviso && (
        <p role="alert" className={`${avisoInfo} mt-5`}>
          {aviso}
        </p>
      )}

      <div className="mt-6">
        <LoginForm next={rutaAdminSegura(next)} />
      </div>
    </>
  );
}
