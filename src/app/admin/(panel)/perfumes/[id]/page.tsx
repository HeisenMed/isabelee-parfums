/**
 * src/app/admin/(panel)/perfumes/[id]/page.tsx — Editar un perfume
 * (ruta "/admin/perfumes/123").
 *
 * QUÉ ES
 *   La pantalla con el formulario relleno de un perfume existente, más las
 *   acciones "Ver en tienda", "Duplicar" y "Eliminar".
 *
 * POR QUÉ EXISTE
 *   Para corregir textos, poner precios, marcar un perfume como destacado
 *   o agotado, ocultarlo o eliminarlo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - [id] es un segmento dinámico: el número de la URL llega en `params`.
 *     Se valida (solo dígitos) antes de consultar nada.
 *   - Componente de servidor: comprueba el acceso y carga a la vez el
 *     perfume (obtenerPerfumeAdmin), las sugerencias y el estado de la
 *     migración n.º 3, todo de src/lib/admin-perfumes.ts. A diferencia de
 *     la tienda, aquí también se cargan perfumes INACTIVOS.
 *   - Dibuja FormularioPerfume y, debajo, AccionesPerfume. Dentro del
 *     formulario, en la sección "Fotos y video", va GestorMedia
 *     (src/components/admin/GestorMedia.tsx), que guarda fotos y video al
 *     instante y por su cuenta. Recibe las fotos ya en orden: principal
 *     (imagen) seguida de la galería (imagenes), sin vacíos ni la genérica.
 *   - Si el perfume no existe, vuelve a la lista con un aviso (en vez de
 *     la página 404 de la tienda, que tiene otro diseño).
 *   - ?aviso=creado|duplicado lo ponen las Server Actions al redirigir
 *     aquí; el formulario lo traduce a un mensaje.
 *   - `key` en el formulario: si se navega de un perfume a otro, React
 *     crea un formulario nuevo en lugar de reutilizar el estado del
 *     anterior.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AccionesPerfume from "@/components/admin/AccionesPerfume";
import FormularioPerfume from "@/components/admin/FormularioPerfume";
import GestorMedia from "@/components/admin/GestorMedia";
import { avisoError, enlace } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import {
  listarSugerencias,
  migracion3Aplicada,
  obtenerPerfumeAdmin,
} from "@/lib/admin-perfumes";
import { RUTA_PERFUMES } from "@/lib/admin-rutas";
import { PLACEHOLDER_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Editar perfume",
};

type EditarPerfumePageProps = {
  // En Next.js 15 los parámetros de ruta y de URL llegan como promesas.
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [clave: string]: string | string[] | undefined }>;
};

/** Convierte el texto de la URL en un id válido, o null. */
function leerId(crudo: string): number | null {
  if (!/^\d{1,9}$/.test(crudo)) return null;
  const id = Number(crudo);
  return id > 0 ? id : null;
}

export default async function EditarPerfumePage({
  params,
  searchParams,
}: EditarPerfumePageProps) {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") return null;

  const id = leerId((await params).id);
  if (!id) redirect(`${RUTA_PERFUMES}?aviso=no-encontrado`);

  const [query, resultado, sugerencias, migracionLista] = await Promise.all([
    searchParams,
    obtenerPerfumeAdmin(id),
    listarSugerencias(),
    migracion3Aplicada(),
  ]);

  if (resultado.ok && !resultado.perfume) {
    redirect(`${RUTA_PERFUMES}?aviso=no-encontrado`);
  }

  const volver = (
    <p className="text-sm">
      <Link href={RUTA_PERFUMES} className={enlace}>
        Volver a perfumes
      </Link>
    </p>
  );

  if (!resultado.ok || !resultado.perfume) {
    return (
      <>
        {volver}
        <p role="alert" className={`${avisoError} mt-5`}>
          {resultado.ok ? "No se encontró el perfume." : resultado.error}
        </p>
      </>
    );
  }

  const perfume = resultado.perfume;
  const aviso = typeof query.aviso === "string" ? query.aviso : undefined;
  // Lista ordenada de fotos: principal + galería, sin repetidos, sin vacíos
  // y sin la imagen genérica (que no es una foto del perfume).
  const fotos = [
    ...new Set([perfume.imagen, ...(perfume.imagenes ?? [])]),
  ].filter((url) => url && url !== PLACEHOLDER_IMAGE);

  return (
    <>
      {volver}
      <h1 className="mt-3 font-serif text-4xl font-semibold text-admin-text">
        {perfume.nombre}
      </h1>
      <p className="mt-1 text-base text-admin-muted">
        {perfume.marca} · {perfume.activo ? "Activo" : "Inactivo"}
      </p>

      <div className="mt-6">
        <FormularioPerfume
          key={perfume.id}
          perfume={perfume}
          sugerencias={sugerencias}
          migracionPendiente={!migracionLista}
          avisoInicial={aviso}
          seccionMedia={
            <GestorMedia
              perfumeId={perfume.id}
              nombre={perfume.nombre}
              fotosIniciales={fotos}
              videoInicial={perfume.video_url}
            />
          }
        />
      </div>

      <AccionesPerfume
        perfume={{
          id: perfume.id,
          nombre: perfume.nombre,
          marca: perfume.marca,
          activo: perfume.activo,
        }}
      />
    </>
  );
}
