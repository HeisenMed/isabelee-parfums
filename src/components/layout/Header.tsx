"use client";

/**
 * src/components/layout/Header.tsx — Barra de navegación superior.
 *
 * QUÉ ES
 *   El encabezado fijo del sitio: logotipo de texto "Isabelé", menú
 *   principal, ícono de búsqueda, ícono de carrito con contador y, en
 *   pantallas pequeñas, un botón hamburguesa que abre un menú lateral.
 *
 * POR QUÉ EXISTE
 *   Sustituye al <header id="hdr"> y al <div class="mob-menu"> del
 *   index.html antiguo, y a la lógica de js/main.js que abría/cerraba el
 *   menú móvil. Ahora esa lógica es estado de React en lugar de añadir y
 *   quitar clases a mano.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/layout.tsx, así aparece en todas las páginas.
 *   - Los enlaces salen de NAV_LINKS (src/lib/site.ts); el Footer usa la
 *     misma lista, así ambos menús nunca se desincronizan.
 *   - Necesita "use client" porque usa estado (menú abierto, scroll) y
 *     eventos del navegador.
 *   - El menú móvil se anima con Framer Motion (AnimatePresence permite
 *     animar también la SALIDA, cuando el componente se desmonta).
 *   - PENDIENTE Fase 2: la búsqueda y el carrito son marcadores. El
 *     contador del carrito (CART_COUNT) se conectará al estado real del
 *     carrito, y la lupa abrirá el buscador.
 *
 * COMPORTAMIENTO
 *   - Arriba del todo es transparente, para que el hero se vea completo.
 *   - Al bajar se vuelve translúcido con desenfoque del fondo.
 *   - El menú móvil se cierra con Escape, tocando fuera o eligiendo un
 *     enlace, y bloquea el scroll de la página mientras está abierto.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BagIcon, CloseIcon, SearchIcon } from "@/components/ui/icons";
import { NAV_LINKS, SITE_NAME, SITE_SHORT_NAME } from "@/lib/site";

/** Marcador: cantidad de productos en el carrito. Se conecta en la Fase 2. */
const CART_COUNT = 0;

/** Píxeles de scroll a partir de los cuales el header deja de ser transparente. */
const SCROLL_THRESHOLD = 24;

/** Estilo común de los botones de ícono (búsqueda, carrito, hamburguesa). */
const iconButton =
  "relative flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors duration-200 hover:text-gold-light";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  // Detecta si la página ya se desplazó, para cambiar el fondo del header.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll(); // estado correcto si la página carga ya desplazada
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Con el menú móvil abierto: bloquea el scroll del fondo y permite
  // cerrarlo con la tecla Escape. Al cerrarse se restaura todo.
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
          scrolled
            ? "border-gold/15 bg-dark-deep/75 backdrop-blur-md"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8 lg:h-20">
          {/* Logotipo de texto con la fuente de marca */}
          <Link
            href="/"
            aria-label={`${SITE_NAME} — inicio`}
            className="font-serif text-3xl font-medium tracking-wide text-gold transition-colors duration-200 hover:text-gold-light lg:text-4xl"
          >
            {SITE_SHORT_NAME}
          </Link>

          {/* Menú de escritorio (oculto por debajo de lg) */}
          <nav aria-label="Menú principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {NAV_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="group relative py-2 text-xs font-normal uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:text-gold-light"
                  >
                    {link.label}
                    {/* Línea dorada que crece desde la izquierda al pasar el cursor */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Acciones: búsqueda, carrito y hamburguesa */}
          <div className="flex items-center gap-1">
            <button type="button" className={iconButton} aria-label="Buscar">
              <SearchIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              className={iconButton}
              aria-label={`Carrito, ${CART_COUNT} productos`}
            >
              <BagIcon className="h-5 w-5" />
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-dark-deep"
              >
                {CART_COUNT}
              </span>
            </button>

            <button
              type="button"
              className={`${iconButton} lg:hidden`}
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              onClick={() => setMenuOpen(true)}
            >
              {/* Hamburguesa dibujada con tres líneas CSS */}
              <span aria-hidden="true" className="flex w-5 flex-col gap-[5px]">
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
                <span className="h-px w-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Menú móvil. Va FUERA del <header> a propósito: el backdrop-filter
          del header crearía un contexto que recortaría a este panel fijo. */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Velo oscuro: tocarlo cierra el menú */}
            <motion.div
              key="velo"
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Panel que entra deslizándose desde la derecha */}
            <motion.nav
              key="panel"
              id="menu-movil"
              aria-label="Menú móvil"
              className="fixed inset-y-0 right-0 z-[70] flex w-[min(85vw,340px)] flex-col border-l border-gold/20 bg-dark-secondary lg:hidden"
              initial={{ x: reduceMotion ? 0 : "100%", opacity: reduceMotion ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduceMotion ? 0 : "100%", opacity: reduceMotion ? 0 : 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex h-16 items-center justify-between px-6">
                <span className="font-serif text-2xl text-gold">
                  {SITE_SHORT_NAME}
                </span>
                <button
                  type="button"
                  className={iconButton}
                  aria-label="Cerrar menú"
                  onClick={() => setMenuOpen(false)}
                  autoFocus
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <ul className="flex-1 overflow-y-auto px-6 py-4">
                {NAV_LINKS.map((link, index) => (
                  <motion.li
                    key={link.label}
                    className="border-b border-gold/10"
                    // Cada enlace aparece un poco después del anterior
                    initial={{ opacity: 0, x: reduceMotion ? 0 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: 0.12 + index * 0.05 }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block py-4 text-sm uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:text-gold-light"
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
