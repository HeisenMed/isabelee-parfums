/**
 * src/app/not-found.tsx — Página 404 ("no encontrado").
 *
 * QUÉ ES
 *   Lo que se muestra cuando la dirección no existe (por ejemplo /xyz) o
 *   cuando una ficha llama a notFound() porque el perfume no existe o está
 *   inactivo (src/app/(tienda)/producto/[id]/page.tsx).
 *
 * POR QUÉ EXISTE
 *   Next.js dibuja el 404 dentro del layout RAÍZ, no dentro del layout de
 *   la tienda. Mientras el header y el footer vivían en el layout raíz, el
 *   404 los heredaba solo. Al mover el marco de la tienda a
 *   src/app/(tienda)/layout.tsx (Fase 3), el 404 se habría quedado sin
 *   header, sin footer y sin fondo oscuro. Este archivo los vuelve a poner
 *   para que la persona pueda seguir navegando.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Repite a propósito el envoltorio de src/app/(tienda)/layout.tsx
 *     (fondo oscuro + Header + Footer), sin el modal de bienvenida ni el
 *     botón de WhatsApp: en una página de error sobran.
 *   - Next responde con el código HTTP 404 automáticamente.
 *   - Estilo según .claude/skills/isabelee-design: tokens de Tailwind,
 *     sin hex sueltos ni emojis.
 */
import type { Metadata } from "next";
import Link from "next/link";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Página no encontrada",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-dark-deep text-ink">
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center px-5 pb-24 pt-36 text-center sm:px-8">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold-light">
          Error 404
        </p>
        <h1 className="mt-4 font-serif text-4xl font-medium leading-tight text-ink sm:text-5xl">
          Esta página no existe
        </h1>
        <p className="mt-4 max-w-md text-base font-light leading-relaxed text-ink-muted">
          Puede que el enlace esté mal escrito o que la fragancia ya no esté
          disponible.
        </p>
        <Link
          href="/catalogo"
          className="mt-8 rounded-lg bg-gold px-8 py-4 text-xs font-medium uppercase tracking-[0.2em] text-dark-secondary transition-colors duration-300 hover:bg-gold-light"
        >
          Ver el catálogo
        </Link>
      </main>
      <Footer />
    </div>
  );
}
