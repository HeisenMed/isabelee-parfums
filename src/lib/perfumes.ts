/**
 * src/lib/perfumes.ts — Acceso a los datos del catálogo.
 *
 * QUÉ ES
 *   Las funciones que leen y escriben perfumes y reseñas en Supabase. Es la
 *   "capa de datos" de la app: las páginas piden datos con estas funciones
 *   y no saben nada de tablas ni de consultas.
 *
 * POR QUÉ EXISTE
 *   Sustituye a `window.PERFUMES` del sitio v1 y a fetchReviews() de
 *   producto.js. Al concentrar todas las consultas aquí, si mañana cambia
 *   una columna o el proveedor de base de datos, solo se toca este archivo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Usa los clientes de src/lib/supabase.ts y los tipos de
 *     src/types/perfume.ts.
 *   - Las tablas las crean las migraciones de supabase/migrations/.
 *   - Lo usan: src/app/(tienda)/catalogo/page.tsx, src/app/(tienda)/producto/[id]/page.tsx y
 *     las secciones Featured y Categories de la portada.
 *
 * DOS GRUPOS DE FUNCIONES
 *   1. PÚBLICAS (lectura). Usan el cliente público y respetan RLS: solo
 *      ven perfumes activos. Si la consulta falla (sin conexión, tablas
 *      aún no creadas), registran el error en la consola del servidor y
 *      devuelven una lista vacía o null, para que la página muestre un
 *      estado vacío en lugar de romperse.
 *   2. ADMINISTRACIÓN (escritura). Usan la clave secreta y se saltan RLS.
 *      Solo funcionan en el servidor y, al contrario que las públicas,
 *      LANZAN el error: quien administra necesita saber que algo falló.
 *      Están listas para el panel de la Fase 3. ⚠️ Todavía no hay ninguna
 *      ruta de API que las exponga, a propósito: no deben publicarse sin
 *      comprobar antes que quien llama es un administrador con sesión.
 */
import {
  GENEROS,
  type Genero,
  type OrdenCatalogo,
  type Perfume,
  type PerfumeInput,
  type Review,
} from "@/types/perfume";
import { getSupabaseAdmin, getSupabaseClient } from "./supabase";

/* ── Opciones de consulta ───────────────────────────────────────────── */

/** Filtros opcionales de getPerfumes(). Sin filtros devuelve todo el catálogo. */
export interface PerfumeFilters {
  /** Una o varias categorías. Vacío = todas. */
  generos?: Genero[];
  /** Marca exacta. */
  marca?: string;
  /** Familia olfativa exacta. */
  familia?: string;
  /** Precio mínimo en COP. */
  precioMin?: number;
  /** Precio máximo en COP. */
  precioMax?: number;
  /** Solo perfumes con este badge exacto ("Más Vendido"...). */
  badge?: string;
  /** Criterio de orden. Por defecto, "destacados". */
  orden?: OrdenCatalogo;
  /** Máximo de resultados. */
  limit?: number;
}

/** Nombres de los buckets de Storage (los crea el script de migración). */
const IMAGES_BUCKET = "product-images";
const VIDEOS_BUCKET = "product-videos";

/** Deja constancia de un fallo de lectura sin romper la página. */
function logError(context: string, message: string): void {
  console.error(`[perfumes] ${context}: ${message}`);
}

/* ── Lectura pública ────────────────────────────────────────────────── */

/**
 * Devuelve los perfumes activos que cumplen los filtros.
 * Todo el filtrado y el orden lo hace la base de datos, no el navegador.
 */
export async function getPerfumes(
  filters: PerfumeFilters = {},
): Promise<Perfume[]> {
  const { generos, marca, familia, precioMin, precioMax, badge, limit } = filters;
  const orden = filters.orden ?? "destacados";

  // RLS ya oculta los inactivos a los visitantes; el filtro explícito hace
  // que el catálogo tampoco los muestre a un administrador con sesión.
  let query = getSupabaseClient().from("perfumes").select("*").eq("activo", true);

  if (generos && generos.length > 0) query = query.in("genero", generos);
  if (marca) query = query.eq("marca", marca);
  if (familia) query = query.eq("familia_olfativa", familia);
  if (badge) query = query.eq("badge", badge);

  // Rango de precio. Los perfumes SIN precio se muestran siempre (igual que
  // en el sitio v1): mientras no haya precios publicados, filtrar por
  // precio no debe vaciar el catálogo.
  if (precioMin !== undefined || precioMax !== undefined) {
    const conditions: string[] = [];
    if (precioMin !== undefined) conditions.push(`precio.gte.${precioMin}`);
    if (precioMax !== undefined) conditions.push(`precio.lte.${precioMax}`);
    const inRange =
      conditions.length > 1 ? `and(${conditions.join(",")})` : conditions[0];
    query = query.or(`precio.is.null,${inRange}`);
  }

  // Orden principal. nullsFirst:false deja al final lo que no tiene valor.
  switch (orden) {
    case "precio-asc":
      query = query.order("precio", { ascending: true, nullsFirst: false });
      break;
    case "precio-desc":
      query = query.order("precio", { ascending: false, nullsFirst: false });
      break;
    case "nombre":
      query = query.order("nombre", { ascending: true });
      break;
    case "marca":
      // Dentro de cada marca, por nombre (CLAUDE.md §7).
      query = query
        .order("marca", { ascending: true })
        .order("nombre", { ascending: true });
      break;
    default:
      // "Destacados": primero los que llevan badge.
      query = query.order("badge", { ascending: true, nullsFirst: false });
  }
  // Desempate estable: el orden original del catálogo.
  query = query.order("id", { ascending: true });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    logError("getPerfumes", error.message);
    return [];
  }
  return (data ?? []) as Perfume[];
}

/** Devuelve un perfume activo por su id, o null si no existe. */
export async function getPerfumeById(id: number): Promise<Perfume | null> {
  const { data, error } = await getSupabaseClient()
    .from("perfumes")
    .select("*")
    .eq("id", id)
    .eq("activo", true)
    .maybeSingle(); // null si no hay fila, en vez de error

  if (error) {
    logError(`getPerfumeById(${id})`, error.message);
    return null;
  }
  return data as Perfume | null;
}

/** Atajo: todos los perfumes de una categoría. */
export async function getPerfumesByGenero(genero: Genero): Promise<Perfume[]> {
  return getPerfumes({ generos: [genero] });
}

/** Reseñas de un perfume, en el orden en que se cargaron. */
export async function getReviewsByPerfumeId(
  perfumeId: number,
): Promise<Review[]> {
  const { data, error } = await getSupabaseClient()
    .from("reviews")
    .select("*")
    .eq("perfume_id", perfumeId)
    .order("id", { ascending: true });

  if (error) {
    logError(`getReviewsByPerfumeId(${perfumeId})`, error.message);
    return [];
  }
  return (data ?? []) as Review[];
}

/**
 * Valores distintos de una columna de texto entre los perfumes activos,
 * ordenados alfabéticamente en español (para los desplegables de filtro).
 */
async function getDistinct(
  column: "marca" | "familia_olfativa",
): Promise<string[]> {
  const { data, error } = await getSupabaseClient()
    .from("perfumes")
    .select(column)
    .eq("activo", true);

  if (error) {
    logError(`getDistinct(${column})`, error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as Record<string, string | null>[];
  const values = new Set<string>();
  for (const row of rows) {
    const value = row[column];
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b, "es"));
}

/** Marcas disponibles, para el filtro de marca. */
export async function getMarcas(): Promise<string[]> {
  return getDistinct("marca");
}

/** Familias olfativas disponibles, para el filtro de familia. */
export async function getFamilias(): Promise<string[]> {
  return getDistinct("familia_olfativa");
}

/**
 * ¿Hay al menos un perfume con precio publicado?
 * El catálogo lo usa para decidir si muestra el filtro de precio.
 */
export async function hayPreciosPublicados(): Promise<boolean> {
  const { count, error } = await getSupabaseClient()
    .from("perfumes")
    .select("id", { count: "exact", head: true })
    .eq("activo", true)
    .not("precio", "is", null);

  if (error) {
    logError("hayPreciosPublicados", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

/**
 * Una imagen representativa por categoría (la primera foto REAL, no el
 * placeholder), para las tarjetas de categorías de la portada.
 */
export async function getImagenesPorGenero(
  placeholder: string,
): Promise<Record<Genero, string | null>> {
  const entries = await Promise.all(
    GENEROS.map(async (genero) => {
      const perfumes = await getPerfumes({ generos: [genero], limit: 20 });
      const conFoto = perfumes.find((p) => p.imagen && p.imagen !== placeholder);
      return [genero, conFoto?.imagen ?? null] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<Genero, string | null>;
}

/* ── Administración (solo servidor, Fase 3) ─────────────────────────── */

/** Crea un perfume y lo devuelve con su id nuevo. */
export async function createPerfume(data: PerfumeInput): Promise<Perfume> {
  const { data: created, error } = await getSupabaseAdmin()
    .from("perfumes")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`No se pudo crear el perfume: ${error.message}`);
  return created as Perfume;
}

/** Actualiza solo los campos indicados de un perfume. */
export async function updatePerfume(
  id: number,
  data: Partial<PerfumeInput>,
): Promise<Perfume> {
  const { data: updated, error } = await getSupabaseAdmin()
    .from("perfumes")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`No se pudo actualizar el perfume ${id}: ${error.message}`);
  }
  return updated as Perfume;
}

/**
 * Borra un perfume de forma definitiva (y, en cascada, sus reseñas).
 * Para ocultarlo sin perderlo, usa updatePerfume(id, { activo: false }).
 */
export async function deletePerfume(id: number): Promise<void> {
  const { error } = await getSupabaseAdmin().from("perfumes").delete().eq("id", id);
  if (error) {
    throw new Error(`No se pudo borrar el perfume ${id}: ${error.message}`);
  }
}

/**
 * Sube un archivo a un bucket público y devuelve su URL.
 * Se guarda como "<id del perfume>/<marca de tiempo>-<nombre limpio>", así
 * los archivos de cada perfume quedan agrupados y nunca se pisan entre sí.
 */
async function uploadMedia(
  bucket: string,
  file: File,
  perfumeId: number,
): Promise<string> {
  const safeName = file.name
    .toLowerCase()
    .normalize("NFD") // separa las tildes de las letras...
    .replace(/[̀-ͯ]/g, "") // ...y las elimina
    .replace(/[^a-z0-9.]+/g, "-") // espacios y símbolos → guion
    .replace(/^-+|-+$/g, "");
  const filePath = `${perfumeId}/${Date.now()}-${safeName || "archivo"}`;

  const storage = getSupabaseAdmin().storage.from(bucket);
  const { error } = await storage.upload(filePath, file, {
    contentType: file.type || undefined,
    upsert: false, // nunca sobrescribir un archivo existente
  });

  if (error) {
    throw new Error(`No se pudo subir "${file.name}" a ${bucket}: ${error.message}`);
  }
  return storage.getPublicUrl(filePath).data.publicUrl;
}

/** Sube una foto de producto y devuelve su URL pública. */
export async function uploadImage(file: File, perfumeId: number): Promise<string> {
  return uploadMedia(IMAGES_BUCKET, file, perfumeId);
}

/** Sube un video de producto y devuelve su URL pública. */
export async function uploadVideo(file: File, perfumeId: number): Promise<string> {
  return uploadMedia(VIDEOS_BUCKET, file, perfumeId);
}
