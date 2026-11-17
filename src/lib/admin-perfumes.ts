/**
 * src/lib/admin-perfumes.ts — Datos de perfumes para el panel (solo servidor).
 *
 * QUÉ ES
 *   La capa de datos del panel de administración: listar TODOS los
 *   perfumes (activos e inactivos), leer uno, crear, editar, activar o
 *   desactivar, duplicar y eliminar. Es el equivalente, para el panel, de
 *   lo que src/lib/perfumes.ts es para la tienda.
 *
 * POR QUÉ EXISTE
 *   Para que todas las escrituras pasen por la base de datos CON LA SESIÓN
 *   de quien las hace. Estas funciones usan createSupabaseServerClient()
 *   (src/lib/supabase-server.ts): la clave pública más el token de la
 *   administradora. Así cada operación atraviesa RLS (Row Level Security,
 *   las reglas de acceso por fila de Postgres) y la función is_admin() de
 *   la migración n.º 2. Si quien llama no es administrador, la base de
 *   datos no devuelve ni modifica nada, aunque el código del sitio tuviera
 *   un fallo. Las funciones antiguas de src/lib/perfumes.ts usaban la clave
 *   secreta, que se salta esa comprobación; por eso se eliminaron.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan las páginas de src/app/admin/(panel)/perfumes/ (lectura) y
 *     las Server Actions de src/app/admin/perfumes/actions.ts (escritura).
 *   - Estas funciones NO comprueban el acceso por sí mismas: quien las
 *     llama debe haber llamado antes a comprobarAccesoAdmin()
 *     (src/lib/admin-auth.ts). RLS es la red de seguridad, no la excusa.
 *   - Tipos: src/types/perfume.ts (Perfume, PerfumeEditable).
 *   - Solo servidor: importa supabase-server.ts, que lee cookies. Importarlo
 *     desde un componente con "use client" rompe la compilación.
 *
 * CÓMO DEVUELVEN LOS ERRORES
 *   Ninguna función lanza excepciones por un fallo de la base de datos.
 *   Todas devuelven un Resultado: { ok: true, ... } o { ok: false, error }
 *   con un mensaje en español listo para mostrar. Así la página o la acción
 *   decide qué enseñar sin envolver cada llamada en try/catch.
 *
 * MIGRACIÓN N.º 3 PENDIENTE
 *   Las columnas `destacado` y `agotado` las crea la migración n.º 3. Si aún
 *   no está aplicada: migracion3Aplicada() devuelve false (el panel muestra
 *   un aviso) y crear/editar guardan todo lo demás sin esos dos campos.
 *   (La migración ya está aplicada; la comprobación se conserva por si se
 *   reconstruye la base de datos.)
 *
 * FOTOS Y VIDEO (Fase 3C)
 *   actualizarMedia() guarda SOLO imagen, imagenes y video_url, y
 *   borrarArchivos() borra archivos concretos de Storage. Las usan las
 *   acciones de src/app/admin/perfumes/media-actions.ts. Los archivos los
 *   sube el navegador (src/components/admin/GestorMedia.tsx); aquí solo se
 *   apuntan y se borran.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { BUCKET_FOTOS, BUCKET_VIDEOS } from "@/lib/storage-media";
import type { Perfume, PerfumeEditable } from "@/types/perfume";

/** Resultado de una operación: bien (con sus datos) o mal (con el motivo). */
export type Resultado<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * Buckets (carpetas raíz de Supabase Storage) con archivos de producto.
 * Los nombres viven en src/lib/storage-media.ts, compartidos con el
 * navegador.
 */
const BUCKETS_PRODUCTO = [BUCKET_FOTOS, BUCKET_VIDEOS] as const;

/**
 * Códigos con los que Supabase avisa de que una columna no existe:
 *   42703    — Postgres, "undefined column".
 *   PGRST204 — PostgREST (la capa que expone la base de datos como API —
 *              Application Programming Interface — web): la columna no está
 *              en su copia del esquema.
 */
const CODIGOS_COLUMNA_INEXISTENTE = ["42703", "PGRST204"];

/** Texto único para "la base de datos no dejó hacerlo o no lo encontró". */
const ERROR_NO_ENCONTRADO =
  "No se encontró el perfume. Puede que ya se haya eliminado, o que tu cuenta no tenga permiso.";

/** Registra el detalle técnico en el servidor y devuelve el mensaje amable. */
function fallo(contexto: string, detalle: string, mensaje: string) {
  console.error(`[admin-perfumes] ${contexto}: ${detalle}`);
  return { ok: false as const, error: mensaje };
}

/** Quita los dos campos de la migración n.º 3 de un objeto a guardar. */
function sinColumnasNuevas<T extends object>(datos: T): Omit<T, "destacado" | "agotado"> {
  const copia = { ...datos } as Record<string, unknown>;
  delete copia.destacado;
  delete copia.agotado;
  return copia as Omit<T, "destacado" | "agotado">;
}

/* ── Estado de la migración n.º 3 ───────────────────────────────────── */

/**
 * ¿Existen ya las columnas `destacado` y `agotado`?
 * Se averigua pidiéndolas: si la base de datos responde "columna
 * inexistente", falta la migración. Cualquier otro error se trata como
 * "sí existen" para no mostrar un aviso falso por un fallo de red.
 */
export async function migracion3Aplicada(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("perfumes")
    .select("destacado, agotado")
    .limit(1);
  return !(error && CODIGOS_COLUMNA_INEXISTENTE.includes(error.code));
}

/* ── Lectura ────────────────────────────────────────────────────────── */

/**
 * Todos los perfumes, activos e inactivos, por marca y luego por nombre.
 * Los inactivos solo los ve una administradora: la política "Admins can
 * manage perfumes" de la migración n.º 2 es la que lo permite.
 */
export async function listarPerfumesAdmin(): Promise<
  Resultado<{ perfumes: Perfume[] }>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfumes")
    .select("*")
    .order("marca", { ascending: true })
    .order("nombre", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    return fallo(
      "listarPerfumesAdmin",
      error.message,
      "No se pudieron cargar los perfumes. Recarga la página; si sigue fallando, revisa la conexión.",
    );
  }
  return { ok: true, perfumes: (data ?? []) as Perfume[] };
}

/** Un perfume por su id (activo o no). */
export async function obtenerPerfumeAdmin(
  id: number,
): Promise<Resultado<{ perfume: Perfume | null }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfumes")
    .select("*")
    .eq("id", id)
    .maybeSingle(); // null si no existe, en vez de error

  if (error) {
    return fallo(
      `obtenerPerfumeAdmin(${id})`,
      error.message,
      "No se pudo cargar el perfume. Recarga la página.",
    );
  }
  return { ok: true, perfume: data as Perfume | null };
}

/** Listas de valores ya usados, para sugerir al escribir en el formulario. */
export type SugerenciasPerfume = {
  marcas: string[];
  familias: string[];
  concentraciones: string[];
  volumenes: string[];
};

/**
 * Valores distintos de marca, familia olfativa, concentración y volumen
 * entre TODOS los perfumes. Se obtienen con una sola consulta (las cuatro
 * columnas a la vez) en lugar de cuatro, y se depuran aquí.
 * Si falla, devuelve listas vacías: las sugerencias son una ayuda, no un
 * requisito para poder editar.
 */
export async function listarSugerencias(): Promise<SugerenciasPerfume> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfumes")
    .select("marca, familia_olfativa, concentracion, volumen");

  if (error) {
    console.error(`[admin-perfumes] listarSugerencias: ${error.message}`);
    return { marcas: [], familias: [], concentraciones: [], volumenes: [] };
  }

  type Fila = {
    marca: string | null;
    familia_olfativa: string | null;
    concentracion: string | null;
    volumen: string | null;
  };
  const filas = (data ?? []) as Fila[];

  /** Valores no vacíos, sin repetir, en orden alfabético español. */
  const distintos = (columna: keyof Fila): string[] => {
    const valores = new Set<string>();
    for (const fila of filas) {
      const valor = fila[columna]?.trim();
      if (valor) valores.add(valor);
    }
    return [...valores].sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true }),
    );
  };

  return {
    marcas: distintos("marca"),
    familias: distintos("familia_olfativa"),
    concentraciones: distintos("concentracion"),
    volumenes: distintos("volumen"),
  };
}

/* ── Escritura ──────────────────────────────────────────────────────── */

/**
 * Inserta una fila en `perfumes`. Si la base de datos responde que faltan
 * las columnas de la migración n.º 3, repite sin ellas.
 */
async function insertar(
  supabase: SupabaseClient,
  fila: Record<string, unknown>,
) {
  let respuesta = await supabase.from("perfumes").insert(fila).select().single();
  if (
    respuesta.error &&
    CODIGOS_COLUMNA_INEXISTENTE.includes(respuesta.error.code)
  ) {
    respuesta = await supabase
      .from("perfumes")
      .insert(sinColumnasNuevas(fila))
      .select()
      .single();
  }
  return respuesta;
}

/**
 * Crea un perfume nuevo. Nace sin foto ni video: `imagen` vacía hace que
 * la tienda muestre la imagen genérica (PLACEHOLDER_IMAGE).
 */
export async function crearPerfume(
  datos: PerfumeEditable,
): Promise<Resultado<{ perfume: Perfume }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await insertar(supabase, {
    ...datos,
    imagen: "",
    imagenes: [],
    video_url: null,
  });

  if (error || !data) {
    return fallo(
      "crearPerfume",
      error?.message ?? "sin datos",
      "No se pudo crear el perfume. Inténtalo de nuevo.",
    );
  }
  return { ok: true, perfume: data as Perfume };
}

/**
 * Guarda los cambios de un perfume. Solo toca los campos de
 * PerfumeEditable: fotos y video quedan como estaban.
 */
export async function actualizarPerfume(
  id: number,
  datos: Partial<PerfumeEditable>,
): Promise<Resultado<{ perfume: Perfume }>> {
  const supabase = await createSupabaseServerClient();

  // .select() tras el update devuelve las filas modificadas. Con RLS, un
  // update "no permitido" no da error: simplemente modifica cero filas.
  // Por eso se comprueba cuántas volvieron.
  let { data, error } = await supabase
    .from("perfumes")
    .update(datos)
    .eq("id", id)
    .select();

  if (error && CODIGOS_COLUMNA_INEXISTENTE.includes(error.code)) {
    ({ data, error } = await supabase
      .from("perfumes")
      .update(sinColumnasNuevas(datos))
      .eq("id", id)
      .select());
  }

  if (error) {
    return fallo(
      `actualizarPerfume(${id})`,
      error.message,
      "No se pudieron guardar los cambios. Inténtalo de nuevo.",
    );
  }
  if (!data || data.length === 0) {
    return { ok: false, error: ERROR_NO_ENCONTRADO };
  }
  return { ok: true, perfume: data[0] as Perfume };
}

/** Activa u oculta un perfume en la tienda. */
export async function cambiarActivo(
  id: number,
  activo: boolean,
): Promise<Resultado<{ perfume: Perfume }>> {
  return actualizarPerfume(id, { activo });
}

/**
 * Crea una copia de un perfume para usarla como punto de partida.
 *
 * Se copian todos los datos de texto. Cambia a propósito:
 *   - nombre: se le añade " (copia)" para distinguirlo en la lista;
 *   - activo = false: la copia nace oculta, para revisarla antes de
 *     publicarla;
 *   - destacado = false: no debe aparecer sola en la portada;
 *   - imagen, imagenes y video_url VACÍOS. Motivo: las fotos subidas viven
 *     en Storage dentro de la carpeta del perfume original ("<id>/..."). Si
 *     la copia apuntara a esos mismos archivos, al eliminar el original se
 *     borraría su carpeta y la copia se quedaría con fotos rotas (y al
 *     revés no se limpiaría nada). Cada perfume debe tener sus propios
 *     archivos; la copia espera las suyas.
 * Las reseñas tampoco se copian: pertenecen al perfume original.
 */
export async function duplicarPerfume(
  id: number,
): Promise<Resultado<{ perfume: Perfume }>> {
  const original = await obtenerPerfumeAdmin(id);
  if (!original.ok) return original;
  if (!original.perfume) return { ok: false, error: ERROR_NO_ENCONTRADO };

  const p = original.perfume;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await insertar(supabase, {
    nombre: `${p.nombre} (copia)`,
    marca: p.marca,
    genero: p.genero,
    concentracion: p.concentracion,
    volumen: p.volumen,
    precio: p.precio,
    precio_original: p.precio_original,
    descripcion: p.descripcion,
    descripcion_olfativa: p.descripcion_olfativa,
    familia_olfativa: p.familia_olfativa,
    notas: p.notas,
    ocasiones: p.ocasiones,
    badge: p.badge,
    agotado: p.agotado === true,
    activo: false,
    destacado: false,
    imagen: "",
    imagenes: [],
    video_url: null,
  });

  if (error || !data) {
    return fallo(
      `duplicarPerfume(${id})`,
      error?.message ?? "sin datos",
      "No se pudo duplicar el perfume. Inténtalo de nuevo.",
    );
  }
  return { ok: true, perfume: data as Perfume };
}

/**
 * Borra de un bucket todo lo que haya en la carpeta "<id>/".
 * Devuelve un texto de aviso si algo falló, o null si todo fue bien.
 */
async function vaciarCarpeta(
  supabase: SupabaseClient,
  bucket: string,
  id: number,
): Promise<string | null> {
  const carpeta = String(id);
  const almacen = supabase.storage.from(bucket);

  // list() devuelve como mucho `limit` entradas por llamada: se repite
  // hasta vaciar la carpeta, con un tope de vueltas por seguridad.
  for (let vuelta = 0; vuelta < 20; vuelta += 1) {
    const { data: archivos, error: errorLista } = await almacen.list(carpeta, {
      limit: 100,
    });
    if (errorLista) {
      console.error(
        `[admin-perfumes] listar ${bucket}/${carpeta}: ${errorLista.message}`,
      );
      return `No se pudieron revisar los archivos de "${bucket}".`;
    }
    if (!archivos || archivos.length === 0) return null;

    // Solo rutas dentro de la carpeta de ESTE perfume en Storage. Los
    // archivos locales del sitio (rutas que empiezan por "/assets/") no
    // están en Storage y jamás se tocan desde aquí.
    const rutas = archivos.map((archivo) => `${carpeta}/${archivo.name}`);
    const { error: errorBorrado } = await almacen.remove(rutas);
    if (errorBorrado) {
      console.error(
        `[admin-perfumes] borrar ${bucket}/${carpeta}: ${errorBorrado.message}`,
      );
      return `No se pudieron borrar ${rutas.length} archivo(s) de "${bucket}".`;
    }
  }
  return null;
}

/**
 * Elimina un perfume de forma definitiva.
 *
 * Orden de los pasos:
 *   1. Se borra la fila. Sus reseñas se borran solas (ON DELETE CASCADE en
 *      la tabla reviews, migración n.º 1).
 *   2. Se borran sus archivos subidos: todo lo que haya en la carpeta
 *      "<id>/" de los buckets product-images y product-videos.
 *
 * Si el paso 2 falla, el perfume YA está eliminado: se devuelve ok: true
 * junto con `avisos`, para informar de que quedaron archivos huérfanos sin
 * hacer creer que el borrado no ocurrió.
 */
export async function eliminarPerfume(
  id: number,
): Promise<Resultado<{ avisos: string[] }>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("perfumes")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    return fallo(
      `eliminarPerfume(${id})`,
      error.message,
      "No se pudo eliminar el perfume. Inténtalo de nuevo.",
    );
  }
  // Cero filas borradas: no existía, o RLS no lo permitió.
  if (!data || data.length === 0) {
    return { ok: false, error: ERROR_NO_ENCONTRADO };
  }

  const avisos: string[] = [];
  for (const bucket of BUCKETS_PRODUCTO) {
    const aviso = await vaciarCarpeta(supabase, bucket, id);
    if (aviso) avisos.push(aviso);
  }
  return { ok: true, avisos };
}

/* ── Fotos y video (Fase 3C) ────────────────────────────────────────── */

/** Campos de medios que se pueden guardar. */
export type CamposMedia = {
  imagen?: string;
  imagenes?: string[];
  video_url?: string | null;
};

/**
 * Guarda solo los campos de fotos y video de un perfume.
 * Es una función aparte de actualizarPerfume() a propósito: el formulario
 * principal guarda PerfumeEditable, que NO incluye estos campos, así que
 * un "Guardar" del formulario nunca pisa las fotos, y esta función nunca
 * toca los textos. La usan las acciones de
 * src/app/admin/perfumes/media-actions.ts.
 */
export async function actualizarMedia(
  id: number,
  campos: CamposMedia,
): Promise<Resultado<{ perfume: Perfume }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfumes")
    .update(campos)
    .eq("id", id)
    .select();

  if (error) {
    return fallo(
      `actualizarMedia(${id})`,
      error.message,
      "No se pudieron guardar las fotos o el video. Inténtalo de nuevo.",
    );
  }
  // Cero filas: no existe, o RLS no lo permitió (ver actualizarPerfume).
  if (!data || data.length === 0) {
    return { ok: false, error: ERROR_NO_ENCONTRADO };
  }
  return { ok: true, perfume: data[0] as Perfume };
}

/**
 * Borra archivos concretos de un bucket de producto, con la sesión de la
 * administradora (las políticas de Storage de la migración n.º 2 exigen
 * is_admin()). `rutas` son rutas DENTRO del bucket ("12/archivo.webp"),
 * nunca rutas locales del sitio.
 * Devuelve null si fue bien, o un aviso en español si no. No lanza.
 */
export async function borrarArchivos(
  bucket: (typeof BUCKETS_PRODUCTO)[number],
  rutas: string[],
): Promise<string | null> {
  if (rutas.length === 0) return null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(bucket).remove(rutas);
  if (error) {
    console.error(`[admin-perfumes] borrarArchivos(${bucket}): ${error.message}`);
    return `No se pudieron borrar ${rutas.length} archivo(s) de "${bucket}".`;
  }
  return null;
}
