# supabase/ — Base de datos de Isabeleé Fragancias

Esta carpeta guarda todo lo necesario para **crear y llenar** la base de datos del proyecto en Supabase. Sigue la convención estándar de Supabase para que cualquier persona (o herramienta) que conozca esa convención sepa dónde está cada cosa.

> **Estado actual:** la base de datos ya está creada y cargada (16 de noviembre de 2026: 120 perfumes y 237 reseñas). No hace falta ejecutar nada de esta carpeta para trabajar en el sitio. Solo se usa para **cambiar la estructura** (una migración nueva) o para **reconstruir la base de datos desde cero**.

## Qué hay en cada carpeta

| Carpeta | Contiene | Cómo se ejecuta |
|---|---|---|
| `migrations/` | Archivos `.sql` que definen la **estructura**: tablas, columnas, índices, políticas de seguridad (RLS) y funciones. | A mano, en el SQL Editor de Supabase. |
| `seed/` | Scripts que cargan **datos** en una estructura que ya existe. | Con npm, desde la raíz del proyecto. |

Archivos actuales:

Migraciones, **en el orden en que se ejecutan**:

1. `migrations/20261116000000_initial_schema.sql` — migración n.º 1 (**aplicada** el 16 de noviembre de 2026). Crea las tablas `perfumes` y `reviews`, sus políticas RLS (Row Level Security: reglas de acceso fila por fila), un índice y dos funciones.
2. `migrations/20261117000000_admin_access.sql` — migración n.º 2 (**aplicada**). Crea la lista de administradores (`admin_users`), la función `is_admin()`, restringe a administradores las políticas "Admins can manage…" y protege los buckets de Storage.
3. `migrations/20261118000000_destacado_agotado.sql` — migración n.º 3 (**pendiente de aplicar**). Añade a `perfumes` las columnas `destacado` y `agotado`. Ver "Aplicar la migración n.º 3" más abajo.

Seed:

- `seed/seed-from-v1.ts` — carga los 120 perfumes y sus reseñas desde `data/perfumes.js` (el catálogo del sitio v1) y crea los buckets de Storage `product-images` y `product-videos`.

## Migración y seed: la diferencia

**Una migración cambia la forma de la base de datos.** Añade una tabla, una columna, una política. Responde a "¿qué se puede guardar y quién puede verlo?". Las migraciones son un historial: ejecutadas en orden, llevan una base de datos vacía hasta la estructura actual.

**Un seed mete contenido.** Inserta filas en tablas que ya existen. Responde a "¿con qué datos arranca?".

Una forma de recordarlo: la migración construye la estantería; el seed coloca los libros.

De ahí salen dos reglas:

1. **Una migración ya aplicada no se edita nunca.** El archivo describe algo que ya ocurrió en la base de datos. Si lo cambias, el archivo deja de coincidir con la realidad y quien reconstruya la base de datos obtendrá algo distinto de lo que hay en producción. Para cambiar el esquema se crea una migración **nueva**.
2. **El seed solo se ejecuta sobre una base de datos vacía.** Después de la carga inicial, la fuente de verdad del catálogo es Supabase. Los precios, fotos y perfumes que se añadan desde el panel de administración no están en `data/perfumes.js`; volver a ejecutar el seed encima los pisaría.

## Convención de nombres de las migraciones

```
YYYYMMDDHHMMSS_descripcion.sql
```

- `YYYYMMDDHHMMSS` — fecha y hora de creación: año, mes, día, hora, minutos y segundos, todo seguido. Ejemplo: `20261116000000` es el 16 de noviembre de 2026 a las 00:00:00.
- `descripcion` — qué hace, en minúsculas, sin tildes y con guiones bajos: `add_stock_to_perfumes`, `restrict_admin_policies`.

La marca de tiempo es lo que ordena los archivos: al listarlos alfabéticamente quedan en el orden en que deben ejecutarse. Por eso no se renombra una migración existente.

### Cómo añadir un cambio de esquema

1. Crea un archivo nuevo en `migrations/` con la fecha y hora actuales. Ejemplo: `20261201103000_add_stock_to_perfumes.sql`.
2. Escribe **solo el cambio**, no el esquema entero. Ejemplo: `ALTER TABLE perfumes ADD COLUMN stock INTEGER DEFAULT 0;`
3. Ejecútalo en el SQL Editor de Supabase.
4. Actualiza `src/types/perfume.ts` para que el tipo de TypeScript refleje la columna nueva.
5. Confirma el archivo en Git junto con el código que usa el cambio.

## Reconstruir la base de datos desde cero

Úsalo para montar un proyecto nuevo de Supabase (por ejemplo, un entorno de pruebas) o para recuperarse de un desastre. **No lo hagas sobre la base de datos en uso.**

1. **Crea el proyecto** en [supabase.com](https://supabase.com) (o usa uno vacío).

2. **Configura las credenciales.** En la raíz del proyecto, el archivo `.env.local` debe tener las tres claves de ESE proyecto de Supabase (Dashboard → Project Settings → API Keys):

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SECRET_KEY=...
   ```

   Este archivo nunca se sube a Git.

3. **Ejecuta las migraciones en orden.** Para cada archivo de `migrations/`, del nombre más antiguo al más reciente: Dashboard → SQL Editor → New Query → pega el contenido completo → Run. Espera a que una termine sin errores antes de pasar a la siguiente.

4. **Comprueba el seed sin escribir nada:**

   ```bash
   npm run db:seed -- --dry-run
   ```

   Debe informar de 120 perfumes traducidos y 237 reseñas, sin errores.

5. **Carga los datos:**

   ```bash
   npm run db:seed
   ```

   Inserta los perfumes y las reseñas, ajusta los contadores de id (para que el siguiente perfume sea el 121) y crea los buckets de Storage. Al final imprime cuántas filas entraron y cuántas fallaron.

6. **Verifica** con `npm run dev`: `/catalogo` debe mostrar 120 fragancias y `/producto/1` debe abrir "Acqua di Gio".

### Si algo sale mal

- **"No se pudo leer la tabla perfumes"** — falta ejecutar las migraciones (paso 3) o `.env.local` apunta a otro proyecto.
- **"La tabla perfumes ya tiene N filas"** — el seed se protege para no pisar datos. Si de verdad es una base de datos de pruebas y quieres recargarla, `npm run db:seed -- --force` sobrescribe los perfumes con el mismo id y reemplaza sus reseñas. Es destructivo: nunca sobre la base de datos en uso.
- **Los ids nuevos chocan con los existentes** — el seed no pudo llamar a `sync_id_sequences()`. Ejecuta en el SQL Editor: `SELECT sync_id_sequences();`

## Aplicar la migración n.º 3 (destacado y agotado)

Mientras no se aplique, nada se rompe: la tienda detecta que faltan las columnas y sigue como antes, y el panel muestra el aviso "Falta ejecutar la migración n.º 3" y guarda todo menos esos dos interruptores.

1. Abre el Dashboard de Supabase → **SQL Editor** → **New Query**.
2. Pega **todo** el contenido de `migrations/20261118000000_destacado_agotado.sql` y pulsa **Run**. Debe responder "Success. No rows returned". No borra ni cambia ningún dato: los perfumes existentes quedan con `destacado = false` y `agotado = false`.
3. Comprueba el resultado con las consultas de "COMPROBACIONES" al final de ese archivo.
4. Anota la fecha en la línea "ESTADO" del archivo y cambia arriba "pendiente de aplicar" por "aplicada".
5. Recarga `/admin/perfumes`: el aviso desaparece. La tienda empieza a usar las columnas sola, como mucho un minuto después (no hace falta reiniciar nada).

## Cuentas de administración (sin correo, por ahora)

El proyecto no tiene un servidor de correo propio —SMTP (Simple Mail Transfer Protocol)—, así que los enlaces de invitación y de "olvidé mi contraseña" no llegan. Mientras tanto:

- **Crear una cuenta:** Dashboard → Authentication → Users → Add user → *Create new user*, con correo y contraseña, y marcando "Auto Confirm User". El correo debe estar además en la tabla `admin_users` (ver el final de la migración n.º 2).
- **Cambiar la contraseña:** cada administradora, ya dentro del panel, en "Cambiar contraseña" (`/admin/cambiar-contrasena`).
- **Contraseña olvidada:** alguien con acceso al Dashboard la reasigna en Authentication → Users.

En el código, esto lo gobierna `RECUPERACION_POR_CORREO = false` en `src/lib/admin-rutas.ts`. Las secciones "Dirección del sitio" y "Plantillas de correo" de más abajo solo harán falta el día que se configure un SMTP propio (por ejemplo Resend) con un dominio, y se ponga esa constante en `true`.

## Aplicar la migración n.º 2 (acceso de administración) — ya hecho

> Esta migración ya está aplicada. Los pasos se conservan para reconstruir la base de datos desde cero.

Hasta que se aplique, el panel (`/admin`) deja iniciar sesión pero muestra el aviso "Falta un paso de configuración" y no abre. La tienda no se ve afectada.

1. Abre el Dashboard de Supabase → **SQL Editor** → **New Query**.
2. Pega **todo** el contenido de `migrations/20261117000000_admin_access.sql` y pulsa **Run**. Debe responder "Success. No rows returned". Va en una transacción: si algo falla, no se aplica nada.
3. Comprueba el resultado con las consultas de la sección "COMPROBACIONES" al final de ese archivo (los dos correos en `admin_users`, las políticas con `is_admin()` y las cuatro políticas de Storage).
4. Anota la fecha en la línea "ESTADO" del archivo y cambia arriba "pendiente de aplicar" por "aplicada". Desde ese momento el archivo no se edita más.
5. Entra en `http://localhost:3000/admin` con una cuenta de administración: debe abrir el panel.

Dar o quitar acceso a otra persona más adelante **no** necesita una migración: es un cambio de datos en `admin_users` (las consultas están al final del mismo archivo). Además hay que invitar la cuenta en Authentication → Users → Invite user.

## Configuración manual de Supabase Auth

Estos pasos se hacen una vez en el Dashboard; ningún archivo del proyecto los aplica.

### Registro público desactivado

Authentication → Sign In / Providers → "Allow new users to sign up" debe estar **apagado**. Las cuentas se crean solo por invitación.

### Dirección del sitio

Authentication → URL Configuration → **Site URL**: `http://localhost:3000` mientras se prueba en local. Los enlaces de los correos se construyen con este valor; al publicar el sitio habrá que cambiarlo por el dominio real.

### Plantillas de correo

Los correos de Supabase deben enlazar a `/auth/confirm` (archivo `src/app/auth/confirm/route.ts`), que canjea el enlace por una sesión y lleva a `/admin/crear-contrasena`. Con la plantilla por defecto el enlace **no funciona** con este sitio.

En Authentication → Emails → Templates, sustituye el enlace (`href`) de cada plantilla:

**Invite user**

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/admin/crear-contrasena">Crear mi contraseña</a>
```

**Reset Password**

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/admin/crear-contrasena">Crear una contraseña nueva</a>
```

`{{ .SiteURL }}` y `{{ .TokenHash }}` se escriben tal cual: Supabase los reemplaza al enviar. El resto del texto del correo se puede redactar libremente (conviene ponerlo en español).

Cada enlace sirve una sola vez y caduca; si falla, el sitio lleva a `/admin/login` con el aviso "El enlace del correo caducó o ya se usó".
