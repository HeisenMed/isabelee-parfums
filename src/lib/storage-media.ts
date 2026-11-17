/**
 * src/lib/storage-media.ts — Reglas comunes de fotos y videos de producto.
 *
 * QUÉ ES
 *   Constantes y funciones puras (sin base de datos, sin cookies, sin
 *   React) sobre los archivos de producto: nombres de los buckets, límites,
 *   cómo se llama cada archivo subido, cómo reconocer una URL de nuestro
 *   Storage y cómo validar un archivo antes de subirlo.
 *
 * POR QUÉ EXISTE
 *   Las mismas reglas se aplican en dos sitios que no pueden compartir
 *   código de servidor:
 *     - en el navegador (src/components/admin/GestorMedia.tsx), para avisar
 *       antes de subir y para dar nombre al archivo;
 *     - en el servidor (src/app/admin/perfumes/media-actions.ts), para
 *       comprobar que una URL que llega del navegador es de verdad una
 *       foto de ESTE perfume en NUESTRO Storage antes de guardarla.
 *   Tenerlas en un solo archivo evita que el navegador y el servidor
 *   acaben con reglas distintas.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Los buckets (carpetas raíz de Supabase Storage) los crea el seed
 *     (supabase/seed/seed-from-v1.ts); sus límites de tamaño y tipo los
 *     fija la migración n.º 4 (supabase/migrations/20261119000000_*.sql).
 *     MAX_VIDEO_BYTES y los tipos aceptados deben coincidir con ella.
 *   - La URL pública de un archivo tiene la forma
 *       <NEXT_PUBLIC_SUPABASE_URL>/storage/v1/object/public/<bucket>/<ruta>
 *     que es la misma que autoriza next.config.ts para next/image.
 *
 * ESTRUCTURA DE CARPETAS EN STORAGE (importante)
 *   Cada archivo va en la carpeta del perfume, SIN subcarpetas:
 *       product-images/12/1763400000000-a1b2c3d4.webp
 *       product-videos/12/1763400000000-e5f6a7b8.mp4
 *   eliminarPerfume() (src/lib/admin-perfumes.ts) borra el contenido de
 *   "<id>/" listando solo su primer nivel. Si algún día se crearan
 *   subcarpetas, esos archivos quedarían huérfanos al eliminar el perfume.
 *   Por eso nombreArchivo() siempre genera rutas planas y
 *   rutaDelPerfume() rechaza cualquier ruta con más de un nivel.
 */
import { PLACEHOLDER_IMAGE } from "@/lib/site";

/** Bucket de fotos de producto (público para lectura). */
export const BUCKET_FOTOS = "product-images";
/** Bucket de videos de producto (público para lectura). */
export const BUCKET_VIDEOS = "product-videos";
export type BucketProducto = typeof BUCKET_FOTOS | typeof BUCKET_VIDEOS;

/** Máximo de fotos por perfume (principal + galería). */
export const MAX_FOTOS = 8;
/** Lado más largo de una foto tras convertirla, en píxeles. */
export const LADO_MAXIMO_FOTO = 1600;
/**
 * Tamaño máximo de la foto ORIGINAL que se acepta para convertir. No es un
 * límite de Storage (lo que se sube pesa mucho menos): evita que el
 * navegador del teléfono se quede sin memoria con un archivo enorme.
 */
export const MAX_FOTO_ORIGINAL_BYTES = 40 * 1024 * 1024;
/**
 * Tamaño máximo de un video: 50 MB. Coincide con el límite del bucket
 * (migración n.º 4) y con el máximo por archivo del plan gratuito de
 * Supabase.
 */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

/** Mensaje para videos en formato QuickTime (.mov), típicos del iPhone. */
export const MENSAJE_VIDEO_MOV =
  "El video debe estar en MP4. En el celular, expórtalo o compártelo como MP4 e inténtalo de nuevo.";

/* ── URLs ───────────────────────────────────────────────────────────── */

/** ¿Es una ruta de un archivo que vive en el propio sitio (public/assets)? */
export function esRutaLocal(url: string): boolean {
  return url.startsWith("/assets/");
}

/** ¿Es la imagen genérica? Nunca se guarda como foto de un perfume. */
export function esPlaceholder(url: string): boolean {
  return url === PLACEHOLDER_IMAGE;
}

/**
 * Descompone una URL pública de nuestro Storage en { bucket, ruta }.
 * Devuelve null si la URL no es de este proyecto de Supabase o no es una
 * URL pública de Storage. Compara el origen exacto (protocolo + dominio +
 * puerto) con NEXT_PUBLIC_SUPABASE_URL: una URL de otro sitio que solo se
 * pareciera no pasa.
 */
export function leerUrlStorage(
  url: string,
): { bucket: string; ruta: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  let analizada: URL;
  let origenPropio: string;
  try {
    analizada = new URL(url);
    origenPropio = new URL(base).origin;
  } catch {
    return null; // no es una URL absoluta válida
  }
  if (analizada.origin !== origenPropio) return null;
  // Una URL pública nunca lleva parámetros ni ancla; si los trae, no es
  // una que haya generado el panel.
  if (analizada.search || analizada.hash) return null;

  const prefijo = "/storage/v1/object/public/";
  if (!analizada.pathname.startsWith(prefijo)) return null;

  const resto = analizada.pathname.slice(prefijo.length);
  const barra = resto.indexOf("/");
  if (barra <= 0) return null;

  let ruta: string;
  try {
    ruta = decodeURIComponent(resto.slice(barra + 1));
  } catch {
    return null;
  }
  return { bucket: resto.slice(0, barra), ruta };
}

/** Extensiones que puede generar el panel, por bucket. */
const EXTENSIONES: Record<BucketProducto, string> = {
  [BUCKET_FOTOS]: "webp|jpg",
  [BUCKET_VIDEOS]: "mp4",
};

/**
 * Si `url` es un archivo de `bucket` dentro de la carpeta del perfume
 * `perfumeId`, con la forma exacta que genera nombreArchivo(), devuelve su
 * ruta dentro del bucket ("12/1763400000000-a1b2c3d4.webp"). Si no, null.
 * Es la comprobación que impide guardar en un perfume una foto de otro
 * perfume, de otro bucket o de otro sitio.
 */
export function rutaDelPerfume(
  url: string,
  bucket: BucketProducto,
  perfumeId: number,
): string | null {
  const partes = leerUrlStorage(url);
  if (!partes || partes.bucket !== bucket) return null;

  const forma = new RegExp(`^${perfumeId}/\\d{10,16}-[a-z0-9]{8}\\.(${EXTENSIONES[bucket]})$`);
  return forma.test(partes.ruta) ? partes.ruta : null;
}

/* ── Nombres de archivo ─────────────────────────────────────────────── */

/**
 * Ruta para un archivo nuevo: "<perfumeId>/<marca de tiempo>-<8 caracteres
 * al azar>.<extensión>". El azar evita choques si se suben dos archivos en
 * el mismo milisegundo; la marca de tiempo los ordena por antigüedad.
 *
 * Se usa crypto.getRandomValues y NO crypto.randomUUID: randomUUID solo
 * existe en "contextos seguros" (https o localhost), y al probar el panel
 * desde el teléfono por la IP local (http://192.168.x.x:3000) no estaría.
 */
export function nombreArchivo(
  perfumeId: number,
  extension: "webp" | "jpg" | "mp4",
): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const azar = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${perfumeId}/${Date.now()}-${azar}.${extension}`;
}

/* ── Validación de archivos (navegador) ─────────────────────────────── */

/** Tamaño legible en español: 4300000 → "4,1 MB"; 215000 → "210 KB". */
export function formatearTamano(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", {
      maximumFractionDigits: 1,
    })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** null si la foto se puede procesar; si no, el motivo en español. */
export function validarFoto(archivo: File): string | null {
  if (!archivo.type.startsWith("image/")) {
    return `«${archivo.name}» no es una imagen.`;
  }
  if (archivo.size > MAX_FOTO_ORIGINAL_BYTES) {
    return `«${archivo.name}» pesa ${formatearTamano(archivo.size)}; el máximo es ${formatearTamano(MAX_FOTO_ORIGINAL_BYTES)}.`;
  }
  return null;
}

/** null si el video se puede subir; si no, el motivo en español. */
export function validarVideo(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  // QuickTime: el formato por defecto del iPhone. Mensaje específico.
  if (archivo.type === "video/quicktime" || nombre.endsWith(".mov")) {
    return MENSAJE_VIDEO_MOV;
  }
  // Algunos sistemas no informan el tipo: se acepta si la extensión es .mp4.
  const esMp4 =
    archivo.type === "video/mp4" || (archivo.type === "" && nombre.endsWith(".mp4"));
  if (!esMp4) {
    return "Ese archivo no es un video MP4. Solo se admiten videos en formato MP4.";
  }
  if (archivo.size > MAX_VIDEO_BYTES) {
    return `El video pesa ${formatearTamano(archivo.size)}; el máximo es 50 MB. Recórtalo o expórtalo con menos calidad e inténtalo de nuevo.`;
  }
  return null;
}

/* ── Portada (Fase 5B): bucket site-media ───────────────────────────── */
/*
 * Los medios de las secciones editables de la portada (src/types/portada.ts)
 * viven en otro bucket, "site-media" (lo crea la migración n.º 5), en una
 * carpeta por sección y SIN subcarpetas:
 *     site-media/portada/familias/1763400000000-a1b2c3d4.webp
 *     site-media/portada/entrega/1763400000000-e5f6a7b8.mp4
 * Así la limpieza de archivos que dejan de usarse (src/lib/admin-portada.ts)
 * solo tiene que listar el primer nivel de cada carpeta.
 */

/** Bucket de medios del sitio (portada). Público para lectura. */
export const BUCKET_SITIO = "site-media";

/** Ruta para un archivo nuevo de una sección de la portada. */
export function rutaArchivoPortada(
  clave: "familias" | "entrega",
  extension: "webp" | "jpg" | "mp4",
): string {
  // Mismo esquema que nombreArchivo(): marca de tiempo + 8 caracteres al
  // azar (getRandomValues, que también existe fuera de HTTPS).
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const azar = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `portada/${clave}/${Date.now()}-${azar}.${extension}`;
}

/**
 * Si `url` es un archivo de site-media de esa sección, con la forma exacta
 * que genera rutaArchivoPortada(), devuelve su ruta dentro del bucket; si
 * no, null.
 */
export function rutaPortadaDeUrl(url: string, clave: "familias" | "entrega"): string | null {
  const partes = leerUrlStorage(url);
  if (!partes || partes.bucket !== BUCKET_SITIO) return null;
  const forma = new RegExp(`^portada/${clave}/\\d{10,16}-[a-z0-9]{8}\\.(webp|jpg|mp4)$`);
  return forma.test(partes.ruta) ? partes.ruta : null;
}

/**
 * ¿Es una ruta local de un medio que viene con el sitio (public/videos o
 * public/assets)? Solo minúsculas, números, guiones, puntos y barras, sin
 * "..", y con extensión de imagen o video. Estos archivos están en el
 * repositorio: se pueden usar y desvincular, pero NUNCA se borran.
 */
export function esMedioLocal(url: string): boolean {
  return (
    /^\/(videos|assets)\/[a-z0-9/_.-]+\.(mp4|webp|jpg|jpeg|png)$/.test(url) &&
    !url.includes("..")
  );
}
