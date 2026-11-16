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
 *       Featured     id="catalogo"   (marcador, Fase 2)
 *       Categories   id="categorias" (Hombre / Mujer / Unisex)
 *       Newsletter   suscripción por correo (marcador)
 *       WhatsAppCta  id="contacto"
 *     Esas anclas son las que usan los menús (src/lib/site.ts).
 *   - Es un componente de servidor: las secciones interactivas (Hero,
 *     Newsletter) declaran su propio "use client".
 */
import Categories from "@/components/home/Categories";
import Featured from "@/components/home/Featured";
import Hero from "@/components/home/Hero";
import Newsletter from "@/components/home/Newsletter";
import WhatsAppCta from "@/components/home/WhatsAppCta";

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
