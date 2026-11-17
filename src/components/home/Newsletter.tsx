"use client";

/**
 * src/components/home/Newsletter.tsx — Sección de suscripción por correo.
 *
 * QUÉ ES
 *   Un formulario con un campo de correo y un botón "Suscribirse".
 *
 * POR QUÉ EXISTE
 *   Recupera el concepto de la sección "Únete a la Experiencia" del sitio
 *   anterior (index.html + submitNL() en js/main.js), con la estética
 *   oscura de la v2.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/page.tsx, después de Categories.
 *   - Necesita "use client" porque maneja el envío del formulario y un
 *     estado (si ya se envió o no).
 *   - IMPORTANTE: todavía NO guarda el correo en ningún sitio. No hay
 *     backend. Al enviar solo muestra un aviso honesto de que la función
 *     estará disponible pronto. La conexión real (Supabase) está prevista
 *     para la Fase 2; el punto exacto está marcado con un TODO abajo.
 */
import { useState, type FormEvent } from "react";
import { MailIcon } from "@/components/ui/icons";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { SITE_SHORT_NAME } from "@/lib/site";

export default function Newsletter() {
  /** true después de pulsar "Suscribirse": muestra el aviso. */
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // evita que el navegador recargue la página
    // TODO (Fase 2): guardar el correo en Supabase aquí.
    setSubmitted(true);
  };

  return (
    <section className="bg-dark-deep px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-2xl">
        <Reveal className="mb-6 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 text-gold">
            <MailIcon className="h-6 w-6" aria-hidden="true" />
          </span>
        </Reveal>

        <SectionHeading
          title={`Únete a la experiencia ${SITE_SHORT_NAME}`}
          subtitle="Sé el primero en conocer nuevas fragancias, ofertas exclusivas y eventos especiales."
        />

        <Reveal delay={0.15} className="mt-10">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="Tu correo electrónico"
              className="min-w-0 flex-1 rounded-lg border border-gold/25 bg-dark-secondary px-5 py-4 text-base font-light text-ink placeholder:text-ink-muted/70 transition-colors duration-200 focus:border-gold focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-gold px-8 py-4 text-xs font-medium uppercase tracking-[0.2em] text-dark-secondary transition-colors duration-300 hover:bg-gold-light"
            >
              Suscribirse
            </button>
          </form>

          {/* aria-live: los lectores de pantalla anuncian el aviso al aparecer */}
          <p
            aria-live="polite"
            className="mt-4 min-h-6 text-center text-sm font-light italic text-gold-light"
          >
            {submitted && "Función disponible próximamente."}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
