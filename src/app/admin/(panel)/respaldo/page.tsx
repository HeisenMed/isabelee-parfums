/**
 * src/app/admin/(panel)/respaldo/page.tsx — Respaldo del catálogo
 * (ruta "/admin/respaldo").
 *
 * QUÉ ES
 *   La pantalla para descargar una copia del catálogo en dos formatos, con
 *   una explicación sencilla de para qué sirve cada uno.
 *
 * POR QUÉ EXISTE
 *   El plan gratuito de Supabase no ofrece copias de seguridad que se
 *   puedan descargar. Si algo se borrara por error, esta copia es lo que
 *   permitiría recuperar el catálogo. Por eso se recomienda descargarla
 *   cada mes, y el inicio del panel lo recuerda pasados 30 días.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Las descargas las sirven ./csv/route.ts y ./json/route.ts.
 *   - Los botones y la "última copia" son BotonesRespaldo
 *     (src/components/admin/), que lo anota en este dispositivo.
 *   - Cómo se usaría el JSON para reconstruir: supabase/README.md.
 */
import type { Metadata } from "next";
import BotonesRespaldo from "@/components/admin/BotonesRespaldo";
import { avisoInfo, tarjeta, tituloSeccion } from "@/components/admin/estilos";
import { comprobarAccesoAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Respaldo del catálogo",
};

export default async function RespaldoPage() {
  const acceso = await comprobarAccesoAdmin();
  if (acceso.estado !== "ok") return null;

  return (
    <>
      <h1 className="font-serif text-4xl font-semibold text-admin-text">Respaldo del catálogo</h1>
      <p className="mt-2 max-w-2xl text-base text-admin-muted">
        Descarga una copia de todos tus perfumes, reseñas y contenido de la portada, y guárdala
        en un lugar seguro (por ejemplo, Google Drive o tu correo).
      </p>

      <p className={`${avisoInfo} mt-6 max-w-2xl`}>
        El plan gratuito de Supabase, donde vive el catálogo, no guarda copias que puedas
        descargar. Esta es tu copia de seguridad: <strong>descárgala una vez al mes</strong> y
        siempre antes de hacer cambios grandes.
      </p>

      <section className={`${tarjeta} mt-6 max-w-2xl`} aria-labelledby="respaldo-tipos">
        <h2 id="respaldo-tipos" className={tituloSeccion}>
          Dos archivos, dos usos
        </h2>
        <dl className="mt-4 space-y-4 text-base">
          <div>
            <dt className="font-medium text-admin-text">CSV — para abrir en Excel y revisar</dt>
            <dd className="mt-1 text-admin-muted">
              Una fila por perfume, con precio, descripción, notas y si está activo o agotado.
              Útil para revisar el catálogo de un vistazo o pasarlo a otra persona.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-admin-text">
              JSON — copia técnica completa para reconstruir la tienda si algo falla
            </dt>
            <dd className="mt-1 text-admin-muted">
              Incluye todo: perfumes, reseñas y el contenido de la portada. No hace falta abrirlo;
              guárdalo. Si alguna vez se pierden datos, con este archivo se pueden recuperar.
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-admin-muted">
          Las fotos y los videos no van dentro de los archivos (solo sus direcciones): siguen
          guardados en la tienda.
        </p>

        <div className="mt-6 border-t border-admin-border pt-5">
          <BotonesRespaldo />
        </div>
      </section>
    </>
  );
}
