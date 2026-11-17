/**
 * src/lib/admin-respaldo.ts — Lectura completa de los datos para el respaldo
 * (solo servidor).
 *
 * QUÉ ES
 *   leerDatosRespaldo(): todas las filas de perfumes (activos e inactivos,
 *   todas las columnas), reviews y contenido_portada, leídas con la sesión
 *   de la administradora.
 *
 * POR QUÉ EXISTE
 *   Para las descargas de /admin/respaldo (CSV y JSON). Usa la SESIÓN, no
 *   la clave secreta: RLS (Row Level Security) deja a una administradora
 *   leer también los perfumes inactivos, y a nadie más.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan src/app/admin/(panel)/respaldo/csv/route.ts y json/route.ts,
 *     que comprueban antes el acceso con comprobarAccesoAdmin().
 *   - Formato de los archivos: src/lib/respaldo.ts.
 *
 * DE 1.000 EN 1.000
 *   La API (Application Programming Interface) de Supabase devuelve como
 *   mucho 1.000 filas por consulta. Hoy hay 120 perfumes y 237 reseñas,
 *   pero el respaldo debe seguir completo cuando haya más: se lee por
 *   páginas hasta que una vuelva incompleta.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { Perfume, Review } from "@/types/perfume";

/** Filas por página (el máximo habitual de Supabase). */
const TAMANO_PAGINA = 1000;

/** Lee todas las filas de una tabla, por páginas, ordenadas por `orden`. */
async function leerTodo<T>(
  supabase: SupabaseClient,
  tabla: string,
  orden: string,
): Promise<{ filas: T[]; error: string | null }> {
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAMANO_PAGINA) {
    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .order(orden, { ascending: true })
      .range(desde, desde + TAMANO_PAGINA - 1);
    if (error) return { filas, error: error.message };
    filas.push(...((data ?? []) as T[]));
    if (!data || data.length < TAMANO_PAGINA) return { filas, error: null };
  }
}

export type DatosRespaldo = {
  perfumes: Perfume[];
  reviews: Review[];
  contenido_portada: unknown[];
};

/**
 * Todo lo necesario para reconstruir la tienda. Si falla perfumes o
 * reviews, devuelve el error (un respaldo incompleto sería engañoso). Si
 * falla contenido_portada, la deja vacía: la portada tiene contenido
 * original de respaldo en el código.
 */
export async function leerDatosRespaldo(): Promise<
  { ok: true; datos: DatosRespaldo } | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const [perfumes, reviews, portada] = await Promise.all([
    leerTodo<Perfume>(supabase, "perfumes", "id"),
    leerTodo<Review>(supabase, "reviews", "id"),
    leerTodo<unknown>(supabase, "contenido_portada", "clave"),
  ]);

  const error = perfumes.error ?? reviews.error;
  if (error) {
    console.error("[admin-respaldo]", error);
    return { ok: false, error: "No se pudieron leer los datos del catálogo. Inténtalo de nuevo." };
  }
  if (portada.error) console.error("[admin-respaldo] contenido_portada:", portada.error);

  return {
    ok: true,
    datos: {
      perfumes: perfumes.filas,
      reviews: reviews.filas,
      contenido_portada: portada.error ? [] : portada.filas,
    },
  };
}
