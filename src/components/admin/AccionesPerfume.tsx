"use client";

/**
 * src/components/admin/AccionesPerfume.tsx — Acciones extra del formulario
 * de edición.
 *
 * QUÉ ES
 *   El bloque que aparece bajo el formulario al EDITAR un perfume (no al
 *   crearlo): "Ver en tienda", "Duplicar" y la zona de peligro con
 *   "Eliminar perfume".
 *
 * POR QUÉ EXISTE
 *   Estas acciones no forman parte de "Guardar": cada una es una operación
 *   distinta con su propio formulario o diálogo. HTML no permite meter un
 *   formulario dentro de otro, así que no pueden vivir dentro de
 *   FormularioPerfume; van en un componente hermano.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/admin/(panel)/perfumes/[id]/page.tsx, debajo de
 *     FormularioPerfume.
 *   - "Duplicar" invoca la Server Action duplicarPerfumeAccion() y
 *     "Eliminar" abre DialogoEliminar, que invoca eliminarPerfumeAccion()
 *     (ambas en src/app/admin/perfumes/actions.ts).
 *   - Necesita "use client" solo para abrir y cerrar el diálogo.
 *   - `activo` es el valor GUARDADO del perfume: si se acaba de cambiar el
 *     interruptor en el formulario sin guardar, "Ver en tienda" aún refleja
 *     lo que hay publicado, que es lo correcto.
 */
import { useState } from "react";
import { duplicarPerfumeAccion } from "@/app/admin/perfumes/actions";
import DialogoEliminar from "@/components/admin/DialogoEliminar";
import {
  botonContorno,
  botonPeligro,
  tarjeta,
  tituloSeccion,
} from "@/components/admin/estilos";

type AccionesPerfumeProps = {
  perfume: { id: number; nombre: string; marca: string; activo: boolean };
};

export default function AccionesPerfume({ perfume }: AccionesPerfumeProps) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="mt-6 space-y-6">
      <section className={tarjeta} aria-labelledby="acciones-titulo">
        <h2 id="acciones-titulo" className={tituloSeccion}>
          Otras acciones
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {perfume.activo ? (
            <a
              href={`/producto/${perfume.id}`}
              target="_blank"
              rel="noopener"
              className={botonContorno}
            >
              Ver en tienda
            </a>
          ) : (
            <p className="text-sm text-admin-muted">
              Este perfume está inactivo: no tiene página visible en la tienda.
            </p>
          )}
          <form action={duplicarPerfumeAccion}>
            <input type="hidden" name="id" value={perfume.id} />
            <button type="submit" className={botonContorno}>
              Duplicar
            </button>
          </form>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-admin-muted">
          «Duplicar» crea una copia inactiva con los mismos textos y sin fotos,
          útil para otra presentación del mismo perfume. No copia los cambios
          que aún no hayas guardado.
        </p>
      </section>

      <section
        className="rounded-lg border border-admin-error/40 bg-admin-surface p-5 sm:p-6"
        aria-labelledby="peligro-titulo"
      >
        <h2 id="peligro-titulo" className={tituloSeccion}>
          Zona de peligro
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-admin-muted">
          Eliminar borra para siempre el perfume, sus reseñas y las fotos y
          videos que se hayan subido para él. Para ocultarlo sin perderlo, apaga
          el interruptor «Activo» y guarda.
        </p>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className={`${botonPeligro} mt-4`}
        >
          Eliminar perfume
        </button>
      </section>

      {confirmando && (
        <DialogoEliminar
          perfume={perfume}
          onCerrar={() => setConfirmando(false)}
        />
      )}
    </div>
  );
}
