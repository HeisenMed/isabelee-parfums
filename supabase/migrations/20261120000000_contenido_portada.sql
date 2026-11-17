-- ============================================
-- Isabeleé Fragancias — Migración de esquema n.º 5: contenido de la portada
-- supabase/migrations/20261120000000_contenido_portada.sql
-- ============================================
--
-- Schema migration #5 — editable home page content + "site-media" bucket.
-- Once applied, never edit this file: later changes go in NEW timestamped
-- files.
--
-- QUÉ ES
--   1. La tabla contenido_portada, con una fila por cada sección de la
--      página de inicio que se edita desde el panel (/admin/portada):
--        'familias'  "Explora por familia olfativa" (4 tarjetas en arco)
--        'entrega'   "Así llega tu fragancia" (título, 3 puntos, medio)
--   2. Sus reglas de acceso: todo el mundo puede LEER; solo las
--      administradoras (is_admin(), migración n.º 2) pueden escribir.
--   3. Las dos filas, sembradas con el contenido que había en el código.
--   4. El bucket de Storage "site-media" para los videos e imágenes de la
--      portada, con sus reglas de acceso.
--
-- POR QUÉ EXISTE
--   Hasta la Fase 5B esos textos, palabras de filtro y videos estaban
--   escritos en Familias.tsx y Entrega.tsx: cambiarlos exigía tocar código.
--   Con esta tabla la dueña los cambia desde el panel.
--
-- FORMA DE LA COLUMNA `datos` (JSONB — JSON binario de Postgres)
--   Su espejo en TypeScript es src/types/portada.ts. Un "medio" es uno de:
--     {"tipo": "video",  "src": "<url .mp4>", "poster": "<url imagen>"}
--     {"tipo": "imagen", "src": "<url imagen>"}
--   Las URL son rutas locales del sitio ("/videos/…", "/assets/…") o URL
--   públicas del bucket site-media en la carpeta de su sección.
--
--   clave = 'familias':
--     {"tarjetas": [  -- exactamente 4
--       {"titulo": "...", "texto": "...", "palabra": "...", "medio": {...}}
--     ]}
--     "palabra" es la del filtro /catalogo?familia=<palabra> (contiene,
--     distingue tildes).
--
--   clave = 'entrega':
--     {"titulo": "...",
--      "puntos": [ {"titulo": "...", "texto": "..."} ],  -- exactamente 3
--      "medio": {...}}
--
--   La base de datos solo comprueba que la clave sea una de las dos y que
--   `datos` no sea nulo. La forma y las longitudes las valida la aplicación
--   (src/lib/portada.ts) al guardar y al leer; si una fila no es válida, la
--   tienda muestra el contenido original de esa sección.
--
-- ESTADO
--   PENDIENTE DE APLICAR. Quien la ejecute debe actualizar esta línea con
--   la fecha y, desde entonces, no editar más el archivo.
--
-- CÓMO SE APLICA
--   A mano, una sola vez: Dashboard de Supabase → SQL Editor → New Query →
--   pegar TODO el contenido de este archivo → Run. Debe responder
--   "Success. No rows returned". Requiere las migraciones n.º 1 y n.º 2
--   (usa update_updated_at() e is_admin()).
--
--   Es idempotente: CREATE TABLE IF NOT EXISTS, DROP … IF EXISTS antes de
--   cada CREATE, y ON CONFLICT DO NOTHING en los INSERT. Repetirla NO
--   pisa el contenido que la dueña ya haya cambiado. Va en una transacción.
--
--   SI FALLA AL CREAR EL BUCKET ("permission denied for table buckets"):
--   según el proyecto, el SQL Editor puede no tener permiso sobre
--   storage.buckets. Entonces se crea desde la interfaz y se vuelve a
--   ejecutar esta migración entera (el resto es idempotente):
--     Dashboard → Storage → New bucket →
--       nombre: site-media · Public bucket: ACTIVADO ·
--       Restrict file upload size: 50 MB ·
--       Allowed MIME types: image/webp, image/jpeg, image/png, video/mp4
--   (Antes de volver a ejecutarla, borra o comenta el INSERT INTO
--   storage.buckets del paso 4 si sigue dando el mismo error.)
--
-- CÓMO SE CONECTA CON EL RESTO
--   - src/lib/portada.ts lee la tabla para la tienda (cliente público) y
--     guarda el contenido original (DEFAULTS_PORTADA), que es el mismo que
--     siembra esta migración.
--   - src/lib/admin-portada.ts y src/app/admin/portada/actions.ts escriben
--     con la sesión de la administradora; RLS (Row Level Security) exige
--     is_admin().
--   - El panel sube los archivos a site-media desde el navegador
--     (src/components/admin/portada/CampoMedio.tsx).
-- ============================================

BEGIN;

-- --------------------------------------------
-- 1. Tabla
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS public.contenido_portada (
  clave TEXT PRIMARY KEY CHECK (clave IN ('familias', 'entrega')),
  datos JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- updated_at se actualiza solo en cada cambio, con la misma función que
-- usa la tabla perfumes (migración n.º 1).
DROP TRIGGER IF EXISTS contenido_portada_updated_at ON public.contenido_portada;
CREATE TRIGGER contenido_portada_updated_at
  BEFORE UPDATE ON public.contenido_portada
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- --------------------------------------------
-- 2. RLS: leer, todos; escribir, solo administradoras
-- --------------------------------------------
ALTER TABLE public.contenido_portada ENABLE ROW LEVEL SECURITY;

-- La portada pública la lee sin sesión (rol anon).
DROP POLICY IF EXISTS "Todos pueden leer el contenido de la portada" ON public.contenido_portada;
CREATE POLICY "Todos pueden leer el contenido de la portada"
  ON public.contenido_portada FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Administradores pueden editar el contenido de la portada" ON public.contenido_portada;
CREATE POLICY "Administradores pueden editar el contenido de la portada"
  ON public.contenido_portada FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------
-- 3. Contenido inicial (el que había en Familias.tsx y Entrega.tsx)
-- --------------------------------------------
-- ON CONFLICT DO NOTHING: si la fila ya existe (migración repetida), no se
-- toca lo que la dueña haya cambiado.
INSERT INTO public.contenido_portada (clave, datos) VALUES
(
  'familias',
  '{
    "tarjetas": [
      {
        "titulo": "Fresca y verde",
        "texto": "Hojas, agua y aire limpio.",
        "palabra": "Acuátic",
        "medio": {
          "tipo": "video",
          "src": "/videos/aroma-tropical-en-selva.mp4",
          "poster": "/videos/posters/aroma-tropical-en-selva.webp"
        }
      },
      {
        "titulo": "Amaderada y oriental",
        "texto": "Maderas, humo y especias que envuelven.",
        "palabra": "Amaderad",
        "medio": {
          "tipo": "video",
          "src": "/videos/frasco-dorado-con-humo.mp4",
          "poster": "/videos/posters/frasco-dorado-con-humo.webp"
        }
      },
      {
        "titulo": "Frutal",
        "texto": "Dulce, jugosa y luminosa.",
        "palabra": "Frutal",
        "medio": {
          "tipo": "video",
          "src": "/videos/frasco-forma-de-mujer-fondo-cafe.mp4",
          "poster": "/videos/posters/frasco-forma-de-mujer-fondo-cafe.webp"
        }
      },
      {
        "titulo": "Cítrica",
        "texto": "Chispeante, como recién exprimida.",
        "palabra": "Cítric",
        "medio": {
          "tipo": "video",
          "src": "/videos/maquina-exprimiendo-frutas-para-aroma.mp4",
          "poster": "/videos/posters/maquina-exprimiendo-frutas-para-aroma.webp"
        }
      }
    ]
  }'::jsonb
),
(
  'entrega',
  '{
    "titulo": "Así llega tu fragancia",
    "puntos": [
      {
        "titulo": "Fragancias originales",
        "texto": "Trabajamos solo con perfumes originales, sellados de fábrica."
      },
      {
        "titulo": "Empaque cuidado",
        "texto": "Cada pedido va protegido para que llegue perfecto, listo para regalar."
      },
      {
        "titulo": "Envíos a toda Colombia",
        "texto": "Te acompañamos por WhatsApp desde el pedido hasta la entrega."
      }
    ],
    "medio": {
      "tipo": "video",
      "src": "/videos/manos-desempacando.mp4",
      "poster": "/videos/posters/manos-desempacando.webp"
    }
  }'::jsonb
)
ON CONFLICT (clave) DO NOTHING;

-- --------------------------------------------
-- 4. Bucket site-media (videos e imágenes de la portada)
-- --------------------------------------------
-- Público para LEER (la tienda muestra los archivos sin sesión). Límites:
-- 50 MB por archivo (también el máximo del plan gratuito de Supabase) y
-- solo WebP, JPEG, PNG y MP4. Se aplican aunque alguien se salte el panel.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
  true,
  52428800,
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Solo administradoras pueden listar, subir, reemplazar y borrar archivos
-- del bucket. Ver archivos en la tienda no pasa por estas políticas
-- (bucket público). Una política por operación, como en la migración n.º 2.
DROP POLICY IF EXISTS "Administradores pueden ver medios del sitio" ON storage.objects;
CREATE POLICY "Administradores pueden ver medios del sitio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "Administradores pueden subir medios del sitio" ON storage.objects;
CREATE POLICY "Administradores pueden subir medios del sitio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "Administradores pueden modificar medios del sitio" ON storage.objects;
CREATE POLICY "Administradores pueden modificar medios del sitio"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-media' AND public.is_admin())
  WITH CHECK (bucket_id = 'site-media' AND public.is_admin());

DROP POLICY IF EXISTS "Administradores pueden borrar medios del sitio" ON storage.objects;
CREATE POLICY "Administradores pueden borrar medios del sitio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-media' AND public.is_admin());

COMMIT;

-- ============================================
-- COMPROBACIONES (opcionales; ejecutar aparte, después de aplicar)
-- ============================================
-- 1) Las dos filas, con 4 tarjetas y 3 puntos:
--      SELECT clave,
--             jsonb_array_length(datos->'tarjetas') AS tarjetas,
--             jsonb_array_length(datos->'puntos')   AS puntos,
--             updated_at
--      FROM public.contenido_portada
--      ORDER BY clave;
--    Esperado: entrega | (vacío) | 3   y   familias | 4 | (vacío)
--
-- 2) Las dos políticas de la tabla:
--      SELECT policyname, cmd FROM pg_policies
--      WHERE schemaname = 'public' AND tablename = 'contenido_portada';
--
-- 3) El bucket, público, con su límite y sus tipos:
--      SELECT id, public, file_size_limit, allowed_mime_types
--      FROM storage.buckets WHERE id = 'site-media';
--
-- 4) Las cuatro políticas de Storage del bucket:
--      SELECT policyname, cmd FROM pg_policies
--      WHERE schemaname = 'storage' AND tablename = 'objects'
--        AND policyname LIKE '%medios del sitio%'
--      ORDER BY policyname;
