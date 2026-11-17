/**
 * src/app/admin/(panel)/layout.tsx — Marco protegido del panel.
 *
 * QUÉ ES
 *   El layout de todo lo que solo puede ver una administradora: comprueba
 *   el acceso y, si es correcto, dibuja la barra superior ("Isabeleé ·
 *   Panel", los enlaces "Perfumes", "Precios", "Portada", "Respaldo" y "Cambiar contraseña", el correo, "Ver
 *   tienda" y "Cerrar sesión") y el contenido.
 *
 * POR QUÉ EXISTE
 *   Es la segunda barrera de acceso. El middleware (src/middleware.ts) ya
 *   garantizó que hay ALGUIEN con sesión; aquí se comprueba que ese alguien
 *   sea administrador, preguntándoselo a la base de datos. Al estar en un
 *   layout, la comprobación cubre cualquier página que se añada después
 *   dentro de (panel)/.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - comprobarAccesoAdmin() (src/lib/admin-auth.ts) devuelve uno de cinco
 *     estados, y este archivo decide qué hacer con cada uno:
 *       ok                   → se muestra el panel
 *       sin-sesion           → /admin/login
 *       sin-acceso           → /auth/sin-acceso, que cierra la sesión y
 *                              lleva a /admin/login?error=sin-acceso. Un
 *                              layout no puede borrar cookies; esa ruta sí.
 *       migracion-pendiente  → pantalla de aviso (falta la migración n.º 2)
 *       error                → pantalla de aviso (no se pudo comprobar)
 *     En los dos últimos NO se muestra el panel: ante la duda, se cierra.
 *   - AVISO PARA LA FASE 3B: un layout protege lo que se VE. Las páginas y
 *     las Server Actions que lean o escriban datos deben llamar ellas
 *     mismas a comprobarAccesoAdmin() (está memorizada por petición, no
 *     cuesta una consulta extra). Por debajo, RLS (Row Level Security, las
 *     reglas de acceso por fila de Postgres) lo impone igualmente.
 *   - La barra superior no usa un menú desplegable en el móvil: sus
 *     elementos simplemente saltan a una segunda línea (flex-wrap). Son
 *     pocos y así no hay nada escondido para una persona no técnica.
 *   - Se dibuja dentro de src/app/admin/layout.tsx (tema claro, robots).
 *   - Estilos: tokens `admin-*` y recetas de src/components/admin/estilos.ts.
 */
import { redirect } from "next/navigation";
import BotonCerrarSesion from "@/components/admin/BotonCerrarSesion";
import { avisoError, enlace } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import Link from "next/link";
import {
  RUTA_CAMBIAR_CONTRASENA,
  RUTA_LOGIN,
  RUTA_PANEL,
  RUTA_PERFUMES,
  RUTA_PORTADA,
  RUTA_PRECIOS,
  RUTA_RESPALDO,
  RUTA_SIN_ACCESO,
} from "@/lib/admin-rutas";
import { SITE_SHORT_NAME } from "@/lib/site";

/**
 * Pantalla que sustituye al panel cuando no se pudo confirmar el acceso.
 * Incluye "Cerrar sesión" para que la persona no quede atrapada.
 */
function PantallaAviso({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-12">
      <div className="rounded-lg border border-admin-border bg-admin-surface p-6 sm:p-8">
        <h1 className="font-serif text-3xl font-semibold text-admin-text">
          {titulo}
        </h1>
        <div
          role="alert"
          className={`${avisoError} mt-5 space-y-2 text-base`}
        >
          {children}
        </div>
        <div className="mt-6">
          <BotonCerrarSesion />
        </div>
      </div>
    </main>
  );
}

export default async function PanelLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const acceso = await comprobarAccesoAdmin();

  if (acceso.estado === "sin-sesion") redirect(RUTA_LOGIN);
  if (acceso.estado === "sin-acceso") redirect(RUTA_SIN_ACCESO);

  if (acceso.estado === "migracion-pendiente") {
    return (
      <PantallaAviso titulo="Falta un paso de configuración">
        <p>
          Iniciaste sesión correctamente, pero el panel todavía no puede
          comprobar quién es administrador: falta aplicar la migración n.º 2
          en la base de datos.
        </p>
        <p>
          Quien mantiene el sitio debe ejecutar en Supabase (Dashboard → SQL
          Editor) el archivo{" "}
          <code className="break-all font-mono text-sm">
            supabase/migrations/20261117000000_admin_access.sql
          </code>{" "}
          y después recargar esta página.
        </p>
      </PantallaAviso>
    );
  }

  if (acceso.estado === "error") {
    return (
      <PantallaAviso titulo="No se pudo abrir el panel">
        <p>
          No fue posible comprobar tus permisos en este momento. Suele ser un
          problema pasajero de conexión: espera un momento y recarga la
          página.
        </p>
      </PantallaAviso>
    );
  }

  return (
    <>
      <header className="border-b border-admin-border bg-admin-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link
              href={RUTA_PANEL}
              className="font-serif text-2xl font-semibold text-admin-text"
            >
              {SITE_SHORT_NAME} · Panel
            </Link>
            {/* Navegación del panel. min-h-11 = 44 px, cómodo para el dedo. */}
            <nav aria-label="Secciones del panel" className="flex flex-wrap gap-x-5">
              <Link
                href={RUTA_PERFUMES}
                className={`${enlace} inline-flex min-h-11 items-center text-sm`}
              >
                Perfumes
              </Link>
              <Link
                href={RUTA_PRECIOS}
                className={`${enlace} inline-flex min-h-11 items-center text-sm`}
              >
                Precios
              </Link>
              <Link
                href={RUTA_PORTADA}
                className={`${enlace} inline-flex min-h-11 items-center text-sm`}
              >
                Portada
              </Link>
              <Link
                href={RUTA_RESPALDO}
                className={`${enlace} inline-flex min-h-11 items-center text-sm`}
              >
                Respaldo
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="break-all text-admin-muted">
              {acceso.user.email}
            </span>
            <Link
              href={RUTA_CAMBIAR_CONTRASENA}
              className={`${enlace} inline-flex min-h-11 items-center`}
            >
              Cambiar contraseña
            </Link>
            {/* target="_blank" abre la tienda en otra pestaña, para no
                perder lo que se esté haciendo en el panel. rel="noopener"
                impide que la pestaña nueva controle esta. */}
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className={`${enlace} inline-flex min-h-11 items-center`}
            >
              Ver tienda
            </a>
            <BotonCerrarSesion />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">{children}</main>
    </>
  );
}
