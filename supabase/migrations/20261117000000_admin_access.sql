-- ============================================
-- Isabelé Fragancias — Migración de esquema n.º 2: acceso de administración
-- supabase/migrations/20261117000000_admin_access.sql
-- ============================================
--
-- Schema migration #2 — admin access. Structure and security rules only.
-- Once applied, never edit this file: later changes go in NEW timestamped
-- files.
--
-- QUÉ ES
--   La migración que decide QUIÉN es administrador. Crea la lista de
--   correos autorizados (tabla admin_users), la función is_admin() que la
--   consulta, y sustituye las políticas "Admins can manage…" de la
--   migración n.º 1 por otras que exigen estar en esa lista. También
--   protege los archivos de Storage (fotos y videos de producto).
--
-- POR QUÉ EXISTE
--   La migración n.º 1 dejó una advertencia pendiente: sus políticas daban
--   control total a CUALQUIER usuario con sesión iniciada. Mientras nadie
--   podía iniciar sesión no importaba; con el panel de administración
--   (Fase 3) sí. Desde esta migración, tener una cuenta ya no basta: el
--   correo de la cuenta debe estar en admin_users.
--
--   Siglas usadas en este archivo:
--     RLS  (Row Level Security): reglas de Postgres que deciden, fila por
--          fila, qué puede leer o escribir cada usuario.
--     JWT  (JSON Web Token): el "carné" firmado que Supabase Auth entrega
--          al iniciar sesión y que viaja en cada petición. Dentro va el
--          correo del usuario. JSON (JavaScript Object Notation) es el
--          formato de texto en que está escrito.
--     API  (Application Programming Interface): la puerta por la que la
--          web habla con la base de datos.
--     RPC  (Remote Procedure Call): llamar desde la web a una función que
--          vive en la base de datos.
--
-- ESTADO
--   PENDIENTE DE APLICAR. Quien la ejecute debe actualizar esta línea con
--   la fecha (como en la migración n.º 1) y, desde entonces, no editar más
--   el archivo.
--
-- CÓMO SE APLICA
--   A mano, una sola vez: Dashboard de Supabase → SQL Editor → New Query →
--   pegar TODO el contenido de este archivo → Run. Debe terminar con
--   "Success. No rows returned". Ningún código del proyecto la ejecuta.
--   Requiere que la migración n.º 1 ya esté aplicada.
--
--   Es idempotente: se puede ejecutar dos veces sin romper nada (usa
--   IF NOT EXISTS, CREATE OR REPLACE, DROP … IF EXISTS y ON CONFLICT DO
--   NOTHING). Va dentro de una transacción (BEGIN … COMMIT): si un paso
--   falla, no se aplica ninguno y la base de datos queda como estaba.
--
--   Para comprobarla después, ver "COMPROBACIONES" al final del archivo.
--
-- CÓMO SE CONECTA CON EL RESTO
--   - src/lib/admin-auth.ts llama a is_admin() por RPC para decidir si
--     muestra el panel (src/app/admin/(panel)/layout.tsx). Si esta
--     migración no está aplicada, el panel muestra un aviso y no abre.
--   - src/lib/supabase-server.ts crea el cliente con la sesión del usuario;
--     todo lo que el panel lea o escriba con él pasa por estas políticas.
--   - La tienda no cambia: las políticas de lectura pública ("Public can
--     read…") no se tocan, y los dos buckets siguen siendo públicos.
--   - No añade columnas a `perfumes`, así que src/types/perfume.ts no
--     cambia. Eso corresponde a la Fase 3B.
--   - Para dar o quitar acceso a alguien más adelante NO hace falta otra
--     migración: es un cambio de datos (ver "GESTIONAR ADMINISTRADORES" al
--     final).
-- ============================================

BEGIN;

-- --------------------------------------------
-- 1. Tabla admin_users: la lista de correos autorizados
-- --------------------------------------------
-- Una fila por administrador. La clave primaria es el correo, siempre en
-- minúsculas (is_admin() compara en minúsculas).
CREATE TABLE IF NOT EXISTS public.admin_users (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS activado y NINGUNA política: con eso, nadie puede leer ni modificar
-- esta tabla a través de la API, ni los visitantes ni los usuarios con
-- sesión. La lista de administradores no se puede consultar ni alterar
-- desde la web; solo desde el Dashboard de Supabase (o con la clave
-- secreta del servidor, que se salta RLS).
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Segunda cerradura: además de RLS, se retiran los permisos de tabla a los
-- roles de la API. Si alguien añadiera por error una política permisiva en
-- el futuro, la tabla seguiría cerrada.
--   anon           = visitantes sin sesión
--   authenticated  = usuarios con sesión iniciada
REVOKE ALL ON TABLE public.admin_users FROM PUBLIC, anon, authenticated;

-- --------------------------------------------
-- 2. Los dos administradores iniciales
-- --------------------------------------------
-- En minúsculas. ON CONFLICT DO NOTHING: si ya están, no se duplican ni
-- da error.
INSERT INTO public.admin_users (email) VALUES
  ('isabeleefragancias@gmail.com'),
  ('natiacevedo1616@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- --------------------------------------------
-- 3. Función is_admin(): "¿quien llama es administrador?"
-- --------------------------------------------
-- Devuelve true si el correo del usuario que hace la petición está en
-- admin_users. El correo se lee del JWT con auth.jwt() ->> 'email'. Ese
-- token lo firma Supabase Auth y el usuario no puede alterarlo sin
-- invalidarlo, así que el correo es de fiar. Sin sesión, auth.jwt() no
-- trae correo y el resultado es false.
--
-- STABLE: dentro de una misma consulta devuelve siempre lo mismo, lo que
--   permite a Postgres evaluarla una vez y no una por cada fila.
--
-- SECURITY DEFINER — por qué hace falta:
--   Normalmente una función se ejecuta con los permisos de QUIEN LA LLAMA.
--   Pero quien la llama (un usuario con sesión) no puede leer admin_users:
--   acabamos de cerrarla a propósito. Con permisos de quien llama, la
--   función vería la tabla vacía y diría siempre "false".
--   SECURITY DEFINER hace que se ejecute con los permisos de su DUEÑO (el
--   rol que crea la función, que es el dueño de la tabla y sí puede
--   leerla). Así la función puede responder "sí" o "no" sin que el usuario
--   llegue a ver nunca la lista: solo obtiene la respuesta sobre sí mismo.
--
-- SET search_path = public — por qué va siempre con SECURITY DEFINER:
--   Fija en qué esquema se buscan las tablas. Sin esto, alguien podría
--   crear en otro esquema una tabla falsa llamada admin_users y engañar a
--   una función que se ejecuta con permisos elevados.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE email = lower(auth.jwt() ->> 'email')
  );
$$;

-- Quién puede EJECUTAR la función. Por defecto Postgres deja ejecutar una
-- función nueva a todo el mundo (PUBLIC), y Supabase además da permiso
-- explícito a `anon`. Se retiran ambos y se concede solo a los usuarios
-- con sesión, que es lo que necesitan el panel y las políticas de abajo.
-- (service_role, el rol de la clave secreta del servidor, conserva el
-- permiso que Supabase le da por defecto.)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- --------------------------------------------
-- 4. Políticas de perfumes y reseñas: solo administradores
-- --------------------------------------------
-- Se eliminan las dos políticas de la migración n.º 1 que decían "cualquier
-- usuario con sesión puede todo" (USING (true)) y se crean de nuevo
-- exigiendo is_admin(). Conservan el mismo nombre.
--   FOR ALL     cubre leer, insertar, modificar y borrar.
--   USING       decide sobre qué filas EXISTENTES se puede actuar.
--   WITH CHECK  decide qué filas NUEVAS o MODIFICADAS se aceptan.
-- Gracias a esta política, una administradora ve también los perfumes
-- inactivos (activo = false), que la política pública oculta.
--
-- Las políticas de lectura pública ("Public can read active perfumes" y
-- "Public can read reviews") NO se tocan: la tienda sigue igual.

DROP POLICY IF EXISTS "Admins can manage perfumes" ON public.perfumes;
CREATE POLICY "Admins can manage perfumes"
  ON public.perfumes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
CREATE POLICY "Admins can manage reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------
-- 5. Políticas de Storage: fotos y videos de producto
-- --------------------------------------------
-- Supabase guarda el registro de cada archivo subido como una fila de la
-- tabla storage.objects; proteger esa tabla es proteger los archivos.
-- Buckets afectados ("bucket" = carpeta raíz de Storage):
--   product-images   fotos de los perfumes
--   product-videos   videos de los perfumes
--
-- Estas cuatro políticas permiten a las administradoras listar, subir,
-- reemplazar y borrar archivos de esos dos buckets, y a nadie más.
--
-- VER las fotos en la tienda sigue funcionando para todo el mundo: los dos
-- buckets son públicos, y un bucket público sirve sus archivos por una
-- dirección directa que no pasa por estas políticas. La política de SELECT
-- de abajo solo hace falta para que el panel pueda LISTAR los archivos.
--
-- Hay una política por operación (y no una sola FOR ALL) para poder
-- retirar o ajustar una sin tocar las demás.

DROP POLICY IF EXISTS "Administradores pueden ver archivos de productos" ON storage.objects;
CREATE POLICY "Administradores pueden ver archivos de productos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'product-videos')
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Administradores pueden subir archivos de productos" ON storage.objects;
CREATE POLICY "Administradores pueden subir archivos de productos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('product-images', 'product-videos')
    AND public.is_admin()
  );

-- En UPDATE hacen falta las dos condiciones: USING (el archivo que se va a
-- cambiar es de estos buckets) y WITH CHECK (tras el cambio sigue en
-- ellos, para que no se pueda "mover" a otro bucket).
DROP POLICY IF EXISTS "Administradores pueden modificar archivos de productos" ON storage.objects;
CREATE POLICY "Administradores pueden modificar archivos de productos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'product-videos')
    AND public.is_admin()
  )
  WITH CHECK (
    bucket_id IN ('product-images', 'product-videos')
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "Administradores pueden borrar archivos de productos" ON storage.objects;
CREATE POLICY "Administradores pueden borrar archivos de productos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'product-videos')
    AND public.is_admin()
  );

COMMIT;

-- ============================================
-- COMPROBACIONES (opcionales; ejecutar aparte, después de aplicar)
-- ============================================
-- 1) Deben salir los dos correos:
--      SELECT email, created_at FROM public.admin_users ORDER BY email;
--
-- 2) Deben salir las dos políticas "Admins can manage…" con
--    qual = 'is_admin()' (ya no 'true'), más las dos "Public can read…":
--      SELECT tablename, policyname, roles, cmd, qual
--      FROM pg_policies
--      WHERE schemaname = 'public'
--      ORDER BY tablename, policyname;
--
-- 3) Deben salir las cuatro políticas "Administradores pueden…":
--      SELECT policyname, cmd FROM pg_policies
--      WHERE schemaname = 'storage' AND tablename = 'objects'
--      ORDER BY policyname;
--
-- 4) En el SQL Editor no hay sesión de usuario, así que debe dar false
--    (true solo lo ve una administradora desde el panel):
--      SELECT public.is_admin();
--
-- ============================================
-- GESTIONAR ADMINISTRADORES (más adelante; no es parte de la migración)
-- ============================================
-- Son cambios de DATOS: se ejecutan en el SQL Editor cuando hagan falta,
-- sin crear una migración nueva.
--
--   Dar acceso (además hay que invitar esa cuenta en Dashboard →
--   Authentication → Users → Invite user):
--      INSERT INTO public.admin_users (email)
--      VALUES (lower('correo@ejemplo.com'))
--      ON CONFLICT (email) DO NOTHING;
--
--   Quitar acceso (surte efecto en la siguiente petición de esa persona):
--      DELETE FROM public.admin_users WHERE email = lower('correo@ejemplo.com');
