/**
 * src/components/home/Familias.tsx — Sección "Explora por familia olfativa".
 *
 * QUÉ ES
 *   Cuatro tarjetas con forma de arco, cada una con un video ambiental, el
 *   nombre de una familia de aromas y una frase corta. Cada tarjeta lleva
 *   al catálogo filtrado por esa familia.
 *
 * POR QUÉ EXISTE
 *   Mucha gente no sabe qué perfume busca, pero sí qué tipo de aroma le
 *   gusta ("algo fresco", "algo dulce"). Esta sección les da una puerta de
 *   entrada al catálogo por sensaciones, y el video transmite el aroma
 *   mejor que una foto.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/(tienda)/page.tsx, justo después de Featured.
 *   - Los videos se reproducen con AmbientVideo (src/components/ui/), que
 *     solo los descarga y reproduce cuando están a la vista.
 *   - Los enlaces usan el filtro ?familia= del catálogo
 *     (src/app/(tienda)/catalogo/page.tsx). Desde la Fase 5A ese filtro
 *     busca familias que CONTIENEN la palabra, así que cada tarjeta usa una
 *     palabra clave ("Frutal") en vez de una familia exacta (ver FAMILIAS).
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
import AmbientVideo from "@/components/ui/AmbientVideo";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

type Familia = {
  /** Nombre visible de la tarjeta. */
  nombre: string;
  /** Frase corta bajo el nombre. */
  frase: string;
  /**
   * Palabra clave del filtro ?familia=: el catálogo muestra los perfumes
   * cuya familia_olfativa CONTIENE este texto. Ojo: distingue tildes
   * ("Cítric" sí, "Citric" no).
   */
  familia: string;
  /** Nombre del video en public/videos/ (sin extensión). */
  video: string;
};

/**
 * Las cuatro tarjetas y su palabra clave. Perfumes activos que devuelve
 * cada una (consultado el 17 de noviembre de 2026):
 *
 *   Fresca y verde       → "Acuátic"   9  (Aromática Acuática, Floral Acuática,
 *                                         Cítrico Acuático, Acuática Amaderada…)
 *   Amaderada y oriental → "Amaderad"  40  (Amaderada Especiada, Oriental Amaderada…)
 *   Frutal               → "Frutal"    26  (Floral Frutal, Chipre Frutal…)
 *   Cítrica              → "Cítric"     1  (Cítrico Acuático: el catálogo solo
 *                                         tiene una familia cítrica)
 *
 * Para "Fresca" se descartó "Aromátic" (23): incluye familias amaderadas
 * como "Amaderada Aromática", que no son frescas. PENDIENTE de confirmar
 * con la dueña, sobre todo la tarjeta Cítrica.
 */
const FAMILIAS: Familia[] = [
  {
    nombre: "Fresca y verde",
    frase: "Hojas, agua y aire limpio.",
    familia: "Acuátic",
    video: "aroma-tropical-en-selva",
  },
  {
    nombre: "Amaderada y oriental",
    frase: "Maderas, humo y especias que envuelven.",
    familia: "Amaderad",
    video: "frasco-dorado-con-humo",
  },
  {
    nombre: "Frutal",
    frase: "Dulce, jugosa y luminosa.",
    familia: "Frutal",
    video: "frasco-forma-de-mujer-fondo-cafe",
  },
  {
    nombre: "Cítrica",
    frase: "Chispeante, como recién exprimida.",
    familia: "Cítric",
    video: "maquina-exprimiendo-frutas-para-aroma",
  },
];

export default function Familias() {
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
          {FAMILIAS.map((item, indice) => (
            <li key={item.familia} className="flex justify-center">
              <Reveal delay={0.1 * indice} className="w-full max-w-[280px]">
                <Link
                  href={`/catalogo?familia=${encodeURIComponent(item.familia)}`}
                  className="group block"
                >
                  {/* Arco: rounded-t-full redondea la parte de arriba por
                      completo. aspect-[3/4]: más ancho que el video (9:16),
                      así object-cover recorta arriba y abajo. */}
                  <div className="relative aspect-[3/4] overflow-hidden rounded-t-full border border-gold/25 bg-dark-secondary transition-colors duration-300 group-hover:border-gold/70">
                    <AmbientVideo
                      src={`/videos/${item.video}.mp4`}
                      poster={`/videos/posters/${item.video}.webp`}
                      className="transition-transform duration-700 group-hover:scale-[1.12] motion-reduce:transition-none motion-reduce:group-hover:scale-[1.08]"
                    />
                  </div>
                  <h3 className="mt-4 text-center font-serif text-xl font-medium leading-tight text-ink sm:text-2xl">
                    {item.nombre}
                  </h3>
                  <p className="mt-1 text-center text-sm font-light leading-snug text-ink-muted">
                    {item.frase}
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
