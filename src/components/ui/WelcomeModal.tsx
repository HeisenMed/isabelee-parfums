"use client";

/**
 * src/components/ui/WelcomeModal.tsx — Modal de bienvenida.
 *
 * QUÉ ES
 *   La ventana emergente que saluda a quien entra al sitio y le recuerda
 *   que puede pedir por WhatsApp una fragancia que no encuentre.
 *
 * POR QUÉ EXISTE
 *   Sustituye al <div class="welcome-overlay"> del index.html antiguo y a
 *   initWelcomeModal()/openWelcome()/closeWelcome() de js/main.js. El
 *   contenido es el mismo, con la marca nueva: "Isabeleé Fragancias".
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/(tienda)/layout.tsx, fuera del contenido de la página.
 *   - Necesita "use client": usa estado, temporizador y sessionStorage.
 *   - Framer Motion anima la entrada y la salida (AnimatePresence es lo
 *     que permite animar la salida antes de quitarlo del DOM).
 *   - La URL de WhatsApp viene de src/lib/site.ts; los íconos, de
 *     src/components/ui/icons.tsx (SVG, sin emojis — CLAUDE.md §10.3).
 *   - Estilo según CLAUDE.md §10.4: fondo #1a1a1a (dark-secondary), borde
 *     dorado sutil, desenfoque del fondo y ningún azul.
 *
 * COMPORTAMIENTO
 *   - Aparece 2 segundos después de cargar, UNA vez por sesión del
 *     navegador. Se usa sessionStorage (no localStorage) a propósito: así
 *     vuelve a mostrarse en una visita nueva, pero no al cambiar de página.
 *   - Se cierra con la X, con "Continuar al sitio", con Escape o tocando
 *     fuera de la tarjeta.
 *   - Al abrir lleva el foco al botón de cerrar y al cerrar lo devuelve a
 *     donde estaba, para quien navega con teclado.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { BottleIcon, CloseIcon, WhatsAppIcon } from "@/components/ui/icons";
import { SITE_SHORT_NAME, SITE_TAGLINE, WHATSAPP_MESSAGE_URL } from "@/lib/site";

/** Clave de sessionStorage que recuerda que el modal ya se mostró. */
const STORAGE_KEY = "isabele-welcome";
/** Espera antes de abrir el modal, en milisegundos. */
const OPEN_DELAY_MS = 2000;

/** Curva de animación suave, sin rebote (CLAUDE.md §10.4). */
const EASE = [0.22, 1, 0.36, 1] as const;

/** Contenedor: reparte la entrada de sus hijos de forma escalonada. */
const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

/** Cada bloque interior: sube 10px mientras aparece. */
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  /** Elemento que tenía el foco antes de abrir, para devolvérselo. */
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Programa la apertura, salvo que ya se haya mostrado en esta sesión.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // sessionStorage bloqueado (modo privado estricto): se muestra igual.
    }

    const timeoutId = window.setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Sin almacenamiento disponible: simplemente no se recuerda.
      }
      setOpen(true);
    }, OPEN_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, []);

  // Mientras está abierto: foco, tecla Escape y bloqueo del scroll.
  useEffect(() => {
    if (!open) return;

    lastFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      lastFocusRef.current?.focus();
    };
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && (
        // Velo oscuro con desenfoque. Un clic directo sobre él cierra el modal.
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={(event) => {
            // Solo si el clic fue en el velo, no dentro de la tarjeta.
            if (event.target === event.currentTarget) close();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            className="relative my-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-gold/25 bg-dark-secondary px-6 pb-8 pt-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.6)] sm:px-10 sm:pb-9 sm:pt-11"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            {/* Halo dorado muy tenue arriba, para que el fondo no sea plano */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(201,168,76,0.12),transparent_70%)]"
            />

            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors duration-200 hover:text-gold-light"
            >
              <CloseIcon className="h-5 w-5" />
            </button>

            <motion.div
              className="relative"
              variants={listVariants}
              // Con movimiento reducido se salta directo al estado final.
              initial={reduceMotion ? "visible" : "hidden"}
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <BottleIcon
                  aria-hidden="true"
                  className="mx-auto mb-4 h-10 w-auto text-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.45)]"
                />
              </motion.div>

              <motion.h2
                id="welcome-title"
                variants={itemVariants}
                className="font-serif text-3xl font-normal leading-tight text-gold sm:text-[34px]"
              >
                Bienvenido a {SITE_SHORT_NAME}
              </motion.h2>

              <motion.p
                variants={itemVariants}
                className="mt-2 font-serif text-lg italic text-gold-light"
              >
                {SITE_TAGLINE}
              </motion.p>

              {/* Separador: dos líneas doradas y un rombo hecho con CSS
                  (un cuadrado girado 45°, no un carácter). */}
              <motion.div
                variants={itemVariants}
                aria-hidden="true"
                className="my-6 flex items-center justify-center gap-3"
              >
                <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold" />
                <span className="h-[5px] w-[5px] rotate-45 bg-gold" />
                <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold" />
              </motion.div>

              <motion.p
                variants={itemVariants}
                className="text-[15px] font-light leading-relaxed text-ink"
              >
                Explora nuestra colección de fragancias exclusivas.
              </motion.p>

              {/* Recuadro destacado: el mensaje clave del modal */}
              <motion.p
                variants={itemVariants}
                className="mt-5 rounded-lg border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-left text-base font-light italic leading-relaxed text-gold-light"
              >
                ¿No encuentras tu fragancia? Escríbenos y te ayudamos a
                encontrarla
              </motion.p>

              <motion.a
                variants={itemVariants}
                href={WHATSAPP_MESSAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 flex items-center justify-center gap-2.5 rounded-lg bg-gold px-6 py-4 text-sm font-medium tracking-wide text-dark-secondary transition-[background-color,box-shadow] duration-200 hover:bg-gold-light hover:shadow-[0_10px_26px_rgba(201,168,76,0.3)]"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                Escríbenos por WhatsApp
              </motion.a>

              <motion.p
                variants={itemVariants}
                className="mt-4 text-xs font-light text-ink-muted"
              >
                O explora el catálogo a tu ritmo
              </motion.p>

              <motion.button
                variants={itemVariants}
                type="button"
                onClick={close}
                className="mt-3 px-2 py-2 text-sm font-light text-gold underline underline-offset-4 transition-colors duration-200 hover:text-gold-light"
              >
                Continuar al sitio
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
