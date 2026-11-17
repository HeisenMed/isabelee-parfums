"use server";

/**
 * src/app/admin/actions.ts — Acciones de autenticación del panel.
 *
 * QUÉ ES
 *   Las cuatro Server Actions del acceso al panel. Una Server Action es una
 *   función que se escribe aquí, en el servidor, pero que un formulario del
 *   navegador puede invocar directamente (<form action={...}>): Next.js
 *   crea por debajo la petición HTTP (HyperText Transfer Protocol, el
 *   protocolo con el que el navegador habla con el servidor).
 *
 *     iniciarSesion          correo + contraseña  →  /admin
 *     solicitarRecuperacion  pide el correo para cambiar la contraseña
 *     crearContrasena        guarda una contraseña nueva (enlace de correo)
 *     cambiarContrasena      cambia la contraseña desde dentro del panel
 *     cerrarSesion           sale y vuelve al login
 *
 * POR QUÉ EXISTE
 *   Iniciar y cerrar sesión cambia cookies, y en Next.js las cookies solo
 *   se pueden escribir desde una Server Action o un Route Handler, nunca
 *   mientras se dibuja una página. Además, al hacerlo en el servidor, la
 *   contraseña no pasa por código JavaScript del navegador.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - "use server" (primera línea) es lo que convierte cada función
 *     exportada en una Server Action.
 *   - Usa el cliente con sesión de src/lib/supabase-server.ts, que escribe
 *     las cookies de Supabase Auth.
 *   - Las invocan los formularios de src/components/admin/ (LoginForm,
 *     RecuperarForm, CrearContrasenaForm) con el hook useActionState de
 *     React, y el botón "Cerrar sesión" de la barra del panel.
 *   - Cada acción devuelve un "estado" (el mensaje que hay que mostrar) o
 *     termina con redirect(). Ojo: redirect() funciona lanzando una
 *     excepción especial, así que nunca debe ir dentro de un try/catch.
 *
 * SEGURIDAD
 *   - Los mensajes no revelan si un correo existe: el login falla siempre
 *     con el mismo texto y la recuperación responde siempre lo mismo. Así
 *     nadie puede usar estos formularios para averiguar qué correos son
 *     administradores.
 *   - El destino tras el login se valida con rutaAdminSegura().
 *   - Ninguna de estas acciones da permisos: solo abren o cierran sesión.
 *     Quién es administrador lo decide la base de datos (is_admin()).
 */
import { redirect } from "next/navigation";
import { RUTA_LOGIN, RUTA_PANEL, rutaAdminSegura } from "@/lib/admin-rutas";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/** Lo que un formulario recibe de vuelta: un error que mostrar, o nada. */
export type EstadoFormulario = {
  error: string | null;
  /** Mensaje de éxito, en las acciones que no terminan redirigiendo. */
  exito?: string | null;
};

/** Estado del formulario de recuperación: añade si ya se envió. */
export type EstadoRecuperacion = { enviado: boolean; error: string | null };

/** Longitud mínima de la contraseña, en caracteres. */
const MIN_CONTRASENA = 8;

/** Único mensaje para cualquier fallo de credenciales. */
const ERROR_CREDENCIALES = "Correo o contraseña incorrectos.";
/** Fallos que no dependen de lo que escribió la persona. */
const ERROR_CONEXION =
  "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
const ERROR_DEMASIADOS_INTENTOS =
  "Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.";

/** Lee un campo de texto del formulario; si falta, devuelve "". */
function campo(formData: FormData, nombre: string): string {
  const valor = formData.get(nombre);
  return typeof valor === "string" ? valor : "";
}

/**
 * Inicia sesión con correo y contraseña.
 * `_previo` es el estado anterior que exige useActionState; no se usa.
 */
export async function iniciarSesion(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const email = campo(formData, "email").trim();
  const password = campo(formData, "password");
  // `next` viaja en un campo oculto del formulario: lo puede alterar
  // cualquiera, por eso se valida antes de redirigir.
  const destino = rutaAdminSegura(campo(formData, "next"));

  // Campos vacíos: mismo mensaje genérico, sin decir cuál falta.
  if (!email || !password) return { error: ERROR_CREDENCIALES };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // 429 = "Too Many Requests": Supabase limita los intentos seguidos.
    if (error.status === 429) return { error: ERROR_DEMASIADOS_INTENTOS };
    // Sin código de estado, o 5xx: el fallo es de red o de Supabase, no de
    // las credenciales. Decir "contraseña incorrecta" confundiría.
    if (!error.status || error.status >= 500) {
      console.error("[admin] Fallo al iniciar sesión:", error.message);
      return { error: ERROR_CONEXION };
    }
    return { error: ERROR_CREDENCIALES };
  }

  redirect(destino);
}

/**
 * Envía el correo para crear una contraseña nueva.
 * Responde SIEMPRE lo mismo, exista o no la cuenta: el mensaje lo pone el
 * formulario cuando `enviado` es true.
 */
export async function solicitarRecuperacion(
  _previo: EstadoRecuperacion,
  formData: FormData,
): Promise<EstadoRecuperacion> {
  const email = campo(formData, "email").trim().toLowerCase();

  // Única validación visible: que parezca un correo. No revela nada sobre
  // qué cuentas existen.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { enviado: false, error: "Escribe un correo electrónico válido." };
  }

  const supabase = await createSupabaseServerClient();
  // No se pasa `redirectTo`: el enlace del correo lo define la plantilla
  // "Reset Password" de Supabase, que debe apuntar a /auth/confirm (ver
  // supabase/README.md, "Plantillas de correo").
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    // Se registra para quien mantiene el sitio, pero NO se muestra: un
    // error distinto para correos desconocidos delataría cuáles existen.
    console.error("[admin] Fallo al pedir la recuperación:", error.message);
  }

  return { enviado: true, error: null };
}

/**
 * Guarda la contraseña nueva de quien llegó desde un enlace de invitación
 * o de recuperación (ese enlace ya le abrió sesión en /auth/confirm).
 */
export async function crearContrasena(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const password = campo(formData, "password");
  const confirmacion = campo(formData, "confirmacion");

  // Se valida también aquí, no solo en el navegador: las comprobaciones
  // del navegador se pueden saltar.
  if (password.length < MIN_CONTRASENA) {
    return {
      error: `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres.`,
    };
  }
  if (password !== confirmacion) {
    return { error: "Las dos contraseñas no coinciden. Escríbelas de nuevo." };
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sin sesión, el enlace del correo caducó mientras se rellenaba el
  // formulario: hay que pedir uno nuevo.
  if (!user) redirect(`${RUTA_LOGIN}?error=enlace`);

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    // Supabase identifica cada tipo de fallo con un código en `error.code`.
    if (error.code === "same_password") {
      return {
        error: "La contraseña nueva debe ser distinta de la que ya tenías.",
      };
    }
    if (error.code === "weak_password") {
      return {
        error:
          "Esa contraseña es demasiado fácil de adivinar. Usa una más larga, con letras y números.",
      };
    }
    console.error("[admin] Fallo al guardar la contraseña:", error.message);
    return {
      error:
        "No se pudo guardar la contraseña. Inténtalo de nuevo; si sigue fallando, pide un enlace nuevo.",
    };
  }

  redirect(RUTA_PANEL);
}

/**
 * Traduce a español los fallos conocidos de updateUser({ password }).
 * Supabase identifica cada tipo de fallo con un código en `error.code`.
 */
function mensajeErrorContrasena(codigo: string | undefined): string {
  switch (codigo) {
    case "same_password":
      return "La contraseña nueva debe ser distinta de la que ya tenías.";
    case "weak_password":
      return "Esa contraseña es demasiado fácil de adivinar. Usa una más larga, con letras y números.";
    case "reauthentication_needed":
      // Supabase puede exigir un inicio de sesión reciente para cambiarla.
      return "Por seguridad, cierra sesión, vuelve a entrar y cambia la contraseña enseguida.";
    default:
      return "No se pudo guardar la contraseña. Inténtalo de nuevo.";
  }
}

/**
 * Cambia la contraseña de quien tiene la sesión abierta, sin correo de por
 * medio. Es la vía normal mientras RECUPERACION_POR_CORREO sea false: las
 * cuentas se crean en el Dashboard de Supabase con una contraseña inicial
 * y cada administradora la sustituye aquí por una propia.
 * No redirige: devuelve `exito` para que el formulario lo muestre.
 */
export async function cambiarContrasena(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const password = campo(formData, "password");
  const confirmacion = campo(formData, "confirmacion");

  if (password.length < MIN_CONTRASENA) {
    return {
      error: `La contraseña debe tener al menos ${MIN_CONTRASENA} caracteres.`,
    };
  }
  if (password !== confirmacion) {
    return { error: "Las dos contraseñas no coinciden. Escríbelas de nuevo." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(RUTA_LOGIN);

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error("[admin] Fallo al cambiar la contraseña:", error.message);
    return { error: mensajeErrorContrasena(error.code) };
  }

  return {
    error: null,
    exito: "Contraseña actualizada. Úsala la próxima vez que entres.",
  };
}

/** Cierra la sesión y vuelve al login. */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // Aunque signOut fallara (por ejemplo, sin red), las cookies locales se
  // borran igualmente; por eso no se comprueba el error.
  await supabase.auth.signOut();
  redirect(RUTA_LOGIN);
}
