/**
 * src/components/layout/Footer.tsx — Pie de página.
 *
 * QUÉ ES
 *   El bloque final de todas las páginas: marca y lema, enlaces rápidos,
 *   datos de contacto con WhatsApp, redes sociales y la línea de copyright.
 *
 * POR QUÉ EXISTE
 *   Sustituye al <footer> del index.html antiguo (y a su copia en
 *   components/footer.html, que estaban duplicados y desincronizados).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/layout.tsx después del contenido de cada página.
 *   - Los enlaces rápidos reutilizan NAV_LINKS (src/lib/site.ts), la misma
 *     lista del Header.
 *   - El número y el enlace de WhatsApp vienen también de site.ts
 *     (CLAUDE.md §11.3): no se escriben a mano aquí.
 *   - Es un componente de servidor (sin "use client"): no tiene estado ni
 *     eventos, así que no envía JavaScript al navegador.
 *   - PENDIENTE: los enlaces de Instagram, Facebook y TikTok son
 *     marcadores (href="#") hasta que existan los perfiles reales.
 */
import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import {
  NAV_LINKS,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_TAGLINE,
  WHATSAPP_DISPLAY,
  WHATSAPP_URL,
} from "@/lib/site";

/** Redes sociales. Los href son marcadores hasta tener los perfiles reales. */
const SOCIAL_LINKS = [
  { label: "Instagram", href: "#", Icon: InstagramIcon },
  { label: "Facebook", href: "#", Icon: FacebookIcon },
  { label: "TikTok", href: "#", Icon: TikTokIcon },
];

/** Estilo de los títulos de cada columna. */
const columnTitle =
  "mb-5 text-xs font-medium uppercase tracking-[0.25em] text-gold";

/** Estilo de los enlaces de texto del footer. */
const footerLink =
  "text-sm font-light text-ink-muted transition-colors duration-200 hover:text-gold-light";

export default function Footer() {
  return (
    <footer className="border-t border-gold/15 bg-dark-deep">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr]">
        {/* Columna 1: marca, lema y redes */}
        <div>
          <p className="font-serif text-4xl font-medium text-gold">
            {SITE_SHORT_NAME}
          </p>
          <p className="mt-2 font-serif text-lg italic text-gold-light">
            {SITE_TAGLINE}
          </p>
          <p className="mt-5 max-w-sm text-sm font-light leading-relaxed text-ink-muted">
            Fragancias para quienes aprecian lo extraordinario. Las mejores
            marcas del mundo, en Colombia.
          </p>

          <ul className="mt-6 flex gap-3">
            {SOCIAL_LINKS.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 text-ink-muted transition-colors duration-200 hover:border-gold hover:text-gold-light"
                >
                  <Icon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Columna 2: enlaces rápidos */}
        <nav aria-label="Enlaces rápidos">
          <h2 className={columnTitle}>Enlaces rápidos</h2>
          <ul className="space-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link href={link.href} className={footerLink}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Columna 3: contacto */}
        <div>
          <h2 className={columnTitle}>Contacto</h2>
          <address className="space-y-3 not-italic">
            <p className="text-sm font-light text-ink-muted">Colombia</p>
            <p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${footerLink} inline-flex items-center gap-2`}
              >
                <WhatsAppIcon className="h-4 w-4 text-whatsapp" aria-hidden="true" />
                {WHATSAPP_DISPLAY}
              </a>
            </p>
            <p className="text-sm font-light text-ink-muted">
              Lun – Sáb: 9am – 7pm
            </p>
          </address>
        </div>
      </div>

      {/* Franja inferior: copyright */}
      <div className="border-t border-gold/10">
        <p className="mx-auto max-w-7xl px-5 py-6 text-center text-xs font-light text-ink-muted sm:px-8">
          © 2026 {SITE_NAME}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
