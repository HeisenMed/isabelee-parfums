/**
 * src/app/admin/(acceso)/layout.tsx — Marco de las pantallas de acceso.
 *
 * QUÉ ES
 *   La tarjeta blanca centrada que comparten las tres pantallas previas al
 *   panel: /admin/login, /admin/recuperar y /admin/crear-contrasena.
 *
 * POR QUÉ EXISTE
 *   Las tres son un formulario corto bajo el nombre de la marca. Con este
 *   layout cada página solo escribe su título y su formulario. El nombre
 *   de la carpeta va entre paréntesis —(acceso)— porque es un grupo de
 *   rutas: organiza archivos sin añadir nada a la URL.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Se dibuja dentro de src/app/admin/layout.tsx (tema claro, robots).
 *   - No comprueba la sesión: el middleware (src/middleware.ts) deja pasar
 *     sin sesión a login y recuperar, y la página de crear contraseña hace
 *     su propia comprobación.
 *   - El nombre de la marca sale de src/lib/site.ts (SITE_SHORT_NAME).
 */
import Link from "next/link";
import { enlace } from "@/components/admin/estilos";
import { SITE_SHORT_NAME } from "@/lib/site";

export default function AccesoLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
      <div className="text-center">
        <p className="font-serif text-4xl font-semibold text-admin-text">
          {SITE_SHORT_NAME}
        </p>
        <p className="mt-1 text-sm text-admin-muted">Panel de administración</p>
      </div>

      <div className="mt-8 rounded-lg border border-admin-border bg-admin-surface p-6 sm:p-8">
        {children}
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/" className={enlace}>
          Volver a la tienda
        </Link>
      </p>
    </main>
  );
}
