/**
 * src/lib/admin-auth.ts — ¿Quien visita el panel es administrador?
 *
 * QUÉ ES
 *   La función comprobarAccesoAdmin(): mira quién ha iniciado sesión y le
 *   pregunta a la base de datos si su correo está en la lista de
 *   administradores. Devuelve uno de cinco resultados posibles (ver el
 *   tipo AccesoAdmin).
 *
 * POR QUÉ EXISTE
 *   Tener sesión no basta. El middleware (src/middleware.ts) solo comprueba
 *   que haya ALGUIEN conectado; aquí se comprueba que ese alguien esté
 *   autorizado. Está en un archivo aparte, y no dentro del layout, porque
 *   las Server Actions de la Fase 3B (crear, editar y borrar perfumes)
 *   tendrán que repetir esta misma comprobación antes de escribir: un
 *   layout protege lo que se VE, pero una Server Action es una dirección
 *   pública a la que se puede llamar sin pasar por la página.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Usa el cliente con sesión de src/lib/supabase-server.ts.
 *   - Llama por RPC (Remote Procedure Call: ejecutar desde la app una
 *     función que vive en la base de datos) a public.is_admin(), definida
 *     en supabase/migrations/20261117000000_admin_access.sql. Esa función
 *     es la única que puede leer la tabla admin_users.
 *   - La usa src/app/admin/(panel)/layout.tsx para decidir qué mostrar.
 *   - La barrera definitiva sigue siendo RLS (Row Level Security, las
 *     reglas de acceso por fila de Postgres): aunque este archivo fallara,
 *     la base de datos rechazaría las escrituras de quien no sea admin.
 */
import type { User } from "@supabase/supabase-js";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/** Resultado de comprobar el acceso al panel. */
export type AccesoAdmin =
  /** Sesión válida y correo autorizado: puede entrar. */
  | { estado: "ok"; user: User }
  /** Nadie ha iniciado sesión. */
  | { estado: "sin-sesion" }
  /** Hay sesión, pero ese correo no está en admin_users. */
  | { estado: "sin-acceso" }
  /** La función is_admin() no existe: falta aplicar la migración n.º 2. */
  | { estado: "migracion-pendiente"; user: User }
  /** La comprobación falló por otro motivo (red, Supabase caído...). */
  | { estado: "error"; user: User };

/**
 * Códigos con los que Supabase avisa de que la función no existe:
 *   PGRST202 — lo devuelve PostgREST, la capa que convierte la base de
 *              datos en una API (Application Programming Interface) web,
 *              cuando no encuentra la función pedida.
 *   42883    — el código de Postgres para "undefined function".
 */
const CODIGOS_FUNCION_INEXISTENTE = ["PGRST202", "42883"];

/**
 * cache() de React memoriza el resultado DURANTE UNA MISMA PETICIÓN: el
 * layout del panel y la página que contiene pueden llamar a esta función
 * las dos, y a Supabase solo se le pregunta una vez. No guarda nada entre
 * peticiones ni entre visitantes.
 */
export const comprobarAccesoAdmin = cache(async (): Promise<AccesoAdmin> => {
  const supabase = await createSupabaseServerClient();

  // getUser() valida el token contra el servidor de Auth; no se fía del
  // contenido de la cookie, que el visitante podría haber manipulado.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { estado: "sin-sesion" };

  const { data, error } = await supabase.rpc("is_admin");

  if (error) {
    console.error("[admin] No se pudo comprobar is_admin():", error.message);
    return CODIGOS_FUNCION_INEXISTENTE.includes(error.code)
      ? { estado: "migracion-pendiente", user }
      : { estado: "error", user };
  }

  // Comparación estricta con `true`: cualquier otra respuesta (false,
  // null, un texto inesperado) se trata como "no autorizado".
  return data === true ? { estado: "ok", user } : { estado: "sin-acceso" };
});
