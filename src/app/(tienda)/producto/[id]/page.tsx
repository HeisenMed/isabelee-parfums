/**
 * src/app/(tienda)/producto/[id]/page.tsx — Ficha de producto (ruta "/producto/123").
 *
 * QUÉ ES
 *   La página de detalle de un perfume: galería, datos, precio, botón de
 *   WhatsApp, atmósfera olfativa, ocasiones y reseñas.
 *
 * POR QUÉ EXISTE
 *   Sustituye a producto.html + js/producto.js del sitio v1. Allí la ficha
 *   se armaba en el navegador leyendo ?id= de la URL; aquí la carpeta
 *   [id] crea una URL limpia por perfume (/producto/1) y el HTML llega ya
 *   completo desde el servidor, lo que ayuda al SEO y a las vistas previas
 *   al compartir el enlace.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Datos: getPerfumeById y getReviewsByPerfumeId (src/lib/perfumes.ts).
 *     Las reseñas ya salen de Supabase, como preveía CLAUDE.md §6.
 *   - Interfaz: ProductGallery (src/components/product/), Stars e íconos
 *     (src/components/ui/).
 *   - Llegan aquí las tarjetas ProductCard del catálogo y de la portada.
 *   - Si el id no es un número o el perfume no existe (o está inactivo),
 *     se muestra la página 404 de Next con notFound().
 *   - generateMetadata() pone el nombre del perfume en el <title> y en la
 *     vista previa de redes sociales.
 *   - `revalidate = 60`: la página se guarda en caché y se regenera como
 *     mucho una vez por minuto. Un cambio en la base de datos tarda hasta
 *     60 segundos en verse, a cambio de cargar mucho más rápido.
 *
 * REGLAS QUE RESPETA (CLAUDE.md)
 *   - §3: precio null → "Consultar precio"; nunca se inventa.
 *   - §5: el promedio de estrellas se calcula con las reseñas reales; sin
 *     reseñas se muestra un mensaje, no "0.0".
 *   - §7: texto de cuerpo a 15-16px y separación clara entre la
 *     descripción olfativa y los recuadros Salida / Corazón / Fondo.
 *   - §11.3: el mensaje de WhatsApp va en español y codificado para URL.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductGallery from "@/components/product/ProductGallery";
import { WhatsAppIcon } from "@/components/ui/icons";
import Stars from "@/components/ui/Stars";
import { getPerfumeById, getReviewsByPerfumeId } from "@/lib/perfumes";
import {
  formatPrecio,
  PLACEHOLDER_IMAGE,
  SITE_SHORT_NAME,
  whatsappUrl,
} from "@/lib/site";
import type { Perfume } from "@/types/perfume";

/** Segundos que la ficha permanece en caché antes de regenerarse. */
export const revalidate = 60;

type ProductoPageProps = {
  // En Next.js 15 los parámetros de la ruta llegan como una promesa.
  params: Promise<{ id: string }>;
};

/**
 * Convierte el texto de la URL en un id válido, o null.
 * Solo se aceptan dígitos: "/producto/abc" o "/producto/1.5" dan 404 sin
 * llegar a consultar la base de datos.
 */
function parseId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}

/** Línea de presentación: "EDP · 100ml · Hombre". */
function presentacion(perfume: Perfume): string {
  return [perfume.concentracion, perfume.volumen, perfume.genero]
    .filter(Boolean)
    .join(" · ");
}

/** Metadatos de la página (título de la pestaña y vista previa al compartir). */
export async function generateMetadata({
  params,
}: ProductoPageProps): Promise<Metadata> {
  const id = parseId((await params).id);
  const perfume = id ? await getPerfumeById(id) : null;
  if (!perfume) return { title: "Fragancia no encontrada" };

  const title = `${perfume.nombre} de ${perfume.marca}`;
  const description =
    perfume.descripcion || `${title}. ${presentacion(perfume)}.`;

  return {
    title,
    description,
    openGraph: { title, description, images: [perfume.imagen || PLACEHOLDER_IMAGE] },
  };
}

/** Las tres capas de la pirámide olfativa, en orden de aparición. */
const NIVELES = [
  { key: "salida", label: "Salida" },
  { key: "corazon", label: "Corazón" },
  { key: "fondo", label: "Fondo" },
] as const;

/** Estilo de los títulos de sección de la ficha. */
const sectionTitle = "font-serif text-3xl font-medium text-ink sm:text-4xl";

export default async function ProductoPage({ params }: ProductoPageProps) {
  const id = parseId((await params).id);
  if (!id) notFound();

  // Perfume y reseñas son consultas independientes: se piden a la vez.
  const [perfume, reviews] = await Promise.all([
    getPerfumeById(id),
    getReviewsByPerfumeId(id),
  ]);
  if (!perfume) notFound();

  // Galería: imagen principal primero, luego las adicionales, sin vacíos
  // ni repetidos. Si no hay ninguna, el placeholder.
  const images = [
    ...new Set([perfume.imagen, ...(perfume.imagenes ?? [])].filter(Boolean)),
  ];
  if (images.length === 0) images.push(PLACEHOLDER_IMAGE);

  // Promedio calculado con las reseñas reales de ESTE perfume.
  const average =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.stars, 0) / reviews.length
      : 0;

  const hayDescuento =
    perfume.precio !== null &&
    perfume.precio_original !== null &&
    perfume.precio_original > perfume.precio;

  // Enlace de WhatsApp con el nombre del perfume en el mensaje.
  const consultaUrl = whatsappUrl(
    `Hola ${SITE_SHORT_NAME}, me interesa el perfume ${perfume.nombre} de ${perfume.marca}` +
      `${perfume.volumen ? ` (${perfume.volumen})` : ""}. ¿Me pueden dar más información?`,
  );

  // Agotado (columna de la migración n.º 3; `=== true` porque el campo no
  // existe mientras no esté aplicada). El botón cambia de texto y de
  // mensaje: quien escribe ya sabe que no hay existencias y pregunta
  // cuándo vuelve o qué alternativa hay.
  const agotado = perfume.agotado === true;
  const agotadoUrl = whatsappUrl(
    `Hola ${SITE_SHORT_NAME}, vi que el perfume ${perfume.nombre} de ${perfume.marca}` +
      `${perfume.volumen ? ` (${perfume.volumen})` : ""} está agotado. ¿Cuándo vuelve a estar disponible?`,
  );

  const notas = perfume.notas ?? { salida: [], corazon: [], fondo: [] };
  const hayNotas = NIVELES.some(({ key }) => (notas[key] ?? []).length > 0);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8 lg:pt-36">
      <Link
        href="/catalogo"
        className="inline-flex items-center gap-2 text-sm font-light text-gold-ink underline underline-offset-4 transition-colors duration-200 hover:text-gold-light"
      >
        {/* Flecha dibujada con CSS: dos bordes de un cuadrado girado */}
        <span
          aria-hidden="true"
          className="h-2 w-2 rotate-45 border-b border-l border-current"
        />
        Volver al catálogo
      </Link>

      {/* ── Bloque principal: galería + datos ── */}
      <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductGallery
            images={images}
            alt={`${perfume.marca} ${perfume.nombre}`}
            badge={perfume.badge}
          />

          {/* Video promocional, si el perfume tiene uno */}
          {perfume.video_url && (
            <div className="mt-6">
              <video
                src={perfume.video_url}
                controls
                playsInline
                preload="metadata" // no descarga el video hasta que se reproduce
                aria-label={`Video de ${perfume.nombre}`}
                className="w-full rounded-lg border border-gold/15 bg-dark-secondary"
              />
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold-light">
            {perfume.marca}
          </p>
          <h1 className="mt-3 font-serif text-5xl font-medium leading-[1.05] text-ink sm:text-6xl">
            {perfume.nombre}
          </h1>
          <p className="mt-4 text-base font-light text-ink-muted">
            {presentacion(perfume)}
          </p>

          {perfume.familia_olfativa && (
            <p className="mt-5 inline-block rounded-full border border-gold/35 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-gold-ink">
              {perfume.familia_olfativa}
            </p>
          )}

          {/* Resumen de reseñas (solo si hay alguna) */}
          {reviews.length > 0 && (
            <a
              href="#resenas"
              className="mt-5 flex w-fit items-center gap-2.5 text-sm font-light text-ink-muted transition-colors duration-200 hover:text-gold-light"
            >
              <Stars value={average} />
              <span>
                {average.toLocaleString("es-CO", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}{" "}
                · {reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"}
              </span>
            </a>
          )}

          {/* Precio */}
          <div className="mt-8 border-t border-gold/15 pt-8">
            {perfume.precio !== null ? (
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-serif text-4xl font-medium text-ink">
                  {formatPrecio(perfume.precio)}
                </span>
                {hayDescuento && perfume.precio_original !== null && (
                  <span className="text-lg font-light text-ink-muted line-through">
                    {formatPrecio(perfume.precio_original)}
                  </span>
                )}
              </p>
            ) : (
              <p className="font-serif text-3xl italic text-gold-light">
                Consultar precio
              </p>
            )}

            {agotado ? (
              // Botón de contorno en lugar del dorado sólido: deja claro de
              // un vistazo que no es la compra habitual.
              <a
                href={agotadoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-lg border border-gold/50 px-8 py-4 text-xs font-medium uppercase tracking-[0.18em] text-gold-ink transition-colors duration-300 hover:border-gold hover:bg-gold hover:text-on-gold sm:w-auto"
              >
                <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                Agotado — consúltalo por WhatsApp
              </a>
            ) : (
              <a
                href={consultaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-lg bg-gold px-8 py-4 text-xs font-medium uppercase tracking-[0.18em] text-on-gold transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-gold-bright hover:shadow-[0_10px_26px_rgba(201,168,76,0.3)] sm:w-auto"
              >
                <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                Consultar por este perfume
              </a>
            )}
          </div>

          {/* Descripción */}
          {perfume.descripcion && (
            <p className="mt-8 text-base font-light leading-relaxed text-ink">
              {perfume.descripcion}
            </p>
          )}

          {/* Ocasiones */}
          {perfume.ocasiones?.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold-ink">
                Ocasiones
              </h2>
              <ul className="flex flex-wrap gap-2">
                {perfume.ocasiones.map((ocasion) => (
                  <li
                    key={ocasion}
                    className="rounded-full border border-gold/20 bg-dark-secondary px-4 py-1.5 text-sm font-light text-ink"
                  >
                    {ocasion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Atmósfera olfativa ── */}
      {(perfume.descripcion_olfativa || hayNotas) && (
        <section className="mt-20 border-t border-gold/15 pt-16">
          <h2 className={sectionTitle}>Atmósfera olfativa</h2>

          {perfume.descripcion_olfativa && (
            // mb-10: separación clara respecto a los recuadros (CLAUDE.md §7)
            <p className="mb-10 mt-5 max-w-3xl text-base font-light italic leading-relaxed text-gold-light">
              {perfume.descripcion_olfativa}
            </p>
          )}

          {hayNotas && (
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {NIVELES.map(({ key, label }) => (
                <div
                  key={key}
                  className="rounded-lg border border-gold/15 bg-dark-secondary px-6 py-6"
                >
                  <h3 className="text-xs font-medium uppercase tracking-[0.2em] text-gold-ink">
                    Notas de {label}
                  </h3>
                  {(notas[key] ?? []).length > 0 ? (
                    <ul className="mt-4 space-y-2">
                      {notas[key].map((nota) => (
                        <li
                          key={nota}
                          className="text-base font-light leading-snug text-ink first-letter:uppercase"
                        >
                          {nota}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm font-light text-ink-muted">
                      Sin información.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Reseñas ── */}
      <section
        id="resenas"
        className="mt-20 scroll-mt-24 border-t border-gold/15 pt-16"
      >
        <h2 className={sectionTitle}>Reseñas</h2>

        {reviews.length > 0 ? (
          <>
            <div className="mt-5 flex items-center gap-4">
              <span className="font-serif text-5xl font-medium text-gold-ink">
                {average.toLocaleString("es-CO", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
              <div>
                <Stars value={average} className="h-5 w-5" />
                <p className="mt-1 text-sm font-light text-ink-muted">
                  {reviews.length} {reviews.length === 1 ? "reseña" : "reseñas"}
                </p>
              </div>
            </div>

            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="rounded-lg border border-gold/15 bg-dark-secondary px-6 py-6"
                >
                  <Stars value={review.stars} />
                  {review.comment && (
                    <p className="mt-4 text-base font-light leading-relaxed text-ink">
                      {review.comment}
                    </p>
                  )}
                  <p className="mt-5 text-sm text-ink">
                    <span className="font-medium">{review.name}</span>
                    <span className="font-light text-ink-muted"> · {review.date}</span>
                  </p>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-5 text-base font-light text-ink-muted">
            Aún no hay reseñas. Sé el primero en opinar.
          </p>
        )}
      </section>
    </div>
  );
}
