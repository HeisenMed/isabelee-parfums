"use client";

/**
 * src/components/admin/CampoContrasena.tsx — Campo de contraseña con "ojo".
 *
 * QUÉ ES
 *   Un campo de contraseña con su etiqueta y un botón con un ícono de ojo
 *   que muestra u oculta lo que se está escribiendo.
 *
 * POR QUÉ EXISTE
 *   Escribir a ciegas una contraseña larga provoca errores, sobre todo en
 *   el móvil. El ojo permite comprobarla antes de enviar. Es un componente
 *   aparte para que el login y el cambio de contraseña usen exactamente el
 *   mismo campo, con la misma accesibilidad, sin copiar el código.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan src/components/admin/LoginForm.tsx y
 *     src/components/admin/CambiarContrasenaForm.tsx.
 *   - Necesita "use client": recuerda en el navegador si la contraseña está
 *     visible. Ese estado es de cada campo; uno no destapa al otro.
 *   - Íconos EyeIcon / EyeOffIcon de src/components/ui/icons.tsx (SVG, sin
 *     emojis — CLAUDE.md §10.3). Estilos de src/components/admin/estilos.ts.
 *
 * ACCESIBILIDAD
 *   - El botón tiene aria-label ("Mostrar contraseña" / "Ocultar
 *     contraseña") porque solo contiene un ícono, y aria-pressed para que
 *     un lector de pantalla diga si está activado.
 *   - type="button": sin esto, un botón dentro de un formulario lo envía.
 *   - El botón mide 44 px, el mínimo cómodo para tocarlo con el dedo.
 */
import { useState } from "react";
import { campoTexto, etiqueta as claseEtiqueta } from "@/components/admin/estilos";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

type CampoContrasenaProps = {
  /** id del <input>; la etiqueta se enlaza a él. Debe ser único en la página. */
  id: string;
  /** Nombre con el que viaja en el formulario ("password", "confirmacion"). */
  name: string;
  /** Texto de la etiqueta visible. */
  etiqueta: string;
  /**
   * Pista para el gestor de contraseñas del navegador:
   * "current-password" al iniciar sesión, "new-password" al crear una.
   */
  autoComplete: "current-password" | "new-password";
  /** Longitud mínima que comprueba el navegador antes de enviar. */
  minLength?: number;
  /** Texto de ayuda bajo el campo. */
  ayuda?: string;
};

export default function CampoContrasena({
  id,
  name,
  etiqueta,
  autoComplete,
  minLength,
  ayuda,
}: CampoContrasenaProps) {
  /** true = la contraseña se ve como texto normal. */
  const [visible, setVisible] = useState(false);
  const idAyuda = `${id}-ayuda`;

  return (
    <div>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-describedby={ayuda ? idAyuda : undefined}
          // pr-12: deja libre el hueco que ocupa el botón del ojo.
          className={`${campoTexto} pr-12`}
        />
        <button
          type="button"
          onClick={() => setVisible((actual) => !actual)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          // top-1.5: compensa el margen superior (mt-1.5) del campo, para
          // que el botón quede centrado respecto a él.
          className="absolute right-0 top-1.5 flex h-[calc(100%-0.375rem)] w-11 items-center justify-center rounded-r-lg text-admin-muted transition-colors duration-200 hover:text-admin-text"
        >
          {visible ? (
            <EyeOffIcon className="h-5 w-5" aria-hidden="true" />
          ) : (
            <EyeIcon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
      {ayuda && (
        <p id={idAyuda} className="mt-1.5 text-sm text-admin-muted">
          {ayuda}
        </p>
      )}
    </div>
  );
}
