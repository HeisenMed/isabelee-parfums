/**
 * src/app/admin/(panel)/perfumes/page.tsx — Lista de perfumes del panel
 * (ruta "/admin/perfumes").
 *
 * QUÉ ES
 *   La pantalla principal de gestión del catálogo: título, total, botón
 *   "Nuevo perfume" y la lista con buscador y filtros.
 *
 * POR QUÉ EXISTE
 *   Es el punto de partida para todo lo que se hace con un perfume: crear,
 *   editar, ocultar, duplicar o eliminar.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Es un componente de SERVIDOR: comprueba el acceso, carga todos los
 *     perfumes con listarPerfumesAdmin() (src/lib/admin-perfumes.ts) y se
 *     los pasa a ListaPerfumes (src/components/admin/ListaPerfumes.tsx),
 *     que es quien busca y filtra en el navegador.
 *   - Se dibuja dentro de src/app/admin/(panel)/layout.tsx. Aun así llama
 *     a comprobarAccesoAdmin(): una página que muestra datos no debe dar
 *     por hecho que el layout ya la protegió (Next.js puede prepararlos a
 *     la vez). La llamada está memorizada por petición.
 *   - Lee ?aviso= de la URL para mostrar el resultado de una acción que
 *     terminó redirigiendo aquí (eliminar, duplicar con error). Solo se
 *     muestran textos de la lista AVISOS; nunca texto llegado por la URL.
 *   - Lee ?filtro= (por ejemplo ?filtro=sin-foto, que pone la tarjeta
 *     "Fotos y videos" de /admin) y se lo pasa a ListaPerfumes, que lo
 *     valida.
 *   - Si falta la migración n.º 3 lo avisa, sin impedir trabajar.
 */
import type { Metadata } from "next";
import Link from "next/link";
import ListaPerfumes from "@/components/admin/ListaPerfumes";
import {
  avisoError,
  avisoExito,
  avisoInfo,
  botonPrimarioCompacto,
} from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { listarPerfumesAdmin, migracion3Aplicada } from "@/lib/admin-perfumes";
import { RUTA_PERFUME_NUEVO } from "@/lib/admin-rutas";

export const metadata: Metadata = {
  title: "Perfumes",
};

/** Mensajes para cada valor conocido de ?aviso=. */
const AVISOS: Record<string, { texto: string; esError: boolean }> = {
  eliminado: { texto: "Perfume eliminado.", esError: false },
  "eliminado-con-avisos": {
    texto:
      "El perfume se eliminó, pero no se pudieron borrar todos sus archivos de fotos o videos. No afecta a la tienda; avisa a quien mantiene el sitio para limpiarlos.",
    esError: true,
  },
  "error-duplicar": {
    texto: "No se pudo duplicar el perfume. Inténtalo de nuevo.",
    esError: true,
  },
  "no-encontrado": {
    texto: "Ese perfume no existe o ya fue eliminado.",
    esError: true,
  },
};

type PerfumesPageProps = {
  /** En Next.js 15 los parámetros de la URL llegan como una promesa. */
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
};

export default async function PerfumesPage({ searchParams }: PerfumesPageProps) {
  const acceso = await comprobarAccesoAdmin();
  // El layout ya redirige o avisa en los demás casos.
  if (acceso.estado !== "ok") return null;

  // Tres consultas independientes: se lanzan a la vez.
  const [params, lista, migracionLista] = await Promise.all([
    searchParams,
    listarPerfumesAdmin(),
    migracion3Aplicada(),
  ]);

  const aviso =
    typeof params.aviso === "string" ? AVISOS[params.aviso] : undefined;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold text-admin-text">
            Perfumes
          </h1>
          {lista.ok && (
            <p className="mt-1 text-base text-admin-muted">
              {lista.perfumes.length} en total, contando activos e inactivos.
            </p>
          )}
        </div>
        <Link href={RUTA_PERFUME_NUEVO} className={botonPrimarioCompacto}>
          Nuevo perfume
        </Link>
      </div>

      {aviso && (
        <p
          role={aviso.esError ? "alert" : "status"}
          className={`${aviso.esError ? avisoError : avisoExito} mt-5`}
        >
          {aviso.texto}
        </p>
      )}

      {!migracionLista && (
        <p className={`${avisoInfo} mt-5`}>
          <strong className="font-semibold">
            Falta ejecutar la migración n.º 3.
          </strong>{" "}
          Los filtros «Destacados» y «Agotados» estarán vacíos y esos dos
          interruptores no se pueden guardar hasta ejecutar en Supabase el
          archivo{" "}
          <code className="break-all font-mono text-sm">
            supabase/migrations/20261118000000_destacado_agotado.sql
          </code>
          . Todo lo demás funciona.
        </p>
      )}

      <div className="mt-6">
        {lista.ok ? (
          <ListaPerfumes
            perfumes={lista.perfumes}
            filtroInicial={
              typeof params.filtro === "string" ? params.filtro : undefined
            }
          />
        ) : (
          <p role="alert" className={avisoError}>
            {lista.error}
          </p>
        )}
      </div>
    </>
  );
}
