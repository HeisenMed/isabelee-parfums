"use client";

/**
 * src/components/admin/DialogoEliminar.tsx — Confirmación para eliminar un
 * perfume.
 *
 * QUÉ ES
 *   La ventana que aparece al pulsar "Eliminar". Explica qué se va a
 *   perder y obliga a escribir el nombre exacto del perfume antes de dejar
 *   pulsar el botón definitivo.
 *
 * POR QUÉ EXISTE
 *   Eliminar no se puede deshacer: se borran el perfume, sus reseñas y sus
 *   fotos y videos subidos. Un simple "¿Seguro? Aceptar" se pulsa por
 *   inercia; tener que escribir el nombre hace imposible borrar el perfume
 *   equivocado por un clic de más. Para quitar un perfume de la tienda sin
 *   perderlo existe el interruptor "Activo", y el diálogo lo recuerda.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo abren src/components/admin/ListaPerfumes.tsx (botón de cada fila)
 *     y src/components/admin/AccionesPerfume.tsx (zona de peligro del
 *     formulario de edición).
 *   - Envía a la Server Action eliminarPerfumeAccion() de
 *     src/app/admin/perfumes/actions.ts, que vuelve a comprobar el nombre
 *     EN EL SERVIDOR y, si todo va bien, redirige a /admin/perfumes con un
 *     aviso. Si falla, devuelve el error y se muestra aquí.
 *   - Usa el elemento nativo <dialog> con showModal(): el navegador se
 *     encarga de oscurecer el fondo, de mantener el foco dentro de la
 *     ventana y de cerrarla con la tecla Escape.
 */
import { useActionState, useEffect, useRef, useState } from "react";
import {
  eliminarPerfumeAccion,
  type EstadoEliminar,
} from "@/app/admin/perfumes/actions";
import {
  avisoError,
  botonContorno,
  botonPeligro,
  campoTexto,
  etiqueta,
} from "@/components/admin/estilos";

const ESTADO_INICIAL: EstadoEliminar = { error: null };

type DialogoEliminarProps = {
  /** Perfume que se va a eliminar. */
  perfume: { id: number; nombre: string; marca: string };
  /** Se llama al cancelar o cerrar la ventana. */
  onCerrar: () => void;
};

export default function DialogoEliminar({
  perfume,
  onCerrar,
}: DialogoEliminarProps) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [estado, enviar, enviando] = useActionState(
    eliminarPerfumeAccion,
    ESTADO_INICIAL,
  );

  // showModal() es lo que convierte el <dialog> en una ventana modal de
  // verdad (con fondo bloqueado y foco atrapado); el atributo `open` solo
  // lo mostraría como un bloque más de la página.
  useEffect(() => {
    const elemento = dialogo.current;
    if (elemento && !elemento.open) elemento.showModal();
  }, []);

  // Misma regla que aplica el servidor: igual letra por letra, ignorando
  // solo los espacios de los extremos.
  const coincide = confirmacion.trim() === perfume.nombre.trim();

  return (
    <dialog
      ref={dialogo}
      // "close" se dispara al pulsar Escape: se avisa al componente padre
      // para que deje de dibujar el diálogo.
      onClose={onCerrar}
      aria-labelledby="eliminar-titulo"
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-admin-border bg-admin-surface p-0 text-admin-text backdrop:bg-black/50"
    >
      <form action={enviar} className="space-y-4 p-6">
        <input type="hidden" name="id" value={perfume.id} />

        <h2
          id="eliminar-titulo"
          className="font-serif text-2xl font-semibold text-admin-text"
        >
          Eliminar perfume
        </h2>

        <p className="text-base leading-relaxed">
          Vas a eliminar{" "}
          <strong className="font-semibold">{perfume.nombre}</strong> de{" "}
          {perfume.marca}. Esto no se puede deshacer.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-admin-muted">
          <li>Se borran también todas sus reseñas.</li>
          <li>Se borran las fotos y los videos que se hayan subido para él.</li>
          <li>
            Si solo quieres que deje de verse en la tienda, cancela y apaga el
            interruptor «Activo»: así no se pierde nada.
          </li>
        </ul>

        {estado.error && (
          <p role="alert" className={avisoError}>
            {estado.error}
          </p>
        )}

        <div>
          <label htmlFor="eliminar-confirmacion" className={etiqueta}>
            Para confirmar, escribe el nombre del perfume:{" "}
            <span className="select-all font-semibold">{perfume.nombre}</span>
          </label>
          <input
            id="eliminar-confirmacion"
            name="confirmacion"
            type="text"
            value={confirmacion}
            onChange={(evento) => setConfirmacion(evento.target.value)}
            autoComplete="off"
            className={campoTexto}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => dialogo.current?.close()}
            className={botonContorno}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!coincide || enviando}
            className={botonPeligro}
          >
            {enviando ? "Eliminando…" : "Eliminar para siempre"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
