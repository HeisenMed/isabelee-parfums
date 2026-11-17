/**
 * src/lib/respaldo.ts — Reglas del respaldo del catálogo (sin base de datos).
 *
 * QUÉ ES
 *   Funciones puras para:
 *     - convertir los perfumes en un archivo CSV que Excel en español abre
 *       bien (generarCsv);
 *     - la fecha de hoy en Bogotá para el nombre del archivo
 *       (fechaBogotaIso);
 *     - recordar en ESTE dispositivo cuándo se descargó la última copia
 *       (leerUltimoRespaldo / guardarUltimoRespaldo);
 *     - escribir fechas como "hace 2 h" o "ayer" sin errores de
 *       hidratación (fechaCorta / tiempoRelativo).
 *
 * POR QUÉ EXISTE
 *   El plan gratuito de Supabase no ofrece copias de seguridad
 *   descargables: el respaldo de /admin/respaldo es la copia de seguridad
 *   del negocio. Estas reglas se separan de la lectura de datos
 *   (src/lib/admin-respaldo.ts, solo servidor) porque varias se usan
 *   también en el navegador.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - generarCsv() y fechaBogotaIso(): src/app/admin/(panel)/respaldo/csv/
 *     route.ts y json/route.ts.
 *   - leerUltimoRespaldo / guardarUltimoRespaldo: BotonesRespaldo.tsx y
 *     PendientesPanel.tsx (src/components/admin/).
 *   - fechaCorta / tiempoRelativo: TiempoRelativo.tsx ("Últimos cambios" en
 *     el inicio del panel).
 *
 * POR QUÉ ESTE CSV Y NO OTRO
 *   Excel en español (Colombia) espera ";" como separador (la coma es el
 *   separador decimal) y, sin una marca inicial BOM (Byte Order Mark,
 *   "marca de orden de bytes": tres bytes que anuncian que el archivo está
 *   en UTF-8), muestra las tildes como "Ã©". Por eso: BOM + ";" + saltos
 *   de línea \r\n (los de Windows).
 */
import type { Perfume } from "@/types/perfume";

/** Clave de localStorage con la fecha (ISO) de la última descarga. */
export const CLAVE_ULTIMO_RESPALDO = "isabelee-ultimo-respaldo";
/** A partir de cuántos días el inicio del panel recuerda descargar otra copia. */
export const DIAS_AVISO_RESPALDO = 30;

/** Colombia no tiene horario de verano: Bogotá es siempre UTC−5. */
const DESFASE_BOGOTA_MS = -5 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/* ── Fechas ─────────────────────────────────────────────────────────── */

/** "2026-11-17": fecha de Bogotá, para nombres de archivo. */
export function fechaBogotaIso(fecha: Date = new Date()): string {
  return new Date(fecha.getTime() + DESFASE_BOGOTA_MS).toISOString().slice(0, 10);
}

/**
 * "17/11/2026": fecha de Bogotá escrita SOLO con aritmética, sin Intl.
 * Así el servidor y el navegador producen exactamente el mismo texto y
 * React no detecta diferencias al hidratar.
 */
export function fechaCorta(iso: string): string {
  const fecha = new Date(new Date(iso).getTime() + DESFASE_BOGOTA_MS);
  if (Number.isNaN(fecha.getTime())) return "";
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${fecha.getUTCFullYear()}`;
}

/** Días naturales de Bogotá entre dos instantes (0 = mismo día). */
function diasDeCalendario(desde: Date, hasta: Date): number {
  const a = Math.floor((desde.getTime() + DESFASE_BOGOTA_MS) / UN_DIA_MS);
  const b = Math.floor((hasta.getTime() + DESFASE_BOGOTA_MS) / UN_DIA_MS);
  return b - a;
}

/**
 * "hace un momento", "hace 5 min", "hace 2 h", "ayer", "hace 3 días" o,
 * si pasó más de una semana, la fecha corta. Depende de la hora actual:
 * solo debe usarse en el navegador, después de montar (ver TiempoRelativo).
 */
export function tiempoRelativo(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  const minutos = Math.floor((ahora.getTime() - fecha.getTime()) / 60000);
  if (minutos < 1) return "hace un momento";
  if (minutos < 60) return `hace ${minutos} min`;
  const dias = diasDeCalendario(fecha, ahora);
  if (dias === 0) return `hace ${Math.floor(minutos / 60)} h`;
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;
  return fechaCorta(iso);
}

/* ── Última copia (localStorage del dispositivo) ────────────────────── */

/** Fecha ISO de la última descarga en este dispositivo, o null. */
export function leerUltimoRespaldo(): string | null {
  try {
    const valor = localStorage.getItem(CLAVE_ULTIMO_RESPALDO);
    return valor && !Number.isNaN(new Date(valor).getTime()) ? valor : null;
  } catch {
    return null;
  }
}

/** Anota que se acaba de descargar una copia. */
export function guardarUltimoRespaldo(): string {
  const ahora = new Date().toISOString();
  try {
    localStorage.setItem(CLAVE_ULTIMO_RESPALDO, ahora);
  } catch {
    // Almacenamiento bloqueado: no se recordará, pero la descarga sigue.
  }
  return ahora;
}

/** Días completos desde una fecha ISO hasta ahora. */
export function diasDesde(iso: string, ahora: Date = new Date()): number {
  return Math.max(0, Math.floor((ahora.getTime() - new Date(iso).getTime()) / UN_DIA_MS));
}

/* ── CSV ────────────────────────────────────────────────────────────── */

/**
 * Prepara un valor para una celda de CSV:
 *   - Entre comillas si contiene ;, comillas, saltos de línea o espacios
 *     en los extremos; las comillas internas se duplican ("" = ").
 *   - Si empieza por =, +, - o @, se le antepone un apóstrofo: Excel
 *     tomaría esa celda por una FÓRMULA y podría ejecutarla ("inyección de
 *     CSV"). El apóstrofo hace que la lea como texto y no se muestra.
 */
export function celdaCsv(valor: unknown): string {
  let texto = valor === null || valor === undefined ? "" : String(valor);
  if (/^[=+\-@]/.test(texto)) texto = `'${texto}`;
  if (/[;"\r\n]/.test(texto) || texto !== texto.trim()) {
    texto = `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Sí / No para Excel. */
const siNo = (valor: unknown) => (valor === true ? "Sí" : "No");
/** Lista → "a | b | c". */
const unir = (lista: unknown) => (Array.isArray(lista) ? lista.filter(Boolean).join(" | ") : "");
/** Precio → entero sin separadores ("" si no hay). */
const entero = (valor: unknown) =>
  valor === null || valor === undefined || valor === "" ? "" : String(Math.round(Number(valor)));

/** Columnas del CSV: título (en español) y cómo se obtiene el valor. */
const COLUMNAS: [string, (p: Perfume) => unknown][] = [
  ["ID", (p) => p.id],
  ["Nombre", (p) => p.nombre],
  ["Marca", (p) => p.marca],
  ["Género", (p) => p.genero],
  ["Concentración", (p) => p.concentracion],
  ["Volumen", (p) => p.volumen],
  ["Familia olfativa", (p) => p.familia_olfativa],
  ["Precio", (p) => entero(p.precio)],
  ["Precio anterior", (p) => entero(p.precio_original)],
  ["Badge", (p) => p.badge],
  ["Activo", (p) => siNo(p.activo)],
  ["Destacado", (p) => siNo(p.destacado)],
  ["Agotado", (p) => siNo(p.agotado)],
  ["Descripción", (p) => p.descripcion],
  ["Atmósfera olfativa", (p) => p.descripcion_olfativa],
  ["Notas de salida", (p) => unir(p.notas?.salida)],
  ["Notas de corazón", (p) => unir(p.notas?.corazon)],
  ["Notas de fondo", (p) => unir(p.notas?.fondo)],
  ["Ocasiones", (p) => unir(p.ocasiones)],
  ["Foto principal", (p) => p.imagen],
  ["Fotos adicionales", (p) => unir(p.imagenes)],
  ["Video", (p) => p.video_url],
  ["Creado", (p) => p.created_at],
  ["Actualizado", (p) => p.updated_at],
];

/** Texto completo del CSV (con BOM inicial), un perfume por fila. */
export function generarCsv(perfumes: Perfume[]): string {
  const filas = [
    COLUMNAS.map(([titulo]) => celdaCsv(titulo)).join(";"),
    ...perfumes.map((p) => COLUMNAS.map(([, obtener]) => celdaCsv(obtener(p))).join(";")),
  ];
  return `﻿${filas.join("\r\n")}\r\n`;
}
