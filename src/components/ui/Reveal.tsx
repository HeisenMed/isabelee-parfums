"use client";

/**
 * src/components/ui/Reveal.tsx — Aparición suave al hacer scroll.
 *
 * QUÉ ES
 *   Un envoltorio: lo que se ponga dentro aparece con un fundido y un leve
 *   desplazamiento hacia arriba la primera vez que entra en pantalla.
 *
 * POR QUÉ EXISTE
 *   Es el efecto "reveal al hacer scroll: fade-in-up sutil" de CLAUDE.md
 *   §10.5 (la clase .reveal del sitio antiguo). Al estar en un componente,
 *   cualquier sección lo obtiene envolviendo su contenido, sin repetir
 *   código de animación.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan las secciones de src/components/home/ (Featured, Categories,
 *     Newsletter, WhatsAppCta) y SectionHeading.
 *   - Usa Framer Motion (`whileInView`), por eso necesita "use client":
 *     la detección de scroll solo existe en el navegador. Las secciones
 *     que lo usan pueden seguir siendo componentes de servidor.
 *   - Respeta prefers-reduced-motion: si la persona pidió menos
 *     movimiento, el contenido se muestra directamente, sin animar.
 */
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Retraso en segundos; sirve para escalonar varios elementos vecinos. */
  delay?: number;
  /** Clases extra para el contenedor. */
  className?: string;
};

export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  // Sin animación: un <div> normal, visible desde el primer momento.
  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      // once: se anima solo la primera vez. margin: espera a que el
      // elemento haya entrado 80px en pantalla antes de dispararse.
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
