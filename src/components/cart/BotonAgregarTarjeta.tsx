"use client";

/**
 * src/components/cart/BotonAgregarTarjeta.tsx — Botón compacto "agregar al
 * carrito" de la tarjeta de producto.
 *
 * QUÉ ES
 *   Un botón redondo con una bolsa y un "+", en la esquina inferior
 *   derecha de la foto de cada tarjeta (catálogo y destacados). Agrega una
 *   unidad sin salir de la lista.
 *
 * POR QUÉ EXISTE
 *   Para armar un pedido de varios perfumes rápido, sin abrir cada ficha.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/components/product/ProductCard.tsx (componente de
 *     servidor). Va FUERA del enlace de la tarjeta, como hermano
 *     superpuesto: HTML no permite un botón dentro de un enlace, y así
 *     pulsar el botón nunca abre la ficha. ProductCard no lo muestra en los
 *     perfumes agotados.
 *   - Agrega con useCarrito(); el CartProvider muestra el aviso
 *     "Agregado al carrito".
 *   - 40 × 40 px: tamaño cómodo para el dedo.
 */
import { useCarrito, type ProductoCarrito } from "@/components/cart/CartProvider";
import { BagPlusIcon } from "@/components/ui/icons";

export default function BotonAgregarTarjeta({ producto }: { producto: ProductoCarrito }) {
  const { agregar } = useCarrito();

  return (
    <button
      type="button"
      onClick={() => agregar(producto, 1)}
      aria-label={`Agregar ${producto.marca} ${producto.nombre} al carrito`}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/60 bg-dark-deep/90 text-gold-ink shadow-[0_4px_12px_rgba(0,0,0,0.18)] backdrop-blur-sm transition-colors duration-200 hover:border-gold hover:bg-gold hover:text-on-gold"
    >
      <BagPlusIcon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
