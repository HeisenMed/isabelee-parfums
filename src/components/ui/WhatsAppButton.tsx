/**
 * src/components/ui/WhatsAppButton.tsx — Botón flotante de WhatsApp.
 *
 * QUÉ ES
 *   El círculo verde fijo en la esquina inferior derecha que abre un chat
 *   de WhatsApp con el negocio, con un mensaje ya escrito.
 *
 * POR QUÉ EXISTE
 *   Es el acceso permanente al canal de venta: está visible en cualquier
 *   punto de la página. Sustituye al <a class="wa-btn"> del index.html
 *   antiguo y a sus estilos en css/style.css.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/(tienda)/layout.tsx, así aparece en todas las páginas.
 *   - La URL viene de WHATSAPP_MESSAGE_URL (src/lib/site.ts).
 *   - El pulso es la animación .wa-pulse de src/app/globals.css, que se
 *     detiene al pasar el cursor y con prefers-reduced-motion.
 *   - Es la ÚNICA pieza del sitio que usa el verde #25D366 como fondo
 *     (token `whatsapp`), tal como exige CLAUDE.md §10.1.
 *   - Posición: 16 px del borde (24 px desde 640 px) más el margen seguro
 *     de los iPhone con barra inferior (env(safe-area-inset-*)). Encima
 *     se apila el botón de compartir (src/components/ui/ShareButton.tsx),
 *     calculado a partir de estas mismas medidas: si cambias una, revisa
 *     la otra.
 *   - z-40: queda por debajo del Header (z-50), del menú móvil y del modal
 *     de bienvenida, para no taparlos.
 *   - Componente de servidor: es solo un enlace con CSS.
 */
import { WhatsAppIcon } from "@/components/ui/icons";
import { WHATSAPP_MESSAGE_URL } from "@/lib/site";

export default function WhatsAppButton() {
  return (
    <a
      href={WHATSAPP_MESSAGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="wa-pulse group fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-40 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-whatsapp shadow-[0_4px_16px_rgba(37,211,102,0.35)] transition-transform duration-300 hover:scale-110 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] sm:right-[calc(1.5rem+env(safe-area-inset-right))] sm:h-14 sm:w-14"
    >
      {/* Etiqueta "¿Necesitas ayuda?": solo en dispositivos con cursor,
          porque en táctil no existe el hover y solo estorbaría. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 translate-x-2 whitespace-nowrap rounded-md border border-gold/20 bg-dark-secondary px-3 py-2 text-xs tracking-wide text-ink opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 [@media(hover:hover)]:block"
      >
        ¿Necesitas ayuda?
      </span>

      <WhatsAppIcon className="h-7 w-7 text-white" aria-hidden="true" />
    </a>
  );
}
