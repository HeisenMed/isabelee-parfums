/**
 * src/types/portada.ts — Tipos del contenido editable de la portada.
 *
 * QUÉ ES
 *   La forma de los datos de las dos secciones de la página de inicio que
 *   se editan desde el panel (/admin/portada):
 *     - "Explora por familia olfativa": 4 tarjetas en arco;
 *     - "Así llega tu fragancia": título, 3 puntos de confianza y un medio.
 *   También los límites de longitud de cada texto.
 *
 * POR QUÉ EXISTE
 *   Estos datos viajan por tres sitios que deben estar de acuerdo: la
 *   tabla contenido_portada (columna `datos`, tipo JSONB — JSON binario de
 *   Postgres), el panel que los edita y la tienda que los muestra. Este
 *   archivo es la referencia común.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - La tabla la crea la migración n.º 5
 *     (supabase/migrations/20261120000000_contenido_portada.sql), cuyos
 *     comentarios repiten esta misma forma en JSON.
 *   - src/lib/portada.ts valida los datos leídos y tiene los valores por
 *     defecto (DEFAULTS_PORTADA).
 *   - Los usan src/components/home/Familias.tsx, Entrega.tsx y los
 *     componentes de src/components/admin/portada/.
 *   - Sin funciones de servidor ni de base de datos: se puede importar
 *     desde componentes del navegador.
 */

/** Las dos secciones editables; también son las claves de la tabla. */
export type ClavePortada = "familias" | "entrega";

/**
 * Lo que se ve dentro del arco: un video (con su imagen de portada,
 * "póster") o una imagen fija.
 *   src / poster: ruta local ("/videos/…", "/assets/…") o URL pública del
 *   bucket site-media de Supabase Storage.
 */
export type MedioPortada =
  | { tipo: "video"; src: string; poster: string }
  | { tipo: "imagen"; src: string };

/** Una tarjeta de "Explora por familia olfativa". */
export type FamiliaTarjeta = {
  /** Nombre visible ("Fresca y verde"). */
  titulo: string;
  /** Frase corta bajo el nombre. */
  texto: string;
  /**
   * Palabra del filtro: la tarjeta lleva a /catalogo?familia=<palabra>, que
   * muestra los perfumes cuya familia CONTIENE ese texto. Distingue tildes.
   */
  palabra: string;
  medio: MedioPortada;
};

/** Datos de la fila "familias". Siempre 4 tarjetas. */
export type FamiliasPortada = { tarjetas: FamiliaTarjeta[] };

/** Un punto de confianza de "Así llega tu fragancia". */
export type PuntoConfianza = { titulo: string; texto: string };

/** Datos de la fila "entrega". Siempre 3 puntos. */
export type EntregaPortada = {
  titulo: string;
  puntos: PuntoConfianza[];
  medio: MedioPortada;
};

/** Todo el contenido editable de la portada. */
export type ContenidoPortada = {
  familias: FamiliasPortada;
  entrega: EntregaPortada;
};

/** Cuántas tarjetas y cuántos puntos hay (fijos: el diseño cuenta con ellos). */
export const NUM_TARJETAS = 4;
export const NUM_PUNTOS = 3;

/** Longitud máxima de cada texto, en caracteres. */
export const LIMITES_PORTADA = {
  tituloTarjeta: 40,
  textoTarjeta: 80,
  palabra: 30,
  tituloEntrega: 60,
  tituloPunto: 40,
  textoPunto: 140,
} as const;
