-- ============================================
-- Isabeleé Fragancias — Migración de esquema n.º 4: límites de Storage
-- supabase/migrations/20261119000000_limites_storage.sql
-- ============================================
--
-- Schema migration #4 — size and type limits on the two product buckets.
-- Configuration only, no data. Once applied, never edit this file: later
-- changes go in NEW timestamped files.
--
-- QUÉ ES
--   Fija, en la propia configuración de Supabase Storage, qué archivos
--   admiten las dos carpetas raíz ("buckets") de producto:
--
--     product-images   máx. 5 MB por archivo; solo WebP, JPEG y PNG
--     product-videos   máx. 50 MB por archivo; solo MP4
--
-- POR QUÉ EXISTE
--   El panel ya comprueba el tipo y el tamaño antes de subir (y convierte
--   las fotos a WebP de unos cientos de KB), pero esas comprobaciones viven
--   en el navegador, y lo que pasa en el navegador se puede saltar. Con
--   estos límites es Supabase quien rechaza el archivo, aunque alguien
--   intente subirlo sin pasar por el panel (por ejemplo, llamando
--   directamente a la API — Application Programming Interface — de Storage
--   con una sesión de administradora). Es la misma idea de "defensa en
--   profundidad" que RLS (Row Level Security) aplica a las tablas.
--
--   Por qué estos números:
--     - 5 MB para fotos: el panel las reduce a 1600 px y a WebP (unos 100–
--       400 KB). 5 MB deja margen de sobra sin admitir fotos sin procesar.
--     - Se admiten también JPEG y PNG: Safari (iPhone, Mac) no sabe
--       generar WebP desde el navegador y el panel, en ese caso, sube JPEG.
--     - 50 MB para videos: es además el tamaño máximo POR ARCHIVO del plan
--       gratuito de Supabase. Un límite mayor aquí no serviría de nada
--       mientras el proyecto siga en ese plan (manda el límite global).
--     - Solo MP4: es el formato que reproducen todos los navegadores. Los
--       .mov del iPhone (QuickTime) no se ven en Chrome ni en Android.
--
-- ESTADO
--   PENDIENTE DE APLICAR. Quien la ejecute debe actualizar esta línea con
--   la fecha y, desde entonces, no editar más el archivo.
--
-- CÓMO SE APLICA
--   A mano, una sola vez: Dashboard de Supabase → SQL Editor → New Query →
--   pegar TODO el contenido de este archivo → Run. Debe responder
--   "Success. No rows returned". Ningún código del proyecto la ejecuta.
--   Requiere que existan los dos buckets (los crea el seed; ver
--   supabase/README.md).
--
--   Es idempotente: un UPDATE que fija valores concretos deja lo mismo si
--   se ejecuta dos veces. Va dentro de una transacción (BEGIN … COMMIT): si
--   algo falla, no cambia nada.
--
--   SI FALLA POR PERMISOS ("permission denied for table buckets"): la
--   tabla storage.buckets pertenece a un rol interno de Supabase y, según
--   la versión del proyecto, el SQL Editor puede no tener permiso para
--   modificarla. En ese caso se hace lo mismo desde la interfaz, en cada
--   bucket: Dashboard → Storage → (bucket) → menú "…" → Edit bucket →
--     - activar "Restrict file upload size for bucket" y poner 5 MB
--       (product-images) o 50 MB (product-videos);
--     - activar "Restrict MIME types" y escribir los tipos de arriba
--       (image/webp, image/jpeg, image/png  |  video/mp4);
--     - dejar "Public bucket" ACTIVADO (la tienda lee las fotos sin sesión).
--   El resultado es idéntico; después, las COMPROBACIONES de abajo sirven
--   igual.
--
-- CÓMO SE CONECTA CON EL RESTO
--   - src/lib/storage-media.ts tiene los mismos límites para el panel
--     (MAX_VIDEO_BYTES, tipos aceptados). Si cambias uno, cambia el otro.
--   - src/components/admin/GestorMedia.tsx traduce a español el error que
--     devuelve Supabase cuando un archivo supera estos límites.
--   - No cambia quién puede subir: eso lo deciden las políticas de
--     storage.objects de la migración n.º 2 (solo administradoras).
--   - No toca el campo `public`: los dos buckets siguen siendo públicos
--     para lectura.
-- ============================================

BEGIN;

-- file_size_limit se expresa en bytes: 5 × 1024 × 1024 = 5 242 880.
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png']
WHERE id = 'product-images';

-- 50 × 1024 × 1024 = 52 428 800 bytes.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['video/mp4']
WHERE id = 'product-videos';

COMMIT;

-- ============================================
-- COMPROBACIONES (opcionales; ejecutar aparte, después de aplicar)
-- ============================================
-- 1) Deben salir los dos buckets, públicos, con su límite y sus tipos:
--      SELECT id, public, file_size_limit, allowed_mime_types
--      FROM storage.buckets
--      WHERE id IN ('product-images', 'product-videos')
--      ORDER BY id;
--    Esperado:
--      product-images | true | 5242880  | {image/webp,image/jpeg,image/png}
--      product-videos | true | 52428800 | {video/mp4}
--
-- 2) Si sale 0 filas, los buckets no existen: créalos antes (Dashboard →
--    Storage → New bucket, públicos, con esos mismos nombres) y vuelve a
--    ejecutar la migración.
