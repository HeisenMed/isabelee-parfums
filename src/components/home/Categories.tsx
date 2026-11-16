/**
 * src/components/home/Categories.tsx — Sección "Categorías".
 *
 * QUÉ ES
 *   Tres tarjetas — Hombre, Mujer y Unisex — que servirán de acceso rápido
 *   al catálogo filtrado por categoría.
 *
 * POR QUÉ EXISTE
 *   CLAUDE.md §7 exige que las tres categorías estén siempre presentes en
 *   la navegación. Esta sección las presenta de forma visual en la portada.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/page.tsx, después de Featured.
 *   - Su id="categorias" es el destino de los enlaces Hombre / Mujer /
 *     Unisex del Header y el Footer (src/lib/site.ts).
 *   - La "imagen" de cada tarjeta es provisional: un panel con degradado y
 *     el ícono del frasco (BottleIcon). En una fase posterior se
 *     reemplazará por una fotografía real con next/image.
 *   - PENDIENTE Fase 2: hoy las tarjetas llevan a #catalogo; cuando exista
 *     el catálogo real, cada una abrirá su categoría ya filtrada.
 *   - Componente de servidor: el hover es solo CSS y la aparición la
 *     aporta <Reveal>.
 */
import Link from "next/link";
import { BottleIcon } from "@/components/ui/icons";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";

/** Las tres categorías del catálogo, con una frase descriptiva cada una. */
const CATEGORIES = [
  { name: "Hombre", description: "Carácter, frescura y profundidad." },
  { name: "Mujer", description: "Elegancia floral y dulzura envolvente." },
  { name: "Unisex", description: "Aromas sin etiquetas, para compartir." },
];

export default function Categories() {
  return (
    <section
      id="categorias"
      className="scroll-mt-20 bg-dark px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Encuentra la tuya"
          title="Categorías"
          subtitle="Explora la colección según tu estilo."
        />

        <ul className="mt-14 grid gap-6 sm:grid-cols-3">
          {CATEGORIES.map((category, index) => (
            <li key={category.name}>
              {/* El retraso creciente hace que las tarjetas entren una tras otra */}
              <Reveal delay={index * 0.12}>
                <Link
                  href="/#catalogo"
                  className="group block overflow-hidden rounded-lg border border-gold/10 bg-dark-secondary transition-colors duration-300 hover:border-gold/50"
                >
                  {/* Imagen provisional */}
                  <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(ellipse_at_50%_45%,rgba(201,168,76,0.14),transparent_70%)]">
                    <BottleIcon
                      aria-hidden="true"
                      className="h-20 w-auto text-gold/60 transition-[color,transform] duration-500 group-hover:scale-105 group-hover:text-gold-light"
                    />
                  </div>

                  <div className="border-t border-gold/10 px-6 py-6 text-center">
                    <h3 className="font-serif text-3xl font-medium text-ink">
                      {category.name}
                    </h3>
                    <p className="mt-2 text-sm font-light text-ink-muted">
                      {category.description}
                    </p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
