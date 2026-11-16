"use client";

/**
 * src/components/product/SortSelect.tsx — Selector de ordenamiento.
 *
 * QUÉ ES
 *   El desplegable "Ordenar por" de la barra superior del catálogo.
 *
 * POR QUÉ EXISTE
 *   Sustituye al <select id="sortSelect"> del sitio v1. La diferencia es
 *   que aquí el orden elegido se guarda en la URL (?orden=nombre), así el
 *   enlace se puede compartir y el botón "atrás" funciona.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usa src/app/catalogo/page.tsx.
 *   - Al cambiar, reescribe el parámetro `orden` de la URL conservando los
 *     demás filtros. Next.js vuelve a renderizar la página en el servidor
 *     con esa URL, y getPerfumes() (src/lib/perfumes.ts) aplica el orden
 *     en la base de datos.
 *   - Las opciones vienen de ORDENES (src/types/perfume.ts), la misma lista
 *     que valida la página: no pueden desincronizarse.
 *   - Necesita "use client" porque lee la URL y responde a un evento.
 */
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ORDENES } from "@/types/perfume";

export default function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("orden") ?? "destacados";

  const handleChange = (value: string) => {
    // Copia editable de los parámetros actuales (los originales son de solo lectura).
    const params = new URLSearchParams(searchParams.toString());
    // "destacados" es el valor por defecto: no hace falta ensuciar la URL.
    if (value === "destacados") params.delete("orden");
    else params.set("orden", value);

    const query = params.toString();
    // scroll:false → la página no salta arriba al reordenar.
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <label className="flex items-center gap-3 text-sm font-light text-ink-muted">
      <span className="hidden sm:inline">Ordenar por</span>
      <select
        aria-label="Ordenar por"
        value={current}
        onChange={(event) => handleChange(event.target.value)}
        className="rounded-lg border border-gold/25 bg-dark-secondary px-3 py-2.5 text-sm text-ink transition-colors duration-200 hover:border-gold/50 focus:border-gold focus:outline-none"
      >
        {ORDENES.map((orden) => (
          <option key={orden.value} value={orden.value}>
            {orden.label}
          </option>
        ))}
      </select>
    </label>
  );
}
