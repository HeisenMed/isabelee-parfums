/**
 * src/components/ui/SectionHeading.tsx — Encabezado estándar de sección.
 *
 * QUÉ ES
 *   El bloque "antetítulo + título + subtítulo" centrado que abre cada
 *   sección de la página de inicio.
 *
 * POR QUÉ EXISTE
 *   Para que todas las secciones compartan la misma jerarquía tipográfica
 *   (CLAUDE.md §10.2): antetítulo pequeño en mayúsculas doradas, título en
 *   Cormorant Garamond y subtítulo en Jost gris. Si se ajusta el estilo,
 *   se ajusta aquí y cambia en todas las secciones a la vez.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan Featured, Categories, Newsletter y WhatsAppCta
 *     (src/components/home/).
 *   - Envuelve su contenido en <Reveal> para aparecer suavemente al hacer
 *     scroll.
 *   - Las fuentes y colores vienen de tailwind.config.ts.
 */
import Reveal from "./Reveal";

type SectionHeadingProps = {
  /** Texto corto en mayúsculas sobre el título. Opcional. */
  eyebrow?: string;
  /** Título de la sección. */
  title: string;
  /** Frase de apoyo bajo el título. Opcional. */
  subtitle?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: SectionHeadingProps) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-gold-light">
          {eyebrow}
        </p>
      )}
      <h2 className="font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base font-light leading-relaxed text-ink-muted sm:text-lg">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
