"use server";

/**
 * src/app/admin/portada/actions.ts — Acciones de servidor de la portada.
 *
 * QUÉ ES
 *   Las Server Actions (funciones del servidor que el navegador puede
 *   invocar directamente) del editor de la portada (/admin/portada):
 *
 *     guardarPortada(clave, datos)   guarda una sección
 *     restaurarPortada(clave)        vuelve a poner el contenido original
 *
 * POR QUÉ EXISTE
 *   Es el único camino por el que el navegador puede cambiar la portada, y
 *   por eso concentra las defensas:
 *     1. PERMISO: comprobarAccesoAdmin() al empezar. Una Server Action es
 *        una dirección pública; que la página esté protegida no la protege.
 *     2. VALIDACIÓN: los datos llegan del navegador. revisarFamilias() y
 *        revisarEntrega() (src/lib/portada.ts) comprueban forma, longitudes,
 *        la palabra del filtro y que cada medio sea un archivo local del
 *        sitio o de site-media en la carpeta de ESA sección.
 *     3. RLS (Row Level Security): src/lib/admin-portada.ts escribe con la
 *        sesión; la base de datos vuelve a exigir is_admin().
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Las invocan src/components/admin/portada/EditorFamilias.tsx y
 *     EditorEntrega.tsx.
 *   - Tras guardar, revalidatePath("/"). Hoy la portada se genera en cada
 *     visita (Fase 6B, sin caché en Cloudflare), así que no hace nada; se
 *     deja para cuando se reactive la caché. No puede romper el guardado:
 *     sin caché de etiquetas, OpenNext la convierte en una operación vacía
 *     y captura cualquier error.
 *   - guardarSeccion() limpia los archivos que dejan de usarse y, si el
 *     guardado falla, borra los recién subidos.
 */
import { revalidatePath } from "next/cache";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { guardarSeccion } from "@/lib/admin-portada";
import { DEFAULTS_PORTADA, revisarEntrega, revisarFamilias } from "@/lib/portada";
import type { ClavePortada, EntregaPortada, FamiliasPortada } from "@/types/portada";

/** Lo que el editor recibe tras guardar o restaurar. */
export type ResultadoPortada<T> =
  | { ok: true; datos: T; aviso: string | null }
  | { ok: false; error: string; errores?: string[] };

const ERROR_SIN_ACCESO =
  "Tu sesión caducó o tu cuenta no tiene permiso. Recarga la página y vuelve a entrar.";

/** Guarda una sección de la portada. */
export async function guardarPortada(
  clave: "familias",
  datos: unknown,
): Promise<ResultadoPortada<FamiliasPortada>>;
export async function guardarPortada(
  clave: "entrega",
  datos: unknown,
): Promise<ResultadoPortada<EntregaPortada>>;
export async function guardarPortada(
  clave: ClavePortada,
  datos: unknown,
): Promise<ResultadoPortada<FamiliasPortada | EntregaPortada>> {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") return { ok: false, error: ERROR_SIN_ACCESO };

  if (clave !== "familias" && clave !== "entrega") {
    return { ok: false, error: "Sección desconocida. Recarga la página." };
  }

  const revision = clave === "familias" ? revisarFamilias(datos) : revisarEntrega(datos);
  if (!revision.ok) {
    return { ok: false, error: "Revisa los campos marcados.", errores: revision.errores };
  }

  const resultado =
    clave === "familias"
      ? await guardarSeccion("familias", revision.datos as FamiliasPortada)
      : await guardarSeccion("entrega", revision.datos as EntregaPortada);
  if (!resultado.ok) return { ok: false, error: resultado.error };

  revalidatePath("/");
  return { ok: true, datos: revision.datos, aviso: resultado.aviso };
}

/**
 * Vuelve a poner el contenido original de una sección (DEFAULTS_PORTADA).
 * Los archivos que la sección usaba en site-media se borran después, como
 * en cualquier guardado; los videos originales son locales y no se tocan.
 */
export async function restaurarPortada(
  clave: "familias",
): Promise<ResultadoPortada<FamiliasPortada>>;
export async function restaurarPortada(
  clave: "entrega",
): Promise<ResultadoPortada<EntregaPortada>>;
export async function restaurarPortada(
  clave: ClavePortada,
): Promise<ResultadoPortada<FamiliasPortada | EntregaPortada>> {
  if (clave !== "familias" && clave !== "entrega") {
    return { ok: false, error: "Sección desconocida. Recarga la página." };
  }
  return clave === "familias"
    ? guardarPortada("familias", DEFAULTS_PORTADA.familias)
    : guardarPortada("entrega", DEFAULTS_PORTADA.entrega);
}
