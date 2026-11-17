"use client";

/**
 * src/components/admin/LoginForm.tsx — Formulario de inicio de sesión.
 *
 * QUÉ ES
 *   Los campos de correo y contraseña de /admin/login y su botón "Ingresar".
 *
 * POR QUÉ EXISTE
 *   La página de login (src/app/admin/(acceso)/login/page.tsx) es un
 *   componente de servidor. Este trozo necesita ejecutarse en el navegador
 *   para saber si el envío sigue en curso (y desactivar el botón) y para
 *   mostrar el error que devuelve el servidor sin recargar la página. Por
 *   eso lleva "use client" y vive en un archivo aparte.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Envía los datos a la Server Action iniciarSesion() de
 *     src/app/admin/actions.ts. La contraseña viaja directa al servidor.
 *   - useActionState (hook de React 19) enlaza formulario y acción:
 *       estado      lo último que devolvió la acción ({ error })
 *       enviar      lo que se pone en <form action={...}>
 *       enviando    true mientras el servidor aún no ha respondido
 *   - `next` (a dónde ir tras entrar) llega desde la página y viaja en un
 *     campo oculto; el servidor lo valida antes de usarlo.
 *   - Estilos: recetas de src/components/admin/estilos.ts.
 */
import Link from "next/link";
import { useActionState } from "react";
import { iniciarSesion, type EstadoFormulario } from "@/app/admin/actions";
import { RUTA_RECUPERAR } from "@/lib/admin-rutas";
import {
  avisoError,
  botonPrimario,
  campoTexto,
  enlace,
  etiqueta,
} from "@/components/admin/estilos";

const ESTADO_INICIAL: EstadoFormulario = { error: null };

type LoginFormProps = {
  /** Ruta del panel a la que volver tras iniciar sesión. */
  next: string;
};

export default function LoginForm({ next }: LoginFormProps) {
  const [estado, enviar, enviando] = useActionState(
    iniciarSesion,
    ESTADO_INICIAL,
  );

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {/* role="alert": los lectores de pantalla anuncian el error en
          cuanto aparece, sin que la persona tenga que buscarlo. */}
      {estado.error && (
        <p role="alert" className={avisoError}>
          {estado.error}
        </p>
      )}

      <div>
        <label htmlFor="login-email" className={etiqueta}>
          Correo electrónico
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={campoTexto}
        />
      </div>

      <div>
        <label htmlFor="login-password" className={etiqueta}>
          Contraseña
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={campoTexto}
        />
      </div>

      <button type="submit" disabled={enviando} className={botonPrimario}>
        {enviando ? "Ingresando…" : "Ingresar"}
      </button>

      <p className="text-center text-sm">
        <Link href={RUTA_RECUPERAR} className={enlace}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
