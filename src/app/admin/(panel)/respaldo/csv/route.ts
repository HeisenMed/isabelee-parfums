/**
 * src/app/admin/(panel)/respaldo/csv/route.ts — Descarga del catálogo en CSV
 * (GET /admin/respaldo/csv).
 *
 * QUÉ ES
 *   Un Route Handler (una ruta que responde con un archivo en vez de una
 *   página) que descarga isabelee-catalogo-AAAA-MM-DD.csv: un perfume por
 *   fila, listo para abrir en Excel y revisar.
 *
 * POR QUÉ EXISTE
 *   Para revisar el catálogo completo en una hoja de cálculo (precios que
 *   faltan, descripciones, etc.) y como copia legible de seguridad. Para
 *   reconstruir la tienda se usa el JSON (../json/route.ts), que lleva
 *   además reseñas y portada.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Doble protección: el middleware (src/middleware.ts) exige sesión para
 *     todo /admin/…, y aquí se llama además a comprobarAccesoAdmin(): un
 *     Route Handler no pasa por el layout del panel, así que no hereda su
 *     comprobación de "es administradora".
 *   - Datos: leerDatosRespaldo() (src/lib/admin-respaldo.ts). Formato:
 *     generarCsv() y fechaBogotaIso() (src/lib/respaldo.ts).
 *   - Content-Disposition: attachment → el navegador lo descarga en vez de
 *     mostrarlo. Cache-Control: no-store → ningún intermediario guarda una
 *     copia de datos privados (incluye perfumes ocultos).
 */
import { NextResponse } from "next/server";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";
import { leerDatosRespaldo } from "@/lib/admin-respaldo";
import { RUTA_LOGIN, RUTA_RESPALDO } from "@/lib/admin-rutas";
import { fechaBogotaIso, generarCsv } from "@/lib/respaldo";

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

  return new NextResponse(generarCsv(lectura.datos.perfumes), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="isabelee-catalogo-${fechaBogotaIso()}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
