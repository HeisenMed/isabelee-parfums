/**
 * src/components/home/Featured.tsx — Sección "Destacados" de la portada.
 *
 * QUÉ ES
 *   Una fila horizontal desplazable con seis perfumes y un enlace al
 *   catálogo completo.
 *
 * POR QUÉ EXISTE
 *   Da a la portada contenido real desde el primer scroll y sirve de
 *   puerta de entrada al catálogo. Sustituye al recuadro "Próximamente"
 *   de la Fase 1.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/page.tsx, justo debajo del Hero.
 *   - Es un componente de servidor ASÍNCRONO: pide los datos a Supabase
 *     con getPerfumes() (src/lib/perfumes.ts) mientras se genera la página,
 *     así el HTML ya llega con los perfumes.
 *   - Cada perfume se pinta con ProductCard, la misma tarjeta del catálogo.
 *   - Su id="destacados" es el destino de la flecha del Hero.
 *
 * QUÉ PERFUMES MUESTRA
 *   1. Hasta seis con el badge "Más Vendido".
 *   2. Si no hay ninguno con ese badge (hoy ningún perfume lo tiene), los
 *      seis primeros del catálogo.
 *   Para elegir los destacados a mano bastará con poner el badge
 *   "Más Vendido" a los perfumes deseados desde el panel de administración.
 *
 * SI NO HAY DATOS
 *   Si la base de datos está vacía o no responde, se muestra un recuadro
 *   "Próximamente" en lugar de una sección rota.
 */
import Link from "next/link";
import ProductCard from "@/components/product/ProductCard";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { getPerfumes } from "@/lib/perfumes";

/** Cuántos perfumes se muestran en la fila. */
const FEATURED_COUNT = 6;
/** Badge que marca un perfume como destacado. */
const FEATURED_BADGE = "Más Vendido";

export default async function Featured() {
  let perfumes = await getPerfumes({
    badge: FEATURED_BADGE,
    limit: FEATURED_COUNT,
  });
  if (perfumes.length === 0) {
    perfumes = await getPerfumes({ limit: FEATURED_COUNT });
  }

  return (
    <section
      id="destacados"
      className="scroll-mt-20 bg-dark-deep py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeading
          eyebrow="Selección de la casa"
          title="Destacados"
          subtitle="Las fragancias que más enamoran a nuestros clientes."
        />
      </div>

      {perfumes.length > 0 ? (
        <Reveal delay={0.15} className="mt-14">
          {/* Fila desplazable. snap-x hace que al soltar el dedo la fila se
              detenga alineada con una tarjeta. tabIndex permite desplazarla
              con el teclado. El padding lateral replica el margen de la
              página para que la primera tarjeta quede alineada con el título. */}
          <ul
            tabIndex={0}
            aria-label="Fragancias destacadas"
            className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-6 sm:scroll-px-8 sm:px-8"
          >
            {perfumes.map((perfume) => (
              <li
                key={perfume.id}
                className="w-[72vw] max-w-[280px] shrink-0 snap-start sm:w-[260px]"
              >
                <ProductCard perfume={perfume} sizes="280px" />
              </li>
            ))}
          </ul>

          <div className="mt-8 text-center">
            <Link
              href="/catalogo"
              className="inline-block rounded-lg border border-gold/50 px-8 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-gold transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-dark-secondary"
            >
              Ver todo el catálogo
            </Link>
          </div>
        </Reveal>
      ) : (
        <Reveal delay={0.15} className="mx-auto mt-14 max-w-7xl px-5 sm:px-8">
          <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-gold/25 bg-dark-secondary px-6 py-16 text-center">
            <p className="font-serif text-3xl italic text-gold-light sm:text-4xl">
              Próximamente
            </p>
            <p className="mt-3 text-sm font-light text-ink-muted">
              Estamos preparando la colección para ti.
            </p>
          </div>
        </Reveal>
      )}
    </section>
  );
}
