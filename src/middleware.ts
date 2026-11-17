/**
 * src/middleware.ts — Portero del panel de administración.
 *
 * QUÉ ES
 *   Un "middleware" de Next.js: código que se ejecuta en el servidor ANTES
 *   de que una petición llegue a la página. Next lo reconoce por el nombre
 *   y la ubicación del archivo (src/middleware.ts); no hay que importarlo
 *   desde ningún sitio.
 *
 * POR QUÉ EXISTE
 *   Hace dos trabajos, solo para las rutas /admin/... y /auth/...:
 *
 *   1. Mantener viva la sesión. El token de acceso de Supabase caduca cada
 *      hora. Las páginas (Server Components) no pueden escribir cookies,
 *      así que no podrían guardar el token renovado. El middleware sí
 *      puede: en cada petición pide a Supabase el usuario actual, y si el
 *      token estaba caducado, Supabase lo renueva y este archivo copia las
 *      cookies nuevas tanto a la petición (para que la página que viene
 *      después las vea) como a la respuesta (para que el navegador las
 *      guarde).
 *
 *   2. Cerrar el paso. Sin sesión no se entra a /admin: se redirige al
 *      login recordando a dónde se quería ir (?next=...).
 *
 * LO QUE NO HACE
 *   No comprueba si el usuario es ADMINISTRADOR, solo si ha iniciado
 *   sesión. Esa segunda comprobación la hace src/lib/admin-auth.ts desde el
 *   layout del panel, y por debajo la impone la base de datos con RLS (Row
 *   Level Security, las reglas de acceso por fila de Postgres). El
 *   middleware es la primera barrera, no la única.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - `config.matcher` (al final) limita su alcance a /admin y /auth. La
 *     tienda (/, /catalogo, /producto/...) NO pasa por aquí, así que sigue
 *     sirviéndose desde caché sin coste añadido.
 *   - Sigue el patrón oficial de @supabase/ssr (SSR = Server-Side
 *     Rendering, renderizado en el servidor) para Next.js, comprobado
 *     contra los tipos de la versión instalada (0.12.7): cookies con
 *     getAll/setAll, y setAll recibe además las cabeceras anti-caché que
 *     deben acompañar a las cookies de sesión.
 *   - Usa las rutas de src/lib/admin-rutas.ts.
 *   - No reutiliza src/lib/supabase-server.ts porque aquí las cookies se
 *     leen del objeto `request` y se escriben en el objeto `response`, no
 *     con cookies() de next/headers.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  RECUPERACION_POR_CORREO,
  RUTA_CREAR_CONTRASENA,
  RUTA_LOGIN,
  RUTA_PANEL,
  RUTAS_ADMIN_PUBLICAS,
} from "@/lib/admin-rutas";

export async function middleware(request: NextRequest) {
  // Respuesta por defecto: "sigue hacia la página". Se declara con `let`
  // porque setAll (abajo) la vuelve a crear si Supabase renueva la sesión.
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    // Sin configuración no se puede saber quién es nadie. Se deja pasar la
    // petición: las páginas del panel fallarán al crear su cliente con un
    // mensaje claro ("Faltan NEXT_PUBLIC_SUPABASE_URL...") en lugar de
    // entrar en un bucle de redirecciones.
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // 1) En la petición: la página que se ejecuta a continuación lee
        //    ya el token renovado.
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // 2) Se rehace la respuesta para que arrastre la petición ya
        //    modificada...
        response = NextResponse.next({ request });
        // 3) ...y en la respuesta: el navegador guarda las cookies nuevas.
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // 4) Cabeceras que prohíben guardar esta respuesta en cachés
        //    intermedias (CDN — Content Delivery Network, la red de
        //    servidores que reparte copias del sitio). Si una respuesta
        //    con cookies de sesión se guardara en caché, otra persona
        //    podría recibir la sesión ajena.
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // IMPORTANTE: no poner código entre la creación del cliente y getUser().
  // getUser() valida el token contra el servidor de Auth de Supabase (no
  // se fía de lo que diga la cookie) y es lo que dispara la renovación.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Las rutas /auth/... solo necesitaban la renovación de sesión de
  // arriba: cada manejador decide por sí mismo qué hacer.
  if (!pathname.startsWith(RUTA_PANEL)) return response;

  const esRutaPublica = RUTAS_ADMIN_PUBLICAS.includes(pathname);

  if (!user && !esRutaPublica) {
    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_LOGIN;
    destino.search = "";
    if (pathname === RUTA_CREAR_CONTRASENA) {
      // A esta página solo se llega desde un enlace de correo. Sin sesión,
      // el enlace caducó o ya se usó: se explica eso en vez de pedir un
      // login que la persona quizá aún no puede hacer. Con la recuperación
      // por correo desactivada no hay enlaces que explicar: login a secas.
      if (RECUPERACION_POR_CORREO) destino.searchParams.set("error", "enlace");
    } else {
      // Se recuerda la página pedida para volver a ella tras el login.
      destino.searchParams.set("next", `${pathname}${search}`);
    }
    return redirigir(destino, response);
  }

  if (user && pathname === RUTA_LOGIN) {
    // Quien ya tiene sesión no necesita el formulario de login.
    const destino = request.nextUrl.clone();
    destino.pathname = RUTA_PANEL;
    destino.search = "";
    return redirigir(destino, response);
  }

  return response;
}

/**
 * Crea una redirección que conserva las cookies y cabeceras que Supabase
 * haya puesto en `origen`. Sin esta copia, un token renovado justo en la
 * petición que acaba redirigida se perdería y la sesión se cerraría sola.
 */
function redirigir(destino: URL, origen: NextResponse): NextResponse {
  const redireccion = NextResponse.redirect(destino);
  origen.cookies.getAll().forEach((cookie) => redireccion.cookies.set(cookie));
  ["cache-control", "expires", "pragma"].forEach((cabecera) => {
    const valor = origen.headers.get(cabecera);
    if (valor) redireccion.headers.set(cabecera, valor);
  });
  return redireccion;
}

export const config = {
  // SOLO el panel y los manejadores de autenticación. ":path*" significa
  // "cero o más segmentos", así que "/admin/:path*" cubre tanto "/admin"
  // como "/admin/login" o "/admin/perfumes/12".
  matcher: ["/admin/:path*", "/auth/:path*"],
};
