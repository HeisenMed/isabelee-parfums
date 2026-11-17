/**
 * src/app/admin/(panel)/page.tsx — Portada del panel (ruta "/admin").
 *
 * QUÉ ES
 *   Lo primero que ve una administradora al entrar: un saludo y las tres
 *   secciones del panel. "Perfumes" ya funciona y muestra un resumen del
 *   catálogo; las otras dos siguen marcadas como "Próximamente".
 *
 * POR QUÉ EXISTE
 *   Sirve de índice del panel y de vistazo rápido al estado del catálogo:
 *   cuántos perfumes hay, cuántos están a la venta y cuántos tienen
 *   pendiente el precio o la foto. Las cifras se calculan con los datos
 *   reales de la base de datos; si no se pueden cargar, se dice, no se
 *   inventan.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Se dibuja dentro de src/app/admin/(panel)/layout.tsx, que ya impidió
 *     el paso a quien no es administrador.
 *   - Aun así vuelve a llamar a comprobarAccesoAdmin() (src/lib/admin-auth.ts):
 *     Next.js puede preparar layout y página a la vez, así que una página
 *     no debe dar por hecho que el layout ya la protegió. La llamada está
 *     memorizada por petición: no repite la consulta a Supabase.
 *   - Los contadores salen de listarPerfumesAdmin()
 *     (src/lib/admin-perfumes.ts); "sin foto" usa tieneFoto() de
 *     src/lib/admin-formato.ts, el mismo criterio que el filtro de la lista.
 *   - La tarjeta "Perfumes" enlaza a /admin/perfumes. La de "Fotos y
 *     videos" (Fase 3C) cuenta cuántos perfumes usan aún la imagen genérica
 *     y enlaza a la lista con el filtro "Sin foto" ya elegido
 *     (/admin/perfumes?filtro=sin-foto): las fotos se gestionan dentro de
 *     cada perfume. "Respaldo del catálogo" sigue como "Próximamente".
 *   - La tarjeta "Portada" (Fase 5B) lleva al editor de la página de
 *     inicio, /admin/portada.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { tieneFoto } from "@/lib/admin-formato";
import { listarPerfumesAdmin } from "@/lib/admin-perfumes";
import { RUTA_PERFUMES, RUTA_PORTADA } from "@/lib/admin-rutas";

export const metadata: Metadata = {
  title: "Inicio",
};

/** Secciones previstas del panel que aún no tienen página. */
const SECCIONES = [
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

  const lista = await listarPerfumesAdmin();
  // Resumen del catálogo. null si no se pudo cargar: no se muestran ceros
  // que parecerían un dato real.
  const resumen = lista.ok
    ? [
        { etiqueta: "En total", valor: lista.perfumes.length },
        {
          etiqueta: "Activos",
          valor: lista.perfumes.filter((p) => p.activo).length,
        },
        {
          etiqueta: "Sin precio",
          valor: lista.perfumes.filter((p) => p.precio === null).length,
        },
        {
          etiqueta: "Sin foto",
          valor: lista.perfumes.filter((p) => !tieneFoto(p.imagen)).length,
        },
      ]
    : null;
  const sinFoto = lista.ok
    ? lista.perfumes.filter((p) => !tieneFoto(p.imagen)).length
    : null;

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

      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <li>
          {/* Toda la tarjeta es el enlace: un objetivo grande y claro. */}
          <Link
            href={RUTA_PERFUMES}
            className="block h-full rounded-lg border border-admin-border-strong bg-admin-surface p-6 transition-colors duration-200 hover:border-admin-gold-text"
          >
            <h2 className="font-serif text-2xl font-semibold text-admin-text">
              Perfumes
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-admin-muted">
              Crear, editar y ocultar fragancias del catálogo, con sus precios y
              notas.
            </p>
            {resumen ? (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                {resumen.map(({ etiqueta, valor }) => (
                  <div key={etiqueta}>
                    <dt className="text-xs uppercase tracking-[0.08em] text-admin-muted">
                      {etiqueta}
                    </dt>
                    <dd className="font-serif text-3xl font-semibold text-admin-text">
                      {valor}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-admin-error">
                No se pudo cargar el resumen del catálogo.
              </p>
            )}
            <p className="mt-4 text-sm font-medium text-admin-gold-text underline underline-offset-4">
              Administrar perfumes
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`${RUTA_PERFUMES}?filtro=sin-foto`}
            className="block h-full rounded-lg border border-admin-border-strong bg-admin-surface p-6 transition-colors duration-200 hover:border-admin-gold-text"
          >
            <h2 className="font-serif text-2xl font-semibold text-admin-text">
              Fotos y videos
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-admin-muted">
              Se agregan dentro de cada perfume, en la sección «Fotos y video».
            </p>
            {sinFoto === null ? (
              <p className="mt-4 text-sm text-admin-error">
                No se pudo cargar el recuento.
              </p>
            ) : (
              <dl className="mt-4">
                <dt className="text-xs uppercase tracking-[0.08em] text-admin-muted">
                  Usan la imagen genérica
                </dt>
                <dd className="font-serif text-3xl font-semibold text-admin-text">
                  {sinFoto}
                </dd>
              </dl>
            )}
            <p className="mt-4 text-sm font-medium text-admin-gold-text underline underline-offset-4">
              {sinFoto === 0 ? "Ver perfumes" : "Ver perfumes sin foto"}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={RUTA_PORTADA}
            className="block h-full rounded-lg border border-admin-border-strong bg-admin-surface p-6 transition-colors duration-200 hover:border-admin-gold-text"
          >
            <h2 className="font-serif text-2xl font-semibold text-admin-text">
              Portada
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-admin-muted">
              Cambia los videos, imágenes y textos de la página de inicio.
            </p>
            <p className="mt-4 text-sm font-medium text-admin-gold-text underline underline-offset-4">
              Editar la portada
            </p>
          </Link>
        </li>
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
