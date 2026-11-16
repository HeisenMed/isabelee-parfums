/**
 * src/components/home/Categories.tsx — Sección "Categorías" de la portada.
 *
 * QUÉ ES
 *   Tres tarjetas — Hombre, Mujer y Unisex — que abren el catálogo ya
 *   filtrado por esa categoría.
 *
 * POR QUÉ EXISTE
 *   CLAUDE.md §7 exige que las tres categorías estén siempre presentes en
 *   la navegación. Esta sección las presenta de forma visual en la portada.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La usa src/app/page.tsx, después de Featured.
 *   - Cada tarjeta enlaza a /catalogo?genero=Hombre (etc.); ese parámetro
 *     lo interpreta src/app/catalogo/page.tsx.
 *   - Es un componente de servidor ASÍNCRONO: pide a
 *     getImagenesPorGenero() (src/lib/perfumes.ts) una foto real de un
 *     perfume de cada categoría para usarla como imagen representativa.
 *   - Si una categoría no tiene ninguna foto real (o la base de datos no
 *     responde), su tarjeta muestra el ícono del frasco sobre fondo oscuro.
 *   - Su id="categorias" se conserva por si algún enlace apunta a ella.
 */
import Image from "next/image";
import Link from "next/link";
import { BottleIcon } from "@/components/ui/icons";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { getImagenesPorGenero } from "@/lib/perfumes";
import { PLACEHOLDER_IMAGE } from "@/lib/site";
import type { Genero } from "@/types/perfume";

/** Las tres categorías, con una frase descriptiva cada una. */
const CATEGORIES: { genero: Genero; description: string }[] = [
  { genero: "Hombre", description: "Carácter, frescura y profundidad." },
  { genero: "Mujer", description: "Elegancia floral y dulzura envolvente." },
  { genero: "Unisex", description: "Aromas sin etiquetas, para compartir." },
];

export default async function Categories() {
  const imagenes = await getImagenesPorGenero(PLACEHOLDER_IMAGE);

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
          {CATEGORIES.map(({ genero, description }, index) => {
            const imagen = imagenes[genero];
            return (
              <li key={genero}>
                {/* El retraso creciente hace que las tarjetas entren una tras otra */}
                <Reveal delay={index * 0.12}>
                  <Link
                    href={`/catalogo?genero=${genero}`}
                    className="group block overflow-hidden rounded-lg border border-gold/10 bg-dark-secondary transition-colors duration-300 hover:border-gold/50"
                  >
                    {imagen ? (
                      // Foto real: fondo blanco y object-contain, igual que
                      // en las tarjetas de producto.
                      <div className="relative aspect-[4/3] bg-white">
                        <Image
                          src={imagen}
                          alt="" // decorativa: el nombre de la categoría va debajo
                          fill
                          sizes="(min-width: 640px) 30vw, 90vw"
                          className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      // Sin foto disponible: ícono sobre resplandor dorado.
                      <div className="flex aspect-[4/3] items-center justify-center bg-[radial-gradient(ellipse_at_50%_45%,rgba(201,168,76,0.14),transparent_70%)]">
                        <BottleIcon
                          aria-hidden="true"
                          className="h-20 w-auto text-gold/60 transition-[color,transform] duration-500 group-hover:scale-105 group-hover:text-gold-light"
                        />
                      </div>
                    )}

                    <div className="border-t border-gold/10 px-6 py-6 text-center">
                      <h3 className="font-serif text-3xl font-medium text-ink">
                        {genero}
                      </h3>
                      <p className="mt-2 text-sm font-light text-ink-muted">
                        {description}
                      </p>
                    </div>
                  </Link>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
