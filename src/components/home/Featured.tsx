/**
 * src/components/home/Featured.tsx — Sección "Destacados" (marcador).
 *
 * QUÉ ES
 *   La sección que mostrará los perfumes destacados. Por ahora solo tiene
 *   título, subtítulo y un recuadro "Próximamente".
 *
 * POR QUÉ EXISTE
 *   Reserva el lugar y el estilo de la sección dentro de la página para
 *   que el diseño general se pueda revisar ya. En la Fase 2, el recuadro
 *   se sustituirá por tarjetas de producto leídas desde Supabase.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/page.tsx, justo debajo del Hero.
 *   - Su id="catalogo" es el destino del botón "Explorar Catálogo" del
 *     Hero y del enlace "Catálogo" del Header/Footer. Si se cambia el id,
 *     hay que cambiar también esos enlaces (src/lib/site.ts y Hero.tsx).
 *   - scroll-mt-20 deja un margen al saltar por ancla, para que el título
 *     no quede tapado por el Header fijo.
 *   - Componente de servidor: la animación la aporta <Reveal>.
 */
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

export default function Featured() {
  return (
    <section
      id="catalogo"
      className="scroll-mt-20 bg-dark-deep px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Selección de la casa"
          title="Destacados"
          subtitle="Las fragancias que más enamoran a nuestros clientes."
        />

        <Reveal delay={0.15} className="mt-14">
          <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-gold/25 bg-dark-secondary px-6 py-16 text-center">
            <p className="font-serif text-3xl italic text-gold-light sm:text-4xl">
              Próximamente
            </p>
            <p className="mt-3 text-sm font-light text-ink-muted">
              Estamos preparando la colección para ti.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
