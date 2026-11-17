"use client";

/**
 * src/components/admin/CambiarContrasenaForm.tsx — Formulario para cambiar
 * la contraseña desde dentro del panel.
 *
 * QUÉ ES
 *   Los campos "Nueva contraseña" y "Repetir contraseña" de
 *   /admin/cambiar-contrasena, con su aviso de éxito o de error.
 *
 * POR QUÉ EXISTE
 *   Hoy no hay correo de recuperación (ver RECUPERACION_POR_CORREO en
 *   src/lib/admin-rutas.ts): las cuentas se crean en Supabase con una
 *   contraseña inicial. Esta pantalla es la forma de sustituirla por una
 *   propia sin depender de ningún enlace por correo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Envía los datos a la Server Action cambiarContrasena() de
 *     src/app/admin/actions.ts, que repite las validaciones en el servidor.
 *   - useActionState (hook de React 19) devuelve el último resultado
 *     ({ error, exito }), la función para enviar y si sigue enviándose.
 *   - Usa CampoContrasena (el campo con el botón del ojo).
 *   - Al terminar la acción, React 19 vacía por sí solo los campos del
 *     formulario: la contraseña no queda escrita en pantalla.
 *   - Lo monta src/app/admin/(panel)/cambiar-contrasena/page.tsx.
 */
import { useActionState } from "react";
import { cambiarContrasena, type EstadoFormulario } from "@/app/admin/actions";
import CampoContrasena from "@/components/admin/CampoContrasena";
import {
  avisoError,
  avisoExito,
  botonPrimario,
} from "@/components/admin/estilos";

const ESTADO_INICIAL: EstadoFormulario = { error: null, exito: null };

/** Debe coincidir con MIN_CONTRASENA de src/app/admin/actions.ts. */
const MIN_CONTRASENA = 8;

export default function CambiarContrasenaForm() {
  const [estado, enviar, enviando] = useActionState(
    cambiarContrasena,
    ESTADO_INICIAL,
  );

  return (
    <form action={enviar} className="space-y-5">
      {/* role="alert" anuncia el error en cuanto aparece; role="status"
          anuncia el éxito sin interrumpir. */}
      {estado.error && (
        <p role="alert" className={avisoError}>
          {estado.error}
        </p>
      )}
      {estado.exito && (
        <p role="status" className={avisoExito}>
          {estado.exito}
        </p>
      )}

      <CampoContrasena
        id="cambiar-password"
        name="password"
        etiqueta="Nueva contraseña"
        autoComplete="new-password"
        minLength={MIN_CONTRASENA}
        ayuda={`Mínimo ${MIN_CONTRASENA} caracteres.`}
      />

      <CampoContrasena
        id="cambiar-confirmacion"
        name="confirmacion"
        etiqueta="Repetir contraseña"
        autoComplete="new-password"
        minLength={MIN_CONTRASENA}
      />

      <button type="submit" disabled={enviando} className={botonPrimario}>
        {enviando ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
