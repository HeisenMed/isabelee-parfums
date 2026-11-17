"use client";

/**
 * src/components/search/SearchOverlay.tsx — Buscador de perfumes.
 *
 * QUÉ ES
 *   El panel que se abre bajo el Header al pulsar la lupa (o la tecla "/"
 *   en el computador): un campo de texto y, mientras se escribe, hasta 6
 *   perfumes que coinciden por nombre o marca, con su foto y su precio.
 *
 * POR QUÉ EXISTE
 *   Quien ya sabe qué perfume quiere ("Sauvage", "Lattafa") llega a él en
 *   dos teclas, sin recorrer el catálogo ni sus filtros.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo abre y cierra src/components/layout/Header.tsx.
 *   - La PRIMERA vez que se abre descarga la lista compacta de perfumes de
 *     /api/buscar (src/app/api/buscar/route.ts) y la guarda en memoria;
 *     después filtra en el navegador, al instante y sin más peticiones.
 *   - La regla de coincidencia (sin tildes, sin mayúsculas, por palabras)
 *     es la de src/lib/busqueda.ts, la MISMA que usa /catalogo?q=…: "Ver
 *     todos los resultados" muestra exactamente lo que se veía aquí.
 *   - Enter (sin un resultado elegido) y "Ver todos" llevan a
 *     /catalogo?q=<texto>.
 *   - Sin resultados: enlace a WhatsApp con el texto buscado
 *     (whatsappUrl de src/lib/site.ts).
 *
 * ACCESIBILIDAD (patrón "combobox" de WAI-ARIA, las pautas de
 * accesibilidad para aplicaciones web)
 *   - El campo es role="combobox" y controla una lista role="listbox".
 *   - Flecha abajo/arriba recorre los resultados; el resultado elegido se
 *     anuncia con aria-activedescendant, sin mover el foco del campo (así
 *     se puede seguir escribiendo). Enter abre el elegido.
 *   - Escape o el botón "Cerrar" lo cierran; el foco queda atrapado en el
 *     panel mientras está abierto y vuelve a la lupa al cerrar
 *     (useAtraparFoco). El fondo no se desplaza.
 */
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { PerfumeBuscable } from "@/app/api/buscar/route";
import { CloseIcon, SearchIcon, WhatsAppIcon } from "@/components/ui/icons";
import { useAtraparFoco } from "@/components/ui/useAtraparFoco";
import { coincideBusqueda, MAX_BUSQUEDA, palabrasDeBusqueda } from "@/lib/busqueda";
import { formatPrecio, PLACEHOLDER_IMAGE, SITE_SHORT_NAME, whatsappUrl } from "@/lib/site";

/** Máximo de resultados que se muestran en el panel. */
const MAX_RESULTADOS = 6;

/**
 * Lista descargada, compartida entre aperturas del buscador mientras la
 * página siga abierta (se descarga una sola vez). null = aún no se pidió.
 */
let listaEnMemoria: PerfumeBuscable[] | null = null;

type SearchOverlayProps = {
  abierto: boolean;
  onCerrar: () => void;
};

/** Enlace al catálogo filtrado por el texto buscado. */
function enlaceCatalogo(texto: string): string {
  return `/catalogo?q=${encodeURIComponent(texto.trim())}`;
}

export default function SearchOverlay({ abierto, onCerrar }: SearchOverlayProps) {
  const router = useRouter();
  const reducirMovimiento = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  useAtraparFoco(panel, abierto, onCerrar, campo);

  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState<PerfumeBuscable[] | null>(listaEnMemoria);
  const [error, setError] = useState(false);
  /** Índice del resultado elegido con las flechas; -1 = ninguno. */
  const [activo, setActivo] = useState(-1);

  // Descarga única de la lista, la primera vez que se abre.
  useEffect(() => {
    if (!abierto || listaEnMemoria) return;
    let cancelado = false;
    setError(false);
    fetch("/api/buscar")
      .then((r) => (r.ok ? (r.json() as Promise<PerfumeBuscable[]>) : Promise.reject()))
      .then((datos) => {
        listaEnMemoria = datos;
        if (!cancelado) setLista(datos);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      });
    return () => {
      cancelado = true;
    };
  }, [abierto]);

  const palabras = useMemo(() => palabrasDeBusqueda(texto), [texto]);
  const coincidencias = useMemo(
    () => (lista && palabras.length > 0 ? lista.filter((p) => coincideBusqueda(p, palabras)) : []),
    [lista, palabras],
  );
  const resultados = coincidencias.slice(0, MAX_RESULTADOS);
  const hayTexto = palabras.length > 0;

  // Al cambiar lo escrito, ningún resultado queda elegido.
  useEffect(() => setActivo(-1), [texto]);

  // Al cerrarse, se borra lo escrito: el componente sigue montado (vive en
  // el Header, que no desaparece al navegar), y sin esto la búsqueda
  // anterior seguiría ahí y lo nuevo se pegaría detrás.
  useEffect(() => {
    if (!abierto) setTexto("");
  }, [abierto]);

  function ir(destino: string) {
    onCerrar();
    router.push(destino);
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown" && resultados.length > 0) {
      evento.preventDefault();
      setActivo((i) => (i + 1) % resultados.length);
    } else if (evento.key === "ArrowUp" && resultados.length > 0) {
      evento.preventDefault();
      setActivo((i) => (i <= 0 ? resultados.length - 1 : i - 1));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      if (activo >= 0 && resultados[activo]) ir(`/producto/${resultados[activo].id}`);
      else if (hayTexto) ir(enlaceCatalogo(texto));
    }
  }

  const idOpcion = (id: number) => `buscador-opcion-${id}`;
  const mensajeWhatsApp = `Hola ${SITE_SHORT_NAME}, busco el perfume «${texto.trim()}». ¿Lo tienen disponible?`;

  return (
    <AnimatePresence>
      {abierto && (
        <>
          {/* Velo bajo el Header: tocarlo cierra el buscador. */}
          <motion.div
            key="velo-buscador"
            className="fixed inset-x-0 bottom-0 top-16 z-[45] bg-black/50 backdrop-blur-sm lg:top-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCerrar}
            aria-hidden="true"
          />

          <motion.div
            key="panel-buscador"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Buscar fragancias"
            className="fixed inset-x-0 top-16 z-[46] max-h-[calc(100svh-4rem)] overflow-y-auto border-b border-gold/20 bg-dark-secondary text-ink shadow-[0_20px_40px_rgba(0,0,0,0.3)] dia:shadow-[0_20px_40px_rgba(31,27,22,0.12)] lg:top-20 lg:max-h-[calc(100svh-5rem)]"
            initial={{ opacity: 0, y: reducirMovimiento ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducirMovimiento ? 0 : -12 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mx-auto max-w-3xl px-5 py-5 sm:px-8 sm:py-7">
              {/* Campo de búsqueda */}
              <div className="flex items-center gap-3 border-b border-gold/40 pb-3 dia:border-gold-ink/60">
                <SearchIcon className="h-5 w-5 shrink-0 text-gold-ink" aria-hidden="true" />
                <input
                  ref={campo}
                  type="search"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value.slice(0, MAX_BUSQUEDA))}
                  onKeyDown={alPulsarTecla}
                  placeholder="Busca por nombre o marca"
                  aria-label="Buscar por nombre o marca"
                  role="combobox"
                  aria-expanded={resultados.length > 0}
                  aria-controls="buscador-resultados"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    activo >= 0 && resultados[activo] ? idOpcion(resultados[activo].id) : undefined
                  }
                  autoComplete="off"
                  enterKeyHint="search"
                  // Letra de 24 px o más: los iPhone amplían la página al
                  // tocar un campo con letra menor de 16 px.
                  className="min-w-0 flex-1 bg-transparent font-serif text-2xl text-ink placeholder:text-ink-muted/70 focus:outline-none sm:text-3xl [&::-webkit-search-cancel-button]:hidden"
                />
                <button
                  type="button"
                  onClick={onCerrar}
                  aria-label="Cerrar buscador"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors duration-200 hover:text-gold-ink"
                >
                  <CloseIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Estado / resultados */}
              <div className="mt-4" aria-live="polite">
                {!hayTexto && (
                  <p className="text-sm font-light text-ink-muted">
                    Escribe el nombre o la marca. Por ejemplo: Sauvage, Lattafa, Carolina Herrera.
                  </p>
                )}
                {hayTexto && !lista && !error && (
                  <p className="text-sm font-light text-ink-muted">Cargando fragancias…</p>
                )}
                {hayTexto && error && (
                  <p className="text-sm font-light text-ink-muted">
                    No se pudo cargar la lista. Pulsa Enter para buscar en el catálogo.
                  </p>
                )}
                {hayTexto && lista && coincidencias.length > 0 && (
                  <p className="sr-only">
                    {coincidencias.length === 1
                      ? "1 resultado."
                      : `${coincidencias.length} resultados.`}
                  </p>
                )}
              </div>

              {resultados.length > 0 && (
                <>
                  <ul id="buscador-resultados" role="listbox" aria-label="Resultados" className="mt-1 divide-y divide-gold/10">
                    {resultados.map((perfume, indice) => (
                      <li
                        key={perfume.id}
                        id={idOpcion(perfume.id)}
                        role="option"
                        aria-selected={indice === activo}
                        onMouseEnter={() => setActivo(indice)}
                      >
                        <Link
                          href={`/producto/${perfume.id}`}
                          onClick={onCerrar}
                          // tabIndex -1: con teclado se recorre con flechas
                          // desde el campo (patrón combobox), no con Tab.
                          tabIndex={-1}
                          className={`flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors duration-150 ${
                            indice === activo ? "bg-gold/10" : ""
                          }`}
                        >
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-white">
                            <Image
                              src={perfume.imagen || PLACEHOLDER_IMAGE}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-contain p-1"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-gold-light">
                              {perfume.marca}
                            </span>
                            <span className="block truncate font-serif text-lg leading-tight text-ink">
                              {perfume.nombre}
                            </span>
                          </span>
                          <span className="shrink-0 text-right text-sm">
                            {perfume.agotado ? (
                              <span className="text-xs font-medium uppercase tracking-[0.12em] text-gold-ink">Agotado</span>
                            ) : perfume.precio !== null ? (
                              <span className="font-medium text-ink">{formatPrecio(perfume.precio)}</span>
                            ) : (
                              <span className="font-light italic text-gold-light">Consultar precio</span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={enlaceCatalogo(texto)}
                    onClick={onCerrar}
                    className="mt-4 inline-block text-sm font-medium text-gold-ink underline underline-offset-4 hover:text-gold-light"
                  >
                    Ver todos los resultados ({coincidencias.length})
                  </Link>
                </>
              )}

              {hayTexto && lista && coincidencias.length === 0 && (
                <div className="rounded-lg border-l-[3px] border-gold bg-gold/10 px-4 py-4">
                  <p className="font-serif text-xl text-ink">
                    ¿No encuentras tu fragancia? Pregúntanos por WhatsApp
                  </p>
                  <p className="mt-1 text-sm font-light text-ink-muted">
                    No encontramos «{texto.trim()}» en el catálogo, pero podemos conseguirla.
                  </p>
                  <a
                    href={whatsappUrl(mensajeWhatsApp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2.5 rounded-lg bg-gold px-5 py-3 text-xs font-medium uppercase tracking-[0.16em] text-on-gold transition-colors duration-300 hover:bg-gold-bright"
                  >
                    <WhatsAppIcon className="h-5 w-5" aria-hidden="true" />
                    Preguntar por WhatsApp
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
