/**
 * src/components/home/WhatsAppCta.tsx — Llamado a escribir por WhatsApp.
 *
 * QUÉ ES
 *   Un recuadro destacado al final de la portada que invita a escribir
 *   por WhatsApp a quien no encontró la fragancia que buscaba.
 *
 * POR QUÉ EXISTE
 *   WhatsApp es el canal de venta del negocio: los pedidos se cierran por
 *   ahí. Esta sección recoge a quien recorrió toda la página sin decidirse.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/page.tsx como última sección antes del Footer.
 *   - Su id="contacto" es el destino del enlace "Contacto" del Header y el
 *     Footer (src/lib/site.ts).
 *   - El enlace usa WHATSAPP_MESSAGE_URL (src/lib/site.ts), con el mensaje
 *     prellenado; nunca se escribe el número a mano aquí.
 *   - Sigue el estilo "callout" de CLAUDE.md §10.4: fondo dorado al 10 % y
 *     borde izquierdo dorado.
 *   - Componente de servidor: no tiene estado ni eventos.
 */
import { WhatsAppIcon } from "@/components/ui/icons";
import Reveal from "@/components/ui/Reveal";
import { WHATSAPP_MESSAGE_URL } from "@/lib/site";

export default function WhatsAppCta() {
  return (
    <section
      id="contacto"
      className="scroll-mt-20 bg-dark px-5 py-24 sm:px-8 sm:py-28"
    >
      <Reveal className="mx-auto max-w-4xl">
        <div className="flex flex-col items-start gap-8 rounded-lg border-l-[3px] border-gold bg-gold/10 px-7 py-10 sm:px-12 sm:py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-medium leading-tight text-ink sm:text-4xl">
              ¿No encuentras tu fragancia?
            </h2>
            <p className="mt-3 max-w-md text-base font-light italic leading-relaxed text-gold-light">
              Escríbenos y te ayudamos a encontrarla.
            </p>
          </div>

          <a
            href={WHATSAPP_MESSAGE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-3 rounded-lg bg-gold px-7 py-4 text-xs font-medium uppercase tracking-[0.18em] text-dark-secondary transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-gold-light hover:shadow-[0_10px_26px_rgba(201,168,76,0.3)]"
          >
            <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
            Escríbenos por WhatsApp
          </a>
        </div>
      </Reveal>
    </section>
  );
}
