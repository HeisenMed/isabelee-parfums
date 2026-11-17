"use client";

/**
 * src/components/admin/CampoEtiquetas.tsx — Campo de lista de etiquetas.
 *
 * QUÉ ES
 *   Un campo para escribir una lista de palabras o frases cortas: las
 *   notas de salida, de corazón y de fondo, y las ocasiones de un perfume.
 *   Se escribe una, se pulsa Enter o coma, y queda como una "etiqueta" que
 *   se puede quitar con su botón.
 *
 * POR QUÉ EXISTE
 *   En la base de datos esos datos son listas (`notas.salida` es
 *   ["Bergamota", "Limón"]). Pedir que se escriban separadas por comas en
 *   una sola caja invita a errores (comas de más, espacios, repetidos).
 *   Aquí cada elemento se ve y se borra por separado.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usa src/components/admin/FormularioPerfume.tsx, que guarda la
 *     lista en su estado y la recibe de vuelta con `onCambio`.
 *   - Para viajar en el formulario, la lista se escribe como texto JSON
 *     (JavaScript Object Notation) en un campo oculto llamado `name`. La
 *     Server Action guardarPerfume() (src/app/admin/perfumes/actions.ts)
 *     lo lee y vuelve a limpiar la lista en el servidor.
 *   - Ícono CloseIcon de src/components/ui/icons.tsx (SVG; la interfaz no
 *     usa el carácter "×" — CLAUDE.md §10.3).
 *
 * TECLADO
 *   - Enter o coma: añade lo escrito. (Enter NO envía el formulario.)
 *   - Retroceso con la caja vacía: quita la última etiqueta.
 *   - Tab: recorre los botones de quitar y la caja de texto.
 *   - Al salir de la caja, lo que quedara escrito se añade solo.
 */
import { useState, type KeyboardEvent } from "react";
import { ayuda as claseAyuda, errorCampo, etiqueta } from "@/components/admin/estilos";
import { CloseIcon } from "@/components/ui/icons";

type CampoEtiquetasProps = {
  /** Prefijo para los id internos; único en la página. */
  id: string;
  /** Nombre del campo oculto que viaja en el formulario. */
  name: string;
  /** Texto de la etiqueta visible ("Notas de salida"). */
  titulo: string;
  /** Lista actual. */
  valores: string[];
  /** Se llama con la lista nueva cada vez que cambia. */
  onCambio: (valores: string[]) => void;
  /** Ejemplo que se muestra en la caja vacía. */
  placeholder?: string;
  /** Mensaje de error del servidor para este campo. */
  error?: string;
};

export default function CampoEtiquetas({
  id,
  name,
  titulo,
  valores,
  onCambio,
  placeholder,
  error,
}: CampoEtiquetasProps) {
  /** Lo que se está escribiendo y aún no es etiqueta. */
  const [texto, setTexto] = useState("");
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;

  /** Convierte en etiquetas lo escrito (puede traer varias, con comas). */
  function agregar(crudo: string) {
    const nuevas = crudo
      .split(",")
      .map((parte) => parte.trim().replace(/\s+/g, " "))
      .filter(Boolean);
    if (nuevas.length === 0) {
      setTexto("");
      return;
    }
    // Sin repetidos, sin distinguir mayúsculas ("Vainilla" = "vainilla").
    const resultado = [...valores];
    for (const nueva of nuevas) {
      const yaEsta = resultado.some(
        (actual) =>
          actual.toLocaleLowerCase("es") === nueva.toLocaleLowerCase("es"),
      );
      if (!yaEsta) resultado.push(nueva);
    }
    onCambio(resultado);
    setTexto("");
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter" || evento.key === ",") {
      // preventDefault: Enter enviaría el formulario y la coma se
      // escribiría en la caja.
      evento.preventDefault();
      agregar(texto);
    } else if (evento.key === "Backspace" && texto === "" && valores.length > 0) {
      onCambio(valores.slice(0, -1));
    }
  }

  return (
    <div>
      <label htmlFor={id} className={etiqueta}>
        {titulo}
      </label>
      <input type="hidden" name={name} value={JSON.stringify(valores)} />

      <div
        className={`mt-1.5 flex flex-wrap items-center gap-2 rounded-lg bg-admin-surface px-2.5 py-2 ${
          error
            ? "border-2 border-admin-error"
            : "border border-admin-border-strong focus-within:border-admin-gold-text"
        }`}
      >
        {valores.map((valor) => (
          <span
            key={valor}
            className="inline-flex items-center gap-1 rounded border border-admin-border bg-admin-bg py-0.5 pl-2.5 text-sm text-admin-text"
          >
            {valor}
            <button
              type="button"
              onClick={() => onCambio(valores.filter((actual) => actual !== valor))}
              aria-label={`Quitar ${valor}`}
              className="flex h-8 w-8 items-center justify-center rounded text-admin-muted transition-colors duration-200 hover:text-admin-error"
            >
              <CloseIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={alPulsarTecla}
          onBlur={() => agregar(texto)}
          placeholder={valores.length === 0 ? placeholder : undefined}
          aria-describedby={error ? `${idAyuda} ${idError}` : idAyuda}
          aria-invalid={error ? true : undefined}
          // El contorno de foco lo dibuja el recuadro exterior
          // (focus-within), no esta caja interior.
          className="min-h-8 min-w-[9rem] flex-1 bg-transparent px-1 text-base text-admin-text placeholder:text-admin-muted focus:outline-none"
        />
      </div>

      <p id={idAyuda} className={claseAyuda}>
        Escribe y pulsa Enter o coma para añadir.
      </p>
      {error && (
        <p id={idError} className={errorCampo}>
          {error}
        </p>
      )}
    </div>
  );
}
