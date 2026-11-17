"use client";

/**
 * src/components/admin/GestorMedia.tsx — Fotos y video de un perfume.
 *
 * QUÉ ES
 *   La sección "Fotos y video" del formulario de edición de un perfume
 *   (/admin/perfumes/[id]). Permite:
 *     - agregar fotos (botón o arrastrando archivos), que se convierten a
 *       WebP y se reducen en el propio navegador antes de subirlas;
 *     - reordenarlas (arrastrando, o con botones de mover y "Hacer
 *       principal") y quitarlas;
 *     - subir, reemplazar y quitar un video MP4.
 *
 * POR QUÉ EXISTE
 *   Para que la dueña ponga las fotos reales de cada perfume desde el
 *   panel, también desde el teléfono, sin tocar código ni el Dashboard de
 *   Supabase. 86 de los 120 perfumes iniciales usan todavía la imagen
 *   genérica.
 *
 * CÓMO FUNCIONA (y por qué se guarda "al instante")
 *   1. El navegador convierte la foto (src/lib/imagen-webp.ts).
 *   2. El navegador la SUBE directamente a Supabase Storage con la sesión
 *      de la administradora (src/lib/supabase-browser.ts). Un archivo
 *      grande no pasa por nuestro servidor.
 *   3. Una Server Action (src/app/admin/perfumes/media-actions.ts) apunta
 *      la URL en la fila del perfume, tras comprobar permiso y validarla.
 *   Cada foto o video se guarda en cuanto termina de subir, sin esperar al
 *   botón "Guardar" del formulario. Así un archivo subido nunca queda
 *   "colgando" sin estar apuntado en ningún perfume. Por la misma razón
 *   el formulario principal no envía ni pisa imagen, imagenes ni
 *   video_url (no tienen campo en él, y guardarPerfume() no los toca).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo crea src/app/admin/(panel)/perfumes/[id]/page.tsx y se dibuja
 *     DENTRO de FormularioPerfume (prop `seccionMedia`). Como vive dentro
 *     de un <form>, todos sus botones son type="button" y sus <input
 *     type="file"> no tienen `name`: nada de esto se envía con "Guardar".
 *   - Reglas comunes (buckets, límites, nombres de archivo, validación):
 *     src/lib/storage-media.ts.
 *   - Estilos: src/components/admin/estilos.ts (tema claro del panel).
 *
 * ACCESIBILIDAD Y USO TÁCTIL
 *   - Reordenar no exige arrastrar: hay botones "Mover a la izquierda/
 *     derecha" y "Hacer principal", con aria-label, de 44 px.
 *   - Los cambios de orden se anuncian a los lectores de pantalla en una
 *     región aria-live; los errores, con role="alert".
 *   - Mientras hay una operación en curso, los botones se desactivan y, si
 *     se intenta cerrar la página, el navegador pide confirmación.
 */
import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  guardarFotos,
  guardarVideo,
  quitarFoto,
  type ResultadoMedia,
} from "@/app/admin/perfumes/media-actions";
import {
  avisoError,
  avisoInfo,
  ayuda,
  botonContorno,
  botonPeligro,
} from "@/components/admin/estilos";
import { ChevronDownIcon } from "@/components/ui/icons";
import { convertirAWebp } from "@/lib/imagen-webp";
import { PLACEHOLDER_IMAGE } from "@/lib/site";
import {
  BUCKET_FOTOS,
  BUCKET_VIDEOS,
  MAX_FOTOS,
  esRutaLocal,
  formatearTamano,
  nombreArchivo,
  validarFoto,
  validarVideo,
  type BucketProducto,
} from "@/lib/storage-media";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/** Estado de cada archivo de la última tanda de fotos. */
type EstadoSubida = "esperando" | "convirtiendo" | "subiendo" | "lista" | "error";

type Subida = {
  /** Clave única para la lista. */
  clave: string;
  /** Nombre del archivo original, para que se reconozca. */
  nombre: string;
  estado: EstadoSubida;
  /** "4,1 MB → 210 KB" al terminar, o el motivo del error. */
  detalle: string | null;
};

/** Texto visible de cada estado. */
const TEXTO_ESTADO: Record<EstadoSubida, string> = {
  esperando: "En espera…",
  convirtiendo: "Convirtiendo…",
  subiendo: "Subiendo…",
  lista: "Lista",
  error: "Error",
};

/** Tipo de dato que identifica "arrastrar una foto de la lista" (no un archivo). */
const TIPO_ARRASTRE = "application/x-isabelee-foto";

const ERROR_CONEXION =
  "Se perdió la conexión con el servidor. Recarga la página e inténtalo de nuevo.";

/** Clases de los botones pequeños de cada foto (44 × 44 px). */
const botonIcono =
  "inline-flex h-11 w-11 items-center justify-center rounded-lg border border-admin-border-strong bg-admin-surface text-admin-text transition-colors duration-200 hover:border-admin-gold-text hover:text-admin-gold-text disabled:cursor-not-allowed disabled:opacity-40";

/* ── Utilidades ─────────────────────────────────────────────────────── */

/**
 * Traduce los errores de subida de Supabase Storage. Los límites de tamaño
 * y tipo los impone el propio bucket (migración n.º 4); el permiso, las
 * políticas de la migración n.º 2.
 */
function traducirErrorSubida(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  if (texto.includes("size") || texto.includes("too large")) {
    return "El archivo supera el tamaño máximo permitido.";
  }
  if (texto.includes("mime") || texto.includes("type")) {
    return "Ese tipo de archivo no está permitido.";
  }
  if (texto.includes("row-level security") || texto.includes("unauthorized")) {
    return "Tu cuenta no tiene permiso para subir archivos. Cierra sesión y vuelve a entrar.";
  }
  return "No se pudo subir el archivo. Revisa la conexión e inténtalo de nuevo.";
}

/** Sube un archivo y devuelve su URL pública. Lanza Error en español. */
async function subir(
  bucket: BucketProducto,
  ruta: string,
  cuerpo: Blob,
  tipo: string,
): Promise<string> {
  const almacen = getSupabaseBrowserClient().storage.from(bucket);
  const { error } = await almacen.upload(ruta, cuerpo, {
    contentType: tipo,
    upsert: false, // nunca sobrescribir: cada archivo tiene nombre único
    // El nombre nunca se reutiliza, así que el navegador y la CDN (Content
    // Delivery Network) pueden guardarlo en caché un año.
    cacheControl: "31536000",
  });
  if (error) throw new Error(traducirErrorSubida(error.message));
  return almacen.getPublicUrl(ruta).data.publicUrl;
}

/**
 * Borra desde el navegador un archivo recién subido que no llegó a
 * guardarse en el perfume. El servidor ya lo intenta cuando falla el
 * guardado; esto cubre el caso en que ni siquiera se pudo hablar con él.
 * Borrar un archivo que ya no existe no da error.
 */
async function descartar(bucket: BucketProducto, ruta: string): Promise<void> {
  try {
    await getSupabaseBrowserClient().storage.from(bucket).remove([ruta]);
  } catch {
    // Si tampoco esto funciona, queda un archivo huérfano en la carpeta
    // del perfume; se limpiará al eliminar el perfume.
  }
}

/** Llama a una Server Action convirtiendo un fallo de red en un error legible. */
async function llamar(accion: () => Promise<ResultadoMedia>): Promise<ResultadoMedia> {
  try {
    return await accion();
  } catch {
    return { ok: false, error: ERROR_CONEXION };
  }
}

/* ── Componente ─────────────────────────────────────────────────────── */

type GestorMediaProps = {
  perfumeId: number;
  nombre: string;
  /** Fotos guardadas, en orden (la primera es la principal). */
  fotosIniciales: string[];
  videoInicial: string | null;
};

export default function GestorMedia({
  perfumeId,
  nombre,
  fotosIniciales,
  videoInicial,
}: GestorMediaProps) {
  const [fotos, setFotos] = useState<string[]>(fotosIniciales);
  const [video, setVideo] = useState<string | null>(videoInicial);

  /** true mientras hay cualquier operación en curso. */
  const [ocupado, setOcupado] = useState(false);
  const [subiendoVideo, setSubiendoVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Mensaje para lectores de pantalla tras reordenar. */
  const [anuncio, setAnuncio] = useState("");
  const [subidas, setSubidas] = useState<Subida[]>([]);

  /** Foto cuya confirmación de "Quitar" está abierta. */
  const [confirmandoFoto, setConfirmandoFoto] = useState<string | null>(null);
  const [confirmandoVideo, setConfirmandoVideo] = useState(false);

  /** Índice de la foto que se está arrastrando para reordenar. */
  const [arrastrada, setArrastrada] = useState<number | null>(null);
  /** true mientras se arrastran ARCHIVOS sobre la zona de fotos. */
  const [zonaActiva, setZonaActiva] = useState(false);

  const entradaFotos = useRef<HTMLInputElement>(null);
  const entradaVideo = useRef<HTMLInputElement>(null);

  // Avisar antes de cerrar o recargar la página con una subida en marcha:
  // se perdería el archivo a medio subir.
  useEffect(() => {
    if (!ocupado) return;
    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [ocupado]);

  /** Aplica a la pantalla lo que devolvió el servidor. */
  function aplicar(resultado: ResultadoMedia): boolean {
    if (!resultado.ok) {
      setError(resultado.error);
      return false;
    }
    setFotos(resultado.fotos);
    setVideo(resultado.video);
    if (resultado.aviso) setAviso(resultado.aviso);
    return true;
  }

  /** Cambia el estado de un archivo de la tanda en curso. */
  function marcar(clave: string, estado: EstadoSubida, detalle: string | null = null) {
    setSubidas((actual) =>
      actual.map((s) => (s.clave === clave ? { ...s, estado, detalle } : s)),
    );
  }

  /* ── Agregar fotos ─────────────────────────────────────────────── */

  async function agregarFotos(archivos: File[]) {
    if (ocupado || archivos.length === 0) return;
    setError(null);
    setAviso(null);

    const libres = MAX_FOTOS - fotos.length;
    if (libres <= 0) {
      setError(
        `Este perfume ya tiene ${MAX_FOTOS} fotos, el máximo. Quita alguna para agregar otras.`,
      );
      return;
    }
    const tanda = archivos.slice(0, libres);
    if (archivos.length > libres) {
      setAviso(
        `Solo caben ${libres} foto(s) más (máximo ${MAX_FOTOS} por perfume). Se agregarán las primeras ${libres}.`,
      );
    }

    const lote: Subida[] = tanda.map((archivo, i) => ({
      clave: `${Date.now()}-${i}`,
      nombre: archivo.name,
      estado: "esperando",
      detalle: null,
    }));
    setSubidas(lote);
    setOcupado(true);

    // Una tras otra (no en paralelo): así cada guardado parte de la lista
    // que dejó el anterior y ninguna foto pisa a otra.
    let lista = fotos;
    for (let i = 0; i < tanda.length; i += 1) {
      const archivo = tanda[i];
      const { clave } = lote[i];

      const invalida = validarFoto(archivo);
      if (invalida) {
        marcar(clave, "error", invalida);
        continue;
      }

      let rutaSubida: string | null = null;
      try {
        marcar(clave, "convirtiendo");
        const foto = await convertirAWebp(archivo);

        marcar(clave, "subiendo");
        rutaSubida = nombreArchivo(perfumeId, foto.extension);
        const url = await subir(BUCKET_FOTOS, rutaSubida, foto.blob, foto.tipo);

        const resultado = await llamar(() => guardarFotos(perfumeId, [...lista, url]));
        if (!resultado.ok) {
          await descartar(BUCKET_FOTOS, rutaSubida);
          marcar(clave, "error", resultado.error);
          continue;
        }
        lista = resultado.fotos;
        aplicar(resultado);
        marcar(
          clave,
          "lista",
          `${formatearTamano(foto.tamanoOriginal)} → ${formatearTamano(foto.tamanoFinal)}`,
        );
      } catch (fallo) {
        if (rutaSubida) await descartar(BUCKET_FOTOS, rutaSubida);
        marcar(
          clave,
          "error",
          fallo instanceof Error ? fallo.message : "No se pudo procesar la foto.",
        );
      }
    }

    setOcupado(false);
  }

  /* ── Reordenar y quitar fotos ──────────────────────────────────── */

  /** Guarda un orden nuevo. Optimista: se ve al instante y se deshace si falla. */
  async function guardarOrden(nueva: string[], mensaje: string) {
    const anterior = fotos;
    setError(null);
    setFotos(nueva);
    setOcupado(true);
    const resultado = await llamar(() => guardarFotos(perfumeId, nueva));
    if (aplicar(resultado)) {
      setAnuncio(mensaje);
    } else {
      setFotos(anterior);
    }
    setOcupado(false);
  }

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= fotos.length || desde === hasta) return;
    const nueva = [...fotos];
    const [foto] = nueva.splice(desde, 1);
    nueva.splice(hasta, 0, foto);
    void guardarOrden(
      nueva,
      hasta === 0
        ? "Foto convertida en principal."
        : `Foto movida a la posición ${hasta + 1} de ${nueva.length}.`,
    );
  }

  async function quitar(url: string) {
    setConfirmandoFoto(null);
    setError(null);
    setAviso(null);
    setOcupado(true);
    const resultado = await llamar(() => quitarFoto(perfumeId, url));
    if (aplicar(resultado)) setAnuncio("Foto quitada.");
    setOcupado(false);
  }

  /* ── Arrastrar y soltar (escritorio) ───────────────────────────── */

  /** ¿Lo que se arrastra son archivos del ordenador? */
  const sonArchivos = (evento: DragEvent) =>
    Array.from(evento.dataTransfer.types).includes("Files");

  function alArrastrarSobreZona(evento: DragEvent) {
    if (ocupado || !sonArchivos(evento)) return;
    evento.preventDefault(); // sin esto, el navegador abriría el archivo
    evento.dataTransfer.dropEffect = "copy";
    setZonaActiva(true);
  }

  function alSoltarEnZona(evento: DragEvent) {
    setZonaActiva(false);
    if (ocupado || !sonArchivos(evento)) return;
    evento.preventDefault();
    void agregarFotos(Array.from(evento.dataTransfer.files));
  }

  function alSoltarSobreFoto(evento: DragEvent, destino: number) {
    if (sonArchivos(evento)) return; // lo gestiona la zona
    evento.preventDefault();
    evento.stopPropagation();
    const origen = arrastrada;
    setArrastrada(null);
    if (origen !== null && !ocupado) mover(origen, destino);
  }

  /* ── Video ─────────────────────────────────────────────────────── */

  async function subirVideo(archivo: File) {
    if (ocupado) return;
    setError(null);
    setAviso(null);

    const invalido = validarVideo(archivo);
    if (invalido) {
      setError(invalido);
      return;
    }

    setOcupado(true);
    setSubiendoVideo(true);
    const ruta = nombreArchivo(perfumeId, "mp4");
    try {
      // Tipo explícito: algunos sistemas no lo informan, y el bucket solo
      // acepta video/mp4 (migración n.º 4).
      const url = await subir(BUCKET_VIDEOS, ruta, archivo, "video/mp4");
      const resultado = await llamar(() => guardarVideo(perfumeId, url));
      if (aplicar(resultado)) {
        setAnuncio("Video guardado.");
      } else {
        await descartar(BUCKET_VIDEOS, ruta);
      }
    } catch (fallo) {
      await descartar(BUCKET_VIDEOS, ruta);
      setError(fallo instanceof Error ? fallo.message : "No se pudo subir el video.");
    }
    setSubiendoVideo(false);
    setOcupado(false);
  }

  async function quitarVideo() {
    setConfirmandoVideo(false);
    setError(null);
    setAviso(null);
    setOcupado(true);
    const resultado = await llamar(() => guardarVideo(perfumeId, null));
    if (aplicar(resultado)) setAnuncio("Video quitado.");
    setOcupado(false);
  }

  /* ── Dibujo ────────────────────────────────────────────────────── */

  return (
    <div className="mt-4 space-y-6">
      <p className={avisoInfo}>Las fotos y el video se guardan al instante.</p>

      {error && (
        <p role="alert" className={avisoError}>
          {error}
        </p>
      )}
      {aviso && (
        <p role="status" className={avisoInfo}>
          {aviso}
        </p>
      )}
      {/* Anuncios para lectores de pantalla (invisible en pantalla). */}
      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {/* ── Fotos ── */}
      <div
        onDragOver={alArrastrarSobreZona}
        onDragLeave={() => setZonaActiva(false)}
        onDrop={alSoltarEnZona}
        className={`rounded-lg transition-colors duration-200 ${
          zonaActiva ? "bg-admin-bg outline-2 outline-dashed outline-admin-gold-text" : ""
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-medium text-admin-text">
              Fotos{" "}
              <span className="font-normal text-admin-muted">
                ({fotos.length} de {MAX_FOTOS})
              </span>
            </h3>
            <p className={ayuda}>La primera foto es la que aparece en el catálogo.</p>
          </div>
          <button
            type="button"
            onClick={() => entradaFotos.current?.click()}
            disabled={ocupado || fotos.length >= MAX_FOTOS}
            className={botonContorno}
          >
            Agregar fotos
          </button>
          {/* Sin `name`: este campo no viaja con el formulario principal. */}
          <input
            ref={entradaFotos}
            type="file"
            accept="image/*"
            multiple
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={(evento) => {
              const elegidos = Array.from(evento.target.files ?? []);
              // Vaciar el campo permite volver a elegir el mismo archivo.
              evento.target.value = "";
              void agregarFotos(elegidos);
            }}
          />
        </div>

        {/* Solo en dispositivos con ratón: en el móvil no se arrastran archivos. */}
        <p className="mt-2 hidden text-sm text-admin-muted [@media(pointer:fine)]:block">
          También puedes arrastrar fotos desde tu computador y soltarlas aquí. Se
          convierten a WebP y se reducen antes de subirlas.
        </p>

        {/* Progreso de la última tanda */}
        {subidas.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-sm" aria-label="Progreso de las fotos">
            {subidas.map((subida) => (
              <li
                key={subida.clave}
                className="flex flex-wrap items-baseline justify-between gap-x-3 rounded border border-admin-border bg-admin-surface px-3 py-2"
              >
                <span className="min-w-0 break-all text-admin-text">{subida.nombre}</span>
                <span
                  className={
                    subida.estado === "error"
                      ? "font-medium text-admin-error"
                      : subida.estado === "lista"
                        ? "font-medium text-admin-gold-text"
                        : "text-admin-muted"
                  }
                >
                  {TEXTO_ESTADO[subida.estado]}
                  {subida.detalle ? ` · ${subida.detalle}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        {fotos.length === 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-admin-border bg-admin-surface p-4">
            <Image
              src={PLACEHOLDER_IMAGE}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 rounded border border-admin-border bg-white object-contain p-1"
            />
            <p className="text-sm text-admin-muted">Este perfume usa la imagen genérica.</p>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {fotos.map((url, indice) => {
              const local = esRutaLocal(url);
              return (
                <li
                  key={url}
                  draggable={!ocupado}
                  onDragStart={(evento) => {
                    setArrastrada(indice);
                    evento.dataTransfer.effectAllowed = "move";
                    evento.dataTransfer.setData(TIPO_ARRASTRE, String(indice));
                  }}
                  onDragEnd={() => setArrastrada(null)}
                  onDragOver={(evento) => {
                    if (arrastrada !== null && !sonArchivos(evento)) {
                      evento.preventDefault();
                      evento.dataTransfer.dropEffect = "move";
                    }
                  }}
                  onDrop={(evento) => alSoltarSobreFoto(evento, indice)}
                  className={`rounded-lg border bg-admin-surface p-2 ${
                    arrastrada === indice
                      ? "border-admin-gold-text opacity-50"
                      : "border-admin-border"
                  } ${ocupado ? "" : "cursor-grab"}`}
                >
                  <div className="relative aspect-square overflow-hidden rounded bg-white">
                    <Image
                      src={url}
                      alt={
                        indice === 0
                          ? `Foto principal de ${nombre}`
                          : `Foto ${indice + 1} de ${nombre}`
                      }
                      fill
                      sizes="(min-width: 1024px) 200px, (min-width: 640px) 30vw, 45vw"
                      className="object-contain p-2"
                      draggable={false}
                    />
                    {indice === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded bg-admin-text px-2 py-0.5 text-xs font-medium text-admin-surface">
                        Principal
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => mover(indice, indice - 1)}
                      disabled={ocupado || indice === 0}
                      aria-label={`Mover la foto ${indice + 1} a la izquierda`}
                      className={botonIcono}
                    >
                      <ChevronDownIcon className="h-5 w-5 rotate-90" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => mover(indice, indice + 1)}
                      disabled={ocupado || indice === fotos.length - 1}
                      aria-label={`Mover la foto ${indice + 1} a la derecha`}
                      className={botonIcono}
                    >
                      <ChevronDownIcon className="h-5 w-5 -rotate-90" aria-hidden="true" />
                    </button>
                    {indice > 0 && (
                      <button
                        type="button"
                        onClick={() => mover(indice, 0)}
                        disabled={ocupado}
                        className="inline-flex min-h-11 items-center rounded px-1.5 text-sm font-medium text-admin-gold-text underline underline-offset-4 disabled:opacity-40"
                      >
                        Hacer principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmandoFoto(url)}
                      disabled={ocupado}
                      aria-label={`Quitar la foto ${indice + 1}`}
                      className="inline-flex min-h-11 items-center rounded px-1.5 text-sm font-medium text-admin-error underline underline-offset-4 disabled:opacity-40"
                    >
                      Quitar
                    </button>
                  </div>

                  {confirmandoFoto === url && (
                    <div
                      role="group"
                      aria-label="Confirmar quitar foto"
                      className="mt-2 space-y-2 rounded border border-admin-error/40 bg-admin-error-bg p-2.5 text-sm text-admin-text"
                    >
                      <p>
                        {local
                          ? "Se quitará de este perfume (el archivo original no se borra)."
                          : "La foto se borrará definitivamente."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void quitar(url)}
                          className={botonPeligro}
                        >
                          Sí, quitar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmandoFoto(null)}
                          className={botonContorno}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Video ── */}
      <div className="border-t border-admin-border pt-5">
        <h3 className="text-base font-medium text-admin-text">Video</h3>
        <p className={ayuda}>
          Recomendado: vertical o cuadrado, corto (de 10 a 30 segundos) y en formato
          MP4. Máximo 50 MB.
        </p>

        {/* Sin `name`: no viaja con el formulario principal. */}
        <input
          ref={entradaVideo}
          type="file"
          accept="video/mp4"
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(evento) => {
            const archivo = evento.target.files?.[0];
            evento.target.value = "";
            if (archivo) void subirVideo(archivo);
          }}
        />

        {subiendoVideo && (
          <p role="status" className={`${avisoInfo} mt-3 font-medium`}>
            Subiendo video… no cierres esta página.
          </p>
        )}

        {video ? (
          <div className="mt-3 space-y-3">
            <video
              key={video}
              src={video}
              controls
              playsInline
              preload="metadata" // no descarga el video hasta que se reproduce
              aria-label={`Video de ${nombre}`}
              className="max-h-[28rem] w-full max-w-sm rounded-lg border border-admin-border bg-admin-text"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => entradaVideo.current?.click()}
                disabled={ocupado}
                className={botonContorno}
              >
                Reemplazar video
              </button>
              <button
                type="button"
                onClick={() => setConfirmandoVideo(true)}
                disabled={ocupado}
                className={botonPeligro}
              >
                Quitar video
              </button>
            </div>
            {confirmandoVideo && (
              <div
                role="group"
                aria-label="Confirmar quitar video"
                className="max-w-sm space-y-2 rounded border border-admin-error/40 bg-admin-error-bg p-3 text-sm text-admin-text"
              >
                <p>
                  {esRutaLocal(video)
                    ? "Se quitará de este perfume (el archivo original no se borra)."
                    : "El video se borrará definitivamente."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void quitarVideo()} className={botonPeligro}>
                    Sí, quitar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmandoVideo(false)}
                    className={botonContorno}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          !subiendoVideo && (
            <button
              type="button"
              onClick={() => entradaVideo.current?.click()}
              disabled={ocupado}
              className={`${botonContorno} mt-3`}
            >
              Subir video (MP4, máximo 50 MB)
            </button>
          )
        )}
      </div>
    </div>
  );
}
