/**
 * src/app/(tienda)/catalogo/page.tsx — Página del catálogo (ruta "/catalogo").
 *
 * QUÉ ES
 *   La lista completa de perfumes, con filtros a la izquierda (o en un
 *   panel deslizante en móvil), selector de orden y rejilla de tarjetas.
 *
 * POR QUÉ EXISTE
 *   Sustituye a la <section id="catalogo"> del index.html v1 y a
 *   js/products.js + js/filters.js. Ahora es una página propia, con su
 *   URL, y los datos vienen de Supabase en lugar de un archivo.
 *
 * CÓMO FUNCIONA (flujo completo de un filtro)
 *   1. La persona marca "Mujer" en CatalogFilters (componente de cliente).
 *   2. Ese componente cambia la URL a /catalogo?genero=Mujer.
 *   3. Next.js vuelve a ejecutar ESTA función en el servidor con los
 *      nuevos `searchParams`.
 *   4. Aquí se validan los parámetros y se piden los perfumes a
 *      getPerfumes() (src/lib/perfumes.ts), que filtra en la base de datos.
 *   5. El HTML resultante llega al navegador ya con los perfumes dentro:
 *      eso es SSR, y es lo que permite a Google leer el catálogo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Datos: getPerfumes, getMarcas, getFamilias, hayPreciosPublicados
 *     (src/lib/perfumes.ts).
 *   - Interfaz: CatalogFilters, SortSelect y ProductCard
 *     (src/components/product/).
 *   - Llegan aquí el menú (src/lib/site.ts), el botón del Hero y las
 *     tarjetas de categoría de la portada (?genero=Hombre, etc.).
 *   - Como lee `searchParams`, Next la renderiza en cada visita: siempre
 *     muestra los datos actuales de la base de datos.
 *
 * SEGURIDAD
 *   Nada de lo que llega por la URL se usa sin validar: las categorías y
 *   el orden deben estar en listas cerradas, y los precios deben ser
 *   números. Un valor inesperado simplemente se ignora.
 *   - familia: solo letras, espacios y ( ) / - (máx. 60). Se busca con
 *     "contiene" en la base de datos (ilike); la lista de caracteres
 *     permitidos impide que un %, _ o * del visitante actúe como comodín.
 *   - q: el texto de búsqueda NO llega a la base de datos. Se filtra aquí,
 *     en TypeScript, sobre los perfumes ya leídos (src/lib/busqueda.ts),
 *     así que no hay riesgo de inyección.
 *
 * BÚSQUEDA ?q= (Fase 5A)
 *   /catalogo?q=sauvage filtra por nombre o marca, sin tildes ni
 *   mayúsculas, con la MISMA regla que el buscador del Header. Se combina
 *   con los demás filtros y con el orden. Arriba se muestra "Resultados
 *   para «sauvage»" con un enlace para quitar la búsqueda; sin
 *   resultados, se ofrece preguntar por WhatsApp con el texto buscado.
 */
import type { Metadata } from "next";
import Link from "next/link";
import CatalogFilters from "@/components/product/CatalogFilters";
import { WhatsAppIcon } from "@/components/ui/icons";
import { coincideBusqueda, MAX_BUSQUEDA, palabrasDeBusqueda } from "@/lib/busqueda";
import ProductCard from "@/components/product/ProductCard";
import SortSelect from "@/components/product/SortSelect";
import {
  getFamilias,
  getMarcas,
  getPerfumes,
  hayPreciosPublicados,
} from "@/lib/perfumes";
import { SITE_NAME, SITE_SHORT_NAME, whatsappUrl } from "@/lib/site";
import {
  GENEROS,
  ORDENES,
  type Genero,
  type OrdenCatalogo,
} from "@/types/perfume";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    `Explora el catálogo completo de ${SITE_NAME}: perfumes para hombre, mujer y unisex de las mejores marcas del mundo, disponibles en Colombia.`,
};

/** Un parámetro de URL puede venir una vez, varias veces o no venir. */
type RawParam = string | string[] | undefined;

type CatalogoPageProps = {
  // En Next.js 15 los parámetros de búsqueda llegan como una promesa.
  searchParams: Promise<Record<string, RawParam>>;
};

/* ── Validación de los parámetros de la URL ─────────────────────────── */

/** Primer valor de un parámetro, recortado; "" si no viene. */
const first = (value: RawParam): string =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? "";

/** Categorías válidas presentes en ?genero=...; el resto se descarta. */
function parseGeneros(value: RawParam): Genero[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return GENEROS.filter((genero) =>
    raw.some((item) => item.toLowerCase() === genero.toLowerCase()),
  );
}

/** Número no negativo, o undefined si el texto no es un número válido. */
function parsePrecio(value: RawParam): number | undefined {
  const text = first(value);
  if (!text) return undefined;
  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

/**
 * Familia olfativa válida, o "" si no cumple la forma esperada. Solo letras
 * (con tildes), espacios y los signos ( ) / - que aparecen en las familias
 * reales ("Ámbar / Oriental Especiada", "Oriental Vainilla (Gourmand)").
 */
function parseFamilia(value: RawParam): string {
  const text = first(value).slice(0, 60);
  return /^[\p{L}\s()/-]+$/u.test(text) ? text : "";
}

/** Texto de búsqueda (?q=), recortado a MAX_BUSQUEDA caracteres. */
function parseBusqueda(value: RawParam): string {
  return first(value).slice(0, MAX_BUSQUEDA).trim();
}

/** Orden válido, o "destacados" si el valor no está en la lista. */
function parseOrden(value: RawParam): OrdenCatalogo {
  const text = first(value);
  return ORDENES.find((orden) => orden.value === text)?.value ?? "destacados";
}

/* ── Página ─────────────────────────────────────────────────────────── */

export default async function CatalogoPage({ searchParams }: CatalogoPageProps) {
  const params = await searchParams;

  const generos = parseGeneros(params.genero);
  const marca = first(params.marca);
  const familia = parseFamilia(params.familia);
  const busqueda = parseBusqueda(params.q);
  const precioMin = parsePrecio(params.min);
  const precioMax = parsePrecio(params.max);
  const orden = parseOrden(params.orden);

  // Las cuatro consultas son independientes: se lanzan a la vez.
  const [todos, marcas, familias, mostrarPrecio] = await Promise.all([
    getPerfumes({
      generos,
      marca: marca || undefined,
      familia: familia || undefined,
      precioMin,
      precioMax,
      orden,
    }),
    getMarcas(),
    getFamilias(),
    hayPreciosPublicados(),
  ]);

  // Búsqueda por texto, sobre lo ya filtrado y ordenado (ver SEGURIDAD).
  const palabras = palabrasDeBusqueda(busqueda);
  const perfumes = todos.filter((perfume) => coincideBusqueda(perfume, palabras));

  // Enlace para quitar SOLO la búsqueda, conservando filtros y orden.
  const sinBusqueda = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (clave === "q" || valor === undefined) continue;
    for (const v of Array.isArray(valor) ? valor : [valor]) sinBusqueda.append(clave, v);
  }
  const hrefSinBusqueda = sinBusqueda.toString()
    ? `/catalogo?${sinBusqueda.toString()}`
    : "/catalogo";

  const hayFiltros =
    palabras.length > 0 ||
    generos.length > 0 ||
    Boolean(marca) ||
    Boolean(familia) ||
    precioMin !== undefined ||
    precioMax !== undefined;

  // Título según el contexto: "Perfumes para Mujer" si solo hay una categoría.
  const titulo =
    generos.length === 1
      ? generos[0] === "Unisex"
        ? "Perfumes Unisex"
        : `Perfumes para ${generos[0]}`
      : "Catálogo";

  return (
    // pt alto: deja sitio al Header fijo, que flota sobre la página.
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8 lg:pt-36">
      <header className="max-w-2xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-gold-light">
          {SITE_NAME}
        </p>
        <h1 className="font-serif text-5xl font-medium leading-tight text-ink sm:text-6xl">
          {titulo}
        </h1>
        <p className="mt-4 text-base font-light leading-relaxed text-ink-muted sm:text-lg">
          Las fragancias más vendidas del mundo, disponibles en Colombia.
        </p>
        {palabras.length > 0 && (
          <p className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-base text-ink">
            <span>
              Resultados para{" "}
              <span className="font-serif text-xl italic text-gold-light">«{busqueda}»</span>
            </span>
            <Link
              href={hrefSinBusqueda}
              className="text-sm font-light text-gold-ink underline underline-offset-4 transition-colors duration-200 hover:text-gold-light"
            >
              Quitar búsqueda
            </Link>
          </p>
        )}
      </header>

      <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <CatalogFilters
          marcas={marcas}
          familias={familias}
          mostrarPrecio={mostrarPrecio}
        />

        <section aria-label="Resultados">
          {/* Barra superior: cuántos resultados hay + orden */}
          <div className="mb-6 flex items-center justify-between gap-4 border-b border-gold/15 pb-4">
            {/* aria-live: el lector de pantalla anuncia el nuevo total al filtrar */}
            <p aria-live="polite" className="text-sm font-light text-ink-muted">
              <span className="font-medium text-ink">{perfumes.length}</span>{" "}
              {perfumes.length === 1 ? "fragancia" : "fragancias"}
            </p>
            <SortSelect />
          </div>

          {perfumes.length > 0 ? (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {perfumes.map((perfume, index) => (
                <li key={perfume.id}>
                  {/* Las 4 primeras (la fila visible al cargar) van con prioridad */}
                  <ProductCard perfume={perfume} priority={index < 4} />
                </li>
              ))}
            </ul>
          ) : (
            // Estado vacío: distinto mensaje según haya filtros o no.
            <div className="rounded-lg border border-gold/20 bg-dark-secondary px-6 py-16 text-center">
              <p className="font-serif text-3xl italic text-gold-light">
                {hayFiltros ? "Sin resultados" : "Catálogo en preparación"}
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm font-light leading-relaxed text-ink-muted">
                {hayFiltros
                  ? "Ninguna fragancia coincide con estos filtros. Prueba a quitar alguno."
                  : "Todavía no hay fragancias publicadas. Vuelve pronto."}
              </p>
              {/* Búsqueda sin resultados: ofrecer conseguirla por WhatsApp. */}
              {palabras.length > 0 && (
                <div className="mt-6">
                  <p className="font-serif text-xl text-ink">
                    ¿No encuentras tu fragancia? Pregúntanos por WhatsApp
                  </p>
                  <a
                    href={whatsappUrl(
                      `Hola ${SITE_SHORT_NAME}, busco el perfume «${busqueda}». ¿Lo tienen disponible?`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2.5 rounded-lg bg-gold px-6 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-on-gold transition-colors duration-300 hover:bg-gold-bright"
                  >
                    <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                    Preguntar por WhatsApp
                  </a>
                </div>
              )}
              {hayFiltros && (
                <Link
                  href="/catalogo"
                  className="mt-6 block text-sm font-light text-gold-ink underline underline-offset-4 transition-colors duration-200 hover:text-gold-light"
                >
                  Ver todo el catálogo
                </Link>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
