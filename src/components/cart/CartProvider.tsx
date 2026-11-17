"use client";

/**
 * src/components/cart/CartProvider.tsx — Estado global del carrito.
 *
 * QUÉ ES
 *   Un "proveedor de contexto" de React: un componente que envuelve la
 *   tienda y comparte con cualquier componente interior el estado del
 *   carrito (qué perfumes hay y cuántos) y las acciones para cambiarlo
 *   (agregar, cambiar cantidad, quitar, vaciar, abrir el cajón).
 *   También dibuja, una sola vez para toda la tienda, el cajón del carrito
 *   (CartDrawer) y el aviso "Agregado al carrito".
 *
 * POR QUÉ EXISTE
 *   El contador del Header, el botón de la tarjeta, el de la ficha y el
 *   cajón tienen que ver el MISMO carrito y actualizarse a la vez. Un
 *   contexto evita pasar el carrito de componente en componente.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/(tienda)/layout.tsx alrededor de toda la tienda (y
 *     src/app/not-found.tsx, que también tiene Header).
 *   - Los componentes lo leen con el hook useCarrito().
 *   - Guarda y lee con src/lib/carrito.ts (localStorage "isabelee-carrito").
 *   - Sincroniza pestañas: si se agrega algo en otra pestaña del mismo
 *     navegador, el evento "storage" actualiza esta.
 *
 * HIDRATACIÓN (por qué existe `listo`)
 *   El servidor no conoce el localStorage de nadie: siempre dibuja el
 *   carrito vacío. Si el navegador dibujara "3" desde el primer instante,
 *   el HTML no coincidiría con el del servidor y React daría un error de
 *   hidratación. Por eso el carrito se lee DESPUÉS de montar y `listo`
 *   avisa de cuándo los datos ya son los reales: el Header solo muestra el
 *   contador cuando listo es true.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import CartDrawer from "@/components/cart/CartDrawer";
import {
  CLAVE_CARRITO,
  contarUnidades,
  guardarCarrito,
  leerCarrito,
  limitarCantidad,
  type ItemCarrito,
} from "@/lib/carrito";

/** Lo que se necesita para agregar un perfume (la cantidad va aparte). */
export type ProductoCarrito = Omit<ItemCarrito, "cantidad">;

type ContextoCarrito = {
  items: ItemCarrito[];
  /** true cuando ya se leyó el carrito guardado (ver HIDRATACIÓN). */
  listo: boolean;
  /** Unidades totales, para el contador del Header. */
  unidades: number;
  agregar: (producto: ProductoCarrito, cantidad?: number) => void;
  cambiarCantidad: (id: number, cantidad: number) => void;
  quitar: (id: number) => void;
  vaciar: () => void;
  /** Sustituye el precio guardado de algunos perfumes (tras revalidar). */
  actualizarPrecios: (precios: Map<number, number | null>) => void;
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
};

const Contexto = createContext<ContextoCarrito | null>(null);

/** Segundos que se muestra el aviso "Agregado al carrito". */
const DURACION_AVISO_MS = 4000;

/** Acceso al carrito desde cualquier componente de la tienda. */
export function useCarrito(): ContextoCarrito {
  const valor = useContext(Contexto);
  if (!valor) {
    throw new Error("useCarrito() debe usarse dentro de <CartProvider>.");
  }
  return valor;
}

export default function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [listo, setListo] = useState(false);
  const [abierto, setAbierto] = useState(false);
  /** Nombre del último perfume agregado, para el aviso; null = sin aviso. */
  const [aviso, setAviso] = useState<string | null>(null);
  /** Evita guardar el carrito vacío inicial ANTES de haber leído el real. */
  const leido = useRef(false);

  // 1) Leer lo guardado, una vez montado (ver HIDRATACIÓN).
  useEffect(() => {
    setItems(leerCarrito());
    leido.current = true;
    setListo(true);

    // Otra pestaña cambió el carrito: se vuelve a leer.
    const alCambiarEnOtraPestana = (evento: StorageEvent) => {
      if (evento.key === CLAVE_CARRITO) setItems(leerCarrito());
    };
    window.addEventListener("storage", alCambiarEnOtraPestana);
    return () => window.removeEventListener("storage", alCambiarEnOtraPestana);
  }, []);

  // 2) Guardar cada cambio.
  useEffect(() => {
    if (leido.current) guardarCarrito(items);
  }, [items]);

  // 3) El aviso desaparece solo.
  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(null), DURACION_AVISO_MS);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  const agregar = useCallback((producto: ProductoCarrito, cantidad = 1) => {
    setItems((actuales) => {
      const existente = actuales.find((item) => item.id === producto.id);
      if (existente) {
        // Ya estaba: se suma la cantidad (hasta el máximo) y se actualizan
        // los datos por si cambiaron desde que se agregó.
        return actuales.map((item) =>
          item.id === producto.id
            ? { ...producto, cantidad: limitarCantidad(item.cantidad + cantidad) }
            : item,
        );
      }
      return [...actuales, { ...producto, cantidad: limitarCantidad(cantidad) }];
    });
    setAviso(`${producto.marca} ${producto.nombre}`);
  }, []);

  const cambiarCantidad = useCallback((id: number, cantidad: number) => {
    setItems((actuales) =>
      actuales.map((item) =>
        item.id === id ? { ...item, cantidad: limitarCantidad(cantidad) } : item,
      ),
    );
  }, []);

  const quitar = useCallback((id: number) => {
    setItems((actuales) => actuales.filter((item) => item.id !== id));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const actualizarPrecios = useCallback((precios: Map<number, number | null>) => {
    setItems((actuales) => {
      let cambio = false;
      const nuevos = actuales.map((item) => {
        if (!precios.has(item.id)) return item;
        const precio = precios.get(item.id) ?? null;
        if (precio === item.precio) return item;
        cambio = true;
        return { ...item, precio };
      });
      // Si nada cambió se devuelve el mismo array: React no vuelve a
      // dibujar ni a guardar.
      return cambio ? nuevos : actuales;
    });
  }, []);

  const abrir = useCallback(() => {
    setAviso(null);
    setAbierto(true);
  }, []);
  const cerrar = useCallback(() => setAbierto(false), []);

  const valor = useMemo<ContextoCarrito>(
    () => ({
      items,
      listo,
      unidades: contarUnidades(items),
      agregar,
      cambiarCantidad,
      quitar,
      vaciar,
      actualizarPrecios,
      abierto,
      abrir,
      cerrar,
    }),
    [items, listo, agregar, cambiarCantidad, quitar, vaciar, actualizarPrecios, abierto, abrir, cerrar],
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      <CartDrawer />

      {/* Aviso "Agregado al carrito". Abajo a la izquierda, para no tapar
          los botones flotantes de WhatsApp y compartir (a la derecha).
          role="status": los lectores de pantalla lo anuncian sin
          interrumpir. Siempre está en la página (vacío o no) para que el
          anuncio funcione. */}
      <div
        role="status"
        className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-[85] max-w-[calc(100vw-6.5rem)] sm:left-6"
      >
        {aviso && (
          <div className="pointer-events-auto flex items-center gap-4 rounded-lg border border-gold/40 bg-dark-secondary px-4 py-3 text-sm text-ink shadow-[0_10px_30px_rgba(0,0,0,0.35)] dia:shadow-[0_10px_30px_rgba(31,27,22,0.15)]">
            <p className="min-w-0">
              <span className="block font-medium">Agregado al carrito</span>
              <span className="block truncate text-xs font-light text-ink-muted">
                {aviso}
              </span>
            </p>
            <button
              type="button"
              onClick={abrir}
              className="shrink-0 rounded-lg border border-gold/50 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-gold-ink transition-colors duration-200 hover:border-gold hover:bg-gold hover:text-on-gold"
            >
              Ver carrito
            </button>
          </div>
        )}
      </div>
    </Contexto.Provider>
  );
}
