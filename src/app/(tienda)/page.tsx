/**
 * src/app/(tienda)/page.tsx — Página de inicio (ruta "/").
 *
 * QUÉ ES
 *   El componente que Next.js renderiza cuando alguien visita la raíz del
 *   sitio. Sustituye al antiguo index.html.
 *
 * POR QUÉ EXISTE
 *   Su único trabajo es ORDENAR las secciones de la portada. No contiene
 *   diseño ni lógica propios: cada sección vive en su archivo dentro de
 *   src/components/home/. Para reordenar la portada basta con mover líneas
 *   aquí.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Se renderiza dentro de src/app/(tienda)/layout.tsx (entra como {children}),
 *     entre el Header y el Footer.
 *   - Orden, anclas y fondo de las secciones (los fondos alternan
 *     dark-deep / dark para separar visualmente cada bloque):
 *       Hero         presentación a pantalla completa (siempre de noche)
 *       Featured     id="destacados"  dark-deep (6 perfumes, desde Supabase)
 *       Familias     id="familias"    dark      (4 arcos con video, Fase 4)
 *       Categories   id="categorias"  dark-deep (Hombre / Mujer / Unisex)
 *       Newsletter                     dark      (suscripción, marcador)
 *       Entrega      id="entrega"     dark-deep ("Así llega tu fragancia", Fase 4)
 *       WhatsAppCta  id="contacto"    dark
 *   - Featured y Categories leen de Supabase mientras se genera la página.
 *   - Familias y Entrega reciben su contenido de getContenidoPortada()
 *     (src/lib/portada.ts, tabla contenido_portada), editable en
 *     /admin/portada.
 *   - `dynamic = "force-dynamic"` (Fase 6B): la portada se genera en CADA
 *     visita, leyendo Supabase en ese momento. Antes usaba `revalidate = 60`
 *     (caché regenerada cada minuto, ISR: Incremental Static Regeneration),
 *     pero en Cloudflare eso exige una caché externa (R2 + D1 + Durable
 *     Object) que se decidió no usar en el primer lanzamiento. A cambio,
 *     cualquier cambio del panel se ve en la siguiente visita. Cómo volver
 *     a la caché: doc/DESPLIEGUE.md, "Cómo reactivar la caché".
 *   - Las Server Actions del panel siguen llamando a revalidatePath("/"):
 *     sin caché no hace nada, pero queda listo si se reactiva.
 *   - Es un componente de servidor: las secciones interactivas (Hero,
 *     Newsletter) declaran su propio "use client".
 */
import Categories from "@/components/home/Categories";
import Entrega from "@/components/home/Entrega";
import Familias from "@/components/home/Familias";
import Featured from "@/components/home/Featured";
import Hero from "@/components/home/Hero";
import Newsletter from "@/components/home/Newsletter";
import WhatsAppCta from "@/components/home/WhatsAppCta";
import { getContenidoPortada } from "@/lib/portada";

/** Se genera en cada visita: sin caché de páginas (ver la cabecera). */
export const dynamic = "force-dynamic";

export default async function Home() {
  // Contenido editable desde /admin/portada (Fase 5B). Si la tabla falla,
  // getContenidoPortada() devuelve el contenido original: nunca rompe.
  const portada = await getContenidoPortada();

  return (
    <>
      <Hero />
      <Featured />
      <Familias datos={portada.familias} />
      <Categories />
      <Newsletter />
      <Entrega datos={portada.entrega} />
      <WhatsAppCta />
    </>
  );
}
