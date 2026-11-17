"use client";

/**
 * src/components/ui/useAtraparFoco.ts — Hook para paneles superpuestos.
 *
 * QUÉ ES
 *   Un "hook" de React (una función reutilizable con estado y efectos) que
 *   da a un panel superpuesto el comportamiento accesible de una ventana:
 *     1. Al abrirse, lleva el foco a su primer elemento (o al indicado).
 *     2. Atrapa el foco: con Tab y Shift+Tab se recorre solo el panel, sin
 *        escaparse a la página de detrás (focus trap).
 *     3. Escape lo cierra.
 *     4. Bloquea el desplazamiento de la página de fondo.
 *     5. Al cerrarse, devuelve el foco al elemento que lo abrió.
 *
 * POR QUÉ EXISTE
 *   El buscador (src/components/search/SearchOverlay.tsx) y el carrito
 *   (src/components/cart/CartDrawer.tsx) necesitan exactamente lo mismo.
 *   No usan <dialog> nativo porque se animan con Framer Motion al entrar y
 *   salir, y <dialog> cierra de golpe. Sin estas cinco reglas, quien navega
 *   con teclado o lector de pantalla se "perdería" detrás del panel.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Recibe la referencia del panel, si está abierto y qué hacer al
 *     cerrarse. El panel decide su aspecto; este hook, solo el teclado.
 */
import { useEffect, useRef, type RefObject } from "react";

/** Elementos que pueden recibir el foco con Tab. */
const ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useAtraparFoco(
  panel: RefObject<HTMLElement | null>,
  abierto: boolean,
  alCerrar: () => void,
  /** Elemento que recibe el foco al abrir (por defecto, el primero). */
  inicial?: RefObject<HTMLElement | null>,
): void {
  // Se guarda en una ref para que el efecto no se reinicie cada vez que
  // quien lo usa cree una función alCerrar nueva al dibujarse.
  const cerrarRef = useRef(alCerrar);
  cerrarRef.current = alCerrar;

  useEffect(() => {
    if (!abierto) return;

    const anterior = document.activeElement as HTMLElement | null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Se espera un fotograma: el panel puede estar montándose todavía.
    const marco = window.requestAnimationFrame(() => {
      const destino =
        inicial?.current ??
        panel.current?.querySelector<HTMLElement>(ENFOCABLES) ??
        panel.current;
      destino?.focus();
    });

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrarRef.current();
        return;
      }
      if (evento.key !== "Tab" || !panel.current) return;

      const elementos = Array.from(
        panel.current.querySelectorAll<HTMLElement>(ENFOCABLES),
      ).filter((el) => el.offsetParent !== null); // solo los visibles
      if (elementos.length === 0) return;

      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      const activo = document.activeElement;

      if (evento.shiftKey && (activo === primero || !panel.current.contains(activo))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (activo === ultimo || !panel.current.contains(activo))) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alPulsar);

    return () => {
      window.cancelAnimationFrame(marco);
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = overflowAnterior;
      // Devolver el foco a quien abrió el panel (si sigue en la página).
      if (anterior && document.contains(anterior)) anterior.focus();
    };
  }, [abierto, panel, inicial]);
}
