/**
 * src/components/home/Entrega.tsx — Sección "Así llega tu fragancia".
 *
 * QUÉ ES
 *   Un bloque de dos columnas: a un lado, un video en marco de arco con
 *   unas manos desempacando un perfume; al otro, tres motivos de confianza
 *   (originales, empaque, envíos) y un botón para escribir por WhatsApp.
 *
 * POR QUÉ EXISTE
 *   Comprar perfume por internet genera dudas: ¿es original?, ¿llegará
 *   bien? Esta sección las responde justo antes de la llamada final a
 *   escribir por WhatsApp, con imágenes reales del producto llegando.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/page.tsx, justo antes de WhatsAppCta.
 *   - El video se reproduce con AmbientVideo (solo a la vista, sin sonido).
 *   - El enlace de WhatsApp es WHATSAPP_MESSAGE_URL (src/lib/site.ts).
 *   - Íconos SVG de src/components/ui/icons.tsx; entrada con Reveal.
 *   - Colores de tema: se ve bien en noche y en día.
 */
import AmbientVideo from "@/components/ui/AmbientVideo";
import {
  GiftIcon,
  SealIcon,
  TruckIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import Reveal from "@/components/ui/Reveal";
import { WHATSAPP_MESSAGE_URL } from "@/lib/site";

/**
 * TEXTOS POR CONFIRMAR CON LA DUEÑA.
 * Son una propuesta: no se han validado (por ejemplo, si de verdad se
 * envía a TODA Colombia o con qué transportadoras). Cámbialos aquí.
 */
const TEXTOS = {
  antetitulo: "Compra con confianza",
  titulo: "Así llega tu fragancia",
  puntos: [
    {
      icono: SealIcon,
      titulo: "Fragancias originales",
      texto: "Trabajamos solo con perfumes originales, sellados de fábrica.",
    },
    {
      icono: GiftIcon,
      titulo: "Empaque cuidado",
      texto: "Cada pedido va protegido para que llegue perfecto, listo para regalar.",
    },
    {
      icono: TruckIcon,
      titulo: "Envíos a toda Colombia",
      texto: "Te acompañamos por WhatsApp desde el pedido hasta la entrega.",
    },
  ],
  boton: "Pregunta por tu envío",
};

export default function Entrega() {
  return (
    <section
      id="entrega"
      className="scroll-mt-20 bg-dark-deep px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] md:gap-16">
        {/* Video en arco. Máximo 320 px: el video es de 480 × 854 y más
            grande se vería borroso. */}
        <Reveal className="mx-auto w-full max-w-[280px] md:max-w-[320px]">
          <div className="relative aspect-[3/4] overflow-hidden rounded-t-full border border-gold/25 bg-dark-secondary">
            <AmbientVideo
              src="/videos/manos-desempacando.mp4"
              poster="/videos/posters/manos-desempacando.webp"
            />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold-light">
              {TEXTOS.antetitulo}
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">
              {TEXTOS.titulo}
            </h2>
          </Reveal>

          <ul className="mt-8 space-y-6">
            {TEXTOS.puntos.map(({ icono: Icono, titulo, texto }, indice) => (
              <li key={titulo}>
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
            ))}
          </ul>

          <Reveal delay={0.4} className="mt-9">
            <a
              href={WHATSAPP_MESSAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-lg bg-gold px-7 py-4 text-xs font-medium uppercase tracking-[0.18em] text-on-gold transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-gold-bright hover:shadow-[0_10px_26px_rgba(201,168,76,0.3)] motion-reduce:hover:translate-y-0"
            >
              <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
              {TEXTOS.boton}
            </a>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
