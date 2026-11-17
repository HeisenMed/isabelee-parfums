"use client";

/**
 * src/components/admin/portada/EditorEntrega.tsx — Editor de "Así llega tu
 * fragancia".
 *
 * QUÉ ES
 *   La sección del editor de la portada con el título, los tres puntos de
 *   confianza (título + texto) y el medio en arco. Tiene sus propios
 *   "Guardar" y "Restaurar original".
 *
 * POR QUÉ EXISTE
 *   Estos textos prometen cosas al cliente ("Fragancias originales",
 *   "Envíos a toda Colombia"). Se dejan en manos de la dueña, que es quien
 *   sabe si son ciertos, con un recordatorio visible de publicar solo lo
 *   que sea verdad. (Antes estaban en el código marcados "TEXTOS POR
 *   CONFIRMAR CON LA DUEÑA".)
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta EditorPortada.tsx.
 *   - Guarda con guardarPortada("entrega", …) y restaura con
 *     restaurarPortada("entrega") (src/app/admin/portada/actions.ts).
 *   - Los íconos de cada punto los pone la tienda por posición (sello,
 *     regalo, camión; src/components/home/Entrega.tsx); aquí no se eligen.
 *   - El medio lo gestiona CampoMedio.tsx.
 */
import { useEffect, useState } from "react";
import {
  guardarPortada,
  restaurarPortada,
  type ResultadoPortada,
} from "@/app/admin/portada/actions";
import CampoContado from "@/components/admin/portada/CampoContado";
import CampoMedio from "@/components/admin/portada/CampoMedio";
import {
  avisoError,
  avisoInfo,
  botonContorno,
  botonPeligro,
  botonPrimarioCompacto,
  etiqueta,
  tarjeta,
  tituloSeccion,
} from "@/components/admin/estilos";
import { LIMITES_PORTADA, type EntregaPortada, type PuntoConfianza } from "@/types/portada";

type EditorEntregaProps = {
  inicial: EntregaPortada;
  onCambios: (hayCambios: boolean) => void;
  onAviso: (texto: string) => void;
};

export default function EditorEntrega({ inicial, onCambios, onAviso }: EditorEntregaProps) {
  const [datos, setDatos] = useState<EntregaPortada>(inicial);
  const [guardado, setGuardado] = useState<EntregaPortada>(inicial);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);

  const hayCambios = JSON.stringify(datos) !== JSON.stringify(guardado);
  useEffect(() => onCambios(hayCambios), [hayCambios, onCambios]);

  function cambiarPunto(indice: number, cambios: Partial<PuntoConfianza>) {
    setDatos((d) => ({
      ...d,
      puntos: d.puntos.map((p, i) => (i === indice ? { ...p, ...cambios } : p)),
    }));
  }

  /** Aplica la respuesta del servidor (ver EditorFamilias.aplicar). */
  function aplicar(resultado: ResultadoPortada<EntregaPortada>, textoExito: string) {
    if (resultado.ok) {
      setGuardado(resultado.datos);
      setDatos(resultado.datos);
      setError(null);
      setErrores([]);
      onAviso(resultado.aviso ? `${textoExito}. ${resultado.aviso}` : textoExito);
      return;
    }
    setError(resultado.error);
    setErrores(resultado.errores ?? []);
    // Fallo al escribir: el servidor ya borró el archivo recién subido.
    if (!resultado.errores) setDatos((d) => ({ ...d, medio: guardado.medio }));
  }

  async function guardar() {
    setGuardando(true);
    try {
      aplicar(await guardarPortada("entrega", datos), "Portada actualizada");
    } catch {
      setError("Se perdió la conexión con el servidor. Inténtalo de nuevo.");
    }
    setGuardando(false);
  }

  async function restaurar() {
    setConfirmando(false);
    setGuardando(true);
    try {
      aplicar(await restaurarPortada("entrega"), "Contenido original restaurado");
    } catch {
      setError("Se perdió la conexión con el servidor. Inténtalo de nuevo.");
    }
    setGuardando(false);
  }

  const bloqueado = guardando || subiendo;

  return (
    <section className={tarjeta} aria-labelledby="ed-entrega-titulo">
      <h2 id="ed-entrega-titulo" className={tituloSeccion}>
        Así llega tu fragancia
      </h2>
      <p className={`${avisoInfo} mt-3 font-medium`}>
        Publica solo lo que sea cierto para el negocio.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
        <div className="space-y-5">
          <CampoContado
            id="entrega-titulo"
            etiqueta="Título"
            valor={datos.titulo}
            max={LIMITES_PORTADA.tituloEntrega}
            onCambio={(v) => setDatos((d) => ({ ...d, titulo: v }))}
            deshabilitado={guardando}
          />
          {datos.puntos.map((p, i) => (
            <fieldset key={i} className="space-y-3 rounded-lg border border-admin-border p-4">
              <legend className="px-1 font-serif text-lg font-semibold text-admin-text">
                Punto {i + 1}
              </legend>
              <CampoContado
                id={`entrega-punto-${i}-titulo`}
                etiqueta="Título"
                valor={p.titulo}
                max={LIMITES_PORTADA.tituloPunto}
                onCambio={(v) => cambiarPunto(i, { titulo: v })}
                deshabilitado={guardando}
              />
              <CampoContado
                id={`entrega-punto-${i}-texto`}
                etiqueta="Texto"
                valor={p.texto}
                max={LIMITES_PORTADA.textoPunto}
                onCambio={(v) => cambiarPunto(i, { texto: v })}
                multilinea
                deshabilitado={guardando}
              />
            </fieldset>
          ))}
        </div>

        <div>
          <p className={etiqueta}>Medio</p>
          <div className="mt-1.5">
            <CampoMedio
              clave="entrega"
              id="entrega-medio"
              medio={datos.medio}
              medioGuardado={guardado.medio}
              onCambio={(medio) => setDatos((d) => ({ ...d, medio }))}
              onOcupado={setSubiendo}
              deshabilitado={guardando}
            />
          </div>
        </div>
      </div>

      {(error || errores.length > 0) && (
        <div role="alert" className={`${avisoError} mt-6`}>
          <p className="font-medium">{error}</p>
          {errores.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {errores.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-admin-border pt-5">
        <button type="button" onClick={() => void guardar()} disabled={bloqueado || !hayCambios} className={botonPrimarioCompacto}>
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <span className="text-sm text-admin-muted" aria-live="polite">
          {subiendo ? "Esperando a que termine la subida…" : hayCambios ? "Hay cambios sin guardar." : "Sin cambios pendientes."}
        </span>
        {!confirmando ? (
          <button type="button" onClick={() => setConfirmando(true)} disabled={bloqueado} className={`${botonContorno} ml-auto`}>
            Restaurar original
          </button>
        ) : (
          <div role="group" aria-label="Confirmar restaurar" className="ml-auto flex flex-wrap items-center gap-2 text-sm">
            <span className="text-admin-text">¿Volver al contenido original? Se pierden los cambios de esta sección.</span>
            <button type="button" onClick={() => void restaurar()} className={botonPeligro}>
              Sí, restaurar
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className={botonContorno}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
