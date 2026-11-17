"use client";

/**
 * src/components/admin/BotonesRespaldo.tsx — Botones de descarga del respaldo.
 *
 * QUÉ ES
 *   Los dos botones de /admin/respaldo ("Descargar para Excel (CSV)" y
 *   "Descargar copia completa (JSON)") y la línea "Última copia en este
 *   dispositivo: …".
 *
 * POR QUÉ EXISTE
 *   Las descargas son enlaces normales a las rutas
 *   /admin/respaldo/csv y /admin/respaldo/json; este componente solo añade
 *   la memoria de cuándo se descargó la última copia, que el inicio del
 *   panel usa para recordar "Respaldo: hace N días → Descargar copia".
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/admin/(panel)/respaldo/page.tsx.
 *   - La fecha se guarda en localStorage ("isabelee-ultimo-respaldo") con
 *     guardarUltimoRespaldo() de src/lib/respaldo.ts. Es de ESTE navegador:
 *     otra administradora, en otro dispositivo, verá la suya.
 *   - Se anota al PULSAR el botón: si la descarga fallara después, la
 *     fecha quedaría anotada igual (el navegador no avisa a la página de
 *     que la descarga terminó).
 *   - La fecha se lee después de montar (no existe en el servidor), para
 *     no provocar errores de hidratación.
 */
import { useEffect, useState } from "react";
import { botonContorno, botonPrimarioCompacto } from "@/components/admin/estilos";
import { DownloadIcon } from "@/components/ui/icons";
import { RUTA_RESPALDO_CSV, RUTA_RESPALDO_JSON } from "@/lib/admin-rutas";
import { fechaCorta, guardarUltimoRespaldo, leerUltimoRespaldo, tiempoRelativo } from "@/lib/respaldo";

export default function BotonesRespaldo() {
  /** undefined = aún sin leer; null = nunca. */
  const [ultima, setUltima] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setUltima(leerUltimoRespaldo());
  }, []);

  const anotar = () => setUltima(guardarUltimoRespaldo());

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <a href={RUTA_RESPALDO_CSV} download onClick={anotar} className={`${botonPrimarioCompacto} gap-2`}>
          <DownloadIcon className="h-5 w-5" aria-hidden="true" />
          Descargar para Excel (CSV)
        </a>
        <a href={RUTA_RESPALDO_JSON} download onClick={anotar} className={`${botonContorno} gap-2`}>
          <DownloadIcon className="h-5 w-5" aria-hidden="true" />
          Descargar copia completa (JSON)
        </a>
      </div>
      <p aria-live="polite" className="mt-4 text-sm text-admin-muted">
        Última copia en este dispositivo:{" "}
        <strong className="font-medium text-admin-text">
          {ultima === undefined ? "…" : ultima === null ? "nunca" : `${tiempoRelativo(ultima)} (${fechaCorta(ultima)})`}
        </strong>
      </p>
    </div>
  );
}
