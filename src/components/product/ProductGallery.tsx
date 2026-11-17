"use client";

/**
 * src/components/product/ProductGallery.tsx — Galería de la ficha de producto.
 *
 * QUÉ ES
 *   La foto grande del perfume y, si tiene más de una imagen, una fila de
 *   miniaturas para cambiar cuál se ve en grande.
 *
 * POR QUÉ EXISTE
 *   En el sitio v1 cada perfume tenía una sola foto. El esquema nuevo
 *   admite varias (`imagen` + `imagenes`), que se subirán desde el panel
 *   de administración en la Fase 3; la galería ya está lista para ellas.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/producto/[id]/page.tsx, que le pasa la lista de
 *     imágenes ya preparada (principal primero, sin duplicados).
 *   - Necesita "use client" solo por el estado de "qué miniatura está
 *     elegida"; el resto de la ficha se renderiza en el servidor.
 *   - Las imágenes remotas (Supabase Storage) funcionan porque su dominio
 *     está autorizado en next.config.ts.
 *   - Misma regla que las tarjetas: object-contain, padding y fondo
 *     blanco para que ninguna foto se recorte (CLAUDE.md §7).
 */
import Image from "next/image";
import { useState } from "react";

type ProductGalleryProps = {
  /** Imágenes a mostrar. La primera es la principal. Mínimo una. */
  images: string[];
  /** Texto alternativo base (marca + nombre del perfume). */
  alt: string;
  /** Etiqueta opcional sobre la foto ("Más Vendido", "Nuevo"...). */
  badge?: string | null;
};

export default function ProductGallery({ images, alt, badge }: ProductGalleryProps) {
  /** Posición de la imagen que se muestra en grande. */
  const [selected, setSelected] = useState(0);
  // Por si la lista cambia y la posición guardada ya no existe.
  const current = images[selected] ?? images[0];

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-gold/15 bg-white">
        <Image
          src={current}
          alt={alt}
          fill
          priority // es la imagen principal de la página: cargarla cuanto antes
          sizes="(min-width: 1024px) 45vw, 92vw"
          className="object-contain p-8 sm:p-12"
        />
        {badge && (
          <span className="absolute left-4 top-4 rounded bg-gold px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-dark-secondary">
            {badge}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-4 grid grid-cols-5 gap-3">
          {images.map((image, index) => (
            <li key={image}>
              <button
                type="button"
                onClick={() => setSelected(index)}
                aria-label={`Ver imagen ${index + 1} de ${images.length}`}
                aria-pressed={index === selected}
                className={`relative block aspect-square w-full overflow-hidden rounded-md border bg-white transition-colors duration-200 ${
                  index === selected
                    ? "border-gold"
                    : "border-gold/15 hover:border-gold/60"
                }`}
              >
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="100px"
                  className="object-contain p-1.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
