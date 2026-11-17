"use client";

/**
 * src/components/ui/AmbientVideo.tsx — Video decorativo de fondo.
 *
 * QUÉ ES
 *   Un <video> silencioso y en bucle que se reproduce solo mientras está a
 *   la vista. Rellena el recuadro que lo contiene (como una foto de fondo
 *   en movimiento) y no tiene controles: es ambiente, no contenido.
 *
 * POR QUÉ EXISTE
 *   La portada usa videos cortos (de 10 a 20 s, verticales) para dar
 *   atmósfera a las tarjetas de familias olfativas y a "Así llega tu
 *   fragancia". Reproducir varios videos a la vez desde el principio
 *   gastaría datos móviles y batería; este componente solo descarga y
 *   reproduce el que se está viendo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan src/components/home/Familias.tsx y
 *     src/components/home/Entrega.tsx.
 *   - Los videos están en public/videos/ y sus imágenes de portada
 *     ("pósteres", el fotograma que se ve antes de reproducir) en
 *     public/videos/posters/.
 *   - El recuadro padre decide el tamaño y la forma (por ejemplo, un arco):
 *     debe tener `position: relative` y `overflow: hidden`.
 *
 * DETALLES QUE IMPORTAN
 *   - preload="none": no se descarga nada hasta que hace falta. Mientras
 *     tanto se ve el póster.
 *   - IntersectionObserver (la API del navegador que avisa cuando un
 *     elemento entra o sale de la pantalla): reproduce al entrar al menos
 *     un 25 % del video y pausa al salir.
 *   - muted + playsInline: sin sonido y sin pantalla completa en iPhone;
 *     es lo que exigen los navegadores para reproducir sin que la persona
 *     pulse nada. (Los archivos conservan su pista de audio porque no hay
 *     ffmpeg en el equipo para quitarla; al estar silenciados no suena.)
 *   - prefers-reduced-motion: si la persona pidió reducir el movimiento,
 *     NUNCA se reproduce: se queda el póster. También se respeta el modo
 *     "ahorro de datos" del navegador cuando lo informa.
 *   - Marca de agua: los videos traen una estrellita en la esquina
 *     inferior derecha. object-cover recorta arriba y abajo para llenar el
 *     recuadro, y scale-[1.08] con origin-top-left amplía un 8 % hacia
 *     abajo y a la derecha: esa esquina queda fuera de la vista.
 *   - aria-hidden: es decorativo; los lectores de pantalla lo ignoran.
 */
import { useEffect, useRef } from "react";

/** Fracción del video que debe verse para que se reproduzca. */
const UMBRAL_VISIBLE = 0.25;

type AmbientVideoProps = {
  /** Ruta del video, por ejemplo "/videos/frasco-dorado-con-humo.mp4". */
  src: string;
  /** Imagen fija que se muestra antes de reproducir (y siempre, con movimiento reducido). */
  poster?: string;
  /** Clases extra para el <video>. */
  className?: string;
};

export default function AmbientVideo({ src, poster, className = "" }: AmbientVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const movimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)");
    // navigator.connection solo existe en algunos navegadores (Chrome,
    // Android); por eso se lee con cuidado.
    const ahorroDatos = Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
        ?.saveData,
    );
    if (ahorroDatos) return;

    // React no siempre escribe el atributo `muted` en el HTML; se fija aquí
    // la propiedad para que el navegador permita la reproducción automática.
    video.muted = true;

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting && !movimientoReducido.matches) {
          // play() devuelve una promesa que falla si el navegador bloquea
          // la reproducción (por ejemplo, en modo de bajo consumo): se
          // ignora y queda el póster.
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: UMBRAL_VISIBLE },
    );
    observador.observe(video);

    // Si la persona activa "reducir movimiento" con la página abierta, se
    // detiene en el acto.
    const alCambiarMovimiento = () => {
      if (movimientoReducido.matches) video.pause();
    };
    movimientoReducido.addEventListener("change", alCambiarMovimiento);

    return () => {
      observador.disconnect();
      movimientoReducido.removeEventListener("change", alCambiarMovimiento);
    };
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      tabIndex={-1}
      disablePictureInPicture
      className={`absolute inset-0 h-full w-full origin-top-left scale-[1.08] object-cover ${className}`}
    />
  );
}
