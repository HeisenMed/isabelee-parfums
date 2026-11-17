"use client";

/**
 * src/components/cart/CartDrawer.tsx — Cajón lateral del carrito.
 *
 * QUÉ ES
 *   El panel que se desliza desde la derecha al pulsar el ícono del
 *   carrito: lista de perfumes con su cantidad, subtotal, nombre y ciudad
 *   opcionales, y el botón "Enviar pedido por WhatsApp".
 *
 * POR QUÉ EXISTE
 *   La tienda no cobra en línea: el pedido se cierra por WhatsApp. Este
 *   cajón convierte el carrito en un mensaje ordenado y listo para enviar,
 *   para que nadie tenga que escribir a mano qué quiere.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo dibuja src/components/cart/CartProvider.tsx (una sola vez) y lee
 *     el estado con useCarrito().
 *   - Subtotal y mensaje: src/lib/carrito.ts.
 *   - Accesibilidad de ventana (foco atrapado, Escape, scroll bloqueado,
 *     foco devuelto al cerrar): useAtraparFoco.
 *   - Animación de entrada y salida con Framer Motion, como el menú móvil;
 *     sin desplazamiento si se pidió reducir el movimiento.
 *
 * COMPROBACIÓN AL ABRIR
 *   Entre que alguien agrega un perfume y envía el pedido pueden pasar
 *   días: el precio puede cambiar, o el perfume agotarse o dejar de
 *   venderse. Cada vez que se abre el cajón se descarga la lista actual de
 *   /api/buscar (src/app/api/buscar/route.ts) y:
 *     - si el precio cambió, se actualiza y se avisa;
 *     - si está agotado o ya no está en la tienda, se marca, se avisa y NO
 *       entra en el mensaje de WhatsApp (se puede quitar del carrito).
 *   Si la comprobación falla (sin conexión), el carrito sigue funcionando
 *   con los datos guardados.
 *
 * DESPUÉS DE ENVIAR
 *   El carrito NO se vacía solo: la persona puede volver si WhatsApp no se
 *   abrió o si quiere cambiar algo. Tras pulsar "Enviar" se ofrece
 *   "Vaciar carrito".
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PerfumeBuscable } from "@/app/api/buscar/route";
import { useCarrito } from "@/components/cart/CartProvider";
import {
  CloseIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { useAtraparFoco } from "@/components/ui/useAtraparFoco";
import {
  CANTIDAD_MAX,
  CANTIDAD_MIN,
  calcularSubtotal,
  enlacePedido,
  guardarDatosPedido,
  leerDatosPedido,
  type DatosPedido,
} from "@/lib/carrito";
import { formatPrecio, PLACEHOLDER_IMAGE } from "@/lib/site";

/** Motivo por el que un perfume del carrito no se puede pedir. */
type Bloqueo = "agotado" | "no-disponible";

const TEXTO_BLOQUEO: Record<Bloqueo, string> = {
  agotado: "Agotado",
  "no-disponible": "Ya no está disponible",
};

/** Botón cuadrado de 40 px para +, − y quitar. */
const botonIcono =
  "flex h-10 w-10 items-center justify-center rounded-lg border border-gold/25 text-ink transition-colors duration-200 hover:border-gold hover:text-gold-ink disabled:cursor-not-allowed disabled:opacity-40";

/** Campo de texto del formulario de pedido. */
const campo =
  "mt-1 w-full rounded-lg border border-gold/25 bg-dark-deep px-3 py-2.5 text-base text-ink placeholder:text-ink-muted/70 focus:border-gold focus:outline-none dia:border-gold-ink/80";

export default function CartDrawer() {
  const {
    items,
    abierto,
    cerrar,
    cambiarCantidad,
    quitar,
    vaciar,
    actualizarPrecios,
  } = useCarrito();
  const reducirMovimiento = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  useAtraparFoco(panel, abierto, cerrar);

  /** Perfumes que no se pueden pedir, por id (resultado de la comprobación). */
  const [bloqueos, setBloqueos] = useState<Record<number, Bloqueo>>({});
  /** Cuántos precios se actualizaron en la última comprobación. */
  const [preciosCambiados, setPreciosCambiados] = useState(0);
  const [datos, setDatos] = useState<DatosPedido>({ nombre: "", ciudad: "" });
  /** true tras pulsar "Enviar pedido": se ofrece vaciar el carrito. */
  const [enviado, setEnviado] = useState(false);

  // Nombre y ciudad del último pedido (solo existen en el navegador).
  useEffect(() => {
    setDatos(leerDatosPedido());
  }, []);

  // Comprobación de precios y disponibilidad cada vez que se abre.
  // `items` NO va en las dependencias a propósito: se compara la foto del
  // carrito en el momento de abrir; volver a comprobar a cada clic en +/−
  // sería descargar la lista una y otra vez.
  useEffect(() => {
    if (!abierto) return;
    setEnviado(false);
    let cancelado = false;

    (async () => {
      try {
        const respuesta = await fetch("/api/buscar");
        if (!respuesta.ok) return;
        const lista = (await respuesta.json()) as PerfumeBuscable[];
        if (cancelado) return;

        const porId = new Map(lista.map((p) => [p.id, p]));
        const nuevosBloqueos: Record<number, Bloqueo> = {};
        const precios = new Map<number, number | null>();
        let cambios = 0;

        for (const item of items) {
          const actual = porId.get(item.id);
          if (!actual) {
            nuevosBloqueos[item.id] = "no-disponible";
          } else if (actual.agotado) {
            nuevosBloqueos[item.id] = "agotado";
          } else if (actual.precio !== item.precio) {
            precios.set(item.id, actual.precio);
            cambios += 1;
          }
        }
        setBloqueos(nuevosBloqueos);
        setPreciosCambiados(cambios);
        if (cambios > 0) actualizarPrecios(precios);
      } catch {
        // Sin conexión: se sigue con los datos guardados.
      }
    })();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  function cambiarDato(clave: keyof DatosPedido, valor: string) {
    const nuevos = { ...datos, [clave]: valor.slice(0, 60) };
    setDatos(nuevos);
    guardarDatosPedido(nuevos);
  }

  // Solo los disponibles cuentan para el subtotal y el mensaje.
  const disponibles = items.filter((item) => !bloqueos[item.id]);
  const bloqueados = items.length - disponibles.length;
  const { subtotal, sinPrecio } = calcularSubtotal(disponibles);

  return (
    <AnimatePresence>
      {abierto && (
        <>
          {/* Velo: tocarlo cierra el carrito */}
          <motion.div
            key="velo-carrito"
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={cerrar}
            aria-hidden="true"
          />

          <motion.div
            key="panel-carrito"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="carrito-titulo"
            // Ancho completo en móvil; 420 px desde 640 px.
            className="fixed inset-y-0 right-0 z-[90] flex w-full flex-col border-l border-gold/20 bg-dark-secondary text-ink sm:w-[420px]"
            initial={{ x: reducirMovimiento ? 0 : "100%", opacity: reducirMovimiento ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reducirMovimiento ? 0 : "100%", opacity: reducirMovimiento ? 0 : 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-gold/15 px-5 py-4">
              <h2 id="carrito-titulo" className="font-serif text-3xl font-medium">
                Tu carrito
              </h2>
              <button type="button" onClick={cerrar} aria-label="Cerrar carrito" className={botonIcono}>
                <CloseIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <p className="font-serif text-2xl italic text-gold-light">Tu carrito está vacío</p>
                <p className="mt-2 text-sm font-light text-ink-muted">
                  Agrega fragancias desde el catálogo y envía tu pedido por WhatsApp.
                </p>
                <Link
                  href="/catalogo"
                  onClick={cerrar}
                  className="mt-6 rounded-lg bg-gold px-6 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-on-gold transition-colors duration-300 hover:bg-gold-bright"
                >
                  Explorar el catálogo
                </Link>
              </div>
            ) : (
              <>
                {/* Lista (con su propio desplazamiento) */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  {(bloqueados > 0 || preciosCambiados > 0) && (
                    <div className="mb-4 space-y-1 rounded-lg border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-sm" role="status">
                      {bloqueados > 0 && (
                        <p>
                          {bloqueados === 1
                            ? "1 producto ya no se puede pedir y no se incluirá en el mensaje."
                            : `${bloqueados} productos ya no se pueden pedir y no se incluirán en el mensaje.`}
                        </p>
                      )}
                      {preciosCambiados > 0 && (
                        <p>
                          {preciosCambiados === 1
                            ? "Actualizamos el precio de 1 producto."
                            : `Actualizamos el precio de ${preciosCambiados} productos.`}
                        </p>
                      )}
                    </div>
                  )}

                  <ul className="divide-y divide-gold/10">
                    {items.map((item) => {
                      const bloqueo = bloqueos[item.id];
                      const descripcion = `${item.marca} ${item.nombre}`;
                      return (
                        <li key={item.id} className="flex gap-3 py-4">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
                            <Image
                              src={item.imagen || PLACEHOLDER_IMAGE}
                              alt=""
                              fill
                              sizes="80px"
                              className={`object-contain p-1.5 ${bloqueo ? "opacity-50" : ""}`}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gold-light">
                              {item.marca}
                            </p>
                            <Link
                              href={`/producto/${item.id}`}
                              onClick={cerrar}
                              className="block font-serif text-lg leading-tight text-ink hover:text-gold-ink"
                            >
                              {item.nombre}
                            </Link>
                            <p className="mt-0.5 text-xs font-light text-ink-muted">
                              {[item.volumen, item.precio === null ? "Precio a consultar" : formatPrecio(item.precio)]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {bloqueo && (
                              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-gold-ink">
                                {TEXTO_BLOQUEO[bloqueo]}
                              </p>
                            )}

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                                disabled={item.cantidad <= CANTIDAD_MIN || Boolean(bloqueo)}
                                aria-label={`Quitar una unidad de ${descripcion}`}
                                className={botonIcono}
                              >
                                <MinusIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <span className="w-6 text-center text-sm font-medium" aria-label={`Cantidad: ${item.cantidad}`}>
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                                disabled={item.cantidad >= CANTIDAD_MAX || Boolean(bloqueo)}
                                aria-label={`Agregar una unidad de ${descripcion}`}
                                className={botonIcono}
                              >
                                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => quitar(item.id)}
                                aria-label={`Quitar ${descripcion} del carrito`}
                                className={`${botonIcono} ml-auto`}
                              >
                                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* Pie: subtotal, datos y envío */}
                <div className="border-t border-gold/15 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm uppercase tracking-[0.16em] text-ink-muted">Subtotal</span>
                    <span className="font-serif text-2xl font-medium">
                      {disponibles.some((item) => item.precio !== null) ? formatPrecio(subtotal) : "—"}
                    </span>
                  </div>
                  {sinPrecio > 0 && (
                    <p className="mt-1 text-xs font-light text-ink-muted">
                      {sinPrecio === 1
                        ? "1 producto con precio a consultar (no suma al subtotal)."
                        : `${sinPrecio} productos con precio a consultar (no suman al subtotal).`}
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
                      Nombre
                      <input
                        type="text"
                        value={datos.nombre}
                        onChange={(e) => cambiarDato("nombre", e.target.value)}
                        autoComplete="given-name"
                        placeholder="Opcional"
                        className={campo}
                      />
                    </label>
                    <label className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
                      Ciudad
                      <input
                        type="text"
                        value={datos.ciudad}
                        onChange={(e) => cambiarDato("ciudad", e.target.value)}
                        autoComplete="address-level2"
                        placeholder="Opcional"
                        className={campo}
                      />
                    </label>
                  </div>

                  {disponibles.length > 0 ? (
                    <a
                      href={enlacePedido(disponibles, datos)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setEnviado(true)}
                      className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg bg-gold px-6 py-4 text-xs font-medium uppercase tracking-[0.18em] text-on-gold transition-colors duration-300 hover:bg-gold-bright"
                    >
                      <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                      Enviar pedido por WhatsApp
                    </a>
                  ) : (
                    <p className="mt-4 text-center text-sm text-ink-muted">
                      Ningún producto del carrito se puede pedir ahora.
                    </p>
                  )}

                  {enviado && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm" role="status">
                      <span className="text-ink-muted">¿Ya enviaste tu pedido?</span>
                      <button
                        type="button"
                        onClick={() => {
                          vaciar();
                          setEnviado(false);
                        }}
                        className="font-medium text-gold-ink underline underline-offset-4 hover:text-gold-light"
                      >
                        Vaciar carrito
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
