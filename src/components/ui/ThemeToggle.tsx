"use client";

/**
 * src/components/ui/ThemeToggle.tsx — Botón para cambiar entre noche y día.
 *
 * QUÉ ES
 *   El botón del Header con un sol o una luna que alterna el tema de la
 *   tienda: noche (por defecto, la estética oscura de la marca) o día
 *   (fondos marfil y texto oscuro, más cómodo con mucha luz).
 *
 * POR QUÉ EXISTE
 *   Hay clientes que navegan de día, al sol, desde el celular: un sitio
 *   completamente oscuro se lee peor en esas condiciones. El tema de día
 *   es opcional y la elección se recuerda en ese navegador.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - El tema se aplica con el atributo data-theme de <html> ("noche" o
 *     "dia"). Las variables de color de cada tema están en
 *     src/app/globals.css y los tokens de tailwind.config.ts apuntan a
 *     ellas: cambiar el atributo recolorea toda la tienda sin recargar.
 *   - La preferencia se guarda en localStorage con la clave
 *     "isabelee-tema". El script de <head> de src/app/layout.tsx la lee en
 *     la siguiente visita y aplica el tema ANTES de pintar (sin parpadeo).
 *   - Lo monta src/components/layout/Header.tsx, en escritorio y en móvil.
 *   - El Hero de la portada lleva data-theme="noche" fijo: no cambia.
 *
 * DETALLES
 *   - El tema "verdadero" es el atributo de <html>, no un estado de React.
 *     useSyncExternalStore lo lee de ahí y vigila sus cambios con un
 *     MutationObserver. En el servidor (y durante la hidratación) devuelve
 *     "noche", lo mismo que trae el HTML; justo después React lee el valor
 *     real. Así el botón nunca provoca un error de hidratación.
 *   - Transición suave: al cambiar, se pone la clase "tema-cambiando" en
 *     <html> durante 400 ms (ver globals.css). No se pone si la persona
 *     pidió reducir el movimiento (prefers-reduced-motion).
 *   - Accesibilidad: aria-label dice qué hará el botón ("Activar modo
 *     día"); aria-pressed indica si el modo día está activo.
 */
import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

/** Clave de localStorage. Debe coincidir con CLAVE_TEMA de src/app/layout.tsx. */
const CLAVE_TEMA = "isabelee-tema";
/** Duración de la transición de colores, en milisegundos. */
const DURACION_TRANSICION_MS = 400;

type Tema = "noche" | "dia";

/** Lee el tema actual del atributo de <html>. */
function leerTema(): Tema {
  return document.documentElement.getAttribute("data-theme") === "dia"
    ? "dia"
    : "noche";
}

/** Avisa a React cada vez que cambia data-theme en <html>. */
function suscribir(alCambiar: () => void): () => void {
  const observador = new MutationObserver(alCambiar);
  observador.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observador.disconnect();
}

type ThemeToggleProps = {
  /** Clases del botón (las pone el Header, igual que sus otros íconos). */
  className?: string;
};

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const tema = useSyncExternalStore(suscribir, leerTema, () => "noche" as Tema);
  const esDia = tema === "dia";

  function alternar() {
    const nuevo: Tema = esDia ? "noche" : "dia";
    const html = document.documentElement;

    const reducirMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!reducirMovimiento) {
      html.classList.add("tema-cambiando");
      window.setTimeout(
        () => html.classList.remove("tema-cambiando"),
        DURACION_TRANSICION_MS,
      );
    }

    html.setAttribute("data-theme", nuevo);
    try {
      localStorage.setItem(CLAVE_TEMA, nuevo);
    } catch {
      // Almacenamiento bloqueado: el cambio vale para esta visita.
    }
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={esDia ? "Activar modo noche" : "Activar modo día"}
      aria-pressed={esDia}
      className={className}
    >
      {/* Se muestra el ícono del modo al que se va a pasar. */}
      {esDia ? (
        <MoonIcon className="h-5 w-5" aria-hidden="true" />
      ) : (
        <SunIcon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
