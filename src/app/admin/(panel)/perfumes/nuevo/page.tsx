/**
 * src/app/admin/(panel)/perfumes/nuevo/page.tsx — Crear un perfume
 * (ruta "/admin/perfumes/nuevo").
 *
 * QUÉ ES
 *   La pantalla con el formulario vacío para dar de alta un perfume.
 *
 * POR QUÉ EXISTE
 *   Para que el catálogo crezca desde el panel, sin editar archivos ni
 *   entrar al Dashboard de Supabase.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Componente de servidor: comprueba el acceso y carga las sugerencias
 *     (marcas, familias, concentraciones y volúmenes ya usados) con
 *     listarSugerencias() de src/lib/admin-perfumes.ts.
 *   - Dibuja FormularioPerfume (src/components/admin/) con `perfume={null}`.
 *   - Al guardar, la Server Action guardarPerfume() crea la fila y redirige
 *     a /admin/perfumes/<id nuevo>, el formulario de edición.
 *   - No se pueden subir fotos todavía: cada archivo se guarda en la
 *     carpeta "<id>/" del perfume en Storage, y el id no existe hasta
 *     crearlo. El formulario lo explica en la sección "Fotos y video".
 *   - "nuevo" es una carpeta fija y tiene prioridad sobre la ruta dinámica
 *     hermana [id]: /admin/perfumes/nuevo nunca se interpreta como un id.
 */
import type { Metadata } from "next";
import Link from "next/link";
import FormularioPerfume from "@/components/admin/FormularioPerfume";
import { enlace } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { listarSugerencias, migracion3Aplicada } from "@/lib/admin-perfumes";
import { RUTA_PERFUMES } from "@/lib/admin-rutas";

export const metadata: Metadata = {
  title: "Nuevo perfume",
};

export default async function NuevoPerfumePage() {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") return null;

  const [sugerencias, migracionLista] = await Promise.all([
    listarSugerencias(),
    migracion3Aplicada(),
  ]);

  return (
    <>
      <p className="text-sm">
        <Link href={RUTA_PERFUMES} className={enlace}>
          Volver a perfumes
        </Link>
      </p>
      <h1 className="mt-3 font-serif text-4xl font-semibold text-admin-text">
        Nuevo perfume
      </h1>
      <p className="mt-1 text-base text-admin-muted">
        Los campos con asterisco son obligatorios. Las fotos y el video se
        agregan después de crear el perfume; mientras tanto la tienda muestra
        una imagen genérica.
      </p>

      <div className="mt-6">
        <FormularioPerfume
          perfume={null}
          sugerencias={sugerencias}
          migracionPendiente={!migracionLista}
        />
      </div>
    </>
  );
}
