"use client";

/**
 * src/components/admin/Interruptor.tsx — Interruptor de sí/no.
 *
 * QUÉ ES
 *   Un interruptor deslizante (como los de los ajustes de un teléfono) para
 *   valores de sí o no: Activo, Destacado, Agotado.
 *
 * POR QUÉ EXISTE
 *   Una casilla de verificación es pequeña y difícil de tocar en el móvil,
 *   y no transmite "encendido/apagado" de un vistazo. Este componente se
 *   usa igual en la lista de perfumes (donde guarda al instante) y en el
 *   formulario (donde solo cambia el valor que se enviará).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan src/components/admin/ListaPerfumes.tsx y
 *     src/components/admin/FormularioPerfume.tsx.
 *   - No guarda nada por sí mismo: avisa del cambio con `onCambio` y quien
 *     lo usa decide qué hacer. Si se le pasa `name`, incluye un campo
 *     oculto con "true" o "false" para que el valor viaje en un formulario.
 *   - Colores: tokens `admin-*` de tailwind.config.ts.
 *
 * ACCESIBILIDAD
 *   - Es un <button> con role="switch" y aria-checked: los lectores de
 *     pantalla lo anuncian como "interruptor, activado/desactivado" y se
 *     acciona con Espacio o Enter.
 *   - El área que se puede tocar mide 44 px de alto aunque el dibujo sea
 *     más pequeño.
 *   - Encendido se distingue por la posición del círculo y por el color, no
 *     solo por el color.
 */

type InterruptorProps = {
  /** Estado actual. */
  activado: boolean;
  /** Se llama con el valor nuevo al accionarlo. */
  onCambio: (valor: boolean) => void;
  /** Nombre accesible cuando no hay una etiqueta visible enlazada. */
  ariaLabel?: string;
  /** id de la etiqueta visible que lo nombra (alternativa a ariaLabel). */
  ariaLabelledBy?: string;
  /** id del texto que lo explica. */
  ariaDescribedBy?: string;
  /** Si se indica, añade un campo oculto con ese nombre al formulario. */
  name?: string;
  disabled?: boolean;
};

export default function Interruptor({
  activado,
  onCambio,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  name,
  disabled = false,
}: InterruptorProps) {
  return (
    <>
      {name && <input type="hidden" name={name} value={String(activado)} />}
      <button
        type="button" // dentro de un formulario, no debe enviarlo
        role="switch"
        aria-checked={activado}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => onCambio(!activado)}
        className="inline-flex h-11 w-14 shrink-0 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {/* Carril */}
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 rounded-full border transition-colors duration-200 ${
            activado
              ? "border-admin-gold-text bg-admin-gold-text"
              : "border-admin-border-strong bg-admin-surface"
          }`}
        >
          {/* Círculo que se desliza */}
          <span
            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-[left,background-color] duration-200 ${
              activado
                ? "left-[22px] bg-admin-surface"
                : "left-[3px] bg-admin-border-strong"
            }`}
          />
        </span>
      </button>
    </>
  );
}
