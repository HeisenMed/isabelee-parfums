/**
 * src/types/perfume.ts — Tipos de datos del catálogo.
 *
 * QUÉ ES
 *   La descripción en TypeScript de cómo es un perfume y una reseña tal
 *   como salen de la base de datos de Supabase.
 *
 * POR QUÉ EXISTE
 *   Para que el editor y el compilador avisen si algún componente usa un
 *   campo que no existe o del tipo equivocado. En el sitio v1 esos errores
 *   solo se veían en el navegador (por ejemplo, el promedio "NaN" cuando
 *   las reseñas llegaban con claves en español).
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Refleja exactamente las tablas creadas por scripts/setup-database.sql.
 *     Si se añade o renombra una columna allí, hay que cambiarla aquí.
 *   - Lo usan src/lib/perfumes.ts (funciones de datos), el script de
 *     migración (scripts/migrate-perfumes.ts) y todos los componentes de
 *     catálogo y producto.
 *   - Los nombres de campo están en español porque así se llaman las
 *     columnas; las reseñas conservan sus claves en inglés (name, stars,
 *     date, comment), igual que en el catálogo v1.
 */

/** Categorías válidas. La base de datos rechaza cualquier otro valor. */
export type Genero = "Hombre" | "Mujer" | "Unisex";

/** Lista de categorías en el orden en que se muestran en la interfaz. */
export const GENEROS: Genero[] = ["Hombre", "Mujer", "Unisex"];

/** Pirámide olfativa: cada nivel es una lista de notas. */
export interface NotasOlfativas {
  /** Notas de salida: lo primero que se percibe. */
  salida: string[];
  /** Notas de corazón: el cuerpo de la fragancia. */
  corazon: string[];
  /** Notas de fondo: lo que permanece en la piel. */
  fondo: string[];
}

/** Un perfume, tal como está guardado en la tabla `perfumes`. */
export interface Perfume {
  id: number;
  nombre: string;
  marca: string;
  /** EDT, EDP, Parfum, etc. Cadena vacía si no se conoce. */
  concentracion: string;
  /** "100ml", "50ml", etc. */
  volumen: string;
  genero: Genero;
  familia_olfativa: string;
  /** Texto de venta (2-4 frases). */
  descripcion: string;
  /**
   * Descripción sensorial breve que acompaña a la pirámide de notas en el
   * bloque "Atmósfera olfativa". Campo AÑADIDO al esquema original para no
   * perder los 120 textos que ya existían en data/perfumes.js.
   */
  descripcion_olfativa: string;
  notas: NotasOlfativas;
  ocasiones: string[];
  /** Imagen principal: ruta local ("/assets/...") o URL de Supabase Storage. */
  imagen: string;
  /** Imágenes adicionales para la galería. */
  imagenes: string[];
  /** Precio en COP. `null` = sin definir → la interfaz muestra "Consultar precio". */
  precio: number | null;
  /** Precio anterior, para mostrar un descuento. */
  precio_original: number | null;
  /** "Más Vendido", "Nuevo", "Exclusivo", etc. */
  badge: string | null;
  /** URL de un video promocional. */
  video_url: string | null;
  /** Si es `false`, el perfume no aparece en el catálogo público. */
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Datos necesarios para CREAR un perfume: todo menos lo que la base de
 * datos genera sola (id y fechas).
 */
export type PerfumeInput = Omit<Perfume, "id" | "created_at" | "updated_at">;

/** Una reseña, tal como está guardada en la tabla `reviews`. */
export interface Review {
  id: number;
  perfume_id: number;
  name: string;
  /** De 1 a 5. */
  stars: number;
  /** Fecha como texto legible, formato "D Mmm YYYY" ("28 Ene 2025"). */
  date: string;
  comment: string;
  created_at: string;
}

/* ── Ordenamiento del catálogo ──────────────────────────────────────── */
/* Vive aquí (y no en src/lib/perfumes.ts) porque también lo necesita el
   selector de orden, que se ejecuta en el navegador: así ese componente no
   arrastra consigo todo el código de acceso a la base de datos. */

/** Criterios de ordenamiento del catálogo. */
export type OrdenCatalogo =
  | "destacados"
  | "precio-asc"
  | "precio-desc"
  | "nombre"
  | "marca";

/** Texto visible de cada orden, en el orden en que aparece en el selector. */
export const ORDENES: { value: OrdenCatalogo; label: string }[] = [
  { value: "destacados", label: "Destacados" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
  { value: "nombre", label: "Nombre A-Z" },
  { value: "marca", label: "Marca A-Z" },
];
