"use client";

/**
 * src/components/ui/ShareButton.tsx — Botón flotante "Compartir" con código QR.
 *
 * QUÉ ES
 *   Un botón pequeño y discreto, fijo sobre el botón de WhatsApp, que abre
 *   la ventana "Comparte Isabeleé" con:
 *     - un código QR (Quick Response, el cuadro de puntos que se lee con la
 *       cámara del celular) de la página que se está viendo;
 *     - "Copiar enlace", "Enviar por WhatsApp", "Descargar QR" y, si el
 *       dispositivo lo permite, "Compartir…" (el menú nativo del sistema).
 *
 * POR QUÉ EXISTE
 *   Para que la dueña y los clientes pasen el catálogo o un perfume
 *   concreto: enseñando el QR en la tienda física, mandándolo por WhatsApp
 *   o descargándolo para imprimirlo.
 *
 * CÓMO SE CONECTA CON EL RESTO
 *   - Lo monta src/app/(tienda)/layout.tsx junto a WhatsAppButton: solo
 *     existe en la tienda, nunca en el panel.
 *   - El QR se genera en el navegador con la librería `qrcode` (la única
 *     dependencia añadida en la Fase 4), cargada solo al abrir la ventana
 *     (import dinámico) para no pesar en la carga de la página.
 *   - Codifica window.location.href en el momento de abrir: sirve igual en
 *     localhost, en la IP local, en Vercel o en el dominio definitivo, sin
 *     configurar nada.
 *   - Íconos SVG de src/components/ui/icons.tsx; colores de tema (funciona
 *     en noche y en día). El QR va SIEMPRE sobre una tarjeta blanca con
 *     módulos oscuros y margen ("zona de silencio"): un QR invertido o sin
 *     margen lo leen mal muchas cámaras.
 *
 * POSICIÓN
 *   WhatsAppButton mide 52 px (56 desde 640 px) y está a 16 px (24) del
 *   borde. Este botón mide 44 px, se centra en la misma vertical y se apila
 *   12 px por encima. Suma además env(safe-area-inset-bottom/right): el
 *   margen que reservan los iPhone con barra inferior. z-40, como WhatsApp:
 *   por debajo del Header, del menú móvil y del modal de bienvenida.
 *
 * ACCESIBILIDAD
 *   - La ventana es un <dialog> nativo abierto con showModal(): el
 *     navegador bloquea el resto de la página, mantiene el foco dentro de
 *     la ventana y la cierra con Escape.
 *   - Al cerrarse, el foco vuelve al botón que la abrió.
 *   - Los avisos ("Enlace copiado") se anuncian con aria-live.
 *
 * LIMITACIONES DEL NAVEGADOR
 *   navigator.clipboard (copiar) y navigator.share (compartir) solo
 *   funcionan en conexiones seguras: HTTPS (Hypertext Transfer Protocol
 *   Secure) o localhost. Abriendo el sitio por la IP local
 *   (http://192.168.x.x:3000) no existen: "Copiar" usa entonces un método
 *   antiguo de respaldo y, si también falla, se muestra el enlace para
 *   copiarlo a mano; "Compartir…" simplemente no aparece.
 */
import { useEffect, useRef, useState } from "react";
import {
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  ShareIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { SITE_NAME } from "@/lib/site";

/** Nombre del archivo al descargar el QR. */
const NOMBRE_QR = "isabelee-qr.png";
/** Segundos que se muestra "Enlace copiado". */
const DURACION_AVISO_MS = 2500;

/** Clase común de los botones de acción de la ventana. */
const botonAccion =
  "flex min-h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-gold/40 px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-200 hover:border-gold hover:text-gold-ink";

/**
 * Copia un texto. Primero con la API moderna (solo HTTPS o localhost); si
 * no existe o falla, con el método antiguo: un <textarea> temporal y
 * document.execCommand("copy"). Devuelve si lo consiguió.
 */
async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Sigue con el método antiguo.
  }
  try {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    // execCommand está desaconsejado, pero es el único respaldo que existe
    // fuera de HTTPS. Si el navegador ya no lo admite, devuelve false.
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export default function ShareButton() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  const [url, setUrl] = useState("");
  /** Imagen del QR como data URL (texto "data:image/png;base64,…"). */
  const [qr, setQr] = useState<string | null>(null);
  const [errorQr, setErrorQr] = useState(false);
  const [aviso, setAviso] = useState("");
  /** ¿Existe el menú nativo de compartir? Se averigua tras montar. */
  const [puedeCompartir, setPuedeCompartir] = useState(false);

  useEffect(() => {
    // En el servidor no existe navigator: se comprueba aquí y no al
    // dibujar, para que el HTML del servidor y el del navegador coincidan.
    setPuedeCompartir(typeof navigator.share === "function");
  }, []);

  // El aviso "Enlace copiado" desaparece solo.
  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(""), DURACION_AVISO_MS);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  async function abrir() {
    const actual = window.location.href;
    setUrl(actual);
    setAviso("");
    setErrorQr(false);
    dialogo.current?.showModal();

    try {
      // Import dinámico: la librería solo se descarga al abrir la ventana.
      const QRCode = (await import("qrcode")).default;
      const imagen = await QRCode.toDataURL(actual, {
        // Corrección de errores "M": el código sigue leyéndose aunque un
        // 15 % esté dañado o tapado; buen equilibrio entre robustez y
        // tamaño de los puntos.
        errorCorrectionLevel: "M",
        // Zona de silencio: 4 módulos de margen blanco, lo que pide la
        // norma para que las cámaras lo encuentren.
        margin: 4,
        width: 480, // px de la imagen; se muestra más pequeña, se imprime nítida
        color: { dark: "#1a1a1a", light: "#ffffff" },
      });
      setQr(imagen);
    } catch {
      setErrorQr(true);
    }
  }

  function cerrar() {
    dialogo.current?.close();
  }

  async function copiar() {
    const ok = await copiarTexto(url);
    setAviso(
      ok
        ? "Enlace copiado"
        : "No se pudo copiar automáticamente. Mantén pulsado el enlace de arriba para copiarlo.",
    );
  }

  async function compartir() {
    try {
      await navigator.share({ title: SITE_NAME, url });
    } catch {
      // La persona canceló el menú, o el navegador lo rechazó: no es un
      // error que haya que mostrar.
    }
  }

  const textoWhatsApp = `Mira ${SITE_NAME}: ${url}`;

  return (
    <>
      <button
        ref={boton}
        type="button"
        onClick={() => void abrir()}
        aria-label="Compartir esta página"
        aria-haspopup="dialog"
        // bottom/right: ver POSICIÓN en la cabecera del archivo.
        className="fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-[calc(20px+env(safe-area-inset-right))] z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 bg-dark-deep/85 text-gold-ink shadow-[0_4px_14px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-colors duration-200 hover:border-gold hover:bg-dark-secondary sm:bottom-[calc(92px+env(safe-area-inset-bottom))] sm:right-[calc(30px+env(safe-area-inset-right))]"
      >
        <ShareIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby="compartir-titulo"
        // Al cerrarse (botón, Escape o clic fuera) el foco vuelve al botón.
        onClose={() => boton.current?.focus()}
        // Clic en el fondo oscurecido (fuera de la tarjeta): cerrar. En un
        // <dialog>, el fondo cuenta como el propio elemento.
        onClick={(evento) => {
          if (evento.target === evento.currentTarget) cerrar();
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-gold/25 bg-dark-secondary p-0 text-ink shadow-[0_24px_70px_rgba(0,0,0,0.5)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="relative px-6 pb-6 pt-7 text-center">
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors duration-200 hover:text-gold-ink"
          >
            <CloseIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          <h2
            id="compartir-titulo"
            className="font-serif text-3xl font-medium text-ink"
          >
            Comparte Isabeleé
          </h2>
          <p className="mt-1 text-sm font-light text-ink-muted">
            Escanea el código o envía el enlace de esta página.
          </p>

          {/* Tarjeta BLANCA en los dos temas: el QR necesita fondo claro. */}
          <div className="mx-auto mt-5 flex aspect-square w-full max-w-[220px] items-center justify-center rounded-xl bg-white p-1">
            {qr ? (
              // <img> y no next/image: es una imagen generada en el momento
              // (data URL), no un archivo que Next.js pueda optimizar.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="Código QR con el enlace de esta página"
                width={212}
                height={212}
                className="h-full w-full"
              />
            ) : (
              <p className="px-4 text-sm text-on-gold">
                {errorQr ? "No se pudo generar el código." : "Generando código…"}
              </p>
            )}
          </div>

          {/* El enlace, visible y seleccionable de un toque, por si copiar
              falla (por ejemplo, fuera de HTTPS). */}
          <p className="mt-4 select-all break-all rounded-lg bg-dark-deep/60 px-3 py-2 text-xs font-light text-ink-muted">
            {url}
          </p>

          <div className="mt-5 space-y-2.5">
            <button type="button" onClick={() => void copiar()} className={botonAccion}>
              <CopyIcon className="h-5 w-5" aria-hidden="true" />
              Copiar enlace
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={botonAccion}
            >
              <WhatsAppIcon className="h-5 w-5 text-whatsapp" aria-hidden="true" />
              Enviar por WhatsApp
            </a>
            <a
              href={qr ?? undefined}
              download={NOMBRE_QR}
              aria-disabled={!qr}
              className={`${botonAccion} ${qr ? "" : "pointer-events-none opacity-50"}`}
            >
              <DownloadIcon className="h-5 w-5" aria-hidden="true" />
              Descargar QR
            </a>
            {puedeCompartir && (
              <button type="button" onClick={() => void compartir()} className={botonAccion}>
                <ShareIcon className="h-5 w-5" aria-hidden="true" />
                Compartir…
              </button>
            )}
          </div>

          <p aria-live="polite" className="mt-3 min-h-5 text-sm font-medium text-gold-ink">
            {aviso}
          </p>
        </div>
      </dialog>
    </>
  );
}
