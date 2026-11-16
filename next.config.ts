/**
 * next.config.ts — Configuración de Next.js.
 *
 * QUÉ ES
 *   Ajustes globales del framework. Por ahora solo uno: de qué servidores
 *   externos puede cargar imágenes el componente <Image>.
 *
 * POR QUÉ EXISTE
 *   Por seguridad, next/image se niega a optimizar imágenes de dominios que
 *   no estén autorizados aquí. Las fotos locales (public/) funcionan sin
 *   configuración, pero las que se suban a Supabase Storage desde el panel
 *   de administración (Fase 3) vendrán de la URL del proyecto de Supabase.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lee NEXT_PUBLIC_SUPABASE_URL de .env.local, la misma variable que
 *     usa src/lib/supabase.ts, para no escribir el dominio dos veces.
 *   - Solo se autoriza la carpeta pública de Storage de ESE proyecto.
 *   - Afecta a ProductCard, ProductGallery y Categories.
 */
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: "https",
            hostname: new URL(supabaseUrl).hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
