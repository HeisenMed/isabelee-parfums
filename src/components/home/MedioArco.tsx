/**
 * src/components/home/MedioArco.tsx — Video o imagen dentro de un arco.
 *
 * QUÉ ES
 *   Lo que se ve dentro de los arcos de la portada: un video ambiental
 *   (AmbientVideo, con su póster) o una imagen fija, recortados igual.
 *
 * POR QUÉ EXISTE
 *   Desde la Fase 5B cada arco puede llevar video o imagen, a elección de
 *   la dueña en el panel. Este componente decide cuál dibujar y aplica el
 *   MISMO encuadre a los dos, para que cambiar uno por otro no altere el
 *   diseño. Lo usan tanto la tienda como la vista previa del panel, así lo
 *   que se ve al editar es lo que se publica.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan src/components/home/Familias.tsx, Entrega.tsx y
 *     src/components/admin/portada/CampoMedio.tsx (vista previa).
 *   - El recuadro padre (el arco) decide la forma: debe ser `relative` y
 *     `overflow-hidden`.
 *   - Encuadre: object-cover + scale-[1.08] + origin-top-left, igual que
 *     AmbientVideo: se amplía un 8 % hacia abajo y a la derecha, lo que
 *     deja fuera la estrellita de marca de agua de los videos (esquina
 *     inferior derecha). A las imágenes se les aplica lo mismo para que
 *     ocupen el arco exactamente igual.
 *   - Las imágenes pueden venir de site-media (Supabase Storage), que
 *     next.config.ts autoriza para next/image.
 */
import Image from "next/image";
import AmbientVideo from "@/components/ui/AmbientVideo";
import type { MedioPortada } from "@/types/portada";

type MedioArcoProps = {
  medio: MedioPortada;
  /** Ancho aproximado en pantalla, para que next/image elija el tamaño. */
  sizes?: string;
  /** Clases extra (por ejemplo, el zoom al pasar el cursor). */
  className?: string;
};

export default function MedioArco({ medio, sizes = "280px", className = "" }: MedioArcoProps) {
  if (medio.tipo === "video") {
    return <AmbientVideo src={medio.src} poster={medio.poster} className={className} />;
  }
  if (!medio.src) return null;
  return (
    <Image
      src={medio.src}
      alt=""
      fill
      sizes={sizes}
      // alt vacío: es decorativo, como el video; el título de la tarjeta
      // ya dice de qué se trata.
      className={`origin-top-left scale-[1.08] object-cover ${className}`}
    />
  );
}
