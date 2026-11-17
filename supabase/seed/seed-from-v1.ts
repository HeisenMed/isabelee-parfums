/**
 * supabase/seed/seed-from-v1.ts — Carga inicial de datos desde el catálogo v1.
 *
 * One-time data seed from the v1 static catalog. Already executed on
 * 2026-11-16. Kept for reproducibility: only re-run against an EMPTY database.
 *
 * QUÉ ES
 *   Un "seed": un script que llena de DATOS una base de datos cuya
 *   estructura ya existe. Copia los 120 perfumes (y sus 237 reseñas) de
 *   data/perfumes.js a las tablas `perfumes` y `reviews` de Supabase, y
 *   crea los dos almacenes de archivos (buckets) para fotos y videos.
 *
 * ESTADO
 *   Ya se ejecutó el 2026-11-16: la base de datos está cargada. Desde
 *   entonces la fuente de verdad del catálogo es Supabase, no
 *   data/perfumes.js. Este archivo se conserva solo para poder reconstruir
 *   la base de datos desde cero de forma reproducible.
 *   ⚠️ No lo ejecutes contra una base de datos con datos: los cambios
 *   hechos después (precios, fotos, perfumes nuevos) no están en
 *   data/perfumes.js. El propio script se detiene si la tabla no está vacía.
 *
 * POR QUÉ EXISTE
 *   El catálogo v1 vivía en un archivo JavaScript. Para que el sitio v2 lo
 *   lea desde la base de datos, hubo que cargarlo una primera vez
 *   traduciendo los nombres de campo antiguos a los nuevos.
 *
 * CÓMO SE USA (solo al reconstruir la base de datos; ver supabase/README.md)
 *   Siempre desde la RAÍZ del proyecto, con npm:
 *   1. Aplica antes todas las migraciones de supabase/migrations/, en orden.
 *   2. npm run db:seed -- --dry-run   → solo lee y traduce; NO escribe nada.
 *   3. npm run db:seed                → inserta en Supabase.
 *   Existe también `npm run db:seed -- --force`, que sobrescribe los
 *   perfumes con el mismo id y REEMPLAZA sus reseñas por las originales.
 *   Es destructivo: no lo uses sobre una base de datos en uso.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lee data/perfumes.js y .env.local, que están en la raíz del
 *     proyecto. Los localiza a partir de la carpeta desde la que se lanza
 *     el comando (npm siempre lo lanza desde la raíz), no de la ubicación
 *     de este archivo. Por eso mover el script no rompe esas rutas; lo
 *     único relativo a su ubicación son los dos `import` de src/.
 *   - Usa getSupabaseAdmin() (src/lib/supabase.ts): la clave secreta, que
 *     se salta RLS. Por eso solo debe ejecutarse en tu equipo.
 *   - Los tipos vienen de src/types/perfume.ts, el mismo contrato que usa
 *     la app: si el esquema cambia, este script deja de compilar y avisa.
 *   - Al terminar llama a la función SQL sync_id_sequences() (definida en
 *     supabase/migrations/20261116000000_initial_schema.sql) para que los
 *     ids nuevos continúen desde el 121.
 *
 * TRADUCCIÓN DE CAMPOS (v1 → v2)
 *   name → nombre            brand → marca            volume → volumen
 *   category → genero ("hombre" → "Hombre")
 *   description → descripcion                price → precio
 *   image → imagen (se le antepone "/" porque ahora se sirve desde public/)
 *   notas_salida/corazon/fondo (texto con comas) → notas.{salida,corazon,fondo} (listas)
 *   ocasion (texto con comas) → ocasiones (lista)
 *   reviews[] → filas de la tabla reviews con su perfume_id
 *   concentracion: v1 no tenía este dato. Solo se rellena cuando el nombre
 *     lo dice de forma explícita ("Bleu de Chanel EDP" → "EDP"); en el
 *     resto queda vacío. No se inventa.
 *   familia (marca comercial "Unisex"): se descarta, es redundante con genero.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { getSupabaseAdmin } from "../../src/lib/supabase";
import type { Genero, PerfumeInput, Review } from "../../src/types/perfume";

/* ── Configuración ──────────────────────────────────────────────────── */

/**
 * Raíz del proyecto. Se toma de la carpeta desde la que se lanza el comando
 * y no de la ubicación de este archivo: `npm run db:seed` siempre se
 * ejecuta desde la raíz, esté donde esté el script.
 */
const ROOT = process.cwd();
const SOURCE_FILE = path.join(ROOT, "data", "perfumes.js");
const ENV_FILE = path.join(ROOT, ".env.local");
const PLACEHOLDER_IMAGE = "/assets/images/perfumes/placeholder-locion.webp";
/** Buckets públicos de Supabase Storage que la app necesita. */
const BUCKETS = ["product-images", "product-videos"];
/** Filas por petición: lotes pequeños para aislar errores con facilidad. */
const BATCH_SIZE = 50;

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

/* ── Tipos del archivo de origen ────────────────────────────────────── */

/** Reseña tal como está en data/perfumes.js. */
interface LegacyReview {
  name?: unknown;
  stars?: unknown;
  date?: unknown;
  comment?: unknown;
}

/** Perfume tal como está en data/perfumes.js (todo opcional: no nos fiamos). */
interface LegacyPerfume {
  id?: unknown;
  brand?: unknown;
  name?: unknown;
  category?: unknown;
  volume?: unknown;
  price?: unknown;
  badge?: unknown;
  description?: unknown;
  image?: unknown;
  familia_olfativa?: unknown;
  notas_salida?: unknown;
  notas_corazon?: unknown;
  notas_fondo?: unknown;
  descripcion_olfativa?: unknown;
  ocasion?: unknown;
  reviews?: unknown;
}

/** Fila lista para insertar: los datos del perfume más su id original. */
type PerfumeRow = PerfumeInput & { id: number };
/** Reseña lista para insertar (id y created_at los pone la base de datos). */
type ReviewRow = Omit<Review, "id" | "created_at">;

/* ── Utilidades de traducción ───────────────────────────────────────── */

/** Devuelve el texto recortado, o "" si el valor no es texto. */
const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

/** "Bergamota, limón , menta" → ["Bergamota", "limón", "menta"]. */
const toList = (value: unknown): string[] =>
  text(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** "hombre" → "Hombre". Devuelve null si la categoría no es válida. */
function toGenero(value: unknown): Genero | null {
  const map: Record<string, Genero> = {
    hombre: "Hombre",
    mujer: "Mujer",
    unisex: "Unisex",
  };
  return map[text(value).toLowerCase()] ?? null;
}

/** Extrae la concentración SOLO si el nombre la menciona de forma explícita. */
function detectConcentracion(nombre: string): string {
  if (/\bEDP\b|Eau de Parfum/i.test(nombre)) return "EDP";
  if (/\bEDT\b|Eau de Toilette/i.test(nombre)) return "EDT";
  if (/\bElixir\b/i.test(nombre)) return "Elixir";
  if (/\bParfum\b/i.test(nombre)) return "Parfum";
  return "";
}

/**
 * Convierte la ruta antigua en una ruta servible por Next.js.
 * Si el perfume no tiene imagen o el archivo no existe en public/, usa el
 * placeholder para que ninguna tarjeta quede con la imagen rota.
 */
function toImagen(value: unknown): string {
  const raw = text(value);
  if (!raw) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//.test(raw)) return raw; // ya es una URL completa
  const publicPath = `/${raw.replace(/^\/+/, "")}`;
  return existsSync(path.join(ROOT, "public", publicPath))
    ? publicPath
    : PLACEHOLDER_IMAGE;
}

/** Precio: número positivo o null. Nunca se inventa un precio. */
const toPrecio = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;

/* ── Paso 1: leer data/perfumes.js ──────────────────────────────────── */

/**
 * El archivo no es un módulo: hace `window.PERFUMES = [...]`. Se lee como
 * texto y se evalúa en un entorno aislado con un `window` falso, del que
 * luego se recoge el array.
 */
function readLegacyPerfumes(): LegacyPerfume[] {
  if (!existsSync(SOURCE_FILE)) {
    throw new Error(
      `No se encontró ${SOURCE_FILE}. Ejecuta el comando desde la raíz del proyecto: npm run db:seed`,
    );
  }
  const code = readFileSync(SOURCE_FILE, "utf8");
  const sandbox: { window: { PERFUMES?: unknown } } = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: "data/perfumes.js" });

  if (!Array.isArray(sandbox.window.PERFUMES)) {
    throw new Error("data/perfumes.js no define window.PERFUMES como array.");
  }
  return sandbox.window.PERFUMES as LegacyPerfume[];
}

/* ── Paso 2: traducir al esquema nuevo ──────────────────────────────── */

interface MappingResult {
  perfumes: PerfumeRow[];
  reviews: ReviewRow[];
  /** Perfumes que no se pudieron traducir, con el motivo. */
  invalid: string[];
  /** Reseñas descartadas por datos incorrectos, con el motivo. */
  invalidReviews: string[];
}

function mapAll(source: LegacyPerfume[]): MappingResult {
  const result: MappingResult = {
    perfumes: [],
    reviews: [],
    invalid: [],
    invalidReviews: [],
  };

  for (const item of source) {
    const id = typeof item.id === "number" ? item.id : NaN;
    const nombre = text(item.name);
    const marca = text(item.brand);
    const genero = toGenero(item.category);
    const label = `id ${item.id} (${marca} ${nombre})`;

    // Campos obligatorios en la base de datos: sin ellos no se inserta.
    if (!Number.isInteger(id) || id < 1) {
      result.invalid.push(`${label}: id no válido`);
      continue;
    }
    if (!nombre || !marca) {
      result.invalid.push(`${label}: falta nombre o marca`);
      continue;
    }
    if (!genero) {
      result.invalid.push(`${label}: categoría "${String(item.category)}" no válida`);
      continue;
    }

    result.perfumes.push({
      id,
      nombre,
      marca,
      concentracion: detectConcentracion(nombre),
      volumen: text(item.volume),
      genero,
      familia_olfativa: text(item.familia_olfativa),
      descripcion: text(item.description),
      descripcion_olfativa: text(item.descripcion_olfativa),
      notas: {
        salida: toList(item.notas_salida),
        corazon: toList(item.notas_corazon),
        fondo: toList(item.notas_fondo),
      },
      ocasiones: toList(item.ocasion),
      imagen: toImagen(item.image),
      imagenes: [],
      precio: toPrecio(item.price),
      precio_original: null,
      badge: text(item.badge) || null,
      video_url: null,
      activo: true,
    });

    // Reseñas del perfume → filas independientes con su perfume_id.
    const legacyReviews = Array.isArray(item.reviews)
      ? (item.reviews as LegacyReview[])
      : [];
    for (const review of legacyReviews) {
      const name = text(review.name);
      const stars = typeof review.stars === "number" ? review.stars : NaN;
      const date = text(review.date);
      if (!name || !date || !Number.isInteger(stars) || stars < 1 || stars > 5) {
        result.invalidReviews.push(`${label}: reseña de "${name || "?"}" descartada`);
        continue;
      }
      result.reviews.push({
        perfume_id: id,
        name,
        stars,
        date,
        comment: text(review.comment),
      });
    }
  }

  return result;
}

/* ── Programa principal ─────────────────────────────────────────────── */

async function main(): Promise<void> {
  console.log("Isabeleé Fragancias — carga inicial del catálogo v1 en Supabase\n");

  // Leer y traducir (no toca la base de datos).
  const source = readLegacyPerfumes();
  const { perfumes, reviews, invalid, invalidReviews } = mapAll(source);

  const conFoto = perfumes.filter((p) => p.imagen !== PLACEHOLDER_IMAGE).length;
  console.log(`Leídos de data/perfumes.js : ${source.length} perfumes`);
  console.log(`Traducidos correctamente   : ${perfumes.length}`);
  console.log(`  · con foto real          : ${conFoto}`);
  console.log(`  · con placeholder        : ${perfumes.length - conFoto}`);
  console.log(`  · con precio             : ${perfumes.filter((p) => p.precio !== null).length}`);
  console.log(`  · con concentración      : ${perfumes.filter((p) => p.concentracion).length}`);
  console.log(`Reseñas a insertar         : ${reviews.length}`);
  for (const message of [...invalid, ...invalidReviews]) {
    console.log(`  ✗ ${message}`);
  }

  if (DRY_RUN) {
    console.log("\n--dry-run: no se escribió nada. Ejemplo del primer perfume traducido:\n");
    console.log(JSON.stringify(perfumes[0], null, 2));
    return;
  }

  // Cargar credenciales. process.loadEnvFile existe desde Node 20.12.
  process.loadEnvFile(ENV_FILE);
  const supabase = getSupabaseAdmin();

  // Comprobar que las tablas existen y si ya tienen datos.
  const { count, error: countError } = await supabase
    .from("perfumes")
    .select("id", { count: "exact", head: true });

  if (countError) {
    console.error(
      `\nNo se pudo leer la tabla "perfumes": ${countError.message}\n` +
        "¿Ya aplicaste las migraciones de supabase/migrations/ en el SQL Editor de Supabase?",
    );
    process.exitCode = 1;
    return;
  }

  if ((count ?? 0) > 0 && !FORCE) {
    console.error(
      `\nLa tabla "perfumes" ya tiene ${count} filas. No se hizo ningún cambio.\n` +
        "Si de verdad quieres volver a cargar el catálogo original, usa:\n" +
        "  npm run db:seed -- --force\n" +
        "(sobrescribe los perfumes con el mismo id y reemplaza sus reseñas).",
    );
    process.exitCode = 1;
    return;
  }

  const errors: string[] = [...invalid, ...invalidReviews];

  /* Insertar perfumes por lotes. upsert = insertar, o actualizar si el id
     ya existe (solo ocurre con --force). */
  const insertedIds = new Set<number>();
  for (let i = 0; i < perfumes.length; i += BATCH_SIZE) {
    const batch = perfumes.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("perfumes").upsert(batch, { onConflict: "id" });

    if (!error) {
      batch.forEach((row) => insertedIds.add(row.id));
      continue;
    }

    // Si el lote falla, se reintenta fila a fila para saber cuál es la mala
    // y no perder las demás.
    for (const row of batch) {
      const { error: rowError } = await supabase
        .from("perfumes")
        .upsert(row, { onConflict: "id" });
      if (rowError) {
        errors.push(`perfume id ${row.id} (${row.marca} ${row.nombre}): ${rowError.message}`);
      } else {
        insertedIds.add(row.id);
      }
    }
  }

  /* Insertar reseñas, solo de los perfumes que sí entraron. */
  const reviewsToInsert = reviews.filter((r) => insertedIds.has(r.perfume_id));
  let insertedReviews = 0;

  if (FORCE && insertedIds.size > 0) {
    // Con --force se quitan primero las reseñas antiguas de esos perfumes
    // para no duplicarlas.
    const { error } = await supabase
      .from("reviews")
      .delete()
      .in("perfume_id", [...insertedIds]);
    if (error) errors.push(`limpieza de reseñas previas: ${error.message}`);
  }

  for (let i = 0; i < reviewsToInsert.length; i += BATCH_SIZE) {
    const batch = reviewsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("reviews").insert(batch);
    if (error) {
      errors.push(`reseñas (lote desde la ${i + 1}): ${error.message}`);
    } else {
      insertedReviews += batch.length;
    }
  }

  /* Poner los contadores de id después del más alto (ver la migración inicial). */
  const { error: sequenceError } = await supabase.rpc("sync_id_sequences");
  if (sequenceError) {
    errors.push(
      `no se pudieron sincronizar los contadores de id (${sequenceError.message}). ` +
        "Ejecuta en el SQL Editor: SELECT setval(pg_get_serial_sequence('perfumes','id'), (SELECT MAX(id) FROM perfumes));",
    );
  }

  /* Crear los buckets de Storage (si ya existen, no pasa nada). */
  const bucketReport: string[] = [];
  for (const bucket of BUCKETS) {
    const { error } = await supabase.storage.createBucket(bucket, { public: true });
    if (!error) {
      bucketReport.push(`${bucket}: creado`);
    } else if (/already exists/i.test(error.message)) {
      bucketReport.push(`${bucket}: ya existía`);
    } else {
      bucketReport.push(`${bucket}: ERROR`);
      errors.push(`bucket ${bucket}: ${error.message}`);
    }
  }

  /* Informe final. */
  console.log("\n── Resultado ──────────────────────────────");
  console.log(`Perfumes insertados : ${insertedIds.size} de ${source.length}`);
  console.log(`Perfumes fallidos   : ${source.length - insertedIds.size}`);
  console.log(`Reseñas insertadas  : ${insertedReviews} de ${reviews.length}`);
  console.log(`Buckets             : ${bucketReport.join(" · ")}`);

  if (errors.length > 0) {
    console.log(`\nErrores (${errors.length}):`);
    errors.forEach((message) => console.log(`  ✗ ${message}`));
    process.exitCode = 1;
  } else {
    console.log("\nCarga completada sin errores.");
  }
}

main().catch((error: unknown) => {
  console.error("\nLa carga se detuvo por un error inesperado:");
  console.error(error);
  process.exitCode = 1;
});
