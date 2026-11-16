-- ============================================
-- Isabelé Fragancias — Migración de esquema n.º 1: esquema inicial
-- supabase/migrations/20261116000000_initial_schema.sql
-- ============================================
--
-- Schema migration #1 — structure only. Future schema changes go in NEW
-- timestamped files, never edit this one.
--
-- QUÉ ES
--   La primera migración de esquema: SOLO estructura, ningún dato. Crea
--   las tablas `perfumes` y `reviews`, sus reglas de seguridad (RLS), un
--   índice y dos funciones auxiliares.
--
-- ESTADO
--   Ya aplicada en el proyecto de Supabase el 2026-11-16. NO EDITES ESTE
--   ARCHIVO: describe lo que ya existe en la base de datos, y cambiarlo
--   aquí no cambia nada allí (solo haría que el archivo deje de ser fiel).
--   Cualquier cambio futuro del esquema — una columna nueva, una política
--   distinta — va en un archivo NUEVO de esta misma carpeta, con su propia
--   marca de tiempo: YYYYMMDDHHMMSS_descripcion.sql (ver supabase/README.md).
--
-- CÓMO SE APLICA
--   A mano, una sola vez por base de datos: Dashboard → SQL Editor →
--   New Query → pegar todo → Run. Ningún código del proyecto la ejecuta.
--   Solo hace falta volver a ejecutarla al reconstruir la base de datos
--   desde cero, siguiendo el orden de supabase/README.md.
--
-- CÓMO SE CONECTA CON EL RESTO
--   - src/types/perfume.ts describe estas mismas columnas en TypeScript.
--     Una migración nueva que cambie columnas debe ir acompañada del
--     cambio correspondiente en ese archivo.
--   - supabase/seed/seed-from-v1.ts (npm run db:seed) llena estas tablas
--     con los 120 perfumes de data/perfumes.js y, al terminar, llama a la
--     función sync_id_sequences() definida al final de este archivo.
--   - src/lib/perfumes.ts lee y escribe en estas tablas.
--
-- DIFERENCIAS CON EL ESQUEMA PEDIDO ORIGINALMENTE (marcadas con [AÑADIDO])
--   1. Columna perfumes.descripcion_olfativa: el catálogo v1 tenía ese
--      texto en los 120 perfumes y sin columna se habría perdido.
--   2. Índice reviews_perfume_id_idx: acelera "reseñas de este perfume".
--   3. Función sync_id_sequences(): ver explicación al final.
-- ============================================

-- Table: perfumes
-- Stores all perfume products. The admin panel reads and writes here.
-- Public visitors read from this table (filtered by activo = true).
CREATE TABLE IF NOT EXISTS perfumes (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  marca TEXT NOT NULL,
  concentracion TEXT DEFAULT '',
  volumen TEXT DEFAULT '',
  genero TEXT NOT NULL CHECK (genero IN ('Hombre', 'Mujer', 'Unisex')),
  familia_olfativa TEXT DEFAULT '',
  descripcion TEXT DEFAULT '',
  descripcion_olfativa TEXT DEFAULT '',  -- [AÑADIDO] texto del bloque "Atmósfera olfativa"
  notas JSONB DEFAULT '{"salida":[],"corazon":[],"fondo":[]}',
  ocasiones TEXT[] DEFAULT '{}',
  imagen TEXT DEFAULT '',
  imagenes TEXT[] DEFAULT '{}',
  precio NUMERIC(12,2) DEFAULT NULL,
  precio_original NUMERIC(12,2) DEFAULT NULL,
  badge TEXT DEFAULT NULL,
  video_url TEXT DEFAULT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: reviews
-- Reseñas de cada perfume. ON DELETE CASCADE: al borrar un perfume se
-- borran también sus reseñas.
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  perfume_id INTEGER REFERENCES perfumes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  date TEXT NOT NULL,
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- [AÑADIDO] Índice para buscar rápido las reseñas de un perfume.
CREATE INDEX IF NOT EXISTS reviews_perfume_id_idx ON reviews (perfume_id);

-- Enable RLS (Row Level Security)
-- Con RLS activo, nadie puede leer ni escribir nada salvo lo que permitan
-- las políticas de abajo. La clave secreta del servidor se salta RLS.
ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can READ active perfumes
CREATE POLICY "Public can read active perfumes"
  ON perfumes FOR SELECT
  USING (activo = true);

-- Policy: authenticated users can do everything (admin)
-- ⚠️ ATENCIÓN: esta política da control total a CUALQUIER usuario que haya
-- iniciado sesión, no solo a ti. Supabase trae activado por defecto el
-- registro público de usuarios, así que antes de la Fase 3 hay que
-- desactivarlo (Dashboard → Authentication → Sign In / Providers →
-- "Allow new users to sign up") o cambiar esta política para que compruebe
-- un correo o un rol concreto.
CREATE POLICY "Admins can manage perfumes"
  ON perfumes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: anyone can read reviews
CREATE POLICY "Public can read reviews"
  ON reviews FOR SELECT
  USING (true);

-- Policy: authenticated users can manage reviews
-- (misma advertencia que en "Admins can manage perfumes")
CREATE POLICY "Admins can manage reviews"
  ON reviews FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Auto-update the updated_at timestamp
-- Cada vez que se edita un perfume, la fecha updated_at se pone sola.
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER perfumes_updated_at
  BEFORE UPDATE ON perfumes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- [AÑADIDO] Sincronizar los contadores de id.
-- La migración inserta los perfumes conservando sus ids originales (1-120)
-- para que /producto/1 siga siendo el mismo perfume que en el sitio v1.
-- Pero al insertar ids a mano, el contador automático de la tabla no
-- avanza y se queda en 1: el siguiente perfume creado desde el panel de
-- administración chocaría con el id 1. Esta función pone cada contador
-- justo después del id más alto. El script de carga (seed) la llama al final.
-- Solo puede ejecutarla el servidor (service_role), no los visitantes.
CREATE OR REPLACE FUNCTION sync_id_sequences()
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  SELECT setval(pg_get_serial_sequence('perfumes', 'id'),
                COALESCE((SELECT MAX(id) FROM perfumes), 0) + 1, false);
  SELECT setval(pg_get_serial_sequence('reviews', 'id'),
                COALESCE((SELECT MAX(id) FROM reviews), 0) + 1, false);
$$;

REVOKE EXECUTE ON FUNCTION sync_id_sequences() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION sync_id_sequences() TO service_role;

-- Create storage buckets for product media
-- NOTE: Storage buckets must be created via the Supabase Dashboard or API,
-- not via SQL. The seed script (supabase/seed/seed-from-v1.ts) creates them via the JS client.
