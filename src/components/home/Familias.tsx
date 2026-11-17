/**
 * src/components/home/Familias.tsx — Sección "Explora por familia olfativa".
 *
 * QUÉ ES
 *   Cuatro tarjetas con forma de arco, cada una con un video o una imagen,
 *   el nombre de una familia de aromas y una frase corta. Cada tarjeta
 *   lleva al catálogo filtrado por esa familia.
 *
 * POR QUÉ EXISTE
 *   Mucha gente no sabe qué perfume busca, pero sí qué tipo de aroma le
 *   gusta ("algo fresco", "algo dulce"). Esta sección les da una puerta de
 *   entrada al catálogo por sensaciones, y el video transmite el aroma
 *   mejor que una foto.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/page.tsx, justo después de Featured, y le
 *     pasa los datos ya leídos de la tabla contenido_portada
 *     (getContenidoPortada() en src/lib/portada.ts). Desde la Fase 5B los
 *     títulos, textos, palabras del filtro y medios se cambian en el panel,
 *     en /admin/portada; si la tabla falla, llegan los originales
 *     (DEFAULTS_PORTADA).
 *   - El medio de cada arco lo dibuja MedioArco (video con AmbientVideo, o
 *     imagen), con el mismo encuadre en los dos casos.
 *   - Los enlaces usan el filtro ?familia= del catálogo
 *     (src/app/(tienda)/catalogo/page.tsx), que busca familias que
 *     CONTIENEN la palabra (Fase 5A).
 *   - Entrada animada con Reveal (Framer Motion), escalonada por tarjeta.
 *   - Colores de tema: se ve bien en noche y en día.
 *
 * POR QUÉ ARCOS PEQUEÑOS (y no a todo lo ancho)
 *   Varios videos son de baja resolución (480 × 854). Estirados a todo el
 *   ancho de la pantalla se verían borrosos; por eso cada arco mide como
 *   máximo 280 px. En el móvil van en una cuadrícula de 2 × 2 (no en un
 *   carrusel): los cuatro se ven a la vez sin tener que deslizar.
 */
import Link from "next/link";
import MedioArco from "@/components/home/MedioArco";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import type { FamiliasPortada } from "@/types/portada";

export default function Familias({ datos }: { datos: FamiliasPortada }) {
  return (
    <section
      id="familias"
      className="scroll-mt-20 bg-dark px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Por sensaciones"
          title="Explora por familia olfativa"
          subtitle="Elige el tipo de aroma que te gusta y descubre las fragancias que lo tienen."
        />

        <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
          {datos.tarjetas.map((item, indice) => (
            // key con el índice: la posición de cada tarjeta es fija (4) y
            // dos tarjetas podrían tener la misma palabra.
            <li key={indice} className="flex justify-center">
              <Reveal delay={0.1 * indice} className="w-full max-w-[280px]">
                <Link
                  href={`/catalogo?familia=${encodeURIComponent(item.palabra)}`}
                  className="group block"
                >
                  {/* Arco: rounded-t-full redondea la parte de arriba por
                      completo. aspect-[3/4]: más ancho que el video (9:16),
                      así object-cover recorta arriba y abajo. */}
                  <div className="relative aspect-[3/4] overflow-hidden rounded-t-full border border-gold/25 bg-dark-secondary transition-colors duration-300 group-hover:border-gold/70">
                    <MedioArco
                      medio={item.medio}
                      className="transition-transform duration-700 group-hover:scale-[1.12] motion-reduce:transition-none motion-reduce:group-hover:scale-[1.08]"
                    />
                  </div>
                  <h3 className="mt-4 text-center font-serif text-xl font-medium leading-tight text-ink sm:text-2xl">
                    {item.titulo}
                  </h3>
                  <p className="mt-1 text-center text-sm font-light leading-snug text-ink-muted">
                    {item.texto}
                  </p>
                  <p className="mt-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-gold-ink underline-offset-4 group-hover:underline">
                    Ver fragancias
                  </p>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
