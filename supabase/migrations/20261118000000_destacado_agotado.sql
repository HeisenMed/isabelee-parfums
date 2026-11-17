-- ============================================
-- Isabeleé Fragancias — Migración de esquema n.º 3: destacado y agotado
-- supabase/migrations/20261118000000_destacado_agotado.sql
-- ============================================
--
-- Schema migration #3 — two boolean columns on `perfumes`. Structure only.
-- Once applied, never edit this file: later changes go in NEW timestamped
-- files.
--
-- QUÉ ES
--   Añade dos columnas de sí/no a la tabla `perfumes`:
--     destacado  el perfume aparece en la sección "Destacados" de la portada
--     agotado    no hay existencias: se sigue mostrando, pero con la
--                etiqueta "Agotado" y al final del catálogo
--
-- POR QUÉ EXISTE
--   Hasta ahora los destacados de la portada se elegían de forma indirecta
--   (los que tuvieran el badge "Más Vendido" o, si no había, los seis
--   primeros del catálogo), y no existía manera de decir "este perfume se
--   acabó" sin ocultarlo del todo con `activo = false`. El panel de
--   administración (Fase 3B) necesita los dos interruptores.
--
--   Diferencia entre las tres casillas de visibilidad:
--     activo = false   el perfume NO se ve en la tienda (su ficha da 404)
--     agotado = true   se ve, pero avisando de que no hay existencias
--     destacado = true se ve además en la portada
--
-- ESTADO
--   PENDIENTE DE APLICAR. Quien la ejecute debe actualizar esta línea con
--   la fecha y, desde entonces, no editar más el archivo.
--
-- CÓMO SE APLICA
--   A mano, una sola vez: Dashboard de Supabase → SQL Editor → New Query →
--   pegar TODO el contenido de este archivo → Run. Debe terminar con
--   "Success. No rows returned". Ningún código del proyecto la ejecuta.
--   Requiere las migraciones n.º 1 y n.º 2 ya aplicadas.
--
--   Es idempotente: ADD COLUMN IF NOT EXISTS no hace nada si la columna ya
--   existe, así que se puede ejecutar dos veces sin romper nada. Va dentro
--   de una transacción (BEGIN … COMMIT): si un paso falla, no se aplica
--   ninguno.
--
--   No borra ni modifica datos: los 120 perfumes existentes quedan con
--   destacado = false y agotado = false, es decir, igual que hoy.
--
-- CÓMO SE CONECTA CON EL RESTO
--   - src/types/perfume.ts ya declara los dos campos en el tipo Perfume.
--   - src/lib/perfumes.ts (tienda) los usa para elegir los destacados y
--     para dejar los agotados al final. Mientras esta migración no esté
--     aplicada, detecta que faltan y sigue funcionando al modo antiguo.
--   - src/lib/admin-perfumes.ts (panel) los lee y los escribe. Mientras no
--     esté aplicada, el panel muestra el aviso "Falta ejecutar la
--     migración n.º 3" y guarda el resto de campos sin estos dos.
--   - No hacen falta políticas nuevas de RLS (Row Level Security, las
--     reglas de acceso por fila de Postgres): las de la migración n.º 2
--     protegen la fila entera, columnas nuevas incluidas.
-- ============================================

BEGIN;

-- NOT NULL DEFAULT false: toda fila, existente o nueva, tiene siempre un
-- valor (nunca "desconocido"), y un perfume recién creado no está ni
-- destacado ni agotado salvo que se indique.
ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS destacado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS agotado BOOLEAN NOT NULL DEFAULT false;

COMMIT;

-- Pide a PostgREST (la capa que convierte la base de datos en una API —
-- Application Programming Interface— web) que vuelva a leer el esquema, para
-- que las columnas nuevas estén disponibles de inmediato. Supabase suele
-- hacerlo solo; esta línea lo asegura y es inofensiva si se repite.
NOTIFY pgrst, 'reload schema';

-- ============================================
-- COMPROBACIONES (opcionales; ejecutar aparte, después de aplicar)
-- ============================================
-- 1) Deben salir las dos columnas, tipo boolean, NOT NULL y default false:
--      SELECT column_name, data_type, is_nullable, column_default
--      FROM information_schema.columns
--      WHERE table_schema = 'public'
--        AND table_name = 'perfumes'
--        AND column_name IN ('destacado', 'agotado');
--
-- 2) Todos los perfumes deben seguir ahí, ninguno destacado ni agotado
--    (total = 120 si no se ha creado ni borrado ninguno):
--      SELECT count(*) AS total,
--             count(*) FILTER (WHERE destacado) AS destacados,
--             count(*) FILTER (WHERE agotado)   AS agotados
--      FROM public.perfumes;
