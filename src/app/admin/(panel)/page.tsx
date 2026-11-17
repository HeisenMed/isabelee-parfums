/**
 * src/app/admin/(panel)/page.tsx — Portada del panel (ruta "/admin").
 *
 * QUÉ ES
 *   Lo primero que ve una administradora al entrar: un saludo y las tres
 *   secciones que tendrá el panel, todavía marcadas como "Próximamente".
 *
 * POR QUÉ EXISTE
 *   En la Fase 3A solo se construye el acceso (entrar, salir, contraseñas).
 *   Esta portada confirma que el acceso funciona y anuncia lo que llegará
 *   en la Fase 3B. No muestra cifras ni datos: no hay nada real que
 *   enseñar todavía y no se inventa.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Se dibuja dentro de src/app/admin/(panel)/layout.tsx, que ya impidió
 *     el paso a quien no es administrador.
 *   - Aun así vuelve a llamar a comprobarAccesoAdmin() (src/lib/admin-auth.ts):
 *     Next.js puede preparar layout y página a la vez, así que una página
 *     no debe dar por hecho que el layout ya la protegió. La llamada está
 *     memorizada por petición: no repite la consulta a Supabase.
 *   - Cuando existan las secciones, cada tarjeta pasará a ser un enlace a
 *     su página dentro de (panel)/.
 */
import type { Metadata } from "next";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Inicio",
};

/** Secciones previstas del panel (Fase 3B). Aún no tienen página. */
const SECCIONES = [
  {
    titulo: "Perfumes",
    descripcion:
      "Crear, editar y ocultar fragancias del catálogo, con sus precios y notas.",
  },
  {
    titulo: "Fotos y videos",
    descripcion: "Subir y cambiar las imágenes y los videos de cada perfume.",
  },
  {
    titulo: "Respaldo del catálogo",
    descripcion: "Descargar una copia de seguridad de todos los perfumes.",
  },
];

export default async function PanelPage() {
  const acceso = await comprobarAccesoAdmin();
  // El layout ya redirige o muestra un aviso en los demás casos; aquí
  // basta con no dibujar nada.
  if (acceso.estado !== "ok") return null;

  return (
    <>
      <h1 className="font-serif text-4xl font-semibold text-admin-text">
        Hola
      </h1>
      <p className="mt-2 text-base text-admin-muted">
        Entraste como{" "}
        <span className="break-all font-medium text-admin-text">
          {acceso.user.email}
        </span>
        . Desde aquí podrás administrar la tienda.
      </p>

      <ul className="mt-8 grid gap-5 sm:grid-cols-3">
        {SECCIONES.map((seccion) => (
          <li
            key={seccion.titulo}
            className="rounded-lg border border-admin-border bg-admin-surface p-6"
          >
            <p className="inline-block rounded border border-admin-border bg-admin-bg px-2 py-0.5 text-xs font-medium uppercase tracking-[0.12em] text-admin-muted">
              Próximamente
            </p>
            <h2 className="mt-4 font-serif text-2xl font-semibold text-admin-text">
              {seccion.titulo}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-admin-muted">
              {seccion.descripcion}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
