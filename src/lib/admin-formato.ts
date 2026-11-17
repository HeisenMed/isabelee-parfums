/**
 * src/lib/admin-formato.ts — Pequeñas utilidades de texto y números del panel.
 *
 * QUÉ ES
 *   Funciones puras (sin base de datos, sin cookies, sin React) que el
 *   panel necesita en varios sitios: comparar textos ignorando tildes,
 *   escribir números con puntos de millar y saber si un perfume tiene foto
 *   real.
 *
 * POR QUÉ EXISTE
 *   La lista de perfumes y el formulario se ejecutan en el navegador y no
 *   pueden importar src/lib/admin-perfumes.ts (que es solo de servidor).
 *   Aquí vive lo que ambos lados comparten, para no escribirlo dos veces.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan src/components/admin/ListaPerfumes.tsx (búsqueda y filtros),
 *     src/components/admin/FormularioPerfume.tsx (campos de precio) y
 *     src/app/admin/(panel)/page.tsx (contadores de la portada del panel).
 *   - PLACEHOLDER_IMAGE viene de src/lib/site.ts.
 */
import { PLACEHOLDER_IMAGE } from "@/lib/site";

/**
 * Texto sin tildes ni mayúsculas, para comparar. Vive en src/lib/busqueda.ts
 * (lo comparten la tienda y el panel) y se reexporta aquí para no cambiar
 * los imports del panel.
 */
export { normalizarTexto } from "@/lib/busqueda";

/** Deja solo los dígitos de lo que se haya escrito ("$ 189.000" → "189000"). */
export function soloDigitos(texto: string, maximo = 9): string {
  return texto.replace(/\D/g, "").slice(0, maximo);
}

/** Escribe unos dígitos con puntos de millar: "189000" → "189.000". */
export function conMiles(digitos: string): string {
  if (!digitos) return "";
  return Number(digitos).toLocaleString("es-CO");
}

/**
 * ¿El perfume tiene una foto propia? No la tiene si el campo está vacío o
 * si apunta a la imagen genérica.
 */
export function tieneFoto(imagen: string | null | undefined): boolean {
  return Boolean(imagen) && imagen !== PLACEHOLDER_IMAGE;
}
