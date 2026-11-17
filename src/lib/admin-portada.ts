/**
 * src/lib/admin-portada.ts — Datos de la portada para el panel (solo servidor).
 *
 * QUÉ ES
 *   Las funciones con las que el panel (/admin/portada) lee y guarda el
 *   contenido editable de la portada (tabla contenido_portada) y limpia
 *   los archivos del bucket site-media que dejan de usarse.
 *
 * POR QUÉ EXISTE
 *   Igual que src/lib/admin-perfumes.ts para el catálogo: todas las
 *   escrituras pasan por la base de datos CON LA SESIÓN de la
 *   administradora (createSupabaseServerClient), así que RLS (Row Level
 *   Security) e is_admin() comprueban el permiso en cada operación.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan src/app/admin/(panel)/portada/page.tsx (lectura) y
 *     src/app/admin/portada/actions.ts (guardar y restaurar). Quien llama
 *     debe haber comprobado antes el acceso con comprobarAccesoAdmin().
 *   - Tipos: src/types/portada.ts. Valores originales y validación:
 *     src/lib/portada.ts. Rutas de archivos: src/lib/storage-media.ts.
 *   - Tabla y bucket: migración n.º 5. Si falta, leerPortadaAdmin()
 *     responde "migracion-pendiente" y el panel lo explica en vez de
 *     romperse.
 *
 * LIMPIEZA DE ARCHIVOS (después de guardar con éxito)
 *   En la carpeta portada/<sección>/ de site-media se borran:
 *     1. los archivos que la versión ANTERIOR usaba y la nueva ya no;
 *     2. los archivos que no usa nadie y tienen más de 24 horas: subidas
 *        que se abandonaron (por ejemplo, se subió un video y se cerró la
 *        página sin guardar). El margen de 24 horas evita borrar lo que
 *        otra administradora esté subiendo en ese momento.
 *   Nunca se tocan archivos locales ("/videos/…", "/assets/…"): no están en
 *   Storage y no tienen ruta en el bucket.
 */
import { DEFAULTS_PORTADA, revisarEntrega, revisarFamilias } from "@/lib/portada";
import { BUCKET_SITIO, rutaPortadaDeUrl } from "@/lib/storage-media";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ClavePortada, ContenidoPortada, EntregaPortada, FamiliasPortada } from "@/types/portada";

/** Códigos de "la tabla no existe": Postgres (42P01) y PostgREST (PGRST205). */
const CODIGOS_TABLA_INEXISTENTE = ["42P01", "PGRST205"];

/** Antigüedad a partir de la cual un archivo sin usar se considera abandonado. */
const MARGEN_ABANDONADO_MS = 24 * 60 * 60 * 1000;

/** Resultado de leer la portada para el panel. */
export type LecturaPortada =
  | { estado: "ok"; contenido: ContenidoPortada }
  | { estado: "migracion-pendiente" }
  | { estado: "error"; error: string };

/** Datos de una sección, según su clave. */
export type DatosSeccion<C extends ClavePortada> = C extends "familias"
  ? FamiliasPortada
  : EntregaPortada;

/**
 * Lee las dos secciones. Si una fila falta o no es válida, esa sección se
 * muestra con el contenido original (y al guardar se escribirá bien).
 */
export async function leerPortadaAdmin(): Promise<LecturaPortada> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("contenido_portada").select("clave, datos");

  if (error) {
    if (CODIGOS_TABLA_INEXISTENTE.includes(error.code)) return { estado: "migracion-pendiente" };
    console.error("[admin-portada] leerPortadaAdmin:", error.message);
    return { estado: "error", error: "No se pudo cargar el contenido de la portada. Recarga la página." };
  }

  const filas = new Map((data ?? []).map((f) => [f.clave as string, f.datos as unknown]));
  const familias = revisarFamilias(filas.get("familias"));
  const entrega = revisarEntrega(filas.get("entrega"));
  return {
    estado: "ok",
    contenido: {
      familias: familias.ok ? familias.datos : DEFAULTS_PORTADA.familias,
      entrega: entrega.ok ? entrega.datos : DEFAULTS_PORTADA.entrega,
    },
  };
}

/** Lee los datos guardados de UNA sección (null si no hay fila válida). */
async function leerSeccion(clave: ClavePortada): Promise<unknown | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("contenido_portada")
    .select("datos")
    .eq("clave", clave)
    .maybeSingle();
  return data?.datos ?? null;
}

/**
 * Familias olfativas de los perfumes ACTIVOS, con cuántos perfumes tiene
 * cada una. El panel las usa para contar, mientras se escribe, cuántos
 * perfumes mostrará una palabra, y como sugerencias.
 */
export async function familiasConConteo(): Promise<{ nombre: string; cantidad: number }[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("perfumes")
    .select("familia_olfativa")
    .eq("activo", true);
  if (error) {
    console.error("[admin-portada] familiasConConteo:", error.message);
    return [];
  }
  const conteo = new Map<string, number>();
  for (const { familia_olfativa: f } of (data ?? []) as { familia_olfativa: string | null }[]) {
    if (f) conteo.set(f, (conteo.get(f) ?? 0) + 1);
  }
  return [...conteo]
    .map(([nombre, cantidad]) => ({ nombre, cantidad }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

/** Rutas en site-media de los archivos que usa una sección. */
export function archivosUsados(clave: ClavePortada, datos: unknown): Set<string> {
  const medios: unknown[] =
    clave === "familias"
      ? ((datos as FamiliasPortada | null)?.tarjetas ?? []).map((t) => t?.medio)
      : [(datos as EntregaPortada | null)?.medio];

  const rutas = new Set<string>();
  for (const medio of medios) {
    const m = (medio ?? {}) as { src?: unknown; poster?: unknown };
    for (const url of [m.src, m.poster]) {
      if (typeof url !== "string") continue;
      const ruta = rutaPortadaDeUrl(url, clave);
      if (ruta) rutas.add(ruta);
    }
  }
  return rutas;
}

/** Borra archivos de site-media. Devuelve un aviso si falla; no lanza. */
export async function borrarArchivosSitio(rutas: string[]): Promise<string | null> {
  if (rutas.length === 0) return null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(BUCKET_SITIO).remove(rutas);
  if (error) {
    console.error("[admin-portada] borrarArchivosSitio:", error.message);
    return "Se guardó, pero algún archivo antiguo no se pudo borrar de Storage. No afecta a la tienda.";
  }
  return null;
}

/**
 * Guarda una sección y, si sale bien, limpia los archivos que ya no usa
 * (ver LIMPIEZA DE ARCHIVOS). Si el guardado falla, borra los archivos
 * NUEVOS de esa versión (subidos para ella y que no usaba la anterior),
 * para no dejar huérfanos. Los datos deben venir ya validados.
 */
export async function guardarSeccion<C extends ClavePortada>(
  clave: C,
  datos: DatosSeccion<C>,
): Promise<{ ok: true; aviso: string | null } | { ok: false; error: string }> {
  const anterior = await leerSeccion(clave);
  const usadosAntes = archivosUsados(clave, anterior);
  const usadosAhora = archivosUsados(clave, datos);

  const supabase = await createSupabaseServerClient();
  // upsert: crea la fila si no existe (por ejemplo, si se borró a mano).
  // .select() devuelve las filas escritas: con RLS, una escritura no
  // permitida no da error sino cero filas.
  const { data, error } = await supabase
    .from("contenido_portada")
    .upsert({ clave, datos }, { onConflict: "clave" })
    .select("clave");

  if (error || !data || data.length === 0) {
    if (error) console.error(`[admin-portada] guardarSeccion(${clave}):`, error.message);
    const nuevos = [...usadosAhora].filter((ruta) => !usadosAntes.has(ruta));
    await borrarArchivosSitio(nuevos);
    return {
      ok: false,
      error:
        error && CODIGOS_TABLA_INEXISTENTE.includes(error.code)
          ? "Falta ejecutar la migración n.º 5."
          : "No se pudo guardar. Inténtalo de nuevo; si subiste un archivo, vuelve a subirlo.",
    };
  }

  // 1) Lo que usaba la versión anterior y ya no.
  const aBorrar = new Set([...usadosAntes].filter((ruta) => !usadosAhora.has(ruta)));

  // 2) Subidas abandonadas: sin usar y con más de 24 h. La marca de tiempo
  //    va en el propio nombre ("<marca>-<azar>.webp").
  const carpeta = `portada/${clave}`;
  const { data: archivos } = await supabase.storage.from(BUCKET_SITIO).list(carpeta, { limit: 1000 });
  const limite = Date.now() - MARGEN_ABANDONADO_MS;
  for (const archivo of archivos ?? []) {
    const ruta = `${carpeta}/${archivo.name}`;
    const marca = Number(archivo.name.split("-")[0]);
    if (!usadosAhora.has(ruta) && Number.isFinite(marca) && marca < limite) aBorrar.add(ruta);
  }

  const aviso = await borrarArchivosSitio([...aBorrar]);
  return { ok: true, aviso };
}
