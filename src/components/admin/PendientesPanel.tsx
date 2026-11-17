"use client";

/**
 * src/components/admin/PendientesPanel.tsx — Lista "Pendientes" del inicio
 * del panel.
 *
 * QUÉ ES
 *   Una lista de tareas del catálogo, cada una con su número y un enlace
 *   que lleva directo a resolverla:
 *     N perfumes sin precio  → Poner precios      (/admin/perfumes/precios)
 *     N perfumes sin foto    → Agregar fotos      (?filtro=sin-foto)
 *     N perfumes ocultos     → Revisar            (?filtro=inactivos)
 *     N perfumes agotados    → Revisar            (?filtro=agotados)
 *     Respaldo: nunca / hace N días → Descargar copia
 *   Las filas en 0 se muestran atenuadas con un visto; si no queda nada,
 *   "Todo al día".
 *
 * POR QUÉ EXISTE
 *   La dueña no tiene por qué saber qué falta revisar en cada sección: el
 *   inicio se lo dice y la lleva a la pantalla justa.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/admin/(panel)/page.tsx, que calcula los números en
 *     el servidor.
 *   - La fila del respaldo depende de localStorage (la fecha de la última
 *     descarga en ESTE dispositivo, src/lib/respaldo.ts), que solo existe
 *     en el navegador. Por eso este componente es de cliente y esa fila se
 *     calcula después de montar: así el HTML del servidor y el del
 *     navegador coinciden. Se avisa si nunca se descargó o si pasaron más
 *     de 30 días (DIAS_AVISO_RESPALDO).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDownIcon } from "@/components/ui/icons";
import { RUTA_PERFUMES, RUTA_PRECIOS, RUTA_RESPALDO } from "@/lib/admin-rutas";
import { DIAS_AVISO_RESPALDO, diasDesde, leerUltimoRespaldo } from "@/lib/respaldo";

type Conteos = {
  sinPrecio: number;
  sinFoto: number;
  ocultos: number;
  agotados: number;
};

type Fila = {
  clave: string;
  texto: string;
  pendiente: boolean;
  enlace: string;
  accion: string;
};

/** "1 perfume" / "3 perfumes". */
const perfumes = (n: number) => `${n} ${n === 1 ? "perfume" : "perfumes"}`;

/** Visto (tarea hecha). */
function Visto() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PendientesPanel({ conteos }: { conteos: Conteos }) {
  /** undefined = aún sin leer (servidor / antes de montar). */
  const [diasRespaldo, setDiasRespaldo] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    const ultima = leerUltimoRespaldo();
    setDiasRespaldo(ultima ? diasDesde(ultima) : null);
  }, []);

  const respaldoPendiente =
    diasRespaldo === null || (typeof diasRespaldo === "number" && diasRespaldo > DIAS_AVISO_RESPALDO);

  const filas: Fila[] = [
    {
      clave: "precio",
      texto: `${perfumes(conteos.sinPrecio)} sin precio`,
      pendiente: conteos.sinPrecio > 0,
      enlace: RUTA_PRECIOS,
      accion: "Poner precios",
    },
    {
      clave: "foto",
      texto: `${perfumes(conteos.sinFoto)} sin foto`,
      pendiente: conteos.sinFoto > 0,
      enlace: `${RUTA_PERFUMES}?filtro=sin-foto`,
      accion: "Agregar fotos",
    },
    {
      clave: "ocultos",
      texto: `${perfumes(conteos.ocultos)} ${conteos.ocultos === 1 ? "oculto" : "ocultos"}`,
      pendiente: conteos.ocultos > 0,
      enlace: `${RUTA_PERFUMES}?filtro=inactivos`,
      accion: "Revisar",
    },
    {
      clave: "agotados",
      texto: `${perfumes(conteos.agotados)} ${conteos.agotados === 1 ? "agotado" : "agotados"}`,
      pendiente: conteos.agotados > 0,
      enlace: `${RUTA_PERFUMES}?filtro=agotados`,
      accion: "Revisar",
    },
  ];

  // La fila del respaldo solo aparece cuando ya se sabe su estado.
  if (diasRespaldo !== undefined) {
    filas.push({
      clave: "respaldo",
      texto:
        diasRespaldo === null
          ? "Respaldo: nunca descargado en este dispositivo"
          : `Respaldo: hace ${diasRespaldo} ${diasRespaldo === 1 ? "día" : "días"}`,
      pendiente: respaldoPendiente,
      enlace: RUTA_RESPALDO,
      accion: "Descargar copia",
    });
  }

  const todoAlDia = diasRespaldo !== undefined && filas.every((f) => !f.pendiente);

  return (
    <section aria-labelledby="pendientes-titulo" className="rounded-lg border border-admin-border bg-admin-surface p-5 sm:p-6">
      <h2 id="pendientes-titulo" className="font-serif text-2xl font-semibold text-admin-text">
        Pendientes
      </h2>
      {todoAlDia && (
        <p role="status" className="mt-3 flex items-center gap-2 font-medium text-admin-gold-text">
          <Visto /> Todo al día
        </p>
      )}
      <ul className="mt-3 divide-y divide-admin-border">
        {filas.map((fila) => (
          <li key={fila.clave} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
            {fila.pendiente ? (
              <>
                <span className="text-base font-medium text-admin-text">{fila.texto}</span>
                <Link
                  href={fila.enlace}
                  className="inline-flex min-h-11 items-center rounded-lg border border-admin-gold-text px-4 text-sm font-medium text-admin-gold-text transition-colors duration-200 hover:bg-admin-bg"
                >
                  {fila.accion}
                  <ChevronDownIcon className="ml-1 h-4 w-4 -rotate-90" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <span className="flex min-h-11 items-center gap-2 text-base text-admin-muted">
                <span className="text-admin-gold-text">
                  <Visto />
                </span>
                {fila.texto}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
