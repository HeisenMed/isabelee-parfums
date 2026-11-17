/**
 * src/lib/busqueda.ts — Reglas de la búsqueda de perfumes por texto.
 *
 * QUÉ ES
 *   Funciones puras (sin base de datos, sin React) que deciden si un
 *   perfume coincide con lo que alguien escribió en el buscador.
 *
 * POR QUÉ EXISTE
 *   La misma búsqueda se hace en dos sitios y debe dar el MISMO resultado:
 *     - en el navegador, mientras se escribe (src/components/search/
 *       SearchOverlay.tsx);
 *     - en el servidor, en /catalogo?q=… (src/app/(tienda)/catalogo/page.tsx).
 *   Si cada uno tuviera su propia regla, "Ver todos los resultados" podría
 *   mostrar perfumes distintos de los que se veían en el buscador.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La búsqueda se hace SIEMPRE sobre una lista ya cargada (TypeScript),
 *     nunca dentro de una consulta SQL: el texto que escribe la persona no
 *     llega a la base de datos, así que no hay riesgo de inyección.
 *   - src/lib/admin-formato.ts reutiliza normalizarTexto() para el
 *     buscador del panel.
 *
 * CÓMO COMPARA
 *   - Sin tildes ni mayúsculas: "lancome", "Lancôme" y "LANCÔME" son
 *     iguales.
 *   - Por palabras: "dior sauvage" encuentra el perfume si "dior" y
 *     "sauvage" aparecen las dos (en cualquier orden) en el nombre o la
 *     marca.
 */

/** Longitud máxima del texto de búsqueda que se tiene en cuenta. */
export const MAX_BUSQUEDA = 80;

/**
 * Deja un texto listo para comparar: en minúsculas y sin tildes ni
 * diéresis. normalize("NFD") separa cada letra de su tilde ("é" → "e" +
 * "´") y la expresión regular borra esas tildes sueltas (el rango Unicode
 * U+0300–U+036F, los "signos diacríticos combinables").
 */
export function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Palabras de la búsqueda, ya normalizadas. Vacío = no hay búsqueda. */
export function palabrasDeBusqueda(texto: string): string[] {
  return normalizarTexto(texto.slice(0, MAX_BUSQUEDA))
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * ¿El perfume coincide con todas las palabras? `palabras` debe venir de
 * palabrasDeBusqueda(). Sin palabras, todo coincide.
 */
export function coincideBusqueda(
  perfume: { nombre: string; marca: string },
  palabras: string[],
): boolean {
  if (palabras.length === 0) return true;
  const texto = normalizarTexto(`${perfume.nombre} ${perfume.marca}`);
  return palabras.every((palabra) => texto.includes(palabra));
}
