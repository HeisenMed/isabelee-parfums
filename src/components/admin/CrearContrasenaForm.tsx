"use client";

/**
 * src/components/admin/CrearContrasenaForm.tsx — Formulario de contraseña
 * nueva.
 *
 * QUÉ ES
 *   Los dos campos (contraseña y confirmación) de /admin/crear-contrasena,
 *   con un botón para mostrar u ocultar lo que se escribe.
 *
 * POR QUÉ EXISTE
 *   Lo usan dos situaciones con el mismo final: una administradora recién
 *   invitada que crea su primera contraseña, y una que la olvidó. Necesita
 *   "use client" por el botón mostrar/ocultar (estado en el navegador) y
 *   por el aviso de envío en curso.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Envía los datos a la Server Action crearContrasena() de
 *     src/app/admin/actions.ts, que repite las validaciones en el servidor
 *     (mínimo 8 caracteres y que coincidan) y guarda la contraseña.
 *   - `minLength` hace que el navegador avise antes de enviar; es una
 *     comodidad, no la seguridad: la comprobación que cuenta es la del
 *     servidor.
 *   - Estilos: recetas de src/components/admin/estilos.ts.
 */
import { useActionState, useState } from "react";
import { crearContrasena, type EstadoFormulario } from "@/app/admin/actions";
import {
  avisoError,
  botonPrimario,
  campoTexto,
  etiqueta,
} from "@/components/admin/estilos";

const ESTADO_INICIAL: EstadoFormulario = { error: null };

/** Debe coincidir con MIN_CONTRASENA de src/app/admin/actions.ts. */
const MIN_CONTRASENA = 8;

export default function CrearContrasenaForm() {
  const [estado, enviar, enviando] = useActionState(
    crearContrasena,
    ESTADO_INICIAL,
  );
  /** true = las contraseñas se ven como texto normal. */
  const [visible, setVisible] = useState(false);
  const tipo = visible ? "text" : "password";

  return (
    <form action={enviar} className="space-y-5">
      {estado.error && (
        <p role="alert" className={avisoError}>
          {estado.error}
        </p>
      )}

      <div>
        <label htmlFor="nueva-password" className={etiqueta}>
          Contraseña
        </label>
        <input
          id="nueva-password"
          name="password"
          type={tipo}
          autoComplete="new-password"
          required
          minLength={MIN_CONTRASENA}
          aria-describedby="nueva-password-ayuda"
          className={campoTexto}
        />
        <p id="nueva-password-ayuda" className="mt-1.5 text-sm text-admin-muted">
          Mínimo {MIN_CONTRASENA} caracteres.
        </p>
      </div>

      <div>
        <label htmlFor="nueva-confirmacion" className={etiqueta}>
          Confirmar contraseña
        </label>
        <input
          id="nueva-confirmacion"
          name="confirmacion"
          type={tipo}
          autoComplete="new-password"
          required
          minLength={MIN_CONTRASENA}
          className={campoTexto}
        />
      </div>

      {/* type="button": sin esto, un botón dentro de un formulario lo
          envía. aria-pressed indica a los lectores de pantalla si el modo
          "ver contraseñas" está activo. */}
      <button
        type="button"
        onClick={() => setVisible((actual) => !actual)}
        aria-pressed={visible}
        className="text-sm font-medium text-admin-gold-text underline underline-offset-4 hover:text-admin-text"
      >
        {visible ? "Ocultar contraseñas" : "Mostrar contraseñas"}
      </button>

      <button type="submit" disabled={enviando} className={botonPrimario}>
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
