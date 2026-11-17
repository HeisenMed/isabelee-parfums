/**
 * tailwind.config.ts — Sistema de diseño de Isabeleé Fragancias para Tailwind.
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
 *   - La paleta de noche es la de CLAUDE.md §10.1. No añadas colores aquí
 *     sin documentarlos allí y en doc/DISEÑO.md.
 *   - TEMAS (Fase 4): los colores de la TIENDA (gold, on-gold, dark, ink)
 *     apuntan a variables CSS definidas en src/app/globals.css, una vez
 *     para la noche y otra para el día. Cambiar un color de tema es
 *     cambiarlo allí, no aquí. El atributo data-theme de <html> (lo pone el
 *     script del layout raíz y ThemeToggle) decide qué juego se aplica.
 *   - Los colores `whatsapp` y `admin` siguen siendo fijos: no cambian con
 *     el tema.
 *   - El grupo `admin` es la paleta clara del panel de administración
 *     (Fase 3). Está documentado en doc/DISEÑO.md §6.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  // Archivos donde Tailwind busca nombres de clases para generar el CSS.
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Tienda: colores con TEMA (noche / día) ──────────────────────
        // Desde la Fase 4 estos tokens no son colores fijos sino variables
        // CSS (var(--tema-…)). Sus valores están en src/app/globals.css:
        //   :root y [data-theme="noche"]  → paleta de noche (la de siempre)
        //   [data-theme="dia"]            → paleta de día
        // Las clases se escriben igual que antes (text-ink, bg-dark-deep,
        // border-gold/20…): Tailwind v4 escribe `var(--tema-…)` dentro de
        // cada clase y resuelve la transparencia con color-mix(), así que
        // un elemento con data-theme="noche" (el Hero) recibe los colores
        // de noche aunque la página esté en día.
        // Los nombres "dark" e "ink" vienen de la paleta de noche: en día,
        // los "dark" son fondos claros y los "ink" textos oscuros. Piensa
        // en ellos como "fondo" y "texto", no como "oscuro" y "claro".
        // Los valores y su contraste WCAG están en doc/DISEÑO.md §1.
        gold: {
          // Dorado de marca para RELLENOS y BORDES (#C9A84C en los dos
          // temas). No sirve para texto sobre fondo de día (2,05:1).
          DEFAULT: "var(--tema-oro)",
          // Acentos de TEXTO (itálicas, enlaces al pasar el cursor).
          // Noche #e8d48b; día un dorado oscuro legible.
          light: "var(--tema-oro-claro)",
          // Brillos (partículas del Hero, que siempre es de noche).
          cream: "var(--tema-oro-crema)",
          // Texto dorado "principal" (antes text-gold): noche #C9A84C,
          // día dorado oscuro. Úsalo siempre que el dorado sea TEXTO o
          // ícono; text-gold solo para casos sin legibilidad en juego.
          ink: "var(--tema-oro-tinta)",
          // Relleno dorado más luminoso para el hover de los botones
          // dorados (antes hover:bg-gold-light).
          bright: "var(--tema-oro-brillo)",
        },
        // Texto SOBRE un relleno dorado (botones, contador del carrito):
        // siempre oscuro, en los dos temas. Antes se usaba
        // text-dark-secondary, que en día se volvería claro.
        "on-gold": "var(--tema-sobre-oro)",
        // Fondos, de menos a más profundo (en día: blanco cálido → marfil).
        dark: {
          DEFAULT: "var(--tema-fondo)", // Fondo de secciones alternas
          secondary: "var(--tema-fondo-2)", // Tarjetas, modales, paneles
          deep: "var(--tema-fondo-3)", // Body y footer
        },
        // Texto (CLAUDE.md §10.1 en noche).
        ink: {
          DEFAULT: "var(--tema-texto)", // Texto principal
          muted: "var(--tema-texto-suave)", // Texto secundario
        },
        // Verde oficial de WhatsApp: SOLO para su botón/ícono.
        whatsapp: "#25D366",
        // ── Panel de administración (/admin) ───────────────────────────
        // Tema CLARO y sobrio, pensado para leer y rellenar formularios
        // con comodidad. Estos colores se usan SOLO bajo src/app/admin/ y
        // src/components/admin/; la tienda sigue con la paleta oscura.
        // Las cifras "N:1" son el contraste WCAG (Web Content
        // Accessibility Guidelines, las pautas de accesibilidad web). El
        // nivel AA pide 4,5:1 para texto y 3:1 para bordes de controles y
        // anillos de foco.
        admin: {
          bg: "#faf8f3", // Fondo de página: blanco roto cálido
          surface: "#ffffff", // Tarjetas, formularios y campos
          border: "#e7e1d3", // Líneas divisorias y bordes decorativos
          // Borde de los campos de formulario. Más oscuro que `border`
          // porque el contorno de un campo debe distinguirse del fondo:
          // 3,74:1 sobre blanco (AA para controles).
          "border-strong": "#8c8469",
          text: "#1f1f1f", // Texto principal: 15,5:1 sobre el fondo
          muted: "#6b6b6b", // Texto secundario: 5,33:1 sobre blanco
          // Dorado de marca (el mismo valor que `gold`): fondo del botón
          // primario y detalles decorativos. Con texto `admin-text` encima
          // da 7,21:1. NO sirve para texto sobre blanco (solo 2,29:1).
          accent: "#C9A84C",
          // Dorado oscuro para TEXTO, enlaces y anillos de foco sobre
          // claro: 5,79:1 sobre blanco y 5,45:1 sobre `bg` (AA).
          "gold-text": "#7d6215",
          // Rojo: EXCLUSIVO para mensajes de error. 6,54:1 sobre blanco.
          error: "#b3261e",
          "error-bg": "#fdf3f2", // Fondo del recuadro de error (6,00:1)
        },
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
