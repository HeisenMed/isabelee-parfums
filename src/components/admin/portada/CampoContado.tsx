"use client";

/**
 * src/components/admin/portada/CampoContado.tsx — Campo de texto con
 * contador de caracteres.
 *
 * QUÉ ES
 *   Una etiqueta, un campo de una línea (o varias) y debajo "23 / 80": los
 *   caracteres escritos y el máximo.
 *
 * POR QUÉ EXISTE
 *   Los textos de la portada tienen un hueco fijo en el diseño (una línea
 *   bajo cada arco, por ejemplo). Ver el contador mientras se escribe evita
 *   sorpresas al guardar. El máximo también lo comprueba el servidor
 *   (src/lib/portada.ts); `maxLength` del navegador solo impide pasarse.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usan EditorFamilias.tsx y EditorEntrega.tsx.
 *   - Estilos del panel: src/components/admin/estilos.ts.
 *   - El contador está enlazado al campo con aria-describedby: un lector de
 *     pantalla lo lee al entrar en él.
 */
import { campoTexto, etiqueta as claseEtiqueta } from "@/components/admin/estilos";

type CampoContadoProps = {
  id: string;
  etiqueta: string;
  valor: string;
  max: number;
  onCambio: (valor: string) => void;
  /** true = área de varias líneas. */
  multilinea?: boolean;
  deshabilitado?: boolean;
};

export default function CampoContado({
  id,
  etiqueta,
  valor,
  max,
  onCambio,
  multilinea = false,
  deshabilitado = false,
}: CampoContadoProps) {
  const idContador = `${id}-contador`;
  const comunes = {
    id,
    value: valor,
    maxLength: max,
    disabled: deshabilitado,
    "aria-describedby": idContador,
    className: campoTexto,
  };

  return (
    <div>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      {multilinea ? (
        <textarea {...comunes} rows={2} onChange={(e) => onCambio(e.target.value)} />
      ) : (
        <input {...comunes} type="text" autoComplete="off" onChange={(e) => onCambio(e.target.value)} />
      )}
      <p id={idContador} className="mt-1 text-right text-xs text-admin-muted">
        {valor.length} / {max}
      </p>
    </div>
  );
}
