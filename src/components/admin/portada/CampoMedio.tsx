"use client";

/**
 * src/components/admin/portada/CampoMedio.tsx — Video o imagen de un arco
 * de la portada.
 *
 * QUÉ ES
 *   El control del editor de la portada que muestra el medio actual dentro
 *   de un arco (como en la tienda) y permite cambiarlo por una imagen o un
 *   video subidos desde el computador o el celular.
 *
 * POR QUÉ EXISTE
 *   Para que la dueña cambie los videos e imágenes de la portada sin pedir
 *   ayuda. Sigue el mismo camino que las fotos de perfumes (Fase 3C):
 *     - IMAGEN: se convierte a WebP de hasta 1600 px en el navegador
 *       (src/lib/imagen-webp.ts) y se sube.
 *     - VIDEO: MP4 de hasta 50 MB. Antes de subirlo se GENERA SOLO su
 *       póster (src/lib/poster-video.ts) y se suben los dos. Un .mov se
 *       rechaza con el mismo mensaje que en la Fase 3C.
 *   Los archivos van al bucket site-media, en portada/<sección>/
 *   (rutaArchivoPortada de src/lib/storage-media.ts).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan EditorFamilias.tsx (uno por tarjeta) y EditorEntrega.tsx.
 *   - Sube con el cliente de navegador con sesión
 *     (src/lib/supabase-browser.ts): las políticas de la migración n.º 5
 *     exigen is_admin().
 *   - NO guarda en la base de datos: avisa del medio nuevo con `onCambio` y
 *     el cambio se guarda con el botón "Guardar" de la sección.
 *   - Vista previa con MedioArco (src/components/home/), el mismo
 *     componente de la tienda: lo que se ve aquí es lo que se publica.
 *
 * ARCHIVOS QUE SE QUEDAN SIN USO
 *   Si se sube un archivo y luego otro antes de guardar, el primero ya no
 *   lo usa nadie: se borra aquí mismo, siempre que no sea el que estaba
 *   guardado (`medioGuardado`), que sigue en la tienda hasta guardar. Lo
 *   demás (lo guardado que se reemplaza, subidas abandonadas) lo limpia el
 *   servidor al guardar (src/lib/admin-portada.ts).
 */
import { useState } from "react";
import MedioArco from "@/components/home/MedioArco";
import { avisoError, botonContorno } from "@/components/admin/estilos";
import { convertirAWebp } from "@/lib/imagen-webp";
import { generarPoster } from "@/lib/poster-video";
import {
  BUCKET_SITIO,
  formatearTamano,
  rutaArchivoPortada,
  rutaPortadaDeUrl,
  validarFoto,
  validarVideo,
} from "@/lib/storage-media";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ClavePortada, MedioPortada } from "@/types/portada";

type CampoMedioProps = {
  clave: ClavePortada;
  /** Prefijo único para los id de los campos. */
  id: string;
  /** Medio que se está editando. */
  medio: MedioPortada;
  /** Medio guardado en la base de datos (no se borra al reemplazarlo). */
  medioGuardado: MedioPortada;
  onCambio: (medio: MedioPortada) => void;
  /** Avisa de que hay (o ya no hay) una subida en curso. */
  onOcupado: (ocupado: boolean) => void;
  deshabilitado?: boolean;
};

/** Traduce los errores de subida de Supabase Storage. */
function traducirError(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes("size") || texto.includes("too large")) return "El archivo supera el tamaño máximo (50 MB).";
  if (texto.includes("mime") || texto.includes("type")) return "Ese tipo de archivo no está permitido.";
  if (texto.includes("bucket not found")) return "Falta el bucket site-media: ejecuta la migración n.º 5.";
  if (texto.includes("row-level security") || texto.includes("unauthorized")) {
    return "Tu cuenta no tiene permiso para subir archivos. Cierra sesión y vuelve a entrar.";
  }
  return "No se pudo subir el archivo. Revisa la conexión e inténtalo de nuevo.";
}

/** Sube un archivo a site-media y devuelve su URL pública. */
async function subir(ruta: string, cuerpo: Blob, tipo: string): Promise<string> {
  const almacen = getSupabaseBrowserClient().storage.from(BUCKET_SITIO);
  const { error } = await almacen.upload(ruta, cuerpo, {
    contentType: tipo,
    upsert: false,
    cacheControl: "31536000", // nombre único: se puede guardar en caché un año
  });
  if (error) throw new Error(traducirError(error.message));
  return almacen.getPublicUrl(ruta).data.publicUrl;
}

/** Borra archivos de site-media sin quejarse si falla (limpieza). */
async function descartar(rutas: (string | null)[]): Promise<void> {
  const validas = rutas.filter((r): r is string => Boolean(r));
  if (validas.length === 0) return;
  try {
    await getSupabaseBrowserClient().storage.from(BUCKET_SITIO).remove(validas);
  } catch {
    // Si falla, el servidor lo limpiará más adelante (subida abandonada).
  }
}

/** Rutas en site-media de un medio (las locales no tienen). */
function rutasDe(medio: MedioPortada, clave: ClavePortada): string[] {
  const urls = medio.tipo === "video" ? [medio.src, medio.poster] : [medio.src];
  return urls.map((u) => rutaPortadaDeUrl(u, clave)).filter((r): r is string => r !== null);
}

export default function CampoMedio({
  clave,
  id,
  medio,
  medioGuardado,
  onCambio,
  onOcupado,
  deshabilitado = false,
}: CampoMedioProps) {
  const [estado, setEstado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  function marcarOcupado(valor: boolean) {
    setOcupado(valor);
    onOcupado(valor);
  }

  /** Sustituye el medio y borra el anterior si era una subida sin guardar. */
  function reemplazar(nuevo: MedioPortada) {
    const guardadas = new Set(rutasDe(medioGuardado, clave));
    const sobrantes = rutasDe(medio, clave).filter((r) => !guardadas.has(r));
    void descartar(sobrantes);
    onCambio(nuevo);
  }

  async function subirImagen(archivo: File) {
    setError(null);
    const invalida = validarFoto(archivo);
    if (invalida) return setError(invalida);

    marcarOcupado(true);
    let ruta: string | null = null;
    try {
      setEstado("Convirtiendo la imagen…");
      const foto = await convertirAWebp(archivo);
      setEstado("Subiendo…");
      ruta = rutaArchivoPortada(clave, foto.extension);
      const url = await subir(ruta, foto.blob, foto.tipo);
      reemplazar({ tipo: "imagen", src: url });
      setEstado(
        `Imagen lista (${formatearTamano(foto.tamanoOriginal)} → ${formatearTamano(foto.tamanoFinal)}). Pulsa «Guardar» para publicarla.`,
      );
    } catch (fallo) {
      await descartar([ruta]);
      setEstado(null);
      setError(fallo instanceof Error ? fallo.message : "No se pudo subir la imagen.");
    }
    marcarOcupado(false);
  }

  async function subirVideo(archivo: File) {
    setError(null);
    const invalido = validarVideo(archivo);
    if (invalido) return setError(invalido);

    marcarOcupado(true);
    let rutaVideo: string | null = null;
    let rutaPoster: string | null = null;
    try {
      // Primero el póster: si el navegador no sabe leer el video, mejor
      // enterarse antes de subir hasta 50 MB.
      setEstado("Preparando la imagen de portada del video…");
      const poster = await generarPoster(archivo);
      setEstado("Subiendo el video… no cierres esta página.");
      rutaVideo = rutaArchivoPortada(clave, "mp4");
      const src = await subir(rutaVideo, archivo, "video/mp4");
      rutaPoster = rutaArchivoPortada(clave, poster.extension);
      const urlPoster = await subir(rutaPoster, poster.blob, poster.tipo);
      reemplazar({ tipo: "video", src, poster: urlPoster });
      setEstado("Video listo, con su imagen de portada. Pulsa «Guardar» para publicarlo.");
    } catch (fallo) {
      await descartar([rutaVideo, rutaPoster]);
      setEstado(null);
      setError(fallo instanceof Error ? fallo.message : "No se pudo subir el video.");
    }
    marcarOcupado(false);
  }

  const bloqueado = deshabilitado || ocupado;

  return (
    <div className="flex flex-wrap items-start gap-4">
      {/* Vista previa: mismo arco y mismo encuadre que la tienda. */}
      <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-t-full border border-admin-border bg-admin-bg sm:w-40">
        <MedioArco medio={medio} sizes="160px" />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm text-admin-muted">
          Ahora: <strong className="font-medium text-admin-text">{medio.tipo === "video" ? "video" : "imagen"}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Cada botón es un <label> unido a un <input type="file"> oculto:
              abre el selector de archivos sin JavaScript extra. El input
              sigue siendo enfocable con Tab; con peer-focus-visible su
              etiqueta muestra el anillo de foco. Cada pareja va en su propio
              <span> para que el foco de un input no ilumine la otra
              etiqueta. */}
          <span className="relative">
            <input
              id={`${id}-imagen`}
              type="file"
              accept="image/*"
              disabled={bloqueado}
              className="peer sr-only"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                if (archivo) void subirImagen(archivo);
              }}
            />
            <label
              htmlFor={`${id}-imagen`}
              className={`${botonContorno} cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-admin-gold-text ${bloqueado ? "pointer-events-none opacity-60" : ""}`}
            >
              Subir imagen
            </label>
          </span>
          <span className="relative">
            <input
              id={`${id}-video`}
              type="file"
              accept="video/mp4"
              disabled={bloqueado}
              className="peer sr-only"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                if (archivo) void subirVideo(archivo);
              }}
            />
            <label
              htmlFor={`${id}-video`}
              className={`${botonContorno} cursor-pointer peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-admin-gold-text ${bloqueado ? "pointer-events-none opacity-60" : ""}`}
            >
              Subir video (MP4, máx. 50 MB)
            </label>
          </span>
        </div>
        <p className="text-xs leading-relaxed text-admin-muted">
          Mejor vertical, de 10 a 30 segundos. La esquina inferior derecha queda
          recortada en la tienda.
        </p>
        {estado && (
          <p role="status" className="text-sm text-admin-text">
            {estado}
          </p>
        )}
        {error && (
          <p role="alert" className={avisoError}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
