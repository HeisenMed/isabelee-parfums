/**
 * src/lib/perfumes.ts — Lectura del catálogo para la tienda pública.
 *
 * QUÉ ES
 *   Las funciones que LEEN perfumes y reseñas para la tienda. Es la "capa
 *   de datos" de la tienda: las páginas piden datos con estas funciones y
 *   no saben nada de tablas ni de consultas.
 *
 * POR QUÉ EXISTE
 *   Sustituye a `window.PERFUMES` del sitio v1 y a fetchReviews() de
 *   producto.js. Al concentrar todas las consultas aquí, si mañana cambia
 *   una columna o el proveedor de base de datos, solo se toca este archivo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Usa el cliente PÚBLICO de src/lib/supabase.ts (sin sesión, sin
 *     cookies) y los tipos de src/types/perfume.ts. Al no leer cookies, las
 *     páginas de la tienda pueden guardarse en caché.
 *   - Las tablas las crean las migraciones de supabase/migrations/.
 *   - Lo usan: src/app/(tienda)/catalogo/page.tsx,
 *     src/app/(tienda)/producto/[id]/page.tsx, las secciones Featured y
 *     Categories de la portada y GET /api/buscar (buscador y carrito).
 *   - El filtro `familia` busca "contiene" (ilike), no la familia exacta
 *     (Fase 5A). El texto de búsqueda ?q= NO pasa por aquí: se filtra en
 *     la página, en TypeScript.
 *   - Respeta RLS (Row Level Security: las reglas de Postgres que deciden,
 *     fila por fila, qué puede ver cada quien): solo ve perfumes activos.
 *   - Si una consulta falla (sin conexión, tablas aún no creadas), registra
 *     el error en la consola del servidor y devuelve una lista vacía o
 *     null, para que la página muestre un estado vacío en vez de romperse.
 *
 * LO QUE YA NO ESTÁ AQUÍ
 *   Hasta la Fase 3B este archivo tenía también funciones de escritura
 *   (createPerfume, updatePerfume, deletePerfume, uploadImage, uploadVideo)
 *   que usaban la clave secreta y se saltaban RLS. Nadie las llegó a usar
 *   y se eliminaron. Las escrituras del panel viven en
 *   src/lib/admin-perfumes.ts y usan la SESIÓN de la administradora, de
 *   modo que la base de datos comprueba en cada operación que es admin.
 *
 * COLUMNAS DE LA MIGRACIÓN N.º 3 (destacado, agotado)
 *   getPerfumes() las usa para filtrar los destacados y para dejar los
 *   agotados al final. Si la migración aún no está aplicada, la base de
 *   datos responde "la columna no existe"; en ese caso la consulta se
 *   repite SIN esas columnas y la tienda sigue funcionando como antes.
 */
import {
  GENEROS,
  type Genero,
  type OrdenCatalogo,
  type Perfume,
  type Review,
} from "@/types/perfume";
import { getSupabaseClient } from "./supabase";

/* ── Opciones de consulta ───────────────────────────────────────────── */

/** Filtros opcionales de getPerfumes(). Sin filtros devuelve todo el catálogo. */
export interface PerfumeFilters {
  /** Una o varias categorías. Vacío = todas. */
  generos?: Genero[];
  /** Marca exacta. */
  marca?: string;
  /**
   * Palabra o fragmento de la familia olfativa: "Cítric" encuentra
   * "Cítrico Acuático", "Cítrico Aromático"... (ver consultaPerfumes).
   */
  familia?: string;
  /** Precio mínimo en COP. */
  precioMin?: number;
  /** Precio máximo en COP. */
  precioMax?: number;
  /** Solo perfumes con este badge exacto ("Más Vendido"...). */
  badge?: string;
  /** true = solo los marcados "Mostrar en la portada" (migración n.º 3). */
  destacado?: boolean;
  /** Criterio de orden. Por defecto, "destacados". */
  orden?: OrdenCatalogo;
  /** Máximo de resultados. */
  limit?: number;
}

/**
 * Códigos con los que Supabase avisa de que una columna no existe:
 *   42703    — el código de Postgres para "undefined column".
 *   PGRST204 — lo devuelve PostgREST (la capa que convierte la base de
 *              datos en una API — Application Programming Interface — web)
 *              cuando la columna no está en su copia del esquema.
 */
const CODIGOS_COLUMNA_INEXISTENTE = ["42703", "PGRST204"];

/**
 * Hasta cuándo (en milisegundos de reloj) se da por hecho que las columnas
 * `destacado` y `agotado` NO existen. Evita repetir en cada visita una
 * consulta que ya se sabe que falla; pasado un minuto se vuelve a probar,
 * así la tienda empieza a usarlas sola poco después de aplicar la
 * migración n.º 3, sin reiniciar el servidor.
 */
let sinColumnasNuevasHasta = 0;
const REINTENTO_COLUMNAS_MS = 60_000;

/** Deja constancia de un fallo de lectura sin romper la página. */
function logError(context: string, message: string): void {
  console.error(`[perfumes] ${context}: ${message}`);
}

/* ── Lectura pública ────────────────────────────────────────────────── */

/**
 * Arma la consulta de perfumes activos con sus filtros y su orden.
 * `conColumnasNuevas` indica si se pueden usar `destacado` y `agotado`
 * (migración n.º 3); con false se construye la consulta de siempre.
 */
function consultaPerfumes(filters: PerfumeFilters, conColumnasNuevas: boolean) {
  const { generos, marca, familia, precioMin, precioMax, badge, limit } = filters;
  const orden = filters.orden ?? "destacados";

  // RLS ya oculta los inactivos a los visitantes; el filtro explícito hace
  // que el catálogo tampoco los muestre a un administrador con sesión.
  let query = getSupabaseClient().from("perfumes").select("*").eq("activo", true);

  if (generos && generos.length > 0) query = query.in("genero", generos);
  if (marca) query = query.eq("marca", marca);
  // Familia: "contiene", sin distinguir mayúsculas (ilike = like que no
  // distingue mayúsculas; % = cualquier texto). Así una tarjeta de la
  // portada con "Frutal" incluye "Floral Frutal", "Chipre Frutal", etc.
  // Sí distingue tildes: "Citric" no encuentra "Cítrico".
  // Quien llama debe pasar un valor ya validado (solo letras, espacios y
  // signos sencillos: ver parseFamilia en la página del catálogo), para
  // que ningún %, _ o * del visitante actúe como comodín.
  if (familia) query = query.ilike("familia_olfativa", `%${familia}%`);
  if (badge) query = query.eq("badge", badge);
  if (conColumnasNuevas && filters.destacado) query = query.eq("destacado", true);

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

  // Antes que cualquier otro criterio: los agotados van al final, sea cual
  // sea el orden elegido (en Postgres, false se ordena antes que true).
  if (conColumnasNuevas) query = query.order("agotado", { ascending: true });

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
  return query;
}

/**
 * Devuelve los perfumes activos que cumplen los filtros.
 * Todo el filtrado y el orden lo hace la base de datos, no el navegador.
 */
export async function getPerfumes(
  filters: PerfumeFilters = {},
): Promise<Perfume[]> {
  const conColumnasNuevas = Date.now() >= sinColumnasNuevasHasta;

  // Sin la columna `destacado` no hay forma de saber cuáles lo son: se
  // responde "ninguno" y quien llama (Featured) aplica su plan B.
  if (!conColumnasNuevas && filters.destacado) return [];

  let { data, error } = await consultaPerfumes(filters, conColumnasNuevas);

  if (
    error &&
    conColumnasNuevas &&
    CODIGOS_COLUMNA_INEXISTENTE.includes(error.code)
  ) {
    // Falta la migración n.º 3. Se anota para no reintentar durante un
    // minuto y se repite la consulta al modo antiguo.
    sinColumnasNuevasHasta = Date.now() + REINTENTO_COLUMNAS_MS;
    logError(
      "getPerfumes",
      "faltan las columnas destacado/agotado (migración n.º 3 sin aplicar); se usa el orden anterior",
    );
    if (filters.destacado) return [];
    ({ data, error } = await consultaPerfumes(filters, false));
  }

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
