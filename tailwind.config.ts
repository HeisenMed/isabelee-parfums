/**
 * tailwind.config.ts — Sistema de diseño de Isabelé Fragancias para Tailwind.
 *
 * QUÉ ES
 *   La definición de los "tokens" de marca (colores y tipografías) que
 *   Tailwind convierte en clases utilitarias. Por ejemplo, el color
 *   `gold.light` de abajo genera `text-gold-light`, `bg-gold-light`,
 *   `border-gold-light`, etc.
 *
 * POR QUÉ EXISTE
 *   Para que ningún componente escriba códigos hexadecimales a mano. Si un
 *   color de marca cambia, se cambia aquí una sola vez y se actualiza todo
 *   el sitio. Es el equivalente en v2 del antiguo css/variables.css.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - El proyecto usa Tailwind CSS v4, que por defecto ya NO lee este
 *     archivo automáticamente. Se carga de forma explícita con la directiva
 *     `@config "../../tailwind.config.ts";` en src/app/globals.css. Si esa
 *     línea se borra, todas las clases de marca dejan de existir.
 *   - Todo va dentro de `theme.extend`: así se AÑADEN tokens sin eliminar
 *     los colores y tamaños que Tailwind trae por defecto.
 *   - Las fuentes se referencian mediante variables CSS (--font-cormorant y
 *     --font-jost) que crea next/font en src/app/layout.tsx. El nombre
 *     literal de la fuente queda como respaldo por si la variable faltara.
 *   - La paleta es la de CLAUDE.md §10.1. No añadas colores aquí sin
 *     documentarlos allí.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  // Archivos donde Tailwind busca nombres de clases para generar el CSS.
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dorados de marca: CTAs, acentos, bordes y destellos.
        gold: {
          DEFAULT: "#C9A84C", // Dorado principal
          light: "#e8d48b", // Destacados, hover, acentos de texto
          cream: "#fff8e1", // Brillos y acentos muy claros
        },
        // Fondos oscuros, de menos a más profundo.
        dark: {
          DEFAULT: "#1c1c1c", // Fondo de secciones
          secondary: "#1a1a1a", // Tarjetas, modales, contenedores
          deep: "#121212", // Body y footer
        },
        // Texto sobre fondo oscuro (CLAUDE.md §10.1). Se añade como token
        // para no repetir los hex en cada componente.
        ink: {
          DEFAULT: "#f5f5f5", // Texto principal
          muted: "#b0b0b0", // Texto secundario
        },
        // Verde oficial de WhatsApp: SOLO para su botón/ícono.
        whatsapp: "#25D366",
      },
      fontFamily: {
        // Títulos y texto de marca.
        serif: ["var(--font-cormorant)", "Cormorant Garamond", "serif"],
        // Cuerpo de texto.
        sans: ["var(--font-jost)", "Jost", "sans-serif"],
      },
    },
  },
};

export default config;
