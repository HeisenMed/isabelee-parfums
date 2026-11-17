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
 *   - Agotado (columna `agotado`, migración n.º 3): etiqueta "Agotado" en
 *     la esquina superior derecha de la foto, con la paleta de la tienda
 *     (fondo oscuro y borde dorado, sin azules ni rojos), y la foto algo
 *     atenuada. La tarjeta sigue enlazando a la ficha, donde se puede
 *     consultar por WhatsApp. Se compara con `=== true` porque el campo no
 *     existe mientras la migración no esté aplicada.
 *   - Descuento (Fase 5A): si hay precio anterior mayor que el actual,
 *     junto al precio va una etiqueta dorada "-15 %" (porcentajeDescuento()
 *     de src/lib/site.ts), con el texto "Descuento del 15 %" para lectores
 *     de pantalla.
 *
 * BOTÓN "AGREGAR AL CARRITO" (Fase 5A)
 *   El botón compacto (src/components/cart/BotonAgregarTarjeta.tsx) va en
 *   la esquina inferior derecha de la foto, pero FUERA del enlace: HTML no
 *   permite un botón dentro de un enlace, y así pulsarlo nunca abre la
 *   ficha. Por eso la raíz de la tarjeta es un <div> relativo con dos
 *   hijos: el enlace (toda la tarjeta, como antes) y una capa superpuesta
 *   del tamaño exacto de la foto (aspect-square) con el botón. La capa no
 *   captura clics (pointer-events-none); solo el botón los recibe. Los
 *   perfumes agotados no llevan botón: se consultan por WhatsApp.
 */
import Image from "next/image";
import Link from "next/link";
import BotonAgregarTarjeta from "@/components/cart/BotonAgregarTarjeta";
import { formatPrecio, PLACEHOLDER_IMAGE, porcentajeDescuento } from "@/lib/site";
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
  const agotado = perfume.agotado === true;
  const descuento = porcentajeDescuento(precio, precio_original);

  return (
    <div className="group relative h-full">
    <Link
      href={`/producto/${id}`}
      className="flex h-full flex-col overflow-hidden rounded-lg border border-gold/10 bg-dark-secondary transition-colors duration-300 hover:border-gold/50"
    >
      {/* Foto */}
      <div className="relative aspect-square bg-white">
        <Image
          src={perfume.imagen || PLACEHOLDER_IMAGE}
          alt={`${marca} ${nombre}`}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04] ${
            agotado ? "opacity-60" : ""
          }`}
        />
        {agotado && (
          // A la derecha, para no chocar con el badge (a la izquierda).
          <span className="absolute right-3 top-3 rounded border border-gold/60 bg-dark-deep px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
            Agotado
          </span>
        )}
        {badge && (
          <span className="absolute left-3 top-3 rounded bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-on-gold">
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
              {descuento !== null && (
                <span className="rounded border border-gold/50 bg-gold/10 px-1.5 py-0.5 text-[11px] font-semibold text-gold-ink">
                  <span aria-hidden="true">-{descuento} %</span>
                  <span className="sr-only">Descuento del {descuento} %</span>
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

    {/* Capa del tamaño de la foto, solo para colocar el botón del carrito
        (ver BOTÓN "AGREGAR AL CARRITO" en la cabecera). */}
    {!agotado && (
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
        <div className="pointer-events-auto absolute bottom-3 right-3">
          <BotonAgregarTarjeta
            producto={{
              id,
              nombre,
              marca,
              volumen,
              imagen: perfume.imagen,
              precio: precio === null ? null : Number(precio),
            }}
          />
        </div>
      </div>
    )}
    </div>
  );
}
