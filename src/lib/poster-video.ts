/**
 * src/lib/poster-video.ts — Imagen de portada ("póster") de un video, en el
 * navegador.
 *
 * QUÉ ES
 *   La función generarPoster(archivo): abre un video MP4 elegido por la
 *   administradora, salta a ~1 segundo, copia ese fotograma a un Canvas
 *   (la "pizarra" de dibujo del navegador) y lo exporta como WebP (o JPEG
 *   en Safari).
 *
 * POR QUÉ EXISTE
 *   Los arcos de la portada muestran el póster antes de reproducir el video
 *   y SIEMPRE que la persona pidió reducir el movimiento. Sin póster se
 *   vería un hueco. Generarlo aquí evita pedirle a la dueña que prepare una
 *   imagen aparte para cada video, y no hace falta ffmpeg ni un servidor.
 *   El primer fotograma suele ser negro o un fundido: por eso se toma el
 *   del segundo 1 (o la mitad, si el video dura menos).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usa src/components/admin/portada/CampoMedio.tsx al subir un video.
 *   - Mismo tamaño máximo (LADO_MAXIMO_FOTO, 1600 px) y la misma salida
 *     WebP → JPEG que src/lib/imagen-webp.ts, que explica por qué Safari
 *     necesita el plan B.
 *   - Solo funciona en el navegador.
 *
 * LÍMITE CONOCIDO
 *   Si el navegador no sabe reproducir el video (por ejemplo, un MP4 en
 *   H.265/HEVC en Chrome de Windows), tampoco puede sacar el fotograma: se
 *   lanza un error en español y el video no se sube.
 */
import { LADO_MAXIMO_FOTO } from "@/lib/storage-media";

/** Calidad de compresión del póster (0 a 1). */
const CALIDAD = 0.82;
/** Segundo del video del que se toma el fotograma. */
const SEGUNDO_POSTER = 1;
/** Tiempo máximo de espera para abrir el video, en milisegundos. */
const ESPERA_MAXIMA_MS = 15000;

export const MENSAJE_POSTER =
  "No se pudo leer este video para sacar su imagen de portada. Prueba con otro MP4 (por ejemplo, exportado desde el celular en «Más compatible»).";

export type PosterGenerado = {
  blob: Blob;
  tipo: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
};

/** Espera un evento del video, con tiempo máximo y error si falla. */
function esperar(video: HTMLVideoElement, evento: "loadeddata" | "seeked"): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const limpiar = () => {
      video.removeEventListener(evento, alOcurrir);
      video.removeEventListener("error", alFallar);
      window.clearTimeout(temporizador);
    };
    const alOcurrir = () => {
      limpiar();
      resolver();
    };
    const alFallar = () => {
      limpiar();
      rechazar(new Error(MENSAJE_POSTER));
    };
    const temporizador = window.setTimeout(alFallar, ESPERA_MAXIMA_MS);
    video.addEventListener(evento, alOcurrir, { once: true });
    video.addEventListener("error", alFallar, { once: true });
  });
}

/** canvas.toBlob() con promesa. */
function exportar(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((resolver) => canvas.toBlob(resolver, tipo, CALIDAD));
}

/** Genera el póster de un video. Lanza un Error con mensaje en español. */
export async function generarPoster(archivo: File): Promise<PosterGenerado> {
  const url = URL.createObjectURL(archivo);
  const video = document.createElement("video");
  // muted + playsInline: el iPhone no deja cargar un video con sonido sin
  // un toque de la persona, ni fuera de pantalla completa.
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await esperar(video, "loadeddata");
    const duracion = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.min(SEGUNDO_POSTER, duracion / 2 || 0);
    await esperar(video, "seeked");

    const ancho = video.videoWidth;
    const alto = video.videoHeight;
    if (!ancho || !alto) throw new Error(MENSAJE_POSTER);

    const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(ancho, alto));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error(MENSAJE_POSTER);
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

    let blob = await exportar(canvas, "image/webp");
    let tipo: PosterGenerado["tipo"] = "image/webp";
    // Safari no genera WebP desde un Canvas (devuelve PNG): JPEG.
    if (!blob || blob.type !== "image/webp") {
      blob = await exportar(canvas, "image/jpeg");
      tipo = "image/jpeg";
    }
    if (!blob) throw new Error(MENSAJE_POSTER);
    return { blob, tipo, extension: tipo === "image/webp" ? "webp" : "jpg" };
  } finally {
    video.removeAttribute("src");
    video.load(); // libera el archivo en memoria
    URL.revokeObjectURL(url);
  }
}
