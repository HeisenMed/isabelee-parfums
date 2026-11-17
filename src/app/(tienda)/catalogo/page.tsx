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
 */
import type { Metadata } from "next";
import Link from "next/link";
import CatalogFilters from "@/components/product/CatalogFilters";
import ProductCard from "@/components/product/ProductCard";
import SortSelect from "@/components/product/SortSelect";
import {
  getFamilias,
  getMarcas,
  getPerfumes,
  hayPreciosPublicados,
} from "@/lib/perfumes";
import { SITE_NAME } from "@/lib/site";
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
  const familia = first(params.familia);
  const precioMin = parsePrecio(params.min);
  const precioMax = parsePrecio(params.max);
  const orden = parseOrden(params.orden);

  // Las cuatro consultas son independientes: se lanzan a la vez.
  const [perfumes, marcas, familias, mostrarPrecio] = await Promise.all([
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

  const hayFiltros =
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
              {hayFiltros && (
                <Link
                  href="/catalogo"
                  className="mt-6 inline-block text-sm font-light text-gold-ink underline underline-offset-4 transition-colors duration-200 hover:text-gold-light"
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
