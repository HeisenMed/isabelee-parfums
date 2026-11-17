/**
 * src/lib/admin-rutas.ts — Rutas del panel de administración y validación
 * de redirecciones.
 *
 * QUÉ ES
 *   Las direcciones del panel escritas una sola vez (login, recuperar,
 *   crear contraseña...) y la función rutaAdminSegura(), que decide si una
 *   ruta recibida por la URL es de fiar para redirigir a ella.
 *
 * POR QUÉ EXISTE
 *   1. Para no repetir "/admin/login" como texto suelto en el middleware,
 *      las Server Actions y las páginas: si una ruta cambia, se cambia aquí.
 *   2. Por seguridad. Tras iniciar sesión se vuelve a la página que la
 *      persona quería ver, que viaja en la URL (?next=/admin/perfumes). Ese
 *      valor lo puede escribir cualquiera. Si se redirigiera a ciegas,
 *      alguien podría enviar un enlace legítimo del sitio que, tras el
 *      login, llevara a una página falsa de otro dominio. Ese fallo se
 *      llama "open redirect" (redirección abierta). rutaAdminSegura() lo
 *      impide: solo acepta rutas internas que empiecen por /admin.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - No importa nada: es código puro, sin cookies ni Supabase. Por eso lo
 *     pueden usar a la vez el middleware (src/middleware.ts), las acciones
 *     de servidor (src/app/admin/actions.ts), el manejador de enlaces de
 *     correo (src/app/auth/confirm/route.ts) y los componentes.
 */

/** Portada del panel. */
export const RUTA_PANEL = "/admin";
/** Formulario de inicio de sesión. */
export const RUTA_LOGIN = "/admin/login";
/** Formulario "olvidé mi contraseña". */
export const RUTA_RECUPERAR = "/admin/recuperar";
/** Formulario para crear o cambiar la contraseña (requiere sesión). */
export const RUTA_CREAR_CONTRASENA = "/admin/crear-contrasena";
/**
 * Manejador que cierra la sesión de quien entró sin ser administrador
 * (src/app/auth/sin-acceso/route.ts).
 */
export const RUTA_SIN_ACCESO = "/auth/sin-acceso";

/** Rutas del panel que se pueden ver SIN haber iniciado sesión. */
export const RUTAS_ADMIN_PUBLICAS: readonly string[] = [
  RUTA_LOGIN,
  RUTA_RECUPERAR,
];

/**
 * Devuelve `next` si es una ruta interna del panel; si no, `porDefecto`.
 *
 * Se acepta únicamente:
 *   - "/admin" exacto,
 *   - o algo que empiece por "/admin/" o "/admin?".
 * Así se descartan direcciones completas ("https://otro.sitio"), las que
 * empiezan por "//" (el navegador las trata como otro dominio), las que
 * solo se parecen ("/administrador") y cualquiera con barras invertidas o
 * caracteres de control, que algunos navegadores reinterpretan.
 */
export function rutaAdminSegura(
  next: string | null | undefined,
  porDefecto: string = RUTA_PANEL,
): string {
  if (!next) return porDefecto;

  const esDelPanel =
    next === RUTA_PANEL ||
    next.startsWith(`${RUTA_PANEL}/`) ||
    next.startsWith(`${RUTA_PANEL}?`);
  if (!esDelPanel) return porDefecto;

  // Barras invertidas, dobles barras y caracteres de control (códigos
  // 0-31 y 127): nunca forman parte de una ruta legítima del panel.
  if (next.includes("\\") || next.includes("//")) return porDefecto;
  for (let i = 0; i < next.length; i += 1) {
    const codigo = next.charCodeAt(i);
    if (codigo < 32 || codigo === 127) return porDefecto;
  }

  return next;
}
