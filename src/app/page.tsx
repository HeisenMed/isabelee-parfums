/**
 * src/app/page.tsx — Página de inicio (ruta "/").
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
 *   - Se renderiza dentro de src/app/layout.tsx (entra como {children}),
 *     entre el Header y el Footer.
 *   - Orden y anclas de las secciones:
 *       Hero         presentación a pantalla completa
 *       Featured     id="destacados" (6 perfumes reales, desde Supabase)
 *       Categories   id="categorias" (Hombre / Mujer / Unisex)
 *       Newsletter   suscripción por correo (marcador)
 *       WhatsAppCta  id="contacto"
 *   - Featured y Categories leen de Supabase mientras se genera la página.
 *   - `revalidate = 60`: la portada se guarda en caché y se regenera como
 *     mucho una vez por minuto, así refleja los cambios del catálogo sin
 *     consultar la base de datos en cada visita.
 *   - Es un componente de servidor: las secciones interactivas (Hero,
 *     Newsletter) declaran su propio "use client".
 */
import Categories from "@/components/home/Categories";
import Featured from "@/components/home/Featured";
import Hero from "@/components/home/Hero";
import Newsletter from "@/components/home/Newsletter";
import WhatsAppCta from "@/components/home/WhatsAppCta";

/** Segundos que la portada permanece en caché antes de regenerarse. */
export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Hero />
      <Featured />
      <Categories />
      <Newsletter />
      <WhatsAppCta />
    </>
  );
}
