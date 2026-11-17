"use client";

/**
 * src/components/admin/BotonCerrarSesion.tsx — Botón "Cerrar sesión".
 *
 * QUÉ ES
 *   El botón de la barra superior del panel que cierra la sesión.
 *
 * POR QUÉ EXISTE
 *   Cerrar sesión borra cookies, y eso solo puede hacerlo el servidor: el
 *   botón es en realidad un formulario diminuto que invoca la Server
 *   Action cerrarSesion(). Está en un archivo con "use client" únicamente
 *   para poder desactivarse mientras el servidor responde y evitar dobles
 *   clics.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Llama a cerrarSesion() de src/app/admin/actions.ts, que termina
 *     redirigiendo a /admin/login.
 *   - useFormStatus (hook de React) solo funciona en un componente que
 *     esté DENTRO del <form>; por eso el botón es un componente interno
 *     separado del formulario.
 *   - Lo montan src/app/admin/(panel)/layout.tsx (barra superior) y sus
 *     pantallas de aviso.
 */
import { useFormStatus } from "react-dom";
import { cerrarSesion } from "@/app/admin/actions";
import { botonSecundario } from "@/components/admin/estilos";

/** El botón en sí: lee del formulario que lo contiene si se está enviando. */
function Boton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={botonSecundario}>
      {pending ? "Cerrando…" : "Cerrar sesión"}
    </button>
  );
}

export default function BotonCerrarSesion() {
  return (
    <form action={cerrarSesion}>
      <Boton />
    </form>
  );
}
