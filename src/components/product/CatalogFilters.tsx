"use client";

/**
 * src/components/product/CatalogFilters.tsx — Filtros del catálogo.
 *
 * QUÉ ES
 *   El panel de filtros: categoría (casillas), marca y familia olfativa
 *   (desplegables) y rango de precio. En escritorio es una columna lateral
 *   fija; en móvil es un botón "Filtrar" que abre un panel deslizante.
 *
 * POR QUÉ EXISTE
 *   Sustituye al <aside class="sidebar"> del sitio v1 y a js/filters.js.
 *   La diferencia clave: allí los filtros vivían en variables de
 *   JavaScript y se perdían al recargar. Aquí viven en la URL
 *   (?genero=Mujer&marca=Dior), así que un catálogo filtrado se puede
 *   compartir, guardar en favoritos y recorrer con el botón "atrás".
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usa src/app/(tienda)/catalogo/page.tsx, que le pasa las listas de marcas y
 *     familias ya leídas de la base de datos.
 *   - Este componente NO filtra perfumes. Solo cambia la URL. Al cambiar,
 *     Next.js vuelve a renderizar la página en el servidor, que lee esos
 *     parámetros y pide a getPerfumes() (src/lib/perfumes.ts) el resultado.
 *   - Parámetros que escribe: genero (repetible), marca, familia, min, max.
 *     El parámetro `orden` es de SortSelect.tsx y aquí se conserva intacto.
 *   - Necesita "use client": lee la URL, tiene estado (panel abierto) y
 *     responde a eventos. El panel móvil se anima con Framer Motion.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { GENEROS } from "@/types/perfume";

type CatalogFiltersProps = {
  /** Marcas disponibles (ya ordenadas). */
  marcas: string[];
  /** Familias olfativas disponibles (ya ordenadas). */
  familias: string[];
  /** Si es false, se oculta el filtro de precio (aún no hay precios publicados). */
  mostrarPrecio: boolean;
};

/** Parámetros de URL que pertenecen a este panel ("orden" no es suyo). */
const FILTER_PARAMS = ["genero", "marca", "familia", "min", "max"];

/* Estilos compartidos por los controles del formulario. */
const groupTitle =
  "mb-3 text-xs font-medium uppercase tracking-[0.2em] text-gold-ink";
const control =
  // dia:border-gold-ink/80: en el tema de día el borde dorado al 25 % casi
  // no se distingue sobre marfil; se usa el dorado oscuro para que el
  // contorno del campo se vea (WCAG pide 3:1 para controles).
  "w-full rounded-lg border border-gold/25 bg-dark-secondary px-3 py-2.5 text-sm text-ink transition-colors duration-200 hover:border-gold/50 focus:border-gold focus:outline-none dia:border-gold-ink/80";

export default function CatalogFilters({
  marcas,
  familias,
  mostrarPrecio,
}: CatalogFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ── Valores actuales, leídos de la URL ───────────────────────────── */
  const generosActivos = searchParams.getAll("genero");
  const marcaActiva = searchParams.get("marca") ?? "";
  const familiaActiva = searchParams.get("familia") ?? "";
  const minActivo = searchParams.get("min") ?? "";
  const maxActivo = searchParams.get("max") ?? "";

  /** Cuántos filtros hay aplicados (para el contador del botón móvil). */
  const activeCount = FILTER_PARAMS.reduce(
    (total, name) => total + searchParams.getAll(name).length,
    0,
  );

  /* ── Escritura en la URL ──────────────────────────────────────────── */

  /**
   * Aplica cambios a una copia de los parámetros y navega a la URL nueva.
   * replace (y no push) evita llenar el historial con cada clic; scroll:
   * false mantiene la posición de la página.
   */
  const updateUrl = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  /** Marca o desmarca una categoría (pueden estar varias a la vez). */
  const toggleGenero = (genero: string) => {
    updateUrl((params) => {
      const next = generosActivos.includes(genero)
        ? generosActivos.filter((item) => item !== genero)
        : [...generosActivos, genero];
      params.delete("genero");
      next.forEach((item) => params.append("genero", item));
    });
  };

  /** Fija un parámetro de valor único, o lo quita si el valor está vacío. */
  const setParam = (name: string, value: string) => {
    updateUrl((params) => {
      if (value) params.set(name, value);
      else params.delete(name);
    });
  };

  /** El precio se aplica al enviar el formulario, no en cada tecla. */
  const applyPrice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const min = String(form.get("min") ?? "").trim();
    const max = String(form.get("max") ?? "").trim();
    updateUrl((params) => {
      if (min) params.set("min", min);
      else params.delete("min");
      if (max) params.set("max", max);
      else params.delete("max");
    });
  };

  /** Quita todos los filtros, conservando el orden elegido. */
  const clearAll = () => {
    updateUrl((params) => FILTER_PARAMS.forEach((name) => params.delete(name)));
  };

  /* ── Panel móvil: bloquear el scroll de fondo y cerrar con Escape ──── */
  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  /**
   * Los controles del formulario. Se dibujan dos veces (columna de
   * escritorio y panel móvil), por eso reciben un prefijo: así cada copia
   * tiene ids únicos y cada <label> apunta a su propio control.
   */
  const renderFields = (idPrefix: string) => (
    <div className="space-y-8">
      {/* Categoría */}
      <fieldset>
        <legend className={groupTitle}>Categoría</legend>
        <div className="space-y-1">
          {GENEROS.map((genero) => (
            <label
              key={genero}
              className="flex cursor-pointer items-center gap-3 py-1.5 text-sm font-light text-ink transition-colors duration-200 hover:text-gold-light"
            >
              <input
                type="checkbox"
                checked={generosActivos.includes(genero)}
                onChange={() => toggleGenero(genero)}
                className="h-4 w-4 cursor-pointer accent-gold"
              />
              {genero}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Marca */}
      <div>
        <label htmlFor={`${idPrefix}-marca`} className={`block ${groupTitle}`}>
          Marca
        </label>
        <select
          id={`${idPrefix}-marca`}
          value={marcaActiva}
          onChange={(event) => setParam("marca", event.target.value)}
          className={control}
        >
          <option value="">Todas las marcas</option>
          {marcas.map((marca) => (
            <option key={marca} value={marca}>
              {marca}
            </option>
          ))}
        </select>
      </div>

      {/* Familia olfativa */}
      <div>
        <label htmlFor={`${idPrefix}-familia`} className={`block ${groupTitle}`}>
          Familia olfativa
        </label>
        <select
          id={`${idPrefix}-familia`}
          value={familiaActiva}
          onChange={(event) => setParam("familia", event.target.value)}
          className={control}
        >
          <option value="">Todas las familias</option>
          {familias.map((familia) => (
            <option key={familia} value={familia}>
              {familia}
            </option>
          ))}
        </select>
      </div>

      {/* Precio: solo cuando hay precios publicados */}
      {mostrarPrecio && (
        // key: si la URL cambia desde fuera (por ejemplo "Limpiar filtros"),
        // el formulario se reinicia y los campos muestran el valor nuevo.
        <form key={`${minActivo}-${maxActivo}`} onSubmit={applyPrice}>
          <p className={groupTitle}>Precio (COP)</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="min"
              min={0}
              inputMode="numeric"
              defaultValue={minActivo}
              placeholder="Mín"
              aria-label="Precio mínimo"
              className={control}
            />
            <span aria-hidden="true" className="h-px w-3 shrink-0 bg-gold/40" />
            <input
              type="number"
              name="max"
              min={0}
              inputMode="numeric"
              defaultValue={maxActivo}
              placeholder="Máx"
              aria-label="Precio máximo"
              className={control}
            />
          </div>
          <button
            type="submit"
            className="mt-3 w-full rounded-lg border border-gold/40 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.18em] text-gold-ink transition-colors duration-200 hover:border-gold hover:text-gold-light"
          >
            Aplicar
          </button>
          <p className="mt-2 text-xs font-light leading-relaxed text-ink-muted">
            Las fragancias sin precio publicado se muestran siempre.
          </p>
        </form>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="text-sm font-light text-gold-ink underline underline-offset-4 transition-colors duration-200 hover:text-gold-light"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Escritorio: columna lateral que acompaña al scroll ── */}
      <aside
        aria-label="Filtros"
        className="hidden lg:sticky lg:top-28 lg:block lg:self-start"
      >
        <h2 className="mb-6 font-serif text-2xl text-ink">Filtros</h2>
        {renderFields("escritorio")}
      </aside>

      {/* ── Móvil: botón que abre el panel ── */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-expanded={drawerOpen}
          aria-controls="panel-filtros"
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gold/30 px-5 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:border-gold"
        >
          {/* Ícono de filtros: tres líneas de largo decreciente, en CSS */}
          <span aria-hidden="true" className="flex w-4 flex-col gap-1">
            <span className="h-px w-full bg-gold" />
            <span className="h-px w-3/4 bg-gold" />
            <span className="h-px w-1/2 bg-gold" />
          </span>
          Filtrar
          {activeCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-semibold text-on-gold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Móvil: panel deslizante ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="velo"
              aria-hidden="true"
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              key="panel"
              id="panel-filtros"
              role="dialog"
              aria-modal="true"
              aria-label="Filtros"
              className="fixed inset-y-0 left-0 z-[70] flex w-[min(88vw,360px)] flex-col border-r border-gold/20 bg-dark-secondary lg:hidden"
              initial={{ x: reduceMotion ? 0 : "-100%", opacity: reduceMotion ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduceMotion ? 0 : "-100%", opacity: reduceMotion ? 0 : 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-gold/10 px-6">
                <h2 className="font-serif text-2xl text-ink">Filtros</h2>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Cerrar filtros"
                  autoFocus
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors duration-200 hover:text-gold-light"
                >
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                {renderFields("movil")}
              </div>

              {/* Los filtros ya se aplicaron al tocarlos; este botón solo
                  cierra el panel para ver el resultado. */}
              <div className="shrink-0 border-t border-gold/10 p-5">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full rounded-lg bg-gold px-6 py-3.5 text-xs font-medium uppercase tracking-[0.2em] text-on-gold transition-colors duration-300 hover:bg-gold-bright"
                >
                  Ver resultados
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
