"use client";

/**
 * src/components/admin/portada/EditorPortada.tsx — Editor completo de la
 * portada.
 *
 * QUÉ ES
 *   El contenedor de las dos secciones editables (EditorFamilias y
 *   EditorEntrega) con lo que comparten: el aviso flotante "Portada
 *   actualizada" y el aviso de cambios sin guardar al salir.
 *
 * POR QUÉ EXISTE
 *   Cada sección guarda por separado, pero salir de la página afecta a las
 *   dos. Centralizar aquí el aviso de salida evita preguntar dos veces.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/admin/(panel)/portada/page.tsx (componente de
 *     servidor), que le pasa el contenido actual y las familias con su
 *     número de perfumes.
 *   - useAvisoSalida (src/components/admin/useAvisoSalida.ts) se activa si
 *     cualquiera de las dos secciones tiene cambios sin guardar.
 */
import { useCallback, useEffect, useState } from "react";
import EditorEntrega from "@/components/admin/portada/EditorEntrega";
import EditorFamilias from "@/components/admin/portada/EditorFamilias";
import { avisoExito } from "@/components/admin/estilos";
import { useAvisoSalida } from "@/components/admin/useAvisoSalida";
import type { ContenidoPortada } from "@/types/portada";

/** Milisegundos que permanece visible el aviso flotante. */
const DURACION_AVISO_MS = 5000;

type EditorPortadaProps = {
  contenido: ContenidoPortada;
  familias: { nombre: string; cantidad: number }[];
};

export default function EditorPortada({ contenido, familias }: EditorPortadaProps) {
  const [cambiosFamilias, setCambiosFamilias] = useState(false);
  const [cambiosEntrega, setCambiosEntrega] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useAvisoSalida(cambiosFamilias || cambiosEntrega);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(null), DURACION_AVISO_MS);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  // useCallback: los editores usan estas funciones en un efecto; si
  // cambiaran en cada dibujo, el efecto se repetiría sin necesidad.
  const alCambiarFamilias = useCallback((v: boolean) => setCambiosFamilias(v), []);
  const alCambiarEntrega = useCallback((v: boolean) => setCambiosEntrega(v), []);
  const alAvisar = useCallback((texto: string) => setAviso(texto), []);

  return (
    <div className="space-y-8">
      <EditorFamilias
        inicial={contenido.familias}
        familias={familias}
        onCambios={alCambiarFamilias}
        onAviso={alAvisar}
      />
      <EditorEntrega inicial={contenido.entrega} onCambios={alCambiarEntrega} onAviso={alAvisar} />

      {/* Aviso flotante. role="status": se anuncia sin interrumpir. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-20 flex justify-center px-5">
        {aviso && (
          <p role="status" className={`${avisoExito} pointer-events-auto shadow-[0_8px_24px_rgba(31,31,31,0.12)]`}>
            {aviso}
          </p>
        )}
      </div>
    </div>
  );
}
