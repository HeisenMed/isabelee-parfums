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
