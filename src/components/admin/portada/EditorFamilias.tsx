"use client";

/**
 * src/components/admin/portada/EditorFamilias.tsx — Editor de "Explora por
 * familia olfativa".
 *
 * QUÉ ES
 *   La sección del editor de la portada con las 4 tarjetas en arco. De
 *   cada una se cambia: título, texto corto, palabra del filtro y medio
 *   (video o imagen). Tiene sus propios botones "Guardar" y "Restaurar
 *   original".
 *
 * POR QUÉ EXISTE
 *   Para que la dueña ajuste esas tarjetas sin tocar código. La palabra del
 *   filtro es lo más delicado: decide qué perfumes ve el cliente al tocar
 *   la tarjeta. Por eso, mientras se escribe, se muestra cuántos perfumes
 *   activos coinciden y se avisa si son pocos.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta EditorPortada.tsx, que recibe del servidor el contenido y la
 *     lista de familias con su número de perfumes (familiasConConteo() de
 *     src/lib/admin-portada.ts).
 *   - Guarda con guardarPortada("familias", …) y restaura con
 *     restaurarPortada("familias") (src/app/admin/portada/actions.ts).
 *   - El medio de cada tarjeta lo gestiona CampoMedio.tsx.
 *
 * EL CONTADOR "Esta palabra muestra N perfumes"
 *   Imita exactamente el filtro del catálogo (ilike '%palabra%'): sin
 *   distinguir mayúsculas, pero SÍ tildes ("Cítric" ≠ "Citric"). Se suman
 *   los perfumes de todas las familias cuyo nombre contiene la palabra.
 *   Cuenta solo perfumes activos, que son los que ve el cliente.
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
import { esPalabraFamiliaValida } from "@/lib/busqueda";
import { LIMITES_PORTADA, type FamiliaTarjeta, type FamiliasPortada } from "@/types/portada";

/** Por debajo de este número de perfumes, la tarjeta "se ve casi vacía". */
const MINIMO_RECOMENDADO = 3;

type EditorFamiliasProps = {
  inicial: FamiliasPortada;
  familias: { nombre: string; cantidad: number }[];
  onCambios: (hayCambios: boolean) => void;
  onAviso: (texto: string) => void;
};

/** Cuántos perfumes activos muestra una palabra (como el filtro del catálogo). */
function contarPerfumes(palabra: string, familias: { nombre: string; cantidad: number }[]): number {
  const buscada = palabra.trim().toLocaleLowerCase("es");
  if (!buscada) return 0;
  return familias
    .filter((f) => f.nombre.toLocaleLowerCase("es").includes(buscada))
    .reduce((total, f) => total + f.cantidad, 0);
}

export default function EditorFamilias({ inicial, familias, onCambios, onAviso }: EditorFamiliasProps) {
  const [tarjetas, setTarjetas] = useState<FamiliaTarjeta[]>(inicial.tarjetas);
  const [guardado, setGuardado] = useState<FamiliasPortada>(inicial);
  const [subidas, setSubidas] = useState(0); // subidas en curso
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errores, setErrores] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);

  const hayCambios = JSON.stringify(tarjetas) !== JSON.stringify(guardado.tarjetas);
  useEffect(() => onCambios(hayCambios), [hayCambios, onCambios]);

  function cambiar(indice: number, cambios: Partial<FamiliaTarjeta>) {
    setTarjetas((actuales) => actuales.map((t, i) => (i === indice ? { ...t, ...cambios } : t)));
  }

  /** Aplica la respuesta del servidor (guardar o restaurar). */
  function aplicar(resultado: ResultadoPortada<FamiliasPortada>, textoExito: string) {
    if (resultado.ok) {
      setGuardado(resultado.datos);
      setTarjetas(resultado.datos.tarjetas);
      setError(null);
      setErrores([]);
      onAviso(resultado.aviso ? `${textoExito}. ${resultado.aviso}` : textoExito);
      return;
    }
    setError(resultado.error);
    setErrores(resultado.errores ?? []);
    // Sin `errores` el fallo fue al escribir en la base de datos, y el
    // servidor ya borró los archivos recién subidos: se vuelve a los
    // medios guardados para no apuntar a archivos que ya no existen.
    if (!resultado.errores) {
      setTarjetas((actuales) => actuales.map((t, i) => ({ ...t, medio: guardado.tarjetas[i].medio })));
    }
  }

  async function guardar() {
    setGuardando(true);
    try {
      aplicar(await guardarPortada("familias", { tarjetas }), "Portada actualizada");
    } catch {
      setError("Se perdió la conexión con el servidor. Inténtalo de nuevo.");
    }
    setGuardando(false);
  }

  async function restaurar() {
    setConfirmando(false);
    setGuardando(true);
    try {
      aplicar(await restaurarPortada("familias"), "Contenido original restaurado");
    } catch {
      setError("Se perdió la conexión con el servidor. Inténtalo de nuevo.");
    }
    setGuardando(false);
  }

  const bloqueado = guardando || subidas > 0;

  return (
    <section className={tarjeta} aria-labelledby="ed-familias-titulo">
      <h2 id="ed-familias-titulo" className={tituloSeccion}>
        Explora por familia olfativa
      </h2>
      <p className="mt-1 text-sm text-admin-muted">
        Cuatro tarjetas en arco. Al tocar una, el cliente ve los perfumes cuya familia
        olfativa contiene la palabra del filtro.
      </p>
      <p className={`${avisoInfo} mt-3`}>
        Las tildes cuentan: «Cítric» encuentra «Cítrico», pero «Citric» no encuentra nada.
        Las mayúsculas no importan.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {tarjetas.map((t, i) => {
          const n = contarPerfumes(t.palabra, familias);
          const palabraValida = esPalabraFamiliaValida(t.palabra.trim());
          const base = `familia-${i}`;
          return (
            <fieldset key={i} className="space-y-4 rounded-lg border border-admin-border p-4">
              <legend className="px-1 font-serif text-xl font-semibold text-admin-text">
                Tarjeta {i + 1}
              </legend>

              <CampoContado
                id={`${base}-titulo`}
                etiqueta="Título"
                valor={t.titulo}
                max={LIMITES_PORTADA.tituloTarjeta}
                onCambio={(v) => cambiar(i, { titulo: v })}
                deshabilitado={guardando}
              />
              <CampoContado
                id={`${base}-texto`}
                etiqueta="Texto corto"
                valor={t.texto}
                max={LIMITES_PORTADA.textoTarjeta}
                onCambio={(v) => cambiar(i, { texto: v })}
                deshabilitado={guardando}
              />

              <div>
                <CampoContado
                  id={`${base}-palabra`}
                  etiqueta="Palabra del filtro"
                  valor={t.palabra}
                  max={LIMITES_PORTADA.palabra}
                  onCambio={(v) => cambiar(i, { palabra: v })}
                  deshabilitado={guardando}
                />
                {/* aria-live: se anuncia el número nuevo al escribir. */}
                <p aria-live="polite" className="mt-1 text-sm">
                  {!t.palabra.trim() ? (
                    <span className="text-admin-error">Escribe una palabra.</span>
                  ) : !palabraValida ? (
                    <span className="text-admin-error">Solo letras, espacios y ( ) / -.</span>
                  ) : (
                    <>
                      <span className="text-admin-text">
                        Esta palabra muestra <strong>{n}</strong> {n === 1 ? "perfume" : "perfumes"}.
                      </span>
                      {n < MINIMO_RECOMENDADO && (
                        <span className="mt-1 block font-medium text-admin-gold-text">
                          Pocos perfumes: la tarjeta se verá casi vacía.
                        </span>
                      )}
                    </>
                  )}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-admin-gold-text underline underline-offset-4">
                    Ver familias existentes ({familias.length})
                  </summary>
                  <p className="mt-2 text-xs text-admin-muted">
                    Toca una para usarla como palabra. Puedes acortarla después (por
                    ejemplo, «Frutal» en lugar de «Floral Frutal»).
                  </p>
                  <div className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                    {familias.map((f) => (
                      <button
                        key={f.nombre}
                        type="button"
                        disabled={guardando}
                        onClick={() => cambiar(i, { palabra: f.nombre })}
                        className="rounded-full border border-admin-border bg-admin-bg px-3 py-1.5 text-xs text-admin-text transition-colors duration-200 hover:border-admin-gold-text"
                      >
                        {f.nombre} <span className="text-admin-muted">({f.cantidad})</span>
                      </button>
                    ))}
                  </div>
                </details>
              </div>

              <div>
                <p className={etiqueta}>Medio</p>
                <div className="mt-1.5">
                  <CampoMedio
                    clave="familias"
                    id={`${base}-medio`}
                    medio={t.medio}
                    medioGuardado={guardado.tarjetas[i].medio}
                    onCambio={(medio) => cambiar(i, { medio })}
                    onOcupado={(ocupado) => setSubidas((c) => Math.max(0, c + (ocupado ? 1 : -1)))}
                    deshabilitado={guardando}
                  />
                </div>
              </div>
            </fieldset>
          );
        })}
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
          {subidas > 0 ? "Esperando a que termine la subida…" : hayCambios ? "Hay cambios sin guardar." : "Sin cambios pendientes."}
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
