"use client";

/**
 * src/components/admin/RecuperarForm.tsx — Formulario "olvidé mi contraseña".
 *
 * QUÉ ES
 *   El campo de correo de /admin/recuperar. Al enviarlo, sustituye el
 *   formulario por un mensaje de confirmación.
 *
 * POR QUÉ EXISTE
 *   Necesita "use client" por lo mismo que LoginForm: desactivar el botón
 *   mientras se envía y mostrar la respuesta del servidor sin recargar.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Envía el correo a la Server Action solicitarRecuperacion() de
 *     src/app/admin/actions.ts, que pide a Supabase el correo con el
 *     enlace. Ese enlace abre src/app/auth/confirm/route.ts.
 *   - SEGURIDAD: el mensaje final es SIEMPRE el mismo, esté o no el correo
 *     autorizado. Si dijera "ese correo no existe", cualquiera podría
 *     probar correos hasta descubrir cuáles son administradores.
 *   - Estilos: recetas de src/components/admin/estilos.ts.
 */
import { useActionState } from "react";
import {
  solicitarRecuperacion,
  type EstadoRecuperacion,
} from "@/app/admin/actions";
import {
  avisoError,
  avisoInfo,
  botonPrimario,
  campoTexto,
  etiqueta,
} from "@/components/admin/estilos";

const ESTADO_INICIAL: EstadoRecuperacion = { enviado: false, error: null };

export default function RecuperarForm() {
  const [estado, enviar, enviando] = useActionState(
    solicitarRecuperacion,
    ESTADO_INICIAL,
  );

  if (estado.enviado) {
    return (
      // role="status": se anuncia a los lectores de pantalla sin
      // interrumpir, porque no es un error.
      <div role="status" className={`${avisoInfo} space-y-2`}>
        <p>
          Si el correo está autorizado, te llegará un enlace para crear una
          nueva contraseña. Revisa también la carpeta de spam.
        </p>
        <p className="text-admin-muted">
          Mientras el panel se prueba en este computador, abre el enlace en
          este mismo computador: en otro dispositivo no funcionará.
        </p>
      </div>
    );
  }

  return (
    <form action={enviar} className="space-y-5">
      {estado.error && (
        <p role="alert" className={avisoError}>
          {estado.error}
        </p>
      )}

      <div>
        <label htmlFor="recuperar-email" className={etiqueta}>
          Correo electrónico
        </label>
        <input
          id="recuperar-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={campoTexto}
        />
      </div>

      <button type="submit" disabled={enviando} className={botonPrimario}>
        {enviando ? "Enviando…" : "Enviar enlace"}
      </button>
    </form>
  );
}
