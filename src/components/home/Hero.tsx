"use client";

/**
 * src/components/home/Hero.tsx — Hero cinematográfico de la página de inicio.
 *
 * QUÉ ES
 *   La primera pantalla del sitio: ocupa todo el alto de la ventana, con
 *   fondo oscuro, un resplandor dorado, partículas flotando y el titular
 *   que entra en secuencia. Es la pieza visual principal de la marca.
 *
 * POR QUÉ EXISTE
 *   Sustituye a la <section class="hero"> del index.html antiguo y a dos
 *   funciones de js/main.js: las animaciones de entrada (.hero-in) y los
 *   destellos ambientales (initAmbientSparkles).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usa src/app/(tienda)/page.tsx como primera sección.
 *   - El Header (fijo y transparente arriba) queda superpuesto encima.
 *   - Las animaciones CSS de las partículas, el indicador de scroll y el
 *     resplandor del texto están en src/app/globals.css
 *     (.ambient-sparkle, .scroll-hint, .text-glow-gold).
 *   - El botón lleva a la página /catalogo; la flecha inferior baja a
 *     #destacados, el id de la sección Featured.tsx.
 *   - Necesita "use client": GSAP y las partículas manipulan el DOM, cosa
 *     que solo puede ocurrir en el navegador.
 *
 * LAS TRES ANIMACIONES (cada una en su propio useEffect)
 *   1. ENTRADA (GSAP Timeline, una sola vez al cargar): antetítulo →
 *      titular palabra por palabra → subtítulo → botón → indicador de
 *      scroll. Cada elemento sube 30px y pasa de transparente a visible.
 *   2. PARALLAX (GSAP ScrollTrigger): al bajar, el texto sube y se
 *      desvanece mientras el resplandor del fondo se mueve más lento, lo
 *      que da sensación de profundidad.
 *   3. PARTÍCULAS (useRef + useEffect + CSS keyframes): se crean <span>
 *      dorados en posiciones al azar, máximo 20 a la vez; cada uno se
 *      borra solo cuando termina su animación.
 *
 * ACCESIBILIDAD
 *   Con prefers-reduced-motion el texto aparece directamente, sin
 *   parallax ni partículas (CLAUDE.md §10.5).
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";

/* ── Ajustes de la animación de entrada ─────────────────────────────── */

/** Duración de la aparición de cada elemento, en segundos. */
const ENTER_DURATION = 0.8;
/** Separación entre el inicio de un bloque y el del siguiente. */
const ENTER_STAGGER = 0.3;
/** Separación entre palabras del titular (más corta para que se lea fluido). */
const WORD_STAGGER = 0.18;
/** Desplazamiento vertical inicial, en píxeles. */
const ENTER_OFFSET_Y = 30;

/* ── Ajustes de las partículas ──────────────────────────────────────── */

/** Colores permitidos para los destellos (CLAUDE.md §10.5). */
const PARTICLE_COLORS = ["#C9A84C", "#e8d48b", "#fff8e1"];
/** Tope de partículas simultáneas. No subir de 20 (CLAUDE.md §10.5). */
const MAX_PARTICLES = 20;
/** Partículas que se crean de golpe al cargar. */
const INITIAL_PARTICLES = 14;
/** Cada cuántos milisegundos se intenta crear una partícula nueva. */
const SPAWN_INTERVAL_MS = 190;

/** Palabras del titular. `accent` marca las que van en dorado e itálica. */
const HEADLINE = [
  { text: "Descubre", accent: false },
  { text: "tu", accent: false },
  { text: "fragancia", accent: true },
  { text: "ideal", accent: true },
];

/**
 * Los elementos animados empiezan invisibles desde el HTML del servidor
 * (clase opacity-0) para que no se vean "saltar" antes de que GSAP arranque.
 * GSAP luego escribe la opacidad como estilo en línea, que tiene prioridad.
 */
const HIDDEN = "opacity-0";

export default function Hero() {
  /** La <section> completa: disparador del parallax y ámbito de GSAP. */
  const rootRef = useRef<HTMLElement>(null);
  /** Capa del resplandor dorado del fondo (se mueve lento en el parallax). */
  const glowRef = useRef<HTMLDivElement>(null);
  /** Bloque de texto (sube y se desvanece en el parallax). */
  const contentRef = useRef<HTMLDivElement>(null);
  /** Contenedor donde se insertan las partículas. */
  const particlesRef = useRef<HTMLDivElement>(null);

  /* ── 1 y 2: entrada + parallax con GSAP ───────────────────────────── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    gsap.registerPlugin(ScrollTrigger);

    // matchMedia permite una versión para quien acepta movimiento y otra
    // para quien lo redujo. Todo lo creado dentro se deshace con revert().
    const mm = gsap.matchMedia(root);

    mm.add(
      {
        allowMotion: "(prefers-reduced-motion: no-preference)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const items = gsap.utils.toArray<HTMLElement>("[data-hero-item]");
        const scrollHint = root.querySelector("[data-hero-scroll]");

        // Movimiento reducido: mostrar todo de inmediato y terminar.
        if (context.conditions?.reduceMotion) {
          gsap.set([...items, scrollHint], { autoAlpha: 1, y: 0 });
          return;
        }

        const from = { autoAlpha: 0, y: ENTER_OFFSET_Y };
        const to = { autoAlpha: 1, y: 0 };
        // ">-X" = empezar X segundos antes de que acabe lo anterior. Con
        // esta cuenta cada bloque arranca ENTER_STAGGER después del previo.
        const overlap = `>-${ENTER_DURATION - ENTER_STAGGER}`;

        // 1. Secuencia de entrada (se reproduce una sola vez).
        gsap
          .timeline({
            defaults: { duration: ENTER_DURATION, ease: "power3.out" },
          })
          .fromTo("[data-hero-item='eyebrow']", from, to)
          .fromTo(
            "[data-hero-item='word']",
            from,
            { ...to, stagger: WORD_STAGGER },
            overlap,
          )
          .fromTo("[data-hero-item='subtitle']", from, to, overlap)
          .fromTo("[data-hero-item='cta']", from, to, overlap)
          .fromTo(scrollHint, { autoAlpha: 0 }, { autoAlpha: 1 }, overlap);

        // 2. Parallax ligado al scroll. Se anima el CONTENEDOR del texto,
        //    no cada elemento, para no pisar la animación de entrada.
        const scrollTrigger = {
          trigger: root,
          start: "top top", // cuando el hero toca el borde superior
          end: "bottom top", // hasta que sale por completo de pantalla
          scrub: true, // el avance sigue exactamente al scroll
        };
        gsap.to(contentRef.current, {
          yPercent: -18,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger,
        });
        gsap.to(glowRef.current, {
          yPercent: 22,
          ease: "none",
          scrollTrigger,
        });
      },
    );

    // Limpieza: detiene animaciones y ScrollTriggers al desmontar.
    return () => mm.revert();
  }, []);

  /* ── 3: partículas doradas ambientales ────────────────────────────── */
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /** Crea una partícula con tamaño, color, posición y duración al azar. */
    const spawn = () => {
      if (document.hidden) return; // no acumular con la pestaña oculta
      if (container.childElementCount >= MAX_PARTICLES) return; // tope

      const particle = document.createElement("span");
      const size = (Math.random() * 3 + 2).toFixed(1); // 2–5 px
      const hasGlow = Math.random() < 0.35; // ~1 de cada 3 brilla más
      const color =
        PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
      const duration = (Math.random() * 2 + 2).toFixed(2); // 2–4 s
      const drift = `${(Math.random() * 30 - 15).toFixed(0)}px`; // deriva lateral

      particle.className = `ambient-sparkle${hasGlow ? " ambient-sparkle--glow" : ""}`;
      particle.style.cssText = [
        `left:${(Math.random() * 100).toFixed(2)}%`,
        `top:${(Math.random() * 100).toFixed(2)}%`,
        `width:${size}px`,
        `height:${size}px`,
        `--spark-color:${color}`,
        `--drift:${drift}`,
        `animation-duration:${duration}s,${duration}s`,
      ].join(";");

      container.appendChild(particle);
      // Al terminar su animación, la partícula se elimina del DOM.
      particle.addEventListener("animationend", () => particle.remove(), {
        once: true,
      });
    };

    for (let i = 0; i < INITIAL_PARTICLES; i++) spawn();
    const intervalId = window.setInterval(spawn, SPAWN_INTERVAL_MS);

    // Limpieza: detiene el generador y borra las partículas restantes.
    return () => {
      window.clearInterval(intervalId);
      container.replaceChildren();
    };
  }, []);

  return (
    // data-theme="noche": el Hero es SIEMPRE de noche, también cuando la
    // tienda está en modo día. Al redefinir aquí las variables de tema
    // (globals.css), todo lo que hay dentro usa la paleta oscura.
    <section
      ref={rootRef}
      data-theme="noche"
      aria-label="Presentación"
      className="relative flex h-[100svh] min-h-[600px] items-center justify-center overflow-hidden bg-dark-deep text-center"
    >
      {/* Fondo 1: degradado oscuro vertical */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-dark via-dark-deep to-dark-deep"
      />

      {/* Fondo 2: resplandor dorado radial (se mueve con el parallax) */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(201,168,76,0.16),transparent_70%),radial-gradient(ellipse_40%_35%_at_82%_18%,rgba(232,212,139,0.06),transparent_65%)]"
      />

      {/* Partículas: los <span> los inserta el segundo useEffect */}
      <div
        ref={particlesRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      />

      {/* Fundido inferior: une el hero con la sección siguiente. Usa
          --fondo-pagina (definida solo en <html>, globals.css) y no
          dark-deep: dentro del Hero dark-deep es siempre de noche, y en
          modo día la sección siguiente es marfil. Así el fundido termina
          en el color real de la página en los dos temas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-(--fondo-pagina) to-transparent"
      />

      {/* Texto */}
      <div
        ref={contentRef}
        className="relative z-10 mx-auto max-w-4xl px-6 pt-16"
      >
        <p
          data-hero-item="eyebrow"
          className={`${HIDDEN} mb-6 text-[11px] font-normal uppercase tracking-[0.4em] text-gold-light sm:text-xs`}
        >
          Colección Exclusiva · 2026
        </p>

        {/* aria-label da el titular completo a lectores de pantalla; las
            palabras sueltas (aria-hidden) son solo para animarlas. */}
        <h1
          aria-label="Descubre tu fragancia ideal"
          className="font-serif text-[clamp(2.75rem,9vw,6.5rem)] font-medium leading-[1.05] text-ink"
        >
          <span aria-hidden="true" className="block">
            {HEADLINE.filter((word) => !word.accent).map((word) => (
              <span
                key={word.text}
                data-hero-item="word"
                className={`${HIDDEN} mx-[0.12em] inline-block`}
              >
                {word.text}
              </span>
            ))}
          </span>
          <span aria-hidden="true" className="block">
            {HEADLINE.filter((word) => word.accent).map((word) => (
              <span
                key={word.text}
                data-hero-item="word"
                className={`${HIDDEN} text-glow-gold mx-[0.12em] inline-block italic text-gold-ink`}
              >
                {word.text}
              </span>
            ))}
          </span>
        </h1>

        <p
          data-hero-item="subtitle"
          className={`${HIDDEN} mx-auto mt-7 max-w-xl text-base font-light leading-relaxed text-ink-muted sm:text-lg`}
        >
          Las fragancias más vendidas del mundo, disponibles en Colombia.
        </p>

        <div data-hero-item="cta" className={`${HIDDEN} mt-10`}>
          <Link
            href="/catalogo"
            className="inline-block rounded-lg bg-gold px-9 py-4 text-xs font-medium uppercase tracking-[0.22em] text-on-gold transition-[background-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-gold-bright hover:shadow-[0_12px_32px_rgba(201,168,76,0.3)]"
          >
            Explorar Catálogo
          </Link>
        </div>
      </div>

      {/* Indicador de scroll */}
      <Link
        href="/#destacados"
        data-hero-scroll
        aria-label="Bajar a los destacados"
        className={`${HIDDEN} absolute bottom-7 left-1/2 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center text-gold-light`}
      >
        <ChevronDownIcon className="scroll-hint h-6 w-6" />
      </Link>
    </section>
  );
}
