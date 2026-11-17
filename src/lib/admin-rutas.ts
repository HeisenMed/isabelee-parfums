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
/** Cambio de contraseña desde dentro del panel (no necesita correo). */
export const RUTA_CAMBIAR_CONTRASENA = "/admin/cambiar-contrasena";
/** Lista de perfumes del panel. */
export const RUTA_PERFUMES = "/admin/perfumes";
/** Editor de la portada (Fase 5B). */
export const RUTA_PORTADA = "/admin/portada";
/** Formulario de perfume nuevo. */
export const RUTA_PERFUME_NUEVO = "/admin/perfumes/nuevo";

/** Formulario de edición de un perfume concreto. */
export function rutaPerfume(id: number): string {
  return `${RUTA_PERFUMES}/${id}`;
}

/**
 * ¿Está activa la recuperación de contraseña por correo?
 *
 * HOY: false. El proyecto de Supabase no tiene un servidor de correo propio
 * —SMTP (Simple Mail Transfer Protocol, el protocolo con el que se envían
 * los correos)—, y el servicio de correo de prueba que trae Supabase solo
 * entrega unos pocos mensajes por hora y únicamente a miembros del equipo.
 * Los enlaces de "olvidé mi contraseña" y de invitación, por tanto, no
 * llegan. Mientras tanto las cuentas se crean en el Dashboard de Supabase
 * ya con contraseña, y cada administradora la cambia desde el panel
 * (/admin/cambiar-contrasena).
 *
 * Con false:
 *   - el login oculta "¿Olvidaste tu contraseña?";
 *   - /admin/recuperar redirige a /admin/login;
 *   - /admin/crear-contrasena redirige a /admin/cambiar-contrasena (con
 *     sesión) o a /admin/login (sin ella).
 * El código de recuperación NO se borró, solo está desactivado: siguen en
 * su sitio RecuperarForm, CrearContrasenaForm, las acciones
 * solicitarRecuperacion() y crearContrasena() y /auth/confirm.
 *
 * PONER EN true SOLO CUANDO existan las dos cosas:
 *   1. un SMTP propio configurado en Supabase (por ejemplo Resend), y
 *   2. un dominio propio desde el que enviar y al que apunten los enlaces
 *      (Site URL y plantillas de correo: ver supabase/README.md).
 */
export const RECUPERACION_POR_CORREO: boolean = false;
/**
 * Manejador que cierra la sesión de quien entró sin ser administrador
 * (src/app/auth/sin-acceso/route.ts).
 */
export const RUTA_SIN_ACCESO = "/auth/sin-acceso";

/**
 * Rutas del panel que se pueden ver SIN haber iniciado sesión.
 * /admin/recuperar sigue aquí aunque la recuperación esté desactivada: sin
 * sesión, la propia página redirige al login.
 */
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
