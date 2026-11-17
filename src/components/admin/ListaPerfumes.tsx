"use client";

/**
 * src/components/admin/ListaPerfumes.tsx — Lista de perfumes del panel.
 *
 * QUÉ ES
 *   La parte interactiva de /admin/perfumes: el buscador, los filtros
 *   rápidos con sus contadores, y la lista en sí, que es una tabla en
 *   pantallas anchas y tarjetas apiladas en el móvil.
 *
 * POR QUÉ EXISTE
 *   La página (src/app/admin/(panel)/perfumes/page.tsx) es un componente
 *   de servidor: carga TODOS los perfumes una vez y se los pasa a este
 *   componente. Buscar y filtrar ocurre aquí, en el navegador, sobre esa
 *   lista ya cargada: por eso el resultado es instantáneo y no hace falta
 *   consultar la base de datos a cada tecla. Con unos pocos cientos de
 *   perfumes es la opción más simple y más rápida.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Recibe los perfumes ya ordenados (marca, nombre) desde la página.
 *   - Interruptor "Activo": llama a la Server Action alternarActivo()
 *     (src/app/admin/perfumes/actions.ts). Es una interfaz OPTIMISTA: el
 *     interruptor cambia en pantalla al instante, sin esperar al servidor;
 *     si el servidor responde con un error, vuelve a su posición anterior y
 *     se muestra el motivo.
 *   - "Duplicar": formulario mínimo que invoca duplicarPerfumeAccion().
 *   - "Eliminar": abre DialogoEliminar, que exige escribir el nombre.
 *   - Utilidades de src/lib/admin-formato.ts (búsqueda sin tildes, foto) y
 *     formatPrecio() de src/lib/site.ts.
 *
 * DETALLES
 *   - Los contadores de los filtros se calculan sobre TODOS los perfumes,
 *     no sobre el resultado de la búsqueda: dicen cuántos hay de cada tipo.
 *   - "Ver en tienda" solo es un enlace si el perfume está activo: la ficha
 *     de un perfume inactivo responde 404 al público.
 *   - Botones y enlaces miden al menos 44 px de alto (min-h-11) para poder
 *     tocarlos con el dedo.
 */
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  alternarActivo,
  duplicarPerfumeAccion,
} from "@/app/admin/perfumes/actions";
import DialogoEliminar from "@/components/admin/DialogoEliminar";
import Interruptor from "@/components/admin/Interruptor";
import {
  avisoError,
  botonContorno,
  campoTexto,
  etiqueta,
} from "@/components/admin/estilos";
import { normalizarTexto, tieneFoto } from "@/lib/admin-formato";
import { rutaPerfume } from "@/lib/admin-rutas";
import { formatPrecio, PLACEHOLDER_IMAGE } from "@/lib/site";
import { GENEROS, type Perfume } from "@/types/perfume";

/** Identificadores de los filtros rápidos. */
type Filtro =
  | "todos"
  | "activos"
  | "inactivos"
  | "sin-precio"
  | "sin-foto"
  | "destacados"
  | "agotados";

type ListaPerfumesProps = {
  perfumes: Perfume[];
};

/** Enlace de texto de 44 px de alto para las acciones de cada perfume. */
const accion =
  "inline-flex min-h-11 items-center rounded px-2 text-sm font-medium text-admin-gold-text underline underline-offset-4 transition-colors duration-200 hover:text-admin-text";

export default function ListaPerfumes({ perfumes }: ListaPerfumesProps) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [genero, setGenero] = useState("");

  /**
   * Cambios de "Activo" hechos en esta pantalla, por id de perfume. Mandan
   * sobre el valor que vino del servidor: así el interruptor refleja el
   * clic al instante (interfaz optimista).
   */
  const [activos, setActivos] = useState<Record<number, boolean>>({});
  /** Ids cuyo cambio aún está viajando al servidor. */
  const [guardando, setGuardando] = useState<number[]>([]);
  const [errorActivo, setErrorActivo] = useState<string | null>(null);
  const [, iniciarTransicion] = useTransition();

  /** Perfume cuyo diálogo de eliminación está abierto. */
  const [aEliminar, setAEliminar] = useState<Perfume | null>(null);

  const estaActivo = (perfume: Perfume): boolean =>
    activos[perfume.id] ?? perfume.activo;

  /** Qué perfumes cumple cada filtro rápido. */
  const cumple: Record<Filtro, (perfume: Perfume) => boolean> = {
    todos: () => true,
    activos: (p) => estaActivo(p),
    inactivos: (p) => !estaActivo(p),
    "sin-precio": (p) => p.precio === null,
    "sin-foto": (p) => !tieneFoto(p.imagen),
    // `=== true`: si falta la migración n.º 3, el campo no existe.
    destacados: (p) => p.destacado === true,
    agotados: (p) => p.agotado === true,
  };

  const filtros: { id: Filtro; texto: string }[] = [
    { id: "todos", texto: "Todos" },
    { id: "activos", texto: "Activos" },
    { id: "inactivos", texto: "Inactivos" },
    { id: "sin-precio", texto: "Sin precio" },
    { id: "sin-foto", texto: "Sin foto" },
    { id: "destacados", texto: "Destacados" },
    { id: "agotados", texto: "Agotados" },
  ];

  // Texto de búsqueda de cada perfume, ya sin tildes ni mayúsculas. Se
  // calcula una vez (useMemo) y no a cada tecla.
  const indice = useMemo(
    () =>
      new Map(
        perfumes.map((p) => [p.id, normalizarTexto(`${p.nombre} ${p.marca}`)]),
      ),
    [perfumes],
  );

  const consulta = normalizarTexto(busqueda);
  const visibles = perfumes.filter(
    (p) =>
      cumple[filtro](p) &&
      (genero === "" || p.genero === genero) &&
      (consulta === "" || (indice.get(p.id) ?? "").includes(consulta)),
  );

  /** Cambia "Activo" al instante y lo confirma (o deshace) con el servidor. */
  function alternar(perfume: Perfume) {
    const anterior = estaActivo(perfume);
    const nuevo = !anterior;

    setErrorActivo(null);
    setActivos((actual) => ({ ...actual, [perfume.id]: nuevo }));
    setGuardando((actual) => [...actual, perfume.id]);

    iniciarTransicion(async () => {
      const resultado = await alternarActivo(perfume.id, nuevo);
      setGuardando((actual) => actual.filter((id) => id !== perfume.id));
      if (!resultado.ok) {
        // Marcha atrás: el interruptor vuelve a donde estaba.
        setActivos((actual) => ({ ...actual, [perfume.id]: anterior }));
        setErrorActivo(
          `No se pudo cambiar «${perfume.nombre}». ${resultado.error}`,
        );
      }
    });
  }

  /* ── Piezas que comparten la tabla y las tarjetas ─────────────────── */

  const miniatura = (perfume: Perfume) => (
    <Image
      src={perfume.imagen || PLACEHOLDER_IMAGE}
      alt=""
      width={56}
      height={56}
      className="h-14 w-14 shrink-0 rounded border border-admin-border bg-white object-contain p-1"
    />
  );

  const precio = (perfume: Perfume) =>
    perfume.precio !== null ? (
      <span className="text-admin-text">{formatPrecio(perfume.precio)}</span>
    ) : (
      <span className="text-admin-muted">Sin precio</span>
    );

  const marcas = (perfume: Perfume) => (
    <>
      {perfume.badge && (
        <span className="rounded border border-admin-border bg-admin-bg px-2 py-0.5 text-xs font-medium text-admin-text">
          {perfume.badge}
        </span>
      )}
      {perfume.destacado === true && (
        <span className="rounded border border-admin-gold-text px-2 py-0.5 text-xs font-medium text-admin-gold-text">
          Destacado
        </span>
      )}
      {perfume.agotado === true && (
        <span className="rounded border border-admin-border-strong px-2 py-0.5 text-xs font-medium text-admin-muted">
          Agotado
        </span>
      )}
    </>
  );

  const interruptor = (perfume: Perfume) => (
    <span className="inline-flex items-center gap-1">
      <Interruptor
        activado={estaActivo(perfume)}
        onCambio={() => alternar(perfume)}
        ariaLabel={`${perfume.nombre}: visible en la tienda`}
        disabled={guardando.includes(perfume.id)}
      />
      <span className="text-sm text-admin-muted">
        {estaActivo(perfume) ? "Activo" : "Inactivo"}
      </span>
    </span>
  );

  const acciones = (perfume: Perfume) => (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-0">
      <Link href={rutaPerfume(perfume.id)} className={accion}>
        Editar
      </Link>
      {estaActivo(perfume) ? (
        <a
          href={`/producto/${perfume.id}`}
          target="_blank"
          rel="noopener"
          className={accion}
        >
          Ver en tienda
        </a>
      ) : (
        // Texto en lugar de un enlace desactivado: explica el motivo a
        // todo el mundo, también a quien usa lector de pantalla.
        <span className="inline-flex min-h-11 items-center px-2 text-sm text-admin-muted">
          No visible en la tienda (inactivo)
        </span>
      )}
      <form action={duplicarPerfumeAccion}>
        <input type="hidden" name="id" value={perfume.id} />
        <button type="submit" className={accion}>
          Duplicar
        </button>
      </form>
      <button
        type="button"
        onClick={() => setAEliminar(perfume)}
        className="inline-flex min-h-11 items-center rounded px-2 text-sm font-medium text-admin-error underline underline-offset-4"
      >
        Eliminar
      </button>
    </div>
  );

  return (
    <div>
      {/* ── Buscador y filtros ── */}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div>
          <label htmlFor="buscar-perfume" className={etiqueta}>
            Buscar por nombre o marca
          </label>
          <input
            id="buscar-perfume"
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Ejemplo: sauvage, lancome…"
            autoComplete="off"
            className={campoTexto}
          />
        </div>
        <div>
          <label htmlFor="filtro-genero" className={etiqueta}>
            Género
          </label>
          <select
            id="filtro-genero"
            value={genero}
            onChange={(evento) => setGenero(evento.target.value)}
            className={campoTexto}
          >
            <option value="">Todos</option>
            {GENEROS.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filtros rápidos. aria-pressed indica cuál está elegido. */}
      <div
        role="group"
        aria-label="Filtros rápidos"
        className="mt-4 flex flex-wrap gap-2"
      >
        {filtros.map(({ id, texto }) => {
          const elegido = filtro === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={elegido}
              onClick={() => setFiltro(id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
                elegido
                  ? "border-admin-gold-text bg-admin-text text-admin-surface"
                  : "border-admin-border-strong bg-admin-surface text-admin-text hover:border-admin-gold-text"
              }`}
            >
              {texto}
              <span
                className={elegido ? "text-admin-surface" : "text-admin-muted"}
              >
                {perfumes.filter(cumple[id]).length}
              </span>
            </button>
          );
        })}
      </div>

      {errorActivo && (
        <p role="alert" className={`${avisoError} mt-4`}>
          {errorActivo}
        </p>
      )}

      {/* aria-live: un lector de pantalla anuncia cuántos quedan al filtrar. */}
      <p aria-live="polite" className="mt-5 text-sm text-admin-muted">
        {visibles.length === perfumes.length
          ? `${perfumes.length} perfumes`
          : `${visibles.length} de ${perfumes.length} perfumes`}
      </p>

      {visibles.length === 0 ? (
        <div className="mt-4 rounded-lg border border-admin-border bg-admin-surface px-6 py-12 text-center">
          <p className="font-serif text-2xl font-semibold text-admin-text">
            {perfumes.length === 0
              ? "Todavía no hay perfumes"
              : "Ningún perfume coincide con tu búsqueda"}
          </p>
          <p className="mt-2 text-sm text-admin-muted">
            {perfumes.length === 0
              ? "Crea el primero con el botón «Nuevo perfume»."
              : "Prueba con otra palabra o quita algún filtro."}
          </p>
          {perfumes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setFiltro("todos");
                setGenero("");
              }}
              className={`${botonContorno} mt-5`}
            >
              Quitar búsqueda y filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── Escritorio: tabla (desde 768 px) ── */}
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-admin-border bg-admin-surface md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-admin-border text-xs uppercase tracking-[0.08em] text-admin-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Perfume
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Género
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Precio
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Etiquetas
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((perfume) => (
                  <tr
                    key={perfume.id}
                    className="border-b border-admin-border last:border-b-0"
                  >
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-center gap-3">
                        {miniatura(perfume)}
                        <div>
                          <p className="text-base font-medium text-admin-text">
                            {perfume.nombre}
                          </p>
                          <p className="text-sm text-admin-muted">
                            {perfume.marca}
                          </p>
                        </div>
                      </div>
                    </th>
                    <td className="px-4 py-3 text-admin-text">{perfume.genero}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {precio(perfume)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">{marcas(perfume)}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {interruptor(perfume)}
                    </td>
                    <td className="px-4 py-3">{acciones(perfume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Móvil: tarjetas apiladas (menos de 768 px) ── */}
          <ul className="mt-4 space-y-3 md:hidden">
            {visibles.map((perfume) => (
              <li
                key={perfume.id}
                className="rounded-lg border border-admin-border bg-admin-surface p-4"
              >
                <div className="flex items-start gap-3">
                  {miniatura(perfume)}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-admin-text">
                      {perfume.nombre}
                    </p>
                    <p className="text-sm text-admin-muted">
                      {perfume.marca} · {perfume.genero}
                    </p>
                    <p className="mt-1 text-sm">{precio(perfume)}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">{marcas(perfume)}</div>
                <div className="mt-2">{interruptor(perfume)}</div>
                <div className="mt-1 border-t border-admin-border pt-1">
                  {acciones(perfume)}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {aEliminar && (
        <DialogoEliminar
          // key: si se abre el diálogo de otro perfume, se crea de nuevo
          // con la caja de confirmación vacía.
          key={aEliminar.id}
          perfume={aEliminar}
          onCerrar={() => setAEliminar(null)}
        />
      )}
    </div>
  );
}
