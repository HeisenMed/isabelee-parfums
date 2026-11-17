"use client";

/**
 * src/components/admin/useAvisoSalida.ts — Aviso de "cambios sin guardar".
 *
 * QUÉ ES
 *   Un hook de React que, mientras `hayCambios` sea true:
 *     - al cerrar o recargar la pestaña, hace que el navegador pregunte
 *       (evento beforeunload; el texto lo pone el navegador);
 *     - al pulsar un enlace interno, pide confirmación antes de salir.
 *
 * POR QUÉ EXISTE
 *   Para no perder lo escrito en el editor de la portada por un clic
 *   distraído. Es la misma lógica que tiene FormularioPerfume.tsx; aquí
 *   está aparte para poder reutilizarla.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usa src/components/admin/portada/EditorPortada.tsx, UNA vez para
 *     las dos secciones (si cada sección lo usara por su cuenta, un clic en
 *     un enlace pediría confirmación dos veces).
 *   - Los enlaces que abren otra pestaña (target="_blank") no avisan: no
 *     se pierde nada.
 */
import { useEffect } from "react";

export function useAvisoSalida(hayCambios: boolean): void {
  useEffect(() => {
    if (!hayCambios) return;

    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };

    // Fase de captura (tercer argumento true): se intercepta el clic antes
    // de que llegue al enlace, para poder cancelarlo.
    const alPulsarEnlace = (evento: MouseEvent) => {
      const vinculo = (evento.target as HTMLElement | null)?.closest?.("a[href]") as
        | HTMLAnchorElement
        | null;
      if (!vinculo || vinculo.target === "_blank") return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Salir de todas formas? Se perderán.")) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", alSalir);
    document.addEventListener("click", alPulsarEnlace, true);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      document.removeEventListener("click", alPulsarEnlace, true);
    };
  }, [hayCambios]);
}
