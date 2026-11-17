/**
 * src/components/product/ProductCard.tsx — Tarjeta de producto.
 *
 * QUÉ ES
 *   La tarjeta que representa un perfume en una lista: foto, marca, nombre,
 *   presentación y precio. Toda la tarjeta es un enlace a su ficha.
 *
 * POR QUÉ EXISTE
 *   Sustituye a las tarjetas que js/products.js generaba como texto HTML en
 *   el sitio v1. Al ser un componente, el catálogo y la portada muestran
 *   exactamente la misma tarjeta sin duplicar código.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Recibe un `Perfume` (src/types/perfume.ts) ya cargado; no consulta la
 *     base de datos por sí misma.
 *   - La usan src/app/(tienda)/catalogo/page.tsx (rejilla) y
 *     src/components/home/Featured.tsx (fila horizontal).
 *   - Enlaza a /producto/[id] (src/app/(tienda)/producto/[id]/page.tsx).
 *   - Componente de servidor: no tiene estado; el hover es solo CSS.
 *
 * REGLAS QUE RESPETA
 *   - Imagen con object-contain, padding y fondo blanco, para que ninguna
 *     foto se recorte sea cual sea su encuadre (CLAUDE.md §7). El blanco se
 *     limita al recuadro de la foto porque las fotos de producto traen
 *     fondo blanco; el resto de la tarjeta sigue la paleta oscura.
 *   - Precio null → "Consultar precio". Nunca se inventa un precio (§3).
 */
import Image from "next/image";
import Link from "next/link";
import { formatPrecio, PLACEHOLDER_IMAGE } from "@/lib/site";
import type { Perfume } from "@/types/perfume";

type ProductCardProps = {
  perfume: Perfume;
  /**
   * Pista para el navegador sobre el ancho real de la imagen en cada
   * tamaño de pantalla, para que descargue la versión más pequeña posible.
   */
  sizes?: string;
  /**
   * true en las primeras tarjetas visibles al cargar: su foto se descarga
   * con prioridad en vez de esperar a que la tarjeta entre en pantalla.
   */
  priority?: boolean;
};

export default function ProductCard({
  perfume,
  sizes = "(min-width: 1280px) 22vw, (min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw",
  priority = false,
}: ProductCardProps) {
  const { id, nombre, marca, volumen, concentracion, precio, precio_original, badge } =
    perfume;

  // "EDP · 100ml", o solo uno de los dos si falta el otro.
  const presentacion = [concentracion, volumen].filter(Boolean).join(" · ");
  // Solo se muestra el precio anterior si de verdad es mayor que el actual.
  const hayDescuento =
    precio !== null && precio_original !== null && precio_original > precio;

  return (
    <Link
      href={`/producto/${id}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-gold/10 bg-dark-secondary transition-colors duration-300 hover:border-gold/50"
    >
      {/* Foto */}
      <div className="relative aspect-square bg-white">
        <Image
          src={perfume.imagen || PLACEHOLDER_IMAGE}
          alt={`${marca} ${nombre}`}
          fill
          sizes={sizes}
          priority={priority}
          className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {badge && (
          <span className="absolute left-3 top-3 rounded bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-dark-secondary">
            {badge}
          </span>
        )}
      </div>

      {/* Texto */}
      <div className="flex flex-1 flex-col px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold-light">
          {marca}
        </p>
        <h3 className="mt-1.5 font-serif text-2xl font-medium leading-tight text-ink">
          {nombre}
        </h3>
        {presentacion && (
          <p className="mt-1 text-sm font-light text-ink-muted">{presentacion}</p>
        )}

        {/* mt-auto empuja el precio al fondo: todas las tarjetas de una fila
            lo alinean a la misma altura aunque el nombre ocupe dos líneas. */}
        <div className="mt-auto pt-4">
          {precio !== null ? (
            <p className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-medium text-ink">
                {formatPrecio(precio)}
              </span>
              {hayDescuento && (
                <span className="text-sm font-light text-ink-muted line-through">
                  {formatPrecio(precio_original)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm font-light italic text-gold-light">
              Consultar precio
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
