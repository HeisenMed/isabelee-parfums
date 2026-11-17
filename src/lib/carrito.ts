/**
 * src/lib/carrito.ts — Reglas del carrito de compras (sin React).
 *
 * QUÉ ES
 *   Los tipos y las funciones puras del carrito: cómo es un producto del
 *   carrito, cómo se guarda y se lee del navegador, cómo se calcula el
 *   subtotal y cómo se arma el mensaje del pedido para WhatsApp.
 *
 * POR QUÉ EXISTE
 *   La tienda no cobra en línea: el pedido se cierra conversando por
 *   WhatsApp. El carrito sirve para reunir varios perfumes y enviar un
 *   solo mensaje ordenado con todo el pedido. Separar estas reglas de los
 *   componentes las hace fáciles de leer y de probar por separado.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - src/components/cart/CartProvider.tsx guarda el estado del carrito y
 *     usa leerCarrito()/guardarCarrito().
 *   - src/components/cart/CartDrawer.tsx muestra el carrito y usa
 *     calcularSubtotal() y armarMensajePedido().
 *   - formatPrecio() y whatsappUrl() vienen de src/lib/site.ts.
 *
 * DÓNDE SE GUARDA
 *   En el navegador de la persona (localStorage), no en el servidor:
 *     "isabelee-carrito"       los productos
 *     "isabelee-datos-pedido"  nombre y ciudad, para no volver a escribirlos
 *   Nada de esto llega a nuestra base de datos. Si alguien borra los datos
 *   del navegador o cambia de dispositivo, el carrito empieza vacío.
 *
 *   Lo guardado lleva un número de versión (VERSION_CARRITO). Si algún día
 *   cambia la forma de los datos, se sube el número y lo antiguo se
 *   descarta en lugar de romper la página. Cualquier dato corrupto o
 *   manipulado también se descarta: leerCarrito() revisa campo por campo.
 */
import { SITE_SHORT_NAME, formatPrecio, whatsappUrl } from "@/lib/site";

/** Clave de localStorage con los productos. */
export const CLAVE_CARRITO = "isabelee-carrito";
/** Clave de localStorage con el nombre y la ciudad del último pedido. */
export const CLAVE_DATOS_PEDIDO = "isabelee-datos-pedido";
/** Versión del formato guardado. Súbela si cambia la forma de ItemCarrito. */
const VERSION_CARRITO = 1;

/** Cantidad mínima y máxima de un mismo perfume. */
export const CANTIDAD_MIN = 1;
export const CANTIDAD_MAX = 10;
/** Máximo de perfumes distintos en el carrito (evita datos desmedidos). */
const MAX_ITEMS = 50;
/** Largo máximo del mensaje de WhatsApp, en caracteres. */
const MAX_MENSAJE = 1800;

/** Un perfume dentro del carrito. */
export type ItemCarrito = {
  id: number;
  nombre: string;
  marca: string;
  /** "100ml", o "" si no se conoce. */
  volumen: string;
  /** Ruta o URL de la foto ("" = imagen genérica). */
  imagen: string;
  /** Precio unitario en COP en el momento de agregarlo; null = a consultar. */
  precio: number | null;
  /** De CANTIDAD_MIN a CANTIDAD_MAX. */
  cantidad: number;
};

/** Datos opcionales de quien hace el pedido. */
export type DatosPedido = { nombre: string; ciudad: string };

/** Limita una cantidad al rango permitido (y la vuelve entera). */
export function limitarCantidad(cantidad: number): number {
  if (!Number.isFinite(cantidad)) return CANTIDAD_MIN;
  return Math.min(CANTIDAD_MAX, Math.max(CANTIDAD_MIN, Math.round(cantidad)));
}

/* ── Guardar y leer ─────────────────────────────────────────────────── */

/** Comprueba que un objeto leído del navegador tenga la forma correcta. */
function esItemValido(valor: unknown): valor is ItemCarrito {
  if (!valor || typeof valor !== "object") return false;
  const item = valor as Record<string, unknown>;
  return (
    typeof item.id === "number" &&
    Number.isInteger(item.id) &&
    item.id > 0 &&
    typeof item.nombre === "string" &&
    typeof item.marca === "string" &&
    typeof item.volumen === "string" &&
    typeof item.imagen === "string" &&
    (item.precio === null ||
      (typeof item.precio === "number" && Number.isFinite(item.precio) && item.precio >= 0)) &&
    typeof item.cantidad === "number"
  );
}

/**
 * Lee el carrito guardado. Devuelve [] si no hay nada, si la versión no
 * coincide, si el contenido no es válido o si el almacenamiento está
 * bloqueado (modo privado estricto). Nunca lanza un error.
 */
export function leerCarrito(): ItemCarrito[] {
  try {
    const crudo = localStorage.getItem(CLAVE_CARRITO);
    if (!crudo) return [];
    const datos = JSON.parse(crudo) as { version?: unknown; items?: unknown };
    if (datos?.version !== VERSION_CARRITO || !Array.isArray(datos.items)) return [];
    const vistos = new Set<number>();
    return datos.items
      .filter(esItemValido)
      .filter((item) => !vistos.has(item.id) && vistos.add(item.id))
      .slice(0, MAX_ITEMS)
      .map((item) => ({ ...item, cantidad: limitarCantidad(item.cantidad) }));
  } catch {
    return [];
  }
}

/** Guarda el carrito. Si el almacenamiento falla, el carrito sigue en memoria. */
export function guardarCarrito(items: ItemCarrito[]): void {
  try {
    localStorage.setItem(
      CLAVE_CARRITO,
      JSON.stringify({ version: VERSION_CARRITO, items: items.slice(0, MAX_ITEMS) }),
    );
  } catch {
    // Almacenamiento lleno o bloqueado: el carrito dura lo que dure la visita.
  }
}

/** Lee el nombre y la ciudad guardados del último pedido. */
export function leerDatosPedido(): DatosPedido {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_DATOS_PEDIDO) ?? "{}") as Partial<DatosPedido>;
    return {
      nombre: typeof datos.nombre === "string" ? datos.nombre.slice(0, 60) : "",
      ciudad: typeof datos.ciudad === "string" ? datos.ciudad.slice(0, 60) : "",
    };
  } catch {
    return { nombre: "", ciudad: "" };
  }
}

/** Guarda el nombre y la ciudad para el próximo pedido. */
export function guardarDatosPedido(datos: DatosPedido): void {
  try {
    localStorage.setItem(CLAVE_DATOS_PEDIDO, JSON.stringify(datos));
  } catch {
    // Sin almacenamiento: habrá que escribirlos otra vez.
  }
}

/* ── Cálculos ───────────────────────────────────────────────────────── */

/** Unidades totales (para el contador del ícono del carrito). */
export function contarUnidades(items: ItemCarrito[]): number {
  return items.reduce((total, item) => total + item.cantidad, 0);
}

/**
 * Subtotal en COP de los productos CON precio, y cuántos productos
 * distintos tienen el precio "a consultar".
 */
export function calcularSubtotal(items: ItemCarrito[]): {
  subtotal: number;
  sinPrecio: number;
} {
  let subtotal = 0;
  let sinPrecio = 0;
  for (const item of items) {
    if (item.precio === null) sinPrecio += 1;
    else subtotal += item.precio * item.cantidad;
  }
  return { subtotal, sinPrecio };
}

/* ── Mensaje de WhatsApp ────────────────────────────────────────────── */

/** Una línea del pedido: "• 2 × Marca Nombre (100ml) — $ 378.000". */
function lineaPedido(item: ItemCarrito): string {
  const volumen = item.volumen ? ` (${item.volumen})` : "";
  const precio =
    item.precio === null
      ? "precio a consultar"
      : formatPrecio(item.precio * item.cantidad);
  return `• ${item.cantidad} × ${item.marca} ${item.nombre}${volumen} — ${precio}`;
}

/**
 * Texto completo del pedido para WhatsApp. Los productos que se pasen
 * aquí deben ser solo los disponibles (el cajón excluye los agotados).
 *
 * El texto se mantiene por debajo de MAX_MENSAJE caracteres: los enlaces
 * de WhatsApp muy largos fallan en algunos teléfonos. Si no caben todos
 * los productos, la lista se corta con "• y N productos más".
 */
export function armarMensajePedido(items: ItemCarrito[], datos: DatosPedido): string {
  const cabecera = `Hola ${SITE_SHORT_NAME}, quiero hacer este pedido:`;

  const pie: string[] = [];
  const { subtotal } = calcularSubtotal(items);
  if (items.some((item) => item.precio !== null)) {
    pie.push(`Subtotal: ${formatPrecio(subtotal)}`);
  }
  const nombre = datos.nombre.trim();
  const ciudad = datos.ciudad.trim();
  const datosTexto = [nombre && `Nombre: ${nombre}`, ciudad && `Ciudad: ${ciudad}`]
    .filter(Boolean)
    .join(" / ");
  if (datosTexto) pie.push(datosTexto);

  // Se añaden líneas mientras quepan, dejando sitio para el aviso de corte.
  const reservado = cabecera.length + pie.join("\n").length + 40;
  const lineas: string[] = [];
  let largo = reservado;
  for (let i = 0; i < items.length; i += 1) {
    const linea = lineaPedido(items[i]);
    if (largo + linea.length + 1 > MAX_MENSAJE) {
      const restantes = items.length - i;
      lineas.push(`• y ${restantes} ${restantes === 1 ? "producto más" : "productos más"}`);
      break;
    }
    lineas.push(linea);
    largo += linea.length + 1;
  }

  return [cabecera, ...lineas, ...pie].join("\n");
}

/** Enlace de WhatsApp con el pedido ya escrito. */
export function enlacePedido(items: ItemCarrito[], datos: DatosPedido): string {
  return whatsappUrl(armarMensajePedido(items, datos));
}
