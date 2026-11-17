/**
 * src/components/admin/estilos.ts — Recetas de clases del panel.
 *
 * QUÉ ES
 *   Las combinaciones de clases de Tailwind que se repiten en el panel de
 *   administración (campo de texto, etiqueta, botón primario, enlace,
 *   recuadros de aviso), guardadas como constantes.
 *
 * POR QUÉ EXISTE
 *   El panel tiene un tema CLARO, distinto del de la tienda, y varios
 *   formularios casi idénticos. Escribir las mismas veinte clases en cada
 *   uno acabaría en botones ligeramente distintos entre pantallas. Con las
 *   recetas aquí, cambiar el aspecto de todos los campos es editar una
 *   línea.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Los colores son los tokens `admin-*` de tailwind.config.ts, donde
 *     está anotado el contraste de cada uno. No hay hex sueltos.
 *   - Lo importan los formularios de src/components/admin/ y las páginas
 *     de src/app/admin/.
 *   - El anillo de foco (visible al navegar con teclado) no está aquí: lo
 *     define una sola vez src/app/admin/layout.tsx para todo el panel.
 *   - Estas clases NO se usan en la tienda, cuyas recetas están en
 *     .claude/skills/isabelee-design/SKILL.md.
 */

/** Etiqueta visible encima de cada campo. */
export const etiqueta = "block text-sm font-medium text-admin-text";

/**
 * Campo de texto. text-base (16 px) evita que los móviles amplíen la
 * página al tocarlo. Al recibir foco, el borde pasa al dorado oscuro.
 */
export const campoTexto =
  "mt-1.5 block w-full rounded-lg border border-admin-border-strong bg-admin-surface px-3.5 py-2.5 text-base text-admin-text placeholder:text-admin-muted focus:border-admin-gold-text";

/**
 * Botón primario: fondo dorado de marca con texto oscuro (7,21:1). El
 * borde en dorado oscuro delimita el botón sobre el fondo blanco, donde el
 * dorado solo no contrasta lo suficiente. Atenuado mientras se envía.
 */
export const botonPrimario =
  "inline-flex w-full items-center justify-center rounded-lg border border-admin-gold-text bg-admin-accent px-5 py-3 text-base font-medium text-admin-text transition-colors duration-200 hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60";

/** Botón secundario, de contorno (barra del panel). */
export const botonSecundario =
  "inline-flex items-center justify-center rounded-lg border border-admin-border-strong bg-admin-surface px-4 py-2 text-sm font-medium text-admin-text transition-colors duration-200 hover:border-admin-gold-text hover:text-admin-gold-text disabled:cursor-not-allowed disabled:opacity-60";

/** Enlace de texto: dorado oscuro, legible sobre blanco (5,79:1). */
export const enlace =
  "font-medium text-admin-gold-text underline underline-offset-4 transition-colors duration-200 hover:text-admin-text";

/** Recuadro de error. El rojo se reserva solo para esto. */
export const avisoError =
  "rounded-lg border border-admin-error/40 bg-admin-error-bg px-4 py-3 text-sm leading-relaxed text-admin-error";

/** Recuadro informativo: borde izquierdo dorado, como los de la tienda. */
export const avisoInfo =
  "rounded-lg border-l-[3px] border-admin-accent bg-admin-bg px-4 py-3 text-sm leading-relaxed text-admin-text";

/* ── Recetas añadidas en la Fase 3B (gestión de perfumes) ───────────── */

/** Texto de ayuda bajo un campo. */
export const ayuda = "mt-1.5 text-sm leading-relaxed text-admin-muted";

/** Mensaje de error bajo un campo concreto (se enlaza con aria-describedby). */
export const errorCampo = "mt-1.5 text-sm font-medium text-admin-error";

/**
 * Campo de texto cuando tiene un error: mismo aspecto, borde rojo.
 * Se usa EN LUGAR de campoTexto, no además.
 */
export const campoTextoError =
  "mt-1.5 block w-full rounded-lg border-2 border-admin-error bg-admin-surface px-3.5 py-2.5 text-base text-admin-text placeholder:text-admin-muted";

/** Tarjeta blanca que agrupa una sección del formulario o de la página. */
export const tarjeta =
  "rounded-lg border border-admin-border bg-admin-surface p-5 sm:p-6";

/** Título de sección dentro de una tarjeta. */
export const tituloSeccion = "font-serif text-2xl font-semibold text-admin-text";

/**
 * Botón primario de ancho natural (el de `botonPrimario` ocupa todo el
 * ancho, pensado para los formularios de acceso). min-h-11 = 44 px, el
 * tamaño mínimo cómodo para tocar con el dedo.
 */
export const botonPrimarioCompacto =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-admin-gold-text bg-admin-accent px-5 py-2.5 text-base font-medium text-admin-text transition-colors duration-200 hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60";

/** Botón de contorno de 44 px de alto, para acciones secundarias. */
export const botonContorno =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-admin-border-strong bg-admin-surface px-4 py-2 text-sm font-medium text-admin-text transition-colors duration-200 hover:border-admin-gold-text hover:text-admin-gold-text disabled:cursor-not-allowed disabled:opacity-60";

/** Botón de acción destructiva (eliminar). El rojo solo se usa para esto y los errores. */
export const botonPeligro =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-admin-error bg-admin-surface px-4 py-2 text-sm font-medium text-admin-error transition-colors duration-200 hover:bg-admin-error-bg disabled:cursor-not-allowed disabled:opacity-60";

/** Recuadro de confirmación (algo salió bien). Sin verde: borde dorado oscuro. */
export const avisoExito =
  "rounded-lg border border-admin-gold-text bg-admin-surface px-4 py-3 text-sm font-medium leading-relaxed text-admin-text";
