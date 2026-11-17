"use client";

/**
 * src/components/cart/AgregarAlCarrito.tsx — Selector de cantidad y botón
 * "Agregar al carrito" de la ficha de producto.
 *
 * QUÉ ES
 *   Tres botones (−, cantidad, +) y "Agregar al carrito", bajo el precio en
 *   /producto/[id].
 *
 * POR QUÉ EXISTE
 *   Permite reunir varios perfumes y enviar un solo pedido por WhatsApp
 *   desde el carrito, en lugar de una conversación por perfume. La consulta
 *   directa ("Consultar por este perfume") sigue disponible al lado.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/(tienda)/producto/[id]/page.tsx (componente de
 *     servidor), que le pasa los datos del perfume. La ficha NO lo muestra
 *     si el perfume está agotado: ahí solo queda "Agotado — consúltalo por
 *     WhatsApp".
 *   - Agrega con useCarrito() (src/components/cart/CartProvider.tsx), que
 *     además muestra el aviso "Agregado al carrito" con "Ver carrito".
 *   - Un perfume sin precio también se puede agregar: en el carrito y en
 *     el mensaje aparece como "precio a consultar".
 */
import { useState } from "react";
import { useCarrito, type ProductoCarrito } from "@/components/cart/CartProvider";
import { BagPlusIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { CANTIDAD_MAX, CANTIDAD_MIN } from "@/lib/carrito";

const botonCantidad =
  "flex h-12 w-12 items-center justify-center text-ink transition-colors duration-200 hover:text-gold-ink disabled:cursor-not-allowed disabled:opacity-40";

export default function AgregarAlCarrito({ producto }: { producto: ProductoCarrito }) {
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const descripcion = `${producto.marca} ${producto.nombre}`;

  return (
    <div className="mt-4 flex flex-wrap items-stretch gap-3">
      {/* Selector de cantidad */}
      <div
        role="group"
        aria-label="Cantidad"
        className="flex items-center rounded-lg border border-gold/30 dia:border-gold-ink/60"
      >
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.max(CANTIDAD_MIN, c - 1))}
          disabled={cantidad <= CANTIDAD_MIN}
          aria-label="Una unidad menos"
          className={botonCantidad}
        >
          <MinusIcon className="h-4 w-4" aria-hidden="true" />
        </button>
        {/* aria-live: se anuncia la cantidad nueva al pulsar + o −. */}
        <span aria-live="polite" className="w-8 text-center text-base font-medium text-ink">
          {cantidad}
        </span>
        <button
          type="button"
          onClick={() => setCantidad((c) => Math.min(CANTIDAD_MAX, c + 1))}
          disabled={cantidad >= CANTIDAD_MAX}
          aria-label="Una unidad más"
          className={botonCantidad}
        >
          <PlusIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          agregar(producto, cantidad);
          setCantidad(1);
        }}
        aria-label={`Agregar ${cantidad} ${cantidad === 1 ? "unidad" : "unidades"} de ${descripcion} al carrito`}
        className="inline-flex flex-1 items-center justify-center gap-3 rounded-lg border border-gold/50 px-6 py-3 text-xs font-medium uppercase tracking-[0.18em] text-gold-ink transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-on-gold sm:flex-none"
      >
        <BagPlusIcon className="h-5 w-5" aria-hidden="true" />
        Agregar al carrito
      </button>
    </div>
  );
}
