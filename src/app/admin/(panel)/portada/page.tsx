/**
 * src/app/admin/(panel)/portada/page.tsx — Editor de la portada
 * (ruta "/admin/portada").
 *
 * QUÉ ES
 *   La pantalla del panel donde se cambian los textos, las palabras de
 *   filtro y los videos o imágenes de dos secciones de la página de
 *   inicio: "Explora por familia olfativa" y "Así llega tu fragancia".
 *
 * POR QUÉ EXISTE
 *   Para que la dueña ajuste la portada (por ejemplo, cambiar la tarjeta
 *   "Cítrica", que solo encuentra un perfume) sin tocar código.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Componente de servidor: comprueba el acceso, lee el contenido con
 *     leerPortadaAdmin() y las familias con familiasConConteo()
 *     (src/lib/admin-portada.ts), y se lo pasa a EditorPortada
 *     (src/components/admin/portada/).
 *   - Si falta la migración n.º 5 (tabla contenido_portada y bucket
 *     site-media), lo dice en lugar de romperse.
 *   - Se dibuja dentro de src/app/admin/(panel)/layout.tsx (barra del panel,
 *     tema claro, protección).
 */
import type { Metadata } from "next";
import EditorPortada from "@/components/admin/portada/EditorPortada";
import { avisoError } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { familiasConConteo, leerPortadaAdmin } from "@/lib/admin-portada";

export const metadata: Metadata = {
  title: "Portada",
};

export default async function PortadaAdminPage() {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") return null;

  const [lectura, familias] = await Promise.all([leerPortadaAdmin(), familiasConConteo()]);

  return (
    <>
      <h1 className="font-serif text-4xl font-semibold text-admin-text">Portada</h1>
      <p className="mt-2 max-w-2xl text-base text-admin-muted">
        Cambia los videos, imágenes y textos de dos secciones de la página de inicio. Cada
        sección se guarda por separado y la tienda se actualiza al momento.
      </p>

      <div className="mt-8">
        {lectura.estado === "migracion-pendiente" ? (
          <div role="alert" className={avisoError}>
            <p className="font-semibold">Falta ejecutar la migración n.º 5.</p>
            <p className="mt-1">
              Ejecuta en Supabase (Dashboard → SQL Editor) el archivo{" "}
              <code className="break-all font-mono text-sm">
                supabase/migrations/20261120000000_contenido_portada.sql
              </code>{" "}
              y recarga esta página. Mientras tanto, la tienda muestra el contenido original.
            </p>
          </div>
        ) : lectura.estado === "error" ? (
          <p role="alert" className={avisoError}>
            {lectura.error}
          </p>
        ) : (
          <EditorPortada contenido={lectura.contenido} familias={familias} />
        )}
      </div>
    </>
  );
}
