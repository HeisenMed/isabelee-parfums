"use client";

/**
 * src/components/admin/EditorPrecios.tsx — Edición rápida de precios.
 *
 * QUÉ ES
 *   Una lista de perfumes con dos campos por fila, "Precio" y "Precio
 *   anterior (opcional)", que se guardan solos al pulsar Enter o al salir
 *   del campo. Con buscador y el interruptor "Solo sin precio".
 *
 * POR QUÉ EXISTE
 *   Hoy ningún perfume tiene precio. Abrir 120 fichas una a una para
 *   escribir un número sería eterno; aquí se ponen seguidos: escribir,
 *   Enter, siguiente.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/admin/(panel)/perfumes/precios/page.tsx, que le pasa
 *     todos los perfumes ya leídos.
 *   - Guarda con la Server Action actualizarPrecios()
 *     (src/app/admin/perfumes/actions.ts): comprueba el acceso, aplica las
 *     MISMAS reglas que el formulario completo, cambia SOLO precio y precio
 *     anterior y refresca la tienda (revalidatePath).
 *   - Búsqueda sin tildes ni mayúsculas con normalizarTexto()
 *     (src/lib/busqueda.ts); puntos de millar con conMiles() y soloDigitos()
 *     (src/lib/admin-formato.ts).
 *
 * DETALLES DE USO
 *   - Solo se guarda si el valor CAMBIÓ respecto a lo último guardado.
 *   - Enter guarda y lleva el foco al precio de la fila siguiente.
 *   - Con "Solo sin precio" activo, una fila a la que se le acaba de poner
 *     precio NO desaparece: el filtro usa los precios que había al abrir la
 *     página. Así nada salta de sitio mientras se escribe. Al recargar, ya
 *     no aparece.
 *   - Cada fila muestra su estado: "Guardando…", "Guardado" o el error (con
 *     role="alert" dentro de la fila, para que se sepa de cuál es).
 */
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { actualizarPrecios } from "@/app/admin/perfumes/actions";
import { campoTexto, etiqueta } from "@/components/admin/estilos";
import Interruptor from "@/components/admin/Interruptor";
import { conMiles, soloDigitos } from "@/lib/admin-formato";
import { normalizarTexto } from "@/lib/busqueda";
import { PLACEHOLDER_IMAGE } from "@/lib/site";

/** Lo que la página pasa de cada perfume. */
export type PerfumePrecio = {
  id: number;
  nombre: string;
  marca: string;
  volumen: string;
  imagen: string;
  precio: number | null;
  precio_original: number | null;
};

type EstadoFila = "quieto" | "guardando" | "guardado" | "error";

/** Valores de una fila: lo escrito (solo dígitos) y lo último guardado. */
type Fila = {
  precio: string;
  original: string;
  guardadoPrecio: string;
  guardadoOriginal: string;
  estado: EstadoFila;
  error: string | null;
};

/** Campo de precio: la receta del panel sin su margen superior fijo. */
const campoFila = campoTexto.replace("mt-1.5 ", "");

/** Precio de la base de datos → texto de solo dígitos ("" si no hay). */
const aDigitos = (valor: number | null) =>
  valor === null ? "" : String(Math.round(Number(valor)));

export default function EditorPrecios({ perfumes }: { perfumes: PerfumePrecio[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [soloSinPrecio, setSoloSinPrecio] = useState(true);
  const [filas, setFilas] = useState<Record<number, Fila>>(() =>
    Object.fromEntries(
      perfumes.map((p) => {
        const precio = aDigitos(p.precio);
        const original = aDigitos(p.precio_original);
        return [p.id, { precio, original, guardadoPrecio: precio, guardadoOriginal: original, estado: "quieto", error: null }];
      }),
    ),
  );
  /** Último par de valores ENVIADO por fila: evita guardar dos veces lo mismo (Enter + blur). */
  const enviados = useRef<Record<number, string>>({});
  /** Campos "Precio" de las filas visibles, en orden, para saltar con Enter. */
  const camposPrecio = useRef<(HTMLInputElement | null)[]>([]);

  // Filtrado. "Solo sin precio" mira el precio que había al abrir (props),
  // no el editado: ver DETALLES DE USO.
  const consulta = normalizarTexto(busqueda);
  const visibles = useMemo(
    () =>
      perfumes.filter(
        (p) =>
          (!soloSinPrecio || p.precio === null) &&
          (!consulta || normalizarTexto(`${p.nombre} ${p.marca}`).includes(consulta)),
      ),
    [perfumes, soloSinPrecio, consulta],
  );

  const faltan = Object.values(filas).filter((f) => f.guardadoPrecio === "").length;

  function cambiar(id: number, campo: "precio" | "original", texto: string) {
    setFilas((actual) => ({
      ...actual,
      [id]: { ...actual[id], [campo]: soloDigitos(texto), estado: "quieto", error: null },
    }));
  }

  async function guardar(id: number) {
    const fila = filas[id];
    if (!fila) return;
    const clave = `${fila.precio}|${fila.original}`;
    const sinCambios = fila.precio === fila.guardadoPrecio && fila.original === fila.guardadoOriginal;
    if (sinCambios || enviados.current[id] === clave) return;
    enviados.current[id] = clave;

    setFilas((a) => ({ ...a, [id]: { ...a[id], estado: "guardando", error: null } }));
    let resultado: Awaited<ReturnType<typeof actualizarPrecios>>;
    try {
      resultado = await actualizarPrecios(id, fila.precio, fila.original);
    } catch {
      resultado = { ok: false, error: "Se perdió la conexión. Inténtalo de nuevo." };
    }

    if (resultado.ok) {
      const precio = aDigitos(resultado.precio);
      const original = aDigitos(resultado.precio_original);
      setFilas((a) => ({
        ...a,
        // Si se siguió escribiendo mientras se guardaba, se conserva lo escrito.
        [id]: { ...a[id], guardadoPrecio: precio, guardadoOriginal: original, estado: "guardado", error: null },
      }));
    } else {
      // Se permite reintentar el mismo valor tras un error.
      delete enviados.current[id];
      setFilas((a) => ({ ...a, [id]: { ...a[id], estado: "error", error: resultado.error } }));
    }
  }

  return (
    <div>
      {/* Buscador e interruptor */}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <label htmlFor="precios-buscar" className={etiqueta}>
            Buscar por nombre o marca
          </label>
          <input
            id="precios-buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Ejemplo: sauvage, lattafa…"
            autoComplete="off"
            className={campoTexto}
          />
        </div>
        <div className="flex items-center gap-2">
          <Interruptor
            activado={soloSinPrecio}
            onCambio={setSoloSinPrecio}
            ariaLabelledBy="precios-solo-sin"
          />
          <span id="precios-solo-sin" className="text-sm font-medium text-admin-text">
            Solo sin precio
          </span>
        </div>
      </div>

      <p aria-live="polite" className="mt-4 text-base text-admin-text">
        {faltan === 0 ? (
          <strong>Todos los perfumes tienen precio.</strong>
        ) : (
          <>
            Faltan <strong>{faltan}</strong> {faltan === 1 ? "precio" : "precios"}.
          </>
        )}{" "}
        <span className="text-admin-muted">Se guarda solo al pulsar Enter o al salir del campo.</span>
      </p>

      {visibles.length === 0 ? (
        <p className="mt-6 rounded-lg border border-admin-border bg-admin-surface px-6 py-10 text-center text-admin-muted">
          {soloSinPrecio && !consulta
            ? "No queda ningún perfume sin precio."
            : "Ningún perfume coincide con tu búsqueda."}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {visibles.map((p, indice) => {
            const fila = filas[p.id];
            const idBase = `precio-${p.id}`;
            const alPulsar = (e: React.KeyboardEvent<HTMLInputElement>, esPrecio: boolean) => {
              if (e.key !== "Enter") return;
              e.preventDefault();
              void guardar(p.id);
              // Desde "Precio" o "Precio anterior": al precio de la fila siguiente.
              camposPrecio.current[indice + 1]?.focus();
              if (!esPrecio && !camposPrecio.current[indice + 1]) e.currentTarget.blur();
            };
            return (
              <li
                key={p.id}
                className="grid gap-3 rounded-lg border border-admin-border bg-admin-surface p-4 md:grid-cols-[minmax(0,1fr)_11rem_11rem_8.5rem] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Image
                    src={p.imagen || PLACEHOLDER_IMAGE}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded border border-admin-border bg-white object-contain p-0.5"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-admin-text">{p.nombre}</p>
                    <p className="truncate text-sm text-admin-muted">
                      {[p.marca, p.volumen].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor={`${idBase}-precio`} className="text-xs font-medium text-admin-muted md:sr-only">
                    Precio
                  </label>
                  <input
                    id={`${idBase}-precio`}
                    ref={(el) => {
                      camposPrecio.current[indice] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="Precio"
                    aria-label={`Precio de ${p.nombre}`}
                    aria-describedby={`${idBase}-estado`}
                    value={conMiles(fila.precio)}
                    onChange={(e) => cambiar(p.id, "precio", e.target.value)}
                    onBlur={() => void guardar(p.id)}
                    onKeyDown={(e) => alPulsar(e, true)}
                    className={`${campoFila} mt-0.5 md:mt-0`}
                  />
                </div>

                <div>
                  <label htmlFor={`${idBase}-original`} className="text-xs font-medium text-admin-muted md:sr-only">
                    Precio anterior (opcional)
                  </label>
                  <input
                    id={`${idBase}-original`}
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="next"
                    placeholder="Anterior (opcional)"
                    aria-label={`Precio anterior de ${p.nombre} (opcional)`}
                    aria-describedby={`${idBase}-estado`}
                    value={conMiles(fila.original)}
                    onChange={(e) => cambiar(p.id, "original", e.target.value)}
                    onBlur={() => void guardar(p.id)}
                    onKeyDown={(e) => alPulsar(e, false)}
                    className={`${campoFila} mt-0.5 md:mt-0`}
                  />
                </div>

                <div id={`${idBase}-estado`} className="min-h-6 text-sm md:text-right">
                  {fila.estado === "guardando" && <span className="text-admin-muted">Guardando…</span>}
                  {fila.estado === "guardado" && (
                    <span role="status" className="inline-flex items-center gap-1 font-medium text-admin-gold-text">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Guardado
                    </span>
                  )}
                  {fila.estado === "error" && (
                    <span role="alert" className="font-medium text-admin-error">
                      {fila.error}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
