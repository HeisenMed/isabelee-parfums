/**
 * src/components/home/Entrega.tsx — Sección "Así llega tu fragancia".
 *
 * QUÉ ES
 *   Un bloque de dos columnas: a un lado, un video o una imagen en marco
 *   de arco; al otro, tres motivos de confianza (por defecto: originales,
 *   empaque, envíos) y un botón para escribir por WhatsApp.
 *
 * POR QUÉ EXISTE
 *   Comprar perfume por internet genera dudas: ¿es original?, ¿llegará
 *   bien? Esta sección las responde justo antes de la llamada final a
 *   escribir por WhatsApp, con imágenes reales del producto llegando.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/page.tsx, justo antes de WhatsAppCta, y le
 *     pasa los datos de la tabla contenido_portada (getContenidoPortada()
 *     en src/lib/portada.ts). El título, los tres puntos y el medio se
 *     editan en el panel (/admin/portada), donde se recuerda publicar
 *     solo lo que sea cierto para el negocio.
 *   - El antetítulo y el texto del botón siguen fijos aquí (TEXTOS_FIJOS).
 *   - El medio lo dibuja MedioArco (video con AmbientVideo, o imagen).
 *   - El enlace de WhatsApp es WHATSAPP_MESSAGE_URL (src/lib/site.ts).
 *   - Íconos SVG de src/components/ui/icons.tsx, uno por posición (sello,
 *     regalo, camión); entrada con Reveal.
 *   - Colores de tema: se ve bien en noche y en día.
 */
import MedioArco from "@/components/home/MedioArco";
import { GiftIcon, SealIcon, TruckIcon, WhatsAppIcon } from "@/components/ui/icons";
import Reveal from "@/components/ui/Reveal";
import { WHATSAPP_MESSAGE_URL } from "@/lib/site";
import type { EntregaPortada } from "@/types/portada";

/** Textos que no se editan desde el panel. */
const TEXTOS_FIJOS = {
  antetitulo: "Compra con confianza",
  boton: "Pregunta por tu envío",
};

/** Ícono de cada punto, por posición (el panel no los cambia). */
const ICONOS = [SealIcon, GiftIcon, TruckIcon];

export default function Entrega({ datos }: { datos: EntregaPortada }) {
  return (
    <section
      id="entrega"
      className="scroll-mt-20 bg-dark-deep px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:gap-16">
        {/* Medio en arco. Máximo 320 px: los videos son de baja resolución
            y más grandes se verían borrosos. */}
        <Reveal className="mx-auto w-full max-w-[280px] md:max-w-[320px]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-full border border-gold/25 bg-dark-secondary">
            <MedioArco medio={datos.medio} sizes="320px" />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold-light">
              {TEXTOS_FIJOS.antetitulo}
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">
              {datos.titulo}
            </h2>
          </Reveal>

          <ul className="mt-8 space-y-6">
            {datos.puntos.map(({ titulo, texto }, indice) => {
              const Icono = ICONOS[indice] ?? SealIcon;
              return (
                <li key={indice}>
                  <Reveal delay={0.1 * (indice + 1)} className="flex gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/35 text-gold-ink">
                      <Icono className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-serif text-xl font-medium text-ink">{titulo}</h3>
                      <p className="mt-1 text-base font-light leading-relaxed text-ink-muted">
                        {texto}
                      </p>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ul>

          <Reveal delay={0.4} className="mt-9">
            <a
              href={WHATSAPP_MESSAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-lg bg-gold px-7 py-4 text-xs font-medium uppercase tracking-[0.18em] text-on-gold transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-gold-bright hover:shadow-[0_10px_26px_rgba(201,168,76,0.3)] motion-reduce:hover:translate-y-0"
            >
              <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
              {TEXTOS_FIJOS.boton}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
