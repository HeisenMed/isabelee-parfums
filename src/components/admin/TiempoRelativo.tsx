"use client";

/**
 * src/components/admin/TiempoRelativo.tsx — "hace 2 h", "ayer"…
 *
 * QUÉ ES
 *   Muestra cuándo pasó algo de forma relativa ("hace 5 min", "ayer",
 *   "hace 3 días"), dentro de un <time> con la fecha exacta.
 *
 * POR QUÉ EXISTE
 *   "Hace 2 h" depende de la hora EXACTA en que se dibuja. El servidor y el
 *   navegador dibujan en momentos distintos: si los dos calcularan "hace…",
 *   podrían salir textos diferentes ("hace 59 min" / "hace 1 h") y React
 *   daría un error de hidratación. Por eso:
 *     1. primero (servidor y navegador) se escribe la fecha corta
 *        ("17/11/2026"), calculada solo con aritmética: igual en los dos;
 *     2. después de montar, ya solo en el navegador, se cambia por el texto
 *        relativo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo usa "Últimos cambios" en src/app/admin/(panel)/page.tsx.
 *   - fechaCorta() y tiempoRelativo(): src/lib/respaldo.ts (hora de Bogotá).
 */
import { useEffect, useState } from "react";
import { fechaCorta, tiempoRelativo } from "@/lib/respaldo";

export default function TiempoRelativo({ iso }: { iso: string }) {
  const [texto, setTexto] = useState(() => fechaCorta(iso));

  useEffect(() => {
    setTexto(tiempoRelativo(iso));
  }, [iso]);

  return (
    <time dateTime={iso} title={fechaCorta(iso)}>
      {texto}
    </time>
  );
}
