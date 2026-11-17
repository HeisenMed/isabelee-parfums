/**
 * src/lib/portada.ts — Contenido editable de la portada: lectura, validación
 * y valores por defecto.
 *
 * QUÉ ES
 *   - DEFAULTS_PORTADA: el contenido original de "Explora por familia
 *     olfativa" y "Así llega tu fragancia" (el que estaba escrito en
 *     Familias.tsx y Entrega.tsx hasta la Fase 5B).
 *   - revisarFamilias() / revisarEntrega(): comprueban que unos datos
 *     tengan la forma y las longitudes correctas, y los limpian.
 *   - getContenidoPortada(): lo que usa la tienda para dibujar esas dos
 *     secciones.
 *
 * POR QUÉ EXISTE
 *   Desde la Fase 5B esos textos, palabras de filtro, videos e imágenes se
 *   cambian desde el panel (/admin/portada) y se guardan en la tabla
 *   contenido_portada. La portada NUNCA debe romperse por ello: si la tabla
 *   no existe (migración n.º 5 sin aplicar), no responde, falta una fila o
 *   los datos no tienen la forma esperada, se usa DEFAULTS_PORTADA para esa
 *   sección. Lo peor que puede pasar es ver el contenido original.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Tipos y límites: src/types/portada.ts.
 *   - Lee con el cliente PÚBLICO de src/lib/supabase.ts (sin cookies, para
 *     que la portada siga en caché con revalidate = 60). RLS (Row Level
 *     Security) permite leer la tabla a cualquiera.
 *   - Lo usan src/app/(tienda)/page.tsx (lectura) y, en el servidor del
 *     panel, src/lib/admin-portada.ts y src/app/admin/portada/actions.ts
 *     (validación y "Restaurar original").
 *   - Las rutas permitidas para medios se comprueban con
 *     src/lib/storage-media.ts.
 *   - La migración n.º 5 siembra la tabla con estos mismos valores.
 */
import { esPalabraFamiliaValida } from "@/lib/busqueda";
import { esMedioLocal, rutaPortadaDeUrl } from "@/lib/storage-media";
import { getSupabaseClient } from "@/lib/supabase";
import {
  LIMITES_PORTADA,
  NUM_PUNTOS,
  NUM_TARJETAS,
  type ClavePortada,
  type ContenidoPortada,
  type EntregaPortada,
  type FamiliasPortada,
  type MedioPortada,
} from "@/types/portada";

/* ── Contenido original ─────────────────────────────────────────────── */

/** Un video local con su póster, a partir del nombre del archivo. */
const videoLocal = (nombre: string): MedioPortada => ({
  tipo: "video",
  src: `/videos/${nombre}.mp4`,
  poster: `/videos/posters/${nombre}.webp`,
});

/**
 * El contenido original de la portada. Es el que siembra la migración
 * n.º 5, el que restaura "Restaurar original" en el panel y el plan B si
 * la tabla falla. Si cambias algo aquí, cámbialo también en la migración
 * (solo afecta a bases de datos nuevas: la actual ya tiene sus filas).
 */
export const DEFAULTS_PORTADA: ContenidoPortada = {
  familias: {
    tarjetas: [
      {
        titulo: "Fresca y verde",
        texto: "Hojas, agua y aire limpio.",
        palabra: "Acuátic",
        medio: videoLocal("aroma-tropical-en-selva"),
      },
      {
        titulo: "Amaderada y oriental",
        texto: "Maderas, humo y especias que envuelven.",
        palabra: "Amaderad",
        medio: videoLocal("frasco-dorado-con-humo"),
      },
      {
        titulo: "Frutal",
        texto: "Dulce, jugosa y luminosa.",
        palabra: "Frutal",
        medio: videoLocal("frasco-forma-de-mujer-fondo-cafe"),
      },
      {
        titulo: "Cítrica",
        texto: "Chispeante, como recién exprimida.",
        palabra: "Cítric",
        medio: videoLocal("maquina-exprimiendo-frutas-para-aroma"),
      },
    ],
  },
  entrega: {
    titulo: "Así llega tu fragancia",
    puntos: [
      {
        titulo: "Fragancias originales",
        texto: "Trabajamos solo con perfumes originales, sellados de fábrica.",
      },
      {
        titulo: "Empaque cuidado",
        texto: "Cada pedido va protegido para que llegue perfecto, listo para regalar.",
      },
      {
        titulo: "Envíos a toda Colombia",
        texto: "Te acompañamos por WhatsApp desde el pedido hasta la entrega.",
      },
    ],
    medio: videoLocal("manos-desempacando"),
  },
};

/* ── Validación ─────────────────────────────────────────────────────── */

/** Resultado de revisar una sección. */
export type Revision<T> = { ok: true; datos: T } | { ok: false; errores: string[] };

/** Texto obligatorio, recortado, con longitud máxima. Anota el error si no cumple. */
function texto(
  valor: unknown,
  max: number,
  etiqueta: string,
  errores: string[],
): string {
  const limpio = typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
  if (!limpio) errores.push(`${etiqueta}: no puede quedar vacío.`);
  else if (limpio.length > max) errores.push(`${etiqueta}: máximo ${max} caracteres.`);
  return limpio;
}

/** ¿Es una URL de imagen permitida para esta sección? */
function imagenValida(url: unknown, clave: ClavePortada): url is string {
  if (typeof url !== "string") return false;
  if (esMedioLocal(url)) return !url.endsWith(".mp4");
  const ruta = rutaPortadaDeUrl(url, clave);
  return ruta !== null && !ruta.endsWith(".mp4");
}

/** ¿Es una URL de video permitida para esta sección? */
function videoValido(url: unknown, clave: ClavePortada): url is string {
  if (typeof url !== "string") return false;
  if (esMedioLocal(url)) return url.endsWith(".mp4");
  return rutaPortadaDeUrl(url, clave)?.endsWith(".mp4") ?? false;
}

/**
 * Revisa un medio. Solo se aceptan rutas locales del sitio ("/videos/…",
 * "/assets/…") o archivos del bucket site-media de ESTA sección: así nadie
 * puede colar una imagen de otro sitio web en la portada.
 */
function revisarMedio(
  valor: unknown,
  clave: ClavePortada,
  etiqueta: string,
  errores: string[],
): MedioPortada {
  const medio = (valor ?? {}) as Record<string, unknown>;
  if (medio.tipo === "video" && videoValido(medio.src, clave) && imagenValida(medio.poster, clave)) {
    return { tipo: "video", src: medio.src, poster: medio.poster };
  }
  if (medio.tipo === "imagen" && imagenValida(medio.src, clave)) {
    return { tipo: "imagen", src: medio.src };
  }
  errores.push(`${etiqueta}: el video o la imagen no es válido. Vuelve a subirlo.`);
  return { tipo: "imagen", src: "" };
}

/** Revisa y limpia los datos de "Explora por familia olfativa". */
export function revisarFamilias(valor: unknown): Revision<FamiliasPortada> {
  const errores: string[] = [];
  const tarjetas = (valor as { tarjetas?: unknown })?.tarjetas;
  if (!Array.isArray(tarjetas) || tarjetas.length !== NUM_TARJETAS) {
    return { ok: false, errores: [`Debe haber exactamente ${NUM_TARJETAS} tarjetas.`] };
  }

  const limpias = tarjetas.map((crudo, i) => {
    const t = (crudo ?? {}) as Record<string, unknown>;
    const n = `Tarjeta ${i + 1}`;
    const palabra = texto(t.palabra, LIMITES_PORTADA.palabra, `${n}, palabra del filtro`, errores);
    if (palabra && !esPalabraFamiliaValida(palabra)) {
      errores.push(`${n}, palabra del filtro: solo letras, espacios y ( ) / -.`);
    }
    return {
      titulo: texto(t.titulo, LIMITES_PORTADA.tituloTarjeta, `${n}, título`, errores),
      texto: texto(t.texto, LIMITES_PORTADA.textoTarjeta, `${n}, texto corto`, errores),
      palabra,
      medio: revisarMedio(t.medio, "familias", `${n}, medio`, errores),
    };
  });

  return errores.length > 0 ? { ok: false, errores } : { ok: true, datos: { tarjetas: limpias } };
}

/** Revisa y limpia los datos de "Así llega tu fragancia". */
export function revisarEntrega(valor: unknown): Revision<EntregaPortada> {
  const errores: string[] = [];
  const e = (valor ?? {}) as Record<string, unknown>;
  if (!Array.isArray(e.puntos) || e.puntos.length !== NUM_PUNTOS) {
    return { ok: false, errores: [`Debe haber exactamente ${NUM_PUNTOS} puntos.`] };
  }

  const datos: EntregaPortada = {
    titulo: texto(e.titulo, LIMITES_PORTADA.tituloEntrega, "Título", errores),
    puntos: e.puntos.map((crudo, i) => {
      const p = (crudo ?? {}) as Record<string, unknown>;
      return {
        titulo: texto(p.titulo, LIMITES_PORTADA.tituloPunto, `Punto ${i + 1}, título`, errores),
        texto: texto(p.texto, LIMITES_PORTADA.textoPunto, `Punto ${i + 1}, texto`, errores),
      };
    }),
    medio: revisarMedio(e.medio, "entrega", "Medio", errores),
  };

  return errores.length > 0 ? { ok: false, errores } : { ok: true, datos };
}

/* ── Lectura para la tienda ─────────────────────────────────────────── */

/**
 * Contenido de las dos secciones para la portada. Cada sección por
 * separado: si una fila falla o no es válida, solo esa usa el original.
 * Nunca lanza un error.
 */
export async function getContenidoPortada(): Promise<ContenidoPortada> {
  try {
    const { data, error } = await getSupabaseClient()
      .from("contenido_portada")
      .select("clave, datos");

    if (error) {
      // Lo normal antes de aplicar la migración n.º 5: la tabla no existe.
      console.error(`[portada] Se usa el contenido original: ${error.message}`);
      return DEFAULTS_PORTADA;
    }

    const filas = new Map((data ?? []).map((fila) => [fila.clave as string, fila.datos as unknown]));
    const familias = revisarFamilias(filas.get("familias"));
    const entrega = revisarEntrega(filas.get("entrega"));

    if (!familias.ok) console.error("[portada] familias no válida; se usa la original:", familias.errores[0]);
    if (!entrega.ok) console.error("[portada] entrega no válida; se usa la original:", entrega.errores[0]);

    return {
      familias: familias.ok ? familias.datos : DEFAULTS_PORTADA.familias,
      entrega: entrega.ok ? entrega.datos : DEFAULTS_PORTADA.entrega,
    };
  } catch (error) {
    console.error("[portada] Se usa el contenido original:", error);
    return DEFAULTS_PORTADA;
  }
}
