/**
 * src/lib/imagen-webp.ts — Convierte una foto a WebP en el navegador.
 *
 * QUÉ ES
 *   La función convertirAWebp(archivo): abre la foto elegida, la reduce
 *   para que su lado más largo mida como mucho 1600 px y la vuelve a
 *   guardar en formato WebP con calidad 0,85, usando el Canvas del
 *   navegador (la "pizarra" de dibujo que traen todos los navegadores).
 *
 * POR QUÉ EXISTE
 *   Una foto de teléfono pesa 3–8 MB y mide 4000 px o más. La tienda
 *   nunca la muestra a más de ~800 px, así que subirla tal cual solo
 *   gasta espacio en Storage y datos móviles de los clientes. Convertida,
 *   suele quedar en 100–400 KB sin diferencia visible.
 *   Se hace en el navegador (y no en el servidor) por tres motivos: el
 *   archivo pesado nunca viaja por internet; no hace falta instalar una
 *   librería de imágenes en el servidor; y el Canvas ya sabe leer los
 *   formatos que el propio navegador sabe mostrar.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/components/admin/GestorMedia.tsx antes de subir cada foto.
 *   - LADO_MAXIMO_FOTO viene de src/lib/storage-media.ts.
 *   - Solo funciona en el navegador (usa createImageBitmap, Image y
 *     document.createElement("canvas")).
 *
 * DETALLES QUE IMPORTAN
 *   - ORIENTACIÓN. Los teléfonos guardan muchas fotos "de lado" y anotan
 *     en el archivo (en los datos EXIF — Exchangeable Image File Format)
 *     cómo hay que girarlas. createImageBitmap con
 *     imageOrientation: "from-image" aplica ese giro; sin él, algunas fotos
 *     verticales saldrían acostadas.
 *   - SAFARI. Safari (iPhone, iPad, Mac) sabe MOSTRAR WebP pero no sabe
 *     GENERARLO desde un Canvas: si se le pide WebP, devuelve un PNG
 *     enorme. Por eso se comprueba el tipo del resultado y, si no es WebP,
 *     se genera un JPEG con la misma calidad. El bucket admite ambos
 *     (migración n.º 4).
 *   - HEIC. Algunos iPhone guardan las fotos en HEIC, que Chrome y otros
 *     navegadores no saben abrir. En ese caso se lanza un error con un
 *     mensaje en español que propone una alternativa.
 *   - Nunca se AGRANDA una foto pequeña: solo se reduce.
 */
import { LADO_MAXIMO_FOTO } from "@/lib/storage-media";

/** Calidad de compresión (0 a 1). 0,85: buen equilibrio peso/nitidez. */
const CALIDAD = 0.85;

/** Mensaje cuando el navegador no consigue abrir la foto. */
export const MENSAJE_FOTO_ILEGIBLE =
  "No se pudo leer esta foto. Prueba con una captura de pantalla o una foto en JPG.";

/** Resultado de la conversión. */
export type FotoConvertida = {
  /** El archivo listo para subir. */
  blob: Blob;
  /** Tipo real del resultado: WebP, o JPEG en Safari. */
  tipo: "image/webp" | "image/jpeg";
  /** Extensión que debe llevar el nombre del archivo. */
  extension: "webp" | "jpg";
  /** Peso de la foto original y del resultado, en bytes. */
  tamanoOriginal: number;
  tamanoFinal: number;
  /** Medidas finales, en píxeles. */
  ancho: number;
  alto: number;
};

/** Imagen ya abierta, lista para dibujar en el Canvas. */
type ImagenAbierta = {
  fuente: CanvasImageSource;
  ancho: number;
  alto: number;
  /** Libera la memoria que ocupa la imagen abierta. */
  liberar: () => void;
};

/**
 * Abre la foto. Primero con createImageBitmap (rápido y respeta la
 * orientación); si el navegador no lo admite o falla, con un elemento
 * <img>, que en los navegadores actuales también respeta la orientación.
 */
async function abrir(archivo: File): Promise<ImagenAbierta> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(archivo, {
        imageOrientation: "from-image",
      });
      return {
        fuente: bitmap,
        ancho: bitmap.width,
        alto: bitmap.height,
        liberar: () => bitmap.close(),
      };
    } catch {
      // Sigue con el plan B.
    }
  }

  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.src = url;
    // decode() espera a que la imagen esté descodificada y lanza un error
    // si el navegador no entiende el formato (por ejemplo, HEIC).
    await img.decode();
    return {
      fuente: img,
      ancho: img.naturalWidth,
      alto: img.naturalHeight,
      liberar: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(MENSAJE_FOTO_ILEGIBLE);
  }
}

/** canvas.toBlob() con promesa en lugar de función de retorno. */
function exportar(
  canvas: HTMLCanvasElement,
  tipo: string,
  calidad: number,
): Promise<Blob | null> {
  return new Promise((resolver) => canvas.toBlob(resolver, tipo, calidad));
}

/**
 * Convierte la foto a WebP (o JPEG en Safari), con el lado más largo como
 * mucho de LADO_MAXIMO_FOTO píxeles.
 * Lanza un Error con mensaje en español si no se puede.
 */
export async function convertirAWebp(archivo: File): Promise<FotoConvertida> {
  const imagen = await abrir(archivo);

  try {
    if (imagen.ancho === 0 || imagen.alto === 0) {
      throw new Error(MENSAJE_FOTO_ILEGIBLE);
    }

    // Escala ≤ 1: nunca se agranda.
    const escala = Math.min(
      1,
      LADO_MAXIMO_FOTO / Math.max(imagen.ancho, imagen.alto),
    );
    const ancho = Math.max(1, Math.round(imagen.ancho * escala));
    const alto = Math.max(1, Math.round(imagen.alto * escala));

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error(MENSAJE_FOTO_ILEGIBLE);

    // Suavizado de alta calidad al reducir (evita bordes dentados).
    contexto.imageSmoothingEnabled = true;
    contexto.imageSmoothingQuality = "high";
    // Fondo blanco: si la foto es un PNG con zonas transparentes y hay que
    // pasarla a JPEG (Safari), lo transparente saldría negro. Las fotos de
    // producto se muestran sobre blanco, así que se ve igual.
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(imagen.fuente, 0, 0, ancho, alto);

    let blob = await exportar(canvas, "image/webp", CALIDAD);
    let tipo: FotoConvertida["tipo"] = "image/webp";

    // Safari devuelve PNG cuando se le pide WebP: entonces, JPEG.
    if (!blob || blob.type !== "image/webp") {
      blob = await exportar(canvas, "image/jpeg", CALIDAD);
      tipo = "image/jpeg";
    }
    if (!blob) throw new Error(MENSAJE_FOTO_ILEGIBLE);

    return {
      blob,
      tipo,
      extension: tipo === "image/webp" ? "webp" : "jpg",
      tamanoOriginal: archivo.size,
      tamanoFinal: blob.size,
      ancho,
      alto,
    };
  } finally {
    imagen.liberar();
  }
}
