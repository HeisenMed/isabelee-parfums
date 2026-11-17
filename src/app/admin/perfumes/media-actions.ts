"use server";

/**
 * src/app/admin/perfumes/media-actions.ts — Acciones de servidor de fotos y
 * video.
 *
 * QUÉ ES
 *   Las Server Actions (funciones del servidor que el navegador puede
 *   invocar directamente) con las que el panel guarda las fotos y el video
 *   de un perfume:
 *
 *     guardarFotos(id, urls)   guarda la lista ordenada de fotos
 *     quitarFoto(id, url)      quita una foto (y borra su archivo si es nuestro)
 *     guardarVideo(id, url)    pone, cambia o quita (null) el video
 *
 * POR QUÉ EXISTE
 *   Los ARCHIVOS los sube el navegador directamente a Supabase Storage
 *   (src/components/admin/GestorMedia.tsx). Lo que falta después es
 *   apuntarlos en la fila del perfume (columnas imagen, imagenes y
 *   video_url), y eso se hace aquí, en el servidor, por tres motivos:
 *     1. PERMISO: cada acción empieza con comprobarAccesoAdmin(). Una
 *        Server Action es una dirección pública; que la página esté
 *        protegida no la protege a ella.
 *     2. VALIDACIÓN: la lista de URLs llega del navegador. Se comprueba
 *        que cada una sea un archivo de ESTE perfume en NUESTRO Storage
 *        (src/lib/storage-media.ts), o una foto local ("/assets/…") que el
 *        perfume ya tenía. Así nadie puede colar una imagen de otro sitio
 *        ni la foto de otro perfume.
 *     3. ORDEN DE LAS OPERACIONES: si falla el guardado en la base de
 *        datos, se borra el archivo recién subido para no dejar huérfanos;
 *        y los archivos que dejan de usarse se borran solo DESPUÉS de
 *        guardar con éxito.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lee y escribe con src/lib/admin-perfumes.ts (obtenerPerfumeAdmin,
 *     actualizarMedia, borrarArchivos), que usa la SESIÓN de la
 *     administradora: RLS (Row Level Security) y is_admin() vuelven a
 *     comprobar el permiso en la base de datos y en Storage.
 *   - Tras cada cambio llama a revalidatePath() para "/", "/catalogo" y
 *     "/producto/<id>". Hoy la tienda se genera en cada visita (Fase 6B, sin
 *     caché en Cloudflare) y la llamada no hace nada; queda lista por si se
 *     reactiva la caché. Nunca rompe el guardado (OpenNext captura errores).
 *   - Las invoca src/components/admin/GestorMedia.tsx.
 *
 * QUÉ SIGNIFICA LA LISTA DE FOTOS
 *   La lista ordenada es la fuente de verdad: la primera foto va a
 *   `imagen` (la que sale en el catálogo) y el resto a `imagenes` (la
 *   galería de la ficha). Lista vacía → `imagen` vacía → la tienda muestra
 *   la imagen genérica. La imagen genérica NUNCA se guarda como foto.
 *
 * QUÉ SE BORRA Y QUÉ NO
 *   - Una foto de Storage que sale de la lista se borra de Storage (solo si
 *     está en la carpeta de ESTE perfume).
 *   - Una foto local ("/assets/…", las 34 fotos originales del sitio) solo
 *     se DESVINCULA del perfume: es un archivo del repositorio y no se toca.
 */
import { revalidatePath } from "next/cache";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import {
  actualizarMedia,
  borrarArchivos,
  obtenerPerfumeAdmin,
} from "@/lib/admin-perfumes";
import {
  BUCKET_FOTOS,
  BUCKET_VIDEOS,
  MAX_FOTOS,
  esPlaceholder,
  esRutaLocal,
  rutaDelPerfume,
} from "@/lib/storage-media";
import type { Perfume } from "@/types/perfume";

/** Lo que el gestor de medios recibe tras cada acción. */
export type ResultadoMedia =
  | {
      ok: true;
      /** Lista de fotos tal como quedó guardada (la primera es la principal). */
      fotos: string[];
      /** Video guardado, o null. */
      video: string | null;
      /**
       * Aviso si el cambio se guardó pero algún archivo antiguo no se pudo
       * borrar de Storage. No es un error para quien usa el panel.
       */
      aviso: string | null;
    }
  | { ok: false; error: string };

const ERROR_SIN_ACCESO =
  "Tu sesión caducó o tu cuenta no tiene permiso. Recarga la página y vuelve a entrar.";
const ERROR_PERFUME = "No se reconoce el perfume. Recarga la página.";
const AVISO_LIMPIEZA =
  "El cambio se guardó, pero un archivo antiguo no se pudo borrar de Storage. No afecta a la tienda.";

/* ── Utilidades ─────────────────────────────────────────────────────── */

/** Los argumentos llegan del navegador: se valida que sea un id real. */
function idValido(valor: unknown): number | null {
  return typeof valor === "number" &&
    Number.isInteger(valor) &&
    valor > 0 &&
    valor < 1e9
    ? valor
    : null;
}

/** Fotos actuales de un perfume: principal + galería, sin vacíos ni la genérica. */
function fotosDe(perfume: { imagen: string; imagenes: string[] | null }): string[] {
  return [perfume.imagen, ...(perfume.imagenes ?? [])].filter(
    (url): url is string => Boolean(url) && !esPlaceholder(url),
  );
}

/** Descarta la caché de las páginas de la tienda que muestran el perfume. */
function refrescarTienda(id: number): void {
  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath(`/producto/${id}`);
}

/**
 * Comprueba el acceso y carga el perfume. Devuelve el perfume o el
 * resultado de error que hay que devolver al navegador.
 */
async function prepararse(
  perfumeId: unknown,
): Promise<
  | { error: { ok: false; error: string } }
  | { error?: undefined; id: number; perfume: Perfume }
> {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") {
    return { error: { ok: false, error: ERROR_SIN_ACCESO } };
  }
  const id = idValido(perfumeId);
  if (!id) return { error: { ok: false, error: ERROR_PERFUME } };

  const resultado = await obtenerPerfumeAdmin(id);
  if (!resultado.ok) return { error: { ok: false, error: resultado.error } };
  if (!resultado.perfume) {
    return {
      error: {
        ok: false,
        error: "Este perfume ya no existe. Vuelve a la lista de perfumes.",
      },
    };
  }
  return { id, perfume: resultado.perfume };
}

/* ── Fotos ──────────────────────────────────────────────────────────── */

/**
 * Guarda `urls` como la lista de fotos del perfume. `actuales` es la lista
 * que había antes (leída de la base de datos, no del navegador).
 */
async function persistirFotos(
  id: number,
  urls: string[],
  actuales: string[],
  video: string | null,
): Promise<ResultadoMedia> {
  // Rutas en Storage de las fotos de la lista nueva y de la anterior que
  // son archivos de ESTE perfume (las únicas que se pueden borrar).
  const rutaDe = (url: string) => rutaDelPerfume(url, BUCKET_FOTOS, id);
  const nuevas = urls.filter((url) => !actuales.includes(url));
  const quitadas = actuales.filter((url) => !urls.includes(url));

  const guardado = await actualizarMedia(id, {
    imagen: urls[0] ?? "",
    imagenes: urls.slice(1),
  });

  if (!guardado.ok) {
    // La fila no cambió: los archivos recién subidos no los usa nadie.
    const huerfanas = nuevas.map(rutaDe).filter((r): r is string => r !== null);
    await borrarArchivos(BUCKET_FOTOS, huerfanas);
    return { ok: false, error: guardado.error };
  }

  // Solo tras guardar con éxito se borran los archivos que ya no se usan.
  // Las fotos locales ("/assets/…") no tienen ruta de Storage: se quedan.
  const aBorrar = quitadas.map(rutaDe).filter((r): r is string => r !== null);
  const fallo = await borrarArchivos(BUCKET_FOTOS, aBorrar);

  refrescarTienda(id);
  return {
    ok: true,
    fotos: fotosDe(guardado.perfume),
    video: guardado.perfume.video_url ?? video,
    aviso: fallo ? AVISO_LIMPIEZA : null,
  };
}

/**
 * Guarda la lista ordenada de fotos de un perfume. Sirve para añadir una
 * foto recién subida, reordenar y elegir la principal.
 *
 * Cada URL debe ser una foto de este perfume en el bucket de fotos, o una
 * foto que el perfume ya tenía (por ejemplo, una local "/assets/…"). Se
 * descartan la imagen genérica y los repetidos.
 */
export async function guardarFotos(
  perfumeId: number,
  urls: string[],
): Promise<ResultadoMedia> {
  const preparado = await prepararse(perfumeId);
  if (preparado.error) return preparado.error;
  const { id, perfume } = preparado;

  if (!Array.isArray(urls) || urls.some((url) => typeof url !== "string")) {
    return { ok: false, error: "No se pudo leer la lista de fotos. Recarga la página." };
  }

  const actuales = fotosDe(perfume);
  // Sin repetidos y sin la imagen genérica, conservando el orden.
  const limpias = [...new Set(urls.map((url) => url.trim()))].filter(
    (url) => url && !esPlaceholder(url),
  );

  if (limpias.length > MAX_FOTOS) {
    return {
      ok: false,
      error: `Un perfume puede tener como máximo ${MAX_FOTOS} fotos. Quita alguna antes de agregar más.`,
    };
  }

  const ajena = limpias.find(
    (url) => !actuales.includes(url) && !rutaDelPerfume(url, BUCKET_FOTOS, id),
  );
  if (ajena) {
    return {
      ok: false,
      error: "Una de las fotos no pertenece a este perfume. Recarga la página e inténtalo de nuevo.",
    };
  }

  return persistirFotos(id, limpias, actuales, perfume.video_url);
}

/**
 * Quita una foto del perfume. Si es un archivo de Storage de este perfume,
 * también se borra el archivo; si es una foto local ("/assets/…"), solo se
 * desvincula.
 */
export async function quitarFoto(
  perfumeId: number,
  url: string,
): Promise<ResultadoMedia> {
  const preparado = await prepararse(perfumeId);
  if (preparado.error) return preparado.error;
  const { id, perfume } = preparado;

  const actuales = fotosDe(perfume);
  if (typeof url !== "string" || !actuales.includes(url)) {
    // Ya no estaba (quizá se quitó desde otra pestaña): se devuelve el
    // estado real para que la pantalla se ponga al día.
    return { ok: true, fotos: actuales, video: perfume.video_url, aviso: null };
  }

  return persistirFotos(
    id,
    actuales.filter((actual) => actual !== url),
    actuales,
    perfume.video_url,
  );
}

/* ── Video ──────────────────────────────────────────────────────────── */

/**
 * Pone (`url`) o quita (`null`) el video del perfume. Si había un video
 * anterior en Storage de este perfume, se borra después de guardar.
 */
export async function guardarVideo(
  perfumeId: number,
  url: string | null,
): Promise<ResultadoMedia> {
  const preparado = await prepararse(perfumeId);
  if (preparado.error) return preparado.error;
  const { id, perfume } = preparado;

  const anterior = perfume.video_url;
  const rutaNueva =
    typeof url === "string" ? rutaDelPerfume(url, BUCKET_VIDEOS, id) : null;

  // Se acepta: null (quitar), un video de este perfume en Storage, o el
  // mismo video que ya tenía (por ejemplo, uno local antiguo).
  if (url !== null && !rutaNueva && url !== anterior) {
    return {
      ok: false,
      error: "El video no pertenece a este perfume. Recarga la página e inténtalo de nuevo.",
    };
  }

  const guardado = await actualizarMedia(id, { video_url: url });

  if (!guardado.ok) {
    // El video recién subido no lo usa nadie: se borra.
    if (rutaNueva && url !== anterior) {
      await borrarArchivos(BUCKET_VIDEOS, [rutaNueva]);
    }
    return { ok: false, error: guardado.error };
  }

  // El video anterior se borra solo si era nuestro y ya no se usa. Un video
  // local ("/videos/…" o "/assets/…") nunca se borra.
  let fallo: string | null = null;
  if (anterior && anterior !== url && !esRutaLocal(anterior)) {
    const rutaAnterior = rutaDelPerfume(anterior, BUCKET_VIDEOS, id);
    if (rutaAnterior) fallo = await borrarArchivos(BUCKET_VIDEOS, [rutaAnterior]);
  }

  refrescarTienda(id);
  return {
    ok: true,
    fotos: fotosDe(guardado.perfume),
    video: guardado.perfume.video_url,
    aviso: fallo ? AVISO_LIMPIEZA : null,
  };
}
