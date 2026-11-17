/**
 * src/app/admin/(panel)/respaldo/json/route.ts — Copia técnica completa en
 * JSON (GET /admin/respaldo/json).
 *
 * QUÉ ES
 *   Un Route Handler que descarga isabelee-catalogo-AAAA-MM-DD.json, en
 *   formato JSON (JavaScript Object Notation) legible:
 *     {
 *       "version": 1,
 *       "generado": "2026-11-17T15:04:05.000Z",
 *       "perfumes": [ …todas las columnas… ],
 *       "reviews": [ … ],
 *       "contenido_portada": [ … ]
 *     }
 *
 * POR QUÉ EXISTE
 *   Es la copia de seguridad de verdad: con ella se puede reconstruir la
 *   tienda si algo falla (procedimiento en supabase/README.md, "Restaurar
 *   desde un respaldo JSON"). El plan gratuito de Supabase no ofrece copias
 *   descargables, así que esta es la red de seguridad del negocio.
 *   "version" permite que una futura herramienta de restauración sepa
 *   cómo leer el archivo aunque el formato cambie.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Misma protección que ../csv/route.ts: middleware + comprobarAccesoAdmin().
 *   - Datos: leerDatosRespaldo() (src/lib/admin-respaldo.ts).
 *   - No incluye los archivos de fotos y videos (están en Storage y en
 *     public/): solo sus direcciones.
 */
import { NextResponse } from "next/server";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { leerDatosRespaldo } from "@/lib/admin-respaldo";
import { RUTA_LOGIN, RUTA_RESPALDO } from "@/lib/admin-rutas";
import { fechaBogotaIso } from "@/lib/respaldo";

/** Versión del formato del archivo. Súbela si cambia su estructura. */
const VERSION_RESPALDO = 1;

/** Siempre se genera al momento, con los datos actuales. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado === "sin-sesion") {
    return NextResponse.redirect(new URL(`${RUTA_LOGIN}?next=${RUTA_RESPALDO}`, request.url));
  }
  if (acceso.estado !== "ok") {
    return new NextResponse("No tienes permiso para descargar el catálogo.", { status: 403 });
  }

  const lectura = await leerDatosRespaldo();
  if (!lectura.ok) return new NextResponse(lectura.error, { status: 500 });

  const contenido = {
    version: VERSION_RESPALDO,
    generado: new Date().toISOString(),
    ...lectura.datos,
  };

  return new NextResponse(JSON.stringify(contenido, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="isabelee-catalogo-${fechaBogotaIso()}.json"`,
      "Cache-Control": "no-store, private",
    },
  });
}
